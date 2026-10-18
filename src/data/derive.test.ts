import {
  fedFundsMid,
  outputGap,
  piLR,
  potentialGrowth,
  rStar,
  valueAtQuarter,
  type Obs,
} from './derive';

describe('derived values', () => {
  it('fedFundsMid is the midpoint of the target range', () => {
    expect(fedFundsMid(4, 3.75)).toBe(3.875);
    expect(fedFundsMid(0.25, 0)).toBe(0.125);
  });

  it('outputGap uses the latest common quarter', () => {
    const gdp: Obs[] = [
      ['2026-01-01', 101],
      ['2026-04-01', 99],
    ];
    const pot: Obs[] = [
      ['2026-01-01', 100],
      ['2026-04-01', 100],
      ['2026-07-01', 100.5],
    ];
    const g = outputGap(gdp, pot);
    expect(g?.date).toBe('2026-04-01');
    expect(g?.value).toBeCloseTo(-1, 10);
    expect(outputGap(gdp, [['2020-01-01', 1]])).toBeNull();
  });

  it('rStar = longer-run SEP funds − 2, fallback 1.0', () => {
    expect(rStar(3.2)).toEqual({ value: expect.closeTo(1.2, 10), method: 'sep' });
    expect(rStar(undefined)).toEqual({ value: 1.0, method: 'fallback' });
    expect(rStar(Number.NaN).method).toBe('fallback');
  });

  it('piLR = 5y5y − 0.3 wedge, clamped to [1.5, 3.5]', () => {
    expect(piLR(2.33).value).toBeCloseTo(2.03, 10);
    expect(piLR(2.33).clamped).toBe(false);
    expect(piLR(4.5)).toMatchObject({ value: 3.5, clamped: true });
    expect(piLR(1.0)).toMatchObject({ value: 1.5, clamped: true });
    expect(piLR(2.33, 0.5).value).toBeCloseTo(1.83, 10);
    expect(piLR(undefined)).toMatchObject({ value: 2, method: 'fallback' });
  });

  it('valueAtQuarter picks the observation for the quarter containing the date', () => {
    const nrou: Obs[] = [
      ['2026-07-01', 4.39],
      ['2026-10-01', 4.38],
      ['2027-01-01', 4.37],
    ];
    expect(valueAtQuarter(nrou, '2026-10-18')).toEqual(['2026-10-01', 4.38]);
    expect(valueAtQuarter(nrou, '2026-08-31')).toEqual(['2026-07-01', 4.39]);
    expect(valueAtQuarter(nrou, '2020-01-01')).toBeNull();
  });

  it('potentialGrowth annualizes CBO potential GDP growth', () => {
    const pot: Obs[] = Array.from({ length: 12 }, (_, i) => {
      const year = 2026 + Math.floor(i / 4);
      const month = String((i % 4) * 3 + 1).padStart(2, '0');
      return [`${year}-${month}-01`, 100 * 1.02 ** (i / 4)] as const;
    });
    expect(potentialGrowth(pot, '2026-02-10', 8)).toBeCloseTo(2, 8);
    expect(potentialGrowth(pot, '2028-10-01', 8)).toBeNull();
  });
});
