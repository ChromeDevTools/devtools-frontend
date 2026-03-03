// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import {assertScreenshot, querySelectorErrorOnMissing, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('ChatMessage', () => {
  function createComponent(props: Partial<AiAssistance.ChatMessage.MessageInput> = {}):
      [ViewFunctionStub<typeof AiAssistance.ChatMessage.ChatMessage>, AiAssistance.ChatMessage.ChatMessage] {
    const view = createViewFunctionStub(AiAssistance.ChatMessage.ChatMessage);
    const component = new AiAssistance.ChatMessage.ChatMessage(undefined, view);
    Object.assign(component, {
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
      ...props,
    });
    component.wasShown();
    return [view, component];
  }

  const DEFAULT_WALKTHROUGH: AiAssistance.ChatMessage.ChatMessageViewInput['walkthrough'] = {
    onOpen: () => {},
    onToggle: () => {},
    isExpanded: false,
    isInlined: false,
  };

  it('should show the feedback form when canShowFeedbackForm is true', async () => {
    const [view] = createComponent({
      canShowFeedbackForm: true,
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
      canShowFeedbackForm: false,
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
      isLastMessage: false,
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
    });

    sinon.assert.callCount(view, 1);
    expect(view.input.showRateButtons).equals(false);
  });

  it('should show actions when it is not the last message and it is loading', async () => {
    const [view] = createComponent({
      isLoading: true,
      isLastMessage: false,
    });

    sinon.assert.callCount(view, 1);
    expect(view.input.showActions).equals(true);
  });

  it('should not show actions when it is the last message and it is loading', async () => {
    const [view] = createComponent({
      isLoading: true,
      isLastMessage: true,
    });

    sinon.assert.callCount(view, 1);
    expect(view.input.showActions).equals(false);
  });

  it('should not show suggestions when it is not the last message', async () => {
    const [view] = createComponent({
      message: {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'answer',
            text: 'test',
            suggestions: ['suggestion'],
          },
        ],
        rpcId: 99,
      },
      isLastMessage: false,
    });

    sinon.assert.callCount(view, 1);
    expect(view.input.suggestions).equals(undefined);
  });

  it('should show suggestions when it is the last message', async () => {
    const [view] = createComponent({
      message: {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'answer',
            text: 'test',
            suggestions: ['suggestion'],
          },
        ],
        rpcId: 99,
      },
      isLastMessage: true,
    });

    sinon.assert.callCount(view, 1);
    expect(view.input.suggestions).deep.equals(['suggestion']);
  });

  describe('Walkthrough Rendering', () => {
    beforeEach(() => {
      Root.Runtime.hostConfig.devToolsAiAssistanceV2 = {
        enabled: true,
      };
    });

    function renderView(props: Partial<AiAssistance.ChatMessage.ChatMessageViewInput>) {
      const target = document.createElement('div');
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
            showActions: true,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
              parts: [],
              rpcId: 99,
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            userInfo: {},
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {
              ...DEFAULT_WALKTHROUGH,
              ...(props.walkthrough ?? {}),
            },
            ...props,
          },
          {}, target);
      return target;
    }

    const stepMessage: AiAssistance.ChatMessage.ModelChatMessage = {
      entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
      parts: [{
        type: 'step',
        step: {
          isLoading: false,
          title: 'Step 1',
          code: 'console.log("test")',
        },
      }],
      rpcId: 99,
    };

    it('renders "Show thinking" button when there are steps and not inline', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.innerText, 'Show thinking');
    });

    it('when the step is loading, the walkthrough CTA shows the title of the step', async () => {
      const loadingMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{
          type: 'step',
          step: {
            isLoading: true,
            title: 'Investigating XYZ',
            code: 'console.log("test")',
          },
        }],
        rpcId: 99,
      };
      const target = renderView({
        isLoading: true,
        message: loadingMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.innerText, 'Investigating XYZ');
    });

    it('does not render "Show thinking" button when inline', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
        }
      });
      assert.isNull(target.querySelector('[data-show-walkthrough]'));
    });

    it('renders inline walkthrough when inline', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: true,
        }
      });
      const walkthrough = target.querySelector('.walkthrough-container');
      assert.isNotNull(walkthrough);
    });

    it('does not render inline walkthrough when not inline', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: true,
        }
      });
      const walkthrough = target.querySelector('.walkthrough-container');
      assert.isNull(walkthrough);
    });

    it('renders side effect confirmation when not inline and walkthrough is hidden', () => {
      const sideEffectDescription = 'Proceed with cation!';

      const sideEffectMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{
          type: 'step',
          step: {
            isLoading: false,
            title: 'Side Effect Step',
            code: 'doSomethingDangerous()',
            requestApproval: {
              description: sideEffectDescription,
              onAnswer: () => {},
            },
          },
        }],
        rpcId: 99,
      };

      const target = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: false,
        }
      });
      const sideEffectContainer = target.querySelector('.side-effect-container');
      assert.isNotNull(sideEffectContainer);

      assert.isTrue(sideEffectContainer.textContent.includes(sideEffectDescription));
    });
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
            showActions: true,
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
            walkthrough: {...DEFAULT_WALKTHROUGH},
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
            showActions: true,
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
            walkthrough: {...DEFAULT_WALKTHROUGH},
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
            showActions: false,
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
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {}, target);
      await assertScreenshot('ai_assistance/user_action_row_user_message.png');
    });
  });
});
