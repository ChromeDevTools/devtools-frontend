// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import type * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

const {assert} = chai;

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, traceParsedData: TraceModel.Handlers.Types.TraceParseData,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl):
    Timeline.LayoutShiftsTrackAppender.LayoutShiftsTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
  return compatibilityTracksAppender.layoutShiftsTrackAppender();
}

describeWithEnvironment('LayoutShiftsTrackAppender', function() {
  async function renderTrackAppender(context: Mocha.Context|Mocha.Suite, trace: string): Promise<{
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    layoutShiftsTrackAppender: Timeline.LayoutShiftsTrackAppender.LayoutShiftsTrackAppender,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    traceParsedData: Readonly<TraceModel.Handlers.Migration.PartialTraceData>,
  }> {
    const entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
    const entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
    const flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    const {traceParsedData, timelineModel} = await TraceLoader.allModels(context, trace);
    const layoutShiftsTrackAppender =
        initTrackAppender(flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
    layoutShiftsTrackAppender.appendTrackAtLevel(0);

    return {
      entryTypeByLevel,
      traceParsedData,
      flameChartData,
      layoutShiftsTrackAppender,
      entryData,
    };
  }

  it('marks all levels used by the track with the TrackAppender type', async function() {
    const {entryTypeByLevel} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    // Only one row of layout shifts.
    assert.strictEqual(entryTypeByLevel.length, 1);
    assert.deepEqual(entryTypeByLevel, [
      Timeline.TimelineFlameChartDataProvider.EntryType.TrackAppender,
    ]);
  });

  it('does not append anything if there are no layout shifts', async function() {
    // No layout shifts.
    const {entryTypeByLevel} = await renderTrackAppender(this, 'animation.json.gz');
    assert.lengthOf(entryTypeByLevel, 0);
  });

  it('creates a flamechart group', async function() {
    const {flameChartData} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    assert.strictEqual(flameChartData.groups.length, 1);
    assert.strictEqual(flameChartData.groups[0].name, 'Layout Shifts');
  });

  it('adds all layout shifts with the correct start times', async function() {
    const {flameChartData, traceParsedData, entryData} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    const events = traceParsedData.LayoutShifts.clusters.flatMap(c => c.events);
    for (const event of events) {
      const markerIndex = entryData.indexOf(event);
      assert.isDefined(markerIndex);
      assert.strictEqual(
          flameChartData.entryStartTimes[markerIndex], TraceModel.Helpers.Timing.microSecondsToMilliseconds(event.ts));
    }
  });

  it('sets all layout shifts to be 5ms in duration', async function() {
    const {flameChartData, traceParsedData, entryData} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    const events = traceParsedData.LayoutShifts.clusters.flatMap(c => c.events);
    for (const event of events) {
      const markerIndex = entryData.indexOf(event);
      assert.isDefined(markerIndex);
      assert.strictEqual(flameChartData.entryTotalTimes[markerIndex], 5);
    }
  });

  it('returns the correct title for a layout shift', async function() {
    const {layoutShiftsTrackAppender, traceParsedData} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    const shifts = traceParsedData.LayoutShifts.clusters.flatMap(c => c.events);
    const title = layoutShiftsTrackAppender.titleForEvent(shifts[0]);
    assert.strictEqual(title, 'Layout shift');
  });

  it('shows "Layout shift" text on hover', async function() {
    const {layoutShiftsTrackAppender, traceParsedData} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    const shifts = traceParsedData.LayoutShifts.clusters.flatMap(c => c.events);
    const info = layoutShiftsTrackAppender.highlightedEntryInfo(shifts[0]);
    assert.deepEqual(info, {
      title: 'Layout shift',
      formattedTime: '',
    });
  });
});
