/**
 * Every chart joins the 'fpl' ECharts group: synced crosshair (axis pointer)
 * across charts, and one composed image for PNG export.
 */
import type { EChartsType } from 'echarts/core';

export const CHART_GROUP = 'fpl';

const charts = new Set<EChartsType>();
const initializers = new Set<() => void>();

/** Lazy charts register how to initialize themselves (used before PNG export). */
export function registerInitializer(fn: () => void): () => void {
  initializers.add(fn);
  return () => initializers.delete(fn);
}

/** Initialize every lazily-rendered chart, then wait for them to paint. */
export async function initAllCharts(): Promise<void> {
  for (const fn of initializers) fn();
  await import('./echarts');
  await new Promise((r) => setTimeout(r, 500));
}

export function registerChart(c: EChartsType): () => void {
  charts.add(c);
  return () => charts.delete(c);
}

/** Data URL of all connected charts laid out as on screen (null if none rendered). */
export function connectedChartsDataUrl(bg: string): string | null {
  const first = [...charts].find((c) => !c.isDisposed());
  if (!first) return null;
  return first.getConnectedDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: bg,
    connectedBackgroundColor: bg,
  });
}
