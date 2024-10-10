// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineFlameChartNetworkDataProvider', function() {
  it('renders the network track correctly', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

    const minTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);

    dataProvider.setModel(parsedTrace);
    dataProvider.setWindowTimes(minTime, maxTime);

    // TimelineFlameChartNetworkDataProvider only has network track, so should always be one track group.
    assert.strictEqual(dataProvider.timelineData().groups.length, 1);
    const networkTrackGroup = dataProvider.timelineData().groups[0];

    assert.deepEqual(dataProvider.minimumBoundary(), minTime);
    assert.deepEqual(dataProvider.totalTime(), maxTime - minTime);

    const networkEvents = parsedTrace.NetworkRequests.byTime;
    const networkEventsStartTimes =
        networkEvents.map(request => Trace.Helpers.Timing.microSecondsToMilliseconds(request.ts));
    const networkEventsTotalTimes = networkEvents.map(request => {
      const {startTime, endTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(request);
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
    // The max level here is 3, so `clamp(this.#maxLevel + 1, 7, 8.5)` = 7
    assert.strictEqual(dataProvider.preferredHeight(), 17 * 7);
  });

  it('can return the group for a given entryIndex', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    dataProvider.setModel(parsedTrace);
    dataProvider.timelineData();

    assert.strictEqual(
        dataProvider.groupForEvent(0)?.name,
        'Network',
    );
  });

  it('filters navigations to only return those that happen on the main frame', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');

    const minTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);

    dataProvider.setModel(parsedTrace);
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
    dataProvider.setModel(parsedTrace);

    const event = dataProvider.eventByIndex(0);
    assert.isOk(event);
    assert.strictEqual(dataProvider.indexForEvent(event), 0);
  });

  it('does not render the network track if there is no network requests', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'basic.json.gz');

    const minTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);

    dataProvider.setModel(parsedTrace);
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
    dataProvider.setModel(parsedTrace);
    const boundsMs = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.Meta.traceBounds);
    dataProvider.setWindowTimes(boundsMs.min, boundsMs.max);

    const filter = new Timeline.TimelineFilters.TimelineRegExp(/app\.js/i);
    const results = dataProvider.search(parsedTrace.Meta.traceBounds, filter);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0], {index: 8, startTimeMilli: 122411056.533, provider: 'network'});
  });

  it('delete annotations associated with an event', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    dataProvider.setModel(parsedTrace);
    const entryIndex = 0;
    const eventToFindAssociatedEntriesFor = dataProvider.eventByIndex(entryIndex);
    const event = dataProvider.eventByIndex(1);
    assert.exists(eventToFindAssociatedEntriesFor);
    assert.exists(event);

    // This link annotation should be deleted
    Timeline.ModificationsManager.ModificationsManager.activeManager()?.createAnnotation({
      type: 'ENTRIES_LINK',
      entryFrom: eventToFindAssociatedEntriesFor,
      entryTo: event,
      state: Trace.Types.File.EntriesLinkState.CONNECTED,
    });

    Timeline.ModificationsManager.ModificationsManager.activeManager()?.createAnnotation({
      type: 'ENTRY_LABEL',
      entry: event,
      label: 'label',
    });

    dataProvider.deleteAnnotationsForEntry(entryIndex);
    // Make sure one of the annotations was deleted
    assert.deepEqual(Timeline.ModificationsManager.ModificationsManager.activeManager()?.getAnnotations().length, 1);
  });

  it('correctly identifies if an event has annotations', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    dataProvider.setModel(parsedTrace);
    const eventIndex = 0;
    const event = dataProvider.eventByIndex(eventIndex);
    const event2 = dataProvider.eventByIndex(1);
    assert.exists(event);
    assert.exists(event2);

    // Create a link between events
    Timeline.ModificationsManager.ModificationsManager.activeManager()?.createAnnotation({
      type: 'ENTRIES_LINK',
      entryFrom: event,
      entryTo: event2,
      state: Trace.Types.File.EntriesLinkState.CONNECTED,
    });

    // Made sure the event has annotations
    assert.isTrue(dataProvider.entryHasAnnotations(eventIndex));

    // Delete annotations for the event
    dataProvider.deleteAnnotationsForEntry(eventIndex);

    // Made sure the event does not have annotations
    assert.isFalse(dataProvider.entryHasAnnotations(eventIndex));
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
