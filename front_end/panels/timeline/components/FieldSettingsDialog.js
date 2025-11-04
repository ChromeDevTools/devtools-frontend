// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import './OriginMap.js';
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
const UIStrings = {
    /**
     * @description Text label for a button that opens a dialog to set up field metrics.
     */
    setUp: 'Set up',
    /**
     * @description Text label for a button that opens a dialog to configure field metrics.
     */
    configure: 'Configure',
    /**
     * @description Text label for a button that enables the collection of field metrics.
     */
    ok: 'Ok',
    /**
     * @description Text label for a button that opts out of the collection of field metrics.
     */
    optOut: 'Opt out',
    /**
     * @description Text label for a button that cancels the setup of field metrics collection.
     */
    cancel: 'Cancel',
    /**
     * @description Text label for a checkbox that controls if a manual URL override is enabled for field metrics.
     */
    onlyFetchFieldData: 'Always show field metrics for the below URL',
    /**
     * @description Text label for a text box that that contains the manual override URL for fetching field metrics.
     */
    url: 'URL',
    /**
     * @description Warning message explaining that the Chrome UX Report could not find enough real world speed data for the page. "Chrome UX Report" is a product name and should not be translated.
     */
    doesNotHaveSufficientData: 'The Chrome UX Report does not have sufficient real-world speed data for this page.',
    /**
     * @description Title for a dialog that contains information and settings related to fetching field metrics.
     */
    configureFieldData: 'Configure field metrics fetching',
    /**
     * @description Paragraph explaining where field metrics comes from and and how it can be used. PH1 will be a link with text "Chrome UX Report" that is untranslated because it is a product name.
     * @example {Chrome UX Report} PH1
     */
    fetchAggregated: 'Fetch aggregated field metrics from the {PH1} to help you contextualize local measurements with what real users experience on the site.',
    /**
     * @description Heading for a section that explains what user data needs to be collected to fetch field metrics.
     */
    privacyDisclosure: 'Privacy disclosure',
    /**
     * @description Paragraph explaining what data needs to be sent to Google to fetch field metrics, and when that data will be sent.
     */
    whenPerformanceIsShown: 'When DevTools is open, the URLs you visit will be sent to Google to query field metrics. These requests are not tied to your Google account.',
    /**
     * @description Header for a section containing advanced settings
     */
    advanced: 'Advanced',
    /**
     * @description Paragraph explaining that the user can associate a development origin with a production origin for the purposes of fetching real user data.
     */
    mapDevelopmentOrigins: 'Set a development origin to automatically get relevant field metrics for its production origin.',
    /**
     * @description Text label for a button that adds a new editable row to a data table
     */
    new: 'New',
    /**
     * @description Warning message explaining that an input origin is not a valid origin or URL.
     * @example {http//malformed.com} PH1
     */
    invalidOrigin: '"{PH1}" is not a valid origin or URL.',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/FieldSettingsDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { html, nothing, Directives: { ifDefined } } = Lit;
export class ShowDialog extends Event {
    static eventName = 'showdialog';
    constructor() {
        super(ShowDialog.eventName);
    }
}
export class FieldSettingsDialog extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #dialog;
    #configSetting = CrUXManager.CrUXManager.instance().getConfigSetting();
    #urlOverride = '';
    #urlOverrideEnabled = false;
    #urlOverrideWarning = '';
    #originMap;
    constructor() {
        super();
        const cruxManager = CrUXManager.CrUXManager.instance();
        this.#configSetting = cruxManager.getConfigSetting();
        this.#resetToSettingState();
        this.#render();
    }
    #resetToSettingState() {
        const configSetting = this.#configSetting.get();
        this.#urlOverride = configSetting.override || '';
        this.#urlOverrideEnabled = configSetting.overrideEnabled || false;
        this.#urlOverrideWarning = '';
    }
    #flushToSetting(enabled) {
        const value = this.#configSetting.get();
        this.#configSetting.set({
            ...value,
            enabled,
            override: this.#urlOverride,
            overrideEnabled: this.#urlOverrideEnabled,
        });
    }
    #onSettingsChanged() {
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    async #urlHasFieldData(url) {
        const cruxManager = CrUXManager.CrUXManager.instance();
        const result = await cruxManager.getFieldDataForPage(url);
        return Object.entries(result).some(([key, value]) => {
            if (key === 'warnings') {
                return false;
            }
            return Boolean(value);
        });
    }
    async #submit(enabled) {
        if (enabled && this.#urlOverrideEnabled) {
            const origin = this.#getOrigin(this.#urlOverride);
            if (!origin) {
                this.#urlOverrideWarning = i18nString(UIStrings.invalidOrigin, { PH1: this.#urlOverride });
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
    #showDialog() {
        if (!this.#dialog) {
            throw new Error('Dialog not found');
        }
        this.#resetToSettingState();
        void this.#dialog.setDialogVisible(true);
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        this.dispatchEvent(new ShowDialog());
    }
    #closeDialog(evt) {
        if (!this.#dialog) {
            throw new Error('Dialog not found');
        }
        void this.#dialog.setDialogVisible(false);
        if (evt) {
            evt.stopImmediatePropagation();
        }
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    connectedCallback() {
        this.#configSetting.addChangeListener(this.#onSettingsChanged, this);
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    disconnectedCallback() {
        this.#configSetting.removeChangeListener(this.#onSettingsChanged, this);
    }
    #renderOpenButton() {
        if (this.#configSetting.get().enabled) {
            // clang-format off
            return html `
        <devtools-button
          class="config-button"
          @click=${this.#showDialog}
          .data=${{
                variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
                title: i18nString(UIStrings.configure),
            }}
        jslog=${VisualLogging.action('timeline.field-data.configure').track({ click: true })}
        >${i18nString(UIStrings.configure)}</devtools-button>
      `;
            // clang-format on
        }
        // clang-format off
        return html `
      <devtools-button
        class="setup-button"
        @click=${this.#showDialog}
        .data=${{
            variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
            title: i18nString(UIStrings.setUp),
        }}
        jslog=${VisualLogging.action('timeline.field-data.setup').track({ click: true })}
        data-field-data-setup
      >${i18nString(UIStrings.setUp)}</devtools-button>
    `;
        // clang-format on
    }
    #renderEnableButton() {
        // clang-format off
        return html `
      <devtools-button
        @click=${() => {
            void this.#submit(true);
        }}
        .data=${{
            variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
            title: i18nString(UIStrings.ok),
        }}
        class="enable"
        jslog=${VisualLogging.action('timeline.field-data.enable').track({ click: true })}
        data-field-data-enable
      >${i18nString(UIStrings.ok)}</devtools-button>
    `;
        // clang-format on
    }
    #renderDisableButton() {
        const label = this.#configSetting.get().enabled ? i18nString(UIStrings.optOut) : i18nString(UIStrings.cancel);
        // clang-format off
        return html `
      <devtools-button
        @click=${() => {
            void this.#submit(false);
        }}
        .data=${{
            variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
            title: label,
        }}
        jslog=${VisualLogging.action('timeline.field-data.disable').track({ click: true })}
        data-field-data-disable
      >${label}</devtools-button>
    `;
        // clang-format on
    }
    #onUrlOverrideChange(event) {
        event.stopPropagation();
        const input = event.target;
        this.#urlOverride = input.value;
        this.#urlOverrideWarning = '';
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #onUrlOverrideEnabledChange(event) {
        event.stopPropagation();
        const input = event.target;
        this.#urlOverrideEnabled = input.checked;
        this.#urlOverrideWarning = '';
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #getOrigin(url) {
        try {
            return new URL(url).origin;
        }
        catch {
            return null;
        }
    }
    #renderOriginMapGrid() {
        // clang-format off
        return html `
      <div class="origin-mapping-description">${i18nString(UIStrings.mapDevelopmentOrigins)}</div>
      <devtools-origin-map
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
            this.#originMap = node;
        })}
      ></devtools-origin-map>
      <div class="origin-mapping-button-section">
        <devtools-button
          @click=${() => this.#originMap?.startCreation()}
          .data=${{
            variant: "text" /* Buttons.Button.Variant.TEXT */,
            title: i18nString(UIStrings.new),
            iconName: 'plus',
        }}
          jslogContext=${'new-origin-mapping'}
        >${i18nString(UIStrings.new)}</devtools-button>
      </div>
    `;
        // clang-format on
    }
    #render = () => {
        const linkEl = UI.XLink.XLink.create('https://developer.chrome.com/docs/crux', i18n.i18n.lockedString('Chrome UX Report'));
        const descriptionEl = uiI18n.getFormatLocalizedString(str_, UIStrings.fetchAggregated, { PH1: linkEl });
        // clang-format off
        const output = html `
      <style>${fieldSettingsDialogStyles}</style>
      <style>${Input.textInputStyles}</style>
      <style>${Input.checkboxStyles}</style>
      <div class="open-button-section">${this.#renderOpenButton()}</div>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        .position=${"auto" /* Dialogs.Dialog.DialogVerticalPosition.AUTO */}
        .horizontalAlignment=${"center" /* Dialogs.Dialog.DialogHorizontalAlignment.CENTER */}
        .jslogContext=${'timeline.field-data.settings'}
        .expectedMutationsSelector=${'.timeline-settings-pane option'}
        .dialogTitle=${i18nString(UIStrings.configureFieldData)}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
            this.#dialog = node;
        })}
      >
        <div class="content">
          <div>${descriptionEl}</div>
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
                  jslog=${VisualLogging.toggle().track({ click: true }).context('field-url-override-enabled')}
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
              ${this.#urlOverrideWarning
            ? html `<div class="warning" role="alert" aria-label=${this.#urlOverrideWarning}>${this.#urlOverrideWarning}</div>`
            : nothing}
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
        Lit.render(output, this.#shadow, { host: this });
    };
}
customElements.define('devtools-field-settings-dialog', FieldSettingsDialog);
//# sourceMappingURL=FieldSettingsDialog.js.map