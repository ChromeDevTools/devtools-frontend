// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type {SyntheticInteractionPair} from '../types/TraceEvents.js';
import type * as Types from '../types/types.js';

import {
  InsightCategory,
  InsightKeys,
  type InsightModel,
  type InsightSetContext,
  type PartialInsightModel,
} from './types.js';

export const UIStrings = {
  /**
   * @description Text to tell the user about the longest user interaction.
   */
  description:
      'Start investigating with the longest subpart. [Delays can be minimized](https://web.dev/articles/optimize-inp#optimize_interactions). To reduce processing duration, [optimize the main-thread costs](https://web.dev/articles/optimize-long-tasks), often JS.',
  /**
   * @description Title for the performance insight "INP breakdown", which shows a breakdown of INP by subparts / sections.
   */
  title: 'INP breakdown',
  /**
   * @description Label used for the subpart/component/stage/section of a larger duration.
   */
  subpart: 'Subpart',
  /**
   * @description Label used for a time duration.
   */
  duration: 'Duration',

  // TODO: these are repeated in InteractionBreakdown. Add a place for common strings?
  /**
   * @description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: 'Input delay',
  /**
   * @description Text shown next to the interaction event's thread processing duration in the detail view.
   */
  processingDuration: 'Processing duration',
  /**
   * @description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: 'Presentation delay',
  /**
   * @description Text status indicating that no user interactions were detected.
   */
  noInteractions: 'No interactions detected',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/INPBreakdown.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type INPBreakdownInsightModel = InsightModel<typeof UIStrings, {
  longestInteractionEvent?: SyntheticInteractionPair,
  highPercentileInteractionEvent?: SyntheticInteractionPair,
}>;

export function isINPBreakdown(insight: InsightModel): insight is INPBreakdownInsightModel {
  return insight.insightKey === InsightKeys.INP_BREAKDOWN;
}

function finalize(partialModel: PartialInsightModel<INPBreakdownInsightModel>): INPBreakdownInsightModel {
  return {
    insightKey: InsightKeys.INP_BREAKDOWN,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.INP,
    state: partialModel.longestInteractionEvent ? 'informative' : 'pass',
    ...partialModel,
  };
}

export function generateInsight(
    parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): INPBreakdownInsightModel {
  const interactionEvents = parsedTrace.UserInteractions.interactionEventsWithNoNesting.filter(event => {
    return Helpers.Timing.eventIsInBounds(event, context.bounds);
  });

  if (!interactionEvents.length) {
    // A valid result, when there is no user interaction.
    return finalize({});
  }

  const longestByInteractionId = new Map<number, SyntheticInteractionPair>();
  for (const event of interactionEvents) {
    const key = event.interactionId;
    const longest = longestByInteractionId.get(key);
    if (!longest || event.dur > longest.dur) {
      longestByInteractionId.set(key, event);
    }
  }
  const normalizedInteractionEvents = [...longestByInteractionId.values()];
  normalizedInteractionEvents.sort((a, b) => b.dur - a.dur);

  // INP is the "nearest-rank"/inverted_cdf 98th percentile, except Chrome only
  // keeps the 10 worst events around, so it can never be more than the 10th from
  // last array element. To keep things simpler, sort desc and pick from front.
  // See https://source.chromium.org/chromium/chromium/src/+/main:components/page_load_metrics/browser/responsiveness_metrics_normalization.cc;l=45-59;drc=cb0f9c8b559d9c7c3cb4ca94fc1118cc015d38ad
  const highPercentileIndex = Math.min(9, Math.floor(normalizedInteractionEvents.length / 50));

  return finalize({
    relatedEvents: [normalizedInteractionEvents[0]],
    longestInteractionEvent: normalizedInteractionEvents[0],
    highPercentileInteractionEvent: normalizedInteractionEvents[highPercentileIndex],
  });
}

/**
 * If `subpart` is -1, then all subparts are included. Otherwise it's just that index.
 **/
export function createOverlaysForSubpart(
    event: Types.Events.SyntheticInteractionPair, subpartIndex = -1): Types.Overlays.Overlay[] {
  const p1 = Helpers.Timing.traceWindowFromMicroSeconds(
      event.ts,
      (event.ts + event.inputDelay) as Types.Timing.Micro,
  );
  const p2 = Helpers.Timing.traceWindowFromMicroSeconds(
      p1.max,
      (p1.max + event.mainThreadHandling) as Types.Timing.Micro,
  );
  const p3 = Helpers.Timing.traceWindowFromMicroSeconds(
      p2.max,
      (p2.max + event.presentationDelay) as Types.Timing.Micro,
  );
  let sections = [
    {bounds: p1, label: i18nString(UIStrings.inputDelay), showDuration: true},
    {bounds: p2, label: i18nString(UIStrings.processingDuration), showDuration: true},
    {bounds: p3, label: i18nString(UIStrings.presentationDelay), showDuration: true},
  ];
  if (subpartIndex !== -1) {
    sections = [sections[subpartIndex]];
  }

  return [
    {
      type: 'TIMESPAN_BREAKDOWN',
      sections,
      renderLocation: 'BELOW_EVENT',
      entry: event,
    },
  ];
}

export function createOverlays(model: INPBreakdownInsightModel): Types.Overlays.Overlay[] {
  const event = model.longestInteractionEvent;
  if (!event) {
    return [];
  }

  return createOverlaysForSubpart(event);
}
