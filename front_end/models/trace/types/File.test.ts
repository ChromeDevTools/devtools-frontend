// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import * as Trace from '../trace.js';

describe('Trace file types', () => {
  describe('traceEventKeyToValues', () => {
    it('converts the values for a LegacyTimelineFrame', async () => {
      const result = Trace.Types.File.traceEventKeyToValues('l-101');
      assert.deepEqual(result, {type: Trace.Types.File.EventKeyType.LEGACY_TIMELINE_FRAME, rawIndex: 101});
    });

    it('converts the values for a raw event', async () => {
      const result = Trace.Types.File.traceEventKeyToValues('r-101');
      assert.deepEqual(result, {type: Trace.Types.File.EventKeyType.RAW_EVENT, rawIndex: 101});
    });

    it('converts the values for a synthetic event', async () => {
      const result = Trace.Types.File.traceEventKeyToValues('s-101');
      assert.deepEqual(result, {type: Trace.Types.File.EventKeyType.SYNTHETIC_EVENT, rawIndex: 101});
    });

    it('converts the values for a profile call event', async () => {
      const pid = Trace.Types.Events.ProcessID(1);
      const tid = Trace.Types.Events.ThreadID(2);
      const sampleIndex = Trace.Types.Events.SampleIndex(3);
      const nodeId = 4 as Protocol.integer;

      const key = ['p', pid, tid, sampleIndex, nodeId].join('-') as Trace.Types.File.SerializableKey;
      const result = Trace.Types.File.traceEventKeyToValues(key);
      assert.deepEqual(result, {
        type: Trace.Types.File.EventKeyType.PROFILE_CALL,
        processID: pid,
        threadID: tid,
        sampleIndex,
        protocol: nodeId,
      });
    });
  });
});
