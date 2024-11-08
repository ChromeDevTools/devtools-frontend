// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';

import {nameForEntry} from './EntryName.js';
import {visibleTypes} from './EntryStyles.js';
import {SourceMapsResolver} from './SourceMapsResolver.js';

/** Iterates from a node down through its descendents. If the callback returns true, the loop stops. */
function depthFirstWalk(
    nodes: MapIterator<Trace.Extras.TraceTree.Node>, callback: (arg0: Trace.Extras.TraceTree.Node) => void|true): void {
  for (const node of nodes) {
    if (callback?.(node)) {
      break;
    }
    depthFirstWalk(node.children().values(), callback);  // Go deeper.
  }
}

export class AICallTree {
  constructor(
      public selectedNode: Trace.Extras.TraceTree.Node,
      public rootNode: Trace.Extras.TraceTree.TopDownRootNode,
      // TODO: see if we can avoid passing around this entire thing.
      public parsedTrace: Trace.Handlers.Types.ParsedTrace,
  ) {
  }

  static from(
      selectedEvent: Trace.Types.Events.Event, events: Trace.Types.Events.Event[],
      parsedTrace: Trace.Handlers.Types.ParsedTrace): AICallTree {
    const {startTime, endTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(selectedEvent);

    const selectedEventBounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
        Trace.Helpers.Timing.millisecondsToMicroseconds(startTime),
        Trace.Helpers.Timing.millisecondsToMicroseconds(endTime));
    const threadEvents = parsedTrace.Renderer.processes.get(selectedEvent.pid)?.threads.get(selectedEvent.tid)?.entries;
    if (!threadEvents) {
      throw new Error('Cannot locate thread');
    }
    const overlappingEvents = threadEvents.filter(e => Trace.Helpers.Timing.eventIsInBounds(e, selectedEventBounds));

    const visibleEventsFilter = new Trace.Extras.TraceFilter.VisibleEventsFilter(visibleTypes());
    const customFilter = new AITreeFilter(selectedEvent);
    // Build a tree bounded by the selected event's timestamps, and our other filters applied
    const rootNode = new Trace.Extras.TraceTree.TopDownRootNode(
        overlappingEvents, [visibleEventsFilter, customFilter], startTime, endTime, false, null, true);

    // Walk the tree to find selectedNode
    let selectedNode: Trace.Extras.TraceTree.Node|null = null;
    depthFirstWalk([rootNode].values(), node => {
      if (node.event === selectedEvent) {
        selectedNode = node;
        return true;
      }
      return;
    });

    if (selectedNode === null) {
      throw new Error('Node not within its own tree. Unexpected.');
    }
    const instance = new AICallTree(selectedNode, rootNode, parsedTrace);
    // instance.logDebug();
    return instance;
  }

  /** Define precisely how the call tree is serialized. Typically called from within `DrJonesPerformanceAgent` */
  serialize(): string {
    const nodeToIdMap = new Map<Trace.Extras.TraceTree.Node, number>();
    // Keep a map of URLs. We'll output a LUT to keep size down.
    const allUrls: string[] = [];

    let nodesStr = '';
    depthFirstWalk(this.rootNode.children().values(), node => {
      nodesStr += AICallTree.stringifyNode(node, this.parsedTrace, this.selectedNode, nodeToIdMap, allUrls);
    });

    let output = '';
    if (allUrls.length) {
      // Output lookup table of URLs within this tree
      output += '\n# All URL #s:\n\n' + allUrls.map((url, index) => `  * ${index}: ${url}`).join('\n');
    }
    output += '\n\n# Call tree:' + nodesStr;
    return output;
  }

  /* This custom YAML-like format with an adjacency list for children is 35% more token efficient than JSON */
  static stringifyNode(
      node: Trace.Extras.TraceTree.Node, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      selectedNode: Trace.Extras.TraceTree.Node, nodeToIdMap: Map<Trace.Extras.TraceTree.Node, number>,
      allUrls: string[]): string {
    const event = node.event;
    if (!event) {
      throw new Error('Event required');
    }

    const url = SourceMapsResolver.resolvedURLForEntry(parsedTrace, event);
    // Get the index of the URL within allUrls, and push if needed. Set to -1 if there's no URL here.
    const urlIndex = !url ? -1 : allUrls.indexOf(url) === -1 ? allUrls.push(url) - 1 : allUrls.indexOf(url);
    const children = Array.from(node.children().values());

    // Identifier string includes an id and name:
    //   eg "[13] Parse HTML" or "[45] parseCPUProfileFormatFromFile"
    const getIdentifier = (node: Trace.Extras.TraceTree.Node): string => {
      if (!node.event || typeof node.id !== 'string') {
        throw new Error('ok');
      }
      if (!nodeToIdMap.has(node)) {
        nodeToIdMap.set(node, nodeToIdMap.size + 1);
      }
      return `${nodeToIdMap.get(node)} – ${nameForEntry(node.event, parsedTrace)}`;
    };

    // Round milliseconds because we don't need the precision
    const roundToTenths = (num: number): number => Math.round(num * 10) / 10;

    // Build a multiline string describing this callframe node
    const lines = [
      `\n\nNode: ${getIdentifier(node)}`,
      selectedNode === node && 'Selected: true',
      node.totalTime && `dur: ${roundToTenths(node.totalTime)}`,
      // node.functionSource && `snippet: ${node.functionSource.slice(0, 250)}`,
      node.selfTime && `self: ${roundToTenths(node.selfTime)}`,
      urlIndex !== -1 && `URL #: ${urlIndex}`,
    ];
    if (children.length) {
      lines.push('Children:');
      lines.push(...children.map(node => `  * ${getIdentifier(node)}`));
    }
    return lines.filter(Boolean).join('\n');
  }

  // Only used for debugging.
  logDebug(): void {
    const str = this.serialize();
    // eslint-disable-next-line no-console
    console.log('🎆', str);
    if (str.length > 45_000) {
      // Manual testing shows 45k fits. 50k doesnt.
      // Max is 32k _tokens_, but tokens to bytes is wishywashy, so... hard to know for sure.
      console.warn('Output will likely not fit in the context window. Expect an AIDA error.');
    }
  }
}

export class AITreeFilter extends Trace.Extras.TraceFilter.TraceFilter {
  #minDuration: Trace.Types.Timing.MicroSeconds;
  #selectedEvent: Trace.Types.Events.Event;
  constructor(selectedEvent: Trace.Types.Events.Event) {
    super();
    // The larger the selected event is, the less small ones matter. We'll exclude items under ½% of the selected event's size
    this.#minDuration = Trace.Types.Timing.MicroSeconds((selectedEvent.dur ?? 1) * 0.005);
    this.#selectedEvent = selectedEvent;
  }
  accept(event: Trace.Types.Events.Event): boolean {
    if (event === this.#selectedEvent) {
      return true;
    }
    if (event.name === Trace.Types.Events.Name.COMPILE_CODE) {
      return false;
    }
    return event.dur ? event.dur >= this.#minDuration : false;
  }
}
