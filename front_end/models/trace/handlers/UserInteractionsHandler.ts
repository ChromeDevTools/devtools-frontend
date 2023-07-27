// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

// This handler serves two purposes. It generates a list of events that are
// used to show user clicks in the timeline. It is also used to gather
// EventTimings into Interactions, which we use to show interactions and
// highlight long interactions to the user, along with INP.

// We don't need to know which process / thread these events occurred in,
// because they are effectively global, so we just track all that we find.
const allEvents: Types.TraceEvents.TraceEventEventTiming[] = [];

export const LONG_INTERACTION_THRESHOLD = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(200));

export interface UserInteractionsData {
  /** All the user events we found in the trace */
  allEvents: readonly Types.TraceEvents.TraceEventEventTiming[];
  /** All the interaction events we found in the trace that had an
   * interactionId and a duration > 0
   **/
  interactionEvents: readonly Types.TraceEvents.SyntheticInteractionEvent[];
  /** If the user rapidly generates interaction events (think typing into a
   * text box), in the UI we only really want to show the user the longest
   * interaction in that set.
   * For example picture interactions like this:
   * ===[interaction A]==========
   *       =[interaction B]======
   *            =[interaction C]=
   *
   * These events all end at the same time, and so in this instance we only want
   * to show the first interaction A on the timeline, as that is the longest one
   * and the one the developer should be focusing on. So this array of events is
   * all the interaction events filtered down, removing any nested interactions
   * entirely.
   **/
  interactionEventsWithNoNesting: readonly Types.TraceEvents.SyntheticInteractionEvent[];
  // The longest duration interaction event. Can be null if the trace has no interaction events.
  longestInteractionEvent: Readonly<Types.TraceEvents.SyntheticInteractionEvent>|null;
  // All interactions that went over the interaction threshold (200ms, see https://web.dev/inp/)
  interactionsOverThreshold: Readonly<Set<Types.TraceEvents.SyntheticInteractionEvent>>;
}

let longestInteractionEvent: Types.TraceEvents.SyntheticInteractionEvent|null = null;

const interactionEvents: Types.TraceEvents.SyntheticInteractionEvent[] = [];
const interactionEventsWithNoNesting: Types.TraceEvents.SyntheticInteractionEvent[] = [];
const eventTimingEndEventsById = new Map<string, Types.TraceEvents.TraceEventEventTimingEnd>();
const eventTimingStartEventsForInteractions: Types.TraceEvents.TraceEventEventTimingBegin[] = [];
let handlerState = HandlerState.UNINITIALIZED;

export function reset(): void {
  allEvents.length = 0;
  interactionEvents.length = 0;
  eventTimingStartEventsForInteractions.length = 0;
  eventTimingEndEventsById.clear();
  interactionEventsWithNoNesting.length = 0;
  longestInteractionEvent = null;
  handlerState = HandlerState.INITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Handler is not initialized');
  }

  if (!Types.TraceEvents.isTraceEventEventTiming(event)) {
    return;
  }

  if (Types.TraceEvents.isTraceEventEventTimingEnd(event)) {
    // Store the end event; for each start event that is an interaction, we need the matching end event to calculate the duration correctly.
    eventTimingEndEventsById.set(event.id, event);
  }

  allEvents.push(event);

  // From this point on we want to find events that represent interactions.
  // These events are always start events - those are the ones that contain all
  // the metadata about the interaction.
  if (!event.args.data || !Types.TraceEvents.isTraceEventEventTimingStart(event)) {
    return;
  }
  const {duration, interactionId} = event.args.data;
  // We exclude events for the sake of interactions if:
  // 1. They have no duration.
  // 2. They have no interactionId
  // 3. They have an interactionId of 0: this indicates that it's not an
  //    interaction that we care about because it hasn't had its own interactionId
  //    set (0 is the default on the backend).
  // See: https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/responsiveness_metrics.cc;l=133;drc=40c209a9c365ebb9f16fb99dfe78c7fe768b9594

  if (duration < 1 || interactionId === undefined || interactionId === 0) {
    return;
  }

  // Store the start event. In the finalize() function we will pair this with
  // its end event and create the synthetic interaction event.
  eventTimingStartEventsForInteractions.push(event);
}

/**
 * See https://web.dev/better-responsiveness-metric/#interaction-types for the
 * table that defines these sets.
 **/
const pointerEventTypes = new Set([
  'pointerdown',
  'touchstart',
  'pointerup',
  'touchend',
  'mousedown',
  'mouseup',
  'click',
]);

const keyboardEventTypes = new Set([
  'keydown',
  'keypress',
  'keyup',
]);

export type InteractionCategory = 'KEYBOARD'|'POINTER'|'OTHER';
export function categoryOfInteraction(interaction: Types.TraceEvents.SyntheticInteractionEvent): InteractionCategory {
  if (pointerEventTypes.has(interaction.type)) {
    return 'POINTER';
  }
  if (keyboardEventTypes.has(interaction.type)) {
    return 'KEYBOARD';
  }

  return 'OTHER';
}

/**
 * We define a set of interactions as nested where:
 * 1. Their end times align.
 * 2. The longest interaction's start time is earlier than all other
 * interactions with the same end time.
 * 3. The interactions are of the same category [each interaction is either
 * categorised as keyboard, or pointer.]
 *
 * =============A=[pointerup]=
 *        ====B=[pointerdown]=
 *        ===C=[pointerdown]==
 *         ===D=[pointerup]===
 *
 * In this example, B, C and D are all nested and therefore should not be
 * returned from this function.
 *
 * However, in this example we would only consider B nested (under A) and D
 * nested (under C). A and C both stay because they are of different types.
 * ========A=[keydown]====
 *   =======B=[keyup]=====
 *    ====C=[pointerdown]=
 *         =D=[pointerup]=
 **/
export function removeNestedInteractions(interactions: readonly Types.TraceEvents.SyntheticInteractionEvent[]):
    readonly Types.TraceEvents.SyntheticInteractionEvent[] {
  /**
   * Because we nest events only that are in the same category, we store the
   * longest event for a given end time by category.
   **/
  const earliestEventForEndTimePerCategory:
      Record<InteractionCategory, Map<Types.Timing.MicroSeconds, Types.TraceEvents.SyntheticInteractionEvent>> = {
        POINTER: new Map(),
        KEYBOARD: new Map(),
        OTHER: new Map(),
      };

  function storeEventIfEarliestForCategoryAndEndTime(interaction: Types.TraceEvents.SyntheticInteractionEvent): void {
    const category = categoryOfInteraction(interaction);
    const mapToUse = earliestEventForEndTimePerCategory[category];
    const endTime = Types.Timing.MicroSeconds(interaction.ts + interaction.dur);

    const earliestCurrentEvent = mapToUse.get(endTime);
    if (!earliestCurrentEvent) {
      mapToUse.set(endTime, interaction);
      return;
    }
    if (interaction.ts < earliestCurrentEvent.ts) {
      mapToUse.set(endTime, interaction);
    }
  }

  for (const interaction of interactions) {
    storeEventIfEarliestForCategoryAndEndTime(interaction);
  }

  // Combine all the events that we have kept from all the per-category event
  // maps back into an array and sort them by timestamp.
  const keptEvents = Object.values(earliestEventForEndTimePerCategory)
                         .flatMap(eventsByEndTime => Array.from(eventsByEndTime.values()));
  keptEvents.sort((eventA, eventB) => {
    return eventA.ts - eventB.ts;
  });
  return keptEvents;
}

export async function finalize(): Promise<void> {
  // For each interaction start event, find the async end event by the ID, and then create the Synthetic Interaction event.
  for (const interactionStartEvent of eventTimingStartEventsForInteractions) {
    const endEvent = eventTimingEndEventsById.get(interactionStartEvent.id);
    if (!endEvent) {
      // If we cannot find an end event, bail and drop this event.
      continue;
    }
    if (!interactionStartEvent.args.data?.type || !interactionStartEvent.args.data?.interactionId) {
      // A valid interaction event that we care about has to have a type (e.g.
      // pointerdown, keyup).
      //
      // We also need to ensure it has an interactionId. We already checked
      // this in the handleEvent() function, but we do it here also to satisfy
      // TypeScript.
      continue;
    }

    const interactionEvent: Types.TraceEvents.SyntheticInteractionEvent = {
      // Use the start event to define the common fields.
      cat: interactionStartEvent.cat,
      name: interactionStartEvent.name,
      pid: interactionStartEvent.pid,
      tid: interactionStartEvent.tid,
      ph: interactionStartEvent.ph,
      args: {
        data: {
          beginEvent: interactionStartEvent,
          endEvent: endEvent,
        },
      },
      ts: interactionStartEvent.ts,
      dur: Types.Timing.MicroSeconds(endEvent.ts - interactionStartEvent.ts),
      type: interactionStartEvent.args.data.type,
      interactionId: interactionStartEvent.args.data.interactionId,
    };
    if (!longestInteractionEvent || longestInteractionEvent.dur < interactionEvent.dur) {
      longestInteractionEvent = interactionEvent;
    }
    interactionEvents.push(interactionEvent);
  }

  handlerState = HandlerState.FINALIZED;
  interactionEventsWithNoNesting.push(...removeNestedInteractions(interactionEvents));
}

export function data(): UserInteractionsData {
  return {
    allEvents: [...allEvents],
    interactionEvents: [...interactionEvents],
    interactionEventsWithNoNesting: [...interactionEventsWithNoNesting],
    longestInteractionEvent,
    interactionsOverThreshold: new Set(interactionEvents.filter(event => {
      return event.dur > LONG_INTERACTION_THRESHOLD;
    })),
  };
}
