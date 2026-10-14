begin;
create table public.community_stories (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 display_name text not null check(char_length(btrim(display_name)) between 2 and 40),
 kind text not null check(kind in ('review','testimony')),
 body text not null check(char_length(btrim(body)) between 20 and 1500),
 rating smallint,
 consent boolean not null check(consent = true),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 constraint rating_for_reviews check ((kind='review' and rating is not null and rating between 1 and 5) or (kind='testimony' and rating is null))
);
alter table public.community_stories enable row level security;
revoke all on public.community_stories from anon, authenticated;
grant select on public.community_stories to anon, authenticated;
grant insert (display_name,kind,body,rating,consent) on public.community_stories to anon, authenticated;
create policy "Only approved stories are readable" on public.community_stories for select to anon, authenticated using (status='approved');
create policy "Submit stories for moderation" on public.community_stories for insert to anon, authenticated with check (status='pending' and consent=true);
create index community_stories_approved_date on public.community_stories (created_at desc, id desc) where status='approved';
commit;
