// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';

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

/**
 * Builds the style for the group.
 * Each group has a predefined style and a reference to the definition of the legacy track (which should be removed in the future).
 * @param extra the customized fields with value.
 * @returns the built GroupStyle
 */
export function buildGroupStyle(extra?: Object): PerfUI.FlameChart.GroupStyle {
  const defaultGroupStyle = {
    padding: 4,
    height: 17,
    collapsible: true,
    color: ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary'),
    backgroundColor: ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background'),
    nestingLevel: 0,
    shareHeaderLine: true,
  };
  return Object.assign(defaultGroupStyle, extra);
}

/**
 * Builds the header corresponding to the track. A header is added in the shape of a group in the flame chart data.
 * @param startLevel the flame chart level at which the track header is appended.
 * @param name the display name of the track.
 * @param style the GroupStyle for the track header.
 * @param selectable if the track is selectable.
 * @param expanded if the track is expanded.
 * @param track this is set only when `selectable` is true, and it is used for selecting a track in the details panel.
 * @returns the group that built from the give data
 */
export function buildTrackHeader(
    startLevel: number, name: string, style: PerfUI.FlameChart.GroupStyle, selectable: boolean, expanded?: boolean,
    track?: TimelineModel.TimelineModel.Track|null): PerfUI.FlameChart.Group {
  const group = ({startLevel, name, style, selectable, expanded} as PerfUI.FlameChart.Group);
  if (selectable && track) {
    group.track = track;
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
    totalTime?: TraceEngine.Types.Timing.MicroSeconds, selfTime?: TraceEngine.Types.Timing.MicroSeconds): string {
  const formattedTotalTime =
      TraceEngine.Helpers.Timing.microSecondsToMilliseconds((totalTime || 0) as TraceEngine.Types.Timing.MicroSeconds);
  if (formattedTotalTime === TraceEngine.Types.Timing.MilliSeconds(0)) {
    return '';
  }

  const formattedSelfTime =
      TraceEngine.Helpers.Timing.microSecondsToMilliseconds((selfTime || 0) as TraceEngine.Types.Timing.MicroSeconds);
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
