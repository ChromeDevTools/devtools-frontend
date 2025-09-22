// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Changes from './changes.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('ChangesSidebar', () => {
  function getSidebar() {
    const resourceTypes = [
      Common.ResourceType.resourceTypes.SourceMapScript,
      Common.ResourceType.resourceTypes.Script,
      Common.ResourceType.resourceTypes.SourceMapStyleSheet,
      Common.ResourceType.resourceTypes.Stylesheet,
      Common.ResourceType.resourceTypes.Image,
      Common.ResourceType.resourceTypes.Font,
    ];

    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
        {forceNew: true, resourceMapping, targetManager, ignoreListManager});
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
    Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
    const workspaceDiff = new WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl(workspace);
    const sidebar = new Changes.ChangesSidebar.ChangesSidebar(workspaceDiff);

    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        workspace, 'project', Workspace.Workspace.projectTypes.Network, 'project', false);
    const uiSourceCodes = resourceTypes.map(
        (type, index) =>
            new Workspace.UISourceCode.UISourceCode(project, urlString`http://example.com/uiSourceCode${index}`, type));
    uiSourceCodes.push(new Workspace.UISourceCode.UISourceCode(
        project, urlString`snippet:snippetSourceCode`, Common.ResourceType.resourceTypes.Script));

    for (const uiSourceCode of uiSourceCodes) {
      uiSourceCode.setWorkingCopy('copy');
      project.addUISourceCode(uiSourceCode);
    }

    renderElementIntoDOM(sidebar);
    return {sidebar, uiSourceCodes, project};
  }

  function getTreeItem(sidebar: Changes.ChangesSidebar.ChangesSidebar, selector: string) {
    return (sidebar.contentElement.firstChild as Element | undefined)?.shadowRoot?.querySelector(selector);
  }

  it('shows source codes', async () => {
    const {uiSourceCodes} = getSidebar();
    uiSourceCodes[2].resetWorkingCopy();
    await assertScreenshot('changes/ChangesSidebar.png');
  });

  it('selects source codes', async () => {
    const {sidebar, uiSourceCodes, project} = getSidebar();
    const listElement = getTreeItem(sidebar, '.navigator-stylesheet-tree-item');
    assert.exists(listElement);
    const treeElement = UI.TreeOutline.treeElementBylistItemNode.get(listElement);
    assert.exists(treeElement);

    assert.notExists(sidebar.selectedUISourceCode());
    treeElement.select();

    assert.strictEqual(sidebar.selectedUISourceCode(), uiSourceCodes[3]);

    project.removeUISourceCode(uiSourceCodes[3].url());
    project.removeUISourceCode(uiSourceCodes[5].url());
    assert.strictEqual(sidebar.selectedUISourceCode(), uiSourceCodes[2]);
    await assertScreenshot('changes/ChangesSidebar-selected.png');
  });
});
