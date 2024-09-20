// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';

import * as SDK from './sdk.js';

describe('TraceObject', () => {
  describe('constructor', () => {
    it('returns an instance with identical values', () => {
      const event: Trace.Types.Events.Event = {
        cat: 'disabled-by-default-devtools.timeline',
        name: 'thing',
        ph: Trace.Types.Events.Phase.COMPLETE,
        pid: Trace.Types.Events.ProcessID(1),
        tid: Trace.Types.Events.ThreadID(4),
        ts: Trace.Types.Timing.MicroSeconds(5e7),
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
