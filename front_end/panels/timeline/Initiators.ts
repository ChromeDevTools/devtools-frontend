// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../models/trace/trace.js';

export interface InitiatorData {
  event: Trace.Types.Events.Event;
  initiator: Trace.Types.Events.Event;
  isEntryHidden?: boolean;
  isInitiatorHidden?: boolean;
}
/**
 * Given an event that the user has selected, this function returns all the
 * data of events and their initiators that need to be drawn on the flamechart.
 * The reason that this can return multiple InitiatorEntry objects is because we draw the
 * entire chain: for each, we see if it had an initiator, and
 * work backwards to draw each one, as well as the events initiated directly by the entry.
 */
export function initiatorsDataToDraw(
    parsedTrace: Trace.Handlers.Types.ParsedTrace,
    selectedEvent: Trace.Types.Events.Event,
    hiddenEntries: Trace.Types.Events.Event[],
    expandableEntries: Trace.Types.Events.Event[],
    ): readonly InitiatorData[] {
  const initiatorsData = [
    ...findInitiatorDataPredecessors(parsedTrace, selectedEvent, parsedTrace.Initiators.eventToInitiator),
    ...findInitiatorDataDirectSuccessors(selectedEvent, parsedTrace.Initiators.initiatorToEvents),
  ];

  // For each InitiatorData, call a function that makes sure that neither the initiator or initiated entry is hidden.
  // If they are, it will reassign the event or initiator to the closest ancestor.
  initiatorsData.forEach(
      initiatorData =>
          getClosestVisibleInitiatorEntriesAncestors(initiatorData, expandableEntries, hiddenEntries, parsedTrace));
  return initiatorsData;
}

export function initiatorsDataToDrawForNetwork(
    parsedTrace: Trace.Handlers.Types.ParsedTrace,
    selectedEvent: Trace.Types.Events.Event,
    ): readonly InitiatorData[] {
  return findInitiatorDataPredecessors(parsedTrace, selectedEvent, parsedTrace.NetworkRequests.eventToInitiator);
}

function findInitiatorDataPredecessors(
    parsedTrace: Trace.Handlers.Types.ParsedTrace,
    selectedEvent: Trace.Types.Events.Event,
    eventToInitiator: Map<Trace.Types.Events.Event, Trace.Types.Events.Event>,
    ): readonly InitiatorData[] {
  const initiatorsData: InitiatorData[] = [];

  let currentEvent: Trace.Types.Events.Event|null = selectedEvent;
  const visited = new Set<Trace.Types.Events.Event>();
  visited.add(currentEvent);

  // Build event initiator data up to the selected one
  while (currentEvent) {
    const currentInitiator = eventToInitiator.get(currentEvent);

    if (currentInitiator) {
      if (visited.has(currentInitiator)) {
        break;
      }
      // Store the current initiator data, and then set the initiator to
      // be the current event, so we work back through the
      // trace and find the initiator of the initiator, and so
      // on...
      initiatorsData.push({event: currentEvent, initiator: currentInitiator});
      currentEvent = currentInitiator;
      visited.add(currentEvent);
      continue;
    }

    const nodeForCurrentEvent = parsedTrace.Renderer.entryToNode.get(currentEvent);
    if (!nodeForCurrentEvent) {
      // Should not happen - if it does something odd is going
      // on so let's give up.
      currentEvent = null;
      break;
    }

    // Go up to the parent, and loop again.
    currentEvent = nodeForCurrentEvent.parent?.entry || null;
  }

  return initiatorsData;
}

function findInitiatorDataDirectSuccessors(
    selectedEvent: Trace.Types.Events.Event,
    initiatorToEvents: Map<Trace.Types.Events.Event, Trace.Types.Events.Event[]>,
    ): readonly InitiatorData[] {
  const initiatorsData: InitiatorData[] = [];

  // Add all of the initiated events to the initiatorsData array.
  const eventsInitiatedByCurrent = initiatorToEvents.get(selectedEvent);
  if (eventsInitiatedByCurrent) {
    eventsInitiatedByCurrent.forEach(event => {
      initiatorsData.push({event, initiator: selectedEvent});
    });
  }

  return initiatorsData;
}

/**
 * Given an InitiatorData object that contains an initiator and event, this function returns
 * the closest visible ancestors. We need to apply this to each initiatorData because
 * the actual initiator or initiated event might be hidden form the flame chart.
 * If neither entry is hidden, this function returns the initial initiatorData object.
 */
function getClosestVisibleInitiatorEntriesAncestors(
    initiatorData: InitiatorData, expandableEntries: Trace.Types.Events.Event[],
    hiddenEntries: Trace.Types.Events.Event[], parsedTrace: Trace.Handlers.Types.ParsedTrace): InitiatorData {
  if (hiddenEntries.includes(initiatorData.event)) {
    let nextParent = parsedTrace.Renderer.entryToNode.get(initiatorData.event)?.parent;
    while (nextParent?.entry && !expandableEntries.includes(nextParent?.entry)) {
      nextParent = nextParent.parent ?? undefined;
    }
    initiatorData.event = nextParent?.entry ?? initiatorData.event;
    initiatorData.isEntryHidden = true;
  }

  if (hiddenEntries.includes(initiatorData.initiator)) {
    let nextParent = parsedTrace.Renderer.entryToNode.get(initiatorData.initiator)?.parent;
    while (nextParent?.entry && !expandableEntries.includes(nextParent?.entry)) {
      nextParent = nextParent.parent ?? undefined;
    }
    initiatorData.initiator = nextParent?.entry ?? initiatorData.initiator;
    initiatorData.isInitiatorHidden = true;
  }

  return initiatorData;
}
