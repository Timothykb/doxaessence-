-- Transaction-only verification; no test contacts are kept.
begin;
set local role anon;
select public.join_doxa_launch_list('doxa-verification@example.invalid','Verification',true);
select public.join_doxa_launch_list('doxa-verification@example.invalid','Verification',true);
reset role;
do $$ begin
 if (select count(*) from public.doxa_launch_list where email='doxa-verification@example.invalid') <> 1 then raise exception 'Signup/deduplication failed'; end if;
 if has_table_privilege('anon','public.doxa_launch_list','SELECT') then raise exception 'Anonymous read unexpectedly allowed'; end if;
end $$;
set local role authenticated;
do $$ begin
 if public.is_doxa_admin() then raise exception 'Unapproved user is admin'; end if;
 if (select count(*) from public.doxa_launch_list) <> 0 then raise exception 'Private rows exposed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where lower(email)='timothykboona@gmail.com'),true);
set local role authenticated;
select public.is_doxa_admin() as verified_admin_access,
 (select count(*) from public.doxa_launch_list where email='doxa-verification@example.invalid')=1 as admin_can_read,
 (select count(id) from public.doxa_waitlist) as earlier_registrations;
rollback;
