import { fredSeriesUrl, FED_SERIES } from '../../banks/fed/series';
import { isStale } from '../../data/staleness';
import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import { useData } from '../../state/data';
import { useView } from '../../state/view';
import { Dialog } from '../Dialog';
import { WarnIcon } from '../icons';

export default function SourcesModal() {
  const t = useT();
  const f = useFmt();
  const open = useView((s) => s.sourcesOpen);
  const set = useView((s) => s.set);
  const data = useData((s) => s.data);
  if (!data) return null;
  const now = new Date();

  return (
    <Dialog open={open} onClose={() => set({ sourcesOpen: false })} title={t.sourcesTitle}>
      <div className="space-y-5 text-sm">
        <p className="leading-relaxed text-muted">{t.sourcesIntro}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted">
                {t.sourcesCols.map((c) => (
                  <th key={c} scope="col" className="p-1.5 text-start font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FED_SERIES.map((spec) => {
                const s = data.series[spec.key];
                return (
                  <tr key={spec.key} className="border-t border-line align-top">
                    <td className="p-1.5 font-mono whitespace-nowrap">
                      <a
                        href={fredSeriesUrl(s?.id ?? spec.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-text underline"
                        title={t.openFred}
                      >
                        {s?.id ?? spec.id}
                      </a>
                      {spec.units !== 'lin' && (
                        <span className="ms-1 text-faint">({spec.units})</span>
                      )}
                    </td>
                    <td className="p-1.5" dir="ltr">
                      {s?.title ?? t.unavailable}
                      {s && <span className="block text-[10px] text-faint">{s.units}</span>}
                    </td>
                    <td
                      className="p-1.5 whitespace-nowrap"
                      title={s ? f.jalali(s.lastObservationDate) : undefined}
                    >
                      {s ? f.date(s.lastObservationDate, true) : '—'}
                    </td>
                    <td className="num p-1.5 whitespace-nowrap">
                      {s
                        ? f.num(s.latest, { dp: Math.abs(s.latest) >= 1000 ? 0 : 2, group: true })
                        : '—'}
                    </td>
                    <td className="p-1.5 whitespace-nowrap">
                      {!s ? (
                        t.unavailable
                      ) : isStale(s, now) ? (
                        <span className="inline-flex items-center gap-1 text-warn">
                          <WarnIcon size={12} />
                          {t.stale}
                        </span>
                      ) : (
                        <span className="text-muted">{t.ok}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section>
          <h3 className="mb-1.5 font-bold">{t.sourcesDerived}</h3>
          <ul className="list-disc space-y-1 ps-5 text-muted">
            {Object.values(t.sourcesDerivedItems).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        <div className="space-y-1 border-t border-line pt-3 text-xs text-muted">
          <p>{t.sourcesGenerated(f.date(data.generatedAt.slice(0, 10)))}</p>
          <p>
            {t.fomcSource(data.fomc.source)} ·{' '}
            <a
              href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              federalreserve.gov
            </a>
          </p>
          <p className="font-semibold text-fg">{t.sourceAttribution}</p>
        </div>
      </div>
    </Dialog>
  );
}
