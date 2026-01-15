// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Trace from '../../models/trace/trace.js';
import * as SourceMapsResolver from '../../models/trace_source_maps_resolver/trace_source_maps_resolver.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  dispatchClickEvent,
  doubleRaf,
  raf,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  deinitializeGlobalVars,
  expectConsoleLogs,
  initializeGlobalVars
} from '../../testing/EnvironmentHelpers.js';
import {
  clearMockConnectionResponseHandler,
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {
  loadBasicSourceMapExample,
  setupPageResourceLoaderForSourceMap,
} from '../../testing/SourceMapHelpers.js';
import {
  allThreadEntriesInTrace,
  getBaseTraceHandlerData,
  getEventOfType,
  getMainThread,
  makeCompleteEvent,
  makeInstantEvent,
  makeMockRendererHandlerData,
  makeMockSamplesHandlerData,
  makeProfileCall,
} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import * as Timeline from './timeline.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('TimelineUIUtils', function() {
  before(async () => {
    await initializeGlobalVars();
  });

  after(async () => await deinitializeGlobalVars());

  let target: SDK.Target.Target;
  // Trace events contain script ids as strings. However, the linkifier
  // utilities assume it is a number because that's how it's defined at
  // the protocol level. For practicality, we declare these two
  // variables so that we can satisfy type checking throughout the tests.
  const SCRIPT_ID_NUMBER = 1;
  const SCRIPT_ID_STRING = String(SCRIPT_ID_NUMBER) as Protocol.Runtime.ScriptId;

  beforeEach(() => {
    setMockConnectionResponseHandler(
        'Debugger.enable', () => ({debuggerId: 'DEBUGGER_ID' as Protocol.Runtime.UniqueDebuggerId}));
    setMockConnectionResponseHandler(
        'Debugger.setInstrumentationBreakpoint', () => ({} as Protocol.Debugger.SetInstrumentationBreakpointResponse));
    target = createTarget();

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
  });

  afterEach(() => {
    clearMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend');
  });

  describe('script location as an URL', function() {
    it('makes the script location of a call frame a full URL when the inspected target is not the same the call frame was taken from (e.g. a loaded file)',
       async function() {
         // The actual trace doesn't matter here, just need one so we can pass
         // it into buildDetailsNodeForTraceEvent
         const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

         const fakeFunctionCall: Trace.Types.Events.FunctionCall = {
           name: Trace.Types.Events.Name.FUNCTION_CALL,
           ph: Trace.Types.Events.Phase.COMPLETE,
           cat: 'devtools-timeline',
           dur: Trace.Types.Timing.Micro(100),
           ts: Trace.Types.Timing.Micro(100),
           pid: Trace.Types.Events.ProcessID(1),
           tid: Trace.Types.Events.ThreadID(1),
           args: {
             data: {
               functionName: 'test',
               url: 'https://google.com/test.js',
               scriptId: Number(SCRIPT_ID_STRING),
               lineNumber: 1,
               columnNumber: 1,
             },
           },
         };

         target.setInspectedURL(urlString`https://not-google.com`);
         const node = await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForTraceEvent(
             fakeFunctionCall, target, new Components.Linkifier.Linkifier(), false, parsedTrace);
         if (!node) {
           throw new Error('Node was unexpectedly null');
         }
         // URL path
         assert.strictEqual(node.textContent, 'test @ /test.js:1:1');
       });

    it('makes the script location of a call frame a script name when the inspected target is the one the call frame was taken from',
       async function() {
         // The actual trace doesn't matter here, just need one so we can pass
         // it into buildDetailsNodeForTraceEvent
         const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
         const fakeFunctionCall: Trace.Types.Events.FunctionCall = {
           name: Trace.Types.Events.Name.FUNCTION_CALL,
           ph: Trace.Types.Events.Phase.COMPLETE,
           cat: 'devtools-timeline',
           dur: Trace.Types.Timing.Micro(100),
           ts: Trace.Types.Timing.Micro(100),
           pid: Trace.Types.Events.ProcessID(1),
           tid: Trace.Types.Events.ThreadID(1),
           args: {
             data: {
               functionName: 'test',
               url: 'https://google.com/test.js',
               scriptId: Number(SCRIPT_ID_STRING),
               lineNumber: 1,
               columnNumber: 1,
             },
           },
         };
         target.setInspectedURL(urlString`https://google.com`);
         const node = await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForTraceEvent(
             fakeFunctionCall, target, new Components.Linkifier.Linkifier(), false, parsedTrace);
         if (!node) {
           throw new Error('Node was unexpectedly null');
         }
         assert.strictEqual(node.textContent, 'test @ /test.js:1:1');
       });
  });

  describe('mapping to authored script when recording is fresh', function() {
    beforeEach(async () => {
      // Register mock script and source map.

      const sourceMapContent = JSON.stringify({
        version: 3,
        names: ['unminified', 'par1', 'par2', 'console', 'log'],
        sources: [
          '/original-script.ts',
        ],
        file: '/test.js',
        sourcesContent: ['function unminified(par1, par2) {\n  console.log(par1, par2);\n}\n'],
        mappings: 'AAAA,SAASA,EAAWC,EAAMC,GACxBC,QAAQC,IAAIH,EAAMC',
      });
      setupPageResourceLoaderForSourceMap(sourceMapContent);
      target.setInspectedURL(urlString`https://google.com`);
      const scriptUrl = urlString`https://google.com/script.js`;
      const sourceMapUrl = urlString`script.js.map`;
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.isNotNull(debuggerModel);
      if (debuggerModel === null) {
        return;
      }
      const sourceMapManager = debuggerModel.sourceMapManager();
      const script = debuggerModel.parsedScriptSource(
          SCRIPT_ID_STRING, scriptUrl, 0, 0, 0, 0, 0, '', undefined, false, sourceMapUrl, true, false, length, false,
          null, null, null, null, null, null);
      await sourceMapManager.sourceMapForClientPromise(script);
    });
    it('maps to the authored script when a call frame is provided', async function() {
      const linkifier = new Components.Linkifier.Linkifier();
      const node = Timeline.TimelineUIUtils.TimelineUIUtils.linkifyLocation({
        scriptId: SCRIPT_ID_STRING,
        url: 'https://google.com/test.js',
        lineNumber: 0,
        columnNumber: 0,
        isFreshOrEnhanced: true,
        target,
        linkifier,
      });
      if (!node) {
        throw new Error('Node was unexpectedly null');
      }
      // Wait for the location to be resolved using the registered source map.
      await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pendingLiveLocationChangesPromise();

      assert.strictEqual(node.textContent, 'original-script.ts:1:1');
    });

    it('maps to the authored script when a trace event from the new engine with a stack trace is provided',
       async function() {
         const functionCallEvent = makeCompleteEvent('FunctionCall', 10, 100);
         functionCallEvent.args = ({
           data: {
             stackTrace: [{
               functionName: 'test',
               url: 'https://google.com/test.js',
               scriptId: SCRIPT_ID_NUMBER,
               lineNumber: 0,
               columnNumber: 0,
             }],
           },
         });
         const linkifier = new Components.Linkifier.Linkifier();
         const node =
             Timeline.TimelineUIUtils.TimelineUIUtils.linkifyTopCallFrame(functionCallEvent, target, linkifier, true);
         if (!node) {
           throw new Error('Node was unexpectedly null');
         }
         // Wait for the location to be resolved using the registered source map.
         await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
             .pendingLiveLocationChangesPromise();

         assert.strictEqual(node.textContent, 'original-script.ts:1:1');
       });
  });

  describe('mapping to authored function name when recording is fresh', function() {
    expectConsoleLogs({
      error: ['Error: No LanguageSelector instance exists yet.'],
    });
    it('maps to the authored name and script of a profile call', async function() {
      const {script} = await loadBasicSourceMapExample(target);

      // Ideally we would get a column number we can use from the source
      // map however the current status of the source map helpers makes
      // it difficult to do so.
      const columnNumber = 51;
      const profileCall =
          makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));

      profileCall.callFrame = {
        columnNumber,
        functionName: 'minified',
        lineNumber: 0,
        scriptId: script.scriptId,
        url: 'file://gen.js',
      };
      const workersData: Trace.Handlers.ModelHandlers.Workers.WorkersData = {
        workerSessionIdEvents: [],
        workerIdByThread: new Map(),
        workerURLById: new Map(),
      };
      // This only includes data used in the SourceMapsResolver and
      // TimelineUIUtils
      const parsedTrace = getBaseTraceHandlerData({
        Samples: makeMockSamplesHandlerData([profileCall]),
        Workers: workersData,
        Renderer: makeMockRendererHandlerData([profileCall]),
      });

      const resolver = new SourceMapsResolver.SourceMapsResolver(parsedTrace);
      await resolver.install();

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace, profileCall, new Components.Linkifier.Linkifier(), false, null);
      const stackTraceData = getStackTraceForDetailsElement(details);
      assert.exists(stackTraceData);
      assert.strictEqual(stackTraceData[0], 'someFunction @ main.js:6:10');
    });
    it('maps to the authored name and script of a function call', async function() {
      const {script} = await loadBasicSourceMapExample(target);
      const [lineNumber, columnNumber, ts, dur, pid, tid] =
          [0, 51, 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1)];
      const profileCall = makeProfileCall('function', ts, dur, pid, tid);

      profileCall.callFrame = {
        columnNumber,
        functionName: 'minified',
        lineNumber: 0,
        scriptId: script.scriptId,
        url: 'file://gen.js',
      };

      const functionCall = makeCompleteEvent(Trace.Types.Events.Name.FUNCTION_CALL, ts, dur, '', pid, tid) as
          Trace.Types.Events.FunctionCall;
      functionCall.args = {
        data: {
          // line and column number of function calls have an offset
          // from CPU profile values.
          columnNumber: columnNumber + 1,
          lineNumber: lineNumber + 1,
          functionName: 'minified',
          scriptId: script.scriptId,
          url: 'file://gen.js',
        },
      };
      const workersData: Trace.Handlers.ModelHandlers.Workers.WorkersData = {
        workerSessionIdEvents: [],
        workerIdByThread: new Map(),
        workerURLById: new Map(),
      };
      // This only includes data used in the SourceMapsResolver and
      // TimelineUIUtils
      const parsedTrace = getBaseTraceHandlerData({
        Samples: makeMockSamplesHandlerData([profileCall]),
        Workers: workersData,
        Renderer: makeMockRendererHandlerData([functionCall]),
      });

      const resolver = new SourceMapsResolver.SourceMapsResolver(parsedTrace);
      await resolver.install();

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          functionCall,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const detailsData = getRowDataForDetailsElement(details).find(row => row.title?.startsWith('Function'));
      assert.exists(detailsData);
      assert.deepEqual(detailsData, {title: 'Function', value: 'someFunction @ gen.js:1:52'});
    });
  });
  describe('adjusting timestamps for events and navigations', function() {
    expectConsoleLogs({
      error: ['Error: No LanguageSelector instance exists yet.'],
    });
    it('adjusts the time for a DCL event after a navigation', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

      const mainFrameID = parsedTrace.data.Meta.mainFrameId;

      const dclEvent = parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(event => {
        return Trace.Types.Events.isMarkDOMContent(event) && event.args.data?.frame === mainFrameID;
      });
      if (!dclEvent) {
        throw new Error('Could not find DCL event');
      }

      const traceMinBound = parsedTrace.data.Meta.traceBounds.min;

      // Round the time to 2DP to avoid needlessly long expectation numbers!
      const unadjustedStartTimeMilliseconds = Trace.Helpers.Timing
                                                  .microToMilli(
                                                      Trace.Types.Timing.Micro(dclEvent.ts - traceMinBound),
                                                      )
                                                  .toFixed(2);
      assert.strictEqual(unadjustedStartTimeMilliseconds, String(190.79));

      const adjustedTime =
          Timeline.TimelineUIUtils.timeStampForEventAdjustedForClosestNavigationIfPossible(dclEvent, parsedTrace);
      assert.strictEqual(adjustedTime.toFixed(2), String(178.92));
    });

    it('can adjust the times for events that are not PageLoad markers', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      // Use a performance.mark event. Exact event is unimportant except that
      // it should not be a Page Load event as those are covered by the tests
      // above.
      const userMark = parsedTrace.data.UserTimings.performanceMarks.find(event => event.name === 'mark1');
      if (!userMark) {
        throw new Error('Could not find user mark');
      }

      const adjustedMarkTime =
          Timeline.TimelineUIUtils.timeStampForEventAdjustedForClosestNavigationIfPossible(userMark, parsedTrace);
      assert.strictEqual(adjustedMarkTime.toFixed(2), String(79.88));
    });
  });

  function getInnerTextAcrossShadowRoots(root: Node|null): string {
    // Don't recurse into elements that are not displayed
    if (!root || (root instanceof HTMLElement && !root.checkVisibility())) {
      return '';
    }
    if (root.nodeType === Node.TEXT_NODE) {
      return root.nodeValue || '';
    }
    if (root instanceof HTMLElement && root.shadowRoot) {
      return getInnerTextAcrossShadowRoots(root.shadowRoot);
    }
    return Array.from(root.childNodes).map(getInnerTextAcrossShadowRoots).join('');
  }

  function getRowDataForDetailsElement(details: DocumentFragment) {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    container.appendChild(details);
    return Array.from(container.querySelectorAll<HTMLDivElement>('.timeline-details-view-row')).map(row => {
      const title = row.querySelector<HTMLDivElement>('.timeline-details-view-row-title')?.innerText;
      const valueEl = row.querySelector<HTMLDivElement>('.timeline-details-view-row-value') ??
          row.querySelector<HTMLElement>('div,span');
      let value = valueEl?.innerText || '';
      if (!value && valueEl) {
        // Stack traces and renderEventJson have the contents within a shadowRoot.
        value = getInnerTextAcrossShadowRoots(valueEl).trim();
      }
      return {title, value};
    });
  }

  function getStackTraceForDetailsElement(details: DocumentFragment): string[]|null {
    const stackTraceContainer =
        details
            .querySelector<HTMLDivElement>(
                '.timeline-details-view-row.timeline-details-stack-values .stack-preview-container')
            ?.shadowRoot;
    if (!stackTraceContainer) {
      return null;
    }
    return Array.from(stackTraceContainer.querySelectorAll<HTMLTableRowElement>('tbody tr')).map(row => {
      const functionName = row.querySelector<HTMLElement>('.function-name')?.innerText;
      const url = row.querySelector<HTMLElement>('.link')?.innerText;
      return `${functionName || ''} @ ${url || ''}`;
    });
  }

  function getPieChartDataForDetailsElement(details: DocumentFragment) {
    const pieChartComp = details.querySelector('devtools-perf-piechart');
    if (!pieChartComp?.shadowRoot) {
      return [];
    }
    return Array.from(pieChartComp.shadowRoot.querySelectorAll<HTMLElement>('.pie-chart-legend-row')).map(row => {
      const title = row.querySelector<HTMLDivElement>('.pie-chart-name')?.innerText;
      const value = row.querySelector<HTMLDivElement>('.pie-chart-size')?.innerText;
      return {title, value};
    });
  }

  describe('colors', function() {
    before(() => {
      // Rather than use the real colours here and burden the test with having to
      // inject loads of CSS, we fake out the colours. this is fine for our tests as
      // the exact value of the colours is not important; we just make sure that it
      // parses them out correctly. Each variable is given a different rgb() value to
      // ensure we know the code is working and using the right one.
      const styleElement = document.createElement('style');
      styleElement.id = 'fake-perf-panel-colors';
      styleElement.textContent = `
:root {
  --app-color-loading: rgb(0 0 0);
  --app-color-loading-children: rgb(1 1 1);
  --app-color-scripting: rgb(2 2 2);
  --app-color-scripting-children: rgb(3 3 3);
  --app-color-rendering: rgb(4 4 4);
  --app-color-rendering-children: rgb(5 5 5);
  --app-color-painting: rgb(6 6 6);
  --app-color-painting-children: rgb(7 7 7);
  --app-color-task: rgb(8 8 8);
  --app-color-task-children: rgb(9 9 9);
  --app-color-system: rgb(10 10 10);
  --app-color-system-children: rgb(11 11 11);
  --app-color-idle: rgb(12 12 12);
  --app-color-idle-children: rgb(13 13 13);
  --app-color-async: rgb(14 14 14);
  --app-color-async-children: rgb(15 15 15);
  --app-color-other: rgb(16 16 16);
}
`;
      document.documentElement.appendChild(styleElement);
      ThemeSupport.ThemeSupport.clearThemeCache();
    });

    after(() => {
      const styleElementToRemove = document.documentElement.querySelector('#fake-perf-panel-colors');
      if (styleElementToRemove) {
        document.documentElement.removeChild(styleElementToRemove);
      }
      ThemeSupport.ThemeSupport.clearThemeCache();
    });

    it('should return the right color', function() {
      const parsedColor = Trace.Styles.getCategoryStyles().scripting.cssVariable;
      assert.strictEqual(parsedColor, '--app-color-scripting');
    });

    it('should return the color as a CSS variable', function() {
      const cssVariable = Trace.Styles.getCategoryStyles().scripting.getCSSValue();
      assert.strictEqual('var(--app-color-scripting)', cssVariable);
    });

    it('treats the v8.parseOnBackgroundWaiting as scripting even though it would usually be idle', function() {
      const event = makeCompleteEvent(
          Trace.Types.Events.Name.STREAMING_COMPILE_SCRIPT_WAITING,
          1,
          1,
          'v8,devtools.timeline,disabled-by-default-v8.compile',
      );
      assert.strictEqual('rgb(2 2 2)', Timeline.TimelineUIUtils.TimelineUIUtils.eventColor(event));
    });

    it('assigns the correct color to the swatch of an event\'s title', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
      const events = allThreadEntriesInTrace(parsedTrace);
      const task = events.find(event => {
        return event.name.includes('RunTask');
      });
      if (!task) {
        throw new Error('Could not find expected event.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          task,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const titleSwatch: HTMLElement|null = details.querySelector('.timeline-details-chip-title div');
      assert.strictEqual(titleSwatch?.style.backgroundColor, 'rgb(10, 10, 10)');
    });
  });

  describe('testContentMatching', () => {
    it('matches call frame events based on a regular expression and the contents of the event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'react-hello-world.json.gz');
      // Find an event from the trace that represents some work that React did. This
      // event is not chosen for any particular reason other than it was the example
      // used in the bug report: crbug.com/1484504
      const mainThread = getMainThread(parsedTrace.data.Renderer);
      const performConcurrentWorkEvent = mainThread.entries.find(entry => {
        if (Trace.Types.Events.isProfileCall(entry)) {
          return entry.callFrame.functionName === 'performConcurrentWorkOnRoot';
        }
        return false;
      });
      if (!performConcurrentWorkEvent) {
        throw new Error('Could not find expected event');
      }
      assert.isTrue(Timeline.TimelineUIUtils.TimelineUIUtils.testContentMatching(
          performConcurrentWorkEvent, /perfo/, parsedTrace.data));
    });
  });

  describe('traceEventDetails', function() {
    it('shows the interaction ID and INP breakdown metrics for a given interaction', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
      const interactionEvent = parsedTrace.data.UserInteractions.interactionEventsWithNoNesting.find(entry => {
        return entry.dur === 979974 && entry.type === 'click';
      });
      if (!interactionEvent) {
        throw new Error('Could not find expected event');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          interactionEvent,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {
          title: 'Warning',
          value: 'Long interaction is indicating poor page responsiveness.',
        },
        {title: 'Duration', value: '979.97\xA0ms'},
        {
          title: 'ID',
          value: '4122',
        },
        {
          title: 'Input delay',
          value: '1\xA0ms',
        },
        {
          title: 'Processing duration',
          value: '977\xA0ms',
        },
        {
          title: 'Presentation delay',
          value: '2\xA0ms',
        },
      ]);
    });

    it('renders all event data for a generic trace', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'generic-about-tracing.json.gz');
      const event = allThreadEntriesInTrace(parsedTrace).find(entry => {
        return entry.name === 'ThreadControllerImpl::RunTask';
      });
      if (!event) {
        throw new Error('Could not find event.');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          event,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {title: 'Duration', value: '0.22\xA0ms (self 0.20\xA0ms)'},
        {title: 'eventKey', value: 'r-83'},
        {
          title: '',
          // Generic traces get their events rendered as JSON
          value:
              '{   "args": {\n        "chrome_task_annotator": {\n            "delay_policy": "PRECISE",\n            "task_delay_us": 7159\n        },\n        "src_file": "cc/scheduler/scheduler.cc",\n        "src_func": "ScheduleBeginImplFrameDeadline"\n    },\n    "cat": "toplevel",\n    "dur": 222,\n    "name": "ThreadControllerImpl::RunTask",\n    "ph": "X",\n    "pid": 1214129,\n    "tdur": 163,\n    "tid": 7,\n    "ts": 1670373249790,\n    "tts": 5752392\n}',
        },
      ]);
    });

    it('renders invalidations correctly', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'style-invalidation-change-attribute.json.gz');
      TraceLoader.initTraceBoundsManager(parsedTrace);

      // Set up a fake DOM so that we can request nodes by backend Ids (even
      // though we return none, we need to mock these calls else the frontend
      // will not work.)
      const documentNode = {nodeId: 1 as Protocol.DOM.BackendNodeId};
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode as unknown as Protocol.DOM.Node}));
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => {
        return {
          nodeIds: [],
        };
      });

      const recalcStyleEvent = allThreadEntriesInTrace(parsedTrace).find(event => {
        return Trace.Types.Events.isRecalcStyle(event) &&
            event.args.beginData?.stackTrace?.[0].functionName === 'testFuncs.changeAttributeAndDisplay';
      });
      if (!recalcStyleEvent) {
        throw new Error('Could not find update layout tree event');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          recalcStyleEvent,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {title: 'Duration', value: '0.19\xA0ms'},
        {
          title: 'Elements affected',
          value: '3',
        },
        {
          title: 'Selector stats',
          value: 'Select "" to collect detailed CSS selector matching statistics.',
        },
        {
          // The "Recalculation forced" Stack trace
          title: undefined,
          value:
              'testFuncs.changeAttributeAndDisplay @ chromedevtools.github.io/performance-stories/style-invalidations/app.js:47:40\n(anonymous) @ chromedevtools.github.io/performance-stories/style-invalidations/app.js:64:36',
        },
        {
          title: 'Initiated by',
          value: 'Schedule style recalculation',
        },
        {
          title: 'Pending for',
          value: '7.1 ms',
        },
        {
          title: 'PseudoClass:active',
          value: 'BUTTON id=\'changeAttributeAndDisplay\'',
        },
        {
          title: 'Attribute (dir)',
          value:
              'DIV id=\'testElementFour\' at chromedevtools.github.io/performance-stories/style-invalidations/app.js:46',
        },
        {
          title: 'Attribute (dir)',
          value:
              'DIV id=\'testElementFive\' at chromedevtools.github.io/performance-stories/style-invalidations/app.js:47',
        },
        {
          title: 'Element has pending invalidation list',
          value: 'DIV id=\'testElementFour\'',
        },
        {
          title: 'Element has pending invalidation list',
          value: 'DIV id=\'testElementFive\'',
        },
      ]);
    });

    it('renders details for performance.mark', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'user-timings-details.json.gz');
      const mark = parsedTrace.data.UserTimings.performanceMarks[0];
      if (!mark) {
        throw new Error('Could not find expected event');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          mark,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {
          title: 'Timestamp',
          value: '1,058.3\xA0ms',
        },
        {title: 'Details', value: '{   "hello": "world"\n}'},
        {title: undefined, value: '(anonymous) @ localhost:8787/perf-details/app.js:1:12'}
      ]);
    });

    it('renders details for performance.measure', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'user-timings-details.json.gz');
      const measure = parsedTrace.data.UserTimings.performanceMeasures[0];
      if (!measure) {
        throw new Error('Could not find expected event');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          measure,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {
          title: 'Timestamp',
          value: '1,005.5\xA0ms',
        },
        {title: 'Duration', value: '500.00\xA0ms'},
        {
          title: 'Details',
          value:
              '{   "devtools": {\n        "metadata": {\n            "extensionName": "hello",\n            "dataType": "track-entry"\n        },\n        "color": "error",\n        "track": "An extension track"\n    }\n}',
        },
      ]);
    });

    it('renders details for a v8.compile ("Compile Script") event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'user-timings.json.gz');

      const compileEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isV8Compile);
      if (!compileEvent) {
        throw new Error('Could not find expected event');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          compileEvent,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {title: 'Duration', value: '0.98\xA0ms (self 34\xA0μs)'},
        {
          title: 'Script',
          // URL path plus line/col number
          value: '/lib/utils.js:1:1',
        },
        {
          title: 'Streamed',
          value: 'false: inline script',
        },
        {title: 'Compilation cache status', value: 'script not eligible'},
      ]);
    });

    it('renders the details for an extension entry properly', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
      const extensionEntry =
          parsedTrace.data.ExtensionTraceData.extensionTrackData[1].entriesByTrack['An Extension Track'][0];

      if (!extensionEntry) {
        throw new Error('Could not find extension entry.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          extensionEntry,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details).slice(0, 4);
      assert.deepEqual(
          rowData,
          [
            {title: 'Timestamp', value: '1,614.0 ms'},
            {title: 'Duration', value: '1.00\xA0s (self 400.50\xA0ms)'},
            {
              title: 'Description',
              value: 'This is a child task',
            },
            {title: 'Tip', value: 'Do something about it'},
          ],
      );
    });

    it('can handle an extension entry having a `null` value', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
      const extensionEntry =
          parsedTrace.data.ExtensionTraceData.extensionTrackData[1].entriesByTrack['An Extension Track'][0];

      if (!extensionEntry) {
        throw new Error('Could not find extension entry.');
      }

      const mutableEntry: Trace.Types.Extensions.SyntheticExtensionEntry = {
        ...extensionEntry,
        devtoolsObj: {
          ...extensionEntry.devtoolsObj,
          // Note: we do not support this, but bad values can come in via mistakes in user code.
          properties: [['key', null]]
        }
      };

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          mutableEntry,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details).slice(0, 3);
      assert.deepEqual(
          rowData,
          [
            {title: 'Timestamp', value: '1,614.0 ms'},
            {title: 'Duration', value: '1.00\xA0s'},
            {title: 'key', value: 'null'},
          ],
      );
    });

    it('renders the details for an extension marker properly', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
      const extensionMark = parsedTrace.data.ExtensionTraceData.extensionMarkers[0];

      if (!extensionMark) {
        throw new Error('Could not find extension mark.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          extensionMark,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details).slice(0, 2);
      assert.deepEqual(
          rowData,
          [
            {
              title: 'Timestamp',
              value: '1,614.0\xA0ms',
            },
            {
              title: 'Description',
              value: 'This marks the start of a task',
            }
          ],
      );
    });

    it('renders the details for a profile call properly', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      const [process] = parsedTrace.data.Renderer.processes.values();
      const [thread] = process.threads.values();
      const profileCalls = thread.entries.filter(entry => Trace.Types.Events.isProfileCall(entry));

      if (!profileCalls) {
        throw new Error('Could not find renderer events');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          profileCalls[0],
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const stackTraceData = getStackTraceForDetailsElement(details);
      assert.exists(stackTraceData);
      assert.strictEqual(stackTraceData[0], '(anonymous) @ www.google.com:21:17');
    });
    it('renders the stack trace of a ScheduleStyleRecalculation properly', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      TraceLoader.initTraceBoundsManager(parsedTrace);
      const [process] = parsedTrace.data.Renderer.processes.values();
      const [thread] = process.threads.values();
      const scheduleStyleRecalcs =
          thread.entries.filter(entry => Trace.Types.Events.isScheduleStyleRecalculation(entry));

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          scheduleStyleRecalcs[1],
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const stackTraceData = getStackTraceForDetailsElement(details);
      assert.deepEqual(
          stackTraceData,
          ['(anonymous) @ web.dev/js/app.js?v=1423cda3:1:183'],
      );
      const rowData = getRowDataForDetailsElement(details)[0];
      assert.deepEqual(
          rowData,
          {
            title: 'Details',
            value: 'web.dev/js/app.js?v=1423cda3:1:183',
          },
      );
    });

    it('renders the stack trace of a RecalculateStyles properly', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      TraceLoader.initTraceBoundsManager(parsedTrace);
      const [process] = parsedTrace.data.Renderer.processes.values();
      const [thread] = process.threads.values();
      const stylesRecalc = thread.entries.filter(entry => entry.name === Trace.Types.Events.Name.RECALC_STYLE);

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          stylesRecalc[3],
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const stackTraceData = getStackTraceForDetailsElement(details);
      assert.deepEqual(
          stackTraceData,
          ['(anonymous) @ web.dev/js/app.js?v=1423cda3:1:183'],
      );
    });
    async function basicStackTraceParsedTrace(): Promise<Readonly<Trace.TraceModel.ParsedTrace>> {
      const pid = 0;
      const traceId = 0;
      const tid = 0;

      // Build the following hierarchy
      //       |-----------------v8.run--------------------|
      //        |--V8.ParseFunction--||---------f1-------|
      //                              |---f2---||---f3---|
      //                              |measure|  |mark|
      const evaluateScript = makeCompleteEvent(Trace.Types.Events.Name.EVALUATE_SCRIPT, 0, 500, '', pid, tid);
      const v8Run = makeCompleteEvent('v8.run', 10, 490, '', pid, tid);
      const parseFunction = makeCompleteEvent('V8.ParseFunction', 12, 1, '', pid, tid);
      const function1 = makeProfileCall('function 1', 300, 130, pid, tid);
      const function2 = makeProfileCall('function 2', 300, 50, pid, tid);
      const function3 = makeProfileCall('function 3', 351, 20, pid, tid);
      const measure = makeCompleteEvent(Trace.Types.Events.Name.USER_TIMING, 300, 50, 'blink.user_timing', pid, tid) as
          unknown as Trace.Types.Events.PerformanceMeasureBegin;
      const measureTrace = makeCompleteEvent(Trace.Types.Events.Name.USER_TIMING_MEASURE, 300, 50, 'cat', pid, tid) as
          Trace.Types.Events.UserTimingMeasure;
      const mark = makeInstantEvent('Mark', 352, 'blink.user_timing', pid, tid);

      const rendererHandlerData = makeMockRendererHandlerData(
          [evaluateScript, v8Run, parseFunction, function1, function2, measure, measureTrace, function3, mark]);
      measureTrace.args.traceId = traceId;
      measure.args.traceId = traceId;
      Trace.Handlers.ModelHandlers.UserTimings.handleEvent(measureTrace);
      await Trace.Handlers.ModelHandlers.UserTimings.finalize();
      const timingsData = Trace.Handlers.ModelHandlers.UserTimings.data();

      const parsedTrace = getBaseTraceHandlerData({UserTimings: timingsData, Renderer: rendererHandlerData});
      TraceLoader.initTraceBoundsManager(parsedTrace);
      return parsedTrace;
    }
    it('renders the stack trace of extension entries properly', async function() {
      const parsedTrace = await basicStackTraceParsedTrace();
      const [function1, function2, function3] =
          allThreadEntriesInTrace(parsedTrace).filter(Trace.Types.Events.isProfileCall);
      const mark = allThreadEntriesInTrace(parsedTrace).find(event => event.name === 'Mark');
      const measure =
          allThreadEntriesInTrace(parsedTrace).find(event => event.name === Trace.Types.Events.Name.USER_TIMING) as
          Trace.Types.Events.UserTimingMeasure;
      assert.exists(mark);
      assert.exists(measure);

      const markerExtensionEntry = {
        cat: 'devtools.extension',
        ts: function3.ts,
        pid: function3.pid,
        tid: function3.tid,
        devtoolsObj: {},
        rawSourceEvent: mark,
      } as unknown as Trace.Types.Extensions.SyntheticExtensionEntry;

      const markerDetails = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          markerExtensionEntry,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const markerStackTraceData = getStackTraceForDetailsElement(markerDetails);
      assert.exists(markerStackTraceData);
      assert.deepEqual(
          markerStackTraceData,
          [
            `${function3.callFrame.functionName} @ unknown`,
            `${function1.callFrame.functionName} @ unknown`,
          ],
      );

      const mockExtensionTrackEntry = {
        cat: 'devtools.extension',
        ts: function2.ts,
        pid: function2.pid,
        tid: function2.tid,
        devtoolsObj: {},
        rawSourceEvent: {
          cat: 'blink.user_timing',
          args: {traceId: measure.args.traceId},
          ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
        },
      } as Trace.Types.Extensions.SyntheticExtensionEntry;

      const trackEntryDetails = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          mockExtensionTrackEntry,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const trackEntryStackTraceData = getStackTraceForDetailsElement(trackEntryDetails);
      assert.exists(trackEntryStackTraceData);
      assert.deepEqual(trackEntryStackTraceData, [
        `${function2.callFrame.functionName} @ unknown`,
        `${function1.callFrame.functionName} @ unknown`,
      ]);
    });
    it('renders the stack trace of user timings properly', async function() {
      const parsedTrace = await basicStackTraceParsedTrace();
      const [function1, function2, function3] =
          allThreadEntriesInTrace(parsedTrace).filter(Trace.Types.Events.isProfileCall);
      const mark = allThreadEntriesInTrace(parsedTrace).find(event => event.name === 'Mark');
      const measure =
          allThreadEntriesInTrace(parsedTrace).find(event => event.name === Trace.Types.Events.Name.USER_TIMING);
      assert.exists(mark);
      assert.exists(measure);

      const markerDetails = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          mark,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const markerStackTraceData = getStackTraceForDetailsElement(markerDetails);
      assert.exists(markerStackTraceData);
      assert.deepEqual(
          markerStackTraceData,
          [
            `${function3.callFrame.functionName} @ unknown`,
            `${function1.callFrame.functionName} @ unknown`,
          ],
      );

      const trackEntryDetails = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          measure,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const trackEntryStackTraceData = getStackTraceForDetailsElement(trackEntryDetails);
      assert.exists(trackEntryStackTraceData);
      assert.deepEqual(trackEntryStackTraceData, [
        `${function2.callFrame.functionName} @ unknown`,
        `${function1.callFrame.functionName} @ unknown`,
      ]);
    });
    it('renders the warning for a trace event in its details', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');

      const events = allThreadEntriesInTrace(parsedTrace);
      const longTask = events.find(e => (e.dur || 0) > 1_000_000);
      if (!longTask) {
        throw new Error('Could not find Long Task event.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          longTask,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(
          rowData,
          [
            {
              title: 'Warning',
              value: 'Long task took 1.30\u00A0s.',
            },
            {title: 'Duration', value: '1.30\xA0s (self 47\xA0μs)'},
          ],
      );
    });

    it('includes the timeout for a RequestIdleCallback event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-timings.json.gz');
      const events = allThreadEntriesInTrace(parsedTrace);
      const requestIdleCallback = events.find(e => {
        return Trace.Types.Events.isRequestIdleCallback(e) && e.ts === 10041020329;
      });
      assert.isOk(requestIdleCallback);
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          requestIdleCallback,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(
          rowData.slice(0, 2),  // Don't care about the stack trace or initiator
          [
            {
              title: 'Callback ID',
              value: '1',
            },
            {title: 'Timeout', value: '4\xA0ms'},
          ],
      );
    });

    it('shows information for the WebSocketCreate initiator when viewing a WebSocketSendHandshakeRequest event',
       async function() {
         const parsedTrace = await TraceLoader.traceEngine(this, 'web-sockets.json.gz');
         TraceLoader.initTraceBoundsManager(parsedTrace);

         const sendHandshake =
             allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isWebSocketSendHandshakeRequest);
         if (!sendHandshake) {
           throw new Error('Could not find handshake event.');
         }

         const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
             parsedTrace,
             sendHandshake,
             new Components.Linkifier.Linkifier(),
             false,
             null,
         );
         const rowData = getRowDataForDetailsElement(details);
         const expectedRowData = [
           {title: 'URL', value: 'wss://socketsbay.com/wss/v2/1/demo/'},
           // The 'First Invalidated' Stack trace
           {title: undefined, value: 'connect @ socketsbay.com/test-websockets:314:25'},
           {title: 'Initiated by', value: 'Create WebSocket'},
           {title: 'Pending for', value: '72.0 ms'},
         ];
         assert.deepEqual(
             rowData,
             expectedRowData,
         );
       });

    it('shows information for the events initiated by WebSocketCreate when viewing a WebSocketCreate event',
       async function() {
         const parsedTrace = await TraceLoader.traceEngine(this, 'web-sockets.json.gz');
         TraceLoader.initTraceBoundsManager(parsedTrace);

         const sendHandshake = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isWebSocketCreate);
         if (!sendHandshake) {
           throw new Error('Could not find handshake event.');
         }

         const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
             parsedTrace,
             sendHandshake,
             new Components.Linkifier.Linkifier(),
             false,
             null,
         );
         const rowData = getRowDataForDetailsElement(details);
         const expectedRowData = [
           {title: 'URL', value: 'wss://socketsbay.com/wss/v2/1/demo/'},
           // The initiator stack trace
           {
             title: undefined,
             value:
                 'connect @ socketsbay.com/test-websockets:314:25\n(anonymous) @ socketsbay.com/test-websockets:130:129'
           },
           // The 2 entries under "Initiator for" are displayed as separate links and in the UI it is obvious they are separate
           {title: 'Initiator for', value: 'Send WebSocket handshake Receive WebSocket handshake'},
         ];
         assert.deepEqual(
             rowData,
             expectedRowData,
         );
       });

    it('shows the aggregated time information for an event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const event = allThreadEntriesInTrace(parsedTrace).find(e => e.ts === 1020034919877 && e.name === 'RunTask');
      if (!event) {
        throw new Error('Could not find renderer events');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          event,
          new Components.Linkifier.Linkifier(),
          true,
          null,
      );
      const pieChartData = getPieChartDataForDetailsElement(details);

      const expectedPieChartData = [
        {title: 'System (self)', value: '2\u00A0ms'},
        {title: 'System (children)', value: '0\u00A0ms'},
        {title: 'Rendering', value: '28\u00A0ms'},
        {title: 'Painting', value: '2\u00A0ms'},
        {title: 'Total', value: '32\u00A0ms'},
      ];
      assert.deepEqual(
          pieChartData,
          expectedPieChartData,
      );
    });

    it('renders details for SchedulePostTaskCallback events', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'scheduler-post-task.json.gz');

      const scheduleEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isSchedulePostTaskCallback);
      assert(scheduleEvent, 'Could not find SchedulePostTaskCallback event');
      const scheduleDetails = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          scheduleEvent,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(scheduleDetails);
      assert.deepEqual(rowData, [
        {title: 'Delay', value: '200\xA0ms'},
        {title: 'Priority', value: 'user-visible'},
        {
          title: undefined,
          value: '(anonymous) @ localhost:8787/scheduler/app.js:49:18',
        },
        {title: 'Initiator for', value: 'Fire postTask'},
      ]);
    });

    it('lets the initiator be clicked on to select it', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'scheduler-post-task.json.gz');

      // Make a stubbed TimelinePanel, and then ensure all instance() calls return it.
      const timelinePanel = sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel);
      sinon.stub(Timeline.TimelinePanel.TimelinePanel, 'instance').callsFake(() => timelinePanel);

      const scheduleEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isSchedulePostTaskCallback);
      assert(scheduleEvent, 'Could not find SchedulePostTaskCallback event');

      // This is the event initiated by the schedule event.
      const postTaskEvent = parsedTrace.data.Initiators.initiatorToEvents.get(scheduleEvent)?.at(0);
      assert.isOk(postTaskEvent);

      const scheduleDetails = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          scheduleEvent,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      container.append(scheduleDetails);
      await raf();
      const link = container.querySelector<HTMLElement>('.timeline-link');
      assert.isOk(link);
      assert.strictEqual(link?.innerText, 'Fire postTask');
      dispatchClickEvent(link);

      sinon.assert.calledOnceWithExactly(
          timelinePanel.select, Timeline.TimelineSelection.selectionFromEvent(postTaskEvent));
    });

    it('lets the user click the title of an event to zoom into it', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

      // Make a stubbed TimelinePanel, and then ensure all instance() calls return it.
      const timelinePanel = sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel);
      sinon.stub(Timeline.TimelinePanel.TimelinePanel, 'instance').callsFake(() => timelinePanel);

      const event = allThreadEntriesInTrace(parsedTrace).find(event => {
        return event.name === 'RunTask';
      });
      assert.isOk(event);

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          event,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      container.append(details);
      await raf();
      const title = container.querySelector<HTMLElement>('.timeline-details-chip-title-reveal-entry');
      assert.isOk(title);
      dispatchClickEvent(title);

      sinon.assert.calledOnceWithExactly(timelinePanel.zoomEvent, event);
    });

    it('renders details for RunPostTaskCallback events', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'scheduler-post-task.json.gz');

      const runEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isRunPostTaskCallback);
      assert(runEvent, 'Could not find RunPostTaskCallback event');
      const runDetails = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          runEvent,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const rowData = getRowDataForDetailsElement(runDetails);
      assert.deepEqual(rowData, [
        {title: 'Duration', value: '161.18\xA0ms (self 63\xA0μs)'},
        {title: 'Delay', value: '200\xA0ms'},
        {title: 'Priority', value: 'user-visible'},
        {
          title: undefined,
          value: '(anonymous) @ localhost:8787/scheduler/app.js:49:18',
        },
        {title: 'Initiated by', value: 'Schedule postTask'},
        {title: 'Pending for', value: '200.1\xA0ms'},
      ]);
    });
    it('renders the stack trace of a profile call event', async function() {
      // uses source maps
      const parsedTrace = await TraceLoader.traceEngine(this, 'async-js-calls.json.gz');
      const jsCall = allThreadEntriesInTrace(parsedTrace)
                         .find(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'baz');
      assert.exists(jsCall);
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          parsedTrace,
          jsCall,
          new Components.Linkifier.Linkifier(),
          false,
          null,
      );
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      container.appendChild(details);
      const stackTraceContainer = container.querySelector('.stack-preview-container');
      const stackTracesElements =
          stackTraceContainer?.shadowRoot?.querySelector('.stack-preview-container')?.querySelectorAll('tbody');
      assert.exists(stackTracesElements);
      const testData = [...stackTracesElements].map(stackTraceElement => {
        const description = stackTraceElement.querySelector<HTMLTableRowElement>('.stack-preview-async-row');
        const stackFrameElements =
            stackTraceElement.querySelectorAll<HTMLTableRowElement>('tr:not(.stack-preview-async-row)');
        const stackFrames = [...stackFrameElements].map(frame => frame.innerText);
        return {description: description?.innerText || '', stackFrames};
      });
      assert.deepEqual(
          testData,
          [
            {description: '', stackFrames: ['\tbaz\t@\tunknown']},
            {description: '\trequestIdleCallback\t\t', stackFrames: ['\tbar\t@\tunknown']},
            {description: '\tsetTimeout\t\t', stackFrames: ['\tfoo\t@\tunknown']},
            {
              description: '\trequestAnimationFrame\t\t',
              stackFrames: ['\tstartExample\t@\tunknown', '\t(anonymous)\t@\tunknown'],
            },
          ],
      );
    });
  });

  it('renders 3p details for profile call properly', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const jsCall = allThreadEntriesInTrace(parsedTrace)
                       .find(e => Trace.Types.Events.isProfileCall(e) && e.callFrame.functionName === 'z');
    assert.exists(jsCall);

    const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
        parsedTrace,
        jsCall,
        new Components.Linkifier.Linkifier(),
        true,
        entityMapper,
    );

    const rowData = getRowDataForDetailsElement(details).find(row => row.title?.startsWith('Origin'));
    assert.deepEqual(rowData, {
      title: 'Origin',
      value: 'www.google-analytics.com (Google Analytics)',
    });
  });

  it('can generate details for a frame with the old screenshots format', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const frame = parsedTrace.data.Frames.frames.at(0);
    if (!frame) {
      throw new Error('Could not find expected frame');
    }
    const filmStrip = Trace.Extras.FilmStrip.fromHandlerData(parsedTrace.data);
    const details =
        Timeline.TimelineUIUtils.TimelineUIUtils.generateDetailsContentForFrame(frame, filmStrip, filmStrip.frames[0]);
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    container.appendChild(details);
    // Give the image element time to render and load.
    await doubleRaf();
    const img = container.querySelector<HTMLImageElement>('.timeline-filmstrip-preview img');
    assert.isOk(img);
    const filmStripFrame = filmStrip.frames[0];
    assert.isTrue(
        Trace.Types.Events.isLegacySyntheticScreenshot(filmStripFrame.screenshotEvent) &&
        img.currentSrc.includes(filmStripFrame.screenshotEvent.args.dataUri));

    const durationRow = container.querySelector<HTMLElement>('[data-row-title="Duration"]');
    const durationValue = durationRow?.querySelector<HTMLSpanElement>('.timeline-details-view-row-value span');
    if (!durationValue) {
      throw new Error('Could not find duration');
    }
    // Strip the unicode spaces out and replace with simple spaces for easy
    // assertions.
    const value = (durationValue.innerText.replaceAll(/\s/g, ' '));
    assert.strictEqual(value, '37.85 ms (at 109.82 ms)');
  });

  it('can generate details for a frame with the new screenshots format', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-screenshot-source-ids.json.gz');
    const frame = parsedTrace.data.Frames.frames.at(0);
    if (!frame) {
      throw new Error('Could not find expected frame');
    }
    const filmStrip = Trace.Extras.FilmStrip.fromHandlerData(parsedTrace.data);
    const details =
        Timeline.TimelineUIUtils.TimelineUIUtils.generateDetailsContentForFrame(frame, filmStrip, filmStrip.frames[0]);
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    container.appendChild(details);
    // Give the image element time to render and load.
    await doubleRaf();
    const img = container.querySelector<HTMLImageElement>('.timeline-filmstrip-preview img');
    assert.isOk(img);
    const filmStripFrame = filmStrip.frames[0];
    assert.isTrue(
        Trace.Types.Events.isScreenshot(filmStripFrame.screenshotEvent) &&
        img.currentSrc.includes(
            Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(filmStripFrame.screenshotEvent)));

    const durationRow = container.querySelector<HTMLElement>('[data-row-title="Duration"]');
    const durationValue = durationRow?.querySelector<HTMLSpanElement>('.timeline-details-view-row-value span');
    if (!durationValue) {
      throw new Error('Could not find duration');
    }
    // Strip the unicode spaces out and replace with simple spaces for easy
    // assertions.
    const value = (durationValue.innerText.replaceAll(/\s/g, ' '));
    assert.strictEqual(value, '208.33 ms (at 1.53 s)');
  });

  describe('eventTitle', function() {
    it('renders the correct title for an EventTiming interaction event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');
      const interactionEvent = parsedTrace.data.UserInteractions.interactionEventsWithNoNesting[0];
      const details = Timeline.TimelineUIUtils.TimelineUIUtils.eventTitle(interactionEvent);
      assert.deepEqual(details, 'Pointer');
    });

    it('will use the resolved function name for a profile node that has a sourcemap', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');

      const mainThread = getMainThread(parsedTrace.data.Renderer);
      const profileEntry = mainThread.entries.find(entry => {
        return Trace.Types.Events.isProfileCall(entry);
      });
      if (!profileEntry || !Trace.Types.Events.isProfileCall(profileEntry)) {
        throw new Error('Could not find a profile entry');
      }

      // Fake that we resolved the entry's name from a sourcemap.
      SourceMapsResolver.SourceMapsResolver.storeResolvedCodeDataForCallFrame(
          profileEntry.callFrame, {name: 'resolved-function-test', devtoolsLocation: null, script: null});

      const title = Timeline.TimelineUIUtils.TimelineUIUtils.eventTitle(profileEntry);
      assert.strictEqual(title, 'resolved-function-test');
    });
  });

  describe('eventStyle', function() {
    it('returns the correct style for profile calls', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'simple-js-program.json.gz');
      const rendererHandler = parsedTrace.data.Renderer;
      if (!rendererHandler) {
        throw new Error('RendererHandler is undefined');
      }
      const [process] = rendererHandler.processes.values();
      const [thread] = process.threads.values();
      const profileCalls = thread.entries.filter(entry => Trace.Types.Events.isProfileCall(entry));
      const style = Timeline.TimelineUIUtils.TimelineUIUtils.eventStyle(profileCalls[0]);
      assert.strictEqual(style.category.name, 'scripting');
      assert.strictEqual(style.category.cssVariable, '--app-color-scripting');
    });
  });

  describe('statsForTimeRange', () => {
    it('correctly aggregates up stats', async () => {
      const mainThread = Trace.Types.Events.ThreadID(1);
      const pid = Trace.Types.Events.ProcessID(100);
      function microsec(x: number): Trace.Types.Timing.Micro {
        return Trace.Types.Timing.Micro(x);
      }

      const events: Trace.Types.Events.Event[] = [
        {
          cat: 'disabled-by-default-devtools.timeline',
          name: 'TracingStartedInBrowser',
          ph: Trace.Types.Events.Phase.INSTANT,
          pid,
          tid: mainThread,
          ts: microsec(100),
          args: {
            data: {
              frames: [
                {frame: 'frame1', url: 'frameurl', name: 'frame-name'},
              ],
            },
          },
        } as Trace.Types.Events.TracingStartedInBrowser,
        {
          cat: 'disabled-by-default-devtools.timeline',
          name: 'SetLayerTreeId',
          ph: Trace.Types.Events.Phase.INSTANT,
          pid,
          tid: mainThread,
          ts: microsec(101),
          args: {data: {frame: 'frame1', layerTreeId: 17}},
        } as Trace.Types.Events.SetLayerTreeId,
        {
          cat: 'toplevel',
          name: 'Program',
          ph: Trace.Types.Events.Phase.COMPLETE,
          ts: microsec(100000),
          dur: microsec(3000),
          tid: mainThread,
          pid,
          args: {},
        },
        {
          cat: 'disabled-by-default-devtools.timeline',
          name: 'FunctionCall',
          ph: Trace.Types.Events.Phase.COMPLETE,
          ts: microsec(100500),
          dur: microsec(1500),
          tid: mainThread,
          pid,
          args: {},
        },
        {
          cat: 'disabled-by-default-devtools.timeline',
          name: 'Layout',
          ph: Trace.Types.Events.Phase.COMPLETE,
          ts: microsec(101000),
          dur: microsec(1000),
          tid: mainThread,
          pid,
          args: {
            beginData: {
              frame: 'FAKE_FRAME_ID',
              dirtyObjects: 0,
              partialLayout: false,
              totalObjects: 1,
            },
            endData: {layoutRoots: []},
          },
        } as Trace.Types.Events.Layout,

        {
          cat: 'toplevel',
          name: 'Program',
          ph: Trace.Types.Events.Phase.COMPLETE,
          ts: microsec(104000),
          dur: microsec(4000),
          tid: mainThread,
          pid,
          args: {},
        },
        {
          cat: 'disabled-by-default-devtools.timeline',
          name: 'FunctionCall',
          ph: Trace.Types.Events.Phase.COMPLETE,
          ts: microsec(104000),
          dur: microsec(1000),
          tid: mainThread,
          pid,
          args: {},
        },
        {
          cat: 'disabled-by-default-devtools.timeline',
          name: 'CommitLoad',
          ph: Trace.Types.Events.Phase.COMPLETE,
          ts: microsec(105000),
          dur: microsec(1000),
          tid: mainThread,
          pid,
          args: {},
        },
        {
          cat: 'disabled-by-default-devtools.timeline',
          name: 'Layout',
          ph: Trace.Types.Events.Phase.COMPLETE,
          ts: microsec(107000),
          dur: microsec(1000),
          tid: mainThread,
          pid,
          args: {
            beginData: {
              frame: 'FAKE_FRAME_ID',
              dirtyObjects: 0,
              partialLayout: false,
              totalObjects: 1,
            },
            endData: {layoutRoots: []},
          },
        } as Trace.Types.Events.Layout,
      ];

      const rangeStats101To103 = Timeline.TimelineUIUtils.TimelineUIUtils.statsForTimeRange(
          events,
          Trace.Types.Timing.Milli(101),
          Trace.Types.Timing.Milli(103),
      );
      assert.deepEqual(rangeStats101To103, {
        other: 1,
        rendering: 1,
        scripting: 0,
        idle: 0,
      });
      const rangeStats104To109 = Timeline.TimelineUIUtils.TimelineUIUtils.statsForTimeRange(
          events,
          Trace.Types.Timing.Milli(104),
          Trace.Types.Timing.Milli(109),
      );
      assert.deepEqual(rangeStats104To109, {
        other: 2,
        rendering: 1,
        scripting: 1,
        idle: 1,
      });
    });
  });

  describe('isMarkerEvent', () => {
    it('is true for a timestamp event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const timestamp = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isConsoleTimeStamp);
      assert.isOk(timestamp);
      assert.isTrue(Timeline.TimelineUIUtils.isMarkerEvent(parsedTrace, timestamp));
    });

    it('is true for a Mark First Paint event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const markFirstPaint = parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(Trace.Types.Events.isFirstPaint);
      assert.isOk(markFirstPaint);
      assert.isTrue(Timeline.TimelineUIUtils.isMarkerEvent(parsedTrace, markFirstPaint));
    });

    it('is true for a Mark FCP event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const markFCPEvent =
          parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(Trace.Types.Events.isFirstContentfulPaint);
      assert.isOk(markFCPEvent);
      assert.isTrue(Timeline.TimelineUIUtils.isMarkerEvent(parsedTrace, markFCPEvent));
    });

    it('is false for a Mark FCP event not on the main frame', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const markFCPEvent =
          parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(Trace.Types.Events.isFirstContentfulPaint);
      assert.isOk(markFCPEvent);
      assert.isOk(markFCPEvent.args);
      // Now make a copy (so we do not mutate any data) and pretend it is not on the main frame.
      const copyOfEvent = {...markFCPEvent, args: {...markFCPEvent.args}};
      copyOfEvent.args.frame = 'not-the-main-frame';
      assert.isFalse(Timeline.TimelineUIUtils.isMarkerEvent(parsedTrace, copyOfEvent));
    });

    it('is true for a MarkDOMContent event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const markDOMContentEvent =
          parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(Trace.Types.Events.isMarkDOMContent);
      assert.isOk(markDOMContentEvent);
      assert.isTrue(Timeline.TimelineUIUtils.isMarkerEvent(parsedTrace, markDOMContentEvent));
    });

    it('is true for a MarkLoad event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const markLoadEvent = parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(Trace.Types.Events.isMarkLoad);
      assert.isOk(markLoadEvent);
      assert.isTrue(Timeline.TimelineUIUtils.isMarkerEvent(parsedTrace, markLoadEvent));
    });

    it('is true for a LCP candiadate event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const markLCPCandidate = parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(
          Trace.Types.Events.isAnyLargestContentfulPaintCandidate);
      assert.isOk(markLCPCandidate);
      assert.isTrue(Timeline.TimelineUIUtils.isMarkerEvent(parsedTrace, markLCPCandidate));
    });

    it('is false for a MarkDOMContent event not on outermost main frame', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const markDOMContentEvent =
          parsedTrace.data.PageLoadMetrics.allMarkerEvents.find(Trace.Types.Events.isMarkDOMContent);
      assert.isOk(markDOMContentEvent);
      assert.isOk(markDOMContentEvent.args);
      assert.isOk(markDOMContentEvent.args.data);

      const copyOfEventNotOutermostFrame = {
        ...markDOMContentEvent,
        args: {
          ...markDOMContentEvent.args,
          data: {
            ...markDOMContentEvent.args.data,
            isOutermostMainFrame: false,
          },
        },

      };
      assert.isFalse(Timeline.TimelineUIUtils.isMarkerEvent(parsedTrace, copyOfEventNotOutermostFrame));
    });
  });

  describe('displayNameForFrame', () => {
    it('trims the URL at 80 chars by default', async () => {
      const frame: Trace.Types.Events.TraceFrame = {
        name: 'test-frame',
        url: 'https://' +
            'a'.repeat(80),
        frame: 'frame-id',
        processId: Trace.Types.Events.ProcessID(1),
      };
      const name = Timeline.TimelineUIUtils.TimelineUIUtils.displayNameForFrame(frame);
      assert.strictEqual(name, `https://${'a'.repeat(72) /* 80 minus the 8 chars for 'https://' */}`);
      assert.lengthOf(name, 80);
    });

    it('uses the frame name if the URL is about:', async () => {
      const frame: Trace.Types.Events.TraceFrame = {
        name: 'test-frame',
        url: 'about:blank',
        frame: 'frame-id',
        processId: Trace.Types.Events.ProcessID(1),
      };
      const name = Timeline.TimelineUIUtils.TimelineUIUtils.displayNameForFrame(frame);
      assert.strictEqual(name, '"test-frame"');
    });

    it('trims the frame name from the middle if it is too long', async () => {
      const frame: Trace.Types.Events.TraceFrame = {
        name: 'test-frame-that-is-long',
        url: 'about:blank',
        frame: 'frame-id',
        processId: Trace.Types.Events.ProcessID(1),
      };
      const name = Timeline.TimelineUIUtils.TimelineUIUtils.displayNameForFrame(frame, 10);
      assert.strictEqual(name, '"test-…long"');
    });
  });

  describe('buildDetailsNodeForMarkerEvents', () => {
    it('builds the right link for an LCP Event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const markLCPEvent = getEventOfType(
          parsedTrace.data.PageLoadMetrics.allMarkerEvents, Trace.Types.Events.isAnyLargestContentfulPaintCandidate);
      const html = Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForMarkerEvents(
          markLCPEvent,
      );
      const url = html.querySelector('x-link')?.getAttribute('href');
      assert.strictEqual(url, 'https://web.dev/lcp/');
      assert.strictEqual(html.innerText, 'Learn more about Largest Contentful Paint.');
    });

    it('builds the right link for an FCP Event', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const markFCPEvent =
          getEventOfType(parsedTrace.data.PageLoadMetrics.allMarkerEvents, Trace.Types.Events.isFirstContentfulPaint);
      const html = Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForMarkerEvents(
          markFCPEvent,
      );
      const url = html.querySelector('x-link')?.getAttribute('href');
      assert.strictEqual(url, 'https://web.dev/first-contentful-paint/');
      assert.strictEqual(html.innerText, 'Learn more about First Contentful Paint.');
    });

    it('builds a generic event for other marker events', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const markLoadEvent =
          getEventOfType(parsedTrace.data.PageLoadMetrics.allMarkerEvents, Trace.Types.Events.isMarkLoad);
      const html = Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForMarkerEvents(
          markLoadEvent,
      );
      const url = html.querySelector('x-link')?.getAttribute('href');
      assert.strictEqual(url, 'https://web.dev/user-centric-performance-metrics/');
      assert.strictEqual(html.innerText, 'Learn more about page performance metrics.');
    });
  });

  describe('parseStringForLinks', () => {
    it('should handle a string with no links', () => {
      const rawString = 'This is a string with no links.';
      const fragment = Timeline.TimelineUIUtils.TimelineUIUtils.parseStringForLinks(rawString);
      const container = document.createElement('div');
      container.appendChild(fragment);
      assert.strictEqual(container.innerHTML, 'This is a string with no links.');
    });

    it('should handle a url and terminating punctuation', () => {
      const rawString = 'Check out: https://example.com.';
      const fragment = Timeline.TimelineUIUtils.TimelineUIUtils.parseStringForLinks(rawString);
      const container = document.createElement('div');
      container.appendChild(fragment);
      assert.strictEqual(
          container.innerHTML,
          'Check out: <button class="devtools-link text-button link-style" title="https://example.com" jslog="Link; context: url; track: click" role="link" tabindex="-1"></button>.');
    });

    it('should handle URLs anywhere within the string', () => {
      const rawString =
          'http://example.com at the beginning. http://example.com in the middle or at the end: http://example.com';
      const fragment = Timeline.TimelineUIUtils.TimelineUIUtils.parseStringForLinks(rawString);
      const container = document.createElement('div');
      container.appendChild(fragment);
      assert.strictEqual(
          container.innerHTML,
          `<button class="devtools-link text-button link-style" title="http://example.com" jslog="Link; context: url; track: click" role="link" tabindex="-1"></button>
at the beginning. <button class="devtools-link text-button link-style" title="http://example.com" jslog="Link; context: url; track: click" role="link" tabindex="-1"></button>
in the middle or at the end: <button class="devtools-link text-button link-style" title="http://example.com" jslog="Link; context: url; track: click" role="link" tabindex="-1"></button>`
              .replace(/\n/g, ' '));
    });

    it('should parse a string with multiple links and create link elements for them', () => {
      const rawString = 'Node: ext://node/123   Root Cause: ext://node/13566';
      const fragment = Timeline.TimelineUIUtils.TimelineUIUtils.parseStringForLinks(rawString);
      const container = document.createElement('div');
      container.appendChild(fragment);
      assert.strictEqual(
          container.innerHTML,
          'Node: <button class="devtools-link text-button link-style" jslog="Link; context: url; track: click" role="link" tabindex="-1">ext://node/123</button>   Root Cause: <button class="devtools-link text-button link-style" jslog="Link; context: url; track: click" role="link" tabindex="-1">ext://node/13566</button>');
    });

    it('does not linkify data URI or www. prefixed text handle a data URI', () => {
      const rawString =
          'so data:text/html,%3Cscript%3Ealert%28%27hi%27%29%3B%3C%2Fscript%3E and www.site.com remain plain';
      const fragment = Timeline.TimelineUIUtils.TimelineUIUtils.parseStringForLinks(rawString);
      const container = document.createElement('div');
      container.appendChild(fragment);
      assert.strictEqual(
          container.innerHTML,
          'so data:text/html,%3Cscript%3Ealert%28%27hi%27%29%3B%3C%2Fscript%3E and www.site.com remain plain');
    });
  });

  describe('URL regex in parseStringForLinks', () => {
    const urlRegex = Timeline.TimelineUIUtils.URL_REGEX;

    const testCases: Array<{url: string, matches: boolean}> = [
      // Matching URLs:
      {url: 'http://example.com', matches: true},
      {url: 'https://example.com', matches: true},
      {url: 'https://www.xn--examl-gsa.com', matches: true},
      {url: 'https://example.com/path/to/resource', matches: true},
      {url: 'https://example.com?query=param&another=param', matches: true},
      {url: 'https://example.com#fragment', matches: true},
      {url: 'ftp://files.example.com', matches: true},
      {url: 'custom-scheme://resource/123', matches: true},
      {url: 'ext://node/123', matches: true},
      {url: 'http://a.z', matches: true},
      {url: '9http://example.com', matches: true},
      // URLs with trailing punctuation should still match the URL part.
      {url: 'https://example.com(', matches: true},
      {url: 'https://example.com)', matches: true},
      {url: 'https://example.com[', matches: true},
      {url: 'https://example.com]', matches: true},
      {url: 'https://example.com{', matches: true},
      {url: 'https://example.com}', matches: true},
      {url: 'https://example.com,', matches: true},
      {url: 'https://example.com:', matches: true},
      {url: 'https://example.com;', matches: true},
      {url: 'https://example.com.', matches: true},
      {url: 'https://example.com!', matches: true},
      {url: 'https://example.com?', matches: true},

      // Non-matching strings:
      {url: 'www.example.com', matches: false},
      {url: 'example.com', matches: false},
      {url: 'data:text/html,hello', matches: false},
      {url: 'mailto:test@example.com', matches: false},
      {url: 'javascript:void(0)', matches: false},
      {url: 'not a url', matches: false},
      {url: 'http://', matches: false},
      {url: 'https://a', matches: false},
      {url: 'http://a .com', matches: false},
      {url: 'http://a".com', matches: false},
      {url: 'ht://example.com)', matches: false},  // protocol must be 3 or more letters.
    ];

    for (const {url, matches} of testCases) {
      it(`correctly validates "${url}" as ${matches ? 'matching' : 'not matching'}`, () => {
        assert.strictEqual(urlRegex.test(url), matches);
      });
    }
  });
});
