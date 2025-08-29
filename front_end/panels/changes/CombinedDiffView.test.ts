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
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createContentProviderUISourceCode, createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as CombinedDiffView from './CombinedDiffView.js';

const {urlString} = Platform.DevToolsPath;

const ORIGINAL_CONTENT = 'const data={original:true}';
const URL = urlString`file:///workspace/example.html`;

function createWorkspace(): Workspace.Workspace.WorkspaceImpl {
  return Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
}

function createWorkspaceDiff({workspace}: {workspace: Workspace.Workspace.WorkspaceImpl}):
    WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl {
  const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    targetManager: SDK.TargetManager.TargetManager.instance(),
    resourceMapping:
        new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace),
    ignoreListManager,
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
  const widget = new CombinedDiffView.CombinedDiffView(undefined, view);
  widget.workspaceDiff = workspaceDiff;

  const container = document.createElement('div');
  renderElementIntoDOM(container);
  widget.markAsRoot();
  widget.show(container);
  await view.nextInput;

  return {widget, view};
}

describeWithEnvironment('CombinedDiffView', () => {
  let workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  beforeEach(() => {
    const workspace = createWorkspace();
    workspaceDiff = createWorkspaceDiff({workspace});
    ({uiSourceCode} = createFileSystemUISourceCode(
         {url: URL, content: ORIGINAL_CONTENT, mimeType: 'text/javascript', fileSystemPath: 'file:///workspace'}));
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

  describe('file name', () => {
    it('should render workspace relative name with workspace name prefix if the UISourceCode is coming from a workspace',
       async () => {
         createFileSystemUISourceCode({
           url: URL,
           content: ORIGINAL_CONTENT,
           autoMapping: true,
           mimeType: 'text/javascript',
           fileSystemPath: 'file:///workspace'
         });
         const {uiSourceCode: contentProviderUiSourceCode} = createContentProviderUISourceCode({
           url: URL,
           content: ORIGINAL_CONTENT,
           projectType: Workspace.Workspace.projectTypes.Network,
           mimeType: 'text/javascript',
         });
         const {view} = await createCombinedDiffView({workspaceDiff});

         contentProviderUiSourceCode.setWorkingCopy('const data={original:false}');

         assert.strictEqual((await view.nextInput).singleDiffViewInputs[0].fileName, '*workspace/example.html');
       });

    it('should render full display name if the UISourceCode is not coming from a workspace', async () => {
      const {uiSourceCode} = createContentProviderUISourceCode({
        url: urlString`file:///tmp/non-mapped.html`,
        content: ORIGINAL_CONTENT,
        projectType: Workspace.Workspace.projectTypes.Network,
        mimeType: 'text/javascript',
      });
      const {view} = await createCombinedDiffView({workspaceDiff});

      uiSourceCode.setWorkingCopy('const data={original:false}');

      assert.strictEqual((await view.nextInput).singleDiffViewInputs[0].fileName, '*/tmp/non-mapped.html');
    });
  });

  describe('ignoredUrl', () => {
    it('should ignore files in ignoredFileNames', async () => {
      const {uiSourceCode} = createFileSystemUISourceCode({
        url: urlString`inspector:///inspector-stylesheet`,
        content: ORIGINAL_CONTENT,
        autoMapping: true,
        mimeType: 'text/css',
        fileSystemPath: ''
      });
      const {widget, view} = await createCombinedDiffView({workspaceDiff});
      widget.ignoredUrls = ['inspector://'];
      uiSourceCode.setWorkingCopy('const data={original:false}');

      const input = await view.nextInput;

      assert.deepEqual(input.singleDiffViewInputs, []);
    });
  });
});
