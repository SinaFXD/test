import { useT } from '../../i18n';
import { usePrefs } from '../../state/prefs';

const REPO_URL = import.meta.env.VITE_REPO_URL as string | undefined;

export function Footer() {
  const t = useT();
  const lang = usePrefs((s) => s.lang);
  const pd = usePrefs((s) => s.persianDigits);
  const set = usePrefs((s) => s.set);
  return (
    <footer className="mt-8 space-y-3 border-t border-line pt-6 pb-24 text-center text-xs text-muted lg:pb-8">
      <p className="mx-auto max-w-3xl text-sm leading-relaxed text-fg/90">{t.disclaimer}</p>
      <p>
        <a
          href="https://fred.stlouisfed.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-fg"
        >
          {t.sourceAttribution}
        </a>
        {' · '}
        {t.footerModel}
        {REPO_URL && (
          <>
            {' · '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-fg"
            >
              {t.footerCode}
            </a>
          </>
        )}
      </p>
      {lang === 'fa' && (
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={pd}
            onChange={(e) => set({ persianDigits: e.currentTarget.checked })}
            className="size-4 accent-[var(--c-scenario)]"
          />
          {t.settingsDigits}
        </label>
      )}
    </footer>
  );
}
