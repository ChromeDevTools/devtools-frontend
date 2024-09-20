// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

let handlerState = HandlerState.UNINITIALIZED;

const invalidationsForEvent = new Map<Types.Events.Event, Types.Events.InvalidationTrackingEvent[]>();
const invalidationCountForEvent = new Map<Types.Events.Event, number>();

let lastRecalcStyleEvent: Types.Events.UpdateLayoutTree|null = null;

// Used to track paints so we track invalidations correctly per paint.
let hasPainted = false;

const allInvalidationTrackingEvents: Array<Types.Events.InvalidationTrackingEvent> = [];

export function reset(): void {
  handlerState = HandlerState.UNINITIALIZED;
  invalidationsForEvent.clear();
  lastRecalcStyleEvent = null;
  allInvalidationTrackingEvents.length = 0;
  hasPainted = false;
  maxInvalidationsPerEvent = null;
}

let maxInvalidationsPerEvent: number|null = null;
export function handleUserConfig(userConfig: Types.Configuration.Configuration): void {
  maxInvalidationsPerEvent = userConfig.maxInvalidationEventsPerEvent;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('InvalidationsHandler was not reset before being initialized');
  }

  handlerState = HandlerState.INITIALIZED;
}

function addInvalidationToEvent(event: Types.Events.Event, invalidation: Types.Events.InvalidationTrackingEvent): void {
  const existingInvalidations = invalidationsForEvent.get(event) || [];
  existingInvalidations.push(invalidation);

  if (maxInvalidationsPerEvent !== null && existingInvalidations.length > maxInvalidationsPerEvent) {
    existingInvalidations.shift();
  }
  invalidationsForEvent.set(event, existingInvalidations);

  const count = invalidationCountForEvent.get(event) ?? 0;
  invalidationCountForEvent.set(event, count + 1);
}

export function handleEvent(event: Types.Events.Event): void {
  // Special case: if we have been configured to not store any invalidations,
  // we take that as a sign that we don't even want to gather any invalidations
  // data at all and early exit.
  if (maxInvalidationsPerEvent === 0) {
    return;
  }

  if (Types.Events.isUpdateLayoutTree(event)) {
    lastRecalcStyleEvent = event;

    // Associate any prior invalidations with this recalc event.
    for (const invalidation of allInvalidationTrackingEvents) {
      if (Types.Events.isLayoutInvalidationTracking(invalidation)) {
        // LayoutInvalidation events cannot be associated with a LayoutTree
        // event.
        continue;
      }

      const recalcFrameId = lastRecalcStyleEvent.args.beginData?.frame;

      if (recalcFrameId && invalidation.args.data.frame === recalcFrameId) {
        addInvalidationToEvent(event, invalidation);
      }
    }
    return;
  }

  if (Types.Events.isInvalidationTracking(event)) {
    if (hasPainted) {
      // If we have painted, then we can clear out the list of all existing
      // invalidations, as we cannot associate them across frames.
      allInvalidationTrackingEvents.length = 0;
      lastRecalcStyleEvent = null;
      hasPainted = false;
    }

    // Style invalidation events can occur before and during recalc styles. When we get a recalc style event (aka UpdateLayoutTree), we check and associate any prior invalidations with it.
    // But any invalidations that occur during a UpdateLayoutTree
    // event would be reported in trace events after. So each time we get an
    // invalidation that might be due to a style recalc, we check if the
    // timings overlap and if so associate them.
    if (lastRecalcStyleEvent &&
        (Types.Events.isScheduleStyleInvalidationTracking(event) ||
         Types.Events.isStyleRecalcInvalidationTracking(event) ||
         Types.Events.isStyleInvalidatorInvalidationTracking(event))) {
      const recalcEndTime = lastRecalcStyleEvent.ts + (lastRecalcStyleEvent.dur || 0);
      if (event.ts >= lastRecalcStyleEvent.ts && event.ts <= recalcEndTime &&
          lastRecalcStyleEvent.args.beginData?.frame === event.args.data.frame) {
        addInvalidationToEvent(lastRecalcStyleEvent, event);
      }
    }

    allInvalidationTrackingEvents.push(event);
    return;
  }

  if (Types.Events.isPaint(event)) {
    // Used to ensure that we do not create relationships across frames.
    hasPainted = true;
    return;
  }

  if (Types.Events.isLayout(event)) {
    const layoutFrame = event.args.beginData.frame;
    for (const invalidation of allInvalidationTrackingEvents) {
      // The only invalidations that cause a Layout are LayoutInvalidations :)
      if (!Types.Events.isLayoutInvalidationTracking(invalidation)) {
        continue;
      }

      if (invalidation.args.data.frame === layoutFrame) {
        addInvalidationToEvent(event, invalidation);
      }
    }
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('InvalidationsHandler is not initialized');
  }

  handlerState = HandlerState.FINALIZED;
}

interface InvalidationsData {
  invalidationsForEvent: Map<Types.Events.Event, Types.Events.InvalidationTrackingEvent[]>;
  invalidationCountForEvent: Map<Types.Events.Event, number>;
}

export function data(): InvalidationsData {
  return {
    invalidationsForEvent,
    invalidationCountForEvent,
  };
}
