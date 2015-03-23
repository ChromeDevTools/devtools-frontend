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
 * @param {!WebInspector.TracingModel} tracingModel
 * @param {!WebInspector.TimelineModel.Filter} recordFilter
 * @extends {WebInspector.Object}
 * @implements {WebInspector.TargetManager.Observer}
 * @implements {WebInspector.TracingManagerClient}
 */
WebInspector.TimelineModel = function(tracingModel, recordFilter)
{
    WebInspector.Object.call(this);
    this._filters = [];
    this._tracingModel = tracingModel;
    this._recordFilter = recordFilter;
    this._targets = [];
    this.reset();
    WebInspector.targetManager.observeTargets(this);
}

WebInspector.TimelineModel.RecordType = {
    Task: "Task",
    Program: "Program",
    EventDispatch: "EventDispatch",

    GPUTask: "GPUTask",

    Animation: "Animation",
    RequestMainThreadFrame: "RequestMainThreadFrame",
    BeginFrame: "BeginFrame",
    BeginMainThreadFrame: "BeginMainThreadFrame",
    ActivateLayerTree: "ActivateLayerTree",
    DrawFrame: "DrawFrame",
    ScheduleStyleRecalculation: "ScheduleStyleRecalculation",
    RecalculateStyles: "RecalculateStyles",
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

    ParseHTML: "ParseHTML",
    ParseAuthorStyleSheet: "ParseAuthorStyleSheet",

    TimerInstall: "TimerInstall",
    TimerRemove: "TimerRemove",
    TimerFire: "TimerFire",

    XHRReadyStateChange: "XHRReadyStateChange",
    XHRLoad: "XHRLoad",
    EvaluateScript: "EvaluateScript",

    CommitLoad: "CommitLoad",
    MarkLoad: "MarkLoad",
    MarkDOMContent: "MarkDOMContent",
    MarkFirstPaint: "MarkFirstPaint",

    TimeStamp: "TimeStamp",
    ConsoleTime: "ConsoleTime",

    ResourceSendRequest: "ResourceSendRequest",
    ResourceReceiveResponse: "ResourceReceiveResponse",
    ResourceReceivedData: "ResourceReceivedData",
    ResourceFinish: "ResourceFinish",

    FunctionCall: "FunctionCall",
    GCEvent: "GCEvent",
    JSFrame: "JSFrame",
    JSSample: "JSSample",

    UpdateCounters: "UpdateCounters",

    RequestAnimationFrame: "RequestAnimationFrame",
    CancelAnimationFrame: "CancelAnimationFrame",
    FireAnimationFrame: "FireAnimationFrame",

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

    // CpuProfile is a virtual event created on frontend to support
    // serialization of CPU Profiles within tracing timeline data.
    CpuProfile: "CpuProfile"
}

WebInspector.TimelineModel.Events = {
    RecordsCleared: "RecordsCleared",
    RecordingStarted: "RecordingStarted",
    RecordingStopped: "RecordingStopped",
    RecordFilterChanged: "RecordFilterChanged",
    BufferUsage: "BufferUsage",
    RetrieveEventsProgress: "RetrieveEventsProgress"
}

WebInspector.TimelineModel.MainThreadName = "main";

/**
 * @param {!Array.<!WebInspector.TracingModel.Event>} events
 * @param {function(!WebInspector.TracingModel.Event)} onStartEvent
 * @param {function(!WebInspector.TracingModel.Event)} onEndEvent
 * @param {function(!WebInspector.TracingModel.Event,?WebInspector.TracingModel.Event)=} onInstantEvent
 */
WebInspector.TimelineModel.forEachEvent = function(events, onStartEvent, onEndEvent, onInstantEvent)
{
    var stack = [];
    for (var i = 0; i < events.length; ++i) {
        var e = events[i];
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

/**
 * @param {!Array.<!WebInspector.TimelineModel.Record>} recordsArray
 * @param {?function(!WebInspector.TimelineModel.Record)|?function(!WebInspector.TimelineModel.Record,number)} preOrderCallback
 * @param {function(!WebInspector.TimelineModel.Record)|function(!WebInspector.TimelineModel.Record,number)=} postOrderCallback
 * @return {boolean}
 */
WebInspector.TimelineModel.forAllRecords = function(recordsArray, preOrderCallback, postOrderCallback)
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
    return processRecords(recordsArray, 0);
}

WebInspector.TimelineModel.TransferChunkLengthBytes = 5000000;

/**
 * @constructor
 * @param {string} name
 */
WebInspector.TimelineModel.VirtualThread = function(name)
{
    this.name = name;
    /** @type {!Array<!WebInspector.TracingModel.Event>} */
    this.events = [];
    /** @type {!Map<!WebInspector.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} */
    this.asyncEventsByGroup = new Map();
}

WebInspector.TimelineModel.VirtualThread.prototype = {
    /**
     * @return {boolean}
     */
    isWorker: function()
    {
        return this.name === "WebCore: Worker";
    }
}

/**
 * @constructor
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TracingModel.Event} traceEvent
 */
WebInspector.TimelineModel.Record = function(model, traceEvent)
{
    this._model = model;
    this._event = traceEvent;
    traceEvent._timelineRecord = this;
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
     * @return {?Array.<!ConsoleAgent.CallFrame>}
     */
    callSiteStackTrace: function()
    {
        var initiator = this._event.initiator;
        return initiator ? initiator.stackTrace : null;
    },

    /**
     * @return {?WebInspector.TimelineModel.Record}
     */
    initiator: function()
    {
        var initiator = this._event.initiator;
        return initiator ? initiator._timelineRecord : null;
    },

    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        return this._event.thread.target();
    },

    /**
     * @return {number}
     */
    selfTime: function()
    {
        return this._event.selfTime;
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
     * @return {string}
     */
    thread: function()
    {
        if (this._event.thread.name() === "CrRendererMain")
            return WebInspector.TimelineModel.MainThreadName;
        return this._event.thread.name();
    },

    /**
     * @return {number}
     */
    endTime: function()
    {
        return this._endTime || this._event.endTime || this._event.startTime;
    },

    /**
     * @param {number} endTime
     */
    setEndTime: function(endTime)
    {
        this._endTime = endTime;
    },

    /**
     * @return {!Object}
     */
    data: function()
    {
        return this._event.args["data"];
    },

    /**
     * @return {string}
     */
    type: function()
    {
        if (this._event.category === WebInspector.TracingModel.ConsoleEventCategory)
            return WebInspector.TimelineModel.RecordType.ConsoleTime;
        return this._event.name;
    },

    /**
     * @return {string}
     */
    frameId: function()
    {
        switch (this._event.name) {
        case WebInspector.TimelineModel.RecordType.RecalculateStyles:
        case WebInspector.TimelineModel.RecordType.Layout:
            return this._event.args["beginData"]["frame"];
        default:
            var data = this._event.args["data"];
            return (data && data["frame"]) || "";
        }
    },

    /**
     * @return {?Array.<!ConsoleAgent.CallFrame>}
     */
    stackTrace: function()
    {
        return this._event.stackTrace;
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
     * @return {?Array.<string>}
     */
    warnings: function()
    {
        if (this._event.warning)
            return [this._event.warning];
        return null;
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
    },

    /**
     * @return {!WebInspector.TimelineModel}
     */
    timelineModel: function()
    {
        return this._model;
    }
}

WebInspector.TimelineModel.prototype = {
    /**
     * @param {boolean} captureCauses
     * @param {boolean} enableJSSampling
     * @param {boolean} captureMemory
     * @param {boolean} capturePictures
     */
    startRecording: function(captureCauses, enableJSSampling, captureMemory, capturePictures)
    {
        function disabledByDefault(category)
        {
            return "disabled-by-default-" + category;
        }
        var categoriesArray = [
            "-*",
            disabledByDefault("devtools.timeline"),
            disabledByDefault("devtools.timeline.frame"),
            WebInspector.TracingModel.ConsoleEventCategory
        ];
        if (Runtime.experiments.isEnabled("timelineFlowEvents")) {
            categoriesArray.push(disabledByDefault("toplevel.flow"),
                                 disabledByDefault("ipc.flow"),
                                 disabledByDefault("devtools.timeline.top-level-task"));
        }
        if (captureCauses || enableJSSampling)
            categoriesArray.push(disabledByDefault("devtools.timeline.stack"));
        if (captureCauses && Runtime.experiments.isEnabled("timelineInvalidationTracking"))
            categoriesArray.push(disabledByDefault("devtools.timeline.invalidationTracking"));
        if (capturePictures) {
            categoriesArray = categoriesArray.concat([
                disabledByDefault("devtools.timeline.layers"),
                disabledByDefault("devtools.timeline.picture"),
                disabledByDefault("blink.graphics_context_annotations")]);
        }
        var categories = categoriesArray.join(",");
        this._startRecordingWithCategories(categories, enableJSSampling);
    },

    stopRecording: function()
    {
        this._allProfilesStoppedPromise = this._stopProfilingOnAllTargets();
        if (this._targets[0])
            this._targets[0].tracingManager.stop();
    },

    /**
     * @param {?function(!WebInspector.TimelineModel.Record)|?function(!WebInspector.TimelineModel.Record,number)} preOrderCallback
     * @param {function(!WebInspector.TimelineModel.Record)|function(!WebInspector.TimelineModel.Record,number)=} postOrderCallback
     */
    forAllRecords: function(preOrderCallback, postOrderCallback)
    {
        WebInspector.TimelineModel.forAllRecords(this._records, preOrderCallback, postOrderCallback);
    },

    /**
     * @param {!WebInspector.TimelineModel.Filter} filter
     */
    addFilter: function(filter)
    {
        this._filters.push(filter);
        filter._model = this;
    },

    /**
     * @param {function(!WebInspector.TimelineModel.Record)|function(!WebInspector.TimelineModel.Record,number)} callback
     */
    forAllFilteredRecords: function(callback)
    {
        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @param {number} depth
         * @this {WebInspector.TimelineModel}
         * @return {boolean}
         */
        function processRecord(record, depth)
        {
            var visible = this.isVisible(record);
            if (visible) {
                if (callback(record, depth))
                    return true;
            }

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
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    isVisible: function(record)
    {
        for (var i = 0; i < this._filters.length; ++i) {
            if (!this._filters[i].accept(record))
                return false;
        }
        return true;
    },

    _filterChanged: function()
    {
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordFilterChanged);
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    records: function()
    {
        return this._records;
    },

    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        // FIXME: Consider returning null for loaded traces.
        return this._targets[0];
    },

    /**
     * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
     */
    setEventsForTest: function(events)
    {
        this._startCollectingTraceEvents(false);
        this._tracingModel.addEvents(events);
        this.tracingComplete();
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        this._targets.push(target);
        if (this._profiling)
            this._startProfilingOnTarget(target);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        this._targets.remove(target, true);
        // FIXME: We'd like to stop profiling on the target and retrieve a profile
        // but it's too late. Backend connection is closed.
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _startProfilingOnTarget: function(target)
    {
        target.profilerAgent().start();
    },

    _startProfilingOnAllTargets: function()
    {
        var intervalUs = WebInspector.settings.highResolutionCpuProfiling.get() ? 100 : 1000;
        this._targets[0].profilerAgent().setSamplingInterval(intervalUs);
        this._profiling = true;
        for (var target of this._targets)
            this._startProfilingOnTarget(target);
    },

    /**
     * @param {!WebInspector.Target} target
     * @return {!Promise}
     */
    _stopProfilingOnTarget: function(target)
    {
        /**
         * @param {?{profile: !ProfilerAgent.CPUProfile}} value
         * @return {?ProfilerAgent.CPUProfile}
         */
        function extractProfile(value)
        {
            return value && value.profile;
        }
        return target.profilerAgent().stop().then(extractProfile).then(this._addCpuProfile.bind(this, target.id()));
    },

    /**
     * @return {!Promise}
     */
    _stopProfilingOnAllTargets: function()
    {
        var targets = this._profiling ? this._targets : [];
        this._profiling = false;
        return Promise.all(targets.map(this._stopProfilingOnTarget, this));
    },

    /**
     * @param {string} categories
     * @param {boolean=} enableJSSampling
     */
    _startRecordingWithCategories: function(categories, enableJSSampling)
    {
        if (!this._targets.length)
            return;
        if (enableJSSampling)
            this._startProfilingOnAllTargets();
        this._targets[0].tracingManager.start(this, categories, "");
    },

    /**
     * @param {boolean} fromFile
     */
    _startCollectingTraceEvents: function(fromFile)
    {
        this._tracingModel.reset();
        this.reset();
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStarted, { fromFile: fromFile });
    },

    /**
     * @override
     */
    tracingStarted: function()
    {
        this._startCollectingTraceEvents(false);
    },

    /**
     * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
     * @override
     */
    traceEventsCollected: function(events)
    {
        this._tracingModel.addEvents(events);
    },

    /**
     * @override
     */
    tracingComplete: function()
    {
        if (!this._allProfilesStoppedPromise) {
            this._didStopRecordingTraceEvents();
            return;
        }
        this._allProfilesStoppedPromise.then(this._didStopRecordingTraceEvents.bind(this));
        this._allProfilesStoppedPromise = null;
    },

    /**
     * @param {number} usage
     * @override
     */
    tracingBufferUsage: function(usage)
    {
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.BufferUsage, usage);
    },

    /**
     * @param {number} progress
     * @override
     */
    eventsRetrievalProgress: function(progress)
    {
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RetrieveEventsProgress, progress);
    },

    /**
     * @param {number} targetId
     * @param {?ProfilerAgent.CPUProfile} cpuProfile
     */
    _addCpuProfile: function(targetId, cpuProfile)
    {
        if (!cpuProfile)
            return;
        if (!this._cpuProfiles)
            this._cpuProfiles = new Map();
        this._cpuProfiles.set(targetId, cpuProfile);
    },

    _didStopRecordingTraceEvents: function()
    {
        this._injectCpuProfileEvents();
        this._tracingModel.tracingComplete();

        var metaEvents = this._tracingModel.devtoolsPageMetadataEvents();
        var workerMetadataEvents = this._tracingModel.devtoolsWorkerMetadataEvents();

        this._resetProcessingState();
        for (var i = 0, length = metaEvents.length; i < length; i++) {
            var metaEvent = metaEvents[i];
            var process = metaEvent.thread.process();
            var startTime = metaEvent.startTime;
            var endTime = Infinity;
            if (i + 1 < length)
                endTime = metaEvents[i + 1].startTime;
            this._currentPage = metaEvent.args["data"] && metaEvent.args["data"]["page"];

            for (var thread of process.sortedThreads()) {
                if (thread.name() === "WebCore: Worker" && !workerMetadataEvents.some(function(e) { return e.args["data"]["workerThreadId"] === thread.id(); }))
                    continue;
                this._processThreadEvents(startTime, endTime, metaEvent.thread, thread);
            }
        }
        this._inspectedTargetEvents.sort(WebInspector.TracingModel.Event.compareStartTime);

        this._cpuProfiles = null;
        this._buildTimelineRecords();
        this._buildGPUTasks();
        this._insertFirstPaintEvent();
        this._resetProcessingState();

        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordingStopped);
    },

    /**
     * @param {number} pid
     * @param {number} tid
     * @param {?ProfilerAgent.CPUProfile} cpuProfile
     */
    _injectCpuProfileEvent: function(pid, tid, cpuProfile)
    {
        if (!cpuProfile)
            return;
        var cpuProfileEvent = /** @type {!WebInspector.TracingManager.EventPayload} */ ({
            cat: WebInspector.TracingModel.DevToolsMetadataEventCategory,
            ph: WebInspector.TracingModel.Phase.Instant,
            ts: this._tracingModel.maximumRecordTime() * 1000,
            pid: pid,
            tid: tid,
            name: WebInspector.TimelineModel.RecordType.CpuProfile,
            args: { data: { cpuProfile: cpuProfile } }
        });
        this._tracingModel.addEvents([cpuProfileEvent]);
    },

    _injectCpuProfileEvents: function()
    {
        if (!this._cpuProfiles)
            return;
        var mainMetaEvent = this._tracingModel.devtoolsPageMetadataEvents().peekLast();
        var pid = mainMetaEvent.thread.process().id();
        var mainTarget = this._targets[0];
        var mainCpuProfile = this._cpuProfiles.get(mainTarget.id());
        this._injectCpuProfileEvent(pid, mainMetaEvent.thread.id(), mainCpuProfile);
        var workerMetadataEvents = this._tracingModel.devtoolsWorkerMetadataEvents();
        for (var metaEvent of workerMetadataEvents) {
            var workerId = metaEvent.args["data"]["workerId"];
            var target = mainTarget.workerManager ? mainTarget.workerManager.targetByWorkerId(workerId) : null;
            if (!target)
                continue;
            var cpuProfile = this._cpuProfiles.get(target.id());
            this._injectCpuProfileEvent(pid, metaEvent.args["data"]["workerThreadId"], cpuProfile);
        }
        this._cpuProfiles = null;
    },

    _insertFirstPaintEvent: function()
    {
        if (!this._firstCompositeLayers)
            return;

        // First Paint is actually a DrawFrame that happened after first CompositeLayers following last CommitLoadEvent.
        var recordTypes = WebInspector.TimelineModel.RecordType;
        var i = insertionIndexForObjectInListSortedByFunction(this._firstCompositeLayers, this._inspectedTargetEvents, WebInspector.TracingModel.Event.compareStartTime);
        for (; i < this._inspectedTargetEvents.length && this._inspectedTargetEvents[i].name !== recordTypes.DrawFrame; ++i) { }
        if (i >= this._inspectedTargetEvents.length)
            return;
        var drawFrameEvent = this._inspectedTargetEvents[i];
        var firstPaintEvent = new WebInspector.TracingModel.Event(drawFrameEvent.category, recordTypes.MarkFirstPaint, WebInspector.TracingModel.Phase.Instant, drawFrameEvent.startTime, drawFrameEvent.thread);
        this._mainThreadEvents.splice(insertionIndexForObjectInListSortedByFunction(firstPaintEvent, this._mainThreadEvents, WebInspector.TracingModel.Event.compareStartTime), 0, firstPaintEvent);
        var firstPaintRecord = new WebInspector.TimelineModel.Record(this, firstPaintEvent);
        this._eventDividerRecords.splice(insertionIndexForObjectInListSortedByFunction(firstPaintRecord, this._eventDividerRecords, WebInspector.TimelineModel.Record._compareStartTime), 0, firstPaintRecord);
    },

    _buildTimelineRecords: function()
    {
        var topLevelRecords = this._buildTimelineRecordsForThread(this.mainThreadEvents());

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

        for (var i = 0; i < topLevelRecords.length; i++) {
            var record = topLevelRecords[i];
            if (record.type() === WebInspector.TimelineModel.RecordType.Program)
                this._mainThreadTasks.push(record);
        }
        this._records = topLevelRecords;
    },

    _buildGPUTasks: function()
    {
        var gpuProcess = this._tracingModel.processByName("GPU Process");
        if (!gpuProcess)
            return;
        var mainThread = gpuProcess.threadByName("CrGpuMain");
        if (!mainThread)
            return;
        var events = mainThread.events();
        var recordTypes = WebInspector.TimelineModel.RecordType;
        for (var i = 0; i < events.length; ++i) {
            if (events[i].name === recordTypes.GPUTask)
                this._gpuTasks.push(new WebInspector.TimelineModel.Record(this, events[i]));
        }
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
            for (var top = recordStack.peekLast(); top && top._event.endTime <= event.startTime; top = recordStack.peekLast()) {
                recordStack.pop();
                if (!recordStack.length)
                    topLevelRecords.push(top);
            }
            if (event.phase === WebInspector.TracingModel.Phase.AsyncEnd || event.phase === WebInspector.TracingModel.Phase.NestableAsyncEnd)
                continue;
            var parentRecord = recordStack.peekLast();
            // Maintain the back-end logic of old timeline, skip console.time() / console.timeEnd() that are not properly nested.
            if (WebInspector.TracingModel.isAsyncBeginPhase(event.phase) && parentRecord && event.endTime > parentRecord._event.endTime)
                continue;
            var record = new WebInspector.TimelineModel.Record(this, event);
            if (WebInspector.TimelineUIUtils.isMarkerEvent(event))
                this._eventDividerRecords.push(record);
            if (!this._recordFilter.accept(record))
                continue;
            if (parentRecord)
                parentRecord._addChild(record);
            if (event.endTime)
                recordStack.push(record);
        }

        if (recordStack.length)
            topLevelRecords.push(recordStack[0]);

        return topLevelRecords;
    },

    _resetProcessingState: function()
    {
        this._sendRequestEvents = {};
        this._timerEvents = {};
        this._requestAnimationFrameEvents = {};
        this._invalidationTracker = new WebInspector.InvalidationTracker();
        this._layoutInvalidate = {};
        this._lastScheduleStyleRecalculation = {};
        this._webSocketCreateEvents = {};
        this._paintImageEventByPixelRefId = {};
        this._lastPaintForLayer = {};
        this._lastRecalculateStylesEvent = null;
        this._currentScriptEvent = null;
        this._eventStack = [];
        this._hadCommitLoad = false;
        this._firstCompositeLayers = null;
        this._currentPage = null;
    },

    /**
     * @param {number} startTime
     * @param {?number} endTime
     * @param {!WebInspector.TracingModel.Thread} mainThread
     * @param {!WebInspector.TracingModel.Thread} thread
     */
    _processThreadEvents: function(startTime, endTime, mainThread, thread)
    {
        var events = thread.events();
        var asyncEvents = thread.asyncEvents();

        var cpuProfileEvent = events.peekLast();
        if (cpuProfileEvent && cpuProfileEvent.name === WebInspector.TimelineModel.RecordType.CpuProfile) {
            var cpuProfile = cpuProfileEvent.args["data"]["cpuProfile"];
            if (cpuProfile) {
                var jsSamples = WebInspector.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile(cpuProfile, thread);
                events = events.mergeOrdered(jsSamples, WebInspector.TracingModel.Event.orderedCompareStartTime);
                var jsFrameEvents = WebInspector.TimelineJSProfileProcessor.generateJSFrameEvents(events);
                events = jsFrameEvents.mergeOrdered(events, WebInspector.TracingModel.Event.orderedCompareStartTime);
            }
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
        var i = events.lowerBound(startTime, function (time, event) { return time - event.startTime });
        var length = events.length;
        for (; i < length; i++) {
            var event = events[i];
            if (endTime && event.startTime >= endTime)
                break;
            this._updateEventStack(event);
            if (!this._processEvent(event))
                continue;
            threadEvents.push(event);
            this._inspectedTargetEvents.push(event);
        }
        i = asyncEvents.lowerBound(startTime, function (time, asyncEvent) { return time - asyncEvent.startTime });
        for (; i < asyncEvents.length; ++i) {
            var asyncEvent = asyncEvents[i];
            if (endTime && asyncEvent.startTime >= endTime)
                break;
            var asyncGroup = this._processAsyncEvent(asyncEvent);
            if (!asyncGroup)
                continue;
            var groupAsyncEvents = threadAsyncEventsByGroup.get(asyncGroup);
            if (!groupAsyncEvents) {
                groupAsyncEvents = [];
                threadAsyncEventsByGroup.set(asyncGroup, groupAsyncEvents);
            }
            groupAsyncEvents.push(asyncEvent);
        }
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _updateEventStack: function(event)
    {
        if (WebInspector.TracingModel.isAsyncPhase(event.phase))
            return;
        var eventStack = this._eventStack;
        while (eventStack.length && eventStack.peekLast().endTime < event.startTime)
            eventStack.pop();
        var duration = event.duration;
        if (!duration)
            return;
        if (eventStack.length) {
            var parent = eventStack.peekLast();
            parent.selfTime -= duration;
            if (parent.selfTime < 0) {
                var epsilon = 1e-3;
                console.assert(parent.selfTime > -epsilon, "Children are longer than parent at " + event.startTime);
                parent.selfTime = 0;
            }
        }
        event.selfTime = duration;
        eventStack.push(event);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    _processEvent: function(event)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;

        if (this._currentScriptEvent && event.startTime > this._currentScriptEvent.endTime)
            this._currentScriptEvent = null;

        var eventData = event.args["data"] || event.args["beginData"] || {};
        if (eventData && eventData["stackTrace"])
            event.stackTrace = eventData["stackTrace"];

        switch (event.name) {
        case recordTypes.ResourceSendRequest:
            this._sendRequestEvents[event.args["data"]["requestId"]] = event;
            event.url = event.args["data"]["url"];
            break;

        case recordTypes.ResourceReceiveResponse:
        case recordTypes.ResourceReceivedData:
        case recordTypes.ResourceFinish:
            event.initiator = this._sendRequestEvents[event.args["data"]["requestId"]];
            if (event.initiator)
                event.url = event.initiator.url;
            break;

        case recordTypes.TimerInstall:
            this._timerEvents[event.args["data"]["timerId"]] = event;
            break;

        case recordTypes.TimerFire:
            event.initiator = this._timerEvents[event.args["data"]["timerId"]];
            break;

        case recordTypes.RequestAnimationFrame:
            this._requestAnimationFrameEvents[event.args["data"]["id"]] = event;
            break;

        case recordTypes.FireAnimationFrame:
            event.initiator = this._requestAnimationFrameEvents[event.args["data"]["id"]];
            break;

        case recordTypes.ScheduleStyleRecalculation:
            this._lastScheduleStyleRecalculation[event.args["data"]["frame"]] = event;
            break;

        case recordTypes.RecalculateStyles:
            this._invalidationTracker.didRecalcStyle(event);
            if (event.args["beginData"])
                event.initiator = this._lastScheduleStyleRecalculation[event.args["beginData"]["frame"]];
            this._lastRecalculateStylesEvent = event;
            break;

        case recordTypes.ScheduleStyleInvalidationTracking:
        case recordTypes.StyleRecalcInvalidationTracking:
        case recordTypes.StyleInvalidatorInvalidationTracking:
        case recordTypes.LayoutInvalidationTracking:
        case recordTypes.LayerInvalidationTracking:
        case recordTypes.PaintInvalidationTracking:
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
                event.warning = WebInspector.UIString("Forced synchronous layout is a possible performance bottleneck.");
            break;

        case recordTypes.WebSocketCreate:
            this._webSocketCreateEvents[event.args["data"]["identifier"]] = event;
            break;

        case recordTypes.WebSocketSendHandshakeRequest:
        case recordTypes.WebSocketReceiveHandshakeResponse:
        case recordTypes.WebSocketDestroy:
            event.initiator = this._webSocketCreateEvents[event.args["data"]["identifier"]];
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
            var layerUpdateEvent = this._findAncestorEvent(recordTypes.UpdateLayer);
            if (!layerUpdateEvent || layerUpdateEvent.args["layerTreeId"] !== this._inspectedTargetLayerTreeId)
                break;
            // Only keep layer paint events, skip paints for subframes that get painted to the same layer as parent.
            if (!event.args["data"]["layerId"])
                break;
            this._lastPaintForLayer[layerUpdateEvent.args["layerId"]] = event;
            break;

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

        case recordTypes.Animation:
            // FIXME: bring back Animation events as we figure out a way to show them while not cluttering the UI.
            return false;
        }
        return true;
    },

    /**
     * @param {!WebInspector.TracingModel.AsyncEvent} asyncEvent
     * @return {?WebInspector.AsyncEventGroup}
     */
    _processAsyncEvent: function(asyncEvent)
    {
        var groups = WebInspector.TimelineUIUtils.asyncEventGroups();
        if (asyncEvent.category === WebInspector.TracingModel.ConsoleEventCategory)
            return groups.console;

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
     * @param {!Blob} file
     * @param {!WebInspector.Progress} progress
     */
    loadFromFile: function(file, progress)
    {
        var delegate = new WebInspector.TimelineModelLoadFromFileDelegate(this, progress);
        var fileReader = this._createFileReader(file, delegate);
        var loader = new WebInspector.TracingModelLoader(this, new WebInspector.ProgressStub(), fileReader.cancel.bind(fileReader));
        fileReader.start(loader);
    },

    /**
     * @param {string} url
     * @param {!WebInspector.Progress} progress
     */
    loadFromURL: function(url, progress)
    {
        var stream = new WebInspector.TracingModelLoader(this, progress);
        WebInspector.NetworkManager.loadResourceAsStream(url, null, stream);
    },

    _createFileReader: function(file, delegate)
    {
        return new WebInspector.ChunkedFileReader(file, WebInspector.TimelineModel.TransferChunkLengthBytes, delegate);
    },

    reset: function()
    {
        this._virtualThreads = [];
        /** @type {!Array.<!WebInspector.TracingModel.Event>} */
        this._mainThreadEvents = [];
        /** @type {!Map<!WebInspector.AsyncEventGroup, !Array<!WebInspector.TracingModel.AsyncEvent>>} */
        this._mainThreadAsyncEventsByGroup = new Map();
        /** @type {!Array.<!WebInspector.TracingModel.Event>} */
        this._inspectedTargetEvents = [];

        this._records = [];
        /** @type {!Array.<!WebInspector.TimelineModel.Record>} */
        this._mainThreadTasks =  [];
        /** @type {!Array.<!WebInspector.TimelineModel.Record>} */
        this._gpuTasks = [];
        /** @type {!Array.<!WebInspector.TimelineModel.Record>} */
        this._eventDividerRecords = [];
        this.dispatchEventToListeners(WebInspector.TimelineModel.Events.RecordsCleared);
    },

    /**
     * @return {number}
     */
    minimumRecordTime: function()
    {
        return this._tracingModel.minimumRecordTime();
    },

    /**
     * @return {number}
     */
    maximumRecordTime: function()
    {
        return this._tracingModel.maximumRecordTime();
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
     * @return {!Map<!WebInspector.AsyncEventGroup, !Array.<!WebInspector.TracingModel.AsyncEvent>>}
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
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    gpuTasks: function()
    {
        return this._gpuTasks;
    },

    /**
     * @return {!Array.<!WebInspector.TimelineModel.Record>}
     */
    eventDividerRecords: function()
    {
        return this._eventDividerRecords;
    },


    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 */
WebInspector.TimelineModel.Filter = function()
{
    /** @type {!WebInspector.TimelineModel} */
    this._model;
}

WebInspector.TimelineModel.Filter.prototype = {
    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return true;
    },

    notifyFilterChanged: function()
    {
        this._model._filterChanged();
    }
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 * @param {!Array.<string>} visibleTypes
 */
WebInspector.TimelineVisibleRecordsFilter = function(visibleTypes)
{
    WebInspector.TimelineModel.Filter.call(this);
    this._visibleTypes = visibleTypes.keySet();
}

WebInspector.TimelineVisibleRecordsFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !!this._visibleTypes[record.type()];
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @implements {WebInspector.OutputStreamDelegate}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Progress} progress
 */
WebInspector.TimelineModelLoadFromFileDelegate = function(model, progress)
{
    this._model = model;
    this._progress = progress;
}

WebInspector.TimelineModelLoadFromFileDelegate.prototype = {
    /**
     * @override
     */
    onTransferStarted: function()
    {
        this._progress.setTitle(WebInspector.UIString("Loading\u2026"));
    },

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     */
    onChunkTransferred: function(reader)
    {
        if (this._progress.isCanceled()) {
            reader.cancel();
            this._progress.done();
            this._model.reset();
            return;
        }

        var totalSize = reader.fileSize();
        if (totalSize) {
            this._progress.setTotalWork(totalSize);
            this._progress.setWorked(reader.loadedSize());
        }
    },

    /**
     * @override
     */
    onTransferFinished: function()
    {
        this._progress.done();
    },

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     * @param {!Event} event
     */
    onError: function(reader, event)
    {
        this._progress.done();
        this._model.reset();
        switch (event.target.error.code) {
        case FileError.NOT_FOUND_ERR:
            WebInspector.console.error(WebInspector.UIString("File \"%s\" not found.", reader.fileName()));
            break;
        case FileError.NOT_READABLE_ERR:
            WebInspector.console.error(WebInspector.UIString("File \"%s\" is not readable", reader.fileName()));
            break;
        case FileError.ABORT_ERR:
            break;
        default:
            WebInspector.console.error(WebInspector.UIString("An error occurred while reading the file \"%s\"", reader.fileName()));
        }
    }
}


/**
 * @interface
 */
WebInspector.TraceEventFilter = function() { }

WebInspector.TraceEventFilter.prototype = {
    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event) { }
}

/**
 * @constructor
 * @implements {WebInspector.TraceEventFilter}
 * @param {!Array.<string>} eventNames
 */
WebInspector.TraceEventNameFilter = function(eventNames)
{
    this._eventNames = eventNames.keySet();
}

WebInspector.TraceEventNameFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        throw new Error("Not implemented.");
    }
}

/**
 * @constructor
 * @extends {WebInspector.TraceEventNameFilter}
 * @param {!Array.<string>} includeNames
 */
WebInspector.InclusiveTraceEventNameFilter = function(includeNames)
{
    WebInspector.TraceEventNameFilter.call(this, includeNames);
}

WebInspector.InclusiveTraceEventNameFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return event.category === WebInspector.TracingModel.ConsoleEventCategory
            || event.category === WebInspector.TracingModel.TopLevelEventCategory
            || !!this._eventNames[event.name];
    },
    __proto__: WebInspector.TraceEventNameFilter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TraceEventNameFilter}
 * @param {!Array.<string>} excludeNames
 */
WebInspector.ExclusiveTraceEventNameFilter = function(excludeNames)
{
    WebInspector.TraceEventNameFilter.call(this, excludeNames);
}

WebInspector.ExclusiveTraceEventNameFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return !this._eventNames[event.name];
    },

    __proto__: WebInspector.TraceEventNameFilter.prototype
}

/**
 * @constructor
 * @implements {WebInspector.OutputStream}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Progress} progress
 * @param {function()=} canceledCallback
 */
WebInspector.TracingModelLoader = function(model, progress, canceledCallback)
{
    this._model = model;
    this._loader = new WebInspector.TracingModel.Loader(model._tracingModel);

    this._canceledCallback = canceledCallback;
    this._progress = progress;
    this._progress.setTitle(WebInspector.UIString("Loading"));
    this._progress.setTotalWork(WebInspector.TracingModelLoader._totalProgress);  // Unknown, will loop the values.

    this._firstChunk = true;
    this._wasCanceledOnce = false;

    this._loadedBytes = 0;
    this._jsonTokenizer = new WebInspector.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this), true);
}

WebInspector.TracingModelLoader._totalProgress = 100000;

WebInspector.TracingModelLoader.prototype = {
    /**
     * @override
     * @param {string} chunk
     */
    write: function(chunk)
    {
        this._loadedBytes += chunk.length;
        if (this._progress.isCanceled() && !this._wasCanceledOnce) {
            this._wasCanceled = true;
            this._reportErrorAndCancelLoading();
            return;
        }
        this._progress.setWorked(this._loadedBytes % WebInspector.TracingModelLoader._totalProgress,
                                 WebInspector.UIString("Loaded %s", Number.bytesToString(this._loadedBytes)));
        this._jsonTokenizer.write(chunk);
    },

    /**
     * @param {string} data
     */
    _writeBalancedJSON: function(data)
    {
        var json = data + "]";

        if (this._firstChunk) {
            this._model._startCollectingTraceEvents(true);
        } else {
            var commaIndex = json.indexOf(",");
            if (commaIndex !== -1)
                json = json.slice(commaIndex + 1);
            json = "[" + json;
        }

        var items;
        try {
            items = /** @type {!Array.<!WebInspector.TracingManager.EventPayload>} */ (JSON.parse(json));
        } catch (e) {
            this._reportErrorAndCancelLoading(WebInspector.UIString("Malformed timeline data: " + e));
            return;
        }

        if (this._firstChunk) {
            this._firstChunk = false;
            if (this._looksLikeAppVersion(items[0])) {
                this._reportErrorAndCancelLoading(WebInspector.UIString("Legacy Timeline format is not supported."));
                return;
            }
        }

        try {
            this._loader.loadNextChunk(items);
        } catch(e) {
            this._reportErrorAndCancelLoading(WebInspector.UIString("Malformed timeline data: " + e));
            return;
        }
    },

    /**
     * @param {string=} message
     */
    _reportErrorAndCancelLoading: function(message)
    {
        if (message)
            WebInspector.console.error(message);
        this._model.tracingComplete();
        this._model.reset();
        if (this._canceledCallback)
            this._canceledCallback();
        this._progress.done();
    },

    _looksLikeAppVersion: function(item)
    {
        return typeof item === "string" && item.indexOf("Chrome") !== -1;
    },

    /**
     * @override
     */
    close: function()
    {
        this._loader.finish();
        this._model.tracingComplete();
        if (this._progress)
            this._progress.done();
    }
}

/**
 * @constructor
 * @param {!WebInspector.OutputStream} stream
 * @implements {WebInspector.OutputStreamDelegate}
 */
WebInspector.TracingTimelineSaver = function(stream)
{
    this._stream = stream;
}

WebInspector.TracingTimelineSaver.prototype = {
    /**
     * @override
     */
    onTransferStarted: function()
    {
        this._stream.write("[");
    },

    /**
     * @override
     */
    onTransferFinished: function()
    {
        this._stream.write("]");
    },

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     */
    onChunkTransferred: function(reader) { },

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     * @param {!Event} event
     */
    onError: function(reader, event) { }
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

/** @typedef {{reason: string, stackTrace: ?Array.<!ConsoleAgent.CallFrame>}} */
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
            var nodeInvalidations = this._invalidationsByNodeId[styleInvalidatorInvalidation.nodeId];
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
            WebInspector.TimelineModel.RecordType.PaintInvalidationTracking];
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
