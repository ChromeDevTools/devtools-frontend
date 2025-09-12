// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import * as Types from '../types/types.js';

interface SelectorWithStyleSheedId {
  selector: string;
  styleSheetId: string;
}

interface InvalidatedNode {
  frame: string;
  backendNodeId: Protocol.DOM.BackendNodeId;
  type: Types.Events.InvalidationEventType;
  selectorList: SelectorWithStyleSheedId[];
  ts: Types.Timing.Micro;
  tts?: Types.Timing.Micro;
  subtree:
      boolean;  // Indicates if the invalidation applies solely to the node (false) or extends to all its descendants (true)
  lastRecalcStyleEventTs: Types.Timing.Micro;
}

let lastRecalcStyleEvent: Types.Events.RecalcStyle|null = null;
let lastInvalidatedNode: InvalidatedNode|null = null;

let selectorDataForRecalcStyle = new Map<Types.Events.RecalcStyle, {
  timings: Types.Events.SelectorTiming[],
}>();

let invalidatedNodeList = new Array<InvalidatedNode>();

export function reset(): void {
  lastRecalcStyleEvent = null;
  lastInvalidatedNode = null;
  selectorDataForRecalcStyle = new Map();
  invalidatedNodeList = [];
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isStyleRecalcInvalidationTracking(event)) {
    /**
     * CSS Style substree invalidation
     * A subtree invalidation comes with two records, 1) a StyleInvalidatorInvalidationTracking
     * event 2) following with a StyleRecalcInvalidationTracking event. List of selectors and style
     * sheet ID information is stored in the 1st event. Subtree flag is stored in the 2nd
     * event.
     */
    if (event.args.data.subtree &&
        event.args.data.reason === Types.Events.StyleRecalcInvalidationReason.RELATED_STYLE_RULE &&
        lastInvalidatedNode && event.args.data.nodeId === lastInvalidatedNode.backendNodeId) {
      lastInvalidatedNode.subtree = true;
      return;
    }
  }

  if (Types.Events.isSelectorStats(event) && lastRecalcStyleEvent && event.args.selector_stats) {
    selectorDataForRecalcStyle.set(lastRecalcStyleEvent, {
      timings: event.args.selector_stats.selector_timings,
    });
    return;
  }

  if (Types.Events.isStyleInvalidatorInvalidationTracking(event)) {
    const selectorList = new Array<SelectorWithStyleSheedId>();
    event.args.data.selectors?.forEach(selector => {
      selectorList.push({
        selector: selector.selector,
        styleSheetId: selector.style_sheet_id,
      });
    });

    if (selectorList.length > 0) {
      lastInvalidatedNode = {
        frame: event.args.data.frame,
        backendNodeId: event.args.data.nodeId,
        type: Types.Events.InvalidationEventType.StyleInvalidatorInvalidationTracking,
        selectorList,
        ts: event.ts,
        tts: event.tts,
        subtree: false,
        lastRecalcStyleEventTs: lastRecalcStyleEvent ? lastRecalcStyleEvent.ts : Types.Timing.Micro(0),
      };
      invalidatedNodeList.push(lastInvalidatedNode);
    }
  }

  if (Types.Events.isRecalcStyle(event)) {
    lastRecalcStyleEvent = event;
    return;
  }
}

export async function finalize(): Promise<void> {
}

export interface SelectorStatsData {
  dataForRecalcStyleEvent: Map<Types.Events.RecalcStyle, {
    timings: Types.Events.SelectorTiming[],
  }>;
  invalidatedNodeList: InvalidatedNode[];
}

export function data(): SelectorStatsData {
  return {
    dataForRecalcStyleEvent: selectorDataForRecalcStyle,
    invalidatedNodeList,
  };
}
