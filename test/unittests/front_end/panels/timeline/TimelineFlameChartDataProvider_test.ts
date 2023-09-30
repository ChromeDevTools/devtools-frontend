// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

describeWithEnvironment('TimelineFlameChartDataProvider', function() {
  describe('groupTreeEvents', function() {
    it('returns the correct events for tree views given a flame chart group', async function() {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'sync-like-timings.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData);
      const timingsTrackGroup = dataProvider.timelineData().groups.find(g => g.name === 'Timings');
      if (!timingsTrackGroup) {
        assert.fail('Could not find Timings track flame chart group');
      }
      const groupTreeEvents = dataProvider.groupTreeEvents(timingsTrackGroup);
      const allTimingEvents = [
        ...traceParsedData.UserTimings.consoleTimings,
        ...traceParsedData.UserTimings.timestampEvents,
        ...traceParsedData.UserTimings.performanceMarks,
        ...traceParsedData.UserTimings.performanceMeasures,
        ...traceParsedData.PageLoadMetrics.allMarkerEvents,
      ].sort((a, b) => a.ts - b.ts);
      assert.deepEqual(groupTreeEvents, allTimingEvents);
    });

    it('filters out async events if they cannot be added to the tree', async function() {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'timings-track.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData);
      const timingsTrackGroup = dataProvider.timelineData().groups.find(g => g.name === 'Timings');
      if (!timingsTrackGroup) {
        assert.fail('Could not find Timings track flame chart group');
      }
      const groupTreeEvents = dataProvider.groupTreeEvents(timingsTrackGroup);
      assert.strictEqual(groupTreeEvents?.length, 12);
      const allEventsAreSync = groupTreeEvents?.every(
          event => !TraceEngine.Types.TraceEvents.isAsyncPhase(TraceEngine.Legacy.phaseForEvent(event)));
      assert.isTrue(allEventsAreSync);
    });

    it('returns data from the old engine if necessary', async function() {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'timings-track.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData);
      const tracksAppender = dataProvider.compatibilityTracksAppenderInstance();
      // Set the interactions track to be the only appender used so that
      // the main thread track defaults to the old engine.
      tracksAppender.setVisibleTracks(new Set(['Interactions']));
      const mainTrack = dataProvider.timelineData().groups.find(g => g.name.startsWith('Main —'));
      if (!mainTrack) {
        assert.fail('Could not find Main track flame chart group');
      }
      const groupTreeEvents = dataProvider.groupTreeEvents(mainTrack);
      assert.strictEqual(groupTreeEvents?.length, 28844);
    });
  });

  it('adds candy stripe and triangle decorations to long tasks in the main thread', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'one-second-interaction.json.gz');
    dataProvider.setModel(performanceModel, traceParsedData);

    const {entryDecorations} = dataProvider.timelineData();
    const stripingTitles: string[] = [];
    const triangleTitles: string[] = [];

    Object.entries(entryDecorations).forEach(([index, decorationsForEvent]) => {
      const entryTitle = dataProvider.entryTitle(parseInt(index, 10)) ?? '';
      for (const decoration of decorationsForEvent) {
        if (decoration.type === 'CANDY') {
          stripingTitles.push(entryTitle);
        }
        if (decoration.type === 'WARNING_TRIANGLE') {
          triangleTitles.push(entryTitle);
        }
      }
    });

    assert.deepEqual(stripingTitles, [
      'Pointer',  // The interaction event in the Interactions track for the pointer event.
      'Task',     // The Long task that was caused by the pointer and contributed to the long time (old engine).
      'Task',     // The same long task as above, but rendered by the new engine.
    ]);
    assert.deepEqual(triangleTitles, [
      'Task',          // The Long task that was caused by the pointer and contributed to the long time (old engine).
      'Task',          // The same long task as above, but rendered by the new engine.
      'Event: click',  // The click EventDispatch that's also marked with a triangle
    ]);
    assert.lengthOf(Object.keys(entryDecorations), 4);
  });

  it('populates the frames track with frames and screenshots', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'web-dev.json.gz');
    dataProvider.setModel(performanceModel, traceParsedData);
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
        dataProvider.getEntryTypeForLevel(framesLevel), Timeline.TimelineFlameChartDataProvider.EntryType.Frame);
    assert.strictEqual(
        dataProvider.getEntryTypeForLevel(screenshotsLevel),
        Timeline.TimelineFlameChartDataProvider.EntryType.Screenshot);

    // There are 5 screenshots in this trace, so we expect there to be 5 events on the screenshots track level.
    const eventsOnScreenshotsLevel = dataProvider.timelineData().entryLevels.filter(e => e === screenshotsLevel);
    assert.lengthOf(eventsOnScreenshotsLevel, 5);
  });

  describe('ignoring frames', function() {
    it('removes entries from the data that match the ignored URL', async function() {
      Root.Runtime.experiments.enableForTest('ignoreListJSFramesOnTimeline');

      const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
      const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);

      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
      });

      const ignoreListManager = Bindings.IgnoreListManager.IgnoreListManager.instance({
        forceNew: true,
        debuggerWorkspaceBinding,
      });

      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'react-hello-world.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData);

      const eventCountBeforeIgnoreList = dataProvider.timelineData().entryStartTimes.length;

      const SCRIPT_TO_IGNORE =
          'https://unpkg.com/react@18.2.0/umd/react.development.js' as Platform.DevToolsPath.UrlString;
      // Clear the data provider cache and add the React script to the ignore list.
      dataProvider.reset();
      ignoreListManager.ignoreListURL(SCRIPT_TO_IGNORE);

      const eventCountAfterIgnoreList = dataProvider.timelineData().entryStartTimes.length;
      // Ensure that the amount of events we show on the flame chart is less
      // than before, now we have added the React URL to the ignore list.
      assert.isBelow(eventCountAfterIgnoreList, eventCountBeforeIgnoreList);

      // Clear the data provider cache and unignore the script again
      dataProvider.reset();
      ignoreListManager.unIgnoreListURL(SCRIPT_TO_IGNORE);
      // Ensure that now we have un-ignored the URL that we get the full set of events again.
      assert.strictEqual(dataProvider.timelineData().entryStartTimes.length, eventCountBeforeIgnoreList);
    });
  });

  it('filters navigations to only return those that happen on the main frame', async function() {
    const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    const {traceParsedData, performanceModel} =
        await TraceLoader.allModels(this, 'multiple-navigations-with-iframes.json.gz');

    dataProvider.setModel(performanceModel, traceParsedData);

    const mainFrameID = traceParsedData.Meta.mainFrameId;
    const navigationEvents = dataProvider.mainFrameNavigationStartEvents();
    // Ensure that every navigation event that we return is for the main frame.
    assert.isTrue(navigationEvents.every(navEvent => {
      return navEvent.args.frame === mainFrameID;
    }));
  });
});
