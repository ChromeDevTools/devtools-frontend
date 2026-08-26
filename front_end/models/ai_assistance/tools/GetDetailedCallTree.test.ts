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

const GetDetailedCallTreeTool = AiAssistance.GetDetailedCallTree.GetDetailedCallTreeTool;

describe('GetDetailedCallTreeTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('returns display info', () => {
    const tool = new GetDetailedCallTreeTool();
    const displayInfo = tool.displayInfoFromArgs({eventKey: 'event-key-1'});
    assert.strictEqual(displayInfo.title, 'Looking at call tree');
    assert.strictEqual(displayInfo.action, 'getDetailedCallTree(\'event-key-1\')');
  });

  it('returns error when PerformanceTraceContext is not available', async () => {
    const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      conversationContext: null,
      getPerformanceTraceContext: () => null,
    };

    const tool = new GetDetailedCallTreeTool();
    const result = await tool.handler({eventKey: 'event-key-1'}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance trace context is not available.');
  });

  it('returns error when eventKey is missing', async () => {
    const parsedTrace = makeFakeParsedTrace();
    const tracker = new Tracing.FreshRecording.Tracker();
    tracker.registerFreshRecording(parsedTrace);

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        tracker,
        universe.debuggerWorkspaceBinding,
    );

    const capabilities: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      conversationContext: null,
      getPerformanceTraceContext: () => traceContext,
    };

    const tool = new GetDetailedCallTreeTool();
    const result = await tool.handler({eventKey: ''}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Missing arg: eventKey');
  });

  it('returns error when event cannot be found', async () => {
    const parsedTrace = makeFakeParsedTrace();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        new Tracing.FreshRecording.Tracker(),
        universe.debuggerWorkspaceBinding,
    );
    const focus = traceContext.getItem();
    sinon.stub(focus, 'lookupEvent').returns(null);

    const capabilities: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      conversationContext: null,
      getPerformanceTraceContext: () => traceContext,
    };

    const tool = new GetDetailedCallTreeTool();
    const result = await tool.handler({eventKey: 'invalid-key'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Invalid eventKey');
  });

  it('returns error when call tree cannot be constructed', async () => {
    const parsedTrace = makeFakeParsedTrace();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        new Tracing.FreshRecording.Tracker(),
        universe.debuggerWorkspaceBinding,
    );
    const focus = traceContext.getItem();
    const mockEvent = {
      name: 'some-event',
      ts: 100,
      dur: 50,
    } as unknown as Trace.Types.Events.Event;

    sinon.stub(focus, 'lookupEvent').withArgs('valid-key').returns(mockEvent);
    sinon.stub(AiAssistance.AICallTree.AICallTree, 'fromEvent').returns(null);

    const capabilities: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      conversationContext: null,
      getPerformanceTraceContext: () => traceContext,
    };

    const tool = new GetDetailedCallTreeTool();
    const result = await tool.handler({eventKey: 'valid-key'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'No call tree found');
  });

  it('returns formatted call tree and widgets on success', async () => {
    const parsedTrace = makeFakeParsedTrace();

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        parsedTrace,
        universe.targetManager,
        new Tracing.FreshRecording.Tracker(),
        universe.debuggerWorkspaceBinding,
    );
    const focus = traceContext.getItem();
    const mockEvent = {
      name: 'some-event',
      ts: 100,
      dur: 50,
    } as unknown as Trace.Types.Events.Event;

    sinon.stub(focus, 'lookupEvent').withArgs('valid-key').returns(mockEvent);
    const mockTree = {} as unknown as AiAssistance.AICallTree.AICallTree;
    sinon.stub(AiAssistance.AICallTree.AICallTree, 'fromEvent').returns(mockTree);

    stubPerformanceTraceFormatter(traceContext, {
      formatCallTree: sinon.stub().resolves('mock formatted call tree'),
    });

    const capabilities: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      conversationContext: null,
      getPerformanceTraceContext: () => traceContext,
    };

    const tool = new GetDetailedCallTreeTool();
    const result = await tool.handler({eventKey: 'valid-key'}, capabilities);

    assertIsResult(result);
    assert.strictEqual(result.result, 'mock formatted call tree');
    assert.deepEqual(result.widgets, [
      {
        name: 'BOTTOM_UP_TREE',
        data: {
          bounds: {
            min: 100 as Trace.Types.Timing.Micro,
            max: 150 as Trace.Types.Timing.Micro,
            range: 50 as Trace.Types.Timing.Micro,
          },
          parsedTrace,
        },
      },
      {
        name: 'TIMELINE_RANGE_SUMMARY',
        data: {
          bounds: {
            min: 100 as Trace.Types.Timing.Micro,
            max: 150 as Trace.Types.Timing.Micro,
            range: 50 as Trace.Types.Timing.Micro,
          },
          parsedTrace,
          track: 'main',
        },
      },
    ]);
  });
});
