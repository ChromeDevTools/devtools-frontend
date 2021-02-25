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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import type * as HeapSnapshotModel from '../heap_snapshot_model/heap_snapshot_model.js';
import * as i18n from '../i18n/i18n.js';
import type {ChildrenProvider} from './ChildrenProvider.js';

export const UIStrings = {
  /**
  *@description Text in Heap Snapshot Proxy of a profiler tool
  *@example {functionName} PH1
  */
  anErrorOccurredWhenACallToMethod: 'An error occurred when a call to method \'{PH1}\' was requested',
};
const str_ = i18n.i18n.registerUIStrings('profiler/HeapSnapshotProxy.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class HeapSnapshotWorkerProxy extends Common.ObjectWrapper.ObjectWrapper {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _eventHandler: (arg0: string, arg1: any) => void;
  _nextObjectId: number;
  _nextCallId: number;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _callbacks: Map<number, (arg0: any) => void>;
  _previousCallbacks: Set<number>;
  _worker: Common.Worker.WorkerWrapper;
  _interval?: number;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(eventHandler: (arg0: string, arg1: any) => void) {
    super();
    this._eventHandler = eventHandler;
    this._nextObjectId = 1;
    this._nextCallId = 1;
    this._callbacks = new Map();
    this._previousCallbacks = new Set();
    // We use the legacy file here, as below we postMessage and expect certain objects to be
    // defined on the global scope. Ideally we use some sort of import-export mechanism across
    // worker boundaries, but that requires a partial rewrite of the heap_snapshot_worker.
    this._worker = Common.Worker.WorkerWrapper.fromURL(
        new URL('../heap_snapshot_worker/heap_snapshot_worker-legacy.js', import.meta.url));
    this._worker.onmessage = this._messageReceived.bind(this);
  }

  createLoader(profileUid: number, snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void):
      HeapSnapshotLoaderProxy {
    const objectId = this._nextObjectId++;
    const proxy = new HeapSnapshotLoaderProxy(this, objectId, profileUid, snapshotReceivedCallback);
    this._postMessage({
      callId: this._nextCallId++,
      disposition: 'create',
      objectId: objectId,
      methodName: 'HeapSnapshotWorker.HeapSnapshotLoader',
    });
    return proxy;
  }

  dispose(): void {
    this._worker.terminate();
    if (this._interval) {
      clearInterval(this._interval);
    }
  }

  disposeObject(objectId: number): void {
    this._postMessage({callId: this._nextCallId++, disposition: 'dispose', objectId: objectId});
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluateForTest(script: string, callback: (arg0: any) => void): void {
    const callId = this._nextCallId++;
    this._callbacks.set(callId, callback);
    this._postMessage({callId: callId, disposition: 'evaluateForTest', source: script});
  }

  callFactoryMethod<T>(
      callback: ((...arg0: unknown[]) => void)|null, objectId: string, methodName: string,
      proxyConstructor: new(...arg1: unknown[]) => T): Object|null {
    const callId = this._nextCallId++;
    const methodArguments = Array.prototype.slice.call(arguments, 4);
    const newObjectId = this._nextObjectId++;

    if (callback) {
      this._callbacks.set(callId, remoteResult => {
        callback(remoteResult ? new proxyConstructor(this, newObjectId) : null);
      });
      this._postMessage({
        callId: callId,
        disposition: 'factory',
        objectId: objectId,
        methodName: methodName,
        methodArguments: methodArguments,
        newObjectId: newObjectId,
      });
      return null;
    }
    this._postMessage({
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
    const callId = this._nextCallId++;
    const methodArguments = Array.prototype.slice.call(arguments, 3);
    if (callback) {
      this._callbacks.set(callId, callback);
    }
    this._postMessage({
      callId: callId,
      disposition: 'method',
      objectId: objectId,
      methodName: methodName,
      methodArguments: methodArguments,
    });
  }

  startCheckingForLongRunningCalls(): void {
    if (this._interval) {
      return;
    }
    this._checkLongRunningCalls();
    this._interval = window.setInterval(this._checkLongRunningCalls.bind(this), 300);
  }

  _checkLongRunningCalls(): void {
    for (const callId of this._previousCallbacks) {
      if (!this._callbacks.has(callId)) {
        this._previousCallbacks.delete(callId);
      }
    }
    const hasLongRunningCalls = Boolean(this._previousCallbacks.size);
    this.dispatchEventToListeners(HeapSnapshotWorkerProxy.Events.Wait, hasLongRunningCalls);
    for (const callId of this._callbacks.keys()) {
      this._previousCallbacks.add(callId);
    }
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _messageReceived(event: MessageEvent<any>): void {
    const data = event.data;
    if (data.eventName) {
      if (this._eventHandler) {
        this._eventHandler(data.eventName, data.data);
      }
      return;
    }
    if (data.error) {
      if (data.errorMethodName) {
        Common.Console.Console.instance().error(
            i18nString(UIStrings.anErrorOccurredWhenACallToMethod, {PH1: data.errorMethodName}));
      }
      Common.Console.Console.instance().error(data['errorCallStack']);
      this._callbacks.delete(data.callId);
      return;
    }
    const callback = this._callbacks.get(data.callId);
    if (!callback) {
      return;
    }
    this._callbacks.delete(data.callId);
    callback(data.result);
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _postMessage(message: any): void {
    this._worker.postMessage(message);
  }
}

export namespace HeapSnapshotWorkerProxy {
  export const enum Events {
    Wait = 'Wait',
  }
}

export class HeapSnapshotProxyObject {
  _worker: HeapSnapshotWorkerProxy;
  _objectId: number;
  constructor(worker: HeapSnapshotWorkerProxy, objectId: number) {
    this._worker = worker;
    this._objectId = objectId;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _callWorker(workerMethodName: string, args: any[]): any {
    args.splice(1, 0, this._objectId);
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const worker = (this._worker as any)[workerMethodName];
    if (!worker) {
      throw new Error(`Could not find worker with name ${workerMethodName}.`);
    }
    return worker.apply(this._worker, args);
  }

  dispose(): void {
    this._worker.disposeObject(this._objectId);
  }

  disposeWorker(): void {
    this._worker.dispose();
  }

  callFactoryMethod<T>(
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _callback: ((...arg0: any[]) => void)|null, _methodName: string, _proxyConstructor: new(...arg1: any[]) => T,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/naming-convention
      ..._var_args: any[]): T {
    return this._callWorker('callFactoryMethod', Array.prototype.slice.call(arguments, 0));
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/naming-convention
  _callMethodPromise<T>(_methodName: string, ..._var_args: any[]): Promise<T> {
    const args = Array.prototype.slice.call(arguments);
    return new Promise(resolve => this._callWorker('callMethod', [resolve, ...args]));
  }
}

export class HeapSnapshotLoaderProxy extends HeapSnapshotProxyObject implements Common.StringOutputStream.OutputStream {
  _profileUid: number;
  _snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void;
  constructor(
      worker: HeapSnapshotWorkerProxy, objectId: number, profileUid: number,
      snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void) {
    super(worker, objectId);
    this._profileUid = profileUid;
    this._snapshotReceivedCallback = snapshotReceivedCallback;
  }

  async write(chunk: string): Promise<void> {
    await this._callMethodPromise('write', chunk);
  }

  async close(): Promise<void> {
    await this._callMethodPromise('close');
    const snapshotProxy = await new Promise<HeapSnapshotProxy>(
        resolve => this.callFactoryMethod(resolve, 'buildSnapshot', HeapSnapshotProxy));
    this.dispose();
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-expect-error
    snapshotProxy.setProfileUid(this._profileUid);
    await snapshotProxy.updateStaticData();
    this._snapshotReceivedCallback(snapshotProxy);
  }
}

export class HeapSnapshotProxy extends HeapSnapshotProxyObject {
  _staticData: HeapSnapshotModel.HeapSnapshotModel.StaticData|null;
  _profileUid?: string;

  constructor(worker: HeapSnapshotWorkerProxy, objectId: number) {
    super(worker, objectId);
    this._staticData = null;
  }

  search(
      searchConfig: HeapSnapshotModel.HeapSnapshotModel.SearchConfig,
      filter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): Promise<number[]> {
    return this._callMethodPromise('search', searchConfig, filter);
  }

  aggregatesWithFilter(filter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): Promise<{
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate,
  }> {
    return this._callMethodPromise('aggregatesWithFilter', filter);
  }

  aggregatesForDiff(): Promise<{
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff,
  }> {
    return this._callMethodPromise('aggregatesForDiff');
  }

  calculateSnapshotDiff(baseSnapshotId: string, baseSnapshotAggregates: {
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff,
  }): Promise<{
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff,
  }> {
    return this._callMethodPromise('calculateSnapshotDiff', baseSnapshotId, baseSnapshotAggregates);
  }

  nodeClassName(snapshotObjectId: number): Promise<string|null> {
    return this._callMethodPromise('nodeClassName', snapshotObjectId);
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
    return this._callMethodPromise('allocationTracesTops');
  }

  allocationNodeCallers(nodeId: number): Promise<HeapSnapshotModel.HeapSnapshotModel.AllocationNodeCallers> {
    return this._callMethodPromise('allocationNodeCallers', nodeId);
  }

  allocationStack(nodeIndex: number): Promise<HeapSnapshotModel.HeapSnapshotModel.AllocationStackFrame[]|null> {
    return this._callMethodPromise('allocationStack', nodeIndex);
  }

  dispose(): void {
    throw new Error('Should never be called');
  }

  get nodeCount(): number {
    if (!this._staticData) {
      return 0;
    }
    return this._staticData.nodeCount;
  }

  get rootNodeIndex(): number {
    if (!this._staticData) {
      return 0;
    }
    return this._staticData.rootNodeIndex;
  }

  async updateStaticData(): Promise<void> {
    this._staticData = await this._callMethodPromise('updateStaticData');
  }

  getStatistics(): Promise<HeapSnapshotModel.HeapSnapshotModel.Statistics> {
    return this._callMethodPromise('getStatistics');
  }

  getLocation(nodeIndex: number): Promise<HeapSnapshotModel.HeapSnapshotModel.Location|null> {
    return this._callMethodPromise('getLocation', nodeIndex);
  }

  getSamples(): Promise<HeapSnapshotModel.HeapSnapshotModel.Samples|null> {
    return this._callMethodPromise('getSamples');
  }

  get totalSize(): number {
    if (!this._staticData) {
      return 0;
    }
    return this._staticData.totalSize;
  }

  get uid(): string|undefined {
    return this._profileUid;
  }

  setProfileUid(profileUid: string): void {
    this._profileUid = profileUid;
  }

  maxJSObjectId(): number {
    if (!this._staticData) {
      return 0;
    }
    return this._staticData.maxJSObjectId;
  }
}

export class HeapSnapshotProviderProxy extends HeapSnapshotProxyObject implements ChildrenProvider {
  constructor(worker: HeapSnapshotWorkerProxy, objectId: number) {
    super(worker, objectId);
  }

  nodePosition(snapshotObjectId: number): Promise<number> {
    return this._callMethodPromise('nodePosition', snapshotObjectId);
  }

  isEmpty(): Promise<boolean> {
    return this._callMethodPromise('isEmpty');
  }

  serializeItemsRange(startPosition: number, endPosition: number):
      Promise<HeapSnapshotModel.HeapSnapshotModel.ItemsRange> {
    return this._callMethodPromise('serializeItemsRange', startPosition, endPosition);
  }

  async sortAndRewind(comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig): Promise<void> {
    await this._callMethodPromise('sortAndRewind', comparator);
  }
}
