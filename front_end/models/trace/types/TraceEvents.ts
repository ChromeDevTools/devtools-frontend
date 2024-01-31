// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-unused-private-class-members */
import type * as Protocol from '../../../generated/protocol.js';

import {type MicroSeconds, type MilliSeconds, type Seconds} from './Timing.js';

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
}

export interface TraceEventArgsData {
  stackTrace?: TraceEventCallFrame[];
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

export interface TraceFrame {
  frame: string;
  name: string;
  processId: ProcessID;
  url: string;
  parent?: string;
}

// Sample events.

export interface TraceEventSample extends TraceEventData {
  ph: Phase.SAMPLE;
}

/**
 * A fake trace event created to support CDP.Profiler.Profiles in the
 * trace engine.
 */
export interface SyntheticCpuProfile extends TraceEventInstant {
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

export interface TraceEventFireIdleCallback extends TraceEventComplete {
  name: KnownEventName.FireIdleCallback;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      allottedMilliseconds: MilliSeconds,
      frame: string,
      id: number,
      timedOut: boolean,
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
  name: KnownEventName.EventTiming;
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

export interface SyntheticNetworkRequest extends TraceEventComplete {
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      syntheticData: SyntheticArgsData,
      // All fields below are from TraceEventsForNetworkRequest,
      // Required fields
      decodedBodyLength: number,
      encodedDataLength: number,
      frame: string,
      fromServiceWorker: boolean,
      host: string,
      mimeType: string,
      pathname: string,
      search: string,
      priority: Priority,
      initialPriority: Priority,
      protocol: string,
      redirects: SyntheticNetworkRedirect[],
      renderBlocking: RenderBlocking,
      requestId: string,
      requestingFrameUrl: string,
      statusCode: number,
      url: string,
      // Optional fields
      requestMethod?: string,
      timing?: TraceEventResourceReceiveResponseTimingData,
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

export const enum AuctionWorkletType {
  BIDDER = 'bidder',
  SELLER = 'seller',
  // Not expected to be used, but here as a fallback in case new types get
  // added and we have yet to update the trace engine.
  UNKNOWN = 'unknown',
}

export interface SyntheticAuctionWorkletEvent extends TraceEventInstant {
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
  name: KnownEventName.Screenshot;
  cat: 'disabled-by-default-devtools.screenshot';
  ph: Phase.OBJECT_SNAPSHOT;
}
export function isTraceEventScreenshot(event: TraceEventData): event is TraceEventScreenshot {
  return event.name === KnownEventName.Screenshot;
}

export interface SyntheticScreenshot extends TraceEventData {
  /** This is the correct presentation timestamp. */
  ts: MicroSeconds;
  args: TraceEventArgs&{
    dataUri: string,
  };
  name: KnownEventName.Screenshot;
  cat: 'disabled-by-default-devtools.screenshot';
  ph: Phase.OBJECT_SNAPSHOT;
}

// Animation events.

export interface TraceEventAnimation extends TraceEventData {
  args: TraceEventArgs&{
    id?: string,
    name?: string,
    nodeId?: number,
    nodeName?: string,
    state?: string,
    compositeFailed?: number,
    unsupportedProperties?: string[],
  };
  name: 'Animation';
  id2?: {
    local?: string,
  };
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END;
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
  name: KnownEventName.ThreadName;
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
    },
        frame: string,
  };
}

export interface TraceEventFirstContentfulPaint extends TraceEventMark {
  name: 'firstContentfulPaint';
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

export interface TraceEventLargestContentfulPaintCandidate extends TraceEventMark {
  name: 'largestContentfulPaint::Candidate';
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      candidateIndex: number,
      isOutermostMainFrame: boolean,
      isMainFrame: boolean,
      navigationId: string,
      nodeId: Protocol.DOM.BackendNodeId,
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
  name: KnownEventName.TracingStartedInBrowser;
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
      page: string,
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
export interface SyntheticLayoutShift extends TraceEventLayoutShift {
  args: TraceEventArgs&{
    frame: string,
    data?: LayoutShiftData&{
      rawEvent: TraceEventLayoutShift,
    },
  };
  parsedData: LayoutShiftParsedData;
}

export type Priority = 'Low'|'High'|'Medium'|'VeryHigh'|'Highest';
export type RenderBlocking = 'blocking'|'non_blocking'|'in_body_parser_blocking'|'potentially_blocking';
export interface TraceEventResourceSendRequest extends TraceEventInstant {
  name: 'ResourceSendRequest';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      requestId: string,
      url: string,
      priority: Priority,
      // TODO(crbug.com/1457985): change requestMethod to enum when confirm in the backend code.
      requestMethod?: string,
      renderBlocking?: RenderBlocking,
    },
  };
}

export interface TraceEventResourceChangePriority extends TraceEventInstant {
  name: 'ResourceChangePriority';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      requestId: string,
      priority: Priority,
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
      encodedDataLength: number,
      frame: string,
      fromCache: boolean,
      fromServiceWorker: boolean,
      mimeType: string,
      requestId: string,
      responseTime: MilliSeconds,
      statusCode: number,
      timing: TraceEventResourceReceiveResponseTimingData,
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
  name: KnownEventName.LayoutInvalidationTracking;
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
  name: KnownEventName.ScheduleStyleInvalidationTracking;
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
  return event.name === KnownEventName.ScheduleStyleInvalidationTracking;
}

export const enum StyleRecalcInvalidationReason {
  ANIMATION = 'Animation',
}

export interface TraceEventStyleRecalcInvalidationTracking extends TraceEventInstant {
  name: KnownEventName.StyleRecalcInvalidationTracking;
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
  return event.name === KnownEventName.StyleRecalcInvalidationTracking;
}
export interface TraceEventStyleInvalidatorInvalidationTracking extends TraceEventInstant {
  name: KnownEventName.StyleInvalidatorInvalidationTracking;
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
  return event.name === KnownEventName.StyleInvalidatorInvalidationTracking;
}

export interface TraceEventScheduleStyleRecalculation extends TraceEventInstant {
  name: KnownEventName.ScheduleStyleRecalculation;
  args: TraceEventArgs&{
    data: {
      frame: string,
    },
  };
}
export function isTraceEventScheduleStyleRecalculation(event: TraceEventData):
    event is TraceEventScheduleStyleRecalculation {
  return event.name === KnownEventName.ScheduleStyleRecalculation;
}

export interface TraceEventPrePaint extends TraceEventComplete {
  name: 'PrePaint';
}

export interface TraceEventPairableAsync extends TraceEventData {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END;
  // The id2 field gives flexibility to explicitly specify if an event
  // id is global among processes or process local. However not all
  // events use it, so both kind of ids need to be marked as optional.
  id2?: {local?: string, global?: string};
  id?: string;
}
export interface TraceEventPairableAsyncBegin extends TraceEventPairableAsync {
  ph: Phase.ASYNC_NESTABLE_START;
}

export interface TraceEventPairableAsyncEnd extends TraceEventPairableAsync {
  ph: Phase.ASYNC_NESTABLE_END;
}

export interface TraceEventUserTiming extends TraceEventData {
  id2?: {local?: string, global?: string};
  id?: string;
  cat: 'blink.user_timing';
}

export type TraceEventPairableUserTiming = TraceEventUserTiming&TraceEventPairableAsync;

export interface TraceEventPerformanceMeasureBegin extends TraceEventPairableUserTiming {
  args: TraceEventArgs&{
    detail?: string,
  };
  ph: Phase.ASYNC_NESTABLE_START;
}

export type TraceEventPerformanceMeasureEnd = TraceEventPairableUserTiming&TraceEventPairableAsyncEnd;
export type TraceEventPerformanceMeasure = TraceEventPerformanceMeasureBegin|TraceEventPerformanceMeasureEnd;

export interface TraceEventPerformanceMark extends TraceEventUserTiming {
  ph: Phase.INSTANT|Phase.MARK;
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

export interface TraceEventExtensionMeasureBegin extends TraceEventPerformanceMeasureBegin {
  name: `devtools-entry-${string}`;
}

export interface TraceEventExtensionMeasureEnd extends TraceEventPerformanceMeasureEnd {
  name: `devtools-entry-${string}`;
}

export interface TraceEventExtensionMark extends TraceEventPerformanceMark {
  name: `devtools-entry-${string}`;
  ph: Phase.INSTANT|Phase.MARK;
}

export type TraceEventExtensionMeasure = TraceEventExtensionMeasureBegin|TraceEventExtensionMeasureEnd;

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
  return event.name === KnownEventName.PipelineReporter;
}
/* eslint-enable @typescript-eslint/naming-convention */

// Nestable async events with a duration are made up of two distinct
// events: the begin, and the end. We need both of them to be able to
// display the right information, so we create these synthetic events.
export interface SyntheticEventPair<T extends TraceEventPairableAsync = TraceEventPairableAsync> extends
    TraceEventData {
  cat: T['cat'];
  id?: string;
  id2?: {local?: string, global?: string};
  dur: MicroSeconds;
  args: TraceEventArgs&{
    data: {
      beginEvent: T & TraceEventPairableAsyncBegin,
      endEvent: T&TraceEventPairableAsyncEnd,
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
 * An event created synthetically in the frontend that has a self time
 * (the time spent running the task itself).
 */
export interface SyntheticTraceEntry extends TraceEventData {
  selfTime?: MicroSeconds;
}

/**
 * A profile call created in the frontend from samples disguised as a
 * trace event.
 */
export interface SyntheticProfileCall extends SyntheticTraceEntry {
  callFrame: Protocol.Runtime.CallFrame;
  nodeId: Protocol.integer;
}

/**
 * A trace event augmented synthetically in the frontend to contain
 * its self time.
 */
export type SyntheticRendererEvent = TraceEventRendererEvent&SyntheticTraceEntry;

export function isSyntheticInteractionEvent(event: TraceEventData): event is SyntheticInteractionPair {
  return Boolean(
      'interactionId' in event && event.args?.data && 'beginEvent' in event.args.data && 'endEvent' in event.args.data);
}

export function isSyntheticTraceEntry(event: TraceEventData): event is SyntheticTraceEntry {
  return isTraceEventRendererEvent(event) || isProfileCall(event);
}

// Events relating to frames.

export interface TraceEventDrawFrame extends TraceEventInstant {
  name: KnownEventName.DrawFrame;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
  };
}

export function isTraceEventDrawFrame(event: TraceEventData): event is TraceEventDrawFrame {
  // The extra check for INSTANT here is because in the past DrawFrame events had an ASYNC_NESTABLE_START and ASYNC_NESTABLE_END pair. We don't want to support those old events, so we have to check we are dealing with an instant event.
  return event.name === KnownEventName.DrawFrame && event.ph === Phase.INSTANT;
}
export interface TraceEventLegacyDrawFrameBegin extends TraceEventAsync {
  name: KnownEventName.DrawFrame;
  ph: Phase.ASYNC_NESTABLE_START;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
  };
}
export function isLegacyTraceEventDrawFrameBegin(event: TraceEventData): event is TraceEventLegacyDrawFrameBegin {
  return event.name === KnownEventName.DrawFrame && event.ph === Phase.ASYNC_NESTABLE_START;
}

export interface TraceEventBeginFrame extends TraceEventInstant {
  name: KnownEventName.BeginFrame;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
  };
}
export function isTraceEventBeginFrame(event: TraceEventData): event is TraceEventBeginFrame {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === KnownEventName.BeginFrame && event.args && 'frameSeqId' in event.args);
}

export interface TraceEventDroppedFrame extends TraceEventInstant {
  name: KnownEventName.DroppedFrame;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
    hasPartialUpdate?: boolean,
  };
}
export function isTraceEventDroppedFrame(event: TraceEventData): event is TraceEventDroppedFrame {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === KnownEventName.DroppedFrame && event.args && 'frameSeqId' in event.args);
}

export interface TraceEventRequestMainThreadFrame extends TraceEventInstant {
  name: KnownEventName.RequestMainThreadFrame;
  args: TraceEventArgs&{
    layerTreeId: number,
  };
}
export function isTraceEventRequestMainThreadFrame(event: TraceEventData): event is TraceEventRequestMainThreadFrame {
  return event.name === KnownEventName.RequestMainThreadFrame;
}

export interface TraceEventBeginMainThreadFrame extends TraceEventInstant {
  name: KnownEventName.BeginMainThreadFrame;
  args: TraceEventArgs&{
    layerTreeId: number,
    data: TraceEventArgsData&{
      frameId?: number,
    },
  };
}
export function isTraceEventBeginMainThreadFrame(event: TraceEventData): event is TraceEventBeginMainThreadFrame {
  return event.name === KnownEventName.BeginMainThreadFrame;
}

export interface TraceEventNeedsBeginFrameChanged extends TraceEventInstant {
  name: KnownEventName.NeedsBeginFrameChanged;
  args: TraceEventArgs&{
    layerTreeId: number,
    data: TraceEventArgsData&{
      needsBeginFrame: number,
    },
  };
}
export function isTraceEventNeedsBeginFrameChanged(event: TraceEventData): event is TraceEventNeedsBeginFrameChanged {
  return event.name === KnownEventName.NeedsBeginFrameChanged;
}

export interface TraceEventCommit extends TraceEventInstant {
  name: KnownEventName.Commit;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameSeqId: number,
  };
}
export function isTraceEventCommit(event: TraceEventData): event is TraceEventCommit {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === KnownEventName.Commit && event.args && 'frameSeqId' in event.args);
}

export interface TraceEventRasterTask extends TraceEventComplete {
  name: KnownEventName.RasterTask;
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
  return event.name === KnownEventName.RasterTask;
}

// CompositeLayers has been replaced by "Commit", but we support both to not break old traces being imported.
export interface TraceEventCompositeLayers extends TraceEventInstant {
  name: KnownEventName.CompositeLayers;
  args: TraceEventArgs&{
    layerTreeId: number,
  };
}
export function isTraceEventCompositeLayers(event: TraceEventData): event is TraceEventCompositeLayers {
  return event.name === KnownEventName.CompositeLayers;
}

export interface TraceEventActivateLayerTree extends TraceEventInstant {
  name: KnownEventName.ActivateLayerTree;
  args: TraceEventArgs&{
    layerTreeId: number,
    frameId: number,
  };
}
export function isTraceEventActivateLayerTree(event: TraceEventData): event is TraceEventActivateLayerTree {
  return event.name === KnownEventName.ActivateLayerTree;
}

export interface SyntheticInvalidation extends TraceEventInstant {
  name: 'SyntheticInvalidation';
  nodeName?: string;
  rawEvent: TraceEventScheduleStyleInvalidationTracking|TraceEventStyleRecalcInvalidationTracking|
      TraceEventStyleInvalidatorInvalidationTracking|TraceEventLayoutInvalidationTracking;
  nodeId: Protocol.DOM.BackendNodeId;
  frame: string;
  reason?: string;
  stackTrace?: TraceEventCallFrame[];
}

export function isSyntheticInvalidation(event: TraceEventData): event is SyntheticInvalidation {
  return event.name === 'SyntheticInvalidation';
}

export interface TraceEventUpdateLayoutTree extends TraceEventComplete {
  name: KnownEventName.UpdateLayoutTree;
  args: TraceEventArgs&{
    elementCount: number,
    beginData?: {
      frame: string,
      stackTrace?: TraceEventCallFrame[],
    },
  };
}
export function isTraceEventUpdateLayoutTree(event: TraceEventData): event is TraceEventUpdateLayoutTree {
  return event.name === KnownEventName.UpdateLayoutTree;
}

export interface TraceEventLayout extends TraceEventComplete {
  name: KnownEventName.Layout;
  args: TraceEventArgs&{
    beginData: {
      frame: string,
      dirtyObjects: number,
      partialLayout: boolean,
      totalObjects: number,
    },
    endData: {
      layoutRoots: Array<{
        depth: number,
        nodeId: Protocol.DOM.BackendNodeId,
        quads: number[][],
      }>,
    },
  };
}
export function isTraceEventLayout(event: TraceEventData): event is TraceEventLayout {
  return event.name === KnownEventName.Layout;
}
export interface TraceEventInvalidateLayout extends TraceEventInstant {
  name: KnownEventName.InvalidateLayout;
  args: TraceEventArgs&{
    data: {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
    },
  };
}
export function isTraceEventInvalidateLayout(event: TraceEventData): event is TraceEventInvalidateLayout {
  return event.name === KnownEventName.InvalidateLayout;
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

export function isTraceEventUpdateCounters(event: TraceEventData): event is TraceEventUpdateCounters {
  return event.name === 'UpdateCounters';
}

export function isThreadName(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventThreadName {
  return traceEventData.name === KnownEventName.ThreadName;
}

export function isProcessName(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventProcessName {
  return traceEventData.name === 'process_name';
}

export function isTraceEventTracingStartedInBrowser(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventTracingStartedInBrowser {
  return traceEventData.name === KnownEventName.TracingStartedInBrowser;
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
  return traceEventData.name === 'Animation';
}

export function isTraceEventLayoutShift(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventLayoutShift {
  return traceEventData.name === 'LayoutShift';
}

export function isTraceEventLayoutInvalidationTracking(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventLayoutInvalidationTracking {
  return traceEventData.name === KnownEventName.LayoutInvalidationTracking;
}

export function isTraceEventFirstContentfulPaint(traceEventData: TraceEventData):
    traceEventData is TraceEventFirstContentfulPaint {
  return traceEventData.name === 'firstContentfulPaint';
}

export function isTraceEventLargestContentfulPaintCandidate(traceEventData: TraceEventData):
    traceEventData is TraceEventLargestContentfulPaintCandidate {
  return traceEventData.name === 'largestContentfulPaint::Candidate';
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
  return traceEventData.name === KnownEventName.EventTiming;
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

export function isSyntheticNetworkRequestDetailsEvent(
    traceEventData: TraceEventData,
    ): traceEventData is SyntheticNetworkRequest {
  return traceEventData.name === 'SyntheticNetworkRequest';
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

export function isTraceEventPerformanceMeasure(traceEventData: TraceEventData):
    traceEventData is TraceEventPerformanceMeasure {
  return traceEventData.cat === 'blink.user_timing' && isTraceEventAsyncPhase(traceEventData);
}

export function isTraceEventPerformanceMark(traceEventData: TraceEventData):
    traceEventData is TraceEventPerformanceMark {
  return traceEventData.cat === 'blink.user_timing' &&
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

export function isTraceEventAsyncPhase(traceEventData: TraceEventData): boolean {
  const asyncPhases = new Set([
    Phase.ASYNC_NESTABLE_START,
    Phase.ASYNC_NESTABLE_INSTANT,
    Phase.ASYNC_NESTABLE_END,
    Phase.ASYNC_STEP_INTO,
    Phase.ASYNC_BEGIN,
    Phase.ASYNC_END,
    Phase.ASYNC_STEP_PAST,
  ]);
  return asyncPhases.has(traceEventData.ph);
}

export function isSyntheticLayoutShift(traceEventData: TraceEventData): traceEventData is SyntheticLayoutShift {
  if (!isTraceEventLayoutShift(traceEventData) || !traceEventData.args.data) {
    return false;
  }
  return 'rawEvent' in traceEventData.args.data;
}

export function isProfileCall(event: TraceEventData): event is SyntheticProfileCall {
  return 'callFrame' in event;
}

export interface TraceEventPaint extends TraceEventComplete {
  name: KnownEventName.Paint;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      clip: number[],
      frame: string,
      layerId: number,
      nodeId: number,
    },
  };
}

export function isTraceEventPaint(event: TraceEventData): event is TraceEventPaint {
  return event.name === KnownEventName.Paint;
}

export interface TraceEventSetLayerTreeId extends TraceEventInstant {
  name: KnownEventName.SetLayerTreeId;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      layerTreeId: number,
    },
  };
}
export function isTraceEventSetLayerId(event: TraceEventData): event is TraceEventSetLayerTreeId {
  return event.name === KnownEventName.SetLayerTreeId;
}
export interface TraceEventUpdateLayer extends TraceEventComplete {
  name: KnownEventName.UpdateLayer;
  args: TraceEventArgs&{
    layerId: number,
    layerTreeId: number,
  };
}
export function isTraceEventUpdateLayer(event: TraceEventData): event is TraceEventUpdateLayer {
  return event.name === KnownEventName.UpdateLayer;
}

export interface TraceEventDisplayItemListSnapshot extends TraceEventData {
  name: KnownEventName.DisplayItemListSnapshot;
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
  return event.name === KnownEventName.DisplayItemListSnapshot;
}

export interface TraceEventLayerTreeHostImplSnapshot extends TraceEventData {
  name: KnownEventName.LayerTreeHostImplSnapshot;
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
  return event.name === KnownEventName.LayerTreeHostImplSnapshot;
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
  name: KnownEventName.FireAnimationFrame;
  args: TraceEventArgs&{
    data: {
      frame: string,
      id: number,
    },
  };
}
export function isTraceEventFireAnimationFrame(event: TraceEventData): event is TraceEventFireAnimationFrame {
  return event.name === KnownEventName.FireAnimationFrame;
}

export interface TraceEventRequestAnimationFrame extends TraceEventInstant {
  name: KnownEventName.RequestAnimationFrame;
  args: TraceEventArgs&{
    data: {
      frame: string,
      id: number,
      stackTrace?: TraceEventCallFrame,
    },
  };
}
export function isTraceEventRequestAnimationFrame(event: TraceEventData): event is TraceEventRequestAnimationFrame {
  return event.name === KnownEventName.RequestAnimationFrame;
}

export interface TraceEventTimerInstall extends TraceEventInstant {
  name: KnownEventName.TimerInstall;
  args: TraceEventArgs&{
    data: {
      frame: string,
      singleShot: boolean,
      stackTrace?: TraceEventCallFrame, timeout: number, timerId: number,
    },
  };
}
export function isTraceEventTimerInstall(event: TraceEventData): event is TraceEventTimerInstall {
  return event.name === KnownEventName.TimerInstall;
}

export interface TraceEventTimerFire extends TraceEventComplete {
  name: KnownEventName.TimerFire;
  args: TraceEventArgs&{
    data: {
      frame: string,
      timerId: number,
    },
  };
}
export function isTraceEventTimerFire(event: TraceEventData): event is TraceEventTimerFire {
  return event.name === KnownEventName.TimerFire;
}

export interface TraceEventRequestIdleCallback extends TraceEventInstant {
  name: KnownEventName.RequestIdleCallback;
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
  return event.name === KnownEventName.RequestIdleCallback;
}

export interface TraceEventWebSocketCreate extends TraceEventInstant {
  name: KnownEventName.WebSocketCreate;
  args: TraceEventArgs&{
    data: {
      identifier: number,
      url: string,
      frame?: string,
      websocketProtocol?: string,
      stackTrace?: TraceEventCallFrame,
    },
  };
}
export function isTraceEventWebSocketCreate(event: TraceEventData): event is TraceEventWebSocketCreate {
  return event.name === KnownEventName.WebSocketCreate;
}

export interface TraceEventWebSocketSendHandshakeRequest extends TraceEventInstant {
  name: KnownEventName.WebSocketSendHandshakeRequest;
  args: TraceEventArgs&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isTraceEventWebSocketSendHandshakeRequest(event: TraceEventData):
    event is TraceEventWebSocketSendHandshakeRequest {
  return event.name === KnownEventName.WebSocketSendHandshakeRequest;
}

export interface TraceEventWebSocketReceiveHandshakeResponse extends TraceEventInstant {
  name: KnownEventName.WebSocketReceiveHandshakeResponse;
  args: TraceEventArgs&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isTraceEventWebSocketReceiveHandshakeResponse(event: TraceEventData):
    event is TraceEventWebSocketReceiveHandshakeResponse {
  return event.name === KnownEventName.WebSocketReceiveHandshakeResponse;
}

export interface TraceEventWebSocketDestroy extends TraceEventInstant {
  name: KnownEventName.WebSocketDestroy;
  args: TraceEventArgs&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isTraceEventWebSocketDestroy(event: TraceEventData): event is TraceEventWebSocketDestroy {
  return event.name === KnownEventName.WebSocketDestroy;
}

export function isWebSocketTraceEvent(event: TraceEventData): event is TraceEventWebSocketCreate|
    TraceEventWebSocketDestroy|TraceEventWebSocketReceiveHandshakeResponse|TraceEventWebSocketSendHandshakeRequest {
  return isTraceEventWebSocketCreate(event) || isTraceEventWebSocketDestroy(event) ||
      isTraceEventWebSocketReceiveHandshakeResponse(event) || isTraceEventWebSocketSendHandshakeRequest(event);
}

export interface TraceEventV8Compile extends TraceEventComplete {
  name: KnownEventName.Compile;
  args: TraceEventArgs&{
    data?: {
      url?: string,
      columnNumber?: number,
      lineNumber?: number,
      notStreamedReason?: string,
      streamed?: boolean,
      eager?: boolean,
    },
    fileName?: string,
  };
}
export function isTraceEventV8Compile(event: TraceEventData): event is TraceEventV8Compile {
  return event.name === KnownEventName.Compile;
}

/**
 * Generally, before JS is executed, a trace event is dispatched that
 * parents the JS calls. These we call "invocation" events. This
 * function determines if an event is one of such.
 */
export function isJSInvocationEvent(event: TraceEventData): boolean {
  switch (event.name) {
    case KnownEventName.RunMicrotasks:
    case KnownEventName.FunctionCall:
    case KnownEventName.EvaluateScript:
    case KnownEventName.EvaluateModule:
    case KnownEventName.EventDispatch:
    case KnownEventName.V8Execute:
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
  ThreadName = 'thread_name',

  /* Task */
  Program = 'Program',
  RunTask = 'RunTask',
  AsyncTask = 'AsyncTask',
  RunMicrotasks = 'RunMicrotasks',

  /* Load */
  XHRLoad = 'XHRLoad',
  XHRReadyStateChange = 'XHRReadyStateChange',
  /* Parse */
  ParseHTML = 'ParseHTML',
  ParseCSS = 'ParseAuthorStyleSheet',
  /* V8 */
  CompileCode = 'V8.CompileCode',
  CompileModule = 'V8.CompileModule',
  // Although V8 emits the V8.CompileScript event, the event that actually
  // contains the useful information about the script (URL, etc), is contained
  // in the v8.compile event.
  // Yes, it is all lowercase compared to all the rest of the V8... events,
  // that is not a typo :)
  Compile = 'v8.compile',
  CompileScript = 'V8.CompileScript',
  Optimize = 'V8.OptimizeCode',
  WasmStreamFromResponseCallback = 'v8.wasm.streamFromResponseCallback',
  WasmCompiledModule = 'v8.wasm.compiledModule',
  WasmCachedModule = 'v8.wasm.cachedModule',
  WasmModuleCacheHit = 'v8.wasm.moduleCacheHit',
  WasmModuleCacheInvalid = 'v8.wasm.moduleCacheInvalid',
  /* Js */
  ProfileCall = 'ProfileCall',
  EvaluateScript = 'EvaluateScript',
  FunctionCall = 'FunctionCall',
  EventDispatch = 'EventDispatch',
  EvaluateModule = 'v8.evaluateModule',
  RequestMainThreadFrame = 'RequestMainThreadFrame',
  RequestAnimationFrame = 'RequestAnimationFrame',
  CancelAnimationFrame = 'CancelAnimationFrame',
  FireAnimationFrame = 'FireAnimationFrame',
  RequestIdleCallback = 'RequestIdleCallback',
  CancelIdleCallback = 'CancelIdleCallback',
  FireIdleCallback = 'FireIdleCallback',
  TimerInstall = 'TimerInstall',
  TimerRemove = 'TimerRemove',
  TimerFire = 'TimerFire',
  WebSocketCreate = 'WebSocketCreate',
  WebSocketSendHandshake = 'WebSocketSendHandshakeRequest',
  WebSocketReceiveHandshake = 'WebSocketReceiveHandshakeResponse',
  WebSocketDestroy = 'WebSocketDestroy',
  CryptoDoEncrypt = 'DoEncrypt',
  CryptoDoEncryptReply = 'DoEncryptReply',
  CryptoDoDecrypt = 'DoDecrypt',
  CryptoDoDecryptReply = 'DoDecryptReply',
  CryptoDoDigest = 'DoDigest',
  CryptoDoDigestReply = 'DoDigestReply',
  CryptoDoSign = 'DoSign',
  CryptoDoSignReply = 'DoSignReply',
  CryptoDoVerify = 'DoVerify',
  CryptoDoVerifyReply = 'DoVerifyReply',
  V8Execute = 'V8.Execute',

  /* Gc */
  GC = 'GCEvent',
  DOMGC = 'BlinkGC.AtomicPhase',
  IncrementalGCMarking = 'V8.GCIncrementalMarking',
  MajorGC = 'MajorGC',
  MinorGC = 'MinorGC',
  GCCollectGarbage = 'BlinkGC.AtomicPhase',
  CPPGCSweep = 'CppGC.IncrementalSweep',

  /* Layout */
  ScheduleStyleRecalculation = 'ScheduleStyleRecalculation',
  RecalculateStyles = 'RecalculateStyles',
  Layout = 'Layout',
  UpdateLayoutTree = 'UpdateLayoutTree',
  InvalidateLayout = 'InvalidateLayout',
  LayoutInvalidationTracking = 'LayoutInvalidationTracking',
  ComputeIntersections = 'ComputeIntersections',
  HitTest = 'HitTest',
  PrePaint = 'PrePaint',
  Layerize = 'Layerize',
  LayoutShift = 'LayoutShift',
  UpdateLayerTree = 'UpdateLayerTree',
  ScheduleStyleInvalidationTracking = 'ScheduleStyleInvalidationTracking',
  StyleRecalcInvalidationTracking = 'StyleRecalcInvalidationTracking',
  StyleInvalidatorInvalidationTracking = 'StyleInvalidatorInvalidationTracking',

  /* Paint */
  ScrollLayer = 'ScrollLayer',
  UpdateLayer = 'UpdateLayer',
  PaintSetup = 'PaintSetup',
  Paint = 'Paint',
  PaintImage = 'PaintImage',
  Commit = 'Commit',
  CompositeLayers = 'CompositeLayers',
  RasterTask = 'RasterTask',
  ImageDecodeTask = 'ImageDecodeTask',
  ImageUploadTask = 'ImageUploadTask',
  DecodeImage = 'Decode Image',
  ResizeImage = 'Resize Image',
  DrawLazyPixelRef = 'Draw LazyPixelRef',
  DecodeLazyPixelRef = 'Decode LazyPixelRef',
  GPUTask = 'GPUTask',
  Rasterize = 'Rasterize',
  EventTiming = 'EventTiming',

  /* Compile */
  OptimizeCode = 'V8.OptimizeCode',
  CacheScript = 'v8.produceCache',
  CacheModule = 'v8.produceModuleCache',
  // V8Sample events are coming from tracing and contain raw stacks with function addresses.
  // After being processed with help of JitCodeAdded and JitCodeMoved events they
  // get translated into function infos and stored as stacks in JSSample events.
  V8Sample = 'V8Sample',
  JitCodeAdded = 'JitCodeAdded',
  JitCodeMoved = 'JitCodeMoved',
  StreamingCompileScript = 'v8.parseOnBackground',
  StreamingCompileScriptWaiting = 'v8.parseOnBackgroundWaiting',
  StreamingCompileScriptParsing = 'v8.parseOnBackgroundParsing',
  BackgroundDeserialize = 'v8.deserializeOnBackground',
  FinalizeDeserialization = 'V8.FinalizeDeserialization',

  /* Markers */
  CommitLoad = 'CommitLoad',
  MarkLoad = 'MarkLoad',
  MarkDOMContent = 'MarkDOMContent',
  MarkFirstPaint = 'firstPaint',
  MarkFCP = 'firstContentfulPaint',
  MarkLCPCandidate = 'largestContentfulPaint::Candidate',
  MarkLCPInvalidate = 'largestContentfulPaint::Invalidate',
  NavigationStart = 'navigationStart',
  TimeStamp = 'TimeStamp',
  ConsoleTime = 'ConsoleTime',
  UserTiming = 'UserTiming',
  InteractiveTime = 'InteractiveTime',

  /* Frames */
  BeginFrame = 'BeginFrame',
  NeedsBeginFrameChanged = 'NeedsBeginFrameChanged',
  BeginMainThreadFrame = 'BeginMainThreadFrame',
  ActivateLayerTree = 'ActivateLayerTree',
  DrawFrame = 'DrawFrame',
  DroppedFrame = 'DroppedFrame',
  FrameStartedLoading = 'FrameStartedLoading',
  PipelineReporter = 'PipelineReporter',
  Screenshot = 'Screenshot',

  /* Network request events */
  ResourceWillSendRequest = 'ResourceWillSendRequest',
  ResourceSendRequest = 'ResourceSendRequest',
  ResourceReceiveResponse = 'ResourceReceiveResponse',
  ResourceReceivedData = 'ResourceReceivedData',
  ResourceFinish = 'ResourceFinish',
  ResourceMarkAsCached = 'ResourceMarkAsCached',

  /* Web sockets */
  WebSocketSendHandshakeRequest = 'WebSocketSendHandshakeRequest',
  WebSocketReceiveHandshakeResponse = 'WebSocketReceiveHandshakeResponse',

  /* CPU Profiling */
  Profile = 'Profile',
  StartProfiling = 'CpuProfiler::StartProfiling',
  ProfileChunk = 'ProfileChunk',
  UpdateCounters = 'UpdateCounters',

  /* Other */
  Animation = 'Animation',
  ParseAuthorStyleSheet = 'ParseAuthorStyleSheet',
  EmbedderCallback = 'EmbedderCallback',
  SetLayerTreeId = 'SetLayerTreeId',
  TracingStartedInPage = 'TracingStartedInPage',
  TracingStartedInBrowser = 'TracingStartedInBrowser',
  TracingSessionIdForWorker = 'TracingSessionIdForWorker',
  LazyPixelRef = 'LazyPixelRef',
  LayerTreeHostImplSnapshot = 'cc::LayerTreeHostImpl',
  PictureSnapshot = 'cc::Picture',
  DisplayItemListSnapshot = 'cc::DisplayItemList',
  InputLatencyMouseMove = 'InputLatency::MouseMove',
  InputLatencyMouseWheel = 'InputLatency::MouseWheel',
  ImplSideFling = 'InputHandlerProxy::HandleGestureFling::started',
}
