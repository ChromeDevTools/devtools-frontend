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
 * @implements {PerfUI.FlameChartDataProvider}
 * @unrestricted
 */
Timeline.TimelineFlameChartDataProvider = class extends Common.Object {
  /**
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   */
  constructor(filters) {
    super();
    this.reset();
    const font = '11px ' + Host.fontFamily();
    this._font = font;
    this._filters = filters;
    /** @type {?PerfUI.FlameChart.TimelineData} */
    this._timelineData = null;
    this._currentLevel = 0;
    /** @type {?Timeline.PerformanceModel} */
    this._performanceModel = null;
    /** @type {?TimelineModel.TimelineModel} */
    this._model = null;

    this._consoleColorGenerator =
        new Common.Color.Generator({min: 30, max: 55}, {min: 70, max: 100, count: 6}, 50, 0.7);
    this._extensionColorGenerator =
        new Common.Color.Generator({min: 210, max: 300}, {min: 70, max: 100, count: 6}, 70, 0.7);

    /**
     * @param {!Object} extra
     * @return {!PerfUI.FlameChart.GroupStyle}
     */
    function buildGroupStyle(extra) {
      const defaultGroupStyle = {
        padding: 4,
        height: 17,
        collapsible: true,
        color: UI.themeSupport.patchColorText('#222', UI.ThemeSupport.ColorUsage.Foreground),
        backgroundColor: UI.themeSupport.patchColorText('white', UI.ThemeSupport.ColorUsage.Background),
        font: font,
        nestingLevel: 0,
        shareHeaderLine: true
      };
      return /** @type {!PerfUI.FlameChart.GroupStyle} */ (Object.assign(defaultGroupStyle, extra));
    }

    this._headerLevel1 = buildGroupStyle({shareHeaderLine: false});
    this._headerLevel2 = buildGroupStyle({padding: 2, nestingLevel: 1, collapsible: false});
    this._staticHeader = buildGroupStyle({collapsible: false});
    this._framesHeader = buildGroupStyle({useFirstLineForOverview: true});
    this._screenshotsHeader =
        buildGroupStyle({useFirstLineForOverview: true, nestingLevel: 1, collapsible: false, itemsHeight: 150});
    this._interactionsHeaderLevel1 = buildGroupStyle({useFirstLineForOverview: true});
    this._interactionsHeaderLevel2 = buildGroupStyle({padding: 2, nestingLevel: 1});

    /** @type {!Map<string, number>} */
    this._flowEventIndexById = new Map();
  }

  /**
   * @param {?Timeline.PerformanceModel} performanceModel
   */
  setModel(performanceModel) {
    this.reset();
    this._performanceModel = performanceModel;
    this._model = performanceModel && performanceModel.timelineModel();
  }

  /**
   * @param {!PerfUI.FlameChart.Group} group
   * @return {?Array<!SDK.TracingModel.Event>}
   */
  groupEvents(group) {
    return group._events || null;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?string}
   */
  entryTitle(entryIndex) {
    const entryTypes = Timeline.TimelineFlameChartDataProvider.EntryType;
    const entryType = this._entryType(entryIndex);
    if (entryType === entryTypes.Event) {
      const event = /** @type {!SDK.TracingModel.Event} */ (this._entryData[entryIndex]);
      if (event.phase === SDK.TracingModel.Phase.AsyncStepInto || event.phase === SDK.TracingModel.Phase.AsyncStepPast)
        return event.name + ':' + event.args['step'];
      if (event._blackboxRoot)
        return Common.UIString('Blackboxed');
      const name = Timeline.TimelineUIUtils.eventStyle(event).title;
      // TODO(yurys): support event dividers
      const detailsText =
          Timeline.TimelineUIUtils.buildDetailsTextForTraceEvent(event, this._model.targetByEvent(event));
      if (event.name === TimelineModel.TimelineModel.RecordType.JSFrame && detailsText)
        return detailsText;
      return detailsText ? Common.UIString('%s (%s)', name, detailsText) : name;
    }
    if (entryType === entryTypes.ExtensionEvent) {
      const event = /** @type {!SDK.TracingModel.Event} */ (this._entryData[entryIndex]);
      return event.name;
    }
    if (entryType === entryTypes.Screenshot)
      return '';
    let title = this._entryIndexToTitle[entryIndex];
    if (!title) {
      title = Common.UIString('Unexpected entryIndex %d', entryIndex);
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
    const event = this._entryData[index];
    return event && event._blackboxRoot ? '#888' : Timeline.FlameChartStyle.textColor;
  }

  /**
   * @override
   * @param {number} index
   * @return {?string}
   */
  entryFont(index) {
    return this._font;
  }

  reset() {
    this._currentLevel = 0;
    this._timelineData = null;
    /** @type {!Array<!SDK.FilmStripModel.Frame|!SDK.TracingModel.Event|!TimelineModel.TimelineFrame|!TimelineModel.TimelineIRModel.Phases>} */
    this._entryData = [];
    /** @type {!Array<!SDK.TracingModel.Event>} */
    this._entryParent = [];
    /** @type {!Array<!Timeline.TimelineFlameChartDataProvider.EntryType>} */
    this._entryTypeByLevel = [];
    /** @type {!Array<string>} */
    this._entryIndexToTitle = [];
    /** @type {!Array<!Timeline.TimelineFlameChartMarker>} */
    this._markers = [];
    /** @type {!Map<!Timeline.TimelineCategory, string>} */
    this._asyncColorByCategory = new Map();
    /** @type {!Map<!TimelineModel.TimelineIRModel.Phases, string>} */
    this._asyncColorByInteractionPhase = new Map();
    /** @type {!Array<!{title: string, model: !SDK.TracingModel}>} */
    this._extensionInfo = [];
    /** @type {!Map<!SDK.FilmStripModel.Frame, ?Image>} */
    this._screenshotImageCache = new Map();
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
   * @return {!PerfUI.FlameChart.TimelineData}
   */
  timelineData() {
    if (this._timelineData)
      return this._timelineData;

    this._timelineData = new PerfUI.FlameChart.TimelineData([], [], [], []);
    this._selectedGroup = null;
    if (!this._model)
      return this._timelineData;

    this._flowEventIndexById.clear();

    this._minimumBoundary = this._model.minimumRecordTime();
    this._timeSpan = this._model.isEmpty() ? 1000 : this._model.maximumRecordTime() - this._minimumBoundary;
    this._currentLevel = 0;

    this._appendFrameBars();

    this._appendHeader(Common.UIString('Interactions'), this._interactionsHeaderLevel1);
    this._appendInteractionRecords();

    const eventEntryType = Timeline.TimelineFlameChartDataProvider.EntryType.Event;

    const asyncEventGroups = TimelineModel.TimelineModel.AsyncEventGroup;
    const inputLatencies = this._model.mainThreadAsyncEvents().get(asyncEventGroups.input);
    if (inputLatencies && inputLatencies.length) {
      const title = Timeline.TimelineUIUtils.titleForAsyncEventGroup(asyncEventGroups.input);
      this._appendAsyncEventsGroup(title, inputLatencies, this._interactionsHeaderLevel2, eventEntryType);
    }
    const animations = this._model.mainThreadAsyncEvents().get(asyncEventGroups.animation);
    if (animations && animations.length) {
      const title = Timeline.TimelineUIUtils.titleForAsyncEventGroup(asyncEventGroups.animation);
      this._appendAsyncEventsGroup(title, animations, this._interactionsHeaderLevel2, eventEntryType);
    }
    const threads = this._model.virtualThreads();
    if (!Runtime.experiments.isEnabled('timelinePerFrameTrack')) {
      this._appendThreadTimelineData(
          Common.UIString('Main'), this._model.mainThreadEvents(), this._model.mainThreadAsyncEvents(), true,
          true /* selected */);
    } else {
      this._appendThreadTimelineData(
          Common.UIString('Page'), this._model.eventsForFrame(TimelineModel.TimelineModel.PageFrame.mainFrameId),
          this._model.mainThreadAsyncEvents(), true, true /* selected */);
      for (const frame of this._model.rootFrames()) {
        // Ignore top frame itself, since it should be part of page events.
        frame.children.forEach(this._appendFrameEvents.bind(this, 0));
      }
    }
    const compositorThreads = threads.filter(thread => thread.name.startsWith('CompositorTileWorker'));
    const otherThreads = threads.filter(thread => !thread.name.startsWith('CompositorTileWorker'));
    if (compositorThreads.length) {
      this._appendHeader(Common.UIString('Raster'), this._headerLevel1);
      for (let i = 0; i < compositorThreads.length; ++i) {
        this._appendSyncEvents(
            compositorThreads[i].events, Common.UIString('Rasterizer Thread %d', i), this._headerLevel2,
            eventEntryType);
      }
    }
    this._appendGPUEvents();

    otherThreads.forEach(
        thread => this._appendThreadTimelineData(
            thread.name || Common.UIString('Thread %d', thread.id), thread.events, thread.asyncEventsByGroup));

    for (let extensionIndex = 0; extensionIndex < this._extensionInfo.length; extensionIndex++)
      this._innerAppendExtensionEvents(extensionIndex);

    this._markers.sort((a, b) => a.startTime() - b.startTime());
    this._timelineData.markers = this._markers;
    this._flowEventIndexById.clear();

    this._timelineData.selectedGroup = this._selectedGroup;
    return this._timelineData;
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
   * @param {number} startTime
   * @param {number} endTime
   * @param {!TimelineModel.TimelineModelFilter} filter
   * @return {!Array<number>}
   */
  search(startTime, endTime, filter) {
    const result = [];
    const entryTypes = Timeline.TimelineFlameChartDataProvider.EntryType;
    this.timelineData();
    for (let i = 0; i < this._entryData.length; ++i) {
      if (this._entryType(i) !== entryTypes.Event)
        continue;
      const event = /** @type {!SDK.TracingModel.Event} */ (this._entryData[i]);
      if (event.startTime > endTime)
        continue;
      if ((event.endTime || event.startTime) < startTime)
        continue;
      if (filter.accept(event))
        result.push(i);
    }
    result.sort(
        (a, b) => SDK.TracingModel.Event.compareStartTime(
            /** @type {!SDK.TracingModel.Event} */ (this._entryData[a]),
            /** @type {!SDK.TracingModel.Event} */ (this._entryData[b])));
    return result;
  }

  /**
   * @param {number} level
   * @param {!TimelineModel.TimelineModel.PageFrame} frame
   */
  _appendFrameEvents(level, frame) {
    const events = this._model.eventsForFrame(frame.id);
    const clonedHeader = Object.assign({}, this._headerLevel1);
    clonedHeader.nestingLevel = level;
    this._appendSyncEvents(
        events, Timeline.TimelineUIUtils.displayNameForFrame(frame),
        /** @type {!PerfUI.FlameChart.GroupStyle} */ (clonedHeader),
        Timeline.TimelineFlameChartDataProvider.EntryType.Event);
    frame.children.forEach(this._appendFrameEvents.bind(this, level + 1));
  }

  /**
   * @param {string} threadTitle
   * @param {!Array<!SDK.TracingModel.Event>} syncEvents
   * @param {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array<!SDK.TracingModel.AsyncEvent>>} asyncEvents
   * @param {boolean=} forceExpanded
   * @param {boolean=} selected
   */
  _appendThreadTimelineData(threadTitle, syncEvents, asyncEvents, forceExpanded, selected) {
    const entryType = Timeline.TimelineFlameChartDataProvider.EntryType.Event;
    this._appendAsyncEvents(asyncEvents);
    this._appendSyncEvents(syncEvents, threadTitle, this._headerLevel1, entryType, forceExpanded, selected);
  }

  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @param {string} title
   * @param {!PerfUI.FlameChart.GroupStyle} style
   * @param {!Timeline.TimelineFlameChartDataProvider.EntryType} entryType
   * @param {boolean=} forceExpanded
   * @param {boolean=} selected
   */
  _appendSyncEvents(events, title, style, entryType, forceExpanded, selected) {
    const isExtension = entryType === Timeline.TimelineFlameChartDataProvider.EntryType.ExtensionEvent;
    const openEvents = [];
    const flowEventsEnabled = Runtime.experiments.isEnabled('timelineFlowEvents');
    const blackboxingEnabled = !isExtension && Runtime.experiments.isEnabled('blackboxJSFramesOnTimeline');
    let maxStackDepth = 0;
    const markerEventsFilter = Timeline.TimelineUIUtils.paintEventsFilter();
    for (let i = 0; i < events.length; ++i) {
      const e = events[i];
      if (!isExtension && TimelineModel.TimelineModel.isMarkerEvent(e) && markerEventsFilter.accept(e)) {
        this._markers.push(new Timeline.TimelineFlameChartMarker(
            e.startTime, e.startTime - this._model.minimumRecordTime(),
            Timeline.TimelineUIUtils.markerStyleForEvent(e)));
      }
      if (!SDK.TracingModel.isFlowPhase(e.phase)) {
        if (!e.endTime && e.phase !== SDK.TracingModel.Phase.Instant)
          continue;
        if (SDK.TracingModel.isAsyncPhase(e.phase))
          continue;
        if (!isExtension && !this._isVisible(e))
          continue;
      }
      while (openEvents.length && openEvents.peekLast().endTime <= e.startTime)
        openEvents.pop();
      e._blackboxRoot = false;
      if (blackboxingEnabled && this._isBlackboxedEvent(e)) {
        const parent = openEvents.peekLast();
        if (parent && parent._blackboxRoot)
          continue;
        e._blackboxRoot = true;
      }
      if (title) {
        const group = this._appendHeader(title, style, forceExpanded, true /* selectable */);
        group._events = events;
        if (selected)
          this._selectedGroup = group;
        title = '';
      }

      const level = this._currentLevel + openEvents.length;
      if (flowEventsEnabled)
        this._appendFlowEvent(e, level);
      const index = this._appendEvent(e, level);
      if (openEvents.length)
        this._entryParent[index] = openEvents.peekLast();
      if (!isExtension && TimelineModel.TimelineModel.isMarkerEvent(e))
        this._timelineData.entryTotalTimes[this._entryData.length] = undefined;

      maxStackDepth = Math.max(maxStackDepth, openEvents.length + 1);
      if (e.endTime)
        openEvents.push(e);
    }
    this._entryTypeByLevel.length = this._currentLevel + maxStackDepth;
    this._entryTypeByLevel.fill(entryType, this._currentLevel);
    this._currentLevel += maxStackDepth;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  _isBlackboxedEvent(event) {
    if (event.name !== TimelineModel.TimelineModel.RecordType.JSFrame)
      return false;
    const url = event.args['data']['url'];
    return url && this._isBlackboxedURL(url);
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  _isBlackboxedURL(url) {
    return Bindings.blackboxManager.isBlackboxedURL(url);
  }

  /**
   * @param {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array<!SDK.TracingModel.AsyncEvent>>} asyncEvents
   */
  _appendAsyncEvents(asyncEvents) {
    const entryType = Timeline.TimelineFlameChartDataProvider.EntryType.Event;
    const groups = TimelineModel.TimelineModel.AsyncEventGroup;
    const groupArray = Object.keys(groups).map(key => groups[key]);

    groupArray.remove(groups.animation);
    groupArray.remove(groups.input);

    for (let groupIndex = 0; groupIndex < groupArray.length; ++groupIndex) {
      const group = groupArray[groupIndex];
      const events = asyncEvents.get(group);
      if (!events)
        continue;
      const title = Timeline.TimelineUIUtils.titleForAsyncEventGroup(group);
      this._appendAsyncEventsGroup(title, events, this._headerLevel1, entryType, true /* selectable */);
    }
  }

  /**
   * @param {string} header
   * @param {!Array<!SDK.TracingModel.AsyncEvent>} events
   * @param {!PerfUI.FlameChart.GroupStyle} style
   * @param {!Timeline.TimelineFlameChartDataProvider.EntryType} entryType
   * @param {boolean=} selectable
   */
  _appendAsyncEventsGroup(header, events, style, entryType, selectable) {
    const lastUsedTimeByLevel = [];
    let group;
    for (let i = 0; i < events.length; ++i) {
      const asyncEvent = events[i];
      if (!this._isVisible(asyncEvent))
        continue;
      if (!group) {
        group = this._appendHeader(header, style, false /* expanded */, selectable);
        if (selectable)
          group._events = TimelineModel.TimelineModel.buildNestableSyncEventsFromAsync(events);
      }
      const startTime = asyncEvent.startTime;
      let level;
      for (level = 0; level < lastUsedTimeByLevel.length && lastUsedTimeByLevel[level] > startTime; ++level) {
      }
      this._appendAsyncEvent(asyncEvent, this._currentLevel + level);
      lastUsedTimeByLevel[level] = asyncEvent.endTime;
    }
    this._entryTypeByLevel.length = this._currentLevel + lastUsedTimeByLevel.length;
    this._entryTypeByLevel.fill(entryType, this._currentLevel);
    this._currentLevel += lastUsedTimeByLevel.length;
  }

  _appendGPUEvents() {
    const eventType = Timeline.TimelineFlameChartDataProvider.EntryType.Event;
    const gpuEvents = this._model.gpuEvents();
    if (this._appendSyncEvents(gpuEvents, Common.UIString('GPU'), this._headerLevel1, eventType, false))
      ++this._currentLevel;
  }

  _appendInteractionRecords() {
    this._performanceModel.interactionRecords().forEach(this._appendSegment, this);
    this._entryTypeByLevel[this._currentLevel++] = Timeline.TimelineFlameChartDataProvider.EntryType.InteractionRecord;
  }

  _appendFrameBars() {
    const screenshots = this._performanceModel.filmStripModel().frames();
    const hasFilmStrip = !!screenshots.length;
    this._framesHeader.collapsible = hasFilmStrip;
    this._appendHeader(Common.UIString('Frames'), this._framesHeader);
    this._frameGroup = this._timelineData.groups.peekLast();
    const style = Timeline.TimelineUIUtils.markerStyleForFrame();
    this._entryTypeByLevel[this._currentLevel] = Timeline.TimelineFlameChartDataProvider.EntryType.Frame;
    for (const frame of this._performanceModel.frames()) {
      this._markers.push(new Timeline.TimelineFlameChartMarker(
          frame.startTime, frame.startTime - this._model.minimumRecordTime(), style));
      this._appendFrame(frame);
    }
    ++this._currentLevel;
    if (!hasFilmStrip)
      return;
    this._appendHeader('', this._screenshotsHeader);
    this._entryTypeByLevel[this._currentLevel] = Timeline.TimelineFlameChartDataProvider.EntryType.Screenshot;
    let prevTimestamp;
    for (const screenshot of screenshots) {
      this._entryData.push(screenshot);
      this._timelineData.entryLevels.push(this._currentLevel);
      this._timelineData.entryStartTimes.push(screenshot.timestamp);
      if (prevTimestamp)
        this._timelineData.entryTotalTimes.push(screenshot.timestamp - prevTimestamp);
      prevTimestamp = screenshot.timestamp;
    }
    if (screenshots.length)
      this._timelineData.entryTotalTimes.push(this._model.maximumRecordTime() - prevTimestamp);
    ++this._currentLevel;
  }

  /**
   * @param {number} entryIndex
   * @return {!Timeline.TimelineFlameChartDataProvider.EntryType}
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
    let time = '';
    let title;
    let warning;
    const type = this._entryType(entryIndex);
    if (type === Timeline.TimelineFlameChartDataProvider.EntryType.Event) {
      const event = /** @type {!SDK.TracingModel.Event} */ (this._entryData[entryIndex]);
      const totalTime = event.duration;
      const selfTime = event.selfTime;
      const /** @const */ eps = 1e-6;
      if (typeof totalTime === 'number') {
        time = Math.abs(totalTime - selfTime) > eps && selfTime > eps ?
            Common.UIString(
                '%s (self %s)', Number.millisToString(totalTime, true), Number.millisToString(selfTime, true)) :
            Number.millisToString(totalTime, true);
      }
      title = this.entryTitle(entryIndex);
      warning = Timeline.TimelineUIUtils.eventWarning(event);
    } else if (type === Timeline.TimelineFlameChartDataProvider.EntryType.Frame) {
      const frame = /** @type {!TimelineModel.TimelineFrame} */ (this._entryData[entryIndex]);
      time = Common.UIString(
          '%s ~ %.0f\xa0fps', Number.preciseMillisToString(frame.duration, 1), (1000 / frame.duration));
      title = frame.idle ? Common.UIString('Idle Frame') : Common.UIString('Frame');
      if (frame.hasWarnings()) {
        warning = createElement('span');
        warning.textContent = Common.UIString('Long frame');
      }
    } else {
      return null;
    }
    const element = createElement('div');
    const root = UI.createShadowRootWithCoreStyles(element, 'timeline/timelineFlamechartPopover.css');
    const contents = root.createChild('div', 'timeline-flamechart-popover');
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
      let color = cache.get(key);
      if (color)
        return color;
      const parsedColor = Common.Color.parse(lookupColor(key));
      color = parsedColor.setAlpha(0.7).asString(Common.Color.Format.RGBA) || '';
      cache.set(key, color);
      return color;
    }

    const entryTypes = Timeline.TimelineFlameChartDataProvider.EntryType;
    const type = this._entryType(entryIndex);
    if (type === entryTypes.Event) {
      const event = /** @type {!SDK.TracingModel.Event} */ (this._entryData[entryIndex]);
      if (!SDK.TracingModel.isAsyncPhase(event.phase))
        return this._colorForEvent(event);
      if (event.hasCategory(TimelineModel.TimelineModel.Category.Console) ||
          event.hasCategory(TimelineModel.TimelineModel.Category.UserTiming))
        return this._consoleColorGenerator.colorForID(event.name);
      if (event.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)) {
        const phase =
            TimelineModel.TimelineIRModel.phaseForEvent(event) || TimelineModel.TimelineIRModel.Phases.Uncategorized;
        return patchColorAndCache(
            this._asyncColorByInteractionPhase, phase, Timeline.TimelineUIUtils.interactionPhaseColor);
      }
      const category = Timeline.TimelineUIUtils.eventStyle(event).category;
      return patchColorAndCache(this._asyncColorByCategory, category, () => category.color);
    }
    if (type === entryTypes.Frame)
      return 'white';
    if (type === entryTypes.InteractionRecord)
      return 'transparent';
    if (type === entryTypes.ExtensionEvent) {
      const event = /** @type {!SDK.TracingModel.Event} */ (this._entryData[entryIndex]);
      return this._extensionColorGenerator.colorForID(event.name);
    }
    return '';
  }

  /**
   * @param {number} entryIndex
   * @param {!CanvasRenderingContext2D} context
   * @param {?string} text
   * @param {number} barX
   * @param {number} barY
   * @param {number} barWidth
   * @param {number} barHeight
   */
  _drawFrame(entryIndex, context, text, barX, barY, barWidth, barHeight) {
    const /** @const */ hPadding = 1;
    const frame = /** @type {!TimelineModel.TimelineFrame} */ (this._entryData[entryIndex]);
    barX += hPadding;
    barWidth -= 2 * hPadding;
    context.fillStyle = frame.idle ? 'white' : (frame.hasWarnings() ? '#fad1d1' : '#d7f0d1');
    context.fillRect(barX, barY, barWidth, barHeight);

    const frameDurationText = Number.preciseMillisToString(frame.duration, 1);
    const textWidth = context.measureText(frameDurationText).width;
    if (textWidth <= barWidth) {
      context.fillStyle = this.textColor(entryIndex);
      context.fillText(frameDurationText, barX + (barWidth - textWidth) / 2, barY + barHeight - 4);
    }
  }

  /**
   * @param {number} entryIndex
   * @param {!CanvasRenderingContext2D} context
   * @param {number} barX
   * @param {number} barY
   * @param {number} barWidth
   * @param {number} barHeight
   */
  async _drawScreenshot(entryIndex, context, barX, barY, barWidth, barHeight) {
    const screenshot = /** @type {!SDK.FilmStripModel.Frame} */ (this._entryData[entryIndex]);
    if (!this._screenshotImageCache.has(screenshot)) {
      this._screenshotImageCache.set(screenshot, null);
      const data = await screenshot.imageDataPromise();
      const image = await UI.loadImageFromData(data);
      this._screenshotImageCache.set(screenshot, image);
      this.dispatchEventToListeners(Timeline.TimelineFlameChartDataProvider.Events.DataChanged);
      return;
    }

    const image = this._screenshotImageCache.get(screenshot);
    if (!image)
      return;
    const imageX = barX + 1;
    const imageY = barY + 1;
    const imageHeight = barHeight - 2;
    const scale = imageHeight / image.naturalHeight;
    const imageWidth = Math.floor(image.naturalWidth * scale);
    context.save();
    context.beginPath();
    context.rect(barX, barY, barWidth, barHeight);
    context.clip();
    context.drawImage(image, imageX, imageY, imageWidth, imageHeight);
    context.strokeStyle = '#ccc';
    context.strokeRect(imageX - 0.5, imageY - 0.5, Math.min(barWidth - 1, imageWidth + 1), imageHeight);
    context.restore();
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
    const data = this._entryData[entryIndex];
    const type = this._entryType(entryIndex);
    const entryTypes = Timeline.TimelineFlameChartDataProvider.EntryType;

    if (type === entryTypes.Frame) {
      this._drawFrame(entryIndex, context, text, barX, barY, barWidth, barHeight);
      return true;
    }

    if (type === entryTypes.Screenshot) {
      this._drawScreenshot(entryIndex, context, barX, barY, barWidth, barHeight);
      return true;
    }

    if (type === entryTypes.InteractionRecord) {
      const color = Timeline.TimelineUIUtils.interactionPhaseColor(
          /** @type {!TimelineModel.TimelineIRModel.Phases} */ (data));
      context.fillStyle = color;
      context.fillRect(barX, barY, barWidth - 1, 2);
      context.fillRect(barX, barY - 3, 2, 3);
      context.fillRect(barX + barWidth - 3, barY - 3, 2, 3);
      return false;
    }

    if (type === entryTypes.Event) {
      const event = /** @type {!SDK.TracingModel.Event} */ (data);
      if (event.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)) {
        const timeWaitingForMainThread = TimelineModel.TimelineData.forEvent(event).timeWaitingForMainThread;
        if (timeWaitingForMainThread) {
          context.fillStyle = 'hsla(0, 70%, 60%, 1)';
          const width = Math.floor(unclippedBarX - barX + timeWaitingForMainThread * timeToPixels);
          context.fillRect(barX, barY + barHeight - 3, width, 2);
        }
      }
      if (TimelineModel.TimelineData.forEvent(event).warning)
        paintWarningDecoration(barX, barWidth - 1.5);
    }

    /**
     * @param {number} x
     * @param {number} width
     */
    function paintWarningDecoration(x, width) {
      const /** @const */ triangleSize = 8;
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
    const entryTypes = Timeline.TimelineFlameChartDataProvider.EntryType;
    const type = this._entryType(entryIndex);
    if (type === entryTypes.Frame)
      return true;
    if (type === entryTypes.Screenshot)
      return true;

    if (type === entryTypes.Event) {
      const event = /** @type {!SDK.TracingModel.Event} */ (this._entryData[entryIndex]);
      return !!TimelineModel.TimelineData.forEvent(event).warning;
    }
    return false;
  }

  /**
   * @param {!{title: string, model: !SDK.TracingModel}} entry
   */
  appendExtensionEvents(entry) {
    this._extensionInfo.push(entry);
    if (this._timelineData)
      this._innerAppendExtensionEvents(this._extensionInfo.length - 1);
  }

  /**
   * @param {number} index
   */
  _innerAppendExtensionEvents(index) {
    const entry = this._extensionInfo[index];
    const entryType = Timeline.TimelineFlameChartDataProvider.EntryType.ExtensionEvent;
    const allThreads = [].concat(...entry.model.sortedProcesses().map(process => process.sortedThreads()));
    if (!allThreads.length)
      return;

    this._appendHeader(entry.title, this._headerLevel1);
    for (const thread of allThreads) {
      this._appendAsyncEventsGroup(
          thread.name(), thread.asyncEvents(), this._headerLevel2, entryType, true /* selectable */);
      this._appendSyncEvents(thread.events(), thread.name(), this._headerLevel2, entryType, false);
    }
  }

  /**
   * @param {string} title
   * @param {!PerfUI.FlameChart.GroupStyle} style
   * @param {boolean=} expanded
   * @param {boolean=} selectable
   * @return {!PerfUI.FlameChart.Group}
   */
  _appendHeader(title, style, expanded, selectable) {
    const group =
        {startLevel: this._currentLevel, name: title, expanded: expanded, style: style, selectable: selectable};
    this._timelineData.groups.push(group);
    return group;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {number} level
   * @return {number}
   */
  _appendEvent(event, level) {
    const index = this._entryData.length;
    this._entryData.push(event);
    this._timelineData.entryLevels[index] = level;
    this._timelineData.entryTotalTimes[index] =
        event.duration || Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
    this._timelineData.entryStartTimes[index] = event.startTime;
    event[Timeline.TimelineFlameChartDataProvider._indexSymbol] = index;
    return index;
  }

  /**
   * @param {!SDK.TracingModel.AsyncEvent} asyncEvent
   * @param {number} level
   */
  _appendAsyncEvent(asyncEvent, level) {
    if (SDK.TracingModel.isNestableAsyncPhase(asyncEvent.phase)) {
      // FIXME: also add steps once we support event nesting in the FlameChart.
      this._appendEvent(asyncEvent, level);
      return;
    }
    const steps = asyncEvent.steps;
    // If we have past steps, put the end event for each range rather than start one.
    const eventOffset = steps.length > 1 && steps[1].phase === SDK.TracingModel.Phase.AsyncStepPast ? 1 : 0;
    for (let i = 0; i < steps.length - 1; ++i) {
      const index = this._entryData.length;
      this._entryData.push(steps[i + eventOffset]);
      const startTime = steps[i].startTime;
      this._timelineData.entryLevels[index] = level;
      this._timelineData.entryTotalTimes[index] = steps[i + 1].startTime - startTime;
      this._timelineData.entryStartTimes[index] = startTime;
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {number} level
   */
  _appendFlowEvent(event, level) {
    const timelineData = this._timelineData;
    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {number}
     */
    function pushStartFlow(event) {
      const flowIndex = timelineData.flowStartTimes.length;
      timelineData.flowStartTimes.push(event.startTime);
      timelineData.flowStartLevels.push(level);
      return flowIndex;
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @param {number} flowIndex
     */
    function pushEndFlow(event, flowIndex) {
      timelineData.flowEndTimes[flowIndex] = event.startTime;
      timelineData.flowEndLevels[flowIndex] = level;
    }

    switch (event.phase) {
      case SDK.TracingModel.Phase.FlowBegin:
        this._flowEventIndexById.set(event.id, pushStartFlow(event));
        break;
      case SDK.TracingModel.Phase.FlowStep:
        pushEndFlow(event, this._flowEventIndexById.get(event.id));
        this._flowEventIndexById.set(event.id, pushStartFlow(event));
        break;
      case SDK.TracingModel.Phase.FlowEnd:
        pushEndFlow(event, this._flowEventIndexById.get(event.id));
        this._flowEventIndexById.delete(event.id);
        break;
    }
  }

  /**
   * @param {!TimelineModel.TimelineFrame} frame
   */
  _appendFrame(frame) {
    const index = this._entryData.length;
    this._entryData.push(frame);
    this._entryIndexToTitle[index] = Number.millisToString(frame.duration, true);
    this._timelineData.entryLevels[index] = this._currentLevel;
    this._timelineData.entryTotalTimes[index] = frame.duration;
    this._timelineData.entryStartTimes[index] = frame.startTime;
  }

  /**
   * @param {!Common.Segment} segment
   */
  _appendSegment(segment) {
    const index = this._entryData.length;
    this._entryData.push(/** @type {!TimelineModel.TimelineIRModel.Phases} */ (segment.data));
    this._entryIndexToTitle[index] = /** @type {string} */ (segment.data);
    this._timelineData.entryLevels[index] = this._currentLevel;
    this._timelineData.entryTotalTimes[index] = segment.end - segment.begin;
    this._timelineData.entryStartTimes[index] = segment.begin;
  }

  /**
   * @param {number} entryIndex
   * @return {?Timeline.TimelineSelection}
   */
  createSelection(entryIndex) {
    const type = this._entryType(entryIndex);
    let timelineSelection = null;
    if (type === Timeline.TimelineFlameChartDataProvider.EntryType.Event) {
      timelineSelection = Timeline.TimelineSelection.fromTraceEvent(
          /** @type {!SDK.TracingModel.Event} */ (this._entryData[entryIndex]));
    } else if (type === Timeline.TimelineFlameChartDataProvider.EntryType.Frame) {
      timelineSelection = Timeline.TimelineSelection.fromFrame(
          /** @type {!TimelineModel.TimelineFrame} */ (this._entryData[entryIndex]));
    }
    if (timelineSelection)
      this._lastSelection = new Timeline.TimelineFlameChartView.Selection(timelineSelection, entryIndex);
    return timelineSelection;
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
   * @param {number} entryIndex
   * @return {boolean}
   */
  canJumpToEntry(entryIndex) {
    return false;
  }

  /**
   * @param {?Timeline.TimelineSelection} selection
   * @return {number}
   */
  entryIndexForSelection(selection) {
    if (!selection || selection.type() === Timeline.TimelineSelection.Type.Range)
      return -1;

    if (this._lastSelection && this._lastSelection.timelineSelection.object() === selection.object())
      return this._lastSelection.entryIndex;
    const index = this._entryData.indexOf(
        /** @type {!SDK.TracingModel.Event|!TimelineModel.TimelineFrame|!TimelineModel.TimelineIRModel.Phases} */
        (selection.object()));
    if (index !== -1)
      this._lastSelection = new Timeline.TimelineFlameChartView.Selection(selection, index);
    return index;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  _isVisible(event) {
    return this._filters.every(filter => filter.accept(event));
  }

  /**
   * @param {number} entryIndex
   * @return {boolean}
   */
  buildFlowForInitiator(entryIndex) {
    if (this._lastInitiatorEntry === entryIndex)
      return false;
    this._lastInitiatorEntry = entryIndex;
    let event = this.eventByIndex(entryIndex);
    const td = this._timelineData;
    td.flowStartTimes = [];
    td.flowStartLevels = [];
    td.flowEndTimes = [];
    td.flowEndLevels = [];
    while (event) {
      // Find the closest ancestor with an initiator.
      let initiator;
      for (; event; event = this._eventParent(event)) {
        initiator = TimelineModel.TimelineData.forEvent(event).initiator();
        if (initiator)
          break;
      }
      if (!initiator)
        break;
      const eventIndex = event[Timeline.TimelineFlameChartDataProvider._indexSymbol];
      const initiatorIndex = initiator[Timeline.TimelineFlameChartDataProvider._indexSymbol];
      td.flowStartTimes.push(initiator.endTime || initiator.startTime);
      td.flowStartLevels.push(td.entryLevels[initiatorIndex]);
      td.flowEndTimes.push(event.startTime);
      td.flowEndLevels.push(td.entryLevels[eventIndex]);
      event = initiator;
    }
    return true;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {?SDK.TracingModel.Event}
   */
  _eventParent(event) {
    return this._entryParent[event[Timeline.TimelineFlameChartDataProvider._indexSymbol]] || null;
  }

  /**
   * @param {number} entryIndex
   * @return {?SDK.TracingModel.Event}
   */
  eventByIndex(entryIndex) {
    return entryIndex >= 0 && this._entryType(entryIndex) === Timeline.TimelineFlameChartDataProvider.EntryType.Event ?
        /** @type {!SDK.TracingModel.Event} */ (this._entryData[entryIndex]) :
        null;
  }

  /**
   * @param {function(!SDK.TracingModel.Event):string} colorForEvent
   */
  setEventColorMapping(colorForEvent) {
    this._colorForEvent = colorForEvent;
  }
};

Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs = 0.001;
Timeline.TimelineFlameChartDataProvider._indexSymbol = Symbol('index');

/** @enum {symbol} */
Timeline.TimelineFlameChartDataProvider.Events = {
  DataChanged: Symbol('DataChanged')
};

/** @enum {symbol} */
Timeline.TimelineFlameChartDataProvider.EntryType = {
  Frame: Symbol('Frame'),
  Event: Symbol('Event'),
  InteractionRecord: Symbol('InteractionRecord'),
  ExtensionEvent: Symbol('ExtensionEvent'),
  Screenshot: Symbol('Screenshot'),
};
