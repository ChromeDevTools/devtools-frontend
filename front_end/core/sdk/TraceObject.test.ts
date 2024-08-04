// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

import * as SDK from './sdk.js';

describe('TraceObject', () => {
  describe('constructor', () => {
    it('returns an instance with identical values', () => {
      const event: TraceEngine.Types.TraceEvents.TraceEventData = {
        cat: 'disabled-by-default-devtools.timeline',
        name: 'thing',
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        pid: TraceEngine.Types.TraceEvents.ProcessID(1),
        tid: TraceEngine.Types.TraceEvents.ThreadID(4),
        ts: TraceEngine.Types.Timing.MicroSeconds(5e7),
        args: {
          data: {frame: '0xA'},
        },
      };

      const traceEvents = [event];
      const traceObj = new SDK.TraceObject.TraceObject(traceEvents);
      assert.deepEqual(traceObj.traceEvents, traceEvents);
      assert.isTrue(traceObj instanceof SDK.TraceObject.TraceObject);
    });
  });
});
