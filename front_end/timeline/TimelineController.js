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
   * @param {!SDK.Target} target
   * @param {!Timeline.TimelineController.Client} client
   */
  constructor(target, client) {
    this._tracingManager = target.model(SDK.TracingManager);
    this._performanceModel = new Timeline.PerformanceModel();
    this._performanceModel.setMainTarget(target);
    this._client = client;

    const backingStorage = new Bindings.TempFileBackingStorage();
    this._tracingModel = new SDK.TracingModel(backingStorage);

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
    const startPromise = this._startRecordingWithCategories(categoriesArray.join(','), options.enableJSSampling);
    this._performanceModel.setRecordStartTime(Date.now());
    return startPromise;
  }

  /**
   * @return {!Promise<!Timeline.PerformanceModel>}
   */
  async stopRecording() {
    const tracingStoppedPromises = [];
    tracingStoppedPromises.push(new Promise(resolve => this._tracingCompleteCallback = resolve));
    tracingStoppedPromises.push(this._stopProfilingOnAllModels());
    this._tracingManager.stop();
    tracingStoppedPromises.push(SDK.targetManager.resumeAllTargets());

    this._client.loadingStarted();

    const extensionCompletionPromises = this._extensionSessions.map(session => session.stop());
    if (extensionCompletionPromises.length) {
      tracingStoppedPromises.push(
          Promise.race([Promise.all(extensionCompletionPromises), new Promise(r => setTimeout(r, 5000))]));
    }
    await Promise.all(tracingStoppedPromises);
    this._allSourcesFinished();
    return this._performanceModel;
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
    const models = SDK.targetManager.models(SDK.CPUProfilerModel);
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
    const models = this._profiling ? SDK.targetManager.models(SDK.CPUProfilerModel) : [];
    this._profiling = false;
    const promises = [];
    for (const model of models) {
      const targetId = model.target().id();
      const modelPromise = model.stopRecording().then(this._addCpuProfile.bind(this, targetId));
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
    const profilingStartedPromise = enableJSSampling && !Runtime.experiments.isEnabled('timelineTracingJSProfile') ?
        this._startProfilingOnAllModels() :
        Promise.resolve();
    const samplingFrequencyHz = Common.moduleSetting('highResolutionCpuProfiling').get() ? 10000 : 1000;
    const options = 'sampling-frequency=' + samplingFrequencyHz;
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
    const cpuProfileEvent = /** @type {!SDK.TracingManager.EventPayload} */ ({
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

    const metadataEventTypes = TimelineModel.TimelineModel.DevToolsMetadataEvent;
    const metadataEvents = this._tracingModel.devToolsMetadataEvents();
    const mainMetaEvent =
        metadataEvents.filter(event => event.name === metadataEventTypes.TracingStartedInPage).peekLast();
    if (!mainMetaEvent)
      return;

    const pid = mainMetaEvent.thread.process().id();
    const mainCpuProfile = this._cpuProfiles.get(this._tracingManager.target().id());
    this._injectCpuProfileEvent(pid, mainMetaEvent.thread.id(), mainCpuProfile);

    const workerMetaEvents =
        metadataEvents.filter(event => event.name === metadataEventTypes.TracingSessionIdForWorker);
    for (const metaEvent of workerMetaEvents) {
      const workerId = metaEvent.args['data']['workerId'];
      const cpuProfile = this._cpuProfiles.get(workerId);
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
