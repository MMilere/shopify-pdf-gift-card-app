import nodemailer from "nodemailer";

export async function sendGiftCardEmail(message) {
  const transporter = nodemailer.createTransport({
    host: requiredEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: requiredEnv("SMTP_USER"),
      pass: requiredEnv("SMTP_PASSWORD"),
    },
  });

  const cc = String(process.env.EMAIL_CC || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  await transporter.sendMail({
    to: message.to,
    cc,
    from: requiredEnv("FROM_EMAIL"),
    subject: `Jūsų „Meilė Odai“ dovanų kuponas – ${formatAmount(message.amount, message.currency)}`,
    text: plainText(message),
    html: html(message),
    attachments: [
      {
        filename: "dovanu-kortele.pdf",
        content: message.pdf,
        contentType: "application/pdf",
      },
    ],
  });
}

function plainText(message) {
  const amount = formatAmount(message.amount, message.currency);
  return `Sveiki,

dėkojame, kad pasirinkote „Meilė Odai“ dovanų kuponą.

Prisegame Jūsų dovanų kuponą, kurio vertė – ${amount}.
Kuponą galima panaudoti elektroninėje parduotuvėje www.meileodai.lt arba „Meilė Odai“ estetikos namuose Šilalėje.

Dovanų kuponą rasite prisegtuke.

Jeigu turite klausimų, mielai į juos atsakysime.

Gražios dienos,
Meilė Odai komanda`;
}

function html(message) {
  const amount = formatAmount(message.amount, message.currency);
  return `
    <p>Sveiki,</p>
    <p>dėkojame, kad pasirinkote „Meilė Odai“ dovanų kuponą.</p>
    <p>Prisegame Jūsų dovanų kuponą, kurio vertė – <strong>${escapeHtml(amount)}</strong>.<br>
    Kuponą galima panaudoti elektroninėje parduotuvėje <a href="https://www.meileodai.lt">www.meileodai.lt</a> arba „Meilė Odai“ estetikos namuose Šilalėje.</p>
    <p>Dovanų kuponą rasite prisegtuke.</p>
    <p>Jeigu turite klausimų, mielai į juos atsakysime.</p>
    <p>Gražios dienos,<br>Meilė Odai komanda</p>
  `;
}

function formatAmount(amount, currency) {
  const numeric = Number(amount);
  const clean = Number.isFinite(numeric) && Number.isInteger(numeric) ? String(numeric) : String(amount);
  return `${clean} ${currency || "EUR"}`;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
