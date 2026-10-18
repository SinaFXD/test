import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { addDays } from '../../src/data/dates';
import type { Obs, Snapshot } from '../../src/data/schema';
import { impliedMeetingPath, type TreasuryCurve } from '../../src/data/market-path';

export const SNAPSHOT_KEEP_DAYS = 400;
const SNAPSHOT_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;

export function listSnapshotDates(dir: string): string[] {
  try {
    return readdirSync(dir)
      .map((f) => f.match(SNAPSHOT_FILE)?.[1])
      .filter((d): d is string => !!d)
      .sort();
  } catch {
    return [];
  }
}

export function datesToPrune(
  dates: string[],
  today: string,
  keepDays = SNAPSHOT_KEEP_DAYS,
): string[] {
  const cutoff = addDays(today, -keepDays);
  return dates.filter((d) => d < cutoff);
}

export function snapshotPath(dir: string, date: string): string {
  return join(dir, `${date}.json`);
}

/** Value of a daily series on `date`, or the most recent earlier one within `maxLagDays`. */
export function valueAsOf(obs: readonly Obs[], date: string, maxLagDays = 5): number | undefined {
  const earliest = addDays(date, -maxLagDays);
  for (let i = obs.length - 1; i >= 0; i--) {
    const [d, v] = obs[i]!;
    if (d > date) continue;
    return d >= earliest ? v : undefined;
  }
  return undefined;
}

const CURVE_KEYS = ['dgs1mo', 'dgs3mo', 'dgs6mo', 'dgs1', 'dgs2'] as const;

/**
 * Rebuild a market-path snapshot for a past business day from FRED daily
 * history (current vintage). Only market data is included — no macro values,
 * to avoid look-ahead bias from later releases.
 */
export function reconstructSnapshot(
  date: string,
  daily: Record<string, readonly Obs[]>,
  meetings: readonly string[],
  generatedAt: string,
): Snapshot | null {
  const curve: Partial<TreasuryCurve> = {};
  for (const k of CURVE_KEYS) {
    const obs = daily[k];
    const exact = obs?.find(([d]) => d === date)?.[1];
    if (exact === undefined) return null; // only days with a full curve print
    curve[k] = exact;
  }
  const effr = valueAsOf(daily.effr ?? [], date, 4);
  if (effr === undefined) return null;
  const path = impliedMeetingPath(date, effr, curve as TreasuryCurve, meetings);
  const indicators: Record<string, number> = { effr };
  for (const k of [
    'dgs2',
    'dgs10',
    'mortgage30',
    'sp500',
    'dollar',
    'fedUpper',
    'fedLower',
  ] as const) {
    const v = valueAsOf(daily[k] ?? [], date, k === 'mortgage30' || k === 'dollar' ? 10 : 4);
    if (v !== undefined) indicators[k] = v;
  }
  if (indicators.fedUpper !== undefined && indicators.fedLower !== undefined) {
    indicators.fedFundsMid = (indicators.fedUpper + indicators.fedLower) / 2;
  }
  return {
    date,
    generatedAt,
    reconstructed: true,
    indicators,
    marketPath: {
      startRate: path.startRate,
      meetings: path.meetings.map((m) => ({ date: m.date, rate: Math.round(m.rate * 1e4) / 1e4 })),
      horizonEnd: path.horizonEnd,
    },
  };
}
