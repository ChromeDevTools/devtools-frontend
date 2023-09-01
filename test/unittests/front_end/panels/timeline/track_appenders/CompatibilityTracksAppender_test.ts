// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

const {assert} = chai;

describeWithEnvironment('TimingTrackAppender', function() {
  let traceParsedData: TraceModel.Handlers.Types.TraceParseData;
  let tracksAppender: Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender;
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  async function initTrackAppender(
      context: Mocha.Suite|Mocha.Context, fixture = 'timings-track.json.gz'): Promise<void> {
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
    const data = await TraceLoader.allModels(context, fixture);
    traceParsedData = data.traceParsedData;
    tracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
        flameChartData, traceParsedData, entryData, entryTypeByLevel, data.timelineModel);
    const timingsTrack = tracksAppender.timingsTrackAppender();
    const gpuTrack = tracksAppender.gpuTrackAppender();
    const threadAppenders = tracksAppender.threadAppenders();
    let currentLevel = timingsTrack.appendTrackAtLevel(0);
    currentLevel = gpuTrack.appendTrackAtLevel(currentLevel);
    for (const threadAppender of threadAppenders) {
      currentLevel = threadAppender.appendTrackAtLevel(currentLevel);
    }
  }

  beforeEach(async () => {
    await initTrackAppender(this);
  });

  describe('CompatibilityTracksAppender', () => {
    describe('eventsInTrack', () => {
      it('returns all the events appended by a track with multiple levels', () => {
        const timingsTrack = tracksAppender.timingsTrackAppender();
        const timingsTrackEvents = tracksAppender.eventsInTrack(timingsTrack);
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
        const gpuTrack = tracksAppender.gpuTrackAppender();
        const gpuTrackEvents =
            tracksAppender.eventsInTrack(gpuTrack) as readonly TraceModel.Types.TraceEvents.TraceEventData[];
        assert.deepEqual(gpuTrackEvents, traceParsedData.GPU.mainGPUThreadTasks);
      });
    });
    describe('eventsForTreeView', () => {
      it('returns only sync events if using async events means a tree cannot be built', () => {
        const timingsTrack = tracksAppender.timingsTrackAppender();
        const timingsEvents = tracksAppender.eventsInTrack(timingsTrack);
        assert.isFalse(tracksAppender.canBuildTreesFromEvents(timingsEvents));
        const treeEvents = tracksAppender.eventsForTreeView(timingsTrack);
        const allEventsAreSync = treeEvents.every(event => !TraceModel.Types.TraceEvents.isAsyncPhase(event.ph));
        assert.isTrue(allEventsAreSync);
      });
      it('returns both sync and async events if a tree can be built with them', async () => {
        // This file contains events in the timings track that can be assembled as a tree
        await initTrackAppender(this, 'sync-like-timings.json.gz');
        const timingsTrack = tracksAppender.timingsTrackAppender();
        const timingsEvents = tracksAppender.eventsInTrack(timingsTrack);
        assert.isTrue(tracksAppender.canBuildTreesFromEvents(timingsEvents));
        const treeEvents = tracksAppender.eventsForTreeView(timingsTrack);
        assert.deepEqual(treeEvents, timingsEvents);
      });

      it('returns events for tree view for nested tracks', async () => {
        // This file contains two rasterizer threads which should be
        // nested inside the same header.
        await initTrackAppender(this, 'lcp-images.json.gz');
        const rasterTracks = tracksAppender.threadAppenders().filter(
            threadAppender => threadAppender.threadType === Timeline.ThreadAppender.ThreadType.RASTERIZER);
        assert.strictEqual(rasterTracks.length, 2);

        const raster1Events = tracksAppender.eventsInTrack(rasterTracks[0]);
        assert.strictEqual(raster1Events.length, 6);
        assert.isTrue(tracksAppender.canBuildTreesFromEvents(raster1Events));
        const raster1TreeEvents = tracksAppender.eventsForTreeView(rasterTracks[0]);
        assert.deepEqual(raster1TreeEvents, raster1Events);

        const raster2Events = tracksAppender.eventsInTrack(rasterTracks[1]);
        assert.strictEqual(raster2Events.length, 1);
        assert.isTrue(tracksAppender.canBuildTreesFromEvents(raster2Events));
        const raster2TreeEvents = tracksAppender.eventsForTreeView(rasterTracks[1]);
        assert.deepEqual(raster2TreeEvents, raster2Events);
      });
    });
    describe('groupEventsForTreeView', () => {
      it('returns all the events of a flame chart group with multiple levels', async () => {
        // This file contains events in the timings track that can be assembled as a tree
        await initTrackAppender(this, 'sync-like-timings.json.gz');
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
