/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @implements {WebInspector.FlameChartDataProvider}
 * @unrestricted
 */
WebInspector.TimelineFlameChartDataProviderBase = class {
  /**
   * @param {!WebInspector.TimelineModel} model
   * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
   */
  constructor(model, filters) {
    WebInspector.FlameChartDataProvider.call(this);
    this.reset();
    this._model = model;
    /** @type {?WebInspector.FlameChart.TimelineData} */
    this._timelineData;
    this._font = '11px ' + WebInspector.fontFamily();
    this._filters = filters;
  }

  /**
   * @override
   * @return {number}
   */
  barHeight() {
    return 17;
  }

  /**
   * @override
   * @return {number}
   */
  textBaseline() {
    return 5;
  }

  /**
   * @override
   * @return {number}
   */
  textPadding() {
    return 4;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  entryFont(entryIndex) {
    return this._font;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?string}
   */
  entryTitle(entryIndex) {
    return null;
  }

  reset() {
    this._timelineData = null;
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
  totalTime() {
    return this._timeSpan;
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return Number.preciseMillisToString(value, precision);
  }

  /**
   * @override
   * @return {number}
   */
  maxStackDepth() {
    return this._currentLevel;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(entryIndex) {
    return null;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {boolean}
   */
  canJumpToEntry(entryIndex) {
    return false;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  entryColor(entryIndex) {
    return 'red';
  }

  /**
   * @override
   * @param {number} index
   * @return {boolean}
   */
  forceDecoration(index) {
    return false;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @param {!CanvasRenderingContext2D} context
   * @param {?string} text
   * @param {number} barX
   * @param {number} barY
   * @param {number} barWidth
   * @param {number} barHeight
   * @param {number} unclippedBarX
   * @param {number} timeToPixels
   * @return {boolean}
   */
  decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixels) {
    return false;
  }

  /**
   * @override
   * @return {number}
   */
  paddingLeft() {
    return 0;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  textColor(entryIndex) {
    return '#333';
  }

  /**
   * @param {number} entryIndex
   * @return {?WebInspector.TimelineSelection}
   */
  createSelection(entryIndex) {
    return null;
  }

  /**
   * @override
   * @return {!WebInspector.FlameChart.TimelineData}
   */
  timelineData() {
    throw new Error('Not implemented');
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @return {boolean}
   */
  _isVisible(event) {
    return this._filters.every(function(filter) {
      return filter.accept(event);
    });
  }
};

/**
 * @enum {symbol}
 */
WebInspector.TimelineFlameChartEntryType = {
  Frame: Symbol('Frame'),
  Event: Symbol('Event'),
  InteractionRecord: Symbol('InteractionRecord'),
};

/**
 * @unrestricted
 */
WebInspector.TimelineFlameChartDataProvider = class extends WebInspector.TimelineFlameChartDataProviderBase {
  /**
   * @param {!WebInspector.TimelineModel} model
   * @param {!WebInspector.TimelineFrameModel} frameModel
   * @param {!WebInspector.TimelineIRModel} irModel
   * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
   */
  constructor(model, frameModel, irModel, filters) {
    super(model, filters);
    this._frameModel = frameModel;
    this._irModel = irModel;
    this._consoleColorGenerator =
        new WebInspector.FlameChart.ColorGenerator({min: 30, max: 55}, {min: 70, max: 100, count: 6}, 50, 0.7);

    this._headerLevel1 = {
      padding: 4,
      height: 17,
      collapsible: true,
      color: WebInspector.themeSupport.patchColor('#222', WebInspector.ThemeSupport.ColorUsage.Foreground),
      font: this._font,
      backgroundColor: WebInspector.themeSupport.patchColor('white', WebInspector.ThemeSupport.ColorUsage.Background),
      nestingLevel: 0
    };

    this._headerLevel2 = {
      padding: 2,
      height: 17,
      collapsible: false,
      font: this._font,
      color: WebInspector.themeSupport.patchColor('#222', WebInspector.ThemeSupport.ColorUsage.Foreground),
      backgroundColor: WebInspector.themeSupport.patchColor('white', WebInspector.ThemeSupport.ColorUsage.Background),
      nestingLevel: 1,
      shareHeaderLine: true
    };

    this._interactionsHeaderLevel1 = {
      padding: 4,
      height: 17,
      collapsible: true,
      color: WebInspector.themeSupport.patchColor('#222', WebInspector.ThemeSupport.ColorUsage.Foreground),
      font: this._font,
      backgroundColor: WebInspector.themeSupport.patchColor('white', WebInspector.ThemeSupport.ColorUsage.Background),
      nestingLevel: 0,
      useFirstLineForOverview: true,
      shareHeaderLine: true
    };

    this._interactionsHeaderLevel2 = {
      padding: 2,
      height: 17,
      collapsible: true,
      color: WebInspector.themeSupport.patchColor('#222', WebInspector.ThemeSupport.ColorUsage.Foreground),
      font: this._font,
      backgroundColor: WebInspector.themeSupport.patchColor('white', WebInspector.ThemeSupport.ColorUsage.Background),
      nestingLevel: 1,
      shareHeaderLine: true
    };
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?string}
   */
  entryTitle(entryIndex) {
    var entryType = this._entryType(entryIndex);
    if (entryType === WebInspector.TimelineFlameChartEntryType.Event) {
      var event = /** @type {!WebInspector.TracingModel.Event} */ (this._entryData[entryIndex]);
      if (event.phase === WebInspector.TracingModel.Phase.AsyncStepInto ||
          event.phase === WebInspector.TracingModel.Phase.AsyncStepPast)
        return event.name + ':' + event.args['step'];
      if (event._blackboxRoot)
        return WebInspector.UIString('Blackboxed');
      var name = WebInspector.TimelineUIUtils.eventStyle(event).title;
      // TODO(yurys): support event dividers
      var detailsText =
          WebInspector.TimelineUIUtils.buildDetailsTextForTraceEvent(event, this._model.targetByEvent(event));
      if (event.name === WebInspector.TimelineModel.RecordType.JSFrame && detailsText)
        return detailsText;
      return detailsText ? WebInspector.UIString('%s (%s)', name, detailsText) : name;
    }
    var title = this._entryIndexToTitle[entryIndex];
    if (!title) {
      title = WebInspector.UIString('Unexpected entryIndex %d', entryIndex);
      console.error(title);
    }
    return title;
  }

  /**
   * @override
   * @param {number} index
   * @return {string}
   */
  textColor(index) {
    var event = this._entryData[index];
    if (event && event._blackboxRoot)
      return '#888';
    else
      return super.textColor(index);
  }

  /**
   * @override
   */
  reset() {
    super.reset();
    /** @type {!Array<!WebInspector.TracingModel.Event|!WebInspector.TimelineFrame|!WebInspector.TimelineIRModel.Phases>} */
    this._entryData = [];
    /** @type {!Array<!WebInspector.TimelineFlameChartEntryType>} */
    this._entryTypeByLevel = [];
    /** @type {!Array<string>} */
    this._entryIndexToTitle = [];
    /** @type {!Array<!WebInspector.TimelineFlameChartMarker>} */
    this._markers = [];
    /** @type {!Map<!WebInspector.TimelineCategory, string>} */
    this._asyncColorByCategory = new Map();
    /** @type {!Map<!WebInspector.TimelineIRModel.Phases, string>} */
    this._asyncColorByInteractionPhase = new Map();
  }

  /**
   * @override
   * @return {!WebInspector.FlameChart.TimelineData}
   */
  timelineData() {
    if (this._timelineData)
      return this._timelineData;

    this._timelineData = new WebInspector.FlameChart.TimelineData([], [], [], []);

    this._flowEventIndexById = {};
    this._minimumBoundary = this._model.minimumRecordTime();
    this._timeSpan = this._model.isEmpty() ? 1000 : this._model.maximumRecordTime() - this._minimumBoundary;
    this._currentLevel = 0;
    this._appendFrameBars(this._frameModel.frames());

    this._appendHeader(WebInspector.UIString('Interactions'), this._interactionsHeaderLevel1);
    this._appendInteractionRecords();

    var asyncEventGroups = WebInspector.TimelineModel.AsyncEventGroup;
    var inputLatencies = this._model.mainThreadAsyncEvents().get(asyncEventGroups.input);
    if (inputLatencies && inputLatencies.length) {
      var title = WebInspector.TimelineUIUtils.titleForAsyncEventGroup(asyncEventGroups.input);
      this._appendAsyncEventsGroup(title, inputLatencies, this._interactionsHeaderLevel2);
    }
    var animations = this._model.mainThreadAsyncEvents().get(asyncEventGroups.animation);
    if (animations && animations.length) {
      var title = WebInspector.TimelineUIUtils.titleForAsyncEventGroup(asyncEventGroups.animation);
      this._appendAsyncEventsGroup(title, animations, this._interactionsHeaderLevel2);
    }
    var threads = this._model.virtualThreads();
    this._appendThreadTimelineData(
        WebInspector.UIString('Main'), this._model.mainThreadEvents(), this._model.mainThreadAsyncEvents(), true);
    var compositorThreads = threads.filter(thread => thread.name.startsWith('CompositorTileWorker'));
    var otherThreads = threads.filter(thread => !thread.name.startsWith('CompositorTileWorker'));
    if (compositorThreads.length) {
      this._appendHeader(WebInspector.UIString('Raster'), this._headerLevel1);
      for (var i = 0; i < compositorThreads.length; ++i)
        this._appendSyncEvents(
            compositorThreads[i].events, WebInspector.UIString('Rasterizer Thread %d', i), this._headerLevel2);
    }
    this._appendGPUEvents();

    otherThreads.forEach(
        thread => this._appendThreadTimelineData(thread.name, thread.events, thread.asyncEventsByGroup));

    /**
     * @param {!WebInspector.TimelineFlameChartMarker} a
     * @param {!WebInspector.TimelineFlameChartMarker} b
     */
    function compareStartTime(a, b) {
      return a.startTime() - b.startTime();
    }

    this._markers.sort(compareStartTime);
    this._timelineData.markers = this._markers;

    this._flowEventIndexById = {};
    return this._timelineData;
  }

  /**
   * @param {string} threadTitle
   * @param {!Array<!WebInspector.TracingModel.Event>} syncEvents
   * @param {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} asyncEvents
   * @param {boolean=} forceExpanded
   */
  _appendThreadTimelineData(threadTitle, syncEvents, asyncEvents, forceExpanded) {
    this._appendAsyncEvents(asyncEvents);
    this._appendSyncEvents(syncEvents, threadTitle, this._headerLevel1, forceExpanded);
  }

  /**
   * @param {!Array<!WebInspector.TracingModel.Event>} events
   * @param {string} title
   * @param {!WebInspector.FlameChart.GroupStyle} style
   * @param {boolean=} forceExpanded
   */
  _appendSyncEvents(events, title, style, forceExpanded) {
    var openEvents = [];
    var flowEventsEnabled = Runtime.experiments.isEnabled('timelineFlowEvents');
    var blackboxingEnabled = Runtime.experiments.isEnabled('blackboxJSFramesOnTimeline');
    var maxStackDepth = 0;
    for (var i = 0; i < events.length; ++i) {
      var e = events[i];
      if (WebInspector.TimelineModel.isMarkerEvent(e))
        this._markers.push(new WebInspector.TimelineFlameChartMarker(
            e.startTime, e.startTime - this._model.minimumRecordTime(),
            WebInspector.TimelineUIUtils.markerStyleForEvent(e)));
      if (!WebInspector.TracingModel.isFlowPhase(e.phase)) {
        if (!e.endTime && e.phase !== WebInspector.TracingModel.Phase.Instant)
          continue;
        if (WebInspector.TracingModel.isAsyncPhase(e.phase))
          continue;
        if (!this._isVisible(e))
          continue;
      }
      while (openEvents.length && openEvents.peekLast().endTime <= e.startTime)
        openEvents.pop();
      e._blackboxRoot = false;
      if (blackboxingEnabled && this._isBlackboxedEvent(e)) {
        var parent = openEvents.peekLast();
        if (parent && parent._blackboxRoot)
          continue;
        e._blackboxRoot = true;
      }
      if (title) {
        this._appendHeader(title, style, forceExpanded);
        title = '';
      }

      var level = this._currentLevel + openEvents.length;
      this._appendEvent(e, level);
      if (flowEventsEnabled)
        this._appendFlowEvent(e, level);
      maxStackDepth = Math.max(maxStackDepth, openEvents.length + 1);
      if (e.endTime)
        openEvents.push(e);
    }
    this._entryTypeByLevel.length = this._currentLevel + maxStackDepth;
    this._entryTypeByLevel.fill(WebInspector.TimelineFlameChartEntryType.Event, this._currentLevel);
    this._currentLevel += maxStackDepth;
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @return {boolean}
   */
  _isBlackboxedEvent(event) {
    if (event.name !== WebInspector.TimelineModel.RecordType.JSFrame)
      return false;
    var url = event.args['data']['url'];
    return url && this._isBlackboxedURL(url);
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  _isBlackboxedURL(url) {
    return WebInspector.blackboxManager.isBlackboxedURL(url);
  }

  /**
   * @param {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} asyncEvents
   */
  _appendAsyncEvents(asyncEvents) {
    var groups = WebInspector.TimelineModel.AsyncEventGroup;
    var groupArray = Object.keys(groups).map(key => groups[key]);

    groupArray.remove(groups.animation);
    groupArray.remove(groups.input);

    for (var groupIndex = 0; groupIndex < groupArray.length; ++groupIndex) {
      var group = groupArray[groupIndex];
      var events = asyncEvents.get(group);
      if (!events)
        continue;
      var title = WebInspector.TimelineUIUtils.titleForAsyncEventGroup(group);
      this._appendAsyncEventsGroup(title, events, this._headerLevel1);
    }
  }

  /**
   * @param {string} header
   * @param {!Array<!WebInspector.TracingModel.AsyncEvent>} events
   * @param {!WebInspector.FlameChart.GroupStyle} style
   */
  _appendAsyncEventsGroup(header, events, style) {
    var lastUsedTimeByLevel = [];
    var groupHeaderAppended = false;
    for (var i = 0; i < events.length; ++i) {
      var asyncEvent = events[i];
      if (!this._isVisible(asyncEvent))
        continue;
      if (!groupHeaderAppended) {
        this._appendHeader(header, style);
        groupHeaderAppended = true;
      }
      var startTime = asyncEvent.startTime;
      var level;
      for (level = 0; level < lastUsedTimeByLevel.length && lastUsedTimeByLevel[level] > startTime; ++level) {
      }
      this._appendAsyncEvent(asyncEvent, this._currentLevel + level);
      lastUsedTimeByLevel[level] = asyncEvent.endTime;
    }
    this._entryTypeByLevel.length = this._currentLevel + lastUsedTimeByLevel.length;
    this._entryTypeByLevel.fill(WebInspector.TimelineFlameChartEntryType.Event, this._currentLevel);
    this._currentLevel += lastUsedTimeByLevel.length;
  }

  _appendGPUEvents() {
    if (this._appendSyncEvents(this._model.gpuEvents(), WebInspector.UIString('GPU'), this._headerLevel1, false))
      ++this._currentLevel;
  }

  _appendInteractionRecords() {
    this._irModel.interactionRecords().forEach(this._appendSegment, this);
    this._entryTypeByLevel[this._currentLevel++] = WebInspector.TimelineFlameChartEntryType.InteractionRecord;
  }

  /**
   * @param {!Array.<!WebInspector.TimelineFrame>} frames
   */
  _appendFrameBars(frames) {
    var style = WebInspector.TimelineUIUtils.markerStyleForFrame();
    this._entryTypeByLevel[this._currentLevel] = WebInspector.TimelineFlameChartEntryType.Frame;
    for (var i = 0; i < frames.length; ++i) {
      this._markers.push(new WebInspector.TimelineFlameChartMarker(
          frames[i].startTime, frames[i].startTime - this._model.minimumRecordTime(), style));
      this._appendFrame(frames[i]);
    }
    ++this._currentLevel;
  }

  /**
   * @param {number} entryIndex
   * @return {!WebInspector.TimelineFlameChartEntryType}
   */
  _entryType(entryIndex) {
    return this._entryTypeByLevel[this._timelineData.entryLevels[entryIndex]];
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(entryIndex) {
    var time = '';
    var title;
    var warning;
    var type = this._entryType(entryIndex);
    if (type === WebInspector.TimelineFlameChartEntryType.Event) {
      var event = /** @type {!WebInspector.TracingModel.Event} */ (this._entryData[entryIndex]);
      var totalTime = event.duration;
      var selfTime = event.selfTime;
      var /** @const */ eps = 1e-6;
      if (typeof totalTime === 'number') {
        time = Math.abs(totalTime - selfTime) > eps && selfTime > eps ?
            WebInspector.UIString(
                '%s (self %s)', Number.millisToString(totalTime, true), Number.millisToString(selfTime, true)) :
            Number.millisToString(totalTime, true);
      }
      title = this.entryTitle(entryIndex);
      warning = WebInspector.TimelineUIUtils.eventWarning(event);
    } else if (type === WebInspector.TimelineFlameChartEntryType.Frame) {
      var frame = /** @type {!WebInspector.TimelineFrame} */ (this._entryData[entryIndex]);
      time = WebInspector.UIString(
          '%s ~ %.0f\u2009fps', Number.preciseMillisToString(frame.duration, 1), (1000 / frame.duration));
      title = frame.idle ? WebInspector.UIString('Idle Frame') : WebInspector.UIString('Frame');
      if (frame.hasWarnings()) {
        warning = createElement('span');
        warning.textContent = WebInspector.UIString('Long frame');
      }
    } else {
      return null;
    }
    var element = createElement('div');
    var root = WebInspector.createShadowRootWithCoreStyles(element, 'timeline/timelineFlamechartPopover.css');
    var contents = root.createChild('div', 'timeline-flamechart-popover');
    contents.createChild('span', 'timeline-info-time').textContent = time;
    contents.createChild('span', 'timeline-info-title').textContent = title;
    if (warning) {
      warning.classList.add('timeline-info-warning');
      contents.appendChild(warning);
    }
    return element;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  entryColor(entryIndex) {
    // This is not annotated due to closure compiler failure to properly infer cache container's template type.
    function patchColorAndCache(cache, key, lookupColor) {
      var color = cache.get(key);
      if (color)
        return color;
      var parsedColor = WebInspector.Color.parse(lookupColor(key));
      color = parsedColor.setAlpha(0.7).asString(WebInspector.Color.Format.RGBA) || '';
      cache.set(key, color);
      return color;
    }

    var type = this._entryType(entryIndex);
    if (type === WebInspector.TimelineFlameChartEntryType.Event) {
      var event = /** @type {!WebInspector.TracingModel.Event} */ (this._entryData[entryIndex]);
      if (!WebInspector.TracingModel.isAsyncPhase(event.phase))
        return WebInspector.TimelineUIUtils.eventColor(event);
      if (event.hasCategory(WebInspector.TimelineModel.Category.Console) ||
          event.hasCategory(WebInspector.TimelineModel.Category.UserTiming))
        return this._consoleColorGenerator.colorForID(event.name);
      if (event.hasCategory(WebInspector.TimelineModel.Category.LatencyInfo)) {
        var phase =
            WebInspector.TimelineIRModel.phaseForEvent(event) || WebInspector.TimelineIRModel.Phases.Uncategorized;
        return patchColorAndCache(
            this._asyncColorByInteractionPhase, phase, WebInspector.TimelineUIUtils.interactionPhaseColor);
      }
      var category = WebInspector.TimelineUIUtils.eventStyle(event).category;
      return patchColorAndCache(this._asyncColorByCategory, category, () => category.color);
    }
    if (type === WebInspector.TimelineFlameChartEntryType.Frame)
      return 'white';
    if (type === WebInspector.TimelineFlameChartEntryType.InteractionRecord)
      return 'transparent';
    return '';
  }

  /**
   * @override
   * @param {number} entryIndex
   * @param {!CanvasRenderingContext2D} context
   * @param {?string} text
   * @param {number} barX
   * @param {number} barY
   * @param {number} barWidth
   * @param {number} barHeight
   * @param {number} unclippedBarX
   * @param {number} timeToPixels
   * @return {boolean}
   */
  decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixels) {
    var data = this._entryData[entryIndex];
    var type = this._entryType(entryIndex);
    if (type === WebInspector.TimelineFlameChartEntryType.Frame) {
      var /** @const */ vPadding = 1;
      var /** @const */ hPadding = 1;
      var frame = /** {!WebInspector.TimelineFrame} */ (data);
      barX += hPadding;
      barWidth -= 2 * hPadding;
      barY += vPadding;
      barHeight -= 2 * vPadding + 1;
      context.fillStyle = frame.idle ? 'white' : (frame.hasWarnings() ? '#fad1d1' : '#d7f0d1');
      context.fillRect(barX, barY, barWidth, barHeight);
      var frameDurationText = Number.preciseMillisToString(frame.duration, 1);
      var textWidth = context.measureText(frameDurationText).width;
      if (barWidth >= textWidth) {
        context.fillStyle = this.textColor(entryIndex);
        context.fillText(frameDurationText, barX + (barWidth - textWidth) / 2, barY + barHeight - 3);
      }
      return true;
    }

    if (type === WebInspector.TimelineFlameChartEntryType.InteractionRecord) {
      var color = WebInspector.TimelineUIUtils.interactionPhaseColor(
          /** @type {!WebInspector.TimelineIRModel.Phases} */ (this._entryData[entryIndex]));
      context.fillStyle = color;
      context.fillRect(barX, barY, barWidth - 1, 2);
      context.fillRect(barX, barY - 3, 2, 3);
      context.fillRect(barX + barWidth - 3, barY - 3, 2, 3);
      return false;
    }

    if (type === WebInspector.TimelineFlameChartEntryType.Event) {
      var event = /** @type {!WebInspector.TracingModel.Event} */ (this._entryData[entryIndex]);
      if (event.hasCategory(WebInspector.TimelineModel.Category.LatencyInfo) && event.timeWaitingForMainThread) {
        context.fillStyle = 'hsla(0, 70%, 60%, 1)';
        var width = Math.floor(unclippedBarX - barX + event.timeWaitingForMainThread * timeToPixels);
        context.fillRect(barX, barY + barHeight - 3, width, 2);
      }
      if (event.warning)
        paintWarningDecoration(barX, barWidth - 1.5);
    }

    /**
     * @param {number} x
     * @param {number} width
     */
    function paintWarningDecoration(x, width) {
      var /** @const */ triangleSize = 8;
      context.save();
      context.beginPath();
      context.rect(x, barY, width, barHeight);
      context.clip();
      context.beginPath();
      context.fillStyle = 'red';
      context.moveTo(x + width - triangleSize, barY);
      context.lineTo(x + width, barY);
      context.lineTo(x + width, barY + triangleSize);
      context.fill();
      context.restore();
    }

    return false;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {boolean}
   */
  forceDecoration(entryIndex) {
    var type = this._entryType(entryIndex);
    return type === WebInspector.TimelineFlameChartEntryType.Frame ||
        type === WebInspector.TimelineFlameChartEntryType.Event &&
        !!(/** @type {!WebInspector.TracingModel.Event} */ (this._entryData[entryIndex]).warning);
  }

  /**
   * @param {string} title
   * @param {!WebInspector.FlameChart.GroupStyle} style
   * @param {boolean=} expanded
   */
  _appendHeader(title, style, expanded) {
    this._timelineData.groups.push({startLevel: this._currentLevel, name: title, expanded: expanded, style: style});
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @param {number} level
   */
  _appendEvent(event, level) {
    var index = this._entryData.length;
    this._entryData.push(event);
    this._timelineData.entryLevels[index] = level;
    var duration;
    if (WebInspector.TimelineModel.isMarkerEvent(event))
      duration = undefined;
    else
      duration = event.duration || WebInspector.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
    this._timelineData.entryTotalTimes[index] = duration;
    this._timelineData.entryStartTimes[index] = event.startTime;
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @param {number} level
   */
  _appendFlowEvent(event, level) {
    var timelineData = this._timelineData;
    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {number}
     */
    function pushStartFlow(event) {
      var flowIndex = timelineData.flowStartTimes.length;
      timelineData.flowStartTimes.push(event.startTime);
      timelineData.flowStartLevels.push(level);
      return flowIndex;
    }

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {number} flowIndex
     */
    function pushEndFlow(event, flowIndex) {
      timelineData.flowEndTimes[flowIndex] = event.startTime;
      timelineData.flowEndLevels[flowIndex] = level;
    }

    switch (event.phase) {
      case WebInspector.TracingModel.Phase.FlowBegin:
        this._flowEventIndexById[event.id] = pushStartFlow(event);
        break;
      case WebInspector.TracingModel.Phase.FlowStep:
        pushEndFlow(event, this._flowEventIndexById[event.id]);
        this._flowEventIndexById[event.id] = pushStartFlow(event);
        break;
      case WebInspector.TracingModel.Phase.FlowEnd:
        pushEndFlow(event, this._flowEventIndexById[event.id]);
        delete this._flowEventIndexById[event.id];
        break;
    }
  }

  /**
   * @param {!WebInspector.TracingModel.AsyncEvent} asyncEvent
   * @param {number} level
   */
  _appendAsyncEvent(asyncEvent, level) {
    if (WebInspector.TracingModel.isNestableAsyncPhase(asyncEvent.phase)) {
      // FIXME: also add steps once we support event nesting in the FlameChart.
      this._appendEvent(asyncEvent, level);
      return;
    }
    var steps = asyncEvent.steps;
    // If we have past steps, put the end event for each range rather than start one.
    var eventOffset = steps.length > 1 && steps[1].phase === WebInspector.TracingModel.Phase.AsyncStepPast ? 1 : 0;
    for (var i = 0; i < steps.length - 1; ++i) {
      var index = this._entryData.length;
      this._entryData.push(steps[i + eventOffset]);
      var startTime = steps[i].startTime;
      this._timelineData.entryLevels[index] = level;
      this._timelineData.entryTotalTimes[index] = steps[i + 1].startTime - startTime;
      this._timelineData.entryStartTimes[index] = startTime;
    }
  }

  /**
   * @param {!WebInspector.TimelineFrame} frame
   */
  _appendFrame(frame) {
    var index = this._entryData.length;
    this._entryData.push(frame);
    this._entryIndexToTitle[index] = Number.millisToString(frame.duration, true);
    this._timelineData.entryLevels[index] = this._currentLevel;
    this._timelineData.entryTotalTimes[index] = frame.duration;
    this._timelineData.entryStartTimes[index] = frame.startTime;
  }

  /**
   * @param {!WebInspector.Segment} segment
   */
  _appendSegment(segment) {
    var index = this._entryData.length;
    this._entryData.push(/** @type {!WebInspector.TimelineIRModel.Phases} */ (segment.data));
    this._entryIndexToTitle[index] = /** @type {string} */ (segment.data);
    this._timelineData.entryLevels[index] = this._currentLevel;
    this._timelineData.entryTotalTimes[index] = segment.end - segment.begin;
    this._timelineData.entryStartTimes[index] = segment.begin;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?WebInspector.TimelineSelection}
   */
  createSelection(entryIndex) {
    var type = this._entryType(entryIndex);
    var timelineSelection = null;
    if (type === WebInspector.TimelineFlameChartEntryType.Event)
      timelineSelection = WebInspector.TimelineSelection.fromTraceEvent(
          /** @type {!WebInspector.TracingModel.Event} */ (this._entryData[entryIndex]));
    else if (type === WebInspector.TimelineFlameChartEntryType.Frame)
      timelineSelection = WebInspector.TimelineSelection.fromFrame(
          /** @type {!WebInspector.TimelineFrame} */ (this._entryData[entryIndex]));
    if (timelineSelection)
      this._lastSelection = new WebInspector.TimelineFlameChartView.Selection(timelineSelection, entryIndex);
    return timelineSelection;
  }

  /**
   * @param {?WebInspector.TimelineSelection} selection
   * @return {number}
   */
  entryIndexForSelection(selection) {
    if (!selection || selection.type() === WebInspector.TimelineSelection.Type.Range)
      return -1;

    if (this._lastSelection && this._lastSelection.timelineSelection.object() === selection.object())
      return this._lastSelection.entryIndex;
    var index = this._entryData.indexOf(
        /** @type {!WebInspector.TracingModel.Event|!WebInspector.TimelineFrame|!WebInspector.TimelineIRModel.Phases} */
        (selection.object()));
    if (index !== -1)
      this._lastSelection = new WebInspector.TimelineFlameChartView.Selection(selection, index);
    return index;
  }
};

WebInspector.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs = 0.001;

/**
 * @unrestricted
 */
WebInspector.TimelineFlameChartNetworkDataProvider = class extends WebInspector.TimelineFlameChartDataProviderBase {
  /**
   * @param {!WebInspector.TimelineModel} model
   */
  constructor(model) {
    super(model, []);
    var loadingCategory = WebInspector.TimelineUIUtils.categories()['loading'];
    this._waitingColor = loadingCategory.childColor;
    this._processingColor = loadingCategory.color;
  }

  /**
   * @override
   * @return {!WebInspector.FlameChart.TimelineData}
   */
  timelineData() {
    if (this._timelineData)
      return this._timelineData;
    /** @type {!Array<!WebInspector.TimelineModel.NetworkRequest>} */
    this._requests = [];
    this._timelineData = new WebInspector.FlameChart.TimelineData([], [], [], []);
    this._appendTimelineData(this._model.mainThreadEvents());
    return this._timelineData;
  }

  /**
   * @override
   */
  reset() {
    super.reset();
    /** @type {!Array<!WebInspector.TimelineModel.NetworkRequest>} */
    this._requests = [];
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this._startTime = startTime;
    this._endTime = endTime;
    this._updateTimelineData();
  }

  /**
   * @override
   * @param {number} index
   * @return {?WebInspector.TimelineSelection}
   */
  createSelection(index) {
    if (index === -1)
      return null;
    var request = this._requests[index];
    this._lastSelection = new WebInspector.TimelineFlameChartView.Selection(
        WebInspector.TimelineSelection.fromNetworkRequest(request), index);
    return this._lastSelection.timelineSelection;
  }

  /**
   * @param {?WebInspector.TimelineSelection} selection
   * @return {number}
   */
  entryIndexForSelection(selection) {
    if (!selection)
      return -1;

    if (this._lastSelection && this._lastSelection.timelineSelection.object() === selection.object())
      return this._lastSelection.entryIndex;

    if (selection.type() !== WebInspector.TimelineSelection.Type.NetworkRequest)
      return -1;
    var request = /** @type{!WebInspector.TimelineModel.NetworkRequest} */ (selection.object());
    var index = this._requests.indexOf(request);
    if (index !== -1)
      this._lastSelection = new WebInspector.TimelineFlameChartView.Selection(
          WebInspector.TimelineSelection.fromNetworkRequest(request), index);
    return index;
  }

  /**
   * @override
   * @param {number} index
   * @return {string}
   */
  entryColor(index) {
    var request = /** @type {!WebInspector.TimelineModel.NetworkRequest} */ (this._requests[index]);
    var category = WebInspector.TimelineUIUtils.networkRequestCategory(request);
    return WebInspector.TimelineUIUtils.networkCategoryColor(category);
  }

  /**
   * @override
   * @param {number} index
   * @return {?string}
   */
  entryTitle(index) {
    var request = /** @type {!WebInspector.TimelineModel.NetworkRequest} */ (this._requests[index]);
    return request.url || null;
  }

  /**
   * @override
   * @param {number} index
   * @param {!CanvasRenderingContext2D} context
   * @param {?string} text
   * @param {number} barX
   * @param {number} barY
   * @param {number} barWidth
   * @param {number} barHeight
   * @param {number} unclippedBarX
   * @param {number} timeToPixelRatio
   * @return {boolean}
   */
  decorateEntry(index, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio) {
    const request = /** @type {!WebInspector.TimelineModel.NetworkRequest} */ (this._requests[index]);
    if (!request.timing)
      return false;

    /**
     * @param {number} time
     * @return {number}
     */
    function timeToPixel(time) {
      return Math.floor(unclippedBarX + (time - startTime) * timeToPixelRatio);
    }

    const minBarWidthPx = 2;
    const startTime = request.startTime;
    const endTime = request.endTime;
    const requestTime = request.timing.requestTime * 1000;
    const sendStart = Math.max(timeToPixel(requestTime + request.timing.sendStart), unclippedBarX);
    const headersEnd = Math.max(timeToPixel(requestTime + request.timing.receiveHeadersEnd), sendStart);
    const finish = Math.max(timeToPixel(request.finishTime || endTime), headersEnd + minBarWidthPx);
    const end = Math.max(timeToPixel(endTime), finish);

    context.fillStyle = 'hsla(0, 100%, 100%, 0.8)';
    context.fillRect(sendStart + 0.5, barY + 0.5, headersEnd - sendStart - 0.5, barHeight - 2);
    context.fillStyle = 'white';
    context.fillRect(barX, barY - 0.5, sendStart - barX, barHeight);
    context.fillRect(finish, barY - 0.5, barX + barWidth - finish, barHeight);

    /**
     * @param {number} begin
     * @param {number} end
     * @param {number} y
     */
    function drawTick(begin, end, y) {
      const tickHeightPx = 6;
      context.moveTo(begin, y - tickHeightPx / 2);
      context.lineTo(begin, y + tickHeightPx / 2);
      context.moveTo(begin, y);
      context.lineTo(end, y);
    }

    const lineWidth = window.devicePixelRatio;
    const subpixelOffset = lineWidth & 1 ? 0.5 : 0;
    context.lineWidth = lineWidth;
    context.strokeStyle = '#ccc';
    const lineY = Math.floor(barY + barHeight / 2) + subpixelOffset;
    const leftTick = Math.floor(unclippedBarX) + subpixelOffset;
    drawTick(leftTick, sendStart, lineY);
    const rightTick = end - subpixelOffset;
    drawTick(rightTick, finish, lineY);
    context.stroke();

    if (typeof request.priority === 'string') {
      const color = this._colorForPriority(request.priority);
      if (color) {
        context.fillStyle = color;
        context.fillRect(sendStart + 0.5, barY + 0.5, 3.5, 3.5);
      }
    }

    const textStart = Math.max(sendStart, 0);
    const textWidth = finish - textStart;
    const minTextWidthPx = 20;
    const textPadding = 6;
    if (textWidth >= minTextWidthPx) {
      const text = this.entryTitle(index);
      if (text && text.length) {
        context.fillStyle = '#333';
        const trimmedText = WebInspector.trimTextMiddle(context, text, textWidth - 2 * textPadding);
        const textBaseHeight = barHeight - this.textBaseline();
        context.fillText(trimmedText, textStart + textPadding, barY + textBaseHeight);
      }
    }

    return true;
  }

  /**
   * @override
   * @param {number} index
   * @return {boolean}
   */
  forceDecoration(index) {
    return true;
  }

  /**
   * @override
   * @param {number} index
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(index) {
    var /** @const */ maxURLChars = 80;
    var request = /** @type {!WebInspector.TimelineModel.NetworkRequest} */ (this._requests[index]);
    if (!request.url)
      return null;
    var element = createElement('div');
    var root = WebInspector.createShadowRootWithCoreStyles(element, 'timeline/timelineFlamechartPopover.css');
    var contents = root.createChild('div', 'timeline-flamechart-popover');
    var duration = request.endTime - request.startTime;
    if (request.startTime && isFinite(duration))
      contents.createChild('span', 'timeline-info-network-time').textContent = Number.millisToString(duration);
    if (typeof request.priority === 'string') {
      var div = contents.createChild('span');
      div.textContent =
          WebInspector.uiLabelForPriority(/** @type {!Protocol.Network.ResourcePriority} */ (request.priority));
      div.style.color = this._colorForPriority(request.priority) || 'black';
    }
    contents.createChild('span').textContent = request.url.trimMiddle(maxURLChars);
    return element;
  }

  /**
   * @param {string} priority
   * @return {?string}
   */
  _colorForPriority(priority) {
    switch (/** @type {!Protocol.Network.ResourcePriority} */ (priority)) {
      case Protocol.Network.ResourcePriority.VeryLow:
        return '#080';
      case Protocol.Network.ResourcePriority.Low:
        return '#6c0';
      case Protocol.Network.ResourcePriority.Medium:
        return '#fa0';
      case Protocol.Network.ResourcePriority.High:
        return '#f60';
      case Protocol.Network.ResourcePriority.VeryHigh:
        return '#f00';
    }
    return null;
  }

  /**
   * @param {!Array.<!WebInspector.TracingModel.Event>} events
   */
  _appendTimelineData(events) {
    this._minimumBoundary = this._model.minimumRecordTime();
    this._maximumBoundary = this._model.maximumRecordTime();
    this._timeSpan = this._model.isEmpty() ? 1000 : this._maximumBoundary - this._minimumBoundary;
    this._model.networkRequests().forEach(this._appendEntry.bind(this));
    this._updateTimelineData();
  }

  _updateTimelineData() {
    if (!this._timelineData)
      return;
    var index = -1;
    var lastTime = Infinity;
    for (var i = 0; i < this._requests.length; ++i) {
      var r = this._requests[i];
      var visible = r.startTime < this._endTime && r.endTime > this._startTime;
      if (!visible) {
        this._timelineData.entryLevels[i] = -1;
        continue;
      }
      if (lastTime > r.startTime)
        ++index;
      lastTime = r.endTime;
      this._timelineData.entryLevels[i] = index;
    }
    ++index;
    for (var i = 0; i < this._requests.length; ++i) {
      if (this._timelineData.entryLevels[i] === -1)
        this._timelineData.entryLevels[i] = index;
    }
    this._timelineData = new WebInspector.FlameChart.TimelineData(
        this._timelineData.entryLevels, this._timelineData.entryTotalTimes, this._timelineData.entryStartTimes, null);
    this._currentLevel = index;
  }

  /**
   * @param {!WebInspector.TimelineModel.NetworkRequest} request
   */
  _appendEntry(request) {
    this._requests.push(request);
    this._timelineData.entryStartTimes.push(request.startTime);
    this._timelineData.entryTotalTimes.push(request.endTime - request.startTime);
    this._timelineData.entryLevels.push(this._requests.length - 1);
  }
};

/**
 * @implements {WebInspector.FlameChartMarker}
 * @unrestricted
 */
WebInspector.TimelineFlameChartMarker = class {
  /**
   * @param {number} startTime
   * @param {number} startOffset
   * @param {!WebInspector.TimelineMarkerStyle} style
   */
  constructor(startTime, startOffset, style) {
    this._startTime = startTime;
    this._startOffset = startOffset;
    this._style = style;
  }

  /**
   * @override
   * @return {number}
   */
  startTime() {
    return this._startTime;
  }

  /**
   * @override
   * @return {string}
   */
  color() {
    return this._style.color;
  }

  /**
   * @override
   * @return {string}
   */
  title() {
    var startTime = Number.millisToString(this._startOffset);
    return WebInspector.UIString('%s at %s', this._style.title, startTime);
  }

  /**
   * @override
   * @param {!CanvasRenderingContext2D} context
   * @param {number} x
   * @param {number} height
   * @param {number} pixelsPerMillisecond
   */
  draw(context, x, height, pixelsPerMillisecond) {
    var lowPriorityVisibilityThresholdInPixelsPerMs = 4;

    if (this._style.lowPriority && pixelsPerMillisecond < lowPriorityVisibilityThresholdInPixelsPerMs)
      return;
    context.save();

    if (!this._style.lowPriority) {
      context.strokeStyle = this._style.color;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    if (this._style.tall) {
      context.strokeStyle = this._style.color;
      context.lineWidth = this._style.lineWidth;
      context.translate(this._style.lineWidth < 1 || (this._style.lineWidth & 1) ? 0.5 : 0, 0.5);
      context.beginPath();
      context.moveTo(x, height);
      context.setLineDash(this._style.dashStyle);
      context.lineTo(x, context.canvas.height);
      context.stroke();
    }
    context.restore();
  }
};

/**
 * @implements {WebInspector.TimelineModeView}
 * @implements {WebInspector.FlameChartDelegate}
 * @unrestricted
 */
WebInspector.TimelineFlameChartView = class extends WebInspector.VBox {
  /**
   * @param {!WebInspector.TimelineModeViewDelegate} delegate
   * @param {!WebInspector.TimelineModel} timelineModel
   * @param {!WebInspector.TimelineFrameModel} frameModel
   * @param {!WebInspector.TimelineIRModel} irModel
   * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
   */
  constructor(delegate, timelineModel, frameModel, irModel, filters) {
    super();
    this.element.classList.add('timeline-flamechart');
    this._delegate = delegate;
    this._model = timelineModel;

    this._splitWidget = new WebInspector.SplitWidget(false, false, 'timelineFlamechartMainView', 150);

    this._dataProvider = new WebInspector.TimelineFlameChartDataProvider(this._model, frameModel, irModel, filters);
    var mainViewGroupExpansionSetting =
        WebInspector.settings.createSetting('timelineFlamechartMainViewGroupExpansion', {});
    this._mainView = new WebInspector.FlameChart(this._dataProvider, this, mainViewGroupExpansionSetting);

    this._networkDataProvider = new WebInspector.TimelineFlameChartNetworkDataProvider(this._model);
    this._networkView = new WebInspector.FlameChart(this._networkDataProvider, this);

    this._splitWidget.setMainWidget(this._mainView);
    this._splitWidget.setSidebarWidget(this._networkView);
    this._splitWidget.show(this.element);

    this._onMainEntrySelected = this._onEntrySelected.bind(this, this._dataProvider);
    this._onNetworkEntrySelected = this._onEntrySelected.bind(this, this._networkDataProvider);
    this._mainView.addEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onMainEntrySelected, this);
    this._networkView.addEventListener(
        WebInspector.FlameChart.Events.EntrySelected, this._onNetworkEntrySelected, this);
    WebInspector.blackboxManager.addChangeListener(this.refreshRecords, this);
  }

  /**
   * @override
   */
  dispose() {
    this._mainView.removeEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onMainEntrySelected, this);
    this._networkView.removeEventListener(
        WebInspector.FlameChart.Events.EntrySelected, this._onNetworkEntrySelected, this);
    WebInspector.blackboxManager.removeChangeListener(this.refreshRecords, this);
  }

  /**
   * @override
   * @return {?Element}
   */
  resizerElement() {
    return null;
  }

  /**
   * @override
   * @param {number} windowStartTime
   * @param {number} windowEndTime
   */
  requestWindowTimes(windowStartTime, windowEndTime) {
    this._delegate.requestWindowTimes(windowStartTime, windowEndTime);
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {
    this._delegate.select(WebInspector.TimelineSelection.fromRange(startTime, endTime));
  }

  /**
   * @override
   */
  refreshRecords() {
    this._dataProvider.reset();
    this._mainView.scheduleUpdate();
    this._networkDataProvider.reset();
    this._networkView.scheduleUpdate();
  }

  /**
   * @override
   * @param {?WebInspector.TracingModel.Event} event
   */
  highlightEvent(event) {
    var entryIndex =
        event ? this._dataProvider.entryIndexForSelection(WebInspector.TimelineSelection.fromTraceEvent(event)) : -1;
    if (entryIndex >= 0)
      this._mainView.highlightEntry(entryIndex);
    else
      this._mainView.hideHighlight();
  }

  /**
   * @override
   */
  wasShown() {
    this._mainView.scheduleUpdate();
    this._networkView.scheduleUpdate();
  }

  /**
   * @override
   * @return {!WebInspector.Widget}
   */
  view() {
    return this;
  }

  /**
   * @override
   */
  reset() {
    this._dataProvider.reset();
    this._mainView.reset();
    this._mainView.setWindowTimes(0, Infinity);
    this._networkDataProvider.reset();
    this._networkView.reset();
    this._networkView.setWindowTimes(0, Infinity);
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this._mainView.setWindowTimes(startTime, endTime);
    this._networkView.setWindowTimes(startTime, endTime);
    this._networkDataProvider.setWindowTimes(startTime, endTime);
  }

  /**
   * @override
   * @param {?WebInspector.TracingModel.Event} event
   * @param {string=} regex
   * @param {boolean=} select
   */
  highlightSearchResult(event, regex, select) {
    if (!event) {
      this._delegate.select(null);
      return;
    }
    var entryIndex = this._dataProvider._entryData.indexOf(event);
    var timelineSelection = this._dataProvider.createSelection(entryIndex);
    if (timelineSelection)
      this._delegate.select(timelineSelection);
  }

  /**
   * @override
   * @param {?WebInspector.TimelineSelection} selection
   */
  setSelection(selection) {
    var index = this._dataProvider.entryIndexForSelection(selection);
    this._mainView.setSelectedEntry(index);
    index = this._networkDataProvider.entryIndexForSelection(selection);
    this._networkView.setSelectedEntry(index);
  }

  /**
   * @param {!WebInspector.FlameChartDataProvider} dataProvider
   * @param {!WebInspector.Event} event
   */
  _onEntrySelected(dataProvider, event) {
    var entryIndex = /** @type{number} */ (event.data);
    this._delegate.select(dataProvider.createSelection(entryIndex));
  }

  /**
   * @param {boolean} enable
   * @param {boolean=} animate
   */
  enableNetworkPane(enable, animate) {
    if (enable)
      this._splitWidget.showBoth(animate);
    else
      this._splitWidget.hideSidebar(animate);
  }
};

/**
 * @unrestricted
 */
WebInspector.TimelineFlameChartView.Selection = class {
  /**
   * @param {!WebInspector.TimelineSelection} selection
   * @param {number} entryIndex
   */
  constructor(selection, entryIndex) {
    this.timelineSelection = selection;
    this.entryIndex = entryIndex;
  }
};
