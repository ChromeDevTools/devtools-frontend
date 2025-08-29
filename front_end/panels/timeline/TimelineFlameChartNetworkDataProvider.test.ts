// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import type * as PerfUi from '../../ui/legacy/components/perf_ui/perf_ui.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineFlameChartNetworkDataProvider', function() {
  it('renders the network track correctly', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);

    const minTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.setWindowTimes(minTime, maxTime);

    // TimelineFlameChartNetworkDataProvider only has network track, so should always be one track group.
    assert.lengthOf(dataProvider.timelineData().groups, 1);
    const networkTrackGroup = dataProvider.timelineData().groups[0];

    assert.deepEqual(dataProvider.minimumBoundary(), minTime);
    assert.deepEqual(dataProvider.totalTime(), maxTime - minTime);

    const networkEvents = parsedTrace.NetworkRequests.byTime;
    const networkEventsStartTimes = networkEvents.map(request => Trace.Helpers.Timing.microToMilli(request.ts));
    const networkEventsTotalTimes = networkEvents.map(request => {
      const {startTime, endTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(request);
      return endTime - startTime;
    });
    assert.lengthOf(dataProvider.timelineData().entryLevels, 6);
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
    // The max level here is 3, so `clamp(this.#maxLevel + 1, 7, 8.5)` = 7
    assert.strictEqual(dataProvider.preferredHeight(), 17 * 7);
  });

  it('renders initiators and clears them when events are deselected', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const timelineData1 = dataProvider.timelineData();
    assert.lengthOf(timelineData1.initiatorsData, 0);  // no initiators by default

    // A network event that has an initiator - nothing special about the exact event.
    const event = parsedTrace.NetworkRequests.byId.get('90829.57');
    assert.exists(event);
    const index = dataProvider.indexForEvent(event);
    assert.isNotNull(index);

    dataProvider.buildFlowForInitiator(index);
    const timelineData2 = dataProvider.timelineData();
    // The selected event kicks off a chain of 3 initiators.
    assert.lengthOf(timelineData2.initiatorsData, 3);

    // Deselect and ensure they are removed
    dataProvider.buildFlowForInitiator(-1);
    const timelineData3 = dataProvider.timelineData();
    assert.lengthOf(timelineData3.initiatorsData, 0);
  });

  it('can return the group for a given entryIndex', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.timelineData();

    assert.strictEqual(
        dataProvider.groupForEvent(0)?.name,
        'Network',
    );
  });

  it('filters navigations to only return those that happen on the main frame', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);

    const minTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.setWindowTimes(minTime, maxTime);

    const mainFrameID = parsedTrace.Meta.mainFrameId;
    const navigationEvents = dataProvider.mainFrameNavigationStartEvents();
    // Ensure that every navigation event that we return is for the main frame.
    assert.isTrue(navigationEvents.every(navEvent => {
      return navEvent.args.frame === mainFrameID;
    }));
  });

  it('can provide the index for an event and the event for a given index', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);

    const event = dataProvider.eventByIndex(0);
    assert.isOk(event);
    assert.strictEqual(dataProvider.indexForEvent(event), 0);
  });

  it('does not render the network track if there is no network requests', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'basic.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);

    const minTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.setWindowTimes(minTime, maxTime);

    // Network track appender won't append the network track if there is no network requests.
    assert.lengthOf(dataProvider.timelineData().groups, 0);

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
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'cls-cluster-max-timeout.json.gz');
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
    const event = parsedTrace.NetworkRequests.byTime[1];
    // So for this request:
    // The earliest event belonging to this request starts at 183752441.977.
    // This is used in flamechart to calculate unclippedBarX.
    // Start time is 183752441.977
    // End time is 183752670.454
    // Finish time is 183752669.233
    // request time is 183752.449687, but it is in second, so 183752449.687
    // in milliseconds.
    // sendStartTime is requestTime + sendStart = 183752462.479
    // headersEndTime is requestTime + receiveHeadersEnd = 183752667.771
    //
    // To calculate the pixel of a timestamp, we substrate the begin time  from
    // it, then multiple the timeToPixelRatio and then add the unclippedBarX.
    // Then get the floor of the pixel.
    // So the pixel of sendStart is (183752462.479 - 183752441.977) + 10, in ts it will be 30.502000004053116.
    // So the pixel of headersEnd is (183752667.771 - 183752441.977) + 10, in ts it will be 235.79399999976158.
    // So the pixel of finish is (183752669.233 - 183752441.977) + 10, in ts it will be 237.25600001215935.
    // So the pixel of start is (183752441.977 - 183752441.977) + 10 = 10.
    // So the pixel of end is (183752670.454 - 183752441.977) + 10, in ts it will be 238.47699999809265.
    assert.deepEqual(dataProvider.getDecorationPixels(event, /* unclippedBarX= */ 10, /* timeToPixelRatio= */ 1), {
      sendStart: (183752462.479 - 183752441.977) + 10,
      headersEnd: (183752667.771 - 183752441.977) + 10,
      finish: (183752669.233 - 183752441.977) + 10,
      start: 10,
      end: (183752670.454 - 183752441.977) + 10,
    });
  });

  it('can search for entries within a given time-range', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const boundsMs = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.Meta.traceBounds);
    dataProvider.setWindowTimes(boundsMs.min, boundsMs.max);

    const filter = new Timeline.TimelineFilters.TimelineRegExp(/app\.js/i);
    const results = dataProvider.search(parsedTrace.Meta.traceBounds, filter);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0], {index: 8, startTimeMilli: 122411056.533, provider: 'network'});
  });

  it('persists track configurations to the setting if it is provided with one', async function() {
    const {Settings} = Common.Settings;
    const setting =
        Settings.instance().createSetting<PerfUi.FlameChart.PersistedGroupConfig[]|null>('persist-flame-config', null);

    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.setPersistedGroupConfigSetting(setting);

    const groups = dataProvider.timelineData().groups;
    assert.lengthOf(groups, 1);
    assert.isUndefined(groups[0].expanded);

    // Pretend the user has expanded the group
    groups[0].expanded = true;
    dataProvider.handleTrackConfigurationChange(groups, [0]);

    const newSetting = setting.get();
    assert.deepEqual(newSetting, [
      {
        expanded: true,
        hidden: false,
        originalIndex: 0,
        visualIndex: 0,
        trackName: 'Network',
      },
    ]);
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
