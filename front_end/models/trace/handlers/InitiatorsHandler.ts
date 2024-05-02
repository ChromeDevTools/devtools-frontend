// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

let handlerState = HandlerState.UNINITIALIZED;

const lastScheduleStyleRecalcByFrame = new Map<string, Types.TraceEvents.TraceEventScheduleStyleRecalculation>();

// This tracks the last event that is considered to have invalidated the layout
// for a given frame.
// Note that although there is an InvalidateLayout event, there are also other
// events (ScheduleStyleRecalculation) that could be the reason a layout was
// invalidated.
const lastInvalidationEventForFrame = new Map<string, Types.TraceEvents.TraceEventData>();

// Important: although the event is called UpdateLayoutTree, in the UI we
// present these to the user as "Recalculate Style". So don't get confused!
// These are the same - just UpdateLayoutTree is what the event from Chromium
// is called.
const lastUpdateLayoutTreeByFrame = new Map<string, Types.TraceEvents.TraceEventUpdateLayoutTree>();

// These two maps store the same data but in different directions.
//
// For a given event, tell me what its initiator was. An event can only have one initiator.
const eventToInitiatorMap = new Map<Types.TraceEvents.TraceEventData, Types.TraceEvents.TraceEventData>();
// For a given event, tell me what events it initiated. An event can initiate
// multiple events, hence why the value for this map is an array.
const initiatorToEventsMap = new Map<Types.TraceEvents.TraceEventData, Types.TraceEvents.TraceEventData[]>();

const requestAnimationFrameEventsById: Map<number, Types.TraceEvents.TraceEventRequestAnimationFrame> = new Map();
const timerInstallEventsById: Map<number, Types.TraceEvents.TraceEventTimerInstall> = new Map();
const requestIdleCallbackEventsById: Map<number, Types.TraceEvents.TraceEventRequestIdleCallback> = new Map();
const webSocketCreateEventsById: Map<number, Types.TraceEvents.TraceEventWebSocketCreate> = new Map();

export function reset(): void {
  lastScheduleStyleRecalcByFrame.clear();
  lastInvalidationEventForFrame.clear();
  lastUpdateLayoutTreeByFrame.clear();
  timerInstallEventsById.clear();
  eventToInitiatorMap.clear();
  initiatorToEventsMap.clear();
  requestAnimationFrameEventsById.clear();
  requestIdleCallbackEventsById.clear();
  webSocketCreateEventsById.clear();

  handlerState = HandlerState.UNINITIALIZED;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('InitiatorsHandler was not reset before being initialized');
  }

  handlerState = HandlerState.INITIALIZED;
}

function storeInitiator(data: {initiator: Types.TraceEvents.TraceEventData, event: Types.TraceEvents.TraceEventData}):
    void {
  eventToInitiatorMap.set(data.event, data.initiator);
  const eventsForInitiator = initiatorToEventsMap.get(data.initiator) || [];
  eventsForInitiator.push(data.event);
  initiatorToEventsMap.set(data.initiator, eventsForInitiator);
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (Types.TraceEvents.isTraceEventScheduleStyleRecalculation(event)) {
    lastScheduleStyleRecalcByFrame.set(event.args.data.frame, event);
  } else if (Types.TraceEvents.isTraceEventUpdateLayoutTree(event)) {
    // IMPORTANT: although the trace event is called UpdateLayoutTree, this
    // represents a Styles Recalculation. This event in the timeline is shown to
    // the user as "Recalculate Styles."
    if (event.args.beginData) {
      // Store the last UpdateLayout event: we use this when we see an
      // InvalidateLayout and try to figure out its initiator.
      lastUpdateLayoutTreeByFrame.set(event.args.beginData.frame, event);

      // If this frame has seen a ScheduleStyleRecalc event, then that event is
      // considered to be the initiator of this StylesRecalc.
      const scheduledStyleForFrame = lastScheduleStyleRecalcByFrame.get(event.args.beginData.frame);
      if (scheduledStyleForFrame) {
        storeInitiator({
          event,
          initiator: scheduledStyleForFrame,
        });
      }
    }
  } else if (Types.TraceEvents.isTraceEventInvalidateLayout(event)) {
    // By default, the InvalidateLayout event is what triggered the layout invalidation for this frame.
    let invalidationInitiator: Types.TraceEvents.TraceEventData = event;

    // However, if we have not had any prior invalidations for this frame, we
    // want to consider StyleRecalculation events as they might be the actual
    // cause of this layout invalidation.
    if (!lastInvalidationEventForFrame.has(event.args.data.frame)) {
      // 1. If we have not had an invalidation event for this frame
      // 2. AND we have had an UpdateLayoutTree for this frame
      // 3. AND the UpdateLayoutTree event ended AFTER the InvalidateLayout startTime
      // 4. AND we have an initiator for the UpdateLayoutTree event
      // 5. Then we set the last invalidation event for this frame to be the UpdateLayoutTree's initiator.
      const lastUpdateLayoutTreeForFrame = lastUpdateLayoutTreeByFrame.get(event.args.data.frame);
      if (lastUpdateLayoutTreeForFrame) {
        const {endTime} = Helpers.Timing.eventTimingsMicroSeconds(lastUpdateLayoutTreeForFrame);
        const initiatorOfUpdateLayout = eventToInitiatorMap.get(lastUpdateLayoutTreeForFrame);

        if (initiatorOfUpdateLayout && endTime && endTime > event.ts) {
          invalidationInitiator = initiatorOfUpdateLayout;
        }
      }
    }
    lastInvalidationEventForFrame.set(event.args.data.frame, invalidationInitiator);
  } else if (Types.TraceEvents.isTraceEventLayout(event)) {
    // The initiator of a Layout event is the last Invalidation event.
    const lastInvalidation = lastInvalidationEventForFrame.get(event.args.beginData.frame);
    if (lastInvalidation) {
      storeInitiator({
        event,
        initiator: lastInvalidation,
      });
    }
    // Now clear the last invalidation for the frame: the last invalidation has been linked to a Layout event, so it cannot be the initiator for any future layouts.
    lastInvalidationEventForFrame.delete(event.args.beginData.frame);
  } else if (Types.TraceEvents.isTraceEventRequestAnimationFrame(event)) {
    requestAnimationFrameEventsById.set(event.args.data.id, event);
  } else if (Types.TraceEvents.isTraceEventFireAnimationFrame(event)) {
    // If we get a fire event, that means we should have had the
    // RequestAnimationFrame event by now. If so, we can set that as the
    // initiator for the fire event.
    const matchingRequestEvent = requestAnimationFrameEventsById.get(event.args.data.id);
    if (matchingRequestEvent) {
      storeInitiator({
        event,
        initiator: matchingRequestEvent,
      });
    }
  } else if (Types.TraceEvents.isTraceEventTimerInstall(event)) {
    timerInstallEventsById.set(event.args.data.timerId, event);
  } else if (Types.TraceEvents.isTraceEventTimerFire(event)) {
    const matchingInstall = timerInstallEventsById.get(event.args.data.timerId);
    if (matchingInstall) {
      storeInitiator({event, initiator: matchingInstall});
    }
  } else if (Types.TraceEvents.isTraceEventRequestIdleCallback(event)) {
    requestIdleCallbackEventsById.set(event.args.data.id, event);
  } else if (Types.TraceEvents.isTraceEventFireIdleCallback(event)) {
    const matchingRequestEvent = requestIdleCallbackEventsById.get(event.args.data.id);
    if (matchingRequestEvent) {
      storeInitiator({
        event,
        initiator: matchingRequestEvent,
      });
    }
  } else if (Types.TraceEvents.isTraceEventWebSocketCreate(event)) {
    webSocketCreateEventsById.set(event.args.data.identifier, event);
  } else if (Types.TraceEvents.isTraceEventWebSocketSendHandshakeRequest(event)) {
    const matchingCreateEvent = webSocketCreateEventsById.get(event.args.data.identifier);
    if (matchingCreateEvent) {
      storeInitiator({
        event,
        initiator: matchingCreateEvent,
      });
    }
  } else if (
      Types.TraceEvents.isTraceEventWebSocketSendHandshakeRequest(event) ||
      Types.TraceEvents.isTraceEventWebSocketReceiveHandshakeResponse(event) ||
      Types.TraceEvents.isTraceEventWebSocketDestroy(event)) {
    const matchingCreateEvent = webSocketCreateEventsById.get(event.args.data.identifier);
    if (matchingCreateEvent) {
      storeInitiator({
        event,
        initiator: matchingCreateEvent,
      });
    }
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('InitiatorsHandler is not initialized');
  }

  handlerState = HandlerState.FINALIZED;
}

export interface InitiatorsData {
  eventToInitiator: Map<Types.TraceEvents.TraceEventData, Types.TraceEvents.TraceEventData>;
  initiatorToEvents: Map<Types.TraceEvents.TraceEventData, Types.TraceEvents.TraceEventData[]>;
}
export function data(): InitiatorsData {
  return {
    eventToInitiator: new Map(eventToInitiatorMap),
    initiatorToEvents: new Map(initiatorToEventsMap),
  };
}
