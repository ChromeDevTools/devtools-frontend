// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    parsedTrace: Trace.TraceModel.ParsedTrace,
    entryData: Trace.Types.Events.Event[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    ): Timeline.TimingsTrackAppender.TimingsTrackAppender {
  const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, parsedTrace, entryData, entryTypeByLevel, entityMapper);
  return compatibilityTracksAppender.timingsTrackAppender();
}

describeWithEnvironment('TimingTrackAppender', function() {
  let parsedTrace: Trace.TraceModel.ParsedTrace;
  let timingsTrackAppender: Timeline.TimingsTrackAppender.TimingsTrackAppender;
  let entryData: Trace.Types.Events.Event[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
  beforeEach(async function() {
    parsedTrace = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
    timingsTrackAppender = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
    timingsTrackAppender.appendTrackAtLevel(0);
  });
  afterEach(() => {
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
  });

  function getMockInfo(event?: Trace.Types.Events.Event) {
    const defaultInfo: Timeline.CompatibilityTracksAppender.PopoverInfo = {
      title: event ? timingsTrackAppender.titleForEvent(event) : 'title',
      formattedTime: event ? Timeline.AppenderUtils.getDurationString(event.dur) : 'time',
      warningElements: [],
      additionalElements: [],
      url: null,
    };
    return defaultInfo;
  }

  describe('appendTrackAtLevel', () => {
    it('marks all levels used by the track with the `TrackAppender` type', () => {
      // 7 levels should be taken:
      //   * 1 performance.marks.
      //   * 3 used by performance.measures.
      //   * 1 used by console timestamps.
      //   * 1 used by console.time calls.
      const levelCount = 6;
      assert.strictEqual(entryTypeByLevel.length, levelCount);
      const allEntriesAreTrackAppender =
          entryTypeByLevel.every(type => type === Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER);
      assert.isTrue(allEntriesAreTrackAppender);
    });
    it('adds start times correctly', () => {
      const performanceMarks = parsedTrace.data.UserTimings.performanceMarks;
      const performanceMeasures = parsedTrace.data.UserTimings.performanceMeasures;
      const consoleTimings = parsedTrace.data.UserTimings.consoleTimings;
      const consoleTimestamps = parsedTrace.data.UserTimings.timestampEvents;
      const events = [...performanceMarks, ...performanceMeasures, ...consoleTimings, ...consoleTimestamps];
      const expectedStartTimes = events.map(event => Trace.Helpers.Timing.microToMilli(event.ts));
      const actualStartTimes = events.map(event => {
        const markerIndex = entryData.indexOf(event);
        assert.exists(markerIndex);
        return flameChartData.entryStartTimes[markerIndex];
      });
      assert.deepEqual(actualStartTimes, expectedStartTimes);
    });
    it('adds total times correctly', () => {
      const performanceMarks = parsedTrace.data.UserTimings.performanceMarks;
      const performanceMeasures = parsedTrace.data.UserTimings.performanceMeasures;
      const consoleTimings = parsedTrace.data.UserTimings.consoleTimings;
      const consoleTimestamps = parsedTrace.data.UserTimings.timestampEvents;
      for (const event of [...performanceMarks, ...performanceMeasures, ...consoleTimings, ...consoleTimestamps]) {
        const markerIndex = entryData.indexOf(event);
        assert.exists(markerIndex);
        if (Trace.Types.Events.isMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[markerIndex]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            Trace.Helpers.Timing.microToMilli(event.dur) :
            Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        assert.strictEqual(flameChartData.entryTotalTimes[markerIndex], expectedTotalTimeForEvent);
      }
    });
  });

  describe('colorForEvent and titleForEvent', () => {
    it('returns the correct color and title for page load markers', () => {
      const traceMarkers = parsedTrace.data.PageLoadMetrics.allMarkerEvents;
      const firstContentfulPaint = traceMarkers.find(marker => marker.name === 'firstContentfulPaint');
      const markLoad = traceMarkers.find(marker => marker.name === 'MarkLoad');
      const markDOMContent = traceMarkers.find(marker => marker.name === 'MarkDOMContent');
      const firstPaint = traceMarkers.find(marker => marker.name === 'firstPaint');
      const largestContentfulPaint = traceMarkers.find(marker => marker.name === 'largestContentfulPaint::Candidate');

      if (firstContentfulPaint === undefined || markLoad === undefined || markDOMContent === undefined ||
          firstPaint === undefined || largestContentfulPaint === undefined) {
        throw new Error('A metric was not found');
      }

      assert.strictEqual(timingsTrackAppender.colorForEvent(firstContentfulPaint), '#1A6937');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(firstContentfulPaint),
          Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP);

      assert.strictEqual(timingsTrackAppender.colorForEvent(markLoad), '#B31412');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(markLoad), Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.L);

      assert.strictEqual(timingsTrackAppender.colorForEvent(markDOMContent), '#0867CB');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(markDOMContent),
          Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL);

      assert.strictEqual(timingsTrackAppender.colorForEvent(firstPaint), '#228847');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(firstPaint), Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP);

      assert.strictEqual(timingsTrackAppender.colorForEvent(largestContentfulPaint), '#1A3422');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(largestContentfulPaint),
          Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
    });

    it('returns the correct title for performance measures', () => {
      const performanceMeasures = parsedTrace.data.UserTimings.performanceMeasures;
      for (const measure of performanceMeasures) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(measure), measure.name);
      }
    });

    it('returns the correct title for console timings', () => {
      const traceMarkers = parsedTrace.data.UserTimings.consoleTimings;
      for (const mark of traceMarkers) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(mark), mark.name);
      }
    });

    it('returns the correct title for performance marks', () => {
      const traceMarkers = parsedTrace.data.UserTimings.performanceMarks;
      for (const mark of traceMarkers) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(mark), `[mark]: ${mark.name}`);
      }
    });

    it('returns the correct title for console timestamps', () => {
      const traceMarkers = parsedTrace.data.UserTimings.timestampEvents;
      for (const mark of traceMarkers) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(mark), `TimeStamp: ${mark.args.data?.message}`);
      }
    });
  });

  describe('popoverInfo', () => {
    it('shows the time of the mark, not the duration, if the event is a performance mark', () => {
      const firstMark = parsedTrace.data.UserTimings.performanceMarks[0];
      const popoverInfo = getMockInfo(firstMark);
      timingsTrackAppender.setPopoverInfo(firstMark, popoverInfo);
      assert.deepInclude(popoverInfo, {
        formattedTime: '1.12\u00A0s',
      });
    });

    it('shows the time of the mark for an LCP event', () => {
      const largestContentfulPaint = parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(
          marker => marker.name === 'largestContentfulPaint::Candidate');
      assert.exists(largestContentfulPaint);
      const popoverInfo = getMockInfo(largestContentfulPaint);
      timingsTrackAppender.setPopoverInfo(largestContentfulPaint, popoverInfo);
      assert.deepInclude(popoverInfo, {
        title: 'LCP',
        formattedTime: '2.42\u00A0s',
      });
    });

    it('shows the time of the mark for an FCP event', () => {
      const firstContentfulPaint =
          parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(marker => marker.name === 'firstContentfulPaint');
      assert.exists(firstContentfulPaint);
      const popoverInfo = getMockInfo(firstContentfulPaint);
      timingsTrackAppender.setPopoverInfo(firstContentfulPaint, popoverInfo);
      assert.deepInclude(popoverInfo, {
        title: 'FCP',
        formattedTime: '2.42\u00A0s',
      });
    });

    it('shows the time of the mark for a DCL event', () => {
      const dclEvent =
          parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(marker => marker.name === 'MarkDOMContent');
      assert.exists(dclEvent);
      const popoverInfo = getMockInfo(dclEvent);
      timingsTrackAppender.setPopoverInfo(dclEvent, popoverInfo);
      assert.deepInclude(popoverInfo, {
        title: 'DCL',
        formattedTime: '2.42\u00A0s',
      });
    });

    it('shows the time of a console.timestamp event in the hover info', () => {
      const timestampEvent = parsedTrace.data.UserTimings.timestampEvents[0];
      const popoverInfo = getMockInfo(timestampEvent);
      timingsTrackAppender.setPopoverInfo(timestampEvent, popoverInfo);

      assert.deepInclude(popoverInfo, {
        title: 'TimeStamp: a timestamp',
        formattedTime: '615.25\u00A0ms',
      });
    });

    it('returns the info for a performance.measure calls correctly', () => {
      const performanceMeasure = parsedTrace.data.UserTimings.performanceMeasures[0];
      const popoverInfo = getMockInfo(performanceMeasure);
      timingsTrackAppender.setPopoverInfo(performanceMeasure, popoverInfo);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(popoverInfo.formattedTime, ('500.07\u00A0ms'));
    });

    it('returns the info for a console.time calls correctly', () => {
      const consoleTiming = parsedTrace.data.UserTimings.consoleTimings[0];
      const popoverInfo = getMockInfo(consoleTiming);
      timingsTrackAppender.setPopoverInfo(consoleTiming, popoverInfo);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(popoverInfo.formattedTime, ('1.60\u00A0s'));
    });
  });

  describe('extension markers', () => {
    beforeEach(async function() {
      entryData = [];
      flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
      entryTypeByLevel = [];
      parsedTrace = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
      timingsTrackAppender = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
      timingsTrackAppender.appendTrackAtLevel(0);
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
          --ref-palette-error60: rgb(10 10 10);
        }
      `;
      document.documentElement.appendChild(styleElement);
      ThemeSupport.ThemeSupport.clearThemeCache();
    });
    afterEach(() => {
      entryData = [];
      flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
      entryTypeByLevel = [];
      const styleElementToRemove = document.documentElement.querySelector('#fake-perf-panel-colors');
      if (styleElementToRemove) {
        document.documentElement.removeChild(styleElementToRemove);
      }
      ThemeSupport.ThemeSupport.clearThemeCache();
    });

    it('creates a TimelineFlameChartMarker for each extension marker event in a trace', () => {
      const extensionMarkers = parsedTrace.data.ExtensionTraceData.extensionMarkers;
      for (const traceMarker of extensionMarkers) {
        const markerTimeMs = Trace.Helpers.Timing.microToMilli(traceMarker.ts);
        const flameChartMarker =
            flameChartData.markers.find(flameChartMarker => flameChartMarker.startTime() === markerTimeMs);
        assert.exists(flameChartMarker);
      }
    });

    it('returns the correct color and title for extension markers', function() {
      const extensionMarkers = parsedTrace.data.ExtensionTraceData.extensionMarkers;
      assert.lengthOf(extensionMarkers, 1);
      for (const event of extensionMarkers) {
        const popoverInfo: Timeline.CompatibilityTracksAppender.PopoverInfo = {
          title: 'title',
          formattedTime: 'time',
          warningElements: [],
          additionalElements: [],
          url: null,
        };
        timingsTrackAppender.setPopoverInfo(event, popoverInfo);

        // Both tooltipText and name are supplied, but we use name for the event's flamechart title.
        assert.strictEqual(timingsTrackAppender.titleForEvent(event), event.name);
        assert.notStrictEqual(timingsTrackAppender.titleForEvent(event), popoverInfo.title);

        if (event.devtoolsObj.color === 'error') {
          // "error" color category is mapped to --ref-palette-error50
          // which is faked out to 10, 10, 10
          assert.strictEqual(timingsTrackAppender.colorForEvent(event), 'rgb(10 10 10)');
        } else {
          // Unknown colors are mapped to "primary" by default, and
          // "primary" color category is mapped to --ref-palette-blue70
          // which is faked out to 4, 4, 4
          assert.strictEqual(timingsTrackAppender.colorForEvent(event), 'rgb(4 4 4)');
        }
      }
    });
    it('sets a default value when a color is not set or is set an unknown value', function() {
      const mockExtensionEntryNoColor = {
        devtoolsObj: {
          dataType: 'marker',
        },
        cat: 'devtools.extension',
      } as unknown as Trace.Types.Events.Event;

      const mockExtensionEntryUnknownColor = {
        devtoolsObj: {
          color: 'anUnknownColor',
          dataType: 'marker',
        },
        cat: 'devtools.extension',
      } as unknown as Trace.Types.Events.Event;
      // "primary" color category is mapped to --ref-palette-blue70
      // which is faked out to 4, 4, 4
      assert.strictEqual(timingsTrackAppender.colorForEvent(mockExtensionEntryNoColor), 'rgb(4 4 4)');
      assert.strictEqual(timingsTrackAppender.colorForEvent(mockExtensionEntryUnknownColor), 'rgb(4 4 4)');
    });
    it('returns the tool tip info for an entry correctly', function() {
      const extensionMarker = parsedTrace.data.ExtensionTraceData.extensionMarkers.at(0);
      assert.isOk(extensionMarker, 'did not find any extension markers');

      const popoverInfo = getMockInfo(extensionMarker);
      timingsTrackAppender.setPopoverInfo(extensionMarker, popoverInfo);
      assert.strictEqual(popoverInfo.title, 'A mark');
    });
    describe('toggling', function() {
      it('Does not append extension data when the configuration is set to disabled', async function() {
        entryData = [];
        flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
        entryTypeByLevel = [];
        Timeline.TimelinePanel.TimelinePanel.extensionDataVisibilitySetting().set(false);
        parsedTrace = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
        timingsTrackAppender = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
        timingsTrackAppender.appendTrackAtLevel(0);

        const extensionMarkers = parsedTrace.data.ExtensionTraceData.extensionMarkers;
        for (const traceMarker of extensionMarkers) {
          const markerTimeMs = Trace.Helpers.Timing.microToMilli(traceMarker.ts);
          const flameChartMarker =
              flameChartData.markers.find(flameChartMarker => flameChartMarker.startTime() === markerTimeMs);
          assert.isUndefined(flameChartMarker);
        }
      });
    });
  });
});
