// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import freestylerChatUiStyles from './freestylerChatUi.css.js';

const UIStrings = {
  /**
   *@description Placeholder text for the chat UI input.
   */
  inputPlaceholder: 'Ask Freestyler or type / for commands',
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
};
const str_ = i18n.i18n.registerUIStrings('panels/freestyler/components/FreestylerChatUi.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export enum ChatMessageEntity {
  MODEL = 'model',
  USER = 'user',
}

export type ChatMessage = {
  entity: ChatMessageEntity,
  text: string,
};

export const enum State {
  CHAT_VIEW = 'chat-view',
  CHAT_VIEW_LOADING = 'chat-view-loading',
}

export type Props = {
  onTextSubmit: (text: string) => void,
  onAcceptPrivacyNotice: () => void,
  onInspectElementClick: () => void,
  inspectElementToggled: boolean,
  state: State,
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

  #handleSubmit = (ev: SubmitEvent): void => {
    ev.preventDefault();
    const input = this.#shadow.querySelector('.chat-input') as HTMLInputElement;
    if (!input) {
      return;
    }

    this.#props.onTextSubmit(input.value);
    input.value = '';
  };

  #renderChatMessage = (content: string, entity: ChatMessageEntity): LitHtml.TemplateResult => {
    const classes = LitHtml.Directives.classMap({
      'chat-message': true,
      'query': entity === ChatMessageEntity.USER,
      'answer': entity === ChatMessageEntity.MODEL,
    });
    return LitHtml.html`
      <div class=${classes}>
        ${content}
      </div>
    `;
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
        title: i18nString(UIStrings.sendButtonTitle),
      } as Buttons.Button.ButtonData} @click=${this.#props.onInspectElementClick}></${Buttons.Button.Button.litTagName}>
      <span class="select-an-element-text">${i18nString(UIStrings.selectAnElement)}</span>
    `;
    // clang-format on
  };

  #renderMessages = (): LitHtml.TemplateResult => {
    const isLoading = this.#props.state === State.CHAT_VIEW_LOADING;
    // clang-format off
    return LitHtml.html`
      <div class="messages-container">
        ${this.#props.messages.map(message => this.#renderChatMessage(message.text, message.entity))}
        ${isLoading ? 'Loading' : ''}
      </div>
    `;
    // clang-format on
  };

  #renderEmptyState = (): LitHtml.TemplateResult => {
    // clang-format off
    return LitHtml.html`<div class="empty-state-container">
      <${IconButton.Icon.Icon.litTagName} name="spark" style="width: 36px; height: 36px;"></${IconButton.Icon.Icon.litTagName}>
      ${i18nString(UIStrings.emptyStateText)}
    </div>`;
    // clang-format on
  };

  #renderChatUi = (): LitHtml.TemplateResult => {
    // clang-format off
    return LitHtml.html`
      <div class="chat-ui">
        ${this.#props.messages.length > 0 ? this.#renderMessages() : this.#renderEmptyState()}
        <form class="input-form" @submit=${this.#handleSubmit}>
          <div class="dom-node-link-container">
            ${this.#props.selectedNode ? LitHtml.Directives.until(Common.Linkifier.Linkifier.linkify(this.#props.selectedNode)) : this.#renderSelectAnElement()}
          </div>
          <div class="chat-input-container">
            <input type="text" class="chat-input" .disabled=${!this.#props.selectedNode} autofocus
              placeholder=${i18nString(UIStrings.inputPlaceholder)}>
            <${Buttons.Button.Button.litTagName}
              class="step-actions"
              type="submit"
              title=${i18nString(UIStrings.sendButtonTitle)}
              aria-label=${i18nString(UIStrings.sendButtonTitle)}
              jslog=${VisualLogging.action('send').track({click: true})}
              .data=${{
                variant: Buttons.Button.Variant.ICON,
                size: Buttons.Button.Size.SMALL,
                iconName: 'send',
                title: i18nString(UIStrings.sendButtonTitle),
              } as Buttons.Button.ButtonData}
            ></${Buttons.Button.Button.litTagName}>
          </div>
          <span class="chat-input-disclaimer">${i18nString(UIStrings.inputDisclaimer)}</span>
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
