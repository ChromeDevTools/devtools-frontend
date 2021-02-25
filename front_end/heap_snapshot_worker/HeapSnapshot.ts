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

import * as HeapSnapshotModel from '../heap_snapshot_model/heap_snapshot_model.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import {AllocationProfile} from './AllocationProfile.js';
import type {HeapSnapshotWorkerDispatcher} from './HeapSnapshotWorkerDispatcher.js';

/**
 * @interface
 */
export interface HeapSnapshotItem {
  itemIndex(): number;

  serialize(): Object;
}

export class HeapSnapshotEdge implements HeapSnapshotItem {
  _snapshot: HeapSnapshot;
  _edges: Uint32Array;
  edgeIndex: number;
  constructor(snapshot: HeapSnapshot, edgeIndex?: number) {
    this._snapshot = snapshot;
    this._edges = snapshot.containmentEdges;
    this.edgeIndex = edgeIndex || 0;
  }

  clone(): HeapSnapshotEdge {
    return new HeapSnapshotEdge(this._snapshot, this.edgeIndex);
  }

  hasStringName(): boolean {
    throw new Error('Not implemented');
  }

  name(): string {
    throw new Error('Not implemented');
  }

  node(): HeapSnapshotNode {
    return this._snapshot.createNode(this.nodeIndex());
  }

  nodeIndex(): number {
    if (typeof this._snapshot._edgeToNodeOffset === 'undefined') {
      throw new Error('edgeToNodeOffset is undefined');
    }

    return this._edges[this.edgeIndex + this._snapshot._edgeToNodeOffset];
  }

  toString(): string {
    return 'HeapSnapshotEdge: ' + this.name();
  }

  type(): string {
    return this._snapshot._edgeTypes[this.rawType()];
  }

  itemIndex(): number {
    return this.edgeIndex;
  }

  serialize(): HeapSnapshotModel.HeapSnapshotModel.Edge {
    return new HeapSnapshotModel.HeapSnapshotModel.Edge(
        this.name(), this.node().serialize(), this.type(), this.edgeIndex);
  }

  rawType(): number {
    if (typeof this._snapshot._edgeTypeOffset === 'undefined') {
      throw new Error('edgeTypeOffset is undefined');
    }

    return this._edges[this.edgeIndex + this._snapshot._edgeTypeOffset];
  }

  isInvisible(): boolean {
    throw new Error('Not implemented');
  }

  isWeak(): boolean {
    throw new Error('Not implemented');
  }
}

/**
 * @interface
 */
export interface HeapSnapshotItemIterator {
  hasNext(): boolean;

  item(): HeapSnapshotItem;

  next(): void;
}

/**
 * @interface
 */
export interface HeapSnapshotItemIndexProvider {
  itemForIndex(newIndex: number): HeapSnapshotItem;
}

export class HeapSnapshotNodeIndexProvider implements HeapSnapshotItemIndexProvider {
  _node: HeapSnapshotNode;
  constructor(snapshot: HeapSnapshot) {
    this._node = snapshot.createNode();
  }

  itemForIndex(index: number): HeapSnapshotNode {
    this._node.nodeIndex = index;
    return this._node;
  }
}

export class HeapSnapshotEdgeIndexProvider implements HeapSnapshotItemIndexProvider {
  _edge: JSHeapSnapshotEdge;
  constructor(snapshot: HeapSnapshot) {
    this._edge = snapshot.createEdge(0);
  }

  itemForIndex(index: number): HeapSnapshotEdge {
    this._edge.edgeIndex = index;
    return this._edge;
  }
}

export class HeapSnapshotRetainerEdgeIndexProvider implements HeapSnapshotItemIndexProvider {
  _retainerEdge: JSHeapSnapshotRetainerEdge;
  constructor(snapshot: HeapSnapshot) {
    this._retainerEdge = snapshot.createRetainingEdge(0);
  }

  itemForIndex(index: number): HeapSnapshotRetainerEdge {
    this._retainerEdge.setRetainerIndex(index);
    return this._retainerEdge;
  }
}

export class HeapSnapshotEdgeIterator implements HeapSnapshotItemIterator {
  _sourceNode: HeapSnapshotNode;
  edge: JSHeapSnapshotEdge;
  constructor(node: HeapSnapshotNode) {
    this._sourceNode = node;
    this.edge = node._snapshot.createEdge(node.edgeIndexesStart());
  }

  hasNext(): boolean {
    return this.edge.edgeIndex < this._sourceNode.edgeIndexesEnd();
  }

  item(): HeapSnapshotEdge {
    return this.edge;
  }

  next(): void {
    if (typeof this.edge._snapshot._edgeFieldsCount === 'undefined') {
      throw new Error('edgeFieldsCount is undefined');
    }
    this.edge.edgeIndex += this.edge._snapshot._edgeFieldsCount;
  }
}

export class HeapSnapshotRetainerEdge implements HeapSnapshotItem {
  _snapshot: HeapSnapshot;
  _retainerIndex!: number;
  _globalEdgeIndex!: number;
  _retainingNodeIndex?: number;
  _edgeInstance?: JSHeapSnapshotEdge|null;
  _nodeInstance?: HeapSnapshotNode|null;
  constructor(snapshot: HeapSnapshot, retainerIndex: number) {
    this._snapshot = snapshot;
    this.setRetainerIndex(retainerIndex);
  }

  clone(): HeapSnapshotRetainerEdge {
    return new HeapSnapshotRetainerEdge(this._snapshot, this.retainerIndex());
  }

  hasStringName(): boolean {
    return this._edge().hasStringName();
  }

  name(): string {
    return this._edge().name();
  }

  node(): HeapSnapshotNode {
    return this._node();
  }

  nodeIndex(): number {
    if (typeof this._retainingNodeIndex === 'undefined') {
      throw new Error('retainingNodeIndex is undefined');
    }

    return this._retainingNodeIndex;
  }

  retainerIndex(): number {
    return this._retainerIndex;
  }

  setRetainerIndex(retainerIndex: number): void {
    if (retainerIndex === this._retainerIndex) {
      return;
    }

    if (!this._snapshot._retainingEdges || !this._snapshot._retainingNodes) {
      throw new Error('Snapshot does not contain retaining edges or retaining nodes');
    }

    this._retainerIndex = retainerIndex;
    this._globalEdgeIndex = this._snapshot._retainingEdges[retainerIndex];
    this._retainingNodeIndex = this._snapshot._retainingNodes[retainerIndex];
    this._edgeInstance = null;
    this._nodeInstance = null;
  }

  set edgeIndex(edgeIndex: number) {
    this.setRetainerIndex(edgeIndex);
  }

  _node(): HeapSnapshotNode {
    if (!this._nodeInstance) {
      this._nodeInstance = this._snapshot.createNode(this._retainingNodeIndex);
    }
    return this._nodeInstance;
  }

  _edge(): JSHeapSnapshotEdge {
    if (!this._edgeInstance) {
      this._edgeInstance = this._snapshot.createEdge(this._globalEdgeIndex);
    }
    return this._edgeInstance;
  }

  toString(): string {
    return this._edge().toString();
  }

  itemIndex(): number {
    return this._retainerIndex;
  }

  serialize(): HeapSnapshotModel.HeapSnapshotModel.Edge {
    return new HeapSnapshotModel.HeapSnapshotModel.Edge(
        this.name(), this.node().serialize(), this.type(), this._globalEdgeIndex);
  }

  type(): string {
    return this._edge().type();
  }
}

export class HeapSnapshotRetainerEdgeIterator implements HeapSnapshotItemIterator {
  _retainersEnd: number;
  retainer: JSHeapSnapshotRetainerEdge;
  constructor(retainedNode: HeapSnapshotNode) {
    const snapshot = retainedNode._snapshot;
    const retainedNodeOrdinal = retainedNode.ordinal();
    if (!snapshot._firstRetainerIndex) {
      throw new Error('Snapshot does not contain firstRetainerIndex');
    }
    const retainerIndex = snapshot._firstRetainerIndex[retainedNodeOrdinal];
    this._retainersEnd = snapshot._firstRetainerIndex[retainedNodeOrdinal + 1];
    this.retainer = snapshot.createRetainingEdge(retainerIndex);
  }

  hasNext(): boolean {
    return this.retainer.retainerIndex() < this._retainersEnd;
  }

  item(): HeapSnapshotRetainerEdge {
    return this.retainer;
  }

  next(): void {
    this.retainer.setRetainerIndex(this.retainer.retainerIndex() + 1);
  }
}

export class HeapSnapshotNode implements HeapSnapshotItem {
  _snapshot: HeapSnapshot;
  nodeIndex: number;
  constructor(snapshot: HeapSnapshot, nodeIndex?: number) {
    this._snapshot = snapshot;
    this.nodeIndex = nodeIndex || 0;
  }

  distance(): number {
    return this._snapshot._nodeDistances[this.nodeIndex / this._snapshot._nodeFieldCount];
  }

  className(): string {
    throw new Error('Not implemented');
  }

  classIndex(): number {
    throw new Error('Not implemented');
  }

  dominatorIndex(): number {
    const nodeFieldCount = this._snapshot._nodeFieldCount;
    return this._snapshot._dominatorsTree[this.nodeIndex / this._snapshot._nodeFieldCount] * nodeFieldCount;
  }

  edges(): HeapSnapshotEdgeIterator {
    return new HeapSnapshotEdgeIterator(this);
  }

  edgesCount(): number {
    return (this.edgeIndexesEnd() - this.edgeIndexesStart()) / this._snapshot._edgeFieldsCount;
  }

  id(): number {
    throw new Error('Not implemented');
  }

  rawName(): string {
    throw new Error('Not implemented');
  }

  isRoot(): boolean {
    return this.nodeIndex === this._snapshot._rootNodeIndex;
  }

  isUserRoot(): boolean {
    throw new Error('Not implemented');
  }

  isHidden(): boolean {
    throw new Error('Not implemented');
  }

  isArray(): boolean {
    throw new Error('Not implemented');
  }

  isDocumentDOMTreesRoot(): boolean {
    throw new Error('Not implemented');
  }

  name(): string {
    return this._snapshot.strings[this._name()];
  }

  retainedSize(): number {
    return this._snapshot._retainedSizes[this.ordinal()];
  }

  retainers(): HeapSnapshotRetainerEdgeIterator {
    return new HeapSnapshotRetainerEdgeIterator(this);
  }

  retainersCount(): number {
    const snapshot = this._snapshot;
    const ordinal = this.ordinal();
    return snapshot._firstRetainerIndex[ordinal + 1] - snapshot._firstRetainerIndex[ordinal];
  }

  selfSize(): number {
    const snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeSelfSizeOffset];
  }

  type(): string {
    return this._snapshot._nodeTypes[this.rawType()];
  }

  traceNodeId(): number {
    const snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeTraceNodeIdOffset];
  }

  itemIndex(): number {
    return this.nodeIndex;
  }

  serialize(): HeapSnapshotModel.HeapSnapshotModel.Node {
    return new HeapSnapshotModel.HeapSnapshotModel.Node(
        this.id(), this.name(), this.distance(), this.nodeIndex, this.retainedSize(), this.selfSize(), this.type());
  }

  _name(): number {
    const snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeNameOffset];
  }

  edgeIndexesStart(): number {
    return this._snapshot._firstEdgeIndexes[this.ordinal()];
  }

  edgeIndexesEnd(): number {
    return this._snapshot._firstEdgeIndexes[this.ordinal() + 1];
  }

  ordinal(): number {
    return this.nodeIndex / this._snapshot._nodeFieldCount;
  }

  _nextNodeIndex(): number {
    return this.nodeIndex + this._snapshot._nodeFieldCount;
  }

  rawType(): number {
    const snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeTypeOffset];
  }
}

export class HeapSnapshotNodeIterator implements HeapSnapshotItemIterator {
  node: HeapSnapshotNode;
  _nodesLength: number;
  constructor(node: HeapSnapshotNode) {
    this.node = node;
    this._nodesLength = node._snapshot.nodes.length;
  }

  hasNext(): boolean {
    return this.node.nodeIndex < this._nodesLength;
  }

  item(): HeapSnapshotNode {
    return this.node;
  }

  next(): void {
    this.node.nodeIndex = this.node._nextNodeIndex();
  }
}

export class HeapSnapshotIndexRangeIterator implements HeapSnapshotItemIterator {
  _itemProvider: HeapSnapshotItemIndexProvider;
  _indexes: number[]|Uint32Array;
  _position: number;
  constructor(itemProvider: HeapSnapshotItemIndexProvider, indexes: number[]|Uint32Array) {
    this._itemProvider = itemProvider;
    this._indexes = indexes;
    this._position = 0;
  }

  hasNext(): boolean {
    return this._position < this._indexes.length;
  }

  item(): HeapSnapshotItem {
    const index = this._indexes[this._position];
    return this._itemProvider.itemForIndex(index);
  }

  next(): void {
    ++this._position;
  }
}

export class HeapSnapshotFilteredIterator implements HeapSnapshotItemIterator {
  _iterator: HeapSnapshotItemIterator;
  _filter: ((arg0: HeapSnapshotItem) => boolean)|undefined;
  constructor(iterator: HeapSnapshotItemIterator, filter?: ((arg0: HeapSnapshotItem) => boolean)) {
    this._iterator = iterator;
    this._filter = filter;
    this._skipFilteredItems();
  }

  hasNext(): boolean {
    return this._iterator.hasNext();
  }

  item(): HeapSnapshotItem {
    return this._iterator.item();
  }

  next(): void {
    this._iterator.next();
    this._skipFilteredItems();
  }

  _skipFilteredItems(): void {
    while (this._iterator.hasNext() && this._filter && !this._filter(this._iterator.item())) {
      this._iterator.next();
    }
  }
}

export class HeapSnapshotProgress {
  _dispatcher: HeapSnapshotWorkerDispatcher|undefined;
  constructor(dispatcher?: HeapSnapshotWorkerDispatcher) {
    this._dispatcher = dispatcher;
  }

  updateStatus(status: string): void {
    this._sendUpdateEvent(i18n.i18n.serializeUIString(status));
  }

  updateProgress(title: string, value: number, total: number): void {
    const percentValue = ((total ? (value / total) : 0) * 100).toFixed(0);
    this._sendUpdateEvent(i18n.i18n.serializeUIString(title, {PH1: percentValue}));
  }

  reportProblem(error: string): void {
    // May be undefined in tests.
    if (this._dispatcher) {
      this._dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot, error);
    }
  }

  _sendUpdateEvent(serializedText: string): void {
    // May be undefined in tests.
    if (this._dispatcher) {
      this._dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotModel.HeapSnapshotProgressEvent.Update, serializedText);
    }
  }
}

export class HeapSnapshotProblemReport {
  _errors: string[];
  constructor(title: string) {
    this._errors = [title];
  }

  addError(error: string): void {
    if (this._errors.length > 100) {
      return;
    }
    this._errors.push(error);
  }

  toString(): string {
    return this._errors.join('\n  ');
  }
}
export interface Profile {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  root_index: number;
  nodes: Uint32Array;
  edges: Uint32Array;
  snapshot: HeapSnapshotHeader;
  samples: number[];
  strings: string[];
  locations: number[];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  trace_function_infos: Uint32Array;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  trace_tree: Object;
}

/**
 * DOM node link state.
 */
const enum DOMLinkState {
  Unknown = 0,
  Attached = 1,
  Detached = 2,
}

export abstract class HeapSnapshot {
  nodes: Uint32Array;
  containmentEdges: Uint32Array;
  _metaNode: HeapSnapshotMetainfo;
  _rawSamples: number[];
  _samples: HeapSnapshotModel.HeapSnapshotModel.Samples|null;
  strings: string[];
  _locations: number[];
  _progress: HeapSnapshotProgress;
  _noDistance: number;
  _rootNodeIndex: number;
  _snapshotDiffs: {
    [x: string]: {
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff,
    },
  };
  _aggregatesForDiff!: {
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff,
  };
  _aggregates: {
    [x: string]: {
      [x: string]: AggregatedInfo,
    },
  };
  _aggregatesSortedFlags: {
    [x: string]: boolean,
  };
  _profile: Profile;
  _nodeTypeOffset!: number;
  _nodeNameOffset!: number;
  _nodeIdOffset!: number;
  _nodeSelfSizeOffset!: number;
  _nodeEdgeCountOffset!: number;
  _nodeTraceNodeIdOffset!: number;
  _nodeFieldCount!: number;
  _nodeTypes!: string[];
  _nodeArrayType!: number;
  _nodeHiddenType!: number;
  _nodeObjectType!: number;
  _nodeNativeType!: number;
  _nodeConsStringType!: number;
  _nodeSlicedStringType!: number;
  _nodeCodeType!: number;
  _nodeSyntheticType!: number;
  _edgeFieldsCount!: number;
  _edgeTypeOffset!: number;
  _edgeNameOffset!: number;
  _edgeToNodeOffset!: number;
  _edgeTypes!: string[];
  _edgeElementType!: number;
  _edgeHiddenType!: number;
  _edgeInternalType!: number;
  _edgeShortcutType!: number;
  _edgeWeakType!: number;
  _edgeInvisibleType!: number;
  _locationIndexOffset!: number;
  _locationScriptIdOffset!: number;
  _locationLineOffset!: number;
  _locationColumnOffset!: number;
  _locationFieldCount!: number;
  nodeCount!: number;
  _edgeCount!: number;
  _retainedSizes!: Float64Array;
  _firstEdgeIndexes!: Uint32Array;
  _retainingNodes!: Uint32Array;
  _retainingEdges!: Uint32Array;
  _firstRetainerIndex!: Uint32Array;
  _nodeDistances!: Int32Array;
  _firstDominatedNodeIndex!: Uint32Array;
  _dominatedNodes!: Uint32Array;
  _dominatorsTree!: Uint32Array;
  _allocationProfile!: AllocationProfile;
  _nodeDetachednessOffset!: number;
  _locationMap!: Map<number, HeapSnapshotModel.HeapSnapshotModel.Location>;
  _lazyStringCache!: {
    [x: string]: string,
  };

  constructor(profile: Profile, progress: HeapSnapshotProgress) {
    this.nodes = profile.nodes;
    this.containmentEdges = profile.edges;
    this._metaNode = profile.snapshot.meta;
    this._rawSamples = profile.samples;
    this._samples = null;
    this.strings = profile.strings;
    this._locations = profile.locations;
    this._progress = progress;

    this._noDistance = -5;
    this._rootNodeIndex = 0;
    if (profile.snapshot.root_index) {
      this._rootNodeIndex = profile.snapshot.root_index;
    }

    this._snapshotDiffs = {};

    this._aggregates = {};

    this._aggregatesSortedFlags = {};
    this._profile = profile;
  }

  initialize(): void {
    const meta = this._metaNode;

    this._nodeTypeOffset = meta.node_fields.indexOf('type');
    this._nodeNameOffset = meta.node_fields.indexOf('name');
    this._nodeIdOffset = meta.node_fields.indexOf('id');
    this._nodeSelfSizeOffset = meta.node_fields.indexOf('self_size');
    this._nodeEdgeCountOffset = meta.node_fields.indexOf('edge_count');
    this._nodeTraceNodeIdOffset = meta.node_fields.indexOf('trace_node_id');
    this._nodeDetachednessOffset = meta.node_fields.indexOf('detachedness');
    this._nodeFieldCount = meta.node_fields.length;

    this._nodeTypes = meta.node_types[this._nodeTypeOffset];
    this._nodeArrayType = this._nodeTypes.indexOf('array');
    this._nodeHiddenType = this._nodeTypes.indexOf('hidden');
    this._nodeObjectType = this._nodeTypes.indexOf('object');
    this._nodeNativeType = this._nodeTypes.indexOf('native');
    this._nodeConsStringType = this._nodeTypes.indexOf('concatenated string');
    this._nodeSlicedStringType = this._nodeTypes.indexOf('sliced string');
    this._nodeCodeType = this._nodeTypes.indexOf('code');
    this._nodeSyntheticType = this._nodeTypes.indexOf('synthetic');

    this._edgeFieldsCount = meta.edge_fields.length;
    this._edgeTypeOffset = meta.edge_fields.indexOf('type');
    this._edgeNameOffset = meta.edge_fields.indexOf('name_or_index');
    this._edgeToNodeOffset = meta.edge_fields.indexOf('to_node');

    this._edgeTypes = meta.edge_types[this._edgeTypeOffset];
    this._edgeTypes.push('invisible');
    this._edgeElementType = this._edgeTypes.indexOf('element');
    this._edgeHiddenType = this._edgeTypes.indexOf('hidden');
    this._edgeInternalType = this._edgeTypes.indexOf('internal');
    this._edgeShortcutType = this._edgeTypes.indexOf('shortcut');
    this._edgeWeakType = this._edgeTypes.indexOf('weak');
    this._edgeInvisibleType = this._edgeTypes.indexOf('invisible');

    const locationFields = meta.location_fields || [];

    this._locationIndexOffset = locationFields.indexOf('object_index');
    this._locationScriptIdOffset = locationFields.indexOf('script_id');
    this._locationLineOffset = locationFields.indexOf('line');
    this._locationColumnOffset = locationFields.indexOf('column');
    this._locationFieldCount = locationFields.length;

    this.nodeCount = this.nodes.length / this._nodeFieldCount;
    this._edgeCount = this.containmentEdges.length / this._edgeFieldsCount;

    this._retainedSizes = new Float64Array(this.nodeCount);
    this._firstEdgeIndexes = new Uint32Array(this.nodeCount + 1);
    this._retainingNodes = new Uint32Array(this._edgeCount);
    this._retainingEdges = new Uint32Array(this._edgeCount);
    this._firstRetainerIndex = new Uint32Array(this.nodeCount + 1);
    this._nodeDistances = new Int32Array(this.nodeCount);
    this._firstDominatedNodeIndex = new Uint32Array(this.nodeCount + 1);
    this._dominatedNodes = new Uint32Array(this.nodeCount - 1);

    this._progress.updateStatus('Building edge indexes…');
    this._buildEdgeIndexes();
    this._progress.updateStatus('Building retainers…');
    this._buildRetainers();
    this._progress.updateStatus('Propagating DOM state…');
    this._propagateDOMState();
    this._progress.updateStatus('Calculating node flags…');
    this.calculateFlags();
    this._progress.updateStatus('Calculating distances…');
    this.calculateDistances();
    this._progress.updateStatus('Building postorder index…');
    const result = this._buildPostOrderIndex();
    // Actually it is array that maps node ordinal number to dominator node ordinal number.
    this._progress.updateStatus('Building dominator tree…');
    this._dominatorsTree =
        this._buildDominatorTree(result.postOrderIndex2NodeOrdinal, result.nodeOrdinal2PostOrderIndex);
    this._progress.updateStatus('Calculating retained sizes…');
    this._calculateRetainedSizes(result.postOrderIndex2NodeOrdinal);
    this._progress.updateStatus('Building dominated nodes…');
    this._buildDominatedNodes();
    this._progress.updateStatus('Calculating statistics…');
    this.calculateStatistics();
    this._progress.updateStatus('Calculating samples…');
    this._buildSamples();
    this._progress.updateStatus('Building locations…');
    this._buildLocationMap();
    this._progress.updateStatus('Finished processing.');

    if (this._profile.snapshot.trace_function_count) {
      this._progress.updateStatus('Building allocation statistics…');
      const nodes = this.nodes;
      const nodesLength = nodes.length;
      const nodeFieldCount = this._nodeFieldCount;
      const node = this.rootNode();
      const liveObjects: {[x: number]: {count: number, size: number, ids: number[]}} = {};
      for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
        node.nodeIndex = nodeIndex;
        const traceNodeId = node.traceNodeId();
        let stats: {
          count: number,
          size: number,
          ids: number[],
        } = liveObjects[traceNodeId];
        if (!stats) {
          liveObjects[traceNodeId] = stats = {count: 0, size: 0, ids: []};
        }
        stats.count++;
        stats.size += node.selfSize();
        stats.ids.push(node.id());
      }
      this._allocationProfile = new AllocationProfile(this._profile, liveObjects);
      this._progress.updateStatus('done');
    }
  }

  _buildEdgeIndexes(): void {
    const nodes = this.nodes;
    const nodeCount = this.nodeCount;
    const firstEdgeIndexes = this._firstEdgeIndexes;
    const nodeFieldCount = this._nodeFieldCount;
    const edgeFieldsCount = this._edgeFieldsCount;
    const nodeEdgeCountOffset = this._nodeEdgeCountOffset;
    firstEdgeIndexes[nodeCount] = this.containmentEdges.length;
    for (let nodeOrdinal = 0, edgeIndex = 0; nodeOrdinal < nodeCount; ++nodeOrdinal) {
      firstEdgeIndexes[nodeOrdinal] = edgeIndex;
      edgeIndex += nodes[nodeOrdinal * nodeFieldCount + nodeEdgeCountOffset] * edgeFieldsCount;
    }
  }

  _buildRetainers(): void {
    const retainingNodes = this._retainingNodes;
    const retainingEdges = this._retainingEdges;
    // Index of the first retainer in the _retainingNodes and _retainingEdges
    // arrays. Addressed by retained node index.
    const firstRetainerIndex = this._firstRetainerIndex;

    const containmentEdges = this.containmentEdges;
    const edgeFieldsCount = this._edgeFieldsCount;
    const nodeFieldCount = this._nodeFieldCount;
    const edgeToNodeOffset = this._edgeToNodeOffset;
    const firstEdgeIndexes = this._firstEdgeIndexes;
    const nodeCount = this.nodeCount;

    for (let toNodeFieldIndex = edgeToNodeOffset, l = containmentEdges.length; toNodeFieldIndex < l;
         toNodeFieldIndex += edgeFieldsCount) {
      const toNodeIndex = containmentEdges[toNodeFieldIndex];
      if (toNodeIndex % nodeFieldCount) {
        throw new Error('Invalid toNodeIndex ' + toNodeIndex);
      }
      ++firstRetainerIndex[toNodeIndex / nodeFieldCount];
    }
    for (let i = 0, firstUnusedRetainerSlot = 0; i < nodeCount; i++) {
      const retainersCount = firstRetainerIndex[i];
      firstRetainerIndex[i] = firstUnusedRetainerSlot;
      retainingNodes[firstUnusedRetainerSlot] = retainersCount;
      firstUnusedRetainerSlot += retainersCount;
    }
    firstRetainerIndex[nodeCount] = retainingNodes.length;

    let nextNodeFirstEdgeIndex: number = firstEdgeIndexes[0];
    for (let srcNodeOrdinal = 0; srcNodeOrdinal < nodeCount; ++srcNodeOrdinal) {
      const firstEdgeIndex = nextNodeFirstEdgeIndex;
      nextNodeFirstEdgeIndex = firstEdgeIndexes[srcNodeOrdinal + 1];
      const srcNodeIndex = srcNodeOrdinal * nodeFieldCount;
      for (let edgeIndex = firstEdgeIndex; edgeIndex < nextNodeFirstEdgeIndex; edgeIndex += edgeFieldsCount) {
        const toNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
        if (toNodeIndex % nodeFieldCount) {
          throw new Error('Invalid toNodeIndex ' + toNodeIndex);
        }
        const firstRetainerSlotIndex = firstRetainerIndex[toNodeIndex / nodeFieldCount];
        const nextUnusedRetainerSlotIndex = firstRetainerSlotIndex + (--retainingNodes[firstRetainerSlotIndex]);
        retainingNodes[nextUnusedRetainerSlotIndex] = srcNodeIndex;
        retainingEdges[nextUnusedRetainerSlotIndex] = edgeIndex;
      }
    }
  }

  abstract createNode(_nodeIndex?: number): HeapSnapshotNode;
  abstract createEdge(_edgeIndex: number): JSHeapSnapshotEdge;
  abstract createRetainingEdge(_retainerIndex: number): JSHeapSnapshotRetainerEdge;

  _allNodes(): HeapSnapshotNodeIterator {
    return new HeapSnapshotNodeIterator(this.rootNode());
  }

  rootNode(): HeapSnapshotNode {
    return this.createNode(this._rootNodeIndex);
  }

  get rootNodeIndex(): number {
    return this._rootNodeIndex;
  }

  get totalSize(): number {
    return this.rootNode().retainedSize();
  }

  _getDominatedIndex(nodeIndex: number): number {
    if (nodeIndex % this._nodeFieldCount) {
      throw new Error('Invalid nodeIndex: ' + nodeIndex);
    }
    return this._firstDominatedNodeIndex[nodeIndex / this._nodeFieldCount];
  }

  _createFilter(nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter):
      ((arg0: HeapSnapshotNode) => boolean)|undefined {
    const minNodeId = nodeFilter.minNodeId;
    const maxNodeId = nodeFilter.maxNodeId;
    const allocationNodeId = nodeFilter.allocationNodeId;
    let filter;
    if (typeof allocationNodeId === 'number') {
      filter = this._createAllocationStackFilter(allocationNodeId);
      if (!filter) {
        throw new Error('Unable to create filter');
      }
      // @ts-ignore key can be added as a static property
      filter.key = 'AllocationNodeId: ' + allocationNodeId;
    } else if (typeof minNodeId === 'number' && typeof maxNodeId === 'number') {
      filter = this._createNodeIdFilter(minNodeId, maxNodeId);
      // @ts-ignore key can be added as a static property
      filter.key = 'NodeIdRange: ' + minNodeId + '..' + maxNodeId;
    }
    return filter;
  }

  search(
      searchConfig: HeapSnapshotModel.HeapSnapshotModel.SearchConfig,
      nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): number[] {
    const query = searchConfig.query;

    function filterString(matchedStringIndexes: Set<number>, string: string, index: number): Set<number> {
      if (string.indexOf(query) !== -1) {
        matchedStringIndexes.add(index);
      }
      return matchedStringIndexes;
    }

    const regexp = searchConfig.isRegex ? new RegExp(query) : createPlainTextSearchRegex(query, 'i');

    function filterRegexp(matchedStringIndexes: Set<number>, string: string, index: number): Set<number> {
      if (regexp.test(string)) {
        matchedStringIndexes.add(index);
      }
      return matchedStringIndexes;
    }

    const stringFilter = (searchConfig.isRegex || !searchConfig.caseSensitive) ? filterRegexp : filterString;
    const stringIndexes = this.strings.reduce(stringFilter, new Set());

    if (!stringIndexes.size) {
      return [];
    }

    const filter = this._createFilter(nodeFilter);
    const nodeIds = [];
    const nodesLength = this.nodes.length;
    const nodes = this.nodes;
    const nodeNameOffset = this._nodeNameOffset;
    const nodeIdOffset = this._nodeIdOffset;
    const nodeFieldCount = this._nodeFieldCount;
    const node = this.rootNode();

    for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      node.nodeIndex = nodeIndex;
      if (filter && !filter(node)) {
        continue;
      }
      if (stringIndexes.has(nodes[nodeIndex + nodeNameOffset])) {
        nodeIds.push(nodes[nodeIndex + nodeIdOffset]);
      }
    }
    return nodeIds;
  }

  aggregatesWithFilter(nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter):
      {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate} {
    const filter = this._createFilter(nodeFilter);
    // @ts-ignore key is added in _createFilter
    const key = filter ? filter.key : 'allObjects';
    return this.aggregates(false, key, filter);
  }

  _createNodeIdFilter(minNodeId: number, maxNodeId: number): (arg0: HeapSnapshotNode) => boolean {
    function nodeIdFilter(node: HeapSnapshotNode): boolean {
      const id = node.id();
      return id > minNodeId && id <= maxNodeId;
    }
    return nodeIdFilter;
  }

  _createAllocationStackFilter(bottomUpAllocationNodeId: number): ((arg0: HeapSnapshotNode) => boolean)|undefined {
    if (!this._allocationProfile) {
      throw new Error('No Allocation Profile provided');
    }

    const traceIds = this._allocationProfile.traceIds(bottomUpAllocationNodeId);
    if (!traceIds.length) {
      return undefined;
    }

    const set: {[x: number]: boolean} = {};
    for (let i = 0; i < traceIds.length; i++) {
      set[traceIds[i]] = true;
    }
    function traceIdFilter(node: HeapSnapshotNode): boolean {
      return Boolean(set[node.traceNodeId()]);
    }
    return traceIdFilter;
  }

  aggregates(sortedIndexes: boolean, key?: string, filter?: ((arg0: HeapSnapshotNode) => boolean)):
      {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate} {
    const aggregates = this._buildAggregates(filter);

    let aggregatesByClassName;
    if (key && this._aggregates[key]) {
      aggregatesByClassName = this._aggregates[key];
    } else {
      this._calculateClassesRetainedSize(aggregates.aggregatesByClassIndex, filter);
      aggregatesByClassName = aggregates.aggregatesByClassName;
      if (key) {
        this._aggregates[key] = aggregatesByClassName;
      }
    }

    if (sortedIndexes && (!key || !this._aggregatesSortedFlags[key])) {
      this._sortAggregateIndexes(aggregates.aggregatesByClassName);
      if (key) {
        this._aggregatesSortedFlags[key] = sortedIndexes;
      }
    }

    return aggregatesByClassName as {
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate,
    };
  }

  allocationTracesTops(): HeapSnapshotModel.HeapSnapshotModel.SerializedAllocationNode[] {
    return this._allocationProfile.serializeTraceTops();
  }

  allocationNodeCallers(nodeId: number): HeapSnapshotModel.HeapSnapshotModel.AllocationNodeCallers {
    return this._allocationProfile.serializeCallers(nodeId);
  }

  allocationStack(nodeIndex: number): HeapSnapshotModel.HeapSnapshotModel.AllocationStackFrame[]|null {
    const node = this.createNode(nodeIndex);
    const allocationNodeId = node.traceNodeId();
    if (!allocationNodeId) {
      return null;
    }
    return this._allocationProfile.serializeAllocationStack(allocationNodeId);
  }

  aggregatesForDiff(): {[x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff} {
    if (this._aggregatesForDiff) {
      return this._aggregatesForDiff;
    }

    const aggregatesByClassName = this.aggregates(true, 'allObjects');
    this._aggregatesForDiff = {};

    const node = this.createNode();
    for (const className in aggregatesByClassName) {
      const aggregate = aggregatesByClassName[className];
      const indexes = aggregate.idxs;
      const ids = new Array(indexes.length);
      const selfSizes = new Array(indexes.length);
      for (let i = 0; i < indexes.length; i++) {
        node.nodeIndex = indexes[i];
        ids[i] = node.id();
        selfSizes[i] = node.selfSize();
      }

      this._aggregatesForDiff[className] = {indexes: indexes, ids: ids, selfSizes: selfSizes};
    }
    return this._aggregatesForDiff;
  }

  isUserRoot(_node: HeapSnapshotNode): boolean {
    return true;
  }

  calculateDistances(filter?: ((arg0: HeapSnapshotNode, arg1: HeapSnapshotEdge) => boolean)): void {
    const nodeCount = this.nodeCount;
    const distances = this._nodeDistances;
    const noDistance = this._noDistance;
    for (let i = 0; i < nodeCount; ++i) {
      distances[i] = noDistance;
    }

    const nodesToVisit = new Uint32Array(this.nodeCount);
    let nodesToVisitLength = 0;

    // BFS for user root objects.
    for (let iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
      const node = iter.edge.node();
      if (this.isUserRoot(node)) {
        distances[node.ordinal()] = 1;
        nodesToVisit[nodesToVisitLength++] = node.nodeIndex;
      }
    }
    this._bfs(nodesToVisit, nodesToVisitLength, distances, filter);

    // BFS for objects not reached from user roots.
    distances[this.rootNode().ordinal()] =
        nodesToVisitLength > 0 ? HeapSnapshotModel.HeapSnapshotModel.baseSystemDistance : 0;
    nodesToVisit[0] = this.rootNode().nodeIndex;
    nodesToVisitLength = 1;
    this._bfs(nodesToVisit, nodesToVisitLength, distances, filter);
  }

  _bfs(
      nodesToVisit: Uint32Array, nodesToVisitLength: number, distances: Int32Array,
      filter?: ((arg0: HeapSnapshotNode, arg1: HeapSnapshotEdge) => boolean)): void {
    // Preload fields into local variables for better performance.
    const edgeFieldsCount = this._edgeFieldsCount;
    const nodeFieldCount = this._nodeFieldCount;
    const containmentEdges = this.containmentEdges;
    const firstEdgeIndexes = this._firstEdgeIndexes;
    const edgeToNodeOffset = this._edgeToNodeOffset;
    const edgeTypeOffset = this._edgeTypeOffset;
    const nodeCount = this.nodeCount;
    const edgeWeakType = this._edgeWeakType;
    const noDistance = this._noDistance;

    let index = 0;
    const edge = this.createEdge(0);
    const node = this.createNode(0);
    while (index < nodesToVisitLength) {
      const nodeIndex = nodesToVisit[index++];  // shift generates too much garbage.
      const nodeOrdinal = nodeIndex / nodeFieldCount;
      const distance = distances[nodeOrdinal] + 1;
      const firstEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      const edgesEnd = firstEdgeIndexes[nodeOrdinal + 1];
      node.nodeIndex = nodeIndex;
      for (let edgeIndex = firstEdgeIndex; edgeIndex < edgesEnd; edgeIndex += edgeFieldsCount) {
        const edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
        if (edgeType === edgeWeakType) {
          continue;
        }
        const childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
        const childNodeOrdinal = childNodeIndex / nodeFieldCount;
        if (distances[childNodeOrdinal] !== noDistance) {
          continue;
        }
        edge.edgeIndex = edgeIndex;
        if (filter && !filter(node, edge)) {
          continue;
        }
        distances[childNodeOrdinal] = distance;
        nodesToVisit[nodesToVisitLength++] = childNodeIndex;
      }
    }
    if (nodesToVisitLength > nodeCount) {
      throw new Error(
          'BFS failed. Nodes to visit (' + nodesToVisitLength + ') is more than nodes count (' + nodeCount + ')');
    }
  }

  _buildAggregates(filter?: ((arg0: HeapSnapshotNode) => boolean)):
      {aggregatesByClassName: {[x: string]: AggregatedInfo}, aggregatesByClassIndex: {[x: number]: AggregatedInfo}} {
    const aggregates: {[x: number]: AggregatedInfo} = {};

    const aggregatesByClassName: {[x: string]: AggregatedInfo} = {};

    const classIndexes = [];
    const nodes = this.nodes;
    const nodesLength = nodes.length;
    const nodeNativeType = this._nodeNativeType;
    const nodeFieldCount = this._nodeFieldCount;
    const selfSizeOffset = this._nodeSelfSizeOffset;
    const nodeTypeOffset = this._nodeTypeOffset;
    const node = this.rootNode();
    const nodeDistances = this._nodeDistances;

    for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      node.nodeIndex = nodeIndex;
      if (filter && !filter(node)) {
        continue;
      }
      const selfSize = nodes[nodeIndex + selfSizeOffset];
      if (!selfSize && nodes[nodeIndex + nodeTypeOffset] !== nodeNativeType) {
        continue;
      }
      const classIndex = node.classIndex();
      const nodeOrdinal = nodeIndex / nodeFieldCount;
      const distance = nodeDistances[nodeOrdinal];
      if (!(classIndex in aggregates)) {
        const nodeType = node.type();
        const nameMatters = nodeType === 'object' || nodeType === 'native';
        const value = {
          count: 1,
          distance: distance,
          self: selfSize,
          maxRet: 0,
          type: nodeType,
          name: nameMatters ? node.name() : null,
          idxs: [nodeIndex],
        };
        aggregates[classIndex] = value;
        classIndexes.push(classIndex);
        aggregatesByClassName[node.className()] = value;
      } else {
        const clss = aggregates[classIndex];
        if (!clss) {
          continue;
        }
        clss.distance = Math.min(clss.distance, distance);
        ++clss.count;
        clss.self += selfSize;
        clss.idxs.push(nodeIndex);
      }
    }

    // Shave off provisionally allocated space.
    for (let i = 0, l = classIndexes.length; i < l; ++i) {
      const classIndex = classIndexes[i];
      const classIndexValues = aggregates[classIndex];
      if (!classIndexValues) {
        continue;
      }
      classIndexValues.idxs = classIndexValues.idxs.slice();
    }

    return {aggregatesByClassName: aggregatesByClassName, aggregatesByClassIndex: aggregates};
  }

  _calculateClassesRetainedSize(
      aggregates: {[x: number]: AggregatedInfo}, filter?: ((arg0: HeapSnapshotNode) => boolean)): void {
    const rootNodeIndex = this._rootNodeIndex;
    const node = this.createNode(rootNodeIndex);
    const list = [rootNodeIndex];
    const sizes = [-1];
    const classes = [];

    const seenClassNameIndexes = new Map<number, boolean>();
    const nodeFieldCount = this._nodeFieldCount;
    const nodeTypeOffset = this._nodeTypeOffset;
    const nodeNativeType = this._nodeNativeType;
    const dominatedNodes = this._dominatedNodes;
    const nodes = this.nodes;
    const firstDominatedNodeIndex = this._firstDominatedNodeIndex;

    while (list.length) {
      const nodeIndex = (list.pop() as number);
      node.nodeIndex = nodeIndex;
      let classIndex = node.classIndex();
      const seen = Boolean(seenClassNameIndexes.get(classIndex));
      const nodeOrdinal = nodeIndex / nodeFieldCount;
      const dominatedIndexFrom = firstDominatedNodeIndex[nodeOrdinal];
      const dominatedIndexTo = firstDominatedNodeIndex[nodeOrdinal + 1];

      if (!seen && (!filter || filter(node)) &&
          (node.selfSize() || nodes[nodeIndex + nodeTypeOffset] === nodeNativeType)) {
        aggregates[classIndex].maxRet += node.retainedSize();
        if (dominatedIndexFrom !== dominatedIndexTo) {
          seenClassNameIndexes.set(classIndex, true);
          sizes.push(list.length);
          classes.push(classIndex);
        }
      }
      for (let i = dominatedIndexFrom; i < dominatedIndexTo; i++) {
        list.push(dominatedNodes[i]);
      }

      const l = list.length;
      while (sizes[sizes.length - 1] === l) {
        sizes.pop();
        classIndex = (classes.pop() as number);
        seenClassNameIndexes.set(classIndex, false);
      }
    }
  }

  _sortAggregateIndexes(aggregates: {[x: string]: AggregatedInfo}): void {
    const nodeA = this.createNode();
    const nodeB = this.createNode();

    for (const clss in aggregates) {
      aggregates[clss].idxs.sort((idxA, idxB) => {
        nodeA.nodeIndex = idxA;
        nodeB.nodeIndex = idxB;
        return nodeA.id() < nodeB.id() ? -1 : 1;
      });
    }
  }

  /**
   * The function checks is the edge should be considered during building
   * postorder iterator and dominator tree.
   */
  _isEssentialEdge(nodeIndex: number, edgeType: number): boolean {
    // Shortcuts at the root node have special meaning of marking user global objects.
    return edgeType !== this._edgeWeakType &&
        (edgeType !== this._edgeShortcutType || nodeIndex === this._rootNodeIndex);
  }

  _buildPostOrderIndex(): {postOrderIndex2NodeOrdinal: Uint32Array, nodeOrdinal2PostOrderIndex: Uint32Array} {
    const nodeFieldCount = this._nodeFieldCount;
    const nodeCount = this.nodeCount;
    const rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;

    const edgeFieldsCount = this._edgeFieldsCount;
    const edgeTypeOffset = this._edgeTypeOffset;
    const edgeToNodeOffset = this._edgeToNodeOffset;
    const firstEdgeIndexes = this._firstEdgeIndexes;
    const containmentEdges = this.containmentEdges;

    const mapAndFlag = this.userObjectsMapAndFlag();
    const flags = mapAndFlag ? mapAndFlag.map : null;
    const flag = mapAndFlag ? mapAndFlag.flag : 0;

    const stackNodes = new Uint32Array(nodeCount);
    const stackCurrentEdge = new Uint32Array(nodeCount);
    const postOrderIndex2NodeOrdinal = new Uint32Array(nodeCount);
    const nodeOrdinal2PostOrderIndex = new Uint32Array(nodeCount);
    const visited = new Uint8Array(nodeCount);
    let postOrderIndex = 0;

    let stackTop = 0;
    stackNodes[0] = rootNodeOrdinal;
    stackCurrentEdge[0] = firstEdgeIndexes[rootNodeOrdinal];
    visited[rootNodeOrdinal] = 1;

    let iteration = 0;
    while (true) {
      ++iteration;
      while (stackTop >= 0) {
        const nodeOrdinal = stackNodes[stackTop];
        const edgeIndex = stackCurrentEdge[stackTop];
        const edgesEnd = firstEdgeIndexes[nodeOrdinal + 1];

        if (edgeIndex < edgesEnd) {
          stackCurrentEdge[stackTop] += edgeFieldsCount;
          const edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
          if (!this._isEssentialEdge(nodeOrdinal * nodeFieldCount, edgeType)) {
            continue;
          }
          const childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
          const childNodeOrdinal = childNodeIndex / nodeFieldCount;
          if (visited[childNodeOrdinal]) {
            continue;
          }
          const nodeFlag = !flags || (flags[nodeOrdinal] & flag);
          const childNodeFlag = !flags || (flags[childNodeOrdinal] & flag);
          // We are skipping the edges from non-page-owned nodes to page-owned nodes.
          // Otherwise the dominators for the objects that also were retained by debugger would be affected.
          if (nodeOrdinal !== rootNodeOrdinal && childNodeFlag && !nodeFlag) {
            continue;
          }
          ++stackTop;
          stackNodes[stackTop] = childNodeOrdinal;
          stackCurrentEdge[stackTop] = firstEdgeIndexes[childNodeOrdinal];
          visited[childNodeOrdinal] = 1;
        } else {
          // Done with all the node children
          nodeOrdinal2PostOrderIndex[nodeOrdinal] = postOrderIndex;
          postOrderIndex2NodeOrdinal[postOrderIndex++] = nodeOrdinal;
          --stackTop;
        }
      }

      if (postOrderIndex === nodeCount || iteration > 1) {
        break;
      }
      const errors = new HeapSnapshotProblemReport(`Heap snapshot: ${
          nodeCount - postOrderIndex} nodes are unreachable from the root. Following nodes have only weak retainers:`);
      const dumpNode = this.rootNode();
      // Remove root from the result (last node in the array) and put it at the bottom of the stack so that it is
      // visited after all orphan nodes and their subgraphs.
      --postOrderIndex;
      stackTop = 0;
      stackNodes[0] = rootNodeOrdinal;
      stackCurrentEdge[0] = firstEdgeIndexes[rootNodeOrdinal + 1];  // no need to reiterate its edges
      for (let i = 0; i < nodeCount; ++i) {
        if (visited[i] || !this._hasOnlyWeakRetainers(i)) {
          continue;
        }

        // Add all nodes that have only weak retainers to traverse their subgraphs.
        stackNodes[++stackTop] = i;
        stackCurrentEdge[stackTop] = firstEdgeIndexes[i];
        visited[i] = 1;

        dumpNode.nodeIndex = i * nodeFieldCount;
        const retainers = [];
        for (let it = dumpNode.retainers(); it.hasNext(); it.next()) {
          retainers.push(`${it.item().node().name()}@${it.item().node().id()}.${it.item().name()}`);
        }
        errors.addError(`${dumpNode.name()} @${dumpNode.id()}  weak retainers: ${retainers.join(', ')}`);
      }
      console.warn(errors.toString());
    }

    // If we already processed all orphan nodes that have only weak retainers and still have some orphans...
    if (postOrderIndex !== nodeCount) {
      const errors = new HeapSnapshotProblemReport(
          'Still found ' + (nodeCount - postOrderIndex) + ' unreachable nodes in heap snapshot:');
      const dumpNode = this.rootNode();
      // Remove root from the result (last node in the array) and put it at the bottom of the stack so that it is
      // visited after all orphan nodes and their subgraphs.
      --postOrderIndex;
      for (let i = 0; i < nodeCount; ++i) {
        if (visited[i]) {
          continue;
        }
        dumpNode.nodeIndex = i * nodeFieldCount;
        errors.addError(dumpNode.name() + ' @' + dumpNode.id());
        // Fix it by giving the node a postorder index anyway.
        nodeOrdinal2PostOrderIndex[i] = postOrderIndex;
        postOrderIndex2NodeOrdinal[postOrderIndex++] = i;
      }
      nodeOrdinal2PostOrderIndex[rootNodeOrdinal] = postOrderIndex;
      postOrderIndex2NodeOrdinal[postOrderIndex++] = rootNodeOrdinal;
      console.warn(errors.toString());
    }

    return {
      postOrderIndex2NodeOrdinal: postOrderIndex2NodeOrdinal,
      nodeOrdinal2PostOrderIndex: nodeOrdinal2PostOrderIndex,
    };
  }

  _hasOnlyWeakRetainers(nodeOrdinal: number): boolean {
    const edgeTypeOffset = this._edgeTypeOffset;
    const edgeWeakType = this._edgeWeakType;
    const edgeShortcutType = this._edgeShortcutType;
    const containmentEdges = this.containmentEdges;
    const retainingEdges = this._retainingEdges;
    const beginRetainerIndex = this._firstRetainerIndex[nodeOrdinal];
    const endRetainerIndex = this._firstRetainerIndex[nodeOrdinal + 1];
    for (let retainerIndex = beginRetainerIndex; retainerIndex < endRetainerIndex; ++retainerIndex) {
      const retainerEdgeIndex = retainingEdges[retainerIndex];
      const retainerEdgeType = containmentEdges[retainerEdgeIndex + edgeTypeOffset];
      if (retainerEdgeType !== edgeWeakType && retainerEdgeType !== edgeShortcutType) {
        return false;
      }
    }
    return true;
  }

  // The algorithm is based on the article:
  // K. Cooper, T. Harvey and K. Kennedy "A Simple, Fast Dominance Algorithm"
  // Softw. Pract. Exper. 4 (2001), pp. 1-10.
  _buildDominatorTree(postOrderIndex2NodeOrdinal: Uint32Array, nodeOrdinal2PostOrderIndex: Uint32Array): Uint32Array {
    const nodeFieldCount = this._nodeFieldCount;
    const firstRetainerIndex = this._firstRetainerIndex;
    const retainingNodes = this._retainingNodes;
    const retainingEdges = this._retainingEdges;
    const edgeFieldsCount = this._edgeFieldsCount;
    const edgeTypeOffset = this._edgeTypeOffset;
    const edgeToNodeOffset = this._edgeToNodeOffset;
    const firstEdgeIndexes = this._firstEdgeIndexes;
    const containmentEdges = this.containmentEdges;
    const rootNodeIndex = this._rootNodeIndex;

    const mapAndFlag = this.userObjectsMapAndFlag();
    const flags = mapAndFlag ? mapAndFlag.map : null;
    const flag = mapAndFlag ? mapAndFlag.flag : 0;

    const nodesCount = postOrderIndex2NodeOrdinal.length;
    const rootPostOrderedIndex = nodesCount - 1;
    const noEntry = nodesCount;
    const dominators = new Uint32Array(nodesCount);
    for (let i = 0; i < rootPostOrderedIndex; ++i) {
      dominators[i] = noEntry;
    }
    dominators[rootPostOrderedIndex] = rootPostOrderedIndex;

    // The affected array is used to mark entries which dominators
    // have to be racalculated because of changes in their retainers.
    const affected = new Uint8Array(nodesCount);
    let nodeOrdinal;

    {  // Mark the root direct children as affected.
      nodeOrdinal = this._rootNodeIndex / nodeFieldCount;
      const endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      for (let edgeIndex = firstEdgeIndexes[nodeOrdinal]; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
        const edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
        if (!this._isEssentialEdge(this._rootNodeIndex, edgeType)) {
          continue;
        }
        const childNodeOrdinal = containmentEdges[edgeIndex + edgeToNodeOffset] / nodeFieldCount;
        affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]] = 1;
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (let postOrderIndex = rootPostOrderedIndex - 1; postOrderIndex >= 0; --postOrderIndex) {
        if (affected[postOrderIndex] === 0) {
          continue;
        }
        affected[postOrderIndex] = 0;
        // If dominator of the entry has already been set to root,
        // then it can't propagate any further.
        if (dominators[postOrderIndex] === rootPostOrderedIndex) {
          continue;
        }
        nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
        const nodeFlag = !flags || (flags[nodeOrdinal] & flag);
        let newDominatorIndex: number = noEntry;
        const beginRetainerIndex = firstRetainerIndex[nodeOrdinal];
        const endRetainerIndex = firstRetainerIndex[nodeOrdinal + 1];
        let orphanNode = true;
        for (let retainerIndex = beginRetainerIndex; retainerIndex < endRetainerIndex; ++retainerIndex) {
          const retainerEdgeIndex = retainingEdges[retainerIndex];
          const retainerEdgeType = containmentEdges[retainerEdgeIndex + edgeTypeOffset];
          const retainerNodeIndex = retainingNodes[retainerIndex];
          if (!this._isEssentialEdge(retainerNodeIndex, retainerEdgeType)) {
            continue;
          }
          orphanNode = false;
          const retainerNodeOrdinal = retainerNodeIndex / nodeFieldCount;
          const retainerNodeFlag = !flags || (flags[retainerNodeOrdinal] & flag);
          // We are skipping the edges from non-page-owned nodes to page-owned nodes.
          // Otherwise the dominators for the objects that also were retained by debugger would be affected.
          if (retainerNodeIndex !== rootNodeIndex && nodeFlag && !retainerNodeFlag) {
            continue;
          }
          let retanerPostOrderIndex: number = nodeOrdinal2PostOrderIndex[retainerNodeOrdinal];
          if (dominators[retanerPostOrderIndex] !== noEntry) {
            if (newDominatorIndex === noEntry) {
              newDominatorIndex = retanerPostOrderIndex;
            } else {
              while (retanerPostOrderIndex !== newDominatorIndex) {
                while (retanerPostOrderIndex < newDominatorIndex) {
                  retanerPostOrderIndex = dominators[retanerPostOrderIndex];
                }
                while (newDominatorIndex < retanerPostOrderIndex) {
                  newDominatorIndex = dominators[newDominatorIndex];
                }
              }
            }
            // If idom has already reached the root, it doesn't make sense
            // to check other retainers.
            if (newDominatorIndex === rootPostOrderedIndex) {
              break;
            }
          }
        }
        // Make root dominator of orphans.
        if (orphanNode) {
          newDominatorIndex = rootPostOrderedIndex;
        }
        if (newDominatorIndex !== noEntry && dominators[postOrderIndex] !== newDominatorIndex) {
          dominators[postOrderIndex] = newDominatorIndex;
          changed = true;
          nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
          const beginEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal] + edgeToNodeOffset;
          const endEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal + 1];
          for (let toNodeFieldIndex = beginEdgeToNodeFieldIndex; toNodeFieldIndex < endEdgeToNodeFieldIndex;
               toNodeFieldIndex += edgeFieldsCount) {
            const childNodeOrdinal = containmentEdges[toNodeFieldIndex] / nodeFieldCount;
            affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]] = 1;
          }
        }
      }
    }

    const dominatorsTree = new Uint32Array(nodesCount);
    for (let postOrderIndex = 0, l = dominators.length; postOrderIndex < l; ++postOrderIndex) {
      nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
      dominatorsTree[nodeOrdinal] = postOrderIndex2NodeOrdinal[dominators[postOrderIndex]];
    }
    return dominatorsTree;
  }

  _calculateRetainedSizes(postOrderIndex2NodeOrdinal: Uint32Array): void {
    const nodeCount = this.nodeCount;
    const nodes = this.nodes;
    const nodeSelfSizeOffset = this._nodeSelfSizeOffset;
    const nodeFieldCount = this._nodeFieldCount;
    const dominatorsTree = this._dominatorsTree;
    const retainedSizes = this._retainedSizes;

    for (let nodeOrdinal = 0; nodeOrdinal < nodeCount; ++nodeOrdinal) {
      retainedSizes[nodeOrdinal] = nodes[nodeOrdinal * nodeFieldCount + nodeSelfSizeOffset];
    }

    // Propagate retained sizes for each node excluding root.
    for (let postOrderIndex = 0; postOrderIndex < nodeCount - 1; ++postOrderIndex) {
      const nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
      const dominatorOrdinal = dominatorsTree[nodeOrdinal];
      retainedSizes[dominatorOrdinal] += retainedSizes[nodeOrdinal];
    }
  }

  _buildDominatedNodes(): void {
    // Builds up two arrays:
    //  - "dominatedNodes" is a continuous array, where each node owns an
    //    interval (can be empty) with corresponding dominated nodes.
    //  - "indexArray" is an array of indexes in the "dominatedNodes"
    //    with the same positions as in the _nodeIndex.
    const indexArray = this._firstDominatedNodeIndex;
    // All nodes except the root have dominators.
    const dominatedNodes = this._dominatedNodes;

    // Count the number of dominated nodes for each node. Skip the root (node at
    // index 0) as it is the only node that dominates itself.
    const nodeFieldCount = this._nodeFieldCount;
    const dominatorsTree = this._dominatorsTree;

    let fromNodeOrdinal = 0;
    let toNodeOrdinal: number = this.nodeCount;
    const rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;
    if (rootNodeOrdinal === fromNodeOrdinal) {
      fromNodeOrdinal = 1;
    } else if (rootNodeOrdinal === toNodeOrdinal - 1) {
      toNodeOrdinal = toNodeOrdinal - 1;
    } else {
      throw new Error('Root node is expected to be either first or last');
    }
    for (let nodeOrdinal = fromNodeOrdinal; nodeOrdinal < toNodeOrdinal; ++nodeOrdinal) {
      ++indexArray[dominatorsTree[nodeOrdinal]];
    }
    // Put in the first slot of each dominatedNodes slice the count of entries
    // that will be filled.
    let firstDominatedNodeIndex = 0;
    for (let i = 0, l = this.nodeCount; i < l; ++i) {
      const dominatedCount = dominatedNodes[firstDominatedNodeIndex] = indexArray[i];
      indexArray[i] = firstDominatedNodeIndex;
      firstDominatedNodeIndex += dominatedCount;
    }
    indexArray[this.nodeCount] = dominatedNodes.length;
    // Fill up the dominatedNodes array with indexes of dominated nodes. Skip the root (node at
    // index 0) as it is the only node that dominates itself.
    for (let nodeOrdinal = fromNodeOrdinal; nodeOrdinal < toNodeOrdinal; ++nodeOrdinal) {
      const dominatorOrdinal = dominatorsTree[nodeOrdinal];
      let dominatedRefIndex = indexArray[dominatorOrdinal];
      dominatedRefIndex += (--dominatedNodes[dominatedRefIndex]);
      dominatedNodes[dominatedRefIndex] = nodeOrdinal * nodeFieldCount;
    }
  }

  /**
   * Iterates children of a node.
   */
  _iterateFilteredChildren(
      nodeOrdinal: number, edgeFilterCallback: (arg0: number) => boolean, childCallback: (arg0: number) => void): void {
    const beginEdgeIndex = this._firstEdgeIndexes[nodeOrdinal];
    const endEdgeIndex = this._firstEdgeIndexes[nodeOrdinal + 1];
    for (let edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += this._edgeFieldsCount) {
      const childNodeIndex = this.containmentEdges[edgeIndex + this._edgeToNodeOffset];
      const childNodeOrdinal = childNodeIndex / this._nodeFieldCount;
      const type = this.containmentEdges[edgeIndex + this._edgeTypeOffset];
      if (!edgeFilterCallback(type)) {
        continue;
      }
      childCallback(childNodeOrdinal);
    }
  }

  /**
   * Adds a string to the snapshot.
   */
  _addString(string: string): number {
    this.strings.push(string);
    return this.strings.length - 1;
  }

  /**
    * The phase propagates whether a node is attached or detached through the
    * graph and adjusts the low-level representation of nodes.
    *
    * State propagation:
    * 1. Any object reachable from an attached object is itself attached.
    * 2. Any object reachable from a detached object that is not already
    *    attached is considered detached.
    *
    * Representation:
    * - Name of any detached node is changed from "<Name>"" to
    *   "Detached <Name>".
    */
  _propagateDOMState(): void {
    if (this._nodeDetachednessOffset === -1) {
      return;
    }

    console.time('propagateDOMState');

    const visited = new Uint8Array(this.nodeCount);
    const attached: number[] = [];
    const detached: number[] = [];

    const stringIndexCache = new Map<number, number>();

    /**
     * Adds a 'Detached ' prefix to the name of a node.
     */
    const addDetachedPrefixToNodeName = function(snapshot: HeapSnapshot, nodeIndex: number): void {
      const oldStringIndex = snapshot.nodes[nodeIndex + snapshot._nodeNameOffset];
      let newStringIndex = stringIndexCache.get(oldStringIndex);
      if (newStringIndex === undefined) {
        newStringIndex = snapshot._addString('Detached ' + snapshot.strings[oldStringIndex]);
        stringIndexCache.set(oldStringIndex, newStringIndex);
      }
      snapshot.nodes[nodeIndex + snapshot._nodeNameOffset] = newStringIndex;
    };

    /**
     * Processes a node represented by nodeOrdinal:
     * - Changes its name based on newState.
     * - Puts it onto working sets for attached or detached nodes.
     */
    const processNode = function(snapshot: HeapSnapshot, nodeOrdinal: number, newState: number): void {
      if (visited[nodeOrdinal]) {
        return;
      }

      const nodeIndex = nodeOrdinal * snapshot._nodeFieldCount;

      // Early bailout: Do not propagate the state (and name change) through JavaScript. Every
      // entry point into embedder code is a node that knows its own state. All embedder nodes
      // have their node type set to native.
      if (snapshot.nodes[nodeIndex + snapshot._nodeTypeOffset] !== snapshot._nodeNativeType) {
        visited[nodeOrdinal] = 1;
        return;
      }

      snapshot.nodes[nodeIndex + snapshot._nodeDetachednessOffset] = newState;

      if (newState === DOMLinkState.Attached) {
        attached.push(nodeOrdinal);
      } else if (newState === DOMLinkState.Detached) {
        // Detached state: Rewire node name.
        addDetachedPrefixToNodeName(snapshot, nodeIndex);
        detached.push(nodeOrdinal);
      }

      visited[nodeOrdinal] = 1;
    };

    const propagateState = function(snapshot: HeapSnapshot, parentNodeOrdinal: number, newState: number): void {
      snapshot._iterateFilteredChildren(
          parentNodeOrdinal,
          edgeType =>
              ![snapshot._edgeHiddenType, snapshot._edgeInvisibleType, snapshot._edgeWeakType].includes(edgeType),
          nodeOrdinal => processNode(snapshot, nodeOrdinal, newState));
    };

    // 1. We re-use the deserialized field to store the propagated state. While
    //    the state for known nodes is already set, they still need to go
    //    through processing to have their name adjusted and them enqueued in
    //    the respective queues.
    for (let nodeOrdinal = 0; nodeOrdinal < this.nodeCount; ++nodeOrdinal) {
      const state = this.nodes[nodeOrdinal * this._nodeFieldCount + this._nodeDetachednessOffset];
      // Bail out for objects that have no known state. For all other objects set that state.
      if (state === DOMLinkState.Unknown) {
        continue;
      }
      processNode(this, nodeOrdinal, state);
    }
    // 2. If the parent is attached, then the child is also attached.
    while (attached.length !== 0) {
      const nodeOrdinal = (attached.pop() as number);
      propagateState(this, nodeOrdinal, DOMLinkState.Attached);
    }
    // 3. If the parent is not attached, then the child inherits the parent's state.
    while (detached.length !== 0) {
      const nodeOrdinal = (detached.pop() as number);
      const nodeState = this.nodes[nodeOrdinal * this._nodeFieldCount + this._nodeDetachednessOffset];
      // Ignore if the node has been found through propagating forward attached state.
      if (nodeState === DOMLinkState.Attached) {
        continue;
      }
      propagateState(this, nodeOrdinal, DOMLinkState.Detached);
    }

    console.timeEnd('propagateDOMState');
  }

  _buildSamples(): void {
    const samples = this._rawSamples;
    if (!samples || !samples.length) {
      return;
    }
    const sampleCount = samples.length / 2;
    const sizeForRange = new Array(sampleCount);
    const timestamps = new Array(sampleCount);
    const lastAssignedIds = new Array(sampleCount);

    const timestampOffset = this._metaNode.sample_fields.indexOf('timestamp_us');
    const lastAssignedIdOffset = this._metaNode.sample_fields.indexOf('last_assigned_id');
    for (let i = 0; i < sampleCount; i++) {
      sizeForRange[i] = 0;
      timestamps[i] = (samples[2 * i + timestampOffset]) / 1000;
      lastAssignedIds[i] = samples[2 * i + lastAssignedIdOffset];
    }

    const nodes = this.nodes;
    const nodesLength = nodes.length;
    const nodeFieldCount = this._nodeFieldCount;
    const node = this.rootNode();
    for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      node.nodeIndex = nodeIndex;

      const nodeId = node.id();
      // JS objects have odd ids, skip native objects.
      if (nodeId % 2 === 0) {
        continue;
      }
      const rangeIndex =
          Platform.ArrayUtilities.lowerBound(lastAssignedIds, nodeId, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
      if (rangeIndex === sampleCount) {
        // TODO: make heap profiler not allocate while taking snapshot
        continue;
      }
      sizeForRange[rangeIndex] += node.selfSize();
    }
    this._samples = new HeapSnapshotModel.HeapSnapshotModel.Samples(timestamps, lastAssignedIds, sizeForRange);
  }

  _buildLocationMap(): void {
    const map = new Map<number, HeapSnapshotModel.HeapSnapshotModel.Location>();
    const locations = this._locations;

    for (let i = 0; i < locations.length; i += this._locationFieldCount) {
      const nodeIndex = locations[i + this._locationIndexOffset];
      const scriptId = locations[i + this._locationScriptIdOffset];
      const line = locations[i + this._locationLineOffset];
      const col = locations[i + this._locationColumnOffset];
      map.set(nodeIndex, new HeapSnapshotModel.HeapSnapshotModel.Location(scriptId, line, col));
    }

    this._locationMap = map;
  }

  getLocation(nodeIndex: number): HeapSnapshotModel.HeapSnapshotModel.Location|null {
    return this._locationMap.get(nodeIndex) || null;
  }

  getSamples(): HeapSnapshotModel.HeapSnapshotModel.Samples|null {
    return this._samples;
  }

  calculateFlags(): void {
    throw new Error('Not implemented');
  }

  calculateStatistics(): void {
    throw new Error('Not implemented');
  }

  userObjectsMapAndFlag(): {map: Uint32Array, flag: number}|null {
    throw new Error('Not implemented');
  }

  calculateSnapshotDiff(
      baseSnapshotId: string,
      baseSnapshotAggregates: {[x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff}):
      {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff} {
    let snapshotDiff: {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff}|{
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff,
    } = this._snapshotDiffs[baseSnapshotId];
    if (snapshotDiff) {
      return snapshotDiff;
    }
    snapshotDiff = ({} as {
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff,
    });

    const aggregates = this.aggregates(true, 'allObjects');
    for (const className in baseSnapshotAggregates) {
      const baseAggregate = baseSnapshotAggregates[className];
      const diff = this._calculateDiffForClass(baseAggregate, aggregates[className]);
      if (diff) {
        snapshotDiff[className] = diff;
      }
    }
    const emptyBaseAggregate = new HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff();
    for (const className in aggregates) {
      if (className in baseSnapshotAggregates) {
        continue;
      }
      const classDiff = this._calculateDiffForClass(emptyBaseAggregate, aggregates[className]);
      if (classDiff) {
        snapshotDiff[className] = classDiff;
      }
    }

    this._snapshotDiffs[baseSnapshotId] = snapshotDiff;
    return snapshotDiff;
  }

  _calculateDiffForClass(
      baseAggregate: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff,
      aggregate: HeapSnapshotModel.HeapSnapshotModel.Aggregate): HeapSnapshotModel.HeapSnapshotModel.Diff|null {
    const baseIds = baseAggregate.ids;
    const baseIndexes = baseAggregate.indexes;
    const baseSelfSizes = baseAggregate.selfSizes;

    const indexes = aggregate ? aggregate.idxs : [];

    let i = 0;
    let j = 0;
    const l = baseIds.length;
    const m = indexes.length;
    const diff = new HeapSnapshotModel.HeapSnapshotModel.Diff();

    const nodeB = this.createNode(indexes[j]);
    while (i < l && j < m) {
      const nodeAId = baseIds[i];
      if (nodeAId < nodeB.id()) {
        diff.deletedIndexes.push(baseIndexes[i]);
        diff.removedCount++;
        diff.removedSize += baseSelfSizes[i];
        ++i;
      } else if (
          nodeAId >
          nodeB.id()) {  // Native nodes(e.g. dom groups) may have ids less than max JS object id in the base snapshot
        diff.addedIndexes.push(indexes[j]);
        diff.addedCount++;
        diff.addedSize += nodeB.selfSize();
        nodeB.nodeIndex = indexes[++j];
      } else {  // nodeAId === nodeB.id()
        ++i;
        nodeB.nodeIndex = indexes[++j];
      }
    }
    while (i < l) {
      diff.deletedIndexes.push(baseIndexes[i]);
      diff.removedCount++;
      diff.removedSize += baseSelfSizes[i];
      ++i;
    }
    while (j < m) {
      diff.addedIndexes.push(indexes[j]);
      diff.addedCount++;
      diff.addedSize += nodeB.selfSize();
      nodeB.nodeIndex = indexes[++j];
    }
    diff.countDelta = diff.addedCount - diff.removedCount;
    diff.sizeDelta = diff.addedSize - diff.removedSize;
    if (!diff.addedCount && !diff.removedCount) {
      return null;
    }
    return diff;
  }

  _nodeForSnapshotObjectId(snapshotObjectId: number): HeapSnapshotNode|null {
    for (let it = this._allNodes(); it.hasNext(); it.next()) {
      if (it.node.id() === snapshotObjectId) {
        return it.node;
      }
    }
    return null;
  }

  nodeClassName(snapshotObjectId: number): string|null {
    const node = this._nodeForSnapshotObjectId(snapshotObjectId);
    if (node) {
      return node.className();
    }
    return null;
  }

  idsOfObjectsWithName(name: string): number[] {
    const ids = [];
    for (let it = this._allNodes(); it.hasNext(); it.next()) {
      if (it.item().name() === name) {
        ids.push(it.item().id());
      }
    }
    return ids;
  }

  createEdgesProvider(nodeIndex: number): HeapSnapshotEdgesProvider {
    const node = this.createNode(nodeIndex);
    const filter = this.containmentEdgesFilter();
    const indexProvider = new HeapSnapshotEdgeIndexProvider(this);
    return new HeapSnapshotEdgesProvider(this, filter, node.edges(), indexProvider);
  }

  createEdgesProviderForTest(nodeIndex: number, filter: ((arg0: HeapSnapshotEdge) => boolean)|null):
      HeapSnapshotEdgesProvider {
    const node = this.createNode(nodeIndex);
    const indexProvider = new HeapSnapshotEdgeIndexProvider(this);
    return new HeapSnapshotEdgesProvider(this, filter, node.edges(), indexProvider);
  }

  retainingEdgesFilter(): ((arg0: HeapSnapshotEdge) => boolean)|null {
    return null;
  }

  containmentEdgesFilter(): ((arg0: HeapSnapshotEdge) => boolean)|null {
    return null;
  }

  createRetainingEdgesProvider(nodeIndex: number): HeapSnapshotEdgesProvider {
    const node = this.createNode(nodeIndex);
    const filter = this.retainingEdgesFilter();
    const indexProvider = new HeapSnapshotRetainerEdgeIndexProvider(this);
    return new HeapSnapshotEdgesProvider(this, filter, node.retainers(), indexProvider);
  }

  createAddedNodesProvider(baseSnapshotId: string, className: string): HeapSnapshotNodesProvider {
    const snapshotDiff = this._snapshotDiffs[baseSnapshotId];
    const diffForClass = snapshotDiff[className];
    return new HeapSnapshotNodesProvider(this, diffForClass.addedIndexes);
  }

  createDeletedNodesProvider(nodeIndexes: number[]): HeapSnapshotNodesProvider {
    return new HeapSnapshotNodesProvider(this, nodeIndexes);
  }

  createNodesProviderForClass(className: string, nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter):
      HeapSnapshotNodesProvider {
    return new HeapSnapshotNodesProvider(this, this.aggregatesWithFilter(nodeFilter)[className].idxs);
  }

  _maxJsNodeId(): number {
    const nodeFieldCount = this._nodeFieldCount;
    const nodes = this.nodes;
    const nodesLength = nodes.length;
    let id = 0;
    for (let nodeIndex = this._nodeIdOffset; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      const nextId = nodes[nodeIndex];
      // JS objects have odd ids, skip native objects.
      if (nextId % 2 === 0) {
        continue;
      }
      if (id < nextId) {
        id = nextId;
      }
    }
    return id;
  }

  updateStaticData(): HeapSnapshotModel.HeapSnapshotModel.StaticData {
    return new HeapSnapshotModel.HeapSnapshotModel.StaticData(
        this.nodeCount, this._rootNodeIndex, this.totalSize, this._maxJsNodeId());
  }
}

class HeapSnapshotMetainfo {
  location_fields: string[] = [];              // eslint-disable-line @typescript-eslint/naming-convention
  node_fields: string[] = [];                  // eslint-disable-line @typescript-eslint/naming-convention
  node_types: string[][] = [];                 // eslint-disable-line @typescript-eslint/naming-convention
  edge_fields: string[] = [];                  // eslint-disable-line @typescript-eslint/naming-convention
  edge_types: string[][] = [];                 // eslint-disable-line @typescript-eslint/naming-convention
  trace_function_info_fields: string[] = [];   // eslint-disable-line @typescript-eslint/naming-convention
  trace_node_fields: string[] = [];            // eslint-disable-line @typescript-eslint/naming-convention
  sample_fields: string[] = [];                // eslint-disable-line @typescript-eslint/naming-convention
  type_strings: {[key: string]: string} = {};  // eslint-disable-line @typescript-eslint/naming-convention
}

export class HeapSnapshotHeader {
  title: string;
  meta: HeapSnapshotMetainfo;
  node_count: number;            // eslint-disable-line @typescript-eslint/naming-convention
  edge_count: number;            // eslint-disable-line @typescript-eslint/naming-convention
  trace_function_count: number;  // eslint-disable-line @typescript-eslint/naming-convention
  root_index: number;            // eslint-disable-line @typescript-eslint/naming-convention
  constructor() {
    // New format.
    this.title = '';
    this.meta = new HeapSnapshotMetainfo();
    this.node_count = 0;
    this.edge_count = 0;
    this.trace_function_count = 0;
    this.root_index = 0;
  }
}

export abstract class HeapSnapshotItemProvider {
  _iterator: HeapSnapshotItemIterator;
  _indexProvider: HeapSnapshotItemIndexProvider;
  _isEmpty: boolean;
  _iterationOrder: number[]|null;
  _currentComparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig|null;
  _sortedPrefixLength: number;
  _sortedSuffixLength: number;
  constructor(iterator: HeapSnapshotItemIterator, indexProvider: HeapSnapshotItemIndexProvider) {
    this._iterator = iterator;
    this._indexProvider = indexProvider;
    this._isEmpty = !iterator.hasNext();
    this._iterationOrder = null;
    this._currentComparator = null;
    this._sortedPrefixLength = 0;
    this._sortedSuffixLength = 0;
  }

  _createIterationOrder(): void {
    if (this._iterationOrder) {
      return;
    }
    this._iterationOrder = [];
    for (let iterator = this._iterator; iterator.hasNext(); iterator.next()) {
      this._iterationOrder.push(iterator.item().itemIndex());
    }
  }

  isEmpty(): boolean {
    return this._isEmpty;
  }

  serializeItemsRange(begin: number, end: number): HeapSnapshotModel.HeapSnapshotModel.ItemsRange {
    this._createIterationOrder();
    if (begin > end) {
      throw new Error('Start position > end position: ' + begin + ' > ' + end);
    }

    if (!this._iterationOrder) {
      throw new Error('Iteration order undefined');
    }

    if (end > this._iterationOrder.length) {
      end = this._iterationOrder.length;
    }
    if (this._sortedPrefixLength < end && begin < this._iterationOrder.length - this._sortedSuffixLength &&
        this._currentComparator) {
      const currentComparator = this._currentComparator;
      this.sort(
          currentComparator, this._sortedPrefixLength, this._iterationOrder.length - 1 - this._sortedSuffixLength,
          begin, end - 1);
      if (begin <= this._sortedPrefixLength) {
        this._sortedPrefixLength = end;
      }
      if (end >= this._iterationOrder.length - this._sortedSuffixLength) {
        this._sortedSuffixLength = this._iterationOrder.length - begin;
      }
    }
    let position = begin;
    const count = end - begin;
    const result = new Array(count);
    for (let i = 0; i < count; ++i) {
      const itemIndex = this._iterationOrder[position++];
      const item = this._indexProvider.itemForIndex(itemIndex);
      result[i] = item.serialize();
    }
    return new HeapSnapshotModel.HeapSnapshotModel.ItemsRange(begin, end, this._iterationOrder.length, result);
  }

  sortAndRewind(comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig): void {
    this._currentComparator = comparator;
    this._sortedPrefixLength = 0;
    this._sortedSuffixLength = 0;
  }

  abstract sort(
      comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig, leftBound: number, rightBound: number,
      windowLeft: number, windowRight: number): void;
}

export class HeapSnapshotEdgesProvider extends HeapSnapshotItemProvider {
  snapshot: HeapSnapshot;
  constructor(
      snapshot: HeapSnapshot, filter: ((arg0: HeapSnapshotEdge) => boolean)|null,
      edgesIter: HeapSnapshotEdgeIterator|HeapSnapshotRetainerEdgeIterator,
      indexProvider: HeapSnapshotItemIndexProvider) {
    const iter = filter ? new HeapSnapshotFilteredIterator(edgesIter, (filter as (arg0: HeapSnapshotItem) => boolean)) :
                          edgesIter;
    super(iter, indexProvider);
    this.snapshot = snapshot;
  }

  sort(
      comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig, leftBound: number, rightBound: number,
      windowLeft: number, windowRight: number): void {
    const fieldName1 = comparator.fieldName1;
    const fieldName2 = comparator.fieldName2;
    const ascending1 = comparator.ascending1;
    const ascending2 = comparator.ascending2;

    const edgeA = (this._iterator.item() as HeapSnapshotEdge).clone();
    const edgeB = edgeA.clone();
    const nodeA = this.snapshot.createNode();
    const nodeB = this.snapshot.createNode();

    function compareEdgeFieldName(ascending: boolean, indexA: number, indexB: number): number {
      edgeA.edgeIndex = indexA;
      edgeB.edgeIndex = indexB;
      if (edgeB.name() === '__proto__') {
        return -1;
      }
      if (edgeA.name() === '__proto__') {
        return 1;
      }
      const result = edgeA.hasStringName() === edgeB.hasStringName() ?
          (edgeA.name() < edgeB.name() ? -1 : (edgeA.name() > edgeB.name() ? 1 : 0)) :
          (edgeA.hasStringName() ? -1 : 1);
      return ascending ? result : -result;
    }

    function compareNodeField(fieldName: string, ascending: boolean, indexA: number, indexB: number): number {
      edgeA.edgeIndex = indexA;
      nodeA.nodeIndex = edgeA.nodeIndex();
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valueA = (nodeA as any)[fieldName]();

      edgeB.edgeIndex = indexB;
      nodeB.nodeIndex = edgeB.nodeIndex();
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valueB = (nodeB as any)[fieldName]();

      const result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
      return ascending ? result : -result;
    }

    function compareEdgeAndNode(indexA: number, indexB: number): number {
      let result = compareEdgeFieldName(ascending1, indexA, indexB);
      if (result === 0) {
        result = compareNodeField(fieldName2, ascending2, indexA, indexB);
      }
      if (result === 0) {
        return indexA - indexB;
      }
      return result;
    }

    function compareNodeAndEdge(indexA: number, indexB: number): number {
      let result = compareNodeField(fieldName1, ascending1, indexA, indexB);
      if (result === 0) {
        result = compareEdgeFieldName(ascending2, indexA, indexB);
      }
      if (result === 0) {
        return indexA - indexB;
      }
      return result;
    }

    function compareNodeAndNode(indexA: number, indexB: number): number {
      let result = compareNodeField(fieldName1, ascending1, indexA, indexB);
      if (result === 0) {
        result = compareNodeField(fieldName2, ascending2, indexA, indexB);
      }
      if (result === 0) {
        return indexA - indexB;
      }
      return result;
    }

    if (!this._iterationOrder) {
      throw new Error('Iteration order not defined');
    }

    if (fieldName1 === '!edgeName') {
      Platform.ArrayUtilities.sortRange(
          this._iterationOrder, compareEdgeAndNode, leftBound, rightBound, windowLeft, windowRight);
    } else if (fieldName2 === '!edgeName') {
      Platform.ArrayUtilities.sortRange(
          this._iterationOrder, compareNodeAndEdge, leftBound, rightBound, windowLeft, windowRight);
    } else {
      Platform.ArrayUtilities.sortRange(
          this._iterationOrder, compareNodeAndNode, leftBound, rightBound, windowLeft, windowRight);
    }
  }
}

export class HeapSnapshotNodesProvider extends HeapSnapshotItemProvider {
  snapshot: HeapSnapshot;
  constructor(snapshot: HeapSnapshot, nodeIndexes: number[]|Uint32Array) {
    const indexProvider = new HeapSnapshotNodeIndexProvider(snapshot);
    const it = new HeapSnapshotIndexRangeIterator(indexProvider, nodeIndexes);
    super(it, indexProvider);
    this.snapshot = snapshot;
  }

  nodePosition(snapshotObjectId: number): number {
    this._createIterationOrder();
    const node = this.snapshot.createNode();
    let i = 0;
    if (!this._iterationOrder) {
      throw new Error('Iteration order not defined');
    }

    for (; i < this._iterationOrder.length; i++) {
      node.nodeIndex = this._iterationOrder[i];
      if (node.id() === snapshotObjectId) {
        break;
      }
    }
    if (i === this._iterationOrder.length) {
      return -1;
    }
    const targetNodeIndex = this._iterationOrder[i];
    let smallerCount = 0;

    const currentComparator = (this._currentComparator as HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig);
    const compare = this._buildCompareFunction(currentComparator);
    for (let i = 0; i < this._iterationOrder.length; i++) {
      if (compare(this._iterationOrder[i], targetNodeIndex) < 0) {
        ++smallerCount;
      }
    }
    return smallerCount;
  }

  _buildCompareFunction(comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig):
      (arg0: number, arg1: number) => number {
    const nodeA = this.snapshot.createNode();
    const nodeB = this.snapshot.createNode();
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldAccessor1 = (nodeA as any)[comparator.fieldName1];
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldAccessor2 = (nodeA as any)[comparator.fieldName2];
    const ascending1 = comparator.ascending1 ? 1 : -1;
    const ascending2 = comparator.ascending2 ? 1 : -1;

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sortByNodeField(fieldAccessor: () => any, ascending: number): number {
      const valueA = fieldAccessor.call(nodeA);
      const valueB = fieldAccessor.call(nodeB);
      return valueA < valueB ? -ascending : (valueA > valueB ? ascending : 0);
    }

    function sortByComparator(indexA: number, indexB: number): number {
      nodeA.nodeIndex = indexA;
      nodeB.nodeIndex = indexB;
      let result = sortByNodeField(fieldAccessor1, ascending1);
      if (result === 0) {
        result = sortByNodeField(fieldAccessor2, ascending2);
      }
      return result || indexA - indexB;
    }

    return sortByComparator;
  }

  sort(
      comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig, leftBound: number, rightBound: number,
      windowLeft: number, windowRight: number): void {
    if (!this._iterationOrder) {
      throw new Error('Iteration order not defined');
    }

    Platform.ArrayUtilities.sortRange(
        this._iterationOrder, this._buildCompareFunction(comparator), leftBound, rightBound, windowLeft, windowRight);
  }
}

export class JSHeapSnapshot extends HeapSnapshot {
  _nodeFlags: {
    // bit flags
    canBeQueried: number,
    detachedDOMTreeNode: number,
    pageObject:
        number,  // The idea is to track separately the objects owned by the page and the objects owned by debugger.
  };
  _lazyStringCache: {};
  _flags!: Uint32Array;
  _statistics?: HeapSnapshotModel.HeapSnapshotModel.Statistics;
  constructor(profile: Profile, progress: HeapSnapshotProgress) {
    super(profile, progress);
    this._nodeFlags = {
      // bit flags
      canBeQueried: 1,
      detachedDOMTreeNode: 2,
      pageObject:
          4,  // The idea is to track separately the objects owned by the page and the objects owned by debugger.
    };
    this._lazyStringCache = {};
    this.initialize();
  }

  createNode(nodeIndex?: number): JSHeapSnapshotNode {
    return new JSHeapSnapshotNode(this, nodeIndex === undefined ? -1 : nodeIndex);
  }

  createEdge(edgeIndex: number): JSHeapSnapshotEdge {
    return new JSHeapSnapshotEdge(this, edgeIndex);
  }

  createRetainingEdge(retainerIndex: number): JSHeapSnapshotRetainerEdge {
    return new JSHeapSnapshotRetainerEdge(this, retainerIndex);
  }

  containmentEdgesFilter(): (arg0: HeapSnapshotEdge) => boolean {
    return (edge: HeapSnapshotEdge): boolean => !edge.isInvisible();
  }

  retainingEdgesFilter(): (arg0: HeapSnapshotEdge) => boolean {
    const containmentEdgesFilter = this.containmentEdgesFilter();
    function filter(edge: HeapSnapshotEdge): boolean {
      return containmentEdgesFilter(edge) && !edge.node().isRoot() && !edge.isWeak();
    }
    return filter;
  }

  calculateFlags(): void {
    this._flags = new Uint32Array(this.nodeCount);
    this._markDetachedDOMTreeNodes();
    this._markQueriableHeapObjects();
    this._markPageOwnedNodes();
  }

  calculateDistances(): void {
    function filter(node: HeapSnapshotNode, edge: HeapSnapshotEdge): boolean {
      if (node.isHidden()) {
        return edge.name() !== 'sloppy_function_map' || node.rawName() !== 'system / NativeContext';
      }
      if (node.isArray()) {
        // DescriptorArrays are fixed arrays used to hold instance descriptors.
        // The format of the these objects is:
        //   [0]: Number of descriptors
        //   [1]: Either Smi(0) if uninitialized, or a pointer to small fixed array:
        //          [0]: pointer to fixed array with enum cache
        //          [1]: either Smi(0) or pointer to fixed array with indices
        //   [i*3+2]: i-th key
        //   [i*3+3]: i-th type
        //   [i*3+4]: i-th descriptor
        // As long as maps may share descriptor arrays some of the descriptor
        // links may not be valid for all the maps. We just skip
        // all the descriptor links when calculating distances.
        // For more details see http://crbug.com/413608
        if (node.rawName() !== '(map descriptors)') {
          return true;
        }
        const index = parseInt(edge.name(), 10);
        return index < 2 || (index % 3) !== 1;
      }
      return true;
    }
    super.calculateDistances(filter);
  }

  isUserRoot(node: HeapSnapshotNode): boolean {
    return node.isUserRoot() || node.isDocumentDOMTreesRoot();
  }

  userObjectsMapAndFlag(): {map: Uint32Array, flag: number}|null {
    return {map: this._flags, flag: this._nodeFlags.pageObject};
  }

  _flagsOfNode(node: HeapSnapshotNode): number {
    return this._flags[node.nodeIndex / this._nodeFieldCount];
  }

  _markDetachedDOMTreeNodes(): void {
    const nodes = this.nodes;
    const nodesLength = nodes.length;
    const nodeFieldCount = this._nodeFieldCount;
    const nodeNativeType = this._nodeNativeType;
    const nodeTypeOffset = this._nodeTypeOffset;
    const flag = this._nodeFlags.detachedDOMTreeNode;
    const node = this.rootNode();
    for (let nodeIndex = 0, ordinal = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount, ordinal++) {
      const nodeType = nodes[nodeIndex + nodeTypeOffset];
      if (nodeType !== nodeNativeType) {
        continue;
      }
      node.nodeIndex = nodeIndex;
      if (node.name().startsWith('Detached ')) {
        this._flags[ordinal] |= flag;
      }
    }
  }

  _markQueriableHeapObjects(): void {
    // Allow runtime properties query for objects accessible from Window objects
    // via regular properties, and for DOM wrappers. Trying to access random objects
    // can cause a crash due to insonsistent state of internal properties of wrappers.
    const flag = this._nodeFlags.canBeQueried;
    const hiddenEdgeType = this._edgeHiddenType;
    const internalEdgeType = this._edgeInternalType;
    const invisibleEdgeType = this._edgeInvisibleType;
    const weakEdgeType = this._edgeWeakType;
    const edgeToNodeOffset = this._edgeToNodeOffset;
    const edgeTypeOffset = this._edgeTypeOffset;
    const edgeFieldsCount = this._edgeFieldsCount;
    const containmentEdges = this.containmentEdges;
    const nodeFieldCount = this._nodeFieldCount;
    const firstEdgeIndexes = this._firstEdgeIndexes;

    const flags = (this._flags as Uint32Array);
    const list: number[] = [];

    for (let iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
      if (iter.edge.node().isUserRoot()) {
        list.push(iter.edge.node().nodeIndex / nodeFieldCount);
      }
    }

    while (list.length) {
      const nodeOrdinal = (list.pop() as number);
      if (flags[nodeOrdinal] & flag) {
        continue;
      }
      flags[nodeOrdinal] |= flag;
      const beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      const endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      for (let edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
        const childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
        const childNodeOrdinal = childNodeIndex / nodeFieldCount;
        if (flags[childNodeOrdinal] & flag) {
          continue;
        }
        const type = containmentEdges[edgeIndex + edgeTypeOffset];
        if (type === hiddenEdgeType || type === invisibleEdgeType || type === internalEdgeType ||
            type === weakEdgeType) {
          continue;
        }
        list.push(childNodeOrdinal);
      }
    }
  }

  _markPageOwnedNodes(): void {
    const edgeShortcutType = this._edgeShortcutType;
    const edgeElementType = this._edgeElementType;
    const edgeToNodeOffset = this._edgeToNodeOffset;
    const edgeTypeOffset = this._edgeTypeOffset;
    const edgeFieldsCount = this._edgeFieldsCount;
    const edgeWeakType = this._edgeWeakType;
    const firstEdgeIndexes = this._firstEdgeIndexes;
    const containmentEdges = this.containmentEdges;
    const nodeFieldCount = this._nodeFieldCount;
    const nodesCount = this.nodeCount;

    const flags = (this._flags as Uint32Array);
    const pageObjectFlag = this._nodeFlags.pageObject;

    const nodesToVisit = new Uint32Array(nodesCount);
    let nodesToVisitLength = 0;

    const rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;
    const node = this.rootNode();

    // Populate the entry points. They are Window objects and DOM Tree Roots.
    for (let edgeIndex = firstEdgeIndexes[rootNodeOrdinal], endEdgeIndex = firstEdgeIndexes[rootNodeOrdinal + 1];
         edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
      const edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
      const nodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
      if (edgeType === edgeElementType) {
        node.nodeIndex = nodeIndex;
        if (!node.isDocumentDOMTreesRoot()) {
          continue;
        }
      } else if (edgeType !== edgeShortcutType) {
        continue;
      }
      const nodeOrdinal = nodeIndex / nodeFieldCount;
      nodesToVisit[nodesToVisitLength++] = nodeOrdinal;
      flags[nodeOrdinal] |= pageObjectFlag;
    }

    // Mark everything reachable with the pageObject flag.
    while (nodesToVisitLength) {
      const nodeOrdinal = nodesToVisit[--nodesToVisitLength];
      const beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      const endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      for (let edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
        const childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
        const childNodeOrdinal = childNodeIndex / nodeFieldCount;
        if (flags[childNodeOrdinal] & pageObjectFlag) {
          continue;
        }
        const type = containmentEdges[edgeIndex + edgeTypeOffset];
        if (type === edgeWeakType) {
          continue;
        }
        nodesToVisit[nodesToVisitLength++] = childNodeOrdinal;
        flags[childNodeOrdinal] |= pageObjectFlag;
      }
    }
  }

  calculateStatistics(): void {
    const nodeFieldCount = this._nodeFieldCount;
    const nodes = this.nodes;
    const nodesLength = nodes.length;
    const nodeTypeOffset = this._nodeTypeOffset;
    const nodeSizeOffset = this._nodeSelfSizeOffset;
    const nodeNativeType = this._nodeNativeType;
    const nodeCodeType = this._nodeCodeType;
    const nodeConsStringType = this._nodeConsStringType;
    const nodeSlicedStringType = this._nodeSlicedStringType;
    const distances = this._nodeDistances;
    let sizeNative = 0;
    let sizeCode = 0;
    let sizeStrings = 0;
    let sizeJSArrays = 0;
    let sizeSystem = 0;
    const node = this.rootNode();
    for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      const nodeSize = nodes[nodeIndex + nodeSizeOffset];
      const ordinal = nodeIndex / nodeFieldCount;
      if (distances[ordinal] >= HeapSnapshotModel.HeapSnapshotModel.baseSystemDistance) {
        sizeSystem += nodeSize;
        continue;
      }
      const nodeType = nodes[nodeIndex + nodeTypeOffset];
      node.nodeIndex = nodeIndex;
      if (nodeType === nodeNativeType) {
        sizeNative += nodeSize;
      } else if (nodeType === nodeCodeType) {
        sizeCode += nodeSize;
      } else if (nodeType === nodeConsStringType || nodeType === nodeSlicedStringType || node.type() === 'string') {
        sizeStrings += nodeSize;
      } else if (node.name() === 'Array') {
        sizeJSArrays += this._calculateArraySize(node);
      }
    }
    this._statistics = new HeapSnapshotModel.HeapSnapshotModel.Statistics();
    this._statistics.total = this.totalSize;
    this._statistics.v8heap = this.totalSize - sizeNative;
    this._statistics.native = sizeNative;
    this._statistics.code = sizeCode;
    this._statistics.jsArrays = sizeJSArrays;
    this._statistics.strings = sizeStrings;
    this._statistics.system = sizeSystem;
  }

  _calculateArraySize(node: HeapSnapshotNode): number {
    let size = node.selfSize();
    const beginEdgeIndex = node.edgeIndexesStart();
    const endEdgeIndex = node.edgeIndexesEnd();
    const containmentEdges = this.containmentEdges;
    const strings = this.strings;
    const edgeToNodeOffset = this._edgeToNodeOffset;
    const edgeTypeOffset = this._edgeTypeOffset;
    const edgeNameOffset = this._edgeNameOffset;
    const edgeFieldsCount = this._edgeFieldsCount;
    const edgeInternalType = this._edgeInternalType;
    for (let edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
      const edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
      if (edgeType !== edgeInternalType) {
        continue;
      }
      const edgeName = strings[containmentEdges[edgeIndex + edgeNameOffset]];
      if (edgeName !== 'elements') {
        continue;
      }
      const elementsNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
      node.nodeIndex = elementsNodeIndex;
      if (node.retainersCount() === 1) {
        size += node.selfSize();
      }
      break;
    }
    return size;
  }

  getStatistics(): HeapSnapshotModel.HeapSnapshotModel.Statistics {
    return /** @type {!HeapSnapshotModel.HeapSnapshotModel.Statistics} */ this._statistics as
        HeapSnapshotModel.HeapSnapshotModel.Statistics;
  }
}

export class JSHeapSnapshotNode extends HeapSnapshotNode {
  constructor(snapshot: JSHeapSnapshot, nodeIndex?: number) {
    super(snapshot, nodeIndex);
  }

  canBeQueried(): boolean {
    const snapshot = (this._snapshot as JSHeapSnapshot);
    const flags = snapshot._flagsOfNode(this);
    return Boolean(flags & snapshot._nodeFlags.canBeQueried);
  }

  rawName(): string {
    return super.name();
  }

  name(): string {
    const snapshot = this._snapshot;
    if (this.rawType() === snapshot._nodeConsStringType) {
      let string: string = snapshot._lazyStringCache[this.nodeIndex];
      if (typeof string === 'undefined') {
        string = this._consStringName();
        snapshot._lazyStringCache[this.nodeIndex] = string;
      }
      return string;
    }
    return this.rawName();
  }

  _consStringName(): string {
    const snapshot = this._snapshot;
    const consStringType = snapshot._nodeConsStringType;
    const edgeInternalType = snapshot._edgeInternalType;
    const edgeFieldsCount = snapshot._edgeFieldsCount;
    const edgeToNodeOffset = snapshot._edgeToNodeOffset;
    const edgeTypeOffset = snapshot._edgeTypeOffset;
    const edgeNameOffset = snapshot._edgeNameOffset;
    const strings = snapshot.strings;
    const edges = snapshot.containmentEdges;
    const firstEdgeIndexes = snapshot._firstEdgeIndexes;
    const nodeFieldCount = snapshot._nodeFieldCount;
    const nodeTypeOffset = snapshot._nodeTypeOffset;
    const nodeNameOffset = snapshot._nodeNameOffset;
    const nodes = snapshot.nodes;
    const nodesStack = [];
    nodesStack.push(this.nodeIndex);
    let name = '';

    while (nodesStack.length && name.length < 1024) {
      const nodeIndex = (nodesStack.pop() as number);
      if (nodes[nodeIndex + nodeTypeOffset] !== consStringType) {
        name += strings[nodes[nodeIndex + nodeNameOffset]];
        continue;
      }
      const nodeOrdinal = nodeIndex / nodeFieldCount;
      const beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      const endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      let firstNodeIndex = 0;
      let secondNodeIndex = 0;
      for (let edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex && (!firstNodeIndex || !secondNodeIndex);
           edgeIndex += edgeFieldsCount) {
        const edgeType = edges[edgeIndex + edgeTypeOffset];
        if (edgeType === edgeInternalType) {
          const edgeName = strings[edges[edgeIndex + edgeNameOffset]];
          if (edgeName === 'first') {
            firstNodeIndex = edges[edgeIndex + edgeToNodeOffset];
          } else if (edgeName === 'second') {
            secondNodeIndex = edges[edgeIndex + edgeToNodeOffset];
          }
        }
      }
      nodesStack.push(secondNodeIndex);
      nodesStack.push(firstNodeIndex);
    }
    return name;
  }

  className(): string {
    const type = this.type();
    switch (type) {
      case 'hidden':
        return '(system)';
      case 'object':
      case 'native':
        return this.name();
      case 'code':
        return '(compiled code)';
      default:
        return '(' + type + ')';
    }
  }

  classIndex(): number {
    const snapshot = this._snapshot;
    const nodes = snapshot.nodes;
    const type = nodes[this.nodeIndex + snapshot._nodeTypeOffset];
    if (type === snapshot._nodeObjectType || type === snapshot._nodeNativeType) {
      return nodes[this.nodeIndex + snapshot._nodeNameOffset];
    }
    return -1 - type;
  }

  id(): number {
    const snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeIdOffset];
  }

  isHidden(): boolean {
    return this.rawType() === this._snapshot._nodeHiddenType;
  }

  isArray(): boolean {
    return this.rawType() === this._snapshot._nodeArrayType;
  }

  isSynthetic(): boolean {
    return this.rawType() === this._snapshot._nodeSyntheticType;
  }

  isUserRoot(): boolean {
    return !this.isSynthetic();
  }

  isDocumentDOMTreesRoot(): boolean {
    return this.isSynthetic() && this.name() === '(Document DOM trees)';
  }

  serialize(): HeapSnapshotModel.HeapSnapshotModel.Node {
    const result = super.serialize();
    const snapshot = (this._snapshot as JSHeapSnapshot);
    const flags = snapshot._flagsOfNode(this);
    if (flags & snapshot._nodeFlags.canBeQueried) {
      result.canBeQueried = true;
    }
    if (flags & snapshot._nodeFlags.detachedDOMTreeNode) {
      result.detachedDOMTreeNode = true;
    }
    return result;
  }
}

export class JSHeapSnapshotEdge extends HeapSnapshotEdge {
  constructor(snapshot: JSHeapSnapshot, edgeIndex?: number) {
    super(snapshot, edgeIndex);
  }

  clone(): JSHeapSnapshotEdge {
    const snapshot = (this._snapshot as JSHeapSnapshot);
    return new JSHeapSnapshotEdge(snapshot, this.edgeIndex);
  }

  hasStringName(): boolean {
    if (!this.isShortcut()) {
      return this._hasStringName();
    }
    // @ts-ignore parseInt is successful against numbers.
    return isNaN(parseInt(this._name(), 10));
  }

  isElement(): boolean {
    return this.rawType() === this._snapshot._edgeElementType;
  }

  isHidden(): boolean {
    return this.rawType() === this._snapshot._edgeHiddenType;
  }

  isWeak(): boolean {
    return this.rawType() === this._snapshot._edgeWeakType;
  }

  isInternal(): boolean {
    return this.rawType() === this._snapshot._edgeInternalType;
  }

  isInvisible(): boolean {
    return this.rawType() === this._snapshot._edgeInvisibleType;
  }

  isShortcut(): boolean {
    return this.rawType() === this._snapshot._edgeShortcutType;
  }

  name(): string {
    const name = this._name();
    if (!this.isShortcut()) {
      return String(name);
    }
    // @ts-ignore parseInt is successful against numbers.
    const numName = parseInt(name, 10);
    return String(isNaN(numName) ? name : numName);
  }

  toString(): string {
    const name = this.name();
    switch (this.type()) {
      case 'context':
        return '->' + name;
      case 'element':
        return '[' + name + ']';
      case 'weak':
        return '[[' + name + ']]';
      case 'property':
        return name.indexOf(' ') === -1 ? '.' + name : '["' + name + '"]';
      case 'shortcut':
        if (typeof name === 'string') {
          return name.indexOf(' ') === -1 ? '.' + name : '["' + name + '"]';
        }
        return '[' + name + ']';
      case 'internal':
      case 'hidden':
      case 'invisible':
        return '{' + name + '}';
    }
    return '?' + name + '?';
  }

  _hasStringName(): boolean {
    const type = this.rawType();
    const snapshot = this._snapshot;
    return type !== snapshot._edgeElementType && type !== snapshot._edgeHiddenType;
  }

  _name(): string|number {
    return this._hasStringName() ? this._snapshot.strings[this._nameOrIndex()] : this._nameOrIndex();
  }

  _nameOrIndex(): number {
    return this._edges[this.edgeIndex + this._snapshot._edgeNameOffset];
  }

  rawType(): number {
    return this._edges[this.edgeIndex + this._snapshot._edgeTypeOffset];
  }
}

export class JSHeapSnapshotRetainerEdge extends HeapSnapshotRetainerEdge {
  constructor(snapshot: JSHeapSnapshot, retainerIndex: number) {
    super(snapshot, retainerIndex);
  }

  clone(): JSHeapSnapshotRetainerEdge {
    const snapshot = (this._snapshot as JSHeapSnapshot);
    return new JSHeapSnapshotRetainerEdge(snapshot, this.retainerIndex());
  }

  isHidden(): boolean {
    return this._edge().isHidden();
  }

  isInternal(): boolean {
    return this._edge().isInternal();
  }

  isInvisible(): boolean {
    return this._edge().isInvisible();
  }

  isShortcut(): boolean {
    return this._edge().isShortcut();
  }

  isWeak(): boolean {
    return this._edge().isWeak();
  }
}
export interface AggregatedInfo {
  count: number;
  distance: number;
  self: number;
  maxRet: number;
  name: string|null;
  idxs: number[];
}
