// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceModel from '../trace.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {traceData, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: traceData, insights};
}

describe('InteractionToNextPaint', function() {
  const test = (traceFile: string, longest?: number, highPercentile?: number) => {
    if (highPercentile === undefined) {
      highPercentile = longest;
    }

    it(`process ${traceFile}`, async () => {
      const {data} = await processTrace(this, traceFile);

      // TODO(crbug.com/313905799): The traces don't all have navigations, and currently #computeInsights
      // doesn't account for analyzing stuff outside a navigation bound. So instead of this ...
      //      const insight = getInsight(insights, data.Meta.navigationsByNavigationId.keys().next().value);
      // we manually run the insight.
      const insight = TraceModel.Insights.InsightRunners.InteractionToNextPaint.generateInsight(data, {
        frameId: data.Meta.mainFrameId,
        navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
      });
      assert.strictEqual(insight.longestInteractionEvent?.dur, longest);
      assert.strictEqual(insight.highPercentileInteractionEvent?.dur, highPercentile);
    });
  };

  test('lcp-images.json.gz', undefined);
  test('slow-interaction-keydown.json.gz', 163609);
  test('nested-interactions.json.gz', 23370);
  test('slow-interaction-button-click.json.gz', 139238);
});
