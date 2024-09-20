// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

import {eventIsInBounds} from './Timing.js';

let nodeIdCount = 0;
export const makeTraceEntryNodeId = (): TraceEntryNodeId => (++nodeIdCount) as TraceEntryNodeId;

export const makeEmptyTraceEntryTree = (): TraceEntryTree => ({
  roots: new Set(),
  maxDepth: 0,
});

export const makeEmptyTraceEntryNode = (entry: Types.Events.Event, id: TraceEntryNodeId): TraceEntryNode => ({
  entry,
  id,
  parent: null,
  children: [],
  depth: 0,
});

export interface TraceEntryTree {
  roots: Set<TraceEntryNode>;
  maxDepth: number;
}

export interface TraceEntryNode {
  entry: Types.Events.Event;
  depth: number;
  selfTime?: Types.Timing.MicroSeconds;
  id: TraceEntryNodeId;
  parent: TraceEntryNode|null;
  children: TraceEntryNode[];
}

class TraceEntryNodeIdTag {
  /* eslint-disable-next-line no-unused-private-class-members */
  readonly #tag: (symbol|undefined);
}
export type TraceEntryNodeId = number&TraceEntryNodeIdTag;

/**
 * Builds a hierarchy of the entries (trace events and profile calls) in
 * a particular thread of a particular process, assuming that they're
 * sorted, by iterating through all of the events in order.
 *
 * The approach is analogous to how a parser would be implemented. A
 * stack maintains local context. A scanner peeks and pops from the data
 * stream. Various "tokens" (events) are treated as "whitespace"
 * (ignored).
 *
 * The tree starts out empty and is populated as the hierarchy is built.
 * The nodes are also assumed to be created empty, with no known parent
 * or children.
 *
 * Complexity: O(n), where n = number of events
 */
export function treify(entries: Types.Events.Event[], options?: {
  filter: {has: (name: Types.Events.Name) => boolean},
}): {tree: TraceEntryTree, entryToNode: Map<Types.Events.Event, TraceEntryNode>} {
  // As we construct the tree, store a map of each entry to its node. This
  // means if you are iterating over a list of RendererEntry events you can
  // easily look up that node in the tree.
  const entryToNode = new Map<Types.Events.Event, TraceEntryNode>();

  const stack = [];
  // Reset the node id counter for every new renderer.
  nodeIdCount = -1;
  const tree = makeEmptyTraceEntryTree();

  for (let i = 0; i < entries.length; i++) {
    const event = entries[i];
    // If the current event should not be part of the tree, then simply proceed
    // with the next event.
    if (options && !options.filter.has(event.name as Types.Events.Name)) {
      continue;
    }

    const duration = event.dur || 0;
    const nodeId = makeTraceEntryNodeId();
    const node = makeEmptyTraceEntryNode(event, nodeId);

    // If the parent stack is empty, then the current event is a root. Create a
    // node for it, mark it as a root, then proceed with the next event.
    if (stack.length === 0) {
      tree.roots.add(node);
      node.selfTime = Types.Timing.MicroSeconds(duration);
      stack.push(node);
      tree.maxDepth = Math.max(tree.maxDepth, stack.length);
      entryToNode.set(event, node);
      continue;
    }

    const parentNode = stack.at(-1);
    if (parentNode === undefined) {
      throw new Error('Impossible: no parent node found in the stack');
    }

    const parentEvent = parentNode.entry;

    const begin = event.ts;
    const parentBegin = parentEvent.ts;
    const parentDuration = parentEvent.dur || 0;
    const end = begin + duration;
    const parentEnd = parentBegin + parentDuration;
    // Check the relationship between the parent event at the top of the stack,
    // and the current event being processed. There are only 4 distinct
    // possiblities, only 2 of them actually valid, given the assumed sorting:
    // 1. Current event starts before the parent event, ends whenever. (invalid)
    // 2. Current event starts after the parent event, ends whenever. (valid)
    // 3. Current event starts during the parent event, ends after. (invalid)
    // 4. Current event starts and ends during the parent event. (valid)

    // 1. If the current event starts before the parent event, then the data is
    //    not sorted properly, messed up some way, or this logic is incomplete.
    const startsBeforeParent = begin < parentBegin;
    if (startsBeforeParent) {
      throw new Error('Impossible: current event starts before the parent event');
    }

    // 2. If the current event starts after the parent event, then it's a new
    //    parent. Pop, then handle current event again.
    const startsAfterParent = begin >= parentEnd;
    if (startsAfterParent) {
      stack.pop();
      i--;
      // The last created node has been discarded, so discard this id.
      nodeIdCount--;
      continue;
    }
    // 3. If the current event starts during the parent event, but ends
    //    after it, then the data is messed up some way, for example a
    //    profile call was sampled too late after its start, ignore the
    //    problematic event.
    const endsAfterParent = end > parentEnd;
    if (endsAfterParent) {
      continue;
    }

    // 4. The only remaining case is the common case, where the current event is
    //    contained within the parent event. Create a node for the current
    //    event, establish the parent/child relationship, then proceed with the
    //    next event.
    node.depth = stack.length;
    node.parent = parentNode;
    parentNode.children.push(node);
    node.selfTime = Types.Timing.MicroSeconds(duration);
    if (parentNode.selfTime !== undefined) {
      parentNode.selfTime = Types.Timing.MicroSeconds(parentNode.selfTime - (event.dur || 0));
    }
    stack.push(node);
    tree.maxDepth = Math.max(tree.maxDepth, stack.length);
    entryToNode.set(event, node);
  }
  return {tree, entryToNode};
}

/**
 * Iterates events in a tree hierarchically, from top to bottom,
 * calling back on every event's start and end in the order
 * as it traverses down and then up the tree.
 *
 * For example, given this tree, the following callbacks
 * are expected to be made in the following order
 * |---------------A---------------|
 *  |------B------||-------D------|
 *    |---C---|
 *
 * 1. Start A
 * 3. Start B
 * 4. Start C
 * 5. End C
 * 6. End B
 * 7. Start D
 * 8. End D
 * 9. End A
 *
 */
export function walkTreeFromEntry(
    entryToNode: Map<Types.Events.Event, TraceEntryNode>,
    rootEntry: Types.Events.Event,
    onEntryStart: (entry: Types.Events.Event) => void,
    onEntryEnd: (entry: Types.Events.Event) => void,
    ): void {
  const startNode = entryToNode.get(rootEntry);
  if (!startNode) {
    return;
  }
  walkTreeByNode(entryToNode, startNode, onEntryStart, onEntryEnd);
}

/**
 * Given a Helpers.TreeHelpers.RendererTree, this will iterates events in hierarchically, visiting
 * each root node and working from top to bottom, calling back on every event's
 * start and end in the order as it traverses down and then up the tree.
 *
 * For example, given this tree, the following callbacks
 * are expected to be made in the following order
 * |------------- Task A -------------||-- Task E --|
 *  |-- Task B --||-- Task D --|
 *   |- Task C -|
 *
 * 1. Start A
 * 3. Start B
 * 4. Start C
 * 5. End C
 * 6. End B
 * 7. Start D
 * 8. End D
 * 9. End A
 * 10. Start E
 * 11. End E
 *
 */

export function walkEntireTree(
    entryToNode: Map<Types.Events.Event, TraceEntryNode>,
    tree: TraceEntryTree,
    onEntryStart: (entry: Types.Events.Event) => void,
    onEntryEnd: (entry: Types.Events.Event) => void,
    traceWindowToInclude?: Types.Timing.TraceWindowMicroSeconds,
    minDuration?: Types.Timing.MicroSeconds,
    ): void {
  for (const rootNode of tree.roots) {
    walkTreeByNode(entryToNode, rootNode, onEntryStart, onEntryEnd, traceWindowToInclude, minDuration);
  }
}

function walkTreeByNode(
    entryToNode: Map<Types.Events.Event, TraceEntryNode>,
    rootNode: TraceEntryNode,
    onEntryStart: (entry: Types.Events.Event) => void,
    onEntryEnd: (entry: Types.Events.Event) => void,
    traceWindowToInclude?: Types.Timing.TraceWindowMicroSeconds,
    minDuration?: Types.Timing.MicroSeconds,
    ): void {
  if (traceWindowToInclude && !treeNodeIsInWindow(rootNode, traceWindowToInclude)) {
    // If this node is not within the provided window, we can skip it. We also
    // can skip all its children too, as we know they won't be in the window if
    // their parent is not.
    return;
  }

  if (typeof minDuration !== 'undefined') {
    const duration = Types.Timing.MicroSeconds(
        rootNode.entry.ts + Types.Timing.MicroSeconds(rootNode.entry.dur ?? 0),
    );
    if (duration < minDuration) {
      return;
    }
  }

  onEntryStart(rootNode.entry);
  for (const child of rootNode.children) {
    walkTreeByNode(entryToNode, child, onEntryStart, onEntryEnd, traceWindowToInclude, minDuration);
  }
  onEntryEnd(rootNode.entry);
}

/**
 * Returns true if the provided node is partially or fully within the trace
 * window. The entire node does not have to fit inside the window, but it does
 * have to partially intersect it.
 */
function treeNodeIsInWindow(node: TraceEntryNode, traceWindow: Types.Timing.TraceWindowMicroSeconds): boolean {
  return eventIsInBounds(node.entry, traceWindow);
}

/**
 * Determines if the given events, which are assumed to be ordered can
 * be organized into tree structures.
 * This condition is met if there is *not* a pair of async events
 * e1 and e2 where:
 *
 * e1.startTime < e2.startTime && e1.endTime > e2.startTime && e1.endTime < e2.endTime.
 * or, graphically:
 * |------- e1 ------|
 *   |------- e2 --------|
 *
 * Because a parent-child relationship cannot be made from the example
 * above, a tree cannot be made from the set of events.
 *
 * Sync events from the same thread are tree-able by definition.
 *
 * Note that this will also return true if multiple trees can be
 * built, for example if none of the events overlap with each other.
 */
export function canBuildTreesFromEvents(events: readonly Types.Events.Event[]): boolean {
  const stack: Types.Events.Event[] = [];
  for (const event of events) {
    const startTime = event.ts;
    const endTime = event.ts + (event.dur ?? 0);
    let parent = stack.at(-1);
    if (parent === undefined) {
      stack.push(event);
      continue;
    }
    let parentEndTime = parent.ts + (parent.dur ?? 0);
    // Discard events that are not parents for this event. The parent
    // is one whose end time is after this event start time.
    while (stack.length && startTime >= parentEndTime) {
      stack.pop();
      parent = stack.at(-1);

      if (parent === undefined) {
        break;
      }
      parentEndTime = parent.ts + (parent.dur ?? 0);
    }
    if (stack.length && endTime > parentEndTime) {
      // If such an event exists but its end time is before this
      // event's end time, then a tree cannot be made using this
      // events.
      return false;
    }
    stack.push(event);
  }
  return true;
}
