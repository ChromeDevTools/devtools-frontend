// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
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

export interface FromTimeOnThreadOptions {
  thread: {pid: Trace.Types.Events.ProcessID, tid: Trace.Types.Events.ThreadID};
  parsedTrace: Trace.Handlers.Types.ParsedTrace;
  bounds: Trace.Types.Timing.TraceWindowMicro;
}
export class AICallTree {
  constructor(
      public selectedNode: Trace.Extras.TraceTree.Node|null,
      public rootNode: Trace.Extras.TraceTree.TopDownRootNode,
      // TODO: see if we can avoid passing around this entire thing.
      public parsedTrace: Trace.Handlers.Types.ParsedTrace,
  ) {
  }

  /**
   * Builds a call tree representing all calls within the given timeframe for
   * the provided thread.
   * Events that are less than 0.05% of the range duration are removed.
   */
  static fromTimeOnThread({thread, parsedTrace, bounds}: FromTimeOnThreadOptions): AICallTree|null {
    const threadEvents = parsedTrace.Renderer.processes.get(thread.pid)?.threads.get(thread.tid)?.entries;

    if (!threadEvents) {
      return null;
    }
    const overlappingEvents = threadEvents.filter(e => Trace.Helpers.Timing.eventIsInBounds(e, bounds));

    const visibleEventsFilter = new Trace.Extras.TraceFilter.VisibleEventsFilter(visibleTypes());

    // By default, we remove events whose duration is less than 0.5% of the total
    // range. So if the range is 10s, an event must be 0.05s+ to be included.
    // This does risk eliminating useful data when we pass it to the LLM, but
    // we are trying to balance context window sizes and not using it up too
    // eagerly. We will experiment with this filter and likely make it smarter
    // or tweak it based on range size rather than using a blanket value. Or we
    // could consider limiting the depth when we serialize. Or some
    // combination!
    const minDuration = Trace.Types.Timing.Micro(bounds.range * 0.005);
    const minDurationFilter = new MinDurationFilter(minDuration);
    const compileCodeFilter = new ExcludeCompileCodeFilter();
    // Build a tree bounded by the selected event's timestamps, and our other filters applied
    const rootNode = new Trace.Extras.TraceTree.TopDownRootNode(overlappingEvents, {
      filters: [minDurationFilter, compileCodeFilter, visibleEventsFilter],
      startTime: Trace.Helpers.Timing.microToMilli(bounds.min),
      endTime: Trace.Helpers.Timing.microToMilli(bounds.max),
      doNotAggregate: true,
      includeInstantEvents: true,
    });

    const instance = new AICallTree(null /* no selected node*/, rootNode, parsedTrace);
    return instance;
  }
  /**
   * Attempts to build an AICallTree from a given selected event. It also
   * validates that this event is one that we support being used with the AI
   * Assistance panel, which [as of January 2025] means:
   * 1. It is on the main thread.
   * 2. It exists in either the Renderer or Sample handler's entryToNode map.
   * This filters out other events we make such as SyntheticLayoutShifts which are not valid
   * If the event is not valid, or there is an unexpected error building the tree, `null` is returned.
   */
  static fromEvent(selectedEvent: Trace.Types.Events.Event, parsedTrace: Trace.Handlers.Types.ParsedTrace): AICallTree
      |null {
    // First: check that the selected event is on the thread we have identified as the main thread.
    const threads = Trace.Handlers.Threads.threadsInTrace(parsedTrace);
    const thread = threads.find(t => t.pid === selectedEvent.pid && t.tid === selectedEvent.tid);
    if (!thread) {
      return null;
    }
    // We allow two thread types to deal with the NodeJS use case.
    // MAIN_THREAD is used when a trace has been generated through Chrome
    //   tracing on a website (and we have a renderer)
    // CPU_PROFILE is used only when we have received a CPUProfile - in this
    //   case all the threads are CPU_PROFILE so we allow those. If we only allow
    //   MAIN_THREAD then we wouldn't ever allow NodeJS users to use the AI
    //   integration.
    if (thread.type !== Trace.Handlers.Threads.ThreadType.MAIN_THREAD &&
        thread.type !== Trace.Handlers.Threads.ThreadType.CPU_PROFILE) {
      return null;
    }

    // Ensure that the event is known to either the Renderer or Samples
    // handler. This helps exclude synthetic events we build up for other
    // information such as Layout Shift clusters.
    // We check Renderer + Samples to ensure we support CPU Profiles (which do
    // not populate the Renderer Handler)
    if (!parsedTrace.Renderer.entryToNode.has(selectedEvent) && !parsedTrace.Samples.entryToNode.has(selectedEvent)) {
      return null;
    }

    const allEventsEnabled = Root.Runtime.experiments.isEnabled('timeline-show-all-events');
    const {startTime, endTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(selectedEvent);
    const selectedEventBounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
        Trace.Helpers.Timing.milliToMicro(startTime), Trace.Helpers.Timing.milliToMicro(endTime));
    let threadEvents = parsedTrace.Renderer.processes.get(selectedEvent.pid)?.threads.get(selectedEvent.tid)?.entries;
    if (!threadEvents) {
      // None from the renderer: try the samples handler, this might be a CPU trace.
      threadEvents = parsedTrace.Samples.profilesInProcess.get(selectedEvent.pid)?.get(selectedEvent.tid)?.profileCalls;
    }

    if (!threadEvents) {
      console.warn(`AICallTree: could not find thread for selected entry: ${selectedEvent}`);
      return null;
    }
    const overlappingEvents = threadEvents.filter(e => Trace.Helpers.Timing.eventIsInBounds(e, selectedEventBounds));

    const filters: Trace.Extras.TraceFilter.TraceFilter[] =
        [new SelectedEventDurationFilter(selectedEvent), new ExcludeCompileCodeFilter(selectedEvent)];

    // If the "Show all events" experiment is on, we don't filter out any
    // events here, otherwise the generated call tree will not match what the
    // user is seeing.
    if (!allEventsEnabled) {
      filters.push(new Trace.Extras.TraceFilter.VisibleEventsFilter(visibleTypes()));
    }

    // Build a tree bounded by the selected event's timestamps, and our other filters applied
    const rootNode = new Trace.Extras.TraceTree.TopDownRootNode(overlappingEvents, {
      filters,
      startTime,
      endTime,
      includeInstantEvents: true,
    });

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
      console.warn(`Selected event ${selectedEvent} not found within its own tree.`);
      return null;
    }
    const instance = new AICallTree(selectedNode, rootNode, parsedTrace);
    // instance.logDebug();
    return instance;
  }

  /** Define precisely how the call tree is serialized. Typically called from within `PerformanceAgent` */
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
      selectedNode: Trace.Extras.TraceTree.Node|null, nodeToIdMap: Map<Trace.Extras.TraceTree.Node, number>,
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
      // Manual testing shows 45k fits. 50k doesn't.
      // Max is 32k _tokens_, but tokens to bytes is wishywashy, so... hard to know for sure.
      console.warn('Output will likely not fit in the context window. Expect an AIDA error.');
    }
  }
}

/**
 * These events are very noisy and take up room in the context window for no real benefit.
 */
export class ExcludeCompileCodeFilter extends Trace.Extras.TraceFilter.TraceFilter {
  #selectedEvent: Trace.Types.Events.Event|null = null;
  constructor(selectedEvent?: Trace.Types.Events.Event) {
    super();
    this.#selectedEvent = selectedEvent ?? null;
  }

  accept(event: Trace.Types.Events.Event): boolean {
    if (this.#selectedEvent && event === this.#selectedEvent) {
      // If the user selects this event, we should accept it, else the
      // behaviour is confusing when the selected event is not used.
      return true;
    }
    return event.name !== Trace.Types.Events.Name.COMPILE_CODE;
  }
}

export class SelectedEventDurationFilter extends Trace.Extras.TraceFilter.TraceFilter {
  #minDuration: Trace.Types.Timing.Micro;
  #selectedEvent: Trace.Types.Events.Event;
  constructor(selectedEvent: Trace.Types.Events.Event) {
    super();
    // The larger the selected event is, the less small ones matter. We'll exclude items under ½% of the selected event's size
    this.#minDuration = Trace.Types.Timing.Micro((selectedEvent.dur ?? 1) * 0.005);
    this.#selectedEvent = selectedEvent;
  }
  accept(event: Trace.Types.Events.Event): boolean {
    if (event === this.#selectedEvent) {
      return true;
    }
    return event.dur ? event.dur >= this.#minDuration : false;
  }
}

export class MinDurationFilter extends Trace.Extras.TraceFilter.TraceFilter {
  #minDuration: Trace.Types.Timing.Micro;

  constructor(minDuration: Trace.Types.Timing.Micro) {
    super();
    this.#minDuration = minDuration;
  }

  accept(event: Trace.Types.Events.Event): boolean {
    return event.dur ? event.dur >= this.#minDuration : false;
  }
}
