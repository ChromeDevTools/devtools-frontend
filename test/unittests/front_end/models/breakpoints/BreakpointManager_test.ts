// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Breakpoints from '../../../../../front_end/models/breakpoints/breakpoints.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';

import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {TestPlugin} from '../../helpers/LanguagePluginHelpers.js';
import {
  clearMockConnectionResponseHandler,
  describeWithMockConnection,
  dispatchEvent,
  registerListenerOnOutgoingMessage,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import {setupPageResourceLoaderForSourceMap} from '../../helpers/SourceMapHelpers.js';
import {createContentProviderUISourceCode} from '../../helpers/UISourceCodeHelpers.js';
import {createFileSystemFileForPersistenceTests} from '../../helpers/PersistenceHelpers.js';
import {encodeSourceMap} from '../../helpers/SourceMapEncoder.js';
import {recordedMetricsContain, resetRecordedMetrics} from '../../helpers/UserMetricsHelpers.js';

const {assert} = chai;

describeWithMockConnection('BreakpointManager', () => {
  const URL_HTML = 'http://site/index.html' as Platform.DevToolsPath.UrlString;
  const INLINE_SCRIPT_START = 41;
  const BREAKPOINT_SCRIPT_LINE = 1;
  const INLINE_BREAKPOINT_RAW_LINE = BREAKPOINT_SCRIPT_LINE + INLINE_SCRIPT_START;
  const BREAKPOINT_RESULT_COLUMN = 5;
  const inlineScriptDescription = {
    url: URL_HTML,
    content: 'console.log(1);\nconsole.log(2);\n',
    startLine: INLINE_SCRIPT_START,
    startColumn: 0,
    hasSourceURL: false,
    embedderName: URL_HTML,
  };

  const URL = 'http://site/script.js' as Platform.DevToolsPath.UrlString;
  const scriptDescription = {
    url: URL,
    content: 'console.log(1);\nconsole.log(2);\n',
    startLine: 0,
    startColumn: 0,
    hasSourceURL: false,
  };

  const DEFAULT_BREAKPOINT:
      [Breakpoints.BreakpointManager.UserCondition, boolean, boolean, Breakpoints.BreakpointManager.BreakpointOrigin] =
          [
            Breakpoints.BreakpointManager.EMPTY_BREAKPOINT_CONDITION,
            true,   // enabled
            false,  // isLogpoint
            Breakpoints.BreakpointManager.BreakpointOrigin.OTHER,
          ];

  // For tests with source maps.
  const ORIGINAL_SCRIPT_SOURCES_CONTENT = 'function foo() {\n  console.log(\'Hello\');\n}\n';
  const COMPILED_SCRIPT_SOURCES_CONTENT = 'function foo(){console.log("Hello")}';
  const SOURCE_MAP_URL = 'https://site/script.js.map' as Platform.DevToolsPath.UrlString;
  const ORIGINAL_SCRIPT_SOURCE_URL = 'https://site/original-script.js' as Platform.DevToolsPath.UrlString;

  // Created with `terser -m -o script.min.js --source-map "includeSources;url=script.min.js.map" original-script.js`
  const sourceMapContent = JSON.stringify({
    'version': 3,
    'names': ['foo', 'console', 'log'],
    'sources': ['/original-script.js'],
    'sourcesContent': [ORIGINAL_SCRIPT_SOURCES_CONTENT],
    'mappings': 'AAAA,SAASA,MACPC,QAAQC,IAAI,QACd',
  });

  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
  let breakpointManager: Breakpoints.BreakpointManager.BreakpointManager;
  let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  let targetManager: SDK.TargetManager.TargetManager;
  let workspace: Workspace.Workspace.WorkspaceImpl;
  beforeEach(async () => {
    workspace = Workspace.Workspace.WorkspaceImpl.instance();
    targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
    backend = new MockProtocolBackend();
    target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    // Wait for the resource tree model to load; otherwise, our uiSourceCodes could be asynchronously
    // invalidated during the test.
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
    await new Promise<void>(resolver => {
      if (resourceTreeModel.cachedResourcesLoaded()) {
        resolver();
      } else {
        const eventListener =
            resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, () => {
              Common.EventTarget.removeEventListeners([eventListener]);
              resolver();
            });
      }
    });

    breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
  });

  async function uiSourceCodeFromScript(debuggerModel: SDK.DebuggerModel.DebuggerModel, script: SDK.Script.Script):
      Promise<Workspace.UISourceCode.UISourceCode|null> {
    const rawLocation = debuggerModel.createRawLocation(script, 0, 0);
    const uiLocation = await breakpointManager.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
    return uiLocation?.uiSourceCode ?? null;
  }

  describe('possibleBreakpoints', () => {
    it('correctly asks the back-end for breakable positions', async () => {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      // Create an inline script and get a UI source code instance for it.
      const script = await backend.addScript(target, scriptDescription, null);
      const {scriptId} = script;
      const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
      assertNotNullOrUndefined(uiSourceCode);

      function getPossibleBreakpointsStub(_request: Protocol.Debugger.GetPossibleBreakpointsRequest):
          Protocol.Debugger.GetPossibleBreakpointsResponse {
        return {
          locations: [
            {scriptId, lineNumber: 0, columnNumber: 4},
            {scriptId, lineNumber: 0, columnNumber: 8},
          ],
          getError() {
            return undefined;
          },
        };
      }
      const getPossibleBreakpoints = sinon.spy(getPossibleBreakpointsStub);
      setMockConnectionResponseHandler('Debugger.getPossibleBreakpoints', getPossibleBreakpoints);

      const uiTextRange = new TextUtils.TextRange.TextRange(0, 0, 1, 0);
      const possibleBreakpoints = await breakpointManager.possibleBreakpoints(uiSourceCode, uiTextRange);

      assert.lengthOf(possibleBreakpoints, 2);
      assert.strictEqual(possibleBreakpoints[0].uiSourceCode, uiSourceCode);
      assert.strictEqual(possibleBreakpoints[0].lineNumber, 0);
      assert.strictEqual(possibleBreakpoints[0].columnNumber, 4);
      assert.strictEqual(possibleBreakpoints[1].uiSourceCode, uiSourceCode);
      assert.strictEqual(possibleBreakpoints[1].lineNumber, 0);
      assert.strictEqual(possibleBreakpoints[1].columnNumber, 8);
      assert.isTrue(getPossibleBreakpoints.calledOnceWith(sinon.match({
        start: {
          scriptId,
          lineNumber: 0,
          columnNumber: 0,
        },
        end: {
          scriptId,
          lineNumber: 1,
          columnNumber: 0,
        },
        restrictToFunction: false,
      })));
    });
  });

  describe('Breakpoints', () => {
    it('are removed and kept in storage after a back-end error', async () => {
      // Simulates a back-end error.
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      if (!debuggerModel.isReadyToPause()) {
        await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
      }

      // Create an inline script and get a UI source code instance for it.
      const script = await backend.addScript(target, scriptDescription, null);
      const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
      assertNotNullOrUndefined(uiSourceCode);

      // Set up the backend to respond with an error.
      backend.setBreakpointByUrlToFail(URL, BREAKPOINT_SCRIPT_LINE);

      // Set the breakpoint.
      const breakpoint =
          await breakpointManager.setBreakpoint(uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, ...DEFAULT_BREAKPOINT);
      assertNotNullOrUndefined(breakpoint);

      const removedSpy = sinon.spy(breakpoint, 'remove');
      await breakpoint.updateBreakpoint();

      // Breakpoint was removed and is kept in storage.
      assert.isTrue(breakpoint.getIsRemoved());
      assert.isTrue(removedSpy.calledWith(true));
    });

    it('are only set if the uiSourceCode is still valid (not removed)', async () => {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      // Add a script.
      const script = await backend.addScript(target, scriptDescription, null);
      const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
      assertNotNullOrUndefined(uiSourceCode);

      // Remove the project (and thus the uiSourceCode).
      Workspace.Workspace.WorkspaceImpl.instance().removeProject(uiSourceCode.project());

      // Set the breakpoint.
      const breakpoint =
          await breakpointManager.setBreakpoint(uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, ...DEFAULT_BREAKPOINT);

      // We should not expect any breakpoints to be set.
      assert.isUndefined(breakpoint);
      const breakLocations = breakpointManager.allBreakpointLocations();
      assert.lengthOf(breakLocations, 0);
    });
  });

  describe('Breakpoint#backendCondition()', () => {
    function createBreakpoint(condition: string, isLogpoint: boolean): Breakpoints.BreakpointManager.Breakpoint {
      const {uiSourceCode} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'});
      const storageState = {
        url: URL,
        resourceTypeName: uiSourceCode.contentType().name(),
        lineNumber: 5,
        condition: condition as Breakpoints.BreakpointManager.UserCondition,
        enabled: true,
        isLogpoint,
      };
      return new Breakpoints.BreakpointManager.Breakpoint(
          breakpointManager, uiSourceCode, storageState, Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION);
    }

    it('wraps logpoints in console.log', () => {
      const breakpoint = createBreakpoint('x', /* isLogpoint */ true);

      assert.include(breakpoint.backendCondition(), 'console.log(x)');
    });

    it('leaves conditional breakpoints alone', () => {
      const breakpoint = createBreakpoint('x === 42', /* isLogpoint */ false);

      // Split of sourceURL.
      const lines = breakpoint.backendCondition().split('\n');
      assert.strictEqual(lines[0], 'x === 42');
    });

    it('has a sourceURL for logpoints', () => {
      const breakpoint = createBreakpoint('x', /* isLogpoint */ true);

      assert.include(breakpoint.backendCondition(), '//# sourceURL=');
    });

    it('has a sourceURL for conditional breakpoints', () => {
      const breakpoint = createBreakpoint('x === 42', /* isLogpoint */ false);

      assert.include(breakpoint.backendCondition(), '//# sourceURL=');
    });

    it('has no sourceURL for normal breakpoints', () => {
      const breakpoint = createBreakpoint('', /* isLogpoint */ false);

      assert.notInclude(breakpoint.backendCondition(), '//# sourceURL=');
    });

    it('substitutes source-mapped variables', async () => {
      Root.Runtime.experiments.enableForTest('evaluateExpressionsWithSourceMaps');
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      const scriptInfo = {url: URL, content: 'function adder(n,r){const t=n+r;return t}'};
      // Created with `terser -m -o script.min.js --source-map "includeSources;url=script.min.js.map" original-script.js`
      const sourceMapContent = JSON.stringify({
        'version': 3,
        'names': ['adder', 'param1', 'param2', 'result'],
        'sources': ['/original-script.js'],
        'sourcesContent':
            ['function adder(param1, param2) {\n  const result = param1 + param2;\n  return result;\n}\n\n'],
        'mappings': 'AAAA,SAASA,MAAMC,EAAQC,GACrB,MAAMC,EAASF,EAASC,EACxB,OAAOC,CACT',
      });
      const sourceMapInfo = {url: SOURCE_MAP_URL, content: sourceMapContent};
      const script = await backend.addScript(target, scriptInfo, sourceMapInfo);

      // Get the uiSourceCode for the original source.
      const uiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
          debuggerModel, ORIGINAL_SCRIPT_SOURCE_URL, script.isContentScript());
      assertNotNullOrUndefined(uiSourceCode);

      // Mock out "Debugger.setBreakpointByUrl and just echo back the request".
      const cdpSetBreakpointPromise = new Promise<Protocol.Debugger.SetBreakpointByUrlRequest>(res => {
        clearMockConnectionResponseHandler('Debugger.setBreakpointByUrl');
        setMockConnectionResponseHandler('Debugger.setBreakpointByUrl', request => {
          res(request);
          return {};
        });
      });

      // Set the breakpoint on the `const result = ...` line with a condition using
      // "authored" variable names.
      const breakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, 1, 0, 'param1 > 0' as Breakpoints.BreakpointManager.UserCondition, /* enabled */ true,
          /* isLogpoint */ false, Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION);
      assertNotNullOrUndefined(breakpoint);

      await breakpoint.updateBreakpoint();

      const {url, lineNumber, columnNumber, condition} = await cdpSetBreakpointPromise;
      assert.strictEqual(url, URL);
      assert.strictEqual(lineNumber, 0);
      assert.strictEqual(columnNumber, 20);
      assert.strictEqual(condition, 'n > 0\n\n//# sourceURL=debugger://breakpoint');

      Root.Runtime.experiments.disableForTest('evaluateExpressionsWithSourceMaps');
    });
  });

  it('substitutes source-mapped variables for the same original script in different bundles correctly', async () => {
    Root.Runtime.experiments.enableForTest('evaluateExpressionsWithSourceMaps');
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    // Create two 'bundles' that are identical modulo variable names.
    const url1 = 'http://site/script1.js' as Platform.DevToolsPath.UrlString;
    const url2 = 'http://site/script2.js' as Platform.DevToolsPath.UrlString;
    const scriptInfo1 = {url: url1, content: 'function adder(n,r){const t=n+r;return t}'};
    const scriptInfo2 = {url: url2, content: 'function adder(o,p){const t=o+p;return t}'};

    // The source map is the same for both 'bundles'.
    // Created with `terser -m -o script.min.js --source-map "includeSources;url=script.min.js.map" original-script.js`
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'names': ['adder', 'param1', 'param2', 'result'],
      'sources': ['/original-script.js'],
      'sourcesContent':
          ['function adder(param1, param2) {\n  const result = param1 + param2;\n  return result;\n}\n\n'],
      'mappings': 'AAAA,SAASA,MAAMC,EAAQC,GACrB,MAAMC,EAASF,EAASC,EACxB,OAAOC,CACT',
    });
    const sourceMapInfo = {url: SOURCE_MAP_URL, content: sourceMapContent};
    await Promise.all([
      backend.addScript(target, scriptInfo1, sourceMapInfo),
      backend.addScript(target, scriptInfo2, sourceMapInfo),
    ]);

    // Get the uiSourceCode for the original source.
    const uiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
        debuggerModel, ORIGINAL_SCRIPT_SOURCE_URL, /* isContentScript */ false);
    assertNotNullOrUndefined(uiSourceCode);

    // Mock out "Debugger.setBreakpointByUrl and echo back the first two 'Debugger.setBreakpointByUrl' requests.
    const cdpSetBreakpointPromise = new Promise<Map<string, Protocol.Debugger.SetBreakpointByUrlRequest>>(res => {
      clearMockConnectionResponseHandler('Debugger.setBreakpointByUrl');
      const requests = new Map<string, Protocol.Debugger.SetBreakpointByUrlRequest>();
      setMockConnectionResponseHandler('Debugger.setBreakpointByUrl', request => {
        requests.set(request.url, request);
        if (requests.size === 2) {
          res(requests);
        }
        return {};
      });
    });

    // Set the breakpoint on the `const result = ...` line with a condition using
    // "authored" variable names.
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 1, 0, 'param1 > 0' as Breakpoints.BreakpointManager.UserCondition, /* enabled */ true,
        /* isLogpoint */ false, Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION);
    assertNotNullOrUndefined(breakpoint);

    await breakpoint.updateBreakpoint();

    const requests = await cdpSetBreakpointPromise;
    const req1 = requests.get(url1);
    assertNotNullOrUndefined(req1);
    assert.strictEqual(req1.url, url1);
    assert.strictEqual(req1.condition, 'n > 0\n\n//# sourceURL=debugger://breakpoint');

    const req2 = requests.get(url2);
    assertNotNullOrUndefined(req2);
    assert.strictEqual(req2.url, url2);
    assert.strictEqual(req2.condition, 'o > 0\n\n//# sourceURL=debugger://breakpoint');

    Root.Runtime.experiments.disableForTest('evaluateExpressionsWithSourceMaps');
  });

  it('allows awaiting the restoration of breakpoints', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    const {uiSourceCode, project} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'});
    const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 0, 0, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);

    // Make sure that we await all updates that are triggered by adding the model.
    await breakpoint.updateBreakpoint();

    const responder = backend.responderToBreakpointByUrlRequest(URL, 0);
    const script = await backend.addScript(target, scriptDescription, null);
    void responder({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [
        {
          scriptId: script.scriptId,
          lineNumber: 0,
          columnNumber: 9,
        },
      ],
    });

    // Retrieve the ModelBreakpoint that is linked to our DebuggerModel.
    const modelBreakpoint = breakpoint.modelBreakpoint(debuggerModel);
    assertNotNullOrUndefined(modelBreakpoint);

    // Make sure that we do not have a linked script yet.
    assert.isNull(modelBreakpoint.currentState);

    // Now await restoring the breakpoint.
    // A successful restore should update the ModelBreakpoint of the DebuggerModel
    // to reflect a state, in which we have successfully set a breakpoint (i.e. a script id
    // is available).
    await breakpointManager.restoreBreakpointsForScript(script);
    assertNotNullOrUndefined(modelBreakpoint.currentState);
    assert.lengthOf(modelBreakpoint.currentState, 1);
    assert.strictEqual(modelBreakpoint.currentState[0].url, URL);

    // Clean up.
    await breakpoint.remove(false);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
  });

  it('allows awaiting on scheduled update in debugger', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    const {uiSourceCode, project} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'});
    const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 13, 0, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);

    // Make sure that we await all updates that are triggered by adding the model.
    await breakpoint.updateBreakpoint();

    const responder = backend.responderToBreakpointByUrlRequest(URL, 13);
    const script = await backend.addScript(target, scriptDescription, null);
    void responder({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [
        {
          scriptId: script.scriptId,
          lineNumber: 13,
          columnNumber: 9,
        },
      ],
    });

    // Retrieve the ModelBreakpoint that is linked to our DebuggerModel.
    const modelBreakpoint = breakpoint.modelBreakpoint(debuggerModel);
    assertNotNullOrUndefined(modelBreakpoint);

    assert.isNull(breakpoint.getLastResolvedState());
    const update = modelBreakpoint.scheduleUpdateInDebugger();
    assert.isNull(breakpoint.getLastResolvedState());
    const result = await update;
    // Make sure that no error occurred.
    assert.isTrue(result === Breakpoints.BreakpointManager.DebuggerUpdateResult.OK);
    assert.strictEqual(breakpoint.getLastResolvedState()?.[0].lineNumber, 13);
    await breakpoint.remove(false);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
  });

  it('allows awaiting on removal of breakpoint in debugger', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    const script = await backend.addScript(target, scriptDescription, null);
    const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
    assertNotNullOrUndefined(uiSourceCode);

    const breakpointId = 'BREAK_ID' as Protocol.Debugger.BreakpointId;
    void backend.responderToBreakpointByUrlRequest(URL, 13)({
      breakpointId,
      locations: [
        {
          scriptId: script.scriptId,
          lineNumber: 13,
          columnNumber: 9,
        },
      ],
    });

    const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 13, 0, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);
    await breakpoint.updateBreakpoint();

    // Retrieve the ModelBreakpoint that is linked to our DebuggerModel.
    const modelBreakpoint = breakpoint.modelBreakpoint(debuggerModel);
    assertNotNullOrUndefined(modelBreakpoint);
    assertNotNullOrUndefined(modelBreakpoint.currentState);

    // Test if awaiting breakpoint.remove is actually removing the state.
    const removalPromise = backend.breakpointRemovedPromise(breakpointId);
    await breakpoint.remove(false);
    await removalPromise;
    assert.isNull(modelBreakpoint.currentState);
  });

  it('removes ui source code from breakpoint even after breakpoint live location update', async () => {
    const BREAKPOINT_TS_LINE = 10;

    const {uiSourceCode: uiSourceCodeTs} = createContentProviderUISourceCode(
        {url: 'http://example.com/source.ts' as Platform.DevToolsPath.UrlString, mimeType: 'text/typescript'});

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    // Create an inline script and get a UI source code instance for it.
    const script = await backend.addScript(target, scriptDescription, null);
    const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
    assertNotNullOrUndefined(uiSourceCode);

    // Register our interest in the breakpoint request.
    const breakpointResponder = backend.responderToBreakpointByUrlRequest(URL, BREAKPOINT_SCRIPT_LINE);

    // Set the breakpoint.
    const breakpoint =
        await breakpointManager.setBreakpoint(uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);

    // Await the breakpoint request at the mock backend and send a CDP response once the request arrives.
    // Concurrently, enforce update of the breakpoint in the debugger.
    await Promise.all([
      breakpointResponder({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {scriptId: script.scriptId, lineNumber: BREAKPOINT_SCRIPT_LINE, columnNumber: BREAKPOINT_RESULT_COLUMN},
        ],
      }),
      breakpoint.refreshInDebugger(),
    ]);

    // Map the breakpoint location to a different file (this will internally update its live location).
    const mapping = createFakeScriptMapping(debuggerModel, uiSourceCodeTs, BREAKPOINT_TS_LINE, script.scriptId);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);
    await breakpointManager.debuggerWorkspaceBinding.updateLocations(script);

    // Verify that the location of the breakpoint was updated.
    assert.strictEqual(breakpointManager.breakpointLocationsForUISourceCode(uiSourceCodeTs).length, 1);
    assert.strictEqual(breakpointManager.breakpointLocationsForUISourceCode(uiSourceCodeTs)[0].breakpoint, breakpoint);
    assert.strictEqual(
        breakpointManager.breakpointLocationsForUISourceCode(uiSourceCodeTs)[0].uiLocation.lineNumber,
        BREAKPOINT_TS_LINE);

    // Remove the target and verify that the UI source codes were removed from the breakpoint.
    breakpointManager.targetManager.removeTarget(target);
    assert.strictEqual(breakpoint.getUiSourceCodes().size, 0);
    assert.strictEqual(breakpointManager.breakpointLocationsForUISourceCode(uiSourceCodeTs).length, 0);

    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
    await breakpoint.remove(false);
  });

  it('can set breakpoints in inline scripts', async () => {
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    // Create an inline script and get a UI source code instance for it.
    const inlineScript = await backend.addScript(target, inlineScriptDescription, null);
    const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, inlineScript);
    assertNotNullOrUndefined(uiSourceCode);

    // Register our interest in the breakpoint request.
    const breakpointResponder = backend.responderToBreakpointByUrlRequest(URL_HTML, INLINE_BREAKPOINT_RAW_LINE);

    // Set the breakpoint.
    const breakpoint =
        await breakpointManager.setBreakpoint(uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);

    // Await the breakpoint request at the mock backend and send a CDP response once the request arrives.
    // Concurrently, enforce update of the breakpoint in the debugger.
    await Promise.all([
      breakpointResponder({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: inlineScript.scriptId,
            lineNumber: INLINE_BREAKPOINT_RAW_LINE,
            columnNumber: BREAKPOINT_RESULT_COLUMN,
          },
        ],
      }),
      breakpoint.refreshInDebugger(),
    ]);

    // Check that the breakpoint was set at the correct location?
    const locations = breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
    assert.strictEqual(1, locations.length);
    assert.strictEqual(1, locations[0].uiLocation.lineNumber);
    assert.strictEqual(5, locations[0].uiLocation.columnNumber);
  });

  it('can restore breakpoints in inline scripts', async () => {
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    // Create an inline script and get a UI source code instance for it.
    const inlineScript = await backend.addScript(target, inlineScriptDescription, null);
    const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, inlineScript);
    assertNotNullOrUndefined(uiSourceCode);

    // Register our interest in the breakpoint request.
    const breakpointResponder = backend.responderToBreakpointByUrlRequest(URL_HTML, INLINE_BREAKPOINT_RAW_LINE);

    // Set the breakpoint on the front-end/model side.
    const breakpoint =
        await breakpointManager.setBreakpoint(uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);
    assert.deepEqual(Array.from(breakpoint.getUiSourceCodes()), [uiSourceCode]);

    // Await the breakpoint request at the mock backend and send a CDP response once the request arrives.
    // Concurrently, enforce update of the breakpoint in the debugger.
    await Promise.all([
      breakpointResponder({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: inlineScript.scriptId,
            lineNumber: INLINE_BREAKPOINT_RAW_LINE,
            columnNumber: BREAKPOINT_RESULT_COLUMN,
          },
        ],
      }),
      breakpoint.refreshInDebugger(),
    ]);

    // Disconnect from the target. This will also unload the script.
    breakpointManager.targetManager.removeTarget(target);

    // Make sure the source code for the script was removed from the breakpoint.
    assert.strictEqual(breakpoint.getUiSourceCodes().size, 0);

    // Create a new target.
    target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    const reloadedDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(reloadedDebuggerModel);

    // Load the same inline script (with a different script id!) into the new target.
    // Once the model loads the script, it wil try to restore the breakpoint. Let us make sure the backend
    // will be ready to produce a response before adding the script.
    const reloadedBreakpointResponder = backend.responderToBreakpointByUrlRequest(URL_HTML, INLINE_BREAKPOINT_RAW_LINE);
    const reloadedInlineScript = await backend.addScript(target, inlineScriptDescription, null);

    const reloadedUiSourceCode = await uiSourceCodeFromScript(reloadedDebuggerModel, reloadedInlineScript);
    assertNotNullOrUndefined(reloadedUiSourceCode);

    // Verify the breakpoint was restored at the oriignal unbound location (before the backend binds it).
    const unboundLocations = breakpointManager.breakpointLocationsForUISourceCode(reloadedUiSourceCode);
    assert.strictEqual(1, unboundLocations.length);
    assert.strictEqual(1, unboundLocations[0].uiLocation.lineNumber);
    assert.strictEqual(2, unboundLocations[0].uiLocation.columnNumber);

    // Wait for the breakpoint request for the reloaded script and for the breakpoint update.
    await Promise.all([
      reloadedBreakpointResponder({
        breakpointId: 'RELOADED_BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [{
          scriptId: reloadedInlineScript.scriptId,
          lineNumber: INLINE_BREAKPOINT_RAW_LINE,
          columnNumber: BREAKPOINT_RESULT_COLUMN,
        }],
      }),
      breakpoint.refreshInDebugger(),
    ]);

    // Verify the restored position.
    const boundLocations = breakpointManager.breakpointLocationsForUISourceCode(reloadedUiSourceCode);
    assert.strictEqual(1, boundLocations.length);
    assert.strictEqual(1, boundLocations[0].uiLocation.lineNumber);
    assert.strictEqual(5, boundLocations[0].uiLocation.columnNumber);
  });

  it('eagerly restores JavaScript breakpoints in a new target', async () => {
    // Remove the default target so that we can simulate starting the debugger afresh.
    targetManager.removeTarget(target);

    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.SET_ALL_BREAKPOINTS_EAGERLY);

    // Set the breakpoint storage to contain a breakpoint and re-initialize
    // the breakpoint manager from that storage. This should create a breakpoint instance
    // in the breakpoint manager.
    const url = 'http://example.com/script.js' as Platform.DevToolsPath.UrlString;
    const lineNumber = 1;
    const breakpoints: Breakpoints.BreakpointManager.BreakpointStorageState[] = [{
      url,
      resourceTypeName: 'script',
      lineNumber,
      condition: '' as Breakpoints.BreakpointManager.UserCondition,
      enabled: true,
      isLogpoint: false,
    }];
    Common.Settings.Settings.instance().createLocalSetting('breakpoints', breakpoints).set(breakpoints);
    Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});

    // Create a new target and make sure that the backend receives setBreakpointByUrl request
    // from breakpoint manager.
    const breakpointSetPromise = backend.responderToBreakpointByUrlRequest(url, lineNumber)({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [],
    });
    SDK.TargetManager.TargetManager.instance().setScopeTarget(createTarget());
    await breakpointSetPromise;

    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.SET_ALL_BREAKPOINTS_EAGERLY);
  });

  it('eagerly restores TypeScript breakpoints in a new target', async () => {
    // Remove the default target so that we can simulate starting the debugger afresh.
    targetManager.removeTarget(target);

    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.SET_ALL_BREAKPOINTS_EAGERLY);

    // Set the breakpoint storage to contain a source-mapped breakpoint and re-initialize
    // the breakpoint manager from that storage. This should create a breakpoint instance
    // in the breakpoint manager (for the resolved location!).
    const compiledUrl = 'http://example.com/compiled.js' as Platform.DevToolsPath.UrlString;
    const compiledLineNumber = 2;
    const breakpoints: Breakpoints.BreakpointManager.BreakpointStorageState[] = [{
      url: 'http://example.com/src/script.ts' as Platform.DevToolsPath.UrlString,
      resourceTypeName: 'sm-script',
      lineNumber: 1,
      condition: '' as Breakpoints.BreakpointManager.UserCondition,
      enabled: true,
      isLogpoint: false,
      resolvedState: [{
        url: compiledUrl,
        lineNumber: compiledLineNumber,
        columnNumber: 0,
        condition: '' as SDK.DebuggerModel.BackendCondition,
      }],
    }];
    Common.Settings.Settings.instance().createLocalSetting('breakpoints', breakpoints).set(breakpoints);
    Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});

    // Create a new target and make sure that the backend receives setBreakpointByUrl request
    // from breakpoint manager.
    const breakpointSetPromise = backend.responderToBreakpointByUrlRequest(compiledUrl, compiledLineNumber)({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [],
    });
    SDK.TargetManager.TargetManager.instance().setScopeTarget(createTarget());
    await breakpointSetPromise;

    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.SET_ALL_BREAKPOINTS_EAGERLY);
  });

  it('saves generated location into storage', async () => {
    // Remove the default target so that we can simulate starting the debugger afresh.
    targetManager.removeTarget(target);

    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.SET_ALL_BREAKPOINTS_EAGERLY);

    // Re-create a target and breakpoint manager.
    target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);
    const breakpoints: Breakpoints.BreakpointManager.BreakpointStorageState[] = [];
    const setting = Common.Settings.Settings.instance().createLocalSetting('breakpoints', breakpoints);
    Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});

    // Add script with source map.
    setupPageResourceLoaderForSourceMap(sourceMapContent);
    const scriptInfo = {url: URL, content: COMPILED_SCRIPT_SOURCES_CONTENT};
    const sourceMapInfo = {url: SOURCE_MAP_URL, content: sourceMapContent};
    const script = await backend.addScript(target, scriptInfo, sourceMapInfo);

    // Get the uiSourceCode for the original source.
    const uiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
        debuggerModel, ORIGINAL_SCRIPT_SOURCE_URL, script.isContentScript());
    assertNotNullOrUndefined(uiSourceCode);

    // Set the breakpoint on the front-end/model side.
    const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 1, 0, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);

    // Set the breakpoint response for our upcoming request.
    void backend.responderToBreakpointByUrlRequest(URL, 0)({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [
        {
          scriptId: script.scriptId,
          lineNumber: 0,
          columnNumber: 15,
        },
      ],
    });
    // Ensure the breakpoint is fully set.
    await breakpoint.refreshInDebugger();

    // Check that the storage contains the resolved breakpoint location.
    assert.lengthOf(setting.get(), 1);
    assert.deepEqual(setting.get()[0].resolvedState, [{
                       url: URL,
                       lineNumber: 0,
                       columnNumber: 15,
                       condition: '' as SDK.DebuggerModel.BackendCondition,
                     }]);

    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.SET_ALL_BREAKPOINTS_EAGERLY);
  });

  it('restores latest breakpoints from storage', async () => {
    // Remove the default target so that we can simulate starting the debugger afresh.
    targetManager.removeTarget(target);

    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.SET_ALL_BREAKPOINTS_EAGERLY);

    const expectedBreakpointLines = [1, 2];

    const breakpointRequestLines = new Promise<number[]>((resolve, reject) => {
      const breakpoints: Breakpoints.BreakpointManager.BreakpointStorageState[] = [];

      // Accumulator for breakpoint lines from setBreakpointByUrl requests.
      const breakpointRequestLinesReceived = new Set<number>();

      // Create three breakpoints in the storage and register the corresponding
      // request handler in the mock backend. The handler will resolve the promise
      // (and thus finish up the test) once it receives two breakpoint requests.
      // The idea is to check that the front-end requested the two latest breakpoints
      // from the backend.
      for (let i = 0; i < 3; i++) {
        const lineNumber = i;
        // Push the breakpoint to our mock storage. The storage will be then used
        // to initialize the breakpoint manager.
        breakpoints.push({
          url: URL,
          resourceTypeName: 'script',
          lineNumber,
          condition: '' as Breakpoints.BreakpointManager.UserCondition,
          enabled: true,
          isLogpoint: false,
        });

        // When the mock backend receives a request for this breakpoint, it will
        // respond and record the request. Also, once we receive the
        void backend
            .responderToBreakpointByUrlRequest(
                URL, lineNumber)({breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId, locations: []})
            .then(() => {
              breakpointRequestLinesReceived.add(lineNumber);
              if (breakpointRequestLinesReceived.size === expectedBreakpointLines.length) {
                resolve(Array.from(breakpointRequestLinesReceived).sort((l, r) => l - r));
              }
            }, reject);
      }

      // Re-create the breakpoint manager and the target.
      const setting = Common.Settings.Settings.instance().createLocalSetting('breakpoints', breakpoints);
      setting.set(breakpoints);
      // Create the breakpoint manager, request placing on the two latest breakpoints in the backend.
      Breakpoints.BreakpointManager.BreakpointManager.instance({
        forceNew: true,
        targetManager,
        workspace,
        debuggerWorkspaceBinding,
        restoreInitialBreakpointCount: expectedBreakpointLines.length,
      });
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    });

    assert.deepEqual(Array.from(await breakpointRequestLines), expectedBreakpointLines);

    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.SET_ALL_BREAKPOINTS_EAGERLY);
  });

  describe('with instrumentation breakpoints turned on', () => {
    beforeEach(() => {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
      breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance(
          {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
    });

    afterEach(() => {
      Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
    });

    async function testBreakpointMovedOnInstrumentationBreak(
        fileSystemPath: Platform.DevToolsPath.UrlString, fileSystemFileUrl: Platform.DevToolsPath.UrlString,
        content: string, type?: string) {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      const {uiSourceCode: fileSystemUiSourceCode, project} = createFileSystemFileForPersistenceTests(
          {fileSystemFileUrl, fileSystemPath, type: type}, scriptDescription.url, content, target);

      const breakpointLine = 0;
      const resolvedBreakpointLine = 1;

      // Set the breakpoint on the file system uiSourceCode.
      await breakpointManager.setBreakpoint(fileSystemUiSourceCode, breakpointLine, 0, ...DEFAULT_BREAKPOINT);

      // Add the script.
      const script = await backend.addScript(target, scriptDescription, null);
      const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
      assertNotNullOrUndefined(uiSourceCode);
      assert.strictEqual(uiSourceCode.project().type(), Workspace.Workspace.projectTypes.Network);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL, breakpointLine)({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: script.scriptId,
            lineNumber: resolvedBreakpointLine,
            columnNumber: 0,
          },
        ],
      });

      // Register our interest in an outgoing 'resume', which should be sent as soon as
      // we have set up all breakpoints during the instrumentation pause.
      const resumeSentPromise = registerListenerOnOutgoingMessage('Debugger.resume');

      // Inform the front-end about an instrumentation break.
      backend.dispatchDebuggerPause(script, Protocol.Debugger.PausedEventReason.Instrumentation);

      // Wait for the breakpoints to be set, and the resume to be sent.
      await resumeSentPromise;

      // Verify that the network uiSourceCode has the breakpoint that we originally set
      // on the file system uiSourceCode.
      const reloadedBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
      assert.strictEqual(1, reloadedBoundLocations.length);
      assert.strictEqual(resolvedBreakpointLine, reloadedBoundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, reloadedBoundLocations[0].uiLocation.columnNumber);

      project.dispose();
    }

    it('can restore breakpoints in scripts', async () => {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      const breakpointLine = 0;
      const resolvedBreakpointLine = 3;

      // Add script.
      const scriptInfo = {url: URL, content: 'console.log(\'hello\')'};
      const script = await backend.addScript(target, scriptInfo, null);

      // Get the uiSourceCode for the source.
      const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
      assertNotNullOrUndefined(uiSourceCode);

      // Set the breakpoint on the front-end/model side.
      const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, breakpointLine, 0, ...DEFAULT_BREAKPOINT);
      assertNotNullOrUndefined(breakpoint);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL, breakpointLine)({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: script.scriptId,
            lineNumber: resolvedBreakpointLine,
            columnNumber: 0,
          },
        ],
      });
      await breakpoint.refreshInDebugger();
      assert.deepEqual(Array.from(breakpoint.getUiSourceCodes()), [uiSourceCode]);

      // Verify the restored position.
      const boundLocations = breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
      assert.strictEqual(1, boundLocations.length);
      assert.strictEqual(resolvedBreakpointLine, boundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, boundLocations[0].uiLocation.columnNumber);

      // Disconnect from the target. This will also unload the script.
      breakpointManager.targetManager.removeTarget(target);

      // Make sure the source code for the script was removed from the breakpoint.
      assert.strictEqual(breakpoint.getUiSourceCodes().size, 0);

      // Remove the breakpoint.
      await breakpoint.remove(true /* keepInStorage */);

      // Create a new target.
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

      const reloadedDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(reloadedDebuggerModel);

      // Add the same script under a different scriptId.
      const reloadedScript = await backend.addScript(target, scriptInfo, null);

      // Get the uiSourceCode for the original source.
      const reloadedUiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(reloadedScript);
      assertNotNullOrUndefined(reloadedUiSourceCode);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL, breakpointLine)({
        breakpointId: 'RELOADED_BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: reloadedScript.scriptId,
            lineNumber: resolvedBreakpointLine,
            columnNumber: 0,
          },
        ],
      });

      // Register our interest in an outgoing 'resume', which should be sent as soon as
      // we have set up all breakpoints during the instrumentation pause.
      const resumeSentPromise = registerListenerOnOutgoingMessage('Debugger.resume');

      // Inform the front-end about an instrumentation break.
      backend.dispatchDebuggerPause(reloadedScript, Protocol.Debugger.PausedEventReason.Instrumentation);

      // Wait for the breakpoints to be set, and the resume to be sent.
      await resumeSentPromise;

      // Verify the restored position.
      const reloadedBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(reloadedUiSourceCode);
      assert.strictEqual(1, reloadedBoundLocations.length);
      assert.strictEqual(resolvedBreakpointLine, reloadedBoundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, reloadedBoundLocations[0].uiLocation.columnNumber);
    });

    it('can restore breakpoints in a default-mapped inline scripts without sourceURL comment', async () => {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      // Add script.
      const script = await backend.addScript(target, inlineScriptDescription, null);

      // Get the uiSourceCode for the source. This is the uiSourceCode in the DefaultScriptMapping,
      // as we haven't registered the uiSourceCode for the html file.
      const uiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForScript(script);
      assertNotNullOrUndefined(uiSourceCode);
      assert.strictEqual(uiSourceCode.project().type(), Workspace.Workspace.projectTypes.Debugger);

      // Set the breakpoint on the front-end/model side. The line number is relative to the v8 script.
      const breakpoint =
          await breakpointManager.setBreakpoint(uiSourceCode, BREAKPOINT_SCRIPT_LINE, 0, ...DEFAULT_BREAKPOINT);
      assertNotNullOrUndefined(breakpoint);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL_HTML, INLINE_BREAKPOINT_RAW_LINE)({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: script.scriptId,
            lineNumber: INLINE_BREAKPOINT_RAW_LINE,
            columnNumber: 0,
          },
        ],
      });
      await breakpoint.refreshInDebugger();
      assert.deepEqual(Array.from(breakpoint.getUiSourceCodes()), [uiSourceCode]);

      // Verify the position.
      const boundLocations = breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
      assert.strictEqual(1, boundLocations.length);
      assert.strictEqual(BREAKPOINT_SCRIPT_LINE, boundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, boundLocations[0].uiLocation.columnNumber);

      // Disconnect from the target. This will also unload the script.
      breakpointManager.targetManager.removeTarget(target);

      // Make sure the source code for the script was removed from the breakpoint.
      assert.strictEqual(breakpoint.getUiSourceCodes().size, 0);

      // Remove the breakpoint.
      await breakpoint.remove(true /* keepInStorage */);

      // Create a new target.
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

      const reloadedDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(reloadedDebuggerModel);

      // Add the same script under a different scriptId.
      const reloadedScript = await backend.addScript(target, inlineScriptDescription, null);

      // Get the uiSourceCode for the source. This is the uiSourceCode in the DefaultScriptMapping,
      // as we haven't registered the uiSourceCode for the html file.
      const reloadedUiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(reloadedScript);
      assertNotNullOrUndefined(reloadedUiSourceCode);
      assert.strictEqual(reloadedUiSourceCode.project().type(), Workspace.Workspace.projectTypes.Debugger);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL_HTML, INLINE_BREAKPOINT_RAW_LINE)({
        breakpointId: 'RELOADED_BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: reloadedScript.scriptId,
            lineNumber: INLINE_BREAKPOINT_RAW_LINE,
            columnNumber: 0,
          },
        ],
      });

      // Register our interest in an outgoing 'resume', which should be sent as soon as
      // we have set up all breakpoints during the instrumentation pause.
      const resumeSentPromise = registerListenerOnOutgoingMessage('Debugger.resume');

      // Inform the front-end about an instrumentation break.
      backend.dispatchDebuggerPause(reloadedScript, Protocol.Debugger.PausedEventReason.Instrumentation);

      // Wait for the breakpoints to be set, and the resume to be sent.
      await resumeSentPromise;

      // Verify the restored position.
      const reloadedBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(reloadedUiSourceCode);
      assert.strictEqual(1, reloadedBoundLocations.length);
      assert.deepEqual(reloadedBoundLocations[0].uiLocation.uiSourceCode, reloadedUiSourceCode);
      assert.strictEqual(BREAKPOINT_SCRIPT_LINE, reloadedBoundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, reloadedBoundLocations[0].uiLocation.columnNumber);
    });

    it('can restore breakpoints in an inline script without sourceURL comment', async () => {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      function dispatchDocumentOpened() {
        dispatchEvent(target, 'Page.documentOpened', {
          frame: {
            id: 'main',
            loaderId: 'foo',
            url: URL_HTML,
            domainAndRegistry: 'example.com',
            securityOrigin: 'https://example.com/',
            mimeType: 'text/html',
            secureContextType: Protocol.Page.SecureContextType.Secure,
            crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
            gatedAPIFeatures: [],
          },
        });
      }
      dispatchDocumentOpened();

      // Add script.
      const script = await backend.addScript(target, inlineScriptDescription, null);

      // Get the uiSourceCode for the source: this should be the uiSourceCode of the actual html script.
      const uiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForScript(script);
      assertNotNullOrUndefined(uiSourceCode);
      assert.strictEqual(uiSourceCode.project().type(), Workspace.Workspace.projectTypes.Network);

      // Set the breakpoint on the front-end/model side of the html uiSourceCode.
      const breakpoint =
          await breakpointManager.setBreakpoint(uiSourceCode, INLINE_BREAKPOINT_RAW_LINE, 0, ...DEFAULT_BREAKPOINT);
      assertNotNullOrUndefined(breakpoint);

      // Set the breakpoint response for our upcoming request to set a breakpoint on the raw location.
      void backend.responderToBreakpointByUrlRequest(URL_HTML, INLINE_BREAKPOINT_RAW_LINE)({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: script.scriptId,
            lineNumber: INLINE_BREAKPOINT_RAW_LINE,
            columnNumber: 0,
          },
        ],
      });
      await breakpoint.refreshInDebugger();
      assert.deepEqual(Array.from(breakpoint.getUiSourceCodes()), [uiSourceCode]);

      // Verify the position.
      const boundLocations = breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
      assert.strictEqual(1, boundLocations.length);
      assert.strictEqual(INLINE_BREAKPOINT_RAW_LINE, boundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, boundLocations[0].uiLocation.columnNumber);

      // Disconnect from the target. This will also unload the script.
      breakpointManager.targetManager.removeTarget(target);

      // Make sure the source code for the script was removed from the breakpoint.
      assert.strictEqual(breakpoint.getUiSourceCodes().size, 0);

      // Remove the breakpoint.
      await breakpoint.remove(true /* keepInStorage */);

      // Create a new target.
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

      const reloadedDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(reloadedDebuggerModel);

      dispatchDocumentOpened();

      // Add the same script under a different scriptId.
      const reloadedScript = await backend.addScript(target, inlineScriptDescription, null);

      // Get the uiSourceCode for the source: this should be the uiSourceCode of the actual html script.
      const reloadedUiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(reloadedScript);
      assertNotNullOrUndefined(reloadedUiSourceCode);
      assert.strictEqual(reloadedUiSourceCode.project().type(), Workspace.Workspace.projectTypes.Network);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL_HTML, INLINE_BREAKPOINT_RAW_LINE)({
        breakpointId: 'RELOADED_BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: reloadedScript.scriptId,
            lineNumber: INLINE_BREAKPOINT_RAW_LINE,
            columnNumber: 0,
          },
        ],
      });

      // Register our interest in an outgoing 'resume', which should be sent as soon as
      // we have set up all breakpoints during the instrumentation pause.
      const resumeSentPromise = registerListenerOnOutgoingMessage('Debugger.resume');

      // Inform the front-end about an instrumentation break.
      backend.dispatchDebuggerPause(reloadedScript, Protocol.Debugger.PausedEventReason.Instrumentation);

      // Wait for the breakpoints to be set, and the resume to be sent.
      await resumeSentPromise;

      // Verify the restored position.
      const reloadedBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(reloadedUiSourceCode);
      assert.strictEqual(1, reloadedBoundLocations.length);
      assert.deepEqual(reloadedBoundLocations[0].uiLocation.uiSourceCode, reloadedUiSourceCode);
      assert.strictEqual(INLINE_BREAKPOINT_RAW_LINE, reloadedBoundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, reloadedBoundLocations[0].uiLocation.columnNumber);
    });

    it('can restore breakpoints in source mapped scripts', async () => {
      setupPageResourceLoaderForSourceMap(sourceMapContent);

      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      // Add script with source map.
      const scriptInfo = {url: URL, content: COMPILED_SCRIPT_SOURCES_CONTENT};
      const sourceMapInfo = {url: SOURCE_MAP_URL, content: sourceMapContent};
      const script = await backend.addScript(target, scriptInfo, sourceMapInfo);

      // Get the uiSourceCode for the original source.
      const uiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
          debuggerModel, ORIGINAL_SCRIPT_SOURCE_URL, script.isContentScript());
      assertNotNullOrUndefined(uiSourceCode);

      // Set the breakpoint on the front-end/model side.
      const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 0, 0, ...DEFAULT_BREAKPOINT);
      assertNotNullOrUndefined(breakpoint);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL, 0)({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: script.scriptId,
            lineNumber: 0,
            columnNumber: 9,
          },
        ],
      });
      await breakpoint.refreshInDebugger();
      assert.deepEqual(Array.from(breakpoint.getUiSourceCodes()), [uiSourceCode]);

      // Verify the restored position.
      const boundLocations = breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
      assert.strictEqual(1, boundLocations.length);
      assert.strictEqual(0, boundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(9, boundLocations[0].uiLocation.columnNumber);

      // Disconnect from the target. This will also unload the script.
      breakpointManager.targetManager.removeTarget(target);

      // Make sure the source code for the script was removed from the breakpoint.
      assert.strictEqual(breakpoint.getUiSourceCodes().size, 0);

      // Remove the breakpoint.
      await breakpoint.remove(true /* keepInStorage */);

      // Create a new target.
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

      const reloadedDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(reloadedDebuggerModel);

      // Add the same script under a different scriptId.
      const reloadedScript = await backend.addScript(target, scriptInfo, sourceMapInfo);

      // Get the uiSourceCode for the original source.
      const reloadedUiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
          reloadedDebuggerModel, ORIGINAL_SCRIPT_SOURCE_URL, reloadedScript.isContentScript());
      assertNotNullOrUndefined(uiSourceCode);

      const unboundLocation = breakpointManager.breakpointLocationsForUISourceCode(reloadedUiSourceCode);
      assert.strictEqual(1, unboundLocation.length);
      assert.strictEqual(0, unboundLocation[0].uiLocation.lineNumber);
      assert.strictEqual(0, unboundLocation[0].uiLocation.columnNumber);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL, 0)({
        breakpointId: 'RELOADED_BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [{
          scriptId: reloadedScript.scriptId,
          lineNumber: 0,
          columnNumber: 9,
        }],
      });

      // Register our interest in an outgoing 'resume', which should be sent as soon as
      // we have set up all breakpoints during the instrumentation pause.
      const resumeSentPromise = registerListenerOnOutgoingMessage('Debugger.resume');

      // Inform the front-end about an instrumentation break.
      backend.dispatchDebuggerPause(reloadedScript, Protocol.Debugger.PausedEventReason.Instrumentation);

      // Wait for the breakpoints to be set, and the resume to be sent.
      await resumeSentPromise;

      // Verify the restored position.
      const reloadedBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(reloadedUiSourceCode);
      assert.strictEqual(1, reloadedBoundLocations.length);
      assert.strictEqual(0, reloadedBoundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(9, reloadedBoundLocations[0].uiLocation.columnNumber);
    });

    it('can restore breakpoints in scripts with language plugins', async () => {
      Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.WASM_DWARF_DEBUGGING);

      const pluginManager =
          Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().initPluginManagerForTest();
      assertNotNullOrUndefined(pluginManager);

      const scriptInfo = {url: URL, content: ''};
      const script = await backend.addScript(target, scriptInfo, null);

      class Plugin extends TestPlugin {
        constructor() {
          super('InstrumentationBreakpoints');
        }

        override handleScript(_: SDK.Script.Script) {
          return true;
        }

        override async sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
            Promise<Chrome.DevTools.RawLocationRange[]> {
          const {rawModuleId, columnNumber, lineNumber, sourceFileURL} = sourceLocation;
          if (lineNumber === 0 && columnNumber === 0 && sourceFileURL === 'test.cc') {
            return [{rawModuleId, startOffset: 0, endOffset: 0}];
          }
          return [];
        }

        override async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation):
            Promise<Chrome.DevTools.SourceLocation[]> {
          let sourceLocations: Chrome.DevTools.SourceLocation[] = [];
          if (rawLocation.codeOffset === 0) {
            sourceLocations =
                [{rawModuleId: rawLocation.rawModuleId, columnNumber: 0, lineNumber: 0, sourceFileURL: 'test.cc'}];
          }
          return sourceLocations;
        }

        override async addRawModule(_rawModuleId: string, _symbolsURL: string, _rawModule: Chrome.DevTools.RawModule):
            Promise<string[]> {
          return ['test.cc'];  // need to return something to get the script associated with the plugin.
        }
      }
      // Create a plugin that is able to produce a mapping for our script.
      pluginManager.addPlugin(new Plugin());

      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);

      let sourceURL;
      const sources = await pluginManager.getSourcesForScript(script);  // wait for plugin source setup to finish.
      if (!Array.isArray(sources)) {
        assert.fail('Sources is expected to be an array of sourceURLs');
      } else {
        assert.lengthOf(sources, 1);
        sourceURL = sources[0];
      }
      assertNotNullOrUndefined(sourceURL);

      // Get the uiSourceCode for the original source.
      const uiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForDebuggerLanguagePluginSourceURLPromise(
          debuggerModel, sourceURL);
      assertNotNullOrUndefined(uiSourceCode);

      // Set the breakpoint on the front-end/model side.
      const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 0, 0, ...DEFAULT_BREAKPOINT);
      assertNotNullOrUndefined(breakpoint);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL, 0)({
        breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: script.scriptId,
            lineNumber: 0,
            columnNumber: 0,
          },
        ],
      });

      // Await breakpoint updates.
      await breakpoint.refreshInDebugger();
      assert.deepEqual(Array.from(breakpoint.getUiSourceCodes()), [uiSourceCode]);

      // Verify the bound position.
      const boundLocations = breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
      assert.strictEqual(1, boundLocations.length);
      assert.strictEqual(0, boundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, boundLocations[0].uiLocation.columnNumber);

      // Disconnect from the target. This will also unload the script.
      breakpointManager.targetManager.removeTarget(target);

      // Make sure the source code for the script was removed from the breakpoint.
      assert.strictEqual(breakpoint.getUiSourceCodes().size, 0);

      // Remove the breakpoint.
      await breakpoint.remove(true /* keepInStorage */);

      // Create a new target.
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

      const reloadedDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(reloadedDebuggerModel);

      // Add the same script under a different scriptId.
      const reloadedScript = await backend.addScript(target, scriptInfo, null);

      // Get the uiSourceCode for the original source.
      const reloadedUiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForDebuggerLanguagePluginSourceURLPromise(
          reloadedDebuggerModel, sourceURL);
      assertNotNullOrUndefined(reloadedUiSourceCode);

      // Set the breakpoint response for our upcoming request.
      void backend.responderToBreakpointByUrlRequest(URL, 0)({
        breakpointId: 'RELOADED_BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [{
          scriptId: reloadedScript.scriptId,
          lineNumber: 0,
          columnNumber: 0,
        }],
      });

      // Register our interest in an outgoing 'resume', which should be sent as soon as
      // we have set up all breakpoints during the instrumentation pause.
      const resumeSentPromise = registerListenerOnOutgoingMessage('Debugger.resume');

      // Inform the front-end about an instrumentation break.
      backend.dispatchDebuggerPause(reloadedScript, Protocol.Debugger.PausedEventReason.Instrumentation);

      // Wait for the breakpoints to be set, and the resume to be sent.
      await resumeSentPromise;

      // Verify the restored position.
      const reloadedBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(reloadedUiSourceCode);
      assert.strictEqual(1, reloadedBoundLocations.length);
      assert.strictEqual(0, reloadedBoundLocations[0].uiLocation.lineNumber);
      assert.strictEqual(0, reloadedBoundLocations[0].uiLocation.columnNumber);

      Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.WASM_DWARF_DEBUGGING);
    });

    it('can move breakpoints to network files that are set in matching file system files', async () => {
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
      const fileName = Common.ParsedURL.ParsedURL.extractName(scriptDescription.url);

      const fileSystemPath = 'file://path/to/filesystem' as Platform.DevToolsPath.UrlString;
      const fileSystemFileUrl = fileSystemPath + '/' + fileName as Platform.DevToolsPath.UrlString;

      await testBreakpointMovedOnInstrumentationBreak(fileSystemPath, fileSystemFileUrl, scriptDescription.content);
    });

    it('can move breakpoints to network files that are set in override files', async () => {
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
      Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance(
          {forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance()});

      const fileSystemPath = 'file://path/to/overrides' as Platform.DevToolsPath.UrlString;
      const fielSystemFileUrl = fileSystemPath + '/site/script.js' as Platform.DevToolsPath.UrlString;
      const type = 'overrides';
      const content = '';

      await testBreakpointMovedOnInstrumentationBreak(fileSystemPath, fielSystemFileUrl, content, type);
    });
  });

  it('removes breakpoints that resolve to the same uiLocation as a previous breakpoint', async () => {
    const scriptInfo = {url: URL, content: 'console.log(\'hello\');'};
    const script = await backend.addScript(target, scriptInfo, null);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    // Set the breakpoint response for our upcoming requests. Both breakpoints should resolve
    // to the same raw location in order to have a clash.
    void backend.responderToBreakpointByUrlRequest(URL, 0)({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [{
        scriptId: script.scriptId,
        lineNumber: 0,
        columnNumber: 0,
      }],
    });

    void backend.responderToBreakpointByUrlRequest(URL, 2)({
      breakpointId: 'SLIDING_BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [{
        scriptId: script.scriptId,
        lineNumber: 0,
        columnNumber: 0,
      }],
    });

    const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
    assertNotNullOrUndefined(uiSourceCode);

    // Set the breakpoint on the front-end/model side.
    const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 0, 0, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);

    // This breakpoint will slide to lineNumber: 0, columnNumber: 0 and thus
    // clash with the previous breakpoint.
    const slidingBreakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 2, 0, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(slidingBreakpoint);

    // Wait until both breakpoints have run their updates.
    await breakpoint.refreshInDebugger();
    await slidingBreakpoint.refreshInDebugger();

    // The first breakpoint is kept on a clash, the second one should be removed.
    assert.isFalse(breakpoint.isRemoved);
    assert.isTrue(slidingBreakpoint.isRemoved);
  });

  it('Breakpoint does not keep file system source code alive after file system removal', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
    const breakpointLine = 0;
    const resolvedBreakpointLine = 1;

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const persistence =
        Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance(
        {forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance()});

    // Create a file system project and source code.
    const fileName = Common.ParsedURL.ParsedURL.extractName(scriptDescription.url);
    const fileSystemPath = 'file://path/to/filesystem' as Platform.DevToolsPath.UrlString;
    const fileSystemFileUrl = fileSystemPath + '/' + fileName as Platform.DevToolsPath.UrlString;
    const {uiSourceCode: fileSystemUiSourceCode, project} = createFileSystemFileForPersistenceTests(
        {fileSystemFileUrl, fileSystemPath}, scriptDescription.url, scriptDescription.content, target);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    // Add the same script via the debugger protocol.
    const bindingCreatedPromise = persistence.once(Persistence.Persistence.Events.BindingCreated);
    const script = await backend.addScript(target, scriptDescription, null);
    const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
    await bindingCreatedPromise;
    assertNotNullOrUndefined(uiSourceCode);

    // Set the breakpoint on the (network) script.
    void backend.responderToBreakpointByUrlRequest(URL, breakpointLine)({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [
        {
          scriptId: script.scriptId,
          lineNumber: resolvedBreakpointLine,
          columnNumber: 0,
        },
      ],
    });
    await breakpointManager.setBreakpoint(uiSourceCode, breakpointLine, 0, ...DEFAULT_BREAKPOINT);

    // Remove the file system project.
    const bindingRemovedPromise = persistence.once(Persistence.Persistence.Events.BindingRemoved);
    project.dispose();
    // Make sure the binding is removed.
    await bindingRemovedPromise;

    // After this, the breakpoint manager should not refer to the file system source code anymore, but
    // the file system breakpoint location should be in the storage.
    assert.isEmpty(breakpointManager.breakpointLocationsForUISourceCode(fileSystemUiSourceCode));
    assert.strictEqual(breakpointManager.storage.breakpointItems(fileSystemUiSourceCode.url()).length, 1);

    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
  });

  it('Breakpoints are set only into network project', async () => {
    const breakpointLine = 0;
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const persistence =
        Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance(
        {forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance()});

    // Create a file system project and source code.
    const fileName = Common.ParsedURL.ParsedURL.extractName(scriptDescription.url);
    const fileSystemPath = 'file://path/to/filesystem' as Platform.DevToolsPath.UrlString;
    const fileSystemFileUrl = fileSystemPath + '/' + fileName as Platform.DevToolsPath.UrlString;
    createFileSystemFileForPersistenceTests(
        {fileSystemFileUrl, fileSystemPath}, scriptDescription.url, scriptDescription.content, target);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    // Add the same script with the same URL via the debugger protocol.
    const bindingCreatedPromise = persistence.once(Persistence.Persistence.Events.BindingCreated);
    const fileScriptDescription = {...scriptDescription, url: fileSystemFileUrl};
    const script = await backend.addScript(target, fileScriptDescription, null);
    const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
    await bindingCreatedPromise;
    assertNotNullOrUndefined(uiSourceCode);

    let addedBreakpoint: Breakpoints.BreakpointManager.Breakpoint|null = null;
    breakpointManager.addEventListener(Breakpoints.BreakpointManager.Events.BreakpointAdded, ({data: {breakpoint}}) => {
      assert.isNull(addedBreakpoint, 'More than one breakpoint was added');
      addedBreakpoint = breakpoint;
    });

    // Set the breakpoint on the (network) script.
    void backend.responderToBreakpointByUrlRequest(fileSystemFileUrl, breakpointLine)({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [
        {
          scriptId: script.scriptId,
          lineNumber: 3,
          columnNumber: 3,
        },
      ],
    });
    const breakpoint =
        await breakpointManager.setBreakpoint(uiSourceCode, breakpointLine, undefined, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);

    // Expect that the breakpoint is only added to the network UI source code.
    assert.strictEqual(breakpoint, addedBreakpoint);
    assert.deepStrictEqual(Array.from(breakpoint.getUiSourceCodes()), [uiSourceCode]);
  });

  it('updates a breakpoint after live editing the underlying script', async () => {
    const scriptInfo = {url: URL, content: 'console.log(\'hello\');'};
    const script = await backend.addScript(target, scriptInfo, null);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    void backend.responderToBreakpointByUrlRequest(URL, 0)({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [{
        scriptId: script.scriptId,
        lineNumber: 0,
        columnNumber: 0,
      }],
    });

    setMockConnectionResponseHandler(
        'Debugger.setScriptSource', () => ({status: Protocol.Debugger.SetScriptSourceResponseStatus.Ok}));

    const uiSourceCode = await uiSourceCodeFromScript(debuggerModel, script);
    assertNotNullOrUndefined(uiSourceCode);

    // Set the breakpoint on the front-end/model side.
    const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 0, 0, ...DEFAULT_BREAKPOINT);
    assertNotNullOrUndefined(breakpoint);

    // Wait for the breakpoint to be set in the backend.
    await breakpoint.refreshInDebugger();

    // Simulate live editing. We do this from the UISourceCode instead of the `Script`
    // so the `ResourceScriptFile` updates the LiveLocation of the `ModelBreakpoint`
    // (which in turn updates the UILocation on the breakpoint).
    uiSourceCode.setWorkingCopy('\n\nconsole.log(\'hello\');');
    uiSourceCode.commitWorkingCopy();

    // Note that `UISourceCode` does not actually track how a breakpoint moves. This
    // is normally done by CodeMirror + DebuggerPlugin. This means even though the
    // console.log moves two lines down, we still try to reset the breakpoint on line 0.
    await backend.responderToBreakpointByUrlRequest(URL, 0)({
      breakpointId: 'BREAK_ID' as Protocol.Debugger.BreakpointId,
      locations: [{
        scriptId: script.scriptId,
        lineNumber: 0,
        columnNumber: 0,
      }],
    });
  });

  describe('can correctly set breakpoints for all pre-registered targets', () => {
    let mainUiSourceCode: Workspace.UISourceCode.UISourceCode;
    let workerUiSourceCode: Workspace.UISourceCode.UISourceCode;

    let workerScript: SDK.Script.Script;
    let mainScript: SDK.Script.Script;

    let breakpoint: Breakpoints.BreakpointManager.Breakpoint;

    function waitForBreakpointLocationsAdded() {
      let twoBreakpointLocationsCallback: () => void;
      const twoBreakpointLocationsAddedPromise = new Promise<void>(resolve => {
        twoBreakpointLocationsCallback = resolve;
      });
      breakpointManager.addEventListener(Breakpoints.BreakpointManager.Events.BreakpointAdded, () => {
        if (breakpointManager.allBreakpointLocations().length === 2) {
          twoBreakpointLocationsCallback();
        }
      });
      return twoBreakpointLocationsAddedPromise;
    }

    beforeEach(async () => {
      setupPageResourceLoaderForSourceMap(sourceMapContent);

      // Create a worker target.
      const workerTarget = createTarget({name: 'worker', parentTarget: target});

      // Add script with source map.
      const scriptInfo = {url: URL, content: COMPILED_SCRIPT_SOURCES_CONTENT};
      const sourceMapInfo = {url: SOURCE_MAP_URL, content: sourceMapContent};
      mainScript = await backend.addScript(target, scriptInfo, sourceMapInfo);
      workerScript = await backend.addScript(workerTarget, scriptInfo, sourceMapInfo);

      // Get the uiSourceCode for the original source in the main target.
      mainUiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
          mainScript.debuggerModel, ORIGINAL_SCRIPT_SOURCE_URL, mainScript.isContentScript());
      assertNotNullOrUndefined(mainUiSourceCode);

      // Get the uiSourceCode for the original source in the worker target.
      workerUiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
          workerScript.debuggerModel, ORIGINAL_SCRIPT_SOURCE_URL, workerScript.isContentScript());
      assertNotNullOrUndefined(mainUiSourceCode);

      // Stub the 'modelAdded' function that is called in the Breakpoint prototype.
      // The 'modelAdded' will kick off updating the debugger of each target
      // as soon as a new breakpoint was created.
      // By stubbing it and ignoring what should be done,
      // we can manually call 'modelAdded' in the order that we want,
      // and thus control which target is taken care of first.
      const modelAddedStub =
          sinon.stub(Breakpoints.BreakpointManager.Breakpoint.prototype, 'modelAdded').callsFake((() => {}));

      // Set the breakpoint on the main target, but note that the debugger won't be updated.
      const bp = await breakpointManager.setBreakpoint(mainUiSourceCode, 0, 0, ...DEFAULT_BREAKPOINT);
      assertNotNullOrUndefined(bp);
      breakpoint = bp;

      // Now restore the actual behavior of 'modelAdded'.
      modelAddedStub.restore();
    });

    it('if the target whose uiSourceCode was used for breakpoint setting is handled last', async () => {
      // Handle setting breakpoint on the worker first.
      breakpoint.modelAdded(workerScript.debuggerModel);
      await backend.responderToBreakpointByUrlRequest(URL, 0)({
        breakpointId: 'WORKER_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: workerScript.scriptId,
            lineNumber: 0,
            columnNumber: 0,
          },
        ],
      });

      // Handle setting breakpoint on the main target next.
      breakpoint.modelAdded(mainScript.debuggerModel);
      await backend.responderToBreakpointByUrlRequest(URL, 0)({
        breakpointId: 'MAIN_BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: mainScript.scriptId,
            lineNumber: 0,
            columnNumber: 0,
          },
        ],
      });

      await waitForBreakpointLocationsAdded();

      assert.deepEqual(Array.from(breakpoint.getUiSourceCodes()), [mainUiSourceCode, workerUiSourceCode]);

      const mainBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(mainUiSourceCode);
      assert.strictEqual(1, mainBoundLocations.length);

      const workerBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(workerUiSourceCode);
      assert.strictEqual(1, workerBoundLocations.length);
    });

    it('if the target whose uiSourceCode was used for breakpoint setting is handled first', async () => {
      // Handle setting breakpoint on the main target first.
      breakpoint.modelAdded(mainScript.debuggerModel);
      await backend.responderToBreakpointByUrlRequest(URL, 0)({
        breakpointId: 'MAIN_BREAK_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: mainScript.scriptId,
            lineNumber: 0,
            columnNumber: 0,
          },
        ],
      });

      // Handle setting breakpoint on the worker next.
      breakpoint.modelAdded(workerScript.debuggerModel);
      await backend.responderToBreakpointByUrlRequest(URL, 0)({
        breakpointId: 'WORKER_ID' as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: workerScript.scriptId,
            lineNumber: 0,
            columnNumber: 0,
          },
        ],
      });

      await waitForBreakpointLocationsAdded();

      assert.deepEqual(Array.from(breakpoint.getUiSourceCodes()), [mainUiSourceCode, workerUiSourceCode]);

      const mainBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(mainUiSourceCode);
      assert.strictEqual(1, mainBoundLocations.length);

      const workerBoundLocations = breakpointManager.breakpointLocationsForUISourceCode(workerUiSourceCode);
      assert.strictEqual(1, workerBoundLocations.length);
    });
  });

  describe('supports modern Web development workflows', () => {
    it('supports webpack code splitting', async () => {
      // This is basically the "Shared code with webpack entry point code-splitting" scenario
      // outlined in http://go/devtools-source-identities, where two routes (`route1.ts` and
      // `route2.ts`) share some common code (`shared.ts`), and webpack is configured to spit
      // out a dedicated bundle for each route (`route1.js` and `route2.js`). The demo can be
      // found at https://devtools-source-identities.glitch.me/webpack-code-split/ for further
      // reference.
      const sourceRoot = 'webpack:///src';

      // Load the script and source map for the first route.
      const route1ScriptInfo = {
        url: 'http://example.com/route1.js',
        content: 'function f(x){}\nf(1)',
      };
      const route1SourceMapInfo = {
        url: `${route1ScriptInfo.url}.map`,
        content: encodeSourceMap(['0:0 => shared.ts:0:0', '1:0 => route1.ts:0:0'], sourceRoot),
      };
      const [firstSharedUISourceCode, route1Script] = await Promise.all([
        debuggerWorkspaceBinding.waitForUISourceCodeAdded(
            `${sourceRoot}/shared.ts` as Platform.DevToolsPath.UrlString, target),
        backend.addScript(target, route1ScriptInfo, route1SourceMapInfo),
      ]);

      // Set a breakpoint in `shared.ts`.
      await Promise.all([
        backend.responderToBreakpointByUrlRequest(route1ScriptInfo.url, 0)({
          breakpointId: 'ROUTE1_JS_BREAK_INITIAL_ID' as Protocol.Debugger.BreakpointId,
          locations: [
            {
              scriptId: route1Script.scriptId,
              lineNumber: 0,
              columnNumber: 0,
            },
          ],
        }),
        breakpointManager.setBreakpoint(firstSharedUISourceCode, 0, 0, ...DEFAULT_BREAKPOINT),
      ]);

      // Now inject a second route that also references `shared.ts`, which should trigger
      // removal of the original breakpoint in `route1.js`.
      const route2ScriptInfo = {
        url: 'http://example.com/route2.js',
        content: 'function f(x){}\nf(2)',
      };
      const route2SourceMapInfo = {
        url: `${route2ScriptInfo.url}.map`,
        content: encodeSourceMap(['0:0 => shared.ts:0:0', '1:0 => route2.ts:0:0'], sourceRoot),
      };
      const route1SetBreakpointByUrlRequest = backend.responderToBreakpointByUrlRequest(route1ScriptInfo.url, 0);
      const route2SetBreakpointByUrlRequest = backend.responderToBreakpointByUrlRequest(route2ScriptInfo.url, 0);
      const [, route2Script] = await Promise.all([
        backend.breakpointRemovedPromise('ROUTE1_JS_BREAK_INITIAL_ID' as Protocol.Debugger.BreakpointId),
        backend.addScript(target, route2ScriptInfo, route2SourceMapInfo),
      ]);

      // Now the BreakpointManager should migrate the breakpoints from the
      // first `shared.ts` to the second `shared.ts`.
      await Promise.all([
        route1SetBreakpointByUrlRequest({
          breakpointId: 'ROUTE1_JS_BREAK_ID' as Protocol.Debugger.BreakpointId,
          locations: [
            {
              scriptId: route1Script.scriptId,
              lineNumber: 0,
              columnNumber: 0,
            },
          ],
        }),
        route2SetBreakpointByUrlRequest({
          breakpointId: 'ROUTE2_JS_BREAK_ID' as Protocol.Debugger.BreakpointId,
          locations: [
            {
              scriptId: route2Script.scriptId,
              lineNumber: 0,
              columnNumber: 0,
            },
          ],
        }),
      ]);
    });
  });
});

describeWithMockConnection('BreakpointManager storage', () => {
  let target: SDK.Target.Target;
  let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  beforeEach(async () => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
    target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    resetRecordedMetrics();
  });

  it('records breakpoint count after loading from storage', async () => {
    // Create 200 breakpoints in the storage.
    const breakpoints: Breakpoints.BreakpointManager.BreakpointStorageState[] = [];
    for (let i = 0; i < 201; i++) {
      breakpoints.push({
        url: 'http://example.com/script.js' as Platform.DevToolsPath.UrlString,
        resourceTypeName: 'script',
        lineNumber: i,
        condition: '' as Breakpoints.BreakpointManager.UserCondition,
        enabled: true,
        isLogpoint: false,
      });
    }
    Common.Settings.Settings.instance().createLocalSetting('breakpoints', breakpoints).set(breakpoints);

    assert.isFalse(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.BreakpointsRestoredFromStorageCount,
        Host.UserMetrics.BreakpointsRestoredFromStorageCount.LessThan300));

    // Creating breakpoint manager to load the breakpoints from storage and record the breakpoint count.
    Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      targetManager: SDK.TargetManager.TargetManager.instance(),
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      debuggerWorkspaceBinding,
    });

    // Verify that we have recorded the breakpoint count in the 100-300 bucket.
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.BreakpointsRestoredFromStorageCount,
        Host.UserMetrics.BreakpointsRestoredFromStorageCount.LessThan300));

    assert.isFalse(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.BreakpointsRestoredFromStorageCount,
        Host.UserMetrics.BreakpointsRestoredFromStorageCount.LessThan100));
    assert.isFalse(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.BreakpointsRestoredFromStorageCount,
        Host.UserMetrics.BreakpointsRestoredFromStorageCount.LessThan1000));
  });
});

function createFakeScriptMapping(
    debuggerModel: SDK.DebuggerModel.DebuggerModel, uiSourceCode: Workspace.UISourceCode.UISourceCode,
    uiLineNumber: number,
    scriptId: Protocol.Runtime.ScriptId): Bindings.DebuggerWorkspaceBinding.DebuggerSourceMapping {
  const sdkLocation = new SDK.DebuggerModel.Location(debuggerModel, scriptId, 13);
  const uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, uiLineNumber);
  const mapping: Bindings.DebuggerWorkspaceBinding.DebuggerSourceMapping = {
    rawLocationToUILocation: (_: SDK.DebuggerModel.Location) => uiLocation,
    uiLocationToRawLocations:
        (_uiSourceCode: Workspace.UISourceCode.UISourceCode, _lineNumber: number,
         _columnNumber?: number) => [sdkLocation],
    uiLocationRangeToRawLocationRanges:
        (_uiSourceCode: Workspace.UISourceCode.UISourceCode, _textRange: TextUtils.TextRange.TextRange) => {
          throw new Error('Not implemented');
        },
  };
  return mapping;
}
