import { create } from 'zustand';
import { readJSON, writeJSON } from '../lib/storage';

export type Lang = 'fa' | 'en';
export type Theme = 'dark' | 'light';

export interface Prefs {
  lang: Lang;
  theme: Theme;
  /** Show Persian digits (۱۲۳) in running text. Charts always use Latin digits. */
  persianDigits: boolean;
  /** Beginner hides equations; Expert shows equations + parameter table. */
  expert: boolean;
}

export const PREFS_KEY = 'fpl:prefs';

const DEFAULT_PREFS: Prefs = { lang: 'fa', theme: 'dark', persianDigits: false, expert: false };

function initialPrefs(): Prefs {
  const saved = readJSON<Partial<Prefs>>(PREFS_KEY) ?? {};
  const prefs: Prefs = {
    lang: saved.lang === 'en' ? 'en' : 'fa',
    theme: saved.theme === 'light' ? 'light' : 'dark',
    persianDigits: saved.persianDigits === true,
    expert: saved.expert === true,
  };
  // URL overrides (used by share links and screenshot tests)
  if (typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search);
    const lang = q.get('lang');
    const theme = q.get('theme');
    if (lang === 'fa' || lang === 'en') prefs.lang = lang;
    if (theme === 'dark' || theme === 'light') prefs.theme = theme;
  }
  return prefs;
}

interface PrefsStore extends Prefs {
  set: (patch: Partial<Prefs>) => void;
}

export const usePrefs = create<PrefsStore>((set, get) => ({
  ...DEFAULT_PREFS,
  ...initialPrefs(),
  set: (patch) => {
    set(patch);
    const { lang, theme, persianDigits, expert } = get();
    writeJSON(PREFS_KEY, { lang, theme, persianDigits, expert });
  },
}));

/** Keep <html> attributes in sync with prefs. */
export function applyDocumentPrefs(p: Pick<Prefs, 'lang' | 'theme'>): void {
  const el = document.documentElement;
  el.setAttribute('data-theme', p.theme);
  el.setAttribute('lang', p.lang);
  el.setAttribute('dir', p.lang === 'fa' ? 'rtl' : 'ltr');
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', p.theme === 'dark' ? '#070d1c' : '#f3f5fa');
}
