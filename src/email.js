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
    subject: `Jūsų dovanų kortelė ${message.amount} ${message.currency}`,
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
  return `Sveiki, ${message.recipientName},

Prisegame jūsų dovanų kortelę: ${message.amount} ${message.currency}.

Gražios dienos.`;
}

function html(message) {
  return `
    <p>Sveiki, ${escapeHtml(message.recipientName)},</p>
    <p>Prisegame jūsų dovanų kortelę: <strong>${escapeHtml(message.amount)} ${escapeHtml(message.currency)}</strong>.</p>
    <p>Gražios dienos.</p>
  `;
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
