// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Spinners from '../../../ui/components/spinners/spinners.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import {type ContextDetail, ErrorType} from '../AiAgent.js';

import freestylerChatUiStyles from './freestylerChatUi.css.js';
import {ProvideFeedback, type ProvideFeedbackProps} from './ProvideFeedback.js';

const FIX_THIS_ISSUE_PROMPT = 'Fix this issue using JavaScript code execution';
const DOGFOOD_FEEDBACK_URL = 'https://goo.gle/freestyler-feedback' as Platform.DevToolsPath.UrlString;
export const DOGFOOD_INFO = 'https://goo.gle/freestyler-dogfood' as Platform.DevToolsPath.UrlString;

const UIStrings = {
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  notLoggedIn: 'This feature is only available when you sign into Chrome with your Google account',
  /**
   * @description Message shown when the user is offline.
   */
  offline: 'Check your internet connection and try again',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForEmptyState: 'This is an experimental AI feature and won\'t always get it right.',
  /**
   * @description Text for a link to Chrome DevTools Settings.
   */
  settingsLink: 'AI assistance in Settings',
  /**
   * @description Placeholder text for an inactive text field. When active, it's used for the user's input to the GenAI assistance.
   */
  followTheSteps: 'Follow the steps above to ask a question',
  /**
   *@description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   *@example {AI assistance in Settings} PH1
   */
  turnOnForStyles: 'Turn on {PH1} to get help with understanding CSS styles',
};

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForFreestylerAgent:
      'Chat messages and any data the inspected page can access via Web APIs are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForDrJonesNetworkAgent:
      'Chat messages and the selected call stack are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForFreestylerAgent: 'Ask a question about the selected element',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForDrJonesNetworkAgent: 'Ask a question about the selected network request',
  /**
   *@description Title for the send icon button.
   */
  sendButtonTitle: 'Send',
  /**
   *@description Title for the cancel icon button.
   */
  cancelButtonTitle: 'Cancel',
  /**
   *@description Label for the "select an element" button.
   */
  selectAnElement: 'Select an element',
  /**
   *@description Label for the "select an element" button.
   */
  noElementSelected: 'No element selected',
  /**
   *@description Text for the empty state of the AI assistance panel.
   */
  emptyStateText: 'How can I help you?',
  /**
   * @description The error message when the LLM loop is stopped for some reason (Max steps reached or request to LLM failed)
   */
  systemError:
      'Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue.',
  /**
   * @description The error message when the LLM loop is stopped for some reason (Max steps reached or request to LLM failed)
   */
  maxStepsError: 'Seems like I am stuck with the investigation. It would be better if you start over.',
  /**
   *@description Displayed when the user stop the response
   */
  stoppedResponse: 'You stopped this response',
  /**
   * @description Side effect confirmation text
   */
  sideEffectConfirmationDescription: 'The code contains side effects. Do you wish to continue?',
  /**
   * @description Side effect confirmation text for the button that says "Continue"
   */
  positiveSideEffectConfirmation: 'Continue',
  /**
   * @description Side effect confirmation text for the button that says "Cancel"
   */
  negativeSideEffectConfirmation: 'Cancel',
  /**
   *@description Name of the dogfood program.
   */
  dogfood: 'Dogfood',
  /**
   *@description Link text for redirecting to feedback form
   */
  feedbackLink: 'Send feedback',
  /**
   *@description Button text for "Fix this issue" button
   */
  fixThisIssue: 'Fix this issue',
  /**
   *@description The generic name of the AI assistance (do not translate)
   */
  aiAssistance: 'AI assistance',
  /**
   *@description The fallback text when we can't find the user full name
   */
  you: 'You',
  /**
   *@description The fallback text when a step has no title yet
   */
  investigating: 'Investigating',
  /**
   *@description Prefix to the title of each thinking step of a user action is required to continue
   */
  paused: 'Paused',
  /**
   *@description Heading text for the code block that shows the executed code.
   */
  codeExecuted: 'Code executed',
  /**
   *@description Heading text for the code block that shows the code to be executed after side effect confirmation.
   */
  codeToExecute: 'Code to execute',
  /**
   *@description Heading text for the code block that shows the returned data.
   */
  dataReturned: 'Data returned',
  /**
   *@description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: 'Learn about AI in DevTools',
  /**
   * @description Text for a link to Chrome DevTools Settings.
   */
  settingsLink: 'AI assistance in Settings',
  /**
   * @description Placeholder text for an inactive text field. When active, it's used for the user's input to the GenAI assistance.
   */
  followTheSteps: 'Follow the steps above to ask a question',
};

const str_ = i18n.i18n.registerUIStrings('panels/freestyler/components/FreestylerChatUi.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

function getInputPlaceholderString(
    aidaAvailability: Host.AidaClient.AidaAccessPreconditions, agentType: AgentType,
    state: State): Platform.UIString.LocalizedString {
  if (state === State.CONSENT_VIEW) {
    return i18nString(UIStrings.followTheSteps);
  }
  switch (aidaAvailability) {
    case Host.AidaClient.AidaAccessPreconditions.AVAILABLE:
      switch (agentType) {
        case AgentType.FREESTYLER:
          return lockedString(UIStringsNotTranslate.inputPlaceholderForFreestylerAgent);
        case AgentType.DRJONES_NETWORK_REQUEST:
          return lockedString(UIStringsNotTranslate.inputPlaceholderForDrJonesNetworkAgent);
      }
    case Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL:
    case Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED:
      return i18nString(UIStrings.notLoggedIn);
    case Host.AidaClient.AidaAccessPreconditions.NO_INTERNET:
      return i18nString(UIStrings.offline);
  }
}

export interface Step {
  isLoading: boolean;
  thought?: string;
  title?: string;
  code?: string;
  output?: string;
  canceled?: boolean;
  sideEffect?: ConfirmSideEffectDialog;
  contextDetails?: ContextDetail[];
}

interface ConfirmSideEffectDialog {
  onAnswer: (result: boolean) => void;
}

export const enum ChatMessageEntity {
  MODEL = 'model',
  USER = 'user',
}

export interface UserChatMessage {
  entity: ChatMessageEntity.USER;
  text: string;
}
export interface ModelChatMessage {
  entity: ChatMessageEntity.MODEL;
  suggestingFix: boolean;
  steps: Step[];
  answer?: string;
  error?: ErrorType;
  rpcId?: number;
}

export type ChatMessage = UserChatMessage|ModelChatMessage;

export const enum State {
  CONSENT_VIEW = 'consent-view',
  CHAT_VIEW = 'chat-view',
}

export const enum AgentType {
  FREESTYLER = 'freestyler',
  DRJONES_NETWORK_REQUEST = 'drjones-network-request',
}

export interface Props {
  onTextSubmit: (text: string) => void;
  onInspectElementClick: () => void;
  onFeedbackSubmit: (rpcId: number, rate: Host.AidaClient.Rating, feedback?: string) => void;
  onCancelClick: () => void;
  onSelectedNetworkRequestClick: () => void | Promise<void>;
  inspectElementToggled: boolean;
  state: State;
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  messages: ChatMessage[];
  selectedElement: SDK.DOMModel.DOMNode|null;
  selectedNetworkRequest: SDK.NetworkRequest.NetworkRequest|null;
  isLoading: boolean;
  canShowFeedbackForm: boolean;
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>;
  agentType: AgentType;
}

// The model returns multiline code blocks in an erroneous way with the language being in new line.
// This renderer takes that into account and correctly updates the parsed multiline token with the language
// correctly identified and stripped from the content.
// Example:
// ```
// css <-- This should have been on the first line.
// * {
//   color: red;
// }
// ```
class MarkdownRendererWithCodeBlock extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  override templateForToken(token: Marked.Marked.Token): LitHtml.TemplateResult|null {
    if (token.type === 'code') {
      const lines = (token.text as string).split('\n');
      if (lines[0]?.trim() === 'css') {
        token.lang = 'css';
        token.text = lines.slice(1).join('\n');
      }
    }

    return super.templateForToken(token);
  }
}

export class FreestylerChatUi extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-freestyler-chat-ui`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #markdownRenderer = new MarkdownRendererWithCodeBlock();
  #scrollTop?: number;
  #props: Props;

  constructor(props: Props) {
    super();
    this.#props = props;
  }

  set props(props: Props) {
    this.#props = props;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [freestylerChatUiStyles];
    this.#render();
  }

  focusTextInput(): void {
    const textArea = this.#shadow.querySelector('.chat-input') as HTMLTextAreaElement;
    if (!textArea) {
      return;
    }

    textArea.focus();
  }

  restoreScrollPosition(): void {
    if (this.#scrollTop === undefined) {
      return;
    }

    const scrollContainer = this.#shadow.querySelector('.messages-scroll-container') as HTMLElement;
    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTop = this.#scrollTop;
  }

  scrollToLastMessage(): void {
    const message = this.#shadow.querySelector('.chat-message:last-child') as HTMLDivElement;
    if (!message) {
      return;
    }
    message.scrollIntoViewIfNeeded();
  }

  #setInputText(text: string): void {
    const textArea = this.#shadow.querySelector('.chat-input') as HTMLTextAreaElement;
    if (!textArea) {
      return;
    }

    textArea.value = text;
  }

  #isTextInputDisabled = (): boolean => {
    const isAidaAvailable = this.#props.aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE;
    const isConsentView = this.#props.state === State.CONSENT_VIEW;
    const showsSideEffects = this.#props.messages.some(message => {
      return message.entity === ChatMessageEntity.MODEL && message.steps.some(step => {
        return Boolean(step.sideEffect);
      });
    });
    const isInputDisabledCheckForFreestylerAgent = !Boolean(this.#props.selectedElement) || showsSideEffects;
    const isInputDisabledCheckForDrJonesNetworkAgent = !Boolean(this.#props.selectedNetworkRequest);
    return (this.#props.agentType === AgentType.FREESTYLER && isInputDisabledCheckForFreestylerAgent) ||
        (this.#props.agentType === AgentType.DRJONES_NETWORK_REQUEST && isInputDisabledCheckForDrJonesNetworkAgent) ||
        !isAidaAvailable || isConsentView;
  };

  #handleScroll = (ev: Event): void => {
    if (!ev.target || !(ev.target instanceof HTMLElement)) {
      return;
    }

    this.#scrollTop = ev.target.scrollTop;
  };

  #handleSubmit = (ev: SubmitEvent): void => {
    ev.preventDefault();
    const textArea = this.#shadow.querySelector('.chat-input') as HTMLTextAreaElement;
    if (!textArea || !textArea.value) {
      return;
    }
    this.#props.onTextSubmit(textArea.value);
    textArea.value = '';
  };

  #handleTextAreaKeyDown = (ev: KeyboardEvent): void => {
    if (!ev.target || !(ev.target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (ev.key === 'Enter' && !ev.shiftKey) {
      // Do not go to a new line whenver Shift + Enter is pressed.
      ev.preventDefault();
      // Only submit the text when there isn't a request already in flight.
      if (!this.#props.isLoading) {
        this.#props.onTextSubmit(ev.target.value);
        ev.target.value = '';
      }
    }
  };

  #handleCancel = (ev: SubmitEvent): void => {
    ev.preventDefault();

    if (!this.#props.isLoading) {
      return;
    }

    this.#props.onCancelClick();
  };

  #handleSuggestionClick = (suggestion: string): void => {
    this.#setInputText(suggestion);
    this.focusTextInput();
  };

  #renderRateButtons(rpcId: number): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`<${ProvideFeedback.litTagName}
      .props=${{
        onFeedbackSubmit: (rating, feedback) => {
          this.#props.onFeedbackSubmit(rpcId, rating, feedback);
        },
        canShowFeedbackForm: this.#props.canShowFeedbackForm,
      } as ProvideFeedbackProps}
      ></${ProvideFeedback.litTagName}>`;
    // clang-format on
  }

  #renderTextAsMarkdown(text: string): LitHtml.TemplateResult {
    let tokens = [];
    try {
      tokens = Marked.Marked.lexer(text);
      for (const token of tokens) {
        // Try to render all the tokens to make sure that
        // they all have a template defined for them. If there
        // isn't any template defined for a token, we'll fallback
        // to rendering the text as plain text instead of markdown.
        this.#markdownRenderer.renderToken(token);
      }
    } catch (err) {
      // The tokens were not parsed correctly or
      // one of the tokens are not supported, so we
      // continue to render this as text.
      return LitHtml.html`${text}`;
    }

    // clang-format off
    return LitHtml.html`<${MarkdownView.MarkdownView.MarkdownView.litTagName}
      .data=${{tokens, renderer: this.#markdownRenderer} as MarkdownView.MarkdownView.MarkdownViewData}>
    </${MarkdownView.MarkdownView.MarkdownView.litTagName}>`;
    // clang-format on
  }

  #renderTitle(step: Step): LitHtml.LitTemplate {
    const paused = step.sideEffect ?
        LitHtml.html`<span class="paused">${lockedString(UIStringsNotTranslate.paused)}: </span>` :
        LitHtml.nothing;
    const actionTitle = step.title ?? `${lockedString(UIStringsNotTranslate.investigating)}…`;

    return LitHtml.html`<span class="title">${paused}${actionTitle}</span>`;
  }

  #renderStepDetails(step: Step, options: {isLast: boolean}): LitHtml.LitTemplate {
    const sideEffects =
        options.isLast && step.sideEffect ? this.#renderSideEffectConfirmationUi(step) : LitHtml.nothing;
    const thought = step.thought ? LitHtml.html`<p>${this.#renderTextAsMarkdown(step.thought)}</p>` : LitHtml.nothing;
    // If there is no "output" yet, it means we didn't execute the code yet (e.g. maybe it is still waiting for confirmation from the user)
    // thus we show "Code to execute" text rather than "Code executed" text on the heading of the code block.
    const codeHeadingText = (step.output && !step.canceled) ? lockedString(UIStringsNotTranslate.codeExecuted) :
                                                              lockedString(UIStringsNotTranslate.codeToExecute);
    // If there is output, we don't show notice on this code block and instead show
    // it in the data returned code block.
    // clang-format off
    const code = step.code ? LitHtml.html`<div class="action-result">
        <${MarkdownView.CodeBlock.CodeBlock.litTagName}
          .code=${step.code.trim()}
          .codeLang=${'js'}
          .displayToolbar=${false}
          .displayNotice=${!Boolean(step.output)}
          .heading=${{
            text: codeHeadingText,
            showCopyButton: true,
          }}
        ></${MarkdownView.CodeBlock.CodeBlock.litTagName}>
    </div>` : LitHtml.nothing;
    const output = step.output ? LitHtml.html`<div class="js-code-output">
      <${MarkdownView.CodeBlock.CodeBlock.litTagName}
        .code=${step.output}
        .codeLang=${'js'}
        .displayToolbar=${false}
        .displayNotice=${true}
        .heading=${{
          text: lockedString(UIStringsNotTranslate.dataReturned),
          showCopyButton: false,
        }}
      ></${MarkdownView.CodeBlock.CodeBlock.litTagName}>
    </div>` : LitHtml.nothing;
    const contextDetails = step.contextDetails && step.contextDetails?.length > 0 ?
    LitHtml.html`${LitHtml.Directives.repeat(
      step.contextDetails,
        contextDetail => {
          return LitHtml.html`<div class="context-details">
        <${MarkdownView.CodeBlock.CodeBlock.litTagName}
          .code=${contextDetail.text}
          .codeLang=${'js'}
          .displayToolbar=${false}
          .displayNotice=${false}
          .heading=${{
            text: lockedString(contextDetail.title),
            showCopyButton: true,
          }}
        ></${MarkdownView.CodeBlock.CodeBlock.litTagName}>
      </div>`;
        },
      )}` : LitHtml.nothing;

    return LitHtml.html`<div class="step-details">
      ${thought}
      ${code}
      ${sideEffects}
      ${output}
      ${contextDetails}
    </div>`;
    // clang-format on
  }

  #renderStepBadge(step: Step, options: {isLast: boolean}): LitHtml.LitTemplate {
    if (this.#props.isLoading && options.isLast && !step.sideEffect) {
      return LitHtml.html`<${Spinners.Spinner.Spinner.litTagName}></${Spinners.Spinner.Spinner.litTagName}>`;
    }

    let iconName: string = 'checkmark';
    if (options.isLast && step.sideEffect) {
      iconName = 'pause-circle';
    } else if (step.canceled) {
      iconName = 'cross';
    }

    return LitHtml.html`<${IconButton.Icon.Icon.litTagName}
        class="indicator"
        .name=${iconName}
      ></${IconButton.Icon.Icon.litTagName}>`;
  }

  #renderStep(step: Step, options: {isLast: boolean}): LitHtml.LitTemplate {
    const stepClasses = LitHtml.Directives.classMap({
      step: true,
      empty: !step.thought && !step.code,
      paused: Boolean(step.sideEffect),
      canceled: Boolean(step.canceled),
    });
    // clang-format off
    return LitHtml.html`
      <details class=${stepClasses}
        jslog=${VisualLogging.section('step')}
        .open=${Boolean(step.sideEffect)}>
        <summary>
          <div class="summary">
            ${this.#renderStepBadge(step, options)}
            ${this.#renderTitle(step)}
            <${IconButton.Icon.Icon.litTagName}
              class="arrow"
              .name=${'chevron-down'}
            ></${IconButton.Icon.Icon.litTagName}>
          </div>
        </summary>
        ${this.#renderStepDetails(step, {
          isLast: options.isLast,
        })}
      </details>`;
    // clang-format on
  }

  #renderSideEffectConfirmationUi(step: Step): LitHtml.LitTemplate {
    if (!step.sideEffect) {
      return LitHtml.nothing;
    }
    const sideEffectAction = step.sideEffect.onAnswer;

    // clang-format off
    return LitHtml.html`<div
      class="side-effect-confirmation"
      jslog=${VisualLogging.section('side-effect-confirmation')}
    >
      <p>${lockedString(UIStringsNotTranslate.sideEffectConfirmationDescription)}</p>
      <div class="side-effect-buttons-container">
        <${Buttons.Button.Button.litTagName}
          .data=${
            {
              variant: Buttons.Button.Variant.OUTLINED,
              jslogContext: 'decline-execute-code',
            } as Buttons.Button.ButtonData
          }
          @click=${() => sideEffectAction(false)}
        >${lockedString(
          UIStringsNotTranslate.negativeSideEffectConfirmation,
        )}</${Buttons.Button.Button.litTagName}>
        <${Buttons.Button.Button.litTagName}
          .data=${
            {
              variant: Buttons.Button.Variant.PRIMARY,
              jslogContext: 'accept-execute-code',
              iconName: 'play',
            } as Buttons.Button.ButtonData
          }
          @click=${() => sideEffectAction(true)}
        >${
            lockedString(UIStringsNotTranslate.positiveSideEffectConfirmation)
        }</${Buttons.Button.Button.litTagName}>
      </div>
    </div>`;
    // clang-format on
  }

  #renderError(message: ModelChatMessage): LitHtml.LitTemplate {
    if (message.error) {
      let errorMessage;
      switch (message.error) {
        case ErrorType.UNKNOWN:
          errorMessage = UIStringsNotTranslate.systemError;
          break;
        case ErrorType.MAX_STEPS:
          errorMessage = UIStringsNotTranslate.maxStepsError;
          break;
        case ErrorType.ABORT:
          return LitHtml.html`<p class="aborted" jslog=${VisualLogging.section('aborted')}>${
              lockedString(UIStringsNotTranslate.stoppedResponse)}</p>`;
      }

      return LitHtml.html`<p class="error" jslog=${VisualLogging.section('error')}>${lockedString(errorMessage)}</p>`;
    }

    return LitHtml.nothing;
  }

  #renderChatMessage = (message: ChatMessage, {isLast}: {isLast: boolean}): LitHtml.TemplateResult => {
    // TODO(b/365068104): Render user's message as markdown too.
    if (message.entity === ChatMessageEntity.USER) {
      const name = this.#props.userInfo.accountFullName || lockedString(UIStringsNotTranslate.you);
      const image = this.#props.userInfo.accountImage ?
          LitHtml.html`<img src="data:image/png;base64, ${this.#props.userInfo.accountImage}" alt="Account avatar" />` :
          LitHtml.html`<${IconButton.Icon.Icon.litTagName}
            .name=${'profile'}
          ></${IconButton.Icon.Icon.litTagName}>`;
      // clang-format off
      return LitHtml.html`<div
        class="chat-message query"
        jslog=${VisualLogging.section('question')}
      >
        <div class="message-info">
          ${image}
          <div class="message-name">
            <span>${name}</span>
          </div>
        </div>
        <div class="message-content">${this.#renderTextAsMarkdown(message.text)}</div>
      </div>`;
      // clang-format on
    }

    // clang-format off
    return LitHtml.html`
      <div class="chat-message answer" jslog=${VisualLogging.section('answer')}>
        <div class="message-info">
          <${IconButton.Icon.Icon.litTagName}
            name="smart-assistant"
          ></${IconButton.Icon.Icon.litTagName}>
          <div class="message-name">
            <span>${lockedString(UIStringsNotTranslate.aiAssistance)}</span>
          </div>
        </div>
        ${LitHtml.Directives.repeat(
          message.steps,
          (_, index) => index,
          step => {
            return this.#renderStep(step, {
              isLast: [...message.steps.values()].at(-1) === step && isLast,
            });
          },
        )}
        ${
          message.answer
            ? LitHtml.html`<p>${this.#renderTextAsMarkdown(message.answer)}</p>`
            : LitHtml.nothing
        }
        ${this.#renderError(message)}
        <div class="actions">
          ${
            message.rpcId !== undefined
              ? this.#renderRateButtons(message.rpcId)
              : LitHtml.nothing
          }
          ${
            message.suggestingFix && isLast
              ? LitHtml.html`<${Buttons.Button.Button.litTagName}
                  .data=${{
                      variant: Buttons.Button.Variant.OUTLINED,
                      jslogContext: 'fix-this-issue',
                  } as Buttons.Button.ButtonData}
                  @click=${() => this.#handleSuggestionClick(FIX_THIS_ISSUE_PROMPT)}
                >${lockedString(
                  UIStringsNotTranslate.fixThisIssue,
                )}</${Buttons.Button.Button.litTagName}>`
              : LitHtml.nothing
          }
        </div>
      </div>
    `;
    // clang-format on
  };

  #renderSelection(): LitHtml.TemplateResult {
    switch (this.#props.agentType) {
      case AgentType.FREESTYLER:
        return this.#renderSelectAnElement();
      case AgentType.DRJONES_NETWORK_REQUEST:
        return this.#renderSelectedNetworkRequest();
    }
  }

  #renderSelectedNetworkRequest = (): LitHtml.TemplateResult => {
    const resourceClass = LitHtml.Directives.classMap({
      'not-selected': !this.#props.selectedNetworkRequest,
      'resource-link': true,
    });

    // clang-format off
    return LitHtml.html`<div class="select-element">
      <div class=${resourceClass}
      @click=${this.#props.onSelectedNetworkRequestClick}>
        <${IconButton.Icon.Icon.litTagName} name="file-script"></${IconButton.Icon.Icon.litTagName}>
        ${this.#props.selectedNetworkRequest?.name()}
      </div></div>`;
    // clang-format on
  };

  #renderSelectAnElement = (): LitHtml.TemplateResult => {
    const resourceClass = LitHtml.Directives.classMap({
      'not-selected': !this.#props.selectedElement,
      'resource-link': true,
    });

    // clang-format off
    return LitHtml.html`
      <div class="select-element">
        <${Buttons.Button.Button.litTagName}
          .data=${{
              variant: Buttons.Button.Variant.ICON_TOGGLE,
              size: Buttons.Button.Size.REGULAR,
              iconName: 'select-element',
              toggledIconName: 'select-element',
              toggleType: Buttons.Button.ToggleType.PRIMARY,
              toggled: this.#props.inspectElementToggled,
              title: lockedString(UIStringsNotTranslate.selectAnElement),
              jslogContext: 'select-element',
          } as Buttons.Button.ButtonData}
          @click=${this.#props.onInspectElementClick}
        ></${Buttons.Button.Button.litTagName}>
        <div class=${resourceClass}>${
          this.#props.selectedElement
            ? LitHtml.Directives.until(
                  Common.Linkifier.Linkifier.linkify(this.#props.selectedElement),
                )
            : LitHtml.html`<span>${
              lockedString(UIStringsNotTranslate.noElementSelected)
            }</span>`
        }</div>
      </div>`;
    // clang-format on
  };

  #renderFeedbackLink = (): LitHtml.TemplateResult => {
    // clang-format off
    return  LitHtml.html`
        <${IconButton.Icon.Icon.litTagName}
          name="dog-paw"
          class="feedback-icon"
        ></${IconButton.Icon.Icon.litTagName}>
        <span>${lockedString(UIStringsNotTranslate.dogfood)}</span>
        <span aria-hidden="true">-</span>
        <x-link href=${DOGFOOD_FEEDBACK_URL}
          class="link"
          jslog=${VisualLogging.link('freestyler.feedback').track({
          click: true,
        })}>${
          lockedString(UIStringsNotTranslate.feedbackLink)
        }</x-link>`;
    // clang-format on
  };

  #renderMessages = (): LitHtml.TemplateResult => {
    // clang-format off
    return LitHtml.html`
      <div class="messages-scroll-container" @scroll=${this.#handleScroll}>
        <div class="messages-container">
          ${this.#props.messages.map((message, _, array) =>
            this.#renderChatMessage(message, {
              isLast: array.at(-1) === message,
            }),
          )}
        </div>
      </div>
    `;
    // clang-format on
  };

  #renderEmptyState = (): LitHtml.TemplateResult => {
    const suggestions = this.#getSuggestions();

    // clang-format off
    return LitHtml.html`<div class="empty-state-container messages-scroll-container">
      <div class="header">
        <div class="icon">
          <${IconButton.Icon.Icon.litTagName}
            name="smart-assistant"
          ></${IconButton.Icon.Icon.litTagName}>
        </div>
        ${lockedString(UIStringsNotTranslate.emptyStateText)}
      </div>
      <div class="suggestions">
        ${suggestions.map(suggestion => {
          return LitHtml.html`<${Buttons.Button.Button.litTagName}
            class="suggestion"
            @click=${() => this.#handleSuggestionClick(suggestion)}
            .data=${
              {
                variant: Buttons.Button.Variant.OUTLINED,
                size: Buttons.Button.Size.REGULAR,
                title: suggestion,
                jslogContext: 'suggestion',
                disabled: this.#isTextInputDisabled(),
              } as Buttons.Button.ButtonData
            }
          >${suggestion}</${Buttons.Button.Button.litTagName}>`;
        })}
      </div>
    </div>`;
    // clang-format on
  };

  #getSuggestions = (): string[] => {
    switch (this.#props.agentType) {
      case AgentType.FREESTYLER:
        return [
          'Why isn\'t this element visible?',
          'Why does this element overlap another?',
          'How do I center this element?',
        ];
      case AgentType.DRJONES_NETWORK_REQUEST:
        return [
          'Why is this network request taking longer to complete?',
        ];
    }
  };

  #renderChatInput = (): LitHtml.TemplateResult => {
    // clang-format off
    return LitHtml.html`
      <div class="chat-input-container">
        <textarea class="chat-input"
          .disabled=${this.#isTextInputDisabled()}
          wrap="hard"
          @keydown=${this.#handleTextAreaKeyDown}
          placeholder=${getInputPlaceholderString(this.#props.aidaAvailability, this.#props.agentType, this.#props.state)}
          jslog=${VisualLogging.textField('query').track({ keydown: 'Enter' })}></textarea>
          ${this.#props.isLoading
            ? LitHtml.html`<${Buttons.Button.Button.litTagName}
              class="chat-input-button"
              aria-label=${lockedString(UIStringsNotTranslate.cancelButtonTitle)}
              @click=${this.#handleCancel}
              .data=${
                {
                  variant: Buttons.Button.Variant.PRIMARY,
                  size: Buttons.Button.Size.SMALL,
                  disabled: this.#isTextInputDisabled(),
                  iconName: 'stop',
                  title: lockedString(UIStringsNotTranslate.cancelButtonTitle),
                  jslogContext: 'stop',
                } as Buttons.Button.ButtonData
              }
            ></${Buttons.Button.Button.litTagName}>`
            : LitHtml.html`<${Buttons.Button.Button.litTagName}
              class="chat-input-button"
              aria-label=${lockedString(UIStringsNotTranslate.sendButtonTitle)}
              .data=${
                {
                  type: 'submit',
                  variant: Buttons.Button.Variant.ICON,
                  size: Buttons.Button.Size.SMALL,
                  disabled: this.#isTextInputDisabled(),
                  iconName: 'send',
                  title: lockedString(UIStringsNotTranslate.sendButtonTitle),
                  jslogContext: 'send',
                } as Buttons.Button.ButtonData
              }
            ></${Buttons.Button.Button.litTagName}>`}
      </div>`;
    // clang-format on
  };

  #getDisclaimerText = (): Platform.UIString.LocalizedString => {
    if (this.#props.state === State.CONSENT_VIEW) {
      return i18nString(UIStrings.inputDisclaimerForEmptyState);
    }
    switch (this.#props.agentType) {
      case AgentType.FREESTYLER:
        return lockedString(UIStringsNotTranslate.inputDisclaimerForFreestylerAgent);
      case AgentType.DRJONES_NETWORK_REQUEST:
        return lockedString(UIStringsNotTranslate.inputDisclaimerForDrJonesNetworkAgent);
    }
  };

  #renderOptIn(): LitHtml.TemplateResult {
    const settingsLink = document.createElement('button');
    settingsLink.textContent = i18nString(UIStrings.settingsLink);
    settingsLink.classList.add('link');
    UI.ARIAUtils.markAsLink(settingsLink);
    settingsLink.addEventListener('click', () => {
      void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    });
    settingsLink.setAttribute('jslog', `${VisualLogging.action('open-ai-settings').track({click: true})}`);

    // clang-format off
    return LitHtml.html`
      <div class="empty-state-container">
        <div class="opt-in">
          <div class="opt-in-icon-container">
            <${IconButton.Icon.Icon.litTagName} .data=${{
              iconName: 'smart-assistant',
              width: 'var(--sys-size-8)',
              height: 'var(--sys-size-8)',
            } as IconButton.Icon.IconData}>
          </div>
          <div>
            ${i18n.i18n.getFormatLocalizedString(str_, UIStrings.turnOnForStyles, {PH1: settingsLink})}
          </div>
        </div>
      </div>
    `;
    // clang-format on
  }

  #render(): void {
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="chat-ui">
        ${
          this.#props.state === State.CONSENT_VIEW ? this.#renderOptIn()
            : (this.#props.messages.length > 0
              ? this.#renderMessages()
              : this.#renderEmptyState()
            )
        }
        <form class="input-form" @submit=${this.#handleSubmit}>
          ${this.#props.state !== State.CONSENT_VIEW ? LitHtml.html`
            <div class="input-header">
              <div class="header-link-container">
                ${this.#renderSelection()}
              </div>
              <div class="header-link-container">
                ${this.#renderFeedbackLink()}
              </div>
            </div>
          ` : LitHtml.nothing}
          ${this.#renderChatInput()}
        </form>
        <footer class="disclaimer">
          <p class="disclaimer-text">${lockedString(
            this.#getDisclaimerText(),
          )} <x-link
              href="#"
              class="link"
              jslog=${VisualLogging.link('open-ai-settings').track({
                click: true,
              })}
              @click=${(event: Event) => {
                event.preventDefault();
                void UI.ViewManager.ViewManager.instance().showView(
                  'chrome-ai',
                );
              }}
            >${lockedString(UIStringsNotTranslate.learnAbout)}</x-link>
          </p>
        </footer>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-freestyler-chat-ui': FreestylerChatUi;
  }
}

export const FOR_TEST = {
  MarkdownRendererWithCodeBlock,
};

customElements.define('devtools-freestyler-chat-ui', FreestylerChatUi);
