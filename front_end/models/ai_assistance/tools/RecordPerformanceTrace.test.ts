// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import * as sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import {
  assertIsContext,
  assertIsError,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as Bindings from '../../bindings/bindings.js';
import type * as Trace from '../../trace/trace.js';
import * as AiAssistance from '../ai_assistance.js';

describe('RecordPerformanceTraceTool', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  const RecordPerformanceTraceTool = AiAssistance.RecordPerformanceTrace.RecordPerformanceTraceTool;
  const mockTrace = {
    insights: new Map(),
  } as unknown as Trace.TraceModel.ParsedTrace;

  function createTargetWithDebugger(isPaused: boolean): sinon.SinonStubbedInstance<SDK.Target.Target> {
    const target = sinon.createStubInstance(SDK.Target.Target);
    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.isPaused.returns(isPaused);
    target.model.withArgs(SDK.DebuggerModel.DebuggerModel).returns(debuggerModel);
    return target;
  }

  it('returns display info', () => {
    const tool = new RecordPerformanceTraceTool();
    const displayInfo = tool.displayInfoFromArgs();
    assert.strictEqual(displayInfo.title, 'Recording a performance trace');
    assert.strictEqual(displayInfo.action, 'recordPerformanceTrace()');
  });

  it('calls performanceRecordAndReload callback and returns trace context and widget', async () => {
    const callback = sinon.stub().resolves(mockTrace);

    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, {performanceRecordAndReload: callback, getTarget: () => null});

    assertIsContext(result);
    sinon.assert.calledOnce(callback);
    assert.instanceOf(result.context, AiAssistance.PerformanceTraceContext.PerformanceTraceContext);
    assert.strictEqual(result.description, 'User recorded a performance trace');
    assert.deepEqual(result.widgets, [{name: 'PERFORMANCE_TRACE', data: {parsedTrace: mockTrace}}]);
  });

  it('returns error when performanceRecordAndReload is not available', async () => {
    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, {getTarget: () => null});

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance recording is not available.');
  });

  it('returns error when performanceRecordAndReload throws an exception', async () => {
    const callback = sinon.stub().rejects(new Error('Recording failed'));

    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, {performanceRecordAndReload: callback, getTarget: () => null});

    assertIsError(result);
    assert.strictEqual(result.error, 'Failed to record performance trace: Recording failed');
  });

  it('returns error without recording when JavaScript execution is paused on a breakpoint', async () => {
    const callback = sinon.stub().resolves(mockTrace);
    const target = createTargetWithDebugger(true);

    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, {performanceRecordAndReload: callback, getTarget: () => target});

    assertIsError(result);
    assert.strictEqual(
        result.error,
        'Error: Cannot record a performance trace because JavaScript execution is paused on a breakpoint. Do not retry; ask the user to resume execution in the Sources panel first.',
    );
    sinon.assert.notCalled(callback);
  });

  it('returns unavailable error ahead of paused check when performanceRecordAndReload is missing', async () => {
    const target = createTargetWithDebugger(true);

    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, {getTarget: () => target});

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance recording is not available.');
  });

  it('records a performance trace when the debugger is not paused', async () => {
    const callback = sinon.stub().resolves(mockTrace);
    const target = createTargetWithDebugger(false);

    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, {performanceRecordAndReload: callback, getTarget: () => target});

    assertIsContext(result);
    sinon.assert.calledOnce(callback);
    assert.instanceOf(result.context, AiAssistance.PerformanceTraceContext.PerformanceTraceContext);
    assert.strictEqual(result.description, 'User recorded a performance trace');
    assert.deepEqual(result.widgets, [{name: 'PERFORMANCE_TRACE', data: {parsedTrace: mockTrace}}]);
  });
});
