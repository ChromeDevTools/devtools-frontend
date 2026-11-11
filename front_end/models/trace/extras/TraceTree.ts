// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import type {TraceFilter} from './TraceFilter.js';

const SamplesIntegrator = Helpers.SamplesIntegrator.SamplesIntegrator;

interface BottomUpIdState {
  id: string;
  node: BottomUpNode|null;
  onStack: boolean;
  pendingTotalTime: Types.Timing.Micro;
}

function buildEventFilter(filters: readonly TraceFilter[]): (e: Types.Events.Event) => boolean {
  if (filters.length === 0) {
    return () => true;
  }
  return e => {
    for (let i = 0; i < filters.length; i++) {
      if (!filters[i].accept(e)) {
        return false;
      }
    }
    return true;
  };
}

function createEventIdCache(): (event: Types.Events.Event) => string {
  // Profile calls for the same frame share one callFrame object, and their ID
  // only depends on its fields. Caching per root avoids rebuilding and
  // re-hashing identical strings across root construction and child expansions.
  const profileCallIdByCallFrame = new Map<Protocol.Runtime.CallFrame, string>();
  return (event: Types.Events.Event): string => {
    if (Types.Events.isProfileCall(event)) {
      let id = profileCallIdByCallFrame.get(event.callFrame);
      if (id === undefined) {
        id = generateEventID(event);
        profileCallIdByCallFrame.set(event.callFrame, id);
      }
      return id;
    }
    return generateEventID(event);
  };
}

export class Node {
  totalTime: Types.Timing.Micro;
  selfTime: Types.Timing.Micro;
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
    this.totalTime = Types.Timing.Micro(0);
    this.selfTime = Types.Timing.Micro(0);
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
    const eventIdCallback = root.doNotAggregate ? undefined : root.eventId;
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
          startTime,
          endTime,
          eventFilter: root.filter,
          ignoreAsyncEvents: false,
        },
    );

    function onStartEvent(e: Types.Events.Event): void {
      ++depth;
      if (depth > path.length + 2) {
        return;
      }
      if (!matchPath(e)) {
        return;
      }
      const currentStartTime = e.ts;
      const currentEndTime = e.ts + (e.dur ?? 0);
      const actualEndTime = Math.min(currentEndTime, endTime);
      const duration = Types.Timing.Micro(actualEndTime - Math.max(startTime, currentStartTime));
      if (duration < 0) {
        console.error('Negative event duration');
      }
      processEvent(e, duration);
    }

    function onInstantEvent(e: Types.Events.Event): void {
      ++depth;
      if (matchedDepth === path.length && depth <= path.length + 2) {
        processEvent(e, Types.Timing.Micro(0));
      }
      --depth;
    }

    /**
     * Creates a child node.
     */
    function processEvent(e: Types.Events.Event, duration: Types.Timing.Micro): void {
      if (depth === path.length + 2) {
        if (!currentDirectChild) {
          return;
        }
        currentDirectChild.setHasChildren(true);
        currentDirectChild.selfTime = Types.Timing.Micro(currentDirectChild.selfTime - duration);
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
      node.selfTime = Types.Timing.Micro(node.selfTime + duration);
      node.totalTime = Types.Timing.Micro(node.totalTime + duration);
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
      if (matchedDepth === path.length) {
        return true;
      }
      if (matchedDepth !== depth - 1) {
        return false;
      }
      const eventEndTime = e.ts + (e.dur ?? 0);
      if (!eventEndTime) {
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
      if (depth === path.length) {
        currentDirectChild = null;
      }
    }

    this.childrenInternal = children;
    return children;
  }
}

export class TopDownRootNode extends TopDownNode {
  readonly filter: (e: Types.Events.Event) => boolean;
  readonly startTime: Types.Timing.Micro;
  readonly endTime: Types.Timing.Micro;
  eventGroupIdCallback: ((arg0: Types.Events.Event) => string)|null|undefined;
  /** Default behavior is to aggregate similar trace events into one Node based on generateEventID(), eventGroupIdCallback(), etc. Set true to keep nodes 1:1 with events. */
  readonly doNotAggregate: boolean|undefined;
  readonly includeInstantEvents?: boolean;
  readonly eventId: (event: Types.Events.Event) => string = createEventIdCache();

  constructor(events: Types.Events.Event[],
              {filters, startTime, endTime, doNotAggregate, eventGroupIdCallback, includeInstantEvents}: {
                filters: TraceFilter[],
                startTime: Types.Timing.Micro,
                endTime: Types.Timing.Micro,
                doNotAggregate?: boolean,
                eventGroupIdCallback?: ((arg0: Types.Events.Event) => string)|null,
                includeInstantEvents?: boolean,
              }) {
    super('', events[0], null);
    this.event = events[0];
    this.root = this;
    this.events = events;
    this.filter = buildEventFilter(filters);
    this.startTime = startTime;
    this.endTime = endTime;
    this.eventGroupIdCallback = eventGroupIdCallback;
    this.doNotAggregate = doNotAggregate;
    this.includeInstantEvents = includeInstantEvents;

    this.totalTime = Types.Timing.Micro(endTime - startTime);
    this.selfTime = this.totalTime;
  }
  override children(): ChildrenCache {
    // FYI tree nodes are built lazily. https://codereview.chromium.org/2674283003
    return this.childrenInternal || this.grouppedTopNodes();
  }

  private grouppedTopNodes(): ChildrenCache {
    const flatNodes = super.children();
    for (const node of flatNodes.values()) {
      this.selfTime = Types.Timing.Micro(this.selfTime - node.totalTime);
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
      groupNode.addChild(node, node.selfTime, node.totalTime, node.transferSize);
    }
    this.childrenInternal = groupNodes;
    return groupNodes;
  }

  getEventGroupIdCallback(): ((arg0: Types.Events.Event) => string)|null|undefined {
    return this.eventGroupIdCallback;
  }
}

/**
 * Maps a trace events array to the set of network request IDs served from cache.
 * Timeline pans and zooms rebuild the tree with new time bounds over the same
 * events array; memoizing this lookup avoids an O(N) full-trace scan per rebuild.
 */
const cacheHitRequestIdsByEvents = new WeakMap<readonly Types.Events.Event[], ReadonlySet<string>>();

function getCacheHitRequestIds(events: readonly Types.Events.Event[]): ReadonlySet<string> {
  let cacheHitRequestIds = cacheHitRequestIdsByEvents.get(events);
  if (!cacheHitRequestIds) {
    const requestIds = new Set<string>();
    for (const e of events) {
      if (Types.Events.isResourceReceiveResponse(e)) {
        if (e.args.data.fromCache) {
          requestIds.add(e.args.data.requestId);
        } else {
          requestIds.delete(e.args.data.requestId);
        }
      }
    }
    cacheHitRequestIds = requestIds;
    cacheHitRequestIdsByEvents.set(events, cacheHitRequestIds);
  }
  return cacheHitRequestIds;
}

export class BottomUpRootNode extends Node {
  private childrenInternal: ChildrenCache|null;
  private textFilter: TraceFilter;
  readonly filter: (e: Types.Events.Event) => boolean;
  readonly startTime: Types.Timing.Micro;
  readonly endTime: Types.Timing.Micro;
  eventGroupIdCallback: ((arg0: Types.Events.Event) => string)|null|undefined;
  private calculateTransferSize?: boolean;
  private forceGroupIdCallback?: boolean;
  readonly eventId: (event: Types.Events.Event) => string = createEventIdCache();

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
    startTime: Types.Timing.Micro,
    endTime: Types.Timing.Micro,
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
    this.filter = buildEventFilter(filters);
    this.startTime = startTime;
    this.endTime = endTime;
    this.eventGroupIdCallback = eventGroupIdCallback;
    this.totalTime = Types.Timing.Micro(endTime - startTime);
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
    const stateStack: BottomUpIdState[] = [];
    const nodeById = new Map<string, Node>();
    const selfTimeStack: Types.Timing.Micro[] = [Types.Timing.Micro(endTime - startTime)];
    const firstNodeStack: boolean[] = [];
    // TODO(paulirish): rename to getGroupNodeId
    const eventGroupIdCallback = this.eventGroupIdCallback;
    const forceGroupIdCallback = this.forceGroupIdCallback;
    const eventId = this.eventId;

    // Group IDs are looked up first by base event ID and then by group ID,
    // storing the state object directly so steady-state events need no node
    // map lookup or string concatenation.
    const stateById = new Map<string, BottomUpIdState>();
    const groupedStatesByEventId = new Map<string, Map<string, BottomUpIdState>>();
    const stateForEvent = (e: Types.Events.Event): BottomUpIdState => {
      const id = eventId(e);
      if (!forceGroupIdCallback || !eventGroupIdCallback) {
        let state = stateById.get(id);
        if (!state) {
          state = {id, node: null, onStack: false, pendingTotalTime: Types.Timing.Micro(0)};
          stateById.set(id, state);
        }
        return state;
      }
      const groupId = eventGroupIdCallback(e);
      let groupedStates = groupedStatesByEventId.get(id);
      if (!groupedStates) {
        groupedStates = new Map();
        groupedStatesByEventId.set(id, groupedStates);
      }
      let state = groupedStates.get(groupId);
      if (!state) {
        state = {id: `${id}-${groupId}`, node: null, onStack: false, pendingTotalTime: Types.Timing.Micro(0)};
        groupedStates.set(groupId, state);
      }
      return state;
    };

    // Evaluated lazily on the first relevant event to avoid a WeakMap lookup or
    // full-trace scan when the time window contains no network data events.
    let cacheHitRequestIds: ReadonlySet<string>|null = null;

    // encodedDataLength is provided solely on instant events.
    const sumTransferSizeOfInstantEvent = (e: Types.Events.Event): void => {
      if (Types.Events.isReceivedDataEvent(e)) {
        const state = stateForEvent(e);
        let node = state.node;
        if (!node) {
          node = new BottomUpNode(root, state.id, e, false, root);
          state.node = node;
          nodeById.set(state.id, node);
        } else {
          node.events.push(e);
        }

        // ResourceReceivedData events tally up the transfer size over time, but the
        // ResourceReceiveResponse / ResourceFinish events hold the final result.
        if (e.name === 'ResourceReceivedData') {
          cacheHitRequestIds ??= getCacheHitRequestIds(this.events);
          if (cacheHitRequestIds.has(e.args.data.requestId)) {
            // It's a cache hit, so the actual network transfer size is 0.
            // We overwrite the tallied sum (which is uncompressed body size) with 0.
            node.transferSize = 0;
          } else {
            node.transferSize += e.args.data.encodedDataLength;
          }
        } else if (e.name === 'ResourceFinish' && e.args.data.encodedDataLength === 0) {
          cacheHitRequestIds ??= getCacheHitRequestIds(this.events);
          if (cacheHitRequestIds.has(e.args.data.requestId)) {
            node.transferSize = 0;
          }
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
          startTime: this.startTime,
          endTime: this.endTime,
          eventFilter: this.filter,
          ignoreAsyncEvents: false,
        },
    );

    function onStartEvent(e: Types.Events.Event): void {
      const currentStartTime = e.ts;
      const currentEndTime = e.ts + (e.dur ?? 0);

      const actualEndTime = Math.min(currentEndTime, endTime);
      const duration = Types.Timing.Micro(actualEndTime - Math.max(currentStartTime, startTime));
      selfTimeStack[selfTimeStack.length - 1] = Types.Timing.Micro(selfTimeStack[selfTimeStack.length - 1] - duration);
      selfTimeStack.push(duration);
      const state = stateForEvent(e);

      stateStack.push(state);

      // For an event 'X' that contains another event 'X' (resolving to the same node
      // id), we need to measure `totalTime` from the start of the outermost 'X' to
      // its corresponding end. This logic ensures we don't double-count the duration
      // of the inner event.
      const noNodeOnStack = !state.onStack;
      if (noNodeOnStack) {
        state.onStack = true;
        state.pendingTotalTime = duration;
      }
      firstNodeStack.push(noNodeOnStack);
    }

    function onEndEvent(event: Types.Events.Event): void {
      const state = stateStack.pop();
      if (!state) {
        return;
      }

      let node = state.node;
      if (!node) {
        node = new BottomUpNode(root, state.id, event, false, root);
        state.node = node;
        nodeById.set(state.id, node);
      } else {
        node.events.push(event);
      }
      node.selfTime = Types.Timing.Micro(node.selfTime + (selfTimeStack.pop() || 0));
      if (firstNodeStack.pop()) {
        node.totalTime = Types.Timing.Micro(node.totalTime + state.pendingTotalTime);
        state.onStack = false;
      }

      // An item on this stack means that this current node has a caller. Therefore,
      // in a bottom-up view it has children.
      if (stateStack.length > 0) {
        node.setHasChildren(true);
      }
    }

    this.selfTime = Types.Timing.Micro(selfTimeStack.pop() || 0);
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
      groupNode.addChild(node, node.selfTime, node.selfTime, node.transferSize);
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

  addChild(child: Node, selfTime: Types.Timing.Micro, totalTime: Types.Timing.Micro, transferSize: number): void {
    this.childrenInternal.set(child.id, child);
    this.selfTime = Types.Timing.Micro(this.selfTime + selfTime);
    this.totalTime = Types.Timing.Micro(this.totalTime + totalTime);
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
    const selfTimeStack: Types.Timing.Micro[] = [Types.Timing.Micro(0)];
    const eventIdStack: string[] = [];
    const eventStack: Types.Events.Event[] = [];
    const nodeById = new Map<string, BottomUpNode>();
    const startTime = this.root.startTime;
    const endTime = this.root.endTime;
    const eventId = this.root.eventId;
    let lastTimeMarker: Types.Timing.Micro = startTime;
    const self = this;
    Helpers.Trace.forEachEvent(
        this.root.events,
        {
          onStartEvent,
          onEndEvent,
          startTime,
          endTime,
          eventFilter: this.root.filter,
          ignoreAsyncEvents: false,
        },
    );
    function onStartEvent(e: Types.Events.Event): void {
      const currentStartTime = e.ts;
      const currentEndTime = e.ts + (e.dur ?? 0);
      const actualEndTime = Math.min(currentEndTime, endTime);
      const duration = Types.Timing.Micro(actualEndTime - Math.max(currentStartTime, startTime));
      if (duration < 0) {
        console.assert(false, 'Negative duration of an event');
      }
      selfTimeStack[selfTimeStack.length - 1] = Types.Timing.Micro(selfTimeStack[selfTimeStack.length - 1] - duration);
      selfTimeStack.push(duration);
      const id = eventId(e);
      eventIdStack.push(id);
      eventStack.push(e);
    }

    function onEndEvent(e: Types.Events.Event): void {
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
      const currentStartTime = e.ts;
      const currentEndTime = e.ts + (e.dur ?? 0);
      const actualEndTime = Types.Timing.Micro(Math.min(currentEndTime, endTime));
      const totalTime = Types.Timing.Micro(actualEndTime - Math.max(currentStartTime, lastTimeMarker));
      node.selfTime = Types.Timing.Micro(node.selfTime + (selfTime || 0));
      node.totalTime = Types.Timing.Micro(node.totalTime + totalTime);
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
  const topFrame = Helpers.Trace.stackTraceInEvent(event)?.[0];
  if (!topFrame) {
    return null;
  }
  return {...topFrame, scriptId: String(topFrame.scriptId) as Protocol.Runtime.ScriptId};
}

/** TODO(paulirish): rename to generateNodeId **/
export function generateEventID(event: Types.Events.Event): string {
  if (Types.Events.isProfileCall(event)) {
    const name = SamplesIntegrator.isNativeRuntimeFrame(event.callFrame) ?
        SamplesIntegrator.nativeGroup(event.callFrame.functionName) :
        event.callFrame.functionName;
    const location = event.callFrame.scriptId || event.callFrame.url || '';
    return `f:${name}@${location}:${event.callFrame.lineNumber}:${event.callFrame.columnNumber}`;
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
