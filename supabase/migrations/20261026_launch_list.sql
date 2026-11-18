begin;
create table if not exists public.doxa_launch_list (
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 first_name text not null check (length(first_name) between 1 and 100),
 email_consent boolean not null check (email_consent),
 consent_version text not null default '2026-10-26',
 created_at timestamptz not null default now()
);
alter table public.doxa_launch_list enable row level security;
revoke all on public.doxa_launch_list from anon, authenticated;
create or replace function public.join_doxa_launch_list(email_address text,first_name text,email_consent boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if email_address is null or length(trim(email_address))>254 or trim(email_address) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
 if first_name is null or length(trim(first_name)) not between 1 and 100 then raise exception 'Invalid first name'; end if;
 if email_consent is distinct from true then raise exception 'Consent required'; end if;
 insert into public.doxa_launch_list(email,first_name,email_consent) values(lower(trim(email_address)),trim(first_name),true) on conflict(email) do nothing;
end; $$;
revoke all on function public.join_doxa_launch_list(text,text,boolean) from public;
grant execute on function public.join_doxa_launch_list(text,text,boolean) to anon,authenticated;
commit;
