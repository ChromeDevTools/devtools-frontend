/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import type * as HeapSnapshotModel from '../../models/heap_snapshot_model/heap_snapshot_model.js';
import * as i18n from '../../core/i18n/i18n.js';
import {type ChildrenProvider} from './ChildrenProvider.js';

const UIStrings = {
  /**
   *@description Text in Heap Snapshot Proxy of a profiler tool
   *@example {functionName} PH1
   */
  anErrorOccurredWhenACallToMethod: 'An error occurred when a call to method \'\'{PH1}\'\' was requested',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapSnapshotProxy.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class HeapSnapshotWorkerProxy extends Common.ObjectWrapper.ObjectWrapper<HeapSnapshotWorkerProxy.EventTypes> {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly eventHandler: (arg0: string, arg1: any) => void;
  nextObjectId: number;
  nextCallId: number;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: Map<number, (arg0: any) => void>;
  readonly previousCallbacks: Set<number>;
  readonly worker: Common.Worker.WorkerWrapper;
  interval?: number;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(eventHandler: (arg0: string, arg1: any) => void) {
    super();
    this.eventHandler = eventHandler;
    this.nextObjectId = 1;
    this.nextCallId = 1;
    this.callbacks = new Map();
    this.previousCallbacks = new Set();
    // We use the legacy file here, as below we postMessage and expect certain objects to be
    // defined on the global scope. Ideally we use some sort of import-export mechanism across
    // worker boundaries, but that requires a partial rewrite of the heap_snapshot_worker.
    this.worker = Common.Worker.WorkerWrapper.fromURL(
        new URL('../../entrypoints/heap_snapshot_worker/heap_snapshot_worker-legacy.js', import.meta.url));
    this.worker.onmessage = this.messageReceived.bind(this);
  }

  createLoader(profileUid: number, snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void):
      HeapSnapshotLoaderProxy {
    const objectId = this.nextObjectId++;
    const proxy = new HeapSnapshotLoaderProxy(this, objectId, profileUid, snapshotReceivedCallback);
    this.postMessage({
      callId: this.nextCallId++,
      disposition: 'create',
      objectId: objectId,
      methodName: 'HeapSnapshotWorker.HeapSnapshotLoader',
    });
    return proxy;
  }

  dispose(): void {
    this.worker.terminate();
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  disposeObject(objectId: number): void {
    this.postMessage({callId: this.nextCallId++, disposition: 'dispose', objectId: objectId});
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluateForTest(script: string, callback: (arg0: any) => void): void {
    const callId = this.nextCallId++;
    this.callbacks.set(callId, callback);
    this.postMessage({callId: callId, disposition: 'evaluateForTest', source: script});
  }

  callFactoryMethod<T extends Object>(
      callback: ((...arg0: unknown[]) => void)|null, objectId: string, methodName: string,
      proxyConstructor: new(...arg1: unknown[]) => T): Object|null {
    const callId = this.nextCallId++;
    const methodArguments = Array.prototype.slice.call(arguments, 4);
    const newObjectId = this.nextObjectId++;

    if (callback) {
      this.callbacks.set(callId, remoteResult => {
        callback(remoteResult ? new proxyConstructor(this, newObjectId) : null);
      });
      this.postMessage({
        callId: callId,
        disposition: 'factory',
        objectId: objectId,
        methodName: methodName,
        methodArguments: methodArguments,
        newObjectId: newObjectId,
      });
      return null;
    }
    this.postMessage({
      callId: callId,
      disposition: 'factory',
      objectId: objectId,
      methodName: methodName,
      methodArguments: methodArguments,
      newObjectId: newObjectId,
    });
    return new proxyConstructor(this, newObjectId);
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callMethod(callback: (arg0: any) => void, objectId: string, methodName: string): void {
    const callId = this.nextCallId++;
    const methodArguments = Array.prototype.slice.call(arguments, 3);
    if (callback) {
      this.callbacks.set(callId, callback);
    }
    this.postMessage({
      callId: callId,
      disposition: 'method',
      objectId: objectId,
      methodName: methodName,
      methodArguments: methodArguments,
    });
  }

  startCheckingForLongRunningCalls(): void {
    if (this.interval) {
      return;
    }
    this.checkLongRunningCalls();
    this.interval = window.setInterval(this.checkLongRunningCalls.bind(this), 300);
  }

  checkLongRunningCalls(): void {
    for (const callId of this.previousCallbacks) {
      if (!this.callbacks.has(callId)) {
        this.previousCallbacks.delete(callId);
      }
    }
    const hasLongRunningCalls = Boolean(this.previousCallbacks.size);
    this.dispatchEventToListeners(HeapSnapshotWorkerProxy.Events.Wait, hasLongRunningCalls);
    for (const callId of this.callbacks.keys()) {
      this.previousCallbacks.add(callId);
    }
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageReceived(event: MessageEvent<any>): void {
    const data = event.data;
    if (data.eventName) {
      if (this.eventHandler) {
        this.eventHandler(data.eventName, data.data);
      }
      return;
    }
    if (data.error) {
      if (data.errorMethodName) {
        Common.Console.Console.instance().error(
            i18nString(UIStrings.anErrorOccurredWhenACallToMethod, {PH1: data.errorMethodName}));
      }
      Common.Console.Console.instance().error(data['errorCallStack']);
      this.callbacks.delete(data.callId);
      return;
    }
    const callback = this.callbacks.get(data.callId);
    if (!callback) {
      return;
    }
    this.callbacks.delete(data.callId);
    callback(data.result);
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage(message: any): void {
    this.worker.postMessage(message);
  }
}

export namespace HeapSnapshotWorkerProxy {

  export const enum Events {
    Wait = 'Wait',
  }

  export type EventTypes = {
    [Events.Wait]: boolean,
  };
}

export class HeapSnapshotProxyObject {
  readonly worker: HeapSnapshotWorkerProxy;
  readonly objectId: number;
  constructor(worker: HeapSnapshotWorkerProxy, objectId: number) {
    this.worker = worker;
    this.objectId = objectId;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callWorker(workerMethodName: string, args: any[]): any {
    args.splice(1, 0, this.objectId);
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const worker = (this.worker as any)[workerMethodName];
    if (!worker) {
      throw new Error(`Could not find worker with name ${workerMethodName}.`);
    }
    return worker.apply(this.worker, args);
  }

  dispose(): void {
    this.worker.disposeObject(this.objectId);
  }

  disposeWorker(): void {
    this.worker.dispose();
  }

  callFactoryMethod<T>(
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _callback: ((...arg0: any[]) => void)|null, _methodName: string, _proxyConstructor: new(...arg1: any[]) => T,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/naming-convention
      ..._var_args: any[]): T {
    return this.callWorker('callFactoryMethod', Array.prototype.slice.call(arguments, 0));
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/naming-convention
  callMethodPromise<T>(_methodName: string, ..._var_args: any[]): Promise<T> {
    const args = Array.prototype.slice.call(arguments);
    return new Promise(resolve => this.callWorker('callMethod', [resolve, ...args]));
  }
}

export class HeapSnapshotLoaderProxy extends HeapSnapshotProxyObject implements Common.StringOutputStream.OutputStream {
  readonly profileUid: number;
  readonly snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void;
  constructor(
      worker: HeapSnapshotWorkerProxy, objectId: number, profileUid: number,
      snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void) {
    super(worker, objectId);
    this.profileUid = profileUid;
    this.snapshotReceivedCallback = snapshotReceivedCallback;
  }

  async write(chunk: string): Promise<void> {
    await this.callMethodPromise('write', chunk);
  }

  async close(): Promise<void> {
    await this.callMethodPromise('close');
    const snapshotProxy = await new Promise<HeapSnapshotProxy>(
        resolve => this.callFactoryMethod(resolve, 'buildSnapshot', HeapSnapshotProxy));
    this.dispose();
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-expect-error
    snapshotProxy.setProfileUid(this.profileUid);
    await snapshotProxy.updateStaticData();
    this.snapshotReceivedCallback(snapshotProxy);
  }
}

export class HeapSnapshotProxy extends HeapSnapshotProxyObject {
  staticData: HeapSnapshotModel.HeapSnapshotModel.StaticData|null;
  profileUid?: string;

  constructor(worker: HeapSnapshotWorkerProxy, objectId: number) {
    super(worker, objectId);
    this.staticData = null;
  }

  search(
      searchConfig: HeapSnapshotModel.HeapSnapshotModel.SearchConfig,
      filter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): Promise<number[]> {
    return this.callMethodPromise('search', searchConfig, filter);
  }

  aggregatesWithFilter(filter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): Promise<{
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate,
  }> {
    return this.callMethodPromise('aggregatesWithFilter', filter);
  }

  aggregatesForDiff(): Promise<{
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff,
  }> {
    return this.callMethodPromise('aggregatesForDiff');
  }

  calculateSnapshotDiff(baseSnapshotId: string, baseSnapshotAggregates: {
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff,
  }): Promise<{
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff,
  }> {
    return this.callMethodPromise('calculateSnapshotDiff', baseSnapshotId, baseSnapshotAggregates);
  }

  nodeClassName(snapshotObjectId: number): Promise<string|null> {
    return this.callMethodPromise('nodeClassName', snapshotObjectId);
  }

  createEdgesProvider(nodeIndex: number): HeapSnapshotProviderProxy {
    return this.callFactoryMethod(null, 'createEdgesProvider', HeapSnapshotProviderProxy, nodeIndex);
  }

  createRetainingEdgesProvider(nodeIndex: number): HeapSnapshotProviderProxy {
    return this.callFactoryMethod(null, 'createRetainingEdgesProvider', HeapSnapshotProviderProxy, nodeIndex);
  }

  createAddedNodesProvider(baseSnapshotId: string, className: string): HeapSnapshotProviderProxy|null {
    return this.callFactoryMethod(
        null, 'createAddedNodesProvider', HeapSnapshotProviderProxy, baseSnapshotId, className);
  }

  createDeletedNodesProvider(nodeIndexes: number[]): HeapSnapshotProviderProxy|null {
    return this.callFactoryMethod(null, 'createDeletedNodesProvider', HeapSnapshotProviderProxy, nodeIndexes);
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createNodesProvider(filter: (arg0: any) => boolean): HeapSnapshotProviderProxy|null {
    return this.callFactoryMethod(null, 'createNodesProvider', HeapSnapshotProviderProxy, filter);
  }

  createNodesProviderForClass(className: string, nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter):
      HeapSnapshotProviderProxy|null {
    return this.callFactoryMethod(
        null, 'createNodesProviderForClass', HeapSnapshotProviderProxy, className, nodeFilter);
  }

  allocationTracesTops(): Promise<HeapSnapshotModel.HeapSnapshotModel.SerializedAllocationNode[]> {
    return this.callMethodPromise('allocationTracesTops');
  }

  allocationNodeCallers(nodeId: number): Promise<HeapSnapshotModel.HeapSnapshotModel.AllocationNodeCallers> {
    return this.callMethodPromise('allocationNodeCallers', nodeId);
  }

  allocationStack(nodeIndex: number): Promise<HeapSnapshotModel.HeapSnapshotModel.AllocationStackFrame[]|null> {
    return this.callMethodPromise('allocationStack', nodeIndex);
  }

  dispose(): void {
    throw new Error('Should never be called');
  }

  get nodeCount(): number {
    if (!this.staticData) {
      return 0;
    }
    return this.staticData.nodeCount;
  }

  get rootNodeIndex(): number {
    if (!this.staticData) {
      return 0;
    }
    return this.staticData.rootNodeIndex;
  }

  async updateStaticData(): Promise<void> {
    this.staticData = await this.callMethodPromise('updateStaticData');
  }

  getStatistics(): Promise<HeapSnapshotModel.HeapSnapshotModel.Statistics> {
    return this.callMethodPromise('getStatistics');
  }

  getLocation(nodeIndex: number): Promise<HeapSnapshotModel.HeapSnapshotModel.Location|null> {
    return this.callMethodPromise('getLocation', nodeIndex);
  }

  getSamples(): Promise<HeapSnapshotModel.HeapSnapshotModel.Samples|null> {
    return this.callMethodPromise('getSamples');
  }

  get totalSize(): number {
    if (!this.staticData) {
      return 0;
    }
    return this.staticData.totalSize;
  }

  get uid(): string|undefined {
    return this.profileUid;
  }

  setProfileUid(profileUid: string): void {
    this.profileUid = profileUid;
  }

  maxJSObjectId(): number {
    if (!this.staticData) {
      return 0;
    }
    return this.staticData.maxJSObjectId;
  }
}

export class HeapSnapshotProviderProxy extends HeapSnapshotProxyObject implements ChildrenProvider {
  constructor(worker: HeapSnapshotWorkerProxy, objectId: number) {
    super(worker, objectId);
  }

  nodePosition(snapshotObjectId: number): Promise<number> {
    return this.callMethodPromise('nodePosition', snapshotObjectId);
  }

  isEmpty(): Promise<boolean> {
    return this.callMethodPromise('isEmpty');
  }

  serializeItemsRange(startPosition: number, endPosition: number):
      Promise<HeapSnapshotModel.HeapSnapshotModel.ItemsRange> {
    return this.callMethodPromise('serializeItemsRange', startPosition, endPosition);
  }

  async sortAndRewind(comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig): Promise<void> {
    await this.callMethodPromise('sortAndRewind', comparator);
  }
}
