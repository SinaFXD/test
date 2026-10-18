import { useEffect, useRef } from 'react';
import { subscribeHover, publishHover } from './crosshair';
import { echarts, type EChartsType } from './echarts';
import { CHART_GROUP, registerChart, registerInitializer } from './registry';

type Option = Parameters<EChartsType['setOption']>[0];

interface Props {
  option: Option;
  height: number;
  /** Accessible name for the chart image; values are also in the data table. */
  label: string;
  /** Grid top/bottom in px, used to draw the synced crosshair. */
  gridTop?: number;
  gridBottom?: number;
  className?: string;
}

/**
 * Lazy ECharts wrapper: initializes when scrolled near the viewport, applies
 * option updates only while visible (pending updates flush on re-entry),
 * resizes with its container and joins the synced-crosshair group.
 */
export function EChart({ option, height, label, gridTop = 24, gridBottom = 28, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const latest = useRef(option);
  const visible = useRef(false);
  const dirty = useRef(true);
  latest.current = option;

  // Apply option when it changes (or defer until visible).
  useEffect(() => {
    dirty.current = true;
    if (chart.current && visible.current) {
      chart.current.setOption(option, { replaceMerge: ['series'], lazyUpdate: true });
      dirty.current = false;
    }
  }, [option]);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let unregister: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;

    const init = () => {
      if (chart.current) return;
      const c = echarts.init(node, undefined, { renderer: 'canvas' });
      c.group = CHART_GROUP;
      chart.current = c;
      unregister = registerChart(c);
      c.setOption(latest.current, { replaceMerge: ['series'] });
      dirty.current = false;

      c.on('updateAxisPointer', (e: unknown) => {
        const info = (e as { axesInfo?: Array<{ axisDim: string; value: number }> }).axesInfo;
        const x = info?.find((a) => a.axisDim === 'x');
        if (x) publishHover(x.value, c);
      });
      c.getZr().on('globalout', () => publishHover(null, c));

      unsubscribe = subscribeHover((time, source) => {
        if (source === c || c.isDisposed()) return;
        let px: number | null = null;
        if (time !== null) {
          const p = c.convertToPixel({ xAxisIndex: 0 }, time) as unknown as number;
          if (Number.isFinite(p) && p >= 0 && p <= c.getWidth()) px = p;
        }
        c.setOption(
          {
            graphic: [
              {
                id: 'xhair',
                type: 'line',
                silent: true,
                invisible: px === null,
                shape: { x1: px ?? 0, y1: gridTop, x2: px ?? 0, y2: c.getHeight() - gridBottom },
                style: { stroke: 'rgba(140,170,230,0.55)', lineWidth: 1 },
                z: 50,
              },
            ],
          },
          { lazyUpdate: true },
        );
      });
    };

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              visible.current = !!entry?.isIntersecting;
              if (!visible.current) return;
              init();
              if (dirty.current && chart.current) {
                chart.current.setOption(latest.current, { replaceMerge: ['series'] });
                dirty.current = false;
              }
            },
            { rootMargin: '300px 0px' },
          )
        : null;
    if (io) io.observe(node);
    else {
      visible.current = true;
      init();
    }

    const unregisterInit = registerInitializer(() => {
      init();
      if (dirty.current && chart.current) {
        chart.current.setOption(latest.current, { replaceMerge: ['series'] });
        dirty.current = false;
      }
    });

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => chart.current?.resize())
        : null;
    ro?.observe(node);

    return () => {
      io?.disconnect();
      ro?.disconnect();
      unregisterInit();
      unsubscribe?.();
      unregister?.();
      chart.current?.dispose();
      chart.current = null;
    };
  }, [gridTop, gridBottom]);

  return (
    <div
      ref={el}
      role="img"
      aria-label={label}
      className={className}
      style={{ height, width: '100%' }}
      dir="ltr"
    />
  );
}
