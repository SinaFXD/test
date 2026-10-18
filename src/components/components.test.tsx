// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fallback from '../data/fallback.json';
import { LatestDataSchema } from '../data/schema';
import { useData } from '../state/data';
import { usePrefs } from '../state/prefs';
import { useView } from '../state/view';
import { KpiStrip } from './results/KpiStrip';
import LearnDrawer from './learn/LearnDrawer';
import SourcesModal from './learn/SourcesModal';

const DATA = LatestDataSchema.parse(fallback);

beforeEach(() => {
  usePrefs.setState({ lang: 'fa', expert: false, persianDigits: false });
  useData.setState({ status: 'ready', data: DATA, source: 'live', error: null });
});

describe('graceful degradation', () => {
  it('hides a KPI whose series is missing, without NaN/undefined', () => {
    const { corePce: _drop, ...rest } = DATA.series;
    useData.setState({ data: { ...DATA, series: rest } });
    render(<KpiStrip />);
    const card = screen.getByText('تورم هسته (PCE)').closest('li')!;
    expect(within(card).getByText('داده در دسترس نیست')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });

  it('shows Persian digits in text when enabled', () => {
    usePrefs.setState({ persianDigits: true });
    render(<KpiStrip />);
    expect(screen.getAllByText(/۳٫۸۸%/).length).toBeGreaterThan(0);
  });
});

describe('Learn drawer', () => {
  it('shows the glossary and lazy-loads equations in expert mode', async () => {
    useView.setState({ learnOpen: true });
    render(<LearnDrawer />);
    const dialog = screen.getByRole('dialog', { name: 'یادگیری' });
    expect(within(dialog).getByText('واحد پایه (bp)')).toBeInTheDocument();
    expect(within(dialog).queryByText('معادلات مدل')).toBeNull();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'حرفه‌ای' }));
    expect(
      await within(dialog).findByText('معادلات مدل', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(dialog.querySelectorAll('.katex').length).toBeGreaterThan(5);
  });
});

describe('Sources modal', () => {
  it('lists every series with a FRED link and the attribution', () => {
    useView.setState({ sourcesOpen: true });
    render(<SourcesModal />);
    const link = screen.getByRole('link', { name: 'PCEPILFE' });
    expect(link).toHaveAttribute('href', 'https://fred.stlouisfed.org/series/PCEPILFE');
    expect(screen.getAllByRole('row').length).toBeGreaterThan(38);
    expect(screen.getByText('منبع داده: FRED، بانک فدرال رزرو سنت‌لوئیس')).toBeInTheDocument();
  });
});
