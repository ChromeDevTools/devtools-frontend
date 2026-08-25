// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {deinitializeGlobalVars} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend, parseScopeChain} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
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
    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(backend.universe.workspace);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
    sinon.stub(Common.Settings.Settings, 'instance').returns(backend.universe.settings);
    target = backend.createTarget();
  });

  afterEach(async () => {
    sinon.restore();
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

    const debuggableFrame: StackTrace.StackTrace.DebuggableFrame = {
      sdkFrame: callFrame,
      line: 0,
      column: 0,
    };

    const flavor = StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggableFrame);

    const populateSpy =
        sinon.spy(ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement, 'populateChildrenIfNeeded');

    pane.flavorChanged(flavor);
    await pane.updateComplete;

    // Object properties are rendered asynchronously.
    await populateSpy.returnValues[0];
    await raf();  // Wait for Lit and MutationObserver to tick
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

    const debuggableFrame: StackTrace.StackTrace.DebuggableFrame = {
      sdkFrame: callFrame,
      line: 0,
      column: 0,
    };

    const flavor = StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggableFrame);

    pane.flavorChanged(flavor);

    await view.nextInput;
    // Wait for the scope chain update to trigger the view update.
    while (!view.input.scopeChain) {
      await view.nextInput;
    }

    const {scopeChain} = view.input;
    assert.isNotNull(scopeChain);
    const localScope = scopeChain![0];
    assert.isFalse(localScope.objectTree.readOnly);
  });
});
