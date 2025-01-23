// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../trace.js';

let idCounter = 0;
export interface PerformanceAPIExtensionTestData {
  detail: {devtools?: Trace.Types.Extensions.ExtensionDataPayload};
  name: string;
  ts: number;
  dur?: number;
}

export interface ConsoleAPIExtensionTestData {
  name: string;
  start?: string;
  end?: string;
  track?: string;
  trackGroup?: string;
  color?: string;
  ts: number;
}

function makeTimingEventWithPerformanceExtensionData(
    {name, ts: tsMicro, detail, dur: durMicro}: PerformanceAPIExtensionTestData): Trace.Types.Events.Event[] {
  const isMark = durMicro === undefined;
  const currentId = idCounter++;
  const traceEventBase = {
    cat: 'blink.user_timing',
    pid: Trace.Types.Events.ProcessID(2017),
    tid: Trace.Types.Events.ThreadID(259),
    id2: {local: `${currentId}`},
  };

  const stringDetail = JSON.stringify(detail);
  const args = isMark ? {data: {detail: stringDetail}} : {detail: stringDetail};
  const firstEvent = {
    args,
    name,
    ph: isMark ? Trace.Types.Events.Phase.INSTANT : Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
    ts: Trace.Types.Timing.Micro(tsMicro),
    ...traceEventBase,
  } as Trace.Types.Events.Event;
  if (isMark) {
    return [firstEvent];
  }
  return [
    firstEvent,
    {
      name,
      ...traceEventBase,
      ts: Trace.Types.Timing.Micro(tsMicro + (durMicro || 0)),
      ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_END,
    },
  ];
}

function makeTimingEventWithConsoleExtensionData({name, ts, start, end, track, trackGroup, color}:
                                                     ConsoleAPIExtensionTestData): Trace.Types.Events.ConsoleTimeStamp {
  return {
    cat: 'disabled-by-default-v8.inspector',
    pid: Trace.Types.Events.ProcessID(2017),
    tid: Trace.Types.Events.ThreadID(259),
    name: Trace.Types.Events.Name.CONSOLE_TIME_STAMP,
    args: {
      data: {
        name,
        start,
        end,
        track,
        trackGroup,
        color,
      }
    },
    ts: Trace.Types.Timing.Micro(ts),
    ph: Trace.Types.Events.Phase.COMPLETE,

  };
}
export async function createTraceExtensionDataFromPerformanceAPITestInput(
    extensionData: PerformanceAPIExtensionTestData[]):
    Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
  const events = extensionData.flatMap(makeTimingEventWithPerformanceExtensionData).sort((e1, e2) => e1.ts - e2.ts);
  return createTraceExtensionDataFromEvents(events);
}

async function createTraceExtensionDataFromConsoleAPITestInput(extensionData: ConsoleAPIExtensionTestData[]):
    Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
  const events = extensionData.flatMap(makeTimingEventWithConsoleExtensionData).sort((e1, e2) => e1.ts - e2.ts);
  return createTraceExtensionDataFromEvents(events);
}

async function createTraceExtensionDataFromEvents(events: Trace.Types.Events.Event[]):
    Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
  Trace.Helpers.SyntheticEvents.SyntheticEventsManager.createAndActivate(events);

  Trace.Handlers.ModelHandlers.UserTimings.reset();
  for (const event of events) {
    Trace.Handlers.ModelHandlers.UserTimings.handleEvent(event);
  }
  await Trace.Handlers.ModelHandlers.UserTimings.finalize();

  Trace.Handlers.ModelHandlers.ExtensionTraceData.reset();
  // ExtensionTraceData handler doesn't need to handle events since
  // it only consumes the output of the user timings handler.
  await Trace.Handlers.ModelHandlers.ExtensionTraceData.finalize();
  return Trace.Handlers.ModelHandlers.ExtensionTraceData.data();
}

describe('ExtensionTraceDataHandler', function() {
  describe('parsing extension data added via the performance.measure/mark API', function() {
    let extensionHandlerOutput: Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData;
    beforeEach(async function() {
      extensionHandlerOutput = await createTraceExtensionDataExample();
    });
    after(() => {
      Trace.Handlers.ModelHandlers.ExtensionTraceData.reset();
      Trace.Handlers.ModelHandlers.UserTimings.reset();
    });

    function createTraceExtensionDataExample():
        Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
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
            devtools:
                {dataType: 'track-entry', track: 'An Extension Track', properties: [['Description', 'Something']]},
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
              dataType: 'invalid-type' as Trace.Types.Extensions.ExtensionDataPayload['dataType'],
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
      ] as PerformanceAPIExtensionTestData[];
      return createTraceExtensionDataFromPerformanceAPITestInput(extensionData);
    }

    describe('track data parsing from user timings that use the extension API', function() {
      it('creates tracks', async () => {
        assert.lengthOf(extensionHandlerOutput.extensionTrackData, 2);
      });
      it('parses track data correctly', async () => {
        assert.lengthOf(extensionHandlerOutput.extensionTrackData[1].entriesByTrack['An Extension Track'], 2);
        assert.strictEqual(extensionHandlerOutput.extensionTrackData[1].name, 'An Extension Track');

        assert.lengthOf(extensionHandlerOutput.extensionTrackData[0].entriesByTrack['Another Extension Track'], 1);
        assert.strictEqual(extensionHandlerOutput.extensionTrackData[0].name, 'Another Extension Track');
      });

      it('gets data from individual entries', async () => {
        const {tooltipText, track, properties} =
            extensionHandlerOutput.extensionTrackData[0].entriesByTrack['Another Extension Track'][0].args;
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
        const performanceMarkEvent: Trace.Types.Events.PerformanceMark = {
          args: {
            data: {
              detail: 'this-is-not-json',
            },
          },
          name: 'test-perf-mark',
          cat: 'blink.user_timing',
          ph: Trace.Types.Events.Phase.INSTANT,
          pid: Trace.Types.Events.ProcessID(1),
          tid: Trace.Types.Events.ThreadID(1),
          ts: Trace.Types.Timing.Micro(100),
        };

        assert.isNull(
            Trace.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInPerformanceTiming(performanceMarkEvent),
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
        const extensionData: PerformanceAPIExtensionTestData[] = [
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
        const extensionHandlerOutput = await createTraceExtensionDataFromPerformanceAPITestInput(extensionData);
        assert.lengthOf(extensionHandlerOutput.extensionMarkers, 1);
      });
      it('ignores a timing if its detail does not contain a devtools object', async function() {
        const extensionData = [
          {
            detail: {},
            name: 'A custom mark',
            ts: 100,
          },
        ] as PerformanceAPIExtensionTestData[];
        const extensionHandlerOutput = await createTraceExtensionDataFromPerformanceAPITestInput(extensionData);
        assert.lengthOf(extensionHandlerOutput.extensionMarkers, 0);
      });
      it('ignores a timing if its detail contains a devtools object w/o valid extension data', async function() {
        const extensionData = [
          {
            // Invalid data type
            detail: {
              devtools: {
                color: 'error',
                dataType: 'invalid' as Trace.Types.Extensions.ExtensionDataPayload['dataType'],
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
        ] as PerformanceAPIExtensionTestData[];
        const extensionHandlerOutput = await createTraceExtensionDataFromPerformanceAPITestInput(extensionData);
        assert.lengthOf(extensionHandlerOutput.extensionMarkers, 0);
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
        ] as PerformanceAPIExtensionTestData[];
        const extensionHandlerOutput = await createTraceExtensionDataFromPerformanceAPITestInput(extensionData);
        assert.lengthOf(extensionHandlerOutput.extensionMarkers, 0);
      });
    });

    describe('Track groups', () => {
      it('builds extension track data for grouped tracks correctly', async function() {
        const extensionDevToolsObjects: PerformanceAPIExtensionTestData['detail']['devtools'][] = [
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

        const extensionHandlerOutput = await createTraceExtensionDataFromPerformanceAPITestInput(
            extensionDevToolsObjects.map((devtools, i) => ({
                                           detail: {devtools},
                                           name: 'A measurement',
                                           // Use different timestamps
                                           // to prevent event switching
                                           // due to equal start and end.
                                           ts: 100 + i,
                                           dur: 100,
                                         })));
        assert.lengthOf(extensionHandlerOutput.extensionTrackData, 4);

        const firstTrackData = extensionHandlerOutput.extensionTrackData[0];
        assert.strictEqual(firstTrackData.name, 'Group 1');
        assert.isTrue(firstTrackData.isTrackGroup);
        assert.deepEqual(Object.keys(firstTrackData.entriesByTrack), ['Track 1', 'Track 2', 'Track 3']);
        assert.deepEqual(Object.values(firstTrackData.entriesByTrack).map(entries => entries.length), [2, 1, 1]);

        const secondTrackData = extensionHandlerOutput.extensionTrackData[1];
        assert.strictEqual(secondTrackData.name, 'Group 2');
        assert.isTrue(secondTrackData.isTrackGroup);
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
        const extensionDevToolsObjects: PerformanceAPIExtensionTestData[] = [
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

        const extensionHandlerOutput =
            await createTraceExtensionDataFromPerformanceAPITestInput(extensionDevToolsObjects);
        assert.lengthOf(extensionHandlerOutput.extensionTrackData, 2);

        const trackGroupData = extensionHandlerOutput.extensionTrackData[0];
        const testDataTrack1 = trackGroupData.entriesByTrack['Track 1'].map(entry => {
          const selfTime = extensionHandlerOutput.entryToNode.get(entry)?.selfTime as number;
          return {name: entry.name, selfTime};
        });
        assert.deepEqual(testDataTrack1, [
          {name: 'Measurement 1', selfTime: 40},
          {name: 'Measurement 2', selfTime: 20},
          {name: 'Measurement 3', selfTime: 30},
          {name: 'Measurement 4', selfTime: 10},
        ]);

        const testDataTrack2 = trackGroupData.entriesByTrack['Track 2'].map(entry => {
          const selfTime = extensionHandlerOutput.entryToNode.get(entry)?.selfTime as number;
          return {name: entry.name, selfTime};
        });
        assert.deepEqual(testDataTrack2, [{name: 'Measurement 5', selfTime: 200}]);

        const ungroupedTrackData =
            extensionHandlerOutput.extensionTrackData[1].entriesByTrack['Ungrouped Track'].map(entry => {
              const selfTime = extensionHandlerOutput.entryToNode.get(entry)?.selfTime as number;
              return {name: entry.name, selfTime};
            });
        assert.deepEqual(
            ungroupedTrackData, [{name: 'Measurement 6', selfTime: 50}, {name: 'Measurement 7', selfTime: 50}]);
      });
    });
  });
  describe('parsing extension data added via the console.timeStamp API', function() {
    let extensionHandlerOutput: Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData;
    beforeEach(async function() {
      extensionHandlerOutput = await createTraceExtensionDataExample();
    });
    after(() => {
      Trace.Handlers.ModelHandlers.ExtensionTraceData.reset();
      Trace.Handlers.ModelHandlers.UserTimings.reset();
    });
    function createTraceExtensionDataExample():
        Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
      const extensionData: ConsoleAPIExtensionTestData[] = [
        // Custom track 1
        {
          name: 'Mark 1',
          ts: 100,
        },
        {
          name: 'Measure 1',
          start: 'Mark 1',
          track: 'Custom track 1',
          ts: 200,
        },
        // Custom track 2
        {
          name: 'Mark 2',
          ts: 100,
        },
        {
          name: 'Mark 3',
          ts: 200,
        },
        {
          track: 'Custom track 2',
          name: 'Measure 2',
          start: 'Mark 2',
          end: 'Mark 3',
          ts: 300,
        },
        // Custom track 3
        {
          track: 'Custom track 3',
          name: 'Measure 3',
          start: 'Mark 1',
          end: 'Mark 4',
          ts: 300,
        },
        {
          track: 'Custom track 3',
          name: 'Measure 4',
          start: 'Mark 2',
          end: 'Mark 3',
          ts: 300,
        },
        // No track
        {
          name: 'Measure 5',
          start: 'Mark 1',
          end: 'Mark 4',
          ts: 300,
        },
      ];
      return createTraceExtensionDataFromConsoleAPITestInput(extensionData);
    }

    describe('track data parsing', function() {
      it('creates tracks', async () => {
        assert.lengthOf(extensionHandlerOutput.extensionTrackData, 3);
      });
      it('parses track data correctly', async () => {
        assert.lengthOf(extensionHandlerOutput.extensionTrackData, 3);

        assert.strictEqual(extensionHandlerOutput.extensionTrackData[0].name, 'Custom track 3');
        assert.lengthOf(extensionHandlerOutput.extensionTrackData[0].entriesByTrack['Custom track 3'], 2);
        assert.strictEqual(
            extensionHandlerOutput.extensionTrackData[0].entriesByTrack['Custom track 3'][0].name, 'Measure 3');
        assert.strictEqual(
            extensionHandlerOutput.extensionTrackData[0].entriesByTrack['Custom track 3'][1].name, 'Measure 4');

        assert.strictEqual(extensionHandlerOutput.extensionTrackData[1].name, 'Custom track 1');
        assert.lengthOf(extensionHandlerOutput.extensionTrackData[1].entriesByTrack['Custom track 1'], 1);
        assert.strictEqual(
            extensionHandlerOutput.extensionTrackData[1].entriesByTrack['Custom track 1'][0].name, 'Measure 1');

        assert.strictEqual(extensionHandlerOutput.extensionTrackData[2].name, 'Custom track 2');
        assert.lengthOf(extensionHandlerOutput.extensionTrackData[2].entriesByTrack['Custom track 2'], 1);
        assert.strictEqual(
            extensionHandlerOutput.extensionTrackData[2].entriesByTrack['Custom track 2'][0].name, 'Measure 2');
      });
      it('parses synthetic console timings for the timings track', async () => {
        assert.lengthOf(extensionHandlerOutput.syntheticConsoleEntriesForTimingsTrack, 1);
        assert.strictEqual(extensionHandlerOutput.syntheticConsoleEntriesForTimingsTrack[0].name, 'Measure 5');
      });
      it('discards track data without a corresponding track field', async () => {
        // The test example contains a track entry without a track field.
        // Ensure it is discarded.
        const allTrackEntries =
            extensionHandlerOutput.extensionTrackData.map(track => Object.values(track.entriesByTrack)).flat(2);
        const validTrackEntries = allTrackEntries.filter(entry => entry.args.track);
        assert.lengthOf(validTrackEntries, allTrackEntries.length);
      });
    });
    describe('Track groups', () => {
      it('builds extension track data for grouped tracks correctly', async function() {
        const mockData = [
          // Track group 1
          {
            trackGroup: 'Group 1',
            track: 'Track 1',
          },
          {
            trackGroup: 'Group 1',
            track: 'Track 1',
          },
          {
            trackGroup: 'Group 1',
            track: 'Track 2',
          },
          {
            trackGroup: 'Group 1',
            track: 'Track 3',
          },
          // Track group 2
          {
            trackGroup: 'Group 2',
            track: 'Track 1',
          },
          // Un grouped tracks
          {
            track: 'Ungrouped Track 1',
          },
          {
            track: 'Ungrouped Track 2',
          },
          {
            track: 'Ungrouped Track 2',
          },
        ];

        const extensionHandlerOutput =
            await createTraceExtensionDataFromConsoleAPITestInput(mockData.map(({track, trackGroup}, i) => ({
                                                                                 track,
                                                                                 trackGroup,
                                                                                 name: 'A measurement',
                                                                                 // Use different timestamps
                                                                                 // to prevent event switching
                                                                                 // due to equal start and end.
                                                                                 ts: 100 + i,
                                                                                 dur: 100,
                                                                               })));
        assert.lengthOf(extensionHandlerOutput.extensionTrackData, 4);

        const firstTrackData = extensionHandlerOutput.extensionTrackData[0];
        assert.strictEqual(firstTrackData.name, 'Group 1');
        assert.isTrue(firstTrackData.isTrackGroup);
        assert.deepEqual(Object.keys(firstTrackData.entriesByTrack), ['Track 1', 'Track 2', 'Track 3']);
        assert.deepEqual(Object.values(firstTrackData.entriesByTrack).map(entries => entries.length), [2, 1, 1]);

        const secondTrackData = extensionHandlerOutput.extensionTrackData[1];
        assert.strictEqual(secondTrackData.name, 'Group 2');
        assert.isTrue(secondTrackData.isTrackGroup);
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
        const extensionDevToolsObjects: ConsoleAPIExtensionTestData[] = [
          // Track group 1
          {
            name: 'A',
            ts: 0,
          },
          {
            name: 'B',
            ts: 100,
          },
          {
            trackGroup: 'Group 1',
            track: 'Track 1',
            name: 'Measurement 1',
            ts: 100,
            start: 'A',
            end: 'B',
          },
          {
            name: 'C',
            ts: 0,
          },
          {
            name: 'D',
            ts: 20,
          },
          {
            trackGroup: 'Group 1',
            track: 'Track 1',
            name: 'Measurement 2',
            ts: 20,
            start: 'C',
            end: 'D',
          },
          {
            name: 'E',
            ts: 60,
          },
          {
            trackGroup: 'Group 1',
            track: 'Track 1',
            start: 'E',
            name: 'Measurement 3',
            ts: 100,
          },
          {
            name: 'F',
            ts: 70,
          },
          {
            trackGroup: 'Group 1',
            track: 'Track 1',
            name: 'Measurement 4',
            start: 'F',
            ts: 80,
          },
          {
            name: 'G',
            ts: 0,
          },
          {
            name: 'H',
            ts: 200,
          },
          {
            trackGroup: 'Group 1',
            track: 'Track 2',
            name: 'Measurement 5',
            start: 'G',
            end: 'H',
            ts: 200,
          },
          // Standalone track
          {
            name: 'I',
            ts: 0,
          },
          {
            track: 'Ungrouped Track',
            name: 'Measurement 6',
            ts: 100,
            start: 'I',
          },
          {
            name: 'J',
            ts: 50,
          },
          {
            name: 'K',
            ts: 100,
          },
          {
            track: 'Ungrouped Track',
            name: 'Measurement 7',
            ts: 150,
            start: 'J',
            end: 'K',
          },
        ];

        const extensionHandlerOutput = await createTraceExtensionDataFromConsoleAPITestInput(extensionDevToolsObjects);
        assert.lengthOf(extensionHandlerOutput.extensionTrackData, 2);

        const trackGroupData = extensionHandlerOutput.extensionTrackData[0];
        const testDataTrack1 = trackGroupData.entriesByTrack['Track 1'].map(entry => {
          const selfTime = extensionHandlerOutput.entryToNode.get(entry)?.selfTime as number;
          return {name: entry.name, selfTime};
        });
        assert.deepEqual(testDataTrack1, [
          {name: 'Measurement 1', selfTime: 40},
          {name: 'Measurement 2', selfTime: 20},
          {name: 'Measurement 3', selfTime: 30},
          {name: 'Measurement 4', selfTime: 10},
        ]);

        const testDataTrack2 = trackGroupData.entriesByTrack['Track 2'].map(entry => {
          const selfTime = extensionHandlerOutput.entryToNode.get(entry)?.selfTime as number;
          return {name: entry.name, selfTime};
        });
        assert.deepEqual(testDataTrack2, [{name: 'Measurement 5', selfTime: 200}]);

        const ungroupedTrackData =
            extensionHandlerOutput.extensionTrackData[1].entriesByTrack['Ungrouped Track'].map(entry => {
              const selfTime = extensionHandlerOutput.entryToNode.get(entry)?.selfTime as number;
              return {name: entry.name, selfTime};
            });
        assert.deepEqual(
            ungroupedTrackData, [{name: 'Measurement 6', selfTime: 50}, {name: 'Measurement 7', selfTime: 50}]);
      });
    });
  });
});
