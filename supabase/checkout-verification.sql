begin;
update public.doxa_site set live=true where id=1;
update public.doxa_checkout_settings set enabled=true,shipping_cents=500,merchant_email='merchant@example.invalid' where id=1;
update public.doxa_products set status='active',stock=10,price_cents=10000 where id=(select product_id from public.doxa_checkout_settings where id=1);
do $$
declare s public.doxa_checkout_sessions; repeated public.doxa_checkout_sessions; n integer; target uuid:=gen_random_uuid(); second uuid:=gen_random_uuid(); a jsonb:='{"first_name":"Test","last_name":"Buyer","street":"Teststraat 12","postal_code":"1234 AB","city":"Amsterdam","country":"NL"}';
begin
 s:=public.begin_doxa_checkout(target,repeat('a',64),'checkout-test@example.invalid',a,2);
 repeated:=public.begin_doxa_checkout(target,repeat('a',64),'checkout-test@example.invalid',a,2);
 if s.id<>repeated.id then raise exception 'Duplicate checkout'; end if;
 select stock into n from public.doxa_products where id=s.product_id; if n<>8 then raise exception 'Stock reservation'; end if;
 perform public.bind_doxa_payment(target,'tr_VerifyCheckout1','https://www.mollie.com/checkout/test');
 begin perform public.finalize_doxa_payment(target,'tr_VerifyCheckout1','paid',1,'EUR');raise exception 'Invalid amount accepted'; exception when raise_exception then if SQLERRM<>'Payment mismatch' then raise; end if; end;
 s:=public.finalize_doxa_payment(target,'tr_VerifyCheckout1','paid',20500,'EUR');
 repeated:=public.finalize_doxa_payment(target,'tr_VerifyCheckout1','paid',20500,'EUR');
 if s.order_id is null or repeated.order_id<>s.order_id then raise exception 'Duplicate order'; end if;
 select count(*) into n from public.doxa_order_notifications where session_id=target; if n<>2 then raise exception 'Notification count'; end if;
 select stock into n from public.doxa_products where id=s.product_id; if n<>8 then raise exception 'Double stock deduction'; end if;
 if not exists(select 1 from public.doxa_orders where id=s.order_id and shipping_cents=500 and quantity=2 and unit_price_cents=10000 and shipping_address=a) then raise exception 'Order snapshot'; end if;
 s:=public.begin_doxa_checkout(second,repeat('b',64),'checkout-test@example.invalid',a,1);
 perform public.bind_doxa_payment(second,'tr_VerifyCheckout2','https://www.mollie.com/checkout/test2');
 perform public.finalize_doxa_payment(second,'tr_VerifyCheckout2','expired',10500,'EUR');
 perform public.finalize_doxa_payment(second,'tr_VerifyCheckout2','expired',10500,'EUR');
 select stock into n from public.doxa_products where id=s.product_id; if n<>8 then raise exception 'Stock release not idempotent'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform count(*) from public.doxa_checkout_sessions;raise exception 'Anonymous reads allowed';exception when insufficient_privilege then null;end;
 begin perform public.finalize_doxa_payment(gen_random_uuid(),'tr_NoAccess','paid',1,'EUR');raise exception 'Anonymous finalization allowed';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: reservation, retry, amount check, one paid order, two notification jobs, snapshots, idempotent release, anonymous denial; rolled back' as result;
