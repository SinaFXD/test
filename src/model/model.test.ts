import fallback from '../data/fallback.json';
import { LatestDataSchema } from '../data/schema';
import { calibrationChecks, NEUTRAL_INIT, responses, TIGHTENING } from './calibration';
import { initFromData } from './from-data';
import { DEFAULT_PARAMS } from './params';
import { simulate, ZERO_SCENARIO } from './simulate';
import { PATH_KEYS, type BaselineMode, type ScenarioInputs } from './types';
import { fanBands, fanHalfWidth } from './uncertainty';

const DATA_INIT = initFromData(LatestDataSchema.parse(fallback));
const zero = (mode: BaselineMode, horizon = 16): ScenarioInputs => ({
  ...ZERO_SCENARIO,
  horizon,
  baselineMode: mode,
});

describe('calibration (+100bp, FRB/US-like ranges)', () => {
  it.each(calibrationChecks().map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(c.pass, `${c.name}: ${c.value} @Q${c.quarter} vs ${c.range}`).toBe(true);
  });
});

describe('model invariants', () => {
  it.each(['market', 'rule'] as const)(
    'zero shock ⇒ scenario equals baseline exactly (%s)',
    (mode) => {
      for (const init of [NEUTRAL_INIT, DATA_INIT]) {
        const r = simulate(init, zero(mode));
        for (const k of PATH_KEYS)
          expect(Array.from(r.scenario[k])).toEqual(Array.from(r.baseline[k]));
      }
    },
  );

  it('baseline follows the market path, then the rule', () => {
    const r = simulate(DATA_INIT, zero('market', 16));
    DATA_INIT.marketPath.forEach((m, k) =>
      expect(r.baseline.i[k + 1]).toBeCloseTo(Math.max(0.125, m), 12),
    );
    expect(r.baseline.i[0]).toBe(DATA_INIT.i0);
  });

  it('2y yield at t=0 matches today’s DGS2 in both paths', () => {
    const r = simulate(DATA_INIT, { ...zero('market'), policyChange: 1 });
    expect(r.baseline.y2[0]).toBeCloseTo(DATA_INIT.dgs2, 12);
    expect(r.scenario.y2[0]).toBeCloseTo(DATA_INIT.dgs2, 12);
    expect(r.baseline.y10[0]).toBeCloseTo(DATA_INIT.dgs10, 12);
  });

  it('scenario hawkishness in rule mode equals the plain Taylor rule with that φπ', () => {
    const a = simulate(NEUTRAL_INIT, {
      ...zero('rule'),
      phiPi: 1.2,
      inflationShock: 1,
      shockPersistence: 0.5,
    });
    const b = simulate(
      NEUTRAL_INIT,
      { ...zero('rule'), inflationShock: 1, shockPersistence: 0.5 },
      { ...DEFAULT_PARAMS, phiPi: 1.2 },
    );
    for (let t = 0; t < a.scenario.i.length; t++)
      expect(a.scenario.i[t]).toBeCloseTo(b.scenario.i[t]!, 10);
  });

  it('−100bp is the mirror image of +100bp away from the ELB', () => {
    const up = responses(TIGHTENING);
    const down = responses({ ...TIGHTENING, policyChange: -1 });
    for (const k of PATH_KEYS) {
      up[k].forEach((v, t) => expect(down[k][t]! + v).toBeCloseTo(0, 9));
    }
  });

  it('respects the effective lower bound (deep cut from a low rate)', () => {
    const init = { ...NEUTRAL_INIT, i0: 0.5, pi0: 1, piLR: 1.8, y0: -2 };
    const r = simulate(init, { ...zero('rule', 20), policyChange: -3, holdQuarters: 8 });
    for (const P of [r.baseline, r.scenario])
      for (const v of P.i) expect(v).toBeGreaterThanOrEqual(0.125);
    expect(Math.min(...r.scenario.i)).toBe(0.125);
  });

  it('no NaN or explosive paths across every combination of slider extremes', () => {
    const grid = {
      policyChange: [-3, 3],
      holdQuarters: [1, 8],
      inflationShock: [-2, 3],
      shockPersistence: [0, 0.95],
      demandShock: [-3, 3],
      oilShock: [-50, 50],
      phiPi: [0, 1.5],
      lambda: [0, 1],
      rStar: [0, 2.5],
      horizon: [8, 20],
      baselineMode: ['market', 'rule'] as BaselineMode[],
    };
    const keys = Object.keys(grid) as Array<keyof typeof grid>;
    // Plausibility bounds: far outside anything in U.S. post-war history ⇒ "explosive".
    const BOUNDS: Record<string, [number, number]> = {
      i: [0.125, 30],
      r: [-15, 20],
      pie: [-15, 25],
      pi: [-15, 25],
      piH: [-15, 25],
      y: [-12, 8],
      u: [2, 25],
      g: [-40, 40],
      y2: [-1, 30],
      y10: [-1, 25],
      mort: [0, 30],
      usd: [-40, 40],
      eq: [-70, 70],
      house: [-80, 80],
      inv: [-60, 60],
    };
    let runs = 0;
    const visit = (i: number, acc: Partial<ScenarioInputs>) => {
      if (i === keys.length) {
        for (const init of [DATA_INIT, NEUTRAL_INIT]) {
          const r = simulate(init, acc as ScenarioInputs);
          runs++;
          for (const P of [r.baseline, r.scenario]) {
            for (const k of PATH_KEYS) {
              for (const v of P[k]) {
                const [lo, hi] = BOUNDS[k]!;
                if (!Number.isFinite(v) || v < lo - 1e-9 || v > hi + 1e-9) {
                  throw new Error(`${k}=${v} for ${JSON.stringify(acc)}`);
                }
              }
            }
          }
        }
        return;
      }
      for (const v of grid[keys[i]!]) visit(i + 1, { ...acc, [keys[i]!]: v });
    };
    visit(0, {});
    expect(runs).toBe(2 ** keys.length * 2);
  });

  it('runs in well under 5 ms', () => {
    const inp = { ...zero('market', 20), policyChange: 0.5, inflationShock: 1, oilShock: 20 };
    for (let k = 0; k < 50; k++) simulate(DATA_INIT, inp); // warm-up
    const t0 = performance.now();
    const N = 500;
    for (let k = 0; k < N; k++) simulate(DATA_INIT, inp);
    expect((performance.now() - t0) / N).toBeLessThan(5);
  });
});

describe('shock convention (slider value = impact)', () => {
  it('an inflation shock raises core inflation by exactly S on impact', () => {
    const r = simulate(NEUTRAL_INIT, {
      ...zero('rule'),
      inflationShock: 1.5,
      shockPersistence: 0.8,
    });
    expect(r.scenario.pi[1]! - r.baseline.pi[1]!).toBeCloseTo(1.5, 10);
  });

  it('without feedback the inflation deviation follows S·ρ^(t−1)', () => {
    const p = { ...DEFAULT_PARAMS, alpha: 0, kappa: 0, rhoI: 0 };
    const r = simulate(
      NEUTRAL_INIT,
      { ...zero('rule'), inflationShock: 2, shockPersistence: 0.7 },
      p,
    );
    for (let t = 1; t < 10; t++)
      expect(r.scenario.pi[t]! - r.baseline.pi[t]!).toBeCloseTo(2 * 0.7 ** (t - 1), 10);
  });

  it('a demand shock raises the output gap by exactly D on impact', () => {
    const r = simulate(NEUTRAL_INIT, { ...zero('rule'), demandShock: -2 });
    expect(r.scenario.y[1]! - r.baseline.y[1]!).toBeCloseTo(-2, 10);
  });

  it('de-anchored expectations make the same shock more persistent', () => {
    const anchored = responses({
      ...TIGHTENING,
      policyChange: 0,
      inflationShock: 1,
      shockPersistence: 0.8,
    });
    const loose = responses({
      ...TIGHTENING,
      policyChange: 0,
      inflationShock: 1,
      shockPersistence: 0.8,
      lambda: 0.05,
    });
    expect(loose.pi[8]!).toBeGreaterThan(anchored.pi[8]! + 0.2);
  });

  it('an oil shock lifts headline more than core, with base effects after a year', () => {
    const d = responses({ ...TIGHTENING, policyChange: 0, oilShock: 40 });
    expect(d.piH[1]! - d.pi[1]!).toBeCloseTo(0.8, 6); // 0.02 pp per 1% × 40%
    expect(d.piH[6]! - d.pi[6]!).toBeLessThan(0); // y/y base effect as oil falls back
    expect(d.y[2]!).toBeLessThan(0);
  });
});

describe('uncertainty fan', () => {
  it('matches the 4Q and 8Q error sizes and widens with horizon', () => {
    expect(fanHalfWidth('gdpGrowth', 4)).toBeCloseTo(1.5, 10);
    expect(fanHalfWidth('gdpGrowth', 8)).toBeCloseTo(2.1, 10);
    expect(fanHalfWidth('policyRate', 8)).toBeCloseTo(1.4, 10);
    expect(fanHalfWidth('corePce', 0)).toBe(0);
    for (let h = 1; h < 20; h++) {
      expect(fanHalfWidth('unemployment', h + 1)).toBeGreaterThan(fanHalfWidth('unemployment', h));
    }
  });

  it('respects a floor (e.g. the ELB for the policy rate)', () => {
    const { lower, upper } = fanBands([0.5, 0.5, 0.5, 0.5, 0.5], 'policyRate', 0.125);
    expect(Math.min(...lower)).toBe(0.125);
    expect(upper[4]).toBeCloseTo(1.3, 10);
  });
});

describe('initFromData', () => {
  it('maps the latest data to t = 0', () => {
    expect(DATA_INIT.i0).toBe(fallback.derived.fedFundsMid.value);
    expect(DATA_INIT.pi0).toBe(fallback.series.corePce.latest);
    expect(DATA_INIT.marketPath.length).toBe(fallback.marketPath.quarterly.length);
    for (const v of Object.values(DATA_INIT)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    }
  });
});
