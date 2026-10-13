// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import type * as Platform from '../../../core/platform/platform.js';
import * as Protocol from '../../../generated/protocol.js';
import {getFirstOrError, getInsightSetOrError, processTrace} from '../../../testing/InsightHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {microsecondsTraceWindow} from '../../../testing/TraceHelpersCore.js';
import * as Trace from '../trace.js';
import type * as Types from '../types/types.js';

import * as Insights from './insights.js';

const {calculateMetricWeightsForSorting, estimateCompressedContentSize, metricSavingsForWastedBytes} = Insights.Common;

describe('Common', function() {
  setupLocaleHooks();
  describe('calculateMetricWeightsForSorting', () => {
    async function process(testContext: Mocha.Suite|Mocha.Context, traceFile: string) {
      const {data, insights, metadata} = await processTrace(testContext, traceFile);
      if (!metadata) {
        throw new Error('missing metadata');
      }

      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insightSet = getInsightSetOrError(insights, firstNav);

      // Clone so it may be modified.
      const clonedMetadata = structuredClone(metadata);

      return {insightSet, metadata: clonedMetadata};
    }

    it('returns default weights when there is no field data', async function() {
      const {insightSet, metadata} = await process(this, 'image-delivery.json.gz');

      // No field data defaults to even split of weights.
      metadata.cruxFieldData = undefined;
      let weights = calculateMetricWeightsForSorting(insightSet, metadata);
      assert.deepEqual(weights, {lcp: 1 / 3, inp: 1 / 3, cls: 1 / 3});

      metadata.cruxFieldData = [];
      weights = calculateMetricWeightsForSorting(insightSet, metadata);
      assert.deepEqual(weights, {lcp: 1 / 3, inp: 1 / 3, cls: 1 / 3});
    });

    it('returns weights based on field data', async function() {
      const {insightSet, metadata} = await process(this, 'image-delivery.json.gz');

      const weights = calculateMetricWeightsForSorting(insightSet, metadata);
      assert.lengthOf(Object.keys(weights), 3);
      assert.closeTo(weights.lcp, 0.07778127820223579, 1e-15);
      assert.closeTo(weights.inp, 0.5504200439526509, 1e-15);
      assert.closeTo(weights.cls, 0.37179867784511333, 1e-15);
    });
  });

  describe('#estimateCompressedContentSize', () => {
    const estimate = estimateCompressedContentSize;
    const encoding = [{name: 'Content-Encoding', value: 'gzip'}];
    const makeRequest = (partial: {
                          resourceType: Protocol.Network.ResourceType,
                          transferSize?: number,
                          resourceSize?: number,
                          responseHeaders?: Array<{name: string, value: string}>,
                        }): Types.Events.SyntheticNetworkRequest => {
      const request: Platform.TypeScriptUtilities.RecursivePartial<Types.Events.SyntheticNetworkRequest> = {
        args: {
          data: {
            encodedDataLength: partial.transferSize ?? 0,
            decodedBodyLength: partial.resourceSize ?? 0,
            resourceType: partial.resourceType,
            responseHeaders: partial.responseHeaders ?? [],
          },
        },
      };
      return request as Types.Events.SyntheticNetworkRequest;
    };

    it('should estimate by resource type compression ratio when no network info available', () => {
      assert.strictEqual(estimate(undefined, 1000, Protocol.Network.ResourceType.Stylesheet), 200);
      assert.strictEqual(estimate(undefined, 1000, Protocol.Network.ResourceType.Script), 330);
      assert.strictEqual(estimate(undefined, 1000, Protocol.Network.ResourceType.Document), 330);
      assert.strictEqual(estimate(undefined, 1000, Protocol.Network.ResourceType.Other), 500);
    });

    it('should return transferSize when asset matches and is encoded', () => {
      const resourceType = Protocol.Network.ResourceType.Stylesheet;
      const request = makeRequest({transferSize: 1234, resourceSize: 10000, resourceType, responseHeaders: encoding});
      const result = estimate(request, 10000, resourceType);
      assert.strictEqual(result, 1234);
    });

    it('should return resourceSize when asset matches and is not encoded', () => {
      const resourceType = Protocol.Network.ResourceType.Stylesheet;
      const request = makeRequest({transferSize: 1235, resourceSize: 1234, resourceType, responseHeaders: []});
      const result = estimate(request, 10000, resourceType);
      assert.strictEqual(result, 1234);
    });

    // Ex: JS script embedded in HTML response.
    it('should estimate by network compression ratio when asset does not match', () => {
      const resourceType = Protocol.Network.ResourceType.Other;
      const request = makeRequest({resourceSize: 2000, transferSize: 1000, resourceType, responseHeaders: encoding});
      const result = estimate(request, 100, Protocol.Network.ResourceType.Script);
      assert.strictEqual(result, 50);
    });

    it('should not error when missing resource size', () => {
      const resourceType = Protocol.Network.ResourceType.Other;
      const request = makeRequest({transferSize: 1000, resourceType, responseHeaders: []});
      const result = estimate(request, 100, Protocol.Network.ResourceType.Script);
      assert.strictEqual(result, 33);  // uses default compression ratio.
    });

    it('should not error when resource size is 0', () => {
      const resourceType = Protocol.Network.ResourceType.Other;
      const request = makeRequest({transferSize: 1000, resourceSize: 0, resourceType, responseHeaders: []});
      const result = estimate(request, 100, Protocol.Network.ResourceType.Script);
      assert.strictEqual(result, 33);  // uses default compression ratio.
    });
  });

  describe('insightBounds', () => {
    const INSIGHT_SET_BOUNDS = microsecondsTraceWindow(0, 1_000);

    it('uses the bounds of the overlays', async () => {
      const fakeInsight = {
        createOverlays(): Types.Overlays.Overlay[] {
          return [{
            type: 'TIME_RANGE',
            bounds: microsecondsTraceWindow(100, 500),
            label: 'test',
            showDuration: true,
          }];
        },
      } as unknown as Insights.Types.InsightModel;
      const bounds = Insights.Common.insightBounds(fakeInsight, INSIGHT_SET_BOUNDS);
      assert.deepEqual(bounds, microsecondsTraceWindow(100, 500));
    });

    it('merges the bounds of two overlays', async () => {
      const fakeInsight = {
        createOverlays(): Types.Overlays.Overlay[] {
          return [
            {
              type: 'TIME_RANGE',
              bounds: microsecondsTraceWindow(100, 500),
              label: 'test',
              showDuration: true,
            },
            {
              type: 'TIME_RANGE',
              bounds: microsecondsTraceWindow(50, 400),
              label: 'test',
              showDuration: true,
            },
          ];
        },
      } as unknown as Insights.Types.InsightModel;
      const bounds = Insights.Common.insightBounds(fakeInsight, INSIGHT_SET_BOUNDS);
      assert.deepEqual(bounds, microsecondsTraceWindow(50, 500));
    });

    it('falls back to the set bounds if there are no overlays', async () => {
      const fakeInsight = {
        createOverlays(): Types.Overlays.Overlay[] {
          return [];
        },
      } as unknown as Insights.Types.InsightModel;
      const bounds = Insights.Common.insightBounds(fakeInsight, INSIGHT_SET_BOUNDS);
      assert.deepEqual(bounds, INSIGHT_SET_BOUNDS);
    });
  });

  describe('#metricSavingsForWastedBytes', () => {
    it('applies byte savings to the final response of a redirected request', () => {
      const rawRequest = {args: {data: {requestId: 'req-1'}}} as unknown as Types.Events.SyntheticNetworkRequest;
      const finalRequest = {
        requestId: 'req-1:redirect',
        url: 'https://example.com/final.js',
        protocol: 'http/1.1',
        parsedURL: {scheme: 'https', host: 'example.com', securityOrigin: 'https://example.com'},
        transferSize: 100_000,
        rendererStartTime: 10,
        networkEndTime: 100,
        connectionId: 1,
        rawRequest,
      } as unknown as Trace.Lantern.Types.NetworkRequest;
      const redirectStub = {
        requestId: 'req-1',
        url: 'https://example.com/redirect.js',
        protocol: 'http/1.1',
        parsedURL: {scheme: 'https', host: 'example.com', securityOrigin: 'https://example.com'},
        transferSize: 400,
        rendererStartTime: 0,
        networkEndTime: 10,
        connectionId: 1,
        redirectDestination: finalRequest,
        rawRequest,
      } as unknown as Trace.Lantern.Types.NetworkRequest;
      finalRequest.redirectSource = redirectStub;
      finalRequest.redirects = [redirectStub];

      const redirectNode = new Trace.Lantern.Graph.NetworkNode(redirectStub);
      const finalNode = new Trace.Lantern.Graph.NetworkNode(finalRequest);
      redirectNode.addDependent(finalNode);

      const simulator = new Trace.Lantern.Simulation.Simulator({
        rtt: 100,
        throughput: 1_000_000,
        observedThroughput: 1_000_000,
      });

      const context = {
        navigation: {} as Types.Events.NavigationStart,
        lantern: {
          simulator,
          metrics: {
            firstContentfulPaint: {optimisticGraph: redirectNode},
            largestContentfulPaint: {optimisticGraph: redirectNode},
          },
        },
      } as unknown as Insights.Types.InsightSetContext;

      const savings = metricSavingsForWastedBytes(new Map([['req-1', 90_000]]), context);
      assert.isAbove(savings?.FCP ?? 0, 500);
      assert.isAbove(savings?.LCP ?? 0, 500);
      assert.strictEqual(finalRequest.transferSize, 100_000);
    });
  });
});
