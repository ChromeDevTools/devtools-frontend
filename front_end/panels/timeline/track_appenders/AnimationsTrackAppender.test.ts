// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, parsedTrace: Trace.Handlers.Types.ParsedTrace,
    entryData: Trace.Types.Events.Event[], entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[]):
    Timeline.AnimationsTrackAppender.AnimationsTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, parsedTrace, entryData, entryTypeByLevel);
  return compatibilityTracksAppender.animationsTrackAppender();
}

describeWithEnvironment('AnimationsTrackAppender', function() {
  let parsedTrace: Trace.Handlers.Types.ParsedTrace;
  let animationsTrackAppender: Timeline.AnimationsTrackAppender.AnimationsTrackAppender;
  let entryData: Trace.Types.Events.Event[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  beforeEach(async function() {
    ({parsedTrace} = await TraceLoader.traceEngine(this, 'animation.json.gz'));
    animationsTrackAppender = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
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
      const animationsRequests = parsedTrace.Animations.animations;
      for (let i = 0; i < animationsRequests.length; ++i) {
        const event = animationsRequests[i];
        assert.strictEqual(
            flameChartData.entryStartTimes[i], Trace.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', function() {
      const animationsRequests = parsedTrace.Animations.animations;
      for (let i = 0; i < animationsRequests.length; i++) {
        const event = animationsRequests[i];
        if (Trace.Types.Events.isMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[i]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            Trace.Helpers.Timing.microSecondsToMilliseconds(event.dur) :
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
      ThemeSupport.ThemeSupport.clearThemeCache();
    });

    after(() => {
      const styleElementToRemove = document.documentElement.querySelector('#fake-perf-panel-colors');
      if (styleElementToRemove) {
        document.documentElement.removeChild(styleElementToRemove);
      }
      ThemeSupport.ThemeSupport.clearThemeCache();
    });

    it('returns the correct color GPU tasks', function() {
      assert.strictEqual(animationsTrackAppender.colorForEvent(), 'rgb(4 4 4)');
    });
  });
});
