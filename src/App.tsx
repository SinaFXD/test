import { useEffect } from 'react';
import { useT } from './i18n';
import { applyDocumentPrefs, usePrefs } from './state/prefs';

export default function App() {
  const t = useT();
  const lang = usePrefs((s) => s.lang);
  const theme = usePrefs((s) => s.theme);
  const setPrefs = usePrefs((s) => s.set);

  useEffect(() => applyDocumentPrefs({ lang, theme }), [lang, theme]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1920px] flex-col px-4 py-4 sm:px-6">
      <header className="glass flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold">{t.appName}</h1>
          <p className="text-sm text-muted">{t.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn"
            aria-label={t.langToggleLabel}
            onClick={() => setPrefs({ lang: lang === 'fa' ? 'en' : 'fa' })}
          >
            {t.langToggle}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setPrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}
          >
            {theme === 'dark' ? t.themeToLight : t.themeToDark}
          </button>
        </div>
      </header>
      <main className="flex-1" />
      <footer className="mt-6 text-center text-xs text-muted">
        <p>{t.disclaimer}</p>
        <p className="mt-1">{t.sourceAttribution}</p>
      </footer>
    </div>
  );
}
