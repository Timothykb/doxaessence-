begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where lower(email)='timothykboona@gmail.com' and email_confirmed_at is not null),true);
set local role authenticated;
do $$
declare p uuid; c uuid; o uuid; n integer; o2 uuid;
begin
 if not public.is_doxa_admin() then raise exception 'Admin session missing'; end if;
 insert into public.doxa_products(name,sku,price_cents,stock,status) values('Transaction test','test-'||txid_current(),7500,10,'active') returning id into p;
 insert into public.doxa_customers(name,email) values('Transaction test','commerce-'||txid_current()||'@example.invalid') returning id into c;
 o:=public.create_doxa_order(c,p,2);
 select stock into n from public.doxa_products where id=p;
 if n<>8 then raise exception 'Stock reservation failed'; end if;
 update public.doxa_products set name='Changed',price_cents=9000 where id=p;
 if not exists(select 1 from public.doxa_orders where id=o and product_name='Transaction test' and unit_price_cents=7500) then raise exception 'Snapshot failed'; end if;
 begin
  perform public.create_doxa_order(c,p,99);
  raise exception 'Oversell allowed';
 exception when raise_exception then if SQLERRM <> 'Product unavailable or insufficient stock' then raise; end if;
 end;
 begin
  perform public.set_doxa_order_status(o,'shipped');
  raise exception 'Invalid transition allowed';
 exception when raise_exception then if SQLERRM <> 'Invalid transition' then raise; end if;
 end;
 perform public.set_doxa_order_status(o,'processing');
 perform public.set_doxa_order_status(o,'cancelled');
 perform public.set_doxa_order_status(o,'cancelled');
 select stock into n from public.doxa_products where id=p;
 if n<>10 then raise exception 'Cancellation stock failed'; end if;
 o2:=public.create_doxa_order(c,p,1);
 perform public.set_doxa_order_status(o2,'processing');
 perform public.set_doxa_order_status(o2,'shipped');
 begin
  perform public.set_doxa_order_status(o2,'cancelled');
  raise exception 'Shipped cancellation allowed';
 exception when raise_exception then if SQLERRM <> 'Invalid transition' then raise; end if;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.doxa_products) or exists(select 1 from public.doxa_customers) or exists(select 1 from public.doxa_orders) then raise exception 'Non-admin read allowed'; end if;
 begin
  insert into public.doxa_customers(name,email) values('Forbidden','forbidden@example.invalid');
  raise exception 'Non-admin write allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.create_doxa_order(gen_random_uuid(),gen_random_uuid(),1);
  raise exception 'Non-admin RPC allowed';
 exception when raise_exception then if SQLERRM <> 'Unauthorized' then raise; end if;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform count(*) from public.doxa_customers;
  raise exception 'Anonymous read allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.create_doxa_order(gen_random_uuid(),gen_random_uuid(),1);
  raise exception 'Anonymous RPC allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
select 'PASS: admin CRUD, stock, snapshots, transitions, non-admin isolation, anonymous denial; all test data rolled back' as result;
