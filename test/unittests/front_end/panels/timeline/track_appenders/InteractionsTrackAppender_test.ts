// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {traceModelFromTraceFile} from '../../../helpers/TimelineHelpers.js';
import {loadModelDataFromTraceFile} from '../../../helpers/TraceHelpers.js';

import type * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';

const {assert} = chai;

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.TimelineData, traceParsedData: TraceModel.Handlers.Types.TraceParseData,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl):
    Timeline.InteractionsTrackAppender.InteractionsTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
  return compatibilityTracksAppender.interactionsTrackAppender();
}

describeWithEnvironment('InteractionsTrackAppender', () => {
  async function renderTrackAppender(trace: string): Promise<{
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    flameChartData: PerfUI.FlameChart.TimelineData,
    interactionsTrackAppender: Timeline.InteractionsTrackAppender.InteractionsTrackAppender,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    traceParsedData: Readonly<TraceModel.TraceModel.PartialTraceParseDataDuringMigration>,
  }> {
    const entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
    const entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
    const flameChartData = new PerfUI.FlameChart.TimelineData([], [], [], []);
    const traceParsedData = await loadModelDataFromTraceFile(trace);
    const timelineModel = (await traceModelFromTraceFile(trace)).timelineModel;
    const interactionsTrackAppender =
        initTrackAppender(flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
    interactionsTrackAppender.appendTrackAtLevel(0);

    return {
      entryTypeByLevel,
      traceParsedData,
      flameChartData,
      interactionsTrackAppender,
      entryData,
    };
  }

  describe('appendTrackAtLevel', () => {
    it('marks all levels used by the track with the `TrackAppender` type', async () => {
      const {entryTypeByLevel} = await renderTrackAppender('slow-interaction-button-click.json.gz');
      // There are enough events to fill two levels of track.
      const levelCount = 2;
      assert.strictEqual(entryTypeByLevel.length, levelCount);
      const allEntriesAreTrackAppender =
          entryTypeByLevel.every(type => type === Timeline.TimelineFlameChartDataProvider.EntryType.TrackAppender);
      assert.isTrue(allEntriesAreTrackAppender);
    });

    it('takes over no levels if there are no interactions', async () => {
      // animation trace has no interactions in it.
      const {entryTypeByLevel} = await renderTrackAppender('animation.json.gz');
      assert.strictEqual(entryTypeByLevel.length, 0);
    });

    it('creates a flamechart group', async () => {
      const {flameChartData} = await renderTrackAppender('slow-interaction-button-click.json.gz');
      assert.strictEqual(flameChartData.groups.length, 1);
      assert.strictEqual(flameChartData.groups[0].name, 'Interactions');
    });

    it('adds all interactions with the correct start times', async () => {
      const {flameChartData, traceParsedData, entryData} =
          await renderTrackAppender('slow-interaction-button-click.json.gz');
      const events = traceParsedData.UserInteractions.interactionEvents;
      for (const event of events) {
        const markerIndex = entryData.indexOf(event);
        assert.isDefined(markerIndex);
        assert.strictEqual(
            flameChartData.entryStartTimes[markerIndex],
            TraceModel.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', async () => {
      const {flameChartData, traceParsedData, entryData} =
          await renderTrackAppender('slow-interaction-button-click.json.gz');
      const events = traceParsedData.UserInteractions.interactionEvents;
      for (const event of events) {
        const markerIndex = entryData.indexOf(event);
        assert.isDefined(markerIndex);
        const expectedTotalTimeForEvent = TraceModel.Helpers.Timing.microSecondsToMilliseconds(
            (event.dur || 0) as TraceModel.Types.Timing.MicroSeconds);
        assert.strictEqual(flameChartData.entryTotalTimes[markerIndex], expectedTotalTimeForEvent);
      }
    });
  });

  it('returns the correct title for an interaction', async () => {
    const {interactionsTrackAppender, traceParsedData} =
        await renderTrackAppender('slow-interaction-button-click.json.gz');
    const firstInteraction = traceParsedData.UserInteractions.interactionEvents[0];
    const title = interactionsTrackAppender.titleForEvent(firstInteraction);
    assert.strictEqual(title, 'Interaction type:pointerdown id:1540');
  });

  it('highlightedEntryInfo returns the correct information', async () => {
    const {interactionsTrackAppender, traceParsedData} =
        await renderTrackAppender('slow-interaction-button-click.json.gz');
    const firstInteraction = traceParsedData.UserInteractions.interactionEvents[0];
    const highlightedEntryInfo = interactionsTrackAppender.highlightedEntryInfo(firstInteraction);
    // The i18n encondes spaces using the u00A0 unicode character.
    assert.strictEqual(highlightedEntryInfo.formattedTime, ('32.00\u00A0ms'));
  });
});
