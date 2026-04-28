# Shopify PDF dovanų kortelių admin app

Šis app skirtas paprastam rankiniam srautui:

1. atidarote app puslapį,
2. įvedate sumą, gavėją ir žinutę,
3. app sukuria tikrą Shopify gift card,
4. app gauna pilną kodą tik sukūrimo momentu,
5. app sugeneruoja gražų PDF,
6. app išsiunčia PDF gavėjui el. paštu per SendGrid.

Webhook srautas taip pat paliktas kode kaip papildoma galimybė ateičiai, bet pagrindinis naudojimas dabar yra forma adresu `/`.

## Kodėl reikia app

Shopify po gift card sukūrimo pilno kodo nebegrąžina, rodo tik paskutinius 4 simbolius. Todėl PDF su pilnu kodu reikia generuoti iš karto tada, kai app pati sukuria gift card per Shopify API.

## Ko reikia

- Shopify custom app su Admin API prieiga
- Shopify `write_gift_cards` scope
- SendGrid paskyra ir API raktas
- Viešai pasiekiamas app URL, pvz. Render, Fly.io, Railway arba kitas hostingas
- Admin formos slaptažodis `ADMIN_PASSWORD`

Pastaba: Shopify gali prašyti kreiptis į Shopify Support dėl `write_gift_cards` / `read_gift_cards` scope.

## Shopify nustatymai

1. Shopify Admin atidarykite **Settings → Apps and sales channels → Develop apps**.
2. Sukurkite custom app.
3. Admin API scopes:
   - `write_gift_cards`
   - `read_gift_cards`, jei Shopify prašo
   - `write_customers`, jei vėliau norėsite pririšti gift card prie kliento
4. Įdiekite app į parduotuvę.
5. Nukopijuokite Admin API access token į `.env` lauką `SHOPIFY_ADMIN_ACCESS_TOKEN`.

## Paleidimas lokaliai

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm start
```

Tada atidarykite:

```text
http://localhost:3000
```

## `.env` pavyzdys

```env
APP_URL=https://your-app.example.com
PORT=3000
ADMIN_PASSWORD=change-this-password

SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx
SHOPIFY_API_VERSION=2026-04

FROM_EMAIL=gifts@yourdomain.com
SENDGRID_API_KEY=SG.xxx

BRAND_NAME=Jūsų parduotuvė
SHOP_URL=https://your-store.com
```

`SHOPIFY_WEBHOOK_SECRET`, `GIFT_CARD_PRODUCT_IDS` ir `GIFT_CARD_VARIANT_IDS` reikalingi tik tada, jei norėsite naudoti automatinį `orders/paid` webhook srautą.

## Kaip naudoti

1. Atidarykite app puslapį.
2. Įveskite gavėjo vardą, el. paštą, sumą ir valiutą.
3. Jei reikia, pasirinkite galiojimo datą.
4. Įrašykite žinutę.
5. Spauskite **Sukurti ir išsiųsti PDF**.

App nerodo pilno kodo sėkmės lange. Rodomi tik paskutiniai 4 simboliai, nes pilnas kodas yra jautri mokėjimo informacija ir yra PDF faile, išsiųstame gavėjui.

## Shopify Dev Dashboard veiksmai

Kol neturite tikro hostingo URL, Shopify lauke **App URL** palikite laikiną reikšmę ir nespauskite **Release**.

Kai app bus įkeltas į hostingą:

1. Nukopijuokite viešą app adresą, pvz. `https://pdf-gift-cards.example.com`.
2. Shopify Dev Dashboard lauke **App URL** įrašykite tą adresą.
3. Patikrinkite, kad scopes yra `read_gift_cards,write_gift_cards`.
4. Spauskite **Release**.
5. Tada Shopify leis sugeneruoti / naudoti app credentials.

## Hostingas

Repo turi `Dockerfile`, todėl patogiausia deployinti į hostingą, kuris palaiko Docker.

Reikalingi environment variables hostinge:

```env
APP_URL=https://your-public-app-url
PORT=3000
ADMIN_PASSWORD=strong-private-password
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx
SHOPIFY_API_VERSION=2026-04
FROM_EMAIL=gifts@yourdomain.com
SENDGRID_API_KEY=SG.xxx
BRAND_NAME=Jūsų parduotuvė
SHOP_URL=https://your-store.com
```

## Svarbūs production papildymai

Prieš naudojant su tikrais klientais verta pridėti:

- duomenų bazę išsiųstoms kortelėms ir persiuntimams;
- testinį režimą;
- gražesnį laiško šabloną;
- klaidų pranešimus į el. paštą arba Slack.
