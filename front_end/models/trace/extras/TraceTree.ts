// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import * as Helpers from '../helpers/helpers.js';
import {SamplesIntegrator} from '../helpers/SamplesIntegrator.js';
import * as Types from '../types/types.js';

import type {TraceFilter} from './TraceFilter.js';

export class Node {
  /** ms */
  totalTime: number;
  /** ms */
  selfTime: number;
  transferSize: number;
  id: string|symbol;
  /** The first trace event encountered that necessitated the creation of this tree node. */
  event: Types.Events.Event;
  /**
   * All of the trace events associated with this aggregate node.
   * Minor: In the case of Event Log (EventsTimelineTreeView), the node is not aggregate and this will only hold 1 event, the same that's in this.event
   */
  events: Types.Events.Event[];
  parent!: Node|null;
  groupId: string;
  isGroupNodeInternal: boolean;
  depth: number;

  constructor(id: string|symbol, event: Types.Events.Event) {
    this.totalTime = 0;
    this.selfTime = 0;
    this.transferSize = 0;
    this.id = id;
    this.event = event;
    this.events = [event];

    this.groupId = '';
    this.isGroupNodeInternal = false;
    this.depth = 0;
  }

  isGroupNode(): boolean {
    return this.isGroupNodeInternal;
  }

  hasChildren(): boolean {
    throw new Error('Not implemented');
  }

  setHasChildren(_value: boolean): void {
    throw new Error('Not implemented');
  }
  /**
   * Returns the direct descendants of this node.
   * @returns a map with ordered <nodeId, Node> tuples.
   */
  children(): ChildrenCache {
    throw new Error('Not implemented');
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

  constructor(id: string|symbol, event: Types.Events.Event, parent: TopDownNode|null) {
    super(id, event);
    this.root = parent?.root ?? null;
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
    for (let node: TopDownNode = this; node.parent && !node.isGroupNode(); node = node.parent) {
      path.push((node));
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
          startTime: Helpers.Timing.milliToMicro(startTime),
          endTime: Helpers.Timing.milliToMicro(endTime),
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
      } else {
        node.events.push(e);
      }
      node.selfTime += duration;
      node.totalTime += duration;
      if (Types.Events.isReceivedDataEvent(e)) {
        node.transferSize += e.args.data.encodedDataLength;
      }
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
}

export class TopDownRootNode extends TopDownNode {
  readonly filter: (e: Types.Events.Event) => boolean;
  readonly startTime: Types.Timing.Milli;
  readonly endTime: Types.Timing.Milli;
  eventGroupIdCallback: ((arg0: Types.Events.Event) => string)|null|undefined;
  /** Default behavior is to aggregate similar trace events into one Node based on generateEventID(), eventGroupIdCallback(), etc. Set true to keep nodes 1:1 with events. */
  readonly doNotAggregate: boolean|undefined;
  readonly includeInstantEvents?: boolean;
  override totalTime: number;
  override selfTime: number;

  constructor(
      events: Types.Events.Event[],
      {filters, startTime, endTime, doNotAggregate, eventGroupIdCallback, includeInstantEvents}: {
        filters: TraceFilter[],
        startTime: Types.Timing.Milli,
        endTime: Types.Timing.Milli,
        doNotAggregate?: boolean,
        eventGroupIdCallback?: ((arg0: Types.Events.Event) => string)|null,
        includeInstantEvents?: boolean,
      }) {
    super('', events[0], null);
    this.event = events[0];
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
    // FYI tree nodes are built lazily. https://codereview.chromium.org/2674283003
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
      const groupId = this.eventGroupIdCallback(node.event);
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, node.events);
        groupNodes.set(groupId, groupNode);
      } else {
        groupNode.events.push(...node.events);
      }
      groupNode.addChild(node as BottomUpNode, node.selfTime, node.totalTime, node.transferSize);
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
  private textFilter: TraceFilter;
  readonly filter: (e: Types.Events.Event) => boolean;
  readonly startTime: Types.Timing.Milli;
  readonly endTime: Types.Timing.Milli;
  override totalTime: number;
  eventGroupIdCallback: ((arg0: Types.Events.Event) => string)|null|undefined;
  private calculateTransferSize?: boolean;
  private forceGroupIdCallback?: boolean;

  constructor(events: Types.Events.Event[], {
    textFilter,
    filters,
    startTime,
    endTime,
    eventGroupIdCallback,
    calculateTransferSize,
    forceGroupIdCallback,
  }: {
    textFilter: TraceFilter,
    filters: readonly TraceFilter[],
    startTime: Types.Timing.Milli,
    endTime: Types.Timing.Milli,
    eventGroupIdCallback?: ((arg0: Types.Events.Event) => string)|null,
    calculateTransferSize?: boolean,
    /**
     * This forces using `eventGroupIdCallback` in combination with generateEventID
     * to generate the ID of the node.
     *
     * This is used in the ThirdPartyTreeView and BottomUpTreeView, where we want to group all events
     * related to a specific 3P entity together, regardless of the specific event name/type.
     * There are cases where events under the same event name belong to different entities. But, because
     * they get grouped first by event name/type, it throws off the 3P groupBy - grouping events of different
     * 3P entities together.
     */
    forceGroupIdCallback?: boolean,
  }) {
    super('', events[0]);
    this.childrenInternal = null;
    this.events = events;
    this.textFilter = textFilter;
    this.filter = (e: Types.Events.Event): boolean => filters.every(f => f.accept(e));
    this.startTime = startTime;
    this.endTime = endTime;
    this.eventGroupIdCallback = eventGroupIdCallback;
    this.totalTime = endTime - startTime;
    this.calculateTransferSize = calculateTransferSize;
    this.forceGroupIdCallback = forceGroupIdCallback;
  }

  override hasChildren(): boolean {
    return true;
  }

  filterChildren(children: ChildrenCache): ChildrenCache {
    for (const [id, child] of children) {
      // to provide better context to user only filter first (top) level.
      if (child.event && child.depth <= 1 && !this.textFilter.accept(child.event)) {
        children.delete((id));
      }
    }
    return children;
  }

  override children(): ChildrenCache {
    // FYI tree nodes are built lazily. https://codereview.chromium.org/2674283003
    if (!this.childrenInternal) {
      this.childrenInternal = this.filterChildren(this.grouppedTopNodes());
    }
    return this.childrenInternal;
  }

  // If no grouping is applied, the nodes returned here are what's initially shown in the bottom-up view.
  // "No grouping" == no grouping in UI dropdown == no groupingFunction…
  // … HOWEVER, nodes are still aggregated via `generateEventID`, which is ~= the event name.
  private ungroupedTopNodes(): ChildrenCache {
    const root = this;
    const startTime = this.startTime;
    const endTime = this.endTime;
    const nodeById = new Map<string, Node>();
    const selfTimeStack: number[] = [endTime - startTime];
    const firstNodeStack: boolean[] = [];
    const totalTimeById = new Map<string, number>();
    // TODO(paulirish): rename to getGroupNodeId
    const eventGroupIdCallback = this.eventGroupIdCallback;
    const forceGroupIdCallback = this.forceGroupIdCallback;

    // encodedDataLength is provided solely on instant events.
    const sumTransferSizeOfInstantEvent = (e: Types.Events.Event): void => {
      if (Types.Events.isReceivedDataEvent(e)) {
        let id = generateEventID(e);
        if (this.forceGroupIdCallback && this.eventGroupIdCallback) {
          id = `${id}-${this.eventGroupIdCallback(e)}`;
        }
        let node = nodeById.get(id);
        if (!node) {
          node = new BottomUpNode(root, id, e, false, root);
          nodeById.set(id, node);
        } else {
          node.events.push(e);
        }

        // ResourceReceivedData events tally up the transfer size over time, but the
        // ResourceReceiveResponse / ResourceFinish events hold the final result.
        if (e.name === 'ResourceReceivedData') {
          node.transferSize += e.args.data.encodedDataLength;
        } else if (e.args.data.encodedDataLength > 0) {
          // For some reason, ResourceFinish can be zero even if data was sent.
          // Ignore that case.
          // Note: this will count the entire resource size if just the last bit of a
          // request is in view. If it isn't in view, the transfer size is counted
          // gradually, in proportion with the ResourceReceivedData events in the
          // current view.
          node.transferSize = e.args.data.encodedDataLength;
        }
      }
    };

    Helpers.Trace.forEachEvent(
        this.events,
        {
          onStartEvent,
          onEndEvent,
          onInstantEvent: this.calculateTransferSize ? sumTransferSizeOfInstantEvent : undefined,
          startTime: Helpers.Timing.milliToMicro(this.startTime),
          endTime: Helpers.Timing.milliToMicro(this.endTime),
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
      let id = generateEventID(e);
      if (forceGroupIdCallback && eventGroupIdCallback) {
        id = `${id}-${eventGroupIdCallback(e)}`;
      }
      const noNodeOnStack = !totalTimeById.has(id);
      if (noNodeOnStack) {
        totalTimeById.set(id, duration);
      }
      firstNodeStack.push(noNodeOnStack);
    }

    function onEndEvent(event: Types.Events.Event): void {
      let id = generateEventID(event);
      if (forceGroupIdCallback && eventGroupIdCallback) {
        id = `${id}-${eventGroupIdCallback(event)}`;
      }
      let node = nodeById.get(id);
      if (!node) {
        node = new BottomUpNode(root, id, event, false, root);
        nodeById.set(id, node);
      } else {
        node.events.push(event);
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
    // Delete any nodes that have no selfTime (or transferSize, if it's being calculated)
    for (const pair of nodeById) {
      if (pair[1].selfTime <= 0 && (!this.calculateTransferSize || pair[1].transferSize <= 0)) {
        nodeById.delete((pair[0]));
      }
    }
    return nodeById;
  }

  private grouppedTopNodes(): ChildrenCache {
    const flatNodes = this.ungroupedTopNodes();
    if (!this.eventGroupIdCallback) {
      return flatNodes;
    }
    const groupNodes = new Map<string, GroupNode>();
    for (const node of flatNodes.values()) {
      const groupId = this.eventGroupIdCallback(node.event);
      let groupNode = groupNodes.get(groupId);
      if (!groupNode) {
        groupNode = new GroupNode(groupId, this, node.events);
        groupNodes.set(groupId, groupNode);
      } else {
        for (const e of node.events) {
          groupNode.events.push(e);
        }
      }
      groupNode.addChild(node as BottomUpNode, node.selfTime, node.selfTime, node.transferSize);
    }
    return groupNodes;
  }
}

export class GroupNode extends Node {
  private readonly childrenInternal: ChildrenCache;
  override isGroupNodeInternal: boolean;
  override events: Types.Events.Event[];

  constructor(id: string, parent: BottomUpRootNode|TopDownRootNode, events: Types.Events.Event[]) {
    super(id, events[0]);
    this.events = events;
    this.childrenInternal = new Map();
    this.parent = parent;
    this.isGroupNodeInternal = true;
  }

  addChild(child: BottomUpNode, selfTime: number, totalTime: number, transferSize: number): void {
    this.childrenInternal.set(child.id, child);
    this.selfTime += selfTime;
    this.totalTime += totalTime;
    this.transferSize += transferSize;
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
          startTime: Helpers.Timing.milliToMicro(startTime),
          endTime: Helpers.Timing.milliToMicro(endTime),
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
      } else {
        node.events.push(e);
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

// TODO(paulirish): rename to generateNodeId
export function generateEventID(event: Types.Events.Event): string {
  if (Types.Events.isProfileCall(event)) {
    const name = SamplesIntegrator.isNativeRuntimeFrame(event.callFrame) ?
        SamplesIntegrator.nativeGroup(event.callFrame.functionName) :
        event.callFrame.functionName;
    const location = event.callFrame.scriptId || event.callFrame.url || '';
    return `f:${name}@${location}`;
  }

  if (Types.Events.isConsoleTimeStamp(event) && event.args.data) {
    return `${event.name}:${event.args.data.name}`;
  }
  if (Types.Events.isSyntheticNetworkRequest(event) || Types.Events.isReceivedDataEvent(event)) {
    return `req:${event.args.data.requestId}`;
  }

  return event.name;
}

export type ChildrenCache = Map<string|symbol, Node>;
