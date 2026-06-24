// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as AIAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import type * as Workspace from '../../../models/workspace/workspace.js';
import {
  assertScreenshot,
  querySelectorErrorOnMissing,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  updateHostConfig,
  waitFor,
} from '../../../testing/EnvironmentHelpers.js';
import {
  getBaseTraceHandlerData,
  makeFakeParsedTrace,
  microsecondsTraceWindow,
} from '../../../testing/TraceHelpers.js';
import {
  createViewFunctionStub,
  type ViewFunctionStub,
} from '../../../testing/ViewFunctionHelpers.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Snackbars from '../../../ui/components/snackbars/snackbars.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('ChatMessage', () => {
  function createComponent(
      props: Partial<AiAssistance.ChatMessage.MessageInput> = {},
      ):
      [
        ViewFunctionStub<typeof AiAssistance.ChatMessage.ChatMessage>,
        AiAssistance.ChatMessage.ChatMessage,
      ] {
    const view = createViewFunctionStub(AiAssistance.ChatMessage.ChatMessage);
    const component = new AiAssistance.ChatMessage.ChatMessage(undefined, view);
    Object.assign(component, {
      message: {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [],
        rpcId: 99,
        id: '1',
      },
      isLoading: false,
      isReadOnly: false,
      isLastMessage: true,
      isFirstMessage: false,
      prompt: 'test prompt',
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

  function renderView(
      props: Partial<AiAssistance.ChatMessage.ChatMessageViewInput>,
  ) {
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
          prompt: 'test prompt',
          shouldShowCSSChangeSummary: false,
          showActions: true,
          message: {
            entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
            parts: [],
            rpcId: 99,
            id: '1',
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
        {},
        target,
    );
    return target;
  }

  describe('Widget Deduplication', () => {
    it('should generate the same signature for identical widgets', () => {
      const widget1 = {
        name: 'CORE_VITALS',
        data: {
          insightSetKey: 'insight1',
          parsedTrace: makeFakeParsedTrace(),
        },
      } as AIAssistanceModel.AiAgent.AiWidget;
      const widget2 = {
        name: 'CORE_VITALS',
        data: {
          insightSetKey: 'insight1',
          parsedTrace: makeFakeParsedTrace(),
        },
      } as AIAssistanceModel.AiAgent.AiWidget;
      assert.strictEqual(
          AiAssistance.ChatMessage.getWidgetSignature(widget1),
          AiAssistance.ChatMessage.getWidgetSignature(widget2),
      );
    });

    it('should generate different signatures for different widgets', () => {
      const widget1 = {
        name: 'CORE_VITALS',
        data: {
          insightSetKey: 'insight1',
          parsedTrace: makeFakeParsedTrace(),
        },
      } as AIAssistanceModel.AiAgent.AiWidget;
      const widget2 = {
        name: 'CORE_VITALS',
        data: {
          insightSetKey: 'insight2',
          parsedTrace: makeFakeParsedTrace(),
        },
      } as AIAssistanceModel.AiAgent.AiWidget;
      assert.notStrictEqual(
          AiAssistance.ChatMessage.getWidgetSignature(widget1),
          AiAssistance.ChatMessage.getWidgetSignature(widget2),
      );
    });

    it('should deduplicate identical widgets across the entire message', () => {
      const widget = {
        name: 'PERFORMANCE_TRACE',
        data: {
          parsedTrace: makeFakeParsedTrace(),
        },
      } as AIAssistanceModel.AiAgent.AiWidget;
      const message = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'widget',
            widgets: [widget],
          },
          {
            type: 'step',
            step: {
              isLoading: false,
              widgets: [widget],
            },
          },
        ],
        id: '1',
      } as AiAssistance.ChatMessage.ModelChatMessage;
      const deduplicated = AiAssistance.ChatMessage.getDeduplicatedWidgetsMessage(message);
      assert.lengthOf(deduplicated.parts, 2);
      assert.strictEqual(deduplicated.parts[0].type, 'widget');
      assert.lengthOf(
          (deduplicated.parts[0] as AiAssistance.ChatMessage.WidgetPart).widgets,
          1,
      );
      assert.strictEqual(deduplicated.parts[1].type, 'step');
      assert.lengthOf(
          (deduplicated.parts[1] as AiAssistance.ChatMessage.StepPart).step.widgets!,
          0,
      );
    });

    describe('getWidgetSignature', () => {
      it('should correctly handle COMPUTED_STYLES widget', () => {
        const widget = {
          name: 'COMPUTED_STYLES',
          data: {
            backendNodeId: 1 as Protocol.DOM.BackendNodeId,
            computedStyles: new Map(),
            matchedCascade: {} as unknown as AIAssistanceModel.AiAgent.ComputedStyleAiWidget['data']['matchedCascade'],
            properties: [],
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'COMPUTED_STYLES:1',
        );
      });

      it('should correctly handle CORE_VITALS widget', () => {
        const widget = {
          name: 'CORE_VITALS',
          data: {
            insightSetKey: 'insight1',
            parsedTrace: makeFakeParsedTrace(),
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'CORE_VITALS:insight1',
        );
      });

      it('should correctly handle STYLE_PROPERTIES widget', () => {
        const widget = {
          name: 'STYLE_PROPERTIES',
          data: {
            backendNodeId: 1 as Protocol.DOM.BackendNodeId,
            selector: '.test',
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'STYLE_PROPERTIES:1:.test',
        );
      });

      it('should correctly handle DOM_TREE widget', () => {
        const widget = {
          name: 'DOM_TREE',
          data: {
            root: {
              backendNodeId: () => 1 as Protocol.DOM.BackendNodeId,
            } as unknown as AIAssistanceModel.AiAgent.DomTreeAiWidget['data']['root'],
            title: 'Title' as Platform.UIString.LocalizedString,
            accessibleRevealLabel: 'Label' as Platform.UIString.LocalizedString,
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'DOM_TREE:1',
        );
      });

      it('should correctly handle PERFORMANCE_TRACE widget', () => {
        const widget = {
          name: 'PERFORMANCE_TRACE',
          data: {
            parsedTrace: makeFakeParsedTrace(),
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'PERFORMANCE_TRACE',
        );
      });

      it('should correctly handle PERF_INSIGHT widget', () => {
        const widget = {
          name: 'PERF_INSIGHT',
          data: {
            insight: 'LCPBreakdown',
            insightData: {
              insightKey: 'LCPBreakdown',
              navigation: {
                args: {
                  data: {
                    navigationId: 'nav1',
                  },
                },
              },
            } as unknown as AIAssistanceModel.AiAgent.PerfInsightAiWidget['data']['insightData'],
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'PERF_INSIGHT:LCPBreakdown:LCPBreakdown:nav1',
        );
      });

      it('should correctly handle PERF_INSIGHT widget with render-blocking-request', () => {
        const widget = {
          name: 'PERF_INSIGHT',
          data: {
            insight: 'RenderBlocking',
            insightData: {
              insightKey: 'RenderBlocking',
              navigation: {
                args: {
                  data: {
                    navigationId: 'nav1',
                  },
                },
              },
            } as unknown as AIAssistanceModel.AiAgent.PerfInsightAiWidget['data']['insightData'],
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'PERF_INSIGHT:RenderBlocking:RenderBlocking:nav1',
        );
      });

      it('should correctly handle TIMELINE_RANGE_SUMMARY widget', () => {
        const widget = {
          name: 'TIMELINE_RANGE_SUMMARY',
          data: {
            bounds: microsecondsTraceWindow(100, 200),
            parsedTrace: makeFakeParsedTrace(),
            track: 'main',
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'TIMELINE_RANGE_SUMMARY:main:100-200',
        );
      });

      it('should correctly handle BOTTOM_UP_TREE widget', () => {
        const widget = {
          name: 'BOTTOM_UP_TREE',
          data: {
            bounds: microsecondsTraceWindow(100, 200),
            parsedTrace: makeFakeParsedTrace(),
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'BOTTOM_UP_TREE:100-200',
        );
      });

      it('should correctly handle NETWORK_TRACK widget', () => {
        const widget = {
          name: 'NETWORK_TRACK',
          data: {
            bounds: microsecondsTraceWindow(100, 200),
            parsedTrace: makeFakeParsedTrace(),
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'NETWORK_TRACK:100-200',
        );
      });

      it('should correctly handle LIGHTHOUSE_REPORT widget', () => {
        const widget = {
          name: 'LIGHTHOUSE_REPORT',
          data: {
            report: {
              fetchTime: 123456,
            },
          },
        } as unknown as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'LIGHTHOUSE_REPORT:123456',
        );
      });

      it('should correctly handle TIMELINE_EVENT_SUMMARY widget', () => {
        const widget = {
          name: 'TIMELINE_EVENT_SUMMARY',
          data: {
            event: {
              ts: 1000000,
              name: 'MyTraceEvent',
            },
          },
        } as unknown as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'TIMELINE_EVENT_SUMMARY:1000000:MyTraceEvent',
        );
      });

      it('should correctly handle SOURCE_CODE widget without line/column', () => {
        const widget = {
          name: 'SOURCE_CODE',
          data: {
            url: 'https://example.com/script.js',
            code: 'console.log("hello");',
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'SOURCE_CODE:https://example.com/script.js::',
        );
      });

      it('should correctly handle SOURCE_CODE widget with line/column', () => {
        const widget = {
          name: 'SOURCE_CODE',
          data: {
            url: 'https://example.com/script.js',
            line: 42,
            column: 7,
            code: 'const x = 1;',
          },
        } as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'SOURCE_CODE:https://example.com/script.js:42:7',
        );
      });

      it('should correctly handle SOURCE_FILE widget', () => {
        const widget = {
          name: 'SOURCE_FILE',
          data: {
            uiSourceCode: {
              url: () => 'https://example.com/script.js',
            },
          },
        } as unknown as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'SOURCE_FILE:https://example.com/script.js',
        );
      });

      it('should correctly handle SOURCE_FILES_LIST widget', () => {
        const widget = {
          name: 'SOURCE_FILES_LIST',
          data: {
            uiSourceCodes: [
              {url: () => 'https://example.com/script1.js'},
              {url: () => 'https://example.com/script2.js'},
            ],
          },
        } as unknown as AIAssistanceModel.AiAgent.AiWidget;
        assert.strictEqual(
            AiAssistance.ChatMessage.getWidgetSignature(widget),
            'SOURCE_FILES_LIST:https://example.com/script1.js,https://example.com/script2.js',
        );
      });
    });
  });

  it('should show the feedback form when canShowFeedbackForm is true', async () => {
    const [view] = createComponent({
      canShowFeedbackForm: true,
    });

    sinon.assert.callCount(view, 1);

    {
      assert.isTrue(view.input.showRateButtons);
      assert.isFalse(view.input.isShowingFeedbackForm);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);
    {
      assert.isTrue(view.input.isShowingFeedbackForm);
    }
  });

  it('should not show the feedback form when canShowFeedbackForm is false', async () => {
    const [view] = createComponent({
      canShowFeedbackForm: false,
    });

    sinon.assert.callCount(view, 1);

    {
      assert.isFalse(view.input.isShowingFeedbackForm);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);
    {
      assert.isFalse(view.input.isShowingFeedbackForm);
    }
  });

  it('should disable the submit button when the input is empty', async () => {
    const [view] = createComponent({
      isLastMessage: false,
    });

    sinon.assert.callCount(view, 1);

    {
      assert.isTrue(view.input.isSubmitButtonDisabled);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);

    {
      assert.isTrue(view.input.isShowingFeedbackForm);
      view.input.onInputChange('test');
    }

    {
      assert.isFalse(view.input.isSubmitButtonDisabled);
      view.input.onSubmit(new SubmitEvent('submit'));
    }

    {
      assert.isTrue(view.input.isSubmitButtonDisabled);
    }
  });

  it('shows no rate buttons when rpcId is not present', async () => {
    const [view] = createComponent({
      message: {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [],
        id: '1',
      },
    });

    sinon.assert.callCount(view, 1);
    assert.isFalse(view.input.showRateButtons);
  });

  it('should show actions when it is not the last message and it is loading', async () => {
    const [view] = createComponent({
      isLoading: true,
      isLastMessage: false,
    });

    sinon.assert.callCount(view, 1);
    assert.isTrue(view.input.showActions);
  });

  it('should not show actions when it is the last message and it is loading', async () => {
    const [view] = createComponent({
      isLoading: true,
      isLastMessage: true,
    });

    sinon.assert.callCount(view, 1);
    assert.isFalse(view.input.showActions);
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
        id: '1',
      },
      isLastMessage: false,
    });

    sinon.assert.callCount(view, 1);
    assert.isUndefined(view.input.suggestions);
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
        id: '1',
      },
      isLastMessage: true,
    });

    sinon.assert.callCount(view, 1);
    assert.deepEqual(view.input.suggestions, ['suggestion']);
  });

  describe('Walkthrough Rendering', () => {
    beforeEach(() => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
    });

    const stepMessage: AiAssistance.ChatMessage.ModelChatMessage = {
      entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
      parts: [
        {
          type: 'step',
          step: {
            isLoading: false,
            title: 'Step 1',
            code: 'console.log("test")',
          },
        },
      ],
      rpcId: 99,
      id: '1',
    };

    it('renders "Show thinking" button when there are steps and not inline', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
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
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
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
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(button.innerText, 'Show thinking');
    });

    it('renders "Hide agent walkthrough" when the walkthrough is open and has widgets', () => {
      const widgetMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
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
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const target = renderView({
        message: widgetMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: true,
          activeSidebarMessage: widgetMessage,
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(button.innerText, 'Hide agent walkthrough');
    });

    it('when the step is loading, the walkthrough CTA shows the title of the step', async () => {
      const loadingMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'step',
            step: {
              isLoading: true,
              title: 'Investigating XYZ',
              code: 'console.log("test")',
            },
          },
        ],
        rpcId: 99,
        id: '1',
      };
      const target = renderView({
        isLoading: true,
        message: loadingMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(button.innerText, 'Investigating XYZ');
    });

    it('accessible label shows the step title when loading', async () => {
      const loadingMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'step',
            step: {
              isLoading: true,
              title: 'Investigating XYZ',
              code: 'console.log("test")',
            },
          },
        ],
        rpcId: 99,
        id: '1',
      };
      const target = renderView({
        isLoading: true,
        message: loadingMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(
          button.getAttribute('accessibleLabel'),
          'Loading: Investigating XYZ',
      );
    });

    it('accessible label defaults to visible text when generic', async () => {
      const target = renderView({
        isLoading: false,
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(
          button.getAttribute('accessibleLabel'),
          'Show thinking for prompt test prompt',
      );
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
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(
          button.getAttribute('accessibleLabel'),
          'Hide thinking for prompt test prompt',
      );
    });

    it('accessible label appends "Loading: " when expanded and loading', async () => {
      const loadingMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'step',
            step: {
              isLoading: true,
              title: 'Investigating XYZ',
              code: 'console.log("test")',
            },
          },
        ],
        rpcId: 99,
        id: '1',
      };
      const target = renderView({
        isLoading: true,
        message: loadingMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: true,
          activeSidebarMessage: loadingMessage,
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(
          button.getAttribute('accessibleLabel'),
          'Loading: Hide thinking',
      );
    });

    it('does not render "Show thinking" button when inline', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
        },
      });
      assert.isNull(target.querySelector('[data-show-walkthrough]'));
    });

    it('makes the walkthrough button "Show thinking" if there are no widgets', async () => {
      const messageNoWidgets: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'step',
            step: {
              isLoading: false,
              title: 'Investigating XYZ',
              code: 'console.log("test")',
            },
          },
        ],
        rpcId: 99,
        id: '1',
      };
      const target = renderView({
        isLoading: false,
        message: messageNoWidgets,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(button.innerText, 'Show thinking');
    });

    it('makes the walkthrough button "Show agent walkthrough" if there are widgets', async () => {
      const messageWithWidget: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'step',
            step: {
              isLoading: false,
              title: 'Investigating XYZ',
              code: 'console.log("test")',
              // Don't need a proper widget for this test
              widgets: [{} as AIAssistanceModel.AiAgent.ComputedStyleAiWidget],
            },
          },
        ],
        rpcId: 99,
        id: '1',
      };
      const target = renderView({
        isLoading: false,
        message: messageWithWidget,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
        },
      });
      const button = querySelectorErrorOnMissing(
          target,
          '[data-show-walkthrough]',
      );
      assert.strictEqual(button.innerText, 'Show agent walkthrough');
    });

    it('renders inline walkthrough when inline', () => {
      const target = renderView({
        message: stepMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: true,
        },
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
        },
      });
      const walkthrough = target.querySelector('.walkthrough-container');
      assert.isNull(walkthrough);
    });

    it('renders side effect confirmation regardless of walkthrough expansion state', () => {
      const sideEffectDescription = 'Proceed with cation!';

      const sideEffectMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
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
        id: '1',
      };

      // Test closed state
      const targetClosed = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: false,
        },
      });
      assert.isNotNull(targetClosed.querySelector('.side-effect-container'));
      assert.include(
          targetClosed.querySelector('.side-effect-container')?.textContent,
          sideEffectDescription,
      );

      // Test open state
      const targetOpen = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: false,
          isExpanded: true,
          activeSidebarMessage: sideEffectMessage,
        },
      });
      assert.isNotNull(targetOpen.querySelector('.side-effect-container'));
      assert.include(
          targetOpen.querySelector('.side-effect-container')?.textContent,
          sideEffectDescription,
      );
    });

    it('renders side effect confirmation in inline mode regardless of walkthrough expansion state', () => {
      const sideEffectDescription = 'Proceed with cation!';

      const sideEffectMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
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
        id: '1',
      };

      // Test closed state
      const targetClosed = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: false,
        },
      });
      assert.isNotNull(targetClosed.querySelector('.side-effect-container'));
      assert.include(
          targetClosed.querySelector('.side-effect-container')?.textContent,
          sideEffectDescription,
      );

      // Test open state
      const targetOpen = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: true,
          inlineExpandedMessages: [sideEffectMessage],
        },
      });
      assert.isNotNull(targetOpen.querySelector('.side-effect-container'));
      assert.include(
          targetOpen.querySelector('.side-effect-container')?.textContent,
          sideEffectDescription,
      );
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
        id: '1',
      };

      const target = renderView({
        message,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: false,
        },
      });

      const answerBody = target.querySelector('.answer-body-wrapper');
      const sideEffect = target.querySelector('.side-effect-container');

      assert.isNotNull(answerBody);
      assert.isNotNull(sideEffect);

      // Verify that sideEffect appears after answerBody in the DOM
      const position = answerBody.compareDocumentPosition(sideEffect);
      assert.isTrue(
          Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING),
          'Side effect confirmation should render after the text output',
      );
    });

    it('does not force walkthrough expansion when there are side-effect steps', () => {
      const sideEffectMessage: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
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
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const target = renderView({
        message: sideEffectMessage,
        walkthrough: {
          ...DEFAULT_WALKTHROUGH,
          isInlined: true,
          isExpanded: false,
        },
      });

      const walkthrough = target.querySelector('.walkthrough-inline');
      if (walkthrough) {
        assert.isFalse(walkthrough.hasAttribute('open'));
      }
    });

    it('renders widget title and reveal button label from widget data', async () => {
      const root = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
      const domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
      const target = sinon.createStubInstance(SDK.Target.Target);
      root.domModel.returns(domModel);
      domModel.target.returns(target);
      root.backendNodeId.returns(1 as Protocol.DOM.BackendNodeId);

      const messageWithNamedWidget: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'widget',
            widgets: [
              {
                name: 'DOM_TREE',
                data: {
                  root,
                  title: 'Custom Title' as Platform.UIString.LocalizedString,
                  accessibleRevealLabel: 'Custom Reveal Label' as Platform.UIString.LocalizedString,
                },
              },
            ],
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const targetElement = renderView({
        message: messageWithNamedWidget,
      });

      // We need to wait for the async renderWidgets
      const widgetHeader = await waitFor('.widget-header', targetElement);
      assert.isNotNull(widgetHeader);
      assert.strictEqual(
          widgetHeader.querySelector('.widget-name')?.textContent,
          'Custom Title',
      );
      const revealButton = widgetHeader.querySelector('.widget-reveal-button');
      assert.isNotNull(revealButton);
      assert.strictEqual(
          revealButton.getAttribute('accessibleLabel'),
          'Custom Reveal Label',
      );
    });

    it('renders network request image using imageContent.asImagePreviewUrl()', async () => {
      const root = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
      const domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
      const target = sinon.createStubInstance(SDK.Target.Target);
      root.domModel.returns(domModel);
      domModel.target.returns(target);
      root.backendNodeId.returns(1 as Protocol.DOM.BackendNodeId);

      const mockContentData = sinon.createStubInstance(
          TextUtils.ContentData.ContentData,
      );
      mockContentData.asImagePreviewUrl.returns('blob:http://localhost/123');

      const messageWithWidget: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'widget',
            widgets: [
              {
                name: 'DOM_TREE',
                data: {
                  root,
                  title: 'Title' as Platform.UIString.LocalizedString,
                  accessibleRevealLabel: 'Label' as Platform.UIString.LocalizedString,
                  networkRequest: {
                    url: 'https://example.com/image.png',
                    size: 100,
                    resourceType: 'Image' as Protocol.Network.ResourceType,
                    mimeType: 'image/png',
                    imageContent: mockContentData,
                  },
                },
              },
            ],
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const targetElement = renderView({
        message: messageWithWidget,
      });

      await waitFor('img', targetElement);
      const img = targetElement.querySelector('img');
      assert.exists(img);
      assert.strictEqual(img?.src, 'blob:http://localhost/123');
      sinon.assert.calledOnce(mockContentData.asImagePreviewUrl);
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
             id: '1',
           },
         });

         const row = querySelectorErrorOnMissing(
             target,
             '.ai-assistance-feedback-row',
         );
         const exportButton = querySelectorErrorOnMissing(
             row,
             '.export-for-agents-button',
         );

         assert.strictEqual(
             exportButton.textContent?.trim(),
             'Copy to coding agent',
         );
         assert.strictEqual(
             exportButton.getAttribute('aria-label'),
             'Copy to coding agent',
         );
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
      renderElementIntoDOM(target, {includeCommonStyles: true});
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
            prompt: 'test prompt',
            shouldShowCSSChangeSummary: false,
            showActions: true,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
              parts: [],
              rpcId: 99,
              id: '1',
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: true,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {},
          target,
      );
      await assertScreenshot('ai_assistance/user_action_row_minimal.png');
    });

    it('renders a complete user message', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target, {includeCommonStyles: true});
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
            prompt: 'test prompt',
            shouldShowCSSChangeSummary: false,
            showActions: false,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.USER,
              text: 'Can you help me fix specific CSS rules?',
              id: '1',
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {},
          target,
      );
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
            prompt: 'test prompt',
            shouldShowCSSChangeSummary: false,
            showActions: false,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.USER,
              text: 'First user message',
              id: '1',
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {},
          userTarget,
      );
      const userMessage = querySelectorErrorOnMissing(
          userTarget,
          '.chat-message',
      );
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
            prompt: 'test prompt',
            shouldShowCSSChangeSummary: false,
            showActions: false,
            message: {
              entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
              parts: [],
              id: '1',
            },
            isLoading: false,
            isReadOnly: false,
            canShowFeedbackForm: false,
            markdownRenderer: new AiAssistance.MarkdownRendererWithCodeBlock(),
            currentRating: undefined,
            walkthrough: {...DEFAULT_WALKTHROUGH},
          },
          {},
          modelTarget,
      );
      const modelMessage = querySelectorErrorOnMissing(
          modelTarget,
          '.chat-message',
      );
      assert.isTrue(modelMessage.classList.contains('is-first-message'));
    });

    it('renders SOURCE_FILES_LIST widget with correct dynamic title', async () => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
      function createMockFile(name: string) {
        return {
          name: () => name,
          fullDisplayName: () => `example.com/path/to/${name}`,
          url: () => `https://example.com/path/to/${name}`,
        } as unknown as Workspace.UISourceCode.UISourceCode;
      }

      const uiSourceCodes = [
        createMockFile('file1.js'),
        createMockFile('file2.js'),
      ];
      const message: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'widget',
            widgets: [
              {
                name: 'SOURCE_FILES_LIST',
                data: {
                  uiSourceCodes,
                },
              },
            ],
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const targetElement = renderView({message});
      const widgetHeader = await waitFor('.widget-header', targetElement);
      assert.isNotNull(widgetHeader);
      assert.strictEqual(
          widgetHeader.querySelector('.widget-name')?.textContent,
          'Inspected file names',
      );

      // Inspected list items (all 2 files should be visible)
      const listItems = targetElement.querySelectorAll(
          '.source-files-widget .visible-file',
      );
      assert.lengthOf(listItems, 2);

      const fileNames = Array.from(listItems).map(
          item => item.textContent?.trim(),
      );
      assert.deepEqual(fileNames, [
        'example.com/path/to/file1.js',
        'example.com/path/to/file2.js',
      ]);

      // No details element since there are <= 10 files. We show collapse files list only if there are over 10 of them
      assert.isNull(targetElement.querySelector('.source-files-details'));
    });

    it('renders SOURCE_FILES_LIST widget with more than 10 files, limiting to 10 and using details element for the rest',
       async () => {
         updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
         function createMockFile(name: string) {
           return {
             name: () => name,
             fullDisplayName: () => `example.com/path/to/${name}`,
             url: () => `https://example.com/path/to/${name}`,
           } as unknown as Workspace.UISourceCode.UISourceCode;
         }

         const uiSourceCodes = Array.from(
             {length: 12},
             (_, i) => createMockFile(`file${i + 1}.js`),
         );
         const message: AiAssistance.ChatMessage.ModelChatMessage = {
           entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
           parts: [
             {
               type: 'widget',
               widgets: [
                 {
                   name: 'SOURCE_FILES_LIST',
                   data: {
                     uiSourceCodes,
                   },
                 },
               ],
             },
           ],
           rpcId: 99,
           id: '1',
         };

         const targetElement = renderView({message});
         const widgetHeader = (await waitFor(
                                  '.widget-header',
                                  targetElement,
                                  )) as HTMLElement;
         assert.isNotNull(widgetHeader);
         assert.strictEqual(
             widgetHeader.querySelector('.widget-name')?.textContent,
             'Inspected file names',
         );

         // Header reveal button click should reveal the first file
         const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
         const revealBtn = querySelectorErrorOnMissing(
                               widgetHeader,
                               'devtools-button.widget-reveal-button',
                               ) as HTMLElement;
         revealBtn.click();
         sinon.assert.calledWith(revealStub, uiSourceCodes[0]);
         revealStub.restore();

         // Outer list should contain 10 items directly, and 2 items nested inside details
         const details = targetElement.querySelector('.source-files-details');
         assert.isNotNull(details);

         // Assert expand button has count within text
         const summaryText = details?.querySelector('.show-more-summary')?.textContent?.trim();
         assert.strictEqual(summaryText, 'Show all 12 files');

         // Verify that there are exactly 10 visible files (with the class "visible-file").
         const outerListItems = targetElement.querySelectorAll(
             '.source-files-widget .visible-file',
         );
         assert.lengthOf(outerListItems, 10);

         // Verify that the remaining 2 files are nested inside details and have the "collapsed-file" class.
         const innerListItems = details?.querySelectorAll('.collapsed-file');
         assert.lengthOf(innerListItems ?? [], 2);
       });

    it('renders NETWORK_REQUESTS_LIST widget with less than 15 requests, not showing the expand button', async () => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
      function createMockRequest(id: string) {
        return {
          requestId: () => id,
          name: () => id,
          statusCode: 200,
          mimeType: 'text/html',
          transferSize: 1000,
          duration: 1,
        } as unknown as SDK.NetworkRequest.NetworkRequest;
      }

      const requests = [createMockRequest('req1'), createMockRequest('req2')];
      const message: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'widget',
            widgets: [
              {
                name: 'NETWORK_REQUESTS_LIST',
                data: {
                  requests,
                },
              } as unknown as AIAssistanceModel.AiAgent.AiWidget,
            ],
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const targetElement = renderView({message});
      const widgetHeader = await waitFor('.widget-header', targetElement);
      assert.isNotNull(widgetHeader);
      assert.strictEqual(
          widgetHeader.querySelector('.widget-name')?.textContent,
          'Network requests',
      );

      const widgetContainer = (await waitFor(
                                  '.network-requests-widget',
                                  targetElement,
                                  )) as HTMLElement;
      assert.isNotNull(widgetContainer);

      // Verify headers
      const headers = Array
                          .from(
                              widgetContainer.querySelectorAll('table th'),
                              )
                          .map(th => th.id);
      assert.deepEqual(headers, ['name', 'status', 'size', 'time']);

      // Verify that all requests are displayed (table has 1 header row + 2 data rows = 3 rows)
      const rows = widgetContainer.querySelectorAll('table tr');
      assert.lengthOf(rows, 3);

      // Verify that the expand button does NOT exist
      const expandButton = widgetContainer.querySelector(
          'button.show-all-widget-requests-button',
      );
      assert.isNull(expandButton);
    });

    it('renders NETWORK_REQUESTS_LIST widget with more than 15 requests, showing the expand button', async () => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
      function createMockRequest(id: string) {
        return {
          requestId: () => id,
          name: () => id,
          statusCode: 200,
          mimeType: 'text/html',
          transferSize: 1000,
          duration: 1,
        } as unknown as SDK.NetworkRequest.NetworkRequest;
      }

      const requests = Array.from(
          {length: 17},
          (_, i) => createMockRequest(`req${i + 1}`),
      );
      const message: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'widget',
            widgets: [
              {
                name: 'NETWORK_REQUESTS_LIST',
                data: {
                  requests,
                },
              } as unknown as AIAssistanceModel.AiAgent.AiWidget,
            ],
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const targetElement = renderView({message});
      const widgetHeader = await waitFor('.widget-header', targetElement);
      assert.isNotNull(widgetHeader);
      assert.strictEqual(
          widgetHeader.querySelector('.widget-name')?.textContent,
          'Network requests',
      );

      const widgetContainer = (await waitFor(
                                  '.network-requests-widget',
                                  targetElement,
                                  )) as HTMLElement;
      assert.isNotNull(widgetContainer);

      // Verify headers
      const headers = Array
                          .from(
                              widgetContainer.querySelectorAll('table th'),
                              )
                          .map(th => th.id);
      assert.deepEqual(headers, ['name', 'status', 'size', 'time']);

      // Verify that only the first 15 requests are displayed (table has 1 header row + 15 data rows = 16 rows)
      const rowsBefore = widgetContainer.querySelectorAll('table tr');
      assert.lengthOf(rowsBefore, 16);

      // Verify that the expand button exists and has the correct text
      const expandButton = querySelectorErrorOnMissing(
                               widgetContainer,
                               'button.show-all-widget-requests-button',
                               ) as HTMLButtonElement;
      assert.strictEqual(
          expandButton.textContent?.trim(),
          'Show all 17 network requests',
      );
    });

    it('shows a snackbar with the error message when reveal fails', async () => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
      const root = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
      const domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
      const target = sinon.createStubInstance(SDK.Target.Target);
      root.domModel.returns(domModel);
      domModel.target.returns(target);
      root.backendNodeId.returns(1 as Protocol.DOM.BackendNodeId);

      const messageWithNamedWidget: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'widget',
            widgets: [
              {
                name: 'DOM_TREE',
                data: {
                  root,
                  title: 'Title' as Platform.UIString.LocalizedString,
                  accessibleRevealLabel: 'Label' as Platform.UIString.LocalizedString,
                },
              },
            ],
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const targetElement = renderView({
        message: messageWithNamedWidget,
      });

      const widgetHeader = (await waitFor(
                               '.widget-header',
                               targetElement,
                               )) as HTMLElement;
      assert.isNotNull(widgetHeader);
      const revealBtn = querySelectorErrorOnMissing(
                            widgetHeader,
                            'devtools-button.widget-reveal-button',
                            ) as HTMLElement;

      const revealError = new Error(
          'Node cannot be found in the current page.',
      );
      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').rejects(revealError);
      const snackbarShowStub = sinon.stub(Snackbars.Snackbar.Snackbar, 'show');

      revealBtn.click();

      // Since it's async, we need to wait for the promise microtask queue to drain
      await new Promise(resolve => setTimeout(resolve, 0));

      sinon.assert.calledOnceWithExactly(snackbarShowStub, {
        message: 'Node cannot be found in the current page.',
      });

      revealStub.restore();
      snackbarShowStub.restore();
    });
    it('renders NETWORK_TRACK widget with correct header and widget element', async () => {
      updateHostConfig({devToolsAiAssistanceV2: {enabled: true}});
      const parsedTrace = getBaseTraceHandlerData();
      const bounds = microsecondsTraceWindow(100, 200);
      const message: AiAssistance.ChatMessage.ModelChatMessage = {
        entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
        parts: [
          {
            type: 'widget',
            widgets: [
              {
                name: 'NETWORK_TRACK',
                data: {
                  parsedTrace,
                  bounds,
                },
              },
            ],
          },
        ],
        rpcId: 99,
        id: '1',
      };

      const targetElement = renderView({message});
      const widgetHeader = await waitFor('.widget-header', targetElement);
      assert.isNotNull(widgetHeader);
      assert.strictEqual(
          widgetHeader.querySelector('.widget-name')?.textContent,
          'Network activity',
      );

      const devtoolsWidget = await waitFor(
          'devtools-performance-agent-network-track',
          targetElement,
      );
      assert.isNotNull(devtoolsWidget);
    });
  });
});
