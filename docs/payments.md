# Mollie checkout and order confirmations

Implemented 28–29 October 2026. Public shop and checkout remain private; checkout settings default to disabled. No real payment or customer email was used in testing.

## Flow

1. Server checks that the shop is live, checkout enabled, Genesis SKU active with a positive price and sufficient stock, shipping/merchant email configured, and payment/database/mail secrets present.
2. Customer supplies email, Netherlands delivery address and quantity 1–5. Server ignores browser prices. An immutable checkout snapshot reserves stock in a transaction; repeated session IDs reserve once. Browser keeps a random access token in session storage; only its SHA-256 hash is in the database.
3. Mollie payment uses a stable UUID idempotency key and the snapshot amount. The browser redirects to Mollie hosted checkout. Requests older than 45 minutes without a bound payment are stopped for review rather than silently creating a second payment outside Mollie's one-hour idempotency window.
4. A classic Mollie webhook posts the payment ID. Server fetches the actual payment from Mollie and verifies ID, metadata, mode, EUR currency and amount. A redirect alone never marks an order paid.
5. Paid status atomically creates one customer/order with amount and delivery snapshot and exactly two durable notification jobs, customer and merchant. Repeated webhooks reuse the same order. Failed/canceled/expired payments release reserved stock once.
6. DOXA-styled confirmation messages are submitted to Resend with stable idempotency keys. Accepted messages are recorded. Uncertain jobs retry for at most 23 hours, then require provider-history review; do not blindly resend after the provider's idempotency window. Accepted does not mean delivered into an inbox.
7. Five-minute scheduled reconciliation checks bounded batches of unsettled Mollie payments and notification jobs. Fair rotation prevents an old pending batch from starving newer jobs. Unbound/ambiguous creation requests remain reserved until an operator checks Mollie; stock is not released on a timeout alone.

## Configuration / current state

- `MOLLIE_API_KEY`: uploaded to Cloudflare as a server secret. The key supplied in chat should be rotated before launch. Its value is not in source, docs or frontend bundles. No charge was created to validate it.
- `SUPABASE_SERVICE_ROLE_KEY`: required server-only secret; the owner explicitly approved transfer of the existing Supabase server credential; stored as an encrypted Cloudflare production secret through the dashboard on 29 October 2026. Never use a VITE-prefixed variable for it.
- `RESEND_API_KEY` and `MAIL_FROM`: required server secrets. Resend account connection and sending-domain verification are still pending. Existing Mijndomein mailbox/DNS must be preserved; add the records Resend specifies for the selected sending subdomain, without replacing mailbox MX records.
- Studio → Website → Betalen & orderbevestigingen: shipping price in EUR, merchant notification address, checkout switch. All are unset/disabled until the owner supplies real values.
- Studio → Producten: actual Genesis price, active status and stock. Do not use editable promotional price text as the payment amount.
- Only Netherlands shipping is implemented; no invented tax, shipping or return promises.

Server-secret setup uses `pnpm exec wrangler secret put NAME` with a hidden interactive prompt. Do not paste credentials into chat, command arguments, tracked files or browser source.

## Database and checks

Applied `20261028_checkout.sql` through existing Supabase SQL Editor; confirmed checkout disabled and shipping/merchant fields null. Transaction-only `supabase/checkout-verification.sql` passed with rollback: stock reservation and repeat requests, rejected wrong amounts, exactly one paid order/two notifications, order/address snapshots, idempotent stock release and anonymous read/RPC denial. Test price/stock/addresses were rolled back. `20261029_checkout_operations.sql` adds fair scheduling metadata.

Unit/integration tests mock Mollie and Resend; no real charges or email. Tests check input validation, origin restrictions, backend price, idempotency key, amount/metadata/mode verification, pending status, mail acceptance and private routes. The checkout rate limiter is approximate (Cloudflare per-location binding).

Before opening: finish credentials, set actual price/stock/shipping/notification address, use a Mollie test key for an end-to-end sandbox purchase and verify both emails, then switch to a rotated live key and enable the checkout/site. Live payments have not yet been end-to-end verified. Refunds remain managed in Mollie; cancelling fulfilment in Studio does not refund the payment. PostNL label automation is separate from payment confirmation.

API references: https://docs.mollie.com/reference/create-payment ; https://docs.mollie.com/reference/get-payment ; https://docs.mollie.com/reference/api-idempotency ; https://resend.com/changelog/idempotency-keys

## Deployment — 29 October 2026

Deployed Worker version `1beaa75f-ac04-494d-b4a5-c30197e70bee`, including payment API, scheduled reconciliation, rate-limit binding, admin settings, status page and checkout frontend. Seven test files and production build passed. Verified on both custom domains: newsletter home public; product/checkout private; checkout config reports ready=false; creating payment returns 503 without calling Mollie; cross-origin create denied; anonymous payment-admin status denied; order-status page has noindex/no-referrer headers.

Operations migration applied and SQL confirmed both website_live=false and checkout enabled=false. Owner requested self-service price and shipping configuration later; merchant notification email set to info@doxaessence.com, shipping remains null. Server-key transfer completed after explicit authorization; Cloudflare shows Value encrypted. Both domains return HTTP 200 and ready=false from the server-backed catalog, confirming the database connection without opening checkout. No real payment, email, stock or test customer persisted.

## Resend connection completed — 29 October 2026

Owner supplied a sending-only Resend key and authorized taking over the remaining setup. Stored `RESEND_API_KEY` as an encrypted Cloudflare production secret. The key cannot list domains (scope confirmed through HTTP 401); domain setup used the already authenticated Resend dashboard without expanding key permissions.

Created sending domain `mail.doxaessence.com`, Ireland/eu-west-1, Resend domain ID `289aa364-1282-411f-a4ea-c5c51e6022b8`. Owner explicitly approved the three DNS additions immediately before they were applied:
- TXT `resend._domainkey.mail` with the public DKIM key supplied by Resend.
- DNS-only CNAME `rsend.mail` → `rsend-euw1.forge.rmta.net`.
- DNS-only CNAME `send.mail` → `send.forge.rmta.net`.

Resend shows Verified and ready to send. Public DNS lookups confirm all three records. Existing mailbox MX records remain `5 mx1.mijndomein.nl` and `6 mx2.mijndomein.nl`; root SPF/DMARC and existing DKIM were preserved. Receiving on the Resend subdomain is disabled.

`MAIL_FROM` set to `DOXA ESSENCE <orders@mail.doxaessence.com>`. Both order-confirmation and existing admin-mail transports now include Reply-To `info@doxaessence.com` by default, overridable with `MAIL_REPLY_TO`. Deployed Worker version `1365b556-60df-4d5f-a4a7-9a13849a9ea7`. Seven test files pass.

Sent clearly marked customer and merchant template tests only to the owner-provided info@doxaessence.com, with no payment/order/stock changes. Customer message `01a184d9-384a-757a-9acf-84bea2780328` shows Delivered. First merchant attempt `01a184d9-3912-7d39-bfa8-9ce699cb48a4` received a generic transient bounce after initial acceptance. One intentional retest `01a184d9-fd7e-72a9-b779-32944d7568e5` shows Delivered. No other customers or newsletter contacts received anything. Delivery refers to provider delivery status, not proof of inbox placement or reading in Apple Mail.

At this stage, pending launch work was: owner fills actual Genesis price, stock/status and shipping price in Studio; checkout stays disabled and public website stays newsletter-only. Merchant recipient is info@doxaessence.com. Sandbox verification was still pending; completion is recorded below. Keys shared in chat should be rotated before launch; values are never retained in source or these notes.

## Full sandbox purchase completed — 29 October 2026

Owner explicitly approved creating a Mollie test API key and storing it as encrypted Cloudflare secret `MOLLIE_TEST_API_KEY`. Mollie key named Doxa webshop testbetaling, mode Test, Doxa essence profile. Production/live key remains separate and unchanged. Cloudflare visibly confirms Secret / Value encrypted. No secret values retained in source.

Migration `20261029_checkout_test_mode.sql` applied. Authenticated admin-only POST `/api/admin/test-checkout` creates a fixed €1 test checkout using the test key exclusively, with both recipients info@doxaessence.com. A separate archived diagnostic product `DOXA-CHECKOUT-TEST` isolates stock from Genesis. The live website/settings/prices are not enabled or changed for this test. Test orders and both notification subjects/body carry explicit TEST / no real purchase / do not ship markers. Shipping/status actions are hidden for test orders. Creation RPC executable only by service_role; regular customers cannot create sandbox sessions.

Admin Website beheren has a Mollie-proefbetaling uitvoeren button. Request/token persist in sessionStorage for safe retry. This button reuses its original test reference rather than silently generating another payment after uncertain responses. Test payment verification and reconciliation select the test secret by server-stored test_mode and reject provider mode mismatches. Public status page identifies test payments.

Completed actual Mollie-hosted iDEAL simulator flow, selecting Paid. Session `1332f1a8-bb36-438f-9418-ce5a0c86bf67`, order `8b9cc329-6e28-4000-ba0c-3b093ceb5259`. Return page confirms paid test/no money charged; admin Bestellingen shows the same test order and no shipping actions. Resend dashboard shows Delivered for both automatically generated customer and merchant confirmation emails. No real payment was performed; no real customer was contacted. Test order/customer/product remain for inspection.

All nine local test files and production build passed, including sandbox credential separation and admin authentication. SQL rollback verification passed for owner recipients, test markers on order and both jobs, idempotent paid finalization, unchanged Genesis stock and service-only creation. Deployment `ff195c68-dd9e-469b-8fe6-218bb3710127` includes sandbox and welcome mail. Personal newsletter welcome is documented in `docs/newsletter-welcome.md`.
