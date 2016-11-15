/**
 * @unrestricted
 */
SDK.HeapProfilerModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(SDK.HeapProfilerModel, target);
    target.registerHeapProfilerDispatcher(new SDK.HeapProfilerDispatcher(this));
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
    this.dispatchEventToListeners(SDK.HeapProfilerModel.Events.HeapStatsUpdate, samples);
  }

  /**
   * @param {number} lastSeenObjectId
   * @param {number} timestamp
   */
  lastSeenObjectId(lastSeenObjectId, timestamp) {
    this.dispatchEventToListeners(
        SDK.HeapProfilerModel.Events.LastSeenObjectId, {lastSeenObjectId: lastSeenObjectId, timestamp: timestamp});
  }

  /**
   * @param {string} chunk
   */
  addHeapSnapshotChunk(chunk) {
    this.dispatchEventToListeners(SDK.HeapProfilerModel.Events.AddHeapSnapshotChunk, chunk);
  }

  /**
   * @param {number} done
   * @param {number} total
   * @param {boolean=} finished
   */
  reportHeapSnapshotProgress(done, total, finished) {
    this.dispatchEventToListeners(
        SDK.HeapProfilerModel.Events.ReportHeapSnapshotProgress, {done: done, total: total, finished: finished});
  }

  resetProfiles() {
    this.dispatchEventToListeners(SDK.HeapProfilerModel.Events.ResetProfiles);
  }
};

/** @enum {symbol} */
SDK.HeapProfilerModel.Events = {
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
SDK.HeapProfilerDispatcher = class {
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
