// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

describeWithEnvironment('DOMSize', function() {
  it('finds layout reflows and style recalcs affected by DOM size',
     async () => {
       const {data, insights} = await processTrace(this, 'dom-size.json.gz');

       // 1 large DOM update was triggered before the first navigation
       {
         const insight = getInsightOrError('DOMSize', insights);
         assert.lengthOf(insight.largeLayoutUpdates, 1);
         assert.lengthOf(insight.largeStyleRecalcs, 1);
       }

       // 1 large DOM update was triggered after the first navigation
       {
         const insight =
             getInsightOrError('DOMSize', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
         assert.lengthOf(insight.largeLayoutUpdates, 1);
         assert.lengthOf(insight.largeStyleRecalcs, 1);
       }
     })
      // Processing the above trace can take a while due to a performance bottleneck
      // b/382545507
      .timeout(30_000);
});
