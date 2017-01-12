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
/**
 * @interface
 */
HeapSnapshotWorker.HeapSnapshotItem = function() {};

HeapSnapshotWorker.HeapSnapshotItem.prototype = {
  /**
   * @return {number}
   */
  itemIndex() {},

  /**
   * @return {!Object}
   */
  serialize() {}
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItem}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotEdge = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshot} snapshot
   * @param {number=} edgeIndex
   */
  constructor(snapshot, edgeIndex) {
    this._snapshot = snapshot;
    this._edges = snapshot.containmentEdges;
    this.edgeIndex = edgeIndex || 0;
  }

  /**
   * @return {!HeapSnapshotWorker.HeapSnapshotEdge}
   */
  clone() {
    return new HeapSnapshotWorker.HeapSnapshotEdge(this._snapshot, this.edgeIndex);
  }

  /**
   * @return {boolean}
   */
  hasStringName() {
    throw new Error('Not implemented');
  }

  /**
   * @return {string}
   */
  name() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!HeapSnapshotWorker.HeapSnapshotNode}
   */
  node() {
    return this._snapshot.createNode(this.nodeIndex());
  }

  /**
   * @return {number}
   */
  nodeIndex() {
    return this._edges[this.edgeIndex + this._snapshot._edgeToNodeOffset];
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    return 'HeapSnapshotEdge: ' + this.name();
  }

  /**
   * @return {string}
   */
  type() {
    return this._snapshot._edgeTypes[this.rawType()];
  }

  /**
   * @override
   * @return {number}
   */
  itemIndex() {
    return this.edgeIndex;
  }

  /**
   * @override
   * @return {!HeapSnapshotModel.Edge}
   */
  serialize() {
    return new HeapSnapshotModel.Edge(this.name(), this.node().serialize(), this.type(), this.edgeIndex);
  }

  /**
   * @protected
   * @return {number}
   */
  rawType() {
    return this._edges[this.edgeIndex + this._snapshot._edgeTypeOffset];
  }
};

/**
 * @interface
 */
HeapSnapshotWorker.HeapSnapshotItemIterator = function() {};

HeapSnapshotWorker.HeapSnapshotItemIterator.prototype = {
  /**
   * @return {boolean}
   */
  hasNext() {},

  /**
   * @return {!HeapSnapshotWorker.HeapSnapshotItem}
   */
  item() {},

  next() {}
};

/**
 * @interface
 */
HeapSnapshotWorker.HeapSnapshotItemIndexProvider = function() {};

HeapSnapshotWorker.HeapSnapshotItemIndexProvider.prototype = {
  /**
   * @param {number} newIndex
   * @return {!HeapSnapshotWorker.HeapSnapshotItem}
   */
  itemForIndex(newIndex) {},
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItemIndexProvider}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotNodeIndexProvider = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshot} snapshot
   */
  constructor(snapshot) {
    this._node = snapshot.createNode();
  }

  /**
   * @override
   * @param {number} index
   * @return {!HeapSnapshotWorker.HeapSnapshotNode}
   */
  itemForIndex(index) {
    this._node.nodeIndex = index;
    return this._node;
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItemIndexProvider}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotEdgeIndexProvider = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshot} snapshot
   */
  constructor(snapshot) {
    this._edge = snapshot.createEdge(0);
  }

  /**
   * @override
   * @param {number} index
   * @return {!HeapSnapshotWorker.HeapSnapshotEdge}
   */
  itemForIndex(index) {
    this._edge.edgeIndex = index;
    return this._edge;
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItemIndexProvider}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotRetainerEdgeIndexProvider = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshot} snapshot
   */
  constructor(snapshot) {
    this._retainerEdge = snapshot.createRetainingEdge(0);
  }

  /**
   * @override
   * @param {number} index
   * @return {!HeapSnapshotWorker.HeapSnapshotRetainerEdge}
   */
  itemForIndex(index) {
    this._retainerEdge.setRetainerIndex(index);
    return this._retainerEdge;
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItemIterator}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotEdgeIterator = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
   */
  constructor(node) {
    this._sourceNode = node;
    this.edge = node._snapshot.createEdge(node.edgeIndexesStart());
  }

  /**
   * @override
   * @return {boolean}
   */
  hasNext() {
    return this.edge.edgeIndex < this._sourceNode.edgeIndexesEnd();
  }

  /**
   * @override
   * @return {!HeapSnapshotWorker.HeapSnapshotEdge}
   */
  item() {
    return this.edge;
  }

  /**
   * @override
   */
  next() {
    this.edge.edgeIndex += this.edge._snapshot._edgeFieldsCount;
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItem}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotRetainerEdge = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshot} snapshot
   * @param {number} retainerIndex
   */
  constructor(snapshot, retainerIndex) {
    this._snapshot = snapshot;
    this.setRetainerIndex(retainerIndex);
  }

  /**
   * @return {!HeapSnapshotWorker.HeapSnapshotRetainerEdge}
   */
  clone() {
    return new HeapSnapshotWorker.HeapSnapshotRetainerEdge(this._snapshot, this.retainerIndex());
  }

  /**
   * @return {boolean}
   */
  hasStringName() {
    return this._edge().hasStringName();
  }

  /**
   * @return {string}
   */
  name() {
    return this._edge().name();
  }

  /**
   * @return {!HeapSnapshotWorker.HeapSnapshotNode}
   */
  node() {
    return this._node();
  }

  /**
   * @return {number}
   */
  nodeIndex() {
    return this._retainingNodeIndex;
  }

  /**
   * @return {number}
   */
  retainerIndex() {
    return this._retainerIndex;
  }

  /**
   * @param {number} retainerIndex
   */
  setRetainerIndex(retainerIndex) {
    if (retainerIndex === this._retainerIndex)
      return;
    this._retainerIndex = retainerIndex;
    this._globalEdgeIndex = this._snapshot._retainingEdges[retainerIndex];
    this._retainingNodeIndex = this._snapshot._retainingNodes[retainerIndex];
    this._edgeInstance = null;
    this._nodeInstance = null;
  }

  /**
   * @param {number} edgeIndex
   */
  set edgeIndex(edgeIndex) {
    this.setRetainerIndex(edgeIndex);
  }

  _node() {
    if (!this._nodeInstance)
      this._nodeInstance = this._snapshot.createNode(this._retainingNodeIndex);
    return this._nodeInstance;
  }

  _edge() {
    if (!this._edgeInstance)
      this._edgeInstance = this._snapshot.createEdge(this._globalEdgeIndex);
    return this._edgeInstance;
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    return this._edge().toString();
  }

  /**
   * @override
   * @return {number}
   */
  itemIndex() {
    return this._retainerIndex;
  }

  /**
   * @override
   * @return {!HeapSnapshotModel.Edge}
   */
  serialize() {
    return new HeapSnapshotModel.Edge(this.name(), this.node().serialize(), this.type(), this._globalEdgeIndex);
  }

  /**
   * @return {string}
   */
  type() {
    return this._edge().type();
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItemIterator}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotRetainerEdgeIterator = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotNode} retainedNode
   */
  constructor(retainedNode) {
    var snapshot = retainedNode._snapshot;
    var retainedNodeOrdinal = retainedNode.ordinal();
    var retainerIndex = snapshot._firstRetainerIndex[retainedNodeOrdinal];
    this._retainersEnd = snapshot._firstRetainerIndex[retainedNodeOrdinal + 1];
    this.retainer = snapshot.createRetainingEdge(retainerIndex);
  }

  /**
   * @override
   * @return {boolean}
   */
  hasNext() {
    return this.retainer.retainerIndex() < this._retainersEnd;
  }

  /**
   * @override
   * @return {!HeapSnapshotWorker.HeapSnapshotRetainerEdge}
   */
  item() {
    return this.retainer;
  }

  /**
   * @override
   */
  next() {
    this.retainer.setRetainerIndex(this.retainer.retainerIndex() + 1);
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItem}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotNode = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshot} snapshot
   * @param {number=} nodeIndex
   */
  constructor(snapshot, nodeIndex) {
    this._snapshot = snapshot;
    this.nodeIndex = nodeIndex || 0;
  }

  /**
   * @return {number}
   */
  distance() {
    return this._snapshot._nodeDistances[this.nodeIndex / this._snapshot._nodeFieldCount];
  }

  /**
   * @return {string}
   */
  className() {
    throw new Error('Not implemented');
  }

  /**
   * @return {number}
   */
  classIndex() {
    throw new Error('Not implemented');
  }

  /**
   * @return {number}
   */
  dominatorIndex() {
    var nodeFieldCount = this._snapshot._nodeFieldCount;
    return this._snapshot._dominatorsTree[this.nodeIndex / this._snapshot._nodeFieldCount] * nodeFieldCount;
  }

  /**
   * @return {!HeapSnapshotWorker.HeapSnapshotEdgeIterator}
   */
  edges() {
    return new HeapSnapshotWorker.HeapSnapshotEdgeIterator(this);
  }

  /**
   * @return {number}
   */
  edgesCount() {
    return (this.edgeIndexesEnd() - this.edgeIndexesStart()) / this._snapshot._edgeFieldsCount;
  }

  /**
   * @return {number}
   */
  id() {
    throw new Error('Not implemented');
  }

  /**
   * @return {boolean}
   */
  isRoot() {
    return this.nodeIndex === this._snapshot._rootNodeIndex;
  }

  /**
   * @return {string}
   */
  name() {
    return this._snapshot.strings[this._name()];
  }

  /**
   * @return {number}
   */
  retainedSize() {
    return this._snapshot._retainedSizes[this.ordinal()];
  }

  /**
   * @return {!HeapSnapshotWorker.HeapSnapshotRetainerEdgeIterator}
   */
  retainers() {
    return new HeapSnapshotWorker.HeapSnapshotRetainerEdgeIterator(this);
  }

  /**
   * @return {number}
   */
  retainersCount() {
    var snapshot = this._snapshot;
    var ordinal = this.ordinal();
    return snapshot._firstRetainerIndex[ordinal + 1] - snapshot._firstRetainerIndex[ordinal];
  }

  /**
   * @return {number}
   */
  selfSize() {
    var snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeSelfSizeOffset];
  }

  /**
   * @return {string}
   */
  type() {
    return this._snapshot._nodeTypes[this.rawType()];
  }

  /**
   * @return {number}
   */
  traceNodeId() {
    var snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeTraceNodeIdOffset];
  }

  /**
   * @override
   * @return {number}
   */
  itemIndex() {
    return this.nodeIndex;
  }

  /**
   * @override
   * @return {!HeapSnapshotModel.Node}
   */
  serialize() {
    return new HeapSnapshotModel.Node(
        this.id(), this.name(), this.distance(), this.nodeIndex, this.retainedSize(), this.selfSize(), this.type());
  }

  /**
   * @return {number}
   */
  _name() {
    var snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeNameOffset];
  }

  /**
   * @return {number}
   */
  edgeIndexesStart() {
    return this._snapshot._firstEdgeIndexes[this.ordinal()];
  }

  /**
   * @return {number}
   */
  edgeIndexesEnd() {
    return this._snapshot._firstEdgeIndexes[this.ordinal() + 1];
  }

  /**
   * @return {number}
   */
  ordinal() {
    return this.nodeIndex / this._snapshot._nodeFieldCount;
  }

  /**
   * @return {number}
   */
  _nextNodeIndex() {
    return this.nodeIndex + this._snapshot._nodeFieldCount;
  }

  /**
   * @protected
   * @return {number}
   */
  rawType() {
    var snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeTypeOffset];
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItemIterator}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotNodeIterator = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
   */
  constructor(node) {
    this.node = node;
    this._nodesLength = node._snapshot.nodes.length;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasNext() {
    return this.node.nodeIndex < this._nodesLength;
  }

  /**
   * @override
   * @return {!HeapSnapshotWorker.HeapSnapshotNode}
   */
  item() {
    return this.node;
  }

  /**
   * @override
   */
  next() {
    this.node.nodeIndex = this.node._nextNodeIndex();
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItemIterator}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotIndexRangeIterator = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotItemIndexProvider} itemProvider
   * @param {!Array.<number>|!Uint32Array} indexes
   */
  constructor(itemProvider, indexes) {
    this._itemProvider = itemProvider;
    this._indexes = indexes;
    this._position = 0;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasNext() {
    return this._position < this._indexes.length;
  }

  /**
   * @override
   * @return {!HeapSnapshotWorker.HeapSnapshotItem}
   */
  item() {
    var index = this._indexes[this._position];
    return this._itemProvider.itemForIndex(index);
  }

  /**
   * @override
   */
  next() {
    ++this._position;
  }
};

/**
 * @implements {HeapSnapshotWorker.HeapSnapshotItemIterator}
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotFilteredIterator = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotItemIterator} iterator
   * @param {function(!HeapSnapshotWorker.HeapSnapshotItem):boolean=} filter
   */
  constructor(iterator, filter) {
    this._iterator = iterator;
    this._filter = filter;
    this._skipFilteredItems();
  }

  /**
   * @override
   * @return {boolean}
   */
  hasNext() {
    return this._iterator.hasNext();
  }

  /**
   * @override
   * @return {!HeapSnapshotWorker.HeapSnapshotItem}
   */
  item() {
    return this._iterator.item();
  }

  /**
   * @override
   */
  next() {
    this._iterator.next();
    this._skipFilteredItems();
  }

  _skipFilteredItems() {
    while (this._iterator.hasNext() && !this._filter(this._iterator.item()))
      this._iterator.next();
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotProgress = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotWorkerDispatcher=} dispatcher
   */
  constructor(dispatcher) {
    this._dispatcher = dispatcher;
  }

  /**
   * @param {string} status
   */
  updateStatus(status) {
    this._sendUpdateEvent(Common.UIString(status));
  }

  /**
   * @param {string} title
   * @param {number} value
   * @param {number} total
   */
  updateProgress(title, value, total) {
    var percentValue = ((total ? (value / total) : 0) * 100).toFixed(0);
    this._sendUpdateEvent(Common.UIString(title, percentValue));
  }

  /**
   * @param {string} error
   */
  reportProblem(error) {
    // May be undefined in tests.
    if (this._dispatcher)
      this._dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot, error);
  }

  /**
   * @param {string} text
   */
  _sendUpdateEvent(text) {
    // May be undefined in tests.
    if (this._dispatcher)
      this._dispatcher.sendEvent(HeapSnapshotModel.HeapSnapshotProgressEvent.Update, text);
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotProblemReport = class {
  /**
   * @param {string} title
   */
  constructor(title) {
    this._errors = [title];
  }

  /**
   * @param {string} error
   */
  addError(error) {
    if (this._errors.length > 100)
      return;
    this._errors.push(error);
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    return this._errors.join('\n  ');
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshot = class {
  /**
   * @param {!Object} profile
   * @param {!HeapSnapshotWorker.HeapSnapshotProgress} progress
   */
  constructor(profile, progress) {
    /** @type {!Uint32Array} */
    this.nodes = profile.nodes;
    /** @type {!Uint32Array} */
    this.containmentEdges = profile.edges;
    /** @type {!HeapSnapshotMetainfo} */
    this._metaNode = profile.snapshot.meta;
    /** @type {!Array.<number>} */
    this._rawSamples = profile.samples;
    /** @type {?HeapSnapshotModel.Samples} */
    this._samples = null;
    /** @type {!Array.<string>} */
    this.strings = profile.strings;
    this._progress = progress;

    this._noDistance = -5;
    this._rootNodeIndex = 0;
    if (profile.snapshot.root_index)
      this._rootNodeIndex = profile.snapshot.root_index;

    this._snapshotDiffs = {};
    this._aggregatesForDiff = null;
    this._aggregates = {};
    this._aggregatesSortedFlags = {};
    this._profile = profile;
  }

  /**
   * @protected
   */
  initialize() {
    var meta = this._metaNode;

    this._nodeTypeOffset = meta.node_fields.indexOf('type');
    this._nodeNameOffset = meta.node_fields.indexOf('name');
    this._nodeIdOffset = meta.node_fields.indexOf('id');
    this._nodeSelfSizeOffset = meta.node_fields.indexOf('self_size');
    this._nodeEdgeCountOffset = meta.node_fields.indexOf('edge_count');
    this._nodeTraceNodeIdOffset = meta.node_fields.indexOf('trace_node_id');
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

    this._progress.updateStatus('Building edge indexes\u2026');
    this._buildEdgeIndexes();
    this._progress.updateStatus('Building retainers\u2026');
    this._buildRetainers();
    this._progress.updateStatus('Calculating node flags\u2026');
    this.calculateFlags();
    this._progress.updateStatus('Calculating distances\u2026');
    this.calculateDistances();
    this._progress.updateStatus('Building postorder index\u2026');
    var result = this._buildPostOrderIndex();
    // Actually it is array that maps node ordinal number to dominator node ordinal number.
    this._progress.updateStatus('Building dominator tree\u2026');
    this._dominatorsTree =
        this._buildDominatorTree(result.postOrderIndex2NodeOrdinal, result.nodeOrdinal2PostOrderIndex);
    this._progress.updateStatus('Calculating retained sizes\u2026');
    this._calculateRetainedSizes(result.postOrderIndex2NodeOrdinal);
    this._progress.updateStatus('Building dominated nodes\u2026');
    this._buildDominatedNodes();
    this._progress.updateStatus('Calculating statistics\u2026');
    this.calculateStatistics();
    this._progress.updateStatus('Calculating samples\u2026');
    this._buildSamples();
    this._progress.updateStatus('Finished processing.');

    if (this._profile.snapshot.trace_function_count) {
      this._progress.updateStatus('Building allocation statistics\u2026');
      var nodes = this.nodes;
      var nodesLength = nodes.length;
      var nodeFieldCount = this._nodeFieldCount;
      var node = this.rootNode();
      var liveObjects = {};
      for (var nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
        node.nodeIndex = nodeIndex;
        var traceNodeId = node.traceNodeId();
        var stats = liveObjects[traceNodeId];
        if (!stats)
          liveObjects[traceNodeId] = stats = {count: 0, size: 0, ids: []};
        stats.count++;
        stats.size += node.selfSize();
        stats.ids.push(node.id());
      }
      this._allocationProfile = new HeapSnapshotWorker.AllocationProfile(this._profile, liveObjects);
      this._progress.updateStatus('Done');
    }
  }

  _buildEdgeIndexes() {
    var nodes = this.nodes;
    var nodeCount = this.nodeCount;
    var firstEdgeIndexes = this._firstEdgeIndexes;
    var nodeFieldCount = this._nodeFieldCount;
    var edgeFieldsCount = this._edgeFieldsCount;
    var nodeEdgeCountOffset = this._nodeEdgeCountOffset;
    firstEdgeIndexes[nodeCount] = this.containmentEdges.length;
    for (var nodeOrdinal = 0, edgeIndex = 0; nodeOrdinal < nodeCount; ++nodeOrdinal) {
      firstEdgeIndexes[nodeOrdinal] = edgeIndex;
      edgeIndex += nodes[nodeOrdinal * nodeFieldCount + nodeEdgeCountOffset] * edgeFieldsCount;
    }
  }

  _buildRetainers() {
    var retainingNodes = this._retainingNodes;
    var retainingEdges = this._retainingEdges;
    // Index of the first retainer in the _retainingNodes and _retainingEdges
    // arrays. Addressed by retained node index.
    var firstRetainerIndex = this._firstRetainerIndex;

    var containmentEdges = this.containmentEdges;
    var edgeFieldsCount = this._edgeFieldsCount;
    var nodeFieldCount = this._nodeFieldCount;
    var edgeToNodeOffset = this._edgeToNodeOffset;
    var firstEdgeIndexes = this._firstEdgeIndexes;
    var nodeCount = this.nodeCount;

    for (var toNodeFieldIndex = edgeToNodeOffset, l = containmentEdges.length; toNodeFieldIndex < l;
         toNodeFieldIndex += edgeFieldsCount) {
      var toNodeIndex = containmentEdges[toNodeFieldIndex];
      if (toNodeIndex % nodeFieldCount)
        throw new Error('Invalid toNodeIndex ' + toNodeIndex);
      ++firstRetainerIndex[toNodeIndex / nodeFieldCount];
    }
    for (var i = 0, firstUnusedRetainerSlot = 0; i < nodeCount; i++) {
      var retainersCount = firstRetainerIndex[i];
      firstRetainerIndex[i] = firstUnusedRetainerSlot;
      retainingNodes[firstUnusedRetainerSlot] = retainersCount;
      firstUnusedRetainerSlot += retainersCount;
    }
    firstRetainerIndex[nodeCount] = retainingNodes.length;

    var nextNodeFirstEdgeIndex = firstEdgeIndexes[0];
    for (var srcNodeOrdinal = 0; srcNodeOrdinal < nodeCount; ++srcNodeOrdinal) {
      var firstEdgeIndex = nextNodeFirstEdgeIndex;
      nextNodeFirstEdgeIndex = firstEdgeIndexes[srcNodeOrdinal + 1];
      var srcNodeIndex = srcNodeOrdinal * nodeFieldCount;
      for (var edgeIndex = firstEdgeIndex; edgeIndex < nextNodeFirstEdgeIndex; edgeIndex += edgeFieldsCount) {
        var toNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
        if (toNodeIndex % nodeFieldCount)
          throw new Error('Invalid toNodeIndex ' + toNodeIndex);
        var firstRetainerSlotIndex = firstRetainerIndex[toNodeIndex / nodeFieldCount];
        var nextUnusedRetainerSlotIndex = firstRetainerSlotIndex + (--retainingNodes[firstRetainerSlotIndex]);
        retainingNodes[nextUnusedRetainerSlotIndex] = srcNodeIndex;
        retainingEdges[nextUnusedRetainerSlotIndex] = edgeIndex;
      }
    }
  }

  /**
   * @param {number=} nodeIndex
   */
  createNode(nodeIndex) {
    throw new Error('Not implemented');
  }

  /**
   * @param {number} edgeIndex
   * @return {!HeapSnapshotWorker.JSHeapSnapshotEdge}
   */
  createEdge(edgeIndex) {
    throw new Error('Not implemented');
  }

  /**
   * @param {number} retainerIndex
   * @return {!HeapSnapshotWorker.JSHeapSnapshotRetainerEdge}
   */
  createRetainingEdge(retainerIndex) {
    throw new Error('Not implemented');
  }

  _allNodes() {
    return new HeapSnapshotWorker.HeapSnapshotNodeIterator(this.rootNode());
  }

  /**
   * @return {!HeapSnapshotWorker.HeapSnapshotNode}
   */
  rootNode() {
    return this.createNode(this._rootNodeIndex);
  }

  get rootNodeIndex() {
    return this._rootNodeIndex;
  }

  get totalSize() {
    return this.rootNode().retainedSize();
  }

  _getDominatedIndex(nodeIndex) {
    if (nodeIndex % this._nodeFieldCount)
      throw new Error('Invalid nodeIndex: ' + nodeIndex);
    return this._firstDominatedNodeIndex[nodeIndex / this._nodeFieldCount];
  }

  /**
   * @param {!HeapSnapshotModel.NodeFilter} nodeFilter
   * @return {undefined|function(!HeapSnapshotWorker.HeapSnapshotNode):boolean}
   */
  _createFilter(nodeFilter) {
    var minNodeId = nodeFilter.minNodeId;
    var maxNodeId = nodeFilter.maxNodeId;
    var allocationNodeId = nodeFilter.allocationNodeId;
    var filter;
    if (typeof allocationNodeId === 'number') {
      filter = this._createAllocationStackFilter(allocationNodeId);
      filter.key = 'AllocationNodeId: ' + allocationNodeId;
    } else if (typeof minNodeId === 'number' && typeof maxNodeId === 'number') {
      filter = this._createNodeIdFilter(minNodeId, maxNodeId);
      filter.key = 'NodeIdRange: ' + minNodeId + '..' + maxNodeId;
    }
    return filter;
  }

  /**
   * @param {!HeapSnapshotModel.SearchConfig} searchConfig
   * @param {!HeapSnapshotModel.NodeFilter} nodeFilter
   * @return {!Array.<number>}
   */
  search(searchConfig, nodeFilter) {
    var query = searchConfig.query;

    function filterString(matchedStringIndexes, string, index) {
      if (string.indexOf(query) !== -1)
        matchedStringIndexes.add(index);
      return matchedStringIndexes;
    }

    var regexp = searchConfig.isRegex ? new RegExp(query) : createPlainTextSearchRegex(query, 'i');
    function filterRegexp(matchedStringIndexes, string, index) {
      if (regexp.test(string))
        matchedStringIndexes.add(index);
      return matchedStringIndexes;
    }

    var stringFilter = (searchConfig.isRegex || !searchConfig.caseSensitive) ? filterRegexp : filterString;
    var stringIndexes = this.strings.reduce(stringFilter, new Set());

    if (!stringIndexes.size)
      return [];

    var filter = this._createFilter(nodeFilter);
    var nodeIds = [];
    var nodesLength = this.nodes.length;
    var nodes = this.nodes;
    var nodeNameOffset = this._nodeNameOffset;
    var nodeIdOffset = this._nodeIdOffset;
    var nodeFieldCount = this._nodeFieldCount;
    var node = this.rootNode();

    for (var nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      node.nodeIndex = nodeIndex;
      if (filter && !filter(node))
        continue;
      if (stringIndexes.has(nodes[nodeIndex + nodeNameOffset]))
        nodeIds.push(nodes[nodeIndex + nodeIdOffset]);
    }
    return nodeIds;
  }

  /**
   * @param {!HeapSnapshotModel.NodeFilter} nodeFilter
   * @return {!Object.<string, !HeapSnapshotModel.Aggregate>}
   */
  aggregatesWithFilter(nodeFilter) {
    var filter = this._createFilter(nodeFilter);
    var key = filter ? filter.key : 'allObjects';
    return this.aggregates(false, key, filter);
  }

  /**
   * @param {number} minNodeId
   * @param {number} maxNodeId
   * @return {function(!HeapSnapshotWorker.HeapSnapshotNode):boolean}
   */
  _createNodeIdFilter(minNodeId, maxNodeId) {
    /**
     * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
     * @return {boolean}
     */
    function nodeIdFilter(node) {
      var id = node.id();
      return id > minNodeId && id <= maxNodeId;
    }
    return nodeIdFilter;
  }

  /**
   * @param {number} bottomUpAllocationNodeId
   * @return {function(!HeapSnapshotWorker.HeapSnapshotNode):boolean|undefined}
   */
  _createAllocationStackFilter(bottomUpAllocationNodeId) {
    var traceIds = this._allocationProfile.traceIds(bottomUpAllocationNodeId);
    if (!traceIds.length)
      return undefined;
    var set = {};
    for (var i = 0; i < traceIds.length; i++)
      set[traceIds[i]] = true;
    /**
     * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
     * @return {boolean}
     */
    function traceIdFilter(node) {
      return !!set[node.traceNodeId()];
    }
    return traceIdFilter;
  }

  /**
   * @param {boolean} sortedIndexes
   * @param {string=} key
   * @param {function(!HeapSnapshotWorker.HeapSnapshotNode):boolean=} filter
   * @return {!Object.<string, !HeapSnapshotModel.Aggregate>}
   */
  aggregates(sortedIndexes, key, filter) {
    var aggregatesByClassName = key && this._aggregates[key];
    if (!aggregatesByClassName) {
      var aggregates = this._buildAggregates(filter);
      this._calculateClassesRetainedSize(aggregates.aggregatesByClassIndex, filter);
      aggregatesByClassName = aggregates.aggregatesByClassName;
      if (key)
        this._aggregates[key] = aggregatesByClassName;
    }

    if (sortedIndexes && (!key || !this._aggregatesSortedFlags[key])) {
      this._sortAggregateIndexes(aggregatesByClassName);
      if (key)
        this._aggregatesSortedFlags[key] = sortedIndexes;
    }
    return aggregatesByClassName;
  }

  /**
   * @return {!Array.<!HeapSnapshotModel.SerializedAllocationNode>}
   */
  allocationTracesTops() {
    return this._allocationProfile.serializeTraceTops();
  }

  /**
   * @param {number} nodeId
   * @return {!HeapSnapshotModel.AllocationNodeCallers}
   */
  allocationNodeCallers(nodeId) {
    return this._allocationProfile.serializeCallers(nodeId);
  }

  /**
   * @param {number} nodeIndex
   * @return {?Array.<!HeapSnapshotModel.AllocationStackFrame>}
   */
  allocationStack(nodeIndex) {
    var node = this.createNode(nodeIndex);
    var allocationNodeId = node.traceNodeId();
    if (!allocationNodeId)
      return null;
    return this._allocationProfile.serializeAllocationStack(allocationNodeId);
  }

  /**
   * @return {!Object.<string, !HeapSnapshotModel.AggregateForDiff>}
   */
  aggregatesForDiff() {
    if (this._aggregatesForDiff)
      return this._aggregatesForDiff;

    var aggregatesByClassName = this.aggregates(true, 'allObjects');
    this._aggregatesForDiff = {};

    var node = this.createNode();
    for (var className in aggregatesByClassName) {
      var aggregate = aggregatesByClassName[className];
      var indexes = aggregate.idxs;
      var ids = new Array(indexes.length);
      var selfSizes = new Array(indexes.length);
      for (var i = 0; i < indexes.length; i++) {
        node.nodeIndex = indexes[i];
        ids[i] = node.id();
        selfSizes[i] = node.selfSize();
      }

      this._aggregatesForDiff[className] = {indexes: indexes, ids: ids, selfSizes: selfSizes};
    }
    return this._aggregatesForDiff;
  }

  /**
   * @protected
   * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
   * @return {boolean}
   */
  isUserRoot(node) {
    return true;
  }

  /**
   * @param {function(!HeapSnapshotWorker.HeapSnapshotNode)} action
   * @param {boolean=} userRootsOnly
   */
  forEachRoot(action, userRootsOnly) {
    for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
      var node = iter.edge.node();
      if (!userRootsOnly || this.isUserRoot(node))
        action(node);
    }
  }

  /**
   * @param {function(!HeapSnapshotWorker.HeapSnapshotNode,!HeapSnapshotWorker.HeapSnapshotEdge):boolean=} filter
   */
  calculateDistances(filter) {
    var nodeCount = this.nodeCount;
    var distances = this._nodeDistances;
    var noDistance = this._noDistance;
    for (var i = 0; i < nodeCount; ++i)
      distances[i] = noDistance;

    var nodesToVisit = new Uint32Array(this.nodeCount);
    var nodesToVisitLength = 0;

    /**
     * @param {number} distance
     * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
     */
    function enqueueNode(distance, node) {
      var ordinal = node.ordinal();
      if (distances[ordinal] !== noDistance)
        return;
      distances[ordinal] = distance;
      nodesToVisit[nodesToVisitLength++] = node.nodeIndex;
    }

    this.forEachRoot(enqueueNode.bind(null, 1), true);
    this._bfs(nodesToVisit, nodesToVisitLength, distances, filter);

    // bfs for the rest of objects
    nodesToVisitLength = 0;
    this.forEachRoot(enqueueNode.bind(null, HeapSnapshotModel.baseSystemDistance), false);
    this._bfs(nodesToVisit, nodesToVisitLength, distances, filter);
  }

  /**
   * @param {!Uint32Array} nodesToVisit
   * @param {number} nodesToVisitLength
   * @param {!Int32Array} distances
   * @param {function(!HeapSnapshotWorker.HeapSnapshotNode,!HeapSnapshotWorker.HeapSnapshotEdge):boolean=} filter
   */
  _bfs(nodesToVisit, nodesToVisitLength, distances, filter) {
    // Preload fields into local variables for better performance.
    var edgeFieldsCount = this._edgeFieldsCount;
    var nodeFieldCount = this._nodeFieldCount;
    var containmentEdges = this.containmentEdges;
    var firstEdgeIndexes = this._firstEdgeIndexes;
    var edgeToNodeOffset = this._edgeToNodeOffset;
    var edgeTypeOffset = this._edgeTypeOffset;
    var nodeCount = this.nodeCount;
    var edgeWeakType = this._edgeWeakType;
    var noDistance = this._noDistance;

    var index = 0;
    var edge = this.createEdge(0);
    var node = this.createNode(0);
    while (index < nodesToVisitLength) {
      var nodeIndex = nodesToVisit[index++];  // shift generates too much garbage.
      var nodeOrdinal = nodeIndex / nodeFieldCount;
      var distance = distances[nodeOrdinal] + 1;
      var firstEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      var edgesEnd = firstEdgeIndexes[nodeOrdinal + 1];
      node.nodeIndex = nodeIndex;
      for (var edgeIndex = firstEdgeIndex; edgeIndex < edgesEnd; edgeIndex += edgeFieldsCount) {
        var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
        if (edgeType === edgeWeakType)
          continue;
        var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
        var childNodeOrdinal = childNodeIndex / nodeFieldCount;
        if (distances[childNodeOrdinal] !== noDistance)
          continue;
        edge.edgeIndex = edgeIndex;
        if (filter && !filter(node, edge))
          continue;
        distances[childNodeOrdinal] = distance;
        nodesToVisit[nodesToVisitLength++] = childNodeIndex;
      }
    }
    if (nodesToVisitLength > nodeCount) {
      throw new Error(
          'BFS failed. Nodes to visit (' + nodesToVisitLength + ') is more than nodes count (' + nodeCount + ')');
    }
  }

  _buildAggregates(filter) {
    var aggregates = {};
    var aggregatesByClassName = {};
    var classIndexes = [];
    var nodes = this.nodes;
    var mapAndFlag = this.userObjectsMapAndFlag();
    var flags = mapAndFlag ? mapAndFlag.map : null;
    var flag = mapAndFlag ? mapAndFlag.flag : 0;
    var nodesLength = nodes.length;
    var nodeNativeType = this._nodeNativeType;
    var nodeFieldCount = this._nodeFieldCount;
    var selfSizeOffset = this._nodeSelfSizeOffset;
    var nodeTypeOffset = this._nodeTypeOffset;
    var node = this.rootNode();
    var nodeDistances = this._nodeDistances;

    for (var nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      var nodeOrdinal = nodeIndex / nodeFieldCount;
      if (flags && !(flags[nodeOrdinal] & flag))
        continue;
      node.nodeIndex = nodeIndex;
      if (filter && !filter(node))
        continue;
      var selfSize = nodes[nodeIndex + selfSizeOffset];
      if (!selfSize && nodes[nodeIndex + nodeTypeOffset] !== nodeNativeType)
        continue;
      var classIndex = node.classIndex();
      if (!(classIndex in aggregates)) {
        var nodeType = node.type();
        var nameMatters = nodeType === 'object' || nodeType === 'native';
        var value = {
          count: 1,
          distance: nodeDistances[nodeOrdinal],
          self: selfSize,
          maxRet: 0,
          type: nodeType,
          name: nameMatters ? node.name() : null,
          idxs: [nodeIndex]
        };
        aggregates[classIndex] = value;
        classIndexes.push(classIndex);
        aggregatesByClassName[node.className()] = value;
      } else {
        var clss = aggregates[classIndex];
        clss.distance = Math.min(clss.distance, nodeDistances[nodeOrdinal]);
        ++clss.count;
        clss.self += selfSize;
        clss.idxs.push(nodeIndex);
      }
    }

    // Shave off provisionally allocated space.
    for (var i = 0, l = classIndexes.length; i < l; ++i) {
      var classIndex = classIndexes[i];
      aggregates[classIndex].idxs = aggregates[classIndex].idxs.slice();
    }
    return {aggregatesByClassName: aggregatesByClassName, aggregatesByClassIndex: aggregates};
  }

  _calculateClassesRetainedSize(aggregates, filter) {
    var rootNodeIndex = this._rootNodeIndex;
    var node = this.createNode(rootNodeIndex);
    var list = [rootNodeIndex];
    var sizes = [-1];
    var classes = [];
    var seenClassNameIndexes = {};
    var nodeFieldCount = this._nodeFieldCount;
    var nodeTypeOffset = this._nodeTypeOffset;
    var nodeNativeType = this._nodeNativeType;
    var dominatedNodes = this._dominatedNodes;
    var nodes = this.nodes;
    var mapAndFlag = this.userObjectsMapAndFlag();
    var flags = mapAndFlag ? mapAndFlag.map : null;
    var flag = mapAndFlag ? mapAndFlag.flag : 0;
    var firstDominatedNodeIndex = this._firstDominatedNodeIndex;

    while (list.length) {
      var nodeIndex = list.pop();
      node.nodeIndex = nodeIndex;
      var classIndex = node.classIndex();
      var seen = !!seenClassNameIndexes[classIndex];
      var nodeOrdinal = nodeIndex / nodeFieldCount;
      var dominatedIndexFrom = firstDominatedNodeIndex[nodeOrdinal];
      var dominatedIndexTo = firstDominatedNodeIndex[nodeOrdinal + 1];

      if (!seen && (!flags || (flags[nodeOrdinal] & flag)) && (!filter || filter(node)) &&
          (node.selfSize() || nodes[nodeIndex + nodeTypeOffset] === nodeNativeType)) {
        aggregates[classIndex].maxRet += node.retainedSize();
        if (dominatedIndexFrom !== dominatedIndexTo) {
          seenClassNameIndexes[classIndex] = true;
          sizes.push(list.length);
          classes.push(classIndex);
        }
      }
      for (var i = dominatedIndexFrom; i < dominatedIndexTo; i++)
        list.push(dominatedNodes[i]);

      var l = list.length;
      while (sizes[sizes.length - 1] === l) {
        sizes.pop();
        classIndex = classes.pop();
        seenClassNameIndexes[classIndex] = false;
      }
    }
  }

  _sortAggregateIndexes(aggregates) {
    var nodeA = this.createNode();
    var nodeB = this.createNode();
    for (var clss in aggregates) {
      aggregates[clss].idxs.sort(function(idxA, idxB) {
        nodeA.nodeIndex = idxA;
        nodeB.nodeIndex = idxB;
        return nodeA.id() < nodeB.id() ? -1 : 1;
      });
    }
  }

  /**
   * The function checks is the edge should be considered during building
   * postorder iterator and dominator tree.
   *
   * @param {number} nodeIndex
   * @param {number} edgeType
   * @return {boolean}
   */
  _isEssentialEdge(nodeIndex, edgeType) {
    // Shortcuts at the root node have special meaning of marking user global objects.
    return edgeType !== this._edgeWeakType &&
        (edgeType !== this._edgeShortcutType || nodeIndex === this._rootNodeIndex);
  }

  _buildPostOrderIndex() {
    var nodeFieldCount = this._nodeFieldCount;
    var nodeCount = this.nodeCount;
    var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;

    var edgeFieldsCount = this._edgeFieldsCount;
    var edgeTypeOffset = this._edgeTypeOffset;
    var edgeToNodeOffset = this._edgeToNodeOffset;
    var firstEdgeIndexes = this._firstEdgeIndexes;
    var containmentEdges = this.containmentEdges;

    var mapAndFlag = this.userObjectsMapAndFlag();
    var flags = mapAndFlag ? mapAndFlag.map : null;
    var flag = mapAndFlag ? mapAndFlag.flag : 0;

    var stackNodes = new Uint32Array(nodeCount);
    var stackCurrentEdge = new Uint32Array(nodeCount);
    var postOrderIndex2NodeOrdinal = new Uint32Array(nodeCount);
    var nodeOrdinal2PostOrderIndex = new Uint32Array(nodeCount);
    var visited = new Uint8Array(nodeCount);
    var postOrderIndex = 0;

    var stackTop = 0;
    stackNodes[0] = rootNodeOrdinal;
    stackCurrentEdge[0] = firstEdgeIndexes[rootNodeOrdinal];
    visited[rootNodeOrdinal] = 1;

    var iteration = 0;
    while (true) {
      ++iteration;
      while (stackTop >= 0) {
        var nodeOrdinal = stackNodes[stackTop];
        var edgeIndex = stackCurrentEdge[stackTop];
        var edgesEnd = firstEdgeIndexes[nodeOrdinal + 1];

        if (edgeIndex < edgesEnd) {
          stackCurrentEdge[stackTop] += edgeFieldsCount;
          var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
          if (!this._isEssentialEdge(nodeOrdinal * nodeFieldCount, edgeType))
            continue;
          var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
          var childNodeOrdinal = childNodeIndex / nodeFieldCount;
          if (visited[childNodeOrdinal])
            continue;
          var nodeFlag = !flags || (flags[nodeOrdinal] & flag);
          var childNodeFlag = !flags || (flags[childNodeOrdinal] & flag);
          // We are skipping the edges from non-page-owned nodes to page-owned nodes.
          // Otherwise the dominators for the objects that also were retained by debugger would be affected.
          if (nodeOrdinal !== rootNodeOrdinal && childNodeFlag && !nodeFlag)
            continue;
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

      if (postOrderIndex === nodeCount || iteration > 1)
        break;
      var errors = new HeapSnapshotWorker.HeapSnapshotProblemReport(
          `Heap snapshot: ${nodeCount -
          postOrderIndex} nodes are unreachable from the root. Following nodes have only weak retainers:`);
      var dumpNode = this.rootNode();
      // Remove root from the result (last node in the array) and put it at the bottom of the stack so that it is
      // visited after all orphan nodes and their subgraphs.
      --postOrderIndex;
      stackTop = 0;
      stackNodes[0] = rootNodeOrdinal;
      stackCurrentEdge[0] = firstEdgeIndexes[rootNodeOrdinal + 1];  // no need to reiterate its edges
      for (var i = 0; i < nodeCount; ++i) {
        if (visited[i] || !this._hasOnlyWeakRetainers(i))
          continue;

        // Add all nodes that have only weak retainers to traverse their subgraphs.
        stackNodes[++stackTop] = i;
        stackCurrentEdge[stackTop] = firstEdgeIndexes[i];
        visited[i] = 1;

        dumpNode.nodeIndex = i * nodeFieldCount;
        var retainers = [];
        for (var it = dumpNode.retainers(); it.hasNext(); it.next())
          retainers.push(`${it.item().node().name()}@${it.item().node().id()}.${it.item().name()}`);
        errors.addError(`${dumpNode.name()} @${dumpNode.id()}  weak retainers: ${retainers.join(', ')}`);
      }
      console.warn(errors.toString());
    }

    // If we already processed all orphan nodes that have only weak retainers and still have some orphans...
    if (postOrderIndex !== nodeCount) {
      var errors = new HeapSnapshotWorker.HeapSnapshotProblemReport(
          'Still found ' + (nodeCount - postOrderIndex) + ' unreachable nodes in heap snapshot:');
      var dumpNode = this.rootNode();
      // Remove root from the result (last node in the array) and put it at the bottom of the stack so that it is
      // visited after all orphan nodes and their subgraphs.
      --postOrderIndex;
      for (var i = 0; i < nodeCount; ++i) {
        if (visited[i])
          continue;
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
      nodeOrdinal2PostOrderIndex: nodeOrdinal2PostOrderIndex
    };
  }

  /**
   * @param {number} nodeOrdinal
   * @return {boolean}
   */
  _hasOnlyWeakRetainers(nodeOrdinal) {
    var edgeTypeOffset = this._edgeTypeOffset;
    var edgeWeakType = this._edgeWeakType;
    var edgeShortcutType = this._edgeShortcutType;
    var containmentEdges = this.containmentEdges;
    var retainingEdges = this._retainingEdges;
    var beginRetainerIndex = this._firstRetainerIndex[nodeOrdinal];
    var endRetainerIndex = this._firstRetainerIndex[nodeOrdinal + 1];
    for (var retainerIndex = beginRetainerIndex; retainerIndex < endRetainerIndex; ++retainerIndex) {
      var retainerEdgeIndex = retainingEdges[retainerIndex];
      var retainerEdgeType = containmentEdges[retainerEdgeIndex + edgeTypeOffset];
      if (retainerEdgeType !== edgeWeakType && retainerEdgeType !== edgeShortcutType)
        return false;
    }
    return true;
  }

  // The algorithm is based on the article:
  // K. Cooper, T. Harvey and K. Kennedy "A Simple, Fast Dominance Algorithm"
  // Softw. Pract. Exper. 4 (2001), pp. 1-10.
  /**
   * @param {!Array.<number>} postOrderIndex2NodeOrdinal
   * @param {!Array.<number>} nodeOrdinal2PostOrderIndex
   */
  _buildDominatorTree(postOrderIndex2NodeOrdinal, nodeOrdinal2PostOrderIndex) {
    var nodeFieldCount = this._nodeFieldCount;
    var firstRetainerIndex = this._firstRetainerIndex;
    var retainingNodes = this._retainingNodes;
    var retainingEdges = this._retainingEdges;
    var edgeFieldsCount = this._edgeFieldsCount;
    var edgeTypeOffset = this._edgeTypeOffset;
    var edgeToNodeOffset = this._edgeToNodeOffset;
    var firstEdgeIndexes = this._firstEdgeIndexes;
    var containmentEdges = this.containmentEdges;
    var rootNodeIndex = this._rootNodeIndex;

    var mapAndFlag = this.userObjectsMapAndFlag();
    var flags = mapAndFlag ? mapAndFlag.map : null;
    var flag = mapAndFlag ? mapAndFlag.flag : 0;

    var nodesCount = postOrderIndex2NodeOrdinal.length;
    var rootPostOrderedIndex = nodesCount - 1;
    var noEntry = nodesCount;
    var dominators = new Uint32Array(nodesCount);
    for (var i = 0; i < rootPostOrderedIndex; ++i)
      dominators[i] = noEntry;
    dominators[rootPostOrderedIndex] = rootPostOrderedIndex;

    // The affected array is used to mark entries which dominators
    // have to be racalculated because of changes in their retainers.
    var affected = new Uint8Array(nodesCount);
    var nodeOrdinal;

    {  // Mark the root direct children as affected.
      nodeOrdinal = this._rootNodeIndex / nodeFieldCount;
      var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      for (var edgeIndex = firstEdgeIndexes[nodeOrdinal]; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
        var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
        if (!this._isEssentialEdge(this._rootNodeIndex, edgeType))
          continue;
        var childNodeOrdinal = containmentEdges[edgeIndex + edgeToNodeOffset] / nodeFieldCount;
        affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]] = 1;
      }
    }

    var changed = true;
    while (changed) {
      changed = false;
      for (var postOrderIndex = rootPostOrderedIndex - 1; postOrderIndex >= 0; --postOrderIndex) {
        if (affected[postOrderIndex] === 0)
          continue;
        affected[postOrderIndex] = 0;
        // If dominator of the entry has already been set to root,
        // then it can't propagate any further.
        if (dominators[postOrderIndex] === rootPostOrderedIndex)
          continue;
        nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
        var nodeFlag = !flags || (flags[nodeOrdinal] & flag);
        var newDominatorIndex = noEntry;
        var beginRetainerIndex = firstRetainerIndex[nodeOrdinal];
        var endRetainerIndex = firstRetainerIndex[nodeOrdinal + 1];
        var orphanNode = true;
        for (var retainerIndex = beginRetainerIndex; retainerIndex < endRetainerIndex; ++retainerIndex) {
          var retainerEdgeIndex = retainingEdges[retainerIndex];
          var retainerEdgeType = containmentEdges[retainerEdgeIndex + edgeTypeOffset];
          var retainerNodeIndex = retainingNodes[retainerIndex];
          if (!this._isEssentialEdge(retainerNodeIndex, retainerEdgeType))
            continue;
          orphanNode = false;
          var retainerNodeOrdinal = retainerNodeIndex / nodeFieldCount;
          var retainerNodeFlag = !flags || (flags[retainerNodeOrdinal] & flag);
          // We are skipping the edges from non-page-owned nodes to page-owned nodes.
          // Otherwise the dominators for the objects that also were retained by debugger would be affected.
          if (retainerNodeIndex !== rootNodeIndex && nodeFlag && !retainerNodeFlag)
            continue;
          var retanerPostOrderIndex = nodeOrdinal2PostOrderIndex[retainerNodeOrdinal];
          if (dominators[retanerPostOrderIndex] !== noEntry) {
            if (newDominatorIndex === noEntry) {
              newDominatorIndex = retanerPostOrderIndex;
            } else {
              while (retanerPostOrderIndex !== newDominatorIndex) {
                while (retanerPostOrderIndex < newDominatorIndex)
                  retanerPostOrderIndex = dominators[retanerPostOrderIndex];
                while (newDominatorIndex < retanerPostOrderIndex)
                  newDominatorIndex = dominators[newDominatorIndex];
              }
            }
            // If idom has already reached the root, it doesn't make sense
            // to check other retainers.
            if (newDominatorIndex === rootPostOrderedIndex)
              break;
          }
        }
        // Make root dominator of orphans.
        if (orphanNode)
          newDominatorIndex = rootPostOrderedIndex;
        if (newDominatorIndex !== noEntry && dominators[postOrderIndex] !== newDominatorIndex) {
          dominators[postOrderIndex] = newDominatorIndex;
          changed = true;
          nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
          var beginEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal] + edgeToNodeOffset;
          var endEdgeToNodeFieldIndex = firstEdgeIndexes[nodeOrdinal + 1];
          for (var toNodeFieldIndex = beginEdgeToNodeFieldIndex; toNodeFieldIndex < endEdgeToNodeFieldIndex;
               toNodeFieldIndex += edgeFieldsCount) {
            var childNodeOrdinal = containmentEdges[toNodeFieldIndex] / nodeFieldCount;
            affected[nodeOrdinal2PostOrderIndex[childNodeOrdinal]] = 1;
          }
        }
      }
    }

    var dominatorsTree = new Uint32Array(nodesCount);
    for (var postOrderIndex = 0, l = dominators.length; postOrderIndex < l; ++postOrderIndex) {
      nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
      dominatorsTree[nodeOrdinal] = postOrderIndex2NodeOrdinal[dominators[postOrderIndex]];
    }
    return dominatorsTree;
  }

  _calculateRetainedSizes(postOrderIndex2NodeOrdinal) {
    var nodeCount = this.nodeCount;
    var nodes = this.nodes;
    var nodeSelfSizeOffset = this._nodeSelfSizeOffset;
    var nodeFieldCount = this._nodeFieldCount;
    var dominatorsTree = this._dominatorsTree;
    var retainedSizes = this._retainedSizes;

    for (var nodeOrdinal = 0; nodeOrdinal < nodeCount; ++nodeOrdinal)
      retainedSizes[nodeOrdinal] = nodes[nodeOrdinal * nodeFieldCount + nodeSelfSizeOffset];

    // Propagate retained sizes for each node excluding root.
    for (var postOrderIndex = 0; postOrderIndex < nodeCount - 1; ++postOrderIndex) {
      var nodeOrdinal = postOrderIndex2NodeOrdinal[postOrderIndex];
      var dominatorOrdinal = dominatorsTree[nodeOrdinal];
      retainedSizes[dominatorOrdinal] += retainedSizes[nodeOrdinal];
    }
  }

  _buildDominatedNodes() {
    // Builds up two arrays:
    //  - "dominatedNodes" is a continuous array, where each node owns an
    //    interval (can be empty) with corresponding dominated nodes.
    //  - "indexArray" is an array of indexes in the "dominatedNodes"
    //    with the same positions as in the _nodeIndex.
    var indexArray = this._firstDominatedNodeIndex;
    // All nodes except the root have dominators.
    var dominatedNodes = this._dominatedNodes;

    // Count the number of dominated nodes for each node. Skip the root (node at
    // index 0) as it is the only node that dominates itself.
    var nodeFieldCount = this._nodeFieldCount;
    var dominatorsTree = this._dominatorsTree;

    var fromNodeOrdinal = 0;
    var toNodeOrdinal = this.nodeCount;
    var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;
    if (rootNodeOrdinal === fromNodeOrdinal)
      fromNodeOrdinal = 1;
    else if (rootNodeOrdinal === toNodeOrdinal - 1)
      toNodeOrdinal = toNodeOrdinal - 1;
    else
      throw new Error('Root node is expected to be either first or last');
    for (var nodeOrdinal = fromNodeOrdinal; nodeOrdinal < toNodeOrdinal; ++nodeOrdinal)
      ++indexArray[dominatorsTree[nodeOrdinal]];
    // Put in the first slot of each dominatedNodes slice the count of entries
    // that will be filled.
    var firstDominatedNodeIndex = 0;
    for (var i = 0, l = this.nodeCount; i < l; ++i) {
      var dominatedCount = dominatedNodes[firstDominatedNodeIndex] = indexArray[i];
      indexArray[i] = firstDominatedNodeIndex;
      firstDominatedNodeIndex += dominatedCount;
    }
    indexArray[this.nodeCount] = dominatedNodes.length;
    // Fill up the dominatedNodes array with indexes of dominated nodes. Skip the root (node at
    // index 0) as it is the only node that dominates itself.
    for (var nodeOrdinal = fromNodeOrdinal; nodeOrdinal < toNodeOrdinal; ++nodeOrdinal) {
      var dominatorOrdinal = dominatorsTree[nodeOrdinal];
      var dominatedRefIndex = indexArray[dominatorOrdinal];
      dominatedRefIndex += (--dominatedNodes[dominatedRefIndex]);
      dominatedNodes[dominatedRefIndex] = nodeOrdinal * nodeFieldCount;
    }
  }

  _buildSamples() {
    var samples = this._rawSamples;
    if (!samples || !samples.length)
      return;
    var sampleCount = samples.length / 2;
    var sizeForRange = new Array(sampleCount);
    var timestamps = new Array(sampleCount);
    var lastAssignedIds = new Array(sampleCount);

    var timestampOffset = this._metaNode.sample_fields.indexOf('timestamp_us');
    var lastAssignedIdOffset = this._metaNode.sample_fields.indexOf('last_assigned_id');
    for (var i = 0; i < sampleCount; i++) {
      sizeForRange[i] = 0;
      timestamps[i] = (samples[2 * i + timestampOffset]) / 1000;
      lastAssignedIds[i] = samples[2 * i + lastAssignedIdOffset];
    }

    var nodes = this.nodes;
    var nodesLength = nodes.length;
    var nodeFieldCount = this._nodeFieldCount;
    var node = this.rootNode();
    for (var nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      node.nodeIndex = nodeIndex;

      var nodeId = node.id();
      // JS objects have odd ids, skip native objects.
      if (nodeId % 2 === 0)
        continue;
      var rangeIndex = lastAssignedIds.lowerBound(nodeId);
      if (rangeIndex === sampleCount) {
        // TODO: make heap profiler not allocate while taking snapshot
        continue;
      }
      sizeForRange[rangeIndex] += node.selfSize();
    }
    this._samples = new HeapSnapshotModel.Samples(timestamps, lastAssignedIds, sizeForRange);
  }

  /**
   * @return {?HeapSnapshotModel.Samples}
   */
  getSamples() {
    return this._samples;
  }

  /**
   * @protected
   */
  calculateFlags() {
    throw new Error('Not implemented');
  }

  /**
   * @protected
   */
  calculateStatistics() {
    throw new Error('Not implemented');
  }

  userObjectsMapAndFlag() {
    throw new Error('Not implemented');
  }

  /**
   * @param {string} baseSnapshotId
   * @param {!Object.<string, !HeapSnapshotModel.AggregateForDiff>} baseSnapshotAggregates
   * @return {!Object.<string, !HeapSnapshotModel.Diff>}
   */
  calculateSnapshotDiff(baseSnapshotId, baseSnapshotAggregates) {
    var snapshotDiff = this._snapshotDiffs[baseSnapshotId];
    if (snapshotDiff)
      return snapshotDiff;
    snapshotDiff = {};

    var aggregates = this.aggregates(true, 'allObjects');
    for (var className in baseSnapshotAggregates) {
      var baseAggregate = baseSnapshotAggregates[className];
      var diff = this._calculateDiffForClass(baseAggregate, aggregates[className]);
      if (diff)
        snapshotDiff[className] = diff;
    }
    var emptyBaseAggregate = new HeapSnapshotModel.AggregateForDiff();
    for (var className in aggregates) {
      if (className in baseSnapshotAggregates)
        continue;
      snapshotDiff[className] = this._calculateDiffForClass(emptyBaseAggregate, aggregates[className]);
    }

    this._snapshotDiffs[baseSnapshotId] = snapshotDiff;
    return snapshotDiff;
  }

  /**
   * @param {!HeapSnapshotModel.AggregateForDiff} baseAggregate
   * @param {!HeapSnapshotModel.Aggregate} aggregate
   * @return {?HeapSnapshotModel.Diff}
   */
  _calculateDiffForClass(baseAggregate, aggregate) {
    var baseIds = baseAggregate.ids;
    var baseIndexes = baseAggregate.indexes;
    var baseSelfSizes = baseAggregate.selfSizes;

    var indexes = aggregate ? aggregate.idxs : [];

    var i = 0, l = baseIds.length;
    var j = 0, m = indexes.length;
    var diff = new HeapSnapshotModel.Diff();

    var nodeB = this.createNode(indexes[j]);
    while (i < l && j < m) {
      var nodeAId = baseIds[i];
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
    if (!diff.addedCount && !diff.removedCount)
      return null;
    return diff;
  }

  _nodeForSnapshotObjectId(snapshotObjectId) {
    for (var it = this._allNodes(); it.hasNext(); it.next()) {
      if (it.node.id() === snapshotObjectId)
        return it.node;
    }
    return null;
  }

  /**
   * @param {string} snapshotObjectId
   * @return {?string}
   */
  nodeClassName(snapshotObjectId) {
    var node = this._nodeForSnapshotObjectId(snapshotObjectId);
    if (node)
      return node.className();
    return null;
  }

  /**
   * @param {string} name
   * @return {!Array.<number>}
   */
  idsOfObjectsWithName(name) {
    var ids = [];
    for (var it = this._allNodes(); it.hasNext(); it.next()) {
      if (it.item().name() === name)
        ids.push(it.item().id());
    }
    return ids;
  }

  /**
   * @param {number} nodeIndex
   * @return {!HeapSnapshotWorker.HeapSnapshotEdgesProvider}
   */
  createEdgesProvider(nodeIndex) {
    var node = this.createNode(nodeIndex);
    var filter = this.containmentEdgesFilter();
    var indexProvider = new HeapSnapshotWorker.HeapSnapshotEdgeIndexProvider(this);
    return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this, filter, node.edges(), indexProvider);
  }

  /**
   * @param {number} nodeIndex
   * @param {?function(!HeapSnapshotWorker.HeapSnapshotEdge):boolean} filter
   * @return {!HeapSnapshotWorker.HeapSnapshotEdgesProvider}
   */
  createEdgesProviderForTest(nodeIndex, filter) {
    var node = this.createNode(nodeIndex);
    var indexProvider = new HeapSnapshotWorker.HeapSnapshotEdgeIndexProvider(this);
    return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this, filter, node.edges(), indexProvider);
  }

  /**
   * @return {?function(!HeapSnapshotWorker.HeapSnapshotEdge):boolean}
   */
  retainingEdgesFilter() {
    return null;
  }

  /**
   * @return {?function(!HeapSnapshotWorker.HeapSnapshotEdge):boolean}
   */
  containmentEdgesFilter() {
    return null;
  }

  /**
   * @param {number} nodeIndex
   * @return {!HeapSnapshotWorker.HeapSnapshotEdgesProvider}
   */
  createRetainingEdgesProvider(nodeIndex) {
    var node = this.createNode(nodeIndex);
    var filter = this.retainingEdgesFilter();
    var indexProvider = new HeapSnapshotWorker.HeapSnapshotRetainerEdgeIndexProvider(this);
    return new HeapSnapshotWorker.HeapSnapshotEdgesProvider(this, filter, node.retainers(), indexProvider);
  }

  /**
   * @param {string} baseSnapshotId
   * @param {string} className
   * @return {!HeapSnapshotWorker.HeapSnapshotNodesProvider}
   */
  createAddedNodesProvider(baseSnapshotId, className) {
    var snapshotDiff = this._snapshotDiffs[baseSnapshotId];
    var diffForClass = snapshotDiff[className];
    return new HeapSnapshotWorker.HeapSnapshotNodesProvider(this, null, diffForClass.addedIndexes);
  }

  /**
   * @param {!Array.<number>} nodeIndexes
   * @return {!HeapSnapshotWorker.HeapSnapshotNodesProvider}
   */
  createDeletedNodesProvider(nodeIndexes) {
    return new HeapSnapshotWorker.HeapSnapshotNodesProvider(this, null, nodeIndexes);
  }

  /**
   * @return {?function(!HeapSnapshotWorker.HeapSnapshotNode):boolean}
   */
  classNodesFilter() {
    return null;
  }

  /**
   * @param {string} className
   * @param {!HeapSnapshotModel.NodeFilter} nodeFilter
   * @return {!HeapSnapshotWorker.HeapSnapshotNodesProvider}
   */
  createNodesProviderForClass(className, nodeFilter) {
    return new HeapSnapshotWorker.HeapSnapshotNodesProvider(
        this, this.classNodesFilter(), this.aggregatesWithFilter(nodeFilter)[className].idxs);
  }

  /**
   * @return {number}
   */
  _maxJsNodeId() {
    var nodeFieldCount = this._nodeFieldCount;
    var nodes = this.nodes;
    var nodesLength = nodes.length;
    var id = 0;
    for (var nodeIndex = this._nodeIdOffset; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      var nextId = nodes[nodeIndex];
      // JS objects have odd ids, skip native objects.
      if (nextId % 2 === 0)
        continue;
      if (id < nextId)
        id = nextId;
    }
    return id;
  }

  /**
   * @return {!HeapSnapshotModel.StaticData}
   */
  updateStaticData() {
    return new HeapSnapshotModel.StaticData(this.nodeCount, this._rootNodeIndex, this.totalSize, this._maxJsNodeId());
  }
};

/**
 * @unrestricted
 */
var HeapSnapshotMetainfo = class {
  constructor() {
    // New format.
    this.node_fields = [];
    this.node_types = [];
    this.edge_fields = [];
    this.edge_types = [];
    this.trace_function_info_fields = [];
    this.trace_node_fields = [];
    this.sample_fields = [];
    this.type_strings = {};
  }
};

/**
 * @unrestricted
 */
var HeapSnapshotHeader = class {
  constructor() {
    // New format.
    this.title = '';
    this.meta = new HeapSnapshotMetainfo();
    this.node_count = 0;
    this.edge_count = 0;
    this.trace_function_count = 0;
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotItemProvider = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotItemIterator} iterator
   * @param {!HeapSnapshotWorker.HeapSnapshotItemIndexProvider} indexProvider
   */
  constructor(iterator, indexProvider) {
    this._iterator = iterator;
    this._indexProvider = indexProvider;
    this._isEmpty = !iterator.hasNext();
    /** @type {?Array.<number>} */
    this._iterationOrder = null;
    this._currentComparator = null;
    this._sortedPrefixLength = 0;
    this._sortedSuffixLength = 0;
  }

  _createIterationOrder() {
    if (this._iterationOrder)
      return;
    this._iterationOrder = [];
    for (var iterator = this._iterator; iterator.hasNext(); iterator.next())
      this._iterationOrder.push(iterator.item().itemIndex());
  }

  /**
   * @return {boolean}
   */
  isEmpty() {
    return this._isEmpty;
  }

  /**
   * @param {number} begin
   * @param {number} end
   * @return {!HeapSnapshotModel.ItemsRange}
   */
  serializeItemsRange(begin, end) {
    this._createIterationOrder();
    if (begin > end)
      throw new Error('Start position > end position: ' + begin + ' > ' + end);
    if (end > this._iterationOrder.length)
      end = this._iterationOrder.length;
    if (this._sortedPrefixLength < end && begin < this._iterationOrder.length - this._sortedSuffixLength) {
      this.sort(
          this._currentComparator, this._sortedPrefixLength, this._iterationOrder.length - 1 - this._sortedSuffixLength,
          begin, end - 1);
      if (begin <= this._sortedPrefixLength)
        this._sortedPrefixLength = end;
      if (end >= this._iterationOrder.length - this._sortedSuffixLength)
        this._sortedSuffixLength = this._iterationOrder.length - begin;
    }
    var position = begin;
    var count = end - begin;
    var result = new Array(count);
    for (var i = 0; i < count; ++i) {
      var itemIndex = this._iterationOrder[position++];
      var item = this._indexProvider.itemForIndex(itemIndex);
      result[i] = item.serialize();
    }
    return new HeapSnapshotModel.ItemsRange(begin, end, this._iterationOrder.length, result);
  }

  sortAndRewind(comparator) {
    this._currentComparator = comparator;
    this._sortedPrefixLength = 0;
    this._sortedSuffixLength = 0;
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotEdgesProvider = class extends HeapSnapshotWorker.HeapSnapshotItemProvider {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshot} snapshot
   * @param {?function(!HeapSnapshotWorker.HeapSnapshotEdge):boolean} filter
   * @param {!HeapSnapshotWorker.HeapSnapshotEdgeIterator} edgesIter
   * @param {!HeapSnapshotWorker.HeapSnapshotItemIndexProvider} indexProvider
   */
  constructor(snapshot, filter, edgesIter, indexProvider) {
    var iter = filter ?
        new HeapSnapshotWorker.HeapSnapshotFilteredIterator(
            edgesIter, /** @type {function(!HeapSnapshotWorker.HeapSnapshotItem):boolean} */ (filter)) :
        edgesIter;
    super(iter, indexProvider);
    this.snapshot = snapshot;
  }

  /**
   * @param {!HeapSnapshotModel.ComparatorConfig} comparator
   * @param {number} leftBound
   * @param {number} rightBound
   * @param {number} windowLeft
   * @param {number} windowRight
   */
  sort(comparator, leftBound, rightBound, windowLeft, windowRight) {
    var fieldName1 = comparator.fieldName1;
    var fieldName2 = comparator.fieldName2;
    var ascending1 = comparator.ascending1;
    var ascending2 = comparator.ascending2;

    var edgeA = this._iterator.item().clone();
    var edgeB = edgeA.clone();
    var nodeA = this.snapshot.createNode();
    var nodeB = this.snapshot.createNode();

    function compareEdgeFieldName(ascending, indexA, indexB) {
      edgeA.edgeIndex = indexA;
      edgeB.edgeIndex = indexB;
      if (edgeB.name() === '__proto__')
        return -1;
      if (edgeA.name() === '__proto__')
        return 1;
      var result = edgeA.hasStringName() === edgeB.hasStringName() ?
          (edgeA.name() < edgeB.name() ? -1 : (edgeA.name() > edgeB.name() ? 1 : 0)) :
          (edgeA.hasStringName() ? -1 : 1);
      return ascending ? result : -result;
    }

    function compareNodeField(fieldName, ascending, indexA, indexB) {
      edgeA.edgeIndex = indexA;
      nodeA.nodeIndex = edgeA.nodeIndex();
      var valueA = nodeA[fieldName]();

      edgeB.edgeIndex = indexB;
      nodeB.nodeIndex = edgeB.nodeIndex();
      var valueB = nodeB[fieldName]();

      var result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
      return ascending ? result : -result;
    }

    function compareEdgeAndNode(indexA, indexB) {
      var result = compareEdgeFieldName(ascending1, indexA, indexB);
      if (result === 0)
        result = compareNodeField(fieldName2, ascending2, indexA, indexB);
      if (result === 0)
        return indexA - indexB;
      return result;
    }

    function compareNodeAndEdge(indexA, indexB) {
      var result = compareNodeField(fieldName1, ascending1, indexA, indexB);
      if (result === 0)
        result = compareEdgeFieldName(ascending2, indexA, indexB);
      if (result === 0)
        return indexA - indexB;
      return result;
    }

    function compareNodeAndNode(indexA, indexB) {
      var result = compareNodeField(fieldName1, ascending1, indexA, indexB);
      if (result === 0)
        result = compareNodeField(fieldName2, ascending2, indexA, indexB);
      if (result === 0)
        return indexA - indexB;
      return result;
    }

    if (fieldName1 === '!edgeName')
      this._iterationOrder.sortRange(compareEdgeAndNode, leftBound, rightBound, windowLeft, windowRight);
    else if (fieldName2 === '!edgeName')
      this._iterationOrder.sortRange(compareNodeAndEdge, leftBound, rightBound, windowLeft, windowRight);
    else
      this._iterationOrder.sortRange(compareNodeAndNode, leftBound, rightBound, windowLeft, windowRight);
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotNodesProvider = class extends HeapSnapshotWorker.HeapSnapshotItemProvider {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshot} snapshot
   * @param {?function(!HeapSnapshotWorker.HeapSnapshotNode):boolean} filter
   * @param {(!Array.<number>|!Uint32Array)} nodeIndexes
   */
  constructor(snapshot, filter, nodeIndexes) {
    var indexProvider = new HeapSnapshotWorker.HeapSnapshotNodeIndexProvider(snapshot);
    var it = new HeapSnapshotWorker.HeapSnapshotIndexRangeIterator(indexProvider, nodeIndexes);

    if (filter) {
      it = new HeapSnapshotWorker.HeapSnapshotFilteredIterator(
          it, /** @type {function(!HeapSnapshotWorker.HeapSnapshotItem):boolean} */ (filter));
    }
    super(it, indexProvider);
    this.snapshot = snapshot;
  }

  /**
   * @param {string} snapshotObjectId
   * @return {number}
   */
  nodePosition(snapshotObjectId) {
    this._createIterationOrder();
    var node = this.snapshot.createNode();
    for (var i = 0; i < this._iterationOrder.length; i++) {
      node.nodeIndex = this._iterationOrder[i];
      if (node.id() === snapshotObjectId)
        break;
    }
    if (i === this._iterationOrder.length)
      return -1;
    var targetNodeIndex = this._iterationOrder[i];
    var smallerCount = 0;
    var compare = this._buildCompareFunction(this._currentComparator);
    for (var i = 0; i < this._iterationOrder.length; i++) {
      if (compare(this._iterationOrder[i], targetNodeIndex) < 0)
        ++smallerCount;
    }
    return smallerCount;
  }

  /**
   * @return {function(number,number):number}
   */
  _buildCompareFunction(comparator) {
    var nodeA = this.snapshot.createNode();
    var nodeB = this.snapshot.createNode();
    var fieldAccessor1 = nodeA[comparator.fieldName1];
    var fieldAccessor2 = nodeA[comparator.fieldName2];
    var ascending1 = comparator.ascending1 ? 1 : -1;
    var ascending2 = comparator.ascending2 ? 1 : -1;

    /**
     * @param {function():*} fieldAccessor
     * @param {number} ascending
     * @return {number}
     */
    function sortByNodeField(fieldAccessor, ascending) {
      var valueA = fieldAccessor.call(nodeA);
      var valueB = fieldAccessor.call(nodeB);
      return valueA < valueB ? -ascending : (valueA > valueB ? ascending : 0);
    }

    /**
     * @param {number} indexA
     * @param {number} indexB
     * @return {number}
     */
    function sortByComparator(indexA, indexB) {
      nodeA.nodeIndex = indexA;
      nodeB.nodeIndex = indexB;
      var result = sortByNodeField(fieldAccessor1, ascending1);
      if (result === 0)
        result = sortByNodeField(fieldAccessor2, ascending2);
      return result || indexA - indexB;
    }

    return sortByComparator;
  }

  /**
   * @param {!HeapSnapshotModel.ComparatorConfig} comparator
   * @param {number} leftBound
   * @param {number} rightBound
   * @param {number} windowLeft
   * @param {number} windowRight
   */
  sort(comparator, leftBound, rightBound, windowLeft, windowRight) {
    this._iterationOrder.sortRange(
        this._buildCompareFunction(comparator), leftBound, rightBound, windowLeft, windowRight);
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.JSHeapSnapshot = class extends HeapSnapshotWorker.HeapSnapshot {
  /**
   * @param {!Object} profile
   * @param {!HeapSnapshotWorker.HeapSnapshotProgress} progress
   */
  constructor(profile, progress) {
    super(profile, progress);
    this._nodeFlags = {
      // bit flags
      canBeQueried: 1,
      detachedDOMTreeNode: 2,
      pageObject: 4  // The idea is to track separately the objects owned by the page and the objects owned by debugger.
    };
    this.initialize();
    this._lazyStringCache = {};
  }

  /**
   * @override
   * @param {number=} nodeIndex
   * @return {!HeapSnapshotWorker.JSHeapSnapshotNode}
   */
  createNode(nodeIndex) {
    return new HeapSnapshotWorker.JSHeapSnapshotNode(this, nodeIndex === undefined ? -1 : nodeIndex);
  }

  /**
   * @override
   * @param {number} edgeIndex
   * @return {!HeapSnapshotWorker.JSHeapSnapshotEdge}
   */
  createEdge(edgeIndex) {
    return new HeapSnapshotWorker.JSHeapSnapshotEdge(this, edgeIndex);
  }

  /**
   * @override
   * @param {number} retainerIndex
   * @return {!HeapSnapshotWorker.JSHeapSnapshotRetainerEdge}
   */
  createRetainingEdge(retainerIndex) {
    return new HeapSnapshotWorker.JSHeapSnapshotRetainerEdge(this, retainerIndex);
  }

  /**
   * @override
   * @return {?function(!HeapSnapshotWorker.HeapSnapshotNode):boolean}
   */
  classNodesFilter() {
    var mapAndFlag = this.userObjectsMapAndFlag();
    if (!mapAndFlag)
      return null;
    var map = mapAndFlag.map;
    var flag = mapAndFlag.flag;
    /**
     * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
     * @return {boolean}
     */
    function filter(node) {
      return !!(map[node.ordinal()] & flag);
    }
    return filter;
  }

  /**
   * @override
   * @return {function(!HeapSnapshotWorker.HeapSnapshotEdge):boolean}
   */
  containmentEdgesFilter() {
    return edge => !edge.isInvisible();
  }

  /**
   * @override
   * @return {function(!HeapSnapshotWorker.HeapSnapshotEdge):boolean}
   */
  retainingEdgesFilter() {
    var containmentEdgesFilter = this.containmentEdgesFilter();
    function filter(edge) {
      return containmentEdgesFilter(edge) && !edge.node().isRoot() && !edge.isWeak();
    }
    return filter;
  }

  /**
   * @override
   */
  calculateFlags() {
    this._flags = new Uint32Array(this.nodeCount);
    this._markDetachedDOMTreeNodes();
    this._markQueriableHeapObjects();
    this._markPageOwnedNodes();
  }

  /**
   * @override
   */
  calculateDistances() {
    /**
     * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
     * @param {!HeapSnapshotWorker.HeapSnapshotEdge} edge
     * @return {boolean}
     */
    function filter(node, edge) {
      if (node.isHidden())
        return edge.name() !== 'sloppy_function_map' || node.rawName() !== 'system / NativeContext';
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
        if (node.rawName() !== '(map descriptors)')
          return true;
        var index = edge.name();
        return index < 2 || (index % 3) !== 1;
      }
      return true;
    }
    super.calculateDistances(filter);
  }

  /**
   * @override
   * @protected
   * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
   * @return {boolean}
   */
  isUserRoot(node) {
    return node.isUserRoot() || node.isDocumentDOMTreesRoot();
  }

  /**
   * @override
   * @param {function(!HeapSnapshotWorker.HeapSnapshotNode)} action
   * @param {boolean=} userRootsOnly
   */
  forEachRoot(action, userRootsOnly) {
    /**
     * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
     * @param {string} name
     * @return {?HeapSnapshotWorker.HeapSnapshotNode}
     */
    function getChildNodeByName(node, name) {
      for (var iter = node.edges(); iter.hasNext(); iter.next()) {
        var child = iter.edge.node();
        if (child.name() === name)
          return child;
      }
      return null;
    }

    var visitedNodes = {};
    /**
     * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
     */
    function doAction(node) {
      var ordinal = node.ordinal();
      if (!visitedNodes[ordinal]) {
        action(node);
        visitedNodes[ordinal] = true;
      }
    }

    var gcRoots = getChildNodeByName(this.rootNode(), '(GC roots)');
    if (!gcRoots)
      return;

    if (userRootsOnly) {
      for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
        var node = iter.edge.node();
        if (this.isUserRoot(node))
          doAction(node);
      }
    } else {
      for (var iter = gcRoots.edges(); iter.hasNext(); iter.next()) {
        var subRoot = iter.edge.node();
        for (var iter2 = subRoot.edges(); iter2.hasNext(); iter2.next())
          doAction(iter2.edge.node());
        doAction(subRoot);
      }
      for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next())
        doAction(iter.edge.node());
    }
  }

  /**
   * @override
   * @return {?{map: !Uint32Array, flag: number}}
   */
  userObjectsMapAndFlag() {
    return {map: this._flags, flag: this._nodeFlags.pageObject};
  }

  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
   * @return {number}
   */
  _flagsOfNode(node) {
    return this._flags[node.nodeIndex / this._nodeFieldCount];
  }

  _markDetachedDOMTreeNodes() {
    var flag = this._nodeFlags.detachedDOMTreeNode;
    var detachedDOMTreesRoot;
    for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
      var node = iter.edge.node();
      if (node.name() === '(Detached DOM trees)') {
        detachedDOMTreesRoot = node;
        break;
      }
    }

    if (!detachedDOMTreesRoot)
      return;

    var detachedDOMTreeRE = /^Detached DOM tree/;
    for (var iter = detachedDOMTreesRoot.edges(); iter.hasNext(); iter.next()) {
      var node = iter.edge.node();
      if (detachedDOMTreeRE.test(node.className())) {
        for (var edgesIter = node.edges(); edgesIter.hasNext(); edgesIter.next())
          this._flags[edgesIter.edge.node().nodeIndex / this._nodeFieldCount] |= flag;
      }
    }
  }

  _markQueriableHeapObjects() {
    // Allow runtime properties query for objects accessible from Window objects
    // via regular properties, and for DOM wrappers. Trying to access random objects
    // can cause a crash due to insonsistent state of internal properties of wrappers.
    var flag = this._nodeFlags.canBeQueried;
    var hiddenEdgeType = this._edgeHiddenType;
    var internalEdgeType = this._edgeInternalType;
    var invisibleEdgeType = this._edgeInvisibleType;
    var weakEdgeType = this._edgeWeakType;
    var edgeToNodeOffset = this._edgeToNodeOffset;
    var edgeTypeOffset = this._edgeTypeOffset;
    var edgeFieldsCount = this._edgeFieldsCount;
    var containmentEdges = this.containmentEdges;
    var nodeFieldCount = this._nodeFieldCount;
    var firstEdgeIndexes = this._firstEdgeIndexes;

    var flags = this._flags;
    var list = [];

    for (var iter = this.rootNode().edges(); iter.hasNext(); iter.next()) {
      if (iter.edge.node().isUserRoot())
        list.push(iter.edge.node().nodeIndex / nodeFieldCount);
    }

    while (list.length) {
      var nodeOrdinal = list.pop();
      if (flags[nodeOrdinal] & flag)
        continue;
      flags[nodeOrdinal] |= flag;
      var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
        var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
        var childNodeOrdinal = childNodeIndex / nodeFieldCount;
        if (flags[childNodeOrdinal] & flag)
          continue;
        var type = containmentEdges[edgeIndex + edgeTypeOffset];
        if (type === hiddenEdgeType || type === invisibleEdgeType || type === internalEdgeType || type === weakEdgeType)
          continue;
        list.push(childNodeOrdinal);
      }
    }
  }

  _markPageOwnedNodes() {
    var edgeShortcutType = this._edgeShortcutType;
    var edgeElementType = this._edgeElementType;
    var edgeToNodeOffset = this._edgeToNodeOffset;
    var edgeTypeOffset = this._edgeTypeOffset;
    var edgeFieldsCount = this._edgeFieldsCount;
    var edgeWeakType = this._edgeWeakType;
    var firstEdgeIndexes = this._firstEdgeIndexes;
    var containmentEdges = this.containmentEdges;
    var nodeFieldCount = this._nodeFieldCount;
    var nodesCount = this.nodeCount;

    var flags = this._flags;
    var pageObjectFlag = this._nodeFlags.pageObject;

    var nodesToVisit = new Uint32Array(nodesCount);
    var nodesToVisitLength = 0;

    var rootNodeOrdinal = this._rootNodeIndex / nodeFieldCount;
    var node = this.rootNode();

    // Populate the entry points. They are Window objects and DOM Tree Roots.
    for (var edgeIndex = firstEdgeIndexes[rootNodeOrdinal], endEdgeIndex = firstEdgeIndexes[rootNodeOrdinal + 1];
         edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
      var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
      var nodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
      if (edgeType === edgeElementType) {
        node.nodeIndex = nodeIndex;
        if (!node.isDocumentDOMTreesRoot())
          continue;
      } else if (edgeType !== edgeShortcutType) {
        continue;
      }
      var nodeOrdinal = nodeIndex / nodeFieldCount;
      nodesToVisit[nodesToVisitLength++] = nodeOrdinal;
      flags[nodeOrdinal] |= pageObjectFlag;
    }

    // Mark everything reachable with the pageObject flag.
    while (nodesToVisitLength) {
      var nodeOrdinal = nodesToVisit[--nodesToVisitLength];
      var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
        var childNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
        var childNodeOrdinal = childNodeIndex / nodeFieldCount;
        if (flags[childNodeOrdinal] & pageObjectFlag)
          continue;
        var type = containmentEdges[edgeIndex + edgeTypeOffset];
        if (type === edgeWeakType)
          continue;
        nodesToVisit[nodesToVisitLength++] = childNodeOrdinal;
        flags[childNodeOrdinal] |= pageObjectFlag;
      }
    }
  }

  /**
   * @override
   */
  calculateStatistics() {
    var nodeFieldCount = this._nodeFieldCount;
    var nodes = this.nodes;
    var nodesLength = nodes.length;
    var nodeTypeOffset = this._nodeTypeOffset;
    var nodeSizeOffset = this._nodeSelfSizeOffset;
    var nodeNativeType = this._nodeNativeType;
    var nodeCodeType = this._nodeCodeType;
    var nodeConsStringType = this._nodeConsStringType;
    var nodeSlicedStringType = this._nodeSlicedStringType;
    var distances = this._nodeDistances;
    var sizeNative = 0;
    var sizeCode = 0;
    var sizeStrings = 0;
    var sizeJSArrays = 0;
    var sizeSystem = 0;
    var node = this.rootNode();
    for (var nodeIndex = 0; nodeIndex < nodesLength; nodeIndex += nodeFieldCount) {
      var nodeSize = nodes[nodeIndex + nodeSizeOffset];
      var ordinal = nodeIndex / nodeFieldCount;
      if (distances[ordinal] >= HeapSnapshotModel.baseSystemDistance) {
        sizeSystem += nodeSize;
        continue;
      }
      var nodeType = nodes[nodeIndex + nodeTypeOffset];
      node.nodeIndex = nodeIndex;
      if (nodeType === nodeNativeType)
        sizeNative += nodeSize;
      else if (nodeType === nodeCodeType)
        sizeCode += nodeSize;
      else if (nodeType === nodeConsStringType || nodeType === nodeSlicedStringType || node.type() === 'string')
        sizeStrings += nodeSize;
      else if (node.name() === 'Array')
        sizeJSArrays += this._calculateArraySize(node);
    }
    this._statistics = new HeapSnapshotModel.Statistics();
    this._statistics.total = this.totalSize;
    this._statistics.v8heap = this.totalSize - sizeNative;
    this._statistics.native = sizeNative;
    this._statistics.code = sizeCode;
    this._statistics.jsArrays = sizeJSArrays;
    this._statistics.strings = sizeStrings;
    this._statistics.system = sizeSystem;
  }

  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotNode} node
   * @return {number}
   */
  _calculateArraySize(node) {
    var size = node.selfSize();
    var beginEdgeIndex = node.edgeIndexesStart();
    var endEdgeIndex = node.edgeIndexesEnd();
    var containmentEdges = this.containmentEdges;
    var strings = this.strings;
    var edgeToNodeOffset = this._edgeToNodeOffset;
    var edgeTypeOffset = this._edgeTypeOffset;
    var edgeNameOffset = this._edgeNameOffset;
    var edgeFieldsCount = this._edgeFieldsCount;
    var edgeInternalType = this._edgeInternalType;
    for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex; edgeIndex += edgeFieldsCount) {
      var edgeType = containmentEdges[edgeIndex + edgeTypeOffset];
      if (edgeType !== edgeInternalType)
        continue;
      var edgeName = strings[containmentEdges[edgeIndex + edgeNameOffset]];
      if (edgeName !== 'elements')
        continue;
      var elementsNodeIndex = containmentEdges[edgeIndex + edgeToNodeOffset];
      node.nodeIndex = elementsNodeIndex;
      if (node.retainersCount() === 1)
        size += node.selfSize();
      break;
    }
    return size;
  }

  /**
   * @return {!HeapSnapshotModel.Statistics}
   */
  getStatistics() {
    return this._statistics;
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.JSHeapSnapshotNode = class extends HeapSnapshotWorker.HeapSnapshotNode {
  /**
   * @param {!HeapSnapshotWorker.JSHeapSnapshot} snapshot
   * @param {number=} nodeIndex
   */
  constructor(snapshot, nodeIndex) {
    super(snapshot, nodeIndex);
  }

  /**
   * @return {boolean}
   */
  canBeQueried() {
    var flags = this._snapshot._flagsOfNode(this);
    return !!(flags & this._snapshot._nodeFlags.canBeQueried);
  }

  /**
   * @return {string}
   */
  rawName() {
    return super.name();
  }

  /**
   * @override
   * @return {string}
   */
  name() {
    var snapshot = this._snapshot;
    if (this.rawType() === snapshot._nodeConsStringType) {
      var string = snapshot._lazyStringCache[this.nodeIndex];
      if (typeof string === 'undefined') {
        string = this._consStringName();
        snapshot._lazyStringCache[this.nodeIndex] = string;
      }
      return string;
    }
    return this.rawName();
  }

  /**
   * @return {string}
   */
  _consStringName() {
    var snapshot = this._snapshot;
    var consStringType = snapshot._nodeConsStringType;
    var edgeInternalType = snapshot._edgeInternalType;
    var edgeFieldsCount = snapshot._edgeFieldsCount;
    var edgeToNodeOffset = snapshot._edgeToNodeOffset;
    var edgeTypeOffset = snapshot._edgeTypeOffset;
    var edgeNameOffset = snapshot._edgeNameOffset;
    var strings = snapshot.strings;
    var edges = snapshot.containmentEdges;
    var firstEdgeIndexes = snapshot._firstEdgeIndexes;
    var nodeFieldCount = snapshot._nodeFieldCount;
    var nodeTypeOffset = snapshot._nodeTypeOffset;
    var nodeNameOffset = snapshot._nodeNameOffset;
    var nodes = snapshot.nodes;
    var nodesStack = [];
    nodesStack.push(this.nodeIndex);
    var name = '';

    while (nodesStack.length && name.length < 1024) {
      var nodeIndex = nodesStack.pop();
      if (nodes[nodeIndex + nodeTypeOffset] !== consStringType) {
        name += strings[nodes[nodeIndex + nodeNameOffset]];
        continue;
      }
      var nodeOrdinal = nodeIndex / nodeFieldCount;
      var beginEdgeIndex = firstEdgeIndexes[nodeOrdinal];
      var endEdgeIndex = firstEdgeIndexes[nodeOrdinal + 1];
      var firstNodeIndex = 0;
      var secondNodeIndex = 0;
      for (var edgeIndex = beginEdgeIndex; edgeIndex < endEdgeIndex && (!firstNodeIndex || !secondNodeIndex);
           edgeIndex += edgeFieldsCount) {
        var edgeType = edges[edgeIndex + edgeTypeOffset];
        if (edgeType === edgeInternalType) {
          var edgeName = strings[edges[edgeIndex + edgeNameOffset]];
          if (edgeName === 'first')
            firstNodeIndex = edges[edgeIndex + edgeToNodeOffset];
          else if (edgeName === 'second')
            secondNodeIndex = edges[edgeIndex + edgeToNodeOffset];
        }
      }
      nodesStack.push(secondNodeIndex);
      nodesStack.push(firstNodeIndex);
    }
    return name;
  }

  /**
   * @override
   * @return {string}
   */
  className() {
    var type = this.type();
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

  /**
   * @override
   * @return {number}
   */
  classIndex() {
    var snapshot = this._snapshot;
    var nodes = snapshot.nodes;
    var type = nodes[this.nodeIndex + snapshot._nodeTypeOffset];
    if (type === snapshot._nodeObjectType || type === snapshot._nodeNativeType)
      return nodes[this.nodeIndex + snapshot._nodeNameOffset];
    return -1 - type;
  }

  /**
   * @override
   * @return {number}
   */
  id() {
    var snapshot = this._snapshot;
    return snapshot.nodes[this.nodeIndex + snapshot._nodeIdOffset];
  }

  /**
   * @return {boolean}
   */
  isHidden() {
    return this.rawType() === this._snapshot._nodeHiddenType;
  }

  /**
   * @return {boolean}
   */
  isArray() {
    return this.rawType() === this._snapshot._nodeArrayType;
  }

  /**
   * @return {boolean}
   */
  isSynthetic() {
    return this.rawType() === this._snapshot._nodeSyntheticType;
  }

  /**
   * @return {boolean}
   */
  isUserRoot() {
    return !this.isSynthetic();
  }

  /**
   * @return {boolean}
   */
  isDocumentDOMTreesRoot() {
    return this.isSynthetic() && this.name() === '(Document DOM trees)';
  }

  /**
   * @override
   * @return {!HeapSnapshotModel.Node}
   */
  serialize() {
    var result = super.serialize();
    var flags = this._snapshot._flagsOfNode(this);
    if (flags & this._snapshot._nodeFlags.canBeQueried)
      result.canBeQueried = true;
    if (flags & this._snapshot._nodeFlags.detachedDOMTreeNode)
      result.detachedDOMTreeNode = true;
    return result;
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.JSHeapSnapshotEdge = class extends HeapSnapshotWorker.HeapSnapshotEdge {
  /**
   * @param {!HeapSnapshotWorker.JSHeapSnapshot} snapshot
   * @param {number=} edgeIndex
   */
  constructor(snapshot, edgeIndex) {
    super(snapshot, edgeIndex);
  }

  /**
   * @override
   * @return {!HeapSnapshotWorker.JSHeapSnapshotEdge}
   */
  clone() {
    var snapshot = /** @type {!HeapSnapshotWorker.JSHeapSnapshot} */ (this._snapshot);
    return new HeapSnapshotWorker.JSHeapSnapshotEdge(snapshot, this.edgeIndex);
  }

  /**
   * @override
   * @return {boolean}
   */
  hasStringName() {
    if (!this.isShortcut())
      return this._hasStringName();
    return isNaN(parseInt(this._name(), 10));
  }

  /**
   * @return {boolean}
   */
  isElement() {
    return this.rawType() === this._snapshot._edgeElementType;
  }

  /**
   * @return {boolean}
   */
  isHidden() {
    return this.rawType() === this._snapshot._edgeHiddenType;
  }

  /**
   * @return {boolean}
   */
  isWeak() {
    return this.rawType() === this._snapshot._edgeWeakType;
  }

  /**
   * @return {boolean}
   */
  isInternal() {
    return this.rawType() === this._snapshot._edgeInternalType;
  }

  /**
   * @return {boolean}
   */
  isInvisible() {
    return this.rawType() === this._snapshot._edgeInvisibleType;
  }

  /**
   * @return {boolean}
   */
  isShortcut() {
    return this.rawType() === this._snapshot._edgeShortcutType;
  }

  /**
   * @override
   * @return {string}
   */
  name() {
    var name = this._name();
    if (!this.isShortcut())
      return String(name);
    var numName = parseInt(name, 10);
    return String(isNaN(numName) ? name : numName);
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    var name = this.name();
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
        if (typeof name === 'string')
          return name.indexOf(' ') === -1 ? '.' + name : '["' + name + '"]';
        else
          return '[' + name + ']';
      case 'internal':
      case 'hidden':
      case 'invisible':
        return '{' + name + '}';
    }
    return '?' + name + '?';
  }

  /**
   * @return {boolean}
   */
  _hasStringName() {
    var type = this.rawType();
    var snapshot = this._snapshot;
    return type !== snapshot._edgeElementType && type !== snapshot._edgeHiddenType;
  }

  /**
   * @return {string|number}
   */
  _name() {
    return this._hasStringName() ? this._snapshot.strings[this._nameOrIndex()] : this._nameOrIndex();
  }

  /**
   * @return {number}
   */
  _nameOrIndex() {
    return this._edges[this.edgeIndex + this._snapshot._edgeNameOffset];
  }

  /**
   * @override
   * @return {number}
   */
  rawType() {
    return this._edges[this.edgeIndex + this._snapshot._edgeTypeOffset];
  }
};

/**
 * @unrestricted
 */
HeapSnapshotWorker.JSHeapSnapshotRetainerEdge = class extends HeapSnapshotWorker.HeapSnapshotRetainerEdge {
  /**
   * @param {!HeapSnapshotWorker.JSHeapSnapshot} snapshot
   * @param {number} retainerIndex
   */
  constructor(snapshot, retainerIndex) {
    super(snapshot, retainerIndex);
  }

  /**
   * @override
   * @return {!HeapSnapshotWorker.JSHeapSnapshotRetainerEdge}
   */
  clone() {
    var snapshot = /** @type {!HeapSnapshotWorker.JSHeapSnapshot} */ (this._snapshot);
    return new HeapSnapshotWorker.JSHeapSnapshotRetainerEdge(snapshot, this.retainerIndex());
  }

  /**
   * @return {boolean}
   */
  isHidden() {
    return this._edge().isHidden();
  }

  /**
   * @return {boolean}
   */
  isInternal() {
    return this._edge().isInternal();
  }

  /**
   * @return {boolean}
   */
  isInvisible() {
    return this._edge().isInvisible();
  }

  /**
   * @return {boolean}
   */
  isShortcut() {
    return this._edge().isShortcut();
  }

  /**
   * @return {boolean}
   */
  isWeak() {
    return this._edge().isWeak();
  }
};
