begin;
-- Only a confirmed administrator can permanently remove selected contact records.
-- No direct DELETE privileges are granted to browser roles.
create or replace function public.delete_doxa_registrations(selected_emails text[])
returns integer language plpgsql security definer set search_path='' as $$
declare launch_deleted integer; legacy_deleted integer;
begin
 if not coalesce(public.is_doxa_admin(),false) then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 if selected_emails is null or cardinality(selected_emails) not between 1 and 25
 or exists(select 1 from unnest(selected_emails) e where e is null or length(e) not between 3 and 254) then
  raise exception 'Select between 1 and 25 valid email addresses';
 end if;
 delete from public.doxa_launch_list where email = any(selected_emails);
 get diagnostics launch_deleted = row_count;
 delete from public.doxa_waitlist where email = any(selected_emails);
 get diagnostics legacy_deleted = row_count;
 return launch_deleted + legacy_deleted;
end; $$;
revoke all on function public.delete_doxa_registrations(text[]) from public, anon;
grant execute on function public.delete_doxa_registrations(text[]) to authenticated;
commit;
