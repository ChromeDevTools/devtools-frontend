// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import {buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  type HighlightedEntryInfo,
  type TrackAppender,
  type TrackAppenderName,
} from './CompatibilityTracksAppender.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  interactions: 'Interactions',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/InteractionsTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class InteractionsTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Interactions';

  #colorGenerator: Common.Color.Generator;
  #compatibilityBuilder: CompatibilityTracksAppender;
  #traceParsedData: Readonly<TraceEngine.Handlers.Types.TraceParseData>;

  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, traceParsedData: TraceEngine.Handlers.Types.TraceParseData,
      colorGenerator: Common.Color.Generator) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#colorGenerator = colorGenerator;
    this.#traceParsedData = traceParsedData;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * interactions track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number {
    if (this.#traceParsedData.UserInteractions.interactionEvents.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendInteractionsAtLevel(trackStartLevel);
  }

  /**
   * Adds into the flame chart data the header corresponding to the
   * interactions track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const trackIsCollapsible = this.#traceParsedData.UserInteractions.interactionEvents.length > 0;
    const style = buildGroupStyle({shareHeaderLine: false, collapsible: trackIsCollapsible});
    const group =
        buildTrackHeader(currentLevel, i18nString(UIStrings.interactions), style, /* selectable= */ true, expanded);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  /**
   * Adds into the flame chart data the trace events dispatched by the
   * performance.measure API. These events are taken from the UserInteractions
   * handler.
   * @param currentLevel the flame chart level from which interactions will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * interactions (the first available level to append more data).
   */
  #appendInteractionsAtLevel(trackStartLevel: number): number {
    const {interactionEventsWithNoNesting, interactionsOverThreshold} = this.#traceParsedData.UserInteractions;

    const addCandyStripeToLongInteraction =
        (event: TraceEngine.Types.TraceEvents.SyntheticInteractionPair, index: number): void => {
          // Each interaction that we drew that is over the INP threshold needs to be
          // candy-striped.
          const overThreshold = interactionsOverThreshold.has(event);
          if (!overThreshold) {
            return;
          }
          if (index !== undefined) {
            this.#addCandyStripeAndWarningForLongInteraction(event, index);
          }
        };
    // Render all top level interactions (see UserInteractionsHandler for an explanation on the nesting) onto the track.
    const newLevel = this.#compatibilityBuilder.appendEventsAtLevel(
        interactionEventsWithNoNesting, trackStartLevel, this, addCandyStripeToLongInteraction);

    return newLevel;
  }

  #addCandyStripeAndWarningForLongInteraction(
      entry: TraceEngine.Types.TraceEvents.SyntheticInteractionPair, eventIndex: number): void {
    const decorationsForEvent =
        this.#compatibilityBuilder.getFlameChartTimelineData().entryDecorations[eventIndex] || [];
    decorationsForEvent.push(
        {
          type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
          startAtTime: TraceEngine.Handlers.ModelHandlers.UserInteractions.LONG_INTERACTION_THRESHOLD,
          // Interaction events have whiskers, so we do not want to candy stripe
          // the entire duration. The box represents processing time, so we only
          // candystripe up to the end of processing.
          endAtTime: entry.processingEnd,
        },
        {
          type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE,
          customEndTime: entry.processingEnd,
        });
    this.#compatibilityBuilder.getFlameChartTimelineData().entryDecorations[eventIndex] = decorationsForEvent;
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
    let idForColorGeneration = this.titleForEvent(event);
    if (TraceEngine.Types.TraceEvents.isSyntheticInteractionEvent(event)) {
      // Append the ID so that we vary the colours, ensuring that two events of
      // the same type are coloured differently.
      idForColorGeneration += event.interactionId;
    }
    return this.#colorGenerator.colorForID(idForColorGeneration);
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (TraceEngine.Types.TraceEvents.isSyntheticInteractionEvent(event)) {
      return titleForInteractionEvent(event);
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

/**
 * Return the title to use for a given interaction event.
 * Exported so the title in the DetailsView can re-use the same logic
 **/
export function titleForInteractionEvent(event: TraceEngine.Types.TraceEvents.SyntheticInteractionPair): string {
  const category = TraceEngine.Handlers.ModelHandlers.UserInteractions.categoryOfInteraction(event);
  // Because we hide nested interactions, we do not want to show the
  // specific type of the interaction that was not hidden, so instead we
  // show just the category of that interaction.
  if (category === 'OTHER') {
    return 'Other';
  }
  if (category === 'KEYBOARD') {
    return 'Keyboard';
  }
  if (category === 'POINTER') {
    return 'Pointer';
  }
  return event.type;
}
