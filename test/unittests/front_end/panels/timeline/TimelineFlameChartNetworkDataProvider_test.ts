// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {allModelsFromFile} from '../../helpers/TraceHelpers.js';

describeWithEnvironment('TimelineFlameChartNetworkDataProvider', () => {
  it('renders the network track correctly', async () => {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {timelineModel, traceParsedData, performanceModel} = await allModelsFromFile('load-simple.json.gz');

    const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
    const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);

    dataProvider.setModel(performanceModel, traceParsedData);
    dataProvider.setWindowTimes(minTime, maxTime);

    // TimelineFlameChartNetworkDataProvider only has network track, so should always be one track group.
    assert.strictEqual(dataProvider.timelineData().groups.length, 1);
    const networkTrackGroup = dataProvider.timelineData().groups[0];

    assert.deepEqual(dataProvider.minimumBoundary(), minTime);
    assert.deepEqual(dataProvider.totalTime(), maxTime - minTime);

    const networkEvents = timelineModel.networkRequests();
    const networkEventsStartTimes = networkEvents.map(request => request.beginTime());
    const networkEventsTotalTimes = networkEvents.map(request => request.endTime - request.beginTime());
    assert.deepEqual(dataProvider.timelineData().entryLevels.length, 6);
    assert.deepEqual(dataProvider.timelineData().entryLevels, [0, 1, 1, 1, 1, 2]);
    assert.deepEqual(dataProvider.timelineData().entryStartTimes.length, 6);
    assert.deepEqual(dataProvider.timelineData().entryStartTimes, networkEventsStartTimes);
    assert.deepEqual(dataProvider.timelineData().entryTotalTimes.length, 6);
    assert.deepEqual(dataProvider.timelineData().entryTotalTimes, networkEventsTotalTimes);

    assert.deepEqual(dataProvider.maxStackDepth(), 3);

    // The decorateEntry() will be handled in the TimelineFlameChartNetworkDataProvider, so this function always returns true.
    assert.isTrue(dataProvider.forceDecoration(0));

    assert.isFalse(dataProvider.isEmpty());

    // The network track is default to collapsed.
    assert.isFalse(dataProvider.isExpanded());
    networkTrackGroup.expanded = true;
    assert.isTrue(dataProvider.isExpanded());
  });

  it('does not render the network track if there is no network requests', async () => {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {traceParsedData, performanceModel} = await allModelsFromFile('basic.json.gz');

    const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
    const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);

    dataProvider.setModel(performanceModel, traceParsedData);
    dataProvider.setWindowTimes(minTime, maxTime);

    // TimelineFlameChartNetworkDataProvider only has network track, so should always be one track group.
    assert.strictEqual(dataProvider.timelineData().groups.length, 1);

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
  });

  it('decorate a event correctly', async () => {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {timelineModel} = await allModelsFromFile('cls-cluster-max-timeout.json.gz');
    const networkEvents = timelineModel.networkRequests();
    // The field that is important of this test:
    // {
    // "startTime": 183752441.977,
    // "endTime": 183752670.454,
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
    const request = networkEvents[2];
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
        dataProvider.getDecorationPixels(request, /* unclippedBarX= */ 10, /* timeToPixelRatio= */ 1),
        {sendStart: 30, headersEnd: 235, finish: 237, start: 10, end: 238});
  });
});
