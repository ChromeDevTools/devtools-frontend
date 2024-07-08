// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../trace.js';

describe('ExtensionTraceDataHandler', function() {
  let extensionData: TraceModel.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData;

  let idCounter = 0;
  function makeTimingEventWithExtensionData(
      {name, ts: tsMicro, detail, dur: durMicro}: {name: string, ts: number, detail: unknown, dur?: number}):
      TraceModel.Types.TraceEvents.TraceEventData[] {
    const isMark = durMicro === undefined;
    const currentId = idCounter++;
    const traceEventBase = {
      cat: 'blink.user_timing',
      pid: TraceModel.Types.TraceEvents.ProcessID(2017),
      tid: TraceModel.Types.TraceEvents.ThreadID(259),
      id2: {local: `${currentId}`},
    };

    const stringDetail = JSON.stringify(detail);
    const args = isMark ? {data: {detail: stringDetail}} : {detail: stringDetail};
    const firstEvent = {
      args,
      name,
      ph: isMark ? TraceModel.Types.TraceEvents.Phase.INSTANT : TraceModel.Types.TraceEvents.Phase.ASYNC_NESTABLE_START,
      ts: TraceModel.Types.Timing.MicroSeconds(tsMicro),
      ...traceEventBase,
    } as TraceModel.Types.TraceEvents.TraceEventData;
    if (isMark) {
      return [firstEvent];
    }
    return [
      firstEvent,
      {
        name,
        ...traceEventBase,
        ts: TraceModel.Types.Timing.MicroSeconds(tsMicro + (durMicro || 0)),
        ph: TraceModel.Types.TraceEvents.Phase.ASYNC_NESTABLE_END,
      },
    ];
  }

  async function fakeTraceExtensionData():
      Promise<TraceModel.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
    const extensionData = [
      {
        detail: {
          devtools: {
            color: 'error',
            dataType: 'marker',
            detailsPairs: [['Description', 'This marks the start of a task']],
            hintText: 'A mark',
          },
        },
        name: 'A custom mark',
        ts: 100,
      },
      // Marker with invalid dataType
      {
        detail: {devtools: {color: 'error', dataType: 'invalid-marker'}},
        name: 'A custom mark',
        ts: 100,
      },
      {
        detail: {
          devtools:
              {dataType: 'track-entry', track: 'An Extension Track', detailsPairs: [['Description', 'Something']]},
        },
        name: 'An extension measurement',
        ts: 100,
        dur: 100,
      },
      // Track entry with no explicit dataType (should be accepted)
      {
        detail: {devtools: {track: 'An Extension Track', color: 'tertiary'}},
        name: 'An extension measurement',
        ts: 105,
        dur: 50,
      },
      // Track entry with no explicit color (should be accepted)
      {
        detail: {
          devtools: {
            dataType: 'track-entry',
            track: 'Another Extension Track',
            detailsPairs: [['Description', 'Something'], ['Tip', 'A tip to improve this']],
            hintText: 'A hint if needed',
          },
        },
        name: 'An extension measurement',
        ts: 100,
        dur: 100,
      },
      // Track entry with invalid data type (should be ignored).
      {
        detail: {devtools: {dataType: 'invalid-type', track: 'Another Extension Track'}},
        name: 'An extension measurement',
        ts: 105,
        dur: 50,
      },
      // Track entry with no track value (should be ignored).
      {
        detail: {devtools: {dataType: 'track-type'}},
        name: 'An extension measurement',
        ts: 105,
        dur: 50,
      },
    ];
    const events = extensionData.flatMap(makeTimingEventWithExtensionData).sort((e1, e2) => e1.ts - e2.ts);
    TraceModel.Handlers.ModelHandlers.UserTimings.reset();
    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.UserTimings.handleEvent(event);
    }
    await TraceModel.Handlers.ModelHandlers.UserTimings.finalize();

    TraceModel.Handlers.ModelHandlers.ExtensionTraceData.reset();
    // ExtensionTraceData handler doesn't need to handle events since
    // it only consumes the output of the user timings handler.
    await TraceModel.Handlers.ModelHandlers.ExtensionTraceData.finalize();
    return TraceModel.Handlers.ModelHandlers.ExtensionTraceData.data();
  }
  before(async function() {
    extensionData = await fakeTraceExtensionData();
  });
  describe('track data parsing from user timings that use the extension API', function() {
    it('creates tracks', async () => {
      assert.lengthOf(extensionData.extensionTrackData, 2);
    });
    it('parses track data correctly', async () => {
      assert.lengthOf(extensionData.extensionTrackData[0].flameChartEntries, 2);
      assert.strictEqual(extensionData.extensionTrackData[0].name, 'An Extension Track');

      assert.lengthOf(extensionData.extensionTrackData[1].flameChartEntries, 1);
      assert.strictEqual(extensionData.extensionTrackData[1].name, 'Another Extension Track');
    });

    it('gets data from individual entries', async () => {
      const {hintText, track, detailsPairs} = extensionData.extensionTrackData[1].flameChartEntries[0].args;
      assert.strictEqual(hintText, 'A hint if needed');
      assert.strictEqual(track, 'Another Extension Track');
      assert.strictEqual(JSON.stringify(detailsPairs), '[["Description","Something"],["Tip","A tip to improve this"]]');
    });

    it('discards track data without a corresponding track field', async () => {
      // The test example contains a track entry without a track field.
      // Ensure it is discarded.
      const allTrackEntries = extensionData.extensionTrackData.flatMap(track => track.flameChartEntries);
      const validTrackEntries = allTrackEntries.filter(entry => entry.args.track);
      assert.lengthOf(validTrackEntries, allTrackEntries.length);
    });

    it('discards track data without a valid dataType field', async () => {
      // The test example contains extension data with an invalid dataType
      // value.
      // Ensure it is discarded.
      const allTrackEntries = extensionData.extensionTrackData.flatMap(track => track.flameChartEntries);
      const validTrackEntries =
          allTrackEntries.filter(entry => entry.args.dataType === 'track-entry' || entry.args.dataType === undefined);
      assert.lengthOf(validTrackEntries, allTrackEntries.length);
    });

  });

  describe('Timeline markers from user timings that use the extension API', function() {
    it('parses marker data correctly', async () => {
      assert.lengthOf(extensionData.extensionMarkers, 1);
      assert.strictEqual(extensionData.extensionMarkers[0].name, 'A custom mark');
      const {hintText, detailsPairs} = extensionData.extensionMarkers[0].args;
      assert.strictEqual(hintText, 'A mark');
      assert.strictEqual(JSON.stringify(detailsPairs), '[["Description","This marks the start of a task"]]');
    });

    it('discards markers whose details are not valid stringified JSON', async () => {
      const performanceMarkEvent: TraceModel.Types.TraceEvents.TraceEventPerformanceMark = {
        args: {
          data: {
            detail: 'this-is-not-json',
          },
        },
        name: 'test-perf-mark',
        cat: 'blink.user_timing',
        ph: TraceModel.Types.TraceEvents.Phase.INSTANT,
        pid: TraceModel.Types.TraceEvents.ProcessID(1),
        tid: TraceModel.Types.TraceEvents.ThreadID(1),
        ts: TraceModel.Types.Timing.MicroSeconds(100),
      };

      assert.isNull(
          TraceModel.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInTiming(performanceMarkEvent),
      );
    });

    it('discards markers without a valid dataType field', async () => {
      // The test example contains extension data with an invalid dataType
      // value.
      // Ensure it is discarded.
      const allMarkers = extensionData.extensionMarkers;
      const validTrackEntries = allMarkers.filter(entry => entry.args.dataType === 'marker');
      assert.lengthOf(validTrackEntries, allMarkers.length);
    });
  });
});
