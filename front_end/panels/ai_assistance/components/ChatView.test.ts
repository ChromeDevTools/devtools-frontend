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
      canShowFreeFormFeedback: false,
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
                  action: '$0.style.background = "blue";',
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
              action: 'getCookieValues({cookieNames: ["session"]})',
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

    it('focuses the "No" button when one permission prompt replaces another in a single render', async () => {
      const stepA: AiAssistancePanel.ChatMessage.Step = {
        state: {
          type: 'needs_approval',
          sideEffectDialog: {
            description: 'The AI wants to read the cookie "session" on https://example.com.',
            permissionTitle: 'Allow reading cookie values?',
            permissionPrompt: AiAssistanceModel.Tool.PermissionPrompt.ALLOW_ONCE,
            onAnswer: () => {},
          },
        },
        title: 'Reading cookie values and metadata',
        action: 'getCookieValues({cookieNames: ["session"]})',
      };
      const stepB: AiAssistancePanel.ChatMessage.Step = {
        state: {
          type: 'needs_approval',
          sideEffectDialog: {
            description: 'The AI wants to read localStorage on https://example.com.',
            permissionTitle: 'Allow reading localStorage values?',
            permissionPrompt: AiAssistanceModel.Tool.PermissionPrompt.ALLOW_ONCE,
            onAnswer: () => {},
          },
        },
        title: 'Reading localStorage values and metadata',
        action: 'getStorageValues({storageType: "local"})',
      };

      const chat = new AiAssistancePanel.ChatView(getProp({
        messages: [
          userMessage,
          {
            entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
            id: '2',
            parts: [{type: 'step', step: stepA}],
          },
        ],
      }));
      renderElementIntoDOM(chat);
      await Promise.resolve();

      const [noButtonA, yesButtonA] =
          Array.from(chat.shadowRoot!.querySelectorAll<HTMLElement>('.permission-prompt devtools-button'));
      assert.strictEqual(chat.shadowRoot!.activeElement, noButtonA);

      yesButtonA.focus();
      assert.strictEqual(chat.shadowRoot!.activeElement, yesButtonA);

      // Prompt A is answered and prompt B appears before the next render.
      stepA.state = {type: 'completed'};
      chat.props = getProp({
        messages: [
          userMessage,
          {
            entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
            id: '2',
            parts: [{type: 'step', step: stepA}, {type: 'step', step: stepB}],
          },
        ],
      });
      await Promise.resolve();

      const [noButtonB] =
          Array.from(chat.shadowRoot!.querySelectorAll<HTMLElement>('.permission-prompt devtools-button'));
      assert.strictEqual(chat.shadowRoot!.activeElement, noButtonB);
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

  describe('scrolling', () => {
    async function renderScrollableChat(): Promise<{
      chat: AiAssistancePanel.ChatView,
      main: HTMLElement,
      container: HTMLElement,
      appendMessage: () => Promise<void>,
    }> {
      const messages: AiAssistancePanel.ChatMessage.Message[] = [];
      for (let i = 0; i < 10; i++) {
        messages.push({
          entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.USER,
          id: `user-${i}`,
          text: `User message ${i}\nLine 2\nLine 3`,
        });
        messages.push({
          entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.MODEL,
          id: `model-${i}`,
          parts: [{type: 'answer', text: `Model response ${i}\nLine 2\nLine 3`}],
        });
      }

      const chat = new AiAssistancePanel.ChatView(getProp({messages}));
      chat.style.display = 'block';
      chat.style.height = '100%';
      const container = document.createElement('div');
      container.style.width = '400px';
      container.style.height = '200px';
      container.append(chat);
      renderElementIntoDOM(container, {includeCommonStyles: true});
      // First frame renders child ChatMessage widgets and fires ResizeObserver;
      // second frame flushes the resulting programmatic scroll event through #handleScroll.
      await raf();
      await raf();
      const main = chat.shadowRoot?.querySelector('main');
      assert.exists(main);
      assert.isAbove(main.scrollHeight, main.clientHeight);
      assert.isAbove(main.scrollTop, 0);

      let followUpCount = 0;
      async function appendMessage(): Promise<void> {
        assert.exists(main);
        const previousScrollHeight = main.scrollHeight;
        messages.push({
          entity: AiAssistancePanel.ChatMessage.ChatMessageEntity.USER,
          id: `user-follow-up-${followUpCount++}`,
          text: 'Follow-up message\nLine 2\nLine 3\nLine 4',
        });
        chat.props = getProp({messages: [...messages]});
        // First frame renders child ChatMessage widgets and fires ResizeObserver;
        // second frame flushes the resulting programmatic scroll event through #handleScroll.
        await raf();
        await raf();
        assert.isAbove(main.scrollHeight, previousScrollHeight);
      }

      return {chat, main, container, appendMessage};
    }

    it('re-pins auto-scroll when scrollToBottom is called after scrolling up', async () => {
      const {chat, main, appendMessage} = await renderScrollableChat();

      // Simulate manual scroll up to the top.
      main.scrollTop = 0;
      await raf();
      assert.strictEqual(main.scrollTop, 0);

      // Calling scrollToBottom should jump to the current bottom and re-pin auto-scroll.
      chat.scrollToBottom();
      const scrollTopAfterCall = main.scrollTop;
      assert.isAbove(scrollTopAfterCall, 0);
      await raf();

      // Appending a new message should resize the messages container and advance scrollTop again.
      await appendMessage();

      assert.isAbove(main.scrollTop, scrollTopAfterCall);
      assert.closeTo(main.scrollTop + main.clientHeight, main.scrollHeight, 2);
    });

    it('keeps auto-scroll unpinned on resize after manual scroll up', async () => {
      const {main, appendMessage} = await renderScrollableChat();

      main.scrollTop = 0;
      await raf();
      assert.strictEqual(main.scrollTop, 0);

      await appendMessage();

      assert.strictEqual(main.scrollTop, 0);
    });

    it('unpins on the first manual scroll up after a no-op scrollToBottom', async () => {
      const {chat, main, appendMessage} = await renderScrollableChat();

      // Already at the bottom, so scrollToBottom is a no-op scrollTop write.
      chat.scrollToBottom();

      // Immediately scroll up once; the single scroll event must not be swallowed.
      main.scrollTop = 0;
      await raf();
      assert.strictEqual(main.scrollTop, 0);

      await appendMessage();

      assert.strictEqual(main.scrollTop, 0);
    });

    it('preserves saved scroll position when restoreScrollPosition runs while hidden', async () => {
      const {chat, main, container, appendMessage} = await renderScrollableChat();

      // Scroll manually to a non-zero, non-bottom offset.
      main.scrollTop = 50;
      await raf();
      assert.strictEqual(main.scrollTop, 50);

      // Hiding the container clamps scrollTop to 0; restoring while hidden must not erase 50.
      container.style.display = 'none';
      chat.restoreScrollPosition();

      // Showing the container and restoring again should return to 50 without leaving
      // #isProgrammaticScroll stuck true.
      container.style.display = '';
      chat.restoreScrollPosition();
      await raf();
      assert.strictEqual(main.scrollTop, 50);

      // Confirm #handleScroll still processes user scrolls after the hidden restore.
      main.scrollTop = main.scrollHeight;
      await raf();
      await appendMessage();
      assert.closeTo(main.scrollTop + main.clientHeight, main.scrollHeight, 2);
    });
  });
});
