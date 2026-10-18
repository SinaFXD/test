import { NEUTRAL_INIT, TIGHTENING } from '../model/calibration';
import { simulate } from '../model/simulate';
import { marketCalls, summaryData, transmissionStages } from './analysis';

const tight = simulate(NEUTRAL_INIT, TIGHTENING);
const easy = simulate(NEUTRAL_INIT, { ...TIGHTENING, policyChange: -1 });
const none = simulate(NEUTRAL_INIT, { ...TIGHTENING, policyChange: 0 });

describe('transmission stages', () => {
  it('peaks in the textbook order: markets → housing → jobs → inflation', () => {
    const s = transmissionStages(tight);
    expect(s.map((x) => x.key)).toEqual(['markets', 'housing', 'jobs', 'inflation']);
    expect(s.every((x) => x.noticeable)).toBe(true);
    expect(s[0]!.peak.q).toBe(1);
    for (let i = 1; i < s.length; i++) expect(s[i]!.onset).toBeGreaterThan(s[i - 1]!.onset);
  });

  it('reports no noticeable effect for the baseline', () => {
    expect(transmissionStages(none).some((x) => x.noticeable)).toBe(false);
  });
});

describe('summary data', () => {
  it('signs make sense for a tightening', () => {
    const d = summaryData(tight);
    expect(d.stance).toBeGreaterThan(0.9);
    expect(d.y2.value).toBeGreaterThan(0);
    expect(d.gap.value).toBeLessThan(0);
    expect(d.u.value).toBeGreaterThan(0);
    expect(d.pi.value).toBeLessThan(0);
  });
});

describe('market rules of thumb', () => {
  const byKey = (r: typeof tight) => Object.fromEntries(marketCalls(r).map((c) => [c.key, c]));
  it('tightening: dollar up, EUR/USD down, gold down, stocks down, bond prices down', () => {
    const m = byKey(tight);
    expect(m.dollar!.dir).toBe('up');
    expect(m.eurusd!.dir).toBe('down');
    expect(m.gold!.dir).toBe('down');
    expect(m.stocks!.dir).toBe('down');
    expect(m.bonds!.dir).toBe('down');
  });

  it('easing mirrors it', () => {
    const m = byKey(easy);
    expect(m.dollar!.dir).toBe('down');
    expect(m.gold!.dir).toBe('up');
    expect(m.stocks!.dir).toBe('up');
    expect(m.bonds!.dir).toBe('up');
  });

  it('no scenario → all neutral', () => {
    expect(marketCalls(none).every((c) => c.strength === 'none')).toBe(true);
  });
});
