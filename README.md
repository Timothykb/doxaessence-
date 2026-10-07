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

De homepage bevat een parfumcollectie als concept, productdetails, zoeken,
filters en een geurwijzer. Namen, noten en verpakkingen zijn voorlopige
voorbeelden. Er worden nog geen bestellingen of betalingen verwerkt.
De eigen conceptbeelden en gebruikte prompts staan in `docs/visual-assets.md`.

## Privétoegang

`worker/index.js` controleert de toegangscode op de server voordat de website
of statische bestanden worden geleverd (`run_worker_first`). Alleen de SHA-256
hash van de willekeurige code staat in de broncode. De code zelf staat lokaal
in het door Git genegeerde `.tools/access-code` en wordt aan de eigenaar verstrekt.
Een HttpOnly/Secure-cookie bewaart de toegang maximaal één dag in de browser.
De uitlogknop verwijdert deze cookie. Beschermde reacties krijgen `no-store`.
De GitHub-repository blijft zijn eigen ingestelde zichtbaarheid houden.

`pnpm dev` toont alleen de frontend lokaal. Gebruik `pnpm exec wrangler dev`
voor een volledige lokale preview met de toegangspoort. Geef in deze projectchat
aan welke pagina's, stijl of functies je wilt toevoegen; na een push naar `main`
publiceert Cloudflare de wijzigingen automatisch.
