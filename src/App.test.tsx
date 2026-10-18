// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

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
});
