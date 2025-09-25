// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import type * as Trace from '../../trace/trace.js';
import {AgentFocus, PerformanceInsightFormatter} from '../ai_assistance.js';

describeWithEnvironment('PerformanceInsightFormatter', () => {
  let snapshotTester: SnapshotTester;
  before(async () => {
    snapshotTester = new SnapshotTester(import.meta);
    await snapshotTester.load();
  });

  after(async () => {
    await snapshotTester.finish();
  });

  it('gracefully handles the insight being an error', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    // Although our types don't show it, Insights can end up as Errors if there
    // is an issue in the processing stage.
    const errorInsight = new Error() as unknown as Trace.Insights.Types.InsightModel;
    const focus = AgentFocus.fromParsedTrace(parsedTrace);
    const formatter = new PerformanceInsightFormatter(focus, errorInsight);
    assert.isFalse(formatter.insightIsSupported());
    assert.doesNotThrow(() => formatter.formatInsight());
  });

  describe('LCP breakdown', () => {
    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      assert.isOk(insight.lcpRequest);
      snapshotTester.assert(this, output);
    });

    it('formats correctly when the LCP is text based and has no load delay or time phases', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  it('formats correctly when the LCP image has nodeName', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'dpr.json.gz');
    assert.isOk(parsedTrace.insights);
    const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);
    const focus = AgentFocus.fromParsedTrace(parsedTrace);

    const formatter = new PerformanceInsightFormatter(focus, insight);
    const output = formatter.formatInsight();
    snapshotTester.assert(this, output);
  });

  describe('Render blocking requests', () => {
    it('tells the LLM if there are no render blocking requests', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'bad-document-request-latency.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('RenderBlocking', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'render-blocking-requests.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('RenderBlocking', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes correctly when there are no layout shifts', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'render-blocking-requests.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CLSCulprits', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('outputs information on non-composited animations', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'layout-shifts-with-animation-culprit.json.gz');

      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CLSCulprits', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('INP breakdown', () => {
    it('serializes the correct details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
      assert.isOk(parsedTrace.insights);
      const insight = getInsightOrError('INPBreakdown', parsedTrace.insights);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when requests are using legacy http', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'http1.1.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ModernHTTP', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });

  describe('DomSize', () => {
    it('serializes correctly when there are no results', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('DOMSize', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details showing DOM issues', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'dom-size.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('DOMSize', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes no details if there is no duplicate javascript', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('DuplicatedJavaScript', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when modules contain legacy javascript', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'yahoo-news.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LegacyJavaScript', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when problems are found with font display', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'font-display.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('FontDisplay', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when there are images that can be optimized', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'image-delivery.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ImageDelivery', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when there are problems found in the network dependency tree', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'forced-reflow.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ForcedReflow', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when there are problems found in the network dependency tree', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-multiple-frames.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('NetworkDependencyTree', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details when CSS selectors are found', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'selector-stats.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('SlowCSSSelector', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes 3rd party scripts correctly', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('ThirdParties', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details showing cache problems', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('Cache', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
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
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });

    it('serializes the correct details showing viewport problems on mobile', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      assert.isOk(parsedTrace.insights);
      const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('Viewport', parsedTrace.insights, firstNav);
      const focus = AgentFocus.fromParsedTrace(parsedTrace);

      const formatter = new PerformanceInsightFormatter(focus, insight);
      const output = formatter.formatInsight();
      snapshotTester.assert(this, output);
    });
  });
});
