/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
 * @unrestricted
 */
Timeline.TimelineEventOverview = class extends PerfUI.TimelineOverviewBase {
  /**
   * @param {string} id
   * @param {?string} title
   */
  constructor(id, title) {
    super();
    this.element.id = 'timeline-overview-' + id;
    this.element.classList.add('overview-strip');
    /** @type {?Timeline.PerformanceModel} */
    this._model = null;
    if (title)
      this.element.createChild('div', 'timeline-overview-strip-title').textContent = title;
  }

  /**
   * @param {?Timeline.PerformanceModel} model
   */
  setModel(model) {
    this._model = model;
  }

  /**
   * @param {number} begin
   * @param {number} end
   * @param {number} position
   * @param {number} height
   * @param {string} color
   */
  _renderBar(begin, end, position, height, color) {
    var x = begin;
    var width = end - begin;
    var ctx = this.context();
    ctx.fillStyle = color;
    ctx.fillRect(x, position, width, height);
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineEventOverviewInput = class extends Timeline.TimelineEventOverview {
  constructor() {
    super('input', null);
  }

  /**
   * @override
   */
  update() {
    super.update();
    if (!this._model)
      return;
    var events = this._model.timelineModel().mainThreadEvents();
    var height = this.height();
    var descriptors = Timeline.TimelineUIUtils.eventDispatchDesciptors();
    /** @type {!Map.<string,!Timeline.TimelineUIUtils.EventDispatchTypeDescriptor>} */
    var descriptorsByType = new Map();
    var maxPriority = -1;
    for (var descriptor of descriptors) {
      for (var type of descriptor.eventTypes)
        descriptorsByType.set(type, descriptor);
      maxPriority = Math.max(maxPriority, descriptor.priority);
    }

    var /** @const */ minWidth = 2 * window.devicePixelRatio;
    var timeOffset = this._model.timelineModel().minimumRecordTime();
    var timeSpan = this._model.timelineModel().maximumRecordTime() - timeOffset;
    var canvasWidth = this.width();
    var scale = canvasWidth / timeSpan;

    for (var priority = 0; priority <= maxPriority; ++priority) {
      for (var i = 0; i < events.length; ++i) {
        var event = events[i];
        if (event.name !== TimelineModel.TimelineModel.RecordType.EventDispatch)
          continue;
        var descriptor = descriptorsByType.get(event.args['data']['type']);
        if (!descriptor || descriptor.priority !== priority)
          continue;
        var start = Number.constrain(Math.floor((event.startTime - timeOffset) * scale), 0, canvasWidth);
        var end = Number.constrain(Math.ceil((event.endTime - timeOffset) * scale), 0, canvasWidth);
        var width = Math.max(end - start, minWidth);
        this._renderBar(start, start + width, 0, height, descriptor.color);
      }
    }
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineEventOverviewNetwork = class extends Timeline.TimelineEventOverview {
  constructor() {
    super('network', Common.UIString('NET'));
  }

  /**
   * @override
   */
  update() {
    super.update();
    if (!this._model)
      return;
    var timelineModel = this._model.timelineModel();
    var bandHeight = this.height() / 2;
    var timeOffset = timelineModel.minimumRecordTime();
    var timeSpan = timelineModel.maximumRecordTime() - timeOffset;
    var canvasWidth = this.width();
    var scale = canvasWidth / timeSpan;
    var highPath = new Path2D();
    var lowPath = new Path2D();
    var priorities = Protocol.Network.ResourcePriority;
    var highPrioritySet = new Set([priorities.VeryHigh, priorities.High, priorities.Medium]);
    for (var request of timelineModel.networkRequests()) {
      var path = highPrioritySet.has(request.priority) ? highPath : lowPath;
      var s = Math.max(Math.floor((request.startTime - timeOffset) * scale), 0);
      var e = Math.min(Math.ceil((request.endTime - timeOffset) * scale + 1), canvasWidth);
      path.rect(s, 0, e - s, bandHeight - 1);
    }
    var ctx = this.context();
    ctx.save();
    ctx.fillStyle = 'hsl(214, 60%, 60%)';
    ctx.fill(/** @type {?} */ (highPath));
    ctx.translate(0, bandHeight);
    ctx.fillStyle = 'hsl(214, 80%, 80%)';
    ctx.fill(/** @type {?} */ (lowPath));
    ctx.restore();
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineEventOverviewCPUActivity = class extends Timeline.TimelineEventOverview {
  constructor() {
    super('cpu-activity', Common.UIString('CPU'));
    this._backgroundCanvas = this.element.createChild('canvas', 'fill background');
  }

  /**
   * @override
   */
  resetCanvas() {
    super.resetCanvas();
    this._backgroundCanvas.width = this.element.clientWidth * window.devicePixelRatio;
    this._backgroundCanvas.height = this.element.clientHeight * window.devicePixelRatio;
  }

  /**
   * @override
   */
  update() {
    super.update();
    if (!this._model)
      return;
    var timelineModel = this._model.timelineModel();
    var /** @const */ quantSizePx = 4 * window.devicePixelRatio;
    var width = this.width();
    var height = this.height();
    var baseLine = height;
    var timeOffset = timelineModel.minimumRecordTime();
    var timeSpan = timelineModel.maximumRecordTime() - timeOffset;
    var scale = width / timeSpan;
    var quantTime = quantSizePx / scale;
    var categories = Timeline.TimelineUIUtils.categories();
    var categoryOrder = ['idle', 'loading', 'painting', 'rendering', 'scripting', 'other'];
    var otherIndex = categoryOrder.indexOf('other');
    var idleIndex = 0;
    console.assert(idleIndex === categoryOrder.indexOf('idle'));
    for (var i = idleIndex + 1; i < categoryOrder.length; ++i)
      categories[categoryOrder[i]]._overviewIndex = i;

    var backgroundContext = this._backgroundCanvas.getContext('2d');
    for (var thread of timelineModel.virtualThreads())
      drawThreadEvents(backgroundContext, thread.events);
    applyPattern(backgroundContext);
    drawThreadEvents(this.context(), timelineModel.mainThreadEvents());

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!Array<!SDK.TracingModel.Event>} events
     */
    function drawThreadEvents(ctx, events) {
      var quantizer = new Timeline.Quantizer(timeOffset, quantTime, drawSample);
      var x = 0;
      var categoryIndexStack = [];
      var paths = [];
      var lastY = [];
      for (var i = 0; i < categoryOrder.length; ++i) {
        paths[i] = new Path2D();
        paths[i].moveTo(0, height);
        lastY[i] = height;
      }

      /**
       * @param {!Array<number>} counters
       */
      function drawSample(counters) {
        var y = baseLine;
        for (var i = idleIndex + 1; i < categoryOrder.length; ++i) {
          var h = (counters[i] || 0) / quantTime * height;
          y -= h;
          paths[i].bezierCurveTo(x, lastY[i], x, y, x + quantSizePx / 2, y);
          lastY[i] = y;
        }
        x += quantSizePx;
      }

      /**
       * @param {!SDK.TracingModel.Event} e
       */
      function onEventStart(e) {
        var index = categoryIndexStack.length ? categoryIndexStack.peekLast() : idleIndex;
        quantizer.appendInterval(e.startTime, index);
        categoryIndexStack.push(Timeline.TimelineUIUtils.eventStyle(e).category._overviewIndex || otherIndex);
      }

      /**
       * @param {!SDK.TracingModel.Event} e
       */
      function onEventEnd(e) {
        quantizer.appendInterval(e.endTime, categoryIndexStack.pop());
      }

      TimelineModel.TimelineModel.forEachEvent(events, onEventStart, onEventEnd);
      quantizer.appendInterval(timeOffset + timeSpan + quantTime, idleIndex);  // Kick drawing the last bucket.
      for (var i = categoryOrder.length - 1; i > 0; --i) {
        paths[i].lineTo(width, height);
        ctx.fillStyle = categories[categoryOrder[i]].color;
        ctx.fill(paths[i]);
      }
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     */
    function applyPattern(ctx) {
      var step = 4 * window.devicePixelRatio;
      ctx.save();
      ctx.lineWidth = step / Math.sqrt(8);
      for (var x = 0.5; x < width + height; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x - height, height);
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.stroke();
      ctx.restore();
    }
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineEventOverviewResponsiveness = class extends Timeline.TimelineEventOverview {
  constructor() {
    super('responsiveness', null);
  }

  /**
   * @override
   */
  update() {
    super.update();
    if (!this._model)
      return;
    var height = this.height();

    var timeOffset = this._model.timelineModel().minimumRecordTime();
    var timeSpan = this._model.timelineModel().maximumRecordTime() - timeOffset;
    var scale = this.width() / timeSpan;
    var frames = this._model.frames();
    // This is due to usage of new signatures of fill() and storke() that closure compiler does not recognize.
    var ctx = /** @type {!Object} */ (this.context());
    var fillPath = new Path2D();
    var markersPath = new Path2D();
    for (var i = 0; i < frames.length; ++i) {
      var frame = frames[i];
      if (!frame.hasWarnings())
        continue;
      paintWarningDecoration(frame.startTime, frame.duration);
    }

    var events = this._model.timelineModel().mainThreadEvents();
    for (var i = 0; i < events.length; ++i) {
      if (!TimelineModel.TimelineData.forEvent(events[i]).warning)
        continue;
      paintWarningDecoration(events[i].startTime, events[i].duration);
    }

    ctx.fillStyle = 'hsl(0, 80%, 90%)';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.fill(fillPath);
    ctx.stroke(markersPath);

    /**
     * @param {number} time
     * @param {number} duration
     */
    function paintWarningDecoration(time, duration) {
      var x = Math.round(scale * (time - timeOffset));
      var w = Math.round(scale * duration);
      fillPath.rect(x, 0, w, height);
      markersPath.moveTo(x + w, 0);
      markersPath.lineTo(x + w, height);
    }
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineFilmStripOverview = class extends Timeline.TimelineEventOverview {
  constructor() {
    super('filmstrip', null);
    this.reset();
  }

  /**
   * @override
   */
  update() {
    super.update();
    var frames = this._model ? this._model.filmStripModel().frames() : [];
    if (!frames.length)
      return;

    var drawGeneration = Symbol('drawGeneration');
    this._drawGeneration = drawGeneration;
    this._imageByFrame(frames[0]).then(image => {
      if (this._drawGeneration !== drawGeneration)
        return;
      if (!image.naturalWidth || !image.naturalHeight)
        return;
      var imageHeight = this.height() - 2 * Timeline.TimelineFilmStripOverview.Padding;
      var imageWidth = Math.ceil(imageHeight * image.naturalWidth / image.naturalHeight);
      var popoverScale = Math.min(200 / image.naturalWidth, 1);
      this._emptyImage = new Image(image.naturalWidth * popoverScale, image.naturalHeight * popoverScale);
      this._drawFrames(imageWidth, imageHeight);
    });
  }

  /**
   * @param {!SDK.FilmStripModel.Frame} frame
   * @return {!Promise<!HTMLImageElement>}
   */
  _imageByFrame(frame) {
    var imagePromise = this._frameToImagePromise.get(frame);
    if (!imagePromise) {
      imagePromise = frame.imageDataPromise().then(createImage);
      this._frameToImagePromise.set(frame, imagePromise);
    }
    return imagePromise;

    /**
     * @param {?string} data
     * @return {!Promise<!HTMLImageElement>}
     */
    function createImage(data) {
      var fulfill;
      var promise = new Promise(f => fulfill = f);

      var image = /** @type {!HTMLImageElement} */ (createElement('img'));
      if (data) {
        image.src = 'data:image/jpg;base64,' + data;
        image.addEventListener('load', () => fulfill(image));
        image.addEventListener('error', () => fulfill(image));
      } else {
        fulfill(image);
      }
      return promise;
    }
  }

  /**
   * @param {number} imageWidth
   * @param {number} imageHeight
   */
  _drawFrames(imageWidth, imageHeight) {
    if (!imageWidth || !this._model)
      return;
    var filmStripModel = this._model.filmStripModel();
    if (!filmStripModel.frames().length)
      return;
    var padding = Timeline.TimelineFilmStripOverview.Padding;
    var width = this.width();
    var zeroTime = filmStripModel.zeroTime();
    var spanTime = filmStripModel.spanTime();
    var scale = spanTime / width;
    var context = this.context();
    var drawGeneration = this._drawGeneration;

    context.beginPath();
    for (var x = padding; x < width; x += imageWidth + 2 * padding) {
      var time = zeroTime + (x + imageWidth / 2) * scale;
      var frame = filmStripModel.frameByTimestamp(time);
      if (!frame)
        continue;
      context.rect(x - 0.5, 0.5, imageWidth + 1, imageHeight + 1);
      this._imageByFrame(frame).then(drawFrameImage.bind(this, x));
    }
    context.strokeStyle = '#ddd';
    context.stroke();

    /**
     * @param {number} x
     * @param {!HTMLImageElement} image
     * @this {Timeline.TimelineFilmStripOverview}
     */
    function drawFrameImage(x, image) {
      // Ignore draws deferred from a previous update call.
      if (this._drawGeneration !== drawGeneration)
        return;
      context.drawImage(image, x, 1, imageWidth, imageHeight);
    }
  }

  /**
   * @override
   * @param {number} x
   * @return {!Promise<?Element>}
   */
  popoverElementPromise(x) {
    if (!this._model || !this._model.filmStripModel().frames().length)
      return Promise.resolve(/** @type {?Element} */ (null));

    var time = this.calculator().positionToTime(x);
    var frame = this._model.filmStripModel().frameByTimestamp(time);
    if (frame === this._lastFrame)
      return Promise.resolve(this._lastElement);
    var imagePromise = frame ? this._imageByFrame(frame) : Promise.resolve(this._emptyImage);
    return imagePromise.then(createFrameElement.bind(this));

    /**
     * @this {Timeline.TimelineFilmStripOverview}
     * @param {!HTMLImageElement} image
     * @return {?Element}
     */
    function createFrameElement(image) {
      var element = createElementWithClass('div', 'frame');
      element.createChild('div', 'thumbnail').appendChild(image);
      UI.appendStyle(element, 'timeline/timelinePanel.css');
      this._lastFrame = frame;
      this._lastElement = element;
      return element;
    }
  }

  /**
   * @override
   */
  reset() {
    this._lastFrame = undefined;
    this._lastElement = null;
    /** @type {!Map<!SDK.FilmStripModel.Frame,!Promise<!HTMLImageElement>>} */
    this._frameToImagePromise = new Map();
    this._imageWidth = 0;
  }
};

Timeline.TimelineFilmStripOverview.Padding = 2;

/**
 * @unrestricted
 */
Timeline.TimelineEventOverviewFrames = class extends Timeline.TimelineEventOverview {
  constructor() {
    super('framerate', Common.UIString('FPS'));
  }

  /**
   * @override
   */
  update() {
    super.update();
    if (!this._model)
      return;
    var frames = this._model.frames();
    if (!frames.length)
      return;
    var height = this.height();
    var /** @const */ padding = 1 * window.devicePixelRatio;
    var /** @const */ baseFrameDurationMs = 1e3 / 60;
    var visualHeight = height - 2 * padding;
    var timeOffset = this._model.timelineModel().minimumRecordTime();
    var timeSpan = this._model.timelineModel().maximumRecordTime() - timeOffset;
    var scale = this.width() / timeSpan;
    var baseY = height - padding;
    var ctx = this.context();
    var bottomY = baseY + 10 * window.devicePixelRatio;
    var x = 0;
    var y = bottomY;

    var lineWidth = window.devicePixelRatio;
    var offset = lineWidth & 1 ? 0.5 : 0;
    var tickDepth = 1.5 * window.devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (var i = 0; i < frames.length; ++i) {
      var frame = frames[i];
      x = Math.round((frame.startTime - timeOffset) * scale) + offset;
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + tickDepth);
      y = frame.idle ? bottomY :
                       Math.round(baseY - visualHeight * Math.min(baseFrameDurationMs / frame.duration, 1)) - offset;
      ctx.lineTo(x, y + tickDepth);
      ctx.lineTo(x, y);
    }
    var lastFrame = frames.peekLast();
    x = Math.round((lastFrame.startTime + lastFrame.duration - timeOffset) * scale) + offset;
    ctx.lineTo(x, y);
    ctx.lineTo(x, bottomY);
    ctx.fillStyle = 'hsl(110, 50%, 88%)';
    ctx.strokeStyle = 'hsl(110, 50%, 60%)';
    ctx.lineWidth = lineWidth;
    ctx.fill();
    ctx.stroke();
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineEventOverviewMemory = class extends Timeline.TimelineEventOverview {
  constructor() {
    super('memory', Common.UIString('HEAP'));
    this._heapSizeLabel = this.element.createChild('div', 'memory-graph-label');
  }

  resetHeapSizeLabels() {
    this._heapSizeLabel.textContent = '';
  }

  /**
   * @override
   */
  update() {
    super.update();
    var ratio = window.devicePixelRatio;

    var events = this._model ? this._model.timelineModel().mainThreadEvents() : [];
    if (!events.length) {
      this.resetHeapSizeLabels();
      return;
    }

    var lowerOffset = 3 * ratio;
    var maxUsedHeapSize = 0;
    var minUsedHeapSize = 100000000000;
    var minTime = this._model.timelineModel().minimumRecordTime();
    var maxTime = this._model.timelineModel().maximumRecordTime();
    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {boolean}
     */
    function isUpdateCountersEvent(event) {
      return event.name === TimelineModel.TimelineModel.RecordType.UpdateCounters;
    }
    events = events.filter(isUpdateCountersEvent);
    /**
     * @param {!SDK.TracingModel.Event} event
     */
    function calculateMinMaxSizes(event) {
      var counters = event.args.data;
      if (!counters || !counters.jsHeapSizeUsed)
        return;
      maxUsedHeapSize = Math.max(maxUsedHeapSize, counters.jsHeapSizeUsed);
      minUsedHeapSize = Math.min(minUsedHeapSize, counters.jsHeapSizeUsed);
    }
    events.forEach(calculateMinMaxSizes);
    minUsedHeapSize = Math.min(minUsedHeapSize, maxUsedHeapSize);

    var lineWidth = 1;
    var width = this.width();
    var height = this.height() - lowerOffset;
    var xFactor = width / (maxTime - minTime);
    var yFactor = (height - lineWidth) / Math.max(maxUsedHeapSize - minUsedHeapSize, 1);

    var histogram = new Array(width);

    /**
     * @param {!SDK.TracingModel.Event} event
     */
    function buildHistogram(event) {
      var counters = event.args.data;
      if (!counters || !counters.jsHeapSizeUsed)
        return;
      var x = Math.round((event.startTime - minTime) * xFactor);
      var y = Math.round((counters.jsHeapSizeUsed - minUsedHeapSize) * yFactor);
      histogram[x] = Math.max(histogram[x] || 0, y);
    }
    events.forEach(buildHistogram);

    var ctx = this.context();
    var heightBeyondView = height + lowerOffset + lineWidth;

    ctx.translate(0.5, 0.5);
    ctx.beginPath();
    ctx.moveTo(-lineWidth, heightBeyondView);
    var y = 0;
    var isFirstPoint = true;
    var lastX = 0;
    for (var x = 0; x < histogram.length; x++) {
      if (typeof histogram[x] === 'undefined')
        continue;
      if (isFirstPoint) {
        isFirstPoint = false;
        y = histogram[x];
        ctx.lineTo(-lineWidth, height - y);
      }
      var nextY = histogram[x];
      if (Math.abs(nextY - y) > 2 && Math.abs(x - lastX) > 1)
        ctx.lineTo(x, height - y);
      y = nextY;
      ctx.lineTo(x, height - y);
      lastX = x;
    }
    ctx.lineTo(width + lineWidth, height - y);
    ctx.lineTo(width + lineWidth, heightBeyondView);
    ctx.closePath();

    ctx.fillStyle = 'hsla(220, 90%, 70%, 0.2)';
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'hsl(220, 90%, 70%)';
    ctx.stroke();

    this._heapSizeLabel.textContent =
        Common.UIString('%s \u2013 %s', Number.bytesToString(minUsedHeapSize), Number.bytesToString(maxUsedHeapSize));
  }
};

/**
 * @unrestricted
 */
Timeline.Quantizer = class {
  /**
   * @param {number} startTime
   * @param {number} quantDuration
   * @param {function(!Array<number>)} callback
   */
  constructor(startTime, quantDuration, callback) {
    this._lastTime = startTime;
    this._quantDuration = quantDuration;
    this._callback = callback;
    this._counters = [];
    this._remainder = quantDuration;
  }

  /**
   * @param {number} time
   * @param {number} group
   */
  appendInterval(time, group) {
    var interval = time - this._lastTime;
    if (interval <= this._remainder) {
      this._counters[group] = (this._counters[group] || 0) + interval;
      this._remainder -= interval;
      this._lastTime = time;
      return;
    }
    this._counters[group] = (this._counters[group] || 0) + this._remainder;
    this._callback(this._counters);
    interval -= this._remainder;
    while (interval >= this._quantDuration) {
      var counters = [];
      counters[group] = this._quantDuration;
      this._callback(counters);
      interval -= this._quantDuration;
    }
    this._counters = [];
    this._counters[group] = interval;
    this._lastTime = time;
    this._remainder = this._quantDuration - interval;
  }
};
