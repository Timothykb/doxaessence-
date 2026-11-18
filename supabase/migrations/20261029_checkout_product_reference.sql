begin;
alter table public.doxa_checkout_settings add column product_id uuid references public.doxa_products(id);
-- Link the sole real product once. SKU is editable and cannot identify checkout reliably.
update public.doxa_checkout_settings set product_id=(select min(id::text)::uuid from public.doxa_products where sku<>'DOXA-CHECKOUT-TEST')
where id=1 and (select count(*) from public.doxa_products where sku<>'DOXA-CHECKOUT-TEST')=1;
do $$ declare definition text;
begin
 definition:=pg_get_functiondef('public.begin_doxa_checkout(uuid,text,text,jsonb,integer)'::regprocedure);
 if position('where sku=''DOXA-C1-GENESIS''' in definition)=0 then raise exception 'Checkout function changed; review product reference manually'; end if;
 definition:=replace(definition,'where sku=''DOXA-C1-GENESIS''','where id=c.product_id');
 execute definition;
end $$;
commit;
