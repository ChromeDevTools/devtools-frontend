// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {
  InsightCategory,
  type InsightModel,
  type InsightSetContext,
  InsightWarning,
  type PartialInsightModel,
  type RequiredData,
} from './types.js';

export const UIStrings = {
  /** Title of an insight that provides details about if the page's viewport is optimized for mobile viewing. */
  title: 'Optimize viewport for mobile',
  /**
   * @description Text to tell the user how a viewport meta element can improve performance. \xa0 is a non-breaking space
   */
  description:
      'Tap interactions may be [delayed by up to 300\xA0ms](https://developer.chrome.com/blog/300ms-tap-delay-gone-away/) if the viewport is not optimized for mobile.',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/Viewport.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function deps(): ['Meta', 'UserInteractions'] {
  return ['Meta', 'UserInteractions'];
}

export type ViewportInsightModel = InsightModel<typeof UIStrings, {
  mobileOptimized: boolean | null,
  viewportEvent?: Types.Events.ParseMetaViewport,
}>;

function finalize(partialModel: PartialInsightModel<ViewportInsightModel>): ViewportInsightModel {
  return {
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.INP,
    state: partialModel.mobileOptimized === false ? 'fail' : 'pass',
    ...partialModel,
  };
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): ViewportInsightModel {
  const compositorEvents = parsedTrace.UserInteractions.beginCommitCompositorFrameEvents.filter(event => {
    if (event.args.frame !== context.frameId) {
      return false;
    }

    return Helpers.Timing.eventIsInBounds(event, context.bounds);
  });

  if (!compositorEvents.length) {
    // Trace doesn't have the data we need.
    return finalize({
      mobileOptimized: null,
      warnings: [InsightWarning.NO_LAYOUT],
    });
  }

  const viewportEvent = parsedTrace.UserInteractions.parseMetaViewportEvents.find(event => {
    if (event.args.data.frame !== context.frameId) {
      return false;
    }

    return Helpers.Timing.eventIsInBounds(event, context.bounds);
  });

  // Returns true only if all events are mobile optimized.
  for (const event of compositorEvents) {
    if (!event.args.is_mobile_optimized) {
      return finalize({
        mobileOptimized: false,
        viewportEvent,
        metricSavings: {INP: 300 as Types.Timing.Milli},
      });
    }
  }

  return finalize({
    mobileOptimized: true,
    viewportEvent,
  });
}
