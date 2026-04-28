import sendgrid from "@sendgrid/mail";

export async function sendGiftCardEmail(message) {
  sendgrid.setApiKey(requiredEnv("SENDGRID_API_KEY"));

  await sendgrid.send({
    to: message.to,
    from: requiredEnv("FROM_EMAIL"),
    subject: `Jūsų dovanų kortelė ${message.amount} ${message.currency}`,
    text: plainText(message),
    html: html(message),
    attachments: [
      {
        content: message.pdf.toString("base64"),
        filename: "dovanu-kortele.pdf",
        type: "application/pdf",
        disposition: "attachment",
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
