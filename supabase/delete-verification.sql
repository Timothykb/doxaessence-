-- Non-persistent test: only contacts created in this transaction are deleted.
begin;
insert into public.doxa_launch_list(email,first_name,email_consent) values
 ('delete-test-'||txid_current()||'@example.invalid','Delete test',true),
 ('keep-test-'||txid_current()||'@example.invalid','Keep test',true);
insert into public.doxa_waitlist(email,newsletter) values ('delete-test-'||txid_current()||'@example.invalid',true);
set local role authenticated;
do $$ begin
 begin
  perform public.delete_doxa_registrations(array['delete-test-'||txid_current()||'@example.invalid']);
  raise exception 'Non-admin unexpectedly deleted data';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where lower(email)='timothykboona@gmail.com'),true);
set local role authenticated;
do $$ begin
 if public.delete_doxa_registrations(array['delete-test-'||txid_current()||'@example.invalid']) <> 2 then raise exception 'Expected deletion from both lists'; end if;
 if public.delete_doxa_registrations(array['delete-test-'||txid_current()||'@example.invalid']) <> 0 then raise exception 'Retry should return zero'; end if;
end $$;
select
 (select count(*) from public.doxa_launch_list where email='delete-test-'||txid_current()||'@example.invalid')=0 as selected_removed,
 (select count(id) from public.doxa_waitlist where email='delete-test-'||txid_current()||'@example.invalid')=0 as legacy_removed,
 (select count(*) from public.doxa_launch_list where email='keep-test-'||txid_current()||'@example.invalid')=1 as unselected_preserved;
rollback;
