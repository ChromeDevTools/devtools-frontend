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
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl): Timeline.TimingsTrackAppender.TimingsTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
  return compatibilityTracksAppender.timingsTrackAppender();
}

describeWithEnvironment('TimingTrackAppender', () => {
  let traceParsedData: TraceModel.Handlers.Types.TraceParseData;
  let timelineModel: TimelineModel.TimelineModel.TimelineModelImpl;
  let timingsTrackAppender: Timeline.TimingsTrackAppender.TimingsTrackAppender;
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = new PerfUI.FlameChart.TimelineData([], [], [], []);
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
  beforeEach(async () => {
    traceParsedData = await loadModelDataFromTraceFile('timings-track.json.gz');
    timelineModel = (await traceModelFromTraceFile('timings-track.json.gz')).timelineModel;
    timingsTrackAppender =
        initTrackAppender(flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
    timingsTrackAppender.appendTrackAtLevel(0);
  });
  afterEach(() => {
    entryData = [];
    flameChartData = new PerfUI.FlameChart.TimelineData([], [], [], []);
    entryTypeByLevel = [];
  });

  describe('appendTrackAtLevel', () => {
    it('marks all levels used by the track with the `TrackAppender` type', () => {
      // 8 levels should be taken:
      //   * 1 for page load marks.
      //   * 1 added for spacing between page load marks and user timings.
      //   * 1 performance.marks.
      //   * 3 used by performance.measures.
      //   * 1 used by console timestamps.
      //   * 1 used by console.time calls.
      const levelCount = 8;
      assert.strictEqual(entryTypeByLevel.length, levelCount);
      const allEntriesAreTrackAppender =
          entryTypeByLevel.every(type => type === Timeline.TimelineFlameChartDataProvider.EntryType.TrackAppender);
      assert.isTrue(allEntriesAreTrackAppender);
    });
    it('creates a flamechart group for the timings track', () => {
      assert.strictEqual(flameChartData.groups.length, 1);
      assert.strictEqual(flameChartData.groups[0].name, 'Timings');
    });
    it('populates the markers array in ascendent order', () => {
      const traceMarkers = traceParsedData.PageLoadMetrics.allMarkerEvents;
      assert.strictEqual(flameChartData.markers.length, traceMarkers.length);
      for (let i = 1; i < flameChartData.markers.length; i++) {
        assert.isAtLeast(flameChartData.markers[i].startTime(), flameChartData.markers[i - 1].startTime());
      }
    });
    it('creates a TimelineFlameChartMarker for each page load marker event in a trace', () => {
      const traceMarkers = traceParsedData.PageLoadMetrics.allMarkerEvents;
      assert.strictEqual(flameChartData.markers.length, traceMarkers.length);
      for (const traceMarker of traceMarkers) {
        const markerTimeMs = TraceModel.Helpers.Timing.microSecondsToMilliseconds(traceMarker.ts);
        const flameChartMarker =
            flameChartData.markers.find(flameChartMarker => flameChartMarker.startTime() === markerTimeMs);
        assert.isDefined(flameChartMarker);
      }
      assert.strictEqual(flameChartData.markers.length, traceMarkers.length);
    });
    it('adds start times correctly', () => {
      const traceMarkers = traceParsedData.PageLoadMetrics.allMarkerEvents;
      const performanceMarks = traceParsedData.UserTimings.performanceMarks;
      const performanceMeasures = traceParsedData.UserTimings.performanceMeasures;
      const consoleTimings = traceParsedData.UserTimings.consoleTimings;
      const consoleTimestamps = traceParsedData.UserTimings.timestampEvents;
      for (const event
               of [...traceMarkers, ...performanceMarks, ...performanceMeasures, ...consoleTimings,
                   ...consoleTimestamps]) {
        const markerIndex = entryData.indexOf(event);
        assert.isDefined(markerIndex);
        assert.strictEqual(
            flameChartData.entryStartTimes[markerIndex],
            TraceModel.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });
    it('adds total times correctly', () => {
      const traceMarkers = traceParsedData.PageLoadMetrics.allMarkerEvents;
      const performanceMarks = traceParsedData.UserTimings.performanceMarks;
      const performanceMeasures = traceParsedData.UserTimings.performanceMeasures;
      const consoleTimings = traceParsedData.UserTimings.consoleTimings;
      const consoleTimestamps = traceParsedData.UserTimings.timestampEvents;
      for (const event
               of [...traceMarkers, ...performanceMarks, ...performanceMeasures, ...consoleTimings,
                   ...consoleTimestamps]) {
        const markerIndex = entryData.indexOf(event);
        assert.isDefined(markerIndex);
        if (TraceModel.Handlers.ModelHandlers.PageLoadMetrics.isTraceEventMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[markerIndex]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            TraceModel.Helpers.Timing.microSecondsToMilliseconds(event.dur as TraceModel.Types.Timing.MicroSeconds) :
            Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        assert.strictEqual(flameChartData.entryTotalTimes[markerIndex], expectedTotalTimeForEvent);
      }
    });
  });

  describe('colorForEvent and titleForEvent', () => {
    it('returns the correct color and title for page load markers', () => {
      const traceMarkers = traceParsedData.PageLoadMetrics.allMarkerEvents;
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
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP);

      assert.strictEqual(timingsTrackAppender.colorForEvent(markLoad), '#B31412');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(markLoad), TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.L);

      assert.strictEqual(timingsTrackAppender.colorForEvent(markDOMContent), '#0867CB');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(markDOMContent),
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL);

      assert.strictEqual(timingsTrackAppender.colorForEvent(firstPaint), '#228847');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(firstPaint),
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP);

      assert.strictEqual(timingsTrackAppender.colorForEvent(largestContentfulPaint), '#1A3422');
      assert.strictEqual(
          timingsTrackAppender.titleForEvent(largestContentfulPaint),
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
    });

    it('returns the correct title for user timings', () => {
      const performanceMarks = traceParsedData.UserTimings.performanceMarks;
      const performanceMeasures = traceParsedData.UserTimings.performanceMeasures;
      for (const mark of [...performanceMarks, ...performanceMeasures]) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(mark), mark.name);
      }
    });

    it('returns the correct title for console timings', () => {
      const traceMarkers = traceParsedData.UserTimings.consoleTimings;
      for (const mark of traceMarkers) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(mark), mark.name);
      }
    });
    it('returns the correct title for console timestamps', () => {
      const traceMarkers = traceParsedData.UserTimings.timestampEvents;
      for (const mark of traceMarkers) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(mark), `TimeStamp: ${mark.args.data.message}`);
      }
    });
  });
  describe('highlightedEntryInfo', () => {
    it('returns the info for a entries with no duration correctly', () => {
      const traceMarkers = traceParsedData.PageLoadMetrics.allMarkerEvents;
      const performanceMarks = traceParsedData.UserTimings.performanceMarks;
      const consoleTimestamps = traceParsedData.UserTimings.timestampEvents;
      const allTrackEvents = [...traceMarkers, ...performanceMarks, ...consoleTimestamps];
      for (const event of allTrackEvents) {
        const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(event);
        if (TraceModel.Handlers.ModelHandlers.PageLoadMetrics.isTraceEventMarkerEvent(event)) {
          assert.strictEqual(highlightedEntryInfo.formattedTime, '');
        }
      }
    });
    it('returns the info for a performance.measure calls correctly', () => {
      const performanceMeasures = traceParsedData.UserTimings.performanceMeasures;
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(performanceMeasures[0]);
      // The i18n encondes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, ('500.07\u00A0ms'));
    });
    it('returns the info for a console.time calls correctly', () => {
      const consoleTimings = traceParsedData.UserTimings.consoleTimings;
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(consoleTimings[0]);
      // The i18n encondes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, ('1.60\u00A0s'));
    });
  });
});
