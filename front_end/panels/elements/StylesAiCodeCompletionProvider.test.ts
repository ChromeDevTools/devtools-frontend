// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {createTarget, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import * as Elements from './elements.js';

function createProvider(): {
  provider: Elements.StylesAiCodeCompletionProvider.StylesAiCodeCompletionProvider,
  config: TextEditor.AiCodeCompletionProvider.AiCodeCompletionConfig,
} {
  const config = {
    panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor.STYLES,
    completionContext: {},
    generationContext: {},
    onFeatureEnabled: () => {},
    onFeatureDisabled: () => {},
    onSuggestionAccepted: () => {},
    onRequestTriggered: () => {},
    onResponseReceived: () => {},
    getCompletionHint: () => null,
    getCurrentText: () => '',
    setAiAutoCompletion: () => {},
  };
  const provider = Elements.StylesAiCodeCompletionProvider.StylesAiCodeCompletionProvider.createInstance(config);
  return {provider, config};
}

function createCssModelAndProperty(): {cssModel: SDK.CSSModel.CSSModel, cssProperty: SDK.CSSProperty.CSSProperty} {
  const cssContent = 'body { color: red; }';
  const header = sinon.createStubInstance(SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
  header.requestContentData.resolves(
      new TextUtils.ContentData.ContentData(cssContent, /* isBase64=*/ false, 'text/css'));
  const target = createTarget();
  const cssModel = new SDK.CSSModel.CSSModel(target);
  sinon.stub(cssModel, 'styleSheetHeaderForId').returns(header);
  const cssProperty = new SDK.CSSProperty.CSSProperty(
      {styleSheetId: 'test-sheet-id'} as SDK.CSSStyleDeclaration.CSSStyleDeclaration,
      0,
      'color',
      'red',
      true,
      false,
      true,
      false,
      'color: red;',
      new TextUtils.TextRange.TextRange(0, 7, 0, 18),
  );
  return {cssModel, cssProperty};
}

describeWithEnvironment('StylesAiCodeCompletionProvider', () => {
  let clock: sinon.SinonFakeTimers;
  let checkAccessPreconditionsStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    updateHostConfig({
      devToolsAiCodeCompletionStyles: {
        enabled: true,
      },
      aidaAvailability: {
        enabled: true,
        blockedByAge: false,
        blockedByGeo: false,
        blockedByEnterprisePolicy: false,
      }
    });

    sinon.stub(Host.AidaClient.HostConfigTracker.instance(), 'pollAidaAvailability').resolves();
    checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
  });

  afterEach(() => {
    clock.restore();
  });

  it('does not create a provider when the feature is disabled', () => {
    updateHostConfig({
      devToolsAiCodeCompletionStyles: {
        enabled: false,
      },
    });
    assert.throws(() => createProvider(), 'AI code completion feature in Styles is not enabled.');
  });

  describe('Triggers code completion', () => {
    it('when property name is being edited', async () => {
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode');
      const {provider} = createProvider();
      const {cssModel, cssProperty} = createCssModelAndProperty();
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      await provider.triggerAiCodeCompletion('backgro', 7, true, cssProperty, cssModel);

      sinon.assert.calledOnce(completeCodeStub);
      const [prefix, suffix, cursorPosition, language] = completeCodeStub.firstCall.args;
      assert.deepEqual(prefix, 'body { backgro');
      assert.deepEqual(suffix, ' }');
      assert.deepEqual(cursorPosition, 7);
      assert.deepEqual(language, Host.AidaClient.AidaInferenceLanguage.CSS);
    });

    it('when property value is being edited', async () => {
      const completeCodeStub = sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode');
      const {provider} = createProvider();
      const {cssModel, cssProperty} = createCssModelAndProperty();
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      await provider.triggerAiCodeCompletion('pur', 3, false, cssProperty, cssModel);

      sinon.assert.calledOnce(completeCodeStub);
      const [prefix, suffix, cursorPosition, language] = completeCodeStub.firstCall.args;
      assert.deepEqual(prefix, 'body { color: pur');
      assert.deepEqual(suffix, ' }');
      assert.deepEqual(cursorPosition, 3);
      assert.deepEqual(language, Host.AidaClient.AidaInferenceLanguage.CSS);
    });
  });

  it('makes a callback when AIDA returns a suggestion', async () => {
    const completeCodeStub =
        sinon.stub(AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.prototype, 'completeCode').resolves({
          response: {
            generatedSamples: [{
              generationString: 'suggestion',
              score: 1,
            }],
            metadata: {rpcGlobalId: 1},
          },
          fromCache: false,
        });
    const {provider, config} = createProvider();
    const setAiAutoCompletionSpy = sinon.spy(config, 'setAiAutoCompletion');
    const onRequestTriggeredSpy = sinon.spy(config, 'onRequestTriggered');
    const onResponseReceivedSpy = sinon.spy(config, 'onResponseReceived');
    const {cssModel, cssProperty} = createCssModelAndProperty();
    await clock.tickAsync(0);

    await provider.triggerAiCodeCompletion('bl', 2, false, cssProperty, cssModel);

    sinon.assert.calledOnce(onRequestTriggeredSpy);
    sinon.assert.calledOnce(completeCodeStub);
    const [prefix, suffix] = completeCodeStub.firstCall.args;
    assert.strictEqual(prefix, 'body { color: bl');
    assert.strictEqual(suffix, ' }');
    sinon.assert.calledOnce(onResponseReceivedSpy);
    sinon.assert.calledOnce(setAiAutoCompletionSpy);
    const completionArgs = (setAiAutoCompletionSpy).firstCall.args[0];
    assert.isNotNull(completionArgs);
    assert.strictEqual(completionArgs.text, 'suggestion');
  });
});
