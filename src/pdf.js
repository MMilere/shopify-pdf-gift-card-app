import { chromium } from "playwright";

export async function renderGiftCardPdf(card) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 990 } });
    await page.setContent(template(card), { waitUntil: "networkidle" });
    return await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
}

function template(card) {
  return `<!doctype html>
    <html lang="lt">
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Inter, Arial, sans-serif;
            color: #21201e;
            background: #fbfaf7;
          }
          .card {
            width: 297mm;
            height: 210mm;
            position: relative;
            overflow: hidden;
            padding: 28mm;
            background:
              linear-gradient(135deg, rgba(79, 124, 101, 0.16), transparent 42%),
              linear-gradient(315deg, rgba(201, 111, 74, 0.16), transparent 35%),
              #fbfaf7;
          }
          .card::before,
          .card::after {
            content: "";
            position: absolute;
            inset: 12mm;
            border: 1px solid rgba(33, 32, 30, 0.18);
          }
          .card::after {
            inset: 16mm;
            border-color: rgba(33, 32, 30, 0.09);
          }
          .topline,
          .footer {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            gap: 12mm;
            color: #68635d;
            font-size: 13px;
            font-weight: 700;
          }
          .topline { text-transform: uppercase; }
          h1 {
            position: relative;
            z-index: 1;
            margin: 34mm 0 8mm;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 74px;
            line-height: 0.95;
          }
          .recipient,
          .message {
            position: relative;
            z-index: 1;
            max-width: 190mm;
            margin: 0 0 6mm;
            font-size: 24px;
            line-height: 1.25;
          }
          .message {
            color: #3b3935;
          }
          .code {
            position: absolute;
            z-index: 1;
            left: 28mm;
            right: 28mm;
            bottom: 30mm;
          }
          .code span {
            display: block;
            margin-bottom: 4mm;
            color: #68635d;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .code strong {
            display: inline-block;
            border: 1px dashed rgba(33, 32, 30, 0.45);
            border-radius: 5px;
            background: rgba(255, 255, 255, 0.62);
            padding: 5mm 7mm;
            font-size: 28px;
            letter-spacing: 1px;
          }
          .footer {
            position: absolute;
            z-index: 1;
            left: 28mm;
            right: 28mm;
            bottom: 15mm;
          }
        </style>
      </head>
      <body>
        <section class="card">
          <div class="topline">
            <span>${escapeHtml(card.brandName)}</span>
            <span>Dovanų kortelė</span>
          </div>
          <h1>${escapeHtml(card.amount)} ${escapeHtml(card.currency)}</h1>
          <p class="recipient">Skirta <strong>${escapeHtml(card.recipientName)}</strong></p>
          <p class="message">${escapeHtml(card.message)}</p>
          <div class="code">
            <span>Naudokite kodą atsiskaitymo metu</span>
            <strong>${escapeHtml(card.code)}</strong>
          </div>
          <div class="footer">
            <span>${escapeHtml(card.shopUrl)}</span>
            <span>${card.expiresOn ? `Galioja iki ${escapeHtml(card.expiresOn)}` : "Be galiojimo pabaigos"}</span>
          </div>
        </section>
      </body>
    </html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
