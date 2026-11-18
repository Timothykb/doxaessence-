begin;
create table public.doxa_mail_drafts (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 160),
 subject text not null check(length(trim(subject)) between 1 and 180), kind text not null default 'personal' check(kind in ('personal','newsletter')),
 language text not null default 'en' check(language in ('en','nl')), customer_id uuid references public.doxa_customers(id),
 blocks jsonb not null check(jsonb_typeof(blocks)='array' and jsonb_array_length(blocks) between 1 and 20),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.doxa_shipments (
 order_id uuid primary key references public.doxa_orders(id), carrier text not null default 'PostNL' check(carrier='PostNL'),
 barcode text not null check(length(trim(barcode)) between 8 and 40), tracking_url text not null check(tracking_url ~ '^https://(jouw\.postnl\.nl|www\.postnl\.nl|postnl\.nl)/'),
 created_at timestamptz not null default now()
);
create table public.doxa_mail_jobs (
 id uuid primary key, draft_id uuid references public.doxa_mail_drafts(id), order_id uuid references public.doxa_orders(id),
 recipient text not null, subject text not null, language text not null default 'en', blocks jsonb not null,
 state text not null default 'pending' check(state in ('pending','accepted','uncertain')),
 provider_id text, first_attempt_at timestamptz, created_at timestamptz not null default now(),
 check((draft_id is not null) <> (order_id is not null))
);
create unique index doxa_one_shipping_mail on public.doxa_mail_jobs(order_id) where order_id is not null;
alter table public.doxa_mail_drafts enable row level security;
alter table public.doxa_shipments enable row level security;
alter table public.doxa_mail_jobs enable row level security;
revoke all on public.doxa_mail_drafts,public.doxa_shipments,public.doxa_mail_jobs from anon,authenticated;
grant select,insert,update on public.doxa_mail_drafts to authenticated;
grant select on public.doxa_shipments,public.doxa_mail_jobs to authenticated;
create policy admin_drafts on public.doxa_mail_drafts for all to authenticated using ((select public.is_doxa_admin())) with check ((select public.is_doxa_admin()));
create policy admin_shipments on public.doxa_shipments for select to authenticated using ((select public.is_doxa_admin()));
create policy admin_mail_jobs on public.doxa_mail_jobs for select to authenticated using ((select public.is_doxa_admin()));
create function public.prepare_doxa_mail(draft uuid, request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare d public.doxa_mail_drafts; target text;
begin
 if not public.is_doxa_admin() then raise exception 'Unauthorized'; end if;
 if exists(select 1 from public.doxa_mail_jobs where id=request_id and draft_id=draft) then return request_id; end if;
 select * into d from public.doxa_mail_drafts where id=draft;
 if not found or d.kind<>'personal' then raise exception 'Only individual service emails are enabled'; end if;
 select email into target from public.doxa_customers where id=d.customer_id;
 if target is null then raise exception 'Choose a customer'; end if;
 insert into public.doxa_mail_jobs(id,draft_id,recipient,subject,language,blocks) values(request_id,d.id,target,d.subject,d.language,d.blocks);
 return request_id;
end $$;
create function public.save_doxa_shipment(selected_order uuid, tracking_barcode text, tracking_link text) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.doxa_orders; s public.doxa_shipments; job uuid; target text;
begin
 if not public.is_doxa_admin() then raise exception 'Unauthorized'; end if;
 select * into o from public.doxa_orders where id=selected_order for update;
 if not found or o.status='cancelled' then raise exception 'Order unavailable'; end if;
 select * into s from public.doxa_shipments where order_id=o.id;
 if found then
  if s.barcode<>trim(tracking_barcode) or s.tracking_url<>trim(tracking_link) then raise exception 'Shipment already linked; verify before changing'; end if;
  select id into job from public.doxa_mail_jobs where order_id=o.id; return job;
 end if;
 insert into public.doxa_shipments(order_id,barcode,tracking_url) values(o.id,trim(tracking_barcode),trim(tracking_link));
 select email into target from public.doxa_customers where id=o.customer_id;
 job:=gen_random_uuid();
 insert into public.doxa_mail_jobs(id,order_id,recipient,subject,blocks) values(job,o.id,target,'Your DOXA ESSENCE shipment',jsonb_build_array(jsonb_build_object('type','heading','text','Your order is getting ready.'),jsonb_build_object('type','text','text','Your PostNL shipping label has been created for order '||left(o.id::text,8)||'. Tracking updates appear once PostNL scans your parcel. Barcode: '||trim(tracking_barcode)),jsonb_build_object('type','button','text','Track your order','url',trim(tracking_link))));
 -- A label is not proof of handover to the carrier. Keep fulfilment in processing.
 if o.status='new' then update public.doxa_orders set status='processing' where id=o.id; end if;
 return job;
end $$;
create function public.start_doxa_mail(job_id uuid) returns public.doxa_mail_jobs language plpgsql security definer set search_path='' as $$
declare j public.doxa_mail_jobs;
begin
 if not public.is_doxa_admin() then raise exception 'Unauthorized'; end if;
 select * into j from public.doxa_mail_jobs where id=job_id for update;
 if not found then raise exception 'Mail missing'; end if;
 if j.state='accepted' then return j; end if;
 if j.order_id is not null and exists(select 1 from public.doxa_orders where id=j.order_id and status='cancelled') then raise exception 'Order cancelled'; end if;
 if j.first_attempt_at is not null and j.first_attempt_at<now()-interval '23 hours' then raise exception 'Verify provider history before retrying'; end if;
 update public.doxa_mail_jobs set first_attempt_at=coalesce(first_attempt_at,now()),state='uncertain' where id=job_id returning * into j;
 return j;
end $$;
create function public.finish_doxa_mail(job_id uuid, delivery_id text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_doxa_admin() then raise exception 'Unauthorized'; end if;
 if delivery_id is null or length(delivery_id)>160 then raise exception 'Invalid delivery ID'; end if;
 update public.doxa_mail_jobs set state='accepted',provider_id=delivery_id where id=job_id;
end $$;
revoke all on function public.prepare_doxa_mail(uuid,uuid),public.save_doxa_shipment(uuid,text,text),public.start_doxa_mail(uuid),public.finish_doxa_mail(uuid,text) from public,anon;
grant execute on function public.prepare_doxa_mail(uuid,uuid),public.save_doxa_shipment(uuid,text,text),public.start_doxa_mail(uuid),public.finish_doxa_mail(uuid,text) to authenticated;
commit;
