// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
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

describe('SelectTraceEventByKeyTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  let revealStub: sinon.SinonStub;

  const SelectTraceEventByKeyTool = AiAssistance.SelectTraceEventByKey.SelectTraceEventByKeyTool;

  beforeEach(() => {
    universe = new TestUniverse();
    revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
  });

  it('returns display info', () => {
    const tool = new SelectTraceEventByKeyTool();
    const displayInfo = tool.displayInfoFromArgs({eventKey: 'event-key-1'});
    assert.strictEqual(displayInfo.title, 'Selecting trace event');
    assert.strictEqual(displayInfo.action, 'selectTraceEventByKey(\'event-key-1\')');
  });

  it('returns error when PerformanceTraceContext is not available', async () => {
    const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      getPerformanceTraceContext: () => null,
    };

    const tool = new SelectTraceEventByKeyTool();
    const result = await tool.handler({eventKey: 'event-key-1'}, context);

    assertIsError(result);
    assert.strictEqual(result.error, 'Performance trace context is not available.');
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
      getPerformanceTraceContext: () => traceContext,
    };

    const tool = new SelectTraceEventByKeyTool();
    const result = await tool.handler({eventKey: 'invalid-key'}, capabilities);

    assertIsError(result);
    assert.strictEqual(result.error, 'Could not find event with key "invalid-key".');
  });

  it('reveals the event and returns success data with TIMELINE_EVENT_SUMMARY widget', async () => {
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
    } as unknown as Trace.Types.Events.Event;

    sinon.stub(focus, 'lookupEvent').withArgs('valid-key').returns(mockEvent);

    const capabilities: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.PerformanceTraceCapability = {
      getPerformanceTraceContext: () => traceContext,
    };

    const tool = new SelectTraceEventByKeyTool();
    const result = await tool.handler({eventKey: 'valid-key'}, capabilities);

    assertIsResult(result);
    assert.strictEqual(result.result, 'Event selected');
    sinon.assert.calledOnce(revealStub);
    const revealedArg = revealStub.firstCall.args[0];
    assert.instanceOf(revealedArg, SDK.TraceObject.RevealableEvent);
    assert.strictEqual(revealedArg.event, mockEvent);

    assert.deepEqual(result.widgets, [{
                       name: 'TIMELINE_EVENT_SUMMARY',
                       data: {
                         event: mockEvent,
                         parsedTrace,
                       },
                     }]);
  });
});
