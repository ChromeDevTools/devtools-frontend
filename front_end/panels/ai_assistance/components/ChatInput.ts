// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
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

function renderRelevantDataDisclaimer({isLoading, blockedByCrossOrigin, tooltipId, disclaimerText}: {
  isLoading: boolean,
  blockedByCrossOrigin: boolean,
  tooltipId: string,
  disclaimerText: string,
}): Lit.LitTemplate {
  const classes = Lit.Directives.classMap({
    'chat-input-disclaimer': true,
    'hide-divider': !isLoading && blockedByCrossOrigin,
  });
  // clang-format off
  return html`
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
      ${renderDisclaimerTooltip(tooltipId, disclaimerText)}
    </p>
  `;
  // clang-format on
}

function renderDisclaimerTooltip(id: string, disclaimerText: string): Lit.TemplateResult {
  // clang-format off
  return html`
    <devtools-tooltip
      id=${id}
      variant="rich"
      placement="top"
    >
        ${disclaimerText}
        <br /><br />
        <x-link
          href="https://support.google.com/legal/answer/13533059"
          class="link"
          jslog=${VisualLogging.link('terms-of-service').track({
            click: true,
          })}
        >${lockedString('Terms of Service')}</x-link>
        <x-link
          href="https://policies.google.com/privacy"
          class="link"
          jslog=${VisualLogging.link('privacy-policy').track({
            click: true,
          })}
        >${lockedString('Privacy Policy')}</x-link>
    </devtools-tooltip>
  `;
  // clang-format on
}

function renderFloatyContext(context: UI.Floaty.FloatyContextSelection): Lit.TemplateResult {
  if (context instanceof SDK.NetworkRequest.NetworkRequest) {
    return html`${context.url()}`;
  }

  if (context instanceof SDK.DOMModel.DOMNode) {
    return html`<devtools-widget .widgetConfig=${
        UI.Widget.widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, {node: context})}>`;
  }

  if ('insight' in context) {
    return html`${context.insight.title}`;
  }

  if ('event' in context && 'traceStartTime' in context) {
    const time = Trace.Types.Timing.Micro(context.event.ts - context.traceStartTime);
    return html`${context.event.name} @ ${i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(time)}`;
  }

  Platform.assertNever(context, 'Unsupported context');
}

function renderFloatyExtraContext(contexts: UI.Floaty.FloatyContextSelection[]): Lit.LitTemplate {
  if (!GreenDev.Prototypes.instance().isEnabled('inDevToolsFloaty')) {
    return Lit.nothing;
  }

  // clang-format off
  return html`
  <ul class="floaty">
    ${contexts.map(c => {
      function onDelete(e: MouseEvent): void {
        e.preventDefault();
        UI.Floaty.onFloatyContextDelete(c);
      }

      return html`<li>
        <span class="context-item">
          ${renderFloatyContext(c)}
        </span>
        <devtools-button
          class="floaty-delete-button"
          @click=${onDelete}
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
  </ul>
  `;
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

function renderContextIcon(context: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null): Lit.LitTemplate {
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
    return html`<devtools-icon name="performance" title="Performance"></devtools-icon>`;
  }
  if (item instanceof SDK.DOMModel.DOMNode) {
    return Lit.nothing;
  }
  return Lit.nothing;
}

function renderContextTitle(
    context: AiAssistanceModel.AiAgent.ConversationContext<unknown>, disabled: boolean): Lit.TemplateResult|string {
  const item = context.getItem();
  if (item instanceof SDK.DOMModel.DOMNode) {
    // FIXME: move this to the model code.
    const hiddenClassList = item.classNames().filter(
        className => className.startsWith(AiAssistanceModel.Injected.AI_ASSISTANCE_CSS_CLASS_NAME));
    return html`<devtools-widget .widgetConfig=${UI.Widget.widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, {
      node: item,
      options: {hiddenClassList, disabled}
    })}></devtools-widget>`;
  }
  return context.getTitle();
}

function renderSelection({
  selectedContext,
  inspectElementToggled,
  conversationType,
  isTextInputDisabled,
  onContextClick,
  onInspectElementClick,
}: {
  selectedContext: AiAssistanceModel.AiAgent.ConversationContext<unknown>|null,
  inspectElementToggled: boolean,
  isTextInputDisabled: boolean,
  onContextClick: () => void | Promise<void>,
  onInspectElementClick: () => void,
  conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType,
}): Lit.LitTemplate {
  if (!selectedContext) {
    return Lit.nothing;
  }
  // TODO: currently the picker behavior is SDKNode specific.
  const hasPickerBehavior = conversationType === AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING;

  const resourceClass = Lit.Directives.classMap({
    'not-selected': !selectedContext,
    'resource-link': true,
    'has-picker-behavior': hasPickerBehavior,
    disabled: isTextInputDisabled,
  });

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
      ${renderContextIcon(selectedContext)}
      <span class="title">${selectedContext ? renderContextTitle(selectedContext, isTextInputDisabled) : lockedString(UIStringsNotTranslate.noElementSelected)}</span>
    </div>
  </div>`;
  // clang-format on
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

function renderReadOnlySection({onNewConversation}: {
  onNewConversation: () => void,
}): Lit.LitTemplate {
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

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const chatInputContainerCls = Lit.Directives.classMap({
    'chat-input-container': true,
    'single-line-layout': !input.selectedContext,
    disabled: input.isTextInputDisabled,
  });

  if (input.isReadOnly) {
    Lit.render(
        html`<style>${chatInputStyles}</style>${renderReadOnlySection({onNewConversation: input.onNewConversation})}`,
        target);
    return;
  }

  // clang-format off
  Lit.render(html`
  <style>${Input.textInputStyles}</style>
  <style>${chatInputStyles}</style>
  <form class="input-form" @submit=${input.onSubmit}>
  ${renderFloatyExtraContext(input.additionalFloatyContext)}
    <div class=${chatInputContainerCls}>
      ${renderImageInput({
        multimodalInputEnabled: input.multimodalInputEnabled,
        imageInput: input.imageInput,
        isTextInputDisabled: input.isTextInputDisabled,
        onRemoveImageInput: input.onRemoveImageInput,
      })}
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
          ${renderSelection({
            selectedContext: input.selectedContext,
            inspectElementToggled: input.inspectElementToggled,
            conversationType: input.conversationType,
            isTextInputDisabled: input.isTextInputDisabled,
            onContextClick: input.onContextClick,
            onInspectElementClick: input.onInspectElementClick,
          })}
        </div>
        <div class="chat-input-actions-right">
          <div class="chat-input-disclaimer-container">
            ${renderRelevantDataDisclaimer({
              isLoading: input.isLoading,
              blockedByCrossOrigin: input.blockedByCrossOrigin,
              tooltipId: RELEVANT_DATA_LINK_CHAT_ID,
              disclaimerText: input.disclaimerText,
            })}
          </div>
          ${renderMultimodalInputButtons({
            multimodalInputEnabled: input.multimodalInputEnabled,
            blockedByCrossOrigin: input.blockedByCrossOrigin,
            isTextInputDisabled: input.isTextInputDisabled,
            imageInput: input.imageInput,
            uploadImageInputEnabled: input.uploadImageInputEnabled,
            onTakeScreenshot: input.onTakeScreenshot,
            onImageUpload: input.onImageUpload,
          })}
          ${renderChatInputButtons({
            isLoading: input.isLoading,
            blockedByCrossOrigin: input.blockedByCrossOrigin,
            isTextInputDisabled: input.isTextInputDisabled,
            isTextInputEmpty: input.isTextInputEmpty,
            imageInput: input.imageInput,
            onCancel: input.onCancel,
            onNewConversation: input.onNewConversation,
          })}
        </div>
      </div>
    </div>
  </form>`, target);
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
