// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, processTrace} from '../../../testing/InsightHelpers.js';

import * as Insights from './insights.js';

const {calculateMetricWeightsForSorting} = Insights.Common;

describeWithEnvironment('Common', function() {
  describe('calculateMetricWeightsForSorting', () => {
    async function process(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
      const {data, insights, metadata} = await processTrace(testContext, traceFile);
      if (!metadata) {
        throw new Error('missing metadata');
      }

      const insightSetKey = getFirstOrError(data.Meta.navigationsByNavigationId.values()).args.data.navigationId;
      const insightSet = insights.get(insightSetKey);
      if (!insightSet) {
        throw new Error('missing insight set');
      }

      // Clone so it may be modified.
      const clonedMetadata = structuredClone(metadata);

      return {insightSet, metadata: clonedMetadata};
    }

    it('returns default weights when there is no field data', async () => {
      const {insightSet, metadata} = await process(this, 'image-delivery.json.gz');

      // No field data defaults to even split of weights.
      metadata.cruxFieldData = undefined;
      let weights = calculateMetricWeightsForSorting(insightSet, metadata);
      assert.deepStrictEqual(weights, {lcp: 1 / 3, inp: 1 / 3, cls: 1 / 3});

      metadata.cruxFieldData = [];
      weights = calculateMetricWeightsForSorting(insightSet, metadata);
      assert.deepStrictEqual(weights, {lcp: 1 / 3, inp: 1 / 3, cls: 1 / 3});
    });

    it('returns weights based on field data', async () => {
      const {insightSet, metadata} = await process(this, 'image-delivery.json.gz');

      const weights = calculateMetricWeightsForSorting(insightSet, metadata);
      assert.deepStrictEqual(weights, {lcp: 0.07778127820223579, inp: 0.5504200439526509, cls: 0.37179867784511333});
    });
  });
});
