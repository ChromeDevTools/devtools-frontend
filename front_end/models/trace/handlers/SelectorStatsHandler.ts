// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

let lastUpdateLayoutTreeEvent: Types.Events.UpdateLayoutTree|null = null;

const selectorDataForUpdateLayoutTree = new Map<Types.Events.UpdateLayoutTree, {
  timings: Types.Events.SelectorTiming[],
}>();

export function reset(): void {
  lastUpdateLayoutTreeEvent = null;
  selectorDataForUpdateLayoutTree.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isSelectorStats(event) && lastUpdateLayoutTreeEvent && event.args.selector_stats) {
    selectorDataForUpdateLayoutTree.set(lastUpdateLayoutTreeEvent, {
      timings: event.args.selector_stats.selector_timings,
    });
    return;
  }

  if (Types.Events.isUpdateLayoutTree(event)) {
    lastUpdateLayoutTreeEvent = event;
    return;
  }
}

export interface SelectorStatsData {
  dataForUpdateLayoutEvent: Map<Types.Events.UpdateLayoutTree, {
    timings: Types.Events.SelectorTiming[],
  }>;
}

export function data(): SelectorStatsData {
  return {
    dataForUpdateLayoutEvent: selectorDataForUpdateLayoutTree,
  };
}
