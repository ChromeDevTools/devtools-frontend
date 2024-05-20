// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceModel from '../trace.js';

describe('ExtensionTraceDataHandler', function() {
  let extensionData: TraceModel.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData;
  async function getExtensionDataFromEvents(events: readonly TraceModel.Types.TraceEvents.TraceEventData[]):
      Promise<TraceModel.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData> {
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
    const events = await TraceLoader.rawEvents(this, 'extension-tracks-and-marks.json.gz');
    extensionData = await getExtensionDataFromEvents(events);
  });
  describe('track data parsing from user timings that use the extension API', function() {
    it('creates tracks', async () => {
      assert.lengthOf(extensionData.extensionTrackData, 2);
    });
    it('parses track data correctly', async () => {
      assert.strictEqual(extensionData.extensionTrackData[0].extensionName, 'Some Extension');
      assert.lengthOf(extensionData.extensionTrackData[0].flameChartEntries, 24);
      assert.strictEqual(extensionData.extensionTrackData[0].name, 'An Extension Track');

      assert.strictEqual(extensionData.extensionTrackData[1].extensionName, 'Another Extension');
      assert.lengthOf(extensionData.extensionTrackData[1].flameChartEntries, 1);
      assert.strictEqual(extensionData.extensionTrackData[1].name, 'Another Extension Track');
    });

    it('gets data from individual entries', async () => {
      const {hintText, track, detailsPairs} = extensionData.extensionTrackData[0].flameChartEntries[0].args;
      assert.strictEqual(hintText, 'A hint if needed');
      assert.strictEqual(track, 'An Extension Track');
      assert.strictEqual(
          JSON.stringify(detailsPairs),
          '[["Description","This is a top level rendering task"],["Tip","A tip to improve this"]]');
    });

    it('discards track data without a corresponding track field', async () => {
      // The test example contains a track entry without a track field.
      // Ensure it is discarded.
      const allTrackEntries = extensionData.extensionTrackData.flatMap(track => track.flameChartEntries);
      const validTrackEntries = allTrackEntries.filter(entry => entry.args.track);
      assert.lengthOf(validTrackEntries, allTrackEntries.length);
    });

    it('discards track data without a valid dataType metadata field', async () => {
      // The test example contains extension data with an invalid dataType
      // value.
      // Ensure it is discarded.
      const allTrackEntries = extensionData.extensionTrackData.flatMap(track => track.flameChartEntries);
      const validTrackEntries = allTrackEntries.filter(
          entry => entry.args.metadata.dataType === TraceModel.Types.Extensions.ExtensionEntryType.TRACK_ENTRY);
      assert.lengthOf(validTrackEntries, allTrackEntries.length);
    });

    it('discards track data without an extensionName metadata field', async () => {
      // The test example contains extension data without an extensionName
      // value.
      // Ensure it is discarded.
      const allTrackEntries = extensionData.extensionTrackData.flatMap(track => track.flameChartEntries);
      const validTrackEntries = allTrackEntries.filter(entry => entry.args.metadata.extensionName);
      assert.lengthOf(validTrackEntries, allTrackEntries.length);
    });

    it('discards track data without a valid color value', async () => {
      // The test example contains a track entry with an invalid color value.
      // Ensure it is discarded.
      const allTrackEntries = extensionData.extensionTrackData.flatMap(track => track.flameChartEntries);
      const validTrackEntries =
          allTrackEntries.filter(entry => TraceModel.Types.Extensions.colorIsValid(entry.args.color));
      assert.lengthOf(validTrackEntries, allTrackEntries.length);
    });
  });

  describe('Timeline markers from user timings that use the extension API', function() {
    it('parses marker data correctly', async () => {
      assert.lengthOf(extensionData.extensionMarkers, 3);
      assert.strictEqual(extensionData.extensionMarkers[0].name, 'Custom mark');
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

    it('discards markers without a valid dataType metadata field', async () => {
      // The test example contains extension data with an invalid dataType
      // value.
      // Ensure it is discarded.
      const allMarkers = extensionData.extensionMarkers;
      const validTrackEntries = allMarkers.filter(
          entry => entry.args.metadata.dataType === TraceModel.Types.Extensions.ExtensionEntryType.MARKER);
      assert.lengthOf(validTrackEntries, allMarkers.length);
    });

    it('discards markers without an extensionName metadata field', async () => {
      // The test example contains extension data without an extensionName
      // value.
      // Ensure it is discarded.
      const allMarkers = extensionData.extensionMarkers;
      const validTrackEntries = allMarkers.filter(marker => marker.args.metadata.extensionName);
      assert.lengthOf(validTrackEntries, allMarkers.length);
    });

    it('discards track data without a valid color value', async () => {
      // The test example contains a track entry with an invalid color value.
      // Ensure it is discarded.
      const allMarkers = extensionData.extensionMarkers;
      const validTrackEntries = allMarkers.filter(entry => TraceModel.Types.Extensions.colorIsValid(entry.args.color));
      assert.lengthOf(validTrackEntries, allMarkers.length);
    });
  });
});
