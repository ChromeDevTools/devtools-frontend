// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../trace.js';

describe('ExtensionTraceDataHandler', function() {
  let extensionHandlerOutput: TraceModel.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData;

  let idCounter = 0;
  type ExtensionTestData =
      {detail: {devtools?: TraceModel.Types.Extensions.ExtensionDataPayload}, name: string, ts: number, dur?: number};
  function makeTimingEventWithExtensionData({name, ts: tsMicro, detail, dur: durMicro}: ExtensionTestData):
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
  async function createTraceExtensionDataFromTestInput(extensionData: ExtensionTestData[]):
      Promise<TraceModel.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
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

  function createTraceExtensionDataExample():
      Promise<TraceModel.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
    const extensionData = [
      {
        detail: {
          devtools: {
            color: 'error',
            dataType: 'marker',
            properties: [['Description', 'This marks the start of a task']],
            tooltipText: 'A mark',
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
          devtools: {dataType: 'track-entry', track: 'An Extension Track', properties: [['Description', 'Something']]},
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
            properties: [['Description', 'Something'], ['Tip', 'A tip to improve this']],
            tooltipText: 'A hint if needed',
          },
        },
        name: 'An extension measurement',
        ts: 100,
        dur: 100,
      },
      // Track entry with invalid data type (should be ignored).
      {
        detail: {
          devtools: {
            dataType: 'invalid-type' as TraceModel.Types.Extensions.ExtensionDataPayload['dataType'],
            track: 'Another Extension Track',
          },
        },
        name: 'An extension measurement',
        ts: 105,
        dur: 50,
      },
      // Track entry with no track value (should be ignored).
      {
        detail: {devtools: {dataType: 'track-entry'}},
        name: 'An extension measurement',
        ts: 105,
        dur: 50,
      },
    ] as ExtensionTestData[];
    return createTraceExtensionDataFromTestInput(extensionData);
  }

  describe('track data parsing from user timings that use the extension API', function() {
    before(async function() {
      extensionHandlerOutput = await createTraceExtensionDataExample();
    });
    it('creates tracks', async () => {
      assert.lengthOf(extensionHandlerOutput.extensionTrackData, 2);
    });
    it('parses track data correctly', async () => {
      assert.lengthOf(extensionHandlerOutput.extensionTrackData[0].entriesByTrack['An Extension Track'], 2);
      assert.strictEqual(extensionHandlerOutput.extensionTrackData[0].name, 'An Extension Track');

      assert.lengthOf(extensionHandlerOutput.extensionTrackData[1].entriesByTrack['Another Extension Track'], 1);
      assert.strictEqual(extensionHandlerOutput.extensionTrackData[1].name, 'Another Extension Track');
    });

    it('gets data from individual entries', async () => {
      const {tooltipText, track, properties} =
          extensionHandlerOutput.extensionTrackData[1].entriesByTrack['Another Extension Track'][0].args;
      assert.strictEqual(tooltipText, 'A hint if needed');
      assert.strictEqual(track, 'Another Extension Track');
      assert.strictEqual(JSON.stringify(properties), '[["Description","Something"],["Tip","A tip to improve this"]]');
    });

    it('discards track data without a corresponding track field', async () => {
      // The test example contains a track entry without a track field.
      // Ensure it is discarded.
      const allTrackEntries =
          extensionHandlerOutput.extensionTrackData.map(track => Object.values(track.entriesByTrack)).flat(2);
      const validTrackEntries = allTrackEntries.filter(entry => entry.args.track);
      assert.lengthOf(validTrackEntries, allTrackEntries.length);
    });

    it('discards track data without a valid dataType field', async () => {
      // The test example contains extension data with an invalid dataType
      // value.
      // Ensure it is discarded.
      const allTrackEntries =
          extensionHandlerOutput.extensionTrackData.map(track => Object.values(track.entriesByTrack)).flat(2);
      const validTrackEntries =
          allTrackEntries.filter(entry => entry.args.dataType === 'track-entry' || entry.args.dataType === undefined);
      assert.lengthOf(validTrackEntries, allTrackEntries.length);
    });
  });

  describe('Timeline markers from user timings that use the extension API', function() {
    before(async function() {
      extensionHandlerOutput = await createTraceExtensionDataExample();
    });
    it('parses marker data correctly', async () => {
      assert.lengthOf(extensionHandlerOutput.extensionMarkers, 1);
      assert.strictEqual(extensionHandlerOutput.extensionMarkers[0].name, 'A custom mark');
      const {tooltipText, properties} = extensionHandlerOutput.extensionMarkers[0].args;
      assert.strictEqual(tooltipText, 'A mark');
      assert.strictEqual(JSON.stringify(properties), '[["Description","This marks the start of a task"]]');
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
      const allMarkers = extensionHandlerOutput.extensionMarkers;
      const validTrackEntries = allMarkers.filter(entry => entry.args.dataType === 'marker');
      assert.lengthOf(validTrackEntries, allMarkers.length);
    });
  });

  describe('Data filtering', () => {
    it('extracts the extension data from a timing\'s detail when present', async function() {
      const extensionData: ExtensionTestData[] = [
        {
          detail: {
            devtools: {
              color: 'error',
              dataType: 'marker',
              properties: [['Description', 'This marks the start of a task']],
              tooltipText: 'A mark',
            },
          },
          name: 'A custom mark',
          ts: 100,
        },
      ];
      const extensionHandlerOutput = await createTraceExtensionDataFromTestInput(extensionData);
      assert.strictEqual(extensionHandlerOutput.extensionMarkers.length, 1);
    });
    it('ignores a timing if its detail does not contain a devtools object', async function() {
      const extensionData = [
        {
          detail: {},
          name: 'A custom mark',
          ts: 100,
        },
      ] as ExtensionTestData[];
      const extensionHandlerOutput = await createTraceExtensionDataFromTestInput(extensionData);
      assert.strictEqual(extensionHandlerOutput.extensionMarkers.length, 0);
    });
    it('ignores a timing if its detail contains a devtools object w/o valid extension data', async function() {
      const extensionData = [
        {
          // Invalid data type
          detail: {
            devtools: {
              color: 'error',
              dataType: 'invalid' as TraceModel.Types.Extensions.ExtensionDataPayload['dataType'],
            },
          },
          name: 'A custom mark',
          ts: 100,
        },
        {
          detail: {
            devtools: {
              // Defaulted to track-entry but no trackName provided
              color: 'error',
            },
          },
          name: 'A measurement',
          ts: 100,
        },
        {
          detail: {
            devtools: {
              // track-entry w/o trackName provided
              dataType: 'track-entry',
            },
          },
          name: 'A measurement',
          ts: 100,
        },
      ] as ExtensionTestData[];
      const extensionHandlerOutput = await createTraceExtensionDataFromTestInput(extensionData);
      assert.strictEqual(extensionHandlerOutput.extensionMarkers.length, 0);
    });
    it('ignores a timing if its detail contains a devtools with a track group but no track name', async function() {
      const extensionData = [
        {
          // Invalid data type
          detail: {
            devtools: {
              trackGroup: 'Track group',
            },
          },
          name: 'A measurement',
          ts: 100,
          dur: 100,
        },
      ] as ExtensionTestData[];
      const extensionHandlerOutput = await createTraceExtensionDataFromTestInput(extensionData);
      assert.strictEqual(extensionHandlerOutput.extensionMarkers.length, 0);
    });
  });

  describe('Track groups', () => {
    it('builds extension track data for grouped tracks correctly', async function() {
      const extensionDevToolsObjects: ExtensionTestData['detail']['devtools'][] = [
        // Track group 1
        {
          dataType: 'track-entry',
          trackGroup: 'Group 1',
          track: 'Track 1',
        },
        {
          dataType: 'track-entry',
          trackGroup: 'Group 1',
          track: 'Track 1',
        },
        {
          dataType: 'track-entry',
          trackGroup: 'Group 1',
          track: 'Track 2',
        },
        {
          dataType: 'track-entry',
          trackGroup: 'Group 1',
          track: 'Track 3',
        },
        // Track group 2
        {
          dataType: 'track-entry',
          trackGroup: 'Group 2',
          track: 'Track 1',
        },
        // Un grouped tracks
        {
          dataType: 'track-entry',
          track: 'Ungrouped Track 1',
        },
        {
          dataType: 'track-entry',
          track: 'Ungrouped Track 2',
        },
        {
          dataType: 'track-entry',
          track: 'Ungrouped Track 2',
        },
      ];

      const extensionHandlerOutput =
          await createTraceExtensionDataFromTestInput(extensionDevToolsObjects.map(devtools => ({
                                                                                     detail: {devtools},
                                                                                     name: 'A measurement',
                                                                                     ts: 100,
                                                                                     dur: 100,
                                                                                   })));
      assert.strictEqual(extensionHandlerOutput.extensionTrackData.length, 4);

      const firstTrackData = extensionHandlerOutput.extensionTrackData[0];
      assert.strictEqual(firstTrackData.name, 'Group 1');
      assert.strictEqual(firstTrackData.isTrackGroup, true);
      assert.deepEqual(Object.keys(firstTrackData.entriesByTrack), ['Track 1', 'Track 2', 'Track 3']);
      assert.deepEqual(Object.values(firstTrackData.entriesByTrack).map(entries => entries.length), [2, 1, 1]);

      const secondTrackData = extensionHandlerOutput.extensionTrackData[1];
      assert.strictEqual(secondTrackData.name, 'Group 2');
      assert.strictEqual(secondTrackData.isTrackGroup, true);
      assert.deepEqual(Object.keys(secondTrackData.entriesByTrack), ['Track 1']);
      assert.deepEqual(Object.values(secondTrackData.entriesByTrack).map(entries => entries.length), [1]);

      const thirdTrackData = extensionHandlerOutput.extensionTrackData[2];
      assert.strictEqual(thirdTrackData.name, 'Ungrouped Track 1');
      assert.deepEqual(Object.keys(thirdTrackData.entriesByTrack), ['Ungrouped Track 1']);
      assert.deepEqual(Object.values(thirdTrackData.entriesByTrack).map(entries => entries.length), [1]);

      const fourthTrackData = extensionHandlerOutput.extensionTrackData[3];
      assert.strictEqual(fourthTrackData.name, 'Ungrouped Track 2');
      assert.deepEqual(Object.keys(fourthTrackData.entriesByTrack), ['Ungrouped Track 2']);
      assert.deepEqual(Object.values(fourthTrackData.entriesByTrack).map(entries => entries.length), [2]);
    });
    it('calculates self time sub track by sub track', async function() {
      const extensionDevToolsObjects: ExtensionTestData[] = [
        // Track group 1
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              trackGroup: 'Group 1',
              track: 'Track 1',
            },
          },
          name: 'Measurement 1',
          ts: 0,
          dur: 100,
        },
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              trackGroup: 'Group 1',
              track: 'Track 1',
            },
          },
          name: 'Measurement 2',
          ts: 0,
          dur: 20,
        },
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              trackGroup: 'Group 1',
              track: 'Track 1',
            },
          },
          name: 'Measurement 3',
          ts: 60,
          dur: 40,
        },
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              trackGroup: 'Group 1',
              track: 'Track 1',
            },
          },
          name: 'Measurement 4',
          ts: 70,
          dur: 10,
        },
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              trackGroup: 'Group 1',
              track: 'Track 2',
            },
          },
          name: 'Measurement 5',
          ts: 0,
          dur: 200,
        },
        // Standalone track
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              track: 'Ungrouped Track',
            },
          },
          name: 'Measurement 6',
          ts: 0,
          dur: 100,
        },
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              track: 'Ungrouped Track',
            },
          },
          name: 'Measurement 7',
          ts: 50,
          dur: 50,
        },
      ];

      const extensionHandlerOutput = await createTraceExtensionDataFromTestInput(extensionDevToolsObjects);
      assert.lengthOf(extensionHandlerOutput.extensionTrackData, 2);

      const trackGroupData = extensionHandlerOutput.extensionTrackData[0];
      const testDataTrack1 = trackGroupData.entriesByTrack['Track 1'].map(
          entry => ({name: entry.name, selfTime: entry.selfTime as number}));
      assert.deepEqual(testDataTrack1, [
        {name: 'Measurement 1', selfTime: 40},
        {name: 'Measurement 2', selfTime: 20},
        {name: 'Measurement 3', selfTime: 30},
        {name: 'Measurement 4', selfTime: 10},
      ]);

      const testDataTrack2 = trackGroupData.entriesByTrack['Track 2'].map(
          entry => ({name: entry.name, selfTime: entry.selfTime as number}));
      assert.deepEqual(testDataTrack2, [{name: 'Measurement 5', selfTime: 200}]);

      const ungroupedTrackData = extensionHandlerOutput.extensionTrackData[1].entriesByTrack['Ungrouped Track'].map(
          entry => ({name: entry.name, selfTime: entry.selfTime as number}));
      assert.deepEqual(
          ungroupedTrackData, [{name: 'Measurement 6', selfTime: 50}, {name: 'Measurement 7', selfTime: 50}]);
    });
  });
});
