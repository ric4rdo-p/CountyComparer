/**
 * Generic data-fetching engine driven by the metric registry.
 *
 * - Collects all Census ACS variables needed from registry entries with `census` specs.
 * - Groups them by profile (DP02/DP03/DP04/DP05) and fetches in 4 parallel calls.
 * - Runs all ODP `fetch` functions in parallel.
 * - Returns a merged county data object keyed by metric key.
 */

import { REGISTRY } from './registry.js';
import { CENSUS_BASE, TX_FIPS } from './helpers.js';

// Collect every ACS variable referenced anywhere in the registry.
const ALL_CENSUS_VARS = new Set();
for (const m of REGISTRY) {
  if (m.census?.var)  ALL_CENSUS_VARS.add(m.census.var);
  if (m.census?.vars) m.census.vars.forEach(v => ALL_CENSUS_VARS.add(v));
}
// Always fetch population and county name.
ALL_CENSUS_VARS.add('DP05_0001E');

// Group vars by their DP profile prefix so we can batch into 4 calls.
function groupByProfile(vars) {
  const groups = { DP02: [], DP03: [], DP04: [], DP05: [] };
  for (const v of vars) {
    const prefix = v.slice(0, 4);
    if (groups[prefix]) groups[prefix].push(v);
  }
  return groups;
}

const PROFILE_GROUPS = groupByProfile(ALL_CENSUS_VARS);

async function fetchProfileGroup(countyFips, vars, censusKey) {
  if (!vars.length) return {};
  const url = `${CENSUS_BASE}`
    + `?get=${['NAME', ...vars].join(',')}`
    + `&for=county:${countyFips}`
    + `&in=state:${TX_FIPS}`
    + (censusKey ? `&key=${censusKey}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census ACS fetch failed (${res.status}) for county ${countyFips}`);
  const [headers, values] = await res.json();
  return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
}

export async function fetchCountyData(countyFips, censusKey = '') {
  // Step 1: fetch all ACS profile groups in parallel
  const [dp02, dp03, dp04, dp05] = await Promise.all([
    fetchProfileGroup(countyFips, PROFILE_GROUPS.DP02, censusKey),
    fetchProfileGroup(countyFips, PROFILE_GROUPS.DP03, censusKey),
    fetchProfileGroup(countyFips, PROFILE_GROUPS.DP04, censusKey),
    fetchProfileGroup(countyFips, PROFILE_GROUPS.DP05, censusKey),
  ]);
  const acs = { ...dp02, ...dp03, ...dp04, ...dp05 };

  const countyName = acs['NAME'] ?? '';
  const population = parseInt(acs['DP05_0001E']) || 0;

  // Step 2: run all ODP fetch functions in parallel
  const odpEntries = REGISTRY.filter(m => typeof m.fetch === 'function');
  const odpValues  = await Promise.all(
    odpEntries.map(m => m.fetch({ countyName, countyFips, population }).catch(() => null))
  );

  // Step 3: build result object
  const result = {
    fips: countyFips,
    name: countyName.replace(', Texas', ''),
    population,
  };

  // Map Census values
  for (const m of REGISTRY) {
    if (!m.census) continue;
    if (m.census.var) {
      const raw = acs[m.census.var];
      const parsed = m.census.parse(raw);
      result[m.key] = isNaN(parsed) || parsed == null ? null : parsed || null;
    } else if (m.census.vars && m.census.compute) {
      result[m.key] = m.census.compute(acs);
    }
  }

  // Map ODP values
  odpEntries.forEach((m, i) => { result[m.key] = odpValues[i]; });

  return result;
}

export async function getAllTexasCounties(censusKey = '') {
  const url = `${CENSUS_BASE}`
    + `?get=NAME,DP05_0001E`
    + `&for=county:*`
    + `&in=state:${TX_FIPS}`
    + (censusKey ? `&key=${censusKey}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`County list fetch failed: ${res.status}`);
  const [, ...rows] = await res.json();
  return rows
    .map(row => ({
      name: row[0].replace(', Texas', ''),
      fips: row[row.length - 1],
      population: parseInt(row[1]) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
