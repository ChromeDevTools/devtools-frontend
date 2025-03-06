// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../ai_assistance.js';

describeWithEnvironment('PerformanceInsightFormatter', () => {
  describe('LCP by Phase', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPPhases', insights, firstNav);

      const formatter = new PerformanceInsightFormatter(insight);
      const output = formatter.formatInsight();

      assert.isOk(insight.lcpRequest);

      const expected = `*IMPORTANT*: all time units given to you are in milliseconds.
## Insight title: LCP by phase

## Insight Description:
This insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element. For this insight it can be useful to get a list of all network requests that happened before the LCP time and look for slow requests. You can also look for main thread activity during the phases, in particular the load delay and render delay phases.

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp

## Insight details:
The actual LCP time is 129.21 ms.
The LCP resource was downloaded from: ${insight.lcpRequest.args.data.url}.

We can break this time down into the 4 phases that combine to make up the LCP time:

- Time to first byte: 7.94 ms
- Load delay: 33.16 ms
- Load time: 14.70 ms
- Render delay: 73.41 ms`;
      assert.strictEqual(output, expected);
    });

    it('formats correctly when the LCP is texted based and has no load delay or time phases', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPPhases', insights, firstNav);

      const formatter = new PerformanceInsightFormatter(insight);
      const output = formatter.formatInsight();
      const expected = `*IMPORTANT*: all time units given to you are in milliseconds.
## Insight title: LCP by phase

## Insight Description:
This insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element. For this insight it can be useful to get a list of all network requests that happened before the LCP time and look for slow requests. You can also look for main thread activity during the phases, in particular the load delay and render delay phases.

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp

## Insight details:
The actual LCP time is 106.48 ms.

We can break this time down into the 2 phases that combine to make up the LCP time:

- Time to first byte: 6.12 ms
- Render delay: 100.37 ms`;
      assert.strictEqual(output, expected);
    });
  });

  describe('LCP Request discovery', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPDiscovery', insights, firstNav);

      const formatter = new PerformanceInsightFormatter(insight);
      const output = formatter.formatInsight();

      assert.isOk(insight.lcpRequest);

      const expected = `*IMPORTANT*: all time units given to you are in milliseconds.
## Insight title: LCP request discovery

## Insight Description:
This insight analyzes the time taken to discover the LCP resource and request it on the network. It only applies if LCP element was a resource like an image that has to be fetched over the network. There are 3 checks this insight makes:
1. Did the resource have \`fetchpriority=high\` applied?
2. Was the resource discoverable in the initial document, rather than injected from a script or stylesheet?
3. The resource was not lazy loaded as this can delay the browser loading the resource.

It is important that all of these checks pass to minimize the delay between the initial page load and the LCP resource being loaded.

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp

## Insight details:
The LCP resource URL is: ${insight.lcpRequest.args.data.url}.

The result of the checks for this insight are:
- fetchpriority=high should be applied: FAILED
- lazy load not applied: PASSED
- Request is discoverable in initial document: PASSED`;
      assert.strictEqual(output, expected);
    });
  });

  describe('Formatting TraceEvents', () => {
    it('formats network requests in verbose mode', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequest(request, parsedTrace, {verbose: true});
      const expected = `## Network request: https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800
Timings:
- Start time: 37.62 ms
- Queued at: 43.24 ms
- Request sent at: 41.71 ms
- Download complete at: 48.04 ms
- Completed at: 51.55 ms
Durations:
- Main thread processing duration: 3.51 ms
- Total duration: 13.93 ms
Initiator: https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html
Status code: 200
MIME Type: text/css
Priority: VeryHigh
Render blocking: Yes
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
    it('formats network requests in non-verbose mode', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequest(request, parsedTrace, {verbose: false});
      const expected = `## Network request: https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800
- Start time: 37.62 ms
- Duration: 13.93 ms
- MIME type: text/css
- This request was render blocking`;

      assert.strictEqual(output, expected);
    });
  });
});
