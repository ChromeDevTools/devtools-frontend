// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createContextForNavigation, getFirst} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

describeWithEnvironment('InteractionToNextPaint', function() {
  const test = (traceFile: string, longest?: number, highPercentile?: number) => {
    if (highPercentile === undefined) {
      highPercentile = longest;
    }

    it(`process ${traceFile}`, async () => {
      const {data} = await processTrace(this, traceFile);
      const navigation = getFirst(data.Meta.navigationsByNavigationId.values());
      const context = navigation ? createContextForNavigation(data, navigation, data.Meta.mainFrameId) : {
        bounds: data.Meta.traceBounds,
        frameId: data.Meta.mainFrameId,
      };
      const insight = Trace.Insights.InsightRunners.InteractionToNextPaint.generateInsight(data, context);
      assert.strictEqual(insight.longestInteractionEvent?.dur, longest);
      assert.strictEqual(insight.highPercentileInteractionEvent?.dur, highPercentile);
    });
  };

  test('lcp-images.json.gz', undefined);
  test('slow-interaction-keydown.json.gz', 163609);
  test('nested-interactions.json.gz', 23370);
  test('slow-interaction-button-click.json.gz', 139238);
});
