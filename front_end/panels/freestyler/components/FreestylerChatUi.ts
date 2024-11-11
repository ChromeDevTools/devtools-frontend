// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/spinners/spinners.js';
import './UserActionRow.js';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import {AgentType, type ContextDetail, type ConversationContext, ErrorType} from '../AiAgent.js';

import freestylerChatUiStyles from './freestylerChatUi.css.js';
import type {UserActionRowProps} from './UserActionRow.js';

const {html, Directives: {ifDefined}} = LitHtml;

const UIStrings = {
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  notLoggedIn: 'This feature is only available when you are signed into Chrome with your Google account',
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
  /**
   *@description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   *@example {AI assistance in Settings} PH1
   */
  turnOnForStylesAndRequests: 'Turn on {PH1} to get help with styles and network requests',
  /**
   *@description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   *@example {AI assistance in Settings} PH1
   */
  turnOnForStylesRequestsAndFiles: 'Turn on {PH1} to get help with styles, network requests, and files',
  /**
   *@description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   *@example {AI assistance in Settings} PH1
   */
  turnOnForStylesRequestsPerformanceAndFiles:
      'Turn on {PH1} to get help with styles, network requests, performance, and files',
  /**
   *@description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: 'Learn about AI in DevTools',
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
      'Chat messages and the selected network request are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForDrJonesFileAgent:
      'Chat messages and the selected file are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\'t always get it right.',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimerForDrJonesPerformanceAgent:
      'Chat messages and the selected call tree are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won\'t always get it right.',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForFreestylerAgent: 'Ask a question about the selected element',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForDrJonesNetworkAgent: 'Ask a question about the selected network request',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForDrJonesFileAgent: 'Ask a question about the selected file',
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholderForDrJonesPerformanceAgent: 'Ask a question about the selected item and its call tree',
  /**
   * @description Placeholder text for the input shown when the conversation is blocked because a cross-origin context was selected.
   */
  crossOriginError: 'To talk about data from another origin, start a new chat',
  /**
   * @description Placeholder text for the input shown when the conversation is blocked because a cross-origin context was selected.
   */
  newConversationError: 'To talk about this data, start a new chat',
  /**
   *@description Title for the send icon button.
   */
  sendButtonTitle: 'Send',
  /**
   *@description Title for the start new chat
   */
  startNewChat: 'Start new chat',
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
   *@description Text for the empty state of the AI assistance panel when there is no agent selected.
   */
  noAgentStateText: 'Explore AI assistance',
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
   *@description The generic name of the AI agent (do not translate)
   */
  ai: 'AI',
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
   *@description Aria label for the check mark icon to be read by screen reader
   */
  completed: 'Completed',
  /**
   *@description Aria label for the loading icon to be read by screen reader
   */
  inProgress: 'In progress',
  /**
   *@description Aria label for the cancel icon to be read by screen reader
   */
  canceled: 'Canceled',
  /**
   *@description Text displayed when the chat input is disabled due to reading past conversation.
   */
  pastConversation: 'You\'re viewing a past conversation.',
};

const str_ = i18n.i18n.registerUIStrings('panels/freestyler/components/FreestylerChatUi.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

export interface Step {
  isLoading: boolean;
  thought?: string;
  title?: string;
  code?: string;
  output?: string;
  canceled?: boolean;
  sideEffect?: ConfirmSideEffectDialog;
  contextDetails?: [ContextDetail, ...ContextDetail[]];
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
  steps: Step[];
  suggestions?: [string, ...string[]];
  answer?: string;
  error?: ErrorType;
  rpcId?: number;
}

export type ChatMessage = UserChatMessage|ModelChatMessage;

export const enum State {
  CONSENT_VIEW = 'consent-view',
  CHAT_VIEW = 'chat-view',
}

export interface Props {
  onTextSubmit: (text: string) => void;
  onInspectElementClick: () => void;
  onFeedbackSubmit: (rpcId: number, rate: Host.AidaClient.Rating, feedback?: string) => void;
  onCancelClick: () => void;
  onContextClick: () => void | Promise<void>;
  onNewConversation: () => void;
  onCancelCrossOriginChat?: () => void;
  inspectElementToggled: boolean;
  state: State;
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  messages: ChatMessage[];
  selectedContext: ConversationContext<unknown>|null;
  isLoading: boolean;
  canShowFeedbackForm: boolean;
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>;
  agentType?: AgentType;
  isReadOnly: boolean;
  blockedByCrossOrigin: boolean;
  requiresNewConversation?: boolean;
  stripLinks: boolean;
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
  #stripLinks: boolean = false;
  constructor(opts: {stripLinks?: boolean} = {}) {
    super();
    this.#stripLinks = Boolean(opts.stripLinks);
  }
  override templateForToken(token: Marked.Marked.MarkedToken): LitHtml.TemplateResult|null {
    if (token.type === 'code') {
      const lines = (token.text as string).split('\n');
      if (lines[0]?.trim() === 'css') {
        token.lang = 'css';
        token.text = lines.slice(1).join('\n');
      }
    }

    // Potentially remove links from the rendered result
    if (this.#stripLinks && (token.type === 'link' || token.type === 'image')) {
      // Insert an extra text node at the end after any link text. Show the link as plaintext (surrounded by parentheses)
      const urlText = ` ( ${token.href} )`;
      // Images would be turned into as links (but we'll skip that) https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/components/markdown_view/MarkdownView.ts;l=286-291;drc=d2cc89e48c913666655542d818ad0a09d25d0d08
      const childTokens = token.type === 'image' ? undefined : [
        ...token.tokens,
        {type: 'text', text: urlText, raw: urlText},
      ];

      token = {
        ...token,
        // Marked doesn't read .text or .raw of a link, but we'll update anyway
        // https://github.com/markedjs/marked/blob/035af38ab1e5aae95ece213dcc9a9c6d79cff46f/src/Renderer.ts#L178-L191
        text: `${token.text}${urlText}`,
        raw: `${token.text}${urlText}`,
        type: 'text',
        tokens: childTokens,
      };
    }

    return super.templateForToken(token);
  }
}

export class FreestylerChatUi extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #markdownRenderer = new MarkdownRendererWithCodeBlock();
  #scrollTop?: number;
  #props: Props;

  constructor(props: Props) {
    super();
    this.#props = props;
  }

  set props(props: Props) {
    this.#markdownRenderer = new MarkdownRendererWithCodeBlock({stripLinks: props.stripLinks});
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

    const scrollContainer = this.#shadow.querySelector('.chat-ui main') as HTMLElement;
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
    if (this.#props.blockedByCrossOrigin || this.#props.requiresNewConversation) {
      return true;
    }
    const isAidaAvailable = this.#props.aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE;
    const isConsentView = this.#props.state === State.CONSENT_VIEW;
    const showsSideEffects = this.#props.messages.some(message => {
      return message.entity === ChatMessageEntity.MODEL && message.steps.some(step => {
        return Boolean(step.sideEffect);
      });
    });

    if (!isAidaAvailable || isConsentView || !this.#props.agentType) {
      return true;
    }

    if (!this.#props.selectedContext) {
      return true;
    }

    // Agent-specific input disabled rules.
    switch (this.#props.agentType) {
      case AgentType.FREESTYLER:
        return showsSideEffects;
      case AgentType.DRJONES_NETWORK_REQUEST:
        return false;
      case AgentType.DRJONES_FILE:
        return false;
      case AgentType.DRJONES_PERFORMANCE:
        return false;
    }
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
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
  };

  #renderUserActionRow(rpcId?: number, suggestions?: [string, ...string[]]): LitHtml.TemplateResult {
    // clang-format off
    return html`<devtools-user-action-row
      .props=${{
        showRateButtons: rpcId !== undefined,
        onFeedbackSubmit: (rating, feedback) => {
          if (!rpcId) {
            return;
          }
          this.#props.onFeedbackSubmit(rpcId, rating, feedback);
        },
        suggestions,
        handleSuggestionClick: this.#handleSuggestionClick,
        canShowFeedbackForm: this.#props.canShowFeedbackForm,
      } as UserActionRowProps}
      ></devtools-user-action-row>`;
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
      return html`${text}`;
    }

    // clang-format off
    return html`<devtools-markdown-view
      .data=${{tokens, renderer: this.#markdownRenderer} as MarkdownView.MarkdownView.MarkdownViewData}>
    </devtools-markdown-view>`;
    // clang-format on
  }

  #renderTitle(step: Step): LitHtml.LitTemplate {
    const paused = step.sideEffect ? html`<span class="paused">${lockedString(UIStringsNotTranslate.paused)}: </span>` :
                                     LitHtml.nothing;
    const actionTitle = step.title ?? `${lockedString(UIStringsNotTranslate.investigating)}…`;

    return html`<span class="title">${paused}${actionTitle}</span>`;
  }

  #renderStepCode(step: Step): LitHtml.LitTemplate {
    if (!step.code && !step.output) {
      return LitHtml.nothing;
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
                             LitHtml.nothing;
    const output = step.output ? html`<div class="js-code-output">
      <devtools-code-block
        .code=${step.output}
        .codeLang=${'js'}
        .displayNotice=${true}
        .header=${lockedString(UIStringsNotTranslate.dataReturned)}
        .showCopyButton=${false}
      ></devtools-code-block>
    </div>` :
                                 LitHtml.nothing;

    return html`<div class="step-code">${code}${output}</div>`;
    // clang-format on
  }

  #renderStepDetails(step: Step, options: {isLast: boolean}): LitHtml.LitTemplate {
    const sideEffects =
        options.isLast && step.sideEffect ? this.#renderSideEffectConfirmationUi(step) : LitHtml.nothing;
    const thought = step.thought ? html`<p>${this.#renderTextAsMarkdown(step.thought)}</p>` : LitHtml.nothing;

    // clang-format off
    const contextDetails = step.contextDetails ?
    html`${LitHtml.Directives.repeat(
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
      )}` : LitHtml.nothing;

    return html`<div class="step-details">
      ${thought}
      ${this.#renderStepCode(step)}
      ${sideEffects}
      ${contextDetails}
    </div>`;
    // clang-format on
  }

  #renderStepBadge(step: Step, options: {isLast: boolean}): LitHtml.LitTemplate {
    if (this.#props.isLoading && options.isLast && !step.sideEffect) {
      return html`<devtools-spinner></devtools-spinner>`;
    }

    let iconName: string = 'checkmark';
    let ariaLabel: string|undefined = lockedString(UIStringsNotTranslate.completed);
    let role: 'button'|undefined = 'button';
    if (options.isLast && step.sideEffect) {
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

  #renderStep(step: Step, options: {isLast: boolean}): LitHtml.LitTemplate {
    const stepClasses = LitHtml.Directives.classMap({
      step: true,
      empty: !step.thought && !step.code && !step.contextDetails,
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
            ${this.#renderStepBadge(step, options)}
            ${this.#renderTitle(step)}
            <devtools-icon
              class="arrow"
              .name=${'chevron-down'}
            ></devtools-icon>
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

    const sideEffectAction = (answer: boolean): void => {
      step.sideEffect?.onAnswer(answer);
      step.sideEffect = undefined;
      this.#render();
    };

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
          @click=${() => sideEffectAction(false)}
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
          @click=${() => sideEffectAction(true)}
        >${
            lockedString(UIStringsNotTranslate.positiveSideEffectConfirmation)
        }</devtools-button>
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
          return html`<p class="aborted" jslog=${VisualLogging.section('aborted')}>${
              lockedString(UIStringsNotTranslate.stoppedResponse)}</p>`;
      }

      return html`<p class="error" jslog=${VisualLogging.section('error')}>${lockedString(errorMessage)}</p>`;
    }

    return LitHtml.nothing;
  }

  #renderChatMessage = (message: ChatMessage, {isLast}: {isLast: boolean}): LitHtml.TemplateResult => {
    if (message.entity === ChatMessageEntity.USER) {
      const name = this.#props.userInfo.accountFullName || lockedString(UIStringsNotTranslate.you);
      const image = this.#props.userInfo.accountImage ?
          html`<img src="data:image/png;base64, ${this.#props.userInfo.accountImage}" alt="Account avatar" />` :
          html`<devtools-icon
            .name=${'profile'}
          ></devtools-icon>`;
      // clang-format off
      return html`<section
        class="chat-message query"
        jslog=${VisualLogging.section('question')}
      >
        <div class="message-info">
          ${image}
          <div class="message-name">
            <h2>${name}</h2>
          </div>
        </div>
        <div class="message-content">${this.#renderTextAsMarkdown(message.text)}</div>
      </section>`;
      // clang-format on
    }

    // clang-format off
    return html`
      <section
        class="chat-message answer"
        jslog=${VisualLogging.section('answer')}
      >
        <div class="message-info">
          <devtools-icon name="smart-assistant"></devtools-icon>
          <div class="message-name">
            <h2>${lockedString(UIStringsNotTranslate.ai)}</h2>
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
        ${message.answer
          ? html`<p>${this.#renderTextAsMarkdown(message.answer)}</p>`
          : LitHtml.nothing}
        ${this.#renderError(message)}
        <div class="actions">
          ${isLast && this.#props.isLoading
            ? LitHtml.nothing
            : this.#renderUserActionRow(
                message.rpcId,
                isLast ? message.suggestions : undefined,
              )}
        </div>
      </section>
    `;
    // clang-format on
  };

  #renderSelection(): LitHtml.LitTemplate {
    if (!this.#props.agentType) {
      return LitHtml.nothing;
    }
    return this.#renderContextSelector();
  }

  #renderContextSelector(): LitHtml.LitTemplate {
    const resourceClass = LitHtml.Directives.classMap({
      'not-selected': !this.#props.selectedContext,
      'resource-link': true,
    });

    // TODO: currently the picker behavior is SDKNode specific.
    const hasPickerBehavior = this.#props.agentType === AgentType.FREESTYLER;

    if (!this.#props.selectedContext && !hasPickerBehavior) {
      return LitHtml.nothing;
    }

    const icon = this.#props.selectedContext?.getIcon() ?? LitHtml.nothing;

    // clang-format off
    return html`<div class="select-element">
      ${
        hasPickerBehavior ? html`
          <devtools-button
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
          ></devtools-button>
        ` : LitHtml.nothing
      }
      <div role=button class=${resourceClass}
        @click=${this.#props.onContextClick}>
          ${icon}${this.#props.selectedContext?.getTitle() ?? html`<span>${
            lockedString(UIStringsNotTranslate.noElementSelected)
          }</span>`}
      </div>
    </div>`;
    // clang-format on
  }

  #renderMessages = (): LitHtml.TemplateResult => {
    // clang-format off
    return html`
      <div class="messages-container">
        ${this.#props.messages.map((message, _, array) =>
          this.#renderChatMessage(message, {
            isLast: array.at(-1) === message,
          }),
        )}
      </div>
    `;
    // clang-format on
  };

  #renderEmptyState = (): LitHtml.TemplateResult => {
    const suggestions = this.#getEmptyStateSuggestions();

    // clang-format off
    return html`<div class="empty-state-container">
      <div class="header">
        <div class="icon">
          <devtools-icon
            name="smart-assistant"
          ></devtools-icon>
        </div>
        <h1>${lockedString(UIStringsNotTranslate.emptyStateText)}</h1>
      </div>
      <div class="empty-state-content">
        ${suggestions.map(suggestion => {
          return html`<devtools-button
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
          >${suggestion}</devtools-button>`;
        })}
      </div>
    </div>`;
    // clang-format on
  };

  #onNewConversation(): void {
    this.#props.onNewConversation();
  }

  #onCancelCrossOriginChat(): void {
    this.#props.onCancelCrossOriginChat?.();
  }

  #getEmptyStateSuggestions = (): string[] => {
    if (!this.#props.agentType) {
      return [];
    }
    switch (this.#props.agentType) {
      case AgentType.FREESTYLER:
        return [
          'What can you help me with?',
          'Why isn’t this element visible?',
          'How do I center this element?',
        ];
      case AgentType.DRJONES_FILE:
        return [
          'What does this script do?',
          'Is the script optimized for performance?',
          'Does the script handle user input safely?',
        ];
      case AgentType.DRJONES_NETWORK_REQUEST:
        return [
          'Why is this network request taking so long?',
          'Are there any security headers present?',
          'Why is the request failing?',
        ];
      case AgentType.DRJONES_PERFORMANCE:
        return [
          'Identify performance issues in this call tree',
          'Where is most of the time being spent in this call tree?',
          'How can I reduce the time of this call tree?',
        ];
    }
  };

  #getInputPlaceholderString(): Platform.UIString.LocalizedString {
    const state = this.#props.state;
    const agentType = this.#props.agentType;
    if (state === State.CONSENT_VIEW || !agentType) {
      return i18nString(UIStrings.followTheSteps);
    }
    if (this.#props.requiresNewConversation) {
      return lockedString(UIStringsNotTranslate.newConversationError);
    }
    if (this.#props.blockedByCrossOrigin) {
      return lockedString(UIStringsNotTranslate.crossOriginError);
    }
    switch (agentType) {
      case AgentType.FREESTYLER:
        return lockedString(UIStringsNotTranslate.inputPlaceholderForFreestylerAgent);
      case AgentType.DRJONES_FILE:
        return lockedString(UIStringsNotTranslate.inputPlaceholderForDrJonesFileAgent);
      case AgentType.DRJONES_NETWORK_REQUEST:
        return lockedString(UIStringsNotTranslate.inputPlaceholderForDrJonesNetworkAgent);
      case AgentType.DRJONES_PERFORMANCE:
        return lockedString(UIStringsNotTranslate.inputPlaceholderForDrJonesPerformanceAgent);
    }
  }

  #renderReadOnlySection(): LitHtml.LitTemplate {
    if (!this.#props.agentType) {
      return LitHtml.nothing;
    }

    // clang-format off
    return html`<div
      class="chat-readonly-container"
      jslog=${VisualLogging.section('read-only')}
    >
      <span>${lockedString(UIStringsNotTranslate.pastConversation)}</span>
      <devtools-button
        aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
        @click=${this.#onNewConversation}
        .data=${{
          variant: Buttons.Button.Variant.TEXT,
          title: lockedString(UIStringsNotTranslate.startNewChat),
          jslogContext: 'start-new-chat',
        } as Buttons.Button.ButtonData}
      >${lockedString(UIStringsNotTranslate.startNewChat)}</devtools-button>
    </div>`;
    // clang-format on
  }

  #renderChatInputButtons(): LitHtml.TemplateResult {
    if (this.#props.isLoading) {
      // clang-format off
      return html`<devtools-button
        class="chat-input-button"
        aria-label=${lockedString(UIStringsNotTranslate.cancelButtonTitle)}
        @click=${this.#handleCancel}
        .data=${
          {
            variant: Buttons.Button.Variant.ICON,
            size: Buttons.Button.Size.REGULAR,
            iconName: 'record-stop',
            title: lockedString(UIStringsNotTranslate.cancelButtonTitle),
            jslogContext: 'stop',
          } as Buttons.Button.ButtonData
        }
      ></devtools-button>`;
      // clang-format on
    }
    if (this.#props.blockedByCrossOrigin || this.#props.requiresNewConversation) {
      // clang-format off
      return html`
        ${this.#props.blockedByCrossOrigin && Boolean(this.#props.onCancelCrossOriginChat) ? html`<devtools-button
          class="chat-cancel-context-button"
          @click=${this.#onCancelCrossOriginChat}
          .data=${
            {
              variant: Buttons.Button.Variant.TEXT,
              size: Buttons.Button.Size.REGULAR,
              jslogContext: 'cancel-cross-origin-context-chat',
            } as Buttons.Button.ButtonData
          }
        >${lockedString(UIStringsNotTranslate.cancelButtonTitle)}</devtools-button>` : LitHtml.nothing}
        <devtools-button
          class="chat-input-button"
          aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
          @click=${this.#onNewConversation}
          .data=${
            {
              variant: Buttons.Button.Variant.PRIMARY,
              size: Buttons.Button.Size.REGULAR,
              title: lockedString(UIStringsNotTranslate.startNewChat),
              jslogContext: 'start-new-chat',
            } as Buttons.Button.ButtonData
          }
        >${lockedString(UIStringsNotTranslate.startNewChat)}</devtools-button>
      `;
      // clang-format on
    }
    // clang-format off
    return html`<devtools-button
      class="chat-input-button"
      aria-label=${lockedString(UIStringsNotTranslate.sendButtonTitle)}
      .data=${
        {
          type: 'submit',
          variant: Buttons.Button.Variant.ICON,
          size: Buttons.Button.Size.REGULAR,
          disabled: this.#isTextInputDisabled(),
          iconName: 'send',
          title: lockedString(UIStringsNotTranslate.sendButtonTitle),
          jslogContext: 'send',
        } as Buttons.Button.ButtonData
      }
    ></devtools-button>`;
  }

  #renderChatInput = (): LitHtml.LitTemplate => {
    if (!this.#props.agentType) {
      return LitHtml.nothing;
    }

    const cls = LitHtml.Directives.classMap({
      'chat-input': true,
      'one-big-button': Boolean(this.#props.requiresNewConversation),
      'two-big-buttons': this.#props.blockedByCrossOrigin,
    });

    // clang-format off
    return html`
    <form class="input-form" @submit=${this.#handleSubmit}>
      ${this.#props.state !== State.CONSENT_VIEW ? html`
        <div class="input-header">
          <div class="header-link-container">
            ${this.#renderSelection()}
          </div>
        </div>
      ` : LitHtml.nothing}
      <div class="chat-input-container">
        <textarea class=${cls}
          .disabled=${this.#isTextInputDisabled()}
          wrap="hard"
          @keydown=${this.#handleTextAreaKeyDown}
          placeholder=${this.#getInputPlaceholderString()}
          jslog=${VisualLogging.textField('query').track({ keydown: 'Enter' })}
        ></textarea>
        <div class="chat-input-buttons">
          ${this.#renderChatInputButtons()}
        </div>
      </div>
    </form>`;
    // clang-format on
  };

  #getDisclaimerText = (): Platform.UIString.LocalizedString => {
    if (this.#props.state === State.CONSENT_VIEW || !this.#props.agentType || this.#props.isReadOnly) {
      return i18nString(UIStrings.inputDisclaimerForEmptyState);
    }
    switch (this.#props.agentType) {
      case AgentType.FREESTYLER:
        return lockedString(UIStringsNotTranslate.inputDisclaimerForFreestylerAgent);
      case AgentType.DRJONES_FILE:
        return lockedString(UIStringsNotTranslate.inputDisclaimerForDrJonesFileAgent);
      case AgentType.DRJONES_NETWORK_REQUEST:
        return lockedString(UIStringsNotTranslate.inputDisclaimerForDrJonesNetworkAgent);
      case AgentType.DRJONES_PERFORMANCE:
        return lockedString(UIStringsNotTranslate.inputDisclaimerForDrJonesPerformanceAgent);
    }
  };

  #getConsentViewContents(): LitHtml.TemplateResult {
    const settingsLink = document.createElement('button');
    settingsLink.textContent = i18nString(UIStrings.settingsLink);
    settingsLink.classList.add('link');
    UI.ARIAUtils.markAsLink(settingsLink);
    settingsLink.addEventListener('click', () => {
      void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    });
    settingsLink.setAttribute('jslog', `${VisualLogging.action('open-ai-settings').track({click: true})}`);
    return html`${i18n.i18n.getFormatLocalizedString(str_, this.#getStringForConsentView(), {PH1: settingsLink})}`;
  }

  #getStringForConsentView(): string {
    const config = Common.Settings.Settings.instance().getHostConfig();
    if (config.devToolsAiAssistancePerformanceAgent?.enabled) {
      return UIStrings.turnOnForStylesRequestsPerformanceAndFiles;
    }
    if (config.devToolsAiAssistanceFileAgent?.enabled) {
      return UIStrings.turnOnForStylesRequestsAndFiles;
    }
    if (config.devToolsAiAssistanceNetworkAgent?.enabled) {
      return UIStrings.turnOnForStylesAndRequests;
    }
    return UIStrings.turnOnForStyles;
  }

  #getUnavailableAidaAvailabilityContents(
      aidaAvailability:
          Exclude<Host.AidaClient.AidaAccessPreconditions, Host.AidaClient.AidaAccessPreconditions.AVAILABLE>):
      LitHtml.TemplateResult {
    switch (aidaAvailability) {
      case Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL:
      case Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED: {
        return html`${i18nString(UIStrings.notLoggedIn)}`;
      }
      case Host.AidaClient.AidaAccessPreconditions.NO_INTERNET: {
        return html`${i18nString(UIStrings.offline)}`;
      }
    }
  }

  #renderDisabledState(contents: LitHtml.TemplateResult): LitHtml.TemplateResult {
    // clang-format off
    return html`
      <div class="empty-state-container">
        <div class="disabled-view">
          <div class="disabled-view-icon-container">
            <devtools-icon .data=${{
              iconName: 'smart-assistant',
              width: 'var(--sys-size-8)',
              height: 'var(--sys-size-8)',
            } as IconButton.Icon.IconData}>
            </devtools-icon>
          </div>
          <div>
            ${contents}
          </div>
        </div>
      </div>
    `;
    // clang-format on
  }

  #renderNoAgentState(): LitHtml.TemplateResult {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const featureCards: {
      icon: string,
      heading: string,
      content: LitHtml.TemplateResult,
    }[] =
        [
          ...(config.devToolsFreestyler?.enabled ? [{
            icon: 'brush-2',
            heading: 'CSS styles',
            content: html`Open <button class="link" role="link" jslog=${
                VisualLogging.link('open-elements-panel').track({click: true})} @click=${() => {
              void UI.ViewManager.ViewManager.instance().showView('elements');
            }}>Elements</button> to ask about CSS styles`,
          }] :
                                                   []),
          ...(config.devToolsAiAssistanceNetworkAgent?.enabled) ? [{
            icon: 'arrow-up-down',
            heading: 'Network',
            content: html`Open <button class="link" role="link" jslog=${
                VisualLogging.link('open-network-panel').track({click: true})} @click=${() => {
              void UI.ViewManager.ViewManager.instance().showView('network');
            }}>Network</button> to ask about a request's details`,
          }] :
                                                                  [],
          ...(config.devToolsAiAssistanceFileAgent?.enabled) ? [{
            icon: 'document',
            heading: 'Files',
            content: html`Open <button class="link" role="link" jslog=${
                VisualLogging.link('open-sources-panel').track({click: true})} @click=${() => {
              void UI.ViewManager.ViewManager.instance().showView('sources');
            }}>Sources</button> to ask about a file's content`,
          }] :
                                                               [],
          ...(config.devToolsAiAssistancePerformanceAgent?.enabled ? [{
            icon: 'performance',
            heading: 'Performance',
            content: html`Open <button class="link" role="link" jslog=${
                VisualLogging.link('open-performance-panel').track({click: true})} @click=${() => {
              void UI.ViewManager.ViewManager.instance().showView('timeline');
            }}>Performance</button> to ask about a trace item`,
          }] :
                                                                     []),
        ];

    // clang-format off
    return html`
      <div class="empty-state-container">
        <div class="header">
          <div class="icon">
            <devtools-icon
              name="smart-assistant"
            ></devtools-icon>
          </div>
          <h1>${lockedString(UIStringsNotTranslate.noAgentStateText)}</h1>
          <p>To chat about an item, right-click and select <strong>Ask AI</strong></p>
        </div>
        <div class="empty-state-content">
          ${featureCards.map(featureCard => html`
            <div class="feature-card">
              <div class="feature-card-icon">
                <devtools-icon name=${featureCard.icon}></devtools-icon>
              </div>
              <div class="feature-card-content">
                <h3>${featureCard.heading}</h3>
                <p>${featureCard.content}</p>
              </div>
            </div>
          `)}
        </div>
      </div>`;
    // clang-format on
  }

  #renderMainContents(): LitHtml.TemplateResult {
    if (this.#props.state === State.CONSENT_VIEW) {
      return this.#renderDisabledState(this.#getConsentViewContents());
    }

    if (this.#props.aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
      return this.#renderDisabledState(this.#getUnavailableAidaAvailabilityContents(this.#props.aidaAvailability));
    }

    if (!this.#props.agentType) {
      return this.#renderNoAgentState();
    }

    if (this.#props.messages.length > 0) {
      return this.#renderMessages();
    }

    return this.#renderEmptyState();
  }

  #render(): void {
    // clang-format off
    LitHtml.render(html`
      <div class="chat-ui">
        <main @scroll=${this.#handleScroll}>
          ${this.#renderMainContents()}
          ${this.#props.isReadOnly ?
              this.#renderReadOnlySection() :
              this.#renderChatInput()
          }
        </main>
        <footer class="disclaimer">
          <p class="disclaimer-text">
            ${this.#getDisclaimerText()}
            <button
              class="link"
              role="link"
              jslog=${VisualLogging.link('open-ai-settings').track({
                click: true,
              })}
              @click=${() => {
                void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
              }}
            >${i18nString(UIStrings.learnAbout)}</button>
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
