// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Protocol from '../../../generated/protocol.js';

import {type TraceWindowMicroSeconds} from './Timing.js';
import {type ProcessID, type SampleIndex, type ThreadID, type TraceEventData} from './TraceEvents.js';

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

// Serializable keys are created for trace events to be able to save
// references to timeline events in a trace file. These keys enable
// user modifications that can be saved. See go/cpq:event-data-json for
// more details on the key format.
export type RawEventKey = ['r', number];
export type ProfileCallKey = ['p', ProcessID, ThreadID, SampleIndex, Protocol.integer];
export type SyntheticEventKey = ['s', number];
export type TraceEventSerializableKey = RawEventKey|ProfileCallKey|SyntheticEventKey;

export interface Modifications {
  entriesModifications: {
    // Entries hidden by the user
    hiddenEntries: string[],
    // Entries that parent a hiddenEntry
    expandableEntries: string[],
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
