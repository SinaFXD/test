import { useFmt } from '../../hooks/useFmt';
import { useNow } from '../../hooks/useNow';
import { useT, type Messages } from '../../i18n';
import { isStale } from '../../data/staleness';
import type { LatestData, SeriesData } from '../../data/schema';
import { useData } from '../../state/data';
import { fmtNum, fmtRate } from '../../i18n/format';
import { ArrowIcon, WarnIcon } from '../icons';
import { Sparkline } from './Sparkline';

type F = ReturnType<typeof useFmt>;

interface Kpi {
  id: keyof Messages['kpi'];
  /** Series providing date, staleness and change. */
  series: string;
  value: (d: LatestData, f: F) => string;
  change: (s: SeriesData, f: F) => string | null;
  spark: (d: LatestData) => number[];
  approx?: boolean;
}

const tail = (s: SeriesData | undefined, n: number) =>
  (s?.history ?? []).slice(-n).map(([, v]) => v);
const bpChange = (s: SeriesData, f: F) => (s.change === null ? null : f.bp(s.change));
const ppChange = (s: SeriesData, f: F) => (s.change === null ? null : f.pp(s.change));
const pctChange = (s: SeriesData, f: F) =>
  s.change === null || !s.previous ? null : f.pct((s.change / s.previous) * 100, { signed: true });

const KPIS: Kpi[] = [
  {
    id: 'fedRange',
    series: 'fedUpper',
    value: (d, f) =>
      f.ltr(
        `${fmtNum(d.series.fedLower?.latest, { dp: 2, persian: f.persian })}–${fmtRate(d.series.fedUpper?.latest, { persian: f.persian })}`,
      ),
    change: bpChange,
    spark: (d) => tail(d.series.fedUpper, 104),
  },
  {
    id: 'effr',
    series: 'effr',
    value: (d, f) => f.rate(d.series.effr?.latest),
    change: bpChange,
    spark: (d) => tail(d.series.effr, 104),
  },
  {
    id: 'corePce',
    series: 'corePce',
    value: (d, f) => f.pct(d.series.corePce?.latest),
    change: ppChange,
    spark: (d) => tail(d.series.corePce, 36),
  },
  {
    id: 'cpi',
    series: 'cpi',
    value: (d, f) => f.pct(d.series.cpi?.latest),
    change: ppChange,
    spark: (d) => tail(d.series.cpi, 36),
  },
  {
    id: 'unrate',
    series: 'unrate',
    value: (d, f) => f.pct(d.series.unrate?.latest),
    change: ppChange,
    spark: (d) => tail(d.series.unrate, 36),
  },
  {
    id: 'gdpGrowth',
    series: 'gdpGrowth',
    value: (d, f) => f.pct(d.series.gdpGrowth?.latest),
    change: ppChange,
    spark: (d) => tail(d.series.gdpGrowth, 16),
  },
  {
    id: 'outputGap',
    series: 'gdp',
    approx: true,
    value: (d, f) => f.pct(d.derived.outputGap?.value, { signed: true }),
    change: () => null,
    spark: (d) => {
      const pot = new Map((d.series.gdpPot?.history ?? []).map(([k, v]) => [k, v]));
      return (d.series.gdp?.history ?? [])
        .filter(([k]) => pot.has(k))
        .slice(-16)
        .map(([k, v]) => 100 * (v / pot.get(k)! - 1));
    },
  },
  {
    id: 'dgs2',
    series: 'dgs2',
    value: (d, f) => f.rate(d.series.dgs2?.latest),
    change: bpChange,
    spark: (d) => tail(d.series.dgs2, 104),
  },
  {
    id: 'dgs10',
    series: 'dgs10',
    value: (d, f) => f.rate(d.series.dgs10?.latest),
    change: bpChange,
    spark: (d) => tail(d.series.dgs10, 104),
  },
  {
    id: 'real10',
    series: 'real10',
    value: (d, f) => f.rate(d.series.real10?.latest),
    change: bpChange,
    spark: (d) => tail(d.series.real10, 104),
  },
  {
    id: 'mortgage30',
    series: 'mortgage30',
    value: (d, f) => f.rate(d.series.mortgage30?.latest),
    change: bpChange,
    spark: (d) => tail(d.series.mortgage30, 104),
  },
  {
    id: 'fwd5y5y',
    series: 'fwd5y5y',
    value: (d, f) => f.rate(d.series.fwd5y5y?.latest),
    change: bpChange,
    spark: (d) => tail(d.series.fwd5y5y, 104),
  },
  {
    id: 'dollar',
    series: 'dollar',
    value: (d, f) => f.num(d.series.dollar?.latest, { dp: 1 }),
    change: pctChange,
    spark: (d) => tail(d.series.dollar, 104),
  },
  {
    id: 'sp500',
    series: 'sp500',
    value: (d, f) => f.num(d.series.sp500?.latest, { dp: 0, group: true }),
    change: pctChange,
    spark: (d) => tail(d.series.sp500, 104),
  },
];

function KpiCard({ kpi, data }: { kpi: Kpi; data: LatestData }) {
  const t = useT();
  const f = useFmt();
  const now = useNow(60_000);
  const meta = t.kpi[kpi.id];
  const s = data.series[kpi.series];
  const missing = !s || (kpi.id === 'outputGap' && !data.derived.outputGap);
  const stale = s ? isStale(s, now) : false;
  const ch = s && !missing ? kpi.change(s, f) : null;
  const dir =
    !s || s.change === null || Math.abs(s.change) < 1e-9 ? 'flat' : s.change > 0 ? 'up' : 'down';
  const asOf = kpi.id === 'outputGap' ? data.derived.outputGap?.asOf : s?.lastObservationDate;

  return (
    <li
      className="glass flex w-[44vw] max-w-[13rem] shrink-0 snap-start flex-col gap-1 p-3 sm:w-auto sm:max-w-none sm:min-w-0"
      title={meta.hint}
    >
      <div className="flex items-start justify-between gap-1">
        <h3 className="text-[11px] leading-tight font-medium text-muted">{meta.label}</h3>
        {kpi.approx && (
          <span className="chip shrink-0 px-1.5 py-0 text-[10px] text-muted">{t.approx}</span>
        )}
      </div>
      {missing ? (
        <p className="py-2 text-xs text-faint">{t.unavailable}</p>
      ) : (
        <>
          <p className="text-lg leading-tight font-semibold sm:text-xl">{kpi.value(data, f)}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted" title={t.vsPrevious}>
            <ArrowIcon dir={dir} size={12} />
            <span>{ch ?? '—'}</span>
          </p>
          <Sparkline values={kpi.spark(data)} />
          <p className="flex flex-wrap items-center gap-1 text-[10px] text-faint">
            <span title={f.jalali(asOf)}>
              {t.asOf} {f.date(asOf, true)}
            </span>
            {stale && (
              <span className="inline-flex items-center gap-0.5 text-warn" title={t.staleHint}>
                <WarnIcon size={11} />
                {t.stale}
              </span>
            )}
          </p>
        </>
      )}
    </li>
  );
}

export function KpiStrip() {
  const t = useT();
  const data = useData((s) => s.data);
  if (!data) return null;
  return (
    <section aria-labelledby="kpi-title">
      <h2 id="kpi-title" className="sr-only">
        {t.kpiTitle}
      </h2>
      <ul
        className="-mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
        aria-label={t.kpiTitle}
      >
        {KPIS.map((k) => (
          <KpiCard key={k.id} kpi={k} data={data} />
        ))}
      </ul>
    </section>
  );
}
