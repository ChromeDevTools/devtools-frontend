// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as PanelCommon from '../../panels/common/common.js';
import {
  cleanup,
  createPatchWidget,
  createTestFilesystem,
  initializePersistenceImplForTests,
  mockAidaClient,
} from '../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as AiAssistance from './ai_assistance.js';

describeWithMockConnection('PatchWidget', () => {
  let showFreDialogStub: sinon.SinonStub<Parameters<typeof PanelCommon.FreDialog.show>, Promise<boolean>>;
  beforeEach(() => {
    Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(true);
    showFreDialogStub = sinon.stub(PanelCommon.FreDialog, 'show');

    initializePersistenceImplForTests();
  });

  afterEach(() => {
    cleanup();
  });

  describe('applyToWorkspace', () => {
    beforeEach(() => {
      createTestFilesystem('file://test');
      Common.Settings.Settings.instance().createSetting('ai-assistance-patching-selected-project-id', 'file://test');
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: true,
        },
      });
    });

    it('should show FRE dialog on applyToWorkspace click if the setting is false', async () => {
      Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(false);
      const {view, panel} = await createPatchWidget();
      panel.changeSummary = 'body { background-color: red; }';

      view.input.onApplyToWorkspace();

      assert.isTrue(showFreDialogStub.called, 'Expected FreDialog to be shown but it\'s not shown');
    });

    it('should not show FRE dialog on applyToWorkspace click if the setting is true', async () => {
      Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(true);
      const {view, panel} = await createPatchWidget();
      panel.changeSummary = 'body { background-color: red; }';

      view.input.onApplyToWorkspace();

      assert.isFalse(showFreDialogStub.called, 'Expected FreDialog to be not shown but it\'s shown');
    });

    it('should show files uploaded', async () => {
      Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(true);
      const {view, panel} = await createPatchWidget({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'updateFiles', args: {files: ['index.html']}}]}], [{
            explanation: 'done',
          }]
        ]),
      });
      panel.changeSummary = 'body { background-color: red; }';

      view.input.onApplyToWorkspace();

      assert.strictEqual((await view.nextInput).sources, `Filenames in test.
Files:
* index.html`);
    });
  });

  describe('workspace', () => {
    let project: Persistence.FileSystemWorkspaceBinding.FileSystem;

    beforeEach(() => {
      project = createTestFilesystem('file://test').project;
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: true,
        },
      });
    });

    it('does not select a workspace project if patching is disabled', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: false,
        },
      });
      const {view} = await createPatchWidget();
      assert.isUndefined(view.input.projectName);
    });

    it('does not select a workspace project if setting does not exist', async () => {
      const {view} = await createPatchWidget();
      assert.isUndefined(view.input.projectName);
    });

    it('selects a workspace project matching the setting', async () => {
      Common.Settings.Settings.instance().createSetting('ai-assistance-patching-selected-project-id', 'file://test');
      const {view} = await createPatchWidget();
      assert.strictEqual(view.input.projectName, 'test');
    });

    it('removes a selected workspace project upon workspace removal', async () => {
      Common.Settings.Settings.instance().createSetting('ai-assistance-patching-selected-project-id', 'file://test');
      const {view} = await createPatchWidget();
      assert.strictEqual(view.input.projectName, 'test');

      Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
      const input = await view.nextInput;
      assert.isUndefined(input.projectName);
    });

    it('selection is triggered by applyToWorkspace click if no workspace is (pre-)selected', async () => {
      let handler: (project: Workspace.Workspace.Project) => void = () => {};
      const showSelectWorkspaceDialogStub =
          sinon.stub(AiAssistance.SelectWorkspaceDialog, 'show').callsFake((handleProjectSelected, _project) => {
            handler = handleProjectSelected;
          });
      const {view, panel} = await createPatchWidget({aidaClient: mockAidaClient([[{explanation: 'suggested patch'}]])});
      panel.changeSummary = 'body { background-color: red; }';
      assert.isUndefined(view.input.projectName);

      // Simulate clicking the "Apply to workspace" button
      view.input.onApplyToWorkspace();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.isTrue(showSelectWorkspaceDialogStub.calledOnce);

      // Simulate selecting a workspace with the SelectWorkspaceDialog
      handler(project);
      const input = await view.nextInput;

      // Assert that a patch has been generated and a project has been selected
      assert.strictEqual(input.patchSuggestion, 'suggested patch');
      assert.strictEqual(input.projectName, 'test');
    });

    it('selection is triggered by the "change"-button if a workspace is already (pre-)selected', async () => {
      const {project: project2} = createTestFilesystem('file://test2');
      Common.Settings.Settings.instance().createSetting('ai-assistance-patching-selected-project-id', 'file://test');
      let handler: (project: Workspace.Workspace.Project) => void = () => {};
      const showSelectWorkspaceDialogStub =
          sinon.stub(AiAssistance.SelectWorkspaceDialog, 'show').callsFake((onProjectSelected, _project) => {
            handler = onProjectSelected;
          });
      const {view, panel} = await createPatchWidget();
      panel.changeSummary = 'body { background-color: red; }';
      assert.strictEqual(view.input.projectName, 'test');

      // Simulate clicking the "Change" button
      assert.isTrue(showSelectWorkspaceDialogStub.notCalled);
      view.input.onChangeWorkspaceClick();
      assert.isTrue(showSelectWorkspaceDialogStub.calledOnce);

      // Simulate selecting a different workspace with the SelectWorkspaceDialog
      handler(project2);
      const input = await view.nextInput;

      // Assert that the project has been updated
      assert.strictEqual(input.projectName, 'test2');
    });
  });
});
