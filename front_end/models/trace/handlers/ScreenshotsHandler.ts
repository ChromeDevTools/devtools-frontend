// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {data as metaHandlerData} from './MetaHandler.js';
import {type TraceEventHandlerName} from './types.js';

// Each thread contains events. Events indicate the thread and process IDs, which are
// used to store the event in the correct process thread entry below.
const eventsInProcessThread =
    new Map<Types.TraceEvents.ProcessID, Map<Types.TraceEvents.ThreadID, Types.TraceEvents.TraceEventSnapshot[]>>();

let snapshots: Types.TraceEvents.TraceEventSnapshot[] = [];
export function reset(): void {
  eventsInProcessThread.clear();
  snapshots.length = 0;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (event.name !== 'Screenshot') {
    return;
  }

  Helpers.Trace.addEventToProcessThread(event, eventsInProcessThread);
}

export async function finalize(): Promise<void> {
  const {browserProcessId, browserThreadId} = metaHandlerData();
  const browserThreads = eventsInProcessThread.get(browserProcessId);
  if (browserThreads) {
    snapshots = browserThreads.get(browserThreadId) || [];
  }
}

export function data(): Types.TraceEvents.TraceEventSnapshot[] {
  return [...snapshots];
}

export function deps(): TraceEventHandlerName[] {
  return ['Meta'];
}
