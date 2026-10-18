interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}

/** Radio-group styled as a segmented control (arrow keys work natively). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-lg border border-line bg-bg-2/60 p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const i = options.findIndex((x) => x.value === value);
              const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown';
              const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
              if (!fwd && !back) return;
              e.preventDefault();
              const rtl = document.documentElement.dir === 'rtl';
              const delta =
                (fwd ? 1 : -1) *
                (rtl && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') ? -1 : 1);
              const next = options[(i + delta + options.length) % options.length]!;
              onChange(next.value);
              const sib =
                e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=radio]');
              sib?.[options.indexOf(next)]?.focus();
            }}
            className={`flex-1 rounded-md font-medium transition-colors ${
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm'
            } ${active ? 'bg-scenario text-on-accent shadow-sm' : 'text-muted hover:text-fg'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
