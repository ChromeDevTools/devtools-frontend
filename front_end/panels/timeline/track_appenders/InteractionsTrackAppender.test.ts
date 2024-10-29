// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    parsedTrace: Trace.Handlers.Types.ParsedTrace,
    entryData: Trace.Types.Events.Event[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    ): Timeline.InteractionsTrackAppender.InteractionsTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, parsedTrace, entryData, entryTypeByLevel);
  return compatibilityTracksAppender.interactionsTrackAppender();
}

describeWithEnvironment('InteractionsTrackAppender', function() {
  async function renderTrackAppender(context: Mocha.Suite|Mocha.Context, trace: string): Promise<{
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    interactionsTrackAppender: Timeline.InteractionsTrackAppender.InteractionsTrackAppender,
    entryData: Trace.Types.Events.Event[],
    parsedTrace: Readonly<Trace.Handlers.Types.ParsedTrace>,
  }> {
    const entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
    const entryData: Trace.Types.Events.Event[] = [];
    const flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    const {parsedTrace} = await TraceLoader.traceEngine(context, trace);
    const interactionsTrackAppender = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
    interactionsTrackAppender.appendTrackAtLevel(0);

    return {
      entryTypeByLevel,
      parsedTrace,
      flameChartData,
      interactionsTrackAppender,
      entryData,
    };
  }

  describe('appendTrackAtLevel', function() {
    it('marks all levels used by the track with the `TrackAppender` type', async function() {
      const {entryTypeByLevel} = await renderTrackAppender(this, 'slow-interaction-button-click.json.gz');
      // All events fit on the top level
      assert.strictEqual(entryTypeByLevel.length, 1);
      assert.deepEqual(entryTypeByLevel, [
        Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      ]);
    });

    it('takes over no levels if there are no interactions', async function() {
      // animation trace has no interactions in it.
      const {entryTypeByLevel} = await renderTrackAppender(this, 'animation.json.gz');
      assert.strictEqual(entryTypeByLevel.length, 0);
    });

    it('only shows the top level interactions', async function() {
      const {entryData, parsedTrace} = await renderTrackAppender(this, 'nested-interactions.json.gz');
      assert.strictEqual(entryData.length, parsedTrace.UserInteractions.interactionEventsWithNoNesting.length);
    });

    it('creates a flamechart group', async function() {
      const {flameChartData} = await renderTrackAppender(this, 'slow-interaction-button-click.json.gz');
      assert.strictEqual(flameChartData.groups.length, 1);
      assert.strictEqual(flameChartData.groups[0].name, 'Interactions');
    });

    it('adds all interactions with the correct start times', async function() {
      const {flameChartData, parsedTrace, entryData} =
          await renderTrackAppender(this, 'slow-interaction-button-click.json.gz');
      const events = parsedTrace.UserInteractions.interactionEventsWithNoNesting;
      for (const event of events) {
        const markerIndex = entryData.indexOf(event);
        assert.exists(markerIndex);
        assert.strictEqual(
            flameChartData.entryStartTimes[markerIndex], Trace.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', async function() {
      const {flameChartData, parsedTrace, entryData} =
          await renderTrackAppender(this, 'slow-interaction-button-click.json.gz');
      const events = parsedTrace.UserInteractions.interactionEventsWithNoNesting;
      for (const event of events) {
        const markerIndex = entryData.indexOf(event);
        assert.exists(markerIndex);
        const expectedTotalTimeForEvent =
            Trace.Helpers.Timing.microSecondsToMilliseconds((event.dur || 0) as Trace.Types.Timing.MicroSeconds);
        assert.strictEqual(flameChartData.entryTotalTimes[markerIndex], expectedTotalTimeForEvent);
      }
    });
  });

  it('candy-stripes and adds warning triangles to long interactions', async function() {
    const {parsedTrace, flameChartData, entryData} = await renderTrackAppender(this, 'one-second-interaction.json.gz');
    const longInteraction = parsedTrace.UserInteractions.longestInteractionEvent;
    if (!longInteraction) {
      throw new Error('Could not find longest interaction');
    }
    const entryIndex = entryData.indexOf(longInteraction);
    const decorationsForEntry = flameChartData.entryDecorations[entryIndex];
    assert.deepEqual(decorationsForEntry, [
      {
        type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
        startAtTime: Trace.Types.Timing.MicroSeconds(200_000),
        endAtTime: longInteraction.processingEnd,
      },
      {
        type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE,
        customEndTime: longInteraction.processingEnd,
      },
    ]);
  });

  it('does not candy-stripe interactions less than 200ms', async function() {
    const {flameChartData} = await renderTrackAppender(this, 'slow-interaction-button-click.json.gz');
    // None of the interactions are over 200ms, so we do not expect to see any decorations
    assert.lengthOf(flameChartData.entryDecorations, 0);
  });
});
