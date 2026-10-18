/**
 * Every chart joins the 'fpl' ECharts group: synced crosshair (axis pointer)
 * across charts, and one composed image for PNG export.
 */
import type { EChartsType } from 'echarts/core';

export const CHART_GROUP = 'fpl';

const charts = new Set<EChartsType>();

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
