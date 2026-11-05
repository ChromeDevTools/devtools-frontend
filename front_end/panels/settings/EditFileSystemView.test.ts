// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as Persistence from '../../models/persistence/persistence.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Settings from './settings.js';

const {EditFileSystemView, DEFAULT_VIEW} = Settings.EditFileSystemView;
const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('EditFileSystemView view', () => {
  it('renders excluded sub-directories', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    DEFAULT_VIEW({
      fileSystemPath: urlString`file:///home/user/project`,
      excludedFolders: [
        '/foo/' as Platform.DevToolsPath.EncodedPathString,
        '/bar/' as Platform.DevToolsPath.EncodedPathString,
      ],
      editingIndex: null,
      onAdd: () => {},
      onEdit: () => {},
      onDelete: () => {},
      onCommit: () => {},
      onCancel: () => {},
      validateFolder: () => null,
    },
                 undefined, target);
    await RenderCoordinator.done();

    await assertScreenshot('persistence/edit_file_system_basic.png');
  });

  it('renders errors for invalid sub-directories', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    DEFAULT_VIEW({
      fileSystemPath: urlString`file:///home/user/project`,
      excludedFolders: [
        '/foo/' as Platform.DevToolsPath.EncodedPathString,
        '/bar/' as Platform.DevToolsPath.EncodedPathString,
      ],
      editingIndex: 1,
      onAdd: () => {},
      onEdit: () => {},
      onDelete: () => {},
      onCommit: () => {},
      onCancel: () => {},
      validateFolder: () => 'Enter a unique path' as Platform.UIString.LocalizedString,
    },
                 undefined, target);
    await RenderCoordinator.done();

    const addButton = target.querySelector<HTMLElement>('.add-subfolder-button');
    assert.exists(addButton);
    addButton.focus();
    addButton.blur();
    await RenderCoordinator.done();

    await assertScreenshot('persistence/edit_file_system_error.png');
  });

  it('focuses the prompt when editing a sub-directory', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    DEFAULT_VIEW({
      fileSystemPath: urlString`file:///home/user/project`,
      excludedFolders: [
        '/foo/' as Platform.DevToolsPath.EncodedPathString,
        '/bar/' as Platform.DevToolsPath.EncodedPathString,
      ],
      editingIndex: 1,
      onAdd: () => {},
      onEdit: () => {},
      onDelete: () => {},
      onCommit: () => {},
      onCancel: () => {},
      validateFolder: () => null,
    },
                 undefined, target);
    await RenderCoordinator.done();

    const prompts = target.querySelectorAll('devtools-prompt');
    assert.lengthOf(prompts, 2);
    assert.strictEqual(document.activeElement, prompts[1]);
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

    renderElementIntoDOM(widget);
    await view.nextInput;

    return {view, fileSystem};
  }

  it('shows the initial excluded sub-directories', async () => {
    const {view} = await setup(new Set(['foo/', 'bar/']));

    assert.strictEqual(view.input.fileSystemPath, urlString`file:///home/user`);
    assert.deepEqual(view.input.excludedFolders, [
      'foo/' as Platform.DevToolsPath.EncodedPathString,
      'bar/' as Platform.DevToolsPath.EncodedPathString,
    ]);
  });

  it('adds new valid sub-directories to the file system', async () => {
    const {view, fileSystem} = await setup(new Set());

    view.input.onAdd();
    await view.nextInput;
    view.input.onCommit(0, 'foo');
    await view.nextInput;

    sinon.assert.calledOnceWithExactly(fileSystem.addExcludedFolder, 'foo/' as Platform.DevToolsPath.EncodedPathString);
  });

  it('shows empty sub-directory strings with an error and does not exclude it', async () => {
    const {view, fileSystem} = await setup(new Set());

    view.input.onAdd();
    await view.nextInput;
    assert.strictEqual(view.input.validateFolder(0, ''), 'Enter a path');
    sinon.assert.notCalled(fileSystem.addExcludedFolder);
  });

  it('shows duplicate sub-directory strings with an error and does not re-exclude it', async () => {
    const {view, fileSystem} = await setup(new Set(['foo/']));

    view.input.onAdd();
    await view.nextInput;
    assert.strictEqual(view.input.validateFolder(1, 'foo'), 'Enter a unique path');
    sinon.assert.notCalled(fileSystem.addExcludedFolder);
  });

  it('renders the new status when editing a sub-directory', async () => {
    const {view} = await setup(new Set(['foo/']));

    view.input.onEdit(0);
    await view.nextInput;
    assert.strictEqual(view.input.validateFolder(0, ''), 'Enter a path');
  });

  it('removes the old exclude when editing a valid sub-directory', async () => {
    const {view, fileSystem} = await setup(new Set(['foo/']));

    view.input.onEdit(0);
    await view.nextInput;
    view.input.onCommit(0, 'bar/');

    await view.nextInput;
    sinon.assert.calledOnceWithExactly(
        fileSystem.removeExcludedFolder, 'foo/' as Platform.DevToolsPath.EncodedPathString);
  });

  it('adds the new exclude when editing a sub-directory to a valid exclude', async () => {
    const {view, fileSystem} = await setup(new Set(['foo/']));

    view.input.onEdit(0);
    await view.nextInput;
    view.input.onCommit(0, 'bar/');

    await view.nextInput;
    sinon.assert.calledOnceWithExactly(fileSystem.addExcludedFolder, 'bar/' as Platform.DevToolsPath.EncodedPathString);
  });

  it('removes the sub-directory from the list when deleting it', async () => {
    const {view} = await setup(new Set(['foo/']));

    view.input.onDelete(0);

    await view.nextInput;
    assert.isEmpty(view.input.excludedFolders);
  });

  it('removes the exclude when deleting a valid sub-directory', async () => {
    const {view, fileSystem} = await setup(new Set(['foo/']));

    view.input.onDelete(0);

    await view.nextInput;
    sinon.assert.calledOnceWithExactly(
        fileSystem.removeExcludedFolder, 'foo/' as Platform.DevToolsPath.EncodedPathString);
  });
});
