begin;
create table public.doxa_checkout_settings (
 id integer primary key default 1 check(id=1), enabled boolean not null default false,
 shipping_cents integer check(shipping_cents between 0 and 100000),
 merchant_email text check(merchant_email is null or merchant_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);
insert into public.doxa_checkout_settings(id) values(1);
alter table public.doxa_checkout_settings enable row level security;
revoke all on public.doxa_checkout_settings from anon,authenticated;
grant select,update on public.doxa_checkout_settings to authenticated;
create policy checkout_settings_admin on public.doxa_checkout_settings for all to authenticated using ((select public.is_doxa_admin())) with check ((select public.is_doxa_admin()));
create table public.doxa_checkout_sessions (
 id uuid primary key, token_hash text not null check(length(token_hash)=64),
 product_id uuid not null references public.doxa_products(id), product_name text not null,
 quantity integer not null check(quantity between 1 and 5), unit_price_cents integer not null check(unit_price_cents>0),
 shipping_cents integer not null check(shipping_cents>=0), email text not null, address jsonb not null,
 merchant_email text not null, payment_id text unique, checkout_url text,
 state text not null default 'creating' check(state in ('creating','open','pending','authorized','paid','failed','canceled','expired')),
 order_id uuid unique references public.doxa_orders(id), created_at timestamptz not null default now()
);
alter table public.doxa_orders add column checkout_id uuid unique references public.doxa_checkout_sessions(id),
 add column mollie_payment_id text unique, add column shipping_cents integer not null default 0 check(shipping_cents>=0),
 add column shipping_address jsonb;
create table public.doxa_order_notifications (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.doxa_checkout_sessions(id),
 audience text not null check(audience in ('customer','merchant')), recipient text not null, subject text not null, blocks jsonb not null,
 first_attempt_at timestamptz, last_attempt_at timestamptz, provider_id text, accepted_at timestamptz, created_at timestamptz not null default now(),
 unique(session_id,audience)
);
alter table public.doxa_checkout_sessions enable row level security;
alter table public.doxa_order_notifications enable row level security;
revoke all on public.doxa_checkout_sessions,public.doxa_order_notifications from anon,authenticated;
grant select on public.doxa_checkout_sessions,public.doxa_order_notifications to authenticated;
create policy checkout_sessions_admin on public.doxa_checkout_sessions for select to authenticated using ((select public.is_doxa_admin()));
create policy order_notifications_admin on public.doxa_order_notifications for select to authenticated using ((select public.is_doxa_admin()));
grant all on public.doxa_checkout_settings,public.doxa_checkout_sessions,public.doxa_order_notifications to service_role;
create function public.begin_doxa_checkout(session_id uuid, access_hash text, customer_email text, delivery_address jsonb, item_quantity integer)
returns public.doxa_checkout_sessions language plpgsql security definer set search_path='' as $$
declare s public.doxa_checkout_sessions; p public.doxa_products; c public.doxa_checkout_settings;
begin
 if length(access_hash)<>64 or access_hash is null or customer_email is null or length(customer_email)>254 or customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or item_quantity is null or item_quantity not between 1 and 5 then raise exception 'Invalid checkout'; end if;
 if jsonb_typeof(delivery_address)<>'object' or length(delivery_address::text)>3000 or delivery_address->>'country'<>'NL' or coalesce(delivery_address->>'first_name','')='' or coalesce(delivery_address->>'last_name','')='' or coalesce(delivery_address->>'street','')='' or coalesce(delivery_address->>'postal_code','')='' or coalesce(delivery_address->>'city','')='' then raise exception 'Invalid address'; end if;
 -- Serialize repeated requests for the same session before reserving inventory.
 perform pg_advisory_xact_lock(hashtextextended(session_id::text,0));
 select * into s from public.doxa_checkout_sessions where id=session_id for update;
 if found then
  if s.token_hash<>access_hash or s.email<>customer_email or s.address<>delivery_address or s.quantity<>item_quantity then raise exception 'Checkout request changed'; end if;
  return s;
 end if;
 select * into c from public.doxa_checkout_settings where id=1;
 if not c.enabled or c.shipping_cents is null or c.merchant_email is null or not coalesce((select live from public.doxa_site where id=1),false) then raise exception 'Checkout closed'; end if;
 select * into p from public.doxa_products where sku='DOXA-C1-GENESIS' for update;
 if not found or p.status<>'active' or p.price_cents<=0 or p.stock<item_quantity then raise exception 'Product unavailable'; end if;
 insert into public.doxa_checkout_sessions(id,token_hash,product_id,product_name,quantity,unit_price_cents,shipping_cents,email,address,merchant_email)
 values(session_id,access_hash,p.id,p.name,item_quantity,p.price_cents,c.shipping_cents,customer_email,delivery_address,c.merchant_email) returning * into s;
 update public.doxa_products set stock=stock-item_quantity where id=p.id;
 return s;
end $$;
create function public.bind_doxa_payment(session_id uuid, provider_payment text, payment_url text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if provider_payment !~ '^tr_[a-zA-Z0-9]+$' or payment_url !~ '^https://([a-z0-9-]+\.)?mollie\.com/' then raise exception 'Invalid payment'; end if;
 update public.doxa_checkout_sessions set payment_id=provider_payment,checkout_url=payment_url where id=session_id and (payment_id is null or payment_id=provider_payment);
 if not found then raise exception 'Payment mismatch'; end if;
end $$;
create function public.finalize_doxa_payment(session_id uuid, provider_payment text, payment_state text, amount_cents integer, currency_code text)
returns public.doxa_checkout_sessions language plpgsql security definer set search_path='' as $$
declare s public.doxa_checkout_sessions; customer uuid; new_order uuid; total integer; receipt text;
begin
 select * into s from public.doxa_checkout_sessions where id=session_id for update;
 if not found or s.payment_id is distinct from provider_payment or currency_code<>'EUR' or amount_cents<>s.quantity*s.unit_price_cents+s.shipping_cents then raise exception 'Payment mismatch'; end if;
 if s.state='paid' then return s; end if;
 if payment_state not in ('open','pending','authorized','paid','failed','canceled','expired') then raise exception 'Unknown payment state'; end if;
 if s.state in ('failed','canceled','expired') then
  if payment_state='paid' then raise exception 'Terminal payment needs review'; end if;
  return s;
 end if;
 if payment_state in ('failed','canceled','expired') then
  update public.doxa_products set stock=stock+s.quantity where id=s.product_id;
 elsif payment_state='paid' then
  insert into public.doxa_customers(name,email) values(trim((s.address->>'first_name')||' '||(s.address->>'last_name')),s.email) on conflict(email) do nothing;
  select id into customer from public.doxa_customers where email=s.email;
  insert into public.doxa_orders(customer_id,product_id,product_name,quantity,unit_price_cents,checkout_id,mollie_payment_id,shipping_cents,shipping_address)
  values(customer,s.product_id,s.product_name,s.quantity,s.unit_price_cents,s.id,s.payment_id,s.shipping_cents,s.address) returning id into new_order;
  total:=s.quantity*s.unit_price_cents+s.shipping_cents;
  receipt:=s.product_name||' × '||s.quantity||E'\nTotal paid: EUR '||to_char(total/100.0,'FM999999990.00')||E'\nIncludes delivery: EUR '||to_char(s.shipping_cents/100.0,'FM999999990.00')||E'\nOrder: '||new_order::text;
  insert into public.doxa_order_notifications(session_id,audience,recipient,subject,blocks) values
  (s.id,'customer',s.email,'Your DOXA ESSENCE order confirmation',jsonb_build_array(jsonb_build_object('type','heading','text','Thank you for your order.'),jsonb_build_object('type','text','text','Thank you for your purchase. Your payment has been confirmed. We will send a separate update when your parcel is ready for shipping.'),jsonb_build_object('type','text','text',receipt),jsonb_build_object('type','text','text','Delivery address: '||(s.address->>'first_name')||' '||(s.address->>'last_name')||E'\n'||(s.address->>'street')||E'\n'||(s.address->>'postal_code')||' '||(s.address->>'city')||E'\nNetherlands'))),
  (s.id,'merchant',s.merchant_email,'Nieuwe betaalde DOXA-bestelling',jsonb_build_array(jsonb_build_object('type','heading','text','Een nieuwe bestelling is betaald.'),jsonb_build_object('type','text','text',receipt||E'\nKlant: '||s.email),jsonb_build_object('type','button','text','Bekijk bestelling','url','https://doxaessence.com/admin/#orders')));
 end if;
 update public.doxa_checkout_sessions set state=payment_state,order_id=coalesce(new_order,order_id) where id=s.id returning * into s;
 return s;
end $$;
create function public.claim_doxa_order_notification(notification_id uuid)
returns public.doxa_order_notifications language plpgsql security definer set search_path='' as $$
declare result public.doxa_order_notifications;
begin
 update public.doxa_order_notifications set first_attempt_at=coalesce(first_attempt_at,now()),last_attempt_at=now()
 where id=notification_id and accepted_at is null and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours') and (last_attempt_at is null or last_attempt_at<now()-interval '2 minutes') returning * into result;
 return result;
end $$;
revoke all on function public.begin_doxa_checkout(uuid,text,text,jsonb,integer),public.bind_doxa_payment(uuid,text,text),public.finalize_doxa_payment(uuid,text,text,integer,text),public.claim_doxa_order_notification(uuid) from public,anon,authenticated;
grant execute on function public.begin_doxa_checkout(uuid,text,text,jsonb,integer),public.bind_doxa_payment(uuid,text,text),public.finalize_doxa_payment(uuid,text,text,integer,text),public.claim_doxa_order_notification(uuid) to service_role;
commit;
