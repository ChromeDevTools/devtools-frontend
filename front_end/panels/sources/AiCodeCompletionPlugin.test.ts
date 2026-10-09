// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as Lit from '../../ui/lit/lit.js';
import * as PanelCommon from '../common/common.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;
const {html} = Lit;
const {AiCodeCompletionPlugin} = Sources;

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
        'AI code completion feature is not available.');
  });

  describe('provider callbacks', () => {
    let clock: sinon.SinonFakeTimers;
    let container: HTMLElement;
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
        },
      });
      sinon.stub(TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider, 'createInstance')
          .returns(sinon.createStubInstance(TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider));
      sinon.stub(Host.AidaClient.HostConfigTracker, 'instance').returns({
        addEventListener: () => {},
        removeEventListener: () => {},
        dispose: () => {},
      } as unknown as Host.AidaClient.HostConfigTracker);
      container = renderElementIntoDOM(document.createElement('div'));
    });

    afterEach(async () => {
      await clock.runAllAsync();
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
      const listener = sinon.spy();
      plugin.addEventListener(Sources.Plugin.Events.TOOLBAR_ITEMS_CHANGED, listener);
      const providerConfig = plugin.aiCodeCompletionConfig;

      providerConfig.onFeatureEnabled();

      sinon.assert.calledOnce(listener);
      const toolbarItems = plugin.rightToolbarItems();
      assert.lengthOf(toolbarItems, 1);
      Lit.render(html`${toolbarItems}`, container);
      const disclaimerContainer = container.querySelector('.ai-code-completion-disclaimer-container');
      assert.isNotNull(disclaimerContainer);
      assert.strictEqual(disclaimerContainer.childElementCount, 1);
    });

    it('cleans up toolbar when the feature is disabled', async () => {
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      providerConfig.onFeatureEnabled();
      assert.lengthOf(plugin.rightToolbarItems(), 1);
      const listener = sinon.spy();
      plugin.addEventListener(Sources.Plugin.Events.TOOLBAR_ITEMS_CHANGED, listener);

      providerConfig.onFeatureDisabled();

      sinon.assert.calledOnce(listener);
      assert.isEmpty(plugin.rightToolbarItems());
    });

    it('shows a loading state when a request is triggered', async () => {
      const fakeLoadingSetter = sinon.fake();
      sinon.stub(TextEditor.AiCodeCompletionDisclaimer.AiCodeCompletionDisclaimer.prototype, 'loading')
          .set(fakeLoadingSetter);
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      providerConfig.onFeatureEnabled();
      Lit.render(html`${plugin.rightToolbarItems()}`, container);
      fakeLoadingSetter.resetHistory();

      providerConfig.onRequestTriggered();

      sinon.assert.calledOnce(fakeLoadingSetter);
      assert.isTrue(fakeLoadingSetter.firstCall.args[0]);
    });

    it('hides the loading indicator when a response is received', async () => {
      const fakeLoadingSetter = sinon.fake();
      sinon.stub(TextEditor.AiCodeCompletionDisclaimer.AiCodeCompletionDisclaimer.prototype, 'loading')
          .set(fakeLoadingSetter);
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      providerConfig.onFeatureEnabled();
      Lit.render(html`${plugin.rightToolbarItems()}`, container);
      fakeLoadingSetter.resetHistory();
      providerConfig.onRequestTriggered();
      sinon.assert.calledOnce(fakeLoadingSetter);
      assert.isTrue(fakeLoadingSetter.firstCall.args[0]);

      providerConfig.onResponseReceived();

      sinon.assert.calledTwice(fakeLoadingSetter);
      assert.isFalse(fakeLoadingSetter.secondCall.args[0]);
    });

    it('attaches the citations toolbar when a suggestion with citations is accepted', async () => {
      const updateCitationsSpy = sinon.spy(
          PanelCommon.AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'updateCitations');
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      const editor = new TextEditor.TextEditor.TextEditor();
      const editorDispatchSpy = sinon.spy(editor, 'dispatch');

      plugin.editorInitialized(editor);
      providerConfig.onFeatureEnabled();
      providerConfig.onResponseReceived();

      providerConfig.onSuggestionAccepted([{uri: 'https://example.com/source'}]);

      sinon.assert.calledOnce(updateCitationsSpy);
      assert.deepEqual(updateCitationsSpy.firstCall.args, [['https://example.com/source']]);
      sinon.assert.calledWith(editorDispatchSpy, {
        effects: sinon.match(effect => effect.is(SourceFrame.SourceFrame.addSourceFrameInfobar)),
      });
    });

    it('does not attach the citations toolbar if there are no citations', async () => {
      const updateCitationsSpy = sinon.spy(
          PanelCommon.AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'updateCitations');
      const plugin = setupPlugin();
      await clock.tickAsync(0);
      const providerConfig = plugin.aiCodeCompletionConfig;
      const editor = new TextEditor.TextEditor.TextEditor();
      const editorDispatchSpy = sinon.spy(editor, 'dispatch');

      plugin.editorInitialized(editor);
      providerConfig.onFeatureEnabled();
      providerConfig.onResponseReceived();

      providerConfig.onSuggestionAccepted([]);

      sinon.assert.notCalled(updateCitationsSpy);
      sinon.assert.notCalled(editorDispatchSpy);
    });
  });
});
