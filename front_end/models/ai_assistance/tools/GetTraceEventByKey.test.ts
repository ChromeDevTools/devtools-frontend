// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import {
  assertIsError,
  assertIsResult,
  initializePersistenceImplForTests,
} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import type * as Trace from '../../trace/trace.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('GetTraceEventByKeyTool', () => {
  beforeEach(() => {
    initializePersistenceImplForTests();
  });

  const GetTraceEventByKeyTool = AiAssistance.GetTraceEventByKey.GetTraceEventByKeyTool;

  it('returns display info', () => {
    const tool = new GetTraceEventByKeyTool();
    const displayInfo = tool.displayInfoFromArgs({eventKey: 'event-key-1'});
    assert.strictEqual(displayInfo.title, 'Looking at trace event');
    assert.strictEqual(displayInfo.action, 'getTraceEventByKey(\'event-key-1\')');
  });

  it('returns error when conversationContext is not available', async () => {
    const context = {
      conversationContext: null,
    };

    const tool = new GetTraceEventByKeyTool();
    const result = await tool.handler({eventKey: 'event-key-1'}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance trace context is not available.');
  });

  it('returns error when event cannot be found', async () => {
    const parsedTrace = {
      insights: new Map(),
      metadata: {},
      data: {
        Meta: {
          mainFrameNavigations: [],
          traceBounds: {min: 0, max: 100},
          mainFrameURL: 'https://example.com',
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(parsedTrace);
    const focus = traceContext.getItem();
    sinon.stub(focus, 'lookupEvent').returns(null);

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetTraceEventByKeyTool();
    const result = await tool.handler({eventKey: 'invalid-key'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Could not find event with key "invalid-key".');
  });

  it('returns formatted event details and TIMELINE_EVENT_SUMMARY widget on success', async () => {
    const parsedTrace = {
      insights: new Map(),
      metadata: {},
      data: {
        Meta: {
          mainFrameNavigations: [],
          traceBounds: {min: 0, max: 100},
          mainFrameURL: 'https://example.com',
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const traceContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(parsedTrace);
    const focus = traceContext.getItem();
    const mockEvent = {
      name: 'some-event',
      ts: 100,
    } as unknown as Trace.Types.Events.Event;

    sinon.stub(focus, 'lookupEvent').withArgs('valid-key').returns(mockEvent);

    const capabilities = {
      conversationContext: traceContext,
    };

    const tool = new GetTraceEventByKeyTool();
    const result = await tool.handler({eventKey: 'valid-key'}, capabilities);

    assertIsResult(result);
    assert.strictEqual(result.result, JSON.stringify(mockEvent));
    assert.deepEqual(result.widgets, [{
                       name: 'TIMELINE_EVENT_SUMMARY',
                       data: {
                         event: mockEvent,
                         parsedTrace,
                       },
                     }]);
  });
});
