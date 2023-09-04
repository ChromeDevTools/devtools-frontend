// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';

import {type HighlightedEntryInfo, type TrackAppender, type TrackAppenderName} from './CompatibilityTracksAppender.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import {InstantEventVisibleDurationMs} from './TimelineFlameChartDataProvider.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  network: 'Network',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/NetworkTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class NetworkTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Network';

  #traceParsedData: Readonly<TraceEngine.Handlers.Migration.PartialTraceData>;
  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;

  #font: string;
  #group?: PerfUI.FlameChart.Group;

  constructor(
      traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData,
      flameChartData: PerfUI.FlameChart.FlameChartTimelineData) {
    this.#traceParsedData = traceParsedData;
    this.#flameChartData = flameChartData;

    this.#font = `${PerfUI.Font.DEFAULT_FONT_SIZE} ${PerfUI.Font.getFontFamilyForCanvas()}`;

    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      if (this.#group) {
        // We only need to update the color here, because FlameChart will call `scheduleUpdate()` when theme is changed.
        this.#group.style.color = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface');
        this.#group.style.backgroundColor =
            ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container');
      }
    });
  }

  group(): PerfUI.FlameChart.Group|undefined {
    return this.#group;
  }

  font(): string {
    return this.#font;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * Network track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean|undefined): number {
    const networkEvents = this.#traceParsedData.NetworkRequests.byTime;
    if (networkEvents.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendEventsAtLevel(networkEvents, trackStartLevel);
  }

  /**
   * Adds into the flame chart data the header corresponding to the
   * Network track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   * @param expanded wether the track should be rendered expanded.
   */
  #appendTrackHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const style = buildGroupStyle({
      font: this.#flameChartData,
      shareHeaderLine: false,
      useFirstLineForOverview: false,
      useDecoratorsForOverview: true,
    });
    this.#group = buildTrackHeader(0, i18nString(UIStrings.network), style, /* selectable= */ true, expanded);
    this.#flameChartData.groups.push(this.#group);
  }

  /**
   * Adds into the flame chart data a list of trace events.
   * @param events the trace events that will be appended to the flame chart.
   * The events should be taken straight from the trace handlers. The handlers
   * should sort the events by start time, and the parent event is before the
   * child.
   * @param trackStartLevel the flame chart level from which the events will
   * be appended.
   * @param appender the track that the trace events belong to.
   * @returns the next level after the last occupied by the appended these
   * trace events (the first available level to append next track).
   */
  #appendEventsAtLevel(events: readonly TraceEngine.Types.TraceEvents.TraceEventData[], trackStartLevel: number):
      number {
    if (events.length === 0) {
      return trackStartLevel;
    }
    const lastTimeByLevel = [];
    let maxLevel = 0;
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      const startTime = event.ts;
      const endTime = event.ts + (event.dur || 0);
      while (lastTimeByLevel.length && lastTimeByLevel[lastTimeByLevel.length - 1] <= startTime) {
        lastTimeByLevel.pop();
      }
      const level = lastTimeByLevel.length;
      this.#appendEventAtLevel(event, trackStartLevel + level);
      lastTimeByLevel.push(endTime);
      maxLevel = Math.max(maxLevel, lastTimeByLevel.length);
    }
    return trackStartLevel + maxLevel;
  }

  /**
   * Adds an event to the flame chart data at a defined level.
   * @param event the event to be appended,
   * @param level the level to append the event,
   * @param appender the track which the event belongs to.
   * @returns the index of the event in all events to be rendered in the flamechart.
   */
  #appendEventAtLevel(event: TraceEngine.Types.TraceEvents.TraceEventData, level: number): number {
    const index = this.#flameChartData.entryLevels.length;
    this.#flameChartData.entryLevels[index] = level;
    this.#flameChartData.entryStartTimes[index] = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const msDuration = event.dur ||
        TraceEngine.Helpers.Timing.millisecondsToMicroseconds(
            InstantEventVisibleDurationMs as TraceEngine.Types.Timing.MilliSeconds);
    this.#flameChartData.entryTotalTimes[index] = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(msDuration);
    return level;
  }

  /**
   * Update the flame chart data.
   * When users zoom in the flamechart, we only want to show them the network
   * requests between startTime and endTime. This function will append those
   * invisible events to the last level, and hide them.
   * @returns the number of levels used by this track
   */
  filterTimelineDataBetweenTimes(
      startTime: TraceEngine.Types.Timing.MilliSeconds, endTime: TraceEngine.Types.Timing.MilliSeconds): number {
    const events = this.#traceParsedData.NetworkRequests.byTime;
    if (!this.#flameChartData || events.length === 0) {
      return 0;
    }
    const lastTimeByLevel = [];
    let maxLevel = 0;
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      const beginTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts);
      const eventEndTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(
          (event.ts + event.dur) as TraceEngine.Types.Timing.MicroSeconds);
      const visible = beginTime < endTime && eventEndTime > startTime;
      if (!visible) {
        this.#flameChartData.entryLevels[i] = -1;
        continue;
      }
      while (lastTimeByLevel.length && lastTimeByLevel[lastTimeByLevel.length - 1] <= beginTime) {
        lastTimeByLevel.pop();
      }
      this.#flameChartData.entryLevels[i] = lastTimeByLevel.length;
      lastTimeByLevel.push(eventEndTime);
      maxLevel = Math.max(maxLevel, lastTimeByLevel.length);
    }
    for (let i = 0; i < events.length; ++i) {
      // -1 means this event is invisible.
      if (this.#flameChartData.entryLevels[i] === -1) {
        // The maxLevel is an invisible level.
        this.#flameChartData.entryLevels[i] = maxLevel;
      }
    }
    return maxLevel;
  }

  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */

  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (!TraceEngine.Types.TraceEvents.isSyntheticNetworkRequestDetailsEvent(event)) {
      throw new Error(`Unexpected Network Request: The event's type is '${event.name}'`);
    }
    const category = TimelineUIUtils.syntheticNetworkRequestCategory(event);
    return TimelineUIUtils.networkCategoryColor(category);
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    return event.name;
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.TraceEventData): HighlightedEntryInfo {
    const title = this.titleForEvent(event);
    return {title, formattedTime: getFormattedTime(event.dur)};
  }
}
