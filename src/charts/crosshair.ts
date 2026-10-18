/**
 * Value-based crosshair sync across charts of different sizes and ranges.
 * (ECharts' built-in `connect` forwards pixel coordinates, which misaligns
 * charts with different widths or x ranges.)
 */
type Listener = (time: number | null, source: unknown) => void;

const listeners = new Set<Listener>();
let raf = 0;
let pending: { time: number | null; source: unknown } | null = null;

export function publishHover(time: number | null, source: unknown): void {
  pending = { time, source };
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const p = pending;
    pending = null;
    if (p) for (const l of listeners) l(p.time, p.source);
  });
}

export function subscribeHover(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
