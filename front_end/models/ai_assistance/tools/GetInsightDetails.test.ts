// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import {
  assertIsError,
  assertIsResult,
  makeFakeParsedTrace,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Logs from '../../logs/logs.js';
import * as Trace from '../../trace/trace.js';
import * as AiAssistance from '../ai_assistance.js';

const GetInsightDetailsTool = AiAssistance.GetInsightDetails.GetInsightDetailsTool;

describe('GetInsightDetailsTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    universe.createTarget();
  });

  /**
   * Creates capabilities backed by a PerformanceTraceContext for testing performance tools.
   * By default, marks the parsed trace as a fresh recording unless isFresh is explicitly false.
   */
  function createPerformanceTraceCapabilities(
      parsedTrace: Trace.TraceModel.ParsedTrace,
      options: {
        isFresh?: boolean,
        target?: SDK.Target.Target|null,
      } = {},
  ) {
    const tracker = new Tracing.FreshRecording.Tracker();
    if (options.isFresh ?? true) {
      tracker.registerFreshRecording(parsedTrace);
    }
    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );
    return {
      getPerformanceTraceContext: () => traceContext,
      getTarget: () => options.target ?? universe.targetManager.primaryPageTarget(),
    };
  }

  it('returns display info', () => {
    const tool = new GetInsightDetailsTool();
    const displayInfo = tool.displayInfoFromArgs({insightSetId: 'set-1', insightName: 'LCPBreakdown'});
    assert.strictEqual(displayInfo.title, 'Investigating insight LCPBreakdown');
    assert.strictEqual(displayInfo.action, 'getInsightDetails(\'set-1\', \'LCPBreakdown\')');
  });

  it('returns error when PerformanceTraceContext is not available', async () => {
    const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.TargetCapability&
        AiAssistance.Tool.PerformanceTraceCapability = {
      getPerformanceTraceContext: () => null,
      getTarget: () => universe.targetManager.primaryPageTarget(),
    };

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: 'set-1', insightName: 'LCPBreakdown'}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance trace context is not available.');
  });

  it('returns error when required arguments are missing', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const capabilities = createPerformanceTraceCapabilities(parsedTrace);

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: '', insightName: 'LCPBreakdown'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Missing required arguments: insightSetId and insightName must be provided.');
  });

  it('returns error when insightSetId is invalid', async () => {
    const parsedTrace = makeFakeParsedTrace();
    parsedTrace.insights = new Map([
      [
        'valid-set-1' as Trace.Types.Events.NavigationId,
        {
          id: 'valid-set-1',
          url: new URL('https://example.com'),
          bounds: {min: 0, max: 1000} as Trace.Types.Timing.TraceWindowMicro,
          model: {},
        } as unknown as Trace.Insights.Types.InsightSet,
      ],
    ]);

    const capabilities = createPerformanceTraceCapabilities(parsedTrace);

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: 'invalid-set', insightName: 'LCPBreakdown'}, capabilities);

    assertIsError(result);
    assert.include(result.error, 'Invalid insight set id. Valid insight set ids are:');
    assert.include(result.error, 'id: valid-set-1');
  });

  it('returns error when insightName is invalid', async () => {
    const parsedTrace = makeFakeParsedTrace();
    parsedTrace.insights = new Map([
      [
        'valid-set-1' as Trace.Types.Events.NavigationId,
        {
          id: 'valid-set-1',
          url: new URL('https://example.com'),
          bounds: {min: 0, max: 1000} as Trace.Types.Timing.TraceWindowMicro,
          model: {
            RenderBlocking: {
              insightKey: 'RenderBlocking',
              state: 'fail',
            },
          },
        } as unknown as Trace.Insights.Types.InsightSet,
      ],
    ]);

    const capabilities = createPerformanceTraceCapabilities(parsedTrace);

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: 'valid-set-1', insightName: 'NonExistentInsight'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'No insight available. Valid insight names are: RenderBlocking');
  });

  it('blocks insightName matching prototype properties', async () => {
    const parsedTrace = makeFakeParsedTrace();
    parsedTrace.insights = new Map([
      [
        'valid-set-1' as Trace.Types.Events.NavigationId,
        {
          id: 'valid-set-1',
          url: new URL('https://example.com'),
          bounds: {min: 0, max: 1000} as Trace.Types.Timing.TraceWindowMicro,
          model: {
            RenderBlocking: {
              insightKey: 'RenderBlocking',
              state: 'fail',
            },
          },
        } as unknown as Trace.Insights.Types.InsightSet,
      ],
    ]);

    const capabilities = createPerformanceTraceCapabilities(parsedTrace);

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: 'valid-set-1', insightName: 'toString'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'No insight available. Valid insight names are: RenderBlocking');
  });

  it('returns error when insight calculation failed in modelErrors', async () => {
    const parsedTrace = makeFakeParsedTrace();
    parsedTrace.insights = new Map([
      [
        'valid-set-1' as Trace.Types.Events.NavigationId,
        {
          id: 'valid-set-1',
          url: new URL('https://example.com'),
          bounds: {min: 0, max: 1000} as Trace.Types.Timing.TraceWindowMicro,
          model: {},
          modelErrors: {
            RenderBlocking: new Error('Parsing failed for RenderBlocking'),
          },
        } as unknown as Trace.Insights.Types.InsightSet,
      ],
    ]);

    const capabilities = createPerformanceTraceCapabilities(parsedTrace);

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: 'valid-set-1', insightName: 'RenderBlocking'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error,
                       'Insight "RenderBlocking" failed during trace processing: Parsing failed for RenderBlocking');
  });

  it('returns formatted insight details and PERF_INSIGHT widget on success', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(parsedTrace.insights);
    const insightSetId = [...parsedTrace.insights.keys()][0];
    const insightSet = parsedTrace.insights.get(insightSetId)!;

    insightSet.model.RenderBlocking = {
      insightKey: 'RenderBlocking',
      state: 'fail',
      renderBlockingRequests: [],
    } as unknown as Trace.Insights.Types.InsightModels['RenderBlocking'];

    const capabilities = createPerformanceTraceCapabilities(parsedTrace);

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: insightSet.id, insightName: 'RenderBlocking'}, capabilities);

    assertIsResult(result);
    assert.isString(result.result);
    assert.exists(result.widgets);
    const perfInsightWidget = result.widgets?.find(w => w.name === 'PERF_INSIGHT');
    assert.exists(perfInsightWidget);
    assert.strictEqual(perfInsightWidget?.data.insight, Trace.Insights.Types.InsightKeys.RENDER_BLOCKING);
    assert.strictEqual(perfInsightWidget?.data.insightData, insightSet.model.RenderBlocking);
  });

  it('resolves DOM node snapshot and emits DOM_TREE widget for LCPBreakdown insight', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(parsedTrace.insights);
    const insightSetId = [...parsedTrace.insights.keys()][0];
    const insightSet = parsedTrace.insights.get(insightSetId)!;

    insightSet.model.LCPBreakdown = {
      insightKey: 'LCPBreakdown',
      state: 'fail',
      lcpMs: 1000 as Trace.Types.Timing.Milli,
      lcpEvent: {
        name: 'largestContentfulPaint::Candidate',
        args: {data: {nodeId: 4 as Protocol.DOM.BackendNodeId}},
      } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
    } as Trace.Insights.Types.InsightModels['LCPBreakdown'];

    const target = universe.targetManager.primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    assert.isOk(domModel);

    const mockSnapshot = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
    const fakeNode = {
      takeSnapshot: sinon.stub().resolves(mockSnapshot),
    } as unknown as SDK.DOMModel.DOMNode;

    sinon.stub(domModel, 'pushNodesByBackendIdsToFrontend')
        .resolves(new Map([[4 as Protocol.DOM.BackendNodeId, fakeNode]]));

    const capabilities = createPerformanceTraceCapabilities(parsedTrace, {isFresh: true, target});

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: insightSet.id, insightName: 'LCPBreakdown'}, capabilities);

    assertIsResult(result);
    assert.isString(result.result);
    assert.exists(result.widgets);

    const domTreeWidget = result.widgets?.find(w => w.name === 'DOM_TREE');
    assert.exists(domTreeWidget);
    assert.strictEqual(domTreeWidget?.data.title, 'LCP element');
    assert.strictEqual(domTreeWidget?.data.root, mockSnapshot);
  });

  it('resolves DOM node snapshot and network image content when LCP request is present', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(parsedTrace.insights);
    const insightSetId = [...parsedTrace.insights.keys()][0];
    const insightSet = parsedTrace.insights.get(insightSetId)!;

    const fakeSyntheticRequest = {
      args: {
        data: {
          requestId: 'req-1',
          url: 'https://example.com/image.png',
          decodedBodyLength: 1024,
          encodedDataLength: 512,
          resourceType: 'Image' as Protocol.Network.ResourceType,
          mimeType: 'image/png',
        },
      },
    } as unknown as Trace.Types.Events.SyntheticNetworkRequest;

    insightSet.model.LCPBreakdown = {
      insightKey: 'LCPBreakdown',
      state: 'fail',
      lcpMs: 1000 as Trace.Types.Timing.Milli,
      lcpRequest: fakeSyntheticRequest,
      lcpEvent: {
        name: 'largestContentfulPaint::Candidate',
        args: {data: {nodeId: 4 as Protocol.DOM.BackendNodeId}},
      } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
    } as Trace.Insights.Types.InsightModels['LCPBreakdown'];

    const target = universe.targetManager.primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    assert.isOk(domModel);

    const mockSnapshot = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
    const fakeNode = {
      takeSnapshot: sinon.stub().resolves(mockSnapshot),
    } as unknown as SDK.DOMModel.DOMNode;

    sinon.stub(domModel, 'pushNodesByBackendIdsToFrontend')
        .resolves(new Map([[4 as Protocol.DOM.BackendNodeId, fakeNode]]));

    const fakeContentData = new TextUtils.ContentData.ContentData('base64image', true, 'image/png');
    const fakeSDKRequest = {
      contentType: () => Common.ResourceType.resourceTypes.Image,
      requestContentData: sinon.stub().resolves(fakeContentData),
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    const networkLog = Logs.NetworkLog.NetworkLog.instance();
    sinon.stub(networkLog, 'requestByManagerAndId').returns(fakeSDKRequest);

    const capabilities = createPerformanceTraceCapabilities(parsedTrace, {isFresh: true, target});

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: insightSet.id, insightName: 'LCPBreakdown'}, capabilities);

    assertIsResult(result);
    const domTreeWidget = result.widgets?.find(w => w.name === 'DOM_TREE');
    assert.exists(domTreeWidget);
    assert.deepEqual(domTreeWidget?.data.networkRequest, {
      url: 'https://example.com/image.png',
      size: 1024,
      resourceType: 'Image' as Protocol.Network.ResourceType,
      mimeType: 'image/png',
      imageContent: fakeContentData,
    });
  });

  it('resolves DOM node snapshot and emits DOM_TREE widget for LCPDiscovery insight', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(parsedTrace.insights);
    const insightSetId = [...parsedTrace.insights.keys()][0];
    const insightSet = parsedTrace.insights.get(insightSetId)!;

    insightSet.model.LCPDiscovery = {
      insightKey: 'LCPDiscovery',
      state: 'fail',
      lcpEvent: {
        name: 'largestContentfulPaint::Candidate',
        args: {data: {nodeId: 4 as Protocol.DOM.BackendNodeId}},
      } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
    } as Trace.Insights.Types.InsightModels['LCPDiscovery'];

    const target = universe.targetManager.primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    assert.isOk(domModel);

    const mockSnapshot = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
    const fakeNode = {
      takeSnapshot: sinon.stub().resolves(mockSnapshot),
    } as unknown as SDK.DOMModel.DOMNode;

    sinon.stub(domModel, 'pushNodesByBackendIdsToFrontend')
        .resolves(new Map([[4 as Protocol.DOM.BackendNodeId, fakeNode]]));

    const capabilities = createPerformanceTraceCapabilities(parsedTrace, {isFresh: true, target});

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: insightSet.id, insightName: 'LCPDiscovery'}, capabilities);

    assertIsResult(result);
    const domTreeWidget = result.widgets?.find(w => w.name === 'DOM_TREE');
    assert.exists(domTreeWidget);
    assert.strictEqual(domTreeWidget?.data.title, 'LCP element');
  });

  it('omits DOM_TREE widget on imported traces', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(parsedTrace.insights);
    const insightSetId = [...parsedTrace.insights.keys()][0];
    const insightSet = parsedTrace.insights.get(insightSetId)!;

    insightSet.model.LCPBreakdown = {
      insightKey: 'LCPBreakdown',
      state: 'fail',
      lcpMs: 1000 as Trace.Types.Timing.Milli,
      lcpEvent: {
        name: 'largestContentfulPaint::Candidate',
        args: {data: {nodeId: 4 as Protocol.DOM.BackendNodeId}},
      } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
    } as Trace.Insights.Types.InsightModels['LCPBreakdown'];

    const target = universe.targetManager.primaryPageTarget();
    const capabilities = createPerformanceTraceCapabilities(parsedTrace, {isFresh: false, target});

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: insightSet.id, insightName: 'LCPBreakdown'}, capabilities);

    assertIsResult(result);
    assert.isString(result.result);
    assert.exists(result.widgets);
    const domTreeWidget = result.widgets?.find(w => w.name === 'DOM_TREE');
    assert.isUndefined(domTreeWidget);
    const perfInsightWidget = result.widgets?.find(w => w.name === 'PERF_INSIGHT');
    assert.exists(perfInsightWidget);
  });

  it('handles DOM snapshotting rejection gracefully without failing the tool handler', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(parsedTrace.insights);
    const insightSetId = [...parsedTrace.insights.keys()][0];
    const insightSet = parsedTrace.insights.get(insightSetId)!;

    insightSet.model.LCPBreakdown = {
      insightKey: 'LCPBreakdown',
      state: 'fail',
      lcpMs: 1000 as Trace.Types.Timing.Milli,
      lcpEvent: {
        name: 'largestContentfulPaint::Candidate',
        args: {data: {nodeId: 4 as Protocol.DOM.BackendNodeId}},
      } as unknown as Trace.Types.Events.LargestContentfulPaintCandidate,
    } as Trace.Insights.Types.InsightModels['LCPBreakdown'];

    const target = universe.targetManager.primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    assert.isOk(domModel);

    sinon.stub(domModel, 'pushNodesByBackendIdsToFrontend').rejects(new Error('CDP target detached'));

    const capabilities = createPerformanceTraceCapabilities(parsedTrace, {isFresh: true, target});

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: insightSet.id, insightName: 'LCPBreakdown'}, capabilities);

    assertIsResult(result);
    assert.isString(result.result);
    const domTreeWidget = result.widgets?.find(w => w.name === 'DOM_TREE');
    assert.isUndefined(domTreeWidget);
  });

  it('returns error when formatted details exceed MAX_FUNCTION_RESULT_BYTE_LENGTH', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    assert.isOk(parsedTrace.insights);
    const insightSetId = [...parsedTrace.insights.keys()][0];
    const insightSet = parsedTrace.insights.get(insightSetId)!;

    insightSet.model.RenderBlocking = {
      insightKey: 'RenderBlocking',
      state: 'fail',
      renderBlockingRequests: [],
    } as unknown as Trace.Insights.Types.InsightModels['RenderBlocking'];

    sinon.stub(AiAssistance.PerformanceInsightFormatter.PerformanceInsightFormatter.prototype, 'formatInsight')
        .returns('x'.repeat(AiAssistance.Tool.MAX_FUNCTION_RESULT_BYTE_LENGTH + 1));

    const capabilities = createPerformanceTraceCapabilities(parsedTrace);

    const tool = new GetInsightDetailsTool();
    const result = await tool.handler({insightSetId: insightSet.id, insightName: 'RenderBlocking'}, capabilities);

    assertIsError(result);
    assert.include(result.error, 'too large to fit in the context window');
  });
});
