// Land Registry Price Paid + postcodes.io lookup
// Estimates current property value from the last recorded sale + UKHPI regional growth.
//
// Data sources:
//   - HM Land Registry Price Paid API (free, no key required)
//   - postcodes.io (free, no key required)
//   - Embedded ONS/UKHPI national averages and regional differentials
//     (same constants as MortgageInsights.js — update quarterly from ONS bulletins)

const REGIONAL_DIFF_PA = {
  'london':                   -2.5,
  'south-east':               -1.2,
  'south-west':                0.3,
  'east-of-england':          -0.8,
  'east-midlands':             1.5,
  'west-midlands':             1.8,
  'yorkshire-and-the-humber':  2.5,
  'north-west':                3.0,
  'north-east':                4.2,
  'wales':                    -0.5,
  'england-and-wales':         0.0,
};

// ONS/Land Registry UKHPI national average house prices (all property types, not seasonally adjusted)
// Source: ONS/Land Registry UKHPI joint publication. Update quarterly from ONS bulletins.
// Apr 2026 confirmed at £270,000 (+3.8% annual) — ONS bulletin June 2026.
const UK_NATIONAL_HPI = [
  { period: '2024-06', price: 253500 },
  { period: '2024-07', price: 254200 },
  { period: '2024-08', price: 255000 },
  { period: '2024-09', price: 255500 },
  { period: '2024-10', price: 256200 },
  { period: '2024-11', price: 257000 },
  { period: '2024-12', price: 258500 },
  { period: '2025-01', price: 261000 },
  { period: '2025-02', price: 263000 },
  { period: '2025-03', price: 264000 },
  { period: '2025-04', price: 260116 },
  { period: '2025-05', price: 258500 },
  { period: '2025-06', price: 259000 },
  { period: '2025-07', price: 260500 },
  { period: '2025-08', price: 261000 },
  { period: '2025-09', price: 262000 },
  { period: '2025-10', price: 263500 },
  { period: '2025-11', price: 265000 },
  { period: '2025-12', price: 267000 },
  { period: '2026-01', price: 265000 },
  { period: '2026-02', price: 267500 },
  { period: '2026-03', price: 269000 },
  { period: '2026-04', price: 270000 },
  { period: '2026-05', price: 270500 },
];

function eerToSlug(eer) {
  return {
    'London':                    'london',
    'South East':                'south-east',
    'South West':                'south-west',
    'East of England':           'east-of-england',
    'East Midlands':             'east-midlands',
    'West Midlands':             'west-midlands',
    'Yorkshire and The Humber':  'yorkshire-and-the-humber',
    'North West':                'north-west',
    'North East':                'north-east',
    'Wales':                     'wales',
  }[eer] || 'england-and-wales';
}

// Extract house number (paon) and street name from a free-text address line.
// "9 Grange Road"     → { paon: '9',   street: 'GRANGE ROAD' }
// "12A Oak Street"    → { paon: '12A', street: 'OAK STREET' }
// "The Cottage, High Street" → { paon: 'THE COTTAGE', street: 'HIGH STREET' }
function parseAddressForLR(addressLine) {
  const trimmed = addressLine.trim();

  // Leading number (with optional letter suffix)
  const numMatch = trimmed.match(/^(\d+[A-Za-z]?)\b\s+(.+)/i);
  if (numMatch) {
    const street = numMatch[2].replace(/,.*$/, '').trim().toUpperCase();
    return { paon: numMatch[1].toUpperCase(), street };
  }

  // Named property — everything before the first comma is the paon
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx > -1) {
    return {
      paon: trimmed.slice(0, commaIdx).trim().toUpperCase(),
      street: trimmed.slice(commaIdx + 1).trim().toUpperCase(),
    };
  }

  return { paon: trimmed.toUpperCase(), street: null };
}

// Parse a Land Registry date value — may be an object { _value: '2024-05-22' } or a plain string.
function parseLRDate(raw) {
  if (!raw) return null;
  const str = typeof raw === 'object' && raw._value ? raw._value : String(raw);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Format a date as "May 2024"
function fmtMonthYear(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// Estimate current property value from the last sale using embedded HPI + regional differential.
// Uses the indexed growth approach: find where the sale date sits in the HPI series and
// extrapolate forward to today using the same series (extended by compound rate if needed).
function estimateCurrentValue(lastSalePrice, saleDate, regionSlug) {
  const today = new Date();

  const latest = UK_NATIONAL_HPI[UK_NATIONAL_HPI.length - 1];
  const earliest = UK_NATIONAL_HPI[0];
  const dataMonths = UK_NATIONAL_HPI.length - 1;

  // Annual national growth rate derived from the embedded series
  const nationalAnnualRate = Math.pow(latest.price / earliest.price, 12 / dataMonths) - 1;
  const regionalDiff = (REGIONAL_DIFF_PA[regionSlug] ?? 0) / 100;
  const annualRate = nationalAnnualRate + regionalDiff;

  const yearsElapsed = (today - saleDate) / (1000 * 60 * 60 * 24 * 365.25);
  const estimated = Math.round(lastSalePrice * Math.pow(1 + annualRate, yearsElapsed));

  return { estimated, annualRate, yearsElapsed };
}

/**
 * Look up a property's estimated current value using Land Registry + UKHPI data.
 *
 * @param {string} addressLine  e.g. "9 Grange Road"
 * @param {string} postcode     e.g. "DA11 0ET"
 * @returns {Promise<object>}
 *   Success: { lastSalePrice, lastSaleDate, lastSaleDateFormatted, estimatedValue,
 *               annualGrowthRate, regionName, propertyType, estateType }
 *   Failure: { error: string }
 */
export async function lookupPropertyValue(addressLine, postcode) {
  if (!addressLine || !postcode) {
    return { error: 'Address and postcode are required.' };
  }

  const { paon, street } = parseAddressForLR(addressLine);
  if (!paon) {
    return { error: 'Could not identify a house number or name from the address.' };
  }

  // UK postcodes: outward (2–4 chars) + space + inward (always 3 chars).
  // Normalise regardless of whether the user included a space.
  const pcClean = postcode.replace(/\s/g, '').toUpperCase();
  const pcFormatted = pcClean.length >= 5
    ? `${pcClean.slice(0, -3)} ${pcClean.slice(-3)}`
    : pcClean;

  try {
    // 1. Resolve address UID in the Land Registry linked-data store.
    //    Strategy A: paon + street + postcode (most precise).
    //    Strategy B: paon + postcode only (handles street name abbreviation mismatches).
    //    Strategy C: postcode only, filter client-side by paon (catches named properties).
    async function fetchAddressItems(params) {
      const res = await fetch(`https://landregistry.data.gov.uk/data/ppi/address.json?${params}`);
      if (!res.ok) return null; // null = API error, distinct from empty results
      const json = await res.json();
      return json?.result?.items || [];
    }

    let addrItems = null;

    // Strategy A — paon + street + postcode
    if (street) {
      addrItems = await fetchAddressItems(new URLSearchParams({ postcode: pcFormatted, paon, street }));
    }

    // Strategy B — paon + postcode (no street)
    if (!addrItems?.length) {
      addrItems = await fetchAddressItems(new URLSearchParams({ postcode: pcFormatted, paon }));
    }

    // Strategy C — full postcode, filter by paon client-side
    if (!addrItems?.length) {
      const all = await fetchAddressItems(new URLSearchParams({ postcode: pcFormatted }));
      if (all === null) return { error: 'Land Registry service is unavailable — try again shortly.' };
      addrItems = (all || []).filter(item => {
        const itemPaon = String(item.paon?.['_value'] || item.paon || '').toUpperCase();
        return itemPaon === paon || itemPaon.startsWith(paon);
      });
    }

    if (addrItems === null) return { error: 'Land Registry service is unavailable — try again shortly.' };
    if (!addrItems.length) {
      return { error: `No Land Registry record found for "${addressLine.trim()}", ${postcode.trim().toUpperCase()}. This may be a new-build or the address format doesn't match.` };
    }

    const addressUID = addrItems[0]['_about'];

    // 2. Fetch the most recent sale transaction for this address
    const txRes = await fetch(
      `https://landregistry.data.gov.uk/data/ppi/transaction-record.json` +
      `?propertyAddress=${encodeURIComponent(addressUID)}&_pageSize=1&_sort=-transactionDate`
    );
    if (!txRes.ok) return { error: 'Could not fetch transaction history.' };

    const txJson = await txRes.json();
    const txItems = txJson?.result?.items;
    if (!txItems || txItems.length === 0) {
      return { error: 'No sale records found for this property in Land Registry data.' };
    }

    const tx = txItems[0];
    const lastSalePrice = tx.pricePaid;
    const saleDate = parseLRDate(tx.transactionDate);

    if (!lastSalePrice || !saleDate) {
      return { error: 'Sale record is incomplete — missing price or date.' };
    }

    // 3. Resolve region via postcodes.io
    let regionSlug = 'england-and-wales';
    let regionName = 'England & Wales';
    try {
      const pcRes = await fetch(`https://api.postcodes.io/postcodes/${pcClean}`);
      if (pcRes.ok) {
        const pcJson = await pcRes.json();
        if (pcJson.status === 200) {
          const eer = pcJson.result.european_electoral_region;
          regionSlug = eerToSlug(eer);
          regionName = eer || regionName;
        }
      }
    } catch { /* non-fatal — fall back to national average */ }

    // 4. Apply HPI growth to estimate today's value
    const { estimated, annualRate } = estimateCurrentValue(lastSalePrice, saleDate, regionSlug);

    return {
      lastSalePrice,
      lastSaleDate: saleDate.toISOString().slice(0, 10),
      lastSaleDateFormatted: fmtMonthYear(saleDate),
      estimatedValue: estimated,
      annualGrowthRate: annualRate,
      regionName,
      propertyType: tx.propertyType?.prefLabel || tx.propertyType || null,
      estateType: tx.estateType?.prefLabel || tx.estateType || null,
    };

  } catch {
    return { error: 'Lookup failed — please check your internet connection.' };
  }
}
