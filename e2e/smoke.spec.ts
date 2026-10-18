import { expect, test, type Page } from '@playwright/test';

async function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Scroll through the page so lazily-initialized charts render. */
async function revealAll(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 450) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
}

test('loads real data, renders charts and reacts to a preset', async ({ page }, info) => {
  const errors = await collectErrors(page);
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('آزمایشگاه سیاست پولی فدرال');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('دامنهٔ نرخ بهرهٔ فدرال')).toBeVisible();
  // fallback banner must NOT show when latest.json loads
  await expect(page.getByText(/آخرین نسخهٔ ذخیره‌شده/)).toHaveCount(0);

  const policy = page.getByRole('img', { name: /نرخ بهرهٔ فدرال: مسیر پایه/ });
  await expect(policy.locator('canvas').first()).toBeVisible();

  // Apply a preset (desktop: sidebar; mobile: bottom sheet)
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: /تنظیم سناریو/ }).click();
  await page.getByRole('button', { name: 'فدرال عقاب +100' }).click();
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'بستن تنظیمات' }).click();
  // numbers carry invisible bidi isolates (U+2066/U+2069) in RTL text
  await expect(page.getByText(/فدرال نرخ را\s*\u2066?100\u2069?\s*واحد پایه بالاتر/)).toBeVisible();
  await expect(page).toHaveURL(/dp=100/);

  // Keyboard on a slider updates its spoken value
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: /تنظیم سناریو/ }).click();
  const slider = page.getByRole('slider', { name: 'تغییر نرخ نسبت به مسیر پایه' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).not.toHaveAttribute('aria-valuetext', /۱۰۰ /);

  await revealAll(page);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/\bNaN\b|undefined/);
  const [sw, iw] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(sw).toBeLessThanOrEqual(iw);
  expect(errors).toEqual([]);
});

const combos = [
  { lang: 'fa', theme: 'dark' },
  { lang: 'fa', theme: 'light' },
  { lang: 'en', theme: 'dark' },
  { lang: 'en', theme: 'light' },
] as const;

for (const { lang, theme } of combos) {
  test(`screenshot ${lang} ${theme}`, async ({ page }, info) => {
    const errors = await collectErrors(page);
    // A scenario makes the screenshots informative: hawkish +100bp.
    await page.goto(`./?lang=${lang}&theme=${theme}&dp=100&phi=1`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await revealAll(page);
    const name = `${info.project.name}-${lang}-${theme}`;
    await page.screenshot({ path: `e2e/screenshots/${name}-full.png`, fullPage: true });
    // README images are refreshed only on request: UPDATE_DOCS_SCREENSHOTS=1 npm run e2e
    if (process.env.UPDATE_DOCS_SCREENSHOTS)
      await page.screenshot({ path: `docs/screenshots/${name}.png` });
    const [sw, iw] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ]);
    expect(sw).toBeLessThanOrEqual(iw);
    expect(errors).toEqual([]);
  });
}
