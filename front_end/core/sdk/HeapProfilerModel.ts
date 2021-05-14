// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import type {DebuggerModel} from './DebuggerModel.js';       // eslint-disable-line no-unused-vars
import type {RemoteObject} from './RemoteObject.js';         // eslint-disable-line no-unused-vars
import {RuntimeModel} from './RuntimeModel.js';              // eslint-disable-line no-unused-vars
import type {Target} from './SDKModel.js';
import {Capability, SDKModel} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class HeapProfilerModel extends SDKModel {
  _enabled: boolean;
  _heapProfilerAgent: ProtocolProxyApi.HeapProfilerApi;
  _memoryAgent: ProtocolProxyApi.MemoryApi;
  _runtimeModel: RuntimeModel;
  _samplingProfilerDepth: number;

  constructor(target: Target) {
    super(target);
    target.registerHeapProfilerDispatcher(new HeapProfilerDispatcher(this));
    this._enabled = false;
    this._heapProfilerAgent = target.heapProfilerAgent();
    this._memoryAgent = target.memoryAgent();
    this._runtimeModel = (target.model(RuntimeModel) as RuntimeModel);
    this._samplingProfilerDepth = 0;
  }

  debuggerModel(): DebuggerModel {
    return this._runtimeModel.debuggerModel();
  }

  runtimeModel(): RuntimeModel {
    return this._runtimeModel;
  }

  async enable(): Promise<void> {
    if (this._enabled) {
      return;
    }

    this._enabled = true;
    await this._heapProfilerAgent.invoke_enable();
  }

  async startSampling(samplingRateInBytes?: number): Promise<boolean> {
    if (this._samplingProfilerDepth++) {
      return false;
    }
    const defaultSamplingIntervalInBytes = 16384;
    const response = await this._heapProfilerAgent.invoke_startSampling(
        {samplingInterval: samplingRateInBytes || defaultSamplingIntervalInBytes});
    return Boolean(response.getError());
  }

  async stopSampling(): Promise<Protocol.HeapProfiler.SamplingHeapProfile|null> {
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

  async getSamplingProfile(): Promise<Protocol.HeapProfiler.SamplingHeapProfile|null> {
    const response = await this._heapProfilerAgent.invoke_getSamplingProfile();
    if (response.getError()) {
      return null;
    }
    return response.profile;
  }

  async collectGarbage(): Promise<boolean> {
    const response = await this._heapProfilerAgent.invoke_collectGarbage();
    return Boolean(response.getError());
  }

  async snapshotObjectIdForObjectId(objectId: string): Promise<string|null> {
    const response = await this._heapProfilerAgent.invoke_getHeapObjectId({objectId});
    if (response.getError()) {
      return null;
    }
    return response.heapSnapshotObjectId;
  }

  async objectForSnapshotObjectId(snapshotObjectId: string, objectGroupName: string): Promise<RemoteObject|null> {
    const result = await this._heapProfilerAgent.invoke_getObjectByHeapObjectId(
        {objectId: snapshotObjectId, objectGroup: objectGroupName});
    if (result.getError()) {
      return null;
    }
    return this._runtimeModel.createRemoteObject(result.result);
  }

  async addInspectedHeapObject(snapshotObjectId: string): Promise<boolean> {
    const response = await this._heapProfilerAgent.invoke_addInspectedHeapObject({heapObjectId: snapshotObjectId});
    return Boolean(response.getError());
  }

  async takeHeapSnapshot(heapSnapshotOptions: Protocol.HeapProfiler.TakeHeapSnapshotRequest): Promise<void> {
    await this._heapProfilerAgent.invoke_takeHeapSnapshot(heapSnapshotOptions);
  }

  async startTrackingHeapObjects(recordAllocationStacks: boolean): Promise<boolean> {
    const response =
        await this._heapProfilerAgent.invoke_startTrackingHeapObjects({trackAllocations: recordAllocationStacks});
    return Boolean(response.getError());
  }

  async stopTrackingHeapObjects(reportProgress: boolean): Promise<boolean> {
    const response = await this._heapProfilerAgent.invoke_stopTrackingHeapObjects({reportProgress});
    return Boolean(response.getError());
  }

  heapStatsUpdate(samples: number[]): void {
    this.dispatchEventToListeners(Events.HeapStatsUpdate, samples);
  }

  lastSeenObjectId(lastSeenObjectId: number, timestamp: number): void {
    this.dispatchEventToListeners(Events.LastSeenObjectId, {lastSeenObjectId: lastSeenObjectId, timestamp: timestamp});
  }

  addHeapSnapshotChunk(chunk: string): void {
    this.dispatchEventToListeners(Events.AddHeapSnapshotChunk, chunk);
  }

  reportHeapSnapshotProgress(done: number, total: number, finished?: boolean): void {
    this.dispatchEventToListeners(Events.ReportHeapSnapshotProgress, {done: done, total: total, finished: finished});
  }

  resetProfiles(): void {
    this.dispatchEventToListeners(Events.ResetProfiles, this);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  HeapStatsUpdate = 'HeapStatsUpdate',
  LastSeenObjectId = 'LastSeenObjectId',
  AddHeapSnapshotChunk = 'AddHeapSnapshotChunk',
  ReportHeapSnapshotProgress = 'ReportHeapSnapshotProgress',
  ResetProfiles = 'ResetProfiles',
}

export interface NativeProfilerCallFrame {
  functionName: string;
  url: string;
  scriptId?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface CommonHeapProfileNode {
  callFrame: NativeProfilerCallFrame;
  selfSize: number;
  id?: number;
  children: CommonHeapProfileNode[];
}

export interface CommonHeapProfile {
  head: CommonHeapProfileNode;
  modules: Protocol.Memory.Module[];
}

class HeapProfilerDispatcher implements ProtocolProxyApi.HeapProfilerDispatcher {
  _heapProfilerModel: HeapProfilerModel;
  constructor(model: HeapProfilerModel) {
    this._heapProfilerModel = model;
  }

  heapStatsUpdate({statsUpdate}: Protocol.HeapProfiler.HeapStatsUpdateEvent): void {
    this._heapProfilerModel.heapStatsUpdate(statsUpdate);
  }

  lastSeenObjectId({lastSeenObjectId, timestamp}: Protocol.HeapProfiler.LastSeenObjectIdEvent): void {
    this._heapProfilerModel.lastSeenObjectId(lastSeenObjectId, timestamp);
  }

  addHeapSnapshotChunk({chunk}: Protocol.HeapProfiler.AddHeapSnapshotChunkEvent): void {
    this._heapProfilerModel.addHeapSnapshotChunk(chunk);
  }

  reportHeapSnapshotProgress({done, total, finished}: Protocol.HeapProfiler.ReportHeapSnapshotProgressEvent): void {
    this._heapProfilerModel.reportHeapSnapshotProgress(done, total, finished);
  }

  resetProfiles(): void {
    this._heapProfilerModel.resetProfiles();
  }
}

SDKModel.register(HeapProfilerModel, {capabilities: Capability.JS, autostart: false});
