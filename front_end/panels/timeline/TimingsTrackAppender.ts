// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';

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

type TimelineMarkerEntry = Trace.Types.Extensions.SyntheticExtensionMarker|Trace.Types.Events.PageLoadEvent;

/**
 * This defines the order these markers will be rendered if they are at the
 * same timestamp. The smaller number will be shown first - e.g. so if MarkFCP,
 * MarkDOMContent and MarkLCPCandidate have the same timestamp, visually we
 * will render [FCP][DCL][LCP] everytime.
 */
export const SORT_ORDER_PAGE_LOAD_MARKERS: Readonly<Record<string, number>> = {
  [Trace.Types.Events.Name.NAVIGATION_START]: 0,
  [Trace.Types.Events.Name.MARK_LOAD]: 1,
  [Trace.Types.Events.Name.MARK_FCP]: 2,
  [Trace.Types.Events.Name.MARK_FIRST_PAINT]: 2,
  [Trace.Types.Events.Name.MARK_DOM_CONTENT]: 3,
  [Trace.Types.Events.Name.MARK_LCP_CANDIDATE]: 4,
};

export class TimingsTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Timings';

  #colorGenerator: Common.Color.Generator;
  #compatibilityBuilder: CompatibilityTracksAppender;
  #parsedTrace: Readonly<Trace.Handlers.Types.ParsedTrace>;

  /**
   * Before rendering the markers we group them by timestamp. This is because
   * if we have multiple markers (e.g. FCP and LCP) at the same time, we want
   * to ensure that we visually render FCP before LCP - else it's confusing
   * to the user to see LCP appear before FCP, even though they are at the
   * same timestamp.
   * We only do this for PageLoadMarkers - any extension based markers are
   * not sorted. If an extension marker happens to be at the same time as
   * LCP, the native LCP event is preferred and shown first.
   * Because we create an instance of an Appender per trace, we can cache this rather than calculate on each run.
   */
  #cachedMarkersByTimestamp: Map<Trace.Types.Timing.MicroSeconds, TimelineMarkerEntry[]>|null = null;

  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      colorGenerator: Common.Color.Generator) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = colorGenerator;
    this.#parsedTrace = parsedTrace;
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
    const pageloadMarkers = this.#parsedTrace.PageLoadMetrics.allMarkerEvents;
    const extensionMarkersAreEmpty = extensionMarkers.length === 0;
    const performanceMarks = this.#parsedTrace.UserTimings.performanceMarks.filter(
        m => !Trace.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInTiming(m));
    const performanceMeasures = this.#parsedTrace.UserTimings.performanceMeasures.filter(
        m => !Trace.Handlers.ModelHandlers.ExtensionTraceData.extensionDataInTiming(m));
    const timestampEvents = this.#parsedTrace.UserTimings.timestampEvents;
    const consoleTimings = this.#parsedTrace.UserTimings.consoleTimings;

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
    const trackIsCollapsible = this.#parsedTrace.UserTimings.performanceMeasures.length > 0;
    const style = buildGroupStyle({useFirstLineForOverview: true, collapsible: trackIsCollapsible});
    const group = buildTrackHeader(
        VisualLoggingTrackName.TIMINGS, currentLevel, i18nString(UIStrings.timings), style, /* selectable= */ true,
        expanded);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  #sortMarkersForPreferredVisualOrder(markers: TimelineMarkerEntry[]): void {
    markers.sort((m1, m2) => {
      const m1Index = SORT_ORDER_PAGE_LOAD_MARKERS[m1.name] ?? Infinity;
      const m2Index = SORT_ORDER_PAGE_LOAD_MARKERS[m2.name] ?? Infinity;
      return m1Index - m2Index;
    });
  }

  /**
   * Group markers into a map, where keys are timestamps and the values are markers that have the same timestamp.
   */
  #groupMarkersByTimestamp(markers: TimelineMarkerEntry[]):
      Map<Trace.Types.Timing.MicroSeconds, TimelineMarkerEntry[]> {
    if (this.#cachedMarkersByTimestamp) {
      return this.#cachedMarkersByTimestamp;
    }
    const markersByTimestamp = new Map<Trace.Types.Timing.MicroSeconds, TimelineMarkerEntry[]>();

    markers.forEach(marker => {
      const forTime = markersByTimestamp.get(marker.ts) || [];
      forTime.push(marker);
      markersByTimestamp.set(marker.ts, forTime);
    });

    for (const markersAtTime of markersByTimestamp.values()) {
      if (markersAtTime.length > 1) {
        this.#sortMarkersForPreferredVisualOrder(markersAtTime);
      }
    }

    this.#cachedMarkersByTimestamp = markersByTimestamp;
    return this.#cachedMarkersByTimestamp;
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
    let markers: TimelineMarkerEntry[] = this.#parsedTrace.PageLoadMetrics.allMarkerEvents;
    markers = markers.concat(ExtensionDataGatherer.instance().getExtensionData().extensionMarkers)
                  .sort((m1, m2) => m1.ts - m2.ts);
    if (markers.length === 0) {
      return currentLevel;
    }
    const markersByTimestamp = this.#groupMarkersByTimestamp(markers);
    for (const markersAtTime of markersByTimestamp.values()) {
      for (const marker of markersAtTime) {
        const index = this.#compatibilityBuilder.appendEventAtLevel(marker, currentLevel, this);
        // Marker events do not have a duration: rendering code in
        // FlameChart.ts relies on us setting this to NaN
        this.#compatibilityBuilder.getFlameChartTimelineData().entryTotalTimes[index] = Number.NaN;
      }
    }

    const minTimeMs = Trace.Helpers.Timing.microSecondsToMilliseconds(this.#parsedTrace.Meta.traceBounds.min);
    const flameChartMarkers = markers.map(marker => {
      // The timestamp for user timing trace events is set to the
      // start time passed by the user at the call site of the timing
      // (based on the UserTiming spec), meaning we can use event.ts
      // directly.
      // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/performance_user_timing.cc;l=236;drc=494419358caf690316f160a1f27d9e771a14c033
      const startTimeMs = Trace.Helpers.Timing.microSecondsToMilliseconds(marker.ts);
      const style = Trace.Types.Extensions.isSyntheticExtensionEntry(marker) ?
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
  markerStyleForPageLoadEvent(markerEvent: Trace.Types.Events.PageLoadEvent): TimelineMarkerStyle {
    const tallMarkerDashStyle = [6, 4];
    let title = '';
    let color = 'grey';
    if (Trace.Types.Events.isMarkDOMContent(markerEvent)) {
      color = '#0867CB';
      title = Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL;
    }
    if (Trace.Types.Events.isMarkLoad(markerEvent)) {
      color = '#B31412';
      title = Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.L;
    }
    if (Trace.Types.Events.isFirstPaint(markerEvent)) {
      color = '#228847';
      title = Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP;
    }
    if (Trace.Types.Events.isFirstContentfulPaint(markerEvent)) {
      color = '#1A6937';
      title = Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP;
    }
    if (Trace.Types.Events.isLargestContentfulPaintCandidate(markerEvent)) {
      color = '#1A3422';
      title = Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP;
    }
    if (Trace.Types.Events.isNavigationStart(markerEvent)) {
      color = '#FF9800';
      title = '';
    }
    return {
      title,
      dashStyle: tallMarkerDashStyle,
      lineWidth: 0.5,
      color,
      tall: true,
      lowPriority: false,
    };
  }

  markerStyleForExtensionMarker(markerEvent: Trace.Types.Extensions.SyntheticExtensionMarker): TimelineMarkerStyle {
    const tallMarkerDashStyle = [6, 4];
    const title = markerEvent.name;
    const color = Extensions.ExtensionUI.extensionEntryColor(markerEvent);
    return {
      title,
      dashStyle: tallMarkerDashStyle,
      lineWidth: 0.5,
      color,
      tall: true,
      lowPriority: false,
    };
  }

  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event: Trace.Types.Events.Event): string {
    if (Trace.Types.Events.eventIsPageLoadEvent(event)) {
      return this.markerStyleForPageLoadEvent(event).color;
    }
    if (Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
      return Extensions.ExtensionUI.extensionEntryColor(event);
    }
    // Performance and console timings.
    return this.#colorGenerator.colorForID(event.name);
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: Trace.Types.Events.Event): string {
    const metricsHandler = Trace.Handlers.ModelHandlers.PageLoadMetrics;
    if (Trace.Types.Events.eventIsPageLoadEvent(event)) {
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
    if (Trace.Types.Events.isTimeStamp(event)) {
      return `${event.name}: ${event.args.data.message}`;
    }
    if (Trace.Types.Events.isPerformanceMark(event)) {
      return `[mark]: ${event.name}`;
    }
    return event.name;
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: Trace.Types.Events.Event): HighlightedEntryInfo {
    const title = Trace.Types.Extensions.isSyntheticExtensionEntry(event) && event.args.tooltipText ?
        event.args.tooltipText :
        this.titleForEvent(event);

    // If an event is a marker event, rather than show a duration of 0, we can instead show the time that the event happened, which is much more useful. We do this currently for:
    // Page load events: DCL, FCP and LCP
    // performance.mark() events
    // console.timestamp() events
    if (Trace.Types.Events.isMarkerEvent(event) || Trace.Types.Events.isPerformanceMark(event) ||
        Trace.Types.Events.isTimeStamp(event)) {
      const timeOfEvent = Trace.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(
          event,
          this.#parsedTrace.Meta.traceBounds,
          this.#parsedTrace.Meta.navigationsByNavigationId,
          this.#parsedTrace.Meta.navigationsByFrameId,
      );
      return {title, formattedTime: getFormattedTime(timeOfEvent)};
    }

    return {title, formattedTime: getFormattedTime(event.dur)};
  }
}
