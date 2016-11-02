/**
 * @unrestricted
 */
WebInspector.HeapProfilerModel = class extends WebInspector.SDKModel {
  /**
   * @param {!WebInspector.Target} target
   */
  constructor(target) {
    super(WebInspector.HeapProfilerModel, target);
    target.registerHeapProfilerDispatcher(new WebInspector.HeapProfilerDispatcher(this));
    this._enabled = false;
    this._heapProfilerAgent = target.heapProfilerAgent();
  }
  enable() {
    if (this._enabled)
      return;

    this._enabled = true;
    this._heapProfilerAgent.enable();
  }

  startSampling() {
    var defaultSamplingIntervalInBytes = 16384;
    this._heapProfilerAgent.startSampling(defaultSamplingIntervalInBytes);
  }

  /**
   * @return {!Promise.<?Protocol.Profiler.Profile>}
   */
  stopSampling() {
    this._isRecording = false;
    return this._heapProfilerAgent.stopSampling((error, profile) => error ? null : profile);
  }

  /**
   * @param {!Array.<number>} samples
   */
  heapStatsUpdate(samples) {
    this.dispatchEventToListeners(WebInspector.HeapProfilerModel.Events.HeapStatsUpdate, samples);
  }

  /**
   * @param {number} lastSeenObjectId
   * @param {number} timestamp
   */
  lastSeenObjectId(lastSeenObjectId, timestamp) {
    this.dispatchEventToListeners(
        WebInspector.HeapProfilerModel.Events.LastSeenObjectId,
        {lastSeenObjectId: lastSeenObjectId, timestamp: timestamp});
  }

  /**
   * @param {string} chunk
   */
  addHeapSnapshotChunk(chunk) {
    this.dispatchEventToListeners(WebInspector.HeapProfilerModel.Events.AddHeapSnapshotChunk, chunk);
  }

  /**
   * @param {number} done
   * @param {number} total
   * @param {boolean=} finished
   */
  reportHeapSnapshotProgress(done, total, finished) {
    this.dispatchEventToListeners(
        WebInspector.HeapProfilerModel.Events.ReportHeapSnapshotProgress,
        {done: done, total: total, finished: finished});
  }

  resetProfiles() {
    this.dispatchEventToListeners(WebInspector.HeapProfilerModel.Events.ResetProfiles);
  }
};

/** @enum {symbol} */
WebInspector.HeapProfilerModel.Events = {
  HeapStatsUpdate: Symbol('HeapStatsUpdate'),
  LastSeenObjectId: Symbol('LastSeenObjectId'),
  AddHeapSnapshotChunk: Symbol('AddHeapSnapshotChunk'),
  ReportHeapSnapshotProgress: Symbol('ReportHeapSnapshotProgress'),
  ResetProfiles: Symbol('ResetProfiles')
};

/**
 * @implements {Protocol.HeapProfilerDispatcher}
 * @unrestricted
 */
WebInspector.HeapProfilerDispatcher = class {
  constructor(model) {
    this._heapProfilerModel = model;
  }

  /**
   * @override
   * @param {!Array.<number>} samples
   */
  heapStatsUpdate(samples) {
    this._heapProfilerModel.heapStatsUpdate(samples);
  }

  /**
   * @override
   * @param {number} lastSeenObjectId
   * @param {number} timestamp
   */
  lastSeenObjectId(lastSeenObjectId, timestamp) {
    this._heapProfilerModel.lastSeenObjectId(lastSeenObjectId, timestamp);
  }

  /**
   * @override
   * @param {string} chunk
   */
  addHeapSnapshotChunk(chunk) {
    this._heapProfilerModel.addHeapSnapshotChunk(chunk);
  }

  /**
   * @override
   * @param {number} done
   * @param {number} total
   * @param {boolean=} finished
   */
  reportHeapSnapshotProgress(done, total, finished) {
    this._heapProfilerModel.reportHeapSnapshotProgress(done, total, finished);
  }

  /**
   * @override
   */
  resetProfiles() {
    this._heapProfilerModel.resetProfiles();
  }
};
