// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

export interface WorkersData {
  workerSessionIdEvents: readonly Types.TraceEvents.TraceEventTracingSessionIdForWorker[];
}

const sessionIdEvents: Types.TraceEvents.TraceEventTracingSessionIdForWorker[] = [];

export function reset(): void {
  sessionIdEvents.length = 0;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (Types.TraceEvents.isTraceEventTracingSessionIdForWorker(event)) {
    sessionIdEvents.push(event);
  }
}

export function data(): WorkersData {
  return {
    workerSessionIdEvents: [...sessionIdEvents],
  };
}
