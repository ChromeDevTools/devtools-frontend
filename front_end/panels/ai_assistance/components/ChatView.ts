// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/spinners/spinners.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type {MarkdownLitRenderer} from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../../ui/lit/lit.js';
import {PatchWidget} from '../PatchWidget.js';

import {ChatInput} from './ChatInput.js';
import {ChatMessage, ChatMessageEntity, type Message, type ModelChatMessage} from './ChatMessage.js';
import chatViewStyles from './chatView.css.js';
import {ExportForAgentsDialog} from './ExportForAgentsDialog.js';

export {ChatInput, type ImageInputData} from './ChatInput.js';

const {
  ref,
  repeat,
  classMap,
} = Directives;
const {widget} = UI.Widget;

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

/**
 * Determines which message should display the CSS change summary.
 *
 * If the AI is actively loading a new response, the summary is anchored to the
 * last completed model response. Otherwise, it's anchored to the latest model
 * message.
 */
export function getCSSChangeSummaryMessage(messages: Message[], isLoading: boolean): Message|undefined {
  const modelMessages = messages.filter(m => m.entity === ChatMessageEntity.MODEL);
  const lastModelMessage = modelMessages.at(-1);

  if (!lastModelMessage) {
    return undefined;
  }

  // If we are loading and the last message in the list is the one being loaded,
  // we anchor the summary to the previous model message.
  // If the last message is NOT a model message (e.g. it's the user's follow-up),
  // we keep the summary on the current last model message until the new response
  // starts appearing.
  if (isLoading && messages.at(-1) === lastModelMessage) {
    return modelMessages.at(-2);
  }

  return lastModelMessage;
}

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
  onContextRemoved: (() => void)|null;
  onContextAdd: (() => void)|null;
  conversationMarkdown: string;
  onExportConversation: (() => void)|null;
  changeManager: AiAssistanceModel.ChangeManager.ChangeManager;
  inspectElementToggled: boolean;
  messages: Message[];
  context: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null;
  isContextSelected: boolean;
  canShowFeedbackForm: boolean;
  isLoading: boolean;
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
  generateConversationSummary: (markdown: string) => Promise<string>;
  walkthrough: {
    onOpen: (message: ModelChatMessage) => void,
    onToggle: (isOpen: boolean, message: ModelChatMessage) => void,
    isExpanded: boolean,
    isInlined: boolean,
    activeSidebarMessage: ModelChatMessage|null,
    inlineExpandedMessages: ModelChatMessage[],
  };
}

export interface ChatWidgetInput extends Props {
  handleScroll: (ev: Event) => void;
  handleSuggestionClick: (title: string) => void;
  handleMessageContainerRef: (el: Element|undefined) => void;
  exportForAgentsClick: () => void;
}

const DEFAULT_VIEW: View = (input, output, target) => {
  const hasAiV2 = Boolean(Root.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled);

  const chatUiClasses = classMap({
    'chat-ui': true,
    gemini: AiAssistanceModel.AiUtils.isGeminiBranding(),
    'ai-v2': hasAiV2,
  });

  const inputWidgetClasses = classMap({
    'chat-input-widget': true,
    sticky: !input.isReadOnly,
  });

  const shouldShowPatchWidget = !hasAiV2 && !input.isLoading;

  const cssChangeSummaryMessage = getCSSChangeSummaryMessage(input.messages, input.isLoading);

  // clang-format off
    render(html`
      <style>${chatViewStyles}</style>
      <div class=${chatUiClasses}>
        <main @scroll=${input.handleScroll} ${ref(element => { output.mainElement = element as HTMLElement; } )}>
          ${input.messages.length > 0 ? html`
            <div class="messages-container" ${ref(input.handleMessageContainerRef)}>
              ${repeat(input.messages, message =>
                widget(ChatMessage, {
                  message,
                  isLoading: input.isLoading && input.messages.at(-1) === message,
                  isReadOnly: input.isReadOnly,
                  canShowFeedbackForm: input.canShowFeedbackForm,
                  markdownRenderer: input.markdownRenderer,
                  isLastMessage: input.messages.at(-1) === message,
                  isFirstMessage: input.messages.at(0) === message,
                  shouldShowCSSChangeSummary: message === cssChangeSummaryMessage,
                  onSuggestionClick: input.handleSuggestionClick,
                  onFeedbackSubmit: input.onFeedbackSubmit,
                  onCopyResponseClick: input.onCopyResponseClick,
                  onExportClick: input.exportForAgentsClick,
                  changeSummary: input.changeSummary,
                  walkthrough: {
                    ...input.walkthrough,
                  }
                })
              )}
              ${shouldShowPatchWidget ? widget(PatchWidget, {
                changeSummary: input.changeSummary ?? '',
                changeManager: input.changeManager,
              }) : nothing}
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
                    <h1 class='greeting'>Hello</h1>
                    <p class='cta'>${lockedString(UIStringsNotTranslate.emptyStateTextGemini)}</p>
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
          <devtools-widget class=${inputWidgetClasses} ${widget(ChatInput, {
            isLoading: input.isLoading,
            blockedByCrossOrigin: input.blockedByCrossOrigin,
            isTextInputDisabled: input.isTextInputDisabled,
            inputPlaceholder: input.inputPlaceholder,
            disclaimerText: input.disclaimerText,
            context: input.context,
            isContextSelected: input.isContextSelected,
            inspectElementToggled: input.inspectElementToggled,
            multimodalInputEnabled: input.multimodalInputEnabled ?? false,
            conversationType: input.conversationType,
            uploadImageInputEnabled: input.uploadImageInputEnabled ?? false,
            isReadOnly: input.isReadOnly,
            onContextClick: input.onContextClick,
            onInspectElementClick: input.onInspectElementClick,
            onTextSubmit: input.onTextSubmit,
            onCancelClick: input.onCancelClick,
            onNewConversation: input.onNewConversation,
            onContextRemoved: input.onContextRemoved,
            onContextAdd: input.onContextAdd,
          })} ${ref(element => { output.input = element as UI.Widget.WidgetElement<ChatInput>; } )}></devtools-widget>
        </main>
      </div>
    `, target);
  // clang-format on
};

/**
 * ChatView is a web component for historical reasons and generally should not
 * exist because it barely has any presenter logic and it is definitely not
 * re-usable as a custom element. Instead, the template from ChatView should be
 * embdedded into the AiAssistancePanel (the sole host of chat interfaces) and
 * the scroll handling logic should be implemented in view functions using refs
 * or re-usable custom elements. Currently, the ChatView just combines the
 * interfaces of ChatMessage and ChatInput presenters and passes most of the
 * properties down to those presenters as-is.
 *
 * @deprecated
 */
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
  #cachedSummary: {markdown: string, summary: string}|null = null;

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

  setInputValue(text: string): void {
    this.#output.input?.getWidget()?.setInputValue(text);
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

  async #getSummary(): Promise<string> {
    const cacheKey = this.#props.conversationMarkdown.replace(/\*\*Export Timestamp \(UTC\):\*\* .*\n\n/, '');
    if (this.#cachedSummary?.markdown === cacheKey) {
      return this.#cachedSummary.summary;
    }
    try {
      const summary = await this.#props.generateConversationSummary(this.#props.conversationMarkdown);
      this.#cachedSummary = {markdown: cacheKey, summary};
      return summary;
    } catch (err) {
      console.error(err);
      return 'Failed to generate summary.';
    }
  }

  async #exportForAgentsClick(): Promise<void> {
    const summaryPromise = this.#getSummary();

    void ExportForAgentsDialog.show({
      promptText: summaryPromise,
      markdownText: this.#props.conversationMarkdown,
      onConversationSaveAs: this.#props.onExportConversation ?? (async () => {}),
    });
  }

  #render(): void {
    this.#view(
        {
          ...this.#props,
          handleScroll: this.#handleScroll,
          handleSuggestionClick: this.#handleSuggestionClick,
          handleMessageContainerRef: this.#handleMessageContainerRef,
          exportForAgentsClick: this.#exportForAgentsClick.bind(this),
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
