# Website behind the newsletter page

The full website is implemented in `storefront/index.html`, with wine/cream styling, the supplied Genesis packshot, one perfume, scent composition, brand story, a replaceable Timothy story and contact details. English public copy; Studio is being translated to Dutch by the coordinating chat.

## Database state — 28 October 2026

Applied `supabase/migrations/20261028_site_content.sql` through the existing Supabase SQL Editor session. Result confirmed: `live=false`, `draft={}`. Seeded C1 — The Genesis with SKU DOXA-C1-GENESIS as a draft, stock 0, price 0 (unknown, not a free product). Timothy must supply actual details before activation. Existing products are preserved on SKU conflict.

`doxa_site` is admin-only with RLS. `get_doxa_live_site` returns null while private and only the published snapshot when live. Saving a draft does not alter published content. `publish_doxa_site` checks the verified administrator. No customer data is published by these functions.

## Owner workflow

In `/admin/#website`, edit copy, save draft, then open private preview. The preview button saves first and exchanges the existing admin access token for a Secure, HttpOnly, SameSite=Strict cookie scoped to /preview, valid for up to one hour and rechecked against Supabase on every page request. Supabase's actual access-token expiry can shorten this period. Preview content reads the admin-only draft using the signed-in Supabase session. Sign in again and reopen from Studio if it expires.

Publishing saves the current fields and publishes the snapshot after an explicit confirmation dialog. The newsletter-only button hides the full website again. Keep private until Timothy supplies his personal story and product details.

Worker routes `/` to the full website only when the database confirms live. Database outages fall back to the newsletter page. Direct `/storefront` requests are denied, including encoded aliases. Preview responses use no-store and noindex. Vite development mode intentionally allows the local `/storefront/` design preview; it is not the security boundary. Test/deploy with the Worker for production access behavior.

## Verification / release coordination

Production build passed. Worker tests cover private default, raw route blocking, authenticated preview, cross-origin preview rejection, secure cookie, launch routing, and database failure. Existing admin/deletion/email tests passed at the integration checkpoint. Local browser screenshots confirmed layout and supplied assets at desktop/tablet and mobile width; DOM measurement found no horizontal overflow. Authenticated Studio save/publish interaction still needs verification.

No deployment was started by this chat. The coordinating admin/mail/PostNL chat requested ownership of the combined deployment. Its work touches shared admin and worker files; preserve all changes. PostNL label creation and automatic track-and-trace email belong to that integration, and have not been implemented or sent by this website change.

## Product page and full content editing

Added `storefront/genesis/index.html`, served publicly at `/products/the-genesis/` only when live and privately at `/preview/products/the-genesis/`. Local Vite preview is `/storefront/genesis/`. The navigation and both discovery buttons link to this page; breadcrumb/logo/story/contact links return to the correct home in each mode. The page reuses the same CMS product name, description, details, scent notes and images, with additional editable product story and FAQ. Online checkout is still not connected; the product CTA opens email.

Studio fields now include all visible public copy on the new home/product pages (navigation, CTAs, headings, footer, contact email) and the three image slots (logo, hero/packshot, bottle), plus descriptive alternative text. Image replacement accepts a public HTTPS image URL or existing local asset path and displays a preview. This is URL-based image replacement; no file-upload/storage service was added. The Worker image CSP allows HTTPS images. Existing saved drafts remain compatible through default field merging; no new schema migration is required. Both pages retain draft/save/preview/publish behavior.

Build and all four test files passed at the update checkpoint. Additional Worker checks cover product requests while private, protected product preview, denied raw asset route and live product routing. Browser click-through from home to product page verified the correct local route and rendered product content.

## Private production release — 28 October 2026

User explicitly requested online deployment with the new website still inaccessible to visitors. Deployed Cloudflare Worker version `b97a3ac1-4824-4b6e-828f-4372a4e125bc` to doxaessence.com, www.doxaessence.com and the existing workers.dev hostname. No public launch switch was enabled.

Verified on both custom domains: public home contains the newsletter signup; product and raw/encoded storefront paths return 404; both private preview routes redirect anonymous visitors to `/admin/#website`; public content API returns 404 while private; updated admin and image editor assets are online. All four local test files and production build pass. Owner opens Studio → Website → Save & private preview to see the deployed site after sign-in.

## Product presentation and checkout draft — 28 October 2026

Used the supplied Hermès product page as a structural reference for a generous gallery, adjacent product/purchase panel and expandable delivery/return sections, keeping Doxa assets, wine/cream styling and existing perfume copy. There is only one product. Added an editable displayed size and price (both explicitly unconfirmed), quantity 1–5, and a checkout link carrying only quantity in the URL.

The checkout draft has contact/address fields, delivery/payment placeholders and a single-product summary. No form submission, persistence, payment collection, real order, invented price or shipping promise is implemented. The payment button is disabled and the page explicitly says it is a preview. New public copy is included in the existing CMS fields. `/checkout/` follows the same private/live gate as the product; `/preview/checkout/` requires the admin preview session. Direct internal checkout files remain blocked under /storefront.

Five test files and the production build pass. Added checkout gate/routing assertions. Browser visual QA was unavailable for this update because the browser tool rejected the local-tab action under its URL policy; no alternate browser route was attempted.


### Search favicon — 30 October 2026
Owner-supplied `juiste.png` copied unchanged (500×500 PNG) to `/brand/doxa-search-logo.png`. Root, storefront, admin and supporting HTML declare it as `rel=icon` and `apple-touch-icon`. Stable crawlable URL; Google chooses when and whether to refresh its search-result icon. No storefront launch or payment switches changed.


### Newsletter readability
Scoped typography adjustments to `body.newsletter-page` preserve original font families. Modest increases to headings, intro, labels, inputs, consent, button, privacy and footer. Local browser checked desktop and 390px mobile: no horizontal overflow, labels 14px, inputs 17px, mobile heading 46px. Header logo remains centred. No signup or payment was submitted for this visual change.
