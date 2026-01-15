// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';

import type {Micro, Milli, Seconds, TraceWindowMicro} from './Timing.js';

/** Trace Events. **/
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

export function isPhaseAsync(phase: Phase): boolean {
  return isNestableAsyncPhase(phase) || phase === Phase.ASYNC_BEGIN || phase === Phase.ASYNC_STEP_INTO ||
      phase === Phase.ASYNC_END || phase === Phase.ASYNC_STEP_PAST;
}

export function isFlowPhase(phase: Phase): boolean {
  return phase === Phase.FLOW_START || phase === Phase.FLOW_STEP || phase === Phase.FLOW_END;
}

export const enum Scope {
  THREAD = 't',
  PROCESS = 'p',
  GLOBAL = 'g',
}

export interface Event {
  args?: Args;
  cat: string;
  name: string;
  ph: Phase;
  pid: ProcessID;
  tid: ThreadID;
  tts?: Micro;
  ts: Micro;
  tdur?: Micro;
  dur?: Micro;
}
export function objectIsEvent(obj: object): obj is Event {
  return 'cat' in obj && 'name' in obj && 'ts' in obj;
}

export interface Args {
  data?: ArgsData;
  sampleTraceId?: number;
  stackTrace?: CallFrame[];
}

export interface ArgsData {
  stackTrace?: CallFrame[];
  sampleTraceId?: number;
  url?: string;
  navigationId?: string;
  /** For soft navs. */
  performanceTimelineNavigationId?: number;
  frame?: string;
}

export interface CallFrame {
  codeType?: string;
  functionName: string;
  // Trace events are inconsistent here sadly :(
  scriptId: number|string;
  columnNumber: number;
  lineNumber: number;
  url: string;
}

export function objectIsCallFrame(object: object): object is CallFrame {
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
  // Added to Chrome in April 2024:
  // crrev.com/c/5424783
  isOutermostMainFrame?: boolean;
  // Added to Chrome in June 2024:
  // crrev.com/c/5595033
  isInPrimaryMainFrame?: boolean;
}

// Sample events.

export interface Sample extends Event {
  ph: Phase.SAMPLE;
}

/**
 * A fake trace event created to support CDP.Profiler.Profiles in the
 * trace engine.
 *
 * Do not extend the SyntheticBased interface because this one doesn't have a raw trace event but a raw cpu profile.
 * Also we won't manage this event through SyntheticEventsManager.
 */
export interface SyntheticCpuProfile extends Complete {
  name: Name.CPU_PROFILE;
  id: ProfileID;
  args: Args&{
    data: ArgsData & {
      cpuProfile: Protocol.Profiler.Profile,
    },
  };
}

export interface Profile extends Sample {
  name: Name.PROFILE;
  id: ProfileID;
  args: Args&{
    data: ArgsData & {
      startTime: Micro,
      source?: ProfileSource,
    },
  };
}

export interface ProfileChunk extends Sample {
  name: Name.PROFILE_CHUNK;
  id: ProfileID;
  args: Args&{
    // `data` is only missing in "fake" traces
    data?: ArgsData & {
      cpuProfile?: PartialProfile,
      timeDeltas?: Micro[],
      lines?: number[],
      source?: ProfileSource,
      columns?: number[],
    },
  };
}

export interface PartialProfile {
  nodes?: PartialNode[];
  samples: CallFrameID[];
  /**
   * Contains trace ids assigned to samples, if any. Trace ids are
   * keyed by the sample index in the profile (the keys of the object
   * are strings containing the numeric index).
   */
  /* eslint-disable @typescript-eslint/naming-convention */
  trace_ids?: Record<string, number>;
  /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Source of profile data, used to select the most relevant profile when
 * multiple profiles exist for the same thread.
 *
 * - 'Inspector': User-initiated via console.profile()/profileEnd().
 * - 'Internal': Browser-initiated during performance traces.
 * - 'SelfProfiling': Page-initiated via JS Self-Profiling API.
 *
 * Selection priority (see PROFILE_SOURCES_BY_PRIORITY in SamplesHandler.ts).
 */
export type ProfileSource = 'Inspector'|'SelfProfiling'|'Internal';

export const VALID_PROFILE_SOURCES: readonly ProfileSource[] = ['Inspector', 'SelfProfiling', 'Internal'] as const;

export interface PartialNode {
  callFrame: CallFrame;
  id: CallFrameID;
  parent?: CallFrameID;
}

// Complete events.

export interface Complete extends Event {
  ph: Phase.COMPLETE;
  dur: Micro;
}

export interface RunTask extends Complete {
  name: Name.RUN_TASK;
}
export function isRunTask(event: Event): event is RunTask {
  return event.name === Name.RUN_TASK && event.ph === Phase.COMPLETE;
}

export interface FireIdleCallback extends Complete {
  name: Name.FIRE_IDLE_CALLBACK;
  args: Args&{
    data: ArgsData & {
      allottedMilliseconds: Milli,
      frame: string,
      id: number,
      timedOut: boolean,
    },
  };
}

export interface SchedulePostMessage extends Instant {
  name: Name.SCHEDULE_POST_MESSAGE;
  args: Args&{
    data: ArgsData & {
      traceId: string,
    },
  };
}

export interface HandlePostMessage extends Complete {
  name: Name.HANDLE_POST_MESSAGE;
  args: Args&{
    data: ArgsData & {
      traceId: string,
    },
  };
}

export interface Dispatch extends Complete {
  name: 'EventDispatch';
  args: Args&{
    data: ArgsData & {
      type: string,
    },
  };
}

export interface ParseHTML extends Complete {
  name: 'ParseHTML';
  args: Args&{
    beginData: {
      frame: string,
      startLine: number,
      url: string,
      sampleTraceId?: number,
    },
    endData?: {
      endLine: number,
    },
  };
}

export interface Begin extends Event {
  ph: Phase.BEGIN;
}

export interface End extends Event {
  ph: Phase.END;
}

/**
 * This denotes a complete event created from a pair of begin and end
 * events. For practicality, instead of always having to look for the
 * end event corresponding to a begin event, we create a synthetic
 * complete event that comprises the data of both from the beginning in
 * the RendererHandler.
 */
export type SyntheticComplete = Complete;

/**
 * TODO(paulirish): Migrate to the new (Sept 2024) EventTiming trace events.
 * See https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/window_performance.cc;l=900-901;drc=b503c262e425eae59ced4a80d59d176ed07152c7
 **/
export type EventTimingBeginOrEnd = EventTimingBegin|EventTimingEnd;

export interface EventTimingBegin extends Event {
  ph: Phase.ASYNC_NESTABLE_START;
  name: Name.EVENT_TIMING;
  id: string;
  args: Args&{
    // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/performance_event_timing.cc;l=297;drc=4f00803ca25c0d0480ed14844d6406933c21e80e
    data: ArgsData & {
      cancelable: boolean,
      duration: Milli,
      type: string,
      interactionId: number,
      interactionOffset: number,
      nodeId: Protocol.DOM.BackendNodeId,
      frame?: string,  // From May 2022 onwards, this is where frame is located. https://chromium-review.googlesource.com/c/chromium/src/+/3632661
      processingEnd?: Milli,
      processingStart?: Milli,
      timeStamp?: Milli,
      enqueuedToMainThreadTime?: Milli,
      commitFinishTime?: Milli,
    },
    frame?: string,  // Prior to May 2022, `frame` was here in args.
  };
}
export interface EventTimingEnd extends Event {
  ph: Phase.ASYNC_NESTABLE_END;
  name: Name.EVENT_TIMING;
  id: string;
  args: Args;
}

export interface GPUTask extends Complete {
  name: 'GPUTask';
  args: Args&{
    data?: ArgsData & {
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
  ts: Micro;
  dur: Micro;
}

/**
 * ProcessedArgsData is used to store the processed data of a network
 * request. Which is used to distinguish from the date we extract from the
 * trace event directly.
 **/
interface SyntheticArgsData {
  dnsLookup: Micro;
  download: Micro;
  downloadStart: Micro;
  finishTime: Micro;
  initialConnection: Micro;
  isDiskCached: boolean;
  isHttps: boolean;
  isMemoryCached: boolean;
  isPushedResource: boolean;
  networkDuration: Micro;
  processingDuration: Micro;
  proxyNegotiation: Micro;
  queueing: Micro;
  redirectionDuration: Micro;
  requestSent: Micro;
  sendStartTime: Micro;
  ssl: Micro;
  stalled: Micro;
  totalTime: Micro;
  /** receiveHeadersEnd - sendEnd */
  waiting: Micro;
  /** receiveHeadersStart - sendEnd */
  serverResponseTime: Micro;
}

export interface SyntheticNetworkRequest extends Complete, SyntheticBased<Phase.COMPLETE> {
  rawSourceEvent: ResourceSendRequest;
  args: Args&{
    data: ArgsData & {
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
      fromServiceWorker: boolean|undefined,
      isLinkPreload: boolean,
      /** Empty string if no response. */
      mimeType: string,
      priority: Protocol.Network.ResourcePriority,
      initialPriority: Protocol.Network.ResourcePriority,
      /**
       * This is the protocol used to resolve the request.
       *
       * Note, this is not the same as URL.protocol.
       *
       * Example values (not exhaustive): http/0.9, http/1.0, http/1.1, http, h2, h3-Q050, data, blob, file
       */
      protocol: string,
      redirects: SyntheticNetworkRedirect[],
      renderBlocking: RenderBlocking,
      requestId: string,
      requestingFrameUrl: string,
      /** 0 if no response. */
      statusCode: number,
      resourceType: Protocol.Network.ResourceType,
      responseHeaders: Array<{name: string, value: string}>|null,
      fetchPriorityHint: FetchPriorityHint,
      url: string,
      /** True only if got a 'resourceFinish' event indicating a failure. */
      failed: boolean,
      /** True only if got a 'resourceFinish' event. Note even failed requests with no response may be "finished". */
      finished: boolean,
      hasResponse: boolean,
      /** If undefined, trace was either too old or had no response. */
      connectionId: number|undefined,
      /** If undefined, trace was either too old or had no response. */
      connectionReused: boolean|undefined,
      // Optional fields
      initiator?: Initiator,
      requestMethod?: string,
      timing?: ResourceReceiveResponseTimingData,
      /** Server response time according to Lightrider. */
      lrServerResponseTime?: Milli,
    },
  };
  cat: 'loading';
  name: Name.SYNTHETIC_NETWORK_REQUEST;
  ph: Phase.COMPLETE;
  dur: Micro;
  tdur: Micro;
  ts: Micro;
  tts: Micro;
  pid: ProcessID;
  tid: ThreadID;
}

export interface SyntheticWebSocketConnection extends Complete, SyntheticBased<Phase.COMPLETE> {
  rawSourceEvent: Event;
  args: Args&{
    data: ArgsData & {
      identifier: number,
      priority: Protocol.Network.ResourcePriority,
      url: string,
    },
  };
  cat: string;
  name: 'SyntheticWebSocketConnection';
  ph: Phase.COMPLETE;
  dur: Micro;
  ts: Micro;
  pid: ProcessID;
  tid: ThreadID;
  s: Scope;
}

export const enum AuctionWorkletType {
  BIDDER = 'bidder',
  SELLER = 'seller',
  // Not expected to be used, but here as a fallback in case new types get
  // added and we have yet to update the trace engine.
  UNKNOWN = 'unknown',
}

export interface SyntheticAuctionWorklet extends Instant, SyntheticBased<Phase.INSTANT> {
  rawSourceEvent: Event;
  name: 'SyntheticAuctionWorklet';
  // The PID that the AuctionWorklet is running in.
  pid: ProcessID;
  // URL
  host: string;
  // An ID used to pair up runningInProcessEvents with doneWithProcessEvents
  target: string;
  type: AuctionWorkletType;
  args: Args&{
    data: ArgsData & {
      // There are two threads for a worklet that we care about, so we gather
      // the thread_name events so we can know the PID and TID for them (and
      // hence display the right events in the track for each thread)
      utilityThread: ThreadName,
      v8HelperThread: ThreadName,
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
                runningInProcessEvent: AuctionWorkletRunningInProcess,
                doneWithProcessEvent: AuctionWorkletDoneWithProcess,
              } |
              {
                doneWithProcessEvent: AuctionWorkletDoneWithProcess,
                runningInProcessEvent?: AuctionWorkletRunningInProcess,
              } |
              {
                runningInProcessEvent: AuctionWorkletRunningInProcess,
                doneWithProcessEvent?: AuctionWorkletDoneWithProcess,

              }),
    // clang-format on
  };
}
export interface AuctionWorkletRunningInProcess extends Event {
  name: 'AuctionWorkletRunningInProcess';
  ph: Phase.INSTANT;
  args: Args&{
    data: ArgsData & {
      host: string,
      pid: ProcessID,
      target: string,
      type: AuctionWorkletType,
    },
  };
}
export interface AuctionWorkletDoneWithProcess extends Event {
  name: 'AuctionWorkletDoneWithProcess';
  ph: Phase.INSTANT;
  args: Args&{
    data: ArgsData & {
      host: string,
      pid: ProcessID,
      target: string,
      type: AuctionWorkletType,
    },
  };
}

export function isAuctionWorkletRunningInProcess(event: Event): event is AuctionWorkletRunningInProcess {
  return event.name === 'AuctionWorkletRunningInProcess';
}
export function isAuctionWorkletDoneWithProcess(event: Event): event is AuctionWorkletDoneWithProcess {
  return event.name === 'AuctionWorkletDoneWithProcess';
}

// Snapshot events.

/**
 * In January 2025 when crrev.com/c/6197645 landed, it changed the format of screenshot events.
 * That is why we two screenshot types:
 * `LegacyScreenshot` and `LegacySyntheticScreenshot`: BEFORE the above CL.
 * `Screenshot`: AFTER the above CL.
 * Important things to note:
 * 1. Both the "old" and "new" events share the name "Screenshot" but their format is very different.
 * 2. The old events had both a raw event (LegacyScreenshot) and a synthetic
 *    event (LegacySyntheticScreenshot). The new events only have a raw event, as
 *    we do not need the additional complexity of a synthetic event.
 * 3. Because we like to support "old" traces, DevTools will maintain its
 *    support for both screenshot events for the foreseeable future. If you are
 *    consuming screenshot events from the ScreenshotHandler, you must make sure
 *    to have your code deal with the two different formats.
 */
export interface LegacyScreenshot extends Event {
  /**
   * @deprecated This value is incorrect. Use ScreenshotHandler.getPresentationTimestamp()
   */
  ts: Micro;
  /** The id is the frame sequence number in hex */
  id: string;
  args: Args&{
    snapshot: string,
  };
  name: Name.SCREENSHOT;
  cat: 'disabled-by-default-devtools.screenshot';
  ph: Phase.OBJECT_SNAPSHOT;
}
export function isLegacyScreenshot(event: Event): event is LegacyScreenshot {
  return event.name === Name.SCREENSHOT && 'id' in event;
}
export function isLegacySyntheticScreenshot(event: Event): event is LegacySyntheticScreenshot {
  return event.name === Name.SCREENSHOT && 'dataUri' in (event.args ?? {});
}

export function isScreenshot(event: Event): event is Screenshot {
  return event.name === Name.SCREENSHOT && 'source_id' in (event.args ?? {});
}

export interface LegacySyntheticScreenshot extends Event, SyntheticBased {
  rawSourceEvent: LegacyScreenshot;
  /** This is the correct presentation timestamp. */
  ts: Micro;
  args: Args&{
    dataUri: string,
  };
  name: Name.SCREENSHOT;
  cat: 'disabled-by-default-devtools.screenshot';
  ph: Phase.OBJECT_SNAPSHOT;
}

export interface Screenshot extends Instant {
  args: Args&{
    snapshot: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    source_id: number,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    frame_sequence: number,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    expected_display_time: number,
  };
}

// Animation events.

export interface Animation extends Event {
  args: Args&{
    data: ArgsData & {
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

export interface Metadata extends Event {
  ph: Phase.METADATA;
  args: Args&{
    name?: string,
    uptime?: string,
  };
}

export interface ThreadName extends Metadata {
  name: Name.THREAD_NAME;
  args: Args&{
    name?: string,
  };
}

export interface ProcessName extends Metadata {
  name: 'process_name';
}

// Mark events.

export interface Mark extends Event {
  ph: Phase.MARK;
}

export interface NavigationStart extends Mark {
  name: Name.NAVIGATION_START;
  args: Args&{
    frame: string,
    data?: ArgsData&{
      /** Must be non-empty to be valid. An empty documentLoaderURL means the event can be ignored. */
      documentLoaderURL: string,
      isLoadingMainFrame: boolean,
      navigationId: string,
      /**
       * `isOutermostMainFrame` was introduced in crrev.com/c/3625434 and exists because of Fenced Frames
       * [github.com/WICG/fenced-frame/tree/master/explainer]. Fenced frames introduce a situation where
       * `isLoadingMainFrame` could be true for a navigation, but that navigation be within an embedded "main frame", and
       * therefore it wouldn't be on the top level main frame. In situations where we need to distinguish that, we can
       * rely on `isOutermostMainFrame`, which will only be true for navigations on the top level main frame.
       * This flag is optional as it was introduced in May 2022; so users reasonably may import traces from before that
       * date that do not have this field present.
       */
      isOutermostMainFrame?: boolean,
      /**
       * @deprecated use documentLoaderURL for navigation events URLs
       */
      url?: string,
    },
  };
}

export interface SoftNavigationStart extends Event {
  name: Name.SOFT_NAVIGATION_START;
  ph: Phase.ASYNC_NESTABLE_INSTANT;
  args: Args&{
    frame: string,
    context: {
      softNavContextId: number,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      URL: string,
      timeOrigin: number,
      domModifications: number,
      firstContentfulPaint: number,
      paintedArea: number,
      performanceTimelineNavigationId: number,
      repaintedArea: number,
    },
  };
}

export function isSoftNavigationStart(event: Event): event is SoftNavigationStart {
  return event.name === Name.SOFT_NAVIGATION_START;
}

export interface FirstContentfulPaint extends Mark {
  name: Name.MARK_FCP;
  args: Args&{
    frame: string,
    data?: ArgsData&{
      navigationId: string,
    },
  };
}

export interface FirstPaint extends Mark {
  name: Name.MARK_FIRST_PAINT;
  args: Args&{
    frame: string,
    data?: ArgsData&{
      navigationId: string,
    },
  };
}

export type PageLoadEvent = FirstContentfulPaint|MarkDOMContent|InteractiveTime|AnyLargestContentfulPaintCandidate|
    LayoutShift|FirstPaint|MarkLoad|NavigationStart|SoftNavigationStart;

const markerTypeGuards = [
  isMarkDOMContent,
  isMarkLoad,
  isFirstPaint,
  isFirstContentfulPaint,
  isAnyLargestContentfulPaintCandidate,
  isNavigationStart,
  isSoftNavigationStart,
];

export const MarkerName = [
  Name.MARK_DOM_CONTENT,
  Name.MARK_LOAD,
  Name.MARK_FIRST_PAINT,
  Name.MARK_FCP,
  Name.MARK_LCP_CANDIDATE,
  Name.MARK_LCP_CANDIDATE_FOR_SOFT_NAVIGATION,
  Name.NAVIGATION_START,
  Name.SOFT_NAVIGATION_START,
] as const;

export interface MarkerEvent extends Event {
  name: typeof MarkerName[number];
}

export function isMarkerEvent(event: Event): event is MarkerEvent {
  if (event.ph === Phase.INSTANT || Phase.ASYNC_NESTABLE_INSTANT || event.ph === Phase.MARK) {
    return markerTypeGuards.some(fn => fn(event));
  }
  return false;
}

const pageLoadEventTypeGuards = [
  ...markerTypeGuards,
  isInteractiveTime,
];

export function eventIsPageLoadEvent(event: Event): event is PageLoadEvent {
  if (event.ph === Phase.INSTANT || Phase.ASYNC_NESTABLE_INSTANT || event.ph === Phase.MARK) {
    return pageLoadEventTypeGuards.some(fn => fn(event));
  }
  return false;
}

export interface LargestContentfulPaintCandidate extends Mark {
  name: Name.MARK_LCP_CANDIDATE;
  args: Args&{
    frame: string,
    data?: ArgsData&{
      candidateIndex: number,
      isOutermostMainFrame: boolean,
      isMainFrame: boolean,
      navigationId: string,
      nodeId: Protocol.DOM.BackendNodeId,
      loadingAttr: string,
      type?: string,
      // Landed in Chrome M140: crrev.com/c/6702010
      nodeName?: string,
    },
  };
}

export interface LargestContentfulPaintCandidateForSoftNavigation extends Mark {
  name: Name.MARK_LCP_CANDIDATE_FOR_SOFT_NAVIGATION;
  args: Args&{
    frame: string,
    data?: ArgsData&{
      candidateIndex: number,
      isOutermostMainFrame: boolean,
      isMainFrame: boolean,
      nodeId: Protocol.DOM.BackendNodeId,
      loadingAttr: string,
      performanceTimelineNavigationId: number,
      type?: string,
      // Landed in Chrome M140: crrev.com/c/6702010
      nodeName?: string,
    },
  };
}

export type AnyLargestContentfulPaintCandidate =
    LargestContentfulPaintCandidate|LargestContentfulPaintCandidateForSoftNavigation;

export interface LargestImagePaintCandidate extends Mark {
  name: 'LargestImagePaint::Candidate';
  args: Args&{
    frame: string,
    data?: ArgsData&{
      candidateIndex: number,
      imageUrl: string,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      DOMNodeId: Protocol.DOM.BackendNodeId,
    },
  };
}
export interface LargestTextPaintCandidate extends Mark {
  name: 'LargestTextPaint::Candidate';
  args: Args&{
    frame: string,
    data?: ArgsData&{
      candidateIndex: number,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      DOMNodeId: Protocol.DOM.BackendNodeId,
      // Added in crbug.com/413284569
      nodeName?: string,
    },
  };
}

export interface InteractiveTime extends Mark {
  name: 'InteractiveTime';
  args: Args&{
    args: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      total_blocking_time_ms: number,
    },
    frame: string,
  };
}

// Instant events.

export interface Instant extends Event {
  ph: Phase.INSTANT;
  s: Scope;
}

export interface DOMStats extends Instant {
  name: 'DOMStats';
  args: Args&{
    data: ArgsData & {
      frame: string,
      totalElements: number,
      maxChildren?: {
        nodeId: Protocol.DOM.BackendNodeId,
        nodeName: string,
        numChildren: number,
      },
      maxDepth?: {
        nodeId: Protocol.DOM.BackendNodeId,
        nodeName: string,
        depth: number,
      },
    },
  };
}

export interface UpdateCounters extends Instant {
  name: 'UpdateCounters';
  args: Args&{
    data: ArgsData & {
      documents: number,
      jsEventListeners: number,
      jsHeapSizeUsed: number,
      nodes: number,
      gpuMemoryLimitKB?: number,
    },
  };
}

export type RendererEvent = Instant|Complete;

export interface TracingStartedInBrowser extends Instant {
  name: Name.TRACING_STARTED_IN_BROWSER;
  args: Args&{
    data?: ArgsData & {
      frameTreeNodeId: number,
      // Frames can only missing in "fake" traces
      persistentIds: boolean,
      frames?: TraceFrame[],
    },
  };
}

export interface TracingSessionIdForWorker extends Instant {
  name: 'TracingSessionIdForWorker';
  args: Args&{
    data?: ArgsData & {
      url: string,
      workerId: WorkerId,
      workerThreadId: ThreadID,
      frame: string,
    },
  };
}
export function isTracingSessionIdForWorker(event: Event): event is TracingSessionIdForWorker {
  return event.name === 'TracingSessionIdForWorker';
}

export interface FrameCommittedInBrowser extends Instant {
  name: 'FrameCommittedInBrowser';
  args: Args&{
    data?: ArgsData & TraceFrame,
  };
}

export interface MainFrameViewport extends Instant {
  name: 'PaintTimingVisualizer::Viewport';
  args: {
    data: ArgsData&{
      // eslint-disable-next-line @typescript-eslint/naming-convention
      viewport_rect: number[],
      /** Device Pixel Ratio. Added in m128 */
      dpr: number,
    },
  };
}

export interface CommitLoad extends Instant {
  name: 'CommitLoad';
  args: Args&{
    data?: ArgsData & {
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

export interface MarkDOMContent extends Instant {
  name: Name.MARK_DOM_CONTENT;
  args: Args&{
    data?: ArgsData & {
      frame: string,
      isMainFrame: boolean,
      page: string,
      isOutermostMainFrame?: boolean,
    },
  };
}

export interface MarkLoad extends Instant {
  name: Name.MARK_LOAD;
  args: Args&{
    data?: ArgsData & {
      frame: string,
      isMainFrame: boolean,
      page: string,
      isOutermostMainFrame?: boolean,
    },
  };
}

export interface Async extends Event {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_INSTANT|Phase.ASYNC_NESTABLE_END|Phase.ASYNC_STEP_INTO|
      Phase.ASYNC_BEGIN|Phase.ASYNC_END|Phase.ASYNC_STEP_PAST;
}

export type TraceRect = [number, number, number, number];
export interface TraceImpactedNode {
  // These keys come from the trace data, so we have to use underscores.
  /* eslint-disable @typescript-eslint/naming-convention */
  new_rect: TraceRect;
  node_id: Protocol.DOM.BackendNodeId;
  old_rect: TraceRect;
  debug_name?: string;
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type LayoutShiftData = ArgsData&{
  // These keys come from the trace data, so we have to use underscores.
  /* eslint-disable @typescript-eslint/naming-convention */
  cumulative_score: number,
  frame_max_distance: number,
  had_recent_input: boolean,
  impacted_nodes: TraceImpactedNode[] | undefined,
  is_main_frame: boolean,
  overall_max_distance: number,
  region_rects: TraceRect[],
  /** @deprecated This value will incorrectly overreport for shifts within an iframe. */
  score: number,
  /** This is the preferred "score", used for CLS. If `is_main_frame` is true, `score` and `weighted_score_delta` will be equal. But if the shift is from an iframe, `weighted_score_delta` will be appropriately reduced to account for the viewport size of that iframe. https://wicg.github.io/layout-instability/#subframe-weighting-factor and b/275509162 */
  weighted_score_delta: number,
  navigationId?: string,
  /* eslint-enable @typescript-eslint/naming-convention */
};
export interface LayoutShift extends Instant {
  name: Name.LAYOUT_SHIFT;
  normalized?: boolean;
  args: Args&{
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
  /** screenshot taken before and after this shift. Before *should* always exist, but after might not at the end of a trace. */
  screenshots: {before: LegacySyntheticScreenshot|Screenshot|null, after: LegacySyntheticScreenshot|Screenshot|null};
  timeFromNavigation?: Micro;
  // The sum of the weighted scores of the shifts that
  // belong to a session window up until this shift
  // (inclusive).
  cumulativeWeightedScoreInWindow: number;
  sessionWindowData: LayoutShiftSessionWindowData;
}

export interface SyntheticLayoutShift extends Omit<LayoutShift, 'name'>, SyntheticBased<Phase.INSTANT> {
  name: Name.SYNTHETIC_LAYOUT_SHIFT;
  rawSourceEvent: LayoutShift;
  args: Args&{
    frame: string,
    data?: LayoutShiftData&{
      rawEvent: LayoutShift,
    },
  };
  parsedData: LayoutShiftParsedData;
}

export const NO_NAVIGATION = 'NO_NAVIGATION';

/**
 * This maybe be a navigation id string from Chrome, or `NO_NAVIGATION`, which represents the
 * portion of the trace for which we don't have any navigation event for (as it happeneded prior
 * to the trace start).
 */
export type NavigationId = string;

/**
 * This is a synthetic Layout shift cluster. The rawSourceEvent is the worst layout shift event
 * in the cluster.
 */
export interface SyntheticLayoutShiftCluster extends SyntheticBased<Phase.COMPLETE> {
  name: 'SyntheticLayoutShiftCluster';
  clusterWindow: TraceWindowMicro;
  clusterCumulativeScore: number;
  events: SyntheticLayoutShift[];
  // For convenience we split apart the cluster into good, NI, and bad windows.
  // Since a cluster may remain in the good window, we mark NI and bad as being
  // possibly null.
  scoreWindows: {
    good: TraceWindowMicro,
    needsImprovement?: TraceWindowMicro,
    bad?: TraceWindowMicro,
  };
  // The last navigation that happened before this cluster.
  navigationId?: NavigationId;
  worstShiftEvent?: Event;
  // This is the start of the cluster: the start of the first layout shift of the cluster.
  ts: Micro;
  // The duration of the cluster. This should include up until the end of the last
  // layout shift in this cluster.
  dur: Micro;
  cat: '';
  ph: Phase.COMPLETE;
  pid: ProcessID;
  tid: ThreadID;
}

export type FetchPriorityHint = 'low'|'high'|'auto';
export type RenderBlocking =
    'blocking'|'non_blocking'|'in_body_parser_blocking'|'potentially_blocking'|'dynamically_injected_non_blocking';

export interface Initiator {
  type: Protocol.Network.InitiatorType;
  fetchType: string;
  columnNumber?: number;
  lineNumber?: number;
  url?: string;
}

export interface ResourceSendRequest extends Instant {
  name: 'ResourceSendRequest';
  args: Args&{
    data: ArgsData & {
      frame: string,
      requestId: string,
      url: string,
      priority: Protocol.Network.ResourcePriority,
      /** Added Feb 2024. https://crrev.com/c/5277583 */
      resourceType?: Protocol.Network.ResourceType,
      /** Added Feb 2024. https://crrev.com/c/5297615 */
      fetchPriorityHint?: FetchPriorityHint,
      requestMethod?: string,
      renderBlocking?: RenderBlocking,
      initiator?: Initiator,
      isLinkPreload?: boolean,
    },
  };
}

export interface ResourceChangePriority extends Instant {
  name: 'ResourceChangePriority';
  args: Args&{
    data: ArgsData & {
      requestId: string,
      priority: Protocol.Network.ResourcePriority,
    },
  };
}

/** Only sent for navigations. https://source.chromium.org/chromium/chromium/src/+/main:content/browser/devtools/devtools_instrumentation.cc;l=1612-1647;drc=ec7daf93d0479b758610c75f4e146fd4d2d6ed2b */
export interface ResourceWillSendRequest extends Instant {
  name: Name.RESOURCE_WILL_SEND_REQUEST;
  args: Args&{
    data: ArgsData & {
      requestId: string,
    },
  };
}

export interface ResourceFinish extends Instant {
  name: 'ResourceFinish';
  args: Args&{
    data: ArgsData & {
      decodedBodyLength: number,
      didFail: boolean,
      encodedDataLength: number,
      finishTime: Seconds,
      requestId: string,
    },
  };
}

export interface ResourceReceivedData extends Instant {
  name: 'ResourceReceivedData';
  args: Args&{
    data: ArgsData & {
      encodedDataLength: number,
      frame: string,
      requestId: string,
    },
  };
}

/** See https://mdn.github.io/shared-assets/images/diagrams/api/performance/timestamp-diagram.svg  */
interface ResourceReceiveResponseTimingData {
  connectEnd: Milli;
  connectStart: Milli;
  dnsEnd: Milli;
  dnsStart: Milli;
  proxyEnd: Milli;
  proxyStart: Milli;
  pushEnd: Milli;
  pushStart: Milli;
  receiveHeadersEnd: Milli;
  /** M116. */
  receiveHeadersStart?: Milli;
  /** When the network service is about to handle a request, ie. just before going to the HTTP cache or going to the network for DNS/connection setup. */
  requestTime: Seconds;
  sendEnd: Milli;
  sendStart: Milli;
  sslEnd: Milli;
  sslStart: Milli;
  workerReady: Milli;
  workerStart: Milli;
}

export interface ResourceReceiveResponse extends Instant {
  name: 'ResourceReceiveResponse';
  args: Args&{
    data: ArgsData & {
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
      responseTime: Milli,
      statusCode: number,
      // Some cached events don't have this field
      connectionId: number,
      connectionReused: boolean,
      timing?: ResourceReceiveResponseTimingData,
      headers?: Array<{name: string, value: string}>,
    },
  };
}

export interface ResourceMarkAsCached extends Instant {
  name: 'ResourceMarkAsCached';
  args: Args&{
    data: ArgsData & {
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

export interface LayoutInvalidationTracking extends Instant {
  name: Name.LAYOUT_INVALIDATION_TRACKING;
  args: Args&{
    data: ArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      reason: LayoutInvalidationReason,
      nodeName?: string,
    },
  };
}

export interface ScheduleStyleInvalidationTracking extends Instant {
  name: Name.SCHEDULE_STYLE_INVALIDATION_TRACKING;
  args: Args&{
    data: ArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      invalidationSet?: string,
      invalidatedSelectorId?: string,
      reason?: LayoutInvalidationReason,
      changedClass?: string,
      changedAttribute?: string,
      changedId?: string,
      nodeName?: string,
      stackTrace?: CallFrame[],
    },
  };
}
export function isScheduleStyleInvalidationTracking(event: Event): event is ScheduleStyleInvalidationTracking {
  return event.name === Name.SCHEDULE_STYLE_INVALIDATION_TRACKING;
}

export const enum StyleRecalcInvalidationReason {
  ANIMATION = 'Animation',
  RELATED_STYLE_RULE = 'Related style rule',
}

export interface StyleRecalcInvalidationTracking extends Instant {
  name: Name.STYLE_RECALC_INVALIDATION_TRACKING;
  args: Args&{
    data: ArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      reason: StyleRecalcInvalidationReason,
      subtree: boolean,
      nodeName?: string,
      extraData?: string,
    },
  };
}

export function isStyleRecalcInvalidationTracking(event: Event): event is StyleRecalcInvalidationTracking {
  return event.name === Name.STYLE_RECALC_INVALIDATION_TRACKING;
}
export interface StyleInvalidatorInvalidationTracking extends Instant {
  name: Name.STYLE_INVALIDATOR_INVALIDATION_TRACKING;
  args: Args&{
    data: ArgsData & {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
      reason: string,
      invalidationList: Array<{id: string, classes?: string[]}>,
      subtree: boolean,
      nodeName?: string,
      extraData?: string,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      selectors?: Array<{selector: string, style_sheet_id: string}>,
    },
  };
}
export function isStyleInvalidatorInvalidationTracking(event: Event): event is StyleInvalidatorInvalidationTracking {
  return event.name === Name.STYLE_INVALIDATOR_INVALIDATION_TRACKING;
}

export interface BeginCommitCompositorFrame extends Instant {
  name: Name.BEGIN_COMMIT_COMPOSITOR_FRAME;
  args: Args&{
    frame: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    is_mobile_optimized: boolean,
  };
}
export function isBeginCommitCompositorFrame(event: Event): event is BeginCommitCompositorFrame {
  return event.name === Name.BEGIN_COMMIT_COMPOSITOR_FRAME;
}

export interface ParseMetaViewport extends Instant {
  name: Name.PARSE_META_VIEWPORT;
  args: Args&{
    data: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      node_id: Protocol.DOM.BackendNodeId,
      content: string,
      frame?: string,
    },
  };
}
export function isParseMetaViewport(event: Event): event is ParseMetaViewport {
  return event.name === Name.PARSE_META_VIEWPORT;
}

export interface LinkPreconnect extends Instant {
  name: Name.LINK_PRECONNECT;
  args: Args&{
    data: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      node_id: Protocol.DOM.BackendNodeId,
      url: string,
      frame?: string,
    },
  };
}
export function isLinkPreconnect(event: Event): event is LinkPreconnect {
  return event.name === Name.LINK_PRECONNECT;
}

export interface ScheduleStyleRecalculation extends Instant {
  name: Name.SCHEDULE_STYLE_RECALCULATION;
  args: Args&{
    data: {
      frame: string,
      reason?: StyleRecalcInvalidationReason,
      subtree?: boolean,
      nodeId?: Protocol.DOM.BackendNodeId,
    },
  };
}
export function isScheduleStyleRecalculation(event: Event): event is ScheduleStyleRecalculation {
  return event.name === Name.SCHEDULE_STYLE_RECALCULATION;
}

export interface RenderFrameImplCreateChildFrame extends Event {
  name: Name.RENDER_FRAME_IMPL_CREATE_CHILD_FRAME;
  /* eslint-disable @typescript-eslint/naming-convention */
  args: Args&{
    child_frame_token: string,
    frame_token: string,
  };
}

export function isRenderFrameImplCreateChildFrame(event: Event): event is RenderFrameImplCreateChildFrame {
  return event.name === Name.RENDER_FRAME_IMPL_CREATE_CHILD_FRAME;
}

export interface LayoutImageUnsized extends Event {
  name: Name.LAYOUT_IMAGE_UNSIZED;
  args: Args&{
    data: {
      nodeId: Protocol.DOM.BackendNodeId,
      frameId: string,
    },
  };
}

export function isLayoutImageUnsized(event: Event): event is LayoutImageUnsized {
  return event.name === Name.LAYOUT_IMAGE_UNSIZED;
}

export interface PrePaint extends Complete {
  name: 'PrePaint';
}

export interface PairableAsync extends Event {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END|Phase.ASYNC_NESTABLE_INSTANT;
  // The id2 field gives flexibility to explicitly specify if an event
  // id is global among processes or process local. However not all
  // events use it, so both kind of ids need to be marked as optional.
  id2?: {local?: string, global?: string};
  id?: string;
}
export interface PairableAsyncBegin extends PairableAsync {
  ph: Phase.ASYNC_NESTABLE_START;
}

export interface PairableAsyncInstant extends PairableAsync {
  ph: Phase.ASYNC_NESTABLE_INSTANT;
}

export interface PairableAsyncEnd extends PairableAsync {
  ph: Phase.ASYNC_NESTABLE_END;
}
export function isPairableAsyncBegin(e: Event): e is PairableAsyncBegin {
  return e.ph === Phase.ASYNC_NESTABLE_START;
}
export function isPairableAsyncEnd(e: Event): e is PairableAsyncEnd {
  return e.ph === Phase.ASYNC_NESTABLE_END;
}
export function isPairableAsyncInstant(e: Event): e is PairableAsyncInstant {
  return e.ph === Phase.ASYNC_NESTABLE_INSTANT;
}

export interface AnimationFrame extends PairableAsync {
  name: Name.ANIMATION_FRAME;
  args?: AnimationFrameArgs;
}

export type AnimationFrameArgs = Args&{
  animation_frame_timing_info: {
    blocking_duration_ms: number,
    duration_ms: number,
    num_scripts: number,
  },
  id: string,
};

export interface AnimationFrameAsyncStart extends AnimationFrame {
  ph: Phase.ASYNC_NESTABLE_START;
}
export interface AnimationFrameAsyncEnd extends AnimationFrame {
  ph: Phase.ASYNC_NESTABLE_END;
}

export function isAnimationFrameAsyncStart(data: Event): data is AnimationFrameAsyncStart {
  return data.name === Name.ANIMATION_FRAME && data.ph === Phase.ASYNC_NESTABLE_START;
}
export function isAnimationFrameAsyncEnd(data: Event): data is AnimationFrameAsyncEnd {
  return data.name === Name.ANIMATION_FRAME && data.ph === Phase.ASYNC_NESTABLE_END;
}

export interface AnimationFramePresentation extends Event {
  name: Name.ANIMATION_FRAME_PRESENTATION;
  ph: Phase.ASYNC_NESTABLE_INSTANT;
  args?: Args&{
    id: string,
  };
}
export function isAnimationFramePresentation(data: Event): data is AnimationFramePresentation {
  return data.name === Name.ANIMATION_FRAME_PRESENTATION;
}

export interface UserTiming extends Event {
  id2?: {local?: string, global?: string};
  id?: string;
  cat: 'blink.user_timing';
  // Note that the timestamp for user timing trace events is set to the
  // start time passed by the user at the call site of the timing (based
  // on the UserTiming spec).
  // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/performance_user_timing.cc;l=236;drc=494419358caf690316f160a1f27d9e771a14c033
}

export interface DomLoading extends UserTiming {
  name: Name.DOM_LOADING;
  args: Args&{
    frame?: string,
  };
}

export interface BeginRemoteFontLoad extends UserTiming {
  name: Name.BEGIN_REMOTE_FONT_LOAD;
  args: Args&{
    display: string,
    id: number,
    url?: string,
  };
}

export interface RemoteFontLoaded extends UserTiming {
  name: Name.REMOTE_FONT_LOADED;
  args: Args&{
    url: string,
    name: string,
  };
}

export type PairableUserTiming = UserTiming&PairableAsync;

export interface PerformanceMeasureBegin extends PairableUserTiming {
  args: Args&{
    detail?: string,
    callTime?: Micro,
    traceId?: number,
  };
  ph: Phase.ASYNC_NESTABLE_START;
}

export type PerformanceMeasureEnd = PairableUserTiming&PairableAsyncEnd;
export type PerformanceMeasure = PerformanceMeasureBegin|PerformanceMeasureEnd;

export interface PerformanceMark extends UserTiming {
  args: Args&{
    data?: ArgsData & {
      detail?: string,
      callTime?: Micro,
    },
  };
  ph: Phase.INSTANT|Phase.MARK|Phase.ASYNC_NESTABLE_INSTANT;
}

export interface ConsoleTimeBegin extends PairableAsyncBegin {
  cat: 'blink.console';
}

export interface ConsoleTimeEnd extends PairableAsyncEnd {
  cat: 'blink.console';
}

export type ConsoleTime = ConsoleTimeBegin|ConsoleTimeEnd;

export interface ConsoleTimeStamp extends Event {
  cat: 'devtools.timeline';
  name: Name.TIME_STAMP;
  ph: Phase.INSTANT;
  args: Args&{
    data?: ArgsData & {
      // The console.timeStamp allows to pass integers as values as well
      // as strings
      message: string,
      name?: string|number,
      start?: string|number,
      end?: string|number,
      track?: string|number,
      trackGroup?: string|number,
      color?: string|number,
      devtools?: string,
      sampleTraceId?: number,
    },
  };
}

export interface SyntheticConsoleTimeStamp extends Event, SyntheticBased {
  cat: 'disabled-by-default-v8.inspector';
  ph: Phase.COMPLETE;
}

export interface UserTimingMeasure extends Event {
  cat: 'devtools.timeline';
  ph: Phase.COMPLETE;
  name: Name.USER_TIMING_MEASURE;
  args: Args&{
    sampleTraceId: number,
    traceId: number,
  };
}

/**
 * ChromeFrameReporter args for PipelineReporter event.
 * Matching proto: https://source.chromium.org/chromium/chromium/src/+/main:third_party/perfetto/protos/perfetto/trace/track_event/chrome_frame_reporter.proto
 */
/* eslint-disable @typescript-eslint/naming-convention */
interface ChromeFrameReporter {
  state: State;
  enum: FrameDropReason;
  /** The reason is set only if |state| is not |STATE_UPDATED_ALL|. */
  reason: FrameDropReason;
  frame_source: number;
  /**
   * Identifies a BeginFrameArgs (along with the source_id).
   * See comments in components/viz/common/frame_sinks/begin_frame_args.h.
   */
  frame_sequence: number;
  /**
   * If this is a dropped frame (i.e. if |state| is set to |STATE_DROPPED| or
   * |STATE_PRESENTED_PARTIAL|), then indicates whether this frame impacts smoothness.
   */
  affects_smoothness: boolean;
  /** The type of active scroll. */
  scroll_state: ScrollState;
  /** If any main thread animation is active during this frame. */
  has_main_animation: boolean;
  /** If any compositor thread animation is active during this frame. */
  has_compositor_animation: boolean;
  /** If any touch-driven UX (not scroll) is active during this frame. */
  has_smooth_input_main: boolean;
  /**
   * Whether the frame contained any missing content (i.e. whether there was
   * checkerboarding in the frame).
   */
  has_missing_content: boolean;
  /** The id of layer_tree_host that the frame has been produced for. */
  layer_tree_host_id: number;
  /** If total latency of PipelineReporter exceeds a certain limit. */
  has_high_latency: boolean;
  /**
   *  Indicate if the frame is "FORKED" (i.e. a PipelineReporter event starts at
   * the same frame sequence as another PipelineReporter) or "BACKFILL"
   * (i.e. dropped frames when there are no partial compositor updates).
   */
  frame_type: FrameType;
  /**
   * The breakdown stage of PipelineReporter that is most likely accountable for
   * high latency.
   */
  high_latency_contribution_stage: string[];
}
const enum State {
  /** The frame did not have any updates to present. **/
  STATE_NO_UPDATE_DESIRED = 'STATE_NO_UPDATE_DESIRED',
  /**
   * The frame presented all the desired updates (i.e. any updates requested
   * from both the compositor thread and main-threads were handled). *
   */
  STATE_PRESENTED_ALL = 'STATE_PRESENTED_ALL',
  /**
   *  The frame was presented with some updates, but also missed some updates
   * (e.g. missed updates from the main-thread, but included updates from the
   * compositor thread). *
   */
  STATE_PRESENTED_PARTIAL = 'STATE_PRESENTED_PARTIAL',
  /**
   * The frame was dropped, i.e. some updates were desired for the frame, but
   * was not presented. *
   */
  STATE_DROPPED = 'STATE_DROPPED',
}

const enum FrameDropReason {
  REASON_UNSPECIFIED = 'REASON_UNSPECIFIED',
  /**
   *  Frame was dropped by the display-compositor.
   * The display-compositor may drop a frame some times (e.g. the frame missed
   * the deadline, or was blocked on surface-sync, etc.) *
   */
  REASON_DISPLAY_COMPOSITOR = 'REASON_DISPLAY_COMPOSITOR',
  /**
   *  Frame was dropped because of the main-thread.
   * The main-thread may cause a frame to be dropped, e.g. if the main-thread
   * is running expensive javascript, or doing a lot of layout updates, etc. *
   */
  REASON_MAIN_THREAD = 'REASON_MAIN_THREAD',
  /**
   *  Frame was dropped by the client compositor.
   * The client compositor can drop some frames too (e.g. attempting to
   * recover latency, missing the deadline, etc.). *
   */
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

/**
 * TODO(crbug.com/409484302): Remove once Chrome migrates from
 * ChromeTrackEvent.chrome_frame_reporter to ChromeTrackEvent.frame_reporter.
 **/
export interface OldChromeFrameReporterArgs {
  chrome_frame_reporter: ChromeFrameReporter;
}

export interface NewChromeFrameReporterArgs {
  frame_reporter: ChromeFrameReporter;
}

export interface PipelineReporter extends Event {
  id2?: {
    local?: string,
  };
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_END;
  args: Args&(OldChromeFrameReporterArgs|NewChromeFrameReporterArgs);
}

export function isPipelineReporter(event: Event): event is PipelineReporter {
  return event.name === Name.PIPELINE_REPORTER;
}

/**
 * A type used for synthetic events created based on a raw trace event.
 * A branded type is used to ensure not all events can be typed as
 * SyntheticBased and prevent places different to the
 * SyntheticEventsManager from creating synthetic events. This is
 * because synthetic events need to be registered in order to resolve
 * serialized event keys into event objects, so we ensure events are
 * registered at the time they are created by the SyntheticEventsManager.
 **/
export interface SyntheticBased<Ph extends Phase = Phase, T extends Event = Event> extends Event {
  ph: Ph;
  rawSourceEvent: T;
  _tag: 'SyntheticEntryTag';
}

export function isSyntheticBased(event: Event): event is SyntheticBased {
  return 'rawSourceEvent' in event;
}

/**
 * Nestable async events with a duration are made up of two distinct
 * events: the begin, and the end. We need both of them to be able to
 * display the right information, so we create these synthetic events.
 **/
export interface SyntheticEventPair<T extends PairableAsync = PairableAsync> extends SyntheticBased<Phase, T> {
  rawSourceEvent: T;
  name: T['name'];
  cat: T['cat'];
  id?: string;
  id2?: {local?: string, global?: string};

  dur: Micro;
  args: Args&{
    data: {
      beginEvent: T & PairableAsyncBegin,
      endEvent: T&PairableAsyncEnd,
      instantEvents?: Array<T&PairableAsyncInstant>,
    },
  };
}

export type SyntheticPipelineReporterPair = SyntheticEventPair<PipelineReporter>;
export type SyntheticAnimationFramePair = SyntheticEventPair<AnimationFrame>;

export type SyntheticUserTimingPair = SyntheticEventPair<PerformanceMeasure>;

export type SyntheticConsoleTimingPair = SyntheticEventPair<ConsoleTime>;

export type SyntheticAnimationPair = SyntheticEventPair<Animation>;

export interface SyntheticInteractionPair extends SyntheticEventPair<EventTimingBeginOrEnd> {
  // InteractionID and type are available within the beginEvent's data, but we
  // put them on the top level for ease of access.
  interactionId: number;
  type: string;
  // This is equivalent to startEvent.ts;
  ts: Micro;
  // This duration can be calculated via endEvent.ts - startEvent.ts, but we do
  // that and put it here to make it easier. This also makes these events
  // consistent with real events that have a dur field.
  dur: Micro;
  // These values are provided in the startEvent's args.data field as
  // millisecond values, but during the handler phase we parse these into
  // microseconds and put them on the top level for easy access.
  processingStart: Micro;
  processingEnd: Micro;
  // These 3 values represent the breakdown of the parts of an interaction:
  // 1. inputDelay: time from the user clicking to the input being handled
  inputDelay: Micro;
  // 2. mainThreadHandling: time spent processing the event handler
  mainThreadHandling: Micro;
  // 3. presentationDelay: delay between the event being processed and the frame being rendered
  presentationDelay: Micro;
}

/**
 * A profile call created in the frontend from samples disguised as a
 * trace event.
 *
 * We store the sampleIndex, profileId and nodeId so that we can easily link
 * back a Synthetic Trace Entry to an individual Sample trace event within a
 * Profile.
 *
 * Because a sample contains a set of call frames representing the stack at the
 * point in time that the sample was created, we also have to store the ID of
 * the Node that points to the function call that this profile call represents.
 */
export interface SyntheticProfileCall extends Event {
  callFrame: Protocol.Runtime.CallFrame;
  nodeId: Protocol.integer;
  sampleIndex: number;
  profileId: ProfileID;
}

/**
 * A JS Sample reflects a single sample from the V8 CPU Profile
 */
export interface SyntheticJSSample extends Event {
  name: Name.JS_SAMPLE;
  args: Args&{
    data: ArgsData & {
      // Used to associate a stack sample with a trace event.
      stackTrace: Protocol.Runtime.CallFrame[],
      traceId?: number,
    },
  };
  ph: Phase.INSTANT;
}

export function isSyntheticInteraction(event: Event): event is SyntheticInteractionPair {
  return Boolean(
      'interactionId' in event && event.args?.data && 'beginEvent' in event.args.data && 'endEvent' in event.args.data);
}

// Events relating to frames.

export interface DrawFrame extends Instant {
  name: Name.DRAW_FRAME;
  args: Args&{
    layerTreeId: number,
    frameSeqId: number,
  };
}

export function isDrawFrame(event: Event): event is DrawFrame {
  // The extra check for INSTANT here is because in the past DrawFrame events had an ASYNC_NESTABLE_START and ASYNC_NESTABLE_END pair. We don't want to support those old events, so we have to check we are dealing with an instant event.
  return event.name === Name.DRAW_FRAME && event.ph === Phase.INSTANT;
}

export interface BeginFrame extends Instant {
  name: Name.BEGIN_FRAME;
  args: Args&{
    layerTreeId: number,
    frameSeqId: number,
  };
}
export function isBeginFrame(event: Event): event is BeginFrame {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === Name.BEGIN_FRAME && event.args && 'frameSeqId' in event.args);
}

export interface DroppedFrame extends Instant {
  name: Name.DROPPED_FRAME;
  args: Args&{
    layerTreeId: number,
    frameSeqId: number,
    hasPartialUpdate?: boolean,
  };
}
export function isDroppedFrame(event: Event): event is DroppedFrame {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === Name.DROPPED_FRAME && event.args && 'frameSeqId' in event.args);
}

export interface RequestMainThreadFrame extends Instant {
  name: Name.REQUEST_MAIN_THREAD_FRAME;
  args: Args&{
    layerTreeId: number,
  };
}
export function isRequestMainThreadFrame(event: Event): event is RequestMainThreadFrame {
  return event.name === Name.REQUEST_MAIN_THREAD_FRAME;
}

export interface BeginMainThreadFrame extends Instant {
  name: Name.BEGIN_MAIN_THREAD_FRAME;
  args: Args&{
    layerTreeId: number,
    data: ArgsData&{
      frameId?: number,
    },
  };
}
export function isBeginMainThreadFrame(event: Event): event is BeginMainThreadFrame {
  return event.name === Name.BEGIN_MAIN_THREAD_FRAME;
}

export interface NeedsBeginFrameChanged extends Instant {
  name: Name.NEEDS_BEGIN_FRAME_CHANGED;
  args: Args&{
    layerTreeId: number,
    data: ArgsData&{
      needsBeginFrame: number,
    },
  };
}
export function isNeedsBeginFrameChanged(event: Event): event is NeedsBeginFrameChanged {
  return event.name === Name.NEEDS_BEGIN_FRAME_CHANGED;
}

export interface Commit extends Instant {
  name: Name.COMMIT;
  args: Args&{
    layerTreeId: number,
    frameSeqId: number,
  };
}
export function isCommit(event: Event): event is Commit {
  // Old traces did not have frameSeqId; but we do not want to support these.
  return Boolean(event.name === Name.COMMIT && event.args && 'frameSeqId' in event.args);
}

export interface RasterTask extends Complete {
  name: Name.RASTER_TASK;
  args: Args&{
    tileData?: {
      layerId: number,
      sourceFrameNumber: number,
      tileId: {

        id_ref: string,
      },
      tileResolution: string,
    },
  };
}
export function isRasterTask(event: Event): event is RasterTask {
  return event.name === Name.RASTER_TASK;
}

/** CompositeLayers has been replaced by "Commit", but we support both to not break old traces being imported. **/
export interface CompositeLayers extends Instant {
  name: Name.COMPOSITE_LAYERS;
  args: Args&{
    layerTreeId: number,
  };
}
export function isCompositeLayers(event: Event): event is CompositeLayers {
  return event.name === Name.COMPOSITE_LAYERS;
}

export interface ActivateLayerTree extends Instant {
  name: Name.ACTIVATE_LAYER_TREE;
  args: Args&{
    layerTreeId: number,
    frameId: number,
  };
}
export function isActivateLayerTree(event: Event): event is ActivateLayerTree {
  return event.name === Name.ACTIVATE_LAYER_TREE;
}

export type InvalidationTrackingEvent = ScheduleStyleInvalidationTracking|StyleRecalcInvalidationTracking|
    StyleInvalidatorInvalidationTracking|LayoutInvalidationTracking;

export function isInvalidationTracking(event: Event): event is InvalidationTrackingEvent {
  return isScheduleStyleInvalidationTracking(event) || isStyleRecalcInvalidationTracking(event) ||
      isStyleInvalidatorInvalidationTracking(event) || isLayoutInvalidationTracking(event);
}

export interface DrawLazyPixelRef extends Instant {
  name: Name.DRAW_LAZY_PIXEL_REF;
  args?: Args&{

    LazyPixelRef: number,
  };
}
export function isDrawLazyPixelRef(event: Event): event is DrawLazyPixelRef {
  return event.name === Name.DRAW_LAZY_PIXEL_REF;
}

export interface DecodeLazyPixelRef extends Instant {
  name: Name.DECODE_LAZY_PIXEL_REF;
  args?: Args&{

    LazyPixelRef: number,
  };
}
export function isDecodeLazyPixelRef(event: Event): event is DecodeLazyPixelRef {
  return event.name === Name.DECODE_LAZY_PIXEL_REF;
}

export interface DecodeImage extends Complete {
  name: Name.DECODE_IMAGE;
  args: Args&{
    imageType: string,
  };
}
export function isDecodeImage(event: Event): event is DecodeImage {
  return event.name === Name.DECODE_IMAGE;
}

export const enum InvalidationEventType {
  StyleInvalidatorInvalidationTracking = 'StyleInvalidatorInvalidationTracking',
  StyleRecalcInvalidationTracking = 'StyleRecalcInvalidationTracking',
}

export interface SelectorTiming {
  'elapsed (us)': number;
  fast_reject_count: number;
  match_attempts: number;
  selector: string;
  style_sheet_id: string;
  match_count: number;
  invalidation_count: number;
}

export enum SelectorTimingsKey {
  Elapsed = 'elapsed (us)',
  RejectPercentage = 'reject_percentage',
  FastRejectCount = 'fast_reject_count',
  MatchAttempts = 'match_attempts',
  MatchCount = 'match_count',
  Selector = 'selector',
  StyleSheetId = 'style_sheet_id',
  InvalidationCount = 'invalidation_count',
}

export interface SelectorStats {
  selector_timings: SelectorTiming[];
}

export interface SelectorStats extends Complete {
  name: Name.SELECTOR_STATS;
  args: Args&{

    selector_stats?: SelectorStats,
  };
}

export function isSelectorStats(event: Event): event is SelectorStats {
  return event.name === Name.SELECTOR_STATS;
}

export interface RecalcStyle extends Complete {
  name: Name.RECALC_STYLE;
  args: Args&{
    elementCount: number,
    beginData?: {
      frame: string,
      sampleTraceId?: number,
      stackTrace?: CallFrame[],
    },
  };
}

/** The real trace event is called 'UpdateLayoutTree' but we've aliased it for convenience. */
export function isRecalcStyle(event: Event): event is RecalcStyle {
  return event.name === Name.RECALC_STYLE;
}

export interface Layout extends Complete {
  name: Name.LAYOUT;
  args: Args&{
    beginData: {
      frame: string,
      dirtyObjects: number,
      partialLayout: boolean,
      totalObjects: number,
      sampleTraceId?: number,
      stackTrace?: CallFrame[],
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
export function isLayout(event: Event): event is Layout {
  return event.name === Name.LAYOUT && Boolean(event.args && 'beginData' in event.args);
}
export interface InvalidateLayout extends Instant {
  name: Name.INVALIDATE_LAYOUT;
  args: Args&{
    data: {
      frame: string,
      nodeId: Protocol.DOM.BackendNodeId,
    },
  };
}
export function isInvalidateLayout(event: Event): event is InvalidateLayout {
  return event.name === Name.INVALIDATE_LAYOUT;
}

export interface DebuggerAsyncTaskScheduled extends Event {
  name: Name.DEBUGGER_ASYNC_TASK_SCHEDULED;
  args: Args&{
    taskName: string,
  };
}

export function isDebuggerAsyncTaskScheduled(event: Event): event is DebuggerAsyncTaskScheduled {
  return event.name === Name.DEBUGGER_ASYNC_TASK_SCHEDULED;
}

export interface DebuggerAsyncTaskRun extends Event {
  name: Name.DEBUGGER_ASYNC_TASK_RUN;
}

export function isDebuggerAsyncTaskRun(event: Event): event is DebuggerAsyncTaskRun {
  return event.name === Name.DEBUGGER_ASYNC_TASK_RUN;
}

export type ProfileID = Platform.Brand.Brand<string, 'profileIdTag'>;

export function ProfileID(value: string): ProfileID {
  return value as ProfileID;
}

export type CallFrameID = Platform.Brand.Brand<number, 'callFrameIdTag'>;

export function CallFrameID(value: number): CallFrameID {
  return value as CallFrameID;
}

export type SampleIndex = Platform.Brand.Brand<number, 'sampleIndexTag'>;

export function SampleIndex(value: number): SampleIndex {
  return value as SampleIndex;
}

export type ProcessID = Platform.Brand.Brand<number, 'processIdTag'>;

export function ProcessID(value: number): ProcessID {
  return value as ProcessID;
}

export type ThreadID = Platform.Brand.Brand<number, 'threadIdTag'>;

export function ThreadID(value: number): ThreadID {
  return value as ThreadID;
}

export type WorkerId = Platform.Brand.Brand<string, 'workerIdTag'>;

export function WorkerId(value: string): WorkerId {
  return value as WorkerId;
}

export function isComplete(event: Event): event is Complete {
  return event.ph === Phase.COMPLETE;
}

export function isBegin(event: Event): event is Begin {
  return event.ph === Phase.BEGIN;
}

export function isEnd(event: Event): event is End {
  return event.ph === Phase.END;
}

export function isDispatch(event: Event): event is Dispatch {
  return event.name === 'EventDispatch' && event.ph === Phase.COMPLETE;
}

export function isInstant(event: Event): event is Instant {
  return event.ph === Phase.INSTANT;
}

export function isRendererEvent(event: Event): event is RendererEvent {
  return isInstant(event) || isComplete(event);
}

export function isFireIdleCallback(event: Event): event is FireIdleCallback {
  return event.name === 'FireIdleCallback' && event.ph === Phase.COMPLETE;
}

export function isSchedulePostMessage(event: Event): event is SchedulePostMessage {
  return event.name === Name.SCHEDULE_POST_MESSAGE;
}

export function isHandlePostMessage(event: Event): event is HandlePostMessage {
  return event.name === Name.HANDLE_POST_MESSAGE && event.ph === Phase.COMPLETE;
}

export function isUpdateCounters(event: Event): event is UpdateCounters {
  return event.name === 'UpdateCounters';
}

export function isDOMStats(event: Event): event is DOMStats {
  return event.name === 'DOMStats';
}

export function isThreadName(
    event: Event,
    ): event is ThreadName {
  return event.name === Name.THREAD_NAME;
}

export function isProcessName(
    event: Event,
    ): event is ProcessName {
  return event.name === 'process_name';
}

export function isTracingStartedInBrowser(
    event: Event,
    ): event is TracingStartedInBrowser {
  return event.name === Name.TRACING_STARTED_IN_BROWSER;
}

export function isFrameCommittedInBrowser(
    event: Event,
    ): event is FrameCommittedInBrowser {
  return event.name === 'FrameCommittedInBrowser';
}

export function isCommitLoad(
    event: Event,
    ): event is CommitLoad {
  return event.name === 'CommitLoad';
}

export function isAnimation(
    event: Event,
    ): event is Animation {
  // We've found some rare traces with an Animation trace event from a different category: https://crbug.com/1472375#comment7
  return event.name === 'Animation' && event.cat.includes('devtools.timeline');
}

export function isSyntheticAnimation(event: Event): event is SyntheticAnimationPair {
  if (event.name !== 'Animation' || !event.cat.includes('devtools.timeline')) {
    return false;
  }
  const data = event.args?.data;
  if (!data) {
    return false;
  }
  return 'beginEvent' in data && 'endEvent' in data;
}

export function isLayoutShift(
    event: Event,
    ): event is LayoutShift {
  return event.name === Name.LAYOUT_SHIFT;
}

export function isLayoutInvalidationTracking(
    event: Event,
    ): event is LayoutInvalidationTracking {
  return event.name === Name.LAYOUT_INVALIDATION_TRACKING;
}

export function isFirstContentfulPaint(event: Event): event is FirstContentfulPaint {
  return event.name === Name.MARK_FCP;
}

export function isAnyLargestContentfulPaintCandidate(event: Event): event is AnyLargestContentfulPaintCandidate {
  return event.name === Name.MARK_LCP_CANDIDATE || event.name === Name.MARK_LCP_CANDIDATE_FOR_SOFT_NAVIGATION;
}
export function isSoftLargestContentfulPaintCandidate(event: Event): event is AnyLargestContentfulPaintCandidate {
  return event.name === Name.MARK_LCP_CANDIDATE_FOR_SOFT_NAVIGATION;
}
export function isLargestImagePaintCandidate(event: Event): event is LargestImagePaintCandidate {
  return event.name === 'LargestImagePaint::Candidate';
}
export function isLargestTextPaintCandidate(event: Event): event is LargestTextPaintCandidate {
  return event.name === 'LargestTextPaint::Candidate';
}

export function isMarkLoad(event: Event): event is MarkLoad {
  return event.name === Name.MARK_LOAD;
}

export function isFirstPaint(event: Event): event is FirstPaint {
  return event.name === Name.MARK_FIRST_PAINT;
}

export function isMarkDOMContent(event: Event): event is MarkDOMContent {
  return event.name === Name.MARK_DOM_CONTENT;
}

export function isInteractiveTime(event: Event): event is InteractiveTime {
  return event.name === 'InteractiveTime';
}

export function isEventTiming(event: Event): event is EventTimingBeginOrEnd {
  return event.name === Name.EVENT_TIMING;
}

export function isEventTimingEnd(event: Event): event is EventTimingEnd {
  return isEventTiming(event) && event.ph === Phase.ASYNC_NESTABLE_END;
}
export function isEventTimingStart(event: Event): event is EventTimingBegin {
  return isEventTiming(event) && event.ph === Phase.ASYNC_NESTABLE_START;
}

export function isGPUTask(event: Event): event is GPUTask {
  return event.name === 'GPUTask';
}

export function isProfile(event: Event): event is Profile {
  return event.name === Name.PROFILE;
}

export function isSyntheticCpuProfile(event: Event): event is SyntheticCpuProfile {
  return event.name === Name.CPU_PROFILE && event.ph === Phase.COMPLETE;
}

export function isProfileChunk(event: Event): event is ProfileChunk {
  return event.name === Name.PROFILE_CHUNK;
}

export function isResourceChangePriority(
    event: Event,
    ): event is ResourceChangePriority {
  return event.name === 'ResourceChangePriority';
}

export function isResourceSendRequest(
    event: Event,
    ): event is ResourceSendRequest {
  return event.name === 'ResourceSendRequest';
}

export function isResourceReceiveResponse(
    event: Event,
    ): event is ResourceReceiveResponse {
  return event.name === 'ResourceReceiveResponse';
}

export function isResourceMarkAsCached(
    event: Event,
    ): event is ResourceMarkAsCached {
  return event.name === 'ResourceMarkAsCached';
}

export function isResourceFinish(
    event: Event,
    ): event is ResourceFinish {
  return event.name === 'ResourceFinish';
}

export function isResourceWillSendRequest(
    event: Event,
    ): event is ResourceWillSendRequest {
  return event.name === 'ResourceWillSendRequest';
}

export function isResourceReceivedData(
    event: Event,
    ): event is ResourceReceivedData {
  return event.name === 'ResourceReceivedData';
}

/** Any event where we receive data (and get an encodedDataLength) **/
export function isReceivedDataEvent(
    event: Event,
    ): event is ResourceReceivedData|ResourceFinish|ResourceReceiveResponse {
  return event.name === 'ResourceReceivedData' || event.name === 'ResourceFinish' ||
      event.name === 'ResourceReceiveResponse';
}

export function isSyntheticNetworkRequest(
    event: Event,
    ): event is SyntheticNetworkRequest {
  return event.name === Name.SYNTHETIC_NETWORK_REQUEST;
}

export function isSyntheticWebSocketConnection(
    event: Event,
    ): event is SyntheticWebSocketConnection {
  return event.name === 'SyntheticWebSocketConnection';
}

export function isNetworkTrackEntry(event: Event): event is SyntheticWebSocketConnection|SyntheticNetworkRequest {
  return isSyntheticNetworkRequest(event) || isSyntheticWebSocketConnection(event) || isWebSocketTraceEvent(event);
}

export function isPrePaint(
    event: Event,
    ): event is PrePaint {
  return event.name === 'PrePaint';
}

/** A VALID navigation start (as it has a populated documentLoaderURL) */
export function isNavigationStart(event: Event): event is NavigationStart {
  return event.name === Name.NAVIGATION_START && (event as NavigationStart).args?.data?.documentLoaderURL !== '';
}

export interface DidCommitSameDocumentNavigation extends Complete {
  name: 'RenderFrameHostImpl::DidCommitSameDocumentNavigation';
  args: Args&{
    url: string,
    render_frame_host: {
      frame_type: string,
    },
  };
}

export function isDidCommitSameDocumentNavigation(event: Event): event is DidCommitSameDocumentNavigation {
  return event.name === 'RenderFrameHostImpl::DidCommitSameDocumentNavigation' && event.ph === Phase.COMPLETE;
}

export function isMainFrameViewport(
    event: Event,
    ): event is MainFrameViewport {
  return event.name === 'PaintTimingVisualizer::Viewport';
}

export function isSyntheticUserTiming(event: Event): event is SyntheticUserTimingPair {
  if (event.cat !== 'blink.user_timing') {
    return false;
  }
  const data = event.args?.data;
  if (!data) {
    return false;
  }
  return 'beginEvent' in data && 'endEvent' in data;
}

export function isSyntheticConsoleTiming(event: Event): event is SyntheticConsoleTimingPair {
  if (event.cat !== 'blink.console') {
    return false;
  }
  const data = event.args?.data;
  if (!data) {
    return false;
  }
  return 'beginEvent' in data && 'endEvent' in data;
}

export function isUserTiming(event: Event): event is UserTiming {
  return event.cat === 'blink.user_timing';
}

export function isDomLoading(event: Event): event is DomLoading {
  return event.name === Name.DOM_LOADING;
}

export function isBeginRemoteFontLoad(event: Event): event is BeginRemoteFontLoad {
  return event.name === Name.BEGIN_REMOTE_FONT_LOAD;
}

export function isRemoteFontLoaded(event: Event): event is RemoteFontLoaded {
  return event.name === Name.REMOTE_FONT_LOADED;
}

export function isPerformanceMeasure(event: Event): event is PerformanceMeasure {
  return isUserTiming(event) && isPhaseAsync(event.ph);
}

export function isPerformanceMeasureBegin(event: Event): event is PerformanceMeasureBegin {
  return isPerformanceMeasure(event) && event.ph === Phase.ASYNC_NESTABLE_START;
}

export function isPerformanceMark(event: Event): event is PerformanceMark {
  return isUserTiming(event) && (event.ph === Phase.MARK || event.ph === Phase.INSTANT);
}

export function isConsoleTime(event: Event): event is ConsoleTime {
  return event.cat === 'blink.console' && isPhaseAsync(event.ph);
}

export function isConsoleTimeStamp(event: Event): event is ConsoleTimeStamp {
  return event.ph === Phase.INSTANT && event.name === Name.TIME_STAMP;
}

export function isUserTimingMeasure(event: Event): event is UserTimingMeasure {
  return event.name === Name.USER_TIMING_MEASURE;
}

export function isParseHTML(event: Event): event is ParseHTML {
  return event.name === 'ParseHTML';
}

export interface Async extends Event {
  ph: Phase.ASYNC_NESTABLE_START|Phase.ASYNC_NESTABLE_INSTANT|Phase.ASYNC_NESTABLE_END|Phase.ASYNC_STEP_INTO|
      Phase.ASYNC_BEGIN|Phase.ASYNC_END|Phase.ASYNC_STEP_PAST;
}

export function isSyntheticLayoutShift(event: Event): event is SyntheticLayoutShift {
  return event.name === Name.SYNTHETIC_LAYOUT_SHIFT;
}

export function isSyntheticLayoutShiftCluster(event: Event): event is SyntheticLayoutShiftCluster {
  return event.name === Name.SYNTHETIC_LAYOUT_SHIFT_CLUSTER;
}

export function isProfileCall(event: Event): event is SyntheticProfileCall {
  return 'callFrame' in event;
}

export interface Paint extends Event {
  name: Name.PAINT;
  args: Args&{
    data: ArgsData & {
      frame: string,
      layerId: number,
      // With CompositeAfterPaint enabled, paint events are no longer
      // associated with a Node, and nodeId will not be present.
      nodeId?: Protocol.DOM.BackendNodeId,
      // Optional as it was added in M137: crrev.com/c/6491448
      nodeName?: string,
      /** This rect is unreliable and often wrong. We'll remove it. crbug.com/41402938#comment10 */
      clip?: number[],
    },
  };
}

export function isPaint(event: Event): event is Paint {
  return event.name === Name.PAINT;
}

export interface PaintImage extends Complete {
  name: Name.PAINT_IMAGE;
  args: Args&{
    data: Event & {
      height: number,
      width: number,
      x: number,
      y: number,
      isCSS: boolean,
      srcHeight: number,
      srcWidth: number,
      isPicture?: boolean,
      loadingAttribute?: string,
      srcsetAttribute?: string,
      url?: string,
      nodeId?: Protocol.DOM.BackendNodeId,
      // Optional as it was added in M137: crrev.com/c/6491448
      nodeName?: string,
      frame?: string,
    },
  };
}
export function isPaintImage(event: Event): event is PaintImage {
  return event.name === Name.PAINT_IMAGE && event.ph === Phase.COMPLETE;
}

export interface ScrollLayer extends Complete {
  name: Name.SCROLL_LAYER;
  args: Args&{
    data: Event & {
      frame: string,
      nodeId?: Protocol.DOM.BackendNodeId,
    },
  };
}
export function isScrollLayer(event: Event): event is ScrollLayer {
  return event.name === Name.SCROLL_LAYER && event.ph === Phase.COMPLETE;
}

export interface SetLayerTreeId extends Instant {
  name: Name.SET_LAYER_TREE_ID;
  args: Args&{
    data: ArgsData & {
      frame: string,
      layerTreeId: number,
    },
  };
}
export function isSetLayerId(event: Event): event is SetLayerTreeId {
  return event.name === Name.SET_LAYER_TREE_ID;
}
export interface UpdateLayer extends Event {
  name: Name.UPDATE_LAYER;
  args: Args&{
    layerId: number,
    layerTreeId: number,
  };
}
export function isUpdateLayer(event: Event): event is UpdateLayer {
  return event.name === Name.UPDATE_LAYER;
}

export interface DisplayItemListSnapshot extends Event {
  name: Name.DISPLAY_ITEM_LIST_SNAPSHOT;
  ph: Phase.OBJECT_SNAPSHOT;
  id2: {
    local?: string,
  };
  args: Args&{
    snapshot: {
      skp64: string,
      params?: {

        layer_rect: [number, number, number, number],
      },
    },
  };
}
export function isDisplayListItemListSnapshot(event: Event): event is DisplayItemListSnapshot {
  return event.name === Name.DISPLAY_ITEM_LIST_SNAPSHOT;
}

export interface LayerTreeHostImplSnapshot extends Event {
  name: Name.LAYER_TREE_HOST_IMPL_SNAPSHOT;
  ph: Phase.OBJECT_SNAPSHOT;
  id: string;
  args: Args&{
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

export function isLayerTreeHostImplSnapshot(event: Event): event is LayerTreeHostImplSnapshot {
  return event.name === Name.LAYER_TREE_HOST_IMPL_SNAPSHOT;
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

export interface FireAnimationFrame extends Complete {
  name: Name.FIRE_ANIMATION_FRAME;
  args: Args&{
    data: {
      frame: string,
      id: number,
    },
  };
}

export function isFireAnimationFrame(event: Event): event is FireAnimationFrame {
  return event.name === Name.FIRE_ANIMATION_FRAME && event.ph === Phase.COMPLETE;
}

export interface RequestAnimationFrame extends Instant {
  name: Name.REQUEST_ANIMATION_FRAME;
  args: Args&{
    data: {
      frame: string,
      id: number,
      stackTrace?: CallFrame,
    },
  };
}

export interface TimerInstall extends Instant {
  name: Name.TIMER_INSTALL;
  args: Args&{
    data: {
      frame: string,
      singleShot: boolean,
      timeout: number,
      timerId: number,
      stackTrace?: CallFrame,
    },
  };
}
export function isTimerInstall(event: Event): event is TimerInstall {
  return event.name === Name.TIMER_INSTALL;
}

export interface TimerFire extends Complete {
  name: Name.TIMER_FIRE;
  args: Args&{
    data: {
      frame: string,
      timerId: number,
    },
  };
}
export function isTimerFire(event: Event): event is TimerFire {
  return event.name === Name.TIMER_FIRE && event.ph === Phase.COMPLETE;
}

export interface RequestIdleCallback extends Instant {
  name: Name.REQUEST_IDLE_CALLBACK;
  args: Args&{
    data: {
      frame: string,
      id: number,
      timeout: Milli,
      stackTrace?: CallFrame,
    },

  };
}

export function isRequestIdleCallback(event: Event): event is RequestIdleCallback {
  return event.name === Name.REQUEST_IDLE_CALLBACK;
}

export interface WebSocketCreate extends Instant {
  name: Name.WEB_SOCKET_CREATE;
  args: Args&{
    data: {
      identifier: number,
      url: string,
      frame?: string,
      workerId?: string,
      websocketProtocol?: string,
      stackTrace?: CallFrame,
    },
  };
}
export function isWebSocketCreate(event: Event): event is WebSocketCreate {
  return event.name === Name.WEB_SOCKET_CREATE;
}

export interface WebSocketInfo extends Instant {
  name: Name.WEB_SOCKET_DESTROY|Name.WEB_SOCKET_RECEIVE_HANDSHAKE|Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST;
  args: Args&{
    data: ArgsData & {
      identifier: number,
      url: string,
      frame?: string,
      workerId?: string,
    },
  };
}
export interface WebSocketTransfer extends Instant {
  name: Name.WEB_SOCKET_SEND|Name.WEB_SOCKET_RECEIVE;
  args: Args&{
    data: ArgsData & {
      identifier: number,
      url: string,
      dataLength: number,
      frame?: string,
      workerId?: string,
    },
  };
}
export function isWebSocketInfo(event: Event): event is WebSocketInfo {
  return event.name === Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST ||
      event.name === Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST || event.name === Name.WEB_SOCKET_DESTROY;
}

export function isWebSocketTransfer(event: Event): event is WebSocketTransfer {
  return event.name === Name.WEB_SOCKET_SEND || event.name === Name.WEB_SOCKET_RECEIVE;
}

export interface WebSocketSend extends Instant {
  name: Name.WEB_SOCKET_SEND;
  args: Args&{
    data: ArgsData & {
      identifier: number,
      url: string,
      dataLength: number,
      frame?: string,
      workerId?: string,
    },
  };
}

export interface WebSocketReceive extends Instant {
  name: Name.WEB_SOCKET_RECEIVE;
  args: Args&{
    data: ArgsData & {
      identifier: number,
      url: string,
      dataLength: number,
      frame?: string,
      workerId?: string,
    },
  };
}

export interface WebSocketSendHandshakeRequest extends Instant {
  name: Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST;
  args: Args&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isWebSocketSendHandshakeRequest(event: Event): event is WebSocketSendHandshakeRequest {
  return event.name === Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST;
}

export interface WebSocketReceiveHandshakeResponse extends Instant {
  name: Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST;
  args: Args&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isWebSocketReceiveHandshakeResponse(event: Event): event is WebSocketReceiveHandshakeResponse {
  return event.name === Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST;
}

export interface WebSocketDestroy extends Instant {
  name: Name.WEB_SOCKET_DESTROY;
  args: Args&{
    data: {
      frame: string,
      identifier: number,
    },
  };
}
export function isWebSocketDestroy(event: Event): event is WebSocketDestroy {
  return event.name === Name.WEB_SOCKET_DESTROY;
}

export type WebSocketTraceEvent = WebSocketCreate|WebSocketInfo|WebSocketTransfer;
export function isWebSocketTraceEvent(event: Event): event is WebSocketTraceEvent {
  return isWebSocketCreate(event) || isWebSocketInfo(event) || isWebSocketTransfer(event);
}

export type WebSocketEvent = WebSocketTraceEvent|SyntheticWebSocketConnection;
export function isWebSocketEvent(event: Event): event is WebSocketTraceEvent|SyntheticWebSocketConnection {
  return isWebSocketTraceEvent(event) || isSyntheticWebSocketConnection(event);
}

export interface V8Compile extends Complete {
  name: Name.COMPILE;
  args: Args&{
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
export function isV8Compile(event: Event): event is V8Compile {
  return event.name === Name.COMPILE && event.ph === Phase.COMPLETE;
}

export interface FunctionCall extends Complete {
  name: Name.FUNCTION_CALL;
  args: Args&{
    data?: Partial<CallFrame>& {
      frame?: string,
      isolate?: string,
    },
  };
}
export function isFunctionCall(event: Event): event is FunctionCall {
  return event.name === Name.FUNCTION_CALL && event.ph === Phase.COMPLETE;
}

export interface SchedulePostTaskCallback extends Instant {
  name: Name.SCHEDULE_POST_TASK_CALLBACK;
  args: Args&{
    data: {
      taskId: number,
      priority: 'user-blocking'|'user-visible'|'background',
      delay: Milli,
      frame?: string,
      stackTrace?: CallFrame,
    },
  };
}
export function isSchedulePostTaskCallback(event: Event): event is SchedulePostTaskCallback {
  return event.name === Name.SCHEDULE_POST_TASK_CALLBACK;
}

export interface RunPostTaskCallback extends Complete {
  name: Name.RUN_POST_TASK_CALLBACK;
  args: Args&{
    data: {
      taskId: number,
      priority: 'user-blocking'|'user-visible'|'background',
      delay: Milli,
      frame?: string,
    },
  };
}
export function isRunPostTaskCallback(event: Event): event is RunPostTaskCallback {
  return event.name === Name.RUN_POST_TASK_CALLBACK && event.ph === Phase.COMPLETE;
}

export interface AbortPostTaskCallback extends Complete {
  name: Name.ABORT_POST_TASK_CALLBACK;
  args: Args&{
    data: {
      taskId: number,
      frame?: string,
      stackTrace?: CallFrame,
    },
  };
}
export function isAbortPostTaskCallback(event: Event): event is RunPostTaskCallback {
  return event.name === Name.ABORT_POST_TASK_CALLBACK && event.ph === Phase.COMPLETE;
}

/**
 * Generally, before JS is executed, a trace event is dispatched that
 * parents the JS calls. These we call "invocation" events. This
 * function determines if an event is one of such. Note: these are also
 * commonly referred to as "JS entry points".
 */
export function isJSInvocationEvent(event: Event): boolean {
  switch (event.name) {
    case Name.RUN_MICROTASKS:
    case Name.FUNCTION_CALL:
    // TODO(paulirish): Define types for these Evaluate* events
    case Name.EVALUATE_SCRIPT:
    case Name.EVALUATE_MODULE:
    case Name.EVENT_DISPATCH:
    case Name.V8_EXECUTE:
    case Name.V8_CONSOLE_RUN_TASK:
      return true;
  }
  // Also consider any new v8 trace events. (eg 'V8.RunMicrotasks' and 'v8.run')
  if (event.name.startsWith('v8') || event.name.startsWith('V8')) {
    return true;
  }
  if (isConsoleRunTask(event)) {
    return true;
  }
  return false;
}
export interface ConsoleRunTask extends Event {
  args: Args&{
    data: ArgsData & {
      sampleTraceId?: number,
    },
  };
  name: Name.V8_CONSOLE_RUN_TASK;
}

export function isConsoleRunTask(event: Event): event is ConsoleRunTask {
  return event.name === Name.V8_CONSOLE_RUN_TASK;
}

export interface FlowEvent extends Event {
  // Contains a flow id created by perfetto for the flow this phase
  // event belongs to.
  id: number;
  ph: Phase.FLOW_START|Phase.FLOW_END|Phase.FLOW_STEP;
}

export function isFlowPhaseEvent(event: Event): event is FlowEvent {
  return event.ph === Phase.FLOW_START || event.ph === Phase.FLOW_STEP || event.ph === Phase.FLOW_END;
}

export interface ParseAuthorStyleSheet extends Complete {
  name: Name.PARSE_AUTHOR_STYLE_SHEET;
  args?: Args&{
    data: {
      stylesheetUrl: string,
    },
  };
}

export function isParseAuthorStyleSheetEvent(event: Event): event is ParseAuthorStyleSheet {
  return event.name === Name.PARSE_AUTHOR_STYLE_SHEET && event.ph === Phase.COMPLETE;
}

/**
 * This is an exhaustive list of events we track in the Performance
 * panel. Note not all of them are necessarliry shown in the flame
 * chart, some of them we only use for parsing.
 * TODO(crbug.com/1428024): Complete this enum.
 */
export const enum Name {
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
  V8_CONSOLE_RUN_TASK = 'V8Console::runTask',
  SCHEDULE_POST_TASK_CALLBACK = 'SchedulePostTaskCallback',
  RUN_POST_TASK_CALLBACK = 'RunPostTaskCallback',
  ABORT_POST_TASK_CALLBACK = 'AbortPostTaskCallback',
  DEBUGGER_ASYNC_TASK_RUN = 'v8::Debugger::AsyncTaskRun',
  DEBUGGER_ASYNC_TASK_SCHEDULED = 'v8::Debugger::AsyncTaskScheduled',

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
  /** The real trace event is called 'UpdateLayoutTree' but we've aliased it for convenience. */
  RECALC_STYLE = 'UpdateLayoutTree',
  INVALIDATE_LAYOUT = 'InvalidateLayout',
  LAYOUT_INVALIDATION_TRACKING = 'LayoutInvalidationTracking',
  COMPUTE_INTERSECTION = 'ComputeIntersections',
  HIT_TEST = 'HitTest',
  PRE_PAINT = 'PrePaint',
  LAYERIZE = 'Layerize',
  LAYOUT_SHIFT = 'LayoutShift',
  SYNTHETIC_LAYOUT_SHIFT = 'SyntheticLayoutShift',
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
  MARK_LCP_CANDIDATE_FOR_SOFT_NAVIGATION = 'largestContentfulPaint::CandidateForSoftNavigation',
  MARK_LCP_INVALIDATE = 'largestContentfulPaint::Invalidate',
  NAVIGATION_START = 'navigationStart',
  SOFT_NAVIGATION_START = 'SoftNavigationStart',
  CONSOLE_TIME = 'ConsoleTime',
  USER_TIMING = 'UserTiming',
  INTERACTIVE_TIME = 'InteractiveTime',
  TIME_STAMP = 'TimeStamp',

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
  CPU_PROFILE = 'CpuProfile',
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
  LAYOUT_IMAGE_UNSIZED = 'LayoutImageUnsized',

  DOM_LOADING = 'domLoading',
  BEGIN_REMOTE_FONT_LOAD = 'BeginRemoteFontLoad',
  REMOTE_FONT_LOADED = 'RemoteFontLoaded',

  ANIMATION_FRAME = 'AnimationFrame',
  ANIMATION_FRAME_PRESENTATION = 'AnimationFrame::Presentation',

  SYNTHETIC_NETWORK_REQUEST = 'SyntheticNetworkRequest',
  USER_TIMING_MEASURE = 'UserTiming::Measure',

  LINK_PRECONNECT = 'LinkPreconnect',

  PRELOAD_RENDER_BLOCKING_STATUS_CHANGE = 'PreloadRenderBlockingStatusChange',
}

/**
 * NOT AN EXHAUSTIVE LIST: just some categories we use and refer
 * to in multiple places.
 **/
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
export interface LegacyTimelineFrame extends Event {
  startTime: Micro;
  startTimeOffset: Micro;
  endTime: Micro;
  duration: Micro;
  idle: boolean;
  dropped: boolean;
  isPartial: boolean;
  layerTree: LegacyFrameLayerTreeData|null;
  paints: LegacyLayerPaintEvent[];
  mainFrameId?: number;
  readonly seqId: number;
  index: number;
}

export function isLegacyTimelineFrame(data: Event): data is LegacyTimelineFrame {
  return 'idle' in data && typeof data.idle === 'boolean';
}

export interface LegacyFrameLayerTreeData {
  entry: LayerTreeHostImplSnapshot;
  paints: LegacyLayerPaintEvent[];
}

export interface LegacyLayerPaintEvent {
  layerId(): number;
  event(): Paint;
  picture(): LegacyLayerPaintEventPicture|null;
}

export interface LegacyLayerPaintEventPicture {
  rect: number[];
  serializedPicture: string;
}

/** Same as `TraceEventTargetRundown` in `EnhancedTracesParser` */
export interface RundownScriptCompiled extends Event {
  cat: 'disabled-by-default-devtools.target-rundown';
  name: SDK.EnhancedTracesParser.RundownScriptCompiled['name'];
  args: Args&{
    data?: SDK.EnhancedTracesParser.RundownScriptCompiled['args']['data'],
  };
}

export function isRundownScriptCompiled(event: Event): event is RundownScriptCompiled {
  return event.cat === 'disabled-by-default-devtools.target-rundown';
}

/** Same as `TraceEventScriptRundown` in `EnhancedTracesParser` */
export interface RundownScript extends Event {
  cat: 'disabled-by-default-devtools.v8-source-rundown';
  name: SDK.EnhancedTracesParser.RundownScript['name'];
  args: Args&{
    data: SDK.EnhancedTracesParser.RundownScript['args']['data'],
  };
}

export function isRundownScript(event: Event): event is RundownScript {
  return event.cat === 'disabled-by-default-devtools.v8-source-rundown' && event.name === 'ScriptCatchup';
}

/** Same as `TraceEventScriptRundownSource` in `EnhancedTracesParser` */
export interface RundownScriptSource extends Event {
  cat: 'disabled-by-default-devtools.v8-source-rundown-sources';
  name: 'ScriptCatchup';
  args: Args&{
    data: SDK.EnhancedTracesParser.RundownScriptSource['args']['data'],
  };
}

export function isRundownScriptSource(event: Event): event is RundownScriptSource {
  return event.cat === 'disabled-by-default-devtools.v8-source-rundown-sources' && event.name === 'ScriptCatchup';
}

export interface RundownScriptSourceLarge extends Event {
  cat: 'disabled-by-default-devtools.v8-source-rundown-sources';
  name: 'LargeScriptCatchup';
  args: Args&{
    data: {
      isolate: number,
      scriptId: number,
      splitIndex: number,
      splitCount: number,
      sourceText: string,
    },
  };
}

export function isRundownScriptSourceLarge(event: Event): event is RundownScriptSourceLarge {
  return event.cat === 'disabled-by-default-devtools.v8-source-rundown-sources' && event.name === 'LargeScriptCatchup';
}

export interface RundownScriptStub extends Event {
  cat: 'disabled-by-default-devtools.v8-source-rundown-sources';
  name: 'StubScriptCatchup';
  args: Args&{
    data: {
      isolate: number,
      scriptId: number,
    },
  };
}

export function isAnyScriptSourceEvent(event: Event): event is RundownScriptSource|RundownScriptSourceLarge|
    RundownScriptStub {
  return event.cat === 'disabled-by-default-devtools.v8-source-rundown-sources';
}

export interface PreloadRenderBlockingStatusChangeEvent extends Instant {
  name: Name.PRELOAD_RENDER_BLOCKING_STATUS_CHANGE;
  cat: 'devtools.timeline';
  args: Args&{
    data: {
      requestId: string,
      url: string,
      renderBlocking?: RenderBlocking,
    },
  };
}

export function isPreloadRenderBlockingStatusChangeEvent(event: Event):
    event is PreloadRenderBlockingStatusChangeEvent {
  return event.name === Name.PRELOAD_RENDER_BLOCKING_STATUS_CHANGE;
}
