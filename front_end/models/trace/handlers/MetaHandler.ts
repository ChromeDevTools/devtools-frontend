// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

// We track the renderer processes we see in each frame on the way through the trace.
const rendererProcessesByFrameId: FrameProcessData = new Map();

// We will often want to key data by Frame IDs, and commonly we'll care most
// about the main frame's ID, so we store and expose that.
let mainFrameId: string = '';
let mainFrameURL: string = '';

const framesByProcessId = new Map<Types.TraceEvents.ProcessID, Map<string, Types.TraceEvents.TraceFrame>>();

// We will often want to key data by the browser process, GPU process and top
// level renderer IDs, so keep a track on those.
let browserProcessId: Types.TraceEvents.ProcessID = Types.TraceEvents.ProcessID(-1);
let browserThreadId: Types.TraceEvents.ThreadID = Types.TraceEvents.ThreadID(-1);
let gpuProcessId: Types.TraceEvents.ProcessID = Types.TraceEvents.ProcessID(-1);
let gpuThreadId: Types.TraceEvents.ThreadID = Types.TraceEvents.ThreadID(-1);
let viewportRect: DOMRect|null = null;

const topLevelRendererIds = new Set<Types.TraceEvents.ProcessID>();
const traceBounds: Types.Timing.TraceWindow = {
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
const navigationsByFrameId = new Map<string, Types.TraceEvents.TraceEventNavigationStart[]>();
const navigationsByNavigationId = new Map<string, Types.TraceEvents.TraceEventNavigationStart>();
const mainFrameNavigations: Types.TraceEvents.TraceEventNavigationStart[] = [];

// Represents all the threads in the trace, organized by process. This is mostly for internal
// bookkeeping so that during the finalize pass we can obtain the main and browser thread IDs.
const threadsInProcess =
    new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventThreadName>>();

let traceStartedTimeFromTracingStartedEvent = Types.Timing.MicroSeconds(-1);
const eventPhasesOfInterestForTraceBounds = new Set([
  Types.TraceEvents.Phase.BEGIN,
  Types.TraceEvents.Phase.END,
  Types.TraceEvents.Phase.COMPLETE,
  Types.TraceEvents.Phase.INSTANT,
]);

let handlerState = HandlerState.UNINITIALIZED;
export function reset(): void {
  navigationsByFrameId.clear();
  navigationsByNavigationId.clear();
  mainFrameNavigations.length = 0;

  browserProcessId = Types.TraceEvents.ProcessID(-1);
  browserThreadId = Types.TraceEvents.ThreadID(-1);
  gpuProcessId = Types.TraceEvents.ProcessID(-1);
  gpuThreadId = Types.TraceEvents.ThreadID(-1);
  viewportRect = null;
  topLevelRendererIds.clear();
  threadsInProcess.clear();
  rendererProcessesByFrameId.clear();
  framesByProcessId.clear();

  traceBounds.min = Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY);
  traceBounds.max = Types.Timing.MicroSeconds(Number.NEGATIVE_INFINITY);
  traceBounds.range = Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY);
  traceStartedTimeFromTracingStartedEvent = Types.Timing.MicroSeconds(-1);

  handlerState = HandlerState.UNINITIALIZED;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('Meta Handler was not reset');
  }

  handlerState = HandlerState.INITIALIZED;
}

function updateRendererProcessByFrame(
    event: Types.TraceEvents.TraceEventData, frame: Types.TraceEvents.TraceFrame): void {
  const framesInProcessById = Platform.MapUtilities.getWithDefault(framesByProcessId, frame.processId, () => new Map());
  framesInProcessById.set(frame.frame, frame);

  const rendererProcessInFrame = Platform.MapUtilities.getWithDefault(
      rendererProcessesByFrameId, frame.frame,
      () => new Map<
          Types.TraceEvents.ProcessID, {frame: Types.TraceEvents.TraceFrame, window: Types.Timing.TraceWindow}[]>());
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

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Meta Handler is not initialized');
  }

  // If there is a timestamp (which meta events do not have), and the event does
  // not end with ::UMA then it, and the event is in the set of valid phases,
  // then it should be included for the purposes of calculating the trace bounds.
  // The UMA events in particular seem to be reported on page unloading, which
  // often extends the bounds of the trace unhelpfully.
  if (event.ts !== 0 && !event.name.endsWith('::UMA') && eventPhasesOfInterestForTraceBounds.has(event.ph)) {
    traceBounds.min = Types.Timing.MicroSeconds(Math.min(event.ts, traceBounds.min));
    const eventDuration = event.dur || Types.Timing.MicroSeconds(0);
    traceBounds.max = Types.Timing.MicroSeconds(Math.max(event.ts + eventDuration, traceBounds.max));
  }

  if (Types.TraceEvents.isProcessName(event) &&
      (event.args.name === 'Browser' || event.args.name === 'HeadlessBrowser')) {
    browserProcessId = event.pid;
    return;
  }

  if (Types.TraceEvents.isProcessName(event) && (event.args.name === 'Gpu' || event.args.name === 'GPU Process')) {
    gpuProcessId = event.pid;
    return;
  }

  if (Types.TraceEvents.isThreadName(event) && event.args.name === 'CrGpuMain') {
    gpuThreadId = event.tid;
    return;
  }

  if (Types.TraceEvents.isThreadName(event) && event.args.name === 'CrBrowserMain') {
    browserThreadId = event.tid;
  }

  if (Types.TraceEvents.isTraceEventMainFrameViewport(event) && viewportRect === null) {
    const rectAsArray = event.args.data.viewport_rect;
    const viewportX = rectAsArray[0];
    const viewportY = rectAsArray[1];
    const viewportWidth = rectAsArray[2];
    const viewportHeight = rectAsArray[5];
    viewportRect = new DOMRect(viewportX, viewportY, viewportWidth, viewportHeight);
  }

  // The TracingStartedInBrowser event includes the data on which frames are
  // in scope at the start of the trace. We use this to identify the frame with
  // no parent, i.e. the top level frame.
  if (Types.TraceEvents.isTraceEventTracingStartedInBrowser(event)) {
    traceStartedTimeFromTracingStartedEvent = event.ts;

    if (!event.args.data) {
      throw new Error('No frames found in trace data');
    }

    for (const frame of (event.args.data.frames ?? [])) {
      updateRendererProcessByFrame(event, frame);

      if (frame.parent) {
        continue;
      }

      mainFrameId = frame.frame;
      mainFrameURL = frame.url;
      topLevelRendererIds.add(frame.processId);
    }
    return;
  }

  // FrameCommittedInBrowser events tell us information about each frame
  // and we use these to track how long each individual renderer is active
  // for. We track all renderers here (top level and those in frames), but
  // for convenience we also populate a set of top level renderer IDs.
  if (Types.TraceEvents.isTraceEventFrameCommittedInBrowser(event)) {
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

  if (Types.TraceEvents.isTraceEventCommitLoad(event)) {
    const frameData = event.args.data;
    if (!frameData) {
      return;
    }

    const {frame, name, url} = frameData;
    updateRendererProcessByFrame(event, {processId: event.pid, frame, name, url});
    return;
  }

  // Track all threads based on the process & thread IDs.
  if (Types.TraceEvents.isThreadName(event)) {
    const threads = Platform.MapUtilities.getWithDefault(threadsInProcess, event.pid, () => new Map());
    threads.set(event.tid, event);
    return;
  }

  // Track all navigation events. Note that there can be navigation start events
  // but where the documentLoaderURL is empty. As far as the trace rendering is
  // concerned, these events are noise so we filter them out here.
  if (Types.TraceEvents.isTraceEventNavigationStartWithURL(event) && event.args.data) {
    const navigationId = event.args.data.navigationId;
    if (navigationsByNavigationId.has(navigationId)) {
      throw new Error('Found multiple navigation start events with the same navigation ID.');
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

  handlerState = HandlerState.FINALIZED;
}

type MetaHandlerData = {
  traceBounds: Types.Timing.TraceWindow,
  browserProcessId: Types.TraceEvents.ProcessID,
  browserThreadId: Types.TraceEvents.ThreadID,
  gpuProcessId: Types.TraceEvents.ProcessID,
  gpuThreadId?: Types.TraceEvents.ThreadID,
  viewportRect?: DOMRect,
              navigationsByFrameId: Map<string, Types.TraceEvents.TraceEventNavigationStart[]>,
              navigationsByNavigationId: Map<string, Types.TraceEvents.TraceEventNavigationStart>,
              threadsInProcess:
                  Map<Types.TraceEvents.ProcessID,
                      Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventThreadName>>,
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
              topLevelRendererIds: Set<Types.TraceEvents.ProcessID>,
              frameByProcessId: Map<Types.TraceEvents.ProcessID, Map<string, Types.TraceEvents.TraceFrame>>,
              mainFrameNavigations: Types.TraceEvents.TraceEventNavigationStart[],
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
        Map<Types.TraceEvents.ProcessID, {frame: Types.TraceEvents.TraceFrame, window: Types.Timing.TraceWindow}[]>>;

export function data(): MetaHandlerData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Meta Handler is not finalized');
  }

  return {
    traceBounds: {...traceBounds},
    browserProcessId,
    browserThreadId,
    gpuProcessId,
    gpuThreadId: gpuThreadId === Types.TraceEvents.ThreadID(-1) ? undefined : gpuThreadId,
    viewportRect: viewportRect || undefined,
    mainFrameId,
    mainFrameURL,
    navigationsByFrameId: new Map(navigationsByFrameId),
    navigationsByNavigationId: new Map(navigationsByNavigationId),
    threadsInProcess: new Map(threadsInProcess),
    rendererProcessesByFrame: new Map(rendererProcessesByFrameId),
    topLevelRendererIds: new Set(topLevelRendererIds),
    frameByProcessId: new Map(framesByProcessId),
    mainFrameNavigations: [...mainFrameNavigations],
  };
}
