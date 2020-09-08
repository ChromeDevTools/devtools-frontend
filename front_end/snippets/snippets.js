// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Persistence from '../persistence/persistence.js';
import * as Workspace from '../workspace/workspace.js';

import * as ScriptSnippetFileSystem from './ScriptSnippetFileSystem.js';
import * as SnippetsQuickOpen from './SnippetsQuickOpen.js';

export const project = /** @type {!Workspace.Workspace.Project} */ (
    Workspace.Workspace.WorkspaceImpl.instance()
        .projectsForType(Workspace.Workspace.projectTypes.FileSystem)
        .find(
            project => Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) ===
                'snippets'));

export {
  ScriptSnippetFileSystem,
  SnippetsQuickOpen,
};
