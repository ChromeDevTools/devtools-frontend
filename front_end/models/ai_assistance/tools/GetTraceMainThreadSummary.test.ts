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

describe('GetTraceMainThreadSummaryTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  const GetTraceMainThreadSummaryTool = AiAssistance.GetTraceMainThreadSummary.GetTraceMainThreadSummaryTool;

  it('returns display info', () => {
    const tool = new GetTraceMainThreadSummaryTool();
    const displayInfo = tool.displayInfoFromArgs({label: 'nav-to-lcp'});
    assert.strictEqual(displayInfo.title, 'Main thread activity: nav-to-lcp');
    assert.strictEqual(displayInfo.action, 'getTraceMainThreadSummary(\'nav-to-lcp\')');
  });

  it('returns error when conversationContext is not available', async () => {
    const context = {
      conversationContext: null,
    };

    const tool = new GetTraceMainThreadSummaryTool();
    const result = await tool.handler({label: 'nav-to-lcp'}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance trace context is not available.');
  });

  it('returns error when label bounds cannot be resolved', async () => {
    const parsedTrace = makeFakeParsedTrace();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        new Tracing.FreshRecording.Tracker(),
        universe.debuggerWorkspaceBinding,
    );
    sinon.stub(traceContext, 'getBoundsForLabel').returns(null);

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetTraceMainThreadSummaryTool();
    const result = await tool.handler({label: 'NAVIGATION_invalid'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Invalid label: NAVIGATION_invalid');
  });

  it('returns formatted summary and widgets on success', async () => {
    const parsedTrace = makeFakeParsedTrace();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        new Tracing.FreshRecording.Tracker(),
        universe.debuggerWorkspaceBinding,
    );
    const mockBounds = {min: 10, max: 50} as unknown as Trace.Types.Timing.TraceWindowMicro;
    sinon.stub(traceContext, 'getBoundsForLabel').withArgs('trace-bounds').returns(mockBounds);

    stubPerformanceTraceFormatter(traceContext, {
      formatMainThreadTrackSummary: sinon.stub().resolves('mock main thread summary details'),
    });

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetTraceMainThreadSummaryTool();
    const result = await tool.handler({label: 'trace-bounds'}, capabilities);

    assertIsResult(result);
    assert.strictEqual(result.result, 'mock main thread summary details');
    assert.deepEqual(result.widgets, [
      {
        name: 'TIMELINE_RANGE_SUMMARY',
        data: {
          parsedTrace,
          bounds: mockBounds,
          track: 'main',
        },
      },
      {
        name: 'BOTTOM_UP_TREE',
        data: {
          bounds: mockBounds,
          parsedTrace,
        },
      },
    ]);
  });
});
