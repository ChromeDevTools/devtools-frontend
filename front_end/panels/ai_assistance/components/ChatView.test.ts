// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import {initializePersistenceImplForTests, setupAutomaticFileSystem} from '../../../testing/AiAssistanceHelpers.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as AiAssistancePanel from '../ai_assistance.js';

describeWithEnvironment('ChatView', () => {
  function getProp(options: Partial<AiAssistancePanel.Props>): AiAssistancePanel.Props {
    const noop = () => {};
    const messages: AiAssistancePanel.ChatMessage[] = options.messages ?? [];
    const selectedContext = sinon.createStubInstance(AiAssistanceModel.NodeContext);
    selectedContext.getTitle.returns('');
    return {
      onTextSubmit: noop,
      onInspectElementClick: noop,
      onFeedbackSubmit: noop,
      onCancelClick: noop,
      onContextClick: noop,
      onNewConversation: noop,
      onTextInputChange: noop,
      changeManager: new AiAssistanceModel.ChangeManager(),
      inspectElementToggled: false,
      state: AiAssistancePanel.State.CHAT_VIEW,
      conversationType: AiAssistanceModel.ConversationType.STYLING,
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      messages,
      selectedContext,
      isLoading: false,
      canShowFeedbackForm: false,
      userInfo: {},
      blockedByCrossOrigin: false,
      isReadOnly: false,
      isTextInputDisabled: false,
      emptyStateSuggestions: [],
      inputPlaceholder: i18n.i18n.lockedString('input placeholder'),
      disclaimerText: i18n.i18n.lockedString('disclaimer text'),
      isTextInputEmpty: true,
      ...options,
    };
  }

  describe('SideEffects', () => {
    it('should show SideEffects when the step contains "sideEffect" object', async () => {
      initializePersistenceImplForTests();
      setupAutomaticFileSystem();

      const props = getProp({
        messages: [
          {
            entity: AiAssistancePanel.ChatMessageEntity.MODEL,
            steps: [
              {
                isLoading: false,
                title: 'Updating element styles',
                thought: 'Updating element styles',
                code: '$0.style.background = "blue";',
                sideEffect: {
                  onAnswer: () => {},
                },
              },
            ],
          },
        ],
      });
      const chat = new AiAssistancePanel.ChatView(props);
      renderElementIntoDOM(chat);

      const sideEffect = chat.shadowRoot!.querySelector('.side-effect-confirmation');
      assert.exists(sideEffect);
    });

    it('shows the disabled view when the state is CONSENT_VIEW', async () => {
      const props = getProp({
        state: AiAssistancePanel.State.CONSENT_VIEW,
      });
      const chat = new AiAssistancePanel.ChatView(props);
      renderElementIntoDOM(chat);

      const optIn = chat.shadowRoot?.querySelector('.disabled-view');
      assert.strictEqual(
          optIn?.textContent?.trim(), 'Turn on AI assistance in Settings to get help with understanding CSS styles');
    });

    it('shows the disabled view when the AIDA is not available', async () => {
      const props = getProp({
        state: AiAssistancePanel.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_INTERNET,
      });
      const chat = new AiAssistancePanel.ChatView(props);
      renderElementIntoDOM(chat);

      const optIn = chat.shadowRoot?.querySelector('.disabled-view');
      assert.strictEqual(optIn?.textContent?.trim(), 'Check your internet connection and try again');
    });

    describe('no agent empty state', () => {
      it('should show feature cards for enabled features', () => {
        updateHostConfig({
          devToolsFreestyler: {
            enabled: true,
          },
          devToolsAiAssistanceNetworkAgent: {
            enabled: true,
          },
          devToolsAiAssistanceFileAgent: {
            enabled: true,
          },
          devToolsAiAssistancePerformanceAgent: {
            enabled: true,
          },
        });
        const props = getProp({
          conversationType: undefined,
        });
        const chat = new AiAssistancePanel.ChatView(props);
        renderElementIntoDOM(chat);
        const featureCards = chat.shadowRoot?.querySelectorAll('.feature-card');
        assert.isDefined(featureCards);
        assert.strictEqual(featureCards?.length, 4);
        assert.strictEqual(featureCards[0].querySelector('.feature-card-content h3')?.textContent, 'CSS styles');
        assert.strictEqual(featureCards[1].querySelector('.feature-card-content h3')?.textContent, 'Network');
        assert.strictEqual(featureCards[2].querySelector('.feature-card-content h3')?.textContent, 'Files');
        assert.strictEqual(featureCards[3].querySelector('.feature-card-content h3')?.textContent, 'Performance');
      });

      it('should not show any feature cards if none of the entrypoints are available', () => {
        updateHostConfig({
          devToolsFreestyler: {
            enabled: false,
          },
          devToolsAiAssistanceNetworkAgent: {
            enabled: false,
          },
          devToolsAiAssistanceFileAgent: {
            enabled: false,
          },
          devToolsAiAssistancePerformanceAgent: {
            enabled: false,
          },
        });
        const props = getProp({
          conversationType: undefined,
        });
        const chat = new AiAssistancePanel.ChatView(props);
        renderElementIntoDOM(chat);
        const featureCards = chat.shadowRoot?.querySelectorAll('.feature-card');
        assert.isDefined(featureCards);
        assert.strictEqual(featureCards?.length, 0);
      });
    });
  });
});
