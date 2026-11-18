# Automatic newsletter welcome

All emails rendered by shared/email.js now include a readable 12px unsubscribe notice and an underlined mailto link to info@doxaessence.com with subject Afmelden voor e-mails. Dutch and English copy follows the message language; plaintext includes the same instruction. This is email-request-based opt-out, not an automatic unsubscribe endpoint. Applies to welcome, order, shipping and personal admin messages and exported previews.

## Repeat-signup correction — 29 October 2026

Owner reported no mail at timboo.yt@gmail.com. Database confirmed that this subscription predated the welcome trigger (00:33 Amsterdam) and had no notification; repeated signup previously did nothing on conflict. Applied `20261029_welcome_existing_signup.sql`: join RPC now also creates a missing first welcome for an existing registration, using the unique registration_id to suppress duplicate/concurrent retries. No blanket backfill or resend of accepted messages.

Repeated the website signup endpoint for the owner-provided address. Notification `8a157244-3590-452d-95bc-77a3e72f98d9`, provider message `01a18746-8fa1-7d4a-a824-01d944e8b6a4`; Resend dashboard shows Delivered to timboo.yt@gmail.com. Rolled-back SQL regression check against a legacy registration passed: repeat signup creates exactly one first welcome and no duplicate subscription. No mail to the legacy test fixture was committed. Admin explanation updated to describe this case.

Website beheren displays the last ten welcome jobs with subscription email, timestamp and queue/provider-acceptance state. Unconfirmed attempts older than 23 hours are labelled for manual review. Provider acceptance is never labelled as inbox delivery. Admin RLS applies and signout clears the display. Use Gegevens vernieuwen to reload.

Live since 29 October 2026. A new `doxa_launch_list` row queues one welcome notification in the same database transaction. Existing subscribers are not backfilled; duplicate signup does not queue a second welcome. The trigger also covers older browser bundles calling the existing signup RPC directly. Deleting a registration cascades its welcome job.

The website posts to `/api/newsletter/signup`, which validates consent/name/email, checks origin and applies the existing rate limiter. The Worker starts queue delivery after saving; the five-minute scheduled handler retries failed/unconfirmed sends. Delivery uses an atomic two-minute claim and stable Resend idempotency key, with a 23-hour retry limit. Accepted messages are not resent. Provider acceptance is distinct from delivery/inbox placement.

Sender display name is Timothy | DOXA ESSENCE; verified sending address remains orders@mail.doxaessence.com; Reply-To is info@doxaessence.com. Template uses the current first name, escapes HTML and signs as Timothy. Subject/body are editable by an authenticated administrator under Website beheren → Persoonlijke bedankmail nieuwsbrief. `{{first_name}}` is substituted when a new registration is saved. Edits apply to future registrations.

Migration: `supabase/migrations/20261029_newsletter_welcome.sql`, applied successfully. Admin-only settings/queue read policies, service-role-only claim. Database rollback verification passed for duplicate suppression, personalised body and claim concurrency. `tests/newsletter.test.mjs` verifies endpoint validation, escaping, reply-to, retries and accepted-job deduplication.

Production test: new registration Timothy / info@doxaessence.com. Welcome job `523638f1-190f-4d3e-b4f1-4e92020e4f2a`; Resend message `01a184e3-fe6f-77d9-aaff-8643a67a910e` shows Delivered. The owner’s test registration remains visible in admin. No existing newsletter subscribers were sent a welcome retroactively.
