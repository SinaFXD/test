/**
 * Data contract between the pipeline (scripts/fetch-data.ts) and the web app.
 * Shared by both sides; the app re-validates at runtime and falls back to the
 * bundled snapshot if validation fails.
 */
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const num = z.number(); // zod 4 rejects NaN and ±Infinity

export const ObsSchema = z.tuple([isoDate, num]);

export const SeriesDataSchema = z.object({
  key: z.string(),
  id: z.string(),
  title: z.string(),
  /** FRED's short units for the stored transform, e.g. "%", "% Chg. from Yr. Ago". */
  units: z.string(),
  transform: z.enum(['lin', 'pc1', 'pca', 'chg']),
  /** FRED frequency_short: D, W, BW, M, Q, SA, A, NA … */
  frequency: z.string(),
  kind: z.enum(['observed', 'projection', 'sep']),
  /** FRED `last_updated` as ISO 8601 (when the source last published). */
  lastUpdated: z.string(),
  lastObservationDate: isoDate,
  latest: num,
  previous: num.nullable(),
  change: num.nullable(),
  history: z.array(ObsSchema),
  staleDays: num.optional(),
  /** True when the fallback series ID was used (e.g. DFF instead of EFFR). */
  fallbackUsed: z.boolean().optional(),
});

export const DatedValueSchema = z.object({ value: num, asOf: isoDate });

export const MarketPathSchema = z.object({
  asOf: isoDate,
  startRate: num,
  horizonEnd: isoDate,
  meetings: z.array(z.object({ date: isoDate, rate: num })),
  quarterly: z.array(z.object({ quarter: z.string(), start: isoDate, rate: num })),
  inputs: z.record(z.string(), num),
});

export const SepYearSchema = z.object({
  year: z.number().int(),
  fedFunds: num.nullable(),
  corePce: num.nullable(),
  pce: num.nullable(),
  unrate: num.nullable(),
  gdp: num.nullable(),
});

export const FomcMeetingSchema = z.object({ date: isoDate, sep: z.boolean() });

export const LatestDataSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  bank: z.string(),
  generatedAt: z.string(),
  source: z.object({ name: z.string(), url: z.string(), attribution: z.string() }),
  series: z.record(z.string(), SeriesDataSchema),
  derived: z.object({
    fedFundsMid: DatedValueSchema,
    outputGap: DatedValueSchema.nullable(),
    rStar: DatedValueSchema.extend({ method: z.enum(['sep', 'fallback']) }),
    piLR: DatedValueSchema.extend({
      method: z.enum(['5y5y', 'fallback']),
      raw5y5y: num.nullable(),
      wedge: num,
      clamped: z.boolean(),
    }),
    gPot: DatedValueSchema.nullable(),
    nrou: DatedValueSchema.nullable(),
    mortgageSpread: DatedValueSchema.nullable(),
  }),
  marketPath: MarketPathSchema.nullable(),
  sep: z
    .object({
      releaseDate: isoDate,
      years: z.array(SepYearSchema),
      longerRunFunds: num.nullable(),
    })
    .nullable(),
  fomc: z.object({
    meetings: z.array(FomcMeetingSchema),
    source: z.enum(['federalreserve.gov', 'bundled']),
    checkedAt: z.string(),
  }),
});

export const SnapshotSchema = z.object({
  date: isoDate,
  generatedAt: z.string(),
  /** True for snapshots rebuilt later from FRED history (current data vintage). */
  reconstructed: z.boolean(),
  indicators: z.record(z.string(), num),
  marketPath: z.object({
    startRate: num,
    meetings: z.array(z.object({ date: isoDate, rate: num })),
    horizonEnd: isoDate,
  }),
});

export const SnapshotIndexSchema = z.object({
  updatedAt: z.string(),
  dates: z.array(isoDate),
});

export type Obs = z.infer<typeof ObsSchema>;
export type SeriesData = z.infer<typeof SeriesDataSchema>;
export type LatestData = z.infer<typeof LatestDataSchema>;
export type MarketPathData = z.infer<typeof MarketPathSchema>;
export type SepYear = z.infer<typeof SepYearSchema>;
export type FomcMeeting = z.infer<typeof FomcMeetingSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type SnapshotIndex = z.infer<typeof SnapshotIndexSchema>;
