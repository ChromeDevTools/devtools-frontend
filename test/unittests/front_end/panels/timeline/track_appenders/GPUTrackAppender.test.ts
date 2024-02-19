// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import type * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

const {assert} = chai;

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    traceParsedData: TraceEngine.Handlers.Types.TraceParseData,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl): Timeline.GPUTrackAppender.GPUTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
  return compatibilityTracksAppender.gpuTrackAppender();
}

describeWithEnvironment('GPUTrackAppender', function() {
  let traceParsedData: TraceEngine.Handlers.Types.TraceParseData;
  let timelineModel: TimelineModel.TimelineModel.TimelineModelImpl;
  let gpuTrackAppender: Timeline.GPUTrackAppender.GPUTrackAppender;
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  beforeEach(async function() {
    const data = await TraceLoader.allModels(this, 'threejs-gpu.json.gz');
    traceParsedData = data.traceParsedData;
    timelineModel = data.timelineModel;
    gpuTrackAppender = initTrackAppender(flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
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
      const gpuEvents = traceParsedData.GPU.mainGPUThreadTasks;
      for (const event of gpuEvents) {
        const index = entryData.indexOf(event);
        assert.isDefined(index);
        assert.strictEqual(
            flameChartData.entryStartTimes[index], TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', () => {
      const gpuEvents = traceParsedData.GPU.mainGPUThreadTasks;
      for (const event of gpuEvents) {
        const index = entryData.indexOf(event);
        assert.isDefined(index);
        if (TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.isTraceEventMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[index]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur as TraceEngine.Types.Timing.MicroSeconds) :
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
    });

    after(() => {
      const styleElementToRemove = document.documentElement.querySelector('#fake-perf-panel-colors');
      if (styleElementToRemove) {
        document.documentElement.removeChild(styleElementToRemove);
      }
    });
    it('returns the correct color and title for GPU tasks', () => {
      const gpuEvents = traceParsedData.GPU.mainGPUThreadTasks;
      for (const event of gpuEvents) {
        assert.strictEqual(gpuTrackAppender.titleForEvent(event), 'GPU');
        assert.strictEqual(gpuTrackAppender.colorForEvent(event), 'rgb(6 6 6)');
      }
    });
  });

  describe('highlightedEntryInfo', () => {
    it('returns the info for a entry correctly', () => {
      const gpuEvents = traceParsedData.GPU.mainGPUThreadTasks;
      const highlightedEntryInfo = gpuTrackAppender.highlightedEntryInfo(gpuEvents[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, '52.37\u00A0ms');
    });
  });
});
