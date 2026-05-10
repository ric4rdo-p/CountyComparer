import { fetchCountyData } from '../../shared/engine.js';

const CENSUS_KEY = import.meta.env.VITE_CENSUS_API_KEY ?? '';

export async function getCountyDataSafe(countyFips) {
  return fetchCountyData(countyFips, CENSUS_KEY);
}
