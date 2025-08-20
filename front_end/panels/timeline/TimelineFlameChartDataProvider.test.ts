// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Trace from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  describeWithEnvironment,
  registerActions,
  stubNoopSettings,
  updateHostConfig
} from '../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace, setupIgnoreListManagerEnvironment} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as PerfUi from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('TimelineFlameChartDataProvider', function() {
  beforeEach(() => {
    const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
    });
  });
  afterEach(() => {
    SDK.TargetManager.TargetManager.removeInstance();
    Workspace.Workspace.WorkspaceImpl.removeInstance();
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
    Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
  });

  it('shows initiator arrows when an event that has them is selected', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'scheduler-post-task.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const timelineData1 = dataProvider.timelineData();
    assert.lengthOf(timelineData1.initiatorsData, 0);

    // a postTask scheduled event - picked as it has an initiator
    const event = allThreadEntriesInTrace(parsedTrace).find(event => {
      return event.name === Trace.Types.Events.Name.RUN_POST_TASK_CALLBACK && event.ts === 512724961655;
    });
    assert.exists(event);
    const index = dataProvider.indexForEvent(event);
    assert.isNotNull(index);

    dataProvider.buildFlowForInitiator(index);
    const timelineData2 = dataProvider.timelineData();
    assert.lengthOf(timelineData2.initiatorsData, 1);

    dataProvider.buildFlowForInitiator(-1);
    const timelineData3 = dataProvider.timelineData();
    assert.lengthOf(timelineData3.initiatorsData, 0);
  });

  it('caches initiator arrows for the same event', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'scheduler-post-task.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.timelineData();
    // a postTask scheduled event - picked as it has an initiator
    const event = allThreadEntriesInTrace(parsedTrace).find(event => {
      return event.name === Trace.Types.Events.Name.RUN_POST_TASK_CALLBACK && event.ts === 512724961655;
    });
    assert.exists(event);
    const index = dataProvider.indexForEvent(event);
    assert.isNotNull(index);
    dataProvider.buildFlowForInitiator(index);
    const initiatorDataBefore = dataProvider.timelineData().initiatorsData;
    dataProvider.buildFlowForInitiator(-1);
    dataProvider.buildFlowForInitiator(index);
    const initiatorDataAfter = dataProvider.timelineData().initiatorsData;
    assert.strictEqual(initiatorDataBefore, initiatorDataAfter);
  });

  it('does not trigger a redraw if there are no initiators for the old and new selection', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'scheduler-post-task.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.timelineData();
    // a RunTask event with no initiators
    const event = allThreadEntriesInTrace(parsedTrace).find(event => {
      return event.name === Trace.Types.Events.Name.RUN_TASK && event.ts === 512724754996;
    });
    assert.exists(event);
    const index = dataProvider.indexForEvent(event);
    assert.isNotNull(index);
    const shouldRedraw = dataProvider.buildFlowForInitiator(index);
    assert.isFalse(shouldRedraw);  // this event has no initiators
    const shouldRedrawAgain = dataProvider.buildFlowForInitiator(-1);
    assert.isFalse(shouldRedrawAgain);  // previous event has no initiators & user has selected no event
  });

  describe('groupTreeEvents', function() {
    it('returns the correct events for tree views given a flame chart group', async function() {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
      dataProvider.setModel(parsedTrace, entityMapper);
      const timingsTrackGroup = dataProvider.timelineData().groups.find(g => g.name === 'Timings');
      assert.isOk(timingsTrackGroup, 'Could not find Timings track flame chart group');
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
      assert.isOk(timingsTrackGroup, 'Could not find Timings track flame chart group');
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
    const groupNames = dataProvider.timelineData().groups.map(g => [g.name, g.subtitle]);
    assert.deepEqual(groupNames, [
      ['Frames', undefined], ['Timings', undefined], ['Interactions', undefined], ['A track group', '— Custom'],
      ['Another Extension Track', undefined], ['An Extension Track', '— Custom'], ['TimeStamp track', '— Custom'],
      ['Main — http://localhost:3000/', undefined], ['Thread pool', undefined], ['Thread pool worker 1', undefined],
      ['Thread pool worker 2', undefined], ['Thread pool worker 3', undefined], ['StackSamplingProfiler', undefined],
      ['GPU', undefined]
    ]);
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

  it('shows Debug with AI submenu items', async function() {
    updateHostConfig({
      devToolsAiSubmenuPrompts: {
        enabled: true,
      },
    });
    stubNoopSettings();
    registerActions([{
      actionId: 'drjones.performance-panel-context',
      title: () => 'Debug with AI' as Platform.UIString.LocalizedString,
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
    }]);

    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    const contextMenu = dataProvider.customizedContextMenu(new MouseEvent('click'), 7, 0);
    assert.exists(contextMenu);
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Label entry', 'Assess the purpose', 'Identify time spent', 'Find improvements']);
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

  it('persists track configurations to the setting if it is provided with one', async function() {
    const {Settings} = Common.Settings;
    const setting =
        Settings.instance().createSetting<PerfUi.FlameChart.PersistedGroupConfig[]|null>('persist-flame-config', null);

    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    dataProvider.setModel(parsedTrace, entityMapper);
    dataProvider.setPersistedGroupConfigSetting(setting);

    let groups = dataProvider.timelineData().groups;

    // To save the size of the assertion, let's only care about the first 3 groups.
    groups = groups.slice(0, 3);
    // Move the first group to the end.
    const newVisualOrder = [1, 2, 0];

    dataProvider.handleTrackConfigurationChange(groups, newVisualOrder);

    const newSetting = setting.get();
    assert.deepEqual(newSetting, [
      {
        expanded: false,
        hidden: false,
        originalIndex: 0,
        visualIndex: 2,
        trackName: 'Frames',
      },
      {
        expanded: false,
        hidden: false,
        originalIndex: 1,
        visualIndex: 0,
        trackName: '',  // This is screenshots.
      },
      {
        expanded: false,
        hidden: false,
        originalIndex: 2,
        visualIndex: 1,
        trackName: 'Animations',
      }
    ]);
  });
});
