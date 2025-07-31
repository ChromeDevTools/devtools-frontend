// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../../extension-api/ExtensionAPI.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {TestPlugin} from '../../../testing/LanguagePluginHelpers.js';
import {
  describeWithMockConnection,
} from '../../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../../testing/MockScopeChain.js';
import {encodeSourceMap} from '../../../testing/SourceMapEncoder.js';
import {loadBasicSourceMapExample} from '../../../testing/SourceMapHelpers.js';
import {
  makeMockRendererHandlerData,
  makeMockSamplesHandlerData,
  makeProfileCall,
} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Utils from './utils.js';

const {urlString} = Platform.DevToolsPath;
const MINIFIED_FUNCTION_NAME = 'minified';
const AUTHORED_FUNCTION_NAME = 'someFunction';

export async function loadCodeLocationResolvingScenario(): Promise<{
  authoredScriptURL: string,
  genScriptURL: string,
  scriptId: Protocol.Runtime.ScriptId,
  ignoreListedURL: string,
  contentScriptURL: string,
  contentScriptId: Protocol.Runtime.ScriptId,
}> {
  const target = createTarget();

  const targetManager = SDK.TargetManager.TargetManager.instance();
  const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
  const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
  const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    resourceMapping,
    targetManager,
    ignoreListManager,
  });

  const backend = new MockProtocolBackend();

  // The following mock data creates a source mapping from two authored
  // scripts to a single complied script. One of the sources
  // (ignored.ts) is marked as ignore listed in the source map.
  const sourceRoot = 'http://example.com';
  const scriptInfo = {
    url: `${sourceRoot}/test.out.js`,
    content: 'function f(x) {\n  console.log(x);\n}\nfunction ignore(y){\n console.log(y);\n}',
  };
  const authoredScriptName = 'test.ts';
  const ignoredScriptName = 'ignored.ts';
  const authoredScriptURL = `${sourceRoot}/${authoredScriptName}`;
  const ignoreListedScriptURL = `${sourceRoot}/${ignoredScriptName}`;
  const sourceMap = encodeSourceMap(
      [
        `0:9 => ${authoredScriptName}:0:1`,
        `1:0 => ${authoredScriptName}:4:0`,
        `1:2 => ${authoredScriptName}:4:2`,
        `2:0 => ${authoredScriptName}:2:0`,
        `3:0 => ${ignoredScriptName}:3:0`,
      ],
      sourceRoot);
  sourceMap.sources = [authoredScriptURL, ignoreListedScriptURL];
  sourceMap.ignoreList = [1];
  const sourceMapInfo = {
    url: `${scriptInfo.url}.map`,
    content: sourceMap,
  };

  // The following mock data creates content script
  const contentScriptInfo = {
    url: `${sourceRoot}/content-script.js`,
    content: 'console.log("content script loaded");',
    isContentScript: true,
  };

  // Load mock data in devtools
  const [, , script, , contentScript] = await Promise.all([
    debuggerWorkspaceBinding.waitForUISourceCodeAdded(urlString`${authoredScriptURL}`, target),
    debuggerWorkspaceBinding.waitForUISourceCodeAdded(urlString`${ignoreListedScriptURL}`, target),
    backend.addScript(target, scriptInfo, sourceMapInfo),
    debuggerWorkspaceBinding.waitForUISourceCodeAdded(urlString`${contentScriptInfo.url}`, target),
    backend.addScript(target, contentScriptInfo, null),
  ]);

  return {
    authoredScriptURL,
    scriptId: script.scriptId,
    genScriptURL: scriptInfo.url,
    ignoreListedURL: ignoreListedScriptURL,
    contentScriptURL: contentScriptInfo.url,
    contentScriptId: contentScript.scriptId,
  };
}

function parsedTraceFromProfileCalls(profileCalls: Trace.Types.Events.SyntheticProfileCall[]):
    Trace.Handlers.Types.ParsedTrace {
  const workersData: Trace.Handlers.ModelHandlers.Workers.WorkersData = {
    workerSessionIdEvents: [],
    workerIdByThread: new Map(),
    workerURLById: new Map(),
  };
  // This only includes data used in the SourceMapsResolver
  return {
    Samples: makeMockSamplesHandlerData(profileCalls),
    Workers: workersData,
    Renderer: makeMockRendererHandlerData(profileCalls),
    NetworkRequests:
        {entityMappings: {entityByEvent: new Map(), eventsByEntity: new Map(), createdEntityCache: new Map()}},
    Meta: {mainFrameURL: 'https://example.com', navigationsByNavigationId: new Map()},
  } as Trace.Handlers.Types.ParsedTrace;
}

describeWithMockConnection('SourceMapsResolver', () => {
  describe('function name resolving', () => {
    let target: SDK.Target.Target;
    let script: SDK.Script.Script;
    let parsedTrace: Trace.Handlers.Types.ParsedTrace;
    let profileCallForNameResolving: Trace.Types.Events.SyntheticProfileCall;
    beforeEach(async function() {
      target = createTarget();
      script = (await loadBasicSourceMapExample(target)).script;

      profileCallForNameResolving =
          makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));

      profileCallForNameResolving.callFrame = {
        columnNumber: 51,
        functionName: 'minified',
        lineNumber: 0,
        scriptId: script.scriptId,
        url: 'file://gen.js',
      };
      parsedTrace = parsedTraceFromProfileCalls([profileCallForNameResolving]);
    });

    it('renames nodes from the profile models when the corresponding scripts and source maps have loaded',
       async function() {
         const resolver = new Utils.SourceMapsResolver.SourceMapsResolver(parsedTrace);

         // Test the node's name is minified before the script and source maps load.
         assert.strictEqual(
             Trace.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(
                 parsedTrace.Samples, profileCallForNameResolving),
             MINIFIED_FUNCTION_NAME);

         await resolver.install();

         // Now that the script and source map have loaded, test that the model has been automatically
         // reparsed to resolve function names.
         assert.strictEqual(
             Trace.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(
                 parsedTrace.Samples, profileCallForNameResolving),
             AUTHORED_FUNCTION_NAME);

         // Ensure we populate the cache
         assert.strictEqual(
             Utils.SourceMapsResolver.SourceMapsResolver.resolvedCodeLocationForEntry(profileCallForNameResolving)
                 ?.name,
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
      const resolver = new Utils.SourceMapsResolver.SourceMapsResolver(parsedTrace);
      await resolver.install();
      assert.strictEqual(
          Trace.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(
              parsedTrace.Samples, profileCallForNameResolving),
          PLUGIN_FUNCTION_NAME);
    });
  });
  describe('code location resolving', () => {
    it('correctly stores url mappings using source maps', async () => {
      const {authoredScriptURL, genScriptURL, scriptId} = await loadCodeLocationResolvingScenario();
      const profileCallWithMappings =
          makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));
      const LINE_NUMBER = 0;
      const COLUMN_NUMBER = 9;
      profileCallWithMappings.callFrame = {
        lineNumber: LINE_NUMBER,
        columnNumber: COLUMN_NUMBER,
        functionName: 'minified',
        scriptId,
        url: genScriptURL,
      };

      const profileCallWithNoMappings =
          makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));
      profileCallWithNoMappings.callFrame = {
        // Purposefully pick a location for which there is no mapping
        // in the source map we just added.
        lineNumber: 0,
        columnNumber: 1,
        functionName: 'minified',
        scriptId,
        url: authoredScriptURL,
      };

      // For a profile call with mappings, it must return the mapped script.
      const traceWithMappings = parsedTraceFromProfileCalls([profileCallWithMappings]);
      const mapperWithMappings = new Utils.EntityMapper.EntityMapper(traceWithMappings);
      let resolver = new Utils.SourceMapsResolver.SourceMapsResolver(traceWithMappings, mapperWithMappings);
      await resolver.install();
      let sourceMappedURL =
          Utils.SourceMapsResolver.SourceMapsResolver.resolvedURLForEntry(traceWithMappings, profileCallWithMappings);
      assert.strictEqual(sourceMappedURL, authoredScriptURL);

      // For a profile call without mappings, it must return the original URL
      const traceWithoutMappings = parsedTraceFromProfileCalls([profileCallWithNoMappings]);
      const mapperWithoutMappings = new Utils.EntityMapper.EntityMapper(traceWithoutMappings);
      resolver = new Utils.SourceMapsResolver.SourceMapsResolver(traceWithoutMappings, mapperWithoutMappings);
      await resolver.install();
      sourceMappedURL = Utils.SourceMapsResolver.SourceMapsResolver.resolvedURLForEntry(
          traceWithoutMappings, profileCallWithNoMappings);
      assert.strictEqual(sourceMappedURL, genScriptURL);
    });
  });
  describe('unnecessary work detection', () => {
    it('does not dispatch a SourceMappingsUpdated event if relevant mappings were not updated', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const listener = sinon.spy();

      const sourceMapsResolver = new Utils.SourceMapsResolver.SourceMapsResolver(parsedTrace);
      sourceMapsResolver.addEventListener(Utils.SourceMapsResolver.SourceMappingsUpdated.eventName, listener);
      await sourceMapsResolver.install();
      sinon.assert.notCalled(listener);
    });
  });
  describe('updating entity mapping', () => {
    it('correctly updates mapping for event that maps to a script', async function() {
      const {scriptId} = await loadCodeLocationResolvingScenario();

      const profileCall =
          makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));
      const LINE_NUMBER = 0;
      const COLUMN_NUMBER = 9;
      profileCall.callFrame = {
        lineNumber: LINE_NUMBER,
        columnNumber: COLUMN_NUMBER,
        functionName: 'minified',
        scriptId,
        url: 'http://example-domain.com/',
      };
      const profileCallUnmapped =
          makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));
      profileCallUnmapped.callFrame = {
        lineNumber: 2,
        columnNumber: 0,
        functionName: '',
        scriptId,
        url: 'http://example-domain.com/',
      };

      const trace = parsedTraceFromProfileCalls([profileCall, profileCallUnmapped]);
      const mapper = new Utils.EntityMapper.EntityMapper(trace);

      const testEntity = {
        name: 'example-domain.com',
        company: 'example-domain.com',
        category: '',
        categories: [],
        domains: ['example-domain.com'],
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        totalOccurrences: 0,
        isUnrecognized: true,
      };
      // Set a fake entity for this event that should get overridden. Initially
      // both traces are mapped together, after the sourcemap that should change
      mapper.mappings().entityByEvent.set(profileCall, testEntity);
      mapper.mappings().entityByEvent.set(profileCallUnmapped, testEntity);
      mapper.mappings().eventsByEntity.set(testEntity, [profileCall, profileCallUnmapped]);
      mapper.mappings().createdEntityCache.set('example-domain.com', testEntity);

      const resolver = new Utils.SourceMapsResolver.SourceMapsResolver(trace, mapper);
      // This should update the entities
      await resolver.install();
      const afterEntityOfEvent = mapper.entityForEvent(profileCall);
      const expected = {
        name: 'example.com',
        company: 'example.com',
        category: '',
        categories: [],
        domains: ['example.com'],
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        totalOccurrences: 0,
        isUnrecognized: true,
      };
      assert.exists(afterEntityOfEvent);
      assert.deepEqual(afterEntityOfEvent, expected);
      // The mapped event should now map to its new entity.
      const gotEventsMapped = mapper.eventsForEntity(afterEntityOfEvent) ?? [];
      assert.deepEqual(gotEventsMapped, [profileCall]);

      // The unmapped event should keep its original entity.
      const gotEventsUnmapped = mapper.eventsForEntity(testEntity) ?? [];
      assert.deepEqual(gotEventsUnmapped, [profileCallUnmapped]);
      const gotUnmappedEntity = mapper.entityForEvent(profileCallUnmapped);
      assert.deepEqual(gotUnmappedEntity, testEntity);
    });
  });
});
