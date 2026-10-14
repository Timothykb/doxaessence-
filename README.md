# Doxa Essence

Websitebasis met Vite, Supabase en Cloudflare Workers Static Assets.

## Ontwikkelen

```sh
pnpm install
pnpm dev
pnpm build
```

## Koppelingen

- GitHub: https://github.com/Timothykb/doxaessence-
- Cloudflare Worker: `doxaessence`
- Website: https://doxaessence.timothykboona.workers.dev
- Supabase-project: `xjdvjdctwdswkcnpqqni`

Cloudflare Workers Builds volgt `main` en voert `npx wrangler deploy` uit.
Wrangler bouwt automatisch de website met `pnpm build` en publiceert `dist`.
De Supabase-client staat in `src/supabase.js`. De publishable key is openbaar
en geschikt voor browsergebruik; gebruik nooit een secret/service-role key in
de website. Nieuwe databasetabellen moeten Row Level Security en passende
policies krijgen voordat de website ze gebruikt.

De homepage presenteert C1 — The Genesis, het merkverhaal en de geurnoten
LIGHT, LIFE en EARTH. De huisstijl gebruikt #590000 en het originele logo.
De productfoto is een stilstaand beeld uit de aangeleverde productfilm; de
film kan op de Genesis-sectie worden afgespeeld. Er worden nog geen
bestellingen of betalingen verwerkt. Zie `docs/visual-assets.md`.

## Privétoegang

`worker/index.js` controleert de toegangscode op de server voordat de website
of statische bestanden worden geleverd (`run_worker_first`). Alleen de SHA-256
hash van de willekeurige code staat in de broncode. De code zelf staat lokaal
in het door Git genegeerde `.tools/access-code` en wordt aan de eigenaar verstrekt.
Een HttpOnly/Secure-cookie bewaart de toegang maximaal één dag in de browser.
Alleen het merklogo is openbaar zodat het op de toegangspoort zichtbaar is.
De uitlogknop verwijdert deze cookie. Beschermde reacties krijgen `no-store`.
De GitHub-repository blijft zijn eigen ingestelde zichtbaarheid houden.

`pnpm dev` toont alleen de frontend lokaal. Gebruik `pnpm exec wrangler dev`
voor een volledige lokale preview met de toegangspoort. Geef in deze projectchat
aan welke pagina's, stijl of functies je wilt toevoegen; na een push naar `main`
publiceert Cloudflare de wijzigingen automatisch.


## Supabase content
De tabel `public.scent_layers` bevat de drie Genesis-geurlagen. De website leest
deze eenmaal per paginabezoek en gebruikt de inhoud voor de tabs en het
notenoverzicht. Bij fouten of na vijf seconden blijft de lokale tekst zichtbaar.
Bewerk de teksten als projecteigenaar in Supabase Table Editor.
Bezoekers hebben alleen SELECT-rechten, afgedwongen met RLS; geen schrijfrechten.
Het schema en de startinhoud staan in `supabase/migrations/20261014_genesis_scent_layers.sql`.
Dit is echte contentlevering, geen periodieke keepalive. Bij weinig bezoekers kan
het gratis Supabase-project alsnog automatisch pauzeren.

## Product presentation
The supplied packshot is `public/images/genesis-packshot.png`. The isolated bottle
is `public/images/genesis-bottle.png`, made with the built-in imagegen tool.
Prompt: Extract only the perfume bottle, remove box and background, use genuine
transparency, preserve cap, glass, proportions, label text and colors.
The scent section cycles top/heart/base every 6.5 seconds while visible, with a
pause control, manual tabs, keyboard support and reduced-motion support.
Updated scent content: `supabase/migrations/20261014_genesis_updated_notes.sql`.

## Community
`/community/` has a testimonial/review form and a paginated approved-story feed.
No fictional customer reviews are seeded. Empty-state cards are writing prompts.
Apply `supabase/migrations/20261014_community_stories.sql` to initialize storage.
Visitors can insert only name, kind, body, rating and consent. Status defaults to
`pending`; RLS exposes only `approved` rows. Visitors cannot approve, edit or delete.

Moderation: open Supabase → Table Editor → `community_stories`, filter `status =
pending`, read the submission, then set status to `approved` to publish or `rejected`
to withhold. Never publish the record named `Doxa systeemtest` (integration test).
Only publish appropriate submissions; check personal information and consent.
The form explains publication and gives info@doxaessence.com for removal requests.
The existing private website access gate still applies to this page. Public read
access to approved stories is intentional; pending submissions remain private.
