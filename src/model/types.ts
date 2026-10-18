/** Starting point of every simulation (t = 0), taken from the latest data. */
export interface InitialConditions {
  /** Policy rate: fed funds target midpoint, %. */
  i0: number;
  /** Core PCE inflation, % y/y. */
  pi0: number;
  /** Headline PCE inflation, % y/y. */
  piHeadline0: number;
  /** Unemployment rate, %. */
  u0: number;
  /** Natural rate of unemployment (CBO), %. */
  uStar: number;
  /** Output gap, % of potential. */
  y0: number;
  /** Latest real GDP growth, % annualized. */
  g0: number;
  /** Neutral real rate, %. */
  rStar: number;
  /** Long-run inflation expectation (PCE basis), %. */
  piLR: number;
  /** Potential GDP growth, % annualized. */
  gPot: number;
  /** 2-year and 10-year Treasury yields today, %. */
  dgs2: number;
  dgs10: number;
  /** 30y mortgage rate minus 10y Treasury, pp. */
  mortgageSpread: number;
  /** Approximate market-implied policy path for quarters t = 1..M (%, fed-funds-mid terms). */
  marketPath: readonly number[];
}

export type BaselineMode = 'market' | 'rule';

/** What the user changes. All zeros ⇒ scenario ≡ baseline. */
export interface ScenarioInputs {
  /** Change in the policy rate vs the baseline path, percentage points. */
  policyChange: number;
  /** Quarters the change is held before the rule takes over (1–8). */
  holdQuarters: number;
  /** Core inflation shock at t=1, pp. */
  inflationShock: number;
  /** AR(1) persistence of the inflation shock (0–0.95). */
  shockPersistence: number;
  /** Demand shock to the output gap at t=1, pp. */
  demandShock: number;
  /** Oil price shock, % change in the oil price. */
  oilShock: number;
  /** Scenario overrides (undefined ⇒ default / data value). */
  phiPi?: number;
  lambda?: number;
  rStar?: number;
  horizon: number;
  baselineMode: BaselineMode;
}

export const PATH_KEYS = [
  'i',
  'r',
  'pie',
  'pi',
  'piH',
  'y',
  'u',
  'g',
  'y2',
  'y10',
  'mort',
  'usd',
  'eq',
  'house',
  'inv',
] as const;

export type PathKey = (typeof PATH_KEYS)[number];

/** One simulated path per variable, index t = 0..H. */
export type PathSet = Record<PathKey, Float64Array>;

export interface SimResult {
  horizon: number;
  baseline: PathSet;
  scenario: PathSet;
}
