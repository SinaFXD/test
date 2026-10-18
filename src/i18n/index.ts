import { useMemo } from 'react';
import { usePrefs, type Lang } from '../state/prefs';
import { en } from './en';
import { fa, type Messages } from './fa';
import { toPersianDigits } from './format';

export const MESSAGES: Record<Lang, Messages> = { fa, en };

/** Keys whose digits must stay Latin (input-format examples). */
const LATIN_ONLY = new Set(['marketOverridePlaceholder', 'overrideError']);

/** Convert standalone digits (not parts of IDs like GDPC1 or 5y5y). */
export const persianize = (s: string) =>
  s.replace(/(?<![A-Za-z\d.])\d+(?:\.\d+)?(?![A-Za-z\d])/g, (m) => toPersianDigits(m));

/**
 * In RTL text a leading sign or trailing % flips sides ("+100" shows as "100+").
 * Wrap signed numbers and percentages in LRI…PDI isolates (skipping ones already isolated).
 */
export const isolateSigned = (s: string) =>
  s.replace(
    /(?<!\u2066)(?:[+\u2212-]\d+(?:\.\d+)?%?|\d+(?:\.\d+)?%)(?![\d\u2069])/g,
    (m) => `\u2066${m}\u2069`,
  );

function deepMap<T>(v: T, fn: (s: string) => string, key = ''): T {
  if (LATIN_ONLY.has(key)) return v;
  if (typeof v === 'string') return fn(v) as T;
  if (typeof v === 'function') {
    const f = v as unknown as (...a: unknown[]) => unknown;
    return ((...a: unknown[]) => {
      const out = f(...a);
      return typeof out === 'string' ? fn(out) : out;
    }) as T;
  }
  if (Array.isArray(v)) return v.map((x) => deepMap(x, fn)) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, fn, k)])) as T;
  }
  return v;
}

const variants: Partial<Record<'fa' | 'faPersian', Messages>> = {};

export function useT(): Messages {
  const lang = usePrefs((s) => s.lang);
  const pd = usePrefs((s) => s.persianDigits);
  return useMemo(() => {
    if (lang !== 'fa') return MESSAGES.en;
    if (pd) return (variants.faPersian ??= deepMap(fa, (s) => persianize(isolateSigned(s))));
    return (variants.fa ??= deepMap(fa, isolateSigned));
  }, [lang, pd]);
}

export type { Messages };
