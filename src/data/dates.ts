/**
 * Calendar helpers. All dates are ISO `YYYY-MM-DD` strings interpreted at UTC
 * midnight, so results never depend on the viewer's time zone.
 */
const DAY_MS = 86_400_000;

export function parseISODate(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISODate(parseISODate(iso) + days * DAY_MS);
}

/** Whole days from `a` to `b` (positive if b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b) - parseISODate(a)) / DAY_MS);
}

export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export interface Quarter {
  year: number;
  /** 1..4 */
  q: number;
}

export function quarterOf(iso: string): Quarter {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return { year, q: Math.floor((month - 1) / 3) + 1 };
}

export function addQuarters(qt: Quarter, n: number): Quarter {
  const idx = qt.year * 4 + (qt.q - 1) + n;
  return { year: Math.floor(idx / 4), q: (idx % 4) + 1 };
}

export function quarterKey(qt: Quarter): string {
  return `${qt.year}Q${qt.q}`;
}

/** First day of the quarter. */
export function quarterStart(qt: Quarter): string {
  return `${qt.year}-${String((qt.q - 1) * 3 + 1).padStart(2, '0')}-01`;
}

/** First day of the following quarter (exclusive end). */
export function quarterEnd(qt: Quarter): string {
  return quarterStart(addQuarters(qt, 1));
}

/** Middle of the quarter — where quarterly model values are plotted. */
export function quarterMid(qt: Quarter): string {
  const s = parseISODate(quarterStart(qt));
  const e = parseISODate(quarterEnd(qt));
  return toISODate(s + Math.floor((e - s) / 2 / DAY_MS) * DAY_MS);
}

/** Year fraction between two dates (ACT/365). */
export function yearFrac(a: string, b: string): number {
  return daysBetween(a, b) / 365;
}
