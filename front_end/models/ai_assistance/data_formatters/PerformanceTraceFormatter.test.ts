// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as Trace from '../../../models/trace/trace.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import type * as Workspace from '../../workspace/workspace.js';
import {AICallTree, AIContext, PerformanceTraceFormatter} from '../ai_assistance.js';

async function createFormatter(context: Mocha.Context|Mocha.Suite|null, name: string): Promise<
    {formatter: PerformanceTraceFormatter.PerformanceTraceFormatter, parsedTrace: Trace.TraceModel.ParsedTrace}> {
  const parsedTrace = await TraceLoader.traceEngine(context, name, undefined, {
    withTimelinePanel: false,
  });
  assert.isOk(parsedTrace.insights);
  const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);
  const formatter = new PerformanceTraceFormatter.PerformanceTraceFormatter(focus);
  // Don't need an implementation, gonna mock it anyway.
  formatter.resolveFunctionCode = async () => {
    return null;
  };
  stubResolveFunctionCode(formatter);
  return {formatter, parsedTrace};
}

// We don't have real UISourceCodes, so stub resolveFunctionCode.
function stubResolveFunctionCode(formatter: PerformanceTraceFormatter.PerformanceTraceFormatter) {
  sinon.stub(formatter, 'resolveFunctionCode')
      .callsFake(async (url: Platform.DevToolsPath.UrlString, line: number, column: number) => {
        if (line === -1 || column === -1) {
          return null;
        }

        const range = new TextUtils.TextRange.TextRange(line, column, line + 3, 10);
        const code = `() => { /* some code from ${url}... */ }`;
        return {
          functionBounds: {
            uiSourceCode: {
              url() {
                return url;
              }
            } as Workspace.UISourceCode.UISourceCode,
            range,
            name: '',
          },
          range,
          rangeWithContext: new TextUtils.TextRange.TextRange(Math.max(line - 3, 0), 0, line + 6, 0),
          code,
          codeWithContext: `// context ...\n\n${code}\n\n// context ...`,
          text: new TextUtils.Text.Text(''),
        };
      });
}

describe('PerformanceTraceFormatter', function() {
  setupLocaleHooks();
  setupRuntimeHooks();
  setupSettingsHooks();

  const snapshotTester = new SnapshotTester(this, import.meta);

  describe('formatTraceSummary', () => {
    it('web-dev.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'web-dev.json.gz');
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    it('yahoo-news.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'yahoo-news.json.gz');
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz');
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    it('deals with CrUX manager errors', async function() {
      const {formatter} = await createFormatter(this, 'image-delivery.json.gz');
      sinon.stub(CrUXManager.CrUXManager, 'instance').callsFake(() => {
        throw new Error('something went wrong with CrUX Manager');
      });
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    // This one has field data.
    it('image-delivery.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'image-delivery.json.gz');
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    it('includes INP insight when there is no navigation', async function() {
      const {formatter} = await createFormatter(this, 'slow-interaction-button-click.json.gz');
      const output = formatter.formatTraceSummary();
      assert.include(output, 'INP: 139 ms');
      assert.include(output, 'insight name: INPBreakdown');
      snapshotTester.assert(this, output);
    });
  });

  describe('formatCriticalRequests', () => {
    it('render-blocking-requests.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'render-blocking-requests.json.gz');
      const output = await formatter.formatCriticalRequests();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz');
      const output = await formatter.formatCriticalRequests();
      snapshotTester.assert(this, output);
    });
  });

  describe('formatLongestTasks', () => {
    it('long-task-from-worker-thread.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'long-task-from-worker-thread.json.gz');
      const output = await formatter.formatLongestTasks();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz');
      const output = await formatter.formatLongestTasks();
      snapshotTester.assert(this, output);
    });
  });

  describe('formatMainThreadBottomUpSummary', () => {
    it('yahoo-news.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'yahoo-news.json.gz');
      const output = await formatter.formatMainThreadBottomUpSummary();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz');
      const output = await formatter.formatMainThreadBottomUpSummary();
      snapshotTester.assert(this, output);
    });
  });

  describe('formatThirdPartySummary', () => {
    it('yahoo-news.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'yahoo-news.json.gz');
      const output = await formatter.formatThirdPartySummary();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz');
      const output = await formatter.formatThirdPartySummary();
      snapshotTester.assert(this, output);
    });
  });

  it('formatMainThreadTrackSummary', async function() {
    const {formatter, parsedTrace} = await createFormatter(this, 'yahoo-news.json.gz');
    const min = parsedTrace.data.Meta.traceBounds.min;
    const max =
        parsedTrace.data.Meta.traceBounds.min + parsedTrace.data.Meta.traceBounds.range / 2 as Trace.Types.Timing.Micro;
    const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max);
    const output = await formatter.formatMainThreadTrackSummary(bounds);
    snapshotTester.assert(this, output);
  });

  it('formatNetworkTrackSummary', async function() {
    const {formatter, parsedTrace} = await createFormatter(this, 'yahoo-news.json.gz');
    // Just check the first 300 ms.
    const min = parsedTrace.data.Meta.traceBounds.min;
    const max = (parsedTrace.data.Meta.traceBounds.min +
                 Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(300))) as Trace.Types.Timing.Micro;
    const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max);
    const output = formatter.formatNetworkTrackSummary(bounds);
    snapshotTester.assert(this, output);
  });

  describe('formatCallTree', () => {
    it('long-task-from-worker-thread.json.gz', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'long-task-from-worker-thread.json.gz');
      const event = new Trace.EventsSerializer.EventsSerializer().eventForKey('r-62', parsedTrace);
      const tree = AICallTree.AICallTree.fromEvent(event, parsedTrace);
      assert.exists(tree);
      const output = await formatter.formatCallTree(tree);
      snapshotTester.assert(this, output);
    });

    it('web-dev.json.gz', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'web-dev.json.gz');
      const event = new Trace.EventsSerializer.EventsSerializer().eventForKey(
          'p-73704-775-2074-418' as Trace.Types.File.SerializableKey, parsedTrace);
      const tree = AICallTree.AICallTree.fromEvent(event, parsedTrace);
      assert.exists(tree);
      const output = await formatter.formatCallTree(tree);
      snapshotTester.assert(this, output);
    });
  });

  describe('formatNetworkRequests', () => {
    it('formats network requests that have redirects', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'bad-document-request-latency.json.gz');
      const requestUrl = 'http://localhost:3000/redirect3';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = formatter.formatNetworkRequests([request], {verbose: true});
      snapshotTester.assert(this, output);
    });

    it('formats network requests in verbose mode', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = formatter.formatNetworkRequests([request], {verbose: true});
      snapshotTester.assert(this, output);
    });

    it('defaults to verbose mode when 1 request and verbose option is not defined', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'lcp-images.json.gz');
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = formatter.formatNetworkRequests([request]);
      snapshotTester.assert(this, output);
    });

    it('formats in compressed mode if a request is duplicated in the array', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'bad-document-request-latency.json.gz');
      const requests = parsedTrace.data.NetworkRequests.byTime;
      // Duplicate request so that the compressed format is used
      const output = formatter.formatNetworkRequests([requests[0], requests[0]]);
      snapshotTester.assert(this, output);
    });

    it('correctly formats an initiator chain for network-requests-initiators trace', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'network-requests-initiators.json.gz');
      const request = parsedTrace.data.NetworkRequests.byTime;
      assert.isOk(request);
      const output = formatter.formatNetworkRequests(request);
      snapshotTester.assert(this, output);
    });
  });
});
