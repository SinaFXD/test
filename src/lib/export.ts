/**
 * CSV and PNG export. CSV has English headers (for spreadsheets) and a UTF-8
 * BOM; PNG composes every chart in the 'fpl' ECharts group into one image with
 * a title band and the disclaimer.
 */
import type { SimResult } from '../model/types';
import type { QuarterMeta } from '../state/sim';

const VARS: Array<[keyof SimResult['baseline'], string]> = [
  ['i', 'policy_rate_pct'],
  ['r', 'real_policy_rate_pct'],
  ['pi', 'core_pce_pct'],
  ['piH', 'headline_pce_pct'],
  ['u', 'unemployment_pct'],
  ['y', 'output_gap_pct'],
  ['g', 'gdp_growth_ann_pct'],
  ['y2', 'treasury_2y_pct'],
  ['y10', 'treasury_10y_pct'],
  ['mort', 'mortgage_30y_pct'],
];
const SATELLITES: Array<[keyof SimResult['baseline'], string]> = [
  ['usd', 'dollar_pct_vs_baseline'],
  ['eq', 'sp500_pct_vs_baseline'],
  ['house', 'housing_starts_pct_vs_baseline'],
  ['inv', 'business_investment_pct_vs_baseline'],
];

export function buildCsv(
  result: SimResult,
  quarters: QuarterMeta[],
  meta: { dataAsOf: string; url: string },
): string {
  const header = ['t', 'quarter', 'date'];
  for (const [, name] of VARS) header.push(`${name}_baseline`, `${name}_scenario`, `${name}_diff`);
  for (const [, name] of SATELLITES) header.push(name);
  const rows = [header.join(',')];
  const n = (x: number) => (Number.isFinite(x) ? x.toFixed(4) : '');
  for (let t = 0; t <= result.horizon; t++) {
    const q = quarters[t];
    const row = [String(t), t === 0 ? 'now' : (q?.label ?? ''), q?.date ?? ''];
    for (const [k] of VARS) {
      const b = result.baseline[k][t]!;
      const s = result.scenario[k][t]!;
      row.push(n(b), n(s), n(s - b));
    }
    for (const [k] of SATELLITES) row.push(n(result.scenario[k][t]!));
    rows.push(row.join(','));
  }
  rows.push('');
  rows.push(
    `"Fed Policy Lab — simplified educational model inspired by FRB/US; not FRB/US, not a forecast, not investment advice."`,
  );
  rows.push(
    `"Data as of ${meta.dataAsOf}. Source: FRED, Federal Reserve Bank of St. Louis. Scenario: ${meta.url}"`,
  );
  return '﻿' + rows.join('\n');
}

export function downloadBlob(
  content: Blob | string,
  filename: string,
  type = 'text/csv;charset=utf-8',
): void {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Compose a chart image (data URL) with a title band and disclaimer footer. */
export async function composePng(
  chartsDataUrl: string,
  opts: {
    title: string;
    subtitle: string;
    footer: string;
    bg: string;
    fg: string;
    muted: string;
    rtl: boolean;
  },
): Promise<Blob | null> {
  const img = await loadImage(chartsDataUrl);
  const pad = 32;
  const head = 96;
  const foot = 64;
  const canvas = document.createElement('canvas');
  canvas.width = img.width + pad * 2;
  canvas.height = img.height + head + foot;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.direction = opts.rtl ? 'rtl' : 'ltr';
  ctx.textAlign = opts.rtl ? 'right' : 'left';
  const x = opts.rtl ? canvas.width - pad : pad;
  const font = `'Inter Variable', 'Vazirmatn Variable', sans-serif`;
  ctx.fillStyle = opts.fg;
  ctx.font = `700 34px ${font}`;
  ctx.fillText(opts.title, x, 50);
  ctx.fillStyle = opts.muted;
  ctx.font = `400 20px ${font}`;
  ctx.fillText(opts.subtitle, x, 82);
  ctx.drawImage(img, pad, head);
  ctx.font = `400 18px ${font}`;
  ctx.fillText(opts.footer, x, canvas.height - 26);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
