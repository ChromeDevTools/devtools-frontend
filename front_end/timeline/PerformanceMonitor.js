// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Timeline.PerformanceMonitor = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('timeline/performanceMonitor.css');
    this._model = SDK.targetManager.mainTarget().model(SDK.PerformanceMetricsModel);
    this._canvas = /** @type {!HTMLCanvasElement} */ (this.contentElement.createChild('canvas'));
    /** @type {!Array<!{timestamp: number, metrics: !Map<string, number>}>} */
    this._metricsBuffer = [];
    /** @const */
    this._pixelsPerMs = 20 / 1000;
    /** @const */
    this._pollIntervalMs = 500;
    /** @type {!Array<string>} */
    this._enabledMetrics = ['NodeCount', 'ScriptDuration', 'TaskDuration'];
    /** @type {!Map<string, !Timeline.PerformanceMonitor.Info>} */
    this._metricsInfo = new Map([
      [
        'TaskDuration', {
          title: Common.UIString('CPU Utilization'),
          color: 'red',
          mode: Timeline.PerformanceMonitor.Mode.CumulativeTime,
          min: 0,
          max: 100,
          format: formatPercent
        }
      ],
      [
        'ScriptDuration', {
          title: Common.UIString('Script Execution'),
          color: 'orange',
          mode: Timeline.PerformanceMonitor.Mode.CumulativeTime,
          min: 0,
          max: 100,
          format: formatPercent
        }
      ],
      ['NodeCount', {title: Common.UIString('DOM Nodes'), color: 'green'}],
      ['JSEventListenerCount', {title: Common.UIString('JS Event Listeners'), color: 'deeppink'}],
    ]);

    /**
     * @param {number} value
     * @return {string}
     */
    function formatPercent(value) {
      return value.toFixed(0) + '%';
    }
  }

  /**
   * @override
   */
  wasShown() {
    this._model.enable();
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
   * @param {!Array<!Protocol.Performance.Metric>} metrics
   */
  _processMetrics(metrics) {
    var metricsMap = new Map();
    var timestamp = Date.now();
    for (var metric of metrics) {
      var info = this._metricInfo(metric.name);
      var value;
      if (info.mode === Timeline.PerformanceMonitor.Mode.CumulativeTime) {
        value = info.lastTimestamp ?
            100 * Math.min(1, (metric.value - info.lastValue) * 1000 / (timestamp - info.lastTimestamp)) :
            0;
        info.lastValue = metric.value;
        info.lastTimestamp = timestamp;
      } else {
        value = metric.value;
      }
      metricsMap.set(metric.name, value);
    }
    this._metricsBuffer.push({timestamp, metrics: metricsMap});
    var millisPerWidth = this._width / this._pixelsPerMs;
    // Multiply by 2 as the pollInterval has some jitter and to have some extra samples if window is resized.
    var maxCount = Math.ceil(millisPerWidth / this._pollIntervalMs * 2);
    if (this._metricsBuffer.length > maxCount * 2)  // Multiply by 2 to have a hysteresis.
      this._metricsBuffer.splice(0, this._metricsBuffer.length - maxCount);
  }

  /**
   * @param {string} name
   * @return {!Timeline.PerformanceMonitor.Info}
   */
  _metricInfo(name) {
    if (!this._metricsInfo.has(name))
      this._metricsInfo.set(name, {title: name, color: 'grey'});
    return this._metricsInfo.get(name);
  }

  _draw() {
    var ctx = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, this._width, this._height);
    this._drawGrid(ctx);
    for (var metricName of this._enabledMetrics)
      this._drawMetric(ctx, metricName);
    this._drawLegend(ctx);
    ctx.restore();
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   */
  _drawGrid(ctx) {
    ctx.font = '10px ' + Host.fontFamily();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (var sec = 0;; ++sec) {
      var x = this._width - sec * this._pixelsPerMs * 1000;
      if (x < 0)
        break;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, this._height);
      if (sec % 5 === 0)
        ctx.fillText(Common.UIString('%d sec', sec), Math.round(x) + 4, 12);
      ctx.strokeStyle = sec % 5 ? 'hsla(0, 0%, 0%, 0.02)' : 'hsla(0, 0%, 0%, 0.08)';
      ctx.stroke();
    }
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   * @param {string} metricName
   */
  _drawMetric(ctx, metricName) {
    ctx.save();
    var width = this._width;
    var height = this._height;
    var startTime = Date.now() - this._pollIntervalMs * 2 - width / this._pixelsPerMs;
    var info = this._metricInfo(metricName);
    var min = Infinity;
    var max = -Infinity;
    var pixelsPerMs = this._pixelsPerMs;
    if (info.min || info.max) {
      min = info.min;
      max = info.max;
    } else {
      for (var i = this._metricsBuffer.length - 1; i >= 0; --i) {
        var metrics = this._metricsBuffer[i];
        var value = metrics.metrics.get(metricName);
        min = Math.min(min, value);
        max = Math.max(max, value);
        if (metrics.timestamp < startTime)
          break;
      }
      if (isFinite(min) && isFinite(max)) {
        var alpha = 0.1;
        info.currentMin = min * alpha + (info.currentMin || min) * (1 - alpha);
        info.currentMax = max * alpha + (info.currentMax || max) * (1 - alpha);
        min = info.currentMin;
        max = info.currentMax;
      }
    }
    var span = 1.15 * (max - min) || 1;
    ctx.beginPath();
    ctx.moveTo(width + 5, height + 5);
    var x = 0;
    var lastY = 0;
    var lastX = 0;
    if (this._metricsBuffer.length) {
      lastY = calcY(this._metricsBuffer.peekLast().metrics.get(metricName));
      lastX = width + 5;
      ctx.lineTo(lastX, lastY);
    }
    for (var i = this._metricsBuffer.length - 1; i >= 0; --i) {
      var metrics = this._metricsBuffer[i];
      var y = calcY(metrics.metrics.get(metricName));
      x = (metrics.timestamp - startTime) * pixelsPerMs;
      var midX = (lastX + x) / 2;
      ctx.bezierCurveTo(midX, lastY, midX, y, x, y);
      lastX = x;
      lastY = y;
      if (metrics.timestamp < startTime)
        break;
    }
    ctx.lineTo(x, height + 5);
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = info.color;
    ctx.fill();
    ctx.restore();

    /**
     * @param {number} value
     * @return {number}
     */
    function calcY(value) {
      return Math.round(height - 5 - height * (value - min) / span) + 0.5;
    }
  }

  /**
   * @param {!CanvasRenderingContext2D} ctx
   */
  _drawLegend(ctx) {
    ctx.save();
    ctx.font = '12px ' + Host.fontFamily();
    ctx.textBaseline = 'middle';
    var topMargin = 20;
    var leftMargin = 10;
    var padding = 14;
    var intervalPx = 18;
    var textColor = '#333';
    var swatchSize = 10;
    var valueWidth = 40;  // Use a fixed number to avoid box resizing when values change.
    var numberFormat = new Intl.NumberFormat('en-US');
    var maxTitleWidth = this._enabledMetrics.reduce(
        (acc, metric) => Math.max(acc, ctx.measureText(this._metricInfo(metric).title).width), 0);
    var titleX = leftMargin + padding + swatchSize * 2;
    ctx.fillStyle = 'hsla(0, 0%, 100%, 0.8)';
    ctx.fillRect(
        leftMargin, topMargin, titleX + maxTitleWidth + valueWidth + padding,
        (this._enabledMetrics.length - 1) * intervalPx + 2 * padding);
    for (var i = 0; i < this._enabledMetrics.length; ++i) {
      var metricName = this._enabledMetrics[i];
      var info = this._metricInfo(metricName);
      var lineY = i * intervalPx + topMargin + padding;
      ctx.fillStyle = textColor;
      ctx.fillText(info.title || metricName, titleX, lineY);
      ctx.fillStyle = info.color;
      ctx.fillRect(leftMargin + padding, lineY - swatchSize / 2, swatchSize, swatchSize);
      if (this._metricsBuffer.length) {
        var format = info.format || (value => numberFormat.format(value));
        var value = this._metricsBuffer.peekLast().metrics.get(metricName) || 0;
        ctx.fillText(format(value), titleX + maxTitleWidth + padding, lineY);
      }
    }
    ctx.restore();
  }

  /**
   * @override
   */
  onResize() {
    super.onResize();
    this._width = this._canvas.offsetWidth * window.devicePixelRatio;
    this._height = this._canvas.offsetHeight * window.devicePixelRatio;
    this._canvas.width = this._width;
    this._canvas.height = this._height;
    this._draw();
  }
};

/** @enum {symbol} */
Timeline.PerformanceMonitor.Mode = {
  CumulativeTime: Symbol('CumulativeTime')
};

/**
 * @typedef {!{
 *   title: string,
 *   color: string,
 *   mode: (!Timeline.PerformanceMonitor.Mode|undefined),
 *   min: (number|undefined),
 *   max: (number|undefined),
 *   currentMin: (number|undefined),
 *   currentMax: (number|undefined),
 *   format: (function(number):string|undefined)
 * }}
 */
Timeline.PerformanceMonitor.Info;
