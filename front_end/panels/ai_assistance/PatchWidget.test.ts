// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
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
    it('does not report a workspace project if disabled', async () => {
      createTestFilesystem('file://test');
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: false,
        },
      });
      const {view} = await createPatchWidget();
      assert.isUndefined(view.input.projectName);
    });

    it('reports a current workspace project', async () => {
      createTestFilesystem('file://test');
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: true,
        },
      });
      const {view} = await createPatchWidget();
      assert.strictEqual(view.input.projectName, 'test');
    });

    it('reports an updated project', async () => {
      const {project} = createTestFilesystem('file://test');
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: true,
        },
      });
      const {view} = await createPatchWidget();
      assert.strictEqual(view.input.projectName, 'test');

      Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
      createTestFilesystem('file://test2');
      assert.strictEqual((await view.nextInput).projectName, 'test2');
    });
  });
});
