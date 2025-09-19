// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {
  type ConsoleAPIExtensionTestData,
  makeCompleteEvent,
  makeTimingEventWithConsoleExtensionData,
  makeTimingEventWithPerformanceExtensionData,
  type PerformanceAPIExtensionTestData,
} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

export async function createEventDataFromTestInput(
    extensionData: Array<PerformanceAPIExtensionTestData|ConsoleAPIExtensionTestData>):
    Promise<Trace.Handlers.ModelHandlers.UserTimings.UserTimingsData> {
  const events: Trace.Types.Events.Event[] = [];
  for (const data of extensionData) {
    if ('detail' in data) {
      events.push(...makeTimingEventWithPerformanceExtensionData(data));
    } else {
      events.push(makeTimingEventWithConsoleExtensionData(data));
    }
  }
  events.sort((e1, e2) => e1.ts - e2.ts);
  return await createUserTimingsDataFromEvents(events);
}

async function createUserTimingsDataFromEvents(events: readonly Trace.Types.Events.Event[]):
    Promise<Trace.Handlers.ModelHandlers.UserTimings.UserTimingsData> {
  Trace.Helpers.SyntheticEvents.SyntheticEventsManager.createAndActivate(events);

  Trace.Handlers.ModelHandlers.UserTimings.reset();
  for (const event of events) {
    Trace.Handlers.ModelHandlers.UserTimings.handleEvent(event);
  }
  await Trace.Handlers.ModelHandlers.UserTimings.finalize();
  return Trace.Handlers.ModelHandlers.UserTimings.data();
}

describeWithEnvironment('UserTimingsHandler', function() {
  let timingsData: Trace.Handlers.ModelHandlers.UserTimings.UserTimingsData;
  describe('performance timings', function() {
    async function getTimingsDataFromEvents(events: readonly Trace.Types.Events.Event[]):
        Promise<Trace.Handlers.ModelHandlers.UserTimings.UserTimingsData> {
      Trace.Handlers.ModelHandlers.UserTimings.reset();
      for (const event of events) {
        Trace.Handlers.ModelHandlers.UserTimings.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.UserTimings.finalize();
      return Trace.Handlers.ModelHandlers.UserTimings.data();
    }
    beforeEach(async function() {
      const events = await TraceLoader.rawEvents(this, 'user-timings.json.gz');
      timingsData = await getTimingsDataFromEvents(events);
    });
    afterEach(function() {
      Trace.Handlers.ModelHandlers.UserTimings.reset();
    });
    describe('performance.measure events parsing', function() {
      it('parses the start and end events and returns a list of blocks', async () => {
        assert.lengthOf(timingsData.performanceMeasures, 3);
        assert.strictEqual(
            Trace.Helpers.Trace.extractId(timingsData.performanceMeasures[1]),
            'blink.user_timing:0x9072211:first measure');
        assert.strictEqual(timingsData.performanceMeasures[1].name, 'first measure');
        assert.strictEqual(
            Trace.Helpers.Trace.extractId(timingsData.performanceMeasures[0]),
            'blink.user_timing:0x6ece31c8:second measure');
        assert.strictEqual(timingsData.performanceMeasures[0].name, 'second measure');
        assert.strictEqual(
            Trace.Helpers.Trace.extractId(timingsData.performanceMeasures[2]),
            'blink.user_timing:0x10c31982:third measure');
        assert.strictEqual(timingsData.performanceMeasures[2].name, 'third measure');

        // Ensure we assign begin + end the right way round by making sure the
        // beginEvent is the ASYNC_NESTABLE_START and the endEvent is the
        // ASYNC_NESTABLE_END.
        for (let i = 0; i < timingsData.performanceMeasures.length; i++) {
          assert.strictEqual(
              timingsData.performanceMeasures[i].args.data.beginEvent.ph,
              Trace.Types.Events.Phase.ASYNC_NESTABLE_START);
          assert.strictEqual(
              timingsData.performanceMeasures[i].args.data.endEvent.ph, Trace.Types.Events.Phase.ASYNC_NESTABLE_END);
        }
      });

      it('sorts the blocks to ensure they are in time order', async function() {
        const events = await TraceLoader.rawEvents(this, 'user-timings.json.gz');
        Trace.Handlers.ModelHandlers.UserTimings.reset();
        // Reverse the array so that the events are in the wrong order.
        // This _shouldn't_ ever happen in a real trace, but it's best for us to
        // sort the blocks once we've parsed them just in case.
        const reversed = events.slice().reverse();
        for (const event of reversed) {
          Trace.Handlers.ModelHandlers.UserTimings.handleEvent(event);
        }
        await Trace.Handlers.ModelHandlers.UserTimings.finalize();
        const data = Trace.Handlers.ModelHandlers.UserTimings.data();
        assert.lengthOf(data.performanceMeasures, 3);
        assert.isTrue(data.performanceMeasures[0].ts <= data.performanceMeasures[1].ts);
        assert.isTrue(data.performanceMeasures[1].ts <= data.performanceMeasures[2].ts);
      });

      it('calculates the duration correctly from the begin/end event timestamps', async function() {
        for (const timing of timingsData.performanceMeasures) {
          // Ensure for each timing pair we've set the dur correctly.
          assert.strictEqual(timing.dur, timing.args.data.endEvent.ts - timing.args.data.beginEvent.ts);
        }
      });
      it('correctly extracts nested timings in the correct order', async function() {
        const {data} = await TraceLoader.traceEngine(this, 'user-timings-complex.json.gz');
        const complexTimingsData = data.UserTimings;
        const userTimingEventNames = [];
        for (const event of complexTimingsData.performanceMeasures) {
          // This trace has multiple user timings events, in this instance we only care about the ones that include 'nested' in the name.
          if (event.name.includes('nested')) {
            userTimingEventNames.push(event.name);
          }
        }
        assert.deepEqual(userTimingEventNames, [
          'nested-a',
          'nested-b',
          'nested-c',
          'nested-d',
        ]);
      });
      it('correctly orders measures when one measure encapsulates the others', async function() {
        const events = await TraceLoader.rawEvents(this, 'user-timings-complex.json.gz');
        const complexTimingsData = await getTimingsDataFromEvents(events);
        const userTimingEventNames = [];
        for (const event of complexTimingsData.performanceMeasures) {
          // This trace has multiple user timings events, in this instance we only care about the ones that start with 'duration'
          if (event.name.startsWith('duration')) {
            userTimingEventNames.push(event.name);
          }
        }
        assert.deepEqual(userTimingEventNames, [
          'durationTimeTotal',
          'durationTime1',
          'durationTime2',
        ]);
      });
    });
    describe('performance.mark events parsing', function() {
      it('parses performance mark events correctly', function() {
        assert.lengthOf(timingsData.performanceMarks, 2);
        assert.strictEqual(timingsData.performanceMarks[0].name, 'mark1');
        assert.strictEqual(timingsData.performanceMarks[1].name, 'mark3');
      });
    });
  });

  describe('console timings', function() {
    beforeEach(async function() {
      const {data} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
      timingsData = data.UserTimings;
    });
    describe('console.time events parsing', function() {
      it('parses the start and end events and returns a list of blocks', async () => {
        assert.lengthOf(timingsData.consoleTimings, 3);
        assert.strictEqual(
            Trace.Helpers.Trace.extractId(timingsData.consoleTimings[0]),
            'blink.console:0x12c00282160:first console time');
        assert.strictEqual(timingsData.consoleTimings[0].name, 'first console time');
        assert.strictEqual(
            Trace.Helpers.Trace.extractId(timingsData.consoleTimings[1]),
            'blink.console:0x12c00282160:second console time');
        assert.strictEqual(timingsData.consoleTimings[1].name, 'second console time');

        // Ensure we assign begin + end the right way round by making sure the
        // beginEvent is the ASYNC_NESTABLE_START and the endEvent is the
        // ASYNC_NESTABLE_END.
        for (let i = 0; i < timingsData.consoleTimings.length; i++) {
          assert.strictEqual(
              timingsData.consoleTimings[i].args.data.beginEvent.ph, Trace.Types.Events.Phase.ASYNC_NESTABLE_START);
          assert.strictEqual(
              timingsData.consoleTimings[i].args.data.endEvent.ph, Trace.Types.Events.Phase.ASYNC_NESTABLE_END);
        }
      });

      it('sorts the blocks to ensure they are in time order', async function() {
        const events = await TraceLoader.rawEvents(this, 'timings-track.json.gz');
        Trace.Handlers.ModelHandlers.UserTimings.reset();
        // Reverse the array so that the events are in the wrong order.
        // This _shouldn't_ ever happen in a real trace, but it's best for us to
        // sort the blocks once we've parsed them just in case.
        const reversed = events.slice().reverse();
        for (const event of reversed) {
          Trace.Handlers.ModelHandlers.UserTimings.handleEvent(event);
        }
        await Trace.Handlers.ModelHandlers.UserTimings.finalize();
        const data = Trace.Handlers.ModelHandlers.UserTimings.data();
        assert.lengthOf(data.consoleTimings, 3);
        assert.isTrue(data.consoleTimings[0].ts <= data.consoleTimings[1].ts);
        assert.isTrue(data.consoleTimings[1].ts <= data.consoleTimings[2].ts);
      });

      it('calculates the duration correctly from the begin/end event timestamps', async () => {
        for (const consoleTiming of timingsData.consoleTimings) {
          // Ensure for each timing pair we've set the dur correctly.
          assert.strictEqual(
              consoleTiming.dur, consoleTiming.args.data.endEvent.ts - consoleTiming.args.data.beginEvent.ts);
        }
      });
    });
    describe('console.timestamp events parsing', function() {
      it('parses console.timestamp events correctly', async function() {
        assert.lengthOf(timingsData.timestampEvents, 3);
        assert.strictEqual(timingsData.timestampEvents[0].args.data?.message, 'a timestamp');
        assert.strictEqual(timingsData.timestampEvents[1].args.data?.message, 'another timestamp');
        assert.strictEqual(timingsData.timestampEvents[2].args.data?.message, 'yet another timestamp');
      });
    });
  });

  describe('UserTiming::Measure events parsing', function() {
    it('stores user timing events by trace id', async function() {
      const userTimingMeasure = makeCompleteEvent(Trace.Types.Events.Name.USER_TIMING_MEASURE, 0, 100, 'cat', 0, 0) as
          Trace.Types.Events.UserTimingMeasure;
      userTimingMeasure.args.traceId = 1;
      Trace.Handlers.ModelHandlers.UserTimings.handleEvent(userTimingMeasure);
      await Trace.Handlers.ModelHandlers.UserTimings.finalize();
      const data = Trace.Handlers.ModelHandlers.UserTimings.data();
      assert.lengthOf(data.measureTraceByTraceId, 1);
      assert.deepEqual([...data.measureTraceByTraceId.entries()][0], [1, userTimingMeasure]);
    });
  });

  describe('parsing user timings events', function() {
    let userTimingsHandlerOutput: Trace.Handlers.ModelHandlers.UserTimings.UserTimingsData;
    beforeEach(async function() {
      userTimingsHandlerOutput = await createUserTimingsDataExample();
    });
    after(() => {
      Trace.Handlers.ModelHandlers.UserTimings.reset();
    });

    function createUserTimingsDataExample(): Promise<Trace.Handlers.ModelHandlers.UserTimings.UserTimingsData> {
      const extensionData: Array<ConsoleAPIExtensionTestData|PerformanceAPIExtensionTestData> = [
        // Two events for Track 1 via PerformanceAPIExtensionTestData.
        // Add B first, so that they get reordered alphabetically (A first, then B).
        {
          name: 'B-extension-track-1',
          ts: 800,
          dur: 100,
          detail: {
            devtools: {color: 'error', dataType: 'marker', track: 'Track 1'},
          },
        } as PerformanceAPIExtensionTestData,
        {
          name: 'A-extension-track-1',
          ts: 800,
          dur: 100,
          detail: {
            devtools: {color: 'error', dataType: 'marker', track: 'Track 1'},
          },
        } as PerformanceAPIExtensionTestData,

        // Do the same for Track 2.
        {
          name: 'B-extension-track-2',
          ts: 800,
          dur: 100,
          detail: {
            devtools: {color: 'error', dataType: 'marker', track: 'Track 2'},
          },
        } as PerformanceAPIExtensionTestData,
        {
          name: 'A-extension-track-2',
          ts: 800,
          dur: 100,
          detail: {
            devtools: {color: 'error', dataType: 'marker', track: 'Track 2'},
          },
        } as PerformanceAPIExtensionTestData,

        // Two events for Track 0 via ConsoleAPIExtensionTestData.
        {
          name: 'B-timestamp',
          start: 600,
          end: 700,
          track: 'Track 0',
          ts: 600,
        } as ConsoleAPIExtensionTestData,
        {
          name: 'A-timestamp',
          start: 600,
          end: 700,
          track: 'Track 0',
          ts: 600,
        } as ConsoleAPIExtensionTestData,

        // Two events (for no track) which means they get added to the user timing track.
        {
          name: 'B-timing-track',
          start: 800,
          end: 900,
          ts: 800,
        } as PerformanceAPIExtensionTestData,
        {
          name: 'A-timing-track',
          start: 800,
          end: 900,
          ts: 800,
        } as PerformanceAPIExtensionTestData,
      ];
      return createEventDataFromTestInput(extensionData);
    }

    describe('user timings parsing', function() {
      it('no console timings should have been parsed', async () => {
        assert.lengthOf(userTimingsHandlerOutput.consoleTimings, 0);
      });
      it('parsing should reveal four timestamp events', async () => {
        const events = userTimingsHandlerOutput.timestampEvents;
        assert.lengthOf(events, 4);
        assert.strictEqual(events[0].args.data?.message, 'A-timestamp');
        assert.strictEqual(events[1].args.data?.message, 'B-timestamp');
        assert.strictEqual(events[2].args.data?.message, 'A-timing-track');
        assert.strictEqual(events[3].args.data?.message, 'B-timing-track');
      });
      it('no performance marks should have been parsed', async () => {
        assert.lengthOf(userTimingsHandlerOutput.performanceMarks, 0);
      });
      it('parsing should reveal four performance measures', async () => {
        const events = userTimingsHandlerOutput.performanceMeasures;
        assert.lengthOf(events, 4);
        assert.strictEqual(events[0].name, 'A-extension-track-1');
        assert.strictEqual(events[1].name, 'B-extension-track-1');
        assert.strictEqual(events[2].name, 'A-extension-track-2');
        assert.strictEqual(events[3].name, 'B-extension-track-2');
      });
      it('no measure traces should have been set', async () => {
        assert.lengthOf(userTimingsHandlerOutput.measureTraceByTraceId, 0);
      });
    });
  });

  describe('sorting function userTimingComparator', () => {
    function makeFakeSyntheticEvent(
        ts: number, dur: number, name: string, track: string): Trace.Types.Events.SyntheticEventPair {
      const beginEvent = makeCompleteEvent(name, ts, dur, 'blink.user_timing', 0, 0) as unknown as
          Trace.Types.Events.PerformanceMeasureBegin;
      beginEvent.ph = Trace.Types.Events.Phase.ASYNC_NESTABLE_START;
      beginEvent.args.detail = JSON.stringify({devtools: {track}});
      const endEvent = makeCompleteEvent(name, ts + dur, 0, 'blink.user_timing', 0, 0) as unknown as
          Trace.Types.Events.PerformanceMeasureEnd;
      endEvent.ph = Trace.Types.Events.Phase.ASYNC_NESTABLE_END;
      const syntheticEvent = Trace.Helpers.SyntheticEvents.SyntheticEventsManager
                                 .registerSyntheticEvent<Trace.Types.Events.SyntheticUserTimingPair>({
                                   rawSourceEvent: beginEvent,
                                   name,
                                   cat: 'blink.user_timing',
                                   ts: Trace.Types.Timing.Micro(ts),
                                   dur: Trace.Types.Timing.Micro(dur),
                                   args: {data: {beginEvent, endEvent}},
                                   ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
                                   pid: Trace.Types.Events.ProcessID(0),
                                   tid: Trace.Types.Events.ThreadID(0),
                                 });
      return syntheticEvent;
    }

    function makeFakeConsoleTimestampEvent(
        start: number, end: number, name: string, track: string): Trace.Types.Events.ConsoleTimeStamp {
      return {
        cat: 'devtools.timeline',
        pid: Trace.Types.Events.ProcessID(2017),
        tid: Trace.Types.Events.ThreadID(259),
        name: Trace.Types.Events.Name.TIME_STAMP,
        args: {
          data: {
            message: name,
            start,
            end,
            track,
          },
        },
        ts: Trace.Types.Timing.Micro(start),
        ph: Trace.Types.Events.Phase.INSTANT,
      };
    }

    function sortAll(events: Array<Trace.Types.Events.SyntheticEventPair|Trace.Types.Events.ConsoleTimeStamp>) {
      events.sort((a, b) => Trace.Handlers.ModelHandlers.UserTimings.userTimingComparator(a, b, [...events]));
    }

    it('sorts synthetic events by start time in ASC order', () => {
      const event1 = makeFakeSyntheticEvent(1, 1, 'E1', 'Track A');
      const event2 = makeFakeSyntheticEvent(2, 1, 'E2', 'Track A');
      const event3 = makeFakeSyntheticEvent(3, 1, 'E3', 'Track A');
      const events = [event3, event1, event2];

      sortAll(events);
      assert.deepEqual(events, [event1, event2, event3]);
    });

    it('sorts synthetic events by longest duration if start is the same for all', () => {
      const event1 = makeFakeSyntheticEvent(1, 1, 'E1', 'Track A');
      const event2 = makeFakeSyntheticEvent(1, 2, 'E2', 'Track A');
      const event3 = makeFakeSyntheticEvent(1, 3, 'E3', 'Track A');
      const events = [event1, event2, event3];

      sortAll(events);
      assert.deepEqual(events, [event3, event2, event1]);
    });

    it('flips synthetic events if the timestamps are the same', () => {
      const event1 = makeFakeSyntheticEvent(1, 2, 'E1', 'Track A');
      const event2 = makeFakeSyntheticEvent(1, 2, 'E2', 'Track A');
      const event3 = makeFakeSyntheticEvent(2, 4, 'E3', 'Track B');
      const event4 = makeFakeSyntheticEvent(2, 4, 'E4', 'Track B');
      const events = [event1, event2, event3, event4];

      sortAll(events);
      assert.deepEqual(events, [event2, event1, event4, event3]);
    });

    it('wont flip synthetic events across tracks', () => {
      const event1 = makeFakeSyntheticEvent(1, 2, 'E1', 'Track A');
      const event2 = makeFakeSyntheticEvent(1, 2, 'E2', 'Track B');
      const event3 = makeFakeSyntheticEvent(1, 2, 'E3', 'Track C');
      const event4 = makeFakeSyntheticEvent(1, 2, 'E4', 'Track D');
      const events = [event1, event2, event3, event4];

      sortAll(events);
      assert.deepEqual(events, [event1, event2, event3, event4]);
    });

    it('sorts three identical synthetic events correctly', () => {
      const event1 = makeFakeSyntheticEvent(1, 2, 'E1', 'Track A');
      const event2 = makeFakeSyntheticEvent(1, 2, 'E2', 'Track A');
      const event3 = makeFakeSyntheticEvent(1, 2, 'E3', 'Track A');
      const events = [event1, event2, event3];

      sortAll(events);
      assert.deepEqual(events, [event3, event2, event1]);
    });

    it('sorts console timestamps by start time in ASC order', () => {
      const event1 = makeFakeConsoleTimestampEvent(1, 1, 'E1', 'Track A');
      const event2 = makeFakeConsoleTimestampEvent(2, 1, 'E2', 'Track A');
      const event3 = makeFakeConsoleTimestampEvent(3, 1, 'E3', 'Track A');
      const events = [event3, event1, event2];

      sortAll(events);
      assert.deepEqual(events, [event1, event2, event3]);
    });

    it('sorts console timestamps by longest duration if start is the same for all', () => {
      const event1 = makeFakeConsoleTimestampEvent(1, 1, 'E1', 'Track A');
      const event2 = makeFakeConsoleTimestampEvent(1, 2, 'E2', 'Track A');
      const event3 = makeFakeConsoleTimestampEvent(1, 3, 'E3', 'Track A');
      const events = [event1, event2, event3];

      sortAll(events);
      assert.deepEqual(events, [event3, event2, event1]);
    });

    it('flips console timestamps if the timestamps are the same', () => {
      const event1 = makeFakeConsoleTimestampEvent(1, 3, 'E1', 'Track A');
      const event2 = makeFakeConsoleTimestampEvent(1, 3, 'E2', 'Track A');
      const event3 = makeFakeConsoleTimestampEvent(2, 6, 'E3', 'Track B');
      const event4 = makeFakeConsoleTimestampEvent(2, 6, 'E4', 'Track B');
      const events = [event1, event2, event3, event4];

      sortAll(events);
      assert.deepEqual(events, [event2, event1, event4, event3]);
    });

    it('wont flip console timestamps across tracks', () => {
      const event1 = makeFakeConsoleTimestampEvent(1, 2, 'E1', 'Track A');
      const event2 = makeFakeConsoleTimestampEvent(1, 2, 'E2', 'Track B');
      const event3 = makeFakeConsoleTimestampEvent(1, 2, 'E3', 'Track C');
      const event4 = makeFakeConsoleTimestampEvent(1, 2, 'E4', 'Track D');
      const events = [event1, event2, event3, event4];

      sortAll(events);
      assert.deepEqual(events, [event1, event2, event3, event4]);
    });

    it('sorts three identical console timestamp events', () => {
      const event1 = makeFakeConsoleTimestampEvent(1, 2, 'E1', 'Track A');
      const event2 = makeFakeConsoleTimestampEvent(1, 2, 'E2', 'Track A');
      const event3 = makeFakeConsoleTimestampEvent(1, 2, 'E3', 'Track A');
      const events = [event1, event2, event3];

      sortAll(events);
      assert.deepEqual(events, [event3, event2, event1]);
    });

    // Mixed synthetic events and console timestamps.

    it('sorts mixed events by start time in ASC order', () => {
      const event1a = makeFakeSyntheticEvent(1, 1, 'E1a', 'Track A');
      const event1b = makeFakeConsoleTimestampEvent(1, 1, 'E1b', 'Track A');
      const event2a = makeFakeSyntheticEvent(2, 1, 'E2a', 'Track A');
      const event2b = makeFakeConsoleTimestampEvent(2, 1, 'E2b', 'Track A');
      const event3a = makeFakeSyntheticEvent(3, 1, 'E3a', 'Track A');
      const event3b = makeFakeConsoleTimestampEvent(3, 1, 'E3b', 'Track A');
      const events = [event3b, event3a, event1b, event1a, event2b, event2a];

      sortAll(events);
      assert.deepEqual(events, [event1a, event1b, event2a, event2b, event3a, event3b]);
    });

    it('wont flip mixed events across tracks', () => {
      const event1a = makeFakeSyntheticEvent(1, 2, 'E1a', 'Track A');
      const event2a = makeFakeSyntheticEvent(1, 2, 'E2a', 'Track B');
      const event3a = makeFakeSyntheticEvent(1, 2, 'E3a', 'Track C');
      const event4a = makeFakeSyntheticEvent(1, 2, 'E4a', 'Track D');
      const event1b = makeFakeConsoleTimestampEvent(1, 2, 'E1b', 'Track E');
      const event2b = makeFakeConsoleTimestampEvent(1, 2, 'E2b', 'Track F');
      const event3b = makeFakeConsoleTimestampEvent(1, 2, 'E3b', 'Track G');
      const event4b = makeFakeConsoleTimestampEvent(1, 2, 'E4b', 'Track H');
      const events = [event1a, event2a, event3a, event4a, event1b, event2b, event3b, event4b];

      sortAll(events);
      assert.deepEqual(events, [event1a, event2a, event3a, event4a, event1b, event2b, event3b, event4b]);
    });
  });

  describe('parsing performance.measures with re-used IDs', () => {
    const {
      microToMilli,
    } = Trace.Helpers.Timing;
    const {Micro} = Trace.Types.Timing;

    let measures: readonly Trace.Types.Events.SyntheticUserTimingPair[] = [];
    let traceBoundMin: Trace.Types.Timing.Micro;

    /**
     * Get the start & end time for a perf.measure, accounting for the min trace time.
     * The numbers are converted to Milliseconds and then rounded. We don't
     * care about the exact precise timings, but we can use this to check the
     * ordering of the events is correct as it's important the handler returns
     * them in the right order.
     */
    function roundedMilliTimings(events: readonly Trace.Types.Events.SyntheticUserTimingPair[]):
        Array<{start: number, end: number}> {
      return events.map(e => {
        return {
          start: Number(microToMilli(Micro(e.ts - traceBoundMin)).toFixed(0)),
          end: Number(microToMilli(Micro(e.ts + e.dur - traceBoundMin)).toFixed(0)),
        };
      });
    }

    before(async function() {
      const {data} = await TraceLoader.traceEngine(this, 'user-timings-overlaps.json.gz');

      measures = data.UserTimings.performanceMeasures;
      traceBoundMin = data.Meta.traceBounds.min;
    });

    it('can parse pairs that are non-unique across non-overlapping measures', async () => {
      // const name = 'ConsecutiveNonOverlapping';
      // const start = performance.now();
      // performance.measure(name, {
      //   start: start,
      //   end: start + 500,
      // });
      // performance.measure(name, {
      //   start: start + 500,
      //   end: start + 1000,
      // });
      // }

      const nonOverlappingMeasures = measures.filter(e => {
        return e.name === 'ConsecutiveNonOverlapping';
      });
      assert.lengthOf(nonOverlappingMeasures, 2);
      assert.deepEqual(roundedMilliTimings(nonOverlappingMeasures), [
        {start: 135, end: 635},
        {start: 635, end: 1135},
      ]);
    });

    it('can parse pairs that are overlapping but not parent > child', async () => {
      // const name = 'OverlappingNonNested';
      // const start = performance.now();

      // performance.measure(name, {
      //   start: start,
      //   end: start + 500,
      // });
      // performance.measure(name, {
      //   start: start + 100,
      //   end: start + 600,
      // });
      const overlappingMeasures = measures.filter(e => {
        return e.name === 'OverlappingNonNested';
      });
      assert.lengthOf(overlappingMeasures, 2);
      assert.deepEqual(roundedMilliTimings(overlappingMeasures), [
        {start: 2035, end: 2535},
        {start: 2135, end: 2635},
      ]);
    });

    it('can parse pairs that are overlapping and parent > child', async () => {
      // const name = 'OverlappingNested';
      // const start = performance.now();

      // performance.measure(name, {
      //   start: start,
      //   end: start + 500,
      // });
      // performance.measure(name, {
      //   start: start + 100,
      //   end: start + 200,
      // });

      const overlappingMeasures = measures.filter(e => {
        return e.name === 'OverlappingNested';
      });
      assert.lengthOf(overlappingMeasures, 2);
      assert.deepEqual(roundedMilliTimings(overlappingMeasures), [
        {start: 3035, end: 3535},
        {start: 3135, end: 3235},
      ]);
    });
  });
});
