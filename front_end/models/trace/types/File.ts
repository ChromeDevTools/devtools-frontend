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

export const enum EventKeyType {
  RawEvent = 'r',
  SyntheticEvent = 's',
  ProfileCall = 'p',
}

// Serializable keys are created for trace events to be able to save
// references to timeline events in a trace file. These keys enable
// user modifications that can be saved. See go/cpq:event-data-json for
// more details on the key format.
export type RawEventKey = `${EventKeyType.RawEvent}-${number}`;
export type SyntheticEventKey = `${EventKeyType.SyntheticEvent}-${number}`;
export type ProfileCallKey = `${EventKeyType.ProfileCall}-${ProcessID}-${ThreadID}-${SampleIndex}-${Protocol.integer}`;
export type TraceEventSerializableKey = RawEventKey|ProfileCallKey|SyntheticEventKey;

// Serializable keys values objects contain data that maps the keys to original Trace Events
export type RawEventKeyValues = {
  type: EventKeyType.RawEvent,
  rawIndex: number,
};

export type SyntheticEventKeyValues = {
  type: EventKeyType.SyntheticEvent,
  rawIndex: number,
};

export type ProfileCallKeyValues = {
  type: EventKeyType.ProfileCall,
  processID: ProcessID,
  threadID: ThreadID,
  sampleIndex: SampleIndex,
  protocol: Protocol.integer,
};

export type TraceEventSerializableKeyValues = RawEventKeyValues|ProfileCallKeyValues|SyntheticEventKeyValues;

export interface Modifications {
  entriesModifications: {
    // Entries hidden by the user
    hiddenEntries: TraceEventSerializableKey[],
    // Entries that parent a hiddenEntry
    expandableEntries: TraceEventSerializableKey[],
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

export function traceEventKeyToValues(key: TraceEventSerializableKey): TraceEventSerializableKeyValues {
  const parts = key.split('-');
  const type = parts[0];

  switch (type) {
    case EventKeyType.ProfileCall:
      if (parts.length !== 5 ||
          !(parts.every((part, i) => i === 0 || typeof part === 'number' || !isNaN(parseInt(part, 10))))) {
        throw new Error(`Invalid ProfileCallKey: ${key}`);
      }
      return {
        type: parts[0],
        processID: parseInt(parts[1], 10),
        threadID: parseInt(parts[2], 10),
        sampleIndex: parseInt(parts[3], 10),
        protocol: parseInt(parts[4], 10),
      } as ProfileCallKeyValues;
    case EventKeyType.RawEvent:
      if (parts.length !== 2 || !(typeof parts[1] === 'number' || !isNaN(parseInt(parts[1], 10)))) {
        throw new Error(`Invalid RawEvent Key: ${key}`);
      }
      return {
        type: parts[0],
        rawIndex: parseInt(parts[1], 10),
      } as RawEventKeyValues;
    case EventKeyType.SyntheticEvent:
      if (parts.length !== 2 || !(typeof parts[1] === 'number' || !isNaN(parseInt(parts[1], 10)))) {
        throw new Error(`Invalid SyntheticEvent Key: ${key}`);
      }
      return {
        type: parts[0],
        rawIndex: parseInt(parts[1], 10),
      } as SyntheticEventKeyValues;
    default:
      throw new Error(`Unknown trace event key: ${key}`);
  }
}
