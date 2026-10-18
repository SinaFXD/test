/**
 * Approximate market-implied policy path from the Treasury bill/note curve.
 *
 * Method (documented in CLAUDE.md):
 *  1. Convert CMT yields (semi-annual bond-equivalent) and EFFR (ACT/360,
 *     daily compounding) to continuously-compounded ACT/365 zero rates.
 *  2. Unknowns: one policy-rate level after each FOMC meeting within 2 years
 *     (a step path). The rate before the next meeting is pinned to EFFR —
 *     this anchors the front end.
 *  3. Each zero rate (1m, 3m, 6m, 1y, 2y) must equal the time-average of the
 *     step path up to that maturity. With more meetings than maturities we
 *     solve a least-squares problem with a tiny penalty on meeting-to-meeting
 *     changes, which picks the smoothest path that fits the curve.
 *  4. Convert back to EFFR terms.
 *
 * Treasury yields contain a term premium and bill/fed-funds basis, so this is
 * labeled "approximate (includes term premium)" in the UI.
 */
import {
  addQuarters,
  addDays,
  daysBetween,
  quarterEnd,
  quarterKey,
  quarterOf,
  quarterStart,
  yearFrac,
} from './dates';

export interface TreasuryCurve {
  dgs1mo: number;
  dgs3mo: number;
  dgs6mo: number;
  dgs1: number;
  dgs2: number;
}

export interface MeetingRate {
  /** FOMC decision date (second day of the meeting). */
  date: string;
  /** Expected EFFR after this meeting, %. */
  rate: number;
}

export interface MarketPath {
  asOf: string;
  startRate: number;
  meetings: MeetingRate[];
  /** asOf + 2 years; the path is not defined beyond this date. */
  horizonEnd: string;
}

export interface QuarterRate {
  quarter: string;
  start: string;
  rate: number;
}

const TENORS: Array<[keyof TreasuryCurve, number]> = [
  ['dgs1mo', 1 / 12],
  ['dgs3mo', 0.25],
  ['dgs6mo', 0.5],
  ['dgs1', 1],
  ['dgs2', 2],
];

/** Semi-annual bond-equivalent yield (%) → continuous (%). */
export const cmtToCont = (y: number): number => 200 * Math.log(1 + y / 200);
export const contToCmt = (c: number): number => 200 * (Math.exp(c / 200) - 1);
/** EFFR (ACT/360, daily compounding, %) → continuous ACT/365 (%). */
export const effrToCont = (r: number): number => 36500 * Math.log(1 + r / 36000);
export const contToEffr = (c: number): number => 36000 * (Math.exp(c / 36500) - 1);

/**
 * Solve a small dense linear system with partial pivoting (n ≤ ~20).
 * Returns null if the matrix is singular.
 */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-12) return null;
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = c + 1; r < n; r++) {
      const f = M[r]![c]! / M[c]![c]!;
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let acc = M[r]![n]!;
    for (let k = r + 1; k < n; k++) acc -= M[r]![k]! * x[k]!;
    x[r] = acc / M[r]![r]!;
  }
  return x;
}

/** Weight of the smoothness penalty on meeting-to-meeting changes (tiny ⇒ near-exact fit). */
export const DEFAULT_SMOOTHNESS = 1e-3;

/**
 * Fit a step path for the policy rate (one level after each FOMC meeting) to
 * the Treasury curve: each zero rate must equal the time-average of the path
 * up to its maturity. The path before the next meeting is pinned to EFFR.
 * With more meetings than maturities, a small penalty on meeting-to-meeting
 * changes (excluding the first move) picks the smoothest path that fits.
 */
export function impliedMeetingPath(
  asOf: string,
  effr: number,
  curve: TreasuryCurve,
  meetingDates: readonly string[],
  horizonYears = 2,
  smoothness = DEFAULT_SMOOTHNESS,
): MarketPath {
  const horizonEnd = addDays(asOf, Math.round(horizonYears * 365));
  const future = [...new Set(meetingDates.filter((d) => d > asOf && d < horizonEnd))].sort();
  const n = future.length;
  if (n === 0) return { asOf, startRate: effr, meetings: [], horizonEnd };

  const effrC = effrToCont(effr);
  const H = yearFrac(asOf, horizonEnd);
  const starts = future.map((d) => yearFrac(asOf, d));
  const ends = starts.map((_, j) => starts[j + 1] ?? H);
  const d1 = starts[0]!;

  // Rows: (1/T)·Σ_j overlap_j·r_j = z_T − EFFR·min(T, d1)/T
  const rows: number[][] = [];
  const rhs: number[] = [];
  for (const [key, T] of TENORS) {
    if (T > H + 1e-9) continue;
    rows.push(starts.map((s, j) => Math.max(0, Math.min(T, ends[j]!) - s) / T));
    rhs.push(cmtToCont(curve[key]) - (effrC * Math.min(T, d1)) / T);
  }

  // Normal equations (AᵀA + λ·DᵀD) r = Aᵀb
  const N = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const v = new Array<number>(n).fill(0);
  rows.forEach((row, k) => {
    for (let i = 0; i < n; i++) {
      v[i]! += row[i]! * rhs[k]!;
      for (let j = 0; j < n; j++) N[i]![j]! += row[i]! * row[j]!;
    }
  });
  for (let j = 1; j < n; j++) {
    N[j]![j]! += smoothness;
    N[j - 1]![j - 1]! += smoothness;
    N[j]![j - 1]! -= smoothness;
    N[j - 1]![j]! -= smoothness;
  }
  // Tiny ridge keeps the system well-posed if no maturity reaches a meeting.
  for (let j = 0; j < n; j++) N[j]![j]! += 1e-9;

  const sol = solveLinear(N, v);
  if (!sol || sol.some((x) => !Number.isFinite(x))) {
    return { asOf, startRate: effr, meetings: [], horizonEnd };
  }
  return {
    asOf,
    startRate: effr,
    meetings: future.map((date, j) => ({ date, rate: contToEffr(sol[j]!) })),
    horizonEnd,
  };
}

/** Rate in force on `iso` for a step path (new rate applies after the decision date). */
export function rateOn(path: Pick<MarketPath, 'startRate' | 'meetings'>, iso: string): number {
  let r = path.startRate;
  for (const m of path.meetings) {
    if (m.date < iso) r = m.rate;
    else break;
  }
  return r;
}

/**
 * Average of the step path over each full calendar quarter after the quarter
 * containing `asOf`, up to the path horizon.
 */
export function stepPathToQuarterly(path: MarketPath, maxQuarters = 20): QuarterRate[] {
  const out: QuarterRate[] = [];
  const q0 = quarterOf(path.asOf);
  for (let k = 1; k <= maxQuarters; k++) {
    const qt = addQuarters(q0, k);
    const start = quarterStart(qt);
    const end = quarterEnd(qt);
    if (end > path.horizonEnd) break;
    const n = daysBetween(start, end);
    let sum = 0;
    for (let d = 0; d < n; d++) sum += rateOn(path, addDays(start, d));
    out.push({ quarter: quarterKey(qt), start, rate: sum / n });
  }
  return out;
}
