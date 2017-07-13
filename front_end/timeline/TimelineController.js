// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!SDK.CPUProfilerModel>}
 * @implements {SDK.TracingManagerClient}
 * @unrestricted
 */
Timeline.TimelineController = class {
  /**
   * @param {!SDK.TracingManager} tracingManager
   * @param {!Timeline.PerformanceModel} performanceModel
   * @param {!Timeline.TimelineController.Client} client
   */
  constructor(tracingManager, performanceModel, client) {
    this._tracingManager = tracingManager;
    this._performanceModel = performanceModel;
    this._client = client;

    var backingStorage = new Bindings.TempFileBackingStorage();
    this._tracingModel = new SDK.TracingModel(backingStorage);

    this._performanceModel.setMainTarget(tracingManager.target());

    /** @type {!Array<!Timeline.ExtensionTracingSession>} */
    this._extensionSessions = [];
    SDK.targetManager.observeModels(SDK.CPUProfilerModel, this);
  }

  /**
   * @return {!SDK.Target}
   */
  mainTarget() {
    return this._tracingManager.target();
  }

  /**
   * @param {!Timeline.TimelineController.RecordingOptions} options
   * @param {!Array<!Extensions.ExtensionTraceProvider>} providers
   * @return {!Promise}
   */
  startRecording(options, providers) {
    this._extensionTraceProviders = Extensions.extensionServer.traceProviders().slice();

    /**
     * @param {string} category
     * @return {string}
     */
    function disabledByDefault(category) {
      return 'disabled-by-default-' + category;
    }
    const categoriesArray = [
      '-*', 'devtools.timeline', 'v8.execute', disabledByDefault('devtools.timeline'),
      disabledByDefault('devtools.timeline.frame'), SDK.TracingModel.TopLevelEventCategory,
      TimelineModel.TimelineModel.Category.Console, TimelineModel.TimelineModel.Category.UserTiming
    ];
    categoriesArray.push(TimelineModel.TimelineModel.Category.LatencyInfo);

    if (Runtime.experiments.isEnabled('timelineFlowEvents'))
      categoriesArray.push('devtools.timeline.async');

    if (Runtime.experiments.isEnabled('timelineV8RuntimeCallStats') && options.enableJSSampling)
      categoriesArray.push(disabledByDefault('v8.runtime_stats_sampling'));
    if (Runtime.experiments.isEnabled('timelineTracingJSProfile') && options.enableJSSampling) {
      categoriesArray.push(disabledByDefault('v8.cpu_profiler'));
      if (Common.moduleSetting('highResolutionCpuProfiling').get())
        categoriesArray.push(disabledByDefault('v8.cpu_profiler.hires'));
    }
    categoriesArray.push(disabledByDefault('devtools.timeline.stack'));
    if (Runtime.experiments.isEnabled('timelineInvalidationTracking'))
      categoriesArray.push(disabledByDefault('devtools.timeline.invalidationTracking'));
    if (options.capturePictures) {
      categoriesArray.push(
          disabledByDefault('devtools.timeline.layers'), disabledByDefault('devtools.timeline.picture'),
          disabledByDefault('blink.graphics_context_annotations'));
    }
    if (options.captureFilmStrip)
      categoriesArray.push(disabledByDefault('devtools.screenshot'));

    this._extensionSessions =
        providers.map(provider => new Timeline.ExtensionTracingSession(provider, this._performanceModel));
    this._extensionSessions.forEach(session => session.start());
    var startPromise = this._startRecordingWithCategories(categoriesArray.join(','), options.enableJSSampling);
    this._performanceModel.setRecordStartTime(Date.now());
    return startPromise;
  }

  stopRecording() {
    var tracingStoppedPromises = [];
    tracingStoppedPromises.push(new Promise(resolve => this._tracingCompleteCallback = resolve));
    tracingStoppedPromises.push(this._stopProfilingOnAllModels());
    this._tracingManager.stop();
    tracingStoppedPromises.push(SDK.targetManager.resumeAllTargets());

    this._client.loadingStarted();

    var extensionCompletionPromises = this._extensionSessions.map(session => session.stop());
    if (extensionCompletionPromises.length) {
      var timerId;
      var timeoutPromise = new Promise(fulfill => timerId = setTimeout(fulfill, 5000));
      tracingStoppedPromises.push(
          Promise.race([Promise.all(extensionCompletionPromises).then(() => clearTimeout(timerId)), timeoutPromise]));
    }
    Promise.all(tracingStoppedPromises).then(() => this._allSourcesFinished());
  }

  /**
   * @override
   * @param {!SDK.CPUProfilerModel} cpuProfilerModel
   */
  modelAdded(cpuProfilerModel) {
    if (this._profiling)
      cpuProfilerModel.startRecording();
  }

  /**
   * @override
   * @param {!SDK.CPUProfilerModel} cpuProfilerModel
   */
  modelRemoved(cpuProfilerModel) {
    // FIXME: We'd like to stop profiling on the target and retrieve a profile
    // but it's too late. Backend connection is closed.
  }

  /**
   * @return {!Promise}
   */
  _startProfilingOnAllModels() {
    this._profiling = true;
    var models = SDK.targetManager.models(SDK.CPUProfilerModel);
    return Promise.all(models.map(model => model.startRecording()));
  }

  /**
   * @param {string} targetId
   * @param {?Protocol.Profiler.Profile} cpuProfile
   */
  _addCpuProfile(targetId, cpuProfile) {
    if (!cpuProfile) {
      Common.console.warn(Common.UIString('CPU profile for a target is not available.'));
      return;
    }
    if (!this._cpuProfiles)
      this._cpuProfiles = new Map();
    this._cpuProfiles.set(targetId, cpuProfile);
  }

  /**
   * @return {!Promise}
   */
  _stopProfilingOnAllModels() {
    var models = this._profiling ? SDK.targetManager.models(SDK.CPUProfilerModel) : [];
    this._profiling = false;
    var promises = [];
    for (var model of models) {
      var targetId = model.target().id();
      var modelPromise = model.stopRecording().then(this._addCpuProfile.bind(this, targetId));
      promises.push(modelPromise);
    }
    return Promise.all(promises);
  }

  /**
   * @param {string} categories
   * @param {boolean=} enableJSSampling
   * @return {!Promise}
   */
  _startRecordingWithCategories(categories, enableJSSampling) {
    SDK.targetManager.suspendAllTargets();
    var profilingStartedPromise = enableJSSampling && !Runtime.experiments.isEnabled('timelineTracingJSProfile') ?
        this._startProfilingOnAllModels() :
        Promise.resolve();
    var samplingFrequencyHz = Common.moduleSetting('highResolutionCpuProfiling').get() ? 10000 : 1000;
    var options = 'sampling-frequency=' + samplingFrequencyHz;
    return profilingStartedPromise.then(() => this._tracingManager.start(this, categories, options));
  }

  /**
   * @param {!Array.<!SDK.TracingManager.EventPayload>} events
   * @override
   */
  traceEventsCollected(events) {
    this._tracingModel.addEvents(events);
  }

  /**
   * @override
   */
  tracingComplete() {
    this._tracingCompleteCallback();
    this._tracingCompleteCallback = null;
  }

  _allSourcesFinished() {
    this._client.processingStarted();
    setTimeout(() => this._finalizeTrace(), 0);
  }

  _finalizeTrace() {
    this._injectCpuProfileEvents();
    this._tracingModel.tracingComplete();
    this._client.loadingComplete(this._tracingModel);
  }

  /**
   * @param {number} pid
   * @param {number} tid
   * @param {?Protocol.Profiler.Profile} cpuProfile
   */
  _injectCpuProfileEvent(pid, tid, cpuProfile) {
    if (!cpuProfile)
      return;
    var cpuProfileEvent = /** @type {!SDK.TracingManager.EventPayload} */ ({
      cat: SDK.TracingModel.DevToolsMetadataEventCategory,
      ph: SDK.TracingModel.Phase.Instant,
      ts: this._tracingModel.maximumRecordTime() * 1000,
      pid: pid,
      tid: tid,
      name: TimelineModel.TimelineModel.RecordType.CpuProfile,
      args: {data: {cpuProfile: cpuProfile}}
    });
    this._tracingModel.addEvents([cpuProfileEvent]);
  }

  _injectCpuProfileEvents() {
    if (!this._cpuProfiles)
      return;

    var metadataEventTypes = TimelineModel.TimelineModel.DevToolsMetadataEvent;
    var metadataEvents = this._tracingModel.devToolsMetadataEvents();
    var mainMetaEvent =
        metadataEvents.filter(event => event.name === metadataEventTypes.TracingStartedInPage).peekLast();
    if (!mainMetaEvent)
      return;

    var pid = mainMetaEvent.thread.process().id();
    var mainCpuProfile = this._cpuProfiles.get(this._tracingManager.target().id());
    this._injectCpuProfileEvent(pid, mainMetaEvent.thread.id(), mainCpuProfile);

    var workerMetaEvents = metadataEvents.filter(event => event.name === metadataEventTypes.TracingSessionIdForWorker);
    for (var metaEvent of workerMetaEvents) {
      var workerId = metaEvent.args['data']['workerId'];
      var cpuProfile = this._cpuProfiles.get(workerId);
      this._injectCpuProfileEvent(
          metaEvent.thread.process().id(), metaEvent.args['data']['workerThreadId'], cpuProfile);
    }
    this._cpuProfiles = null;
  }

  /**
   * @param {number} usage
   * @override
   */
  tracingBufferUsage(usage) {
    this._client.recordingProgress(usage);
  }

  /**
   * @param {number} progress
   * @override
   */
  eventsRetrievalProgress(progress) {
    this._client.loadingProgress(progress);
  }
};

/**
 * @interface
 * @extends {Timeline.TimelineLoader.Client}
 */
Timeline.TimelineController.Client = function() {};

Timeline.TimelineController.Client.prototype = {
  /**
   * @param {number} usage
   */
  recordingProgress(usage) {},
};

/**
 * @typedef {!{
 *   enableJSSampling: (boolean|undefined),
 *   capturePictures: (boolean|undefined),
 *   captureFilmStrip: (boolean|undefined)
 * }}
 */
Timeline.TimelineController.RecordingOptions;
