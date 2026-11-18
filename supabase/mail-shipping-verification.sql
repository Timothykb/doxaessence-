begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where lower(email)='timothykboona@gmail.com'),true);
set local role authenticated;
do $$ declare p uuid; c uuid; o uuid; d uuid; j uuid; j2 uuid; req uuid:=gen_random_uuid(); begin
 insert into public.doxa_products(name,sku,price_cents,stock,status) values('Mail test','mail-'||txid_current(),100,5,'active') returning id into p;
 insert into public.doxa_customers(name,email) values('Mail test','mail-'||txid_current()||'@example.invalid') returning id into c;
 insert into public.doxa_mail_drafts(title,subject,customer_id,blocks) values('Test','Original',c,'[{"type":"text","text":"Original body"}]') returning id into d;
 j:=public.prepare_doxa_mail(d,req);
 update public.doxa_mail_drafts set subject='Changed' where id=d;
 if public.prepare_doxa_mail(d,req)<>j or not exists(select 1 from public.doxa_mail_jobs where id=j and subject='Original') then raise exception 'Immutable/idempotent mail failed'; end if;
 update public.doxa_mail_drafts set kind='newsletter' where id=d;
 begin perform public.prepare_doxa_mail(d,gen_random_uuid()); raise exception 'Campaign unexpectedly enabled'; exception when raise_exception then if SQLERRM<>'Only individual service emails are enabled' then raise; end if; end;
 o:=public.create_doxa_order(c,p,1);
 j2:=public.save_doxa_shipment(o,'3SLOCALTEST123','https://jouw.postnl.nl/track-and-trace/3SLOCALTEST123');
 if public.save_doxa_shipment(o,'3SLOCALTEST123','https://jouw.postnl.nl/track-and-trace/3SLOCALTEST123')<>j2 then raise exception 'Duplicate shipping mail'; end if;
 if not exists(select 1 from public.doxa_orders where id=o and status='processing') then raise exception 'Label incorrectly marked shipped'; end if;
 if not exists(select 1 from public.doxa_mail_jobs where id=j2 and state='pending') then raise exception 'Shipping queue missing'; end if;
 begin perform public.save_doxa_shipment(o,'CHANGED123','https://jouw.postnl.nl/track-and-trace/CHANGED123'); raise exception 'Shipment overwrite allowed'; exception when raise_exception then if SQLERRM<>'Shipment already linked; verify before changing' then raise; end if; end;
 perform public.set_doxa_order_status(o,'cancelled');
 begin perform public.start_doxa_mail(j2); raise exception 'Cancelled shipping mail allowed'; exception when raise_exception then if SQLERRM<>'Order cancelled' then raise; end if; end;
end $$;
reset role; select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true); set local role authenticated;
do $$ begin
 if exists(select 1 from public.doxa_mail_drafts) or exists(select 1 from public.doxa_shipments) or exists(select 1 from public.doxa_mail_jobs) then raise exception 'Non-admin read'; end if;
 begin perform public.prepare_doxa_mail(gen_random_uuid(),gen_random_uuid()); raise exception 'Non-admin prepare'; exception when raise_exception then if SQLERRM<>'Unauthorized' then raise; end if; end;
end $$;
reset role; set local role anon;
do $$ begin
 begin perform count(*) from public.doxa_mail_jobs; raise exception 'Anonymous read'; exception when insufficient_privilege then null; end;
 begin perform public.save_doxa_shipment(gen_random_uuid(),'BAD123456','https://jouw.postnl.nl/test'); raise exception 'Anonymous write'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: draft storage, immutable mail snapshots, duplicate prevention, campaign block, PostNL storage, label vs shipment state, RLS. All test records rolled back; no email sent.' as result;
