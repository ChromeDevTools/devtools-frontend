// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

export interface WorkersData {
  workerSessionIdEvents: readonly Types.Events.TracingSessionIdForWorker[];
  workerIdByThread: Map<Types.Events.ThreadID, Types.Events.WorkerId>;
  workerURLById: Map<Types.Events.WorkerId, string>;
}

const sessionIdEvents: Types.Events.TracingSessionIdForWorker[] = [];
const workerIdByThread: Map<Types.Events.ThreadID, Types.Events.WorkerId> = new Map();
const workerURLById: Map<Types.Events.WorkerId, string> = new Map();

export function reset(): void {
  sessionIdEvents.length = 0;
  workerIdByThread.clear();
  workerURLById.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isTracingSessionIdForWorker(event)) {
    sessionIdEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  for (const sessionIdEvent of sessionIdEvents) {
    if (!sessionIdEvent.args.data) {
      continue;
    }
    workerIdByThread.set(sessionIdEvent.args.data.workerThreadId, sessionIdEvent.args.data.workerId);
    workerURLById.set(sessionIdEvent.args.data.workerId, sessionIdEvent.args.data.url);
  }
}

export function data(): WorkersData {
  return {
    workerSessionIdEvents: sessionIdEvents,
    workerIdByThread,
    workerURLById,
  };
}
