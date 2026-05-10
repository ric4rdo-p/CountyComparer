import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getCountyData, getAllTexasCounties, getOverallWinner, getWinner, METRICS } from './data.js';

const server = new McpServer({
  name: 'tx-county-battle',
  version: '1.0.0',
  description: 'Query, compare, and rank all 254 Texas counties by demographic, economic, and Texas-specific indicators.',
});

// ── Tool: get_county ──────────────────────────────────────────────────────────
server.tool(
  'get_county',
  'Get demographic and economic data for a Texas county by name or 3-digit FIPS code.',
  {
    county: z.string().describe('County name (e.g. "Travis") or 3-digit FIPS code (e.g. "453")'),
  },
  async ({ county }) => {
    const all = await getAllTexasCounties();
    const match = all.find(c =>
      c.fips === county ||
      c.name.toLowerCase() === county.toLowerCase().replace(' county', '').trim() ||
      c.name.toLowerCase().includes(county.toLowerCase().replace(' county', '').trim())
    );
    if (!match) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `County not found: ${county}` }) }] };
    }
    const data = await getCountyData(match.fips);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Tool: compare_counties ────────────────────────────────────────────────────
server.tool(
  'compare_counties',
  'Head-to-head comparison of two Texas counties across economic and demographic metrics.',
  {
    county_a: z.string().describe('First county name or 3-digit FIPS code'),
    county_b: z.string().describe('Second county name or 3-digit FIPS code'),
  },
  async ({ county_a, county_b }) => {
    const all = await getAllTexasCounties();

    function findCounty(query) {
      return all.find(c =>
        c.fips === query ||
        c.name.toLowerCase() === query.toLowerCase().replace(' county', '').trim() ||
        c.name.toLowerCase().includes(query.toLowerCase().replace(' county', '').trim())
      );
    }

    const matchA = findCounty(county_a);
    const matchB = findCounty(county_b);

    if (!matchA) return { content: [{ type: 'text', text: JSON.stringify({ error: `County not found: ${county_a}` }) }] };
    if (!matchB) return { content: [{ type: 'text', text: JSON.stringify({ error: `County not found: ${county_b}` }) }] };

    const [dataA, dataB] = await Promise.all([
      getCountyData(matchA.fips),
      getCountyData(matchB.fips),
    ]);

    const breakdown = METRICS.map(m => {
      const w = getWinner(m, dataA, dataB);
      return {
        metric: m.label,
        [dataA.name]: dataA[m.key] != null ? m.format(dataA[m.key]) : null,
        [dataB.name]: dataB[m.key] != null ? m.format(dataB[m.key]) : null,
        winner: w === 'A' ? dataA.name : w === 'B' ? dataB.name : 'tie/neutral',
      };
    });

    const overall = getOverallWinner(dataA, dataB);
    const result = {
      overall_winner: overall.winner === 'A' ? dataA.name : overall.winner === 'B' ? dataB.name : 'tie',
      score: overall.score,
      breakdown,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: rank_counties ───────────────────────────────────────────────────────
server.tool(
  'rank_counties',
  'Rank Texas counties by a specific metric. Returns top or bottom N counties (max 50).',
  {
    metric: z.enum([
      // Economy
      'medianIncome', 'perCapitaIncome', 'unemploymentRate', 'povertyRate',
      'snapRate', 'laborForceRate', 'noVehicleWorkerRate', 'healthInsuranceRate', 'uninsuredRate',
      'salesTaxPerCapita', 'trustCompanies', 'stateBanks', 'moneyServicesBizPer100k',
      // Environment
      'envViolationsPer100k', 'petroleumSites',
      // People
      'collegeDegreeRate', 'medianAge', 'daycaresPerCapita', 'avgSchoolScore',
      'avgSuperintendentSalary', 'childRemovalsPer100k',
      // Lifestyle
      'commuteMinutes', 'boozeRevenuePerCapita', 'liquorLicensesPerCapita',
      'amusementOperatorsPer100k', 'tobaccoRetailersPer100k',
      // Society
      'custodialDeathsPer100k', 'juvenileReferralRate', 'criminalCasesPer100k',
      // Commute & Work
      'driveAloneRate', 'transitCommuteRate', 'walkToWorkRate', 'workFromHomeRate', 'governmentWorkerRate',
      // Industry
      'agricultureRate', 'constructionRate', 'manufacturingRate', 'retailRate',
      'transportationRate', 'informationRate', 'financeRate', 'professionalServicesRate',
      'educationHealthcareRate', 'artsFoodRate',
      // Social
      'graduateDegreeRate', 'highSchoolRate', 'collegeEnrollmentRate', 'veteranRate',
      'disabilityRate', 'foreignBornRate', 'englishOnlyRate', 'spanishAtHomeRate',
      'broadbandRate', 'singleMothersRate', 'avgHouseholdSize',
      // Housing
      'medianHomeValue', 'medianMortgage', 'medianRent', 'homeownerRate', 'renterRate',
      'vacantHousingRate', 'noVehicleHousingRate', 'preWarHousingRate',
      'lackingPlumbingRate', 'lackingKitchenRate',
      // Demographics
      'population', 'under5Rate', 'under18Rate', 'over65Rate',
      'hispanicRate', 'whiteNonHispanicRate', 'blackRate', 'asianRate', 'sexRatio',
    ]).describe('The metric to rank by'),
    order: z.enum(['highest', 'lowest']).default('highest').describe('Sort direction'),
    limit: z.number().min(1).max(50).default(10).describe('Number of results (max 50)'),
  },
  async ({ metric, order, limit }) => {
    const all = await getAllTexasCounties();

    // Fetch all county data in batches to avoid rate limiting
    const BATCH = 20;
    const results = [];
    for (let i = 0; i < all.length; i += BATCH) {
      const batch = all.slice(i, i + BATCH);
      const data = await Promise.all(batch.map(c => getCountyData(c.fips).catch(() => null)));
      results.push(...data.filter(Boolean));
    }

    const metricDef = METRICS.find(m => m.key === metric);
    const sorted = results
      .filter(c => c[metric] != null)
      .sort((a, b) => order === 'highest' ? b[metric] - a[metric] : a[metric] - b[metric])
      .slice(0, limit)
      .map((c, i) => ({
        rank: i + 1,
        county: c.name,
        value: metricDef.format(c[metric]),
        raw: c[metric],
      }));

    return { content: [{ type: 'text', text: JSON.stringify(sorted, null, 2) }] };
  }
);

// ── Start server ──────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
