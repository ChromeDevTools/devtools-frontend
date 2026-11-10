// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import * as sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import type * as PerfUi from '../../ui/legacy/components/perf_ui/perf_ui.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineFlameChartNetworkDataProvider', function() {
  it('renders the network track correctly', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);

    const minTime = Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.max);

    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.setWindowTimes(minTime, maxTime);

    // TimelineFlameChartNetworkDataProvider only has network track, so should always be one track group.
    assert.lengthOf(dataProvider.timelineData().groups, 1);
    const networkTrackGroup = dataProvider.timelineData().groups[0];

    assert.deepEqual(dataProvider.minimumBoundary(), minTime);
    assert.deepEqual(dataProvider.totalTime(), maxTime - minTime);

    const networkEvents = parsedTrace.data.NetworkRequests.byTime;
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

    // Network requests use getDrawOverride, so forceDecoration is false unless it is a WebSocket connection.
    assert.isFalse(dataProvider.forceDecoration(0));
    assert.exists(dataProvider.getDrawOverride(0));

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
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const timelineData1 = dataProvider.timelineData();
    assert.lengthOf(timelineData1.initiatorsData, 0);  // no initiators by default

    // A network event that has an initiator - nothing special about the exact event.
    const event = parsedTrace.data.NetworkRequests.byId.get('90829.57');
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

  it('clears the cached selection on reset', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.timelineData();
    const selection = dataProvider.createSelection(0);
    assert.isNotNull(selection);
    assert.strictEqual(dataProvider.entryIndexForSelection(selection), 0);
    dataProvider.reset();
    assert.strictEqual(dataProvider.entryIndexForSelection(selection), -1);
  });

  it('recomputes initiator arrows when loading a new trace at the same entry index', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.timelineData();

    const event = parsedTrace.data.NetworkRequests.byId.get('90829.57');
    assert.exists(event);
    const index = dataProvider.indexForEvent(event);
    assert.isNotNull(index);

    dataProvider.buildFlowForInitiator(index);
    assert.lengthOf(dataProvider.timelineData().initiatorsData, 3);

    const parsedTrace2 = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const entityMapper2 = new Trace.EntityMapper.EntityMapper(parsedTrace2);

    // Query the same numeric entry index in a fresh provider for the second trace to establish
    // the expected arrows and verify index-keyed cache invalidation across setModel() calls.
    const expectedProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    expectedProvider.setModel(parsedTrace2, entityMapper2);
    expectedProvider.timelineData();
    assert.exists(expectedProvider.eventByIndex(index));
    expectedProvider.buildFlowForInitiator(index);
    const expectedInitiators = expectedProvider.timelineData().initiatorsData;
    assert.notStrictEqual(expectedInitiators.length, 3);

    dataProvider.setModel(parsedTrace2, entityMapper2);
    dataProvider.timelineData();

    dataProvider.buildFlowForInitiator(index);
    assert.deepEqual(dataProvider.timelineData().initiatorsData, expectedInitiators);
  });

  it('can return the group for a given entryIndex', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.timelineData();

    assert.strictEqual(
        dataProvider.groupForEvent(0)?.name,
        'Network',
    );
  });

  it('filters navigations to only return those that happen on the main frame', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);

    const minTime = Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.max);

    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.setWindowTimes(minTime, maxTime);

    const mainFrameID = parsedTrace.data.Meta.mainFrameId;
    const navigationEvents = dataProvider.mainFrameNavigationStartEvents();
    // Ensure that every navigation event that we return is for the main frame.
    assert.isTrue(navigationEvents.every(navEvent => {
      return navEvent.args.frame === mainFrameID;
    }));
  });

  it('can provide the index for an event and the event for a given index', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);

    const event = dataProvider.eventByIndex(0);
    assert.isOk(event);
    assert.strictEqual(dataProvider.indexForEvent(event), 0);
  });

  it('does not render the network track if there are no network requests', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'basic.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);

    const minTime = Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.max);

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

    // Network requests use getDrawOverride, so forceDecoration is false unless it is a WebSocket connection.
    assert.isFalse(dataProvider.forceDecoration(0));

    // The network track won't show if it is empty.
    assert.isTrue(dataProvider.isEmpty());

    assert.strictEqual(dataProvider.preferredHeight(), 0);
  });

  it('draws a network request with whiskers and waiting time via getDrawOverride', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'cls-cluster-max-timeout.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const boundsMs = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.data.Meta.traceBounds);
    dataProvider.setWindowTimes(boundsMs.min, boundsMs.max);
    dataProvider.timelineData();

    const event = parsedTrace.data.NetworkRequests.byTime[1];
    const index = dataProvider.indexForEvent(event);
    assert.isNotNull(index);
    assert.isFalse(dataProvider.forceDecoration(index));

    const drawOverride = dataProvider.getDrawOverride(index);
    assert.exists(drawOverride);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    assert.exists(context);
    const fillRectSpy = sinon.spy(context, 'fillRect');
    const moveToSpy = sinon.spy(context, 'moveTo');
    const lineToSpy = sinon.spy(context, 'lineTo');

    const beginTime = Trace.Helpers.Timing.microToMilli(event.ts);
    const timeToPosition = (time: number): number => Math.floor((time - beginTime) + 10);
    const startX = timeToPosition(beginTime);
    const endX = timeToPosition(Trace.Helpers.Timing.microToMilli((event.ts + event.dur) as Trace.Types.Timing.Micro));

    const pos = drawOverride(context, startX, 20, endX - startX, 17, timeToPosition, color => color);
    assert.deepEqual(pos, {x: startX, width: Math.max(endX - startX, 1)});

    const sendStart = timeToPosition(Trace.Helpers.Timing.microToMilli(event.args.data.syntheticData.sendStartTime));
    const headersEnd = timeToPosition(Trace.Helpers.Timing.microToMilli(event.args.data.syntheticData.downloadStart));
    const finish = timeToPosition(Trace.Helpers.Timing.microToMilli(event.args.data.syntheticData.finishTime));

    // Request box [sendStart, finish] and waiting overlay [sendStart + 0.5, headersEnd], with no container clearRect.
    sinon.assert.calledWithExactly(fillRectSpy.firstCall, sendStart, 20, finish - sendStart, 16);
    sinon.assert.calledWithExactly(fillRectSpy.secondCall, sendStart + 0.5, 20.5, headersEnd - sendStart - 0.5, 15);
    sinon.assert.callCount(fillRectSpy, 2);

    // Left whisker from start to sendStart and right whisker from end to finish.
    sinon.assert.calledWithExactly(lineToSpy, sendStart, 28.5);
    sinon.assert.calledWithExactly(lineToSpy, finish, 28.5);
    assert.isAtLeast(moveToSpy.callCount, 4);
  });

  it('can search for entries within a given time-range', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const boundsMs = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.data.Meta.traceBounds);
    dataProvider.setWindowTimes(boundsMs.min, boundsMs.max);

    const filter = new Timeline.TimelineFilters.TimelineRegExp(/app\.js/i);
    const results = dataProvider.search(parsedTrace.data.Meta.traceBounds, filter);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0], {index: 8, startTimeMilli: 122411056.533, provider: 'network'});
  });

  it('persists track configurations to the setting if it is provided with one', async function() {
    const {Settings} = Common.Settings;
    const setting =
        Settings.instance().createSetting<PerfUi.FlameChart.PersistedGroupConfig[]|null>('persist-flame-config', null);

    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
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

  it('prepares popover element for network request events', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);

    const popover = dataProvider.preparePopoverElement(0);
    assert.isNotNull(popover);

    // Non-network request or invalid index returns null
    const nonExistentPopover = dataProvider.preparePopoverElement(-1);
    assert.isNull(nonExistentPopover);
  });

  it('marks WebSocket track levels as force-drawable by level index rather than WebSocket ID', async function() {
    const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-sockets.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const timelineData = dataProvider.timelineData();

    const wsConnection = parsedTrace.data.NetworkRequests.webSocket[0]?.syntheticConnection;
    assert.exists(wsConnection);
    const wsIndex = dataProvider.indexForEvent(wsConnection);
    assert.isNotNull(wsIndex);

    const wsLevel = timelineData.entryLevels[wsIndex];
    const wsIdentifier = wsConnection.args.data.identifier;
    assert.notStrictEqual(wsLevel, wsIdentifier);
    assert.isTrue(dataProvider.forceDrawableLevel(wsLevel));
    assert.isFalse(dataProvider.forceDrawableLevel(wsIdentifier));
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
