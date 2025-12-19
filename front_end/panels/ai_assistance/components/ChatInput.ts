// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/tooltips/tooltips.js';

import type * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as GreenDev from '../../../models/greendev/greendev.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as PanelsCommon from '../../../panels/common/common.js';
import * as PanelUtils from '../../../panels/utils/utils.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import chatInputStyles from './chatInput.css.js';

const {html, Directives: {createRef, ref}} = Lit;

const UIStrings = {
  /**
   * @description Label added to the text input to describe the context for screen readers. Not shown visibly on screen.
   */
  inputTextAriaDescription: 'You can also use one of the suggested prompts above to start your conversation',
  /**
   * @description Label added to the button that reveals the selected context item in DevTools
   */
  revealContextDescription: 'Reveal the selected context item in DevTools',
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: 'Learn about AI in DevTools',
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
   * @description Title for the take screenshot button.
   */
  takeScreenshotButtonTitle: 'Take screenshot',
  /**
   * @description Title for the remove image input button.
   */
  removeImageInputButtonTitle: 'Remove image input',
  /**
   * @description Title for the add image button.
   */
  addImageButtonTitle: 'Add image',
  /**
   * @description Text displayed when the chat input is disabled due to reading past conversation.
   */
  pastConversation: 'You\'re viewing a past conversation.',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/ChatInput.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

const RELEVANT_DATA_LINK_CHAT_ID = 'relevant-data-link-chat';
const RELEVANT_DATA_LINK_FOOTER_ID = 'relevant-data-link-footer';

export type ImageInputData = {
  isLoading: true,
}|{
  isLoading: false,
  data: string,
  mimeType: string,
  inputType: AiAssistanceModel.AiAgent.MultimodalInputType,
};

export interface ViewInput {
  isLoading: boolean;
  isTextInputEmpty: boolean;
  blockedByCrossOrigin: boolean;
  isTextInputDisabled: boolean;
  inputPlaceholder: Platform.UIString.LocalizedString;
  selectedContext: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null;
  inspectElementToggled: boolean;
  additionalFloatyContext: UI.Floaty.FloatyContextSelection[];
  disclaimerText: string;
  conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType;
  multimodalInputEnabled?: boolean;
  imageInput?: ImageInputData;
  uploadImageInputEnabled?: boolean;
  isReadOnly: boolean;
  textAreaRef: Lit.Directives.Ref<HTMLTextAreaElement>;

  onContextClick: () => void;
  onInspectElementClick: () => void;
  onSubmit: (ev: SubmitEvent) => void;
  onTextAreaKeyDown: (ev: KeyboardEvent) => void;
  onCancel: (ev: SubmitEvent) => void;
  onNewConversation: () => void;
  onTextInputChange: (input: string) => void;
  onTakeScreenshot: () => void;
  onRemoveImageInput: () => void;
  onImageUpload: (ev: Event) => void;
}

export type ViewOutput = undefined;

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const chatInputContainerCls = Lit.Directives.classMap({
    'chat-input-container': true,
    'single-line-layout': !input.selectedContext,
    disabled: input.isTextInputDisabled,
  });

  const renderRelevantDataDisclaimer = (tooltipId: string): Lit.LitTemplate => {
    const classes = Lit.Directives.classMap({
      'chat-input-disclaimer': true,
      'hide-divider': !input.isLoading && input.blockedByCrossOrigin,
    });
    // clang-format off
    return html`
      <div class=${classes}>
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
        <devtools-tooltip
          id=${tooltipId}
          variant="rich"
        ><div class="info-tooltip-container">
          ${input.disclaimerText}
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
        </div></devtools-tooltip>
      </div>
    `;
    // clang-format on
  };

  // clang-format off
  Lit.render(html`
    <style>${Input.textInputStyles}</style>
    <style>${chatInputStyles}</style>
    ${input.isReadOnly ?
      html`
        <div
          class="chat-readonly-container"
          jslog=${VisualLogging.section('read-only')}
        >
          <span>${lockedString(UIStringsNotTranslate.pastConversation)}</span>
          <devtools-button
            aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
            class="chat-inline-button"
            @click=${input.onNewConversation}
            .data=${{
              variant: Buttons.Button.Variant.TEXT,
              title: lockedString(UIStringsNotTranslate.startNewChat),
              jslogContext: 'start-new-chat',
            } as Buttons.Button.ButtonData}
          >${lockedString(UIStringsNotTranslate.startNewChat)}</devtools-button>
        </div>`
      :
      html`
        <form class="input-form" @submit=${input.onSubmit}>
          ${GreenDev.Prototypes.instance().isEnabled('inDevToolsFloaty') ?
            html`
              <ul class="floaty">
                ${input.additionalFloatyContext.map(c => {
                  return html`
                    <li>
                      <span class="context-item">
                        ${c instanceof SDK.NetworkRequest.NetworkRequest ? html`${c.url()}` :
                          c instanceof SDK.DOMModel.DOMNode ? html`
                            <devtools-widget .widgetConfig=${
                              UI.Widget.widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, {node: c})}
                            ></devtools-widget>` :
                          'insight' in c ? html`${c.insight.title}` :
                          'event' in c && 'traceStartTime' in c ? html`
                            ${c.event.name} @ ${i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(Trace.Types.Timing.Micro(c.event.ts - c.traceStartTime))}` :
                          Lit.nothing}
                      </span>
                      <devtools-button
                        class="floaty-delete-button"
                        @click=${(e: MouseEvent) => {
                          e.preventDefault();
                          UI.Floaty.onFloatyContextDelete(c);
                        }}
                        .data=${{
                          variant: Buttons.Button.Variant.ICON,
                          iconName: 'cross',
                          title: 'Delete',
                          size: Buttons.Button.Size.SMALL,
                        } as Buttons.Button.ButtonData}
                      ></devtools-button>
                    </li>`;
                })}
                <li class="open-floaty">
                  <devtools-button
                    class="floaty-add-button"
                    @click=${UI.Floaty.onFloatyOpen}
                    .data=${{
                      variant: Buttons.Button.Variant.ICON,
                      iconName: 'select-element',
                      title: 'Open context picker',
                      size: Buttons.Button.Size.SMALL,
                    } as Buttons.Button.ButtonData}
                  ></devtools-button>
                </li>
              </ul>`
            : Lit.nothing}
          <div class=${chatInputContainerCls}>
            ${(input.multimodalInputEnabled && input.imageInput && !input.isTextInputDisabled) ?
              html`
                <div class="image-input-container">
                  <devtools-button
                    aria-label=${lockedString(UIStringsNotTranslate.removeImageInputButtonTitle)}
                    @click=${input.onRemoveImageInput}
                    .data=${{
                      variant: Buttons.Button.Variant.ICON,
                      size: Buttons.Button.Size.MICRO,
                      iconName: 'cross',
                      title: lockedString(UIStringsNotTranslate.removeImageInputButtonTitle),
                    } as Buttons.Button.ButtonData}
                  ></devtools-button>
                  ${input.imageInput.isLoading ?
                    html`
                      <div class="loading">
                        <devtools-spinner></devtools-spinner>
                      </div>`
                    :
                    html`
                      <img src="data:${input.imageInput.mimeType};base64, ${input.imageInput.data}" alt="Image input" />`
                  }
                </div>`
              : Lit.nothing}
            <textarea
              class="chat-input"
              .disabled=${input.isTextInputDisabled}
              wrap="hard"
              maxlength="10000"
              @keydown=${input.onTextAreaKeyDown}
              @input=${(event: KeyboardEvent) => {
                input.onTextInputChange((event.target as HTMLInputElement).value);
              }}
              placeholder=${input.inputPlaceholder}
              jslog=${VisualLogging.textField('query').track({
                change: true,
                keydown: 'Enter',
              })}
              aria-description=${i18nString(UIStrings.inputTextAriaDescription)}
              ${ref(input.textAreaRef)}
            ></textarea>
            <div class="chat-input-actions">
              <div class="chat-input-actions-left">
                ${input.selectedContext ?
                  html`
                    <div class="select-element">
                      ${input.conversationType === AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING ?
                        html`
                          <devtools-button
                            .data=${{
                              variant: Buttons.Button.Variant.ICON_TOGGLE,
                              size: Buttons.Button.Size.SMALL,
                              iconName: 'select-element',
                              toggledIconName: 'select-element',
                              toggleType: Buttons.Button.ToggleType.PRIMARY,
                              toggled: input.inspectElementToggled,
                              title: lockedString(UIStringsNotTranslate.selectAnElement),
                              jslogContext: 'select-element',
                              disabled: input.isTextInputDisabled,
                            } as Buttons.Button.ButtonData}
                            @click=${input.onInspectElementClick}
                          ></devtools-button>`
                        : Lit.nothing}
                      <div
                        role=button
                        class=${Lit.Directives.classMap({
                          'resource-link': true,
                          'has-picker-behavior': input.conversationType === AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
                          disabled: input.isTextInputDisabled,
                        })}
                        tabindex=${(input.conversationType === AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING || input.isTextInputDisabled) ? '-1' : '0'}
                        @click=${input.onContextClick}
                        @keydown=${(ev: KeyboardEvent) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            void input.onContextClick();
                          }
                        }}
                        aria-description=${i18nString(UIStrings.revealContextDescription)}
                      >
                        ${input.selectedContext.getItem() instanceof SDK.NetworkRequest.NetworkRequest ?
                          PanelUtils.PanelUtils.getIconForNetworkRequest(input.selectedContext.getItem() as SDK.NetworkRequest.NetworkRequest) :
                          input.selectedContext.getItem() instanceof Workspace.UISourceCode.UISourceCode ?
                          PanelUtils.PanelUtils.getIconForSourceFile(input.selectedContext.getItem() as Workspace.UISourceCode.UISourceCode) :
                          input.selectedContext.getItem() instanceof AiAssistanceModel.AIContext.AgentFocus ?
                          html`<devtools-icon name="performance" title="Performance"></devtools-icon>` :
                          Lit.nothing}
                        <span class="title">
                          ${input.selectedContext.getItem() instanceof SDK.DOMModel.DOMNode ?
                            html`
                              <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, {
                                node: input.selectedContext.getItem() as SDK.DOMModel.DOMNode,
                                options: {
                                  hiddenClassList: (input.selectedContext.getItem() as SDK.DOMModel.DOMNode).classNames().filter(
                                    className => className.startsWith(AiAssistanceModel.Injected.AI_ASSISTANCE_CSS_CLASS_NAME)),
                                  disabled: input.isTextInputDisabled,
                                },
                              })}></devtools-widget>`
                            :
                            input.selectedContext.getTitle()}
                        </span>
                      </div>
                    </div>`
                  : Lit.nothing}
              </div>
              <div class="chat-input-actions-right">
                <div class="chat-input-disclaimer-container">
                  ${renderRelevantDataDisclaimer(RELEVANT_DATA_LINK_CHAT_ID)}
                </div>
                ${(input.multimodalInputEnabled && !input.blockedByCrossOrigin) ?
                  html`
                    ${input.uploadImageInputEnabled ?
                      html`
                        <devtools-button
                          class="chat-input-button"
                          aria-label=${lockedString(UIStringsNotTranslate.addImageButtonTitle)}
                          @click=${input.onImageUpload}
                          .data=${{
                            variant: Buttons.Button.Variant.ICON,
                            size: Buttons.Button.Size.REGULAR,
                            disabled: input.isTextInputDisabled || input.imageInput?.isLoading,
                            iconName: 'add-photo',
                            title: lockedString(UIStringsNotTranslate.addImageButtonTitle),
                            jslogContext: 'upload-image',
                          } as Buttons.Button.ButtonData}
                        ></devtools-button>`
                      : Lit.nothing}
                    <devtools-button
                      class="chat-input-button"
                      aria-label=${lockedString(UIStringsNotTranslate.takeScreenshotButtonTitle)}
                      @click=${input.onTakeScreenshot}
                      .data=${{
                        variant: Buttons.Button.Variant.ICON,
                        size: Buttons.Button.Size.REGULAR,
                        disabled: input.isTextInputDisabled || input.imageInput?.isLoading,
                        iconName: 'photo-camera',
                        title: lockedString(UIStringsNotTranslate.takeScreenshotButtonTitle),
                        jslogContext: 'take-screenshot',
                      } as Buttons.Button.ButtonData}
                    ></devtools-button>`
                  : Lit.nothing}
                ${input.isLoading ?
                  html`
                    <devtools-button
                      class="chat-input-button"
                      aria-label=${lockedString(UIStringsNotTranslate.cancelButtonTitle)}
                      @click=${input.onCancel}
                      .data=${{
                        variant: Buttons.Button.Variant.ICON,
                        size: Buttons.Button.Size.REGULAR,
                        iconName: 'record-stop',
                        title: lockedString(UIStringsNotTranslate.cancelButtonTitle),
                        jslogContext: 'stop',
                      } as Buttons.Button.ButtonData}
                    ></devtools-button>`
                  :
                  input.blockedByCrossOrigin ?
                    html`
                      <devtools-button
                        class="start-new-chat-button"
                        aria-label=${lockedString(UIStringsNotTranslate.startNewChat)}
                        @click=${input.onNewConversation}
                        .data=${{
                          variant: Buttons.Button.Variant.OUTLINED,
                          size: Buttons.Button.Size.SMALL,
                          title: lockedString(UIStringsNotTranslate.startNewChat),
                          jslogContext: 'start-new-chat',
                        } as Buttons.Button.ButtonData}
                      >${lockedString(UIStringsNotTranslate.startNewChat)}</devtools-button>`
                    :
                    html`
                      <devtools-button
                        class="chat-input-button"
                        aria-label=${lockedString(UIStringsNotTranslate.sendButtonTitle)}
                        .data=${{
                          type: 'submit',
                          variant: Buttons.Button.Variant.ICON,
                          size: Buttons.Button.Size.REGULAR,
                          disabled: input.isTextInputDisabled || input.isTextInputEmpty || input.imageInput?.isLoading,
                          iconName: 'send',
                          title: lockedString(UIStringsNotTranslate.sendButtonTitle),
                          jslogContext: 'send',
                        } as Buttons.Button.ButtonData}
                      ></devtools-button>`
                }
              </div>
            </div>
          </div>
        </form>`
    }
    <footer
      class=${Lit.Directives.classMap({
        'chat-input-footer': true,
        'is-read-only': input.isReadOnly,
      })}
      jslog=${VisualLogging.section('footer')}
    >
      ${renderRelevantDataDisclaimer(RELEVANT_DATA_LINK_FOOTER_ID)}
    </footer>
  `, target);
  // clang-format on
};

/**
 * ChatInput is a presenter for the input area in the AI Assistance panel.
 */
export class ChatInput extends UI.Widget.Widget {
  isLoading = false;
  blockedByCrossOrigin = false;
  isTextInputDisabled = false;
  inputPlaceholder = '' as Platform.UIString.LocalizedString;
  selectedContext = null as AiAssistanceModel.AiAgent.ConversationContext<unknown>| null;
  inspectElementToggled = false;
  additionalFloatyContext = [] as UI.Floaty.FloatyContextSelection[];
  disclaimerText = '';
  conversationType = AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING;
  multimodalInputEnabled?: boolean = false;
  imageInput = undefined as ImageInputData | undefined;
  uploadImageInputEnabled?: boolean = false;
  isReadOnly = false;
  #textAreaRef = createRef<HTMLTextAreaElement>();

  setInputValue(text: string): void {
    if (this.#textAreaRef.value) {
      this.#textAreaRef.value.value = text;
    }
    this.performUpdate();
  }

  #isTextInputEmpty(): boolean {
    return !this.#textAreaRef.value?.value?.trim();
  }

  onTextSubmit:
      (text: string, imageInput?: Host.AidaClient.Part,
       multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType) => void = () => {};
  onContextClick = (): void => {};
  onInspectElementClick = (): void => {};
  onCancelClick = (): void => {};
  onNewConversation = (): void => {};
  onTakeScreenshot: () => void = () => {};
  onRemoveImageInput: () => void = () => {};
  onLoadImage: (_file: File) => Promise<void> = () => Promise.resolve();

  #view: typeof DEFAULT_VIEW;

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
  }

  override performUpdate(): void {
    this.#view(
        {
          inputPlaceholder: this.inputPlaceholder,
          isLoading: this.isLoading,
          blockedByCrossOrigin: this.blockedByCrossOrigin,
          isTextInputDisabled: this.isTextInputDisabled,
          selectedContext: this.selectedContext,
          inspectElementToggled: this.inspectElementToggled,
          isTextInputEmpty: this.#isTextInputEmpty(),
          additionalFloatyContext: this.additionalFloatyContext,
          disclaimerText: this.disclaimerText,
          conversationType: this.conversationType,
          multimodalInputEnabled: this.multimodalInputEnabled,
          imageInput: this.imageInput,
          uploadImageInputEnabled: this.uploadImageInputEnabled,
          isReadOnly: this.isReadOnly,
          textAreaRef: this.#textAreaRef,
          onContextClick: this.onContextClick,
          onInspectElementClick: this.onInspectElementClick,
          onNewConversation: this.onNewConversation,
          onTextInputChange: () => {
            this.requestUpdate();
          },
          onTakeScreenshot: this.onTakeScreenshot,
          onRemoveImageInput: this.onRemoveImageInput,
          onSubmit: this.onSubmit,
          onTextAreaKeyDown: this.onTextAreaKeyDown,
          onCancel: this.onCancel,
          onImageUpload: this.onImageUpload,
        },
        undefined, this.contentElement);
  }

  focusTextInput(): void {
    this.#textAreaRef.value?.focus();
  }

  onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (this.imageInput?.isLoading) {
      return;
    }
    const imageInput = !this.imageInput?.isLoading && this.imageInput?.data ?
        {inlineData: {data: this.imageInput.data, mimeType: this.imageInput.mimeType}} :
        undefined;
    this.onTextSubmit(this.#textAreaRef.value?.value ?? '', imageInput, this.imageInput?.inputType);
    this.setInputValue('');
  };

  onTextAreaKeyDown = (event: KeyboardEvent): void => {
    if (!event.target || !(event.target instanceof HTMLTextAreaElement)) {
      return;
    }

    // Go to a new line on Shift+Enter. On Enter, submit unless the
    // user is in IME composition.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!event.target?.value || this.imageInput?.isLoading) {
        return;
      }
      const imageInput = !this.imageInput?.isLoading && this.imageInput?.data ?
          {inlineData: {data: this.imageInput.data, mimeType: this.imageInput.mimeType}} :
          undefined;
      this.onTextSubmit(event.target.value, imageInput, this.imageInput?.inputType);
      this.setInputValue('');
    }
  };

  onCancel = (ev: SubmitEvent): void => {
    ev.preventDefault();

    if (!this.isLoading) {
      return;
    }

    this.onCancelClick();
  };

  onImageUpload = (ev: Event): void => {
    ev.stopPropagation();
    if (this.onLoadImage) {
      const fileSelector = UI.UIUtils.createFileSelectorElement(this.onLoadImage.bind(this), '.jpeg,.jpg,.png');
      fileSelector.click();
    }
  };
}
