// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../../ui/components/icon_button/icon_button.js';
import '../../../../ui/components/tooltips/tooltips.js';
import '../../../../ui/components/spinners/spinners.js';

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Root from '../../../../core/root/root.js';
import * as AiAssistanceModels from '../../../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../../../ui/legacy/theme_support/theme_support.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as PanelCommon from '../../../common/common.js';
import type * as Utils from '../../utils/utils.js';

import entryLabelOverlayStyles from './entryLabelOverlay.css.js';

const {html, Directives} = Lit;

const UIStrings = {
  /**
   * @description Accessible label used to explain to a user that they are viewing an entry label.
   */
  entryLabel: 'Entry label',
  /**
   *@description Accessible label used to prompt the user to input text into the field.
   */
  inputTextPrompt: 'Enter an annotation label',
  /**
   *@description Text displayed on a button that generates an AI label.
   */
  generateLabelButton: 'Generate label',
  /**
   *@description Label used for screenreaders on the FRE dialog
   */
  freDialog: 'Get AI-powered annotation suggestions dialog',
  /**
   *@description Screen-reader text for a tooltip link for navigating to "AI innovations" settings where the user can learn more about auto-annotations.
   */
  learnMoreAriaLabel: 'Learn more about auto annotations in settings',
  /**
   *@description Screen-reader text for a tooltip icon.
   */
  moreInfoAriaLabel: 'More information about this feature',
} as const;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Tooltip link for the navigating to "AI innovations" page in settings.
   */
  learnMore: 'Learn more in settings',
  /**
   *@description Security disclaimer text displayed when the information icon on a button that generates an AI label is hovered.
   */
  generateLabelSecurityDisclaimer:
      'The selected call stack is sent to Google. The content you submit and that is generated by this feature will be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description Enterprise users with logging off - Security disclaimer text displayed when the information icon on a button that generates an AI label is hovered.
   */
  generateLabelSecurityDisclaimerLogginOff:
      'The selected call stack is sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   *@description The `Generate AI label button` tooltip disclaimer for when the feature is not available and the reason can be checked in settings.
   */
  autoAnnotationNotAvailableDisclaimer: 'Auto annotations are not available.',
  /**
   *@description The `Generate AI label button` tooltip disclaimer for when the feature is not available because the user is offline.
   */
  autoAnnotationNotAvailableOfflineDisclaimer: 'Auto annotations are not available because you are offline.',
  /**
   *@description Header text for the AI-powered annotations suggestions disclaimer dialog.
   */
  freDisclaimerHeader: 'Get AI-powered annotation suggestions',
  /**
   *@description Text shown when the AI-powered annotation is being generated.
   */
  generatingLabel: 'Generating label',
  /**
   *@description Text shown when the generation of the AI-powered annotation failed.
   */
  generationFailed: 'Generation failed',
  /**
   *@description First disclaimer item text for the fre dialog - AI won't always get it right.
   */
  freDisclaimerAiWontAlwaysGetItRight: 'This feature uses AI and won’t always get it right',
  /**
   *@description Second disclaimer item text for the fre dialog - trace data is sent to Google.
   */
  freDisclaimerPrivacyDataSentToGoogle: 'Performance trace is sent to Google to generate annotation suggestions',
  /**
   *@description Third disclaimer item text part for the fre dialog part - you can control this setting from the settings panel (because 'settings panel' part of the string is a link, it is attached separately).
   */
  freDisclaimerControlSettingFrom: 'You can control this feature in the',
  /**
   *@description Third disclaimer item text part for the fre dialog part - settings panel text.
   */
  settingsPanel: 'settings panel',
  /**
   *@description Text for the 'learn more' button displayed in fre.
   */
  learnMoreButton: 'Learn more about auto annotations',
} as const;

const enum AIButtonState {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  HIDDEN = 'hidden',
  GENERATION_FAILED = 'generation_failed',
  GENERATING_LABEL = 'generating_label',
}

const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/EntryLabelOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

function isAiAssistanceServerSideLoggingEnabled(): boolean {
  return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}

export class EntryLabelRemoveEvent extends Event {
  static readonly eventName = 'entrylabelremoveevent';

  constructor() {
    super(EntryLabelRemoveEvent.eventName);
  }
}

export class EntryLabelChangeEvent extends Event {
  static readonly eventName = 'entrylabelchangeevent';

  constructor(public newLabel: string) {
    super(EntryLabelChangeEvent.eventName);
  }
}

export class LabelAnnotationsConsentDialogVisibilityChange extends Event {
  static readonly eventName = 'labelannotationsconsentdialogvisiblitychange';
  constructor(public isVisible: boolean) {
    super(LabelAnnotationsConsentDialogVisibilityChange.eventName, {bubbles: true, composed: true});
  }
}

export class EntryLabelOverlay extends HTMLElement {
  // The label is angled on the left from the centre of the entry it belongs to.
  // `LABEL_AND_CONNECTOR_SHIFT_LENGTH` specifies how many pixels to the left it is shifted.
  static readonly LABEL_AND_CONNECTOR_SHIFT_LENGTH = 8;
  // Length of the line that connects the label to the entry.
  static readonly LABEL_CONNECTOR_HEIGHT = 7;
  // Set the max label length to avoid labels that could signicantly increase the file size.
  static readonly MAX_LABEL_LENGTH = 100;

  readonly #shadow = this.attachShadow({mode: 'open'});

  // Once a label is bound for deletion, we remove it from the DOM via events
  // that are dispatched. But in the meantime the blur event of the input box
  // can fire, and that triggers a second removal. So we set this flag after
  // the first removal to avoid a duplicate event firing which is a no-op but
  // causes errors when we try to delete an already deleted annotation.
  #isPendingRemoval = false;

  // The label is set to editable when it is double clicked. If the user clicks away from the label box
  // element, the label is set to not editable until it double clicked.s
  #isLabelEditable = true;
  #entryLabelVisibleHeight: number|null = null;

  #labelPartsWrapper: HTMLElement|null = null;
  #entryHighlightWrapper: HTMLElement|null = null;
  #inputField: HTMLElement|null = null;
  #connectorLineContainer: SVGAElement|null = null;
  #label: string;
  #shouldDrawBelowEntry: boolean;
  #richTooltip: Lit.Directives.Ref<HTMLElement> = Directives.createRef();

  /**
   * Required to generate a label with AI.
   */
  #callTree: Utils.AICallTree.AICallTree|null = null;
  // Creates or gets the setting if it exists.
  #aiAnnotationsEnabledSetting = Common.Settings.Settings.instance().createSetting('ai-annotations-enabled', false);
  #agent = new AiAssistanceModels.PerformanceAnnotationsAgent({
    aidaClient: new Host.AidaClient.AidaClient(),
    serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
  });
  /**
   * We track this because when the user is in this flow we don't want the
   * empty annotation label to be removed on blur, as we take them to the flow &
   * want to keep the label there for when they come back from the flow having
   * consented, hopefully!
   */
  #inAIConsentDialogFlow = false;
  #currAIButtonState: AIButtonState = AIButtonState.HIDDEN;

  /**
   * The entry label overlay consists of 3 parts - the label part with the label string inside,
   * the line connecting the label to the entry, and a black box around an entry to highlight the entry with a label.
   * ________
   * |_label__|                <-- label part with the label string inside
   *     \
   *      \                   <-- line connecting the label to the entry with a circle at the end
   *       \
   * _______◯_________
   * |_____entry______|         <--- box around an entry
   *
   * `drawLabel` method below draws the first part.
   * `drawConnector` method below draws the second part - the connector line with a circle and the svg container for them.
   * `drawEntryHighlightWrapper` draws the third part.
   * We only rerender the first part if the label changes and the third part if the size of the entry changes.
   * The connector and circle shapes never change so we only draw the second part when the component is created.
   *
   * Otherwise, the entry label overlay object only gets repositioned.
   */

  constructor(label: string, shouldDrawBelowEntry = false) {
    super();
    this.#render();
    this.#shouldDrawBelowEntry = shouldDrawBelowEntry;
    this.#labelPartsWrapper = this.#shadow.querySelector<HTMLElement>('.label-parts-wrapper');
    this.#inputField = this.#labelPartsWrapper?.querySelector<HTMLElement>('.input-field') ?? null;
    this.#connectorLineContainer = this.#labelPartsWrapper?.querySelector<SVGAElement>('.connectorContainer') ?? null;
    this.#entryHighlightWrapper =
        this.#labelPartsWrapper?.querySelector<HTMLElement>('.entry-highlight-wrapper') ?? null;
    this.#label = label;
    this.#drawLabel(label);
    // If the label is not empty, it was loaded from the trace file.
    // In that case, do not auto-focus it as if the user were creating it for the first time
    if (label !== '') {
      this.setLabelEditabilityAndRemoveEmptyLabel(false);
    }
    const ariaLabel = label === '' ? i18nString(UIStrings.inputTextPrompt) : label;
    this.#inputField?.setAttribute('aria-label', ariaLabel);

    this.#drawConnector();
  }

  /**
   * So we can provide a mocked agent in tests. Do not call this method outside of a test!
   */
  overrideAIAgentForTest(agent: AiAssistanceModels.PerformanceAnnotationsAgent): void {
    this.#agent = agent;
  }

  entryHighlightWrapper(): HTMLElement|null {
    return this.#entryHighlightWrapper;
  }

  #handleLabelInputKeyUp(): void {
    // If the label changed on key up, dispatch label changed event.
    const labelBoxTextContent = this.#inputField?.textContent?.trim() ?? '';
    if (labelBoxTextContent !== this.#label) {
      this.#label = labelBoxTextContent;
      this.dispatchEvent(new EntryLabelChangeEvent(this.#label));
      // Dispatch a fake change event; because we use contenteditable rather than an input, this event does not fire.
      // But we want to listen to the change event in the VE logs, so we dispatch it here.
      this.#inputField?.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
    }
    this.#setAIButtonRenderState();
    // Rerender the label component when the label text changes because we need to
    // make sure the 'auto annotation' button is only shown when the label is empty.
    this.#render();
    this.#inputField?.setAttribute('aria-label', labelBoxTextContent);
  }

  #handleLabelInputKeyDown(event: KeyboardEvent): boolean {
    if (!this.#inputField) {
      return false;
    }

    const allowedKeysAfterReachingLenLimit = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
    ];

    // We do not want to create multi-line labels.
    // Therefore, if the new key is `Enter` key, treat it
    // as the end of the label input and blur the input field.
    if ((event.key === Platform.KeyboardUtilities.ENTER_KEY || event.key === Platform.KeyboardUtilities.ESCAPE_KEY) &&
        this.#isLabelEditable) {
      // Note that we do not stop the event propagating here; this is on
      // purpose because we need it to bubble up into TimelineFlameChartView's
      // handler. That updates the state and deals with the keydown.
      // In theory blur() should call the blur event listener, which in turn
      // calls the setLabelEditabilityAndRemoveEmptyLabel method. However, we
      // have seen this not work as part of the AI FRE flow where the privacy
      // consent dialog is shown, which takes focus away from the input and
      // causes the blur() to be a no-op. It's not entirely clear why this
      // happens as visually it renders as focused, but as a back-up we call
      // the setLabelEditabilityAndRemoveEmptyLabel method manually. It won't
      // do anything if the editable state matches what is passed in, so it's
      // safe to call this just in case the blur() didn't actually trigger.
      this.#inputField.blur();
      this.setLabelEditabilityAndRemoveEmptyLabel(false);
      return false;
    }

    // If the max limit is not reached, return true
    if (this.#inputField.textContent !== null &&
        this.#inputField.textContent.length <= EntryLabelOverlay.MAX_LABEL_LENGTH) {
      return true;
    }

    if (allowedKeysAfterReachingLenLimit.includes(event.key)) {
      return true;
    }

    if (event.key.length === 1 && event.ctrlKey /* Ctrl + A for selecting all */) {
      return true;
    }

    event.preventDefault();
    return false;
  }

  #handleLabelInputPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const clipboardData = event.clipboardData;
    if (!clipboardData || !this.#inputField) {
      return;
    }

    // Remove newline characters to ensure single-line paste.
    const pastedText = clipboardData.getData('text').replace(/(\r\n|\n|\r)/gm, '');
    const newText = this.#inputField.textContent + pastedText;
    const trimmedText = newText.slice(0, EntryLabelOverlay.MAX_LABEL_LENGTH + 1);
    this.#inputField.textContent = trimmedText;
    this.#placeCursorAtInputEnd();
  }

  set entryLabelVisibleHeight(entryLabelVisibleHeight: number) {
    this.#entryLabelVisibleHeight = entryLabelVisibleHeight;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    // If the label is editable, focus cursor on it.
    // This method needs to be called after rendering the wrapper because it is the last label overlay element to render.
    // By doing this, the cursor focuses when the label is created.
    if (this.#isLabelEditable) {
      this.#focusInputBox();
    }
    // The label and connector can move depending on the height of the entry
    this.#drawLabel();
    this.#drawConnector();
  }

  #drawConnector(): void {
    if (!this.#connectorLineContainer) {
      console.error('`connectorLineContainer` element is missing.');
      return;
    }

    if (this.#shouldDrawBelowEntry && this.#entryLabelVisibleHeight) {
      const translation = this.#entryLabelVisibleHeight + EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT;

      this.#connectorLineContainer.style.transform = `translateY(${translation}px) rotate(180deg)`;
    }

    const connector = this.#connectorLineContainer.querySelector('line');
    const circle = this.#connectorLineContainer.querySelector('circle');
    if (!connector || !circle) {
      console.error('Some entry label elements are missing.');
      return;
    }
    // PART 2: draw the connector from label to the entry
    // Set the width of the canvas that draws the connector to be equal to the length of the shift multiplied by two.
    // That way, we can draw the connector from its corner to its middle. Since all elements are aligned in the middle, the connector
    // will end in the middle of the entry.
    this.#connectorLineContainer.setAttribute(
        'width', (EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH * 2).toString());
    this.#connectorLineContainer.setAttribute('height', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    // Start drawing the top right corner.
    connector.setAttribute('x1', '0');
    connector.setAttribute('y1', '0');
    // Finish drawing in middle of the connector container.
    connector.setAttribute('x2', EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH.toString());
    connector.setAttribute('y2', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    const connectorColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
    connector.setAttribute('stroke', connectorColor);
    connector.setAttribute('stroke-width', '2');

    // Draw the circle at the bottom of the connector
    circle.setAttribute('cx', EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH.toString());
    // Add one to the offset of the circle which positions it perfectly centered on the border of the overlay.
    circle.setAttribute('cy', (EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT + 1).toString());
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', connectorColor);
  }

  #drawLabel(initialLabel?: string): void {
    if (!this.#inputField) {
      console.error('`labelBox`element is missing.');
      return;
    }

    if (typeof initialLabel === 'string') {
      this.#inputField.innerText = initialLabel;
    }

    let xTranslation: number|null = null;
    let yTranslation: number|null = null;
    // PART 1: draw the label box
    if (this.#shouldDrawBelowEntry) {
      // Label is drawn below and slightly to the right.
      xTranslation = EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH;
    } else {
      // If the label is drawn above, the connector goes up and to the left, so
      // we pull the label back slightly to align it nicely.
      xTranslation = EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH * -1;
    }

    if (this.#shouldDrawBelowEntry && this.#entryLabelVisibleHeight) {
      // Move the label down from above the entry to below it. The label is positioned by default quite far above the entry, hence why we add:
      // 1. the height of the entry + of the label (inc its padding)
      // 2. the height of the connector (*2), so we have room to draw it
      const verticalTransform = this.#entryLabelVisibleHeight + (EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT * 2) +
          this.#inputField?.offsetHeight;

      yTranslation = verticalTransform;
    }

    let transformString = '';
    if (xTranslation) {
      transformString += `translateX(${xTranslation}px) `;
    }
    if (yTranslation) {
      transformString += `translateY(${yTranslation}px)`;
    }

    if (transformString.length) {
      this.#inputField.style.transform = transformString;
    }
  }

  #focusInputBox(): void {
    if (!this.#inputField) {
      console.error('`labelBox` element is missing.');
      return;
    }
    this.#inputField.focus();
  }

  setLabelEditabilityAndRemoveEmptyLabel(editable: boolean): void {
    // We skip this if we have taken the user to the AI FRE flow, because we want the label still there when they come back.
    if (this.#inAIConsentDialogFlow && editable === false) {
      return;
    }

    // Set an attribute on the host; this is used in the overlays CSS to bring
    // the focused, editable label to the top above any others.
    if (editable) {
      this.setAttribute('data-user-editing-label', 'true');
    } else {
      this.removeAttribute('data-user-editing-label');
    }

    this.#isLabelEditable = editable;
    this.#render();
    // If the label is editable, focus cursor on it & put the cursor at the end
    if (editable && this.#inputField) {
      this.#placeCursorAtInputEnd();
      this.#focusInputBox();
    }
    // On MacOS when clearing the input box it is left with a new line, so we
    // trim the string to remove any accidental trailing whitespace.
    const newLabelText = this.#inputField?.textContent?.trim() ?? '';
    // If the label is empty when it is being navigated away from, dispatch an event to remove this entry overlay
    if (!editable && newLabelText.length === 0 && !this.#isPendingRemoval) {
      this.#isPendingRemoval = true;
      this.dispatchEvent(new EntryLabelRemoveEvent());
    }
  }

  /**
   * Places the user's cursor at the end of the input. We do this when the user
   * focuses the input with either the keyboard or mouse, and when they paste in
   * text, so that the cursor is placed in a useful position to edit.
   */
  #placeCursorAtInputEnd(): void {
    if (!this.#inputField) {
      return;
    }
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(this.#inputField);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  set callTree(callTree: Utils.AICallTree.AICallTree|null) {
    this.#callTree = callTree;
    // If the entry has a calltree, we need to check if we need to show the 'generate label' button.
    this.#setAIButtonRenderState();
  }

  // Generate the AI label suggestion if:
  // 1. the user has already already seen the fre dialog and confirmed the feature usage
  // or
  // 2. turned on the `generate AI labels` setting through the AI settings panel
  //
  // Otherwise, show the fre dialog with a 'Got it' button that turns the setting on.
  async #handleAiButtonClick(): Promise<void> {
    if (this.#aiAnnotationsEnabledSetting.get()) {
      if (!this.#callTree || !this.#inputField) {
        // Shouldn't happen as we only show the Generate UI when we have this, but this satisfies TS.
        return;
      }
      try {
        // Trigger a re-render to display the loading component in the place of the button when the label is being generated.
        this.#currAIButtonState = AIButtonState.GENERATING_LABEL;
        UI.ARIAUtils.LiveAnnouncer.alert(UIStringsNotTranslate.generatingLabel);
        // Trigger a re-render to put focus back on the input box, otherwise
        // when the button changes to a loading spinner, it loses focus and the
        // editing state is reset because the component loses focus.
        this.#render();
        this.#focusInputBox();
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);

        this.#label = await this.#agent.generateAIEntryLabel(this.#callTree);
        this.dispatchEvent(new EntryLabelChangeEvent(this.#label));
        this.#inputField.innerText = this.#label;
        this.#placeCursorAtInputEnd();
        // Reset the button state because we want to hide it if the label is not empty.
        this.#setAIButtonRenderState();
        // Trigger a re-render to hide the AI Button and display the generated label.
        this.#render();
      } catch {
        this.#currAIButtonState = AIButtonState.GENERATION_FAILED;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
      }
    } else {
      this.#inAIConsentDialogFlow = true;
      this.#render();
      const hasConsented = await this.#showUserAiFirstRunDialog();
      this.#inAIConsentDialogFlow = false;
      // This makes sure we put the user back in the editable state.
      this.setLabelEditabilityAndRemoveEmptyLabel(true);
      // If the user has consented, we now want to call this function again so
      // the label generation happens without them having to click the button
      // again.
      if (hasConsented) {
        await this.#handleAiButtonClick();
      }
    }
  }

  /**
   * @returns `true` if the user has now consented, and `false` otherwise.
   */
  async #showUserAiFirstRunDialog(): Promise<boolean> {
    this.dispatchEvent(new LabelAnnotationsConsentDialogVisibilityChange(true));
    const userConsented = await PanelCommon.FreDialog.show({
      ariaLabel: i18nString(UIStrings.freDialog),
      header: {iconName: 'pen-spark', text: lockedString(UIStringsNotTranslate.freDisclaimerHeader)},
      reminderItems: [
        {
          iconName: 'psychiatry',
          content: lockedString(UIStringsNotTranslate.freDisclaimerAiWontAlwaysGetItRight),
        },
        {
          iconName: 'google',
          content: lockedString(UIStringsNotTranslate.freDisclaimerPrivacyDataSentToGoogle),
        },
        {
          iconName: 'gear',
          // clang-format off
          content: html`
            ${lockedString(UIStringsNotTranslate.freDisclaimerControlSettingFrom)}
            <button
              @click=${() => {
                void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
              }}
              class="link"
              role="link"
              jslog=${VisualLogging.link('open-ai-settings').track({
                click: true
              })}
              tabindex="0"
            >${lockedString(UIStringsNotTranslate.settingsPanel)}</button>`,
          // clang-format on
        },
      ],
      onLearnMoreClick: () => {
        UI.UIUtils.openInNewTab('https://developer.chrome.com/docs/devtools/performance/annotations#auto-annotations');
      },
      learnMoreButtonTitle: UIStringsNotTranslate.learnMoreButton,
    });
    this.dispatchEvent(new LabelAnnotationsConsentDialogVisibilityChange(false));

    if (userConsented) {
      this.#aiAnnotationsEnabledSetting.set(true);
    }
    return this.#aiAnnotationsEnabledSetting.get();
  }

  #setAIButtonRenderState(): void {
    const hasAiExperiment = Boolean(Root.Runtime.hostConfig.devToolsAiGeneratedTimelineLabels?.enabled);
    const aiDisabledByEnterprisePolicy = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.DISABLE;
    // If the call tree is not available, the entry is in a track other than the main track.
    // Therefore, hide the button because, at the moment, the label can only be generated for main tracks
    const dataToGenerateLabelAvailable = this.#callTree !== null;
    /**
     * Right now if the user "retries" the AI label generation the result will
     * be almost identical because we don't change the input data or prompt. So
     * we only show the generate button if the label is empty.
     */
    const labelIsEmpty = this.#label?.length <= 0;

    if (!hasAiExperiment || aiDisabledByEnterprisePolicy || !dataToGenerateLabelAvailable || !labelIsEmpty) {
      this.#currAIButtonState = AIButtonState.HIDDEN;
    } else {
      // To verify whether AI can be used, check if aida is available, the user is logged in, over 18, in a supported
      // location and offline.
      const aiAvailable = Root.Runtime.hostConfig.aidaAvailability?.enabled &&
          !Root.Runtime.hostConfig.aidaAvailability?.blockedByAge &&
          !Root.Runtime.hostConfig.aidaAvailability?.blockedByGeo && navigator.onLine;
      if (aiAvailable) {
        this.#currAIButtonState = AIButtonState.ENABLED;
      } else {
        // If AI features are not available, we show a disabled button.
        this.#currAIButtonState = AIButtonState.DISABLED;
      }
    }
  }

  #renderAITooltip(opts: {textContent: string, includeSettingsButton: boolean}): Lit.TemplateResult {
    // clang-format off
    return html`<devtools-tooltip
    variant="rich"
    id="info-tooltip"
    ${Directives.ref(this.#richTooltip)}>
      <div class="info-tooltip-container">
        ${opts.textContent} ${opts.includeSettingsButton ? html`
          <button
            class="link tooltip-link"
            role="link"
            jslog=${VisualLogging.link('open-ai-settings').track({
              click: true,
            })}
            @click=${this.#onTooltipLearnMoreClick}
            aria-label=${i18nString(UIStrings.learnMoreAriaLabel)}
          >${lockedString(UIStringsNotTranslate.learnMore)}</button>
        ` : Lit.nothing}
      </div>
    </devtools-tooltip>`;
    // clang-format on
  }
  #renderGeneratingLabelAiButton(): Lit.LitTemplate {
    // clang-format off
      return html`
      <span
        class="ai-label-loading">
        <devtools-spinner></devtools-spinner>
        <span class="generate-label-text">${lockedString(UIStringsNotTranslate.generatingLabel)}</span>
      </span>
    `;
    // clang-format on
  }

  #renderAiButton(): Lit.LitTemplate {
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;

    if (this.#currAIButtonState === AIButtonState.GENERATION_FAILED) {
      // Only show the error message on the first component render render after the failure.
      // clang-format off
      return html`
        <span
          class="ai-label-error">
          <devtools-icon
            class="warning"
            .name=${'warning'}
            .data=${{
            iconName: 'warning', color: 'var(--ref-palette-error50)', width: '20px'}}>
          </devtools-icon>
          <span class="generate-label-text">${lockedString(UIStringsNotTranslate.generationFailed)}</span>
        </span>
      `;
      // clang-format on
    }
    // clang-format off
    return html`
      <!-- 'preventDefault' on the AI label button to prevent the label removal on blur  -->
      <span
        class="ai-label-button-wrapper only-pen-wrapper"
        @mousedown=${(e: Event) => e.preventDefault()}>
        <button
          class="ai-label-button enabled"
          @click=${this.#handleAiButtonClick}>
          <devtools-icon
            class="pen-icon"
            .name=${'pen-spark'}
            .data=${{
            iconName: 'pen-spark', color: 'var(--color-primary)', width: '20px'}}>
          </devtools-icon>
          <span class="generate-label-text">${i18nString(UIStrings.generateLabelButton)}</span>
        </button>
        <devtools-button
          aria-details="info-tooltip"
          class="pen-icon"
          .title=${i18nString(UIStrings.moreInfoAriaLabel)}
          .iconName=${'info'}
          .variant=${Buttons.Button.Variant.ICON}
          ></devtools-button>
        ${this.#renderAITooltip({
         textContent: noLogging ? lockedString(UIStringsNotTranslate.generateLabelSecurityDisclaimerLogginOff) : lockedString(UIStringsNotTranslate.generateLabelSecurityDisclaimer),
         includeSettingsButton: true,
        })}
      </span>
    `;
    // clang-format on
  }

  #onTooltipLearnMoreClick(): void {
    this.#richTooltip?.value?.hidePopover();
    void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
  }

  // The disabled button rendered when the `generate AI label` feature is not available
  // because of the geolocation, age or if they are not logged in into the google account.
  //
  // If the user is offline, display the same button with a different tooltip.
  #renderDisabledAiButton(): Lit.TemplateResult {
    const noConnection = navigator.onLine === false;
    // clang-format off
    return html`
      <!-- 'preventDefault' on the AI label button to prevent the label removal on blur  -->
      <span
        class="ai-label-disabled-button-wrapper only-pen-wrapper"
        @mousedown=${(e: Event) => e.preventDefault()}>
        <button
          class="ai-label-button disabled"
          ?disabled=${true}
          @click=${this.#handleAiButtonClick}>
          <devtools-icon
            aria-details="info-tooltip"
            class="pen-icon"
            .name=${'pen-spark'}
            .data=${{
            iconName: 'pen-spark', color: 'var(--sys-color-state-disabled)', width: '20px'}}>
          </devtools-icon>
        </button>
        ${this.#renderAITooltip({
          textContent: noConnection ? lockedString(UIStringsNotTranslate.autoAnnotationNotAvailableOfflineDisclaimer) : lockedString(UIStringsNotTranslate.autoAnnotationNotAvailableDisclaimer),
          includeSettingsButton: !noConnection,
        })}
      </span>
    `;
    // clang-format on
  }

  #handleFocusOutEvent(event: FocusEvent): void {
    /**
     * Usually when the text box loses focus, we want to stop the edit mode and
     * just display the annotation. However, if the user tabs from the text box
     * to focus the GenerateAI button, we need to ensure that we do not exit
     * edit mode. The only reliable method is to listen to the focusout event
     * (which bubbles, unlike `blur`) on the parent.
     */
    const relatedTarget = event.relatedTarget as Node | null;
    // If the related target is null, it means the focus has left the browser
    // window. If it's not null, we check if the new focused element is a
    // descendant of this component's shadow root. If it is, we don't do anything.
    if (relatedTarget && this.#shadow.contains(relatedTarget)) {
      return;
    }
    this.setLabelEditabilityAndRemoveEmptyLabel(false);
  }

  #render(): void {
    const inputFieldClasses = Lit.Directives.classMap({
      'input-field': true,
      // When the consent modal pops up, we want the input to look like it has focus so it visually doesn't change.
      // Once the consent flow is closed, we restore focus and maintain the appearance.
      'fake-focus-state': this.#inAIConsentDialogFlow,
    });
    // clang-format off
    Lit.render(
        html`
        <style>${entryLabelOverlayStyles}</style>
        <span class="label-parts-wrapper" role="region" aria-label=${i18nString(UIStrings.entryLabel)}
          @focusout=${this.#handleFocusOutEvent}
        >
          <span
            class="label-button-input-wrapper">
            <span
              class=${inputFieldClasses}
              role="textbox"
              @focus=${() => {
                this.setLabelEditabilityAndRemoveEmptyLabel(true);
              }}
              @dblclick=${() => {
                this.setLabelEditabilityAndRemoveEmptyLabel(true);
              }}
              @keydown=${this.#handleLabelInputKeyDown}
              @paste=${this.#handleLabelInputPaste}
              @input=${this.#handleLabelInputKeyUp}
              contenteditable=${this.#isLabelEditable ? 'plaintext-only' : false}
              jslog=${VisualLogging.textField('timeline.annotations.entry-label-input').track({keydown: true, click: true, change: true})}
              tabindex="0"
            ></span>
            ${this.#isLabelEditable && this.#inputField?.innerText !== '' ? html`
              <button
                class="delete-button"
                @click=${() => this.dispatchEvent(new EntryLabelRemoveEvent())}
                jslog=${VisualLogging.action('timeline.annotations.delete-entry-label').track({click: true})}>
              <devtools-icon
                .data=${{
                  iconName: 'cross',
                  color: 'var(--color-background)',
                  width: '14px',
                  height: '14px'
                }}
              ></devtools-icon>
              </button>
            ` : Lit.nothing}
            ${(() => {
              switch (this.#currAIButtonState) {
                case AIButtonState.HIDDEN:
                  return Lit.nothing;
                case AIButtonState.ENABLED:
                  return this.#renderAiButton();
                case AIButtonState.GENERATING_LABEL:
                  return this.#renderGeneratingLabelAiButton();
                case AIButtonState.GENERATION_FAILED:
                  return this.#renderAiButton();
                case AIButtonState.DISABLED:
                  return this.#renderDisabledAiButton();
              }
            })()}
          </span>
          <svg class="connectorContainer">
            <line/>
            <circle/>
          </svg>
          <div class="entry-highlight-wrapper"></div>
        </span>`,
        this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-entry-label-overlay', EntryLabelOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-entry-label-overlay': EntryLabelOverlay;
  }
}
