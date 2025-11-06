// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/spinners/spinners.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as ElementsPanel from '../../../panels/elements/elements.js';
import * as PanelUtils from '../../../panels/utils/utils.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { PatchWidget } from '../PatchWidget.js';
import chatViewStyles from './chatView.css.js';
import { UserActionRow } from './UserActionRow.js';
const { html, Directives: { ifDefined, ref } } = Lit;
const UIStrings = {
    /**
     * @description The footer disclaimer that links to more information about the AI feature.
     */
    learnAbout: 'Learn about AI in DevTools',
    /**
     * @description Label added to the text input to describe the context for screen readers. Not shown visibly on screen.
     */
    inputTextAriaDescription: 'You can also use one of the suggested prompts above to start your conversation',
    /**
     * @description Label added to the button that reveals the selected context item in DevTools
     */
    revealContextDescription: 'Reveal the selected context item in DevTools',
};
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description Title for the send icon button.
     */
    sendButtonTitle: 'Send',
    /**
     * @description Title for the start new chat
     */
    startNewChat: 'Start new chat',
    /**
     * @description Title for the cancel icon button.
     */
    cancelButtonTitle: 'Cancel',
    /**
     * @description Label for the "select an element" button.
     */
    selectAnElement: 'Select an element',
    /**
     * @description Label for the "select an element" button.
     */
    noElementSelected: 'No element selected',
    /**
     * @description Text for the empty state of the AI assistance panel.
     */
    emptyStateText: 'How can I help you?',
    /**
     * @description The error message when the request to the LLM failed for some reason.
     */
    systemError: 'Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue. If this keeps happening, update Chrome to the latest version.',
    /**
     * @description The error message when the LLM gets stuck in a loop (max steps reached).
     */
    maxStepsError: 'Seems like I am stuck with the investigation. It would be better if you start over.',
    /**
     * @description Displayed when the user stop the response
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
     * @description The generic name of the AI agent (do not translate)
     */
    ai: 'AI',
    /**
     * @description The fallback text when we can't find the user full name
     */
    you: 'You',
    /**
     * @description The fallback text when a step has no title yet
     */
    investigating: 'Investigating',
    /**
     * @description Prefix to the title of each thinking step of a user action is required to continue
     */
    paused: 'Paused',
    /**
     * @description Heading text for the code block that shows the executed code.
     */
    codeExecuted: 'Code executed',
    /**
     * @description Heading text for the code block that shows the code to be executed after side effect confirmation.
     */
    codeToExecute: 'Code to execute',
    /**
     * @description Heading text for the code block that shows the returned data.
     */
    dataReturned: 'Data returned',
    /**
     * @description Aria label for the check mark icon to be read by screen reader
     */
    completed: 'Completed',
    /**
     * @description Aria label for the cancel icon to be read by screen reader
     */
    canceled: 'Canceled',
    /**
     * @description Text displayed when the chat input is disabled due to reading past conversation.
     */
    pastConversation: 'You\'re viewing a past conversation.',
    /**
     * @description Title for the take screenshot button.
     */
    takeScreenshotButtonTitle: 'Take screenshot',
    /**
     * @description Title for the remove image input button.
     */
    removeImageInputButtonTitle: 'Remove image input',
    /**
     * @description Alt text for the image input (displayed in the chat messages) that has been sent to the model.
     */
    imageInputSentToTheModel: 'Image input sent to the model',
    /**
     * @description Alt text for the account avatar.
     */
    accountAvatar: 'Account avatar',
    /**
     * @description Title for the x-link which wraps the image input rendered in chat messages.
     */
    openImageInNewTab: 'Open image in a new tab',
    /**
     * @description Alt text for image when it is not available.
     */
    imageUnavailable: 'Image unavailable',
    /**
     * @description Title for the add image button.
     */
    addImageButtonTitle: 'Add image',
};
const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/ChatView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;
const SCROLL_ROUNDING_OFFSET = 1;
const RELEVANT_DATA_LINK_FOOTER_ID = 'relevant-data-link-footer';
const RELEVANT_DATA_LINK_CHAT_ID = 'relevant-data-link-chat';
export class ChatView extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #scrollTop;
    #props;
    #messagesContainerElement;
    #mainElementRef = Lit.Directives.createRef();
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
    clearTextInput() {
        const textArea = this.#shadow.querySelector('.chat-input');
        if (!textArea) {
            return;
        }
        textArea.value = '';
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
    #setInputText(text) {
        const textArea = this.#shadow.querySelector('.chat-input');
        if (!textArea) {
            return;
        }
        textArea.value = text;
        this.#props.onTextInputChange(text);
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
    #handleSubmit = (ev) => {
        ev.preventDefault();
        if (this.#props.imageInput?.isLoading) {
            return;
        }
        const textArea = this.#shadow.querySelector('.chat-input');
        if (!textArea?.value) {
            return;
        }
        const imageInput = !this.#props.imageInput?.isLoading && this.#props.imageInput?.data ?
            { inlineData: { data: this.#props.imageInput.data, mimeType: this.#props.imageInput.mimeType } } :
            undefined;
        void this.#props.onTextSubmit(textArea.value, imageInput, this.#props.imageInput?.inputType);
        textArea.value = '';
    };
    #handleTextAreaKeyDown = (ev) => {
        if (!ev.target || !(ev.target instanceof HTMLTextAreaElement)) {
            return;
        }
        // Go to a new line on Shift+Enter. On Enter, submit unless the
        // user is in IME composition.
        if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
            ev.preventDefault();
            if (!ev.target?.value || this.#props.imageInput?.isLoading) {
                return;
            }
            const imageInput = !this.#props.imageInput?.isLoading && this.#props.imageInput?.data ?
                { inlineData: { data: this.#props.imageInput.data, mimeType: this.#props.imageInput.mimeType } } :
                undefined;
            void this.#props.onTextSubmit(ev.target.value, imageInput, this.#props.imageInput?.inputType);
            ev.target.value = '';
        }
    };
    #handleCancel = (ev) => {
        ev.preventDefault();
        if (!this.#props.isLoading) {
            return;
        }
        this.#props.onCancelClick();
    };
    #handleImageUpload = (ev) => {
        ev.stopPropagation();
        if (this.#props.onLoadImage) {
            const fileSelector = UI.UIUtils.createFileSelectorElement(this.#props.onLoadImage.bind(this), '.jpeg,.jpg,.png');
            fileSelector.click();
        }
    };
    #handleSuggestionClick = (suggestion) => {
        this.#setInputText(suggestion);
        this.focusTextInput();
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
    };
    #render() {
        const renderFooter = () => {
            const classes = Lit.Directives.classMap({
                'chat-view-footer': true,
                'has-conversation': !!this.#props.conversationType,
                'is-read-only': this.#props.isReadOnly,
            });
            // clang-format off
            return html `
        <footer class=${classes} jslog=${VisualLogging.section('footer')}>
          ${renderRelevantDataDisclaimer({
                isLoading: this.#props.isLoading,
                blockedByCrossOrigin: this.#props.blockedByCrossOrigin,
                tooltipId: RELEVANT_DATA_LINK_FOOTER_ID,
                disclaimerText: this.#props.disclaimerText
            })}
        </footer>
      `;
            // clang-format on
        };
        const renderInputOrReadOnlySection = () => {
            if (this.#props.conversationType && this.#props.isReadOnly) {
                return renderReadOnlySection({
                    conversationType: this.#props.conversationType,
                    onNewConversation: this.#props.onNewConversation,
                });
            }
            return renderChatInput({
                isLoading: this.#props.isLoading,
                blockedByCrossOrigin: this.#props.blockedByCrossOrigin,
                isTextInputDisabled: this.#props.isTextInputDisabled,
                inputPlaceholder: this.#props.inputPlaceholder,
                disclaimerText: this.#props.disclaimerText,
                selectedContext: this.#props.selectedContext,
                inspectElementToggled: this.#props.inspectElementToggled,
                multimodalInputEnabled: this.#props.multimodalInputEnabled,
                conversationType: this.#props.conversationType,
                imageInput: this.#props.imageInput,
                aidaAvailability: this.#props.aidaAvailability,
                isTextInputEmpty: this.#props.isTextInputEmpty,
                uploadImageInputEnabled: this.#props.uploadImageInputEnabled,
                onContextClick: this.#props.onContextClick,
                onInspectElementClick: this.#props.onInspectElementClick,
                onSubmit: this.#handleSubmit,
                onTextAreaKeyDown: this.#handleTextAreaKeyDown,
                onCancel: this.#handleCancel,
                onNewConversation: this.#props.onNewConversation,
                onTakeScreenshot: this.#props.onTakeScreenshot,
                onRemoveImageInput: this.#props.onRemoveImageInput,
                onTextInputChange: this.#props.onTextInputChange,
                onImageUpload: this.#handleImageUpload
            });
        };
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
            conversationType: this.#props.conversationType,
            changeSummary: this.#props.changeSummary,
            changeManager: this.#props.changeManager,
            onSuggestionClick: this.#handleSuggestionClick,
            onFeedbackSubmit: this.#props.onFeedbackSubmit,
            onMessageContainerRef: this.#handleMessageContainerRef,
            onCopyResponseClick: this.#props.onCopyResponseClick,
        })}
          ${renderInputOrReadOnlySection()}
        </main>
       ${renderFooter()}
      </div>
    `, this.#shadow, { host: this });
        // clang-format on
    }
}
function renderTextAsMarkdown(text, markdownRenderer, { animate, ref: refFn } = {}) {
    let tokens = [];
    try {
        tokens = Marked.Marked.lexer(text);
        for (const token of tokens) {
            // Try to render all the tokens to make sure that
            // they all have a template defined for them. If there
            // isn't any template defined for a token, we'll fallback
            // to rendering the text as plain text instead of markdown.
            markdownRenderer.renderToken(token);
        }
    }
    catch {
        // The tokens were not parsed correctly or
        // one of the tokens are not supported, so we
        // continue to render this as text.
        return html `${text}`;
    }
    // clang-format off
    return html `<devtools-markdown-view
    .data=${{ tokens, renderer: markdownRenderer, animationEnabled: animate }}
    ${refFn ? ref(refFn) : Lit.nothing}>
  </devtools-markdown-view>`;
    // clang-format on
}
function renderTitle(step) {
    const paused = step.sideEffect ? html `<span class="paused">${lockedString(UIStringsNotTranslate.paused)}: </span>` : Lit.nothing;
    const actionTitle = step.title ?? `${lockedString(UIStringsNotTranslate.investigating)}…`;
    return html `<span class="title">${paused}${actionTitle}</span>`;
}
function renderStepCode(step) {
    if (!step.code && !step.output) {
        return Lit.nothing;
    }
    // If there is no "output" yet, it means we didn't execute the code yet (e.g. maybe it is still waiting for confirmation from the user)
    // thus we show "Code to execute" text rather than "Code executed" text on the heading of the code block.
    const codeHeadingText = (step.output && !step.canceled) ? lockedString(UIStringsNotTranslate.codeExecuted) :
        lockedString(UIStringsNotTranslate.codeToExecute);
    // If there is output, we don't show notice on this code block and instead show
    // it in the data returned code block.
    // clang-format off
    const code = step.code ? html `<div class="action-result">
      <devtools-code-block
        .code=${step.code.trim()}
        .codeLang=${'js'}
        .displayNotice=${!Boolean(step.output)}
        .header=${codeHeadingText}
        .showCopyButton=${true}
      ></devtools-code-block>
  </div>` :
        Lit.nothing;
    const output = step.output ? html `<div class="js-code-output">
    <devtools-code-block
      .code=${step.output}
      .codeLang=${'js'}
      .displayNotice=${true}
      .header=${lockedString(UIStringsNotTranslate.dataReturned)}
      .showCopyButton=${false}
    ></devtools-code-block>
  </div>` :
        Lit.nothing;
    return html `<div class="step-code">${code}${output}</div>`;
    // clang-format on
}
function renderStepDetails({ step, markdownRenderer, isLast, }) {
    const sideEffects = isLast && step.sideEffect ? renderSideEffectConfirmationUi(step) : Lit.nothing;
    const thought = step.thought ? html `<p>${renderTextAsMarkdown(step.thought, markdownRenderer)}</p>` : Lit.nothing;
    // clang-format off
    const contextDetails = step.contextDetails ?
        html `${Lit.Directives.repeat(step.contextDetails, contextDetail => {
            return html `<div class="context-details">
      <devtools-code-block
        .code=${contextDetail.text}
        .codeLang=${contextDetail.codeLang || ''}
        .displayNotice=${false}
        .header=${contextDetail.title}
        .showCopyButton=${true}
      ></devtools-code-block>
    </div>`;
        })}` : Lit.nothing;
    return html `<div class="step-details">
    ${thought}
    ${renderStepCode(step)}
    ${sideEffects}
    ${contextDetails}
  </div>`;
    // clang-format on
}
function renderStepBadge({ step, isLoading, isLast }) {
    if (isLoading && isLast && !step.sideEffect) {
        return html `<devtools-spinner></devtools-spinner>`;
    }
    let iconName = 'checkmark';
    let ariaLabel = lockedString(UIStringsNotTranslate.completed);
    let role = 'button';
    if (isLast && step.sideEffect) {
        role = undefined;
        ariaLabel = undefined;
        iconName = 'pause-circle';
    }
    else if (step.canceled) {
        ariaLabel = lockedString(UIStringsNotTranslate.canceled);
        iconName = 'cross';
    }
    return html `<devtools-icon
      class="indicator"
      role=${ifDefined(role)}
      aria-label=${ifDefined(ariaLabel)}
      .name=${iconName}
    ></devtools-icon>`;
}
function renderStep({ step, isLoading, markdownRenderer, isLast }) {
    const stepClasses = Lit.Directives.classMap({
        step: true,
        empty: !step.thought && !step.code && !step.contextDetails,
        paused: Boolean(step.sideEffect),
        canceled: Boolean(step.canceled),
    });
    // clang-format off
    return html `
    <details class=${stepClasses}
      jslog=${VisualLogging.section('step')}
      .open=${Boolean(step.sideEffect)}>
      <summary>
        <div class="summary">
          ${renderStepBadge({ step, isLoading, isLast })}
          ${renderTitle(step)}
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        </div>
      </summary>
      ${renderStepDetails({ step, markdownRenderer, isLast })}
    </details>`;
    // clang-format on
}
function renderSideEffectConfirmationUi(step) {
    if (!step.sideEffect) {
        return Lit.nothing;
    }
    // clang-format off
    return html `<div
    class="side-effect-confirmation"
    jslog=${VisualLogging.section('side-effect-confirmation')}
  >
    <p>${lockedString(UIStringsNotTranslate.sideEffectConfirmationDescription)}</p>
    <div class="side-effect-buttons-container">
      <devtools-button
        .data=${{
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        jslogContext: 'decline-execute-code',
    }}
        @click=${() => step.sideEffect?.onAnswer(false)}
      >${lockedString(UIStringsNotTranslate.negativeSideEffectConfirmation)}</devtools-button>
      <devtools-button
        .data=${{
        variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
        jslogContext: 'accept-execute-code',
        iconName: 'play',
    }}
        @click=${() => step.sideEffect?.onAnswer(true)}
      >${lockedString(UIStringsNotTranslate.positiveSideEffectConfirmation)}</devtools-button>
    </div>
  </div>`;
    // clang-format on
}
function renderError(message) {
    if (message.error) {
        let errorMessage;
        switch (message.error) {
            case "unknown" /* AiAssistanceModel.AiAgent.ErrorType.UNKNOWN */:
            case "block" /* AiAssistanceModel.AiAgent.ErrorType.BLOCK */:
                errorMessage = UIStringsNotTranslate.systemError;
                break;
            case "max-steps" /* AiAssistanceModel.AiAgent.ErrorType.MAX_STEPS */:
                errorMessage = UIStringsNotTranslate.maxStepsError;
                break;
            case "abort" /* AiAssistanceModel.AiAgent.ErrorType.ABORT */:
                return html `<p class="aborted" jslog=${VisualLogging.section('aborted')}>${lockedString(UIStringsNotTranslate.stoppedResponse)}</p>`;
        }
        return html `<p class="error" jslog=${VisualLogging.section('error')}>${lockedString(errorMessage)}</p>`;
    }
    return Lit.nothing;
}
function renderChatMessage({ message, isLoading, isReadOnly, canShowFeedbackForm, isLast, userInfo, markdownRenderer, onSuggestionClick, onFeedbackSubmit, onCopyResponseClick, }) {
    if (message.entity === "user" /* ChatMessageEntity.USER */) {
        const name = userInfo.accountFullName || lockedString(UIStringsNotTranslate.you);
        const image = userInfo.accountImage ?
            html `<img src="data:image/png;base64, ${userInfo.accountImage}" alt=${UIStringsNotTranslate.accountAvatar} />` :
            html `<devtools-icon
          name="profile"
        ></devtools-icon>`;
        const imageInput = message.imageInput && 'inlineData' in message.imageInput ?
            renderImageChatMessage(message.imageInput.inlineData) :
            Lit.nothing;
        // clang-format off
        return html `<section
      class="chat-message query"
      jslog=${VisualLogging.section('question')}
    >
      <div class="message-info">
        ${image}
        <div class="message-name">
          <h2>${name}</h2>
        </div>
      </div>
      ${imageInput}
      <div class="message-content">${renderTextAsMarkdown(message.text, markdownRenderer)}</div>
    </section>`;
        // clang-format on
    }
    // clang-format off
    return html `
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
      ${Lit.Directives.repeat(message.steps, (_, index) => index, step => {
        return renderStep({
            step,
            isLoading,
            markdownRenderer,
            isLast: [...message.steps.values()].at(-1) === step && isLast,
        });
    })}
      ${message.answer
        ? html `<p>${renderTextAsMarkdown(message.answer, markdownRenderer, { animate: !isReadOnly && isLoading && isLast })}</p>`
        : Lit.nothing}
      ${renderError(message)}
      ${isLast && isLoading
        ? Lit.nothing
        : html `<devtools-widget class="actions" .widgetConfig=${UI.Widget.widgetConfig(UserActionRow, {
            showRateButtons: message.rpcId !== undefined,
            onFeedbackSubmit: (rating, feedback) => {
                if (!message.rpcId) {
                    return;
                }
                onFeedbackSubmit(message.rpcId, rating, feedback);
            },
            suggestions: (isLast && !isReadOnly) ? message.suggestions : undefined,
            onSuggestionClick,
            onCopyResponseClick: () => onCopyResponseClick(message),
            canShowFeedbackForm,
        })}></devtools-widget>`}
    </section>
  `;
    // clang-format on
}
function renderImageChatMessage(inlineData) {
    if (inlineData.data === AiAssistanceModel.AiHistoryStorage.NOT_FOUND_IMAGE_DATA) {
        // clang-format off
        return html `<div class="unavailable-image" title=${UIStringsNotTranslate.imageUnavailable}>
      <devtools-icon name='file-image'></devtools-icon>
    </div>`;
        // clang-format on
    }
    const imageUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
    // clang-format off
    return html `<x-link
      class="image-link" title=${UIStringsNotTranslate.openImageInNewTab}
      href=${imageUrl}
    >
      <img src=${imageUrl} alt=${UIStringsNotTranslate.imageInputSentToTheModel} />
    </x-link>`;
    // clang-format on
}
function renderContextIcon(context) {
    if (!context) {
        return Lit.nothing;
    }
    const item = context.getItem();
    // FIXME: move this to presenter once PanelUtils are declarative. The instance
    // checking should be in the presenter and the rendering in the view function.
    if (item instanceof SDK.NetworkRequest.NetworkRequest) {
        return PanelUtils.PanelUtils.getIconForNetworkRequest(item);
    }
    if (item instanceof Workspace.UISourceCode.UISourceCode) {
        return PanelUtils.PanelUtils.getIconForSourceFile(item);
    }
    if (item instanceof AiAssistanceModel.AIContext.AgentFocus) {
        return html `<devtools-icon name="performance" title="Performance"></devtools-icon>`;
    }
    if (item instanceof SDK.DOMModel.DOMNode) {
        return Lit.nothing;
    }
    return Lit.nothing;
}
function renderContextTitle(context, disabled) {
    const item = context.getItem();
    if (item instanceof SDK.DOMModel.DOMNode) {
        // FIXME: move this to the model code.
        const hiddenClassList = item.classNames().filter(className => className.startsWith(AiAssistanceModel.Injected.AI_ASSISTANCE_CSS_CLASS_NAME));
        return html `<devtools-widget .widgetConfig=${UI.Widget.widgetConfig(ElementsPanel.DOMLinkifier.DOMNodeLink, {
            node: item,
            options: { hiddenClassList, disabled }
        })}></devtools-widget>`;
    }
    return context.getTitle();
}
function renderSelection({ selectedContext, inspectElementToggled, conversationType, isTextInputDisabled, onContextClick, onInspectElementClick, }) {
    if (!conversationType) {
        return Lit.nothing;
    }
    // TODO: currently the picker behavior is SDKNode specific.
    const hasPickerBehavior = conversationType === "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */;
    const resourceClass = Lit.Directives.classMap({
        'not-selected': !selectedContext,
        'resource-link': true,
        'has-picker-behavior': hasPickerBehavior,
        disabled: isTextInputDisabled,
    });
    if (!selectedContext && !hasPickerBehavior) {
        return Lit.nothing;
    }
    const handleKeyDown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            void onContextClick();
        }
    };
    // clang-format off
    return html `<div class="select-element">
    ${hasPickerBehavior ? html `
        <devtools-button
          .data=${{
        variant: "icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'select-element',
        toggledIconName: 'select-element',
        toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
        toggled: inspectElementToggled,
        title: lockedString(UIStringsNotTranslate.selectAnElement),
        jslogContext: 'select-element',
        disabled: isTextInputDisabled,
    }}
          @click=${onInspectElementClick}
        ></devtools-button>
      ` : Lit.nothing}
    <div
      role=button
      class=${resourceClass}
      tabindex=${(hasPickerBehavior || isTextInputDisabled) ? '-1' : '0'}
      @click=${onContextClick}
      @keydown=${handleKeyDown}
      aria-description=${i18nString(UIStrings.revealContextDescription)}
    >
      ${renderContextIcon(selectedContext)}
      <span class="title">${selectedContext ? renderContextTitle(selectedContext, isTextInputDisabled) : lockedString(UIStringsNotTranslate.noElementSelected)}</span>
    </div>
  </div>`;
    // clang-format on
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
      ${messages.map((message, _, array) => renderChatMessage({
        message,
        isLoading,
        isReadOnly,
        canShowFeedbackForm,
        isLast: array.at(-1) === message,
        userInfo,
        markdownRenderer,
        onSuggestionClick,
        onFeedbackSubmit,
        onCopyResponseClick,
    }))}
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
function renderReadOnlySection({ onNewConversation, conversationType }) {
    if (!conversationType) {
        return Lit.nothing;
    }
    // clang-format off
    return html `<div
    class="chat-readonly-container"
    jslog=${VisualLogging.section('read-only')}
  >
    <span>${lockedString(UIStringsNotTranslate.pastConversation)}</span>
    <devtools-button
      aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
      class="chat-inline-button"
      @click=${onNewConversation}
      .data=${{
        variant: "text" /* Buttons.Button.Variant.TEXT */,
        title: lockedString(UIStringsNotTranslate.startNewChat),
        jslogContext: 'start-new-chat',
    }}
    >${lockedString(UIStringsNotTranslate.startNewChat)}</devtools-button>
  </div>`;
    // clang-format on
}
function renderChatInputButtons({ isLoading, blockedByCrossOrigin, isTextInputDisabled, isTextInputEmpty, imageInput, onCancel, onNewConversation }) {
    if (isLoading) {
        // clang-format off
        return html `<devtools-button
      class="chat-input-button"
      aria-label=${lockedString(UIStringsNotTranslate.cancelButtonTitle)}
      @click=${onCancel}
      .data=${{
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
            iconName: 'record-stop',
            title: lockedString(UIStringsNotTranslate.cancelButtonTitle),
            jslogContext: 'stop',
        }}
    ></devtools-button>`;
        // clang-format on
    }
    if (blockedByCrossOrigin) {
        // clang-format off
        return html `
      <devtools-button
        class="start-new-chat-button"
        aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
        @click=${onNewConversation}
        .data=${{
            variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
            size: "SMALL" /* Buttons.Button.Size.SMALL */,
            title: lockedString(UIStringsNotTranslate.startNewChat),
            jslogContext: 'start-new-chat',
        }}
      >${lockedString(UIStringsNotTranslate.startNewChat)}</devtools-button>
    `;
        // clang-format on
    }
    // clang-format off
    return html `<devtools-button
    class="chat-input-button"
    aria-label=${lockedString(UIStringsNotTranslate.sendButtonTitle)}
    .data=${{
        type: 'submit',
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
        disabled: isTextInputDisabled || isTextInputEmpty || imageInput?.isLoading,
        iconName: 'send',
        title: lockedString(UIStringsNotTranslate.sendButtonTitle),
        jslogContext: 'send',
    }}
  ></devtools-button>`;
}
function renderMultimodalInputButtons({ multimodalInputEnabled, blockedByCrossOrigin, isTextInputDisabled, imageInput, uploadImageInputEnabled, onTakeScreenshot, onImageUpload, }) {
    if (!multimodalInputEnabled || blockedByCrossOrigin) {
        return Lit.nothing;
    }
    // clang-format off
    const addImageButton = uploadImageInputEnabled ? html `<devtools-button
    class="chat-input-button"
    aria-label=${lockedString(UIStringsNotTranslate.addImageButtonTitle)}
    @click=${onImageUpload}
    .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
        disabled: isTextInputDisabled || imageInput?.isLoading,
        iconName: 'add-photo',
        title: lockedString(UIStringsNotTranslate.addImageButtonTitle),
        jslogContext: 'upload-image',
    }}
  ></devtools-button>` : Lit.nothing;
    return html `${addImageButton}<devtools-button
    class="chat-input-button"
    aria-label=${lockedString(UIStringsNotTranslate.takeScreenshotButtonTitle)}
    @click=${onTakeScreenshot}
    .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
        disabled: isTextInputDisabled || imageInput?.isLoading,
        iconName: 'photo-camera',
        title: lockedString(UIStringsNotTranslate.takeScreenshotButtonTitle),
        jslogContext: 'take-screenshot',
    }}
  ></devtools-button>`;
    // clang-format on
}
function renderImageInput({ multimodalInputEnabled, imageInput, isTextInputDisabled, onRemoveImageInput, }) {
    if (!multimodalInputEnabled || !imageInput || isTextInputDisabled) {
        return Lit.nothing;
    }
    // clang-format off
    const crossButton = html `<devtools-button
      aria-label=${lockedString(UIStringsNotTranslate.removeImageInputButtonTitle)}
      @click=${onRemoveImageInput}
      .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "MICRO" /* Buttons.Button.Size.MICRO */,
        iconName: 'cross',
        title: lockedString(UIStringsNotTranslate.removeImageInputButtonTitle),
    }}
    ></devtools-button>`;
    // clang-format on
    if (imageInput.isLoading) {
        // clang-format off
        return html `<div class="image-input-container">
        ${crossButton}
        <div class="loading">
          <devtools-spinner></devtools-spinner>
        </div>
      </div>`;
        // clang-format on
    }
    // clang-format off
    return html `
    <div class="image-input-container">
      ${crossButton}
      <img src="data:${imageInput.mimeType};base64, ${imageInput.data}" alt="Image input" />
    </div>`;
    // clang-format on
}
function renderRelevantDataDisclaimer({ isLoading, blockedByCrossOrigin, tooltipId, disclaimerText }) {
    const classes = Lit.Directives.classMap({ 'chat-input-disclaimer': true, 'hide-divider': !isLoading && blockedByCrossOrigin });
    // clang-format off
    return html `
    <p class=${classes}>
      <button
        class="link"
        role="link"
        aria-details=${tooltipId}
        jslog=${VisualLogging.link('open-ai-settings').track({
        click: true,
    })}
        @click=${() => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    }}
      >${lockedString('Relevant data')}</button>&nbsp;${lockedString('is sent to Google')}
      ${renderDisclamerTooltip(tooltipId, disclaimerText)}
    </p>
  `;
    // clang-format on
}
function renderChatInput({ isLoading, blockedByCrossOrigin, isTextInputDisabled, inputPlaceholder, selectedContext, inspectElementToggled, multimodalInputEnabled, conversationType, imageInput, isTextInputEmpty, uploadImageInputEnabled, aidaAvailability, disclaimerText, onContextClick, onInspectElementClick, onSubmit, onTextAreaKeyDown, onCancel, onNewConversation, onTakeScreenshot, onRemoveImageInput, onTextInputChange, onImageUpload, }) {
    if (!conversationType) {
        return Lit.nothing;
    }
    const shouldShowMultiLine = aidaAvailability === "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */ && selectedContext;
    const chatInputContainerCls = Lit.Directives.classMap({
        'chat-input-container': true,
        'single-line-layout': !shouldShowMultiLine,
        disabled: isTextInputDisabled,
    });
    // clang-format off
    return html `
  <form class="input-form" @submit=${onSubmit}>
    <div class=${chatInputContainerCls}>
      ${renderImageInput({ multimodalInputEnabled, imageInput, isTextInputDisabled, onRemoveImageInput })}
      <textarea class="chat-input"
        .disabled=${isTextInputDisabled}
        wrap="hard"
        maxlength="10000"
        @keydown=${onTextAreaKeyDown}
        @input=${(event) => onTextInputChange(event.target.value)}
        placeholder=${inputPlaceholder}
        jslog=${VisualLogging.textField('query').track({ change: true, keydown: 'Enter' })}
        aria-description=${i18nString(UIStrings.inputTextAriaDescription)}
      ></textarea>
      <div class="chat-input-actions">
        <div class="chat-input-actions-left">
          ${shouldShowMultiLine ? renderSelection({
        selectedContext,
        inspectElementToggled,
        conversationType,
        isTextInputDisabled,
        onContextClick,
        onInspectElementClick,
    }) : Lit.nothing}
        </div>
        <div class="chat-input-actions-right">
          <div class="chat-input-disclaimer-container">
            ${renderRelevantDataDisclaimer({ isLoading, blockedByCrossOrigin, tooltipId: RELEVANT_DATA_LINK_CHAT_ID, disclaimerText })}
          </div>
          ${renderMultimodalInputButtons({
        multimodalInputEnabled, blockedByCrossOrigin, isTextInputDisabled, imageInput, uploadImageInputEnabled, onTakeScreenshot, onImageUpload
    })}
          ${renderChatInputButtons({
        isLoading, blockedByCrossOrigin, isTextInputDisabled, isTextInputEmpty, imageInput, onCancel, onNewConversation
    })}
        </div>
      </div>
    </div>
  </form>`;
    // clang-format on
}
function renderMainContents({ messages, isLoading, isReadOnly, canShowFeedbackForm, isTextInputDisabled, suggestions, userInfo, markdownRenderer, conversationType, changeSummary, changeManager, onSuggestionClick, onFeedbackSubmit, onCopyResponseClick, onMessageContainerRef, }) {
    if (!conversationType) {
        return Lit.nothing;
    }
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
function renderDisclamerTooltip(id, disclaimerText) {
    // clang-format off
    return html `
    <devtools-tooltip
      id=${id}
      variant="rich"
    >
      <div class="info-tooltip-container">
        ${disclaimerText}
        <button
          class="link tooltip-link"
          role="link"
          jslog=${VisualLogging.link('open-ai-settings').track({
        click: true,
    })}
          @click=${() => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    }}>${i18nString(UIStrings.learnAbout)}
        </button>
      </div>
    </devtools-tooltip>`;
    // clang-format on
}
customElements.define('devtools-ai-chat-view', ChatView);
//# sourceMappingURL=ChatView.js.map