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

/* eslint-disable rulesdir/use_private_class_members */

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as HeapSnapshotModel from '../../models/heap_snapshot_model/heap_snapshot_model.js';

import {AllocationProfile} from './AllocationProfile.js';
import type {HeapSnapshotWorkerDispatcher} from './HeapSnapshotWorkerDispatcher.js';

export interface HeapSnapshotItem {
  itemIndex(): number;

  serialize(): Object;
}

export class HeapSnapshotEdge implements HeapSnapshotItem {
  snapshot: HeapSnapshot;
  protected readonly edges: Platform.TypedArrayUtilities.BigUint32Array;
  edgeIndex: number;
  constructor(snapshot: HeapSnapshot, edgeIndex?: number) {
    this.snapshot = snapshot;
    this.edges = snapshot.containmentEdges;
    this.edgeIndex = edgeIndex || 0;
  }

  clone(): HeapSnapshotEdge {
    return new HeapSnapshotEdge(this.snapshot, this.edgeIndex);
  }

  hasStringName(): boolean {
    throw new Error('Not implemented');
  }

  name(): string {
    throw new Error('Not implemented');
  }

  node(): HeapSnapshotNode {
    return this.snapshot.createNode(this.nodeIndex());
  }

  nodeIndex(): number {
    if (typeof this.snapshot.edgeToNodeOffset === 'undefined') {
      throw new Error('edgeToNodeOffset is undefined');
    }

    return this.edges.getValue(this.edgeIndex + this.snapshot.edgeToNodeOffset);
  }

  toString(): string {
    return 'HeapSnapshotEdge: ' + this.name();
  }

  type(): string {
    return this.snapshot.edgeTypes[this.rawType()];
  }

  itemIndex(): number {
    return this.edgeIndex;
  }

  serialize(): HeapSnapshotModel.HeapSnapshotModel.Edge {
    return new HeapSnapshotModel.HeapSnapshotModel.Edge(
        this.name(), this.node().serialize(), this.type(), this.edgeIndex);
  }

  rawType(): number {
    if (typeof this.snapshot.edgeTypeOffset === 'undefined') {
      throw new Error('edgeTypeOffset is undefined');
    }

    return this.edges.getValue(this.edgeIndex + this.snapshot.edgeTypeOffset);
  }

  isInternal(): boolean {
    throw new Error('Not implemented');
  }

  isInvisible(): boolean {
    throw new Error('Not implemented');
  }

  isWeak(): boolean {
    throw new Error('Not implemented');
  }

  getValueForSorting(_fieldName: string): number {
    throw new Error('Not implemented');
  }

  nameIndex(): number {
    throw new Error('Not implemented');
  }
}

export interface HeapSnapshotItemIterator {
  hasNext(): boolean;

  item(): HeapSnapshotItem;

  next(): void;
}

export interface HeapSnapshotItemIndexProvider {
  itemForIndex(newIndex: number): HeapSnapshotItem;
}

export class HeapSnapshotNodeIndexProvider implements HeapSnapshotItemIndexProvider {
  #node: HeapSnapshotNode;
  constructor(snapshot: HeapSnapshot) {
    this.#node = snapshot.createNode();
  }

  itemForIndex(index: number): HeapSnapshotNode {
    this.#node.nodeIndex = index;
    return this.#node;
  }
}

export class HeapSnapshotEdgeIndexProvider implements HeapSnapshotItemIndexProvider {
  #edge: JSHeapSnapshotEdge;
  constructor(snapshot: HeapSnapshot) {
    this.#edge = snapshot.createEdge(0);
  }

  itemForIndex(index: number): HeapSnapshotEdge {
    this.#edge.edgeIndex = index;
    return this.#edge;
  }
}

export class HeapSnapshotRetainerEdgeIndexProvider implements HeapSnapshotItemIndexProvider {
  readonly #retainerEdge: JSHeapSnapshotRetainerEdge;
  constructor(snapshot: HeapSnapshot) {
    this.#retainerEdge = snapshot.createRetainingEdge(0);
  }

  itemForIndex(index: number): HeapSnapshotRetainerEdge {
    this.#retainerEdge.setRetainerIndex(index);
    return this.#retainerEdge;
  }
}

export class HeapSnapshotEdgeIterator implements HeapSnapshotItemIterator {
  readonly #sourceNode: HeapSnapshotNode;
  edge: JSHeapSnapshotEdge;
  constructor(node: HeapSnapshotNode) {
    this.#sourceNode = node;
    this.edge = node.snapshot.createEdge(node.edgeIndexesStart());
  }

  hasNext(): boolean {
    return this.edge.edgeIndex < this.#sourceNode.edgeIndexesEnd();
  }

  item(): HeapSnapshotEdge {
    return this.edge;
  }

  next(): void {
    if (typeof this.edge.snapshot.edgeFieldsCount === 'undefined') {
      throw new Error('edgeFieldsCount is undefined');
    }
    this.edge.edgeIndex += this.edge.snapshot.edgeFieldsCount;
  }
}

export class HeapSnapshotRetainerEdge implements HeapSnapshotItem {
  protected snapshot: HeapSnapshot;
  #retainerIndexInternal!: number;
  #globalEdgeIndex!: number;
  #retainingNodeIndex?: number;
  #edgeInstance?: JSHeapSnapshotEdge|null;
  #nodeInstance?: HeapSnapshotNode|null;
  constructor(snapshot: HeapSnapshot, retainerIndex: number) {
    this.snapshot = snapshot;
    this.setRetainerIndex(retainerIndex);
  }

  clone(): HeapSnapshotRetainerEdge {
    return new HeapSnapshotRetainerEdge(this.snapshot, this.retainerIndex());
  }

  hasStringName(): boolean {
    return this.edge().hasStringName();
  }

  name(): string {
    return this.edge().name();
  }

  nameIndex(): number {
    return this.edge().nameIndex();
  }

  node(): HeapSnapshotNode {
    return this.nodeInternal();
  }

  nodeIndex(): number {
    if (typeof this.#retainingNodeIndex === 'undefined') {
      throw new Error('retainingNodeIndex is undefined');
    }

    return this.#retainingNodeIndex;
  }

  retainerIndex(): number {
    return this.#retainerIndexInternal;
  }

  setRetainerIndex(retainerIndex: number): void {
    if (retainerIndex === this.#retainerIndexInternal) {
      return;
    }

    if (!this.snapshot.retainingEdges || !this.snapshot.retainingNodes) {
      throw new Error('Snapshot does not contain retaining edges or retaining nodes');
    }

    this.#retainerIndexInternal = retainerIndex;
    this.#globalEdgeIndex = this.snapshot.retainingEdges[retainerIndex];
    this.#retainingNodeIndex = this.snapshot.retainingNodes[retainerIndex];
    this.#edgeInstance = null;
    this.#nodeInstance = null;
  }

  set edgeIndex(edgeIndex: number) {
    this.setRetainerIndex(edgeIndex);
  }

  private nodeInternal(): HeapSnapshotNode {
    if (!this.#nodeInstance) {
      this.#nodeInstance = this.snapshot.createNode(this.#retainingNodeIndex);
    }
    return this.#nodeInstance;
  }

  protected edge(): JSHeapSnapshotEdge {
    if (!this.#edgeInstance) {
      this.#edgeInstance = this.snapshot.createEdge(this.#globalEdgeIndex);
    }
    return this.#edgeInstance;
  }

  toString(): string {
    return this.edge().toString();
  }

  itemIndex(): number {
    return this.#retainerIndexInternal;
  }

  serialize(): HeapSnapshotModel.HeapSnapshotModel.Edge {
    const node = this.node();
    const serializedNode = node.serialize();
    serializedNode.distance = this.#distance();
    serializedNode.ignored = this.snapshot.isNodeIgnoredInRetainersView(node.nodeIndex);

    return new HeapSnapshotModel.HeapSnapshotModel.Edge(
        this.name(), serializedNode, this.type(), this.#globalEdgeIndex);
  }

  type(): string {
    return this.edge().type();
  }

  isInternal(): boolean {
    return this.edge().isInternal();
  }

  getValueForSorting(fieldName: string): number {
    if (fieldName === '!edgeDistance') {
      return this.#distance();
    }
    throw new Error('Invalid field name');
  }

  #distance(): number {
    if (this.snapshot.isEdgeIgnoredInRetainersView(this.#globalEdgeIndex)) {
      return HeapSnapshotModel.HeapSnapshotModel.baseUnreachableDistance;
    }
    return this.node().distanceForRetainersView();
  }
}

export class HeapSnapshotRetainerEdgeIterator implements HeapSnapshotItemIterator {
  readonly #retainersEnd: number;
  retainer: JSHeapSnapshotRetainerEdge;
  constructor(retainedNode: HeapSnapshotNode) {
    const snapshot = retainedNode.snapshot;
    const retainedNodeOrdinal = retainedNode.ordinal();
    if (!snapshot.firstRetainerIndex) {
      throw new Error('Snapshot does not contain firstRetainerIndex');
    }
    const retainerIndex = snapshot.firstRetainerIndex[retainedNodeOrdinal];
    this.#retainersEnd = snapshot.firstRetainerIndex[retainedNodeOrdinal + 1];
    this.retainer = snapshot.createRetainingEdge(retainerIndex);
  }

  hasNext(): boolean {
    return this.retainer.retainerIndex() < this.#retainersEnd;
  }

  item(): HeapSnapshotRetainerEdge {
    return this.retainer;
  }

  next(): void {
    this.retainer.setRetainerIndex(this.retainer.retainerIndex() + 1);
  }
}

export class HeapSnapshotNode implements HeapSnapshotItem {
  snapshot: HeapSnapshot;
  nodeIndex: number;
  constructor(snapshot: HeapSnapshot, nodeIndex?: number) {
    this.snapshot = snapshot;
    this.nodeIndex = nodeIndex || 0;
  }

  distance(): number {
    return this.snapshot.nodeDistances[this.nodeIndex / this.snapshot.nodeFieldCount];
  }

  distanceForRetainersView(): number {
    return this.snapshot.getDistanceForRetainersView(this.nodeIndex);
  }

  className(): string {
    return this.snapshot.strings[this.classIndex()];
  }

  classIndex(): number {
    return this.#detachednessAndClassIndex() >>> SHIFT_FOR_CLASS_INDEX;
  }

  // Returns a key which can uniquely describe both the class name for this node
  // and its Location, if relevant. These keys are meant to be cheap to produce,
  // so that building aggregates is fast. These keys are NOT the same as the
  // keys exposed to the frontend by functions such as aggregatesWithFilter and
  // aggregatesForDiff.
  classKeyInternal(): string|number {
    // It is common for multiple JavaScript constructors to have the same
    // name, so the class key includes the location if available for nodes of
    // type 'object'.
    //
    // JavaScript Functions (node type 'closure') also have locations, but it
    // would not be helpful to split them into categories by location because
    // many of those categories would have only one instance.
    if (this.rawType() !== this.snapshot.nodeObjectType) {
      return this.classIndex();
    }
    const location = this.snapshot.getLocation(this.nodeIndex);
    return location ? `${location.scriptId},${location.lineNumber},${location.columnNumber},${this.className()}` :
                      this.classIndex();
  }

  setClassIndex(index: number): void {
    let value = this.#detachednessAndClassIndex();
    value &= BITMASK_FOR_DOM_LINK_STATE;        // Clear previous class index.
    value |= (index << SHIFT_FOR_CLASS_INDEX);  // Set new class index.
    this.#setDetachednessAndClassIndex(value);
    if (this.classIndex() !== index) {
      throw new Error('String index overflow');
    }
  }

  dominatorIndex(): number {
    const nodeFieldCount = this.snapshot.nodeFieldCount;
    return this.snapshot.dominatorsTree[this.nodeIndex / this.snapshot.nodeFieldCount] * nodeFieldCount;
  }

  edges(): HeapSnapshotEdgeIterator {
    return new HeapSnapshotEdgeIterator(this);
  }

  edgesCount(): number {
    return (this.edgeIndexesEnd() - this.edgeIndexesStart()) / this.snapshot.edgeFieldsCount;
  }

  id(): number {
    throw new Error('Not implemented');
  }

  rawName(): string {
    return this.snapshot.strings[this.rawNameIndex()];
  }

  isRoot(): boolean {
    return this.nodeIndex === this.snapshot.rootNodeIndex;
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

  isSynthetic(): boolean {
    throw new Error('Not implemented');
  }

  isDocumentDOMTreesRoot(): boolean {
    throw new Error('Not implemented');
  }

  name(): string {
    return this.rawName();
  }

  retainedSize(): number {
    return this.snapshot.retainedSizes[this.ordinal()];
  }

  retainers(): HeapSnapshotRetainerEdgeIterator {
    return new HeapSnapshotRetainerEdgeIterator(this);
  }

  retainersCount(): number {
    const snapshot = this.snapshot;
    const ordinal = this.ordinal();
    return snapshot.firstRetainerIndex[ordinal + 1] - snapshot.firstRetainerIndex[ordinal];
  }

  selfSize(): number {
    const snapshot = this.snapshot;
    return snapshot.nodes.getValue(this.nodeIndex + snapshot.nodeSelfSizeOffset);
  }

  type(): string {
    return this.snapshot.nodeTypes[this.rawType()];
  }

  traceNodeId(): number {
    const snapshot = this.snapshot;
    return snapshot.nodes.getValue(this.nodeIndex + snapshot.nodeTraceNodeIdOffset);
  }

  itemIndex(): number {
    return this.nodeIndex;
  }

  serialize(): HeapSnapshotModel.HeapSnapshotModel.Node {
    return new HeapSnapshotModel.HeapSnapshotModel.Node(
        this.id(), this.name(), this.distance(), this.nodeIndex, this.retainedSize(), this.selfSize(), this.type());
  }

  rawNameIndex(): number {
    const snapshot = this.snapshot;
    return snapshot.nodes.getValue(this.nodeIndex + snapshot.nodeNameOffset);
  }

  edgeIndexesStart(): number {
    return this.snapshot.firstEdgeIndexes[this.ordinal()];
  }

  edgeIndexesEnd(): number {
    return this.snapshot.firstEdgeIndexes[this.ordinal() + 1];
  }

  ordinal(): number {
    return this.nodeIndex / this.snapshot.nodeFieldCount;
  }

  nextNodeIndex(): number {
    return this.nodeIndex + this.snapshot.nodeFieldCount;
  }

  rawType(): number {
    const snapshot = this.snapshot;
    return snapshot.nodes.getValue(this.nodeIndex + snapshot.nodeTypeOffset);
  }

  isFlatConsString(): boolean {
    if (this.rawType() !== this.snapshot.nodeConsStringType) {
      return false;
    }
    for (let iter = this.edges(); iter.hasNext(); iter.next()) {
      const edge = iter.edge;
      if (!edge.isInternal()) {
        continue;
      }
      const edgeName = edge.name();
      if ((edgeName === 'first' || edgeName === 'second') && edge.node().name() === '') {
        return true;
      }
    }
    return false;
  }

  #detachednessAndClassIndex(): number {
    const {snapshot, nodeIndex} = this;
    const nodeDetachednessAndClassIndexOffset = snapshot.nodeDetachednessAndClassIndexOffset;
    return nodeDetachednessAndClassIndexOffset !== -1 ?
        snapshot.nodes.getValue(nodeIndex + nodeDetachednessAndClassIndexOffset) :
        (snapshot.detachednessAndClassIndexArray as Uint32Array)[nodeIndex / snapshot.nodeFieldCount];
  }

  #setDetachednessAndClassIndex(value: number): void {
    const {snapshot, nodeIndex} = this;
    const nodeDetachednessAndClassIndexOffset = snapshot.nodeDetachednessAndClassIndexOffset;
    if (nodeDetachednessAndClassIndexOffset !== -1) {
      snapshot.nodes.setValue(nodeIndex + nodeDetachednessAndClassIndexOffset, value);
    } else {
      (snapshot.detachednessAndClassIndexArray as Uint32Array)[nodeIndex / snapshot.nodeFieldCount] = value;
    }
  }

  detachedness(): DOMLinkState {
    return this.#detachednessAndClassIndex() & BITMASK_FOR_DOM_LINK_STATE;
  }

  setDetachedness(detachedness: DOMLinkState): void {
    let value = this.#detachednessAndClassIndex();
    value &= ~BITMASK_FOR_DOM_LINK_STATE;  // Clear the old bits.
    value |= detachedness;                 // Set the new bits.
    this.#setDetachednessAndClassIndex(value);
  }
}

export class HeapSnapshotNodeIterator implements HeapSnapshotItemIterator {
  node: HeapSnapshotNode;
  readonly #nodesLength: number;
  constructor(node: HeapSnapshotNode) {
    this.node = node;
    this.#nodesLength = node.snapshot.nodes.length;
  }

  hasNext(): boolean {
    return this.node.nodeIndex < this.#nodesLength;
  }

  item(): HeapSnapshotNode {
    return this.node;
  }

  next(): void {
    this.node.nodeIndex = this.node.nextNodeIndex();
  }
}

export class HeapSnapshotIndexRangeIterator implements HeapSnapshotItemIterator {
  readonly #itemProvider: HeapSnapshotItemIndexProvider;
  readonly #indexes: number[]|Uint32Array;
  #position: number;
  constructor(itemProvider: HeapSnapshotItemIndexProvider, indexes: number[]|Uint32Array) {
    this.#itemProvider = itemProvider;
    this.#indexes = indexes;
    this.#position = 0;
  }

  hasNext(): boolean {
    return this.#position < this.#indexes.length;
  }

  item(): HeapSnapshotItem {
    const index = this.#indexes[this.#position];
    return this.#itemProvider.itemForIndex(index);
  }

  next(): void {
    ++this.#position;
  }
}

export class HeapSnapshotFilteredIterator implements HeapSnapshotItemIterator {
  #iterator: HeapSnapshotItemIterator;
  #filter: ((arg0: HeapSnapshotItem) => boolean)|undefined;
  constructor(iterator: HeapSnapshotItemIterator, filter?: ((arg0: HeapSnapshotItem) => boolean)) {
    this.#iterator = iterator;
    this.#filter = filter;
    this.skipFilteredItems();
  }

  hasNext(): boolean {
    return this.#iterator.hasNext();
  }

  item(): HeapSnapshotItem {
    return this.#iterator.item();
  }

  next(): void {
    this.#iterator.next();
    this.skipFilteredItems();
  }

  private skipFilteredItems(): void {
    while (this.#iterator.hasNext() && this.#filter && !this.#filter(this.#iterator.item())) {
      this.#iterator.next();
    }
  }
}

export class HeapSnapshotProgress {
  readonly #dispatcher: HeapSnapshotWorkerDispatcher|undefined;
  constructor(dispatcher?: HeapSnapshotWorkerDispatcher) {
    this.#dispatcher = dispatcher;
  }

  updateStatus(status: string): void {
    this.sendUpdateEvent(i18n.i18n.serializeUIString(status));
  }

  updateProgress(title: string, value: number, total: number): void {
    const percentValue = ((total ? (value / total) : 0) * 100).toFixed(0);
    this.sendUpdateEvent(i18n.i18n.serializeUIString(title, {PH1: percentValue}));
  }

  reportProblem(error: string): void {
    // May be undefined in tests.
    if (this.#dispatcher) {
      this.#dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot, error);
    }
  }

  private sendUpdateEvent(serializedText: string): void {
    // May be undefined in tests.
    if (this.#dispatcher) {
      this.#dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotModel.HeapSnapshotProgressEvent.Update, serializedText);
    }
  }
}

// An "interface" to be used when classifying plain JS objects in the snapshot.
// An object matches the interface if it contains every listed property (even
// if it also contains extra properties).
interface InterfaceDefinition {
  name: string;
  properties: string[];
}

export class HeapSnapshotProblemReport {
  readonly #errors: string[];
  constructor(title: string) {
    this.#errors = [title];
  }

  addError(error: string): void {
    if (this.#errors.length > 100) {
      return;
    }
    this.#errors.push(error);
  }

  toString(): string {
    return this.#errors.join('\n  ');
  }
}
export interface Profile {
  /* eslint-disable @typescript-eslint/naming-convention */
  root_index: number;
  nodes: Platform.TypedArrayUtilities.BigUint32Array;
  edges: Platform.TypedArrayUtilities.BigUint32Array;
  snapshot: HeapSnapshotHeader;
  samples: number[];
  strings: string[];
  locations: number[];
  trace_function_infos: Uint32Array;
  trace_tree: Object;
  /* eslint-enable @typescript-eslint/naming-convention */
}

export interface LiveObjects {
  [x: number]: {count: number, size: number, ids: number[]};
}

/**
 * DOM node link state.
 */
const enum DOMLinkState {
  UNKNOWN = 0,
  ATTACHED = 1,
  DETACHED = 2,
}
const BITMASK_FOR_DOM_LINK_STATE = 3;

// The class index is stored in the upper 30 bits of the detachedness field.
const SHIFT_FOR_CLASS_INDEX = 2;

// The maximum number of results produced by inferInterfaceDefinitions.
const MAX_INTERFACE_COUNT = 1000;

// After this many properties, inferInterfaceDefinitions can stop adding more
// properties to an interface definition if the name is getting too long.
const MIN_INTERFACE_PROPERTY_COUNT = 1;

// The maximum length of an interface name produced by inferInterfaceDefinitions.
// This limit can be exceeded if the first MIN_INTERFACE_PROPERTY_COUNT property
// names are long.
const MAX_INTERFACE_NAME_LENGTH = 120;

// Each interface definition produced by inferInterfaceDefinitions will match at
// least this many objects. There's no point in defining interfaces which match
// only a single object.
const MIN_OBJECT_COUNT_PER_INTERFACE = 2;

export abstract class HeapSnapshot {
  nodes: Platform.TypedArrayUtilities.BigUint32Array;
  containmentEdges: Platform.TypedArrayUtilities.BigUint32Array;
  readonly #metaNode: HeapSnapshotMetainfo;
  readonly #rawSamples: number[];
  #samples: HeapSnapshotModel.HeapSnapshotModel.Samples|null;
  strings: string[];
  readonly #locations: number[];
  readonly #progress: HeapSnapshotProgress;
  readonly #noDistance: number;
  rootNodeIndexInternal: number;
  #snapshotDiffs: {
    [x: string]: {
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff,
    },
  };
  #aggregatesForDiffInternal?: {
    interfaceDefinitions: string,
    aggregates: {
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff,
    },
  };
  #aggregates: {
    [x: string]: {
      [x: string]: AggregatedInfo,
    },
  };
  #aggregatesSortedFlags: {
    [x: string]: boolean,
  };
  #profile: Profile;
  nodeTypeOffset!: number;
  nodeNameOffset!: number;
  nodeIdOffset!: number;
  nodeSelfSizeOffset!: number;
  #nodeEdgeCountOffset!: number;
  nodeTraceNodeIdOffset!: number;
  nodeFieldCount!: number;
  nodeTypes!: string[];
  nodeArrayType!: number;
  nodeHiddenType!: number;
  nodeObjectType!: number;
  nodeNativeType!: number;
  nodeStringType!: number;
  nodeConsStringType!: number;
  nodeSlicedStringType!: number;
  nodeCodeType!: number;
  nodeSyntheticType!: number;
  nodeClosureType!: number;
  nodeRegExpType!: number;
  edgeFieldsCount!: number;
  edgeTypeOffset!: number;
  edgeNameOffset!: number;
  edgeToNodeOffset!: number;
  edgeTypes!: string[];
  edgeElementType!: number;
  edgeHiddenType!: number;
  edgeInternalType!: number;
  edgeShortcutType!: number;
  edgeWeakType!: number;
  edgeInvisibleType!: number;
  edgePropertyType!: number;
  #locationIndexOffset!: number;
  #locationScriptIdOffset!: number;
  #locationLineOffset!: number;
  #locationColumnOffset!: number;
  #locationFieldCount!: number;
  nodeCount!: number;
  #edgeCount!: number;
  retainedSizes!: Float64Array;
  firstEdgeIndexes!: Uint32Array;
  retainingNodes!: Uint32Array;
  retainingEdges!: Uint32Array;
  firstRetainerIndex!: Uint32Array;
  nodeDistances!: Int32Array;
  firstDominatedNodeIndex!: Uint32Array;
  dominatedNodes!: Uint32Array;
  dominatorsTree!: Uint32Array;
  #allocationProfile!: AllocationProfile;
  nodeDetachednessAndClassIndexOffset!: number;
  #locationMap!: Map<number, HeapSnapshotModel.HeapSnapshotModel.Location>;
  #ignoredNodesInRetainersView: Set<number>;
  #ignoredEdgesInRetainersView: Set<number>;
  #nodeDistancesForRetainersView: Int32Array|undefined;
  #edgeNamesThatAreNotWeakMaps: Platform.TypedArrayUtilities.BitVector;
  detachednessAndClassIndexArray?: Uint32Array;
  #essentialEdges?: Platform.TypedArrayUtilities.BitVector;
  #interfaceNames: Map<string, number>;
  #interfaceDefinitions?: InterfaceDefinition[];

  constructor(profile: Profile, progress: HeapSnapshotProgress) {
    this.nodes = profile.nodes;
    this.containmentEdges = profile.edges;
    this.#metaNode = profile.snapshot.meta;
    this.#rawSamples = profile.samples;
    this.#samples = null;
    this.strings = profile.strings;
    this.#locations = profile.locations;
    this.#progress = progress;

    this.#noDistance = -5;
    this.rootNodeIndexInternal = 0;
    if (profile.snapshot.root_index) {
      this.rootNodeIndexInternal = profile.snapshot.root_index;
    }

    this.#snapshotDiffs = {};

    this.#aggregates = {};

    this.#aggregatesSortedFlags = {};
    this.#profile = profile;
    this.#ignoredNodesInRetainersView = new Set();
    this.#ignoredEdgesInRetainersView = new Set();
    this.#edgeNamesThatAreNotWeakMaps = Platform.TypedArrayUtilities.createBitVector(this.strings.length);
    this.#interfaceNames = new Map();
  }

  initialize(): void {
    const meta = this.#metaNode;

    this.nodeTypeOffset = meta.node_fields.indexOf('type');
    this.nodeNameOffset = meta.node_fields.indexOf('name');
    this.nodeIdOffset = meta.node_fields.indexOf('id');
    this.nodeSelfSizeOffset = meta.node_fields.indexOf('self_size');
    this.#nodeEdgeCountOffset = meta.node_fields.indexOf('edge_count');
    this.nodeTraceNodeIdOffset = meta.node_fields.indexOf('trace_node_id');
    this.nodeDetachednessAndClassIndexOffset = meta.node_fields.indexOf('detachedness');
    this.nodeFieldCount = meta.node_fields.length;

    this.nodeTypes = meta.node_types[this.nodeTypeOffset];
    this.nodeArrayType = this.nodeTypes.indexOf('array');
    this.nodeHiddenType = this.nodeTypes.indexOf('hidden');
    this.nodeObjectType = this.nodeTypes.indexOf('object');
    this.nodeNativeType = this.nodeTypes.indexOf('native');
    this.nodeStringType = this.nodeTypes.indexOf('string');
    this.nodeConsStringType = this.nodeTypes.indexOf('concatenated string');
    this.nodeSlicedStringType = this.nodeTypes.indexOf('sliced string');
    this.nodeCodeType = this.nodeTypes.indexOf('code');
    this.nodeSyntheticType = this.nodeTypes.indexOf('synthetic');
    this.nodeClosureType = this.nodeTypes.indexOf('closure');
    this.nodeRegExpType = this.nodeTypes.indexOf('regexp');

    this.edgeFieldsCount = meta.edge_fields.length;
    this.edgeTypeOffset = meta.edge_fields.indexOf('type');
    this.edgeNameOffset = meta.edge_fields.indexOf('name_or_index');
    this.edgeToNodeOffset = meta.edge_fields.indexOf('to_node');

    this.edgeTypes = meta.edge_types[this.edgeTypeOffset];
    this.edgeTypes.push('invisible');
    this.edgeElementType = this.edgeTypes.indexOf('element');
    this.edgeHiddenType = this.edgeTypes.indexOf('hidden');
    this.edgeInternalType = this.edgeTypes.indexOf('internal');
    this.edgeShortcutType = this.edgeTypes.indexOf('shortcut');
    this.edgeWeakType = this.edgeTypes.indexOf('weak');
    this.edgeInvisibleType = this.edgeTypes.indexOf('invisible');
    this.edgePropertyType = this.edgeTypes.indexOf('property');

    const locationFields = meta.location_fields || [];

    this.#locationIndexOffset = locationFields.indexOf('object_index');
    this.#locationScriptIdOffset = locationFields.indexOf('script_id');
    this.#locationLineOffset = locationFields.indexOf('line');
    this.#locationColumnOffset = locationFields.indexOf('column');
    this.#locationFieldCount = locationFields.length;

    this.nodeCount = this.nodes.length / this.nodeFieldCount;
    this.#edgeCount = this.containmentEdges.length / this.edgeFieldsCount;

    this.retainedSizes = new Float64Array(this.nodeCount);
    this.firstEdgeIndexes = new Uint32Array(this.nodeCount + 1);
    this.retainingNodes = new Uint32Array(this.#edgeCount);
    this.retainingEdges = new Uint32Array(this.#edgeCount);
    this.firstRetainerIndex = new Uint32Array(this.nodeCount + 1);
    this.nodeDistances = new Int32Array(this.nodeCount);

    this.#progress.updateStatus('Building edge indexes…');
    this.buildEdgeIndexes();
    this.#progress.updateStatus('Building retainers…');
    this.buildRetainers();
    this.#progress.updateStatus('Propagating DOM state…');
    this.propagateDOMState();
    this.#progress.updateStatus('Calculating node flags…');
    this.calculateFlags();
    this.#progress.updateStatus('Calculating distances…');
    this.calculateDistances(/* isForRetainersView=*/ false);
    this.#progress.updateStatus('Calculating shallow sizes…');
    this.calculateShallowSizes();
    this.#progress.updateStatus('Calculating retained sizes…');
    this.buildDominatorTreeAndCalculateRetainedSizes();
    this.#progress.updateStatus('Building dominated nodes…');
    this.firstDominatedNodeIndex = new Uint32Array(this.nodeCount + 1);
    this.dominatedNodes = new Uint32Array(this.nodeCount - 1);
    this.buildDominatedNodes();
    this.#progress.updateStatus('Calculating object names…');
    this.calculateObjectNames();
    this.applyInterfaceDefinitions(this.inferInterfaceDefinitions());
    this.#progress.updateStatus('Calculating statistics…');
    this.calculateStatistics();
    this.#progress.updateStatus('Calculating samples…');
    this.buildSamples();
    this.#progress.updateStatus('Building locations…');
    this.buildLocationMap();
    this.#progress.updateStatus('Finished processing.');

    if (this.#profile.snapshot.trace_function_count) {
      this.#progress.updateStatus('Building allocation statistics…');
      const nodes = this.nodes;
      const nodesLength = nodes.length;
      const nodeFieldCount = this.nodeFieldCount;
      const node = this.rootNode();
      const liveObjects: LiveObjects = {};
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
      this.#allocationProfile = new AllocationProfile(this.#profile, liveObjects);
      this.#progress.updateStatus('done');
    }
  }

  private buildEdgeIndexes(): void {
    const nodes = this.nodes;
    const nodeCount = this.nodeCount;
    const firstEdgeIndexes = this.firstEdgeIndexes;
    const nodeFieldCount = this.nodeFieldCount;
    const edgeFieldsCount = this.edgeFieldsCount;
    const nodeEdgeCountOffset = this.#nodeEdgeCountOffset;
    firstEdgeIndexes[nodeCount] = this.containmentEdges.length;
    for (let nodeOrdinal = 0, edgeIndex = 0; nodeOrdinal < nodeCount; ++nodeOrdinal) {
      firstEdgeIndexes[nodeOrdinal] = edgeIndex;
      edgeIndex += nodes.getValue(nodeOrdinal * nodeFieldCount + nodeEdgeCountOffset) * edgeFieldsCount;
    }
  }

  private buildRetainers(): void {
    const retainingNodes = this.retainingNodes;
    const retainingEdges = this.retainingEdges;
    // Index of the first retainer in the retainingNodes and retainingEdges
    // arrays. Addressed by retained node index.
    const firstRetainerIndex = this.firstRetainerIndex;

    const containmentEdges = this.containmentEdges;
    const edgeFieldsCount = this.edgeFieldsCount;
    const nodeFieldCount = this.nodeFieldCount;
    const edgeToNodeOffset = this.edgeToNodeOffset;
    const firstEdgeIndexes = this.firstEdgeIndexes;
    const nodeCount = this.nodeCount;

    for (let toNodeFieldIndex = edgeToNodeOffset, l = containmentEdges.length; toNodeFieldIndex < l;
         toNodeFieldIndex += edgeFieldsCount) {
      const toNodeIndex = containmentEdges.getValue(toNodeFieldIndex);
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
        const toNodeIndex = containmentEdges.getValue(edgeIndex + edgeToNodeOffset);
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

  private allNodes(): HeapSnapshotNodeIterator {
    return new HeapSnapshotNodeIterator(this.rootNode());
  }

  rootNode(): HeapSnapshotNode {
    return this.createNode(this.rootNodeIndexInternal);
  }

  get rootNodeIndex(): number {
    return this.rootNodeIndexInternal;
  }

  get totalSize(): number {
    return this.rootNode().retainedSize();
  }

  private getDominatedIndex(nodeIndex: number): number {
    if (nodeIndex % this.nodeFieldCount) {
      throw new Error('Invalid nodeIndex: ' + nodeIndex);
    }
    return this.firstDominatedNodeIndex[nodeIndex / this.nodeFieldCount];
  }

  private createFilter(nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter):
      ((arg0: HeapSnapshotNode) => boolean)|undefined {
    const {minNodeId, maxNodeId, allocationNodeId, filterName} = nodeFilter;
    let filter;
    if (typeof allocationNodeId === 'number') {
      filter = this.createAllocationStackFilter(allocationNodeId);
      if (!filter) {
        throw new Error('Unable to create filter');
      }
      // @ts-ignore key can be added as a static property
      filter.key = 'AllocationNodeId: ' + allocationNodeId;
    } else if (typeof minNodeId === 'number' && typeof maxNodeId === 'number') {
      filter = this.createNodeIdFilter(minNodeId, maxNodeId);
      // @ts-ignore key can be added as a static property
      filter.key = 'NodeIdRange: ' + minNodeId + '..' + maxNodeId;
    } else if (filterName !== undefined) {
      filter = this.createNamedFilter(filterName);
      // @ts-ignore key can be added as a static property
      filter.key = 'NamedFilter: ' + filterName;
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

    const regexp =
        searchConfig.isRegex ? new RegExp(query) : Platform.StringUtilities.createPlainTextSearchRegex(query, 'i');

    function filterRegexp(matchedStringIndexes: Set<number>, string: string, index: number): Set<number> {
      if (regexp.test(string)) {
        matchedStringIndexes.add(index);
      }
      return matchedStringIndexes;
    }

    const useRegExp = searchConfig.isRegex || !searchConfig.caseSensitive;
    const stringFilter = useRegExp ? filterRegexp : filterString;
    const stringIndexes = this.strings.reduce(stringFilter, new Set());

    const filter = this.createFilter(nodeFilter);
    const nodeIds = [];
    const nodesLength = this.nodes.length;
    const nodes = this.nodes;
    const nodeNameOffset = this.nodeNameOffset;
    const nodeIdOffset = this.nodeIdOffset;
    const nodeFieldCount = this.nodeFieldCount;
    const node = this.rootNode();

    for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      node.nodeIndex = nodeIndex;
      if (filter && !filter(node)) {
        continue;
      }
      const name = node.name();
      if (name === node.rawName()) {
        // If the string displayed to the user matches the raw name from the
        // snapshot, then we can use the Set computed above. This avoids
        // repeated work when multiple nodes have the same name.
        if (stringIndexes.has(nodes.getValue(nodeIndex + nodeNameOffset))) {
          nodeIds.push(nodes.getValue(nodeIndex + nodeIdOffset));
        }
      } else {
        // If the node is displaying a customized name, then we must perform the
        // full string search within that name here.
        if (useRegExp ? regexp.test(name) : (name.indexOf(query) !== -1)) {
          nodeIds.push(nodes.getValue(nodeIndex + nodeIdOffset));
        }
      }
    }
    return nodeIds;
  }

  aggregatesWithFilter(nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter):
      {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate} {
    const filter = this.createFilter(nodeFilter);
    // @ts-ignore key is added in createFilter
    const key = filter ? filter.key : 'allObjects';
    return this.getAggregatesByClassKey(false, key, filter);
  }

  private createNodeIdFilter(minNodeId: number, maxNodeId: number): (arg0: HeapSnapshotNode) => boolean {
    function nodeIdFilter(node: HeapSnapshotNode): boolean {
      const id = node.id();
      return id > minNodeId && id <= maxNodeId;
    }
    return nodeIdFilter;
  }

  private createAllocationStackFilter(bottomUpAllocationNodeId: number):
      ((arg0: HeapSnapshotNode) => boolean)|undefined {
    if (!this.#allocationProfile) {
      throw new Error('No Allocation Profile provided');
    }

    const traceIds = this.#allocationProfile.traceIds(bottomUpAllocationNodeId);
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

  private createNamedFilter(filterName: string): (node: HeapSnapshotNode) => boolean {
    // Allocate an array with a single bit per node, which can be used by each
    // specific filter implemented below.
    const bitmap = Platform.TypedArrayUtilities.createBitVector(this.nodeCount);
    const getBit = (node: HeapSnapshotNode): boolean => {
      const ordinal = node.nodeIndex / this.nodeFieldCount;
      return bitmap.getBit(ordinal);
    };

    // Traverses the graph in breadth-first order with the given filter, and
    // sets the bit in `bitmap` for every visited node.
    const traverse = (filter: (node: HeapSnapshotNode, edge: HeapSnapshotEdge) => boolean): void => {
      const distances = new Int32Array(this.nodeCount);
      for (let i = 0; i < this.nodeCount; ++i) {
        distances[i] = this.#noDistance;
      }
      const nodesToVisit = new Uint32Array(this.nodeCount);
      distances[this.rootNode().ordinal()] = 0;
      nodesToVisit[0] = this.rootNode().nodeIndex;
      const nodesToVisitLength = 1;
      this.bfs(nodesToVisit, nodesToVisitLength, distances, filter);
      for (let i = 0; i < this.nodeCount; ++i) {
        if (distances[i] !== this.#noDistance) {
          bitmap.setBit(i);
        }
      }
    };

    const markUnreachableNodes = (): void => {
      for (let i = 0; i < this.nodeCount; ++i) {
        if (this.nodeDistances[i] === this.#noDistance) {
          bitmap.setBit(i);
        }
      }
    };

    switch (filterName) {
      case 'objectsRetainedByDetachedDomNodes':
        // Traverse the graph, avoiding detached nodes.
        traverse((node: HeapSnapshotNode, edge: HeapSnapshotEdge) => {
          return edge.node().detachedness() !== DOMLinkState.DETACHED;
        });
        markUnreachableNodes();
        return (node: HeapSnapshotNode) => !getBit(node);
      case 'objectsRetainedByConsole':
        // Traverse the graph, avoiding edges that represent globals owned by
        // the DevTools console.
        traverse((node: HeapSnapshotNode, edge: HeapSnapshotEdge) => {
          return !(node.isSynthetic() && edge.hasStringName() && edge.name().endsWith(' / DevTools console'));
        });
        markUnreachableNodes();
        return (node: HeapSnapshotNode) => !getBit(node);
      case 'duplicatedStrings': {
        const stringToNodeIndexMap = new Map<string, number>();
        const node = this.createNode(0);
        for (let i = 0; i < this.nodeCount; ++i) {
          node.nodeIndex = i * this.nodeFieldCount;
          const rawType = node.rawType();
          if (rawType === this.nodeStringType || rawType === this.nodeConsStringType) {
            // Check whether the cons string is already "flattened", meaning
            // that one of its two parts is the empty string. If so, we should
            // skip it. We don't help anyone by reporting a flattened cons
            // string as a duplicate with its own content, since V8 controls
            // that behavior internally.
            if (node.isFlatConsString()) {
              continue;
            }
            const name = node.name();
            const alreadyVisitedNodeIndex = stringToNodeIndexMap.get(name);
            if (alreadyVisitedNodeIndex === undefined) {
              stringToNodeIndexMap.set(name, node.nodeIndex);
            } else {
              bitmap.setBit(alreadyVisitedNodeIndex / this.nodeFieldCount);
              bitmap.setBit(node.nodeIndex / this.nodeFieldCount);
            }
          }
        }
        return getBit;
      }
    }
    throw new Error('Invalid filter name');
  }

  getAggregatesByClassKey(sortedIndexes: boolean, key?: string, filter?: ((arg0: HeapSnapshotNode) => boolean)):
      {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate} {
    let aggregates: {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate};
    if (key && this.#aggregates[key]) {
      aggregates = this.#aggregates[key];
    } else {
      const aggregatesMap = this.buildAggregates(filter);
      this.calculateClassesRetainedSize(aggregatesMap, filter);

      // In the two previous steps, we used class keys that were simple and
      // could be produced quickly. For many objects, this meant using the index
      // of the string containing its class name. However, string indices are
      // not consistent across snapshots, and this aggregate data might end up
      // being used in a comparison, so here we convert to a more durable format
      // for class keys.
      aggregates = Object.create(null);
      for (const [classKey, aggregate] of aggregatesMap.entries()) {
        const newKey = this.classKeyFromClassKeyInternal(classKey);
        aggregates[newKey] = aggregate;
      }
      if (key) {
        this.#aggregates[key] = aggregates;
      }
    }

    if (sortedIndexes && (!key || !this.#aggregatesSortedFlags[key])) {
      this.sortAggregateIndexes(aggregates);
      if (key) {
        this.#aggregatesSortedFlags[key] = sortedIndexes;
      }
    }

    return aggregates as {
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate,
    };
  }

  allocationTracesTops(): HeapSnapshotModel.HeapSnapshotModel.SerializedAllocationNode[] {
    return this.#allocationProfile.serializeTraceTops();
  }

  allocationNodeCallers(nodeId: number): HeapSnapshotModel.HeapSnapshotModel.AllocationNodeCallers {
    return this.#allocationProfile.serializeCallers(nodeId);
  }

  allocationStack(nodeIndex: number): HeapSnapshotModel.HeapSnapshotModel.AllocationStackFrame[]|null {
    const node = this.createNode(nodeIndex);
    const allocationNodeId = node.traceNodeId();
    if (!allocationNodeId) {
      return null;
    }
    return this.#allocationProfile.serializeAllocationStack(allocationNodeId);
  }

  aggregatesForDiff(interfaceDefinitions: string): {[x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff} {
    if (this.#aggregatesForDiffInternal?.interfaceDefinitions === interfaceDefinitions) {
      return this.#aggregatesForDiffInternal.aggregates;
    }

    // Temporarily apply the interface definitions from the other snapshot.
    const originalInterfaceDefinitions = this.#interfaceDefinitions;
    this.applyInterfaceDefinitions(JSON.parse(interfaceDefinitions) as InterfaceDefinition[]);
    const aggregates = this.getAggregatesByClassKey(true, 'allObjects');
    this.applyInterfaceDefinitions(originalInterfaceDefinitions ?? []);
    const result: {[x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff} = {};

    const node = this.createNode();
    for (const classKey in aggregates) {
      const aggregate = aggregates[classKey];
      const indexes = aggregate.idxs;
      const ids = new Array(indexes.length);
      const selfSizes = new Array(indexes.length);
      for (let i = 0; i < indexes.length; i++) {
        node.nodeIndex = indexes[i];
        ids[i] = node.id();
        selfSizes[i] = node.selfSize();
      }

      result[classKey] = {name: node.className(), indexes, ids, selfSizes};
    }

    this.#aggregatesForDiffInternal = {interfaceDefinitions, aggregates: result};
    return result;
  }

  isUserRoot(_node: HeapSnapshotNode): boolean {
    return true;
  }

  calculateShallowSizes(): void {
  }

  calculateDistances(
      isForRetainersView: boolean, filter?: ((arg0: HeapSnapshotNode, arg1: HeapSnapshotEdge) => boolean)): void {
    const nodeCount = this.nodeCount;

    if (isForRetainersView) {
      const originalFilter = filter;
      filter = (node: HeapSnapshotNode, edge: HeapSnapshotEdge) => {
        return !this.#ignoredNodesInRetainersView.has(edge.nodeIndex()) &&
            (!originalFilter || originalFilter(node, edge));
      };
      if (this.#nodeDistancesForRetainersView === undefined) {
        this.#nodeDistancesForRetainersView = new Int32Array(nodeCount);
      }
    }

    const distances = isForRetainersView ? (this.#nodeDistancesForRetainersView as Int32Array) : this.nodeDistances;
    const noDistance = this.#noDistance;
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
    this.bfs(nodesToVisit, nodesToVisitLength, distances, filter);

    // BFS for objects not reached from user roots.
    distances[this.rootNode().ordinal()] =
        nodesToVisitLength > 0 ? HeapSnapshotModel.HeapSnapshotModel.baseSystemDistance : 0;
    nodesToVisit[0] = this.rootNode().nodeIndex;
    nodesToVisitLength = 1;
    this.bfs(nodesToVisit, nodesToVisitLength, distances, filter);
  }

  private bfs(
      nodesToVisit: Uint32Array, nodesToVisitLength: number, distances: Int32Array,
      filter?: ((arg0: HeapSnapshotNode, arg1: HeapSnapshotEdge) => boolean)): void {
    // Preload fields into local variables for better performance.
    const edgeFieldsCount = this.edgeFieldsCount;
    const nodeFieldCount = this.nodeFieldCount;
    const containmentEdges = this.containmentEdges;
    const firstEdgeIndexes = this.firstEdgeIndexes;
    const edgeToNodeOffset = this.edgeToNodeOffset;
    const edgeTypeOffset = this.edgeTypeOffset;
    const nodeCount = this.nodeCount;
    const edgeWeakType = this.edgeWeakType;
    const noDistance = this.#noDistance;

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
        const edgeType = containmentEdges.getValue(edgeIndex + edgeTypeOffset);
        if (edgeType === edgeWeakType) {
          continue;
        }
        const childNodeIndex = containmentEdges.getValue(edgeIndex + edgeToNodeOffset);
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

  private buildAggregates(filter?: ((arg0: HeapSnapshotNode) => boolean)): Map<string|number, AggregatedInfo> {
    const aggregates = new Map<string|number, AggregatedInfo>();

    const nodes = this.nodes;
    const nodesLength = nodes.length;
    const nodeFieldCount = this.nodeFieldCount;
    const selfSizeOffset = this.nodeSelfSizeOffset;
    const node = this.rootNode();
    const nodeDistances = this.nodeDistances;

    for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      node.nodeIndex = nodeIndex;
      if (filter && !filter(node)) {
        continue;
      }
      const selfSize = nodes.getValue(nodeIndex + selfSizeOffset);
      if (!selfSize) {
        continue;
      }
      const classKey = node.classKeyInternal();
      const nodeOrdinal = nodeIndex / nodeFieldCount;
      const distance = nodeDistances[nodeOrdinal];
      let aggregate = aggregates.get(classKey);
      if (!aggregate) {
        aggregate = {
          count: 1,
          distance,
          self: selfSize,
          maxRet: 0,
          name: node.className(),
          idxs: [nodeIndex],
        };
        aggregates.set(classKey, aggregate);
      } else {
        aggregate.distance = Math.min(aggregate.distance, distance);
        ++aggregate.count;
        aggregate.self += selfSize;
        aggregate.idxs.push(nodeIndex);
      }
    }

    // Shave off provisionally allocated space.
    for (const aggregate of aggregates.values()) {
      aggregate.idxs = aggregate.idxs.slice();
    }

    return aggregates;
  }

  private calculateClassesRetainedSize(
      aggregates: Map<string|number, AggregatedInfo>, filter?: ((arg0: HeapSnapshotNode) => boolean)): void {
    const rootNodeIndex = this.rootNodeIndexInternal;
    const node = this.createNode(rootNodeIndex);
    const list = [rootNodeIndex];
    const sizes = [-1];
    const classKeys: (string|number)[] = [];

    const seenClassKeys = new Map<string|number, boolean>();
    const nodeFieldCount = this.nodeFieldCount;
    const dominatedNodes = this.dominatedNodes;
    const firstDominatedNodeIndex = this.firstDominatedNodeIndex;

    while (list.length) {
      const nodeIndex = (list.pop() as number);
      node.nodeIndex = nodeIndex;
      let classKey = node.classKeyInternal();
      const seen = Boolean(seenClassKeys.get(classKey));
      const nodeOrdinal = nodeIndex / nodeFieldCount;
      const dominatedIndexFrom = firstDominatedNodeIndex[nodeOrdinal];
      const dominatedIndexTo = firstDominatedNodeIndex[nodeOrdinal + 1];

      if (!seen && (!filter || filter(node)) && node.selfSize()) {
        (aggregates.get(classKey) as AggregatedInfo).maxRet += node.retainedSize();
        if (dominatedIndexFrom !== dominatedIndexTo) {
          seenClassKeys.set(classKey, true);
          sizes.push(list.length);
          classKeys.push(classKey);
        }
      }
      for (let i = dominatedIndexFrom; i < dominatedIndexTo; i++) {
        list.push(dominatedNodes[i]);
      }

      const l = list.length;
      while (sizes[sizes.length - 1] === l) {
        sizes.pop();
        classKey = (classKeys.pop() as string);
        seenClassKeys.set(classKey, false);
      }
    }
  }

  private sortAggregateIndexes(aggregates: {[x: string]: AggregatedInfo}): void {
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

  tryParseWeakMapEdgeName(edgeNameIndex: number): {duplicatedPart: string, tableId: string}|undefined {
    const previousResult = this.#edgeNamesThatAreNotWeakMaps.getBit(edgeNameIndex);
    if (previousResult) {
      return undefined;
    }
    const edgeName = this.strings[edgeNameIndex];
    const ephemeronNameRegex =
        /^\d+(?<duplicatedPart> \/ part of key \(.*? @\d+\) -> value \(.*? @\d+\) pair in WeakMap \(table @(?<tableId>\d+)\))$/;
    const match = edgeName.match(ephemeronNameRegex);
    if (!match) {
      this.#edgeNamesThatAreNotWeakMaps.setBit(edgeNameIndex);
      return undefined;
    }
    return match.groups as {duplicatedPart: string, tableId: string};
  }

  private computeIsEssentialEdge(
      nodeIndex: number, edgeIndex: number, userObjectsMapAndFlag: {map: Uint8Array, flag: number}|null): boolean {
    const edgeType = this.containmentEdges.getValue(edgeIndex + this.edgeTypeOffset);

    // Values in WeakMaps are retained by the key and table together. Removing
    // either the key or the table would be sufficient to remove the edge from
    // the other one, so we needn't use both of those edges when computing
    // dominators. We've found that the edge from the key generally produces
    // more useful results, so here we skip the edge from the table.
    if (edgeType === this.edgeInternalType) {
      const edgeNameIndex = this.containmentEdges.getValue(edgeIndex + this.edgeNameOffset);
      const match = this.tryParseWeakMapEdgeName(edgeNameIndex);
      if (match) {
        const nodeId = this.nodes.getValue(nodeIndex + this.nodeIdOffset);
        if (nodeId === parseInt(match.tableId, 10)) {
          return false;
        }
      }
    }

    // Weak edges never retain anything.
    if (edgeType === this.edgeWeakType) {
      return false;
    }

    const childNodeIndex = this.containmentEdges.getValue(edgeIndex + this.edgeToNodeOffset);
    // Ignore self edges.
    if (nodeIndex === childNodeIndex) {
      return false;
    }

    if (nodeIndex !== this.rootNodeIndex) {
      // Shortcuts at the root node have special meaning of marking user global objects.
      if (edgeType === this.edgeShortcutType) {
        return false;
      }

      const flags = userObjectsMapAndFlag ? userObjectsMapAndFlag.map : null;
      const userObjectFlag = userObjectsMapAndFlag ? userObjectsMapAndFlag.flag : 0;
      const nodeOrdinal = nodeIndex / this.nodeFieldCount;
      const childNodeOrdinal = childNodeIndex / this.nodeFieldCount;
      const nodeFlag = !flags || (flags[nodeOrdinal] & userObjectFlag);
      const childNodeFlag = !flags || (flags[childNodeOrdinal] & userObjectFlag);
      // We are skipping the edges from non-page-owned nodes to page-owned nodes.
      // Otherwise the dominators for the objects that also were retained by debugger would be affected.
      if (childNodeFlag && !nodeFlag) {
        return false;
      }
    }

    return true;
  }

  // Returns whether the edge should be considered when building the dominator tree.
  // The first call to this function computes essential edges and caches them.
  // Subsequent calls just lookup from the cache and are much faster.
  private isEssentialEdge(edgeIndex: number): boolean {
    let essentialEdges = this.#essentialEdges;

    if (!essentialEdges) {
      essentialEdges = this.#essentialEdges = Platform.TypedArrayUtilities.createBitVector(this.#edgeCount);
      const {nodes, nodeFieldCount, edgeFieldsCount} = this;
      const userObjectsMapAndFlag = this.userObjectsMapAndFlag();
      const endNodeIndex = nodes.length;
      const node = this.createNode(0);
      for (let nodeIndex = 0; nodeIndex < endNodeIndex; nodeIndex += nodeFieldCount) {
        node.nodeIndex = nodeIndex;
        const edgeIndexesEnd = node.edgeIndexesEnd();
        for (let edgeIndex = node.edgeIndexesStart(); edgeIndex < edgeIndexesEnd; edgeIndex += edgeFieldsCount) {
          if (this.computeIsEssentialEdge(nodeIndex, edgeIndex, userObjectsMapAndFlag)) {
            essentialEdges.setBit(edgeIndex / edgeFieldsCount);
          }
        }
      }
    }

    return essentialEdges.getBit(edgeIndex / this.edgeFieldsCount);
  }

  private hasOnlyWeakRetainers(nodeOrdinal: number): boolean {
    const retainingEdges = this.retainingEdges;
    const beginRetainerIndex = this.firstRetainerIndex[nodeOrdinal];
    const endRetainerIndex = this.firstRetainerIndex[nodeOrdinal + 1];
    for (let retainerIndex = beginRetainerIndex; retainerIndex < endRetainerIndex; ++retainerIndex) {
      const retainerEdgeIndex = retainingEdges[retainerIndex];
      if (this.isEssentialEdge(retainerEdgeIndex)) {
        return false;
      }
    }
    return true;
  }

  // The algorithm for building the dominator tree is from the paper:
  // Thomas Lengauer and Robert Endre Tarjan. 1979. A fast algorithm for finding dominators in a flowgraph.
  // ACM Trans. Program. Lang. Syst. 1, 1 (July 1979), 121–141. https://doi.org/10.1145/357062.357071
  private buildDominatorTreeAndCalculateRetainedSizes(): void {
    // Preload fields into local variables for better performance.
    const nodeCount = this.nodeCount;
    const firstEdgeIndexes = this.firstEdgeIndexes;
    const edgeFieldsCount = this.edgeFieldsCount;
    const containmentEdges = this.containmentEdges;
    const edgeToNodeOffset = this.edgeToNodeOffset;
    const nodeFieldCount = this.nodeFieldCount;
    const firstRetainerIndex = this.firstRetainerIndex;
    const retainingEdges = this.retainingEdges;
    const retainingNodes = this.retainingNodes;
    const rootNodeOrdinal = this.rootNodeIndexInternal / nodeFieldCount;
    const isEssentialEdge = this.isEssentialEdge.bind(this);
    const hasOnlyWeakRetainers = this.hasOnlyWeakRetainers.bind(this);

    // The Lengauer-Tarjan algorithm expects vectors to be numbered from 1 to n
    // and uses 0 as an invalid value, so use 1-indexing for all the arrays.
    // Convert between ordinals and vertex numbers by adding/subtracting 1.
    const arrayLength = nodeCount + 1;
    const parent = new Uint32Array(arrayLength);
    const ancestor = new Uint32Array(arrayLength);
    const vertex = new Uint32Array(arrayLength);
    const label = new Uint32Array(arrayLength);
    const semi = new Uint32Array(arrayLength);
    const bucket = new Array<Set<number>>(arrayLength);
    let n = 0;

    // Iterative DFS since the recursive version can cause stack overflows.
    // Use an array to keep track of the next edge index to be examined for each node.
    const nextEdgeIndex = new Uint32Array(arrayLength);
    const dfs = (root: number): void => {
      const rootOrdinal = root - 1;
      nextEdgeIndex[rootOrdinal] = firstEdgeIndexes[rootOrdinal];
      let v = root;
      while (v !== 0) {
        // First process v if not done already.
        if (semi[v] === 0) {
          semi[v] = ++n;
          vertex[n] = label[v] = v;
        }

        // The next node to process is the first unprocessed successor w of v,
        // or parent[v] if all of v's successors have already been processed.
        let vNext = parent[v];
        const vOrdinal = v - 1;
        for (; nextEdgeIndex[vOrdinal] < firstEdgeIndexes[vOrdinal + 1]; nextEdgeIndex[vOrdinal] += edgeFieldsCount) {
          const edgeIndex = nextEdgeIndex[vOrdinal];
          if (!isEssentialEdge(edgeIndex)) {
            continue;
          }
          const wOrdinal = containmentEdges.getValue(edgeIndex + edgeToNodeOffset) / nodeFieldCount;
          const w = wOrdinal + 1;
          if (semi[w] === 0) {
            parent[w] = v;
            nextEdgeIndex[wOrdinal] = firstEdgeIndexes[wOrdinal];
            vNext = w;
            break;
          }
        }
        v = vNext;
      }
    };

    // Iterative version since the recursive version can cause stack overflows.
    // Preallocate a stack since compress() is called several times.
    // The stack cannot grow larger than the number of nodes since we walk up
    // the tree represented by the ancestor array.
    const compressionStack = new Uint32Array(arrayLength);
    const compress = (v: number): void => {
      let stackPointer = 0;
      while (ancestor[ancestor[v]] !== 0) {
        compressionStack[++stackPointer] = v;
        v = ancestor[v];
      }
      while (stackPointer > 0) {
        const w = compressionStack[stackPointer--] as number;
        if (semi[label[ancestor[w]]] < semi[label[w]]) {
          label[w] = label[ancestor[w]];
        }
        ancestor[w] = ancestor[ancestor[w]];
      }
    };

    // Simple versions of eval and link from the paper.
    const evaluate = (v: number): number => {
      if (ancestor[v] === 0) {
        return v;
      }
      compress(v);
      return label[v];
    };

    const link = (v: number, w: number): void => {
      ancestor[w] = v;
    };

    // Algorithm begins here. The variable names are as per the paper.
    const r = rootNodeOrdinal + 1;
    n = 0;
    const dom = new Uint32Array(arrayLength);

    // First perform DFS from the root.
    dfs(r);

    // Then perform DFS from orphan nodes (ones with only weak retainers) if any.
    if (n < nodeCount) {
      const errors =
          new HeapSnapshotProblemReport(`Heap snapshot: ${nodeCount - n} nodes are unreachable from the root.`);
      errors.addError('The following nodes have only weak retainers:');
      const dumpNode = this.rootNode();
      for (let v = 1; v <= nodeCount; v++) {
        const vOrdinal = v - 1;
        if (semi[v] === 0 && hasOnlyWeakRetainers(vOrdinal)) {
          dumpNode.nodeIndex = vOrdinal * nodeFieldCount;
          errors.addError(`${dumpNode.name()} @${dumpNode.id()}`);
          parent[v] = r;
          dfs(v);
        }
      }
      console.warn(errors.toString());
    }

    // If there are unreachable nodes still, visit them individually from the root.
    // This can happen when there is a clique of nodes retained by one another.
    if (n < nodeCount) {
      const errors = new HeapSnapshotProblemReport(`Heap snapshot: Still found ${nodeCount - n} unreachable nodes:`);
      const dumpNode = this.rootNode();
      for (let v = 1; v <= nodeCount; v++) {
        if (semi[v] === 0) {
          const vOrdinal = v - 1;
          dumpNode.nodeIndex = vOrdinal * nodeFieldCount;
          errors.addError(`${dumpNode.name()} @${dumpNode.id()}`);
          parent[v] = r;
          semi[v] = ++n;
          vertex[n] = label[v] = v;
        }
      }
      console.warn(errors.toString());
    }

    // Main loop. Process the vertices in decreasing order by DFS number.
    for (let i = n; i >= 2; --i) {
      const w = vertex[i];
      // Iterate over all predecessors v of w.
      const wOrdinal = w - 1;
      let isOrphanNode = true;
      for (let retainerIndex = firstRetainerIndex[wOrdinal]; retainerIndex < firstRetainerIndex[wOrdinal + 1];
           retainerIndex++) {
        if (!isEssentialEdge(retainingEdges[retainerIndex])) {
          continue;
        }
        isOrphanNode = false;
        const vOrdinal = retainingNodes[retainerIndex] / nodeFieldCount;
        const v = vOrdinal + 1;
        const u = evaluate(v);
        if (semi[u] < semi[w]) {
          semi[w] = semi[u];
        }
      }
      if (isOrphanNode) {
        // We treat orphan nodes as having a single predecessor - the root.
        // semi[r] is always less than any semi[w] so set it unconditionally.
        semi[w] = semi[r];
      }

      if (bucket[vertex[semi[w]]] === undefined) {
        bucket[vertex[semi[w]]] = new Set<number>();
      }
      bucket[vertex[semi[w]]].add(w);
      link(parent[w], w);

      // Process all vertices v in bucket(parent(w)).
      if (bucket[parent[w]] !== undefined) {
        for (const v of bucket[parent[w]]) {
          const u = evaluate(v);
          dom[v] = semi[u] < semi[v] ? u : parent[w];
        }
        bucket[parent[w]].clear();
      }
    }

    // Final step. Fill in the immediate dominators not explicitly computed above.
    // Unlike the paper, we consider the root to be its own dominator and
    // set dom[0] to r to propagate the root as the dominator of unreachable nodes.
    dom[0] = dom[r] = r;
    for (let i = 2; i <= n; i++) {
      const w = vertex[i];
      if (dom[w] !== vertex[semi[w]]) {
        dom[w] = dom[dom[w]];
      }
    }
    // Algorithm ends here.

    // Transform the dominators into an ordinal-indexed array and populate the self sizes.
    const nodes = this.nodes;
    const nodeSelfSizeOffset = this.nodeSelfSizeOffset;
    const dominatorsTree = this.dominatorsTree = new Uint32Array(nodeCount);
    const retainedSizes = this.retainedSizes;
    for (let nodeOrdinal = 0; nodeOrdinal < nodeCount; nodeOrdinal++) {
      dominatorsTree[nodeOrdinal] = dom[nodeOrdinal + 1] - 1;
      retainedSizes[nodeOrdinal] = nodes.getValue(nodeOrdinal * nodeFieldCount + nodeSelfSizeOffset);
    }

    // Then propagate up the retained sizes for each traversed node excluding the root.
    for (let i = n; i > 1; i--) {
      const nodeOrdinal = vertex[i] - 1;
      const dominatorOrdinal = dominatorsTree[nodeOrdinal];
      retainedSizes[dominatorOrdinal] += retainedSizes[nodeOrdinal];
    }
  }

  private buildDominatedNodes(): void {
    // Builds up two arrays:
    //  - "dominatedNodes" is a continuous array, where each node owns an
    //    interval (can be empty) with corresponding dominated nodes.
    //  - "indexArray" is an array of indexes in the "dominatedNodes"
    //    with the same positions as in the _nodeIndex.
    const indexArray = this.firstDominatedNodeIndex;
    // All nodes except the root have dominators.
    const dominatedNodes = this.dominatedNodes;

    // Count the number of dominated nodes for each node. Skip the root (node at
    // index 0) as it is the only node that dominates itself.
    const nodeFieldCount = this.nodeFieldCount;
    const dominatorsTree = this.dominatorsTree;

    let fromNodeOrdinal = 0;
    let toNodeOrdinal: number = this.nodeCount;
    const rootNodeOrdinal = this.rootNodeIndexInternal / nodeFieldCount;
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

  private calculateObjectNames(): void {
    const {
      nodes,
      nodeCount,
      nodeNameOffset,
      nodeNativeType,
      nodeHiddenType,
      nodeObjectType,
      nodeCodeType,
      nodeClosureType,
      nodeRegExpType,
    } = this;

    // If the snapshot doesn't contain a detachedness field in each node, then
    // allocate a separate array so there is somewhere to store the class index.
    if (this.nodeDetachednessAndClassIndexOffset === -1) {
      this.detachednessAndClassIndexArray = new Uint32Array(nodeCount);
    }

    // We'll add some new values to the `strings` array during the processing below.
    // This map lets us easily find the index for each added string.
    const stringTable = new Map<string, number>();
    const getIndexForString = (s: string): number => {
      let index = stringTable.get(s);
      if (index === undefined) {
        index = this.addString(s);
        stringTable.set(s, index);
      }
      return index;
    };

    const hiddenClassIndex = getIndexForString('(system)');
    const codeClassIndex = getIndexForString('(compiled code)');
    const functionClassIndex = getIndexForString('Function');
    const regExpClassIndex = getIndexForString('RegExp');

    function getNodeClassIndex(node: HeapSnapshotNode): number {
      switch (node.rawType()) {
        case nodeHiddenType:
          return hiddenClassIndex;
        case nodeObjectType:
        case nodeNativeType: {
          let name = node.rawName();

          // If the node name is (for example) '<div id="a">', then the class
          // name should be just '<div>'. If the node name is already short
          // enough, like '<div>', we must still call getIndexForString on that
          // name, because the names added by getIndexForString are not
          // deduplicated with preexisting strings, and we want all objects with
          // class name '<div>' to refer to that class name via the same index.
          // Otherwise, object categorization doesn't work.
          if (name.startsWith('<')) {
            const firstSpace = name.indexOf(' ');
            if (firstSpace !== -1) {
              name = name.substring(0, firstSpace) + '>';
            }
            return getIndexForString(name);
          }
          if (name.startsWith('Detached <')) {
            const firstSpace = name.indexOf(' ', 10);
            if (firstSpace !== -1) {
              name = name.substring(0, firstSpace) + '>';
            }
            return getIndexForString(name);
          }

          // Avoid getIndexForString here; the class name index should match the name index.
          return nodes.getValue(node.nodeIndex + nodeNameOffset);
        }
        case nodeCodeType:
          return codeClassIndex;
        case nodeClosureType:
          return functionClassIndex;
        case nodeRegExpType:
          return regExpClassIndex;
        default:
          return getIndexForString('(' + node.type() + ')');
      }
    }

    const node = this.createNode(0);
    for (let i = 0; i < nodeCount; ++i) {
      node.setClassIndex(getNodeClassIndex(node));
      node.nodeIndex = node.nextNodeIndex();
    }
  }

  interfaceDefinitions(): string {
    return JSON.stringify(this.#interfaceDefinitions ?? []);
  }

  private isPlainJSObject(node: HeapSnapshotNode): boolean {
    return node.rawType() === this.nodeObjectType && node.rawName() === 'Object';
  }

  private inferInterfaceDefinitions(): InterfaceDefinition[] {
    const {edgePropertyType} = this;

    // First, produce a set of candidate definitions by iterating the properties
    // on every plain JS Object in the snapshot.
    interface InterfaceDefinitionCandidate extends InterfaceDefinition {
      // How many objects start with these properties in this order.
      count: number;
    }
    // A map from interface names to their definitions.
    const candidates = new Map<string, InterfaceDefinitionCandidate>();
    for (let it = this.allNodes(); it.hasNext(); it.next()) {
      const node = it.item();
      if (!this.isPlainJSObject(node)) {
        continue;
      }
      let interfaceName = '{';
      const properties: string[] = [];
      for (let edgeIt = node.edges(); edgeIt.hasNext(); edgeIt.next()) {
        const edge = edgeIt.item();
        const edgeName = edge.name();
        if (edge.rawType() !== edgePropertyType || edgeName === '__proto__') {
          continue;
        }
        const formattedEdgeName = JSHeapSnapshotNode.formatPropertyName(edgeName);
        if (interfaceName.length > MIN_INTERFACE_PROPERTY_COUNT &&
            interfaceName.length + formattedEdgeName.length > MAX_INTERFACE_NAME_LENGTH) {
          break;  // The interface name is getting too long.
        }
        if (interfaceName.length !== 1) {
          interfaceName += ', ';
        }
        interfaceName += formattedEdgeName;
        properties.push(edgeName);
      }
      // The empty interface is not a very meaningful, and can be sort of misleading
      // since someone might incorrectly interpret it as objects with no properties.
      if (properties.length === 0) {
        continue;
      }
      interfaceName += '}';
      const candidate = candidates.get(interfaceName);
      if (candidate) {
        ++candidate.count;
      } else {
        candidates.set(interfaceName, {name: interfaceName, properties, count: 1});
      }
    }

    // Next, sort the candidates and select the most popular ones. It's possible that
    // some candidates represent the same properties in different orders, but that's
    // okay: by sorting here, we ensure that the most popular ordering appears first
    // in the result list, and the rules for applying interface definitions will prefer
    // the first matching definition if multiple matches contain the same properties.
    const sortedCandidates = Array.from(candidates.values());
    sortedCandidates.sort((a, b) => b.count - a.count);
    const result: InterfaceDefinition[] = [];
    const maxResultSize = Math.min(sortedCandidates.length, MAX_INTERFACE_COUNT);
    for (let i = 0; i < maxResultSize; ++i) {
      const candidate = sortedCandidates[i];
      if (candidate.count < MIN_OBJECT_COUNT_PER_INTERFACE) {
        break;
      }
      result.push(candidate);
    }

    return result;
  }

  private applyInterfaceDefinitions(definitions: InterfaceDefinition[]): void {
    const {edgePropertyType} = this;
    this.#interfaceDefinitions = definitions;

    // Any computed aggregate data will be wrong after recategorization, so clear it.
    this.#aggregates = {};
    this.#aggregatesSortedFlags = {};

    // Information about a named interface.
    interface MatchInfo {
      name: string;
      // The number of properties listed in the interface definition.
      propertyCount: number;
      // The position of the interface definition in the list of definitions.
      index: number;
    }

    function selectBetterMatch(a: MatchInfo, b: MatchInfo|null): MatchInfo {
      if (!b || a.propertyCount > b.propertyCount) {
        return a;
      }
      if (b.propertyCount > a.propertyCount) {
        return b;
      }
      return a.index <= b.index ? a : b;
    }

    // A node in the tree which allows us to search for interfaces matching an object.
    // Each edge in this tree represents adding a property, starting from an empty
    // object. Properties must be iterated in sorted order.
    interface PropertyTreeNode {
      // All possible successors from this node. Keys are property names.
      next: Map<string, PropertyTreeNode>;
      // If this node corresponds to a named interface, then matchInfo contains that name.
      matchInfo: MatchInfo|null;
      // The maximum of all keys in `next`. This helps determine when no further transitions
      // are possible from this node.
      greatestNext: string|null;
    }

    // The root node of the tree.
    const propertyTree: PropertyTreeNode = {
      next: new Map(),
      matchInfo: null,
      greatestNext: null,
    };

    // Build up the property tree.
    for (let interfaceIndex = 0; interfaceIndex < definitions.length; ++interfaceIndex) {
      const definition = definitions[interfaceIndex];
      const properties = definition.properties.toSorted();
      let currentNode = propertyTree;
      for (const property of properties) {
        const nextMap = currentNode.next;
        let nextNode = nextMap.get(property);
        if (!nextNode) {
          nextNode = {
            next: new Map(),
            matchInfo: null,
            greatestNext: null,
          };
          nextMap.set(property, nextNode);
          if (currentNode.greatestNext === null || currentNode.greatestNext < property) {
            currentNode.greatestNext = property;
          }
        }
        currentNode = nextNode;
      }
      // Only set matchInfo on this node if it wasn't already set, to ensure that
      // interfaces defined earlier in the list have priority.
      if (!currentNode.matchInfo) {
        currentNode.matchInfo = {
          name: definition.name,
          propertyCount: properties.length,
          index: interfaceIndex,
        };
      }
    }

    // The fallback match for objects which don't match any defined interface.
    const initialMatch: MatchInfo = {
      name: 'Object',
      propertyCount: 0,
      index: Infinity,
    };

    // Iterate all nodes and check whether they match a named interface, using
    // the tree constructed above. Then update the class name for each node.
    for (let it = this.allNodes(); it.hasNext(); it.next()) {
      const node = it.item();
      if (!this.isPlainJSObject(node)) {
        continue;
      }

      // Collect and sort the properties of this object.
      const properties: string[] = [];
      for (let edgeIt = node.edges(); edgeIt.hasNext(); edgeIt.next()) {
        const edge = edgeIt.item();
        if (edge.rawType() === edgePropertyType) {
          properties.push(edge.name());
        }
      }
      properties.sort();

      // We may explore multiple possible paths through the tree, so this set tracks
      // all states that match with the properties iterated thus far.
      const states = new Set<PropertyTreeNode>();
      states.add(propertyTree);

      // This variable represents the best match found thus far. We start by checking
      // whether there is an interface definition for the empty object.
      let match = selectBetterMatch(initialMatch, propertyTree.matchInfo);

      // Traverse the tree to find any matches.
      for (const property of properties) {
        // Iterate only the states that already exist, not the ones added during the loop below.
        for (const currentState of Array.from(states.keys())) {
          if (currentState.greatestNext === null || property >= currentState.greatestNext) {
            // No further transitions are possible from this state.
            states.delete(currentState);
          }
          const nextState = currentState.next.get(property);
          if (nextState) {
            states.add(nextState);
            match = selectBetterMatch(match, nextState.matchInfo);
          }
        }
      }

      // Update the node's class name accordingly.
      let classIndex = match === initialMatch ? node.rawNameIndex() : this.#interfaceNames.get(match.name);
      if (classIndex === undefined) {
        classIndex = this.addString(match.name);
        this.#interfaceNames.set(match.name, classIndex);
      }
      node.setClassIndex(classIndex);
    }
  }

  /**
   * Iterates children of a node.
   */
  private iterateFilteredChildren(
      nodeOrdinal: number, edgeFilterCallback: (arg0: number) => boolean, childCallback: (arg0: number) => void): void {
    const beginEdgeIndex = this.firstEdgeIndexes[nodeOrdinal];
    const endEdgeIndex = this.firstEdgeIndexes[nodeOrdinal + 1];
    for (let edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += this.edgeFieldsCount) {
      const childNodeIndex = this.containmentEdges.getValue(edgeIndex + this.edgeToNodeOffset);
      const childNodeOrdinal = childNodeIndex / this.nodeFieldCount;
      const type = this.containmentEdges.getValue(edgeIndex + this.edgeTypeOffset);
      if (!edgeFilterCallback(type)) {
        continue;
      }
      childCallback(childNodeOrdinal);
    }
  }

  /**
   * Adds a string to the snapshot.
   */
  private addString(string: string): number {
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
  private propagateDOMState(): void {
    if (this.nodeDetachednessAndClassIndexOffset === -1) {
      return;
    }

    console.time('propagateDOMState');

    const visited = new Uint8Array(this.nodeCount);
    const attached: number[] = [];
    const detached: number[] = [];

    const stringIndexCache = new Map<number, number>();
    const node = this.createNode(0);

    /**
     * Adds a 'Detached ' prefix to the name of a node.
     */
    const addDetachedPrefixToNodeName = function(snapshot: HeapSnapshot, nodeIndex: number): void {
      const oldStringIndex = snapshot.nodes.getValue(nodeIndex + snapshot.nodeNameOffset);
      let newStringIndex = stringIndexCache.get(oldStringIndex);
      if (newStringIndex === undefined) {
        newStringIndex = snapshot.addString('Detached ' + snapshot.strings[oldStringIndex]);
        stringIndexCache.set(oldStringIndex, newStringIndex);
      }
      snapshot.nodes.setValue(nodeIndex + snapshot.nodeNameOffset, newStringIndex);
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

      const nodeIndex = nodeOrdinal * snapshot.nodeFieldCount;

      // Early bailout: Do not propagate the state (and name change) through JavaScript. Every
      // entry point into embedder code is a node that knows its own state. All embedder nodes
      // have their node type set to native.
      if (snapshot.nodes.getValue(nodeIndex + snapshot.nodeTypeOffset) !== snapshot.nodeNativeType) {
        visited[nodeOrdinal] = 1;
        return;
      }

      node.nodeIndex = nodeIndex;
      node.setDetachedness(newState);

      if (newState === DOMLinkState.ATTACHED) {
        attached.push(nodeOrdinal);
      } else if (newState === DOMLinkState.DETACHED) {
        // Detached state: Rewire node name.
        addDetachedPrefixToNodeName(snapshot, nodeIndex);
        detached.push(nodeOrdinal);
      }

      visited[nodeOrdinal] = 1;
    };

    const propagateState = function(snapshot: HeapSnapshot, parentNodeOrdinal: number, newState: number): void {
      snapshot.iterateFilteredChildren(
          parentNodeOrdinal,
          edgeType => ![snapshot.edgeHiddenType, snapshot.edgeInvisibleType, snapshot.edgeWeakType].includes(edgeType),
          nodeOrdinal => processNode(snapshot, nodeOrdinal, newState));
    };

    // 1. We re-use the deserialized field to store the propagated state. While
    //    the state for known nodes is already set, they still need to go
    //    through processing to have their name adjusted and them enqueued in
    //    the respective queues.
    for (let nodeOrdinal = 0; nodeOrdinal < this.nodeCount; ++nodeOrdinal) {
      node.nodeIndex = nodeOrdinal * this.nodeFieldCount;
      const state = node.detachedness();
      // Bail out for objects that have no known state. For all other objects set that state.
      if (state === DOMLinkState.UNKNOWN) {
        continue;
      }
      processNode(this, nodeOrdinal, state);
    }
    // 2. If the parent is attached, then the child is also attached.
    while (attached.length !== 0) {
      const nodeOrdinal = (attached.pop() as number);
      propagateState(this, nodeOrdinal, DOMLinkState.ATTACHED);
    }
    // 3. If the parent is not attached, then the child inherits the parent's state.
    while (detached.length !== 0) {
      const nodeOrdinal = (detached.pop() as number);
      node.nodeIndex = nodeOrdinal * this.nodeFieldCount;
      const nodeState = node.detachedness();
      // Ignore if the node has been found through propagating forward attached state.
      if (nodeState === DOMLinkState.ATTACHED) {
        continue;
      }
      propagateState(this, nodeOrdinal, DOMLinkState.DETACHED);
    }

    console.timeEnd('propagateDOMState');
  }

  private buildSamples(): void {
    const samples = this.#rawSamples;
    if (!samples || !samples.length) {
      return;
    }
    const sampleCount = samples.length / 2;
    const sizeForRange = new Array(sampleCount);
    const timestamps = new Array(sampleCount);
    const lastAssignedIds = new Array(sampleCount);

    const timestampOffset = this.#metaNode.sample_fields.indexOf('timestamp_us');
    const lastAssignedIdOffset = this.#metaNode.sample_fields.indexOf('last_assigned_id');
    for (let i = 0; i < sampleCount; i++) {
      sizeForRange[i] = 0;
      timestamps[i] = (samples[2 * i + timestampOffset]) / 1000;
      lastAssignedIds[i] = samples[2 * i + lastAssignedIdOffset];
    }

    const nodes = this.nodes;
    const nodesLength = nodes.length;
    const nodeFieldCount = this.nodeFieldCount;
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
    this.#samples = new HeapSnapshotModel.HeapSnapshotModel.Samples(timestamps, lastAssignedIds, sizeForRange);
  }

  private buildLocationMap(): void {
    const map = new Map<number, HeapSnapshotModel.HeapSnapshotModel.Location>();
    const locations = this.#locations;

    for (let i = 0; i < locations.length; i += this.#locationFieldCount) {
      const nodeIndex = locations[i + this.#locationIndexOffset];
      const scriptId = locations[i + this.#locationScriptIdOffset];
      const line = locations[i + this.#locationLineOffset];
      const col = locations[i + this.#locationColumnOffset];
      map.set(nodeIndex, new HeapSnapshotModel.HeapSnapshotModel.Location(scriptId, line, col));
    }

    this.#locationMap = map;
  }

  getLocation(nodeIndex: number): HeapSnapshotModel.HeapSnapshotModel.Location|null {
    return this.#locationMap.get(nodeIndex) || null;
  }

  getSamples(): HeapSnapshotModel.HeapSnapshotModel.Samples|null {
    return this.#samples;
  }

  calculateFlags(): void {
    throw new Error('Not implemented');
  }

  calculateStatistics(): void {
    throw new Error('Not implemented');
  }

  userObjectsMapAndFlag(): {map: Uint8Array, flag: number}|null {
    throw new Error('Not implemented');
  }

  calculateSnapshotDiff(
      baseSnapshotId: string,
      baseSnapshotAggregates: {[x: string]: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff}):
      {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff} {
    let snapshotDiff: {[x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff}|{
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff,
    } = this.#snapshotDiffs[baseSnapshotId];
    if (snapshotDiff) {
      return snapshotDiff;
    }
    snapshotDiff = ({} as {
      [x: string]: HeapSnapshotModel.HeapSnapshotModel.Diff,
    });

    const aggregates = this.getAggregatesByClassKey(true, 'allObjects');
    for (const classKey in baseSnapshotAggregates) {
      const baseAggregate = baseSnapshotAggregates[classKey];
      const diff = this.calculateDiffForClass(baseAggregate, aggregates[classKey]);
      if (diff) {
        snapshotDiff[classKey] = diff;
      }
    }
    const emptyBaseAggregate = new HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff();
    for (const classKey in aggregates) {
      if (classKey in baseSnapshotAggregates) {
        continue;
      }
      const classDiff = this.calculateDiffForClass(emptyBaseAggregate, aggregates[classKey]);
      if (classDiff) {
        snapshotDiff[classKey] = classDiff;
      }
    }

    this.#snapshotDiffs[baseSnapshotId] = snapshotDiff;
    return snapshotDiff;
  }

  private calculateDiffForClass(
      baseAggregate: HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff,
      aggregate?: HeapSnapshotModel.HeapSnapshotModel.Aggregate): HeapSnapshotModel.HeapSnapshotModel.Diff|null {
    const baseIds = baseAggregate.ids;
    const baseIndexes = baseAggregate.indexes;
    const baseSelfSizes = baseAggregate.selfSizes;

    const indexes = aggregate ? aggregate.idxs : [];

    let i = 0;
    let j = 0;
    const l = baseIds.length;
    const m = indexes.length;
    const diff = new HeapSnapshotModel.HeapSnapshotModel.Diff(aggregate ? aggregate.name : baseAggregate.name);

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

  private nodeForSnapshotObjectId(snapshotObjectId: number): HeapSnapshotNode|null {
    for (let it = this.allNodes(); it.hasNext(); it.next()) {
      if (it.node.id() === snapshotObjectId) {
        return it.node;
      }
    }
    return null;
  }

  // Converts an internal class key, suitable for categorizing within this
  // snapshot, to a public class key, which can be used in comparisons
  // between multiple snapshots.
  classKeyFromClassKeyInternal(key: string|number): string {
    return typeof key === 'number' ? (',' + this.strings[key]) : key;
  }

  nodeClassKey(snapshotObjectId: number): string|null {
    const node = this.nodeForSnapshotObjectId(snapshotObjectId);
    if (node) {
      return this.classKeyFromClassKeyInternal(node.classKeyInternal());
    }
    return null;
  }

  idsOfObjectsWithName(name: string): number[] {
    const ids = [];
    for (let it = this.allNodes(); it.hasNext(); it.next()) {
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

  createAddedNodesProvider(baseSnapshotId: string, classKey: string): HeapSnapshotNodesProvider {
    const snapshotDiff = this.#snapshotDiffs[baseSnapshotId];
    const diffForClass = snapshotDiff[classKey];
    return new HeapSnapshotNodesProvider(this, diffForClass.addedIndexes);
  }

  createDeletedNodesProvider(nodeIndexes: number[]): HeapSnapshotNodesProvider {
    return new HeapSnapshotNodesProvider(this, nodeIndexes);
  }

  createNodesProviderForClass(classKey: string, nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter):
      HeapSnapshotNodesProvider {
    return new HeapSnapshotNodesProvider(this, this.aggregatesWithFilter(nodeFilter)[classKey].idxs);
  }

  private maxJsNodeId(): number {
    const nodeFieldCount = this.nodeFieldCount;
    const nodes = this.nodes;
    const nodesLength = nodes.length;
    let id = 0;
    for (let nodeIndex = this.nodeIdOffset; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      const nextId = nodes.getValue(nodeIndex);
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
        this.nodeCount, this.rootNodeIndexInternal, this.totalSize, this.maxJsNodeId());
  }

  ignoreNodeInRetainersView(nodeIndex: number): void {
    this.#ignoredNodesInRetainersView.add(nodeIndex);
    this.calculateDistances(/* isForRetainersView=*/ true);
    this.#updateIgnoredEdgesInRetainersView();
  }

  unignoreNodeInRetainersView(nodeIndex: number): void {
    this.#ignoredNodesInRetainersView.delete(nodeIndex);
    if (this.#ignoredNodesInRetainersView.size === 0) {
      this.#nodeDistancesForRetainersView = undefined;
    } else {
      this.calculateDistances(/* isForRetainersView=*/ true);
    }
    this.#updateIgnoredEdgesInRetainersView();
  }

  unignoreAllNodesInRetainersView(): void {
    this.#ignoredNodesInRetainersView.clear();
    this.#nodeDistancesForRetainersView = undefined;
    this.#updateIgnoredEdgesInRetainersView();
  }

  #updateIgnoredEdgesInRetainersView(): void {
    const distances = this.#nodeDistancesForRetainersView;
    this.#ignoredEdgesInRetainersView.clear();
    if (distances === undefined) {
      return;
    }

    // To retain a value in a WeakMap, both the WeakMap and the corresponding
    // key must stay alive. If one of those two retainers is unreachable due to
    // the user ignoring some nodes, then the other retainer edge should also be
    // shown as unreachable, since it would be insufficient on its own to retain
    // the value.
    const unreachableWeakMapEdges = new Platform.MapUtilities.Multimap<number, string>();
    const noDistance = this.#noDistance;
    const {nodeCount, nodeFieldCount} = this;
    const node = this.createNode(0);

    // Populate unreachableWeakMapEdges.
    for (let nodeOrdinal = 0; nodeOrdinal < nodeCount; ++nodeOrdinal) {
      if (distances[nodeOrdinal] !== noDistance) {
        continue;
      }
      node.nodeIndex = nodeOrdinal * nodeFieldCount;
      for (let iter = node.edges(); iter.hasNext(); iter.next()) {
        const edge = iter.edge;
        if (!edge.isInternal()) {
          continue;
        }
        const match = this.tryParseWeakMapEdgeName(edge.nameIndex());
        if (match) {
          unreachableWeakMapEdges.set(edge.nodeIndex(), match.duplicatedPart);
        }
      }
    }

    // Iterate the retaining edges for the target nodes found in the previous
    // step and mark any relevant WeakMap edges as ignored.
    for (const targetNodeIndex of unreachableWeakMapEdges.keys()) {
      node.nodeIndex = targetNodeIndex;
      for (let it = node.retainers(); it.hasNext(); it.next()) {
        const reverseEdge = it.item();
        if (!reverseEdge.isInternal()) {
          continue;
        }
        const match = this.tryParseWeakMapEdgeName(reverseEdge.nameIndex());
        if (match && unreachableWeakMapEdges.hasValue(targetNodeIndex, match.duplicatedPart)) {
          const forwardEdgeIndex = this.retainingEdges[reverseEdge.itemIndex()];
          this.#ignoredEdgesInRetainersView.add(forwardEdgeIndex);
        }
      }
    }
  }

  areNodesIgnoredInRetainersView(): boolean {
    return this.#ignoredNodesInRetainersView.size > 0;
  }

  getDistanceForRetainersView(nodeIndex: number): number {
    const nodeOrdinal = nodeIndex / this.nodeFieldCount;
    const distances = this.#nodeDistancesForRetainersView ?? this.nodeDistances;
    const distance = distances[nodeOrdinal];
    if (distance === this.#noDistance) {
      // An unreachable node should be sorted to the end, not the beginning.
      // To give such nodes a reasonable sorting order, we add a very large
      // number to the original distance computed without ignoring any nodes.
      return Math.max(0, this.nodeDistances[nodeOrdinal]) + HeapSnapshotModel.HeapSnapshotModel.baseUnreachableDistance;
    }
    return distance;
  }

  isNodeIgnoredInRetainersView(nodeIndex: number): boolean {
    return this.#ignoredNodesInRetainersView.has(nodeIndex);
  }

  isEdgeIgnoredInRetainersView(edgeIndex: number): boolean {
    return this.#ignoredEdgesInRetainersView.has(edgeIndex);
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
  protected readonly iterator: HeapSnapshotItemIterator;
  readonly #indexProvider: HeapSnapshotItemIndexProvider;
  readonly #isEmptyInternal: boolean;
  protected iterationOrder: number[]|null;
  protected currentComparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig|null;
  #sortedPrefixLength: number;
  #sortedSuffixLength: number;
  constructor(iterator: HeapSnapshotItemIterator, indexProvider: HeapSnapshotItemIndexProvider) {
    this.iterator = iterator;
    this.#indexProvider = indexProvider;
    this.#isEmptyInternal = !iterator.hasNext();
    this.iterationOrder = null;
    this.currentComparator = null;
    this.#sortedPrefixLength = 0;
    this.#sortedSuffixLength = 0;
  }

  protected createIterationOrder(): void {
    if (this.iterationOrder) {
      return;
    }
    this.iterationOrder = [];
    for (let iterator = this.iterator; iterator.hasNext(); iterator.next()) {
      this.iterationOrder.push(iterator.item().itemIndex());
    }
  }

  isEmpty(): boolean {
    return this.#isEmptyInternal;
  }

  serializeItemsRange(begin: number, end: number): HeapSnapshotModel.HeapSnapshotModel.ItemsRange {
    this.createIterationOrder();
    if (begin > end) {
      throw new Error('Start position > end position: ' + begin + ' > ' + end);
    }

    if (!this.iterationOrder) {
      throw new Error('Iteration order undefined');
    }

    if (end > this.iterationOrder.length) {
      end = this.iterationOrder.length;
    }
    if (this.#sortedPrefixLength < end && begin < this.iterationOrder.length - this.#sortedSuffixLength &&
        this.currentComparator) {
      const currentComparator = this.currentComparator;
      this.sort(
          currentComparator, this.#sortedPrefixLength, this.iterationOrder.length - 1 - this.#sortedSuffixLength, begin,
          end - 1);
      if (begin <= this.#sortedPrefixLength) {
        this.#sortedPrefixLength = end;
      }
      if (end >= this.iterationOrder.length - this.#sortedSuffixLength) {
        this.#sortedSuffixLength = this.iterationOrder.length - begin;
      }
    }
    let position = begin;
    const count = end - begin;
    const result = new Array(count);
    for (let i = 0; i < count; ++i) {
      const itemIndex = this.iterationOrder[position++];
      const item = this.#indexProvider.itemForIndex(itemIndex);
      result[i] = item.serialize();
    }
    return new HeapSnapshotModel.HeapSnapshotModel.ItemsRange(begin, end, this.iterationOrder.length, result);
  }

  sortAndRewind(comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig): void {
    this.currentComparator = comparator;
    this.#sortedPrefixLength = 0;
    this.#sortedSuffixLength = 0;
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

    const edgeA = (this.iterator.item() as HeapSnapshotEdge | HeapSnapshotRetainerEdge).clone();
    const edgeB = edgeA.clone();
    const nodeA = this.snapshot.createNode();
    const nodeB = this.snapshot.createNode();

    function compareEdgeField(fieldName: string, ascending: boolean, indexA: number, indexB: number): number {
      edgeA.edgeIndex = indexA;
      edgeB.edgeIndex = indexB;
      let result: number = 0;
      if (fieldName === '!edgeName') {
        if (edgeB.name() === '__proto__') {
          return -1;
        }
        if (edgeA.name() === '__proto__') {
          return 1;
        }
        result = edgeA.hasStringName() === edgeB.hasStringName() ?
            (edgeA.name() < edgeB.name() ? -1 : (edgeA.name() > edgeB.name() ? 1 : 0)) :
            (edgeA.hasStringName() ? -1 : 1);
      } else {
        result = edgeA.getValueForSorting(fieldName) - edgeB.getValueForSorting(fieldName);
      }
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

    function compareEdgeAndEdge(indexA: number, indexB: number): number {
      let result = compareEdgeField(fieldName1, ascending1, indexA, indexB);
      if (result === 0) {
        result = compareEdgeField(fieldName2, ascending2, indexA, indexB);
      }
      if (result === 0) {
        return indexA - indexB;
      }
      return result;
    }

    function compareEdgeAndNode(indexA: number, indexB: number): number {
      let result = compareEdgeField(fieldName1, ascending1, indexA, indexB);
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
        result = compareEdgeField(fieldName2, ascending2, indexA, indexB);
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

    if (!this.iterationOrder) {
      throw new Error('Iteration order not defined');
    }

    function isEdgeFieldName(fieldName: string): boolean {
      return fieldName.startsWith('!edge');
    }

    if (isEdgeFieldName(fieldName1)) {
      if (isEdgeFieldName(fieldName2)) {
        Platform.ArrayUtilities.sortRange(
            this.iterationOrder, compareEdgeAndEdge, leftBound, rightBound, windowLeft, windowRight);
      } else {
        Platform.ArrayUtilities.sortRange(
            this.iterationOrder, compareEdgeAndNode, leftBound, rightBound, windowLeft, windowRight);
      }
    } else if (isEdgeFieldName(fieldName2)) {
      Platform.ArrayUtilities.sortRange(
          this.iterationOrder, compareNodeAndEdge, leftBound, rightBound, windowLeft, windowRight);
    } else {
      Platform.ArrayUtilities.sortRange(
          this.iterationOrder, compareNodeAndNode, leftBound, rightBound, windowLeft, windowRight);
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
    this.createIterationOrder();
    const node = this.snapshot.createNode();
    let i = 0;
    if (!this.iterationOrder) {
      throw new Error('Iteration order not defined');
    }

    for (; i < this.iterationOrder.length; i++) {
      node.nodeIndex = this.iterationOrder[i];
      if (node.id() === snapshotObjectId) {
        break;
      }
    }
    if (i === this.iterationOrder.length) {
      return -1;
    }
    const targetNodeIndex = this.iterationOrder[i];
    let smallerCount = 0;

    const currentComparator = (this.currentComparator as HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig);
    const compare = this.buildCompareFunction(currentComparator);
    for (let i = 0; i < this.iterationOrder.length; i++) {
      if (compare(this.iterationOrder[i], targetNodeIndex) < 0) {
        ++smallerCount;
      }
    }
    return smallerCount;
  }

  private buildCompareFunction(comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig):
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

    function sortByNodeField(fieldAccessor: () => void, ascending: number): number {
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
    if (!this.iterationOrder) {
      throw new Error('Iteration order not defined');
    }

    Platform.ArrayUtilities.sortRange(
        this.iterationOrder, this.buildCompareFunction(comparator), leftBound, rightBound, windowLeft, windowRight);
  }
}

export class JSHeapSnapshot extends HeapSnapshot {
  readonly nodeFlags: {
    // bit flags in 8-bit value
    canBeQueried: number,
    detachedDOMTreeNode: number,
    pageObject:
        number,  // The idea is to track separately the objects owned by the page and the objects owned by debugger.
  };
  private flags!: Uint8Array;
  #statistics?: HeapSnapshotModel.HeapSnapshotModel.Statistics;
  constructor(profile: Profile, progress: HeapSnapshotProgress) {
    super(profile, progress);
    this.nodeFlags = {
      // bit flags in 8-bit value
      canBeQueried: 1,
      detachedDOMTreeNode: 2,
      pageObject:
          4,  // The idea is to track separately the objects owned by the page and the objects owned by debugger.
    };
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

  override containmentEdgesFilter(): (arg0: HeapSnapshotEdge) => boolean {
    return (edge: HeapSnapshotEdge): boolean => !edge.isInvisible();
  }

  override retainingEdgesFilter(): (arg0: HeapSnapshotEdge) => boolean {
    const containmentEdgesFilter = this.containmentEdgesFilter();
    function filter(edge: HeapSnapshotEdge): boolean {
      return containmentEdgesFilter(edge) && !edge.node().isRoot() && !edge.isWeak();
    }
    return filter;
  }

  override calculateFlags(): void {
    this.flags = new Uint8Array(this.nodeCount);
    this.markDetachedDOMTreeNodes();
    this.markQueriableHeapObjects();
    this.markPageOwnedNodes();
  }

  #hasUserRoots(): boolean {
    for (let iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
      if (this.isUserRoot(iter.edge.node())) {
        return true;
      }
    }
    return false;
  }

  // Updates the shallow sizes for "owned" objects of types kArray or kHidden to
  // zero, and add their sizes to the "owner" object instead.
  override calculateShallowSizes(): void {
    // If there are no user roots, then that means the snapshot was produced with
    // the "expose internals" option enabled. In that case, we should faithfully
    // represent the actual memory allocations rather than attempting to make the
    // output more understandable to web developers.
    if (!this.#hasUserRoots()) {
      return;
    }

    const {nodeCount, nodes, nodeFieldCount, nodeSelfSizeOffset} = this;

    const kUnvisited = 0xffffffff;
    const kHasMultipleOwners = 0xfffffffe;
    if (nodeCount >= kHasMultipleOwners) {
      throw new Error('Too many nodes for calculateShallowSizes');
    }
    // For each node in order, `owners` will contain the index of the owning
    // node or one of the two values kUnvisited or kHasMultipleOwners. The
    // indexes in this array are NOT already multiplied by nodeFieldCount.
    const owners = new Uint32Array(nodeCount);
    // The worklist contains the indexes of nodes which should be visited during
    // the second loop below. The order of visiting doesn't matter. The indexes
    // in this array are NOT already multiplied by nodeFieldCount.
    const worklist: number[] = [];

    const node = this.createNode(0);
    for (let i = 0; i < nodeCount; ++i) {
      if (node.isHidden() || node.isArray()) {
        owners[i] = kUnvisited;
      } else {
        // The node owns itself.
        owners[i] = i;
        worklist.push(i);
      }
      node.nodeIndex = node.nextNodeIndex();
    }

    while (worklist.length !== 0) {
      const id = worklist.pop() as number;
      const owner = owners[id];
      node.nodeIndex = id * nodeFieldCount;
      for (let iter = node.edges(); iter.hasNext(); iter.next()) {
        const edge = iter.edge;
        if (edge.isWeak()) {
          continue;
        }
        const targetId = edge.nodeIndex() / nodeFieldCount;
        switch (owners[targetId]) {
          case kUnvisited:
            owners[targetId] = owner;
            worklist.push(targetId);
            break;
          case targetId:
          case owner:
          case kHasMultipleOwners:
            // There is no change necessary if the target is already marked as:
            // * owned by itself,
            // * owned by the owner of the current source node, or
            // * owned by multiple nodes.
            break;
          default:
            owners[targetId] = kHasMultipleOwners;
            // It is possible that this node is already in the worklist
            // somewhere, but visiting it an extra time is not harmful. The
            // iteration is guaranteed to complete because each node can only be
            // added twice to the worklist: once when changing from kUnvisited
            // to a specific owner, and a second time when changing from that
            // owner to kHasMultipleOwners.
            worklist.push(targetId);
            break;
        }
      }
    }

    for (let i = 0; i < nodeCount; ++i) {
      const ownerId = owners[i];
      switch (ownerId) {
        case kUnvisited:
        case kHasMultipleOwners:
        case i:
          break;
        default: {
          const ownedNodeIndex = i * nodeFieldCount;
          const ownerNodeIndex = ownerId * nodeFieldCount;
          node.nodeIndex = ownerNodeIndex;
          if (node.isSynthetic() || node.isRoot()) {
            // Adding shallow size to synthetic or root nodes is not useful.
            break;
          }
          const sizeToTransfer = nodes.getValue(ownedNodeIndex + nodeSelfSizeOffset);
          nodes.setValue(ownedNodeIndex + nodeSelfSizeOffset, 0);
          nodes.setValue(
              ownerNodeIndex + nodeSelfSizeOffset,
              nodes.getValue(ownerNodeIndex + nodeSelfSizeOffset) + sizeToTransfer);
          break;
        }
      }
    }
  }

  override calculateDistances(isForRetainersView: boolean): void {
    const pendingEphemeronEdges = new Set<string>();
    const snapshot = this;
    function filter(node: HeapSnapshotNode, edge: HeapSnapshotEdge): boolean {
      if (node.isHidden() && edge.name() === 'sloppy_function_map' && node.rawName() === 'system / NativeContext') {
        return false;
      }
      if (node.isArray() && node.rawName() === '(map descriptors)') {
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
        const index = parseInt(edge.name(), 10);
        return index < 2 || (index % 3) !== 1;
      }
      if (edge.isInternal()) {
        // Snapshots represent WeakMap values as being referenced by two edges:
        // one from the WeakMap, and a second from the corresponding key. To
        // avoid the case described in crbug.com/1290800, we should set the
        // distance of that value to the greater of (WeakMap+1, key+1). This
        // part of the filter skips the first edge in the matched pair of edges,
        // so that the distance gets set based on the second, which should be
        // greater or equal due to traversal order.
        const match = snapshot.tryParseWeakMapEdgeName(edge.nameIndex());
        if (match) {
          if (!pendingEphemeronEdges.delete(match.duplicatedPart)) {
            pendingEphemeronEdges.add(match.duplicatedPart);
            return false;
          }
        }
      }
      return true;
    }
    super.calculateDistances(isForRetainersView, filter);
  }

  override isUserRoot(node: HeapSnapshotNode): boolean {
    return node.isUserRoot() || node.isDocumentDOMTreesRoot();
  }

  override userObjectsMapAndFlag(): {map: Uint8Array, flag: number}|null {
    return {map: this.flags, flag: this.nodeFlags.pageObject};
  }

  flagsOfNode(node: HeapSnapshotNode): number {
    return this.flags[node.nodeIndex / this.nodeFieldCount];
  }

  private markDetachedDOMTreeNodes(): void {
    const nodes = this.nodes;
    const nodesLength = nodes.length;
    const nodeFieldCount = this.nodeFieldCount;
    const nodeNativeType = this.nodeNativeType;
    const nodeTypeOffset = this.nodeTypeOffset;
    const flag = this.nodeFlags.detachedDOMTreeNode;
    const node = this.rootNode();
    for (let nodeIndex = 0, ordinal = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount, ordinal++) {
      const nodeType = nodes.getValue(nodeIndex + nodeTypeOffset);
      if (nodeType !== nodeNativeType) {
        continue;
      }
      node.nodeIndex = nodeIndex;
      if (node.name().startsWith('Detached ')) {
        this.flags[ordinal] |= flag;
      }
    }
  }

  private markQueriableHeapObjects(): void {
    // Allow runtime properties query for objects accessible from Window objects
    // via regular properties, and for DOM wrappers. Trying to access random objects
    // can cause a crash due to inconsistent state of internal properties of wrappers.
    const flag = this.nodeFlags.canBeQueried;
    const hiddenEdgeType = this.edgeHiddenType;
    const internalEdgeType = this.edgeInternalType;
    const invisibleEdgeType = this.edgeInvisibleType;
    const weakEdgeType = this.edgeWeakType;
    const edgeToNodeOffset = this.edgeToNodeOffset;
    const edgeTypeOffset = this.edgeTypeOffset;
    const edgeFieldsCount = this.edgeFieldsCount;
    const containmentEdges = this.containmentEdges;
    const nodeFieldCount = this.nodeFieldCount;
    const firstEdgeIndexes = this.firstEdgeIndexes;

    const flags = this.flags;
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
        const childNodeIndex = containmentEdges.getValue(edgeIndex + edgeToNodeOffset);
        const childNodeOrdinal = childNodeIndex / nodeFieldCount;
        if (flags[childNodeOrdinal] & flag) {
          continue;
        }
        const type = containmentEdges.getValue(edgeIndex + edgeTypeOffset);
        if (type === hiddenEdgeType || type === invisibleEdgeType || type === internalEdgeType ||
            type === weakEdgeType) {
          continue;
        }
        list.push(childNodeOrdinal);
      }
    }
  }

  private markPageOwnedNodes(): void {
    const edgeShortcutType = this.edgeShortcutType;
    const edgeElementType = this.edgeElementType;
    const edgeToNodeOffset = this.edgeToNodeOffset;
    const edgeTypeOffset = this.edgeTypeOffset;
    const edgeFieldsCount = this.edgeFieldsCount;
    const edgeWeakType = this.edgeWeakType;
    const firstEdgeIndexes = this.firstEdgeIndexes;
    const containmentEdges = this.containmentEdges;
    const nodeFieldCount = this.nodeFieldCount;
    const nodesCount = this.nodeCount;

    const flags = this.flags;
    const pageObjectFlag = this.nodeFlags.pageObject;

    const nodesToVisit = new Uint32Array(nodesCount);
    let nodesToVisitLength = 0;

    const rootNodeOrdinal = this.rootNodeIndexInternal / nodeFieldCount;
    const node = this.rootNode();

    // Populate the entry points. They are Window objects and DOM Tree Roots.
    for (let edgeIndex = firstEdgeIndexes[rootNodeOrdinal], endEdgeIndex = firstEdgeIndexes[rootNodeOrdinal + 1];
         edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
      const edgeType = containmentEdges.getValue(edgeIndex + edgeTypeOffset);
      const nodeIndex = containmentEdges.getValue(edgeIndex + edgeToNodeOffset);
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
        const childNodeIndex = containmentEdges.getValue(edgeIndex + edgeToNodeOffset);
        const childNodeOrdinal = childNodeIndex / nodeFieldCount;
        if (flags[childNodeOrdinal] & pageObjectFlag) {
          continue;
        }
        const type = containmentEdges.getValue(edgeIndex + edgeTypeOffset);
        if (type === edgeWeakType) {
          continue;
        }
        nodesToVisit[nodesToVisitLength++] = childNodeOrdinal;
        flags[childNodeOrdinal] |= pageObjectFlag;
      }
    }
  }

  override calculateStatistics(): void {
    const nodeFieldCount = this.nodeFieldCount;
    const nodes = this.nodes;
    const nodesLength = nodes.length;
    const nodeTypeOffset = this.nodeTypeOffset;
    const nodeSizeOffset = this.nodeSelfSizeOffset;
    const nodeNativeType = this.nodeNativeType;
    const nodeCodeType = this.nodeCodeType;
    const nodeConsStringType = this.nodeConsStringType;
    const nodeSlicedStringType = this.nodeSlicedStringType;
    const distances = this.nodeDistances;
    let sizeNative = 0;
    let sizeCode = 0;
    let sizeStrings = 0;
    let sizeJSArrays = 0;
    let sizeSystem = 0;
    const node = this.rootNode();
    for (let nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      const nodeSize = nodes.getValue(nodeIndex + nodeSizeOffset);
      const ordinal = nodeIndex / nodeFieldCount;
      if (distances[ordinal] >= HeapSnapshotModel.HeapSnapshotModel.baseSystemDistance) {
        sizeSystem += nodeSize;
        continue;
      }
      const nodeType = nodes.getValue(nodeIndex + nodeTypeOffset);
      node.nodeIndex = nodeIndex;
      if (nodeType === nodeNativeType) {
        sizeNative += nodeSize;
      } else if (nodeType === nodeCodeType) {
        sizeCode += nodeSize;
      } else if (nodeType === nodeConsStringType || nodeType === nodeSlicedStringType || node.type() === 'string') {
        sizeStrings += nodeSize;
      } else if (node.rawName() === 'Array') {
        sizeJSArrays += this.calculateArraySize(node);
      }
    }
    this.#statistics = new HeapSnapshotModel.HeapSnapshotModel.Statistics();
    this.#statistics.total = this.totalSize;
    this.#statistics.v8heap = this.totalSize - sizeNative;
    this.#statistics.native = sizeNative;
    this.#statistics.code = sizeCode;
    this.#statistics.jsArrays = sizeJSArrays;
    this.#statistics.strings = sizeStrings;
    this.#statistics.system = sizeSystem;
  }

  private calculateArraySize(node: HeapSnapshotNode): number {
    let size = node.selfSize();
    const beginEdgeIndex = node.edgeIndexesStart();
    const endEdgeIndex = node.edgeIndexesEnd();
    const containmentEdges = this.containmentEdges;
    const strings = this.strings;
    const edgeToNodeOffset = this.edgeToNodeOffset;
    const edgeTypeOffset = this.edgeTypeOffset;
    const edgeNameOffset = this.edgeNameOffset;
    const edgeFieldsCount = this.edgeFieldsCount;
    const edgeInternalType = this.edgeInternalType;
    for (let edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
      const edgeType = containmentEdges.getValue(edgeIndex + edgeTypeOffset);
      if (edgeType !== edgeInternalType) {
        continue;
      }
      const edgeName = strings[containmentEdges.getValue(edgeIndex + edgeNameOffset)];
      if (edgeName !== 'elements') {
        continue;
      }
      const elementsNodeIndex = containmentEdges.getValue(edgeIndex + edgeToNodeOffset);
      node.nodeIndex = elementsNodeIndex;
      if (node.retainersCount() === 1) {
        size += node.selfSize();
      }
      break;
    }
    return size;
  }

  getStatistics(): HeapSnapshotModel.HeapSnapshotModel.Statistics {
    return this.#statistics as HeapSnapshotModel.HeapSnapshotModel.Statistics;
  }
}

export class JSHeapSnapshotNode extends HeapSnapshotNode {
  constructor(snapshot: JSHeapSnapshot, nodeIndex?: number) {
    super(snapshot, nodeIndex);
  }

  canBeQueried(): boolean {
    const snapshot = (this.snapshot as JSHeapSnapshot);
    const flags = snapshot.flagsOfNode(this);
    return Boolean(flags & snapshot.nodeFlags.canBeQueried);
  }

  override name(): string {
    const snapshot = this.snapshot;
    if (this.rawType() === snapshot.nodeConsStringType) {
      return this.consStringName();
    }
    if (this.rawType() === snapshot.nodeObjectType && this.rawName() === 'Object') {
      return this.#plainObjectName();
    }
    return this.rawName();
  }

  private consStringName(): string {
    const snapshot = this.snapshot;
    const consStringType = snapshot.nodeConsStringType;
    const edgeInternalType = snapshot.edgeInternalType;
    const edgeFieldsCount = snapshot.edgeFieldsCount;
    const edgeToNodeOffset = snapshot.edgeToNodeOffset;
    const edgeTypeOffset = snapshot.edgeTypeOffset;
    const edgeNameOffset = snapshot.edgeNameOffset;
    const strings = snapshot.strings;
    const edges = snapshot.containmentEdges;
    const firstEdgeIndexes = snapshot.firstEdgeIndexes;
    const nodeFieldCount = snapshot.nodeFieldCount;
    const nodeTypeOffset = snapshot.nodeTypeOffset;
    const nodeNameOffset = snapshot.nodeNameOffset;
    const nodes = snapshot.nodes;
    const nodesStack = [];
    nodesStack.push(this.nodeIndex);
    let name = '';

    while (nodesStack.length && name.length < 1024) {
      const nodeIndex = (nodesStack.pop() as number);
      if (nodes.getValue(nodeIndex + nodeTypeOffset) !== consStringType) {
        name += strings[nodes.getValue(nodeIndex + nodeNameOffset)];
        continue;
      }
      const nodeOrdinal = nodeIndex / nodeFieldCount;
      const beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      const endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      let firstNodeIndex = 0;
      let secondNodeIndex = 0;
      for (let edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex && (!firstNodeIndex || !secondNodeIndex);
           edgeIndex += edgeFieldsCount) {
        const edgeType = edges.getValue(edgeIndex + edgeTypeOffset);
        if (edgeType === edgeInternalType) {
          const edgeName = strings[edges.getValue(edgeIndex + edgeNameOffset)];
          if (edgeName === 'first') {
            firstNodeIndex = edges.getValue(edgeIndex + edgeToNodeOffset);
          } else if (edgeName === 'second') {
            secondNodeIndex = edges.getValue(edgeIndex + edgeToNodeOffset);
          }
        }
      }
      nodesStack.push(secondNodeIndex);
      nodesStack.push(firstNodeIndex);
    }
    return name;
  }

  // Creates a name for plain JS objects, which looks something like
  // '{propName, otherProp, thirdProp, ..., secondToLastProp, lastProp}'.
  // A variable number of property names is included, depending on the length
  // of the property names, so that the result fits nicely in a reasonably
  // sized DevTools window.
  #plainObjectName(): string {
    const snapshot = this.snapshot;
    const {edgeFieldsCount, edgePropertyType} = snapshot;
    const edge = snapshot.createEdge(0);
    let categoryNameStart = '{';
    let categoryNameEnd = '}';
    let edgeIndexFromStart = this.edgeIndexesStart();
    let edgeIndexFromEnd = this.edgeIndexesEnd() - edgeFieldsCount;
    let nextFromEnd = false;
    while (edgeIndexFromStart <= edgeIndexFromEnd) {
      edge.edgeIndex = nextFromEnd ? edgeIndexFromEnd : edgeIndexFromStart;

      // Skip non-property edges and the special __proto__ property.
      if (edge.rawType() !== edgePropertyType || edge.name() === '__proto__') {
        if (nextFromEnd) {
          edgeIndexFromEnd -= edgeFieldsCount;
        } else {
          edgeIndexFromStart += edgeFieldsCount;
        }
        continue;
      }

      const formatted = JSHeapSnapshotNode.formatPropertyName(edge.name());

      // Always include at least one property, regardless of its length. Beyond that point,
      // only include more properties if the name isn't too long.
      if (categoryNameStart.length > 1 && categoryNameStart.length + categoryNameEnd.length + formatted.length > 100) {
        break;
      }

      if (nextFromEnd) {
        edgeIndexFromEnd -= edgeFieldsCount;
        if (categoryNameEnd.length > 1) {
          categoryNameEnd = ', ' + categoryNameEnd;
        }
        categoryNameEnd = formatted + categoryNameEnd;
      } else {
        edgeIndexFromStart += edgeFieldsCount;
        if (categoryNameStart.length > 1) {
          categoryNameStart += ', ';
        }
        categoryNameStart += formatted;
      }
      nextFromEnd = !nextFromEnd;
    }
    if (edgeIndexFromStart <= edgeIndexFromEnd) {
      categoryNameStart += ', ...';
    }
    if (categoryNameEnd.length > 1) {
      categoryNameStart += ', ';
    }
    return categoryNameStart + categoryNameEnd;
  }

  static formatPropertyName(name: string): string {
    // We don't need a strict test for whether a property name follows the
    // rules for being a JS identifier, but property names containing commas,
    // quotation marks, or braces could cause confusion, so we'll escape those.
    if (/[,'"{}]/.test(name)) {
      name = JSON.stringify({[name]: 0});
      name = name.substring(1, name.length - 3);
    }
    return name;
  }

  override id(): number {
    const snapshot = this.snapshot;
    return snapshot.nodes.getValue(this.nodeIndex + snapshot.nodeIdOffset);
  }

  override isHidden(): boolean {
    return this.rawType() === this.snapshot.nodeHiddenType;
  }

  override isArray(): boolean {
    return this.rawType() === this.snapshot.nodeArrayType;
  }

  override isSynthetic(): boolean {
    return this.rawType() === this.snapshot.nodeSyntheticType;
  }

  override isUserRoot(): boolean {
    return !this.isSynthetic();
  }

  override isDocumentDOMTreesRoot(): boolean {
    return this.isSynthetic() && this.rawName() === '(Document DOM trees)';
  }

  override serialize(): HeapSnapshotModel.HeapSnapshotModel.Node {
    const result = super.serialize();
    const snapshot = (this.snapshot as JSHeapSnapshot);
    const flags = snapshot.flagsOfNode(this);
    if (flags & snapshot.nodeFlags.canBeQueried) {
      result.canBeQueried = true;
    }
    if (flags & snapshot.nodeFlags.detachedDOMTreeNode) {
      result.detachedDOMTreeNode = true;
    }
    return result;
  }
}

export class JSHeapSnapshotEdge extends HeapSnapshotEdge {
  constructor(snapshot: JSHeapSnapshot, edgeIndex?: number) {
    super(snapshot, edgeIndex);
  }

  override clone(): JSHeapSnapshotEdge {
    const snapshot = (this.snapshot as JSHeapSnapshot);
    return new JSHeapSnapshotEdge(snapshot, this.edgeIndex);
  }

  override hasStringName(): boolean {
    if (!this.isShortcut()) {
      return this.hasStringNameInternal();
    }
    // @ts-ignore parseInt is successful against numbers.
    return isNaN(parseInt(this.nameInternal(), 10));
  }

  isElement(): boolean {
    return this.rawType() === this.snapshot.edgeElementType;
  }

  isHidden(): boolean {
    return this.rawType() === this.snapshot.edgeHiddenType;
  }

  override isWeak(): boolean {
    return this.rawType() === this.snapshot.edgeWeakType;
  }

  override isInternal(): boolean {
    return this.rawType() === this.snapshot.edgeInternalType;
  }

  override isInvisible(): boolean {
    return this.rawType() === this.snapshot.edgeInvisibleType;
  }

  isShortcut(): boolean {
    return this.rawType() === this.snapshot.edgeShortcutType;
  }

  override name(): string {
    const name = this.nameInternal();
    if (!this.isShortcut()) {
      return String(name);
    }
    // @ts-ignore parseInt is successful against numbers.
    const numName = parseInt(name, 10);
    return String(isNaN(numName) ? name : numName);
  }

  override toString(): string {
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

  private hasStringNameInternal(): boolean {
    const type = this.rawType();
    const snapshot = this.snapshot;
    return type !== snapshot.edgeElementType && type !== snapshot.edgeHiddenType;
  }

  private nameInternal(): string|number {
    return this.hasStringNameInternal() ? this.snapshot.strings[this.nameOrIndex()] : this.nameOrIndex();
  }

  private nameOrIndex(): number {
    return this.edges.getValue(this.edgeIndex + this.snapshot.edgeNameOffset);
  }

  override rawType(): number {
    return this.edges.getValue(this.edgeIndex + this.snapshot.edgeTypeOffset);
  }

  override nameIndex(): number {
    if (!this.hasStringNameInternal()) {
      throw new Error('Edge does not have string name');
    }
    return this.nameOrIndex();
  }
}

export class JSHeapSnapshotRetainerEdge extends HeapSnapshotRetainerEdge {
  constructor(snapshot: JSHeapSnapshot, retainerIndex: number) {
    super(snapshot, retainerIndex);
  }

  override clone(): JSHeapSnapshotRetainerEdge {
    const snapshot = (this.snapshot as JSHeapSnapshot);
    return new JSHeapSnapshotRetainerEdge(snapshot, this.retainerIndex());
  }

  isHidden(): boolean {
    return this.edge().isHidden();
  }

  isInvisible(): boolean {
    return this.edge().isInvisible();
  }

  isShortcut(): boolean {
    return this.edge().isShortcut();
  }

  isWeak(): boolean {
    return this.edge().isWeak();
  }
}
export interface AggregatedInfo {
  count: number;
  distance: number;
  self: number;
  maxRet: number;
  name: string;
  idxs: number[];
}
