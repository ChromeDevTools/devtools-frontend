// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import {
  type CompatibilityTracksAppender,
  type TrackAppender,
  type HighlightedEntryInfo,
  type TrackAppenderName,
} from './CompatibilityTracksAppender.js';
import * as i18n from '../../core/i18n/i18n.js';
import {TimelineFlameChartMarker} from './TimelineFlameChartView.js';
import {type TimelineMarkerStyle} from './TimelineUIUtils.js';
import type * as Common from '../../core/common/common.js';
import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  timings: 'Timings',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimingsTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class TimingsTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Timings';

  #colorGenerator: Common.Color.Generator;
  #compatibilityBuilder: CompatibilityTracksAppender;
  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;
  #traceParsedData: Readonly<TraceEngine.Handlers.Migration.PartialTraceData>;

  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
      traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData, colorGenerator: Common.Color.Generator) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = colorGenerator;
    this.#flameChartData = flameChartData;
    this.#traceParsedData = traceParsedData;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * timings track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number {
    const allMarkerEvents = this.#traceParsedData.PageLoadMetrics.allMarkerEvents;
    const performanceMarks = this.#traceParsedData.UserTimings.performanceMarks;
    const performanceMeasures = this.#traceParsedData.UserTimings.performanceMeasures;
    const timestampEvents = this.#traceParsedData.UserTimings.timestampEvents;
    const consoleTimings = this.#traceParsedData.UserTimings.consoleTimings;

    if (allMarkerEvents.length === 0 && performanceMarks.length === 0 && performanceMeasures.length === 0 &&
        timestampEvents.length === 0 && consoleTimings.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    let newLevel = this.#appendMarkersAtLevel(trackStartLevel);
    newLevel = this.#compatibilityBuilder.appendEventsAtLevel(performanceMarks, newLevel, this);
    newLevel = this.#compatibilityBuilder.appendEventsAtLevel(performanceMeasures, newLevel, this);
    newLevel = this.#compatibilityBuilder.appendEventsAtLevel(timestampEvents, newLevel, this);
    return this.#compatibilityBuilder.appendEventsAtLevel(consoleTimings, newLevel, this);
  }

  /**
   * Adds into the flame chart data the header corresponding to the
   * timings track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const trackIsCollapsible = this.#traceParsedData.UserTimings.performanceMeasures.length > 0;
    const style =
        buildGroupStyle({shareHeaderLine: true, useFirstLineForOverview: true, collapsible: trackIsCollapsible});
    const group =
        buildTrackHeader(currentLevel, i18nString(UIStrings.timings), style, /* selectable= */ true, expanded);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  /**
   * Adds into the flame chart data the trace events corresponding
   * to page load markers (LCP, FCP, L, etc.). These are taken straight
   * from the PageLoadMetrics handler.
   * @param currentLevel the flame chart level from which markers will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * page load markers (the first available level to append more data).
   */
  #appendMarkersAtLevel(currentLevel: number): number {
    const markers = this.#traceParsedData.PageLoadMetrics.allMarkerEvents;
    markers.forEach(marker => {
      const index = this.#compatibilityBuilder.appendEventAtLevel(marker, currentLevel, this);
      this.#flameChartData.entryTotalTimes[index] = Number.NaN;
    });

    const minTimeMs = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(this.#traceParsedData.Meta.traceBounds.min);
    const flameChartMarkers = markers.map(marker => {
      const startTimeMs = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(marker.ts);
      return new TimelineFlameChartMarker(startTimeMs, startTimeMs - minTimeMs, this.markerStyleForEvent(marker));
    });
    this.#flameChartData.markers.push(...flameChartMarkers);
    return ++currentLevel;
  }

  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */

  /**
   * Gets the style for a page load marker event.
   */
  markerStyleForEvent(markerEvent: TraceEngine.Types.TraceEvents.PageLoadEvent): TimelineMarkerStyle {
    const tallMarkerDashStyle = [6, 4];
    let title = '';
    let color = 'grey';
    if (TraceEngine.Types.TraceEvents.isTraceEventMarkDOMContent(markerEvent)) {
      color = '#0867CB';
      title = TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL;
    }
    if (TraceEngine.Types.TraceEvents.isTraceEventMarkLoad(markerEvent)) {
      color = '#B31412';
      title = TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.L;
    }
    if (TraceEngine.Types.TraceEvents.isTraceEventFirstPaint(markerEvent)) {
      color = '#228847';
      title = TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP;
    }
    if (TraceEngine.Types.TraceEvents.isTraceEventFirstContentfulPaint(markerEvent)) {
      color = '#1A6937';
      title = TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP;
    }
    if (TraceEngine.Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(markerEvent)) {
      color = '#1A3422';
      title = TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP;
    }
    if (TraceEngine.Types.TraceEvents.isTraceEventNavigationStart(markerEvent)) {
      color = '#FF9800';
      title = '';
    }
    return {
      title: title,
      dashStyle: tallMarkerDashStyle,
      lineWidth: 0.5,
      color: color,
      tall: true,
      lowPriority: false,
    };
  }

  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.eventIsPageLoadEvent(event)) {
      return this.markerStyleForEvent(event).color;
    }
    // Performance and console timings.
    return this.#colorGenerator.colorForID(event.name);
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    const metricsHandler = TraceEngine.Handlers.ModelHandlers.PageLoadMetrics;
    if (metricsHandler.eventIsPageLoadEvent(event)) {
      switch (event.name) {
        case 'MarkDOMContent':
          return metricsHandler.MetricName.DCL;
        case 'MarkLoad':
          return metricsHandler.MetricName.L;
        case 'firstContentfulPaint':
          return metricsHandler.MetricName.FCP;
        case 'firstPaint':
          return metricsHandler.MetricName.FP;
        case 'largestContentfulPaint::Candidate':
          return metricsHandler.MetricName.LCP;
        case 'navigationStart':
          return '';
        default:
          return event.name;
      }
    }
    if (TraceEngine.Types.TraceEvents.isTraceEventTimeStamp(event)) {
      return `${event.name}: ${event.args.data.message}`;
    }
    if (TraceEngine.Types.TraceEvents.isTraceEventPerformanceMark(event)) {
      return `[mark]: ${event.name}`;
    }
    return event.name;
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.TraceEventData): HighlightedEntryInfo {
    const title = this.titleForEvent(event);

    // If an event is a marker event, rather than show a duration of 0, we can instead show the time that the event happened, which is much more useful. We do this currently for:
    // Page load events: DCL, FCP and LCP
    // performance.mark() events
    // console.timestamp() events
    if (TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.isTraceEventMarkerEvent(event) ||
        TraceEngine.Types.TraceEvents.isTraceEventPerformanceMark(event) ||
        TraceEngine.Types.TraceEvents.isTraceEventTimeStamp(event)) {
      const timeOfEvent = TraceEngine.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(
          event,
          this.#traceParsedData.Meta.traceBounds,
          this.#traceParsedData.Meta.navigationsByNavigationId,
          this.#traceParsedData.Meta.navigationsByFrameId,
      );
      return {title, formattedTime: getFormattedTime(timeOfEvent)};
    }

    return {title, formattedTime: getFormattedTime(event.dur)};
  }
}
