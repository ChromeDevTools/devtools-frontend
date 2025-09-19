// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as CPUProfile from '../../cpu_profile/cpu_profile.js';
import * as Types from '../types/types.js';

import {SyntheticEventsManager} from './SyntheticEvents.js';
import {eventTimingsMicroSeconds} from './Timing.js';

interface MatchingPairableAsyncEvents {
  begin: Types.Events.PairableAsyncBegin|null;
  end: Types.Events.PairableAsyncEnd|null;
  instant?: Types.Events.PairableAsyncInstant[];
}

/**
 * Extracts the raw stack trace in known trace events. Most likely than
 * not you want to use `getZeroIndexedStackTraceForEvent`, which returns
 * the stack with zero based numbering. Since some trace events are
 * one based this function can yield unexpected results when used
 * indiscriminately.
 *
 * Note: this only returns the stack trace contained in the payload of
 * an event, which only contains the synchronous portion of the call
 * stack. If you want to obtain the whole stack trace you might need to
 * use the @see Trace.Extras.StackTraceForEvent util.
 */
export function stackTraceInEvent(event: Types.Events.Event): Types.Events.CallFrame[]|null {
  if (event.args?.data?.stackTrace) {
    return event.args.data.stackTrace;
  }
  if (event.args?.stackTrace) {
    return event.args.stackTrace;
  }
  if (Types.Events.isRecalcStyle(event)) {
    return event.args.beginData?.stackTrace || null;
  }
  if (Types.Events.isLayout(event)) {
    return event.args.beginData.stackTrace ?? null;
  }
  if (Types.Events.isFunctionCall(event)) {
    const data = event.args.data;
    if (!data) {
      return null;
    }
    const {columnNumber, lineNumber, url, scriptId, functionName} = data;
    if (lineNumber === undefined || functionName === undefined || columnNumber === undefined ||
        scriptId === undefined || url === undefined) {
      return null;
    }
    return [{columnNumber, lineNumber, url, scriptId, functionName}];
  }
  if (Types.Events.isProfileCall(event)) {
    // Of type Protocol.Runtime.CallFrame, handle accordingly.
    const callFrame = event.callFrame;
    if (!callFrame) {
      return null;
    }
    const {columnNumber, lineNumber, url, scriptId, functionName} = callFrame;
    if (lineNumber === undefined || functionName === undefined || columnNumber === undefined ||
        scriptId === undefined || url === undefined) {
      return null;
    }
    return [{columnNumber, lineNumber, url, scriptId, functionName}];
  }
  return null;
}

export function extractOriginFromTrace(firstNavigationURL: string): string|null {
  const url = Common.ParsedURL.ParsedURL.fromString(firstNavigationURL);
  if (url) {
    // We do this to save some space in the toolbar - seeing the `www` is less
    // useful than seeing `foo.com` if it's truncated at narrow widths
    if (url.host.startsWith('www.')) {
      return url.host.slice(4);
    }
    return url.host;
  }
  return null;
}

export type EventsInThread<T extends Types.Events.Event> = Map<Types.Events.ThreadID, T[]>;
// Each thread contains events. Events indicate the thread and process IDs, which are
// used to store the event in the correct process thread entry below.
export function addEventToProcessThread<T extends Types.Events.Event>(
    event: T,
    eventsInProcessThread: Map<Types.Events.ProcessID, EventsInThread<T>>,
    ): void {
  const {tid, pid} = event;
  let eventsInThread = eventsInProcessThread.get(pid);
  if (!eventsInThread) {
    eventsInThread = new Map<Types.Events.ThreadID, T[]>();
  }

  let events = eventsInThread.get(tid);
  if (!events) {
    events = [];
  }

  events.push(event);
  eventsInThread.set(event.tid, events);
  eventsInProcessThread.set(event.pid, eventsInThread);
}

export function compareBeginAndEnd(aBeginTime: number, bBeginTime: number, aEndTime: number, bEndTime: number): -1|0|1 {
  if (aBeginTime < bBeginTime) {
    return -1;
  }
  if (aBeginTime > bBeginTime) {
    return 1;
  }

  if (aEndTime > bEndTime) {
    return -1;
  }
  if (aEndTime < bEndTime) {
    return 1;
  }

  return 0;
}

export function eventTimeComparator(a: Types.Events.Event, b: Types.Events.Event): -1|0|1 {
  const aBeginTime = a.ts;
  const bBeginTime = b.ts;
  const aDuration = a.dur ?? 0;
  const bDuration = b.dur ?? 0;
  const aEndTime = aBeginTime + aDuration;
  const bEndTime = bBeginTime + bDuration;
  const timeDifference = compareBeginAndEnd(aBeginTime, bBeginTime, aEndTime, bEndTime);
  if (timeDifference) {
    return timeDifference;
  }

  // If times are equal, prioritize profile calls over trace events,
  // since an exactly equal timestamp with a trace event is likely
  // indicates that the SamplesIntegrator meant to parent the trace
  // event with the profile call.
  if (Types.Events.isProfileCall(a) && !Types.Events.isProfileCall(b)) {
    return -1;
  }
  if (Types.Events.isProfileCall(b) && !Types.Events.isProfileCall(a)) {
    return 1;
  }
  return 0;
}
/**
 * Sorts all the events in place, in order, by their start time. If they have
 * the same start time, orders them by longest first.
 */
export function sortTraceEventsInPlace(events: Types.Events.Event[]): void {
  events.sort(eventTimeComparator);
}

/**
 * Returns an array of ordered events that results after merging the two
 * ordered input arrays.
 */
export function mergeEventsInOrder<T1 extends Types.Events.Event, T2 extends Types.Events.Event>(
    eventsArray1: readonly T1[], eventsArray2: readonly T2[]): Array<T1|T2> {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < eventsArray1.length && j < eventsArray2.length) {
    const event1 = eventsArray1[i];
    const event2 = eventsArray2[j];
    const compareValue = eventTimeComparator(event1, event2);
    if (compareValue <= 0) {
      result.push(event1);
      i++;
    }
    if (compareValue === 1) {
      result.push(event2);
      j++;
    }
  }
  while (i < eventsArray1.length) {
    result.push(eventsArray1[i++]);
  }
  while (j < eventsArray2.length) {
    result.push(eventsArray2[j++]);
  }
  return result;
}

export function parseDevtoolsDetails(timingDetail: string, key: string): Types.Extensions.DevToolsObj|
    Types.Extensions.ExtensionTrackEntryPayloadDeeplink|null {
  try {
    // Attempt to parse the detail as an object that might be coming from a
    // DevTools Perf extension.
    // Wrapped in a try-catch because timingDetail might either:
    // 1. Not be `json.parse`-able (it should, but just in case...)
    // 2. Not be an object - in which case the `in` check will error.
    // If we hit either of these cases, we just ignore this mark and move on.
    const detailObj = JSON.parse(timingDetail);
    if (!(key in detailObj)) {
      return null;
    }
    if (!Types.Extensions.isValidExtensionPayload(detailObj[key])) {
      return null;
    }
    return detailObj[key];
  } catch {
    // No need to worry about this error, just discard this event and don't
    // treat it as having any useful information for the purposes of extensions.
    return null;
  }
}

export function getNavigationForTraceEvent(
    event: Types.Events.Event,
    eventFrameId: string,
    navigationsByFrameId: Map<string, Types.Events.NavigationStart[]>,
    ): Types.Events.NavigationStart|null {
  const navigations = navigationsByFrameId.get(eventFrameId);
  if (!navigations || eventFrameId === '') {
    // This event's navigation has been filtered out by the meta handler as a noise event
    // or contains an empty frameId.
    return null;
  }

  const eventNavigationIndex =
      Platform.ArrayUtilities.nearestIndexFromEnd(navigations, navigation => navigation.ts <= event.ts);

  if (eventNavigationIndex === null) {
    // This event's navigation has been filtered out by the meta handler as a noise event.
    return null;
  }
  return navigations[eventNavigationIndex];
}

export function extractId(
    event: Types.Events.PairableAsync|Types.Events.SyntheticEventPair<Types.Events.PairableAsync>): string|undefined {
  return event.id ?? event.id2?.global ?? event.id2?.local;
}

export function activeURLForFrameAtTime(
    frameId: string, time: Types.Timing.Micro,
    rendererProcessesByFrame: Map<
        string,
        Map<Types.Events.ProcessID, Array<{frame: Types.Events.TraceFrame, window: Types.Timing.TraceWindowMicro}>>>):
    string|null {
  const processData = rendererProcessesByFrame.get(frameId);
  if (!processData) {
    return null;
  }
  for (const processes of processData.values()) {
    for (const processInfo of processes) {
      if (processInfo.window.min > time || processInfo.window.max < time) {
        continue;
      }
      return processInfo.frame.url;
    }
  }
  return null;
}

/**
 * @param node the node attached to the profile call. Here a node represents a function in the call tree.
 * @param profileId the profile ID that the sample came from that backs this call.
 * @param sampleIndex the index of the sample in the given profile that this call was created from
 * @param ts the timestamp of the profile call
 * @param pid the process ID of the profile call
 * @param tid the thread ID of the profile call
 *
 * See `panels/timeline/docs/profile_calls.md` for more context on how these events are created.
 */
export function makeProfileCall(
    node: CPUProfile.ProfileTreeModel.ProfileNode, profileId: Types.Events.ProfileID, sampleIndex: number,
    ts: Types.Timing.Micro, pid: Types.Events.ProcessID,
    tid: Types.Events.ThreadID): Types.Events.SyntheticProfileCall {
  return {
    cat: '',
    name: 'ProfileCall',
    nodeId: node.id,
    args: {},
    ph: Types.Events.Phase.COMPLETE,
    pid,
    tid,
    ts,
    dur: Types.Timing.Micro(0),
    callFrame: node.callFrame,
    sampleIndex,
    profileId,
  };
}

/**
 * Matches beginning events with PairableAsyncEnd and PairableAsyncInstant (ASYNC_NESTABLE_INSTANT)
 * if provided, though currently only coming from Animations. Traces may contain multiple instant events so we need to
 * account for that.
 *
 * @returns Map of the animation's ID to it's matching events.
 */
export function matchEvents(unpairedEvents: Types.Events.PairableAsync[]): Map<string, MatchingPairableAsyncEvents> {
  // map to store begin and end of the event
  const matchedPairs = new Map<string, MatchingPairableAsyncEvents>();

  // looking for start and end
  for (const event of unpairedEvents) {
    const syntheticId = getSyntheticId(event);
    if (syntheticId === undefined) {
      continue;
    }
    // Create a synthetic id to prevent collisions across categories.
    // Console timings can be dispatched with the same id, so use the
    // event name as well to generate unique ids.
    const otherEventsWithID = Platform.MapUtilities.getWithDefault(matchedPairs, syntheticId, () => {
      return {begin: null, end: null, instant: []};
    });

    const isStartEvent = event.ph === Types.Events.Phase.ASYNC_NESTABLE_START;
    const isEndEvent = event.ph === Types.Events.Phase.ASYNC_NESTABLE_END;
    const isInstantEvent = event.ph === Types.Events.Phase.ASYNC_NESTABLE_INSTANT;

    if (isStartEvent) {
      otherEventsWithID.begin = event as Types.Events.PairableAsyncBegin;
    } else if (isEndEvent) {
      otherEventsWithID.end = event as Types.Events.PairableAsyncEnd;
    } else if (isInstantEvent) {
      if (!otherEventsWithID.instant) {
        otherEventsWithID.instant = [];
      }
      otherEventsWithID.instant.push(event as Types.Events.PairableAsyncInstant);
    }
  }
  return matchedPairs;
}

export function getSyntheticId(event: Types.Events.PairableAsync): string|undefined {
  const id = extractId(event);
  return id && `${event.cat}:${id}:${event.name}`;
}

export function createSortedSyntheticEvents<T extends Types.Events.PairableAsync>(
    matchedPairs: Map<string, {
      begin: Types.Events.PairableAsyncBegin | null,
      end: Types.Events.PairableAsyncEnd | null,
      instant?: Types.Events.PairableAsyncInstant[],
    }>,
    syntheticEventCallback?: (syntheticEvent: Types.Events.SyntheticEventPair<T>) => void,
    ): Array<Types.Events.SyntheticEventPair<T>> {
  const syntheticEvents: Array<Types.Events.SyntheticEventPair<T>> = [];
  for (const [id, eventsTriplet] of matchedPairs.entries()) {
    const beginEvent = eventsTriplet.begin;
    const endEvent = eventsTriplet.end;
    const instantEvents = eventsTriplet.instant;
    if (!beginEvent || !(endEvent || instantEvents)) {
      // This should never happen, the backend only creates the events once it
      // has them both (beginEvent & endEvent/instantEvents), so we should never get into this state.
      // If we do, something is very wrong, so let's just drop that problematic event.
      continue;
    }
    const triplet = {beginEvent, endEvent, instantEvents};
    /**
     * When trying to pair events with instant events present, there are times when these
     * ASYNC_NESTABLE_INSTANT ('n') don't have a corresponding ASYNC_NESTABLE_END ('e') event.
     * In these cases, pair without needing the endEvent.
     */
    function eventsArePairable(data: {
      beginEvent: Types.Events.PairableAsyncBegin,
      endEvent: Types.Events.PairableAsyncEnd|null,
      instantEvents?: Types.Events.PairableAsyncInstant[],
    }): data is Types.Events.SyntheticEventPair<T>['args']['data'] {
      const instantEventsMatch = data.instantEvents ? data.instantEvents.some(e => id === getSyntheticId(e)) : false;
      const endEventMatch = data.endEvent ? id === getSyntheticId(data.endEvent) : false;
      return Boolean(id) && (instantEventsMatch || endEventMatch);
    }
    if (!eventsArePairable(triplet)) {
      continue;
    }
    const targetEvent = endEvent || beginEvent;

    const event = SyntheticEventsManager.registerSyntheticEvent<Types.Events.SyntheticEventPair<T>>({
      rawSourceEvent: triplet.beginEvent,
      cat: targetEvent.cat,
      ph: targetEvent.ph,
      pid: targetEvent.pid,
      tid: targetEvent.tid,
      id,
      // Both events have the same name, so it doesn't matter which we pick to
      // use as the description
      name: beginEvent.name,
      dur: Types.Timing.Micro(targetEvent.ts - beginEvent.ts),
      ts: beginEvent.ts,
      args: {
        data: triplet,
      },
    });

    if (event.dur < 0) {
      // We have seen in the backend that sometimes animation events get
      // generated with multiple begin entries, or multiple end entries, and this
      // can cause invalid data on the performance panel, so we drop them.
      // crbug.com/1472375
      continue;
    }
    syntheticEventCallback?.(event);
    syntheticEvents.push(event);
  }
  return syntheticEvents.sort((a, b) => a.ts - b.ts);
}

export function createMatchedSortedSyntheticEvents<T extends Types.Events.PairableAsync>(
    unpairedAsyncEvents: T[], syntheticEventCallback?: (syntheticEvent: Types.Events.SyntheticEventPair<T>) => void):
    Array<Types.Events.SyntheticEventPair<T>> {
  const matchedPairs = matchEvents(unpairedAsyncEvents);
  const syntheticEvents = createSortedSyntheticEvents<T>(matchedPairs, syntheticEventCallback);
  return syntheticEvents;
}

/**
 * Different trace events return line/column numbers that are 1 or 0 indexed.
 * This function knows which events return 1 indexed numbers and normalizes
 * them. The UI expects 0 indexed line numbers, so that is what we return.
 */
export function getZeroIndexedLineAndColumnForEvent(event: Types.Events.Event): {
  lineNumber?: number,
  columnNumber?: number,
} {
  // Some events emit line numbers that are 1 indexed, but the UI layer expects
  // numbers to be 0 indexed. So here, if the event matches a known 1-indexed
  // number event, we subtract one from the line and column numbers.
  // Otherwise, if the event has args.data.lineNumber/colNumber, we return it
  // as is.
  const numbers = getRawLineAndColumnNumbersForEvent(event);
  const {lineNumber, columnNumber} = numbers;

  switch (event.name) {
    // All these events have line/column numbers which are 1 indexed; so we
    // subtract to make them 0 indexed.
    case Types.Events.Name.FUNCTION_CALL:
    case Types.Events.Name.EVALUATE_SCRIPT:
    case Types.Events.Name.COMPILE:
    case Types.Events.Name.CACHE_SCRIPT: {
      return {
        lineNumber: typeof lineNumber === 'number' ? lineNumber - 1 : undefined,
        columnNumber: typeof columnNumber === 'number' ? columnNumber - 1 : undefined,
      };
    }
    case Types.Events.Name.PROFILE_CALL: {
      const callFrame = (event as Types.Events.SyntheticProfileCall).callFrame;
      return {
        lineNumber: typeof lineNumber === 'number' ? callFrame.lineNumber - 1 : undefined,
        columnNumber: typeof columnNumber === 'number' ? callFrame.columnNumber - 1 : undefined,
      };
    }
    default: {
      return numbers;
    }
  }
}

/**
 * Different trace events contain stack traces with line/column numbers
 * that are 1 or 0 indexed.
 * This function knows which events return 1 indexed numbers and normalizes
 * them. The UI expects 0 indexed line numbers, so that is what we return.
 *
 * Note: this only returns the stack trace contained in the payload of
 * an event, which only contains the synchronous portion of the call
 * stack. If you want to obtain the whole stack trace you might need to
 * use the @see Trace.Extras.StackTraceForEvent util.
 */
export function getZeroIndexedStackTraceInEventPayload(event: Types.Events.Event): Types.Events.CallFrame[]|null {
  const stack = stackTraceInEvent(event);
  if (!stack) {
    return null;
  }

  switch (event.name) {
    case Types.Events.Name.SCHEDULE_STYLE_RECALCULATION:
    case Types.Events.Name.INVALIDATE_LAYOUT:
    case Types.Events.Name.FUNCTION_CALL:
    case Types.Events.Name.LAYOUT:
    case Types.Events.Name.RECALC_STYLE: {
      return stack.map(makeZeroBasedCallFrame);
    }

    default: {
      if (Types.Events.isUserTiming(event) || Types.Extensions.isSyntheticExtensionEntry(event)) {
        return stack.map(makeZeroBasedCallFrame);
      }

      return stack;
    }
  }
}

/**
 * Same as getZeroIndexedStackTraceInEventPayload, but only returns the top call frame.
 */
export function getStackTraceTopCallFrameInEventPayload(event: Types.Events.Event): Types.Events.CallFrame|null {
  const stack = stackTraceInEvent(event);
  if (!stack || stack.length === 0) {
    return null;
  }

  switch (event.name) {
    case Types.Events.Name.SCHEDULE_STYLE_RECALCULATION:
    case Types.Events.Name.INVALIDATE_LAYOUT:
    case Types.Events.Name.FUNCTION_CALL:
    case Types.Events.Name.LAYOUT:
    case Types.Events.Name.RECALC_STYLE: {
      return makeZeroBasedCallFrame(stack[0]);
    }

    default: {
      if (Types.Events.isUserTiming(event) || Types.Extensions.isSyntheticExtensionEntry(event)) {
        return makeZeroBasedCallFrame(stack[0]);
      }

      return stack[0];
    }
  }
}

/**
 * Given a 1-based call frame creates a 0-based one.
 */
export function makeZeroBasedCallFrame(callFrame: Types.Events.CallFrame): Types.Events.CallFrame {
  const normalizedCallFrame = {...callFrame};

  normalizedCallFrame.lineNumber = callFrame.lineNumber && callFrame.lineNumber - 1;
  normalizedCallFrame.columnNumber = callFrame.columnNumber && callFrame.columnNumber - 1;
  return normalizedCallFrame;
}

/**
 * NOTE: you probably do not want this function! (Which is why it is not exported).
 *
 * Some trace events have 0 indexed line/column numbers, and others have 1
 * indexed. This function does NOT normalize them, but
 * `getZeroIndexedLineAndColumnNumbersForEvent` does. It is best to use that!
 *
 * @see {@link getZeroIndexedLineAndColumnForEvent}
 **/
function getRawLineAndColumnNumbersForEvent(event: Types.Events.Event): {
  lineNumber?: number,
  columnNumber?: number,
} {
  if (!event.args?.data) {
    return {
      lineNumber: undefined,
      columnNumber: undefined,
    };
  }
  let lineNumber: number|undefined = undefined;
  let columnNumber: number|undefined = undefined;
  if ('lineNumber' in event.args.data && typeof event.args.data.lineNumber === 'number') {
    lineNumber = event.args.data.lineNumber;
  }
  if ('columnNumber' in event.args.data && typeof event.args.data.columnNumber === 'number') {
    columnNumber = event.args.data.columnNumber;
  }

  return {lineNumber, columnNumber};
}

export function frameIDForEvent(event: Types.Events.Event): string|null {
  // There are a few events (for example RecalcStyle, ParseHTML) that have
  // the frame stored in args.beginData
  // Rather than list them all we just check for the presence of the field, so
  // we are robust against future trace events also doing this.
  // This check seems very robust, but it also helps satisfy TypeScript and
  // prevents us against unexpected data.
  if (event.args && 'beginData' in event.args && typeof event.args.beginData === 'object' &&
      event.args.beginData !== null && 'frame' in event.args.beginData &&
      typeof event.args.beginData.frame === 'string') {
    return event.args.beginData.frame;
  }
  // Otherwise, we expect frame to be in args.data
  if (event.args?.data?.frame) {
    return event.args.data.frame;
  }

  // No known frame for this event.
  return null;
}

const DevToolsTimelineEventCategory = 'disabled-by-default-devtools.timeline';
export function isTopLevelEvent(event: Types.Events.Event): boolean {
  return event.cat.includes(DevToolsTimelineEventCategory) && event.name === Types.Events.Name.RUN_TASK;
}

export function isExtensionUrl(url: string): boolean {
  return url.startsWith('extensions:') || url.startsWith('chrome-extension:');
}

function topLevelEventIndexEndingAfter(events: Types.Events.Event[], time: Types.Timing.Micro): number {
  let index = Platform.ArrayUtilities.upperBound(events, time, (time, event) => time - event.ts) - 1;
  while (index > 0 && !isTopLevelEvent(events[index])) {
    index--;
  }
  return Math.max(index, 0);
}
export function findRecalcStyleEvents(
    events: Types.Events.Event[], startTime: Types.Timing.Micro,
    endTime?: Types.Timing.Micro): Types.Events.RecalcStyle[] {
  const foundEvents: Types.Events.RecalcStyle[] = [];
  const startEventIndex = topLevelEventIndexEndingAfter(events, startTime);
  for (let i = startEventIndex; i < events.length; i++) {
    const event = events[i];
    if (!Types.Events.isRecalcStyle(event)) {
      continue;
    }
    if (event.ts >= (endTime || Infinity)) {
      continue;
    }
    foundEvents.push(event);
  }
  return foundEvents;
}

export function findNextEventAfterTimestamp<T extends Types.Events.Event>(candidates: T[], ts: Types.Timing.Micro): T|
    null {
  const index = Platform.ArrayUtilities.nearestIndexFromBeginning(candidates, candidate => ts < candidate.ts);
  return index === null ? null : candidates[index];
}

export function findPreviousEventBeforeTimestamp<T extends Types.Events.Event>(
    candidates: T[], ts: Types.Timing.Micro): T|null {
  const index = Platform.ArrayUtilities.nearestIndexFromEnd(candidates, candidate => candidate.ts < ts);
  return index === null ? null : candidates[index];
}

export interface ForEachEventConfig {
  onStartEvent: (event: Types.Events.Event) => void;
  onEndEvent: (event: Types.Events.Event) => void;
  onInstantEvent?: (event: Types.Events.Event) => void;
  eventFilter?: (event: Types.Events.Event) => boolean;
  startTime?: Types.Timing.Micro;
  endTime?: Types.Timing.Micro;
  /* If async events should be skipped. Defaults to true */
  ignoreAsyncEvents?: boolean;
}

/**
 * Iterates events in a tree hierarchically, from top to bottom,
 * calling back on every event's start and end in the order
 * dictated by the corresponding timestamp.
 *
 * Events are assumed to be in ascendent order by timestamp.
 *
 * Events with 0 duration are treated as instant events. These do not have a
 * begin and end, but will be passed to the config.onInstantEvent callback as
 * they are discovered. Do not provide this callback if you are not interested
 * in them.
 *
 * For example, given this tree, the following callbacks
 * are expected to be made in the following order
 * |---------------A---------------|
 *  |------B------||-------D------|
 *    |---C---|
 *
 * 1. Start A
 * 3. Start B
 * 4. Start C
 * 5. End C
 * 6. End B
 * 7. Start D
 * 8. End D
 * 9. End A
 *
 * By default, async events are skipped. This behaviour can be
 * overridden making use of the config.ignoreAsyncEvents parameter.
 */
export function forEachEvent(
    events: Types.Events.Event[],
    config: ForEachEventConfig,
    ): void {
  const globalStartTime = config.startTime ?? Types.Timing.Micro(0);
  const globalEndTime = config.endTime || Types.Timing.Micro(Infinity);
  const ignoreAsyncEvents = config.ignoreAsyncEvents === false ? false : true;

  const stack: Types.Events.Event[] = [];
  const startEventIndex = topLevelEventIndexEndingAfter(events, globalStartTime);
  for (let i = startEventIndex; i < events.length; i++) {
    const currentEvent = events[i];
    const currentEventTimings = eventTimingsMicroSeconds(currentEvent);
    if (currentEventTimings.endTime < globalStartTime) {
      continue;
    }
    if (currentEventTimings.startTime > globalEndTime) {
      break;
    }

    const isIgnoredAsyncEvent = ignoreAsyncEvents && Types.Events.isPhaseAsync(currentEvent.ph);
    if (isIgnoredAsyncEvent || Types.Events.isFlowPhase(currentEvent.ph)) {
      continue;
    }

    // If we have now reached an event that is after a bunch of events, we need
    // to call the onEndEvent callback for those events before moving on.
    let lastEventOnStack = stack.at(-1);
    let lastEventEndTime = lastEventOnStack ? eventTimingsMicroSeconds(lastEventOnStack).endTime : null;
    while (lastEventOnStack && lastEventEndTime && lastEventEndTime <= currentEventTimings.startTime) {
      stack.pop();
      config.onEndEvent(lastEventOnStack);
      lastEventOnStack = stack.at(-1);
      lastEventEndTime = lastEventOnStack ? eventTimingsMicroSeconds(lastEventOnStack).endTime : null;
    }

    // Now we have dealt with all events prior to this one, see if we need to care about this one.
    if (config.eventFilter && !config.eventFilter(currentEvent)) {
      // The user has chosen to filter this event out, so continue on and do nothing
      continue;
    }

    if (currentEventTimings.duration) {
      config.onStartEvent(currentEvent);
      stack.push(currentEvent);
    } else if (config.onInstantEvent) {
      // An event with 0 duration is an instant event.
      config.onInstantEvent(currentEvent);
    }
  }

  // Now we have finished looping over all events; any events remaining on the
  // stack need to have their onEndEvent called.
  while (stack.length) {
    const last = stack.pop();
    if (last) {
      config.onEndEvent(last);
    }
  }
}

// Parsed categories are cached to prevent calling cat.split()
// multiple times on the same categories string.
const parsedCategories = new Map<string, Set<string>>();
export function eventHasCategory(event: Types.Events.Event, category: string): boolean {
  let parsedCategoriesForEvent = parsedCategories.get(event.cat);
  if (!parsedCategoriesForEvent) {
    parsedCategoriesForEvent = new Set(event.cat.split(',') || []);
  }
  return parsedCategoriesForEvent.has(category);
}

/**
 * This compares Types.Events.CallFrame with Protocol.Runtime.CallFrame and checks for equality.
 */
export function isMatchingCallFrame(
    eventFrame: Types.Events.CallFrame, nodeFrame: Protocol.Runtime.CallFrame): boolean {
  return eventFrame.columnNumber === nodeFrame.columnNumber && eventFrame.lineNumber === nodeFrame.lineNumber &&
      String(eventFrame.scriptId) === nodeFrame.scriptId && eventFrame.url === nodeFrame.url &&
      eventFrame.functionName === nodeFrame.functionName;
}

export function eventContainsTimestamp(event: Types.Events.Event, ts: Types.Timing.Micro): boolean {
  return event.ts <= ts && event.ts + (event.dur || 0) >= ts;
}

export function extractSampleTraceId(event: Types.Events.Event): number|null {
  if (!event.args) {
    return null;
  }
  if ('beginData' in event.args) {
    const beginData = event.args['beginData'] as {sampleTraceId?: number};
    return beginData.sampleTraceId ?? null;
  }
  return event.args?.sampleTraceId ?? event.args?.data?.sampleTraceId ?? null;
}

// This exactly matches Trace.Styles.visibleTypes. See the runtime verification in maybeInitStylesMap.
// TODO(crbug.com/410884528)
export const VISIBLE_TRACE_EVENT_TYPES = new Set<Types.Events.Name>([
  Types.Events.Name.ABORT_POST_TASK_CALLBACK,
  Types.Events.Name.ANIMATION,
  Types.Events.Name.ASYNC_TASK,
  Types.Events.Name.BACKGROUND_DESERIALIZE,
  Types.Events.Name.CACHE_MODULE,
  Types.Events.Name.CACHE_SCRIPT,
  Types.Events.Name.CANCEL_ANIMATION_FRAME,
  Types.Events.Name.CANCEL_IDLE_CALLBACK,
  Types.Events.Name.COMMIT,
  Types.Events.Name.COMPILE_CODE,
  Types.Events.Name.COMPILE_MODULE,
  Types.Events.Name.COMPILE,
  Types.Events.Name.COMPOSITE_LAYERS,
  Types.Events.Name.COMPUTE_INTERSECTION,
  Types.Events.Name.CONSOLE_TIME,
  Types.Events.Name.CPPGC_SWEEP,
  Types.Events.Name.CRYPTO_DO_DECRYPT_REPLY,
  Types.Events.Name.CRYPTO_DO_DECRYPT,
  Types.Events.Name.CRYPTO_DO_DIGEST_REPLY,
  Types.Events.Name.CRYPTO_DO_DIGEST,
  Types.Events.Name.CRYPTO_DO_ENCRYPT_REPLY,
  Types.Events.Name.CRYPTO_DO_ENCRYPT,
  Types.Events.Name.CRYPTO_DO_SIGN_REPLY,
  Types.Events.Name.CRYPTO_DO_SIGN,
  Types.Events.Name.CRYPTO_DO_VERIFY_REPLY,
  Types.Events.Name.CRYPTO_DO_VERIFY,
  Types.Events.Name.DECODE_IMAGE,
  Types.Events.Name.EMBEDDER_CALLBACK,
  Types.Events.Name.EVALUATE_MODULE,
  Types.Events.Name.EVALUATE_SCRIPT,
  Types.Events.Name.EVENT_DISPATCH,
  Types.Events.Name.EVENT_TIMING,
  Types.Events.Name.FINALIZE_DESERIALIZATION,
  Types.Events.Name.FIRE_ANIMATION_FRAME,
  Types.Events.Name.FIRE_IDLE_CALLBACK,
  Types.Events.Name.FUNCTION_CALL,
  Types.Events.Name.GC_COLLECT_GARBARGE,
  Types.Events.Name.GC,
  Types.Events.Name.GPU_TASK,
  Types.Events.Name.HANDLE_POST_MESSAGE,
  Types.Events.Name.HIT_TEST,
  Types.Events.Name.JS_SAMPLE,
  Types.Events.Name.LAYERIZE,
  Types.Events.Name.LAYOUT,
  Types.Events.Name.MAJOR_GC,
  Types.Events.Name.MINOR_GC,
  Types.Events.Name.OPTIMIZE_CODE,
  Types.Events.Name.PAINT_SETUP,
  Types.Events.Name.PAINT,
  Types.Events.Name.PARSE_AUTHOR_STYLE_SHEET,
  Types.Events.Name.PARSE_HTML,
  Types.Events.Name.PRE_PAINT,
  Types.Events.Name.PROFILE_CALL,
  Types.Events.Name.PROGRAM,
  Types.Events.Name.RASTER_TASK,
  Types.Events.Name.REQUEST_ANIMATION_FRAME,
  Types.Events.Name.REQUEST_IDLE_CALLBACK,
  Types.Events.Name.RESOURCE_FINISH,
  Types.Events.Name.RESOURCE_RECEIVE_DATA,
  Types.Events.Name.RESOURCE_RECEIVE_RESPONSE,
  Types.Events.Name.RESOURCE_SEND_REQUEST,
  Types.Events.Name.RESOURCE_WILL_SEND_REQUEST,
  Types.Events.Name.RUN_MICROTASKS,
  Types.Events.Name.RUN_POST_TASK_CALLBACK,
  Types.Events.Name.RUN_TASK,
  Types.Events.Name.SCHEDULE_POST_MESSAGE,
  Types.Events.Name.SCHEDULE_POST_TASK_CALLBACK,
  Types.Events.Name.SCHEDULE_STYLE_RECALCULATION,
  Types.Events.Name.SCROLL_LAYER,
  Types.Events.Name.START_PROFILING,
  Types.Events.Name.STREAMING_COMPILE_SCRIPT_PARSING,
  Types.Events.Name.STREAMING_COMPILE_SCRIPT_WAITING,
  Types.Events.Name.STREAMING_COMPILE_SCRIPT,
  Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT_CLUSTER,
  Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT,
  Types.Events.Name.TIME_STAMP,
  Types.Events.Name.TIMER_FIRE,
  Types.Events.Name.TIMER_INSTALL,
  Types.Events.Name.TIMER_REMOVE,
  Types.Events.Name.UPDATE_LAYER_TREE,
  Types.Events.Name.RECALC_STYLE,
  Types.Events.Name.USER_TIMING,
  Types.Events.Name.V8_CONSOLE_RUN_TASK,
  Types.Events.Name.WASM_CACHED_MODULE,
  Types.Events.Name.WASM_COMPILED_MODULE,
  Types.Events.Name.WASM_MODULE_CACHE_HIT,
  Types.Events.Name.WASM_MODULE_CACHE_INVALID,
  Types.Events.Name.WASM_STREAM_FROM_RESPONSE_CALLBACK,
  Types.Events.Name.WEB_SOCKET_CREATE,
  Types.Events.Name.WEB_SOCKET_DESTROY,
  Types.Events.Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST,
  Types.Events.Name.WEB_SOCKET_RECEIVE,
  Types.Events.Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST,
  Types.Events.Name.WEB_SOCKET_SEND,
  Types.Events.Name.XHR_LOAD,
  Types.Events.Name.XHR_READY_STATE_CHANGED,
]);
