var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/heap_snapshot_model/HeapSnapshotModel.js
var HeapSnapshotModel_exports = {};
__export(HeapSnapshotModel_exports, {
  Aggregate: () => Aggregate,
  AggregateForDiff: () => AggregateForDiff,
  AllocationNodeCallers: () => AllocationNodeCallers,
  AllocationStackFrame: () => AllocationStackFrame,
  ComparatorConfig: () => ComparatorConfig,
  Diff: () => Diff,
  DiffForClass: () => DiffForClass,
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
  WorkerCommand: () => WorkerCommand,
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
  canBeQueried;
  detachedDOMTreeNode;
  isAddedNotRemoved;
  ignored;
  constructor(id, name, distance, nodeIndex, retainedSize, selfSize, type) {
    this.id = id;
    this.name = name;
    this.distance = distance;
    this.nodeIndex = nodeIndex;
    this.retainedSize = retainedSize;
    this.selfSize = selfSize;
    this.type = type;
    this.canBeQueried = false;
    this.detachedDOMTreeNode = false;
    this.isAddedNotRemoved = null;
    this.ignored = false;
  }
};
var Edge = class {
  name;
  node;
  type;
  edgeIndex;
  isAddedNotRemoved;
  constructor(name, node, type, edgeIndex) {
    this.name = name;
    this.node = node;
    this.type = type;
    this.edgeIndex = edgeIndex;
    this.isAddedNotRemoved = null;
  }
};
var Aggregate = class {
  count;
  distance;
  self;
  maxRet;
  name;
  idxs;
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
  addedCount;
  removedCount;
  addedSize;
  removedSize;
  deletedIndexes;
  addedIndexes;
  countDelta;
  sizeDelta;
  constructor(name) {
    this.name = name;
    this.addedCount = 0;
    this.removedCount = 0;
    this.addedSize = 0;
    this.removedSize = 0;
    this.deletedIndexes = [];
    this.addedIndexes = [];
  }
};
var DiffForClass = class {
  name;
  addedCount;
  removedCount;
  addedSize;
  removedSize;
  deletedIndexes;
  addedIndexes;
  countDelta;
  sizeDelta;
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
var WorkerCommand = class {
  callId;
  disposition;
  objectId;
  newObjectId;
  methodName;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methodArguments;
  source;
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
export {
  HeapSnapshotModel_exports as HeapSnapshotModel
};
//# sourceMappingURL=heap_snapshot_model.js.map
