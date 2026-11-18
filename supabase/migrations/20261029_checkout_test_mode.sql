begin;
alter table public.doxa_checkout_sessions add column test_mode boolean not null default false;
alter table public.doxa_orders add column test_mode boolean not null default false;
insert into public.doxa_products(name,sku,price_cents,stock,status) values('[TEST] The Genesis — niet verzenden','DOXA-CHECKOUT-TEST',100,0,'archived');
create function public.begin_doxa_test_checkout(session_id uuid,access_hash text)
returns public.doxa_checkout_sessions language plpgsql security definer set search_path='' as $$
declare s public.doxa_checkout_sessions; p public.doxa_products;
begin
 if access_hash is null or access_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid access hash'; end if;
 perform pg_advisory_xact_lock(hashtextextended(session_id::text,0));
 select * into s from public.doxa_checkout_sessions where id=session_id for update;
 if found then
  if not s.test_mode or s.token_hash<>access_hash then raise exception 'Invalid test session'; end if;
  return s;
 end if;
 select * into p from public.doxa_products where sku='DOXA-CHECKOUT-TEST';
 -- A separate archived diagnostic product; no Genesis inventory or real prices change.
 insert into public.doxa_checkout_sessions(id,token_hash,product_id,product_name,quantity,unit_price_cents,shipping_cents,email,address,merchant_email,test_mode)
 values(session_id,access_hash,p.id,p.name,1,100,0,'info@doxaessence.com',jsonb_build_object('first_name','TEST','last_name','Timothy','street','Teststraat 1','postal_code','1234 AB','city','TEST — niet verzenden','country','NL'),'info@doxaessence.com',true) returning * into s;
 return s;
end $$;
revoke all on function public.begin_doxa_test_checkout(uuid,text) from public,anon,authenticated;
grant execute on function public.begin_doxa_test_checkout(uuid,text) to service_role;
create function public.mark_doxa_test_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.test_mode:=coalesce((select test_mode from public.doxa_checkout_sessions where id=new.checkout_id),false);
 return new;
end $$;
create trigger doxa_order_test_mode before insert on public.doxa_orders for each row execute function public.mark_doxa_test_order();
create function public.mark_doxa_test_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce((select test_mode from public.doxa_checkout_sessions where id=new.session_id),false) then
  new.subject:='[TEST — geen echte aankoop] '||new.subject;
  new.blocks:=jsonb_build_array(jsonb_build_object('type','text','text','TEST / PROEFBETALING: er is geen geld afgeschreven. Dit is geen echte aankoop. Niet verzenden.'))||new.blocks;
 end if;
 return new;
end $$;
create trigger doxa_notification_test_mode before insert on public.doxa_order_notifications for each row execute function public.mark_doxa_test_notification();
revoke all on function public.mark_doxa_test_order(),public.mark_doxa_test_notification() from public,anon,authenticated;
commit;
