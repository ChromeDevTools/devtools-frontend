// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import type * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

const {assert} = chai;

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, traceParsedData: TraceModel.Handlers.Types.TraceParseData,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl):
    Timeline.AnimationsTrackAppender.AnimationsTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
  return compatibilityTracksAppender.animationsTrackAppender();
}

describeWithEnvironment('AnimationsTrackAppender', function() {
  let traceParsedData: TraceModel.Handlers.Types.TraceParseData;
  let animationsTrackAppender: Timeline.AnimationsTrackAppender.AnimationsTrackAppender;
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  beforeEach(async function() {
    const data = await TraceLoader.allModels(this, 'animation.json.gz');
    traceParsedData = data.traceParsedData;
    animationsTrackAppender =
        initTrackAppender(flameChartData, traceParsedData, entryData, entryTypeByLevel, data.timelineModel);
    animationsTrackAppender.appendTrackAtLevel(0);
  });

  afterEach(() => {
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
  });

  describe('appendTrackAtLevel', function() {
    it('creates a flamechart group for the Animations track', function() {
      assert.strictEqual(flameChartData.groups.length, 1);
      assert.strictEqual(flameChartData.groups[0].name, 'Animations');
    });

    it('adds start times correctly', function() {
      const animationsRequests = traceParsedData.Animations.animations;
      for (let i = 0; i < animationsRequests.length; ++i) {
        const event = animationsRequests[i];
        assert.strictEqual(
            flameChartData.entryStartTimes[i], TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', function() {
      const animationsRequests = traceParsedData.Animations.animations;
      for (let i = 0; i < animationsRequests.length; i++) {
        const event = animationsRequests[i];
        if (TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.isTraceEventMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[i]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur as TraceEngine.Types.Timing.MicroSeconds) :
            Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        assert.strictEqual(flameChartData.entryTotalTimes[i], expectedTotalTimeForEvent);
      }
    });
  });

  describe('colorForEvent and titleForEvent', function() {
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
          --app-color-rendering: rgb(4 4 4);
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
    it('returns the correct color and title for GPU tasks', function() {
      const animationsRequests = traceParsedData.Animations.animations;
      for (const event of animationsRequests) {
        assert.strictEqual(animationsTrackAppender.titleForEvent(event), event.name);
        assert.strictEqual(animationsTrackAppender.colorForEvent(), 'rgb(4 4 4)');
      }
    });
  });

  describe('highlightedEntryInfo', function() {
    it('returns the info for an entry correctly', function() {
      const animationsRequests = traceParsedData.Animations.animations;
      const highlightedEntryInfo = animationsTrackAppender.highlightedEntryInfo(animationsRequests[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, '2.01\u00A0s');
    });
  });
});
