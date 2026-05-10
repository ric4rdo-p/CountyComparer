// Shared ODP/Census fetch helpers used by the metric registry and engine.
// Uses native fetch (browser + Node 18+). No external dependencies.

export const TEXAS_ODP = 'https://data.texas.gov/resource';
export const CENSUS_BASE = 'https://api.census.gov/data/2023/acs/acs5/profile';
export const TX_FIPS = '48';

export function normalizeCountyName(rawName) {
  return rawName.replace(/, Texas$/, '').replace(/ County$/, '').trim().toUpperCase();
}

export function shortCountyName(rawName) {
  return rawName.replace(/, Texas$/, '').replace(/ County$/, '').trim();
}

// Federal FIPS county codes are odd-numbered; TX sequential = (code+1)/2.
// e.g. Harris 48201 → (201+1)/2 = 101
export function txCountyCode(countyFips) {
  const localCode = parseInt(String(countyFips).slice(-3), 10);
  return Math.round((localCode + 1) / 2);
}

export function perCapita(count, population, scale = 100000) {
  if (!population || count == null) return null;
  return Math.round((count / population) * scale * 10) / 10;
}

export function safeInt(val)   { const n = parseInt(val);   return isNaN(n) ? null : n; }
export function safeFloat(val) { const n = parseFloat(val); return isNaN(n) ? null : n; }

export async function odp(path) {
  try {
    const res = await fetch(`${TEXAS_ODP}/${path}`);
    return res.ok ? await res.json() : null;
  } catch { return null; }
}
