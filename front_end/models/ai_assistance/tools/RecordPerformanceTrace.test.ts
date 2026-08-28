// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import {
  assertIsContext,
  assertIsError,
  initializePersistenceImplForTests,
} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import type * as Trace from '../../trace/trace.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('RecordPerformanceTraceTool', () => {
  beforeEach(() => {
    initializePersistenceImplForTests();
  });
  const RecordPerformanceTraceTool = AiAssistance.RecordPerformanceTrace.RecordPerformanceTraceTool;

  it('returns display info', () => {
    const tool = new RecordPerformanceTraceTool();
    const displayInfo = tool.displayInfoFromArgs();
    assert.strictEqual(displayInfo.title, 'Recording a performance trace');
    assert.strictEqual(displayInfo.action, 'recordPerformanceTrace()');
  });

  it('calls performanceRecordAndReload callback and returns trace context and widget', async () => {
    const mockTrace = {
      insights: new Map(),
    } as unknown as Trace.TraceModel.ParsedTrace;
    const callback = sinon.stub().resolves(mockTrace);
    const context = {
      performanceRecordAndReload: callback,
    };

    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, context);

    assertIsContext(result);
    sinon.assert.calledOnce(callback);
    assert.instanceOf(result.context, AiAssistance.PerformanceTraceContext.PerformanceTraceContext);
    assert.strictEqual(result.description, 'User recorded a performance trace');
    assert.deepEqual(result.widgets, [{name: 'PERFORMANCE_TRACE', data: {parsedTrace: mockTrace}}]);
  });

  it('returns error when performanceRecordAndReload is not available', async () => {
    const context = {
    };

    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance recording is not available.');
  });

  it('returns error when performanceRecordAndReload throws an exception', async () => {
    const callback = sinon.stub().rejects(new Error('Recording failed'));
    const context = {
      performanceRecordAndReload: callback,
    };

    const tool = new RecordPerformanceTraceTool();
    const result = await tool.handler({}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Failed to record performance trace: Recording failed');
  });
});
