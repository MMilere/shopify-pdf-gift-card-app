import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(__dirname, "..", "assets", "gift-card-template.pdf");

export async function renderGiftCardPdf(card) {
  const templateBytes = await fs.readFile(templatePath);
  const pdf = await PDFDocument.load(templateBytes);
  const [page] = pdf.getPages();
  const { width, height } = page.getSize();
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.12, 0.11, 0.1);
  const muted = rgb(0.45, 0.4, 0.36);

  if (card.orderName) {
    drawText(page, `Uzsakymas ${card.orderName}`, {
      x: width * 0.78,
      y: height * 0.975,
      size: 7,
      font: sansBold,
      color: muted,
    });
  }

  drawText(page, String(card.code || "").toUpperCase(), {
    x: width * 0.232,
    y: height * 0.7225,
    size: 11,
    font: sansBold,
    color: ink,
  });

  drawText(page, formatAmount(card.amount, card.currency), {
    x: width * 0.185,
    y: height * 0.6746,
    size: 11,
    font: serifBold,
    color: ink,
  });

  drawText(page, formatDateLt(card.expiresOn), {
    x: width * 0.668,
    y: height * 0.6746,
    size: 11,
    font: sansBold,
    color: ink,
  });

  return Buffer.from(await pdf.save());
}

function drawCenteredText(page, text, options) {
  const value = String(text || "");
  const textWidth = options.font.widthOfTextAtSize(value, options.size);
  const x = options.x + Math.max(0, (options.width - textWidth) / 2);
  const y = options.y + Math.max(0, (options.height - options.size) / 2);

  page.drawText(value, {
    x,
    y,
    size: options.size,
    font: options.font,
    color: options.color,
  });
}

function drawText(page, text, options) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    const nextWidth = options.font.widthOfTextAtSize(next, options.size);
    if (options.maxWidth && nextWidth > options.maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);

  lines.forEach((lineText, index) => {
    page.drawText(lineText, {
      x: options.x,
      y: options.y - index * options.size * 1.25,
      size: options.size,
      font: options.font,
      color: options.color,
    });
  });
}

function formatAmount(amount, currency) {
  const numeric = Number(amount);
  const clean = Number.isFinite(numeric) && Number.isInteger(numeric) ? String(numeric) : String(amount);
  return `${clean} ${currency || "EUR"}`;
}

function formatDateLt(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
