// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, parsedTrace: Trace.Handlers.Types.ParsedTrace,
    entryData: Trace.Types.Events.Event[], entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[]):
    Timeline.LayoutShiftsTrackAppender.LayoutShiftsTrackAppender {
  const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, parsedTrace, entryData, entryTypeByLevel, entityMapper);
  return compatibilityTracksAppender.layoutShiftsTrackAppender();
}

describeWithEnvironment('LayoutShiftsTrackAppender', function() {
  async function renderTrackAppender(context: Mocha.Context|Mocha.Suite, trace: string): Promise<{
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    layoutShiftsTrackAppender: Timeline.LayoutShiftsTrackAppender.LayoutShiftsTrackAppender,
    entryData: Trace.Types.Events.Event[],
    parsedTrace: Readonly<Trace.Handlers.Types.ParsedTrace>,
  }> {
    const entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
    const entryData: Trace.Types.Events.Event[] = [];
    const flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    const {parsedTrace} = await TraceLoader.traceEngine(context, trace);
    const layoutShiftsTrackAppender = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
    layoutShiftsTrackAppender.appendTrackAtLevel(0);

    return {
      entryTypeByLevel,
      parsedTrace,
      flameChartData,
      layoutShiftsTrackAppender,
      entryData,
    };
  }

  it('marks all levels used by the track with the TrackAppender type', async function() {
    const {entryTypeByLevel} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    // Only one row of layout shifts.
    assert.lengthOf(entryTypeByLevel, 1);
    assert.deepEqual(entryTypeByLevel, [
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
    ]);
  });

  it('does not append anything if there are no layout shifts', async function() {
    // No layout shifts.
    const {entryTypeByLevel} = await renderTrackAppender(this, 'animation.json.gz');
    assert.lengthOf(entryTypeByLevel, 0);
  });

  it('creates a flamechart group', async function() {
    const {flameChartData} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    assert.lengthOf(flameChartData.groups, 1);
    assert.strictEqual(flameChartData.groups[0].name, 'Layout shifts');
  });

  it('adds all layout shifts with the correct start times', async function() {
    const {flameChartData, parsedTrace, entryData} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    const events = parsedTrace.LayoutShifts.clusters.flatMap(c => c.events);
    for (const event of events) {
      const markerIndex = entryData.indexOf(event);
      assert.exists(markerIndex);
      assert.strictEqual(flameChartData.entryStartTimes[markerIndex], Trace.Helpers.Timing.microToMilli(event.ts));
    }
  });

  it('does not define any title for a layout shift or a cluster', async () => {
    const {layoutShiftsTrackAppender, parsedTrace} = await renderTrackAppender(this, 'cls-no-nav.json.gz');
    const cluster = parsedTrace.LayoutShifts.clusters.at(0);
    assert.isOk(cluster);
    const shift = cluster.events.at(0);
    assert.isOk(shift);
    assert.strictEqual(layoutShiftsTrackAppender.titleForEvent(cluster), '');
    assert.strictEqual(layoutShiftsTrackAppender.titleForEvent(shift), '');
  });

  it('shows "Layout shift" tooltip on hover', async function() {
    const {layoutShiftsTrackAppender, parsedTrace} = await renderTrackAppender(this, 'cls-no-nav.json.gz');
    const shifts = parsedTrace.LayoutShifts.clusters.flatMap(c => c.events);
    await layoutShiftsTrackAppender.preloadScreenshots(shifts);

    const info: Timeline.CompatibilityTracksAppender.PopoverInfo = {
      title: 'title',
      formattedTime: 'time',
      warningElements: [],
      additionalElements: [],
      url: null,
    };

    layoutShiftsTrackAppender.setPopoverInfo(shifts[3], info);
    assert.strictEqual(info.title, 'Layout shift');
    assert.strictEqual(info.formattedTime, '0.0197');
    assert.strictEqual(info.additionalElements?.at(0)?.nodeName, 'DIV');
  });
});
