// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Extras from '../extras/extras.js';
import * as Helpers from '../helpers/helpers.js';

import {
  InsightCategory,
  type InsightModel,
  type InsightSetContext,
  type PartialInsightModel,
  type RequiredData
} from './types.js';

export const UIStrings = {
  /**
   * @description Title of an insight that identifies multiple copies of the same JavaScript sources, and recommends removing the duplication.
   */
  title: 'Duplicate JavaScript',
  /**
   * @description Description of an insight that identifies multiple copies of the same JavaScript sources, and recommends removing the duplication.
   */
  description:
      'Remove large, duplicate JavaScript modules from bundles to reduce unnecessary bytes consumed by network activity.',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/DuplicateJavaScript.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type DuplicateJavaScriptInsightModel = InsightModel<typeof UIStrings, {
  duplication: Extras.ScriptDuplication.ScriptDuplication,
}>;

export function deps(): ['Scripts', 'NetworkRequests'] {
  return ['Scripts', 'NetworkRequests'];
}

function finalize(partialModel: PartialInsightModel<DuplicateJavaScriptInsightModel>): DuplicateJavaScriptInsightModel {
  return {
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    state: Boolean(partialModel.duplication.values().next().value) ? 'fail' : 'pass',
    // TODO(cjamcl): script network events.
    // relatedEvents: [],
    ...partialModel,
  };
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): DuplicateJavaScriptInsightModel {
  const scriptEntries = [...parsedTrace.Scripts.scripts].filter(([_, script]) => {
    if (!context.navigation) {
      return false;
    }

    if (script.frame !== context.frameId) {
      return false;
    }

    return Helpers.Timing.timestampIsInBounds(context.bounds, script.ts);
  });

  const duplication = Extras.ScriptDuplication.computeScriptDuplication({scripts: new Map(scriptEntries)});
  return finalize({duplication});
}
