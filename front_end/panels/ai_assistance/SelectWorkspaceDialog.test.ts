// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTestFilesystem, setupAutomaticFileSystem} from '../../testing/AiAssistanceHelpers.js';
import {assertScreenshot, renderElementIntoDOM, setColorScheme} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as AiAssistance from './ai_assistance.js';

describeWithEnvironment('SelectWorkspaceDialog', () => {
  const root = '/path/to/my-automatic-file-system';

  beforeEach(() => {
    setupAutomaticFileSystem();
  });

  afterEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    for (const project of workspace.projects()) {
      workspace.removeProject(project);
    }
    Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.removeInstance();
  });

  async function createComponent(): Promise<{
    view: ViewFunctionStub<typeof AiAssistance.SelectWorkspaceDialog>,
    component: AiAssistance.SelectWorkspaceDialog,
    onProjectSelected: sinon.SinonSpy<[Workspace.Workspace.Project], void>,
    hideDialogSpy: sinon.SinonSpy<[], void>,
    project: Persistence.FileSystemWorkspaceBinding.FileSystem,
  }> {
    createTestFilesystem('file://test1');
    const {project} = createTestFilesystem('file://test2');
    const dialog = new UI.Dialog.Dialog('select-workspace');
    const hideDialogSpy = sinon.spy(dialog, 'hide');

    const view = createViewFunctionStub(AiAssistance.SelectWorkspaceDialog);
    const onProjectSelected = sinon.spy() as sinon.SinonSpy<[Workspace.Workspace.Project], void>;
    const component = new AiAssistance.SelectWorkspaceDialog({dialog, onProjectSelected}, view);
    component.markAsRoot();
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    component.show(container);
    await view.nextInput;
    sinon.assert.callCount(view, 1);
    assert.strictEqual(view.input.selectedIndex, 0);

    return {view, component, onProjectSelected, hideDialogSpy, project};
  }

  describe('screenshots', () => {
    beforeEach(() => {
      updateHostConfig({
        aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING},
      });
    });

    function renderViewForScreenshots() {
      const noop = () => {};
      const target = document.createElement('div');
      target.style.maxWidth = '420px';
      target.style.maxHeight = '600px';
      target.style.padding = '12px';
      renderElementIntoDOM(target);
      AiAssistance.SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW(
          {
            folders: [
              {
                name: 'workspace-project',
                path: 'workspace-project',
              },
              {
                name: 'another-project',
                path: 'another-project',
              }
            ],
            selectedIndex: 0,
            selectProjectRootText: i18n.i18n.lockedString(
                'Source code from the selected folder is sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.'),
            showAutomaticWorkspaceNudge: false,
            onProjectSelected: noop,
            onSelectButtonClick: noop,
            onCancelButtonClick: noop,
            onAddFolderButtonClick: noop,
            onListItemKeyDown: noop,
          },
          undefined, target);
    }

    it('should render correctly in light mode', async () => {
      renderViewForScreenshots();
      await assertScreenshot('ai_assistance/select-workspace-dialog-light-default.png');
    });

    it('should render correctly in dark mode', async () => {
      setColorScheme('dark');
      renderViewForScreenshots();
      await assertScreenshot('ai_assistance/select-workspace-dialog-dark-default.png');
    });
  });

  it('selects a project', async () => {
    const {view, onProjectSelected, hideDialogSpy, project} = await createComponent();
    view.input.onProjectSelected(1);
    const input = await view.nextInput;
    sinon.assert.callCount(view, 2);
    assert.strictEqual(input.selectedIndex, 1);

    view.input.onSelectButtonClick();
    assert.isTrue(onProjectSelected.calledOnceWith(project));
    sinon.assert.calledOnce(hideDialogSpy);
  });

  it('can be canceled', async () => {
    const {view, onProjectSelected, hideDialogSpy} = await createComponent();
    view.input.onProjectSelected(1);
    const input = await view.nextInput;
    sinon.assert.callCount(view, 2);
    assert.strictEqual(input.selectedIndex, 1);

    view.input.onCancelButtonClick();
    sinon.assert.notCalled(onProjectSelected);
    sinon.assert.calledOnce(hideDialogSpy);
  });

  it('listens to ArrowUp/Down', async () => {
    const {view} = await createComponent();
    view.input.onListItemKeyDown(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
    let input = await view.nextInput;
    sinon.assert.callCount(view, 2);
    assert.strictEqual(input.selectedIndex, 1);

    view.input.onListItemKeyDown(new KeyboardEvent('keydown', {key: 'ArrowUp'}));
    input = await view.nextInput;
    sinon.assert.callCount(view, 3);
    assert.strictEqual(input.selectedIndex, 0);
  });

  it('can add projects', async () => {
    const addProjectSpy =
        sinon.spy(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(), 'addFileSystem');
    const {view} = await createComponent();
    sinon.assert.callCount(view, 1);
    assert.lengthOf(view.input.folders, 2);
    assert.strictEqual(view.input.selectedIndex, 0);

    view.input.onAddFolderButtonClick();
    sinon.assert.calledOnce(addProjectSpy);

    createTestFilesystem('file://test3');
    const input = await view.nextInput;
    sinon.assert.callCount(view, 2);
    assert.lengthOf(input.folders, 3);
    assert.strictEqual(input.folders[2].name, 'test3');
    assert.strictEqual(input.selectedIndex, 2);
  });

  it('handles project removal', async () => {
    const addProjectSpy =
        sinon.spy(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(), 'addFileSystem');
    const {view, project} = await createComponent();

    view.input.onProjectSelected(1);
    let input = await view.nextInput;
    sinon.assert.callCount(view, 2);
    assert.lengthOf(input.folders, 2);
    assert.strictEqual(input.selectedIndex, 1);

    input.onAddFolderButtonClick();
    sinon.assert.calledOnce(addProjectSpy);

    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
    input = await view.nextInput;
    assert.lengthOf(input.folders, 1);
    assert.strictEqual(input.selectedIndex, 0);
  });

  it('allows selecting an automatic workspace', async () => {
    setupAutomaticFileSystem({hasFileSystem: true});
    const {view, onProjectSelected, hideDialogSpy} = await createComponent();

    sinon.assert.callCount(view, 1);
    assert.lengthOf(view.input.folders, 3);
    assert.strictEqual(view.input.selectedIndex, 0);
    assert.strictEqual(view.input.folders[0].name, 'my-automatic-file-system');

    view.input.onSelectButtonClick();
    await new Promise(resolve => setTimeout(resolve, 0));
    const {project: automaticFileSystemProject} = createTestFilesystem(`file://${root}`);

    assert.isTrue(onProjectSelected.calledOnceWith(automaticFileSystemProject));
    sinon.assert.calledOnce(hideDialogSpy);
  });
});
