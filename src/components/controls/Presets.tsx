import { lazy, Suspense, useId } from 'react';
import { useT } from '../../i18n';
import {
  GENERIC_PRESETS,
  HISTORY_PRESETS,
  isHistoryPreset,
  type PresetId,
} from '../../model/presets';
import { useScenario } from '../../state/scenario';

const PresetStory = lazy(() => import('./PresetStory'));

function Chip({ id, name, desc }: { id: PresetId; name: string; desc: string }) {
  const on = useScenario((s) => s.activePreset === id);
  const apply = useScenario((s) => s.applyPreset);
  return (
    <button
      type="button"
      title={desc}
      aria-pressed={on}
      onClick={() => apply(id)}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        on
          ? 'border-transparent bg-scenario text-on-accent'
          : 'border-line bg-bg-2/50 text-fg hover:border-line-strong hover:bg-panel-hover'
      }`}
    >
      {name}
    </button>
  );
}

export function Presets() {
  const t = useT();
  const uid = useId();
  const active = useScenario((s) => s.activePreset);
  return (
    <section aria-labelledby={`${uid}-title`} className="space-y-3">
      <div>
        <h3
          id={`${uid}-title`}
          className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase"
        >
          {t.presetsTitle}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {GENERIC_PRESETS.map(({ id }) => (
            <Chip key={id} id={id} name={t.presets[id].name} desc={t.presets[id].desc} />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby={`${uid}-history`}>
        <h4 id={`${uid}-history`} className="text-xs font-semibold text-muted">
          {t.presetsHistoryTitle}
        </h4>
        <p className="mb-2 text-xs text-muted">{t.presetsHistoryHint}</p>
        <div className="flex flex-wrap gap-1.5">
          {HISTORY_PRESETS.map(({ id }) => (
            <Chip
              key={id}
              id={id}
              name={t.presetsHistory[id].name}
              desc={t.presetsHistory[id].desc}
            />
          ))}
        </div>
      </div>

      {isHistoryPreset(active) && (
        <Suspense fallback={null}>
          <PresetStory id={active} />
        </Suspense>
      )}
    </section>
  );
}
