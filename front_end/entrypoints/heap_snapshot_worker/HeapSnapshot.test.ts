// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as HeapSnapshotModel from '../../models/heap_snapshot/heap_snapshot.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as HeapSnapshotWorker from './heap_snapshot_worker.js';

describeWithEnvironment('HeapSnapshot', () => {
  class MockArray extends Uint32Array {
    getValue(i: number): number {
      return this[i];
    }
  }

  /* eslint-disable @typescript-eslint/naming-convention */
  interface RawMock {
    snapshot: {
      meta: {
        node_fields: string[],
        node_types: Array<string[]|string>,
        edge_fields: string[],
        edge_types: Array<string[]|string>,
        location_fields?: string[],
        trace_function_info_fields?: string[],
        trace_node_fields?: string[],
      },
      node_count: number,
      edge_count: number,
      trace_function_count?: number,
    };
    nodes: number[]|Uint32Array;
    edges: number[]|Uint32Array;
    trace_function_infos?: number[]|Uint32Array;
    trace_tree?: unknown[];
    locations?: number[];
    strings: string[];
  }
  /* eslint-enable @typescript-eslint/naming-convention */

  /* eslint-disable @typescript-eslint/naming-convention */
  interface SerializationTarget {
    nodes: number[];
    edges: number[];
    snapshot: {
      meta: {
        node_fields: string[],
        node_types: Array<string[]|string>,
        edge_fields: string[],
        edge_types: Array<string[]|string>,
      },
      edge_count?: number,
      node_count?: number,
      extra_native_bytes?: number,
    };
    locations: number[];
    strings: string[];
  }
  /* eslint-enable @typescript-eslint/naming-convention */

  // Mock Utilities extracted from legacy_test_runner/heap_profiler_test_runner/heap_profiler_test_runner.js

  function createJSHeapSnapshotMockObject() {
    const result = {
      rootNodeIndex: 0,
      nodeTypeOffset: 0,
      nodeNameOffset: 1,
      nodeEdgeCountOffset: 2,
      nodeFieldCount: 3,
      edgeFieldsCount: 3,
      edgeTypeOffset: 0,
      edgeNameOffset: 1,
      edgeToNodeOffset: 2,
      nodeTypes: ['hidden', 'object'],
      edgeTypes: ['element', 'property', 'shortcut'],
      edgeShortcutType: -1,
      edgeHiddenType: -1,
      edgeElementType: 0,
      realNodesLength: 18,
      nodes: new MockArray([0, 0, 2, 1, 1, 2, 1, 2, 2, 1, 3, 1, 1, 4, 0, 1, 5, 0]),
      containmentEdges: new MockArray([2, 6, 3, 1, 7, 6, 0, 1, 6, 1, 8, 9, 1, 9, 9, 1, 10, 12, 1, 11, 15]),
      strings: ['', 'A', 'B', 'C', 'D', 'E', 'a', 'b', 'ac', 'bc', 'bd', 'ce'],
      firstEdgeIndexes: new MockArray([0, 6, 12, 18, 21, 21, 21]),
      createNode: HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot.prototype.createNode,
      createEdge: HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot.prototype.createEdge,
      createRetainingEdge: HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot.prototype.createRetainingEdge
    };
    return result as unknown as HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot;
  }

  function createHeapSnapshotMockRaw() {
    return {
      snapshot: {
        meta: {
          node_fields: ['type', 'name', 'id', 'self_size', 'retained_size', 'dominator', 'edge_count'],
          node_types: [['hidden', 'object'], '', '', '', '', '', ''],
          edge_fields: ['type', 'name_or_index', 'to_node'],
          edge_types: [['element', 'property', 'shortcut'], '', ''],
          location_fields: ['object_index', 'script_id', 'line', 'column'],
          trace_function_info_fields: ['function_id', 'name', 'script_name', 'script_id', 'line', 'column'],
          trace_node_fields: ['id', 'function_info_index', 'count', 'size', 'children']
        },
        node_count: 6,
        edge_count: 7,
        trace_function_count: 1
      },

      nodes: [
        0, 0, 1, 0, 20, 0, 2, 1, 1, 2, 2, 2, 0,  2, 1, 2, 3, 3, 8, 0,  2,
        1, 3, 4, 4, 10, 0, 1, 1, 4, 5, 5, 5, 14, 0, 1, 5, 6, 6, 6, 21, 0
      ],

      edges: [1, 6, 7, 1, 7, 14, 0, 1, 14, 1, 8, 21, 1, 9, 21, 1, 10, 28, 1, 11, 35],

      trace_function_infos: [0, 2, 1, 0, 0, 0],

      trace_tree: [1, 0, 0, 0, []],

      locations: [0, 1, 2, 3, 18, 2, 3, 4],

      strings: ['', 'A', 'B', 'C', 'D', 'E', 'a', 'b', 'ac', 'bc', 'bd', 'ce']
    };
  }

  function postprocessHeapSnapshotMock(mock: RawMock) {
    mock.nodes = new MockArray(mock.nodes as number[]);
    mock.edges = new MockArray(mock.edges as number[]);
    if (mock.trace_function_infos) {
      mock.trace_function_infos = new MockArray(mock.trace_function_infos as number[]);
    }
    return mock as unknown as HeapSnapshotWorker.HeapSnapshot.Profile;
  }

  function createHeapSnapshotMock() {
    return postprocessHeapSnapshotMock(createHeapSnapshotMockRaw());
  }

  function createHeapSnapshotMockWithDOM() {
    return postprocessHeapSnapshotMock({
      snapshot: {
        meta: {
          node_fields: ['type', 'name', 'id', 'edge_count'],
          node_types: [['hidden', 'object', 'synthetic'], '', '', ''],
          edge_fields: ['type', 'name_or_index', 'to_node'],
          edge_types: [['element', 'hidden', 'internal'], '', ''],
          location_fields: ['object_index', 'script_id', 'line', 'column']
        },

        node_count: 13,
        edge_count: 13
      },

      nodes: [
        2, 0, 1, 4, 1, 11, 2, 2, 1, 11, 3, 3, 2,  5, 4, 0, 2,  6, 5, 1,  1,  1, 6, 0, 1,  2,
        7, 1, 1, 4, 8, 2,  1, 8, 9, 0,  1, 7, 10, 0, 1, 3, 11, 0, 1, 10, 12, 0, 1, 9, 13, 0
      ],

      edges: [
        0,  1, 4, 0,  2, 8, 0,  3, 12, 0,  4, 16, 0,  1, 20, 0,  2, 24, 0, 1,
        24, 0, 2, 28, 1, 3, 32, 0, 1,  36, 0, 1,  40, 2, 12, 44, 2, 1,  48
      ],

      locations: [0, 2, 1, 1, 6, 2, 2, 2],

      strings: ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M', 'N', 'Window', 'native']
    });
  }

  class HeapNode {
    type: string;
    name: string;
    selfSize: number;
    builder: HeapSnapshotBuilder|null;
    edges: Record<string, HeapEdge>;
    edgesCount: number;
    id: number|undefined;
    ordinal: number|undefined;

    constructor(name: string, selfSize?: number, type?: string, id?: number) {
      this.type = type || 'object';
      this.name = name;
      this.selfSize = selfSize || 0;
      this.builder = null;
      this.edges = {};
      this.edgesCount = 0;
      this.id = id;
    }

    linkNode(node: HeapNode, type: string, nameOrIndex?: string|number) {
      if (!this.builder) {
        throw new Error('parent node is not connected to a snapshot');
      }

      if (!node.builder) {
        node.setBuilder(this.builder);
      }

      if (nameOrIndex === undefined) {
        nameOrIndex = this.edgesCount;
      }

      ++this.edgesCount;

      const key = String(nameOrIndex);
      if (key in this.edges) {
        throw new Error(
            'Can\'t add edge with the same nameOrIndex. nameOrIndex: ' + nameOrIndex +
            ' oldNodeName: ' + this.edges[key].targetNode.name + ' newNodeName: ' + node.name);
      }

      this.edges[key] = new HeapEdge(node, type, nameOrIndex);
    }

    setBuilder(builder: HeapSnapshotBuilder) {
      if (this.builder) {
        throw new Error('node reusing is prohibited');
      }

      this.builder = builder;
      this.ordinal = this.builder.registerNode(this);
    }

    serialize(rawSnapshot: SerializationTarget) {
      if (!this.builder) {
        throw new Error('No builder');
      }
      rawSnapshot.nodes.push(this.builder.lookupNodeType(this.type));
      rawSnapshot.nodes.push(this.builder.lookupOrAddString(this.name));
      rawSnapshot.nodes.push(this.id || (this.ordinal !== undefined ? this.ordinal * 2 + 1 : 0));
      rawSnapshot.nodes.push(this.selfSize);
      rawSnapshot.nodes.push(0);
      rawSnapshot.nodes.push(0);
      rawSnapshot.nodes.push(Object.keys(this.edges).length);

      for (const i in this.edges) {
        this.edges[i].serialize(rawSnapshot);
      }
    }
  }

  class HeapEdge {
    targetNode: HeapNode;
    type: string;
    nameOrIndex: string|number;

    constructor(targetNode: HeapNode, type: string, nameOrIndex: string|number) {
      this.targetNode = targetNode;
      this.type = type;
      this.nameOrIndex = nameOrIndex;
    }

    serialize(rawSnapshot: SerializationTarget) {
      if (!this.targetNode.builder) {
        throw new Error('Inconsistent state of node: ' + this.targetNode.name + ' no builder assigned');
      }

      const builder = this.targetNode.builder;
      rawSnapshot.edges.push(builder.lookupEdgeType(this.type));
      rawSnapshot.edges.push(
          (typeof this.nameOrIndex === 'string' ? builder.lookupOrAddString(this.nameOrIndex) : this.nameOrIndex));
      rawSnapshot.edges.push(this.targetNode.ordinal! * builder.nodeFieldsCount);
    }
  }

  class HeapSnapshotBuilder {
    nodes: HeapNode[];
    string2id: Record<string, number>;
    strings: string[];
    nodeFieldsCount: number;
    nodeTypesMap: Record<string, number>;
    nodeTypesArray: string[];
    edgeTypesMap: Record<string, number>;
    edgeTypesArray: string[];
    extraNativeBytes: number;
    rootNode: HeapNode;

    constructor() {
      this.nodes = [];
      this.string2id = {};
      this.strings = [];
      this.nodeFieldsCount = 7;
      this.nodeTypesMap = {};
      this.nodeTypesArray = [];
      this.edgeTypesMap = {};
      this.edgeTypesArray = [];
      this.extraNativeBytes = 0;

      const nodeTypes = [
        'hidden', 'array', 'string', 'object', 'code', 'closure', 'regexp', 'number', 'native', 'synthetic', 'bigint'
      ];
      for (let i = 0; i < nodeTypes.length; i++) {
        this.nodeTypesMap[nodeTypes[i]] = i;
        this.nodeTypesArray.push(nodeTypes[i]);
      }

      const edgeTypes = ['context', 'element', 'property', 'internal', 'hidden', 'shortcut', 'weak'];
      for (let i = 0; i < edgeTypes.length; i++) {
        this.edgeTypesMap[edgeTypes[i]] = i;
        this.edgeTypesArray.push(edgeTypes[i]);
      }

      this.rootNode = new HeapNode('root', 0, 'object');
      this.rootNode.setBuilder(this);
    }

    generateSnapshot(): RawMock {
      const rawSnapshot: SerializationTarget = {
        snapshot: {
          meta: {
            node_fields: ['type', 'name', 'id', 'self_size', 'retained_size', 'dominator', 'edge_count'],
            node_types: [this.nodeTypesArray, 'string', 'number', 'number', 'number', 'number', 'number'],
            edge_fields: ['type', 'name_or_index', 'to_node'],
            edge_types: [this.edgeTypesArray, 'string_or_number', 'node']
          },
          extra_native_bytes: this.extraNativeBytes
        },

        nodes: [],
        edges: [],
        locations: [],
        strings: []
      };

      for (let i = 0; i < this.nodes.length; ++i) {
        this.nodes[i].serialize(rawSnapshot);
      }

      rawSnapshot.strings = this.strings.slice();
      const meta = rawSnapshot.snapshot.meta;
      rawSnapshot.snapshot.edge_count = rawSnapshot.edges.length / meta.edge_fields.length;
      rawSnapshot.snapshot.node_count = rawSnapshot.nodes.length / meta.node_fields.length;
      return rawSnapshot as unknown as RawMock;
    }

    async createJSHeapSnapshot() {
      const parsedSnapshot = postprocessHeapSnapshotMock(this.generateSnapshot());
      return await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(parsedSnapshot);
    }

    registerNode(node: HeapNode) {
      this.nodes.push(node);
      return this.nodes.length - 1;
    }

    lookupNodeType(typeName: string) {
      if (typeName === undefined) {
        throw new Error('wrong node type: ' + typeName);
      }

      if (!(typeName in this.nodeTypesMap)) {
        throw new Error('wrong node type name: ' + typeName);
      }

      return this.nodeTypesMap[typeName];
    }

    lookupEdgeType(typeName: string) {
      if (!(typeName in this.edgeTypesMap)) {
        throw new Error('wrong edge type name: ' + typeName);
      }

      return this.edgeTypesMap[typeName];
    }

    lookupOrAddString(string: string) {
      if (string in this.string2id) {
        return this.string2id[string];
      }

      this.string2id[string] = this.strings.length;
      this.strings.push(string);
      return this.strings.length - 1;
    }
  }

  // Test Cases

  it('heapSnapshotNodeSimple', () => {
    const snapshot = createJSHeapSnapshotMockObject();
    const nodeRoot = snapshot.createNode(snapshot.rootNodeIndex);
    assert.strictEqual(nodeRoot.name(), '', 'root name');
    assert.strictEqual(nodeRoot.type(), 'hidden', 'root type');
    assert.strictEqual(nodeRoot.edgesCount(), 2, 'root edges');
    const nodeE = snapshot.createNode(15);
    assert.strictEqual(nodeE.name(), 'E', 'E name');
    assert.strictEqual(nodeE.type(), 'object', 'E type');
    assert.strictEqual(nodeE.edgesCount(), 0, 'E edges');
  });

  it('heapSnapshotNodeIterator', () => {
    const snapshot = createJSHeapSnapshotMockObject();
    const nodeRoot = snapshot.createNode(snapshot.rootNodeIndex);
    const iterator = new HeapSnapshotWorker.HeapSnapshot.HeapSnapshotNodeIterator(nodeRoot);
    const names: string[] = [];
    for (; iterator.hasNext(); iterator.next()) {
      names.push(iterator.item().name());
    }
    assert.strictEqual(names.join(','), ',A,B,C,D,E', 'node iterator');
  });

  it('heapSnapshotEdgeSimple', () => {
    const snapshot = createJSHeapSnapshotMockObject();
    const nodeRoot = snapshot.createNode(snapshot.rootNodeIndex);
    const edgeIterator = new HeapSnapshotWorker.HeapSnapshot.HeapSnapshotEdgeIterator(nodeRoot);
    assert.isTrue(edgeIterator.hasNext(), 'has edges');
    const edge = edgeIterator.item();
    assert.strictEqual(edge.type(), 'shortcut', 'edge type');
    assert.strictEqual(edge.name(), 'a', 'edge name');
    assert.strictEqual(edge.node().name(), 'A', 'edge node name');

    let edgesCount = 0;
    for (; edgeIterator.hasNext(); edgeIterator.next()) {
      ++edgesCount;
    }
    assert.strictEqual(edgesCount, nodeRoot.edgesCount(), 'edges count');
  });

  it('heapSnapshotEdgeIterator', () => {
    const snapshot = createJSHeapSnapshotMockObject();
    const nodeRoot = snapshot.createNode(snapshot.rootNodeIndex);
    const names: string[] = [];
    for (const iterator = nodeRoot.edges(); iterator.hasNext(); iterator.next()) {
      names.push(iterator.item().name());
    }
    assert.strictEqual(names.join(','), 'a,b', 'edge iterator');
    const nodeE = snapshot.createNode(15);
    assert.isFalse(nodeE.edges().hasNext(), 'empty edge iterator');
  });

  it('heapSnapshotNodeAndEdge', async () => {
    const snapshotMock = createJSHeapSnapshotMockObject();
    const nodeRoot = snapshotMock.createNode(snapshotMock.rootNodeIndex);
    let names: string[] = [];

    function depthFirstTraversal(node: HeapSnapshotWorker.HeapSnapshot.HeapSnapshotNode) {
      names.push(node.name());
      for (const edges = node.edges(); edges.hasNext(); edges.next()) {
        names.push(edges.item().name());
        depthFirstTraversal(edges.item().node());
      }
    }

    depthFirstTraversal(nodeRoot);
    const reference = ',a,A,1,B,bc,C,ce,E,bd,D,ac,C,ce,E,b,B,bc,C,ce,E,bd,D';
    assert.strictEqual(names.join(','), reference, 'mock traversal');

    names = [];
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());
    depthFirstTraversal(snapshot.rootNode());
    assert.strictEqual(names.join(','), reference, 'snapshot traversal');
  });

  it('heapSnapshotSimple', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());
    assert.strictEqual(snapshot.nodeCount, 6, 'node count');
    assert.strictEqual(snapshot.totalSize, 20, 'total size');
  });

  it('heapSnapshotContainmentEdgeIndexes', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());
    const actual = snapshot.firstEdgeIndexes;
    const expected = [0, 6, 12, 18, 21, 21, 21];
    assert.strictEqual(actual.length, expected.length, 'Edge indexes size');
    for (let i = 0; i < expected.length; ++i) {
      assert.strictEqual(actual[i], expected[i], 'Edge indexes');
    }
  });

  it('heapSnapshotDominatorsTree', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());
    const dominatorsTree = snapshot.dominatorsTree;
    const expected = [0, 0, 0, 0, 2, 3];
    for (let i = 0; i < expected.length; ++i) {
      assert.strictEqual(dominatorsTree[i], expected[i], 'Dominators Tree');
    }
  });

  it('heapSnapshotLocations', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());
    const expected = new Map([
      [0, {scriptId: 1, lineNumber: 2, columnNumber: 3}],
      [18, {scriptId: 2, lineNumber: 3, columnNumber: 4}],
    ]);

    for (const [index, expectedLocation] of expected) {
      const location = snapshot.getLocation(index);
      assert.isNotNull(location);
      assert.strictEqual(location.scriptId, expectedLocation.scriptId, 'Locations scriptId');
      assert.strictEqual(location.lineNumber, expectedLocation.lineNumber, 'Locations lineNumber');
      assert.strictEqual(location.columnNumber, expectedLocation.columnNumber, 'Locations columnNumber');
    }
  });

  it('heapSnapshotRetainedSize', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());
    const actualRetainedSizes = new Array(snapshot.nodeCount);
    for (let nodeOrdinal = 0; nodeOrdinal < snapshot.nodeCount; ++nodeOrdinal) {
      actualRetainedSizes[nodeOrdinal] = snapshot.retainedSizes[nodeOrdinal];
    }
    const expectedRetainedSizes = [20, 2, 8, 10, 5, 6];
    assert.strictEqual(JSON.stringify(actualRetainedSizes), JSON.stringify(expectedRetainedSizes), 'Retained sizes');
  });

  it('heapSnapshotLargeRetainedSize', async () => {
    const builder = new HeapSnapshotBuilder();
    let node = builder.rootNode;

    const iterations = 6;
    const nodeSize = 1000 * 1000 * 1000;
    for (let i = 0; i < 6; i++) {
      const newNode = new HeapNode('Node' + i, nodeSize);
      node.linkNode(newNode, 'element');
      node = newNode;
    }

    const snapshot = await builder.createJSHeapSnapshot();
    assert.strictEqual(
        snapshot.rootNode().retainedSize(), iterations * nodeSize,
        'Ensure that root node retained size supports values exceeding 2^32 bytes.');
  });

  it('heapSnapshotDominatedNodes', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());

    const expectedDominatedNodes = [21, 14, 7, 28, 35];
    const actualDominatedNodes = snapshot.dominatedNodes;
    assert.strictEqual(actualDominatedNodes.length, expectedDominatedNodes.length, 'Dominated Nodes length');
    for (let i = 0; i < expectedDominatedNodes.length; ++i) {
      assert.strictEqual(actualDominatedNodes[i], expectedDominatedNodes[i], 'Dominated Nodes');
    }

    const expectedDominatedNodeIndex = [0, 3, 3, 4, 5, 5, 5];
    const actualDominatedNodeIndex = snapshot.firstDominatedNodeIndex;
    assert.strictEqual(
        actualDominatedNodeIndex.length, expectedDominatedNodeIndex.length, 'Dominated Nodes Index length');
    for (let i = 0; i < expectedDominatedNodeIndex.length; ++i) {
      assert.strictEqual(actualDominatedNodeIndex[i], expectedDominatedNodeIndex[i], 'Dominated Nodes Index');
    }
  });

  it('heapSnapshotPageOwned', async () => {
    const builder = new HeapSnapshotBuilder();
    const rootNode = builder.rootNode;

    const debuggerNode = new HeapNode('Debugger');
    rootNode.linkNode(debuggerNode, 'element');

    const windowNode = new HeapNode('Window');
    rootNode.linkNode(windowNode, 'shortcut');

    const pageOwnedNode = new HeapNode('PageOwnedNode');
    windowNode.linkNode(pageOwnedNode, 'element');
    debuggerNode.linkNode(pageOwnedNode, 'property', 'debugger2pageOwnedNode');

    const debuggerOwnedNode = new HeapNode('debuggerOwnedNode');
    debuggerNode.linkNode(debuggerOwnedNode, 'element');

    const snapshot = await builder.createJSHeapSnapshot();
    const result = snapshot.userObjectsMapAndFlag();
    assert.isNotNull(result);
    const flags = result.map;
    const flag = result.flag;

    const actualPageObjects = Array.from(flags).map(f => (f & flag) === flag ? flag : 0);
    const expectedPageObjects = [0, 0, 4, 4, 0];
    assert.strictEqual(
        JSON.stringify(actualPageObjects), JSON.stringify(expectedPageObjects),
        'We are expecting that only window(third element) and PageOwnedNode(forth element) have the pageObject flag.');
  });

  it('heapSnapshotRetainers', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());
    const expectedRetainers:
        Record<string, string[]> = {'': [], A: [''], B: ['', 'A'], C: ['A', 'B'], D: ['B'], E: ['C']};
    const nodeIterator = new HeapSnapshotWorker.HeapSnapshot.HeapSnapshotNodeIterator(snapshot.createNode(0));
    for (; nodeIterator.hasNext(); nodeIterator.next()) {
      const node = nodeIterator.item();
      const names: string[] = [];
      for (const retainers = node.retainers(); retainers.hasNext(); retainers.next()) {
        names.push(retainers.item().node().name());
      }
      names.sort();
      assert.strictEqual(
          names.join(','), expectedRetainers[node.name()].join(','), 'retainers of "' + node.name() + '"');
    }
  });

  it('heapSnapshotAggregates', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());
    const expectedAggregates: Record<string, Partial<HeapSnapshotModel.HeapSnapshotModel.AggregatedInfo>> = {
      A: {count: 1, self: 2, maxRet: 2, name: 'A'},
      B: {count: 1, self: 3, maxRet: 8, name: 'B'},
      C: {count: 1, self: 4, maxRet: 10, name: 'C'},
      D: {count: 1, self: 5, maxRet: 5, name: 'D'},
      E: {count: 1, self: 6, maxRet: 6, name: 'E'}
    };
    const aggregates = snapshot.getAggregatesByClassKey(false);
    for (const key in aggregates) {
      const aggregate = aggregates[key];
      const expectedAggregate = expectedAggregates[aggregate.name];
      for (const parameter in expectedAggregate) {
        assert.strictEqual(
            aggregate[parameter as keyof HeapSnapshotModel.HeapSnapshotModel.AggregatedInfo],
            expectedAggregate[parameter as keyof HeapSnapshotModel.HeapSnapshotModel.AggregatedInfo],
            'parameter ' + parameter + ' of "' + aggregate.name + '"',
        );
      }
    }
    const expectedIndexes: Record<string, number[]> = {A: [7], B: [14], C: [21], D: [28], E: [35]};
    snapshot.getAggregatesByClassKey(true);
    for (const key in aggregates) {
      const aggregate = aggregates[key];
      const expectedIndex = expectedIndexes[aggregate.name];
      assert.strictEqual(aggregate.idxs.join(','), expectedIndex.join(','), 'indexes of "' + aggregate.name + '"');
    }
  });

  it('heapSnapshotFlags', async () => {
    const snapshot =
        await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMockWithDOM());
    const expectedCanBeQueried: Record<string, boolean> = {
      '': false,
      A: true,
      B: true,
      C: true,
      D: true,
      E: false,
      F: false,
      G: false,
      H: false,
      M: false,
      N: false,
      Window: true
    };
    const nodeIterator = new HeapSnapshotWorker.HeapSnapshot.HeapSnapshotNodeIterator(snapshot.createNode(0));
    for (; nodeIterator.hasNext(); nodeIterator.next()) {
      const node = nodeIterator.item() as HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshotNode;
      assert.strictEqual(
          node.canBeQueried(), expectedCanBeQueried[node.name()], 'canBeQueried of "' + node.name() + '"');
    }
  });

  it('heapSnapshotNodesProvider', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());

    const allNodeIndexes: number[] = [];
    for (let i = 0; i < snapshot.nodes.length; i += snapshot.nodeFieldCount) {
      allNodeIndexes.push(i);
    }
    const provider = new HeapSnapshotWorker.HeapSnapshot.HeapSnapshotNodesProvider(snapshot, allNodeIndexes);
    provider.sortAndRewind({fieldName1: 'name', ascending1: false, fieldName2: 'id', ascending2: false});
    const range = provider.serializeItemsRange(0, 6);
    assert.strictEqual(range.totalLength, 6, 'Node range total length');
    assert.strictEqual(range.startPosition, 0, 'Node range start position');
    assert.strictEqual(range.endPosition, 6, 'Node range end position');
    const names = range.items.map(item => item.name);
    assert.strictEqual(names.join(','), 'E,D,C,B,A,', 'nodes provider names');
  });

  it('heapSnapshotEdgesProvider', async () => {
    const snapshot = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());

    function edgeFilter(edge: HeapSnapshotWorker.HeapSnapshot.HeapSnapshotEdge) {
      return edge.name() === 'b';
    }

    const provider = snapshot.createEdgesProviderForTest(snapshot.rootNodeIndex, edgeFilter);
    provider.sortAndRewind({fieldName1: '!edgeName', ascending1: false, fieldName2: 'id', ascending2: false});
    const range = provider.serializeItemsRange(0, 10);
    assert.strictEqual(range.totalLength, 1, 'Edge range total length');
    assert.strictEqual(range.startPosition, 0, 'Edge range start position');
    assert.strictEqual(range.endPosition, 1, 'Edge range end position');
    const names = range.items.map(item => item.name);
    assert.strictEqual(names.join(','), 'b', 'edges provider names');
  });

  it('heapSnapshotLoader', async () => {
    const source = createHeapSnapshotMockRaw();
    const sourceStringified = JSON.stringify(source);
    const partSize = sourceStringified.length >> 3;

    const dispatcher = new HeapSnapshotWorker.HeapSnapshotWorkerDispatcher.HeapSnapshotWorkerDispatcher(() => {});
    const loader = new HeapSnapshotWorker.HeapSnapshotLoader.HeapSnapshotLoader(dispatcher);
    for (let i = 0, l = sourceStringified.length; i < l; i += partSize) {
      loader.write(sourceStringified.slice(i, i + partSize));
    }
    loader.close();
    await loader.parsingComplete;
    const channel = new MessageChannel();
    new HeapSnapshotWorker.HeapSnapshot.SecondaryInitManager(channel.port2);
    const result = await loader.buildSnapshot(channel.port1);
    const reference = await HeapSnapshotWorker.HeapSnapshot.createJSHeapSnapshotForTesting(createHeapSnapshotMock());

    const resultToCompare = {
      nodes: Array.from(result.nodes.asUint32ArrayOrFail()),
      containmentEdges: Array.from(result.containmentEdges.asUint32ArrayOrFail()),
    };
    const referenceToCompare = {
      nodes: Array.from(reference.nodes as unknown as number[]),
      containmentEdges: Array.from(reference.containmentEdges as unknown as number[]),
    };

    assert.strictEqual(JSON.stringify(referenceToCompare), JSON.stringify(resultToCompare));
  });
});
