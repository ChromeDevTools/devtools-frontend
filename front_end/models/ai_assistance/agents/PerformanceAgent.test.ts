// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import {createNetworkRequest, mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  createTarget,
  restoreUserAgentForTesting,
  setUserAgentForTesting,
  updateHostConfig
} from '../../../testing/EnvironmentHelpers.js';
import {getInsightOrError} from '../../../testing/InsightHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Bindings from '../../bindings/bindings.js';
import * as Logs from '../../logs/logs.js';
import type * as SourceMapScopes from '../../source_map_scopes/source_map_scopes.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import * as Trace from '../../trace/trace.js';
import * as Workspace from '../../workspace/workspace.js';
import {
  AiAgent,
  AICallTree,
  AIContext,
  PerformanceAgent,
  PerformanceTraceFormatter,
} from '../ai_assistance.js';

/**
 * Widget data can be huge (e.g. an entire perf trace) and if we snapshot or
 * try to assert on these, it is not useful and also can crash Karma etc with
 * the size of the output.
 */
function deleteAllWidgetData(responses: AiAgent.ResponseData[]): void {
  for (const response of responses) {
    if ('widgets' in response) {
      response.widgets?.forEach(w => {
        // @ts-expect-error
        delete w.data;
      });
    }
  }
}

describeWithMockConnection('PerformanceAgent', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);
  function mockHostConfig(modelId?: string, temperature?: number) {
    updateHostConfig({
      devToolsAiAssistancePerformanceAgent: {
        modelId,
        temperature,
      },
    });
  }

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
  });

  describe('buildRequest', () => {
    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new PerformanceAgent.PerformanceAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new PerformanceAgent.PerformanceAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature,
          1,
      );
    });

    it('structure matches the snapshot', async () => {
      mockHostConfig('test model');
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
      const agent = new PerformanceAgent.PerformanceAgent({
        aidaClient: mockAidaClient([[{explanation: 'answer'}]]),
        serverSideLoggingEnabled: true,
      });

      await Array.fromAsync(agent.run('question', {selected: null}));
      setUserAgentForTesting();

      assert.deepEqual(
          agent.buildRequest(
              {
                text: 'test input',
              },
              Host.AidaClient.Role.USER),
          {
            current_message: {role: Host.AidaClient.Role.USER, parts: [{text: 'test input'}]},
            client: 'CHROME_DEVTOOLS',
            preamble: undefined,
            historical_contexts: [
              {
                role: 1,
                parts: [{text: 'question'}],
              },
              {
                role: 2,
                parts: [{text: 'answer'}],
              },
            ],
            facts: undefined,
            metadata: {
              disable_user_content_logging: false,
              string_session_id: 'sessionId',
              user_tier: 3,
              client_version: 'unit_test',
            },
            options: {
              model_id: 'test model',
              temperature: undefined,
            },
            client_feature: Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_FULL_AGENT,
            functionality_type: 1,
          },
      );
      restoreUserAgentForTesting();
    });
  });

  describe('PerformanceAgent – call tree focus', function() {
    beforeEach(() => {
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
        workspace,
      });
      createTarget();
      // For call tree focus tests, we want to simulate a fresh trace by default.
      sinon.stub(Tracing.FreshRecording.Tracker.instance(), 'recordingIsFresh').returns(true);
    });

    describe('run', function() {
      it('generates an answer', async function() {
        const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
        // A basic Layout.
        const layoutEvt = allThreadEntriesInTrace(parsedTrace).find(event => event.ts === 465457096322);
        assert.exists(layoutEvt);
        const aiCallTree = AICallTree.AICallTree.fromEvent(layoutEvt, parsedTrace);
        assert.exists(aiCallTree);

        const agent = new PerformanceAgent.PerformanceAgent({
          aidaClient: mockAidaClient([[{
            explanation: 'This is the answer',
            metadata: {
              rpcGlobalId: 123,
            },
          }]]),
        });

        const context = PerformanceAgent.PerformanceTraceContext.fromCallTree(aiCallTree);
        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        deleteAllWidgetData(responses);
        snapshotTester.assert(this, JSON.stringify(responses, null, 2));

        assert.deepEqual(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, [
          {
            role: 1,
            parts:
                [{text: `User selected the following call tree:\n\n${aiCallTree.serialize()}\n\n# User query\n\ntest`}],
          },
          {
            role: 2,
            parts: [{text: 'This is the answer'}],
          },
        ]);
      });

      it('yields TIMELINE_RANGE_SUMMARY and BOTTOM_UP_TREE widgets for call tree focus on initialization',
         async function() {
           const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
           const events = allThreadEntriesInTrace(parsedTrace);
           const layoutEvt = events.find(event => event.ts === 465457096322);
           assert.exists(layoutEvt);

           const aiCallTree = AICallTree.AICallTree.fromEvent(layoutEvt, parsedTrace);
           assert.exists(aiCallTree);

           const agent = new PerformanceAgent.PerformanceAgent({
             aidaClient: mockAidaClient([[{explanation: 'done'}]]),
           });

           const context = PerformanceAgent.PerformanceTraceContext.fromCallTree(aiCallTree);
           const responses = await Array.fromAsync(agent.run('test', {selected: context}));

           deleteAllWidgetData(responses);

           const contextResponse = responses.find(r => r.type === AiAgent.ResponseType.CONTEXT);
           assert.exists(contextResponse);
           assert.exists(contextResponse.widgets);
           assert.lengthOf(contextResponse.widgets, 2);
           assert.strictEqual(contextResponse.widgets[0].name, 'TIMELINE_RANGE_SUMMARY');
           assert.strictEqual(contextResponse.widgets[1].name, 'BOTTOM_UP_TREE');
         });
    });

    describe('enhanceQuery', () => {
      it('does not send the serialized calltree again if it is a followup chat about the same calltree', async () => {
        const agent = new PerformanceAgent.PerformanceAgent({
          aidaClient: {} as Host.AidaClient.AidaClient,
        });

        const mockAiCallTree = {
          serialize: () => 'Mock call tree',
          parsedTrace: FAKE_PARSED_TRACE,
          rootNode: {event: {ts: 0, dur: 0}},
        } as unknown as AICallTree.AICallTree;

        const context1 = PerformanceAgent.PerformanceTraceContext.fromCallTree(mockAiCallTree);
        const context2 = PerformanceAgent.PerformanceTraceContext.fromCallTree(mockAiCallTree);
        const context3 = PerformanceAgent.PerformanceTraceContext.fromCallTree(mockAiCallTree);

        const enhancedQuery1 = await agent.enhanceQuery('What is this?', context1);
        assert.strictEqual(
            enhancedQuery1,
            'User selected the following call tree:\n\nMock call tree\n\n# User query\n\nWhat is this?');

        const query2 = 'But what about this follow-up question?';
        const enhancedQuery2 = await agent.enhanceQuery(query2, context2);
        assert.strictEqual(enhancedQuery2, query2);
        assert.isFalse(enhancedQuery2.includes(mockAiCallTree.serialize()));

        // Just making sure any subsequent chat doesnt include it either.
        const query3 = 'And this 3rd question?';
        const enhancedQuery3 = await agent.enhanceQuery(query3, context3);
        assert.strictEqual(enhancedQuery3, query3);
        assert.isFalse(enhancedQuery3.includes(mockAiCallTree.serialize()));
      });
    });
  });

  const FAKE_LCP_MODEL = {
    insightKey: Trace.Insights.Types.InsightKeys.LCP_BREAKDOWN,
    strings: {},
    title: 'LCP breakdown' as Common.UIString.LocalizedString,
    description: 'some description' as Common.UIString.LocalizedString,
    docs: '',
    category: Trace.Insights.Types.InsightCategory.ALL,
    state: 'fail',
    frameId: '123',
  } as const;
  const FAKE_INP_MODEL = {
    insightKey: Trace.Insights.Types.InsightKeys.INP_BREAKDOWN,
    strings: {},
    title: 'INP breakdown' as Common.UIString.LocalizedString,
    description: 'some description' as Common.UIString.LocalizedString,
    docs: '',
    category: Trace.Insights.Types.InsightCategory.ALL,
    state: 'fail',
    frameId: '123',
  } as const;
  const FAKE_HANDLER_DATA = {
    Meta: {traceBounds: {min: 0, max: 10}, mainFrameURL: 'https://www.example.com'},
  } as unknown as Trace.Handlers.Types.HandlerData;
  const FAKE_INSIGHTS = new Map([
                          [
                            '', {
                              model: {
                                LCPBreakdown: FAKE_LCP_MODEL,
                                INPBreakdown: FAKE_INP_MODEL,
                              },
                              bounds: {min: 0, max: 0, range: 0},
                            }
                          ],
                        ]) as unknown as Trace.Insights.Types.TraceInsightSets;
  const FAKE_METADATA = {} as unknown as Trace.Types.File.MetaData;
  const FAKE_PARSED_TRACE = {
    data: FAKE_HANDLER_DATA,
    insights: FAKE_INSIGHTS,
    metadata: FAKE_METADATA,
  } as unknown as Trace.TraceModel.ParsedTrace;

  function createAgentForConversation(opts: {aidaClient?: Host.AidaClient.AidaClient} = {}) {
    const agent = new PerformanceAgent.PerformanceAgent({aidaClient: opts.aidaClient ?? mockAidaClient()});
    const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(FAKE_PARSED_TRACE);
    agent.run('', {selected: context});
    return agent;
  }

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
    createTarget();
  });

  it('uses the mainFrameURL as the origin if it is valid', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    Tracing.FreshRecording.Tracker.instance().registerFreshRecording(parsedTrace);
    const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
    assert.strictEqual(context.getOrigin(), 'https://web.dev');
  });

  it('falls back to the min and max bounds if the URL is invalid', () => {
    const parsedTrace = {
      data: {
        Meta: {
          traceBounds: {min: 100, max: 200},
          mainFrameURL: 'not-a-url',
        },
      },
      insights: new Map(),
    } as unknown as Trace.TraceModel.ParsedTrace;
    Tracing.FreshRecording.Tracker.instance().registerFreshRecording(parsedTrace);
    const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
    assert.strictEqual(context.getOrigin(), 'trace-100-200');
  });

  it('outputs the right title for the selected insight', async () => {
    const context = PerformanceAgent.PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL);
    assert.strictEqual(context.getTitle(), 'Trace: www.example.com – LCP breakdown');
  });

  // See b/405054694 for context on why we do this.
  describe('parsing text responses', () => {
    it('strips out 5 backticks if the response has them', async () => {
      const agent = createAgentForConversation();
      const response = agent.parseTextResponse('`````hello world`````');
      assert.deepEqual(response, {answer: 'hello world'});
    });

    it('strips any newlines before the backticks', async () => {
      const agent = createAgentForConversation();
      const response = agent.parseTextResponse('\n\n`````hello world`````');
      assert.deepEqual(response, {answer: 'hello world'});
    });

    it('does not strip the backticks if the response does not fully start and end with them', async () => {
      const agent = createAgentForConversation();
      const response = agent.parseTextResponse('answer: `````hello world`````');
      assert.deepEqual(response, {answer: 'answer: `````hello world`````'});
    });

    it('does not strip the backticks in the middle of the response even if the response is also wrapped', async () => {
      const agent = createAgentForConversation();
      const response = agent.parseTextResponse('`````hello ````` world`````');
      assert.deepEqual(response, {answer: 'hello ````` world'});
    });

    it('does not strip out inline code backticks', async () => {
      const agent = createAgentForConversation();
      const response = agent.parseTextResponse('This is code `console.log("hello")`');
      assert.deepEqual(response, {answer: 'This is code `console.log("hello")`'});
    });

    it('does not strip out code block 3 backticks', async () => {
      const agent = createAgentForConversation();
      const response = agent.parseTextResponse(`\`\`\`
code
\`\`\``);
      assert.deepEqual(response, {
        answer: `\`\`\`
code
\`\`\``
      });
    });

    it('translates eventKey: URLs in link destinations', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const agent = createAgentForConversation();
      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      // Run once to initialize context
      await agent.run('', {selected: context}).next();

      const response = agent.parseTextResponse(
          'The LCP image [https://www.diy.com/](urlIndex: 0, eventKey: r-14746) is a background image');
      assert.deepEqual(response, {answer: 'The LCP image [https://www.diy.com/](#r-14746) is a background image'});

      const response2 = agent.parseTextResponse(
          'The LCP image [https://www.diy.com/](eventKey: r-14746, urlIndex: 0) is a background image');
      assert.deepEqual(response2, {answer: 'The LCP image [https://www.diy.com/](#r-14746) is a background image'});
    });

    it('translates plain eventKeys in link destinations', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const agent = createAgentForConversation();
      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      await agent.run('', {selected: context}).next();

      const focus = context.getItem();
      assert.exists(focus);
      sinon.stub(focus, 'lookupEvent').callsFake(key => {
        if (key === 'valid-event-key') {
          return {} as Trace.Types.Events.Event;
        }
        return null;
      });

      const response =
          agent.parseTextResponse('The LCP image [https://www.diy.com/](valid-event-key) is a background image');
      assert.deepEqual(
          response, {answer: 'The LCP image [https://www.diy.com/](#valid-event-key) is a background image'});
    });

    it('translates eventKey: URLs with spaces between bracket and parenthesis', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const agent = createAgentForConversation();
      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      await agent.run('', {selected: context}).next();

      const response = agent.parseTextResponse(
          'The LCP element is an image [IMG class=\'h-auto w-full\'] (eventKey: r-12227) loaded from [https://media.diy.com/is/image] (eventKey: s-2069)');
      assert.deepEqual(response, {
        answer:
            'The LCP element is an image [IMG class=\'h-auto w-full\'](#r-12227) loaded from [https://media.diy.com/is/image](#s-2069)'
      });
    });
  });

  describe('handleContextDetails', () => {
    it('outputs the right context for the initial query from the user', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, FAKE_LCP_MODEL);
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          }
        }]])
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      deleteAllWidgetData(responses);
      snapshotTester.assert(this, JSON.stringify(responses, null, 2));
    });
  });

  describe('enhanceQuery', () => {
    beforeEach(() => {
      // For enhanceQuery tests, we want to simulate a fresh trace to avoid the SECURITY_WARNING.
      sinon.stub(Tracing.FreshRecording.Tracker.instance(), 'recordingIsFresh').returns(true);
    });

    it('adds the context to the query from the user', async () => {
      const agent = createAgentForConversation({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });

      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL);
      const finalQuery = await agent.enhanceQuery('What is this?', context);
      const expected = `User selected the LCPBreakdown insight.\n\n# User query\n\nWhat is this?`;

      assert.strictEqual(finalQuery, expected);
    });

    it('does not add the context for follow-up queries with the same context', async () => {
      const agent = createAgentForConversation({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });

      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL);

      await agent.enhanceQuery('What is this?', context);
      const finalQuery = await agent.enhanceQuery('Help me understand?', context);
      const expected = `Help me understand?`;

      assert.strictEqual(finalQuery, expected);
    });

    it('does add context to queries if the insight context changes', async () => {
      const agent = createAgentForConversation({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      const context1 = PerformanceAgent.PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL);
      const context2 = PerformanceAgent.PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_INP_MODEL);
      const firstQuery = await agent.enhanceQuery('Q1', context1);
      const secondQuery = await agent.enhanceQuery('Q2', context1);
      const thirdQuery = await agent.enhanceQuery('Q3', context2);
      assert.include(firstQuery, 'User selected the LCPBreakdown');
      assert.notInclude(secondQuery, 'User selected the');
      assert.include(thirdQuery, 'User selected the INPBreakdown');
    });
  });

  describe('function calls', () => {
    it('can call getNetworkTrackSummary', async function() {
      const metricsSpy = sinon.spy(Host.userMetrics, 'performanceAINetworkSummaryResponseSize');
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);
      const bounds = parsedTrace.data.Meta.traceBounds;
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [{name: 'getNetworkTrackSummary', args: {min: bounds.min, max: bounds.max}}]
          }],
          [{explanation: 'done'}]
        ])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);

      // Find the requests we expect the handler to have returned.
      const expectedRequestUrls = [
        'https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html',
        'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800',
        'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css',
        'https://via.placeholder.com/50.jpg', 'https://via.placeholder.com/2000.jpg'
      ];

      expectedRequestUrls.forEach(url => {
        const match = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url === url);
        assert.isOk(match, `no request found for ${url}`);
      });

      const formatter = new PerformanceTraceFormatter.PerformanceTraceFormatter(context.getItem());
      const expectedRequestsOutput = formatter.formatNetworkTrackSummary(bounds);

      const expectedBytesSize = Platform.StringUtilities.countWtf8Bytes(expectedRequestsOutput);
      sinon.assert.calledWith(metricsSpy, expectedBytesSize);

      const expectedOutput = JSON.stringify({summary: expectedRequestsOutput});
      const titleResponse = responses.find(response => response.type === AiAgent.ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, 'Investigating network activity');

      assert.exists(action);
      assert.strictEqual(action.type, 'action');
      assert.strictEqual(action.code, 'getNetworkTrackSummary({min: 658799706428, max: 658804825864})');
      assert.strictEqual(action.output, expectedOutput);
      assert.isFalse(action.canceled);

      assert.exists(action.widgets);
      assert.lengthOf(action.widgets, 1);
      const networkWidget = action.widgets[0] as AiAgent.NetworkTrackAiWidget;
      assert.strictEqual(networkWidget.name, 'NETWORK_TRACK');
      assert.deepEqual(networkWidget.data.bounds, bounds);
    });

    it('can call getResourceContent and yields SOURCE_CODE widget', async function() {
      // Stub recordingIsFresh to return true to make it a "fresh recording"
      sinon.stub(Tracing.FreshRecording.Tracker.instance(), 'recordingIsFresh').returns(true);

      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const url = 'https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html';
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getResourceContent', args: {url}}]}], [{explanation: 'done'}]])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      // Mock scripts in trace
      parsedTrace.data.Scripts.scripts.push({
        url,
        content: 'console.log("hello world");',
      } as unknown as Trace.Handlers.ModelHandlers.Scripts.Script);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(action);
      assert.exists(action.widgets);
      assert.lengthOf(action.widgets, 1);
      const widget = action.widgets[0] as AiAgent.SourceCodeAiWidget;
      assert.strictEqual(widget.name, 'SOURCE_CODE');
      assert.strictEqual(widget.data.url, url);
      assert.strictEqual(widget.data.code, 'console.log("hello world");');
    });

    it('blocks getResourceContent for cross-origin URLs', async function() {
      // Stub recordingIsFresh to return true to make it a "fresh recording"
      sinon.stub(Tracing.FreshRecording.Tracker.instance(), 'recordingIsFresh').returns(true);

      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const url = 'https://victim.com/sensitive.js';
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getResourceContent', args: {url}}]}], [{explanation: 'done'}]])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      // Mock script in trace
      parsedTrace.data.Scripts.scripts.push({
        url,
        content: 'const secret = "sensitive data";',
      } as unknown as Trace.Handlers.ModelHandlers.Scripts.Script);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(action);
      assert.strictEqual(action.output, 'Resource not found');
      assert.isUndefined(action.widgets);
    });

    it('blocks getResourceContent for file URLs', async function() {
      // Stub recordingIsFresh to return true to make it a "fresh recording"
      sinon.stub(Tracing.FreshRecording.Tracker.instance(), 'recordingIsFresh').returns(true);

      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const url = 'file:///tmp/sensitive.js';
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getResourceContent', args: {url}}]}], [{explanation: 'done'}]])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);
      sinon.stub(context, 'getOrigin').returns('file://');

      // Mock script in trace with file URL
      parsedTrace.data.Scripts.scripts.push({
        url,
        content: 'const secret = "sensitive data";',
      } as unknown as Trace.Handlers.ModelHandlers.Scripts.Script);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(action);
      assert.strictEqual(action.output, 'Resource not found');
      assert.isUndefined(action.widgets);
    });

    it('blocks getResourceContent for imported traces', async function() {
      // Stub recordingIsFresh to return false to make it an "imported trace"
      sinon.stub(Tracing.FreshRecording.Tracker.instance(), 'recordingIsFresh').returns(false);

      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const url = 'https://example.com/script.js';
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getResourceContent', args: {url}}]}], [{explanation: 'done'}]])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(action);
      assert.strictEqual(action.output, 'Cannot use this tool on an imported file.');
      assert.isUndefined(action.widgets);
    });

    it('can call getFunctionCode and yields SOURCE_CODE widget', async function() {
      // Stub recordingIsFresh to return true to allow the tool to be declared.
      sinon.stub(Tracing.FreshRecording.Tracker.instance(), 'recordingIsFresh').returns(true);

      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const scriptUrl = 'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.js';
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getFunctionCode', args: {scriptUrl, line: 10, column: 5}}]}],
          [{explanation: 'done'}]
        ])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      // Stub prototype methods of PerformanceTraceFormatter
      sinon.stub(PerformanceTraceFormatter.PerformanceTraceFormatter.prototype, 'resolveFunctionCodeAtLocation')
          .resolves({
            code: 'function test() {}',
            codeWithContext: '<FUNCTION_START>function test() {}<FUNCTION_END>',
            formattedCost: [],
          } as unknown as SourceMapScopes.FunctionCodeResolver.FunctionCode);
      sinon.stub(PerformanceTraceFormatter.PerformanceTraceFormatter.prototype, 'formatFunctionCode')
          .returns('function test() {}');

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(action);
      assert.exists(action.widgets);
      assert.lengthOf(action.widgets, 1);
      const widget = action.widgets[0] as AiAgent.SourceCodeAiWidget;
      assert.strictEqual(widget.name, 'SOURCE_CODE');
      assert.strictEqual(widget.data.url, scriptUrl);
      assert.strictEqual(widget.data.line, 10);
      assert.strictEqual(widget.data.column, 5);
      assert.strictEqual(widget.data.code, 'function test() {}');
    });

    it('cannot resolve function code if the trace is not fresh', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const scriptUrl = 'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.js';
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getFunctionCode', args: {scriptUrl, line: 10, column: 5}}]}],
          [{explanation: 'done'}]
        ])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      // Stub recordingIsFresh to return false
      sinon.stub(Tracing.FreshRecording.Tracker.instance(), 'recordingIsFresh').returns(false);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const actionResponse = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(actionResponse);
      assert.strictEqual(actionResponse.output, 'Cannot use this tool on an imported file.');
    });

    it('can call getMainThreadTrackSummaryByLabel', async function() {
      const metricsSpy = sinon.spy(Host.userMetrics, 'performanceAIMainThreadActivityResponseSize');

      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [{name: 'getMainThreadTrackSummaryByLabel', args: {label: 'LCPBreakdown'}}]
          }],
          [{explanation: 'done'}]
        ])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      deleteAllWidgetData(responses);

      const titleResponse = responses.find(response => response.type === AiAgent.ResponseType.TITLE);
      assert.exists(titleResponse);
      assert.strictEqual(titleResponse.title, 'Investigating main thread activity: LCP breakdown insight');

      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(action);

      const formatter = new PerformanceTraceFormatter.PerformanceTraceFormatter(context.getItem());
      const bounds = Trace.Insights.Common.insightBounds(lcpBreakdown, context.getItem().primaryInsightSet!.bounds);
      const summary = await formatter.formatMainThreadTrackSummary(bounds);
      assert.isOk(summary);

      const expectedBytesSize = Platform.StringUtilities.countWtf8Bytes(summary);
      sinon.assert.calledWith(metricsSpy, expectedBytesSize);

      const expectedOutput = JSON.stringify({summary});

      assert.exists(action);
      assert.exists(action.widgets);
      assert.lengthOf(action.widgets, 2);
      assert.strictEqual(action.widgets[0].name, 'TIMELINE_RANGE_SUMMARY');
      assert.strictEqual(action.widgets[1].name, 'BOTTOM_UP_TREE');
      assert.strictEqual(action.code, 'getMainThreadTrackSummaryByLabel(\'LCPBreakdown\')');
      assert.strictEqual(action.output, expectedOutput);
      assert.isFalse(action.canceled);
      assert.strictEqual(action.type, 'action');
    });

    it('can call getEventByKey and yields TIMELINE_EVENT_SUMMARY widget', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const event = allThreadEntriesInTrace(parsedTrace)[0];
      assert.exists(event);
      const eventKey = 'r-0';

      const agent = createAgentForConversation({
        aidaClient: mockAidaClient(
            [[{explanation: '', functionCalls: [{name: 'getEventByKey', args: {eventKey}}]}], [{explanation: 'done'}]])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      sinon.stub(context.getItem(), 'lookupEvent').withArgs(eventKey).returns(event);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(action);
      assert.exists(action.widgets);
      assert.lengthOf(action.widgets, 1);
      const widget = action.widgets[0] as AiAgent.TimelineEventSummaryAiWidget;
      assert.strictEqual(widget.name, 'TIMELINE_EVENT_SUMMARY');
      assert.strictEqual(widget.data.event, event);
      assert.strictEqual(widget.data.parsedTrace, parsedTrace);
    });

    it('can call selectEventByKey and yields TIMELINE_EVENT_SUMMARY widget', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      const event = allThreadEntriesInTrace(parsedTrace)[0];
      assert.exists(event);
      const eventKey = 'r-0';

      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'selectEventByKey', args: {eventKey}}]}], [{explanation: 'done'}]
        ])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      sinon.stub(context.getItem(), 'lookupEvent').withArgs(eventKey).returns(event);
      const revealStub = sinon.stub();
      Common.Revealer.registerRevealer({
        contextTypes: () => [SDK.TraceObject.RevealableEvent],
        loadRevealer: async () => ({
          reveal: revealStub,
        }),
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(response => response.type === AiAgent.ResponseType.ACTION);
      assert.exists(action);
      assert.exists(action.widgets);
      assert.lengthOf(action.widgets, 1);
      const widget = action.widgets[0] as AiAgent.TimelineEventSummaryAiWidget;
      assert.strictEqual(widget.name, 'TIMELINE_EVENT_SUMMARY');
      assert.strictEqual(widget.data.event, event);
      assert.strictEqual(widget.data.parsedTrace, parsedTrace);

      sinon.assert.calledOnce(revealStub);
      Common.Revealer.RevealerRegistry.removeInstance();
    });

    it('will not send facts from a previous insight if the context changes', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);
      const renderBlocking = getInsightOrError('RenderBlocking', parsedTrace.insights, firstNav);
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [
            {explanation: '', functionCalls: [{name: 'getNetworkTrackSummary', args: {}}]}
          ],                        // Run 1 ('test 1 LCP'), step 1: LLM requests tool execution
          [{explanation: 'done'}],  // Run 1 ('test 1 LCP'), step 2: LLM receives tool output and finishes
          [{explanation: 'done'}],  // Run 2 ('test 2 LCP'), step 1: LLM answers immediately (uses cached fact)
          [
            {explanation: 'done'}
          ],  // Run 3 ('test 1 RenderBlocking'), step 1: LLM answers immediately (context changed, no cache)
        ])
      });
      const lcpContext = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);
      const renderBlockingContext = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, renderBlocking);

      // Populate the function calls for the LCP Context
      await Array.fromAsync(agent.run('test 1 LCP', {selected: lcpContext}));
      assert.strictEqual(agent.currentFacts().size, 8);  // always adds 8 facts for high-level summary of trace.
      await Array.fromAsync(agent.run('test 2 LCP', {selected: lcpContext}));
      assert.strictEqual(agent.currentFacts().size, 9);  // added the function call as a fact.
      // Now change the context and send a request.
      await Array.fromAsync(agent.run('test 1 RenderBlocking', {selected: renderBlockingContext}));
      assert.strictEqual(agent.currentFacts().size, 8);  // back to 8.
    });

    it('will cache function calls as facts', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'getNetworkTrackSummary', args: {}}]}], [{explanation: 'done'}],
          [{explanation: 'done'}]
        ])
      });
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);
      await Array.fromAsync(agent.run('test 1', {selected: context}));
      await Array.fromAsync(agent.run('test 2', {selected: context}));
      // First 7 are the always included high-level facts. The rests are from the function calls.
      assert.deepEqual(
          Array.from(
              agent.currentFacts(),
              fact => {
                return fact.metadata.source;
              }),
          [
            // https://www.youtube.com/watch?v=Vhh_GeBPOhs
            'devtools', 'devtools', 'devtools', 'devtools', 'devtools', 'devtools', 'devtools', 'devtools',
            'getNetworkTrackSummary({min: 197695826524, max: 197698633660})'
          ]);
    });

    it('will clear cache on error', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpBreakdown = getInsightOrError('LCPBreakdown', parsedTrace.insights, firstNav);

      let originBlocked = false;
      const agent = new PerformanceAgent.PerformanceAgent({
        aidaClient: mockAidaClient([
          // Run 1: calls function
          [{explanation: '', functionCalls: [{name: 'getNetworkTrackSummary', args: {}}]}], [{explanation: 'done'}],
          // Run 2: starts, but we will block origin.
          [{explanation: '', functionCalls: [{name: 'getNetworkTrackSummary', args: {}}]}],
          // Run 3: after error, we try again.
          [{explanation: 'done'}]
        ]),
        allowedOrigin: () => originBlocked ? {blocked: true} : {origin: 'https://google.com'},
      });

      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpBreakdown);

      // Run 1: Succeeds.
      await Array.fromAsync(agent.run('test 1', {selected: context}));
      const initialFactsCount = agent.currentFacts().size;
      assert.isTrue(initialFactsCount > 7);

      // Run 2: Simulates navigation before function call.
      originBlocked = true;
      const responses = await Array.fromAsync(agent.run('test 2', {selected: context}));
      const errorResponse = responses.find(r => r.type === AiAgent.ResponseType.ERROR) as AiAgent.ErrorResponse;
      assert.isOk(errorResponse);
      assert.strictEqual(errorResponse.error, AiAgent.ErrorType.CROSS_ORIGIN);

      // Run 3: Restore origin.
      originBlocked = false;
      await Array.fromAsync(agent.run('test 3', {selected: context}));
      // Facts should NOT contain the cached function call from Run 1.
      assert.strictEqual(agent.currentFacts().size, initialFactsCount);
    });

    it('yields multiple DOM tree widgets within a single response for the same node', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpDiscovery = getInsightOrError('LCPDiscovery', parsedTrace.insights, firstNav);
      const insightSetId = [...parsedTrace.insights.keys()][0];
      const insightSet = parsedTrace.insights.get(insightSetId)!;
      insightSet.model.LCPBreakdown = {
        insightKey: 'LCPBreakdown',
        state: 'fail',
        lcpMs: 1 as Trace.Types.Timing.Milli,
        lcpEvent: {
          name: 'largestContentfulPaint::Candidate',
          args: {data: {nodeId: 4}},
        } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
      } as Trace.Insights.Types.InsightModels['LCPBreakdown'];

      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpDiscovery);

      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [
              {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'LCPDiscovery'}},
            ]
          }],
          [{
            explanation: '',
            functionCalls: [
              {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'LCPDiscovery'}},
            ]
          }],
          [{explanation: 'done'}]
        ])
      });

      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      assert.exists(target);
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const pushNodesStub = sinon.stub(domModel, 'pushNodesByBackendIdsToFrontend');
      const mockNode = {takeSnapshot: sinon.stub().resolves({root: {nodeName: 'IMG'}})};
      pushNodesStub.resolves(new Map([[4 as Protocol.DOM.BackendNodeId, mockNode as unknown as SDK.DOMModel.DOMNode]]));

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));

      const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
      assert.lengthOf(actions, 2);

      // The first call should have a widget, the second one should also have it as deduplication now happens in the UI.
      assert.exists(actions[0].widgets);
      assert.lengthOf(actions[0].widgets!, 2);
      assert.strictEqual(actions[0].widgets![0].name, 'DOM_TREE');

      assert.exists(actions[1].widgets);
      assert.lengthOf(actions[1].widgets!, 2);
      assert.strictEqual(actions[1].widgets![0].name, 'DOM_TREE');
    });

    it('does NOT deduplicate DOM tree widgets across different responses for the same node', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpDiscovery = getInsightOrError('LCPDiscovery', parsedTrace.insights, firstNav);
      const insightSetId = [...parsedTrace.insights.keys()][0];
      const insightSet = parsedTrace.insights.get(insightSetId)!;
      insightSet.model.LCPBreakdown = {
        insightKey: 'LCPBreakdown',
        state: 'fail',
        lcpMs: 1 as Trace.Types.Timing.Milli,
        lcpEvent: {
          name: 'largestContentfulPaint::Candidate',
          args: {data: {nodeId: 4}},
        } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
      } as Trace.Insights.Types.InsightModels['LCPBreakdown'];

      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpDiscovery);

      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          // First run
          [{
            explanation: '',
            functionCalls: [
              {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'LCPDiscovery'}},
            ]
          }],
          [{explanation: 'done'}],
          // Second run
          [{
            explanation: '',
            functionCalls: [
              {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'LCPDiscovery'}},
            ]
          }],
          [{explanation: 'done'}]
        ])
      });

      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      assert.exists(target);
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      sinon.stub(domModel, 'pushNodesByBackendIdsToFrontend').resolves(new Map([[
        4 as Protocol.DOM.BackendNodeId,
        {takeSnapshot: sinon.stub().resolves({root: {nodeName: 'IMG'}})} as unknown as SDK.DOMModel.DOMNode
      ]]));

      // First run
      const firstResponses = await Array.fromAsync(agent.run('first test', {selected: context}));
      const firstActions = firstResponses.filter(r => r.type === AiAgent.ResponseType.ACTION);
      assert.lengthOf(firstActions, 1);
      assert.exists(firstActions[0].widgets);
      assert.lengthOf(firstActions[0].widgets!, 2);

      // Second run for the same node
      const secondResponses = await Array.fromAsync(agent.run('second test', {selected: context}));
      const secondActions = secondResponses.filter(r => r.type === AiAgent.ResponseType.ACTION);
      assert.lengthOf(secondActions, 1);
      // It should show the widget again because it's a new response.
      assert.exists(secondActions[0].widgets);
      assert.lengthOf(secondActions[0].widgets!, 2);
    });

    it('populates imageContent for DOM_TREE widget if lcpRequest is present', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      assert.isOk(parsedTrace.insights);
      const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
      const lcpDiscovery = getInsightOrError('LCPDiscovery', parsedTrace.insights, firstNav);
      const insightSetId = [...parsedTrace.insights.keys()][0];
      const insightSet = parsedTrace.insights.get(insightSetId)!;

      const lcpRequest = parsedTrace.data.NetworkRequests.byTime.find(r => r.args.data.url.endsWith('50.jpg'));
      assert.exists(lcpRequest);

      insightSet.model.LCPBreakdown = {
        insightKey: 'LCPBreakdown',
        state: 'fail',
        lcpMs: 1 as Trace.Types.Timing.Milli,
        lcpEvent: {
          name: 'largestContentfulPaint::Candidate',
          args: {data: {nodeId: 4}},
        } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
        lcpRequest,
      } as Trace.Insights.Types.InsightModels['LCPBreakdown'];

      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpDiscovery);

      const agent = new PerformanceAgent.PerformanceAgent({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [
              {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'LCPDiscovery'}},
            ]
          }],
          [{explanation: 'done'}]
        ])
      });

      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      assert.exists(target);
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      sinon.stub(domModel, 'pushNodesByBackendIdsToFrontend').resolves(new Map([[
        4 as Protocol.DOM.BackendNodeId,
        {takeSnapshot: sinon.stub().resolves({root: {nodeName: 'IMG'}})} as unknown as SDK.DOMModel.DOMNode
      ]]));

      const mockRequest = createNetworkRequest();
      sinon.stub(mockRequest, 'contentType').returns({
        isImage: () => true
      } as unknown as Common.ResourceType.ResourceType);
      sinon.stub(mockRequest, 'requestContentData')
          .resolves(new TextUtils.ContentData.ContentData('base64', true, 'image/jpeg'));
      sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requestByManagerAndId').returns(mockRequest);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const action = responses.find(r => r.type === AiAgent.ResponseType.ACTION) as AiAgent.ActionResponse;
      assert.exists(action);
      assert.exists(action.widgets);
      const domTreeWidget = action.widgets?.find(w => w.name === 'DOM_TREE') as AiAgent.DomTreeAiWidget;
      assert.exists(domTreeWidget);
      assert.exists(domTreeWidget.data.networkRequest?.imageContent);
      assert.strictEqual(domTreeWidget.data.networkRequest?.imageContent?.base64, 'base64');
    });

    describe('getInsightDetails yields PERF_INSIGHT widget', () => {
      let parsedTrace: Trace.TraceModel.ParsedTrace;
      let insightSet: Trace.Insights.Types.InsightSet;
      let context: PerformanceAgent.PerformanceTraceContext;

      beforeEach(async function() {
        parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
        assert.isOk(parsedTrace.insights);
        const [nav] = parsedTrace.data.Meta.mainFrameNavigations;
        const lcpDiscovery = getInsightOrError('LCPDiscovery', parsedTrace.insights, nav);
        const insightSetId = [...parsedTrace.insights.keys()][0];
        insightSet = parsedTrace.insights.get(insightSetId)!;
        context = PerformanceAgent.PerformanceTraceContext.fromInsight(parsedTrace, lcpDiscovery);
      });

      it('yields a PERF_INSIGHT widget for LCPBreakdown', async function() {
        insightSet.model.LCPBreakdown = {
          insightKey: 'LCPBreakdown',
          state: 'fail',
          lcpMs: 1000 as Trace.Types.Timing.Milli,
          lcpEvent: {
            name: 'largestContentfulPaint::Candidate',
            args: {data: {nodeId: 4}},
          } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
        } as Trace.Insights.Types.InsightModels['LCPBreakdown'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'LCPBreakdown'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.LCP_BREAKDOWN);
        assert.strictEqual(widget?.data.insightData, insightSet.model.LCPBreakdown);
      });

      it('yields a PERF_INSIGHT widget for RenderBlocking', async function() {
        insightSet.model.RenderBlocking = {
          insightKey: 'RenderBlocking',
          state: 'fail',
          renderBlockingRequests: [],
        } as unknown as Trace.Insights.Types.InsightModels['RenderBlocking'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'RenderBlocking'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.RENDER_BLOCKING);
        assert.strictEqual(widget?.data.insightData, insightSet.model.RenderBlocking);
      });

      it('yields a PERF_INSIGHT widget for LCPDiscovery', async function() {
        insightSet.model.LCPDiscovery = {
          insightKey: 'LCPDiscovery',
          state: 'fail',
        } as unknown as Trace.Insights.Types.InsightModels['LCPDiscovery'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'LCPDiscovery'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.LCP_DISCOVERY);
        assert.strictEqual(widget?.data.insightData, insightSet.model.LCPDiscovery);
      });

      it('yields a PERF_INSIGHT widget for CLSCulprits', async function() {
        insightSet.model.CLSCulprits = {
          insightKey: 'CLSCulprits',
          state: 'fail',
          clusters: [],
          worstCluster: null,
        } as unknown as Trace.Insights.Types.InsightModels['CLSCulprits'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'CLSCulprits'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.CLS_CULPRITS);
        assert.strictEqual(widget?.data.insightData, insightSet.model.CLSCulprits);
      });

      it('yields a PERF_INSIGHT widget for NetworkDependencyTree', async function() {
        insightSet.model.NetworkDependencyTree = {
          insightKey: 'NetworkDependencyTree',
          state: 'fail',
          rootNodes: [],
          maxTime: 0,
          preconnectedOrigins: [],
          preconnectCandidates: [],
        } as unknown as Trace.Insights.Types.InsightModels['NetworkDependencyTree'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'NetworkDependencyTree'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.NETWORK_DEPENDENCY_TREE);
        assert.strictEqual(widget?.data.insightData, insightSet.model.NetworkDependencyTree);
      });

      it('yields a PERF_INSIGHT widget for ThirdParties', async function() {
        insightSet.model.ThirdParties = {
          insightKey: 'ThirdParties',
          state: 'fail',
          entitySummaries: [],
        } as unknown as Trace.Insights.Types.InsightModels['ThirdParties'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'ThirdParties'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.THIRD_PARTIES);
        assert.strictEqual(widget?.data.insightData, insightSet.model.ThirdParties);
      });

      it('yields a PERF_INSIGHT widget for ForcedReflow', async function() {
        insightSet.model.ForcedReflow = {
          insightKey: 'ForcedReflow',
          state: 'fail',
          aggregatedBottomUpData: [],
        } as unknown as Trace.Insights.Types.InsightModels['ForcedReflow'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'ForcedReflow'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.FORCED_REFLOW);
        assert.strictEqual(widget?.data.insightData, insightSet.model.ForcedReflow);
      });

      it('yields a PERF_INSIGHT widget for Cache', async function() {
        insightSet.model.Cache = {
          insightKey: 'Cache',
          state: 'fail',
          requests: [],
        } as unknown as Trace.Insights.Types.InsightModels['Cache'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'Cache'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.CACHE);
        assert.strictEqual(widget?.data.insightData, insightSet.model.Cache);
      });

      it('yields a PERF_INSIGHT widget for INPBreakdown', async function() {
        insightSet.model.INPBreakdown = {
          insightKey: 'INPBreakdown',
          state: 'fail',
        } as unknown as Trace.Insights.Types.InsightModels['INPBreakdown'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'INPBreakdown'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.INP_BREAKDOWN);
        assert.strictEqual(widget?.data.insightData, insightSet.model.INPBreakdown);
      });

      it('yields a PERF_INSIGHT widget for DocumentLatency', async function() {
        insightSet.model.DocumentLatency = {
          insightKey: 'DocumentLatency',
          state: 'fail',
        } as unknown as Trace.Insights.Types.InsightModels['DocumentLatency'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'DocumentLatency'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.DOCUMENT_LATENCY);
        assert.strictEqual(widget?.data.insightData, insightSet.model.DocumentLatency);
      });

      it('yields a PERF_INSIGHT widget for DOMSize', async function() {
        insightSet.model.DOMSize = {
          insightKey: 'DOMSize',
          state: 'fail',
          largeLayoutUpdates: [],
          largeStyleRecalcs: [],
        } as unknown as Trace.Insights.Types.InsightModels['DOMSize'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'DOMSize'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.DOM_SIZE);
        assert.strictEqual(widget?.data.insightData, insightSet.model.DOMSize);
      });

      it('yields a PERF_INSIGHT widget for DuplicatedJavaScript', async function() {
        insightSet.model.DuplicatedJavaScript = {
          insightKey: 'DuplicatedJavaScript',
          state: 'fail',
          duplicationGroupedByNodeModules: new Map(),
          wastedBytes: 0,
        } as unknown as Trace.Insights.Types.InsightModels['DuplicatedJavaScript'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'DuplicatedJavaScript'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.DUPLICATE_JAVASCRIPT);
        assert.strictEqual(widget?.data.insightData, insightSet.model.DuplicatedJavaScript);
      });

      it('yields a PERF_INSIGHT widget for ImageDelivery', async function() {
        insightSet.model.ImageDelivery = {
          insightKey: 'ImageDelivery',
          state: 'fail',
          optimizableImages: [],
          wastedBytes: 0,
        } as unknown as Trace.Insights.Types.InsightModels['ImageDelivery'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'ImageDelivery'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.IMAGE_DELIVERY);
        assert.strictEqual(widget?.data.insightData, insightSet.model.ImageDelivery);
      });

      it('yields a PERF_INSIGHT widget for FontDisplay', async function() {
        insightSet.model.FontDisplay = {
          insightKey: 'FontDisplay',
          state: 'fail',
          fonts: [],
        } as unknown as Trace.Insights.Types.InsightModels['FontDisplay'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'FontDisplay'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.FONT_DISPLAY);
        assert.strictEqual(widget?.data.insightData, insightSet.model.FontDisplay);
      });

      it('yields a PERF_INSIGHT widget for SlowCSSSelector', async function() {
        insightSet.model.SlowCSSSelector = {
          insightKey: 'SlowCSSSelector',
          state: 'fail',
          totalElapsedMs: 0,
          totalMatchAttempts: 0,
          totalMatchCount: 0,
        } as unknown as Trace.Insights.Types.InsightModels['SlowCSSSelector'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'SlowCSSSelector'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.SLOW_CSS_SELECTOR);
        assert.strictEqual(widget?.data.insightData, insightSet.model.SlowCSSSelector);
      });

      it('yields a PERF_INSIGHT widget for LegacyJavaScript', async function() {
        insightSet.model.LegacyJavaScript = {
          insightKey: 'LegacyJavaScript',
          state: 'fail',
          legacyJavaScriptResults: new Map(),
        } as unknown as Trace.Insights.Types.InsightModels['LegacyJavaScript'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'LegacyJavaScript'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.LEGACY_JAVASCRIPT);
        assert.strictEqual(widget?.data.insightData, insightSet.model.LegacyJavaScript);
      });

      it('yields a PERF_INSIGHT widget for Viewport', async function() {
        insightSet.model.Viewport = {
          insightKey: 'Viewport',
          state: 'fail',
          mobileOptimized: false,
        } as unknown as Trace.Insights.Types.InsightModels['Viewport'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'Viewport'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.VIEWPORT);
        assert.strictEqual(widget?.data.insightData, insightSet.model.Viewport);
      });

      it('yields a PERF_INSIGHT widget for ModernHTTP', async function() {
        insightSet.model.ModernHTTP = {
          insightKey: 'ModernHTTP',
          state: 'fail',
          http1Requests: [],
        } as unknown as Trace.Insights.Types.InsightModels['ModernHTTP'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'ModernHTTP'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.MODERN_HTTP);
        assert.strictEqual(widget?.data.insightData, insightSet.model.ModernHTTP);
      });

      it('yields a PERF_INSIGHT widget for CharacterSet', async function() {
        insightSet.model.CharacterSet = {
          insightKey: 'CharacterSet',
          state: 'fail',
          data: {hasHttpCharset: false, metaCharsetDisposition: 'missing'},
        } as unknown as Trace.Insights.Types.InsightModels['CharacterSet'];

        const agent = createAgentForConversation({
          aidaClient: mockAidaClient([
            [{
              explanation: '',
              functionCalls: [
                {name: 'getInsightDetails', args: {insightSetId: insightSet.id, insightName: 'CharacterSet'}},
              ]
            }],
            [{explanation: 'done'}]
          ])
        });

        const responses = await Array.fromAsync(agent.run('test', {selected: context}));
        const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
        assert.lengthOf(actions, 1);
        assert.exists(actions[0].widgets);
        const widget = actions[0].widgets?.find(w => w.name === 'PERF_INSIGHT');
        assert.exists(widget);
        assert.strictEqual(widget?.data.insight, Trace.Insights.Types.InsightKeys.CHARACTER_SET);
        assert.strictEqual(widget?.data.insightData, insightSet.model.CharacterSet);
      });
    });

    it('yields a BOTTOM_UP_TREE widget when getDetailedCallTree is called', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
      const events = allThreadEntriesInTrace(parsedTrace);
      const layoutEvt = events.find(event => event.ts === 465457096322);
      assert.exists(layoutEvt);

      const serializer = new Trace.EventsSerializer.EventsSerializer();
      const key = serializer.keyForEvent(layoutEvt);

      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [
              {name: 'getDetailedCallTree', args: {eventKey: key}},
            ]
          }],
          [{explanation: 'done'}]
        ])
      });

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
      assert.lengthOf(actions, 1);

      assert.exists(actions[0].widgets);
      const bottomUpWidget = actions[0].widgets?.find(w => w.name === 'BOTTOM_UP_TREE');
      assert.exists(bottomUpWidget);

      const rangeSummaryWidget = actions[0].widgets?.find(w => w.name === 'TIMELINE_RANGE_SUMMARY');
      assert.exists(rangeSummaryWidget);
    });

  });

  describe('PerformanceTraceContext.getSuggestions', () => {
    it('returns the call tree suggestions when focus is a call tree', async () => {
      const mockAiCallTree = {
        serialize: () => 'Mock call tree',
        parsedTrace: FAKE_PARSED_TRACE,
        rootNode: {event: {ts: 0, dur: 0}},
      } as unknown as AICallTree.AICallTree;
      const context = PerformanceAgent.PerformanceTraceContext.fromCallTree(mockAiCallTree);
      const suggestions = await context.getSuggestions();
      assert.deepEqual(suggestions, [
        {title: 'What\'s the purpose of this work?', jslogContext: 'performance-default'},
        {title: 'Where is time being spent?', jslogContext: 'performance-default'},
        {title: 'How can I optimize this?', jslogContext: 'performance-default'},
      ]);
    });

    it('returns the insight suggestions when focus is an insight', async () => {
      const context = PerformanceAgent.PerformanceTraceContext.fromInsight(FAKE_PARSED_TRACE, FAKE_LCP_MODEL);
      const suggestions = await context.getSuggestions();
      // LCP Breakdown has 3 suggestions (defined in PerformanceInsightFormatter)
      assert.exists(suggestions);
      assert.lengthOf(suggestions, 3);
      assert.strictEqual(suggestions[0].title, 'Help me optimize my LCP score');
    });

    it('returns default suggestions when no specific focus', async () => {
      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(FAKE_PARSED_TRACE);
      const suggestions = await context.getSuggestions();
      assert.exists(suggestions);
      assert.strictEqual(suggestions![0].title, 'What performance issues exist with my page?');
    });

    it('returns CWV suggestions when metrics are poor and caps total investigation suggestions', async () => {
      const insightSet = {
        id: '1',
        url: new URL('https://example.com'),
        model: {
          LCPBreakdown: {
            insightKey: Trace.Insights.Types.InsightKeys.LCP_BREAKDOWN,
            state: 'fail',
            lcpMs: 5000 as Trace.Types.Timing.Milli,  // 5 seconds = Poor
            lcpEvent: {} as unknown as Trace.Types.Events.AnyLargestContentfulPaintCandidate,
          } as Trace.Insights.Models.LCPBreakdown.LCPBreakdownInsightModel,
          INPBreakdown: {
            insightKey: Trace.Insights.Types.InsightKeys.INP_BREAKDOWN,
            state: 'fail',
            longestInteractionEvent: {
              dur: 1000000 as Trace.Types.Timing.Micro,  // 1 second = Poor
            } as unknown as Trace.Types.Events.SyntheticInteractionPair,
          } as Trace.Insights.Models.INPBreakdown.INPBreakdownInsightModel,
          CLSCulprits: {
            insightKey: Trace.Insights.Types.InsightKeys.CLS_CULPRITS,
            state: 'fail',
            clusters: [{clusterCumulativeScore: 0.5}] as unknown as Trace.Types.Events.SyntheticLayoutShiftCluster[],
            worstCluster: {
              clusterCumulativeScore: 0.5,
            } as unknown as Trace.Types.Events.SyntheticLayoutShiftCluster,
          } as Trace.Insights.Models.CLSCulprits.CLSCulpritsInsightModel,
          Insight1: {
            insightKey: Trace.Insights.Types.InsightKeys.DOM_SIZE,
            state: 'fail',
            title: 'DOM Size' as Common.UIString.LocalizedString,
          } as Trace.Insights.Models.DOMSize.DOMSizeInsightModel,
        },
        bounds: {min: 0, max: 10, range: 10},
      } as unknown as Trace.Insights.Types.InsightSet;

      const FAKE_PARSED_TRACE_POOR_METRICS = {
        data: {
          Meta: {mainFrameURL: 'https://example.com', traceBounds: {min: 0, max: 10}},
        },
        insights: new Map([
          ['1' as Trace.Types.Events.NavigationId, insightSet],
        ]),
      } as unknown as Trace.TraceModel.ParsedTrace;

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(FAKE_PARSED_TRACE_POOR_METRICS);
      const suggestions = await context.getSuggestions();

      assert.exists(suggestions);
      // Base + 3 CWV = 4 suggestions. Insight1 is ignored because we hit the cap of 3 investigation suggestions.
      assert.deepEqual(suggestions, [
        {title: 'What performance issues exist with my page?', jslogContext: 'performance-default'},
        {title: 'How can I improve LCP?', jslogContext: 'performance-default'},
        {title: 'How can I improve INP?', jslogContext: 'performance-default'},
        {title: 'How can I improve CLS?', jslogContext: 'performance-default'},
      ]);
    });

    it('returns a mix of CWV and insight suggestions up to the cap', async () => {
      const insightSet = {
        id: '1',
        url: new URL('https://example.com'),
        model: {
          LCPBreakdown: {
            insightKey: Trace.Insights.Types.InsightKeys.LCP_BREAKDOWN,
            state: 'fail',
            lcpMs: 5000 as Trace.Types.Timing.Milli,  // 5 seconds = Poor
            lcpEvent: {} as unknown as Trace.Types.Events.AnyLargestContentfulPaintCandidate,
          } as Trace.Insights.Models.LCPBreakdown.LCPBreakdownInsightModel,
          Insight1: {
            insightKey: Trace.Insights.Types.InsightKeys.DOM_SIZE,
            state: 'fail',
            title: 'DOM Size' as Common.UIString.LocalizedString,
          } as Trace.Insights.Models.DOMSize.DOMSizeInsightModel,
          Insight2: {
            insightKey: Trace.Insights.Types.InsightKeys.RENDER_BLOCKING,
            state: 'fail',
            title: 'Render Blocking' as Common.UIString.LocalizedString,
          } as Trace.Insights.Models.RenderBlocking.RenderBlockingInsightModel,
          Insight3: {
            insightKey: Trace.Insights.Types.InsightKeys.IMAGE_DELIVERY,
            state: 'fail',
            title: 'Image Delivery' as Common.UIString.LocalizedString,
          } as Trace.Insights.Models.ImageDelivery.ImageDeliveryInsightModel,
        },
        bounds: {min: 0, max: 10, range: 10},
      } as unknown as Trace.Insights.Types.InsightSet;

      const FAKE_PARSED_TRACE_MIXED = {
        data: {
          Meta: {mainFrameURL: 'https://example.com', traceBounds: {min: 0, max: 10}},
        },
        insights: new Map([
          ['1' as Trace.Types.Events.NavigationId, insightSet],
        ]),
      } as unknown as Trace.TraceModel.ParsedTrace;

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(FAKE_PARSED_TRACE_MIXED);
      const suggestions = await context.getSuggestions();

      assert.exists(suggestions);
      // Base + 1 CWV (LCP) + 2 insight (DOMSize + Render Blocking) = 4 suggestions.
      // LCPBreakdown is filtered out by the poorMetrics logic because we added the LCP CWV suggestion.
      assert.lengthOf(suggestions, 4);
      assert.strictEqual(suggestions[0].title, 'What performance issues exist with my page?');
      assert.strictEqual(suggestions[1].title, 'How can I improve LCP?');
      assert.strictEqual(suggestions[2].title, 'How can I reduce the size of my DOM?');
      assert.strictEqual(suggestions[3].title, 'How can I reduce the number of render-blocking requests?');
    });

    it('limits failing insight suggestions so there is a max of 4 total suggestions', async () => {
      const insightSet = {
        id: '1',
        url: new URL('https://example.com'),
        model: {
          Insight1: {insightKey: Trace.Insights.Types.InsightKeys.DOM_SIZE, state: 'fail', title: 'DOM Size'},
          Insight2:
              {insightKey: Trace.Insights.Types.InsightKeys.RENDER_BLOCKING, state: 'fail', title: 'Render Blocking'},
          Insight3:
              {insightKey: Trace.Insights.Types.InsightKeys.DOCUMENT_LATENCY, state: 'fail', title: 'Document Latency'},
          Insight4:
              {insightKey: Trace.Insights.Types.InsightKeys.IMAGE_DELIVERY, state: 'fail', title: 'Image Delivery'},
        },
      } as unknown as Trace.Insights.Types.InsightSet;
      const FAKE_PARSED_TRACE_MANY_FAILURES = {
        data: {
          Meta: {mainFrameURL: 'https://example.com', traceBounds: {min: 0, max: 10}},
        },
        insights: new Map([['1' as Trace.Types.Events.NavigationId, insightSet]]),
      } as unknown as Trace.TraceModel.ParsedTrace;

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(FAKE_PARSED_TRACE_MANY_FAILURES);
      const suggestions = await context.getSuggestions();

      assert.exists(suggestions);
      // 1 default + 3 failing insights = 4 total
      assert.lengthOf(suggestions, 4);
      assert.strictEqual(suggestions[0].title, 'What performance issues exist with my page?');
      assert.strictEqual(suggestions[1].title, 'How can I reduce the size of my DOM?');
      assert.strictEqual(suggestions[2].title, 'How can I reduce the number of render-blocking requests?');
      assert.strictEqual(suggestions[3].title, 'Did anything slow down the request for this document?');
    });
  });

  describe('PerformanceTraceContext.getOrigin', () => {
    it('returns normal origin for fresh recordings', () => {
      const parsedTrace = {
        insights: new Map(),
        metadata: {},
        data: {
          Meta: {
            mainFrameURL: 'https://example.com/page',
            traceBounds: {min: 0, max: 100},
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace;

      Tracing.FreshRecording.Tracker.instance().registerFreshRecording(parsedTrace);
      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      assert.strictEqual(context.getOrigin(), 'https://example.com');
    });

    it('returns imported-trace origin for non-fresh (imported) recordings', () => {
      const parsedTrace = {
        insights: new Map(),
        metadata: {},
        data: {
          Meta: {
            mainFrameURL: 'https://example.com/page',
            traceBounds: {min: 0, max: 100},
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace;

      // Do not register as fresh
      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      assert.strictEqual(context.getOrigin(), 'imported-trace://example.com');
    });

    it('handles invalid URLs by prefixing the fallback URL', () => {
      const parsedTrace = {
        insights: new Map(),
        metadata: {},
        data: {
          Meta: {
            mainFrameURL: 'invalid-url',
            traceBounds: {min: 100, max: 200},
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace;

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      assert.strictEqual(context.getOrigin(), 'imported-trace://trace-100-200');
    });
  });

  describe('getEventByKey', () => {
    it('sanitizes headers for network requests', async function() {
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [
              {name: 'getEventByKey', args: {eventKey: 'valid-event-key'}},
            ]
          }],
          [{explanation: 'done'}]
        ])
      });

      const parsedTrace = {
        insights: new Map(),
        metadata: {
          cpuThrottling: undefined,
          networkThrottling: undefined,
        },
        data: {
          Meta: {
            mainFrameNavigations: [],
            traceBounds: {min: 0, max: 100},
            mainFrameURL: 'https://example.com',
          }
        }
      } as unknown as Trace.TraceModel.ParsedTrace;

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      await agent.run('test', {selected: context}).next();

      const focus = context.getItem();
      assert.exists(focus);

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
      };

      sinon.stub(focus, 'lookupEvent').callsFake(key => {
        if (key === 'valid-event-key') {
          return mockNetworkEvent as unknown as Trace.Types.Events.Event;
        }
        return null;
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
      assert.lengthOf(actions, 1);

      const action = actions[0] as AiAgent.ActionResponse;
      assert.exists(action.output);

      const parsedOutput = JSON.parse(action.output);
      const details = JSON.parse(parsedOutput.details);
      const responseHeaders = details.args.data.responseHeaders;

      assert.deepEqual(responseHeaders, [
        {name: 'x-csrf-token', value: '<redacted>'},
        {name: 'content-type', value: 'text/html'},
      ]);
    });

    it('sanitizes headers for ResourceReceiveResponse events', async function() {
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [
              {name: 'getEventByKey', args: {eventKey: 'valid-event-key'}},
            ]
          }],
          [{explanation: 'done'}]
        ])
      });

      const parsedTrace = {
        insights: new Map(),
        metadata: {
          cpuThrottling: undefined,
          networkThrottling: undefined,
        },
        data: {
          Meta: {
            mainFrameNavigations: [],
            traceBounds: {min: 0, max: 100},
            mainFrameURL: 'https://example.com',
          }
        }
      } as unknown as Trace.TraceModel.ParsedTrace;

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      await agent.run('test', {selected: context}).next();

      const focus = context.getItem();
      assert.exists(focus);

      const mockResourceEvent = {
        name: 'ResourceReceiveResponse',
        args: {
          data: {
            headers: [
              {name: 'x-csrf-token', value: 'secret'},
              {name: 'content-type', value: 'text/html'},
            ],
          },
        },
      };

      sinon.stub(focus, 'lookupEvent').callsFake(key => {
        if (key === 'valid-event-key') {
          return mockResourceEvent as unknown as Trace.Types.Events.Event;
        }
        return null;
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
      assert.lengthOf(actions, 1);

      const action = actions[0] as AiAgent.ActionResponse;
      assert.exists(action.output);

      const parsedOutput = JSON.parse(action.output);
      const details = JSON.parse(parsedOutput.details);
      const headers = details.args.data.headers;

      assert.deepEqual(headers, [
        {name: 'x-csrf-token', value: '<redacted>'},
        {name: 'content-type', value: 'text/html'},
      ]);
    });

    it('redacts sourceText for RundownScriptSource events', async function() {
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [
              {name: 'getEventByKey', args: {eventKey: 'valid-event-key'}},
            ]
          }],
          [{explanation: 'done'}]
        ])
      });

      const parsedTrace = {
        insights: new Map(),
        metadata: {
          cpuThrottling: undefined,
          networkThrottling: undefined,
        },
        data: {
          Meta: {
            mainFrameNavigations: [],
            traceBounds: {min: 0, max: 100},
            mainFrameURL: 'https://example.com',
          }
        }
      } as unknown as Trace.TraceModel.ParsedTrace;

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      await agent.run('test', {selected: context}).next();

      const focus = context.getItem();
      assert.exists(focus);

      const mockRundownSourceEvent = {
        cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
        name: 'ScriptCatchup',
        args: {
          data: {
            isolate: 1,
            scriptId: 2,
            sourceText: 'console.log("sensitive");',
          },
        },
      };

      sinon.stub(focus, 'lookupEvent').callsFake(key => {
        if (key === 'valid-event-key') {
          return mockRundownSourceEvent as unknown as Trace.Types.Events.Event;
        }
        return null;
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
      assert.lengthOf(actions, 1);

      const action = actions[0] as AiAgent.ActionResponse;
      assert.exists(action.output);

      const parsedOutput = JSON.parse(action.output);
      const details = JSON.parse(parsedOutput.details);
      assert.isUndefined(details.args.data.sourceText);
    });

    it('redacts sourceText for RundownScriptSourceLarge events', async function() {
      const agent = createAgentForConversation({
        aidaClient: mockAidaClient([
          [{
            explanation: '',
            functionCalls: [
              {name: 'getEventByKey', args: {eventKey: 'valid-event-key'}},
            ]
          }],
          [{explanation: 'done'}]
        ])
      });

      const parsedTrace = {
        insights: new Map(),
        metadata: {
          cpuThrottling: undefined,
          networkThrottling: undefined,
        },
        data: {
          Meta: {
            mainFrameNavigations: [],
            traceBounds: {min: 0, max: 100},
            mainFrameURL: 'https://example.com',
          }
        }
      } as unknown as Trace.TraceModel.ParsedTrace;

      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);
      await agent.run('test', {selected: context}).next();

      const focus = context.getItem();
      assert.exists(focus);

      const mockRundownSourceLargeEvent = {
        cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
        name: 'LargeScriptCatchup',
        args: {
          data: {
            isolate: 1,
            scriptId: 2,
            splitIndex: 0,
            splitCount: 1,
            sourceText: 'console.log("sensitive large");',
          },
        },
      };

      sinon.stub(focus, 'lookupEvent').callsFake(key => {
        if (key === 'valid-event-key') {
          return mockRundownSourceLargeEvent as unknown as Trace.Types.Events.Event;
        }
        return null;
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: context}));
      const actions = responses.filter(r => r.type === AiAgent.ResponseType.ACTION);
      assert.lengthOf(actions, 1);

      const action = actions[0] as AiAgent.ActionResponse;
      assert.exists(action.output);

      const parsedOutput = JSON.parse(action.output);
      const details = JSON.parse(parsedOutput.details);
      assert.isUndefined(details.args.data.sourceText);
    });
  });

  describe('getLabelName', () => {
    it('returns correct names for static labels', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);
      assert.strictEqual(PerformanceAgent.getLabelName('nav-to-lcp', focus), 'navigation to LCP');
      assert.strictEqual(PerformanceAgent.getLabelName('lcp-ttfb', focus), 'LCP to TTFB');
      assert.strictEqual(PerformanceAgent.getLabelName('lcp-render-delay', focus), 'LCP render delay');
      assert.strictEqual(PerformanceAgent.getLabelName('trace-bounds', focus), 'the entire trace');
      assert.strictEqual(
          PerformanceAgent.getLabelName('NO_NAVIGATION', focus), 'the period before the first navigation');
    });

    it('returns correct name for navigation labels', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);
      const insightSet = Array.from(parsedTrace.insights!.values())[0];
      const navId = insightSet.id;
      assert.exists(navId);
      assert.strictEqual(
          PerformanceAgent.getLabelName(navId as PerformanceAgent.MainThreadSectionLabel, focus),
          `navigation to ${insightSet.url.href}`,
      );
    });

    it('returns correct name for insight labels', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);
      assert.strictEqual(PerformanceAgent.getLabelName('LCPBreakdown', focus), 'LCP breakdown insight');
      assert.strictEqual(PerformanceAgent.getLabelName('CLSCulprits', focus), 'Layout shift culprits insight');
    });

    it('returns the label itself for unknown labels', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-discovery-delay.json.gz');
      const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);
      assert.strictEqual(
          PerformanceAgent.getLabelName('unknown-label' as PerformanceAgent.MainThreadSectionLabel, focus),
          'unknown-label',
      );
    });
  });

  describe('clearCache', () => {
    it('clears the formatter and trace facts, forcing recreation with new target', async () => {
      const parsedTrace = {
        insights: new Map(),
        metadata: {},
        data: {
          Meta: {
            mainFrameURL: 'https://example.com/page',
            traceBounds: {min: 0, max: 100},
            mainFrameNavigations: [],
          },
          Scripts: {
            scripts: [],
          },
          NetworkRequests: {
            byTime: [],
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace;

      Tracing.FreshRecording.Tracker.instance().registerFreshRecording(parsedTrace);

      const target1 = createTarget();
      const target2 = createTarget();

      const debuggerModel1 = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
      debuggerModel1.scripts.returns([]);
      const target1ModelStub = sinon.stub(target1, 'model').callThrough();
      target1ModelStub.withArgs(SDK.DebuggerModel.DebuggerModel).returns(debuggerModel1);

      const debuggerModel2 = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
      debuggerModel2.scripts.returns([]);
      const target2ModelStub = sinon.stub(target2, 'model').callThrough();
      target2ModelStub.withArgs(SDK.DebuggerModel.DebuggerModel).returns(debuggerModel2);

      const primaryPageTargetStub = sinon.stub(SDK.TargetManager.TargetManager.instance(), 'primaryPageTarget');
      primaryPageTargetStub.returns(target1);

      const aidaClient = mockAidaClient([
        [{explanation: 'answer 1'}], [{
          explanation: '',
          functionCalls:
              [{name: 'getFunctionCode', args: {scriptUrl: 'https://example.com/script.js', line: 10, column: 5}}]
        }],
        [{explanation: 'done'}]
      ]);

      const agent = new PerformanceAgent.PerformanceAgent({aidaClient});
      const context = PerformanceAgent.PerformanceTraceContext.fromParsedTrace(parsedTrace);

      // Run 1: Initialize formatter with target 1
      await Array.fromAsync(agent.run('test 1', {selected: context}));

      target1ModelStub.resetHistory();

      // Change primary target to target 2
      primaryPageTargetStub.returns(target2);

      // Call clearCache
      agent.clearCache();

      // Run 2: Trigger function call which uses the resolver
      await Array.fromAsync(agent.run('test 2', {selected: context}));

      // Verify that the resolver was called with target 2, not target 1
      sinon.assert.calledWith(
          target2ModelStub,
          SDK.DebuggerModel.DebuggerModel,
      );
      sinon.assert.neverCalledWith(
          target1ModelStub,
          SDK.DebuggerModel.DebuggerModel,
      );
    });
  });
});
