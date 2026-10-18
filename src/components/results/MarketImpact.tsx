import { useMemo } from 'react';
import { useT } from '../../i18n';
import { marketCalls, type MarketCall } from '../../insights/analysis';
import { useSim } from '../../state/sim';
import { ArrowIcon } from '../icons';

function reasonKey(c: MarketCall): string {
  if (c.dir === 'flat') return 'neutral';
  return `${c.key}${c.dir === 'up' ? 'Up' : 'Down'}`;
}

export function MarketImpact() {
  const t = useT();
  const result = useSim((s) => s.result);
  const calls = useMemo(() => (result ? marketCalls(result) : []), [result]);
  if (!result) return null;
  const dirLabel = (c: MarketCall) =>
    c.dir === 'up' ? t.directionUp : c.dir === 'down' ? t.directionDown : t.directionFlat;

  return (
    <section className="glass p-3 sm:p-4" aria-labelledby="market-title">
      <h2 id="market-title" className="text-base font-bold">
        {t.marketTitle}
      </h2>
      <p className="mb-3 text-xs text-muted">{t.marketNote}</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {calls.map((c) => (
          <li key={c.key} className="rounded-xl border border-line bg-bg-2/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <h3 className="text-sm font-semibold">{t.marketItems[c.key]}</h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  c.dir === 'flat' ? 'border-line text-muted' : 'border-line-strong text-fg'
                }`}
              >
                <ArrowIcon dir={c.dir} size={13} />
                {dirLabel(c)}
                {c.strength !== 'none' && (
                  <span className="font-normal text-muted">· {t.strength[c.strength]}</span>
                )}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              {t.marketReasons[reasonKey(c) as keyof typeof t.marketReasons]}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
