// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {deinitializeGlobalVars} from '../../testing/EnvironmentHelpers.js';
import {expectCall, spyCall} from '../../testing/ExpectStubCall.js';
import {TestPlugin} from '../../testing/LanguagePluginHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend, parseScopeChain} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {stubFrame} from '../../testing/StackTraceHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

describe('ScopeChainSidebarPane', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let backend: MockDebuggerBackend;
  let target: SDK.Target.Target;

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(backend.universe.debuggerWorkspaceBinding);
    sinon.stub(SourceMapScopes.ScopeChainResolver.ScopeChainResolver, 'instance')
        .returns(backend.universe.scopeChainResolver);
    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(backend.universe.workspace);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
    sinon.stub(Common.Settings.Settings, 'instance').returns(backend.universe.settings);
    target = backend.createTarget();
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('renders correctly with scope entries', async () => {
    const source = 'function f(a) { debugger } f(1)';
    const scopes = '          {              }';
    parseScopeChain(scopes);  // Verify it parses

    const functionScopeObject = backend.createSimpleRemoteObject([{name: 'a', value: 1}]);
    const callFrame = await backend.createCallFrame(
        target, {url: 'file:///tmp/example.js', content: source}, scopes, null, [functionScopeObject]);

    const pane = new Sources.ScopeChainSidebarPane.ScopeChainSidebarPane();
    renderElementIntoDOM(pane, {includeCommonStyles: true});

    const debuggableFrame = stubFrame<StackTrace.StackTrace.DebuggableFrame>({
      sdkFrame: callFrame,
      line: 0,
      column: 0,
    });

    const flavor = StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggableFrame);

    const sidebarUpdated = expectCall(sinon.stub(pane, 'sidebarPaneUpdatedForTest'));
    pane.flavorChanged(flavor);
    await sidebarUpdated;
    await UI.Widget.Widget.allUpdatesComplete;
    const tree = pane.contentElement.querySelector('devtools-tree');
    tree?.getInternalTreeOutlineForTest().focus();
    await raf();
    await assertScreenshot('sources/scope-chain-sidebar-pane.png');
  });

  it('validates object property widgets are not readonly', async () => {
    const source = 'function f(a) { debugger } f(1)';
    const scopes = '          {              }';
    parseScopeChain(scopes);

    const functionScopeObject = backend.createSimpleRemoteObject([{name: 'a', value: 1}]);
    const callFrame = await backend.createCallFrame(
        target, {url: 'file:///tmp/example.js', content: source}, scopes, null, [functionScopeObject]);

    const view = createViewFunctionStub(Sources.ScopeChainSidebarPane.ScopeChainSidebarPane);
    const pane = new Sources.ScopeChainSidebarPane.ScopeChainSidebarPane(undefined, view);
    renderElementIntoDOM(pane.contentElement);

    const debuggableFrame = stubFrame<StackTrace.StackTrace.DebuggableFrame>({
      sdkFrame: callFrame,
      line: 0,
      column: 0,
    });

    const flavor = StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggableFrame);

    pane.flavorChanged(flavor);

    await view.nextInput;
    // Wait for the scope chain update to trigger the view update.
    while (!view.input.scopeChain) {
      await view.nextInput;
    }

    const {scopeChain} = view.input;
    assert.exists(scopeChain);
    const localScope = scopeChain[0];
    assert.isFalse(localScope.objectTree.readOnly);
  });

  it('expands scope object tree recursively on recursive expand', async () => {
    const source = 'function f(a) { debugger } f(1)';
    const scopes = '          {              }';
    parseScopeChain(scopes);

    const functionScopeObject = backend.createSimpleRemoteObject([{name: 'a', value: 1}]);
    const callFrame = await backend.createCallFrame(target, {url: 'file:///tmp/example.js', content: source}, scopes,
                                                    null, [functionScopeObject]);

    const pane = new Sources.ScopeChainSidebarPane.ScopeChainSidebarPane();
    renderElementIntoDOM(pane);

    const debuggableFrame = stubFrame<StackTrace.StackTrace.DebuggableFrame>({
      sdkFrame: callFrame,
      line: 0,
      column: 0,
    });

    const flavor = StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggableFrame);

    const sidebarUpdated = expectCall(sinon.stub(pane, 'sidebarPaneUpdatedForTest'));
    pane.flavorChanged(flavor);
    await sidebarUpdated;
    await UI.Widget.Widget.allUpdatesComplete;

    const tree = pane.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    const scopeElement = tree.getInternalTreeOutlineForTest().rootElement().firstChild();
    assert.exists(scopeElement);

    scopeElement.collapse();
    await UI.Widget.Widget.allUpdatesComplete;
    assert.isFalse(scopeElement.expanded);

    const expandRecursivelySpy =
        sinon.spy(ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.prototype, 'expandRecursively');
    const updateAfterExpand = spyCall(pane, 'performUpdate');
    await scopeElement.expandRecursively();
    await updateAfterExpand;
    await UI.Widget.Widget.allUpdatesComplete;
    await raf();

    sinon.assert.calledOnce(expandRecursivelySpy);
    assert.isTrue(scopeElement.expanded);
    assert.strictEqual(scopeElement.childCount(), 2);
  });

  it('clears stale scope children when the scope chain updates while properties are loading', async () => {
    const source = 'function f(a) { debugger } f(1)';
    const scopes = '          {              }';
    parseScopeChain(scopes);

    const oldScopeObject = backend.createSimpleRemoteObject([{name: 'stack', value: 1}]);
    const callFrame = await backend.createCallFrame(target, {url: 'file:///tmp/example.js', content: source}, scopes,
                                                    null, [oldScopeObject]);

    const pane = new Sources.ScopeChainSidebarPane.ScopeChainSidebarPane();
    renderElementIntoDOM(pane);

    const debuggableFrame = stubFrame<StackTrace.StackTrace.DebuggableFrame>({
      sdkFrame: callFrame,
      line: 0,
      column: 0,
    });
    const flavor = StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggableFrame);

    const initialUpdate = spyCall(pane, 'sidebarPaneUpdatedForTest');
    pane.flavorChanged(flavor);
    await initialUpdate;
    await UI.Widget.Widget.allUpdatesComplete;

    const tree = pane.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    const oldScopeElement = tree.getInternalTreeOutlineForTest().rootElement().firstChild();
    assert.exists(oldScopeElement);
    assert.strictEqual(oldScopeElement.listItemElement.getAttribute('aria-label'), 'Local');
    assert.isAbove(oldScopeElement.childCount(), 0);

    const pendingProperties = Promise.withResolvers<SDK.RemoteObject.GetPropertiesResult>();
    const pluginScope = new Bindings.DebuggerLanguagePlugins.SourceScope(callFrame, 0n, 'LOCAL', 'LOCAL', undefined,
                                                                         new TestPlugin('TestPlugin'));
    sinon.stub(pluginScope.object(), 'getAllProperties').returns(pendingProperties.promise);
    sinon.stub(backend.universe.debuggerWorkspaceBinding.pluginManager, 'resolveScopeChain').resolves([pluginScope]);

    try {
      const updated = spyCall(pane, 'sidebarPaneUpdatedForTest');
      callFrame.debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.DebugInfoAttached, callFrame.script);
      await updated;
      tree.flushPendingUpdatesForTesting();

      const newScopeElement = tree.getInternalTreeOutlineForTest().rootElement().firstChild();
      assert.exists(newScopeElement);
      assert.notStrictEqual(newScopeElement, oldScopeElement);
      assert.strictEqual(newScopeElement.listItemElement.getAttribute('aria-label'), 'LOCAL');
      assert.strictEqual(newScopeElement.childCount(), 0);

      pendingProperties.resolve({
        properties: [new SDK.RemoteObject.RemoteObjectProperty(
            'localX0', new SDK.RemoteObject.LocalJSONObject(undefined), false, false, true, false)],
        internalProperties: [],
      });
      await UI.Widget.Widget.allUpdatesComplete;
      tree.flushPendingUpdatesForTesting();

      assert.strictEqual(newScopeElement.childCount(), 1);
      assert.strictEqual(
          newScopeElement.firstChild()?.listItemElement.getAttribute('data-object-property-name-for-test'), 'localX0');
    } finally {
      pendingProperties.resolve({properties: [], internalProperties: []});
    }
  });
});
