import { useState } from 'react';
import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import type { PathKey } from '../../model/types';
import { useSim } from '../../state/sim';

const COLS: PathKey[] = ['i', 'pi', 'u', 'g', 'y', 'y2', 'y10', 'mort'];

/** Table view of every plotted level series (baseline / scenario) for all quarters. */
export function DataTable() {
  const t = useT();
  const f = useFmt();
  const { result, quarters } = useSim();
  const [open, setOpen] = useState(false);
  if (!result) return null;
  const fmt = (k: PathKey, v: number) =>
    k === 'i' || k === 'y2' || k === 'y10' || k === 'mort' ? f.rate(v) : f.pct(v);
  return (
    <details className="glass group p-3 sm:p-4" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-semibold">{t.dataTableTitle}</summary>
      {open && (
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="num w-full text-xs">
            <thead className="sticky top-0 bg-panel-solid">
              <tr className="text-muted">
                <th scope="col" className="p-1 text-start font-medium">
                  {t.scrubLabel}
                </th>
                {COLS.map((k) => (
                  <th
                    key={k}
                    scope="colgroup"
                    colSpan={2}
                    className="p-1 text-center font-medium whitespace-nowrap"
                  >
                    {t.vars[k as keyof typeof t.vars]}
                  </th>
                ))}
              </tr>
              <tr className="text-[10px] text-faint">
                <th />
                {COLS.map((k) => [
                  <th key={`${k}b`} scope="col" className="p-1 text-end font-normal">
                    {t.baselineCol}
                  </th>,
                  <th key={`${k}s`} scope="col" className="p-1 text-end font-normal">
                    {t.scenarioCol}
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {quarters.map((q) => (
                <tr key={q.t} className="border-t border-line">
                  <th
                    scope="row"
                    className="p-1 text-start font-normal whitespace-nowrap text-muted"
                  >
                    {q.t === 0 ? t.now : f.digits(q.label)}
                  </th>
                  {COLS.map((k) => [
                    <td key={`${k}b`} className="p-1 text-end">
                      {fmt(k, result.baseline[k][q.t]!)}
                    </td>,
                    <td key={`${k}s`} className="p-1 text-end font-semibold">
                      {fmt(k, result.scenario[k][q.t]!)}
                    </td>,
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
