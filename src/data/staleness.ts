import { daysBetween, todayISO } from './dates';
import type { SeriesData } from './schema';

/**
 * Staleness thresholds in days, by FRED frequency, measured from FRED's
 * `last_updated` (the date the source last published new data). Measuring from
 * the observation date would flag every monthly series as stale, because e.g.
 * PCE for August is only published at the end of September.
 */
export const STALE_DAYS_BY_FREQ: Record<string, number> = {
  D: 4,
  W: 10,
  BW: 20,
  M: 45,
  Q: 120,
  SA: 200,
  A: 400,
};

export function staleLimit(s: Pick<SeriesData, 'frequency' | 'staleDays'>): number {
  return s.staleDays ?? STALE_DAYS_BY_FREQ[s.frequency] ?? 45;
}

export function isStale(
  s: Pick<SeriesData, 'kind' | 'frequency' | 'staleDays' | 'lastUpdated'>,
  now: Date = new Date(),
): boolean {
  if (s.kind !== 'observed') return false;
  const updated = s.lastUpdated.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) return true;
  return daysBetween(updated, todayISO(now)) > staleLimit(s);
}
