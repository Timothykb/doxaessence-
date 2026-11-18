begin;
-- Authorization uses the verified account record, never user-editable metadata.
create or replace function public.is_doxa_admin()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.users where id = (select auth.uid())
 and lower(email) = 'timothykboona@gmail.com' and email_confirmed_at is not null);
$$;
revoke all on function public.is_doxa_admin() from public;
grant execute on function public.is_doxa_admin() to authenticated;
grant select on public.doxa_launch_list to authenticated;
drop policy if exists doxa_admin_read on public.doxa_launch_list;
create policy doxa_admin_read on public.doxa_launch_list for select to authenticated using ((select public.is_doxa_admin()));
-- Earlier sample/newsletter registrations remain separate, with their original consent.
grant select (id,email,samples,newsletter,consent_version,created_at,updated_at) on public.doxa_waitlist to authenticated;
drop policy if exists doxa_admin_read on public.doxa_waitlist;
create policy doxa_admin_read on public.doxa_waitlist for select to authenticated using ((select public.is_doxa_admin()));
commit;
