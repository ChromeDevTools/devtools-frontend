// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {MockDebuggerBackend} from '../../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {encodeSourceMap} from '../../../testing/SourceMapEncoder.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import {getBaseTraceHandlerData} from '../../../testing/TraceHelpersCore.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {createContentProviderUISourceCodes} from '../../../testing/UISourceCodeHelpers.js';
import * as Formatter from '../../formatter/formatter.js';
import * as Trace from '../../trace/trace.js';
import * as Workspace from '../../workspace/workspace.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

function createParsedTrace(metaOverrides: Partial<Trace.Handlers.ModelHandlers.Meta.MetaHandlerData> = {}):
    Trace.TraceModel.ParsedTrace {
  const baseTrace = getBaseTraceHandlerData();
  const parsedTrace = getBaseTraceHandlerData({
    Meta: {
      ...baseTrace.data.Meta,
      ...metaOverrides,
    },
  });
  return {
    ...parsedTrace,
    insights: new Map(),
  };
}

describe('PerformanceTraceContext', () => {
  setupRuntimeHooks();
  setupSettingsHooks();
  setupLocaleHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  afterEach(() => {
    universe.dispose();
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

  it('returns networkDataFormatFact when critical requests exist', async function() {
    const trace = await TraceLoader.traceEngine(this, 'render-blocking-requests.json.gz');
    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        trace, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const facts = context.getPromptFacts();
    assert.deepEqual(facts, [AiAssistance.PerformanceTraceFormatter.PerformanceTraceFormatter.networkDataFormatFact]);
  });

  it('excludes networkDataFormatDescription from user-facing details when critical requests exist', async function() {
    const trace = await TraceLoader.traceEngine(this, 'render-blocking-requests.json.gz');
    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        trace, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const details = await context.getUserFacingDetails();
    assert.isNotNull(details);
    const hasNetworkDataFormatDescription = details.some(
        d => d.text.includes(
            AiAssistance.PerformanceTraceFormatter.PerformanceTraceFormatter.networkDataFormatDescription.trim()));
    assert.isFalse(hasNetworkDataFormatDescription);
  });

  it('returns empty facts when critical requests do not exist', async function() {
    const trace = await TraceLoader.traceEngine(this, 'multiple-navigations-render-blocking.json.gz');
    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
        trace, universe.targetManager, undefined, universe.debuggerWorkspaceBinding);

    const facts = context.getPromptFacts();
    assert.deepEqual(facts, []);
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

  describe('isImported and getOrigin', () => {
    it('returns isImported false and live origin for fresh recordings', () => {
      const mockTrace = {
        insights: new Map(),
        data: {
          Meta: {
            mainFrameURL: 'https://example.com/page.html',
            traceBounds: {min: 0, max: 100},
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace;

      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      tracker.registerFreshRecording(mockTrace);

      const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);

      assert.isFalse(context.isImported());
      assert.isTrue(
          context.getOrigin().isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://example.com')));
    });

    it('returns isImported true and imported-trace origin for non-fresh recordings', () => {
      const mockTrace = {
        insights: new Map(),
        data: {
          Meta: {
            mainFrameURL: 'https://example.com/page.html',
            traceBounds: {min: 0, max: 100},
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace;

      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});

      const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);

      assert.isTrue(context.isImported());
      assert.isTrue(context.getOrigin().isSameOriginWith(
          SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://example.com')));
    });

    it('returns an opaque origin for non-fresh recordings with invalid mainFrameURL', () => {
      const mockTrace = {
        insights: new Map(),
        data: {
          Meta: {
            mainFrameURL: 'not a valid url',
            traceBounds: {min: 0, max: 100},
          },
        },
      } as unknown as Trace.TraceModel.ParsedTrace;

      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});

      const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);

      assert.isTrue(context.isImported());
      assert.isTrue(context.getOrigin().isOpaque());
    });

    it('returns a unique opaque origin for fresh recordings when mainFrameIsOpaqueOrigin is true', () => {
      const mockTrace = createParsedTrace({
        mainFrameURL: 'https://victim.example/sandboxed.html',
        mainFrameIsOpaqueOrigin: true,
      });

      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      tracker.registerFreshRecording(mockTrace);

      const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);

      assert.isFalse(context.isImported());
      assert.isTrue(context.getOrigin().isOpaque());
      assert.isFalse(
          context.getOrigin().isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://victim.example')));
      assert.strictEqual(context.getTitle(), 'Trace: victim.example');
    });
  });

  describe('canAccessResource', () => {
    function createMockTraceContext(mainFrameURL: string):
        AiAssistance.PerformanceTraceContext.PerformanceTraceContext {
      const mockTrace = createParsedTrace({mainFrameURL});

      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      tracker.registerFreshRecording(mockTrace);

      return AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);
    }

    it('returns true when target URL has the same origin as trace origin', () => {
      const context = createMockTraceContext('https://example.com/page.html');
      assert.isTrue(context.canAccessResource('https://example.com/script.js'));
    });

    it('returns false when target URL has a different origin from trace origin', () => {
      const context = createMockTraceContext('https://example.com/page.html');
      assert.isFalse(context.canAccessResource('https://other.com/script.js'));
    });

    it('blocks opaque target origins', () => {
      const context = createMockTraceContext('https://example.com/page.html');
      assert.isFalse(context.canAccessResource('data:text/javascript,console.log()'));
    });

    it('blocks opaque trace origins', () => {
      const dataContext = createMockTraceContext('data:text/html,test');
      assert.isFalse(dataContext.canAccessResource('https://example.com/script.js'));

      const nullContext = createMockTraceContext('about:blank');
      assert.isFalse(nullContext.canAccessResource('https://example.com/script.js'));
    });

    it('blocks local file origins for both trace and target', () => {
      const fileContext = createMockTraceContext('file:///tmp/index.html');
      assert.isFalse(fileContext.canAccessResource('file:///etc/passwd'));
      assert.isFalse(fileContext.canAccessResource('file:///tmp/index.html'));

      const httpsContext = createMockTraceContext('https://example.com/page.html');
      assert.isFalse(httpsContext.canAccessResource('file:///tmp/script.js'));
    });

    it('blocks resources with different subdomain or port', () => {
      const context = createMockTraceContext('https://example.com/page.html');
      assert.isFalse(context.canAccessResource('https://subdomain.example.com/script.js'));
      assert.isFalse(context.canAccessResource('https://example.com:8080/script.js'));
    });

    it('blocks access when trace is imported', () => {
      const mockTrace = createParsedTrace({mainFrameURL: 'https://example.com/page.html'});

      // Do NOT register with tracker so isFresh is false.
      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      const importedContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);

      assert.isFalse(importedContext.canAccessResource('https://example.com/script.js'));
    });

    it('blocks resources on the URL tuple origin when mainFrameIsOpaqueOrigin is true', () => {
      const mockTrace = createParsedTrace({
        mainFrameURL: 'https://victim.example/sandboxed.html',
        mainFrameIsOpaqueOrigin: true,
      });

      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      tracker.registerFreshRecording(mockTrace);

      const sandboxContext = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);

      assert.isFalse(sandboxContext.canAccessResource('https://victim.example/secret.js'));
    });
  });

  describe('canAccessFunctionSource', () => {
    it('rejects source-mapped URLs from a cross-origin script', async () => {
      const backend = new MockDebuggerBackend();
      try {
        void backend.universe.debuggerWorkspaceBinding;
        const target = backend.createTarget({url: urlString`https://example.com/page.html`});
        await backend.addScript(
            target,
            {url: 'https://other.example/bundle.js', content: 'function f() { return 1; }'},
            {
              url: 'https://other.example/bundle.js.map',
              content: {
                ...encodeSourceMap(['0:10 => secret.ts:0:12@secret', '0:26 => secret.ts:2:1']),
                sources: ['webpack:///src/secret.ts'],
                sourcesContent: ['function secret() {\n  return 1;\n}'],
              },
            },
        );

        const freshTrace = createParsedTrace({mainFrameURL: 'https://example.com/page.html'});
        const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
        tracker.registerFreshRecording(freshTrace);
        const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
            freshTrace, backend.universe.targetManager, tracker, backend.universe.debuggerWorkspaceBinding);

        assert.isFalse(context.canAccessFunctionSource(urlString`webpack:///src/secret.ts`));
      } finally {
        backend.universe.dispose();
        Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
      }
    });

    it('rejects file:// URLs', () => {
      const freshTrace = createParsedTrace({mainFrameURL: 'https://example.com/page.html'});
      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      tracker.registerFreshRecording(freshTrace);
      const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          freshTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);

      assert.isFalse(context.canAccessFunctionSource(urlString`file:///tmp/secret.ts`));
    });

    it('rejects same-origin source-mapped URLs when the trace is imported', async () => {
      const backend = new MockDebuggerBackend();
      try {
        void backend.universe.debuggerWorkspaceBinding;
        const target = backend.createTarget({url: urlString`https://example.com/page.html`});
        await backend.addScript(
            target,
            {url: 'https://example.com/bundle.js', content: 'function f() { return 1; }'},
            {
              url: 'https://example.com/bundle.js.map',
              content: {
                ...encodeSourceMap(['0:10 => app.ts:0:12@app', '0:26 => app.ts:2:1']),
                sources: ['webpack:///src/app.ts'],
                sourcesContent: ['function app() {\n  return 1;\n}'],
              },
            },
        );

        const importedTrace = createParsedTrace({mainFrameURL: 'https://example.com/page.html'});
        const importedTracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
        const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
            importedTrace, backend.universe.targetManager, importedTracker, backend.universe.debuggerWorkspaceBinding);

        assert.isFalse(context.canAccessFunctionSource(urlString`webpack:///src/app.ts`));
      } finally {
        backend.universe.dispose();
        Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
      }
    });

    it('rejects same-origin source-mapped URLs when mainFrameIsOpaqueOrigin is true', () => {
      universe.createTarget({url: 'https://victim.example/sandboxed.html'});
      const opaqueTrace = createParsedTrace({
        mainFrameURL: 'https://victim.example/sandboxed.html',
        mainFrameIsOpaqueOrigin: true,
      });
      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      tracker.registerFreshRecording(opaqueTrace);
      const projectsSpy = sinon.spy(universe.workspace, 'projectsForType');

      const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          opaqueTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);

      assert.isFalse(context.canAccessFunctionSource(urlString`webpack:///src/app.ts`));
      sinon.assert.notCalled(projectsSpy);
    });
  });

  describe('createFormatter', () => {
    it('blocks resolveFunctionCode when mainFrameIsOpaqueOrigin is true', async () => {
      universe.createTarget({url: 'https://victim.example/sandboxed.html'});
      const mockTrace = createParsedTrace({
        mainFrameURL: 'https://victim.example/sandboxed.html',
        mainFrameIsOpaqueOrigin: true,
      });
      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      tracker.registerFreshRecording(mockTrace);

      const projectsSpy = sinon.spy(universe.workspace, 'projectsForType');
      const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);
      const formatter = context.createFormatter();

      const resolved = await formatter.resolveFunctionCode?.(urlString`https://victim.example/secret.js`, 0, 0) ?? null;
      assert.isNull(resolved);
      sinon.assert.notCalled(projectsSpy);
    });

    it('blocks resolveFunctionCode when source-mapped uiSourceCode resolves to a cross-origin URL', async () => {
      const target = universe.createTarget({url: 'https://example.com/page.html'});
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);

      const {uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: urlString`https://example.com/bundle.js`,
            mimeType: 'text/javascript',
            content: 'function bundle() { return 1; }',
          },
          {
            url: urlString`https://other.example/secret.ts`,
            mimeType: 'text/typescript',
            content: 'function secret() { return 2; }',
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
        universe,
      });

      const rawLocation = new SDK.DebuggerModel.Location(debuggerModel, 'script-1' as Protocol.Runtime.ScriptId, 0, 0);
      sinon.stub(universe.debuggerWorkspaceBinding, 'uiLocationToRawLocations').resolves([rawLocation]);
      sinon.stub(universe.debuggerWorkspaceBinding, 'functionBoundsAtRawLocation').resolves({
        uiSourceCode: uiSourceCodes[1],
        range: new TextUtils.TextRange.TextRange(0, 0, 0, 31),
        name: 'secret',
      });

      const mockTrace = createParsedTrace({
        mainFrameURL: 'https://example.com/page.html',
        mainFrameIsOpaqueOrigin: false,
      });
      const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
      tracker.registerFreshRecording(mockTrace);

      const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
          mockTrace, universe.targetManager, tracker, universe.debuggerWorkspaceBinding);
      const formatter = context.createFormatter();

      const resolved = await formatter.resolveFunctionCode?.(urlString`https://example.com/bundle.js`, 0, 0) ?? null;
      assert.isNull(resolved);
    });

    it('resolves function code when a same-origin script maps to a bundler scheme like webpack://', async () => {
      const backend = new MockDebuggerBackend();
      try {
        void backend.universe.debuggerWorkspaceBinding;
        const target = backend.createTarget({url: urlString`https://example.com/page.html`});
        const sourceMap = {
          ...encodeSourceMap([
            '0:10 => app.ts:0:12@app',
            '0:26 => app.ts:2:1',
          ]),
          sources: ['webpack:///src/app.ts'],
          sourcesContent: ['function app() {\n  return 1;\n}'],
        };
        await backend.addScript(target, {
          url: 'https://example.com/bundle.js',
          content: 'function f() { return 1; }',
        },
                                {
                                  url: 'https://example.com/bundle.js.map',
                                  content: sourceMap,
                                });

        const mockTrace = createParsedTrace({
          mainFrameURL: 'https://example.com/page.html',
          mainFrameIsOpaqueOrigin: false,
        });
        const tracker = Tracing.FreshRecording.Tracker.instance({forceNew: true});
        tracker.registerFreshRecording(mockTrace);

        const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(
            mockTrace, backend.universe.targetManager, tracker, backend.universe.debuggerWorkspaceBinding);
        assert.isFalse(context.canAccessResource('webpack:///src/app.ts'));
        assert.isTrue(context.canAccessFunctionSource(urlString`webpack:///src/app.ts`));

        const formatter = context.createFormatter();

        const resolvedFromBundle =
            await formatter.resolveFunctionCode?.(urlString`https://example.com/bundle.js`, 0, 10) ?? null;
        assert.isNotNull(resolvedFromBundle);
        assert.strictEqual(resolvedFromBundle.functionBounds.uiSourceCode.url(), urlString`webpack:///src/app.ts`);
        assert.strictEqual(resolvedFromBundle.code, '() {\n  return 1;\n}');

        const resolvedFromMappedUrl =
            await formatter.resolveFunctionCode?.(urlString`webpack:///src/app.ts`, 0, 12) ?? null;
        assert.isNotNull(resolvedFromMappedUrl);
        assert.strictEqual(resolvedFromMappedUrl.functionBounds.uiSourceCode.url(), urlString`webpack:///src/app.ts`);
        assert.strictEqual(resolvedFromMappedUrl.code, '() {\n  return 1;\n}');
      } finally {
        backend.universe.dispose();
        Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
      }
    });
  });
});
