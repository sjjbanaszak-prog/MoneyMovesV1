export function autoDetectPensionColumns(data) {
  const headers = Object.keys(data[0]);

  const mapping = {
    date: null,
    provider: null,
    amount: null,
  };

  headers.forEach((header) => {
    const h = header.toLowerCase();

    if (!mapping.date && /date/.test(h)) mapping.date = header;
    else if (
      !mapping.provider &&
      /(provider|company|scheme|fund|pension|employer)/.test(h)
    )
      mapping.provider = header;
    else if (
      !mapping.amount &&
      /(amount|paid|value|total|gross|contribution)/.test(h)
    )
      mapping.amount = header;
  });

  return mapping;
}
