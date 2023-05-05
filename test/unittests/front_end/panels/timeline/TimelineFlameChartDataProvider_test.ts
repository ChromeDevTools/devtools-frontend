// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {allModelsFromFile} from '../../helpers/TraceHelpers.js';

describeWithEnvironment('TimelineFlameChartDataProvider', () => {
  describe('groupTreeEvents', () => {
    it('returns the correct events for tree views given a flame chart group', async () => {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel} = await allModelsFromFile('sync-like-timings.json.gz');
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
      ];
      assert.deepEqual(groupTreeEvents, allTimingEvents);
    });

    it('filters out async events if they cannot be added to the tree', async () => {
      const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
      const {traceParsedData, performanceModel} = await allModelsFromFile('timings-track.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData);
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
      const {traceParsedData, performanceModel} = await allModelsFromFile('timings-track.json.gz');
      dataProvider.setModel(performanceModel, traceParsedData);
      const mainTrack = dataProvider.timelineData().groups.find(g => g.name.includes('Main'));
      if (!mainTrack) {
        assert.fail('Could not find Main track flame chart group');
      }
      const groupTreeEvents = dataProvider.groupTreeEvents(mainTrack);
      assert.strictEqual(groupTreeEvents?.length, 28995);
    });
  });
});
