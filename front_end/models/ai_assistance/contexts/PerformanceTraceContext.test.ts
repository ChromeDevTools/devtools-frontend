// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as Trace from '../../trace/trace.js';
import * as AiAssistance from '../ai_assistance.js';

describe('PerformanceTraceContext', () => {
  setupSettingsHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('should return prompt details correctly by combining trace formatter output', async () => {
    const mockTrace = {
      insights: new Map(),
      data: {
        Meta: {
          mainFrameURL: 'https://example.com',
          traceBounds: {min: 0, max: 100},
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        mockTrace, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const formatterProto = AiAssistance.PerformanceTraceFormatter.PerformanceTraceFormatter.prototype;
    sinon.stub(formatterProto, 'formatTraceSummary').returns('Mock Trace Summary');
    sinon.stub(formatterProto, 'formatCriticalRequests').resolves('Mock Critical Requests');
    sinon.stub(formatterProto, 'formatMainThreadBottomUpSummary').resolves('Mock Main Thread');
    sinon.stub(formatterProto, 'formatThirdPartySummary').resolves('Mock Third Party');
    sinon.stub(formatterProto, 'formatLongestTasks').resolves('Mock Longest Tasks');

    const promptDetails = await context.getPromptDetails();
    assert.strictEqual(promptDetails, `Trace summary:
Mock Trace Summary

Mock Critical Requests

Mock Main Thread

Mock Third Party

Mock Longest Tasks`);
  });

  it('should return user facing details correctly', async () => {
    const mockTrace = {
      insights: new Map(),
      data: {
        Meta: {
          mainFrameURL: 'https://example.com',
          traceBounds: {min: 0, max: 100},
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        mockTrace, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const formatterProto = AiAssistance.PerformanceTraceFormatter.PerformanceTraceFormatter.prototype;
    sinon.stub(formatterProto, 'formatTraceSummary').returns('Mock Trace Summary');
    sinon.stub(formatterProto, 'formatCriticalRequests').resolves('Mock Critical Requests');
    sinon.stub(formatterProto, 'formatMainThreadBottomUpSummary').resolves('Mock Main Thread');
    sinon.stub(formatterProto, 'formatThirdPartySummary').resolves('Mock Third Party');
    sinon.stub(formatterProto, 'formatLongestTasks').resolves('Mock Longest Tasks');

    const details = await context.getUserFacingDetails();
    assert.deepEqual(details, [
      {title: 'Trace summary', text: 'Mock Trace Summary'},
      {title: 'Critical requests', text: 'Mock Critical Requests'},
      {title: 'Main thread activities', text: 'Mock Main Thread'},
      {title: 'Third party summary', text: 'Mock Third Party'},
      {title: 'Longest tasks', text: 'Mock Longest Tasks'},
    ]);
  });

  it('returns CORE_VITALS widget when primaryInsightSet is present', async () => {
    const mockInsightSet = {
      id: 'set-1',
      url: new URL('https://example.com'),
      bounds: {min: 0, max: 100} as Trace.Types.Timing.TraceWindowMicro,
      model: {},
    } as unknown as Trace.Insights.Types.InsightSet;

    const mockTrace = {
      insights: new Map([['set-1' as Trace.Types.Events.NavigationId, mockInsightSet]]),
      data: {
        Meta: {
          mainFrameURL: 'https://example.com',
          traceBounds: {min: 0, max: 100},
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        mockTrace, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const widgets = await context.getWidgets();
    assert.deepEqual(widgets, [
      {
        name: 'CORE_VITALS',
        data: {
          parsedTrace: mockTrace,
          insightSetKey: 'set-1',
        },
      },
    ]);
  });

  it('returns empty array when primaryInsightSet is absent', async () => {
    const mockTrace = {
      insights: new Map(),
      data: {
        Meta: {
          mainFrameURL: 'https://example.com',
          traceBounds: {min: 0, max: 100},
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        mockTrace, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const widgets = await context.getWidgets();
    assert.deepEqual(widgets, []);
  });

  it('returns PERF_INSIGHT and CORE_VITALS widget when insight is focused', async () => {
    const mockInsight = {
      insightKey: 'RenderBlocking',
      state: 'fail',
    } as unknown as Trace.Insights.Types.InsightModel;

    const mockInsightSet = {
      id: 'set-1',
      url: new URL('https://example.com'),
      bounds: {min: 0, max: 100} as Trace.Types.Timing.TraceWindowMicro,
      model: {
        RenderBlocking: mockInsight,
      },
    } as unknown as Trace.Insights.Types.InsightSet;

    const mockTrace = {
      insights: new Map([['set-1' as Trace.Types.Events.NavigationId, mockInsightSet]]),
      data: {
        Meta: {
          mainFrameURL: 'https://example.com',
          traceBounds: {min: 0, max: 100},
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromInsight(
        mockTrace, mockInsight, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const widgets = await context.getWidgets();
    assert.deepEqual(widgets, [
      {
        name: 'PERF_INSIGHT',
        data: {
          insight: Trace.Insights.Types.InsightKeys.RENDER_BLOCKING,
          insightData: mockInsight,
        },
      },
      {
        name: 'CORE_VITALS',
        data: {
          parsedTrace: mockTrace,
          insightSetKey: 'set-1',
        },
      },
    ]);
  });

  it('omits PERF_INSIGHT widget when insightKey is not recognized', async () => {
    const mockInsight = {
      insightKey: 'UnrecognizedInsightKey',
      state: 'fail',
    } as unknown as Trace.Insights.Types.InsightModel;

    const mockInsightSet = {
      id: 'set-1',
      url: new URL('https://example.com'),
      bounds: {min: 0, max: 100} as Trace.Types.Timing.TraceWindowMicro,
      model: {},
    } as unknown as Trace.Insights.Types.InsightSet;

    const mockTrace = {
      insights: new Map([['set-1' as Trace.Types.Events.NavigationId, mockInsightSet]]),
      data: {
        Meta: {
          mainFrameURL: 'https://example.com',
          traceBounds: {min: 0, max: 100},
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromInsight(
        mockTrace, mockInsight, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const widgets = await context.getWidgets();
    assert.deepEqual(widgets, [
      {
        name: 'CORE_VITALS',
        data: {
          parsedTrace: mockTrace,
          insightSetKey: 'set-1',
        },
      },
    ]);
  });

  it('returns TIMELINE_RANGE_SUMMARY and BOTTOM_UP_TREE widget when callTree is focused', async () => {
    const mockEvent = {
      ts: 1000,
      dur: 2000,
      name: 'FunctionCall',
    } as unknown as Trace.Types.Events.Event;

    const mockCallTree = {
      selectedNode: {event: mockEvent},
      rootNode: {event: mockEvent},
      parsedTrace: {
        insights: new Map(),
        data: {
          Meta: {
            mainFrameURL: 'https://example.com',
            traceBounds: {min: 0, max: 5000},
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace,
    } as unknown as AiAssistance.AICallTree.AICallTree;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromCallTree(
        mockCallTree, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const widgets = await context.getWidgets();
    assert.deepEqual(widgets, [
      {
        name: 'TIMELINE_RANGE_SUMMARY',
        data: {
          bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(
              Trace.Types.Timing.Micro(1000),
              Trace.Types.Timing.Micro(3000),
              ),
          parsedTrace: mockCallTree.parsedTrace,
          track: 'main',
        },
      },
      {
        name: 'BOTTOM_UP_TREE',
        data: {
          bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(
              Trace.Types.Timing.Micro(1000),
              Trace.Types.Timing.Micro(3000),
              ),
          parsedTrace: mockCallTree.parsedTrace,
        },
      },
    ]);
  });

  it('returns widgets when callTree is focused with null selectedNode (fallback to rootNode)', async () => {
    const mockEvent = {
      ts: 1000,
      dur: 2000,
      name: 'FunctionCall',
    } as unknown as Trace.Types.Events.Event;

    const mockCallTree = {
      selectedNode: null,
      rootNode: {event: mockEvent},
      parsedTrace: {
        insights: new Map(),
        data: {
          Meta: {
            mainFrameURL: 'https://example.com',
            traceBounds: {min: 0, max: 5000},
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace,
    } as unknown as AiAssistance.AICallTree.AICallTree;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromCallTree(
        mockCallTree, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const widgets = await context.getWidgets();
    assert.deepEqual(widgets, [
      {
        name: 'TIMELINE_RANGE_SUMMARY',
        data: {
          bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(
              Trace.Types.Timing.Micro(1000),
              Trace.Types.Timing.Micro(3000),
              ),
          parsedTrace: mockCallTree.parsedTrace,
          track: 'main',
        },
      },
      {
        name: 'BOTTOM_UP_TREE',
        data: {
          bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(
              Trace.Types.Timing.Micro(1000),
              Trace.Types.Timing.Micro(3000),
              ),
          parsedTrace: mockCallTree.parsedTrace,
        },
      },
    ]);
  });
});
