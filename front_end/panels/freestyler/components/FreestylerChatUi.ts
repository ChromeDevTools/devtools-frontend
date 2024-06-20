// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import {Step, type StepData} from '../FreestylerAgent.js';

import freestylerChatUiStyles from './freestylerChatUi.css.js';

/*
  * TODO(nvitkov): b/346933425
  * Temporary string that should not be translated
  * as they may change often during development.
  */
const TempUIStrings = {
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholder: 'Ask a question about the selected element',
  /**
   *@description Disclaimer text right after the chat input.
   */
  inputDisclaimer: 'Freestyler may display inaccurate information and may not get it right',
  /**
   *@description Title for the send icon button.
   */
  sendButtonTitle: 'Send',
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
  notLoggedIn: 'This feature is only available when you sign into Chrome with your Google account.',
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  syncIsOff: 'This feature requires you to turn on Chrome sync.',
  /**
   * @description Message shown when the user is offline.
   */
  offline: 'Check your internet connection and try again.',
};
// const str_ = i18n.i18n.registerUIStrings('panels/freestyler/components/FreestylerChatUi.ts', UIStrings);
// const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/* eslint-disable  rulesdir/l10n_i18nString_call_only_with_uistrings */
const i18nString = i18n.i18n.lockedString;

function getInputPlaceholderString(aidaAvailability: Host.AidaClient.AidaAvailability): string {
  switch (aidaAvailability) {
    case Host.AidaClient.AidaAvailability.AVAILABLE:
      return i18nString(TempUIStrings.inputPlaceholder);
    case Host.AidaClient.AidaAvailability.NO_ACCOUNT_EMAIL:
      return i18nString(TempUIStrings.notLoggedIn);
    case Host.AidaClient.AidaAvailability.NO_ACTIVE_SYNC:
      return i18nString(TempUIStrings.syncIsOff);
    case Host.AidaClient.AidaAvailability.NO_INTERNET:
      return i18nString(TempUIStrings.offline);
  }
}

export enum ChatMessageEntity {
  MODEL = 'model',
  USER = 'user',
}

export type ChatMessage = {
  entity: ChatMessageEntity.USER,
  text: string,
}|{
  entity: ChatMessageEntity.MODEL,
  steps: StepData[],
};

export const enum State {
  CHAT_VIEW = 'chat-view',
  CHAT_VIEW_LOADING = 'chat-view-loading',
}

export const enum Rating {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
}

export type Props = {
  onTextSubmit: (text: string) => void,
  onInspectElementClick: () => void,
  onRateClick: (rpcId: number, rate: Rating) => void,
  inspectElementToggled: boolean,
  state: State,
  aidaAvailability: Host.AidaClient.AidaAvailability,
  messages: ChatMessage[],
  selectedNode: SDK.DOMModel.DOMNode|null,
};

export class FreestylerChatUi extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-freestyler-chat-ui`;
  readonly #shadow = this.attachShadow({mode: 'open'});
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

  #handleSubmit = (ev: SubmitEvent): void => {
    ev.preventDefault();
    const input = this.#shadow.querySelector('.chat-input') as HTMLInputElement;
    if (!input) {
      return;
    }

    this.#props.onTextSubmit(input.value);
    input.value = '';
  };

  #renderRateButtons(rpcId: number): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <div class="rate-buttons">
        <${Buttons.Button.Button.litTagName}
          .data=${{
            variant: Buttons.Button.Variant.ICON,
            size: Buttons.Button.Size.SMALL,
            iconName: 'thumb-up',
            active: false,
            title: i18nString(TempUIStrings.thumbsUp),
            jslogContext: 'thumbs-up',
          } as Buttons.Button.ButtonData}
          @click=${() => this.#props.onRateClick(rpcId, Rating.POSITIVE)}
        ></${Buttons.Button.Button.litTagName}>
        <${Buttons.Button.Button.litTagName}
          .data=${{
            variant: Buttons.Button.Variant.ICON,
            size: Buttons.Button.Size.SMALL,
            iconName: 'thumb-down',
            active: false,
            title: i18nString(TempUIStrings.thumbsDown),
            jslogContext: 'thumbs-down',
          } as Buttons.Button.ButtonData}
          @click=${() => this.#props.onRateClick(rpcId, Rating.NEGATIVE)}
        ></${Buttons.Button.Button.litTagName}>
      </div>`;
    // clang-format on
  }

  #renderStep(step: StepData): LitHtml.TemplateResult {
    if (step.step === Step.ACTION) {
      return LitHtml.html`
        <div class="action-result">
          <${MarkdownView.CodeBlock.CodeBlock.litTagName} .code=${step.code.trim()} .codeLang="js" .displayToolbar=${
          false}></${MarkdownView.CodeBlock.CodeBlock.litTagName}>
          <div class="js-code-output">${step.output}</div>
        </div>
      `;
    }

    if (step.step === Step.ERROR) {
      return LitHtml.html`<p class="error-step">${step.text}</p>`;
    }

    return LitHtml.html`<p>${step.text}</p>`;
  }

  #renderChatMessage = (message: ChatMessage): LitHtml.TemplateResult => {
    if (message.entity === ChatMessageEntity.USER) {
      return LitHtml.html`<div class="chat-message query">${message.text}</div>`;
    }

    const {steps} = message;
    // clang-format off
    return LitHtml.html`
      <div class="chat-message answer">
        ${steps.map(step => LitHtml.html`${this.#renderStep(step)}${step.rpcId !== undefined ? this.#renderRateButtons(step.rpcId): LitHtml.nothing}`)}
      </div>
    `;
    // clang-format on
  };

  #renderSelectAnElement = (): LitHtml.TemplateResult => {
    // clang-format off
    return LitHtml.html`
      <${Buttons.Button.Button.litTagName} .data=${{
        variant: Buttons.Button.Variant.ICON_TOGGLE,
        size: Buttons.Button.Size.SMALL,
        iconName: 'select-element',
        toggledIconName: 'select-element',
        toggleType: Buttons.Button.ToggleType.PRIMARY,
        toggled: this.#props.inspectElementToggled,
        title: i18nString(TempUIStrings.sendButtonTitle),
      } as Buttons.Button.ButtonData} @click=${this.#props.onInspectElementClick}></${Buttons.Button.Button.litTagName}>
      <span class="select-an-element-text">${i18nString(TempUIStrings.selectAnElement)}</span>
    `;
    // clang-format on
  };

  #renderMessages = (): LitHtml.TemplateResult => {
    const isLoading = this.#props.state === State.CHAT_VIEW_LOADING;
    // clang-format off
    return LitHtml.html`
      <div class="messages-container">
        ${this.#props.messages.map(message => this.#renderChatMessage(message))}
        ${isLoading ? 'Loading' : ''}
      </div>
    `;
    // clang-format on
  };

  #renderEmptyState = (): LitHtml.TemplateResult => {
    // clang-format off
    return LitHtml.html`<div class="empty-state-container">
      <${IconButton.Icon.Icon.litTagName} name="spark" style="width: 36px; height: 36px;"></${IconButton.Icon.Icon.litTagName}>
      ${i18nString(TempUIStrings.emptyStateText)}
    </div>`;
    // clang-format on
  };

  #renderChatUi = (): LitHtml.TemplateResult => {
    // TODO(ergunsh): Show a better UI for the states where Aida client is not available.
    const isAidaAvailable = this.#props.aidaAvailability === Host.AidaClient.AidaAvailability.AVAILABLE;
    const isTextInputDisabled = !Boolean(this.#props.selectedNode) || !isAidaAvailable;
    // clang-format off
    return LitHtml.html`
      <div class="chat-ui">
        ${this.#props.messages.length > 0 ? this.#renderMessages() : this.#renderEmptyState()}
        <form class="input-form" @submit=${this.#handleSubmit}>
          <div class="dom-node-link-container">
            ${this.#props.selectedNode ? LitHtml.Directives.until(Common.Linkifier.Linkifier.linkify(this.#props.selectedNode)) : this.#renderSelectAnElement()}
          </div>
          <div class="chat-input-container">
            <input type="text" class="chat-input" .disabled=${isTextInputDisabled}
              placeholder=${getInputPlaceholderString(this.#props.aidaAvailability)}>
            <${Buttons.Button.Button.litTagName}
              class="step-actions"
              type="submit"
              title=${i18nString(TempUIStrings.sendButtonTitle)}
              aria-label=${i18nString(TempUIStrings.sendButtonTitle)}
              jslog=${VisualLogging.action('send').track({click: true})}
              .data=${{
                variant: Buttons.Button.Variant.ICON,
                size: Buttons.Button.Size.SMALL,
                iconName: 'send',
                title: i18nString(TempUIStrings.sendButtonTitle),
              } as Buttons.Button.ButtonData}
            ></${Buttons.Button.Button.litTagName}>
          </div>
          <span class="chat-input-disclaimer">${i18nString(TempUIStrings.inputDisclaimer)}</span>
        </form>
      </div>
    `;
    // clang-format on
  };

  #render(): void {
    switch (this.#props.state) {
      case State.CHAT_VIEW:
      case State.CHAT_VIEW_LOADING:
        LitHtml.render(this.#renderChatUi(), this.#shadow, {host: this});
        break;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-freestyler-chat-ui': FreestylerChatUi;
  }
}

customElements.define('devtools-freestyler-chat-ui', FreestylerChatUi);
