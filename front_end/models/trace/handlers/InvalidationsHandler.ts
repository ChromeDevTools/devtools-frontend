// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

/**
 * @file Associates invalidation to recalc/layout events; mostly used in "invalidation tracking" experiment.
 * "Invalidations" == "mutations" == "damage".
 * A DOM change that means we need to recompute style or layout is an invalidation that's tracked here.
 * If the experiment `timeline-invalidation-tracking` is enabled, the `disabledByDefault('devtools.timeline.invalidationTracking')` trace category is enabled, which contains most of these events.
 */

interface InvalidationsStatePerFrame {
  invalidationsForEvent: Map<Types.Events.Event, Types.Events.InvalidationTrackingEvent[]>;
  invalidationCountForEvent: Map<Types.Events.Event, number>;
  lastRecalcStyleEvent: Types.Events.RecalcStyle|null;
  hasPainted: boolean;
  pendingInvalidations: Types.Events.InvalidationTrackingEvent[];
}

const frameStateByFrame = new Map<string, InvalidationsStatePerFrame>();
let maxInvalidationsPerEvent: number|null = null;

export function reset(): void {
  frameStateByFrame.clear();
  maxInvalidationsPerEvent = null;
}

export function handleUserConfig(userConfig: Types.Configuration.Configuration): void {
  maxInvalidationsPerEvent = userConfig.maxInvalidationEventsPerEvent;
}

function getState(frameId: string): InvalidationsStatePerFrame {
  let frameState = frameStateByFrame.get(frameId);
  if (!frameState) {
    frameState = {
      invalidationsForEvent: new Map(),
      invalidationCountForEvent: new Map(),
      lastRecalcStyleEvent: null,
      pendingInvalidations: [],
      hasPainted: false,
    };
    frameStateByFrame.set(frameId, frameState);
  }
  return frameState;
}

function getFrameId(event: Types.Events.Event): string|null {
  if (Types.Events.isRecalcStyle(event) || Types.Events.isLayout(event)) {
    return event.args.beginData?.frame ?? null;
  }
  return event.args?.data?.frame ?? null;
}

function addInvalidationToEvent(
    frameState: InvalidationsStatePerFrame, event: Types.Events.Event,
    invalidation: Types.Events.InvalidationTrackingEvent): void {
  const existingInvalidations = frameState.invalidationsForEvent.get(event) || [];
  existingInvalidations.push(invalidation);

  if (maxInvalidationsPerEvent !== null && existingInvalidations.length > maxInvalidationsPerEvent) {
    existingInvalidations.shift();
  }
  frameState.invalidationsForEvent.set(event, existingInvalidations);

  const count = frameState.invalidationCountForEvent.get(event) ?? 0;
  frameState.invalidationCountForEvent.set(event, count + 1);
}

export function handleEvent(event: Types.Events.Event): void {
  // Special case: if we have been configured to not store any invalidations,
  // we take that as a sign that we don't even want to gather any invalidations
  // data at all and early exit.
  if (maxInvalidationsPerEvent === 0) {
    return;
  }

  const frameId = getFrameId(event);
  if (!frameId) {
    return;
  }
  const thisFrame = getState(frameId);

  if (Types.Events.isRecalcStyle(event)) {
    thisFrame.lastRecalcStyleEvent = event;

    // Associate any prior invalidations with this recalc event.
    for (const invalidation of thisFrame.pendingInvalidations) {
      if (Types.Events.isLayoutInvalidationTracking(invalidation)) {
        // LayoutInvalidation events cannot be associated with a LayoutTree
        // event.
        continue;
      }
      addInvalidationToEvent(thisFrame, event, invalidation);
    }
    return;
  }

  if (Types.Events.isInvalidationTracking(event)) {
    if (thisFrame.hasPainted) {
      // If we have painted, then we can clear out the list of all existing
      // invalidations, as we cannot associate them across frames.
      thisFrame.pendingInvalidations.length = 0;
      thisFrame.lastRecalcStyleEvent = null;
      thisFrame.hasPainted = false;
    }

    // Style invalidation events can occur before and during recalc styles. When we get a recalc style event, we check and associate any prior invalidations with it.
    // But any invalidations that occur during a RecalcStyle
    // event would be reported in trace events after. So each time we get an
    // invalidation that might be due to a style recalc, we check if the
    // timings overlap and if so associate them.
    if (thisFrame.lastRecalcStyleEvent &&
        (Types.Events.isScheduleStyleInvalidationTracking(event) ||
         Types.Events.isStyleRecalcInvalidationTracking(event) ||
         Types.Events.isStyleInvalidatorInvalidationTracking(event))) {
      const recalcLastRecalc = thisFrame.lastRecalcStyleEvent;
      const recalcEndTime = recalcLastRecalc.ts + (recalcLastRecalc.dur || 0);
      if (event.ts >= recalcLastRecalc.ts && event.ts <= recalcEndTime) {
        addInvalidationToEvent(thisFrame, recalcLastRecalc, event);
      }
    }

    thisFrame.pendingInvalidations.push(event);
    return;
  }

  if (Types.Events.isPaint(event)) {
    thisFrame.hasPainted = true;
    return;
  }

  if (Types.Events.isLayout(event)) {
    for (const invalidation of thisFrame.pendingInvalidations) {
      // The only invalidations that cause a Layout are LayoutInvalidations :)
      if (!Types.Events.isLayoutInvalidationTracking(invalidation)) {
        continue;
      }
      addInvalidationToEvent(thisFrame, event, invalidation);
    }
  }
}

export async function finalize(): Promise<void> {
}

interface InvalidationsData {
  invalidationsForEvent: Map<Types.Events.Event, Types.Events.InvalidationTrackingEvent[]>;
  invalidationCountForEvent: Map<Types.Events.Event, number>;
}

export function data(): InvalidationsData {
  const invalidationsForEvent = new Map<Types.Events.Event, Types.Events.InvalidationTrackingEvent[]>();
  const invalidationCountForEvent = new Map<Types.Events.Event, number>();
  for (const frame of frameStateByFrame.values()) {
    for (const [event, invalidations] of frame.invalidationsForEvent.entries()) {
      invalidationsForEvent.set(event, invalidations);
    }
    for (const [event, count] of frame.invalidationCountForEvent.entries()) {
      invalidationCountForEvent.set(event, count);
    }
  }
  return {
    invalidationsForEvent,
    invalidationCountForEvent,
  };
}
