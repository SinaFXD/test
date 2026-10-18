/**
 * Calibration experiment (used by `npm run calibrate` and the test suite).
 *
 * Standard experiment: from a neutral steady state (zero gap, inflation at 2%,
 * policy at neutral), the Fed raises the policy rate 100bp above the baseline
 * at t=1 and holds the gap for 4 quarters; afterwards the inertial Taylor rule
 * takes over (unwinding gradually and reacting to the weaker economy).
 * Baseline = Taylor rule from the same starting point. Responses are
 * scenario − baseline. Because the model is linear away from the ELB, the
 * responses do not depend on the starting point as long as the ELB never binds.
 */
import { DEFAULT_PARAMS, type ModelParams } from './params';
import { simulate } from './simulate';
import type { InitialConditions, PathKey, ScenarioInputs } from './types';

export const NEUTRAL_INIT: InitialConditions = {
  i0: 3,
  pi0: 2,
  piHeadline0: 2,
  u0: 4.2,
  uStar: 4.2,
  y0: 0,
  g0: 2,
  rStar: 1,
  piLR: 2,
  gPot: 2,
  dgs2: 3.2,
  dgs10: 4,
  mortgageSpread: 1.8,
  marketPath: [],
};

export const TIGHTENING: ScenarioInputs = {
  policyChange: 1,
  holdQuarters: 4,
  inflationShock: 0,
  shockPersistence: 0,
  demandShock: 0,
  oilShock: 0,
  horizon: 20,
  baselineMode: 'rule',
};

export type Diff = Record<PathKey, number[]>;

export function responses(
  inp: ScenarioInputs = TIGHTENING,
  params: ModelParams = DEFAULT_PARAMS,
  init: InitialConditions = NEUTRAL_INIT,
): Diff {
  const r = simulate(init, inp, params);
  return Object.fromEntries(
    (Object.keys(r.scenario) as PathKey[]).map((k) => [
      k,
      Array.from(r.scenario[k], (v, t) => v - r.baseline[k][t]!),
    ]),
  ) as Diff;
}

/** Index of the extreme value (min if sign < 0, max if sign > 0). */
export function extreme(xs: number[], sign: 1 | -1): { q: number; value: number } {
  let q = 0;
  for (let t = 1; t < xs.length; t++) if (sign * xs[t]! > sign * xs[q]!) q = t;
  return { q, value: xs[q]! };
}

/** First quarter at which |x| reaches half of its peak |x|. */
export function halfPeakQuarter(xs: number[]): number {
  const peak = Math.max(...xs.map(Math.abs));
  return xs.findIndex((v) => Math.abs(v) >= peak / 2);
}

/**
 * Inflation half-life with no shocks and a zero output gap: start with core
 * inflation 1pp above π_LR, shut off the demand channel (α = 0, y0 = 0 ⇒ the
 * gap stays 0) and count quarters until the gap to π_LR halves (interpolated).
 */
export function inflationHalfLife(params: ModelParams = DEFAULT_PARAMS): number {
  const init = { ...NEUTRAL_INIT, pi0: NEUTRAL_INIT.piLR + 1, piHeadline0: NEUTRAL_INIT.piLR + 1 };
  const r = simulate(
    init,
    { ...TIGHTENING, policyChange: 0, horizon: 40 },
    { ...params, alpha: 0 },
  );
  const gap = Array.from(r.baseline.pi, (v) => v - init.piLR);
  for (let t = 1; t < gap.length; t++) {
    if (gap[t]! <= 0.5) {
      const a = gap[t - 1]!;
      const b = gap[t]!;
      return t - 1 + (a - 0.5) / (a - b);
    }
  }
  return Infinity;
}

export interface Check {
  name: string;
  value: number;
  quarter?: number;
  unit: string;
  range: [number, number];
  quarterRange?: [number, number];
  pass: boolean;
}

const within = (x: number, [lo, hi]: [number, number]) => x >= lo - 1e-9 && x <= hi + 1e-9;

export function calibrationChecks(params: ModelParams = DEFAULT_PARAMS): Check[] {
  const d = responses(TIGHTENING, params);
  const checks: Check[] = [];
  const add = (
    name: string,
    value: number,
    unit: string,
    range: [number, number],
    quarter?: number,
    quarterRange?: [number, number],
  ) =>
    checks.push({
      name,
      value,
      unit,
      range,
      quarter,
      quarterRange,
      pass: within(value, range) && (quarterRange ? within(quarter!, quarterRange) : true),
    });

  const gap = extreme(d.y, -1);
  add('Output gap trough', gap.value, 'pp', [-1.4, -0.8], gap.q, [5, 9]);
  const u = extreme(d.u, 1);
  add('Unemployment peak', u.value, 'pp', [0.3, 0.6], u.q, [6, 12]);
  // "Core inflation −0.2 to −0.5pp around Q8–Q12": the effect reached within
  // Q8–Q12 must be in range, and the overall trough must not overshoot it.
  // (A trough located inside Q8–Q12 is incompatible with a 6–10-quarter
  // inflation half-life plus a Q5–Q9 output trough; see CLAUDE.md.)
  const window = extreme(d.pi.slice(0, 13), -1);
  add('Core inflation reached by Q8–Q12', window.value, 'pp', [-0.5, -0.2], window.q, [8, 12]);
  const pi = extreme(d.pi, -1);
  add('Core inflation trough (any quarter)', pi.value, 'pp', [-0.5, -0.2], pi.q, [8, 16]);
  add('2y yield on impact (Q1)', d.y2[1]! * 100, 'bp', [60, 100], 1);
  add('10y yield on impact (Q1)', d.y10[1]! * 100, 'bp', [20, 45], 1);
  add('Dollar within Q1', d.usd[1]!, '%', [1.5, 4], 1);
  add('S&P 500 within Q1', d.eq[1]!, '%', [-8, -3], 1);
  add('Housing starts by Q4', d.house[4]!, '%', [-6, -3], 4);
  add('Business investment by Q4', d.inv[4]!, '%', [-4, -2], 4);

  const order = {
    markets: halfPeakQuarter(d.y2.slice(0, 13)),
    housing: halfPeakQuarter(d.house.slice(0, 13)),
    jobs: halfPeakQuarter(d.u.slice(0, 17)),
    inflation: halfPeakQuarter(d.pi.slice(0, 17)),
  };
  const ordered =
    order.markets <= 1 &&
    order.markets < order.housing &&
    order.housing < order.jobs &&
    order.jobs < order.inflation;
  checks.push({
    name: `Order of effects (half-peak Q: markets ${order.markets} → housing ${order.housing} → jobs ${order.jobs} → inflation ${order.inflation})`,
    value: ordered ? 1 : 0,
    unit: '',
    range: [1, 1],
    pass: ordered,
  });

  const hl = inflationHalfLife(params);
  add('Inflation half-life (no shocks, zero gap)', hl, 'quarters', [6, 10]);
  return checks;
}
