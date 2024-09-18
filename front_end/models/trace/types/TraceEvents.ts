// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-unused-private-class-members */
import type * as Protocol from '../../../generated/protocol.js';

import {type MicroSeconds, type MilliSeconds, type Seconds, type TraceWindowMicroSeconds} from './Timing.js';

// Trace Events.
export const enum Phase {
  // Standard
  BEGIN = 'B',
  END = 'E',
  COMPLETE = 'X',
  INSTANT = 'I',
  COUNTER = 'C',

  // Async
  ASYNC_NESTABLE_START = 'b',
  ASYNC_NESTABLE_INSTANT = 'n',
  ASYNC_NESTABLE_END = 'e',
  ASYNC_STEP_INTO = 'T',
  ASYNC_BEGIN = 'S',
  ASYNC_END = 'F',
  ASYNC_STEP_PAST = 'p',

  // Flow
  FLOW_START = 's',
  FLOW_STEP = 't',
  FLOW_END = 'f',

  // Sample
  SAMPLE = 'P',

  // Object
  OBJECT_CREATED = 'N',
  OBJECT_SNAPSHOT = 'O',
  OBJECT_DESTROYED = 'D',

  // Metadata
  METADATA = 'M',

  // Memory Dump
  MEMORY_DUMP_GLOBAL = 'V',
  MEMORY_DUMP_PROCESS = 'v',

  // Mark
  MARK = 'R',

  // Clock sync
  CLOCK_SYNC = 'c',
}

export function isNestableAsyncPhase(phase: Phase): boolean {
  return phase === Phase.ASYNC_NESTABLE_START || phase === Phase.ASYNC_NESTABLE_END ||
      phase === Phase.ASYNC_NESTABLE_INSTANT;
}

export function isAsyncPhase(phase: Phase): boolean {
  return isNestableAsyncPhase(phase) || phase === Phase.ASYNC_BEGIN || phase === Phase.ASYNC_STEP_INTO ||
      phase === Phase.ASYNC_END || phase === Phase.ASYNC_STEP_PAST;
}

export function isFlowPhase(phase: Phase): boolean {
  return phase === Phase.FLOW_START || phase === Phase.FLOW_STEP || phase === Phase.FLOW_END;
}

export const enum TraceEventScope {
  THREAD = 't',
  PROCESS = 'p',
  GLOBAL = 'g',
}

export interface TraceEventData {
  args?: TraceEventArgs;
  cat: string;
  name: string;
  ph: Phase;
  pid: ProcessID;
  tid: ThreadID;
  tts?: MicroSeconds;
  ts: MicroSeconds;
  tdur?: MicroSeconds;
  dur?: MicroSeconds;
}

export interface TraceEventArgs {
  data?: TraceEventArgsData;
  stackTrace?: TraceEventCallFrame[];
}

export interface TraceEventArgsData {
  stackTrace?: TraceEventCallFrame[];
  url?: string;
  navigationId?: string;
  frame?: string;
}

export interface TraceEventCallFrame {
  codeType?: string;
  functionName: string;
  // Trace events are inconsistent here sadly :(
  scriptId: number|string;
  columnNumber: number;
  lineNumber: number;
  url: string;
}

export function objectIsTraceEventCallFrame(object: {}): object is TraceEventCallFrame {
  return ('functionName' in object && typeof object.functionName === 'string') &&
      ('scriptId' in object && (typeof object.scriptId === 'string' || typeof object.scriptId === 'number')) &&
      ('columnNumber' in object && typeof object.columnNumber === 'number') &&
      ('lineNumber' in object && typeof object.lineNumber === 'number') &&
      ('url' in object && typeof object.url === 'string');
}

export interface TraceFrame {
  frame: string;
  name: string;
  processId: ProcessID;
  url: string;
  parent?: string;
  // Added to Chromium in April 2024:
  // crrev.com/c/5424783
  isOutermostMainFrame?: boolean;
  // Added to Chromium in June 2024:
  // crrev.com/c/5595033
  isInPrimaryMainFrame?: boolean;
}

// Sample events.

export interface TraceEventSample extends TraceEventData {
  ph: Phase.SAMPLE;
}

/**
 * A fake trace event created to support CDP.Profiler.Profiles in the
 * trace engine.
 */
export interface SyntheticCpuProfile extends TraceEventInstant, SyntheticBasedEvent<Phase.INSTANT> {
  name: 'CpuProfile';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      cpuProfile: Protocol.Profiler.Profile,
    },
  };
}

export interface TraceEventProfile extends TraceEventSample {
  name: 'Profile';
  id: ProfileID;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      startTime: MicroSeconds,
    },
  };
}

export interface TraceEventProfileChunk extends TraceEventSample {
  name: 'ProfileChunk';
  id: ProfileID;
  args: TraceEventArgs&{
    // `data` is only missing in "fake" traces
    data?: TraceEventArgsData & {
      cpuProfile?: TraceEventPartialProfile,
      timeDeltas?: MicroSeconds[],
      lines?: MicroSeconds[],
    },
  };
}

export interface TraceEventPartialProfile {
  nodes?: TraceEventPartialNode[];
  samples: CallFrameID[];
}

export interface TraceEventPartialNode {
  callFrame: TraceEventCallFrame;
  id: CallFrameID;
  parent?: CallFrameID;
}

// Complete events.

export interface TraceEventComplete extends TraceEventData {
  ph: Phase.COMPLETE;
  dur: MicroSeconds;
}

export interface TraceEventRunTask extends TraceEventComplete {
  name: KnownEventName.RUN_TASK;
}
export function isTraceEventRunTask(event: TraceEventData): event is TraceEventRunTask {
  return event.name === KnownEventName.RUN_TASK;
}

export interface TraceEventFireIdleCallback extends TraceEventComplete {
  name: KnownEventName.FIRE_IDLE_CALLBACK;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      allottedMilliseconds: MilliSeconds,
      frame: string,
      id: number,
      timedOut: boolean,
    },
  };
}

export interface TraceEventSchedulePostMessage extends TraceEventInstant {
  name: KnownEventName.SCHEDULE_POST_MESSAGE;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      traceId: string,
    },
  };
}

export interface TraceEventHandlePostMessage extends TraceEventComplete {
  name: KnownEventName.HANDLE_POST_MESSAGE;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      traceId: string,
    },
  };
}

export interface TraceEventDispatch extends TraceEventComplete {
  name: 'EventDispatch';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      type: string,
    },
  };
}

export interface TraceEventParseHTML extends TraceEventComplete {
  name: 'ParseHTML';
  args: TraceEventArgs&{
    beginData: {
      frame: string,
      startLine: number,
      url: string,
    },
    endData?: {
      endLine: number,
    },
  };
}

export interface TraceEventBegin extends TraceEventData {
  ph: Phase.BEGIN;
}

export interface TraceEventEnd extends TraceEventData {
  ph: Phase.END;
}

/**
 * This denotes a complete event created from a pair of begin and end
 * events. For practicality, instead of always having to look for the
 * end event corresponding to a begin event, we create a synthetic
 * complete event that comprises the data of both from the beginning in
 * the RendererHandler.
 */
export type SyntheticCompleteEvent = TraceEventComplete;

export interface TraceEventEventTiming extends TraceEventData {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END;
  name: KnownEventName.EVENT_TIMING;
  id: string;
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      cancelable: boolean,
      duration: MilliSeconds,
      processingEnd: MilliSeconds,
      processingStart: MilliSeconds,
      timeStamp: MilliSeconds,
      interactionId?: number, type: string,
    },
  };
}

export interface TraceEventEventTimingBegin extends TraceEventEventTiming {
  ph: Phase.ASYNC_NESTABLE_START;
}
export interface TraceEventEventTimingEnd extends TraceEventEventTiming {
  ph: Phase.ASYNC_NESTABLE_END;
}

export interface TraceEventGPUTask extends TraceEventComplete {
  name: 'GPUTask';
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      /* eslint-disable @typescript-eslint/naming-convention */
      renderer_pid: ProcessID,
      used_bytes: number,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
  };
}

export interface SyntheticNetworkRedirect {
  url: string;
  priority: string;
  requestMethod?: string;
  ts: MicroSeconds;
  dur: MicroSeconds;
}

// TraceEventProcessedArgsData is used to store the processed data of a network
// request. Which is used to distinguish from the date we extract from the
// trace event directly.
interface SyntheticArgsData {
  dnsLookup: MicroSeconds;
  download: MicroSeconds;
  downloadStart: MicroSeconds;
  finishTime: MicroSeconds;
  initialConnection: MicroSeconds;
  isDiskCached: boolean;
  isHttps: boolean;
  isMemoryCached: boolean;
  isPushedResource: boolean;
  networkDuration: MicroSeconds;
  processingDuration: MicroSeconds;
  proxyNegotiation: MicroSeconds;
  queueing: MicroSeconds;
  redirectionDuration: MicroSeconds;
  requestSent: MicroSeconds;
  sendStartTime: MicroSeconds;
  ssl: MicroSeconds;
  stalled: MicroSeconds;
  totalTime: MicroSeconds;
  waiting: MicroSeconds;
}

export interface SyntheticNetworkRequest extends TraceEventComplete, SyntheticBasedEvent<Phase.COMPLETE> {
  rawSourceEvent: TraceEventResourceSendRequest;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      syntheticData: SyntheticArgsData,
      // All fields below are from TraceEventsForNetworkRequest,
      // Required fields
      /** Size of the resource after decompression (if applicable). */
      decodedBodyLength: number,
      /**
       * Size of the resource over the network. Includes size of headers and
       * anything else in the HTTP response packet.
       */
      encodedDataLength: number,
      frame: string,
      fromServiceWorker: boolean,
      isLinkPreload: boolean,
      mimeType: string,
      priority: Protocol.Network.ResourcePriority,
      initialPriority: Protocol.Network.ResourcePriority,
      /**
       * This is the protocol used to resolve the request.
       *
       * Note, this is not the same as URL.protocol.
       *
       * Example values (not exhaustive): http/0.9, http/1.0, http/1.1, http, h2, h3-Q050, data, blob
       */
      protocol: string,
      redirects: SyntheticNetworkRedirect[],
      renderBlocking: RenderBlocking,
      requestId: string,
      requestingFrameUrl: string,
      statusCode: number,
      resourceType: Protocol.Network.ResourceType,
      responseHeaders: Array<{name: string, value: string}>,
      fetchPriorityHint: FetchPriorityHint,
      url: string,
      /** True only if got a 'resourceFinish' event indicating a failure. */
      failed: boolean,
      /** True only if got a 'resourceFinish' event. */
      finished: boolean,
      connectionId: number,
      connectionReused: boolean,
      // Optional fields
      initiator?: Initiator,
      requestMethod?: string,
      timing?: TraceEventResourceReceiveResponseTimingData,
      syntheticServerTimings?: SyntheticServerTiming[],
    },
  };
  cat: 'loading';
  name: 'SyntheticNetworkRequest';
  ph: Phase.COMPLETE;
  dur: MicroSeconds;
  tdur: MicroSeconds;
  ts: MicroSeconds;
  tts: MicroSeconds;
  pid: ProcessID;
  tid: ThreadID;
}

export interface SyntheticWebSocketConnectionEvent extends TraceEventComplete, SyntheticBasedEvent<Phase.COMPLETE> {
  rawSourceEvent: TraceEventData;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      identifier: number,
      priority: Protocol.Network.ResourcePriority,
      url: string,
    },
  };
  cat: string;
  name: 'SyntheticWebSocketConnectionEvent';
  ph: Phase.COMPLETE;
  dur: MicroSeconds;
  ts: MicroSeconds;
  pid: ProcessID;
  tid: ThreadID;
  s: TraceEventScope;
}

export const enum AuctionWorkletType {
  BIDDER = 'bidder',
  SELLER = 'seller',
  // Not expected to be used, but here as a fallback in case new types get
  // added and we have yet to update the trace engine.
  UNKNOWN = 'unknown',
}

export interface SyntheticAuctionWorkletEvent extends TraceEventInstant, SyntheticBasedEvent<Phase.INSTANT> {
  rawSourceEvent: TraceEventData;
  name: 'SyntheticAuctionWorkletEvent';
  // The PID that the AuctionWorklet is running in.
  pid: ProcessID;
  // URL
  host: string;
  // An ID used to pair up runningInProcessEvents with doneWithProcessEvents
  target: string;
  type: AuctionWorkletType;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      // There are two threads for a worklet that we care about, so we gather
      // the thread_name events so we can know the PID and TID for them (and
      // hence display the right events in the track for each thread)
      utilityThread: TraceEventThreadName,
      v8HelperThread: TraceEventThreadName,
    } &
        (
              // This type looks odd, but this is because these events could either have:
              // 1. Just the DoneWithProcess event
              // 2. Just the RunningInProcess event
              // 3. Both events
              // But crucially it cannot have both events missing, hence listing all the
              // allowed cases.
              // Clang is disabled as the combination of nested types and optional
              // properties cause it to weirdly indent some of the properties and make it
              // very unreadable.
              // clang-format off
              {
                runningInProcessEvent: TraceEventAuctionWorkletRunningInProcess,
                doneWithProcessEvent: TraceEventAuctionWorkletDoneWithProcess,
              } |
              {
                runningInProcessEvent?: TraceEventAuctionWorkletRunningInProcess,
                doneWithProcessEvent: TraceEventAuctionWorkletDoneWithProcess,
              } |
              {
                doneWithProcessEvent?: TraceEventAuctionWorkletDoneWithProcess,
                runningInProcessEvent: TraceEventAuctionWorkletRunningInProcess,

              }),
    // clang-format on
  };
}
export interface TraceEventAuctionWorkletRunningInProcess extends TraceEventData {
  name: 'AuctionWorkletRunningInProcess';
  ph: Phase.INSTANT;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      host: string,
      pid: ProcessID,
      target: string,
      type: AuctionWorkletType,
    },
  };
}
export interface TraceEventAuctionWorkletDoneWithProcess extends TraceEventData {
  name: 'AuctionWorkletDoneWithProcess';
  ph: Phase.INSTANT;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      host: string,
      pid: ProcessID,
      target: string,
      type: AuctionWorkletType,
    },
  };
}

export function isTraceEventAuctionWorkletRunningInProcess(event: TraceEventData):
    event is TraceEventAuctionWorkletRunningInProcess {
  return event.name === 'AuctionWorkletRunningInProcess';
}
export function isTraceEventAuctionWorkletDoneWithProcess(event: TraceEventData):
    event is TraceEventAuctionWorkletDoneWithProcess {
  return event.name === 'AuctionWorkletDoneWithProcess';
}

// Snapshot events.

export interface TraceEventScreenshot extends TraceEventData {
  /**
   * @deprecated This value is incorrect. Use ScreenshotHandler.getPresentationTimestamp()
   */
  ts: MicroSeconds;
  /** The id is the frame sequence number in hex */
  id: string;
  args: TraceEventArgs&{
    snapshot: string,
  };
  name: KnownEventName.SCREENSHOT;
  cat: 'disabled-by-default-devtools.screenshot';
  ph: Phase.OBJECT_SNAPSHOT;
}
export function isTraceEventScreenshot(event: TraceEventData): event is TraceEventScreenshot {
  return event.name === KnownEventName.SCREENSHOT;
}

export interface SyntheticScreenshot extends TraceEventData, SyntheticBasedEvent {
  rawSourceEvent: TraceEventScreenshot;
  /** This is the correct presentation timestamp. */
  ts: MicroSeconds;
  args: TraceEventArgs&{
    dataUri: string,
  };
  name: KnownEventName.SCREENSHOT;
  cat: 'disabled-by-default-devtools.screenshot';
  ph: Phase.OBJECT_SNAPSHOT;
}

// Animation events.

export interface TraceEventAnimation extends TraceEventData {
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      nodeName?: string,
      nodeId?: Protocol.DOM.BackendNodeId,
      displayName?: string,
      id?: string,
      name?: string,
      state?: string,
      compositeFailed?: number,
      unsupportedProperties?: string[],
    },
  };
  name: 'Animation';
  id2?: {
    local?: string,
  };
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END|Phase.ASYNC_NESTABLE_INSTANT;
}

// Metadata events.

export interface TraceEventMetadata extends TraceEventData {
  ph: Phase.METADATA;
  args: TraceEventArgs&{
    name?: string,
    uptime?: string,
  };
}

export interface TraceEventThreadName extends TraceEventMetadata {
  name: KnownEventName.THREAD_NAME;
  args: TraceEventArgs&{
    name?: string,
  };
}

export interface TraceEventProcessName extends TraceEventMetadata {
  name: 'process_name';
}

// Mark events.

export interface TraceEventMark extends TraceEventData {
  ph: Phase.MARK;
}

export interface TraceEventNavigationStart extends TraceEventMark {
  name: 'navigationStart';
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      documentLoaderURL: string,
      isLoadingMainFrame: boolean,
      // isOutermostMainFrame was introduced in crrev.com/c/3625434 and exists
      // because of Fenced Frames
      // [github.com/WICG/fenced-frame/tree/master/explainer].
      // Fenced frames introduce a situation where isLoadingMainFrame could be
      // true for a navigation, but that navigation be within an embedded "main
      // frame", and therefore it wouldn't be on the top level main frame.
      // In situations where we need to distinguish that, we can rely on
      // isOutermostMainFrame, which will only be true for navigations on the
      // top level main frame.

      // This flag is optional as it was introduced in May 2022; so users
      // reasonably may import traces from before that date that do not have
      // this field present.
      isOutermostMainFrame?: boolean, navigationId: string,
      /**
       * @deprecated use documentLoaderURL for navigation events URLs
       */
      url?: string,
    },
        frame: string,
  };
}

export interface TraceEventFirstContentfulPaint extends TraceEventMark {
  name: KnownEventName.MARK_FCP;
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      navigationId: string,
    },
  };
}

export interface TraceEventFirstPaint extends TraceEventMark {
  name: 'firstPaint';
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      navigationId: string,
    },
  };
}

export type PageLoadEvent = TraceEventFirstContentfulPaint|TraceEventMarkDOMContent|TraceEventInteractiveTime|
    TraceEventLargestContentfulPaintCandidate|TraceEventLayoutShift|TraceEventFirstPaint|TraceEventMarkLoad|
    TraceEventNavigationStart;

const markerTypeGuards = [
  isTraceEventMarkDOMContent,
  isTraceEventMarkLoad,
  isTraceEventFirstPaint,
  isTraceEventFirstContentfulPaint,
  isTraceEventLargestContentfulPaintCandidate,
  isTraceEventNavigationStart,
];

export const MarkerName =
    ['MarkDOMContent', 'MarkLoad', 'firstPaint', 'firstContentfulPaint', 'largestContentfulPaint::Candidate'] as const;

export interface MarkerEvent extends TraceEventData {
  name: typeof MarkerName[number];
}

export function isTraceEventMarkerEvent(event: TraceEventData): event is MarkerEvent {
  return markerTypeGuards.some(fn => fn(event));
}

const pageLoadEventTypeGuards = [
  ...markerTypeGuards,
  isTraceEventInteractiveTime,
];

export function eventIsPageLoadEvent(event: TraceEventData): event is PageLoadEvent {
  return pageLoadEventTypeGuards.some(fn => fn(event));
}

export interface TraceEventLargestContentfulPaintCandidate extends TraceEventMark {
  name: KnownEventName.MARK_LCP_CANDIDATE;
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      candidateIndex: number,
      isOutermostMainFrame: boolean,
      isMainFrame: boolean,
      navigationId: string,
      nodeId: Protocol.DOM.BackendNodeId,
      loadingAttr: string,
      type?: string,
    },
  };
}
export interface TraceEventLargestImagePaintCandidate extends TraceEventMark {
  name: 'LargestImagePaint::Candidate';
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      candidateIndex: number,
      imageUrl: string,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      DOMNodeId: Protocol.DOM.BackendNodeId,
    },
  };
}
export interface TraceEventLargestTextPaintCandidate extends TraceEventMark {
  name: 'LargestTextPaint::Candidate';
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      candidateIndex: number,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      DOMNodeId: Protocol.DOM.BackendNodeId,
    },
  };
}

export interface TraceEventInteractiveTime extends TraceEventMark {
  name: 'InteractiveTime';
  args: TraceEventArgs&{
    args: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      total_blocking_time_ms: number,
    },
    frame: string,
  };
}

// Instant events.

export interface TraceEventInstant extends TraceEventData {
  ph: Phase.INSTANT;
  s: TraceEventScope;
}

export interface TraceEventUpdateCounters extends TraceEventInstant {
  name: 'UpdateCounters';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      documents: number,
      jsEventListeners: number,
      jsHeapSizeUsed: number,
      nodes: number,
      gpuMemoryLimitKB?: number,
    },
  };
}

export type TraceEventRendererEvent = TraceEventInstant|TraceEventComplete;

export interface TraceEventTracingStartedInBrowser extends TraceEventInstant {
  name: KnownEventName.TRACING_STARTED_IN_BROWSER;
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      frameTreeNodeId: number,
      // Frames can only missing in "fake" traces
      frames?: TraceFrame[], persistentIds: boolean,
    },
  };
}

export interface TraceEventTracingSessionIdForWorker extends TraceEventInstant {
  name: 'TracingSessionIdForWorker';
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      url: string,
      workerId: WorkerId,
      workerThreadId: ThreadID,
      frame: string,
    },
  };
}
export function isTraceEventTracingSessionIdForWorker(event: TraceEventData):
    event is TraceEventTracingSessionIdForWorker {
  return event.name === 'TracingSessionIdForWorker';
}

export interface TraceEventFrameCommittedInBrowser extends TraceEventInstant {
  name: 'FrameCommittedInBrowser';
  args: TraceEventArgs&{
    data?: TraceEventArgsData & TraceFrame,
  };
}

export interface TraceEventMainFrameViewport extends TraceEventInstant {
  name: 'PaintTimingVisualizer::Viewport';
  args: {
    data: TraceEventArgsData&{
      // eslint-disable-next-line @typescript-eslint/naming-convention
      viewport_rect: number[],
    },
  };
}

export interface TraceEventCommitLoad extends TraceEventInstant {
  name: 'CommitLoad';
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      frame: string,
      isMainFrame: boolean,
      name: string,
      nodeId: number,
      page: string,
      parent: string,
      url: string,
    },
  };
}

export interface TraceEventMarkDOMContent extends TraceEventInstant {
  name: 'MarkDOMContent';
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      frame: string,
      isMainFrame: boolean,
      isOutermostMainFrame?: boolean, page: string,
    },
  };
}

export interface TraceEventMarkLoad extends TraceEventInstant {
  name: 'MarkLoad';
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      frame: string,
      isMainFrame: boolean,
      page: string,
      isOutermostMainFrame?: boolean,
    },
  };
}

export interface TraceEventAsync extends TraceEventData {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_INSTANT|Phase.ASYNC_NESTABLE_END|Phase.ASYNC_STEP_INTO|
      Phase.ASYNC_BEGIN|Phase.ASYNC_END|Phase.ASYNC_STEP_PAST;
}

export type TraceRect = [number, number, number, number];
export type TraceImpactedNode = {
  // These keys come from the trace data, so we have to use underscores.
  /* eslint-disable @typescript-eslint/naming-convention */
  new_rect: TraceRect,
  node_id: Protocol.DOM.BackendNodeId,
  old_rect: TraceRect,
  /* eslint-enable @typescript-eslint/naming-convention */
};

type LayoutShiftData = TraceEventArgsData&{
  // These keys come from the trace data, so we have to use underscores.
  /* eslint-disable @typescript-eslint/naming-convention */
  cumulative_score: number,
  frame_max_distance: number,
  had_recent_input: boolean,
  impacted_nodes: TraceImpactedNode[] | undefined,
  is_main_frame: boolean,
  overall_max_distance: number,
  region_rects: TraceRect[],
  score: number,
  weighted_score_delta: number,
  navigationId?: string,
  /* eslint-enable @typescript-eslint/naming-convention */
};
// These keys come from the trace data, so we have to use underscores.
export interface TraceEventLayoutShift extends TraceEventInstant {
  name: 'LayoutShift';
  normalized?: boolean;
  args: TraceEventArgs&{
    frame: string,
    data?: LayoutShiftData,
  };
}

interface LayoutShiftSessionWindowData {
  // The sum of the weighted score of all the shifts
  // that belong to a session window.
  cumulativeWindowScore: number;
  // A consecutive generated in the frontend to
  // to identify a session window.
  id: number;
}
export interface LayoutShiftParsedData {
  screenshotSource?: string;
  timeFromNavigation?: MicroSeconds;
  // The sum of the weighted scores of the shifts that
  // belong to a session window up until this shift
  // (inclusive).
  cumulativeWeightedScoreInWindow: number;
  sessionWindowData: LayoutShiftSessionWindowData;
}
export interface SyntheticLayoutShift extends TraceEventLayoutShift, SyntheticBasedEvent<Phase.INSTANT> {
  name: 'LayoutShift';
  rawSourceEvent: TraceEventLayoutShift;
  args: TraceEventArgs&{
    frame: string,
    data?: LayoutShiftData&{
      rawEvent: TraceEventLayoutShift,
    },
  };
  parsedData: LayoutShiftParsedData;
}

/**
 * This is a synthetic Layout shift cluster. Not based on a raw event as there's no concept
 * of this as a trace event.
 */
export interface SyntheticLayoutShiftCluster {
  name: 'SyntheticLayoutShiftCluster';
  clusterWindow: TraceWindowMicroSeconds;
  clusterCumulativeScore: number;
  events: SyntheticLayoutShift[];
  // For convenience we split apart the cluster into good, NI, and bad windows.
  // Since a cluster may remain in the good window, we mark NI and bad as being
  // possibly null.
  scoreWindows: {
    good: TraceWindowMicroSeconds,
    needsImprovement?: TraceWindowMicroSeconds,
    bad?: TraceWindowMicroSeconds,
  };
  // The last navigation that happened before this cluster.
  navigationId?: string;
  worstShiftEvent?: TraceEventData;
  // This is the start of the cluster: the start of the first layout shift of the cluster.
  ts: MicroSeconds;
  // The duration of the cluster. This should include up until the end of the last
  // layout shift in this cluster.
  dur?: MicroSeconds;
  cat: '';
  ph: Phase.COMPLETE;
  pid: ProcessID;
  tid: ThreadID;
}

export type FetchPriorityHint = 'low'|'high'|'auto';
export type RenderBlocking = 'blocking'|'non_blocking'|'in_body_parser_blocking'|'potentially_blocking';

export interface Initiator {
  type: Protocol.Network.InitiatorType;
  fetchType: string;
  columnNumber?: number;
  lineNumber?: number;
  url?: string;
}

export interface TraceEventResourceSendRequest extends TraceEventInstant {
  name: 'ResourceSendRequest';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      requestId: string,
      url: string,
      priority: Protocol.Network.ResourcePriority,
      resourceType: Protocol.Network.ResourceType,
      fetchPriorityHint: FetchPriorityHint,
      // TODO(crbug.com/1457985): change requestMethod to enum when confirm in the backend code.
      requestMethod?: string,
      renderBlocking?: RenderBlocking,
      initiator?: Initiator,
      isLinkPreload?: boolean,
    },
  };
}

export interface TraceEventResourceChangePriority extends TraceEventInstant {
  name: 'ResourceChangePriority';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      requestId: string,
      priority: Protocol.Network.ResourcePriority,
    },
  };
}

export interface TraceEventResourceWillSendRequest extends TraceEventInstant {
  name: 'ResourceWillSendRequest';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      requestId: string,
    },
  };
}

export interface TraceEventResourceFinish extends TraceEventInstant {
  name: 'ResourceFinish';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      decodedBodyLength: number,
      didFail: boolean,
      encodedDataLength: number,
      finishTime: Seconds,
      requestId: string,
    },
  };
}

export interface TraceEventResourceReceivedData extends TraceEventInstant {
  name: 'ResourceReceivedData';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      encodedDataLength: number,
      frame: string,
      requestId: string,
    },
  };
}

interface TraceEventResourceReceiveResponseTimingData {
  connectEnd: MilliSeconds;
  connectStart: MilliSeconds;
  dnsEnd: MilliSeconds;
  dnsStart: MilliSeconds;
  proxyEnd: MilliSeconds;
  proxyStart: MilliSeconds;
  pushEnd: MilliSeconds;
  pushStart: MilliSeconds;
  receiveHeadersEnd: MilliSeconds;
  receiveHeadersStart: MilliSeconds;
  requestTime: Seconds;
  sendEnd: MilliSeconds;
  sendStart: MilliSeconds;
  sslEnd: MilliSeconds;
  sslStart: MilliSeconds;
  workerReady: MilliSeconds;
  workerStart: MilliSeconds;
}

export interface TraceEventResourceReceiveResponse extends TraceEventInstant {
  name: 'ResourceReceiveResponse';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      /**
       * This is the protocol used to resolve the request.
       *
       * Note, this is not the same as URL.protocol.
       *
       * Example values (not exhaustive): http/0.9, http/1.0, http/1.1, http, h2, h3-Q050, data, blob
       */
      protocol: string,
      encodedDataLength: number,
      frame: string,
      fromCache: boolean,
      fromServiceWorker: boolean,
      mimeType: string,
      requestId: string,
      responseTime: MilliSeconds,
      statusCode: number,
      // Some cached events don't have this field
      timing?: TraceEventResourceReceiveResponseTimingData, connectionId: number, connectionReused: boolean,
      headers?: Array<{name: string, value: string}>,
    },
  };
}

export interface TraceEventResourceMarkAsCached extends TraceEventInstant {
  name: 'ResourceMarkAsCached';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      requestId: string,
    },
  };
}

export const enum LayoutInvalidationReason {
  SIZE_CHANGED = 'Size changed',
  ATTRIBUTE = 'Attribute',
  ADDED_TO_LAYOUT = 'Added to layout',
  SCROLLBAR_CHANGED = 'Scrollbar changed',
  REMOVED_FROM_LAYOUT = 'Removed from layout',
  STYLE_CHANGED = 'Style changed',
  FONTS_CHANGED = 'Fonts changed',
  UNKNOWN = 'Unknown',
}

export interface TraceEventLayoutInvalidationTracking extends TraceEventInstant {
  name: KnownEventName.LAYOUT_INVALIDATION_TRACKING;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      reason: LayoutInvalidationReason,
      nodeName?: string,
    },
  };
}

export interface TraceEventScheduleStyleInvalidationTracking extends TraceEventInstant {
  name: KnownEventName.SCHEDULE_STYLE_INVALIDATION_TRACKING;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      invalidationSet?: string,
      invalidatedSelectorId?: string,
      reason?: LayoutInvalidationReason,
      changedClass?: string,
      changedAttribute?: string,
      changedId?: string,
      nodeName?: string,
      stackTrace?: TraceEventCallFrame[],
    },
  };
}
export function isTraceEventScheduleStyleInvalidationTracking(event: TraceEventData):
    event is TraceEventScheduleStyleInvalidationTracking {
  return event.name === KnownEventName.SCHEDULE_STYLE_INVALIDATION_TRACKING;
}

export const enum StyleRecalcInvalidationReason {
  ANIMATION = 'Animation',
}

export interface TraceEventStyleRecalcInvalidationTracking extends TraceEventInstant {
  name: KnownEventName.STYLE_RECALC_INVALIDATION_TRACKING;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      reason: StyleRecalcInvalidationReason,
      subtree: boolean,
      nodeName?: string,
      extraData?: string,
    },
  };
}

export function isTraceEventStyleRecalcInvalidationTracking(event: TraceEventData):
    event is TraceEventStyleRecalcInvalidationTracking {
  return event.name === KnownEventName.STYLE_RECALC_INVALIDATION_TRACKING;
}
export interface TraceEventStyleInvalidatorInvalidationTracking extends TraceEventInstant {
  name: KnownEventName.STYLE_INVALIDATOR_INVALIDATION_TRACKING;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      reason: string,
      invalidationList: Array<{classes?: string[], id: string}>,
      subtree: boolean,
      nodeName?: string,
      extraData?: string,
    },
  };
}
export function isTraceEventStyleInvalidatorInvalidationTracking(event: TraceEventData):
    event is TraceEventStyleInvalidatorInvalidationTracking {
  return event.name === KnownEventName.STYLE_INVALIDATOR_INVALIDATION_TRACKING;
}

export interface TraceEventBeginCommitCompositorFrame extends TraceEventInstant {
  name: KnownEventName.BEGIN_COMMIT_COMPOSITOR_FRAME;
  args: TraceEventArgs&{
    frame: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    is_mobile_optimized: boolean,
  };
}
export function isTraceEventBeginCommitCompositorFrame(event: TraceEventData):
    event is TraceEventBeginCommitCompositorFrame {
  return event.name === KnownEventName.BEGIN_COMMIT_COMPOSITOR_FRAME;
}

export interface TraceEventParseMetaViewport extends TraceEventInstant {
  name: KnownEventName.PARSE_META_VIEWPORT;
  args: TraceEventArgs&{
    data: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      node_id: Protocol.DOM.BackendNodeId,
      content: string,
      frame?: string,
    },
  };
}
export function isTraceEventParseMetaViewport(event: TraceEventData): event is TraceEventParseMetaViewport {
  return event.name === KnownEventName.PARSE_META_VIEWPORT;
}

export interface TraceEventScheduleStyleRecalculation extends TraceEventInstant {
  name: KnownEventName.SCHEDULE_STYLE_RECALCULATION;
  args: TraceEventArgs&{
    data: {
      frame: string,
    },
  };
}
export function isTraceEventScheduleStyleRecalculation(event: TraceEventData):
    event is TraceEventScheduleStyleRecalculation {
  return event.name === KnownEventName.SCHEDULE_STYLE_RECALCULATION;
}

export interface TraceEventRenderFrameImplCreateChildFrame extends TraceEventData {
  name: KnownEventName.RENDER_FRAME_IMPL_CREATE_CHILD_FRAME;
  /* eslint-disable @typescript-eslint/naming-convention */
  args: TraceEventArgs&{
    child_frame_token: string,
    frame_token: string,
  };
}
export function isTraceEventRenderFrameImplCreateChildFrame(event: TraceEventData):
    event is TraceEventRenderFrameImplCreateChildFrame {
  return event.name === KnownEventName.RENDER_FRAME_IMPL_CREATE_CHILD_FRAME;
}

export interface TraceEventPrePaint extends TraceEventComplete {
  name: 'PrePaint';
}

export interface TraceEventPairableAsync extends TraceEventData {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END|Phase.ASYNC_NESTABLE_INSTANT;
  // The id2 field gives flexibility to explicitly specify if an event
  // id is global among processes or process local. However not all
  // events use it, so both kind of ids need to be marked as optional.
  id2?: {local?: string, global?: string};
  id?: string;
}
export interface TraceEventPairableAsyncBegin extends TraceEventPairableAsync {
  ph: Phase.ASYNC_NESTABLE_START;
}

export interface TraceEventPairableAsyncInstant extends TraceEventPairableAsync {
  ph: Phase.ASYNC_NESTABLE_INSTANT;
}

export interface TraceEventPairableAsyncEnd extends TraceEventPairableAsync {
  ph: Phase.ASYNC_NESTABLE_END;
}

export interface TraceEventUserTiming extends TraceEventData {
  id2?: {local?: string, global?: string};
  id?: string;
  cat: 'blink.user_timing';
  // Note that the timestamp for user timing trace events is set to the
  // start time passed by the user at the call site of the timing (based
  // on the UserTiming spec).
  // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/performance_user_timing.cc;l=236;drc=494419358caf690316f160a1f27d9e771a14c033
}

export interface TraceEventDomLoading extends TraceEventUserTiming {
  name: KnownEventName.DOM_LOADING;
  args: TraceEventArgs&{
    frame?: string,
  };
}

export interface TraceEventBeginRemoteFontLoad extends TraceEventUserTiming {
  name: KnownEventName.BEGIN_REMOTE_FONT_LOAD;
  args: TraceEventArgs&{
    display: string,
    id: number,
  };
}

export type TraceEventPairableUserTiming = TraceEventUserTiming&TraceEventPairableAsync;

export interface TraceEventPerformanceMeasureBegin extends TraceEventPairableUserTiming {
  args: TraceEventArgs&{
    detail?: string,
    stackTrace?: TraceEventCallFrame[],
  };
  ph: Phase.ASYNC_NESTABLE_START;
}

export type TraceEventPerformanceMeasureEnd = TraceEventPairableUserTiming&TraceEventPairableAsyncEnd;
export type TraceEventPerformanceMeasure = TraceEventPerformanceMeasureBegin|TraceEventPerformanceMeasureEnd;

export interface TraceEventPerformanceMark extends TraceEventUserTiming {
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      detail?: string,
      stackTrace?: TraceEventCallFrame[],
    },
  };
  ph: Phase.INSTANT|Phase.MARK|Phase.ASYNC_NESTABLE_INSTANT;
}

export interface TraceEventConsoleTimeBegin extends TraceEventPairableAsyncBegin {
  cat: 'blink.console';
}

export interface TraceEventConsoleTimeEnd extends TraceEventPairableAsyncEnd {
  cat: 'blink.console';
}

export type TraceEventConsoleTime = TraceEventConsoleTimeBegin|TraceEventConsoleTimeEnd;

export interface TraceEventTimeStamp extends TraceEventData {
  cat: 'devtools.timeline';
  name: 'TimeStamp';
  ph: Phase.INSTANT;
  id: string;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      message: string,
    },
  };
}

export interface TraceEventTargetRundown extends TraceEventData {
  cat: 'disabled-by-default-devtools.target-rundown';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      frameType: string,
      url: string,
      isolate: string,
      v8context: string,
      origin: string,
      scriptId: number,
      isDefault?: boolean,
      contextType?: string,
    },
  };
}

export function isTraceEventTargetRundown(traceEventData: TraceEventData): traceEventData is TraceEventTargetRundown {
  if (traceEventData.cat !== 'disabled-by-default-devtools.target-rundown') {
    return false;
  }
  const data = traceEventData.args?.data;
  if (!data) {
    return false;
  }
  return 'frame' in data && 'frameType' in data && 'url' in data && 'isolate' in data && 'v8context' in data &&
      'scriptId' in data;
}

export interface TraceEventScriptRundown extends TraceEventData {
  cat: 'disabled-by-default-devtools.v8-source-rundown';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      isolate: string,
      executionContextId: number,
      scriptId: number,
      startLine: number,
      startColumn: number,
      endLine: number,
      endColumn: number,
      url: string,
      hash: string,
      isModule: boolean,
      hasSourceUrl: boolean,
      sourceMapUrl?: string,
    },
  };
}

export function isTraceEventScriptRundown(traceEventData: TraceEventData): traceEventData is TraceEventScriptRundown {
  if (traceEventData.cat !== 'disabled-by-default-devtools.v8-source-rundown') {
    return false;
  }
  const data = traceEventData.args?.data;
  if (!data) {
    return false;
  }
  return 'isolate' in data && 'executionContextId' in data && 'scriptId' in data && 'startLine' in data &&
      'startColumn' in data && 'endLine' in data && 'endColumn' in data && 'hash' in data && 'isModule' in data &&
      'hasSourceUrl' in data;
}

export interface TraceEventScriptRundownSource extends TraceEventData {
  cat: 'disabled-by-default-devtools.v8-source-rundown-sources';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      isolate: string,
      scriptId: number,
      length?: number,
      sourceText?: string,
    },
  };
}

export function isTraceEventScriptRundownSource(traceEventData: TraceEventData):
    traceEventData is TraceEventScriptRundownSource {
  if (traceEventData.cat !== 'disabled-by-default-devtools.v8-source-rundown-sources') {
    return false;
  }
  const data = traceEventData.args?.data;
  if (!data) {
    return false;
  }
  return 'isolate' in data && 'scriptId' in data && 'sourceText' in data;
}

/** ChromeFrameReporter args for PipelineReporter event.
    Matching proto: https://source.chromium.org/chromium/chromium/src/+/main:third_party/perfetto/protos/perfetto/trace/track_event/chrome_frame_reporter.proto
 */
/* eslint-disable @typescript-eslint/naming-convention */
interface ChromeFrameReporter {
  state: State;
  enum: FrameDropReason;
  /** The reason is set only if |state| is not |STATE_UPDATED_ALL|. */
  reason: FrameDropReason;
  frame_source: number;
  /**  Identifies a BeginFrameArgs (along with the source_id).
       See comments in components/viz/common/frame_sinks/begin_frame_args.h. */
  frame_sequence: number;
  /**  If this is a droped frame (i.e. if |state| is set to |STATE_DROPPED| or
       |STATE_PRESENTED_PARTIAL|), then indicates whether this frame impacts smoothness. */
  affects_smoothness: boolean;
  /** The type of active scroll. */
  scroll_state: ScrollState;
  /** If any main thread animation is active during this frame. */
  has_main_animation: boolean;
  /** If any compositor thread animation is active during this frame. */
  has_compositor_animation: boolean;
  /** If any touch-driven UX (not scroll) is active during this frame. */
  has_smooth_input_main: boolean;
  /**  Whether the frame contained any missing content (i.e. whether there was
       checkerboarding in the frame). */
  has_missing_content: boolean;
  /** The id of layer_tree_host that the frame has been produced for. */
  layer_tree_host_id: number;
  /** If total latency of PipelineReporter exceeds a certain limit. */
  has_high_latency: boolean;
  /**  Indicate if the frame is "FORKED" (i.e. a PipelineReporter event starts at
       the same frame sequence as another PipelineReporter) or "BACKFILL"
       (i.e. dropped frames when there are no partial compositor updates). */
  frame_type: FrameType;
  /**  The breakdown stage of PipelineReporter that is most likely accountable for
       high latency. */
  high_latency_contribution_stage: string[];
}
const enum State {
  /** The frame did not have any updates to present. **/
  STATE_NO_UPDATE_DESIRED = 'STATE_NO_UPDATE_DESIRED',
  /**  The frame presented all the desired updates (i.e. any updates requested
       from both the compositor thread and main-threads were handled). **/
  STATE_PRESENTED_ALL = 'STATE_PRESENTED_ALL',
  /**  The frame was presented with some updates, but also missed some updates
       (e.g. missed updates from the main-thread, but included updates from the
        compositor thread). **/
  STATE_PRESENTED_PARTIAL = 'STATE_PRESENTED_PARTIAL',
  /**  The frame was dropped, i.e. some updates were desired for the frame, but
       was not presented. **/
  STATE_DROPPED = 'STATE_DROPPED',
}

const enum FrameDropReason {
  REASON_UNSPECIFIED = 'REASON_UNSPECIFIED',
  /**  Frame was dropped by the display-compositor.
         The display-compositor may drop a frame some times (e.g. the frame missed
        the deadline, or was blocked on surface-sync, etc.) **/
  REASON_DISPLAY_COMPOSITOR = 'REASON_DISPLAY_COMPOSITOR',
  /**  Frame was dropped because of the main-thread.
         The main-thread may cause a frame to be dropped, e.g. if the main-thread
        is running expensive javascript, or doing a lot of layout updates, etc. **/
  REASON_MAIN_THREAD = 'REASON_MAIN_THREAD',
  /**  Frame was dropped by the client compositor.
         The client compositor can drop some frames too (e.g. attempting to
         recover latency, missing the deadline, etc.). **/
  REASON_CLIENT_COMPOSITOR = 'REASON_CLIENT_COMPOSITOR',
}

const enum ScrollState {
  SCROLL_NONE = 'SCROLL_NONE',
  SCROLL_MAIN_THREAD = 'SCROLL_MAIN_THREAD',
  SCROLL_COMPOSITOR_THREAD = 'SCROLL_COMPOSITOR_THREAD',

  /** Used when it can't be determined whether a scroll is in progress or not. */
  SCROLL_UNKNOWN = 'SCROLL_UNKNOWN',
}
const enum FrameType {
  FORKED = 'FORKED',
  BACKFILL = 'BACKFILL',
}

export interface TraceEventPipelineReporter extends TraceEventData {
  id2?: {
    local?: string,
  };
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END;
  args: TraceEventArgs&{
    chrome_frame_reporter: ChromeFrameReporter,
  };
}

export function isTraceEventPipelineReporter(event: TraceEventData): event is TraceEventPipelineReporter {
  return event.name === KnownEventName.PIPELINE_REPORTER;
}

// A type used for synthetic events created based on a raw trace event.
// A branded type is used to ensure not all events can be typed as
// SyntheticBasedEvent and prevent places different to the
// SyntheticEventsManager from creating synthetic events. This is
// because synthetic events need to be registered in order to resolve
// serialized event keys into event objects, so we ensure events are
// registered at the time they are created by the SyntheticEventsManager.
export interface SyntheticBasedEvent<Ph extends Phase = Phase> extends TraceEventData {
  ph: Ph;
  rawSourceEvent: TraceEventData;
  _tag: 'SyntheticEntryTag';
}

export function isSyntheticBasedEvent(event: TraceEventData): event is SyntheticBasedEvent {
  return 'rawSourceEvent' in event;
}

// Nestable async events with a duration are made up of two distinct
// events: the begin, and the end. We need both of them to be able to
// display the right information, so we create these synthetic events.
export interface SyntheticEventPair<T extends TraceEventPairableAsync = TraceEventPairableAsync> extends
    SyntheticBasedEvent {
  rawSourceEvent: TraceEventData;
  name: T['name'];
  cat: T['cat'];
  id?: string;
  id2?: {local?: string, global?: string};

  dur: MicroSeconds;
  args: TraceEventArgs&{
    data: {
      beginEvent: T & TraceEventPairableAsyncBegin,
      endEvent: T&TraceEventPairableAsyncEnd,
      instantEvents?: Array<T&TraceEventPairableAsyncInstant>,
    },
  };
}

export type SyntheticPipelineReporterPair = SyntheticEventPair<TraceEventPipelineReporter>;

export type SyntheticUserTimingPair = SyntheticEventPair<TraceEventPerformanceMeasure>;

export type SyntheticConsoleTimingPair = SyntheticEventPair<TraceEventConsoleTime>;

export type SyntheticAnimationPair = SyntheticEventPair<TraceEventAnimation>;

export interface SyntheticInteractionPair extends SyntheticEventPair<TraceEventEventTiming> {
  // InteractionID and type are available within the beginEvent's data, but we
  // put them on the top level for ease of access.
  interactionId: number;
  type: string;
  // This is equivalent to startEvent.ts;
  ts: MicroSeconds;
  // This duration can be calculated via endEvent.ts - startEvent.ts, but we do
  // that and put it here to make it easier. This also makes these events
  // consistent with real events that have a dur field.
  dur: MicroSeconds;
  // These values are provided in the startEvent's args.data field as
  // millisecond values, but during the handler phase we parse these into
  // microseconds and put them on the top level for easy access.
  processingStart: MicroSeconds;
  processingEnd: MicroSeconds;
  // These 3 values represent the breakdown of the parts of an interaction:
  // 1. inputDelay: time from the user clicking to the input being handled
  inputDelay: MicroSeconds;
  // 2. mainThreadHandling: time spent processing the event handler
  mainThreadHandling: MicroSeconds;
  // 3. presentationDelay: delay between the event being processed and the frame being rendered
  presentationDelay: MicroSeconds;
}

/**
 * A profile call created in the frontend from samples disguised as a
 * trace event.
 *
 * We store the sampleIndex, profileId and nodeId so that we can easily link
 * back a Synthetic Trace Entry to an indivdual Sample trace event within a
 * Profile.
 *
 * Because a sample contains a set of call frames representing the stack at the
 * point in time that the sample was created, we also have to store the ID of
 * the Node that points to the function call that this profile call represents.
 */
export interface SyntheticProfileCall extends TraceEventData {
  callFrame: Protocol.Runtime.CallFrame;
  nodeId: Protocol.integer;
  sampleIndex: number;
  profileId: ProfileID;
}

/**
 * A synthetic event created from the Server-Timing header of network
 * request. In order to create these synthetic events, the corresponding
 * metric (timing) in the header must contain a "start" param, which
 * corresponds to the timestamp of the metric in the server. The
 * ServerTimingsHandler implements a heuristic to estimate the offset
 * between the client clock and the server clock so that the server
 * timestamp can be translated to the tracing clock.
 */
export interface SyntheticServerTiming<T extends Phase = Phase.COMPLETE> extends SyntheticBasedEvent<T> {
  rawSourceEvent: TraceEventResourceSendRequest;
  cat: 'devtools.server-timing';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      desc?: string, origin: string,
    },
  };
}

/**
 * A JS Sample reflects a single sample from the V8 CPU Profile
 */
export interface SyntheticJSSample extends TraceEventData {
  name: KnownEventName.JS_SAMPLE;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      stackTrace: Protocol.Runtime.CallFrame[],
    },
  };
  ph: Phase.INSTANT;
}

export function isSyntheticInteractionEvent(event: TraceEventData): event is SyntheticInteractionPair {
  return Boolean(
      'interactionId' in event && event.args?.data && 'beginEvent' in event.args.data && 'endEvent' in event.args.data);
}

// Events relating to frames.

export interface TraceEventDrawFrame extends TraceEventInstant {
  name: KnownEventName.DRAW_FRAME;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
  };
}

export function isTraceEventDrawFrame(event: TraceEventData): event is TraceEventDrawFrame {
  // The extra check for INSTANT here is because in the past DrawFrame events had an ASYNC_NESTABLE_START and ASYNC_NESTABLE_END pair. We don't want to support those old events, so we have to check we are dealing with an instant event.
  return event.name === KnownEventName.DRAW_FRAME && event.ph === Phase.INSTANT;
}
export interface TraceEventLegacyDrawFrameBegin extends TraceEventAsync {
  name: KnownEventName.DRAW_FRAME;
  ph: Phase.ASYNC_NESTABLE_START;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
  };
}
export function isLegacyTraceEventDrawFrameBegin(event: TraceEventData): event is TraceEventLegacyDrawFrameBegin {
  return event.name === KnownEventName.DRAW_FRAME && event.ph === Phase.ASYNC_NESTABLE_START;
}

export interface TraceEventBeginFrame extends TraceEventInstant {
  name: KnownEventName.BEGIN_FRAME;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
  };
}
export function isTraceEventBeginFrame(event: TraceEventData): event is TraceEventBeginFrame {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === KnownEventName.BEGIN_FRAME && event.args && 'frameSeqId' in event.args);
}

export interface TraceEventDroppedFrame extends TraceEventInstant {
  name: KnownEventName.DROPPED_FRAME;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
    hasPartialUpdate?: boolean,
  };
}
export function isTraceEventDroppedFrame(event: TraceEventData): event is TraceEventDroppedFrame {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === KnownEventName.DROPPED_FRAME && event.args && 'frameSeqId' in event.args);
}

export interface TraceEventRequestMainThreadFrame extends TraceEventInstant {
  name: KnownEventName.REQUEST_MAIN_THREAD_FRAME;
  args: TraceEventArgs&{
    layerTreeId: number,
  };
}
export function isTraceEventRequestMainThreadFrame(event: TraceEventData): event is TraceEventRequestMainThreadFrame {
  return event.name === KnownEventName.REQUEST_MAIN_THREAD_FRAME;
}

export interface TraceEventBeginMainThreadFrame extends TraceEventInstant {
  name: KnownEventName.BEGIN_MAIN_THREAD_FRAME;
  args: TraceEventArgs&{
    layerTreeId: number,
    data: TraceEventArgsData&{
      frameId?: number,
    },
  };
}
export function isTraceEventBeginMainThreadFrame(event: TraceEventData): event is TraceEventBeginMainThreadFrame {
  return event.name === KnownEventName.BEGIN_MAIN_THREAD_FRAME;
}

export interface TraceEventNeedsBeginFrameChanged extends TraceEventInstant {
  name: KnownEventName.NEEDS_BEGIN_FRAME_CHANGED;
  args: TraceEventArgs&{
    layerTreeId: number,
    data: TraceEventArgsData&{
      needsBeginFrame: number,
    },
  };
}
export function isTraceEventNeedsBeginFrameChanged(event: TraceEventData): event is TraceEventNeedsBeginFrameChanged {
  return event.name === KnownEventName.NEEDS_BEGIN_FRAME_CHANGED;
}

export interface TraceEventCommit extends TraceEventInstant {
  name: KnownEventName.COMMIT;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
  };
}
export function isTraceEventCommit(event: TraceEventData): event is TraceEventCommit {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === KnownEventName.COMMIT && event.args && 'frameSeqId' in event.args);
}

export interface TraceEventRasterTask extends TraceEventComplete {
  name: KnownEventName.RASTER_TASK;
  args: TraceEventArgs&{
    tileData?: {
      layerId: number,
      sourceFrameNumber: number,
      tileId: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        id_ref: string,
      },
      tileResolution: string,
    },
  };
}
export function isTraceEventRasterTask(event: TraceEventData): event is TraceEventRasterTask {
  return event.name === KnownEventName.RASTER_TASK;
}

// CompositeLayers has been replaced by "Commit", but we support both to not break old traces being imported.
export interface TraceEventCompositeLayers extends TraceEventInstant {
  name: KnownEventName.COMPOSITE_LAYERS;
  args: TraceEventArgs&{
    layerTreeId: number,
  };
}
export function isTraceEventCompositeLayers(event: TraceEventData): event is TraceEventCompositeLayers {
  return event.name === KnownEventName.COMPOSITE_LAYERS;
}

export interface TraceEventActivateLayerTree extends TraceEventInstant {
  name: KnownEventName.ACTIVATE_LAYER_TREE;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameId: number,
  };
}
export function isTraceEventActivateLayerTree(event: TraceEventData): event is TraceEventActivateLayerTree {
  return event.name === KnownEventName.ACTIVATE_LAYER_TREE;
}

export type InvalidationTrackingEvent =
    TraceEventScheduleStyleInvalidationTracking|TraceEventStyleRecalcInvalidationTracking|
    TraceEventStyleInvalidatorInvalidationTracking|TraceEventLayoutInvalidationTracking;

export function isTraceEventInvalidationTracking(event: TraceEventData): event is InvalidationTrackingEvent {
  return isTraceEventScheduleStyleInvalidationTracking(event) || isTraceEventStyleRecalcInvalidationTracking(event) ||
      isTraceEventStyleInvalidatorInvalidationTracking(event) || isTraceEventLayoutInvalidationTracking(event);
}

export interface TraceEventDrawLazyPixelRef extends TraceEventInstant {
  name: KnownEventName.DRAW_LAZY_PIXEL_REF;
  args?: TraceEventArgs&{
    // eslint-disable-next-line @typescript-eslint/naming-convention
    LazyPixelRef: number,
  };
}
export function isTraceEventDrawLazyPixelRef(event: TraceEventData): event is TraceEventDrawLazyPixelRef {
  return event.name === KnownEventName.DRAW_LAZY_PIXEL_REF;
}

export interface TraceEventDecodeLazyPixelRef extends TraceEventInstant {
  name: KnownEventName.DECODE_LAZY_PIXEL_REF;
  args?: TraceEventArgs&{
    // eslint-disable-next-line @typescript-eslint/naming-convention
    LazyPixelRef: number,
  };
}
export function isTraceEventDecodeLazyPixelRef(event: TraceEventData): event is TraceEventDecodeLazyPixelRef {
  return event.name === KnownEventName.DECODE_LAZY_PIXEL_REF;
}

export interface TraceEventDecodeImage extends TraceEventComplete {
  name: KnownEventName.DECODE_IMAGE;
  args: TraceEventArgs&{
    imageType: string,
  };
}
export function isTraceEventDecodeImage(event: TraceEventData): event is TraceEventDecodeImage {
  return event.name === KnownEventName.DECODE_IMAGE;
}

export interface SelectorTiming {
  'elapsed (us)': number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'fast_reject_count': number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'match_attempts': number;
  'selector': string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'style_sheet_id': string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'match_count': number;
}

export enum SelectorTimingsKey {
  Elapsed = 'elapsed (us)',
  RejectPercentage = 'reject_percentage',
  FastRejectCount = 'fast_reject_count',
  MatchAttempts = 'match_attempts',
  MatchCount = 'match_count',
  Selector = 'selector',
  StyleSheetId = 'style_sheet_id',
}

export interface SelectorStats {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  selector_timings: SelectorTiming[];
}

export interface TraceEventSelectorStats extends TraceEventComplete {
  name: KnownEventName.SELECTOR_STATS;
  args: TraceEventArgs&{
    // eslint-disable-next-line @typescript-eslint/naming-convention
    selector_stats?: SelectorStats,
  };
}

export function isTraceEventSelectorStats(event: TraceEventData): event is TraceEventSelectorStats {
  return event.name === KnownEventName.SELECTOR_STATS;
}

export interface TraceEventUpdateLayoutTree extends TraceEventComplete {
  name: KnownEventName.UPDATE_LAYOUT_TREE;
  args: TraceEventArgs&{
    elementCount: number,
    beginData?: {
      frame: string,
      stackTrace?: TraceEventCallFrame[],
    },
  };
}
export function isTraceEventUpdateLayoutTree(event: TraceEventData): event is TraceEventUpdateLayoutTree {
  return event.name === KnownEventName.UPDATE_LAYOUT_TREE;
}

export interface TraceEventLayout extends TraceEventComplete {
  name: KnownEventName.LAYOUT;
  args: TraceEventArgs&{
    beginData: {
      frame: string,
      dirtyObjects: number,
      partialLayout: boolean,
      totalObjects: number,
    },
    // endData is not reliably populated.
    // Why? TBD. https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/frame/local_frame_view.cc;l=847-851;drc=8b6aaad8027390ce6b32d82d57328e93f34bb8e5
    endData?: {
      layoutRoots: Array<{
        depth: number,
        nodeId: Protocol.DOM.BackendNodeId,
        quads: number[][],
      }>,
    },
  };
}
export function isTraceEventLayout(event: TraceEventData): event is TraceEventLayout {
  return event.name === KnownEventName.LAYOUT;
}
export interface TraceEventInvalidateLayout extends TraceEventInstant {
  name: KnownEventName.INVALIDATE_LAYOUT;
  args: TraceEventArgs&{
    data: {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
    },
  };
}
export function isTraceEventInvalidateLayout(event: TraceEventData): event is TraceEventInvalidateLayout {
  return event.name === KnownEventName.INVALIDATE_LAYOUT;
}

class ProfileIdTag {
  readonly #profileIdTag: (symbol|undefined);
}
export type ProfileID = string&ProfileIdTag;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function ProfileID(value: string): ProfileID {
  return value as ProfileID;
}

class CallFrameIdTag {
  readonly #callFrameIdTag: (symbol|undefined);
}
export type CallFrameID = number&CallFrameIdTag;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function CallFrameID(value: number): CallFrameID {
  return value as CallFrameID;
}

class SampleIndexTag {
  readonly #sampleIndexTag: (symbol|undefined);
}
export type SampleIndex = number&SampleIndexTag;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function SampleIndex(value: number): SampleIndex {
  return value as SampleIndex;
}

class ProcessIdTag {
  readonly #processIdTag: (symbol|undefined);
}
export type ProcessID = number&ProcessIdTag;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function ProcessID(value: number): ProcessID {
  return value as ProcessID;
}

class ThreadIdTag {
  readonly #threadIdTag: (symbol|undefined);
}
export type ThreadID = number&ThreadIdTag;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function ThreadID(value: number): ThreadID {
  return value as ThreadID;
}

class WorkerIdTag {
  readonly #workerIdTag: (symbol|undefined);
}
export type WorkerId = string&WorkerIdTag;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function WorkerId(value: string): WorkerId {
  return value as WorkerId;
}

export function isTraceEventComplete(event: TraceEventData): event is TraceEventComplete {
  return event.ph === Phase.COMPLETE;
}

export function isTraceEventBegin(event: TraceEventData): event is TraceEventBegin {
  return event.ph === Phase.BEGIN;
}

export function isTraceEventEnd(event: TraceEventData): event is TraceEventEnd {
  return event.ph === Phase.END;
}

export function isTraceEventDispatch(event: TraceEventData): event is TraceEventDispatch {
  return event.name === 'EventDispatch';
}

export function isTraceEventInstant(event: TraceEventData): event is TraceEventInstant {
  return event.ph === Phase.INSTANT;
}

export function isTraceEventRendererEvent(event: TraceEventData): event is TraceEventRendererEvent {
  return isTraceEventInstant(event) || isTraceEventComplete(event);
}

export function isTraceEventFireIdleCallback(event: TraceEventData): event is TraceEventFireIdleCallback {
  return event.name === 'FireIdleCallback';
}

export function isTraceEventSchedulePostMessage(event: TraceEventData): event is TraceEventSchedulePostMessage {
  return event.name === KnownEventName.SCHEDULE_POST_MESSAGE;
}

export function isTraceEventHandlePostMessage(event: TraceEventData): event is TraceEventHandlePostMessage {
  return event.name === KnownEventName.HANDLE_POST_MESSAGE;
}

export function isTraceEventUpdateCounters(event: TraceEventData): event is TraceEventUpdateCounters {
  return event.name === 'UpdateCounters';
}

export function isThreadName(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventThreadName {
  return traceEventData.name === KnownEventName.THREAD_NAME;
}

export function isProcessName(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventProcessName {
  return traceEventData.name === 'process_name';
}

export function isTraceEventTracingStartedInBrowser(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventTracingStartedInBrowser {
  return traceEventData.name === KnownEventName.TRACING_STARTED_IN_BROWSER;
}

export function isTraceEventFrameCommittedInBrowser(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventFrameCommittedInBrowser {
  return traceEventData.name === 'FrameCommittedInBrowser';
}

export function isTraceEventCommitLoad(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventCommitLoad {
  return traceEventData.name === 'CommitLoad';
}

export function isTraceEventNavigationStart(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventNavigationStart {
  return traceEventData.name === 'navigationStart';
}

export function isTraceEventAnimation(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventAnimation {
  // We've found some rare traces with an Animtation trace event from a different category: https://crbug.com/1472375#comment7
  return traceEventData.name === 'Animation' && traceEventData.cat.includes('devtools.timeline');
}

export function isSyntheticAnimation(traceEventData: TraceEventData): traceEventData is SyntheticAnimationPair {
  if (traceEventData.name !== 'Animation' || !traceEventData.cat.includes('devtools.timeline')) {
    return false;
  }
  const data = traceEventData.args?.data;
  if (!data) {
    return false;
  }
  return 'beginEvent' in data && 'endEvent' in data;
}

export function isTraceEventLayoutShift(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventLayoutShift {
  return traceEventData.name === 'LayoutShift';
}

export function isTraceEventLayoutInvalidationTracking(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventLayoutInvalidationTracking {
  return traceEventData.name === KnownEventName.LAYOUT_INVALIDATION_TRACKING;
}

export function isTraceEventFirstContentfulPaint(traceEventData: TraceEventData):
    traceEventData is TraceEventFirstContentfulPaint {
  return traceEventData.name === 'firstContentfulPaint';
}

export function isTraceEventLargestContentfulPaintCandidate(traceEventData: TraceEventData):
    traceEventData is TraceEventLargestContentfulPaintCandidate {
  return traceEventData.name === KnownEventName.MARK_LCP_CANDIDATE;
}
export function isTraceEventLargestImagePaintCandidate(traceEventData: TraceEventData):
    traceEventData is TraceEventLargestImagePaintCandidate {
  return traceEventData.name === 'LargestImagePaint::Candidate';
}
export function isTraceEventLargestTextPaintCandidate(traceEventData: TraceEventData):
    traceEventData is TraceEventLargestTextPaintCandidate {
  return traceEventData.name === 'LargestTextPaint::Candidate';
}

export function isTraceEventMarkLoad(traceEventData: TraceEventData): traceEventData is TraceEventMarkLoad {
  return traceEventData.name === 'MarkLoad';
}

export function isTraceEventFirstPaint(traceEventData: TraceEventData): traceEventData is TraceEventFirstPaint {
  return traceEventData.name === 'firstPaint';
}

export function isTraceEventMarkDOMContent(traceEventData: TraceEventData): traceEventData is TraceEventMarkDOMContent {
  return traceEventData.name === 'MarkDOMContent';
}

export function isTraceEventInteractiveTime(traceEventData: TraceEventData):
    traceEventData is TraceEventInteractiveTime {
  return traceEventData.name === 'InteractiveTime';
}

export function isTraceEventEventTiming(traceEventData: TraceEventData): traceEventData is TraceEventEventTiming {
  return traceEventData.name === KnownEventName.EVENT_TIMING;
}

export function isTraceEventEventTimingEnd(traceEventData: TraceEventData): traceEventData is TraceEventEventTimingEnd {
  return isTraceEventEventTiming(traceEventData) && traceEventData.ph === Phase.ASYNC_NESTABLE_END;
}
export function isTraceEventEventTimingStart(traceEventData: TraceEventData):
    traceEventData is TraceEventEventTimingBegin {
  return isTraceEventEventTiming(traceEventData) && traceEventData.ph === Phase.ASYNC_NESTABLE_START;
}

export function isTraceEventGPUTask(traceEventData: TraceEventData): traceEventData is TraceEventGPUTask {
  return traceEventData.name === 'GPUTask';
}

export function isTraceEventProfile(traceEventData: TraceEventData): traceEventData is TraceEventProfile {
  return traceEventData.name === 'Profile';
}

export function isSyntheticCpuProfile(traceEventData: TraceEventData): traceEventData is SyntheticCpuProfile {
  return traceEventData.name === 'CpuProfile';
}

export function isTraceEventProfileChunk(traceEventData: TraceEventData): traceEventData is TraceEventProfileChunk {
  return traceEventData.name === 'ProfileChunk';
}

export function isTraceEventResourceChangePriority(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventResourceChangePriority {
  return traceEventData.name === 'ResourceChangePriority';
}

export function isTraceEventResourceSendRequest(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventResourceSendRequest {
  return traceEventData.name === 'ResourceSendRequest';
}

export function isTraceEventResourceReceiveResponse(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventResourceReceiveResponse {
  return traceEventData.name === 'ResourceReceiveResponse';
}

export function isTraceEventResourceMarkAsCached(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventResourceMarkAsCached {
  return traceEventData.name === 'ResourceMarkAsCached';
}

export function isTraceEventResourceFinish(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventResourceFinish {
  return traceEventData.name === 'ResourceFinish';
}

export function isTraceEventResourceWillSendRequest(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventResourceWillSendRequest {
  return traceEventData.name === 'ResourceWillSendRequest';
}

export function isTraceEventResourceReceivedData(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventResourceReceivedData {
  return traceEventData.name === 'ResourceReceivedData';
}

export function isSyntheticNetworkRequestEvent(
    traceEventData: TraceEventData,
    ): traceEventData is SyntheticNetworkRequest {
  return traceEventData.name === 'SyntheticNetworkRequest';
}

export function isSyntheticWebSocketConnectionEvent(
    traceEventData: TraceEventData,
    ): traceEventData is SyntheticWebSocketConnectionEvent {
  return traceEventData.name === 'SyntheticWebSocketConnectionEvent';
}

export function isNetworkTrackEntry(traceEventData: TraceEventData):
    traceEventData is SyntheticWebSocketConnectionEvent|SyntheticNetworkRequest {
  return isSyntheticNetworkRequestEvent(traceEventData) || isSyntheticWebSocketConnectionEvent(traceEventData) ||
      isWebSocketTraceEvent(traceEventData);
}

export function isTraceEventPrePaint(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventPrePaint {
  return traceEventData.name === 'PrePaint';
}

export function isTraceEventNavigationStartWithURL(event: TraceEventData): event is TraceEventNavigationStart {
  return Boolean(isTraceEventNavigationStart(event) && event.args.data && event.args.data.documentLoaderURL !== '');
}

export function isTraceEventMainFrameViewport(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventMainFrameViewport {
  return traceEventData.name === 'PaintTimingVisualizer::Viewport';
}

export function isSyntheticUserTiming(traceEventData: TraceEventData): traceEventData is SyntheticUserTimingPair {
  if (traceEventData.cat !== 'blink.user_timing') {
    return false;
  }
  const data = traceEventData.args?.data;
  if (!data) {
    return false;
  }
  return 'beginEvent' in data && 'endEvent' in data;
}

export function isSyntheticConsoleTiming(traceEventData: TraceEventData): traceEventData is SyntheticConsoleTimingPair {
  if (traceEventData.cat !== 'blink.console') {
    return false;
  }
  const data = traceEventData.args?.data;
  if (!data) {
    return false;
  }
  return 'beginEvent' in data && 'endEvent' in data;
}

export function isTraceEventUserTiming(traceEventData: TraceEventData): traceEventData is TraceEventUserTiming {
  return traceEventData.cat === 'blink.user_timing';
}

export function isTraceEventDomLoading(traceEventData: TraceEventData): traceEventData is TraceEventDomLoading {
  return traceEventData.name === KnownEventName.DOM_LOADING;
}

export function isTraceEventBeginRemoteFontLoad(traceEventData: TraceEventData):
    traceEventData is TraceEventBeginRemoteFontLoad {
  return traceEventData.name === KnownEventName.BEGIN_REMOTE_FONT_LOAD;
}

export function isTraceEventPerformanceMeasure(traceEventData: TraceEventData):
    traceEventData is TraceEventPerformanceMeasure {
  return isTraceEventUserTiming(traceEventData) && isTraceEventAsyncPhase(traceEventData);
}

export function isTraceEventPerformanceMark(traceEventData: TraceEventData):
    traceEventData is TraceEventPerformanceMark {
  return isTraceEventUserTiming(traceEventData) &&
      (traceEventData.ph === Phase.MARK || traceEventData.ph === Phase.INSTANT);
}

export function isTraceEventConsoleTime(traceEventData: TraceEventData): traceEventData is TraceEventConsoleTime {
  return traceEventData.cat === 'blink.console' && isTraceEventAsyncPhase(traceEventData);
}

export function isTraceEventTimeStamp(traceEventData: TraceEventData): traceEventData is TraceEventTimeStamp {
  return traceEventData.ph === Phase.INSTANT && traceEventData.name === 'TimeStamp';
}

export function isTraceEventParseHTML(traceEventData: TraceEventData): traceEventData is TraceEventParseHTML {
  return traceEventData.name === 'ParseHTML';
}

export interface TraceEventAsync extends TraceEventData {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_INSTANT|Phase.ASYNC_NESTABLE_END|Phase.ASYNC_STEP_INTO|
      Phase.ASYNC_BEGIN|Phase.ASYNC_END|Phase.ASYNC_STEP_PAST;
}

const asyncPhases = new Set([
  Phase.ASYNC_NESTABLE_START,
  Phase.ASYNC_NESTABLE_INSTANT,
  Phase.ASYNC_NESTABLE_END,
  Phase.ASYNC_STEP_INTO,
  Phase.ASYNC_BEGIN,
  Phase.ASYNC_END,
  Phase.ASYNC_STEP_PAST,
]);

export function isTraceEventAsyncPhase(traceEventData: TraceEventData): boolean {
  return asyncPhases.has(traceEventData.ph);
}

export function isSyntheticLayoutShift(traceEventData: TraceEventData): traceEventData is SyntheticLayoutShift {
  if (!isTraceEventLayoutShift(traceEventData) || !traceEventData.args.data) {
    return false;
  }
  return 'rawEvent' in traceEventData.args.data;
}

export function isSyntheticLayoutShiftCluster(traceEventData: TraceEventData):
    traceEventData is SyntheticLayoutShiftCluster {
  return traceEventData.name === KnownEventName.SYNTHETIC_LAYOUT_SHIFT_CLUSTER;
}

export function isProfileCall(event: TraceEventData): event is SyntheticProfileCall {
  return 'callFrame' in event;
}

export interface TraceEventPaint extends TraceEventComplete {
  name: KnownEventName.PAINT;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      clip: number[],
      frame: string,
      layerId: number,
      // With CompositeAfterPaint enabled, paint events are no longer
      // associated with a Node, and nodeId will not be present.
      nodeId?: Protocol.DOM.BackendNodeId,
    },
  };
}

export function isTraceEventPaint(event: TraceEventData): event is TraceEventPaint {
  return event.name === KnownEventName.PAINT;
}

export interface TraceEventPaintImage extends TraceEventComplete {
  name: KnownEventName.PAINT_IMAGE;
  args: TraceEventArgs&{
    data: TraceEventData & {
      height: number,
      width: number,
      x: number,
      y: number,
      url?: string, srcHeight: number, srcWidth: number,
      nodeId?: Protocol.DOM.BackendNodeId,
    },
  };
}
export function isTraceEventPaintImage(event: TraceEventData): event is TraceEventPaintImage {
  return event.name === KnownEventName.PAINT_IMAGE;
}

export interface TraceEventScrollLayer extends TraceEventComplete {
  name: KnownEventName.SCROLL_LAYER;
  args: TraceEventArgs&{
    data: TraceEventData & {
      frame: string,
      nodeId?: Protocol.DOM.BackendNodeId,
    },
  };
}
export function isTraceEventScrollLayer(event: TraceEventData): event is TraceEventScrollLayer {
  return event.name === KnownEventName.SCROLL_LAYER;
}

export interface TraceEventSetLayerTreeId extends TraceEventInstant {
  name: KnownEventName.SET_LAYER_TREE_ID;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      layerTreeId: number,
    },
  };
}
export function isTraceEventSetLayerId(event: TraceEventData): event is TraceEventSetLayerTreeId {
  return event.name === KnownEventName.SET_LAYER_TREE_ID;
}
export interface TraceEventUpdateLayer extends TraceEventComplete {
  name: KnownEventName.UPDATE_LAYER;
  args: TraceEventArgs&{
    layerId: number,
    layerTreeId: number,
  };
}
export function isTraceEventUpdateLayer(event: TraceEventData): event is TraceEventUpdateLayer {
  return event.name === KnownEventName.UPDATE_LAYER;
}

export interface TraceEventDisplayItemListSnapshot extends TraceEventData {
  name: KnownEventName.DISPLAY_ITEM_LIST_SNAPSHOT;
  ph: Phase.OBJECT_SNAPSHOT;
  id2: {
    local?: string,
  };
  args: TraceEventArgs&{
    snapshot: {
      skp64: string,
      params?: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        layer_rect: [number, number, number, number],
      },
    },
  };
}
export function isTraceEventDisplayListItemListSnapshot(event: TraceEventData):
    event is TraceEventDisplayItemListSnapshot {
  return event.name === KnownEventName.DISPLAY_ITEM_LIST_SNAPSHOT;
}

export interface TraceEventLayerTreeHostImplSnapshot extends TraceEventData {
  name: KnownEventName.LAYER_TREE_HOST_IMPL_SNAPSHOT;
  ph: Phase.OBJECT_SNAPSHOT;
  id: string;
  args: TraceEventArgs&{
    snapshot: {
      /* eslint-disable @typescript-eslint/naming-convention */
      active_tiles: Array<{
        id: string,
        layer_id: string,
        gpu_memory_usage: number,
        content_rect: number[],
      }>,
      device_viewport_size: {
        width: number,
        height: number,
      },
      active_tree: {
        root_layer: TraceLayer,
        layers: TraceLayer[],
      },
      /* eslint-enable @typescript-eslint/naming-convention */
    },
  };
}

export function isTraceEventLayerTreeHostImplSnapshot(event: TraceEventData):
    event is TraceEventLayerTreeHostImplSnapshot {
  return event.name === KnownEventName.LAYER_TREE_HOST_IMPL_SNAPSHOT;
}
/* eslint-disable @typescript-eslint/naming-convention */
export interface TraceLayer {
  bounds: {height: number, width: number};
  children: TraceLayer[];
  layer_id: number;
  position: number[];
  scroll_offset: number[];
  layer_quad: number[];
  draws_content: number;
  gpu_memory_usage: number;
  transform: number[];
  owner_node: Protocol.DOM.BackendNodeId;
  compositing_reasons: string[];
  compositing_reason_ids: string[];
  non_fast_scrollable_region: number[];
  touch_event_handler_region: number[];
  wheel_event_handler_region: number[];
  scroll_event_handler_region: number[];
}

export interface TracingLayerTile {
  id: string;
  layer_id: string;
  gpu_memory_usage: number;
  content_rect: number[];
}
/* eslint-enable @typescript-eslint/naming-convention */

export interface TraceEventFireAnimationFrame extends TraceEventComplete {
  name: KnownEventName.FIRE_ANIMATION_FRAME;
  args: TraceEventArgs&{
    data: {
      frame: string,
      id: number,
    },
  };
}
export function isTraceEventFireAnimationFrame(event: TraceEventData): event is TraceEventFireAnimationFrame {
  return event.name === KnownEventName.FIRE_ANIMATION_FRAME;
}

export interface TraceEventRequestAnimationFrame extends TraceEventInstant {
  name: KnownEventName.REQUEST_ANIMATION_FRAME;
  args: TraceEventArgs&{
    data: {
      frame: string,
      id: number,
      stackTrace?: TraceEventCallFrame,
    },
  };
}
export function isTraceEventRequestAnimationFrame(event: TraceEventData): event is TraceEventRequestAnimationFrame {
  return event.name === KnownEventName.REQUEST_ANIMATION_FRAME;
}

export interface TraceEventTimerInstall extends TraceEventInstant {
  name: KnownEventName.TIMER_INSTALL;
  args: TraceEventArgs&{
    data: {
      frame: string,
      singleShot: boolean,
      stackTrace?: TraceEventCallFrame, timeout: number, timerId: number,
    },
  };
}
export function isTraceEventTimerInstall(event: TraceEventData): event is TraceEventTimerInstall {
  return event.name === KnownEventName.TIMER_INSTALL;
}

export interface TraceEventTimerFire extends TraceEventComplete {
  name: KnownEventName.TIMER_FIRE;
  args: TraceEventArgs&{
    data: {
      frame: string,
      timerId: number,
    },
  };
}
export function isTraceEventTimerFire(event: TraceEventData): event is TraceEventTimerFire {
  return event.name === KnownEventName.TIMER_FIRE;
}

export interface TraceEventRequestIdleCallback extends TraceEventInstant {
  name: KnownEventName.REQUEST_IDLE_CALLBACK;
  args: TraceEventArgs&{
    data: {
      frame: string,
      id: number,
      timeout: number,
      stackTrace?: TraceEventCallFrame,
    },

  };
}
export function isTraceEventRequestIdleCallback(event: TraceEventData): event is TraceEventRequestIdleCallback {
  return event.name === KnownEventName.REQUEST_IDLE_CALLBACK;
}

export interface TraceEventWebSocketCreate extends TraceEventInstant {
  name: KnownEventName.WEB_SOCKET_CREATE;
  args: TraceEventArgs&{
    data: {
      identifier: number,
      url: string,
      frame?: string,
      workerId?: string,
      websocketProtocol?: string,
      stackTrace?: TraceEventCallFrame,
    },
  };
}
export function isTraceEventWebSocketCreate(event: TraceEventData): event is TraceEventWebSocketCreate {
  return event.name === KnownEventName.WEB_SOCKET_CREATE;
}

export interface TraceEventWebSocketInfo extends TraceEventInstant {
  name: KnownEventName.WEB_SOCKET_DESTROY|KnownEventName.WEB_SOCKET_RECEIVE_HANDSHAKE|
      KnownEventName.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      identifier: number,
      url: string,
      frame?: string,
      workerId?: string,
    },
  };
}
export interface TraceEventWebSocketTransfer extends TraceEventInstant {
  name: KnownEventName.WEB_SOCKET_SEND|KnownEventName.WEB_SOCKET_RECEIVE;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      identifier: number,
      url: string,
      frame?: string,
      workerId?: string, dataLength: number,
    },
  };
}
export function isTraceEventWebSocketInfo(traceEventData: TraceEventData): traceEventData is TraceEventWebSocketInfo {
  return traceEventData.name === KnownEventName.WEB_SOCKET_SEND_HANDSHAKE_REQUEST ||
      traceEventData.name === KnownEventName.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST ||
      traceEventData.name === KnownEventName.WEB_SOCKET_DESTROY;
}

export function isTraceEventWebSocketTransfer(traceEventData: TraceEventData):
    traceEventData is TraceEventWebSocketTransfer {
  return traceEventData.name === KnownEventName.WEB_SOCKET_SEND ||
      traceEventData.name === KnownEventName.WEB_SOCKET_RECEIVE;
}

export interface TraceEventWebSocketSend extends TraceEventInstant {
  name: KnownEventName.WEB_SOCKET_SEND;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      identifier: number,
      url: string,
      frame?: string,
      workerId?: string, dataLength: number,
    },
  };
}

export function isTraceEventWebSocketSend(event: TraceEventData): event is TraceEventWebSocketSend {
  return event.name === KnownEventName.WEB_SOCKET_SEND;
}

export interface TraceEventWebSocketReceive extends TraceEventInstant {
  name: KnownEventName.WEB_SOCKET_RECEIVE;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      identifier: number,
      url: string,
      frame?: string,
      workerId?: string, dataLength: number,
    },
  };
}
export function isTraceEventWebSocketReceive(event: TraceEventData): event is TraceEventWebSocketReceive {
  return event.name === KnownEventName.WEB_SOCKET_RECEIVE;
}

export interface TraceEventWebSocketSendHandshakeRequest extends TraceEventInstant {
  name: KnownEventName.WEB_SOCKET_SEND_HANDSHAKE_REQUEST;
  args: TraceEventArgs&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isTraceEventWebSocketSendHandshakeRequest(event: TraceEventData):
    event is TraceEventWebSocketSendHandshakeRequest {
  return event.name === KnownEventName.WEB_SOCKET_SEND_HANDSHAKE_REQUEST;
}

export interface TraceEventWebSocketReceiveHandshakeResponse extends TraceEventInstant {
  name: KnownEventName.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST;
  args: TraceEventArgs&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isTraceEventWebSocketReceiveHandshakeResponse(event: TraceEventData):
    event is TraceEventWebSocketReceiveHandshakeResponse {
  return event.name === KnownEventName.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST;
}

export interface TraceEventWebSocketDestroy extends TraceEventInstant {
  name: KnownEventName.WEB_SOCKET_DESTROY;
  args: TraceEventArgs&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isTraceEventWebSocketDestroy(event: TraceEventData): event is TraceEventWebSocketDestroy {
  return event.name === KnownEventName.WEB_SOCKET_DESTROY;
}

export type WebSocketTraceEvent = TraceEventWebSocketCreate|TraceEventWebSocketInfo|TraceEventWebSocketTransfer;
export function isWebSocketTraceEvent(event: TraceEventData): event is WebSocketTraceEvent {
  return isTraceEventWebSocketCreate(event) || isTraceEventWebSocketInfo(event) || isTraceEventWebSocketTransfer(event);
}

export type WebSocketEvent = WebSocketTraceEvent|SyntheticWebSocketConnectionEvent;
export function isWebSocketEvent(event: TraceEventData): event is WebSocketTraceEvent|
    SyntheticWebSocketConnectionEvent {
  return isWebSocketTraceEvent(event) || isSyntheticWebSocketConnectionEvent(event);
}

export interface TraceEventV8Compile extends TraceEventComplete {
  name: KnownEventName.COMPILE;
  args: TraceEventArgs&{
    data?: {
      url?: string,
      columnNumber?: number,
      consumedCacheSize?: number,
      cacheRejected?: boolean,
      cacheKind?: 'full'|'normal',
      lineNumber?: number,
      notStreamedReason?: string,
      streamed?: boolean,
      eager?: boolean,
    },
    fileName?: string,
  };
}
export function isTraceEventV8Compile(event: TraceEventData): event is TraceEventV8Compile {
  return event.name === KnownEventName.COMPILE;
}

export interface TraceEventFunctionCall extends TraceEventComplete {
  name: KnownEventName.FUNCTION_CALL;
  args: TraceEventArgs&{
    data?: {
      frame?: string,
      columnNumber?: number,
      lineNumber?: number,
      functionName?: string,
      scriptId?: number,
      url?: string,
    },
  };
}
export function isTraceEventFunctionCall(event: TraceEventData): event is TraceEventFunctionCall {
  return event.name === KnownEventName.FUNCTION_CALL;
}

export function isSyntheticServerTiming(event: TraceEventData): event is SyntheticServerTiming {
  return event.cat === 'devtools.server-timing';
}

/**
 * Generally, before JS is executed, a trace event is dispatched that
 * parents the JS calls. These we call "invocation" events. This
 * function determines if an event is one of such.
 */
export function isJSInvocationEvent(event: TraceEventData): boolean {
  switch (event.name) {
    case KnownEventName.RUN_MICROTASKS:
    case KnownEventName.FUNCTION_CALL:
    case KnownEventName.EVALUATE_SCRIPT:
    case KnownEventName.EVALUATE_MODULE:
    case KnownEventName.EVENT_DISPATCH:
    case KnownEventName.V8_EXECUTE:
      return true;
  }
  // Also consider any new v8 trace events. (eg 'V8.RunMicrotasks' and 'v8.run')
  if (event.name.startsWith('v8') || event.name.startsWith('V8')) {
    return true;
  }
  return false;
}

/**
 * This is an exhaustive list of events we track in the Performance
 * panel. Note not all of them are necessarliry shown in the flame
 * chart, some of them we only use for parsing.
 * TODO(crbug.com/1428024): Complete this enum.
 */
export const enum KnownEventName {
  /* Metadata */
  THREAD_NAME = 'thread_name',

  /* Task */
  PROGRAM = 'Program',
  RUN_TASK = 'RunTask',
  ASYNC_TASK = 'AsyncTask',
  RUN_MICROTASKS = 'RunMicrotasks',

  /* Load */
  XHR_LOAD = 'XHRLoad',
  XHR_READY_STATE_CHANGED = 'XHRReadyStateChange',
  /* Parse */
  PARSE_HTML = 'ParseHTML',
  PARSE_CSS = 'ParseAuthorStyleSheet',
  /* V8 */
  COMPILE_CODE = 'V8.CompileCode',
  COMPILE_MODULE = 'V8.CompileModule',
  // Although V8 emits the V8.CompileScript event, the event that actually
  // contains the useful information about the script (URL, etc), is contained
  // in the v8.compile event.
  // Yes, it is all lowercase compared to all the rest of the V8... events,
  // that is not a typo :)
  COMPILE = 'v8.compile',
  COMPILE_SCRIPT = 'V8.CompileScript',
  OPTIMIZE = 'V8.OptimizeCode',
  WASM_STREAM_FROM_RESPONSE_CALLBACK = 'v8.wasm.streamFromResponseCallback',
  WASM_COMPILED_MODULE = 'v8.wasm.compiledModule',
  WASM_CACHED_MODULE = 'v8.wasm.cachedModule',
  WASM_MODULE_CACHE_HIT = 'v8.wasm.moduleCacheHit',
  WASM_MODULE_CACHE_INVALID = 'v8.wasm.moduleCacheInvalid',
  /* Js */
  PROFILE_CALL = 'ProfileCall',
  EVALUATE_SCRIPT = 'EvaluateScript',
  FUNCTION_CALL = 'FunctionCall',
  EVENT_DISPATCH = 'EventDispatch',
  EVALUATE_MODULE = 'v8.evaluateModule',
  REQUEST_MAIN_THREAD_FRAME = 'RequestMainThreadFrame',
  REQUEST_ANIMATION_FRAME = 'RequestAnimationFrame',
  CANCEL_ANIMATION_FRAME = 'CancelAnimationFrame',
  FIRE_ANIMATION_FRAME = 'FireAnimationFrame',
  REQUEST_IDLE_CALLBACK = 'RequestIdleCallback',
  CANCEL_IDLE_CALLBACK = 'CancelIdleCallback',
  FIRE_IDLE_CALLBACK = 'FireIdleCallback',
  TIMER_INSTALL = 'TimerInstall',
  TIMER_REMOVE = 'TimerRemove',
  TIMER_FIRE = 'TimerFire',
  WEB_SOCKET_CREATE = 'WebSocketCreate',
  WEB_SOCKET_SEND_HANDSHAKE = 'WebSocketSendHandshakeRequest',
  WEB_SOCKET_RECEIVE_HANDSHAKE = 'WebSocketReceiveHandshakeResponse',
  WEB_SOCKET_DESTROY = 'WebSocketDestroy',
  WEB_SOCKET_SEND = 'WebSocketSend',
  WEB_SOCKET_RECEIVE = 'WebSocketReceive',
  CRYPTO_DO_ENCRYPT = 'DoEncrypt',
  CRYPTO_DO_ENCRYPT_REPLY = 'DoEncryptReply',
  CRYPTO_DO_DECRYPT = 'DoDecrypt',
  CRYPTO_DO_DECRYPT_REPLY = 'DoDecryptReply',
  CRYPTO_DO_DIGEST = 'DoDigest',
  CRYPTO_DO_DIGEST_REPLY = 'DoDigestReply',
  CRYPTO_DO_SIGN = 'DoSign',
  CRYPTO_DO_SIGN_REPLY = 'DoSignReply',
  CRYPTO_DO_VERIFY = 'DoVerify',
  CRYPTO_DO_VERIFY_REPLY = 'DoVerifyReply',
  V8_EXECUTE = 'V8.Execute',

  /* Gc */
  GC = 'GCEvent',
  DOMGC = 'BlinkGC.AtomicPhase',
  MAJOR_GC = 'MajorGC',
  MINOR_GC = 'MinorGC',
  GC_COLLECT_GARBARGE = 'BlinkGC.AtomicPhase',
  CPPGC_SWEEP = 'CppGC.IncrementalSweep',

  /* Layout */
  SCHEDULE_STYLE_RECALCULATION = 'ScheduleStyleRecalculation',
  LAYOUT = 'Layout',
  UPDATE_LAYOUT_TREE = 'UpdateLayoutTree',
  INVALIDATE_LAYOUT = 'InvalidateLayout',
  LAYOUT_INVALIDATION_TRACKING = 'LayoutInvalidationTracking',
  COMPUTE_INTERSECTION = 'ComputeIntersections',
  HIT_TEST = 'HitTest',
  PRE_PAINT = 'PrePaint',
  LAYERIZE = 'Layerize',
  LAYOUT_SHIFT = 'LayoutShift',
  SYNTHETIC_LAYOUT_SHIFT_CLUSTER = 'SyntheticLayoutShiftCluster',
  UPDATE_LAYER_TREE = 'UpdateLayerTree',
  SCHEDULE_STYLE_INVALIDATION_TRACKING = 'ScheduleStyleInvalidationTracking',
  STYLE_RECALC_INVALIDATION_TRACKING = 'StyleRecalcInvalidationTracking',
  STYLE_INVALIDATOR_INVALIDATION_TRACKING = 'StyleInvalidatorInvalidationTracking',
  SELECTOR_STATS = 'SelectorStats',
  BEGIN_COMMIT_COMPOSITOR_FRAME = 'BeginCommitCompositorFrame',
  PARSE_META_VIEWPORT = 'ParseMetaViewport',

  /* Paint */
  SCROLL_LAYER = 'ScrollLayer',
  UPDATE_LAYER = 'UpdateLayer',
  PAINT_SETUP = 'PaintSetup',
  PAINT = 'Paint',
  PAINT_IMAGE = 'PaintImage',
  COMMIT = 'Commit',
  COMPOSITE_LAYERS = 'CompositeLayers',
  RASTER_TASK = 'RasterTask',
  IMAGE_DECODE_TASK = 'ImageDecodeTask',
  IMAGE_UPLOAD_TASK = 'ImageUploadTask',
  DECODE_IMAGE = 'Decode Image',
  DRAW_LAZY_PIXEL_REF = 'Draw LazyPixelRef',
  DECODE_LAZY_PIXEL_REF = 'Decode LazyPixelRef',
  GPU_TASK = 'GPUTask',
  RASTERIZE = 'Rasterize',
  EVENT_TIMING = 'EventTiming',

  /* Compile */
  OPTIMIZE_CODE = 'V8.OptimizeCode',
  CACHE_SCRIPT = 'v8.produceCache',
  CACHE_MODULE = 'v8.produceModuleCache',
  // V8Sample events are coming from tracing and contain raw stacks with function addresses.
  // After being processed with help of JitCodeAdded and JitCodeMoved events they
  // get translated into function infos and stored as stacks in JSSample events.
  V8_SAMPLE = 'V8Sample',
  JIT_CODE_ADDED = 'JitCodeAdded',
  JIT_CODE_MOVED = 'JitCodeMoved',
  STREAMING_COMPILE_SCRIPT = 'v8.parseOnBackground',
  STREAMING_COMPILE_SCRIPT_WAITING = 'v8.parseOnBackgroundWaiting',
  STREAMING_COMPILE_SCRIPT_PARSING = 'v8.parseOnBackgroundParsing',
  BACKGROUND_DESERIALIZE = 'v8.deserializeOnBackground',
  FINALIZE_DESERIALIZATION = 'V8.FinalizeDeserialization',

  /* Markers */
  COMMIT_LOAD = 'CommitLoad',
  MARK_LOAD = 'MarkLoad',
  MARK_DOM_CONTENT = 'MarkDOMContent',
  MARK_FIRST_PAINT = 'firstPaint',
  MARK_FCP = 'firstContentfulPaint',
  MARK_LCP_CANDIDATE = 'largestContentfulPaint::Candidate',
  MARK_LCP_INVALIDATE = 'largestContentfulPaint::Invalidate',
  NAVIGATION_START = 'navigationStart',
  TIME_STAMP = 'TimeStamp',
  CONSOLE_TIME = 'ConsoleTime',
  USER_TIMING = 'UserTiming',
  INTERACTIVE_TIME = 'InteractiveTime',

  /* Frames */
  BEGIN_FRAME = 'BeginFrame',
  NEEDS_BEGIN_FRAME_CHANGED = 'NeedsBeginFrameChanged',
  BEGIN_MAIN_THREAD_FRAME = 'BeginMainThreadFrame',
  ACTIVATE_LAYER_TREE = 'ActivateLayerTree',
  DRAW_FRAME = 'DrawFrame',
  DROPPED_FRAME = 'DroppedFrame',
  FRAME_STARTED_LOADING = 'FrameStartedLoading',
  PIPELINE_REPORTER = 'PipelineReporter',
  SCREENSHOT = 'Screenshot',

  /* Network request events */
  RESOURCE_WILL_SEND_REQUEST = 'ResourceWillSendRequest',
  RESOURCE_SEND_REQUEST = 'ResourceSendRequest',
  RESOURCE_RECEIVE_RESPONSE = 'ResourceReceiveResponse',
  RESOURCE_RECEIVE_DATA = 'ResourceReceivedData',
  RESOURCE_FINISH = 'ResourceFinish',
  RESOURCE_MARK_AS_CACHED = 'ResourceMarkAsCached',

  /* Web sockets */
  WEB_SOCKET_SEND_HANDSHAKE_REQUEST = 'WebSocketSendHandshakeRequest',
  WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST = 'WebSocketReceiveHandshakeResponse',

  /* CPU Profiling */
  PROFILE = 'Profile',
  START_PROFILING = 'CpuProfiler::StartProfiling',
  PROFILE_CHUNK = 'ProfileChunk',
  UPDATE_COUNTERS = 'UpdateCounters',

  JS_SAMPLE = 'JSSample',

  /* Other */
  ANIMATION = 'Animation',
  PARSE_AUTHOR_STYLE_SHEET = 'ParseAuthorStyleSheet',
  EMBEDDER_CALLBACK = 'EmbedderCallback',
  SET_LAYER_TREE_ID = 'SetLayerTreeId',
  TRACING_STARTED_IN_PAGE = 'TracingStartedInPage',
  TRACING_STARTED_IN_BROWSER = 'TracingStartedInBrowser',
  TRACING_SESSION_ID_FOR_WORKER = 'TracingSessionIdForWorker',
  LAZY_PIXEL_REF = 'LazyPixelRef',
  LAYER_TREE_HOST_IMPL_SNAPSHOT = 'cc::LayerTreeHostImpl',
  PICTURE_SNAPSHOT = 'cc::Picture',
  DISPLAY_ITEM_LIST_SNAPSHOT = 'cc::DisplayItemList',
  INPUT_LATENCY_MOUSE_MOVE = 'InputLatency::MouseMove',
  INPUT_LATENCY_MOUSE_WHEEL = 'InputLatency::MouseWheel',
  IMPL_SIDE_FLING = 'InputHandlerProxy::HandleGestureFling::started',

  SCHEDULE_POST_MESSAGE = 'SchedulePostMessage',
  HANDLE_POST_MESSAGE = 'HandlePostMessage',

  RENDER_FRAME_IMPL_CREATE_CHILD_FRAME = 'RenderFrameImpl::createChildFrame',

  DOM_LOADING = 'domLoading',
  BEGIN_REMOTE_FONT_LOAD = 'BeginRemoteFontLoad',
}

// NOT AN EXHAUSTIVE LIST: just some categories we use and refer
// to in multiple places.
export const Categories = {
  Console: 'blink.console',
  UserTiming: 'blink.user_timing',
  Loading: 'loading',
} as const;

/**
 * The frames implementation in handlers/FramesHandler is considered "legacy"
 * in that it is based on the old TimelineModel implementation rather than
 * following the pattern of the other handlers. This will change in time as we
 * migrate the frames track to use AnimationFrame events, but for now we
 * maintain it because the effort required to migrate was large.
 * Consequently, the types we use through the codebase to refer to these frames
 * usually use ModelHandlers.FramesHandler.TimelineFrame, but in
 * trace/types/*.ts we cannot refer to types defined in the Handlers. To avoid a
 * circular dependency, we define these interfaces here which are implemented by
 * the classes in FramesHandler.ts, but they can also be used to refer to
 * instances of frames in trace/types/*.ts which is unable to import from
 * handlers.
 */
export interface LegacyTimelineFrame extends TraceEventData {
  startTime: MicroSeconds;
  startTimeOffset: MicroSeconds;
  endTime: MicroSeconds;
  duration: MicroSeconds;
  idle: boolean;
  dropped: boolean;
  isPartial: boolean;
  layerTree: LegacyFrameLayerTreeData|null;
  paints: LegacyLayerPaintEvent[];
  mainFrameId?: number;
  readonly seqId: number;
  index: number;
}

export function isLegacyTimelineFrame(data: TraceEventData): data is LegacyTimelineFrame {
  return 'idle' in data && typeof data.idle === 'boolean';
}

export interface LegacyFrameLayerTreeData {
  entry: TraceEventLayerTreeHostImplSnapshot;
  paints: LegacyLayerPaintEvent[];
}

export interface LegacyLayerPaintEvent {
  layerId(): number;
  event(): TraceEventPaint;
  picture(): LegacyLayerPaintEventPicture|null;
}

export interface LegacyLayerPaintEventPicture {
  rect: Array<number>;
  serializedPicture: string;
}
