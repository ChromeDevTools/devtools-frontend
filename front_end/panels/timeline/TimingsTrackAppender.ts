// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as TraceEngine from '../../models/trace/trace.js';

import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  type HighlightedEntryInfo,
  type TrackAppender,
  type TrackAppenderName,
  VisualLoggingTrackName,
} from './CompatibilityTracksAppender.js';
import {ExtensionDataGatherer} from './ExtensionDataGatherer.js';
import * as Extensions from './extensions/extensions.js';
import {TimelineFlameChartMarker} from './TimelineFlameChartView.js';
import {type TimelineMarkerStyle} from './TimelineUIUtils.js';

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
  #traceParsedData: Readonly<TraceEngine.Handlers.Types.TraceParseData>;

  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, traceParsedData: TraceEngine.Handlers.Types.TraceParseData,
      colorGenerator: Common.Color.Generator) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = colorGenerator;
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
    const extensionMarkers = ExtensionDataGatherer.instance().getExtensionData().extensionMarkers;
    const pageloadMarkers = this.#traceParsedData.PageLoadMetrics.allMarkerEvents;
    const extensionMarkersAreEmpty = extensionMarkers.length === 0;
    const performanceMarks = this.#traceParsedData.UserTimings.performanceMarks.filter(
        m => !TraceEngine.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInTiming(m));
    const performanceMeasures = this.#traceParsedData.UserTimings.performanceMeasures.filter(
        m => !TraceEngine.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInTiming(m));
    const timestampEvents = this.#traceParsedData.UserTimings.timestampEvents;
    const consoleTimings = this.#traceParsedData.UserTimings.consoleTimings;

    if (extensionMarkersAreEmpty && pageloadMarkers.length === 0 && performanceMarks.length === 0 &&
        performanceMeasures.length === 0 && timestampEvents.length === 0 && consoleTimings.length === 0) {
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
    const style = buildGroupStyle({useFirstLineForOverview: true, collapsible: trackIsCollapsible});
    const group = buildTrackHeader(
        VisualLoggingTrackName.TIMINGS, currentLevel, i18nString(UIStrings.timings), style, /* selectable= */ true,
        expanded);
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
    let markers: (TraceEngine.Types.Extensions.SyntheticExtensionMarker|TraceEngine.Types.TraceEvents.PageLoadEvent)[] =
        this.#traceParsedData.PageLoadMetrics.allMarkerEvents;
    markers = markers.concat(ExtensionDataGatherer.instance().getExtensionData().extensionMarkers)
                  .sort((m1, m2) => m1.ts - m2.ts);
    if (markers.length === 0) {
      return currentLevel;
    }

    markers.forEach(marker => {
      const index = this.#compatibilityBuilder.appendEventAtLevel(marker, currentLevel, this);
      this.#compatibilityBuilder.getFlameChartTimelineData().entryTotalTimes[index] = Number.NaN;
    });

    const minTimeMs = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(this.#traceParsedData.Meta.traceBounds.min);
    const flameChartMarkers = markers.map(marker => {
      // The timestamp for user timing trace events is set to the
      // start time passed by the user at the call site of the timing
      // (based on the UserTiming spec), meaning we can use event.ts
      // directly.
      // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/performance_user_timing.cc;l=236;drc=494419358caf690316f160a1f27d9e771a14c033
      const startTimeMs = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(marker.ts);
      const style = TraceEngine.Types.Extensions.isSyntheticExtensionEntry(marker) ?
          this.markerStyleForExtensionMarker(marker) :
          this.markerStyleForPageLoadEvent(marker);
      return new TimelineFlameChartMarker(startTimeMs, startTimeMs - minTimeMs, style);
    });
    this.#compatibilityBuilder.getFlameChartTimelineData().markers.push(...flameChartMarkers);
    // TODO: we would like to have markers share the level with the rest but...
    //  due to how CompatTrackAppender.appendEventsAtLevel tweaks the legacyEntryTypeByLevel array, it would take some work
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
  markerStyleForPageLoadEvent(markerEvent: TraceEngine.Types.TraceEvents.PageLoadEvent): TimelineMarkerStyle {
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

  markerStyleForExtensionMarker(markerEvent: TraceEngine.Types.Extensions.SyntheticExtensionMarker):
      TimelineMarkerStyle {
    const tallMarkerDashStyle = [6, 4];
    const title = markerEvent.name;
    const color = Extensions.ExtensionUI.extensionEntryColor(markerEvent);
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
    if (TraceEngine.Types.TraceEvents.eventIsPageLoadEvent(event)) {
      return this.markerStyleForPageLoadEvent(event).color;
    }
    if (TraceEngine.Types.Extensions.isSyntheticExtensionEntry(event)) {
      return Extensions.ExtensionUI.extensionEntryColor(event);
    }
    // Performance and console timings.
    return this.#colorGenerator.colorForID(event.name);
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    const metricsHandler = TraceEngine.Handlers.ModelHandlers.PageLoadMetrics;
    if (TraceEngine.Types.TraceEvents.eventIsPageLoadEvent(event)) {
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
    const title = TraceEngine.Types.Extensions.isSyntheticExtensionEntry(event) && event.args.tooltipText ?
        event.args.tooltipText :
        this.titleForEvent(event);

    // If an event is a marker event, rather than show a duration of 0, we can instead show the time that the event happened, which is much more useful. We do this currently for:
    // Page load events: DCL, FCP and LCP
    // performance.mark() events
    // console.timestamp() events
    if (TraceEngine.Types.TraceEvents.isTraceEventMarkerEvent(event) ||
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
