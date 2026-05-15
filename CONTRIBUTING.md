# Contributing Data

Anyone can add new metrics or connect entirely new data sources. The architecture is designed so that the hard parts (batching, parallelism, MCP exposure) are handled for you — you just describe the metric and write one function.

**All metrics live in a single file: [`shared/registry.js`](./shared/registry.js).** Adding an entry there automatically makes it available everywhere: the web app UI, the battle scoring, the AI summary, and the MCP server tools. No other files need to change.

## How the data layer works

Each metric in the registry is a self-contained object with display fields (`key`, `label`, `format`, etc.) plus exactly one of:

- **`census: { var, parse }`** — pulls a variable from the Census ACS API. The engine batches all Census vars into 4 parallel calls at fetch time, so there's no cost to adding more.
- **`fetch: async ({ countyName, countyFips, population }) => number | null`** — calls any external API you want. All `fetch` functions run in parallel. This is how every Texas ODP metric works, and it's how you'd connect a brand new data source.

That's the whole model. If your data source has a public REST API, you can add it without touching anything outside `shared/registry.js`.

---

## Adding a metric from an existing source

### Census ACS

The Census Bureau publishes hundreds of variables across four profile tables (DP02–DP05). Find your variable code at [api.census.gov/data/2023/acs/acs5/profile/variables.json](https://api.census.gov/data/2023/acs/acs5/profile/variables.json).

```js
{
  key: 'myNewMetric',           // camelCase, unique across the registry
  label: 'Full Label',          // shown in the MetricsPage list
  shortLabel: 'Short',          // shown on battle rows and share card (≤14 chars)
  description: 'What it measures and why it matters.',
  format: v => `${v.toFixed(1)}%`,  // how to display the value
  higherIsBetter: true,         // true | false | null (null = neutral, no winner scored)
  source: 'Census ACS',
  group: 'Economy',             // Economy | Environment | People | Lifestyle | Society |
                                // Commute & Work | Industry | Social | Housing | Demographics
  queryNote: {
    endpoint: 'api.census.gov/data/2023/acs/acs5/profile',
    query: 'GET DP03_XXXXE · 2023 ACS 5-Year estimate',
  },
  census: { var: 'DP03_XXXXE', parse: parseFloat },  // use parseInt for dollar/count values
},
```

### Texas Open Data Portal (Socrata)

Browse datasets at [data.texas.gov](https://data.texas.gov). Each dataset has a resource ID in its URL (e.g. `mwzi-gyw7`). Use the Socrata query builder to find the right `$select` and `$where` params.

The `fetch` function receives `{ countyName, countyFips, population }` and must return a number or `null`. It runs in parallel with all other fetches.

```js
{
  key: 'myOdpMetric',
  label: 'Full Label',
  shortLabel: 'Short',
  description: 'What it measures and why it matters.',
  format: v => `${v.toFixed(1)}/100k`,
  higherIsBetter: false,
  source: 'TX Agency Name',
  group: 'Society',
  queryNote: {
    endpoint: 'data.texas.gov/resource/DATASET-ID.json',
    query: "SELECT count(*) WHERE county='{county}' · per 100k pop",
  },
  fetch: async ({ countyName, population }) => {
    // normalizeCountyName → ALL CAPS, no "County" suffix (used by most ODP datasets)
    // shortCountyName     → title case, no "County" suffix (used by some TABC/TEA datasets)
    // txCountyCode        → TX sequential county code from FIPS (used by Comptroller datasets)
    // perCapita(count, population, scale) → count / population * scale, rounded to 1dp
    // safeInt / safeFloat → parse without throwing on null/NaN
    // odp(path)           → fetch from data.texas.gov/resource/{path}, returns JSON or null
    const norm = normalizeCountyName(countyName);
    const data = await odp(
      `DATASET-ID.json?county=${encodeURIComponent(norm)}&$select=count(*) as cnt&$limit=1`
    );
    return perCapita(safeInt(data?.[0]?.cnt), population);
  },
},
```

All helper functions (`odp`, `normalizeCountyName`, `shortCountyName`, `txCountyCode`, `perCapita`, `safeInt`, `safeFloat`) are imported at the top of `shared/registry.js` — just use them in your `fetch` function.

**County name formats across ODP datasets** — different Texas datasets use different formats. Check what format the dataset uses before writing your query:

| Format | Example | Helper | Used by |
|---|---|---|---|
| ALL CAPS, no "County" | `TRAVIS` | `normalizeCountyName(countyName)` | TCEQ, HHSC, Amusement, Tobacco |
| Title case, no "County" | `Travis` | `shortCountyName(countyName)` | TABC, TEA, custodial deaths, courts |
| TX sequential code | `227` | `txCountyCode(countyFips)` | TX Comptroller mixed beverage |
| ALL CAPS + " COUNTY" | `TRAVIS COUNTY` | `normalizeCountyName(countyName) + ' COUNTY'` | TEA superintendent pay |

When in doubt, open the dataset on data.texas.gov and inspect a few rows to see the exact county field format.

---

## Adding a brand new data source

If you want to pull from a data source that isn't already in the registry, the process depends on whether the API requires authentication:

### No API key required

Write a `fetch` function that calls the API directly. Since `fetch` functions run in the browser, the URL must allow cross-origin requests (CORS). Most government open data portals do.

```js
fetch: async ({ countyFips }) => {
  const res = await fetch(`https://some-public-api.gov/data?fips=${countyFips}`);
  if (!res.ok) return null;
  const data = await res.json();
  return safeFloat(data?.value);
},
```

### API key required (low sensitivity — e.g. a free public data portal key)

Add the key to `.env` with a `VITE_` prefix so Vite makes it available in the browser bundle:

```
VITE_MY_SOURCE_API_KEY=your_key_here
```

Then read it in your fetch function:

```js
fetch: async ({ countyFips }) => {
  const key = import.meta.env.VITE_MY_SOURCE_API_KEY;
  const res = await fetch(`https://api.example.com/data?fips=${countyFips}&key=${key}`);
  ...
},
```

Note: keys with a `VITE_` prefix are visible in the browser bundle. Only use this for keys that are safe to expose publicly (rate-limited, low-value free-tier keys).

### API key required (sensitive — must stay server-side)

For keys that must never be exposed in the browser (paid APIs, keys with broad access):

1. **Create a serverless proxy** at `api/your-source.js` — modeled after `api/summary.js`. It reads the key from `process.env` server-side and proxies the call.

```js
// api/your-source.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const apiKey = process.env.MY_SOURCE_API_KEY;  // no VITE_ prefix
  const { countyFips } = req.body;
  const upstream = await fetch(`https://api.example.com/data?fips=${countyFips}&key=${apiKey}`);
  const data = await upstream.json();
  res.status(200).json(data);
}
```

2. **Add the key** to Vercel's environment variables (no `VITE_` prefix) and to your local `.env`.

3. **Call your proxy** from the registry fetch function:

```js
fetch: async ({ countyFips }) => {
  const res = await fetch('/api/your-source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ countyFips }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return safeFloat(data?.value);
},
```

4. **Register the local dev route** in `api/dev-server.js` so it works during `npm run dev:api`.

---

## After adding your metric

1. Run `npm run dev` + `npm run dev:api` and navigate to the Metrics tab — your metric should appear in its group.
2. Select two counties and run the battle to confirm the value renders correctly.
3. If the value shows `—`, the fetch returned `null` — check the API response shape, county name format, or field name in your query.
4. Add your metric key to [`src/utils/presets.js`](./src/utils/presets.js) if you want it included in the Fun or Professional default preset.
