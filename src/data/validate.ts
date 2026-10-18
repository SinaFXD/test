/**
 * Semantic validation on top of the zod schema. The pipeline refuses to
 * publish data that fails any of these checks (previous data is kept).
 */
import { FED_SERIES } from '../banks/fed/series';
import { LatestDataSchema, type LatestData } from './schema';

/** Plausible ranges — anything outside almost certainly means a broken feed. */
const BOUNDS: Record<string, [number, number]> = {
  fedUpper: [0, 25],
  fedLower: [0, 25],
  effr: [-1, 25],
  sofr: [-1, 25],
  corePce: [-10, 25],
  pce: [-10, 25],
  cpi: [-10, 30],
  coreCpi: [-10, 30],
  unrate: [0.5, 30],
  nrou: [2, 10],
  gdpGrowth: [-40, 40],
  payrolls: [-25000, 10000],
  housingStarts: [100, 4000],
  dgs1mo: [-1, 25],
  dgs3mo: [-1, 25],
  dgs6mo: [-1, 25],
  dgs1: [-1, 25],
  dgs2: [-1, 25],
  dgs10: [-1, 25],
  real10: [-5, 10],
  mortgage30: [1, 25],
  be5: [-5, 10],
  be10: [-5, 10],
  fwd5y5y: [-5, 10],
  mich: [-5, 20],
  dollar: [50, 250],
  sp500: [500, 50000],
  wti: [-50, 400],
  baaSpread: [0, 15],
  vix: [5, 150],
  sepFunds: [0, 20],
  sepFundsLR: [0, 10],
  sepPce: [-5, 20],
  sepCorePce: [-5, 20],
  sepUnrate: [1, 20],
  sepGdp: [-20, 20],
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data?: LatestData;
}

export function validateLatest(raw: unknown, now: Date = new Date()): ValidationResult {
  const parsed = LatestDataSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues
        .slice(0, 20)
        .map((i) => `schema: ${i.path.join('.')}: ${i.message}`),
    };
  }
  const d = parsed.data;
  const errors: string[] = [];
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);

  for (const spec of FED_SERIES) {
    const s = d.series[spec.key];
    if (!s) {
      errors.push(`missing series ${spec.key} (${spec.id})`);
      continue;
    }
    const [lo, hi] = BOUNDS[spec.key] ?? [-Infinity, Infinity];
    if (s.latest < lo || s.latest > hi) {
      errors.push(`${spec.key}: latest ${s.latest} outside plausible range [${lo}, ${hi}]`);
    }
    const minHistory = spec.kind === 'sep' ? 1 : 8;
    if (s.history.length < minHistory) {
      errors.push(`${spec.key}: only ${s.history.length} history points`);
    }
    if (spec.kind === 'observed' && s.lastObservationDate > tomorrow) {
      errors.push(`${spec.key}: observation date ${s.lastObservationDate} is in the future`);
    }
    for (let i = 1; i < s.history.length; i++) {
      if (s.history[i]![0] <= s.history[i - 1]![0]) {
        errors.push(`${spec.key}: history not strictly ascending at ${s.history[i]![0]}`);
        break;
      }
    }
  }

  const up = d.series.fedUpper?.latest;
  const lo = d.series.fedLower?.latest;
  if (up !== undefined && lo !== undefined) {
    const width = up - lo;
    if (!(width > 0 && width <= 1)) errors.push(`fed funds range width ${width} is implausible`);
    const effr = d.series.effr?.latest;
    if (effr !== undefined && (effr < lo - 0.2 || effr > up + 0.2)) {
      errors.push(`EFFR ${effr} far outside target range ${lo}–${up}`);
    }
  }

  const mp = d.marketPath;
  if (!mp) errors.push('market path missing');
  else {
    if (mp.meetings.length < 1) errors.push('market path has no meetings');
    if (mp.quarterly.length < 4) errors.push('market path has fewer than 4 quarters');
    for (const m of [...mp.meetings, ...mp.quarterly]) {
      if (m.rate < -1 || m.rate > 25) errors.push(`market path rate ${m.rate} implausible`);
    }
  }

  const today = now.toISOString().slice(0, 10);
  const futureMeetings = d.fomc.meetings.filter((m) => m.date >= today);
  if (futureMeetings.length < 4) errors.push(`only ${futureMeetings.length} future FOMC meetings`);
  if (!d.derived.outputGap) errors.push('output gap could not be computed');
  if (!d.derived.nrou) errors.push('NROU for the current quarter missing');
  if (!d.derived.gPot) errors.push('potential growth could not be computed');

  return errors.length ? { ok: false, errors } : { ok: true, errors, data: d };
}
