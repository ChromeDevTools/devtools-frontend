// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

export interface InitiatorData {
  event: TraceEngine.Types.TraceEvents.TraceEventData;
  initiator: TraceEngine.Types.TraceEvents.TraceEventData;
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
    traceEngineData: TraceEngine.Handlers.Types.TraceParseData,
    selectedEvent: TraceEngine.Types.TraceEvents.TraceEventData,
    hiddenEntries: TraceEngine.Types.TraceEvents.TraceEventData[],
    modifiedEntries: TraceEngine.Types.TraceEvents.TraceEventData[],
    ): readonly InitiatorData[] {
  const initiatorsData = [
    ...findInitiatorDataPredecessors(traceEngineData, selectedEvent),
    ...findInitiatorDataDirectSuccessors(traceEngineData, selectedEvent),
  ];

  // For each InitiatorData, call a function that makes sure that neither the initirator or initiated entry is hidden.
  // If they are, it will reassign the event or initiator to the closest ancestor.
  initiatorsData.forEach(
      initiatorData =>
          getClosestVisibleInitiatorEntriesAncestors(initiatorData, modifiedEntries, hiddenEntries, traceEngineData));
  return initiatorsData;
}

function findInitiatorDataPredecessors(
    traceEngineData: TraceEngine.Handlers.Types.TraceParseData,
    selectedEvent: TraceEngine.Types.TraceEvents.TraceEventData,
    ): readonly InitiatorData[] {
  const initiatorsData: InitiatorData[] = [];

  let currentEvent: TraceEngine.Types.TraceEvents.TraceEventData|null = selectedEvent;

  // Build event initiator data up to the selected one
  while (currentEvent) {
    const currentInitiator = traceEngineData.Initiators.eventToInitiator.get(currentEvent);

    if (currentInitiator) {
      // Store the current initiator data, and then set the initiator to
      // be the current event, so we work back through the
      // trace and find the initiator of the initiator, and so
      // on...
      initiatorsData.push({event: currentEvent, initiator: currentInitiator});
      currentEvent = currentInitiator;
      continue;
    }

    if (!TraceEngine.Types.TraceEvents.isSyntheticTraceEntry(currentEvent)) {
      // If the current event is not a renderer, we have no
      // concept of a parent event, so we can bail.
      currentEvent = null;
      break;
    }

    const nodeForCurrentEvent = traceEngineData.Renderer.entryToNode.get(currentEvent);
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
    traceEngineData: TraceEngine.Handlers.Types.TraceParseData,
    selectedEvent: TraceEngine.Types.TraceEvents.TraceEventData,
    ): readonly InitiatorData[] {
  const initiatorsData: InitiatorData[] = [];

  // Add all of the initiated events to the initiatorsData array.
  const eventsInitiatedByCurrent = traceEngineData.Initiators.initiatorToEvents.get(selectedEvent);
  if (eventsInitiatedByCurrent) {
    eventsInitiatedByCurrent.forEach(event => {
      initiatorsData.push({event: event, initiator: selectedEvent});
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
    initiatorData: InitiatorData, modifiedEntries: TraceEngine.Types.TraceEvents.TraceEventData[],
    hiddenEntries: TraceEngine.Types.TraceEvents.TraceEventData[],
    traceEngineData: TraceEngine.Handlers.Types.TraceParseData): InitiatorData {
  if (hiddenEntries.includes(initiatorData.event)) {
    let nextParent = traceEngineData.Renderer.entryToNode.get(initiatorData.event)?.parent;
    while (nextParent?.entry && !modifiedEntries.includes(nextParent?.entry)) {
      nextParent = nextParent.parent ?? undefined;
    }
    initiatorData.event = nextParent?.entry ?? initiatorData.event;
    initiatorData.isEntryHidden = true;
  }

  if (hiddenEntries.includes(initiatorData.initiator)) {
    let nextParent = traceEngineData.Renderer.entryToNode.get(initiatorData.initiator)?.parent;
    while (nextParent?.entry && !modifiedEntries.includes(nextParent?.entry)) {
      nextParent = nextParent.parent ?? undefined;
    }
    initiatorData.initiator = nextParent?.entry ?? initiatorData.initiator;
    initiatorData.isInitiatorHidden = true;
  }

  return initiatorData;
}
