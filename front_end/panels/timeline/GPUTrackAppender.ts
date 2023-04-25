// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';

import {
  type TrackAppender,
  type TrackAppenderName,
  type CompatibilityTracksAppender,
  type HighlightedEntryInfo,
} from './CompatibilityTracksAppender.js';
import {
  EntryType,
  InstantEventVisibleDurationMs,
  type TimelineFlameChartEntry,
} from './TimelineFlameChartDataProvider.js';
import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  gpu: 'GPU',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/GPUTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class GPUTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'GPU';

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
   * GPU track.
   * @param currentLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(currentLevel: number, expanded?: boolean|undefined): number {
    if (this.#traceParsedData.GPU.mainGPUThreadTasks.length === 0) {
      return currentLevel;
    }
    this.#appendTrackHeaderAtLevel(currentLevel, expanded);
    return this.#appendGPUsAtLevel(currentLevel);
  }

  /**
   * Adds into the flame chart data the header corresponding to the
   * GPU track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   * @param expanded wether the track should be rendered expanded.
   */
  #appendTrackHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const style = buildGroupStyle({shareHeaderLine: false});
    const group = buildTrackHeader(
        currentLevel, i18nString(UIStrings.gpu), style, /* selectable= */ true, expanded, this.#legacyTrack);
    this.#flameChartData.groups.push(group);
  }

  /**
   * Adds into the flame chart data the trace events corresponding to
   * user GPU Tasks. These are taken straight from the GPU handler.
   * @param trackStartLevel the flame chart level from which GPU events will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * GPU tasks (the first available level to append next track).
   */
  #appendGPUsAtLevel(trackStartLevel: number): number {
    const gpuEvents = this.#traceParsedData.GPU.mainGPUThreadTasks;

    const openEvents = [];
    let maxStackDepth = 0;
    for (let i = 0; i < gpuEvents.length; ++i) {
      const event = gpuEvents[i];
      while (openEvents.length) {
        const lastOpenEvent = openEvents[openEvents.length - 1];
        const lastOpenEventEndTime = lastOpenEvent.ts + (lastOpenEvent.dur || 0);
        if (lastOpenEventEndTime <= event.ts) {
          openEvents.pop();
        } else {
          break;
        }
      }

      const level = trackStartLevel + openEvents.length;
      this.#appendEventAtLevel(event, level);

      maxStackDepth = Math.max(maxStackDepth, openEvents.length + 1);
      openEvents.push(event);
    }

    this.#legacyEntryTypeByLevel.length = trackStartLevel + maxStackDepth;
    this.#legacyEntryTypeByLevel.fill(EntryType.TrackAppender, trackStartLevel);
    return trackStartLevel + maxStackDepth;
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
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (!TraceEngine.Types.TraceEvents.isTraceEventGPUTask(event)) {
      throw new Error(`Unexpected GPU Task: The event's type is '${event.name}'`);
    }
    return 'hsl(109, 33%, 55%)';
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (TraceEngine.Types.TraceEvents.isTraceEventGPUTask(event)) {
      return 'GPU';
    }
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
