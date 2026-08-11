// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Platform from '../../../core/platform/platform.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as Trace from '../../../models/trace/trace.js';
import {deinitializeGlobalVars} from '../../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import {
  createTraceExtensionDataFromPerformanceAPITestInput,
  getBaseTraceHandlerData,
  type PerformanceAPIExtensionTestData,
} from '../../../testing/TraceHelpersCore.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import type * as Workspace from '../../workspace/workspace.js';
import {AICallTree, AIContext, PerformanceTraceFormatter} from '../ai_assistance.js';

async function createFormatter(
    context: Mocha.Context|Mocha.Suite|null,
    name: string,
    cruxManager: CrUXManager.CrUXManager,
    ):
    Promise<
        {formatter: PerformanceTraceFormatter.PerformanceTraceFormatter, parsedTrace: Trace.TraceModel.ParsedTrace}> {
  const parsedTrace = await TraceLoader.traceEngine(context, name, undefined, {
    withTimelinePanel: false,
  });
  assert.isOk(parsedTrace.insights);
  const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);
  const formatter = new PerformanceTraceFormatter.PerformanceTraceFormatter(focus, null, cruxManager);
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
              },
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

  const snapshotTester = new SnapshotTester(this, import.meta);

  let cruxManager: CrUXManager.CrUXManager;

  beforeEach(() => {
    const universe = new TestUniverse();
    cruxManager = universe.cruxManager;
    sinon.stub(CrUXManager.CrUXManager, 'instance').returns(cruxManager);
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  describe('formatTraceSummary', () => {
    it('web-dev.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'web-dev.json.gz', cruxManager);
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    it('yahoo-news.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'yahoo-news.json.gz', cruxManager);
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz', cruxManager);
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    it('deals with CrUX manager errors', async function() {
      sinon.stub(cruxManager, 'getSelectedScope').throws(new Error('something went wrong with CrUX Manager'));
      const {formatter} = await createFormatter(this, 'image-delivery.json.gz', cruxManager);
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    // This one has field data.
    it('image-delivery.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'image-delivery.json.gz', cruxManager);
      const output = formatter.formatTraceSummary();
      snapshotTester.assert(this, output);
    });

    it('includes INP insight when there is no navigation', async function() {
      const {formatter} = await createFormatter(this, 'slow-interaction-button-click.json.gz', cruxManager);
      const output = formatter.formatTraceSummary();
      assert.include(output, 'INP: 139 ms');
      assert.include(output, 'insight name: INPBreakdown');
      snapshotTester.assert(this, output);
    });

    it('includes LCP insight of the provided deviceScope', async function() {
      const {parsedTrace} = await createFormatter(this, 'crux.json.gz', cruxManager);
      const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);

      // Test PHONE scope (LCP is 1082 in crux.json.gz)
      const phoneFormatter = new PerformanceTraceFormatter.PerformanceTraceFormatter(focus, 'PHONE', cruxManager);
      const phoneOutput = phoneFormatter.formatTraceSummary();
      assert.include(phoneOutput, 'LCP: 1082 ms');

      // Test DESKTOP scope (LCP is 883 in crux.json.gz)
      const desktopFormatter = new PerformanceTraceFormatter.PerformanceTraceFormatter(focus, 'DESKTOP', cruxManager);
      const desktopOutput = desktopFormatter.formatTraceSummary();
      assert.include(desktopOutput, 'LCP: 883 ms');
    });
  });

  describe('formatCriticalRequests', () => {
    it('render-blocking-requests.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'render-blocking-requests.json.gz', cruxManager);
      const output = await formatter.formatCriticalRequests();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz', cruxManager);
      const output = await formatter.formatCriticalRequests();
      snapshotTester.assert(this, output);
    });
  });

  describe('formatLongestTasks', () => {
    it('long-task-from-worker-thread.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'long-task-from-worker-thread.json.gz', cruxManager);
      const output = await formatter.formatLongestTasks();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz', cruxManager);
      const output = await formatter.formatLongestTasks();
      snapshotTester.assert(this, output);
    });
  });

  describe('formatMainThreadBottomUpSummary', () => {
    it('yahoo-news.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'yahoo-news.json.gz', cruxManager);
      const output = await formatter.formatMainThreadBottomUpSummary();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz', cruxManager);
      const output = await formatter.formatMainThreadBottomUpSummary();
      snapshotTester.assert(this, output);
    });
  });

  describe('formatThirdPartySummary', () => {
    it('yahoo-news.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'yahoo-news.json.gz', cruxManager);
      const output = await formatter.formatThirdPartySummary();
      snapshotTester.assert(this, output);
    });

    it('multiple-navigations-render-blocking.json.gz', async function() {
      const {formatter} = await createFormatter(this, 'multiple-navigations-render-blocking.json.gz', cruxManager);
      const output = await formatter.formatThirdPartySummary();
      snapshotTester.assert(this, output);
    });
  });

  it('formatMainThreadTrackSummary', async function() {
    const {formatter, parsedTrace} = await createFormatter(this, 'yahoo-news.json.gz', cruxManager);
    const min = parsedTrace.data.Meta.traceBounds.min;
    const max =
        parsedTrace.data.Meta.traceBounds.min + parsedTrace.data.Meta.traceBounds.range / 2 as Trace.Types.Timing.Micro;
    const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max);
    const output = await formatter.formatMainThreadTrackSummary(bounds);
    snapshotTester.assert(this, output);
  });

  it('formatNetworkTrackSummary', async function() {
    const {formatter, parsedTrace} = await createFormatter(this, 'yahoo-news.json.gz', cruxManager);
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
      const {formatter, parsedTrace} = await createFormatter(this, 'long-task-from-worker-thread.json.gz', cruxManager);
      const event = new Trace.EventsSerializer.EventsSerializer().eventForKey('r-62', parsedTrace);
      const tree = AICallTree.AICallTree.fromEvent(event, parsedTrace);
      assert.exists(tree);
      const output = await formatter.formatCallTree(tree);
      snapshotTester.assert(this, output);
    });

    it('web-dev.json.gz', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'web-dev.json.gz', cruxManager);
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
      const {formatter, parsedTrace} = await createFormatter(this, 'bad-document-request-latency.json.gz', cruxManager);
      const requestUrl = 'http://localhost:3000/redirect3';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = formatter.formatNetworkRequests([request], {verbose: true});
      snapshotTester.assert(this, output);
    });

    it('formats network requests in verbose mode', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'lcp-images.json.gz', cruxManager);
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = formatter.formatNetworkRequests([request], {verbose: true});
      snapshotTester.assert(this, output);
    });

    it('defaults to verbose mode when 1 request and verbose option is not defined', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'lcp-images.json.gz', cruxManager);
      const requestUrl = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800';
      const request = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === requestUrl);
      assert.isOk(request);
      const output = formatter.formatNetworkRequests([request]);
      snapshotTester.assert(this, output);
    });

    it('formats in compressed mode if a request is duplicated in the array', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'bad-document-request-latency.json.gz', cruxManager);
      const requests = parsedTrace.data.NetworkRequests.byTime;
      // Duplicate request so that the compressed format is used
      const output = formatter.formatNetworkRequests([requests[0], requests[0]]);
      snapshotTester.assert(this, output);
    });

    it('correctly formats an initiator chain for network-requests-initiators trace', async function() {
      const {formatter, parsedTrace} = await createFormatter(this, 'network-requests-initiators.json.gz', cruxManager);
      const request = parsedTrace.data.NetworkRequests.byTime;
      assert.isOk(request);
      const output = formatter.formatNetworkRequests(request);
      snapshotTester.assert(this, output);
    });
  });

  describe('custom tracks', () => {
    async function createFormatterWithExtensionData(extensionData: PerformanceAPIExtensionTestData[]):
        Promise<PerformanceTraceFormatter.PerformanceTraceFormatter> {
      const extensionTraceData = await createTraceExtensionDataFromPerformanceAPITestInput(extensionData);
      const parsedTrace = getBaseTraceHandlerData();
      parsedTrace.insights = new Map();
      (parsedTrace.data as {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ExtensionTraceData: Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData,
      }).ExtensionTraceData = extensionTraceData;

      const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);
      const formatter = new PerformanceTraceFormatter.PerformanceTraceFormatter(focus);
      formatter.resolveFunctionCode = async () => null;
      stubResolveFunctionCode(formatter);
      return formatter;
    }

    it('formats trace summary with custom tracks', async () => {
      const extensionData: PerformanceAPIExtensionTestData[] = [
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              track: 'An extension track',
              properties: [['Description', 'Something']],
            },
          },
          name: 'An extension measurement',
          ts: 100,
          dur: 100,
        },
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              trackGroup: 'Group 1',
              track: 'Track 1',
            },
          },
          name: 'Grouped measurement',
          ts: 200,
          dur: 50,
        },
      ];
      const formatter = await createFormatterWithExtensionData(extensionData);
      const output = formatter.formatTraceSummary();
      assert.include(output, '# Custom tracks');
      assert.include(output, 'Track: An extension track');
      assert.include(output, 'Group: Group 1');
      assert.include(output, 'Track: Track 1');
    });

    it('formats custom track summary', async () => {
      const extensionData: PerformanceAPIExtensionTestData[] = [
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              track: 'An extension track',
              properties: [['Description', 'Something']],
            },
          },
          name: 'An extension measurement',
          ts: 100,
          dur: 100,
        },
        {
          detail: {
            devtools: {
              dataType: 'track-entry',
              trackGroup: 'Group 1',
              track: 'Track 1',
            },
          },
          name: 'Grouped measurement',
          ts: 200,
          dur: 50,
        },
      ];
      const formatter = await createFormatterWithExtensionData(extensionData);
      const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          Trace.Types.Timing.Micro(0),
          Trace.Types.Timing.Micro(500),
      );
      const output = formatter.formatExtensionTrackSummary(bounds);
      assert.include(output, '# Track: An extension track');
      assert.include(output, 'Name: An extension measurement');
      assert.include(output, 'duration: 0.1\u00a0ms');
      assert.include(output, 'properties: {Description: "Something"}');
      assert.include(output, '# Track Group: Group 1');
      assert.include(output, '## Track: Track 1');
      assert.include(output, 'Name: Grouped measurement');
    });
  });

  describe('formatEventForAI', () => {
    it('sanitizes headers for network requests', () => {
      const mockNetworkEvent = {
        name: Trace.Types.Events.Name.SYNTHETIC_NETWORK_REQUEST,
        args: {
          data: {
            responseHeaders: [
              {name: 'x-csrf-token', value: 'secret'},
              {name: 'content-type', value: 'text/html'},
            ],
          },
        },
      } as unknown as Trace.Types.Events.Event;

      const output = PerformanceTraceFormatter.formatEventForAI(mockNetworkEvent);
      const parsed = JSON.parse(output);
      assert.deepEqual(parsed.args.data.responseHeaders, [
        {name: 'x-csrf-token', value: '<redacted>'},
        {name: 'content-type', value: 'text/html'},
      ]);
    });

    it('sanitizes headers for ResourceReceiveResponse events', () => {
      const mockReceiveResponseEvent = {
        name: Trace.Types.Events.Name.RESOURCE_RECEIVE_RESPONSE,
        args: {
          data: {
            headers: [
              {name: 'cookie', value: 'secret'},
              {name: 'accept', value: '*/*'},
            ],
          },
        },
      } as unknown as Trace.Types.Events.Event;

      const output = PerformanceTraceFormatter.formatEventForAI(mockReceiveResponseEvent);
      const parsed = JSON.parse(output);
      assert.deepEqual(parsed.args.data.headers, [
        {name: 'cookie', value: '<redacted>'},
        {name: 'accept', value: '*/*'},
      ]);
    });

    it('redacts script source for RundownScriptSource events', () => {
      const mockRundownEvent = {
        name: 'ScriptCatchup',
        cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
        args: {
          data: {
            isolate: 'isolate-1',
            scriptId: 'script-1',
            length: 100,
            sourceText: 'function secret() { return 42; }',
          },
        },
      } as unknown as Trace.Types.Events.Event;

      const output = PerformanceTraceFormatter.formatEventForAI(mockRundownEvent);
      const parsed = JSON.parse(output);
      assert.isUndefined(parsed.args.data.sourceText);
      assert.deepEqual(parsed.args.data, {
        isolate: 'isolate-1',
        scriptId: 'script-1',
        length: 100,
      });
    });

    it('redacts script source for RundownScriptSourceLarge events', () => {
      const mockRundownLargeEvent = {
        name: 'LargeScriptCatchup',
        cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
        args: {
          data: {
            isolate: 'isolate-1',
            scriptId: 'script-1',
            splitIndex: 0,
            splitCount: 2,
            sourceText: 'function secret() { return 42; }',
          },
        },
      } as unknown as Trace.Types.Events.Event;

      const output = PerformanceTraceFormatter.formatEventForAI(mockRundownLargeEvent);
      const parsed = JSON.parse(output);
      assert.isUndefined(parsed.args.data.sourceText);
      assert.deepEqual(parsed.args.data, {
        isolate: 'isolate-1',
        scriptId: 'script-1',
        splitIndex: 0,
        splitCount: 2,
      });
    });

    it('serializes other events as-is', () => {
      const mockGenericEvent = {
        name: 'generic-event',
        ts: 1234,
        args: {
          data: {
            someProp: 'value',
          },
        },
      } as unknown as Trace.Types.Events.Event;

      const output = PerformanceTraceFormatter.formatEventForAI(mockGenericEvent);
      const parsed = JSON.parse(output);
      assert.deepEqual(parsed, mockGenericEvent);
    });
  });
});
