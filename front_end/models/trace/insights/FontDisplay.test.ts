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

describeWithEnvironment('FontDisplay', function() {
  it('finds no requests for remote fonts', async () => {
    const {data, insights} = await processTrace(this, 'load-simple.json.gz');
    assert.strictEqual(insights.size, 2);
    const insight =
        getInsightOrError('FontDisplay', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    assert.strictEqual(insight.fonts.length, 0);
  });

  it('finds requests for remote fonts', async () => {
    const {data, insights} = await processTrace(this, 'font-display.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('FontDisplay', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    assert.deepStrictEqual(insight.fonts.map(f => ({...f, request: f.request.args.data.url})), [
      {
        request: 'https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79D0KExcOPIDU.woff2',
        display: 'auto',
        wastedTime: 20,
      },
      {
        request: 'https://fonts.gstatic.com/s/droidsans/v18/SlGVmQWMvZQIdix7AFxXkHNSbRYXags.woff2',
        display: 'auto',
        wastedTime: 15,
      },
      {
        request: 'https://fonts.gstatic.com/s/ptsans/v17/jizfRExUiTo99u79B_mh0O6tLR8a8zI.woff2',
        display: 'auto',
        wastedTime: 15,
      },
      {
        request: 'https://fonts.gstatic.com/s/droidsans/v18/SlGWmQWMvZQIdix7AFxXmMh3eDs1ZyHKpWg.woff2',
        display: 'auto',
        wastedTime: 15,
      },
      {
        request: 'https://fonts.gstatic.com/s/ptserif/v18/EJRVQgYoZZY2vCFuvAFWzr-_dSb_.woff2',
        display: 'auto',
        wastedTime: 15,
      },
      {
        request: 'https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.woff2',
        display: 'auto',
        wastedTime: 10,
      },
    ]);
  });
});
