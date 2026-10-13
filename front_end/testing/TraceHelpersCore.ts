// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Protocol from '../generated/protocol.js';
import * as CPUProfile from '../models/cpu_profile/cpu_profile.js';
import * as Trace from '../models/trace/trace.js';

/**
 * We create here a cross-test base trace event. It is assumed that each
 * test will import this default event and copy-override properties at will.
 **/
export const defaultTraceEvent: Trace.Types.Events.Event = {
  name: 'process_name',
  tid: Trace.Types.Events.ThreadID(0),
  pid: Trace.Types.Events.ProcessID(0),
  ts: Trace.Types.Timing.Micro(0),
  cat: 'test',
  ph: Trace.Types.Events.Phase.METADATA,
};

/**
 * Gets the tree in a thread.
 * @see RendererHandler.ts
 */
export function getTree(thread: Trace.Handlers.ModelHandlers.Renderer.RendererThread):
    Trace.Helpers.TreeHelpers.TraceEntryTree {
  const tree = thread.tree;
  assert(tree, `Couldn't get tree in thread ${thread.name}`);
  return tree;
}

/**
 * Gets the n-th root from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getRootAt(thread: Trace.Handlers.ModelHandlers.Renderer.RendererThread,
                          index: number): Trace.Helpers.TreeHelpers.TraceEntryNode {
  const tree = getTree(thread);
  const node = [...tree.roots][index];
  assert(node, `Couldn't get the id of the root at index ${index} in thread ${thread.name}`);
  return node;
}

/**
 * Gets all nodes in a thread. To finish this task, we Walk through all the nodes, starting from the root node.
 */
export function getAllNodes(roots: Set<Trace.Helpers.TreeHelpers.TraceEntryNode>):
    Trace.Helpers.TreeHelpers.TraceEntryNode[] {
  const allNodes: Trace.Helpers.TreeHelpers.TraceEntryNode[] = [];

  const children: Trace.Helpers.TreeHelpers.TraceEntryNode[] = Array.from(roots);
  while (children.length > 0) {
    const childNode = children.shift();
    if (childNode) {
      allNodes.push(childNode);
      children.push(...childNode.children);
    }
  }
  return allNodes;
}

/**
 * Gets all the `events` for the `nodes`.
 */
export function getEventsIn(nodes: IterableIterator<Trace.Helpers.TreeHelpers.TraceEntryNode>):
    Trace.Types.Events.Event[] {
  return [...nodes].flatMap(node => node ? node.entry : []);
}
/**
 * Pretty-prints a tree.
 */
export function prettyPrint(tree: Trace.Helpers.TreeHelpers.TraceEntryTree,
                            predicate: (node: Trace.Helpers.TreeHelpers.TraceEntryNode,
                                        event: Trace.Types.Events.Event) => boolean = () => true,
                            indentation = 2, delimiter = ' ', prefix = '-', newline = '\n', out = ''): string {
  let skipped = false;
  return printNodes(tree.roots);
  function printNodes(nodes: Set<Trace.Helpers.TreeHelpers.TraceEntryNode>|
                      Trace.Helpers.TreeHelpers.TraceEntryNode[]): string {
    for (const node of nodes) {
      const event = node.entry;
      if (!predicate(node, event)) {
        out += `${!skipped ? newline : ''}.`;
        skipped = true;
        continue;
      }
      skipped = false;
      const spacing = new Array(node.depth * indentation).fill(delimiter).join('');
      const eventType = Trace.Types.Events.isDispatch(event) ? `(${event.args.data?.type})` : false;
      const jsFunctionName =
          Trace.Types.Events.isProfileCall(event) ? `(${event.callFrame.functionName || 'anonymous'})` : false;
      const duration = `[${(event.dur || 0) / 1000}ms]`;
      const info = [jsFunctionName, eventType, duration].filter(Boolean);
      out += `${newline}${spacing}${prefix}${event.name} ${info.join(' ')}`;
      out = printNodes(node.children);
    }
    return out;
  }
}

/**
 * Builds a mock Complete.
 */
export function makeCompleteEvent(name: string, ts: number, dur: number, cat = '*', pid = 0,
                                  tid = 0): Trace.Types.Events.Complete {
  return {
    args: {},
    cat,
    name,
    ph: Trace.Types.Events.Phase.COMPLETE,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
    dur: Trace.Types.Timing.Micro(dur),
  };
}

export function makeAsyncStartEvent(
    name: string,
    ts: number,
    pid = 0,
    tid = 0,
    ): Trace.Types.Events.Async {
  return {
    args: {},
    cat: '*',
    name,
    ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
  };
}
export function makeAsyncEndEvent(
    name: string,
    ts: number,
    pid = 0,
    tid = 0,
    ): Trace.Types.Events.Async {
  return {
    args: {},
    cat: '*',
    name,
    ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_END,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
  };
}

/**
 * Builds a mock flow phase event.
 */
export function makeFlowPhaseEvent(
    name: string, ts: number, cat = '*',
    ph: Trace.Types.Events.Phase.FLOW_START|Trace.Types.Events.Phase.FLOW_END|Trace.Types.Events.Phase.FLOW_STEP,
    id = 0, pid = 0, tid = 0): Trace.Types.Events.FlowEvent {
  return {
    args: {},
    cat,
    name,
    id,
    ph,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
    dur: Trace.Types.Timing.Micro(0),
  };
}

/**
 * Builds flow phase events for a list of events belonging to the same
 * flow. `events` must be ordered.
 */
export function makeFlowEvents(events: Trace.Types.Events.Event[], flowId = 0): Trace.Types.Events.FlowEvent[] {
  const firstEvent = events.at(0);
  const lastEvent = events.at(-1);
  if (!lastEvent || !firstEvent) {
    return [];
  }
  const flowName = firstEvent.name;
  const flowStart = makeFlowPhaseEvent(flowName, firstEvent.ts, firstEvent.cat, Trace.Types.Events.Phase.FLOW_START,
                                       flowId, firstEvent.pid, firstEvent.tid);
  const flowEnd = makeFlowPhaseEvent(flowName, lastEvent.ts, lastEvent.cat, Trace.Types.Events.Phase.FLOW_END, flowId,
                                     lastEvent.pid, lastEvent.tid);

  const flowSteps: Trace.Types.Events.FlowEvent[] = [];
  for (let i = 1; i < events.length - 1; i++) {
    flowSteps.push(makeFlowPhaseEvent(flowName, events[i].ts, events[i].cat, Trace.Types.Events.Phase.FLOW_STEP, flowId,
                                      events[i].pid, events[i].tid));
  }
  return [flowStart, ...flowSteps, flowEnd];
}

/**
 * Builds a mock Instant.
 */
export function makeInstantEvent(
    name: string, tsMicroseconds: number, cat = '', pid = 0, tid = 0,
    s: Trace.Types.Events.Scope = Trace.Types.Events.Scope.THREAD): Trace.Types.Events.Instant {
  return {
    args: {},
    cat,
    name,
    ph: Trace.Types.Events.Phase.INSTANT,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(tsMicroseconds),
    s,
  };
}

/**
 * Builds a mock Begin.
 */
export function makeBeginEvent(name: string, ts: number, cat = '*', pid = 0, tid = 0): Trace.Types.Events.Begin {
  return {
    args: {},
    cat,
    name,
    ph: Trace.Types.Events.Phase.BEGIN,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
  };
}

/**
 * Builds a mock End.
 */
export function makeEndEvent(name: string, ts: number, cat = '*', pid = 0, tid = 0): Trace.Types.Events.End {
  return {
    args: {},
    cat,
    name,
    ph: Trace.Types.Events.Phase.END,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
  };
}

export function makeProfileCall(functionName: string, tsUs: number, durUs: number, pid = 0, tid = 0, nodeId = 0,
                                url = ''): Trace.Types.Events.SyntheticProfileCall {
  return {
    cat: '',
    name: 'ProfileCall',
    nodeId,
    sampleIndex: 0,
    profileId: Trace.Types.Events.ProfileID('fake-profile-id'),
    ph: Trace.Types.Events.Phase.COMPLETE,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(tsUs),
    dur: Trace.Types.Timing.Micro(durUs),
    callFrame: {
      functionName,
      scriptId: '' as Protocol.Runtime.ScriptId,
      url,
      lineNumber: -1,
      columnNumber: -1,
    },
    args: {},
  };
}

/**
 * Mocks an object compatible with the return type of the
 * RendererHandler using only an array of ordered entries.
 */
export function makeMockRendererHandlerData(entries: Trace.Types.Events.Event[], pid = 1,
                                            tid = 1): Trace.Handlers.ModelHandlers.Renderer.RendererHandlerData {
  const {tree, entryToNode} = Trace.Helpers.TreeHelpers.treify(entries, {filter: {has: () => true}});
  const mockThread: Trace.Handlers.ModelHandlers.Renderer.RendererThread = {
    tree,
    name: 'thread',
    entries,
    profileCalls: entries.filter(Trace.Types.Events.isProfileCall),
    layoutEvents: entries.filter(Trace.Types.Events.isLayout),
    recalcStyleEvents: entries.filter(Trace.Types.Events.isRecalcStyle),
  };

  const mockProcess: Trace.Handlers.ModelHandlers.Renderer.RendererProcess = {
    url: 'url',
    isOnMainFrame: true,
    threads: new Map([[tid as Trace.Types.Events.ThreadID, mockThread]]),
  };

  return {
    processes: new Map([[pid as Trace.Types.Events.ProcessID, mockProcess]]),
    compositorTileWorkers: new Map(),
    entryToNode,
    entityMappings: {
      entityByEvent: new Map(),
      eventsByEntity: new Map(),
      createdEntityCache: new Map(),
      entityByUrlCache: new Map(),
    },
  };
}

/**
 * Mocks an object compatible with the return type of the
 * SamplesHandler using only an array of ordered profile calls.
 */
export function makeMockSamplesHandlerData(profileCalls: Trace.Types.Events.SyntheticProfileCall[]):
    Trace.Handlers.ModelHandlers.Samples.SamplesHandlerData {
  const {tree, entryToNode} = Trace.Helpers.TreeHelpers.treify(profileCalls, {filter: {has: () => true}});
  const profile: Protocol.Profiler.Profile = {
    nodes: [],
    startTime: profileCalls.at(0)?.ts || Trace.Types.Timing.Micro(0),
    endTime: profileCalls.at(-1)?.ts || Trace.Types.Timing.Micro(10e5),
    samples: [],
    timeDeltas: [],
  };

  const nodesIds = new Map<number, Protocol.Profiler.ProfileNode>();
  const lastTimestamp = profile.startTime;
  for (const profileCall of profileCalls) {
    let node = nodesIds.get(profileCall.nodeId);
    if (!node) {
      node = {
        id: profileCall.nodeId,
        callFrame: profileCall.callFrame,
      };
      profile.nodes.push(node);
      nodesIds.set(profileCall.nodeId, node);
    }
    profile.samples?.push(node.id);
    const timeDelta = profileCall.ts - lastTimestamp;
    profile.timeDeltas?.push(timeDelta);
  }
  const profileData = {
    rawProfile: profile,
    parsedProfile: new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(profile),
    profileCalls,
    profileTree: tree,
    profileId: Trace.Types.Events.ProfileID('fake-profile-id'),
  };
  const profilesInThread = new Map([[1 as Trace.Types.Events.ThreadID, profileData]]);
  return {
    profilesInProcess: new Map([[1 as Trace.Types.Events.ProcessID, profilesInThread]]),
    entryToNode,
  };
}

export function getMainThread(data: Trace.Handlers.ModelHandlers.Renderer.RendererHandlerData):
    Trace.Handlers.ModelHandlers.Renderer.RendererThread {
  let mainThread: Trace.Handlers.ModelHandlers.Renderer.RendererThread|null = null;
  for (const [, process] of data.processes) {
    for (const [, thread] of process.threads) {
      if (thread.name === 'CrRendererMain') {
        mainThread = thread;
        break;
      }
    }
  }
  assert.isNotNull(mainThread, 'Could not find main thread');
  return mainThread;
}

export function getBaseTraceHandlerData(overrides: Partial<Trace.Handlers.Types.HandlerData> = {}):
    Trace.TraceModel.ParsedTrace {
  const data = {
    Animations: {animations: []},
    AnimationFrames: {
      animationFrames: [],
      presentationForFrame: new WeakMap(),
    },
    DOMStats: {
      domStatsByFrameId: new Map(),
    },
    LayoutShifts: {
      clusters: [],
      clustersByNavigationId: new Map(),
      sessionMaxScore: 0,
      clsWindowID: 0,
      prePaintEvents: [],
      layoutInvalidationEvents: [],
      scheduleStyleInvalidationEvents: [],
      styleRecalcInvalidationEvents: [],
      renderFrameImplCreateChildFrameEvents: [],
      domLoadingEvents: [],
      layoutImageUnsizedEvents: [],
      remoteFonts: [],
      scoreRecords: [],
      backendNodeIds: [],
      paintImageEvents: [],
    },
    Meta: {
      traceBounds: {
        min: Trace.Types.Timing.Micro(0),
        max: Trace.Types.Timing.Micro(100),
        range: Trace.Types.Timing.Micro(100),
      },
      browserProcessId: Trace.Types.Events.ProcessID(-1),
      browserThreadId: Trace.Types.Events.ThreadID(-1),
      gpuProcessId: Trace.Types.Events.ProcessID(-1),
      gpuThreadId: Trace.Types.Events.ThreadID(-1),
      threadsInProcess: new Map(),
      navigationsByFrameId: new Map(),
      navigationsByNavigationId: new Map(),
      finalDisplayUrlByNavigationId: new Map(),
      mainFrameId: '',
      mainFrameURL: '',
      rendererProcessesByFrame: new Map(),
      topLevelRendererIds: new Set(),
      frameByProcessId: new Map(),
      mainFrameNavigations: [],
      traceIsGeneric: false,
      processNames: new Map(),
    },
    Renderer: {
      processes: new Map(),
      compositorTileWorkers: new Map(),
      entryToNode: new Map(),
      entityMappings: {
        entityByEvent: new Map(),
        eventsByEntity: new Map(),
        createdEntityCache: new Map(),
        entityByUrlCache: new Map(),
      },
    },
    Screenshots: {
      legacySyntheticScreenshots: [],
      screenshots: [],
    },
    Samples: {
      entryToNode: new Map(),
      profilesInProcess: new Map(),
    },
    PageLoadMetrics: {
      metricScoresByFrameId: new Map(),
      allMarkerEvents: [],
      metaCharsetCheckEventsByNavigation: new WeakMap(),
    },
    UserInteractions: {
      allEvents: [],
      interactionEvents: [],
      beginCommitCompositorFrameEvents: [],
      parseMetaViewportEvents: [],
      interactionEventsWithNoNesting: [],
      longestInteractionEvent: null,
      interactionsOverThreshold: new Set(),
    },
    NetworkRequests: {
      byId: new Map(),
      incompleteInitiator: new WeakMap(),
      byTime: [],
      webSocket: [],
      entityMappings: {
        entityByEvent: new Map(),
        eventsByEntity: new Map(),
        createdEntityCache: new Map(),
        entityByUrlCache: new Map(),
      },
      linkPreconnectEvents: [],
    },
    GPU: {
      mainGPUThreadTasks: [],
    },
    UserTimings: {
      consoleTimings: [],
      performanceMarks: [],
      performanceMeasures: [],
      timestampEvents: [],
      measureTraceByTraceId: new Map(),
    },
    LargestImagePaint: {
      lcpRequestByNavigationId: new Map(),
    },
    LargestTextPaint: new Map(),
    AuctionWorklets: {
      worklets: new Map(),
    },
    ExtensionTraceData: {
      entryToNode: new Map(),
      extensionMarkers: [],
      extensionTrackData: [],
      syntheticConsoleEntriesForTimingsTrack: [],
    },
    Frames: {
      frames: [],
      framesById: {},
    },
    ImagePainting: {
      paintImageByDrawLazyPixelRef: new Map(),
      paintImageForEvent: new WeakMap(),
      paintImageEventForUrl: new Map(),
      paintEventToCorrectedDisplaySize: new WeakMap(),
      didCorrectForHostDpr: false,
    },
    Initiators: {
      eventToInitiator: new WeakMap(),
      initiatorToEvents: new WeakMap(),
    },
    Invalidations: {
      invalidationCountForEvent: new Map(),
      invalidationsForEvent: new Map(),
    },
    LayerTree: {
      paints: [],
      paintsToSnapshots: new WeakMap(),
      snapshots: [],
    },
    Memory: {
      updateCountersByProcess: new Map(),
    },
    PageFrames: {
      frames: new Map(),
    },
    SelectorStats: {
      dataForRecalcStyleEvent: new Map(),
      invalidatedNodeList: [],
    },
    Warnings: {
      perEvent: new WeakMap(),
      perWarning: new Map(),
    },
    Workers: {
      workerIdByThread: new Map(),
      workerSessionIdEvents: [],
      workerURLById: new Map(),
    },
    Flows: {
      flows: [],
    },
    AsyncJSCalls: {
      schedulerToRunEntryPoints: new Map(),
      asyncCallToScheduler: new WeakMap(),
      runEntryPointToScheduler: new WeakMap(),
    },
    Scripts: {
      scripts: [],
    },
    ...overrides,
  } as Trace.Handlers.Types.HandlerData;
  return {
    data,
    insights: null,
    traceEvents: [],
    metadata: {},
    // @ts-expect-error
    syntheticEventsManager: null,
  };
}

/**
 * A helper that will query the given array of events and find the first event
 * matching the predicate. It will also assert that a match is found, which
 * saves the need to do that for every test.
 */
export function getEventOfType<T extends Trace.Types.Events.Event>(
    events: Trace.Types.Events.Event[], predicate: (e: Trace.Types.Events.Event) => e is T): T {
  const match = events.find(predicate);
  assert(match, 'Failed to find matching event of type');
  return match;
}

export function microsecondsTraceWindow(min: number, max: number): Trace.Types.Timing.TraceWindowMicro {
  return Trace.Helpers.Timing.traceWindowFromMicroSeconds(
      min as Trace.Types.Timing.Micro,
      max as Trace.Types.Timing.Micro,
  );
}

export function microseconds(x: number): Trace.Types.Timing.Micro {
  return Trace.Types.Timing.Micro(x);
}

/**
 * Creates a mock `ParsedTrace` object for use in tests. This is a simple
 * cast of an empty object to the `ParsedTrace` type to reduce noise in tests
 * that only need a typed trace object without specific data.
 */
export function makeFakeParsedTrace(): Trace.TraceModel.ParsedTrace {
  return {} as unknown as Trace.TraceModel.ParsedTrace;
}

export function milliseconds(x: number): Trace.Types.Timing.Milli {
  return Trace.Types.Timing.Milli(x);
}

export function getAllNetworkRequestsByHost(networkRequests: Trace.Types.Events.SyntheticNetworkRequest[],
                                            host: string): Trace.Types.Events.SyntheticNetworkRequest[] {
  const reqs = networkRequests.filter(r => {
    const parsedUrl = new URL(r.args.data.url);
    return parsedUrl.host === host;
  });

  return reqs;
}

const allThreadEntriesForTraceCache = new WeakMap<Trace.TraceModel.ParsedTrace, Trace.Types.Events.Event[]>();

/**
 * A function to get a list of all thread entries that exist. This is
 * reasonably expensive, so it's cached to avoid a huge impact on our test suite
 * speed.
 */
export function allThreadEntriesInTrace(parsedTrace: Trace.TraceModel.ParsedTrace): Trace.Types.Events.Event[] {
  const fromCache = allThreadEntriesForTraceCache.get(parsedTrace);
  if (fromCache) {
    return fromCache;
  }

  const allEvents: Trace.Types.Events.Event[] = [];

  for (const process of parsedTrace.data.Renderer.processes.values()) {
    for (const thread of process.threads.values()) {
      for (const entry of thread.entries) {
        allEvents.push(entry);
      }
    }
  }

  Trace.Helpers.Trace.sortTraceEventsInPlace(allEvents);
  allThreadEntriesForTraceCache.set(parsedTrace, allEvents);
  return allEvents;
}

export interface PerformanceAPIExtensionTestData {
  detail: {devtools?: Trace.Types.Extensions.DevToolsObj};
  name: string;
  start?: string|number;
  end?: string|number;
  ts: number;
  dur?: number;
}

export interface ConsoleAPIExtensionTestData {
  name: string;
  start?: string|number;
  end?: string|number;
  track?: string;
  trackGroup?: string;
  color?: string;
  ts: number;
}

let idCounter = 0;

export function makeTimingEventWithPerformanceExtensionData(
    {name, ts: tsMicro, detail, dur: durMicro}: PerformanceAPIExtensionTestData): Trace.Types.Events.Event[] {
  const isMark = durMicro === undefined;
  const currentId = idCounter++;
  const traceEventBase = {
    cat: 'blink.user_timing',
    pid: Trace.Types.Events.ProcessID(2017),
    tid: Trace.Types.Events.ThreadID(259),
    id2: {local: `${currentId}`},
  };

  const stringDetail = JSON.stringify(detail);
  const args = isMark ? {data: {detail: stringDetail}} : {detail: stringDetail};
  const firstEvent = {
    args,
    name,
    ph: isMark ? Trace.Types.Events.Phase.INSTANT : Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
    ts: Trace.Types.Timing.Micro(tsMicro),
    ...traceEventBase,
  } as Trace.Types.Events.Event;
  if (isMark) {
    return [firstEvent];
  }
  return [
    firstEvent,
    {
      name,
      ...traceEventBase,
      ts: Trace.Types.Timing.Micro(tsMicro + (durMicro || 0)),
      ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_END,
    },
  ];
}

export function makeTimingEventWithConsoleExtensionData(
    {name, ts, start, end, track, trackGroup, color}: ConsoleAPIExtensionTestData):
    Trace.Types.Events.ConsoleTimeStamp {
  return {
    cat: 'devtools.timeline',
    pid: Trace.Types.Events.ProcessID(2017),
    tid: Trace.Types.Events.ThreadID(259),
    name: Trace.Types.Events.Name.TIME_STAMP,
    args: {
      data: {
        message: name,
        start,
        end,
        track,
        trackGroup,
        color,
      },
    },
    ts: Trace.Types.Timing.Micro(ts),
    ph: Trace.Types.Events.Phase.INSTANT,
  };
}

export async function createTraceExtensionDataFromPerformanceAPITestInput(
    extensionData: PerformanceAPIExtensionTestData[]):
    Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
  const events = extensionData.flatMap(makeTimingEventWithPerformanceExtensionData).sort((e1, e2) => e1.ts - e2.ts);
  return await createTraceExtensionDataFromEvents(events);
}

export async function createTraceExtensionDataFromEvents(events: Trace.Types.Events.Event[]):
    Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
  Trace.Helpers.SyntheticEvents.SyntheticEventsManager.createAndActivate(events);

  Trace.Handlers.ModelHandlers.UserTimings.reset();
  for (const event of events) {
    Trace.Handlers.ModelHandlers.UserTimings.handleEvent(event);
  }
  await Trace.Handlers.ModelHandlers.UserTimings.finalize();

  Trace.Handlers.ModelHandlers.ExtensionTraceData.reset();
  // ExtensionTraceData handler doesn't need to handle events since
  // it only consumes the output of the user timings handler.
  await Trace.Handlers.ModelHandlers.ExtensionTraceData.finalize();
  return Trace.Handlers.ModelHandlers.ExtensionTraceData.data();
}
