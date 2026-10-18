/**
 * Pure post-processing of a simulation: peak effects and their timing,
 * transmission stages, plain-language summary inputs and market rules of thumb.
 */
import type { PathKey, SimResult } from '../model/types';

export interface Peak {
  /** Quarter of the largest absolute difference (scenario − baseline). */
  q: number;
  value: number;
}

export function diffPath(r: SimResult, k: PathKey): number[] {
  return Array.from(r.scenario[k], (v, t) => v - r.baseline[k][t]!);
}

export function peak(xs: number[]): Peak {
  let q = 0;
  for (let t = 1; t < xs.length; t++) if (Math.abs(xs[t]!) > Math.abs(xs[q]!)) q = t;
  return { q, value: xs[q]! };
}

/** Thresholds below which an effect is "not noticeable". */
export const NOTICEABLE = {
  y2: 0.03,
  house: 0.3,
  inv: 0.3,
  u: 0.03,
  pi: 0.03,
  y: 0.05,
  eq: 0.3,
  usd: 0.2,
} as const;

export type StageKey = 'markets' | 'housing' | 'jobs' | 'inflation';

export interface Stage {
  key: StageKey;
  peak: Peak;
  noticeable: boolean;
  /** Quarter at which the effect first reaches half its peak (used to light up during Play). */
  onset: number;
}

function onset(xs: number[], p: Peak): number {
  const half = Math.abs(p.value) / 2;
  const i = xs.findIndex((v) => Math.abs(v) >= half && Math.abs(v) > 0);
  return i < 0 ? p.q : i;
}

export function transmissionStages(r: SimResult): Stage[] {
  const y2 = diffPath(r, 'y2');
  const house = r.scenario.house.length ? Array.from(r.scenario.house) : [];
  const inv = Array.from(r.scenario.inv);
  const u = diffPath(r, 'u');
  const pi = diffPath(r, 'pi');
  const hp = peak(house);
  const ip = peak(inv);
  // Housing & investment: whichever reacts more strongly.
  const hi =
    Math.abs(hp.value) >= Math.abs(ip.value)
      ? { xs: house, p: hp, th: NOTICEABLE.house }
      : { xs: inv, p: ip, th: NOTICEABLE.inv };
  const mk = (key: StageKey, xs: number[], th: number, p = peak(xs)): Stage => ({
    key,
    peak: p,
    noticeable: Math.abs(p.value) >= th,
    onset: onset(xs, p),
  });
  return [
    mk('markets', y2, NOTICEABLE.y2),
    mk('housing', hi.xs, hi.th, hi.p),
    mk('jobs', u, NOTICEABLE.u),
    mk('inflation', pi, NOTICEABLE.pi),
  ];
}

export interface SummaryData {
  y2: Peak;
  mort: Peak;
  gap: Peak;
  u: Peak;
  pi: Peak;
  /** Average policy difference over the first 4 quarters (sign → tight/easy). */
  stance: number;
}

export function summaryData(r: SimResult): SummaryData {
  const di = diffPath(r, 'i');
  const n = Math.min(4, di.length - 1);
  const stance = n > 0 ? di.slice(1, n + 1).reduce((a, b) => a + b, 0) / n : 0;
  return {
    y2: { q: 1, value: diffPath(r, 'y2')[1] ?? 0 },
    mort: { q: 1, value: diffPath(r, 'mort')[1] ?? 0 },
    gap: peak(diffPath(r, 'y')),
    u: peak(diffPath(r, 'u')),
    pi: peak(diffPath(r, 'pi')),
    stance,
  };
}

export type Direction = 'up' | 'down' | 'flat';
export type Strength = 'strong' | 'moderate' | 'weak' | 'none';

export interface MarketCall {
  key: 'dollar' | 'eurusd' | 'gold' | 'stocks' | 'bonds';
  dir: Direction;
  strength: Strength;
}

function grade(
  x: number,
  weak: number,
  moderate: number,
  strong: number,
): { dir: Direction; strength: Strength } {
  const a = Math.abs(x);
  if (a < weak) return { dir: 'flat', strength: 'none' };
  const dir: Direction = x > 0 ? 'up' : 'down';
  return { dir, strength: a >= strong ? 'strong' : a >= moderate ? 'moderate' : 'weak' };
}

/**
 * Qualitative market rules of thumb from the first year of the scenario:
 * dollar ↔ rate differential, EUR/USD = inverse dollar, gold ↔ real yields +
 * dollar (inverse), stocks ↔ model equity path, bond prices ↔ inverse 10y.
 */
export function marketCalls(r: SimResult): MarketCall[] {
  const avg = (xs: number[]) => {
    const s = xs.slice(1, 5);
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
  };
  const usd = avg(Array.from(r.scenario.usd));
  const eq = avg(Array.from(r.scenario.eq));
  const d10 = avg(diffPath(r, 'y10'));
  const dpie = avg(diffPath(r, 'pie'));
  const realYield = d10 - dpie;
  // Gold: falls with higher real yields and a stronger dollar (score in "pp-equivalents").
  const goldScore = -(realYield + usd / 3);
  return [
    { key: 'dollar', ...grade(usd, 0.25, 1, 2.5) },
    { key: 'eurusd', ...grade(-usd, 0.25, 1, 2.5) },
    { key: 'gold', ...grade(goldScore, 0.08, 0.3, 0.8) },
    { key: 'stocks', ...grade(eq, 0.4, 1.5, 4) },
    { key: 'bonds', ...grade(-d10, 0.03, 0.12, 0.35) },
  ];
}
