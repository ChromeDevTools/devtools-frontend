// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../../ui/components/spinners/spinners.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type {MarkdownLitRenderer} from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import {PatchWidget} from '../PatchWidget.js';

import {ChatInput} from './ChatInput.js';
import {ChatMessage, type Message, type ModelChatMessage} from './ChatMessage.js';
import chatViewStyles from './chatView.css.js';

export {ChatInput, type ImageInputData} from './ChatInput.js';

const {html, Directives: {ref, repeat, createRef}} = Lit;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   * @description Text for the empty state of the AI assistance panel.
   */
  emptyStateText: 'How can I help you?',
} as const;

const lockedString = i18n.i18n.lockedString;

const SCROLL_ROUNDING_OFFSET = 1;

export interface Props {
  onTextSubmit:
      (text: string, imageInput?: Host.AidaClient.Part,
       multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType) => void;
  onInspectElementClick: () => void;
  onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
  onCancelClick: () => void;
  onContextClick: () => void;
  onNewConversation: () => void;
  onCopyResponseClick: (message: ModelChatMessage) => void;
  changeManager: AiAssistanceModel.ChangeManager.ChangeManager;
  inspectElementToggled: boolean;
  messages: Message[];
  selectedContext: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null;
  isLoading: boolean;
  canShowFeedbackForm: boolean;
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>;
  conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType;
  isReadOnly: boolean;
  blockedByCrossOrigin: boolean;
  changeSummary?: string;
  multimodalInputEnabled?: boolean;
  isTextInputDisabled: boolean;
  emptyStateSuggestions: AiAssistanceModel.AiAgent.ConversationSuggestion[];
  inputPlaceholder: Platform.UIString.LocalizedString;
  disclaimerText: Platform.UIString.LocalizedString;
  isArtifactsSidebarOpen: boolean;
  uploadImageInputEnabled?: boolean;
  markdownRenderer: MarkdownLitRenderer;
  additionalFloatyContext: UI.Floaty.FloatyContextSelection[];
}

export class ChatView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #scrollTop?: number;
  #props: Props;
  #messagesContainerElement?: Element;
  #mainElementRef = createRef<HTMLElement>();
  #messagesContainerResizeObserver = new ResizeObserver(() => this.#handleMessagesContainerResize());
  /**
   * Indicates whether the chat scroll position should be pinned to the bottom.
   *
   * This is true when:
   *   - The scroll is at the very bottom, allowing new messages to push the scroll down automatically.
   *   - The panel is initially rendered and the user hasn't scrolled yet.
   *
   * It is set to false when the user scrolls up to view previous messages.
   */
  #pinScrollToBottom = true;
  /**
   * Indicates whether the scroll event originated from code
   * or a user action. When set to `true`, `handleScroll` will ignore the event,
   * allowing it to only handle user-driven scrolls and correctly decide
   * whether to pin the content to the bottom.
   */
  #isProgrammaticScroll = false;
  #inputRef = createRef<UI.Widget.WidgetElement<ChatInput>>();

  constructor(props: Props) {
    super();
    this.#props = props;
  }

  set props(props: Props) {
    this.#props = props;
    this.#render();
  }

  connectedCallback(): void {
    this.#render();

    if (this.#messagesContainerElement) {
      this.#messagesContainerResizeObserver.observe(this.#messagesContainerElement);
    }
  }

  disconnectedCallback(): void {
    this.#messagesContainerResizeObserver.disconnect();
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

    if (!this.#mainElementRef?.value) {
      return;
    }

    this.#setMainElementScrollTop(this.#scrollTop);
  }

  scrollToBottom(): void {
    if (!this.#mainElementRef?.value) {
      return;
    }

    this.#setMainElementScrollTop(this.#mainElementRef.value.scrollHeight);
  }

  #handleMessagesContainerResize(): void {
    if (!this.#pinScrollToBottom) {
      return;
    }

    if (!this.#mainElementRef?.value) {
      return;
    }

    if (this.#pinScrollToBottom) {
      this.#setMainElementScrollTop(this.#mainElementRef.value.scrollHeight);
    }
  }

  #setMainElementScrollTop(scrollTop: number): void {
    if (!this.#mainElementRef?.value) {
      return;
    }

    this.#scrollTop = scrollTop;
    this.#isProgrammaticScroll = true;
    this.#mainElementRef.value.scrollTop = scrollTop;
  }

  #handleMessageContainerRef(el: Element|undefined): void {
    this.#messagesContainerElement = el;

    if (el) {
      this.#messagesContainerResizeObserver.observe(el);
    } else {
      this.#pinScrollToBottom = true;
      this.#messagesContainerResizeObserver.disconnect();
    }
  }

  #handleScroll = (ev: Event): void => {
    if (!ev.target || !(ev.target instanceof HTMLElement)) {
      return;
    }

    // Do not handle scroll events caused by programmatically
    // updating the scroll position. We want to know whether user
    // did scroll the container from the user interface.
    if (this.#isProgrammaticScroll) {
      this.#isProgrammaticScroll = false;
      return;
    }

    this.#scrollTop = ev.target.scrollTop;
    this.#pinScrollToBottom =
        ev.target.scrollTop + ev.target.clientHeight + SCROLL_ROUNDING_OFFSET > ev.target.scrollHeight;
  };

  #handleSuggestionClick = (suggestion: string): void => {
    this.#inputRef.value?.getWidget()?.setInputValue(suggestion);
    this.#render();
    this.focusTextInput();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
  };

  #render(): void {
    const inputWidgetClasses = Lit.Directives.classMap({
      'chat-input-widget': true,
      sticky: !this.#props.isReadOnly,
    });

    // clang-format off
    Lit.render(html`
      <style>${chatViewStyles}</style>
      <div class="chat-ui">
        <main @scroll=${this.#handleScroll} ${ref(this.#mainElementRef)}>
          ${this.#props.messages.length > 0 ? html`
            <div class="messages-container" ${ref(this.#handleMessageContainerRef)}>
              ${repeat(this.#props.messages, message =>
                html`<devtools-widget .widgetConfig=${UI.Widget.widgetConfig(ChatMessage, {
                  message,
                  isLoading: this.#props.isLoading,
                  isReadOnly: this.#props.isReadOnly,
                  canShowFeedbackForm: this.#props.canShowFeedbackForm,
                  userInfo: this.#props.userInfo,
                  markdownRenderer: this.#props.markdownRenderer,
                  isLastMessage: this.#props.messages.at(-1) === message,
                  onSuggestionClick: this.#handleSuggestionClick,
                  onFeedbackSubmit: this.#props.onFeedbackSubmit,
                  onCopyResponseClick: this.#props.onCopyResponseClick,
                })}></devtools-widget>`
              )}
              ${this.#props.isLoading ? Lit.nothing : html`<devtools-widget
                .widgetConfig=${UI.Widget.widgetConfig(PatchWidget, {
                  changeSummary: this.#props.changeSummary ?? '',
                  changeManager: this.#props.changeManager,
                })}
              ></devtools-widget>`}
            </div>
          ` : html`
            <div class="empty-state-container">
              <div class="header">
                <div class="icon">
                  <devtools-icon
                    name="smart-assistant"
                  ></devtools-icon>
                </div>
                <h1>${lockedString(UIStringsNotTranslate.emptyStateText)}</h1>
              </div>
              <div class="empty-state-content">
                ${this.#props.emptyStateSuggestions.map(({title, jslogContext}) => {
                  return html`<devtools-button
                    class="suggestion"
                    @click=${() => this.#handleSuggestionClick(title)}
                    .data=${
                      {
                        variant: Buttons.Button.Variant.OUTLINED,
                        size: Buttons.Button.Size.REGULAR,
                        title,
                        jslogContext: jslogContext ?? 'suggestion',
                        disabled: this.#props.isTextInputDisabled,
                      } as Buttons.Button.ButtonData
                    }
                  >${title}</devtools-button>`;
                })}
              </div>
            </div>
          `}
          <devtools-widget class=${inputWidgetClasses} .widgetConfig=${UI.Widget.widgetConfig(ChatInput, {
            isLoading: this.#props.isLoading,
            blockedByCrossOrigin: this.#props.blockedByCrossOrigin,
            isTextInputDisabled: this.#props.isTextInputDisabled,
            inputPlaceholder: this.#props.inputPlaceholder,
            disclaimerText: this.#props.disclaimerText,
            selectedContext: this.#props.selectedContext,
            inspectElementToggled: this.#props.inspectElementToggled,
            multimodalInputEnabled: this.#props.multimodalInputEnabled ?? false,
            conversationType: this.#props.conversationType,
            uploadImageInputEnabled: this.#props.uploadImageInputEnabled ?? false,
            isReadOnly: this.#props.isReadOnly,
            additionalFloatyContext: this.#props.additionalFloatyContext,
            onContextClick: this.#props.onContextClick,
            onInspectElementClick: this.#props.onInspectElementClick,
            onTextSubmit: (
                text: string, imageInput?: Host.AidaClient.Part,
                multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType) => {
              this.#props.onTextSubmit(text, imageInput, multimodalInputType);
              this.#render();
            },
            onCancelClick: this.#props.onCancelClick,
            onNewConversation: this.#props.onNewConversation,
          })} ${ref(this.#inputRef)}></devtools-widget>
        </main>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-ai-chat-view': ChatView;
  }
}

customElements.define('devtools-ai-chat-view', ChatView);
