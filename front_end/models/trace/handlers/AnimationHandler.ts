// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

const animations: Types.TraceEvents.TraceEventAnimation[] = [];
const animationsSyntheticEvents: Types.TraceEvents.TraceEventSyntheticNestableAsyncEvent[] = [];

export interface AnimationData {
  animations: readonly Types.TraceEvents.TraceEventSyntheticNestableAsyncEvent[];
}
let handlerState = HandlerState.UNINITIALIZED;

export function reset(): void {
  animations.length = 0;
  animationsSyntheticEvents.length = 0;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (Types.TraceEvents.isTraceEventAnimation(event)) {
    animations.push(event);
    return;
  }
}

export async function finalize(): Promise<void> {
  const matchedEvents = matchBeginningAndEndEvents();

  createSortedAnimationsSyntheticEvents(matchedEvents);

  handlerState = HandlerState.FINALIZED;
}

function matchBeginningAndEndEvents(): Map<string, {
  begin: Types.TraceEvents.TraceEventNestableAsyncBegin | null,
  end: Types.TraceEvents.TraceEventNestableAsyncEnd | null,
}> {
  // map to store begin and end of the event
  const matchedEvents: Map<string, {
    begin: Types.TraceEvents.TraceEventNestableAsyncBegin | null,
    end: Types.TraceEvents.TraceEventNestableAsyncEnd | null,
  }> = new Map();

  // looking for start and end
  for (const event of animations) {
    const id = event.id2;

    if (id === undefined) {
      continue;
    }

    const syntheticId = `${event.cat}:${id.local}:${event.name}`;

    const otherEventsWithID = Platform.MapUtilities.getWithDefault(matchedEvents, syntheticId, () => {
      return {begin: null, end: null};
    });

    const isStartEvent = event.ph === Types.TraceEvents.Phase.ASYNC_NESTABLE_START;
    const isEndEvent = event.ph === Types.TraceEvents.Phase.ASYNC_NESTABLE_END;

    if (isStartEvent) {
      otherEventsWithID.begin = {
        ...event,
        ph: Types.TraceEvents.Phase.ASYNC_NESTABLE_START,
        id2: {
          local: event.id2?.local,
        },
        id: event.args?.id,
      };
    } else if (isEndEvent) {
      otherEventsWithID.end = {
        ...event,
        ph: Types.TraceEvents.Phase.ASYNC_NESTABLE_END,
        id2: {
          local: event.id2?.local,
        },
        id: event.args?.id,
      };
    }
  }

  return matchedEvents;
}

function createSortedAnimationsSyntheticEvents(matchedEvents: Map<string, {
  begin: Types.TraceEvents.TraceEventNestableAsyncBegin | null,
  end: Types.TraceEvents.TraceEventNestableAsyncEnd | null,
}>): void {
  for (const [id, eventsPair] of matchedEvents.entries()) {
    if (!eventsPair.begin || !eventsPair.end) {
      continue;
    }

    const event: Types.TraceEvents.TraceEventSyntheticNestableAsyncEvent = {
      cat: eventsPair.end.cat,
      ph: eventsPair.end.ph,
      pid: eventsPair.end.pid,
      tid: eventsPair.end.tid,
      id,
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

    if (event.dur < 0) {
      // We have seen in the backend that sometimes animation events get
      // generated with multiple begin entries, or multiple end entries, and this
      // can cause invalid data on the performance panel, so we drop them.
      // crbug.com/1472375
      continue;
    }
    animationsSyntheticEvents.push(event);
  }

  animationsSyntheticEvents.sort((a, b) => a.ts - b.ts);
}

export function data(): AnimationData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Animation handler is not finalized');
  }

  return {
    animations: Array.from(animationsSyntheticEvents),
  };
}
