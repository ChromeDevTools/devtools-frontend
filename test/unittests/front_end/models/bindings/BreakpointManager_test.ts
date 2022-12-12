// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';

import {createTarget, enableFeatureForTest} from '../../helpers/EnvironmentHelpers.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import {
  describeWithMockConnection,
  registerListenerOnOutgoingMessage,
} from '../../helpers/MockConnection.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import {
  createContentProviderUISourceCode,
  createFileSystemUISourceCode,
} from '../../helpers/UISourceCodeHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {TestPlugin} from '../../helpers/LanguagePluginHelpers.js';
import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';
import {setupPageResourceLoaderForSourceMap} from '../../helpers/SourceMapHelpers.js';

describeWithRealConnection('BreakpointManager', () => {
  const URL = 'file:///tmp/example.html' as Platform.DevToolsPath.UrlString;
  const SCRIPT_ID = 'SCRIPT_ID' as Protocol.Runtime.ScriptId;
  const BREAKPOINT_RAW_LOCATION_LINE = 42;
  const BREAKPOINT_ID = 'BREAKPOINT_ID' as Protocol.Debugger.BreakpointId;
  const JS_MIME_TYPE = 'text/javascript';

  let target: SDK.Target.Target;
  let breakpointManager: Bindings.BreakpointManager.BreakpointManager;
  class TestDebuggerModel extends SDK.DebuggerModel.DebuggerModel {
    readonly #script = new SDK.Script.Script(
        this, SCRIPT_ID as Protocol.Runtime.ScriptId, URL, 0, 0, 0, 0, 0, '', false, false, undefined, false, 0, null,
        null, null, null, null, null);

    constructor(target: SDK.Target.Target) {
      super(target);
    }

    async setBreakpointByURL(
        _url: Platform.DevToolsPath.UrlString, _lineNumber: number, _columnNumber?: number,
        _condition?: string): Promise<SDK.DebuggerModel.SetBreakpointResult> {
      return Promise.resolve({
        breakpointId: BREAKPOINT_ID,
        locations: [new SDK.DebuggerModel.Location(this, SCRIPT_ID, BREAKPOINT_RAW_LOCATION_LINE)],
      });
    }

    async removeBreakpoint(): Promise<void> {
      return;
    }

    scriptForId(scriptId: string): SDK.Script.Script|null {
      if (scriptId === SCRIPT_ID) {
        return this.#script;
      }
      return null;
    }

    isReadyToPause(): boolean {
      return true;
    }
  }

  // Tests if a breakpoint set on a filesystem file was successfully moved to the network file when we expect it.
  async function runBreakpointMovedTest(fileSystem: {
    uiSourceCode: Workspace.UISourceCode.UISourceCode,
    project: Persistence.FileSystemWorkspaceBinding.FileSystem,
  }) {
    const debuggerModel = new TestDebuggerModel(target);
    const breakpoint = await breakpointManager.setBreakpoint(
        fileSystem.uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

    const content = await fileSystem.project.requestFileContent(fileSystem.uiSourceCode);
    const metadata = await fileSystem.project.requestMetadata(fileSystem.uiSourceCode);
    assertNotNullOrUndefined(metadata);
    assertNotNullOrUndefined(content.content);

    const networkURL = 'http://www.google.com/example.js' as Platform.DevToolsPath.UrlString;
    const network = createContentProviderUISourceCode({
      url: networkURL,
      content: content.content,
      mimeType: fileSystem.uiSourceCode.mimeType(),
      metadata,
      projectType: Workspace.Workspace.projectTypes.Network,
    });

    const script = new SDK.Script.Script(
        debuggerModel, SCRIPT_ID, networkURL, 0, 0, 43, 0, 0, '0', true, false, undefined, false, 10, null, null, null,
        null, null, null);

    // Check that only the filesystem project UISourceCode has a breakpoint.
    assert.lengthOf(breakpointManager.breakpointLocationsForUISourceCode(fileSystem.uiSourceCode), 1);
    assert.isEmpty(breakpointManager.breakpointLocationsForUISourceCode(network.uiSourceCode));

    // Get the UISourceCode and await binding updates. This call should make sure to update all breakpoints.
    await breakpointManager.getUISourceCodeWithUpdatedBreakpointInfo(script);

    // Check that the network project UISourceCode has a breakpoint now.
    const uiLocations = breakpointManager.breakpointLocationsForUISourceCode(network.uiSourceCode);
    assert.lengthOf(uiLocations, 1);

    // We need to remove the breakpoint on the file system and on the network project.
    await breakpoint.remove(false);
    await uiLocations[0].breakpoint.remove(false);

    Workspace.Workspace.WorkspaceImpl.instance().removeProject(network.project);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(fileSystem.project);
  }

  beforeEach(() => {
    breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();
    assertNotNullOrUndefined(breakpointManager);

    const targetManager = SDK.TargetManager.TargetManager.instance();
    const mainTarget = targetManager.mainTarget();
    assertNotNullOrUndefined(mainTarget);
    target = mainTarget;
  });

  it('allows awaiting the restoration of breakpoints', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);

    const {uiSourceCode, project} = createContentProviderUISourceCode({url: URL, mimeType: JS_MIME_TYPE});
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

    // Create a new DebuggerModel and notify the breakpoint engine about it.
    const debuggerModel = new TestDebuggerModel(target);
    breakpoint.modelAdded(debuggerModel);

    // Make sure that we await all updates that are triggered by adding the model.
    await breakpoint.updateBreakpoint();

    // Retrieve the ModelBreakpoint that is linked to our DebuggerModel.
    const modelBreakpoint = breakpoint.modelBreakpoint(debuggerModel);
    assertNotNullOrUndefined(modelBreakpoint);

    // Make sure that we do not have a linked script yet.
    assert.isNull(modelBreakpoint.currentState);

    // Create a fake mapping that can be used to set a breakpoint.
    const mapping = createFakeScriptMapping(debuggerModel, uiSourceCode, 42, SCRIPT_ID);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);

    // Now await restoring the breakpoint.
    // A successful restore should update the ModelBreakpoint of the DebuggerModel
    // to reflect a state, in which we have successfully set a breakpoint (i.e. a script id
    // is available).
    const script = debuggerModel.scriptForId(SCRIPT_ID);
    assertNotNullOrUndefined(script);
    await breakpointManager.restoreBreakpointsForScript(script);
    assertNotNullOrUndefined(modelBreakpoint.currentState);
    assert.lengthOf(modelBreakpoint.currentState.positions, 1);
    assert.strictEqual(modelBreakpoint.currentState.positions[0].url, URL);

    // Clean up.
    await breakpoint.remove(false);
    breakpointManager.modelRemoved(debuggerModel);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
  });

  it('allows awaiting the restoration of breakpoints with language plugins', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.WASM_DWARF_DEBUGGING);

    const pluginManager =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().initPluginManagerForTest();
    assertNotNullOrUndefined(pluginManager);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    const {uiSourceCode, project} =
        createContentProviderUISourceCode({url: 'test.cc' as Platform.DevToolsPath.UrlString, mimeType: JS_MIME_TYPE});
    assertNotNullOrUndefined(uiSourceCode);
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

    // Make sure that we await all updates that are triggered by adding the model.
    await breakpoint.updateBreakpoint();

    // Retrieve the ModelBreakpoint that is linked to our DebuggerModel.
    const modelBreakpoint = breakpoint.modelBreakpoint(debuggerModel);
    assertNotNullOrUndefined(modelBreakpoint);

    // Make sure that we do not have a linked script yet.
    assert.isNull(modelBreakpoint.currentState);

    class Plugin extends TestPlugin {
      constructor() {
        super('InstrumentationBreakpoints');
      }

      handleScript(script: SDK.Script.Script) {
        return script.scriptId === SCRIPT_ID;
      }

      async sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
          Promise<Chrome.DevTools.RawLocationRange[]> {
        const {rawModuleId, columnNumber, lineNumber, sourceFileURL} = sourceLocation;
        if (lineNumber === 0 && columnNumber === 0 && sourceFileURL === 'test.cc') {
          return [{rawModuleId, startOffset: 0, endOffset: 0}];
        }
        return [];
      }

      async addRawModule(_rawModuleId: string, _symbolsURL: string, _rawModule: Chrome.DevTools.RawModule):
          Promise<string[]> {
        return ['test.cc'];  // need to return something to get the script associated with the plugin.
      }
    }
    // Create a plugin that is able to produce a mapping for our script.
    pluginManager.addPlugin(new Plugin());

    const script = debuggerModel.parsedScriptSource(
        SCRIPT_ID, URL, 0, 0, 0, 0, 0, '', undefined, false, undefined, false, false, 0, null, null, null, null, null,
        null);
    await pluginManager.getSourcesForScript(script);  // wait for plugin source setup to finish.

    await breakpointManager.restoreBreakpointsForScript(script);
    assertNotNullOrUndefined(modelBreakpoint.currentState);
    assert.lengthOf(modelBreakpoint.currentState.positions, 1);
    assert.strictEqual(modelBreakpoint.currentState.positions[0].url, URL);

    // Clean up.
    await breakpoint.remove(false);
    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.WASM_DWARF_DEBUGGING);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().initPluginManagerForTest();
    debuggerModel.globalObjectCleared();
  });

  it('allows awaiting on scheduled update in debugger', async () => {
    const {uiSourceCode, project} = createContentProviderUISourceCode({url: URL, mimeType: JS_MIME_TYPE});

    const debuggerModel = new TestDebuggerModel(target);
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 42, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

    const modelBreakpoint = new Bindings.BreakpointManager.ModelBreakpoint(
        debuggerModel, breakpoint, breakpointManager.debuggerWorkspaceBinding);
    const mapping = createFakeScriptMapping(debuggerModel, uiSourceCode, 42, SCRIPT_ID);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);
    assert.isNull(breakpoint.currentState);
    const update = modelBreakpoint.scheduleUpdateInDebugger();
    assert.isNull(breakpoint.currentState);
    const result = await update;
    // Make sure that no error occurred.
    assert.isTrue(result === Bindings.BreakpointManager.DebuggerUpdateResult.OK);
    assert.strictEqual(breakpoint.currentState?.positions[0]?.lineNumber, 13);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
    await breakpoint.remove(false);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
  });

  it('allows awaiting on removal of breakpoint in debugger', async () => {
    const {uiSourceCode, project} = createContentProviderUISourceCode({url: URL, mimeType: JS_MIME_TYPE});
    // Set up breakpoint with UISourceCode, and fake DebuggerModel.
    const debuggerModel = new TestDebuggerModel(target);
    const removeSpy = sinon.spy(debuggerModel, 'removeBreakpoint');
    const setSpy = sinon.spy(debuggerModel, 'setBreakpointByURL');

    // We need to stub the debuggerModel of the real connection to make sure that we
    // can await the removal of the breakpoint (since it will await updating all
    // DebuggerModels, including the one with the real connection).
    const realDebugger = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(realDebugger);
    sinon.stub(realDebugger, 'setBreakpointByURL')
        .callsFake(() => Promise.resolve({breakpointId: BREAKPOINT_ID, locations: []}));
    sinon.stub(realDebugger, 'removeBreakpoint').callsFake(() => Promise.resolve());

    const mapping = createFakeScriptMapping(debuggerModel, uiSourceCode, 42, SCRIPT_ID);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);

    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 42, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);
    breakpoint.modelAdded(debuggerModel);

    // Make sure that the location could be resolved, and that we could set a breakpoint.
    const modelBreakpoint = breakpoint.modelBreakpoint(debuggerModel);
    assertNotNullOrUndefined(modelBreakpoint);
    await modelBreakpoint.scheduleUpdateInDebugger();
    assertNotNullOrUndefined(modelBreakpoint.currentState);
    assert.isTrue(setSpy.calledOnce);

    // Test if awaiting breakpoint.remove is actually removing the state.
    await breakpoint.remove(false);
    assert.isNull(modelBreakpoint.currentState);
    assert.isTrue(removeSpy.calledOnce);

    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
  });

  it('can wait for file system breakpoints to be mapped to network ui source code', async () => {
    const url = 'file://example.js' as Platform.DevToolsPath.UrlString;
    const content = 'console.log(3)';
    const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(new Date(), content.length);

    const fileSystem =
        createFileSystemUISourceCode({url, content, mimeType: JS_MIME_TYPE, metadata, autoMapping: true});

    await runBreakpointMovedTest(fileSystem);
  });

  describe('with persistence network overrides enabled', () => {
    let currentPersistenceSetting: boolean;

    beforeEach(() => {
      // Temporarily enable overrides for test.
      currentPersistenceSetting =
          Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').get();
    });

    afterEach(() => {
      // Reset default setting.
      Common.Settings.Settings.instance()
          .moduleSetting('persistenceNetworkOverridesEnabled')
          .set(currentPersistenceSetting);
    });

    it('can wait for breakpoints in overrides to be mapped to network ui source code', async () => {
      Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set('true');
      const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(new Date(), 0);
      const url = 'file://path/to/overrides/www.google.com/example.js' as Platform.DevToolsPath.UrlString;
      const fileSystem = createFileSystemUISourceCode({
        url,
        metadata,
        mimeType: JS_MIME_TYPE,
        autoMapping: true,
        type: 'overrides',
        fileSystemPath: 'file://path/to/overrides',
      });

      // Add a spy to make sure that the binding is coming from the NetworkPersistenceManager, and not the Automapping.
      const spy = sinon.spy(Persistence.Persistence.PersistenceImpl.instance(), 'addBinding');
      await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().setProject(fileSystem.project);
      await runBreakpointMovedTest(fileSystem);
      assert.isTrue(spy.calledOnce);
    });
  });

  describe('Breakpoints', () => {
    it('are removed after a location clash', async () => {
      const {uiSourceCode, project} = createContentProviderUISourceCode({url: URL, mimeType: JS_MIME_TYPE});
      // Use TestDebuggerModel, which always returns the same location to create a location crash.
      const debuggerModel = new TestDebuggerModel(target);

      // Create first breakpoint that resolves to that location.
      const breakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, 42, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);
      breakpoint.modelAdded(debuggerModel);
      assert.isFalse(breakpoint.getIsRemoved());

      // Create second breakpoint that will resolve to the same location.
      const slidingBreakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, 43, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);
      const removedSpy = sinon.spy(slidingBreakpoint, 'remove');
      slidingBreakpoint.modelAdded(debuggerModel);

      const mapping = createFakeScriptMapping(debuggerModel, uiSourceCode, 42, SCRIPT_ID);
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);

      await breakpoint.updateBreakpoint();
      await slidingBreakpoint.updateBreakpoint();

      // First breakpoint is kept, while second is removed.
      assert.isFalse(breakpoint.getIsRemoved());
      assert.isTrue(slidingBreakpoint.getIsRemoved());

      // Breakpoint was removed and is not kept in storage.
      assert.isTrue(removedSpy.calledOnceWith(true));

      await breakpoint.remove(false);
      Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
    });

    it('are removed and kept in storage after a back-end error', async () => {
      const {uiSourceCode, project} = createContentProviderUISourceCode({url: URL, mimeType: JS_MIME_TYPE});

      // Use TestDebuggerModel, which always returns the same location to create a location crash.
      const debuggerModel = new TestDebuggerModel(target);

      // Simulates a back-end error.
      sinon.stub(debuggerModel, 'setBreakpointByURL').callsFake(() => {
        return Promise.resolve({locations: [], breakpointId: null} as SDK.DebuggerModel.SetBreakpointResult);
      });
      const mapping = createFakeScriptMapping(debuggerModel, uiSourceCode, 42, SCRIPT_ID);
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);

      const breakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, 42, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);
      breakpoint.modelAdded(debuggerModel);
      const removedSpy = sinon.spy(breakpoint, 'remove');
      await breakpoint.updateBreakpoint();

      // Breakpoint was removed and is kept in storage.
      assert.isTrue(breakpoint.getIsRemoved());
      assert.isTrue(removedSpy.calledWith(true));

      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
      Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
    });
  });
});

describeWithMockConnection('BreakpointManager (mock backend)', () => {
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
  };

  const URL = 'http://site/script.js' as Platform.DevToolsPath.UrlString;
  const scriptDescription = {
    url: URL,
    content: 'console.log(1);\nconsole.log(2);\n',
    startLine: 0,
    startColumn: 0,
    hasSourceURL: false,
  };

  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
  let breakpointManager: Bindings.BreakpointManager.BreakpointManager;
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
    backend = new MockProtocolBackend();
    target = createTarget();

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

    breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
  });

  async function uiSourceCodeFromScript(debuggerModel: SDK.DebuggerModel.DebuggerModel, script: SDK.Script.Script):
      Promise<Workspace.UISourceCode.UISourceCode|null> {
    const rawLocation = debuggerModel.createRawLocation(script, 0, 0);
    const uiLocation = await breakpointManager.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
    return uiLocation?.uiSourceCode ?? null;
  }

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
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);
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

  it('can restore breakpoints in source mapped scripts', async () => {
    enableFeatureForTest('instrumentationBreakpoints');

    const sourcesContent = 'function foo() {\n  console.log(\'Hello\');\n}\n';
    const sourceMapUrl = 'https://site/script.js.map' as Platform.DevToolsPath.UrlString;
    const sourceURL = 'https://site/original-script.js' as Platform.DevToolsPath.UrlString;

    // Created with `terser -m -o script.min.js --source-map "includeSources;url=script.min.js.map" original-script.js`
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'names': ['foo', 'console', 'log'],
      'sources': ['/original-script.js'],
      'sourcesContent': [sourcesContent],
      'mappings': 'AAAA,SAASA,MACPC,QAAQC,IAAI,QACd',
    });
    setupPageResourceLoaderForSourceMap(sourceMapContent);

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    // Add script with source map.
    const scriptInfo = {url: URL, content: sourcesContent};
    const sourceMapInfo = {url: sourceMapUrl, content: sourceMapContent};
    const script = await backend.addScript(target, scriptInfo, sourceMapInfo);

    // Get the uiSourceCode for the original source.
    const uiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
        debuggerModel, sourceURL, script.isContentScript());
    assertNotNullOrUndefined(uiSourceCode);

    // Set the breakpoint on the front-end/model side.
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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

    const reloadedDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(reloadedDebuggerModel);

    // Add the same script under a different scriptId.
    const reloadedScript = await backend.addScript(target, scriptInfo, sourceMapInfo);

    // Get the uiSourceCode for the original source.
    const reloadedUiSourceCode = await debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
        reloadedDebuggerModel, sourceURL, reloadedScript.isContentScript());
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

    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
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
  };
  return mapping;
}
