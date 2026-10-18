/**
 * Formatting helpers. Rules: rates 2 decimals, percentages/pp 1 decimal,
 * never print NaN/undefined (→ "—"). Latin digits by default; Persian digits
 * in running text only when the user enables it. Charts always use Latin.
 */
import type { Lang } from '../state/prefs';

export const DASH = '—';
const MINUS = '−';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toPersianDigits(s: string): string {
  return s
    .replace(/\d/g, (d) => FA_DIGITS[Number(d)]!)
    .replace(/(\d|[۰-۹])\.(?=[۰-۹\d])/g, '$1٫')
    .replace(/(\d|[۰-۹]),(?=[۰-۹\d])/g, '$1٬');
}

export interface NumOpts {
  dp?: number;
  signed?: boolean;
  persian?: boolean;
  group?: boolean;
}

export function isNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

export function fmtNum(
  x: number | null | undefined,
  { dp = 2, signed = false, persian = false, group = false }: NumOpts = {},
): string {
  if (!isNum(x)) return DASH;
  const rounded = Math.abs(x) < 0.5 * 10 ** -dp ? 0 : x;
  // Manual formatting: toLocaleString builds a new Intl formatter per call (slow on phones).
  let s = Math.abs(rounded).toFixed(dp);
  if (group) s = s.replace(/^(\d+)/, (int) => int.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  if (rounded < 0) s = MINUS + s;
  else if (signed && rounded > 0) s = '+' + s;
  return persian ? toPersianDigits(s) : s;
}

/** Interest rates: 2 decimals + % */
export const fmtRate = (x: number | null | undefined, o: NumOpts = {}) =>
  isNum(x) ? `${fmtNum(x, { dp: 2, ...o })}%` : DASH;

/** Percentages (inflation, growth, % changes): 1 decimal + % */
export const fmtPct = (x: number | null | undefined, o: NumOpts = {}) =>
  isNum(x) ? `${fmtNum(x, { dp: 1, ...o })}%` : DASH;

/** Percentage points: 1 decimal */
export const fmtPp = (x: number | null | undefined, unit: string, o: NumOpts = {}) =>
  isNum(x) ? `${fmtNum(x, { dp: 1, signed: true, ...o })} ${unit}` : DASH;

/** Basis points from a pp value */
export const fmtBp = (pp: number | null | undefined, unit: string, o: NumOpts = {}) =>
  isNum(pp) ? `${fmtNum(pp * 100, { dp: 0, signed: true, ...o })} ${unit}` : DASH;

/** Intl formatters are expensive to construct: cache one per (locale, options). */
const dtfCache = new Map<string, Intl.DateTimeFormat>();
export function dtf(loc: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${loc}|${JSON.stringify(opts)}`;
  let f = dtfCache.get(key);
  if (!f) dtfCache.set(key, (f = new Intl.DateTimeFormat(loc, opts)));
  return f;
}

function locale(lang: Lang, persianDigits: boolean, calendar: 'gregory' | 'persian' = 'gregory') {
  if (lang === 'en') return 'en-US';
  return `fa-IR-u-ca-${calendar}-nu-${persianDigits ? 'arabext' : 'latn'}`;
}

function parseDate(iso: string): Date {
  return iso.length <= 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
}

/** Gregorian date, e.g. "Oct 15, 2026" / "۱۵ اکتبر ۲۰۲۶" */
export function fmtDate(
  iso: string | undefined,
  lang: Lang,
  persianDigits = false,
  short = false,
): string {
  if (!iso) return DASH;
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  return dtf(locale(lang, persianDigits), {
    year: 'numeric',
    month: short ? 'short' : 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** Jalali (Solar Hijri) date for tooltips, e.g. "۲۴ مهر ۱۴۰۵" */
export function fmtJalali(iso: string | undefined, persianDigits = false): string {
  if (!iso) return DASH;
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  return dtf(locale('fa', persianDigits, 'persian'), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

const rtfCache: Partial<Record<Lang, Intl.RelativeTimeFormat>> = {};

export function fmtRelative(fromISO: string, lang: Lang, now: Date = new Date()): string {
  const diffSec = (new Date(fromISO).getTime() - now.getTime()) / 1000;
  if (!Number.isFinite(diffSec)) return DASH;
  const rtf = (rtfCache[lang] ??= new Intl.RelativeTimeFormat(
    lang === 'fa' ? 'fa-u-nu-latn' : 'en',
    {
      numeric: 'auto',
    },
  ));
  const abs = Math.abs(diffSec);
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86400), 'day');
}

/** "Q1 2027" — Latin digits for charts in both languages. */
export function quarterLabel(year: number, q: number): string {
  return `Q${q} ${year}`;
}

/**
 * UTC timestamp of 2:00 pm America/New_York on an FOMC decision date
 * (when the statement is released).
 */
const decisionCache = new Map<string, number>();

export function fomcDecisionTime(iso: string): number {
  const cached = decisionCache.get(iso);
  if (cached !== undefined) return cached;
  const guess = Date.parse(`${iso}T18:00:00Z`);
  const parts = dtf('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(guess));
  const off = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  const m = off.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const hours = m ? (m[1] === '-' ? 1 : -1) * (Number(m[2]) + Number(m[3] ?? 0) / 60) : 5;
  const t = Date.parse(`${iso}T14:00:00Z`) + hours * 3_600_000;
  decisionCache.set(iso, t);
  return t;
}
