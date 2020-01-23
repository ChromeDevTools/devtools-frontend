// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {DebuggerModel} from './DebuggerModel.js';            // eslint-disable-line no-unused-vars
import {RemoteObject} from './RemoteObject.js';              // eslint-disable-line no-unused-vars
import {RuntimeModel} from './RuntimeModel.js';              // eslint-disable-line no-unused-vars
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class HeapProfilerModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    target.registerHeapProfilerDispatcher(new HeapProfilerDispatcher(this));
    this._enabled = false;
    this._heapProfilerAgent = target.heapProfilerAgent();
    this._memoryAgent = target.memoryAgent();
    this._runtimeModel = /** @type {!RuntimeModel} */ (target.model(RuntimeModel));
    this._samplingProfilerDepth = 0;
  }

  /**
   * @return {!DebuggerModel}
   */
  debuggerModel() {
    return this._runtimeModel.debuggerModel();
  }

  /**
   * @return {!RuntimeModel}
   */
  runtimeModel() {
    return this._runtimeModel;
  }

  enable() {
    if (this._enabled) {
      return;
    }

    this._enabled = true;
    this._heapProfilerAgent.enable();
  }

  /**
   * @param {number=} samplingRateInBytes
   */
  startSampling(samplingRateInBytes) {
    if (this._samplingProfilerDepth++) {
      return;
    }
    const defaultSamplingIntervalInBytes = 16384;
    this._heapProfilerAgent.startSampling(samplingRateInBytes || defaultSamplingIntervalInBytes);
  }

  /**
   * @return {!Promise<?Protocol.HeapProfiler.SamplingHeapProfile>}
   */
  stopSampling() {
    if (!this._samplingProfilerDepth) {
      throw new Error('Sampling profiler is not running.');
    }
    if (--this._samplingProfilerDepth) {
      return this.getSamplingProfile();
    }
    return this._heapProfilerAgent.stopSampling();
  }

  /**
   * @return {!Promise<?Protocol.HeapProfiler.SamplingHeapProfile>}
   */
  getSamplingProfile() {
    return this._heapProfilerAgent.getSamplingProfile();
  }

  startNativeSampling() {
    const defaultSamplingIntervalInBytes = 65536;
    this._memoryAgent.startSampling(defaultSamplingIntervalInBytes);
  }

  /**
   * @return {!Promise<!NativeHeapProfile>}
   */
  async stopNativeSampling() {
    const rawProfile = /** @type {!Protocol.Memory.SamplingProfile} */ (await this._memoryAgent.getSamplingProfile());
    this._memoryAgent.stopSampling();
    return this._convertNativeProfile(rawProfile);
  }

  /**
   * @return {!Promise<!NativeHeapProfile>}
   */
  async takeNativeSnapshot() {
    const rawProfile =
        /** @type {!Protocol.Memory.SamplingProfile} */ (await this._memoryAgent.getAllTimeSamplingProfile());
    return this._convertNativeProfile(rawProfile);
  }

  /**
   * @return {!Promise<!NativeHeapProfile>}
   */
  async takeNativeBrowserSnapshot() {
    const rawProfile =
        /** @type {!Protocol.Memory.SamplingProfile} */ (await this._memoryAgent.getBrowserSamplingProfile());
    return this._convertNativeProfile(rawProfile);
  }

  /**
   * @param {!Protocol.Memory.SamplingProfile} rawProfile
   * @return {!NativeHeapProfile}
   */
  _convertNativeProfile(rawProfile) {
    const head = /** @type {!Protocol.HeapProfiler.SamplingHeapProfileNode} */
        ({children: new Map(), selfSize: 0, callFrame: {functionName: '(root)', url: ''}});
    for (const sample of rawProfile.samples) {
      const node = sample.stack.reverse().reduce((node, name) => {
        let child = node.children.get(name);
        if (child) {
          return child;
        }
        const namespace = /^([^:]*)::/.exec(name);
        child = {
          children: new Map(),
          callFrame: {functionName: name, url: namespace && namespace[1] || ''},
          selfSize: 0
        };
        node.children.set(name, child);
        return child;
      }, head);
      node.selfSize += sample.total;
    }

    function convertChildren(node) {
      node.children = Array.from(node.children.values());
      node.children.forEach(convertChildren);
    }
    convertChildren(head);

    return new NativeHeapProfile(head, rawProfile.modules);
  }

  /**
   * @return {!Promise}
   */
  collectGarbage() {
    return this._heapProfilerAgent.collectGarbage();
  }

  /**
   * @param {string} objectId
   * @return {!Promise<?string>}
   */
  snapshotObjectIdForObjectId(objectId) {
    return this._heapProfilerAgent.getHeapObjectId(objectId);
  }

  /**
   * @param {string} snapshotObjectId
   * @param {string} objectGroupName
   * @return {!Promise<?RemoteObject>}
   */
  async objectForSnapshotObjectId(snapshotObjectId, objectGroupName) {
    const result = await this._heapProfilerAgent.getObjectByHeapObjectId(snapshotObjectId, objectGroupName);
    return result && result.type && this._runtimeModel.createRemoteObject(result) || null;
  }

  /**
   * @param {string} snapshotObjectId
   * @return {!Promise}
   */
  addInspectedHeapObject(snapshotObjectId) {
    return this._heapProfilerAgent.addInspectedHeapObject(snapshotObjectId);
  }

  /**
   * @param {boolean} reportProgress
   * @param {boolean} treatGlobalObjectsAsRoots
   * @return {!Promise}
   */
  takeHeapSnapshot(reportProgress, treatGlobalObjectsAsRoots) {
    return this._heapProfilerAgent.takeHeapSnapshot(reportProgress, treatGlobalObjectsAsRoots);
  }

  /**
   * @param {boolean} recordAllocationStacks
   * @return {!Promise}
   */
  startTrackingHeapObjects(recordAllocationStacks) {
    return this._heapProfilerAgent.startTrackingHeapObjects(recordAllocationStacks);
  }

  /**
   * @param {boolean} reportProgress
   * @return {!Promise}
   */
  stopTrackingHeapObjects(reportProgress) {
    return this._heapProfilerAgent.stopTrackingHeapObjects(reportProgress);
  }

  /**
   * @param {!Array<number>} samples
   */
  heapStatsUpdate(samples) {
    this.dispatchEventToListeners(Events.HeapStatsUpdate, samples);
  }

  /**
   * @param {number} lastSeenObjectId
   * @param {number} timestamp
   */
  lastSeenObjectId(lastSeenObjectId, timestamp) {
    this.dispatchEventToListeners(Events.LastSeenObjectId, {lastSeenObjectId: lastSeenObjectId, timestamp: timestamp});
  }

  /**
   * @param {string} chunk
   */
  addHeapSnapshotChunk(chunk) {
    this.dispatchEventToListeners(Events.AddHeapSnapshotChunk, chunk);
  }

  /**
   * @param {number} done
   * @param {number} total
   * @param {boolean=} finished
   */
  reportHeapSnapshotProgress(done, total, finished) {
    this.dispatchEventToListeners(Events.ReportHeapSnapshotProgress, {done: done, total: total, finished: finished});
  }

  resetProfiles() {
    this.dispatchEventToListeners(Events.ResetProfiles, this);
  }
}

/** @enum {symbol} */
export const Events = {
  HeapStatsUpdate: Symbol('HeapStatsUpdate'),
  LastSeenObjectId: Symbol('LastSeenObjectId'),
  AddHeapSnapshotChunk: Symbol('AddHeapSnapshotChunk'),
  ReportHeapSnapshotProgress: Symbol('ReportHeapSnapshotProgress'),
  ResetProfiles: Symbol('ResetProfiles')
};

/**
 * @implements {Protocol.Profiler.Profile}
 * @extends {Protocol.HeapProfiler.SamplingHeapProfile}
 */
class NativeHeapProfile {
  /**
   * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} head
   * @param {!Array<!Protocol.Memory.Module>} modules
   */
  constructor(head, modules) {
    this.head = head;
    this.modules = modules;
  }
}

/**
 * @extends {Protocol.HeapProfilerDispatcher}
 * @unrestricted
 */
class HeapProfilerDispatcher {
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
}

SDKModel.register(HeapProfilerModel, Capability.JS, false);
