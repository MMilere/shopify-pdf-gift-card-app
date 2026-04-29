# Meile Odai PDF dovanu kuponu app

Sita sistema skirta automatiskai sukurti Shopify dovanų kortele, sugeneruoti grazu PDF kupona ir issiusti ji pirkejui el. pastu, kai zmogus nusiperka dovanų kupono produkta Shopify parduotuveje.

## Trumpai

Veikianti grandine:

1. Pirkejas Shopify parduotuveje nusiperka produkta **Dovanų kuponas**.
2. Shopify issiuncia **Order payment** webhook i Render app.
3. App patikrina, ar uzsakyme yra dovanų kupono produktas.
4. App sukuria tikra Shopify **Gift card** per Admin API.
5. Shopify tik sukurimo momentu grazina pilna gift card koda.
6. App uzdeda koda, suma ir galiojimo data ant Canva PDF sablono.
7. App issiuncia PDF pirkejui el. pastu.
8. Kopija nueina i `meileodaieshop@gmail.com`.

## Kur kas yra

### Shopify

- Parduotuve: **Meile odai**
- Shopify store slug: `guodzius-dobilaite`
- Svetaine: `https://meileodai.lt`
- Dovanu kupono produktas: `Dovanų kuponas`
- Produkto Admin URL: `https://admin.shopify.com/store/guodzius-dobilaite/products/10775208427857`
- Produkto ID: `10775208427857`

### Shopify custom app

- App pavadinimas: **PDF dovanų kortelės**
- App URL: `https://shopify-pdf-gift-card-app.onrender.com`
- Webhook URL: `https://shopify-pdf-gift-card-app.onrender.com/webhooks/orders-paid`
- Reikalingi Admin API scopes:
  - `read_gift_cards`
  - `write_gift_cards`
  - `read_orders`

Pastaba: `write_customers` nenaudojam, nes automatiniame sraute gift card nepririsama prie Shopify customer. PDF vis tiek issiunciamas pirkejo el. pastu is uzsakymo.

### GitHub

- Repo: `MMilere/shopify-pdf-gift-card-app`
- Branch: `main`
- Failai keliami i GitHub per browser upload.
- Po pakeitimu Render pasiima nauja koda is GitHub ir padaro deploy.

### Render

- Service name: `shopify-pdf-gift-card-app`
- Primary URL: `https://shopify-pdf-gift-card-app.onrender.com`
- Runtime: Docker
- Dockerfile: `Dockerfile`
- Start command Docker viduje: `npm start`, kuris paleidzia `node src/server.js`

### El. pastas

- SMTP naudojamas per Hostinger pasta.
- Siuntejo pastas: `shop@meileodai.lt`
- Siuntejo vardas: `Meilė Odai`
- CC kopija: `meileodaieshop@gmail.com`

## Svarbiausi failai

```text
src/server.js
```

Pagrindinis app failas. Jame yra:

- admin forma rankiniam kupono sukurimui;
- webhook endpointas `/webhooks/orders-paid`;
- webhook test endpointas `/webhook-test`;
- logika, kuri gavus apmoketa uzsakyma sukuria gift card ir issiuncia PDF.

```text
src/order.js
```

Is Shopify order webhook istraukia dovanų kupono eilutes:

- patikrina produkto ID pagal `GIFT_CARD_PRODUCT_IDS`;
- paima suma is pasirinkto varianto kainos;
- paima pirkejo el. pasta;
- apskaiciuoja galiojimo data: 6 menesiai nuo pirkimo datos.

```text
src/shopify.js
```

Bendrauja su Shopify Admin API:

- gauna laikiną access token pagal `SHOPIFY_CLIENT_ID` ir `SHOPIFY_CLIENT_SECRET`;
- sukuria Shopify gift card;
- grazina pilna gift card koda tik sukurimo momentu.

```text
src/pdf.js
```

Sugeneruoja PDF:

- paima fona is `assets/gift-card-template.pdf`;
- uzdeda kintamus laukus:
  - kupono koda;
  - suma;
  - galiojimo data;
  - uzsakymo numeri, jei jis perduotas.

```text
src/email.js
```

Siuncia laiska per Hostinger SMTP:

- gavejas yra pirkejo el. pastas is Shopify order;
- CC eina i `meileodaieshop@gmail.com`;
- siuntejas rodomas kaip `Meilė Odai`;
- PDF prisegamas kaip `dovanu-kortele.pdf`.

```text
assets/gift-card-template.pdf
```

Canva eksportuotas A4 PDF sablonas. Tai yra grazus kupono fonas. Ant jo app uzdeda tik kintamus duomenis.

## Render environment variables

Render → service `shopify-pdf-gift-card-app` → **Environment** turi buti sudeti tokie laukai.

```env
APP_URL=https://shopify-pdf-gift-card-app.onrender.com
PORT=3000
ADMIN_PASSWORD=cia_yra_tavo_admin_slaptazodis

SHOPIFY_SHOP=guodzius-dobilaite.myshopify.com
SHOPIFY_CLIENT_ID=cia_yra_shopify_client_id
SHOPIFY_CLIENT_SECRET=cia_yra_shopify_secret
SHOPIFY_WEBHOOK_SECRET=cia_yra_shopify_webhook_secret
SHOPIFY_API_VERSION=2026-04

GIFT_CARD_PRODUCT_IDS=10775208427857
GIFT_CARD_VARIANT_IDS=

FROM_NAME=Meilė Odai
FROM_EMAIL=shop@meileodai.lt
EMAIL_CC=meileodaieshop@gmail.com

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=shop@meileodai.lt
SMTP_PASSWORD=cia_yra_hostinger_pasto_slaptazodis

BRAND_NAME=Meilė Odai
SHOP_URL=https://meileodai.lt
```

Svarbu: tikru slaptazodziu, Shopify secret ir SMTP password nedeti i GitHub. Jie turi buti tik Render Environment Variables.

## Shopify webhook nustatymas

Shopify Admin:

1. Eiti i **Settings**.
2. Eiti i **Notifications** arba **Webhooks** skilty.
3. Sukurti webhook.
4. Event: **Order payment**.
5. Format: **JSON**.
6. URL:

```text
https://shopify-pdf-gift-card-app.onrender.com/webhooks/orders-paid
```

7. Webhook API version: naudoti stabilia versija, pvz. `2026-04`.
8. Save.

Webhook secret, kuris rodomas Shopify Webhooks puslapyje prie teksto **Your webhooks will be signed with**, turi buti ir Render lauke:

```env
SHOPIFY_WEBHOOK_SECRET=...
```

Jeigu webhook secret nesutampa, Render loguose bus:

```text
Rejected Shopify webhook: invalid signature
```

## Dovanu kupono produkto nustatymas Shopify

Produktas gali tureti variantus pagal suma, pvz.:

- 10
- 20
- 30
- 50
- 75
- 100
- 150
- 200
- 250
- 300

Kai pirkejas pasirenka varianta, app ima butent to varianto kaina ir pagal ja sukuria gift card.

Render lauke `GIFT_CARD_PRODUCT_IDS` turi buti produkto ID:

```env
GIFT_CARD_PRODUCT_IDS=10775208427857
```

Jeigu sitas ID neteisingas, Render loguose bus:

```text
No matching gift card products in order
```

## Kupono galiojimas

Automatiskai sukurti kuponai galioja **6 menesius nuo pirkimo datos**.

Pavyzdys:

- pirkimo data: `2026-04-29`
- galiojimo data: `2026-10-29`

Galiojimo data irasoma ir i Shopify gift card, ir i PDF.

## PDF sablonas

PDF sablonas yra A4 dydzio ir sukurtas Canvoje.

Failas:

```text
assets/gift-card-template.pdf
```

Jeigu nori pakeisti dizaina:

1. Canvoje pakoreguoti kupona.
2. Eksportuoti kaip PDF.
3. Faila GitHub ikelti i:

```text
assets/gift-card-template.pdf
```

4. Jeigu keiciasi vietos, kur turi atsirasti kodas, suma ar data, reikia pataisyti koordinates faile:

```text
src/pdf.js
```

Lengviausias budas pataikyti koordinates: Canvoje i tuscia sablona ideti testinius tekstus:

```text
KODAS123456
50 EUR
2026-10-23
```

Tada eksportuoti PDF ir pagal ji galima tiksliai atnaujinti `src/pdf.js`.

## Kaip atnaujinti koda

Kadangi failai keliami ranka per GitHub:

1. Pasikeisti faila lokaliai arba gauti paruosta faila.
2. GitHub repo spausti **Add file → Upload files**.
3. Ikelti faila i teisinga vieta, pvz.:

```text
src/pdf.js
src/email.js
src/server.js
src/order.js
src/shopify.js
assets/gift-card-template.pdf
package.json
Dockerfile
README.md
```

4. Apacioje spausti **Commit changes**.
5. Render atidaryti service `shopify-pdf-gift-card-app`.
6. Spausti **Manual Deploy → Deploy latest commit**.

Kai deploy pavyksta, loguose turi buti:

```text
PDF gift card app listening on port 3000
Your service is live
```

## Kaip testuoti

### 1. Patikrinti ar app gyvas

Atidaryti:

```text
https://shopify-pdf-gift-card-app.onrender.com/webhook-test
```

Turi rodyti:

```text
Webhook test OK
```

Render loguose turi atsirasti:

```text
Webhook test endpoint opened
```

### 2. Patikrinti rankini sukurima

Atidaryti pagrindini app URL:

```text
https://shopify-pdf-gift-card-app.onrender.com
```

Ivesti admin slaptazodi, sukurti testini kupona ir paziureti, ar ateina laiskas su PDF.

### 3. Patikrinti automatini Shopify pirkima

1. Shopify parduotuveje nusipirkti testini `Dovanų kuponas` varianta, pvz. 1 EUR arba maza suma.
2. Render loguose turi atsirasti:

```text
Received paid order webhook
Creating PDF gift cards for paid order
```

3. Pasto dezuteje turi ateiti:
   - Shopify uzsakymo patvirtinimas;
   - atskiras laiskas su PDF dovanu kuponu.

## Dazniausios klaidos

### `No matching gift card products in order`

Render `GIFT_CARD_PRODUCT_IDS` neatitinka Shopify produkto ID.

Turi buti:

```env
GIFT_CARD_PRODUCT_IDS=10775208427857
```

Po pakeitimo reikia Render spausti **Save, rebuild, and deploy**.

### `Rejected Shopify webhook: invalid signature`

Nesutampa Shopify webhook secret ir Render `SHOPIFY_WEBHOOK_SECRET`.

Sprendimas: nukopijuoti secret is Shopify Webhooks puslapio i Render environment variable.

### `Missing SHOPIFY_CLIENT_SECRET`

Render nera ivestas `SHOPIFY_CLIENT_SECRET`.

Sprendimas: Shopify Dev Dashboard → app Settings → Credentials → nukopijuoti Secret i Render.

### `Cannot find package '@sendgrid/mail'`

Tai sena klaida is SendGrid versijos. Dabar naudojam Hostinger SMTP ir `nodemailer`.

Sprendimas: GitHub turi buti naujas `src/email.js` ir `package.json`, kuriame yra `nodemailer`.

### `Playwright was just updated`

Sena PDF generavimo klaida. Dabar PDF generuojamas su `pdf-lib`, bet Dockerfile vis dar gali naudoti Playwright image.

Jeigu kazkada vel atsirastu panasi klaida, reikia tikrinti `Dockerfile` ir `package.json` versijas.

### `WinAnsi cannot encode`

Buvo del lietuvisku raidziu PDF generavime. Dabar datos formatas PDF yra `YYYY-MM-DD`, todel si klaida neturetu kartotis.

### Render loguose matosi `SIGTERM`

Jeigu tai matosi deploy metu, dazniausiai tai normalu. Render sustabdo sena versija ir paleidzia nauja.

Svarbu ziureti, ar po to atsiranda:

```text
Your service is live
```

## Svarbus saugumas

GitHub repo yra public, todel i GitHub negalima kelti:

- Hostinger pasto slaptazodzio;
- Shopify Client Secret;
- Shopify webhook secret;
- admin slaptazodzio;
- SMTP password.

Visa tai turi buti tik Render Environment Variables.

## Kas jau padaryta

- Sukurtas Shopify custom app.
- Sukurtas GitHub repo.
- Sukurtas Render Docker web service.
- Pajungtas Hostinger SMTP.
- Pajungtas Shopify webhook `Order payment`.
- Nustatytas dovanu kupono produktas pagal ID `10775208427857`.
- Sukurtas Canva A4 PDF sablonas.
- App uzdeda ant PDF:
  - gift card koda;
  - suma;
  - galiojimo data.
- Kuponas galioja 6 menesius nuo pirkimo datos.
- Laiskas eina pirkejui.
- CC eina i `meileodaieshop@gmail.com`.
- Siuntejas rodomas kaip `Meilė Odai`, jei Render nustatytas `FROM_NAME=Meilė Odai`.

## Jei ateityje reikes pagalbos

Tikrinimo tvarka:

1. Ar Render service yra live?
2. Ar Render loguose ateina `Received paid order webhook`?
3. Ar `GIFT_CARD_PRODUCT_IDS` sutampa su Shopify produkto ID?
4. Ar Shopify Admin atsirado nauja gift card?
5. Ar laiskas nenuejo i Spam?
6. Ar SMTP prisijungimai Render aplinkoje vis dar teisingi?
7. Ar nebuvo pakeistas Canva PDF sablonas ir koordinates `src/pdf.js`?

