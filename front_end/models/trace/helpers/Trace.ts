// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as CPUProfile from '../../cpu_profile/cpu_profile.js';
import * as Types from '../types/types.js';

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

export type EventsInThread<T extends Types.TraceEvents.TraceEventData> = Map<Types.TraceEvents.ThreadID, T[]>;
// Each thread contains events. Events indicate the thread and process IDs, which are
// used to store the event in the correct process thread entry below.
export function addEventToProcessThread<T extends Types.TraceEvents.TraceEventData>(
    event: T,
    eventsInProcessThread: Map<Types.TraceEvents.ProcessID, EventsInThread<T>>,
    ): void {
  const {tid, pid} = event;
  let eventsInThread = eventsInProcessThread.get(pid);
  if (!eventsInThread) {
    eventsInThread = new Map<Types.TraceEvents.ThreadID, T[]>();
  }

  let events = eventsInThread.get(tid);
  if (!events) {
    events = [];
  }

  events.push(event);
  eventsInThread.set(event.tid, events);
  eventsInProcessThread.set(event.pid, eventsInThread);
}

type TimeSpan = {
  ts: Types.Timing.MicroSeconds,
  dur?: Types.Timing.MicroSeconds,
};
function eventTimeComparator(a: TimeSpan, b: TimeSpan): -1|0|1 {
  const aBeginTime = a.ts;
  const bBeginTime = b.ts;
  if (aBeginTime < bBeginTime) {
    return -1;
  }
  if (aBeginTime > bBeginTime) {
    return 1;
  }
  const aDuration = a.dur ?? 0;
  const bDuration = b.dur ?? 0;
  const aEndTime = aBeginTime + aDuration;
  const bEndTime = bBeginTime + bDuration;
  if (aEndTime > bEndTime) {
    return -1;
  }
  if (aEndTime < bEndTime) {
    return 1;
  }
  return 0;
}
/**
 * Sorts all the events in place, in order, by their start time. If they have
 * the same start time, orders them by longest first.
 */
export function sortTraceEventsInPlace(events: {ts: Types.Timing.MicroSeconds, dur?: Types.Timing.MicroSeconds}[]):
    void {
  events.sort(eventTimeComparator);
}

/**
 * Returns an array of ordered events that results after merging the two
 * ordered input arrays.
 */
export function
mergeEventsInOrder<T1 extends Types.TraceEvents.TraceEventData, T2 extends Types.TraceEvents.TraceEventData>(
    eventsArray1: T1[], eventsArray2: T2[]): (T1|T2)[] {
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

export function getNavigationForTraceEvent(
    event: Types.TraceEvents.TraceEventData,
    eventFrameId: string,
    navigationsByFrameId: Map<string, Types.TraceEvents.TraceEventNavigationStart[]>,
    ): Types.TraceEvents.TraceEventNavigationStart|null {
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

export function extractId(event: Types.TraceEvents.TraceEventNestableAsync): string|undefined {
  return event.id || event.id2?.global || event.id2?.local;
}

export function activeURLForFrameAtTime(
    frameId: string, time: Types.Timing.MicroSeconds,
    rendererProcessesByFrame: Map<
        string,
        Map<Types.TraceEvents.ProcessID, {frame: Types.TraceEvents.TraceFrame, window: Types.Timing.TraceWindow}[]>>):
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

export function makeProfileCall(
    node: CPUProfile.ProfileTreeModel.ProfileNode, ts: Types.Timing.MicroSeconds, pid: Types.TraceEvents.ProcessID,
    tid: Types.TraceEvents.ThreadID): Types.TraceEvents.TraceEventSyntheticProfileCall {
  return {
    cat: '',
    name: 'ProfileCall',
    nodeId: node.id,
    args: {},
    ph: Types.TraceEvents.Phase.COMPLETE,
    pid,
    tid,
    ts,
    dur: Types.Timing.MicroSeconds(0),
    selfTime: Types.Timing.MicroSeconds(0),
    callFrame: node.callFrame,
  };
}
