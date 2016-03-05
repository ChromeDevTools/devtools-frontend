// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.TimelineLifecycleDelegate} delegate
 * @param {!WebInspector.TracingModel} tracingModel
 * @implements {WebInspector.TargetManager.Observer}
 * @implements {WebInspector.TracingManagerClient}
 */
WebInspector.TimelineController = function(delegate, tracingModel)
{
    this._delegate = delegate;
    this._tracingModel = tracingModel;
    this._targets = [];
    WebInspector.targetManager.observeTargets(this);
}

WebInspector.TimelineController.prototype = {
    /**
     * @param {boolean} captureCauses
     * @param {boolean} enableJSSampling
     * @param {boolean} captureMemory
     * @param {boolean} capturePictures
     * @param {boolean} captureFilmStrip
     */
    startRecording: function(captureCauses, enableJSSampling, captureMemory, capturePictures, captureFilmStrip)
    {
        function disabledByDefault(category)
        {
            return "disabled-by-default-" + category;
        }
        var categoriesArray = [
            "-*",
            "devtools.timeline",
            disabledByDefault("devtools.timeline"),
            disabledByDefault("devtools.timeline.frame"),
            WebInspector.TracingModel.TopLevelEventCategory,
            WebInspector.TimelineModel.Category.Console,
            WebInspector.TimelineModel.Category.UserTiming
        ];
        if (Runtime.experiments.isEnabled("timelineLatencyInfo"))
            categoriesArray.push(WebInspector.TimelineModel.Category.LatencyInfo)

        if (Runtime.experiments.isEnabled("timelineFlowEvents")) {
            categoriesArray.push(disabledByDefault("toplevel.flow"),
                                 disabledByDefault("ipc.flow"));
        }
        if (Runtime.experiments.isEnabled("timelineTracingJSProfile") && enableJSSampling) {
            categoriesArray.push(disabledByDefault("v8.cpu_profile"));
            if (WebInspector.moduleSetting("highResolutionCpuProfiling").get())
                categoriesArray.push(disabledByDefault("v8.cpu_profile.hires"));
        }
        if (captureCauses || enableJSSampling)
            categoriesArray.push(disabledByDefault("devtools.timeline.stack"));
        if (captureCauses && Runtime.experiments.isEnabled("timelineInvalidationTracking"))
            categoriesArray.push(disabledByDefault("devtools.timeline.invalidationTracking"));
        if (capturePictures) {
            categoriesArray.push(disabledByDefault("devtools.timeline.layers"),
                                 disabledByDefault("devtools.timeline.picture"),
                                 disabledByDefault("blink.graphics_context_annotations"));
        }
        if (captureFilmStrip)
            categoriesArray.push(disabledByDefault("devtools.screenshot"));

        var categories = categoriesArray.join(",");
        this._startRecordingWithCategories(categories, enableJSSampling);
    },

    stopRecording: function()
    {
        WebInspector.targetManager.resumeAllTargets();
        this._allProfilesStoppedPromise = this._stopProfilingOnAllTargets();
        if (this._targets[0])
            this._targets[0].tracingManager.stop();
        this._delegate.loadingStarted();
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
     * @return {!Promise}
     */
    _startProfilingOnTarget: function(target)
    {
        return target.profilerAgent().start();
    },

    /**
     * @return {!Promise}
     */
    _startProfilingOnAllTargets: function()
    {
        var intervalUs = WebInspector.moduleSetting("highResolutionCpuProfiling").get() ? 100 : 1000;
        this._targets[0].profilerAgent().setSamplingInterval(intervalUs);
        this._profiling = true;
        return Promise.all(this._targets.map(this._startProfilingOnTarget));
    },

    /**
     * @param {!WebInspector.Target} target
     * @return {!Promise}
     */
    _stopProfilingOnTarget: function(target)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?ProfilerAgent.CPUProfile} profile
         * @return {?ProfilerAgent.CPUProfile}
         */
        function extractProfile(error, profile)
        {
            return !error && profile ? profile : null;
        }
        return target.profilerAgent().stop(extractProfile).then(this._addCpuProfile.bind(this, target.id()));
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
     * @param {function(?string)=} callback
     */
    _startRecordingWithCategories: function(categories, enableJSSampling, callback)
    {
        if (!this._targets.length)
            return;
        WebInspector.targetManager.suspendAllTargets();
        var profilingStartedPromise = enableJSSampling && !Runtime.experiments.isEnabled("timelineTracingJSProfile") ?
            this._startProfilingOnAllTargets() : Promise.resolve();
        var samplingFrequencyHz = WebInspector.moduleSetting("highResolutionCpuProfiling").get() ? 10000 : 1000;
        var options = "sampling-frequency=" + samplingFrequencyHz;
        var mainTarget = this._targets[0];
        var tracingManager = mainTarget.tracingManager;
        mainTarget.resourceTreeModel.suspendReload();
        profilingStartedPromise.then(tracingManager.start.bind(tracingManager, this, categories, options, onTraceStarted));
        /**
         * @param {?string} error
         */
        function onTraceStarted(error)
        {
            mainTarget.resourceTreeModel.resumeReload();
            if (callback)
                callback(error);
        }
    },

    /**
     * @override
     */
    tracingStarted: function()
    {
        this._tracingModel.reset();
        this._delegate.recordingStarted();
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

    _didStopRecordingTraceEvents: function()
    {
        this._injectCpuProfileEvents();
        this._tracingModel.tracingComplete();
        this._delegate.loadingComplete(true);
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

        var metadataEventTypes = WebInspector.TimelineModel.DevToolsMetadataEvent;
        var metadataEvents = this._tracingModel.devToolsMetadataEvents();
        var mainMetaEvent = metadataEvents.filter(event => event.name === metadataEventTypes.TracingStartedInPage).peekLast();
        if (!mainMetaEvent)
            return;

        var pid = mainMetaEvent.thread.process().id();
        var mainTarget = this._targets[0];
        var mainCpuProfile = this._cpuProfiles.get(mainTarget.id());
        this._injectCpuProfileEvent(pid, mainMetaEvent.thread.id(), mainCpuProfile);

        var workerMetaEvents = metadataEvents.filter(event => event.name === metadataEventTypes.TracingSessionIdForWorker);
        for (var metaEvent of workerMetaEvents) {
            var workerId = metaEvent.args["data"]["workerId"];
            var target = mainTarget.workerManager ? mainTarget.workerManager.targetByWorkerId(workerId) : null;
            if (!target)
                continue;
            var cpuProfile = this._cpuProfiles.get(target.id());
            this._injectCpuProfileEvent(pid, metaEvent.args["data"]["workerThreadId"], cpuProfile);
        }
        this._cpuProfiles = null;
    },

    /**
     * @param {number} usage
     * @override
     */
    tracingBufferUsage: function(usage)
    {
        this._delegate.recordingProgress(usage);
    },

    /**
     * @param {number} progress
     * @override
     */
    eventsRetrievalProgress: function(progress)
    {
        this._delegate.loadingProgress(progress);
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
    }
}
