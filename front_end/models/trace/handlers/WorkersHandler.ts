// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

export interface WorkersData {
  workerSessionIdEvents: readonly Types.TraceEvents.TraceEventTracingSessionIdForWorker[];
  workerIdByThread: Map<Types.TraceEvents.ThreadID, Types.TraceEvents.WorkerId>;
  workerURLById: Map<Types.TraceEvents.WorkerId, string>;
}
let handlerState = HandlerState.UNINITIALIZED;

const sessionIdEvents: Types.TraceEvents.TraceEventTracingSessionIdForWorker[] = [];
const workerIdByThread: Map<Types.TraceEvents.ThreadID, Types.TraceEvents.WorkerId> = new Map();
const workerURLById: Map<Types.TraceEvents.WorkerId, string> = new Map();

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('Workers Handler was not reset');
  }

  handlerState = HandlerState.INITIALIZED;
}

export function reset(): void {
  sessionIdEvents.length = 0;
  workerIdByThread.clear();
  handlerState = HandlerState.UNINITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Workers Handler is not initialized');
  }
  if (Types.TraceEvents.isTraceEventTracingSessionIdForWorker(event)) {
    sessionIdEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Handler is not initialized');
  }
  for (const sessionIdEvent of sessionIdEvents) {
    if (!sessionIdEvent.args.data) {
      continue;
    }
    workerIdByThread.set(sessionIdEvent.args.data.workerThreadId, sessionIdEvent.args.data.workerId);
    workerURLById.set(sessionIdEvent.args.data.workerId, sessionIdEvent.args.data.url);
  }
  handlerState = HandlerState.FINALIZED;
}

export function data(): WorkersData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Workers Handler is not finalized');
  }

  return {
    workerSessionIdEvents: [...sessionIdEvents],
    workerIdByThread: new Map(workerIdByThread),
    workerURLById: new Map(workerURLById),
  };
}
