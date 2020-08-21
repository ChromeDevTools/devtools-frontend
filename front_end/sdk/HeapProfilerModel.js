// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {DebuggerModel} from './DebuggerModel.js';            // eslint-disable-line no-unused-vars
import {RemoteObject} from './RemoteObject.js';              // eslint-disable-line no-unused-vars
import {RuntimeModel} from './RuntimeModel.js';              // eslint-disable-line no-unused-vars
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars


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

  async enable() {
    if (this._enabled) {
      return;
    }

    this._enabled = true;
    await this._heapProfilerAgent.invoke_enable();
  }

  /**
   * @param {number=} samplingRateInBytes
   * @returns {!Promise<boolean>}
   */
  async startSampling(samplingRateInBytes) {
    if (this._samplingProfilerDepth++) {
      return false;
    }
    const defaultSamplingIntervalInBytes = 16384;
    const response = await this._heapProfilerAgent.invoke_startSampling(
        {samplingInterval: samplingRateInBytes || defaultSamplingIntervalInBytes});
    return !!response.getError();
  }

  /**
   * @return {!Promise<?Protocol.HeapProfiler.SamplingHeapProfile>}
   */
  async stopSampling() {
    if (!this._samplingProfilerDepth) {
      throw new Error('Sampling profiler is not running.');
    }
    if (--this._samplingProfilerDepth) {
      return this.getSamplingProfile();
    }
    const response = await this._heapProfilerAgent.invoke_stopSampling();
    if (response.getError()) {
      return null;
    }
    return response.profile;
  }

  /**
   * @return {!Promise<?Protocol.HeapProfiler.SamplingHeapProfile>}
   */
  async getSamplingProfile() {
    const response = await this._heapProfilerAgent.invoke_getSamplingProfile();
    if (response.getError()) {
      return null;
    }
    return response.profile;
  }

  /**
   * @returns {!Promise<boolean>}
   */
  async startNativeSampling() {
    const samplingInterval = 65536;
    const response = await this._memoryAgent.invoke_startSampling({samplingInterval});
    return !!response.getError();
  }

  /**
   * @return {!Promise<?NativeHeapProfile>}
   */
  async stopNativeSampling() {
    const response = await this._memoryAgent.invoke_getSamplingProfile();
    // Try to stop sampling independent of an error in `getSamplingProfile`.
    await this._memoryAgent.invoke_stopSampling();
    if (response.getError()) {
      return null;
    }
    return this._convertNativeProfile(response.profile);
  }

  /**
   * @return {!Promise<?NativeHeapProfile>}
   */
  async takeNativeSnapshot() {
    const response = await this._memoryAgent.invoke_getAllTimeSamplingProfile();
    if (response.getError()) {
      return null;
    }
    return this._convertNativeProfile(response.profile);
  }

  /**
   * @return {!Promise<?NativeHeapProfile>}
   */
  async takeNativeBrowserSnapshot() {
    const response = await this._memoryAgent.invoke_getBrowserSamplingProfile();
    if (response.getError()) {
      return null;
    }
    return this._convertNativeProfile(response.profile);
  }

  /**
   * @param {!Protocol.Memory.SamplingProfile} rawProfile
   * @return {!NativeHeapProfile}
   */
  _convertNativeProfile(rawProfile) {
    /** @type {!NodeForConstruction}} */
    const head = (({
      childMap: new Map(),
      selfSize: 0,
      callFrame: {functionName: '(root)', url: '', scriptId: '', lineNumber: -1, columnNumber: -1}
    }));
    for (const sample of rawProfile.samples) {
      const node = sample.stack.reverse().reduce((node, name) => {
        let child = node.childMap.get(name);
        if (child) {
          return child;
        }
        const namespace = /^([^:]*)::/.exec(name);

        // The native profile doesn't have scriptId and line/column numbers, so we need to pass undefined to
        // not have them displayed.
        const callFrame = /** @type {!NativeProfilerCallFrame} */ ({
          functionName: name,
          url: namespace && namespace[1] || '',
          scriptId: undefined,
          lineNumber: undefined,
          columnNumber: undefined,
        });
        child = {childMap: new Map(), callFrame, selfSize: 0};
        node.childMap.set(name, child);
        return child;
      }, head);
      node.selfSize += sample.total;
    }

    /**
     * @param {!NodeForConstruction} node
     * @return {!CommonHeapProfileNode}
     */
    function convertChildren(node) {
      const children = Array.from(node.childMap.values()).map(convertChildren);
      return {selfSize: node.selfSize, callFrame: node.callFrame, children, id: -1};
    }
    return new NativeHeapProfile(convertChildren(head), rawProfile.modules);
  }

  /**
   * @return {!Promise<boolean>}
   */
  async collectGarbage() {
    const response = await this._heapProfilerAgent.invoke_collectGarbage();
    return !!response.getError();
  }

  /**
   * @param {string} objectId
   * @return {!Promise<?string>}
   */
  async snapshotObjectIdForObjectId(objectId) {
    const response = await this._heapProfilerAgent.invoke_getHeapObjectId({objectId});
    if (response.getError()) {
      return null;
    }
    return response.heapSnapshotObjectId;
  }

  /**
   * @param {string} snapshotObjectId
   * @param {string} objectGroupName
   * @return {!Promise<?RemoteObject>}
   */
  async objectForSnapshotObjectId(snapshotObjectId, objectGroupName) {
    const result = await this._heapProfilerAgent.invoke_getObjectByHeapObjectId(
        {objectId: snapshotObjectId, objectGroup: objectGroupName});
    if (result.getError()) {
      return null;
    }
    return this._runtimeModel.createRemoteObject(result.result);
  }

  /**
   * @param {string} snapshotObjectId
   * @return {!Promise<boolean>}
   */
  async addInspectedHeapObject(snapshotObjectId) {
    const response = await this._heapProfilerAgent.invoke_addInspectedHeapObject({heapObjectId: snapshotObjectId});
    return !!response.getError();
  }

  /**
   * @param {boolean} reportProgress
   * @param {boolean} treatGlobalObjectsAsRoots
   * @return {!Promise<void>}
   */
  async takeHeapSnapshot(reportProgress, treatGlobalObjectsAsRoots) {
    await this._heapProfilerAgent.invoke_takeHeapSnapshot({reportProgress, treatGlobalObjectsAsRoots});
  }

  /**
   * @param {boolean} recordAllocationStacks
   * @return {!Promise<boolean>}
   */
  async startTrackingHeapObjects(recordAllocationStacks) {
    const response =
        await this._heapProfilerAgent.invoke_startTrackingHeapObjects({trackAllocations: recordAllocationStacks});
    return !!response.getError();
  }

  /**
   * @param {boolean} reportProgress
   * @return {!Promise<boolean>}
   */
  async stopTrackingHeapObjects(reportProgress) {
    const response = await this._heapProfilerAgent.invoke_stopTrackingHeapObjects({reportProgress});
    return !!response.getError();
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

/** @typedef {!{functionName: string, url: string, scriptId: (Protocol.Runtime.ScriptId|undefined), lineNumber: (number|undefined), columnNumber: (number|undefined)}} */
// @ts-ignore typedef
export let NativeProfilerCallFrame;  // eslint-disable-line no-unused-vars

/** @typedef {!{callFrame: !NativeProfilerCallFrame, selfSize: number, id: (number|undefined), children: Array<!CommonHeapProfileNode>}} */
// @ts-ignore typedef
export let CommonHeapProfileNode;  // eslint-disable-line no-unused-vars

/** @typedef {!{head:!CommonHeapProfileNode, modules:!Array<!Protocol.Memory.Module>}} */
// @ts-ignore typedef
export let CommonHeapProfile;  // eslint-disable-line no-unused-vars

/**
 * TODO(chromium:1011811): Change this to implements once we are TypeScript-only.
 * @extends {CommonHeapProfile}
 */
class NativeHeapProfile {
  /**
   * @param {!CommonHeapProfileNode} head
   * @param {!Array<!Protocol.Memory.Module>} modules
   */
  constructor(head, modules) {
    this.head = head;
    this.modules = modules;
  }
}

/**
 * @implements {ProtocolProxyApi.HeapProfilerDispatcher}
 */
class HeapProfilerDispatcher {
  /**
   * @param {!HeapProfilerModel} model
   */
  constructor(model) {
    this._heapProfilerModel = model;
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }

  /**
   * @override
   * @param {!Protocol.HeapProfiler.HeapStatsUpdateEvent} event
   */
  heapStatsUpdate({statsUpdate}) {
    this._heapProfilerModel.heapStatsUpdate(statsUpdate);
  }

  /**
   * @override
   * @param {!Protocol.HeapProfiler.LastSeenObjectIdEvent} event
   */
  lastSeenObjectId({lastSeenObjectId, timestamp}) {
    this._heapProfilerModel.lastSeenObjectId(lastSeenObjectId, timestamp);
  }

  /**
   * @override
   * @param {!Protocol.HeapProfiler.AddHeapSnapshotChunkEvent} event
   */
  addHeapSnapshotChunk({chunk}) {
    this._heapProfilerModel.addHeapSnapshotChunk(chunk);
  }

  /**
   * @override
   * @param {!Protocol.HeapProfiler.ReportHeapSnapshotProgressEvent} event
   */
  reportHeapSnapshotProgress({done, total, finished}) {
    this._heapProfilerModel.reportHeapSnapshotProgress(done, total, finished);
  }

  /**
   * @override
   */
  resetProfiles() {
    this._heapProfilerModel.resetProfiles();
  }
}

/** @typedef {!{callFrame: !NativeProfilerCallFrame, selfSize: number, childMap: !Map<string, !NodeForConstruction>}} */
// @ts-ignore typedef
let NodeForConstruction;  // eslint-disable-line no-unused-vars

SDKModel.register(HeapProfilerModel, Capability.JS, false);
