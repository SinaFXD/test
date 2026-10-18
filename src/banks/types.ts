/**
 * Central-bank abstraction. Everything bank-specific (series, calendar, labels,
 * inflation target) lives behind this interface so ECB/BoE configs can be added
 * later without touching the model or UI plumbing.
 */
export type FredUnits = 'lin' | 'pc1' | 'pca' | 'chg';

export type SeriesKind =
  /** Regular observed data — subject to staleness checks. */
  | 'observed'
  /** Forward-looking projections (CBO potential GDP / NROU) — no staleness. */
  | 'projection'
  /** FOMC Summary of Economic Projections — updated quarterly, no staleness. */
  | 'sep';

export interface SeriesSpec {
  /** Stable key used throughout the app (e.g. `corePce`). */
  key: string;
  /** Primary FRED series ID. */
  id: string;
  /** Used if the primary series fails to load (e.g. EFFR → DFF). */
  fallbackId?: string;
  units: FredUnits;
  kind: SeriesKind;
  /**
   * Override for the staleness threshold in days (measured from FRED's
   * `last_updated`). Defaults depend on frequency; see `src/data/staleness.ts`.
   */
  staleDays?: number;
}

export interface BankConfig {
  id: string;
  name: { fa: string; en: string };
  currency: string;
  inflationTarget: number;
  /** Effective lower bound for the policy rate, in %. */
  elb: number;
  series: readonly SeriesSpec[];
  /** Official meeting calendar page (scraped politely once per data run). */
  calendarUrl: string;
}
