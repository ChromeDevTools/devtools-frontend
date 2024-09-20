// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as metaHandlerData} from './MetaHandler.js';
import {ScoreClassification} from './PageLoadMetricsHandler.js';
import {type HandlerName, HandlerState} from './types.js';

// This handler serves two purposes. It generates a list of events that are
// used to show user clicks in the timeline. It is also used to gather
// EventTimings into Interactions, which we use to show interactions and
// highlight long interactions to the user, along with INP.

// We don't need to know which process / thread these events occurred in,
// because they are effectively global, so we just track all that we find.
const allEvents: Types.Events.EventTiming[] = [];

const beginCommitCompositorFrameEvents: Types.Events.BeginCommitCompositorFrame[] = [];
const parseMetaViewportEvents: Types.Events.ParseMetaViewport[] = [];

export const LONG_INTERACTION_THRESHOLD = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(200));

const INP_GOOD_TIMING = LONG_INTERACTION_THRESHOLD;
const INP_MEDIUM_TIMING = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(500));

export interface UserInteractionsData {
  /** All the user events we found in the trace */
  allEvents: readonly Types.Events.EventTiming[];
  /** All the BeginCommitCompositorFrame events we found in the trace */
  beginCommitCompositorFrameEvents: readonly Types.Events.BeginCommitCompositorFrame[];
  /** All the ParseMetaViewport events we found in the trace */
  parseMetaViewportEvents: readonly Types.Events.ParseMetaViewport[];
  /** All the interaction events we found in the trace that had an
   * interactionId and a duration > 0
   **/
  interactionEvents: readonly Types.Events.SyntheticInteractionPair[];
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
  interactionEventsWithNoNesting: readonly Types.Events.SyntheticInteractionPair[];
  // The longest duration interaction event. Can be null if the trace has no interaction events.
  longestInteractionEvent: Readonly<Types.Events.SyntheticInteractionPair>|null;
  // All interactions that went over the interaction threshold (200ms, see https://web.dev/inp/)
  interactionsOverThreshold: Readonly<Set<Types.Events.SyntheticInteractionPair>>;
}

let longestInteractionEvent: Types.Events.SyntheticInteractionPair|null = null;

const interactionEvents: Types.Events.SyntheticInteractionPair[] = [];
const interactionEventsWithNoNesting: Types.Events.SyntheticInteractionPair[] = [];
const eventTimingEndEventsById = new Map<string, Types.Events.EventTimingEnd>();
const eventTimingStartEventsForInteractions: Types.Events.EventTimingBegin[] = [];
let handlerState = HandlerState.UNINITIALIZED;

export function reset(): void {
  allEvents.length = 0;
  beginCommitCompositorFrameEvents.length = 0;
  parseMetaViewportEvents.length = 0;
  interactionEvents.length = 0;
  eventTimingStartEventsForInteractions.length = 0;
  eventTimingEndEventsById.clear();
  interactionEventsWithNoNesting.length = 0;
  longestInteractionEvent = null;
  handlerState = HandlerState.INITIALIZED;
}

export function handleEvent(event: Types.Events.Event): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Handler is not initialized');
  }

  if (Types.Events.isBeginCommitCompositorFrame(event)) {
    beginCommitCompositorFrameEvents.push(event);
    return;
  }

  if (Types.Events.isParseMetaViewport(event)) {
    parseMetaViewportEvents.push(event);
    return;
  }

  if (!Types.Events.isEventTiming(event)) {
    return;
  }

  if (Types.Events.isEventTimingEnd(event)) {
    // Store the end event; for each start event that is an interaction, we need the matching end event to calculate the duration correctly.
    eventTimingEndEventsById.set(event.id, event);
  }

  allEvents.push(event);

  // From this point on we want to find events that represent interactions.
  // These events are always start events - those are the ones that contain all
  // the metadata about the interaction.
  if (!event.args.data || !Types.Events.isEventTimingStart(event)) {
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
export function categoryOfInteraction(interaction: Types.Events.SyntheticInteractionPair): InteractionCategory {
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
export function removeNestedInteractions(interactions: readonly Types.Events.SyntheticInteractionPair[]):
    readonly Types.Events.SyntheticInteractionPair[] {
  /**
   * Because we nest events only that are in the same category, we store the
   * longest event for a given end time by category.
   **/
  const earliestEventForEndTimePerCategory:
      Record<InteractionCategory, Map<Types.Timing.MicroSeconds, Types.Events.SyntheticInteractionPair>> = {
        POINTER: new Map(),
        KEYBOARD: new Map(),
        OTHER: new Map(),
      };

  function storeEventIfEarliestForCategoryAndEndTime(interaction: Types.Events.SyntheticInteractionPair): void {
    const category = categoryOfInteraction(interaction);
    const earliestEventForEndTime = earliestEventForEndTimePerCategory[category];
    const endTime = Types.Timing.MicroSeconds(interaction.ts + interaction.dur);

    const earliestCurrentEvent = earliestEventForEndTime.get(endTime);
    if (!earliestCurrentEvent) {
      earliestEventForEndTime.set(endTime, interaction);
      return;
    }
    if (interaction.ts < earliestCurrentEvent.ts) {
      earliestEventForEndTime.set(endTime, interaction);
    } else if (
        interaction.ts === earliestCurrentEvent.ts &&
        interaction.interactionId === earliestCurrentEvent.interactionId) {
      // We have seen in traces that the same interaction can have multiple
      // events (e.g. a 'click' and a 'pointerdown'). Often only one of these
      // events will have an event handler bound to it which caused delay on
      // the main thread, and the others will not. This leads to a situation
      // where if we pick one of the events that had no event handler, its
      // processing duration (processingEnd - processingStart) will be 0, but if we
      // had picked the event that had the slow event handler, we would show
      // correctly the main thread delay due to the event handler.
      // So, if we find events with the same interactionId and the same
      // begin/end times, we pick the one with the largest (processingEnd -
      // processingStart) time in order to make sure we find the event with the
      // worst main thread delay, as that is the one the user should care
      // about.
      const currentProcessingDuration = earliestCurrentEvent.processingEnd - earliestCurrentEvent.processingStart;
      const newProcessingDuration = interaction.processingEnd - interaction.processingStart;

      // Use the new interaction if it has a longer processing duration than the existing one.
      if (newProcessingDuration > currentProcessingDuration) {
        earliestEventForEndTime.set(endTime, interaction);
      }
    }

    // Maximize the processing duration based on the "children" interactions.
    // We pick the earliest start processing duration, and the latest end
    // processing duration to avoid under-reporting.
    if (interaction.processingStart < earliestCurrentEvent.processingStart) {
      earliestCurrentEvent.processingStart = interaction.processingStart;
      writeSyntheticTimespans(earliestCurrentEvent);
    }
    if (interaction.processingEnd > earliestCurrentEvent.processingEnd) {
      earliestCurrentEvent.processingEnd = interaction.processingEnd;
      writeSyntheticTimespans(earliestCurrentEvent);
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

function writeSyntheticTimespans(event: Types.Events.SyntheticInteractionPair): void {
  const startEvent = event.args.data.beginEvent;
  const endEvent = event.args.data.endEvent;

  event.inputDelay = Types.Timing.MicroSeconds(event.processingStart - startEvent.ts);
  event.mainThreadHandling = Types.Timing.MicroSeconds(event.processingEnd - event.processingStart);
  event.presentationDelay = Types.Timing.MicroSeconds(endEvent.ts - event.processingEnd);
}

export async function finalize(): Promise<void> {
  const {navigationsByFrameId} = metaHandlerData();

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

    // In the future we will add microsecond timestamps to the trace events,
    // but until then we can use the millisecond precision values that are in
    // the trace event. To adjust them to be relative to the event.ts and the
    // trace timestamps, for both processingStart and processingEnd we subtract
    // the event timestamp (NOT event.ts, but the timeStamp millisecond value
    // emitted in args.data), and then add that value to the event.ts. This
    // will give us a processingStart and processingEnd time in microseconds
    // that is relative to event.ts, and can be used when drawing boxes.
    // There is some inaccuracy here as we are converting milliseconds to microseconds, but it is good enough until the backend emits more accurate numbers.
    const processingStartRelativeToTraceTime = Types.Timing.MicroSeconds(
        Helpers.Timing.millisecondsToMicroseconds(interactionStartEvent.args.data.processingStart) -
            Helpers.Timing.millisecondsToMicroseconds(interactionStartEvent.args.data.timeStamp) +
            interactionStartEvent.ts,
    );

    const processingEndRelativeToTraceTime = Types.Timing.MicroSeconds(
        (Helpers.Timing.millisecondsToMicroseconds(interactionStartEvent.args.data.processingEnd) -
         Helpers.Timing.millisecondsToMicroseconds(interactionStartEvent.args.data.timeStamp)) +
        interactionStartEvent.ts);

    const frameId = interactionStartEvent.args.frame ?? interactionStartEvent.args.data.frame;
    const navigation = Helpers.Trace.getNavigationForTraceEvent(interactionStartEvent, frameId, navigationsByFrameId);
    const navigationId = navigation?.args.data?.navigationId;
    const interactionEvent =
        Helpers.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent<Types.Events.SyntheticInteractionPair>({
          // Use the start event to define the common fields.
          rawSourceEvent: interactionStartEvent,
          cat: interactionStartEvent.cat,
          name: interactionStartEvent.name,
          pid: interactionStartEvent.pid,
          tid: interactionStartEvent.tid,
          ph: interactionStartEvent.ph,
          processingStart: processingStartRelativeToTraceTime,
          processingEnd: processingEndRelativeToTraceTime,
          // These will be set in writeSyntheticTimespans()
          inputDelay: Types.Timing.MicroSeconds(-1),
          mainThreadHandling: Types.Timing.MicroSeconds(-1),
          presentationDelay: Types.Timing.MicroSeconds(-1),
          args: {
            data: {
              beginEvent: interactionStartEvent,
              endEvent,
              frame: frameId,
              navigationId,
            },
          },
          ts: interactionStartEvent.ts,
          dur: Types.Timing.MicroSeconds(endEvent.ts - interactionStartEvent.ts),
          type: interactionStartEvent.args.data.type,
          interactionId: interactionStartEvent.args.data.interactionId,
        });
    writeSyntheticTimespans(interactionEvent);

    interactionEvents.push(interactionEvent);
  }

  handlerState = HandlerState.FINALIZED;
  interactionEventsWithNoNesting.push(...removeNestedInteractions(interactionEvents));

  // Pick the longest interactions from the set that were not nested, as we
  // know those are the set of the largest interactions.
  for (const interactionEvent of interactionEventsWithNoNesting) {
    if (!longestInteractionEvent || longestInteractionEvent.dur < interactionEvent.dur) {
      longestInteractionEvent = interactionEvent;
    }
  }
}

export function data(): UserInteractionsData {
  return {
    allEvents,
    beginCommitCompositorFrameEvents,
    parseMetaViewportEvents,
    interactionEvents,
    interactionEventsWithNoNesting,
    longestInteractionEvent,
    interactionsOverThreshold: new Set(interactionEvents.filter(event => {
      return event.dur > LONG_INTERACTION_THRESHOLD;
    })),
  };
}

export function deps(): HandlerName[] {
  return ['Meta'];
}

/**
 * Classifications sourced from
 * https://web.dev/articles/inp#good-score
 */
export function scoreClassificationForInteractionToNextPaint(timing: Types.Timing.MicroSeconds): ScoreClassification {
  if (timing <= INP_GOOD_TIMING) {
    return ScoreClassification.GOOD;
  }

  if (timing <= INP_MEDIUM_TIMING) {
    return ScoreClassification.OK;
  }

  return ScoreClassification.BAD;
}
