/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @implements {Timeline.TimelineModeView}
 * @unrestricted
 */
Timeline.CountersGraph = class extends UI.VBox {
  /**
   * @param {!Timeline.TimelineModeViewDelegate} delegate
   */
  constructor(delegate) {
    super();
    this.element.id = 'memory-graphs-container';

    this._delegate = delegate;
    this._calculator = new Timeline.CountersGraph.Calculator();

    // Create selectors
    this._infoWidget = new UI.HBox();
    this._infoWidget.element.classList.add('memory-counter-selector-swatches', 'timeline-toolbar-resizer');
    this._infoWidget.show(this.element);

    this._graphsContainer = new UI.VBox();
    this._graphsContainer.show(this.element);
    var canvasWidget = new UI.VBoxWithResizeCallback(this._resize.bind(this));
    canvasWidget.show(this._graphsContainer.element);
    this._createCurrentValuesBar();
    this._canvasContainer = canvasWidget.element;
    this._canvasContainer.id = 'memory-graphs-canvas-container';
    this._canvas = this._canvasContainer.createChild('canvas');
    this._canvas.id = 'memory-counters-graph';

    this._canvasContainer.addEventListener('mouseover', this._onMouseMove.bind(this), true);
    this._canvasContainer.addEventListener('mousemove', this._onMouseMove.bind(this), true);
    this._canvasContainer.addEventListener('mouseleave', this._onMouseLeave.bind(this), true);
    this._canvasContainer.addEventListener('click', this._onClick.bind(this), true);
    // We create extra timeline grid here to reuse its event dividers.
    this._timelineGrid = new PerfUI.TimelineGrid();
    this._canvasContainer.appendChild(this._timelineGrid.dividersElement);

    this._counters = [];
    this._counterUI = [];

    this._countersByName = {};
    this._countersByName['jsHeapSizeUsed'] = this._createCounter(
        Common.UIString('JS Heap'), Common.UIString('JS Heap: %s'), 'hsl(220, 90%, 43%)', Number.bytesToString);
    this._countersByName['documents'] =
        this._createCounter(Common.UIString('Documents'), Common.UIString('Documents: %s'), 'hsl(0, 90%, 43%)');
    this._countersByName['nodes'] =
        this._createCounter(Common.UIString('Nodes'), Common.UIString('Nodes: %s'), 'hsl(120, 90%, 43%)');
    this._countersByName['jsEventListeners'] =
        this._createCounter(Common.UIString('Listeners'), Common.UIString('Listeners: %s'), 'hsl(38, 90%, 43%)');
    this._gpuMemoryCounter = this._createCounter(
        Common.UIString('GPU Memory'), Common.UIString('GPU Memory [KB]: %s'), 'hsl(300, 90%, 43%)',
        Number.bytesToString);
    this._countersByName['gpuMemoryUsedKB'] = this._gpuMemoryCounter;
  }

  /**
   * @override
   * @param {?Timeline.PerformanceModel} model
   */
  setModel(model) {
    this._calculator.setZeroTime(model ? model.timelineModel().minimumRecordTime() : 0);
    for (var i = 0; i < this._counters.length; ++i) {
      this._counters[i].reset();
      this._counterUI[i].reset();
    }
    this.scheduleRefresh();
    if (!model)
      return;
    var events = model.timelineModel().mainThreadEvents();
    for (var i = 0; i < events.length; ++i) {
      var event = events[i];
      if (event.name !== TimelineModel.TimelineModel.RecordType.UpdateCounters)
        continue;

      var counters = event.args.data;
      if (!counters)
        return;
      for (var name in counters) {
        var counter = this._countersByName[name];
        if (counter)
          counter.appendSample(event.startTime, counters[name]);
      }

      var gpuMemoryLimitCounterName = 'gpuMemoryLimitKB';
      if (gpuMemoryLimitCounterName in counters)
        this._gpuMemoryCounter.setLimit(counters[gpuMemoryLimitCounterName]);
    }
  }

  _createCurrentValuesBar() {
    this._currentValuesBar = this._graphsContainer.element.createChild('div');
    this._currentValuesBar.id = 'counter-values-bar';
  }

  /**
   * @param {string} uiName
   * @param {string} uiValueTemplate
   * @param {string} color
   * @param {function(number):string=} formatter
   * @return {!Timeline.CountersGraph.Counter}
   */
  _createCounter(uiName, uiValueTemplate, color, formatter) {
    var counter = new Timeline.CountersGraph.Counter();
    this._counters.push(counter);
    this._counterUI.push(
        new Timeline.CountersGraph.CounterUI(this, uiName, uiValueTemplate, color, counter, formatter));
    return counter;
  }

  /**
   * @override
   * @return {!UI.Widget}
   */
  view() {
    return this;
  }

  /**
   * @override
   * @return {?Element}
   */
  resizerElement() {
    return this._infoWidget.element;
  }

  _resize() {
    var parentElement = this._canvas.parentElement;
    this._canvas.width = parentElement.clientWidth * window.devicePixelRatio;
    this._canvas.height = parentElement.clientHeight * window.devicePixelRatio;
    this._calculator.setDisplayWidth(this._canvas.width);
    this.refresh();
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this._calculator.setWindow(startTime, endTime);
    this.scheduleRefresh();
  }

  scheduleRefresh() {
    UI.invokeOnceAfterBatchUpdate(this, this.refresh);
  }

  draw() {
    for (var i = 0; i < this._counters.length; ++i) {
      this._counters[i]._calculateVisibleIndexes(this._calculator);
      this._counters[i]._calculateXValues(this._canvas.width);
    }
    this._clear();

    for (var i = 0; i < this._counterUI.length; i++)
      this._counterUI[i]._drawGraph(this._canvas);
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    var x = event.x - this._canvasContainer.totalOffsetLeft();
    var minDistance = Infinity;
    var bestTime;
    for (var i = 0; i < this._counterUI.length; ++i) {
      var counterUI = this._counterUI[i];
      if (!counterUI.counter.times.length)
        continue;
      var index = counterUI._recordIndexAt(x);
      var distance = Math.abs(x * window.devicePixelRatio - counterUI.counter.x[index]);
      if (distance < minDistance) {
        minDistance = distance;
        bestTime = counterUI.counter.times[index];
      }
    }
    if (bestTime !== undefined)
      this._delegate.selectEntryAtTime(bestTime);
  }

  /**
   * @param {!Event} event
   */
  _onMouseLeave(event) {
    delete this._markerXPosition;
    this._clearCurrentValueAndMarker();
  }

  _clearCurrentValueAndMarker() {
    for (var i = 0; i < this._counterUI.length; i++)
      this._counterUI[i]._clearCurrentValueAndMarker();
  }

  /**
   * @param {!Event} event
   */
  _onMouseMove(event) {
    var x = event.x - this._canvasContainer.totalOffsetLeft();
    this._markerXPosition = x;
    this._refreshCurrentValues();
  }

  _refreshCurrentValues() {
    if (this._markerXPosition === undefined)
      return;
    for (var i = 0; i < this._counterUI.length; ++i)
      this._counterUI[i].updateCurrentValue(this._markerXPosition);
  }

  refresh() {
    this._timelineGrid.updateDividers(this._calculator);
    this.draw();
    this._refreshCurrentValues();
  }

  _clear() {
    var ctx = this._canvas.getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * @override
   * @param {?SDK.TracingModel.Event} event
   */
  highlightEvent(event) {
  }

  /**
   * @override
   * @param {?Timeline.TimelineSelection} selection
   */
  setSelection(selection) {
  }
};

/**
 * @unrestricted
 */
Timeline.CountersGraph.Counter = class {
  constructor() {
    this.times = [];
    this.values = [];
  }

  /**
   * @param {number} time
   * @param {number} value
   */
  appendSample(time, value) {
    if (this.values.length && this.values.peekLast() === value)
      return;
    this.times.push(time);
    this.values.push(value);
  }

  reset() {
    this.times = [];
    this.values = [];
  }

  /**
   * @param {number} value
   */
  setLimit(value) {
    this._limitValue = value;
  }

  /**
   * @return {!{min: number, max: number}}
   */
  _calculateBounds() {
    var maxValue;
    var minValue;
    for (var i = this._minimumIndex; i <= this._maximumIndex; i++) {
      var value = this.values[i];
      if (minValue === undefined || value < minValue)
        minValue = value;
      if (maxValue === undefined || value > maxValue)
        maxValue = value;
    }
    minValue = minValue || 0;
    maxValue = maxValue || 1;
    if (this._limitValue) {
      if (maxValue > this._limitValue * 0.5)
        maxValue = Math.max(maxValue, this._limitValue);
      minValue = Math.min(minValue, this._limitValue);
    }
    return {min: minValue, max: maxValue};
  }

  /**
   * @param {!Timeline.CountersGraph.Calculator} calculator
   */
  _calculateVisibleIndexes(calculator) {
    var start = calculator.minimumBoundary();
    var end = calculator.maximumBoundary();

    // Maximum index of element whose time <= start.
    this._minimumIndex = Number.constrain(this.times.upperBound(start) - 1, 0, this.times.length - 1);

    // Minimum index of element whose time >= end.
    this._maximumIndex = Number.constrain(this.times.lowerBound(end), 0, this.times.length - 1);

    // Current window bounds.
    this._minTime = start;
    this._maxTime = end;
  }

  /**
   * @param {number} width
   */
  _calculateXValues(width) {
    if (!this.values.length)
      return;

    var xFactor = width / (this._maxTime - this._minTime);

    this.x = new Array(this.values.length);
    for (var i = this._minimumIndex + 1; i <= this._maximumIndex; i++)
      this.x[i] = xFactor * (this.times[i] - this._minTime);
  }
};

/**
 * @unrestricted
 */
Timeline.CountersGraph.CounterUI = class {
  /**
   * @param {!Timeline.CountersGraph} countersPane
   * @param {string} title
   * @param {string} currentValueLabel
   * @param {string} graphColor
   * @param {!Timeline.CountersGraph.Counter} counter
   * @param {(function(number): string)|undefined} formatter
   */
  constructor(countersPane, title, currentValueLabel, graphColor, counter, formatter) {
    this._countersPane = countersPane;
    this.counter = counter;
    this._formatter = formatter || Number.withThousandsSeparator;
    var container = countersPane._infoWidget.element.createChild('div', 'memory-counter-selector-info');

    this._setting = Common.settings.createSetting('timelineCountersGraph-' + title, true);
    this._setting.setTitle(title);
    this._filter = new UI.ToolbarSettingCheckbox(this._setting, title);
    this._filter.inputElement.classList.add('-theme-preserve');
    var color = Common.Color.parse(graphColor).setAlpha(0.5).asString(Common.Color.Format.RGBA);
    if (color) {
      this._filter.element.backgroundColor = color;
      this._filter.element.borderColor = 'transparent';
    }
    this._filter.inputElement.addEventListener('click', this._toggleCounterGraph.bind(this));
    container.appendChild(this._filter.element);
    this._range = this._filter.element.createChild('span', 'range');

    this._value = countersPane._currentValuesBar.createChild('span', 'memory-counter-value');
    this._value.style.color = graphColor;
    this.graphColor = graphColor;
    this.limitColor = Common.Color.parse(graphColor).setAlpha(0.3).asString(Common.Color.Format.RGBA);
    this.graphYValues = [];
    this._verticalPadding = 10;

    this._currentValueLabel = currentValueLabel;
    this._marker = countersPane._canvasContainer.createChild('div', 'memory-counter-marker');
    this._marker.style.backgroundColor = graphColor;
    this._clearCurrentValueAndMarker();
  }

  reset() {
    this._range.textContent = '';
  }

  /**
   * @param {number} minValue
   * @param {number} maxValue
   */
  setRange(minValue, maxValue) {
    var min = this._formatter(minValue);
    var max = this._formatter(maxValue);
    this._range.textContent = Common.UIString('[%s\u2009\u2013\u2009%s]', min, max);
  }

  /**
   * @param {!Common.Event} event
   */
  _toggleCounterGraph(event) {
    this._value.classList.toggle('hidden', !this._filter.checked());
    this._countersPane.refresh();
  }

  /**
   * @param {number} x
   * @return {number}
   */
  _recordIndexAt(x) {
    return this.counter.x.upperBound(
               x * window.devicePixelRatio, null, this.counter._minimumIndex + 1, this.counter._maximumIndex + 1) -
        1;
  }

  /**
   * @param {number} x
   */
  updateCurrentValue(x) {
    if (!this.visible() || !this.counter.values.length || !this.counter.x)
      return;
    var index = this._recordIndexAt(x);
    var value = Number.withThousandsSeparator(this.counter.values[index]);
    this._value.textContent = Common.UIString(this._currentValueLabel, value);
    var y = this.graphYValues[index] / window.devicePixelRatio;
    this._marker.style.left = x + 'px';
    this._marker.style.top = y + 'px';
    this._marker.classList.remove('hidden');
  }

  _clearCurrentValueAndMarker() {
    this._value.textContent = '';
    this._marker.classList.add('hidden');
  }

  /**
   * @param {!HTMLCanvasElement} canvas
   */
  _drawGraph(canvas) {
    var ctx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height - 2 * this._verticalPadding;
    if (height <= 0) {
      this.graphYValues = [];
      return;
    }
    var originY = this._verticalPadding;
    var counter = this.counter;
    var values = counter.values;

    if (!values.length)
      return;

    var bounds = counter._calculateBounds();
    var minValue = bounds.min;
    var maxValue = bounds.max;
    this.setRange(minValue, maxValue);

    if (!this.visible())
      return;

    var yValues = this.graphYValues;
    var maxYRange = maxValue - minValue;
    var yFactor = maxYRange ? height / (maxYRange) : 1;

    ctx.save();
    ctx.lineWidth = window.devicePixelRatio;
    if (ctx.lineWidth % 2)
      ctx.translate(0.5, 0.5);
    ctx.beginPath();
    var value = values[counter._minimumIndex];
    var currentY = Math.round(originY + height - (value - minValue) * yFactor);
    ctx.moveTo(0, currentY);
    for (var i = counter._minimumIndex; i <= counter._maximumIndex; i++) {
      var x = Math.round(counter.x[i]);
      ctx.lineTo(x, currentY);
      var currentValue = values[i];
      if (typeof currentValue !== 'undefined')
        value = currentValue;
      currentY = Math.round(originY + height - (value - minValue) * yFactor);
      ctx.lineTo(x, currentY);
      yValues[i] = currentY;
    }
    yValues.length = i;
    ctx.lineTo(width, currentY);
    ctx.strokeStyle = this.graphColor;
    ctx.stroke();
    if (counter._limitValue) {
      var limitLineY = Math.round(originY + height - (counter._limitValue - minValue) * yFactor);
      ctx.moveTo(0, limitLineY);
      ctx.lineTo(width, limitLineY);
      ctx.strokeStyle = this.limitColor;
      ctx.stroke();
    }
    ctx.closePath();
    ctx.restore();
  }

  /**
   * @return {boolean}
   */
  visible() {
    return this._filter.checked();
  }
};

/**
 * @implements {PerfUI.TimelineGrid.Calculator}
 * @unrestricted
 */
Timeline.CountersGraph.Calculator = class {
  /**
   * @param {number} time
   */
  setZeroTime(time) {
    this._zeroTime = time;
  }


  /**
   * @override
   * @param {number} time
   * @return {number}
   */
  computePosition(time) {
    return (time - this._minimumBoundary) / this.boundarySpan() * this._workingArea;
  }

  setWindow(minimumBoundary, maximumBoundary) {
    this._minimumBoundary = minimumBoundary;
    this._maximumBoundary = maximumBoundary;
  }

  /**
   * @param {number} clientWidth
   */
  setDisplayWidth(clientWidth) {
    this._workingArea = clientWidth;
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return Number.preciseMillisToString(value - this.zeroTime(), precision);
  }

  /**
   * @override
   * @return {number}
   */
  maximumBoundary() {
    return this._maximumBoundary;
  }

  /**
   * @override
   * @return {number}
   */
  minimumBoundary() {
    return this._minimumBoundary;
  }

  /**
   * @override
   * @return {number}
   */
  zeroTime() {
    return this._zeroTime;
  }

  /**
   * @override
   * @return {number}
   */
  boundarySpan() {
    return this._maximumBoundary - this._minimumBoundary;
  }
};
