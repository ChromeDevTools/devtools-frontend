// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TraceEngine from '../../models/trace/trace.js';

import {
  type CompatibilityTracksAppender,
  type TrackAppender,
  type HighlightedEntryInfo,
  type TrackAppenderName,
} from './CompatibilityTracksAppender.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Common from '../../core/common/common.js';
import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  thread: 'Main Thread by new engine',

  /**
   *@description Text for the name of anonymous functions
   */
  anonymous: '(anonymous)',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/ThreadAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// This appender is only triggered when the Renderer handler is run. At
// the moment this only happens in the basic component server example.
// In the future, once this appender fully supports the behaviour of the
// old engine's thread/sync tracks we can always run it by enabling the
// Renderer and Samples handler by default.
export class ThreadAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Thread';

  #colorGenerator: Common.Color.Generator;
  #compatibilityBuilder: CompatibilityTracksAppender;
  #traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData;

  #entries: TraceEngine.Types.TraceEvents.TraceEventData[] = [];
  #processId: TraceEngine.Types.TraceEvents.ProcessID;
  constructor(
      compatibilityBuilder: CompatibilityTracksAppender,
      traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData, colorGenerator: Common.Color.Generator,
      processId: TraceEngine.Types.TraceEvents.ProcessID, threadId: TraceEngine.Types.TraceEvents.ThreadID) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = colorGenerator;
    this.#traceParsedData = traceParsedData;
    this.#processId = processId;
    const entries = this.#traceParsedData.Renderer?.processes.get(processId)?.threads?.get(threadId)?.entries;
    if (!entries) {
      throw new Error(`Could not find data for thread with id ${threadId} in process with id ${processId}`);
    }
    this.#entries = entries;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * this thread.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number {
    if (this.#entries.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendThreadEntriesAtLevel(trackStartLevel);
  }

  /**
   * Adds into the flame chart data the header corresponding to this
   * thread. A header is added in the shape of a group in the flame
   * chart data. A group has a predefined style and a reference to the
   * definition of the legacy track (which should be removed in the
   * future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const trackIsCollapsible = this.#entries.length > 0;
    const style = buildGroupStyle({shareHeaderLine: false, collapsible: trackIsCollapsible});

    const name = this.#traceParsedData.Renderer?.processes.get(this.#processId)?.url || '';

    const group = buildTrackHeader(
        currentLevel, i18nString(UIStrings.thread) + ' ' + name, style, /* selectable= */ true, expanded);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  /**
   * Adds into the flame chart data the entries of this thread, which
   * includes trace events and JS calls.
   * @param currentLevel the flame chart level from which entries will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * entries (the first available level to append more data).
   */
  #appendThreadEntriesAtLevel(trackStartLevel: number): number {
    return this.#compatibilityBuilder.appendEventsAtLevel(this.#entries, trackStartLevel, this);
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
    const idForColorGeneration = this.titleForEvent(event);
    return this.#colorGenerator.colorForID(idForColorGeneration);
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (TraceEngine.Types.TraceEvents.isProfileCall(event)) {
      return event.callFrame.functionName || i18nString(UIStrings.anonymous);
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
