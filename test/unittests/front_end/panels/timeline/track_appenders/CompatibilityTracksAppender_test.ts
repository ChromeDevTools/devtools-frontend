// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {traceModelFromTraceFile} from '../../../helpers/TimelineHelpers.js';
import {loadModelDataFromTraceFile, setTraceModelTimeout} from '../../../helpers/TraceHelpers.js';

import type * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';

const {assert} = chai;

describeWithEnvironment('TimingTrackAppender', function() {
  setTraceModelTimeout(this);

  let traceParsedData: TraceModel.Handlers.Types.TraceParseData;
  let timelineModel: TimelineModel.TimelineModel.TimelineModelImpl;
  let tracksAppender: Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender;
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  async function initTrackAppender(fixture = 'timings-track.json.gz'): Promise<void> {
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
    traceParsedData = await loadModelDataFromTraceFile(fixture);
    timelineModel = (await traceModelFromTraceFile(fixture)).timelineModel;
    tracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
        flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
    const timingsTrack = tracksAppender.timingsTrackAppender();
    const gpuTrack = tracksAppender.gpuTrackAppender();
    const nextLevel = timingsTrack.appendTrackAtLevel(0);
    gpuTrack.appendTrackAtLevel(nextLevel);
  }

  beforeEach(async () => {
    await initTrackAppender();
  });

  describe('CompatibilityTracksAppender', () => {
    describe('eventsInTrack', () => {
      it('returns all the events appended by a track with multiple levels', () => {
        const timingsTrackEvents = tracksAppender.eventsInTrack('Timings');
        const allTimingEvents = [
          ...traceParsedData.UserTimings.consoleTimings,
          ...traceParsedData.UserTimings.timestampEvents,
          ...traceParsedData.UserTimings.performanceMarks,
          ...traceParsedData.UserTimings.performanceMeasures,
          ...traceParsedData.PageLoadMetrics.allMarkerEvents,
        ].sort((a, b) => a.ts - b.ts);
        assert.deepEqual(timingsTrackEvents, allTimingEvents);
      });
      it('returns all the events appended by a track with one level', () => {
        const gpuTrackEvents =
            tracksAppender.eventsInTrack('GPU') as readonly TraceModel.Types.TraceEvents.TraceEventData[];
        assert.deepEqual(gpuTrackEvents, traceParsedData.GPU.mainGPUThreadTasks);
      });
    });
    describe('eventsForTreeView', () => {
      it('returns only sync events if using async events means a tree cannot be built', () => {
        const timingsEvents = tracksAppender.eventsInTrack('Timings');
        assert.isFalse(tracksAppender.canBuildTreesFromEvents(timingsEvents));
        const treeEvents = tracksAppender.eventsForTreeView('Timings');
        const allEventsAreSync = treeEvents.every(event => !TraceModel.Types.TraceEvents.isAsyncPhase(event.ph));
        assert.isTrue(allEventsAreSync);
      });
      it('returns both sync and async events if a tree can be built with them', async () => {
        // This file contains events in the timings track that can be assembled as a tree
        await initTrackAppender('sync-like-timings.json.gz');
        const timingsEvents = tracksAppender.eventsInTrack('Timings');
        assert.isTrue(tracksAppender.canBuildTreesFromEvents(timingsEvents));
        const treeEvents = tracksAppender.eventsForTreeView('Timings');
        assert.deepEqual(treeEvents, timingsEvents);
      });
    });
    describe('groupEventsForTreeView', () => {
      it('returns all the events of a flame chart group with multiple levels', async () => {
        // This file contains events in the timings track that can be assembled as a tree
        await initTrackAppender('sync-like-timings.json.gz');
        const timingsGroupEvents = tracksAppender.groupEventsForTreeView(flameChartData.groups[0]);
        if (!timingsGroupEvents) {
          assert.fail('Could not find events for group');
          return;
        }
        const allTimingEvents = [
          ...traceParsedData.UserTimings.consoleTimings,
          ...traceParsedData.UserTimings.timestampEvents,
          ...traceParsedData.UserTimings.performanceMarks,
          ...traceParsedData.UserTimings.performanceMeasures,
          ...traceParsedData.PageLoadMetrics.allMarkerEvents,
        ].sort((a, b) => a.ts - b.ts);
        assert.deepEqual(timingsGroupEvents, allTimingEvents);
      });
      it('returns all the events of a flame chart group with one level', () => {
        const gpuGroupEvents = tracksAppender.groupEventsForTreeView(flameChartData.groups[1]) as
            readonly TraceModel.Types.TraceEvents.TraceEventData[];
        if (!gpuGroupEvents) {
          assert.fail('Could not find events for group');
          return;
        }
        assert.deepEqual(gpuGroupEvents, traceParsedData.GPU.mainGPUThreadTasks);
      });
    });
  });
});
