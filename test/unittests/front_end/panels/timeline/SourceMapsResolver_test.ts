// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {TestPlugin} from '../../helpers/LanguagePluginHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

const {assert} = chai;

const SCRIPT_ID = '25';
const NODE_ID = 16 as TraceEngine.Types.TraceEvents.CallFrameID;

const MINIFIED_FUNCTION_NAME = 'minified';
const AUTHORED_FUNCTION_NAME = 'authored';

const profileEvent: TraceEngine.Types.TraceEvents.TraceEventProfile = {
  name: 'Profile',
  id: '1234' as TraceEngine.Types.TraceEvents.ProfileID,
  args: {
    data: {
      startTime: 151790328951 as TraceEngine.Types.Timing.MicroSeconds,
    },
  },
  ph: TraceEngine.Types.TraceEvents.Phase.SAMPLE,
  cat: 'disabled-by-default-v8.cpu_profiler',
  pid: 102 as TraceEngine.Types.TraceEvents.ProcessID,
  tid: 259 as TraceEngine.Types.TraceEvents.ThreadID,
  ts: 410166906542 as TraceEngine.Types.Timing.MicroSeconds,
};

const profileChunk: TraceEngine.Types.TraceEvents.TraceEventProfileChunk = {
  name: 'ProfileChunk',
  id: '1234' as TraceEngine.Types.TraceEvents.ProfileID,
  cat: 'disabled-by-default-v8.cpu_profiler',
  ph: TraceEngine.Types.TraceEvents.Phase.SAMPLE,
  pid: 102 as TraceEngine.Types.TraceEvents.ProcessID,
  tid: 259 as TraceEngine.Types.TraceEvents.ThreadID,
  ts: 410166906542 as TraceEngine.Types.Timing.MicroSeconds,
  args: {
    data: {
      timeDeltas: [
        2 as TraceEngine.Types.Timing.MicroSeconds,
        2 as TraceEngine.Types.Timing.MicroSeconds,
        2 as TraceEngine.Types.Timing.MicroSeconds,
        2 as TraceEngine.Types.Timing.MicroSeconds,
        2 as TraceEngine.Types.Timing.MicroSeconds,
      ],
      cpuProfile: {
        'nodes': [
          {
            'callFrame': {'codeType': 'other', 'functionName': '(root)', 'scriptId': 0},
            'id': 1 as TraceEngine.Types.TraceEvents.CallFrameID,
          },
          {
            'callFrame': {'codeType': 'other', 'functionName': '(program)', 'scriptId': 0},
            'id': 2 as TraceEngine.Types.TraceEvents.CallFrameID,
            'parent': 1 as TraceEngine.Types.TraceEvents.CallFrameID,
          },
          {
            'callFrame': {'codeType': 'other', 'functionName': '(idle)', 'scriptId': 0},
            'id': 8 as TraceEngine.Types.TraceEvents.CallFrameID,
            'parent': 1 as TraceEngine.Types.TraceEvents.CallFrameID,
          },
          {
            'callFrame': {
              'codeType': 'JS',
              'columnNumber': 0,
              'functionName': '',
              'lineNumber': 0,
              'scriptId': parseInt(SCRIPT_ID, 10),
              'url': 'file://gen.js',
            },
            'id': 9 as TraceEngine.Types.TraceEvents.CallFrameID,
            'parent': 1 as TraceEngine.Types.TraceEvents.CallFrameID,
          },
          {
            'callFrame': {
              'codeType': 'JS',
              'columnNumber': 51,
              'functionName': MINIFIED_FUNCTION_NAME,
              'lineNumber': 0,
              'scriptId': parseInt(SCRIPT_ID, 10),
              'url': 'file://gen.js',
            },
            'id': NODE_ID,
            'parent': 9 as TraceEngine.Types.TraceEvents.CallFrameID,
          },
          {
            'callFrame': {'codeType': 'JS', 'functionName': 'now', 'scriptId': 0},
            'id': 11 as TraceEngine.Types.TraceEvents.CallFrameID,
            'parent': NODE_ID,
          },
          {
            'callFrame': {'codeType': 'other', 'functionName': '(garbage collector)', 'scriptId': 0},
            'id': 12 as TraceEngine.Types.TraceEvents.CallFrameID,
            'parent': 1 as TraceEngine.Types.TraceEvents.CallFrameID,
          },
        ],
        'samples': [
          2 as TraceEngine.Types.TraceEvents.CallFrameID,
          2 as TraceEngine.Types.TraceEvents.CallFrameID,
          NODE_ID,
          NODE_ID,
          2 as TraceEngine.Types.TraceEvents.CallFrameID,
        ],
      },
    },
  },
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

describeWithMockConnection('SourceMapsResolver', () => {
  let target: SDK.Target.Target;
  let traceParsedData: TraceEngine.Handlers.Types.TraceParseData;
  beforeEach(async function() {
    target = createTarget();
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();

    const traceEngine = TraceEngine.TraceModel.Model.createWithAllHandlers();
    await traceEngine.parse([profileEvent, profileChunk]);
    const data = traceEngine.traceParsedData();
    if (!data) {
      throw new Error('Could not parse data in new trace engine.');
    }
    traceParsedData = data;

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

  it('renames nodes from the profile models when the corresponding scripts and source maps have loaded',
     async function() {
       const cpuProfiles = traceParsedData.Samples.profilesInProcess;
       assert.strictEqual(cpuProfiles.size, 1);

       const profile = Array.from(cpuProfiles.values())[0].get(259 as TraceEngine.Types.TraceEvents.ThreadID);
       if (!profile) {
         throw new Error('Could not find expected profile for ThreadID 259');
       }
       const nodes = profile.parsedProfile.nodes();
       if (!nodes) {
         throw new Error('Parsed profile had no nodes.');
       }
       assert.strictEqual(nodes.length, profileChunk.args.data?.cpuProfile?.nodes?.length);

       const resolver = new Timeline.SourceMapsResolver.SourceMapsResolver(traceParsedData);
       const namesUpdatedPromise = new Promise<void>(
           resolve =>
               resolver.addEventListener(Timeline.SourceMapsResolver.NodeNamesUpdated.eventName, () => resolve()));

       const bottomModelNode = nodes?.find(n => n.id === NODE_ID);

       // Test the node's name is minified before the script and source maps load.
       assert.strictEqual(bottomModelNode?.functionName, MINIFIED_FUNCTION_NAME);

       await resolver.install();

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

       await namesUpdatedPromise;

       // Now that the script and source map have loaded, test that the model has been automatically
       // reparsed to resolve function names.
       assert.strictEqual(bottomModelNode?.functionName, AUTHORED_FUNCTION_NAME);

       const processsId = Array.from(cpuProfiles.keys())[0];
       const fakeProfileCall = {
         pid: processsId,
         tid: 259 as TraceEngine.Types.TraceEvents.ThreadID,
         nodeId: NODE_ID,
       } as unknown as TraceEngine.Types.TraceEvents.TraceEventSyntheticProfileCall;
       // Ensure we populate the cache
       assert.strictEqual(
           Timeline.SourceMapsResolver.SourceMapsResolver.resolvedNodeNameForEntry(fakeProfileCall),
           AUTHORED_FUNCTION_NAME);
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

    const cpuProfiles = traceParsedData.Samples.profilesInProcess;

    const profile = Array.from(cpuProfiles.values())[0].get(259 as TraceEngine.Types.TraceEvents.ThreadID);
    if (!profile) {
      throw new Error('Could not find expected profile for ThreadID 259');
    }
    const nodes = profile.parsedProfile.nodes();
    if (!nodes) {
      throw new Error('Parsed profile had no nodes.');
    }

    Root.Runtime.experiments.setEnabled('wasmDWARFDebugging', true);
    const pluginManager =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().initPluginManagerForTest();
    assertNotNullOrUndefined(pluginManager);
    pluginManager.addPlugin(new Plugin());

    const resolver = new Timeline.SourceMapsResolver.SourceMapsResolver(traceParsedData);
    const namesUpdatedPromise = new Promise<void>(
        resolve => resolver.addEventListener(Timeline.SourceMapsResolver.NodeNamesUpdated.eventName, () => resolve()));

    const bottomModelNode = nodes.find(n => n.id === NODE_ID);

    await resolver.install();

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
    await namesUpdatedPromise;

    assert.strictEqual(bottomModelNode?.functionName, PLUGIN_FUNCTION_NAME);
  });
});
