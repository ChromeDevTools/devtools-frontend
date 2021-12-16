/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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

export const HeapSnapshotProgressEvent = {
  Update: 'ProgressUpdate',
  BrokenSnapshot: 'BrokenSnapshot',
};

export const baseSystemDistance = 100000000;

export class AllocationNodeCallers {
  nodesWithSingleCaller: SerializedAllocationNode[];
  branchingCallers: SerializedAllocationNode[];
  constructor(nodesWithSingleCaller: SerializedAllocationNode[], branchingCallers: SerializedAllocationNode[]) {
    this.nodesWithSingleCaller = nodesWithSingleCaller;
    this.branchingCallers = branchingCallers;
  }
}

export class SerializedAllocationNode {
  id: number;
  name: string;
  scriptName: string;
  scriptId: number;
  line: number;
  column: number;
  count: number;
  size: number;
  liveCount: number;
  liveSize: number;
  hasChildren: boolean;
  constructor(
      nodeId: number, functionName: string, scriptName: string, scriptId: number, line: number, column: number,
      count: number, size: number, liveCount: number, liveSize: number, hasChildren: boolean) {
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
  functionName: string;
  scriptName: string;
  scriptId: number;
  line: number;
  column: number;
  constructor(functionName: string, scriptName: string, scriptId: number, line: number, column: number) {
    this.functionName = functionName;
    this.scriptName = scriptName;
    this.scriptId = scriptId;
    this.line = line;
    this.column = column;
  }
}

export class Node {
  id: number;
  name: string;
  distance: number;
  nodeIndex: number;
  retainedSize: number;
  selfSize: number;
  type: string;
  canBeQueried: boolean;
  detachedDOMTreeNode: boolean;
  isAddedNotRemoved: boolean|null;
  constructor(
      id: number, name: string, distance: number, nodeIndex: number, retainedSize: number, selfSize: number,
      type: string) {
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
  }
}

export class Edge {
  name: string;
  node: Node;
  type: string;
  edgeIndex: number;
  isAddedNotRemoved: boolean|null;
  constructor(name: string, node: Node, type: string, edgeIndex: number) {
    this.name = name;
    this.node = node;
    this.type = type;
    this.edgeIndex = edgeIndex;
    this.isAddedNotRemoved = null;
  }
}

export class Aggregate {
  count!: number;
  distance!: number;
  self!: number;
  maxRet!: number;
  type!: number;
  name!: string;
  idxs!: number[];
  constructor() {
  }
}

export class AggregateForDiff {
  indexes: number[];
  ids: number[];
  selfSizes: number[];
  constructor() {
    this.indexes = [];
    this.ids = [];
    this.selfSizes = [];
  }
}

export class Diff {
  addedCount: number;
  removedCount: number;
  addedSize: number;
  removedSize: number;
  deletedIndexes: number[];
  addedIndexes: number[];
  countDelta!: number;
  sizeDelta!: number;
  constructor() {
    this.addedCount = 0;
    this.removedCount = 0;
    this.addedSize = 0;
    this.removedSize = 0;
    this.deletedIndexes = [];
    this.addedIndexes = [];
  }
}

export class DiffForClass {
  addedCount!: number;
  removedCount!: number;
  addedSize!: number;
  removedSize!: number;
  deletedIndexes!: number[];
  addedIndexes!: number[];
  countDelta!: number;
  sizeDelta!: number;
  constructor() {
  }
}

export class ComparatorConfig {
  fieldName1: string;
  ascending1: boolean;
  fieldName2: string;
  ascending2: boolean;
  constructor(fieldName1: string, ascending1: boolean, fieldName2: string, ascending2: boolean) {
    this.fieldName1 = fieldName1;
    this.ascending1 = ascending1;
    this.fieldName2 = fieldName2;
    this.ascending2 = ascending2;
  }
}

export class WorkerCommand {
  callId!: number;
  disposition!: string;
  objectId!: number;
  newObjectId!: number;
  methodName!: string;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methodArguments!: any[];
  source!: string;
  constructor() {
  }
}

export class ItemsRange {
  startPosition: number;
  endPosition: number;
  totalLength: number;
  items: (Node|Edge)[];
  constructor(startPosition: number, endPosition: number, totalLength: number, items: (Node|Edge)[]) {
    this.startPosition = startPosition;
    this.endPosition = endPosition;
    this.totalLength = totalLength;
    this.items = items;
  }
}

export class StaticData {
  nodeCount: number;
  rootNodeIndex: number;
  totalSize: number;
  maxJSObjectId: number;
  constructor(nodeCount: number, rootNodeIndex: number, totalSize: number, maxJSObjectId: number) {
    this.nodeCount = nodeCount;
    this.rootNodeIndex = rootNodeIndex;
    this.totalSize = totalSize;
    this.maxJSObjectId = maxJSObjectId;
  }
}

export class Statistics {
  total!: number;
  v8heap!: number;
  native!: number;
  code!: number;
  jsArrays!: number;
  strings!: number;
  system!: number;
  constructor() {
  }
}

export class NodeFilter {
  minNodeId: number|undefined;
  maxNodeId: number|undefined;
  allocationNodeId!: number|undefined;
  constructor(minNodeId?: number, maxNodeId?: number) {
    this.minNodeId = minNodeId;
    this.maxNodeId = maxNodeId;
  }

  equals(o: NodeFilter): boolean {
    return this.minNodeId === o.minNodeId && this.maxNodeId === o.maxNodeId &&
        this.allocationNodeId === o.allocationNodeId;
  }
}

export class SearchConfig {
  query: string;
  caseSensitive: boolean;
  isRegex: boolean;
  shouldJump: boolean;
  jumpBackward: boolean;
  constructor(query: string, caseSensitive: boolean, isRegex: boolean, shouldJump: boolean, jumpBackward: boolean) {
    this.query = query;
    this.caseSensitive = caseSensitive;
    this.isRegex = isRegex;
    this.shouldJump = shouldJump;
    this.jumpBackward = jumpBackward;
  }

  toSearchRegex(_global?: boolean): {regex: RegExp, fromQuery: boolean} {
    throw new Error('Unsupported operation on search config');
  }
}

export class Samples {
  timestamps: number[];
  lastAssignedIds: number[];
  sizes: number[];
  constructor(timestamps: number[], lastAssignedIds: number[], sizes: number[]) {
    this.timestamps = timestamps;
    this.lastAssignedIds = lastAssignedIds;
    this.sizes = sizes;
  }
}

export class Location {
  scriptId: number;
  lineNumber: number;
  columnNumber: number;
  constructor(scriptId: number, lineNumber: number, columnNumber: number) {
    this.scriptId = scriptId;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }
}
