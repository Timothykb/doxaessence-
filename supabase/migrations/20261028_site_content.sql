begin;
create table public.doxa_site (
 id integer primary key default 1 check(id=1),
 draft jsonb not null default '{}'::jsonb check(jsonb_typeof(draft)='object' and octet_length(draft::text)<60000),
 published jsonb not null default '{}'::jsonb,
 live boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.doxa_site enable row level security;
revoke all on public.doxa_site from anon,authenticated;
grant select on public.doxa_site to authenticated;
grant update(draft,updated_at) on public.doxa_site to authenticated;
create policy site_admin on public.doxa_site for all to authenticated using ((select public.is_doxa_admin())) with check ((select public.is_doxa_admin()));
insert into public.doxa_site(id) values(1);
create function public.get_doxa_live_site() returns jsonb language sql security definer set search_path='' as $$
 select case when live then published else null end from public.doxa_site where id=1;
$$;
create function public.publish_doxa_site(make_live boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_doxa_admin() then raise exception 'Unauthorized'; end if;
 if make_live is null then raise exception 'Missing launch state'; end if;
 update public.doxa_site set published=case when make_live then draft else published end,live=make_live,updated_at=now() where id=1;
end $$;
revoke all on function public.get_doxa_live_site(),public.publish_doxa_site(boolean) from public;
grant execute on function public.get_doxa_live_site() to anon,authenticated;
grant execute on function public.publish_doxa_site(boolean) to authenticated;
-- A draft product only. Price, size and stock must be confirmed by Timothy.
insert into public.doxa_products(name,sku,price_cents,stock,status)
values('C1 — The Genesis','DOXA-C1-GENESIS',0,0,'draft') on conflict(sku) do nothing;
commit;
