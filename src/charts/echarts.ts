/** Tree-shaken ECharts: only what the app uses. */
import * as echarts from 'echarts/core';
import { LineChart, ScatterChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  GraphicComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  MarkLineComponent,
  GraphicComponent,
  CanvasRenderer,
]);

export { echarts };
export type { EChartsType } from 'echarts/core';
