// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

ProfilerTestRunner.createHeapSnapshotMockFactories = function() {
  ProfilerTestRunner.createJSHeapSnapshotMockObject = function() {
    return {
      _rootNodeIndex: 0,
      _nodeTypeOffset: 0,
      _nodeNameOffset: 1,
      _nodeEdgeCountOffset: 2,
      _nodeFieldCount: 3,
      _edgeFieldsCount: 3,
      _edgeTypeOffset: 0,
      _edgeNameOffset: 1,
      _edgeToNodeOffset: 2,
      _nodeTypes: ['hidden', 'object'],
      _edgeTypes: ['element', 'property', 'shortcut'],
      _edgeShortcutType: -1,
      _edgeHiddenType: -1,
      _edgeElementType: 0,
      _realNodesLength: 18,
      nodes: new Uint32Array([0, 0, 2, 1, 1, 2, 1, 2, 2, 1, 3, 1, 1, 4, 0, 1, 5, 0]),
      containmentEdges: new Uint32Array([2, 6, 3, 1, 7, 6, 0, 1, 6, 1, 8, 9, 1, 9, 9, 1, 10, 12, 1, 11, 15]),
      strings: ['', 'A', 'B', 'C', 'D', 'E', 'a', 'b', 'ac', 'bc', 'bd', 'ce'],
      _firstEdgeIndexes: new Uint32Array([0, 6, 12, 18, 21, 21, 21]),
      createNode: HeapSnapshotWorker.JSHeapSnapshot.prototype.createNode,
      createEdge: HeapSnapshotWorker.JSHeapSnapshot.prototype.createEdge,
      createRetainingEdge: HeapSnapshotWorker.JSHeapSnapshot.prototype.createRetainingEdge
    };
  };

  ProfilerTestRunner.createHeapSnapshotMockRaw = function() {
    return {
      snapshot: {
        meta: {
          node_fields: ['type', 'name', 'id', 'self_size', 'retained_size', 'dominator', 'edge_count'],
          node_types: [['hidden', 'object'], '', '', '', '', '', ''],
          edge_fields: ['type', 'name_or_index', 'to_node'],
          edge_types: [['element', 'property', 'shortcut'], '', '']
        },

        node_count: 6,
        edge_count: 7
      },

      nodes: [
        0, 0, 1, 0, 20, 0, 2, 1, 1, 2, 2, 2, 0,  2, 1, 2, 3, 3, 8, 0,  2,
        1, 3, 4, 4, 10, 0, 1, 1, 4, 5, 5, 5, 14, 0, 1, 5, 6, 6, 6, 21, 0
      ],

      edges: [1, 6, 7, 1, 7, 14, 0, 1, 14, 1, 8, 21, 1, 9, 21, 1, 10, 28, 1, 11, 35],
      strings: ['', 'A', 'B', 'C', 'D', 'E', 'a', 'b', 'ac', 'bc', 'bd', 'ce']
    };
  };

  ProfilerTestRunner._postprocessHeapSnapshotMock = function(mock) {
    mock.nodes = new Uint32Array(mock.nodes);
    mock.edges = new Uint32Array(mock.edges);
    return mock;
  };

  ProfilerTestRunner.createHeapSnapshotMock = function() {
    return ProfilerTestRunner._postprocessHeapSnapshotMock(ProfilerTestRunner.createHeapSnapshotMockRaw());
  };

  ProfilerTestRunner.createHeapSnapshotMockWithDOM = function() {
    return ProfilerTestRunner._postprocessHeapSnapshotMock({
      snapshot: {
        meta: {
          node_fields: ['type', 'name', 'id', 'edge_count'],
          node_types: [['hidden', 'object', 'synthetic'], '', '', ''],
          edge_fields: ['type', 'name_or_index', 'to_node'],
          edge_types: [['element', 'hidden', 'internal'], '', '']
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

      strings: ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M', 'N', 'Window', 'native']
    });
  };

  ProfilerTestRunner.HeapNode = function(name, selfSize, type, id) {
    this._type = type || ProfilerTestRunner.HeapNode.Type.object;
    this._name = name;
    this._selfSize = selfSize || 0;
    this._builder = null;
    this._edges = {};
    this._edgesCount = 0;
    this._id = id;
  };

  ProfilerTestRunner.HeapNode.Type = {
    'hidden': 'hidden',
    'array': 'array',
    'string': 'string',
    'object': 'object',
    'code': 'code',
    'closure': 'closure',
    'regexp': 'regexp',
    'number': 'number',
    'native': 'native',
    'synthetic': 'synthetic'
  };

  ProfilerTestRunner.HeapNode.prototype = {
    linkNode: function(node, type, nameOrIndex) {
      if (!this._builder)
        throw new Error('parent node is not connected to a snapshot');

      if (!node._builder)
        node._setBuilder(this._builder);

      if (nameOrIndex === undefined)
        nameOrIndex = this._edgesCount;

      ++this._edgesCount;

      if (nameOrIndex in this._edges) {
        throw new Error(
            'Can\'t add edge with the same nameOrIndex. nameOrIndex: ' + nameOrIndex +
            ' oldNodeName: ' + this._edges[nameOrIndex]._name + ' newNodeName: ' + node._name);
      }

      this._edges[nameOrIndex] = new ProfilerTestRunner.HeapEdge(node, type, nameOrIndex);
    },

    _setBuilder: function(builder) {
      if (this._builder)
        throw new Error('node reusing is prohibited');

      this._builder = builder;
      this._ordinal = this._builder._registerNode(this);
    },

    _serialize: function(rawSnapshot) {
      rawSnapshot.nodes.push(this._builder.lookupNodeType(this._type));
      rawSnapshot.nodes.push(this._builder.lookupOrAddString(this._name));
      rawSnapshot.nodes.push(this._id || this._ordinal * 2 + 1);
      rawSnapshot.nodes.push(this._selfSize);
      rawSnapshot.nodes.push(0);
      rawSnapshot.nodes.push(0);
      rawSnapshot.nodes.push(Object.keys(this._edges).length);

      for (var i in this._edges)
        this._edges[i]._serialize(rawSnapshot);
    }
  };

  ProfilerTestRunner.HeapEdge = function(targetNode, type, nameOrIndex) {
    this._targetNode = targetNode;
    this._type = type;
    this._nameOrIndex = nameOrIndex;
  };

  ProfilerTestRunner.HeapEdge.prototype = {
    _serialize: function(rawSnapshot) {
      if (!this._targetNode._builder)
        throw new Error('Inconsistent state of node: ' + this._name + ' no builder assigned');

      var builder = this._targetNode._builder;
      rawSnapshot.edges.push(builder.lookupEdgeType(this._type));
      rawSnapshot.edges.push(
          (typeof this._nameOrIndex === 'string' ? builder.lookupOrAddString(this._nameOrIndex) : this._nameOrIndex));
      rawSnapshot.edges.push(this._targetNode._ordinal * builder.nodeFieldsCount);
    }
  };

  ProfilerTestRunner.HeapEdge.Type = {
    'context': 'context',
    'element': 'element',
    'property': 'property',
    'internal': 'internal',
    'hidden': 'hidden',
    'shortcut': 'shortcut',
    'weak': 'weak'
  };

  ProfilerTestRunner.HeapSnapshotBuilder = function() {
    this._nodes = [];
    this._string2id = {};
    this._strings = [];
    this.nodeFieldsCount = 7;
    this._nodeTypesMap = {};
    this._nodeTypesArray = [];

    for (var nodeType in ProfilerTestRunner.HeapNode.Type) {
      this._nodeTypesMap[nodeType] = this._nodeTypesArray.length;
      this._nodeTypesArray.push(nodeType);
    }

    this._edgeTypesMap = {};
    this._edgeTypesArray = [];

    for (var edgeType in ProfilerTestRunner.HeapEdge.Type) {
      this._edgeTypesMap[edgeType] = this._edgeTypesArray.length;
      this._edgeTypesArray.push(edgeType);
    }

    this.rootNode = new ProfilerTestRunner.HeapNode('root', 0, 'object');
    this.rootNode._setBuilder(this);
  };

  ProfilerTestRunner.HeapSnapshotBuilder.prototype = {
    generateSnapshot: function() {
      var rawSnapshot = {
        'snapshot': {
          'meta': {
            'node_fields': ['type', 'name', 'id', 'self_size', 'retained_size', 'dominator', 'edge_count'],
            'node_types': [this._nodeTypesArray, 'string', 'number', 'number', 'number', 'number', 'number'],
            'edge_fields': ['type', 'name_or_index', 'to_node'],
            'edge_types': [this._edgeTypesArray, 'string_or_number', 'node']
          }
        },

        'nodes': [],
        'edges': [],
        'strings': []
      };

      for (var i = 0; i < this._nodes.length; ++i)
        this._nodes[i]._serialize(rawSnapshot);

      rawSnapshot.strings = this._strings.slice();
      var meta = rawSnapshot.snapshot.meta;
      rawSnapshot.snapshot.edge_count = rawSnapshot.edges.length / meta.edge_fields.length;
      rawSnapshot.snapshot.node_count = rawSnapshot.nodes.length / meta.node_fields.length;
      return rawSnapshot;
    },

    createJSHeapSnapshot: function() {
      var parsedSnapshot = ProfilerTestRunner._postprocessHeapSnapshotMock(this.generateSnapshot());
      return new HeapSnapshotWorker.JSHeapSnapshot(parsedSnapshot, new HeapSnapshotWorker.HeapSnapshotProgress());
    },

    _registerNode: function(node) {
      this._nodes.push(node);
      return this._nodes.length - 1;
    },

    lookupNodeType: function(typeName) {
      if (typeName === undefined)
        throw new Error('wrong node type: ' + typeName);

      if (!(typeName in this._nodeTypesMap))
        throw new Error('wrong node type name: ' + typeName);

      return this._nodeTypesMap[typeName];
    },

    lookupEdgeType: function(typeName) {
      if (!(typeName in this._edgeTypesMap))
        throw new Error('wrong edge type name: ' + typeName);

      return this._edgeTypesMap[typeName];
    },

    lookupOrAddString: function(string) {
      if (string in this._string2id)
        return this._string2id[string];

      this._string2id[string] = this._strings.length;
      this._strings.push(string);
      return this._strings.length - 1;
    }
  };

  ProfilerTestRunner.createHeapSnapshot = function(instanceCount, firstId) {
    var seed = 881669;

    function pseudoRandom(limit) {
      seed = seed * 355109 + 153763 >> 2 & 65535;
      return seed % limit;
    }

    var builder = new ProfilerTestRunner.HeapSnapshotBuilder();
    var rootNode = builder.rootNode;
    var gcRootsNode = new ProfilerTestRunner.HeapNode('(GC roots)', 0, ProfilerTestRunner.HeapNode.Type.synthetic);
    rootNode.linkNode(gcRootsNode, ProfilerTestRunner.HeapEdge.Type.element);
    var windowNode = new ProfilerTestRunner.HeapNode('Window', 20);
    rootNode.linkNode(windowNode, ProfilerTestRunner.HeapEdge.Type.shortcut);
    gcRootsNode.linkNode(windowNode, ProfilerTestRunner.HeapEdge.Type.element);

    for (var i = 0; i < instanceCount; ++i) {
      var sizeOfB = pseudoRandom(20) + 1;
      var nodeB = new ProfilerTestRunner.HeapNode('B', sizeOfB, undefined, firstId++);
      windowNode.linkNode(nodeB, ProfilerTestRunner.HeapEdge.Type.element);
      var sizeOfA = pseudoRandom(50) + 1;
      var nodeA = new ProfilerTestRunner.HeapNode('A', sizeOfA, undefined, firstId++);
      nodeB.linkNode(nodeA, ProfilerTestRunner.HeapEdge.Type.property, 'a');
      nodeA.linkNode(nodeA, ProfilerTestRunner.HeapEdge.Type.property, 'a');
    }

    return builder.generateSnapshot();
  };
};

ProfilerTestRunner.createHeapSnapshotMockFactories();

ProfilerTestRunner.startProfilerTest = function(callback) {
  TestRunner.addResult('Profiler was enabled.');
  ProfilerTestRunner._panelReset = TestRunner.override(UI.panels.heap_profiler, '_reset', function() {}, true);
  TestRunner.addSniffer(Profiler.HeapSnapshotView.prototype, 'show', ProfilerTestRunner._snapshotViewShown, true);

  Profiler.HeapSnapshotContainmentDataGrid.prototype.defaultPopulateCount = function() {
    return 10;
  };

  Profiler.HeapSnapshotConstructorsDataGrid.prototype.defaultPopulateCount = function() {
    return 10;
  };

  Profiler.HeapSnapshotDiffDataGrid.prototype.defaultPopulateCount = function() {
    return 5;
  };

  TestRunner.addResult('Detailed heap profiles were enabled.');
  TestRunner.safeWrap(callback)();
};

ProfilerTestRunner.completeProfilerTest = function() {
  TestRunner.addResult('');
  TestRunner.addResult('Profiler was disabled.');
  TestRunner.completeTest();
};

ProfilerTestRunner.runHeapSnapshotTestSuite = function(testSuite) {
  var testSuiteTests = testSuite.slice();
  var completeTestStack;

  function runner() {
    if (!testSuiteTests.length) {
      if (completeTestStack)
        TestRunner.addResult('FAIL: test already completed at ' + completeTestStack);

      ProfilerTestRunner.completeProfilerTest();
      completeTestStack = new Error().stack;
      return;
    }

    var nextTest = testSuiteTests.shift();
    TestRunner.addResult('');
    TestRunner.addResult(
        'Running: ' +
        /function\s([^(]*)/.exec(nextTest)[1]);
    ProfilerTestRunner._panelReset.call(UI.panels.heap_profiler);
    TestRunner.safeWrap(nextTest)(runner, runner);
  }

  ProfilerTestRunner.startProfilerTest(runner);
};

ProfilerTestRunner.assertColumnContentsEqual = function(reference, actual) {
  var length = Math.min(reference.length, actual.length);

  for (var i = 0; i < length; ++i)
    TestRunner.assertEquals(reference[i], actual[i], 'row ' + i);

  if (reference.length > length)
    TestRunner.addResult('extra rows in reference array:\n' + reference.slice(length).join('\n'));
  else if (actual.length > length)
    TestRunner.addResult('extra rows in actual array:\n' + actual.slice(length).join('\n'));
};

ProfilerTestRunner.checkArrayIsSorted = function(contents, sortType, sortOrder) {
  function simpleComparator(a, b) {
    return (a < b ? -1 : (a > b ? 1 : 0));
  }

  function parseSize(size) {
    return parseInt(size.replace(/[\xa0,]/g, ''), 10);
  }

  var extractor = {
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

  var acceptableComparisonResult;

  if (sortOrder === DataGrid.DataGrid.Order.Ascending) {
    acceptableComparisonResult = -1;
  } else if (sortOrder === DataGrid.DataGrid.Order.Descending) {
    acceptableComparisonResult = 1;
  } else {
    TestRunner.addResult('Invalid sort order: ' + sortOrder);
    return;
  }

  for (var i = 0; i < contents.length - 1; ++i) {
    var a = extractor(contents[i]);
    var b = extractor(contents[i + 1]);
    var result = simpleComparator(a, b);

    if (result !== 0 && result !== acceptableComparisonResult) {
      TestRunner.addResult(
          'Elements ' + i + ' and ' + (i + 1) + ' are out of order: ' + a + ' ' + b + ' (' + sortOrder + ')');
    }
  }
};

ProfilerTestRunner.clickColumn = function(column, callback) {
  callback = TestRunner.safeWrap(callback);
  var cell = this._currentGrid()._headerTableHeaders[column.id];

  var event = {
    target: {
      enclosingNodeOrSelfWithNodeName: function() {
        return cell;
      }
    }
  };

  function sortingComplete() {
    ProfilerTestRunner._currentGrid().removeEventListener(
        Profiler.HeapSnapshotSortableDataGrid.Events.SortingComplete, sortingComplete, this);
    TestRunner.assertEquals(column.id, this._currentGrid().sortColumnId(), 'unexpected sorting');
    column.sort = this._currentGrid().sortOrder();

    function callCallback() {
      callback(column);
    }

    setTimeout(callCallback, 0);
  }

  ProfilerTestRunner._currentGrid().addEventListener(
      Profiler.HeapSnapshotSortableDataGrid.Events.SortingComplete, sortingComplete, this);
  this._currentGrid()._clickInHeaderCell(event);
};

ProfilerTestRunner.clickRowAndGetRetainers = function(row, callback) {
  callback = TestRunner.safeWrap(callback);

  var event = {
    target: {
      enclosingNodeOrSelfWithNodeName: function() {
        return row._element;
      },

      selectedNode: row
    }
  };

  this._currentGrid()._mouseDownInDataTable(event);
  var rootNode = ProfilerTestRunner.currentProfileView()._retainmentDataGrid.rootNode();
  rootNode.once(Profiler.HeapSnapshotGridNode.Events.PopulateComplete).then(() => callback(rootNode));
};

ProfilerTestRunner.clickShowMoreButton = function(buttonName, row, callback) {
  callback = TestRunner.safeWrap(callback);
  var parent = row.parent;
  parent.once(Profiler.HeapSnapshotGridNode.Events.PopulateComplete).then(() => setTimeout(() => callback(parent), 0));
  row[buttonName].click();
};

ProfilerTestRunner.columnContents = function(column, row) {
  this._currentGrid().updateVisibleNodes();
  var columnOrdinal = ProfilerTestRunner.viewColumns().indexOf(column);
  var result = [];
  var parent = row || this._currentGrid().rootNode();

  for (var node = parent.children[0]; node; node = node.traverseNextNode(true, parent, true)) {
    if (!node.selectable)
      continue;

    var content = node.element().children[columnOrdinal];

    if (content.firstElementChild)
      content = content.firstElementChild;

    result.push(content.textContent);
  }

  return result;
};

ProfilerTestRunner.countDataRows = function(row, filter) {
  var result = 0;

  filter = filter || function(node) {
    return node.selectable;
  };

  for (var node = row.children[0]; node; node = node.traverseNextNode(true, row, true)) {
    if (filter(node))
      ++result;
  }

  return result;
};

ProfilerTestRunner.expandRow = function(row, callback) {
  callback = TestRunner.safeWrap(callback);
  row.once(Profiler.HeapSnapshotGridNode.Events.PopulateComplete).then(() => setTimeout(() => callback(row), 0));

  (function expand() {
    if (row.hasChildren())
      row.expand();
    else
      setTimeout(expand, 0);
  })();
};

ProfilerTestRunner.findAndExpandGCRoots = function(callback) {
  ProfilerTestRunner.findAndExpandRow('(GC roots)', callback);
};

ProfilerTestRunner.findAndExpandWindow = function(callback) {
  ProfilerTestRunner.findAndExpandRow('Window', callback);
};

ProfilerTestRunner.findAndExpandRow = function(name, callback) {
  callback = TestRunner.safeWrap(callback);
  var row = ProfilerTestRunner.findRow(name);
  TestRunner.assertEquals(true, !!row, '"' + name + '" row');
  ProfilerTestRunner.expandRow(row, callback);
};

ProfilerTestRunner.findButtonsNode = function(row, startNode) {
  for (var node = startNode || row.children[0]; node; node = node.traverseNextNode(true, row, true)) {
    if (!node.selectable && node.showNext)
      return node;
  }

  return null;
};

ProfilerTestRunner.findRow = function(name, parent) {
  function matcher(x) {
    return x._name === name;
  }

  return ProfilerTestRunner.findMatchingRow(matcher, parent);
};

ProfilerTestRunner.findMatchingRow = function(matcher, parent) {
  parent = parent || this._currentGrid().rootNode();

  for (var node = parent.children[0]; node; node = node.traverseNextNode(true, parent, true)) {
    if (matcher(node))
      return node;
  }

  return null;
};

ProfilerTestRunner.switchToView = function(title, callback) {
  callback = TestRunner.safeWrap(callback);
  var view = UI.panels.heap_profiler.visibleView;
  view._changePerspectiveAndWait(title).then(callback);
  ProfilerTestRunner._currentGrid().scrollContainer.style.height = '10000px';
};

ProfilerTestRunner.takeAndOpenSnapshot = function(generator, callback) {
  callback = TestRunner.safeWrap(callback);
  var snapshot = generator();
  var profileType = Profiler.ProfileTypeRegistry.instance.heapSnapshotProfileType;

  function pushGeneratedSnapshot(reportProgress) {
    if (reportProgress) {
      profileType._reportHeapSnapshotProgress({data: {done: 50, total: 100, finished: false}});

      profileType._reportHeapSnapshotProgress({data: {done: 100, total: 100, finished: true}});
    }

    snapshot.snapshot.typeId = 'HEAP';

    profileType._addHeapSnapshotChunk({data: JSON.stringify(snapshot)});

    return Promise.resolve();
  }

  TestRunner.override(TestRunner.HeapProfilerAgent, 'takeHeapSnapshot', pushGeneratedSnapshot);
  ProfilerTestRunner._takeAndOpenSnapshotCallback = callback;
  profileType._takeHeapSnapshot();
};

ProfilerTestRunner.viewColumns = function() {
  return ProfilerTestRunner._currentGrid()._columnsArray;
};

ProfilerTestRunner.currentProfileView = function() {
  return UI.panels.heap_profiler.visibleView;
};

ProfilerTestRunner._currentGrid = function() {
  return this.currentProfileView()._dataGrid;
};

ProfilerTestRunner._snapshotViewShown = function() {
  if (ProfilerTestRunner._takeAndOpenSnapshotCallback) {
    var callback = ProfilerTestRunner._takeAndOpenSnapshotCallback;
    ProfilerTestRunner._takeAndOpenSnapshotCallback = null;
    var dataGrid = this._dataGrid;

    function sortingComplete() {
      dataGrid.removeEventListener(Profiler.HeapSnapshotSortableDataGrid.Events.SortingComplete, sortingComplete, null);
      callback();
    }

    dataGrid.addEventListener(Profiler.HeapSnapshotSortableDataGrid.Events.SortingComplete, sortingComplete, null);
  }
};
