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

Paginastructuur (multi-page Vite, gedeelde header/footer/nieuwsbrief in `partials/`):

| Pad | Doel |
| --- | --- |
| `/` | 3D-hero, introductie, geurreis LIGHT → EARTH → LIFE, product, ontstaan, oprichter, community, nieuwsbrief, pre-order |
| `/the-genesis/` | Productpagina met alle geurnoten, inspiratie en praktische vragen |
| `/pre-order/` | Pre-order **prototype**: besteloverzicht, geen betaling, geen gesimuleerde aankoop |
| `/pre-order/bevestiging/` | Voorbeeld van de bevestigingspagina (duidelijk gelabeld) |
| `/ons-verhaal/` | Merkverhaal met scrollgekoppelde tekstmarkering |
| `/over-mij/` | Oprichterspagina (ik-vorm, invulplaatsen voor biografie) |
| `/community/` | Campagne, achter de schermen en gemodereerde verhalen |

Concept, storyboard en de lijst met ontbrekende gegevens: `docs/website-concept.md`.
Er worden nog geen bestellingen of betalingen verwerkt.

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
De geurnoten staan sinds de nieuwe opbouw (LIGHT top, EARTH hart, LIFE basis) als
vaste tekst in de HTML. De oude tabel `public.scent_layers` bevat nog de vorige
noten en wordt niet meer gelezen.

Nieuwsbrief: het formulier (voornaam, e-mail, toestemming) roept
`subscribe_doxa_newsletter` aan en schrijft naar de bestaande lijst
`doxa_launch_list`. Daardoor gaat ook de bestaande welkomstmail mee. Dubbele
adressen worden genegeerd, en wie zich eerder afmeldde wordt opnieuw actief.
Succes verschijnt pas als de database de inschrijving bevestigt. Elke inschrijving
heeft een `unsubscribe_token`. De welkomstmail krijgt automatisch de link
`https://doxaessence.com/afmelden?token=…` (of vult `{{unsubscribe_url}}` in het
sjabloon). De Worker serveert `/afmelden` publiek, ook achter de toegangspoort,
en meldt pas af na een klik op de knop. Afgemelde adressen krijgen geen
welkomstmail meer. Zie `supabase/migrations/20261117_launch_list_newsletter.sql`
(toegepast op 17-11-2026).

Pre-order: betaling direct bij bestellen, € 7,00 verzendkosten (alleen
Nederland), prijzen inclusief btw, verwachte verzending januari 2027. Betalen
blijft uitgeschakeld tot de annulerings- en retourvoorwaarden er zijn.

## 3D-hero
`src/hero3d.js` (three.js, WebGL) gebruikt de aangeleverde productfoto als flacon.
De dop wordt uit die foto gesneden en apart geanimeerd. Alleen de verstuiver onder de
dop is gemodelleerd. Daarbij komen de nevel en de woorden LIGHT · EARTH · LIFE. Het wordt pas na de eerste weergave geladen; tot dan, en bij
`prefers-reduced-motion` of zonder WebGL, toont de hero de productfoto
`public/images/genesis-n1-bordeaux.webp`. Copy en pre-orderknop staan altijd in de HTML.

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
