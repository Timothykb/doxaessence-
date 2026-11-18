begin;
alter table public.doxa_products add column if not exists image_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('doxa-product-photos','doxa-product-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy doxa_product_photos_read on storage.objects for select to authenticated
using (bucket_id='doxa-product-photos' and (select public.is_doxa_admin()));
create policy doxa_product_photos_upload on storage.objects for insert to authenticated
with check (bucket_id='doxa-product-photos' and (select public.is_doxa_admin()));
commit;
