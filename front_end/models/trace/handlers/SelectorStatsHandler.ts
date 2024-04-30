// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

let lastUpdateLayoutTreeEvent: Types.TraceEvents.TraceEventUpdateLayoutTree|null = null;

const selectorDataForUpdateLayoutTree = new Map<Types.TraceEvents.TraceEventUpdateLayoutTree, {
  timings: Types.TraceEvents.SelectorTiming[],
}>();

export function reset(): void {
  lastUpdateLayoutTreeEvent = null;
  selectorDataForUpdateLayoutTree.clear();
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (Types.TraceEvents.isTraceEventSelectorStats(event) && lastUpdateLayoutTreeEvent && event.args.selector_stats) {
    selectorDataForUpdateLayoutTree.set(lastUpdateLayoutTreeEvent, {
      timings: event.args.selector_stats.selector_timings,
    });
    return;
  }

  if (Types.TraceEvents.isTraceEventUpdateLayoutTree(event)) {
    lastUpdateLayoutTreeEvent = event;
    return;
  }
}

export interface SelectorStatsData {
  dataForUpdateLayoutEvent: Map<Types.TraceEvents.TraceEventUpdateLayoutTree, {
    timings: Types.TraceEvents.SelectorTiming[],
  }>;
}

export function data(): SelectorStatsData {
  return {
    dataForUpdateLayoutEvent: selectorDataForUpdateLayoutTree,
  };
}
