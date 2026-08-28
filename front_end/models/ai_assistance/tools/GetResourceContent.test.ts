// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
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
import type * as Trace from '../../trace/trace.js';
import * as AiAssistance from '../ai_assistance.js';

const GetResourceContentTool = AiAssistance.GetResourceContent.GetResourceContentTool;

const {urlString} = Platform.DevToolsPath;

describe('GetResourceContentTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    universe.createTarget();
  });

  function createCapabilities(
      traceContext: AiAssistance.PerformanceTraceContext.PerformanceTraceContext|null,
      target: SDK.Target.Target|null = universe.targetManager.primaryPageTarget(),
      ): AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.TargetCapability&
      AiAssistance.Tool.PerformanceTraceCapability {
    return {
      getPerformanceTraceContext: () => traceContext,
      getTarget: () => target,
    };
  }

  it('returns display info', () => {
    const tool = new GetResourceContentTool();
    const displayInfo = tool.displayInfoFromArgs({url: 'https://example.com/script.js'});
    assert.strictEqual(displayInfo.title, 'Looking at resource content');
    assert.strictEqual(displayInfo.action, 'getResourceContent(\'https://example.com/script.js\')');
  });

  it('returns error when PerformanceTraceContext is not available', async () => {
    const context = createCapabilities(null);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://example.com/script.js'}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance trace context is not available.');
  });

  it('returns error when trace is imported', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = createCapabilities(traceContext);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://example.com/script.js'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Cannot use this tool on an imported file.');
  });

  it('returns error when resource URL is cross-origin or file://', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = createCapabilities(traceContext);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://cross-origin.com/script.js'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Resource not found');
  });

  it('returns script content from parsedTrace scripts cache when available', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    parsedTrace.data.Scripts.scripts.push({
      isolate: '1',
      scriptId: '1' as Protocol.Runtime.ScriptId,
      frame: 'frame1',
      ts: 0 as Trace.Types.Timing.Micro,
      inline: false,
      url: 'https://example.com/script.js',
      content: 'console.log("cached script");',
    });

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = createCapabilities(traceContext);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://example.com/script.js'}, capabilities);

    assertIsResult(result);
    assert.deepEqual(result.result, {content: 'console.log("cached script");'});
    assert.deepEqual(result.widgets, [{
                       name: 'SOURCE_CODE',
                       data: {
                         url: urlString`https://example.com/script.js`,
                         code: 'console.log("cached script");',
                       },
                     }]);
  });

  it('falls back to ResourceTreeModel when not in parsedTrace scripts', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const mockResource = {
      requestContentData: sinon.stub().resolves(
          new TextUtils.ContentData.ContentData('content from resource', false, 'text/javascript')),
    } as unknown as SDK.Resource.Resource;

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'resourceForURL').returns(mockResource);

    const capabilities = createCapabilities(traceContext);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://example.com/script.js'}, capabilities);

    assertIsResult(result);
    assert.deepEqual(result.result, {content: 'content from resource'});
    assert.deepEqual(result.widgets, [{
                       name: 'SOURCE_CODE',
                       data: {
                         url: urlString`https://example.com/script.js`,
                         code: 'content from resource',
                       },
                     }]);
  });

  it('returns error when resource data request fails', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const mockResource = {
      requestContentData: sinon.stub().resolves({error: 'Failed to load content'}),
    } as unknown as SDK.Resource.Resource;

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'resourceForURL').returns(mockResource);

    const capabilities = createCapabilities(traceContext);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://example.com/script.js'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Could not get resource content: Failed to load content');
  });

  it('returns error for binary resources', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const mockResource = {
      requestContentData: sinon.stub().resolves(new TextUtils.ContentData.ContentData('AQIDBA==', true, 'image/png')),
    } as unknown as SDK.Resource.Resource;

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'resourceForURL').returns(mockResource);

    const capabilities = createCapabilities(traceContext);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://example.com/image.png'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Cannot retrieve content for non-text resource');
  });

  it('returns error when resource is not found in ResourceTreeModel', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'resourceForURL').returns(null);

    const capabilities = createCapabilities(traceContext);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://example.com/missing.js'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Resource not found');
  });

  it('returns error when target is not available', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = createCapabilities(traceContext, null);

    const tool = new GetResourceContentTool();
    const result = await tool.handler({url: 'https://example.com/script.js'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Resource not found');
  });
});
