// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
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
  onlyFetchFieldData: 'Always show field data for the below URL',
  /**
   * @description Text label for a text box that that contains the manual override URL for fetching field data.
   */
  url: 'URL',
  /**
   * @description Warning message explaining that the Chrome UX Report could not find enough real world speed data for the page. "Chrome UX Report" is a product name and should not be translated.
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
  /**
   * @description Paragraph explaining that the user can associate a development origin with a production origin for the purposes of fetching real user data.
   */
  mapDevelopmentOrigins: 'Set a development origin to automatically get relevant field data for its production origin.',
  /**
   * @description Title for a column in a data table representing a site origin used for development
   */
  developmentOrigin: 'Development origin',
  /**
   * @description Title for a column in a data table representing a site origin used by real users in a production environment
   */
  productionOrigin: 'Production origin',
  /**
   * @description Label for an input that accepts a site origin used for development
   * @example {http://localhost:8080} PH1
   */
  developmentOriginValue: 'Development origin: {PH1}',
  /**
   * @description Label for an input that accepts a site origin used by real users in a production environment
   * @example {https://example.com} PH1
   */
  productionOriginValue: 'Production origin: {PH1}',
  /**
   * @description Text label for a button that adds a new editable row to a data table
   */
  new: 'New',
  /**
   * @description Text label for a button that saves the changes of an editable row in a data table
   */
  add: 'Add',
  /**
   * @description Text label for a button that deletes a row in a data table
   */
  delete: 'Delete',
  /**
   * @description Warning message explaining that an input origin is not a valid origin or URL.
   * @example {http//malformed.com} PH1
   */
  invalidOrigin: '"{PH1}" is not a valid origin or URL.',
  /**
   * @description Warning message explaining that an development origin is already mapped to a productionOrigin.
   * @example {https://example.com} PH1
   */
  alreadyMapped: '"{PH1}" is already mapped to a production origin.',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/FieldSettingsDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {html, nothing, Directives: {ifDefined}} = LitHtml;

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

  #urlOverride: string = '';
  #urlOverrideEnabled: boolean = false;
  #urlOverrideWarning = '';
  #originMapWarning = '';
  #originMappings: CrUXManager.OriginMapping[] = [];
  #isEditingOriginGrid = false;
  #editGridDevelopmentOrigin = '';
  #editGridProductionOrigin = '';

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
    this.#originMappings = configSetting.originMappings || [];
    this.#urlOverrideWarning = '';
    this.#originMapWarning = '';
    this.#isEditingOriginGrid = false;
    this.#editGridDevelopmentOrigin = '';
    this.#editGridProductionOrigin = '';
  }

  #flushToSetting(enabled: boolean): void {
    this.#configSetting.set({
      enabled,
      override: this.#urlOverride,
      originMappings: this.#originMappings,
      overrideEnabled: this.#urlOverrideEnabled,
    });
  }

  #onSettingsChanged(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  async #urlHasFieldData(url: string): Promise<boolean> {
    const cruxManager = CrUXManager.CrUXManager.instance();
    const result = await cruxManager.getFieldDataForPage(url);
    return Object.values(result).some(v => v);
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

  #renderEnableButton(): LitHtml.LitTemplate {
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
        jslog=${VisualLogging.action('timeline.field-data.enable').track({click: true})}
        data-field-data-enable
      >${i18nString(UIStrings.ok)}</devtools-button>
    `;
    // clang-format on
  }

  #renderDisableButton(): LitHtml.LitTemplate {
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

  // Cannot use Lit template automatic binding because this event function is technically added to a different component
  #onEditGridDevelopmentOriginChange = (event: Event): void => {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.#editGridDevelopmentOrigin = input.value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  };

  // Cannot use Lit template automatic binding because this event function is technically added to a different component
  #onEditGridProductionOriginChange = (event: Event): void => {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.#editGridProductionOrigin = input.value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  };

  #getOrigin(url: string): string|null {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }

  #startEditingOriginMapping(): void {
    this.#editGridDevelopmentOrigin = '';
    this.#editGridProductionOrigin = '';
    this.#isEditingOriginGrid = true;
    this.#originMapWarning = '';
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  async #addOriginMapping(): Promise<void> {
    const developmentOrigin = this.#getOrigin(this.#editGridDevelopmentOrigin);
    const productionOrigin = this.#getOrigin(this.#editGridProductionOrigin);

    if (!developmentOrigin) {
      this.#originMapWarning = i18nString(UIStrings.invalidOrigin, {PH1: this.#editGridDevelopmentOrigin});
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
      return;
    }

    if (this.#originMappings.find(m => m.developmentOrigin === developmentOrigin)) {
      this.#originMapWarning = i18nString(UIStrings.alreadyMapped, {PH1: developmentOrigin});
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
      return;
    }

    if (!productionOrigin) {
      this.#originMapWarning = i18nString(UIStrings.invalidOrigin, {PH1: this.#editGridProductionOrigin});
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
      return;
    }

    const hasFieldData = await this.#urlHasFieldData(productionOrigin);
    if (!hasFieldData) {
      this.#originMapWarning = i18nString(UIStrings.doesNotHaveSufficientData, {PH1: this.#editGridProductionOrigin});
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
      return;
    }

    this.#originMappings.push({developmentOrigin, productionOrigin});
    this.#editGridDevelopmentOrigin = '';
    this.#editGridProductionOrigin = '';
    this.#isEditingOriginGrid = false;
    this.#originMapWarning = '';
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #deleteOriginMapping(index: number): void {
    this.#originMappings.splice(index, 1);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #renderOriginMapGrid(): LitHtml.LitTemplate {
    const rows: DataGrid.DataGridUtils.Row[] = this.#originMappings.map((mapping, index) => {
      return {
        cells: [
          {
            columnId: 'development-origin',
            value: mapping.developmentOrigin,
            title: mapping.developmentOrigin,
          },
          {
            columnId: 'production-origin',
            value: mapping.productionOrigin,
            title: mapping.productionOrigin,
          },
          {
            columnId: 'action-button',
            value: i18nString(UIStrings.delete),
            // clang-format off
            renderer: value => html`
              <div style="display: flex; align-items: center; justify-content: center;">
                <devtools-button
                  class="delete-mapping"
                  .data=${{
                    variant: Buttons.Button.Variant.ICON,
                    size: Buttons.Button.Size.SMALL,
                    title: value,
                    iconName: 'bin',
                    jslogContext: 'delete-origin-mapping',
                  } as Buttons.Button.ButtonData}
                  @click=${() => this.#deleteOriginMapping(index)}
                ></devtools-button>
              </div>
            `,
            // clang-format on
          },
        ],
      };
    });

    if (this.#isEditingOriginGrid) {
      // Input element is in a different component so we need to inject this in the style attribute
      const inputStyle = 'width: 100%; box-sizing: border-box; border: none; background: none;';

      rows.push({
        cells: [
          {
            columnId: 'development-origin',
            value: this.#editGridDevelopmentOrigin,
            // clang-format off
            renderer: value => html`
              <input
                type="text"
                placeholder="http://localhost:8080"
                aria-label=${
                  i18nString(UIStrings.developmentOriginValue, {PH1: value as string})}
                style=${inputStyle}
                title=${ifDefined(value as string)}
                @keyup=${this.#onEditGridDevelopmentOriginChange}
                @change=${this.#onEditGridDevelopmentOriginChange} />
            `,
            // clang-format on
          },
          {
            columnId: 'production-origin',
            value: this.#editGridProductionOrigin,
            // clang-format off
            renderer: value => html`
              <input
                type="text"
                placeholder="https://example.com"
                aria-label=${
                  i18nString(UIStrings.productionOriginValue, {PH1: value as string})}
                style=${inputStyle}
                title=${ifDefined(value as string)}
                @keyup=${this.#onEditGridProductionOriginChange}
                @change=${this.#onEditGridProductionOriginChange} />
            `,
            // clang-format on
          },
          {
            columnId: 'action-button',
            value: i18nString(UIStrings.add),
            // clang-format off
            renderer: value => html`
              <div style="display: flex; align-items: center; justify-content: center;">
                <devtools-button
                  id="add-mapping-button"
                  .data=${{
                    variant: Buttons.Button.Variant.ICON,
                    size: Buttons.Button.Size.SMALL,
                    title: value,
                    iconName: 'plus',
                    disabled: !this.#editGridDevelopmentOrigin || !this.#editGridProductionOrigin,
                    jslogContext: 'add-origin-mapping',
                  } as Buttons.Button.ButtonData}
                  @click=${() => this.#addOriginMapping()}
                ></devtools-button>
              </div>
            `,
            // clang-format on
          },
        ],
      });
    }

    const gridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'development-origin',
          title: i18nString(UIStrings.developmentOrigin),
          widthWeighting: 13,
          hideable: false,
          visible: true,
          sortable: false,
        },
        {
          id: 'production-origin',
          title: i18nString(UIStrings.productionOrigin),
          widthWeighting: 13,
          hideable: false,
          visible: true,
          sortable: false,
        },
        {
          id: 'action-button',
          title: '',
          widthWeighting: 3,
          hideable: false,
          visible: true,
          sortable: false,
        },
      ],
      rows,
    };

    // clang-format off
    return html`
      <div>${i18nString(UIStrings.mapDevelopmentOrigins)}</div>
      <devtools-data-grid-controller
        class="origin-mapping-grid"
        .data=${gridData as DataGrid.DataGridController.DataGridControllerData}
      ></devtools-data-grid-controller>
      ${this.#originMapWarning ? html`
        <div class="warning" role="alert" aria-label=${this.#originMapWarning}>${this.#originMapWarning}</div>
      ` : nothing}
      <div class="origin-mapping-button-section">
        <devtools-button
          @click=${this.#startEditingOriginMapping}
          .data=${{
            variant: Buttons.Button.Variant.TEXT,
            title: i18nString(UIStrings.new),
            iconName: 'plus',
            disabled: this.#isEditingOriginGrid,
          } as Buttons.Button.ButtonData}
          jslogContext=${'new-origin-mapping'}
        >${i18nString(UIStrings.new)}</devtools-button>
      </div>
    `;
    // clang-format on
  }

  #render = (): void => {
    const linkEl =
        UI.XLink.XLink.create('https://developer.chrome.com/docs/crux', i18n.i18n.lockedString('Chrome UX Report'));
    const descriptionEl = i18n.i18n.getFormatLocalizedString(str_, UIStrings.fetchAggregated, {PH1: linkEl});

    // clang-format off
    const output = html`
      <div class="open-button-section">${this.#renderOpenButton()}</div>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        .showConnector=${true}
        .position=${Dialogs.Dialog.DialogVerticalPosition.AUTO}
        .horizontalAlignment=${Dialogs.Dialog.DialogHorizontalAlignment.CENTER}
        .jslogContext=${'timeline.field-data.settings'}
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
    LitHtml.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-field-settings-dialog', FieldSettingsDialog);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-field-settings-dialog': FieldSettingsDialog;
  }
}
