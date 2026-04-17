// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as StackTrace from '../stack_trace/stack_trace.js';

export class SymbolizedError {
  readonly remoteError: SDK.RemoteObject.RemoteError;
  readonly stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace;
  readonly cause: SymbolizedError|null;

  constructor(
      remoteError: SDK.RemoteObject.RemoteError, stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace,
      cause: SymbolizedError|null) {
    this.remoteError = remoteError;
    this.stackTrace = stackTrace;
    this.cause = cause;
  }
}
