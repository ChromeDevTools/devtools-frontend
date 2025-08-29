// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  describeWithEnvironment,
  registerActions,
  registerNoopActions,
  updateHostConfig
} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

describeWithEnvironment('SourcesPanel', () => {
  function setUpEnvironment() {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      targetManager: SDK.TargetManager.TargetManager.instance(),
      resourceMapping:
          new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace),
      ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true}),
    });
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      targetManager: SDK.TargetManager.TargetManager.instance(),
      workspace,
      debuggerWorkspaceBinding,
    });
    Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
    const networkPersistenceManager =
        sinon.createStubInstance(Persistence.NetworkPersistenceManager.NetworkPersistenceManager);
    sinon.stub(Persistence.NetworkPersistenceManager.NetworkPersistenceManager, 'instance')
        .returns(networkPersistenceManager);
    sinon.stub(UI.ViewManager.ViewManager.instance(), 'view')
        .callsFake(() => sinon.createStubInstance(UI.View.SimpleView));
  }

  function createStubUISourceCode() {
    const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Script);
    const stubProject = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    uiSourceCode.project.returns(stubProject);
    stubProject.isServiceProject.returns(true);
    return uiSourceCode;
  }

  it('Shows Debug with Ai menu and submenu items', () => {
    updateHostConfig({
      devToolsAiSubmenuPrompts: {
        enabled: true,
      },
    });

    registerNoopActions([
      'debugger.toggle-pause', 'debugger.step-over', 'debugger.step-into', 'debugger.step-out', 'debugger.step',
      'debugger.toggle-breakpoints-active'
    ]);
    registerActions([{
      actionId: 'drjones.sources-panel-context',
      title: () => 'Debug with AI' as Platform.UIString.LocalizedString,
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
    }]);

    setUpEnvironment();

    const sources = new Sources.SourcesPanel.SourcesPanel();

    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);

    const uiSourceCode = createStubUISourceCode();
    sources.appendApplicableItems(event, contextMenu, uiSourceCode);

    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem.subItems?.map(item => item.label),
        ['Start a chat', 'Assess performance', 'Explain this script', 'Explain input handling']);
  });
});
