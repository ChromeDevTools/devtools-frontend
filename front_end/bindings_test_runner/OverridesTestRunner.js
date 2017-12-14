// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {string} folderPath
 * @return {!{isolatedFileSystem: !Persistence.IsolatedFileSystem, project: !Workspace.Project, testFileSystem: !BindingsTestRunner.TestFileSystem}}
 */
BindingsTestRunner.createOverrideProject = async function(folderPath) {
  var testFileSystem = new BindingsTestRunner.TestFileSystem(folderPath);
  var isolatedFileSystem = await testFileSystem.reportCreatedPromise('overrides');
  isolatedFileSystem._type = 'overrides';
  var project =
      Workspace.workspace.project(Persistence.FileSystemWorkspaceBinding.projectId(isolatedFileSystem.path()));
  console.assert(project);
  return {isolatedFileSystem, project, testFileSystem};
};

/**
 * @param {boolean} enabled
 */
BindingsTestRunner.setOverridesEnabled = function(enabled) {
  Common.settings.moduleSetting('persistenceNetworkOverridesEnabled').set(enabled);
};
