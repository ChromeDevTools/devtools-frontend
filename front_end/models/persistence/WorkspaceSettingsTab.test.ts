// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createFakeRegExpSetting, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Persistence from './persistence.js';

const {DEFAULT_VIEW, WorkspaceSettingsTab} = Persistence.WorkspaceSettingsTab;
const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('WorkspaceSettingsTab view', () => {
  it('renders the exclude regex setting and one card per mapped file system', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    const fileSystem = sinon.createStubInstance(Persistence.IsolatedFileSystem.IsolatedFileSystem);
    fileSystem.path.returns(urlString`file:///home/user/foo`);
    fileSystem.excludedFolders.returns(new Set());

    DEFAULT_VIEW(
        {
          excludePatternSetting: createFakeRegExpSetting('fake-exclude-pattern', 'node_modules|.git'),
          fileSystems: [{displayName: 'foo', fileSystem}],
          onAddClicked: () => {},
          onRemoveClicked: () => {},
        },
        {}, target);

    await assertScreenshot('persistence/workspace_settings_tab.png');
  });
});

describeWithEnvironment('WorkspaceSettingsTab widget', () => {
  function createStubFileSystem(path: string) {
    const fileSystem = sinon.createStubInstance(Persistence.IsolatedFileSystem.IsolatedFileSystem);
    fileSystem.path.returns(urlString(path));
    return fileSystem;
  }

  async function setup(initialFileSystemPaths: string[] = []) {
    const fileSystemManager =
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance({forceNew: true});
    const fileSystems = initialFileSystemPaths.map(createStubFileSystem);
    sinon.stub(fileSystemManager, 'fileSystems').returns(fileSystems);
    const addFileSystemStub = sinon.stub(fileSystemManager, 'addFileSystem');
    const removeFileSystemStub = sinon.stub(fileSystemManager, 'removeFileSystem');
    const networkPersistenceManager =
        sinon.createStubInstance(Persistence.NetworkPersistenceManager.NetworkPersistenceManager);
    sinon.stub(Persistence.NetworkPersistenceManager.NetworkPersistenceManager, 'instance')
        .returns(networkPersistenceManager);

    const view = createViewFunctionStub(WorkspaceSettingsTab);
    const widget = new WorkspaceSettingsTab(view);

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    return {view, fileSystemManager, fileSystems, addFileSystemStub, removeFileSystemStub, networkPersistenceManager};
  }

  it('uses the exclude folder regex pattern', async () => {
    const {view, fileSystemManager} = await setup();

    assert.strictEqual(view.input.excludePatternSetting, fileSystemManager.workspaceFolderExcludePatternSetting());
  });

  it('shows the directory name as the card heading', async () => {
    const {view} = await setup(['file:///home/user/foo']);

    assert.lengthOf(view.input.fileSystems, 1);
    assert.strictEqual(view.input.fileSystems[0].displayName, 'foo');
  });

  it('sorts file systems alphabetically', async () => {
    const {view} = await setup(['file:///home/user/zoo', 'file:///home/user/foo']);

    assert.lengthOf(view.input.fileSystems, 2);
    assert.strictEqual(view.input.fileSystems[0].fileSystem.path(), 'file:///home/user/foo');
    assert.strictEqual(view.input.fileSystems[1].fileSystem.path(), 'file:///home/user/zoo');
  });

  it('listens to FileSystemAdded events', async () => {
    const {view, fileSystems, fileSystemManager} = await setup();
    const fileSystem = createStubFileSystem('file:///home/user/dev/foo');
    fileSystems.push(fileSystem);

    fileSystemManager.dispatchEventToListeners(
        Persistence.IsolatedFileSystemManager.Events.FileSystemAdded, fileSystem);
    await view.nextInput;

    assert.lengthOf(view.input.fileSystems, 1);
    assert.strictEqual(view.input.fileSystems[0].fileSystem, fileSystem);
  });

  it('listens to FileSystemRemoved events', async () => {
    const {view, fileSystems, fileSystemManager} = await setup(['file:///home/user/foo']);

    const fileSystem = fileSystems[0];
    fileSystems.splice(0, 1);
    fileSystemManager.dispatchEventToListeners(
        Persistence.IsolatedFileSystemManager.Events.FileSystemRemoved, fileSystem);
    await view.nextInput;

    assert.lengthOf(view.input.fileSystems, 0);
  });

  it('filters out the network persistence file system project', async () => {
    const {view, fileSystems, fileSystemManager, networkPersistenceManager} = await setup();
    const fileSystem = createStubFileSystem('file:///special-network-fs');
    fileSystems.push(fileSystem);
    const project = sinon.createStubInstance(Persistence.FileSystemWorkspaceBinding.FileSystem);
    project.fileSystemPath.returns(urlString`file:///special-network-fs`);
    networkPersistenceManager.project.returns(project);
    sinon.stub(fileSystemManager, 'fileSystem').returns(fileSystem);

    fileSystemManager.dispatchEventToListeners(
        Persistence.IsolatedFileSystemManager.Events.FileSystemAdded, fileSystem);
    await view.nextInput;

    assert.lengthOf(view.input.fileSystems, 0);
  });

  it('wires up addFileSystem', async () => {
    const {view, addFileSystemStub} = await setup();

    view.input.onAddClicked();

    sinon.assert.calledOnce(addFileSystemStub);
  });

  it('wires up removeFileSystem', async () => {
    const {view, fileSystemManager, removeFileSystemStub} = await setup(['file:///home/user/foo']);
    const fileSystem = fileSystemManager.fileSystems()[0];

    view.input.onRemoveClicked(fileSystem as Persistence.IsolatedFileSystem.IsolatedFileSystem);

    sinon.assert.calledOnceWithExactly(removeFileSystemStub, fileSystem);
  });
});
