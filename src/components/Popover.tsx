import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface Props {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  /** Open on hover for fine pointers (still click/keyboard accessible). */
  hover?: boolean;
}

const GAP = 8; // px between trigger and panel
const MARGIN = 8; // px kept clear of the viewport edges

/**
 * Disclosure popover: click/Enter toggles, hover opens (desktop), Esc/outside click closes.
 * The panel is portaled to <body> with fixed positioning: every card is `.glass`
 * (backdrop-filter ⇒ its own stacking context), so an in-place panel would be painted
 * under the cards that follow it, whatever its z-index.
 */
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
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties>({ visibility: 'hidden' });
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
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

  // Align the panel's inline-end edge with the trigger's (like `end-0`), below it, inside the viewport.
  const place = useCallback(() => {
    const btn = root.current?.querySelector('button');
    const el = panel.current;
    if (!btn || !el) return;
    const r = btn.getBoundingClientRect();
    const w = el.offsetWidth;
    const vw = document.documentElement.clientWidth;
    const rtl = getComputedStyle(btn).direction === 'rtl';
    const left = Math.min(Math.max(rtl ? r.left : r.right - w, MARGIN), vw - w - MARGIN);
    setPos({ top: r.bottom + GAP, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos({ visibility: 'hidden' });
      return;
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  const enter = () => {
    if (!hover || !fine()) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), 120);
  };
  const leave = () => {
    if (!hover || !fine()) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(false), 200);
  };

  const fine = () => globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  return (
    <div ref={root} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="dialog"
            aria-label={label}
            dir={root.current ? getComputedStyle(root.current).direction : undefined}
            style={pos}
            onMouseEnter={enter}
            onMouseLeave={leave}
            className={`glass fixed z-50 w-[min(92vw,22rem)] bg-panel-solid p-3 shadow-2xl ${panelClassName}`}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}
