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
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import freestylerChatUiStyles from './freestylerChatUi.css.js';
import {ProvideFeedback, type ProvideFeedbackProps} from './ProvideFeedback.js';

const DOGFOOD_FEEDBACK_URL = 'https://goo.gle/freestyler-feedback' as Platform.DevToolsPath.UrlString;
export const DOGFOOD_INFO = 'https://goo.gle/freestyler-dogfood' as Platform.DevToolsPath.UrlString;

/*
  * TODO(nvitkov): b/346933425
  * Temporary string that should not be translated
  * as they may change often during development.
  */
const UIStringsTemp = {
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholder: 'Ask a question about the selected element',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimer:
      'Chat messages and data from this page will be sent to Google, reviewed by humans, and used to improve the feature. Do not use on pages with personal or sensitive information. AI assistant may display inaccurate information.',
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
   *@description Text for the empty state of the Freestyler panel.
   */
  emptyStateText: 'How can I help you?',
  /**
   * @description The title of the button that allows submitting positive
   * feedback about the response for freestyler.
   */
  thumbsUp: 'Thumbs up',
  /**
   * @description The title of the button that allows submitting negative
   * feedback about the response for freestyler.
   */
  thumbsDown: 'Thumbs down',
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  notLoggedIn: 'This feature is only available when you sign into Chrome with your Google account',
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  syncIsOff: 'This feature requires you to turn on Chrome sync',
  /**
   * @description Message shown when the user is offline.
   */
  offline: 'Check your internet connection and try again',
  /**
   *@description Heading for the consent view.
   */
  consentScreenHeading: 'Things to consider',
  /**
   *@description Title of the button for accepting in the consent screen.
   */
  acceptButtonTitle: 'Accept',
  /**
   *@description Consent view main text
   */
  consentTextAiDisclaimer: 'This feature uses AI and might produce inaccurate information.',
  /**
   *@description Consent view data collection text
   */
  consentTextDataDisclaimer:
      'Your inputs and the information from the page you are using this feature for are sent to Google.',
  /**
   *@description Consent view data collection text
   */
  consentTextDoNotUseDisclaimer: 'Do not use on pages with personal or sensitive information.',
  /**
   *@description Consent view data visibility text
   */
  consentTextVisibilityDisclaimer: 'Data may be seen by human reviewers and can be used to improve this feature.',
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
   *@description The name of the CSS assistant that helps you debug CSS issues
   */
  cssAssistant: 'CSS assistant',
  /**
   *@description The fallback text when we can't find the user full name
   */
  you: 'You',
  /**
   *@description The fallback text when a step has no title yet
   */
  performingAction: 'Performing action',
  /**
   *@description Prefix to the title of each thinking step of a user action is required to continue
   */
  paused: 'Paused',
};
// const str_ = i18n.i18n.registerUIStrings('panels/freestyler/components/FreestylerChatUi.ts', UIStrings);
// const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/* eslint-disable  rulesdir/l10n_i18nString_call_only_with_uistrings */
const i18nString = i18n.i18n.lockedString;

function getInputPlaceholderString(aidaAvailability: Host.AidaClient.AidaAccessPreconditions): string {
  switch (aidaAvailability) {
    case Host.AidaClient.AidaAccessPreconditions.AVAILABLE:
      return i18nString(UIStringsTemp.inputPlaceholder);
    case Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL:
      return i18nString(UIStringsTemp.notLoggedIn);
    case Host.AidaClient.AidaAccessPreconditions.NO_ACTIVE_SYNC:
      return i18nString(UIStringsTemp.syncIsOff);
    case Host.AidaClient.AidaAccessPreconditions.NO_INTERNET:
      return i18nString(UIStringsTemp.offline);
  }
}

export interface Step {
  isLoading: boolean;
  thought?: string;
  title?: string;
  code?: string;
  output?: string;
  sideEffect?: ConfirmSideEffectDialog;
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
  error?: string;
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
  onAcceptConsentClick: () => void;
  onCancelClick: () => void;
  onFixThisIssueClick: () => void;
  inspectElementToggled: boolean;
  state: State;
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  messages: ChatMessage[];
  selectedElement: SDK.DOMModel.DOMNode|null;
  isLoading: boolean;
  canShowFeedbackForm: boolean;
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'>;
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
    const input = this.#shadow.querySelector('.chat-input') as HTMLInputElement;
    if (!input) {
      return;
    }

    input.focus();
  }

  scrollToLastMessage(): void {
    const message = this.#shadow.querySelector('.chat-message:last-child') as HTMLDivElement;
    if (!message) {
      return;
    }
    message.scrollIntoViewIfNeeded();
  }

  #handleSubmit = (ev: SubmitEvent): void => {
    ev.preventDefault();
    const input = this.#shadow.querySelector('.chat-input') as HTMLInputElement;
    if (!input || !input.value) {
      return;
    }
    this.#props.onTextSubmit(input.value);
    input.value = '';
  };

  #handleCancel = (ev: SubmitEvent): void => {
    ev.preventDefault();

    if (!this.#props.isLoading) {
      return;
    }

    this.#props.onCancelClick();
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
    if (step.isLoading) {
      return LitHtml.html`<span>Loading...</span>`;
    }
    const paused = step.sideEffect ? `${i18nString(UIStringsTemp.paused)}:` : '';
    const actionTitle = step.title ?? i18nString(UIStringsTemp.performingAction);

    return LitHtml.html`<span>${paused}${actionTitle}</span>`;
  }

  #renderStepDetails(step: Step, options: {isLast: boolean}): LitHtml.LitTemplate {
    const sideEffects =
        options.isLast && step.sideEffect ? this.#renderSideEffectConfirmationUi(step) : LitHtml.nothing;
    const thought = step.thought ? LitHtml.html`<p>${this.#renderTextAsMarkdown(step.thought)}</p>` : LitHtml.nothing;
    const code = step.code ? LitHtml.html`
          <div class="action-result">
              <${MarkdownView.CodeBlock.CodeBlock.litTagName}
                .code=${step.code.trim()}
                .codeLang=${'js'}
                .displayToolbar=${false}
                .displayNotice=${true}
              ></${MarkdownView.CodeBlock.CodeBlock.litTagName}>
          </div>` :
                             LitHtml.nothing;
    const output = step.output ? LitHtml.html`<div class="js-code-output">${step.output}</div>` : LitHtml.nothing;

    // clang-format off
    return LitHtml.html`<div class="step-details">
      ${thought}
      ${code}
      ${sideEffects}
      ${output}
    </div>`;
    // clang-format on
  }

  #renderStep(step: Step, options: {isLast: boolean}): LitHtml.LitTemplate {
    const isLoading = this.#props.isLoading && options.isLast && !step.sideEffect;
    let iconName: string = 'checkmark';
    if (options.isLast && step.sideEffect) {
      iconName = 'pause';
    } else if (isLoading) {
      // TODO: Use correct loading image
      iconName = 'dots-horizontal';
    }

    const iconClasses = LitHtml.Directives.classMap({
      'loading': isLoading,
      'paused': Boolean(step.sideEffect),
    });

    // clang-format off
    return LitHtml.html`
      <details class="step" open>
        <summary>
          <${IconButton.Icon.Icon.litTagName}
            class=${iconClasses}
            .name=${iconName}
          ></${IconButton.Icon.Icon.litTagName}>
          ${this.#renderTitle(step)}
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
      <p>${i18nString(UIStringsTemp.sideEffectConfirmationDescription)}</p>
      <div class="side-effect-buttons-container">
        <${Buttons.Button.Button.litTagName}
          .data=${
            {
              variant: Buttons.Button.Variant.OUTLINED,
              jslogContext: 'decline-execute-code',
            } as Buttons.Button.ButtonData
          }
          @click=${() => sideEffectAction(false)}
        >${i18nString(
          UIStringsTemp.negativeSideEffectConfirmation,
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
            i18nString(UIStringsTemp.positiveSideEffectConfirmation)
        }</${Buttons.Button.Button.litTagName}>
      </div>
    </div>`;
    // clang-format on
  }

  #renderChatMessage = (message: ChatMessage, {isLast}: {isLast: boolean}): LitHtml.TemplateResult => {
    if (message.entity === ChatMessageEntity.USER) {
      // TODO(b/359768313):
      const name = i18nString(UIStringsTemp.you);
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
        <div>${
          message.text
        }</div>
      </div>`;
      // clang-format on
    }

    // clang-format off
    return LitHtml.html`
      <div class="chat-message answer" jslog=${VisualLogging.section('answer')}>
        <div class="message-info">
          <${IconButton.Icon.Icon.litTagName}
            name="pen-spark"
          ></${IconButton.Icon.Icon.litTagName}>
          <div class="message-name">
            <span>${i18nString(UIStringsTemp.cssAssistant)}</span>
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
          message.answer !== undefined
            ? LitHtml.html`<p class="answer-step">${this.#renderTextAsMarkdown(message.answer)}</p>`
            : LitHtml.nothing
        }
        <div class="actions">
          ${
            message.rpcId !== undefined
              ? this.#renderRateButtons(message.rpcId)
              : LitHtml.nothing
          }
          ${
            message.suggestingFix
              ? LitHtml.html`<${Buttons.Button.Button.litTagName}
                  .data=${{
                      variant: Buttons.Button.Variant.OUTLINED,
                      jslogContext: 'fix-this-issue',
                  } as Buttons.Button.ButtonData}
                  @click=${this.#props.onFixThisIssueClick}
                >${i18nString(
                  UIStringsTemp.fixThisIssue,
                )}</${Buttons.Button.Button.litTagName}>`
              : LitHtml.nothing
          }
        </div>
      </div>
    `;
    // clang-format on
  };

  #renderSelectAnElement = (): LitHtml.TemplateResult => {
    const data: Omit<Buttons.Button.ButtonData, 'variant'> = {
      size: Buttons.Button.Size.SMALL,
      iconName: 'select-element',
      toggledIconName: 'select-element',
      toggleType: Buttons.Button.ToggleType.PRIMARY,
      toggled: this.#props.inspectElementToggled,
      title: i18nString(UIStringsTemp.selectAnElement),
      jslogContext: 'select-element',
    };

    // clang-format off
    return this.#props.selectedElement
      ? LitHtml.html`
        <${Buttons.Button.Button.litTagName}
          .data=${{
            variant: Buttons.Button.Variant.ICON_TOGGLE,
            ...data,
          } as Buttons.Button.ButtonData}
          @click=${this.#props.onInspectElementClick}
        ></${Buttons.Button.Button.litTagName}>
        ${LitHtml.Directives.until(
          Common.Linkifier.Linkifier.linkify(this.#props.selectedElement),
        )}`
      : LitHtml.html`
        <${Buttons.Button.Button.litTagName}
          .data=${{
            variant: Buttons.Button.Variant.TEXT,
            ...data,
          } as Buttons.Button.ButtonData}
          @click=${this.#props.onInspectElementClick}
        ><span class="select-an-element-text">${i18nString(
          UIStringsTemp.selectAnElement,
        )}</span></${Buttons.Button.Button.litTagName}>`;
    // clang-format on
  };

  #renderFeedbackLink = (): LitHtml.TemplateResult => {
    // clang-format off
    return  LitHtml.html`
        <${IconButton.Icon.Icon.litTagName}
          name="dog-paw"
          class="feedback-icon"
        ></${IconButton.Icon.Icon.litTagName}>
        <span>${i18nString(UIStringsTemp.dogfood)}</span>
        <span>-</span>
        <x-link href=${DOGFOOD_FEEDBACK_URL}
          class="link"
          jslog=${VisualLogging.link('freestyler.feedback').track({
          click: true,
        })}>${
          i18nString(UIStringsTemp.feedbackLink)
        }</x-link>`;
    // clang-format on
  };

  #renderMessages = (): LitHtml.TemplateResult => {
    // clang-format off
    return LitHtml.html`
      <div class="messages-scroll-container">
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
    // clang-format off
    return LitHtml.html`<div class="empty-state-container">
      <${IconButton.Icon.Icon.litTagName} name="spark" style="width: 36px; height: 36px;"></${IconButton.Icon.Icon.litTagName}>
      ${i18nString(UIStringsTemp.emptyStateText)}
    </div>`;
    // clang-format on
  };

  #renderChatUi = (): LitHtml.TemplateResult => {
    // TODO(ergunsh): Show a better UI for the states where Aida client is not available.
    const isAidaAvailable = this.#props.aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE;
    const showsSideEffects = this.#props.messages.some(message => {
      return message.entity === ChatMessageEntity.MODEL && message.steps.some(step => {
        return Boolean(step.sideEffect);
      });
    });
    const isInputDisabled = !Boolean(this.#props.selectedElement) || !isAidaAvailable || showsSideEffects;

    // clang-format off
    return LitHtml.html`
      <div class="chat-ui">
        ${
          this.#props.messages.length > 0
            ? this.#renderMessages()
            : this.#renderEmptyState()
        }
        <form class="input-form" @submit=${this.#handleSubmit}>
          <div class="input-header">
            <div class="header-link-container">
              ${this.#renderSelectAnElement()}
            </div>
            <div class="header-link-container">
              ${this.#renderFeedbackLink()}
            </div>
          </div>
          <div class="chat-input-container">
            <input type="text" class="chat-input" .disabled=${isInputDisabled}
              placeholder=${getInputPlaceholderString(
                this.#props.aidaAvailability,
              )}
              jslog=${VisualLogging.textField('query').track({ keydown: 'Enter' })}
            >${
                this.#props.isLoading
                  ? LitHtml.html`
                    <${Buttons.Button.Button.litTagName}
                      class="step-actions"
                      aria-label=${i18nString(UIStringsTemp.cancelButtonTitle)}
                      @click=${this.#handleCancel}
                      .data=${
                        {
                          variant: Buttons.Button.Variant.PRIMARY,
                          size: Buttons.Button.Size.SMALL,
                          disabled: isInputDisabled,
                          iconName: 'stop',
                          title: i18nString(UIStringsTemp.cancelButtonTitle),
                          jslogContext: 'stop',
                        } as Buttons.Button.ButtonData
                      }
                    ></${Buttons.Button.Button.litTagName}>`
                  : LitHtml.html`
                    <${Buttons.Button.Button.litTagName}
                      class="step-actions"
                      aria-label=${i18nString(UIStringsTemp.sendButtonTitle)}
                      .data=${
                        {
                          type: 'submit',
                          variant: Buttons.Button.Variant.ICON,
                          size: Buttons.Button.Size.SMALL,
                          disabled: isInputDisabled,
                          iconName: 'send',
                          title: i18nString(UIStringsTemp.sendButtonTitle),
                          jslogContext: 'send',
                        } as Buttons.Button.ButtonData
                      }
                    ></${Buttons.Button.Button.litTagName}>`
              }
          </div>
          <span class="chat-input-disclaimer">${i18nString(
            UIStringsTemp.inputDisclaimer,
          )} See <x-link
              class="link"
              href=${DOGFOOD_INFO}
              jslog=${VisualLogging.link('freestyler.dogfood-info').track({
                click: true,
              })}
            >dogfood terms</x-link>.</span>
        </form>
      </div>
    `;
    // clang-format on
  };

  #renderConsentView = (): LitHtml.TemplateResult => {
    // clang-format off
    return LitHtml.html`
      <div class="consent-view">
        <h2 tabindex="-1">
          ${i18nString(UIStringsTemp.consentScreenHeading)}
        </h2>
        <main>
          ${i18nString(UIStringsTemp.consentTextAiDisclaimer)}
          <ul>
            <li>${i18nString(UIStringsTemp.consentTextDataDisclaimer)}</li>
            <li>${i18nString(UIStringsTemp.consentTextVisibilityDisclaimer)}</li>
            <li>${i18nString(UIStringsTemp.consentTextDoNotUseDisclaimer)}</li>
            <li>See <x-link
              class="link"
              href=${DOGFOOD_INFO}
              jslog=${VisualLogging.link('freestyler.dogfood-info').track({
                click: true,
              })}
            >dogfood terms</x-link>.</li>
          </ul>
          <${Buttons.Button.Button.litTagName}
            class="accept-button"
            @click=${this.#props.onAcceptConsentClick}
            .data=${{
              variant: Buttons.Button.Variant.PRIMARY,
              jslogContext: 'accept',
            } as Buttons.Button.ButtonData}
          >${
            i18nString(UIStringsTemp.acceptButtonTitle)
          }</${Buttons.Button.Button.litTagName}>
        </main>
      </div>
    `;
    // clang-format on
  };

  #render(): void {
    switch (this.#props.state) {
      case State.CHAT_VIEW:
        LitHtml.render(this.#renderChatUi(), this.#shadow, {host: this});
        break;
      case State.CONSENT_VIEW:
        LitHtml.render(this.#renderConsentView(), this.#shadow, {host: this});
        break;
    }
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
