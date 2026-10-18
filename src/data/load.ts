import {
  LatestDataSchema,
  SnapshotIndexSchema,
  SnapshotSchema,
  type LatestData,
  type Snapshot,
} from './schema';
import { addDays } from './dates';

export type DataSource = 'live' | 'fallback';

const base = () => import.meta.env.BASE_URL;

/**
 * Load latest.json; if the request or validation fails, fall back to the
 * snapshot bundled at build time (lazy chunk, so it costs nothing normally).
 */
export async function loadLatestDirect(): Promise<{
  data: LatestData;
  source: DataSource;
  error?: string;
}> {
  try {
    const res = await fetch(`${base()}data/latest.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = LatestDataSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error(`invalid data: ${parsed.error.issues[0]?.message}`);
    return { data: parsed.data, source: 'live' };
  } catch (err) {
    const fb = await import('./fallback.json');
    const data = LatestDataSchema.parse(fb.default);
    return { data, source: 'fallback', error: err instanceof Error ? err.message : String(err) };
  }
}

let indexPromise: Promise<string[]> | null = null;

async function snapshotDates(): Promise<string[]> {
  indexPromise ??= fetch(`${base()}data/history/index.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((j) => SnapshotIndexSchema.parse(j).dates)
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

/** Latest snapshot dated on or before `asOf − daysAgo` (within a 10-day window). */
export async function loadSnapshot(asOf: string, daysAgo: number): Promise<Snapshot | null> {
  const target = addDays(asOf, -daysAgo);
  const earliest = addDays(target, -10);
  const dates = await snapshotDates();
  const date = [...dates].reverse().find((d) => d <= target && d >= earliest);
  if (!date) return null;
  try {
    const res = await fetch(`${base()}data/history/${date}.json`);
    if (!res.ok) return null;
    const parsed = SnapshotSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
