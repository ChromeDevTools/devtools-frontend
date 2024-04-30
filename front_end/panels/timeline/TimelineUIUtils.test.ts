// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Elements from '../../panels/elements/elements.js';
import {doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
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
  getMainThread,
  makeCompleteEvent,
  makeMockSamplesHandlerData,
  makeProfileCall,
} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';

import * as Timeline from './timeline.js';

const {assert} = chai;

describeWithMockConnection('TimelineUIUtils', function() {
  let tracingModel: TraceEngine.Legacy.TracingModel;
  let process: TraceEngine.Legacy.Process;
  let thread: TraceEngine.Legacy.Thread;
  let target: SDK.Target.Target;
  // Trace events contain script ids as strings. However, the linkifier
  // utilities assume it is a number because that's how it's defined at
  // the protocol level. For practicality, we declare these two
  // variables so that we can satisfy type checking throughout the tests.
  const SCRIPT_ID_NUMBER = 1;
  const SCRIPT_ID_STRING = String(SCRIPT_ID_NUMBER) as Protocol.Runtime.ScriptId;

  beforeEach(() => {
    target = createTarget();
    tracingModel = new TraceEngine.Legacy.TracingModel();
    process = new TraceEngine.Legacy.Process(tracingModel, 1);
    thread = new TraceEngine.Legacy.Thread(process, 1);

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
  });

  afterEach(() => {
    clearMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend');
  });

  it('creates top frame location text for function calls', async function() {
    const event = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'FunctionCall', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);

    event.addArgs({
      data: {
        functionName: 'test',
        url: 'test.js',
        scriptId: SCRIPT_ID_STRING,
        lineNumber: 0,
        columnNumber: 0,
      },
    });
    assert.strictEqual(
        'test.js:1:1', await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsTextForTraceEvent(event));
  });

  it('creates top frame location text as a fallback', async function() {
    // 'TimerInstall' is chosen such that we run into the 'default' case.
    const event = new TraceEngine.Legacy.ConstructedEvent(
        'devtools.timeline', 'TimerInstall', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);

    event.addArgs({
      data: {
        stackTrace: [
          {
            functionName: 'test',
            url: 'test.js',
            scriptId: SCRIPT_ID_STRING,
            lineNumber: 0,
            columnNumber: 0,
          },
        ],
      },
    });
    const data = TimelineModel.TimelineModel.EventOnTimelineData.forEvent(event);
    data.stackTrace = event.args.data.stackTrace;
    assert.strictEqual(
        'test.js:1:1', await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsTextForTraceEvent(event));
  });

  describe('script location as an URL', function() {
    let event: TraceEngine.Legacy.ConstructedEvent;
    beforeEach(() => {
      event = new TraceEngine.Legacy.ConstructedEvent(
          'devtools.timeline', TimelineModel.TimelineModel.RecordType.FunctionCall,
          TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);

      event.addArgs({
        data: {
          functionName: 'test',
          url: 'https://google.com/test.js',
          scriptId: SCRIPT_ID_STRING,
          lineNumber: 0,
          columnNumber: 0,
        },
      });
    });
    it('makes the script location of a call frame a full URL when the inspected target is not the same the call frame was taken from (e.g. a loaded file)',
       async function() {
         target.setInspectedURL('https://not-google.com' as Platform.DevToolsPath.UrlString);
         const node = await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForTraceEvent(
             event, target, new Components.Linkifier.Linkifier());
         if (!node) {
           throw new Error('Node was unexpectedly null');
         }
         assert.strictEqual(node.textContent, 'test @ google.com/test.js:1:1');
       });

    it('makes the script location of a call frame a script name when the inspected target is the one the call frame was taken from',
       async function() {
         target.setInspectedURL('https://google.com' as Platform.DevToolsPath.UrlString);
         const node = await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForTraceEvent(
             event, target, new Components.Linkifier.Linkifier());
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
        'version': 3,
        'names': ['unminified', 'par1', 'par2', 'console', 'log'],
        'sources': [
          '/original-script.ts',
        ],
        'file': '/test.js',
        'sourcesContent': ['function unminified(par1, par2) {\n  console.log(par1, par2);\n}\n'],
        'mappings': 'AAAA,SAASA,EAAWC,EAAMC,GACxBC,QAAQC,IAAIH,EAAMC',
      });
      setupPageResourceLoaderForSourceMap(sourceMapContent);
      target.setInspectedURL('https://google.com' as Platform.DevToolsPath.UrlString);
      const scriptUrl = 'https://google.com/script.js' as Platform.DevToolsPath.UrlString;
      const sourceMapUrl = 'script.js.map' as Platform.DevToolsPath.UrlString;
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.isNotNull(debuggerModel);
      if (debuggerModel === null) {
        return;
      }
      const sourceMapManager = debuggerModel.sourceMapManager();
      const script = debuggerModel.parsedScriptSource(
          SCRIPT_ID_STRING, scriptUrl, 0, 0, 0, 0, 0, '', undefined, false, sourceMapUrl, true, false, length, false,
          null, null, null, null, null);
      await sourceMapManager.sourceMapForClientPromise(script);
    });
    it('maps to the authored script when a call frame is provided', async function() {
      const linkifier = new Components.Linkifier.Linkifier();
      const node = Timeline.TimelineUIUtils.TimelineUIUtils.linkifyLocation({
        scriptId: SCRIPT_ID_STRING,
        url: 'https://google.com/test.js',
        lineNumber: 0,
        columnNumber: 0,
        isFreshRecording: true,
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
    it('maps to the authored name and script of a profile call', async function() {
      const {script} = await loadBasicSourceMapExample(target);
      // Ideally we would get a column number we can use from the source
      // map however the current status of the source map helpers makes
      // it difficult to do so.
      const columnNumber = 51;
      const profileCall = makeProfileCall(
          'function', 10, 100, TraceEngine.Types.TraceEvents.ProcessID(1), TraceEngine.Types.TraceEvents.ThreadID(1));

      profileCall.callFrame = {
        'columnNumber': columnNumber,
        'functionName': 'minified',
        'lineNumber': 0,
        'scriptId': script.scriptId,
        'url': 'file://gen.js',
      };
      const workersData: TraceEngine.Handlers.ModelHandlers.Workers.WorkersData = {
        workerSessionIdEvents: [],
        workerIdByThread: new Map(),
        workerURLById: new Map(),
      };
      // This only includes data used in the SourceMapsResolver
      const traceParsedData = {
        Samples: makeMockSamplesHandlerData([profileCall]),
        Workers: workersData,
      } as TraceEngine.Handlers.Types.TraceParseData;

      const resolver = new Timeline.SourceMapsResolver.SourceMapsResolver(traceParsedData);
      await resolver.install();

      const linkifier = new Components.Linkifier.Linkifier();
      const node = await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForTraceEvent(
          profileCall, target, linkifier, true);
      if (!node) {
        throw new Error('Node was unexpectedly null');
      }
      assert.isTrue(node.textContent?.startsWith('someFunction @'));
    });
  });
  describe('adjusting timestamps for events and navigations', function() {
    it('adjusts the time for a DCL event after a navigation', async function() {
      const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

      const mainFrameID = traceParsedData.Meta.mainFrameId;

      const dclEvent = traceParsedData.PageLoadMetrics.allMarkerEvents.find(event => {
        return TraceEngine.Types.TraceEvents.isTraceEventMarkDOMContent(event) &&
            event.args.data?.frame === mainFrameID;
      });
      if (!dclEvent) {
        throw new Error('Could not find DCL event');
      }

      const traceMinBound = traceParsedData.Meta.traceBounds.min;

      // Round the time to 2DP to avoid needlessly long expectation numbers!
      const unadjustedStartTimeMilliseconds =
          TraceEngine.Helpers.Timing
              .microSecondsToMilliseconds(
                  TraceEngine.Types.Timing.MicroSeconds(dclEvent.ts - traceMinBound),
                  )
              .toFixed(2);
      assert.strictEqual(unadjustedStartTimeMilliseconds, String(190.79));

      const adjustedTime =
          Timeline.TimelineUIUtils.timeStampForEventAdjustedForClosestNavigationIfPossible(dclEvent, traceParsedData);
      assert.strictEqual(adjustedTime.toFixed(2), String(178.92));
    });

    it('can adjust the times for events that are not PageLoad markers', async function() {
      const traceParsedData = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      // Use a performance.mark event. Exact event is unimportant except that
      // it should not be a Page Load event as those are covered by the tests
      // above.
      const userMark = traceParsedData.UserTimings.performanceMarks.find(event => event.name === 'mark1');
      if (!userMark) {
        throw new Error('Could not find user mark');
      }

      const adjustedMarkTime =
          Timeline.TimelineUIUtils.timeStampForEventAdjustedForClosestNavigationIfPossible(userMark, traceParsedData);
      assert.strictEqual(adjustedMarkTime.toFixed(2), String(79.88));
    });
  });

  function getRowDataForDetailsElement(details: DocumentFragment) {
    return Array.from(details.querySelectorAll<HTMLDivElement>('.timeline-details-view-row')).map(row => {
      const title = row.querySelector<HTMLDivElement>('.timeline-details-view-row-title')?.innerText;
      const value = row.querySelector<HTMLDivElement>('.timeline-details-view-row-value')?.innerText;
      return {title, value};
    });
  }

  function getPieChartDataForDetailsElement(details: DocumentFragment) {
    const pieChartComp = details.querySelector<HTMLDivElement>('devtools-perf-piechart');
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
    });

    after(() => {
      const styleElementToRemove = document.documentElement.querySelector('#fake-perf-panel-colors');
      if (styleElementToRemove) {
        document.documentElement.removeChild(styleElementToRemove);
      }
    });

    it('should return the correct rgb value for a corresponding CSS variable', function() {
      const parsedColor = Timeline.TimelineUIUtils.TimelineUIUtils.categories().scripting.getComputedColorValue();
      assert.strictEqual('rgb(2 2 2)', parsedColor);
    });

    it('should return the color as a CSS variable', function() {
      const cssVariable = Timeline.TimelineUIUtils.TimelineUIUtils.categories().scripting.getCSSValue();
      assert.strictEqual('var(--app-color-scripting)', cssVariable);
    });

    it('treats the v8.parseOnBackgroundWaiting as scripting even though it would usually be idle', function() {
      const event = new TraceEngine.Legacy.ConstructedEvent(
          'v8,devtools.timeline,disabled-by-default-v8.compile',
          TimelineModel.TimelineModel.RecordType.StreamingCompileScriptWaiting,
          TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);

      assert.strictEqual('rgb(2 2 2)', Timeline.TimelineUIUtils.TimelineUIUtils.eventColor(event));
    });

    it('assigns the correct color to the swatch of an event\'s title', async function() {
      const data = await TraceLoader.allModels(this, 'lcp-web-font.json.gz');
      const events = data.traceParsedData.Renderer.allTraceEntries;
      const task = events.find(event => {
        return event.name.includes('RunTask');
      });
      if (!task) {
        throw new Error('Could not find expected event.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          task,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          false,
      );
      const titleSwatch: HTMLElement|null = details.querySelector('.timeline-details-chip-title div');
      assert.strictEqual(titleSwatch?.style.backgroundColor, 'rgb(10, 10, 10)');
    });
    it('assigns the correct color to the swatch of a network request title', async function() {
      const data = await TraceLoader.allModels(this, 'lcp-web-font.json.gz');
      const networkRequests = data.traceParsedData.NetworkRequests.byTime;
      const cssRequest = networkRequests.find(request => {
        return request.args.data.url === 'http://localhost:3000/app.css';
      });
      if (!cssRequest) {
        throw new Error('Could not find expected network request.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildSyntheticNetworkRequestDetails(
          cssRequest,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
      );
      const titleSwatch: HTMLElement|null = details.querySelector('.timeline-details-chip-title div');
      assert.strictEqual(titleSwatch?.style.backgroundColor, 'rgb(4, 4, 4)');
    });
  });

  describe('testContentMatching', () => {
    it('matches call frame events based on a regular expression and the contents of the event', async function() {
      const data = await TraceLoader.allModels(this, 'react-hello-world.json.gz');
      // Find an event from the trace that represents some work that React did. This
      // event is not chosen for any particular reason other than it was the example
      // used in the bug report: crbug.com/1484504
      const mainThread = getMainThread(data.traceParsedData.Renderer);
      const performConcurrentWorkEvent = mainThread.entries.find(entry => {
        if (TraceEngine.Types.TraceEvents.isProfileCall(entry)) {
          return entry.callFrame.functionName === 'performConcurrentWorkOnRoot';
        }
        return false;
      });
      if (!performConcurrentWorkEvent) {
        throw new Error('Could not find expected event');
      }
      assert.isTrue(Timeline.TimelineUIUtils.TimelineUIUtils.testContentMatching(
          performConcurrentWorkEvent, /perfo/, data.traceParsedData));
    });
  });

  describe('traceEventDetails', function() {
    it('shows the interaction ID and INP breakdown metrics for a given interaction', async function() {
      const data = await TraceLoader.allModels(this, 'one-second-interaction.json.gz');
      const interactionEvent = data.traceParsedData.UserInteractions.interactionEventsWithNoNesting.find(entry => {
        return entry.dur === 979974 && entry.type === 'click';
      });
      if (!interactionEvent) {
        throw new Error('Could not find expected event');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          interactionEvent,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          false,
          data.traceParsedData,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {
          title: 'Warning',
          value: 'Long interaction is indicating poor page responsiveness.',
        },
        {
          title: 'ID',
          value: '4122',
        },
        {
          title: 'Input delay',
          value: '1ms',
        },
        {
          title: 'Processing time',
          value: '977ms',
        },
        {
          title: 'Presentation delay',
          value: '1.974ms',
        },
      ]);
    });

    it('renders all event data for a generic trace', async function() {
      const data = await TraceLoader.allModels(this, 'generic-about-tracing.json.gz');
      const event = data.traceParsedData.Renderer.allTraceEntries.find(entry => {
        return entry.name === 'ThreadControllerImpl::RunTask';
      });
      if (!event) {
        throw new Error('Could not find event.');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          event,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          false,
          data.traceParsedData,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {
          title: 'chrome_task_annotator',
          value: '{"delay_policy":"PRECISE","task_delay_us":7159}',
        },
        {
          title: 'src_file',
          value: '"cc/scheduler/scheduler.cc"',
        },
        {
          title: 'src_func',
          value: '"ScheduleBeginImplFrameDeadline"',
        },
      ]);
    });

    it('renders invalidations correctly', async function() {
      const data = await TraceLoader.allModels(this, 'style-invalidation-change-attribute.json.gz');

      // Set up a fake DOM so that we can request nodes by backend Ids (even
      // though we return none, we need to mock these calls else the frontend
      // will not work.)
      const documentNode = {nodeId: 1 as Protocol.DOM.BackendNodeId};
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => {
        return {
          nodeIds: [],
        };
      });

      const updateLayoutTreeEvent = data.traceParsedData.Renderer.allTraceEntries.find(event => {
        return TraceEngine.Types.TraceEvents.isTraceEventUpdateLayoutTree(event) &&
            event.args.beginData?.stackTrace?.[0].functionName === 'testFuncs.changeAttributeAndDisplay';
      });
      if (!updateLayoutTreeEvent) {
        throw new Error('Could not find update layout tree event');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          updateLayoutTreeEvent,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          false,
          data.traceParsedData,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {
          title: 'Elements Affected',
          value: '3',
        },
        {
          // The "Recalculation forced" Stack trace output would be here but the detailRow helper is
          // unable to parse it, hence why this returns undefined.
          title: undefined,
          value: undefined,
        },
        {
          title: 'Initiated by',
          value: 'Schedule Style Recalculation',
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

    it('renders details for a v8.compile ("Compile Script") event', async function() {
      const data = await TraceLoader.allModels(this, 'user-timings.json.gz');
      const compileEvent =
          data.traceParsedData.Renderer.allTraceEntries.find(TraceEngine.Types.TraceEvents.isTraceEventV8Compile);
      if (!compileEvent) {
        throw new Error('Could not find expected event');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          compileEvent,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          false,
          data.traceParsedData,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(rowData, [
        {
          title: 'Script',
          // URL plus line/col number
          value: 'chrome-extension://blijaeebfebmkmekmdnehcmmcjnblkeo/lib/utils.js:1:1',
        },
        {
          title: 'Streamed',
          value: 'false: inline script',
        },
        {title: 'Compilation cache status', value: 'script not eligible'},
      ]);
    });

    it('renders the details for a layout shift properly', async function() {
      // Set related CDP methods responses to return our mock document and node.
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assertNotNullOrUndefined(domModel);
      const documentNode = {nodeId: 1 as Protocol.DOM.NodeId};
      const docc = new SDK.DOMModel.DOMNode(domModel) as SDK.DOMModel.DOMDocument;
      const domNode2 = new SDK.DOMModel.DOMNode(domModel);
      const domID = 58 as Protocol.DOM.NodeId;
      domNode2.id = domID;

      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domID]}));

      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));
      await domModel.requestDocument();
      domModel.registerNode(domNode2);
      domNode2.init(docc, false, {nodeName: 'A test node name', nodeId: domID} as Protocol.DOM.Node);
      const data = await TraceLoader.allModels(this, 'cls-single-frame.json.gz');
      const layoutShift = data.traceParsedData.LayoutShifts.clusters[0].events[0];
      Common.Linkifier.registerLinkifier({
        contextTypes() {
          return [Timeline.CLSLinkifier.CLSRect];
        },
        async loadLinkifier() {
          return Timeline.CLSLinkifier.Linkifier.instance();
        },
      });
      Common.Linkifier.registerLinkifier({
        contextTypes() {
          return [
            SDK.DOMModel.DOMNode,
          ];
        },
        async loadLinkifier() {
          return Elements.DOMLinkifier.Linkifier.instance();
        },
      });

      if (!layoutShift) {
        throw new Error('Could not find LayoutShift event.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          layoutShift,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          false,
          data.traceParsedData,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(
          rowData,
          [
            {
              title: 'Warning',
              value: 'Cumulative Layout Shifts can result in poor user experiences. It has recently evolved.',
            },
            {title: 'Score', value: '0.04218'},
            {title: 'Cumulative Score', value: '0.04218'},
            {title: 'Current Cluster ID', value: '1'},
            {title: 'Current Cluster Score', value: '0.2952'},
            {title: 'Had recent input', value: 'No'},
            {title: 'Moved from', value: 'Location: [120,670], Size: [900x900]'},
            {title: 'Moved to', value: 'Location: [120,1270], Size: [900x478]'},
            // The related node link value is under shadow root so it
            // can't be accessed at this point.
            {title: 'Related Node', value: ''},
          ],
      );
      // Test the related node link.
      const relatedNodeRow =
          details.querySelector('.timeline-details-view-row:nth-of-type(9) .timeline-details-view-row-value span')
              ?.shadowRoot;
      relatedNodeRow?.querySelector<HTMLButtonElement>('button')?.innerText;
      assert.strictEqual(relatedNodeRow?.querySelector<HTMLButtonElement>('button')?.innerText, 'A test node name');
    });

    it('renders the details for a profile call properly', async function() {
      Common.Linkifier.registerLinkifier({
        contextTypes() {
          return [Timeline.CLSLinkifier.CLSRect];
        },
        async loadLinkifier() {
          return Timeline.CLSLinkifier.Linkifier.instance();
        },
      });

      const data = await TraceLoader.allModels(this, 'simple-js-program.json.gz');
      const rendererHandler = data.traceParsedData.Renderer;
      if (!rendererHandler) {
        throw new Error('RendererHandler is undefined');
      }
      const [process] = rendererHandler.processes.values();
      const [thread] = process.threads.values();
      const profileCalls = thread.entries.filter(entry => TraceEngine.Types.TraceEvents.isProfileCall(entry));

      if (!profileCalls) {
        throw new Error('Could not find renderer events');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          profileCalls[0],
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          false,
          data.traceParsedData,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(
          rowData,
          [
            {
              title: 'Function',
              value: '(anonymous) @ www.google.com:21:17',
            },
          ],
      );
    });

    it('renders the warning for a trace event in its details', async function() {
      const data = await TraceLoader.allModels(this, 'simple-js-program.json.gz');

      const events = data.traceParsedData.Renderer?.allTraceEntries;
      if (!events) {
        throw new Error('Could not find renderer events');
      }

      const longTask = events.find(e => (e.dur || 0) > 1_000_000);
      if (!longTask) {
        throw new Error('Could not find Long Task event.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          longTask,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          false,
          data.traceParsedData,
      );
      const rowData = getRowDataForDetailsElement(details);
      assert.deepEqual(
          rowData,
          [
            {
              title: 'Warning',
              value: 'Long task took 1.30\u00A0s.',
            },
          ],
      );
    });

    it('shows information for the WebSocketCreate initiator when viewing a WebSocketSendHandshakeRequest event',
       async function() {
         const data = await TraceLoader.allModels(this, 'web-sockets.json.gz');
         const events = data.traceParsedData.Renderer?.allTraceEntries;
         if (!events) {
           throw new Error('Could not find renderer events');
         }

         const sendHandshake = events.find(TraceEngine.Types.TraceEvents.isTraceEventWebSocketSendHandshakeRequest);
         if (!sendHandshake) {
           throw new Error('Could not find handshake event.');
         }

         const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
             sendHandshake,
             data.timelineModel,
             new Components.Linkifier.Linkifier(),
             false,
             data.traceParsedData,
         );
         const rowData = getRowDataForDetailsElement(details);
         const expectedRowData = [
           {title: 'URL', value: 'wss://socketsbay.com/wss/v2/1/demo/'},
           {
             // The 'First Invalidated' Stack trace output would be here but the detailRow helper is
             // unable to parse it, hence why this returns undefined.
             title: undefined,
             value: undefined,
           },
           {title: 'Initiated by', 'value': 'Create WebSocket'},
           {title: 'Pending for', value: '72.0 ms'},
         ];
         assert.deepEqual(
             rowData,
             expectedRowData,
         );
       });

    it('shows information for the events initiated by WebSocketCreate when viewing a WebSocketCreate event',
       async function() {
         const data = await TraceLoader.allModels(this, 'web-sockets.json.gz');
         const events = data.traceParsedData.Renderer?.allTraceEntries;
         if (!events) {
           throw new Error('Could not find renderer events');
         }

         const sendHandshake = events.find(TraceEngine.Types.TraceEvents.isTraceEventWebSocketCreate);
         if (!sendHandshake) {
           throw new Error('Could not find handshake event.');
         }

         const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
             sendHandshake,
             data.timelineModel,
             new Components.Linkifier.Linkifier(),
             false,
             data.traceParsedData,
         );
         const rowData = getRowDataForDetailsElement(details);
         const expectedRowData = [
           {title: 'URL', value: 'wss://socketsbay.com/wss/v2/1/demo/'},
           // This value looks odd, but it is because the initiator stack trace cannot be
           // easily represented as a string, so this is OK.
           {title: undefined, value: undefined},
           // The 2 entries under "Initiator for" are displayed as seperate links and in the UI it is obvious they are seperate
           {title: 'Initiator for', 'value': 'Send WebSocket Handshake Receive WebSocket Handshake'},
         ];
         assert.deepEqual(
             rowData,
             expectedRowData,
         );
       });

    it('shows the aggregated time information for an event', async function() {
      const data = await TraceLoader.allModels(this, 'web-dev.json.gz');
      const event =
          data.traceParsedData.Renderer?.allTraceEntries.find(e => e.ts === 1020034919877 && e.name === 'RunTask');
      if (!event) {
        throw new Error('Could not find renderer events');
      }
      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildTraceEventDetails(
          event,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
          true,
          data.traceParsedData,
      );
      const pieChartData = getPieChartDataForDetailsElement(details);

      const expectedPieChartData = [
        {title: 'System (self)', value: '2\u00A0ms'},
        {title: 'System (children)', value: '2\u00A0ms'},
        {title: 'Rendering', value: '28\u00A0ms'},
        {title: 'Painting', value: '2\u00A0ms'},
        {title: 'Total', value: '34\u00A0ms'},
      ];
      assert.deepEqual(
          pieChartData,
          expectedPieChartData,
      );
    });
  });

  it('can generate details for a frame', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const frame = traceParsedData.Frames.frames.at(0);
    if (!frame) {
      throw new Error('Could not find expected frame');
    }
    const filmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData);
    const details =
        Timeline.TimelineUIUtils.TimelineUIUtils.generateDetailsContentForFrame(frame, filmStrip, filmStrip.frames[0]);
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    container.appendChild(details);
    // Give the image element time to render and load.
    await doubleRaf();
    const img = container.querySelector<HTMLImageElement>('.timeline-filmstrip-preview img');
    assert.isTrue(img?.currentSrc.includes(filmStrip.frames[0].screenshotEvent.args.dataUri));

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

  describe('buildNetworkRequestDetails', function() {
    it('renders the right details for a network event from TraceEngine', async function() {
      const data = await TraceLoader.allModels(this, 'lcp-web-font.json.gz');
      const networkRequests = data.traceParsedData.NetworkRequests.byTime;
      const cssRequest = networkRequests.find(request => {
        return request.args.data.url === 'http://localhost:3000/app.css';
      });
      if (!cssRequest) {
        throw new Error('Could not find expected network request.');
      }

      const details = await Timeline.TimelineUIUtils.TimelineUIUtils.buildSyntheticNetworkRequestDetails(
          cssRequest,
          data.timelineModel,
          new Components.Linkifier.Linkifier(),
      );

      const rowData = getRowDataForDetailsElement(details);

      assert.deepEqual(
          rowData,
          [
            {title: 'URL', value: 'localhost:3000/app.css'},
            {title: 'Duration', value: '4.075ms (3.08ms network transfer + 995μs resource loading)'},
            {title: 'Request Method', value: 'GET'},
            {title: 'Initial Priority', value: 'Highest'},
            {title: 'Priority', value: 'Highest'},
            {title: 'Mime Type', value: 'text/css'},
            {title: 'Encoded Data', value: '402 B'},
            {title: 'Decoded Body', value: '96 B'},
          ],
      );
    });
  });

  describe('eventTitle', function() {
    it('renders the correct title for an EventTiming interaction event', async function() {
      const data = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const interactionEvent = data.traceParsedData.UserInteractions.interactionEventsWithNoNesting[0];
      const details = Timeline.TimelineUIUtils.TimelineUIUtils.eventTitle(interactionEvent);
      assert.deepEqual(details, 'Pointer');
    });

    it('will use the resolved function name for a profile node that has a sourcemap', async function() {
      // Timeline.SourceMapsResolver.SourceMapsResolver.
      const traceParsedData = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');

      const mainThread = getMainThread(traceParsedData.Renderer);
      const profileEntry = mainThread.entries.find(entry => {
        return TraceEngine.Types.TraceEvents.isProfileCall(entry);
      });
      if (!profileEntry || !TraceEngine.Types.TraceEvents.isProfileCall(profileEntry)) {
        throw new Error('Could not find a profile entry');
      }

      // Fake that we resolved the entry's name from a sourcemap.
      Timeline.SourceMapsResolver.SourceMapsResolver.storeResolvedNodeNameForEntry(
          profileEntry.pid, profileEntry.tid, profileEntry.nodeId, 'resolved-function-test');

      const title = Timeline.TimelineUIUtils.TimelineUIUtils.eventTitle(profileEntry);
      assert.strictEqual(title, 'resolved-function-test');
    });
  });

  describe('eventStyle', function() {
    it('returns the correct style for profile calls', async function() {
      const data = await TraceLoader.allModels(this, 'simple-js-program.json.gz');
      const rendererHandler = data.traceParsedData.Renderer;
      if (!rendererHandler) {
        throw new Error('RendererHandler is undefined');
      }
      const [process] = rendererHandler.processes.values();
      const [thread] = process.threads.values();
      const profileCalls = thread.entries.filter(entry => TraceEngine.Types.TraceEvents.isProfileCall(entry));
      const style = Timeline.TimelineUIUtils.TimelineUIUtils.eventStyle(profileCalls[0]);
      assert.strictEqual(style.category.name, 'scripting');
      assert.strictEqual(style.category.color, 'rgb(250 204 21 / 100%)');
    });
  });
});
