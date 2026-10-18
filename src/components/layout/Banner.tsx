import { useT } from '../../i18n';
import { useData } from '../../state/data';
import { useView } from '../../state/view';
import { CloseIcon, WarnIcon } from '../icons';

export function Banner() {
  const t = useT();
  const source = useData((s) => s.source);
  const dismissed = useView((s) => s.bannerDismissed);
  const set = useView((s) => s.set);
  if (source !== 'fallback' || dismissed) return null;
  return (
    <div role="status" className="glass flex items-start gap-3 border-warn/50 px-4 py-3 text-sm">
      <WarnIcon className="mt-0.5 shrink-0 text-warn" />
      <p className="flex-1">{t.fallbackBanner}</p>
      <button
        type="button"
        className="text-muted hover:text-fg"
        onClick={() => set({ bannerDismissed: true })}
        aria-label={t.dismiss}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
