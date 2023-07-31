// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';
const {assert} = chai;

describeWithEnvironment('TraceModel helpers', function() {
  describe('extractOriginFromTrace', () => {
    it('extracts the origin of a parsed trace correctly', async function() {
      const model = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const origin = TraceModel.Helpers.Trace.extractOriginFromTrace(model.Meta.mainFrameURL);
      assert.strictEqual(origin, 'web.dev');
    });

    it('will remove the `www` if it is present', async function() {
      const traceEvents = await TraceLoader.traceEngine(this, 'multiple-navigations.json.gz');
      const origin = TraceModel.Helpers.Trace.extractOriginFromTrace(traceEvents.Meta.mainFrameURL);
      assert.strictEqual(origin, 'google.com');
    });

    it('returns null when no origin is found', async function() {
      const traceEvents = await TraceLoader.traceEngine(this, 'basic.json.gz');
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
        ph: TraceModel.Types.TraceEvents.Phase.METADATA,
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

  describe('sortTraceEventsInPlace', () => {
    function makeFakeEvent(ts: number, dur: number): TraceModel.Types.TraceEvents.TraceEventData {
      return {
        ts: TraceModel.Types.Timing.MicroSeconds(ts),
        dur: TraceModel.Types.Timing.MicroSeconds(dur),
      } as unknown as TraceModel.Types.TraceEvents.TraceEventData;
    }

    it('sorts by start time in ASC order', () => {
      const event1 = makeFakeEvent(1, 1);
      const event2 = makeFakeEvent(2, 1);
      const event3 = makeFakeEvent(3, 1);
      const events = [event3, event1, event2];
      TraceModel.Helpers.Trace.sortTraceEventsInPlace(events);
      assert.deepEqual(events, [event1, event2, event3]);
    });

    it('sorts by longest duration if the timestamps are the same', () => {
      const event1 = makeFakeEvent(1, 1);
      const event2 = makeFakeEvent(1, 2);
      const event3 = makeFakeEvent(1, 3);
      const events = [event1, event2, event3];
      TraceModel.Helpers.Trace.sortTraceEventsInPlace(events);
      assert.deepEqual(events, [event3, event2, event1]);
    });
  });

  describe('getNavigationForTraceEvent', () => {
    it('returns the correct navigation for a request', async function() {
      const {NetworkRequests, Meta} = await TraceLoader.traceEngine(this, 'multiple-navigations.json.gz');
      const request1 = NetworkRequests.byTime[0];
      const navigationForFirstRequest = TraceModel.Helpers.Trace.getNavigationForTraceEvent(
          request1, request1.args.data.frame, Meta.navigationsByFrameId);
      assert.isUndefined(navigationForFirstRequest?.ts);

      const request2 = NetworkRequests.byTime[1];
      const navigationForSecondRequest = TraceModel.Helpers.Trace.getNavigationForTraceEvent(
          request2, request2.args.data.frame, Meta.navigationsByFrameId);
      assert.strictEqual(navigationForSecondRequest?.ts, TraceModel.Types.Timing.MicroSeconds(636471400029));
    });

    it('returns the correct navigation for a page load event', async function() {
      const {PageLoadMetrics, Meta} = await TraceLoader.traceEngine(this, 'multiple-navigations.json.gz');
      const firstNavigationId = Meta.navigationsByNavigationId.keys().next().value;

      const fcp = PageLoadMetrics.metricScoresByFrameId.get(Meta.mainFrameId)
                      ?.get(firstNavigationId)
                      ?.get(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP);
      if (!fcp || !fcp.event) {
        assert.fail('FCP not found');
        return;
      }
      const navigationForFirstRequest =
          TraceModel.Helpers.Trace.getNavigationForTraceEvent(fcp.event, Meta.mainFrameId, Meta.navigationsByFrameId);
      assert.strictEqual(navigationForFirstRequest?.args.data?.navigationId, firstNavigationId);
    });
  });

  describe('extractId', () => {
    it('returns the correct id for an event', async () => {
      const fakeEventWithId = {id: 'id'} as unknown as TraceModel.Types.TraceEvents.TraceEventNestableAsync;
      const id = TraceModel.Helpers.Trace.extractId(fakeEventWithId);
      assert.strictEqual(id, fakeEventWithId.id);

      const fakeEventWithGlobalId2 = {id2: {global: 'globalId2'}} as unknown as
          TraceModel.Types.TraceEvents.TraceEventNestableAsync;
      const globalId2 = TraceModel.Helpers.Trace.extractId(fakeEventWithGlobalId2);
      assert.strictEqual(globalId2, fakeEventWithGlobalId2.id2?.global);

      const fakeEventWithLocalId2 = {id2: {local: 'localId2'}} as unknown as
          TraceModel.Types.TraceEvents.TraceEventNestableAsync;
      const localId2 = TraceModel.Helpers.Trace.extractId(fakeEventWithLocalId2);
      assert.strictEqual(localId2, fakeEventWithLocalId2.id2?.local);
    });
  });
  describe('mergeEventsInOrder', () => {
    it('merges two ordered arrays of trace events with no duration', async () => {
      const array1 = [
        {
          name: 'a',
          ts: 0,
        },
        {
          name: 'b',
          ts: 2,
        },
        {
          name: 'c',
          ts: 4,
        },
        {
          name: 'd',
          ts: 6,
        },
        {
          name: 'e',
          ts: 8,
        },
      ] as TraceModel.Types.TraceEvents.TraceEventData[];

      const array2 = [
        {
          name: 'a',
          ts: 1,
        },
        {
          name: 'b',
          ts: 3,
        },
        {
          name: 'c',
          ts: 5,
        },
        {
          name: 'd',
          ts: 7,
        },
        {
          name: 'e',
          ts: 9,
        },
      ] as TraceModel.Types.TraceEvents.TraceEventData[];
      const ordered = TraceModel.Helpers.Trace.mergeEventsInOrder(array1, array2);
      for (let i = 1; i < ordered.length; i++) {
        assert.isAbove(ordered[i].ts, ordered[i - 1].ts);
      }
    });
    it('merges two ordered arrays of trace events with duration', async () => {
      const array1 = [
        {
          name: 'a',
          ts: 0,
          dur: 10,
        },
        {
          name: 'b',
          ts: 2,
          dur: 12,
        },
        {
          name: 'c',
          ts: 4,
          dur: 2,
        },
        {
          name: 'd',
          ts: 6,
          dur: 9,
        },
        {
          name: 'e',
          ts: 8,
          dur: 100,
        },
      ] as TraceModel.Types.TraceEvents.TraceEventData[];

      const array2 = [
        {
          name: 'a',
          ts: 1,
          dur: 2,
        },
        {
          name: 'b',
          ts: 3,
          dur: 1,
        },
        {
          name: 'c',
          ts: 5,
          dur: 99,
        },
        {
          name: 'd',
          ts: 7,
        },
        {
          name: 'e',
          ts: 9,
          dur: 0,
        },
      ] as TraceModel.Types.TraceEvents.TraceEventData[];
      const ordered = TraceModel.Helpers.Trace.mergeEventsInOrder(array1, array2);
      for (let i = 1; i < ordered.length; i++) {
        assert.isAbove(ordered[i].ts, ordered[i - 1].ts);
      }
    });
    it('merges two ordered arrays of trace events when timestamps collide', async () => {
      const array1 = [
        {
          name: 'a',
          ts: 0,
          dur: 10,
        },
        {
          name: 'b',
          ts: 2,
          dur: 12,
        },
        {
          name: 'c',
          ts: 4,
          dur: 2,
        },
        {
          name: 'd',
          ts: 6,
          dur: 9,
        },
        {
          name: 'e',
          ts: 8,
          dur: 100,
        },
      ] as TraceModel.Types.TraceEvents.TraceEventData[];

      const array2 = [
        {
          name: 'a',
          ts: 0,
          dur: 2,
        },
        {
          name: 'b',
          ts: 2,
          dur: 1,
        },
        {
          name: 'c',
          ts: 4,
          dur: 99,
        },
        {
          name: 'd',
          ts: 7,
        },
        {
          name: 'e',
          ts: 9,
          dur: 0,
        },
      ] as TraceModel.Types.TraceEvents.TraceEventData[];
      const ordered = TraceModel.Helpers.Trace.mergeEventsInOrder(array1, array2);
      for (let i = 1; i < ordered.length; i++) {
        const dur = ordered[i].dur;
        const durPrev = ordered[i - 1].dur;
        const eventsHaveDuration = dur !== undefined && durPrev !== undefined;
        const correctOrderForSharedTimestamp =
            eventsHaveDuration && ordered[i].ts === ordered[i - 1].ts && dur <= durPrev;
        assert.isTrue(ordered[i].ts > ordered[i - 1].ts || correctOrderForSharedTimestamp);
      }
    });
    it('merges two ordered arrays of trace events when timestamps and durations collide', async () => {
      const array1 = [
        {
          name: 'a',
          ts: 0,
          dur: 10,
        },
        {
          name: 'b',
          ts: 2,
          dur: 10,
        },
        {
          name: 'c',
          ts: 4,
          dur: 10,
        },
        {
          name: 'd',
          ts: 6,
          dur: 10,
        },
        {
          name: 'e',
          ts: 8,
          dur: 10,
        },
      ] as TraceModel.Types.TraceEvents.TraceEventData[];

      const array2 = [...array1];
      const ordered = TraceModel.Helpers.Trace.mergeEventsInOrder(array1, array2);
      for (let i = 1; i < ordered.length; i++) {
        const dur = ordered[i].dur;
        const durPrev = ordered[i - 1].dur;
        const eventsHaveDuration = dur !== undefined && durPrev !== undefined;
        const correctOrderForSharedTimestamp =
            eventsHaveDuration && ordered[i].ts === ordered[i - 1].ts && dur <= durPrev;
        assert.isTrue(ordered[i].ts > ordered[i - 1].ts || correctOrderForSharedTimestamp);
      }
    });
  });
  describe('activeURLForFrameAtTime', () => {
    it('extracts the active url for a frame at a given time', async function() {
      const traceEvents = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      const frameId = '1F729458403A23CF1D8D246095129AC4';
      const firstURL = TraceModel.Helpers.Trace.activeURLForFrameAtTime(
          frameId, TraceModel.Types.Timing.MicroSeconds(251126654355), traceEvents.Meta.rendererProcessesByFrame);
      assert.strictEqual(firstURL, 'about:blank');
      const secondURL = TraceModel.Helpers.Trace.activeURLForFrameAtTime(
          frameId, TraceModel.Types.Timing.MicroSeconds(251126663398), traceEvents.Meta.rendererProcessesByFrame);
      assert.strictEqual(secondURL, 'https://www.google.com');
    });
  });
});
