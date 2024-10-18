// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import type {VisualLoggingTrackName} from './CompatibilityTracksAppender.js';

const UIStrings = {
  /**
   * @description Text in the Performance panel to show how long was spent in a particular part of the code.
   * The first placeholder is the total time taken for this node and all children, the second is the self time
   * (time taken in this node, without children included).
   *@example {10ms} PH1
   *@example {10ms} PH2
   */
  sSelfS: '{PH1} (self {PH2})',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/AppenderUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/** An array, indexed by entry levels, where the values are the last timestamp (typically `endTime`) of data within that level. */
export type LastTimestampByLevel = number[];

/**
 * Builds the style for the group.
 * Each group has a predefined style and a reference to the definition of the legacy track (which should be removed in the future).
 * @param extra the customized fields with value.
 * @returns the built GroupStyle
 */
export function buildGroupStyle(extra?: Partial<PerfUI.FlameChart.GroupStyle>): PerfUI.FlameChart.GroupStyle {
  const defaultGroupStyle: PerfUI.FlameChart.GroupStyle = {
    padding: 4,
    height: 17,
    collapsible: true,
    color: ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface'),
    backgroundColor: ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container'),
    nestingLevel: 0,
    shareHeaderLine: true,
  };
  return Object.assign(defaultGroupStyle, extra);
}

/**
 * Builds the header corresponding to the track. A header is added in the shape of a group in the flame chart data.
 * @param jslogContext the text that will be set as the logging context
 *                          for the Visual Elements logging framework. Pass
 *                          `null` to not set a context and consequently
 *                          cause this group not to be logged.
 * @param startLevel the flame chart level at which the track header is appended.
 * @param name the display name of the track.
 * @param style the GroupStyle for the track header.
 * @param selectable if the track is selectable.
 * @param expanded if the track is expanded.
 * @param track this is set only when `selectable` is true, and it is used for selecting a track in the details panel.
 * @param showStackContextMenu whether menu with options to merge/collapse entries in track is shown.
 * @returns the group that built from the give data
 */
export function buildTrackHeader(
    jslogContext: VisualLoggingTrackName|null, startLevel: number, name: string, style: PerfUI.FlameChart.GroupStyle,
    selectable: boolean, expanded?: boolean, showStackContextMenu?: boolean): PerfUI.FlameChart.Group {
  const group: PerfUI.FlameChart.Group = {
    startLevel,
    name: name as Common.UIString.LocalizedString,
    style,
    selectable,
    expanded,
    showStackContextMenu,
  };
  if (jslogContext !== null) {
    group.jslogContext = jslogContext;
  }
  return group;
}

/**
 * Returns the time info shown when an event is hovered in the timeline.
 * @param totalTime the total time of the hovered event.
 * @param selfTime the self time of the hovered event.
 * @returns the formatted time string for highlightedEntryInfo
 */
export function getFormattedTime(
    totalTime?: Trace.Types.Timing.MicroSeconds, selfTime?: Trace.Types.Timing.MicroSeconds): string {
  const formattedTotalTime =
      Trace.Helpers.Timing.microSecondsToMilliseconds((totalTime || 0) as Trace.Types.Timing.MicroSeconds);
  if (formattedTotalTime === Trace.Types.Timing.MilliSeconds(0)) {
    return '';
  }

  const formattedSelfTime =
      Trace.Helpers.Timing.microSecondsToMilliseconds((selfTime || 0) as Trace.Types.Timing.MicroSeconds);
  const minSelfTimeSignificance = 1e-6;
  const formattedTime = Math.abs(formattedTotalTime - formattedSelfTime) > minSelfTimeSignificance &&
          formattedSelfTime > minSelfTimeSignificance ?
      i18nString(UIStrings.sSelfS, {
        PH1: i18n.TimeUtilities.millisToString(formattedTotalTime, true),
        PH2: i18n.TimeUtilities.millisToString(formattedSelfTime, true),
      }) :
      i18n.TimeUtilities.millisToString(formattedTotalTime, true);
  return formattedTime;
}

/**
 * Returns the first level that is available for an event.
 */
export function getEventLevel(event: Trace.Types.Events.Event, lastTimestampByLevel: LastTimestampByLevel): number {
  let level = 0;
  const startTime = event.ts;
  const endTime = event.ts + (event.dur || 0);
  // Look vertically for the first level where this event fits,
  // that is, where it wouldn't overlap with other events.
  while (level < lastTimestampByLevel.length && startTime < lastTimestampByLevel[level]) {
    // For each event, we look each level from top, and see if start timestamp of this
    // event is used by current level already. If yes, we will go to check next level.
    ++level;
  }
  lastTimestampByLevel[level] = endTime;
  return level;
}

export function addDecorationToEvent(
    timelineData: PerfUI.FlameChart.FlameChartTimelineData, eventIndex: number,
    decoration: PerfUI.FlameChart.FlameChartDecoration): void {
  const decorationsForEvent = timelineData.entryDecorations[eventIndex] || [];
  decorationsForEvent.push(decoration);
  timelineData.entryDecorations[eventIndex] = decorationsForEvent;
}
