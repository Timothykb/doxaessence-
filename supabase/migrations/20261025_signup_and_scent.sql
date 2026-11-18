begin;
create table if not exists public.doxa_waitlist (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check (char_length(email) between 3 and 254),
 samples boolean not null default false,
 newsletter boolean not null default false,
 consent_version text not null default '2026-10-25',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (samples or newsletter)
);
alter table public.doxa_waitlist enable row level security;
revoke all on public.doxa_waitlist from anon, authenticated;
create or replace function public.join_doxa_waitlist(email_address text, wants_samples boolean, wants_newsletter boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(trim(email_address));
begin
 if normalized is null or length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  raise exception 'Invalid email';
 end if;
 if not (coalesce(wants_samples,false) or coalesce(wants_newsletter,false)) then raise exception 'Choose an interest'; end if;
 insert into public.doxa_waitlist(email,samples,newsletter)
 values(normalized,coalesce(wants_samples,false),coalesce(wants_newsletter,false))
 on conflict(email) do update set samples=doxa_waitlist.samples or excluded.samples,
 newsletter=doxa_waitlist.newsletter or excluded.newsletter, updated_at=now();
end; $$;
revoke all on function public.join_doxa_waitlist(text,boolean,boolean) from public;
grant execute on function public.join_doxa_waitlist(text,boolean,boolean) to anon, authenticated;
update public.scent_layers set notes='Bergamot · Roze Peper · Kardemom' where slug='light';
update public.scent_layers set notes='Vijgenblad · Iris · Oranjebloesem' where slug='life';
update public.scent_layers set notes='Sandelhout · Ambrette Musk · Cederhout · Vanille' where slug='earth';
commit;
