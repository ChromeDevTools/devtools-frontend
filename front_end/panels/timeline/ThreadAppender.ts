// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as TraceEngine from '../../models/trace/trace.js';

import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  type HighlightedEntryInfo,
  type TrackAppender,
  type TrackAppenderName,
} from './CompatibilityTracksAppender.js';
import {DEFAULT_CATEGORY_STYLES_PALETTE, EventStyles} from './EventUICategory.js';

const UIStrings = {
  /**
   * @description Refers to the "Main frame", meaning the top level frame. See https://www.w3.org/TR/html401/present/frames.html
   * @example{example.com} PH1
   */
  mainS: 'Main — {PH1}',
  /**
   * @description Refers to any frame in the page. See https://www.w3.org/TR/html401/present/frames.html
   * @example {https://example.com} PH1
   */
  frameS: 'Frame — {PH1}',
  /**
   *@description Text for the name of anonymous functions
   */
  anonymous: '(anonymous)',
  /**
   *@description A generic name given for a thread running in the browser (sequence of programmed instructions).
   * The placeholder is an enumeration given to the thread.
   *@example {1} PH1
   */
  threadS: 'Thread {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/ThreadAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const enum ThreadType {
  MAIN_THREAD = 'MAIN_THREAD',
  WORKER = 'WORKER',
  RASTERIZER = 'RASTERIZER',
  OTHER = 'OTHER',
}

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
  #threadDefaultName: string;
  readonly threadType: ThreadType = ThreadType.MAIN_THREAD;
  readonly isOnMainFrame: boolean;
  constructor(
      compatibilityBuilder: CompatibilityTracksAppender,
      traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData,
      processId: TraceEngine.Types.TraceEvents.ProcessID, threadId: TraceEngine.Types.TraceEvents.ThreadID,
      threadName: string|null, type: ThreadType) {
    this.#compatibilityBuilder = compatibilityBuilder;
    // TODO(crbug.com/1456706):
    // The values for this color generator have been taken from the old
    // engine to keep the colors the same after the migration. This
    // generator is used here to create colors for js frames (profile
    // calls) in the flamechart by hashing the script's url. We might
    // need to reconsider this generator when migrating to GM3 colors.
    this.#colorGenerator =
        new Common.Color.Generator({min: 30, max: 330, count: undefined}, {min: 50, max: 80, count: 3}, 85);
    // Add a default color for call frames with no url.
    this.#colorGenerator.setColorForID('', '#f2ecdc');
    this.#traceParsedData = traceParsedData;
    this.#processId = processId;
    const entries = this.#traceParsedData.Renderer?.processes.get(processId)?.threads?.get(threadId)?.entries;
    if (!entries) {
      throw new Error(`Could not find data for thread with id ${threadId} in process with id ${processId}`);
    }
    this.#entries = entries;
    this.#threadDefaultName = threadName || i18nString(UIStrings.threadS, {PH1: threadId});
    this.isOnMainFrame = Boolean(this.#traceParsedData.Renderer?.processes.get(processId)?.isOnMainFrame);
    this.threadType = type;
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

    const url = this.#traceParsedData.Renderer?.processes.get(this.#processId)?.url || '';
    // This UI string doesn't yet use the i18n API because it is not
    // shown in production, only in the component server, reason being
    // it is not ready to be shipped.
    // TODO(crbug.com/1428024) Once the UI has been, use the i18n API.
    const newEnginePrefix = '[RPP] ';
    let name = newEnginePrefix;
    let trackNameName: string|null = null;

    if (this.threadType === ThreadType.MAIN_THREAD) {
      trackNameName =
          this.isOnMainFrame ? i18nString(UIStrings.mainS, {PH1: url}) : i18nString(UIStrings.frameS, {PH1: url});
    }
    name += trackNameName || this.#threadDefaultName;
    const group = buildTrackHeader(currentLevel, name, style, /* selectable= */ true, expanded);
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
    if (TraceEngine.Types.TraceEvents.isProfileCall(event)) {
      if (event.callFrame.scriptId === '0') {
        // If we can not match this frame to a script, return the
        // generic "scripting" color.
        return DEFAULT_CATEGORY_STYLES_PALETTE.Scripting.color;
      }
      // Otherwise, return a color created based on its URL.
      return this.#colorGenerator.colorForID(event.callFrame.url);
    }
    const idForColorGeneration = this.titleForEvent(event);
    const defaultColor =
        EventStyles.get(event.name as TraceEngine.Types.TraceEvents.KnownEventName)?.categoryStyle.color;
    return defaultColor || this.#colorGenerator.colorForID(idForColorGeneration);
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (TraceEngine.Types.TraceEvents.isProfileCall(event)) {
      return event.callFrame.functionName || i18nString(UIStrings.anonymous);
    }
    const defaultName = EventStyles.get(event.name as TraceEngine.Types.TraceEvents.KnownEventName)?.label();
    return defaultName || event.name;
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
