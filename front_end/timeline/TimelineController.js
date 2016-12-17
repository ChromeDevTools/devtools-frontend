// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.TargetManager.Observer}
 * @implements {SDK.TracingManagerClient}
 * @unrestricted
 */
Timeline.TimelineController = class {
  /**
   * @param {!SDK.Target} target
   * @param {!Timeline.TimelineLifecycleDelegate} delegate
   * @param {!SDK.TracingModel} tracingModel
   */
  constructor(target, delegate, tracingModel) {
    this._delegate = delegate;
    this._target = target;
    this._tracingModel = tracingModel;
    this._targets = [];
    /** @type {!Array<!Timeline.ExtensionTracingSession>} */
    this._extensionSessions = [];
    SDK.targetManager.observeTargets(this);
  }

  /**
   * @param {!Timeline.TimelineController.CaptureOptions} options
   * @param {!Array<!Extensions.ExtensionTraceProvider>} providers
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

    if (Runtime.experiments.isEnabled('timelineV8RuntimeCallStats') && options.enableJSSampling)
      categoriesArray.push(disabledByDefault('v8.runtime_stats_sampling'));
    if (Runtime.experiments.isEnabled('timelineTracingJSProfile') && options.enableJSSampling) {
      categoriesArray.push(disabledByDefault('v8.cpu_profiler'));
      if (Common.moduleSetting('highResolutionCpuProfiling').get())
        categoriesArray.push(disabledByDefault('v8.cpu_profiler.hires'));
    }
    if (options.captureCauses || options.enableJSSampling)
      categoriesArray.push(disabledByDefault('devtools.timeline.stack'));
    if (options.captureCauses && Runtime.experiments.isEnabled('timelineInvalidationTracking'))
      categoriesArray.push(disabledByDefault('devtools.timeline.invalidationTracking'));
    if (options.capturePictures) {
      categoriesArray.push(
          disabledByDefault('devtools.timeline.layers'), disabledByDefault('devtools.timeline.picture'),
          disabledByDefault('blink.graphics_context_annotations'));
    }
    if (options.captureFilmStrip)
      categoriesArray.push(disabledByDefault('devtools.screenshot'));

    this._extensionSessions = providers.map(provider => new Timeline.ExtensionTracingSession(provider, this._delegate));
    this._extensionSessions.forEach(session => session.start());
    this._startRecordingWithCategories(categoriesArray.join(','), options.enableJSSampling);
  }

  stopRecording() {
    var tracingStoppedPromises = [];
    tracingStoppedPromises.push(new Promise(resolve => this._tracingCompleteCallback = resolve));
    tracingStoppedPromises.push(this._stopProfilingOnAllTargets());
    this._target.tracingManager.stop();

    tracingStoppedPromises.push(SDK.targetManager.resumeAllTargets());

    this._delegate.loadingStarted();

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
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    this._targets.push(target);
    if (this._profiling)
      this._startProfilingOnTarget(target);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    this._targets.remove(target, true);
    // FIXME: We'd like to stop profiling on the target and retrieve a profile
    // but it's too late. Backend connection is closed.
  }

  /**
   * @param {!SDK.Target} target
   * @return {!Promise}
   */
  _startProfilingOnTarget(target) {
    return target.hasJSCapability() ? target.profilerAgent().start() : Promise.resolve();
  }

  /**
   * @return {!Promise}
   */
  _startProfilingOnAllTargets() {
    var intervalUs = Common.moduleSetting('highResolutionCpuProfiling').get() ? 100 : 1000;
    this._target.profilerAgent().setSamplingInterval(intervalUs);
    this._profiling = true;
    return Promise.all(this._targets.map(this._startProfilingOnTarget));
  }

  /**
   * @param {!SDK.Target} target
   * @return {!Promise}
   */
  _stopProfilingOnTarget(target) {
    return target.hasJSCapability() ? target.profilerAgent().stop(this._addCpuProfile.bind(this, target.id())) :
                                      Promise.resolve();
  }

  /**
   * @param {number} targetId
   * @param {?Protocol.Error} error
   * @param {?Protocol.Profiler.Profile} cpuProfile
   */
  _addCpuProfile(targetId, error, cpuProfile) {
    if (!cpuProfile) {
      Common.console.warn(Common.UIString('CPU profile for a target is not available. %s', error || ''));
      return;
    }
    if (!this._cpuProfiles)
      this._cpuProfiles = new Map();
    this._cpuProfiles.set(targetId, cpuProfile);
  }

  /**
   * @return {!Promise}
   */
  _stopProfilingOnAllTargets() {
    var targets = this._profiling ? this._targets : [];
    this._profiling = false;
    return Promise.all(targets.map(this._stopProfilingOnTarget, this));
  }

  /**
   * @param {string} categories
   * @param {boolean=} enableJSSampling
   * @param {function(?string)=} callback
   */
  _startRecordingWithCategories(categories, enableJSSampling, callback) {
    SDK.targetManager.suspendAllTargets();
    var profilingStartedPromise = enableJSSampling && !Runtime.experiments.isEnabled('timelineTracingJSProfile') ?
        this._startProfilingOnAllTargets() :
        Promise.resolve();
    var samplingFrequencyHz = Common.moduleSetting('highResolutionCpuProfiling').get() ? 10000 : 1000;
    var options = 'sampling-frequency=' + samplingFrequencyHz;
    var target = this._target;
    var tracingManager = target.tracingManager;
    SDK.targetManager.suspendReload(target);
    profilingStartedPromise.then(tracingManager.start.bind(tracingManager, this, categories, options, onTraceStarted));
    /**
     * @param {?string} error
     */
    function onTraceStarted(error) {
      SDK.targetManager.resumeReload(target);
      if (callback)
        callback(error);
    }
  }

  /**
   * @override
   */
  tracingStarted() {
    this._tracingModel.reset();
    this._delegate.recordingStarted();
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
    this._injectCpuProfileEvents();
    this._tracingModel.tracingComplete();
    this._delegate.loadingComplete(true);
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
    var mainCpuProfile = this._cpuProfiles.get(this._target.id());
    this._injectCpuProfileEvent(pid, mainMetaEvent.thread.id(), mainCpuProfile);

    var workerMetaEvents = metadataEvents.filter(event => event.name === metadataEventTypes.TracingSessionIdForWorker);
    for (var metaEvent of workerMetaEvents) {
      var workerId = metaEvent.args['data']['workerId'];
      var workerTarget = this._target.subTargetsManager ? this._target.subTargetsManager.targetForId(workerId) : null;
      if (!workerTarget)
        continue;
      var cpuProfile = this._cpuProfiles.get(workerTarget.id());
      this._injectCpuProfileEvent(pid, metaEvent.args['data']['workerThreadId'], cpuProfile);
    }
    this._cpuProfiles = null;
  }

  /**
   * @param {number} usage
   * @override
   */
  tracingBufferUsage(usage) {
    this._delegate.recordingProgress(usage);
  }

  /**
   * @param {number} progress
   * @override
   */
  eventsRetrievalProgress(progress) {
    this._delegate.loadingProgress(progress);
  }
};

/** @typedef {!{
 *    captureCauses: (boolean|undefined),
 *    enableJSSampling: (boolean|undefined),
 *    captureMemory: (boolean|undefined),
 *    capturePictures: (boolean|undefined),
 *    captureFilmStrip: (boolean|undefined)
 *  }}
 */
Timeline.TimelineController.CaptureOptions;
