// Census helpers for the web app.
// County data fetching is handled by shared/engine.js via src/api/county.js.

import { getAllTexasCounties as _getAllTexasCounties } from '../../shared/engine.js';

const CENSUS_KEY = import.meta.env.VITE_CENSUS_API_KEY ?? '';

export function getAllTexasCounties() {
  return _getAllTexasCounties(CENSUS_KEY);
}
