// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/spinners/spinners.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../../ui/lit/lit.js';
import { PatchWidget } from '../PatchWidget.js';
import { ChatInput } from './ChatInput.js';
import { ChatMessage } from './ChatMessage.js';
import chatViewStyles from './chatView.css.js';
export { ChatInput } from './ChatInput.js';
const { ref, repeat, classMap } = Directives;
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
};
const lockedString = i18n.i18n.lockedString;
const SCROLL_ROUNDING_OFFSET = 1;
const DEFAULT_VIEW = (input, output, target) => {
    const chatUiClasses = classMap({
        'chat-ui': true,
        gemini: AiAssistanceModel.AiUtils.isGeminiBranding(),
    });
    const inputWidgetClasses = classMap({
        'chat-input-widget': true,
        sticky: !input.isReadOnly,
    });
    // clang-format off
    render(html `
      <style>${chatViewStyles}</style>
      <div class=${chatUiClasses}>
        <main @scroll=${input.handleScroll} ${ref(element => { output.mainElement = element; })}>
          ${input.messages.length > 0 ? html `
            <div class="messages-container" ${ref(input.handleMessageContainerRef)}>
              ${repeat(input.messages, message => html `<devtools-widget .widgetConfig=${UI.Widget.widgetConfig(ChatMessage, {
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
    })}></devtools-widget>`)}
              ${input.isLoading ? nothing : html `<devtools-widget
                .widgetConfig=${UI.Widget.widgetConfig(PatchWidget, {
        changeSummary: input.changeSummary ?? '',
        changeManager: input.changeManager,
    })}
              ></devtools-widget>`}
            </div>
          ` : html `
            <div class="empty-state-container">
              <div class="header">
                <div class="icon">
                  <devtools-icon
                    name="smart-assistant"
                  ></devtools-icon>
                </div>
                ${AiAssistanceModel.AiUtils.isGeminiBranding() ?
        html `
                    <h1 class='greeting'>Hello${input.accountGivenName ? `, ${input.accountGivenName}` : ''}</h1>
                    <p class='cta'>${lockedString(UIStringsNotTranslate.emptyStateTextGemini)}</p>
                  ` : html `<h1>${lockedString(UIStringsNotTranslate.emptyStateText)}</h1>`}
              </div>
              <div class="empty-state-content">
                ${input.emptyStateSuggestions.map(({ title, jslogContext }) => {
        return html `<devtools-button
                    class="suggestion"
                    @click=${() => input.handleSuggestionClick(title)}
                    .data=${{
            variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
            size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
            title,
            jslogContext: jslogContext ?? 'suggestion',
            disabled: input.isTextInputDisabled,
        }}
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
    })} ${ref(element => { output.input = element; })}></devtools-widget>
        </main>
      </div>
    `, target);
    // clang-format on
};
export class ChatView extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #scrollTop;
    #props;
    #messagesContainerElement;
    #output = {};
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
    #view;
    constructor(props, view = DEFAULT_VIEW) {
        super();
        this.#props = props;
        this.#view = view;
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
        if (!this.#output.mainElement) {
            return;
        }
        this.#setMainElementScrollTop(this.#scrollTop);
    }
    scrollToBottom() {
        if (!this.#output.mainElement) {
            return;
        }
        this.#setMainElementScrollTop(this.#output.mainElement.scrollHeight);
    }
    #handleMessagesContainerResize() {
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
    #setMainElementScrollTop(scrollTop) {
        if (!this.#output.mainElement) {
            return;
        }
        this.#scrollTop = scrollTop;
        this.#isProgrammaticScroll = true;
        this.#output.mainElement.scrollTop = scrollTop;
    }
    #handleMessageContainerRef = (el) => {
        this.#messagesContainerElement = el;
        if (el) {
            this.#messagesContainerResizeObserver.observe(el);
        }
        else {
            this.#pinScrollToBottom = true;
            this.#messagesContainerResizeObserver.disconnect();
        }
    };
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
        this.#output.input?.getWidget()?.setInputValue(suggestion);
        this.#render();
        this.focusTextInput();
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
    };
    #render() {
        this.#view({
            ...this.#props,
            accountGivenName: this.#props.userInfo.accountGivenName ?? '',
            handleScroll: this.#handleScroll,
            handleSuggestionClick: this.#handleSuggestionClick,
            handleMessageContainerRef: this.#handleMessageContainerRef,
        }, this.#output, this.#shadow);
    }
}
customElements.define('devtools-ai-chat-view', ChatView);
//# sourceMappingURL=ChatView.js.map