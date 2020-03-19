// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Workspace from '../workspace/workspace.js';

import * as SnippetsModule from './snippets.js';

self.Snippets = self.Snippets || {};
Snippets = Snippets || {};

Snippets.evaluateScriptSnippet = SnippetsModule.ScriptSnippetFileSystem.evaluateScriptSnippet;
Snippets.isSnippetsUISourceCode = SnippetsModule.ScriptSnippetFileSystem.isSnippetsUISourceCode;
Snippets.isSnippetsProject = SnippetsModule.ScriptSnippetFileSystem.isSnippetsProject;

Snippets.project = /** @type {!Workspace.Workspace.Project} */ (
    Workspace.Workspace.WorkspaceImpl.instance()
        .projectsForType(Workspace.Workspace.projectTypes.FileSystem)
        .find(project => Persistence.FileSystemWorkspaceBinding.fileSystemType(project) === 'snippets'));

/**
 * @constructor
 */
Snippets.SnippetsQuickOpen = SnippetsModule.SnippetsQuickOpen.SnippetsQuickOpen;
