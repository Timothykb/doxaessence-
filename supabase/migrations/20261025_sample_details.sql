begin;
alter table public.doxa_waitlist add column if not exists full_name text check (char_length(full_name) between 2 and 100);
alter table public.doxa_waitlist add column if not exists postal_address text check (char_length(postal_address) between 10 and 500);
create or replace function public.join_doxa_sample_waitlist(email_address text, full_name text, postal_address text, wants_newsletter boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(trim(email_address));
begin
 if normalized is null or length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
 if full_name is null or length(trim(full_name)) not between 2 and 100 then raise exception 'Invalid name'; end if;
 if postal_address is null or length(trim(postal_address)) not between 10 and 500 then raise exception 'Invalid address'; end if;
 insert into public.doxa_waitlist(email,full_name,postal_address,samples,newsletter)
 values(normalized,trim(full_name),trim(postal_address),true,coalesce(wants_newsletter,false))
 on conflict(email) do update set
 full_name=coalesce(doxa_waitlist.full_name,excluded.full_name),
 postal_address=coalesce(doxa_waitlist.postal_address,excluded.postal_address),
 samples=true, newsletter=doxa_waitlist.newsletter or excluded.newsletter,updated_at=now();
end; $$;
revoke all on function public.join_doxa_sample_waitlist(text,text,text,boolean) from public;
grant execute on function public.join_doxa_sample_waitlist(text,text,text,boolean) to anon,authenticated;
commit;
