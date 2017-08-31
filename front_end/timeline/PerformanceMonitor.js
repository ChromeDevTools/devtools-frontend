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
    this._gridColor = 'rgba(0, 0, 0, 0.08)';
    this._controlPane = new Timeline.PerformanceMonitor.ControlPane(this.contentElement);
    this._canvas = /** @type {!HTMLCanvasElement} */ (this.contentElement.createChild('canvas'));
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
      var info = this._controlPane.metricInfo(metric.name);
      var value;
      switch (info.mode) {
        case Timeline.PerformanceMonitor.Mode.CumulativeTime:
          value = info.lastTimestamp ?
              Number.constrain((metric.value - info.lastValue) * 1000 / (timestamp - info.lastTimestamp), 0, 1) :
              0;
          info.lastValue = metric.value;
          info.lastTimestamp = timestamp;
          break;
        case Timeline.PerformanceMonitor.Mode.CumulativeCount:
          value = info.lastTimestamp ?
              Math.max(0, (metric.value - info.lastValue) * 1000 / (timestamp - info.lastTimestamp)) :
              0;
          info.lastValue = metric.value;
          info.lastTimestamp = timestamp;
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
    /** @type {!Map<symbol, !Array<string>>} */
    var charts = new Map();
    for (var metricName of this._controlPane.metrics()) {
      if (!this._controlPane.isActive(metricName))
        continue;
      var chartId = this._controlPane.metricInfo(metricName).chartId || Symbol('Chart');
      if (!charts.has(chartId))
        charts.set(chartId, []);
      charts.get(chartId).push(metricName);
    }

    var graphHeight = 90;
    var ctx = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, this._width, this._height);
    this._drawHorizontalGrid(ctx);
    ctx.translate(0, 16);  // Reserve space for the scale bar.
    for (var metrics of charts.values()) {
      this._drawChart(ctx, metrics, graphHeight);
      ctx.translate(0, graphHeight);
    }
    ctx.restore();
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   */
  _drawHorizontalGrid(ctx) {
    var lightGray = 'rgba(0, 0, 0, 0.02)';
    ctx.font = '9px ' + Host.fontFamily();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
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
   * @param {!Array<string>} metrics
   * @param {number} height
   */
  _drawChart(ctx, metrics, height) {
    ctx.save();
    ctx.rect(0, 0, this._width, height);
    ctx.clip();
    var bottomPadding = 8;
    var extraSpace = 1.05;
    var max = this._calcMax(metrics) * extraSpace;
    var info = this._controlPane.metricInfo(metrics[0]);
    this._drawVerticalGrid(ctx, height - bottomPadding, max, info);
    for (var metricName of metrics) {
      if (!this._controlPane.isActive(metricName))
        continue;
      this._drawMetric(ctx, metricName, height - bottomPadding, max);
    }
    ctx.beginPath();
    ctx.moveTo(0, height - bottomPadding + 0.5);
    ctx.lineTo(this._width, height - bottomPadding + 0.5);
    ctx.strokeStyle = 'hsla(0, 0%, 0%, 0.3)';
    ctx.stroke();
    ctx.restore();
  }

  /**
   * @param {!Array<string>} metricNames
   * @return {number}
   */
  _calcMax(metricNames) {
    var width = this._width;
    var startTime = performance.now() - this._pollIntervalMs - width / this._pixelsPerMs;
    var max = -Infinity;
    for (var metricName of metricNames) {
      var info = this._controlPane.metricInfo(metricName);
      if (typeof info.max === 'number')
        return info.max;
      for (var i = this._metricsBuffer.length - 1; i >= 0; --i) {
        var metrics = this._metricsBuffer[i];
        var value = metrics.metrics.get(metricName);
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
    info.currentMax = max * alpha + (info.currentMax || max) * (1 - alpha);
    return info.currentMax;
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   * @param {number} height
   * @param {number} max
   * @param {!Timeline.PerformanceMonitor.Info} info
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
    for (var i = 0; i < 2; ++i) {
      var y = calcY(scaleValue);
      var labelText = Timeline.PerformanceMonitor.MetricIndicator._formatNumber(scaleValue, info);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(4, y);
      ctx.moveTo(ctx.measureText(labelText).width + 12, y);
      ctx.lineTo(this._width, y);
      ctx.strokeStyle = this._gridColor;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.stroke();
      ctx.fillText(labelText, 8, calcY(scaleValue) + 3);
      scaleValue /= 2;
    }
    /**
     * @param {number} value
     * @return {number}
     */
    function calcY(value) {
      return Math.round(height - visibleHeight * value / span) + 0.5;
    }
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   * @param {string} metricName
   * @param {number} height
   * @param {number} scaleMax
   */
  _drawMetric(ctx, metricName, height, scaleMax) {
    var topPadding = 5;
    var visibleHeight = height - topPadding;
    if (visibleHeight < 1)
      return;
    ctx.save();
    var span = scaleMax;
    var info = this._controlPane.metricInfo(metricName);
    var pixelsPerMs = this._pixelsPerMs;
    var startTime = performance.now() - this._pollIntervalMs - this._width / pixelsPerMs;
    var smooth = info.mode === Timeline.PerformanceMonitor.Mode.CumulativeTime;

    ctx.beginPath();
    ctx.moveTo(this._width + 5, calcY(0));
    var x = 0;
    var lastY = 0;
    var lastX = 0;
    if (this._metricsBuffer.length) {
      lastY = calcY(this._metricsBuffer.peekLast().metrics.get(metricName));
      lastX = this._width + 5;
      ctx.lineTo(lastX, lastY);
    }
    for (var i = this._metricsBuffer.length - 1; i >= 0; --i) {
      var metrics = this._metricsBuffer[i];
      var y = calcY(metrics.metrics.get(metricName));
      x = (metrics.timestamp - startTime) * pixelsPerMs;
      if (smooth) {
        var midX = (lastX + x) / 2;
        ctx.bezierCurveTo(midX, lastY, midX, y, x, y);
      } else {
        ctx.lineTo(x, lastY);
        ctx.lineTo(x, y);
      }
      lastX = x;
      lastY = y;
      if (metrics.timestamp < startTime)
        break;
    }
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.lineTo(x, calcY(0));
    ctx.fillStyle = info.color;
    ctx.globalAlpha = 0.02;
    ctx.fill();
    ctx.restore();

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
Timeline.PerformanceMonitor.Mode = {
  CumulativeTime: Symbol('CumulativeTime'),
  CumulativeCount: Symbol('CumulativeCount'),
};

/** @enum {symbol} */
Timeline.PerformanceMonitor.Format = {
  Percent: Symbol('Percent'),
  Bytes: Symbol('Bytes'),
};

/** @enum {symbol} */
Timeline.PerformanceMonitor.ChartId = {
  CPU: Symbol('CPU'),
  Memory: Symbol('Memory'),
};

/**
 * @typedef {!{
 *   title: string,
 *   color: string,
 *   mode: (!Timeline.PerformanceMonitor.Mode|undefined),
 *   max: (number|undefined),
 *   currentMax: (number|undefined),
 *   format: (!Timeline.PerformanceMonitor.Format|undefined),
 *   chartId: (!Timeline.PerformanceMonitor.ChartId|undefined)
 * }}
 */
Timeline.PerformanceMonitor.Info;

Timeline.PerformanceMonitor.ControlPane = class {
  /**
   * @param {!Element} parent
   */
  constructor(parent) {
    this.element = parent.createChild('div', 'perfmon-control-pane');

    this._enabledMetricsSetting = Common.settings.createSetting('perfmonActiveIndicators2', [
      'TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'JSHeapTotalSize', 'JSHeapUsedSize',
      'NodeCount'
    ]);
    /** @type {!Set<string>} */
    this._enabledMetrics = new Set(this._enabledMetricsSetting.get());
    var mode = Timeline.PerformanceMonitor.Mode;
    var format = Timeline.PerformanceMonitor.Format;
    var chartId = Timeline.PerformanceMonitor.ChartId;
    /** @type {!Map<string, !Timeline.PerformanceMonitor.Info>} */
    this._metricsInfo = new Map([
      [
        'TaskDuration', {
          title: Common.UIString('CPU utilization'),
          color: 'red',
          mode: mode.CumulativeTime,
          format: format.Percent,
          chartId: chartId.CPU,
          max: 1
        }
      ],
      [
        'ScriptDuration', {
          title: Common.UIString('Script duration'),
          color: 'orange',
          mode: mode.CumulativeTime,
          format: format.Percent,
          chartId: chartId.CPU,
          max: 1
        }
      ],
      [
        'LayoutDuration', {
          title: Common.UIString('Layout duration'),
          color: 'magenta',
          mode: mode.CumulativeTime,
          format: format.Percent,
          chartId: chartId.CPU,
          max: 1
        }
      ],
      [
        'RecalcStyleDuration', {
          title: Common.UIString('Style recalc duration'),
          color: 'violet',
          mode: mode.CumulativeTime,
          format: format.Percent,
          chartId: chartId.CPU,
          max: 1
        }
      ],
      [
        'JSHeapTotalSize', {
          title: Common.UIString('Total JS heap size'),
          format: format.Bytes,
          chartId: chartId.Memory,
          color: 'royalblue'
        }
      ],
      [
        'JSHeapUsedSize',
        {title: Common.UIString('Used JS heap size'), format: format.Bytes, chartId: chartId.Memory, color: 'blue'}
      ],
      ['NodeCount', {title: Common.UIString('DOM Nodes'), color: 'green'}],
      ['JSEventListenerCount', {title: Common.UIString('JS event listeners'), color: 'yellowgreen'}],
      ['DocumentCount', {title: Common.UIString('Documents'), color: 'darkblue'}],
      ['FrameCount', {title: Common.UIString('Frames'), color: 'darkcyan'}],
      ['LayoutCount', {title: Common.UIString('Layouts / sec'), color: 'hotpink', mode: mode.CumulativeCount}],
      [
        'RecalcStyleCount',
        {title: Common.UIString('Style recalcs / sec'), color: 'deeppink', mode: mode.CumulativeCount}
      ],
    ]);

    this._indicators = new Map();
    for (var metricName of this._metricsInfo.keys()) {
      var info = this._metricsInfo.get(metricName);
      var active = this._enabledMetrics.has(metricName);
      var indicator = new Timeline.PerformanceMonitor.MetricIndicator(
          this.element, info, active, this._onToggle.bind(this, metricName));
      this._indicators.set(metricName, indicator);
    }
  }

  /**
   * @param {string} metricName
   * @param {boolean} active
   */
  _onToggle(metricName, active) {
    if (active)
      this._enabledMetrics.add(metricName);
    else
      this._enabledMetrics.delete(metricName);
    this._enabledMetricsSetting.set(Array.from(this._enabledMetrics));
  }

  /**
   * @return {!IteratorIterable<string>}
   */
  metrics() {
    return this._metricsInfo.keys();
  }

  /**
   * @param {string} metricName
   * @return {!Timeline.PerformanceMonitor.Info}
   */
  metricInfo(metricName) {
    return this._metricsInfo.get(metricName) || {};
  }

  /**
   * @param {string} metricName
   * @return {boolean}
   */
  isActive(metricName) {
    return this._enabledMetrics.has(metricName);
  }

  /**
   * @param {!Map<string, number>} metrics
   */
  updateMetrics(metrics) {
    for (const [name, indicator] of this._indicators) {
      if (metrics.has(name))
        indicator.setValue(metrics.get(name));
    }
  }
};

Timeline.PerformanceMonitor.MetricIndicator = class {
  /**
   * @param {!Element} parent
   * @param {!Timeline.PerformanceMonitor.Info} info
   * @param {boolean} active
   * @param {function(boolean)} onToggle
   */
  constructor(parent, info, active, onToggle) {
    this._info = info;
    this._active = active;
    this._onToggle = onToggle;
    this.element = parent.createChild('div', 'perfmon-indicator');
    this._swatchElement = this.element.createChild('div', 'perfmon-indicator-swatch');
    this._swatchElement.style.borderColor = info.color;
    this.element.createChild('div', 'perfmon-indicator-title').textContent = info.title;
    this._valueElement = this.element.createChild('div', 'perfmon-indicator-value');
    this._valueElement.style.color = info.color;
    this.element.addEventListener('click', () => this._toggleIndicator());
    this.element.classList.toggle('active', active);
  }

  /**
   * @param {number} value
   * @param {!Timeline.PerformanceMonitor.Info} info
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
