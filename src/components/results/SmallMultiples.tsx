import { useMemo, useState } from 'react';
import { EChart } from '../../charts/EChart';
import {
  baseOption,
  fanSeries,
  fmtAxis,
  GRID,
  lineSeries,
  markers,
  tooltip,
  ts,
  type Ctx,
  type RefLine,
} from '../../charts/options';
import { useChartTheme, type ChartTheme } from '../../charts/theme';
import { addDays } from '../../data/dates';
import type { LatestData } from '../../data/schema';
import { useIsDesktop, useReducedMotion } from '../../hooks/useMediaQuery';
import { useT, type Messages } from '../../i18n';
import { fmtNum } from '../../i18n/format';
import type { FanVariable } from '../../model/params';
import type { InitialConditions, PathKey, SimResult } from '../../model/types';
import { fanBands } from '../../model/uncertainty';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { useSim, type QuarterMeta } from '../../state/sim';
import { useView, type ChartId } from '../../state/view';
import { Segmented } from '../controls/Segmented';
import { Legend } from './Legend';

type Pt = [number, number];

interface Variant {
  key: string;
  label: string;
  path: PathKey;
  history?: string;
  fan?: FanVariable;
  ref?: (init: InitialConditions, t: Messages) => RefLine;
}

interface Spec {
  id: ChartId | 'dollar' | 'sp500' | 'housing' | 'investment';
  title: (t: Messages) => string;
  hint: (t: Messages) => string;
  kind: 'level' | 'dev';
  variants: (t: Messages) => Variant[];
  dp: number;
}

const SPECS: Spec[] = [
  {
    id: 'inflation',
    title: (t) => t.chart.inflation,
    hint: (t) => t.chartHints.inflation,
    kind: 'level',
    dp: 1,
    variants: (t) => [
      {
        key: 'core',
        label: t.chart.inflationCore,
        path: 'pi',
        history: 'corePce',
        fan: 'corePce',
        ref: (_i, m) => ({ y: 2, label: m.legend.target }),
      },
      {
        key: 'headline',
        label: t.chart.inflationHeadline,
        path: 'piH',
        history: 'pce',
        fan: 'corePce',
        ref: (_i, m) => ({ y: 2, label: m.legend.target }),
      },
    ],
  },
  {
    id: 'unemployment',
    title: (t) => t.chart.unemployment,
    hint: (t) => t.chartHints.unemployment,
    kind: 'level',
    dp: 1,
    variants: () => [
      {
        key: 'u',
        label: '',
        path: 'u',
        history: 'unrate',
        fan: 'unemployment',
        ref: (i, m) => ({ y: i.uStar, label: m.legend.uStar }),
      },
    ],
  },
  {
    id: 'gdpGrowth',
    title: (t) => t.chart.gdpGrowth,
    hint: (t) => t.chartHints.gdpGrowth,
    kind: 'level',
    dp: 1,
    variants: () => [
      {
        key: 'g',
        label: '',
        path: 'g',
        history: 'gdpGrowth',
        fan: 'gdpGrowth',
        ref: (i, m) => ({ y: i.gPot, label: m.legend.potential }),
      },
    ],
  },
  {
    id: 'outputGap',
    title: (t) => t.chart.outputGap,
    hint: (t) => t.chartHints.outputGap,
    kind: 'level',
    dp: 1,
    variants: () => [
      {
        key: 'y',
        label: '',
        path: 'y',
        history: '__gap',
        ref: (_i, m) => ({ y: 0, label: m.legend.atPotential }),
      },
    ],
  },
  {
    id: 'yields',
    title: (t) => t.chart.yields,
    hint: (t) => t.chartHints.yields,
    kind: 'level',
    dp: 2,
    variants: (t) => [
      { key: 'y2', label: t.chart.y2, path: 'y2', history: 'dgs2' },
      { key: 'y10', label: t.chart.y10, path: 'y10', history: 'dgs10' },
      { key: 'mort', label: t.chart.mortgage, path: 'mort', history: 'mortgage30' },
    ],
  },
  {
    id: 'dollar',
    title: (t) => t.chart.dollar,
    hint: (t) => t.chartHints.dollar,
    kind: 'dev',
    dp: 1,
    variants: () => [{ key: 'usd', label: '', path: 'usd' }],
  },
  {
    id: 'sp500',
    title: (t) => t.chart.sp500,
    hint: (t) => t.chartHints.sp500,
    kind: 'dev',
    dp: 1,
    variants: () => [{ key: 'eq', label: '', path: 'eq' }],
  },
  {
    id: 'housing',
    title: (t) => t.chart.housing,
    hint: (t) => t.chartHints.housing,
    kind: 'dev',
    dp: 1,
    variants: () => [{ key: 'house', label: '', path: 'house' }],
  },
  {
    id: 'investment',
    title: (t) => t.chart.investment,
    hint: (t) => t.chartHints.investment,
    kind: 'dev',
    dp: 1,
    variants: () => [{ key: 'inv', label: '', path: 'inv' }],
  },
];

function historyPoints(data: LatestData, key: string, from: number): Pt[] {
  if (key === '__gap') {
    const pot = new Map((data.series.gdpPot?.history ?? []).map(([d, v]) => [d, v]));
    return (data.series.gdp?.history ?? [])
      .filter(([d]) => pot.has(d) && ts(d) >= from)
      .map(([d, v]) => [ts(d), 100 * (v / pot.get(d)! - 1)]);
  }
  return (data.series[key]?.history ?? [])
    .filter(([d]) => ts(d) >= from)
    .map(([d, v]) => [ts(d), v]);
}

interface BuildArgs {
  spec: Spec;
  variant: Variant;
  diff: boolean;
  result: SimResult;
  init: InitialConditions;
  quarters: QuarterMeta[];
  asOf: string;
  data: LatestData;
  theme: ChartTheme;
  ctx: Ctx;
  t: Messages;
  scrub: number;
  reveal: number;
  desktop: boolean;
}

function buildOption(a: BuildArgs) {
  const {
    spec,
    variant,
    diff,
    result,
    init,
    quarters,
    asOf,
    data,
    theme,
    ctx,
    t,
    scrub,
    reveal,
    desktop,
  } = a;
  const H = result.horizon;
  const dates = quarters.map((q) => ts(q.date));
  const xMax = dates[H]! + 40 * 86_400_000;
  const scen = Array.from(result.scenario[variant.path]);
  const base = Array.from(result.baseline[variant.path]);
  const cut = (xs: number[]) => xs.slice(0, reveal + 1);
  const pts = (xs: number[]) => cut(xs).map((v, i) => [dates[i]!, v] as Pt);
  const fmtV = (v: number) =>
    `${fmtNum(v, { dp: spec.dp, signed: diff || spec.kind === 'dev' })}${diff ? ` ${t.ppShort}` : '%'}`;
  const scrubX = dates[Math.min(scrub, H)];

  if (spec.kind === 'dev' || diff) {
    const d = spec.kind === 'dev' ? scen : scen.map((v, i) => v - base[i]!);
    const rows = { dev: { name: t.legend.scenario, color: theme.scenario } };
    return {
      ...baseOption(
        ctx,
        { min: dates[0]!, max: xMax },
        { fmt: fmtAxis(spec.dp, diff ? '' : '%', true) },
      ),
      tooltip: tooltip(ctx, rows, fmtV),
      series: [
        lineSeries('dev', pts(d), theme.scenario, {
          width: 2.5,
          reduced: ctx.reduced,
          textColor: theme.text,
          endLabel: desktop ? fmtV(d[reveal]!) : undefined,
        }),
        markers(ctx, {
          scrub: scrubX,
          refs: [{ y: 0, label: spec.kind === 'dev' ? t.legend.baseline : t.legend.zero }],
        }),
      ],
    };
  }

  const from = ts(addDays(asOf, -730));
  const hist = variant.history ? historyPoints(data, variant.history, from) : [];
  if (hist.length) hist.push([dates[0]!, scen[0]!]);
  const fan = variant.fan ? fanBands(scen, variant.fan) : null;
  const ref = variant.ref?.(init, t);
  const rows = {
    hist: { name: t.legend.history, color: theme.history },
    base: { name: t.legend.baseline, color: theme.baseline, dash: 'dashed' as const },
    scen: { name: t.legend.scenario, color: theme.scenario },
  };
  return {
    ...baseOption(
      ctx,
      { min: hist.length ? from : dates[0]!, max: xMax },
      { fmt: fmtAxis(spec.dp === 2 ? 1 : spec.dp, '%') },
    ),
    tooltip: tooltip(ctx, rows, fmtV),
    series: [
      ...(fan ? fanSeries(ctx, cut(dates), cut(fan.lower), cut(fan.upper), theme.scenario) : []),
      lineSeries('hist', hist, theme.history, { width: 1.5, reduced: ctx.reduced }),
      lineSeries(
        'base',
        base.map((v, i) => [dates[i]!, v] as Pt),
        theme.baseline,
        { dash: 'dashed', reduced: ctx.reduced },
      ),
      lineSeries('scen', pts(scen), theme.scenario, {
        width: 2.5,
        z: 5,
        reduced: ctx.reduced,
        textColor: theme.text,
        endLabel: desktop ? fmtV(scen[reveal]!) : undefined,
      }),
      markers(ctx, { today: dates[0], scrub: scrubX, refs: ref ? [ref] : [] }),
    ],
  };
}

function SmallChart({ spec }: { spec: Spec }) {
  const t = useT();
  const lang = usePrefs((s) => s.lang);
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();
  const data = useData((s) => s.data);
  const { result, quarters, asOf, init } = useSim();
  const scrub = useView((s) => s.scrubQuarter);
  const playQ = useView((s) => s.playQuarter);
  const diffOnly = useView((s) => s.diffOnly);
  const toggleDiff = useView((s) => s.toggleDiff);
  const variants = spec.variants(t);
  const [vk, setVk] = useState(variants[0]!.key);
  const variant = variants.find((v) => v.key === vk) ?? variants[0]!;
  const diff = spec.kind === 'level' && !!diffOnly[spec.id as ChartId];

  const option = useMemo(() => {
    if (!result || !init || !data || !quarters.length) return null;
    const ctx: Ctx = { theme, lang, reduced, quarters, nowLabel: t.now };
    const reveal = playQ === null ? result.horizon : Math.min(playQ, result.horizon);
    return buildOption({
      spec,
      variant,
      diff,
      result,
      init,
      quarters,
      asOf,
      data,
      theme,
      ctx,
      t,
      scrub,
      reveal,
      desktop,
    });
  }, [
    spec,
    variant,
    diff,
    result,
    init,
    quarters,
    asOf,
    data,
    theme,
    lang,
    reduced,
    t,
    scrub,
    playQ,
    desktop,
  ]);

  const title = spec.title(t);
  const sub = spec.kind === 'dev' ? t.vsBaseline : diff ? t.vsBaselinePp : null;

  return (
    <article className="glass flex flex-col p-3" aria-labelledby={`sm-${spec.id}`}>
      <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`sm-${spec.id}`} className="text-sm font-semibold">
            {title}
            {variants.length > 1 && (
              <span className="font-normal text-muted"> · {variant.label}</span>
            )}
          </h3>
          {sub && <p className="text-[11px] text-muted">{sub}</p>}
        </div>
        <div className="flex items-center gap-2">
          {variants.length > 1 && (
            <Segmented
              size="sm"
              label={title}
              value={vk}
              onChange={setVk}
              options={variants.map((v) => ({ value: v.key, label: v.label }))}
            />
          )}
          {spec.kind === 'level' && (
            <label
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted"
              title={t.diffOnlyHint}
            >
              <input
                type="checkbox"
                checked={diff}
                onChange={() => toggleDiff(spec.id as ChartId)}
                className="size-3.5 accent-[var(--c-scenario)]"
              />
              {t.diffOnly}
            </label>
          )}
        </div>
      </header>
      {option ? (
        <EChart
          option={option}
          height={185}
          label={`${title}. ${spec.hint(t)}`}
          gridTop={GRID.top}
          gridBottom={GRID.bottom}
        />
      ) : (
        <div className="skeleton h-[185px]" />
      )}
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{spec.hint(t)}</p>
    </article>
  );
}

export function SmallMultiples() {
  const t = useT();
  const theme = useChartTheme();
  return (
    <section aria-label={t.chart.inflation} className="space-y-2">
      <Legend
        className="px-1"
        items={[
          { label: t.legend.scenario, color: theme.scenario, swatch: 'solid' },
          { label: t.legend.baseline, color: theme.baseline, swatch: 'dashed' },
          { label: t.legend.history, color: theme.history, swatch: 'thin' },
          { label: t.legend.fan, color: theme.scenario, swatch: 'band' },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {SPECS.map((s) => (
          <SmallChart key={s.id} spec={s} />
        ))}
      </div>
    </section>
  );
}
