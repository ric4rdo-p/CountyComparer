# Census ACS 5-Year Variables — County Level
> Source: U.S. Census Bureau American Community Survey 5-Year Estimates (2023)
> Base endpoint: `https://api.census.gov/data/2023/acs/acs5/profile`
> `E` suffix = estimate (raw number) · `PE` suffix = percentage

---

## Economy (DP03)

| Variable | Code | Note | Better |
|---|---|---|---|
| Median household income | `DP03_0062E` | 2023 inflation-adjusted dollars | Higher |
| Per capita income | `DP03_0088E` | Average income per person | Higher |
| Unemployment rate | `DP03_0009PE` | % of civilian labor force | Lower |
| % on SNAP benefits | `DP03_0074PE` | Households receiving food stamps | Lower |
| % below poverty line | `DP03_0119PE` | All people | Lower |
| % in labor force | `DP03_0002PE` | Population 16+ | Higher |
| % government workers | `DP03_0042PE` | Of employed civilian population 16+ | Neutral |
| % with no vehicle | `DP03_0057PE` | Occupied housing units | Lower |
| Mean commute time | `DP03_0025E` | Minutes, workers 16+ | Lower |
| % drive alone to work | `DP03_0019PE` | Workers 16+ | Neutral |
| % take transit to work | `DP03_0021PE` | Workers 16+ | Neutral |
| % walk to work | `DP03_0022PE` | Workers 16+ | Neutral |
| % work from home | `DP03_0024PE` | Workers 16+ | Neutral |
| % with health insurance | `DP03_0096PE` | Civilian noninstitutionalized pop | Higher |
| % without health insurance | `DP03_0099PE` | Civilian noninstitutionalized pop | Lower |

---

## Social (DP02)

| Variable | Code | Note | Better |
|---|---|---|---|
| % with bachelor's degree+ | `DP02_0068PE` | Population 25+ | Higher |
| % with graduate degree | `DP02_0066PE` | Population 25+ | Higher |
| % high school graduate+ | `DP02_0067PE` | Population 25+ | Higher |
| % enrolled in college | `DP02_0058PE` | Population 3+ | Higher |
| % veterans | `DP02_0069PE` | Civilian population 18+ | Neutral |
| % with disability | `DP02_0072PE` | Civilian noninstitutionalized pop | Neutral |
| % foreign born | `DP02_0094PE` | Total population | Neutral |
| % speak English only | `DP02_0113PE` | Population 5+ | Neutral |
| % speak Spanish at home | `DP02_0116PE` | Population 5+ | Neutral |
| % with broadband | `DP02_0154PE` | Households with broadband subscription | Higher |
| % single mothers | `DP02_0038PE` | Women 15–50 with birth in past 12 months | Neutral |
| Average household size | `DP02_0016E` | People per household | Neutral |

---

## Housing (DP04)

| Variable | Code | Note | Better |
|---|---|---|---|
| Median home value | `DP04_0089E` | Owner-occupied units | Neutral |
| Median monthly mortgage | `DP04_0101E` | Units with a mortgage | Lower |
| Median gross rent | `DP04_0134E` | Renter-occupied units | Lower |
| % homeowners | `DP04_0046PE` | Owner-occupied housing units | Neutral |
| % renters | `DP04_0047PE` | Renter-occupied units | Neutral |
| % vacant housing | `DP04_0003PE` | Of all housing units | Lower |
| % no vehicle at home | `DP04_0058PE` | Occupied housing units | Lower |
| % pre-war housing | `DP04_0026PE` | Built 1939 or earlier | Neutral |
| Total housing units | `DP04_0001E` | All housing units in county | Neutral |
| % lacking complete plumbing | `DP04_0073PE` | Occupied housing units | Lower |
| % lacking complete kitchen | `DP04_0074PE` | Occupied housing units | Lower |

---

## Demographics (DP05)

| Variable | Code | Note | Better |
|---|---|---|---|
| Total population | `DP05_0001E` | Total county population | Neutral |
| Median age | `DP05_0018E` | Years | Neutral |
| % under 5 | `DP05_0005PE` | Of total population | Neutral |
| % under 18 | `DP05_0019PE` | Of total population | Neutral |
| % 65 and over | `DP05_0024PE` | Of total population | Neutral |
| % Hispanic or Latino | `DP05_0076PE` | Any race | Neutral |
| % white non-Hispanic | `DP05_0079PE` | Of total population | Neutral |
| % Black or African American | `DP05_0080PE` | Of total population | Neutral |
| % Asian | `DP05_0082PE` | Of total population | Neutral |
| Sex ratio | `DP05_0003E` | Males per 100 females | Neutral |

---

## Industry (DP03)

| Variable | Code | Note | Better |
|---|---|---|---|
| % in agriculture | `DP03_0033PE` | Civilian employed 16+ | Neutral |
| % in construction | `DP03_0034PE` | Civilian employed 16+ | Neutral |
| % in manufacturing | `DP03_0035PE` | Civilian employed 16+ | Neutral |
| % in retail trade | `DP03_0037PE` | Civilian employed 16+ | Neutral |
| % in transportation/utilities | `DP03_0038PE` | Civilian employed 16+ | Neutral |
| % in information | `DP03_0039PE` | Civilian employed 16+ | Neutral |
| % in finance/real estate | `DP03_0040PE` | Civilian employed 16+ | Neutral |
| % in professional services | `DP03_0041PE` | Science, mgmt, admin 16+ | Neutral |
| % in education/healthcare | `DP03_0043PE` | Civilian employed 16+ | Neutral |
| % in arts/food service | `DP03_0044PE` | Entertainment, accommodation 16+ | Neutral |

---

## Usage

Fetch multiple variables in a single API call by joining codes with commas:

```js
const vars = [
  'NAME',
  'DP03_0062E',   // median household income
  'DP03_0009PE',  // unemployment rate
  'DP02_0068PE',  // % bachelor's degree+
  'DP04_0089E',   // median home value
  'DP05_0018E',   // median age
].join(',');

const url = `https://api.census.gov/data/2023/acs/acs5/profile`
  + `?get=${vars}`
  + `&for=county:${countyFips}`
  + `&in=state:48`
  + `&key=${CENSUS_KEY}`;
```

> Each profile group (DP02, DP03, DP04, DP05) is a separate API call. You can mix variables from different groups in one call — the Census API handles it.

---

## Attribution

> Data sourced from the U.S. Census Bureau American Community Survey 5-Year Estimates (2023). This product uses the Census Bureau Data API but is not endorsed or certified by the Census Bureau.
