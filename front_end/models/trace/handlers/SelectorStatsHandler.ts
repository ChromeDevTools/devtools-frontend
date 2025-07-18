// Copyright 2024 The Chromium Authors. All rights reserved.
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
  lastUpdateLayoutTreeEventTs: Types.Timing.Micro;
}

let lastUpdateLayoutTreeEvent: Types.Events.UpdateLayoutTree|null = null;
let lastInvalidatedNode: InvalidatedNode|null = null;

const selectorDataForUpdateLayoutTree = new Map<Types.Events.UpdateLayoutTree, {
  timings: Types.Events.SelectorTiming[],
}>();

const invalidatedNodeList = new Array<InvalidatedNode>();

export function reset(): void {
  lastUpdateLayoutTreeEvent = null;
  lastInvalidatedNode = null;
  selectorDataForUpdateLayoutTree.clear();
  invalidatedNodeList.length = 0;
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

  if (Types.Events.isSelectorStats(event) && lastUpdateLayoutTreeEvent && event.args.selector_stats) {
    selectorDataForUpdateLayoutTree.set(lastUpdateLayoutTreeEvent, {
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
        lastUpdateLayoutTreeEventTs: lastUpdateLayoutTreeEvent ? lastUpdateLayoutTreeEvent.ts : Types.Timing.Micro(0),
      };
      invalidatedNodeList.push(lastInvalidatedNode);
    }
  }

  if (Types.Events.isUpdateLayoutTree(event)) {
    lastUpdateLayoutTreeEvent = event;
    return;
  }
}

export async function finalize(): Promise<void> {
}

export interface SelectorStatsData {
  dataForUpdateLayoutEvent: Map<Types.Events.UpdateLayoutTree, {
    timings: Types.Events.SelectorTiming[],
  }>;
  invalidatedNodeList: InvalidatedNode[];
}

export function data(): SelectorStatsData {
  return {
    dataForUpdateLayoutEvent: selectorDataForUpdateLayoutTree,
    invalidatedNodeList,
  };
}
