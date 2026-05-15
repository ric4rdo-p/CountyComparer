# Texas County Battle

Head-to-head comparison of all 254 Texas counties. Pick two counties, see a sportscaster-style battle card with winners per metric, and get an AI-generated summary — trash talk or professional report.

---

## Quick Start

```bash
# 1. Copy the env file and fill in your keys
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Run both the Vite dev server and the local API server in separate terminals:
npm run dev        # terminal 1 — Vite at localhost:5173
npm run dev:api    # terminal 2 — API proxy at localhost:3001

# Or use Vercel's CLI (handles both automatically):
vercel dev
```

## API Keys You Need

### Census API Key (required for county data)
- Sign up free at: https://api.census.gov/data/key_signup.html
- Takes ~2 minutes. No credit card.
- Add as `VITE_CENSUS_API_KEY` in `.env`

### OpenAI API Key (required for AI summaries)
- Get your key at: https://platform.openai.com/
- Add as `OPENAI_API_KEY` in `.env` (no `VITE_` prefix — it stays server-side)
- AI calls are routed through `/api/summary` (a Vercel serverless function), so the key is never bundled into the browser.

## MCP Server

The MCP server lets AI agents query county data programmatically.

```bash
cd mcp-server
npm install
CENSUS_API_KEY=your_key SOCRATA_APP_TOKEN=your_token node server.js
```

Tools: `get_county`, `compare_counties`, `rank_counties`. See [county-comparer-skill.md](./county-comparer-skill.md) for full documentation.

---

## Testing the CSV Upload Feature

The Metrics page includes a **"Add Custom Metric (CSV Upload)"** panel that lets you bring in any county-level dataset without touching code. It's a good way to explore the battle format with your own data or to prototype a metric before wiring it into the registry.

How it works:

1. Go to the Metrics page (after picking two counties) and expand the **+ Add Custom Metric (CSV Upload)** panel at the bottom.
2. Upload a CSV file that has at least one column for county names and one column for a numeric value.
3. Select which column is the county and which is the value. The tool normalizes county names automatically — it strips "County" suffixes and casing differences, so `Travis County`, `TRAVIS`, and `travis` all match.
4. Choose how to aggregate multiple rows per county: sum, count, average, max, or min.
5. Give the metric a name and set whether a higher or lower value wins.
6. Click **Add to Metrics** — the metric appears immediately in the battle alongside the standard data sources.

Note: custom CSV metrics are session-only and are lost on page refresh.

### Sample dataset: Texas Lottery winners

The repo includes [`src/data/lottery-winners.csv`](./src/data/lottery-winners.csv) as a ready-made test file. It contains prize claim records from the Texas Lottery for prizes above $1M, sourced from the Texas Open Data Portal.

Suggested configurations to try:

| Metric | County column | Value column | Aggregation | Direction |
|---|---|---|---|---|
| Number of big winners | `Payee County` | any | Count | Higher wins |
| Total prize money claimed | `Paid Amount` | `Paid Amount` | Sum | Higher wins |
| Largest single prize | `Paid Amount` | `Paid Amount` | Max | Higher wins |

> **Privacy notice:** This dataset is publicly available through the Texas Lottery Commission via the Texas Open Data Portal and contains information about lottery prizes above $1,000,000. It includes the names, cities, and counties of prize recipients, as this information is a matter of public record under Texas law. The data is used here solely as a sample for testing the CSV import feature. No warranty is made regarding its completeness or accuracy.

---

## Contributing

Want to add new metrics or connect a new data source? See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Tailwind CSS v4 |
| Build | Vite 5 |
| Federal data | Census Bureau ACS 5-Year (2023) |
| State data | Texas Open Data Portal (Socrata) |
| AI layer | OpenAI `gpt-4o-mini` |
| MCP server | Node.js 18+ + `@modelcontextprotocol/sdk` |
| Deploy | Vercel |

---

## Known Limitations

Data quality
- ACS estimates for counties under ~10,000 people carry margins of
error that can make comparisons meaningless — a county showing 8%
poverty vs 12% might actually be identical within the confidence
interval
- Several ODP datasets lag by a full reporting cycle — juvenile
referral data is from 2021, criminal caseload and CPS removals may be a
year behind
- sex ratio and all demographic rates use the Census binary male/female
count — doesn't reflect gender diversity
- ODP data quality varies wildly by dataset; some smaller counties have
zero rows in certain tables, which returns null and shows — rather
than an actual zero

Architecture
- No caching — every county selection makes 4+ parallel Census calls
and 17 ODP calls from scratch. Switching counties repeatedly will
hammer the APIs and slow the UI
- Custom CSV metrics uploaded in the Metrics tab are lost on page
refresh — there's no persistence

MCP server
- rank_counties fetches all 254 counties in serial batches — takes
20–40 seconds and will fail or time out if the Census API is
rate-limiting
- The MCP server has no caching either, so repeated calls for the same
county fetch fresh data every time
- Currently only locally usable

Scoring
- All metrics are weighted equally — median income counts the same as
amusement machine operators per 100k. There's currently no way to weight metrics
by importance
- Neutral metrics (higherIsBetter: null) don't affect the score at all,
so adding lots of neutral metrics inflates the total count without
changing the outcome
- Counties are compared as whole administrative units — Travis County
includes all of Austin plus rural areas, which can make it a poor proxy
for "Austin" vs "Houston"

UI
- The PNG export via html-to-image can fail if web fonts (Rye, DM Serif
Display) haven't fully loaded when the snapshot is taken, producing
fallback fonts in the downloaded image
- No mobile layout — the battle table and metrics page are designed for
desktop widths

---

## Next Steps

1. Fix the limitations that are not architectural decisions (e.g. the UI limitations, the request caching, and the custom metric persistence)
2. Push the project to production (hosting the website, getting a domain name, making the MCP server public)
3. Push for open source contributions to this tool

---

## Data Attribution

> Data sourced from the U.S. Census Bureau American Community Survey 5-Year Estimates (2023). This product uses the Census Bureau Data API but is not endorsed or certified by the Census Bureau.

> Texas-specific data sourced from the Texas Open Data Portal (data.texas.gov), including datasets from the Texas Comptroller of Public Accounts, Texas Alcoholic Beverage Commission (TABC), Texas Education Agency, Texas Commission on Environmental Quality, and other state agencies. Used in accordance with the Texas Open Data Portal Terms of Service.
