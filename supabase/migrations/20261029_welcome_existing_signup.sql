begin;
-- Repeated signup also queues a first welcome for a registration predating automation.
-- The unique registration_id preserves one welcome per registration, including concurrent retries.
create or replace function public.join_doxa_launch_list(email_address text,first_name text,email_consent boolean)
returns void language plpgsql security definer set search_path='' as $$
declare registration public.doxa_launch_list;
begin
 if email_address is null or length(trim(email_address))>254 or trim(email_address) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
 if first_name is null or length(trim(first_name)) not between 1 and 100 then raise exception 'Invalid first name'; end if;
 if email_consent is distinct from true then raise exception 'Consent required'; end if;
 insert into public.doxa_launch_list(email,first_name,email_consent)
 values(lower(trim(email_address)),trim(first_name),true) on conflict(email) do nothing;
 select * into registration from public.doxa_launch_list where email=lower(trim(email_address));
 insert into public.doxa_welcome_notifications(registration_id,subject,body)
 select registration.id,s.subject,replace(s.body,'{{first_name}}',registration.first_name)
 from public.doxa_welcome_settings s where s.id=1
 on conflict(registration_id) do nothing;
end $$;
revoke all on function public.join_doxa_launch_list(text,text,boolean) from public;
grant execute on function public.join_doxa_launch_list(text,text,boolean) to anon,authenticated;
commit;
