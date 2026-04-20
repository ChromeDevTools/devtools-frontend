// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as StackTrace from '../stack_trace/stack_trace.js';

export class SymbolizedError extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly remoteError: SDK.RemoteObject.RemoteError;
  readonly stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace;
  readonly cause: SymbolizedError|null;

  constructor(
      remoteError: SDK.RemoteObject.RemoteError, stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace,
      cause: SymbolizedError|null) {
    super();
    this.remoteError = remoteError;
    this.stackTrace = stackTrace;
    this.cause = cause;

    this.stackTrace.addEventListener(StackTrace.StackTrace.Events.UPDATED, this.#fireUpdated, this);
    this.cause?.addEventListener(Events.UPDATED, this.#fireUpdated, this);
  }

  dispose(): void {
    this.stackTrace.removeEventListener(StackTrace.StackTrace.Events.UPDATED, this.#fireUpdated, this);
    this.cause?.removeEventListener(Events.UPDATED, this.#fireUpdated, this);
    this.cause?.dispose();
  }

  #fireUpdated(): void {
    this.dispatchEventToListeners(Events.UPDATED);
  }
}

export const enum Events {
  UPDATED = 'UPDATED',
}

export interface EventTypes {
  [Events.UPDATED]: void;
}
