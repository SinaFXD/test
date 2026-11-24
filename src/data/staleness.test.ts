import { FED_SERIES } from '../banks/fed/series';
import { isStale, staleLimit } from './staleness';

const base = { kind: 'observed' as const, staleDays: undefined };

describe('staleness rules', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  it.each([
    ['D', '2026-10-14', false],
    ['D', '2026-10-13', true],
    ['W', '2026-10-08', false],
    ['W', '2026-10-07', true],
    ['M', '2026-09-03', false],
    ['M', '2026-09-02', true],
    ['Q', '2026-06-20', false],
    ['Q', '2026-06-19', true],
  ])('%s updated %s → stale=%s', (frequency, updated, expected) => {
    expect(isStale({ ...base, frequency, lastUpdated: `${updated}T08:00:00-05:00` }, now)).toBe(
      expected,
    );
  });

  it('projections and SEP are never stale', () => {
    expect(
      isStale({ ...base, kind: 'projection', frequency: 'Q', lastUpdated: '2020-01-01' }, now),
    ).toBe(false);
    expect(isStale({ ...base, kind: 'sep', frequency: 'A', lastUpdated: '2020-01-01' }, now)).toBe(
      false,
    );
  });

  it('weekly-published daily series (WTI oil) are not stale between weekly releases', () => {
    const wti = FED_SERIES.find((x) => x.id === 'DCOILWTICO')!;
    // FRED got last Wednesday's EIA release; the next one is due tomorrow.
    const s = { ...base, frequency: 'D', staleDays: wti.staleDays };
    const now = new Date('2026-11-24T12:00:00Z');
    expect(isStale({ ...s, lastUpdated: '2026-11-18T12:18:20-06:00' }, now)).toBe(false);
    expect(isStale({ ...s, lastUpdated: '2026-11-11T12:00:00-06:00' }, now)).toBe(true);
  });

  it('per-series override wins', () => {
    expect(staleLimit({ frequency: 'D', staleDays: 10 })).toBe(10);
    expect(staleLimit({ frequency: 'XYZ', staleDays: undefined })).toBe(45);
  });
});
