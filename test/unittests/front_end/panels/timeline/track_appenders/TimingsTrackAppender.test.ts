// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import type * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

const {assert} = chai;

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, traceParsedData: TraceModel.Handlers.Types.TraceParseData,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl): Timeline.TimingsTrackAppender.TimingsTrackAppender {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
  return compatibilityTracksAppender.timingsTrackAppender();
}

describeWithEnvironment('TimingTrackAppender', function() {
  let traceParsedData: TraceModel.Handlers.Types.TraceParseData;
  let timingsTrackAppender: Timeline.TimingsTrackAppender.TimingsTrackAppender;
  let entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  let entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
  beforeEach(async function() {
    const data = await TraceLoader.allModels(this, 'timings-track.json.gz');
    traceParsedData = data.traceParsedData;
    timingsTrackAppender =
        initTrackAppender(flameChartData, traceParsedData, entryData, entryTypeByLevel, data.timelineModel);
    timingsTrackAppender.appendTrackAtLevel(0);
  });
  afterEach(() => {
    entryData = [];
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    entryTypeByLevel = [];
  });

  describe('appendTrackAtLevel', () => {
    it('marks all levels used by the track with the `TrackAppender` type', () => {
      // 8 levels should be taken:
      //   * 1 for page load marks.
      //   * 1 performance.marks.
      //   * 3 used by performance.measures.
      //   * 1 used by console timestamps.
      //   * 1 used by console.time calls.
      const levelCount = 7;
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

    it('returns the correct title for performance measures', () => {
      const performanceMeasures = traceParsedData.UserTimings.performanceMeasures;
      for (const measure of performanceMeasures) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(measure), measure.name);
      }
    });

    it('returns the correct title for console timings', () => {
      const traceMarkers = traceParsedData.UserTimings.consoleTimings;
      for (const mark of traceMarkers) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(mark), mark.name);
      }
    });

    it('returns the correct title for performance marks', () => {
      const traceMarkers = traceParsedData.UserTimings.performanceMarks;
      for (const mark of traceMarkers) {
        assert.strictEqual(timingsTrackAppender.titleForEvent(mark), `[mark]: ${mark.name}`);
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
    it('shows the time of the mark, not the duration, if the event is a performance mark', () => {
      const firstMark = traceParsedData.UserTimings.performanceMarks[0];
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(firstMark);
      assert.deepEqual(highlightedEntryInfo, {
        title: '[mark]: myMark',
        formattedTime: '1.12\u00A0s',
      });
    });

    it('shows the time of the mark for an LCP event', () => {
      const largestContentfulPaint = traceParsedData.PageLoadMetrics.allMarkerEvents.find(
          marker => marker.name === 'largestContentfulPaint::Candidate');
      if (!largestContentfulPaint) {
        throw new Error('Could not find LCP event');
      }
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(largestContentfulPaint);
      assert.deepEqual(highlightedEntryInfo, {
        title: 'LCP',
        formattedTime: '2.42\u00A0s',
      });
    });

    it('shows the time of the mark for an FCP event', () => {
      const firstContentfulPaint =
          traceParsedData.PageLoadMetrics.allMarkerEvents.find(marker => marker.name === 'firstContentfulPaint');
      if (!firstContentfulPaint) {
        throw new Error('Could not find FCP event');
      }
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(firstContentfulPaint);
      assert.deepEqual(highlightedEntryInfo, {
        title: 'FCP',
        formattedTime: '2.42\u00A0s',
      });
    });

    it('shows the time of the mark for a DCL event', () => {
      const dclEvent = traceParsedData.PageLoadMetrics.allMarkerEvents.find(marker => marker.name === 'MarkDOMContent');
      if (!dclEvent) {
        throw new Error('Could not find DCL event');
      }
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(dclEvent);
      assert.deepEqual(highlightedEntryInfo, {
        title: 'DCL',
        formattedTime: '2.42\u00A0s',
      });
    });

    it('shows the time of a console.timestamp event in the hover info', () => {
      const timestampEvent = traceParsedData.UserTimings.timestampEvents[0];
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(timestampEvent);

      assert.deepEqual(highlightedEntryInfo, {
        title: 'TimeStamp: a timestamp',
        formattedTime: '615.25\u00A0ms',
      });
    });

    it('returns the info for a performance.measure calls correctly', () => {
      const performanceMeasures = traceParsedData.UserTimings.performanceMeasures;
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(performanceMeasures[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, ('500.07\u00A0ms'));
    });

    it('returns the info for a console.time calls correctly', () => {
      const consoleTimings = traceParsedData.UserTimings.consoleTimings;
      const highlightedEntryInfo = timingsTrackAppender.highlightedEntryInfo(consoleTimings[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, ('1.60\u00A0s'));
    });
  });
});
