// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TraceEngine from '../../models/trace/trace.js';

import {TimelineJSProfileProcessor} from './TimelineJSProfile.js';
import {EventOnTimelineData, RecordType, TimelineModelImpl} from './TimelineModel.js';
import {type TimelineModelFilter} from './TimelineModelFilter.js';

export class Node {
  totalTime: number;
  selfTime: number;
  id: string|symbol;
  event: TraceEngine.Legacy.CompatibleTraceEvent|null;
  parent!: Node|null;
  groupId: string;
  isGroupNodeInternal: boolean;
  depth: number;

  constructor(id: string|symbol, event: TraceEngine.Legacy.CompatibleTraceEvent|null) {
    this.totalTime = 0;
    this.selfTime = 0;
    this.id = id;
    this.event = event;

    this.groupId = '';
    this.isGroupNodeInternal = false;
    this.depth = 0;
  }

  isGroupNode(): boolean {
    return this.isGroupNodeInternal;
  }

  hasChildren(): boolean {
    throw 'Not implemented';
  }

  setHasChildren(_value: boolean): void {
    throw 'Not implemented';
  }
  /**
   * Returns the direct descendants of this node.
   * @returns a map with ordered <nodeId, Node> tuples.
   */
  children(): ChildrenCache {
    throw 'Not implemented';
  }

  searchTree(matchFunction: (arg0: TraceEngine.Legacy.CompatibleTraceEvent) => boolean, results?: Node[]): Node[] {
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
  root: TopDownRootNode|null;
  private hasChildrenInternal: boolean;
  childrenInternal: ChildrenCache|null;
  override parent: TopDownNode|null;

  constructor(id: string|symbol, event: TraceEngine.Legacy.CompatibleTraceEvent|null, parent: TopDownNode|null) {
    super(id, event);
    this.root = parent && parent.root;
    this.hasChildrenInternal = false;
    this.childrenInternal = null;
    this.parent = parent;
  }

  override hasChildren(): boolean {
    return this.hasChildrenInternal;
  }

  override setHasChildren(value: boolean): void {
    this.hasChildrenInternal = value;
  }

  override children(): ChildrenCache {
    return this.childrenInternal || this.buildChildren();
  }

  private buildChildren(): ChildrenCache {
    // Tracks the ancestor path of this node, includes the current node.
    const path: TopDownNode[] = [];
    for (let node: TopDownNode = (this as TopDownNode); node.parent && !node.isGroupNode(); node = node.parent) {
      path.push((node as TopDownNode));
    }
    path.reverse();
    const children: ChildrenCache = new Map();
    const self = this;
    const root = this.root;
    if (!root) {
      this.childrenInternal = children;
      return this.childrenInternal;
    }
    const startTime = root.startTime;
    const endTime = root.endTime;
    const instantEventCallback = root.doNotAggregate ? onInstantEvent : undefined;
    const eventIdCallback = root.doNotAggregate ? undefined : generateEventID;
    const eventGroupIdCallback = root.getEventGroupIdCallback();
    let depth = 0;
    // The amount of ancestors found to match this node's ancestors
    // during the event tree walk.
    let matchedDepth = 0;
    let currentDirectChild: Node|null = null;

    // Walk on the full event tree to find this node's children.
    TimelineModelImpl.forEachEvent(
        root.events, onStartEvent, onEndEvent, instantEventCallback, startTime, endTime, root.filter, false);

    function onStartEvent(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      const {startTime: currentStartTime, endTime: currentEndTime} = TraceEngine.Legacy.timesForEventInMilliseconds(e);

      ++depth;
      if (depth > path.length + 2) {
        return;
      }
      if (!matchPath(e)) {
        return;
      }
      const actualEndTime = currentEndTime !== undefined ? Math.min(currentEndTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(startTime, currentStartTime);
      if (duration < 0) {
        console.error('Negative event duration');
      }
      processEvent(e, duration);
    }

    function onInstantEvent(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      ++depth;
      if (matchedDepth === path.length && depth <= path.length + 2) {
        processEvent(e, 0);
      }
      --depth;
    }

    /**
     * Creates a child node.
     */
    function processEvent(e: TraceEngine.Legacy.CompatibleTraceEvent, duration: number): void {
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
        node.groupId = groupId;
        children.set(id, node);
      }
      node.selfTime += duration;
      node.totalTime += duration;
      currentDirectChild = node;
    }

    /**
     * Checks if the path of ancestors of an event matches the path of
     * ancestors of the current node. In other words, checks if an event
     * is a child of this node. As the check is done, the partial result
     * is cached on `matchedDepth`, for future checks.
     */
    function matchPath(e: TraceEngine.Legacy.CompatibleTraceEvent): boolean {
      const {endTime} = TraceEngine.Legacy.timesForEventInMilliseconds(e);
      if (matchedDepth === path.length) {
        return true;
      }
      if (matchedDepth !== depth - 1) {
        return false;
      }
      if (!endTime) {
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

    function onEndEvent(_e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      --depth;
      if (matchedDepth > depth) {
        matchedDepth = depth;
      }
    }

    this.childrenInternal = children;
    return children;
  }

  getRoot(): TopDownRootNode|null {
    return this.root;
  }
}

export class TopDownRootNode extends TopDownNode {
  readonly filter: (e: TraceEngine.Legacy.CompatibleTraceEvent) => boolean;
  readonly events: TraceEngine.Legacy.CompatibleTraceEvent[];
  readonly startTime: number;
  readonly endTime: number;
  eventGroupIdCallback: ((arg0: TraceEngine.Legacy.CompatibleTraceEvent) => string)|null|undefined;
  readonly doNotAggregate: boolean|undefined;
  override totalTime: number;
  override selfTime: number;

  constructor(
      events: TraceEngine.Legacy.CompatibleTraceEvent[], filters: TimelineModelFilter[], startTime: number,
      endTime: number, doNotAggregate?: boolean,
      eventGroupIdCallback?: ((arg0: TraceEngine.Legacy.CompatibleTraceEvent) => string)|null) {
    super('', null, null);
    this.root = this;
    this.events = events;
    this.filter = (e: TraceEngine.Legacy.CompatibleTraceEvent): boolean => filters.every(f => f.accept(e));
    this.startTime = startTime;
    this.endTime = endTime;
    this.eventGroupIdCallback = eventGroupIdCallback;
    this.doNotAggregate = doNotAggregate;
    this.totalTime = endTime - startTime;
    this.selfTime = this.totalTime;
  }

  override children(): ChildrenCache {
    return this.childrenInternal || this.grouppedTopNodes();
  }

  private grouppedTopNodes(): ChildrenCache {
    const flatNodes = super.children();
    for (const node of flatNodes.values()) {
      this.selfTime -= node.totalTime;
    }
    if (!this.eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = new Map<string, GroupNode>();
    for (const node of flatNodes.values()) {
      const groupId = this.eventGroupIdCallback((node.event as TraceEngine.Legacy.Event));
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, (node.event as TraceEngine.Legacy.Event));
        groupNodes.set(groupId, groupNode);
      }
      groupNode.addChild(node as BottomUpNode, node.selfTime, node.totalTime);
    }
    this.childrenInternal = groupNodes;
    return groupNodes;
  }

  getEventGroupIdCallback(): ((arg0: TraceEngine.Legacy.CompatibleTraceEvent) => string)|null|undefined {
    return this.eventGroupIdCallback;
  }
}

export class BottomUpRootNode extends Node {
  private childrenInternal: ChildrenCache|null;
  readonly events: TraceEngine.Legacy.CompatibleTraceEvent[];
  private textFilter: TimelineModelFilter;
  readonly filter: (e: TraceEngine.Legacy.CompatibleTraceEvent) => boolean;
  readonly startTime: number;
  readonly endTime: number;
  private eventGroupIdCallback: ((arg0: TraceEngine.Legacy.Event) => string)|null;
  override totalTime: number;

  constructor(
      events: TraceEngine.Legacy.CompatibleTraceEvent[], textFilter: TimelineModelFilter,
      filters: TimelineModelFilter[], startTime: number, endTime: number,
      eventGroupIdCallback: ((arg0: TraceEngine.Legacy.Event) => string)|null) {
    super('', null);
    this.childrenInternal = null;
    this.events = events;
    this.textFilter = textFilter;
    this.filter = (e: TraceEngine.Legacy.CompatibleTraceEvent): boolean => filters.every(f => f.accept(e));
    this.startTime = startTime;
    this.endTime = endTime;
    this.eventGroupIdCallback = eventGroupIdCallback;
    this.totalTime = endTime - startTime;
  }

  override hasChildren(): boolean {
    return true;
  }

  filterChildren(children: ChildrenCache): ChildrenCache {
    for (const [id, child] of children) {
      if (child.event && !this.textFilter.accept(child.event)) {
        children.delete((id as string | symbol));
      }
    }
    return children;
  }

  override children(): ChildrenCache {
    if (!this.childrenInternal) {
      this.childrenInternal = this.filterChildren(this.grouppedTopNodes());
    }
    return this.childrenInternal;
  }

  private ungrouppedTopNodes(): ChildrenCache {
    const root = this;
    const startTime = this.startTime;
    const endTime = this.endTime;
    const nodeById = new Map<string, Node>();
    const selfTimeStack: number[] = [endTime - startTime];
    const firstNodeStack: boolean[] = [];
    const totalTimeById = new Map<string, number>();
    TimelineModelImpl.forEachEvent(
        this.events, onStartEvent, onEndEvent, undefined, startTime, endTime, this.filter, false);

    function onStartEvent(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      const {startTime: currentStartTime, endTime: currentEndTime} = TraceEngine.Legacy.timesForEventInMilliseconds(e);
      const actualEndTime = currentEndTime !== undefined ? Math.min(currentEndTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(currentStartTime, startTime);
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      const id = generateEventID(e);
      const noNodeOnStack = !totalTimeById.has(id);
      if (noNodeOnStack) {
        totalTimeById.set(id, duration);
      }
      firstNodeStack.push(noNodeOnStack);
    }

    function onEndEvent(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      const id = generateEventID(e);
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

  private grouppedTopNodes(): ChildrenCache {
    const flatNodes = this.ungrouppedTopNodes();
    if (!this.eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = new Map<string, GroupNode>();
    for (const node of flatNodes.values()) {
      const groupId = this.eventGroupIdCallback((node.event as TraceEngine.Legacy.Event));
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, (node.event as TraceEngine.Legacy.Event));
        groupNodes.set(groupId, groupNode);
      }
      groupNode.addChild(node as BottomUpNode, node.selfTime, node.selfTime);
    }
    return groupNodes;
  }
}

export class GroupNode extends Node {
  private readonly childrenInternal: ChildrenCache;
  override isGroupNodeInternal: boolean;

  constructor(id: string, parent: BottomUpRootNode|TopDownRootNode, event: TraceEngine.Legacy.Event) {
    super(id, event);
    this.childrenInternal = new Map();
    this.parent = parent;
    this.isGroupNodeInternal = true;
  }

  addChild(child: BottomUpNode, selfTime: number, totalTime: number): void {
    this.childrenInternal.set(child.id, child);
    this.selfTime += selfTime;
    this.totalTime += totalTime;
    child.parent = this;
  }

  override hasChildren(): boolean {
    return true;
  }

  override children(): ChildrenCache {
    return this.childrenInternal;
  }
}

export class BottomUpNode extends Node {
  override parent: Node;
  private root: BottomUpRootNode;
  override depth: number;
  private cachedChildren: ChildrenCache|null;
  private hasChildrenInternal: boolean;

  constructor(
      root: BottomUpRootNode, id: string, event: TraceEngine.Legacy.CompatibleTraceEvent, hasChildren: boolean,
      parent: Node) {
    super(id, event);
    this.parent = parent;
    this.root = root;
    this.depth = (parent.depth || 0) + 1;
    this.cachedChildren = null;
    this.hasChildrenInternal = hasChildren;
  }

  override hasChildren(): boolean {
    return this.hasChildrenInternal;
  }

  override setHasChildren(value: boolean): void {
    this.hasChildrenInternal = value;
  }

  override children(): ChildrenCache {
    if (this.cachedChildren) {
      return this.cachedChildren;
    }
    const selfTimeStack: number[] = [0];
    const eventIdStack: string[] = [];
    const eventStack: TraceEngine.Legacy.CompatibleTraceEvent[] = [];
    const nodeById = new Map<string, BottomUpNode>();
    const startTime = this.root.startTime;
    const endTime = this.root.endTime;
    let lastTimeMarker: number = startTime;
    const self = this;
    TimelineModelImpl.forEachEvent(
        this.root.events, onStartEvent, onEndEvent, undefined, startTime, endTime, this.root.filter, false);

    function onStartEvent(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      const {startTime: currentStartTime, endTime: currentEndTime} = TraceEngine.Legacy.timesForEventInMilliseconds(e);
      const actualEndTime = currentEndTime !== undefined ? Math.min(currentEndTime, endTime) : endTime;
      const duration = actualEndTime - Math.max(currentStartTime, startTime);
      if (duration < 0) {
        console.assert(false, 'Negative duration of an event');
      }
      selfTimeStack[selfTimeStack.length - 1] -= duration;
      selfTimeStack.push(duration);
      const id = generateEventID(e);
      eventIdStack.push(id);
      eventStack.push(e);
    }

    function onEndEvent(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      const {startTime: currentStartTime, endTime: currentEndTime} = TraceEngine.Legacy.timesForEventInMilliseconds(e);
      const selfTime = selfTimeStack.pop();
      const id = eventIdStack.pop();
      eventStack.pop();
      let node;
      for (node = self; node.depth > 1; node = node.parent) {
        if (node.id !== eventIdStack[eventIdStack.length + 1 - node.depth]) {
          return;
        }
      }
      if (node.id !== id || eventIdStack.length < self.depth) {
        return;
      }
      const childId = eventIdStack[eventIdStack.length - self.depth];
      node = nodeById.get(childId);
      if (!node) {
        const event = eventStack[eventStack.length - self.depth];
        const hasChildren = eventStack.length > self.depth;
        node = new BottomUpNode(self.root, childId, event, hasChildren, self);
        nodeById.set(childId, node);
      }
      const actualEndTime = currentEndTime !== undefined ? Math.min(currentEndTime, endTime) : endTime;
      const totalTime = actualEndTime - Math.max(currentStartTime, lastTimeMarker);
      node.selfTime += selfTime || 0;
      node.totalTime += totalTime;
      lastTimeMarker = actualEndTime;
    }

    this.cachedChildren = this.root.filterChildren(nodeById);
    return this.cachedChildren;
  }

  override searchTree(matchFunction: (arg0: TraceEngine.Legacy.CompatibleTraceEvent) => boolean, results?: Node[]):
      Node[] {
    results = results || [];
    if (this.event && matchFunction(this.event)) {
      results.push(this);
    }
    return results;
  }
}

export function eventURL(event: TraceEngine.Legacy.Event|
                         TraceEngine.Types.TraceEvents.TraceEventData): Platform.DevToolsPath.UrlString|null {
  const data = event.args['data'] || event.args['beginData'];
  if (data && data['url']) {
    return data['url'];
  }
  let frame = eventStackFrame(event);
  while (frame) {
    const url = frame['url'] as Platform.DevToolsPath.UrlString;
    if (url) {
      return url;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    frame = ((frame as any).parent);
  }
  return null;
}

export function eventStackFrame(event: TraceEngine.Legacy.Event|
                                TraceEngine.Types.TraceEvents.TraceEventData): Protocol.Runtime.CallFrame|null {
  if (TraceEngine.Legacy.eventIsFromNewEngine(event) && TraceEngine.Types.TraceEvents.isProfileCall(event)) {
    return event.callFrame;
  }
  if (TimelineModelImpl.isJsFrameEvent(event)) {
    return event.args['data'] || null as Protocol.Runtime.CallFrame | null;
  }
  return EventOnTimelineData.forEvent(event).topFrame();
}

export function generateEventID(event: TraceEngine.Legacy.CompatibleTraceEvent): string {
  if (TraceEngine.Legacy.eventIsFromNewEngine(event) && TraceEngine.Types.TraceEvents.isProfileCall(event)) {
    const name = TimelineJSProfileProcessor.isNativeRuntimeFrame(event.callFrame) ?
        TimelineJSProfileProcessor.nativeGroup(event.callFrame.functionName) :
        event.callFrame.functionName;
    const location = event.callFrame.scriptId || event.callFrame.url || '';
    return `f:${name}@${location}`;
  }

  if (event.name === RecordType.TimeStamp) {
    return `${event.name}:${event.args.data.message}`;
  }

  if (!TimelineModelImpl.isJsFrameEvent(event)) {
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
