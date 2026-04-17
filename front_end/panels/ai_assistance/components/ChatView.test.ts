// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import {
  cleanup,
  initializePersistenceImplForTests,
  setupAutomaticFileSystem
} from '../../../testing/AiAssistanceHelpers.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as AiAssistancePanel from '../ai_assistance.js';

describeWithEnvironment('ChatView', () => {
  beforeEach(() => {
    initializePersistenceImplForTests();
    setupAutomaticFileSystem();
  });

  afterEach(() => {
    cleanup();
  });

  function getProp(options: Partial<AiAssistancePanel.Props>): AiAssistancePanel.Props {
    const noop = () => {};
    const messages = options.messages ?? [];
    const context = sinon.createStubInstance(AiAssistanceModel.StylingAgent.NodeContext);
    context.getTitle.returns('');
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
      changeManager: new AiAssistanceModel.ChangeManager.ChangeManager(),
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
            parts: [
              {
                type: 'step',
                step: {
                  isLoading: false,
                  title: 'Updating element styles',
                  thought: 'Updating element styles',
                  code: '$0.style.background = "blue";',
                  requestApproval: {
                    description: null,
                    onAnswer: () => {},
                  },
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

  describe('getCSSChangeSummaryMessage', () => {
    it('returns undefined if there are no messages', () => {
      const result = AiAssistancePanel.getCSSChangeSummaryMessage([], false);
      assert.isUndefined(result);
    });

    it('returns undefined if there are no model messages', () => {
      const messages: AiAssistancePanel.ChatMessage.Message[] = [
        {entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.USER, text: 'Hello'},
      ];
      const result = AiAssistancePanel.getCSSChangeSummaryMessage(messages, false);
      assert.isUndefined(result);
    });

    it('returns the last model message if not loading', () => {
      const modelMessage: AiAssistancePanel.ChatMessage.Message = {
        entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{type: 'answer', text: 'Response'}],
      };
      const messages: AiAssistancePanel.ChatMessage.Message[] = [
        {entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.USER, text: 'Hello'},
        modelMessage,
      ];
      const result = AiAssistancePanel.getCSSChangeSummaryMessage(messages, false);
      assert.strictEqual(result, modelMessage);
    });

    it('returns the last model message if loading but the last message is a user message', () => {
      const modelMessage: AiAssistancePanel.ChatMessage.Message = {
        entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{type: 'answer', text: 'Response'}],
      };
      const messages: AiAssistancePanel.ChatMessage.Message[] = [
        modelMessage,
        {entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.USER, text: 'Follow up'},
      ];
      const result = AiAssistancePanel.getCSSChangeSummaryMessage(messages, true);
      assert.strictEqual(result, modelMessage);
    });

    it('returns the penultimate model message if loading and the last message is a model message', () => {
      const modelMessage1: AiAssistancePanel.ChatMessage.Message = {
        entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{type: 'answer', text: 'Response 1'}],
      };
      const modelMessage2: AiAssistancePanel.ChatMessage.Message = {
        entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{type: 'answer', text: 'Response 2'}],
      };
      const messages: AiAssistancePanel.ChatMessage.Message[] = [
        modelMessage1,
        {entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.USER, text: 'Follow up'},
        modelMessage2,
      ];
      const result = AiAssistancePanel.getCSSChangeSummaryMessage(messages, true);
      assert.strictEqual(result, modelMessage1);
    });

    it('returns undefined if loading and there is only one model message and it is the last message', () => {
      const modelMessage: AiAssistancePanel.ChatMessage.Message = {
        entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{type: 'answer', text: 'Response'}],
      };
      const messages: AiAssistancePanel.ChatMessage.Message[] = [
        {entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.USER, text: 'Hello'},
        modelMessage,
      ];
      const result = AiAssistancePanel.getCSSChangeSummaryMessage(messages, true);
      assert.isUndefined(result);
    });
  });
});
