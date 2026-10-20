// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as AiAssistancePanel from '../ai_assistance.js';

describeWithEnvironment('ChatView', () => {
  function getProp(options: Partial<AiAssistancePanel.Props>): AiAssistancePanel.Props {
    const noop = () => {};
    const messages = options.messages ?? [];
    const context = sinon.createStubInstance(AiAssistanceModel.DOMNodeContext.DOMNodeContext);
    context.getTitle.returns('');
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node.classNames.returns([]);
    context.getItem.returns(node);
    return {
      onTextSubmit: noop,
      onInspectElementClick: noop,
      onFeedbackSubmit: noop,
      onCancelClick: noop,
      onContextClick: noop,
      onCopyResponseClick: noop,
      onNewConversation: noop,
      onExportConversation: noop,
      generateConversationSummary: async () => '',
      conversationMarkdown: 'placeholder conversation markdown',
      onContextRemoved: noop,
      onContextAdd: noop,
      inspectElementToggled: false,
      conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
      messages,
      context,
      isContextSelected: true,
      isLoading: false,
      canShowFeedbackForm: false,
      blockedByCrossOrigin: false,
      isReadOnly: false,
      isTextInputDisabled: false,
      emptyStateSuggestions: [],
      inputPlaceholder: i18n.i18n.lockedString('input placeholder'),
      textInputValue: '',
      onTextChange: noop,
      disclaimerText: i18n.i18n.lockedString('disclaimer text'),
      markdownRenderer: new AiAssistancePanel.MarkdownRendererWithCodeBlock(),
      walkthrough: {
        onToggle: () => {},
        onOpen: () => {},
        isInlined: false,
        isExpanded: false,
        activeSidebarMessage: null,
        inlineExpandedMessages: [],
      },
      ...options,
    };
  }

  describe('SideEffects', () => {
    it('should show SideEffects when the step contains "sideEffect" object', async () => {
      const props = getProp({
        messages: [
          {
            entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
            id: '1',
            parts: [
              {
                type: 'step',
                step: {
                  state: {
                    type: 'needs_approval',
                    sideEffectDialog: {
                      description: null,
                      onAnswer: () => {},
                    },
                  },
                  title: 'Updating element styles',
                  thought: 'Updating element styles',
                  code: '$0.style.background = "blue";',
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
  });

  describe('PermissionPrompt', () => {
    function createPendingPermissionMessage(): AiAssistancePanel.ChatMessage.ModelChatMessage {
      return {
        entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
        id: '2',
        parts: [
          {
            type: 'step',
            step: {
              state: {
                type: 'needs_approval',
                sideEffectDialog: {
                  description: 'The AI wants to read the cookie "session" on https://example.com.',
                  permissionTitle: 'Allow reading cookie values?',
                  permissionPrompt: AiAssistanceModel.Tool.PermissionPrompt.ALLOW_ONCE_OR_ALWAYS,
                  onAnswer: () => {},
                },
              },
              title: 'Reading cookie values and metadata',
              code: 'getCookieValues({cookieNames: ["session"]})',
            },
          },
        ],
      };
    }

    const userMessage: AiAssistancePanel.ChatMessage.UserChatMessage = {
      entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.USER,
      id: '1',
      text: 'What is in my session cookie?',
    };

    beforeEach(() => {
      updateHostConfig({devToolsAiNaturalLanguageInterface: {enabled: true}});
    });

    it('renders the prompt in place of the chat input when a step needs approval', () => {
      const chat = new AiAssistancePanel.ChatView(getProp({messages: [userMessage, createPendingPermissionMessage()]}));
      renderElementIntoDOM(chat);

      const prompt = chat.shadowRoot!.querySelector('.chat-input-widget .permission-prompt');
      assert.exists(prompt);
      assert.isNull(chat.shadowRoot!.querySelector('devtools-widget.chat-input-widget'));
      assert.isNull(chat.shadowRoot!.querySelector('.side-effect-confirmation'));
    });

    it('renders the chat input when no step needs approval', () => {
      const chat = new AiAssistancePanel.ChatView(getProp({messages: [userMessage]}));
      renderElementIntoDOM(chat);

      assert.isNull(chat.shadowRoot!.querySelector('.permission-prompt'));
      assert.exists(chat.shadowRoot!.querySelector('devtools-widget.chat-input-widget'));
    });

    it('renders the legacy confirmation inside the message when the flag is off', () => {
      updateHostConfig({devToolsAiNaturalLanguageInterface: {enabled: false}});
      const chat = new AiAssistancePanel.ChatView(getProp({messages: [userMessage, createPendingPermissionMessage()]}));
      renderElementIntoDOM(chat);

      assert.isNull(chat.shadowRoot!.querySelector('.permission-prompt'));
      assert.exists(chat.shadowRoot!.querySelector('devtools-widget.chat-input-widget'));
      assert.exists(chat.shadowRoot!.querySelector('.side-effect-confirmation'));
    });

    it('renders the prompt over the chat', async () => {
      const chat = new AiAssistancePanel.ChatView(getProp({messages: [userMessage, createPendingPermissionMessage()]}));
      const container = document.createElement('div');
      container.style.width = '600px';
      container.style.height = '400px';
      container.append(chat);
      renderElementIntoDOM(container, {includeCommonStyles: true});
      await raf();
      await assertScreenshot('ai_assistance/chat_view_permission_prompt.png');
    });
  });

  describe('Caching', () => {
    it('should cache the summary and not regenerate it if only the timestamp changes', async () => {
      const generateSummaryStub = sinon.stub().resolves('Summary');
      let capturedExportClick: (() => void)|undefined;
      const customView = (input: AiAssistancePanel.ChatWidgetInput) => {
        capturedExportClick = input.exportForAgentsClick;
      };

      const props = getProp({
        generateConversationSummary: generateSummaryStub,
        conversationMarkdown: '# Conversation\n\n**Export Timestamp (UTC):** 2026-04-15T10:00:00.000Z\n\n---\nContent',
      });

      const chat = new AiAssistancePanel.ChatView(props, customView);
      renderElementIntoDOM(chat);

      assert.exists(capturedExportClick);

      // Trigger export first time
      await capturedExportClick!();
      sinon.assert.callCount(generateSummaryStub, 1);

      // Update props with a new timestamp but same content
      chat.props = getProp({
        generateConversationSummary: generateSummaryStub,
        conversationMarkdown: '# Conversation\n\n**Export Timestamp (UTC):** 2026-04-15T11:00:00.000Z\n\n---\nContent',
      });

      // Trigger export second time
      await capturedExportClick!();
      // Should still be 1 because of cache
      sinon.assert.callCount(generateSummaryStub, 1);
    });
  });

  describe('Interaction', () => {
    it('should call onTextChange when the textarea text is changed', async () => {
      const onTextChangeStub = sinon.stub();
      const props = getProp({
        onTextChange: onTextChangeStub,
      });
      const chat = new AiAssistancePanel.ChatView(props);
      renderElementIntoDOM(chat);

      await raf();

      const textArea = chat.shadowRoot!.querySelector('.chat-input') as HTMLTextAreaElement;
      assert.exists(textArea);
      textArea.value = 'test text';
      textArea.dispatchEvent(new Event('input'));

      sinon.assert.calledWith(onTextChangeStub, 'test text');
    });
  });
});
