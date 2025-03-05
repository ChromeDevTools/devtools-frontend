// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as CombinedDiffView from './CombinedDiffView.js';

const {urlString} = Platform.DevToolsPath;

const URL = urlString`file:///tmp/example.html`;

function createWorkspace(): Workspace.Workspace.WorkspaceImpl {
  return Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
}

function createWorkspaceDiff({workspace}: {workspace: Workspace.Workspace.WorkspaceImpl}):
    WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl {
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    targetManager: SDK.TargetManager.TargetManager.instance(),
    resourceMapping:
        new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace),
  });
  const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
    forceNew: true,
    targetManager: SDK.TargetManager.TargetManager.instance(),
    workspace,
    debuggerWorkspaceBinding,
  });
  Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
  Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
  return new WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl(workspace);
}

async function createCombinedDiffView({workspaceDiff}: {workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl}) {
  const view = createViewFunctionStub(CombinedDiffView.CombinedDiffView);
  const combinedDiffView = new CombinedDiffView.CombinedDiffView(undefined, view);
  combinedDiffView.workspaceDiff = workspaceDiff;

  combinedDiffView.markAsRoot();
  combinedDiffView.show(document.body);
  await view.nextInput;

  return {combinedDiffView, view};
}

describeWithEnvironment('CombinedDiffView', () => {
  let workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  beforeEach(() => {
    // This is needed for tracking file system UI source codes.
    updateHostConfig({devToolsImprovedWorkspaces: {enabled: true}});
    const workspace = createWorkspace();
    workspaceDiff = createWorkspaceDiff({workspace});
    ({uiSourceCode} =
         createFileSystemUISourceCode({url: URL, content: 'const data={original:true}', mimeType: 'text/javascript'}));
  });

  it('should render modified UISourceCode from a workspaceDiff on initial render', async () => {
    uiSourceCode.setWorkingCopy('const data={original:false}');
    const {view} = await createCombinedDiffView({workspaceDiff});

    assert.lengthOf(view.input.singleDiffViewInputs, 1);
  });

  it('should render newly modified UISourceCode from a workspaceDiff', async () => {
    const {view} = await createCombinedDiffView({workspaceDiff});
    assert.lengthOf(view.input.singleDiffViewInputs, 0);

    uiSourceCode.setWorkingCopy('const data={original:false}');

    assert.lengthOf((await view.nextInput).singleDiffViewInputs, 1);
  });

  it('should re-render modified UISourceCode from a workspaceDiff', async () => {
    uiSourceCode.setWorkingCopy('const data={original:false}');
    const {view} = await createCombinedDiffView({workspaceDiff});
    assert.lengthOf(view.input.singleDiffViewInputs, 1);

    uiSourceCode.setWorkingCopy('const data={modified:true}');
    await view.nextInput;
  });
});
