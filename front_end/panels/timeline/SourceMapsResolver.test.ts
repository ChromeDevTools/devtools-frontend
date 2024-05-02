// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TraceEngine from '../../models/trace/trace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {TestPlugin} from '../../testing/LanguagePluginHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import {loadBasicSourceMapExample} from '../../testing/SourceMapHelpers.js';
import {
  makeMockSamplesHandlerData,
  makeProfileCall,
} from '../../testing/TraceHelpers.js';

import * as Timeline from './timeline.js';

const {assert} = chai;

const MINIFIED_FUNCTION_NAME = 'minified';
const AUTHORED_FUNCTION_NAME = 'someFunction';

describeWithMockConnection('SourceMapsResolver', () => {
  let target: SDK.Target.Target;
  let script: SDK.Script.Script;
  let traceParsedData: TraceEngine.Handlers.Types.TraceParseData;
  let profileCall: TraceEngine.Types.TraceEvents.SyntheticProfileCall;
  beforeEach(async function() {
    target = createTarget();
    script = (await loadBasicSourceMapExample(target)).script;
    // Ideally we would get a column number we can use from the source
    // map however the current status of the source map helpers makes
    // it difficult to do so.
    const columnNumber = 51;
    profileCall = makeProfileCall(
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
    traceParsedData = {
      Samples: makeMockSamplesHandlerData([profileCall]),
      Workers: workersData,
    } as TraceEngine.Handlers.Types.TraceParseData;
  });

  it('renames nodes from the profile models when the corresponding scripts and source maps have loaded',
     async function() {
       const resolver = new Timeline.SourceMapsResolver.SourceMapsResolver(traceParsedData);

       // Test the node's name is minified before the script and source maps load.
       assert.strictEqual(
           TraceEngine.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(traceParsedData.Samples, profileCall),
           MINIFIED_FUNCTION_NAME);

       await resolver.install();

       // Now that the script and source map have loaded, test that the model has been automatically
       // reparsed to resolve function names.
       assert.strictEqual(
           TraceEngine.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(traceParsedData.Samples, profileCall),
           AUTHORED_FUNCTION_NAME);

       // Ensure we populate the cache
       assert.strictEqual(
           Timeline.SourceMapsResolver.SourceMapsResolver.resolvedNodeNameForEntry(profileCall),
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

    const {pluginManager} = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    pluginManager.addPlugin(new Plugin());
    const resolver = new Timeline.SourceMapsResolver.SourceMapsResolver(traceParsedData);
    await resolver.install();
    assert.strictEqual(
        TraceEngine.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(traceParsedData.Samples, profileCall),
        PLUGIN_FUNCTION_NAME);
  });
});
