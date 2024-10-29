// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, parsedTrace: Trace.Handlers.Types.ParsedTrace,
    entryData: Trace.Types.Events.Event[], entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[]):
    Timeline.ServerTimingsTrackAppender.ServerTimingsTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, parsedTrace, entryData, entryTypeByLevel);
  return compatibilityTracksAppender.serverTimingsTrackAppender();
}

describeWithEnvironment('ServerTimingsTrackAppender', function() {
  let parsedTrace: Trace.Handlers.Types.ParsedTrace;
  let serverTimingsTrackAppender: Timeline.ServerTimingsTrackAppender.ServerTimingsTrackAppender;
  let entryData: Trace.Types.Events.Event[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  beforeEach(async function() {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.TIMELINE_SERVER_TIMINGS);

    ({parsedTrace} = await TraceLoader.traceEngine(this, 'server-timings.json.gz'));
    serverTimingsTrackAppender = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
    serverTimingsTrackAppender.appendTrackAtLevel(0);
  });

  afterEach(() => {
    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.TIMELINE_SERVER_TIMINGS);

    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
  });

  describe('appendTrackAtLevel', function() {
    it('creates a flamechart group for the Server timings track', function() {
      assert.strictEqual(flameChartData.groups.length, 1);
      assert.strictEqual(flameChartData.groups[0].name, 'Server Timings — https://node-server-tan.vercel.app');
    });

    it('Adds a description to server timings tracks', function() {
      assert.strictEqual(flameChartData.groups.length, 1);
      assert.strictEqual(
          flameChartData.groups[0].description,
          'This track contains timings taken from Server-Timing network response headers. Their respective start times are only estimated and may not be accurate.');
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
          --ref-palette-primary70: rgb(4 4 4);
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
    it('returns the correct color and title for server timing events', function() {
      const serverTimings = parsedTrace.ServerTimings.serverTimings;
      for (const event of serverTimings) {
        assert.strictEqual(serverTimingsTrackAppender.titleForEvent(event), event.name);
        assert.strictEqual(serverTimingsTrackAppender.colorForEvent(), 'rgb(4 4 4)');
      }
    });
  });

  describe('highlightedEntryInfo', function() {
    it('returns the info for an entry correctly', function() {
      const serverTimings = parsedTrace.ServerTimings.serverTimings;
      const highlightedEntryInfo = serverTimingsTrackAppender.highlightedEntryInfo(serverTimings[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, '1.00\u00A0s');
    });
  });
});
