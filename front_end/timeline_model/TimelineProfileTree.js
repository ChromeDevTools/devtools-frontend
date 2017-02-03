// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

TimelineModel.TimelineProfileTree = class {
  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   * @param {number} startTime
   * @param {number} endTime
   * @param {function(!SDK.TracingModel.Event):string=} eventGroupIdCallback
   */
  constructor(events, filters, startTime, endTime, eventGroupIdCallback) {
    this._events = events;
    this._filter = e => TimelineModel.TimelineModel.isVisible(filters, e);
    this._startTime = startTime;
    this._endTime = endTime;
    this._eventGroupIdCallback = eventGroupIdCallback;
  }

  /**
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  bottomUpTreeRoot() {
    return new TimelineModel.TimelineProfileTree.BottomUpTreeRootNode(this);
  }
};

/**
 * @unrestricted
 */
TimelineModel.TimelineProfileTree.Node = class {
  /**
   * @param {string} id
   * @param {?SDK.TracingModel.Event} event
   */
  constructor(id, event) {
    /** @type {number} */
    this.totalTime = 0;
    /** @type {number} */
    this.selfTime = 0;
    /** @type {string} */
    this.id = id;
    /** @type {?SDK.TracingModel.Event} */
    this.event = event;
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

  /**
   * @return {boolean}
   */
  hasChildren() {
    throw 'Not implemented';
  }

  /**
   * @return {!Map<string, !TimelineModel.TimelineProfileTree.Node>}
   */
  children() {
    throw 'Not implemented';
  }
};

TimelineModel.TimelineProfileTree.TopDownNode = class extends TimelineModel.TimelineProfileTree.Node {
  /**
   * @param {string} id
   * @param {?SDK.TracingModel.Event} event
   */
  constructor(id, event) {
    super(id, event);
    /** @type {!Map<string, !TimelineModel.TimelineProfileTree.Node>} */
    this._children = new Map();
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return !!this._children.size;
  }

  /**
   * @override
   * @return {!Map<string, !TimelineModel.TimelineProfileTree.Node>}
   */
  children() {
    return this._children;
  }
};

/**
 * @param {!Array<!SDK.TracingModel.Event>} events
 * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
 * @param {number} startTime
 * @param {number} endTime
 * @param {function(!SDK.TracingModel.Event):string=} eventGroupIdCallback
 * @return {!TimelineModel.TimelineProfileTree.Node}
 */
TimelineModel.TimelineProfileTree.buildTopDown = function(events, filters, startTime, endTime, eventGroupIdCallback) {
  // Temporarily deposit a big enough value that exceeds the max recording time.
  var /** @const */ initialTime = 1e7;
  var root = new TimelineModel.TimelineProfileTree.TopDownNode('', null);
  root.totalTime = initialTime;
  root.selfTime = initialTime;
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
    var node = parent.children().get(id);
    if (node) {
      node.selfTime += time;
      node.totalTime += time;
    } else {
      node = new TimelineModel.TimelineProfileTree.TopDownNode(id, e);
      node.totalTime = time;
      node.selfTime = time;
      node.parent = parent;
      node._groupId = groupId;
      parent.children().set(id, node);
    }
    parent.selfTime -= time;
    if (parent.selfTime < 0) {
      console.error('Error: Negative self of ' + parent.selfTime, e);
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

  var instantEventCallback =
      eventGroupIdCallback ? undefined : onStartEvent;  // Ignore instant events when aggregating.
  TimelineModel.TimelineModel.forEachEvent(events, onStartEvent, onEndEvent, instantEventCallback, startTime, endTime);
  root.totalTime -= root.selfTime;
  root.selfTime = 0;
  return root;
};

TimelineModel.TimelineProfileTree.BottomUpTreeRootNode = class extends TimelineModel.TimelineProfileTree.Node {
  /**
   * @param {!TimelineModel.TimelineProfileTree} tree
   */
  constructor(tree) {
    super('', null);
    this._tree = tree;
    this.totalTime = this._tree._endTime - this._tree._startTime;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return true;
  }

  /**
   * @override
   * @return {!Map<string, !TimelineModel.TimelineProfileTree.Node>}
   */
  children() {
    return this._grouppedTopNodes();
  }

  /**
   * @return {!Map<string, !TimelineModel.TimelineProfileTree.Node>}
   */
  _ungrouppedTopNodes() {
    var root = this;
    var startTime = this._tree._startTime;
    var endTime = this._tree._endTime;
    /** @type {!Map<string, !TimelineModel.TimelineProfileTree.Node>} */
    var nodeById = new Map();
    /** @type {!Array<number>} */
    var selfTimeStack = [endTime - startTime];
    /** @type {!Array<boolean>} */
    var firstNodeStack = [];
    /** @type {!Map<string, number>} */
    var totalTimeById = new Map();
    TimelineModel.TimelineModel.forEachEvent(
        this._tree._events, onStartEvent, onEndEvent, undefined, startTime, endTime, this._tree._filter);

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      var duration = Math.min(e.endTime, endTime) - Math.max(e.startTime, startTime);
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      var id = TimelineModel.TimelineProfileTree._eventId(e);
      var noNodeOnStack = !totalTimeById.has(id);
      if (noNodeOnStack)
        totalTimeById.set(id, duration);
      firstNodeStack.push(noNodeOnStack);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      var id = TimelineModel.TimelineProfileTree._eventId(e);
      var node = nodeById.get(id);
      if (!node) {
        node = new TimelineModel.TimelineProfileTree.BottomUpTreeNode(root._tree, id, e, true, root);
        nodeById.set(id, node);
      }
      node.selfTime += selfTimeStack.pop();
      if (firstNodeStack.pop()) {
        node.totalTime += totalTimeById.get(id);
        totalTimeById.delete(id);
      }
    }

    this.selfTime = selfTimeStack.pop();
    for (var pair of nodeById) {
      if (pair[1].selfTime <= 0)
        nodeById.delete(/** @type {string} */ (pair[0]));
    }
    return nodeById;
  }

  /**
   * @return {!Map<string, !TimelineModel.TimelineProfileTree.Node>}
   */
  _grouppedTopNodes() {
    var flatNodes = this._ungrouppedTopNodes();
    var groupNodes = new Map();
    for (var node of flatNodes.values()) {
      var groupId = this._tree._eventGroupIdCallback(/** @type {!SDK.TracingModel.Event} */ (node.event));
      if (typeof groupId !== 'string')
        return flatNodes;
      var groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new TimelineModel.TimelineProfileTree.BottomUpTreeGroupNode(
            groupId, /** @type {!SDK.TracingModel.Event} */ (node.event));
        groupNode.parent = this;
        groupNodes.set(groupId, groupNode);
      }
      groupNode.addChild(node);
      node.parent = groupNode;
    }
    return groupNodes;
  }
};

TimelineModel.TimelineProfileTree.BottomUpTreeGroupNode = class extends TimelineModel.TimelineProfileTree.Node {
  /**
   * @param {string} id
   * @param {!SDK.TracingModel.Event} event
   */
  constructor(id, event) {
    super(id, event);
    this._children = new Map();
    this._isGroupNode = true;
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.BottomUpTreeNode} child
   */
  addChild(child) {
    this._children.set(child.id, child);
    this.selfTime += child.selfTime;
    this.totalTime += child.selfTime;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return true;
  }

  /**
   * @override
   * @return {!Map<string, !TimelineModel.TimelineProfileTree.Node>}
   */
  children() {
    return this._children;
  }
};

TimelineModel.TimelineProfileTree.BottomUpTreeNode = class extends TimelineModel.TimelineProfileTree.Node {
  /**
   * @param {!TimelineModel.TimelineProfileTree} tree
   * @param {string} id
   * @param {!SDK.TracingModel.Event} event
   * @param {boolean} hasChildren
   * @param {!TimelineModel.TimelineProfileTree.Node} parent
   */
  constructor(tree, id, event, hasChildren, parent) {
    super(id, event);
    this.parent = parent;
    this._tree = tree;
    this._depth = (parent._depth || 0) + 1;
    this._cachedChildren = null;
    this._hasChildren = hasChildren;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return this._hasChildren;
  }

  /**
   * @override
   * @return {!Map<string, !TimelineModel.TimelineProfileTree.Node>}
   */
  children() {
    if (this._cachedChildren)
      return this._cachedChildren;
    /** @type {!Array<number>} */
    var selfTimeStack = [0];
    /** @type {!Array<string>} */
    var eventIdStack = [];
    /** @type {!Array<!SDK.TracingModel.Event>} */
    var eventStack = [];
    /** @type {!Map<string, !TimelineModel.TimelineProfileTree.Node>} */
    var nodeById = new Map();
    var startTime = this._tree._startTime;
    var endTime = this._tree._endTime;
    var lastTimeMarker = startTime;
    var self = this;
    TimelineModel.TimelineModel.forEachEvent(
        this._tree._events, onStartEvent, onEndEvent, undefined, startTime, endTime, this._tree._filter);

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      var duration = Math.min(e.endTime, endTime) - Math.max(e.startTime, startTime);
      if (duration < 0)
        console.assert(false, 'Negative duration of an event');
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      var id = TimelineModel.TimelineProfileTree._eventId(e);
      eventIdStack.push(id);
      eventStack.push(e);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      var selfTime = selfTimeStack.pop();
      var id = eventIdStack.pop();
      eventStack.pop();
      for (var node = self; node._depth > 1; node = node.parent) {
        if (node.id !== eventIdStack[eventIdStack.length + 1 - node._depth])
          return;
      }
      if (node.id !== id || eventIdStack.length < self._depth)
        return;
      var childId = eventIdStack[eventIdStack.length - self._depth];
      var node = nodeById.get(childId);
      if (!node) {
        var event = eventStack[eventStack.length - self._depth];
        var hasChildren = eventStack.length > self._depth;
        node = new TimelineModel.TimelineProfileTree.BottomUpTreeNode(self._tree, childId, event, hasChildren, self);
        nodeById.set(childId, node);
      }
      var totalTime = Math.min(e.endTime, endTime) - Math.max(e.startTime, lastTimeMarker);
      node.selfTime += selfTime;
      node.totalTime += totalTime;
      lastTimeMarker = Math.min(e.endTime, endTime);
    }

    this._cachedChildren = nodeById;
    return nodeById;
  }
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
  const name = TimelineModel.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame) ?
      TimelineModel.TimelineJSProfileProcessor.nativeGroup(functionName) || functionName :
      functionName;
  return `f:${name}@${location}`;
};

/**
 * @unrestricted
 */
TimelineModel.TimelineAggregator = class {
  constructor() {
    /** @type {!Map<string, !TimelineModel.TimelineProfileTree.TopDownNode>} */
    this._groupNodes = new Map();
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} root
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  performGrouping(root) {
    for (var node of root.children().values()) {
      var groupNode = this.groupNodeForId(node._groupId, /** @type {!SDK.TracingModel.Event} */ (node.event));
      groupNode.parent = root;
      groupNode.selfTime += node.selfTime;
      groupNode.totalTime += node.totalTime;
      groupNode.children().set(node.id, node);
      node.parent = root;
    }
    root._children = this._groupNodes;
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
    var groupNode = new TimelineModel.TimelineProfileTree.TopDownNode(id, event);
    groupNode.selfTime = 0;
    groupNode.totalTime = 0;
    groupNode._isGroupNode = true;
    this._groupNodes.set(id, groupNode);
    return groupNode;
  }
};
