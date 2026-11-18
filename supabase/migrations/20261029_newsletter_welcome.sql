begin;
create table public.doxa_welcome_settings (
 id integer primary key default 1 check(id=1),
 subject text not null check(length(trim(subject)) between 1 and 180 and subject !~ E'[\r\n]'),
 body text not null check(length(trim(body)) between 1 and 6000)
);
insert into public.doxa_welcome_settings(id,subject,body) values(1,'A personal welcome from Timothy — DOXA ESSENCE',E'Hi {{first_name}},\n\nThank you for joining the DOXA ESSENCE newsletter. It means a lot to me that you want to be part of this first chapter.\n\nI’m Timothy, the founder of DOXA ESSENCE. I’m looking forward to sharing the story behind the brand and our first fragrance, The Genesis, with you. You’ll hear from me as we get closer to the launch.\n\nIf you have a question, or just want to say hello, you can reply directly to this email. I’d love to hear from you.\n\nThank you for being here.\n\nTimothy\nFounder, DOXA ESSENCE');
alter table public.doxa_welcome_settings enable row level security;
revoke all on public.doxa_welcome_settings from anon,authenticated;
grant select,update on public.doxa_welcome_settings to authenticated;
grant all on public.doxa_welcome_settings to service_role;
create policy welcome_settings_admin on public.doxa_welcome_settings for all to authenticated using ((select public.is_doxa_admin())) with check ((select public.is_doxa_admin()));
create table public.doxa_welcome_notifications (
 id uuid primary key default gen_random_uuid(),
 registration_id uuid not null unique references public.doxa_launch_list(id) on delete cascade,
 subject text not null, body text not null,
 created_at timestamptz not null default now(), first_attempt_at timestamptz, last_attempt_at timestamptz,
 provider_id text, accepted_at timestamptz
);
alter table public.doxa_welcome_notifications enable row level security;
revoke all on public.doxa_welcome_notifications from anon,authenticated;
grant select on public.doxa_welcome_notifications to authenticated;
grant all on public.doxa_welcome_notifications to service_role;
create policy welcome_notifications_admin on public.doxa_welcome_notifications for select to authenticated using ((select public.is_doxa_admin()));
create function public.queue_doxa_welcome() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.doxa_welcome_notifications(registration_id,subject,body)
 select new.id,s.subject,replace(s.body,'{{first_name}}',new.first_name) from public.doxa_welcome_settings s where s.id=1;
 return new;
end $$;
revoke all on function public.queue_doxa_welcome() from public,anon,authenticated;
create trigger doxa_launch_welcome after insert on public.doxa_launch_list for each row execute function public.queue_doxa_welcome();
create function public.claim_doxa_welcome(notification_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.doxa_welcome_notifications; recipient text;
begin
 update public.doxa_welcome_notifications set first_attempt_at=coalesce(first_attempt_at,now()),last_attempt_at=now()
 where id=notification_id and accepted_at is null and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours') and (last_attempt_at is null or last_attempt_at<now()-interval '2 minutes') returning * into job;
 if not found then return null; end if;
 select email into recipient from public.doxa_launch_list where id=job.registration_id and email_consent;
 if recipient is null then return null; end if;
 return to_jsonb(job)||jsonb_build_object('recipient',recipient);
end $$;
revoke all on function public.claim_doxa_welcome(uuid) from public,anon,authenticated;
grant execute on function public.claim_doxa_welcome(uuid) to service_role;
-- No backfill: existing subscribers are not mailed retroactively.
commit;
