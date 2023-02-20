// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

/**
 * IMPORTANT!
 * See UserTimings.md in this directory for some handy documentation on
 * UserTimings and the trace events we parse currently.
 **/
const syntheticEvents: Types.TraceEvents.TraceEventSyntheticUserTiming[] = [];

const timingEvents: (Types.TraceEvents.TraceEventUserTimingBegin|Types.TraceEvents.TraceEventUserTimingEnd)[] = [];

interface UserTimingsData {
  timings: readonly Types.TraceEvents.TraceEventSyntheticUserTiming[];
}
let handlerState = HandlerState.UNINITIALIZED;

export function reset(): void {
  syntheticEvents.length = 0;
  timingEvents.length = 0;
  handlerState = HandlerState.INITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('UserTimings handler is not initialized');
  }

  if (Types.TraceEvents.isTraceEventUserTimingsBeginOrEnd(event)) {
    timingEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('UserTimings handler is not initialized');
  }

  const matchedEvents: Map<string, {
    begin: Types.TraceEvents.TraceEventUserTimingBegin | null,
    end: Types.TraceEvents.TraceEventUserTimingEnd | null,
  }> = new Map();
  for (const event of timingEvents) {
    const otherEventsWithID = Platform.MapUtilities.getWithDefault(matchedEvents, event.id, () => {
      return {begin: null, end: null};
    });
    const isStartEvent = event.ph === Types.TraceEvents.Phase.ASYNC_NESTABLE_START;
    const isEndEvent = event.ph === Types.TraceEvents.Phase.ASYNC_NESTABLE_END;

    if (isStartEvent) {
      otherEventsWithID.begin = event;
    } else if (isEndEvent) {
      otherEventsWithID.end = event;
    }
  }

  for (const [id, eventsPair] of matchedEvents.entries()) {
    if (!eventsPair.begin || !eventsPair.end) {
      // This should never happen, the backend only creates the events once it
      // has them both, so we should never get into this state.
      // If we do, something is very wrong, so let's just drop that problematic event.
      continue;
    }

    const event: Types.TraceEvents.TraceEventSyntheticUserTiming = {
      cat: eventsPair.end.cat,
      ph: eventsPair.end.ph,
      pid: eventsPair.end.pid,
      tid: eventsPair.end.tid,
      id,
      // Both events have the same name, so it doesn't matter which we pick to
      // use as the description
      name: eventsPair.begin.name,
      dur: Types.Timing.MicroSeconds(eventsPair.end.ts - eventsPair.begin.ts),
      ts: eventsPair.begin.ts,
      args: {
        data: {
          beginEvent: eventsPair.begin,
          endEvent: eventsPair.end,
        },
      },
    };
    syntheticEvents.push(event);
  }
  syntheticEvents.sort((event1, event2) => {
    if (event1.ts > event2.ts) {
      return 1;
    }
    if (event2.ts > event1.ts) {
      return -1;
    }
    return 0;
  });
  handlerState = HandlerState.FINALIZED;
}

export function data(): UserTimingsData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('UserTimings handler is not finalized');
  }

  return {
    timings: [...syntheticEvents],
  };
}
