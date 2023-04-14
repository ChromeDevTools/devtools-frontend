// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';

/**
 * Builds the style for the group.
 * Each group has a predefined style and a reference to the definition of the legacy track (which should be removed in the future).
 * @param extra the customized fields with value.
 * @returns the built GroupStyle
 */
export function buildGroupStyle(extra: Object): PerfUI.FlameChart.GroupStyle {
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
 * @param style the flame chart level at which the track header is appended.
 * @param selectable it the track is selectable.
 * @param expanded if the track is expanded.
 * @param track this is set only when `selectable` is true, and it is used for `updateSelectedGroup`.
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
