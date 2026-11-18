begin;
create table public.doxa_products (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 160),
 sku text not null unique check(length(trim(sku)) between 1 and 80), price_cents integer not null check(price_cents >= 0),
 stock integer not null default 0 check(stock >= 0), status text not null default 'draft' check(status in ('draft','active','archived')),
 created_at timestamptz not null default now()
);
create table public.doxa_customers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 160),
 email text not null unique check(email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 notes text not null default '' check(length(notes)<=4000), created_at timestamptz not null default now()
);
create table public.doxa_orders (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.doxa_customers(id),
 product_id uuid not null references public.doxa_products(id), product_name text not null,
 quantity integer not null check(quantity between 1 and 10000), unit_price_cents integer not null check(unit_price_cents>=0),
 status text not null default 'new' check(status in ('new','processing','shipped','cancelled')),
 created_at timestamptz not null default now()
);
-- No public catalog or checkout is enabled by this migration.
alter table public.doxa_products enable row level security;
alter table public.doxa_customers enable row level security;
alter table public.doxa_orders enable row level security;
revoke all on public.doxa_products,public.doxa_customers,public.doxa_orders from anon,authenticated;
grant select,insert,update on public.doxa_products,public.doxa_customers to authenticated;
grant select on public.doxa_orders to authenticated;
create policy admin_products on public.doxa_products for all to authenticated using ((select public.is_doxa_admin())) with check ((select public.is_doxa_admin()));
create policy admin_customers on public.doxa_customers for all to authenticated using ((select public.is_doxa_admin())) with check ((select public.is_doxa_admin()));
create policy admin_orders on public.doxa_orders for select to authenticated using ((select public.is_doxa_admin()));
create function public.create_doxa_order(customer uuid, product uuid, amount integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.doxa_products; result uuid;
begin
 if not public.is_doxa_admin() then raise exception 'Unauthorized'; end if;
 if amount is null or amount < 1 or amount > 10000 then raise exception 'Invalid quantity'; end if;
 select * into p from public.doxa_products where id=product for update;
 if not found or p.status <> 'active' or p.stock < amount then raise exception 'Product unavailable or insufficient stock'; end if;
 insert into public.doxa_orders(customer_id,product_id,product_name,quantity,unit_price_cents)
 values(customer,product,p.name,amount,p.price_cents) returning id into result;
 update public.doxa_products set stock=stock-amount where id=product;
 return result;
end $$;
create function public.set_doxa_order_status(order_id uuid, next_status text)
returns void language plpgsql security definer set search_path='' as $$
declare o public.doxa_orders;
begin
 if not public.is_doxa_admin() then raise exception 'Unauthorized'; end if;
 if next_status is null or next_status not in ('new','processing','shipped','cancelled') then raise exception 'Invalid status'; end if;
 select * into o from public.doxa_orders where id=order_id for update;
 if not found then raise exception 'Order missing'; end if;
 if o.status=next_status then return; end if;
 if o.status in ('cancelled','shipped') or next_status='new' or (o.status='new' and next_status='shipped') then raise exception 'Invalid transition'; end if;
 if next_status='cancelled' then update public.doxa_products set stock=stock+o.quantity where id=o.product_id; end if;
 update public.doxa_orders set status=next_status where id=order_id;
end $$;
revoke all on function public.create_doxa_order(uuid,uuid,integer),public.set_doxa_order_status(uuid,text) from public,anon;
grant execute on function public.create_doxa_order(uuid,uuid,integer),public.set_doxa_order_status(uuid,text) to authenticated;
commit;
