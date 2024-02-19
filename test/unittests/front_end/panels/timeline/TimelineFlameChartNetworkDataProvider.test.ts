// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

describeWithEnvironment('TimelineFlameChartNetworkDataProvider', function() {
  it('renders the network track correctly', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const traceParsedData = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

    const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
    const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);

    dataProvider.setModel(traceParsedData);
    dataProvider.setWindowTimes(minTime, maxTime);

    // TimelineFlameChartNetworkDataProvider only has network track, so should always be one track group.
    assert.strictEqual(dataProvider.timelineData().groups.length, 1);
    const networkTrackGroup = dataProvider.timelineData().groups[0];

    assert.deepEqual(dataProvider.minimumBoundary(), minTime);
    assert.deepEqual(dataProvider.totalTime(), maxTime - minTime);

    const networkEvents = traceParsedData.NetworkRequests.byTime;
    const networkEventsStartTimes =
        networkEvents.map(request => TraceEngine.Helpers.Timing.microSecondsToMilliseconds(request.ts));
    const networkEventsTotalTimes = networkEvents.map(request => {
      const {startTime, endTime} = TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(request);
      return endTime - startTime;
    });
    assert.deepEqual(dataProvider.timelineData().entryLevels.length, 6);
    assert.deepEqual(dataProvider.timelineData().entryLevels, [0, 1, 1, 1, 1, 2]);
    assertTimestampsEqual(dataProvider.timelineData().entryStartTimes, networkEventsStartTimes);
    assertTimestampsEqual(dataProvider.timelineData().entryTotalTimes, networkEventsTotalTimes);

    assert.deepEqual(dataProvider.maxStackDepth(), 3);

    // The decorateEntry() will be handled in the TimelineFlameChartNetworkDataProvider, so this function always returns true.
    assert.isTrue(dataProvider.forceDecoration(0));

    assert.isFalse(dataProvider.isEmpty());

    // The network track is default to collapsed.
    assert.isFalse(dataProvider.isExpanded());
    // The height of collapsed network track style is 17.
    assert.strictEqual(dataProvider.preferredHeight(), 17);
    networkTrackGroup.expanded = true;
    assert.isTrue(dataProvider.isExpanded());
    // The max level here is 3, so `clamp(this.#maxLevel + 1, 4, 8.5)` = 4
    assert.strictEqual(dataProvider.preferredHeight(), 17 * 4);
  });

  it('filters navigations to only return those that happen on the main frame', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const traceParsedData = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');

    const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
    const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);

    dataProvider.setModel(traceParsedData);
    dataProvider.setWindowTimes(minTime, maxTime);

    const mainFrameID = traceParsedData.Meta.mainFrameId;
    const navigationEvents = dataProvider.mainFrameNavigationStartEvents();
    // Ensure that every navigation event that we return is for the main frame.
    assert.isTrue(navigationEvents.every(navEvent => {
      return navEvent.args.frame === mainFrameID;
    }));
  });

  it('does not render the network track if there is no network requests', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {traceParsedData} = await TraceLoader.allModels(this, 'basic.json.gz');

    const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
    const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);

    dataProvider.setModel(traceParsedData);
    dataProvider.setWindowTimes(minTime, maxTime);

    // Network track appender won't append the network track if there is no network requests.
    assert.strictEqual(dataProvider.timelineData().groups.length, 0);

    assert.deepEqual(dataProvider.minimumBoundary(), minTime);
    assert.deepEqual(dataProvider.totalTime(), maxTime - minTime);

    assert.deepEqual(dataProvider.timelineData().entryLevels, []);
    assert.deepEqual(dataProvider.timelineData().entryStartTimes, []);
    assert.deepEqual(dataProvider.timelineData().entryTotalTimes, []);

    assert.deepEqual(dataProvider.maxStackDepth(), 0);

    // The decorateEntry() will be handled in the TimelineFlameChartNetworkDataProvider, so this function always returns true.
    assert.isTrue(dataProvider.forceDecoration(0));

    // The network track won't show if it is empty.
    assert.isTrue(dataProvider.isEmpty());

    assert.strictEqual(dataProvider.preferredHeight(), 0);
  });

  it('decorate a event correctly', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {traceParsedData} = await TraceLoader.allModels(this, 'cls-cluster-max-timeout.json.gz');
    // The field that is important of this test:
    // {
    // "ts": 183752441.977,
    // "dur": 183752670.454,
    // "finishTime": 183752669.23299998,
    // ...
    // "timing": {
    //     "pushStart": 0,
    //     "receiveHeadersEnd": 218.084,
    //     "requestTime": 183752.449687,
    //     "sendEnd": 13.01,
    //     "sendStart": 12.792,
    //     ...
    //   },
    //   "priority": "VeryHigh",
    //   "responseTime": 1634222299.776
    // ...
    // }
    const event = traceParsedData.NetworkRequests.byTime[1];
    // So for this request:
    // The earliest event belonging to this request starts at 183752441.977.
    // This is used in flamechart to calculate unclippedBarX.
    // Start time is 183752441.977
    // End time is 183752670.454
    // Finish time is 183752669.23299998
    // request time is 183752.449687, but it is in second, so 183752449.687
    // in milliseconds.
    // sendStartTime is requestTime + sendStart = 183752462.479
    // headersEndTime is requestTime + receiveHeadersEnd = 183752667.771
    //
    // To calculate the pixel of a timestamp, we substrate the begin time  from
    // it, then multiple the timeToPixelRatio and then add the unclippedBarX.
    // Then get the floor of the pixel.
    // So the pixel of sendStart is 30.
    // So the pixel of headersEnd is 235.
    // So the pixel of finish is 237.
    // So the pixel of start is 10.
    // So the pixel of end is 238.
    assert.deepEqual(
        dataProvider.getDecorationPixels(event, /* unclippedBarX= */ 10, /* timeToPixelRatio= */ 1),
        {sendStart: 30, headersEnd: 235, finish: 237, start: 10, end: 238});
  });
});

function assertTimestampEqual(actual: number, expected: number): void {
  assert.strictEqual(actual.toFixed(2), expected.toFixed(2));
}

function assertTimestampsEqual(actual: number[]|Float32Array|Float64Array, expected: number[]): void {
  assert.strictEqual(actual.length, expected.length);

  for (let i = 0; i < actual.length; i++) {
    assertTimestampEqual(actual[i], expected[i]);
  }
}
