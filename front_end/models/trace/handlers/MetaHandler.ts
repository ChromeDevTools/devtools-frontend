// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

// We track the renderer processes we see in each frame on the way through the trace.
const rendererProcessesByFrameId: FrameProcessData = new Map();

// We will often want to key data by Frame IDs, and commonly we'll care most
// about the main frame's ID, so we store and expose that.
let mainFrameId: string = '';
let mainFrameURL: string = '';

const framesByProcessId = new Map<Types.Events.ProcessID, Map<string, Types.Events.TraceFrame>>();

// We will often want to key data by the browser process, GPU process and top
// level renderer IDs, so keep a track on those.
let browserProcessId: Types.Events.ProcessID = Types.Events.ProcessID(-1);
let browserThreadId: Types.Events.ThreadID = Types.Events.ThreadID(-1);
let gpuProcessId: Types.Events.ProcessID = Types.Events.ProcessID(-1);
let gpuThreadId: Types.Events.ThreadID = Types.Events.ThreadID(-1);
let viewportRect: DOMRect|null = null;
let devicePixelRatio: number|null = null;

const processNames: Map<Types.Events.ProcessID, Types.Events.ProcessName> = new Map();

const topLevelRendererIds = new Set<Types.Events.ProcessID>();
const traceBounds: Types.Timing.TraceWindowMicroSeconds = {
  min: Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY),
  max: Types.Timing.MicroSeconds(Number.NEGATIVE_INFINITY),
  range: Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY),
};

/**
 * These represent the user navigating. Values such as First Contentful Paint,
 * etc, are relative to the navigation.
 *
 *  We store navigation events both by the frame and navigation ID. This means
 * when we need to look them up, we can use whichever ID we have.
 *
 * Note that these Maps will have the same values in them; these are just keyed
 * differently to make look-ups easier.
 *
 * We also additionally maintain an array of only navigations that occured on
 * the main frame. In many places in the UI we only care about highlighting
 * main frame navigations, so calculating this list here is better than
 * filtering either of the below maps over and over again at the UI layer.
 */
const navigationsByFrameId = new Map<string, Types.Events.NavigationStart[]>();
const navigationsByNavigationId = new Map<string, Types.Events.NavigationStart>();
const mainFrameNavigations: Types.Events.NavigationStart[] = [];

// Represents all the threads in the trace, organized by process. This is mostly for internal
// bookkeeping so that during the finalize pass we can obtain the main and browser thread IDs.
const threadsInProcess = new Map<Types.Events.ProcessID, Map<Types.Events.ThreadID, Types.Events.ThreadName>>();

let traceStartedTimeFromTracingStartedEvent = Types.Timing.MicroSeconds(-1);
const eventPhasesOfInterestForTraceBounds = new Set([
  Types.Events.Phase.BEGIN,
  Types.Events.Phase.END,
  Types.Events.Phase.COMPLETE,
  Types.Events.Phase.INSTANT,
]);

let handlerState = HandlerState.UNINITIALIZED;
// Tracks if the trace is a generic trace, which here means that it did not come from athe DevTools Performance Panel recording.
// We assume a trace is generic, and mark it as not generic if we see any of:
// - TracingStartedInPage
// - TracingStartedInBrowser
// - TracingSessionIdForWorker
// These are all events which indicate this is a Chrome browser trace.
let traceIsGeneric = true;
const CHROME_WEB_TRACE_EVENTS = new Set([
  Types.Events.Name.TRACING_STARTED_IN_PAGE,
  Types.Events.Name.TRACING_SESSION_ID_FOR_WORKER,
  Types.Events.Name.TRACING_STARTED_IN_BROWSER,

]);

export function reset(): void {
  navigationsByFrameId.clear();
  navigationsByNavigationId.clear();
  processNames.clear();
  mainFrameNavigations.length = 0;

  browserProcessId = Types.Events.ProcessID(-1);
  browserThreadId = Types.Events.ThreadID(-1);
  gpuProcessId = Types.Events.ProcessID(-1);
  gpuThreadId = Types.Events.ThreadID(-1);
  viewportRect = null;
  topLevelRendererIds.clear();
  threadsInProcess.clear();
  rendererProcessesByFrameId.clear();
  framesByProcessId.clear();

  traceBounds.min = Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY);
  traceBounds.max = Types.Timing.MicroSeconds(Number.NEGATIVE_INFINITY);
  traceBounds.range = Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY);
  traceStartedTimeFromTracingStartedEvent = Types.Timing.MicroSeconds(-1);

  traceIsGeneric = true;

  handlerState = HandlerState.UNINITIALIZED;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('Meta Handler was not reset');
  }

  handlerState = HandlerState.INITIALIZED;
}

function updateRendererProcessByFrame(event: Types.Events.Event, frame: Types.Events.TraceFrame): void {
  const framesInProcessById = Platform.MapUtilities.getWithDefault(framesByProcessId, frame.processId, () => new Map());
  framesInProcessById.set(frame.frame, frame);

  const rendererProcessInFrame = Platform.MapUtilities.getWithDefault(
      rendererProcessesByFrameId, frame.frame,
      () => new Map<
          Types.Events.ProcessID, {frame: Types.Events.TraceFrame, window: Types.Timing.TraceWindowMicroSeconds}[]>());
  const rendererProcessInfo = Platform.MapUtilities.getWithDefault(rendererProcessInFrame, frame.processId, () => {
    return [];
  });
  const lastProcessData = rendererProcessInfo.at(-1);

  // Only store a new entry if the URL changed, otherwise it's just
  // redundant information.
  if (lastProcessData && lastProcessData.frame.url === frame.url) {
    return;
  }
  // For now we store the time of the event as the min. In the finalize we step
  // through each of these windows and update their max and range values.
  rendererProcessInfo.push({
    frame,
    window: {
      min: event.ts,
      max: Types.Timing.MicroSeconds(0),
      range: Types.Timing.MicroSeconds(0),
    },
  });
}

export function handleEvent(event: Types.Events.Event): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Meta Handler is not initialized');
  }

  if (traceIsGeneric && CHROME_WEB_TRACE_EVENTS.has(event.name as Types.Events.Name)) {
    traceIsGeneric = false;
  }

  if (Types.Events.isProcessName(event)) {
    processNames.set(event.pid, event);
  }

  // If there is a timestamp (which meta events do not have), and the event does
  // not end with ::UMA then it, and the event is in the set of valid phases,
  // then it should be included for the purposes of calculating the trace bounds.
  // The UMA events in particular seem to be reported on page unloading, which
  // often extends the bounds of the trace unhelpfully.
  if (event.ts !== 0 && !event.name.endsWith('::UMA') && eventPhasesOfInterestForTraceBounds.has(event.ph)) {
    traceBounds.min = Types.Timing.MicroSeconds(Math.min(event.ts, traceBounds.min));
    const eventDuration = event.dur ?? Types.Timing.MicroSeconds(0);
    traceBounds.max = Types.Timing.MicroSeconds(Math.max(event.ts + eventDuration, traceBounds.max));
  }

  if (Types.Events.isProcessName(event) && (event.args.name === 'Browser' || event.args.name === 'HeadlessBrowser')) {
    browserProcessId = event.pid;
    return;
  }

  if (Types.Events.isProcessName(event) && (event.args.name === 'Gpu' || event.args.name === 'GPU Process')) {
    gpuProcessId = event.pid;
    return;
  }

  if (Types.Events.isThreadName(event) && event.args.name === 'CrGpuMain') {
    gpuThreadId = event.tid;
    return;
  }

  if (Types.Events.isThreadName(event) && event.args.name === 'CrBrowserMain') {
    browserThreadId = event.tid;
  }

  if (Types.Events.isMainFrameViewport(event) && viewportRect === null) {
    const rectAsArray = event.args.data.viewport_rect;
    const viewportX = rectAsArray[0];
    const viewportY = rectAsArray[1];
    const viewportWidth = rectAsArray[2];
    const viewportHeight = rectAsArray[5];
    viewportRect = new DOMRect(viewportX, viewportY, viewportWidth, viewportHeight);
    devicePixelRatio = event.args.data.dpr;
  }

  // The TracingStartedInBrowser event includes the data on which frames are
  // in scope at the start of the trace. We use this to identify the frame with
  // no parent, i.e. the top level frame.
  if (Types.Events.isTracingStartedInBrowser(event)) {
    traceStartedTimeFromTracingStartedEvent = event.ts;

    if (!event.args.data) {
      throw new Error('No frames found in trace data');
    }

    for (const frame of (event.args.data.frames ?? [])) {
      updateRendererProcessByFrame(event, frame);

      if (!frame.parent) {
        topLevelRendererIds.add(frame.processId);
      }
      /**
       * The code here uses a few different methods to try to determine the main frame.
       * The ideal is that the frames have two flags present:
       *
       * 1. isOutermostMainFrame (added in April 2024 - crrev.com/c/5424783)
       * 2. isInPrimaryMainFrame (added in June 2024 - crrev.com/c/5595033)
       *
       * The frame where both of these are set to `true` is the main frame. The
       * reason we need both of these flags to have 100% confidence is because
       * with the introduction of MPArch and pre-rendering, we can have other
       * frames that are the outermost frame, but are not the primary process.
       * Relying on isOutermostMainFrame in isolation caused the engine to
       * incorrectly identify the wrong frame as main (see crbug.com/343873756).
       *
       * See https://source.chromium.org/chromium/chromium/src/+/main:docs/frame_trees.md
       * for a bit more context on FrameTrees in Chromium.
       *
       * To avoid breaking entirely for traces pre-June 2024 that don't have
       * both of these flags, we will fallback to less accurate methods:
       *
       * 1. If we have isOutermostMainFrame, we will use that
       *    (and accept we might get it wrong)
       * 2. If we don't have isOutermostMainFrame, we fallback to finding a
       *    frame that has a URL, but doesn't have a parent. This is a crude
       *    guess at the main frame...but better than nothing and is historically
       *    how DevTools identified the main frame.
       */

      const traceHasPrimaryMainFrameFlag = 'isInPrimaryMainFrame' in frame;
      const traceHasOutermostMainFrameFlag = 'isOutermostMainFrame' in frame;

      if (traceHasPrimaryMainFrameFlag && traceHasOutermostMainFrameFlag) {
        // Ideal situation: identify the main frame as the one that has both these flags set to true.
        if (frame.isInPrimaryMainFrame && frame.isOutermostMainFrame) {
          mainFrameId = frame.frame;
          mainFrameURL = frame.url;
        }
      } else if (traceHasOutermostMainFrameFlag) {
        // Less ideal: "guess" at the main thread by using this falg.
        if (frame.isOutermostMainFrame) {
          mainFrameId = frame.frame;
          mainFrameURL = frame.url;
        }
      } else {
        // Worst case: guess by seeing if the frame doesn't have a parent, and does have a URL.
        if (!frame.parent && frame.url) {
          mainFrameId = frame.frame;
          mainFrameURL = frame.url;
        }
      }
    }

    return;
  }

  // FrameCommittedInBrowser events tell us information about each frame
  // and we use these to track how long each individual renderer is active
  // for. We track all renderers here (top level and those in frames), but
  // for convenience we also populate a set of top level renderer IDs.
  if (Types.Events.isFrameCommittedInBrowser(event)) {
    const frame = event.args.data;
    if (!frame) {
      return;
    }

    updateRendererProcessByFrame(event, frame);

    if (frame.parent) {
      return;
    }

    topLevelRendererIds.add(frame.processId);
    return;
  }

  if (Types.Events.isCommitLoad(event)) {
    const frameData = event.args.data;
    if (!frameData) {
      return;
    }

    const {frame, name, url} = frameData;
    updateRendererProcessByFrame(event, {processId: event.pid, frame, name, url});
    return;
  }

  // Track all threads based on the process & thread IDs.
  if (Types.Events.isThreadName(event)) {
    const threads = Platform.MapUtilities.getWithDefault(threadsInProcess, event.pid, () => new Map());
    threads.set(event.tid, event);
    return;
  }

  // Track all navigation events. Note that there can be navigation start events
  // but where the documentLoaderURL is empty. As far as the trace rendering is
  // concerned, these events are noise so we filter them out here.
  // (The filtering of empty URLs is done in the
  // isNavigationStartWithURL check)
  if (Types.Events.isNavigationStartWithURL(event) && event.args.data) {
    const navigationId = event.args.data.navigationId;
    if (navigationsByNavigationId.has(navigationId)) {
      // We have only ever seen this situation once, in crbug.com/1503982, where the user ran:
      // window.location.href = 'javascript:console.log("foo")'
      // In this situation two identical navigationStart events are emitted with the same data, URL and ID.
      // So, in this situation we drop/ignore any subsequent navigations if we have already seen that ID.
      return;
    }
    navigationsByNavigationId.set(navigationId, event);

    const frameId = event.args.frame;
    const existingFrameNavigations = navigationsByFrameId.get(frameId) || [];
    existingFrameNavigations.push(event);
    navigationsByFrameId.set(frameId, existingFrameNavigations);
    if (frameId === mainFrameId) {
      mainFrameNavigations.push(event);
    }
    return;
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Handler is not initialized');
  }

  // We try to set the minimum time by finding the event with the smallest
  // timestamp. However, if we also got a timestamp from the
  // TracingStartedInBrowser event, we should always use that.
  // But in some traces (for example, CPU profiles) we do not get that event,
  // hence why we need to check we got a timestamp from it before setting it.
  if (traceStartedTimeFromTracingStartedEvent >= 0) {
    traceBounds.min = traceStartedTimeFromTracingStartedEvent;
  }
  traceBounds.range = Types.Timing.MicroSeconds(traceBounds.max - traceBounds.min);

  // If we go from foo.com to example.com we will get a new renderer, and
  // therefore the "top level renderer" will have a different PID as it has
  // changed. Here we step through each renderer process and updated its window
  // bounds, such that we end up with the time ranges in the trace for when
  // each particular renderer started and stopped being the main renderer
  // process.
  for (const [, processWindows] of rendererProcessesByFrameId) {
    const processWindowValues = [...processWindows.values()].flat();
    for (let i = 0; i < processWindowValues.length; i++) {
      const currentWindow = processWindowValues[i];
      const nextWindow = processWindowValues[i + 1];

      // For the last window we set its max to be positive infinity.
      // TODO: Move the trace bounds handler into meta so we can clamp first and last windows.
      if (!nextWindow) {
        currentWindow.window.max = Types.Timing.MicroSeconds(traceBounds.max);
        currentWindow.window.range = Types.Timing.MicroSeconds(traceBounds.max - currentWindow.window.min);
      } else {
        currentWindow.window.max = Types.Timing.MicroSeconds(nextWindow.window.min - 1);
        currentWindow.window.range = Types.Timing.MicroSeconds(currentWindow.window.max - currentWindow.window.min);
      }
    }
  }

  // Frame ids which we didn't register using either the TracingStartedInBrowser or
  // the FrameCommittedInBrowser events are considered noise, so we filter them out, as well
  // as the navigations that belong to such frames.
  for (const [frameId, navigations] of navigationsByFrameId) {
    // The frames in the rendererProcessesByFrameId map come only from the
    // TracingStartedInBrowser and FrameCommittedInBrowser events, so we can use it as point
    // of comparison to determine if a frameId should be discarded.
    if (rendererProcessesByFrameId.has(frameId)) {
      continue;
    }
    navigationsByFrameId.delete(frameId);
    for (const navigation of navigations) {
      if (!navigation.args.data) {
        continue;
      }
      navigationsByNavigationId.delete(navigation.args.data.navigationId);
    }
  }

  // Sometimes in traces the TracingStartedInBrowser event can give us an
  // incorrect initial URL for the main frame's URL - about:blank or the URL of
  // the previous page. This doesn't matter too much except we often use this
  // URL as the visual name of the trace shown to the user (e.g. in the history
  // dropdown). We can be more accurate by finding the first main frame
  // navigaton, and using its URL, if we have it.
  // However, to avoid doing this in a case where the first navigation is far
  // into the trace's lifecycle, we only do this in situations where the first
  // navigation happened very soon (0.5 seconds) after the trace started
  // recording.
  const firstMainFrameNav = mainFrameNavigations.at(0);
  const firstNavTimeThreshold = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(0.5));
  if (firstMainFrameNav) {
    const navigationIsWithinThreshold = firstMainFrameNav.ts - traceBounds.min < firstNavTimeThreshold;
    if (firstMainFrameNav.args.data?.isOutermostMainFrame && firstMainFrameNav.args.data?.documentLoaderURL &&
        navigationIsWithinThreshold) {
      mainFrameURL = firstMainFrameNav.args.data.documentLoaderURL;
    }
  }

  handlerState = HandlerState.FINALIZED;
}

export type MetaHandlerData = {
  traceIsGeneric: boolean,
  traceBounds: Types.Timing.TraceWindowMicroSeconds,
  browserProcessId: Types.Events.ProcessID,
  processNames: Map<Types.Events.ProcessID, Types.Events.ProcessName>,
  browserThreadId: Types.Events.ThreadID,
  gpuProcessId: Types.Events.ProcessID,
  navigationsByFrameId: Map<string, Types.Events.NavigationStart[]>,
  navigationsByNavigationId: Map<string, Types.Events.NavigationStart>,
  threadsInProcess: Map<Types.Events.ProcessID, Map<Types.Events.ThreadID, Types.Events.ThreadName>>,
  mainFrameId: string,
  mainFrameURL: string,
  /**
   * A frame can have multiple renderer processes, at the same time,
   * a renderer process can have multiple URLs. This map tracks the
   * processes active on a given frame, with the time window in which
   * they were active. Because a renderer process might have multiple
   * URLs, each process in each frame has an array of windows, with an
   * entry for each URL it had.
   */
  rendererProcessesByFrame: FrameProcessData,
  topLevelRendererIds: Set<Types.Events.ProcessID>,
  frameByProcessId: Map<Types.Events.ProcessID, Map<string, Types.Events.TraceFrame>>,
  mainFrameNavigations: Types.Events.NavigationStart[],
  gpuThreadId?: Types.Events.ThreadID,
  viewportRect?: DOMRect,
  devicePixelRatio?: number,
};

// Each frame has a single render process at a given time but it can have
// multiple render processes  during a trace, for example if a navigation
// occurred in the frame. This map tracks the process that was active for
// each frame at each point in time. Also, because a process can be
// assigned to multiple URLs, there is a window for each URL a process
// was assigned.
//
// Note that different sites always end up in different render
// processes, however two different URLs can point to the same site.
// For example: https://google.com and https://maps.google.com point to
// the same site.
// Read more about this in
// https://developer.chrome.com/articles/renderingng-architecture/#threads
// and https://web.dev/same-site-same-origin/
export type FrameProcessData =
    Map<string,
        Map<Types.Events.ProcessID, {frame: Types.Events.TraceFrame, window: Types.Timing.TraceWindowMicroSeconds}[]>>;

export function data(): MetaHandlerData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Meta Handler is not finalized');
  }

  return {
    traceBounds: {...traceBounds},
    browserProcessId,
    browserThreadId,
    processNames,
    gpuProcessId,
    gpuThreadId: gpuThreadId === Types.Events.ThreadID(-1) ? undefined : gpuThreadId,
    viewportRect: viewportRect || undefined,
    devicePixelRatio: devicePixelRatio ?? undefined,
    mainFrameId,
    mainFrameURL,
    navigationsByFrameId,
    navigationsByNavigationId,
    threadsInProcess,
    rendererProcessesByFrame: rendererProcessesByFrameId,
    topLevelRendererIds,
    frameByProcessId: framesByProcessId,
    mainFrameNavigations,
    traceIsGeneric,
  };
}
