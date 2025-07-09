// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, getInsightSetOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../ai_assistance.js';

const {ActiveInsight} = TimelineUtils.InsightAIContext;

/**
 * Asserts two strings are equal, and logs the first differing line if not equal.
 */
function assertStringEquals(actual: string, expected: string): void {
  if (actual !== expected) {
    const actualLines = actual.split('\n');
    const expectedLines = expected.split('\n');
    for (let i = 0; i < Math.max(actualLines.length, expectedLines.length); i++) {
      const actualLine = actualLines.at(i);
      const expectedLine = expectedLines.at(i);
      if (actualLine !== expectedLine) {
        console.error(`First differing line:\nexpected: ${expectedLine}\nactual:   ${actualLine}`);
        // Still compare the entire strings, so you can copy+paste the new result.
        assert.strictEqual(actual, expected);
      }
    }
  }
}

describeWithEnvironment('PerformanceInsightFormatter', () => {
  describe('LCP breakdown', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('LCPBreakdown', insights, firstNav);
      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();

      assert.isOk(insight.lcpRequest);

      const lcpRequestFormatted = TraceEventFormatter.networkRequest(
          insight.lcpRequest, parsedTrace, {verbose: true, customTitle: 'LCP resource network request'});

      const expected = `## Insight Title: LCP breakdown

## Insight Summary:
This insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element.

## Detailed analysis:
The Largest Contentful Paint (LCP) time for this navigation was 129.21 ms.
The LCP element is an image fetched from \`${insight.lcpRequest.args.data.url}\`.
${lcpRequestFormatted}

We can break this time down into the 4 phases that combine to make the LCP time:

- Time to first byte: 7.94 ms (6.1% of total LCP time)
- Resource load delay: 33.16 ms (25.7% of total LCP time)
- Resource load duration: 14.70 ms (11.4% of total LCP time)
- Element render delay: 73.41 ms (56.8% of total LCP time)

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      assertStringEquals(output, expected);
    });

    it('formats correctly when the LCP is text based and has no load delay or time phases', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('LCPBreakdown', insights, firstNav);

      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();
      const expected = `## Insight Title: LCP breakdown

## Insight Summary:
This insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element.

## Detailed analysis:
The Largest Contentful Paint (LCP) time for this navigation was 106.48 ms.
The LCP element is text and was not fetched from the network.

We can break this time down into the 2 phases that combine to make the LCP time:

- Time to first byte: 6.12 ms (5.7% of total LCP time)
- Element render delay: 100.37 ms (94.3% of total LCP time)

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      assertStringEquals(output, expected);
    });
  });

  it('formats correctly when the LCP image has nodeName', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'dpr.json.gz');
    assert.isOk(insights);
    const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
    const insightSet = getInsightSetOrError(insights, firstNav);
    const insight = getInsightOrError('LCPBreakdown', insights, firstNav);

    const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
    const output = formatter.formatInsight().split('Timings:')[0];
    const expected = `## Insight Title: LCP breakdown

## Insight Summary:
This insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element.

## Detailed analysis:
The Largest Contentful Paint (LCP) time for this navigation was 239.85 ms.
The LCP element (IMG) is an image fetched from \`https://creativetouchrotherham.co.uk/images/creative-touch-home/creative_touch_rotherham_homehero/creative_touch_rotherham_homehero_700.webp\`.
## LCP resource network request: https://creativetouchrotherham.co.uk/images/creative-touch-home/creative_touch_rotherham_homehero/creative_touch_rotherham_homehero_700.webp
`;
    assertStringEquals(output, expected);
  });

  describe('Render blocking requests', () => {
    it('tells the LLM if there are no render blocking requests', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('RenderBlocking', insights, firstNav);
      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();

      const expected = `## Insight Title: Render blocking requests

## Insight Summary:
This insight identifies network requests that were render blocking. Render blocking requests are impactful because they are deemed critical to the page and therefore the browser stops rendering the page until it has dealt with these resources. For this insight make sure you fully inspect the details of each render blocking network request and prioritize your suggestions to the user based on the impact of each render blocking request.

## Detailed analysis:
There are no network requests that are render blocking.

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      assertStringEquals(output, expected);
    });

    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'render-blocking-requests.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('RenderBlocking', insights, firstNav);
      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();

      const expected = `## Insight Title: Render blocking requests

## Insight Summary:
This insight identifies network requests that were render blocking. Render blocking requests are impactful because they are deemed critical to the page and therefore the browser stops rendering the page until it has dealt with these resources. For this insight make sure you fully inspect the details of each render blocking network request and prioritize your suggestions to the user based on the impact of each render blocking request.

## Detailed analysis:
Here is a list of the network requests that were render blocking on this page and their duration:

## Network request: https://code.jquery.com/jquery-3.7.1.js
- Start time: 581.40 ms
- Duration: 1,362.65 ms
- MIME type: application/javascript
- This request was render blocking

## Network request: http://localhost:8000/render-blocking-stylesheet.css
- Start time: 581.60 ms
- Duration: 611.56 ms
- MIME type: text/css
- This request was render blocking

## Network request: http://localhost:8000/render-blocking-script.js
- Start time: 581.56 ms
- Duration: 596.30 ms
- MIME type: text/javascript
- This request was render blocking

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      assertStringEquals(output, expected);
    });
  });

  describe('LCP Request discovery', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('LCPDiscovery', insights, firstNav);

      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();

      assert.isOk(insight.lcpRequest);
      const lcpRequestFormatted = TraceEventFormatter.networkRequest(
          insight.lcpRequest, parsedTrace, {verbose: true, customTitle: 'LCP resource network request'});

      const expected = `## Insight Title: LCP request discovery

## Insight Summary:
This insight analyzes the time taken to discover the LCP resource and request it on the network. It only applies if the LCP element was a resource like an image that has to be fetched over the network. There are 3 checks this insight makes:
1. Did the resource have \`fetchpriority=high\` applied?
2. Was the resource discoverable in the initial document, rather than injected from a script or stylesheet?
3. The resource was not lazy loaded as this can delay the browser loading the resource.

It is important that all of these checks pass to minimize the delay between the initial page load and the LCP resource being loaded.

## Detailed analysis:
The Largest Contentful Paint (LCP) time for this navigation was 1,077.06 ms.
The LCP element is an image fetched from \`${insight.lcpRequest.args.data.url}\`.
${lcpRequestFormatted}

The result of the checks for this insight are:
- fetchpriority=high should be applied: FAILED
- lazy load not applied: PASSED
- Request is discoverable in initial document: PASSED

## External resources:
- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      assertStringEquals(output, expected);
    });
  });

  describe('Document request latency', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('DocumentLatency', insights, firstNav);

      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();

      const request = insight.data?.documentRequest;
      assert.isOk(request);

      const expected = `## Insight Title: Document request latency

## Insight Summary:
This insight checks that the first request is responded to promptly. We use the following criteria to check this:
1. Was the initial request redirected?
2. Did the server respond in 600ms or less? We want developers to aim for as close to 100ms as possible, but our threshold for this insight is 600ms.
3. Was there compression applied to the response to minimize the transfer size?

## Detailed analysis:
The Largest Contentful Paint (LCP) time for this navigation was 3,604.15 ms.
The LCP element is text and was not fetched from the network.

${TraceEventFormatter.networkRequest(request, parsedTrace, {
        verbose: true,
        customTitle: 'Document network request'
      })}

The result of the checks for this insight are:
- The request was not redirected: FAILED
- Server responded quickly: FAILED
- Compression was applied: FAILED

## External resources:
- https://web.dev/articles/optimize-ttfb`;

      assertStringEquals(output, expected);
    });
  });

  describe('CLS', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'layout-shifts-root-causes.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('CLSCulprits', insights, firstNav);
      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();
      const expected = `## Insight Title: Layout shift culprits

## Insight Summary:
Cumulative Layout Shifts (CLS) is a measure of the largest burst of layout shifts for every unexpected layout shift that occurs during the lifecycle of a page. This is a Core Web Vital and the thresholds for categorizing a score are:
- Good: 0.1 or less
- Needs improvement: more than 0.1 and less than or equal to 0.25
- Bad: over 0.25

## Detailed analysis:
The worst layout shift cluster was the cluster that started at 471.76 ms and ended at 3,342.83 ms, with a duration of 2,871.07 ms.
The score for this cluster is 0.7656.

Layout shifts in this cluster:
### Layout shift 1:
- Start time: 471.76 ms
- Score: 0.0003
- Potential root causes:
  - A font that was loaded over the network (https://fonts.gstatic.com/s/specialgothicexpandedone/v2/IurO6Zxk74-YaYk1r3HOet4g75ENmBxUmOK61tA0Iu5QmJF_.woff2).
### Layout shift 2:
- Start time: 857.25 ms
- Score: 0.0844
- Potential root causes:
  - An iframe (id: 8AF3A9ADB81CA7B35302D07E0B591104, url: https://www.google.com/ was injected into the page)
### Layout shift 3:
- Start time: 1,352.45 ms
- Score: 0.0068
- Potential root causes:
  - An unsized image (IMG) (url: http://localhost:8000/unsized-image.png).
### Layout shift 4:
- Start time: 1,537.46 ms
- Score: 0.3344
- Potential root causes:
  - An unsized image (IMG) (url: http://localhost:8000/unsized-image.png).
### Layout shift 5:
- Start time: 2,342.83 ms
- Score: 0.3396
- No potential root causes identified

## External resources:
- https://wdeb.dev/articles/cls
- https://web.dev/articles/optimize-cls`;

      assertStringEquals(output, expected);
    });
  });

  describe('INP breakdown', () => {
    it('serializes the correct details', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
      assert.isOk(insights);
      const insightSet = getInsightSetOrError(insights);
      const insight = getInsightOrError('INPBreakdown', insights);

      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();

      const expected = `## Insight Title: INP breakdown

## Insight Summary:
Interaction to Next Paint (INP) is a metric that tracks the responsiveness of the page when the user interacts with it. INP is a Core Web Vital and the thresholds for how we categorize a score are:
- Good: 200 milliseconds or less.
- Needs improvement: more than 200 milliseconds and 500 milliseconds or less.
- Bad: over 500 milliseconds.

For a given slow interaction, we can break it down into 3 phases:
1. Input delay: starts when the user initiates an interaction with the page, and ends when the event callbacks for the interaction begin to run.
2. Processing duration: the time it takes for the event callbacks to run to completion.
3. Presentation delay: the time it takes for the browser to present the next frame which contains the visual result of the interaction.

The sum of these three phases is the total latency. It is important to optimize each of these phases to ensure interactions take as little time as possible. Focusing on the phase that has the largest score is a good way to start optimizing.

## Detailed analysis:
The longest interaction on the page was a \`click\` which had a total duration of \`979.97 ms\`. The timings of each of the three phases were:

1. Input delay: 1.00 ms
2. Processing duration: 977.00 ms
3. Presentation delay: 1.97 ms.

## External resources:
- https://web.dev/articles/inp
- https://web.dev/explore/how-to-optimize-inp
- https://web.dev/articles/optimize-long-tasks
- https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing`;

      assertStringEquals(output, expected);
    });
  });

  describe('ModernHTTP', () => {
    it('serializes the correct details when no requests are using legacy http', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('ModernHTTP', insights, firstNav);
      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();

      const expected = `## Insight Title: Modern HTTP

## Insight Summary:
Modern HTTP protocols, such as HTTP/2, are more efficient than older versions like HTTP/1.1 because they allow for multiple requests and responses to be sent over a single network connection, significantly improving page load performance by reducing latency and overhead. This insight identifies requests that can be upgraded to a modern HTTP protocol.

We apply a conservative approach when flagging HTTP/1.1 usage. This insight will only flag requests that meet all of the following criteria:
1.  Were served over HTTP/1.1 or an earlier protocol.
2.  Originate from an origin that serves at least 6 static asset requests, as the benefits of multiplexing are less significant with fewer requests.
3.  Are not served from 'localhost' or coming from a third-party source, where developers have no control over the server's protocol.

To pass this insight, ensure your server supports and prioritizes a modern HTTP protocol (like HTTP/2) for static assets, especially when serving a substantial number of them.

## Detailed analysis:
There are no requests that were served over a legacy HTTP protocol.

## External resources:
- https://developer.chrome.com/docs/lighthouse/best-practices/uses-http2`;
      assert.strictEqual(output.trim(), expected.trim());
    });

    it('serializes the correct details when requests are using legacy http', async function() {
      const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'http1.1.json.gz');
      assert.isOk(insights);
      const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);
      const insight = getInsightOrError('ModernHTTP', insights, firstNav);
      const formatter = new PerformanceInsightFormatter(new ActiveInsight(insight, insightSet.bounds, parsedTrace));
      const output = formatter.formatInsight();

      const requestDetails =
          insight.http1Requests
              .map(request => TraceEventFormatter.networkRequest(request, parsedTrace, {verbose: true}))
              .join('\n');

      const expected = `## Insight Title: Modern HTTP

## Insight Summary:
Modern HTTP protocols, such as HTTP/2, are more efficient than older versions like HTTP/1.1 because they allow for multiple requests and responses to be sent over a single network connection, significantly improving page load performance by reducing latency and overhead. This insight identifies requests that can be upgraded to a modern HTTP protocol.

We apply a conservative approach when flagging HTTP/1.1 usage. This insight will only flag requests that meet all of the following criteria:
1.  Were served over HTTP/1.1 or an earlier protocol.
2.  Originate from an origin that serves at least 6 static asset requests, as the benefits of multiplexing are less significant with fewer requests.
3.  Are not served from 'localhost' or coming from a third-party source, where developers have no control over the server's protocol.

To pass this insight, ensure your server supports and prioritizes a modern HTTP protocol (like HTTP/2) for static assets, especially when serving a substantial number of them.

## Detailed analysis:
Here is a list of the network requests that were served over a legacy HTTP protocol:
${requestDetails}

## External resources:
- https://developer.chrome.com/docs/lighthouse/best-practices/uses-http2`;
      assert.strictEqual(output.trim(), expected.trim());
    });
  });

  describe('Formatting TraceEvents', () => {
    it('formats network requests that have redirects', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      const requestUrl = 'http://localhost:3000/redirect3';
      const request = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequest(request, parsedTrace, {verbose: true});
      assert.include(output, `Redirects:
#### Redirect 1: http://localhost:3000/
- Start time: 3.04 ms
- Duration: 512.02 ms
#### Redirect 2: http://localhost:3000/redirect1
- Start time: 515.06 ms
- Duration: 505.67 ms
#### Redirect 3: http://localhost:3000/redirect2
- Start time: 1,020.73 ms
- Duration: 507.09 ms
`);
    });

    it('formats network requests in verbose mode', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequest(request, parsedTrace, {verbose: true});
      const expected = `## Network request: https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800
Timings:
- Queued at: 37.62 ms
- Request sent at: 41.71 ms
- Download complete at: 48.04 ms
- Main thread processing completed at: 51.55 ms
Durations:
- Download time: 4.79 ms
- Main thread processing time: 3.51 ms
- Total duration: 13.93 ms
Initiator: https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html
Redirects: no redirects
Status code: 200
MIME Type: text/css
Protocol: unknown
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

      assertStringEquals(output, expected);
    });
    it('formats network requests in non-verbose mode', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequest(request, parsedTrace, {verbose: false});
      const expected = `## Network request: https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800
- Start time: 37.62 ms
- Duration: 13.93 ms
- MIME type: text/css
- This request was render blocking`;

      assertStringEquals(output, expected);
    });

    it('getNetworkRequestsNewFormat correctly formats network requests for bad request latency trace', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      const requests = parsedTrace.NetworkRequests.byTime;
      const output = TraceEventFormatter.getNetworkRequestsNewFormat(requests, parsedTrace);
      const [urlMapString, requestData] = output.split('\n\n');

      assert.strictEqual(
          urlMapString,
          'allUrls = [0: http://localhost:3000/redirect3, 1: http://localhost:3000/, 2: http://localhost:3000/redirect1, 3: http://localhost:3000/redirect2]');

      const parts = requestData.split(';');
      // Join the last field because it is a list of headers that might contain a semicolon
      const fields = [...parts.slice(0, 18), parts.slice(18).join(';')];

      assert.strictEqual(fields[0], '0', 'urlIndex');
      assert.strictEqual(fields[1], '3.04 ms', 'queuedTime');
      assert.strictEqual(fields[2], '1,529.47 ms', 'requestSentTime');
      assert.strictEqual(fields[3], '3,532.63 ms', 'downloadCompleteTime');
      assert.strictEqual(fields[4], '3,537.75 ms', 'processingCompleteTime');
      assert.strictEqual(fields[5], '3,534.71 ms', 'totalDuration');
      assert.strictEqual(fields[6], '0.13 ms', 'downloadDuration');
      assert.strictEqual(fields[7], '5.12 ms', 'mainThreadProcessingDuration');
      assert.strictEqual(fields[8], '200', 'statusCode');
      assert.strictEqual(fields[9], 'text/html', 'mimeType');
      assert.strictEqual(fields[10], 'VeryHigh', 'priority');
      assert.strictEqual(fields[11], 'VeryHigh', 'initialPriority');
      assert.strictEqual(fields[12], 'VeryHigh', 'finalPriority');
      assert.strictEqual(fields[13], 'f', 'renderBlocking');
      assert.strictEqual(fields[14], 'http/1.1', 'protocol');
      assert.strictEqual(fields[15], 'f', 'fromServiceWorker');
      assert.strictEqual(fields[16], '', 'initiatorUrlIndex');
      assert.strictEqual(
          fields[17], '[[1|3.04 ms|512.02 ms],[2|515.06 ms|505.67 ms],[3|1,020.73 ms|507.09 ms]]', 'redirects');
      assert.strictEqual(
          fields[18],
          '[Transfer-Encoding: chunked|Keep-Alive: <redacted>|Date: Tue, 11 Mar 2025 10:19:12 GMT|Content-Type: text/html|Connection: keep-alive]',
          'responseHeaders');
    });

    it('getNetworkRequestsNewFormat correctly formats network requests for lcp-images trace', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const request = parsedTrace.NetworkRequests.byTime;
      assert.isOk(request);
      const output = TraceEventFormatter.getNetworkRequestsNewFormat(request, parsedTrace);

      const [urlMapString, requestData] = output.split('\n\n');
      assert.strictEqual(
          urlMapString,
          'allUrls = [0: https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html, 1: https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800, 2: https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css, 3: https://via.placeholder.com/50.jpg, 4: https://via.placeholder.com/2000.jpg]');

      const allRequests = requestData.split('\n');
      const parts = allRequests[1].split(';');
      // Join the last field because it is a list of headers that might contain a semicolon
      const fields = [...parts.slice(0, 18), parts.slice(18).join(';')];

      assert.strictEqual(fields[0], '1', 'urlIndex');
      assert.strictEqual(fields[1], '37.62 ms', 'queuedTime');
      assert.strictEqual(fields[2], '41.71 ms', 'requestSentTime');
      assert.strictEqual(fields[3], '48.04 ms', 'downloadCompleteTime');
      assert.strictEqual(fields[4], '51.55 ms', 'processingCompleteTime');
      assert.strictEqual(fields[5], '13.93 ms', 'totalDuration');
      assert.strictEqual(fields[6], '4.79 ms', 'downloadDuration');
      assert.strictEqual(fields[7], '3.51 ms', 'mainThreadProcessingDuration');
      assert.strictEqual(fields[8], '200', 'statusCode');
      assert.strictEqual(fields[9], 'text/css', 'mimeType');
      assert.strictEqual(fields[10], 'VeryHigh', 'priority');
      assert.strictEqual(fields[11], 'VeryHigh', 'initialPriority');
      assert.strictEqual(fields[12], 'VeryHigh', 'finalPriority');
      assert.strictEqual(fields[13], 't', 'renderBlocking');
      assert.strictEqual(fields[14], 'unknown', 'protocol');
      assert.strictEqual(fields[15], 'f', 'fromServiceWorker');
      assert.strictEqual(fields[16], '0', 'initiatorUrlIndex');
      assert.strictEqual(fields[17], '[]', 'redirects');
      assert.strictEqual(
          fields[18],
          '[date: Thu, 07 Mar 2024 21:17:02 GMT|content-encoding: gzip|x-content-type-options: nosniff|last-modified: Thu, 07 Mar 2024 21:17:02 GMT|server: ESF|cross-origin-opener-policy: <redacted>|x-frame-options: SAMEORIGIN|content-type: text/css; charset=utf-8|access-control-allow-origin: *|cache-control: private, max-age=86400, stale-while-revalidate=604800|cross-origin-resource-policy: <redacted>|timing-allow-origin: *|link: <https://fonts.gstatic.com>; rel=preconnect; crossorigin|x-xss-protection: 0|expires: Thu, 07 Mar 2024 21:17:02 GMT]',
          'headers');
    });
  });
});
