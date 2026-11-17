-- Website newsletter sign-ups use the existing launch list (one list, existing
-- welcome mail). Adds: source, unsubscribe token + unsubscribe state,
-- re-subscribe support, and an unsubscribe link in the welcome mail.
-- Additive only: no rows or columns are removed.
begin;

alter table public.doxa_launch_list
  add column if not exists source text check (source is null or char_length(source) <= 80),
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at timestamptz;
create unique index if not exists doxa_launch_list_unsubscribe_token on public.doxa_launch_list (unsubscribe_token);

-- Sign up from the website. Existing active subscribers are left untouched
-- (no duplicates); someone who unsubscribed earlier is re-activated.
create or replace function public.subscribe_doxa_newsletter(email_address text, first_name text, email_consent boolean, signup_source text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(trim(email_address));
begin
  if normalized is null or length(normalized) > 254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  if first_name is null or length(trim(first_name)) not between 1 and 100 then raise exception 'Invalid first name'; end if;
  if email_consent is distinct from true then raise exception 'Consent required'; end if;
  insert into public.doxa_launch_list (email, first_name, email_consent, consent_version, source)
  values (normalized, trim(first_name), true, '2026-11-17-website', left(signup_source, 80))
  on conflict (email) do update
    set unsubscribed_at = null, consent_version = '2026-11-17-website'
    where public.doxa_launch_list.unsubscribed_at is not null;
end $$;

-- Unsubscribe with the personal token from an email link. Returns false for an unknown token.
create or replace function public.unsubscribe_doxa_newsletter(token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if token is null then return false; end if;
  update public.doxa_launch_list set unsubscribed_at = coalesce(unsubscribed_at, now()) where unsubscribe_token = token;
  return found;
end $$;

revoke all on function public.subscribe_doxa_newsletter(text, text, boolean, text) from public;
revoke all on function public.unsubscribe_doxa_newsletter(uuid) from public;
grant execute on function public.subscribe_doxa_newsletter(text, text, boolean, text) to anon, authenticated;
grant execute on function public.unsubscribe_doxa_newsletter(uuid) to anon, authenticated;

-- Welcome mail: fill {{unsubscribe_url}}, or append an unsubscribe line when the template has none.
create or replace function public.queue_doxa_welcome()
returns trigger language plpgsql security definer set search_path = '' as $$
declare link text := 'https://doxaessence.com/afmelden?token=' || new.unsubscribe_token::text;
begin
  insert into public.doxa_welcome_notifications (registration_id, subject, body)
  select new.id, s.subject,
    case when position('{{unsubscribe_url}}' in s.body) > 0
      then replace(replace(s.body, '{{first_name}}', new.first_name), '{{unsubscribe_url}}', link)
      else replace(s.body, '{{first_name}}', new.first_name) || E'\n\n—\nGeen e-mails meer ontvangen? Afmelden: ' || link
    end
  from public.doxa_welcome_settings s where s.id = 1;
  return new;
end $$;

-- Never send the welcome mail to someone who has unsubscribed.
create or replace function public.claim_doxa_welcome(notification_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare job public.doxa_welcome_notifications; recipient text;
begin
  update public.doxa_welcome_notifications set first_attempt_at = coalesce(first_attempt_at, now()), last_attempt_at = now()
  where id = notification_id and accepted_at is null
    and (first_attempt_at is null or first_attempt_at > now() - interval '23 hours')
    and (last_attempt_at is null or last_attempt_at < now() - interval '2 minutes')
  returning * into job;
  if not found then return null; end if;
  select email into recipient from public.doxa_launch_list where id = job.registration_id and email_consent and unsubscribed_at is null;
  if recipient is null then return null; end if;
  return to_jsonb(job) || jsonb_build_object('recipient', recipient);
end $$;

commit;
