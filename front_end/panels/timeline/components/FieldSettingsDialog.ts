// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import fieldSettingsDialogStyles from './fieldSettingsDialog.css.js';

const UIStrings = {
  /**
   * @description Text label for a button that opens a dialog to set up field data.
   */
  setUp: 'Set up',
  /**
   * @description Text label for a button that opens a dialog to configure field data.
   */
  configure: 'Configure',
  /**
   * @description Text label for a button that enables the collection of field data.
   */
  ok: 'Ok',
  /**
   * @description Text label for a button that opts out of the collection of field data.
   */
  optOut: 'Opt out',
  /**
   * @description Text label for a button that cancels the setup of field data collection.
   */
  cancel: 'Cancel',
  /**
   * @description Text label for a checkbox that controls if a manual URL override is enabled for field data.
   */
  onlyFetchFieldData: 'Only fetch field data for the below URL',
  /**
   * @description Text label for a text box that that contains the manual override URL for fetching field data.
   */
  url: 'URL',
  /**
   * @description Warning message explaining that the Chrome UX Report could not find enough real world speed data for the page.
   */
  doesNotHaveSufficientData: 'The Chrome UX Report does not have sufficient real-world speed data for this page.',
  /**
   * @description Title for a dialog that contains information and settings related to fetching field data.
   */
  configureFieldData: 'Configure field data fetching',
  /**
   * @description Paragraph explaining where field data comes from and and how it can be used. PH1 will be a link with text "Chrome UX Report" that is untranslated because it is a product name.
   * @example {Chrome UX Report} PH1
   */
  fetchAggregated:
      'Fetch aggregated field data from the {PH1} to help you contextualize local measurements with what real users experience on the site.',
  /**
   * @description Heading for a section that explains what user data needs to be collected to fetch field data.
   */
  privacyDisclosure: 'Privacy disclosure',
  /**
   * @description Paragraph explaining what data needs to be sent to Google to fetch field data, and when that data will be sent.
   */
  whenPerformanceIsShown:
      'When DevTools is open, the URLs you visit will be sent to Google to query field data. These requests are not tied to your Google account.',
  /**
   * @description Header for a section containing advanced settings
   */
  advanced: 'Advanced',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/FieldSettingsDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {html, nothing} = LitHtml;

export class ShowDialog extends Event {
  static readonly eventName = 'showdialog';

  constructor() {
    super(ShowDialog.eventName);
  }
}

export class FieldSettingsDialog extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-field-settings-dialog`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #dialog?: Dialogs.Dialog.Dialog;

  #configSetting = CrUXManager.CrUXManager.instance().getConfigSetting();

  #urlOverride: string = '';
  #urlOverrideEnabled: boolean = false;
  #showInvalidUrlWarning: boolean = false;

  constructor() {
    super();

    const cruxManager = CrUXManager.CrUXManager.instance();

    this.#configSetting = cruxManager.getConfigSetting();

    this.#pullFromSettings();

    this.#render();
  }

  #pullFromSettings(): void {
    this.#urlOverride = this.#configSetting.get().override;
    this.#urlOverrideEnabled = Boolean(this.#urlOverride);
    this.#showInvalidUrlWarning = false;
  }

  #flushToSetting(enabled: boolean): void {
    this.#configSetting.set({
      enabled,
      override: this.#urlOverrideEnabled ? this.#urlOverride : '',
    });
  }

  #onSettingsChanged(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  async #submit(enabled: boolean): Promise<void> {
    if (enabled && this.#urlOverrideEnabled) {
      const cruxManager = CrUXManager.CrUXManager.instance();
      const result = await cruxManager.getFieldDataForPage(this.#urlOverride);
      if (Object.values(result).every(v => !v)) {
        this.#showInvalidUrlWarning = true;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        return;
      }
    }
    this.#flushToSetting(enabled);
    this.#closeDialog();
  }

  #showDialog(): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    this.#pullFromSettings();
    void this.#dialog.setDialogVisible(true);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    this.dispatchEvent(new ShowDialog());
  }

  #closeDialog(evt?: Dialogs.Dialog.ClickOutsideDialogEvent): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    void this.#dialog.setDialogVisible(false);
    if (evt) {
      evt.stopImmediatePropagation();
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [fieldSettingsDialogStyles, Input.textInputStyles, Input.checkboxStyles];

    this.#configSetting.addChangeListener(this.#onSettingsChanged, this);

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  disconnectedCallback(): void {
    this.#configSetting.removeChangeListener(this.#onSettingsChanged, this);
  }

  #renderOpenButton(): LitHtml.LitTemplate {
    if (this.#configSetting.get().enabled) {
      // clang-format off
      return html`
        <${Buttons.Button.Button.litTagName}
          class="config-button"
          @click=${this.#showDialog}
          .data=${{
            variant: Buttons.Button.Variant.OUTLINED,
            title: i18nString(UIStrings.configure),
          } as Buttons.Button.ButtonData}
          jslogContext=${'field-data-configure'}
        >${i18nString(UIStrings.configure)}</${Buttons.Button.Button.litTagName}>
      `;
      // clang-format on
    }
    // clang-format off
    return html`
      <${Buttons.Button.Button.litTagName}
        class="setup-button"
        @click=${this.#showDialog}
        .data=${{
          variant: Buttons.Button.Variant.PRIMARY,
          title: i18nString(UIStrings.setUp),
        } as Buttons.Button.ButtonData}
        jslogContext=${'field-data-setup'}
      >${i18nString(UIStrings.setUp)}</${Buttons.Button.Button.litTagName}>
    `;
    // clang-format on
  }

  #renderEnableButton(): LitHtml.LitTemplate {
    // clang-format off
    return html`
      <${Buttons.Button.Button.litTagName}
        @click=${() => {
          void this.#submit(true);
        }}
        .data=${{
          variant: Buttons.Button.Variant.PRIMARY,
          title: i18nString(UIStrings.ok),
        } as Buttons.Button.ButtonData}
        jslogContext=${'field-data-enable'}
      >${i18nString(UIStrings.ok)}</${Buttons.Button.Button.litTagName}>
    `;
    // clang-format on
  }

  #renderDisableButton(): LitHtml.LitTemplate {
    const label = this.#configSetting.get().enabled ? i18nString(UIStrings.optOut) : i18nString(UIStrings.cancel);
    // clang-format off
    return html`
      <${Buttons.Button.Button.litTagName}
        @click=${() => {
          void this.#submit(false);
        }}
        .data=${{
          variant: Buttons.Button.Variant.OUTLINED,
          title: label,
        } as Buttons.Button.ButtonData}
        jslogContext=${'field-data-disable'}
      >${label}</${Buttons.Button.Button.litTagName}>
    `;
    // clang-format on
  }

  #onUrlOverrideChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.#urlOverride = input.value;
    this.#showInvalidUrlWarning = false;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onUrlOverrideEnabledChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.#urlOverrideEnabled = input.checked;
    this.#showInvalidUrlWarning = false;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #render = (): void => {
    // "Chrome UX Report" is intentionally left untranslated because it is a product name.
    const linkEl = UI.XLink.XLink.create('https://developer.chrome.com/docs/crux', 'Chrome UX Report');
    const descriptionEl = i18n.i18n.getFormatLocalizedString(str_, UIStrings.fetchAggregated, {PH1: linkEl});

    // clang-format off
    const output = html`
      <div class="open-button-section">${this.#renderOpenButton()}</div>
      <${Dialogs.Dialog.Dialog.litTagName}
        @clickoutsidedialog=${this.#closeDialog}
        .showConnector=${true}
        .position=${Dialogs.Dialog.DialogVerticalPosition.AUTO}
        .horizontalAlignment=${Dialogs.Dialog.DialogHorizontalAlignment.CENTER}
        .jslogContext=${'field-data-settings'}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#dialog = node as Dialogs.Dialog.Dialog;
        })}
      >
        <div class="content">
          <h2 class="title">${i18nString(UIStrings.configureFieldData)}</h2>
          <div>${descriptionEl}</div>
          <div class="privacy-disclosure">
            <h3 class="section-title">${i18nString(UIStrings.privacyDisclosure)}</h3>
            <div>${i18nString(UIStrings.whenPerformanceIsShown)}</div>
          </div>
          <details aria-label=${i18nString(UIStrings.advanced)}>
            <summary>${i18nString(UIStrings.advanced)}</summary>
            <label class="url-override">
              <input
                type="checkbox"
                .checked=${this.#urlOverrideEnabled}
                @change=${this.#onUrlOverrideEnabledChange}
                jslog=${VisualLogging.toggle().track({click: true}).context('field-url-override-enabled')}
              />
              ${i18nString(UIStrings.onlyFetchFieldData)}
            </label>
            <input
              type="text"
              @change=${this.#onUrlOverrideChange}
              @keyup=${this.#onUrlOverrideChange}
              class="devtools-text-input"
              .disabled=${!this.#urlOverrideEnabled}
              .value=${this.#urlOverride}
              placeholder=${i18nString(UIStrings.url)}
            />
            ${this.#showInvalidUrlWarning ? html`
              <div class="warning" role="alert" aria-label=${i18nString(UIStrings.doesNotHaveSufficientData)}>${i18nString(UIStrings.doesNotHaveSufficientData)}</div>
            ` : nothing}
          </details>
          <div class="buttons-section">
            ${this.#renderDisableButton()}
            ${this.#renderEnableButton()}
          </div>
        </div>
      </${Dialogs.Dialog.Dialog.litTagName}
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-field-settings-dialog', FieldSettingsDialog);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-field-settings-dialog': FieldSettingsDialog;
  }
}
