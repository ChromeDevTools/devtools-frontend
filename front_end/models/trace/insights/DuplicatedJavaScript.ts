// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Extras from '../extras/extras.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {estimateCompressionRatioForScript, metricSavingsForWastedBytes} from './Common.js';
import {
  InsightCategory,
  InsightKeys,
  type InsightModel,
  type InsightSetContext,
  type PartialInsightModel,
} from './types.js';

export const UIStrings = {
  /**
   * @description Title of an insight that identifies multiple copies of the same JavaScript sources, and recommends removing the duplication.
   */
  title: 'Duplicated JavaScript',
  /**
   * @description Description of an insight that identifies multiple copies of the same JavaScript sources, and recommends removing the duplication.
   */
  description:
      'Remove large, duplicate JavaScript modules from bundles to reduce unnecessary bytes consumed by network activity.',
  /** Label for a column in a data table; entries will be the locations of JavaScript or CSS code, e.g. the name of a Javascript package or module. */
  columnSource: 'Source',
  /** Label for a column in a data table; entries will be the number of wasted bytes due to duplication of a web resource. */
  columnDuplicatedBytes: 'Duplicated bytes',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/DuplicatedJavaScript.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type DuplicatedJavaScriptInsightModel = InsightModel<typeof UIStrings, {
  duplication: Extras.ScriptDuplication.ScriptDuplication,
  duplicationGroupedByNodeModules: Extras.ScriptDuplication.ScriptDuplication,
  scriptsWithDuplication: Handlers.ModelHandlers.Scripts.Script[],
  scripts: Handlers.ModelHandlers.Scripts.Script[],
  mainDocumentUrl: string,
}>;

function finalize(partialModel: PartialInsightModel<DuplicatedJavaScriptInsightModel>):
    DuplicatedJavaScriptInsightModel {
  const requests = partialModel.scriptsWithDuplication.map(script => script.request).filter(e => !!e);

  return {
    insightKey: InsightKeys.DUPLICATE_JAVASCRIPT,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    state: Boolean(partialModel.duplication.values().next().value) ? 'fail' : 'pass',
    relatedEvents: [...new Set(requests)],
    ...partialModel,
  };
}

export function isDuplicatedJavaScript(model: InsightModel): model is DuplicatedJavaScriptInsightModel {
  return model.insightKey === InsightKeys.DUPLICATE_JAVASCRIPT;
}

export function generateInsight(
    parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): DuplicatedJavaScriptInsightModel {
  const scripts = parsedTrace.Scripts.scripts.filter(script => {
    if (script.frame !== context.frameId) {
      return false;
    }

    if (script.url?.startsWith('chrome-extension://')) {
      return false;
    }

    return Helpers.Timing.timestampIsInBounds(context.bounds, script.ts);
  });

  const compressionRatios = new Map<string, number>();
  for (const script of scripts) {
    if (script.request) {
      compressionRatios.set(script.request.args.data.requestId, estimateCompressionRatioForScript(script));
    }
  }

  const {duplication, duplicationGroupedByNodeModules} =
      Extras.ScriptDuplication.computeScriptDuplication({scripts}, compressionRatios);
  const scriptsWithDuplication = [...duplication.values().flatMap(data => data.duplicates.map(d => d.script))];

  const wastedBytesByRequestId = new Map<string, number>();
  for (const {duplicates} of duplication.values()) {
    for (let i = 1; i < duplicates.length; i++) {
      const sourceData = duplicates[i];
      if (!sourceData.script.request) {
        continue;
      }

      const transferSize = sourceData.attributedSize;
      const requestId = sourceData.script.request.args.data.requestId;
      wastedBytesByRequestId.set(requestId, (wastedBytesByRequestId.get(requestId) || 0) + transferSize);
    }
  }

  return finalize({
    duplication,
    duplicationGroupedByNodeModules,
    scriptsWithDuplication: [...new Set(scriptsWithDuplication)],
    scripts,
    mainDocumentUrl: context.navigation?.args.data?.url ?? parsedTrace.Meta.mainFrameURL,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: wastedBytesByRequestId.values().reduce((acc, cur) => acc + cur, 0),
  });
}

export function createOverlays(model: DuplicatedJavaScriptInsightModel): Types.Overlays.Overlay[] {
  return model.scriptsWithDuplication.map(script => script.request).filter(e => !!e).map(request => {
    return {
      type: 'ENTRY_OUTLINE',
      entry: request,
      outlineReason: 'ERROR',
    };
  });
}
