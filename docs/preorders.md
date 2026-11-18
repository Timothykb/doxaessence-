# Pre-order implementation — 30 October 2026

Prepared for review. Code and SEO correction deployed as Cloudflare version `d6aac98b-d601-4818-8e7e-53a1b84e259e`; production database migrations and launch switches were not changed. Public newsletter root verified HTTP 200 with title `Doxa Essence — The Genesis`, description without C1, and checkout config `ready:false`. The subsequent ivory scent-gallery blending adjustment is local only. Pre-order homepage is not activated.

Local review: http://127.0.0.1:5182/storefront/preorder/ (Vite development server). The local page deliberately keeps payment disabled when no configured backend is available. It does not simulate a successful purchase.

## Page and newsletter

`storefront/preorder/index.html` is the new pre-order homepage, with the existing burgundy/cream identity, product imagery, product description, three scent chapters, brand story, dispatch/payment/returns sections and one primary purchase path.

The newsletter remains available through a native modal dialog. It is offered once per browser tab after eight seconds if the visitor is not entering a form, and can also be opened using the newsletter buttons. Close button, Escape and “Not now” work; closing returns keyboard focus to the opener. Form uses existing consent validation, signup endpoint and automatic personal welcome. It does not subscribe purchasers automatically.

The scent copy uses the documented notes from `supabase/migrations/20261014_genesis_updated_notes.sql`: bergamot, pink pepper, cardamom; fig leaf, fig, iris, orange blossom; sandalwood, cedarwood, ambrette musk, soft amber and a touch of vanilla. No longevity/projection/manufacturing claims or unconfirmed size/concentration were introduced. Owner must confirm current scent copy before opening pre-orders. Existing CMS copy is retained where already saved; review its notes against this source before confirming. Existing images show packaging text and should be checked against final commercial product specifications.

New scent-description fields are editable in Website beheren. The homepage selector uses `home_mode=preorder` for this page and `collection` for the earlier full collection page. Private homepage preview now shows the pre-order page. The current public newsletter landing page stays in place while the full website remains unpublished. Product and checkout routes keep their existing live/private gates.

## Paid pre-order flow

Existing Mollie checkout, verified webhooks, durable order notifications and Resend sender are reused. No new payment credential is required by this implementation.

Buyer supplies first/last name, email, street and house number, Dutch postal code, city and country. Delivery is limited to the Netherlands, as in the existing checkout. A required checkbox states that payment is taken now and dispatch is expected later, with the expected dispatch date and cancellation/return information visible before payment. Phone numbers and newsletter consent are not required for purchase.

Price comes from the linked product in the database, not client input or website text. Allocation uses the existing stock/reservation mechanism: for pre-orders, the stock value represents the number the owner authorizes to sell ahead. It must therefore be set deliberately. Confirmed paid orders preserve dispatch date, product specification and return text independently of later settings changes. Both customer and merchant emails identify the purchase as a pre-order and include those snapshots. Order status and admin order details display the pre-order information.

An offer fingerprint links customer acknowledgement to the price/shipping/dispatch/specification/return information displayed at checkout. Changes require refreshing and reviewing the offer before a new reservation. Database row locks recheck those values to avoid a configuration change between validation and reservation. Repeated requests reuse the existing immutable session. Missing acknowledgement, incomplete settings, an old dispatch date, closed site or insufficient allocation fail before payment creation. A published pre-order homepage cannot accidentally offer regular-sale checkout mode.

Authenticated admin-only `/api/admin/preorder-preview` exposes draft commercial details for review even with checkout closed. Private checkout preview always disables payment. The public config does not reveal draft details when closed.

## Dashboard

Existing Producten manages price, allocation, product status and image. Website beheren adds:

- Sale mode: regular or pre-order.
- Expected dispatch-from date.
- Confirmed contents/concentration/what is supplied.
- Cancellation and return information.
- Owner confirmation that scent notes and product description were reviewed.

The existing shipping, notification-recipient and enable settings remain. Launch readiness reports incomplete pre-order information. Saving any of these settings does not publish the website.

## Validation performed

- Eleven automated test files passed, including new pre-order tests: required settings, valid/future dates, explicit acknowledgement, changed-offer rejection before reservation, server-authoritative amounts, closed-site gate, admin-only preview and sale-mode consistency.
- `pnpm build` passed, including the new homepage and admin controls.
- Isolated PostgreSQL via temporary PGlite outside the repository applied the real relevant migrations and ran `supabase/preorder-verification.sql`. Passed: missing acknowledgement rejected, regular-RPC bypass rejected, allocation reserved once, stale offer rejected without reservation, snapshots retained after settings changes, exactly two pre-order notification jobs, paid replay creates one order, cancellation releases allocation once, no anonymous creation permission. Transaction rollback leaves no order and no live checkout.
- Browser verified local page, mobile layout without horizontal overflow, modal open/close, Escape, focus return and empty-form validation. No signup or live payment was submitted during this UI review.
- The original Mollie sandbox purchase was previously verified before this change; a fresh hosted-provider sandbox pre-order should be completed after applying the new migration to the intended environment. This change has not been exercised against production Mollie or sent production pre-order confirmation emails.

Optional database test command (temporary test dependency only, not a production dependency):

```sh
PGLITE_MODULE_PATH=/tmp/doxa-preorder-dbcheck/node_modules/@electric-sql/pglite/dist/index.js node tests/preorder-database.mjs
```

## Required before publication

1. Confirm final product contents, volume and concentration; match imagery and scent text to the actual product.
2. Confirm the pre-order price, shipping cost (including whether free), and price/tax presentation. Last previously observed price was €89.99; this implementation does not change it.
3. Supply the expected dispatch-from date and authorized pre-order allocation.
4. Supply final cancellation and return information and confirm delivery is Netherlands-only, or request an explicitly scoped delivery expansion.
5. Apply `supabase/migrations/20261030_preorders.sql` to the intended database, then deploy the source as a reviewed release. Current migration defaults keep regular sale mode and existing live/enable states unchanged.
6. Configure pre-order mode, product active/allocation, shipping and the commercial details in admin; confirm the scent copy. Save the website draft with homepage=preorder. Run a fresh sandbox pre-order and verify both emails before opening paid public orders.
7. Publish the reviewed homepage and enable checkout only with user authorization. Neither action was performed here.

Core files: `storefront/preorder/index.html`, `src/preorder.js`, `src/preorder.css`, `shared/preorder.js`, `src/preorder-settings.js`, `worker/checkout-api.js`, `worker/admin-api.js`, `supabase/migrations/20261030_preorders.sql`, `tests/preorder.test.mjs`, `tests/preorder-database.mjs`.

## Latest visual review

Three generated scent scenes show LIGHT, LIFE and EARTH with the verified note text, accessible chapter controls, arrow-key navigation and horizontal swipe. Removed decorative crystal from EARTH. Hero liquid is lighter gold and label reads The Genesis without C1. Images use contain sizing to keep ingredients visible; ivory section, multiply blending and feathered masks remove hard photo edges. Browser confirmed all images load, chapter navigation reaches 03/03, mobile width 433px has no horizontal page overflow. Eleven test files, database rollback verification and production build passed. Commercial fields and production database migration plus hosted sandbox pre-order verification remain prerequisites before paid launch.
