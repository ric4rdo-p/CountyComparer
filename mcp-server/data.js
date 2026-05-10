// MCP server data layer — driven by the shared registry and engine.
// Requires Node 18+ (native fetch). No external fetch dependency needed.

import { fetchCountyData, getAllTexasCounties } from '../shared/engine.js';
import { METRICS, getWinner, getOverallWinner } from '../shared/registry.js';

const CENSUS_KEY = process.env.CENSUS_API_KEY ?? '';

export { METRICS, getWinner, getOverallWinner };

export function getCountyData(countyFips) {
  return fetchCountyData(countyFips, CENSUS_KEY);
}

export { getAllTexasCounties };
