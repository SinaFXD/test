import type { SeriesSpec } from '../../src/banks/types';
import { addDays, parseISODate, quarterOf, quarterStart, todayISO } from '../../src/data/dates';
import type { Obs, SeriesData } from '../../src/data/schema';
import { fredTimestampToISO, UNITS_LABEL, type FredSeriesInfo } from './fred';

const r = (x: number, dp = 4) => Math.round(x * 10 ** dp) / 10 ** dp;

/** Keep the last observation of each ISO week (and always the final point). */
export function downsampleWeekly(obs: readonly Obs[]): Obs[] {
  const out: Obs[] = [];
  const weekOf = (d: string) => Math.floor((parseISODate(d) / 86_400_000 + 3) / 7);
  for (let i = 0; i < obs.length; i++) {
    const next = obs[i + 1];
    if (!next || weekOf(next[0]) !== weekOf(obs[i]![0])) out.push(obs[i]!);
  }
  return out;
}

/** History window: daily/weekly → 3 years; monthly/quarterly → 15 years. */
export function historyStart(frequency: string, today: string): string {
  const years = frequency === 'D' || frequency === 'W' || frequency === 'BW' ? 3 : 15;
  return addDays(today, -Math.round(years * 365.25));
}

/** Observation start passed to FRED (a little extra to compute previous/change). */
export function fetchStart(spec: SeriesSpec, frequency: string, today: string): string | undefined {
  if (spec.kind === 'sep') return undefined;
  return addDays(historyStart(frequency, today), -120);
}

export function buildSeries(
  spec: SeriesSpec,
  info: FredSeriesInfo,
  obs: readonly Obs[],
  opts: { today?: string; fallbackUsed?: boolean } = {},
): SeriesData {
  const today = opts.today ?? todayISO();
  if (obs.length === 0) throw new Error(`${spec.key} (${info.id}): no observations`);

  let latestIdx = obs.length - 1;
  if (spec.kind === 'projection') {
    // CBO series extend ~10 years ahead: "latest" is the current quarter's value.
    const q = quarterStart(quarterOf(today));
    latestIdx = obs.findLastIndex(([d]) => d <= q);
    if (latestIdx < 0) throw new Error(`${spec.key}: no projection value for ${q}`);
  } else if (spec.kind === 'sep' && spec.key !== 'sepFundsLR') {
    // Annual SEP medians: "latest" = current calendar year's projection.
    const year = today.slice(0, 4);
    const i = obs.findIndex(([d]) => d.startsWith(year));
    latestIdx = i >= 0 ? i : 0;
  }

  const latest = obs[latestIdx]!;
  const prev = spec.kind === 'sep' && spec.key !== 'sepFundsLR' ? undefined : obs[latestIdx - 1];

  let history: Obs[];
  if (spec.kind === 'sep') {
    history = [...obs];
  } else {
    const start = historyStart(info.frequency_short, today);
    const window = obs.slice(0, latestIdx + 1).filter(([d]) => d >= start);
    history = info.frequency_short === 'D' ? downsampleWeekly(window) : window;
  }

  return {
    key: spec.key,
    id: info.id,
    title: info.title,
    units: UNITS_LABEL[spec.units] ?? info.units_short,
    transform: spec.units,
    frequency: info.frequency_short,
    kind: spec.kind,
    lastUpdated: fredTimestampToISO(info.last_updated),
    lastObservationDate: latest[0],
    latest: r(latest[1]),
    previous: prev ? r(prev[1]) : null,
    change: prev ? r(latest[1] - prev[1]) : null,
    history: history.map(([d, v]) => [d, r(v)] as const),
    ...(spec.staleDays !== undefined ? { staleDays: spec.staleDays } : {}),
    ...(opts.fallbackUsed ? { fallbackUsed: true } : {}),
  };
}
