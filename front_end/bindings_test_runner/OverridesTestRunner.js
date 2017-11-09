// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {string} folderPath
 * @return {!Workspace.Project}
 */
BindingsTestRunner.createOverrideProject = async function(folderPath) {
  var testFilesystem = new BindingsTestRunner.TestFileSystem(folderPath);
  await testFilesystem.reportCreatedPromise();
  var isolatedFileSystem = Persistence.isolatedFileSystemManager.fileSystem(testFilesystem.fileSystemPath);
  isolatedFileSystem._type = 'overrides';
  var project =
      Workspace.workspace.project(Persistence.FileSystemWorkspaceBinding.projectId(isolatedFileSystem.path()));
  console.assert(project);
  return project;
};

/**
 * @param {boolean} enabled
 */
BindingsTestRunner.setOverridesEnabled = function(enabled) {
  Common.settings.moduleSetting('persistenceNetworkOverridesEnabled').set(enabled);
};
