// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import {
  EntryType,
  InstantEventVisibleDurationMs,
  type TimelineFlameChartEntry,
} from './TimelineFlameChartDataProvider.js';
import {
  type CompatibilityTracksAppender,
  type TrackAppender,
  type HighlightedEntryInfo,
  type TrackAppenderName,
} from './CompatibilityTracksAppender.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as i18n from '../../core/i18n/i18n.js';
import {TimelineFlameChartMarker} from './TimelineFlameChartView.js';
import {type TimelineMarkerStyle, TimelineUIUtils} from './TimelineUIUtils.js';
import * as Common from '../../core/common/common.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  timings: 'Timings',
  /**
   * @description Text in the Performance panel to show how long was spent in a particular part of the code.
   * The first placeholder is the total time taken for this node and all children, the second is the self time
   * (time taken in this node, without children included).
   *@example {10ms} PH1
   *@example {10ms} PH2
   */
  sSelfS: '{PH1} (self {PH2})',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimingsTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class TimingsTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Timings';

  #colorGenerator: Common.Color.Generator;
  #compatibilityBuilder: CompatibilityTracksAppender;
  #flameChartData: PerfUI.FlameChart.TimelineData;
  #traceParsedData: Readonly<TraceEngine.TraceModel.PartialTraceParseDataDuringMigration>;
  #entryData: TimelineFlameChartEntry[];
  // TODO(crbug.com/1416533)
  // These are used only for compatibility with the legacy flame chart
  // architecture of the panel. Once all tracks have been migrated to
  // use the new engine and flame chart architecture, the reference can
  // be removed.
  #legacyEntryTypeByLevel: EntryType[];
  #legacyTrack: TimelineModel.TimelineModel.Track|null;

  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, flameChartData: PerfUI.FlameChart.TimelineData,
      traceParsedData: TraceEngine.TraceModel.PartialTraceParseDataDuringMigration,
      entryData: TimelineFlameChartEntry[], legacyEntryTypeByLevel: EntryType[],
      legacyTrack?: TimelineModel.TimelineModel.Track) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = new Common.Color.Generator(
        {
          min: 30,
          max: 55,
          count: undefined,
        },
        {min: 70, max: 100, count: 6}, 50, 0.7);
    this.#flameChartData = flameChartData;
    this.#traceParsedData = traceParsedData;
    this.#entryData = entryData;
    this.#legacyEntryTypeByLevel = legacyEntryTypeByLevel;
    this.#legacyTrack = legacyTrack || null;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * timings track.
   * @param level the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(currentLevel: number, expanded?: boolean): number {
    this.#appendTrackHeaderAtLevel(currentLevel, expanded);
    let newLevel = this.#appendMarkersAtLevel(currentLevel);
    // Add some vertical space between page load markers and user
    // timings by appending timings 2 levels after the markers' level.
    newLevel = this.#appendUserTimingsAtLevel(newLevel + 1);
    return this.#appendConsoleTimings(newLevel);
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

    const style: PerfUI.FlameChart.GroupStyle = {
      padding: 4,
      height: 17,
      collapsible: trackIsCollapsible,
      color: ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary'),
      backgroundColor: ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background'),
      nestingLevel: 0,
      shareHeaderLine: true,
      useFirstLineForOverview: true,
    };
    const group =
        ({startLevel: currentLevel, name: i18nString(UIStrings.timings), style: style, selectable: true, expanded} as
         PerfUI.FlameChart.Group);
    this.#flameChartData.groups.push(group);
    group.track = this.#legacyTrack;
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
    const totalTimes = this.#flameChartData.entryTotalTimes;
    const markers = this.#traceParsedData.PageLoadMetrics.allMarkerEvents;
    markers.forEach(marker => {
      const index = this.#appendEventAtLevel(marker, currentLevel);
      totalTimes[index] = Number.NaN;
    });
    const minTimeMs = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(this.#traceParsedData.Meta.traceBounds.min);
    const flameChartMarkers = markers.map(marker => {
      const startTimeMs = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(marker.ts);
      return new TimelineFlameChartMarker(startTimeMs, startTimeMs - minTimeMs, this.markerStyleForEvent(marker));
    });
    this.#flameChartData.markers.push(...flameChartMarkers);
    return ++currentLevel;
  }

  /**
   * Adds into the flame chart data the trace events corresponding to
   * user timings (performance.measure and performance.mark). These are
   * taken straight from the UserTimings handler.
   * @param currentLevel the flame chart level from which user timings will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * timings (the first available level to append more data).
   */
  #appendUserTimingsAtLevel(currentLevel: number): number {
    let newLevel = currentLevel;

    for (const userMark of this.#traceParsedData.UserTimings.performanceMarks) {
      this.#appendEventAtLevel(userMark, newLevel);
    }
    if (this.#traceParsedData.UserTimings.performanceMarks.length !== 0) {
      // Add performance.measure events on the next level, but only if the
      // current level was used by performance.marks events.
      newLevel++;
    }
    return this.#appendTimingsAtLevel(newLevel, this.#traceParsedData.UserTimings.performanceMeasures);
  }

  /**
   * Adds into the flame chart data the trace events corresponding to
   * console timings (console.time and console.timeEnd/timeLog). These are
   * taken straight from the UserTimings handler.
   * @param currentLevel the flame chart level from which user timings will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * timings (the first available level to append more data).
   */
  #appendConsoleTimings(currentLevel: number): number {
    let newLevel = currentLevel;
    for (const timestamp of this.#traceParsedData.UserTimings.timestampEvents) {
      this.#appendEventAtLevel(timestamp, newLevel);
    }
    if (this.#traceParsedData.UserTimings.timestampEvents.length !== 0) {
      // Add console.time events on the next level, but only if the
      // current level was used by timestamp events.
      newLevel++;
    }
    return this.#appendTimingsAtLevel(newLevel, this.#traceParsedData.UserTimings.consoleTimings);
  }
  /**
   * Adds into the flame chart data the syntetic nestable async events
   * These events are taken from the UserTimings handler from console
   * and performance timings.
   * @param currentLevel the flame chart level from which timings will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * timings (the first available level to append more data).
   */

  #appendTimingsAtLevel(
      currentLevel: number,
      timings: readonly TraceEngine.Types.TraceEvents.TraceEventSyntheticNestableAsyncEvent[]): number {
    const lastUsedTimeByLevel: number[] = [];
    for (let i = 0; i < timings.length; ++i) {
      const event = timings[i];
      const eventAsLegacy = this.#compatibilityBuilder.getLegacyEvent(event);
      // Default styles are globally defined for each event name. Some
      // events are hidden by default.
      const visibleNames = new Set(TimelineUIUtils.visibleTypes());
      const eventIsVisible = eventAsLegacy &&
          visibleNames.has(TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(eventAsLegacy));
      if (!eventIsVisible) {
        continue;
      }
      const startTime = event.ts;
      let level;
      // look vertically for the first level where this event fits,
      // that is, where it wouldn't overlap with other events.
      for (level = 0; level < lastUsedTimeByLevel.length && lastUsedTimeByLevel[level] > startTime; ++level) {
      }
      this.#appendEventAtLevel(event, currentLevel + level);
      const endTime = event.ts + (event.dur || 0);
      lastUsedTimeByLevel[level] = endTime;
    }
    this.#legacyEntryTypeByLevel.length = currentLevel + lastUsedTimeByLevel.length;
    // Set the entry type to TrackAppender for all the levels occupied by the appended timings.
    this.#legacyEntryTypeByLevel.fill(EntryType.TrackAppender, currentLevel);
    return currentLevel + lastUsedTimeByLevel.length;
  }

  /**
   * Adds an event to the flame chart data at a defined level.
   * @returns the position occupied by the new event in the entryData
   * array, which contains all the events in the timeline.
   */
  #appendEventAtLevel(event: TraceEngine.Types.TraceEvents.TraceEventData, level: number): number {
    this.#compatibilityBuilder.registerTrackForLevel(level, this);
    const index = this.#entryData.length;
    this.#entryData.push(event);
    this.#legacyEntryTypeByLevel[level] = EntryType.TrackAppender;
    this.#flameChartData.entryLevels[index] = level;
    this.#flameChartData.entryStartTimes[index] = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const msDuration = event.dur ||
        TraceEngine.Helpers.Timing.millisecondsToMicroseconds(
            InstantEventVisibleDurationMs as TraceEngine.Types.Timing.MilliSeconds);
    this.#flameChartData.entryTotalTimes[index] = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(msDuration);
    return index;
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
        default:
          return event.name;
      }
    }
    if (TraceEngine.Types.TraceEvents.isTraceEventTimeStamp(event)) {
      return `${event.name}: ${event.args.data.message}`;
    }
    return event.name;
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.TraceEventData): HighlightedEntryInfo {
    const title = this.titleForEvent(event);
    const totalTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(
        (event.dur || 0) as TraceEngine.Types.Timing.MicroSeconds);
    const selfTime = totalTime;
    if (totalTime === TraceEngine.Types.Timing.MilliSeconds(0)) {
      return {title, formattedTime: ''};
    }
    const minSelfTimeSignificance = 1e-6;
    const time = Math.abs(totalTime - selfTime) > minSelfTimeSignificance && selfTime > minSelfTimeSignificance ?
        i18nString(UIStrings.sSelfS, {
          PH1: i18n.TimeUtilities.millisToString(totalTime, true),
          PH2: i18n.TimeUtilities.millisToString(selfTime, true),
        }) :
        i18n.TimeUtilities.millisToString(totalTime, true);
    return {title, formattedTime: time};
  }
}
