// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as Lantern from '../lantern.js';
import {getComputationDataFromFixture} from '../testing/testing.js';

const {FirstContentfulPaint, LargestContentfulPaint} = Lantern.Metrics;

describe('Metrics: Lantern LCP', function() {
  setupLocaleHooks();
  it('should compute predicted value', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lantern/paul/trace.json.gz');
    const data = await getComputationDataFromFixture(this, {parsedTrace});
    const result = LargestContentfulPaint.compute(data, {
      fcpResult: FirstContentfulPaint.compute(data),
    });

    assert.deepEqual({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
      optimisticNodeTimings: result.optimisticEstimate.nodeTimings.size,
      pessimisticNodeTimings: result.pessimisticEstimate.nodeTimings.size,
    },
                     {
                       timing: 1066,
                       optimistic: 1066,
                       pessimistic: 1066,
                       optimisticNodeTimings: 3,
                       pessimisticNodeTimings: 3,
                     });
    assert.isOk(result.optimisticGraph, 'should have created optimistic graph');
    assert.isOk(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute LCP equal to FCP when text LCP occurs in the same frame as FCP', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-text-fcp-same-frame.json.gz');
    const data = await getComputationDataFromFixture(this, {parsedTrace});
    const fcpResult = FirstContentfulPaint.compute(data);
    const lcpResult = LargestContentfulPaint.compute(data, {fcpResult});

    assert.strictEqual(data.processedNavigation.timestamps.firstContentfulPaint,
                       data.processedNavigation.timestamps.largestContentfulPaint);
    assert.strictEqual(data.processedNavigation.largestContentfulPaintEvt?.args.data?.type, 'text');
    assert.deepEqual({
      timing: Math.round(lcpResult.timing),
      optimistic: Math.round(lcpResult.optimisticEstimate.timeInMs),
      pessimistic: Math.round(lcpResult.pessimisticEstimate.timeInMs),
      optimisticNodeTimings: lcpResult.optimisticEstimate.nodeTimings.size,
      pessimisticNodeTimings: lcpResult.pessimisticEstimate.nodeTimings.size,
    },
                     {
                       timing: Math.round(fcpResult.timing),
                       optimistic: Math.round(fcpResult.optimisticEstimate.timeInMs),
                       pessimistic: Math.round(fcpResult.pessimisticEstimate.timeInMs),
                       optimisticNodeTimings: fcpResult.optimisticEstimate.nodeTimings.size,
                       pessimisticNodeTimings: fcpResult.pessimisticEstimate.nodeTimings.size,
                     });
    assert.strictEqual(Math.round(lcpResult.timing), 1109);
  });

  it('should include image resource when image LCP occurs at the same timestamp as FCP', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lantern/render-blocking/trace.json.gz');
    const data = await getComputationDataFromFixture(this, {parsedTrace});
    const fcpResult = FirstContentfulPaint.compute(data);
    const lcpResult = LargestContentfulPaint.compute(data, {fcpResult});

    assert.strictEqual(data.processedNavigation.timestamps.firstContentfulPaint,
                       data.processedNavigation.timestamps.largestContentfulPaint);
    assert.strictEqual(data.processedNavigation.largestContentfulPaintEvt?.args.data?.type, 'image');
    assert.isAbove(lcpResult.timing, fcpResult.timing);
  });

  describe('optimistic critical-path graph for image LCP', () => {
    const {NetworkNode, CPUNode} = Lantern.Graph;
    const {Simulator} = Lantern.Simulation;

    function createNetworkNode(overrides: Partial<Lantern.Types.NetworkRequest>&{
      requestId: string,
      url: string,
    }): Lantern.Graph.NetworkNode {
      const parsed = new URL(overrides.url);
      return new NetworkNode({
        connectionId: 1,
        connectionReused: true,
        protocol: 'h2',
        parsedURL: {
          scheme: parsed.protocol.replace(':', ''),
          host: parsed.hostname,
          securityOrigin: parsed.origin,
        },
        documentURL: 'https://example.com/',
        rendererStartTime: 0,
        networkRequestTime: 0,
        responseHeadersEndTime: 100,
        networkEndTime: 200,
        transferSize: 10_000,
        resourceSize: 10_000,
        fromDiskCache: false,
        fromMemoryCache: false,
        isLinkPreload: false,
        finished: true,
        failed: false,
        statusCode: 200,
        initiator: {type: 'parser'},
        mimeType: 'application/octet-stream',
        priority: 'High',
        frameId: 'MAIN_FRAME',
        fromWorker: false,
        ...overrides,
      });
    }

    function collectNodeIds(root: Lantern.Graph.Node): string[] {
      const ids: string[] = [];
      root.traverse(node => ids.push(node.id));
      return ids;
    }

    it('excludes unrelated non-blocking module scripts and fetches from optimisticGraph while keeping pessimisticGraph intact',
       () => {
         const doc = createNetworkNode({
           requestId: 'doc',
           url: 'https://example.com/',
           resourceType: 'Document',
           priority: 'VeryHigh',
           rendererStartTime: 0,
           networkEndTime: 100,
         });
         doc.setIsMainDocument(true);

         const blockingCss = createNetworkNode({
           requestId: 'css',
           url: 'https://example.com/app.css',
           resourceType: 'Stylesheet',
           priority: 'VeryHigh',
           renderBlocking: 'blocking',
           rendererStartTime: 100,
           networkEndTime: 200,
         });
         doc.addDependent(blockingCss);

         const lcpImage = createNetworkNode({
           requestId: 'hero',
           url: 'https://example.com/hero.jpg',
           resourceType: 'Image',
           priority: 'High',
           renderBlocking: 'non_blocking',
           rendererStartTime: 100,
           networkEndTime: 400,
         });
         doc.addDependent(lcpImage);

         const moduleScript = createNetworkNode({
           requestId: 'mod',
           url: 'https://example.com/app.mjs',
           resourceType: 'Script',
           priority: 'High',
           renderBlocking: 'non_blocking',
           rendererStartTime: 100,
           networkEndTime: 350,
         });
         doc.addDependent(moduleScript);

         const evalModuleCpu = new CPUNode(
             {name: 'RunTask', tid: 1, pid: 1, ts: 360_000, dur: 50_000, args: {}},
             [{
               name: 'v8.evaluateModule',
               tid: 1,
               pid: 1,
               ts: 360_000,
               dur: 50_000,
               args: {data: {url: 'https://example.com/app.mjs'}},
             }],
         );
         moduleScript.addDependent(evalModuleCpu);

         const apiFetch = createNetworkNode({
           requestId: 'fetch',
           url: 'https://example.com/api/data',
           resourceType: 'Fetch',
           priority: 'High',
           initiator: {type: 'script', url: 'https://example.com/app.mjs'},
           rendererStartTime: 380,
           networkEndTime: 480,
         });
         evalModuleCpu.addDependent(apiFetch);

         const processedNavigation: Lantern.Types.Simulation.ProcessedNavigation = {
           timestamps: {
             firstContentfulPaint: 250_000,
             largestContentfulPaint: 500_000,
           },
           largestContentfulPaintEvt: {args: {frame: 'MAIN_FRAME', data: {type: 'image'}}},
           lcpRequestId: 'hero',
           lcpImageUrl: 'https://example.com/hero.jpg',
         };

         const optimisticGraph = LargestContentfulPaint.getOptimisticGraph(doc, processedNavigation);
         const pessimisticGraph = LargestContentfulPaint.getPessimisticGraph(doc, processedNavigation);

         assert.sameMembers(collectNodeIds(optimisticGraph), ['doc', 'css', 'hero']);
         assert.sameMembers(collectNodeIds(pessimisticGraph), ['doc', 'css', 'hero', 'mod', evalModuleCpu.id, 'fetch']);
       });

    it('retains initiating script and its EvaluateScript CPUNode when LCP image is script-initiated', () => {
      const doc = createNetworkNode({
        requestId: 'doc',
        url: 'https://example.com/',
        resourceType: 'Document',
        priority: 'VeryHigh',
        rendererStartTime: 0,
        networkEndTime: 100,
      });
      doc.setIsMainDocument(true);

      const heroLoaderScript = createNetworkNode({
        requestId: 'loader',
        url: 'https://example.com/loader.js',
        resourceType: 'Script',
        priority: 'High',
        renderBlocking: 'non_blocking',
        rendererStartTime: 100,
        networkEndTime: 250,
      });
      doc.addDependent(heroLoaderScript);

      const loaderCpu = new CPUNode(
          {name: 'RunTask', tid: 1, pid: 1, ts: 260_000, dur: 40_000, args: {}},
          [{
            name: 'EvaluateScript',
            tid: 1,
            pid: 1,
            ts: 260_000,
            dur: 40_000,
            args: {data: {url: 'https://example.com/loader.js'}},
          }],
      );
      heroLoaderScript.addDependent(loaderCpu);

      const lcpImage = createNetworkNode({
        requestId: 'hero',
        url: 'https://example.com/hero.jpg',
        resourceType: 'Image',
        priority: 'High',
        initiator: {type: 'script', url: 'https://example.com/loader.js'},
        rendererStartTime: 280,
        networkEndTime: 450,
      });
      heroLoaderScript.addDependent(lcpImage);

      const unrelatedScript = createNetworkNode({
        requestId: 'analytics',
        url: 'https://example.com/analytics.js',
        resourceType: 'Script',
        priority: 'Low',
        renderBlocking: 'non_blocking',
        rendererStartTime: 100,
        networkEndTime: 300,
      });
      doc.addDependent(unrelatedScript);

      const processedNavigation: Lantern.Types.Simulation.ProcessedNavigation = {
        timestamps: {
          firstContentfulPaint: 150_000,
          largestContentfulPaint: 500_000,
        },
        largestContentfulPaintEvt: {args: {frame: 'MAIN_FRAME', data: {type: 'image'}}},
        lcpImageUrl: 'https://example.com/hero.jpg',
      };

      const optimisticGraph = LargestContentfulPaint.getOptimisticGraph(doc, processedNavigation);
      assert.sameMembers(collectNodeIds(optimisticGraph), ['doc', 'loader', loaderCpu.id, 'hero']);
    });

    it('retains a low-priority (lazy-loaded) LCP image in optimisticGraph and optimisticEstimate', () => {
      const doc = createNetworkNode({
        requestId: 'doc',
        url: 'https://example.com/',
        resourceType: 'Document',
        priority: 'VeryHigh',
        transferSize: 5_000,
        rendererStartTime: 0,
        networkEndTime: 100,
      });
      doc.setIsMainDocument(true);

      const lazyLcpImage = createNetworkNode({
        requestId: 'lazy-hero',
        url: 'https://example.com/lazy-hero.jpg',
        resourceType: 'Image',
        priority: 'Low',
        transferSize: 200_000,
        rendererStartTime: 100,
        networkEndTime: 400,
      });
      doc.addDependent(lazyLcpImage);

      const offscreenImage = createNetworkNode({
        requestId: 'offscreen',
        url: 'https://example.com/offscreen.jpg',
        resourceType: 'Image',
        priority: 'Low',
        transferSize: 200_000,
        rendererStartTime: 100,
        networkEndTime: 450,
      });
      doc.addDependent(offscreenImage);

      const simulator = new Simulator({observedThroughput: 240_000, rtt: 150, throughput: 1_600_000});
      const processedNavigation: Lantern.Types.Simulation.ProcessedNavigation = {
        timestamps: {
          firstContentfulPaint: 150_000,
          largestContentfulPaint: 500_000,
        },
        largestContentfulPaintEvt: {args: {frame: 'MAIN_FRAME', data: {type: 'image'}}},
        lcpRequestId: 'lazy-hero',
      };

      const data = {simulator, graph: doc, processedNavigation};
      const fcpResult = FirstContentfulPaint.compute(data);
      const lcpResult = LargestContentfulPaint.compute(data, {fcpResult});

      assert.sameMembers(collectNodeIds(lcpResult.optimisticGraph), ['doc', 'lazy-hero']);
      assert.isAbove(lcpResult.optimisticEstimate.timeInMs, fcpResult.optimisticEstimate.timeInMs);
    });
  });
});
