// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../ai_assistance.js';

describeWithEnvironment('PerformanceInsightFormatter', () => {
  describe('for LCP by Phase', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPPhases', insights, firstNav);

      const formatter = new PerformanceInsightFormatter(insight);
      const output = formatter.formatInsight();

      const expected = `## Insight title: LCP by phase

## Insight Description:
This insight is used to analyse the loading of the LCP resource and identify which of the 4 phases are contributing most to the delay in rendering the LCP element. For this insight it can be useful to get a list of all network requests that happened before the LCP time and look for slow requests. You can also look for main thread activity during the phases, in particular the load delay and render delay phases.

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp

## Insight details:
All time units given to you are in milliseconds.
The actual LCP time is 129.21 ms;

We can break this time down into the 4 phases that combine to make up the LCP time:

- Time to first byte: 7.94 ms
- Load delay: 33.16 ms
- Load time: 14.70 ms
- Render delay: 73.41 ms`;
      assert.strictEqual(output, expected);
    });
  });

  describe('Formatting TraceEvents', () => {
    it('formats network requests', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequest(request, parsedTrace);
      const expected = `## Network request: https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800
Timings:
- Start time: 37.62 ms
- Queued at: 43.24 ms
- Request sent at: 41.71 ms
- Download complete at: 48.04 ms
- Fully completed at: 51.55 ms
- Total request duration: 13.93 ms
Status code: 200
MIME Type: text/css
Priority:
- Initial: VeryHigh
- Final: VeryHigh
Render blocking?: Yes
From a service worker: No
Response headers
- date: Thu, 07 Mar 2024 21:17:02 GMT
- content-encoding: gzip
- x-content-type-options: nosniff
- last-modified: Thu, 07 Mar 2024 21:17:02 GMT
- server: ESF
- cross-origin-opener-policy: <redacted>
- x-frame-options: SAMEORIGIN
- content-type: text/css; charset=utf-8
- access-control-allow-origin: *
- cache-control: private, max-age=86400, stale-while-revalidate=604800
- cross-origin-resource-policy: <redacted>
- timing-allow-origin: *
- link: <https://fonts.gstatic.com>; rel=preconnect; crossorigin
- x-xss-protection: 0
- expires: Thu, 07 Mar 2024 21:17:02 GMT`;

      assert.strictEqual(output, expected);
    });
  });
});
