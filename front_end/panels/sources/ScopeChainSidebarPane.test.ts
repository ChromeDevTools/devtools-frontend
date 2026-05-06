// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {MockDebuggerBackend, parseScopeChain} from '../../testing/MockScopeChain.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';

import * as Sources from './sources.js';

describeWithMockConnection('ScopeChainSidebarPane', () => {
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

    const sidebarPaneUpdatedPromise = spyCall(pane, 'sidebarPaneUpdatedForTest');

    pane.flavorChanged(flavor);

    await sidebarPaneUpdatedPromise;

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

    const pane = Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance();
    renderElementIntoDOM(pane.contentElement);

    const debuggableFrame: StackTrace.StackTrace.DebuggableFrame = {
      sdkFrame: callFrame,
      line: 0,
      column: 0,
    };

    const flavor = StackTrace.StackTrace.DebuggableFrameFlavor.for(debuggableFrame);

    const sidebarPaneUpdatedPromise = spyCall(pane, 'sidebarPaneUpdatedForTest');

    pane.flavorChanged(flavor);

    await sidebarPaneUpdatedPromise;

    await raf();

    const root = pane.treeOutlineForTest().rootElement();
    const localScope = root.childAt(0);
    assert.instanceOf(localScope, ObjectUI.ObjectPropertiesSection.RootElement);
    const property = localScope?.childAt(0);
    assert.instanceOf(property, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isFalse(property.property.readOnly);
  });
});
