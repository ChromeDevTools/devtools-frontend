// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as AIAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import {assertScreenshot, querySelectorErrorOnMissing, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  updateHostConfig,
  waitFor,
} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
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
      isFirstMessage: false,
      shouldShowCSSChangeSummary: false,
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
    activeSidebarMessage: null,
    inlineExpandedMessages: [],
  };

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
          isFirstMessage: false,
          shouldShowCSSChangeSummary: false,
          showActions: true,
          message: {
            entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
            parts: [],
            rpcId: 99,
          },
          isLoading: false,
          isReadOnly: false,
          canShowFeedbackForm: false,
          markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
          currentRating: undefined,
          suggestions: props.suggestions,
          walkthrough: {
            ...DEFAULT_WALKTHROUGH,
            ...(props.walkthrough ?? {}),
          },
          ...props,
        },
        {}, target);
    return target;
  }

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
      updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
    });

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

    it('renders "Hide thinking" when the walkthrough is open for the message', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isExpanded: true,
          activeSidebarMessage: stepMessage,
          isInlined: false,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.innerText, 'Hide thinking');
    });

    it('renders "Show thinking" when the walkthrough is closed but was the active message', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: false,
          activeSidebarMessage: stepMessage,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.innerText, 'Show thinking');
    });

    it('renders "Hide agent walkthrough" when the walkthrough is open and has widgets', () => {
      const widgetMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{
          type: 'step',
          step: {
            isLoading: false,
            title: 'Step with widget',
            widgets: [
              {
                name: 'CORE_VITALS',
              } as unknown as AIAssistanceModel.AiAgent.AiWidget,
            ],
          },
        }],
        rpcId: 99,
      };

      const target = renderView({
        message: widgetMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: true,
          activeSidebarMessage: widgetMessage,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.innerText, 'Hide agent walkthrough');
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

    it('accessible label appends "Show thinking" when showing step title', async () => {
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
      assert.strictEqual(button.getAttribute('accessibleLabel'), 'Investigating XYZ Show thinking');
    });

    it('accessible label defaults to visible text when generic', async () => {
      const target = renderView({
        isLoading: false,
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.getAttribute('accessibleLabel'), 'Show thinking');
    });

    it('accessible label defaults to visible text when expanded and not loading', async () => {
      const target = renderView({
        isLoading: false,
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: true,
          activeSidebarMessage: stepMessage,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.getAttribute('accessibleLabel'), 'Hide thinking');
    });

    it('accessible label appends "Hide thinking" when expanded and loading', async () => {
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
          isExpanded: true,
          activeSidebarMessage: loadingMessage,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.getAttribute('accessibleLabel'), 'Investigating XYZ Hide thinking');
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

    it('makes the walkthrough button "Show thinking" if there are no widgets', async () => {
      const messageNoWidgets: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{
          type: 'step',
          step: {
            isLoading: false,
            title: 'Investigating XYZ',
            code: 'console.log("test")',
          },
        }],
        rpcId: 99,
      };
      const target = renderView({
        isLoading: false,
        message: messageNoWidgets,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.innerText, 'Show thinking');
    });

    it('makes the walkthrough button "Show agent walkthrough" if there are widgets', async () => {
      const messageWithWidget: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{
          type: 'step',
          step: {
            isLoading: false,
            title: 'Investigating XYZ',
            code: 'console.log("test")',
            // Don't need a proper widget for this test
            widgets: [{} as AIAssistanceModel.AiAgent.ComputedStyleAiWidget],
          },
        }],
        rpcId: 99,
      };
      const target = renderView({
        isLoading: false,
        message: messageWithWidget,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        }
      });
      const button = querySelectorErrorOnMissing(target, '[data-show-walkthrough]');
      assert.strictEqual(button.innerText, 'Show agent walkthrough');
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

    it('renders side effect confirmation regardless of walkthrough expansion state', () => {
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

      // Test closed state
      const targetClosed = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: false,
        }
      });
      assert.isNotNull(targetClosed.querySelector('.side-effect-container'));
      assert.include(targetClosed.querySelector('.side-effect-container')?.textContent, sideEffectDescription);

      // Test open state
      const targetOpen = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: true,
          activeSidebarMessage: sideEffectMessage,
        }
      });
      assert.isNotNull(targetOpen.querySelector('.side-effect-container'));
      assert.include(targetOpen.querySelector('.side-effect-container')?.textContent, sideEffectDescription);
    });

    it('renders side effect confirmation in inline mode regardless of walkthrough expansion state', () => {
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

      // Test closed state
      const targetClosed = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: false,
        }
      });
      assert.isNotNull(targetClosed.querySelector('.side-effect-container'));
      assert.include(targetClosed.querySelector('.side-effect-container')?.textContent, sideEffectDescription);

      // Test open state
      const targetOpen = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: true,
          inlineExpandedMessages: [sideEffectMessage],
        }
      });
      assert.isNotNull(targetOpen.querySelector('.side-effect-container'));
      assert.include(targetOpen.querySelector('.side-effect-container')?.textContent, sideEffectDescription);
    });

    it('renders side effect confirmation below the text output', () => {
      const sideEffectDescription = 'Proceed with cation!';
      const textOutput = 'Here is some text output before the action.';

      const message: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'answer',
            text: textOutput,
          },
          {
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
          },
        ],
        rpcId: 99,
      };

      const target = renderView({
        message,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: false,
        }
      });

      const answerBody = target.querySelector('.answer-body-wrapper');
      const sideEffect = target.querySelector('.side-effect-container');

      assert.isNotNull(answerBody);
      assert.isNotNull(sideEffect);

      // Verify that sideEffect appears after answerBody in the DOM
      const position = answerBody.compareDocumentPosition(sideEffect);
      assert.isTrue(
          Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING),
          'Side effect confirmation should render after the text output');
    });

    it('does not force walkthrough expansion when there are side-effect steps', () => {
      const sideEffectMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{
          type: 'step',
          step: {
            isLoading: false,
            title: 'Side Effect Step',
            code: 'doSomethingDangerous()',
            requestApproval: {
              description: 'Confirm!',
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
          isInlined: true,
          isExpanded: false,
        }
      });

      const walkthrough = target.querySelector('.walkthrough-inline');
      if (walkthrough) {
        assert.isFalse(walkthrough.hasAttribute('open'));
      }
    });

    it('renders widget name and top reveal button when widgetName is provided', async () => {
      const root = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
      const domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
      const target = sinon.createStubInstance(SDK.Target.Target);
      root.domModel.returns(domModel);
      domModel.target.returns(target);
      root.backendNodeId.returns(1 as Protocol.DOM.BackendNodeId);

      const messageWithNamedWidget: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [{
          type: 'widget',
          widgets: [{
            name: 'DOM_TREE',
            data: {
              root,
            },
          }],
        }],
        rpcId: 99,
      };

      // We need to mock the widget maker to return a name
      const targetElement = document.createElement('div');
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
            isFirstMessage: false,
            shouldShowCSSChangeSummary: false,
            showActions: true,
            message: messageWithNamedWidget,
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {}, targetElement);

      // We need to wait for the async renderWidgets
      const widgetHeader = await waitFor('.widget-header', targetElement);
      assert.isNotNull(widgetHeader);
      assert.strictEqual(widgetHeader.querySelector('.widget-name')?.textContent, 'LCP element');
      const revealButton = widgetHeader.querySelector('.widget-reveal-button');
      assert.isNotNull(revealButton);
      assert.strictEqual(revealButton.getAttribute('accessibleLabel'), 'Reveal');
    });

    it('renders the "Export for agents" button after action buttons and before suggestions when onExportClick is provided, it is the last message, and V2 is enabled',
       async () => {
         updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
         const onExportClick = sinon.stub();
         const target = renderView({
           onExportClick,
           isLastMessage: true,
           showActions: true,
           suggestions: ['suggestion'],
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
         });

         const row = querySelectorErrorOnMissing(target, '.ai-assistance-feedback-row');
         const exportButton = querySelectorErrorOnMissing(row, '.export-for-agents-button');

         assert.strictEqual(exportButton.textContent?.trim(), 'Copy to coding agent');
         assert.strictEqual(exportButton.getAttribute('aria-label'), 'Copy to coding agent');
         exportButton.click();
         sinon.assert.calledOnce(onExportClick);
       });

    it('does not render the "Export for agents" button when V2 is disabled', async () => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: false}});
      const onExportClick = sinon.stub();
      const target = renderView({
        onExportClick,
        isLastMessage: true,
        showActions: true,
      });

      const exportButton = target.querySelector('.export-for-agents-button');
      assert.isNull(exportButton);
    });
  });

  describe('CSS change summary', () => {
    beforeEach(() => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
    });

    it('should render devtools-code-block when hasAiV2 is true, changeSummary is present and shouldShowCSSChangeSummary is true',
       async () => {
         const target = renderView({
           shouldShowCSSChangeSummary: true,
           changeSummary: 'test summary',
         });

         const codeBlock = target.querySelector('devtools-code-block');
         assert.instanceOf(codeBlock, MarkdownView.CodeBlock.CodeBlock);
         assert.strictEqual(codeBlock.code, 'test summary');
         assert.strictEqual(codeBlock.displayLimit, 11);
       });

    it('should NOT render devtools-code-block when changeSummary is missing', async () => {
      const target = renderView({
        shouldShowCSSChangeSummary: true,
        changeSummary: undefined,
      });

      const codeBlock = target.querySelector('devtools-code-block');
      assert.isNull(codeBlock);
    });

    it('should NOT render devtools-code-block when shouldShowCSSChangeSummary is false', async () => {
      const target = renderView({
        shouldShowCSSChangeSummary: false,
        changeSummary: 'test summary',
      });

      const codeBlock = target.querySelector('devtools-code-block');
      assert.isNull(codeBlock);
    });

    it('should NOT render devtools-code-block when hasAiV2 is false', async () => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: false}});
      const target = renderView({
        shouldShowCSSChangeSummary: true,
        changeSummary: 'test summary',
      });

      const codeBlock = target.querySelector('devtools-code-block');
      assert.isNull(codeBlock);
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
            isFirstMessage: false,
            shouldShowCSSChangeSummary: false,
            showActions: true,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
              parts: [],
              rpcId: 99,
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: true,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {}, target);
      await assertScreenshot('ai_assistance/user_action_row_minimal.png');
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
            isFirstMessage: false,
            shouldShowCSSChangeSummary: false,
            showActions: false,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.USER,
              text: 'Can you help me fix specific CSS rules?',
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {}, target);
      await assertScreenshot('ai_assistance/user_action_row_user_message.png');
    });

    it('should apply is-first-message class when isFirstMessage is true', () => {
      const userTarget = document.createElement('div');
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
            isLastMessage: false,
            isFirstMessage: true,
            shouldShowCSSChangeSummary: false,
            showActions: false,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.USER,
              text: 'First user message',
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {}, userTarget);
      const userMessage = querySelectorErrorOnMissing(userTarget, '.chat-message');
      assert.isTrue(userMessage.classList.contains('is-first-message'));

      const modelTarget = document.createElement('div');
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
            isLastMessage: false,
            isFirstMessage: true,
            shouldShowCSSChangeSummary: false,
            showActions: false,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
              parts: [],
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {}, modelTarget);
      const modelMessage = querySelectorErrorOnMissing(modelTarget, '.chat-message');
      assert.isTrue(modelMessage.classList.contains('is-first-message'));
    });
  });
});
