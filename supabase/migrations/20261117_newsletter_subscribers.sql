-- Newsletter sign-ups. Visitors may only INSERT; nobody can read the list
-- through the public API. Read and export it as project owner in Supabase.
begin;
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null check (char_length(email) between 5 and 254 and email = lower(btrim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  consent boolean not null check (consent = true),
  source text check (char_length(source) <= 80),
  unsubscribed_at timestamptz
);
create unique index newsletter_subscribers_email on public.newsletter_subscribers (email);
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;
grant insert (email, consent, source) on public.newsletter_subscribers to anon, authenticated;
create policy "Visitors can subscribe" on public.newsletter_subscribers for insert to anon, authenticated with check (consent = true and unsubscribed_at is null);
commit;
