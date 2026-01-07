// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('ChatMessage', () => {
  function createComponent(props: AiAssistance.ChatMessage.MessageInput):
      [ViewFunctionStub<typeof AiAssistance.ChatMessage.ChatMessage>, AiAssistance.ChatMessage.ChatMessage] {
    const view = createViewFunctionStub(AiAssistance.ChatMessage.ChatMessage);
    const component = new AiAssistance.ChatMessage.ChatMessage(undefined, view);
    Object.assign(component, props);
    component.wasShown();
    return [view, component];
  }

  it('should show the feedback form when canShowFeedbackForm is true', async () => {
    const [view] = createComponent({
      message: {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [],
        rpcId: 99,
      },
      isLoading: false,
      isReadOnly: false,
      isLastMessage: true,
      userInfo: {},
      markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
      canShowFeedbackForm: true,
      onSuggestionClick: sinon.stub(),
      onCopyResponseClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    sinon.assert.callCount(view, 1);

    {
      expect(view.input.showRateButtons).equals(true);
      expect(view.input.isShowingFeedbackForm).equals(false);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);
    {
      expect(view.input.isShowingFeedbackForm).equals(true);
    }
  });

  it('should not show the feedback form when canShowFeedbackForm is false', async () => {
    const [view] = createComponent({
      message: {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [],
        rpcId: 99,
      },
      isLoading: false,
      isReadOnly: false,
      isLastMessage: true,
      userInfo: {},
      markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
      canShowFeedbackForm: false,
      onSuggestionClick: sinon.stub(),
      onCopyResponseClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    sinon.assert.callCount(view, 1);

    {
      expect(view.input.isShowingFeedbackForm).equals(false);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);
    {
      expect(view.input.isShowingFeedbackForm).equals(false);
    }
  });

  it('should disable the submit button when the input is empty', async () => {
    const [view] = createComponent({
      message: {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [],
        rpcId: 99,
      },
      isLoading: false,
      isReadOnly: false,
      isLastMessage: false,
      userInfo: {},
      markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
      canShowFeedbackForm: true,
      onSuggestionClick: sinon.stub(),
      onCopyResponseClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    sinon.assert.callCount(view, 1);

    {
      expect(view.input.isSubmitButtonDisabled).equals(true);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);

    {
      expect(view.input.isShowingFeedbackForm).equals(true);
      view.input.onInputChange('test');
    }

    {
      expect(view.input.isSubmitButtonDisabled).equals(false);
      view.input.onSubmit(new SubmitEvent('submit'));
    }

    {
      expect(view.input.isSubmitButtonDisabled).equals(true);
    }
  });

  it('shows no rate buttons when rpcId is not present', async () => {
    const [view] = createComponent({
      message: {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [],
      },
      isLoading: false,
      isReadOnly: false,
      isLastMessage: true,
      userInfo: {},
      markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
      canShowFeedbackForm: true,
      onSuggestionClick: sinon.stub(),
      onCopyResponseClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    sinon.assert.callCount(view, 1);
    expect(view.input.showRateButtons).equals(false);
  });

  describe('view', () => {
    it('renders a minimal model message', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.ChatMessage.DEFAULT_VIEW(
          {
            onRatingClick: () => {},
            onReportClick: () => {},
            onCopyResponseClick: () => {},
            scrollSuggestionsScrollContainer: () => {},
            onSuggestionsScrollOrResize: () => {},
            onSuggestionClick: () => {},
            onSubmit: () => {},
            onClose: () => {},
            onInputChange: () => {},
            onFeedbackSubmit: () => {},
            showRateButtons: true,
            isSubmitButtonDisabled: false,
            isShowingFeedbackForm: true,
            isLastMessage: true,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
              parts: [],
              rpcId: 99,
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: true,
            userInfo: {},
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
          },
          {}, target);
      await assertScreenshot('ai_assistance/user_action_row_minimal.png');
    });

    it('renders a complete model message', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.ChatMessage.DEFAULT_VIEW(
          {
            onRatingClick: () => {},
            onReportClick: () => {},
            onCopyResponseClick: () => {},
            scrollSuggestionsScrollContainer: () => {},
            onSuggestionsScrollOrResize: () => {},
            onSuggestionClick: () => {},
            onSubmit: () => {},
            onClose: () => {},
            onInputChange: () => {},
            onFeedbackSubmit: () => {},
            showRateButtons: true,
            isSubmitButtonDisabled: false,
            isShowingFeedbackForm: true,
            isLastMessage: true,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
              rpcId: 99,
              parts: [
                {
                  type: 'step',
                  step: {
                    isLoading: false,
                    title: 'Analyzing the page',
                    thought: 'I am checking the page content to find the issue.',
                    code: 'document.body.innerHTML',
                    output: '<body>...</body>',
                  }
                },
                {
                  type: 'answer',
                  text: 'The page seems to have some content.',
                  suggestions: ['Fix the issue', 'Explain more'],
                }
              ],
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: true,
            userInfo: {},
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            suggestions: ['Fix the issue', 'Explain more'],
          },
          {}, target);
      await assertScreenshot('ai_assistance/user_action_row_complete.png');
    });

    it('renders a complete user message', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.ChatMessage.DEFAULT_VIEW(
          {
            onRatingClick: () => {},
            onReportClick: () => {},
            onCopyResponseClick: () => {},
            scrollSuggestionsScrollContainer: () => {},
            onSuggestionsScrollOrResize: () => {},
            onSuggestionClick: () => {},
            onSubmit: () => {},
            onClose: () => {},
            onInputChange: () => {},
            onFeedbackSubmit: () => {},
            showRateButtons: false,
            isSubmitButtonDisabled: false,
            isShowingFeedbackForm: false,
            isLastMessage: true,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.USER,
              text: 'Can you help me fix specific CSS rules?',
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            userInfo: {
              accountFullName: 'Test',
            },
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
          },
          {}, target);
      await assertScreenshot('ai_assistance/user_action_row_user_message.png');
    });
  });
});
