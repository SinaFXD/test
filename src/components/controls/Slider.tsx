import { useId } from 'react';
import { usePrefs } from '../../state/prefs';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Visible value text, e.g. "+50 bp". */
  display: string;
  /** Spoken value text in words, e.g. "+۵۰ واحد پایه". */
  ariaText: string;
  help?: string;
  /** Labels for the two ends (e.g. dove ↔ hawk). */
  ends?: [string, string];
  /** Fill from this value (default: min). Use 0 for symmetric sliders. */
  origin?: number;
  disabled?: boolean;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  ariaText,
  help,
  ends,
  origin,
  disabled,
}: Props) {
  const id = useId();
  const helpId = `${id}-help`;
  const rtl = usePrefs((s) => s.lang) === 'fa';
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const o = pct(origin ?? min);
  const p = pct(value);
  const style = {
    '--a': `${Math.min(o, p)}%`,
    '--b': `${Math.max(o, p)}%`,
    '--fill-dir': rtl ? 'left' : 'right',
  } as React.CSSProperties;

  return (
    <div className={disabled ? 'opacity-50' : undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <output
          htmlFor={id}
          className="num shrink-0 rounded-md bg-scenario-soft px-2 py-0.5 text-sm font-semibold text-accent-text"
        >
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="slider mt-1"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={style}
        aria-valuetext={ariaText}
        aria-describedby={help ? helpId : undefined}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
      {ends && (
        <div className="flex justify-between text-xs text-muted" aria-hidden="true">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
      {help && (
        <p id={helpId} className="mt-0.5 text-xs leading-relaxed text-muted">
          {help}
        </p>
      )}
    </div>
  );
}
