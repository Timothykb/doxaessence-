# Doxa Essence — websiteconcept

## 1. Creatief concept
**Van het eerste licht, via de aarde, naar het leven.** De site opent als een parfumcampagne. De flacon staat in een bordeauxrode ruimte en wordt door een lichtbundel onthuld (De Magiër: het onzichtbare voelbaar maken). Eén verstuiving wordt nevel. Die nevel verzamelt zich tot de woorden LIGHT · EARTH · LIFE, en die drie woorden vormen daarna de structuur van de hele geurreis. De krant uit de campagne komt terug als redactioneel detail in de community en bij de oprichter.

## 2. Sitemap en klantreis
| Pagina | Doel | Volgende stap |
| --- | --- | --- |
| Home | Verwondering, productherkenning, geur verkennen | Pre-order, of verdieping in The Genesis |
| The Genesis | Beoordelen of de geur past; alle noten en praktische vragen | Pre-order |
| Pre-order (prototype) | Besteloverzicht en voorwaarden vóór betaling | Pre-order plaatsen (zodra betaling gekoppeld is) |
| Bevestiging (voorbeeld) | Samenvatting en volgende stap | Ons verhaal / Community |
| Ons verhaal | Betekenis en vertrouwen | The Genesis |
| Over mij | De persoon achter het merk | Ons verhaal / The Genesis |
| Community | Betrokkenheid, campagne, verhalen | Nieuwsbrief, Instagram/TikTok, eigen verhaal delen |

De knop Pre-order — € 89,95 staat op elke pagina in de header.

## 3. Visueel systeem
- **Kleuren:** bordeaux `#590000`, ivoor `#F3EFE7`, zwart `#000`, aards bruin `#5B3F18`. Als ondersteuning: zandsteen `#C9B391`, gedempt olijf `#6D6B45` en amber `#C27A2C`. Dit zijn artistieke verwijzingen, geen historisch vastgestelde kleuren.
- **Typografie:** Cormorant Garamond voor titels en het etiket, Manrope voor lopende tekst en bediening. Beide fonts zitten zelf in de site (geen externe fontserver).
- **Logo:** het originele logo, transparant gemaakt (`public/brand/doxa-logo-mask.png`) en als CSS-mask gebruikt. Zo werkt het zowel op ivoor als op bordeaux.
- **Beweging:** 150–250 ms voor interacties en 400–1100 ms voor reveals. De meeste intensiteit gaat naar de hero en de geurhoofdstukken. Er draaien geen eindeloze loops, en alle scrolleffecten stoppen zodra het scrollen stopt.

## 4. Storyboard 3D-hero (realtime WebGL)
Beschrijving van de scrollvoortgang (desktop ≈ 3,4 schermhoogtes, mobiel ≈ 2,6):

| Voortgang | Moment | Wat er gebeurt |
| --- | --- | --- |
| Laden | 01 Het eerste licht | Je eigen productfoto is de flacon. Een lichtbundel en warm tegenlicht onthullen hem in ±1,8 s. Titel, prijs en knoppen verschijnen kort na elkaar. |
| 0–0,38 | 02 Ontdekking | De camera komt iets dichterbij en er glijdt een lichtstreep over glas, etiket en dop. De flacon zelf draait niet: een foto heeft maar één aanzicht. Voor echte rotatie is een 360°-fotoreeks of een 3D-model van de flacon nodig. |
| 0,40–0,58 | Dop | De dop wordt uit de foto gesneden, komt los, gaat omhoog en beweegt rustig opzij. Daaronder verschijnt de verstuiver op de gefotografeerde kraag. Dit is het enige gemodelleerde onderdeel, omdat het op de foto onder de dop zit. |
| ≥ 0,60 | 03 De verstuiving | Het pompje gaat 90 ms omlaag en daarna 75 ms vertraging. Dan volgt één uitstoot van 170 ms: ±6.500 druppels in verschillende groottes met een smalle oorsprong. Ze starten snel, worden afgeremd door luchtweerstand, wervelen licht en verdunnen. Tegenlicht laat ze oplichten. Afspelen gebeurt één keer en op tijd, niet gekoppeld aan scroll, dus nooit achteruit de nozzle in. De knop “Bekijk de verstuiving” speelt de spray opnieuw af. |
| 0,68–0,93 | 04 Het verhaal | Fijne gouden deeltjes trekken uit de nevelwolk en vormen LIGHT · EARTH · LIFE. Dit is scrollgekoppeld en dus omkeerbaar, maar de deeltjes gaan nooit terug naar de nozzle. |
| Vanaf 0,5 | Productbalk | Naam, inhoud, pre-orderknop en herhaalknop blijven zichtbaar. |

Referentievideo: de verstuiving waaiert zijwaarts uit en lost op tot de merknaam. Wat ik heb verbeterd: een fijnere, minder glinsterende nevel, een zichtbare druk op het pompje met vertraging, verdunning in plaats van een constante wolk, en een overgang naar de drie geurhoofdstukken.

Fallbacks: bij verminderde beweging, zonder WebGL of bij een fout blijft de statische productfoto staan, zonder vastgezette scrollsectie. De scène pauzeert buiten beeld en in een verborgen tab. Mobiel gebruikt een lagere resolutie en minder deeltjes. Flacon en dop zijn de aangeleverde foto. Verstuiver, licht, nevel en woorden worden realtime in WebGL gerenderd. Er wordt geen video gebruikt.

## 5. Geurnoten (bron: aangeleverde tabel)
- **Top — LIGHT:** Bergamot · Een vleugje roze peper
- **Hart — EARTH:** Groene kardemom · Kasjmierachtige houtakkoorden · Een vleugje iris · Subtiele wierook
- **Basis — LIFE:** Romig sandelhout · Warme amber · Iso E Super · Subtiele vanille

De PDF “Alle geurnoten” noemt “Iriswortel”, de tabel “Een vleugje iris”. De site volgt de tabel. De afbeeldingen in die PDF komen van externe websites en worden niet gebruikt.

## 6. Ontbrekende gegevens, assets en integraties
**Commercieel (verplicht vóór echte verkoop)**
- Betaalmoment, verwachte verzendperiode, verzendkosten en verzendlanden
- Annulerings- en retourvoorwaarden, inclusief herroepingsrecht
- Of prijzen inclusief btw zijn, plus bedrijfsgegevens (KvK, btw-nummer, adres), algemene voorwaarden en privacyverklaring
- Een betaal-/webshopintegratie (bijvoorbeeld Shopify, Mollie of Stripe). Tot die er is, blijft de pre-orderknop uitgeschakeld en is de bevestigingspagina alleen een voorbeeld.

**Content**
- Over mij: naam, korte introductie, een persoonlijk moment en de betekenis van Genesis (gemarkeerd met invulvelden)
- Beschrijving van de bevestigde verpakking
- Updates over productie en levering voor de communitytijdlijn

**Technisch**
- Supabase-migratie `20261117_newsletter_subscribers.sql` toepassen, inclusief een privacyverklaring en een afmeldproces
- Een productfoto in hogere resolutie (de huidige is 546 × 1208 px) voor een scherpere hero op grote schermen. Een foto zonder dop, waarop de echte verstuiver te zien is, kan het gemodelleerde exemplaar vervangen. Optioneel: een 360°-reeks of 3D-model voor echte rotatie.
- Openbare lancering: de toegangspoort in `worker/index.js` uitzetten wanneer de site live moet
