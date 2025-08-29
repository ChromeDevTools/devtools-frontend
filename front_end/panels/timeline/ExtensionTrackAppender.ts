// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {buildGroupStyle, buildTrackHeader, getDurationString} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  type PopoverInfo,
  type TrackAppender,
  type TrackAppenderName,
  VisualLoggingTrackName,
} from './CompatibilityTracksAppender.js';
import * as Extensions from './extensions/extensions.js';

const UIStrings = {
  /**
   * @description The subtitle to show (by the side of the track name).
   */
  customTrackSubtitle: '— Custom',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/ExtensionTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ExtensionTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Extension';

  #extensionTopLevelTrack: Trace.Types.Extensions.ExtensionTrackData;
  #compatibilityBuilder: CompatibilityTracksAppender;
  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, extensionTracks: Trace.Types.Extensions.ExtensionTrackData) {
    this.#extensionTopLevelTrack = extensionTracks;
    this.#compatibilityBuilder = compatibilityBuilder;
  }

  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number {
    const totalEntryCount =
        Object.values(this.#extensionTopLevelTrack.entriesByTrack).reduce((prev, current) => current.length + prev, 0);
    if (totalEntryCount === 0) {
      return trackStartLevel;
    }
    this.#appendTopLevelHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendExtensionTrackData(trackStartLevel);
  }

  /**
   * Appends the top level header for a track. Extension entries can be
   * added to tracks or sub-tracks. In the former case, the top level
   * header corresponds to the track name, in the latter it corresponds
   * to the track group name.
   */
  #appendTopLevelHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const style = buildGroupStyle({shareHeaderLine: false, collapsible: true});
    const headerTitle = this.#extensionTopLevelTrack.name;
    const jsLogContext = this.#extensionTopLevelTrack.name === '🅰️ Angular' ? VisualLoggingTrackName.ANGULAR_TRACK :
                                                                             VisualLoggingTrackName.EXTENSION;
    const group = buildTrackHeader(
        jsLogContext, currentLevel, headerTitle, style,
        /* selectable= */ true, expanded);
    group.subtitle = i18nString(UIStrings.customTrackSubtitle);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  /**
   * Appends the second level header for a grouped track, which
   * corresponds to the track name itself, instead of the track name.
   */
  #appendSecondLevelHeader(trackStartLevel: number, headerTitle: string): void {
    const style = buildGroupStyle({shareHeaderLine: false, padding: 2, nestingLevel: 1, collapsible: true});
    const group = buildTrackHeader(
        VisualLoggingTrackName.EXTENSION, trackStartLevel, headerTitle, style,
        /* selectable= */ true);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  #appendExtensionTrackData(trackStartLevel: number): number {
    let currentStartLevel = trackStartLevel;
    for (const [trackName, entries] of Object.entries(this.#extensionTopLevelTrack.entriesByTrack)) {
      if (this.#extensionTopLevelTrack.isTrackGroup) {
        // Second level header is used for only sub-tracks.
        this.#appendSecondLevelHeader(currentStartLevel, trackName);
      }
      currentStartLevel = this.#compatibilityBuilder.appendEventsAtLevel(entries, currentStartLevel, this);
    }
    return currentStartLevel;
  }

  colorForEvent(event: Trace.Types.Events.Event): string {
    const defaultColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--app-color-rendering');
    if (!Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
      return defaultColor;
    }
    return Extensions.ExtensionUI.extensionEntryColor(event);
  }

  titleForEvent(event: Trace.Types.Events.Event): string {
    return event.name;
  }

  setPopoverInfo(event: Trace.Types.Events.Event, info: PopoverInfo): void {
    info.title = Trace.Types.Extensions.isSyntheticExtensionEntry(event) && event.args.tooltipText ?
        event.args.tooltipText :
        this.titleForEvent(event);
    info.formattedTime = getDurationString(event.dur);
  }
}
