// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
let lastUpdateLayerEvent: Types.TraceEvents.TraceEventUpdateLayer|null = null;

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
  lastUpdateLayerEvent = null;
  relevantEvents.length = 0;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('LayerTre Handler was not reset before being initialized');
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
  relevantEvents.sort((eventA, eventB) => {
    return eventA.ts - eventB.ts;
  });

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
      lastUpdateLayerEvent = event;
    } else if (Types.TraceEvents.isTraceEventPaint(event)) {
      if (event.args.data.layerId === 0) {
        // 0 indicates that this paint was for a subframe - we do not want these
        // as we only care about paints for top level frames.
        continue;
      }
      paintEvents.push(event);
      lastPaintForLayerId[event.args.data.layerId] = event;
      continue;
    } else if (Types.TraceEvents.isTraceEventDisplayListItemListSnapshot(event)) {
      if (!lastUpdateLayerEvent) {
        // No active layer, so this snapshot is not relevant.
        continue;
      }
      if (lastUpdateLayerEvent.args.layerTreeId !== currentMainFrameLayerTreeId) {
        // Snapshot applies to a layer that is not the main frame, so discard.
        continue;
      }

      const paintEvent = lastPaintForLayerId[lastUpdateLayerEvent.args.layerId];
      if (!paintEvent) {
        // No paint event for this layer, so discard.
        continue;
      }
      snapshotEvents.push(event);

      // Make sure the events belong to the same process/thread before we pair
      // them up.
      if (paintEvent.pid !== event.pid || paintEvent.tid !== event.tid) {
        continue;
      }
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
