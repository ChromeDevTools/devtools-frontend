// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import {Directives, html, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import performanceMonitorStyles from './performanceMonitor.css.js';

const UIStrings = {
  /**
   * @description Aria accessible name in Performance Monitor of the Performance monitor tab
   */
  graphsDisplayingARealtimeViewOf: 'Graphs displaying a real-time view of performance metrics',
  /**
   * @description Text in Performance Monitor of the Performance monitor tab
   */
  paused: 'Paused',
  /**
   * @description Text in Performance Monitor of the Performance monitor tab
   */
  cpuUsage: 'CPU usage',
  /**
   * @description Text in Performance Monitor of the Performance monitor tab
   */
  jsHeapSize: 'JS heap size',
  /**
   * @description Text in Performance Monitor of the Performance monitor tab
   */
  domNodes: 'DOM Nodes',
  /**
   * @description Text in Performance Monitor of the Performance monitor tab
   */
  jsEventListeners: 'JS event listeners',
  /**
   * @description Text for documents, a type of resources
   */
  documents: 'Documents',
  /**
   * @description Text in Performance Monitor of the Performance monitor tab
   */
  documentFrames: 'Document Frames',
  /**
   * @description Text in Performance Monitor of the Performance monitor tab
   */
  layoutsSec: 'Layouts / sec',
  /**
   * @description Text in Performance Monitor of the Performance monitor tab
   */
  styleRecalcsSec: 'Style recalcs / sec',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/performance_monitor/PerformanceMonitor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {widgetConfig} = UI.Widget;
const {classMap, ref} = Directives;

interface PerformanceMonitorInput {
  onMetricChanged: (metricName: string, active: boolean) => void;
  chartsInfo: ChartInfo[];
  metrics?: Map<string, number>;
  width: number;
  height: number;
  suspended: boolean;
}

interface PerformanceMonitorOutput {
  graphRenderingContext: CanvasRenderingContext2D|null;
  width: number;
}

type PerformanceMonitorView = (input: PerformanceMonitorInput, output: PerformanceMonitorOutput, target: HTMLElement) =>
    void;

const DEFAULT_VIEW: PerformanceMonitorView = (input, output, target) => {
  // clang-format off
  render(html`
    <devtools-widget .widgetConfig=${widgetConfig(ControlPane, {
      onMetricChanged: input.onMetricChanged,
      chartsInfo: input.chartsInfo,
      metrics: input.metrics
    })} class=${classMap({suspended: input.suspended})}></devtools-widget>
    <div class="perfmon-chart-container ${classMap({suspended: input.suspended})}">
      <canvas tabindex="-1" aria-label=${i18nString(UIStrings.graphsDisplayingARealtimeViewOf)}
          .width=${Math.round(input.width * window.devicePixelRatio)} .height=${input.height}
          style="height:${input.height / window.devicePixelRatio}px" ${ref(e => {
            if (e) {
              const canvas = e as HTMLCanvasElement;
              output.graphRenderingContext = canvas.getContext('2d');
              output.width = canvas.offsetWidth;
            }
      })}>
      </canvas>
    </div>
    ${input.suspended ? html`
      <div class="perfmon-chart-suspend-overlay fill">
        <div>${i18nString(UIStrings.paused)}</div>
      </div>` : ''}`,
    target);
  // clang-format on
};

export class PerformanceMonitorImpl extends UI.Widget.HBox implements
    SDK.TargetManager.SDKModelObserver<SDK.PerformanceMetricsModel.PerformanceMetricsModel> {
  private view: PerformanceMonitorView;
  private chartInfos: ChartInfo[] = [];
  private activeCharts = new Set<string>();
  private metricsBuffer: Array<{timestamp: number, metrics: Map<string, number>}>;
  private readonly pixelsPerMs: number;
  private pollIntervalMs: number;
  private readonly scaleHeight: number;
  private graphHeight: number;
  private gridColor: string;
  private animationId!: number;
  private width!: number;
  private height!: number;
  private model?: SDK.PerformanceMetricsModel.PerformanceMetricsModel|null;
  private pollTimer?: number;
  private metrics?: Map<string, number>;
  private suspended = false;
  private graphRenderingContext: CanvasRenderingContext2D|null = null;

  constructor(pollIntervalMs = 500, view = DEFAULT_VIEW) {
    super({
      jslog: `${VisualLogging.panel('performance.monitor').track({resize: true})}`,
      useShadowDom: true,
    });
    this.view = view;
    this.registerRequiredCSS(performanceMonitorStyles);

    this.metricsBuffer = [];
    /** @constant */
    this.pixelsPerMs = 10 / 1000;
    /** @constant */
    this.pollIntervalMs = pollIntervalMs;
    /** @constant */
    this.scaleHeight = 16;
    /** @constant */
    this.graphHeight = 90;
    this.gridColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--divider-line');
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.PerformanceMetricsModel.PerformanceMetricsModel, this);
  }

  private onMetricStateChanged(metricName: string, active: boolean): void {
    if (active) {
      this.activeCharts.add(metricName);
    } else {
      this.activeCharts.delete(metricName);
    }
    this.recalcChartHeight();
  }

  override wasShown(): void {
    if (!this.model) {
      return;
    }
    this.chartInfos = this.createChartInfos();
    const themeSupport = ThemeSupport.ThemeSupport.instance();
    themeSupport.addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      // instantiateMetricData sets the colors for the metrics, which we need
      // to re-evaluate when the theme changes before re-drawing the canvas.
      this.chartInfos = this.createChartInfos();
      this.requestUpdate();
    });
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, this.suspendStateChanged, this);
    void this.model.enable();
    this.suspendStateChanged();
    this.requestUpdate();
  }

  override willHide(): void {
    if (!this.model) {
      return;
    }
    SDK.TargetManager.TargetManager.instance().removeEventListener(
        SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, this.suspendStateChanged, this);
    this.stopPolling();
    void this.model.disable();
  }

  override performUpdate(): void {
    const input = {
      onMetricChanged: this.onMetricStateChanged.bind(this),
      chartsInfo: this.chartInfos,
      metrics: this.metrics,
      width: this.width,
      height: this.height,
      suspended: this.suspended,
    };
    const output = {graphRenderingContext: null, width: 0};
    this.view(input, output, this.contentElement);
    this.graphRenderingContext = output.graphRenderingContext;
    this.width = output.width;
    this.draw();
  }

  modelAdded(model: SDK.PerformanceMetricsModel.PerformanceMetricsModel): void {
    if (model.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.model = model;
    if (this.isShowing()) {
      this.wasShown();
    }
  }

  modelRemoved(model: SDK.PerformanceMetricsModel.PerformanceMetricsModel): void {
    if (this.model !== model) {
      return;
    }
    if (this.isShowing()) {
      this.willHide();
    }
    this.model = null;
  }

  private suspendStateChanged(): void {
    const suspended = SDK.TargetManager.TargetManager.instance().allTargetsSuspended();
    if (suspended) {
      this.stopPolling();
    } else {
      this.startPolling();
    }
    this.suspended = suspended;
    this.requestUpdate();
  }

  private startPolling(): void {
    this.pollTimer = window.setInterval(() => this.poll(), this.pollIntervalMs);
    this.onResize();
    const animate = (): void => {
      this.draw();
      this.animationId = this.contentElement.window().requestAnimationFrame(() => {
        animate();
      });
    };
    animate();
  }

  private stopPolling(): void {
    window.clearInterval(this.pollTimer);
    this.contentElement.window().cancelAnimationFrame(this.animationId);
    this.metricsBuffer = [];
  }

  private async poll(): Promise<void> {
    if (!this.model) {
      return;
    }
    const data = await this.model.requestMetrics();
    const timestamp = data.timestamp;
    const metrics = data.metrics;
    this.metricsBuffer.push({timestamp, metrics});
    const millisPerWidth = this.width / this.pixelsPerMs;
    // Multiply by 2 as the pollInterval has some jitter and to have some extra samples if window is resized.
    const maxCount = Math.ceil(millisPerWidth / this.pollIntervalMs * 2);
    if (this.metricsBuffer.length > maxCount * 2)  // Multiply by 2 to have a hysteresis.
    {
      this.metricsBuffer.splice(0, this.metricsBuffer.length - maxCount);
    }
    this.metrics = metrics;
    this.requestUpdate();
  }

  private draw(): void {
    if (!this.graphRenderingContext) {
      return;
    }
    const ctx = this.graphRenderingContext;
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(0, this.scaleHeight);  // Reserve space for the scale bar.
    for (const chartInfo of this.chartInfos) {
      if (!this.activeCharts.has(chartInfo.metrics[0].name)) {
        continue;
      }
      this.drawChart(ctx, chartInfo, this.graphHeight);
      ctx.translate(0, this.graphHeight);
    }
    ctx.restore();
    this.drawHorizontalGrid(ctx);
    ctx.restore();
  }

  private drawHorizontalGrid(ctx: CanvasRenderingContext2D): void {
    const labelDistanceSeconds = 10;
    const lightGray = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background-inverted-opacity-2');
    ctx.font = '10px ' + Host.Platform.fontFamily();
    ctx.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background-inverted-opacity-50');
    const currentTime = Date.now() / 1000;
    for (let sec = Math.ceil(currentTime);; --sec) {
      const x = this.width - ((currentTime - sec) * 1000 - this.pollIntervalMs) * this.pixelsPerMs;
      if (x < -50) {
        break;
      }
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      if (sec >= 0 && sec % labelDistanceSeconds === 0) {
        ctx.fillText(new Date(sec * 1000).toLocaleTimeString(), x + 4, 12);
      }
      ctx.strokeStyle = sec % labelDistanceSeconds ? lightGray : this.gridColor;
      ctx.stroke();
    }
  }

  private drawChart(ctx: CanvasRenderingContext2D, chartInfo: ChartInfo, height: number): void {
    ctx.save();
    ctx.rect(0, 0, this.width, height);
    ctx.clip();
    const bottomPadding = 8;
    const extraSpace = 1.05;
    const max = this.calcMax(chartInfo) * extraSpace;
    const stackedChartBaseLandscape = chartInfo.stacked ? new Map() : null;
    const paths = [];
    for (let i = chartInfo.metrics.length - 1; i >= 0; --i) {
      const metricInfo = chartInfo.metrics[i];
      paths.push({
        path: this.buildMetricPath(
            chartInfo, metricInfo, height - bottomPadding, max, i ? stackedChartBaseLandscape : null),
        color: metricInfo.color,
      });
    }
    const backgroundColor =
        Common.Color.parse(ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container'))
            ?.asLegacyColor();

    if (backgroundColor) {
      for (const path of paths.reverse()) {
        const color = path.color;
        ctx.save();
        const parsedColor = Common.Color.parse(color);
        if (!parsedColor) {
          continue;
        }
        ctx.fillStyle = backgroundColor.blendWith(parsedColor.setAlpha(0.2).asLegacyColor()).asString() || '';
        ctx.fill(path.path);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.stroke(path.path);
        ctx.restore();
      }
    }
    ctx.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background-inverted-opacity-50');
    ctx.font = `10px  ${Host.Platform.fontFamily()}`;
    ctx.fillText(chartInfo.title, 8, 10);
    this.drawVerticalGrid(ctx, height - bottomPadding, max, chartInfo);
    ctx.restore();
  }

  private calcMax(chartInfo: ChartInfo): number {
    if (chartInfo.max) {
      return chartInfo.max;
    }
    const width = this.width;
    const startTime = performance.now() - this.pollIntervalMs - width / this.pixelsPerMs;
    let max = -Infinity;
    for (const metricInfo of chartInfo.metrics) {
      for (let i = this.metricsBuffer.length - 1; i >= 0; --i) {
        const metrics = this.metricsBuffer[i];
        const value = metrics.metrics.get(metricInfo.name);
        if (value !== undefined) {
          max = Math.max(max, value);
        }
        if (metrics.timestamp < startTime) {
          break;
        }
      }
    }
    if (!this.metricsBuffer.length) {
      return 10;
    }

    const base10 = Math.pow(10, Math.floor(Math.log10(max)));
    max = Math.ceil(max / base10 / 2) * base10 * 2;

    const alpha = 0.2;
    chartInfo.currentMax = max * alpha + (chartInfo.currentMax || max) * (1 - alpha);
    return chartInfo.currentMax;
  }

  private drawVerticalGrid(ctx: CanvasRenderingContext2D, height: number, max: number, info: ChartInfo): void {
    let base = Math.pow(10, Math.floor(Math.log10(max)));
    const firstDigit = Math.floor(max / base);
    if (firstDigit !== 1 && firstDigit % 2 === 1) {
      base *= 2;
    }
    let scaleValue = Math.floor(max / base) * base;

    const span = max;
    const topPadding = 18;
    const visibleHeight = height - topPadding;
    ctx.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background-inverted-opacity-50');
    ctx.strokeStyle = this.gridColor;
    ctx.beginPath();
    for (let i = 0; i < 2; ++i) {
      const y = calcY(scaleValue);
      const labelText = formatNumber(scaleValue, info);
      ctx.moveTo(0, y);
      ctx.lineTo(4, y);
      ctx.moveTo(ctx.measureText(labelText).width + 12, y);
      ctx.lineTo(this.width, y);
      ctx.fillText(labelText, 8, calcY(scaleValue) + 3);
      scaleValue /= 2;
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height + 0.5);
    ctx.lineTo(this.width, height + 0.5);
    ctx.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background-inverted-opacity-2');
    ctx.stroke();
    function calcY(value: number): number {
      return Math.round(height - visibleHeight * value / span) + 0.5;
    }
  }

  private buildMetricPath(
      chartInfo: ChartInfo, metricInfo: MetricInfo, height: number, scaleMax: number,
      stackedChartBaseLandscape: Map<number, number>|null): Path2D {
    const path = new Path2D();
    const topPadding = 18;
    const visibleHeight = height - topPadding;
    if (visibleHeight < 1) {
      return path;
    }
    const span = scaleMax;
    const metricName = metricInfo.name;
    const pixelsPerMs = this.pixelsPerMs;
    const startTime = performance.now() - this.pollIntervalMs - this.width / pixelsPerMs;
    const smooth = chartInfo.smooth;

    let x = 0;
    let lastY = 0;
    let lastX = 0;
    if (this.metricsBuffer.length) {
      x = (this.metricsBuffer[0].timestamp - startTime) * pixelsPerMs;
      path.moveTo(x, calcY(0));
      path.lineTo(this.width + 5, calcY(0));
      lastY = calcY(
          (this.metricsBuffer[this.metricsBuffer.length - 1] as {
            metrics: Map<string, number>,
          }).metrics.get(metricName) ||
          0);
      lastX = this.width + 5;
      path.lineTo(lastX, lastY);
    }
    for (let i = this.metricsBuffer.length - 1; i >= 0; --i) {
      const metrics = this.metricsBuffer[i];
      const timestamp = metrics.timestamp;
      let value: number = metrics.metrics.get(metricName) || 0;
      if (stackedChartBaseLandscape) {
        value += stackedChartBaseLandscape.get(timestamp) || 0;
        value = Platform.NumberUtilities.clamp(value, 0, 1);
        stackedChartBaseLandscape.set(timestamp, value);
      }
      const y = calcY(value);
      x = (timestamp - startTime) * pixelsPerMs;
      if (smooth) {
        const midX = (lastX + x) / 2;
        path.bezierCurveTo(midX, lastY, midX, y, x, y);
      } else {
        path.lineTo(x, lastY);
        path.lineTo(x, y);
      }
      lastX = x;
      lastY = y;
      if (timestamp < startTime) {
        break;
      }
    }
    return path;

    function calcY(value: number): number {
      return Math.round(height - visibleHeight * value / span) + 0.5;
    }
  }

  override onResize(): void {
    super.onResize();
    this.recalcChartHeight();
  }

  private recalcChartHeight(): void {
    let height = this.scaleHeight;
    for (const chartInfo of this.chartInfos) {
      if (this.activeCharts.has(chartInfo.metrics[0].name)) {
        height += this.graphHeight;
      }
    }
    this.height = Math.ceil(height * window.devicePixelRatio);
    this.requestUpdate();
  }

  private createChartInfos(): ChartInfo[] {
    const themeSupport = ThemeSupport.ThemeSupport.instance();
    const elementForStyles = this.contentElement;

    const defaults = {
      color: undefined,
      format: undefined,
      currentMax: undefined,
      max: undefined,
      smooth: undefined,
      stacked: undefined,
    };

    return [
      {
        ...defaults,
        title: i18nString(UIStrings.cpuUsage),
        metrics: [
          {
            name: 'TaskDuration',
            color: themeSupport.getComputedValue('--override-color-perf-monitor-cpu-task-duration', elementForStyles),
          },
          {
            name: 'ScriptDuration',
            color: themeSupport.getComputedValue('--override-color-perf-monitor-cpu-script-duration', elementForStyles),
          },
          {
            name: 'LayoutDuration',
            color: themeSupport.getComputedValue('--override-color-perf-monitor-cpu-layout-duration', elementForStyles),
          },
          {
            name: 'RecalcStyleDuration',
            color: themeSupport.getComputedValue(
                '--override-color-perf-monitor-cpu-recalc-style-duration', elementForStyles),
          },
        ],
        format: Format.PERCENT,
        smooth: true,
        stacked: true,
        color: themeSupport.getComputedValue('--override-color-perf-monitor-cpu', elementForStyles),
        max: 1,
        currentMax: undefined,
      },
      {
        ...defaults,
        title: i18nString(UIStrings.jsHeapSize),
        metrics: [
          {
            name: 'JSHeapTotalSize',
            color: themeSupport.getComputedValue('--override-color-perf-monitor-jsheap-total-size', elementForStyles),
          },
          {
            name: 'JSHeapUsedSize',
            color: themeSupport.getComputedValue('--override-color-perf-monitor-jsheap-used-size', elementForStyles),
          },
        ],
        format: Format.BYTES,
        color: themeSupport.getComputedValue('--override-color-perf-monitor-jsheap', elementForStyles),
      },
      {
        ...defaults,
        title: i18nString(UIStrings.domNodes),
        metrics: [
          {
            name: 'Nodes',
            color: themeSupport.getComputedValue('--override-color-perf-monitor-dom-nodes', elementForStyles),
          },
        ],
      },
      {
        ...defaults,
        title: i18nString(UIStrings.jsEventListeners),
        metrics: [
          {
            name: 'JSEventListeners',
            color: themeSupport.getComputedValue('--override-color-perf-monitor-js-event-listeners', elementForStyles),
          },
        ],
      },
      {
        ...defaults,
        title: i18nString(UIStrings.documents),
        metrics: [{
          name: 'Documents',
          color: themeSupport.getComputedValue('--override-color-perf-monitor-documents', elementForStyles),
        }],
      },
      {
        ...defaults,
        title: i18nString(UIStrings.documentFrames),
        metrics: [{
          name: 'Frames',
          color: themeSupport.getComputedValue('--override-color-perf-monitor-document-frames', elementForStyles),
        }],
      },
      {
        ...defaults,
        title: i18nString(UIStrings.layoutsSec),
        metrics: [{
          name: 'LayoutCount',
          color: themeSupport.getComputedValue('--override-color-perf-monitor-layout-count', elementForStyles),
        }],
      },
      {
        ...defaults,
        title: i18nString(UIStrings.styleRecalcsSec),
        metrics: [
          {
            name: 'RecalcStyleCount',
            color: themeSupport.getComputedValue('--override-color-perf-monitor-recalc-style-count', elementForStyles),
          },
        ],
      },
    ];
  }
}

export const enum Format {
  PERCENT = 'Percent',
  BYTES = 'Bytes',
}

interface ControlPaneInput {
  chartsInfo: ChartInfo[];
  enabledCharts: Set<string>;
  metricValues: Map<string, number>;
  onCheckboxChange: (chartName: string, e: Event) => void;
}

type ControlPaneView = (input: ControlPaneInput, output: object, target: HTMLElement) => void;

const CONTROL_PANE_DEFAULT_VIEW: ControlPaneView = (input, _output, target) => {
  render(
      input.chartsInfo.map(chartInfo => {
        const chartName = chartInfo.metrics[0].name;
        const active = input.enabledCharts.has(chartName);
        const value = input.metricValues.get(chartName) || 0;
        return renderMetricIndicator(
            chartInfo,
            active,
            value,
            (e: Event) => input.onCheckboxChange(chartName, e),
        );
      }),
      target);
};

export class ControlPane extends UI.Widget.VBox {
  readonly #enabledChartsSetting: Common.Settings.Setting<string[]>;
  readonly #enabledCharts: Set<string>;
  #onMetricChanged: ((metricName: string, active: boolean) => void)|null = null;

  #chartsInfo: ChartInfo[] = [];
  readonly #metricValues = new Map<string, number>();
  readonly #view: ControlPaneView;

  constructor(element: HTMLElement, view = CONTROL_PANE_DEFAULT_VIEW) {
    super(element, {useShadowDom: false, classes: ['perfmon-control-pane']});
    this.#view = view;

    this.#enabledChartsSetting = Common.Settings.Settings.instance().createSetting(
        'perfmon-active-indicators2', ['TaskDuration', 'JSHeapTotalSize', 'Nodes']);
    this.#enabledCharts = new Set(this.#enabledChartsSetting.get());
  }

  set chartsInfo(chartsInfo: ChartInfo[]) {
    this.#chartsInfo = chartsInfo;
    this.requestUpdate();
  }

  set onMetricChanged(callback: (metricName: string, active: boolean) => void) {
    this.#onMetricChanged = callback;
    for (const chartName of this.#enabledCharts) {
      callback(chartName, true);
    }
  }

  override performUpdate(): void {
    const input = {
      chartsInfo: this.#chartsInfo,
      enabledCharts: this.#enabledCharts,
      metricValues: this.#metricValues,
      onCheckboxChange: this.#onCheckboxChange.bind(this),
    };
    this.#view(input, {}, this.element);
  }

  #onCheckboxChange(chartName: string, e: Event): void {
    this.#onToggle(chartName, (e.target as HTMLInputElement).checked);
    this.requestUpdate();
  }

  #onToggle(chartName: string, active: boolean): void {
    if (active) {
      this.#enabledCharts.add(chartName);
    } else {
      this.#enabledCharts.delete(chartName);
    }
    this.#enabledChartsSetting.set(Array.from(this.#enabledCharts));
    if (this.#onMetricChanged) {
      this.#onMetricChanged(chartName, active);
    }
  }

  set metrics(metrics: Map<string, number>|undefined) {
    if (!metrics) {
      return;
    }
    for (const [name, value] of metrics.entries()) {
      this.#metricValues.set(name, value);
    }
    this.requestUpdate();
  }
}

let numberFormatter: Intl.NumberFormat;
let percentFormatter: Intl.NumberFormat;

export function formatNumber(value: number, info: ChartInfo): string {
  if (!numberFormatter) {
    numberFormatter = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1});
    percentFormatter = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1, style: 'percent'});
  }
  switch (info.format) {
    case Format.PERCENT:
      return percentFormatter.format(value);
    case Format.BYTES:
      return i18n.ByteUtilities.bytesToString(value);
    default:
      return numberFormatter.format(value);
  }
}

function renderMetricIndicator(
    info: ChartInfo, active: boolean, value: number, onCheckboxChange: (e: Event) => void): TemplateResult {
  const color = info.color || info.metrics[0].color;
  const chartName = info.metrics[0].name;
  // clang-format off
  return html`
      <div class="perfmon-indicator ${active ? 'active' : ''}" jslog=${VisualLogging.toggle().track({
        click: true,
        keydown: 'Enter',
      }).context(Platform.StringUtilities.toKebabCase(chartName))}>
        <devtools-checkbox .checked=${active}
            @change=${onCheckboxChange} .jslogContext=${chartName}>${info.title}</devtools-checkbox>
        <div class="perfmon-indicator-value" style="color:${color}">${
      formatNumber(value, info)}</div>
      </div>
    `;
  // clang-format on
}

export const format = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1});
export interface MetricInfo {
  name: string;
  color: string;
}
export interface ChartInfo {
  title: Common.UIString.LocalizedString;
  metrics: Array<{name: string, color: string}>;
  max?: number;
  currentMax?: number;
  format?: Format;
  smooth?: boolean;
  color?: string;
  stacked?: boolean;
}
