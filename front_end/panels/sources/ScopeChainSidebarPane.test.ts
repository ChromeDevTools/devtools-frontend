// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockDebuggerBackend, parseScopeChain} from '../../testing/MockScopeChain.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Sources from './sources.js';

describeWithEnvironment('ScopeChainSidebarPane', () => {
  let backend: MockDebuggerBackend;
  let target: SDK.Target.Target;

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });

    backend = new MockDebuggerBackend();
    target = backend.createTarget();
  });

  it('renders correctly with scope entries', async () => {
    const source = 'function f(a) { debugger } f(1)';
    const scopes = '          {              }';
    parseScopeChain(scopes);  // Verify it parses

    const functionScopeObject = backend.createSimpleRemoteObject([{name: 'a', value: 1}]);
    const callFrame = await backend.createCallFrame(
        target, {url: 'file:///tmp/example.js', content: source}, scopes, null, [functionScopeObject]);

    const pane = Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance();
    renderElementIntoDOM(pane, {includeCommonStyles: true});

    const debuggableFrame: StackTrace.StackTrace.DebuggableFrame = {
      sdkFrame: callFrame,
      line: 0,
      column: 0,
    };

    const flavor = StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggableFrame);

    pane.flavorChanged(flavor);

    await pane.updateComplete;

    // Object properties are rendered asynchronously.
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
