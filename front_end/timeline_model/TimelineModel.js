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
 * @unrestricted
 */
TimelineModel.TimelineModel = class {
  constructor() {
    this._reset();
  }

  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @param {function(!SDK.TracingModel.Event)} onStartEvent
   * @param {function(!SDK.TracingModel.Event)} onEndEvent
   * @param {function(!SDK.TracingModel.Event,?SDK.TracingModel.Event)|undefined=} onInstantEvent
   * @param {number=} startTime
   * @param {number=} endTime
   * @param {function(!SDK.TracingModel.Event):boolean=} filter
   */
  static forEachEvent(events, onStartEvent, onEndEvent, onInstantEvent, startTime, endTime, filter) {
    startTime = startTime || 0;
    endTime = endTime || Infinity;
    var stack = [];
    var startEvent = TimelineModel.TimelineModel._topLevelEventEndingAfter(events, startTime);
    for (var i = startEvent; i < events.length; ++i) {
      var e = events[i];
      if ((e.endTime || e.startTime) < startTime)
        continue;
      if (e.startTime >= endTime)
        break;
      if (SDK.TracingModel.isAsyncPhase(e.phase) || SDK.TracingModel.isFlowPhase(e.phase))
        continue;
      while (stack.length && stack.peekLast().endTime <= e.startTime)
        onEndEvent(stack.pop());
      if (filter && !filter(e))
        continue;
      if (e.duration) {
        onStartEvent(e);
        stack.push(e);
      } else {
        onInstantEvent && onInstantEvent(e, stack.peekLast() || null);
      }
    }
    while (stack.length)
      onEndEvent(stack.pop());
  }

  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @param {number} time
   */
  static _topLevelEventEndingAfter(events, time) {
    var index = events.upperBound(time, (time, event) => time - event.startTime) - 1;
    while (index > 0 && !SDK.TracingModel.isTopLevelEvent(events[index]))
      index--;
    return Math.max(index, 0);
  }

  /**
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  static isVisible(filters, event) {
    for (var i = 0; i < filters.length; ++i) {
      if (!filters[i].accept(event))
        return false;
    }
    return true;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  static isMarkerEvent(event) {
    const recordTypes = TimelineModel.TimelineModel.RecordType;
    switch (event.name) {
      case recordTypes.TimeStamp:
      case recordTypes.MarkFirstPaint:
      case recordTypes.MarkFMP:
      case recordTypes.MarkFMPCandidate:
        return true;
      case recordTypes.MarkDOMContent:
      case recordTypes.MarkLoad:
        return event.args['data']['isMainFrame'];
      default:
        return false;
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {string} field
   * @return {string}
   */
  static globalEventId(event, field) {
    var data = event.args['data'] || event.args['beginData'];
    var id = data && data[field];
    if (!id)
      return '';
    return `${event.thread.process().id()}.${id}`;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {string}
   */
  static eventFrameId(event) {
    return TimelineModel.TimelineModel.globalEventId(event, 'frame');
  }

  /**
   * @return {!Array<!SDK.CPUProfileDataModel>}
   */
  cpuProfiles() {
    return this._cpuProfiles;
  }

  /**
   * @return {?string}
   */
  sessionId() {
    return this._sessionId;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {?SDK.Target}
   */
  targetByEvent(event) {
    // FIXME: Consider returning null for loaded traces.
    var workerId = this._workerIdByThread.get(event.thread);
    var mainTarget = SDK.targetManager.mainTarget();
    return workerId ? SDK.targetManager.targetById(workerId) : mainTarget;
  }

  /**
   * @param {!SDK.TracingModel} tracingModel
   * @param {boolean=} produceTraceStartedInPage
   */
  setEvents(tracingModel, produceTraceStartedInPage) {
    this._reset();
    this._resetProcessingState();

    this._minimumRecordTime = tracingModel.minimumRecordTime();
    this._maximumRecordTime = tracingModel.maximumRecordTime();

    var metadataEvents = this._processMetadataEvents(tracingModel, !!produceTraceStartedInPage);
    if (Runtime.experiments.isEnabled('timelineShowAllProcesses')) {
      var lastPageMetaEvent = metadataEvents.page.peekLast();
      for (var process of tracingModel.sortedProcesses()) {
        for (var thread of process.sortedThreads())
          this._processThreadEvents(tracingModel, 0, Infinity, thread, thread === lastPageMetaEvent.thread);
      }
    } else {
      var startTime = 0;
      for (var i = 0, length = metadataEvents.page.length; i < length; i++) {
        var metaEvent = metadataEvents.page[i];
        var process = metaEvent.thread.process();
        var endTime = i + 1 < length ? metadataEvents.page[i + 1].startTime : Infinity;
        this._currentPage = metaEvent.args['data'] && metaEvent.args['data']['page'];
        for (var thread of process.sortedThreads()) {
          if (thread.name() === TimelineModel.TimelineModel.WorkerThreadName) {
            var workerMetaEvent = metadataEvents.workers.find(e => e.args['data']['workerThreadId'] === thread.id());
            if (!workerMetaEvent)
              continue;
            var workerId = workerMetaEvent.args['data']['workerId'];
            if (workerId)
              this._workerIdByThread.set(thread, workerId);
          }
          this._processThreadEvents(tracingModel, startTime, endTime, thread, thread === metaEvent.thread);
        }
        startTime = endTime;
      }
    }
    this._inspectedTargetEvents.sort(SDK.TracingModel.Event.compareStartTime);

    this._processBrowserEvents(tracingModel);
    this._buildGPUEvents(tracingModel);
    this._insertFirstPaintEvent();
    this._resetProcessingState();
  }

  /**
   * @param {!SDK.TracingModel} tracingModel
   * @param {boolean} produceTraceStartedInPage
   * @return {!TimelineModel.TimelineModel.MetadataEvents}
   */
  _processMetadataEvents(tracingModel, produceTraceStartedInPage) {
    var metadataEvents = tracingModel.devToolsMetadataEvents();

    var pageDevToolsMetadataEvents = [];
    var workersDevToolsMetadataEvents = [];
    for (var event of metadataEvents) {
      if (event.name === TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage) {
        pageDevToolsMetadataEvents.push(event);
        var frames = ((event.args['data'] && event.args['data']['frames']) || []);
        frames.forEach(payload => this._addPageFrame(event, payload));
        var rootFrame = this.rootFrames()[0];
        if (rootFrame && rootFrame.url)
          this._pageURL = rootFrame.url;
      } else if (event.name === TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingSessionIdForWorker) {
        workersDevToolsMetadataEvents.push(event);
      } else if (event.name === TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInBrowser) {
        console.assert(!this._mainFrameNodeId, 'Multiple sessions in trace');
        this._mainFrameNodeId = event.args['frameTreeNodeId'];
      }
    }
    if (!pageDevToolsMetadataEvents.length) {
      // The trace is probably coming not from DevTools. Make a mock Metadata event.
      var pageMetaEvent = produceTraceStartedInPage ? this._makeMockPageMetadataEvent(tracingModel) : null;
      if (!pageMetaEvent) {
        console.error(TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage + ' event not found.');
        return {page: [], workers: []};
      }
      pageDevToolsMetadataEvents.push(pageMetaEvent);
    }
    var sessionId =
        pageDevToolsMetadataEvents[0].args['sessionId'] || pageDevToolsMetadataEvents[0].args['data']['sessionId'];
    this._sessionId = sessionId;

    var mismatchingIds = new Set();
    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {boolean}
     */
    function checkSessionId(event) {
      var args = event.args;
      // FIXME: put sessionId into args["data"] for TracingStartedInPage event.
      if (args['data'])
        args = args['data'];
      var id = args['sessionId'];
      if (id === sessionId)
        return true;
      mismatchingIds.add(id);
      return false;
    }
    var result = {
      page: pageDevToolsMetadataEvents.filter(checkSessionId).sort(SDK.TracingModel.Event.compareStartTime),
      workers: workersDevToolsMetadataEvents.filter(checkSessionId).sort(SDK.TracingModel.Event.compareStartTime)
    };
    if (mismatchingIds.size) {
      Common.console.error(
          'Timeline recording was started in more than one page simultaneously. Session id mismatch: ' +
          this._sessionId + ' and ' + mismatchingIds.valuesArray() + '.');
    }
    return result;
  }

  /**
   * @param {!SDK.TracingModel} tracingModel
   * @return {?SDK.TracingModel.Event}
   */
  _makeMockPageMetadataEvent(tracingModel) {
    var rendererMainThreadName = TimelineModel.TimelineModel.RendererMainThreadName;
    // FIXME: pick up the first renderer process for now.
    var process = tracingModel.sortedProcesses().filter(function(p) {
      return p.threadByName(rendererMainThreadName);
    })[0];
    var thread = process && process.threadByName(rendererMainThreadName);
    if (!thread)
      return null;
    var pageMetaEvent = new SDK.TracingModel.Event(
        SDK.TracingModel.DevToolsMetadataEventCategory,
        TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage, SDK.TracingModel.Phase.Metadata,
        tracingModel.minimumRecordTime(), thread);
    pageMetaEvent.addArgs({'data': {'sessionId': 'mockSessionId'}});
    return pageMetaEvent;
  }

  _insertFirstPaintEvent() {
    if (!this._firstCompositeLayers)
      return;

    // First Paint is actually a DrawFrame that happened after first CompositeLayers following last CommitLoadEvent.
    var recordTypes = TimelineModel.TimelineModel.RecordType;
    var i = this._inspectedTargetEvents.lowerBound(this._firstCompositeLayers, SDK.TracingModel.Event.compareStartTime);
    for (; i < this._inspectedTargetEvents.length && this._inspectedTargetEvents[i].name !== recordTypes.DrawFrame;
         ++i) {
    }
    if (i >= this._inspectedTargetEvents.length)
      return;
    var drawFrameEvent = this._inspectedTargetEvents[i];
    var firstPaintEvent = new SDK.TracingModel.Event(
        drawFrameEvent.categoriesString, recordTypes.MarkFirstPaint, SDK.TracingModel.Phase.Instant,
        drawFrameEvent.startTime, drawFrameEvent.thread);
    this._mainThreadEvents.splice(
        this._mainThreadEvents.lowerBound(firstPaintEvent, SDK.TracingModel.Event.compareStartTime), 0,
        firstPaintEvent);
    this._eventDividers.splice(
        this._eventDividers.lowerBound(firstPaintEvent, SDK.TracingModel.Event.compareStartTime), 0, firstPaintEvent);
  }

  /**
   * @param {!SDK.TracingModel} tracingModel
   */
  _processBrowserEvents(tracingModel) {
    var browserMain = SDK.TracingModel.browserMainThread(tracingModel);
    if (!browserMain)
      return;

    // Disregard regular events, we don't need them yet, but still process to get proper metadata.
    browserMain.events().forEach(this._processBrowserEvent, this);
    /** @type {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array<!SDK.TracingModel.AsyncEvent>>} */
    var asyncEventsByGroup = new Map();
    this._processAsyncEvents(asyncEventsByGroup, browserMain.asyncEvents());
    this._mergeAsyncEvents(this._mainThreadAsyncEventsByGroup, asyncEventsByGroup);
  }

  /**
   * @param {!SDK.TracingModel} tracingModel
   */
  _buildGPUEvents(tracingModel) {
    var thread = tracingModel.threadByName('GPU Process', 'CrGpuMain');
    if (!thread)
      return;
    var gpuEventName = TimelineModel.TimelineModel.RecordType.GPUTask;
    this._gpuEvents = thread.events().filter(event => event.name === gpuEventName);
  }

  _resetProcessingState() {
    this._asyncEventTracker = new TimelineModel.TimelineAsyncEventTracker();
    this._invalidationTracker = new TimelineModel.InvalidationTracker();
    this._layoutInvalidate = {};
    this._lastScheduleStyleRecalculation = {};
    this._paintImageEventByPixelRefId = {};
    this._lastPaintForLayer = {};
    this._lastRecalculateStylesEvent = null;
    this._currentScriptEvent = null;
    this._eventStack = [];
    this._hadCommitLoad = false;
    this._firstCompositeLayers = null;
    /** @type {!Set<string>} */
    this._knownInputEvents = new Set();
    this._currentPage = null;
  }

  /**
   * @param {!SDK.TracingModel} tracingModel
   * @param {!SDK.TracingModel.Thread} thread
   * @return {?SDK.CPUProfileDataModel}
   */
  _extractCpuProfile(tracingModel, thread) {
    var events = thread.events();
    var cpuProfile;

    // Check for legacy CpuProfile event format first.
    var cpuProfileEvent = events.peekLast();
    if (cpuProfileEvent && cpuProfileEvent.name === TimelineModel.TimelineModel.RecordType.CpuProfile) {
      var eventData = cpuProfileEvent.args['data'];
      cpuProfile = /** @type {?Protocol.Profiler.Profile} */ (eventData && eventData['cpuProfile']);
    }

    if (!cpuProfile) {
      cpuProfileEvent = events.find(e => e.name === TimelineModel.TimelineModel.RecordType.Profile);
      if (!cpuProfileEvent)
        return null;
      var profileGroup = tracingModel.profileGroup(cpuProfileEvent.id);
      if (!profileGroup) {
        Common.console.error('Invalid CPU profile format.');
        return null;
      }
      cpuProfile = /** @type {!Protocol.Profiler.Profile} */ (
          {startTime: cpuProfileEvent.args['data']['startTime'], endTime: 0, nodes: [], samples: [], timeDeltas: []});
      for (var profileEvent of profileGroup.children) {
        var eventData = profileEvent.args['data'];
        if ('startTime' in eventData)
          cpuProfile.startTime = eventData['startTime'];
        if ('endTime' in eventData)
          cpuProfile.endTime = eventData['endTime'];
        var nodesAndSamples = eventData['cpuProfile'] || {};
        cpuProfile.nodes.pushAll(nodesAndSamples['nodes'] || []);
        cpuProfile.samples.pushAll(nodesAndSamples['samples'] || []);
        cpuProfile.timeDeltas.pushAll(eventData['timeDeltas'] || []);
        if (cpuProfile.samples.length !== cpuProfile.timeDeltas.length) {
          Common.console.error('Failed to parse CPU profile.');
          return null;
        }
      }
      if (!cpuProfile.endTime)
        cpuProfile.endTime = cpuProfile.timeDeltas.reduce((x, y) => x + y, cpuProfile.startTime);
    }

    try {
      var jsProfileModel = new SDK.CPUProfileDataModel(cpuProfile);
      this._cpuProfiles.push(jsProfileModel);
      return jsProfileModel;
    } catch (e) {
      Common.console.error('Failed to parse CPU profile.');
    }
    return null;
  }

  /**
   * @param {!SDK.TracingModel} tracingModel
   * @param {!SDK.TracingModel.Thread} thread
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  _injectJSFrameEvents(tracingModel, thread) {
    var jsProfileModel = this._extractCpuProfile(tracingModel, thread);
    var events = thread.events();
    var jsSamples = jsProfileModel ?
        TimelineModel.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile(jsProfileModel, thread) :
        null;
    if (jsSamples && jsSamples.length)
      events = events.mergeOrdered(jsSamples, SDK.TracingModel.Event.orderedCompareStartTime);
    if (jsSamples || events.some(e => e.name === TimelineModel.TimelineModel.RecordType.JSSample)) {
      var jsFrameEvents = TimelineModel.TimelineJSProfileProcessor.generateJSFrameEvents(events);
      if (jsFrameEvents && jsFrameEvents.length)
        events = jsFrameEvents.mergeOrdered(events, SDK.TracingModel.Event.orderedCompareStartTime);
    }
    return events;
  }

  /**
   * @param {!SDK.TracingModel} tracingModel
   * @param {number} startTime
   * @param {number} endTime
   * @param {!SDK.TracingModel.Thread} thread
   * @param {boolean} isMainThread
   */
  _processThreadEvents(tracingModel, startTime, endTime, thread, isMainThread) {
    var events = this._injectJSFrameEvents(tracingModel, thread);
    var asyncEvents = thread.asyncEvents();
    var groupByFrame = isMainThread && Runtime.experiments.isEnabled('timelinePerFrameTrack');

    var threadEvents;
    var threadAsyncEventsByGroup;
    if (isMainThread) {
      threadEvents = this._mainThreadEvents;
      threadAsyncEventsByGroup = this._mainThreadAsyncEventsByGroup;
    } else {
      var virtualThread = new TimelineModel.TimelineModel.VirtualThread(thread.name());
      this._virtualThreads.push(virtualThread);
      threadEvents = virtualThread.events;
      threadAsyncEventsByGroup = virtualThread.asyncEventsByGroup;
    }

    this._eventStack = [];
    var eventStack = this._eventStack;
    var i = events.lowerBound(startTime, (time, event) => time - event.startTime);
    var length = events.length;
    for (; i < length; i++) {
      var event = events[i];
      if (endTime && event.startTime >= endTime)
        break;
      while (eventStack.length && eventStack.peekLast().endTime <= event.startTime)
        eventStack.pop();
      if (!this._processEvent(event))
        continue;
      if (!SDK.TracingModel.isAsyncPhase(event.phase) && event.duration) {
        if (eventStack.length) {
          var parent = eventStack.peekLast();
          parent.selfTime -= event.duration;
          if (parent.selfTime < 0)
            this._fixNegativeDuration(parent, event);
        }
        event.selfTime = event.duration;
        if (isMainThread) {
          if (!eventStack.length)
            this._mainThreadTasks.push(event);
        }
        eventStack.push(event);
      }
      if (isMainThread && TimelineModel.TimelineModel.isMarkerEvent(event))
        this._eventDividers.push(event);

      if (groupByFrame) {
        var frameId = TimelineModel.TimelineData.forEvent(event).frameId;
        var pageFrame = frameId && this._pageFrames.get(frameId);
        var isMainFrame = !frameId || !pageFrame || !pageFrame.parent;
        if (isMainFrame)
          frameId = TimelineModel.TimelineModel.PageFrame.mainFrameId;
        var frameEvents = this._eventsByFrame.get(frameId);
        if (!frameEvents) {
          frameEvents = [];
          this._eventsByFrame.set(frameId, frameEvents);
        }
        frameEvents.push(event);
      }
      threadEvents.push(event);
      this._inspectedTargetEvents.push(event);
    }
    this._processAsyncEvents(threadAsyncEventsByGroup, asyncEvents, startTime, endTime);
    // Pretend the compositor's async events are on the main thread.
    if (thread.name() === 'Compositor') {
      this._mergeAsyncEvents(this._mainThreadAsyncEventsByGroup, threadAsyncEventsByGroup);
      threadAsyncEventsByGroup.clear();
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {!SDK.TracingModel.Event} child
   */
  _fixNegativeDuration(event, child) {
    var epsilon = 1e-3;
    if (event.selfTime < -epsilon) {
      console.error(
          `Children are longer than parent at ${event.startTime} ` +
          `(${(child.startTime - this.minimumRecordTime()).toFixed(3)} by ${(-event.selfTime).toFixed(3)}`);
    }
    event.selfTime = 0;
  }

  /**
   * @param {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array<!SDK.TracingModel.AsyncEvent>>} asyncEventsByGroup
   * @param {!Array<!SDK.TracingModel.AsyncEvent>} asyncEvents
   * @param {number=} startTime
   * @param {number=} endTime
   */
  _processAsyncEvents(asyncEventsByGroup, asyncEvents, startTime, endTime) {
    var i = startTime ? asyncEvents.lowerBound(startTime, function(time, asyncEvent) {
      return time - asyncEvent.startTime;
    }) : 0;
    for (; i < asyncEvents.length; ++i) {
      var asyncEvent = asyncEvents[i];
      if (endTime && asyncEvent.startTime >= endTime)
        break;
      var asyncGroup = this._processAsyncEvent(asyncEvent);
      if (!asyncGroup)
        continue;
      var groupAsyncEvents = asyncEventsByGroup.get(asyncGroup);
      if (!groupAsyncEvents) {
        groupAsyncEvents = [];
        asyncEventsByGroup.set(asyncGroup, groupAsyncEvents);
      }
      groupAsyncEvents.push(asyncEvent);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  _processEvent(event) {
    var recordTypes = TimelineModel.TimelineModel.RecordType;
    var eventStack = this._eventStack;

    if (!eventStack.length) {
      if (this._currentTaskLayoutAndRecalcEvents && this._currentTaskLayoutAndRecalcEvents.length) {
        var totalTime = this._currentTaskLayoutAndRecalcEvents.reduce((time, event) => time + event.duration, 0);
        if (totalTime > TimelineModel.TimelineModel.Thresholds.ForcedLayout) {
          for (var e of this._currentTaskLayoutAndRecalcEvents) {
            let timelineData = TimelineModel.TimelineData.forEvent(e);
            timelineData.warning = e.name === recordTypes.Layout ?
                TimelineModel.TimelineModel.WarningType.ForcedLayout :
                TimelineModel.TimelineModel.WarningType.ForcedStyle;
          }
        }
      }
      this._currentTaskLayoutAndRecalcEvents = [];
    }

    if (this._currentScriptEvent && event.startTime > this._currentScriptEvent.endTime)
      this._currentScriptEvent = null;

    var eventData = event.args['data'] || event.args['beginData'] || {};
    var timelineData = TimelineModel.TimelineData.forEvent(event);
    if (eventData['stackTrace'])
      timelineData.stackTrace = eventData['stackTrace'];
    if (timelineData.stackTrace && event.name !== recordTypes.JSSample) {
      // TraceEvents come with 1-based line & column numbers. The frontend code
      // requires 0-based ones. Adjust the values.
      for (var i = 0; i < timelineData.stackTrace.length; ++i) {
        --timelineData.stackTrace[i].lineNumber;
        --timelineData.stackTrace[i].columnNumber;
      }
    }
    var pageFrameId = TimelineModel.TimelineModel.eventFrameId(event);
    if (!pageFrameId && eventStack.length)
      pageFrameId = TimelineModel.TimelineData.forEvent(eventStack.peekLast()).frameId;
    timelineData.frameId = pageFrameId || TimelineModel.TimelineModel.PageFrame.mainFrameId;
    this._asyncEventTracker.processEvent(event);
    switch (event.name) {
      case recordTypes.ResourceSendRequest:
      case recordTypes.WebSocketCreate:
        timelineData.setInitiator(eventStack.peekLast() || null);
        timelineData.url = eventData['url'];
        break;

      case recordTypes.ScheduleStyleRecalculation:
        this._lastScheduleStyleRecalculation[eventData['frame']] = event;
        break;

      case recordTypes.UpdateLayoutTree:
      case recordTypes.RecalculateStyles:
        this._invalidationTracker.didRecalcStyle(event);
        if (event.args['beginData'])
          timelineData.setInitiator(this._lastScheduleStyleRecalculation[event.args['beginData']['frame']]);
        this._lastRecalculateStylesEvent = event;
        if (this._currentScriptEvent)
          this._currentTaskLayoutAndRecalcEvents.push(event);
        break;

      case recordTypes.ScheduleStyleInvalidationTracking:
      case recordTypes.StyleRecalcInvalidationTracking:
      case recordTypes.StyleInvalidatorInvalidationTracking:
      case recordTypes.LayoutInvalidationTracking:
      case recordTypes.LayerInvalidationTracking:
      case recordTypes.PaintInvalidationTracking:
      case recordTypes.ScrollInvalidationTracking:
        this._invalidationTracker.addInvalidation(new TimelineModel.InvalidationTrackingEvent(event));
        break;

      case recordTypes.InvalidateLayout:
        // Consider style recalculation as a reason for layout invalidation,
        // but only if we had no earlier layout invalidation records.
        var layoutInitator = event;
        var frameId = eventData['frame'];
        if (!this._layoutInvalidate[frameId] && this._lastRecalculateStylesEvent &&
            this._lastRecalculateStylesEvent.endTime > event.startTime)
          layoutInitator = TimelineModel.TimelineData.forEvent(this._lastRecalculateStylesEvent).initiator();
        this._layoutInvalidate[frameId] = layoutInitator;
        break;

      case recordTypes.Layout:
        this._invalidationTracker.didLayout(event);
        var frameId = event.args['beginData']['frame'];
        timelineData.setInitiator(this._layoutInvalidate[frameId]);
        // In case we have no closing Layout event, endData is not available.
        if (event.args['endData'])
          timelineData.backendNodeId = event.args['endData']['rootNode'];
        this._layoutInvalidate[frameId] = null;
        if (this._currentScriptEvent)
          this._currentTaskLayoutAndRecalcEvents.push(event);
        break;

      case recordTypes.EventDispatch:
        if (event.duration > TimelineModel.TimelineModel.Thresholds.RecurringHandler)
          timelineData.warning = TimelineModel.TimelineModel.WarningType.LongHandler;
        break;

      case recordTypes.TimerFire:
      case recordTypes.FireAnimationFrame:
        if (event.duration > TimelineModel.TimelineModel.Thresholds.RecurringHandler)
          timelineData.warning = TimelineModel.TimelineModel.WarningType.LongRecurringHandler;
        break;

      case recordTypes.FunctionCall:
        // Compatibility with old format.
        if (typeof eventData['scriptName'] === 'string')
          eventData['url'] = eventData['scriptName'];
        if (typeof eventData['scriptLine'] === 'number')
          eventData['lineNumber'] = eventData['scriptLine'];

      // Fallthrough.

      case recordTypes.EvaluateScript:
      case recordTypes.CompileScript:
        if (typeof eventData['lineNumber'] === 'number')
          --eventData['lineNumber'];
        if (typeof eventData['columnNumber'] === 'number')
          --eventData['columnNumber'];

      // Fallthrough intended.

      case recordTypes.RunMicrotasks:
        // Microtasks technically are not necessarily scripts, but for purpose of
        // forced sync style recalc or layout detection they are.
        if (!this._currentScriptEvent)
          this._currentScriptEvent = event;
        break;

      case recordTypes.SetLayerTreeId:
        this._inspectedTargetLayerTreeId = event.args['layerTreeId'] || event.args['data']['layerTreeId'];
        break;

      case recordTypes.Paint:
        this._invalidationTracker.didPaint(event);
        timelineData.backendNodeId = eventData['nodeId'];
        // Only keep layer paint events, skip paints for subframes that get painted to the same layer as parent.
        if (!eventData['layerId'])
          break;
        var layerId = eventData['layerId'];
        this._lastPaintForLayer[layerId] = event;
        break;

      case recordTypes.DisplayItemListSnapshot:
      case recordTypes.PictureSnapshot:
        var layerUpdateEvent = this._findAncestorEvent(recordTypes.UpdateLayer);
        if (!layerUpdateEvent || layerUpdateEvent.args['layerTreeId'] !== this._inspectedTargetLayerTreeId)
          break;
        var paintEvent = this._lastPaintForLayer[layerUpdateEvent.args['layerId']];
        if (paintEvent) {
          TimelineModel.TimelineData.forEvent(paintEvent).picture =
              /** @type {!SDK.TracingModel.ObjectSnapshot} */ (event);
        }
        break;

      case recordTypes.ScrollLayer:
        timelineData.backendNodeId = eventData['nodeId'];
        break;

      case recordTypes.PaintImage:
        timelineData.backendNodeId = eventData['nodeId'];
        timelineData.url = eventData['url'];
        break;

      case recordTypes.DecodeImage:
      case recordTypes.ResizeImage:
        var paintImageEvent = this._findAncestorEvent(recordTypes.PaintImage);
        if (!paintImageEvent) {
          var decodeLazyPixelRefEvent = this._findAncestorEvent(recordTypes.DecodeLazyPixelRef);
          paintImageEvent = decodeLazyPixelRefEvent &&
              this._paintImageEventByPixelRefId[decodeLazyPixelRefEvent.args['LazyPixelRef']];
        }
        if (!paintImageEvent)
          break;
        var paintImageData = TimelineModel.TimelineData.forEvent(paintImageEvent);
        timelineData.backendNodeId = paintImageData.backendNodeId;
        timelineData.url = paintImageData.url;
        break;

      case recordTypes.DrawLazyPixelRef:
        var paintImageEvent = this._findAncestorEvent(recordTypes.PaintImage);
        if (!paintImageEvent)
          break;
        this._paintImageEventByPixelRefId[event.args['LazyPixelRef']] = paintImageEvent;
        var paintImageData = TimelineModel.TimelineData.forEvent(paintImageEvent);
        timelineData.backendNodeId = paintImageData.backendNodeId;
        timelineData.url = paintImageData.url;
        break;

      case recordTypes.MarkDOMContent:
      case recordTypes.MarkLoad:
        var page = eventData['page'];
        if (page && page !== this._currentPage)
          return false;
        break;

      case recordTypes.CommitLoad:
        var frameId = TimelineModel.TimelineModel.eventFrameId(event);
        var pageFrame = this._pageFrames.get(frameId);
        if (pageFrame)
          pageFrame.update(eventData.name || '', eventData.url || '');
        else
          this._addPageFrame(event, eventData);
        var page = eventData['page'];
        if (page && page !== this._currentPage)
          return false;
        if (!eventData['isMainFrame'])
          break;
        if (eventData.url)
          this._pageURL = eventData.url;
        this._hadCommitLoad = true;
        this._firstCompositeLayers = null;
        break;

      case recordTypes.CompositeLayers:
        if (!this._firstCompositeLayers && this._hadCommitLoad)
          this._firstCompositeLayers = event;
        break;

      case recordTypes.FireIdleCallback:
        if (event.duration >
            eventData['allottedMilliseconds'] + TimelineModel.TimelineModel.Thresholds.IdleCallbackAddon)
          timelineData.warning = TimelineModel.TimelineModel.WarningType.IdleDeadlineExceeded;
        break;
    }
    return true;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  _processBrowserEvent(event) {
    if (event.name !== TimelineModel.TimelineModel.RecordType.LatencyInfoFlow)
      return;
    var frameId = event.args['frameTreeNodeId'];
    if (typeof frameId === 'number' && frameId === this._mainFrameNodeId)
      this._knownInputEvents.add(event.bind_id);
  }

  /**
   * @param {!SDK.TracingModel.AsyncEvent} asyncEvent
   * @return {?TimelineModel.TimelineModel.AsyncEventGroup}
   */
  _processAsyncEvent(asyncEvent) {
    var groups = TimelineModel.TimelineModel.AsyncEventGroup;
    if (asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.Console))
      return groups.console;
    if (asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.UserTiming))
      return groups.userTiming;
    if (asyncEvent.name === TimelineModel.TimelineModel.RecordType.Animation)
      return groups.animation;
    if (asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo) ||
        asyncEvent.name === TimelineModel.TimelineModel.RecordType.ImplSideFling) {
      var lastStep = asyncEvent.steps.peekLast();
      // FIXME: fix event termination on the back-end instead.
      if (lastStep.phase !== SDK.TracingModel.Phase.AsyncEnd)
        return null;
      var data = lastStep.args['data'];
      asyncEvent.causedFrame = !!(data && data['INPUT_EVENT_LATENCY_RENDERER_SWAP_COMPONENT']);
      if (asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)) {
        if (!this._knownInputEvents.has(lastStep.id))
          return null;
        if (asyncEvent.name === TimelineModel.TimelineModel.RecordType.InputLatencyMouseMove && !asyncEvent.causedFrame)
          return null;
        var rendererMain = data['INPUT_EVENT_LATENCY_RENDERER_MAIN_COMPONENT'];
        if (rendererMain) {
          var time = rendererMain['time'] / 1000;
          TimelineModel.TimelineData.forEvent(asyncEvent.steps[0]).timeWaitingForMainThread =
              time - asyncEvent.steps[0].startTime;
        }
      }
      return groups.input;
    }
    return null;
  }

  /**
   * @param {string} name
   * @return {?SDK.TracingModel.Event}
   */
  _findAncestorEvent(name) {
    for (var i = this._eventStack.length - 1; i >= 0; --i) {
      var event = this._eventStack[i];
      if (event.name === name)
        return event;
    }
    return null;
  }

  /**
   * @param {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array<!SDK.TracingModel.AsyncEvent>>} target
   * @param {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array<!SDK.TracingModel.AsyncEvent>>} source
   */
  _mergeAsyncEvents(target, source) {
    for (var group of source.keys()) {
      var events = target.get(group) || [];
      events = events.mergeOrdered(source.get(group) || [], SDK.TracingModel.Event.compareStartAndEndTime);
      target.set(group, events);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {!Object} payload
   */
  _addPageFrame(event, payload) {
    var processId = event.thread.process().id();
    var pageFrame = new TimelineModel.TimelineModel.PageFrame(this.targetByEvent(event), processId, payload);
    this._pageFrames.set(pageFrame.id, pageFrame);
    var parent = payload['parent'] && this._pageFrames.get(`${processId}.${payload['parent']}`);
    if (parent)
      parent.addChild(pageFrame);
  }

  _reset() {
    this._virtualThreads = [];
    /** @type {!Array<!SDK.TracingModel.Event>} */
    this._mainThreadEvents = [];
    /** @type {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array<!SDK.TracingModel.AsyncEvent>>} */
    this._mainThreadAsyncEventsByGroup = new Map();
    /** @type {!Array<!SDK.TracingModel.Event>} */
    this._inspectedTargetEvents = [];
    /** @type {!Array<!SDK.TracingModel.Event>} */
    this._mainThreadTasks = [];
    /** @type {!Array<!SDK.TracingModel.Event>} */
    this._gpuEvents = [];
    /** @type {!Array<!SDK.TracingModel.Event>} */
    this._eventDividers = [];
    /** @type {?string} */
    this._sessionId = null;
    /** @type {?number} */
    this._mainFrameNodeId = null;
    /** @type {!Array<!SDK.CPUProfileDataModel>} */
    this._cpuProfiles = [];
    /** @type {!WeakMap<!SDK.TracingModel.Thread, string>} */
    this._workerIdByThread = new WeakMap();
    /** @type {!Map<string, !TimelineModel.TimelineModel.PageFrame>} */
    this._pageFrames = new Map();
    /** @type {!Map<string, !Array<!SDK.TracingModel.Event>>} */
    this._eventsByFrame = new Map();
    this._pageURL = '';

    this._minimumRecordTime = 0;
    this._maximumRecordTime = 0;
  }

  /**
   * @return {number}
   */
  minimumRecordTime() {
    return this._minimumRecordTime;
  }

  /**
   * @return {number}
   */
  maximumRecordTime() {
    return this._maximumRecordTime;
  }

  /**
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  inspectedTargetEvents() {
    return this._inspectedTargetEvents;
  }

  /**
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  mainThreadEvents() {
    return this._mainThreadEvents;
  }

  /**
   * @return {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array.<!SDK.TracingModel.AsyncEvent>>}
   */
  mainThreadAsyncEvents() {
    return this._mainThreadAsyncEventsByGroup;
  }

  /**
   * @return {!Array<!TimelineModel.TimelineModel.VirtualThread>}
   */
  virtualThreads() {
    return this._virtualThreads;
  }

  /**
   * @return {boolean}
   */
  isEmpty() {
    return this.minimumRecordTime() === 0 && this.maximumRecordTime() === 0;
  }

  /**
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  mainThreadTasks() {
    return this._mainThreadTasks;
  }

  /**
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  gpuEvents() {
    return this._gpuEvents;
  }

  /**
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  eventDividers() {
    return this._eventDividers;
  }

  /**
   * @return {!Array<!TimelineModel.TimelineModel.PageFrame>}
   */
  rootFrames() {
    return Array.from(this._pageFrames.values()).filter(frame => !frame.parent);
  }

  /**
   * @return {string}
   */
  pageURL() {
    return this._pageURL;
  }

  /**
   * @param {string} frameId
   * @return {?TimelineModel.TimelineModel.PageFrame}
   */
  pageFrameById(frameId) {
    return frameId ? this._pageFrames.get(frameId) || null : null;
  }

  /**
   * @param {string} frameId
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  eventsForFrame(frameId) {
    return this._eventsByFrame.get(frameId) || [];
  }

  /**
   * @return {!Array<!TimelineModel.TimelineModel.NetworkRequest>}
   */
  networkRequests() {
    /** @type {!Map<string,!TimelineModel.TimelineModel.NetworkRequest>} */
    var requests = new Map();
    /** @type {!Array<!TimelineModel.TimelineModel.NetworkRequest>} */
    var requestsList = [];
    /** @type {!Array<!TimelineModel.TimelineModel.NetworkRequest>} */
    var zeroStartRequestsList = [];
    var types = TimelineModel.TimelineModel.RecordType;
    var resourceTypes = new Set(
        [types.ResourceSendRequest, types.ResourceReceiveResponse, types.ResourceReceivedData, types.ResourceFinish]);
    var events = this.inspectedTargetEvents();
    for (var i = 0; i < events.length; ++i) {
      var e = events[i];
      if (!resourceTypes.has(e.name))
        continue;
      var id = TimelineModel.TimelineModel.globalEventId(e, 'requestId');
      var request = requests.get(id);
      if (request) {
        request.addEvent(e);
      } else {
        request = new TimelineModel.TimelineModel.NetworkRequest(e);
        requests.set(id, request);
        if (request.startTime)
          requestsList.push(request);
        else
          zeroStartRequestsList.push(request);
      }
    }
    return zeroStartRequestsList.concat(requestsList);
  }
};

/**
 * @enum {string}
 */
TimelineModel.TimelineModel.RecordType = {
  Task: 'Task',
  Program: 'Program',
  EventDispatch: 'EventDispatch',

  GPUTask: 'GPUTask',

  Animation: 'Animation',
  RequestMainThreadFrame: 'RequestMainThreadFrame',
  BeginFrame: 'BeginFrame',
  NeedsBeginFrameChanged: 'NeedsBeginFrameChanged',
  BeginMainThreadFrame: 'BeginMainThreadFrame',
  ActivateLayerTree: 'ActivateLayerTree',
  DrawFrame: 'DrawFrame',
  HitTest: 'HitTest',
  ScheduleStyleRecalculation: 'ScheduleStyleRecalculation',
  RecalculateStyles: 'RecalculateStyles',  // For backwards compatibility only, now replaced by UpdateLayoutTree.
  UpdateLayoutTree: 'UpdateLayoutTree',
  InvalidateLayout: 'InvalidateLayout',
  Layout: 'Layout',
  UpdateLayer: 'UpdateLayer',
  UpdateLayerTree: 'UpdateLayerTree',
  PaintSetup: 'PaintSetup',
  Paint: 'Paint',
  PaintImage: 'PaintImage',
  Rasterize: 'Rasterize',
  RasterTask: 'RasterTask',
  ScrollLayer: 'ScrollLayer',
  CompositeLayers: 'CompositeLayers',

  ScheduleStyleInvalidationTracking: 'ScheduleStyleInvalidationTracking',
  StyleRecalcInvalidationTracking: 'StyleRecalcInvalidationTracking',
  StyleInvalidatorInvalidationTracking: 'StyleInvalidatorInvalidationTracking',
  LayoutInvalidationTracking: 'LayoutInvalidationTracking',
  LayerInvalidationTracking: 'LayerInvalidationTracking',
  PaintInvalidationTracking: 'PaintInvalidationTracking',
  ScrollInvalidationTracking: 'ScrollInvalidationTracking',

  ParseHTML: 'ParseHTML',
  ParseAuthorStyleSheet: 'ParseAuthorStyleSheet',

  TimerInstall: 'TimerInstall',
  TimerRemove: 'TimerRemove',
  TimerFire: 'TimerFire',

  XHRReadyStateChange: 'XHRReadyStateChange',
  XHRLoad: 'XHRLoad',
  CompileScript: 'v8.compile',
  EvaluateScript: 'EvaluateScript',

  CommitLoad: 'CommitLoad',
  MarkLoad: 'MarkLoad',
  MarkDOMContent: 'MarkDOMContent',
  MarkFirstPaint: 'MarkFirstPaint',
  MarkFMP: 'firstMeaningfulPaint',
  MarkFMPCandidate: 'firstMeaningfulPaintCandidate',

  TimeStamp: 'TimeStamp',
  ConsoleTime: 'ConsoleTime',
  UserTiming: 'UserTiming',

  ResourceSendRequest: 'ResourceSendRequest',
  ResourceReceiveResponse: 'ResourceReceiveResponse',
  ResourceReceivedData: 'ResourceReceivedData',
  ResourceFinish: 'ResourceFinish',

  RunMicrotasks: 'RunMicrotasks',
  FunctionCall: 'FunctionCall',
  GCEvent: 'GCEvent',  // For backwards compatibility only, now replaced by MinorGC/MajorGC.
  MajorGC: 'MajorGC',
  MinorGC: 'MinorGC',
  JSFrame: 'JSFrame',
  JSSample: 'JSSample',
  // V8Sample events are coming from tracing and contain raw stacks with function addresses.
  // After being processed with help of JitCodeAdded and JitCodeMoved events they
  // get translated into function infos and stored as stacks in JSSample events.
  V8Sample: 'V8Sample',
  JitCodeAdded: 'JitCodeAdded',
  JitCodeMoved: 'JitCodeMoved',
  ParseScriptOnBackground: 'v8.parseOnBackground',

  UpdateCounters: 'UpdateCounters',

  RequestAnimationFrame: 'RequestAnimationFrame',
  CancelAnimationFrame: 'CancelAnimationFrame',
  FireAnimationFrame: 'FireAnimationFrame',

  RequestIdleCallback: 'RequestIdleCallback',
  CancelIdleCallback: 'CancelIdleCallback',
  FireIdleCallback: 'FireIdleCallback',

  WebSocketCreate: 'WebSocketCreate',
  WebSocketSendHandshakeRequest: 'WebSocketSendHandshakeRequest',
  WebSocketReceiveHandshakeResponse: 'WebSocketReceiveHandshakeResponse',
  WebSocketDestroy: 'WebSocketDestroy',

  EmbedderCallback: 'EmbedderCallback',

  SetLayerTreeId: 'SetLayerTreeId',
  TracingStartedInPage: 'TracingStartedInPage',
  TracingSessionIdForWorker: 'TracingSessionIdForWorker',

  DecodeImage: 'Decode Image',
  ResizeImage: 'Resize Image',
  DrawLazyPixelRef: 'Draw LazyPixelRef',
  DecodeLazyPixelRef: 'Decode LazyPixelRef',

  LazyPixelRef: 'LazyPixelRef',
  LayerTreeHostImplSnapshot: 'cc::LayerTreeHostImpl',
  PictureSnapshot: 'cc::Picture',
  DisplayItemListSnapshot: 'cc::DisplayItemList',
  LatencyInfo: 'LatencyInfo',
  LatencyInfoFlow: 'LatencyInfo.Flow',
  InputLatencyMouseMove: 'InputLatency::MouseMove',
  InputLatencyMouseWheel: 'InputLatency::MouseWheel',
  ImplSideFling: 'InputHandlerProxy::HandleGestureFling::started',
  GCIdleLazySweep: 'ThreadState::performIdleLazySweep',
  GCCompleteSweep: 'ThreadState::completeSweep',
  GCCollectGarbage: 'BlinkGCMarking',

  // CpuProfile is a virtual event created on frontend to support
  // serialization of CPU Profiles within tracing timeline data.
  CpuProfile: 'CpuProfile',
  Profile: 'Profile',

  AsyncTask: 'AsyncTask',
};

TimelineModel.TimelineModel.Category = {
  Console: 'blink.console',
  UserTiming: 'blink.user_timing',
  LatencyInfo: 'latencyInfo'
};

/**
 * @enum {string}
 */
TimelineModel.TimelineModel.WarningType = {
  ForcedStyle: 'ForcedStyle',
  ForcedLayout: 'ForcedLayout',
  IdleDeadlineExceeded: 'IdleDeadlineExceeded',
  LongHandler: 'LongHandler',
  LongRecurringHandler: 'LongRecurringHandler',
  V8Deopt: 'V8Deopt'
};

TimelineModel.TimelineModel.MainThreadName = 'main';
TimelineModel.TimelineModel.WorkerThreadName = 'DedicatedWorker Thread';
TimelineModel.TimelineModel.RendererMainThreadName = 'CrRendererMain';

/**
 * @enum {symbol}
 */
TimelineModel.TimelineModel.AsyncEventGroup = {
  animation: Symbol('animation'),
  console: Symbol('console'),
  userTiming: Symbol('userTiming'),
  input: Symbol('input')
};


TimelineModel.TimelineModel.DevToolsMetadataEvent = {
  TracingStartedInBrowser: 'TracingStartedInBrowser',
  TracingStartedInPage: 'TracingStartedInPage',
  TracingSessionIdForWorker: 'TracingSessionIdForWorker',
};

TimelineModel.TimelineModel.Thresholds = {
  Handler: 150,
  RecurringHandler: 50,
  ForcedLayout: 30,
  IdleCallbackAddon: 5
};

/**
 * @unrestricted
 */
TimelineModel.TimelineModel.VirtualThread = class {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
    /** @type {!Array<!SDK.TracingModel.Event>} */
    this.events = [];
    /** @type {!Map<!TimelineModel.TimelineModel.AsyncEventGroup, !Array<!SDK.TracingModel.AsyncEvent>>} */
    this.asyncEventsByGroup = new Map();
  }

  /**
   * @return {boolean}
   */
  isWorker() {
    return this.name === TimelineModel.TimelineModel.WorkerThreadName;
  }
};

/** @typedef {!{page: !Array<!SDK.TracingModel.Event>, workers: !Array<!SDK.TracingModel.Event>}} */
TimelineModel.TimelineModel.MetadataEvents;


TimelineModel.TimelineModel.PageFrame = class {
  /**
   * @param {?SDK.Target} target
   * @param {number} pid
   * @param {!Object} payload
   */
  constructor(target, pid, payload) {
    this.frameId = payload['frame'];
    this.url = payload['url'] || '';
    this.name = payload['name'];
    this.processId = pid;
    this.children = [];
    /** @type {?TimelineModel.TimelineModel.PageFrame} */
    this.parent = null;
    this.id = `${this.processId}.${this.frameId}`;
    this.ownerNode = target && payload['nodeId'] ? new SDK.DeferredDOMNode(target, payload['nodeId']) : null;
  }

  /**
   * @param {string} name
   * @param {string} url
   */
  update(name, url) {
    this.name = name;
    this.url = url;
  }

  /**
   * @param {!TimelineModel.TimelineModel.PageFrame} child
   */
  addChild(child) {
    this.children.push(child);
    child.parent = this;
  }
};

TimelineModel.TimelineModel.PageFrame.mainFrameId = '';


/**
 * @unrestricted
 */
TimelineModel.TimelineModel.NetworkRequest = class {
  /**
   * @param {!SDK.TracingModel.Event} event
   */
  constructor(event) {
    this.startTime = event.name === TimelineModel.TimelineModel.RecordType.ResourceSendRequest ? event.startTime : 0;
    this.endTime = Infinity;
    this.encodedDataLength = 0;
    this.decodedBodyLength = 0;
    /** @type {!Array<!SDK.TracingModel.Event>} */
    this.children = [];
    /** @type {?Object} */
    this.timing;
    /** @type {string} */
    this.mimeType;
    /** @type {string} */
    this.url;
    /** @type {string} */
    this.requestMethod;
    this.addEvent(event);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  addEvent(event) {
    this.children.push(event);
    var recordType = TimelineModel.TimelineModel.RecordType;
    this.startTime = Math.min(this.startTime, event.startTime);
    var eventData = event.args['data'];
    if (eventData['mimeType'])
      this.mimeType = eventData['mimeType'];
    if ('priority' in eventData)
      this.priority = eventData['priority'];
    if (event.name === recordType.ResourceFinish)
      this.endTime = event.startTime;
    if (eventData['finishTime'])
      this.finishTime = eventData['finishTime'] * 1000;
    if (!this.responseTime &&
        (event.name === recordType.ResourceReceiveResponse || event.name === recordType.ResourceReceivedData))
      this.responseTime = event.startTime;
    var encodedDataLength = eventData['encodedDataLength'] || 0;
    if (event.name === recordType.ResourceReceiveResponse) {
      if (eventData['fromCache'])
        this.fromCache = true;
      if (eventData['fromServiceWorker'])
        this.fromServiceWorker = true;
      this.encodedDataLength = encodedDataLength;
    }
    if (event.name === recordType.ResourceReceivedData)
      this.encodedDataLength += encodedDataLength;
    if (event.name === recordType.ResourceFinish && encodedDataLength)
      this.encodedDataLength = encodedDataLength;
    var decodedBodyLength = eventData['decodedBodyLength'];
    if (event.name === recordType.ResourceFinish && decodedBodyLength)
      this.decodedBodyLength = decodedBodyLength;
    if (!this.url)
      this.url = eventData['url'];
    if (!this.requestMethod)
      this.requestMethod = eventData['requestMethod'];
    if (!this.timing)
      this.timing = eventData['timing'];
    if (eventData['fromServiceWorker'])
      this.fromServiceWorker = true;
  }
};


/**
 * @unrestricted
 */
TimelineModel.InvalidationTrackingEvent = class {
  /**
   * @param {!SDK.TracingModel.Event} event
   */
  constructor(event) {
    /** @type {string} */
    this.type = event.name;
    /** @type {number} */
    this.startTime = event.startTime;
    /** @type {!SDK.TracingModel.Event} */
    this._tracingEvent = event;

    var eventData = event.args['data'];

    /** @type {number} */
    this.frame = eventData['frame'];
    /** @type {?number} */
    this.nodeId = eventData['nodeId'];
    /** @type {?string} */
    this.nodeName = eventData['nodeName'];
    /** @type {?number} */
    this.paintId = eventData['paintId'];
    /** @type {?number} */
    this.invalidationSet = eventData['invalidationSet'];
    /** @type {?string} */
    this.invalidatedSelectorId = eventData['invalidatedSelectorId'];
    /** @type {?string} */
    this.changedId = eventData['changedId'];
    /** @type {?string} */
    this.changedClass = eventData['changedClass'];
    /** @type {?string} */
    this.changedAttribute = eventData['changedAttribute'];
    /** @type {?string} */
    this.changedPseudo = eventData['changedPseudo'];
    /** @type {?string} */
    this.selectorPart = eventData['selectorPart'];
    /** @type {?string} */
    this.extraData = eventData['extraData'];
    /** @type {?Array.<!Object.<string, number>>} */
    this.invalidationList = eventData['invalidationList'];
    /** @type {!TimelineModel.InvalidationCause} */
    this.cause = {reason: eventData['reason'], stackTrace: eventData['stackTrace']};

    // FIXME: Move this to TimelineUIUtils.js.
    if (!this.cause.reason && this.cause.stackTrace &&
        this.type === TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking)
      this.cause.reason = 'Layout forced';
  }
};

/** @typedef {{reason: string, stackTrace: ?Array<!Protocol.Runtime.CallFrame>}} */
TimelineModel.InvalidationCause;

TimelineModel.InvalidationTracker = class {
  constructor() {
    /** @type {?SDK.TracingModel.Event} */
    this._lastRecalcStyle = null;
    /** @type {?SDK.TracingModel.Event} */
    this._lastPaintWithLayer = null;
    this._didPaint = false;
    this._initializePerFrameState();
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {?Array<!TimelineModel.InvalidationTrackingEvent>}
   */
  static invalidationEventsFor(event) {
    return event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol] || null;
  }

  /**
   * @param {!TimelineModel.InvalidationTrackingEvent} invalidation
   */
  addInvalidation(invalidation) {
    this._startNewFrameIfNeeded();

    if (!invalidation.nodeId && !invalidation.paintId) {
      console.error('Invalidation lacks node information.');
      console.error(invalidation);
      return;
    }

    // PaintInvalidationTracking events provide a paintId and a nodeId which
    // we can use to update the paintId for all other invalidation tracking
    // events.
    var recordTypes = TimelineModel.TimelineModel.RecordType;
    if (invalidation.type === recordTypes.PaintInvalidationTracking && invalidation.nodeId) {
      var invalidations = this._invalidationsByNodeId[invalidation.nodeId] || [];
      for (var i = 0; i < invalidations.length; ++i)
        invalidations[i].paintId = invalidation.paintId;

      // PaintInvalidationTracking is only used for updating paintIds.
      return;
    }

    // Suppress StyleInvalidator StyleRecalcInvalidationTracking invalidations because they
    // will be handled by StyleInvalidatorInvalidationTracking.
    // FIXME: Investigate if we can remove StyleInvalidator invalidations entirely.
    if (invalidation.type === recordTypes.StyleRecalcInvalidationTracking &&
        invalidation.cause.reason === 'StyleInvalidator')
      return;

    // Style invalidation events can occur before and during recalc style. didRecalcStyle
    // handles style invalidations that occur before the recalc style event but we need to
    // handle style recalc invalidations during recalc style here.
    var styleRecalcInvalidation =
        (invalidation.type === recordTypes.ScheduleStyleInvalidationTracking ||
         invalidation.type === recordTypes.StyleInvalidatorInvalidationTracking ||
         invalidation.type === recordTypes.StyleRecalcInvalidationTracking);
    if (styleRecalcInvalidation) {
      var duringRecalcStyle = invalidation.startTime && this._lastRecalcStyle &&
          invalidation.startTime >= this._lastRecalcStyle.startTime &&
          invalidation.startTime <= this._lastRecalcStyle.endTime;
      if (duringRecalcStyle)
        this._associateWithLastRecalcStyleEvent(invalidation);
    }

    // Record the invalidation so later events can look it up.
    if (this._invalidations[invalidation.type])
      this._invalidations[invalidation.type].push(invalidation);
    else
      this._invalidations[invalidation.type] = [invalidation];
    if (invalidation.nodeId) {
      if (this._invalidationsByNodeId[invalidation.nodeId])
        this._invalidationsByNodeId[invalidation.nodeId].push(invalidation);
      else
        this._invalidationsByNodeId[invalidation.nodeId] = [invalidation];
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} recalcStyleEvent
   */
  didRecalcStyle(recalcStyleEvent) {
    this._lastRecalcStyle = recalcStyleEvent;
    var types = [
      TimelineModel.TimelineModel.RecordType.ScheduleStyleInvalidationTracking,
      TimelineModel.TimelineModel.RecordType.StyleInvalidatorInvalidationTracking,
      TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking
    ];
    for (var invalidation of this._invalidationsOfTypes(types))
      this._associateWithLastRecalcStyleEvent(invalidation);
  }

  /**
   * @param {!TimelineModel.InvalidationTrackingEvent} invalidation
   */
  _associateWithLastRecalcStyleEvent(invalidation) {
    if (invalidation.linkedRecalcStyleEvent)
      return;

    var recordTypes = TimelineModel.TimelineModel.RecordType;
    var recalcStyleFrameId = this._lastRecalcStyle.args['beginData']['frame'];
    if (invalidation.type === recordTypes.StyleInvalidatorInvalidationTracking) {
      // Instead of calling _addInvalidationToEvent directly, we create synthetic
      // StyleRecalcInvalidationTracking events which will be added in _addInvalidationToEvent.
      this._addSyntheticStyleRecalcInvalidations(this._lastRecalcStyle, recalcStyleFrameId, invalidation);
    } else if (invalidation.type === recordTypes.ScheduleStyleInvalidationTracking) {
      // ScheduleStyleInvalidationTracking events are only used for adding information to
      // StyleInvalidatorInvalidationTracking events. See: _addSyntheticStyleRecalcInvalidations.
    } else {
      this._addInvalidationToEvent(this._lastRecalcStyle, recalcStyleFrameId, invalidation);
    }

    invalidation.linkedRecalcStyleEvent = true;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {number} frameId
   * @param {!TimelineModel.InvalidationTrackingEvent} styleInvalidatorInvalidation
   */
  _addSyntheticStyleRecalcInvalidations(event, frameId, styleInvalidatorInvalidation) {
    if (!styleInvalidatorInvalidation.invalidationList) {
      this._addSyntheticStyleRecalcInvalidation(
          styleInvalidatorInvalidation._tracingEvent, styleInvalidatorInvalidation);
      return;
    }
    if (!styleInvalidatorInvalidation.nodeId) {
      console.error('Invalidation lacks node information.');
      console.error(invalidation);
      return;
    }
    for (var i = 0; i < styleInvalidatorInvalidation.invalidationList.length; i++) {
      var setId = styleInvalidatorInvalidation.invalidationList[i]['id'];
      var lastScheduleStyleRecalculation;
      var nodeInvalidations = this._invalidationsByNodeId[styleInvalidatorInvalidation.nodeId] || [];
      for (var j = 0; j < nodeInvalidations.length; j++) {
        var invalidation = nodeInvalidations[j];
        if (invalidation.frame !== frameId || invalidation.invalidationSet !== setId ||
            invalidation.type !== TimelineModel.TimelineModel.RecordType.ScheduleStyleInvalidationTracking)
          continue;
        lastScheduleStyleRecalculation = invalidation;
      }
      if (!lastScheduleStyleRecalculation) {
        console.error('Failed to lookup the event that scheduled a style invalidator invalidation.');
        continue;
      }
      this._addSyntheticStyleRecalcInvalidation(
          lastScheduleStyleRecalculation._tracingEvent, styleInvalidatorInvalidation);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} baseEvent
   * @param {!TimelineModel.InvalidationTrackingEvent} styleInvalidatorInvalidation
   */
  _addSyntheticStyleRecalcInvalidation(baseEvent, styleInvalidatorInvalidation) {
    var invalidation = new TimelineModel.InvalidationTrackingEvent(baseEvent);
    invalidation.type = TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking;
    if (styleInvalidatorInvalidation.cause.reason)
      invalidation.cause.reason = styleInvalidatorInvalidation.cause.reason;
    if (styleInvalidatorInvalidation.selectorPart)
      invalidation.selectorPart = styleInvalidatorInvalidation.selectorPart;

    this.addInvalidation(invalidation);
    if (!invalidation.linkedRecalcStyleEvent)
      this._associateWithLastRecalcStyleEvent(invalidation);
  }

  /**
   * @param {!SDK.TracingModel.Event} layoutEvent
   */
  didLayout(layoutEvent) {
    var layoutFrameId = layoutEvent.args['beginData']['frame'];
    for (var invalidation of this._invalidationsOfTypes(
             [TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking])) {
      if (invalidation.linkedLayoutEvent)
        continue;
      this._addInvalidationToEvent(layoutEvent, layoutFrameId, invalidation);
      invalidation.linkedLayoutEvent = true;
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} paintEvent
   */
  didPaint(paintEvent) {
    this._didPaint = true;

    // If a paint doesn't have a corresponding graphics layer id, it paints
    // into its parent so add an effectivePaintId to these events.
    var layerId = paintEvent.args['data']['layerId'];
    if (layerId)
      this._lastPaintWithLayer = paintEvent;
    // Quietly discard top-level paints without layerId, as these are likely
    // to come from overlay.
    if (!this._lastPaintWithLayer)
      return;

    var effectivePaintId = this._lastPaintWithLayer.args['data']['nodeId'];
    var paintFrameId = paintEvent.args['data']['frame'];
    var types = [
      TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking,
      TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking,
      TimelineModel.TimelineModel.RecordType.PaintInvalidationTracking,
      TimelineModel.TimelineModel.RecordType.ScrollInvalidationTracking
    ];
    for (var invalidation of this._invalidationsOfTypes(types)) {
      if (invalidation.paintId === effectivePaintId)
        this._addInvalidationToEvent(paintEvent, paintFrameId, invalidation);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {number} eventFrameId
   * @param {!TimelineModel.InvalidationTrackingEvent} invalidation
   */
  _addInvalidationToEvent(event, eventFrameId, invalidation) {
    if (eventFrameId !== invalidation.frame)
      return;
    if (!event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol])
      event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol] = [invalidation];
    else
      event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol].push(invalidation);
  }

  /**
   * @param {!Array.<string>=} types
   * @return {!Iterator.<!TimelineModel.InvalidationTrackingEvent>}
   */
  _invalidationsOfTypes(types) {
    var invalidations = this._invalidations;
    if (!types)
      types = Object.keys(invalidations);
    function* generator() {
      for (var i = 0; i < types.length; ++i) {
        var invalidationList = invalidations[types[i]] || [];
        for (var j = 0; j < invalidationList.length; ++j)
          yield invalidationList[j];
      }
    }
    return generator();
  }

  _startNewFrameIfNeeded() {
    if (!this._didPaint)
      return;

    this._initializePerFrameState();
  }

  _initializePerFrameState() {
    /** @type {!Object.<string, !Array.<!TimelineModel.InvalidationTrackingEvent>>} */
    this._invalidations = {};
    /** @type {!Object.<number, !Array.<!TimelineModel.InvalidationTrackingEvent>>} */
    this._invalidationsByNodeId = {};

    this._lastRecalcStyle = null;
    this._lastPaintWithLayer = null;
    this._didPaint = false;
  }
};

TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol = Symbol('invalidationTrackingEvents');

/**
 * @unrestricted
 */
TimelineModel.TimelineAsyncEventTracker = class {
  constructor() {
    TimelineModel.TimelineAsyncEventTracker._initialize();
    /** @type {!Map<!TimelineModel.TimelineModel.RecordType, !Map<string, !SDK.TracingModel.Event>>} */
    this._initiatorByType = new Map();
    for (var initiator of TimelineModel.TimelineAsyncEventTracker._asyncEvents.keys())
      this._initiatorByType.set(initiator, new Map());
  }

  static _initialize() {
    if (TimelineModel.TimelineAsyncEventTracker._asyncEvents)
      return;
    var events = new Map();
    var type = TimelineModel.TimelineModel.RecordType;

    events.set(type.TimerInstall, {causes: [type.TimerFire], joinBy: 'timerId'});
    events.set(
        type.ResourceSendRequest,
        {causes: [type.ResourceReceiveResponse, type.ResourceReceivedData, type.ResourceFinish], joinBy: 'requestId'});
    events.set(type.RequestAnimationFrame, {causes: [type.FireAnimationFrame], joinBy: 'id'});
    events.set(type.RequestIdleCallback, {causes: [type.FireIdleCallback], joinBy: 'id'});
    events.set(type.WebSocketCreate, {
      causes: [type.WebSocketSendHandshakeRequest, type.WebSocketReceiveHandshakeResponse, type.WebSocketDestroy],
      joinBy: 'identifier'
    });

    TimelineModel.TimelineAsyncEventTracker._asyncEvents = events;
    /** @type {!Map<!TimelineModel.TimelineModel.RecordType, !TimelineModel.TimelineModel.RecordType>} */
    TimelineModel.TimelineAsyncEventTracker._typeToInitiator = new Map();
    for (var entry of events) {
      var types = entry[1].causes;
      for (type of types)
        TimelineModel.TimelineAsyncEventTracker._typeToInitiator.set(type, entry[0]);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  processEvent(event) {
    var initiatorType = TimelineModel.TimelineAsyncEventTracker._typeToInitiator.get(
        /** @type {!TimelineModel.TimelineModel.RecordType} */ (event.name));
    var isInitiator = !initiatorType;
    if (!initiatorType)
      initiatorType = /** @type {!TimelineModel.TimelineModel.RecordType} */ (event.name);
    var initiatorInfo = TimelineModel.TimelineAsyncEventTracker._asyncEvents.get(initiatorType);
    if (!initiatorInfo)
      return;
    var id = TimelineModel.TimelineModel.globalEventId(event, initiatorInfo.joinBy);
    if (!id)
      return;
    /** @type {!Map<string, !SDK.TracingModel.Event>|undefined} */
    var initiatorMap = this._initiatorByType.get(initiatorType);
    if (isInitiator) {
      initiatorMap.set(id, event);
      return;
    }
    var initiator = initiatorMap.get(id) || null;
    var timelineData = TimelineModel.TimelineData.forEvent(event);
    timelineData.setInitiator(initiator);
    if (!timelineData.frameId && initiator)
      timelineData.frameId = TimelineModel.TimelineModel.eventFrameId(initiator);
  }
};


TimelineModel.TimelineData = class {
  constructor() {
    /** @type {?string} */
    this.warning = null;
    /** @type {?Element} */
    this.previewElement = null;
    /** @type {?string} */
    this.url = null;
    /** @type {number} */
    this.backendNodeId = 0;
    /** @type {?Array<!Protocol.Runtime.CallFrame>} */
    this.stackTrace = null;
    /** @type {?SDK.TracingModel.ObjectSnapshot} */
    this.picture = null;
    /** @type {?SDK.TracingModel.Event} */
    this._initiator = null;
    this.frameId = '';
    /** @type {number|undefined} */
    this.timeWaitingForMainThread;
  }

  /**
   * @param {!SDK.TracingModel.Event} initiator
   */
  setInitiator(initiator) {
    this._initiator = initiator;
    if (!initiator || this.url)
      return;
    var initiatorURL = TimelineModel.TimelineData.forEvent(initiator).url;
    if (initiatorURL)
      this.url = initiatorURL;
  }

  /**
   * @return {?SDK.TracingModel.Event}
   */
  initiator() {
    return this._initiator;
  }

  /**
   * @return {?Protocol.Runtime.CallFrame}
   */
  topFrame() {
    var stackTrace = this.stackTraceForSelfOrInitiator();
    return stackTrace && stackTrace[0] || null;
  }

  /**
   * @return {?Array<!Protocol.Runtime.CallFrame>}
   */
  stackTraceForSelfOrInitiator() {
    return this.stackTrace || (this._initiator && TimelineModel.TimelineData.forEvent(this._initiator).stackTrace);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {!TimelineModel.TimelineData}
   */
  static forEvent(event) {
    var data = event[TimelineModel.TimelineData._symbol];
    if (!data) {
      data = new TimelineModel.TimelineData();
      event[TimelineModel.TimelineData._symbol] = data;
    }
    return data;
  }
};

TimelineModel.TimelineData._symbol = Symbol('timelineData');
