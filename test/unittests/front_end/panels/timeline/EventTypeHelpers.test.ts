// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import {
  defaultTraceEvent,
  makeFakeSDKEventFromPayload,
  type FakeEventPayload,
  makeFakeEventPayload,
} from '../../helpers/TraceHelpers.js';

describe('EventTypeHelpers', () => {
  describe('timesForEventInMilliseconds', () => {
    it('supports SDK events', () => {
      const payload: FakeEventPayload = {
        name: 'test-event',
        ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
        categories: ['testing'],
        ts: 10_000,
        dur: 5_000,
      };
      const event = makeFakeSDKEventFromPayload(payload);
      event.selfTime = 5;
      const times = TraceEngine.Legacy.timesForEventInMilliseconds(event);
      assert.deepEqual(times, {
        startTime: TraceEngine.Types.Timing.MilliSeconds(10),
        endTime: TraceEngine.Types.Timing.MilliSeconds(15),
        duration: TraceEngine.Types.Timing.MilliSeconds(5),
        selfTime: TraceEngine.Types.Timing.MilliSeconds(5),
      });
    });

    it('sets the duration to 0 if it is not present for SDK events', () => {
      const payload: FakeEventPayload = {
        name: 'test-event',
        ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
        categories: ['testing'],
        ts: 10_000,
      };
      const event = makeFakeSDKEventFromPayload(payload);
      const times = TraceEngine.Legacy.timesForEventInMilliseconds(event);
      assert.deepEqual(times, {
        startTime: TraceEngine.Types.Timing.MilliSeconds(10),
        endTime: TraceEngine.Types.Timing.MilliSeconds(10),
        duration: TraceEngine.Types.Timing.MilliSeconds(0),
        selfTime: TraceEngine.Types.Timing.MilliSeconds(0),
      });
    });

    it('supports new engine events in timesForEventInMilliseconds', () => {
      const event: TraceEngine.Types.TraceEvents.TraceEventData = {
        ...defaultTraceEvent,
        name: 'test-event',
        ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
        ts: TraceEngine.Types.Timing.MicroSeconds(10_000),
        dur: TraceEngine.Types.Timing.MicroSeconds(5_000),
      };

      const times = TraceEngine.Legacy.timesForEventInMilliseconds(event);
      assert.deepEqual(times, {
        startTime: TraceEngine.Types.Timing.MilliSeconds(10),
        endTime: TraceEngine.Types.Timing.MilliSeconds(15),
        duration: TraceEngine.Types.Timing.MilliSeconds(5),
        selfTime: TraceEngine.Types.Timing.MilliSeconds(5),
      });
    });
    it('sets the duration to 0 if it is not present', () => {
      const event: TraceEngine.Types.TraceEvents.TraceEventData = {
        ...defaultTraceEvent,
        name: 'test-event',
        ph: TraceEngine.Types.TraceEvents.Phase.INSTANT,
        ts: TraceEngine.Types.Timing.MicroSeconds(10_000),
      };

      const times = TraceEngine.Legacy.timesForEventInMilliseconds(event);
      assert.deepEqual(times, {
        startTime: TraceEngine.Types.Timing.MilliSeconds(10),
        endTime: TraceEngine.Types.Timing.MilliSeconds(10),
        duration: TraceEngine.Types.Timing.MilliSeconds(0),
        selfTime: TraceEngine.Types.Timing.MilliSeconds(0),
      });
    });
  });
  describe('eventHasCategory', () => {
    it('supports SDK events', () => {
      const payload: FakeEventPayload = {
        name: 'test-event',
        ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
        categories: ['testing1', 'testing2'],
        ts: 10_000,
        dur: 5_000,
      };
      const event = makeFakeSDKEventFromPayload(payload);
      const hasCategory = TraceEngine.Legacy.eventHasCategory(event, 'testing2');
      const notHasCategory = TraceEngine.Legacy.eventHasCategory(event, 'not-testing');
      assert.isTrue(hasCategory);
      assert.isFalse(notHasCategory);
    });

    it('supports TraceEventData events', () => {
      const event: TraceEngine.Types.TraceEvents.TraceEventData = {
        ...defaultTraceEvent,
        name: 'test-event',
        cat: 'disabled-by-default-devtools.timeline,blink.console',
      };
      const hasCategory = TraceEngine.Legacy.eventHasCategory(event, 'blink.console');
      const notHasCategory = TraceEngine.Legacy.eventHasCategory(event, 'timeline');
      assert.isTrue(hasCategory);
      assert.isFalse(notHasCategory);
    });
  });
  describe('phaseForEvent', () => {
    it('supports SDK events', () => {
      const payload: FakeEventPayload = {
        name: 'test-event',
        ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
        categories: ['testing1', 'testing2'],
        ts: 10_000,
        dur: 5_000,
      };
      const event = makeFakeSDKEventFromPayload(payload);
      const phase = TraceEngine.Legacy.phaseForEvent(event);
      assert.strictEqual(phase, TraceEngine.Types.TraceEvents.Phase.BEGIN);
    });

    it('supports TraceEventData events', () => {
      const event: TraceEngine.Types.TraceEvents.TraceEventData = {
        ...defaultTraceEvent,
        ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
      };
      const phase = TraceEngine.Legacy.phaseForEvent(event);
      assert.strictEqual(phase, TraceEngine.Types.TraceEvents.Phase.BEGIN);
    });
  });
  describe('threadIDForEvent', () => {
    it('supports SDK events', () => {
      const fakePayload: FakeEventPayload = {
        name: 'test-event',
        ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
        categories: ['testing1', 'testing2'],
        ts: 10_000,
        dur: 5_000,
      };
      const payload = makeFakeEventPayload(fakePayload);
      const tracingModel = new TraceEngine.Legacy.TracingModel();
      const process = new TraceEngine.Legacy.Process(tracingModel, 1);
      const thread = new TraceEngine.Legacy.Thread(process, 1);
      const event = TraceEngine.Legacy.PayloadEvent.fromPayload(payload, thread);
      const threadID = TraceEngine.Legacy.threadIDForEvent(event);
      assert.strictEqual(threadID, 1);
    });

    it('supports TraceEventData events', () => {
      const event: TraceEngine.Types.TraceEvents.TraceEventData = {
        ...defaultTraceEvent,
        ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
        tid: 2 as TraceEngine.Types.TraceEvents.ThreadID,
      };
      const phase = TraceEngine.Legacy.threadIDForEvent(event);
      assert.strictEqual(phase, 2 as TraceEngine.Types.TraceEvents.ThreadID);
    });
  });
});
