import { useMemo } from 'react';
import { usePrefs, type Lang } from '../state/prefs';
import { en } from './en';
import { fa, type Messages } from './fa';
import { toPersianDigits } from './format';

export const MESSAGES: Record<Lang, Messages> = { fa, en };

/** Keys whose digits must stay Latin (input-format examples). */
const LATIN_ONLY = new Set(['marketOverridePlaceholder', 'overrideError']);

/** Convert standalone digits (not parts of IDs like GDPC1 or 5y5y). */
const persianize = (s: string) =>
  s.replace(/(?<![A-Za-z\d.])\d+(?:\.\d+)?(?![A-Za-z\d])/g, (m) => toPersianDigits(m));

function deepPersianize<T>(v: T, key = ''): T {
  if (LATIN_ONLY.has(key)) return v;
  if (typeof v === 'string') return persianize(v) as T;
  if (typeof v === 'function') {
    const fn = v as unknown as (...a: unknown[]) => unknown;
    return ((...a: unknown[]) => {
      const out = fn(...a);
      return typeof out === 'string' ? persianize(out) : out;
    }) as T;
  }
  if (Array.isArray(v)) return v.map((x) => deepPersianize(x)) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepPersianize(x, k)])) as T;
  }
  return v;
}

let persianFa: Messages | null = null;

export function useT(): Messages {
  const lang = usePrefs((s) => s.lang);
  const pd = usePrefs((s) => s.persianDigits);
  return useMemo(() => {
    if (lang !== 'fa' || !pd) return MESSAGES[lang];
    persianFa ??= deepPersianize(fa);
    return persianFa;
  }, [lang, pd]);
}

export type { Messages };
