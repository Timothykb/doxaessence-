begin;
alter table public.doxa_checkout_settings
 add column sale_mode text not null default 'regular' check(sale_mode in ('regular','preorder')),
 add column preorder_dispatch_date date,
 add column preorder_product_details text not null default '' check(length(preorder_product_details)<=1000),
 add column preorder_returns text not null default '' check(length(preorder_returns)<=4000),
 add column preorder_notes_confirmed boolean not null default false;
alter table public.doxa_checkout_sessions
 add column sale_mode text not null default 'regular' check(sale_mode in ('regular','preorder')),
 add column dispatch_date date, add column product_details text, add column returns_policy text,
 add column preorder_acknowledged boolean not null default false;
alter table public.doxa_orders
 add column sale_mode text not null default 'regular' check(sale_mode in ('regular','preorder')),
 add column dispatch_date date, add column product_details text, add column returns_policy text;
create function public.snapshot_doxa_preorder() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.doxa_checkout_settings;
begin
 if new.test_mode then return new; end if;
 select * into c from public.doxa_checkout_settings where id=1;
 if c.sale_mode='preorder' then
  if current_setting('doxa.preorder_acknowledged',true) is distinct from 'true'
  or c.preorder_dispatch_date is null or c.preorder_dispatch_date<(now() at time zone 'Europe/Amsterdam')::date
  or length(trim(c.preorder_product_details))<5 or length(trim(c.preorder_returns))<10 or not c.preorder_notes_confirmed then
   raise exception 'Pre-order details and acknowledgement required';
  end if;
  new.sale_mode:='preorder';new.dispatch_date:=c.preorder_dispatch_date;
  new.product_details:=c.preorder_product_details;new.returns_policy:=c.preorder_returns;new.preorder_acknowledged:=true;
 end if;
 return new;
end $$;
create trigger doxa_checkout_preorder before insert on public.doxa_checkout_sessions for each row execute function public.snapshot_doxa_preorder();
create function public.begin_doxa_preorder_checkout(session_id uuid,access_hash text,customer_email text,delivery_address jsonb,item_quantity integer,preorder_acknowledged boolean,expected_dispatch_date date,expected_product_details text,expected_returns_policy text,expected_unit_price_cents integer,expected_shipping_cents integer)
returns public.doxa_checkout_sessions language plpgsql security definer set search_path='' as $$
declare s public.doxa_checkout_sessions; c public.doxa_checkout_settings; p public.doxa_products;
begin
 if preorder_acknowledged is distinct from true then raise exception 'Pre-order acknowledgement required'; end if;
 if not exists(select 1 from public.doxa_checkout_sessions where id=session_id and sale_mode='preorder')
 and not exists(select 1 from public.doxa_checkout_settings where id=1 and sale_mode='preorder') then raise exception 'Pre-orders not configured'; end if;
 if not exists(select 1 from public.doxa_checkout_sessions where id=session_id) then
  select * into c from public.doxa_checkout_settings where id=1 for update;
  select * into p from public.doxa_products where id=c.product_id for update;
  if c.preorder_dispatch_date is distinct from expected_dispatch_date or c.preorder_product_details is distinct from expected_product_details
  or c.preorder_returns is distinct from expected_returns_policy or p.price_cents is distinct from expected_unit_price_cents
  or c.shipping_cents is distinct from expected_shipping_cents then raise exception 'Pre-order offer changed'; end if;
 end if;
 perform set_config('doxa.preorder_acknowledged','true',true);
 select * into s from public.begin_doxa_checkout(session_id,access_hash,customer_email,delivery_address,item_quantity);
 perform set_config('doxa.preorder_acknowledged','false',true);
 return s;
end $$;
revoke all on function public.begin_doxa_preorder_checkout(uuid,text,text,jsonb,integer,boolean,date,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.begin_doxa_preorder_checkout(uuid,text,text,jsonb,integer,boolean,date,text,text,integer,integer) to service_role;
create function public.snapshot_doxa_preorder_order() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.doxa_checkout_sessions;
begin
 select * into s from public.doxa_checkout_sessions where id=new.checkout_id;
 if s.sale_mode='preorder' then new.sale_mode:='preorder';new.dispatch_date:=s.dispatch_date;new.product_details:=s.product_details;new.returns_policy:=s.returns_policy;end if;
 return new;
end $$;
create trigger doxa_order_preorder before insert on public.doxa_orders for each row execute function public.snapshot_doxa_preorder_order();
create function public.describe_doxa_preorder_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.doxa_checkout_sessions; description text;
begin
 select * into s from public.doxa_checkout_sessions where id=new.session_id;
 if s.sale_mode='preorder' then
  new.subject:=case when new.audience='merchant' then 'Nieuwe betaalde DOXA-pre-order' else 'Your DOXA ESSENCE pre-order confirmation' end;
  description:=case when new.audience='merchant' then 'PRE-ORDER — verwacht verzenden vanaf ' else 'PRE-ORDER — expected dispatch from ' end||to_char(s.dispatch_date,'DD Mon YYYY')||E'\n'||s.product_details||E'\n\n'||s.returns_policy;
  new.blocks:=jsonb_build_array(jsonb_build_object('type','text','text',description))||new.blocks;
 end if;
 return new;
end $$;
create trigger doxa_notification_preorder before insert on public.doxa_order_notifications for each row execute function public.describe_doxa_preorder_notification();
revoke all on function public.snapshot_doxa_preorder(),public.snapshot_doxa_preorder_order(),public.describe_doxa_preorder_notification() from public,anon,authenticated;
-- Existing settings stay regular/disabled; no live mode, price, allocation or published copy is changed.
commit;
