// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';

self.BindingsTestRunner = self.BindingsTestRunner || {};

import * as Common from '../../core/common/common.js';

/**
 * @param {string} folderPath
 * @return {!Promise<!{isolatedFileSystem: !Persistence.IsolatedFileSystem.IsolatedFileSystem, project: !Workspace.Workspace.Project, testFileSystem: !BindingsTestRunner.TestFileSystem}>}
 */
BindingsTestRunner.createOverrideProject = async function(folderPath) {
  const testFileSystem = new BindingsTestRunner.TestFileSystem(folderPath);
  const isolatedFileSystem = await testFileSystem.reportCreatedPromise('overrides');
  isolatedFileSystem.typeInternal = 'overrides';
  const project = Workspace.Workspace.WorkspaceImpl.instance().project(
      Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.projectId(isolatedFileSystem.path()));
  console.assert(project);
  return {isolatedFileSystem, project, testFileSystem};
};

/**
 * @param {boolean} enabled
 */
BindingsTestRunner.setOverridesEnabled = function(enabled) {
  Common.Settings.moduleSetting('persistenceNetworkOverridesEnabled').set(enabled);
};
