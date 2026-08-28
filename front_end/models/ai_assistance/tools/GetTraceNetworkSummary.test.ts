// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

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
import type * as Trace from '../../trace/trace.js';
import * as AiAssistance from '../ai_assistance.js';

describe('GetTraceNetworkSummaryTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  const GetTraceNetworkSummaryTool = AiAssistance.GetTraceNetworkSummary.GetTraceNetworkSummaryTool;

  it('returns display info', () => {
    const tool = new GetTraceNetworkSummaryTool();
    const displayInfo = tool.displayInfoFromArgs({min: 10, max: 50});
    assert.strictEqual(displayInfo.title, 'Network activity summary');
    assert.strictEqual(displayInfo.action, 'getTraceNetworkSummary({min: 10, max: 50})');
  });

  it('returns error when PerformanceTraceContext is not available', async () => {
    const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      getPerformanceTraceContext: () => null,
    };

    const tool = new GetTraceNetworkSummaryTool();
    const result = await tool.handler({min: 10, max: 50}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance trace context is not available.');
  });

  it('returns error when bounds are invalid', async () => {
    const parsedTrace = makeFakeParsedTrace();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        new Tracing.FreshRecording.Tracker(),
        universe.debuggerWorkspaceBinding,
    );
    sinon.stub(traceContext, 'createBounds').returns(null);

    const capabilities: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      getPerformanceTraceContext: () => traceContext,
    };

    const tool = new GetTraceNetworkSummaryTool();
    const result = await tool.handler({min: 50, max: 10}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Invalid bounds.');
  });

  it('returns formatted summary and NETWORK_TRACK widget on success', async () => {
    const parsedTrace = makeFakeParsedTrace();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        new Tracing.FreshRecording.Tracker(),
        universe.debuggerWorkspaceBinding,
    );
    const mockBounds = {min: 10, max: 50} as unknown as Trace.Types.Timing.TraceWindowMicro;
    sinon.stub(traceContext, 'createBounds').returns(mockBounds);

    stubPerformanceTraceFormatter(traceContext, {
      formatNetworkTrackSummary: sinon.stub().returns('mock network summary details'),
    });

    const capabilities: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      getPerformanceTraceContext: () => traceContext,
    };

    const tool = new GetTraceNetworkSummaryTool();
    const result = await tool.handler({min: 10, max: 50}, capabilities);

    assertIsResult(result);
    assert.strictEqual(result.result, 'mock network summary details');
    assert.deepEqual(result.widgets, [{
                       name: 'NETWORK_TRACK',
                       data: {
                         parsedTrace,
                         bounds: mockBounds,
                       },
                     }]);
  });
});
