begin;
alter table public.doxa_checkout_sessions add column last_checked_at timestamptz;
create index doxa_unsettled_checkout on public.doxa_checkout_sessions(last_checked_at nulls first) where state in ('creating','open','pending','authorized') and payment_id is not null;
commit;
