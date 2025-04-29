// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import type * as Trace from '../trace.js';

describeWithEnvironment('LegacyJavaScript', function() {
  it('has no results when savings are too small', async () => {
    const {data, insights} = await processTrace(this, 'dupe-js.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('LegacyJavaScript', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const results =
        Object.fromEntries([...insight.legacyJavaScriptResults.entries()].slice(0, 1).map(([script, data]) => {
          return [script.url, data];
        }));

    assert.deepEqual(results, {});
    assert.deepEqual(insight.metricSavings, {FCP: 0, LCP: 0} as Trace.Insights.Types.MetricSavings);
  });

  it('has results when savings are big enough', async function() {
    const {data, insights} = await processTrace(this, 'yahoo-news.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('LegacyJavaScript', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const results = Object.fromEntries([...insight.legacyJavaScriptResults.entries()].map(([script, data]) => {
      return [script.url, data];
    }));

    assert.deepEqual(results, {
      'https://s.yimg.com/du/ay/wnsrvbjmeprtfrnfx.js': {
        matches: [
          {name: '@babel/plugin-transform-spread', line: 111, column: 7829},
          {name: 'Array.prototype.find', line: 111, column: 1794},
          {name: 'Array.prototype.includes', line: 111, column: 2127}, {name: 'Object.values', line: 111, column: 2748},
          {name: 'String.prototype.includes', line: 111, column: 2473},
          {name: 'String.prototype.startsWith', line: 111, column: 2627}
        ],
        estimatedByteSavings: 12850
      },
      'https://s.yimg.com/aaq/benji/benji-2.2.99.js':
          {matches: [{name: 'Promise.allSettled', line: 0, column: 133}], estimatedByteSavings: 37204},
      'https://s.yimg.com/aaq/c/25fa214.caas-news_web.min.js': {
        matches: [{name: 'Array.from', line: 0, column: 13310}, {name: 'Object.assign', line: 0, column: 14623}],
        estimatedByteSavings: 36084
      },
      'https://news.yahoo.com/': {
        matches: [
          {name: '@babel/plugin-transform-classes', line: 0, column: 8382},
          {name: 'Array.prototype.filter', line: 0, column: 107712},
          {name: 'Array.prototype.forEach', line: 0, column: 107393},
          {name: 'Array.prototype.map', line: 0, column: 108005},
          {name: 'String.prototype.includes', line: 0, column: 108358}
        ],
        estimatedByteSavings: 7141
      },
      'https://static.criteo.net/js/ld/publishertag.prebid.144.js': {
        matches: [
          {name: 'Array.isArray', line: 1, column: 74871}, {name: 'Array.prototype.filter', line: 1, column: 75344},
          {name: 'Array.prototype.indexOf', line: 1, column: 75013}
        ],
        estimatedByteSavings: 10751
      },
      'https://s.yimg.com/oa/consent.js':
          {matches: [{name: 'Array.prototype.includes', line: 1, column: 132267}], estimatedByteSavings: 8157},
      'https://cdn.taboola.com/libtrc/yahooweb-network/loader.js': {
        matches: [{name: 'Object.entries', line: 0, column: 390544}, {name: 'Object.values', line: 0, column: 390688}],
        estimatedByteSavings: 7061
      },
      'https://pm-widget.taboola.com/yahooweb-network/pmk-20220605.1.js':
          {matches: [{name: 'Object.keys', line: 181, column: 26}], estimatedByteSavings: 7625}
    });

    assert.deepEqual(insight.metricSavings, {FCP: 0, LCP: 0} as Trace.Insights.Types.MetricSavings);
  });
});
