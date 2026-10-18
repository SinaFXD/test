import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { togglePlay } from '../../hooks/usePlay';
import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import { toModelInputs } from '../../state/controls';
import { scenarioValues, useScenario } from '../../state/scenario';
import { useView } from '../../state/view';
import { ControlsPanel } from '../controls/ControlsPanel';
import { CloseIcon, PauseIcon, PlayIcon, SlidersIcon } from '../icons';

/** Mobile: fixed bar + modal bottom sheet holding the controls. */
export function MobileControls() {
  const t = useT();
  const f = useFmt();
  const open = useView((s) => s.sheetOpen);
  const playing = useView((s) => s.playing);
  const set = useView((s) => s.set);
  const values = useScenario(useShallow(scenarioValues));
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('button, input, [tabindex]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') set({ sheetOpen: false });
      if (e.key === 'Tab' && panel.current) {
        const els = panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea, summary, [tabindex]:not([tabindex="-1"])',
        );
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const openerEl = opener.current;
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      openerEl?.focus();
    };
  }, [open, set]);

  const m = toModelInputs(values);
  const parts: string[] = [];
  if (m.policyChange)
    parts.push(`${f.num(m.policyChange * 100, { dp: 0, signed: true })} ${t.bpShort}`);
  if (m.inflationShock) parts.push(`π ${f.num(m.inflationShock, { dp: 2, signed: true })}`);
  if (m.demandShock) parts.push(`D ${f.num(m.demandShock, { dp: 2, signed: true })}`);
  if (m.oilShock) parts.push(`🛢 ${f.num(m.oilShock, { dp: 0, signed: true })}%`);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel-solid/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <button
            ref={opener}
            type="button"
            className="btn btn-accent flex-1 py-2.5"
            onClick={() => set({ sheetOpen: true })}
            aria-haspopup="dialog"
          >
            <SlidersIcon size={18} />
            <span>{t.openControls}</span>
            {parts.length > 0 && (
              <span className="num ltr truncate text-xs opacity-90">· {parts.join(' · ')}</span>
            )}
          </button>
          <button
            type="button"
            className="btn size-11 px-0"
            onClick={togglePlay}
            aria-label={playing ? t.pause : t.play}
            aria-pressed={playing}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => set({ sheetOpen: false })}
            aria-hidden="true"
          />
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={t.controlsTitle}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-line-strong bg-panel-solid px-4 pt-2 pb-8 shadow-2xl"
          >
            <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center justify-between bg-panel-solid px-4 pt-1 pb-2">
              <span className="mx-auto h-1.5 w-12 rounded-full bg-line-strong" aria-hidden="true" />
              <button
                type="button"
                className="absolute end-3 top-1 text-muted hover:text-fg"
                onClick={() => set({ sheetOpen: false })}
                aria-label={t.closeControls}
              >
                <CloseIcon size={22} />
              </button>
            </div>
            <ControlsPanel idPrefix="sheet" />
          </div>
        </div>
      )}
    </>
  );
}
