import type { SeriesSpec } from '../types';

/**
 * Every FRED series the app uses. All IDs were verified with `fred/series`
 * on 2026-10-18. Changes vs. the original brief are documented in CLAUDE.md
 * (JCXFEMD added: SEP median for *core* PCE, to compare with the model's core PCE).
 */
export const FED_SERIES = [
  // Policy rates
  { key: 'fedUpper', id: 'DFEDTARU', units: 'lin', kind: 'observed' },
  { key: 'fedLower', id: 'DFEDTARL', units: 'lin', kind: 'observed' },
  { key: 'effr', id: 'EFFR', fallbackId: 'DFF', units: 'lin', kind: 'observed' },
  { key: 'sofr', id: 'SOFR', units: 'lin', kind: 'observed' },
  // Inflation
  { key: 'corePce', id: 'PCEPILFE', units: 'pc1', kind: 'observed' },
  { key: 'pce', id: 'PCEPI', units: 'pc1', kind: 'observed' },
  { key: 'cpi', id: 'CPIAUCSL', units: 'pc1', kind: 'observed' },
  { key: 'coreCpi', id: 'CPILFESL', units: 'pc1', kind: 'observed' },
  // Labour market & activity
  { key: 'unrate', id: 'UNRATE', units: 'lin', kind: 'observed' },
  { key: 'nrou', id: 'NROU', units: 'lin', kind: 'projection' },
  { key: 'gdpGrowth', id: 'GDPC1', units: 'pca', kind: 'observed' },
  { key: 'gdp', id: 'GDPC1', units: 'lin', kind: 'observed' },
  { key: 'gdpPot', id: 'GDPPOT', units: 'lin', kind: 'projection' },
  { key: 'payrolls', id: 'PAYEMS', units: 'chg', kind: 'observed' },
  { key: 'housingStarts', id: 'HOUST', units: 'lin', kind: 'observed' },
  // Treasury curve
  { key: 'dgs1mo', id: 'DGS1MO', units: 'lin', kind: 'observed' },
  { key: 'dgs3mo', id: 'DGS3MO', units: 'lin', kind: 'observed' },
  { key: 'dgs6mo', id: 'DGS6MO', units: 'lin', kind: 'observed' },
  { key: 'dgs1', id: 'DGS1', units: 'lin', kind: 'observed' },
  { key: 'dgs2', id: 'DGS2', units: 'lin', kind: 'observed' },
  { key: 'dgs10', id: 'DGS10', units: 'lin', kind: 'observed' },
  { key: 'real10', id: 'DFII10', units: 'lin', kind: 'observed' },
  { key: 'mortgage30', id: 'MORTGAGE30US', units: 'lin', kind: 'observed' },
  // Inflation expectations
  { key: 'be5', id: 'T5YIE', units: 'lin', kind: 'observed' },
  { key: 'be10', id: 'T10YIE', units: 'lin', kind: 'observed' },
  { key: 'fwd5y5y', id: 'T5YIFR', units: 'lin', kind: 'observed' },
  { key: 'mich', id: 'MICH', units: 'lin', kind: 'observed' },
  // Markets
  // H.10 broad dollar index is published weekly (Mondays) with a ~1-week lag.
  { key: 'dollar', id: 'DTWEXBGS', units: 'lin', kind: 'observed', staleDays: 10 },
  { key: 'sp500', id: 'SP500', units: 'lin', kind: 'observed' },
  { key: 'wti', id: 'DCOILWTICO', units: 'lin', kind: 'observed' },
  { key: 'baaSpread', id: 'BAA10Y', units: 'lin', kind: 'observed' },
  { key: 'vix', id: 'VIXCLS', units: 'lin', kind: 'observed' },
  // FOMC Summary of Economic Projections (medians)
  { key: 'sepFunds', id: 'FEDTARMD', units: 'lin', kind: 'sep' },
  { key: 'sepFundsLR', id: 'FEDTARMDLR', units: 'lin', kind: 'sep' },
  { key: 'sepPce', id: 'PCECTPIMD', units: 'lin', kind: 'sep' },
  { key: 'sepCorePce', id: 'JCXFEMD', units: 'lin', kind: 'sep' },
  { key: 'sepUnrate', id: 'UNRATEMD', units: 'lin', kind: 'sep' },
  { key: 'sepGdp', id: 'GDPC1MD', units: 'lin', kind: 'sep' },
] as const satisfies readonly SeriesSpec[];

export type FedSeriesKey = (typeof FED_SERIES)[number]['key'];

export const FED_SERIES_KEYS = FED_SERIES.map((s) => s.key) as FedSeriesKey[];

export function fredSeriesUrl(id: string): string {
  return `https://fred.stlouisfed.org/series/${encodeURIComponent(id)}`;
}
