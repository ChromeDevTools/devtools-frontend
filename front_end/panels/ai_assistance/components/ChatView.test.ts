// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('ChatView', () => {
  function getProp(options: Partial<AiAssistance.Props>): AiAssistance.Props {
    const noop = () => {};
    const messages: AiAssistance.ChatMessage[] = options.messages ?? [];
    const selectedContext = sinon.createStubInstance(AiAssistance.NodeContext);
    selectedContext.getTitle.returns('');
    return {
      onTextSubmit: noop,
      onInspectElementClick: noop,
      onFeedbackSubmit: noop,
      onCancelClick: noop,
      onContextClick: noop,
      onNewConversation: noop,
      inspectElementToggled: false,
      state: AiAssistance.State.CHAT_VIEW,
      agentType: AiAssistance.AgentType.STYLING,
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      messages,
      selectedContext,
      isLoading: false,
      canShowFeedbackForm: false,
      userInfo: {},
      blockedByCrossOrigin: false,
      stripLinks: false,
      isReadOnly: false,
      ...options,
    };
  }

  describe('SideEffects', () => {
    it('should show SideEffects when the step contains "sideEffect" object', async () => {
      const props = getProp({
        messages: [
          {
            entity: AiAssistance.ChatMessageEntity.MODEL,
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
      const chat = new AiAssistance.ChatView(props);
      renderElementIntoDOM(chat);

      const sideEffect = chat.shadowRoot!.querySelector('.side-effect-confirmation');
      assert.exists(sideEffect);
    });

    it('shows the disabled view when the state is CONSENT_VIEW', async () => {
      const props = getProp({
        state: AiAssistance.State.CONSENT_VIEW,
      });
      const chat = new AiAssistance.ChatView(props);
      renderElementIntoDOM(chat);

      const optIn = chat.shadowRoot?.querySelector('.disabled-view');
      assert.strictEqual(
          optIn?.textContent?.trim(), 'Turn on AI assistance in Settings to get help with understanding CSS styles');
      const chatInput = chat.shadowRoot?.querySelector('.chat-input') as HTMLTextAreaElement;
      assert.isTrue(chatInput.disabled);
      assert.strictEqual(chatInput.placeholder, 'Follow the steps above to ask a question');
    });

    it('shows the disabled view when the AIDA is not available', async () => {
      const props = getProp({
        state: AiAssistance.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_INTERNET,
      });
      const chat = new AiAssistance.ChatView(props);
      renderElementIntoDOM(chat);

      const optIn = chat.shadowRoot?.querySelector('.disabled-view');
      assert.strictEqual(optIn?.textContent?.trim(), 'Check your internet connection and try again');
      const chatInput = chat.shadowRoot?.querySelector('.chat-input') as HTMLTextAreaElement;
      assert.isTrue(chatInput.disabled);
      assert.strictEqual(chatInput.placeholder, 'Ask a question about the selected element');
    });

    describe('no agent empty state', () => {
      it('should show feature cards for enabled features', () => {
        Object.assign(Root.Runtime.hostConfig, {
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
          agentType: undefined,
        });
        const chat = new AiAssistance.ChatView(props);
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
        Object.assign(Root.Runtime.hostConfig, {
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
          agentType: undefined,
        });
        const chat = new AiAssistance.ChatView(props);
        renderElementIntoDOM(chat);
        const featureCards = chat.shadowRoot?.querySelectorAll('.feature-card');
        assert.isDefined(featureCards);
        assert.strictEqual(featureCards?.length, 0);
      });
    });
  });
});
