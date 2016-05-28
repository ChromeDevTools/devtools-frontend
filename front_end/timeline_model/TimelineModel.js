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
 * @constructor
 * @param {!WebInspector.TimelineModel.Filter} eventFilter
 */
WebInspector.TimelineModel = function(eventFilter)
{
    this._eventFilter = eventFilter;
    this.reset();
}

/**
 * @enum {string}
 */
WebInspector.TimelineModel.RecordType = {
    Task: "Task",
    Program: "Program",
    EventDispatch: "EventDispatch",

    GPUTask: "GPUTask",

    Animation: "Animation",
    RequestMainThreadFrame: "RequestMainThreadFrame",
    BeginFrame: "BeginFrame",
    NeedsBeginFrameChanged: "NeedsBeginFrameChanged",
    BeginMainThreadFrame: "BeginMainThreadFrame",
    ActivateLayerTree: "ActivateLayerTree",
    DrawFrame: "DrawFrame",
    HitTest: "HitTest",
    ScheduleStyleRecalculation: "ScheduleStyleRecalculation",
    RecalculateStyles: "RecalculateStyles", // For backwards compatibility only, now replaced by UpdateLayoutTree.
    UpdateLayoutTree: "UpdateLayoutTree",
    InvalidateLayout: "InvalidateLayout",
    Layout: "Layout",
    UpdateLayer: "UpdateLayer",
    UpdateLayerTree: "UpdateLayerTree",
    PaintSetup: "PaintSetup",
    Paint: "Paint",
    PaintImage: "PaintImage",
    Rasterize: "Rasterize",
    RasterTask: "RasterTask",
    ScrollLayer: "ScrollLayer",
    CompositeLayers: "CompositeLayers",

    ScheduleStyleInvalidationTracking: "ScheduleStyleInvalidationTracking",
    StyleRecalcInvalidationTracking: "StyleRecalcInvalidationTracking",
    StyleInvalidatorInvalidationTracking: "StyleInvalidatorInvalidationTracking",
    LayoutInvalidationTracking: "LayoutInvalidationTracking",
    LayerInvalidationTracking: "LayerInvalidationTracking",
    PaintInvalidationTracking: "PaintInvalidationTracking",
    ScrollInvalidationTracking: "ScrollInvalidationTracking",

    ParseHTML: "ParseHTML",
    ParseAuthorStyleSheet: "ParseAuthorStyleSheet",

    TimerInstall: "TimerInstall",
    TimerRemove: "TimerRemove",
    TimerFire: "TimerFire",

    XHRReadyStateChange: "XHRReadyStateChange",
    XHRLoad: "XHRLoad",
    CompileScript: "v8.compile",
    EvaluateScript: "EvaluateScript",

    CommitLoad: "CommitLoad",
    MarkLoad: "MarkLoad",
    MarkDOMContent: "MarkDOMContent",
    MarkFirstPaint: "MarkFirstPaint",

    TimeStamp: "TimeStamp",
    ConsoleTime: "ConsoleTime",
    UserTiming: "UserTiming",

    ResourceSendRequest: "ResourceSendRequest",
    ResourceReceiveResponse: "ResourceReceiveResponse",
    ResourceReceivedData: "ResourceReceivedData",
    ResourceFinish: "ResourceFinish",

    FunctionCall: "FunctionCall",
    GCEvent: "GCEvent", // For backwards compatibility only, now replaced by MinorGC/MajorGC.
    MajorGC: "MajorGC",
    MinorGC: "MinorGC",
    JSFrame: "JSFrame",
    JSSample: "JSSample",
    // V8Sample events are coming from tracing and contain raw stacks with function addresses.
    // After being processed with help of JitCodeAdded and JitCodeMoved events they
    // get translated into function infos and stored as stacks in JSSample events.
    V8Sample: "V8Sample",
    JitCodeAdded: "JitCodeAdded",
    JitCodeMoved: "JitCodeMoved",
    ParseScriptOnBackground: "v8.parseOnBackground",

    UpdateCounters: "UpdateCounters",

    RequestAnimationFrame: "RequestAnimationFrame",
    CancelAnimationFrame: "CancelAnimationFrame",
    FireAnimationFrame: "FireAnimationFrame",

    RequestIdleCallback: "RequestIdleCallback",
    CancelIdleCallback: "CancelIdleCallback",
    FireIdleCallback: "FireIdleCallback",

    WebSocketCreate : "WebSocketCreate",
    WebSocketSendHandshakeRequest : "WebSocketSendHandshakeRequest",
    WebSocketReceiveHandshakeResponse : "WebSocketReceiveHandshakeResponse",
    WebSocketDestroy : "WebSocketDestroy",

    EmbedderCallback : "EmbedderCallback",

    SetLayerTreeId: "SetLayerTreeId",
    TracingStartedInPage: "TracingStartedInPage",
    TracingSessionIdForWorker: "TracingSessionIdForWorker",

    DecodeImage: "Decode Image",
    ResizeImage: "Resize Image",
    DrawLazyPixelRef: "Draw LazyPixelRef",
    DecodeLazyPixelRef: "Decode LazyPixelRef",

    LazyPixelRef: "LazyPixelRef",
    LayerTreeHostImplSnapshot: "cc::LayerTreeHostImpl",
    PictureSnapshot: "cc::Picture",
    DisplayItemListSnapshot: "cc::DisplayItemList",
    LatencyInfo: "LatencyInfo",
    LatencyInfoFlow: "LatencyInfo.Flow",
    InputLatencyMouseMove: "InputLatency::MouseMove",
    InputLatencyMouseWheel: "InputLatency::MouseWheel",
    ImplSideFling: "InputHandlerProxy::HandleGestureFling::started",
    GCIdleLazySweep: "ThreadState::performIdleLazySweep",
    GCCompleteSweep: "ThreadState::completeSweep",
    GCCollectGarbage: "BlinkGCMarking",

    // CpuProfile is a virtual event created on frontend to support
    // serialization of CPU Profiles within tracing timeline data.
    CpuProfile: "CpuProfile"
}

WebInspector.TimelineModel.Category = {
    Console: "blink.console",
    UserTiming: "blink.user_timing",
    LatencyInfo: "latencyInfo"
};

/**
 * @enum {string}
 */
WebInspector.TimelineModel.WarningType = {
    ForcedStyle: "ForcedStyle",
    ForcedLayout: "ForcedLayout",
    IdleDeadlineExceeded: "IdleDeadlineExceeded",
    V8Deopt: "V8Deopt"
}

WebInspector.TimelineModel.MainThreadName = "main";
WebInspector.TimelineModel.WorkerThreadName = "DedicatedWorker Thread";
WebInspector.TimelineModel.RendererMainThreadName = "CrRendererMain";

/**
 * @enum {symbol}
 */
WebInspector.TimelineModel.AsyncEventGroup = {
    animation: Symbol("animation"),
    console: Symbol("console"),
    userTiming: Symbol("userTiming"),
    input: Symbol("input")
};

/**
 * @param {!Array.<!WebInspector.TracingModel.Event>} events
 * @param {function(!WebInspector.TracingModel.Event)} onStartEvent
 * @param {function(!WebInspector.TracingModel.Event)} onEndEvent
 * @param {function(!WebInspector.TracingModel.Event,?WebInspector.TracingModel.Event)|undefined=} onInstantEvent
 * @param {number=} startTime
 * @param {number=} endTime
 */
WebInspector.TimelineModel.forEachEvent = function(events, onStartEvent, onEndEvent, onInstantEvent, startTime, endTime)
{
    startTime = startTime || 0;
    endTime = endTime || Infinity;
    var stack = [];
    for (var i = 0; i < events.length; ++i) {
        var e = events[i];
        if ((e.endTime || e.startTime) < startTime)
            continue;
        if (e.startTime >= endTime)
            break;
        if (WebInspector.TracingModel.isAsyncPhase(e.phase) || WebInspector.TracingModel.isFlowPhase(e.phase))
            continue;
        while (stack.length && stack.peekLast().endTime <= e.startTime)
            onEndEvent(stack.pop());
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

WebInspector.TimelineModel.DevToolsMetadataEvent = {
    TracingStartedInBrowser: "TracingStartedInBrowser",
    TracingStartedInPage: "TracingStartedInPage",
    TracingSessionIdForWorker: "TracingSessionIdForWorker",
};

/**
 * @constructor
 * @param {string} name
 */
WebInspector.TimelineModel.VirtualThread = function(name)
{
    this.name = name;
    /** @type {!Array<!WebInspector.TracingModel.Event>} */
    this.events = [];
    /** @type {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} */
    this.asyncEventsByGroup = new Map();
}

WebInspector.TimelineModel.VirtualThread.prototype = {
    /**
     * @return {boolean}
     */
    isWorker: function()
    {
        return this.name === WebInspector.TimelineModel.WorkerThreadName;
    }
}

/**
 * @constructor
 * @param {!WebInspector.TracingModel.Event} traceEvent
 */
WebInspector.TimelineModel.Record = function(traceEvent)
{
    this._event = traceEvent;
    this._children = [];
}

/**
 * @param {!WebInspector.TimelineModel.Record} a
 * @param {!WebInspector.TimelineModel.Record} b
 * @return {number}
 */
WebInspector.TimelineModel.Record._compareStartTime = function(a, b)
{
    // Never return 0 as otherwise equal records would be merged.
    return a.startTime() <= b.startTime() ? -1 : 1;
}

WebInspector.TimelineModel.Record.prototype = {
    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        var threadName = this._event.thread.name();
        // FIXME: correctly specify target
        return threadName === WebInspector.TimelineModel.RendererMainThreadName ? WebInspector.targetManager.targets()[0] || null : null;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    children: function()
    {
        return this._children;
    },

    /**
     * @return {number}
     */
    startTime: function()
    {
        return this._event.startTime;
    },

    /**
     * @return {number}
     */
    endTime: function()
    {
        return this._event.endTime || this._event.startTime;
    },

    /**
     * @return {string}
     */
    thread: function()
    {
        if (this._event.thread.name() === WebInspector.TimelineModel.RendererMainThreadName)
            return WebInspector.TimelineModel.MainThreadName;
        return this._event.thread.name();
    },

    /**
     * @return {!WebInspector.TimelineModel.RecordType}
     */
    type: function()
    {
        return WebInspector.TimelineModel._eventType(this._event);
    },

    /**
     * @param {string} key
     * @return {?Object}
     */
    getUserObject: function(key)
    {
        if (key === "TimelineUIUtils::preview-element")
            return this._event.previewElement;
        throw new Error("Unexpected key: " + key);
    },

    /**
     * @param {string} key
     * @param {?Object|undefined} value
     */
    setUserObject: function(key, value)
    {
        if (key !== "TimelineUIUtils::preview-element")
            throw new Error("Unexpected key: " + key);
        this._event.previewElement = /** @type {?Element} */ (value);
    },

    /**
     * @return {!WebInspector.TracingModel.Event}
     */
    traceEvent: function()
    {
        return this._event;
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} child
     */
    _addChild: function(child)
    {
        this._children.push(child);
        child.parent = this;
    }
}

/** @typedef {!{page: !Array<!WebInspector.TracingModel.Event>, workers: !Array<!WebInspector.TracingModel.Event>}} */
WebInspector.TimelineModel.MetadataEvents;

/**
 * @return {!WebInspector.TimelineModel.RecordType}
 */
WebInspector.TimelineModel._eventType = function(event)
{
    if (event.hasCategory(WebInspector.TimelineModel.Category.Console))
        return WebInspector.TimelineModel.RecordType.ConsoleTime;
    if (event.hasCategory(WebInspector.TimelineModel.Category.UserTiming))
        return WebInspector.TimelineModel.RecordType.UserTiming;
    if (event.hasCategory(WebInspector.TimelineModel.Category.LatencyInfo))
        return WebInspector.TimelineModel.RecordType.LatencyInfo;
    return /** @type !WebInspector.TimelineModel.RecordType */ (event.name);
}

WebInspector.TimelineModel.prototype = {
    /**
     * @deprecated Test use only!
     * @param {?function(!WebInspector.TimelineModel.Record)|?function(!WebInspector.TimelineModel.Record,number)} preOrderCallback
     * @param {function(!WebInspector.TimelineModel.Record)|function(!WebInspector.TimelineModel.Record,number)=} postOrderCallback
     * @return {boolean}
     */
    forAllRecords: function(preOrderCallback, postOrderCallback)
    {
        /**
         * @param {!Array.<!WebInspector.TimelineModel.Record>} records
         * @param {number} depth
         * @return {boolean}
         */
        function processRecords(records, depth)
        {
            for (var i = 0; i < records.length; ++i) {
                var record = records[i];
                if (preOrderCallback && preOrderCallback(record, depth))
                    return true;
                if (processRecords(record.children(), depth + 1))
                    return true;
                if (postOrderCallback && postOrderCallback(record, depth))
                    return true;
            }
            return false;
        }
        return processRecords(this._records, 0);
    },

    /**
     * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
     * @param {function(!WebInspector.TimelineModel.Record)|function(!WebInspector.TimelineModel.Record,number)} callback
     */
    forAllFilteredRecords: function(filters, callback)
    {
        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @param {number} depth
         * @this {WebInspector.TimelineModel}
         * @return {boolean}
         */
        function processRecord(record, depth)
        {
            var visible = WebInspector.TimelineModel.isVisible(filters, record.traceEvent());
            if (visible && callback(record, depth))
                return true;

            for (var i = 0; i < record.children().length; ++i) {
                if (processRecord.call(this, record.children()[i], visible ? depth + 1 : depth))
                    return true;
            }
            return false;
        }

        for (var i = 0; i < this._records.length; ++i)
            processRecord.call(this, this._records[i], 0);
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    records: function()
    {
        return this._records;
    },

    /**
     * @return {!Array<!WebInspector.CPUProfileDataModel>}
     */
    cpuProfiles: function()
    {
        return this._cpuProfiles;
    },

    /**
     * @return {?string}
     */
    sessionId: function()
    {
        return this._sessionId;
    },

    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        // FIXME: Consider returning null for loaded traces.
        return WebInspector.targetManager.targets()[0];
    },

    /**
     * @param {!WebInspector.TracingModel} tracingModel
     * @param {boolean=} produceTraceStartedInPage
     */
    setEvents: function(tracingModel, produceTraceStartedInPage)
    {
        this.reset();
        this._resetProcessingState();

        this._minimumRecordTime = tracingModel.minimumRecordTime();
        this._maximumRecordTime = tracingModel.maximumRecordTime();

        var metadataEvents = this._processMetadataEvents(tracingModel, !!produceTraceStartedInPage);
        var startTime = 0;
        for (var i = 0, length = metadataEvents.page.length; i < length; i++) {
            var metaEvent = metadataEvents.page[i];
            var process = metaEvent.thread.process();
            var endTime = i + 1 < length ? metadataEvents.page[i + 1].startTime : Infinity;
            this._currentPage = metaEvent.args["data"] && metaEvent.args["data"]["page"];
            for (var thread of process.sortedThreads()) {
                if (thread.name() === WebInspector.TimelineModel.WorkerThreadName && !metadataEvents.workers.some(function(e) { return e.args["data"]["workerThreadId"] === thread.id(); }))
                    continue;
                this._processThreadEvents(startTime, endTime, metaEvent.thread, thread);
            }
            startTime = endTime;
        }
        this._inspectedTargetEvents.sort(WebInspector.TracingModel.Event.compareStartTime);

        this._processBrowserEvents(tracingModel);
        this._buildTimelineRecords();
        this._buildGPUEvents(tracingModel);
        this._insertFirstPaintEvent();
        this._resetProcessingState();
    },

    /**
     * @param {!WebInspector.TracingModel} tracingModel
     * @param {boolean} produceTraceStartedInPage
     * @return {!WebInspector.TimelineModel.MetadataEvents}
     */
    _processMetadataEvents: function(tracingModel, produceTraceStartedInPage)
    {
        var metadataEvents = tracingModel.devToolsMetadataEvents();

        var pageDevToolsMetadataEvents = [];
        var workersDevToolsMetadataEvents = [];
        for (var event of metadataEvents) {
            if (event.name === WebInspector.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage) {
                pageDevToolsMetadataEvents.push(event);
            } else if (event.name === WebInspector.TimelineModel.DevToolsMetadataEvent.TracingSessionIdForWorker) {
                workersDevToolsMetadataEvents.push(event);
            } else if (event.name === WebInspector.TimelineModel.DevToolsMetadataEvent.TracingStartedInBrowser) {
                console.assert(!this._mainFrameNodeId, "Multiple sessions in trace");
                this._mainFrameNodeId = event.args["frameTreeNodeId"];
            }
        }
        if (!pageDevToolsMetadataEvents.length) {
            // The trace is probably coming not from DevTools. Make a mock Metadata event.
            var pageMetaEvent = produceTraceStartedInPage ? this._makeMockPageMetadataEvent(tracingModel) : null;
            if (!pageMetaEvent) {
                console.error(WebInspector.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage + " event not found.");
                return {page: [], workers: []};
            }
            pageDevToolsMetadataEvents.push(pageMetaEvent);
        }
        var sessionId = pageDevToolsMetadataEvents[0].args["sessionId"] || pageDevToolsMetadataEvents[0].args["data"]["sessionId"];
        this._sessionId = sessionId;

        var mismatchingIds = new Set();
        /**
         * @param {!WebInspector.TracingModel.Event} event
         * @return {boolean}
         */
        function checkSessionId(event)
        {
            var args = event.args;
            // FIXME: put sessionId into args["data"] for TracingStartedInPage event.
            if (args["data"])
                args = args["data"];
            var id = args["sessionId"];
            if (id === sessionId)
                return true;
            mismatchingIds.add(id);
            return false;
        }
        var result = {
            page: pageDevToolsMetadataEvents.filter(checkSessionId).sort(WebInspector.TracingModel.Event.compareStartTime),
            workers: workersDevToolsMetadataEvents.filter(checkSessionId).sort(WebInspector.TracingModel.Event.compareStartTime)
        };
        if (mismatchingIds.size)
            WebInspector.console.error("Timeline recording was started in more than one page simultaneously. Session id mismatch: " + this._sessionId + " and " + mismatchingIds.valuesArray() + ".");
        return result;
    },

    /**
     * @param {!WebInspector.TracingModel} tracingModel
     * @return {?WebInspector.TracingModel.Event}
     */
    _makeMockPageMetadataEvent: function(tracingModel)
    {
        var rendererMainThreadName = WebInspector.TimelineModel.RendererMainThreadName;
        // FIXME: pick up the first renderer process for now.
        var process = Object.values(tracingModel.sortedProcesses()).filter(function(p) { return p.threadByName(rendererMainThreadName); })[0];
        var thread = process && process.threadByName(rendererMainThreadName);
        if (!thread)
            return null;
        var pageMetaEvent = new WebInspector.TracingModel.Event(
            WebInspector.TracingModel.DevToolsMetadataEventCategory,
            WebInspector.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage,
            WebInspector.TracingModel.Phase.Metadata,
            tracingModel.minimumRecordTime(), thread);
        pageMetaEvent.addArgs({"data": {"sessionId": "mockSessionId"}});
        return pageMetaEvent;
    },

    _insertFirstPaintEvent: function()
    {
        if (!this._firstCompositeLayers)
            return;

        // First Paint is actually a DrawFrame that happened after first CompositeLayers following last CommitLoadEvent.
        var recordTypes = WebInspector.TimelineModel.RecordType;
        var i = this._inspectedTargetEvents.lowerBound(this._firstCompositeLayers, WebInspector.TracingModel.Event.compareStartTime);
        for (; i < this._inspectedTargetEvents.length && this._inspectedTargetEvents[i].name !== recordTypes.DrawFrame; ++i) { }
        if (i >= this._inspectedTargetEvents.length)
            return;
        var drawFrameEvent = this._inspectedTargetEvents[i];
        var firstPaintEvent = new WebInspector.TracingModel.Event(drawFrameEvent.categoriesString, recordTypes.MarkFirstPaint, WebInspector.TracingModel.Phase.Instant, drawFrameEvent.startTime, drawFrameEvent.thread);
        this._mainThreadEvents.splice(this._mainThreadEvents.lowerBound(firstPaintEvent, WebInspector.TracingModel.Event.compareStartTime), 0, firstPaintEvent);
        var firstPaintRecord = new WebInspector.TimelineModel.Record(firstPaintEvent);
        this._eventDividerRecords.splice(this._eventDividerRecords.lowerBound(firstPaintRecord, WebInspector.TimelineModel.Record._compareStartTime), 0, firstPaintRecord);
    },

    /**
     * @param {!WebInspector.TracingModel} tracingModel
     */
    _processBrowserEvents: function(tracingModel)
    {
        var browserMain = tracingModel.threadByName("Browser", "CrBrowserMain");
        if (!browserMain)
            return;
        // Disregard regular events, we don't need them yet, but still process to get proper metadata.
        browserMain.events().forEach(this._processBrowserEvent, this);
        /** @type {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} */
        var asyncEventsByGroup = new Map();
        this._processAsyncEvents(asyncEventsByGroup, browserMain.asyncEvents());
        this._mergeAsyncEvents(this._mainThreadAsyncEventsByGroup, asyncEventsByGroup);
    },

    _buildTimelineRecords: function()
    {
        var topLevelRecords = this._buildTimelineRecordsForThread(this.mainThreadEvents());
        for (var i = 0; i < topLevelRecords.length; i++) {
            var record = topLevelRecords[i];
            if (WebInspector.TracingModel.isTopLevelEvent(record.traceEvent()))
                this._mainThreadTasks.push(record);
        }

        /**
         * @param {!WebInspector.TimelineModel.VirtualThread} virtualThread
         * @this {!WebInspector.TimelineModel}
         */
        function processVirtualThreadEvents(virtualThread)
        {
            var threadRecords = this._buildTimelineRecordsForThread(virtualThread.events);
            topLevelRecords = topLevelRecords.mergeOrdered(threadRecords, WebInspector.TimelineModel.Record._compareStartTime);
        }
        this.virtualThreads().forEach(processVirtualThreadEvents.bind(this));
        this._records = topLevelRecords;
    },

    /**
     * @param {!WebInspector.TracingModel} tracingModel
     */
    _buildGPUEvents: function(tracingModel)
    {
        var thread = tracingModel.threadByName("GPU Process", "CrGpuMain");
        if (!thread)
            return;
        var gpuEventName = WebInspector.TimelineModel.RecordType.GPUTask;
        this._gpuEvents = thread.events().filter(event => event.name === gpuEventName);
    },

    /**
     * @param {!Array.<!WebInspector.TracingModel.Event>} threadEvents
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    _buildTimelineRecordsForThread: function(threadEvents)
    {
        var recordStack = [];
        var topLevelRecords = [];

        for (var i = 0, size = threadEvents.length; i < size; ++i) {
            var event = threadEvents[i];
            for (var top = recordStack.peekLast(); top && top._event.endTime <= event.startTime; top = recordStack.peekLast())
                recordStack.pop();
            if (event.phase === WebInspector.TracingModel.Phase.AsyncEnd || event.phase === WebInspector.TracingModel.Phase.NestableAsyncEnd)
                continue;
            var parentRecord = recordStack.peekLast();
            // Maintain the back-end logic of old timeline, skip console.time() / console.timeEnd() that are not properly nested.
            if (WebInspector.TracingModel.isAsyncBeginPhase(event.phase) && parentRecord && event.endTime > parentRecord._event.endTime)
                continue;
            var record = new WebInspector.TimelineModel.Record(event);
            if (WebInspector.TimelineModel.isMarkerEvent(event))
                this._eventDividerRecords.push(record);
            if (!this._eventFilter.accept(event) && !WebInspector.TracingModel.isTopLevelEvent(event))
                continue;
            if (parentRecord)
                parentRecord._addChild(record);
            else
                topLevelRecords.push(record);
            if (event.endTime)
                recordStack.push(record);
        }

        return topLevelRecords;
    },

    _resetProcessingState: function()
    {
        this._asyncEventTracker = new WebInspector.TimelineAsyncEventTracker();
        this._invalidationTracker = new WebInspector.InvalidationTracker();
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
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @param {!WebInspector.TracingModel.Thread} mainThread
     * @param {!WebInspector.TracingModel.Thread} thread
     */
    _processThreadEvents: function(startTime, endTime, mainThread, thread)
    {
        var events = thread.events();
        var asyncEvents = thread.asyncEvents();

        var jsSamples;
        if (Runtime.experiments.isEnabled("timelineTracingJSProfile")) {
            jsSamples = WebInspector.TimelineJSProfileProcessor.processRawV8Samples(events);
        } else {
            var cpuProfileEvent = events.peekLast();
            if (cpuProfileEvent && cpuProfileEvent.name === WebInspector.TimelineModel.RecordType.CpuProfile) {
                var cpuProfile = cpuProfileEvent.args["data"]["cpuProfile"];
                if (cpuProfile) {
                    var jsProfileModel = new WebInspector.CPUProfileDataModel(cpuProfile);
                    this._cpuProfiles.push(jsProfileModel);
                    jsSamples = WebInspector.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile(jsProfileModel, thread);
                }
            }
        }

        if (jsSamples && jsSamples.length)
            events = events.mergeOrdered(jsSamples, WebInspector.TracingModel.Event.orderedCompareStartTime);
        if (jsSamples || events.some(function(e) { return e.name === WebInspector.TimelineModel.RecordType.JSSample; })) {
            var jsFrameEvents = WebInspector.TimelineJSProfileProcessor.generateJSFrameEvents(events);
            if (jsFrameEvents && jsFrameEvents.length)
                events = jsFrameEvents.mergeOrdered(events, WebInspector.TracingModel.Event.orderedCompareStartTime);
        }

        var threadEvents;
        var threadAsyncEventsByGroup;
        if (thread === mainThread) {
            threadEvents = this._mainThreadEvents;
            threadAsyncEventsByGroup = this._mainThreadAsyncEventsByGroup;
        } else {
            var virtualThread = new WebInspector.TimelineModel.VirtualThread(thread.name());
            this._virtualThreads.push(virtualThread);
            threadEvents = virtualThread.events;
            threadAsyncEventsByGroup = virtualThread.asyncEventsByGroup;
        }

        this._eventStack = [];
        var i = events.lowerBound(startTime, function(time, event) { return time - event.startTime });
        var length = events.length;
        for (; i < length; i++) {
            var event = events[i];
            if (endTime && event.startTime >= endTime)
                break;
            if (!this._processEvent(event))
                continue;
            threadEvents.push(event);
            this._inspectedTargetEvents.push(event);
        }
        this._processAsyncEvents(threadAsyncEventsByGroup, asyncEvents, startTime, endTime);
        // Pretend the compositor's async events are on the main thread.
        if (thread.name() === "Compositor") {
            this._mergeAsyncEvents(this._mainThreadAsyncEventsByGroup, threadAsyncEventsByGroup);
            threadAsyncEventsByGroup.clear();
        }
    },

    /**
     * @param {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} asyncEventsByGroup
     * @param {!Array<!WebInspector.TracingModel.AsyncEvent>} asyncEvents
     * @param {number=} startTime
     * @param {number=} endTime
     */
    _processAsyncEvents: function(asyncEventsByGroup, asyncEvents, startTime, endTime)
    {
        var i = startTime ? asyncEvents.lowerBound(startTime, function(time, asyncEvent) { return time - asyncEvent.startTime }) : 0;
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
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    _processEvent: function(event)
    {
        var eventStack = this._eventStack;
        while (eventStack.length && eventStack.peekLast().endTime <= event.startTime)
            eventStack.pop();

        var recordTypes = WebInspector.TimelineModel.RecordType;

        if (this._currentScriptEvent && event.startTime > this._currentScriptEvent.endTime)
            this._currentScriptEvent = null;

        var eventData = event.args["data"] || event.args["beginData"] || {};
        if (eventData && eventData["stackTrace"])
            event.stackTrace = eventData["stackTrace"];

        if (eventStack.length && eventStack.peekLast().name === recordTypes.EventDispatch)
            eventStack.peekLast().hasChildren = true;
        this._asyncEventTracker.processEvent(event);
        if (event.initiator && event.initiator.url)
            event.url = event.initiator.url;
        switch (event.name) {
        case recordTypes.ResourceSendRequest:
        case recordTypes.WebSocketCreate:
            event.url = event.args["data"]["url"];
            event.initiator = eventStack.peekLast() || null;
            break;

        case recordTypes.ScheduleStyleRecalculation:
            this._lastScheduleStyleRecalculation[event.args["data"]["frame"]] = event;
            break;

        case recordTypes.UpdateLayoutTree:
        case recordTypes.RecalculateStyles:
            this._invalidationTracker.didRecalcStyle(event);
            if (event.args["beginData"])
                event.initiator = this._lastScheduleStyleRecalculation[event.args["beginData"]["frame"]];
            this._lastRecalculateStylesEvent = event;
            if (this._currentScriptEvent)
                event.warning = WebInspector.TimelineModel.WarningType.ForcedStyle;
            break;

        case recordTypes.ScheduleStyleInvalidationTracking:
        case recordTypes.StyleRecalcInvalidationTracking:
        case recordTypes.StyleInvalidatorInvalidationTracking:
        case recordTypes.LayoutInvalidationTracking:
        case recordTypes.LayerInvalidationTracking:
        case recordTypes.PaintInvalidationTracking:
        case recordTypes.ScrollInvalidationTracking:
            this._invalidationTracker.addInvalidation(new WebInspector.InvalidationTrackingEvent(event));
            break;

        case recordTypes.InvalidateLayout:
            // Consider style recalculation as a reason for layout invalidation,
            // but only if we had no earlier layout invalidation records.
            var layoutInitator = event;
            var frameId = event.args["data"]["frame"];
            if (!this._layoutInvalidate[frameId] && this._lastRecalculateStylesEvent && this._lastRecalculateStylesEvent.endTime >  event.startTime)
                layoutInitator = this._lastRecalculateStylesEvent.initiator;
            this._layoutInvalidate[frameId] = layoutInitator;
            break;

        case recordTypes.Layout:
            this._invalidationTracker.didLayout(event);
            var frameId = event.args["beginData"]["frame"];
            event.initiator = this._layoutInvalidate[frameId];
            // In case we have no closing Layout event, endData is not available.
            if (event.args["endData"]) {
                event.backendNodeId = event.args["endData"]["rootNode"];
                event.highlightQuad =  event.args["endData"]["root"];
            }
            this._layoutInvalidate[frameId] = null;
            if (this._currentScriptEvent)
                event.warning = WebInspector.TimelineModel.WarningType.ForcedLayout;
            break;

        case recordTypes.EvaluateScript:
        case recordTypes.FunctionCall:
            if (!this._currentScriptEvent)
                this._currentScriptEvent = event;
            break;

        case recordTypes.SetLayerTreeId:
            this._inspectedTargetLayerTreeId = event.args["layerTreeId"] || event.args["data"]["layerTreeId"];
            break;

        case recordTypes.Paint:
            this._invalidationTracker.didPaint(event);
            event.highlightQuad = event.args["data"]["clip"];
            event.backendNodeId = event.args["data"]["nodeId"];
            // Only keep layer paint events, skip paints for subframes that get painted to the same layer as parent.
            if (!event.args["data"]["layerId"])
                break;
            var layerId = event.args["data"]["layerId"];
            this._lastPaintForLayer[layerId] = event;
            break;

        case recordTypes.DisplayItemListSnapshot:
        case recordTypes.PictureSnapshot:
            var layerUpdateEvent = this._findAncestorEvent(recordTypes.UpdateLayer);
            if (!layerUpdateEvent || layerUpdateEvent.args["layerTreeId"] !== this._inspectedTargetLayerTreeId)
                break;
            var paintEvent = this._lastPaintForLayer[layerUpdateEvent.args["layerId"]];
            if (paintEvent)
                paintEvent.picture = event;
            break;

        case recordTypes.ScrollLayer:
            event.backendNodeId = event.args["data"]["nodeId"];
            break;

        case recordTypes.PaintImage:
            event.backendNodeId = event.args["data"]["nodeId"];
            event.url = event.args["data"]["url"];
            break;

        case recordTypes.DecodeImage:
        case recordTypes.ResizeImage:
            var paintImageEvent = this._findAncestorEvent(recordTypes.PaintImage);
            if (!paintImageEvent) {
                var decodeLazyPixelRefEvent = this._findAncestorEvent(recordTypes.DecodeLazyPixelRef);
                paintImageEvent = decodeLazyPixelRefEvent && this._paintImageEventByPixelRefId[decodeLazyPixelRefEvent.args["LazyPixelRef"]];
            }
            if (!paintImageEvent)
                break;
            event.backendNodeId = paintImageEvent.backendNodeId;
            event.url = paintImageEvent.url;
            break;

        case recordTypes.DrawLazyPixelRef:
            var paintImageEvent = this._findAncestorEvent(recordTypes.PaintImage);
            if (!paintImageEvent)
                break;
            this._paintImageEventByPixelRefId[event.args["LazyPixelRef"]] = paintImageEvent;
            event.backendNodeId = paintImageEvent.backendNodeId;
            event.url = paintImageEvent.url;
            break;

        case recordTypes.MarkDOMContent:
        case recordTypes.MarkLoad:
            var page = eventData["page"];
            if (page && page !== this._currentPage)
                return false;
            break;

        case recordTypes.CommitLoad:
            var page = eventData["page"];
            if (page && page !== this._currentPage)
                return false;
            if (!eventData["isMainFrame"])
                break;
            this._hadCommitLoad = true;
            this._firstCompositeLayers = null;
            break;

        case recordTypes.CompositeLayers:
            if (!this._firstCompositeLayers && this._hadCommitLoad)
                this._firstCompositeLayers = event;
            break;

        case recordTypes.FireIdleCallback:
            if (event.duration > eventData["allottedMilliseconds"]) {
                event.warning = WebInspector.TimelineModel.WarningType.IdleDeadlineExceeded;
            }
            break;
        }
        if (WebInspector.TracingModel.isAsyncPhase(event.phase))
            return true;
        var duration = event.duration;
        if (!duration)
            return true;
        if (eventStack.length) {
            var parent = eventStack.peekLast();
            parent.selfTime -= duration;
            if (parent.selfTime < 0) {
                var epsilon = 1e-3;
                if (parent.selfTime < -epsilon)
                    console.error("Children are longer than parent at " + event.startTime + " (" + (event.startTime - this.minimumRecordTime()).toFixed(3) + ") by " + parent.selfTime.toFixed(3));
                parent.selfTime = 0;
            }
        }
        event.selfTime = duration;
        eventStack.push(event);
        return true;
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _processBrowserEvent: function(event)
    {
        if (event.name !== WebInspector.TimelineModel.RecordType.LatencyInfoFlow)
            return;
        var frameId = event.args["frameTreeNodeId"];
        if (typeof frameId === "number" && frameId === this._mainFrameNodeId)
            this._knownInputEvents.add(event.bind_id);
    },

    /**
     * @param {!WebInspector.TracingModel.AsyncEvent} asyncEvent
     * @return {?WebInspector.TimelineModel.AsyncEventGroup}
     */
    _processAsyncEvent: function(asyncEvent)
    {
        var groups = WebInspector.TimelineModel.AsyncEventGroup;
        if (asyncEvent.hasCategory(WebInspector.TimelineModel.Category.Console))
            return groups.console;
        if (asyncEvent.hasCategory(WebInspector.TimelineModel.Category.UserTiming))
            return groups.userTiming;
        if (asyncEvent.name === WebInspector.TimelineModel.RecordType.Animation)
            return groups.animation;
        if (asyncEvent.hasCategory(WebInspector.TimelineModel.Category.LatencyInfo) || asyncEvent.name === WebInspector.TimelineModel.RecordType.ImplSideFling) {
            var lastStep = asyncEvent.steps.peekLast();
            // FIXME: fix event termination on the back-end instead.
            if (lastStep.phase !== WebInspector.TracingModel.Phase.AsyncEnd)
                return null;
            var data = lastStep.args["data"];
            asyncEvent.causedFrame = !!(data && data["INPUT_EVENT_LATENCY_RENDERER_SWAP_COMPONENT"]);
            if (asyncEvent.hasCategory(WebInspector.TimelineModel.Category.LatencyInfo)) {
                if (!this._knownInputEvents.has(lastStep.id))
                    return null;
                if (asyncEvent.name === WebInspector.TimelineModel.RecordType.InputLatencyMouseMove && !asyncEvent.causedFrame)
                    return null;
                var rendererMain = data["INPUT_EVENT_LATENCY_RENDERER_MAIN_COMPONENT"];
                if (rendererMain) {
                    var time = rendererMain["time"] / 1000;
                    asyncEvent.steps[0].timeWaitingForMainThread = time - asyncEvent.steps[0].startTime;
                }
            }
            return groups.input;
        }
        return null;
    },

    /**
     * @param {string} name
     * @return {?WebInspector.TracingModel.Event}
     */
    _findAncestorEvent: function(name)
    {
        for (var i = this._eventStack.length - 1; i >= 0; --i) {
            var event = this._eventStack[i];
            if (event.name === name)
                return event;
        }
        return null;
    },

    /**
     * @param {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} target
     * @param {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} source
     */
    _mergeAsyncEvents: function(target, source)
    {
        for (var group of source.keys()) {
            var events = target.get(group) || [];
            events = events.mergeOrdered(source.get(group) || [], WebInspector.TracingModel.Event.compareStartAndEndTime);
            target.set(group, events);
        }
    },

    reset: function()
    {
        this._virtualThreads = [];
        /** @type {!Array<!WebInspector.TracingModel.Event>} */
        this._mainThreadEvents = [];
        /** @type {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} */
        this._mainThreadAsyncEventsByGroup = new Map();
        /** @type {!Array<!WebInspector.TracingModel.Event>} */
        this._inspectedTargetEvents = [];
        /** @type {!Array<!WebInspector.TimelineModel.Record>} */
        this._records = [];
        /** @type {!Array<!WebInspector.TimelineModel.Record>} */
        this._mainThreadTasks = [];
        /** @type {!Array<!WebInspector.TracingModel.Event>} */
        this._gpuEvents = [];
        /** @type {!Array<!WebInspector.TimelineModel.Record>} */
        this._eventDividerRecords = [];
        /** @type {?string} */
        this._sessionId = null;
        /** @type {?number} */
        this._mainFrameNodeId = null;
        /** @type {!Array<!WebInspector.CPUProfileDataModel>} */
        this._cpuProfiles = [];
        this._minimumRecordTime = 0;
        this._maximumRecordTime = 0;
    },

    /**
     * @return {number}
     */
    minimumRecordTime: function()
    {
        return this._minimumRecordTime;
    },

    /**
     * @return {number}
     */
    maximumRecordTime: function()
    {
        return this._maximumRecordTime;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    inspectedTargetEvents: function()
    {
        return this._inspectedTargetEvents;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    mainThreadEvents: function()
    {
        return this._mainThreadEvents;
    },

    /**
     * @param {!Array.<!WebInspector.TracingModel.Event>} events
     */
    _setMainThreadEvents: function(events)
    {
        this._mainThreadEvents = events;
    },

    /**
     * @return {!Map<!WebInspector.TimelineModel.AsyncEventGroup, !Array.<!WebInspector.TracingModel.AsyncEvent>>}
     */
    mainThreadAsyncEvents: function()
    {
        return this._mainThreadAsyncEventsByGroup;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.VirtualThread>}
     */
    virtualThreads: function()
    {
        return this._virtualThreads;
    },

    /**
     * @return {boolean}
     */
    isEmpty: function()
    {
        return this.minimumRecordTime() === 0 && this.maximumRecordTime() === 0;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    mainThreadTasks: function()
    {
        return this._mainThreadTasks;
    },

    /**
     * @return {!Array<!WebInspector.TracingModel.Event>}
     */
    gpuEvents: function()
    {
        return this._gpuEvents;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    eventDividerRecords: function()
    {
        return this._eventDividerRecords;
    },

    /**
     * @return {!Array<!WebInspector.TimelineModel.NetworkRequest>}
     */
    networkRequests: function()
    {
        /** @type {!Map<string,!WebInspector.TimelineModel.NetworkRequest>} */
        var requests = new Map();
        /** @type {!Array<!WebInspector.TimelineModel.NetworkRequest>} */
        var requestsList = [];
        /** @type {!Array<!WebInspector.TimelineModel.NetworkRequest>} */
        var zeroStartRequestsList = [];
        var types = WebInspector.TimelineModel.RecordType;
        var resourceTypes = new Set([
            types.ResourceSendRequest,
            types.ResourceReceiveResponse,
            types.ResourceReceivedData,
            types.ResourceFinish
        ]);
        var events = this.mainThreadEvents();
        for (var i = 0; i < events.length; ++i) {
            var e = events[i];
            if (!resourceTypes.has(e.name))
                continue;
            var id = e.args["data"]["requestId"];
            var request = requests.get(id);
            if (request) {
                request.addEvent(e);
            } else {
                request = new WebInspector.TimelineModel.NetworkRequest(e);
                requests.set(id, request);
                if (request.startTime)
                    requestsList.push(request);
                else
                    zeroStartRequestsList.push(request);
            }
        }
        return zeroStartRequestsList.concat(requestsList);
    },
}

/**
 * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
 * @param {!WebInspector.TracingModel.Event} event
 * @return {boolean}
 */
WebInspector.TimelineModel.isVisible = function(filters, event)
{
    for (var i = 0; i < filters.length; ++i) {
        if (!filters[i].accept(event))
            return false;
    }
    return true;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {boolean}
 */
WebInspector.TimelineModel.isMarkerEvent = function(event)
{
    var recordTypes = WebInspector.TimelineModel.RecordType;
    switch (event.name) {
    case recordTypes.TimeStamp:
    case recordTypes.MarkFirstPaint:
        return true;
    case recordTypes.MarkDOMContent:
    case recordTypes.MarkLoad:
        return event.args["data"]["isMainFrame"];
    default:
        return false;
    }
}

/**
 * @constructor
 * @param {!WebInspector.TracingModel.Event} event
 */
WebInspector.TimelineModel.NetworkRequest = function(event)
{
    this.startTime = event.name === WebInspector.TimelineModel.RecordType.ResourceSendRequest ? event.startTime : 0;
    this.endTime = Infinity;
    /** @type {!Array<!WebInspector.TracingModel.Event>} */
    this.children = [];
    this.addEvent(event);
}

WebInspector.TimelineModel.NetworkRequest.prototype = {
    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    addEvent: function(event)
    {
        this.children.push(event);
        var recordType = WebInspector.TimelineModel.RecordType;
        this.startTime = Math.min(this.startTime, event.startTime);
        var eventData = event.args["data"];
        if (eventData["mimeType"])
            this.mimeType = eventData["mimeType"];
        if ("priority" in eventData)
            this.priority = eventData["priority"];
        if (event.name === recordType.ResourceFinish)
            this.endTime = event.startTime;
        if (!this.responseTime && (event.name === recordType.ResourceReceiveResponse || event.name === recordType.ResourceReceivedData))
            this.responseTime = event.startTime;
        if (!this.url)
            this.url = eventData["url"];
        if (!this.requestMethod)
            this.requestMethod = eventData["requestMethod"];
    }
}

/**
 * @constructor
 */
WebInspector.TimelineModel.Filter = function()
{
}

WebInspector.TimelineModel.Filter.prototype = {
    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return true;
    }
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 * @param {!Array.<string>} visibleTypes
 */
WebInspector.TimelineVisibleEventsFilter = function(visibleTypes)
{
    WebInspector.TimelineModel.Filter.call(this);
    this._visibleTypes = new Set(visibleTypes);
}

WebInspector.TimelineVisibleEventsFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return this._visibleTypes.has(WebInspector.TimelineModel._eventType(event));
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 * @param {!Array<string>} excludeNames
 */
WebInspector.ExclusiveNameFilter = function(excludeNames)
{
    WebInspector.TimelineModel.Filter.call(this);
    this._excludeNames = new Set(excludeNames);
}

WebInspector.ExclusiveNameFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return !this._excludeNames.has(event.name);
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.ExcludeTopLevelFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
}

WebInspector.ExcludeTopLevelFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return !WebInspector.TracingModel.isTopLevelEvent(event);
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @param {!WebInspector.TracingModel.Event} event
 */
WebInspector.InvalidationTrackingEvent = function(event)
{
    /** @type {string} */
    this.type = event.name;
    /** @type {number} */
    this.startTime = event.startTime;
    /** @type {!WebInspector.TracingModel.Event} */
    this._tracingEvent = event;

    var eventData = event.args["data"];

    /** @type {number} */
    this.frame = eventData["frame"];
    /** @type {?number} */
    this.nodeId = eventData["nodeId"];
    /** @type {?string} */
    this.nodeName = eventData["nodeName"];
    /** @type {?number} */
    this.paintId = eventData["paintId"];
    /** @type {?number} */
    this.invalidationSet = eventData["invalidationSet"];
    /** @type {?string} */
    this.invalidatedSelectorId = eventData["invalidatedSelectorId"];
    /** @type {?string} */
    this.changedId = eventData["changedId"];
    /** @type {?string} */
    this.changedClass = eventData["changedClass"];
    /** @type {?string} */
    this.changedAttribute = eventData["changedAttribute"];
    /** @type {?string} */
    this.changedPseudo = eventData["changedPseudo"];
    /** @type {?string} */
    this.selectorPart = eventData["selectorPart"];
    /** @type {?string} */
    this.extraData = eventData["extraData"];
    /** @type {?Array.<!Object.<string, number>>} */
    this.invalidationList = eventData["invalidationList"];
    /** @type {!WebInspector.InvalidationCause} */
    this.cause = {reason: eventData["reason"], stackTrace: eventData["stackTrace"]};

    // FIXME: Move this to TimelineUIUtils.js.
    if (!this.cause.reason && this.cause.stackTrace && this.type === WebInspector.TimelineModel.RecordType.LayoutInvalidationTracking)
        this.cause.reason = "Layout forced";
}

/** @typedef {{reason: string, stackTrace: ?Array.<!RuntimeAgent.CallFrame>}} */
WebInspector.InvalidationCause;

/**
 * @constructor
 */
WebInspector.InvalidationTracker = function()
{
    this._initializePerFrameState();
}

WebInspector.InvalidationTracker.prototype = {
    /**
     * @param {!WebInspector.InvalidationTrackingEvent} invalidation
     */
    addInvalidation: function(invalidation)
    {
        this._startNewFrameIfNeeded();

        if (!invalidation.nodeId && !invalidation.paintId) {
            console.error("Invalidation lacks node information.");
            console.error(invalidation);
            return;
        }

        // PaintInvalidationTracking events provide a paintId and a nodeId which
        // we can use to update the paintId for all other invalidation tracking
        // events.
        var recordTypes = WebInspector.TimelineModel.RecordType;
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
        if (invalidation.type === recordTypes.StyleRecalcInvalidationTracking && invalidation.cause.reason === "StyleInvalidator")
            return;

        // Style invalidation events can occur before and during recalc style. didRecalcStyle
        // handles style invalidations that occur before the recalc style event but we need to
        // handle style recalc invalidations during recalc style here.
        var styleRecalcInvalidation = (invalidation.type === recordTypes.ScheduleStyleInvalidationTracking
            || invalidation.type === recordTypes.StyleInvalidatorInvalidationTracking
            || invalidation.type === recordTypes.StyleRecalcInvalidationTracking);
        if (styleRecalcInvalidation) {
            var duringRecalcStyle = invalidation.startTime && this._lastRecalcStyle
                && invalidation.startTime >= this._lastRecalcStyle.startTime
                && invalidation.startTime <= this._lastRecalcStyle.endTime;
            if (duringRecalcStyle)
                this._associateWithLastRecalcStyleEvent(invalidation);
        }

        // Record the invalidation so later events can look it up.
        if (this._invalidations[invalidation.type])
            this._invalidations[invalidation.type].push(invalidation);
        else
            this._invalidations[invalidation.type] = [ invalidation ];
        if (invalidation.nodeId) {
            if (this._invalidationsByNodeId[invalidation.nodeId])
                this._invalidationsByNodeId[invalidation.nodeId].push(invalidation);
            else
                this._invalidationsByNodeId[invalidation.nodeId] = [ invalidation ];
        }
    },

    /**
     * @param {!WebInspector.TracingModel.Event} recalcStyleEvent
     */
    didRecalcStyle: function(recalcStyleEvent)
    {
        this._lastRecalcStyle = recalcStyleEvent;
        var types = [WebInspector.TimelineModel.RecordType.ScheduleStyleInvalidationTracking,
                WebInspector.TimelineModel.RecordType.StyleInvalidatorInvalidationTracking,
                WebInspector.TimelineModel.RecordType.StyleRecalcInvalidationTracking];
        for (var invalidation of this._invalidationsOfTypes(types))
            this._associateWithLastRecalcStyleEvent(invalidation);
    },

    /**
     * @param {!WebInspector.InvalidationTrackingEvent} invalidation
     */
    _associateWithLastRecalcStyleEvent: function(invalidation)
    {
        if (invalidation.linkedRecalcStyleEvent)
            return;

        var recordTypes = WebInspector.TimelineModel.RecordType;
        var recalcStyleFrameId = this._lastRecalcStyle.args["beginData"]["frame"];
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
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {number} frameId
     * @param {!WebInspector.InvalidationTrackingEvent} styleInvalidatorInvalidation
     */
    _addSyntheticStyleRecalcInvalidations: function(event, frameId, styleInvalidatorInvalidation)
    {
        if (!styleInvalidatorInvalidation.invalidationList) {
            this._addSyntheticStyleRecalcInvalidation(styleInvalidatorInvalidation._tracingEvent, styleInvalidatorInvalidation);
            return;
        }
        if (!styleInvalidatorInvalidation.nodeId) {
            console.error("Invalidation lacks node information.");
            console.error(invalidation);
            return;
        }
        for (var i = 0; i < styleInvalidatorInvalidation.invalidationList.length; i++) {
            var setId = styleInvalidatorInvalidation.invalidationList[i]["id"];
            var lastScheduleStyleRecalculation;
            var nodeInvalidations = this._invalidationsByNodeId[styleInvalidatorInvalidation.nodeId] || [];
            for (var j = 0; j < nodeInvalidations.length; j++) {
                var invalidation = nodeInvalidations[j];
                if (invalidation.frame !== frameId || invalidation.invalidationSet !== setId || invalidation.type !== WebInspector.TimelineModel.RecordType.ScheduleStyleInvalidationTracking)
                    continue;
                lastScheduleStyleRecalculation = invalidation;
            }
            if (!lastScheduleStyleRecalculation) {
                console.error("Failed to lookup the event that scheduled a style invalidator invalidation.");
                continue;
            }
            this._addSyntheticStyleRecalcInvalidation(lastScheduleStyleRecalculation._tracingEvent, styleInvalidatorInvalidation);
        }
    },

    /**
     * @param {!WebInspector.TracingModel.Event} baseEvent
     * @param {!WebInspector.InvalidationTrackingEvent} styleInvalidatorInvalidation
     */
    _addSyntheticStyleRecalcInvalidation: function(baseEvent, styleInvalidatorInvalidation)
    {
        var invalidation = new WebInspector.InvalidationTrackingEvent(baseEvent);
        invalidation.type = WebInspector.TimelineModel.RecordType.StyleRecalcInvalidationTracking;
        invalidation.synthetic = true;
        if (styleInvalidatorInvalidation.cause.reason)
            invalidation.cause.reason = styleInvalidatorInvalidation.cause.reason;
        if (styleInvalidatorInvalidation.selectorPart)
            invalidation.selectorPart = styleInvalidatorInvalidation.selectorPart;

        this.addInvalidation(invalidation);
        if (!invalidation.linkedRecalcStyleEvent)
            this._associateWithLastRecalcStyleEvent(invalidation);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} layoutEvent
     */
    didLayout: function(layoutEvent)
    {
        var layoutFrameId = layoutEvent.args["beginData"]["frame"];
        for (var invalidation of this._invalidationsOfTypes([WebInspector.TimelineModel.RecordType.LayoutInvalidationTracking])) {
            if (invalidation.linkedLayoutEvent)
                continue;
            this._addInvalidationToEvent(layoutEvent, layoutFrameId, invalidation);
            invalidation.linkedLayoutEvent = true;
        }
    },

    /**
     * @param {!WebInspector.TracingModel.Event} paintEvent
     */
    didPaint: function(paintEvent)
    {
        this._didPaint = true;

        // If a paint doesn't have a corresponding graphics layer id, it paints
        // into its parent so add an effectivePaintId to these events.
        var layerId = paintEvent.args["data"]["layerId"];
        if (layerId)
            this._lastPaintWithLayer = paintEvent;
        if (!this._lastPaintWithLayer) {
            console.error("Failed to find a paint container for a paint event.");
            return;
        }

        var effectivePaintId = this._lastPaintWithLayer.args["data"]["nodeId"];
        var paintFrameId = paintEvent.args["data"]["frame"];
        var types = [WebInspector.TimelineModel.RecordType.StyleRecalcInvalidationTracking,
            WebInspector.TimelineModel.RecordType.LayoutInvalidationTracking,
            WebInspector.TimelineModel.RecordType.PaintInvalidationTracking,
            WebInspector.TimelineModel.RecordType.ScrollInvalidationTracking];
        for (var invalidation of this._invalidationsOfTypes(types)) {
            if (invalidation.paintId === effectivePaintId)
                this._addInvalidationToEvent(paintEvent, paintFrameId, invalidation);
        }
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {number} eventFrameId
     * @param {!WebInspector.InvalidationTrackingEvent} invalidation
     */
    _addInvalidationToEvent: function(event, eventFrameId, invalidation)
    {
        if (eventFrameId !== invalidation.frame)
            return;
        if (!event.invalidationTrackingEvents)
            event.invalidationTrackingEvents = [ invalidation ];
        else
            event.invalidationTrackingEvents.push(invalidation);
    },

    /**
     * @param {!Array.<string>=} types
     * @return {!Iterator.<!WebInspector.InvalidationTrackingEvent>}
     */
    _invalidationsOfTypes: function(types)
    {
        var invalidations = this._invalidations;
        if (!types)
            types = Object.keys(invalidations);
        function* generator()
        {
            for (var i = 0; i < types.length; ++i) {
                var invalidationList = invalidations[types[i]] || [];
                for (var j = 0; j < invalidationList.length; ++j)
                    yield invalidationList[j];
            }
        }
        return generator();
    },

    _startNewFrameIfNeeded: function()
    {
        if (!this._didPaint)
            return;

        this._initializePerFrameState();
    },

    _initializePerFrameState: function()
    {
        /** @type {!Object.<string, !Array.<!WebInspector.InvalidationTrackingEvent>>} */
        this._invalidations = {};
        /** @type {!Object.<number, !Array.<!WebInspector.InvalidationTrackingEvent>>} */
        this._invalidationsByNodeId = {};

        this._lastRecalcStyle = undefined;
        this._lastPaintWithLayer = undefined;
        this._didPaint = false;
    }
}

/**
 * @constructor
 */
WebInspector.TimelineAsyncEventTracker = function()
{
    WebInspector.TimelineAsyncEventTracker._initialize();
    /** @type {!Map<!WebInspector.TimelineModel.RecordType, !Map<string, !WebInspector.TracingModel.Event>>} */
    this._initiatorByType = new Map();
    for (var initiator of WebInspector.TimelineAsyncEventTracker._asyncEvents.keys())
        this._initiatorByType.set(initiator, new Map());
}

WebInspector.TimelineAsyncEventTracker._initialize = function()
{
    if (WebInspector.TimelineAsyncEventTracker._asyncEvents)
        return;
    var events = new Map();
    var type = WebInspector.TimelineModel.RecordType;

    events.set(type.TimerInstall, {causes: [type.TimerFire], joinBy: "timerId"});
    events.set(type.ResourceSendRequest, {causes: [type.ResourceReceiveResponse, type.ResourceReceivedData, type.ResourceFinish], joinBy: "requestId"});
    events.set(type.RequestAnimationFrame, {causes: [type.FireAnimationFrame], joinBy: "id"});
    events.set(type.RequestIdleCallback, {causes: [type.FireIdleCallback], joinBy: "id"});
    events.set(type.WebSocketCreate, {causes: [type.WebSocketSendHandshakeRequest, type.WebSocketReceiveHandshakeResponse, type.WebSocketDestroy], joinBy: "identifier"});

    WebInspector.TimelineAsyncEventTracker._asyncEvents = events;
    /** @type {!Map<!WebInspector.TimelineModel.RecordType, !WebInspector.TimelineModel.RecordType>} */
    WebInspector.TimelineAsyncEventTracker._typeToInitiator = new Map();
    for (var entry of events) {
        var types = entry[1].causes;
        for (type of types)
            WebInspector.TimelineAsyncEventTracker._typeToInitiator.set(type, entry[0]);
    }
}

WebInspector.TimelineAsyncEventTracker.prototype = {
    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    processEvent: function(event)
    {
        var initiatorType = WebInspector.TimelineAsyncEventTracker._typeToInitiator.get(/** @type {!WebInspector.TimelineModel.RecordType} */ (event.name));
        var isInitiator = !initiatorType;
        if (!initiatorType)
            initiatorType = /** @type {!WebInspector.TimelineModel.RecordType} */ (event.name);
        var initiatorInfo = WebInspector.TimelineAsyncEventTracker._asyncEvents.get(initiatorType);
        if (!initiatorInfo)
            return;
        var id = event.args["data"][initiatorInfo.joinBy];
        if (!id)
            return;
        /** @type {!Map<string, !WebInspector.TracingModel.Event>|undefined} */
        var initiatorMap = this._initiatorByType.get(initiatorType);
        if (isInitiator)
            initiatorMap.set(id, event);
        else
            event.initiator = initiatorMap.get(id) || null;
    }
}
