// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export const HeapSnapshotProgressEvent = {
    Update: 'ProgressUpdate',
    BrokenSnapshot: 'BrokenSnapshot',
};
export const baseSystemDistance = 100000000;
export const baseUnreachableDistance = baseSystemDistance * 2;
export class AllocationNodeCallers {
    nodesWithSingleCaller;
    branchingCallers;
    constructor(nodesWithSingleCaller, branchingCallers) {
        this.nodesWithSingleCaller = nodesWithSingleCaller;
        this.branchingCallers = branchingCallers;
    }
}
export class SerializedAllocationNode {
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
}
export class AllocationStackFrame {
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
}
export class Node {
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
}
export class Edge {
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
}
export class Aggregate {
    count;
    distance;
    self;
    maxRet;
    name;
    idxs;
}
export class AggregateForDiff {
    name;
    indexes;
    ids;
    selfSizes;
    constructor() {
        this.name = '';
        this.indexes = [];
        this.ids = [];
        this.selfSizes = [];
    }
}
export class Diff {
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
}
export class DiffForClass {
    name;
    addedCount;
    removedCount;
    addedSize;
    removedSize;
    deletedIndexes;
    addedIndexes;
    countDelta;
    sizeDelta;
}
export class ComparatorConfig {
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
}
export class WorkerCommand {
    callId;
    disposition;
    objectId;
    newObjectId;
    methodName;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    methodArguments;
    source;
}
export class ItemsRange {
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
}
export class StaticData {
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
}
export class NodeFilter {
    minNodeId;
    maxNodeId;
    allocationNodeId;
    filterName;
    constructor(minNodeId, maxNodeId) {
        this.minNodeId = minNodeId;
        this.maxNodeId = maxNodeId;
    }
    equals(o) {
        return this.minNodeId === o.minNodeId && this.maxNodeId === o.maxNodeId &&
            this.allocationNodeId === o.allocationNodeId && this.filterName === o.filterName;
    }
}
export class SearchConfig {
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
        throw new Error('Unsupported operation on search config');
    }
}
export class Samples {
    timestamps;
    lastAssignedIds;
    sizes;
    constructor(timestamps, lastAssignedIds, sizes) {
        this.timestamps = timestamps;
        this.lastAssignedIds = lastAssignedIds;
        this.sizes = sizes;
    }
}
export class Location {
    scriptId;
    lineNumber;
    columnNumber;
    constructor(scriptId, lineNumber, columnNumber) {
        this.scriptId = scriptId;
        this.lineNumber = lineNumber;
        this.columnNumber = columnNumber;
    }
}
//# sourceMappingURL=HeapSnapshotModel.js.map