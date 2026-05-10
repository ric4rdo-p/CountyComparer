# Texas County Comparer — Agent Skill

## What it does

Lets an agent answer questions about any of Texas's 254 counties using real, current public data. An agent can look up a single county's full demographic and economic profile, run a head-to-head comparison between two counties across 74 indicators, or rank all counties statewide by any one metric. Data comes from the U.S. Census Bureau's American Community Survey and a suite of Texas state agency datasets — covering everything from median household income and commute times to alcohol revenue per person, school accountability scores, active petroleum contamination sites, and juvenile referral rates. The skill is designed for questions where a real data-backed answer matters: relocation decisions, regional journalism, economic development research, and competitive county analysis.

---

## When to use it

Reach for this skill when a user asks anything involving:

- Comparing two Texas counties against each other on any dimension
- Finding the best or worst Texas counties for a specific criterion
- Looking up factual data about a named Texas county
- Questions about cost of living, income, education, housing, or safety in Texas
- Regional Texas context for business, policy, or personal decisions

**Trigger phrases:**
- "which Texas county…", "compare [city/county] to [city/county]", "best county in Texas for…", "worst county for…", "how does [county] rank…", "top 10 Texas counties by…", "is [county] better than [county]", "should I move to [county]", "is [county] a good place to raise kids"

---

## Tools available

### `get_county`
Fetches the full data profile for a single Texas county.

**Input:**
| Parameter | Type | Description |
|---|---|---|
| `county` | string | County name (e.g. `"Travis"`) or 3-digit FIPS code (e.g. `"453"`) |

**Output:** A JSON object with 74 fields covering population, income, employment, education, housing, demographics, commute patterns, industry mix, and Texas-specific indicators. Key fields:

```
name, population, fips
medianIncome, perCapitaIncome, unemploymentRate, povertyRate
collegeDegreeRate, graduateDegreeRate, highSchoolRate
commuteMinutes, workFromHomeRate, driveAloneRate
medianHomeValue, medianRent, medianMortgage, homeownerRate
boozeRevenuePerCapita, liquorLicensesPerCapita, amusementOperatorsPer100k
avgSchoolScore, daycaresPerCapita, childRemovalsPer100k
custodialDeathsPer100k, criminalCasesPer100k, juvenileReferralRate
envViolationsPer100k, petroleumSites
hispanicRate, blackRate, asianRate, whiteNonHispanicRate, sexRatio
broadbandRate, veteranRate, disabilityRate, foreignBornRate
```

**Example call:**
```json
{ "county": "Travis" }
```

**Use when:** The user asks about a single county, or you need data before forming a comparison manually.

---

### `compare_counties`
Head-to-head comparison of two counties across all 74 metrics with per-metric winners and an overall score.

**Input:**
| Parameter | Type | Description |
|---|---|---|
| `county_a` | string | First county name or 3-digit FIPS code |
| `county_b` | string | Second county name or 3-digit FIPS code |

**Output:** JSON with `overall_winner`, `score` (e.g. `"42–28"`), and a `breakdown` array — one entry per metric — each containing the formatted value for both counties and which county won that metric.

**Example call:**
```json
{ "county_a": "Travis", "county_b": "Harris" }
```

**Use when:** The user wants to compare two specific counties, or asks which of two places is better for a particular lifestyle or purpose. Pull the breakdown and filter to the metrics most relevant to the user's question.

---

### `rank_counties`
Ranks all 254 Texas counties by a single metric, returning the top or bottom N.

**Input:**
| Parameter | Type | Description |
|---|---|---|
| `metric` | enum (string) | The metric to rank by — see full list below |
| `order` | `"highest"` \| `"lowest"` | Direction of ranking (default: `"highest"`) |
| `limit` | number 1–50 | How many results to return (default: 10) |

**Output:** Ranked array with `rank`, `county`, `value` (formatted), and `raw` (numeric).

**Example calls:**
```json
{ "metric": "medianIncome", "order": "highest", "limit": 10 }
{ "metric": "povertyRate", "order": "highest", "limit": 5 }
{ "metric": "commuteMinutes", "order": "lowest", "limit": 10 }
{ "metric": "avgSchoolScore", "order": "highest", "limit": 15 }
```

**Use when:** The user wants to find the best or worst counties statewide for something, or wants a leaderboard-style answer.

**Full metric list for `rank_counties`:**

| Group | Available metrics |
|---|---|
| Economy | `medianIncome` `perCapitaIncome` `unemploymentRate` `povertyRate` `snapRate` `laborForceRate` `noVehicleWorkerRate` `healthInsuranceRate` `uninsuredRate` `salesTaxPerCapita` `trustCompanies` `stateBanks` `moneyServicesBizPer100k` |
| Environment | `envViolationsPer100k` `petroleumSites` |
| People | `collegeDegreeRate` `medianAge` `daycaresPerCapita` `avgSchoolScore` `avgSuperintendentSalary` `childRemovalsPer100k` |
| Lifestyle | `commuteMinutes` `boozeRevenuePerCapita` `liquorLicensesPerCapita` `amusementOperatorsPer100k` `tobaccoRetailersPer100k` |
| Society | `custodialDeathsPer100k` `juvenileReferralRate` `criminalCasesPer100k` |
| Commute & Work | `driveAloneRate` `transitCommuteRate` `walkToWorkRate` `workFromHomeRate` `governmentWorkerRate` |
| Industry | `agricultureRate` `constructionRate` `manufacturingRate` `retailRate` `transportationRate` `informationRate` `financeRate` `professionalServicesRate` `educationHealthcareRate` `artsFoodRate` |
| Social | `graduateDegreeRate` `highSchoolRate` `collegeEnrollmentRate` `veteranRate` `disabilityRate` `foreignBornRate` `englishOnlyRate` `spanishAtHomeRate` `broadbandRate` `singleMothersRate` `avgHouseholdSize` |
| Housing | `medianHomeValue` `medianMortgage` `medianRent` `homeownerRate` `renterRate` `vacantHousingRate` `noVehicleHousingRate` `preWarHousingRate` `lackingPlumbingRate` `lackingKitchenRate` |
| Demographics | `population` `under5Rate` `under18Rate` `over65Rate` `hispanicRate` `whiteNonHispanicRate` `blackRate` `asianRate` `sexRatio` |

> **Note:** `rank_counties` fetches all 254 counties in batches — expect 20–40 seconds for a response. Do not call it more than once per user turn.

---

## Example prompts this skill can answer

1. "Which Texas county is the best for families with young kids?"
2. "Compare Austin and Houston — which metro area has better schools and lower crime?"
3. "Where in Texas has the lowest cost of living?"
4. "What are the top 10 counties by median household income?"
5. "Is Bexar County or Tarrant County better for young professionals?"
6. "Which Texas counties have the most liquor licenses per capita?"
7. "How does El Paso County compare to Dallas County on education and housing?"
8. "Which Texas counties have the worst broadband access?"
9. "What's the most agricultural county in Texas?"
10. "Which county has the highest rate of work-from-home residents?"

---

## Data sources and attribution

| Source | Covers | Attribution |
|---|---|---|
| U.S. Census Bureau ACS 5-Year Estimates (2023) | Income, education, commute, housing, demographics, industry, social indicators | U.S. Census Bureau — not endorsed by Census Bureau |
| TX Comptroller Mixed Beverage Gross Receipts (`naix-2893`) | Alcohol revenue by county | Texas Comptroller of Public Accounts — data.texas.gov |
| TX Alcoholic Beverage Commission (`7hf9-qc9f`) | Active liquor licenses | Texas Alcoholic Beverage Commission — data.texas.gov |
| TX Comptroller Sales Tax Allocation (`53pa-m7sm`) | Sales tax revenue by county | Texas Comptroller of Public Accounts — data.texas.gov |
| TX Comptroller Amusement Machine Operators (`ryd4-r7mh`) | Coin-op amusement operators | Texas Comptroller of Public Accounts — data.texas.gov |
| TX Comptroller Tobacco Retailers (`n4rp-ar9b`) | Licensed tobacco retailers | Texas Comptroller of Public Accounts — data.texas.gov |
| TX Dept. of Banking — Trust Companies (`2hc4-g945`) | State-chartered trust companies | Texas Department of Banking — data.texas.gov |
| TX Dept. of Banking — State Banks (`yvbr-mkqg`) | State-chartered banks | Texas Department of Banking — data.texas.gov |
| TX Dept. of Banking — Money Services (`j48w-wspg`) | Payday lenders and check-cashers | Texas Department of Banking — data.texas.gov |
| TCEQ Notices of Violation (`mwzi-gyw7`) | Environmental violations | TX Commission on Environmental Quality — data.texas.gov |
| TCEQ Petroleum Storage Tank Sites (`hedz-nn4q`) | Active contamination sites | TX Commission on Environmental Quality — data.texas.gov |
| TX Education Agency School Ratings (`nui6-x374`) | School district accountability scores | Texas Education Agency — data.texas.gov |
| TX Education Agency Superintendent Pay (`6dh5-cse4`) | Superintendent salaries | Texas Education Agency — data.texas.gov |
| TX HHSC Licensed Childcare (`bc5r-88dy`) | Licensed daycare operations | TX Health and Human Services — data.texas.gov |
| TX DFPS Child Removals (`xmtn-e5c8`) | CPS child removals FY2025 | TX Dept. of Family and Protective Services — data.texas.gov |
| TX OAG Custodial Deaths (`ypvi-69jj`) | Deaths in law enforcement custody | Texas Office of the Attorney General — data.texas.gov |
| TJJD Juvenile Referrals (`54dk-5ghb`) | Juvenile justice referrals (2021) | TX Juvenile Justice Department — data.texas.gov |
| TX OCA Criminal Caseload (`hp5g-u8vi`) | Criminal cases filed in courts | TX Office of Court Administration — data.texas.gov |

When citing data in a response, use phrasing like: *"According to the U.S. Census Bureau's 2023 ACS 5-Year Estimates..."* or *"Texas Open Data Portal data shows..."*

---

## Limitations and safe use

**Data reliability by county size:**
ACS estimates for counties with fewer than 10,000 residents carry higher margins of error — sometimes ±5 percentage points on rate fields. Treat small-county comparisons as directional, not precise. When a metric returns `null`, the county population is likely too small for a reliable estimate.

**Texas ODP data lag:**
State agency datasets on data.texas.gov are updated on varying schedules — monthly, quarterly, or annually. Criminal caseload, school ratings, and CPS removals may reflect data that is one reporting cycle behind. Do not use them as real-time figures.

**ACS is survey data, not a census:**
All Census ACS fields are estimates with confidence intervals, not exact counts. Income, poverty, and percentage fields in particular should be described with language like "approximately" or "an estimated."

**Juvenile referral data:**
The TJJD dataset currently reflects 2021 figures. This is the most recent year available and should be labeled accordingly.

**Sex ratio:**
The `sexRatio` field is computed from binary male/female census counts. It does not reflect non-binary or gender-diverse residents and should be contextualized accordingly.

**Do not use this skill for:**
- Legal or regulatory decisions of any kind
- Fair housing, lending, or employment screening — county-level demographic data must never inform individual eligibility
- Medical, public health, or emergency response planning without additional professional review
- Presenting any metric as current if it may be from a prior reporting year

**County name input:**
Pass county names without "County" — `"Travis"` not `"Travis County"`. The tools handle normalization internally.
