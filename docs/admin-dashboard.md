# DOXA Studio

29 October follow-up: Website beheren includes a launch-readiness list based on stored product, shipping, credentials, checkout switch and live-site state. It does not enable checkout or publish. The welcome-mail editor now shows the last ten automatic sends. Test orders remain visible and labelled, but are excluded from customer order counts/amounts. The diagnostic product is hidden from the editable product list so the owner sees the single real fragrance.

Product SKU was edited by the owner to TGN-001 (price €89.99, stock50, draft). Checkout formerly hardcoded the old SKU; `20261029_checkout_product_reference.sql` adds a stable product_id to checkout settings, links the sole real product and updates reservation lookup. Worker catalog and launch-readiness display use this identifier. Price, stock, SKU, status, shipping and launch switches are preserved.

Applied migration and verified reservation against TGN-001 in a rolled-back transaction, without exposing the public storefront. Ten test files passed; build and deployment `51375412-0b03-4a54-9db9-2138e427e315` succeeded. Authenticated UI verification confirms launch checks show real price configured, product draft, shipping unset, payment switch off, full website private; welcome history shows the accepted owner test message.

Entry: `/admin/`. Supabase email-link sign-in. Only the verified Auth account `timothykboona@gmail.com` may read registration data. Authorization is enforced in PostgreSQL, not by client-side email checks. No service role key is shipped.

- Overview: current launch list count, new registrations in the last seven days, earlier registration count.
- Audience: separate current and legacy lists, search, 25-row pages, full filtered CSV export. CSV values are escaped against formula injection. Consent is preserved per source; sample-only registrations are not newsletter subscribers.
- Activity: latest launch registrations only, not web traffic or delivery events.
- Orders: not connected. No product page or payment system exists yet.
- Connections: explicitly lists integrations that are not present.

Migrations: `20261026_launch_list.sql` and `20261027_admin_dashboard.sql` were applied on 2026-10-27. Both tables have RLS. Anonymous visitors cannot select registration data. The approved admin has read-only access; deletion and campaign sending are not implemented.

Auth site URL: `https://doxaessence.com/admin/`. Exact allowed redirect URLs: the same URL, `https://www.doxaessence.com/admin/`, and local preview `http://127.0.0.1:5173/admin/`.

Confirmation emails and newsletters need a separate sending integration and recipient-specific unsubscribe handling before sending campaigns. Mijndomein inbox content is not integrated. Domain and email DNS are unchanged.

## Live release — 2026-10-28

Published to doxaessence.com and www.doxaessence.com, Cloudflare Worker version `ab7e3d3a-17f0-46d7-8f3a-e7307b31ca5f`. The public preview gate has been removed; the prior worker is archived locally in `docs/archive/private-preview-worker.js`.

Administrator invitation sent; Supabase confirms the account's email confirmation and first sign-in. The user opened the invitation in Safari on their phone, so the desktop browser does not share that authenticated session.

Verified:
- Production home, admin, privacy and thank-you endpoints respond HTTP 200.
- Anonymous reads of both registration tables denied (401); invalid signup rejected (400).
- Transaction test verifies signup insertion, duplicate handling, non-admin isolation, and the actual confirmed administrator's read permissions; rolled back without keeping test contacts.
- Form success/failure/consent handling and CSV formula-injection tests pass.
- Mobile login has no horizontal overflow at 390px.

Authenticated dashboard browser interactions on the user's phone have not been exercised by the agent. Visitor analytics, campaigns/confirmation delivery and commerce remain unconnected. Changes are saved locally and deployed; no GitHub commit/push was made in this task.

## Commerce foundation — 28 October 2026 (deployed)

The existing folder now includes Products, Customers and Orders in `/admin/`, alongside the existing newsletter lists. The original wine/cream branding is retained.

- Products: create/edit name, unique SKU, EUR price, stock and draft/active/archived status.
- Customers: create/edit name, unique email and internal notes; search and order totals. Customer records do not grant marketing consent.
- Orders: create a manual single-product order for an existing customer, with a price/name snapshot. Database functions reserve stock atomically and return it once when cancelling. New → processing → shipped, or cancellation before shipment. No payment status is inferred.
- Connections reports commerce as connected only after all three tables can be read. Controls remain disabled when database setup/access is unavailable.
- All commerce tables require the existing verified administrator through RLS; anonymous catalog/checkout access is not enabled. Orders are written only through administrator-checked RPCs.

Applied `supabase/migrations/20261028_commerce.sql` through the existing Supabase dashboard session (GitHub sign-in) before deployment. Explicitly revoked anonymous RPC execution in addition to PUBLIC privileges because Supabase default function grants include anon. Transaction verification passed for administrator CRUD, stock reservation, oversell rejection, price/name snapshots, status transitions, cancellation idempotency, non-admin isolation and anonymous denial. All temporary test records were rolled back. No seed products, customers or orders were invented.

Validation: production build and existing admin/privacy/deletion tests pass after adding commerce lifecycle stubs to the isolated admin test harness. Online checkout, payment webhooks, email delivery, analytics and mailbox integrations remain pending. No new Codex project was created; files remain in the existing local folder.


### Commerce release verification
Cloudflare version `8c6ec0a2-bb27-4109-ade2-474956e5c839`, published to both doxaessence.com and www.doxaessence.com on 28 October 2026. Both admin endpoints and their updated JavaScript assets respond HTTP 200. Anonymous REST reads on all three commerce tables and calls to both commerce RPCs are denied. The authenticated Safari dashboard shows “Connected — products, customers and manual orders”. Build and existing tests pass. Reusable checks: `supabase/commerce-verification.sql` and `.tools/verify-commerce-live.mjs`.

## Dutch admin, email composer and PostNL — 28 October 2026

All administration labels, status messages and date/currency formatting are Dutch. Public website content and customer email content can remain English. The site editor's labels are Dutch; its editable English content is preserved.

Added:
- Email editor: named cloud-saved drafts, heading/text/button blocks, reorder/remove, HTTPS button validation, responsive DOXA wine/cream layout, preview and HTML download. Personal and newsletter drafts remain distinct. Sending newsletters is disabled until consent, unsubscribe and suppression are connected.
- PostNL: per-order barcode and full PostNL tracking link. Labels are created in Mijn PostNL and manually linked. Linking creates one immutable shipping email job; repeated saves do not create duplicate jobs. Labels move new orders to processing, not shipped. There is no PostNL API connection and no checkout.
- Email transport: authenticated same-origin Worker API with server-side optional Resend credentials (`RESEND_API_KEY`, `MAIL_FROM`). No provider account was created, no credentials configured, and no real message sent. Composer remains usable without a provider. Shipping mail remains pending until transport is configured; the admin shows this explicitly. Turning on transport does not automatically drain old pending jobs: review them in E-mails.
- Each job stores a fixed recipient/content snapshot. The provider receives a stable idempotency key. Unconfirmed sends may be retried with the same payload for 23 hours; older attempts require provider-history review. Provider acceptance is not reported as inbox delivery.

Migration `20261028_mail_shipping.sql` applied in Supabase through the existing dashboard session. `mail-shipping-verification.sql` passes using temporary records and rollback, covering RLS, immutable mail content, duplicate prevention, newsletter blocking and shipment state. Local UI fixture is `.tools/admin-fixture.html`; all its example contacts/products stay in browser memory and are excluded from production builds. The optional transport is tested with mocked provider calls only.

For automatic creation/import of PostNL labels, a business API connection is still needed: https://developer.postnl.nl/support/api-key/how-do-i-get-an-api-key/ . No labels were purchased or account settings changed.

### Release — Dutch admin and email/shipping foundation
Published Cloudflare version `8a0b278e-1c10-46e6-8fb8-1972cb045e11`. Joint release includes the other chat's website editor/private storefront; the site-content migration is applied with `live=false`, so the public English signup page remains active. No checkout has been added. Admin UI verified in the authenticated Safari session; mobile email editor checked at 390px with no document overflow. Four test files and production build pass. No mail credentials configured. Cancellation is checked before starting a shipping-email job and was verified with rollback.

Authenticated end-to-end check: saved reusable draft “DOXA — persoonlijk klantbericht” in the live admin, with English starter copy and a `Discover DOXA ESSENCE` button. No recipient selected and no email sent. This is a real starter template for Timothy, not a test contact. The Dutch UI confirmed “Concept opgeslagen.” and the draft appears in its picker.

## Klantbestand — 28 October 2026

New `/admin/#contacts` navigation entry combines existing customer records, current newsletter registrations and earlier sample/newsletter registrations into one searchable, paginated view, deduplicated by normalized email address. Filters: all contacts, customers, recorded newsletter consent, both customer and newsletter, sample interest. Original lists and consent fields are preserved; customer registration never implies newsletter consent. Consent is described as recorded consent rather than a live suppression/opt-out state. Links lead to customer editing and registration management/export. All queries use the existing administrator-only RLS access and permitted legacy columns; no new database permissions or schema changes.

Five test files pass, including deduplication and consent separation. Local UI verified that filtering newsletter consent excludes a customer without newsletter consent. No checkout, PostNL API, provider credentials or campaign-sending integration was added. Labels and emails are still not automatic.
Klantbestand release: Cloudflare version `1ddb47fb-8ab3-4fb9-9dad-083af4988495`. Verified updated admin/assets on both custom domains; anonymous data access remains denied.

## Registration deletion — verified 28 October 2026

The approved `20261028_delete_registrations.sql` function is active. Only the verified administrator can call it. Selected email addresses are removed from both newsletter/sample registration lists; customer/order records and downloaded exports are outside this function's scope. No direct browser DELETE permissions were granted.

Transaction-only verification passed: non-admin denied, selected launch and legacy rows removed, repeat deletion returns zero, unselected row preserved. All temporary records were rolled back. The authenticated Safari production dashboard was checked through selection and the confirmation dialog, then cancelled; no real contact was deleted. Automated deletion tests and the production build passed. Deployment version: `3924ee55-fb52-45df-873d-2d42bb7758e3`. Concurrent contact-list work is preserved. Direct entry: `/admin/#audience`.
