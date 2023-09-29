// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Console from '../../../../../front_end/panels/console/console.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {createTarget, registerNoopActions} from '../../helpers/EnvironmentHelpers.js';
import {TestPlugin} from '../../helpers/LanguagePluginHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

const {assert} = chai;

const SCRIPT_ID = '25';
const NODE_ID = 16;

const MINIFIED_FUNCTION_NAME = 'minified';
const AUTHORED_FUNCTION_NAME = 'authored';

const profile = {
  'startTime': 151790328951,
  'endTime': 151791690743,
  'nodes': [
    {'callFrame': {'codeType': 'other', 'functionName': '(root)', 'scriptId': 0}, 'id': 1},
    {'callFrame': {'codeType': 'other', 'functionName': '(program)', 'scriptId': 0}, 'id': 2, 'parent': 1},
    {'callFrame': {'codeType': 'other', 'functionName': '(idle)', 'scriptId': 0}, 'id': 8, 'parent': 1},
    {
      'callFrame': {
        'codeType': 'JS',
        'columnNumber': 0,
        'functionName': '',
        'lineNumber': 0,
        'scriptId': SCRIPT_ID,
        'url': 'file://gen.js',
      },
      'id': 9,
      'parent': 1,
    },
    {
      'callFrame': {
        'codeType': 'JS',
        'columnNumber': 51,
        'functionName': MINIFIED_FUNCTION_NAME,
        'lineNumber': 0,
        'scriptId': SCRIPT_ID,
        'url': 'file://gen.js',
      },
      'id': NODE_ID,
      'parent': 9,
    },
    {'callFrame': {'codeType': 'JS', 'functionName': 'now', 'scriptId': 0}, 'id': 11, 'parent': NODE_ID},
    {'callFrame': {'codeType': 'other', 'functionName': '(garbage collector)', 'scriptId': 0}, 'id': 12, 'parent': 1},
  ],
  'samples': [2, 2, NODE_ID, NODE_ID, 2],
  'timeDeltas': [2, 2, 2, 2, 2],

};
const SCRIPT_URL = 'file://main.js';

// Generated with:
// `terser main.js --mangle --toplevel  --output gen.js  --source-map url='gen.js.map'` v5.15.0
const SCRIPT_SOURCE =
    'function n(){o("hi");console.log("done")}function o(n){const o=performance.now();while(performance.now()-o<n);}n();o(200);\n//# sourceMappingURL=gen.js.map';

const SOURCE_MAP = {
  version: 3,
  names: ['sayHi', AUTHORED_FUNCTION_NAME, 'console', 'log', 'breakDuration', 'started', 'performance', 'now'],
  sources: ['main.js'],
  mappings:
      'AAAA,SAASA,IACLC,EAAW,MACXC,QAAQC,IAAI,OAChB,CAEA,SAASF,EAAWG,GAChB,MAAMC,EAAUC,YAAYC,MAC5B,MAAQD,YAAYC,MAAQF,EAAWD,GAC3C,CAEAJ,IACAC,EAAW',
};

const SOURCE_MAP_URL = 'file://gen.js.map';

describeWithMockConnection('Name resolving in the Performance panel', () => {
  let performanceModel: Timeline.PerformanceModel.PerformanceModel;
  let tracingModel: TraceEngine.Legacy.TracingModel;
  let target: SDK.Target.Target;
  beforeEach(async function() {
    registerNoopActions(['console.clear', 'console.create-pin']);
    target = createTarget();
    performanceModel = new Timeline.PerformanceModel.PerformanceModel();
    const traceEvents = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(
        profile, 1, false, 'mock-name');
    tracingModel = new TraceEngine.Legacy.TracingModel();
    tracingModel.addEvents(traceEvents);
    await performanceModel.setTracingModel(tracingModel);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({
      forceNew: true,
      debuggerWorkspaceBinding,
    });
    SDK.PageResourceLoader.PageResourceLoader.instance({
      forceNew: true,
      loadOverride: async (_: string) => ({
        success: true,
        content: JSON.stringify(SOURCE_MAP),
        errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
      }),
      maxConcurrentLoads: 1,
    });
    setMockConnectionResponseHandler('Debugger.getScriptSource', getScriptSourceHandler);

    function getScriptSourceHandler(_: Protocol.Debugger.GetScriptSourceRequest):
        Omit<Protocol.Debugger.GetScriptSourceResponse, 'getError'> {
      return {scriptSource: SCRIPT_SOURCE};
    }
  });

  afterEach(async function() {
    await Console.ConsoleView.ConsoleView.instance().getScheduledRefreshPromiseForTest();
  });

  it('renames nodes from the profile models when the corresponding scripts and source maps have loaded',
     async function() {
       const cpuProfiles = performanceModel.timelineModel().cpuProfiles();
       assert.strictEqual(cpuProfiles.length, 1);

       const nodes = cpuProfiles[0].cpuProfileData.nodes();
       assert.strictEqual(nodes?.length, profile.nodes.length);

       const sourceMapAttachedPromise = new Promise<void>(
           resolve =>
               performanceModel.addEventListener(Timeline.PerformanceModel.Events.NamesResolved, () => resolve()));

       const bottomModelNode = nodes?.find(n => n.id === NODE_ID);

       // Test the node's name is minified before the script and source maps load.
       assert.strictEqual(bottomModelNode?.functionName, MINIFIED_FUNCTION_NAME);

       // Load the script and source map into the frontend.
       dispatchEvent(target, 'Debugger.scriptParsed', {
         scriptId: SCRIPT_ID,
         url: SCRIPT_URL,
         startLine: 0,
         startColumn: 0,
         endLine: (SCRIPT_SOURCE.match(/^/gm)?.length ?? 1) - 1,
         endColumn: SCRIPT_SOURCE.length - SCRIPT_SOURCE.lastIndexOf('\n') - 1,
         executionContextId: 1,
         hash: '',
         hasSourceURL: false,
         sourceMapURL: SOURCE_MAP_URL,
       });

       await sourceMapAttachedPromise;

       // Now that the script and source map have loaded, test that the model has been automatically
       // reparsed to resolve function names.
       assert.strictEqual(bottomModelNode?.functionName, AUTHORED_FUNCTION_NAME);
     });

  it('resolves function names using a plugin when available', async () => {
    const PLUGIN_FUNCTION_NAME = 'PLUGIN_FUNCTION_NAME';
    class Plugin extends TestPlugin {
      constructor() {
        super('InstrumentationBreakpoints');
      }

      override getFunctionInfo(_rawLocation: Chrome.DevTools.RawLocation):
          Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles?: string[]|undefined}> {
        return Promise.resolve({frames: [{name: PLUGIN_FUNCTION_NAME}]});
      }
      override handleScript(_: SDK.Script.Script) {
        return true;
      }
    }

    const cpuProfiles = performanceModel.timelineModel().cpuProfiles();
    const nodes = cpuProfiles[0].cpuProfileData.nodes();

    Root.Runtime.experiments.setEnabled('wasmDWARFDebugging', true);
    const pluginManager =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().initPluginManagerForTest();
    assertNotNullOrUndefined(pluginManager);
    pluginManager.addPlugin(new Plugin());

    const namesResolvedPromise = new Promise<void>(
        resolve => performanceModel.addEventListener(Timeline.PerformanceModel.Events.NamesResolved, () => resolve()));

    const bottomModelNode = nodes?.find(n => n.id === NODE_ID);

    // Load the script into the frontend.
    dispatchEvent(target, 'Debugger.scriptParsed', {
      scriptId: SCRIPT_ID,
      url: SCRIPT_URL,
      startLine: 0,
      startColumn: 0,
      endLine: (SCRIPT_SOURCE.match(/^/gm)?.length ?? 1) - 1,
      endColumn: SCRIPT_SOURCE.length - SCRIPT_SOURCE.lastIndexOf('\n') - 1,
      executionContextId: 1,
      hash: '',
      hasSourceURL: false,
      sourceMapURL: SOURCE_MAP_URL,
    });
    await namesResolvedPromise;

    assert.strictEqual(bottomModelNode?.functionName, PLUGIN_FUNCTION_NAME);
  });
});
