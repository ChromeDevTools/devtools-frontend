// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupIgnoreListManagerEnvironment} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as PerfUi from '../../ui/legacy/components/perf_ui/perf_ui.js';

import * as Timeline from './timeline.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('TimelineFlameChartDataProvider', function() {
  describe('groupTreeEvents', function() {
    it('returns the correct events for tree views given a flame chart group', async function() {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
      dataProvider.setModel(parsedTrace, entityMapper);
      const timingsTrackGroup = dataProvider.timelineData().groups.find(g => g.name === 'Timings');
      if (!timingsTrackGroup) {
        assert.fail('Could not find Timings track flame chart group');
      }
      const groupTreeEvents = dataProvider.groupTreeEvents(timingsTrackGroup);
      const allTimingEvents = [
        ...parsedTrace.UserTimings.consoleTimings,
        ...parsedTrace.UserTimings.timestampEvents,
        ...parsedTrace.UserTimings.performanceMarks,
        ...parsedTrace.UserTimings.performanceMeasures,
      ].sort((a, b) => a.ts - b.ts);
      assert.deepEqual(groupTreeEvents, allTimingEvents);
    });

    it('filters out async events if they cannot be added to the tree', async function() {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
      const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
      dataProvider.setModel(parsedTrace, entityMapper);
      const timingsTrackGroup = dataProvider.timelineData().groups.find(g => g.name === 'Timings');
      if (!timingsTrackGroup) {
        assert.fail('Could not find Timings track flame chart group');
      }
      const groupTreeEvents = dataProvider.groupTreeEvents(timingsTrackGroup);
      assert.strictEqual(groupTreeEvents?.length, 6);
      const allEventsAreSync = groupTreeEvents?.every(event => !Trace.Types.Events.isPhaseAsync(event.ph));
      assert.isTrue(allEventsAreSync);
    });
  });

  it('can provide the index for an event and the event for a given index', async function() {
    setupIgnoreListManagerEnvironment();
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);

    // Need to use an index that is not a frame, so jump past the frames.
    const event = dataProvider.eventByIndex(100);
    assert.isOk(event);
    assert.strictEqual(dataProvider.indexForEvent(event), 100);
  });
  it('renders track in the correct order by default', async function() {
    setupIgnoreListManagerEnvironment();
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const groupNames = dataProvider.timelineData().groups.map(g => g.name);
    assert.deepEqual(
        groupNames,
        [
          'Frames',
          'Timings',
          'Interactions',
          'A track group — Custom track',
          'Another Extension Track',
          'An Extension Track — Custom track',
          'Main — http://localhost:3000/',
          'Thread pool',
          'Thread pool worker 1',
          'Thread pool worker 2',
          'Thread pool worker 3',
          'StackSamplingProfiler',
          'GPU',
        ],
    );
  });

  it('can return the FlameChart group for a given event', async function() {
    setupIgnoreListManagerEnvironment();
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    // Force the track appenders to run and populate the chart data.
    dataProvider.timelineData();

    const longest = parsedTrace.UserInteractions.longestInteractionEvent;
    assert.isOk(longest);
    const index = dataProvider.indexForEvent(longest);
    assert.isNotNull(index);
    const group = dataProvider.groupForEvent(index);
    assert.strictEqual(group?.name, 'Interactions');
  });

  it('adds candy stripe and triangle decorations to long tasks in the main thread', async function() {
    setupIgnoreListManagerEnvironment();
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.timelineData();

    const {entryDecorations} = dataProvider.timelineData();
    const stripingTitles: string[] = [];
    const triangleTitles: string[] = [];

    Object.entries(entryDecorations).forEach(([index, decorationsForEvent]) => {
      const entryTitle = dataProvider.entryTitle(parseInt(index, 10)) ?? '';
      for (const decoration of decorationsForEvent) {
        if (decoration.type === PerfUi.FlameChart.FlameChartDecorationType.CANDY) {
          stripingTitles.push(entryTitle);
        }
        if (decoration.type === PerfUi.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE) {
          triangleTitles.push(entryTitle);
        }
      }
    });

    assert.deepEqual(stripingTitles, [
      'Pointer',  // The interaction event in the Interactions track for the pointer event.
      'Task',     // The same long task as above, but rendered by the new engine.
    ]);
    assert.deepEqual(triangleTitles, [
      'Pointer',  // The interaction event in the Interactions track for the pointer event.
      'Task',     // The same long task as above, but rendered by the new engine.
    ]);
  });

  it('populates the frames track with frames and screenshots', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const framesTrack = dataProvider.timelineData().groups.find(g => {
      return g.name.includes('Frames');
    });
    if (!framesTrack) {
      throw new Error('Could not find expected Frames track');
    }
    const framesLevel = framesTrack.startLevel;
    const screenshotsLevel = framesLevel + 1;
    // The frames track first shows the frames, and then shows screenhots just below it.
    assert.strictEqual(
        dataProvider.getEntryTypeForLevel(framesLevel), Timeline.TimelineFlameChartDataProvider.EntryType.FRAME);
    assert.strictEqual(
        dataProvider.getEntryTypeForLevel(screenshotsLevel),
        Timeline.TimelineFlameChartDataProvider.EntryType.SCREENSHOT);

    // There are 5 screenshots in this trace, so we expect there to be 5 events on the screenshots track level.
    const eventsOnScreenshotsLevel = dataProvider.timelineData().entryLevels.filter(e => e === screenshotsLevel);
    assert.lengthOf(eventsOnScreenshotsLevel, 5);
  });

  describe('ignoring frames', function() {
    it('removes entries from the data that match the ignored URL', async function() {
      const {ignoreListManager} = setupIgnoreListManagerEnvironment();

      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'react-hello-world.json.gz');
      const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
      dataProvider.setModel(parsedTrace, entityMapper);

      const eventCountBeforeIgnoreList = dataProvider.timelineData().entryStartTimes.length;

      const SCRIPT_TO_IGNORE = urlString`https://unpkg.com/react@18.2.0/umd/react.development.js`;
      // Clear the data provider cache and add the React script to the ignore list.
      dataProvider.reset();
      dataProvider.setModel(parsedTrace, entityMapper);
      ignoreListManager.ignoreListURL(SCRIPT_TO_IGNORE);

      const eventCountAfterIgnoreList = dataProvider.timelineData().entryStartTimes.length;
      // Ensure that the amount of events we show on the flame chart is less
      // than before, now we have added the React URL to the ignore list.
      assert.isBelow(eventCountAfterIgnoreList, eventCountBeforeIgnoreList);

      // Clear the data provider cache and unignore the script again
      dataProvider.reset();
      dataProvider.setModel(parsedTrace, entityMapper);
      ignoreListManager.unIgnoreListURL(SCRIPT_TO_IGNORE);
      // Ensure that now we have un-ignored the URL that we get the full set of events again.
      assert.strictEqual(dataProvider.timelineData().entryStartTimes.length, eventCountBeforeIgnoreList);
    });
  });

  it('filters navigations to only return those that happen on the main frame', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);

    dataProvider.setModel(parsedTrace, entityMapper);

    const mainFrameID = parsedTrace.Meta.mainFrameId;
    const navigationEvents = dataProvider.mainFrameNavigationStartEvents();
    // Ensure that every navigation event that we return is for the main frame.
    assert.isTrue(navigationEvents.every(navEvent => {
      return navEvent.args.frame === mainFrameID;
    }));
  });

  it('can search for entries within a given time-range', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);

    const bounds = parsedTrace.Meta.traceBounds;
    const filter = new Timeline.TimelineFilters.TimelineRegExp(/Evaluate script/);
    const results = dataProvider.search(bounds, filter);
    assert.lengthOf(results, 12);
    assert.deepEqual(results[0], {index: 147, startTimeMilli: 122411041.395, provider: 'main'});
  });

  it('delete annotations associated with an event', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const entryIndex = 0;
    const eventToFindAssociatedEntriesFor = dataProvider.eventByIndex(entryIndex);
    const event = dataProvider.eventByIndex(1);
    assert.exists(eventToFindAssociatedEntriesFor);
    assert.exists(event);

    // This label annotation should be deleted
    Timeline.ModificationsManager.ModificationsManager.activeManager()?.createAnnotation({
      type: 'ENTRY_LABEL',
      entry: eventToFindAssociatedEntriesFor,
      label: 'label',
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
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const eventIndex = 0;
    const event = dataProvider.eventByIndex(eventIndex);
    assert.exists(event);

    // Create a label for an event
    Timeline.ModificationsManager.ModificationsManager.activeManager()?.createAnnotation({
      type: 'ENTRY_LABEL',
      entry: event,
      label: 'label',
    });

    // Made sure the event has annotations
    assert.isTrue(dataProvider.entryHasAnnotations(eventIndex));

    // Delete annotations for the event
    dataProvider.deleteAnnotationsForEntry(eventIndex);

    // Made sure the event does not have annotations
    assert.isFalse(dataProvider.entryHasAnnotations(eventIndex));
  });
});
