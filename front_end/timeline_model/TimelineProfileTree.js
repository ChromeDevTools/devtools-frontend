// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.TimelineProfileTree = {};

/**
 * @unrestricted
 */
WebInspector.TimelineProfileTree.Node = class {
  constructor() {
    /** @type {number} */
    this.totalTime;
    /** @type {number} */
    this.selfTime;
    /** @type {string} */
    this.id;
    /** @type {!WebInspector.TracingModel.Event} */
    this.event;
    /** @type {?Map<string|symbol,!WebInspector.TimelineProfileTree.Node>} */
    this.children;
    /** @type {?WebInspector.TimelineProfileTree.Node} */
    this.parent;

    /** @type {string} */
    this._groupId = '';
    this._isGroupNode = false;
  }

  /**
   * @return {boolean}
   */
  isGroupNode() {
    return this._isGroupNode;
  }
};

/**
 * @param {!Array<!WebInspector.TracingModel.Event>} events
 * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
 * @param {number} startTime
 * @param {number} endTime
 * @param {function(!WebInspector.TracingModel.Event):string=} eventGroupIdCallback
 * @return {!WebInspector.TimelineProfileTree.Node}
 */
WebInspector.TimelineProfileTree.buildTopDown = function(events, filters, startTime, endTime, eventGroupIdCallback) {
  // Temporarily deposit a big enough value that exceeds the max recording time.
  var /** @const */ initialTime = 1e7;
  var root = new WebInspector.TimelineProfileTree.Node();
  root.totalTime = initialTime;
  root.selfTime = initialTime;
  root.children = /** @type {!Map<string, !WebInspector.TimelineProfileTree.Node>} */ (new Map());
  var parent = root;

  /**
   * @param {!WebInspector.TracingModel.Event} e
   */
  function onStartEvent(e) {
    if (!WebInspector.TimelineModel.isVisible(filters, e))
      return;
    var time = e.endTime ? Math.min(endTime, e.endTime) - Math.max(startTime, e.startTime) : 0;
    var groupId = eventGroupIdCallback ? eventGroupIdCallback(e) : Symbol('uniqueGroupId');
    var id = eventGroupIdCallback ? WebInspector.TimelineProfileTree._eventId(e) : Symbol('uniqueEventId');
    if (typeof groupId === 'string' && typeof id === 'string')
      id += '/' + groupId;
    if (!parent.children)
      parent.children = /** @type {!Map<string,!WebInspector.TimelineProfileTree.Node>} */ (new Map());
    var node = parent.children.get(id);
    if (node) {
      node.selfTime += time;
      node.totalTime += time;
    } else {
      node = new WebInspector.TimelineProfileTree.Node();
      node.totalTime = time;
      node.selfTime = time;
      node.parent = parent;
      node.id = id;
      node.event = e;
      node._groupId = groupId;
      parent.children.set(id, node);
    }
    parent.selfTime -= time;
    if (parent.selfTime < 0) {
      console.log('Error: Negative self of ' + parent.selfTime, e);
      parent.selfTime = 0;
    }
    if (e.endTime)
      parent = node;
  }

  /**
   * @param {!WebInspector.TracingModel.Event} e
   */
  function onEndEvent(e) {
    if (!WebInspector.TimelineModel.isVisible(filters, e))
      return;
    parent = parent.parent;
  }

  var instantEventCallback = eventGroupIdCallback ? undefined : onStartEvent;  // Ignore instant events when aggregating.
  WebInspector.TimelineModel.forEachEvent(events, onStartEvent, onEndEvent, instantEventCallback, startTime, endTime);
  root.totalTime -= root.selfTime;
  root.selfTime = 0;
  return root;
};

/**
 * @param {!WebInspector.TimelineProfileTree.Node} topDownTree
 * @return {!WebInspector.TimelineProfileTree.Node}
 */
WebInspector.TimelineProfileTree.buildBottomUp = function(topDownTree) {
  var buRoot = new WebInspector.TimelineProfileTree.Node();
  var aggregator = new WebInspector.TimelineAggregator();
  buRoot.selfTime = 0;
  buRoot.totalTime = 0;
  /** @type {!Map<string, !WebInspector.TimelineProfileTree.Node>} */
  buRoot.children = new Map();
  var nodesOnStack = /** @type {!Set<string>} */ (new Set());
  if (topDownTree.children)
    topDownTree.children.forEach(processNode);
  buRoot.totalTime = topDownTree.totalTime;

  /**
   * @param {!WebInspector.TimelineProfileTree.Node} tdNode
   */
  function processNode(tdNode) {
    var buParent = typeof tdNode._groupId === 'string' ? aggregator.groupNodeForId(tdNode._groupId, tdNode.event) : buRoot;
    if (buParent !== buRoot && !buParent.parent) {
      buRoot.children.set(buParent.id, buParent);
      buParent.parent = buRoot;
    }
    appendNode(tdNode, buParent);
    var hadNode = nodesOnStack.has(tdNode.id);
    if (!hadNode)
      nodesOnStack.add(tdNode.id);
    if (tdNode.children)
      tdNode.children.forEach(processNode);
    if (!hadNode)
      nodesOnStack.delete(tdNode.id);
  }

  /**
   * @param {!WebInspector.TimelineProfileTree.Node} tdNode
   * @param {!WebInspector.TimelineProfileTree.Node} buParent
   */
  function appendNode(tdNode, buParent) {
    var selfTime = tdNode.selfTime;
    var totalTime = tdNode.totalTime;
    buParent.selfTime += selfTime;
    buParent.totalTime += selfTime;
    while (tdNode.parent) {
      if (!buParent.children)
        buParent.children = /** @type {!Map<string,!WebInspector.TimelineProfileTree.Node>} */ (new Map());
      var id = tdNode.id;
      var buNode = buParent.children.get(id);
      if (!buNode) {
        buNode = new WebInspector.TimelineProfileTree.Node();
        buNode.selfTime = selfTime;
        buNode.totalTime = totalTime;
        buNode.event = tdNode.event;
        buNode.id = id;
        buNode.parent = buParent;
        buParent.children.set(id, buNode);
      } else {
        buNode.selfTime += selfTime;
        if (!nodesOnStack.has(id))
          buNode.totalTime += totalTime;
      }
      tdNode = tdNode.parent;
      buParent = buNode;
    }
  }

  // Purge zero self time nodes.
  var rootChildren = buRoot.children;
  for (var item of rootChildren.entries()) {
    if (item[1].selfTime === 0)
      rootChildren.delete(/** @type {string} */ (item[0]));
  }

  return buRoot;
};

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {?string}
 */
WebInspector.TimelineProfileTree.eventURL = function(event) {
  var data = event.args['data'] || event.args['beginData'];
  if (data && data['url'])
    return data['url'];
  var frame = WebInspector.TimelineProfileTree.eventStackFrame(event);
  while (frame) {
    var url = frame['url'];
    if (url)
      return url;
    frame = frame.parent;
  }
  return null;
};

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {?Protocol.Runtime.CallFrame}
 */
WebInspector.TimelineProfileTree.eventStackFrame = function(event) {
  if (event.name === WebInspector.TimelineModel.RecordType.JSFrame)
    return /** @type {?Protocol.Runtime.CallFrame} */ (event.args['data'] || null);
  return WebInspector.TimelineData.forEvent(event).topFrame();
};

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {string}
 */
WebInspector.TimelineProfileTree._eventId = function(event) {
  if (event.name !== WebInspector.TimelineModel.RecordType.JSFrame)
    return event.name;
  const frame = event.args['data'];
  const location = frame['scriptId'] || frame['url'] || '';
  const functionName = frame['functionName'];
  const name = WebInspector.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame)
      ? WebInspector.TimelineJSProfileProcessor.nativeGroup(functionName) || functionName
      : functionName;
  return `f:${name}@${location}`;
};

/**
 * @unrestricted
 */
WebInspector.TimelineAggregator = class {
  constructor() {
    /** @type {!Map<string, !WebInspector.TimelineProfileTree.Node>} */
    this._groupNodes = new Map();
  }

  /**
   * @param {!WebInspector.TimelineProfileTree.Node} root
   * @return {!WebInspector.TimelineProfileTree.Node}
   */
  performGrouping(root) {
    for (var node of root.children.values()) {
      var groupNode = this.groupNodeForId(node._groupId, node.event);
      groupNode.parent = root;
      groupNode.selfTime += node.selfTime;
      groupNode.totalTime += node.totalTime;
      groupNode.children.set(node.id, node);
      node.parent = root;
    }
    root.children = this._groupNodes;
    return root;
  }

  /**
   * @param {string} groupId
   * @param {!WebInspector.TracingModel.Event} event
   * @return {!WebInspector.TimelineProfileTree.Node}
   */
  groupNodeForId(groupId, event) {
    var node = this._groupNodes.get(groupId);
    return node || this._buildGroupNode(groupId, event);
  }

  /**
   * @param {string} id
   * @param {!WebInspector.TracingModel.Event} event
   * @return {!WebInspector.TimelineProfileTree.Node}
   */
  _buildGroupNode(id, event) {
    var groupNode = new WebInspector.TimelineProfileTree.Node();
    groupNode.id = id;
    groupNode.selfTime = 0;
    groupNode.totalTime = 0;
    groupNode.children = new Map();
    groupNode.event = event;
    groupNode._isGroupNode = true;
    this._groupNodes.set(id, groupNode);
    return groupNode;
  }
};

WebInspector.TimelineAggregator._groupNodeFlag = Symbol('groupNode');
