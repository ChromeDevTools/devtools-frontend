// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

// We track the renderer processes we see in each frame on the way through the trace.
const rendererProcessesByFrameId = new Map<
    string,
    Map<Types.TraceEvents.ProcessID, {window: Types.Timing.TraceWindow, frame: Types.TraceEvents.TraceFrame}>>();

// We will often want to key data by Frame IDs, and commonly we'll care most
// about the main frame's ID, so we store and expose that.
let mainFrameId: string = '';
let mainFrameURL: string = '';

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
 */
const navigationsByFrameId = new Map<string, Types.TraceEvents.TraceEventNavigationStart[]>();
const navigationsByNavigationId = new Map<string, Types.TraceEvents.TraceEventNavigationStart>();

// Represents all the threads in the trace, organized by process. This is mostly for internal
// bookkeeping so that during the finalize pass we can obtain the main and browser thread IDs.
const threadsInProcess =
    new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventThreadName>>();

let traceStartedTime = Types.Timing.MicroSeconds(-1);
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

  browserProcessId = Types.TraceEvents.ProcessID(-1);
  browserThreadId = Types.TraceEvents.ThreadID(-1);
  gpuProcessId = Types.TraceEvents.ProcessID(-1);
  gpuThreadId = Types.TraceEvents.ThreadID(-1);
  viewportRect = null;
  topLevelRendererIds.clear();
  threadsInProcess.clear();
  rendererProcessesByFrameId.clear();

  traceBounds.min = Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY);
  traceBounds.max = Types.Timing.MicroSeconds(Number.NEGATIVE_INFINITY);
  traceBounds.range = Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY);
  traceStartedTime = Types.Timing.MicroSeconds(-1);

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
  const rendererProcessInFrame = Platform.MapUtilities.getWithDefault(
      rendererProcessesByFrameId, frame.frame,
      () => new Map<
          Types.TraceEvents.ProcessID, {frame: Types.TraceEvents.TraceFrame, window: Types.Timing.TraceWindow}>());
  const rendererProcessInfo = Platform.MapUtilities.getWithDefault(rendererProcessInFrame, frame.processId, () => {
    return {
      frame,
      window: {
        min: Types.Timing.MicroSeconds(0),
        max: Types.Timing.MicroSeconds(0),
        range: Types.Timing.MicroSeconds(0),
      },
    };
  });

  // If this window was already created, do nothing.
  if (rendererProcessInfo.window.min !== Types.Timing.MicroSeconds(0)) {
    return;
  }

  // For now we store the time of the event as the min. In the finalize we step
  // through each of these windows and update their max and range values.
  rendererProcessInfo.window.min = event.ts;
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
    traceStartedTime = event.ts;

    if (!event.args.data) {
      throw new Error('No frames found in trace data');
    }

    for (const frame of event.args.data.frames) {
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
    return;
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Handler is not initialized');
  }

  traceBounds.min = traceStartedTime;
  traceBounds.range = Types.Timing.MicroSeconds(traceBounds.max - traceBounds.min);

  // If we go from foo.com to example.com we will get a new renderer, and
  // therefore the "top level renderer" will have a different PID as it has
  // changed. Here we step through each renderer process and updated its window
  // bounds, such that we end up with the time ranges in the trace for when
  // each particular renderer started and stopped being the main renderer
  // process.
  for (const [, processWindows] of rendererProcessesByFrameId) {
    const processWindowValues = [...processWindows.values()];
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
              rendererProcessesByFrame:
                  Map<string,
                      Map<Types.TraceEvents.ProcessID,
                          {frame: Types.TraceEvents.TraceFrame, window: Types.Timing.TraceWindow}>>,
              topLevelRendererIds: Set<Types.TraceEvents.ProcessID>,
};

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
  };
}
