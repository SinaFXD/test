/**
 * Shared ECharts option builders. Charts use Latin digits; tooltips add the
 * Jalali date in Persian. Text always uses text tokens (never series colors).
 */
import { dtf, fmtDate, fmtJalali, fmtNum } from '../i18n/format';
import type { Lang } from '../state/prefs';
import type { QuarterMeta } from '../state/sim';
import type { ChartTheme } from './theme';

export const GRID = { top: 26, bottom: 26 };
const DAY = 86_400_000;

export const ts = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

export interface TooltipRow {
  name: string;
  color: string;
  dash?: 'solid' | 'dashed' | 'dotted' | 'dot';
}

export interface Ctx {
  theme: ChartTheme;
  lang: Lang;
  reduced: boolean;
  quarters: QuarterMeta[];
  nowLabel: string;
  /** Reserve right padding for direct end-labels. */
  endLabels?: boolean;
}

function monthFmt(lang: Lang) {
  return dtf(lang === 'fa' ? 'fa-IR-u-ca-gregory-nu-latn' : 'en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
}

export function baseOption(
  ctx: Ctx,
  x: { min: number; max: number },
  y: {
    fmt: (v: number) => string;
    min?: number | ((v: { min: number }) => number);
    max?: number | ((v: { max: number }) => number);
  },
) {
  const { theme, reduced } = ctx;
  const mf = monthFmt(ctx.lang);
  return {
    animation: !reduced,
    animationDuration: 400,
    animationDurationUpdate: 300,
    animationEasingUpdate: 'cubicOut' as const,
    textStyle: { fontFamily: theme.font, color: theme.muted },
    grid: {
      left: 6,
      right: ctx.endLabels ? 46 : 14,
      top: GRID.top,
      bottom: GRID.bottom,
      containLabel: true,
    },
    xAxis: {
      type: 'time' as const,
      min: x.min,
      max: x.max,
      axisLine: { lineStyle: { color: theme.grid } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: theme.muted,
        fontSize: 11,
        hideOverlap: true,
        formatter: (v: number) => {
          const d = new Date(v);
          return d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : mf.format(d);
        },
      },
      axisPointer: {
        snap: false,
        label: { show: false },
        lineStyle: { color: theme.faint, width: 1 },
      },
    },
    yAxis: {
      type: 'value' as const,
      scale: true,
      min: y.min,
      max: y.max,
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.grid, width: 1 } },
      axisLabel: { color: theme.muted, fontSize: 11, formatter: y.fmt },
    },
  };
}

/** Header for a hovered time: quarter label for model points, else a date; Jalali added in Persian. */
export function hoverHeader(ctx: Ctx, time: number): string {
  const q = ctx.quarters.find((m) => Math.abs(ts(m.date) - time) < 2 * DAY);
  const iso = new Date(time).toISOString().slice(0, 10);
  const main = q
    ? q.t === 0
      ? `${ctx.nowLabel} · ${fmtDate(iso, ctx.lang, false, true)}`
      : q.label
    : fmtDate(iso, ctx.lang, false, true);
  const jal = ctx.lang === 'fa' ? fmtJalali(iso) : '';
  return `<div style="font-weight:600;margin-bottom:2px">${main}</div>${jal ? `<div style="opacity:.75;font-size:11px;margin-bottom:4px">${jal}</div>` : ''}`;
}

function swatch(color: string, dash: TooltipRow['dash'] = 'solid'): string {
  if (dash === 'dot')
    return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-inline-end:6px"></span>`;
  const border = dash === 'solid' ? 'solid' : dash;
  return `<span style="display:inline-block;width:14px;border-top:2px ${border} ${color};margin-inline-end:6px;vertical-align:middle"></span>`;
}

/**
 * Axis tooltip: one row per named series (series whose name starts with "_"
 * are skipped), value formatted by `fmt`, nearest point per series.
 */
export function tooltip(ctx: Ctx, rows: Record<string, TooltipRow>, fmt: (v: number) => string) {
  const { theme } = ctx;
  return {
    trigger: 'axis' as const,
    confine: true,
    backgroundColor: theme.panel,
    borderColor: theme.grid,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: theme.text, fontSize: 12, fontFamily: theme.font },
    extraCssText: `direction:${ctx.lang === 'fa' ? 'rtl' : 'ltr'};box-shadow:0 8px 24px rgba(0,0,0,.35);border-radius:10px;`,
    axisPointer: { type: 'line' as const, lineStyle: { color: theme.faint, width: 1 } },
    formatter: (params: unknown) => {
      const list = (Array.isArray(params) ? params : [params]) as Array<{
        seriesId?: string;
        value: [number, number] | number[];
        axisValue?: number;
      }>;
      if (!list.length) return '';
      const time = Number(list[0]!.axisValue ?? list[0]!.value[0]);
      let html = hoverHeader(ctx, time);
      const seen = new Set<string>();
      for (const p of list) {
        const id = p.seriesId ?? '';
        const row = rows[id];
        if (!row || seen.has(id)) continue;
        seen.add(id);
        const v = Number(p.value[1]);
        if (!Number.isFinite(v)) continue;
        html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;line-height:1.6"><span>${swatch(row.color, row.dash)}${row.name}</span><b style="direction:ltr;unicode-bidi:isolate">${fmt(v)}</b></div>`;
      }
      return html;
    },
  };
}

/**
 * Labels drawn inside the canvas must be single-direction: canvas text ignores
 * bidi isolates, so Persian labels never mix in digits (see legend.targetChart).
 */
export interface RefLine {
  y: number;
  label: string;
}

/** Vertical/horizontal reference marks on an invisible carrier series. */
/** Persian text drawn on the (LTR) canvas needs an RTL isolate to keep its word order. */
export const canvasText = (ctx: Ctx, s: string) =>
  ctx.lang === 'fa' && s ? `\u2067${s}\u2069` : s;

export function markers(
  ctx: Ctx,
  o: {
    today?: number;
    todayLabel?: string;
    scrub?: number;
    scrubLabel?: string;
    refs?: RefLine[];
    events?: number[];
  },
) {
  const { theme } = ctx;
  const data: unknown[] = [];
  for (const e of o.events ?? []) {
    data.push({
      xAxis: e,
      lineStyle: { color: theme.grid, width: 1, type: 'solid' },
      label: { show: false },
    });
  }
  for (const r of o.refs ?? []) {
    data.push({
      yAxis: r.y,
      lineStyle: { color: theme.ref, width: 1, type: [4, 4] },
      label: {
        show: true,
        formatter: r.label,
        position: 'insideEndTop',
        color: theme.muted,
        fontSize: 10,
        fontFamily: theme.font,
      },
    });
  }
  if (o.today !== undefined) {
    data.push({
      xAxis: o.today,
      lineStyle: { color: theme.faint, width: 1, type: 'solid' },
      label: {
        show: true,
        formatter: o.todayLabel ?? '',
        position: 'insideStartTop',
        color: theme.muted,
        fontSize: 10,
        fontFamily: theme.font,
      },
    });
  }
  if (o.scrub !== undefined) {
    data.push({
      xAxis: o.scrub,
      lineStyle: { color: theme.scenario, width: 1.5, type: 'solid', opacity: 0.85 },
      label: {
        show: !!o.scrubLabel,
        formatter: o.scrubLabel ?? '',
        position: 'end',
        color: theme.text,
        fontSize: 10,
        fontFamily: theme.font,
      },
    });
  }
  return {
    id: '_markers',
    type: 'line' as const,
    data: [],
    silent: true,
    markLine: { silent: true, symbol: 'none', animation: false, data },
  };
}

/** Stacked band (lower invisible + width area) for the uncertainty fan. */
export function fanSeries(
  ctx: Ctx,
  dates: number[],
  lower: number[],
  upper: number[],
  color: string,
) {
  return [
    {
      id: '_fanLo',
      type: 'line' as const,
      stack: 'fan',
      data: dates.map((d, i) => [d, lower[i]]),
      lineStyle: { opacity: 0 },
      symbol: 'none',
      silent: true,
      animation: !ctx.reduced,
    },
    {
      id: '_fanBand',
      type: 'line' as const,
      stack: 'fan',
      data: dates.map((d, i) => [d, upper[i]! - lower[i]!]),
      lineStyle: { opacity: 0 },
      areaStyle: { color, opacity: 0.13 },
      symbol: 'none',
      silent: true,
      animation: !ctx.reduced,
    },
  ];
}

export const fmtAxis =
  (dp: number, suffix = '', signed = false) =>
  (v: number) =>
    `${fmtNum(v, { dp, signed })}${suffix}`;

export function lineSeries(
  id: string,
  data: Array<[number, number]>,
  color: string,
  o: {
    dash?: 'solid' | 'dashed' | 'dotted';
    width?: number;
    step?: 'start' | 'end';
    endLabel?: string;
    textColor?: string;
    z?: number;
    opacity?: number;
    reduced?: boolean;
  } = {},
) {
  return {
    id,
    type: 'line' as const,
    data,
    step: o.step,
    showSymbol: false,
    symbolSize: 8,
    z: o.z ?? 3,
    lineStyle: {
      color,
      width: o.width ?? 2,
      type: o.dash === 'dashed' ? [6, 4] : o.dash === 'dotted' ? [2, 3] : 'solid',
      opacity: o.opacity ?? 1,
      cap: 'round' as const,
      join: 'round' as const,
    },
    itemStyle: { color },
    emphasis: { disabled: true },
    endLabel: o.endLabel
      ? {
          show: true,
          formatter: o.endLabel,
          color: o.textColor,
          fontSize: 11,
          fontWeight: 600,
          distance: 6,
        }
      : undefined,
    animation: !o.reduced,
  };
}
