import { useEffect, useRef, type ReactNode } from 'react';
import { useT } from '../i18n';
import { CloseIcon } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 'side' = full-height drawer on the inline-end edge; 'center' = modal. */
  variant?: 'side' | 'center';
  headerExtra?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea, select, summary, [tabindex]:not([tabindex="-1"])';

/** Accessible modal: focus moves in and is trapped, Esc closes, focus returns to the opener. */
export function Dialog({ open, onClose, title, children, variant = 'center', headerExtra }: Props) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const els = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const side = variant === 'side';
  return (
    <div className="fixed inset-0 z-[65]" role="presentation">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          side
            ? 'absolute inset-y-0 end-0 flex w-full max-w-2xl flex-col border-s border-line-strong bg-panel-solid shadow-2xl'
            : 'absolute inset-x-3 top-[5vh] mx-auto flex max-h-[90dvh] max-w-5xl flex-col rounded-2xl border border-line-strong bg-panel-solid shadow-2xl'
        }
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              type="button"
              className="btn size-9 px-0"
              onClick={onClose}
              aria-label={t.close}
            >
              <CloseIcon />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
