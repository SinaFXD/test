import { expect, test, type Page } from '@playwright/test';

async function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Wait for deferred sections, then scroll through so lazily-initialized charts render. */
async function revealAll(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 10_000 });
  for (
    let y = 0;
    y < (await page.evaluate(() => document.documentElement.scrollHeight));
    y += 450
  ) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  // every chart (main + 9 small multiples) has drawn its canvas
  await expect(page.locator('[role=img][dir=ltr] canvas')).toHaveCount(10, { timeout: 10_000 });
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
  await page.getByRole('button', { name: /فدرال عقاب/ }).click();
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

test('play, CSV and PNG export work (desktop)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop sidebar controls');
  const errors = await collectErrors(page);
  await page.goto('./?dp=100');
  await expect(page.getByText('دامنهٔ نرخ بهرهٔ فدرال')).toBeVisible();

  // Play animates quarter by quarter and lights up the transmission stages
  await page.getByRole('button', { name: 'پخش' }).click();
  await expect(page.getByRole('button', { name: 'توقف' })).toBeVisible();
  await expect(page.locator('[aria-current="step"]').first()).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'توقف' }).click();

  const csvDl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'خروجی CSV' }).click();
  const csv = await csvDl;
  expect(csv.suggestedFilename()).toMatch(/^fed-policy-lab-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = await (
    await csv.createReadStream()
  )
    .toArray()
    .then((c) => Buffer.concat(c).toString('utf8'));
  expect(text).toContain('policy_rate_pct_baseline');
  expect(text).not.toMatch(/NaN/);

  const pngDl = page.waitForEvent('download', { timeout: 15000 });
  await page.getByRole('button', { name: 'خروجی تصویر' }).click();
  const png = await pngDl;
  expect(png.suggestedFilename()).toMatch(/\.png$/);
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
