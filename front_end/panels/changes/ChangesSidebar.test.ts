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
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Changes from './changes.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('ChangesSidebar', () => {
  function getSourceCodes() {
    const resourceTypes = [
      Common.ResourceType.resourceTypes.SourceMapScript,
      Common.ResourceType.resourceTypes.Script,
      Common.ResourceType.resourceTypes.SourceMapStyleSheet,
      Common.ResourceType.resourceTypes.Stylesheet,
      Common.ResourceType.resourceTypes.Image,
      Common.ResourceType.resourceTypes.Font,
    ];

    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
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

    return {uiSourceCodes, project};
  }

  it('shows source codes', async () => {
    const {uiSourceCodes} = getSourceCodes();
    uiSourceCodes.splice(2, 1);
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    Changes.ChangesSidebar.DEFAULT_VIEW(
        {onSelect: () => {}, sourceCodes: new Set(uiSourceCodes), selectedSourceCode: null}, {}, container);
    await assertScreenshot('changes/ChangesSidebar.png');
  });

  it('updates the source code selection', async () => {
    const {uiSourceCodes, project} = getSourceCodes();
    const workspace = project.workspace();
    const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
        {forceNew: true, resourceMapping, targetManager, ignoreListManager});
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
    Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
    const workspaceDiff = new WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl(workspace);
    const viewFunction = createViewFunctionStub(Changes.ChangesSidebar.ChangesSidebar);
    const sidebar = new Changes.ChangesSidebar.ChangesSidebar(undefined, viewFunction);

    sidebar.workspaceDiff = workspaceDiff;
    const {onSelect} = await viewFunction.nextInput;

    assert.notExists(sidebar.selectedUISourceCode());
    onSelect(uiSourceCodes[3]);

    assert.strictEqual(sidebar.selectedUISourceCode(), uiSourceCodes[3]);

    project.removeUISourceCode(uiSourceCodes[3].url());
    project.removeUISourceCode(uiSourceCodes[5].url());
    assert.strictEqual(sidebar.selectedUISourceCode(), uiSourceCodes[2]);
  });

  it('selects source codes', async () => {
    const {uiSourceCodes} = getSourceCodes();
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    uiSourceCodes.splice(5, 1);
    uiSourceCodes.splice(3, 1);
    Changes.ChangesSidebar.DEFAULT_VIEW(
        {
          onSelect: () => {},
          sourceCodes: new Set(uiSourceCodes),
          selectedSourceCode: uiSourceCodes[2],
        },
        {}, container);

    await assertScreenshot('changes/ChangesSidebar-selected.png');
  });
});
