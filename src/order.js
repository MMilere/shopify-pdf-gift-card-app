export function extractGiftCardJobs(order) {
  const productIds = envSet("GIFT_CARD_PRODUCT_IDS");
  const variantIds = envSet("GIFT_CARD_VARIANT_IDS");
  const currency = order.currency || order.presentment_currency || "EUR";

  return (order.line_items || [])
    .filter((item) => {
      const productMatch = productIds.size > 0 && productIds.has(String(item.product_id));
      const variantMatch = variantIds.size > 0 && variantIds.has(String(item.variant_id));
      return productMatch || variantMatch;
    })
    .flatMap((item) => {
      const quantity = Number(item.quantity || 1);
      return Array.from({ length: quantity }, () => ({
        amount: item.price || item.final_price || item.discounted_price,
        currency,
        recipientEmail:
          propertyAny(item, ["Recipient email", "Recipient Email", "Gavėjo el. paštas", "Gavejo el. pastas"]) ||
          order.email,
        recipientName:
          propertyAny(item, ["Recipient name", "Recipient Name", "Gavėjo vardas", "Gavejo vardas"]) ||
          order.customer?.first_name ||
          "Dovanų kortelės gavėjas",
        message: propertyAny(item, ["Message", "Žinutė", "Zinute"]) || "Linkime malonaus apsipirkimo.",
      }));
    });
}

function propertyAny(item, names) {
  for (const name of names) {
    const value = property(item, name);
    if (value) return value;
  }

  return "";
}

function property(item, name) {
  const found = (item.properties || []).find((propertyItem) => {
    return propertyItem.name?.toLowerCase() === name.toLowerCase();
  });

  return String(found?.value || "").trim();
}

function envSet(name) {
  return new Set(
    String(process.env[name] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}
