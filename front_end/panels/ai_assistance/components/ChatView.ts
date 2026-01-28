// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/spinners/spinners.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type {MarkdownLitRenderer} from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../../ui/lit/lit.js';
import {PatchWidget} from '../PatchWidget.js';

import {ChatInput} from './ChatInput.js';
import {ChatMessage, type Message, type ModelChatMessage} from './ChatMessage.js';
import chatViewStyles from './chatView.css.js';

export {ChatInput, type ImageInputData} from './ChatInput.js';

const {ref, repeat, classMap} = Directives;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   * @description Text for the empty state of the AI assistance panel.
   */
  emptyStateText: 'How can I help you?',
  /**
   * @description Text for the empty state of the Gemini panel.
   */
  emptyStateTextGemini: 'Where should we start?',
} as const;

const lockedString = i18n.i18n.lockedString;

const SCROLL_ROUNDING_OFFSET = 1;

interface ViewOutput {
  mainElement?: HTMLElement;
  input?: UI.Widget.WidgetElement<ChatInput>;
}
type View = (input: ChatWidgetInput, output: ViewOutput, target: HTMLElement|ShadowRoot) => void;

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
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountGivenName'>;
  conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType;
  isReadOnly: boolean;
  blockedByCrossOrigin: boolean;
  changeSummary?: string;
  multimodalInputEnabled?: boolean;
  isTextInputDisabled: boolean;
  emptyStateSuggestions: AiAssistanceModel.AiAgent.ConversationSuggestion[];
  inputPlaceholder: Platform.UIString.LocalizedString;
  disclaimerText: Platform.UIString.LocalizedString;
  uploadImageInputEnabled?: boolean;
  markdownRenderer: MarkdownLitRenderer;
  additionalFloatyContext: UI.Floaty.FloatyContextSelection[];
}

interface ChatWidgetInput extends Props {
  accountGivenName: string;
  handleScroll: (ev: Event) => void;
  handleSuggestionClick: (title: string) => void;
  handleMessageContainerRef: (el: Element|undefined) => void;
}

const DEFAULT_VIEW: View = (input, output, target) => {
  const chatUiClasses = classMap({
    'chat-ui': true,
    gemini: AiAssistanceModel.AiUtils.isGeminiBranding(),
  });

  const inputWidgetClasses = classMap({
    'chat-input-widget': true,
    sticky: !input.isReadOnly,
  });

  // clang-format off
    render(html`
      <style>${chatViewStyles}</style>
      <div class=${chatUiClasses}>
        <main @scroll=${input.handleScroll} ${ref(element => { output.mainElement = element as HTMLElement; } )}>
          ${input.messages.length > 0 ? html`
            <div class="messages-container" ${ref(input.handleMessageContainerRef)}>
              ${repeat(input.messages, message =>
                html`<devtools-widget .widgetConfig=${UI.Widget.widgetConfig(ChatMessage, {
                  message,
                  isLoading: input.isLoading,
                  isReadOnly: input.isReadOnly,
                  canShowFeedbackForm: input.canShowFeedbackForm,
                  userInfo: input.userInfo,
                  markdownRenderer: input.markdownRenderer,
                  isLastMessage: input.messages.at(-1) === message,
                  onSuggestionClick: input.handleSuggestionClick,
                  onFeedbackSubmit: input.onFeedbackSubmit,
                  onCopyResponseClick: input.onCopyResponseClick,
                })}></devtools-widget>`
              )}
              ${input.isLoading ? nothing : html`<devtools-widget
                .widgetConfig=${UI.Widget.widgetConfig(PatchWidget, {
                  changeSummary: input.changeSummary ?? '',
                  changeManager: input.changeManager,
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
                ${AiAssistanceModel.AiUtils.isGeminiBranding() ?
                  html`
                    <h1 class='greeting'>Hello${input.accountGivenName ? `, ${input.accountGivenName}` : ''}</h1>
                    <h1>${lockedString(UIStringsNotTranslate.emptyStateTextGemini)}</h1>
                  ` : html`<h1>${lockedString(UIStringsNotTranslate.emptyStateText)}</h1>`
                }
              </div>
              <div class="empty-state-content">
                ${input.emptyStateSuggestions.map(({title, jslogContext}) => {
                  return html`<devtools-button
                    class="suggestion"
                    @click=${() => input.handleSuggestionClick(title)}
                    .data=${
                      {
                        variant: Buttons.Button.Variant.OUTLINED,
                        size: Buttons.Button.Size.REGULAR,
                        title,
                        jslogContext: jslogContext ?? 'suggestion',
                        disabled: input.isTextInputDisabled,
                      } as Buttons.Button.ButtonData
                    }
                  >${title}</devtools-button>`;
                })}
              </div>
            </div>
          `}
          <devtools-widget class=${inputWidgetClasses} .widgetConfig=${UI.Widget.widgetConfig(ChatInput, {
            isLoading: input.isLoading,
            blockedByCrossOrigin: input.blockedByCrossOrigin,
            isTextInputDisabled: input.isTextInputDisabled,
            inputPlaceholder: input.inputPlaceholder,
            disclaimerText: input.disclaimerText,
            selectedContext: input.selectedContext,
            inspectElementToggled: input.inspectElementToggled,
            multimodalInputEnabled: input.multimodalInputEnabled ?? false,
            conversationType: input.conversationType,
            uploadImageInputEnabled: input.uploadImageInputEnabled ?? false,
            isReadOnly: input.isReadOnly,
            additionalFloatyContext: input.additionalFloatyContext,
            onContextClick: input.onContextClick,
            onInspectElementClick: input.onInspectElementClick,
            onTextSubmit: input.onTextSubmit,
            onCancelClick: input.onCancelClick,
            onNewConversation: input.onNewConversation,
          })} ${ref(element => { output.input = element as UI.Widget.WidgetElement<ChatInput>; } )}></devtools-widget>
        </main>
      </div>
    `, target);
  // clang-format on
};
export class ChatView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #scrollTop?: number;
  #props: Props;
  #messagesContainerElement?: Element;
  #output: ViewOutput = {};
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
  #view: View;

  constructor(props: Props, view = DEFAULT_VIEW) {
    super();
    this.#props = props;
    this.#view = view;
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

    if (!this.#output.mainElement) {
      return;
    }

    this.#setMainElementScrollTop(this.#scrollTop);
  }

  scrollToBottom(): void {
    if (!this.#output.mainElement) {
      return;
    }

    this.#setMainElementScrollTop(this.#output.mainElement.scrollHeight);
  }

  #handleMessagesContainerResize(): void {
    if (!this.#pinScrollToBottom) {
      return;
    }

    if (!this.#output.mainElement) {
      return;
    }

    if (this.#pinScrollToBottom) {
      this.#setMainElementScrollTop(this.#output.mainElement.scrollHeight);
    }
  }

  #setMainElementScrollTop(scrollTop: number): void {
    if (!this.#output.mainElement) {
      return;
    }

    this.#scrollTop = scrollTop;
    this.#isProgrammaticScroll = true;
    this.#output.mainElement.scrollTop = scrollTop;
  }

  #handleMessageContainerRef = (el: Element|undefined): void => {
    this.#messagesContainerElement = el;

    if (el) {
      this.#messagesContainerResizeObserver.observe(el);
    } else {
      this.#pinScrollToBottom = true;
      this.#messagesContainerResizeObserver.disconnect();
    }
  };

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
    this.#output.input?.getWidget()?.setInputValue(suggestion);
    this.#render();
    this.focusTextInput();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
  };

  #render(): void {
    this.#view(
        {
          ...this.#props,
          accountGivenName: this.#props.userInfo.accountGivenName ?? '',
          handleScroll: this.#handleScroll,
          handleSuggestionClick: this.#handleSuggestionClick,
          handleMessageContainerRef: this.#handleMessageContainerRef,
        },
        this.#output, this.#shadow);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-ai-chat-view': ChatView;
  }
}

customElements.define('devtools-ai-chat-view', ChatView);
