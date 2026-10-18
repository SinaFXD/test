/**
 * Data pipeline: FRED (+ official FOMC calendar) → public/data/latest.json,
 * daily snapshots in public/data/history/, and the bundled fallback snapshot.
 *
 * All-or-nothing: if any fetch or validation fails, nothing is written and the
 * process exits non-zero, so the previously published data stays live.
 *
 *   npm run fetch-data                 # fetch, validate, write
 *   npm run fetch-data -- --dry-run    # fetch + validate only
 *   npm run fetch-data -- --backfill-days=45
 */
import { readFileSync, rmSync } from 'node:fs';
import { FED, FED_SERIES } from '../src/banks/fed';
import type { SeriesSpec } from '../src/banks/types';
import { addDays, parseISODate, todayISO } from '../src/data/dates';
import {
  fedFundsMid,
  outputGap,
  piLR,
  PI_LR_WEDGE,
  potentialGrowth,
  round,
  rStar,
  valueAtQuarter,
} from '../src/data/derive';
import {
  impliedMeetingPath,
  stepPathToQuarterly,
  type TreasuryCurve,
} from '../src/data/market-path';
import {
  SCHEMA_VERSION,
  SnapshotIndexSchema,
  type FomcMeeting,
  type LatestData,
  type Obs,
  type SeriesData,
  type Snapshot,
} from '../src/data/schema';
import { isStale } from '../src/data/staleness';
import { validateLatest } from '../src/data/validate';
import { buildSeries, fetchStart } from './lib/build-series';
import { loadEnv, redact } from './lib/env';
import { fetchOfficialMeetings, mergeMeetings, plausibleYears } from './lib/fomc';
import { FredClient, type FredSeriesInfo } from './lib/fred';
import { toJSON, writeFileAtomic } from './lib/fs';
import {
  datesToPrune,
  listSnapshotDates,
  reconstructSnapshot,
  snapshotPath,
  valueAsOf,
} from './lib/history';

const OUT_LATEST = 'public/data/latest.json';
const OUT_HISTORY = 'public/data/history';
const OUT_FALLBACK = 'src/data/fallback.json';
const FOMC_JSON = 'src/data/fomc-dates.json';

interface Loaded {
  spec: SeriesSpec;
  info: FredSeriesInfo;
  raw: Obs[];
  data: SeriesData;
}

function parseArgs(argv: string[]) {
  const get = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  return {
    dryRun: argv.includes('--dry-run'),
    backfillDays: Number(get('backfill-days') ?? 45),
  };
}

async function loadSeries(fred: FredClient, spec: SeriesSpec, today: string): Promise<Loaded> {
  const attempt = async (id: string, fallbackUsed: boolean): Promise<Loaded> => {
    const info = await fred.seriesInfo(id);
    const { obs } = await fred.observations(
      id,
      spec.units,
      fetchStart(spec, info.frequency_short, today),
    );
    return { spec, info, raw: obs, data: buildSeries(spec, info, obs, { today, fallbackUsed }) };
  };
  try {
    return await attempt(spec.id, false);
  } catch (err) {
    if (!spec.fallbackId) throw err;
    console.warn(`! ${spec.id} failed (${redact(String(err))}); trying ${spec.fallbackId}`);
    return attempt(spec.fallbackId, true);
  }
}

/** Only keep meetings that matter: ~15 months back (snapshots) and everything ahead. */
const MEETINGS_LOOKBACK_DAYS = 450;

async function loadMeetings(today: string): Promise<{
  meetings: FomcMeeting[];
  source: 'federalreserve.gov' | 'bundled';
  refreshed: boolean;
}> {
  const bundled = JSON.parse(readFileSync(FOMC_JSON, 'utf8')) as { meetings: FomcMeeting[] };
  try {
    const official = await fetchOfficialMeetings(FED.calendarUrl);
    if (plausibleYears(official).size === 0) throw new Error('no year parsed cleanly');
    const cutoff = addDays(today, -MEETINGS_LOOKBACK_DAYS);
    const merged = mergeMeetings(official, bundled.meetings).filter((m) => m.date >= cutoff);
    const refreshed = JSON.stringify(merged) !== JSON.stringify(bundled.meetings);
    return { meetings: merged, source: 'federalreserve.gov', refreshed };
  } catch (err) {
    console.warn(`! FOMC calendar refresh failed, using bundled dates: ${redact(String(err))}`);
    return { meetings: bundled.meetings, source: 'bundled', refreshed: false };
  }
}

/** Latest date on which every curve tenor printed. */
function latestCurveDate(raw: Record<string, Obs[]>, keys: readonly string[]): string {
  const sets = keys.map((k) => new Set((raw[k] ?? []).map(([d]) => d)));
  const candidates = [...sets[0]!].sort().reverse();
  const date = candidates.find((d) => sets.every((s) => s.has(d)));
  if (!date) throw new Error('no date with a complete Treasury curve');
  return date;
}

function isBusinessDay(iso: string): boolean {
  const dow = new Date(parseISODate(iso)).getUTCDay();
  return dow !== 0 && dow !== 6;
}

async function main(): Promise<void> {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.FRED_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'FRED_API_KEY is not set. Copy .env.example to .env and add your free key from https://fred.stlouisfed.org/docs/api/api_key.html',
    );
  }

  const today = todayISO();
  const generatedAt = new Date().toISOString();
  const fred = new FredClient(apiKey);

  console.info(`Fetching ${FED_SERIES.length} FRED series + FOMC calendar…`);
  const [fomc, loaded] = await Promise.all([
    loadMeetings(today),
    Promise.all(FED_SERIES.map((spec) => loadSeries(fred, spec, today))),
  ]);

  const by = Object.fromEntries(loaded.map((l) => [l.spec.key, l])) as Record<string, Loaded>;
  const raw = Object.fromEntries(loaded.map((l) => [l.spec.key, l.raw])) as Record<string, Obs[]>;
  const s = (k: string) => by[k]!.data;

  // ── Derived values ────────────────────────────────────────────────────
  const gap = outputGap(raw.gdp!, raw.gdpPot!);
  const rs = rStar(s('sepFundsLR').latest, FED.inflationTarget);
  const pi = piLR(s('fwd5y5y').latest, PI_LR_WEDGE);
  const gPot = potentialGrowth(raw.gdpPot!, today, 8);
  const nrou = valueAtQuarter(raw.nrou!, today);
  const mortDate = s('mortgage30').lastObservationDate;
  const dgs10AtMort = valueAsOf(raw.dgs10!, mortDate, 7);

  // ── Market path ───────────────────────────────────────────────────────
  const curveKeys = ['dgs1mo', 'dgs3mo', 'dgs6mo', 'dgs1', 'dgs2'] as const;
  const curveDate = latestCurveDate(raw, curveKeys);
  const curve = Object.fromEntries(
    curveKeys.map((k) => [k, raw[k]!.find(([d]) => d === curveDate)![1]]),
  ) as unknown as TreasuryCurve;
  const effrAtCurve = valueAsOf(raw.effr!, curveDate, 4);
  if (effrAtCurve === undefined) throw new Error(`no EFFR within 4 days of ${curveDate}`);
  const meetingDates = fomc.meetings.map((m) => m.date);
  const path = impliedMeetingPath(curveDate, effrAtCurve, curve, meetingDates);
  const quarterly = stepPathToQuarterly(path);

  // ── SEP block ─────────────────────────────────────────────────────────
  const sepYears = new Map<number, Record<string, number>>();
  const sepMap = {
    fedFunds: 'sepFunds',
    corePce: 'sepCorePce',
    pce: 'sepPce',
    unrate: 'sepUnrate',
    gdp: 'sepGdp',
  };
  for (const [field, key] of Object.entries(sepMap)) {
    for (const [d, v] of s(key).history) {
      const y = Number(d.slice(0, 4));
      sepYears.set(y, { ...(sepYears.get(y) ?? {}), [field]: v });
    }
  }
  const releaseDate = s('sepFundsLR').lastObservationDate;

  const latest: LatestData = {
    schemaVersion: SCHEMA_VERSION,
    bank: FED.id,
    generatedAt,
    source: {
      name: 'FRED',
      url: 'https://fred.stlouisfed.org/',
      attribution: 'Source: FRED, Federal Reserve Bank of St. Louis',
    },
    series: Object.fromEntries(loaded.map((l) => [l.spec.key, l.data])),
    derived: {
      fedFundsMid: {
        value: fedFundsMid(s('fedUpper').latest, s('fedLower').latest),
        asOf: s('fedUpper').lastObservationDate,
      },
      outputGap: gap ? { value: round(gap.value), asOf: gap.date } : null,
      rStar: { value: round(rs.value), asOf: releaseDate, method: rs.method },
      piLR: {
        value: round(pi.value),
        asOf: s('fwd5y5y').lastObservationDate,
        method: pi.method,
        raw5y5y: s('fwd5y5y').latest,
        wedge: PI_LR_WEDGE,
        clamped: pi.clamped,
      },
      gPot: gPot === null ? null : { value: round(gPot), asOf: today },
      nrou: nrou ? { value: round(nrou[1]), asOf: nrou[0] } : null,
      mortgageSpread:
        dgs10AtMort === undefined
          ? null
          : { value: round(s('mortgage30').latest - dgs10AtMort), asOf: mortDate },
    },
    marketPath: {
      asOf: path.asOf,
      startRate: path.startRate,
      horizonEnd: path.horizonEnd,
      meetings: path.meetings.map((m) => ({ date: m.date, rate: round(m.rate) })),
      quarterly: quarterly.map((q) => ({ ...q, rate: round(q.rate) })),
      inputs: { effr: effrAtCurve, ...curve },
    },
    sep: {
      releaseDate,
      years: [...sepYears.entries()]
        .filter(([y]) => y >= Number(releaseDate.slice(0, 4)))
        .sort(([a], [b]) => a - b)
        .map(([year, v]) => ({
          year,
          fedFunds: v.fedFunds ?? null,
          corePce: v.corePce ?? null,
          pce: v.pce ?? null,
          unrate: v.unrate ?? null,
          gdp: v.gdp ?? null,
        })),
      longerRunFunds: s('sepFundsLR').latest,
    },
    fomc: { meetings: fomc.meetings, source: fomc.source, checkedAt: generatedAt },
  };

  // ── Validate (refuse to publish anything suspicious) ─────────────────
  const v = validateLatest(latest);
  if (!v.ok) throw new Error(`Validation failed:\n  - ${v.errors.join('\n  - ')}`);

  // ── Snapshots ─────────────────────────────────────────────────────────
  const snapshots: Snapshot[] = [];
  const current: Snapshot = {
    date: curveDate,
    generatedAt,
    reconstructed: false,
    indicators: Object.fromEntries(
      (
        [
          ['effr', effrAtCurve],
          ['fedFundsMid', latest.derived.fedFundsMid.value],
          ['dgs2', curve.dgs2],
          ['dgs10', valueAsOf(raw.dgs10!, curveDate, 4)],
          ['mortgage30', s('mortgage30').latest],
          ['sp500', valueAsOf(raw.sp500!, curveDate, 4)],
          ['dollar', s('dollar').latest],
          ['corePce', s('corePce').latest],
          ['unrate', s('unrate').latest],
        ] as Array<[string, number | undefined]>
      ).filter((e): e is [string, number] => e[1] !== undefined),
    ),
    marketPath: {
      startRate: path.startRate,
      meetings: latest.marketPath!.meetings,
      horizonEnd: path.horizonEnd,
    },
  };
  snapshots.push(current);

  const existing = new Set(listSnapshotDates(OUT_HISTORY));
  for (let i = 1; i <= args.backfillDays; i++) {
    const d = addDays(curveDate, -i);
    if (existing.has(d) || !isBusinessDay(d)) continue;
    const snap = reconstructSnapshot(d, raw, meetingDates, generatedAt);
    if (snap) snapshots.push(snap);
  }
  const allDates = [...new Set([...existing, ...snapshots.map((x) => x.date)])].sort();
  const prune = datesToPrune(allDates, today);
  const keptDates = allDates.filter((d) => !prune.includes(d));
  const index = SnapshotIndexSchema.parse({ updatedAt: generatedAt, dates: keptDates });

  // ── Summary ───────────────────────────────────────────────────────────
  const now = new Date();
  console.table(
    loaded.map((l) => ({
      key: l.spec.key,
      id: l.data.id,
      freq: l.data.frequency,
      asOf: l.data.lastObservationDate,
      latest: l.data.latest,
      stale: isStale(l.data, now) ? 'STALE' : '',
    })),
  );
  console.info(
    `fedFundsMid=${latest.derived.fedFundsMid.value} gap=${gap?.value.toFixed(2)} r*=${rs.value.toFixed(2)} piLR=${pi.value.toFixed(2)} gPot=${gPot?.toFixed(2)} u*=${nrou?.[1].toFixed(2)}`,
  );
  console.info(
    `market path (${curveDate}): ${path.meetings.map((m) => `${m.date}:${m.rate.toFixed(2)}`).join(' ')}`,
  );
  console.info(
    `FOMC dates from ${fomc.source}; ${snapshots.length} snapshot(s) to write (${snapshots.length - 1} reconstructed), ${prune.length} to prune`,
  );

  if (args.dryRun) {
    console.info('Dry run — nothing written.');
    return;
  }

  // ── Write (only after everything succeeded) ──────────────────────────
  const json = toJSON(latest);
  writeFileAtomic(OUT_LATEST, json);
  writeFileAtomic(OUT_FALLBACK, json);
  for (const snap of snapshots) writeFileAtomic(snapshotPath(OUT_HISTORY, snap.date), toJSON(snap));
  for (const d of prune) rmSync(snapshotPath(OUT_HISTORY, d), { force: true });
  writeFileAtomic(`${OUT_HISTORY}/index.json`, toJSON(index));
  if (fomc.refreshed) {
    const file = JSON.parse(readFileSync(FOMC_JSON, 'utf8')) as Record<string, unknown>;
    writeFileAtomic(FOMC_JSON, toJSON({ ...file, meetings: fomc.meetings }, true));
    console.info(`Updated ${FOMC_JSON} from the official calendar.`);
  }
  console.info(`Wrote ${OUT_LATEST} (${(json.length / 1024).toFixed(0)} KB) and ${OUT_FALLBACK}.`);
}

main().catch((err: unknown) => {
  console.error(
    `✖ fetch-data failed — previous data left untouched.\n${redact(err instanceof Error ? err.message : String(err))}`,
  );
  process.exit(1);
});
