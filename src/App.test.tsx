// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { usePrefs } from './state/prefs';

beforeEach(() => usePrefs.setState({ lang: 'fa' }));

describe('App shell', () => {
  it('renders Persian by default and toggles to English', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'آزمایشگاه سیاست پولی فدرال',
    );
    expect(document.documentElement.dir).toBe('rtl');
    await userEvent.click(screen.getByRole('button', { name: 'تغییر زبان به انگلیسی' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fed Policy Lab');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('falls back to the bundled snapshot when latest.json cannot be fetched', async () => {
    render(<App />);
    expect(
      await screen.findByText(/آخرین نسخهٔ ذخیره‌شده/, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    // mobile layout in jsdom: controls live in the bottom sheet
    await userEvent.click(screen.getByRole('button', { name: /تنظیم سناریو/ }));
    expect(screen.getByRole('dialog', { name: 'سناریوی شما' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    const slider = screen.getByRole('slider', { name: 'تغییر نرخ نسبت به مسیر پایه' });
    expect(slider.getAttribute('aria-valuetext')).toContain('واحد پایه');
  });
});
