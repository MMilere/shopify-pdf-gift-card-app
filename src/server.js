import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import { sendGiftCardEmail } from "./email.js";
import { extractGiftCardJobs } from "./order.js";
import { createGiftCard } from "./shopify.js";
import { renderGiftCardPdf } from "./pdf.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/webhook-test", (_req, res) => {
  console.log("Webhook test endpoint opened");
  res.status(200).send("Webhook test OK");
});

app.post(
  "/webhooks/orders-paid",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!isValidShopifyWebhook(req)) {
      console.error("Rejected Shopify webhook: invalid signature");
      res.status(401).send("Invalid webhook signature");
      return;
    }

    res.status(200).send("OK");

    const order = JSON.parse(req.body.toString("utf8"));
    try {
      console.log("Received paid order webhook", {
        orderId: order?.id,
        orderName: order?.name,
        email: order?.email,
        lineItems: (order?.line_items || []).map((item) => ({
          title: item.title,
          productId: item.product_id,
          variantId: item.variant_id,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      await handlePaidOrder(order);
    } catch (error) {
      console.error("Failed to process order", {
        orderId: order?.id,
        message: error.message,
        stack: error.stack,
      });
    }
  }
);

app.get("/login", (_req, res) => {
  res.type("html").send(loginPage());
});

app.post("/login", (req, res) => {
  if (req.body.password !== process.env.ADMIN_PASSWORD) {
    res.status(401).type("html").send(loginPage("Neteisingas slaptažodis"));
    return;
  }

  res.set("Set-Cookie", `gift_card_admin=${sessionValue()}; Path=/; HttpOnly; Secure; SameSite=None`);
  res.redirect("/");
});

app.use(requireAdminPassword);

app.get("/", (_req, res) => {
  res.type("html").send(adminForm());
});

app.post("/gift-cards/send", async (req, res) => {
  try {
    const result = await createAndSendGiftCard({
      amount: req.body.amount,
      currency: req.body.currency || "EUR",
      recipientEmail: req.body.recipientEmail,
      recipientName: req.body.recipientName,
      message: req.body.message,
      expiresOn: req.body.expiresOn,
      note: req.body.note || "Manual PDF gift card",
    });

    res.type("html").send(successPage(result));
  } catch (error) {
    console.error("Failed to create manual gift card", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).type("html").send(errorPage(error));
  }
});

async function handlePaidOrder(order) {
  const jobs = extractGiftCardJobs(order);
  if (jobs.length === 0) {
    console.log("No matching gift card products in order", {
      configuredProductIds: process.env.GIFT_CARD_PRODUCT_IDS || "",
      configuredVariantIds: process.env.GIFT_CARD_VARIANT_IDS || "",
    });
    return;
  }

  console.log("Creating PDF gift cards for paid order", {
    orderId: order?.id,
    orderName: order?.name,
    count: jobs.length,
  });

  for (const job of jobs) {
    await createAndSendGiftCard({
      amount: job.amount,
      currency: job.currency,
      customerId: null,
      recipientEmail: job.recipientEmail,
      recipientName: job.recipientName,
      message: job.message,
      expiresOn: job.expiresOn,
      note: `PDF gift card for order ${order.name || order.id}`,
    });
  }
}

async function createAndSendGiftCard(input) {
  const amount = required(input.amount, "Suma");
  const recipientEmail = required(input.recipientEmail, "Gavėjo el. paštas");
  const recipientName = required(input.recipientName, "Gavėjo vardas");
  const currency = input.currency || "EUR";
  const message = input.message || "Linkime malonaus apsipirkimo.";

  const giftCard = await createGiftCard({
    amount,
    currency,
    customerId: input.customerId || null,
    recipientEmail,
    recipientName,
    message,
    expiresOn: input.expiresOn,
    note: input.note,
  });

  const pdf = await renderGiftCardPdf({
    brandName: process.env.BRAND_NAME || "Jūsų parduotuvė",
    shopUrl: process.env.SHOP_URL || "",
    amount,
    currency,
    recipientName,
    message,
    code: giftCard.code,
    expiresOn: giftCard.expiresOn,
  });

  await sendGiftCardEmail({
    to: recipientEmail,
    recipientName,
    amount,
    currency,
    pdf,
  });

  return {
    id: giftCard.id,
    code: giftCard.code,
    lastCharacters: giftCard.code.slice(-4),
    recipientEmail,
    recipientName,
    amount,
    currency,
  };
}

function isValidShopifyWebhook(req) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  const hmac = req.get("X-Shopify-Hmac-Sha256");
  if (!secret || !hmac) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

function requireAdminPassword(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(500).send("Missing ADMIN_PASSWORD");
    return;
  }

  if (hasValidSession(req)) {
    next();
    return;
  }

  res.redirect("/login");
}

function required(value, label) {
  const clean = String(value || "").trim();
  if (!clean) throw new Error(`${label} yra privalomas laukas`);
  return clean;
}

function adminForm() {
  return layout(`
    <section class="panel">
      <h1>Sukurti PDF dovanų kortelę</h1>
      <p>App sukurs Shopify gift card, paims pilną kodą sukūrimo momentu ir išsiųs PDF gavėjui.</p>
      <p>Automatiniam siuntimui Shopify webhook URL: <strong>${escapeHtml(webhookUrl())}</strong></p>
      <form method="post" action="/gift-cards/send">
        <label>
          Gavėjo vardas
          <input name="recipientName" required autocomplete="name">
        </label>
        <label>
          Gavėjo el. paštas
          <input name="recipientEmail" type="email" required autocomplete="email">
        </label>
        <div class="grid">
          <label>
            Suma
            <input name="amount" type="number" min="1" step="0.01" required value="50">
          </label>
          <label>
            Valiuta
            <input name="currency" required value="EUR" maxlength="6">
          </label>
        </div>
        <label>
          Galioja iki
          <input name="expiresOn" type="date">
        </label>
        <label>
          Žinutė
          <textarea name="message" rows="4">Linkime malonaus apsipirkimo.</textarea>
        </label>
        <label>
          Vidinė pastaba
          <input name="note" value="Manual PDF gift card">
        </label>
        <button type="submit">Sukurti ir išsiųsti PDF</button>
      </form>
    </section>
  `);
}

function webhookUrl() {
  const appUrl = String(process.env.APP_URL || "https://shopify-pdf-gift-card-app.onrender.com").replace(/\/$/, "");
  return `${appUrl}/webhooks/orders-paid`;
}

function loginPage(error = "") {
  return layout(`
    <section class="panel">
      <h1>Prisijungimas</h1>
      <p>Įveskite šio PDF dovanų kortelių app slaptažodį.</p>
      ${error ? `<p class="error-text">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/login">
        <label>
          Slaptažodis
          <input name="password" type="password" required autocomplete="current-password">
        </label>
        <button type="submit">Prisijungti</button>
      </form>
    </section>
  `);
}

function successPage(result) {
  return layout(`
    <section class="panel success">
      <h1>Dovanų kortelė išsiųsta</h1>
      <p>PDF išsiųstas adresu <strong>${escapeHtml(result.recipientEmail)}</strong>.</p>
      <dl>
        <dt>Suma</dt>
        <dd>${escapeHtml(result.amount)} ${escapeHtml(result.currency)}</dd>
        <dt>Gavėjas</dt>
        <dd>${escapeHtml(result.recipientName)}</dd>
        <dt>Kodo pabaiga</dt>
        <dd>${escapeHtml(result.lastCharacters)}</dd>
      </dl>
      <a class="button" href="/">Sukurti kitą</a>
    </section>
  `);
}

function errorPage(error) {
  return layout(`
    <section class="panel error">
      <h1>Nepavyko sukurti kortelės</h1>
      <p>${escapeHtml(error.message)}</p>
      <a class="button" href="/">Grįžti</a>
    </section>
  `);
}

function layout(content) {
  return `<!doctype html>
    <html lang="lt">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>PDF dovanų kortelės</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            background: #ece8e0;
            color: #21201e;
            font-family: Inter, Arial, sans-serif;
          }
          .panel {
            width: min(100%, 620px);
            border: 1px solid #d9d2c6;
            border-radius: 8px;
            background: #fffdf8;
            padding: 24px;
            box-shadow: 0 18px 60px rgba(22, 21, 18, 0.14);
          }
          h1 {
            margin: 0 0 8px;
            font-size: 28px;
            line-height: 1.15;
          }
          p {
            margin: 0 0 18px;
            color: #68635d;
            line-height: 1.45;
          }
          form,
          label {
            display: grid;
            gap: 8px;
          }
          form {
            gap: 14px;
          }
          label {
            color: #68635d;
            font-size: 13px;
            font-weight: 700;
          }
          input,
          textarea {
            width: 100%;
            border: 1px solid #cfc7bb;
            border-radius: 6px;
            padding: 11px 12px;
            color: #21201e;
            font: inherit;
          }
          input:focus,
          textarea:focus {
            outline: none;
            border-color: #4f7c65;
            box-shadow: 0 0 0 3px rgba(79, 124, 101, 0.18);
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          button,
          .button {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            min-height: 44px;
            border: 1px solid #4f7c65;
            border-radius: 6px;
            background: #4f7c65;
            color: #ffffff;
            padding: 10px 14px;
            font: inherit;
            font-weight: 800;
            text-decoration: none;
            cursor: pointer;
          }
          dl {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 8px 12px;
            margin: 18px 0;
          }
          dt {
            color: #68635d;
            font-weight: 700;
          }
          dd {
            margin: 0;
          }
          .error h1 {
            color: #8d2f2f;
          }
          .error-text {
            color: #8d2f2f;
            font-weight: 700;
          }
          @media (max-width: 520px) {
            .grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>${content}</body>
    </html>`;
}

function hasValidSession(req) {
  const cookie = req.get("cookie") || "";
  return cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return name === "gift_card_admin" && value === sessionValue();
  });
}

function sessionValue() {
  return crypto.createHash("sha256").update(process.env.ADMIN_PASSWORD || "").digest("hex");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.listen(port, () => {
  console.log(`PDF gift card app listening on port ${port}`);
});
