-- Apply 20261030_preorders.sql first. All changes below roll back; no email/payment is sent.
begin;
update public.doxa_site set live=true where id=1;
update public.doxa_checkout_settings set enabled=true,shipping_cents=0,sale_mode='preorder',
 preorder_dispatch_date=current_date+30,preorder_product_details='TEST specification',
 preorder_returns='TEST cancellation and return information',preorder_notes_confirmed=true where id=1;
update public.doxa_products set status='active',stock=2,price_cents=100 where id=(select product_id from public.doxa_checkout_settings where id=1);
do $$
declare sid uuid:=gen_random_uuid(); second_sid uuid:=gen_random_uuid(); s public.doxa_checkout_sessions; product uuid; expected date:=current_date+30; count_jobs integer;
 delivery jsonb:=jsonb_build_object('first_name','Test','last_name','Buyer','street','Teststraat 1','postal_code','1234 AB','city','Test','country','NL');
begin
 select product_id into product from public.doxa_checkout_settings where id=1;
 begin
  perform public.begin_doxa_preorder_checkout(sid,repeat('a',64),'test@example.invalid',delivery,1,false,expected,'TEST specification','TEST cancellation and return information',100,0);
  raise exception 'TEST FAILED: missing acknowledgement accepted';
 exception when others then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 if (select stock from public.doxa_products where id=product)<>2 then raise exception 'Stock changed for rejected acknowledgement'; end if;
 begin
  perform public.begin_doxa_checkout(sid,repeat('a',64),'test@example.invalid',delivery,1);
  raise exception 'TEST FAILED: regular endpoint bypassed acknowledgement';
 exception when others then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 select * into s from public.begin_doxa_preorder_checkout(sid,repeat('a',64),'test@example.invalid',delivery,1,true,expected,'TEST specification','TEST cancellation and return information',100,0);
 if s.sale_mode<>'preorder' or not s.preorder_acknowledged or s.dispatch_date<>expected then raise exception 'Missing immutable pre-order snapshot'; end if;
 perform public.begin_doxa_preorder_checkout(sid,repeat('a',64),'test@example.invalid',delivery,1,true,null,null,null,null,null);
 if (select stock from public.doxa_products where id=product)<>1 then raise exception 'Repeated request reserved twice'; end if;
 update public.doxa_checkout_settings set preorder_dispatch_date=current_date+60,preorder_returns='Changed policy after order' where id=1;
 begin
  perform public.begin_doxa_preorder_checkout(second_sid,repeat('b',64),'test@example.invalid',delivery,1,true,expected,'TEST specification','TEST cancellation and return information',100,0);
  raise exception 'TEST FAILED: changed offer accepted';
 exception when others then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 if (select stock from public.doxa_products where id=product)<>1 then raise exception 'Changed offer reserved allocation'; end if;
 perform public.bind_doxa_payment(sid,'tr_preorderverify','https://www.mollie.com/checkout/test');
 select * into s from public.finalize_doxa_payment(sid,'tr_preorderverify','paid',100,'EUR');
 if not exists(select 1 from public.doxa_orders where id=s.order_id and sale_mode='preorder' and dispatch_date=expected and returns_policy='TEST cancellation and return information') then raise exception 'Order snapshot changed'; end if;
 select count(*) into count_jobs from public.doxa_order_notifications where session_id=sid and subject ilike '%pre-order%';
 if count_jobs<>2 then raise exception 'Pre-order confirmation jobs missing'; end if;
 perform public.finalize_doxa_payment(sid,'tr_preorderverify','paid',100,'EUR');
 if (select count(*) from public.doxa_orders where checkout_id=sid)<>1 then raise exception 'Duplicate paid order'; end if;
 perform public.begin_doxa_preorder_checkout(second_sid,repeat('b',64),'test@example.invalid',delivery,1,true,current_date+60,'TEST specification','Changed policy after order',100,0);
 if (select stock from public.doxa_products where id=product)<>0 then raise exception 'Second allocation not reserved'; end if;
 perform public.bind_doxa_payment(second_sid,'tr_preordercancel','https://www.mollie.com/checkout/test');
 perform public.finalize_doxa_payment(second_sid,'tr_preordercancel','canceled',100,'EUR');
 perform public.finalize_doxa_payment(second_sid,'tr_preordercancel','canceled',100,'EUR');
 if (select stock from public.doxa_products where id=product)<>1 then raise exception 'Canceled allocation not released exactly once'; end if;
 if has_function_privilege('anon','public.begin_doxa_preorder_checkout(uuid,text,text,jsonb,integer,boolean,date,text,text,integer,integer)','execute') then raise exception 'Public pre-order RPC exposed'; end if;
end $$;
rollback;
