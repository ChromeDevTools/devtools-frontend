// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {TimelineJSProfileProcessor} from './TimelineJSProfile.js';
import type {TraceFilter} from './TraceFilter.js';

export class Node {
  totalTime: number;
  selfTime: number;
  id: string|symbol;
  event: Types.Events.Event|null;
  parent!: Node|null;
  groupId: string;
  isGroupNodeInternal: boolean;
  depth: number;

  constructor(id: string|symbol, event: Types.Events.Event|null) {
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

  searchTree(matchFunction: (arg0: Types.Events.Event) => boolean, results?: Node[]): Node[] {
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

  constructor(id: string|symbol, event: Types.Events.Event|null, parent: TopDownNode|null) {
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
    const instantEventCallback = (root.doNotAggregate || root.includeInstantEvents) ? onInstantEvent : undefined;
    const eventIdCallback = root.doNotAggregate ? undefined : generateEventID;
    const eventGroupIdCallback = root.getEventGroupIdCallback();
    let depth = 0;
    // The amount of ancestors found to match this node's ancestors
    // during the event tree walk.
    let matchedDepth = 0;
    let currentDirectChild: Node|null = null;

    // Walk on the full event tree to find this node's children.
    Helpers.Trace.forEachEvent(
        root.events,
        {
          onStartEvent,
          onEndEvent,
          onInstantEvent: instantEventCallback,
          startTime: Helpers.Timing.millisecondsToMicroseconds(startTime),
          endTime: Helpers.Timing.millisecondsToMicroseconds(endTime),
          eventFilter: root.filter,
          ignoreAsyncEvents: false,
        },
    );

    function onStartEvent(e: Types.Events.Event): void {
      const {startTime: currentStartTime, endTime: currentEndTime} = Helpers.Timing.eventTimingsMilliSeconds(e);

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

    function onInstantEvent(e: Types.Events.Event): void {
      ++depth;
      if (matchedDepth === path.length && depth <= path.length + 2) {
        processEvent(e, 0);
      }
      --depth;
    }

    /**
     * Creates a child node.
     */
    function processEvent(e: Types.Events.Event, duration: number): void {
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
    function matchPath(e: Types.Events.Event): boolean {
      const {endTime} = Helpers.Timing.eventTimingsMilliSeconds(e);
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

    function onEndEvent(): void {
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
  readonly filter: (e: Types.Events.Event) => boolean;
  /** This is all events passed in to create the tree, and it's very likely that it included events outside of the passed startTime/endTime as that filtering is done in `Helpers.Trace.forEachEvent` */
  readonly events: Types.Events.Event[];
  readonly startTime: Types.Timing.MilliSeconds;
  readonly endTime: Types.Timing.MilliSeconds;
  eventGroupIdCallback: ((arg0: Types.Events.Event) => string)|null|undefined;
  /** Default behavior is to aggregate similar trace events into one Node based on generateEventID(), eventGroupIdCallback(), etc. Set true to keep nodes 1:1 with events. */
  readonly doNotAggregate: boolean|undefined;
  readonly includeInstantEvents?: boolean;
  override totalTime: number;
  override selfTime: number;

  constructor(
      events: Types.Events.Event[], filters: TraceFilter[], startTime: Types.Timing.MilliSeconds,
      endTime: Types.Timing.MilliSeconds, doNotAggregate?: boolean,
      eventGroupIdCallback?: ((arg0: Types.Events.Event) => string)|null, includeInstantEvents?: boolean) {
    super('', null, null);
    this.root = this;
    this.events = events;
    this.filter = (e: Types.Events.Event): boolean => filters.every(f => f.accept(e));
    this.startTime = startTime;
    this.endTime = endTime;
    this.eventGroupIdCallback = eventGroupIdCallback;
    this.doNotAggregate = doNotAggregate;
    this.includeInstantEvents = includeInstantEvents;

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
      if (!node.event) {
        continue;
      }
      const groupId = this.eventGroupIdCallback(node.event);
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, node.event);
        groupNodes.set(groupId, groupNode);
      }
      groupNode.addChild(node as BottomUpNode, node.selfTime, node.totalTime);
    }
    this.childrenInternal = groupNodes;
    return groupNodes;
  }

  getEventGroupIdCallback(): ((arg0: Types.Events.Event) => string)|null|undefined {
    return this.eventGroupIdCallback;
  }
}

export class BottomUpRootNode extends Node {
  private childrenInternal: ChildrenCache|null;
  readonly events: Types.Events.Event[];
  private textFilter: TraceFilter;
  readonly filter: (e: Types.Events.Event) => boolean;
  readonly startTime: Types.Timing.MilliSeconds;
  readonly endTime: Types.Timing.MilliSeconds;
  private eventGroupIdCallback: ((arg0: Types.Events.Event) => string)|null;
  override totalTime: number;

  constructor(
      events: Types.Events.Event[], textFilter: TraceFilter, filters: TraceFilter[],
      startTime: Types.Timing.MilliSeconds, endTime: Types.Timing.MilliSeconds,
      eventGroupIdCallback: ((arg0: Types.Events.Event) => string)|null) {
    super('', null);
    this.childrenInternal = null;
    this.events = events;
    this.textFilter = textFilter;
    this.filter = (e: Types.Events.Event): boolean => filters.every(f => f.accept(e));
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
      // to provide better context to user only filter first (top) level.
      if (child.event && child.depth <= 1 && !this.textFilter.accept(child.event)) {
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
    Helpers.Trace.forEachEvent(
        this.events,
        {
          onStartEvent,
          onEndEvent,
          startTime: Helpers.Timing.millisecondsToMicroseconds(this.startTime),
          endTime: Helpers.Timing.millisecondsToMicroseconds(this.endTime),
          eventFilter: this.filter,
          ignoreAsyncEvents: false,
        },
    );

    function onStartEvent(e: Types.Events.Event): void {
      const {startTime: currentStartTime, endTime: currentEndTime} = Helpers.Timing.eventTimingsMilliSeconds(e);

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

    function onEndEvent(event: Types.Events.Event): void {
      const id = generateEventID(event);
      let node = nodeById.get(id);
      if (!node) {
        node = new BottomUpNode(root, id, event, false, root);
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
      if (!node.event) {
        continue;
      }
      const groupId = this.eventGroupIdCallback(node.event);
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, node.event);
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

  constructor(id: string, parent: BottomUpRootNode|TopDownRootNode, event: Types.Events.Event) {
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

  constructor(root: BottomUpRootNode, id: string, event: Types.Events.Event, hasChildren: boolean, parent: Node) {
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
    const eventStack: Types.Events.Event[] = [];
    const nodeById = new Map<string, BottomUpNode>();
    const startTime = this.root.startTime;
    const endTime = this.root.endTime;
    let lastTimeMarker: number = startTime;
    const self = this;
    Helpers.Trace.forEachEvent(
        this.root.events,
        {
          onStartEvent,
          onEndEvent,
          startTime: Helpers.Timing.millisecondsToMicroseconds(startTime),
          endTime: Helpers.Timing.millisecondsToMicroseconds(endTime),
          eventFilter: this.root.filter,
          ignoreAsyncEvents: false,
        },
    );
    function onStartEvent(e: Types.Events.Event): void {
      const {startTime: currentStartTime, endTime: currentEndTime} = Helpers.Timing.eventTimingsMilliSeconds(e);
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

    function onEndEvent(e: Types.Events.Event): void {
      const {startTime: currentStartTime, endTime: currentEndTime} = Helpers.Timing.eventTimingsMilliSeconds(e);
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

  override searchTree(matchFunction: (arg0: Types.Events.Event) => boolean, results?: Node[]): Node[] {
    results = results || [];
    if (this.event && matchFunction(this.event)) {
      results.push(this);
    }
    return results;
  }
}

export function eventStackFrame(event: Types.Events.Event): Protocol.Runtime.CallFrame|null {
  if (Types.Events.isProfileCall(event)) {
    return event.callFrame;
  }
  const topFrame = event.args?.data?.stackTrace?.[0];
  if (!topFrame) {
    return null;
  }
  return {...topFrame, scriptId: String(topFrame.scriptId) as Protocol.Runtime.ScriptId};
}

export function generateEventID(event: Types.Events.Event): string {
  if (Types.Events.isProfileCall(event)) {
    const name = TimelineJSProfileProcessor.isNativeRuntimeFrame(event.callFrame) ?
        TimelineJSProfileProcessor.nativeGroup(event.callFrame.functionName) :
        event.callFrame.functionName;
    const location = event.callFrame.scriptId || event.callFrame.url || '';
    return `f:${name}@${location}`;
  }

  if (Types.Events.isTimeStamp(event)) {
    return `${event.name}:${event.args.data.message}`;
  }

  return event.name;
}

export type ChildrenCache = Map<string|symbol, Node>;
