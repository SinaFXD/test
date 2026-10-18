import { useEffect, useMemo, useState } from 'react';
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
} from '../../charts/options';
import { useChartTheme } from '../../charts/theme';
import { addDays } from '../../data/dates';
import { loadSnapshot } from '../../data/client';
import type { Snapshot } from '../../data/schema';
import { useIsDesktop, useReducedMotion } from '../../hooks/useMediaQuery';
import { useT } from '../../i18n';
import { fmtNum } from '../../i18n/format';
import { DEFAULT_PARAMS } from '../../model/params';
import { fanBands } from '../../model/uncertainty';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { useSim } from '../../state/sim';
import { useView } from '../../state/view';
import { Legend, type LegendItem } from './Legend';

type Pt = [number, number];

function stepPath(
  start: string,
  startRate: number,
  meetings: Array<{ date: string; rate: number }>,
  end: string,
  shift: number,
): Pt[] {
  const pts: Pt[] = [[ts(start), startRate + shift]];
  for (const m of meetings) pts.push([ts(m.date), m.rate + shift]);
  pts.push([ts(end), (meetings.at(-1)?.rate ?? startRate) + shift]);
  return pts;
}

function useSnapshot(enabled: boolean, asOf: string, days: number): Snapshot | null | 'none' {
  const [snap, setSnap] = useState<Snapshot | null | 'none'>(null);
  useEffect(() => {
    if (!enabled || !asOf) return;
    let alive = true;
    void loadSnapshot(asOf, days).then((s) => alive && setSnap(s ?? 'none'));
    return () => {
      alive = false;
    };
  }, [enabled, asOf, days]);
  return enabled ? snap : null;
}

export function PolicyChart() {
  const t = useT();
  const lang = usePrefs((s) => s.lang);
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();
  const data = useData((s) => s.data);
  const { result, quarters, asOf, init, marketSource, override } = useSim();
  const scrub = useView((s) => s.scrubQuarter);
  const playQ = useView((s) => s.playQuarter);
  const overlayWeek = useView((s) => s.overlayWeek);
  const overlayMonth = useView((s) => s.overlayMonth);
  const setView = useView((s) => s.set);
  const weekSnap = useSnapshot(overlayWeek, asOf, 7);
  const monthSnap = useSnapshot(overlayMonth, asOf, 30);

  const option = useMemo(() => {
    if (!result || !data || !init || !quarters.length) return null;
    const ctx: Ctx = { theme, lang, reduced, quarters, nowLabel: t.now, endLabels: desktop };
    const dates = quarters.map((q) => ts(q.date));
    const H = result.horizon;
    const reveal = playQ === null ? H : Math.min(playQ, H);
    const xMin = ts(addDays(asOf, -730));
    const xMax = dates[H]! + 40 * 86_400_000;

    // History: fed funds target midpoint
    const up = data.series.fedUpper?.history ?? [];
    const lo = new Map((data.series.fedLower?.history ?? []).map(([d, v]) => [d, v]));
    const hist: Pt[] = up
      .filter(([d]) => lo.has(d) && ts(d) >= xMin)
      .map(([d, v]) => [ts(d), (v + lo.get(d)!) / 2]);
    hist.push([dates[0]!, init.i0]);

    const scen = Array.from(result.scenario.i);
    const base = Array.from(result.baseline.i);
    const fan = fanBands(scen, 'policyRate', DEFAULT_PARAMS.elb);

    // Market path (approximate or pasted), shifted from EFFR to fed-funds-mid terms
    const mp = data.marketPath;
    const shift = mp ? init.i0 - mp.startRate : 0;
    let market: Pt[] = [];
    if (marketSource === 'override' && override?.ok) {
      market = stepPath(asOf, init.i0, override.meetings, addDays(asOf, 730), 0);
    } else if (mp) {
      market = stepPath(mp.asOf, mp.startRate, mp.meetings, mp.horizonEnd, shift);
    }
    const snapPath = (s: Snapshot | null | 'none'): Pt[] =>
      s && s !== 'none'
        ? stepPath(
            s.date,
            s.marketPath.startRate,
            s.marketPath.meetings,
            s.marketPath.horizonEnd,
            shift,
          )
        : [];

    const sepPts: Pt[] = (data.sep?.years ?? [])
      .filter((y) => y.fedFunds !== null)
      .map((y) => [ts(`${y.year}-12-31`), y.fedFunds!] as Pt)
      .filter(([x]) => x >= dates[0]! && x <= xMax);

    // Draw the ELB line only when a policy path gets close to it (the fan alone doesn't count).
    const pathMin = Math.min(...scen, ...base, ...market.map((p) => p[1]));
    const showElb = pathMin < 1.5;

    const meetings = (data.fomc.meetings ?? [])
      .map((m) => ts(m.date))
      .filter((x) => x > dates[0]! && x <= xMax);
    const rows = {
      hist: { name: t.legend.history, color: theme.history },
      base: { name: t.legend.baseline, color: theme.baseline, dash: 'dashed' as const },
      scen: { name: t.legend.scenario, color: theme.scenario },
      market: {
        name: marketSource === 'override' ? t.legend.marketOverride : t.legend.market,
        color: theme.market,
        dash: 'dotted' as const,
      },
      week: { name: t.legend.weekAgo, color: theme.market, dash: 'dotted' as const },
      month: { name: t.legend.monthAgo, color: theme.market, dash: 'dotted' as const },
      sep: { name: t.legend.sep, color: theme.sep, dash: 'dot' as const },
    };
    const fmt = (v: number) => `${fmtNum(v, { dp: 2 })}%`;

    return {
      ...baseOption(
        ctx,
        { min: xMin, max: xMax },
        { fmt: fmtAxis(1, '%'), min: showElb ? 0 : undefined },
      ),
      tooltip: tooltip(ctx, rows, fmt),
      series: [
        ...fanSeries(
          ctx,
          dates.slice(0, reveal + 1),
          fan.lower.slice(0, reveal + 1),
          fan.upper.slice(0, reveal + 1),
          theme.scenario,
        ),
        lineSeries('hist', hist, theme.history, { width: 1.5, step: 'end', reduced }),
        lineSeries('market', market, theme.market, { dash: 'dotted', step: 'end', reduced }),
        ...(overlayMonth
          ? [
              lineSeries('month', snapPath(monthSnap), theme.market, {
                dash: 'dotted',
                step: 'end',
                opacity: 0.4,
                width: 1.5,
                reduced,
              }),
            ]
          : []),
        ...(overlayWeek
          ? [
              lineSeries('week', snapPath(weekSnap), theme.market, {
                dash: 'dotted',
                step: 'end',
                opacity: 0.65,
                width: 1.5,
                reduced,
              }),
            ]
          : []),
        lineSeries(
          'base',
          dates.map((d, i) => [d, base[i]!] as Pt),
          theme.baseline,
          { dash: 'dashed', reduced },
        ),
        lineSeries(
          'scen',
          dates.slice(0, reveal + 1).map((d, i) => [d, scen[i]!] as Pt),
          theme.scenario,
          {
            width: 2.5,
            z: 5,
            reduced,
            textColor: theme.text,
            endLabel: desktop ? `${fmtNum(scen[reveal], { dp: 2 })}%` : undefined,
          },
        ),
        {
          id: 'sep',
          type: 'scatter' as const,
          data: sepPts,
          symbolSize: 10,
          z: 6,
          itemStyle: { color: theme.sep, borderColor: theme.panel, borderWidth: 2 },
          animation: !reduced,
        },
        markers(ctx, {
          events: meetings,
          today: dates[0],
          todayLabel: t.legend.today,
          scrub: dates[Math.min(scrub, H)],
          scrubLabel: scrub > 0 ? quarters[Math.min(scrub, H)]?.label : undefined,
          refs: showElb ? [{ y: DEFAULT_PARAMS.elb, label: t.legend.elb }] : [],
        }),
      ],
    };
  }, [
    result,
    data,
    init,
    quarters,
    asOf,
    theme,
    lang,
    reduced,
    desktop,
    t,
    playQ,
    scrub,
    marketSource,
    override,
    overlayWeek,
    overlayMonth,
    weekSnap,
    monthSnap,
  ]);

  if (!option) return <div className="skeleton h-80" />;

  const legend: LegendItem[] = [
    { label: t.legend.scenario, color: theme.scenario, swatch: 'solid' },
    { label: t.legend.baseline, color: theme.baseline, swatch: 'dashed' },
    {
      label: marketSource === 'override' ? t.legend.marketOverride : t.legend.market,
      color: theme.market,
      swatch: 'dotted',
    },
    { label: t.legend.sep, color: theme.sep, swatch: 'dot' },
    { label: t.legend.history, color: theme.history, swatch: 'thin' },
    { label: t.legend.fan, color: theme.scenario, swatch: 'band' },
  ];
  const noSnap = (s: Snapshot | null | 'none') => s === 'none';

  return (
    <section className="glass p-3 sm:p-4" aria-labelledby="policy-title">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="policy-title" className="text-base font-bold">
            {t.chartPolicyTitle}
          </h2>
          <p className="text-xs text-muted">{t.chartPolicyDesc}</p>
        </div>
        <fieldset className="flex items-center gap-3 text-xs">
          <legend className="sr-only">{t.legend.market}</legend>
          {(
            [
              ['overlayWeek', overlayWeek, t.overlayWeek, weekSnap],
              ['overlayMonth', overlayMonth, t.overlayMonth, monthSnap],
            ] as const
          ).map(([key, on, label, snap]) => (
            <label
              key={key}
              className="inline-flex cursor-pointer items-center gap-1.5"
              title={noSnap(snap) ? t.overlayUnavailable : t.legend.market}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setView({ [key]: e.currentTarget.checked })}
                className="size-4 accent-[var(--c-market)]"
              />
              <span className={noSnap(snap) ? 'text-faint line-through' : ''}>{label}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <EChart
        option={option}
        height={desktop ? 340 : 270}
        label={`${t.chartPolicyTitle}. ${t.chartPolicyDesc}`}
        gridTop={GRID.top}
        gridBottom={GRID.bottom}
      />
      <Legend items={legend} className="mt-2" />
      <p className="mt-1.5 text-xs text-faint">
        {t.approx}: {t.approxMarketNote} {t.legend.elb}: 0.125%.
      </p>
    </section>
  );
}
