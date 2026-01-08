// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/spinners/spinners.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import { PatchWidget } from '../PatchWidget.js';
import { ChatInput } from './ChatInput.js';
import { ChatMessage } from './ChatMessage.js';
import chatViewStyles from './chatView.css.js';
export { ChatInput } from './ChatInput.js';
const { html, Directives: { ref, repeat, createRef } } = Lit;
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description Text for the empty state of the AI assistance panel.
     */
    emptyStateText: 'How can I help you?',
};
const lockedString = i18n.i18n.lockedString;
const SCROLL_ROUNDING_OFFSET = 1;
export class ChatView extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #scrollTop;
    #props;
    #messagesContainerElement;
    #mainElementRef = createRef();
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
    #inputRef = createRef();
    constructor(props) {
        super();
        this.#props = props;
    }
    set props(props) {
        this.#props = props;
        this.#render();
    }
    connectedCallback() {
        this.#render();
        if (this.#messagesContainerElement) {
            this.#messagesContainerResizeObserver.observe(this.#messagesContainerElement);
        }
    }
    disconnectedCallback() {
        this.#messagesContainerResizeObserver.disconnect();
    }
    focusTextInput() {
        const textArea = this.#shadow.querySelector('.chat-input');
        if (!textArea) {
            return;
        }
        textArea.focus();
    }
    restoreScrollPosition() {
        if (this.#scrollTop === undefined) {
            return;
        }
        if (!this.#mainElementRef?.value) {
            return;
        }
        this.#setMainElementScrollTop(this.#scrollTop);
    }
    scrollToBottom() {
        if (!this.#mainElementRef?.value) {
            return;
        }
        this.#setMainElementScrollTop(this.#mainElementRef.value.scrollHeight);
    }
    #handleMessagesContainerResize() {
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
    #setMainElementScrollTop(scrollTop) {
        if (!this.#mainElementRef?.value) {
            return;
        }
        this.#scrollTop = scrollTop;
        this.#isProgrammaticScroll = true;
        this.#mainElementRef.value.scrollTop = scrollTop;
    }
    #handleMessageContainerRef(el) {
        this.#messagesContainerElement = el;
        if (el) {
            this.#messagesContainerResizeObserver.observe(el);
        }
        else {
            this.#pinScrollToBottom = true;
            this.#messagesContainerResizeObserver.disconnect();
        }
    }
    #handleScroll = (ev) => {
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
    #handleSuggestionClick = (suggestion) => {
        this.#inputRef.value?.getWidget()?.setInputValue(suggestion);
        this.#render();
        this.focusTextInput();
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
    };
    #render() {
        const inputWidgetClasses = Lit.Directives.classMap({
            'chat-input-widget': true,
            sticky: !this.#props.isReadOnly,
        });
        // clang-format off
        Lit.render(html `
      <style>${chatViewStyles}</style>
      <div class="chat-ui">
        <main @scroll=${this.#handleScroll} ${ref(this.#mainElementRef)}>
          ${renderMainContents({
            messages: this.#props.messages,
            isLoading: this.#props.isLoading,
            isReadOnly: this.#props.isReadOnly,
            canShowFeedbackForm: this.#props.canShowFeedbackForm,
            isTextInputDisabled: this.#props.isTextInputDisabled,
            suggestions: this.#props.emptyStateSuggestions,
            userInfo: this.#props.userInfo,
            markdownRenderer: this.#props.markdownRenderer,
            changeSummary: this.#props.changeSummary,
            changeManager: this.#props.changeManager,
            onSuggestionClick: this.#handleSuggestionClick,
            onFeedbackSubmit: this.#props.onFeedbackSubmit,
            onMessageContainerRef: this.#handleMessageContainerRef,
            onCopyResponseClick: this.#props.onCopyResponseClick,
        })}
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
            onTextSubmit: (text, imageInput, multimodalInputType) => {
                this.#props.onTextSubmit(text, imageInput, multimodalInputType);
                this.#render();
            },
            onCancelClick: this.#props.onCancelClick,
            onNewConversation: this.#props.onNewConversation,
        })} ${ref(this.#inputRef)}></devtools-widget>
        </main>
      </div>
    `, this.#shadow, { host: this });
        // clang-format on
    }
}
function renderMainContents({ messages, isLoading, isReadOnly, canShowFeedbackForm, isTextInputDisabled, suggestions, userInfo, markdownRenderer, changeSummary, changeManager, onSuggestionClick, onFeedbackSubmit, onCopyResponseClick, onMessageContainerRef, }) {
    if (messages.length > 0) {
        return renderMessages({
            messages,
            isLoading,
            isReadOnly,
            canShowFeedbackForm,
            userInfo,
            markdownRenderer,
            changeSummary,
            changeManager,
            onSuggestionClick,
            onFeedbackSubmit,
            onMessageContainerRef,
            onCopyResponseClick
        });
    }
    return renderEmptyState({ isTextInputDisabled, suggestions, onSuggestionClick });
}
function renderMessages({ messages, isLoading, isReadOnly, canShowFeedbackForm, userInfo, markdownRenderer, changeSummary, changeManager, onSuggestionClick, onFeedbackSubmit, onCopyResponseClick, onMessageContainerRef, }) {
    function renderPatchWidget() {
        if (isLoading) {
            return Lit.nothing;
        }
        // clang-format off
        return html `<devtools-widget
      .widgetConfig=${UI.Widget.widgetConfig(PatchWidget, {
            changeSummary: changeSummary ?? '',
            changeManager,
        })}
    ></devtools-widget>`;
        // clang-format on
    }
    // clang-format off
    return html `
    <div class="messages-container" ${ref(onMessageContainerRef)}>
      ${repeat(messages, message => html `<devtools-widget .widgetConfig=${UI.Widget.widgetConfig(ChatMessage, {
        message,
        isLoading,
        isReadOnly,
        canShowFeedbackForm,
        userInfo,
        markdownRenderer,
        isLastMessage: messages.at(-1) === message,
        onSuggestionClick,
        onFeedbackSubmit,
        onCopyResponseClick,
    })}></devtools-widget>`)}
      ${renderPatchWidget()}
    </div>
  `;
    // clang-format on
}
function renderEmptyState({ isTextInputDisabled, suggestions, onSuggestionClick }) {
    // clang-format off
    return html `<div class="empty-state-container">
    <div class="header">
      <div class="icon">
        <devtools-icon
          name="smart-assistant"
        ></devtools-icon>
      </div>
      <h1>${lockedString(UIStringsNotTranslate.emptyStateText)}</h1>
    </div>
    <div class="empty-state-content">
      ${suggestions.map(({ title, jslogContext }) => {
        return html `<devtools-button
          class="suggestion"
          @click=${() => onSuggestionClick(title)}
          .data=${{
            variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
            size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
            title,
            jslogContext: jslogContext ?? 'suggestion',
            disabled: isTextInputDisabled,
        }}
        >${title}</devtools-button>`;
    })}
    </div>
  </div>`;
    // clang-format on
}
customElements.define('devtools-ai-chat-view', ChatView);
//# sourceMappingURL=ChatView.js.map