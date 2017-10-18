// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Timeline.PerformanceMonitor = class extends UI.HBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('timeline/performanceMonitor.css');
    this.contentElement.classList.add('perfmon-pane');
    this._model = SDK.targetManager.mainTarget().model(SDK.PerformanceMetricsModel);
    /** @type {!Array<!{timestamp: number, metrics: !Map<string, number>}>} */
    this._metricsBuffer = [];
    /** @const */
    this._pixelsPerMs = 20 / 1000;
    /** @const */
    this._pollIntervalMs = 500;
    this._gridColor = UI.themeSupport.patchColorText('rgba(0, 0, 0, 0.08)', UI.ThemeSupport.ColorUsage.Foreground);
    this._controlPane = new Timeline.PerformanceMonitor.ControlPane(this.contentElement);
    this._canvas = /** @type {!HTMLCanvasElement} */ (this.contentElement.createChild('canvas'));

    var mode = Timeline.PerformanceMonitor.MetricMode;
    /** @type {!Map<string, !Timeline.PerformanceMonitor.MetricMode>} */
    this._metricModes = new Map([
      ['TaskDuration', mode.CumulativeTime], ['ScriptDuration', mode.CumulativeTime],
      ['LayoutDuration', mode.CumulativeTime], ['RecalcStyleDuration', mode.CumulativeTime],
      ['LayoutCount', mode.CumulativeCount], ['RecalcStyleCount', mode.CumulativeCount]
    ]);
    /** @type {!Map<string, !{lastValue: (number|undefined), lastTimestamp: (number|undefined)}>} */
    this._metricData = new Map();
  }

  /**
   * @override
   */
  wasShown() {
    this._model.enable();
    this._startTimestamp = 0;
    this._pollTimer = setInterval(() => this._poll(), this._pollIntervalMs);
    this.onResize();
    animate.call(this);

    /**
     * @this {Timeline.PerformanceMonitor}
     */
    function animate() {
      this._draw();
      this._animationId = this.contentElement.window().requestAnimationFrame(animate.bind(this));
    }
  }

  /**
   * @override
   */
  willHide() {
    clearInterval(this._pollTimer);
    this.contentElement.window().cancelAnimationFrame(this._animationId);
    this._model.disable();
    this._metricsBuffer = [];
  }

  async _poll() {
    var metrics = await this._model.requestMetrics();
    this._processMetrics(metrics);
  }

  /**
   * @param {!Array<!Protocol.Performance.Metric>} rawMetrics
   */
  _processMetrics(rawMetrics) {
    var metrics = new Map();
    var timestamp = performance.now();
    for (var metric of rawMetrics) {
      var data = this._metricData.get(metric.name);
      if (!data) {
        data = {};
        this._metricData.set(metric.name, data);
      }
      var value;
      switch (this._metricModes.get(metric.name)) {
        case Timeline.PerformanceMonitor.MetricMode.CumulativeTime:
          value = data.lastTimestamp ?
              Number.constrain((metric.value - data.lastValue) * 1000 / (timestamp - data.lastTimestamp), 0, 1) :
              0;
          data.lastValue = metric.value;
          data.lastTimestamp = timestamp;
          break;
        case Timeline.PerformanceMonitor.MetricMode.CumulativeCount:
          value = data.lastTimestamp ?
              Math.max(0, (metric.value - data.lastValue) * 1000 / (timestamp - data.lastTimestamp)) :
              0;
          data.lastValue = metric.value;
          data.lastTimestamp = timestamp;
          break;
        default:
          value = metric.value;
          break;
      }
      metrics.set(metric.name, value);
    }
    this._metricsBuffer.push({timestamp, metrics: metrics});
    var millisPerWidth = this._width / this._pixelsPerMs;
    // Multiply by 2 as the pollInterval has some jitter and to have some extra samples if window is resized.
    var maxCount = Math.ceil(millisPerWidth / this._pollIntervalMs * 2);
    if (this._metricsBuffer.length > maxCount * 2)  // Multiply by 2 to have a hysteresis.
      this._metricsBuffer.splice(0, this._metricsBuffer.length - maxCount);
    this._controlPane.updateMetrics(metrics);
  }

  _draw() {
    var graphHeight = 90;
    var ctx = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, this._width, this._height);
    ctx.save();
    ctx.translate(0, 16);  // Reserve space for the scale bar.
    for (var chartInfo of this._controlPane.charts()) {
      if (!this._controlPane.isActive(chartInfo.metrics[0].name))
        continue;
      this._drawChart(ctx, chartInfo, graphHeight);
      ctx.translate(0, graphHeight);
    }
    ctx.restore();
    this._drawHorizontalGrid(ctx);
    ctx.restore();
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   */
  _drawHorizontalGrid(ctx) {
    var lightGray = UI.themeSupport.patchColorText('rgba(0, 0, 0, 0.02)', UI.ThemeSupport.ColorUsage.Foreground);
    ctx.font = '9px ' + Host.fontFamily();
    ctx.fillStyle = UI.themeSupport.patchColorText('rgba(0, 0, 0, 0.3)', UI.ThemeSupport.ColorUsage.Foreground);
    var currentTime = Date.now() / 1000;
    for (var sec = Math.ceil(currentTime);; --sec) {
      var x = this._width - ((currentTime - sec) * 1000 - this._pollIntervalMs) * this._pixelsPerMs;
      if (x < -50)
        break;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, this._height);
      if (sec >= 0 && sec % 5 === 0)
        ctx.fillText(new Date(sec * 1000).toLocaleTimeString(), Math.round(x) + 4, 12);
      ctx.strokeStyle = sec % 5 ? lightGray : this._gridColor;
      ctx.stroke();
    }
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   * @param {!Timeline.PerformanceMonitor.ChartInfo} chartInfo
   * @param {number} height
   */
  _drawChart(ctx, chartInfo, height) {
    ctx.save();
    ctx.rect(0, 0, this._width, height);
    ctx.clip();
    var bottomPadding = 8;
    var extraSpace = 1.05;
    var max = this._calcMax(chartInfo) * extraSpace;
    var stackedChartBaseLandscape = chartInfo.stacked ? new Map() : null;
    var paths = [];
    for (var i = chartInfo.metrics.length - 1; i >= 0; --i) {
      var metricInfo = chartInfo.metrics[i];
      paths.push({
        path: this._buildMetricPath(
            chartInfo, metricInfo, height - bottomPadding, max, i ? stackedChartBaseLandscape : null),
        color: metricInfo.color
      });
    }
    var backgroundColor =
        Common.Color.parse(UI.themeSupport.patchColorText('white', UI.ThemeSupport.ColorUsage.Background));
    for (var path of paths.reverse()) {
      var color = path.color;
      ctx.save();
      ctx.fillStyle = backgroundColor.blendWith(Common.Color.parse(color).setAlpha(0.2)).asString(null);
      ctx.fill(path.path);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.stroke(path.path);
      ctx.restore();
    }
    this._drawVerticalGrid(ctx, height - bottomPadding, max, chartInfo);
    ctx.restore();
  }

  /**
   * @param {!Timeline.PerformanceMonitor.ChartInfo} chartInfo
   * @return {number}
   */
  _calcMax(chartInfo) {
    if (chartInfo.max)
      return chartInfo.max;
    var width = this._width;
    var startTime = performance.now() - this._pollIntervalMs - width / this._pixelsPerMs;
    var max = -Infinity;
    for (var metricInfo of chartInfo.metrics) {
      for (var i = this._metricsBuffer.length - 1; i >= 0; --i) {
        var metrics = this._metricsBuffer[i];
        var value = metrics.metrics.get(metricInfo.name);
        max = Math.max(max, value);
        if (metrics.timestamp < startTime)
          break;
      }
      max = Math.max(1, max);
    }
    if (!isFinite(max))
      return 1;

    var base10 = Math.pow(10, Math.floor(Math.log10(max)));
    max = Math.ceil(max / base10 / 2) * base10 * 2;

    var alpha = 0.1;
    chartInfo.currentMax = max * alpha + (chartInfo.currentMax || max) * (1 - alpha);
    return chartInfo.currentMax;
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   * @param {number} height
   * @param {number} max
   * @param {!Timeline.PerformanceMonitor.ChartInfo} info
   */
  _drawVerticalGrid(ctx, height, max, info) {
    var base = Math.pow(10, Math.floor(Math.log10(max)));
    var firstDigit = Math.floor(max / base);
    if (firstDigit !== 1 && firstDigit % 2 === 1)
      base *= 2;
    var scaleValue = Math.floor(max / base) * base;

    var span = max;
    var topPadding = 5;
    var visibleHeight = height - topPadding;
    ctx.fillStyle = UI.themeSupport.patchColorText('rgba(0, 0, 0, 0.3)', UI.ThemeSupport.ColorUsage.Foreground);
    ctx.strokeStyle = this._gridColor;
    ctx.beginPath();
    for (var i = 0; i < 2; ++i) {
      var y = calcY(scaleValue);
      var labelText = Timeline.PerformanceMonitor.MetricIndicator._formatNumber(scaleValue, info);
      ctx.moveTo(0, y);
      ctx.lineTo(4, y);
      ctx.moveTo(ctx.measureText(labelText).width + 12, y);
      ctx.lineTo(this._width, y);
      ctx.fillText(labelText, 8, calcY(scaleValue) + 3);
      scaleValue /= 2;
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height + 0.5);
    ctx.lineTo(this._width, height + 0.5);
    ctx.strokeStyle = UI.themeSupport.patchColorText('rgba(0, 0, 0, 0.2)', UI.ThemeSupport.ColorUsage.Foreground);
    ctx.stroke();
    /**
     * @param {number} value
     * @return {number}
     */
    function calcY(value) {
      return Math.round(height - visibleHeight * value / span) + 0.5;
    }
  }

  /**
   * @param {!Timeline.PerformanceMonitor.ChartInfo} chartInfo
   * @param {!Timeline.PerformanceMonitor.MetricInfo} metricInfo
   * @param {number} height
   * @param {number} scaleMax
   * @param {?Map<number, number>} stackedChartBaseLandscape
   * @return {!Path2D}
   */
  _buildMetricPath(chartInfo, metricInfo, height, scaleMax, stackedChartBaseLandscape) {
    var path = new Path2D();
    var topPadding = 5;
    var visibleHeight = height - topPadding;
    if (visibleHeight < 1)
      return path;
    var span = scaleMax;
    var metricName = metricInfo.name;
    var pixelsPerMs = this._pixelsPerMs;
    var startTime = performance.now() - this._pollIntervalMs - this._width / pixelsPerMs;
    var smooth = chartInfo.smooth;

    var x = 0;
    var lastY = 0;
    var lastX = 0;
    if (this._metricsBuffer.length) {
      x = (this._metricsBuffer[0].timestamp - startTime) * pixelsPerMs;
      path.moveTo(x, calcY(0));
      path.lineTo(this._width + 5, calcY(0));
      lastY = calcY(this._metricsBuffer.peekLast().metrics.get(metricName));
      lastX = this._width + 5;
      path.lineTo(lastX, lastY);
    }
    for (var i = this._metricsBuffer.length - 1; i >= 0; --i) {
      var metrics = this._metricsBuffer[i];
      var timestamp = metrics.timestamp;
      var value = metrics.metrics.get(metricName);
      if (stackedChartBaseLandscape) {
        value += stackedChartBaseLandscape.get(timestamp) || 0;
        value = Number.constrain(value, 0, 1);
        stackedChartBaseLandscape.set(timestamp, value);
      }
      var y = calcY(value);
      x = (timestamp - startTime) * pixelsPerMs;
      if (smooth) {
        var midX = (lastX + x) / 2;
        path.bezierCurveTo(midX, lastY, midX, y, x, y);
      } else {
        path.lineTo(x, lastY);
        path.lineTo(x, y);
      }
      lastX = x;
      lastY = y;
      if (timestamp < startTime)
        break;
    }
    return path;

    /**
     * @param {number} value
     * @return {number}
     */
    function calcY(value) {
      return Math.round(height - visibleHeight * value / span) + 0.5;
    }
  }

  /**
   * @override
   */
  onResize() {
    super.onResize();
    this._width = this._canvas.offsetWidth;
    this._height = this._canvas.offsetHeight;
    this._canvas.width = Math.round(this._width * window.devicePixelRatio);
    this._canvas.height = Math.round(this._height * window.devicePixelRatio);
    this._draw();
  }
};

/** @enum {symbol} */
Timeline.PerformanceMonitor.MetricMode = {
  CumulativeTime: Symbol('CumulativeTime'),
  CumulativeCount: Symbol('CumulativeCount'),
};

/** @enum {symbol} */
Timeline.PerformanceMonitor.Format = {
  Percent: Symbol('Percent'),
  Bytes: Symbol('Bytes'),
};

/**
 * @typedef {!{
 *   title: string,
 *   metrics: !Array<!Timeline.PerformanceMonitor.MetricInfo>,
 *   max: (number|undefined),
 *   currentMax: (number|undefined),
 *   format: (!Timeline.PerformanceMonitor.Format|undefined),
 *   smooth: (boolean|undefined)
 * }}
 */
Timeline.PerformanceMonitor.ChartInfo;

/**
 * @typedef {!{
 *   name: string,
 *   color: string,
 *   mode: (!Timeline.PerformanceMonitor.MetricMode|undefined)
 * }}
 */
Timeline.PerformanceMonitor.MetricInfo;

Timeline.PerformanceMonitor.ControlPane = class {
  /**
   * @param {!Element} parent
   */
  constructor(parent) {
    this.element = parent.createChild('div', 'perfmon-control-pane');

    this._enabledChartsSetting =
        Common.settings.createSetting('perfmonActiveIndicators2', ['TaskDuration', 'JSHeapTotalSize', 'Nodes']);
    /** @type {!Set<string>} */
    this._enabledCharts = new Set(this._enabledChartsSetting.get());
    var format = Timeline.PerformanceMonitor.Format;

    /** @type {!Array<!Timeline.PerformanceMonitor.ChartInfo>} */
    this._chartsInfo = [
      {
        title: Common.UIString('CPU usage'),
        metrics: [
          {name: 'TaskDuration', color: '#999'}, {name: 'ScriptDuration', color: 'orange'},
          {name: 'LayoutDuration', color: 'blueviolet'}, {name: 'RecalcStyleDuration', color: 'violet'}
        ],
        format: format.Percent,
        smooth: true,
        stacked: true,
        color: 'red',
        max: 1
      },
      {
        title: Common.UIString('JS heap size'),
        metrics: [{name: 'JSHeapTotalSize', color: '#99f'}, {name: 'JSHeapUsedSize', color: 'blue'}],
        format: format.Bytes,
        color: 'blue'
      },
      {title: Common.UIString('DOM Nodes'), metrics: [{name: 'Nodes', color: 'green'}]},
      {title: Common.UIString('JS event listeners'), metrics: [{name: 'JSEventListeners', color: 'yellowgreen'}]},
      {title: Common.UIString('Documents'), metrics: [{name: 'Documents', color: 'darkblue'}]},
      {title: Common.UIString('Frames'), metrics: [{name: 'Frames', color: 'darkcyan'}]},
      {title: Common.UIString('Layouts / sec'), metrics: [{name: 'LayoutCount', color: 'hotpink'}]},
      {title: Common.UIString('Style recalcs / sec'), metrics: [{name: 'RecalcStyleCount', color: 'deeppink'}]}
    ];
    for (var info of this._chartsInfo) {
      for (var metric of info.metrics)
        metric.color = UI.themeSupport.patchColorText(metric.color, UI.ThemeSupport.ColorUsage.Foreground);
    }

    /** @type {!Map<string, !Timeline.PerformanceMonitor.MetricIndicator>} */
    this._indicators = new Map();
    for (var chartInfo of this._chartsInfo) {
      var chartName = chartInfo.metrics[0].name;
      var active = this._enabledCharts.has(chartName);
      var indicator = new Timeline.PerformanceMonitor.MetricIndicator(
          this.element, chartInfo, active, this._onToggle.bind(this, chartName));
      this._indicators.set(chartName, indicator);
    }
  }

  /**
   * @param {string} chartName
   * @param {boolean} active
   */
  _onToggle(chartName, active) {
    if (active)
      this._enabledCharts.add(chartName);
    else
      this._enabledCharts.delete(chartName);
    this._enabledChartsSetting.set(Array.from(this._enabledCharts));
  }

  /**
   * @return {!Array<!Timeline.PerformanceMonitor.ChartInfo>}
   */
  charts() {
    return this._chartsInfo;
  }

  /**
   * @param {string} metricName
   * @return {boolean}
   */
  isActive(metricName) {
    return this._enabledCharts.has(metricName);
  }

  /**
   * @param {!Map<string, number>} metrics
   */
  updateMetrics(metrics) {
    for (var name of this._indicators.keys()) {
      if (metrics.has(name))
        this._indicators.get(name).setValue(metrics.get(name));
    }
  }
};

Timeline.PerformanceMonitor.MetricIndicator = class {
  /**
   * @param {!Element} parent
   * @param {!Timeline.PerformanceMonitor.ChartInfo} info
   * @param {boolean} active
   * @param {function(boolean)} onToggle
   */
  constructor(parent, info, active, onToggle) {
    var color = info.color || info.metrics[0].color;
    this._info = info;
    this._active = active;
    this._onToggle = onToggle;
    this.element = parent.createChild('div', 'perfmon-indicator');
    this._swatchElement = this.element.createChild('div', 'perfmon-indicator-swatch');
    this._swatchElement.style.borderColor = color;
    this.element.createChild('div', 'perfmon-indicator-title').textContent = info.title;
    this._valueElement = this.element.createChild('div', 'perfmon-indicator-value');
    this._valueElement.style.color = color;
    this.element.addEventListener('click', () => this._toggleIndicator());
    this.element.classList.toggle('active', active);
  }

  /**
   * @param {number} value
   * @param {!Timeline.PerformanceMonitor.ChartInfo} info
   * @return {string}
   */
  static _formatNumber(value, info) {
    switch (info.format) {
      case Timeline.PerformanceMonitor.Format.Percent:
        return value.toLocaleString('en-US', {maximumFractionDigits: 1, style: 'percent'});
      case Timeline.PerformanceMonitor.Format.Bytes:
        return Common.UIString('%s\xa0MB', (value / 1e6).toLocaleString('en-US', {maximumFractionDigits: 1}));
      default:
        return value.toLocaleString('en-US', {maximumFractionDigits: 1});
    }
  }

  /**
   * @param {number} value
   */
  setValue(value) {
    this._valueElement.textContent = Timeline.PerformanceMonitor.MetricIndicator._formatNumber(value, this._info);
  }

  _toggleIndicator() {
    this._active = !this._active;
    this.element.classList.toggle('active', this._active);
    this._onToggle(this._active);
  }
};

Timeline.PerformanceMonitor.MetricIndicator._format = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1});
