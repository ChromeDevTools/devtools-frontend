// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../../ui/kit/kit.js';
import '../../../ui/components/tooltips/tooltips.js';
import '../../../ui/components/buttons/buttons.js';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import exportTraceOptionsStyles from './exportTraceOptions.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Dialog title for saving a performance trace in the Performance panel.
   */
  exportTraceOptionsDialogTitle: 'Save performance trace',
  /**
   * @description Tooltip text for the toolbar button that opens the save trace dialog in the Performance panel.
   */
  showExportTraceOptionsDialogTitle: 'Save trace…',
  /**
   * @description Checkbox label to include resource content when saving a trace in the Performance panel.
   */
  includeResourceContent: 'Include resource content',
  /**
   * @description Checkbox label to include script source maps when saving a trace in the Performance panel.
   */
  includeSourcemap: 'Include script source maps',
  /**
   * @description Checkbox label to include annotations when saving a trace in the Performance panel.
   */
  includeAnnotations: 'Include annotations',
  /**
   * @description Checkbox label to compress the saved trace with gzip in the Performance panel.
   */
  shouldCompress: 'Compress with gzip',
  /**
   * @description Link text to documentation explaining trace export options in the Performance panel.
   */
  explanation: 'Explanation',
  /**
   * @description Button label to save the trace in the Performance panel.
   */
  saveButtonTitle: 'Save',
  /**
   * @description Tooltip text explaining the privacy implications of including resource content when saving a trace in the Performance panel.
   */
  resourceContentPrivacyInfo: 'Includes the full content of all loaded HTML, CSS, and scripts (except extensions).',
  /**
   * @description Tooltip text explaining the privacy implications of including script source maps when saving a trace in the Performance panel.
   */
  sourceMapsContentPrivacyInfo: 'Includes available source maps, which may expose authored code.',
  /**
   * @description Accessible label prefix for the information button in the Performance panel.
   */
  moreInfoLabel: 'More information:',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/ExportTraceOptions.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ExportTraceOptionsData {
  onExport: (config: {
    includeResourceContent: boolean,
    includeSourceMaps: boolean,
    addModifications: boolean,
    shouldCompress: boolean,
  }) => Promise<void>;
  buttonEnabled: boolean;
}

export type ExportTraceDialogState = Dialogs.Dialog.DialogState;

export interface ExportTraceOptionsState {
  dialogState: ExportTraceDialogState;
  includeAnnotations: boolean;
  includeResourceContent: boolean;
  includeSourceMaps: boolean;
  shouldCompress: boolean;
  displayAnnotationsCheckbox?: boolean;
  displayResourceContentCheckbox?: boolean;
  displaySourceMapsCheckbox?: boolean;
}

type CheckboxId = 'annotations'|'resource-content'|'script-source-maps'|'compress-with-gzip';
const checkboxesWithInfoDialog = new Set<CheckboxId>(['resource-content', 'script-source-maps']);

export class ExportTraceOptions extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: ExportTraceOptionsData|null = null;

  static readonly #includeAnnotationsSettingString: string = 'export-performance-trace-include-annotations';
  static readonly #includeResourceContentSettingString: string = 'export-performance-trace-include-resources';
  static readonly #includeSourceMapsSettingString: string = 'export-performance-trace-include-sourcemaps';
  static readonly #shouldCompressSettingString: string = 'export-performance-trace-should-compress';

  #includeAnnotationsSetting: Common.Settings.Setting<boolean> = Common.Settings.Settings.instance().createSetting(
      ExportTraceOptions.#includeAnnotationsSettingString, true, Common.Settings.SettingStorageType.SESSION);
  #includeResourceContentSetting: Common.Settings.Setting<boolean> = Common.Settings.Settings.instance().createSetting(
      ExportTraceOptions.#includeResourceContentSettingString, false, Common.Settings.SettingStorageType.SESSION);
  #includeSourceMapsSetting: Common.Settings.Setting<boolean> = Common.Settings.Settings.instance().createSetting(
      ExportTraceOptions.#includeSourceMapsSettingString, false, Common.Settings.SettingStorageType.SESSION);
  #shouldCompressSetting: Common.Settings.Setting<boolean> = Common.Settings.Settings.instance().createSetting(
      ExportTraceOptions.#shouldCompressSettingString, true, Common.Settings.SettingStorageType.SYNCED);

  #state: ExportTraceOptionsState = {
    dialogState: Dialogs.Dialog.DialogState.COLLAPSED,
    includeAnnotations: this.#includeAnnotationsSetting.get(),
    includeResourceContent: this.#includeResourceContentSetting.get(),
    includeSourceMaps: this.#includeSourceMapsSetting.get(),
    shouldCompress: this.#shouldCompressSetting.get(),
  };

  #includeAnnotationsCheckbox = UI.UIUtils.CheckboxLabel.create(
      /* title*/ i18nString(UIStrings.includeAnnotations), /* checked*/ this.#state.includeAnnotations,
      /* subtitle*/ undefined,
      /* jslogContext*/ 'timeline.export-trace-options.annotations-checkbox');
  #includeResourceContentCheckbox = UI.UIUtils.CheckboxLabel.create(
      /* title*/ i18nString(UIStrings.includeResourceContent), /* checked*/ this.#state.includeResourceContent,
      /* subtitle*/ undefined,
      /* jslogContext*/ 'timeline.export-trace-options.resource-content-checkbox');
  #includeSourceMapsCheckbox = UI.UIUtils.CheckboxLabel.create(
      /* title*/ i18nString(UIStrings.includeSourcemap), /* checked*/ this.#state.includeSourceMaps,
      /* subtitle*/ undefined,
      /* jslogContext*/ 'timeline.export-trace-options.source-maps-checkbox');
  #shouldCompressCheckbox = UI.UIUtils.CheckboxLabel.create(
      /* title*/ i18nString(UIStrings.shouldCompress), /* checked*/ this.#state.shouldCompress,
      /* subtitle*/ undefined,
      /* jslogContext*/ 'timeline.export-trace-options.should-compress-checkbox');

  set data(data: ExportTraceOptionsData) {
    this.#data = data;
    this.#scheduleRender();
  }

  set state(state: ExportTraceOptionsState) {
    this.#state = state;
    this.#includeAnnotationsSetting.set(state.includeAnnotations);
    this.#includeResourceContentSetting.set(state.includeResourceContent);
    this.#includeSourceMapsSetting.set(state.includeSourceMaps);
    this.#shouldCompressSetting.set(state.shouldCompress);

    this.#scheduleRender();
  }

  get state(): Readonly<ExportTraceOptionsState> {
    return this.#state;
  }

  updateContentVisibility(options: {annotationsExist: boolean}): void {
    this.state = {
      ...this.#state,
      displayAnnotationsCheckbox: options.annotationsExist,
      displayResourceContentCheckbox: true,
      displaySourceMapsCheckbox: true,
    };
  }

  #scheduleRender(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #checkboxOptionChanged(checkboxWithLabel: UI.UIUtils.CheckboxLabel, checked: boolean): void {
    const newState = Object.assign({}, this.#state, {dialogState: Dialogs.Dialog.DialogState.EXPANDED});

    switch (checkboxWithLabel) {
      case this.#includeAnnotationsCheckbox: {
        newState.includeAnnotations = checked;
        break;
      }
      case this.#includeResourceContentCheckbox: {
        newState.includeResourceContent = checked;

        // if the `Include Script` is checked off, cascade the change to `Include Script Source`
        if (!newState.includeResourceContent) {
          newState.includeSourceMaps = false;
        }

        break;
      }
      case this.#includeSourceMapsCheckbox: {
        newState.includeSourceMaps = checked;
        break;
      }
      case this.#shouldCompressCheckbox: {
        newState.shouldCompress = checked;
        break;
      }
    }

    this.state = newState;
  }

  #accessibleLabelForInfoCheckbox(checkboxId: CheckboxId): string {
    if (checkboxId === 'script-source-maps') {
      return i18nString(UIStrings.moreInfoLabel) + ' ' + i18nString(UIStrings.sourceMapsContentPrivacyInfo);
    }

    if (checkboxId === 'resource-content') {
      return i18nString(UIStrings.moreInfoLabel) + ' ' + i18nString(UIStrings.resourceContentPrivacyInfo);
    }

    return '';
  }
  #renderCheckbox(
      checkboxId: CheckboxId, checkboxWithLabel: UI.UIUtils.CheckboxLabel, title: Common.UIString.LocalizedString,
      checked: boolean): Lit.TemplateResult {
    UI.Tooltip.Tooltip.install(checkboxWithLabel, title);
    checkboxWithLabel.ariaLabel = title;
    checkboxWithLabel.checked = checked;
    checkboxWithLabel.addEventListener(
        'change', this.#checkboxOptionChanged.bind(this, checkboxWithLabel, !checked), false);

    // Disable the includeSourceMapsSetting when the includeScriptContentSetting is also disabled.
    this.#includeSourceMapsCheckbox.disabled = !this.#state.includeResourceContent;

    // clang-format off
      return html`
        <div class='export-trace-options-row'>
          ${checkboxWithLabel}

          ${checkboxesWithInfoDialog.has(checkboxId) ? html`
            <devtools-button
              aria-details=${`export-trace-tooltip-${checkboxId}`}
              .accessibleLabel=${this.#accessibleLabelForInfoCheckbox(checkboxId)}
              class="pen-icon"
              .iconName=${'info'}
              .variant=${Buttons.Button.Variant.ICON}
              ></devtools-button>
            ` : Lit.nothing}
        </div>
      `;
    // clang-format on
  }

  #renderInfoTooltip(checkboxId: CheckboxId): Lit.LitTemplate {
    if (!checkboxesWithInfoDialog.has(checkboxId)) {
      return Lit.nothing;
    }

    return html`
    <devtools-tooltip
      variant="rich"
      id=${`export-trace-tooltip-${checkboxId}`}
    >
      <div class="info-tooltip-container">
      <p>
        ${checkboxId === 'resource-content' ? i18nString(UIStrings.resourceContentPrivacyInfo) : Lit.nothing}
        ${checkboxId === 'script-source-maps' ? i18nString(UIStrings.sourceMapsContentPrivacyInfo) : Lit.nothing}
      </p>
      </div>
    </devtools-tooltip>`;
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Export trace options dialog render was not scheduled');
    }

    // clang-format off
    const output = html`
      <style>${exportTraceOptionsStyles}</style>
      <devtools-button-dialog class="export-trace-dialog"
      @click=${this.#onButtonDialogClick.bind(this)}
      .data=${{
          openOnRender: false,
          jslogContext: 'timeline.export-trace-options',
          variant: Buttons.Button.Variant.TOOLBAR,
          iconName: 'download',
          disabled: !this.#data?.buttonEnabled,
          iconTitle: i18nString(UIStrings.showExportTraceOptionsDialogTitle),
          horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
          closeButton: false,
          dialogTitle: i18nString(UIStrings.exportTraceOptionsDialogTitle),
          state: this.#state.dialogState,
          closeOnESC: true,
        } as Dialogs.ButtonDialog.ButtonDialogData}>
        <div class='export-trace-options-content'>

          ${this.#state.displayAnnotationsCheckbox ? this.#renderCheckbox('annotations', this.#includeAnnotationsCheckbox,
            i18nString(UIStrings.includeAnnotations),
            this.#state.includeAnnotations): ''}
          ${this.#state.displayResourceContentCheckbox ? this.#renderCheckbox('resource-content', this.#includeResourceContentCheckbox,
            i18nString(UIStrings.includeResourceContent), this.#state.includeResourceContent): ''}
          ${this.#state.displayResourceContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderCheckbox(
            'script-source-maps',
            this.#includeSourceMapsCheckbox, i18nString(UIStrings.includeSourcemap), this.#state.includeSourceMaps): ''}
          ${this.#renderCheckbox('compress-with-gzip', this.#shouldCompressCheckbox, i18nString(UIStrings.shouldCompress), this.#state.shouldCompress)}
          <div class='export-trace-options-row export-trace-options-row-last'>
            <div class="export-trace-explanation">
              <devtools-link
                href="https://developer.chrome.com/docs/devtools/performance/save-trace"
                class=devtools-link
                .jslogContext=${'save-trace-explanation'}>
                  ${i18nString(UIStrings.explanation)}
              </devtools-link>
            </div>
            <devtools-button
                  class="setup-button"
                  data-export-button
                  @click=${this.#onExportClick.bind(this)}
                  .data=${{
                    variant: Buttons.Button.Variant.PRIMARY,
                    title: i18nString(UIStrings.saveButtonTitle),
                  } as Buttons.Button.ButtonData}
                >${i18nString(UIStrings.saveButtonTitle)}</devtools-button>
                </div>
          ${this.#state.displayResourceContentCheckbox ? this.#renderInfoTooltip('resource-content') : Lit.nothing}
          ${this.#state.displayResourceContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderInfoTooltip('script-source-maps') : Lit.nothing}
        </div>
      </devtools-button-dialog>
    `;
    // clang-format on
    Lit.render(output, this.#shadow, {host: this});
  }

  async #onButtonDialogClick(): Promise<void> {
    this.state = Object.assign({}, this.#state, {dialogState: Dialogs.Dialog.DialogState.EXPANDED});
  }

  async #onExportCallback(): Promise<void> {
    // Calls passed onExport function with current settings.
    await this.#data?.onExport({
      includeResourceContent: this.#state.includeResourceContent,
      includeSourceMaps: this.#state.includeSourceMaps,
      // Note: this also includes track configuration ...
      addModifications: this.#state.includeAnnotations,
      shouldCompress: this.#state.shouldCompress,
    });

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceExported);
  }

  async #onExportClick(): Promise<void> {
    // Handles save button click that lived inside the dialog.
    // Exports trace and collapses dialog.
    await this.#onExportCallback();
    this.state = Object.assign({}, this.#state, {dialogState: Dialogs.Dialog.DialogState.COLLAPSED});
  }
}

customElements.define('devtools-perf-export-trace-options', ExportTraceOptions);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-perf-export-trace-options': ExportTraceOptions;
  }
}
