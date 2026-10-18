/** Tiny SVG sparkline (cheaper than an ECharts instance per KPI). */
export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  const pts = values.filter(Number.isFinite);
  if (pts.length < 2) return null;
  const W = 100;
  const H = 28;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const xy = pts.map(
    (v, i) => [(i / (pts.length - 1)) * W, H - 2 - ((v - min) / span) * (H - 4)] as const,
  );
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const [lx, ly] = xy[xy.length - 1]!;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`h-7 w-full overflow-visible ${className}`}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--c-history)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <circle
        cx={lx}
        cy={ly}
        r={2.5}
        fill="var(--c-scenario)"
        stroke="var(--c-panel-solid)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
