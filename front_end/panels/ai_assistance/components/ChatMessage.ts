// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/markdown_view/markdown_view.js';
import '../../../ui/kit/kit.js';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import type * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import type {MarkdownLitRenderer} from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UIHelpers from '../../../ui/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import chatMessageStyles from './chatMessage.css.js';

const {html, Directives: {ref, ifDefined}} = Lit;
const lockedString = i18n.i18n.lockedString;

const REPORT_URL = 'https://crbug.com/364805393' as Platform.DevToolsPath.UrlString;
const SCROLL_ROUNDING_OFFSET = 1;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {

  /**
   * @description The title of the button that allows submitting positive
   * feedback about the response for AI assistance.
   */
  thumbsUp: 'Good response',
  /**
   * @description The title of the button that allows submitting negative
   * feedback about the response for AI assistance.
   */
  thumbsDown: 'Bad response',
  /**
   * @description The placeholder text for the feedback input.
   */
  provideFeedbackPlaceholder: 'Provide additional feedback',
  /**
   * @description The disclaimer text that tells the user what will be shared
   * and what will be stored.
   */
  disclaimer: 'Submitted feedback will also include your conversation',
  /**
   * @description The button text for the action of submitting feedback.
   */
  submit: 'Submit',
  /**
   * @description The header of the feedback form asking.
   */
  whyThisRating: 'Why did you choose this rating? (optional)',
  /**
   * @description The button text for the action that hides the feedback form.
   */
  close: 'Close',
  /**
   * @description The title of the button that opens a page to report a legal
   * issue with the AI assistance message.
   */
  report: 'Report legal issue',
  /**
   * @description The title of the button for scrolling to see next suggestions
   */
  scrollToNext: 'Scroll to next suggestions',
  /**
   * @description The title of the button for scrolling to see previous suggestions
   */
  scrollToPrevious: 'Scroll to previous suggestions',
  /**
   * @description The title of the button that copies the AI-generated response to the clipboard.
   */
  copyResponse: 'Copy response',
  /**
   * @description The error message when the request to the LLM failed for some reason.
   */
  systemError:
      'Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue. If this keeps happening, update Chrome to the latest version.',
  /**
   * @description The error message when the LLM gets stuck in a loop (max steps reached).
   */
  maxStepsError: 'Seems like I am stuck with the investigation. It would be better if you start over.',
  /**
   * @description Displayed when the user stop the response
   */
  stoppedResponse: 'You stopped this response',
  /**
   * @description Prompt for user to confirm code execution that may affect the page.
   */
  sideEffectConfirmationDescription: 'This code may modify page content. Continue?',
  /**
   * @description Button text that confirm code execution that may affect the page.
   */
  positiveSideEffectConfirmation: 'Continue',
  /**
   * @description Button text that cancels code execution that may affect the page.
   */
  negativeSideEffectConfirmation: 'Cancel',
  /**
   * @description The generic name of the AI agent (do not translate)
   */
  ai: 'AI',
  /**
   * @description The fallback text when we can't find the user full name
   */
  you: 'You',
  /**
   * @description The fallback text when a step has no title yet
   */
  investigating: 'Investigating',
  /**
   * @description Prefix to the title of each thinking step of a user action is required to continue
   */
  paused: 'Paused',
  /**
   * @description Heading text for the code block that shows the executed code.
   */
  codeExecuted: 'Code executed',
  /**
   * @description Heading text for the code block that shows the code to be executed after side effect confirmation.
   */
  codeToExecute: 'Code to execute',
  /**
   * @description Heading text for the code block that shows the returned data.
   */
  dataReturned: 'Data returned',
  /**
   * @description Aria label for the check mark icon to be read by screen reader
   */
  completed: 'Completed',
  /**
   * @description Aria label for the cancel icon to be read by screen reader
   */
  canceled: 'Canceled',
  /**
   * @description Alt text for the image input (displayed in the chat messages) that has been sent to the model.
   */
  imageInputSentToTheModel: 'Image input sent to the model',
  /**
   * @description Alt text for the account avatar.
   */
  accountAvatar: 'Account avatar',
  /**
   * @description Title for the link which wraps the image input rendered in chat messages.
   */
  openImageInNewTab: 'Open image in a new tab',
  /**
   * @description Alt text for image when it is not available.
   */
  imageUnavailable: 'Image unavailable',
} as const;

export interface Step {
  isLoading: boolean;
  thought?: string;
  title?: string;
  code?: string;
  output?: string;
  canceled?: boolean;
  sideEffect?: ConfirmSideEffectDialog;
  contextDetails?: [AiAssistanceModel.AiAgent.ContextDetail, ...AiAssistanceModel.AiAgent.ContextDetail[]];
}

export interface ConfirmSideEffectDialog {
  onAnswer: (result: boolean) => void;
}

export const enum ChatMessageEntity {
  MODEL = 'model',
  USER = 'user',
}

export interface AnswerPart {
  type: 'answer';
  text: string;
  suggestions?: [string, ...string[]];
}

export interface StepPart {
  type: 'step';
  step: Step;
}

export type ModelMessagePart = AnswerPart|StepPart;

export interface UserChatMessage {
  entity: ChatMessageEntity.USER;
  text: string;
  imageInput?: Host.AidaClient.Part;
}

export interface ModelChatMessage {
  entity: ChatMessageEntity.MODEL;
  parts: ModelMessagePart[];
  error?: AiAssistanceModel.AiAgent.ErrorType;
  rpcId?: Host.AidaClient.RpcGlobalId;
}

export type Message = UserChatMessage|ModelChatMessage;

export interface RatingViewInput {
  currentRating?: Host.AidaClient.Rating;
  onRatingClick: (rating: Host.AidaClient.Rating) => void;
  showRateButtons: boolean;
}

export interface ActionViewInput {
  onReportClick: () => void;
  onCopyResponseClick: () => void;
}

export interface SuggestionViewInput {
  suggestions?: [string, ...string[]];
  scrollSuggestionsScrollContainer: (direction: 'left'|'right') => void;
  onSuggestionsScrollOrResize: () => void;
  onSuggestionClick: (suggestion: string) => void;
}

export interface FeedbackFormViewInput {
  isShowingFeedbackForm: boolean;
  onSubmit: (event: SubmitEvent) => void;
  onClose: () => void;
  onInputChange: (input: string) => void;
  isSubmitButtonDisabled: boolean;
}

export type ChatMessageViewInput =
    MessageInput&RatingViewInput&ActionViewInput&SuggestionViewInput&FeedbackFormViewInput;

export interface ViewOutput {
  suggestionsLeftScrollButtonContainer?: Element;
  suggestionsScrollContainer?: Element;
  suggestionsRightScrollButtonContainer?: Element;
}

export interface MessageInput {
  suggestions?: [string, ...string[]];
  message: Message;
  isLoading: boolean;
  isReadOnly: boolean;
  isLastMessage: boolean;
  canShowFeedbackForm: boolean;
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>;
  markdownRenderer: MarkdownLitRenderer;
  onSuggestionClick: (suggestion: string) => void;
  onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
  onCopyResponseClick: (message: ModelChatMessage) => void;
}

export const DEFAULT_VIEW = (input: ChatMessageViewInput, output: ViewOutput, target: HTMLElement): void => {
  const message = input.message;
  if (message.entity === ChatMessageEntity.USER) {
    const name = input.userInfo.accountFullName || lockedString(UIStringsNotTranslate.you);
    const image = input.userInfo.accountImage ?
        html`<img src="data:image/png;base64, ${input.userInfo.accountImage}" alt=${
            UIStringsNotTranslate.accountAvatar} />` :
        html`<devtools-icon
          name="profile"
        ></devtools-icon>`;
    const imageInput = message.imageInput && 'inlineData' in message.imageInput ?
        renderImageChatMessage(message.imageInput.inlineData) :
        Lit.nothing;
    // clang-format off
    Lit.render(html`
      <style>${Input.textInputStyles}</style>
      <style>${chatMessageStyles}</style>
      <section
        class="chat-message query ${input.isLastMessage ? 'is-last-message' : ''}"
        jslog=${VisualLogging.section('question')}
      >
        <div class="message-info">
          ${image}
          <div class="message-name">
            <h2>${name}</h2>
          </div>
        </div>
        ${imageInput}
        <div class="message-content">${renderTextAsMarkdown(message.text, input.markdownRenderer)}</div>
      </section>
    `, target);
    // clang-format on
    return;
  }

  const icon = AiAssistanceModel.AiUtils.getIconName();

  // clang-format off
  Lit.render(html`
    <style>${Input.textInputStyles}</style>
    <style>${chatMessageStyles}</style>
    <section
      class="chat-message answer ${input.isLastMessage ? 'is-last-message' : ''}"
      jslog=${VisualLogging.section('answer')}
    >
      <div class="message-info">
        <devtools-icon name=${icon}></devtools-icon>
        <div class="message-name">
          <h2>${lockedString(UIStringsNotTranslate.ai)}</h2>
        </div>
      </div>
      ${Lit.Directives.repeat(
        message.parts,
        (_, index) => index,
        (part, index) => {
          const isLastPart = index === message.parts.length - 1;
          if (part.type === 'answer') {
            return html`<p>${renderTextAsMarkdown(part.text, input.markdownRenderer, { animate: !input.isReadOnly && input.isLoading && isLastPart && input.isLastMessage })}</p>`;
          }
          return renderStep({
            step: part.step,
            isLoading: input.isLoading,
            markdownRenderer: input.markdownRenderer,
            isLast: isLastPart,
          });
        },
      )}
      ${renderError(message)}
      ${input.isLastMessage && !input.isLoading ? renderActions(input, output) : Lit.nothing}
    </section>
  `, target);
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;

function renderTextAsMarkdown(text: string, markdownRenderer: MarkdownLitRenderer, {animate, ref: refFn}: {
  animate?: boolean,
  ref?: (element?: Element) => void,
} = {}): Lit.TemplateResult {
  let tokens = [];
  try {
    tokens = Marked.Marked.lexer(text);
    for (const token of tokens) {
      // Try to render all the tokens to make sure that
      // they all have a template defined for them. If there
      // isn't any template defined for a token, we'll fallback
      // to rendering the text as plain text instead of markdown.
      markdownRenderer.renderToken(token);
    }
  } catch {
    // The tokens were not parsed correctly or
    // one of the tokens are not supported, so we
    // continue to render this as text.
    return html`${text}`;
  }

  // clang-format off
  return html`<devtools-markdown-view
    .data=${{tokens, renderer: markdownRenderer, animationEnabled: animate} as MarkdownView.MarkdownView.MarkdownViewData}
    ${refFn ? ref(refFn) : Lit.nothing}>
  </devtools-markdown-view>`;
  // clang-format on
}

function renderTitle(step: Step): Lit.LitTemplate {
  const paused =
      step.sideEffect ? html`<span class="paused">${lockedString(UIStringsNotTranslate.paused)}: </span>` : Lit.nothing;
  const actionTitle = step.title ?? `${lockedString(UIStringsNotTranslate.investigating)}…`;

  return html`<span class="title">${paused}${actionTitle}</span>`;
}

function renderStepCode(step: Step): Lit.LitTemplate {
  if (!step.code && !step.output) {
    return Lit.nothing;
  }

  // If there is no "output" yet, it means we didn't execute the code yet (e.g. maybe it is still waiting for confirmation from the user)
  // thus we show "Code to execute" text rather than "Code executed" text on the heading of the code block.
  const codeHeadingText = (step.output && !step.canceled) ? lockedString(UIStringsNotTranslate.codeExecuted) :
                                                            lockedString(UIStringsNotTranslate.codeToExecute);

  // If there is output, we don't show notice on this code block and instead show
  // it in the data returned code block.
  // clang-format off
  const code = step.code ? html`<div class="action-result">
      <devtools-code-block
        .code=${step.code.trim()}
        .codeLang=${'js'}
        .displayNotice=${!Boolean(step.output)}
        .header=${codeHeadingText}
        .showCopyButton=${true}
      ></devtools-code-block>
  </div>` :
                           Lit.nothing;
  const output = step.output ? html`<div class="js-code-output">
    <devtools-code-block
      .code=${step.output}
      .codeLang=${'js'}
      .displayNotice=${true}
      .header=${lockedString(UIStringsNotTranslate.dataReturned)}
      .showCopyButton=${false}
    ></devtools-code-block>
  </div>` :
                               Lit.nothing;

  return html`<div class="step-code">${code}${output}</div>`;
  // clang-format on
}

function renderStepDetails({
  step,
  markdownRenderer,
  isLast,
}: {
  step: Step,
  markdownRenderer: MarkdownLitRenderer,
  isLast: boolean,
}): Lit.LitTemplate {
  const sideEffects = isLast && step.sideEffect ? renderSideEffectConfirmationUi(step) : Lit.nothing;
  const thought = step.thought ? html`<p>${renderTextAsMarkdown(step.thought, markdownRenderer)}</p>` : Lit.nothing;

  // clang-format off
  const contextDetails = step.contextDetails ?
  html`${Lit.Directives.repeat(
    step.contextDetails,
      contextDetail => {
        return html`<div class="context-details">
      <devtools-code-block
        .code=${contextDetail.text}
        .codeLang=${contextDetail.codeLang || ''}
        .displayNotice=${false}
        .header=${contextDetail.title}
        .showCopyButton=${true}
      ></devtools-code-block>
    </div>`;
      },
    )}` : Lit.nothing;

  return html`<div class="step-details">
    ${thought}
    ${renderStepCode(step)}
    ${sideEffects}
    ${contextDetails}
  </div>`;
  // clang-format on
}

function renderStepBadge({step, isLoading, isLast}: {
  step: Step,
  isLoading: boolean,
  isLast: boolean,
}): Lit.LitTemplate {
  if (isLoading && isLast && !step.sideEffect) {
    return html`<devtools-spinner></devtools-spinner>`;
  }

  let iconName = 'checkmark';
  let ariaLabel: string|undefined = lockedString(UIStringsNotTranslate.completed);
  let role: 'button'|undefined = 'button';
  if (isLast && step.sideEffect) {
    role = undefined;
    ariaLabel = undefined;
    iconName = 'pause-circle';
  } else if (step.canceled) {
    ariaLabel = lockedString(UIStringsNotTranslate.canceled);
    iconName = 'cross';
  }

  return html`<devtools-icon
      class="indicator"
      role=${ifDefined(role)}
      aria-label=${ifDefined(ariaLabel)}
      .name=${iconName}
    ></devtools-icon>`;
}

function renderStep({step, isLoading, markdownRenderer, isLast}: {
  step: Step,
  isLoading: boolean,
  markdownRenderer: MarkdownLitRenderer,
  isLast: boolean,
}): Lit.LitTemplate {
  const stepClasses = Lit.Directives.classMap({
    step: true,
    empty: !step.thought && !step.code && !step.contextDetails && !step.sideEffect,
    paused: Boolean(step.sideEffect),
    canceled: Boolean(step.canceled),
  });
  // clang-format off
  return html`
    <details class=${stepClasses}
      jslog=${VisualLogging.section('step')}
      .open=${Boolean(step.sideEffect)}>
      <summary>
        <div class="summary">
          ${renderStepBadge({ step, isLoading, isLast })}
          ${renderTitle(step)}
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        </div>
      </summary>
      ${renderStepDetails({step, markdownRenderer, isLast})}
    </details>`;
  // clang-format on
}

function renderSideEffectConfirmationUi(step: Step): Lit.LitTemplate {
  if (!step.sideEffect) {
    return Lit.nothing;
  }

  // clang-format off
  return html`<div
    class="side-effect-confirmation"
    jslog=${VisualLogging.section('side-effect-confirmation')}
  >
    <p>${lockedString(UIStringsNotTranslate.sideEffectConfirmationDescription)}</p>
    <div class="side-effect-buttons-container">
      <devtools-button
        .data=${
          {
            variant: Buttons.Button.Variant.OUTLINED,
            jslogContext: 'decline-execute-code',
          } as Buttons.Button.ButtonData
        }
        @click=${() => step.sideEffect?.onAnswer(false)}
      >${lockedString(
        UIStringsNotTranslate.negativeSideEffectConfirmation,
      )}</devtools-button>
      <devtools-button
        .data=${
          {
            variant: Buttons.Button.Variant.PRIMARY,
            jslogContext: 'accept-execute-code',
            iconName: 'play',
          } as Buttons.Button.ButtonData
        }
        @click=${() => step.sideEffect?.onAnswer(true)}
      >${
          lockedString(UIStringsNotTranslate.positiveSideEffectConfirmation)
      }</devtools-button>
    </div>
  </div>`;
  // clang-format on
}

function renderError(message: ModelChatMessage): Lit.LitTemplate {
  if (message.error) {
    let errorMessage;
    switch (message.error) {
      case AiAssistanceModel.AiAgent.ErrorType.UNKNOWN:
      case AiAssistanceModel.AiAgent.ErrorType.BLOCK:
        errorMessage = UIStringsNotTranslate.systemError;
        break;
      case AiAssistanceModel.AiAgent.ErrorType.MAX_STEPS:
        errorMessage = UIStringsNotTranslate.maxStepsError;
        break;
      case AiAssistanceModel.AiAgent.ErrorType.ABORT:
        return html`<p class="aborted" jslog=${VisualLogging.section('aborted')}>${
            lockedString(UIStringsNotTranslate.stoppedResponse)}</p>`;
    }

    return html`<p class="error" jslog=${VisualLogging.section('error')}>${lockedString(errorMessage)}</p>`;
  }

  return Lit.nothing;
}

function renderImageChatMessage(inlineData: Host.AidaClient.MediaBlob): Lit.LitTemplate {
  if (inlineData.data === AiAssistanceModel.AiConversation.NOT_FOUND_IMAGE_DATA) {
    // clang-format off
    return html`<div class="unavailable-image" title=${UIStringsNotTranslate.imageUnavailable}>
      <devtools-icon name='file-image'></devtools-icon>
    </div>`;
    // clang-format on
  }
  const imageUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
  // clang-format off
    return html`<devtools-link
      class="image-link" title=${UIStringsNotTranslate.openImageInNewTab}
      href=${imageUrl}
    >
      <img src=${imageUrl} alt=${UIStringsNotTranslate.imageInputSentToTheModel} />
    </devtools-link>`;
  // clang-format on
}

function renderActions(input: ChatMessageViewInput, output: ViewOutput): Lit.LitTemplate {
  // clang-format off
  return html`
    <div class="ai-assistance-feedback-row">
      <div class="action-buttons">
        ${input.showRateButtons ? html`
          <devtools-button
            .data=${{
              variant: Buttons.Button.Variant.ICON,
              size: Buttons.Button.Size.SMALL,
              iconName: 'thumb-up',
              toggledIconName: 'thumb-up-filled',
              toggled: input.currentRating === Host.AidaClient.Rating.POSITIVE,
              toggleType: Buttons.Button.ToggleType.PRIMARY,
              title: lockedString(UIStringsNotTranslate.thumbsUp),
              jslogContext: 'thumbs-up',
            } as Buttons.Button.ButtonData}
            @click=${() => input.onRatingClick(Host.AidaClient.Rating.POSITIVE)}
          ></devtools-button>
          <devtools-button
            .data=${{
              variant: Buttons.Button.Variant.ICON,
              size: Buttons.Button.Size.SMALL,
              iconName: 'thumb-down',
              toggledIconName: 'thumb-down-filled',
              toggled: input.currentRating === Host.AidaClient.Rating.NEGATIVE,
              toggleType: Buttons.Button.ToggleType.PRIMARY,
              title: lockedString(UIStringsNotTranslate.thumbsDown),
              jslogContext: 'thumbs-down',
            } as Buttons.Button.ButtonData}
            @click=${() => input.onRatingClick(Host.AidaClient.Rating.NEGATIVE)}
          ></devtools-button>
          <div class="vertical-separator"></div>
        `: Lit.nothing}
        <devtools-button
          .data=${
            {
              variant: Buttons.Button.Variant.ICON,
              size: Buttons.Button.Size.SMALL,
              title: lockedString(UIStringsNotTranslate.report),
              iconName: 'report',
              jslogContext: 'report',
            } as Buttons.Button.ButtonData
          }
          @click=${input.onReportClick}
        ></devtools-button>
        <div class="vertical-separator"></div>
          <devtools-button
            .data=${{
              variant: Buttons.Button.Variant.ICON,
              size: Buttons.Button.Size.SMALL,
              title: lockedString(UIStringsNotTranslate.copyResponse),
              iconName: 'copy',
              jslogContext: 'copy-ai-response',
            } as Buttons.Button.ButtonData}
            aria-label=${lockedString(UIStringsNotTranslate.copyResponse)}
            @click=${input.onCopyResponseClick}></devtools-button>
      </div>
      ${input.suggestions ? html`<div class="suggestions-container">
        <div class="scroll-button-container left hidden" ${ref(element => { output.suggestionsLeftScrollButtonContainer = element; } )}>
          <devtools-button
            class='scroll-button'
            .data=${{
              variant: Buttons.Button.Variant.ICON,
              size: Buttons.Button.Size.SMALL,
              iconName: 'chevron-left',
              title: lockedString(UIStringsNotTranslate.scrollToPrevious),
              jslogContext: 'chevron-left',
            } as Buttons.Button.ButtonData}
            @click=${() => input.scrollSuggestionsScrollContainer('left')}
          ></devtools-button>
        </div>
        <div class="suggestions-scroll-container" @scroll=${input.onSuggestionsScrollOrResize} ${ref(element => { output.suggestionsScrollContainer = element; })}>
          ${input.suggestions.map(suggestion => html`<devtools-button
            class='suggestion'
            .data=${{
              variant: Buttons.Button.Variant.OUTLINED,
              title: suggestion,
              jslogContext: 'suggestion',
            } as Buttons.Button.ButtonData}
            @click=${() => input.onSuggestionClick(suggestion)}
          >${suggestion}</devtools-button>`)}
        </div>
        <div class="scroll-button-container right hidden" ${ref(element => { output.suggestionsRightScrollButtonContainer = element; })}>
          <devtools-button
            class='scroll-button'
            .data=${{
              variant: Buttons.Button.Variant.ICON,
              size: Buttons.Button.Size.SMALL,
              iconName: 'chevron-right',
              title: lockedString(UIStringsNotTranslate.scrollToNext),
              jslogContext: 'chevron-right',
            } as Buttons.Button.ButtonData}
            @click=${() => input.scrollSuggestionsScrollContainer('right')}
          ></devtools-button>
        </div>
      </div>` : Lit.nothing}
    </div>
    ${input.isShowingFeedbackForm ? html`
      <form class="feedback-form" @submit=${input.onSubmit}>
        <div class="feedback-header">
          <h4 class="feedback-title">${lockedString(
              UIStringsNotTranslate.whyThisRating,
          )}</h4>
          <devtools-button
            aria-label=${lockedString(UIStringsNotTranslate.close)}
            @click=${input.onClose}
            .data=${
              {
                variant: Buttons.Button.Variant.ICON,
                iconName: 'cross',
                size: Buttons.Button.Size.SMALL,
                title: lockedString(UIStringsNotTranslate.close),
                jslogContext: 'close',
              } as Buttons.Button.ButtonData
            }
          ></devtools-button>
        </div>
        <input
          type="text"
          class="devtools-text-input feedback-input"
          @input=${(event: KeyboardEvent) => input.onInputChange((event.target as HTMLInputElement).value)}
          placeholder=${lockedString(
          UIStringsNotTranslate.provideFeedbackPlaceholder,
          )}
          jslog=${VisualLogging.textField('feedback').track({ keydown: 'Enter' })}
        >
        <span class="feedback-disclaimer">${
          lockedString(UIStringsNotTranslate.disclaimer)
        }</span>
        <div>
          <devtools-button
          aria-label=${lockedString(UIStringsNotTranslate.submit)}
          .data=${
            {
                type: 'submit',
                disabled: input.isSubmitButtonDisabled,
                variant: Buttons.Button.Variant.OUTLINED,
                size: Buttons.Button.Size.SMALL,
                title: lockedString(UIStringsNotTranslate.submit),
                jslogContext: 'send',
              } as Buttons.Button.ButtonData
            }
          >${
            lockedString(UIStringsNotTranslate.submit)
          }</devtools-button>
        </div>
      </div>
    </form>
    ` : Lit.nothing}
  `;
  // clang-format on
}

export class ChatMessage extends UI.Widget.Widget {
  message: Message = {entity: ChatMessageEntity.USER, text: ''};
  isLoading = false;
  isReadOnly = false;
  canShowFeedbackForm = false;
  isLastMessage = false;
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'> = {};
  markdownRenderer!: MarkdownLitRenderer;
  onSuggestionClick: (suggestion: string) => void = () => {};
  onFeedbackSubmit:
      (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void = () => {};
  onCopyResponseClick: (message: ModelChatMessage) => void = () => {};

  #suggestionsResizeObserver = new ResizeObserver(() => this.#handleSuggestionsScrollOrResize());
  #suggestionsEvaluateLayoutThrottler = new Common.Throttler.Throttler(50);

  #feedbackValue = '';
  #currentRating: Host.AidaClient.Rating|undefined;
  #isShowingFeedbackForm = false;
  #isSubmitButtonDisabled = true;

  #view: View;
  #viewOutput: ViewOutput = {};

  constructor(element?: HTMLElement, view?: View) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
  }

  override wasShown(): void {
    super.wasShown();
    void this.performUpdate();
    this.#evaluateSuggestionsLayout();

    if (this.#viewOutput.suggestionsScrollContainer) {
      this.#suggestionsResizeObserver.observe(this.#viewOutput.suggestionsScrollContainer);
    }
  }

  override performUpdate(): Promise<void>|void {
    this.#view(
        {
          message: this.message,
          isLoading: this.isLoading,
          isReadOnly: this.isReadOnly,
          canShowFeedbackForm: this.canShowFeedbackForm,
          userInfo: this.userInfo,
          markdownRenderer: this.markdownRenderer,
          isLastMessage: this.isLastMessage,
          onSuggestionClick: this.onSuggestionClick,
          onRatingClick: this.#handleRateClick.bind(this),
          onReportClick: () => UIHelpers.openInNewTab(REPORT_URL),
          onCopyResponseClick: () => {
            if (this.message.entity === ChatMessageEntity.MODEL) {
              this.onCopyResponseClick(this.message);
            }
          },
          scrollSuggestionsScrollContainer: this.#scrollSuggestionsScrollContainer.bind(this),
          onSuggestionsScrollOrResize: this.#handleSuggestionsScrollOrResize.bind(this),
          onSubmit: this.#handleSubmit.bind(this),
          onClose: this.#handleClose.bind(this),
          onInputChange: this.#handleInputChange.bind(this),
          isSubmitButtonDisabled: this.#isSubmitButtonDisabled,
          // Props for actions logic
          showRateButtons: this.message.entity === ChatMessageEntity.MODEL && !!this.message.rpcId,
          suggestions: (this.message.entity === ChatMessageEntity.MODEL && !this.isReadOnly &&
                        this.message.parts.at(-1)?.type === 'answer') ?
              (this.message.parts.at(-1) as AnswerPart).suggestions :
              undefined,
          currentRating: this.#currentRating,
          isShowingFeedbackForm: this.#isShowingFeedbackForm,
          onFeedbackSubmit: this.onFeedbackSubmit,
        },
        this.#viewOutput, this.contentElement);
  }

  #handleInputChange(value: string): void {
    this.#feedbackValue = value;
    const disableSubmit = !value;
    if (disableSubmit !== this.#isSubmitButtonDisabled) {
      this.#isSubmitButtonDisabled = disableSubmit;
      void this.performUpdate();
    }
  }

  #evaluateSuggestionsLayout = (): void => {
    const suggestionsScrollContainer = this.#viewOutput.suggestionsScrollContainer;
    const leftScrollButtonContainer = this.#viewOutput.suggestionsLeftScrollButtonContainer;
    const rightScrollButtonContainer = this.#viewOutput.suggestionsRightScrollButtonContainer;
    if (!suggestionsScrollContainer || !leftScrollButtonContainer || !rightScrollButtonContainer) {
      return;
    }

    const shouldShowLeftButton = suggestionsScrollContainer.scrollLeft > SCROLL_ROUNDING_OFFSET;
    const shouldShowRightButton = suggestionsScrollContainer.scrollLeft +
            (suggestionsScrollContainer as HTMLElement).offsetWidth + SCROLL_ROUNDING_OFFSET <
        suggestionsScrollContainer.scrollWidth;
    leftScrollButtonContainer.classList.toggle('hidden', !shouldShowLeftButton);
    rightScrollButtonContainer.classList.toggle('hidden', !shouldShowRightButton);
  };

  override willHide(): void {
    super.willHide();
    this.#suggestionsResizeObserver.disconnect();
  }

  #handleSuggestionsScrollOrResize(): void {
    void this.#suggestionsEvaluateLayoutThrottler.schedule(() => {
      this.#evaluateSuggestionsLayout();
      return Promise.resolve();
    });
  }

  #scrollSuggestionsScrollContainer(direction: 'left'|'right'): void {
    const suggestionsScrollContainer = this.#viewOutput.suggestionsScrollContainer;
    if (!suggestionsScrollContainer) {
      return;
    }

    suggestionsScrollContainer.scroll({
      top: 0,
      left: direction === 'left' ? suggestionsScrollContainer.scrollLeft - suggestionsScrollContainer.clientWidth :
                                   suggestionsScrollContainer.scrollLeft + suggestionsScrollContainer.clientWidth,
      behavior: 'smooth',
    });
  }

  #handleRateClick(rating: Host.AidaClient.Rating): void {
    if (this.#currentRating === rating) {
      this.#currentRating = undefined;
      this.#isShowingFeedbackForm = false;
      this.#isSubmitButtonDisabled = true;
      // This effectively reset the user rating
      if (this.message.entity === ChatMessageEntity.MODEL && this.message.rpcId) {
        this.onFeedbackSubmit(this.message.rpcId, Host.AidaClient.Rating.SENTIMENT_UNSPECIFIED);
      }
      void this.performUpdate();
      return;
    }

    this.#currentRating = rating;
    this.#isShowingFeedbackForm = this.canShowFeedbackForm;
    if (this.message.entity === ChatMessageEntity.MODEL && this.message.rpcId) {
      this.onFeedbackSubmit(this.message.rpcId, rating);
    }
    void this.performUpdate();
  }

  #handleClose(): void {
    this.#isShowingFeedbackForm = false;
    this.#isSubmitButtonDisabled = true;
    void this.performUpdate();
  }

  #handleSubmit(ev: SubmitEvent): void {
    ev.preventDefault();
    const input = this.#feedbackValue;
    if (!this.#currentRating || !input) {
      return;
    }
    if (this.message.entity === ChatMessageEntity.MODEL && this.message.rpcId) {
      this.onFeedbackSubmit(this.message.rpcId, this.#currentRating, input);
    }
    this.#isShowingFeedbackForm = false;
    this.#isSubmitButtonDisabled = true;
    void this.performUpdate();
  }
}
