// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as metaHandlerData} from './MetaHandler.js';
import {HandlerState, type TraceEventHandlerName} from './types.js';

let handlerState = HandlerState.UNINITIALIZED;

const paintEvents: Types.TraceEvents.TraceEventPaint[] = [];
const snapshotEvents: Types.TraceEvents.TraceEventDisplayItemListSnapshot[] = [];
const paintToSnapshotMap =
    new Map<Types.TraceEvents.TraceEventPaint, Types.TraceEvents.TraceEventDisplayItemListSnapshot>();

let lastPaintForLayerId: Record<number, Types.TraceEvents.TraceEventPaint> = {};

let currentMainFrameLayerTreeId: number|null = null;
const updateLayerEvents: Types.TraceEvents.TraceEventUpdateLayer[] = [];

type RelevantLayerTreeEvent = Types.TraceEvents.TraceEventPaint|
                              Types.TraceEvents.TraceEventDisplayItemListSnapshot|
                              Types.TraceEvents.TraceEventUpdateLayer|Types.TraceEvents.TraceEventSetLayerTreeId;

const relevantEvents: RelevantLayerTreeEvent[] = [];
export function reset(): void {
  handlerState = HandlerState.UNINITIALIZED;
  paintEvents.length = 0;
  snapshotEvents.length = 0;
  paintToSnapshotMap.clear();

  lastPaintForLayerId = {};
  currentMainFrameLayerTreeId = null;
  updateLayerEvents.length = 0;
  relevantEvents.length = 0;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('LayerTree Handler was not reset before being initialized');
  }

  handlerState = HandlerState.INITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  // We gather up the events here but do all the processing in finalize(). This
  // is because we need to have all the events before we process them, and we
  // need the Meta handler to be finalized() so we can use its data as we need
  // the mainFrameId to know which Layer(s) to care about.
  if (Types.TraceEvents.isTraceEventPaint(event) || Types.TraceEvents.isTraceEventDisplayListItemListSnapshot(event) ||
      Types.TraceEvents.isTraceEventUpdateLayer(event) || Types.TraceEvents.isTraceEventSetLayerId(event)) {
    relevantEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('LayerTree Handler is not initialized');
  }

  const metaData = metaHandlerData();
  Helpers.Trace.sortTraceEventsInPlace(relevantEvents);

  for (const event of relevantEvents) {
    if (Types.TraceEvents.isTraceEventSetLayerId(event)) {
      if (metaData.mainFrameId !== event.args.data.frame) {
        // We only care about LayerId changes that affect the main frame.
        continue;
      }
      currentMainFrameLayerTreeId = event.args.data.layerTreeId;
    } else if (Types.TraceEvents.isTraceEventUpdateLayer(event)) {
      // We don't do anything with this event, but we need to store it because
      // the information in it determines if we need to care about future
      // snapshot events - we need to know what the active layer is when we see a
      // snapshot.
      updateLayerEvents.push(event);
    } else if (Types.TraceEvents.isTraceEventPaint(event)) {
      if (!event.args.data.layerId) {
        // Note that this check purposefully includes excluding an event with a layerId of 0.
        // 0 indicates that this paint was for a subframe - we do not want these
        // as we only care about paints for top level frames.
        continue;
      }
      paintEvents.push(event);
      lastPaintForLayerId[event.args.data.layerId] = event;
      continue;
    } else if (Types.TraceEvents.isTraceEventDisplayListItemListSnapshot(event)) {
      // First we figure out which layer is active for this event's thread. To
      // do this we work backwards through the list of UpdateLayerEvents,
      // finding the first one (i.e. the most recent one) with the same pid and
      // tid.
      let lastUpdateLayerEventForThread: Types.TraceEvents.TraceEventUpdateLayer|null = null;
      for (let i = updateLayerEvents.length - 1; i > -1; i--) {
        const updateEvent = updateLayerEvents[i];
        if (updateEvent.pid === event.pid && updateEvent.tid === event.tid) {
          lastUpdateLayerEventForThread = updateEvent;
          break;
        }
      }
      if (!lastUpdateLayerEventForThread) {
        // No active layer, so this snapshot is not relevant.
        continue;
      }
      if (lastUpdateLayerEventForThread.args.layerTreeId !== currentMainFrameLayerTreeId) {
        // Snapshot applies to a layer that is not the main frame, so discard.
        continue;
      }
      const paintEvent = lastPaintForLayerId[lastUpdateLayerEventForThread.args.layerId];
      if (!paintEvent) {
        // No paint event for this layer, so discard.
        continue;
      }
      snapshotEvents.push(event);

      // Store the relationship between the paint and the snapshot.
      paintToSnapshotMap.set(paintEvent, event);
    }
  }

  handlerState = HandlerState.FINALIZED;
}

export interface LayerTreeData {
  paints: Types.TraceEvents.TraceEventPaint[];
  snapshots: Types.TraceEvents.TraceEventDisplayItemListSnapshot[];
  paintsToSnapshots: Map<Types.TraceEvents.TraceEventPaint, Types.TraceEvents.TraceEventDisplayItemListSnapshot>;
}

export function data(): LayerTreeData {
  return {
    paints: Array.from(paintEvents),
    snapshots: Array.from(snapshotEvents),
    paintsToSnapshots: new Map(paintToSnapshotMap),
  };
}

export function deps(): TraceEventHandlerName[] {
  return ['Meta'];
}
