import { useEffect, useId, useState } from 'react';
import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import { useScenario } from '../../state/scenario';
import { useSim } from '../../state/sim';

export function MarketOverride() {
  const t = useT();
  const f = useFmt();
  const id = useId();
  const saved = useScenario((s) => s.marketOverride);
  const set = useScenario((s) => s.set);
  const override = useSim((s) => s.override);
  const source = useSim((s) => s.marketSource);
  const [draft, setDraft] = useState(saved);
  useEffect(() => setDraft(saved), [saved]);

  const errors: string[] = [];
  if (saved.trim() && override && !override.ok) {
    for (const l of override.badLines) errors.push(t.overrideError(f.digits(String(l))));
    if (override.rangeError) errors.push(t.overrideRangeError);
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {t.marketOverride}
      </label>
      <p id={`${id}-help`} className="mt-0.5 text-xs leading-relaxed text-muted">
        {t.marketOverrideHelp}
      </p>
      <textarea
        id={id}
        dir="ltr"
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        placeholder={t.marketOverridePlaceholder}
        aria-describedby={`${id}-help`}
        aria-invalid={errors.length > 0}
        className="num mt-1.5 w-full rounded-lg border border-line bg-bg-2/70 p-2 font-mono text-xs text-fg placeholder:text-faint"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          className="btn"
          onClick={() => set({ marketOverride: draft })}
          disabled={draft === saved}
        >
          {t.apply}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setDraft('');
            set({ marketOverride: '' });
          }}
          disabled={!saved && !draft}
        >
          {t.clear}
        </button>
        {source === 'override' && (
          <span className="chip border-market text-market">{t.overrideActive}</span>
        )}
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="mt-1.5 space-y-0.5 text-xs text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
