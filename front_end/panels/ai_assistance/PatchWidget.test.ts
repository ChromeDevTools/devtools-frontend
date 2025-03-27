// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as PanelCommon from '../../panels/common/common.js';
import {
  cleanup,
  createPatchWidget,
  createPatchWidgetWithDiffView,
  createTestFilesystem,
  initializePersistenceImplForTests,
  MockAidaAbortError,
  mockAidaClient,
  MockAidaFetchError,
} from '../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createContentProviderUISourceCode} from '../../testing/UISourceCodeHelpers.js';

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
      createContentProviderUISourceCode({
        url: Platform.DevToolsPath.urlString`file://test/index.html`,
        content: 'content',
        mimeType: 'text/javascript',
        projectType: Workspace.Workspace.projectTypes.Network,
        metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, 'content'.length),
      });
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: true,
        },
      });
    });

    describe('enterprise text cases', () => {
      it('should FRE text include no logging case when the enterprise policy value is ALLOW_WITHOUT_LOGGING',
         async () => {
           Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(false);
           updateHostConfig({
             devToolsFreestyler: {
               enabled: true,
               patching: true,
             },
             aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING}
           });
           const {view, widget} = await createPatchWidget();
           widget.changeSummary = 'body { background-color: red; }';

           view.input.onApplyToPageTree();

           assert.isTrue(showFreDialogStub.called, 'Expected FreDialog to be shown but it\'s not shown');
           assert.exists(showFreDialogStub.lastCall.args[0].reminderItems.find(
               reminderItem => reminderItem.content.toString().includes(
                   'This data will not be used to improve Google’s AI models.')));
         });

      it('should FRE text not include no logging case when the enterprise policy value is ALLOW_WITHOUT_LOGGING',
         async () => {
           Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(false);
           updateHostConfig({
             devToolsFreestyler: {
               enabled: true,
               patching: true,
             },
             aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW}
           });
           const {view, widget} = await createPatchWidget();
           widget.changeSummary = 'body { background-color: red; }';

           view.input.onApplyToPageTree();

           assert.isTrue(showFreDialogStub.called, 'Expected FreDialog to be shown but it\'s not shown');
           assert.notExists(showFreDialogStub.lastCall.args[0].reminderItems.find(
               reminderItem => reminderItem.content.toString().includes(
                   'This data will not be used to improve Google’s AI models.')));
         });

      it('should tooltip text include no logging case when the enterprise policy value is ALLOW_WITHOUT_LOGGING',
         async () => {
           Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(false);
           updateHostConfig({
             devToolsFreestyler: {
               enabled: true,
               patching: true,
             },
             aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING}
           });
           const {view} = await createPatchWidget();

           assert.include(
               view.input.disclaimerTooltipText, 'This data will not be used to improve Google’s AI models.');
         });

      it('should tooltip text not include no logging case when the enterprise policy value is ALLOW', async () => {
        Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(false);
        updateHostConfig({
          devToolsFreestyler: {
            enabled: true,
            patching: true,
          },
          aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW}
        });
        const {view} = await createPatchWidget();

        assert.notInclude(
            view.input.disclaimerTooltipText, 'This data will not be used to improve Google’s AI models.');
      });
    });

    it('should show FRE dialog on applyToWorkspace click if the setting is false', async () => {
      Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(false);
      const {view, widget} = await createPatchWidget();
      widget.changeSummary = 'body { background-color: red; }';

      view.input.onApplyToPageTree();

      assert.isTrue(showFreDialogStub.called, 'Expected FreDialog to be shown but it\'s not shown');
    });

    it('should not show FRE dialog on applyToWorkspace click if the setting is true', async () => {
      Common.Settings.moduleSetting('ai-assistance-patching-fre-completed').set(true);
      const {view, widget} = await createPatchWidget();
      widget.changeSummary = 'body { background-color: red; }';

      view.input.onApplyToPageTree();

      assert.isFalse(showFreDialogStub.called, 'Expected FreDialog to be not shown but it\'s shown');
    });

    it('should show files uploaded', async () => {
      const {view, widget} = await createPatchWidget({
        aidaClient: mockAidaClient([
          [{explanation: '', functionCalls: [{name: 'updateFiles', args: {files: ['/index.html']}}]}], [{
            explanation: 'done',
          }]
        ]),
      });
      widget.changeSummary = 'body { background-color: red; }';

      view.input.onApplyToPageTree();

      assert.strictEqual((await view.nextInput).sources, `Filenames in page.
Files:
* /index.html`);
    });

    it('should show error state when applyToWorkspace fails', async () => {
      const {view, widget} = await createPatchWidget({aidaClient: mockAidaClient([[MockAidaFetchError]])});
      widget.changeSummary = 'body { background-color: red; }';

      view.input.onApplyToPageTree();

      const input = await view.nextInput;
      assert.strictEqual(input.patchSuggestionState, AiAssistance.PatchWidget.PatchSuggestionState.ERROR);
    });

    it('should return back to initial state when the user aborts applying to workspace', async () => {
      const {view, widget} = await createPatchWidget({aidaClient: mockAidaClient([[MockAidaAbortError]])});
      widget.changeSummary = 'body { background-color: red; }';

      view.input.onApplyToPageTree();

      const input = await view.nextInput;
      assert.strictEqual(input.patchSuggestionState, AiAssistance.PatchWidget.PatchSuggestionState.INITIAL);
    });
  });

  describe('diff view', () => {
    let fileSystemUISourceCode: Workspace.UISourceCode.UISourceCode;
    let commitWorkingCopyStub:
        sinon.SinonStub<Parameters<typeof Workspace.UISourceCode.UISourceCode.prototype.commitWorkingCopy>>;
    let resetWorkingCopyStub:
        sinon.SinonStub<Parameters<typeof Workspace.UISourceCode.UISourceCode.prototype.resetWorkingCopy>>;

    beforeEach(() => {
      fileSystemUISourceCode = createTestFilesystem('file://test').uiSourceCode;
      Common.Settings.Settings.instance().createSetting('ai-assistance-patching-selected-project-id', 'file://test');
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: true,
        },
      });

      commitWorkingCopyStub =
          sinon.stub(Workspace.UISourceCode.UISourceCode.prototype, 'commitWorkingCopy').callThrough();
      resetWorkingCopyStub =
          sinon.stub(Workspace.UISourceCode.UISourceCode.prototype, 'resetWorkingCopy').callThrough();
    });

    it('on apply should call handle function and stash changes', async () => {
      const {
        view,
        widget,
      } = await createPatchWidget({aidaClient: mockAidaClient([[{explanation: 'patch applied'}]])});
      widget.changeSummary = 'body { background-color: red; }';
      const changeManager = sinon.createStubInstance(AiAssistanceModel.ChangeManager);
      widget.changeManager = changeManager;
      view.input.onApplyToPageTree();
      await view.nextInput;
      assert.isTrue(changeManager.stashChanges.calledOnce);
    });

    it('save all should commit the working copy of the changed UI codes to the disk and render savedToDisk view',
       async () => {
         const {view, widget} = await createPatchWidgetWithDiffView();
         const changeManager = sinon.createStubInstance(AiAssistanceModel.ChangeManager);
         widget.changeManager = changeManager;
         fileSystemUISourceCode.setWorkingCopy('working copy');

         view.input.onSaveAll();
         const nextInput = await view.nextInput;

         assert.isTrue(nextInput.savedToDisk);
         assert.isTrue(commitWorkingCopyStub.called, 'Expected commitWorkingCopy to be called but it is not called');
         assert.isTrue(changeManager.dropStashedChanges.calledOnce);
       });

    it('discard should discard the working copy and render the view without patchSuggestion', async () => {
      const {view, widget} = await createPatchWidgetWithDiffView();
      const changeManager = sinon.createStubInstance(AiAssistanceModel.ChangeManager);
      widget.changeManager = changeManager;
      fileSystemUISourceCode.setWorkingCopy('working copy');

      view.input.onDiscard();
      const nextInput = await view.nextInput;

      assert.strictEqual(nextInput.patchSuggestionState, AiAssistance.PatchWidget.PatchSuggestionState.INITIAL);
      assert.isTrue(resetWorkingCopyStub.called, 'Expected resetWorkingCopy to be called but it is not called');
      assert.isTrue(changeManager.popStashedChanges.calledOnce);
    });
  });
});
