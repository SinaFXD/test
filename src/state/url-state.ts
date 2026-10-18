import { DEFAULT_VALUES, sanitize, type ScenarioValues } from './controls';

/** Short URL keys keep share links compact. Only non-default values are written. */
const KEYS: Record<keyof ScenarioValues, string> = {
  tab: 'tab',
  policyChangeBp: 'dp',
  holdQuarters: 'hq',
  inflationShock: 'is',
  shockPersistence: 'sp',
  demandShock: 'ds',
  demandPersistence: 'dr',
  oilShock: 'oil',
  phiPi: 'phi',
  lambda: 'lam',
  rStar: 'rs',
  horizon: 'h',
  baselineMode: 'base',
  marketOverride: 'mo',
};

const TAB_CODES = { rate: 'r', shock: 's', custom: 'c' } as const;
const BASE_CODES = { market: 'm', rule: 'r' } as const;

/** Override lines "2026-12-09 3.875" ↔ compact "2026-12-09:3.875,…" */
export function compactOverride(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) =>
      l
        .trim()
        .split(/[\s,;\t]+/)
        .filter(Boolean),
    )
    .filter((p) => p.length >= 2)
    .map(([d, r]) => `${d}:${r}`)
    .join(',');
}

export function expandOverride(compact: string): string {
  return compact
    .split(',')
    .map((p) => p.split(':').join(' '))
    .join('\n');
}

export function encodeState(v: ScenarioValues): URLSearchParams {
  const q = new URLSearchParams();
  for (const [k, short] of Object.entries(KEYS) as Array<[keyof ScenarioValues, string]>) {
    const val = v[k];
    if (val === DEFAULT_VALUES[k]) continue;
    if (k === 'tab') q.set(short, TAB_CODES[v.tab]);
    else if (k === 'baselineMode') q.set(short, BASE_CODES[v.baselineMode]);
    else if (k === 'marketOverride') {
      const c = compactOverride(v.marketOverride);
      if (c) q.set(short, c);
    } else if (val !== null) q.set(short, String(Math.round(Number(val) * 1000) / 1000));
  }
  return q;
}

export function hasScenarioParams(search: string): boolean {
  const q = new URLSearchParams(search);
  return Object.values(KEYS).some((k) => q.has(k));
}

export function decodeState(search: string): ScenarioValues {
  const q = new URLSearchParams(search);
  const raw: Partial<Record<keyof ScenarioValues, unknown>> = {};
  for (const [k, short] of Object.entries(KEYS) as Array<[keyof ScenarioValues, string]>) {
    const s = q.get(short);
    if (s === null) continue;
    if (k === 'tab') raw.tab = Object.entries(TAB_CODES).find(([, c]) => c === s)?.[0];
    else if (k === 'baselineMode')
      raw.baselineMode = Object.entries(BASE_CODES).find(([, c]) => c === s)?.[0];
    else if (k === 'marketOverride') raw.marketOverride = expandOverride(s);
    else raw[k] = Number(s);
  }
  return sanitize(raw);
}

/** Merge scenario params into the current URL, preserving unrelated params (lang, theme). */
export function buildUrl(
  v: ScenarioValues,
  base: string,
  extra: Record<string, string> = {},
): string {
  const url = new URL(base);
  for (const short of Object.values(KEYS)) url.searchParams.delete(short);
  for (const [k, val] of encodeState(v)) url.searchParams.set(k, val);
  for (const [k, val] of Object.entries(extra)) url.searchParams.set(k, val);
  return url.toString();
}
