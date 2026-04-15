var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/heap_snapshot/ChildrenProvider.js
var ChildrenProvider_exports = {};

// gen/front_end/models/heap_snapshot/HeapSnapshotModel.js
var HeapSnapshotModel_exports = {};
__export(HeapSnapshotModel_exports, {
  AggregateForDiff: () => AggregateForDiff,
  AllocationNodeCallers: () => AllocationNodeCallers,
  AllocationStackFrame: () => AllocationStackFrame,
  ComparatorConfig: () => ComparatorConfig,
  Diff: () => Diff,
  Edge: () => Edge,
  HeapSnapshotProgressEvent: () => HeapSnapshotProgressEvent,
  ItemsRange: () => ItemsRange,
  Location: () => Location,
  Node: () => Node,
  NodeFilter: () => NodeFilter,
  Samples: () => Samples,
  SearchConfig: () => SearchConfig,
  SerializedAllocationNode: () => SerializedAllocationNode,
  StaticData: () => StaticData,
  baseSystemDistance: () => baseSystemDistance,
  baseUnreachableDistance: () => baseUnreachableDistance
});
var HeapSnapshotProgressEvent = {
  Update: "ProgressUpdate",
  BrokenSnapshot: "BrokenSnapshot"
};
var baseSystemDistance = 1e8;
var baseUnreachableDistance = baseSystemDistance * 2;
var AllocationNodeCallers = class {
  nodesWithSingleCaller;
  branchingCallers;
  constructor(nodesWithSingleCaller, branchingCallers) {
    this.nodesWithSingleCaller = nodesWithSingleCaller;
    this.branchingCallers = branchingCallers;
  }
};
var SerializedAllocationNode = class {
  id;
  name;
  scriptName;
  scriptId;
  line;
  column;
  count;
  size;
  liveCount;
  liveSize;
  hasChildren;
  constructor(nodeId, functionName, scriptName, scriptId, line, column, count, size, liveCount, liveSize, hasChildren) {
    this.id = nodeId;
    this.name = functionName;
    this.scriptName = scriptName;
    this.scriptId = scriptId;
    this.line = line;
    this.column = column;
    this.count = count;
    this.size = size;
    this.liveCount = liveCount;
    this.liveSize = liveSize;
    this.hasChildren = hasChildren;
  }
};
var AllocationStackFrame = class {
  functionName;
  scriptName;
  scriptId;
  line;
  column;
  constructor(functionName, scriptName, scriptId, line, column) {
    this.functionName = functionName;
    this.scriptName = scriptName;
    this.scriptId = scriptId;
    this.line = line;
    this.column = column;
  }
};
var Node = class {
  id;
  name;
  distance;
  nodeIndex;
  retainedSize;
  selfSize;
  type;
  canBeQueried = false;
  detachedDOMTreeNode = false;
  isAddedNotRemoved = null;
  ignored = false;
  constructor(id, name, distance, nodeIndex, retainedSize, selfSize, type) {
    this.id = id;
    this.name = name;
    this.distance = distance;
    this.nodeIndex = nodeIndex;
    this.retainedSize = retainedSize;
    this.selfSize = selfSize;
    this.type = type;
  }
};
var Edge = class {
  name;
  node;
  type;
  edgeIndex;
  isAddedNotRemoved = null;
  constructor(name, node, type, edgeIndex) {
    this.name = name;
    this.node = node;
    this.type = type;
    this.edgeIndex = edgeIndex;
  }
};
var AggregateForDiff = class {
  name;
  indexes;
  ids;
  selfSizes;
  constructor() {
    this.name = "";
    this.indexes = [];
    this.ids = [];
    this.selfSizes = [];
  }
};
var Diff = class {
  name;
  addedCount = 0;
  removedCount = 0;
  addedSize = 0;
  removedSize = 0;
  deletedIndexes = [];
  addedIndexes = [];
  countDelta;
  sizeDelta;
  constructor(name) {
    this.name = name;
  }
};
var ComparatorConfig = class {
  fieldName1;
  ascending1;
  fieldName2;
  ascending2;
  constructor(fieldName1, ascending1, fieldName2, ascending2) {
    this.fieldName1 = fieldName1;
    this.ascending1 = ascending1;
    this.fieldName2 = fieldName2;
    this.ascending2 = ascending2;
  }
};
var ItemsRange = class {
  startPosition;
  endPosition;
  totalLength;
  items;
  constructor(startPosition, endPosition, totalLength, items) {
    this.startPosition = startPosition;
    this.endPosition = endPosition;
    this.totalLength = totalLength;
    this.items = items;
  }
};
var StaticData = class {
  nodeCount;
  rootNodeIndex;
  totalSize;
  maxJSObjectId;
  constructor(nodeCount, rootNodeIndex, totalSize, maxJSObjectId) {
    this.nodeCount = nodeCount;
    this.rootNodeIndex = rootNodeIndex;
    this.totalSize = totalSize;
    this.maxJSObjectId = maxJSObjectId;
  }
};
var NodeFilter = class {
  minNodeId;
  maxNodeId;
  allocationNodeId;
  filterName;
  constructor(minNodeId, maxNodeId) {
    this.minNodeId = minNodeId;
    this.maxNodeId = maxNodeId;
  }
  equals(o) {
    return this.minNodeId === o.minNodeId && this.maxNodeId === o.maxNodeId && this.allocationNodeId === o.allocationNodeId && this.filterName === o.filterName;
  }
};
var SearchConfig = class {
  query;
  caseSensitive;
  wholeWord;
  isRegex;
  shouldJump;
  jumpBackward;
  constructor(query, caseSensitive, wholeWord, isRegex, shouldJump, jumpBackward) {
    this.query = query;
    this.caseSensitive = caseSensitive;
    this.wholeWord = wholeWord;
    this.isRegex = isRegex;
    this.shouldJump = shouldJump;
    this.jumpBackward = jumpBackward;
  }
  toSearchRegex(_global) {
    throw new Error("Unsupported operation on search config");
  }
};
var Samples = class {
  timestamps;
  lastAssignedIds;
  sizes;
  constructor(timestamps, lastAssignedIds, sizes) {
    this.timestamps = timestamps;
    this.lastAssignedIds = lastAssignedIds;
    this.sizes = sizes;
  }
};
var Location = class {
  scriptId;
  lineNumber;
  columnNumber;
  constructor(scriptId, lineNumber, columnNumber) {
    this.scriptId = scriptId;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }
};

// gen/front_end/models/heap_snapshot/HeapSnapshotProxy.js
var HeapSnapshotProxy_exports = {};
__export(HeapSnapshotProxy_exports, {
  HeapSnapshotLoaderProxy: () => HeapSnapshotLoaderProxy,
  HeapSnapshotProviderProxy: () => HeapSnapshotProviderProxy,
  HeapSnapshotProxy: () => HeapSnapshotProxy,
  HeapSnapshotProxyObject: () => HeapSnapshotProxyObject,
  HeapSnapshotWorkerProxy: () => HeapSnapshotWorkerProxy
});
import * as Common from "./../../core/common/common.js";
import * as Platform from "./../../core/platform/platform.js";
var HeapSnapshotWorkerProxy = class extends Common.ObjectWrapper.ObjectWrapper {
  eventHandler;
  nextObjectId = 1;
  nextCallId = 1;
  callbacks = /* @__PURE__ */ new Map();
  previousCallbacks = /* @__PURE__ */ new Set();
  worker;
  interval;
  workerUrl;
  constructor(eventHandler, workerUrl) {
    super();
    this.eventHandler = eventHandler;
    this.workerUrl = workerUrl;
    this.worker = Platform.HostRuntime.HOST_RUNTIME.createWorker(workerUrl ?? import.meta.resolve("../../entrypoints/heap_snapshot_worker/heap_snapshot_worker-entrypoint.js"));
    this.worker.onmessage = this.messageReceived.bind(this);
  }
  createLoader(profileUid, snapshotReceivedCallback) {
    const objectId = this.nextObjectId++;
    const proxy = new HeapSnapshotLoaderProxy(this, objectId, profileUid, snapshotReceivedCallback);
    this.postMessage({
      callId: this.nextCallId++,
      disposition: "createLoader",
      objectId
    });
    return proxy;
  }
  dispose() {
    this.worker.terminate();
    clearInterval(this.interval);
  }
  disposeObject(objectId) {
    this.postMessage({ callId: this.nextCallId++, disposition: "dispose", objectId });
  }
  evaluateForTest(script, callback) {
    const callId = this.nextCallId++;
    this.callbacks.set(callId, callback);
    this.postMessage({ callId, disposition: "evaluateForTest", source: script });
  }
  callFactoryMethod(callback, objectId, methodName, proxyConstructor, transfer, ...methodArguments) {
    const callId = this.nextCallId++;
    const newObjectId = this.nextObjectId++;
    if (callback) {
      this.callbacks.set(callId, (remoteResult) => {
        callback(remoteResult ? new proxyConstructor(this, newObjectId) : null);
      });
      this.postMessage({
        callId,
        disposition: "factory",
        objectId,
        methodName,
        methodArguments,
        newObjectId
      }, transfer);
      return null;
    }
    this.postMessage({
      callId,
      disposition: "factory",
      objectId,
      methodName,
      methodArguments,
      newObjectId
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
      disposition: "method",
      objectId,
      methodName,
      methodArguments
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
    this.dispatchEventToListeners("Wait", hasLongRunningCalls);
    for (const callId of this.callbacks.keys()) {
      this.previousCallbacks.add(callId);
    }
  }
  setupForSecondaryInit(port) {
    const callId = this.nextCallId++;
    const done = new Promise((resolve) => {
      this.callbacks.set(callId, resolve);
    });
    this.postMessage({
      callId,
      disposition: "setupForSecondaryInit",
      objectId: this.nextObjectId++
    }, [port]);
    return done;
  }
  messageReceived(event) {
    const data = event.data;
    if (data.eventName) {
      if (this.eventHandler) {
        this.eventHandler(data.eventName, data.data);
      }
      return;
    }
    if (data.error) {
      Common.Console.Console.instance().error(`An error occurred when a call to method '${data.errorMethodName}' was requested`);
      Common.Console.Console.instance().error(data["errorCallStack"]);
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
  postMessage(message, transfer) {
    this.worker.postMessage(message, transfer);
  }
};
var HeapSnapshotProxyObject = class {
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
    return new Promise((resolve) => this.worker.callFactoryMethod(resolve, String(this.objectId), methodName, proxyConstructor, transfer, ...args));
  }
  callMethodPromise(methodName, ...args) {
    return new Promise((resolve) => this.worker.callMethod(resolve, String(this.objectId), methodName, ...args));
  }
};
var HeapSnapshotLoaderProxy = class extends HeapSnapshotProxyObject {
  profileUid;
  snapshotReceivedCallback;
  constructor(worker, objectId, profileUid, snapshotReceivedCallback) {
    super(worker, objectId);
    this.profileUid = profileUid;
    this.snapshotReceivedCallback = snapshotReceivedCallback;
  }
  async write(chunk) {
    await this.callMethodPromise("write", chunk);
  }
  async close() {
    await this.callMethodPromise("close");
    const secondWorker = new HeapSnapshotWorkerProxy(() => {
    }, this.worker.workerUrl);
    const channel = new MessageChannel();
    await secondWorker.setupForSecondaryInit(channel.port2);
    const snapshotProxy = await this.callFactoryMethodPromise("buildSnapshot", HeapSnapshotProxy, [channel.port1]);
    secondWorker.dispose();
    this.dispose();
    snapshotProxy.setProfileUid(this.profileUid);
    await snapshotProxy.updateStaticData();
    this.snapshotReceivedCallback(snapshotProxy);
  }
};
var HeapSnapshotProxy = class extends HeapSnapshotProxyObject {
  staticData;
  profileUid;
  constructor(worker, objectId) {
    super(worker, objectId);
    this.staticData = null;
  }
  search(searchConfig, filter) {
    return this.callMethodPromise("search", searchConfig, filter);
  }
  interfaceDefinitions() {
    return this.callMethodPromise("interfaceDefinitions");
  }
  aggregatesWithFilter(filter) {
    return this.callMethodPromise("aggregatesWithFilter", filter);
  }
  aggregatesForDiff(interfaceDefinitions) {
    return this.callMethodPromise("aggregatesForDiff", interfaceDefinitions);
  }
  calculateSnapshotDiff(baseSnapshotId, baseSnapshotAggregates) {
    return this.callMethodPromise("calculateSnapshotDiff", baseSnapshotId, baseSnapshotAggregates);
  }
  nodeClassKey(snapshotObjectId) {
    return this.callMethodPromise("nodeClassKey", snapshotObjectId);
  }
  createEdgesProvider(nodeIndex) {
    return this.callFactoryMethod("createEdgesProvider", HeapSnapshotProviderProxy, nodeIndex);
  }
  createRetainingEdgesProvider(nodeIndex) {
    return this.callFactoryMethod("createRetainingEdgesProvider", HeapSnapshotProviderProxy, nodeIndex);
  }
  createAddedNodesProvider(baseSnapshotId, classKey) {
    return this.callFactoryMethod("createAddedNodesProvider", HeapSnapshotProviderProxy, baseSnapshotId, classKey);
  }
  createDeletedNodesProvider(nodeIndexes) {
    return this.callFactoryMethod("createDeletedNodesProvider", HeapSnapshotProviderProxy, nodeIndexes);
  }
  createNodesProvider(filter) {
    return this.callFactoryMethod("createNodesProvider", HeapSnapshotProviderProxy, filter);
  }
  createNodesProviderForClass(classKey, nodeFilter) {
    return this.callFactoryMethod("createNodesProviderForClass", HeapSnapshotProviderProxy, classKey, nodeFilter);
  }
  allocationTracesTops() {
    return this.callMethodPromise("allocationTracesTops");
  }
  allocationNodeCallers(nodeId) {
    return this.callMethodPromise("allocationNodeCallers", nodeId);
  }
  allocationStack(nodeIndex) {
    return this.callMethodPromise("allocationStack", nodeIndex);
  }
  dispose() {
    throw new Error("Should never be called");
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
    this.staticData = await this.callMethodPromise("updateStaticData");
  }
  getStatistics() {
    return this.callMethodPromise("getStatistics");
  }
  getLocation(nodeIndex) {
    return this.callMethodPromise("getLocation", nodeIndex);
  }
  getSamples() {
    return this.callMethodPromise("getSamples");
  }
  ignoreNodeInRetainersView(nodeIndex) {
    return this.callMethodPromise("ignoreNodeInRetainersView", nodeIndex);
  }
  unignoreNodeInRetainersView(nodeIndex) {
    return this.callMethodPromise("unignoreNodeInRetainersView", nodeIndex);
  }
  unignoreAllNodesInRetainersView() {
    return this.callMethodPromise("unignoreAllNodesInRetainersView");
  }
  areNodesIgnoredInRetainersView() {
    return this.callMethodPromise("areNodesIgnoredInRetainersView");
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
};
var HeapSnapshotProviderProxy = class extends HeapSnapshotProxyObject {
  nodePosition(snapshotObjectId) {
    return this.callMethodPromise("nodePosition", snapshotObjectId);
  }
  isEmpty() {
    return this.callMethodPromise("isEmpty");
  }
  serializeItemsRange(startPosition, endPosition) {
    return this.callMethodPromise("serializeItemsRange", startPosition, endPosition);
  }
  async sortAndRewind(comparator) {
    await this.callMethodPromise("sortAndRewind", comparator);
  }
};
export {
  ChildrenProvider_exports as ChildrenProvider,
  HeapSnapshotModel_exports as HeapSnapshotModel,
  HeapSnapshotProxy_exports as HeapSnapshotProxy
};
//# sourceMappingURL=heap_snapshot.js.map
