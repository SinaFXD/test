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

  it('per-series override wins', () => {
    expect(staleLimit({ frequency: 'D', staleDays: 10 })).toBe(10);
    expect(staleLimit({ frequency: 'XYZ', staleDays: undefined })).toBe(45);
  });
});
