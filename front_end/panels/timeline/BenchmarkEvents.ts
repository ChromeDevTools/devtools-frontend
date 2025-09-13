// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../models/trace/trace.js';

export class TraceLoadEvent extends Event {
  static readonly eventName = 'traceload';

  constructor(public duration: Trace.Types.Timing.Milli) {
    super(TraceLoadEvent.eventName, {bubbles: true, composed: true});
  }
}

declare global {
  interface HTMLElementEventMap {
    [TraceLoadEvent.eventName]: TraceLoadEvent;
  }
}
