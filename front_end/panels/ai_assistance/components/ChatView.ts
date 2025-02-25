// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/spinners/spinners.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import {AgentType, type ContextDetail, type ConversationContext, ErrorType} from '../agents/AiAgent.js';

import stylesRaw from './chatView.css.js';
import {MarkdownRendererWithCodeBlock} from './MarkdownRendererWithCodeBlock.js';
import {UserActionRow} from './UserActionRow.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const styles = new CSSStyleSheet();
styles.replaceSync(stylesRaw.cssContent);

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
   *@description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   *@example {AI assistance in Settings} PH1
   */
  turnOnForStyles: 'Turn on {PH1} to get help with understanding CSS styles',
  /**
   *@description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   *@example {AI assistance in Settings} PH1
   */
  turnOnForStylesAndRequests: 'Turn on {PH1} to get help with styles and network requests',
  /**
   *@description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   *@example {AI assistance in Settings} PH1
   */
  turnOnForStylesRequestsAndFiles: 'Turn on {PH1} to get help with styles, network requests, and files',
  /**
   *@description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
   *@example {AI assistance in Settings} PH1
   */
  turnOnForStylesRequestsPerformanceAndFiles:
      'Turn on {PH1} to get help with styles, network requests, performance, and files',
  /**
   *@description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: 'Learn about AI in DevTools',
} as const;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Title for the send icon button.
   */
  sendButtonTitle: 'Send',
  /**
   *@description Title for the start new chat
   */
  startNewChat: 'Start new chat',
  /**
   *@description Title for the cancel icon button.
   */
  cancelButtonTitle: 'Cancel',
  /**
   *@description Label for the "select an element" button.
   */
  selectAnElement: 'Select an element',
  /**
   *@description Label for the "select an element" button.
   */
  noElementSelected: 'No element selected',
  /**
   *@description Text for the empty state of the AI assistance panel.
   */
  emptyStateText: 'How can I help you?',
  /**
   *@description Text for the empty state of the AI assistance panel when there is no agent selected.
   */
  noAgentStateText: 'Explore AI assistance',
  /**
   * @description The error message when the LLM loop is stopped for some reason (Max steps reached or request to LLM failed)
   */
  systemError:
      'Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue.',
  /**
   * @description The error message when the LLM loop is stopped for some reason (Max steps reached or request to LLM failed)
   */
  maxStepsError: 'Seems like I am stuck with the investigation. It would be better if you start over.',
  /**
   *@description Displayed when the user stop the response
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
   *@description The generic name of the AI agent (do not translate)
   */
  ai: 'AI',
  /**
   *@description The fallback text when we can't find the user full name
   */
  you: 'You',
  /**
   *@description The fallback text when a step has no title yet
   */
  investigating: 'Investigating',
  /**
   *@description Prefix to the title of each thinking step of a user action is required to continue
   */
  paused: 'Paused',
  /**
   *@description Heading text for the code block that shows the executed code.
   */
  codeExecuted: 'Code executed',
  /**
   *@description Heading text for the code block that shows the code to be executed after side effect confirmation.
   */
  codeToExecute: 'Code to execute',
  /**
   *@description Heading text for the code block that shows the returned data.
   */
  dataReturned: 'Data returned',
  /**
   *@description Aria label for the check mark icon to be read by screen reader
   */
  completed: 'Completed',
  /**
   *@description Aria label for the loading icon to be read by screen reader
   */
  inProgress: 'In progress',
  /**
   *@description Aria label for the cancel icon to be read by screen reader
   */
  canceled: 'Canceled',
  /**
   *@description Text displayed when the chat input is disabled due to reading past conversation.
   */
  pastConversation: 'You\'re viewing a past conversation.',
  /**
   *@description Text displayed for showing change summary view.
   */
  changeSummary: 'Changes summary',
  /**
   *@description Button text for staging changes to workspace.
   */
  applyToWorkspace: 'Apply to workspace',
  /**
   *@description Title for the take screenshot button.
   */
  takeScreenshotButtonTitle: 'Take screenshot',
  /**
   *@description Title for the remove image input button.
   */
  removeImageInputButtonTitle: 'Remove image input',
  /**
   *@description Alt text for the image input (displayed in the chat messages) that has been sent to the model.
   */
  imageInputSentToTheModel: 'Image input sent to the model',
  /**
   *@description Alt text for the account avatar.
   */
  accountAvatar: 'Account avatar',
  /**
   *@description Title for the x-link which wraps the image input rendered in chat messages.
   */
  openImageInNewTab: 'Open image in a new tab',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/ChatView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

const SCROLL_ROUNDING_OFFSET = 1;

export interface Step {
  isLoading: boolean;
  thought?: string;
  title?: string;
  code?: string;
  output?: string;
  canceled?: boolean;
  sideEffect?: ConfirmSideEffectDialog;
  contextDetails?: [ContextDetail, ...ContextDetail[]];
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
  imageInput?: Host.AidaClient.Part;
}
export interface ModelChatMessage {
  entity: ChatMessageEntity.MODEL;
  steps: Step[];
  suggestions?: [string, ...string[]];
  answer?: string;
  error?: ErrorType;
  rpcId?: Host.AidaClient.RpcGlobalId;
}

export type ChatMessage = UserChatMessage|ModelChatMessage;

export const enum State {
  CONSENT_VIEW = 'consent-view',
  CHAT_VIEW = 'chat-view',
}

export interface Props {
  onTextSubmit: (text: string, imageInput?: Host.AidaClient.Part) => void;
  onInspectElementClick: () => void;
  onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void;
  onCancelClick: () => void;
  onContextClick: () => void;
  onNewConversation: () => void;
  onCancelCrossOriginChat?: () => void;
  onTakeScreenshot?: () => void;
  onRemoveImageInput?: () => void;
  inspectElementToggled: boolean;
  state: State;
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  messages: ChatMessage[];
  selectedContext: ConversationContext<unknown>|null;
  isLoading: boolean;
  canShowFeedbackForm: boolean;
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>;
  agentType?: AgentType;
  isReadOnly: boolean;
  blockedByCrossOrigin: boolean;
  stripLinks: boolean;
  changeSummary?: string;
  patchSuggestion?: string;
  patchSuggestionLoading?: boolean;
  projectName?: string;
  multimodalInputEnabled?: boolean;
  imageInput?: string;
  onApplyToWorkspace?: () => void;
  isTextInputDisabled: boolean;
  emptyStateSuggestions: string[];
  inputPlaceholder: Platform.UIString.LocalizedString;
  disclaimerText: Platform.UIString.LocalizedString;
}

export class ChatView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #markdownRenderer = new MarkdownRendererWithCodeBlock();
  #scrollTop?: number;
  #props: Props;
  #messagesContainerElement?: Element;
  #mainElementRef?: Lit.Directives.Ref<Element> = Lit.Directives.createRef();
  #lastAnswerMarkdownView?: MarkdownView.MarkdownView.MarkdownView;
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

  constructor(props: Props) {
    super();
    this.#props = props;
  }

  set props(props: Props) {
    this.#markdownRenderer = new MarkdownRendererWithCodeBlock({stripLinks: props.stripLinks});
    this.#props = props;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
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

    this.#mainElementRef.value.scrollTop = this.#scrollTop;
  }

  finishTextAnimations(): void {
    if (!this.#lastAnswerMarkdownView) {
      return;
    }

    this.#lastAnswerMarkdownView.finishAnimations();
  }

  scrollToBottom(): void {
    if (!this.#mainElementRef?.value) {
      return;
    }

    this.#mainElementRef.value.scrollTop = this.#mainElementRef.value.scrollHeight;
  }

  #handleMessagesContainerResize(): void {
    if (!this.#pinScrollToBottom) {
      return;
    }

    if (!this.#mainElementRef?.value) {
      return;
    }

    if (this.#pinScrollToBottom) {
      this.#mainElementRef.value.scrollTop = this.#mainElementRef.value.scrollHeight;
    }
  }

  #setInputText(text: string): void {
    const textArea = this.#shadow.querySelector('.chat-input') as HTMLTextAreaElement;
    if (!textArea) {
      return;
    }

    textArea.value = text;
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

  #handleLastAnswerMarkdownViewRef(el: Element|undefined): void {
    if (!el) {
      this.#lastAnswerMarkdownView = undefined;
      return;
    }

    if (el instanceof MarkdownView.MarkdownView.MarkdownView) {
      this.#lastAnswerMarkdownView = el;
    }
  }

  #handleScroll = (ev: Event): void => {
    if (!ev.target || !(ev.target instanceof HTMLElement)) {
      return;
    }

    this.#scrollTop = ev.target.scrollTop;
    this.#pinScrollToBottom =
        ev.target.scrollTop + ev.target.clientHeight + SCROLL_ROUNDING_OFFSET > ev.target.scrollHeight;
  };

  #handleSubmit = (ev: SubmitEvent): void => {
    ev.preventDefault();
    const textArea = this.#shadow.querySelector('.chat-input') as HTMLTextAreaElement;
    if (!textArea?.value) {
      return;
    }
    const imageInput =
        this.#props.imageInput ? {inlineData: {data: this.#props.imageInput, mimeType: 'image/jpeg'}} : undefined;
    void this.#props.onTextSubmit(textArea.value, imageInput);
    textArea.value = '';
  };

  #handleTextAreaKeyDown = (ev: KeyboardEvent): void => {
    if (!ev.target || !(ev.target instanceof HTMLTextAreaElement)) {
      return;
    }

    // Go to a new line only when Shift + Enter is pressed.
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      if (!ev.target?.value) {
        return;
      }
      const imageInput =
          this.#props.imageInput ? {inlineData: {data: this.#props.imageInput, mimeType: 'image/jpeg'}} : undefined;
      void this.#props.onTextSubmit(ev.target.value, imageInput);
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

  #handleSuggestionClick = (suggestion: string): void => {
    this.#setInputText(suggestion);
    this.focusTextInput();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceDynamicSuggestionClicked);
  };

  #render(): void {
    // clang-format off
    Lit.render(html`
      <div class="chat-ui">
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
            agentType: this.#props.agentType,
            changeSummary: this.#props.changeSummary,
            patchSuggestion: this.#props.patchSuggestion,
            patchSuggestionLoading: this.#props.patchSuggestionLoading,
            projectName: this.#props.projectName,
            onSuggestionClick: this.#handleSuggestionClick,
            onFeedbackSubmit: this.#props.onFeedbackSubmit,
            onLastAnswerMarkdownViewRef: this.#handleLastAnswerMarkdownViewRef,
            onMessageContainerRef: this.#handleMessageContainerRef,
            onApplyToWorkspace: this.#props.onApplyToWorkspace,
          })}
          ${this.#props.isReadOnly
            ? renderReadOnlySection({
                agentType: this.#props.agentType,
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
                agentType: this.#props.agentType,
                imageInput: this.#props.imageInput,
                onContextClick: this.#props.onContextClick,
                onInspectElementClick: this.#props.onInspectElementClick,
                onSubmit: this.#handleSubmit,
                onTextAreaKeyDown: this.#handleTextAreaKeyDown,
                onCancel: this.#handleCancel,
                onNewConversation: this.#props.onNewConversation,
                onCancelCrossOriginChat: this.#props.onCancelCrossOriginChat,
                onTakeScreenshot: this.#props.onTakeScreenshot,
                onRemoveImageInput: this.#props.onRemoveImageInput,
              })
          }
        </main>
        <footer class="disclaimer" jslog=${VisualLogging.section('footer')}>
          <p class="disclaimer-text">
            ${this.#props.disclaimerText}
            <button
              class="link"
              role="link"
              jslog=${VisualLogging.link('open-ai-settings').track({
                click: true,
              })}
              @click=${() => {
                void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
              }}
            >${i18nString(UIStrings.learnAbout)}</button>
          </p>
        </footer>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

function renderChangeSummary({
  changeSummary,
  patchSuggestion,
  patchSuggestionLoading,
  projectName,
  onApplyToWorkspace,
}: {
  changeSummary: string,
  patchSuggestion?: string,
  patchSuggestionLoading?: boolean,
  projectName?: string,
  onApplyToWorkspace?: () => void,
}): Lit.LitTemplate {
  // clang-format off
  return html`<details class="change-summary">
      <summary>
        <devtools-icon class="difference-icon" .name=${'pen-spark'}
        ></devtools-icon>
        <span class="header-text">
          ${lockedString(UIStringsNotTranslate.changeSummary)}
        </span>
        <devtools-icon
          class="arrow"
          .name=${'chevron-down'}
        ></devtools-icon>
      </summary>
      <devtools-code-block
        .code=${changeSummary}
        .codeLang=${'css'}
        .displayNotice=${true}
      ></devtools-code-block>
      <div class="workspace">
        <devtools-button
          class='apply-to-workspace'
          @click=${onApplyToWorkspace}
          .jslogContext=${'stage-to-workspace'}
          .variant=${Buttons.Button.Variant.OUTLINED}>
            ${!patchSuggestionLoading ? lockedString(UIStringsNotTranslate.applyToWorkspace) : 'Loading...'}
        </devtools-button>
        <div>Selected folder: ${projectName}</div>
      </div>
      ${patchSuggestion ? html`<div class="patch-tmp-message">
        ${patchSuggestion}
      </div>` : Lit.nothing}
    </details>`;
  // clang-format on
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
            .name=${'chevron-down'}
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
      case ErrorType.UNKNOWN:
      case ErrorType.BLOCK:
        errorMessage = UIStringsNotTranslate.systemError;
        break;
      case ErrorType.MAX_STEPS:
        errorMessage = UIStringsNotTranslate.maxStepsError;
        break;
      case ErrorType.ABORT:
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
  onLastAnswerMarkdownViewRef,
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
  onLastAnswerMarkdownViewRef: (el: Element|undefined) => void,
}): Lit.TemplateResult {
  if (message.entity === ChatMessageEntity.USER) {
    const name = userInfo.accountFullName || lockedString(UIStringsNotTranslate.you);
    const image = userInfo.accountImage ?
        html`<img src="data:image/png;base64, ${userInfo.accountImage}" alt=${UIStringsNotTranslate.accountAvatar} />` :
        html`<devtools-icon
          .name=${'profile'}
        ></devtools-icon>`;
    let imageInput = html``;
    if (message.imageInput && 'inlineData' in message.imageInput) {
      const imageUrl = `data:image/jpeg;base64,${message.imageInput.inlineData.data}`;
      // clang-format off
      imageInput = html`<x-link
        class="image-link" title=${UIStringsNotTranslate.openImageInNewTab}
        href=${imageUrl}
      >
        <img src=${imageUrl} alt=${UIStringsNotTranslate.imageInputSentToTheModel} />
      </x-link>`;
      // clang-format on
    }
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
        ? html`<p>${renderTextAsMarkdown(message.answer, markdownRenderer, { animate: !isReadOnly, ref: onLastAnswerMarkdownViewRef })}</p>`
        : Lit.nothing}
      ${renderError(message)}
      ${isLast && isLoading
        ? Lit.nothing
        : html`<devtools-widget class="actions" .widgetConfig=${UI.Widget.widgetConfig(UserActionRow, {
            showRateButtons: message.rpcId !== undefined,
            onFeedbackSubmit: (rating: Host.AidaClient.Rating, feedback: string) => {
              if (!message.rpcId) {
                return;
              }
              onFeedbackSubmit(message.rpcId, rating, feedback);
            },
            suggestions: isLast ? message.suggestions : undefined,
            onSuggestionClick,
            canShowFeedbackForm,
          })}></devtools-widget>`
      }
    </section>
  `;
  // clang-format on
}

function renderSelection({
  selectedContext,
  inspectElementToggled,
  agentType,
  onContextClick,
  onInspectElementClick,
}: {
  selectedContext: ConversationContext<unknown>|null,
  inspectElementToggled: boolean,
  agentType?: AgentType, onContextClick: () => void | Promise<void>, onInspectElementClick: () => void,
}): Lit.LitTemplate {
  if (!agentType) {
    return Lit.nothing;
  }

  // TODO: currently the picker behavior is SDKNode specific.
  const hasPickerBehavior = agentType === AgentType.STYLING;

  const resourceClass = Lit.Directives.classMap({
    'not-selected': !selectedContext,
    'resource-link': true,
    'allow-overflow': hasPickerBehavior,
  });

  if (!selectedContext && !hasPickerBehavior) {
    return Lit.nothing;
  }

  const icon = selectedContext?.getIcon() ?? Lit.nothing;

  const handleKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter') {
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
              size: Buttons.Button.Size.REGULAR,
              iconName: 'select-element',
              toggledIconName: 'select-element',
              toggleType: Buttons.Button.ToggleType.PRIMARY,
              toggled: inspectElementToggled,
              title: lockedString(UIStringsNotTranslate.selectAnElement),
              jslogContext: 'select-element',
          } as Buttons.Button.ButtonData}
          @click=${onInspectElementClick}
        ></devtools-button>
      ` : Lit.nothing
    }
    <div
      role=button
      class=${resourceClass}
      tabindex=${hasPickerBehavior ? '-1' : '0'}
      @click=${onContextClick}
      @keydown=${handleKeyDown}
    >
      ${icon}${selectedContext?.getTitle() ?? html`<span>${
        lockedString(UIStringsNotTranslate.noElementSelected)
      }</span>`}
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
  patchSuggestion,
  patchSuggestionLoading,
  projectName,
  onSuggestionClick,
  onFeedbackSubmit,
  onLastAnswerMarkdownViewRef,
  onMessageContainerRef,
  onApplyToWorkspace,
}: {
  messages: ChatMessage[],
  isLoading: boolean,
  isReadOnly: boolean,
  canShowFeedbackForm: boolean,
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>,
  markdownRenderer: MarkdownRendererWithCodeBlock,
  changeSummary?: string,
  patchSuggestion?: string,
  patchSuggestionLoading?: boolean,
  projectName?: string,
  onApplyToWorkspace?: () => void,
                    onSuggestionClick: (suggestion: string) => void,
                    onFeedbackSubmit:
                        (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) => void,
                    onLastAnswerMarkdownViewRef: (el: Element|undefined) => void,
                    onMessageContainerRef: (el: Element|undefined) => void,
}): Lit.TemplateResult {
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
          onLastAnswerMarkdownViewRef,
        }),
      )}
      ${(changeSummary && !isLoading) ? renderChangeSummary({
          changeSummary,
          patchSuggestion,
          patchSuggestionLoading,
          projectName,
          onApplyToWorkspace,
        }) : Lit.nothing}
    </div>
  `;
  // clang-format on
}

function renderEmptyState({isTextInputDisabled, suggestions, onSuggestionClick}: {
  isTextInputDisabled: boolean,
  suggestions: string[],
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
      ${suggestions.map(suggestion => {
        return html`<devtools-button
          class="suggestion"
          @click=${() => onSuggestionClick(suggestion)}
          .data=${
            {
              variant: Buttons.Button.Variant.OUTLINED,
              size: Buttons.Button.Size.REGULAR,
              title: suggestion,
              jslogContext: 'suggestion',
              disabled: isTextInputDisabled,
            } as Buttons.Button.ButtonData
          }
        >${suggestion}</devtools-button>`;
      })}
    </div>
  </div>`;
  // clang-format on
}

function renderReadOnlySection({onNewConversation, agentType}: {
  onNewConversation: () => void,
  agentType?: AgentType,
}): Lit.LitTemplate {
  if (!agentType) {
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
    {isLoading, blockedByCrossOrigin, isTextInputDisabled, onCancel, onNewConversation, onCancelCrossOriginChat}: {
      isLoading: boolean,
      blockedByCrossOrigin: boolean,
      isTextInputDisabled: boolean,
      onCancel: (ev: SubmitEvent) => void,
      onNewConversation: () => void,
      onCancelCrossOriginChat?: () => void,
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
      ${blockedByCrossOrigin && Boolean(onCancelCrossOriginChat) ? html`<devtools-button
        class="chat-cancel-context-button"
        @click=${onCancelCrossOriginChat}
        .data=${
          {
            variant: Buttons.Button.Variant.TEXT,
            size: Buttons.Button.Size.REGULAR,
            jslogContext: 'cancel-cross-origin-context-chat',
          } as Buttons.Button.ButtonData
        }
      >${lockedString(UIStringsNotTranslate.cancelButtonTitle)}</devtools-button>` : Lit.nothing}
      <devtools-button
        class="chat-input-button"
        aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
        @click=${onNewConversation}
        .data=${
          {
            variant: Buttons.Button.Variant.PRIMARY,
            size: Buttons.Button.Size.REGULAR,
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
        disabled: isTextInputDisabled,
        iconName: 'send',
        title: lockedString(UIStringsNotTranslate.sendButtonTitle),
        jslogContext: 'send',
      } as Buttons.Button.ButtonData
    }
  ></devtools-button>`;
}

function renderTakeScreenshotButton({
  multimodalInputEnabled,
  blockedByCrossOrigin,
  isTextInputDisabled,
  onTakeScreenshot,
}: {
  isTextInputDisabled: boolean,
  blockedByCrossOrigin: boolean,
  multimodalInputEnabled?: boolean,
  onTakeScreenshot?: () => void,
}): Lit.LitTemplate {
    if (!multimodalInputEnabled || blockedByCrossOrigin) {
      return Lit.nothing;
    }
    return html`<devtools-button
      class="chat-input-button"
      aria-label=${lockedString(UIStringsNotTranslate.takeScreenshotButtonTitle)}
      @click=${onTakeScreenshot}
      .data=${
        {
          variant: Buttons.Button.Variant.ICON,
          size: Buttons.Button.Size.REGULAR,
          disabled: isTextInputDisabled,
          iconName: 'photo-camera',
          title: lockedString(UIStringsNotTranslate.takeScreenshotButtonTitle),
          jslogContext: 'take-screenshot',
        } as Buttons.Button.ButtonData
      }
    ></devtools-button>`;
  }

function renderImageInput({
  multimodalInputEnabled,
  imageInput,
  onRemoveImageInput,
}: {
  multimodalInputEnabled?: boolean,
  imageInput?: string,
  onRemoveImageInput?: () => void,
}): Lit.LitTemplate {
    if (!multimodalInputEnabled || !imageInput || imageInput==='') {
      return Lit.nothing;
    }
    return  html`
    <div class="image-input-container">
      <devtools-button
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
    ></devtools-button>
      <img src="data:image/jpeg;base64, ${imageInput}" alt="Screenshot input" />
    </div>`;
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
  agentType,
  imageInput,
  onContextClick,
  onInspectElementClick,
  onSubmit,
  onTextAreaKeyDown,
  onCancel,
  onNewConversation,
  onCancelCrossOriginChat,
  onTakeScreenshot,
  onRemoveImageInput,
}: {
  isLoading: boolean,
  blockedByCrossOrigin: boolean,
  isTextInputDisabled: boolean,
  inputPlaceholder: Platform.UIString.LocalizedString,
  state: State,
  selectedContext: ConversationContext<unknown> | null,
  inspectElementToggled: boolean,
  multimodalInputEnabled?: boolean,
  agentType?: AgentType,
  imageInput?: string,
  onContextClick: () => void ,
  onInspectElementClick: () => void,
  onSubmit: (ev: SubmitEvent) => void,
  onTextAreaKeyDown: (ev: KeyboardEvent) => void,
  onCancel: (ev: SubmitEvent) => void,
  onNewConversation: () => void,
  onCancelCrossOriginChat?: () => void,
  onTakeScreenshot?: () => void,
  onRemoveImageInput?: () => void,
}): Lit.LitTemplate {
  if (!agentType) {
    return Lit.nothing;
  }

  const chatInputCls = Lit.Directives.classMap({
    'chat-input': true,
    'two-big-buttons': blockedByCrossOrigin,
    'screenshot-button': Boolean(multimodalInputEnabled) && !blockedByCrossOrigin,
  });

    const chatInputContainerCls = Lit.Directives.classMap({
      'chat-input-container': true,
      disabled: isTextInputDisabled,
    });

  // clang-format off
  return html`
  <form class="input-form" @submit=${onSubmit}>
    <div class="input-form-shadow-container">
      <div class="input-form-shadow"></div>
    </div>
    ${state !== State.CONSENT_VIEW ? html`
      <div class="input-header">
        <div class="header-link-container">
          ${renderSelection({
            selectedContext,
            inspectElementToggled,
            agentType,
            onContextClick,
            onInspectElementClick,
          })}
        </div>
      </div>
    ` : Lit.nothing}
    <div class=${chatInputContainerCls}>
      ${renderImageInput(
        {multimodalInputEnabled, imageInput, onRemoveImageInput}
      )}
      <textarea class=${chatInputCls}
        .disabled=${isTextInputDisabled}
        wrap="hard"
        maxlength="10000"
        @keydown=${onTextAreaKeyDown}
        placeholder=${inputPlaceholder}
        jslog=${VisualLogging.textField('query').track({ keydown: 'Enter' })}
      ></textarea>
      <div class="chat-input-buttons">
        ${renderTakeScreenshotButton({
          multimodalInputEnabled, blockedByCrossOrigin, isTextInputDisabled, onTakeScreenshot
        })}
        ${renderChatInputButtons({ isLoading, blockedByCrossOrigin, isTextInputDisabled, onCancel, onNewConversation, onCancelCrossOriginChat })}
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
          <devtools-icon .data=${{
            iconName: 'smart-assistant',
            width: 'var(--sys-size-8)',
            height: 'var(--sys-size-8)',
          } as IconButton.Icon.IconData}>
          </devtools-icon>
        </div>
        <div>
          ${contents}
        </div>
      </div>
    </div>
  `;
  // clang-format on
}

function renderNoAgentState(): Lit.TemplateResult {
  const config = Root.Runtime.hostConfig;
  const featureCards: Array<{
    icon: string,
    heading: string,
    content: Lit.TemplateResult,
  }> =
      [
        ...(config.devToolsFreestyler?.enabled ? [{
          icon: 'brush-2',
          heading: 'CSS styles',
          content: html`Open <button class="link" role="link" jslog=${
              VisualLogging.link('open-elements-panel').track({click: true})} @click=${() => {
            void UI.ViewManager.ViewManager.instance().showView('elements');
          }}>Elements</button> to ask about CSS styles`,
        }] :
                                                 []),
        ...(config.devToolsAiAssistanceNetworkAgent?.enabled) ? [{
          icon: 'arrow-up-down',
          heading: 'Network',
          content: html`Open <button class="link" role="link" jslog=${
              VisualLogging.link('open-network-panel').track({click: true})} @click=${() => {
            void UI.ViewManager.ViewManager.instance().showView('network');
          }}>Network</button> to ask about a request's details`,
        }] :
                                                                [],
        ...(config.devToolsAiAssistanceFileAgent?.enabled) ? [{
          icon: 'document',
          heading: 'Files',
          content: html`Open <button class="link" role="link" jslog=${
              VisualLogging.link('open-sources-panel').track({click: true})} @click=${() => {
            void UI.ViewManager.ViewManager.instance().showView('sources');
          }}>Sources</button> to ask about a file's content`,
        }] :
                                                             [],
        ...(config.devToolsAiAssistancePerformanceAgent?.enabled ? [{
          icon: 'performance',
          heading: 'Performance',
          content: html`Open <button class="link" role="link" jslog=${
              VisualLogging.link('open-performance-panel').track({click: true})} @click=${() => {
            void UI.ViewManager.ViewManager.instance().showView('timeline');
          }}>Performance</button> to ask about a trace item`,
        }] :
                                                                   []),
      ];

  // clang-format off
  return html`
    <div class="empty-state-container">
      <div class="header">
        <div class="icon">
          <devtools-icon
            name="smart-assistant"
          ></devtools-icon>
        </div>
        <h1>${lockedString(UIStringsNotTranslate.noAgentStateText)}</h1>
        <p>To chat about an item, right-click and select <strong>Ask AI</strong></p>
      </div>
      <div class="empty-state-content">
        ${featureCards.map(featureCard => html`
          <div class="feature-card">
            <div class="feature-card-icon">
              <devtools-icon name=${featureCard.icon}></devtools-icon>
            </div>
            <div class="feature-card-content">
              <h3>${featureCard.heading}</h3>
              <p>${featureCard.content}</p>
            </div>
          </div>
        `)}
      </div>
    </div>`;
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
  agentType,
  changeSummary,
  patchSuggestion,
  patchSuggestionLoading,
  projectName,
  onSuggestionClick,
  onFeedbackSubmit,
  onLastAnswerMarkdownViewRef,
  onMessageContainerRef,
  onApplyToWorkspace,
}: {
  state: State,
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
  messages: ChatMessage[],
  isLoading: boolean,
  isReadOnly: boolean,
  canShowFeedbackForm: boolean,
  isTextInputDisabled: boolean,
  suggestions: string[],
  userInfo: Pick<Host.InspectorFrontendHostAPI.SyncInformation, 'accountImage'|'accountFullName'>,
  markdownRenderer: MarkdownRendererWithCodeBlock,
  agentType?: AgentType,
  changeSummary?: string,
  patchSuggestion?: string,
  patchSuggestionLoading?: boolean,
  projectName?: string,
             onSuggestionClick: (suggestion: string) => void,
             onFeedbackSubmit: (rpcId: Host.AidaClient.RpcGlobalId, rate: Host.AidaClient.Rating, feedback?: string) =>
                 void,
             onLastAnswerMarkdownViewRef: (el: Element|undefined) => void,
             onMessageContainerRef: (el: Element|undefined) => void,
  onApplyToWorkspace?: () => void,
}): Lit.TemplateResult {
  if (state === State.CONSENT_VIEW) {
    return renderDisabledState(renderConsentViewContents());
  }

  if (aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
    return renderDisabledState(renderAidaUnavailableContents(aidaAvailability));
  }

  if (!agentType) {
    return renderNoAgentState();
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
      patchSuggestion,
      patchSuggestionLoading,
      projectName,
      onApplyToWorkspace,
      onSuggestionClick,
      onFeedbackSubmit,
      onLastAnswerMarkdownViewRef,
      onMessageContainerRef,
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
