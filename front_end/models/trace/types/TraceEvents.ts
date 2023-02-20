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
    data: TraceEventArgsData & {
      cpuProfile?: TraceEventPartialProfile,
      timeDeltas?: MicroSeconds[],
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
  ts: MicroSeconds;
  dur: MicroSeconds;
}

export interface TraceEventSyntheticNetworkRequest extends TraceEventComplete {
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      decodedBodyLength: number,
      dnsLookup: MicroSeconds,
      download: MicroSeconds,
      encodedDataLength: number,
      finishTime: MicroSeconds,
      frame: string,
      fromCache: boolean,
      fromServiceWorker: boolean,
      host: string,
      initialConnection: MicroSeconds,
      isHttps: boolean,
      mimeType: string,
      networkDuration: MicroSeconds,
      pathname: string,
      search: string,
      priority: string,
      processingDuration: MicroSeconds,
      protocol: string,
      proxyNegotiation: MicroSeconds,
      queueing: MicroSeconds,
      receiveHeadersEnd: MicroSeconds,
      redirects: TraceEventSyntheticNetworkRedirect[],
      redirectionDuration: MicroSeconds,
      renderBlocking: RenderBlocking,
      requestId: string,
      requestingFrameUrl: string,
      requestSent: MicroSeconds,
      requestTime: number,
      sendEnd: MicroSeconds,
      sendStart: MicroSeconds,
      statusCode: number,
      ssl: MicroSeconds,
      sslStart: MicroSeconds,
      stalled: MicroSeconds,
      totalTime: MicroSeconds,
      url: string,
      waiting: MicroSeconds,
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

export type PageLoadEvent = TraceEventFirstContentfulPaint|TraceEventMarkDOMContent|TraceEventInteractiveTime|
    TraceEventLargestContentfulPaintCandidate|TraceEventLayoutShift;

export interface TraceEventLargestContentfulPaintCandidate extends TraceEventMark {
  name: 'largestContentfulPaint::Candidate';
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      candidateIndex: number,
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
      frames: TraceFrame[],
      persistentIds: boolean,
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

export type TraceRect = [number, number, number, number];
export type TraceImpactedNode = {
  // These keys come from the trace data, so we have to use underscores.
  /* eslint-disable @typescript-eslint/naming-convention */
  new_rect: TraceRect,
  node_id: Protocol.DOM.BackendNodeId,
  old_rect: TraceRect,
  /* eslint-enable @typescript-eslint/naming-convention */
};

// These keys come from the trace data, so we have to use underscores.
export interface TraceEventLayoutShift extends TraceEventInstant {
  name: 'LayoutShift';
  normalized?: boolean;
  args: TraceEventArgs&{
    frame: string,
    data?: TraceEventArgsData&{
      // These keys come from the trace data, so we have to use underscores.
      /* eslint-disable @typescript-eslint/naming-convention */
      cumulative_score: number,
      frame_max_distance: number,
      had_recent_input: boolean,
      impacted_nodes: TraceImpactedNode[]|undefined,
      is_main_frame: boolean,
      overall_max_distance: number,
      region_rects: TraceRect[],
      score: number,
      weighted_score_delta: number,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
  };
}

export type Priorty = 'Low'|'High'|'VeryHigh'|'Highest';
export type RenderBlocking = 'blocking'|'non_blocking'|'in_body_parser_blocking'|'potentially_blocking';
export interface TraceEventResourceSendRequest extends TraceEventInstant {
  name: 'ResourceSendRequest';
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      frame: string,
      requestId: string,
      url: string,
      priority: Priorty,
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
      timing: {
        connectEnd: MilliSeconds,
        connectStart: MilliSeconds,
        dnsEnd: MilliSeconds,
        dnsStart: MilliSeconds,
        proxyEnd: MilliSeconds,
        proxyStart: MilliSeconds,
        pushEnd: MilliSeconds,
        pushStart: MilliSeconds,
        receiveHeadersEnd: MilliSeconds,
        requestTime: number,
        sendEnd: MilliSeconds,
        sendStart: MilliSeconds,
        sslEnd: MilliSeconds,
        sslStart: MilliSeconds,
        workerReady: MilliSeconds,
        workerStart: MilliSeconds,
      },
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

export type TraceEventAsyncUserTiming = TraceEventUserTimingBegin|TraceEventUserTimingEnd;

export interface TraceEventUserTimingBegin extends TraceEventData {
  cat: 'blink.user_timing';
  ph: Phase.ASYNC_NESTABLE_START;
  id: string;
}

export interface TraceEventUserTimingEnd extends TraceEventData {
  cat: 'blink.user_timing';
  ph: Phase.ASYNC_NESTABLE_END;
  id: string;
}

// A UserTiming block is made up of two distinct events: the begin, and the
// end. We need both of them to be able to display the right information, so
// the UserTimingHandler creates these synthetic events.
export interface TraceEventSyntheticUserTiming extends TraceEventData {
  id: string;
  dur: MicroSeconds;
  args: TraceEventArgs&{
    data: TraceEventArgsData & {
      beginEvent: TraceEventUserTimingBegin,
      endEvent: TraceEventUserTimingEnd,
    },
  };
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

export function isTraceEventUserTimingsBeginOrEnd(traceEventData: TraceEventData):
    traceEventData is TraceEventUserTimingBegin|TraceEventUserTimingEnd {
  const validPhases = new Set([Phase.ASYNC_NESTABLE_START, Phase.ASYNC_NESTABLE_END]);

  return validPhases.has(traceEventData.ph) && traceEventData.cat === 'blink.user_timing';
}
