// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type TraceWindowMicroSeconds} from './Timing.js';
import {type TraceEventData} from './TraceEvents.js';

export type TraceFile = {
  traceEvents: readonly TraceEventData[],
  metadata: MetaData,
};

export interface Breadcrumb {
  window: TraceWindowMicroSeconds;
  child: Breadcrumb|null;
}

export const enum DataOrigin {
  CPUProfile = 'CPUProfile',
  TraceEvents = 'TraceEvents',
}
export interface Modifications {
  entriesFilterModifications: {
    hiddenEntriesIndexes: number[],
    expandableEntriesIndexes: number[],
  };
  initialBreadcrumb: Breadcrumb;
}

/**
 * Trace metadata that we persist to the file. This will allow us to
 * store specifics for the trace, e.g., which tracks should be visible
 * on load.
 */
export interface MetaData {
  source?: 'DevTools';
  startTime?: string;
  networkThrottling?: string;
  cpuThrottling?: number;
  hardwareConcurrency?: number;
  dataOrigin?: DataOrigin;
  modifications?: Modifications;
}

export type Contents = TraceFile|TraceEventData[];
