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

import performanceMonitorStyles from './performanceMonitor.css.js';

const UIStrings = {
  /**
  *@description Aria accessible name in Performance Monitor of the Performance monitor tab
  */
  graphsDisplayingARealtimeViewOf: 'Graphs displaying a real-time view of performance metrics',
  /**
  *@description Text in Performance Monitor of the Performance monitor tab
  */
  paused: 'Paused',
  /**
  *@description Text in Performance Monitor of the Performance monitor tab
  */
  cpuUsage: 'CPU usage',
  /**
  *@description Text in Performance Monitor of the Performance monitor tab
  */
  jsHeapSize: 'JS heap size',
  /**
  *@description Text in Performance Monitor of the Performance monitor tab
  */
  domNodes: 'DOM Nodes',
  /**
  *@description Text in Performance Monitor of the Performance monitor tab
  */
  jsEventListeners: 'JS event listeners',
  /**
  *@description Text for documents, a type of resources
  */
  documents: 'Documents',
  /**
  *@description Text in Performance Monitor of the Performance monitor tab
  */
  documentFrames: 'Document Frames',
  /**
  *@description Text in Performance Monitor of the Performance monitor tab
  */
  layoutsSec: 'Layouts / sec',
  /**
  *@description Text in Performance Monitor of the Performance monitor tab
  */
  styleRecalcsSec: 'Style recalcs / sec',
};
const str_ = i18n.i18n.registerUIStrings('panels/performance_monitor/PerformanceMonitor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let performanceMonitorImplInstance: PerformanceMonitorImpl;

export class PerformanceMonitorImpl extends UI.Widget.HBox implements
    SDK.TargetManager.SDKModelObserver<SDK.PerformanceMetricsModel.PerformanceMetricsModel> {
  private metricsBuffer: {timestamp: number, metrics: Map<string, number>}[];
  private readonly pixelsPerMs: number;
  private pollIntervalMs: number;
  private readonly scaleHeight: number;
  private graphHeight: number;
  private gridColor: string;
  private controlPane: ControlPane;
  private canvas: HTMLCanvasElement;
  private animationId!: number;
  private width!: number;
  private height!: number;
  private model?: SDK.PerformanceMetricsModel.PerformanceMetricsModel|null;
  private startTimestamp?: number;
  private pollTimer?: number;

  constructor() {
    super(true);

    this.contentElement.classList.add('perfmon-pane');
    this.metricsBuffer = [];
    /** @const */
    this.pixelsPerMs = 10 / 1000;
    /** @const */
    this.pollIntervalMs = 500;
    /** @const */
    this.scaleHeight = 16;
    /** @const */
    this.graphHeight = 90;
    this.gridColor = ThemeSupport.ThemeSupport.instance().patchColorText(
        'rgba(0, 0, 0, 0.08)', ThemeSupport.ThemeSupport.ColorUsage.Foreground);
    this.controlPane = new ControlPane(this.contentElement);
    const chartContainer = this.contentElement.createChild('div', 'perfmon-chart-container');
    this.canvas = chartContainer.createChild('canvas') as HTMLCanvasElement;
    this.canvas.tabIndex = -1;
    UI.ARIAUtils.setAccessibleName(this.canvas, i18nString(UIStrings.graphsDisplayingARealtimeViewOf));
    this.contentElement.createChild('div', 'perfmon-chart-suspend-overlay fill').createChild('div').textContent =
        i18nString(UIStrings.paused);
    this.controlPane.addEventListener(Events.MetricChanged, this.recalcChartHeight, this);
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.PerformanceMetricsModel.PerformanceMetricsModel, this);
  }

  static instance(opts = {forceNew: null}): PerformanceMonitorImpl {
    const {forceNew} = opts;
    if (!performanceMonitorImplInstance || forceNew) {
      performanceMonitorImplInstance = new PerformanceMonitorImpl();
    }

    return performanceMonitorImplInstance;
  }

  wasShown(): void {
    if (!this.model) {
      return;
    }
    this.registerCSSFiles([performanceMonitorStyles]);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.SuspendStateChanged, this.suspendStateChanged, this);
    this.model.enable();
    this.suspendStateChanged();
  }

  willHide(): void {
    if (!this.model) {
      return;
    }
    SDK.TargetManager.TargetManager.instance().removeEventListener(
        SDK.TargetManager.Events.SuspendStateChanged, this.suspendStateChanged, this);
    this.stopPolling();
    this.model.disable();
  }

  modelAdded(model: SDK.PerformanceMetricsModel.PerformanceMetricsModel): void {
    if (this.model) {
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
    this.contentElement.classList.toggle('suspended', suspended);
  }

  private startPolling(): void {
    this.startTimestamp = 0;
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
    this.metricsBuffer.push({timestamp, metrics: metrics});
    const millisPerWidth = this.width / this.pixelsPerMs;
    // Multiply by 2 as the pollInterval has some jitter and to have some extra samples if window is resized.
    const maxCount = Math.ceil(millisPerWidth / this.pollIntervalMs * 2);
    if (this.metricsBuffer.length > maxCount * 2)  // Multiply by 2 to have a hysteresis.
    {
      this.metricsBuffer.splice(0, this.metricsBuffer.length - maxCount);
    }
    this.controlPane.updateMetrics(metrics);
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(0, this.scaleHeight);  // Reserve space for the scale bar.
    for (const chartInfo of this.controlPane.charts()) {
      if (!this.controlPane.isActive(chartInfo.metrics[0].name)) {
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
    const lightGray = ThemeSupport.ThemeSupport.instance().patchColorText(
        'rgba(0, 0, 0, 0.02)', ThemeSupport.ThemeSupport.ColorUsage.Foreground);
    ctx.font = '10px ' + Host.Platform.fontFamily();
    ctx.fillStyle = ThemeSupport.ThemeSupport.instance().patchColorText(
        'rgba(0, 0, 0, 0.55)', ThemeSupport.ThemeSupport.ColorUsage.Foreground);
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
    const backgroundColor = Common.Color.Color.parse(UI.Utils.getThemeColorValue('--color-background'));

    if (backgroundColor) {
      for (const path of paths.reverse()) {
        const color = path.color;
        ctx.save();
        const parsedColor = Common.Color.Color.parse(color);
        if (!parsedColor) {
          continue;
        }
        ctx.fillStyle = backgroundColor.blendWith(parsedColor.setAlpha(0.2)).asString(null) || '';
        ctx.fill(path.path);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.stroke(path.path);
        ctx.restore();
      }
    }
    ctx.fillStyle = ThemeSupport.ThemeSupport.instance().patchColorText(
        'rgba(0, 0, 0, 0.55)', ThemeSupport.ThemeSupport.ColorUsage.Foreground);
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
    let max: number = -Infinity;
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
    ctx.fillStyle = ThemeSupport.ThemeSupport.instance().patchColorText(
        'rgba(0, 0, 0, 0.55)', ThemeSupport.ThemeSupport.ColorUsage.Foreground);
    ctx.strokeStyle = this.gridColor;
    ctx.beginPath();
    for (let i = 0; i < 2; ++i) {
      const y = calcY(scaleValue);
      const labelText = MetricIndicator.formatNumber(scaleValue, info);
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
    ctx.strokeStyle = ThemeSupport.ThemeSupport.instance().patchColorText(
        'rgba(0, 0, 0, 0.2)', ThemeSupport.ThemeSupport.ColorUsage.Foreground);
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

  onResize(): void {
    super.onResize();
    this.width = this.canvas.offsetWidth;
    this.canvas.width = Math.round(this.width * window.devicePixelRatio);
    this.recalcChartHeight();
  }

  private recalcChartHeight(): void {
    let height = this.scaleHeight;
    for (const chartInfo of this.controlPane.charts()) {
      if (this.controlPane.isActive(chartInfo.metrics[0].name)) {
        height += this.graphHeight;
      }
    }
    this.height = Math.ceil(height * window.devicePixelRatio);
    this.canvas.height = this.height;
    this.canvas.style.height = `${this.height / window.devicePixelRatio}px`;
  }
}

export const enum Format {
  Percent = 'Percent',
  Bytes = 'Bytes',
}

export class ControlPane extends Common.ObjectWrapper.ObjectWrapper {
  element: Element;
  private readonly enabledChartsSetting: Common.Settings.Setting<string[]>;
  private readonly enabledCharts: Set<string>;
  private readonly chartsInfo: ChartInfo[];
  private readonly indicators: Map<string, MetricIndicator>;

  constructor(parent: Element) {
    super();
    this.element = parent.createChild('div', 'perfmon-control-pane');

    this.enabledChartsSetting = Common.Settings.Settings.instance().createSetting(
        'perfmonActiveIndicators2', ['TaskDuration', 'JSHeapTotalSize', 'Nodes']);
    this.enabledCharts = new Set(this.enabledChartsSetting.get());

    const defaults = {
      color: undefined,
      format: undefined,
      currentMax: undefined,
      max: undefined,
      smooth: undefined,
      stacked: undefined,
    };

    this.chartsInfo = [
      {
        ...defaults,
        title: i18nString(UIStrings.cpuUsage),
        metrics: [
          {name: 'TaskDuration', color: '#999'},
          {name: 'ScriptDuration', color: 'orange'},
          {name: 'LayoutDuration', color: 'blueviolet'},
          {name: 'RecalcStyleDuration', color: 'violet'},
        ],
        format: Format.Percent,
        smooth: true,
        stacked: true,
        color: 'red',
        max: 1,
        currentMax: undefined,
      },
      {
        ...defaults,
        title: i18nString(UIStrings.jsHeapSize),
        metrics: [{name: 'JSHeapTotalSize', color: '#99f'}, {name: 'JSHeapUsedSize', color: 'blue'}],
        format: Format.Bytes,
        color: 'blue',
      },
      {...defaults, title: i18nString(UIStrings.domNodes), metrics: [{name: 'Nodes', color: 'green'}]},
      {
        ...defaults,
        title: i18nString(UIStrings.jsEventListeners),
        metrics: [{name: 'JSEventListeners', color: 'yellowgreen'}],
      },
      {...defaults, title: i18nString(UIStrings.documents), metrics: [{name: 'Documents', color: 'darkblue'}]},
      {...defaults, title: i18nString(UIStrings.documentFrames), metrics: [{name: 'Frames', color: 'darkcyan'}]},
      {...defaults, title: i18nString(UIStrings.layoutsSec), metrics: [{name: 'LayoutCount', color: 'hotpink'}]},
      {
        ...defaults,
        title: i18nString(UIStrings.styleRecalcsSec),
        metrics: [{name: 'RecalcStyleCount', color: 'deeppink'}],
      },
    ];
    for (const info of this.chartsInfo) {
      if (info.color) {
        info.color = ThemeSupport.ThemeSupport.instance().patchColorText(
            info.color, ThemeSupport.ThemeSupport.ColorUsage.Foreground);
      }
      for (const metric of info.metrics) {
        metric.color = ThemeSupport.ThemeSupport.instance().patchColorText(
            metric.color, ThemeSupport.ThemeSupport.ColorUsage.Foreground);
      }
    }

    this.indicators = new Map();
    for (const chartInfo of this.chartsInfo) {
      const chartName = chartInfo.metrics[0].name;
      const active = this.enabledCharts.has(chartName);
      const indicator = new MetricIndicator(this.element, chartInfo, active, this.onToggle.bind(this, chartName));
      this.indicators.set(chartName, indicator);
    }
  }

  private onToggle(chartName: string, active: boolean): void {
    if (active) {
      this.enabledCharts.add(chartName);
    } else {
      this.enabledCharts.delete(chartName);
    }
    this.enabledChartsSetting.set(Array.from(this.enabledCharts));
    this.dispatchEventToListeners(Events.MetricChanged);
  }

  charts(): ChartInfo[] {
    return this.chartsInfo;
  }

  isActive(metricName: string): boolean {
    return this.enabledCharts.has(metricName);
  }

  updateMetrics(metrics: Map<string, number>): void {
    for (const name of this.indicators.keys()) {
      const metric = metrics.get(name);
      if (metric !== undefined) {
        const indicator = this.indicators.get(name);
        if (indicator) {
          indicator.setValue(metric);
        }
      }
    }
  }
}

export const enum Events {
  MetricChanged = 'MetricChanged',
}

let numberFormatter: Intl.NumberFormat;
let percentFormatter: Intl.NumberFormat;

export class MetricIndicator {
  private info: ChartInfo;
  private active: boolean;
  private readonly onToggle: (arg0: boolean) => void;
  element: HTMLElement;
  private readonly swatchElement: UI.Icon.Icon;
  private valueElement: HTMLElement;

  constructor(parent: Element, info: ChartInfo, active: boolean, onToggle: (arg0: boolean) => void) {
    const color = info.color || info.metrics[0].color;
    this.info = info;
    this.active = active;
    this.onToggle = onToggle;
    this.element = parent.createChild('div', 'perfmon-indicator') as HTMLElement;
    this.swatchElement = UI.Icon.Icon.create('smallicon-checkmark-square', 'perfmon-indicator-swatch');
    this.swatchElement.style.backgroundColor = color;
    this.element.appendChild(this.swatchElement);
    this.element.createChild('div', 'perfmon-indicator-title').textContent = info.title;
    this.valueElement = this.element.createChild('div', 'perfmon-indicator-value') as HTMLElement;
    this.valueElement.style.color = color;
    this.element.addEventListener('click', () => this.toggleIndicator());
    this.element.addEventListener('keypress', event => this.handleKeypress(event));
    this.element.classList.toggle('active', active);
    UI.ARIAUtils.markAsCheckbox(this.element);
    UI.ARIAUtils.setChecked(this.element, this.active);
    this.element.tabIndex = 0;
  }

  static formatNumber(value: number, info: ChartInfo): string {
    if (!numberFormatter) {
      numberFormatter = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1});
      percentFormatter = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1, style: 'percent'});
    }
    switch (info.format) {
      case Format.Percent:
        return percentFormatter.format(value);
      case Format.Bytes:
        return Platform.NumberUtilities.bytesToString(value);
      default:
        return numberFormatter.format(value);
    }
  }

  setValue(value: number): void {
    this.valueElement.textContent = MetricIndicator.formatNumber(value, this.info);
  }

  private toggleIndicator(): void {
    this.active = !this.active;
    this.element.classList.toggle('active', this.active);
    UI.ARIAUtils.setChecked(this.element, this.active);
    this.onToggle(this.active);
  }

  private handleKeypress(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === ' ' || keyboardEvent.key === 'Enter') {
      this.toggleIndicator();
    }
  }
}

export const format = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1});
export interface MetricInfo {
  name: string;
  color: string;
}
export interface ChartInfo {
  title: string;
  metrics: {name: string, color: string}[];
  max?: number;
  currentMax?: number;
  format?: Format;
  smooth?: boolean;
  color?: string;
  stacked?: boolean;
}
