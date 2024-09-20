// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {setupIgnoreListManagerEnvironment} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Timeline from '../timeline.js';

describeWithEnvironment('CompatibilityTracksAppender', function() {
  let parsedTrace: Trace.Handlers.Types.ParsedTrace;
  let tracksAppender: Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender;
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  async function initTrackAppender(
      context: Mocha.Suite|Mocha.Context, fixture = 'timings-track.json.gz'): Promise<void> {
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
    ({parsedTrace} = await TraceLoader.traceEngine(context, fixture));
    tracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
        flameChartData, parsedTrace, entryData, entryTypeByLevel);
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
    setupIgnoreListManagerEnvironment();
    await initTrackAppender(this);
  });

  describe('Tree view data', () => {
    describe('eventsInTrack', () => {
      it('returns all the events appended by a track with multiple levels', () => {
        const timingsTrack = tracksAppender.timingsTrackAppender();
        const timingsTrackEvents = tracksAppender.eventsInTrack(timingsTrack);
        const allTimingEvents = [
          ...parsedTrace.UserTimings.consoleTimings,
          ...parsedTrace.UserTimings.timestampEvents,
          ...parsedTrace.UserTimings.performanceMarks,
          ...parsedTrace.UserTimings.performanceMeasures,
          ...parsedTrace.PageLoadMetrics.allMarkerEvents.toSorted((m1, m2) => {
            // These get sorted based on the metric so we have to replicate
            // that for this assertion.
            return Timeline.TimingsTrackAppender.SORT_ORDER_PAGE_LOAD_MARKERS[m1.name] -
                Timeline.TimingsTrackAppender.SORT_ORDER_PAGE_LOAD_MARKERS[m2.name];
          }),
        ].sort((a, b) => a.ts - b.ts);
        assert.deepEqual(timingsTrackEvents, allTimingEvents);
      });

      it('returns all the events appended by a track with one level', () => {
        const gpuTrack = tracksAppender.gpuTrackAppender();
        const gpuTrackEvents = tracksAppender.eventsInTrack(gpuTrack) as readonly Trace.Types.Events.Event[];
        assert.deepEqual(gpuTrackEvents, parsedTrace.GPU.mainGPUThreadTasks);
      });
    });
    describe('eventsForTreeView', () => {
      it('returns only sync events if using async events means a tree cannot be built', () => {
        const timingsTrack = tracksAppender.timingsTrackAppender();
        const timingsEvents = tracksAppender.eventsInTrack(timingsTrack);
        assert.isFalse(Trace.Helpers.TreeHelpers.canBuildTreesFromEvents(timingsEvents));
        const treeEvents = tracksAppender.eventsForTreeView(timingsTrack);
        const allEventsAreSync = treeEvents.every(event => !Trace.Types.Events.isPhaseAsync(event.ph));
        assert.isTrue(allEventsAreSync);
      });
      it('returns both sync and async events if a tree can be built with them', async () => {
        // This file contains events in the timings track that can be assembled as a tree
        await initTrackAppender(this, 'sync-like-timings.json.gz');
        const timingsTrack = tracksAppender.timingsTrackAppender();
        const timingsEvents = tracksAppender.eventsInTrack(timingsTrack);
        assert.isTrue(Trace.Helpers.TreeHelpers.canBuildTreesFromEvents(timingsEvents));
        const treeEvents = tracksAppender.eventsForTreeView(timingsTrack);
        assert.deepEqual(treeEvents, timingsEvents);
      });

      it('returns events for tree view for nested tracks', async () => {
        // This file contains two rasterizer threads which should be
        // nested inside the same header.
        await initTrackAppender(this, 'lcp-images-rasterizer.json.gz');
        const rasterTracks = tracksAppender.threadAppenders().filter(
            threadAppender => threadAppender.threadType === Trace.Handlers.Threads.ThreadType.RASTERIZER);
        assert.strictEqual(rasterTracks.length, 2);

        const raster1Events = tracksAppender.eventsInTrack(rasterTracks[0]);
        assert.strictEqual(raster1Events.length, 6);
        assert.isTrue(Trace.Helpers.TreeHelpers.canBuildTreesFromEvents(raster1Events));
        const raster1TreeEvents = tracksAppender.eventsForTreeView(rasterTracks[0]);
        assert.deepEqual(raster1TreeEvents, raster1Events);

        const raster2Events = tracksAppender.eventsInTrack(rasterTracks[1]);
        assert.strictEqual(raster2Events.length, 1);
        assert.isTrue(Trace.Helpers.TreeHelpers.canBuildTreesFromEvents(raster2Events));
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
        }
        const allTimingEvents = [
          ...parsedTrace.UserTimings.consoleTimings,
          ...parsedTrace.UserTimings.timestampEvents,
          ...parsedTrace.UserTimings.performanceMarks,
          ...parsedTrace.UserTimings.performanceMeasures,
          ...parsedTrace.PageLoadMetrics.allMarkerEvents.toSorted((m1, m2) => {
            // These get sorted based on the metric so we have to replicate
            // that for this assertion.
            return Timeline.TimingsTrackAppender.SORT_ORDER_PAGE_LOAD_MARKERS[m1.name] -
                Timeline.TimingsTrackAppender.SORT_ORDER_PAGE_LOAD_MARKERS[m2.name];
          }),
        ].sort((a, b) => a.ts - b.ts);
        assert.deepEqual(timingsGroupEvents, allTimingEvents);
      });
      it('returns all the events of a flame chart group with one level', () => {
        const gpuGroupEvents =
            tracksAppender.groupEventsForTreeView(flameChartData.groups[1]) as readonly Trace.Types.Events.Event[];
        if (!gpuGroupEvents) {
          assert.fail('Could not find events for group');
        }
        assert.deepEqual(gpuGroupEvents, parsedTrace.GPU.mainGPUThreadTasks);
      });
    });
  });

  describe('highlightedEntryInfo', () => {
    it('shows the correct warning for a long task when hovered', async function() {
      await initTrackAppender(this, 'simple-js-program.json.gz');
      const events = parsedTrace.Renderer?.allTraceEntries;
      if (!events) {
        throw new Error('Could not find renderer events');
      }
      const longTask = events.find(e => (e.dur || 0) > 1_000_000);
      if (!longTask) {
        throw new Error('Could not find long task');
      }
      const info = tracksAppender.highlightedEntryInfo(longTask, 2);
      assert.strictEqual(info.warningElements?.length, 1);
      const warning = info.warningElements?.[0];
      if (!(warning instanceof HTMLSpanElement)) {
        throw new Error('Found unexpected warning');
      }
      assert.strictEqual(warning?.innerText, 'Long task took 1.30\u00A0s.');
    });

    it('shows the correct warning for a forced recalc styles when hovered', async function() {
      await initTrackAppender(this, 'large-layout-small-recalc.json.gz');
      const events = parsedTrace.Warnings.perWarning.get('FORCED_REFLOW') || [];

      if (!events) {
        throw new Error('Could not find forced reflows events');
      }
      const recalcStyles = events[0];
      if (!recalcStyles) {
        throw new Error('Could not find recalc styles');
      }
      const info = tracksAppender.highlightedEntryInfo(recalcStyles, 2);
      assert.strictEqual(info.warningElements?.length, 1);
      const warning = info.warningElements?.[0];
      if (!(warning instanceof HTMLSpanElement)) {
        throw new Error('Found unexpected warning');
      }
      assert.strictEqual(warning?.innerText, 'Forced reflow is a likely performance bottleneck.');
    });

    it('shows the correct warning for a forced layout when hovered', async function() {
      await initTrackAppender(this, 'large-layout-small-recalc.json.gz');
      const events = parsedTrace.Warnings.perWarning.get('FORCED_REFLOW') || [];

      if (!events) {
        throw new Error('Could not find forced reflows events');
      }
      const layout = events[1];
      if (!layout) {
        throw new Error('Could not find layout');
      }
      const info = tracksAppender.highlightedEntryInfo(layout, 2);
      assert.strictEqual(info.warningElements?.length, 1);
      const warning = info.warningElements?.[0];
      if (!(warning instanceof HTMLSpanElement)) {
        throw new Error('Found unexpected warning');
      }
      assert.strictEqual(warning?.innerText, 'Forced reflow is a likely performance bottleneck.');
    });

    it('shows the correct warning for slow idle callbacks', async function() {
      await initTrackAppender(this, 'idle-callback.json.gz');
      const events = parsedTrace.Renderer?.allTraceEntries;
      if (!events) {
        throw new Error('Could not find renderer events');
      }
      const idleCallback = events.find(event => {
        const {duration} = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
        if (!Trace.Types.Events.isFireIdleCallback(event)) {
          return false;
        }
        if (duration <= event.args.data.allottedMilliseconds) {
          false;
        }
        return true;
      });
      if (!idleCallback) {
        throw new Error('Could not find idle callback');
      }
      const info = tracksAppender.highlightedEntryInfo(idleCallback, 2);
      assert.strictEqual(info.warningElements?.length, 1);
      const warning = info.warningElements?.[0];
      if (!(warning instanceof HTMLSpanElement)) {
        throw new Error('Found unexpected warning');
      }
      assert.strictEqual(warning?.innerText, 'Idle callback execution extended beyond deadline by 79.56\u00A0ms');
    });
  });

  it('can return the group for a given level', async () => {
    await initTrackAppender(this, 'web-dev-with-commit.json.gz');
    // The order of these groups might seem odd, but it's based on the setup in
    // the initTrackAppender function which does Timings, GPU and then threads.
    const groupForLevel0 = tracksAppender.groupForLevel(0);
    assert.strictEqual(groupForLevel0?.name, 'Timings');
    const groupForLevel1 = tracksAppender.groupForLevel(1);
    assert.strictEqual(groupForLevel1?.name, 'GPU');
    const groupForLevel2 = tracksAppender.groupForLevel(2);
    assert.strictEqual(groupForLevel2?.name, 'Main — https://web.dev/');
  });
});
