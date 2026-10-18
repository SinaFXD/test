import { yearFrac } from './dates';
import {
  cmtToCont,
  contToCmt,
  contToEffr,
  effrToCont,
  impliedMeetingPath,
  rateOn,
  stepPathToQuarterly,
  type TreasuryCurve,
} from './market-path';

const MEETINGS = [
  '2026-10-28',
  '2026-12-09',
  '2027-01-27',
  '2027-03-17',
  '2027-04-28',
  '2027-06-09',
  '2027-07-28',
  '2027-09-15',
  '2027-10-27',
  '2027-12-08',
];
const AS_OF = '2026-10-15';

/** Build the CMT curve that a given continuous forward function would produce. */
function curveFromForward(fwd: (t: number) => number): TreasuryCurve {
  const zero = (T: number) => {
    const n = 4000;
    let acc = 0;
    for (let i = 0; i < n; i++) acc += fwd(((i + 0.5) / n) * T);
    return contToCmt(acc / n);
  };
  return {
    dgs1mo: zero(1 / 12),
    dgs3mo: zero(0.25),
    dgs6mo: zero(0.5),
    dgs1: zero(1),
    dgs2: zero(2),
  };
}

describe('rate conversions', () => {
  it('round-trip', () => {
    expect(contToCmt(cmtToCont(4.37))).toBeCloseTo(4.37, 9);
    expect(contToEffr(effrToCont(3.88))).toBeCloseTo(3.88, 9);
    expect(effrToCont(3.88)).toBeCloseTo(3.934, 3);
  });
});

describe('impliedMeetingPath', () => {
  it('a curve consistent with no change implies a flat path at EFFR', () => {
    const effr = 3.88;
    const c = effrToCont(effr);
    const path = impliedMeetingPath(
      AS_OF,
      effr,
      curveFromForward(() => c),
      MEETINGS,
    );
    expect(path.meetings.length).toBe(10);
    for (const m of path.meetings) expect(m.rate).toBeCloseTo(effr, 3);
  });

  it('recovers a +25bp hike priced at the next meeting (front end anchored to EFFR)', () => {
    const effr = 3.88;
    const d1 = yearFrac(AS_OF, '2026-10-28');
    const lo = effrToCont(effr);
    const hi = effrToCont(effr + 0.25);
    const path = impliedMeetingPath(
      AS_OF,
      effr,
      curveFromForward((t) => (t < d1 ? lo : hi)),
      MEETINGS,
    );
    for (const m of path.meetings) expect(m.rate).toBeCloseTo(effr + 0.25, 2);
    expect(rateOn(path, '2026-10-20')).toBe(effr);
    expect(rateOn(path, '2026-11-15')).toBeCloseTo(4.13, 2);
  });

  it('upward-sloping real-world curve gives rising expected rates', () => {
    const curve = { dgs1mo: 4.17, dgs3mo: 4.28, dgs6mo: 4.35, dgs1: 4.49, dgs2: 4.77 };
    const path = impliedMeetingPath(AS_OF, 3.88, curve, MEETINGS);
    expect(path.meetings[0]!.rate).toBeGreaterThan(3.95);
    expect(path.meetings.at(-1)!.rate).toBeGreaterThan(path.meetings[0]!.rate);
    for (const m of path.meetings) expect(Number.isFinite(m.rate)).toBe(true);
  });

  it('the fitted path reprices every curve maturity (within 0.5bp) and is smooth', () => {
    const curve = { dgs1mo: 4.17, dgs3mo: 4.28, dgs6mo: 4.35, dgs1: 4.49, dgs2: 4.77 };
    const path = impliedMeetingPath(AS_OF, 3.88, curve, MEETINGS);
    const s = path.meetings.map((m) => yearFrac(AS_OF, m.date));
    const H = yearFrac(AS_OF, path.horizonEnd);
    const rc = path.meetings.map((m) => effrToCont(m.rate));
    const tenors: Array<[keyof typeof curve, number]> = [
      ['dgs1mo', 1 / 12],
      ['dgs3mo', 0.25],
      ['dgs6mo', 0.5],
      ['dgs1', 1],
      ['dgs2', 2],
    ];
    for (const [k, T] of tenors) {
      let acc = effrToCont(3.88) * Math.min(T, s[0]!);
      s.forEach((st, j) => (acc += rc[j]! * Math.max(0, Math.min(T, s[j + 1] ?? H) - st)));
      expect(Math.abs(acc / T - cmtToCont(curve[k])) * 100).toBeLessThan(0.5);
    }
    for (let j = 1; j < path.meetings.length; j++) {
      expect(Math.abs(path.meetings[j]!.rate - path.meetings[j - 1]!.rate)).toBeLessThan(0.2);
    }
  });

  it('ignores meetings outside (asOf, asOf+2y)', () => {
    const path = impliedMeetingPath(
      AS_OF,
      3.88,
      curveFromForward(() => 4),
      ['2026-09-16', ...MEETINGS, '2029-01-30'],
    );
    expect(path.meetings.map((m) => m.date)).toEqual(MEETINGS);
  });
});

describe('stepPathToQuarterly', () => {
  it('averages the step function over full calendar quarters within the horizon', () => {
    const path = {
      asOf: AS_OF,
      startRate: 4,
      meetings: [{ date: '2027-02-14', rate: 5 }],
      horizonEnd: '2028-10-14',
    };
    const q = stepPathToQuarterly(path);
    expect(q[0]!.quarter).toBe('2027Q1');
    // Jan 1..Feb 14 (45 days) at 4, Feb 15..Mar 31 (45 days) at 5
    expect(q[0]!.rate).toBeCloseTo(4.5, 10);
    expect(q[1]!.rate).toBe(5);
    expect(q.at(-1)!.quarter).toBe('2028Q3');
    expect(q.length).toBe(7);
  });
});
