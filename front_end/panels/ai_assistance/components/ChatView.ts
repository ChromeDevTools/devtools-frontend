// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/spinners/spinners.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import {PatchWidget} from '../PatchWidget.js';

import chatViewStyles from './chatView.css.js';
import {MarkdownRendererWithCodeBlock} from './MarkdownRendererWithCodeBlock.js';
import {UserActionRow} from './UserActionRow.js';

const {html, Directives: {ifDefined, ref}} = Lit;

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
   * @description Text for a link to Chrome DevTools Settings.
   */
  settingsLink: 'AI assistance in Settings',
  /**
   * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   * @example {AI assistance in Settings} PH1
   */
  turnOnForStyles: 'Turn on {PH1} to get help with understanding CSS styles',
  /**
   * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   * @example {AI assistance in Settings} PH1
   */
  turnOnForStylesAndRequests: 'Turn on {PH1} to get help with styles and network requests',
  /**
   * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   * @example {AI assistance in Settings} PH1
   */
  turnOnForStylesRequestsAndFiles: 'Turn on {PH1} to get help with styles, network requests, and files',
  /**
   * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   * @example {AI assistance in Settings} PH1
   */
  turnOnForStylesRequestsPerformanceAndFiles:
      'Turn on {PH1} to get help with styles, network requests, performance, and files',
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: 'Learn about AI in DevTools',
  /**
   * @description Text informing the user that AI assistance is not available in Incognito mode or Guest mode.
   */
  notAvailableInIncognitoMode: 'AI assistance is not available in Incognito mode or Guest mode',

  /**
   * @description Label added to the text input to describe the context for screen readers. Not shown visibly on screen.
   */
  inputTextAriaDescription: 'You can also use one of the suggested prompts above to start your conversation',
  /**
   * @description Label added to the button that reveals the selected context item in DevTools
   */
  revealContextDescription: 'Reveal the selected context item in DevTools',
} as const;

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
  systemError:
      'Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue. If this keeps happening, update Chrome to the latest version.',
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
  /**
   * @description Disclaimer text right after the chat input.
   */
  inputDisclaimerForEmptyState: 'This is an experimental AI feature and won\'t always get it right.',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/ChatView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

const SCROLL_ROUNDING_OFFSET = 1;
const TOOLTIP_POPOVER_OFFSET = 4;
const RELEVANT_DATA_LINK_ID = 'relevant-data-link';

export interface Step {
  isLoading: boolean;
  thought?: string;
  title?: string;
  code?: string;
  output?: string;
  canceled?: boolean;
  sideEffect?: ConfirmSideEffectDialog;
  contextDetails?: [AiAssistanceModel.ContextDetail, ...AiAssistanceModel.ContextDetail[]];
}

interface ConfirmSideEffectDialog {
  onAnswer: (result: boolean) => void;
}

export const enum ChatMessageEntity {
  MODEL = 'model',
  USER = 'user',
}

export type ImageInputData = {
  isLoading: true,
}|{
  isLoading: false,
  data: string,
  mimeType: string,
  inputType: AiAssistanceModel.MultimodalInputType,
};

export interface UserChatMessage {
  entity: ChatMessageEntity.USER;
  text: string;
  imageInput?: Host.AidaClient.Part;
}
export interface ModelChatMessage {
  entity: ChatMessageEntity.MODEL;
  steps: Step[];
  suggestions?: [string, ...string[]];
  answer?: string;
  error?: AiAssistanceModel.ErrorType;
  rpcId?: Host.AidaClient.RpcGlobalId;
}

export type ChatMessage = UserChatMessage|ModelChatMessage;

export const enum State {
  CONSENT_VIEW = 'consent-view',
  CHAT_VIEW = 'chat-view',
  EXPLORE_VIEW = 'explore-view'
}

export interface Props {
  onTextSubmit:
      (text: string, imageInput?: Host.AidaClient.Part,
       multimodalInputType?: AiAssistanceModel.MultimodalInputType) => void;
  onInspectElementClick: () => void;
  onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
  onCancelClick: () => void;
  onContextClick: () => void;
  onNewConversation: () => void;
  onCopyResponseClick: (message: ModelChatMessage) => void;
  onTakeScreenshot?: () => void;
  onRemoveImageInput?: () => void;
  onTextInputChange: (input: string) => void;
  onLoadImage?: (file: File) => Promise<void>;
  changeManager: AiAssistanceModel.ChangeManager;
  inspectElementToggled: boolean;
  state: State;
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  messages: ChatMessage[];
  selectedContext: AiAssistanceModel.ConversationContext<unknown>|null;
  isLoading: boolean;
  canShowFeedbackForm: boolean;
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>;
  conversationType?: AiAssistanceModel.ConversationType;
  isReadOnly: boolean;
  blockedByCrossOrigin: boolean;
  changeSummary?: string;
  multimodalInputEnabled?: boolean;
  imageInput?: ImageInputData;
  isTextInputDisabled: boolean;
  emptyStateSuggestions: AiAssistanceModel.ConversationSuggestion[];
  inputPlaceholder: Platform.UIString.LocalizedString;
  disclaimerText: Platform.UIString.LocalizedString;
  isTextInputEmpty: boolean;
  uploadImageInputEnabled?: boolean;
}

export class ChatView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #markdownRenderer = new MarkdownRendererWithCodeBlock();
  #scrollTop?: number;
  #props: Props;
  #messagesContainerElement?: Element;
  #mainElementRef?: Lit.Directives.Ref<Element> = Lit.Directives.createRef();
  #messagesContainerResizeObserver = new ResizeObserver(() => this.#handleMessagesContainerResize());
  #popoverHelper: UI.PopoverHelper.PopoverHelper|null = null;
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

  constructor(props: Props) {
    super();
    this.#props = props;
  }

  set props(props: Props) {
    this.#markdownRenderer = new MarkdownRendererWithCodeBlock();
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

  clearTextInput(): void {
    const textArea = this.#shadow.querySelector('.chat-input') as HTMLTextAreaElement;
    if (!textArea) {
      return;
    }
    textArea.value = '';
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

  #handleChatUiRef(el: Element|undefined): void {
    if (!el || this.#popoverHelper) {
      return;
    }

    // TODO: Update here when b/409965560 is fixed.
    this.#popoverHelper = new UI.PopoverHelper.PopoverHelper((el as HTMLElement), event => {
      const popoverShownNode =
          event.target instanceof HTMLElement && event.target.id === RELEVANT_DATA_LINK_ID ? event.target : null;
      if (!popoverShownNode) {
        return null;
      }

      // We move the glass pane to be a bit lower so
      // that it does not disappear when moving the cursor
      // over to link.
      const nodeBox = popoverShownNode.boxInWindow();
      nodeBox.y = nodeBox.y + TOOLTIP_POPOVER_OFFSET;
      return {
        box: nodeBox,
        show: async (popover: UI.GlassPane.GlassPane) => {
          // clang-format off
          Lit.render(html`
            <style>
              .info-tooltip-container {
                max-width: var(--sys-size-28);
                padding: var(--sys-size-4) var(--sys-size-5);

                .tooltip-link {
                  display: block;
                  margin-top: var(--sys-size-4);
                  color: var(--sys-color-primary);
                  padding-left: 0;
                }
              }
            </style>
            <div class="info-tooltip-container">
              ${this.#props.disclaimerText}
              <button
                class="link tooltip-link"
                role="link"
                jslog=${VisualLogging.link('open-ai-settings').track({
                  click: true,
                })}
                @click=${() => {
                  void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
                }}
              >${i18nString(UIStrings.learnAbout)}</button>
            </div>`, popover.contentElement, {host: this});
          // clang-format on
          return true;
        },
      };
    });
    this.#popoverHelper.setTimeout(0);
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

  #setInputText(text: string): void {
    const textArea = this.#shadow.querySelector('.chat-input') as HTMLTextAreaElement;
    if (!textArea) {
      return;
    }

    textArea.value = text;
    this.#props.onTextInputChange(text);
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

  #handleSubmit = (ev: SubmitEvent): void => {
    ev.preventDefault();
    if (this.#props.imageInput?.isLoading) {
      return;
    }

    const textArea = this.#shadow.querySelector('.chat-input') as HTMLTextAreaElement;
    if (!textArea?.value) {
      return;
    }
    const imageInput = !this.#props.imageInput?.isLoading && this.#props.imageInput?.data ?
        {inlineData: {data: this.#props.imageInput.data, mimeType: this.#props.imageInput.mimeType}} :
        undefined;
    void this.#props.onTextSubmit(textArea.value, imageInput, this.#props.imageInput?.inputType);
    textArea.value = '';
  };

  #handleTextAreaKeyDown = (ev: KeyboardEvent): void => {
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
          {inlineData: {data: this.#props.imageInput.data, mimeType: this.#props.imageInput.mimeType}} :
          undefined;
      void this.#props.onTextSubmit(ev.target.value, imageInput, this.#props.imageInput?.inputType);
      ev.target.value = '';
    }
  };

  #handleCancel = (ev: SubmitEvent): void => {
    ev.preventDefault();

    if (!this.#props.isLoading) {
      return;
    }

    this.#props.onCancelClick();
  };

  #handleImageUpload = (ev: Event): void => {
    ev.stopPropagation();
    if (this.#props.onLoadImage) {
      const fileSelector = UI.UIUtils.createFileSelectorElement(this.#props.onLoadImage.bind(this), '.jpeg,.jpg,.png');
      fileSelector.click();
    }
  };

  #handleSuggestionClick = (suggestion: string): void => {
    this.#setInputText(suggestion);
    this.focusTextInput();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
  };

  #render(): void {
    const renderFooter = (): Lit.LitTemplate => {
      const classes = Lit.Directives.classMap({
        'chat-view-footer': true,
        'has-conversation': !!this.#props.conversationType,
        'is-read-only': this.#props.isReadOnly,
      });

      // clang-format off
      const footerContents = this.#props.conversationType
        ? renderRelevantDataDisclaimer({
            isLoading: this.#props.isLoading,
            blockedByCrossOrigin: this.#props.blockedByCrossOrigin,
          })
        : html`<p>
            ${lockedString(UIStringsNotTranslate.inputDisclaimerForEmptyState)}
            <button
              class="link"
              role="link"
              jslog=${VisualLogging.link('open-ai-settings').track({
                click: true,
              })}
              @click=${() => {
                void UI.ViewManager.ViewManager.instance().showView(
                  'chrome-ai',
                );
              }}
            >${i18nString(UIStrings.learnAbout)}</button>
          </p>`;

      return html`
        <footer class=${classes} jslog=${VisualLogging.section('footer')}>
          ${footerContents}
        </footer>
      `;
    };
    // clang-format off
    Lit.render(html`
      <style>${chatViewStyles}</style>
      <div class="chat-ui" ${Lit.Directives.ref(this.#handleChatUiRef)}>
        <main @scroll=${this.#handleScroll} ${ref(this.#mainElementRef)}>
          ${renderMainContents({
            state: this.#props.state,
            aidaAvailability: this.#props.aidaAvailability,
            messages: this.#props.messages,
            isLoading: this.#props.isLoading,
            isReadOnly: this.#props.isReadOnly,
            canShowFeedbackForm: this.#props.canShowFeedbackForm,
            isTextInputDisabled: this.#props.isTextInputDisabled,
            suggestions: this.#props.emptyStateSuggestions,
            userInfo: this.#props.userInfo,
            markdownRenderer: this.#markdownRenderer,
            conversationType: this.#props.conversationType,
            changeSummary: this.#props.changeSummary,
            changeManager: this.#props.changeManager,
            onSuggestionClick: this.#handleSuggestionClick,
            onFeedbackSubmit: this.#props.onFeedbackSubmit,
            onMessageContainerRef: this.#handleMessageContainerRef,
            onCopyResponseClick: this.#props.onCopyResponseClick,
          })}
          ${this.#props.isReadOnly
            ? renderReadOnlySection({
                conversationType: this.#props.conversationType,
                onNewConversation: this.#props.onNewConversation,
              })
            : renderChatInput({
                isLoading: this.#props.isLoading,
                blockedByCrossOrigin: this.#props.blockedByCrossOrigin,
                isTextInputDisabled: this.#props.isTextInputDisabled,
                inputPlaceholder: this.#props.inputPlaceholder,
                state: this.#props.state,
                selectedContext: this.#props.selectedContext,
                inspectElementToggled: this.#props.inspectElementToggled,
                multimodalInputEnabled: this.#props.multimodalInputEnabled,
                conversationType: this.#props.conversationType,
                imageInput: this.#props.imageInput,
                isTextInputEmpty: this.#props.isTextInputEmpty,
                aidaAvailability: this.#props.aidaAvailability,
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
                onImageUpload: this.#handleImageUpload,
              })
          }
        </main>
       ${renderFooter()}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

function renderTextAsMarkdown(text: string, markdownRenderer: MarkdownRendererWithCodeBlock, {animate, ref: refFn}: {
  animate?: boolean,
  ref?: (element?: Element) => void,
} = {}): Lit.TemplateResult {
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
  } catch {
    // The tokens were not parsed correctly or
    // one of the tokens are not supported, so we
    // continue to render this as text.
    return html`${text}`;
  }

  // clang-format off
  return html`<devtools-markdown-view
    .data=${{tokens, renderer: markdownRenderer, animationEnabled: animate} as MarkdownView.MarkdownView.MarkdownViewData}
    ${refFn ? ref(refFn) : Lit.nothing}>
  </devtools-markdown-view>`;
  // clang-format on
}

function renderTitle(step: Step): Lit.LitTemplate {
  const paused =
      step.sideEffect ? html`<span class="paused">${lockedString(UIStringsNotTranslate.paused)}: </span>` : Lit.nothing;
  const actionTitle = step.title ?? `${lockedString(UIStringsNotTranslate.investigating)}…`;

  return html`<span class="title">${paused}${actionTitle}</span>`;
}

function renderStepCode(step: Step): Lit.LitTemplate {
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
  const code = step.code ? html`<div class="action-result">
      <devtools-code-block
        .code=${step.code.trim()}
        .codeLang=${'js'}
        .displayNotice=${!Boolean(step.output)}
        .header=${codeHeadingText}
        .showCopyButton=${true}
      ></devtools-code-block>
  </div>` :
                           Lit.nothing;
  const output = step.output ? html`<div class="js-code-output">
    <devtools-code-block
      .code=${step.output}
      .codeLang=${'js'}
      .displayNotice=${true}
      .header=${lockedString(UIStringsNotTranslate.dataReturned)}
      .showCopyButton=${false}
    ></devtools-code-block>
  </div>` :
                               Lit.nothing;

  return html`<div class="step-code">${code}${output}</div>`;
  // clang-format on
}

function renderStepDetails({
  step,
  markdownRenderer,
  isLast,
}: {
  step: Step,
  markdownRenderer: MarkdownRendererWithCodeBlock,
  isLast: boolean,
}): Lit.LitTemplate {
  const sideEffects = isLast && step.sideEffect ? renderSideEffectConfirmationUi(step) : Lit.nothing;
  const thought = step.thought ? html`<p>${renderTextAsMarkdown(step.thought, markdownRenderer)}</p>` : Lit.nothing;

  // clang-format off
  const contextDetails = step.contextDetails ?
  html`${Lit.Directives.repeat(
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
    )}` : Lit.nothing;

  return html`<div class="step-details">
    ${thought}
    ${renderStepCode(step)}
    ${sideEffects}
    ${contextDetails}
  </div>`;
  // clang-format on
}

function renderStepBadge({step, isLoading, isLast}: {
  step: Step,
  isLoading: boolean,
  isLast: boolean,
}): Lit.LitTemplate {
  if (isLoading && isLast && !step.sideEffect) {
    return html`<devtools-spinner></devtools-spinner>`;
  }

  let iconName = 'checkmark';
  let ariaLabel: string|undefined = lockedString(UIStringsNotTranslate.completed);
  let role: 'button'|undefined = 'button';
  if (isLast && step.sideEffect) {
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

function renderStep({step, isLoading, markdownRenderer, isLast}: {
  step: Step,
  isLoading: boolean,
  markdownRenderer: MarkdownRendererWithCodeBlock,
  isLast: boolean,
}): Lit.LitTemplate {
  const stepClasses = Lit.Directives.classMap({
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
          ${renderStepBadge({ step, isLoading, isLast })}
          ${renderTitle(step)}
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        </div>
      </summary>
      ${renderStepDetails({step, markdownRenderer, isLast})}
    </details>`;
  // clang-format on
}

function renderSideEffectConfirmationUi(step: Step): Lit.LitTemplate {
  if (!step.sideEffect) {
    return Lit.nothing;
  }

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
        @click=${() => step.sideEffect?.onAnswer(false)}
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
        @click=${() => step.sideEffect?.onAnswer(true)}
      >${
          lockedString(UIStringsNotTranslate.positiveSideEffectConfirmation)
      }</devtools-button>
    </div>
  </div>`;
  // clang-format on
}

function renderError(message: ModelChatMessage): Lit.LitTemplate {
  if (message.error) {
    let errorMessage;
    switch (message.error) {
      case AiAssistanceModel.ErrorType.UNKNOWN:
      case AiAssistanceModel.ErrorType.BLOCK:
        errorMessage = UIStringsNotTranslate.systemError;
        break;
      case AiAssistanceModel.ErrorType.MAX_STEPS:
        errorMessage = UIStringsNotTranslate.maxStepsError;
        break;
      case AiAssistanceModel.ErrorType.ABORT:
        return html`<p class="aborted" jslog=${VisualLogging.section('aborted')}>${
            lockedString(UIStringsNotTranslate.stoppedResponse)}</p>`;
    }

    return html`<p class="error" jslog=${VisualLogging.section('error')}>${lockedString(errorMessage)}</p>`;
  }

  return Lit.nothing;
}

function renderChatMessage({
  message,
  isLoading,
  isReadOnly,
  canShowFeedbackForm,
  isLast,
  userInfo,
  markdownRenderer,
  onSuggestionClick,
  onFeedbackSubmit,
  onCopyResponseClick,
}: {
  message: ChatMessage,
  isLoading: boolean,
  isReadOnly: boolean,
  canShowFeedbackForm: boolean,
  isLast: boolean,
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>,
  markdownRenderer: MarkdownRendererWithCodeBlock,
  onSuggestionClick: (suggestion: string) => void,
  onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void,
  onCopyResponseClick: (message: ModelChatMessage) => void,
}): Lit.TemplateResult {
  if (message.entity === ChatMessageEntity.USER) {
    const name = userInfo.accountFullName || lockedString(UIStringsNotTranslate.you);
    const image = userInfo.accountImage ?
        html`<img src="data:image/png;base64, ${userInfo.accountImage}" alt=${UIStringsNotTranslate.accountAvatar} />` :
        html`<devtools-icon
          name="profile"
        ></devtools-icon>`;
    const imageInput = message.imageInput && 'inlineData' in message.imageInput ?
        renderImageChatMessage(message.imageInput.inlineData) :
        Lit.nothing;
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
      ${imageInput}
      <div class="message-content">${renderTextAsMarkdown(message.text, markdownRenderer)}</div>
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
      ${Lit.Directives.repeat(
        message.steps,
        (_, index) => index,
        step => {
          return renderStep({
            step,
            isLoading,
            markdownRenderer,
            isLast: [...message.steps.values()].at(-1) === step && isLast,
          });
        },
      )}
      ${message.answer
        ? html`<p>${renderTextAsMarkdown(message.answer, markdownRenderer, { animate: !isReadOnly && isLoading && isLast })}</p>`
        : Lit.nothing}
      ${renderError(message)}
      ${isLast && isLoading
        ? Lit.nothing
        : html`<devtools-widget class="actions" .widgetConfig=${UI.Widget.widgetConfig(UserActionRow, {
            showRateButtons: message.rpcId !== undefined,
            onFeedbackSubmit: (rating: Host.AidaClient.Rating, feedback?: string) => {
              if (!message.rpcId) {
                return;
              }
              onFeedbackSubmit(message.rpcId, rating, feedback);
            },
            suggestions: (isLast && !isReadOnly) ? message.suggestions : undefined,
            onSuggestionClick,
            onCopyResponseClick: () => onCopyResponseClick(message),
            canShowFeedbackForm,
          })}></devtools-widget>`
      }
    </section>
  `;
  // clang-format on
}

function renderImageChatMessage(inlineData: Host.AidaClient.MediaBlob): Lit.LitTemplate {
  if (inlineData.data === AiAssistanceModel.NOT_FOUND_IMAGE_DATA) {
    // clang-format off
    return html`<div class="unavailable-image" title=${UIStringsNotTranslate.imageUnavailable}>
      <devtools-icon name='file-image'></devtools-icon>
    </div>`;
    // clang-format on
  }
  const imageUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
  // clang-format off
    return html`<x-link
      class="image-link" title=${UIStringsNotTranslate.openImageInNewTab}
      href=${imageUrl}
    >
      <img src=${imageUrl} alt=${UIStringsNotTranslate.imageInputSentToTheModel} />
    </x-link>`;
  // clang-format on
}

function renderSelection({
  selectedContext,
  inspectElementToggled,
  conversationType,
  isTextInputDisabled,
  onContextClick,
  onInspectElementClick,
}: {
  selectedContext: AiAssistanceModel.ConversationContext<unknown>|null,
  inspectElementToggled: boolean,
  isTextInputDisabled: boolean,
  onContextClick: () => void | Promise<void>,
  onInspectElementClick: () => void,
  conversationType?: AiAssistanceModel.ConversationType,
}): Lit.LitTemplate {
  if (!conversationType) {
    return Lit.nothing;
  }

  // TODO: currently the picker behavior is SDKNode specific.
  const hasPickerBehavior = conversationType === AiAssistanceModel.ConversationType.STYLING;

  const resourceClass = Lit.Directives.classMap({
    'not-selected': !selectedContext,
    'resource-link': true,
    'has-picker-behavior': hasPickerBehavior,
    disabled: isTextInputDisabled,
  });

  if (!selectedContext && !hasPickerBehavior) {
    return Lit.nothing;
  }

  const handleKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      void onContextClick();
    }
  };

  // clang-format off
  return html`<div class="select-element">
    ${
      hasPickerBehavior ? html`
        <devtools-button
          .data=${{
              variant: Buttons.Button.Variant.ICON_TOGGLE,
              size: Buttons.Button.Size.SMALL,
              iconName: 'select-element',
              toggledIconName: 'select-element',
              toggleType: Buttons.Button.ToggleType.PRIMARY,
              toggled: inspectElementToggled,
              title: lockedString(UIStringsNotTranslate.selectAnElement),
              jslogContext: 'select-element',
              disabled: isTextInputDisabled,
          } as Buttons.Button.ButtonData}
          @click=${onInspectElementClick}
        ></devtools-button>
      ` : Lit.nothing
    }
    <div
      role=button
      class=${resourceClass}
      tabindex=${(hasPickerBehavior || isTextInputDisabled) ? '-1' : '0'}
      @click=${onContextClick}
      @keydown=${handleKeyDown}
      aria-description=${i18nString(UIStrings.revealContextDescription)}
    >
      ${selectedContext?.getIcon() ? html`${selectedContext?.getIcon()}` : Lit.nothing}
      <span class="title">${selectedContext?.getTitle({ disabled: isTextInputDisabled }) ?? lockedString(UIStringsNotTranslate.noElementSelected)}</span>
    </div>
  </div>`;
  // clang-format on
}

function renderMessages({
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
  onCopyResponseClick,
  onMessageContainerRef,
}: {
  messages: ChatMessage[],
  isLoading: boolean,
  isReadOnly: boolean,
  canShowFeedbackForm: boolean,
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>,
  markdownRenderer: MarkdownRendererWithCodeBlock,
  onSuggestionClick: (suggestion: string) => void,
  onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void,
  onCopyResponseClick: (message: ModelChatMessage) => void,
  onMessageContainerRef: (el: Element|undefined) => void,
  changeSummary?: string,
  changeManager?: AiAssistanceModel.ChangeManager,
}): Lit.TemplateResult {
  function renderPatchWidget(): Lit.LitTemplate {
    if (isLoading) {
      return Lit.nothing;
    }

    // clang-format off
    return html`<devtools-widget
      .widgetConfig=${UI.Widget.widgetConfig(PatchWidget, {
        changeSummary: changeSummary ?? '',
        changeManager,
      })}
    ></devtools-widget>`;
    // clang-format on
  }

  // clang-format off
  return html`
    <div class="messages-container" ${ref(onMessageContainerRef)}>
      ${messages.map((message, _, array) =>
        renderChatMessage({
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
        }),
      )}
      ${renderPatchWidget()}
    </div>
  `;
  // clang-format on
}

function renderEmptyState({isTextInputDisabled, suggestions, onSuggestionClick}: {
  isTextInputDisabled: boolean,
  suggestions: AiAssistanceModel.ConversationSuggestion[],
  onSuggestionClick: (suggestion: string) => void,
}): Lit.TemplateResult {
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
      ${suggestions.map(({title, jslogContext}) => {
        return html`<devtools-button
          class="suggestion"
          @click=${() => onSuggestionClick(title)}
          .data=${
            {
              variant: Buttons.Button.Variant.OUTLINED,
              size: Buttons.Button.Size.REGULAR,
              title,
              jslogContext: jslogContext ?? 'suggestion',
              disabled: isTextInputDisabled,
            } as Buttons.Button.ButtonData
          }
        >${title}</devtools-button>`;
      })}
    </div>
  </div>`;
  // clang-format on
}

function renderReadOnlySection({onNewConversation, conversationType}: {
  onNewConversation: () => void,
  conversationType?: AiAssistanceModel.ConversationType,
}): Lit.LitTemplate {
  if (!conversationType) {
    return Lit.nothing;
  }

  // clang-format off
  return html`<div
    class="chat-readonly-container"
    jslog=${VisualLogging.section('read-only')}
  >
    <span>${lockedString(UIStringsNotTranslate.pastConversation)}</span>
    <devtools-button
      aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
      class="chat-inline-button"
      @click=${onNewConversation}
      .data=${{
        variant: Buttons.Button.Variant.TEXT,
        title: lockedString(UIStringsNotTranslate.startNewChat),
        jslogContext: 'start-new-chat',
      } as Buttons.Button.ButtonData}
    >${lockedString(UIStringsNotTranslate.startNewChat)}</devtools-button>
  </div>`;
  // clang-format on
}

function renderChatInputButtons(
    {isLoading, blockedByCrossOrigin, isTextInputDisabled, isTextInputEmpty, imageInput, onCancel, onNewConversation}: {
      isLoading: boolean,
      blockedByCrossOrigin: boolean,
      isTextInputDisabled: boolean,
      isTextInputEmpty: boolean,
      onCancel: (ev: SubmitEvent) => void,
      onNewConversation: () => void,
      imageInput?: ImageInputData,
    }): Lit.TemplateResult {
  if (isLoading) {
    // clang-format off
    return html`<devtools-button
      class="chat-input-button"
      aria-label=${lockedString(UIStringsNotTranslate.cancelButtonTitle)}
      @click=${onCancel}
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
  if (blockedByCrossOrigin) {
    // clang-format off
    return html`
      <devtools-button
        class="start-new-chat-button"
        aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
        @click=${onNewConversation}
        .data=${
          {
            variant: Buttons.Button.Variant.OUTLINED,
            size: Buttons.Button.Size.SMALL,
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
        disabled: isTextInputDisabled || isTextInputEmpty || imageInput?.isLoading,
        iconName: 'send',
        title: lockedString(UIStringsNotTranslate.sendButtonTitle),
        jslogContext: 'send',
      } as Buttons.Button.ButtonData
    }
  ></devtools-button>`;
}

function renderMultimodalInputButtons({
  multimodalInputEnabled,
  blockedByCrossOrigin,
  isTextInputDisabled,
  imageInput,
  uploadImageInputEnabled,
  onTakeScreenshot,
  onImageUpload,
}: {
  isTextInputDisabled: boolean,
  blockedByCrossOrigin: boolean,
  multimodalInputEnabled?: boolean,
  imageInput?: ImageInputData,
  uploadImageInputEnabled?: boolean,
  onTakeScreenshot?: () => void,
  onImageUpload?: (ev: Event) => void,
}): Lit.LitTemplate {
  if (!multimodalInputEnabled || blockedByCrossOrigin) {
    return Lit.nothing;
  }
  // clang-format off
  const addImageButton = uploadImageInputEnabled ? html`<devtools-button
    class="chat-input-button"
    aria-label=${lockedString(UIStringsNotTranslate.addImageButtonTitle)}
    @click=${onImageUpload}
    .data=${
      {
        variant: Buttons.Button.Variant.ICON,
        size: Buttons.Button.Size.REGULAR,
        disabled: isTextInputDisabled || imageInput?.isLoading,
        iconName: 'add-photo',
        title: lockedString(UIStringsNotTranslate.addImageButtonTitle),
        jslogContext: 'upload-image',
      } as Buttons.Button.ButtonData
    }
  ></devtools-button>` : Lit.nothing;

  return html`${addImageButton}<devtools-button
    class="chat-input-button"
    aria-label=${lockedString(UIStringsNotTranslate.takeScreenshotButtonTitle)}
    @click=${onTakeScreenshot}
    .data=${
      {
        variant: Buttons.Button.Variant.ICON,
        size: Buttons.Button.Size.REGULAR,
        disabled: isTextInputDisabled || imageInput?.isLoading,
        iconName: 'photo-camera',
        title: lockedString(UIStringsNotTranslate.takeScreenshotButtonTitle),
        jslogContext: 'take-screenshot',
      } as Buttons.Button.ButtonData
    }
  ></devtools-button>`;
  // clang-format on
}

function renderImageInput({
  multimodalInputEnabled,
  imageInput,
  isTextInputDisabled,
  onRemoveImageInput,
}: {
  multimodalInputEnabled?: boolean,
  imageInput?: ImageInputData,
  isTextInputDisabled?: boolean,
  onRemoveImageInput?: () => void,
}): Lit.LitTemplate {
  if (!multimodalInputEnabled || !imageInput || isTextInputDisabled) {
    return Lit.nothing;
  }
  // clang-format off
    const crossButton = html`<devtools-button
      aria-label=${lockedString(UIStringsNotTranslate.removeImageInputButtonTitle)}
      @click=${onRemoveImageInput}
      .data=${
        {
          variant: Buttons.Button.Variant.ICON,
          size: Buttons.Button.Size.MICRO,
          iconName: 'cross',
          title: lockedString(UIStringsNotTranslate.removeImageInputButtonTitle),
        } as Buttons.Button.ButtonData
      }
    ></devtools-button>`;
  // clang-format on

  if (imageInput.isLoading) {
    // clang-format off
      return html`<div class="image-input-container">
        ${crossButton}
        <div class="loading">
          <devtools-spinner></devtools-spinner>
        </div>
      </div>`;
    // clang-format on
  }
  // clang-format off
    return  html`
    <div class="image-input-container">
      ${crossButton}
      <img src="data:${imageInput.mimeType};base64, ${imageInput.data}" alt="Image input" />
    </div>`;
  // clang-format on
}

function renderRelevantDataDisclaimer(
    {isLoading, blockedByCrossOrigin}: {isLoading: boolean, blockedByCrossOrigin: boolean}): Lit.LitTemplate {
  const classes =
      Lit.Directives.classMap({'chat-input-disclaimer': true, 'hide-divider': !isLoading && blockedByCrossOrigin});
  // clang-format off
  return html`
    <p class=${classes}>
      <button
        class="link"
        role="link"
        id=${RELEVANT_DATA_LINK_ID}
        jslog=${VisualLogging.link('open-ai-settings').track({
          click: true,
        })}
        @click=${() => {
          void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
        }}
      >${lockedString('Relevant data')}</button>&nbsp;${lockedString('is sent to Google')}
    </p>
  `;
  // clang-format on
}

function renderChatInput({
  isLoading,
  blockedByCrossOrigin,
  isTextInputDisabled,
  inputPlaceholder,
  state,
  selectedContext,
  inspectElementToggled,
  multimodalInputEnabled,
  conversationType,
  imageInput,
  isTextInputEmpty,
  uploadImageInputEnabled,
  aidaAvailability,
  onContextClick,
  onInspectElementClick,
  onSubmit,
  onTextAreaKeyDown,
  onCancel,
  onNewConversation,
  onTakeScreenshot,
  onRemoveImageInput,
  onTextInputChange,
  onImageUpload,
}: {
  isLoading: boolean,
  blockedByCrossOrigin: boolean,
  isTextInputDisabled: boolean,
  inputPlaceholder: Platform.UIString.LocalizedString,
  state: State,
  selectedContext: AiAssistanceModel.ConversationContext<unknown>|null,
  inspectElementToggled: boolean,
  isTextInputEmpty: boolean,
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
  onContextClick: () => void,
  onInspectElementClick: () => void,
  onSubmit: (ev: SubmitEvent) => void,
  onTextAreaKeyDown: (ev: KeyboardEvent) => void,
  onCancel: (ev: SubmitEvent) => void,
  onNewConversation: () => void,
  onTextInputChange: (input: string) => void,
  multimodalInputEnabled?: boolean,
  conversationType?: AiAssistanceModel.ConversationType,
  imageInput?: ImageInputData,
  uploadImageInputEnabled?: boolean,
  onTakeScreenshot?: () => void,
  onRemoveImageInput?: () => void,
  onImageUpload?: (ev: Event) => void,
}): Lit.LitTemplate {
  if (!conversationType) {
    return Lit.nothing;
  }

  const shouldShowMultiLine = state !== State.CONSENT_VIEW &&
      aidaAvailability === Host.AidaClient.AidaAccessPreconditions.AVAILABLE && selectedContext;
  const chatInputContainerCls = Lit.Directives.classMap({
    'chat-input-container': true,
    'single-line-layout': !shouldShowMultiLine,
    disabled: isTextInputDisabled,
  });

  // clang-format off
  return html`
  <form class="input-form" @submit=${onSubmit}>
    <div class=${chatInputContainerCls}>
      ${renderImageInput(
        {multimodalInputEnabled, imageInput, isTextInputDisabled, onRemoveImageInput}
      )}
      <textarea class="chat-input"
        .disabled=${isTextInputDisabled}
        wrap="hard"
        maxlength="10000"
        @keydown=${onTextAreaKeyDown}
        @input=${(event: KeyboardEvent) => onTextInputChange((event.target as HTMLInputElement).value)}
        placeholder=${inputPlaceholder}
        jslog=${VisualLogging.textField('query').track({change: true, keydown: 'Enter'})}
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
            ${renderRelevantDataDisclaimer({isLoading, blockedByCrossOrigin})}
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

function renderAidaUnavailableContents(
    aidaAvailability:
        Exclude<Host.AidaClient.AidaAccessPreconditions, Host.AidaClient.AidaAccessPreconditions.AVAILABLE>):
    Lit.TemplateResult {
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

function renderConsentViewContents(): Lit.TemplateResult {
  const settingsLink = document.createElement('button');
  settingsLink.textContent = i18nString(UIStrings.settingsLink);
  settingsLink.classList.add('link');
  UI.ARIAUtils.markAsLink(settingsLink);
  settingsLink.addEventListener('click', () => {
    void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
  });
  settingsLink.setAttribute('jslog', `${VisualLogging.action('open-ai-settings').track({click: true})}`);

  let consentViewContents: HTMLSpanElement;
  // TODO(ergunsh): Should this `view` access `hostConfig` at all?
  const config = Root.Runtime.hostConfig;
  if (config.isOffTheRecord) {
    return html`${i18nString(UIStrings.notAvailableInIncognitoMode)}`;
  }
  if (config.devToolsAiAssistancePerformanceAgent?.enabled) {
    consentViewContents = i18n.i18n.getFormatLocalizedString(
        str_, UIStrings.turnOnForStylesRequestsPerformanceAndFiles, {PH1: settingsLink});
  } else if (config.devToolsAiAssistanceFileAgent?.enabled) {
    consentViewContents =
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.turnOnForStylesRequestsAndFiles, {PH1: settingsLink});
  } else if (config.devToolsAiAssistanceNetworkAgent?.enabled) {
    consentViewContents =
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.turnOnForStylesAndRequests, {PH1: settingsLink});
  } else {
    consentViewContents = i18n.i18n.getFormatLocalizedString(str_, UIStrings.turnOnForStyles, {PH1: settingsLink});
  }

  return html`${consentViewContents}`;
}

function renderDisabledState(contents: Lit.TemplateResult): Lit.TemplateResult {
  // clang-format off
  return html`
    <div class="empty-state-container">
      <div class="disabled-view">
        <div class="disabled-view-icon-container">
          <devtools-icon
            name="smart-assistant"
          ></devtools-icon>
        </div>
        <div>
          ${contents}
        </div>
      </div>
    </div>
  `;
  // clang-format on
}

function renderMainContents({
  state,
  aidaAvailability,
  messages,
  isLoading,
  isReadOnly,
  canShowFeedbackForm,
  isTextInputDisabled,
  suggestions,
  userInfo,
  markdownRenderer,
  conversationType,
  changeSummary,
  changeManager,
  onSuggestionClick,
  onFeedbackSubmit,
  onCopyResponseClick,
  onMessageContainerRef,
}: {
  state: State,
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
  messages: ChatMessage[],
  isLoading: boolean,
  isReadOnly: boolean,
  canShowFeedbackForm: boolean,
  isTextInputDisabled: boolean,
  suggestions: AiAssistanceModel.ConversationSuggestion[],
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>,
  markdownRenderer: MarkdownRendererWithCodeBlock,
  changeManager: AiAssistanceModel.ChangeManager,
  onSuggestionClick: (suggestion: string) => void,
  onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void,
  onCopyResponseClick: (message: ModelChatMessage) => void,
  onMessageContainerRef: (el: Element|undefined) => void,
  conversationType?: AiAssistanceModel.ConversationType,
  changeSummary?: string,
}): Lit.LitTemplate {
  if (state === State.CONSENT_VIEW) {
    return renderDisabledState(renderConsentViewContents());
  }

  if (aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
    return renderDisabledState(renderAidaUnavailableContents(aidaAvailability));
  }

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

  return renderEmptyState({isTextInputDisabled, suggestions, onSuggestionClick});
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-ai-chat-view': ChatView;
  }
}

customElements.define('devtools-ai-chat-view', ChatView);
