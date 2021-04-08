// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as SDK from '../../core/sdk/sdk.js';

import {TimelineJSProfileProcessor} from './TimelineJSProfile.js';
import {RecordType, TimelineData, TimelineModelImpl} from './TimelineModel.js';
import type {TimelineModelFilter} from './TimelineModelFilter.js';

export class Node {
  totalTime: number;
  selfTime: number;
  id: string|symbol;
  event: SDK.TracingModel.Event|null;
  parent!: Node|null;
  _groupId: string;
  _isGroupNode: boolean;
  _depth: number;

  constructor(id: string|symbol, event: SDK.TracingModel.Event|null) {
    this.totalTime = 0;
    this.selfTime = 0;
    this.id = id;
    this.event = event;

    this._groupId = '';
    this._isGroupNode = false;
    this._depth = 0;
  }

  isGroupNode(): boolean {
    return this._isGroupNode;
  }

  hasChildren(): boolean {
    throw 'Not implemented';
  }

  setHasChildren(_value: boolean): void {
    throw 'Not implemented';
  }

  children(): ChildrenCache {
    throw 'Not implemented';
  }

  searchTree(matchFunction: (arg0: SDK.TracingModel.Event) => boolean, results?: Node[]): Node[] {
    results = results || [];
    if (this.event && matchFunction(this.event)) {
      results.push(this);
    }
    for (const child of this.children().values()) {
      child.searchTree(matchFunction, results);
    }
    return results;
  }
}

export class TopDownNode extends Node {
  _root: TopDownRootNode|null;
  _hasChildren: boolean;
  _children: ChildrenCache|null;
  parent: TopDownNode|null;

  constructor(id: string|symbol, event: SDK.TracingModel.Event|null, parent: TopDownNode|null) {
    super(id, event);
    this._root = parent && parent._root;
    this._hasChildren = false;
    this._children = null;
    this.parent = parent;
  }

  hasChildren(): boolean {
    return this._hasChildren;
  }

  setHasChildren(value: boolean): void {
    this._hasChildren = value;
  }

  children(): ChildrenCache {
    return this._children || this._buildChildren();
  }

  _buildChildren(): ChildrenCache {
    const path: TopDownNode[] = [];
    for (let node: TopDownNode = (this as TopDownNode); node.parent && !node._isGroupNode; node = node.parent) {
      path.push((node as TopDownNode));
    }
    path.reverse();
    const children: ChildrenCache = new Map();
    const self = this;
    const root = this._root;
    if (!root) {
      this._children = children;
      return this._children;
    }
    const startTime = root._startTime;
    const endTime = root._endTime;
    const instantEventCallback = root._doNotAggregate ? onInstantEvent : undefined;
    const eventIdCallback = root._doNotAggregate ? undefined : _eventId;
    const eventGroupIdCallback = root._eventGroupIdCallback;
    let depth = 0;
    let matchedDepth = 0;
    let currentDirectChild: Node|null = null;
    TimelineModelImpl.forEachEvent(
        root._events, onStartEvent, onEndEvent, instantEventCallback, startTime, endTime, root._filter);

    function onStartEvent(e: SDK.TracingModel.Event): void {
      ++depth;
      if (depth > path.length + 2) {
        return;
      }
      if (!matchPath(e)) {
        return;
      }
      const actualEndTime = e.endTime !== undefined ? Math.min(e.endTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(startTime, e.startTime);
      if (duration < 0) {
        console.error('Negative event duration');
      }
      processEvent(e, duration);
    }

    function onInstantEvent(e: SDK.TracingModel.Event): void {
      ++depth;
      if (matchedDepth === path.length && depth <= path.length + 2) {
        processEvent(e, 0);
      }
      --depth;
    }

    function processEvent(e: SDK.TracingModel.Event, duration: number): void {
      if (depth === path.length + 2) {
        if (!currentDirectChild) {
          return;
        }
        currentDirectChild.setHasChildren(true);
        currentDirectChild.selfTime -= duration;
        return;
      }
      let id;
      let groupId = '';
      if (!eventIdCallback) {
        id = Symbol('uniqueId');
      } else {
        id = eventIdCallback(e);
        groupId = eventGroupIdCallback ? eventGroupIdCallback(e) : '';
        if (groupId) {
          id += '/' + groupId;
        }
      }
      let node = children.get(id);
      if (!node) {
        node = new TopDownNode(id, e, self);
        node._groupId = groupId;
        children.set(id, node);
      }
      node.selfTime += duration;
      node.totalTime += duration;
      currentDirectChild = node;
    }

    function matchPath(e: SDK.TracingModel.Event): boolean {
      if (matchedDepth === path.length) {
        return true;
      }
      if (matchedDepth !== depth - 1) {
        return false;
      }
      if (!e.endTime) {
        return false;
      }
      if (!eventIdCallback) {
        if (e === path[matchedDepth].event) {
          ++matchedDepth;
        }
        return false;
      }
      let id = eventIdCallback(e);
      const groupId = eventGroupIdCallback ? eventGroupIdCallback(e) : '';
      if (groupId) {
        id += '/' + groupId;
      }
      if (id === path[matchedDepth].id) {
        ++matchedDepth;
      }
      return false;
    }

    function onEndEvent(_e: SDK.TracingModel.Event): void {
      --depth;
      if (matchedDepth > depth) {
        matchedDepth = depth;
      }
    }

    this._children = children;
    return children;
  }
}

export class TopDownRootNode extends TopDownNode {
  _root: this;
  _events: SDK.TracingModel.Event[];
  _filter: (e: SDK.TracingModel.Event) => boolean;
  _startTime: number;
  _endTime: number;
  _eventGroupIdCallback: ((arg0: SDK.TracingModel.Event) => string)|null|undefined;
  _doNotAggregate: boolean|undefined;
  totalTime: number;
  selfTime: number;

  constructor(
      events: SDK.TracingModel.Event[], filters: TimelineModelFilter[], startTime: number, endTime: number,
      doNotAggregate?: boolean, eventGroupIdCallback?: ((arg0: SDK.TracingModel.Event) => string)|null) {
    super('', null, null);
    this._root = this;
    this._events = events;
    this._filter = (e: SDK.TracingModel.Event): boolean => filters.every(f => f.accept(e));
    this._startTime = startTime;
    this._endTime = endTime;
    this._eventGroupIdCallback = eventGroupIdCallback;
    this._doNotAggregate = doNotAggregate;
    this.totalTime = endTime - startTime;
    this.selfTime = this.totalTime;
  }

  children(): ChildrenCache {
    return this._children || this._grouppedTopNodes();
  }

  _grouppedTopNodes(): ChildrenCache {
    const flatNodes = super.children();
    for (const node of flatNodes.values()) {
      this.selfTime -= node.totalTime;
    }
    if (!this._eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = new Map<string, GroupNode>();
    for (const node of flatNodes.values()) {
      const groupId = this._eventGroupIdCallback((node.event as SDK.TracingModel.Event));
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, (node.event as SDK.TracingModel.Event));
        groupNodes.set(groupId, groupNode);
      }
      groupNode.addChild(node as BottomUpNode, node.selfTime, node.totalTime);
    }
    this._children = groupNodes;
    return groupNodes;
  }
}

export class BottomUpRootNode extends Node {
  _children: ChildrenCache|null;
  _events: SDK.TracingModel.Event[];
  _textFilter: TimelineModelFilter;
  _filter: (e: SDK.TracingModel.Event) => boolean;
  _startTime: number;
  _endTime: number;
  _eventGroupIdCallback: ((arg0: SDK.TracingModel.Event) => string)|null;
  totalTime: number;

  constructor(
      events: SDK.TracingModel.Event[], textFilter: TimelineModelFilter, filters: TimelineModelFilter[],
      startTime: number, endTime: number, eventGroupIdCallback: ((arg0: SDK.TracingModel.Event) => string)|null) {
    super('', null);
    this._children = null;
    this._events = events;
    this._textFilter = textFilter;
    this._filter = (e: SDK.TracingModel.Event): boolean => filters.every(f => f.accept(e));
    this._startTime = startTime;
    this._endTime = endTime;
    this._eventGroupIdCallback = eventGroupIdCallback;
    this.totalTime = endTime - startTime;
  }

  hasChildren(): boolean {
    return true;
  }

  _filterChildren(children: ChildrenCache): ChildrenCache {
    for (const [id, child] of children) {
      if (child.event && !this._textFilter.accept(child.event)) {
        children.delete((id as string | symbol));
      }
    }
    return children;
  }

  children(): ChildrenCache {
    if (!this._children) {
      this._children = this._filterChildren(this._grouppedTopNodes());
    }
    return this._children;
  }

  _ungrouppedTopNodes(): ChildrenCache {
    const root = this;
    const startTime = this._startTime;
    const endTime = this._endTime;
    const nodeById = new Map<string, Node>();
    const selfTimeStack: number[] = [endTime - startTime];
    const firstNodeStack: boolean[] = [];
    const totalTimeById = new Map<string, number>();
    TimelineModelImpl.forEachEvent(this._events, onStartEvent, onEndEvent, undefined, startTime, endTime, this._filter);

    function onStartEvent(e: SDK.TracingModel.Event): void {
      const actualEndTime = e.endTime !== undefined ? Math.min(e.endTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(e.startTime, startTime);
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      const id = _eventId(e);
      const noNodeOnStack = !totalTimeById.has(id);
      if (noNodeOnStack) {
        totalTimeById.set(id, duration);
      }
      firstNodeStack.push(noNodeOnStack);
    }

    function onEndEvent(e: SDK.TracingModel.Event): void {
      const id = _eventId(e);
      let node = nodeById.get(id);
      if (!node) {
        node = new BottomUpNode(root, id, e, false, root);
        nodeById.set(id, node);
      }
      node.selfTime += selfTimeStack.pop() || 0;
      if (firstNodeStack.pop()) {
        node.totalTime += totalTimeById.get(id) || 0;
        totalTimeById.delete(id);
      }
      if (firstNodeStack.length) {
        node.setHasChildren(true);
      }
    }

    this.selfTime = selfTimeStack.pop() || 0;
    for (const pair of nodeById) {
      if (pair[1].selfTime <= 0) {
        nodeById.delete((pair[0] as string));
      }
    }
    return nodeById;
  }

  _grouppedTopNodes(): ChildrenCache {
    const flatNodes = this._ungrouppedTopNodes();
    if (!this._eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = new Map<string, GroupNode>();
    for (const node of flatNodes.values()) {
      const groupId = this._eventGroupIdCallback((node.event as SDK.TracingModel.Event));
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, (node.event as SDK.TracingModel.Event));
        groupNodes.set(groupId, groupNode);
      }
      groupNode.addChild(node as BottomUpNode, node.selfTime, node.selfTime);
    }
    return groupNodes;
  }
}

export class GroupNode extends Node {
  _children: ChildrenCache;
  _isGroupNode: boolean;

  constructor(id: string, parent: BottomUpRootNode|TopDownRootNode, event: SDK.TracingModel.Event) {
    super(id, event);
    this._children = new Map();
    this.parent = parent;
    this._isGroupNode = true;
  }

  addChild(child: BottomUpNode, selfTime: number, totalTime: number): void {
    this._children.set(child.id, child);
    this.selfTime += selfTime;
    this.totalTime += totalTime;
    child.parent = this;
  }

  hasChildren(): boolean {
    return true;
  }

  children(): ChildrenCache {
    return this._children;
  }
}

export class BottomUpNode extends Node {
  parent: Node;
  _root: BottomUpRootNode;
  _depth: number;
  _cachedChildren: ChildrenCache|null;
  _hasChildren: boolean;

  constructor(root: BottomUpRootNode, id: string, event: SDK.TracingModel.Event, hasChildren: boolean, parent: Node) {
    super(id, event);
    this.parent = parent;
    this._root = root;
    this._depth = (parent._depth || 0) + 1;
    this._cachedChildren = null;
    this._hasChildren = hasChildren;
  }

  hasChildren(): boolean {
    return this._hasChildren;
  }

  setHasChildren(value: boolean): void {
    this._hasChildren = value;
  }

  children(): ChildrenCache {
    if (this._cachedChildren) {
      return this._cachedChildren;
    }
    const selfTimeStack: number[] = [0];
    const eventIdStack: string[] = [];
    const eventStack: SDK.TracingModel.Event[] = [];
    const nodeById = new Map<string, BottomUpNode>();
    const startTime = this._root._startTime;
    const endTime = this._root._endTime;
    let lastTimeMarker: number = startTime;
    const self = this;
    TimelineModelImpl.forEachEvent(
        this._root._events, onStartEvent, onEndEvent, undefined, startTime, endTime, this._root._filter);

    function onStartEvent(e: SDK.TracingModel.Event): void {
      const actualEndTime = e.endTime !== undefined ? Math.min(e.endTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(e.startTime, startTime);
      if (duration < 0) {
        console.assert(false, 'Negative duration of an event');
      }
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      const id = _eventId(e);
      eventIdStack.push(id);
      eventStack.push(e);
    }

    function onEndEvent(e: SDK.TracingModel.Event): void {
      const selfTime = selfTimeStack.pop();
      const id = eventIdStack.pop();
      eventStack.pop();
      let node;
      for (node = self; node._depth > 1; node = node.parent) {
        if (node.id !== eventIdStack[eventIdStack.length + 1 - node._depth]) {
          return;
        }
      }
      if (node.id !== id || eventIdStack.length < self._depth) {
        return;
      }
      const childId = eventIdStack[eventIdStack.length - self._depth];
      node = nodeById.get(childId);
      if (!node) {
        const event = eventStack[eventStack.length - self._depth];
        const hasChildren = eventStack.length > self._depth;
        node = new BottomUpNode(self._root, childId, event, hasChildren, self);
        nodeById.set(childId, node);
      }
      const actualEndTime = e.endTime !== undefined ? Math.min(e.endTime, endTime) : endTime;
      const totalTime = actualEndTime - Math.max(e.startTime, lastTimeMarker);
      node.selfTime += selfTime || 0;
      node.totalTime += totalTime;
      lastTimeMarker = actualEndTime;
    }

    this._cachedChildren = this._root._filterChildren(nodeById);
    return this._cachedChildren;
  }

  searchTree(matchFunction: (arg0: SDK.TracingModel.Event) => boolean, results?: Node[]): Node[] {
    results = results || [];
    if (this.event && matchFunction(this.event)) {
      results.push(this);
    }
    return results;
  }
}

export function eventURL(event: SDK.TracingModel.Event): string|null {
  const data = event.args['data'] || event.args['beginData'];
  if (data && data['url']) {
    return data['url'];
  }
  let frame = eventStackFrame(event);
  while (frame) {
    const url = frame['url'];
    if (url) {
      return url;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    frame = ((frame as any).parent);
  }
  return null;
}

export function eventStackFrame(event: SDK.TracingModel.Event): Protocol.Runtime.CallFrame|null {
  if (event.name === RecordType.JSFrame) {
    return event.args['data'] || null as Protocol.Runtime.CallFrame | null;
  }
  return TimelineData.forEvent(event).topFrame();
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _eventId(event: SDK.TracingModel.Event): string {
  if (event.name === RecordType.TimeStamp) {
    return `${event.name}:${event.args.data.message}`;
  }
  if (event.name !== RecordType.JSFrame) {
    return event.name;
  }
  const frame = event.args['data'];
  const location = frame['scriptId'] || frame['url'] || '';
  const functionName = frame['functionName'];
  const name = TimelineJSProfileProcessor.isNativeRuntimeFrame(frame) ?
      TimelineJSProfileProcessor.nativeGroup(functionName) || functionName :
      `${functionName}:${frame['lineNumber']}:${frame['columnNumber']}`;
  return `f:${name}@${location}`;
}

export type ChildrenCache = Map<string|symbol, Node>;
