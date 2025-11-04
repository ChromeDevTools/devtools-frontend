// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Text in Heap Snapshot Proxy of a profiler tool
     * @example {functionName} PH1
     */
    anErrorOccurredWhenACallToMethod: 'An error occurred when a call to method \'\'{PH1}\'\' was requested',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapSnapshotProxy.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class HeapSnapshotWorkerProxy extends Common.ObjectWrapper.ObjectWrapper {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventHandler;
    nextObjectId;
    nextCallId;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callbacks;
    previousCallbacks;
    worker;
    interval;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(eventHandler) {
        super();
        this.eventHandler = eventHandler;
        this.nextObjectId = 1;
        this.nextCallId = 1;
        this.callbacks = new Map();
        this.previousCallbacks = new Set();
        this.worker = Common.Worker.WorkerWrapper.fromURL(new URL('../../entrypoints/heap_snapshot_worker/heap_snapshot_worker-entrypoint.js', import.meta.url));
        this.worker.onmessage = this.messageReceived.bind(this);
    }
    createLoader(profileUid, snapshotReceivedCallback) {
        const objectId = this.nextObjectId++;
        const proxy = new HeapSnapshotLoaderProxy(this, objectId, profileUid, snapshotReceivedCallback);
        this.postMessage({
            callId: this.nextCallId++,
            disposition: 'createLoader',
            objectId,
        });
        return proxy;
    }
    dispose() {
        this.worker.terminate();
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
    disposeObject(objectId) {
        this.postMessage({ callId: this.nextCallId++, disposition: 'dispose', objectId });
    }
    evaluateForTest(script, callback) {
        const callId = this.nextCallId++;
        this.callbacks.set(callId, callback);
        this.postMessage({ callId, disposition: 'evaluateForTest', source: script });
    }
    callFactoryMethod(callback, objectId, methodName, proxyConstructor, transfer, ...methodArguments) {
        const callId = this.nextCallId++;
        const newObjectId = this.nextObjectId++;
        if (callback) {
            this.callbacks.set(callId, remoteResult => {
                callback(remoteResult ? new proxyConstructor(this, newObjectId) : null);
            });
            this.postMessage({
                callId,
                disposition: 'factory',
                objectId,
                methodName,
                methodArguments,
                newObjectId,
            }, transfer);
            return null;
        }
        this.postMessage({
            callId,
            disposition: 'factory',
            objectId,
            methodName,
            methodArguments,
            newObjectId,
        }, transfer);
        return new proxyConstructor(this, newObjectId);
    }
    callMethod(callback, objectId, methodName, ...methodArguments) {
        const callId = this.nextCallId++;
        if (callback) {
            this.callbacks.set(callId, callback);
        }
        this.postMessage({
            callId,
            disposition: 'method',
            objectId,
            methodName,
            methodArguments,
        });
    }
    startCheckingForLongRunningCalls() {
        if (this.interval) {
            return;
        }
        this.checkLongRunningCalls();
        this.interval = window.setInterval(this.checkLongRunningCalls.bind(this), 300);
    }
    checkLongRunningCalls() {
        for (const callId of this.previousCallbacks) {
            if (!this.callbacks.has(callId)) {
                this.previousCallbacks.delete(callId);
            }
        }
        const hasLongRunningCalls = Boolean(this.previousCallbacks.size);
        this.dispatchEventToListeners("Wait" /* HeapSnapshotWorkerProxy.Events.WAIT */, hasLongRunningCalls);
        for (const callId of this.callbacks.keys()) {
            this.previousCallbacks.add(callId);
        }
    }
    setupForSecondaryInit(port) {
        const callId = this.nextCallId++;
        const done = new Promise(resolve => {
            this.callbacks.set(callId, resolve);
        });
        this.postMessage({
            callId,
            disposition: 'setupForSecondaryInit',
            objectId: this.nextObjectId++,
        }, [port]);
        return done;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageReceived(event) {
        const data = event.data;
        if (data.eventName) {
            if (this.eventHandler) {
                this.eventHandler(data.eventName, data.data);
            }
            return;
        }
        if (data.error) {
            if (data.errorMethodName) {
                Common.Console.Console.instance().error(i18nString(UIStrings.anErrorOccurredWhenACallToMethod, { PH1: data.errorMethodName }));
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
    postMessage(message, transfer) {
        this.worker.postMessage(message, transfer);
    }
}
export class HeapSnapshotProxyObject {
    worker;
    objectId;
    constructor(worker, objectId) {
        this.worker = worker;
        this.objectId = objectId;
    }
    dispose() {
        this.worker.disposeObject(this.objectId);
    }
    callFactoryMethod(methodName, proxyConstructor, ...args) {
        return this.worker.callFactoryMethod(null, String(this.objectId), methodName, proxyConstructor, [], ...args);
    }
    callFactoryMethodPromise(methodName, proxyConstructor, transfer, ...args) {
        return new Promise(resolve => this.worker.callFactoryMethod(resolve, String(this.objectId), methodName, proxyConstructor, transfer, ...args));
    }
    callMethodPromise(methodName, ...args) {
        return new Promise(resolve => this.worker.callMethod(resolve, String(this.objectId), methodName, ...args));
    }
}
export class HeapSnapshotLoaderProxy extends HeapSnapshotProxyObject {
    profileUid;
    snapshotReceivedCallback;
    constructor(worker, objectId, profileUid, snapshotReceivedCallback) {
        super(worker, objectId);
        this.profileUid = profileUid;
        this.snapshotReceivedCallback = snapshotReceivedCallback;
    }
    async write(chunk) {
        await this.callMethodPromise('write', chunk);
    }
    async close() {
        await this.callMethodPromise('close');
        const secondWorker = new HeapSnapshotWorkerProxy(() => { });
        const channel = new MessageChannel();
        await secondWorker.setupForSecondaryInit(channel.port2);
        const snapshotProxy = await this.callFactoryMethodPromise('buildSnapshot', HeapSnapshotProxy, [channel.port1]);
        secondWorker.dispose();
        this.dispose();
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // @ts-expect-error
        snapshotProxy.setProfileUid(this.profileUid);
        await snapshotProxy.updateStaticData();
        this.snapshotReceivedCallback(snapshotProxy);
    }
}
export class HeapSnapshotProxy extends HeapSnapshotProxyObject {
    staticData;
    profileUid;
    constructor(worker, objectId) {
        super(worker, objectId);
        this.staticData = null;
    }
    search(searchConfig, filter) {
        return this.callMethodPromise('search', searchConfig, filter);
    }
    interfaceDefinitions() {
        return this.callMethodPromise('interfaceDefinitions');
    }
    aggregatesWithFilter(filter) {
        return this.callMethodPromise('aggregatesWithFilter', filter);
    }
    aggregatesForDiff(interfaceDefinitions) {
        return this.callMethodPromise('aggregatesForDiff', interfaceDefinitions);
    }
    calculateSnapshotDiff(baseSnapshotId, baseSnapshotAggregates) {
        return this.callMethodPromise('calculateSnapshotDiff', baseSnapshotId, baseSnapshotAggregates);
    }
    nodeClassKey(snapshotObjectId) {
        return this.callMethodPromise('nodeClassKey', snapshotObjectId);
    }
    createEdgesProvider(nodeIndex) {
        return this.callFactoryMethod('createEdgesProvider', HeapSnapshotProviderProxy, nodeIndex);
    }
    createRetainingEdgesProvider(nodeIndex) {
        return this.callFactoryMethod('createRetainingEdgesProvider', HeapSnapshotProviderProxy, nodeIndex);
    }
    createAddedNodesProvider(baseSnapshotId, classKey) {
        return this.callFactoryMethod('createAddedNodesProvider', HeapSnapshotProviderProxy, baseSnapshotId, classKey);
    }
    createDeletedNodesProvider(nodeIndexes) {
        return this.callFactoryMethod('createDeletedNodesProvider', HeapSnapshotProviderProxy, nodeIndexes);
    }
    createNodesProvider(filter) {
        return this.callFactoryMethod('createNodesProvider', HeapSnapshotProviderProxy, filter);
    }
    createNodesProviderForClass(classKey, nodeFilter) {
        return this.callFactoryMethod('createNodesProviderForClass', HeapSnapshotProviderProxy, classKey, nodeFilter);
    }
    allocationTracesTops() {
        return this.callMethodPromise('allocationTracesTops');
    }
    allocationNodeCallers(nodeId) {
        return this.callMethodPromise('allocationNodeCallers', nodeId);
    }
    allocationStack(nodeIndex) {
        return this.callMethodPromise('allocationStack', nodeIndex);
    }
    dispose() {
        throw new Error('Should never be called');
    }
    get nodeCount() {
        if (!this.staticData) {
            return 0;
        }
        return this.staticData.nodeCount;
    }
    get rootNodeIndex() {
        if (!this.staticData) {
            return 0;
        }
        return this.staticData.rootNodeIndex;
    }
    async updateStaticData() {
        this.staticData = await this.callMethodPromise('updateStaticData');
    }
    getStatistics() {
        return this.callMethodPromise('getStatistics');
    }
    getLocation(nodeIndex) {
        return this.callMethodPromise('getLocation', nodeIndex);
    }
    getSamples() {
        return this.callMethodPromise('getSamples');
    }
    ignoreNodeInRetainersView(nodeIndex) {
        return this.callMethodPromise('ignoreNodeInRetainersView', nodeIndex);
    }
    unignoreNodeInRetainersView(nodeIndex) {
        return this.callMethodPromise('unignoreNodeInRetainersView', nodeIndex);
    }
    unignoreAllNodesInRetainersView() {
        return this.callMethodPromise('unignoreAllNodesInRetainersView');
    }
    areNodesIgnoredInRetainersView() {
        return this.callMethodPromise('areNodesIgnoredInRetainersView');
    }
    get totalSize() {
        if (!this.staticData) {
            return 0;
        }
        return this.staticData.totalSize;
    }
    get uid() {
        return this.profileUid;
    }
    setProfileUid(profileUid) {
        this.profileUid = profileUid;
    }
    maxJSObjectId() {
        if (!this.staticData) {
            return 0;
        }
        return this.staticData.maxJSObjectId;
    }
}
export class HeapSnapshotProviderProxy extends HeapSnapshotProxyObject {
    nodePosition(snapshotObjectId) {
        return this.callMethodPromise('nodePosition', snapshotObjectId);
    }
    isEmpty() {
        return this.callMethodPromise('isEmpty');
    }
    serializeItemsRange(startPosition, endPosition) {
        return this.callMethodPromise('serializeItemsRange', startPosition, endPosition);
    }
    async sortAndRewind(comparator) {
        await this.callMethodPromise('sortAndRewind', comparator);
    }
}
//# sourceMappingURL=HeapSnapshotProxy.js.map