// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    traceData: TraceEngine.Handlers.Types.TraceParseData,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    ): Timeline.GPUTrackAppender.GPUTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceData, entryData, entryTypeByLevel);
  return compatibilityTracksAppender.gpuTrackAppender();
}

describeWithEnvironment('GPUTrackAppender', function() {
  let traceData: TraceEngine.Handlers.Types.TraceParseData;
  let gpuTrackAppender: Timeline.GPUTrackAppender.GPUTrackAppender;
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  beforeEach(async function() {
    ({traceData} = await TraceLoader.traceEngine(this, 'threejs-gpu.json.gz'));
    gpuTrackAppender = initTrackAppender(flameChartData, traceData, entryData, entryTypeByLevel);
    gpuTrackAppender.appendTrackAtLevel(0);
  });

  afterEach(() => {
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
  });

  describe('appendTrackAtLevel', () => {
    it('marks all levels used by the track with the `TrackAppender` type', () => {
      // One levels should be taken: 1 for the GPU tasks.
      const levelCount = 1;
      assert.strictEqual(entryTypeByLevel.length, levelCount);
      const allEntriesAreTrackAppender =
          entryTypeByLevel.every(type => type === Timeline.TimelineFlameChartDataProvider.EntryType.TrackAppender);
      assert.isTrue(allEntriesAreTrackAppender);
    });

    it('creates a flamechart group for the GPU track', () => {
      assert.strictEqual(flameChartData.groups.length, 1);
      assert.strictEqual(flameChartData.groups[0].name, 'GPU');
    });

    it('adds start times correctly', () => {
      const gpuEvents = traceData.GPU.mainGPUThreadTasks;
      for (const event of gpuEvents) {
        const index = entryData.indexOf(event);
        assert.exists(index);
        assert.strictEqual(
            flameChartData.entryStartTimes[index], TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', () => {
      const gpuEvents = traceData.GPU.mainGPUThreadTasks;
      for (const event of gpuEvents) {
        const index = entryData.indexOf(event);
        assert.exists(index);
        if (TraceEngine.Types.TraceEvents.isTraceEventMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[index]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur) :
            Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        assert.strictEqual(flameChartData.entryTotalTimes[index], expectedTotalTimeForEvent);
      }
    });
  });

  describe('colorForEvent and titleForEvent', () => {
    before(() => {
      // Rather than use the real colours here and burden the test with having to
      // inject loads of CSS, we fake out the colours. this is fine for our tests as
      // the exact value of the colours is not important; we just make sure that it
      // parses them out correctly. Each variable is given a different rgb() value to
      // ensure we know the code is working and using the right one.
      const styleElement = document.createElement('style');
      styleElement.id = 'fake-perf-panel-colors';
      styleElement.textContent = `
        :root {
          --app-color-painting: rgb(6 6 6);
        }
      `;
      document.documentElement.appendChild(styleElement);
      ThemeSupport.ThemeSupport.clearThemeCache();
    });

    after(() => {
      const styleElementToRemove = document.documentElement.querySelector('#fake-perf-panel-colors');
      if (styleElementToRemove) {
        document.documentElement.removeChild(styleElementToRemove);
      }
      ThemeSupport.ThemeSupport.clearThemeCache();
    });
    it('returns the correct color and title for GPU tasks', () => {
      const gpuEvents = traceData.GPU.mainGPUThreadTasks;
      for (const event of gpuEvents) {
        assert.strictEqual(gpuTrackAppender.titleForEvent(event), 'GPU');
        assert.strictEqual(gpuTrackAppender.colorForEvent(event), 'rgb(6 6 6)');
      }
    });
  });

  describe('highlightedEntryInfo', () => {
    it('returns the info for a entry correctly', () => {
      const gpuEvents = traceData.GPU.mainGPUThreadTasks;
      const highlightedEntryInfo = gpuTrackAppender.highlightedEntryInfo(gpuEvents[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, '52.37\u00A0ms');
    });
  });
});
