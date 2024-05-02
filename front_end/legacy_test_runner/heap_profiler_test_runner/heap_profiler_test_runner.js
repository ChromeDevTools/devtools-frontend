// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as HeapSnapshotWorker from '../../entrypoints/heap_snapshot_worker/heap_snapshot_worker.js';
import * as Profiler from '../../panels/profiler/profiler.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */
export const HeapProfilerTestRunner = {};

HeapProfilerTestRunner.createHeapSnapshotMockFactories = function() {
  HeapProfilerTestRunner.createJSHeapSnapshotMockObject = function() {
    return {
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
      nodes: new Uint32Array([0, 0, 2, 1, 1, 2, 1, 2, 2, 1, 3, 1, 1, 4, 0, 1, 5, 0]),
      containmentEdges: new Uint32Array([2, 6, 3, 1, 7, 6, 0, 1, 6, 1, 8, 9, 1, 9, 9, 1, 10, 12, 1, 11, 15]),
      strings: ['', 'A', 'B', 'C', 'D', 'E', 'a', 'b', 'ac', 'bc', 'bd', 'ce'],
      firstEdgeIndexes: new Uint32Array([0, 6, 12, 18, 21, 21, 21]),
      createNode: HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot.prototype.createNode,
      createEdge: HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot.prototype.createEdge,
      createRetainingEdge: HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot.prototype.createRetainingEdge
    };
  };

  HeapProfilerTestRunner.createHeapSnapshotMockRaw = function() {
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
        edge_count: 7
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
  };

  HeapProfilerTestRunner.postprocessHeapSnapshotMock = function(mock) {
    mock.nodes = new Uint32Array(mock.nodes);
    mock.edges = new Uint32Array(mock.edges);
    return mock;
  };

  HeapProfilerTestRunner.createHeapSnapshotMock = function() {
    return HeapProfilerTestRunner.postprocessHeapSnapshotMock(HeapProfilerTestRunner.createHeapSnapshotMockRaw());
  };

  HeapProfilerTestRunner.createHeapSnapshotMockWithDOM = function() {
    return HeapProfilerTestRunner.postprocessHeapSnapshotMock({
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
  };

  HeapProfilerTestRunner.HeapNode = function(name, selfSize, type, id) {
    this.type = type || HeapProfilerTestRunner.HeapNode.Type.object;
    this.name = name;
    this.selfSize = selfSize || 0;
    this.builder = null;
    this.edges = {};
    this.edgesCount = 0;
    this.id = id;
  };

  HeapProfilerTestRunner.HeapNode.Type = {
    'hidden': 'hidden',
    'array': 'array',
    'string': 'string',
    'object': 'object',
    'code': 'code',
    'closure': 'closure',
    'regexp': 'regexp',
    'number': 'number',
    'native': 'native',
    'synthetic': 'synthetic',
    'bigint': 'bigint'
  };

  HeapProfilerTestRunner.HeapNode.prototype = {
    linkNode: function(node, type, nameOrIndex) {
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

      if (nameOrIndex in this.edges) {
        throw new Error(
            'Can\'t add edge with the same nameOrIndex. nameOrIndex: ' + nameOrIndex +
            ' oldNodeName: ' + this.edges[nameOrIndex].name + ' newNodeName: ' + node.name);
      }

      this.edges[nameOrIndex] = new HeapProfilerTestRunner.HeapEdge(node, type, nameOrIndex);
    },

    setBuilder: function(builder) {
      if (this.builder) {
        throw new Error('node reusing is prohibited');
      }

      this.builder = builder;
      this.ordinal = this.builder.registerNode(this);
    },

    serialize: function(rawSnapshot) {
      rawSnapshot.nodes.push(this.builder.lookupNodeType(this.type));
      rawSnapshot.nodes.push(this.builder.lookupOrAddString(this.name));
      rawSnapshot.nodes.push(this.id || this.ordinal * 2 + 1);
      rawSnapshot.nodes.push(this.selfSize);
      rawSnapshot.nodes.push(0);
      rawSnapshot.nodes.push(0);
      rawSnapshot.nodes.push(Object.keys(this.edges).length);

      for (const i in this.edges) {
        this.edges[i].serialize(rawSnapshot);
      }
    }
  };

  HeapProfilerTestRunner.HeapEdge = function(targetNode, type, nameOrIndex) {
    this.targetNode = targetNode;
    this.type = type;
    this.nameOrIndex = nameOrIndex;
  };

  HeapProfilerTestRunner.HeapEdge.prototype = {
    serialize: function(rawSnapshot) {
      if (!this.targetNode.builder) {
        throw new Error('Inconsistent state of node: ' + this.name + ' no builder assigned');
      }

      const builder = this.targetNode.builder;
      rawSnapshot.edges.push(builder.lookupEdgeType(this.type));
      rawSnapshot.edges.push(
          (typeof this.nameOrIndex === 'string' ? builder.lookupOrAddString(this.nameOrIndex) : this.nameOrIndex));
      rawSnapshot.edges.push(this.targetNode.ordinal * builder.nodeFieldsCount);
    }
  };

  HeapProfilerTestRunner.HeapEdge.Type = {
    'context': 'context',
    'element': 'element',
    'property': 'property',
    'internal': 'internal',
    'hidden': 'hidden',
    'shortcut': 'shortcut',
    'weak': 'weak'
  };

  HeapProfilerTestRunner.HeapSnapshotBuilder = function() {
    this.nodes = [];
    this.string2id = {};
    this.strings = [];
    this.nodeFieldsCount = 7;
    this.nodeTypesMap = {};
    this.nodeTypesArray = [];

    for (const nodeType in HeapProfilerTestRunner.HeapNode.Type) {
      this.nodeTypesMap[nodeType] = this.nodeTypesArray.length;
      this.nodeTypesArray.push(nodeType);
    }

    this.edgeTypesMap = {};
    this.edgeTypesArray = [];

    for (const edgeType in HeapProfilerTestRunner.HeapEdge.Type) {
      this.edgeTypesMap[edgeType] = this.edgeTypesArray.length;
      this.edgeTypesArray.push(edgeType);
    }

    this.rootNode = new HeapProfilerTestRunner.HeapNode('root', 0, 'object');
    this.rootNode.setBuilder(this);
  };

  HeapProfilerTestRunner.HeapSnapshotBuilder.prototype = {
    generateSnapshot: function() {
      const rawSnapshot = {
        'snapshot': {
          'meta': {
            'node_fields': ['type', 'name', 'id', 'self_size', 'retained_size', 'dominator', 'edge_count'],
            'node_types': [this.nodeTypesArray, 'string', 'number', 'number', 'number', 'number', 'number'],
            'edge_fields': ['type', 'name_or_index', 'to_node'],
            'edge_types': [this.edgeTypesArray, 'string_or_number', 'node']
          }
        },

        'nodes': [],
        'edges': [],
        'locations': [],
        'strings': []
      };

      for (let i = 0; i < this.nodes.length; ++i) {
        this.nodes[i].serialize(rawSnapshot);
      }

      rawSnapshot.strings = this.strings.slice();
      const meta = rawSnapshot.snapshot.meta;
      rawSnapshot.snapshot.edge_count = rawSnapshot.edges.length / meta.edge_fields.length;
      rawSnapshot.snapshot.node_count = rawSnapshot.nodes.length / meta.node_fields.length;
      return rawSnapshot;
    },

    createJSHeapSnapshot: function() {
      const parsedSnapshot = HeapProfilerTestRunner.postprocessHeapSnapshotMock(this.generateSnapshot());
      return new HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot(
          parsedSnapshot, new HeapSnapshotWorker.HeapSnapshot.HeapSnapshotProgress());
    },

    registerNode: function(node) {
      this.nodes.push(node);
      return this.nodes.length - 1;
    },

    lookupNodeType: function(typeName) {
      if (typeName === undefined) {
        throw new Error('wrong node type: ' + typeName);
      }

      if (!(typeName in this.nodeTypesMap)) {
        throw new Error('wrong node type name: ' + typeName);
      }

      return this.nodeTypesMap[typeName];
    },

    lookupEdgeType: function(typeName) {
      if (!(typeName in this.edgeTypesMap)) {
        throw new Error('wrong edge type name: ' + typeName);
      }

      return this.edgeTypesMap[typeName];
    },

    lookupOrAddString: function(string) {
      if (string in this.string2id) {
        return this.string2id[string];
      }

      this.string2id[string] = this.strings.length;
      this.strings.push(string);
      return this.strings.length - 1;
    }
  };

  HeapProfilerTestRunner.createHeapSnapshot = function(instanceCount, firstId) {
    let seed = 881669;

    function pseudoRandom(limit) {
      seed = seed * 355109 + 153763 >> 2 & 65535;
      return seed % limit;
    }

    const builder = new HeapProfilerTestRunner.HeapSnapshotBuilder();
    const rootNode = builder.rootNode;
    const gcRootsNode =
        new HeapProfilerTestRunner.HeapNode('(GC roots)', 0, HeapProfilerTestRunner.HeapNode.Type.synthetic);
    rootNode.linkNode(gcRootsNode, HeapProfilerTestRunner.HeapEdge.Type.element);
    const windowNode = new HeapProfilerTestRunner.HeapNode('Window', 20);
    rootNode.linkNode(windowNode, HeapProfilerTestRunner.HeapEdge.Type.shortcut);
    gcRootsNode.linkNode(windowNode, HeapProfilerTestRunner.HeapEdge.Type.element);

    for (let i = 0; i < instanceCount; ++i) {
      const sizeOfB = pseudoRandom(20) + 1;
      const nodeB = new HeapProfilerTestRunner.HeapNode('B', sizeOfB, undefined, firstId++);
      windowNode.linkNode(nodeB, HeapProfilerTestRunner.HeapEdge.Type.element);
      const sizeOfA = pseudoRandom(50) + 1;
      const nodeA = new HeapProfilerTestRunner.HeapNode('A', sizeOfA, undefined, firstId++);
      nodeB.linkNode(nodeA, HeapProfilerTestRunner.HeapEdge.Type.property, 'a');
      nodeA.linkNode(nodeA, HeapProfilerTestRunner.HeapEdge.Type.property, 'a');
    }

    return builder.generateSnapshot();
  };
};

HeapProfilerTestRunner.createHeapSnapshotMockFactories();

HeapProfilerTestRunner.startProfilerTest = function(callback) {
  TestRunner.addResult('Profiler was enabled.');
  HeapProfilerTestRunner.panelReset =
      TestRunner.override(Profiler.HeapProfilerPanel.HeapProfilerPanel.instance(), 'reset', function() {}, true);
  TestRunner.addSniffer(
      Profiler.HeapProfilerPanel.HeapProfilerPanel.instance(), 'addProfileHeader',
      HeapProfilerTestRunner.profileHeaderAdded, true);
  TestRunner.addSniffer(
      Profiler.ProfileView.ProfileView.prototype, 'refresh', HeapProfilerTestRunner.profileViewRefresh, true);
  TestRunner.addSniffer(
      Profiler.HeapSnapshotView.HeapSnapshotView.prototype, 'show', HeapProfilerTestRunner.snapshotViewShown, true);

  Profiler.HeapSnapshotDataGrids.HeapSnapshotContainmentDataGrid.prototype.defaultPopulateCount = function() {
    return 10;
  };

  Profiler.HeapSnapshotDataGrids.HeapSnapshotConstructorsDataGrid.prototype.defaultPopulateCount = function() {
    return 10;
  };

  Profiler.HeapSnapshotDataGrids.HeapSnapshotDiffDataGrid.prototype.defaultPopulateCount = function() {
    return 5;
  };

  TestRunner.addResult('Detailed heap profiles were enabled.');
  TestRunner.safeWrap(callback)();
};

HeapProfilerTestRunner.completeProfilerTest = function() {
  TestRunner.addResult('');
  TestRunner.addResult('Profiler was disabled.');
  TestRunner.completeTest();
};

HeapProfilerTestRunner.runHeapSnapshotTestSuite = function(testSuite) {
  const testSuiteTests = testSuite.slice();
  let completeTestStack;

  function runner() {
    if (!testSuiteTests.length) {
      if (completeTestStack) {
        TestRunner.addResult('FAIL: test already completed at ' + completeTestStack);
      }

      HeapProfilerTestRunner.completeProfilerTest();
      completeTestStack = new Error().stack;
      return;
    }

    const nextTest = testSuiteTests.shift();
    TestRunner.addResult('');
    TestRunner.addResult(
        'Running: ' +
        /function\s([^(]*)/.exec(nextTest)[1]);
    HeapProfilerTestRunner.panelReset.call(Profiler.HeapProfilerPanel.HeapProfilerPanel.instance());
    TestRunner.safeWrap(nextTest)(runner, runner);
  }

  HeapProfilerTestRunner.startProfilerTest(runner);
};

HeapProfilerTestRunner.assertColumnContentsEqual = function(reference, actual) {
  const length = Math.min(reference.length, actual.length);

  for (let i = 0; i < length; ++i) {
    TestRunner.assertEquals(reference[i], actual[i], 'row ' + i);
  }

  if (reference.length > length) {
    TestRunner.addResult('extra rows in reference array:\n' + reference.slice(length).join('\n'));
  } else if (actual.length > length) {
    TestRunner.addResult('extra rows in actual array:\n' + actual.slice(length).join('\n'));
  }
};

HeapProfilerTestRunner.checkArrayIsSorted = function(contents, sortType, sortOrder) {
  function simpleComparator(a, b) {
    return (a < b ? -1 : (a > b ? 1 : 0));
  }

  function parseSize(size) {
    return parseInt(size.replace(/[\xa0,]/g, ''), 10);
  }

  const extractor = {
    text: function(data) {
      data;
    },

    number: function(data) {
      return parseInt(data, 10);
    },

    size: parseSize,

    name: function(data) {
      return data;
    },

    id: function(data) {
      return parseInt(data, 10);
    }
  }[sortType];

  if (!extractor) {
    TestRunner.addResult('Invalid sort type: ' + sortType);
    return;
  }

  let acceptableComparisonResult;

  if (sortOrder === DataGrid.DataGrid.Order.Ascending) {
    acceptableComparisonResult = -1;
  } else if (sortOrder === DataGrid.DataGrid.Order.Descending) {
    acceptableComparisonResult = 1;
  } else {
    TestRunner.addResult('Invalid sort order: ' + sortOrder);
    return;
  }

  for (let i = 0; i < contents.length - 1; ++i) {
    const a = extractor(contents[i]);
    const b = extractor(contents[i + 1]);
    const result = simpleComparator(a, b);

    if (result !== 0 && result !== acceptableComparisonResult) {
      TestRunner.addResult(
          'Elements ' + i + ' and ' + (i + 1) + ' are out of order: ' + a + ' ' + b + ' (' + sortOrder + ')');
    }
  }
};

HeapProfilerTestRunner.clickColumn = function(column, callback) {
  callback = TestRunner.safeWrap(callback);
  const cell = this.currentGrid().dataTableHeaders[column.id];

  const event = {target: cell};

  function sortingComplete() {
    HeapProfilerTestRunner.currentGrid().removeEventListener(
        Profiler.HeapSnapshotDataGrids.HeapSnapshotSortableDataGridEvents.SortingComplete, sortingComplete, this);
    TestRunner.assertEquals(column.id, this.currentGrid().sortColumnId(), 'unexpected sorting');
    column.sort = this.currentGrid().sortOrder();

    function callCallback() {
      callback(column);
    }

    setTimeout(callCallback, 0);
  }

  HeapProfilerTestRunner.currentGrid().addEventListener(
      Profiler.HeapSnapshotDataGrids.HeapSnapshotSortableDataGridEvents.SortingComplete, sortingComplete, this);
  this.currentGrid().clickInHeaderCell(event);
};

HeapProfilerTestRunner.clickRowAndGetRetainers = function(row, callback) {
  callback = TestRunner.safeWrap(callback);

  const event = {target: row.element()};

  this.currentGrid().mouseDownInDataTable(event);
  const rootNode = HeapProfilerTestRunner.currentProfileView().retainmentDataGrid.rootNode();
  rootNode.once(Profiler.HeapSnapshotGridNodes.HeapSnapshotGridNode.Events.PopulateComplete)
      .then(() => callback(rootNode));
};

HeapProfilerTestRunner.clickShowMoreButton = function(buttonName, row, callback) {
  callback = TestRunner.safeWrap(callback);
  const parent = row.parent;
  parent.once(Profiler.HeapSnapshotGridNodes.HeapSnapshotGridNode.Events.PopulateComplete)
      .then(() => setTimeout(() => callback(parent), 0));
  row[buttonName].click();
};

HeapProfilerTestRunner.columnContents = function(column, row) {
  this.currentGrid().updateVisibleNodes();
  const columnOrdinal = HeapProfilerTestRunner.viewColumns().indexOf(column);
  const result = [];
  const parent = row || this.currentGrid().rootNode();

  for (let node = parent.children[0]; node; node = node.traverseNextNode(true, parent, true)) {
    if (!node.selectable) {
      continue;
    }

    let content = node.element().children[columnOrdinal];

    if (content.firstElementChild) {
      content = content.firstElementChild;
    }

    result.push(content.textContent);
  }

  return result;
};

HeapProfilerTestRunner.countDataRows = function(row, filter) {
  let result = 0;

  filter = filter || function(node) {
    return node.selectable;
  };

  for (let node = row.children[0]; node; node = node.traverseNextNode(true, row, true)) {
    if (filter(node)) {
      ++result;
    }
  }

  return result;
};

HeapProfilerTestRunner.expandRow = function(row, callback) {
  callback = TestRunner.safeWrap(callback);
  row.once(Profiler.HeapSnapshotGridNodes.HeapSnapshotGridNode.Events.PopulateComplete)
      .then(() => setTimeout(() => callback(row), 0));

  (function expand() {
    if (row.hasChildren()) {
      row.expand();
    } else {
      setTimeout(expand, 0);
    }
  })();
};

HeapProfilerTestRunner.expandRowPromise = function(row) {
  return new Promise(resolve => HeapProfilerTestRunner.expandRow(row, resolve));
};

HeapProfilerTestRunner.findAndExpandGCRoots = function(callback) {
  HeapProfilerTestRunner.findAndExpandRow('(GC roots)', callback);
};

HeapProfilerTestRunner.findAndExpandWindow = function(callback) {
  HeapProfilerTestRunner.findAndExpandRow('Window', callback);
};

HeapProfilerTestRunner.findAndExpandRow = async function(name, callback) {
  const row = HeapProfilerTestRunner.findRow(name);
  TestRunner.assertEquals(true, Boolean(row), `"${name}" row`);
  await HeapProfilerTestRunner.expandRowPromise(row);
  TestRunner.safeWrap(callback)(row);
  return row;
};

HeapProfilerTestRunner.findButtonsNode = function(row, startNode) {
  for (let node = startNode || row.children[0]; node; node = node.traverseNextNode(true, row, true)) {
    if (!node.selectable && node.showNext) {
      return node;
    }
  }
  return null;
};

HeapProfilerTestRunner.findRow = function(name, parent) {
  return HeapProfilerTestRunner.findMatchingRow(node => node.name === name, parent);
};

HeapProfilerTestRunner.findMatchingRow = function(matcher, parent) {
  parent = parent || this.currentGrid().rootNode();

  for (let node = parent.children[0]; node; node = node.traverseNextNode(true, parent, true)) {
    if (matcher(node)) {
      return node;
    }
  }

  return null;
};

HeapProfilerTestRunner.switchToView = function(title, callback) {
  return new Promise(resolve => {
    callback = TestRunner.safeWrap(callback);
    const view = Profiler.HeapProfilerPanel.HeapProfilerPanel.instance().visibleView;
    view.changePerspectiveAndWait(title).then(callback).then(resolve);
    HeapProfilerTestRunner.currentGrid().scrollContainer.style.height = '10000px';
  });
};

HeapProfilerTestRunner.takeAndOpenSnapshot = async function(generator, callback) {
  callback = TestRunner.safeWrap(callback);
  const snapshot = generator();
  const profileType = Profiler.ProfileTypeRegistry.instance.heapSnapshotProfileType;

  async function pushGeneratedSnapshot(reportProgress) {
    if (reportProgress) {
      profileType.reportHeapSnapshotProgress({data: {done: 50, total: 100, finished: false}});
      profileType.reportHeapSnapshotProgress({data: {done: 100, total: 100, finished: true}});
    }
    snapshot.snapshot.typeId = 'HEAP';
    profileType.addHeapSnapshotChunk({data: JSON.stringify(snapshot)});
  }

  HeapProfilerTestRunner.takeAndOpenSnapshotCallback = callback;
  TestRunner.override(TestRunner.HeapProfilerAgent, 'invoke_takeHeapSnapshot', pushGeneratedSnapshot);
  if (!UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel)) {
    await new Promise(
        resolve =>
            UI.Context.Context.instance().addFlavorChangeListener(SDK.HeapProfilerModel.HeapProfilerModel, resolve));
  }
  profileType.takeHeapSnapshot();
};

/**
 * @return {!Promise<!Profiler.HeapSnapshotView.HeapProfileHeader>}
 */
HeapProfilerTestRunner.takeSnapshotPromise = function() {
  return new Promise(resolve => {
    const heapProfileType = Profiler.ProfileTypeRegistry.instance.heapSnapshotProfileType;
    heapProfileType.addEventListener(
        Profiler.HeapSnapshotView.HeapSnapshotProfileType.SnapshotReceived, finishHeapSnapshot);
    heapProfileType.takeHeapSnapshot();

    function finishHeapSnapshot() {
      const profiles = heapProfileType.getProfiles();
      if (!profiles.length) {
        throw 'FAILED: no profiles found.';
      }
      if (profiles.length > 1) {
        throw `FAILED: wrong number of recorded profiles was found. profiles.length = ${profiles.length}`;
      }
      const profile = profiles[0];
      Profiler.HeapProfilerPanel.HeapProfilerPanel.instance().showProfile(profile);

      const dataGrid = HeapProfilerTestRunner.currentProfileView().dataGrid;
      dataGrid.addEventListener(
          Profiler.HeapSnapshotDataGrids.HeapSnapshotSortableDataGridEvents.SortingComplete, sortingComplete, null);

      function sortingComplete() {
        dataGrid.removeEventListener(
            Profiler.HeapSnapshotDataGrids.HeapSnapshotSortableDataGridEvents.SortingComplete, sortingComplete, null);
        resolve(profile);
      }
    }
  });
};

HeapProfilerTestRunner.viewColumns = function() {
  return HeapProfilerTestRunner.currentGrid().columnsArray;
};

HeapProfilerTestRunner.currentProfileView = function() {
  return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance().visibleView;
};

HeapProfilerTestRunner.currentGrid = function() {
  return this.currentProfileView().dataGrid;
};

HeapProfilerTestRunner.snapshotViewShown = function() {
  if (HeapProfilerTestRunner.takeAndOpenSnapshotCallback) {
    const callback = HeapProfilerTestRunner.takeAndOpenSnapshotCallback;
    HeapProfilerTestRunner.takeAndOpenSnapshotCallback = null;
    const dataGrid = this.dataGrid;

    function sortingComplete() {
      dataGrid.removeEventListener(
          Profiler.HeapSnapshotDataGrids.HeapSnapshotSortableDataGridEvents.SortingComplete, sortingComplete, null);
      callback();
    }

    dataGrid.addEventListener(
        Profiler.HeapSnapshotDataGrids.HeapSnapshotSortableDataGridEvents.SortingComplete, sortingComplete, null);
  }
};

HeapProfilerTestRunner.showProfileWhenAdded = function(title) {
  HeapProfilerTestRunner.showProfileWhenAdded = title;
  return new Promise(resolve => HeapProfilerTestRunner.waitUntilProfileViewIsShown(title, resolve));
};

HeapProfilerTestRunner.profileHeaderAdded = function(profile) {
  if (HeapProfilerTestRunner.showProfileWhenAdded === profile.title) {
    Profiler.HeapProfilerPanel.HeapProfilerPanel.instance().showProfile(profile);
  }
};

HeapProfilerTestRunner.waitUntilProfileViewIsShown = function(title, callback) {
  callback = TestRunner.safeWrap(callback);
  const profilesPanel = Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();

  if (profilesPanel.visibleView && profilesPanel.visibleView.profile &&
      profilesPanel.visibleView.profileHeader.title === title) {
    callback(profilesPanel.visibleView);
  } else {
    HeapProfilerTestRunner.waitUntilProfileViewIsShownCallback = {title: title, callback: callback};
  }
};

HeapProfilerTestRunner.profileViewRefresh = function() {
  if (HeapProfilerTestRunner.waitUntilProfileViewIsShownCallback &&
      HeapProfilerTestRunner.waitUntilProfileViewIsShownCallback.title === this.profileHeader.title) {
    const callback = HeapProfilerTestRunner.waitUntilProfileViewIsShownCallback;
    delete HeapProfilerTestRunner.waitUntilProfileViewIsShownCallback;
    callback.callback(this);
  }
};

HeapProfilerTestRunner.startSamplingHeapProfiler = async function() {
  if (!UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel)) {
    await new Promise(
        resolve =>
            UI.Context.Context.instance().addFlavorChangeListener(SDK.HeapProfilerModel.HeapProfilerModel, resolve));
  }
  Profiler.HeapProfileView.SamplingHeapProfileType.instance.startRecordingProfile();
};

HeapProfilerTestRunner.stopSamplingHeapProfiler = function() {
  Profiler.HeapProfileView.SamplingHeapProfileType.instance.stopRecordingProfile();
};
