// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as PanelCommon from '../common/common.js';

import {AiCodeCompletionPlugin} from './sources.js';

const {urlString} = Platform.DevToolsPath;

function createUiSourceCodeStub({
  url = urlString`file://`,
  contentType = Common.ResourceType.resourceTypes.Script,
}: {
  url?: Platform.DevToolsPath.UrlString,
  contentType?: Common.ResourceType.ResourceType,
} = {}): sinon.SinonStubbedInstance<Workspace.UISourceCode.UISourceCode> {
  return sinon.createStubInstance(Workspace.UISourceCode.UISourceCode, {
    url,
    contentType,
  });
}

describeWithEnvironment('AiCodeCompletionPlugin', () => {
  describe('accepts', () => {
    it('holds true for scripts', () => {
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(createUiSourceCodeStub({
        contentType: Common.ResourceType.resourceTypes.Script,
      })));
    });

    it('holds true for stylesheets', () => {
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(
          createUiSourceCodeStub({contentType: Common.ResourceType.resourceTypes.Stylesheet})));
    });

    it('holds true for documents', () => {
      assert.isTrue(AiCodeCompletionPlugin.AiCodeCompletionPlugin.accepts(
          createUiSourceCodeStub({contentType: Common.ResourceType.resourceTypes.Document})));
    });
  });

  it('does not create a plugin when the feature is disabled', () => {
    updateHostConfig({
      devToolsAiCodeCompletion: {
        enabled: false,
      },
    });
    const uiSourceCode = createUiSourceCodeStub();
    assert.throws(
        () => new AiCodeCompletionPlugin.AiCodeCompletionPlugin(uiSourceCode),
        'AI code completion feature is not enabled.');
  });

  describe('provider callbacks', () => {
    let clock: sinon.SinonFakeTimers;
    beforeEach(() => {
      clock = sinon.useFakeTimers();
      updateHostConfig({
        devToolsAiCodeCompletion: {
          enabled: true,
        },
        aidaAvailability: {
          enabled: true,
          blockedByAge: false,
          blockedByGeo: false,
        }
      });
      sinon.stub(TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider, 'createInstance')
          .returns(sinon.createStubInstance(TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider));
      sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
          .resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    });

    afterEach(() => {
      clock.restore();
    });

    function setupPlugin() {
      const uiSourceCode = createUiSourceCodeStub();
      const plugin = new AiCodeCompletionPlugin.AiCodeCompletionPlugin(uiSourceCode);
      return plugin;
    }

    it('initializes toolbar when the feature is enabled', async () => {
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;

      providerConfig.onFeatureEnabled();

      const toolbarItems = plugin.rightToolbarItems();
      assert.lengthOf(toolbarItems, 1);
      assert.isTrue(toolbarItems[0].element.classList.contains('ai-code-completion-disclaimer-container'));
      assert.deepEqual(toolbarItems[0].element.childElementCount, 1);
    });

    it('cleans up toolbar when the feature is disabled', async () => {
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      providerConfig.onFeatureEnabled();
      let toolbarItems = plugin.rightToolbarItems();
      assert.deepEqual(toolbarItems[0].element.childElementCount, 1);

      providerConfig.onFeatureDisabled();

      toolbarItems = plugin.rightToolbarItems();
      assert.deepEqual(toolbarItems[0].element.childElementCount, 0);
    });

    it('shows a loading state when a request is triggered', async () => {
      const fakeLoadingSetter = sinon.fake();
      sinon.stub(PanelCommon.AiCodeCompletionDisclaimer.prototype, 'loading').set(fakeLoadingSetter);
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      providerConfig.onFeatureEnabled();

      providerConfig.onRequestTriggered();

      sinon.assert.calledOnce(fakeLoadingSetter);
      assert.isTrue(fakeLoadingSetter.firstCall.args[0]);
    });

    it('hides the loading indicator when a response is received', async () => {
      const fakeLoadingSetter = sinon.fake();
      sinon.stub(PanelCommon.AiCodeCompletionDisclaimer.prototype, 'loading').set(fakeLoadingSetter);
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      providerConfig.onFeatureEnabled();
      providerConfig.onRequestTriggered();
      sinon.assert.calledOnce(fakeLoadingSetter);
      assert.isTrue(fakeLoadingSetter.firstCall.args[0]);

      providerConfig.onResponseReceived([]);

      sinon.assert.calledTwice(fakeLoadingSetter);
      assert.isFalse(fakeLoadingSetter.secondCall.args[0]);
    });

    it('attaches the citations toolbar when a suggestion with citations is accepted', async () => {
      const updateCitationsSpy = sinon.spy(PanelCommon.AiCodeCompletionSummaryToolbar.prototype, 'updateCitations');
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      const editor = new TextEditor.TextEditor.TextEditor();
      const editorDispatchSpy = sinon.spy(editor, 'dispatch');

      plugin.editorInitialized(editor);
      providerConfig.onFeatureEnabled();
      providerConfig.onResponseReceived([{uri: 'https://example.com/source'}]);

      providerConfig.onSuggestionAccepted();

      sinon.assert.calledOnce(updateCitationsSpy);
      assert.deepEqual(updateCitationsSpy.firstCall.args, [['https://example.com/source']]);
      sinon.assert.calledWith(editorDispatchSpy, {
        effects: sinon.match(effect => effect.is(SourceFrame.SourceFrame.addSourceFrameInfobar)),
      });
    });

    it('does not attach the citations toolbar if there are no citations', async () => {
      const updateCitationsSpy = sinon.spy(PanelCommon.AiCodeCompletionSummaryToolbar.prototype, 'updateCitations');
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      const editor = new TextEditor.TextEditor.TextEditor();
      const editorDispatchSpy = sinon.spy(editor, 'dispatch');

      plugin.editorInitialized(editor);
      providerConfig.onFeatureEnabled();
      providerConfig.onResponseReceived([]);

      providerConfig.onSuggestionAccepted();

      sinon.assert.notCalled(updateCitationsSpy);
      sinon.assert.notCalled(editorDispatchSpy);
    });
  });
});
