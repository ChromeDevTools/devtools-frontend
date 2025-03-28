// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  cleanup,
  createPatchWidget,
  createPatchWidgetWithDiffView,
  initializePersistenceImplForTests,
  MockAidaAbortError,
  mockAidaClient,
  MockAidaFetchError,
} from '../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createContentProviderUISourceCode, createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';

import * as AiAssistance from './ai_assistance.js';

describeWithMockConnection('PatchWidget', () => {
  beforeEach(() => {
    initializePersistenceImplForTests();
  });

  afterEach(() => {
    cleanup();
  });

  describe('applyToPageTree', () => {
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
      it('should tooltip text include no logging case when the enterprise policy value is ALLOW_WITHOUT_LOGGING',
         async () => {
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

    it('should show error state when applyToPageTree fails', async () => {
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
    const origContent = 'window.foo = () => "foo";\n';
    let fileSystemUISourceCode: Workspace.UISourceCode.UISourceCode;
    let commitWorkingCopyStub:
        sinon.SinonStub<Parameters<typeof Workspace.UISourceCode.UISourceCode.prototype.commitWorkingCopy>>;
    let resetWorkingCopyStub:
        sinon.SinonStub<Parameters<typeof Workspace.UISourceCode.UISourceCode.prototype.resetWorkingCopy>>;

    beforeEach(() => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          patching: true,
        },
      });

      const url = Platform.DevToolsPath.urlString`https://example.com/script.js`;
      createContentProviderUISourceCode({
        url,
        content: origContent,
        mimeType: 'text/javascript',
        projectType: Workspace.Workspace.projectTypes.Network,
        metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, origContent.length),
      });

      commitWorkingCopyStub =
          sinon.stub(Workspace.UISourceCode.UISourceCode.prototype, 'commitWorkingCopy').callThrough();
      resetWorkingCopyStub =
          sinon.stub(Workspace.UISourceCode.UISourceCode.prototype, 'resetWorkingCopy').callThrough();
    });

    const createBoundFileSystemUISourceCode = () => {
      const localUrl = Platform.DevToolsPath.urlString`file:///var/www/script.js`;
      ({uiSourceCode: fileSystemUISourceCode} = createFileSystemUISourceCode({
         url: localUrl,
         mimeType: 'text/javascript',
         content: origContent,
         autoMapping: true,
         metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, origContent.length),
       }));
    };

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

    it('"save to workspace" is not available if there is no matching file system mapping', async () => {
      const {view, widget} = await createPatchWidgetWithDiffView();
      const changeManager = sinon.createStubInstance(AiAssistanceModel.ChangeManager);
      widget.changeManager = changeManager;
      assert.isUndefined(view.input.onSaveToWorkspace);
    });

    it('"save to workspace" should commit the working copy of the files to disk and update the view', async () => {
      createBoundFileSystemUISourceCode();
      fileSystemUISourceCode.setWorkingCopy('working copy');
      const {view, widget} = await createPatchWidgetWithDiffView();
      const changeManager = sinon.createStubInstance(AiAssistanceModel.ChangeManager);
      widget.changeManager = changeManager;

      assert.isDefined(view.input.onSaveToWorkspace);
      view.input.onSaveToWorkspace();
      const nextInput = await view.nextInput;

      assert.isTrue(nextInput.savedToDisk);
      assert.isTrue(commitWorkingCopyStub.called, 'Expected commitWorkingCopy to be called but it is not called');
      assert.isTrue(changeManager.dropStashedChanges.calledOnce);
    });

    it('discard should discard the working copy and render the view without patchSuggestion', async () => {
      createBoundFileSystemUISourceCode();
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
