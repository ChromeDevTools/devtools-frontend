// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as Bindings from '../bindings/bindings.js';
import * as Breakpoints from '../breakpoints/breakpoints.js';
import * as Persistence from '../persistence/persistence.js';
import * as Workspace from '../workspace/workspace.js';
import * as WorkspaceDiff from '../workspace_diff/workspace_diff.js';

describeWithEnvironment('UISourceCodeDiff', () => {
  it('returns formatted mapping with a diff', async () => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
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

    const URL = 'file:///tmp/example.html' as Platform.DevToolsPath.UrlString;
    const {uiSourceCode, project} =
        createFileSystemUISourceCode({url: URL, content: 'const data={original:true}', mimeType: 'text/javascript'});
    uiSourceCode.setWorkingCopyGetter(() => 'const data={modified:true,original:false}');

    const uiSourceCodeDiff = new WorkspaceDiff.WorkspaceDiff.UISourceCodeDiff(uiSourceCode);
    const {diff, formattedCurrentMapping} = (await uiSourceCodeDiff.requestDiff({shouldFormatDiff: true}))!;
    assert.deepEqual(diff, [
      {0: 0, 1: ['const data = {']},
      {0: -1, 1: ['    original: true']},
      {0: 1, 1: ['    modified: true,', '    original: false']},
      {0: 0, 1: ['}', '']},
    ]);
    assert.deepEqual(formattedCurrentMapping!.originalToFormatted(0, 'const data={'.length), [1, 4]);
    assert.deepEqual(formattedCurrentMapping!.originalToFormatted(0, 'const data={modified:true,'.length), [2, 4]);
    workspace.removeProject(project);
  });
});
