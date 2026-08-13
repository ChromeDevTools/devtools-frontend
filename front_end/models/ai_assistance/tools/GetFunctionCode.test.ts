// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import {
  assertIsError,
  assertIsResult,
  makeFakeParsedTrace,
  stubPerformanceTraceFormatter,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import type * as SourceMapScopes from '../../source_map_scopes/source_map_scopes.js';
import * as AiAssistance from '../ai_assistance.js';

const GetFunctionCodeTool = AiAssistance.GetFunctionCode.GetFunctionCodeTool;

const {urlString} = Platform.DevToolsPath;

describe('GetFunctionCodeTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('returns display info', () => {
    const tool = new GetFunctionCodeTool();
    const displayInfo = tool.displayInfoFromArgs({scriptUrl: 'https://example.com/app.js', line: 10, column: 5});
    assert.strictEqual(displayInfo.title, 'Looking up function code');
    assert.strictEqual(displayInfo.action, 'getFunctionCode(\'https://example.com/app.js\', 10, 5)');
  });

  it('returns error when conversationContext is not available', async () => {
    const context = {
      conversationContext: null,
    };

    const tool = new GetFunctionCodeTool();
    const result = await tool.handler({scriptUrl: 'https://example.com/app.js', line: 10, column: 5}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance trace context is not available.');
  });

  it('returns error when trace is imported', async () => {
    const parsedTrace = makeFakeParsedTrace();
    // Do not mark parsedTrace as fresh
    const tracker = new Tracing.FreshRecording.Tracker();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetFunctionCodeTool();
    const result = await tool.handler({scriptUrl: 'https://example.com/app.js', line: 10, column: 5}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Cannot use this tool on an imported file.');
  });

  it('returns error when script URL is cross-origin or file://', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetFunctionCodeTool();
    const result =
        await tool.handler({scriptUrl: 'https://cross-origin.com/app.js', line: 10, column: 5}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Script not found');
  });

  it('returns error when scriptUrl is missing', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetFunctionCodeTool();
    const result = await tool.handler({scriptUrl: '', line: 10, column: 5}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Missing arg: scriptUrl');
  });

  it('returns error when line is missing', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetFunctionCodeTool();
    const result = await tool.handler(
        {scriptUrl: 'https://example.com/app.js', line: undefined as unknown as number, column: 5}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Missing arg: line');
  });

  it('returns error when column is missing', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetFunctionCodeTool();
    const result = await tool.handler(
        {scriptUrl: 'https://example.com/app.js', line: 10, column: undefined as unknown as number}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Missing arg: column');
  });

  it('returns error when function code cannot be resolved', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    stubPerformanceTraceFormatter(traceContext, {
      resolveFunctionCodeAtLocation: sinon.stub().resolves(null),
    });

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetFunctionCodeTool();
    const result = await tool.handler({scriptUrl: 'https://example.com/app.js', line: 10, column: 5}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Could not find code');
  });

  it('returns formatted function code and widget on success', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const mockFunctionCode = {
      code: 'function test() { return 42; }',
      functionBounds: {
        uiSourceCode: {url: () => urlString`https://example.com/app.js`},
        range: {toString: () => '10:5'},
      },
    } as unknown as SourceMapScopes.FunctionCodeResolver.FunctionCode;

    stubPerformanceTraceFormatter(traceContext, {
      resolveFunctionCodeAtLocation: sinon.stub().resolves(mockFunctionCode),
      formatFunctionCode: sinon.stub().returns('mock formatted function code with annotations'),
    });

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetFunctionCodeTool();
    const result = await tool.handler({scriptUrl: 'https://example.com/app.js', line: 10, column: 5}, capabilities);

    assertIsResult(result);
    assert.strictEqual(result.result, 'mock formatted function code with annotations');
    assert.deepEqual(result.widgets, [{
                       name: 'SOURCE_CODE',
                       data: {
                         url: urlString`https://example.com/app.js`,
                         line: 10,
                         column: 5,
                         code: 'function test() { return 42; }',
                       },
                     }]);
  });
});
