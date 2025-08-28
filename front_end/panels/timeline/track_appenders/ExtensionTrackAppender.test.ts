// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { // eslint-disable-line rulesdir/es-modules-import
  createTraceExtensionDataFromPerformanceAPITestInput,
} from '../../../models/trace/handlers/ExtensionTraceDataHandler.test.js';
import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getBaseTraceParseModelData, type PerformanceAPIExtensionTestData} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, parsedTrace: Trace.Handlers.Types.ParsedTrace,
    entryData: Trace.Types.Events.Event[], entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[]):
    Timeline.ExtensionTrackAppender.ExtensionTrackAppender[] {
  const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, parsedTrace, entryData, entryTypeByLevel, entityMapper);

  return compatibilityTracksAppender.allVisibleTrackAppenders().filter(track => track.appenderName === 'Extension') as
      Timeline.ExtensionTrackAppender.ExtensionTrackAppender[];
}

describeWithEnvironment('ExtensionTrackAppender', function() {
  let parsedTrace: Trace.Handlers.Types.ParsedTrace;
  let extensionTrackAppenders: Timeline.ExtensionTrackAppender.ExtensionTrackAppender[];
  let entryData: Trace.Types.Events.Event[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];

  beforeEach(async function() {
    ({parsedTrace} = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz'));
    extensionTrackAppenders = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
    let level = 0;
    extensionTrackAppenders.forEach(appender => {
      level = appender.appendTrackAtLevel(level);
    });
  });

  afterEach(() => {
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
  });

  describe('appendTrackAtLevel', function() {
    it('creates flamechart groups for the Extension tracks properly', function() {
      assert.lengthOf(flameChartData.groups, 4);
      assert.strictEqual(flameChartData.groups[0].name, 'A track group');
      assert.strictEqual(flameChartData.groups[0].subtitle, '— Custom');
      assert.strictEqual(flameChartData.groups[0].startLevel, 0);
      assert.strictEqual(flameChartData.groups[0].style.nestingLevel, 0);
      assert.strictEqual(flameChartData.groups[1].name, 'Another Extension Track');
      assert.isUndefined(flameChartData.groups[1].subtitle);
      assert.strictEqual(flameChartData.groups[1].startLevel, 0);
      assert.strictEqual(flameChartData.groups[1].style.nestingLevel, 1);
      assert.strictEqual(flameChartData.groups[2].name, 'An Extension Track');
      assert.strictEqual(flameChartData.groups[2].subtitle, '— Custom');
      assert.strictEqual(flameChartData.groups[2].startLevel, 1);
      assert.strictEqual(flameChartData.groups[2].style.nestingLevel, 0);
    });

    it('adds start times correctly', function() {
      const allExtensionTrackEntries =
          parsedTrace.ExtensionTraceData.extensionTrackData.map(track => Object.values(track.entriesByTrack)).flat(2);
      for (let i = 0; i < allExtensionTrackEntries.length; ++i) {
        const event = allExtensionTrackEntries[i];
        assert.strictEqual(flameChartData.entryStartTimes[i], Trace.Helpers.Timing.microToMilli(event.ts));
      }
    });

    it('adds total times correctly', function() {
      const allExtensionTrackEntries =
          parsedTrace.ExtensionTraceData.extensionTrackData.map(track => Object.values(track.entriesByTrack)).flat(2);
      for (let i = 0; i < allExtensionTrackEntries.length; i++) {
        const event = allExtensionTrackEntries[i];
        if (Trace.Types.Events.isMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[i]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            Trace.Helpers.Timing.microToMilli(event.dur) :
            Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        assert.strictEqual(flameChartData.entryTotalTimes[i], expectedTotalTimeForEvent);
      }
    });

    it('Assigns a lower level (closer to the top) to an event buffered later when start and end times are equal',
       async function() {
         // Three extension entries with same start and end time.
         // Test they are appended in inverse order.
         const extensionData = [
           {
             detail: {
               devtools: {dataType: 'track-entry', track: 'track'},
             },
             name: 'First measurement',
             ts: 100,
             dur: 100,
           },
           {
             detail: {devtools: {track: 'track'}},
             name: 'Second measurement',
             ts: 100,
             dur: 100,
           },
           {
             detail: {devtools: {track: 'track'}},
             name: 'Third measurement',
             ts: 100,
             dur: 100,
           },
         ] as PerformanceAPIExtensionTestData[];
         const traceExtensionData = await createTraceExtensionDataFromPerformanceAPITestInput(extensionData);
         const testParsedTrace = getBaseTraceParseModelData({ExtensionTraceData: traceExtensionData});
         entryData = [];
         flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
         entryTypeByLevel = [];
         extensionTrackAppenders = initTrackAppender(flameChartData, testParsedTrace, entryData, entryTypeByLevel);
         let level = 0;
         extensionTrackAppenders.forEach(appender => {
           level = appender.appendTrackAtLevel(level);
         });
         const indexForFirst = entryData.findIndex(e => e.name === 'First measurement');
         const indexForSecond = entryData.findIndex(e => e.name === 'Second measurement');
         const indexForThird = entryData.findIndex(e => e.name === 'Third measurement');
         assert.strictEqual(flameChartData.entryLevels[indexForThird], 0);
         assert.strictEqual(flameChartData.entryLevels[indexForSecond], 1);
         assert.strictEqual(flameChartData.entryLevels[indexForFirst], 2);
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
          --ref-palette-blue70: rgb(4 4 4);
          --ref-palette-green70: rgb(10 10 10);
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
          parsedTrace.ExtensionTraceData.extensionTrackData.map(track => Object.values(track.entriesByTrack)).flat(2);
      for (const event of allExtensionTrackEntries) {
        assert.strictEqual(extensionTrackAppenders[0].titleForEvent(event), event.name);
        if (event.args.color === 'tertiary') {
          // "tertiary" color category is mapped to --ref-palette-green70
          // which is faked out to 10, 10, 10
          assert.strictEqual(extensionTrackAppenders[0].colorForEvent(event), 'rgb(10 10 10)');
        } else {
          // Unknown colors are mapped to "primary" by default, and
          // "primary" color category is mapped to --ref-palette-blue70
          // which is faked out to 4, 4, 4
          assert.strictEqual(extensionTrackAppenders[0].colorForEvent(event), 'rgb(4 4 4)');
        }
      }
    });

    it('sets a default value when a color is not set or is set an unknown value', function() {
      const mockExtensionEntryNoColor = {
        args: {
          metadata: {dataType: 'track-entry', extensionName: 'Extension'},
          track: 'A track',
        },
        cat: 'devtools.extension',
      } as unknown as Trace.Types.Events.Event;

      const mockExtensionEntryUnknownColor = {
        args: {
          metadata: {dataType: 'track-entry', extensionName: 'Extension'},
          track: 'A track',
          color: 'anUnknownColor',
        },
        cat: 'devtools.extension',
      } as unknown as Trace.Types.Events.Event;
      // "primary" color category is mapped to --ref-palette-blue70
      // which is faked out to 4, 4, 4
      assert.strictEqual(extensionTrackAppenders[0].colorForEvent(mockExtensionEntryNoColor), 'rgb(4 4 4)');
      assert.strictEqual(extensionTrackAppenders[0].colorForEvent(mockExtensionEntryUnknownColor), 'rgb(4 4 4)');
    });
  });

  describe('toggling', function() {
    it('Does not append extension data when the configuration is set to disabled', async function() {
      entryData = [];
      flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
      entryTypeByLevel = [];
      Timeline.TimelinePanel.TimelinePanel.extensionDataVisibilitySetting().set(false);
      parsedTrace = (await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz')).parsedTrace;
      extensionTrackAppenders = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
      let level = 0;
      extensionTrackAppenders.forEach(appender => {
        level = appender.appendTrackAtLevel(level);
      });
      assert.lengthOf(flameChartData.groups, 0);
      Timeline.TimelinePanel.TimelinePanel.extensionDataVisibilitySetting().set(true);
    });
  });

  describe('titleForEvent', function() {
    it('returns the title for an entry correctly', function() {
      const allExtensionTrackEntries =
          parsedTrace.ExtensionTraceData.extensionTrackData.map(track => Object.values(track.entriesByTrack)).flat(2);
      const title = extensionTrackAppenders[0].titleForEvent(allExtensionTrackEntries[0]);
      assert.strictEqual(title, 'An extension measurement');
    });
  });

  describe('setPopoverInfo', function() {
    it('build the tooltip content for an entry correctly', function() {
      const info: Timeline.CompatibilityTracksAppender.PopoverInfo = {
        title: 'title',
        formattedTime: 'time',
        warningElements: [],
        additionalElements: [],
        url: null,
      };
      const allExtensionTrackEntries =
          parsedTrace.ExtensionTraceData.extensionTrackData.map(track => Object.values(track.entriesByTrack)).flat(2);
      extensionTrackAppenders[0].setPopoverInfo(allExtensionTrackEntries[0], info);
      assert.strictEqual(info.title, 'A hint if needed');
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(info.formattedTime, '1.00\u00A0s');
      assert.isUndefined(info.additionalElements?.at(0)?.nodeName);
    });
  });
});
