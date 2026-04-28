const apiVersion = process.env.SHOPIFY_API_VERSION || "2026-04";
let cachedToken = null;
let tokenExpiresAt = 0;

export async function createGiftCard(input) {
  const query = `
    mutation GiftCardCreate($input: GiftCardCreateInput!) {
      giftCardCreate(input: $input) {
        giftCard {
          id
          expiresOn
        }
        giftCardCode
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      initialValue: String(input.amount),
      note: input.note,
      notify: false,
      recipientAttributes: input.recipientEmail
        ? {
            email: input.recipientEmail,
            name: input.recipientName || input.recipientEmail,
            message: input.message || "",
          }
        : undefined,
    },
  };

  if (input.customerId) {
    variables.input.customerId = input.customerId;
  }

  if (input.expiresOn) {
    variables.input.expiresOn = input.expiresOn;
  }

  const data = await shopifyGraphql(query, variables);
  const payload = data.giftCardCreate;

  if (payload.userErrors.length > 0) {
    throw new Error(payload.userErrors.map((error) => error.message).join("; "));
  }

  return {
    id: payload.giftCard.id,
    code: payload.giftCardCode,
    expiresOn: payload.giftCard.expiresOn,
  };
}

async function shopifyGraphql(query, variables) {
  const shop = normalizeShop(requiredEnv("SHOPIFY_SHOP"));
  const token = await getAccessToken(shop);
  const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();
  if (!response.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || json));
  }

  return json.data;
}

async function getAccessToken(shop) {
  const staticToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (staticToken && staticToken !== "temporary") return staticToken;

  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: requiredEnv("SHOPIFY_CLIENT_ID"),
      client_secret: requiredEnv("SHOPIFY_CLIENT_SECRET"),
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Shopify token request failed: ${JSON.stringify(json)}`);
  }

  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + Number(json.expires_in || 86400) * 1000;
  return cachedToken;
}

function normalizeShop(value) {
  const clean = String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  return clean.endsWith(".myshopify.com") ? clean : `${clean}.myshopify.com`;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
