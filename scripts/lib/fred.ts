import type { FredUnits } from '../../src/banks/types';
import type { Obs } from '../../src/data/schema';
import { createLimiter, getWithRetry } from './http';

export interface FredSeriesInfo {
  id: string;
  title: string;
  frequency_short: string;
  units_short: string;
  last_updated: string;
  observation_start: string;
  observation_end: string;
}

const BASE = 'https://api.stlouisfed.org/fred';

/** "2026-09-30 07:43:28-05" → "2026-09-30T07:43:28-05:00" */
export function fredTimestampToISO(ts: string): string {
  const m = ts.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})([+-]\d{2})(?::?(\d{2}))?$/);
  if (!m) return ts;
  return `${m[1]}T${m[2]}${m[3]}:${m[4] ?? '00'}`;
}

/** FRED encodes missing values as "." — drop them (and anything non-numeric). */
export function parseObservations(raw: Array<{ date: string; value: string }>): Obs[] {
  const out: Obs[] = [];
  for (const o of raw) {
    if (o.value === '.' || o.value.trim() === '') continue;
    const v = Number(o.value);
    if (Number.isFinite(v)) out.push([o.date, v]);
  }
  return out;
}

export class FredClient {
  private readonly limit = createLimiter(4, 300);

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const q = new URLSearchParams({ ...params, api_key: this.apiKey, file_type: 'json' });
    const body = await this.limit(() => getWithRetry(`${BASE}/${path}?${q}`));
    return JSON.parse(body) as T;
  }

  async seriesInfo(id: string): Promise<FredSeriesInfo> {
    const r = await this.get<{ seriess?: FredSeriesInfo[] }>('series', { series_id: id });
    const info = r.seriess?.[0];
    if (!info) throw new Error(`FRED returned no metadata for ${id}`);
    return info;
  }

  async observations(
    id: string,
    units: FredUnits,
    observationStart?: string,
  ): Promise<{ obs: Obs[]; unitsLabel?: string }> {
    const params: Record<string, string> = { series_id: id, units };
    if (observationStart) params.observation_start = observationStart;
    const r = await this.get<{ observations?: Array<{ date: string; value: string }> }>(
      'series/observations',
      params,
    );
    if (!r.observations) throw new Error(`FRED returned no observations for ${id}`);
    return { obs: parseObservations(r.observations) };
  }
}

/** FRED's short label for a units transform. */
export const UNITS_LABEL: Record<FredUnits, string | null> = {
  lin: null,
  pc1: '% Chg. from Yr. Ago',
  pca: '% Chg. at Annual Rate',
  chg: 'Chg.',
};
