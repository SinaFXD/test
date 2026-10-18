/**
 * Derived values computed by the data pipeline (and unit-tested).
 * Pure functions only — no I/O.
 */
import { quarterOf, quarterStart } from './dates';

export type Obs = readonly [date: string, value: number];

export const round = (x: number, dp = 4): number => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};

/** Midpoint of the fed funds target range. */
export function fedFundsMid(upper: number, lower: number): number {
  return (upper + lower) / 2;
}

/**
 * Output gap in % of potential: 100 · (GDPC1 / GDPPOT − 1) for the latest
 * quarter present in both series. Returns null if there is no overlap.
 */
export function outputGap(
  gdp: readonly Obs[],
  potential: readonly Obs[],
): { value: number; date: string } | null {
  const pot = new Map(potential.map(([d, v]) => [d, v]));
  for (let i = gdp.length - 1; i >= 0; i--) {
    const [d, v] = gdp[i]!;
    const p = pot.get(d);
    if (p !== undefined && p > 0) return { value: 100 * (v / p - 1), date: d };
  }
  return null;
}

/**
 * Neutral real rate r* = longer-run SEP median fed funds − inflation target.
 * Falls back to 1.0 when the SEP value is unavailable.
 */
export function rStar(
  sepLongRunFunds: number | undefined,
  inflationTarget = 2,
  fallback = 1.0,
): { value: number; method: 'sep' | 'fallback' } {
  if (sepLongRunFunds === undefined || !Number.isFinite(sepLongRunFunds)) {
    return { value: fallback, method: 'fallback' };
  }
  return { value: sepLongRunFunds - inflationTarget, method: 'sep' };
}

export const PI_LR_BOUNDS = [1.5, 3.5] as const;

/**
 * Long-run inflation expectation on a PCE basis: the 5y5y-forward breakeven
 * (a CPI measure) minus a CPI–PCE wedge, clamped to [1.5, 3.5].
 */
export function piLR(
  fwd5y5y: number | undefined,
  wedge = 0.3,
  fallback = 2.0,
): { value: number; clamped: boolean; method: '5y5y' | 'fallback' } {
  if (fwd5y5y === undefined || !Number.isFinite(fwd5y5y)) {
    return { value: fallback, clamped: false, method: 'fallback' };
  }
  const raw = fwd5y5y - wedge;
  const value = Math.min(PI_LR_BOUNDS[1], Math.max(PI_LR_BOUNDS[0], raw));
  return { value, clamped: value !== raw, method: '5y5y' };
}

/** Value of a quarterly series for the quarter containing `iso` (or the latest earlier one). */
export function valueAtQuarter(obs: readonly Obs[], iso: string): Obs | null {
  const target = quarterStart(quarterOf(iso));
  let best: Obs | null = null;
  for (const o of obs) {
    if (o[0] <= target) best = o;
    else break;
  }
  return best;
}

/**
 * Average annualized growth of CBO potential GDP over the next `quarters`
 * quarters, starting from the quarter containing `iso`.
 */
export function potentialGrowth(
  potential: readonly Obs[],
  iso: string,
  quarters = 8,
): number | null {
  const start = quarterStart(quarterOf(iso));
  const i = potential.findIndex(([d]) => d === start);
  if (i < 0 || i + quarters >= potential.length) return null;
  const a = potential[i]![1];
  const b = potential[i + quarters]![1];
  if (!(a > 0 && b > 0)) return null;
  return 100 * ((b / a) ** (4 / quarters) - 1);
}

/** CPI–PCE wedge subtracted from the 5y5y breakeven (CPI basis) to get a PCE-basis anchor. */
export const PI_LR_WEDGE = 0.3;
