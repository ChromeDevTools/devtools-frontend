// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {expectConsoleLogs} from '../../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as Trace from '../../trace.js';
import * as Lantern from '../lantern.js';
import {runTrace, toLanternTrace} from '../testing/testing.js';

const {NetworkAnalyzer} = Lantern.Core;

async function createRequests(context: Mocha.Suite|Mocha.Context, trace: Lantern.Types.Trace) {
  const parsedTrace = await runTrace(context, trace);
  return Trace.LanternComputationData.createNetworkRequests(trace, parsedTrace);
}

describe('NetworkAnalyzer', () => {
  let trace: Lantern.Types.Trace;
  let traceWithRedirect: Lantern.Types.Trace;
  before(async function() {
    trace = toLanternTrace(await TraceLoader.rawEvents(this, 'lantern/paul/trace.json.gz'));
    traceWithRedirect = toLanternTrace(await TraceLoader.rawEvents(this, 'lantern/redirect/trace.json.gz'));
  });

  let recordId = 1;

  function createRecord(opts: {
    // Real request ids are strings but we take a number here to make test
    // setup easier.
    requestId?: number,
    connectionId?: number,
    connectionReused?: boolean,
    url?: string,
    networkRequestTime?: number,
    networkEndTime?: number,
    protocol?: string,
    transferSize?: number,
    resourceType?: string,
    timing?: {connectStart?: number, connectEnd?: number, sendStart?: number, receiveHeadersEnd?: number},
  }): Trace.Lantern.Types.NetworkRequest {
    const url = opts.url || 'https://example.com';
    if (opts.networkRequestTime) {
      opts.networkRequestTime *= 1000;
    }
    if (opts.networkEndTime) {
      opts.networkEndTime *= 1000;
    }
    const requestId = opts.requestId ? String(opts.requestId) : String(recordId++);
    delete opts.requestId;

    return Object.assign(
               {
                 url,
                 requestId,
                 connectionId: 0,
                 connectionReused: false,
                 networkRequestTime: 10,
                 networkEndTime: 10,
                 transferSize: 10000,
                 protocol: opts.protocol || 'http/1.1',
                 parsedURL: {scheme: url.match(/https?/)?.[0], securityOrigin: url.match(/.*\.com/)?.[0]},
                 timing: opts.timing || null,
               },
               opts,
               ) as unknown as Trace.Lantern.Types.NetworkRequest;
  }

  beforeEach(() => {
    recordId = 1;
  });

  function assertCloseEnough(valueA: number, valueB: number, threshold = 1) {
    const message = `${valueA} was not close enough to ${valueB}`;
    assert.isOk(Math.abs(valueA - valueB) < threshold, message);
  }

  describe('#estimateIfConnectionWasReused', function() {
    it('should use built-in value when trustworthy', () => {
      const records = [
        createRecord({requestId: 1, connectionId: 1, connectionReused: false}),
        createRecord({requestId: 2, connectionId: 1, connectionReused: true}),
        createRecord({requestId: 3, connectionId: 2, connectionReused: false}),
        createRecord({requestId: 4, connectionId: 3, connectionReused: false}),
        createRecord({requestId: 5, connectionId: 2, connectionReused: true}),
      ];

      // the `records` are not "full" NetworkRequest items but they are good enough for this test.
      const result =
          NetworkAnalyzer.estimateIfConnectionWasReused(records as unknown as Trace.Lantern.Types.NetworkRequest[]);
      const expected = new Map([['1', false], ['2', true], ['3', false], ['4', false], ['5', true]]);
      assert.deepEqual(result, expected);
    });

    it('should estimate values when not trustworthy (duplicate IDs)', () => {
      const records = [
        createRecord({requestId: 1, networkRequestTime: 0, networkEndTime: 15}),
        createRecord({requestId: 2, networkRequestTime: 10, networkEndTime: 25}),
        createRecord({requestId: 3, networkRequestTime: 20, networkEndTime: 40}),
        createRecord({requestId: 4, networkRequestTime: 30, networkEndTime: 40}),
      ];

      const result =
          NetworkAnalyzer.estimateIfConnectionWasReused(records as unknown as Trace.Lantern.Types.NetworkRequest[]);
      const expected = new Map([['1', false], ['2', false], ['3', true], ['4', true]]);
      assert.deepEqual(result, expected);
    });

    it('should estimate values when not trustworthy (connectionReused nonsense)', () => {
      const records = [
        createRecord({
          requestId: 1,
          connectionId: 1,
          connectionReused: true,
          networkRequestTime: 0,
          networkEndTime: 15,
        }),
        createRecord({
          requestId: 2,
          connectionId: 1,
          connectionReused: true,
          networkRequestTime: 10,
          networkEndTime: 25,
        }),
        createRecord({
          requestId: 3,
          connectionId: 1,
          connectionReused: true,
          networkRequestTime: 20,
          networkEndTime: 40,
        }),
        createRecord({
          requestId: 4,
          connectionId: 2,
          connectionReused: false,
          networkRequestTime: 30,
          networkEndTime: 40,
        }),
      ];

      const result =
          NetworkAnalyzer.estimateIfConnectionWasReused(records as unknown as Trace.Lantern.Types.NetworkRequest[]);
      const expected = new Map([['1', false], ['2', false], ['3', true], ['4', true]]);
      assert.deepEqual(result, expected);
    });

    it('should estimate with earliest allowed reuse', () => {
      const records = [
        createRecord({requestId: 1, networkRequestTime: 0, networkEndTime: 40}),
        createRecord({requestId: 2, networkRequestTime: 10, networkEndTime: 15}),
        createRecord({requestId: 3, networkRequestTime: 20, networkEndTime: 30}),
        createRecord({requestId: 4, networkRequestTime: 35, networkEndTime: 40}),
      ];

      const result =
          NetworkAnalyzer.estimateIfConnectionWasReused(records as unknown as Trace.Lantern.Types.NetworkRequest[]);
      const expected = new Map([['1', false], ['2', false], ['3', true], ['4', true]]);
      assert.deepEqual(result, expected);
    });

    it('should work on a real trace', async () => {
      const requests = await createRequests(this, trace);
      const result = NetworkAnalyzer.estimateIfConnectionWasReused(requests);
      const distinctConnections = Array.from(result.values()).filter(item => !item).length;
      assert.strictEqual(result.size, 24);
      assert.strictEqual(distinctConnections, 8);
    });
  });

  describe('#estimateRTTByOrigin', function() {
    it('should infer from tcp timing when available', () => {
      const timing = {connectStart: 0, connectEnd: 99};
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([request]);
      const expected = {min: 99, max: 99, avg: 99, median: 99};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should infer only one estimate if tcp and ssl start times are equal', () => {
      const timing = {connectStart: 0, connectEnd: 99, sslStart: 0, sslEnd: 99};
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([request]);
      const expected = {min: 99, max: 99, avg: 99, median: 99};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should infer from tcp and ssl timing when available', () => {
      const timing = {connectStart: 0, connectEnd: 99, sslStart: 50, sslEnd: 99};
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([request]);
      const expected = {min: 49, max: 50, avg: 49.5, median: 49.5};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should infer from connection timing when available for h3 (one estimate)', () => {
      const timing = {connectStart: 0, connectEnd: 99, sslStart: 1, sslEnd: 99};
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing, protocol: 'h3'});
      const result = NetworkAnalyzer.estimateRTTByOrigin([request]);
      const expected = {min: 99, max: 99, avg: 99, median: 99};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should infer from sendStart when available', () => {
      const timing = {sendStart: 150};
      // this request took 150ms before Chrome could send the request
      // i.e. DNS (maybe) + queuing (maybe) + TCP handshake took ~100ms
      // 150ms / 3 round trips ~= 50ms RTT
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([request], {coarseEstimateMultiplier: 1});
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should infer from download timing when available', () => {
      const timing = {receiveHeadersEnd: 100};
      // this request took 1000ms after the first byte was received to download the payload
      // i.e. it took at least one full additional roundtrip after first byte to download the rest
      // 1000ms / 1 round trip ~= 1000ms RTT
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1.1, transferSize: 28 * 1024, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([request], {
        coarseEstimateMultiplier: 1,
        useHeadersEndEstimates: false,
      });
      const expected = {min: 1000, max: 1000, avg: 1000, median: 1000};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should infer from TTFB when available', () => {
      const timing = {receiveHeadersEnd: 1000};
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing, resourceType: 'Other'});
      const result = NetworkAnalyzer.estimateRTTByOrigin([request], {
        coarseEstimateMultiplier: 1,
      });

      // this request's TTFB was 1000ms, it used SSL and was a fresh connection requiring a handshake
      // which needs ~4 RTs. We don't know its resource type so it'll be assumed that 40% of it was
      // server response time.
      // 600 ms / 4 = 150ms
      const expected = {min: 150, max: 150, avg: 150, median: 150};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should use coarse estimates on a per-origin basis', () => {
      const records = [
        createRecord({url: 'https://example.com', timing: {connectStart: 1, connectEnd: 100, sendStart: 150}}),
        createRecord({url: 'https://example2.com', timing: {sendStart: 150}}),
      ];
      const result = NetworkAnalyzer.estimateRTTByOrigin(records);
      assert.deepEqual(result.get('https://example.com'), {min: 99, max: 99, avg: 99, median: 99});
      assert.deepEqual(result.get('https://example2.com'), {min: 15, max: 15, avg: 15, median: 15});
    });

    it('should handle untrustworthy connection information', () => {
      const timing = {sendStart: 150};
      const recordA = createRecord({networkRequestTime: 0, networkEndTime: 1, timing, connectionReused: true});
      const recordB = createRecord({
        networkRequestTime: 0,
        networkEndTime: 1,
        timing,
        connectionId: 2,
        connectionReused: true,
      });
      const result = NetworkAnalyzer.estimateRTTByOrigin([recordA, recordB], {
        coarseEstimateMultiplier: 1,
      });
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should work on a real trace', async () => {
      const requests = await createRequests(this, trace);
      const result = NetworkAnalyzer.estimateRTTByOrigin(requests);
      assertCloseEnough(result.get('https://www.paulirish.com')?.min ?? 0, 10);
      assertCloseEnough(result.get('https://www.googletagmanager.com')?.min ?? 0, 17);
      assertCloseEnough(result.get('https://www.google-analytics.com')?.min ?? 0, 10);
    });

    it('should approximate well with either method', async () => {
      const requests = await createRequests(this, trace);
      const result = NetworkAnalyzer.estimateRTTByOrigin(requests).get(NetworkAnalyzer.summary);
      const resultApprox = NetworkAnalyzer
                               .estimateRTTByOrigin(requests, {
                                 forceCoarseEstimates: true,
                               })
                               .get(NetworkAnalyzer.summary);
      assert.isOk(result);
      assert.isOk(resultApprox);
      assertCloseEnough(result.min, resultApprox.min, 20);
      assertCloseEnough(result.avg, resultApprox.avg, 30);
      assertCloseEnough(result.median, resultApprox.median, 30);
    });
  });

  describe('#estimateServerResponseTimeByOrigin', function() {
    it('should estimate server response time using ttfb times', () => {
      const timing = {sendEnd: 100, receiveHeadersEnd: 200};
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const rttByOrigin = new Map([[NetworkAnalyzer.summary, 0]]);
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([request], {rttByOrigin});
      const expected = {min: 100, max: 100, avg: 100, median: 100};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should subtract out rtt', () => {
      const timing = {sendEnd: 100, receiveHeadersEnd: 200};
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const rttByOrigin = new Map([[NetworkAnalyzer.summary, 50]]);
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([request], {rttByOrigin});
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should compute rtts when not provided', () => {
      const timing = {connectStart: 5, connectEnd: 55, sendEnd: 100, receiveHeadersEnd: 200};
      const request = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([request]);
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepEqual(result.get('https://example.com'), expected);
    });

    it('should work on a real trace', async () => {
      const requests = await createRequests(this, trace);
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin(requests);
      assertCloseEnough(result.get('https://www.paulirish.com')?.avg ?? 0, 35);
      assertCloseEnough(result.get('https://www.googletagmanager.com')?.avg ?? 0, 8);
      assertCloseEnough(result.get('https://www.google-analytics.com')?.avg ?? 0, 8);
    });

    it('should approximate well with either method', async () => {
      const requests = await createRequests(this, trace);
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin(requests).get(
          NetworkAnalyzer.summary,
      );
      const resultApprox = NetworkAnalyzer
                               .estimateServerResponseTimeByOrigin(requests, {
                                 forceCoarseEstimates: true,
                               })
                               .get(NetworkAnalyzer.summary);
      assert.isOk(result);
      assert.isOk(resultApprox);
      assertCloseEnough(result.min, resultApprox.min, 20);
      assertCloseEnough(result.avg, resultApprox.avg, 30);
      assertCloseEnough(result.median, resultApprox.median, 30);
    });
  });

  describe('#estimateThroughput', () => {
    const estimateThroughput = NetworkAnalyzer.estimateThroughput;

    function createThroughputRecord(responseHeadersEndTimeInS: number, networkEndTimeInS: number, extras: object = {}):
        Trace.Lantern.Types.NetworkRequest {
      return Object.assign(
                 {
                   responseHeadersEndTime: responseHeadersEndTimeInS * 1000,
                   networkEndTime: networkEndTimeInS * 1000,
                   transferSize: 1000,
                   finished: true,
                   failed: false,
                   statusCode: 200,
                   url: 'https://google.com/logo.png',
                   parsedURL: {scheme: 'https'},
                 },
                 extras,
                 ) as unknown as Trace.Lantern.Types.NetworkRequest;
    }

    it('should return null for no/missing records', () => {
      assert.isNull(estimateThroughput([]));
      assert.isNull(estimateThroughput([createThroughputRecord(0, 0, {finished: false})]));
    });

    it('should compute correctly for a basic waterfall', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 1),
        createThroughputRecord(1, 2),
        createThroughputRecord(2, 6),
      ]);

      assert.strictEqual(result, 500 * 8);
    });

    it('should compute correctly for concurrent requests', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 1),
        createThroughputRecord(0.5, 1),
      ]);

      assert.strictEqual(result, 2000 * 8);
    });

    it('should compute correctly for gaps', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 1),
        createThroughputRecord(3, 4),
      ]);

      assert.strictEqual(result, 1000 * 8);
    });

    it('should compute correctly for partially overlapping requests', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 1),
        createThroughputRecord(0.5, 1.5),
        createThroughputRecord(1.25, 3),
        createThroughputRecord(1.4, 4),
        createThroughputRecord(5, 9),
      ]);

      assert.strictEqual(result, 625 * 8);
    });

    it('should exclude failed records', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 2),
        createThroughputRecord(3, 4, {failed: true}),
      ]);
      assert.strictEqual(result, 500 * 8);
    });

    it('should exclude cached records', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 2),
        createThroughputRecord(3, 4, {statusCode: 304}),
      ]);
      assert.strictEqual(result, 500 * 8);
    });

    it('should exclude unfinished records', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 2),
        createThroughputRecord(3, 4, {finished: false}),
      ]);
      assert.strictEqual(result, 500 * 8);
    });

    it('should exclude data URIs', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 2),
        createThroughputRecord(3, 4, {parsedURL: {scheme: 'data'}}),
      ]);
      assert.strictEqual(result, 500 * 8);
    });
  });

  describe('#computeRTTAndServerResponseTime', function() {
    it('should work', async () => {
      const requests = await createRequests(this, trace);
      const result = NetworkAnalyzer.computeRTTAndServerResponseTime(requests);

      expect(result.rtt).to.be.closeTo(0.082, 0.001);
      assert.deepEqual([...result.additionalRttByOrigin.entries()], [
        [
          'https://www.paulirish.com',
          9.788999999999994,
        ],
        [
          'https://www.googletagmanager.com',
          17.21999999999999,
        ],
        [
          'https://fonts.googleapis.com',
          16.816000000000003,
        ],
        [
          'https://fonts.gstatic.com',
          1.6889999999999998,
        ],
        [
          'https://www.google-analytics.com',
          9.924999999999997,
        ],
        [
          'https://paulirish.disqus.com',
          9.000999999999998,
        ],
        [
          'https://firebaseinstallations.googleapis.com',
          0,
        ],
        [
          'https://firebaseremoteconfig.googleapis.com',
          0.1823,
        ],
        [
          '__SUMMARY__',
          0,
        ],
      ]);
    });
  });

  describe('#findMainDocument', function() {
    it('should find the main document', async () => {
      const requests = await createRequests(this, trace);
      const mainDocument = NetworkAnalyzer.findResourceForUrl(requests, 'https://www.paulirish.com/');
      assert.isOk(mainDocument);
      assert.strictEqual(mainDocument.url, 'https://www.paulirish.com/');
    });

    it('should find the main document if the URL includes a fragment', async () => {
      const requests = await createRequests(this, trace);
      const mainDocument = NetworkAnalyzer.findResourceForUrl(requests, 'https://www.paulirish.com/#info');
      assert.isOk(mainDocument);
      assert.strictEqual(mainDocument.url, 'https://www.paulirish.com/');
    });
  });

  describe('#resolveRedirects', function() {
    expectConsoleLogs({
      error: ['Error: missing metric scores for specified navigation'],
    });
    it('should resolve to the same document when no redirect', async () => {
      const requests = await createRequests(this, trace);
      const mainDocument = NetworkAnalyzer.findResourceForUrl(requests, 'https://www.paulirish.com/');
      assert.isOk(mainDocument);
      const finalDocument = NetworkAnalyzer.resolveRedirects(mainDocument);
      assert.strictEqual(mainDocument.url, finalDocument.url);
      assert.strictEqual(finalDocument.url, 'https://www.paulirish.com/');
    });

    it('should resolve to the final document with redirects', async () => {
      const requests = await createRequests(this, traceWithRedirect);
      const mainDocument = NetworkAnalyzer.findResourceForUrl(requests, 'http://www.vkontakte.ru/');
      assert.isOk(mainDocument);
      const finalDocument = NetworkAnalyzer.resolveRedirects(mainDocument);
      assert.notEqual(mainDocument.url, finalDocument.url);
      assert.strictEqual(finalDocument.url, 'https://m.vk.com/');
    });
  });
});
