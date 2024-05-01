// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import type * as TraceModel from '../../../models/trace/trace.js';
import * as TraceEngine from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, traceParsedData: TraceModel.Handlers.Types.TraceParseData,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[]):
    Timeline.ExtensionTrackAppender.ExtensionTrackAppender[] {
  Timeline.ExtensionDataGatherer.ExtensionDataGatherer.instance().modelChanged(traceParsedData);
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceParsedData, entryData, entryTypeByLevel);

  return compatibilityTracksAppender.allVisibleTrackAppenders().filter(track => track.appenderName === 'Extension') as
      Timeline.ExtensionTrackAppender.ExtensionTrackAppender[];
}

describeWithEnvironment('ExtensionTrackAppender', function() {
  let traceParsedData: TraceModel.Handlers.Types.TraceParseData;
  let extensionTrackAppenders: Timeline.ExtensionTrackAppender.ExtensionTrackAppender[];
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  beforeEach(async function() {
    Root.Runtime.experiments.enableForTest('timeline-extensions');
    traceParsedData = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
    extensionTrackAppenders = initTrackAppender(flameChartData, traceParsedData, entryData, entryTypeByLevel);
    let level = 0;
    extensionTrackAppenders.forEach(appender => {
      level = appender.appendTrackAtLevel(level);
    });
  });

  afterEach(() => {
    Root.Runtime.experiments.disableForTest('timeline-extensions');
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
  });

  describe('appendTrackAtLevel', function() {
    it('creates a flamechart group for the Extension tracks', function() {
      assert.strictEqual(flameChartData.groups.length, 2);
      assert.strictEqual(flameChartData.groups[0].name, 'An Extension Track');
      assert.strictEqual(flameChartData.groups[1].name, 'Another Extension Track');
    });

    it('adds start times correctly', function() {
      const allExtensionTrackEntries =
          traceParsedData.ExtensionTraceData.extensionTrackData.flatMap(track => track.flameChartEntries);
      for (let i = 0; i < allExtensionTrackEntries.length; ++i) {
        const event = allExtensionTrackEntries[i];
        assert.strictEqual(
            flameChartData.entryStartTimes[i], TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', function() {
      const allExtensionTrackEntries =
          traceParsedData.ExtensionTraceData.extensionTrackData.flatMap(track => track.flameChartEntries);
      for (let i = 0; i < allExtensionTrackEntries.length; i++) {
        const event = allExtensionTrackEntries[i];
        if (TraceEngine.Types.TraceEvents.isTraceEventMarkerEvent(event)) {
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
          --ref-palette-primary60: rgb(4 4 4);
          --ref-palette-tertiary80: rgb(10 10 10);
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
    it('returns the correct color and title for extension entries', function() {
      const allExtensionTrackEntries =
          traceParsedData.ExtensionTraceData.extensionTrackData.flatMap(track => track.flameChartEntries);
      for (const event of allExtensionTrackEntries) {
        assert.strictEqual(extensionTrackAppenders[0].titleForEvent(event), event.name);
        if (event.args.color === 'primary') {
          // "primary" color category is mapped to --ref-palette-primary60
          // which is faked out to 4, 4, 4
          assert.strictEqual(extensionTrackAppenders[0].colorForEvent(event), 'rgb(4 4 4)');
        } else {
          // "tertiary-light" color category is mapped to --ref-palette-tertiary80
          // which is faked out to 10, 10, 10
          assert.strictEqual(extensionTrackAppenders[0].colorForEvent(event), 'rgb(10 10 10)');
        }
      }
    });
  });

  describe('highlightedEntryInfo', function() {
    it('returns the info for an entry correctly', function() {
      const allExtensionTrackEntries =
          traceParsedData.ExtensionTraceData.extensionTrackData.flatMap(track => track.flameChartEntries);
      const highlightedEntryInfo = extensionTrackAppenders[0].highlightedEntryInfo(allExtensionTrackEntries[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, '3.00\u00A0s');
      assert.strictEqual(highlightedEntryInfo.title, 'A hint if needed');
    });
  });
});
