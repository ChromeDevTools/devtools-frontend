// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import type * as TraceEngine from '../../models/trace/trace.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  type HighlightedEntryInfo,
  type TrackAppender,
  type TrackAppenderName,
  VisualLoggingTrackName,
} from './CompatibilityTracksAppender.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  serverTimingTrack:
      'This track contains timings taken from Server-Timing network response headers. Their respective start times are only estimated and may not be accurate.',
  /**
   * @description Server Side refers to activity happening in the server in the context of an HTTP request.
   * @example {origin} PH1
   */
  serverSideTrack: 'Server Timings — {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/ServerTimingsTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ServerTimingsTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'ServerTimings';

  #traceParsedData: Readonly<TraceEngine.Handlers.Types.TraceParseData>;
  #compatibilityBuilder: CompatibilityTracksAppender;
  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, traceParsedData: TraceEngine.Handlers.Types.TraceParseData) {
    this.#traceParsedData = traceParsedData;
    this.#compatibilityBuilder = compatibilityBuilder;
  }

  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number {
    if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_SERVER_TIMINGS)) {
      return trackStartLevel;
    }
    if (this.#traceParsedData.ServerTimings.serverTimings.length === 0) {
      return trackStartLevel;
    }
    let lastLevel = trackStartLevel;
    const serverTimingsByOrigin = Object.groupBy(
        this.#traceParsedData.ServerTimings.serverTimings, serverTiming => serverTiming.args.data.origin);
    for (const [origin, serverTimings] of Object.entries(serverTimingsByOrigin)) {
      if (!serverTimings || serverTimings.length === 0) {
        continue;
      }
      this.#appendTopLevelHeaderAtLevel(lastLevel, origin, expanded);
      lastLevel = this.#appendServerTimings(lastLevel, serverTimings);
    }
    return lastLevel;
  }

  /**
   * Appends the top level header for a track. Extension entries can be
   * added to tracks or sub-tracks. In the former case, the top level
   * header corresponds to the track name, in the latter it corresponds
   * to the track group name.
   */
  #appendTopLevelHeaderAtLevel(currentLevel: number, origin: string, expanded?: boolean): void {
    const style = buildGroupStyle({shareHeaderLine: false, collapsible: true});
    const headerTitle = i18nString(UIStrings.serverSideTrack, {PH1: origin});
    const group = buildTrackHeader(
        VisualLoggingTrackName.SERVER_TIMINGS, currentLevel, headerTitle, style,
        /* selectable= */ true, expanded);
    group.description = i18nString(UIStrings.serverTimingTrack);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  #appendServerTimings(trackStartLevel: number, serverTimings: TraceEngine.Types.TraceEvents.SyntheticServerTiming[]):
      number {
    let currentStartLevel = trackStartLevel;
    currentStartLevel = this.#compatibilityBuilder.appendEventsAtLevel(serverTimings, currentStartLevel, this);
    return currentStartLevel;
  }

  colorForEvent(): string {
    return ThemeSupport.ThemeSupport.instance().getComputedValue('--ref-palette-primary70');
  }

  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    return event.name;
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.TraceEventData): HighlightedEntryInfo {
    return {title: event.name, formattedTime: getFormattedTime(event.dur)};
  }
}
