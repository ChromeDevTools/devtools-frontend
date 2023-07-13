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
  scriptId: number;
  columnNumber?: number;
  lineNumber?: number;
  url?: string;
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

export interface TraceEventDispatch extends TraceEventComplete {
  name: 'EventDispatch';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      type: string,
    },
  };
}

export interface TraceEventEventTiming extends TraceEventData {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END;
  id: string;
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      cancelable: boolean,
      duration: MilliSeconds,
      processingEnd: MicroSeconds,
      processingStart: MicroSeconds,
      timeStamp: MicroSeconds,
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

export interface TraceEventSyntheticNetworkRedirect {
  url: string;
  priority: string;
  requestMethod?: string;
  ts: MicroSeconds;
  dur: MicroSeconds;
}

// TraceEventProcessedArgsData is used to store the processed data of a network
// request. Which is used to distinguish from the date we extract from the
// trace event directly.
interface TraceEventSyntheticArgsData {
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

export interface TraceEventSyntheticNetworkRequest extends TraceEventComplete {
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      syntheticData: TraceEventSyntheticArgsData,
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
      priority: string,
      protocol: string,
      redirects: TraceEventSyntheticNetworkRedirect[],
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

// Snapshot events.

export interface TraceEventSnapshot extends TraceEventData {
  args: TraceEventArgs&{
    snapshot: string,
  };
  name: 'Screenshot';
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
  name: 'thread_name';
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
    TraceEventLargestContentfulPaintCandidate|TraceEventLayoutShift|TraceEventFirstPaint|TraceEventMarkLoad;

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

export type TraceEventRendererData = TraceEventInstant|TraceEventComplete;

export interface TraceEventTracingStartedInBrowser extends TraceEventInstant {
  name: 'TracingStartedInBrowser';
  args: TraceEventArgs&{
    data?: TraceEventArgsData & {
      frameTreeNodeId: number,
      // Frames can only missing in "fake" traces
      frames?: TraceFrame[], persistentIds: boolean,
    },
  };
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

export type Priority = 'Low'|'High'|'VeryHigh'|'Highest';
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

export interface TraceEventLayoutInvalidation extends TraceEventInstant {
  name: 'LayoutInvalidationTracking'|'ScheduleStyleInvalidationTracking';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      reason: LayoutInvalidationReason,
      nodeName?: string,
    },
  };
}

export const enum StyleRecalcInvalidationReason {
  ANIMATION = 'Animation',
}

export interface TraceEventStyleRecalcInvalidation extends TraceEventInstant {
  name: 'StyleRecalcInvalidationTracking';
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

export interface TraceEventPrePaint extends TraceEventComplete {
  name: 'PrePaint';
}

export type TraceEventNestableAsync = TraceEventNestableAsyncBegin|TraceEventNestableAsyncEnd;
export interface TraceEventNestableAsyncBegin extends TraceEventData {
  ph: Phase.ASYNC_NESTABLE_START;
  // The id2 field gives flexibility to explicitly specify if an event
  // id is global among processes or process local. However not all
  // events use it, so both kind of ids need to be marked as optional.
  id2?: {local?: string, global?: string};
  id?: string;
}

export interface TraceEventNestableAsyncEnd extends TraceEventData {
  ph: Phase.ASYNC_NESTABLE_END;
  id2?: {local?: string, global?: string};
  id?: string;
}

export type TraceEventAsyncPerformanceMeasure = TraceEventPerformanceMeasureBegin|TraceEventPerformanceMeasureEnd;

export interface TraceEventPerformanceMeasureBegin extends TraceEventNestableAsyncBegin {
  cat: 'blink.user_timing';
  id: string;
}

export interface TraceEventPerformanceMeasureEnd extends TraceEventNestableAsyncEnd {
  cat: 'blink.user_timing';
  id: string;
}

export interface TraceEventConsoleTimeBegin extends TraceEventNestableAsyncBegin {
  cat: 'blink.console';
  id2: {
    local: string,
  };
}

export interface TraceEventConsoleTimeEnd extends TraceEventNestableAsyncEnd {
  cat: 'blink.console';
  id2: {
    local: string,
  };
}

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

export interface TraceEventPerformanceMark extends TraceEventData {
  cat: 'blink.user_timing';
  ph: Phase.INSTANT|Phase.MARK;
  id: string;
}

// Nestable async events with a duration are made up of two distinct
// events: the begin, and the end. We need both of them to be able to
// display the right information, so we create these synthetic events.
export interface TraceEventSyntheticNestableAsyncEvent extends TraceEventData {
  id?: string;
  id2?: {local?: string, global?: string};
  dur: MicroSeconds;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      beginEvent: TraceEventNestableAsyncBegin,
      endEvent: TraceEventNestableAsyncEnd,
    },
  };
}

export interface TraceEventSyntheticUserTiming extends TraceEventSyntheticNestableAsyncEvent {
  id: string;
  dur: MicroSeconds;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      beginEvent: TraceEventPerformanceMeasureBegin,
      endEvent: TraceEventPerformanceMeasureEnd,
    },
  };
}

export interface TraceEventSyntheticConsoleTiming extends TraceEventSyntheticNestableAsyncEvent {
  id2: {local: string};
  dur: MicroSeconds;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      beginEvent: TraceEventConsoleTimeBegin,
      endEvent: TraceEventConsoleTimeEnd,
    },
  };
}

export interface SyntheticInteractionEvent extends TraceEventSyntheticNestableAsyncEvent {
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
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      beginEvent: TraceEventEventTimingBegin,
      endEvent: TraceEventEventTimingEnd,
    },
  };
}

export interface ProfileCall extends TraceEventComplete {
  callFrame: Protocol.Runtime.CallFrame;
  nodeId: Protocol.integer;
  selfTime: MicroSeconds;
  children: ProfileCall[];
}

export function isSyntheticInteractionEvent(event: TraceEventData): event is SyntheticInteractionEvent {
  return Boolean(
      'interactionId' in event && event.args?.data && 'beginEvent' in event.args.data && 'endEvent' in event.args.data);
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

export function isTraceEventComplete(event: TraceEventData): event is TraceEventComplete {
  return event.ph === Phase.COMPLETE;
}

export function isTraceEventDispatch(event: TraceEventData): event is TraceEventDispatch {
  return event.name === 'EventDispatch';
}

export function isTraceEventInstant(event: TraceEventData): event is TraceEventInstant {
  return event.ph === Phase.INSTANT;
}

export function isTraceEventRendererEvent(event: TraceEventData): event is TraceEventRendererData {
  return isTraceEventInstant(event) || isTraceEventComplete(event);
}

export function isThreadName(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventThreadName {
  return traceEventData.name === 'thread_name';
}

export function isProcessName(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventProcessName {
  return traceEventData.name === 'process_name';
}

export function isTraceEventTracingStartedInBrowser(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventTracingStartedInBrowser {
  return traceEventData.name === 'TracingStartedInBrowser';
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

export function isTraceEventLayoutInvalidation(
    traceEventData: TraceEventData,
    ): traceEventData is TraceEventLayoutInvalidation {
  return traceEventData.name === 'LayoutInvalidationTracking' ||
      traceEventData.name === 'ScheduleStyleInvalidationTracking';
}

export function isTraceEventStyleRecalcInvalidation(traceEventData: TraceEventData):
    traceEventData is TraceEventStyleRecalcInvalidation {
  return traceEventData.name === 'StyleRecalcInvalidationTracking';
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
  return traceEventData.name === 'EventTiming';
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

export function isTraceEventProfileChunk(traceEventData: TraceEventData): traceEventData is TraceEventProfileChunk {
  return traceEventData.name === 'ProfileChunk';
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
    ): traceEventData is TraceEventSyntheticNetworkRequest {
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

export function isSyntheticUserTimingTraceEvent(traceEventData: TraceEventData):
    traceEventData is TraceEventSyntheticUserTiming {
  if (traceEventData.cat !== 'blink.user_timing') {
    return false;
  }
  const data = traceEventData.args?.data;
  if (!data) {
    return false;
  }
  return 'beginEvent' in data && 'endEvent' in data;
}

export function isSyntheticConsoleTimingTraceEvent(traceEventData: TraceEventData):
    traceEventData is TraceEventSyntheticConsoleTiming {
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
    traceEventData is TraceEventPerformanceMeasureBegin|TraceEventPerformanceMeasureEnd {
  return isTraceEventAsyncPhase(traceEventData) && traceEventData.cat === 'blink.user_timing';
}

export function isTraceEventPerformanceMark(traceEventData: TraceEventData):
    traceEventData is TraceEventPerformanceMark {
  return (traceEventData.ph === Phase.MARK || traceEventData.ph === Phase.INSTANT) &&
      traceEventData.cat === 'blink.user_timing';
}

export function isTraceEventConsoleTime(traceEventData: TraceEventData): traceEventData is TraceEventConsoleTimeBegin|
    TraceEventConsoleTimeEnd {
  return isTraceEventAsyncPhase(traceEventData) && traceEventData.cat === 'blink.console';
}

export function isTraceEventTimeStamp(traceEventData: TraceEventData): traceEventData is TraceEventTimeStamp {
  return traceEventData.ph === Phase.INSTANT && traceEventData.name === 'TimeStamp';
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

export function isProfileCall(event: TraceEventData): event is ProfileCall {
  return 'callFrame' in event;
}

export const enum KnownEventName {
  /* Task/Other */
  Program = 'Program',
  RunTask = 'RunTask',
  AsyncTask = 'AsyncTask',
  /* Load */
  XHRLoad = 'XHRLoad',
  XHRReadyStateChange = 'XHRReadyStateChange',
  /* Parse */
  ParseHTML = 'ParseHTML',
  ParseCSS = 'ParseAuthorStyleSheet',
  /* V8 */
  CompileScript = 'V8.CompileScript',
  CompileCode = 'V8.CompileCode',
  CompileModule = 'V8.CompileModule',
  Optimize = 'V8.OptimizeCode',
  WasmStreamFromResponseCallback = 'v8.wasm.streamFromResponseCallback',
  WasmCompiledModule = 'v8.wasm.compiledModule',
  WasmCachedModule = 'v8.wasm.cachedModule',
  WasmModuleCacheHit = 'v8.wasm.moduleCacheHit',
  WasmModuleCacheInvalid = 'v8.wasm.moduleCacheInvalid',
  /* Js */
  RunMicrotasks = 'RunMicrotasks',
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
  /* Layout (a.k.a "Rendering") */
  ScheduleStyleRecalculation = 'ScheduleStyleRecalculation',
  RecalculateStyles = 'RecalculateStyles',
  Layout = 'Layout',
  UpdateLayoutTree = 'UpdateLayoutTree',
  InvalidateLayout = 'InvalidateLayout',
  LayoutInvalidationTracking = 'LayoutInvalidationTracking',
  ComputeIntersections = 'ComputeIntersections',
  HitTest = 'HitTest',
  PrePaint = 'PrePaint',
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
}
