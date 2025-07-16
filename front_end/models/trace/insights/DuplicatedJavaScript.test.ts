// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('DuplicatedJavaScript', function() {
  it('works (external source maps)', async () => {
    const {data, insights} = await processTrace(this, 'dupe-js.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsightOrError(
        'DuplicatedJavaScript', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const duplication = insight.duplicationGroupedByNodeModules;
    const results = Object.fromEntries(
        [...duplication.entries()].filter(v => v[1].estimatedDuplicateBytes > 1000 * 30).map(([key, data]) => {
          return [key, data.duplicates.map(v => ({url: v.script.url, transferSize: v.attributedSize}))];
        }));
    const url1 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v1';
    const url2 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v2';
    const url3 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v3';
    const url4 = 'https://dupe-modules-lh-2.surge.sh/bundle.js?v4';

    assert.deepEqual(results, {
      'node_modules/filestack-js': [
        {url: url1, transferSize: 115260},
        {url: url3, transferSize: 115260},
        {url: url4, transferSize: 115260},
        {url: url2, transferSize: 115259},
      ],
      'node_modules/@headlessui/react': [
        {url: url1, transferSize: 15341},
        {url: url2, transferSize: 15341},
        {url: url3, transferSize: 15341},
        {url: url4, transferSize: 15341},
      ],
      'node_modules/react-query': [
        {url: url1, transferSize: 10992},
        {url: url2, transferSize: 10992},
        {url: url3, transferSize: 10992},
        {url: url4, transferSize: 10992},
      ],
    });

    assert.deepEqual(insight.metricSavings, {FCP: 100, LCP: 100} as Trace.Insights.Types.MetricSavings);
  });

  function assertInlineMapsTestCase(
      insight: Trace.Insights.Models.DuplicatedJavaScript.DuplicatedJavaScriptInsightModel): void {
    const duplication = insight.duplicationGroupedByNodeModules;
    const results = Object.fromEntries(
        [...duplication.entries()].filter(v => v[1].estimatedDuplicateBytes > 1000 * 25).map(([key, data]) => {
          return [key, data.duplicates.map(v => ({url: v.script.url, transferSize: v.attributedSize}))];
        }));
    const url1 = 'https://dupe-modules-lh-inline-data.surge.sh/bundle-smaller.js?v1';
    const url2 = 'https://dupe-modules-lh-inline-data.surge.sh/bundle-smaller.js?v2';
    const url3 = 'https://dupe-modules-lh-inline-data.surge.sh/bundle-smaller.js?v3';
    const url4 = 'https://dupe-modules-lh-inline-data.surge.sh/bundle-smaller.js?v4';

    assert.deepEqual(results, {
      'node_modules/filestack-js': [
        {url: url1, transferSize: 104143},
        {url: url2, transferSize: 104143},
        {url: url3, transferSize: 104143},
        {url: url4, transferSize: 104143},
      ],
      'node_modules/@headlessui/react': [
        {url: url1, transferSize: 13863},
        {url: url2, transferSize: 13863},
        {url: url3, transferSize: 13863},
        {url: url4, transferSize: 13863},
      ],
      'node_modules/react-query': [
        {url: url1, transferSize: 9933},
        {url: url2, transferSize: 9933},
        {url: url3, transferSize: 9933},
        {url: url4, transferSize: 9933},
      ],
    });

    assert.deepEqual(insight.metricSavings, {FCP: 50, LCP: 50} as Trace.Insights.Types.MetricSavings);
  }

  it('works (inline source maps in trace events)', async function() {
    const {data, insights} = await processTrace(this, 'dupe-js-inline-maps.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight = getInsightOrError(
        'DuplicatedJavaScript', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    assertInlineMapsTestCase(insight);
  });

  it('works (inline source maps in metadata)', async function() {
    // Load this trace in a way that mutating it is safe.
    const fileContents = await TraceLoader.loadTraceFileFromURL(
        new URL('../../../panels/timeline/fixtures/traces/dupe-js-inline-maps.json.gz', import.meta.url));

    // Remove the source map data urls from the trace, and move to metadata.
    // This reflects how Chromium will elide data source map urls.
    // The original trace here was recorded at a time where sourceMapUrl could be a
    // large data url.
    for (const event of fileContents.traceEvents) {
      if (Trace.Types.Events.isV8SourceRundownEvent(event)) {
        const {sourceMapUrl, url} = event.args.data;
        if (sourceMapUrl?.startsWith('data:') && url) {
          const sourceMap = await (await fetch(sourceMapUrl)).json();
          fileContents.metadata.sourceMaps?.push({url, sourceMap});
          event.args.data.sourceMapUrl = undefined;
          event.args.data.sourceMapUrlElided = true;
        }
      }
    }

    const parsedTraceData = await TraceLoader.executeTraceEngineOnFileContents(fileContents);
    const {parsedTrace: data, insights} = parsedTraceData;
    if (!insights) {
      throw new Error('invalid insights');
    }

    assert.strictEqual(insights.size, 1);
    const insight = getInsightOrError(
        'DuplicatedJavaScript', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
    assertInlineMapsTestCase(insight);
  });
});
