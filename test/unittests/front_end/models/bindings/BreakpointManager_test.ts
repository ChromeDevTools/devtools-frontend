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

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import {
  dispatchEvent,
  describeWithMockConnection,
  registerListenerOnOutgoingMessage,
} from '../../helpers/MockConnection.js';
import {
  createContentProviderUISourceCode,
  createFileSystemUISourceCode,
} from '../../helpers/UISourceCodeHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {TestPlugin} from '../../helpers/LanguagePluginHelpers.js';
import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';
import {setupPageResourceLoaderForSourceMap} from '../../helpers/SourceMapHelpers.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';

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

  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
  let breakpointManager: Bindings.BreakpointManager.BreakpointManager;
  let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  beforeEach(async () => {
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.BREAKPOINT_VIEW, '', true);

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
      const breakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, BREAKPOINT_SCRIPT_LINE, 2, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

      const removedSpy = sinon.spy(breakpoint, 'remove');
      await breakpoint.updateBreakpoint();

      // Breakpoint was removed and is kept in storage.
      assert.isTrue(breakpoint.getIsRemoved());
      assert.isTrue(removedSpy.calledWith(true));
    });
  });

  it('allows awaiting the restoration of breakpoints', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assertNotNullOrUndefined(debuggerModel);

    const {uiSourceCode, project} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'});
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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
    assert.lengthOf(modelBreakpoint.currentState.positions, 1);
    assert.strictEqual(modelBreakpoint.currentState.positions[0].url, URL);

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
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 13, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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

    assert.isNull(breakpoint.currentState);
    const update = modelBreakpoint.scheduleUpdateInDebugger();
    assert.isNull(breakpoint.currentState);
    const result = await update;
    // Make sure that no error occurred.
    assert.isTrue(result === Bindings.BreakpointManager.DebuggerUpdateResult.OK);
    assert.strictEqual(breakpoint.currentState?.positions[0]?.lineNumber, 13);
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

    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 13, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);
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

  describe('with instrumentation breakpoints turned on', () => {
    beforeEach(() => {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
      breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance(
          {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
    });

    afterEach(() => {
      Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS);
    });

    async function testBreakpointMovedOnInstrumentationBreak(
        fileSystemDescription: {fileSystemPath: string, url: string, content: string, type?: string}) {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);
      const mimeType = 'text/javascript';
      const mainFrameId = 'main' as Protocol.Page.FrameId;

      // Create resource that is required for binding the file system uiSourceCode and the
      // network uiSourceCode.
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);

      const resource = new SDK.Resource.Resource(
          resourceTreeModel, null, scriptDescription.url, scriptDescription.url, mainFrameId, null,
          Common.ResourceType.ResourceType.fromMimeType('text/javascript'), mimeType, null,
          scriptDescription.content.length);
      const frame = resourceTreeModel.frameForId(mainFrameId);
      assertNotNullOrUndefined(frame);

      frame.addResource(resource);

      // Create the file system uiSourceCode with the same metadata as the script's resource file.
      const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(resource.lastModified(), resource.contentSize());
      const fileSystem = createFileSystemUISourceCode({
        url: fileSystemDescription.url as Platform.DevToolsPath.UrlString,
        content: fileSystemDescription.content,
        fileSystemPath: fileSystemDescription.fileSystemPath,
        mimeType,
        metadata,
        autoMapping: true,
        type: fileSystemDescription.type,
      });

      const breakpointLine = 0;
      const resolvedBreakpointLine = 1;

      // Set the breakpoint on the file system uiSourceCode.
      await breakpointManager.setBreakpoint(
          fileSystem.uiSourceCode, breakpointLine, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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

      fileSystem.project.dispose();
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
      const breakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, breakpointLine, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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
      const breakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, BREAKPOINT_SCRIPT_LINE, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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
      const breakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, INLINE_BREAKPOINT_RAW_LINE, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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

        handleScript(_: SDK.Script.Script) {
          return true;
        }

        async sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
            Promise<Chrome.DevTools.RawLocationRange[]> {
          const {rawModuleId, columnNumber, lineNumber, sourceFileURL} = sourceLocation;
          if (lineNumber === 0 && columnNumber === 0 && sourceFileURL === 'test.cc') {
            return [{rawModuleId, startOffset: 0, endOffset: 0}];
          }
          return [];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation):
            Promise<Chrome.DevTools.SourceLocation[]> {
          let sourceLocations: Chrome.DevTools.SourceLocation[] = [];
          if (rawLocation.codeOffset === 0) {
            sourceLocations =
                [{rawModuleId: rawLocation.rawModuleId, columnNumber: 0, lineNumber: 0, sourceFileURL: 'test.cc'}];
          }
          return sourceLocations;
        }

        async addRawModule(_rawModuleId: string, _symbolsURL: string, _rawModule: Chrome.DevTools.RawModule):
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
      const breakpoint = await breakpointManager.setBreakpoint(
          uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

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
      const fileSystemPath = 'file://path/to/filesystem';

      const fileSystemResourceDescription = {
        url: fileSystemPath + '/' + fileName,
        fileSystemPath,
        content: scriptDescription.content,
      };

      await testBreakpointMovedOnInstrumentationBreak(fileSystemResourceDescription);
    });

    it('can move breakpoints to network files that are set in override files', async () => {
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.HEADER_OVERRIDES, '', true);

      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
      Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance(
          {forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance()});

      const fileSystemPath = 'file://path/to/overrides';
      const fileSystemResourceDescription = {
        url: fileSystemPath + '/site/script.js',
        fileSystemPath,
        content: scriptDescription.content,
        type: 'overrides',
      };

      await testBreakpointMovedOnInstrumentationBreak(fileSystemResourceDescription);
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
    const breakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

    // This breakpoint will slide to lineNumber: 0, columnNumber: 0 and thus
    // clash with the previous breakpoint.
    const slidingBreakpoint = await breakpointManager.setBreakpoint(
        uiSourceCode, 2, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);

    // Wait until both breakpoints have run their updates.
    await breakpoint.refreshInDebugger();
    await slidingBreakpoint.refreshInDebugger();

    // The first breakpoint is kept on a clash, the second one should be removed.
    assert.isFalse(breakpoint.isRemoved);
    assert.isTrue(slidingBreakpoint.isRemoved);
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
