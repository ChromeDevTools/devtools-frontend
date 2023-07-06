// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type TraceEventData} from './TraceEvents.js';
export type TraceFile = {
  traceEvents: readonly TraceEventData[],
  metadata: MetaData,
};

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
}

export type Contents = TraceFile|TraceEventData[];
