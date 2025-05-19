// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Persistence from './persistence.js';

const {EditFileSystemView, ExcludedFolderStatus, DEFAULT_VIEW} = Persistence.EditFileSystemView;
const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('EditFileSystemView view', () => {
  it('renders excluded sub-directories', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    DEFAULT_VIEW(
        {
          fileSystemPath: urlString`file:///home/user/project`,
          excludedFolderPaths: [
            {path: '/foo/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.VALID},
            {path: '/bar/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.VALID},
          ],
          onCreate: () => {},
          onEdit: () => {},
          onDelete: () => {},
        },
        {}, target);

    await assertScreenshot('persistence/edit_file_system_basic.png');
  });

  it('renders errors for invalid sub-directories', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    DEFAULT_VIEW(
        {
          fileSystemPath: urlString`file:///home/user/project`,
          excludedFolderPaths: [
            {path: '/foo/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.VALID},
            {path: '' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.ERROR_NOT_A_PATH},
            {path: '/bar/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.VALID},
            {path: '/foo/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.ERROR_NOT_UNIQUE},
          ],
          onCreate: () => {},
          onEdit: () => {},
          onDelete: () => {},
        },
        {}, target);

    await assertScreenshot('persistence/edit_file_system_error.png');
  });
});

describeWithEnvironment('EditFileSystemView widget', () => {
  async function setup(initialExcludedFolders: Set<string>) {
    const view = createViewFunctionStub(EditFileSystemView);
    const widget = new EditFileSystemView(undefined, view);
    const fileSystem = sinon.createStubInstance(Persistence.IsolatedFileSystem.IsolatedFileSystem);
    fileSystem.path.returns(urlString`file:///home/user`);
    fileSystem.excludedFolders.returns(initialExcludedFolders as Set<Platform.DevToolsPath.EncodedPathString>);
    widget.fileSystem = fileSystem;

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    return {view, fileSystem};
  }

  it('shows the initial excluded sub-directories', async () => {
    const {view} = await setup(new Set(['foo/', 'bar/']));

    assert.strictEqual(view.input.fileSystemPath, urlString`file:///home/user`);
    assert.deepEqual(view.input.excludedFolderPaths, [
      {path: 'foo/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.VALID},
      {path: 'bar/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.VALID},
    ]);
  });

  it('adds new valid sub-directories to the file system', async () => {
    const {view, fileSystem} = await setup(new Set());

    view.input.onCreate(new CustomEvent('create', {detail: {url: 'foo'}}));

    sinon.assert.calledOnceWithExactly(fileSystem.addExcludedFolder, 'foo/' as Platform.DevToolsPath.EncodedPathString);
  });

  it('shows empty sub-directory strings with an error and does not exclude it', async () => {
    const {view, fileSystem} = await setup(new Set());

    view.input.onCreate(new CustomEvent('create', {detail: {url: ''}}));

    await view.nextInput;
    assert.deepEqual(view.input.excludedFolderPaths, [
      {path: '' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.ERROR_NOT_A_PATH},
    ]);
    sinon.assert.notCalled(fileSystem.addExcludedFolder);
  });

  it('shows duplicate sub-directory strings with an error and does not re-exclude it', async () => {
    const {view, fileSystem} = await setup(new Set(['foo/']));

    view.input.onCreate(new CustomEvent('create', {detail: {url: 'foo'}}));

    await view.nextInput;
    assert.deepEqual(view.input.excludedFolderPaths, [
      {path: 'foo/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.VALID},
      {path: 'foo/' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.ERROR_NOT_UNIQUE},
    ]);
    sinon.assert.notCalled(fileSystem.addExcludedFolder);
  });

  it('renders the new status when editing a sub-directory', async () => {
    const {view} = await setup(new Set(['foo/']));
    const node = document.createElement('tr');
    node.setAttribute('data-index', '0');

    view.input.onEdit(
        new CustomEvent('edit', {detail: {node, columnId: 'url', valueBeforeEditing: 'foo/', newText: ''}}));

    await view.nextInput;
    assert.deepEqual(view.input.excludedFolderPaths, [
      {path: '' as Platform.DevToolsPath.EncodedPathString, status: ExcludedFolderStatus.ERROR_NOT_A_PATH},
    ]);
  });

  it('removes the old exclude when editing a valid sub-directory', async () => {
    const {view, fileSystem} = await setup(new Set(['foo/']));
    const node = document.createElement('tr');
    node.setAttribute('data-index', '0');

    view.input.onEdit(
        new CustomEvent('edit', {detail: {node, columnId: 'url', valueBeforeEditing: 'foo/', newText: 'bar/'}}));

    await view.nextInput;
    sinon.assert.calledOnceWithExactly(
        fileSystem.removeExcludedFolder, 'foo/' as Platform.DevToolsPath.EncodedPathString);
  });

  it('adds the new exclude when editing a sub-directory to a valid exclude', async () => {
    const {view, fileSystem} = await setup(new Set(['foo/']));
    const node = document.createElement('tr');
    node.setAttribute('data-index', '0');

    view.input.onEdit(
        new CustomEvent('edit', {detail: {node, columnId: 'url', valueBeforeEditing: 'foo/', newText: 'bar/'}}));

    await view.nextInput;
    sinon.assert.calledOnceWithExactly(fileSystem.addExcludedFolder, 'bar/' as Platform.DevToolsPath.EncodedPathString);
  });

  it('removes the sub-directory from the list when deleting it', async () => {
    const {view} = await setup(new Set(['foo/']));
    const node = document.createElement('tr');
    node.setAttribute('data-index', '0');

    view.input.onDelete(new CustomEvent('delete', {detail: node}));

    await view.nextInput;
    assert.isEmpty(view.input.excludedFolderPaths);
  });

  it('removes the exclude when deleting a valid sub-directory', async () => {
    const {view, fileSystem} = await setup(new Set(['foo/']));
    const node = document.createElement('tr');
    node.setAttribute('data-index', '0');

    view.input.onDelete(new CustomEvent('delete', {detail: node}));

    await view.nextInput;
    sinon.assert.calledOnceWithExactly(
        fileSystem.removeExcludedFolder, 'foo/' as Platform.DevToolsPath.EncodedPathString);
  });
});
