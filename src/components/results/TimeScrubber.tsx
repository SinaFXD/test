import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import type { PathKey } from '../../model/types';
import { useSim } from '../../state/sim';
import { useView } from '../../state/view';

type Kind = 'rate' | 'pp' | 'dev';
const SNAPSHOT_ROWS: Array<[PathKey, Kind]> = [
  ['i', 'rate'],
  ['pi', 'pp'],
  ['piH', 'pp'],
  ['u', 'pp'],
  ['g', 'pp'],
  ['y', 'pp'],
  ['y2', 'rate'],
  ['y10', 'rate'],
  ['mort', 'rate'],
  ['usd', 'dev'],
  ['eq', 'dev'],
  ['house', 'dev'],
  ['inv', 'dev'],
];

export function TimeScrubber() {
  const t = useT();
  const f = useFmt();
  const { result, quarters } = useSim();
  const scrub = useView((s) => s.scrubQuarter);
  const set = useView((s) => s.set);
  if (!result || !quarters.length) return null;
  const H = result.horizon;
  const q = Math.min(scrub, H);
  const meta = quarters[q]!;
  const label = q === 0 ? t.now : t.quarterLong(String(meta.q), String(meta.year));
  const shown = f.digits(label);

  const cell = (k: PathKey, kind: Kind, which: 'b' | 's' | 'd') => {
    const b = result.baseline[k][q]!;
    const s = result.scenario[k][q]!;
    if (kind === 'dev') return which === 'b' ? '—' : f.pct(s, { signed: true });
    if (which === 'd') return kind === 'rate' ? f.bp(s - b) : f.pp(s - b);
    const v = which === 'b' ? b : s;
    return kind === 'rate' ? f.rate(v) : f.pct(v);
  };

  const yearTicks = quarters.filter((m) => m.t === 0 || m.q === 1);

  const table = (rows: typeof SNAPSHOT_ROWS, caption: boolean) => (
    <table className="w-full text-xs">
      {caption && <caption className="sr-only">{t.scrubCardTitle(shown)}</caption>}
      <thead>
        <tr className="text-muted">
          {t.scrubCols.map((c, i) => (
            <th key={c} scope="col" className={`py-1 font-medium ${i ? 'text-end' : 'text-start'}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="num">
        {rows.map(([k, kind]) => (
          <tr key={k} className="border-t border-line">
            <th scope="row" className="py-1 text-start font-normal text-muted">
              {t.vars[k as keyof typeof t.vars]}
            </th>
            <td className="py-1 text-end">{cell(k, kind, 'b')}</td>
            <td className="py-1 text-end font-semibold">{cell(k, kind, 's')}</td>
            <td className="py-1 text-end">{cell(k, kind, 'd')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section className="glass p-3 sm:p-4" aria-labelledby="scrub-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="scrub-title" className="text-base font-bold">
          {t.scrubTitle}
        </h2>
        <span className="text-lg font-semibold text-accent-text" aria-live="polite">
          {t.scrubCardTitle(shown)}
        </span>
      </div>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.scrubHint}</p>
      <div dir="ltr" className="mt-2">
        <label htmlFor="scrubber" className="sr-only">
          {t.scrubLabel}
        </label>
        <input
          id="scrubber"
          type="range"
          className="slider"
          min={0}
          max={H}
          step={1}
          value={q}
          style={
            {
              '--a': '0%',
              '--b': `${(q / H) * 100}%`,
              '--fill-dir': 'right',
            } as React.CSSProperties
          }
          aria-valuetext={f.aria(label)}
          onChange={(e) =>
            set({ scrubQuarter: Number(e.currentTarget.value), playing: false, playQuarter: null })
          }
        />
        <div className="relative mx-2 h-4 text-[10px] text-muted" aria-hidden="true">
          {yearTicks.map((m) => (
            <span
              key={m.t}
              className="absolute -translate-x-1/2"
              style={{ left: `${(m.t / H) * 100}%` }}
            >
              {m.t === 0 ? t.now : m.year}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-2 overflow-x-auto md:grid-cols-2">
        {table(SNAPSHOT_ROWS.slice(0, 7), true)}
        {table(SNAPSHOT_ROWS.slice(7), false)}
      </div>
    </section>
  );
}
