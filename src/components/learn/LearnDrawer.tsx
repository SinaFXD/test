import { lazy, Suspense } from 'react';
import { useT } from '../../i18n';
import { usePrefs } from '../../state/prefs';
import { useView } from '../../state/view';
import { Segmented } from '../controls/Segmented';
import { Dialog } from '../Dialog';

const ExpertPanel = lazy(() => import('./ExpertPanel'));

export default function LearnDrawer() {
  const t = useT();
  const open = useView((s) => s.learnOpen);
  const set = useView((s) => s.set);
  const expert = usePrefs((s) => s.expert);
  const setPrefs = usePrefs((s) => s.set);

  return (
    <Dialog
      open={open}
      onClose={() => set({ learnOpen: false })}
      title={t.learnTitle}
      variant="side"
      headerExtra={
        <div className="w-44">
          <Segmented
            size="sm"
            label={t.learnTitle}
            value={expert ? 'expert' : 'beginner'}
            onChange={(v) => setPrefs({ expert: v === 'expert' })}
            options={[
              { value: 'beginner', label: t.learnBeginner },
              { value: 'expert', label: t.learnExpert },
            ]}
          />
        </div>
      }
    >
      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-base">{t.learnIntro}</p>

        <section>
          <h3 className="mb-2 font-bold">{t.learnHowTitle}</h3>
          <ol className="list-decimal space-y-1 ps-5">
            {t.learnHow.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="mb-2 font-bold">{t.glossaryTitle}</h3>
          <dl className="grid gap-2 sm:grid-cols-2">
            {t.glossary.map((g) => (
              <div key={g.term} className="rounded-xl border border-line bg-bg-2/40 p-3">
                <dt className="font-semibold">{g.term}</dt>
                <dd className="mt-1 text-muted">{g.def}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-warn/40 p-3">
          <h3 className="mb-1 font-bold">{t.learnLimitsTitle}</h3>
          <p className="text-muted">{t.learnLimits}</p>
          <p className="mt-2 text-muted">{t.disclaimer}</p>
        </section>

        {expert && (
          <Suspense fallback={<div className="skeleton h-64" />}>
            <ExpertPanel />
          </Suspense>
        )}
      </div>
    </Dialog>
  );
}
