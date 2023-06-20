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
import {allModelsFromFile} from '../../helpers/TraceHelpers.js';

describeWithEnvironment('TimelineFlameChartDataProvider', () => {
  describe('groupTreeEvents', () => {
    it('returns the correct events for tree views given a flame chart group', async () => {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel, filmStripModel} = await allModelsFromFile('sync-like-timings.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData, filmStripModel);
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
      ];
      assert.deepEqual(groupTreeEvents, allTimingEvents);
    });

    it('filters out async events if they cannot be added to the tree', async () => {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel, filmStripModel} = await allModelsFromFile('timings-track.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData, filmStripModel);
      const timingsTrackGroup = dataProvider.timelineData().groups.find(g => g.name === 'Timings');
      if (!timingsTrackGroup) {
        assert.fail('Could not find Timings track flame chart group');
      }
      const groupTreeEvents = dataProvider.groupTreeEvents(timingsTrackGroup);
      assert.strictEqual(groupTreeEvents?.length, 11);
      const allEventsAreSync = groupTreeEvents?.every(
          event => !TraceEngine.Types.TraceEvents.isAsyncPhase(SDK.TracingModel.phaseForEvent(event)));
      assert.isTrue(allEventsAreSync);
    });

    it('returns data from the old engine if necessary', async () => {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel, filmStripModel} = await allModelsFromFile('timings-track.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData, filmStripModel);
      const mainTrack = dataProvider.timelineData().groups.find(g => g.name.includes('Main'));
      if (!mainTrack) {
        assert.fail('Could not find Main track flame chart group');
      }
      const groupTreeEvents = dataProvider.groupTreeEvents(mainTrack);
      assert.strictEqual(groupTreeEvents?.length, 28995);
    });

    it('adds candy stripe decorations to long tasks in the main thread', async () => {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel, filmStripModel} =
          await allModelsFromFile('one-second-interaction.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData, filmStripModel);

      const {entryDecorations} = dataProvider.timelineData();

      const definedDecorationIndexes: number[] = [];
      entryDecorations.forEach((decorationsForEvent, index) => {
        if (decorationsForEvent && decorationsForEvent.length > 0) {
          definedDecorationIndexes.push(index);
        }
      });

      // Expect two decorations: the striping on the interaction, and the
      // striping on the long task.
      assert.lengthOf(definedDecorationIndexes, 2);

      const titles = definedDecorationIndexes.map(index => {
        return dataProvider.entryTitle(index);
      });

      assert.deepEqual(titles, [
        'Pointer',  // The interaction event in the Interactions track for the pointer event.
        'Task',     // The Long task that was caused by the pointer and contributed to the long time.
      ]);
    });
  });

  describe('ignoring frames', () => {
    it('removes entries from the data that match the ignored URL', async () => {
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
      const {traceParsedData, performanceModel, filmStripModel} = await allModelsFromFile('react-hello-world.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData, filmStripModel);

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
});
