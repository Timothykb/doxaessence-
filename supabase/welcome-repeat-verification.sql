-- Run against a known existing subscriber that predates welcome automation.
-- Transaction rolls back: no mail to this address is committed or dispatched.
begin;
do $$ declare registration uuid; before_count integer; after_count integer;
begin
 select id into registration from public.doxa_launch_list where email='timothykboona@gmail.com';
 if registration is null then raise exception 'Legacy fixture is missing'; end if;
 select count(*) into before_count from public.doxa_welcome_notifications where registration_id=registration;
 perform public.join_doxa_launch_list('timothykboona@gmail.com','Timothy',true);
 perform public.join_doxa_launch_list('TIMOTHYKBOONA@GMAIL.COM','Timothy',true);
 select count(*) into after_count from public.doxa_welcome_notifications where registration_id=registration;
 if after_count<>1 then raise exception 'Expected exactly one first welcome after repeat signup'; end if;
 if (select count(*) from public.doxa_launch_list where email='timothykboona@gmail.com')<>1 then raise exception 'Duplicate registration'; end if;
end $$;
rollback;
