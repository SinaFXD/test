import { useT } from '../../i18n';
import { PRESETS } from '../../model/presets';
import { useScenario } from '../../state/scenario';

export function Presets() {
  const t = useT();
  const active = useScenario((s) => s.activePreset);
  const apply = useScenario((s) => s.applyPreset);
  return (
    <section aria-labelledby="presets-title">
      <h3
        id="presets-title"
        className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase"
      >
        {t.presetsTitle}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const meta = t.presets[p.id];
          const on = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              title={meta.desc}
              aria-pressed={on}
              onClick={() => apply(p.id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                on
                  ? 'border-transparent bg-scenario text-on-accent'
                  : 'border-line bg-bg-2/50 text-fg hover:border-line-strong hover:bg-panel-hover'
              }`}
            >
              {meta.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
