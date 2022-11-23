// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {loadModelDataFromTraceFile} from '../../../helpers/TraceHelpers.js';
const {assert} = chai;

describe('TraceModel helpers', async () => {
  describe('extractOriginFromTrace', () => {
    it('extracts the origin of a parsed trace correctly', async () => {
      const model = await loadModelDataFromTraceFile('web-dev.json.gz');
      const origin = TraceModel.Helpers.Trace.extractOriginFromTrace(model.Meta.mainFrameURL);
      assert.strictEqual(origin, 'web.dev');
    });

    it('will remove the `www` if it is present', async () => {
      const traceEvents = await loadModelDataFromTraceFile('multiple-navigations.json.gz');
      const origin = TraceModel.Helpers.Trace.extractOriginFromTrace(traceEvents.Meta.mainFrameURL);
      assert.strictEqual(origin, 'google.com');
    });

    it('returns null when no origin is found', async () => {
      const traceEvents = await loadModelDataFromTraceFile('basic.json.gz');
      const origin = TraceModel.Helpers.Trace.extractOriginFromTrace(traceEvents.Meta.mainFrameURL);
      assert.isNull(origin);
    });
  });

  describe('addEventToProcessThread', () => {
    function makeTraceEvent(pid: TraceModel.Types.TraceEvents.ProcessID, tid: TraceModel.Types.TraceEvents.ThreadID):
        TraceModel.Types.TraceEvents.TraceEventData {
      return {
        name: 'process_name',
        tid,
        pid,
        ts: TraceModel.Types.Timing.MicroSeconds(0),
        cat: 'test',
        ph: TraceModel.Types.TraceEvents.TraceEventPhase.METADATA,
      };
    }

    function pid(x: number): TraceModel.Types.TraceEvents.ProcessID {
      return TraceModel.Types.TraceEvents.ProcessID(x);
    }
    function tid(x: number): TraceModel.Types.TraceEvents.ThreadID {
      return TraceModel.Types.TraceEvents.ThreadID(x);
    }

    const eventMap = new Map<
        TraceModel.Types.TraceEvents.ProcessID,
        Map<TraceModel.Types.TraceEvents.ThreadID, TraceModel.Types.TraceEvents.TraceEventData[]>>();

    beforeEach(() => {
      eventMap.clear();
    });

    it('will create a process and thread if it does not exist yet', async () => {
      const event = makeTraceEvent(pid(1), tid(1));
      TraceModel.Helpers.Trace.addEventToProcessThread(event, eventMap);
      assert.strictEqual(eventMap.get(pid(1))?.size, 1);
      const threadEvents = eventMap.get(pid(1))?.get(tid(1));
      assert.strictEqual(threadEvents?.length, 1);
    });

    it('adds new events to existing threads correctly', async () => {
      const event = makeTraceEvent(pid(1), tid(1));
      TraceModel.Helpers.Trace.addEventToProcessThread(event, eventMap);
      const newEvent = makeTraceEvent(pid(1), tid(1));
      TraceModel.Helpers.Trace.addEventToProcessThread(newEvent, eventMap);
      assert.deepEqual(eventMap.get(pid(1))?.get(tid(1)), [event, newEvent]);
    });
  });
});
