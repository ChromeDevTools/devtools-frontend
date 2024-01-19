// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Platform from '../platform/platform.js';

import {type DebuggerModel} from './DebuggerModel.js';
import {type RemoteObject} from './RemoteObject.js';
import {RuntimeModel} from './RuntimeModel.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

export class HeapProfilerModel extends SDKModel<EventTypes> {
  #enabled: boolean;
  readonly #heapProfilerAgent: ProtocolProxyApi.HeapProfilerApi;
  readonly #runtimeModelInternal: RuntimeModel;
  #samplingProfilerDepth: number;

  constructor(target: Target) {
    super(target);
    target.registerHeapProfilerDispatcher(new HeapProfilerDispatcher(this));
    this.#enabled = false;
    this.#heapProfilerAgent = target.heapProfilerAgent();
    this.#runtimeModelInternal = (target.model(RuntimeModel) as RuntimeModel);
    this.#samplingProfilerDepth = 0;
  }

  debuggerModel(): DebuggerModel {
    return this.#runtimeModelInternal.debuggerModel();
  }

  runtimeModel(): RuntimeModel {
    return this.#runtimeModelInternal;
  }

  async enable(): Promise<void> {
    if (this.#enabled) {
      return;
    }

    this.#enabled = true;
    await this.#heapProfilerAgent.invoke_enable();
  }

  async startSampling(samplingRateInBytes?: number): Promise<boolean> {
    if (this.#samplingProfilerDepth++) {
      return false;
    }
    const defaultSamplingIntervalInBytes = 16384;
    const response = await this.#heapProfilerAgent.invoke_startSampling(
        {samplingInterval: samplingRateInBytes || defaultSamplingIntervalInBytes});
    return Boolean(response.getError());
  }

  async stopSampling(): Promise<Protocol.HeapProfiler.SamplingHeapProfile|null> {
    if (!this.#samplingProfilerDepth) {
      throw new Error('Sampling profiler is not running.');
    }
    if (--this.#samplingProfilerDepth) {
      return this.getSamplingProfile();
    }
    const response = await this.#heapProfilerAgent.invoke_stopSampling();
    if (response.getError()) {
      return null;
    }
    return response.profile;
  }

  async getSamplingProfile(): Promise<Protocol.HeapProfiler.SamplingHeapProfile|null> {
    const response = await this.#heapProfilerAgent.invoke_getSamplingProfile();
    if (response.getError()) {
      return null;
    }
    return response.profile;
  }

  async collectGarbage(): Promise<boolean> {
    const response = await this.#heapProfilerAgent.invoke_collectGarbage();
    return Boolean(response.getError());
  }

  async snapshotObjectIdForObjectId(objectId: Protocol.Runtime.RemoteObjectId): Promise<string|null> {
    const response = await this.#heapProfilerAgent.invoke_getHeapObjectId({objectId});
    if (response.getError()) {
      return null;
    }
    return response.heapSnapshotObjectId;
  }

  async objectForSnapshotObjectId(
      snapshotObjectId: Protocol.HeapProfiler.HeapSnapshotObjectId,
      objectGroupName: string): Promise<RemoteObject|null> {
    const result = await this.#heapProfilerAgent.invoke_getObjectByHeapObjectId(
        {objectId: snapshotObjectId, objectGroup: objectGroupName});
    if (result.getError()) {
      return null;
    }
    return this.#runtimeModelInternal.createRemoteObject(result.result);
  }

  async addInspectedHeapObject(snapshotObjectId: Protocol.HeapProfiler.HeapSnapshotObjectId): Promise<boolean> {
    const response = await this.#heapProfilerAgent.invoke_addInspectedHeapObject({heapObjectId: snapshotObjectId});
    return Boolean(response.getError());
  }

  async takeHeapSnapshot(heapSnapshotOptions: Protocol.HeapProfiler.TakeHeapSnapshotRequest): Promise<void> {
    await this.#heapProfilerAgent.invoke_takeHeapSnapshot(heapSnapshotOptions);
  }

  async startTrackingHeapObjects(recordAllocationStacks: boolean): Promise<boolean> {
    const response =
        await this.#heapProfilerAgent.invoke_startTrackingHeapObjects({trackAllocations: recordAllocationStacks});
    return Boolean(response.getError());
  }

  async stopTrackingHeapObjects(reportProgress: boolean): Promise<boolean> {
    const response = await this.#heapProfilerAgent.invoke_stopTrackingHeapObjects({reportProgress});
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

/**
 * An array of triplets. Each triplet describes a fragment. The first number is the fragment
 * index, the second number is a total count of objects for the fragment, the third number is
 * a total size of the objects for the fragment.
 */
export type HeapStatsUpdateSamples = number[];

export interface LastSeenObjectId {
  lastSeenObjectId: number;
  timestamp: number;
}

export interface HeapSnapshotProgress {
  done: number;
  total: number;
  finished?: boolean;
}

export type EventTypes = {
  [Events.HeapStatsUpdate]: HeapStatsUpdateSamples,
  [Events.LastSeenObjectId]: LastSeenObjectId,
  [Events.AddHeapSnapshotChunk]: string,
  [Events.ReportHeapSnapshotProgress]: HeapSnapshotProgress,
  [Events.ResetProfiles]: HeapProfilerModel,
};

export interface NativeProfilerCallFrame {
  functionName: string;
  url: Platform.DevToolsPath.UrlString;
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
  readonly #heapProfilerModel: HeapProfilerModel;
  constructor(model: HeapProfilerModel) {
    this.#heapProfilerModel = model;
  }

  heapStatsUpdate({statsUpdate}: Protocol.HeapProfiler.HeapStatsUpdateEvent): void {
    this.#heapProfilerModel.heapStatsUpdate(statsUpdate);
  }

  lastSeenObjectId({lastSeenObjectId, timestamp}: Protocol.HeapProfiler.LastSeenObjectIdEvent): void {
    this.#heapProfilerModel.lastSeenObjectId(lastSeenObjectId, timestamp);
  }

  addHeapSnapshotChunk({chunk}: Protocol.HeapProfiler.AddHeapSnapshotChunkEvent): void {
    this.#heapProfilerModel.addHeapSnapshotChunk(chunk);
  }

  reportHeapSnapshotProgress({done, total, finished}: Protocol.HeapProfiler.ReportHeapSnapshotProgressEvent): void {
    this.#heapProfilerModel.reportHeapSnapshotProgress(done, total, finished);
  }

  resetProfiles(): void {
    this.#heapProfilerModel.resetProfiles();
  }
}

SDKModel.register(HeapProfilerModel, {capabilities: Capability.JS, autostart: false});
