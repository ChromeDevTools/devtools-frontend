// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Helpers from '../helpers/helpers.js';
import type {SyntheticInteractionPair} from '../types/TraceEvents.js';

import type {InsightModel, InsightSetContext, RequiredData} from './types.js';

const UIStrings = {
  /**
   * @description Text to tell the user about the longest user interaction.
   */
  description:
      'Start investigating with the longest phase. [Delays can be minimized](https://web.dev/articles/optimize-inp#optimize_interactions). To reduce processing duration, [optimize the main-thread costs](https://web.dev/articles/optimize-long-tasks), often JS.',
  /**
   * @description Title for the performance insight "INP by phase", which shows a breakdown of INP by phases / sections.
   */
  title: 'INP by phase',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/InteractionToNextPaint.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function deps(): ['UserInteractions'] {
  return ['UserInteractions'];
}

export type INPInsightModel = InsightModel<{
  longestInteractionEvent?: SyntheticInteractionPair,
  highPercentileInteractionEvent?: SyntheticInteractionPair,
}>;

function finalize(partialModel: Omit<INPInsightModel, 'title'|'description'>): INPInsightModel {
  return {title: i18nString(UIStrings.title), description: i18nString(UIStrings.description), ...partialModel};
}

export function generateInsight(parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): INPInsightModel {
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
