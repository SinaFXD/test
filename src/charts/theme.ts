import { useMemo } from 'react';
import { usePrefs } from '../state/prefs';

export interface ChartTheme {
  text: string;
  muted: string;
  faint: string;
  grid: string;
  panel: string;
  bg: string;
  scenario: string;
  scenarioSoft: string;
  baseline: string;
  market: string;
  sep: string;
  ref: string;
  history: string;
  font: string;
}

const FONT = "'Inter Variable', 'Vazirmatn Variable', system-ui, sans-serif";

function read(): ChartTheme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
  return {
    text: v('--c-text', '#e7edf9'),
    muted: v('--c-muted', '#a3b0c9'),
    faint: v('--c-faint', '#8392b0'),
    grid: v('--c-border', 'rgba(140,170,230,0.16)'),
    panel: v('--c-panel-solid', '#0f1a33'),
    bg: v('--c-bg', '#070d1c'),
    scenario: v('--c-scenario', '#d95926'),
    scenarioSoft: v('--c-scenario-soft', 'rgba(217,89,38,0.16)'),
    baseline: v('--c-baseline', '#9aa6bd'),
    market: v('--c-market', '#3987e5'),
    sep: v('--c-sep', '#199e70'),
    ref: v('--c-ref', '#8392b0'),
    history: v('--c-history', '#6f7d99'),
    font: FONT,
  };
}

/** Chart colors from the CSS tokens; recomputed when the theme changes. */
export function useChartTheme(): ChartTheme {
  const theme = usePrefs((s) => s.theme);
  return useMemo(read, [theme]);
}
