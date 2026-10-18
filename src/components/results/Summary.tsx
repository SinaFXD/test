import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import { summaryData } from '../../insights/analysis';
import { isNeutral, toModelInputs } from '../../state/controls';
import { scenarioValues, useScenario } from '../../state/scenario';
import { useSim } from '../../state/sim';

export function Summary() {
  const t = useT();
  const f = useFmt();
  const { result, quarters } = useSim();
  const values = useScenario(useShallow(scenarioValues));
  const d = useMemo(() => (result ? summaryData(result) : null), [result]);
  if (!result || !d) return null;

  const ql = (q: number) => {
    const m = quarters[Math.min(q, quarters.length - 1)];
    return m ? f.digits(q === 0 ? t.now : t.quarterLong(String(m.q), String(m.year))) : '';
  };
  const qb = Math.min(8, result.horizon);
  const baseline = t.summaryBaseline(
    values.baselineMode === 'market' ? t.baselineMarket : t.baselineRule,
    f.rate(result.baseline.i[qb]),
    f.pct(result.baseline.pi[qb]),
    f.pct(result.baseline.u[qb]),
    ql(qb),
  );

  const lines: string[] = [];
  if (isNeutral(values)) {
    lines.push(t.summaryNone, baseline);
  } else {
    const m = toModelInputs(values);
    if (m.policyChange !== 0) {
      lines.push(
        t.summaryPolicy(
          `${f.num(Math.abs(m.policyChange) * 100, { dp: 0 })} ${t.bp}`,
          m.policyChange > 0 ? t.summaryHigher : t.summaryLower,
          t.quarterUnit(f.digits(String(m.holdQuarters))),
        ),
      );
    }
    if (m.inflationShock !== 0) {
      lines.push(
        t.summaryShock(
          f.pp(Math.abs(m.inflationShock), { signed: false }),
          m.inflationShock > 0 ? t.summaryUp : t.summaryDown,
        ),
      );
    }
    lines.push(t.summaryMarkets(f.bp(d.y2.value), f.bp(d.mort.value)));
    lines.push(t.summaryEconomy(f.pp(d.gap.value), ql(d.gap.q), f.pp(d.u.value), ql(d.u.q)));
    lines.push(t.summaryInflation(f.pp(d.pi.value), ql(d.pi.q)));
    lines.push(
      d.stance > 0.05
        ? t.summaryMeaningTight
        : d.stance < -0.05
          ? t.summaryMeaningEasy
          : t.summaryMeaningShock,
    );
    lines.push(baseline);
  }

  return (
    <section className="glass p-3 sm:p-4" aria-labelledby="summary-title" aria-live="polite">
      <h2 id="summary-title" className="mb-2 text-base font-bold">
        {t.summaryTitle}
      </h2>
      <div className="space-y-1.5 text-sm leading-relaxed">
        {lines.map((l, i) => (
          <p key={i} className={i === lines.length - 1 ? 'text-muted' : undefined}>
            {l}
          </p>
        ))}
      </div>
    </section>
  );
}
