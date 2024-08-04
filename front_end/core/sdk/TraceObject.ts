// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';

// A thin wrapper class, mostly to enable instanceof-based revealing of traces to open in Timeline.
export class TraceObject {
  readonly traceEvents: Protocol.Tracing.DataCollectedEvent['value'];
  readonly metadata: Object;
  constructor(traceEvents: Protocol.Tracing.DataCollectedEvent['value'], metadata: Object = {}) {
    this.traceEvents = traceEvents;
    this.metadata = metadata;
  }
}
