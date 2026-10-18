import { useMemo } from 'react';
import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import { transmissionStages } from '../../insights/analysis';
import { useSim } from '../../state/sim';
import { useView } from '../../state/view';

export function Transmission() {
  const t = useT();
  const f = useFmt();
  const { result, quarters } = useSim();
  const playing = useView((s) => s.playing);
  const playQ = useView((s) => s.playQuarter);
  const stages = useMemo(() => (result ? transmissionStages(result) : []), [result]);
  if (!result) return null;

  return (
    <section className="glass p-3 sm:p-4" aria-labelledby="trans-title">
      <h2 id="trans-title" className="mb-3 text-base font-bold">
        {t.transTitle}
      </h2>
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((s, i) => {
          const meta = t.transStages[i]!;
          const lit = s.noticeable && (!playing || (playQ ?? 0) >= s.onset);
          const q = quarters[s.peak.q];
          return (
            <li
              key={s.key}
              className={`relative rounded-xl border p-3 transition-colors duration-300 ${
                lit ? 'border-scenario bg-scenario-soft' : 'border-line bg-bg-2/40'
              }`}
              aria-current={playing && lit ? 'step' : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    lit ? 'bg-scenario text-on-accent' : 'bg-line text-muted'
                  }`}
                  aria-hidden="true"
                >
                  {f.digits(String(i + 1))}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{meta.name}</h3>
                  <p className="text-[11px] text-muted">{meta.typical}</p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed">
                {s.noticeable && q
                  ? t.transPeak(
                      f.digits(t.quarterLong(String(q.q), String(q.year))),
                      f.digits(String(s.peak.q * 3)),
                    )
                  : t.transNoEffect}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
