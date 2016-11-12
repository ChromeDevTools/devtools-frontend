// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

TimelineModel.TimelineProfileTree = {};

/**
 * @unrestricted
 */
TimelineModel.TimelineProfileTree.Node = class {
  constructor() {
    /** @type {number} */
    this.totalTime;
    /** @type {number} */
    this.selfTime;
    /** @type {string} */
    this.id;
    /** @type {!SDK.TracingModel.Event} */
    this.event;
    /** @type {?Map<string|symbol,!TimelineModel.TimelineProfileTree.Node>} */
    this.children;
    /** @type {?TimelineModel.TimelineProfileTree.Node} */
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
 * @param {!Array<!SDK.TracingModel.Event>} events
 * @param {!Array<!TimelineModel.TimelineModel.Filter>} filters
 * @param {number} startTime
 * @param {number} endTime
 * @param {function(!SDK.TracingModel.Event):string=} eventGroupIdCallback
 * @return {!TimelineModel.TimelineProfileTree.Node}
 */
TimelineModel.TimelineProfileTree.buildTopDown = function(events, filters, startTime, endTime, eventGroupIdCallback) {
  // Temporarily deposit a big enough value that exceeds the max recording time.
  var /** @const */ initialTime = 1e7;
  var root = new TimelineModel.TimelineProfileTree.Node();
  root.totalTime = initialTime;
  root.selfTime = initialTime;
  root.children = /** @type {!Map<string, !TimelineModel.TimelineProfileTree.Node>} */ (new Map());
  var parent = root;

  /**
   * @param {!SDK.TracingModel.Event} e
   */
  function onStartEvent(e) {
    if (!TimelineModel.TimelineModel.isVisible(filters, e))
      return;
    var time = e.endTime ? Math.min(endTime, e.endTime) - Math.max(startTime, e.startTime) : 0;
    var groupId = eventGroupIdCallback ? eventGroupIdCallback(e) : Symbol('uniqueGroupId');
    var id = eventGroupIdCallback ? TimelineModel.TimelineProfileTree._eventId(e) : Symbol('uniqueEventId');
    if (typeof groupId === 'string' && typeof id === 'string')
      id += '/' + groupId;
    if (!parent.children)
      parent.children = /** @type {!Map<string,!TimelineModel.TimelineProfileTree.Node>} */ (new Map());
    var node = parent.children.get(id);
    if (node) {
      node.selfTime += time;
      node.totalTime += time;
    } else {
      node = new TimelineModel.TimelineProfileTree.Node();
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
   * @param {!SDK.TracingModel.Event} e
   */
  function onEndEvent(e) {
    if (!TimelineModel.TimelineModel.isVisible(filters, e))
      return;
    parent = parent.parent;
  }

  var instantEventCallback = eventGroupIdCallback ? undefined : onStartEvent;  // Ignore instant events when aggregating.
  TimelineModel.TimelineModel.forEachEvent(events, onStartEvent, onEndEvent, instantEventCallback, startTime, endTime);
  root.totalTime -= root.selfTime;
  root.selfTime = 0;
  return root;
};

/**
 * @param {!TimelineModel.TimelineProfileTree.Node} topDownTree
 * @return {!TimelineModel.TimelineProfileTree.Node}
 */
TimelineModel.TimelineProfileTree.buildBottomUp = function(topDownTree) {
  var buRoot = new TimelineModel.TimelineProfileTree.Node();
  var aggregator = new TimelineModel.TimelineAggregator();
  buRoot.selfTime = 0;
  buRoot.totalTime = 0;
  /** @type {!Map<string, !TimelineModel.TimelineProfileTree.Node>} */
  buRoot.children = new Map();
  var nodesOnStack = /** @type {!Set<string>} */ (new Set());
  if (topDownTree.children)
    topDownTree.children.forEach(processNode);
  buRoot.totalTime = topDownTree.totalTime;

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} tdNode
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
   * @param {!TimelineModel.TimelineProfileTree.Node} tdNode
   * @param {!TimelineModel.TimelineProfileTree.Node} buParent
   */
  function appendNode(tdNode, buParent) {
    var selfTime = tdNode.selfTime;
    var totalTime = tdNode.totalTime;
    buParent.selfTime += selfTime;
    buParent.totalTime += selfTime;
    while (tdNode.parent) {
      if (!buParent.children)
        buParent.children = /** @type {!Map<string,!TimelineModel.TimelineProfileTree.Node>} */ (new Map());
      var id = tdNode.id;
      var buNode = buParent.children.get(id);
      if (!buNode) {
        buNode = new TimelineModel.TimelineProfileTree.Node();
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
 * @param {!SDK.TracingModel.Event} event
 * @return {?string}
 */
TimelineModel.TimelineProfileTree.eventURL = function(event) {
  var data = event.args['data'] || event.args['beginData'];
  if (data && data['url'])
    return data['url'];
  var frame = TimelineModel.TimelineProfileTree.eventStackFrame(event);
  while (frame) {
    var url = frame['url'];
    if (url)
      return url;
    frame = frame.parent;
  }
  return null;
};

/**
 * @param {!SDK.TracingModel.Event} event
 * @return {?Protocol.Runtime.CallFrame}
 */
TimelineModel.TimelineProfileTree.eventStackFrame = function(event) {
  if (event.name === TimelineModel.TimelineModel.RecordType.JSFrame)
    return /** @type {?Protocol.Runtime.CallFrame} */ (event.args['data'] || null);
  return TimelineModel.TimelineData.forEvent(event).topFrame();
};

/**
 * @param {!SDK.TracingModel.Event} event
 * @return {string}
 */
TimelineModel.TimelineProfileTree._eventId = function(event) {
  if (event.name !== TimelineModel.TimelineModel.RecordType.JSFrame)
    return event.name;
  const frame = event.args['data'];
  const location = frame['scriptId'] || frame['url'] || '';
  const functionName = frame['functionName'];
  const name = TimelineModel.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame)
      ? TimelineModel.TimelineJSProfileProcessor.nativeGroup(functionName) || functionName
      : functionName;
  return `f:${name}@${location}`;
};

/**
 * @unrestricted
 */
TimelineModel.TimelineAggregator = class {
  constructor() {
    /** @type {!Map<string, !TimelineModel.TimelineProfileTree.Node>} */
    this._groupNodes = new Map();
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} root
   * @return {!TimelineModel.TimelineProfileTree.Node}
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
   * @param {!SDK.TracingModel.Event} event
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  groupNodeForId(groupId, event) {
    var node = this._groupNodes.get(groupId);
    return node || this._buildGroupNode(groupId, event);
  }

  /**
   * @param {string} id
   * @param {!SDK.TracingModel.Event} event
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  _buildGroupNode(id, event) {
    var groupNode = new TimelineModel.TimelineProfileTree.Node();
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

TimelineModel.TimelineAggregator._groupNodeFlag = Symbol('groupNode');
