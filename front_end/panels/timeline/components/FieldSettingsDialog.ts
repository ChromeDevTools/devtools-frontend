// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Input from '../../../ui/components/input/input.js';
import * as uiI18n from '../../../ui/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import fieldSettingsDialogStyles from './fieldSettingsDialog.css.js';
import {OriginMap} from './OriginMap.js';

const UIStrings = {
  /**
   * @description Button label that opens a dialog to set up field metrics in the Performance panel.
   */
  setUp: 'Set up',
  /**
   * @description Button label that opens a dialog to configure field metrics in the Performance panel.
   */
  configure: 'Configure',
  /**
   * @description Button label that enables the collection of field metrics in the Performance panel.
   */
  ok: 'Ok',
  /**
   * @description Button label that opts out of the collection of field metrics in the Performance panel.
   */
  optOut: 'Opt out',
  /**
   * @description Button label that cancels the setup of field metrics collection in the Performance panel.
   */
  cancel: 'Cancel',
  /**
   * @description Checkbox label that controls if a manual URL override is enabled for field metrics in the Performance panel.
   */
  onlyFetchFieldData: 'Always show field metrics for the below URL',
  /**
   * @description Label for a text input that contains the manual override URL for fetching field metrics in the Performance panel.
   */
  url: 'URL',
  /**
   * @description Warning message explaining that the Chrome UX Report could not find enough real-world speed data for the page in the Performance panel.
   */
  doesNotHaveSufficientData: 'The Chrome UX Report doesn’t have enough real-world speed data for this page.',
  /**
   * @description Title for a dialog that contains settings related to fetching field metrics in the Performance panel.
   */
  configureFieldData: 'Configure field metrics fetching',
  /**
   * @description Explanation of where field metrics come from and how they can be used in the Performance panel.
   * @example {Chrome UX Report} PH1
   */
  fetchAggregated:
      'Fetch aggregated field metrics from the {PH1} to help you contextualize local measurements with what real users experience on the site.',
  /**
   * @description Heading for a section that explains what user data needs to be collected to fetch field metrics in the Performance panel.
   */
  privacyDisclosure: 'Privacy disclosure',
  /**
   * @description Explanation of what data is sent to Google to fetch field metrics in the Performance panel.
   */
  whenPerformanceIsShown:
      'When DevTools is open, the URLs you visit will be sent to Google to query field metrics. These requests aren’t tied to your Google account.',
  /**
   * @description Header for a section containing advanced settings in the Performance panel.
   */
  advanced: 'Advanced',
  /**
   * @description Explanation of how associating a development origin with a production origin works for fetching real user data in the Performance panel.
   */
  mapDevelopmentOrigins:
      'Set a development origin to automatically get relevant field metrics for its production origin.',
  /**
   * @description Button label to add a new editable row to the origin mapping table in the Performance panel.
   */
  new: 'New',
  /**
   * @description Warning message explaining that an entered origin is not a valid origin or URL in the Performance panel.
   * @example {http//malformed.com} PH1
   */
  invalidOrigin: '"{PH1}" isn’t a valid origin or URL.',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/FieldSettingsDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {html, nothing, Directives: {ifDefined}} = Lit;
const {widget, widgetRef} = UI.Widget;

export class ShowDialog extends Event {
  static readonly eventName = 'showdialog';

  constructor() {
    super(ShowDialog.eventName);
  }
}

export class FieldSettingsDialog extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #dialog?: Dialogs.Dialog.Dialog;

  #configSetting = CrUXManager.CrUXManager.instance().getConfigSetting();

  #urlOverride = '';
  #urlOverrideEnabled = false;
  #urlOverrideWarning = '';
  #originMap?: OriginMap;

  constructor() {
    super();

    const cruxManager = CrUXManager.CrUXManager.instance();

    this.#configSetting = cruxManager.getConfigSetting();

    this.#resetToSettingState();

    this.#render();
  }

  #resetToSettingState(): void {
    const configSetting = this.#configSetting.get();
    this.#urlOverride = configSetting.override || '';
    this.#urlOverrideEnabled = configSetting.overrideEnabled || false;
    this.#urlOverrideWarning = '';
  }

  #flushToSetting(enabled: boolean): void {
    const value = this.#configSetting.get();
    this.#configSetting.set({
      ...value,
      enabled,
      override: this.#urlOverride,
      overrideEnabled: this.#urlOverrideEnabled,
    });
  }

  #onSettingsChanged(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  async #urlHasFieldData(url: string): Promise<boolean> {
    const cruxManager = CrUXManager.CrUXManager.instance();
    const result = await cruxManager.getFieldDataForPage(url);
    return Object.entries(result).some(([key, value]) => {
      if (key === 'warnings') {
        return false;
      }
      return Boolean(value);
    });
  }

  async #submit(enabled: boolean): Promise<void> {
    if (enabled && this.#urlOverrideEnabled) {
      const origin = this.#getOrigin(this.#urlOverride);
      if (!origin) {
        this.#urlOverrideWarning = i18nString(UIStrings.invalidOrigin, {PH1: this.#urlOverride});
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        return;
      }

      const hasFieldData = await this.#urlHasFieldData(this.#urlOverride);
      if (!hasFieldData) {
        this.#urlOverrideWarning = i18nString(UIStrings.doesNotHaveSufficientData);
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
    this.#resetToSettingState();
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
    this.#configSetting.addChangeListener(this.#onSettingsChanged, this);

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  disconnectedCallback(): void {
    this.#configSetting.removeChangeListener(this.#onSettingsChanged, this);
  }

  #renderOpenButton(): Lit.LitTemplate {
    if (this.#configSetting.get().enabled) {
      // clang-format off
      return html`
        <devtools-button
          class="config-button"
          @click=${this.#showDialog}
          .data=${{
            variant: Buttons.Button.Variant.OUTLINED,
            title: i18nString(UIStrings.configure),
          } as Buttons.Button.ButtonData}
        jslog=${VisualLogging.action('timeline.field-data.configure').track({click: true})}
        >${i18nString(UIStrings.configure)}</devtools-button>
      `;
      // clang-format on
    }
    // clang-format off
    return html`
      <devtools-button
        class="setup-button"
        @click=${this.#showDialog}
        .data=${{
          variant: Buttons.Button.Variant.PRIMARY,
          title: i18nString(UIStrings.setUp),
        } as Buttons.Button.ButtonData}
        jslog=${VisualLogging.action('timeline.field-data.setup').track({click: true})}
        data-field-data-setup
      >${i18nString(UIStrings.setUp)}</devtools-button>
    `;
    // clang-format on
  }

  #renderEnableButton(): Lit.LitTemplate {
    // clang-format off
    return html`
      <devtools-button
        @click=${() => {
          void this.#submit(true);
        }}
        .data=${{
          variant: Buttons.Button.Variant.PRIMARY,
          title: i18nString(UIStrings.ok),
        } as Buttons.Button.ButtonData}
        class="enable"
        jslog=${VisualLogging.action('timeline.field-data.enable').track({click: true})}
        data-field-data-enable
      >${i18nString(UIStrings.ok)}</devtools-button>
    `;
    // clang-format on
  }

  #renderDisableButton(): Lit.LitTemplate {
    const label = this.#configSetting.get().enabled ? i18nString(UIStrings.optOut) : i18nString(UIStrings.cancel);
    // clang-format off
    return html`
      <devtools-button
        @click=${() => {
          void this.#submit(false);
        }}
        .data=${{
          variant: Buttons.Button.Variant.OUTLINED,
          title: label,
        } as Buttons.Button.ButtonData}
        jslog=${VisualLogging.action('timeline.field-data.disable').track({click: true})}
        data-field-data-disable
      >${label}</devtools-button>
    `;
    // clang-format on
  }

  #onUrlOverrideChange(event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.#urlOverride = input.value;
    this.#urlOverrideWarning = '';
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onUrlOverrideEnabledChange(event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.#urlOverrideEnabled = input.checked;
    this.#urlOverrideWarning = '';
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #getOrigin(url: string): string|null {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }

  #renderOriginMapGrid(): Lit.LitTemplate {
    // clang-format off
    return html`
      <div class="origin-mapping-description">${i18nString(UIStrings.mapDevelopmentOrigins)}</div>
      <devtools-widget ${widget(OriginMap)} ${widgetRef(OriginMap, el => { this.#originMap = el; })}>
      </devtools-widget>
      <div class="origin-mapping-button-section">
        <devtools-button
          @click=${() => this.#originMap?.startCreation()}
          .data=${{
            variant: Buttons.Button.Variant.TEXT,
            title: i18nString(UIStrings.new),
            iconName: 'plus',
          } as Buttons.Button.ButtonData}
          jslogContext="new-origin-mapping"
        >${i18nString(UIStrings.new)}</devtools-button>
      </div>
    `;
    // clang-format on
  }

  #render = (): void => {
    // clang-format off
    const output = html`
      <style>${fieldSettingsDialogStyles}</style>
      <style>${Input.textInputStyles}</style>
      <style>${Input.checkboxStyles}</style>
      <div class="open-button-section">${this.#renderOpenButton()}</div>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        .position=${Dialogs.Dialog.DialogVerticalPosition.AUTO}
        .horizontalAlignment=${Dialogs.Dialog.DialogHorizontalAlignment.CENTER}
        .jslogContext=${'timeline.field-data.settings'}
        .expectedMutationsSelector=${'.timeline-settings-pane option'}
        .dialogTitle=${i18nString(UIStrings.configureFieldData)}
        ${Lit.Directives.ref(el => {
          if (el instanceof HTMLElement) {
            this.#dialog = el as Dialogs.Dialog.Dialog;
          }
        })}
      >
        <div class="content">
          <div>
            ${uiI18n.getFormatLocalizedStringTemplate(
              str_,
              UIStrings.fetchAggregated,
              {
                PH1: html`<devtools-link
                  href="https://developer.chrome.com/docs/crux"
                  >${i18n.i18n.lockedString('Chrome UX Report')}</devtools-link
                >`,
              },
            )}
          </div>
          <div class="privacy-disclosure">
            <h3 class="section-title">${i18nString(UIStrings.privacyDisclosure)}</h3>
            <div>${i18nString(UIStrings.whenPerformanceIsShown)}</div>
          </div>
          <details aria-label=${i18nString(UIStrings.advanced)}>
            <summary>${i18nString(UIStrings.advanced)}</summary>
            <div class="advanced-section-contents">
              ${this.#renderOriginMapGrid()}
              <hr class="divider">
              <label class="url-override">
                <input
                  type="checkbox"
                  .checked=${this.#urlOverrideEnabled}
                  @change=${this.#onUrlOverrideEnabledChange}
                  aria-label=${i18nString(UIStrings.onlyFetchFieldData)}
                  jslog=${VisualLogging.toggle().track({click: true}).context('field-url-override-enabled')}
                />
                ${i18nString(UIStrings.onlyFetchFieldData)}
              </label>
              <input
                type="text"
                @keyup=${this.#onUrlOverrideChange}
                @change=${this.#onUrlOverrideChange}
                class="devtools-text-input"
                .disabled=${!this.#urlOverrideEnabled}
                .value=${this.#urlOverride}
                placeholder=${ifDefined(this.#urlOverrideEnabled ? i18nString(UIStrings.url) : undefined)}
              />
              ${
                this.#urlOverrideWarning
                  ? html`<div class="warning" role="alert" aria-label=${this.#urlOverrideWarning}>${this.#urlOverrideWarning}</div>`
                  : nothing
              }
            </div>
          </details>
          <div class="buttons-section">
            ${this.#renderDisableButton()}
            ${this.#renderEnableButton()}
          </div>
        </div>
      </devtools-dialog>
    `;
    // clang-format on
    Lit.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-field-settings-dialog', FieldSettingsDialog);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-field-settings-dialog': FieldSettingsDialog;
  }
}
