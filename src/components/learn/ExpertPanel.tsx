import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import { calibrationChecks } from '../../model/calibration';
import { PARAM_META } from '../../model/params';

const EQUATIONS: Array<[string, string]> = [
  ['expectations', String.raw`\pi^e_t = \lambda\,\pi^{LR} + (1-\lambda)\,\pi_{t-1}`],
  ['real rate', String.raw`r_t = i_t - \pi^e_t`],
  [
    'IS',
    String.raw`y_t = \rho_y\,y_{t-1} - \alpha\cdot\tfrac{1}{4}\textstyle\sum_{k=1}^{4}\left(r_{t-k}-r^*\right) + d_t`,
  ],
  ['Phillips', String.raw`\pi_t = \gamma\,\pi_{t-1} + (1-\gamma)\,\pi^e_t + \kappa\,y_{t-1} + s_t`],
  ['Okun', String.raw`u_t = u_{t-1} + \theta\left[(u^* - \beta\,y_t) - u_{t-1}\right]`],
  ['GDP', String.raw`g_t = g^{pot} + 4\,(y_t - y_{t-1})`],
  [
    'Taylor',
    String.raw`i_t = \max\!\left\{i_{min},\ \rho_i\,i_{t-1} + (1-\rho_i)\left[r^* + \pi_t + \phi_\pi(\pi_t-2) + \phi_y\,y_t\right]\right\}`,
  ],
  ['2y', String.raw`y^{2y}_t = \tfrac{1}{8}\textstyle\sum_{k=0}^{7} i_{t+k} + tp_2`],
  [
    '10y',
    String.raw`y^{10y}_t = y^{10y}_0 + b_{10}\left(y^{2y}_t - y^{2y}_0\right) + \Delta\!\left(\pi^{LR} + r^*\right)`,
  ],
];

const tex = (s: string, display = false) =>
  katex.renderToString(s, { displayMode: display, throwOnError: false, output: 'html' });

export default function ExpertPanel() {
  const t = useT();
  const f = useFmt();
  const checks = useMemo(() => calibrationChecks(), []);
  const lang = f.lang;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 font-bold">{t.expertEquations}</h3>
        <ol className="space-y-2" dir="ltr">
          {EQUATIONS.map(([name, eq], i) => (
            <li
              key={name}
              className="flex items-center gap-3 overflow-x-auto rounded-lg border border-line bg-bg-2/40 px-3 py-2"
            >
              <span className="w-5 shrink-0 text-xs text-faint">{i + 1}</span>
              <span className="text-sm" dangerouslySetInnerHTML={{ __html: tex(eq) }} />
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-2 font-bold">{t.expertParams}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted">
                {t.paramCols.map((c) => (
                  <th key={c} scope="col" className="p-1.5 text-start font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PARAM_META).map(([k, m]) => (
                <tr key={k} className="border-t border-line align-top">
                  <td
                    className="p-1.5"
                    dir="ltr"
                    dangerouslySetInnerHTML={{ __html: tex(m.symbol) }}
                  />
                  <td className="p-1.5">{lang === 'fa' ? m.fa : m.en}</td>
                  <td className="num p-1.5 font-semibold">
                    {f.num(m.value, { dp: m.value % 1 === 0 ? 0 : m.value < 0.1 ? 3 : 2 })}
                  </td>
                  <td className="num p-1.5 whitespace-nowrap text-muted">
                    {f.ltr(`${m.min} – ${m.max}`)}
                  </td>
                  <td className="p-1.5 text-muted" dir="ltr">
                    {m.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-bold">{t.expertCalibration}</h3>
        <ul className="space-y-1 text-xs" dir="ltr">
          {checks.map((c) => (
            <li
              key={c.name}
              className="flex flex-wrap justify-between gap-2 border-t border-line py-1"
            >
              <span>
                {c.pass ? '✓' : '✗'} {c.name}
              </span>
              {c.unit && (
                <span className="num text-muted">
                  {c.value.toFixed(2)} {c.unit}
                  {c.quarter !== undefined ? ` @Q${c.quarter}` : ''} · target {c.range[0]}…
                  {c.range[1]}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">{t.expertNote}</p>
      </section>
    </div>
  );
}
