import { addDays } from './dates';
import { stepPathToQuarterly } from './market-path';

export interface OverrideResult {
  ok: boolean;
  meetings: Array<{ date: string; rate: number }>;
  /** 1-based line numbers that failed to parse. */
  badLines: number[];
  rangeError: boolean;
}

/**
 * Parse a pasted market path: one "YYYY-MM-DD rate" per line (comma, tab or
 * semicolon separators also accepted; rate in %). Blank lines and lines
 * starting with # are ignored.
 */
export function parseOverride(text: string, asOf: string): OverrideResult {
  const meetings: Array<{ date: string; rate: number }> = [];
  const badLines: number[] = [];
  let rangeError = false;
  const horizon = addDays(asOf, 730);
  text.split(/\r?\n/).forEach((line, idx) => {
    const l = line.trim();
    if (!l || l.startsWith('#')) return;
    const m = l.match(/^(\d{4}-\d{2}-\d{2})[\s,;\t]+(-?\d+(?:[.,]\d+)?)\s*%?$/);
    if (!m) {
      badLines.push(idx + 1);
      return;
    }
    const date = m[1]!;
    const rate = Number(m[2]!.replace(',', '.'));
    if (Number.isNaN(Date.parse(date)) || date <= asOf || date > horizon || rate < 0 || rate > 15) {
      rangeError = true;
      return;
    }
    meetings.push({ date, rate });
  });
  meetings.sort((a, b) => a.date.localeCompare(b.date));
  const ok = meetings.length > 0 && badLines.length === 0 && !rangeError;
  return { ok, meetings, badLines, rangeError };
}

/** Quarterly policy path (model t = 1..) implied by an override step path. */
export function overrideToQuarterly(
  meetings: Array<{ date: string; rate: number }>,
  asOf: string,
  startRate: number,
): number[] {
  return stepPathToQuarterly({ asOf, startRate, meetings, horizonEnd: addDays(asOf, 730) }).map(
    (q) => q.rate,
  );
}
