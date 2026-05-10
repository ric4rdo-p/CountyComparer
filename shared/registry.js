/**
 * Unified metric registry.
 *
 * Each entry is fully self-describing:
 *   - Display fields: key, label, shortLabel, description, format, higherIsBetter, source, group
 *   - queryNote: shown in the MetricsPage ℹ popup
 *   - census: { var, parse } for a single ACS variable, or { vars, compute } for derived values
 *   - fetch: async ({ countyName, countyFips, population }) => value  for Texas ODP metrics
 *
 * To add a new metric, add one object here. Nothing else needs to change.
 *
 * Census metrics are batch-fetched by the engine (4 parallel ACS profile calls).
 * ODP metrics have their fetch function called in parallel by the engine.
 */

import {
  odp, normalizeCountyName, shortCountyName, txCountyCode, perCapita, safeInt, safeFloat,
} from './helpers.js';

const ACS = 'api.census.gov/data/2023/acs/acs5/profile';
const ODP = 'data.texas.gov/resource';

export const REGISTRY = [

  // ── Economy (Census ACS DP03) ─────────────────────────────────────────────
  {
    key: 'medianIncome',
    label: 'Median Household Income',
    shortLabel: 'Med. Income',
    description: 'The midpoint annual income across all households in the county.',
    format: v => `$${v.toLocaleString()}`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0062E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0062E', parse: parseInt },
  },
  {
    key: 'perCapitaIncome',
    label: 'Per Capita Income',
    shortLabel: 'Per Capita Inc.',
    description: 'Average income earned per person in the county.',
    format: v => `$${v.toLocaleString()}`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0088E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0088E', parse: parseInt },
  },
  {
    key: 'unemploymentRate',
    label: 'Unemployment Rate',
    shortLabel: 'Unemployment',
    description: 'Percentage of the labor force actively looking for work but unable to find it.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0009PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0009PE', parse: parseFloat },
  },
  {
    key: 'povertyRate',
    label: 'Poverty Rate',
    shortLabel: 'Poverty Rate',
    description: 'Share of county residents living below the federal poverty threshold.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0119PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0119PE', parse: parseFloat },
  },
  {
    key: 'snapRate',
    label: '% on SNAP Benefits',
    shortLabel: 'SNAP / Food Stamps',
    description: 'Share of households receiving federal food stamp (SNAP) assistance.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0074PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0074PE', parse: parseFloat },
  },
  {
    key: 'laborForceRate',
    label: '% in Labor Force',
    shortLabel: 'Labor Force',
    description: 'Share of residents 16 and older who are employed or actively seeking work.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0002PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0002PE', parse: parseFloat },
  },
  {
    key: 'noVehicleWorkerRate',
    label: '% Workers with No Vehicle',
    shortLabel: 'No-Car Workers',
    description: 'Share of working households with zero vehicles — a proxy for transportation hardship.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0057PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0057PE', parse: parseFloat },
  },
  {
    key: 'healthInsuranceRate',
    label: '% with Health Insurance',
    shortLabel: 'Insured',
    description: 'Share of the civilian noninstitutionalized population covered by any health insurance.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0096PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0096PE', parse: parseFloat },
  },
  {
    key: 'uninsuredRate',
    label: '% Without Health Insurance',
    shortLabel: 'Uninsured',
    description: 'Share of residents with no health insurance coverage of any kind.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Economy',
    queryNote: { endpoint: ACS, query: 'GET DP03_0099PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0099PE', parse: parseFloat },
  },

  // ── Economy (Texas ODP) ───────────────────────────────────────────────────
  {
    key: 'salesTaxPerCapita',
    label: 'Sales Tax Revenue per Capita',
    shortLabel: 'Sales Tax',
    description: 'Total local sales tax collected per resident — a proxy for retail and economic output.',
    format: v => `$${Math.round(v).toLocaleString()}`,
    higherIsBetter: true,
    source: 'TX Comptroller',
    group: 'Economy',
    queryNote: { endpoint: `${ODP}/53pa-m7sm.json`, query: "SELECT sum(net_payment_this_period) WHERE county='{county}' · divided by population" },
    fetch: async ({ countyName, population }) => {
      const short = shortCountyName(countyName);
      const data = await odp(`53pa-m7sm.json?county=${encodeURIComponent(short)}&$select=sum(net_payment_this_period) as total&$limit=1`);
      const total = safeFloat(data?.[0]?.total);
      return total != null && population > 0 ? Math.round(total / population) : null;
    },
  },
  {
    key: 'trustCompanies',
    label: 'Trust Companies',
    shortLabel: 'Trust Cos.',
    description: 'Number of state-regulated trust companies headquartered in the county.',
    format: v => `${v}`,
    higherIsBetter: true,
    source: 'TX DOB',
    group: 'Economy',
    queryNote: { endpoint: `${ODP}/2hc4-g945.json`, query: "SELECT count(*) WHERE county='{county}'" },
    fetch: async ({ countyName }) => {
      const short = shortCountyName(countyName);
      const data = await odp(`2hc4-g945.json?county=${encodeURIComponent(short)}&$select=count(*) as cnt&$limit=1`);
      return safeInt(data?.[0]?.cnt);
    },
  },
  {
    key: 'stateBanks',
    label: 'State-Chartered Banks',
    shortLabel: 'State Banks',
    description: 'Number of state-chartered banks with offices in the county.',
    format: v => `${v}`,
    higherIsBetter: true,
    source: 'TX DOB',
    group: 'Economy',
    queryNote: { endpoint: `${ODP}/yvbr-mkqg.json`, query: "SELECT count(*) WHERE county='{county}'" },
    fetch: async ({ countyName }) => {
      const short = shortCountyName(countyName);
      const data = await odp(`yvbr-mkqg.json?county=${encodeURIComponent(short)}&$select=count(*) as cnt&$limit=1`);
      return safeInt(data?.[0]?.cnt);
    },
  },
  {
    key: 'moneyServicesBizPer100k',
    label: 'Check-Cashing & Payday Lenders per 100k',
    shortLabel: 'Payday Lenders',
    description: 'Density of money services businesses — high counts often signal limited banking access.',
    format: v => `${v.toFixed(1)}/100k`,
    higherIsBetter: false,
    source: 'TX DOF',
    group: 'Economy',
    queryNote: { endpoint: `${ODP}/j48w-wspg.json`, query: "SELECT count(*) WHERE county='{county}' · per 100k pop" },
    fetch: async ({ countyName, population }) => {
      const short = shortCountyName(countyName);
      const data = await odp(`j48w-wspg.json?county=${encodeURIComponent(short)}&$select=count(*) as cnt&$limit=1`);
      return perCapita(safeInt(data?.[0]?.cnt), population);
    },
  },

  // ── Environment ───────────────────────────────────────────────────────────
  {
    key: 'envViolationsPer100k',
    label: 'Environmental Violations per 100k',
    shortLabel: 'Env. Violations',
    description: 'TCEQ-issued environmental notices of violation per 100k residents.',
    format: v => `${v.toFixed(1)}/100k`,
    higherIsBetter: false,
    source: 'TCEQ',
    group: 'Environment',
    queryNote: { endpoint: `${ODP}/mwzi-gyw7.json`, query: "SELECT count(*) WHERE county='{county}' · per 100k pop" },
    fetch: async ({ countyName, population }) => {
      const norm = normalizeCountyName(countyName);
      const data = await odp(`mwzi-gyw7.json?county=${encodeURIComponent(norm)}&$select=count(*) as cnt&$limit=1`);
      return perCapita(safeInt(data?.[0]?.cnt), population);
    },
  },
  {
    key: 'petroleumSites',
    label: 'Active Petroleum Contamination Sites',
    shortLabel: 'Contamination',
    description: 'Open leaking petroleum storage tank sites still awaiting cleanup.',
    format: v => `${v}`,
    higherIsBetter: false,
    source: 'TCEQ LPST',
    group: 'Environment',
    queryNote: { endpoint: `${ODP}/hedz-nn4q.json`, query: "SELECT count(*) WHERE county='{county}' AND closure_date IS NULL" },
    fetch: async ({ countyName }) => {
      const norm = normalizeCountyName(countyName);
      const data = await odp(`hedz-nn4q.json?county=${encodeURIComponent(norm)}&$where=closure_date+IS+NULL&$select=count(*) as cnt&$limit=1`);
      return safeInt(data?.[0]?.cnt);
    },
  },

  // ── People (Census ACS DP02) ──────────────────────────────────────────────
  {
    key: 'collegeDegreeRate',
    label: "Bachelor's Degree or Higher",
    shortLabel: 'College Ed.',
    description: "Percentage of adults 25 and older who hold at least a bachelor's degree.",
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'People',
    queryNote: { endpoint: ACS, query: 'GET DP02_0068PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0068PE', parse: parseFloat },
  },
  {
    key: 'medianAge',
    label: 'Median Age',
    shortLabel: 'Median Age',
    description: 'The age that splits the county population exactly in half.',
    format: v => `${v.toFixed(1)} yrs`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'People',
    queryNote: { endpoint: ACS, query: 'GET DP05_0018E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0018E', parse: parseFloat },
  },

  // ── People (Texas ODP) ────────────────────────────────────────────────────
  {
    key: 'daycaresPerCapita',
    label: 'Licensed Daycares per 10k',
    shortLabel: 'Daycares',
    description: 'Licensed childcare facilities per 10,000 residents — a measure of family infrastructure.',
    format: v => `${v.toFixed(1)}/10k`,
    higherIsBetter: true,
    source: 'HHSC',
    group: 'People',
    queryNote: { endpoint: `${ODP}/bc5r-88dy.json`, query: "SELECT count(*) WHERE county='{county}' · per 10k pop" },
    fetch: async ({ countyName, population }) => {
      const norm = normalizeCountyName(countyName);
      const data = await odp(`bc5r-88dy.json?county=${encodeURIComponent(norm)}&$select=count(*) as cnt&$limit=1`);
      return perCapita(safeInt(data?.[0]?.cnt), population, 10000);
    },
  },
  {
    key: 'avgSchoolScore',
    label: 'Avg School Accountability Score',
    shortLabel: 'School Score',
    description: 'Average TEA accountability score across all school districts in the county, out of 100.',
    format: v => `${v.toFixed(1)}/100`,
    higherIsBetter: true,
    source: 'TEA',
    group: 'People',
    queryNote: { endpoint: `${ODP}/nui6-x374.json`, query: "SELECT overall_score WHERE county='{county}' AND school_type='District' · averaged in JS" },
    fetch: async ({ countyName }) => {
      const norm = normalizeCountyName(countyName);
      const data = await odp(`nui6-x374.json?county=${encodeURIComponent(norm)}&school_type=District&$select=overall_score&$limit=500`);
      if (!data?.length) return null;
      const scores = data.map(r => parseFloat(r.overall_score)).filter(n => !isNaN(n));
      if (!scores.length) return null;
      return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    },
  },
  {
    key: 'avgSuperintendentSalary',
    label: 'Avg Superintendent Base Pay',
    shortLabel: 'Super. Pay',
    description: 'Average base salary paid to school district superintendents.',
    format: v => `$${Math.round(v).toLocaleString()}`,
    higherIsBetter: null,
    source: 'TEA',
    group: 'People',
    queryNote: { endpoint: `${ODP}/6dh5-cse4.json`, query: "SELECT avg(base_pay) WHERE county='{county} COUNTY'" },
    fetch: async ({ countyName }) => {
      const norm = normalizeCountyName(countyName) + ' COUNTY';
      const data = await odp(`6dh5-cse4.json?county=${encodeURIComponent(norm)}&$select=avg(base_pay) as avg_pay&$limit=1`);
      return safeFloat(data?.[0]?.avg_pay);
    },
  },
  {
    key: 'childRemovalsPer100k',
    label: 'Child Removals per 100k',
    shortLabel: 'Child Removals',
    description: 'Children removed from their homes by CPS in FY2025 per 100k residents.',
    format: v => `${v.toFixed(1)}/100k`,
    higherIsBetter: false,
    source: 'DFPS',
    group: 'People',
    queryNote: { endpoint: `${ODP}/xmtn-e5c8.json`, query: "SELECT sum(removals) WHERE county='{county}' AND fiscal_year=2025 · per 100k pop" },
    fetch: async ({ countyName, population }) => {
      const short = shortCountyName(countyName);
      const data = await odp(`xmtn-e5c8.json?county=${encodeURIComponent(short)}&fiscal_year=2025&$select=sum(removals) as total&$limit=1`);
      return perCapita(safeInt(data?.[0]?.total), population);
    },
  },

  // ── Lifestyle (Census ACS DP03) ───────────────────────────────────────────
  {
    key: 'commuteMinutes',
    label: 'Mean Commute Time',
    shortLabel: 'Commute',
    description: 'Average minutes residents spend traveling to work each day.',
    format: v => `${v.toFixed(0)} min`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Lifestyle',
    queryNote: { endpoint: ACS, query: 'GET DP03_0025E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0025E', parse: parseFloat },
  },

  // ── Lifestyle (Texas ODP) ─────────────────────────────────────────────────
  {
    key: 'boozeRevenuePerCapita',
    label: 'Alcohol Revenue per Person',
    shortLabel: 'Booze Rev.',
    description: 'Total bar and restaurant alcohol sales divided by county population.',
    format: v => `$${v.toLocaleString()}`,
    higherIsBetter: true,
    source: 'TX Comptroller',
    group: 'Lifestyle',
    queryNote: { endpoint: `${ODP}/naix-2893.json`, query: 'SELECT sum(total_receipts) WHERE location_county={txCode} · divided by population' },
    fetch: async ({ countyFips, population }) => {
      const code = txCountyCode(countyFips);
      const data = await odp(`naix-2893.json?location_county=${code}&$select=sum(total_receipts) as booze_revenue&$limit=1`);
      const revenue = safeFloat(data?.[0]?.booze_revenue);
      return revenue != null && population > 0 ? Math.round(revenue / population) : null;
    },
  },
  {
    key: 'liquorLicensesPerCapita',
    label: 'Liquor Licenses per 1,000',
    shortLabel: 'Liquor Licenses',
    description: 'Number of active TABC liquor licenses per 1,000 residents.',
    format: v => `${(v * 1000).toFixed(2)}/1k`,
    higherIsBetter: true,
    source: 'TABC',
    group: 'Lifestyle',
    queryNote: { endpoint: `${ODP}/7hf9-qc9f.json`, query: "SELECT count(*) WHERE county='{county}' · per 1k pop" },
    fetch: async ({ countyName, population }) => {
      const short = shortCountyName(countyName);
      const data = await odp(`7hf9-qc9f.json?county=${encodeURIComponent(short)}&$select=count(*) as cnt&$limit=1`);
      const count = safeInt(data?.[0]?.cnt);
      return count != null && population > 0 ? Math.round((count / population) * 10000) / 10000 : null;
    },
  },
  {
    key: 'amusementOperatorsPer100k',
    label: 'Amusement Machine Operators per 100k',
    shortLabel: 'Amusement Ops',
    description: 'Registered coin-operated amusement machine operators per 100k residents.',
    format: v => `${v.toFixed(1)}/100k`,
    higherIsBetter: true,
    source: 'TX Comptroller',
    group: 'Lifestyle',
    queryNote: { endpoint: `${ODP}/ryd4-r7mh.json`, query: "SELECT count(*) WHERE county='{county}' · per 100k pop" },
    fetch: async ({ countyName, population }) => {
      const norm = normalizeCountyName(countyName);
      const data = await odp(`ryd4-r7mh.json?county=${encodeURIComponent(norm)}&$select=count(*) as cnt&$limit=1`);
      return perCapita(safeInt(data?.[0]?.cnt), population);
    },
  },
  {
    key: 'tobaccoRetailersPer100k',
    label: 'Tobacco Retailers per 100k',
    shortLabel: 'Tobacco Retail',
    description: 'Active licensed tobacco and cigarette retailers per 100k residents.',
    format: v => `${v.toFixed(1)}/100k`,
    higherIsBetter: false,
    source: 'TX Comptroller',
    group: 'Lifestyle',
    queryNote: { endpoint: `${ODP}/n4rp-ar9b.json`, query: "SELECT count(*) WHERE county='{county}' · per 100k pop" },
    fetch: async ({ countyName, population }) => {
      const norm = normalizeCountyName(countyName);
      const data = await odp(`n4rp-ar9b.json?county=${encodeURIComponent(norm)}&$select=count(*) as cnt&$limit=1`);
      return perCapita(safeInt(data?.[0]?.cnt), population);
    },
  },

  // ── Society (Texas ODP) ───────────────────────────────────────────────────
  {
    key: 'custodialDeathsPer100k',
    label: 'Custodial Deaths per 100k',
    shortLabel: 'Custodial Deaths',
    description: 'Deaths occurring while in law enforcement or correctional custody per 100k residents.',
    format: v => `${v.toFixed(2)}/100k`,
    higherIsBetter: false,
    source: 'TX OAG',
    group: 'Society',
    queryNote: { endpoint: `${ODP}/ypvi-69jj.json`, query: "SELECT count(*) WHERE county='{county}' · per 100k pop" },
    fetch: async ({ countyName, population }) => {
      const short = shortCountyName(countyName);
      const data = await odp(`ypvi-69jj.json?county=${encodeURIComponent(short)}&$select=count(*) as cnt&$limit=1`);
      return perCapita(safeInt(data?.[0]?.cnt), population);
    },
  },
  {
    key: 'juvenileReferralRate',
    label: 'Juvenile Referrals per 1k Youth (2021)',
    shortLabel: 'Juv. Referrals',
    description: 'Youth referred to the juvenile justice system per 1,000 residents under 18.',
    format: v => `${v.toFixed(1)}/1k`,
    higherIsBetter: false,
    source: 'TJJD',
    group: 'Society',
    queryNote: { endpoint: `${ODP}/54dk-5ghb.json`, query: "SELECT sum(violent_felony+other_felony+misd) WHERE county='{county}' AND year=2021 · divided by juvenile_population" },
    fetch: async ({ countyName }) => {
      const norm = normalizeCountyName(countyName);
      const data = await odp(`54dk-5ghb.json?county=${encodeURIComponent(norm)}&calendar_year=2021&$select=sum(violent_felony) as vf,sum(other_felony) as of_count,sum(misd) as misd_count,max(juvenile_population) as pop&$limit=1`);
      if (!data?.[0]) return null;
      const vf   = safeInt(data[0].vf) ?? 0;
      const of   = safeInt(data[0].of_count) ?? 0;
      const misd = safeInt(data[0].misd_count) ?? 0;
      const pop  = safeInt(data[0].pop);
      const total = vf + of + misd;
      return total > 0 && pop ? Math.round((total / pop) * 1000 * 10) / 10 : null;
    },
  },
  {
    key: 'criminalCasesPer100k',
    label: 'Criminal Cases Filed per 100k',
    shortLabel: 'Criminal Cases',
    description: 'Total criminal cases filed in district and county courts per 100k residents.',
    format: v => `${Math.round(v).toLocaleString()}/100k`,
    higherIsBetter: false,
    source: 'OCA',
    group: 'Society',
    queryNote: { endpoint: `${ODP}/hp5g-u8vi.json`, query: "SELECT sum(cases_added) WHERE county='{county}' · per 100k pop" },
    fetch: async ({ countyName, population }) => {
      const short = shortCountyName(countyName);
      const data = await odp(`hp5g-u8vi.json?county=${encodeURIComponent(short)}&$select=sum(cases_added) as total,max(population) as pop&$limit=1`);
      const cases = safeInt(data?.[0]?.total);
      const pop   = safeInt(data?.[0]?.pop) || population;
      return perCapita(cases, pop);
    },
  },

  // ── Commute & Work (Census ACS DP03) ─────────────────────────────────────
  {
    key: 'driveAloneRate',
    label: '% Drive Alone to Work',
    shortLabel: 'Drive Alone',
    description: 'Share of workers 16+ who commute solo by car, truck, or van.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Commute & Work',
    queryNote: { endpoint: ACS, query: 'GET DP03_0019PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0019PE', parse: parseFloat },
  },
  {
    key: 'transitCommuteRate',
    label: '% Take Transit to Work',
    shortLabel: 'Transit Commute',
    description: 'Share of workers who use public transportation as their primary commute mode.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Commute & Work',
    queryNote: { endpoint: ACS, query: 'GET DP03_0021PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0021PE', parse: parseFloat },
  },
  {
    key: 'walkToWorkRate',
    label: '% Walk to Work',
    shortLabel: 'Walk to Work',
    description: 'Share of workers whose primary commute mode is walking.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Commute & Work',
    queryNote: { endpoint: ACS, query: 'GET DP03_0022PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0022PE', parse: parseFloat },
  },
  {
    key: 'workFromHomeRate',
    label: '% Work from Home',
    shortLabel: 'Work from Home',
    description: 'Share of workers who work primarily from home rather than commuting.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Commute & Work',
    queryNote: { endpoint: ACS, query: 'GET DP03_0024PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0024PE', parse: parseFloat },
  },
  {
    key: 'governmentWorkerRate',
    label: '% Government Workers',
    shortLabel: 'Gov. Workers',
    description: 'Share of employed civilians 16+ working in federal, state, or local government.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Commute & Work',
    queryNote: { endpoint: ACS, query: 'GET DP03_0042PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0042PE', parse: parseFloat },
  },

  // ── Industry (Census ACS DP03) ────────────────────────────────────────────
  {
    key: 'agricultureRate',
    label: '% in Agriculture',
    shortLabel: 'Agriculture',
    description: 'Share of employed civilians working in farming, fishing, or forestry.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0033PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0033PE', parse: parseFloat },
  },
  {
    key: 'constructionRate',
    label: '% in Construction',
    shortLabel: 'Construction',
    description: 'Share of employed civilians working in the construction industry.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0034PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0034PE', parse: parseFloat },
  },
  {
    key: 'manufacturingRate',
    label: '% in Manufacturing',
    shortLabel: 'Manufacturing',
    description: 'Share of employed civilians working in manufacturing.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0035PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0035PE', parse: parseFloat },
  },
  {
    key: 'retailRate',
    label: '% in Retail Trade',
    shortLabel: 'Retail',
    description: 'Share of employed civilians working in retail trade.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0037PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0037PE', parse: parseFloat },
  },
  {
    key: 'transportationRate',
    label: '% in Transportation & Utilities',
    shortLabel: 'Transport/Utilities',
    description: 'Share of employed civilians in transportation, warehousing, and utilities.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0038PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0038PE', parse: parseFloat },
  },
  {
    key: 'informationRate',
    label: '% in Information Industry',
    shortLabel: 'Information',
    description: 'Share of employed civilians working in media, telecom, and information sectors.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0039PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0039PE', parse: parseFloat },
  },
  {
    key: 'financeRate',
    label: '% in Finance & Real Estate',
    shortLabel: 'Finance/Real Estate',
    description: 'Share of employed civilians working in finance, insurance, or real estate.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0040PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0040PE', parse: parseFloat },
  },
  {
    key: 'professionalServicesRate',
    label: '% in Professional Services',
    shortLabel: 'Prof. Services',
    description: 'Share of employed civilians in science, management, and administrative occupations.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0041PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0041PE', parse: parseFloat },
  },
  {
    key: 'educationHealthcareRate',
    label: '% in Education & Healthcare',
    shortLabel: 'Edu/Healthcare',
    description: 'Share of employed civilians in educational services or healthcare.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0043PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0043PE', parse: parseFloat },
  },
  {
    key: 'artsFoodRate',
    label: '% in Arts & Food Service',
    shortLabel: 'Arts/Food Service',
    description: 'Share of employed civilians in entertainment, recreation, accommodation, and food service.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Industry',
    queryNote: { endpoint: ACS, query: 'GET DP03_0044PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP03_0044PE', parse: parseFloat },
  },

  // ── Social (Census ACS DP02) ──────────────────────────────────────────────
  {
    key: 'graduateDegreeRate',
    label: '% with Graduate Degree',
    shortLabel: 'Grad Degree',
    description: "Share of adults 25+ who hold a master's, professional, or doctoral degree.",
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0066PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0066PE', parse: parseFloat },
  },
  {
    key: 'highSchoolRate',
    label: '% High School Graduate or Higher',
    shortLabel: 'HS Grad+',
    description: 'Share of adults 25+ who have at least a high school diploma or equivalent.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0067PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0067PE', parse: parseFloat },
  },
  {
    key: 'collegeEnrollmentRate',
    label: '% Enrolled in College',
    shortLabel: 'College Enrolled',
    description: 'Share of the population 3 and older currently enrolled in college or graduate school.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0058PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0058PE', parse: parseFloat },
  },
  {
    key: 'veteranRate',
    label: '% Veterans',
    shortLabel: 'Veterans',
    description: 'Share of the civilian population 18+ who have served in the U.S. armed forces.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0070PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0070PE', parse: parseFloat },
  },
  {
    key: 'disabilityRate',
    label: '% with a Disability',
    shortLabel: 'Disability',
    description: 'Share of the civilian noninstitutionalized population with any reported disability.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0072PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0072PE', parse: parseFloat },
  },
  {
    key: 'foreignBornRate',
    label: '% Foreign Born',
    shortLabel: 'Foreign Born',
    description: 'Share of the total population born outside the United States.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0094PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0094PE', parse: parseFloat },
  },
  {
    key: 'englishOnlyRate',
    label: '% Speak English Only',
    shortLabel: 'English Only',
    description: 'Share of residents 5 and older who speak only English at home.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0113PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0113PE', parse: parseFloat },
  },
  {
    key: 'spanishAtHomeRate',
    label: '% Speak Spanish at Home',
    shortLabel: 'Spanish at Home',
    description: 'Share of residents 5 and older who speak Spanish at home.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0116PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0116PE', parse: parseFloat },
  },
  {
    key: 'broadbandRate',
    label: '% Households with Broadband',
    shortLabel: 'Broadband',
    description: 'Share of households with an active broadband internet subscription.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0154PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0154PE', parse: parseFloat },
  },
  {
    key: 'singleMothersRate',
    label: '% Single Mothers (Recent Birth)',
    shortLabel: 'Single Mothers',
    description: 'Share of women 15–50 who had a birth in the past 12 months and are unmarried.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0038PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0038PE', parse: parseFloat },
  },
  {
    key: 'avgHouseholdSize',
    label: 'Average Household Size',
    shortLabel: 'Household Size',
    description: 'Mean number of people per occupied household unit.',
    format: v => `${v.toFixed(2)} ppl`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Social',
    queryNote: { endpoint: ACS, query: 'GET DP02_0016E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP02_0016E', parse: parseFloat },
  },

  // ── Housing (Census ACS DP04) ─────────────────────────────────────────────
  {
    key: 'medianHomeValue',
    label: 'Median Home Value',
    shortLabel: 'Home Value',
    description: 'Median self-reported value of owner-occupied housing units.',
    format: v => `$${v.toLocaleString()}`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0089E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0089E', parse: parseInt },
  },
  {
    key: 'medianMortgage',
    label: 'Median Monthly Mortgage',
    shortLabel: 'Monthly Mortgage',
    description: 'Median monthly housing cost for owner-occupied units with a mortgage.',
    format: v => `$${v.toLocaleString()}/mo`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0101E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0101E', parse: parseInt },
  },
  {
    key: 'medianRent',
    label: 'Median Gross Rent',
    shortLabel: 'Median Rent',
    description: 'Median monthly gross rent paid by renter-occupied households.',
    format: v => `$${v.toLocaleString()}/mo`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0134E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0134E', parse: parseInt },
  },
  {
    key: 'homeownerRate',
    label: '% Homeowners',
    shortLabel: 'Homeowners',
    description: 'Share of occupied housing units that are owner-occupied.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0046PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0046PE', parse: parseFloat },
  },
  {
    key: 'renterRate',
    label: '% Renters',
    shortLabel: 'Renters',
    description: 'Share of occupied housing units that are renter-occupied.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0047PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0047PE', parse: parseFloat },
  },
  {
    key: 'vacantHousingRate',
    label: '% Vacant Housing',
    shortLabel: 'Vacant Housing',
    description: 'Share of all housing units that are currently vacant.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0003PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0003PE', parse: parseFloat },
  },
  {
    key: 'noVehicleHousingRate',
    label: '% Households with No Vehicle',
    shortLabel: 'No-Car Households',
    description: 'Share of occupied housing units with zero vehicles available.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0058PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0058PE', parse: parseFloat },
  },
  {
    key: 'preWarHousingRate',
    label: '% Pre-War Housing (Built ≤1939)',
    shortLabel: 'Pre-War Housing',
    description: 'Share of housing units built in 1939 or earlier.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0026PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0026PE', parse: parseFloat },
  },
  {
    key: 'lackingPlumbingRate',
    label: '% Lacking Complete Plumbing',
    shortLabel: 'No Full Plumbing',
    description: 'Share of occupied housing units without complete plumbing facilities.',
    format: v => `${v.toFixed(2)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0073PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0073PE', parse: parseFloat },
  },
  {
    key: 'lackingKitchenRate',
    label: '% Lacking Complete Kitchen',
    shortLabel: 'No Full Kitchen',
    description: 'Share of occupied housing units without complete kitchen facilities.',
    format: v => `${v.toFixed(2)}%`,
    higherIsBetter: false,
    source: 'Census ACS',
    group: 'Housing',
    queryNote: { endpoint: ACS, query: 'GET DP04_0074PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP04_0074PE', parse: parseFloat },
  },

  // ── Demographics (Census ACS DP05) ────────────────────────────────────────
  {
    key: 'population',
    label: 'Total Population',
    shortLabel: 'Population',
    description: 'Total number of people residing in the county.',
    format: v => v.toLocaleString(),
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0001E · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0001E', parse: parseInt },
  },
  {
    key: 'under5Rate',
    label: '% Under Age 5',
    shortLabel: 'Under 5',
    description: 'Share of the total county population younger than 5 years old.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0005PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0005PE', parse: parseFloat },
  },
  {
    key: 'under18Rate',
    label: '% Under Age 18',
    shortLabel: 'Under 18',
    description: 'Share of the total county population younger than 18 years old.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0019PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0019PE', parse: parseFloat },
  },
  {
    key: 'over65Rate',
    label: '% Age 65 and Over',
    shortLabel: '65 and Over',
    description: 'Share of the total county population 65 years old or older.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0024PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0024PE', parse: parseFloat },
  },
  {
    key: 'hispanicRate',
    label: '% Hispanic or Latino',
    shortLabel: 'Hispanic/Latino',
    description: 'Share of the total population who identify as Hispanic or Latino of any race.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0076PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0076PE', parse: parseFloat },
  },
  {
    key: 'whiteNonHispanicRate',
    label: '% White Non-Hispanic',
    shortLabel: 'White Non-Hispanic',
    description: 'Share of the total population who identify as white alone and not Hispanic or Latino.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0079PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0079PE', parse: parseFloat },
  },
  {
    key: 'blackRate',
    label: '% Black or African American',
    shortLabel: 'Black / Afr. American',
    description: 'Share of the total population who identify as Black or African American alone.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0080PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0080PE', parse: parseFloat },
  },
  {
    key: 'asianRate',
    label: '% Asian',
    shortLabel: 'Asian',
    description: 'Share of the total population who identify as Asian alone.',
    format: v => `${v.toFixed(1)}%`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0082PE · 2023 ACS 5-Year estimate' },
    census: { var: 'DP05_0082PE', parse: parseFloat },
  },
  {
    key: 'sexRatio',
    label: 'Sex Ratio (Males per 100 Females)',
    shortLabel: 'Sex Ratio',
    description: 'Number of males per 100 females — values above 100 mean more men than women.',
    format: v => `${v.toFixed(1)}`,
    higherIsBetter: null,
    source: 'Census ACS',
    group: 'Demographics',
    queryNote: { endpoint: ACS, query: 'GET DP05_0002E (males) / DP05_0003E (females) × 100 · 2023 ACS 5-Year estimate' },
    census: {
      vars: ['DP05_0002E', 'DP05_0003E'],
      compute: (acs) => {
        const m = parseInt(acs['DP05_0002E']);
        const f = parseInt(acs['DP05_0003E']);
        return m && f ? Math.round((m / f) * 100 * 10) / 10 : null;
      },
    },
  },
];

// Display-only export consumed by the web app UI (MetricsPage, BattlePage, SummaryPage).
// Strips census/fetch internals — those are only needed by the engine.
export const METRICS = REGISTRY.map(({
  key, label, shortLabel, description, format,
  higherIsBetter, source, group, queryNote,
}) => ({ key, label, shortLabel, description, format, higherIsBetter, source, group, queryNote }));

export function getWinner(metricDef, countyA, countyB) {
  const a = countyA[metricDef.key];
  const b = countyB[metricDef.key];
  if (a == null || b == null || metricDef.higherIsBetter === null) return null;
  if (a === b) return 'tie';
  return (a > b) === metricDef.higherIsBetter ? 'A' : 'B';
}

export function getOverallWinner(countyA, countyB, metrics = METRICS) {
  let scoreA = 0, scoreB = 0;
  for (const m of metrics) {
    const w = getWinner(m, countyA, countyB);
    if (w === 'A') scoreA++;
    if (w === 'B') scoreB++;
  }
  if (scoreA > scoreB) return { winner: 'A', scoreA, scoreB, score: `${scoreA}–${scoreB}` };
  if (scoreB > scoreA) return { winner: 'B', scoreA, scoreB, score: `${scoreB}–${scoreA}` };
  return { winner: 'tie', scoreA, scoreB, score: `${scoreA}–${scoreB}` };
}
