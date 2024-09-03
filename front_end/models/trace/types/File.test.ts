// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import * as TraceEngine from '../trace.js';

describe('TraceEngine file types', () => {
  describe('traceEventKeyToValues', () => {
    it('converts the values for a LegacyTimelineFrame', async () => {
      const result = TraceEngine.Types.File.traceEventKeyToValues('l-101');
      assert.deepEqual(result, {type: TraceEngine.Types.File.EventKeyType.LEGACY_TIMELINE_FRAME, rawIndex: 101});
    });

    it('converts the values for a raw event', async () => {
      const result = TraceEngine.Types.File.traceEventKeyToValues('r-101');
      assert.deepEqual(result, {type: TraceEngine.Types.File.EventKeyType.RAW_EVENT, rawIndex: 101});
    });

    it('converts the values for a synthetic event', async () => {
      const result = TraceEngine.Types.File.traceEventKeyToValues('s-101');
      assert.deepEqual(result, {type: TraceEngine.Types.File.EventKeyType.SYNTHETIC_EVENT, rawIndex: 101});
    });

    it('converts the values for a profile call event', async () => {
      const pid = TraceEngine.Types.TraceEvents.ProcessID(1);
      const tid = TraceEngine.Types.TraceEvents.ThreadID(2);
      const sampleIndex = TraceEngine.Types.TraceEvents.SampleIndex(3);
      const nodeId = 4 as Protocol.integer;

      const key = ['p', pid, tid, sampleIndex, nodeId].join('-') as TraceEngine.Types.File.TraceEventSerializableKey;
      const result = TraceEngine.Types.File.traceEventKeyToValues(key);
      assert.deepEqual(result, {
        type: TraceEngine.Types.File.EventKeyType.PROFILE_CALL,
        processID: pid,
        threadID: tid,
        sampleIndex,
        protocol: nodeId,
      });
    });
  });
});
