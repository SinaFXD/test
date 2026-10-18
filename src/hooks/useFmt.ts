import { useMemo } from 'react';
import { useT } from '../i18n';
import {
  fmtBp,
  fmtDate,
  fmtJalali,
  fmtNum,
  fmtPct,
  fmtPp,
  fmtRate,
  toPersianDigits,
  type NumOpts,
} from '../i18n/format';
import { usePrefs } from '../state/prefs';

/** Formatting bound to the current language and digit preference (for running text). */
export function useFmt() {
  const lang = usePrefs((s) => s.lang);
  const pd = usePrefs((s) => s.persianDigits);
  const t = useT();
  return useMemo(() => {
    const persian = lang === 'fa' && pd;
    const o = (x: NumOpts = {}) => ({ persian, ...x });
    // In RTL text, isolate numbers (LRI … PDI) so signs and % never flip sides.
    const iso = lang === 'fa' ? (s: string) => `\u2066${s}\u2069` : (s: string) => s;
    return {
      lang,
      persian,
      num: (x: number | null | undefined, opts: NumOpts = {}) => iso(fmtNum(x, o(opts))),
      rate: (x: number | null | undefined, opts: NumOpts = {}) => iso(fmtRate(x, o(opts))),
      pct: (x: number | null | undefined, opts: NumOpts = {}) => iso(fmtPct(x, o(opts))),
      pp: (x: number | null | undefined, opts: NumOpts = {}) =>
        fmtPp(x, t.ppShort, o(opts)).replace(/^\S+/, iso),
      // Latin unit ("bp"): isolate number + unit together so RTL keeps "+5 bp".
      bp: (pp: number | null | undefined, opts: NumOpts = {}) => iso(fmtBp(pp, t.bpShort, o(opts))),
      /** Isolate an arbitrary LTR run (e.g. a numeric range) inside RTL text. */
      ltr: iso,
      date: (iso: string | undefined, short = false) => fmtDate(iso, lang, persian, short),
      jalali: (iso: string | undefined) => fmtJalali(iso, persian),
      digits: (s: string) => (persian ? toPersianDigits(s) : s),
      /** Digits for screen-reader text in Persian (always Persian digits in FA). */
      aria: (s: string) => (lang === 'fa' ? toPersianDigits(s) : s),
    };
  }, [lang, pd, t]);
}
