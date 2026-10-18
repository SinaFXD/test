import type { SeriesSpec } from '../../src/banks/types';
import type { Obs } from '../../src/data/schema';
import { buildSeries, downsampleWeekly } from './build-series';
import { fredTimestampToISO, parseObservations, type FredSeriesInfo } from './fred';
import { redact } from './env';
import { datesToPrune, reconstructSnapshot, valueAsOf } from './history';

const info = (over: Partial<FredSeriesInfo> = {}): FredSeriesInfo => ({
  id: 'X',
  title: 'Test',
  frequency_short: 'M',
  units_short: '%',
  last_updated: '2026-10-02 07:44:02-05',
  observation_start: '2000-01-01',
  observation_end: '2026-09-01',
  ...over,
});

describe('FRED parsing', () => {
  it('drops "." missing values', () => {
    expect(
      parseObservations([
        { date: '2026-01-01', value: '1.5' },
        { date: '2026-02-01', value: '.' },
        { date: '2026-03-01', value: '2' },
      ]),
    ).toEqual([
      ['2026-01-01', 1.5],
      ['2026-03-01', 2],
    ]);
  });

  it('normalizes FRED timestamps to ISO 8601', () => {
    expect(fredTimestampToISO('2026-09-30 07:43:28-05')).toBe('2026-09-30T07:43:28-05:00');
  });

  it('redacts the API key from logged URLs', () => {
    expect(redact('https://x/fred?series_id=A&api_key=abc123&file_type=json')).toBe(
      'https://x/fred?series_id=A&api_key=***&file_type=json',
    );
  });
});

describe('buildSeries', () => {
  const monthly: Obs[] = [
    ['2026-07-01', 4.1],
    ['2026-08-01', 4.1],
    ['2026-09-01', 4.2],
  ];
  const spec: SeriesSpec = { key: 'unrate', id: 'UNRATE', units: 'lin', kind: 'observed' };

  it('computes latest, previous and change', () => {
    const s = buildSeries(spec, info(), monthly, { today: '2026-10-18' });
    expect(s).toMatchObject({
      latest: 4.2,
      previous: 4.1,
      lastObservationDate: '2026-09-01',
      lastUpdated: '2026-10-02T07:44:02-05:00',
    });
    expect(s.change).toBeCloseTo(0.1, 10);
  });

  it('uses the current quarter for CBO projections', () => {
    const proj: Obs[] = [
      ['2026-07-01', 4.39],
      ['2026-10-01', 4.388],
      ['2027-01-01', 4.385],
    ];
    const s = buildSeries(
      { key: 'nrou', id: 'NROU', units: 'lin', kind: 'projection' },
      info({ frequency_short: 'Q' }),
      proj,
      { today: '2026-10-18' },
    );
    expect(s.latest).toBe(4.388);
    expect(s.history.at(-1)![0]).toBe('2026-10-01');
  });

  it('uses the current year for annual SEP medians', () => {
    const sep: Obs[] = [
      ['2026-01-01', 4.1],
      ['2027-01-01', 4.1],
      ['2028-01-01', 3.9],
    ];
    const s = buildSeries(
      { key: 'sepFunds', id: 'FEDTARMD', units: 'lin', kind: 'sep' },
      info({ frequency_short: 'A' }),
      sep,
      { today: '2026-10-18' },
    );
    expect(s).toMatchObject({ latest: 4.1, previous: null, change: null });
    expect(s.history).toHaveLength(3);
  });

  it('throws on an empty series (pipeline then refuses to publish)', () => {
    expect(() => buildSeries(spec, info(), [], { today: '2026-10-18' })).toThrow(/no observations/);
  });

  it('downsamples daily data to the last point of each week', () => {
    const daily: Obs[] = [
      ['2026-10-05', 1], // Mon
      ['2026-10-09', 2], // Fri
      ['2026-10-12', 3], // Mon
      ['2026-10-14', 4], // Wed (last)
    ];
    expect(downsampleWeekly(daily)).toEqual([
      ['2026-10-09', 2],
      ['2026-10-14', 4],
    ]);
  });
});

describe('history snapshots', () => {
  it('valueAsOf respects a maximum lag', () => {
    const obs: Obs[] = [
      ['2026-10-01', 1],
      ['2026-10-08', 2],
    ];
    expect(valueAsOf(obs, '2026-10-10', 5)).toBe(2);
    expect(valueAsOf(obs, '2026-10-20', 5)).toBeUndefined();
    expect(valueAsOf(obs, '2026-09-01', 5)).toBeUndefined();
  });

  it('prunes snapshots older than the retention window', () => {
    expect(datesToPrune(['2025-01-01', '2025-09-30', '2026-10-15'], '2026-10-18', 400)).toEqual([
      '2025-01-01',
    ]);
  });

  it('reconstructs a market-path snapshot only when the full curve printed', () => {
    const day = (v: number): Obs[] => [['2026-10-14', v]];
    const daily = {
      dgs1mo: day(4.1),
      dgs3mo: day(4.2),
      dgs6mo: day(4.3),
      dgs1: day(4.4),
      dgs2: day(4.6),
      effr: day(3.88),
      fedUpper: day(4),
      fedLower: day(3.75),
    };
    const snap = reconstructSnapshot('2026-10-14', daily, ['2026-10-28', '2026-12-09'], 'now');
    expect(snap?.reconstructed).toBe(true);
    expect(snap?.indicators.fedFundsMid).toBe(3.875);
    expect(snap?.marketPath.meetings).toHaveLength(2);
    expect(reconstructSnapshot('2026-10-13', daily, ['2026-10-28'], 'now')).toBeNull();
  });
});
