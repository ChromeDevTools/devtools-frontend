// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Types from '../types/types.js';
import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';

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
/**
 * Sorts all the events in place, in order, by their start time. If they have
 * the same start time, orders them by longest first.
 */
export function sortTraceEventsInPlace(events: Types.TraceEvents.TraceEventData[]): void {
  events.sort((a, b) => {
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
  });
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
