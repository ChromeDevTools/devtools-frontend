// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {
  InsightCategory,
  InsightKeys,
  type InsightModel,
  type InsightSetContext,
  type PartialInsightModel,
} from './types.js';

export const UIStrings = {
  /** Title of an insight that provides details about the fonts used on the page, and the value of their `font-display` properties. */
  title: 'Font display',
  /**
   * @description Text to tell the user about the font-display CSS feature to help improve a the UX of a page.
   */
  description:
      'Consider setting [`font-display`](https://developer.chrome.com/blog/font-display) to `swap` or `optional` to ensure text is consistently visible. `swap` can be further optimized to mitigate layout shifts with [font metric overrides](https://developer.chrome.com/blog/font-fallbacks).',
  /** Column for a font loaded by the page to render text. */
  fontColumn: 'Font',
  /** Column for the amount of time wasted. */
  wastedTimeColumn: 'Wasted time',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/FontDisplay.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface RemoteFont {
  name?: string;
  request: Types.Events.SyntheticNetworkRequest;
  display: string;
  wastedTime: Types.Timing.Milli;
}

export type FontDisplayInsightModel = InsightModel<typeof UIStrings, {
  fonts: RemoteFont[],
}>;

function finalize(partialModel: PartialInsightModel<FontDisplayInsightModel>): FontDisplayInsightModel {
  return {
    insightKey: InsightKeys.FONT_DISPLAY,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.INP,
    state: partialModel.fonts.find(font => font.wastedTime > 0) ? 'fail' : 'pass',
    ...partialModel,
  };
}

export function generateInsight(
    parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): FontDisplayInsightModel {
  const fonts: RemoteFont[] = [];
  for (const remoteFont of parsedTrace.LayoutShifts.remoteFonts) {
    const event = remoteFont.beginRemoteFontLoadEvent;
    if (!Helpers.Timing.eventIsInBounds(event, context.bounds)) {
      continue;
    }

    const requestId = `${event.pid}.${event.args.id}`;
    const request = parsedTrace.NetworkRequests.byId.get(requestId);
    if (!request) {
      continue;
    }

    if (!/^(block|fallback|auto)$/.test(remoteFont.display)) {
      continue;
    }

    const wastedTimeMicro =
        Types.Timing.Micro(request.args.data.syntheticData.finishTime - request.args.data.syntheticData.sendStartTime);
    // TODO(crbug.com/352244504): should really end at the time of the next Commit trace event.
    let wastedTime =
        Platform.NumberUtilities.floor(Helpers.Timing.microToMilli(wastedTimeMicro), 1 / 5) as Types.Timing.Milli;
    if (wastedTime === 0) {
      continue;
    }

    // All browsers wait for no more than 3s.
    wastedTime = Math.min(wastedTime, 3000) as Types.Timing.Milli;

    fonts.push({
      name: remoteFont.name,
      request,
      display: remoteFont.display,
      wastedTime,
    });
  }

  fonts.sort((a, b) => b.wastedTime - a.wastedTime);

  const savings = Math.max(...fonts.map(f => f.wastedTime)) as Types.Timing.Milli;

  return finalize({
    relatedEvents: fonts.map(f => f.request),
    fonts,
    metricSavings: {FCP: savings},
  });
}

export function createOverlays(model: FontDisplayInsightModel): Types.Overlays.Overlay[] {
  return model.fonts.map(font => ({
                           type: 'ENTRY_OUTLINE',
                           entry: font.request,
                           outlineReason: font.wastedTime ? 'ERROR' : 'INFO',
                         }));
}
