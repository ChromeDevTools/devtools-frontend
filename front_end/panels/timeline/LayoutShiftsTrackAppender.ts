// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import {
  EntryType,
  type TimelineFlameChartEntry,
} from './TimelineFlameChartDataProvider.js';
import {
  type CompatibilityTracksAppender,
  type TrackAppender,
  type HighlightedEntryInfo,
  type TrackAppenderName,
} from './CompatibilityTracksAppender.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  layoutShifts: 'Layout Shifts',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/LayoutShiftsTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class LayoutShiftsTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'LayoutShifts';

  #compatibilityBuilder: CompatibilityTracksAppender;
  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;
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
      compatibilityBuilder: CompatibilityTracksAppender, flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
      traceParsedData: TraceEngine.TraceModel.PartialTraceParseDataDuringMigration,
      entryData: TimelineFlameChartEntry[], legacyEntryTypeByLevel: EntryType[],
      legacyTrack?: TimelineModel.TimelineModel.Track) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#flameChartData = flameChartData;
    this.#traceParsedData = traceParsedData;
    this.#entryData = entryData;
    this.#legacyEntryTypeByLevel = legacyEntryTypeByLevel;
    this.#legacyTrack = legacyTrack || null;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * layout shifts track.
   * @param level the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(currentLevel: number, expanded?: boolean): number {
    if (this.#traceParsedData.LayoutShifts.clusters.length === 0) {
      return currentLevel;
    }
    this.#appendTrackHeaderAtLevel(currentLevel, expanded);
    return this.#appendLayoutShiftsAtLevel(currentLevel);
  }

  /**
   * Adds into the flame chart data the header corresponding to the
   * layout shifts track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const style = buildGroupStyle({collapsible: false});
    const group = buildTrackHeader(
        currentLevel, i18nString(UIStrings.layoutShifts), style,
        /* selectable= */ true, expanded, this.#legacyTrack);
    this.#flameChartData.groups.push(group);
  }

  /**
   * Adds into the flame chart data all the layout shifts. These are taken from
   * the clusters that are collected in the LayoutShiftsHandler.
   * @param currentLevel the flame chart level from which layout shifts will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * layout shifts (the first available level to append more data).
   */
  #appendLayoutShiftsAtLevel(currentLevel: number): number {
    const allLayoutShifts = this.#traceParsedData.LayoutShifts.clusters.flatMap(cluster => {
      return cluster.events;
    });
    const lastUsedTimeByLevel: number[] = [];
    for (let i = 0; i < allLayoutShifts.length; ++i) {
      const event = allLayoutShifts[i];
      const startTime = event.ts;
      let level;
      // look vertically for the first level where this event fits,
      // that is, where it wouldn't overlap with other events.
      for (level = 0; level < lastUsedTimeByLevel.length && lastUsedTimeByLevel[level] > startTime; ++level) {
      }
      this.#appendEventAtLevel(event, currentLevel + level);
      // End time is the same as the start time as LayoutShifts are instant events.
      lastUsedTimeByLevel[level] = event.ts;
    }
    this.#legacyEntryTypeByLevel.length = currentLevel + lastUsedTimeByLevel.length;
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
    // Bit of a hack: LayoutShifts are instant events, so have no duration. But
    // OPP doesn't do well at making tiny events easy to spot and click. So we
    // set it to a small duration so that the user is able to see and click
    // them more easily. Long term we will explore a better UI solution to
    // allow us to do this properly and not hack around it.
    const msDuration = TraceEngine.Types.Timing.MicroSeconds(5_000);
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
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(_event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    return 'rgb(155 127 230)';
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (TraceEngine.Types.TraceEvents.isTraceEventLayoutShift(event)) {
      return 'Layout shift';
    }
    return event.name;
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.TraceEventLayoutShift): HighlightedEntryInfo {
    const title = this.titleForEvent(event);
    return {title, formattedTime: getFormattedTime(event.dur)};
  }
}
