import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface Props {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  /** Open on hover for fine pointers (still click/keyboard accessible). */
  hover?: boolean;
}

/** Disclosure popover: click/Enter toggles, hover opens (desktop), Esc/outside click closes. */
export function Popover({
  label,
  trigger,
  children,
  triggerClassName = '',
  panelClassName = '',
  hover = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const fine = () => globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={() => {
        if (!hover || !fine()) return;
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setOpen(true), 120);
      }}
      onMouseLeave={() => {
        if (!hover || !fine()) return;
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setOpen(false), 200);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={label}
          className={`glass absolute end-0 top-full z-50 mt-2 w-[min(92vw,22rem)] bg-panel-solid p-3 shadow-2xl ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
