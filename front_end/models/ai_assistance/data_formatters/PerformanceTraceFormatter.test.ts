// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {AgentFocus, AICallTree, PerformanceTraceFormatter} from '../ai_assistance.js';

async function createFormatter(context: Mocha.Context|Mocha.Suite|null, name: string):
    Promise<{formatter: PerformanceTraceFormatter, parsedTrace: Trace.TraceModel.ParsedTrace}> {
  const parsedTrace = await TraceLoader.traceEngine(context, name);
  assert.isOk(parsedTrace.insights);
  const focus = AgentFocus.fromParsedTrace(parsedTrace);
  const formatter = new PerformanceTraceFormatter(focus);
  return {formatter, parsedTrace};
}

describeWithEnvironment('PerformanceTraceFormatter', () => {
  let snapshotTester: SnapshotTester;
  before(async () => {
    snapshotTester = new SnapshotTester(import.meta);
    await snapshotTester.load();
  });

  after(async () => {
    await snapshotTester.finish();
  });

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

  it('formatCriticalRequests', async function() {
    const {formatter} = await createFormatter(this, 'render-blocking-requests.json.gz');
    const output = formatter.formatCriticalRequests();
    snapshotTester.assert(this, output);
  });

  it('formatLongestTasks', async function() {
    const {formatter} = await createFormatter(this, 'long-task-from-worker-thread.json.gz');
    const output = formatter.formatLongestTasks();
    snapshotTester.assert(this, output);
  });

  it('formatMainThreadBottomUpSummary', async function() {
    const {formatter} = await createFormatter(this, 'yahoo-news.json.gz');
    const output = formatter.formatMainThreadBottomUpSummary();
    snapshotTester.assert(this, output);
  });

  it('formatThirdPartySummary', async function() {
    const {formatter} = await createFormatter(this, 'yahoo-news.json.gz');
    const output = formatter.formatThirdPartySummary();
    snapshotTester.assert(this, output);
  });

  it('formatMainThreadTrackSummary', async function() {
    const {formatter, parsedTrace} = await createFormatter(this, 'yahoo-news.json.gz');
    const min = parsedTrace.data.Meta.traceBounds.min;
    const max =
        parsedTrace.data.Meta.traceBounds.min + parsedTrace.data.Meta.traceBounds.range / 2 as Trace.Types.Timing.Micro;
    const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max);
    const output = formatter.formatMainThreadTrackSummary(bounds);
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

  it('formatCallTree', async function() {
    const {formatter, parsedTrace} = await createFormatter(this, 'long-task-from-worker-thread.json.gz');
    const event = new Trace.EventsSerializer.EventsSerializer().eventForKey('r-62', parsedTrace);
    const tree = AICallTree.fromEvent(event, parsedTrace);
    assert.exists(tree);
    const output = formatter.formatCallTree(tree);
    snapshotTester.assert(this, output);
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
