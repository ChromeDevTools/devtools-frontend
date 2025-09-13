// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../ai_assistance.js';

describeWithEnvironment('PerformanceInsightFormatter', () => {
  let snapshotTester: SnapshotTester;
  before(async () => {
    snapshotTester = new SnapshotTester(import.meta);
    await snapshotTester.load();
  });

  after(async () => {
    await snapshotTester.finish();
  });

  describe('LCP breakdown', () => {
    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      assert.isOk(insight.lcpRequest);
      snapshotTester.assert(this, output);
    });

    it('formats correctly when the LCP is text based and has no load delay or time phases', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  it('formats correctly when the LCP image has nodeName', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'dpr.json.gz');
    assert.isOk(parsedTrace.insights);
    const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

    const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
    const output = formatter.formatInsight();
    snapshotTester.assert(this, output);
  });

  describe('Render blocking requests', () => {
    it('tells the LLM if there are no render blocking requests', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('RenderBlocking', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'render-blocking-requests.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('RenderBlocking', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('LCP Request discovery', () => {
    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPDiscovery', parsedTrace.insights, firstNav);

      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();

      assert.isOk(insight.lcpRequest);
      snapshotTester.assert(this, output);
    });
  });

  describe('Document request latency', () => {
    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('DocumentLatency', parsedTrace.insights, firstNav);

      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();

      const request = insight.data?.documentRequest;
      assert.isOk(request);

      snapshotTester.assert(this, output);
    });
  });

  describe('CLS', () => {
    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'layout-shifts-root-causes.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CLSCulprits', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('INP breakdown', () => {
    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
      assert.isOk(parsedTrace.insights);
      const insight = getInsightOrError('INPBreakdown', parsedTrace.insights);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('ModernHTTP', () => {
    it('serializes the correct details when no requests are using legacy http', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ModernHTTP', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when requests are using legacy http', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'http1.1.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ModernHTTP', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('Formatting TraceEvents', () => {
    it('formats network requests that have redirects', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      const requestUrl = 'http://localhost:3000/redirect3';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequests([request], parsedTrace, {verbose: true});
      assert.include(output, `Redirects:
#### Redirect 1: http://localhost:3000/
- Start time: 3\xA0ms
- Duration: 512\xA0ms
#### Redirect 2: http://localhost:3000/redirect1
- Start time: 515.1\xA0ms
- Duration: 505.7\xA0ms
#### Redirect 3: http://localhost:3000/redirect2
- Start time: 1,020.7\xA0ms
- Duration: 507.1\xA0ms
`);
    });

    it('formats network requests in verbose mode', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequests([request], parsedTrace, {verbose: true});
      snapshotTester.assert(this, output);
    });

    it('defaults to verbose mode when 1 request and verbose option is not defined', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequests([request], parsedTrace);
      snapshotTester.assert(this, output);
    });

    it('getNetworkRequestsNewFormat correctly formats network requests for bad request latency trace', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      const requests = parsedTrace.data.NetworkRequests.byTime;
      // Duplicate request so that the compressed format is used
      const output = TraceEventFormatter.networkRequests([requests[0], requests[0]], parsedTrace);
      const urlMapIndex = output.indexOf('allUrls = ');
      assert.isAbove(urlMapIndex, -1, 'Could not find url map in output');
      const dataWithUrlMap = output.substring(urlMapIndex);
      const [urlMapString, requestData] = dataWithUrlMap.split('\n\n');

      assert.strictEqual(
          urlMapString,
          'allUrls = [0: http://localhost:3000/redirect3, 1: http://localhost:3000/, 2: http://localhost:3000/redirect1, 3: http://localhost:3000/redirect2]');

      const parts = requestData.split(';');
      // Join the last field because it is a list of headers that might contain a semicolon
      const fields = [...parts.slice(0, 18), parts.slice(18).join(';')];

      assert.strictEqual(fields[0], '0', 'urlIndex');
      assert.strictEqual(fields[1], '3\xA0ms', 'queuedTime');
      assert.strictEqual(fields[2], '1,529.5\xA0ms', 'requestSentTime');
      assert.strictEqual(fields[3], '3,532.6\xA0ms', 'downloadCompleteTime');
      assert.strictEqual(fields[4], '3,537.8\xA0ms', 'processingCompleteTime');
      assert.strictEqual(fields[5], '3,534.7\xA0ms', 'totalDuration');
      assert.strictEqual(fields[6], '0.1\xA0ms', 'downloadDuration');
      assert.strictEqual(fields[7], '5.1\xA0ms', 'mainThreadProcessingDuration');
      assert.strictEqual(fields[8], '200', 'statusCode');
      assert.strictEqual(fields[9], 'text/html', 'mimeType');
      assert.strictEqual(fields[10], 'VeryHigh', 'priority');
      assert.strictEqual(fields[11], 'VeryHigh', 'initialPriority');
      assert.strictEqual(fields[12], 'VeryHigh', 'finalPriority');
      assert.strictEqual(fields[13], 'f', 'renderBlocking');
      assert.strictEqual(fields[14], 'http/1.1', 'protocol');
      assert.strictEqual(fields[15], 'f', 'fromServiceWorker');
      assert.strictEqual(fields[16], '', 'initiators');
      assert.strictEqual(
          fields[17], '[[1|3\xA0ms|512\xA0ms],[2|515.1\xA0ms|505.7\xA0ms],[3|1,020.7\xA0ms|507.1\xA0ms]]', 'redirects');
      assert.strictEqual(
          fields[18],
          '[Transfer-Encoding: chunked|Keep-Alive: <redacted>|Date: Tue, 11 Mar 2025 10:19:12 GMT|Content-Type: text/html|Connection: keep-alive]\n0;3\xA0ms;1,529.5\xA0ms;3,532.6\xA0ms;3,537.8\xA0ms;3,534.7\xA0ms;0.1\xA0ms;5.1\xA0ms;200;text/html;VeryHigh;VeryHigh;VeryHigh;f;http/1.1;f;;[[1|3\xA0ms|512\xA0ms],[2|515.1\xA0ms|505.7\xA0ms],[3|1,020.7\xA0ms|507.1\xA0ms]];[Transfer-Encoding: chunked|Keep-Alive: <redacted>|Date: Tue, 11 Mar 2025 10:19:12 GMT|Content-Type: text/html|Connection: keep-alive]',
          'responseHeaders');
    });

    it('getNetworkRequestsNewFormat correctly formats network requests for lcp-images trace', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const request = parsedTrace.data.NetworkRequests.byTime;
      assert.isOk(request);
      const output = TraceEventFormatter.networkRequests(request, parsedTrace);
      const urlMapIndex = output.indexOf('allUrls = ');
      assert.isAbove(urlMapIndex, -1, 'Could not find url map in output');
      const dataWithUrlMap = output.substring(urlMapIndex);
      const [urlMapString, requestData] = dataWithUrlMap.split('\n\n');
      assert.strictEqual(
          urlMapString,
          'allUrls = [0: https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html, 1: https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800, 2: https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css, 3: https://via.placeholder.com/50.jpg, 4: https://via.placeholder.com/2000.jpg]');

      const allRequests = requestData.split('\n');
      const parts = allRequests[1].split(';');
      // Join the last field because it is a list of headers that might contain a semicolon
      const fields = [...parts.slice(0, 18), parts.slice(18).join(';')];

      assert.strictEqual(fields[0], '1', 'urlIndex');
      assert.strictEqual(fields[1], '37.6\xA0ms', 'queuedTime');
      assert.strictEqual(fields[2], '41.7\xA0ms', 'requestSentTime');
      assert.strictEqual(fields[3], '48\xA0ms', 'downloadCompleteTime');
      assert.strictEqual(fields[4], '51.5\xA0ms', 'processingCompleteTime');
      assert.strictEqual(fields[5], '13.9\xA0ms', 'totalDuration');
      assert.strictEqual(fields[6], '4.8\xA0ms', 'downloadDuration');
      assert.strictEqual(fields[7], '3.5\xA0ms', 'mainThreadProcessingDuration');
      assert.strictEqual(fields[8], '200', 'statusCode');
      assert.strictEqual(fields[9], 'text/css', 'mimeType');
      assert.strictEqual(fields[10], 'VeryHigh', 'priority');
      assert.strictEqual(fields[11], 'VeryHigh', 'initialPriority');
      assert.strictEqual(fields[12], 'VeryHigh', 'finalPriority');
      assert.strictEqual(fields[13], 't', 'renderBlocking');
      assert.strictEqual(fields[14], 'unknown', 'protocol');
      assert.strictEqual(fields[15], 'f', 'fromServiceWorker');
      assert.strictEqual(fields[16], '0', 'initiators');
      assert.strictEqual(fields[17], '[]', 'redirects');
      assert.strictEqual(
          fields[18],
          '[date: Thu, 07 Mar 2024 21:17:02 GMT|content-encoding: gzip|x-content-type-options: nosniff|last-modified: Thu, 07 Mar 2024 21:17:02 GMT|server: ESF|cross-origin-opener-policy: <redacted>|x-frame-options: SAMEORIGIN|content-type: text/css; charset=utf-8|access-control-allow-origin: *|cache-control: private, max-age=86400, stale-while-revalidate=604800|cross-origin-resource-policy: <redacted>|timing-allow-origin: *|link: <https://fonts.gstatic.com>; rel=preconnect; crossorigin|x-xss-protection: 0|expires: Thu, 07 Mar 2024 21:17:02 GMT]',
          'headers');
    });

    it('getNetworkRequestsNewFormat correctly formats an initiator chain for network-requests-initiators trace',
       async function() {
         const parsedTrace = await TraceLoader.traceEngine(this, 'network-requests-initiators.json.gz');
         const request = parsedTrace.data.NetworkRequests.byTime;
         assert.isOk(request);
         const output = TraceEventFormatter.networkRequests(request, parsedTrace);
         const urlMapIndex = output.indexOf('allUrls = ');
         assert.isAbove(urlMapIndex, -1, 'Could not find url map in output');
         const dataWithUrlMap = output.substring(urlMapIndex);
         const [urlMapString, requestData] = dataWithUrlMap.split('\n\n');
         assert.strictEqual(
             urlMapString,
             'allUrls = [0: https://www.youtube.com/, 1: https://i.ytimg.com/generate_204, 2: https://www.youtube.com/s/desktop/28bb7000/jsbin/desktop_polymer.vflset/desktop_polymer.js, 3: https://www.youtube.com/s/desktop/28bb7000/jsbin/web-animations-next-lite.min.vflset/web-animations-next-lite.min.js, 4: https://www.youtube.com/s/desktop/28bb7000/jsbin/custom-elements-es5-adapter.vflset/custom-elements-es5-adapter.js, 5: https://www.youtube.com/s/desktop/28bb7000/jsbin/webcomponents-sd.vflset/webcomponents-sd.js, 6: https://www.youtube.com/s/desktop/28bb7000/jsbin/intersection-observer.min.vflset/intersection-observer.min.js, 7: https://www.youtube.com/s/desktop/28bb7000/jsbin/scheduler.vflset/scheduler.js, 8: https://www.youtube.com/s/desktop/28bb7000/jsbin/www-i18n-constants-en_US.vflset/www-i18n-constants.js, 9: https://www.youtube.com/s/desktop/28bb7000/jsbin/www-tampering.vflset/www-tampering.js, 10: https://www.youtube.com/s/desktop/28bb7000/jsbin/spf.vflset/spf.js, 11: https://www.youtube.com/s/desktop/28bb7000/jsbin/network.vflset/network.js, 12: https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=YouTube+Sans:wght@300..900&display=swap, 13: https://www.youtube.com/s/desktop/28bb7000/cssbin/www-main-desktop-home-page-skeleton.css, 14: https://www.youtube.com/s/desktop/28bb7000/cssbin/www-onepick.css, 15: https://www.youtube.com/s/_/ytmainappweb/_/ss/k=ytmainappweb.kevlar_base.YzCM3q0siy4.L.B1.O/am=ADA7AQ/d=0/br=1/rs=AGKMywG7cU8b38Gfv3WYn4_os7hoqR-TIw, 16: https://googleads.g.doubleclick.net/pagead/id?slf_rd=1, 17: https://googleads.g.doubleclick.net/pagead/id, 18: https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2, 19: https://www.youtube.com/s/search/audio/failure.mp3, 20: https://www.youtube.com/s/search/audio/no_input.mp3, 21: https://www.youtube.com/s/search/audio/open.mp3, 22: https://www.youtube.com/s/search/audio/success.mp3, 23: https://www.youtube.com/s/desktop/28bb7000/cssbin/www-main-desktop-watch-page-skeleton.css, 24: https://www.youtube.com/youtubei/v1/att/get?prettyPrint=false, 25: https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2, 26: https://fonts.gstatic.com/s/youtubesans/v30/Qw38ZQNGEDjaO2m6tqIqX5E-AVS5_rSejo46_PCTRspJ0OosolrBEJL3HO_T7fE.woff2, 27: https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc4.woff2, 28: https://www.youtube.com/youtubei/v1/feedback?prettyPrint=false, 29: https://www.google.com/js/th/EirmVnnNlSgqRyHN1YLvHhRw11SWUqUPb76JYHphonQ.js, 30: https://www.youtube.com/manifest.webmanifest, 31: https://www.youtube.com/s/desktop/28bb7000/img/favicon.ico, 32: https://www.gstatic.com/youtube/img/branding/favicon/favicon_144x144.png, 33: https://www.youtube.com/s/player/5b22937f/player_ias.vflset/en_US/base.js, 34: https://www.youtube.com/s/player/5b22937f/www-player.css]');

         const allRequests = requestData.split('\n');
         const parts = allRequests[24].split(';');
         // Join the last field because it is a list of headers that might contain a semicolon
         const fields = [...parts.slice(0, 18), parts.slice(18).join(';')];

         assert.strictEqual(fields[16], '0,12', 'initiators');
       });
  });

  describe('DomSize', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('DOMSize', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details showing DOM issues', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'dom-size.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('DOMSize', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('Duplicated javascript', () => {
    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'dupe-js.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('DuplicatedJavaScript', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes no details if there is no duplicate javascript', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('DuplicatedJavaScript', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('Legacy JavaScript', () => {
    it('serializes the correct details when there is no legacy javascript in modules', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LegacyJavaScript', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when modules contain legacy javascript', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'yahoo-news.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LegacyJavaScript', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('FontDisplay', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('FontDisplay', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when problems are found with font display', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'font-display.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('FontDisplay', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('ImageDelivery', () => {
    it('serializes the correct details when there are no optimizable images', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ImageDelivery', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when there are images that can be optimized', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'image-delivery.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ImageDelivery', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('ForcedReflow', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ForcedReflow', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when there are problems found in the network dependency tree', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'forced-reflow.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ForcedReflow', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('NetworkDependencyTree', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('NetworkDependencyTree', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when there are problems found in the network dependency tree', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-multiple-frames.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('NetworkDependencyTree', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('SlowCssSelector', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('SlowCSSSelector', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when CSS selectors are found', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'selector-stats.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('SlowCSSSelector', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('ThirdParties', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ThirdParties', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes 3rd party scripts correctly', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ThirdParties', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('Cache', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('Cache', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details showing cache problems', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('Cache', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('Viewport', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'image-delivery.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('Viewport', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details showing viewport problems on mobile', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('Viewport', parsedTrace.insights, firstNav);
      const formatter = new PerformanceInsightFormatter(parsedTrace, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });
});
