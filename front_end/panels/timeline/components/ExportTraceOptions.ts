// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import exportTraceOptionsStyles from './exportTraceOptions.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Text title for the Save performance trace dialog.
   */
  exportTraceOptionsDialogTitle: 'Save performance trace ',
  /**
   * @description Tooltip for the Save performance trace dialog.
   */
  showExportTraceOptionsDialogTitle: 'Save trace…',
  /**
   * @description Text for the include script content option.
   */
  includeScriptContent: 'Include script content',
  /**
   * @description Text for the include script source maps option.
   */
  includeSourcemap: 'Include script source maps',
  /**
   * @description Text for the include annotations option.
   */
  includeAnnotations: 'Include annotations',
  /**
   * @description Text for the save trace button
   */
  saveButtonTitle: 'Save',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/ExportTraceOptions.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ExportTraceOptionsData {
  onExport: (config: {
    includeScriptContent: boolean,
    includeSourceMaps: boolean,
    addModifications: boolean,
  }) => Promise<void>;
  buttonEnabled: boolean;
}

export type ExportTraceDialogState = Dialogs.Dialog.DialogState;

export interface ExportTraceOptionsState {
  dialogState: ExportTraceDialogState;
  includeAnnotations: boolean;
  includeScriptContent: boolean;
  includeSourceMaps: boolean;
  displayAnnotationsCheckbox?: boolean;
  displayScriptContentCheckbox?: boolean;
  displaySourceMapsCheckbox?: boolean;
}

export class ExportTraceOptions extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: ExportTraceOptionsData|null = null;

  readonly #includeAnnotationsSettingString: string = 'export-performance-trace-include-annotations';
  readonly #includeScriptContentSettingString: string = 'export-performance-trace-include-scripts';
  readonly #includeSourceMapsSettingString: string = 'export-performance-trace-include-sourcemaps';

  #includeAnnotationsSetting: Common.Settings.Setting<boolean> = Common.Settings.Settings.instance().createSetting(
      this.#includeAnnotationsSettingString, true, Common.Settings.SettingStorageType.SESSION);
  #includeScriptContentSetting: Common.Settings.Setting<boolean> = Common.Settings.Settings.instance().createSetting(
      this.#includeScriptContentSettingString, false, Common.Settings.SettingStorageType.SESSION);
  #includeSourceMapsSetting: Common.Settings.Setting<boolean> = Common.Settings.Settings.instance().createSetting(
      this.#includeSourceMapsSettingString, false, Common.Settings.SettingStorageType.SESSION);

  #state: ExportTraceOptionsState = {
    dialogState: Dialogs.Dialog.DialogState.COLLAPSED,
    includeAnnotations: this.#includeAnnotationsSetting.get(),
    includeScriptContent: this.#includeScriptContentSetting.get(),
    includeSourceMaps: this.#includeSourceMapsSetting.get(),
  };

  #includeAnnotationsCheckbox = UI.UIUtils.CheckboxLabel.create(
      /* title*/ i18nString(UIStrings.includeAnnotations), /* checked*/ this.#state.includeAnnotations,
      /* subtitle*/ undefined,
      /* jslogContext*/ 'timeline.export-trace-options.annotations-checkbox');
  #includeScriptContentCheckbox = UI.UIUtils.CheckboxLabel.create(
      /* title*/ i18nString(UIStrings.includeScriptContent), /* checked*/ this.#state.includeScriptContent,
      /* subtitle*/ undefined,
      /* jslogContext*/ 'timeline.export-trace-options.script-content-checkbox');
  #includeSourceMapsCheckbox = UI.UIUtils.CheckboxLabel.create(
      /* title*/ i18nString(UIStrings.includeSourcemap), /* checked*/ this.#state.includeSourceMaps,
      /* subtitle*/ undefined,
      /* jslogContext*/ 'timeline.export-trace-options.source-maps-checkbox');

  set data(data: ExportTraceOptionsData) {
    this.#data = data;
    this.#scheduleRender();
  }

  set state(state: ExportTraceOptionsState) {
    this.#state = state;
    this.#includeAnnotationsSetting.set(state.includeAnnotations);
    this.#includeScriptContentSetting.set(state.includeScriptContent);
    this.#includeSourceMapsSetting.set(state.includeSourceMaps);

    this.#scheduleRender();
  }

  updateContentVisibility(annotationsExist: boolean): void {
    const showIncludeScriptContentCheckbox =
        Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_ENHANCED_TRACES);
    const showIncludeSourceMapCheckbox =
        Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_COMPILED_SOURCES);

    const newState = Object.assign({}, this.#state, {
      displayAnnotationsCheckbox: annotationsExist,
      displayScriptContentCheckbox: showIncludeScriptContentCheckbox,
      displaySourceMapsCheckbox: showIncludeSourceMapCheckbox
    });

    this.state = newState;
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
      case this.#includeScriptContentCheckbox: {
        newState.includeScriptContent = checked;

        // if the `Include Script` is checked off, cascade the change to `Include Script Source`
        if (!newState.includeScriptContent) {
          newState.includeSourceMaps = false;
        }

        break;
      }
      case this.#includeSourceMapsCheckbox: {
        newState.includeSourceMaps = checked;
        break;
      }
    }

    this.state = newState;
  }

  #renderCheckbox(
      checkboxWithLabel: UI.UIUtils.CheckboxLabel, title: Common.UIString.LocalizedString,
      checked: boolean): Lit.TemplateResult {
    UI.Tooltip.Tooltip.install(checkboxWithLabel, title);
    checkboxWithLabel.ariaLabel = title;
    checkboxWithLabel.checked = checked;
    checkboxWithLabel.addEventListener(
        'change', this.#checkboxOptionChanged.bind(this, checkboxWithLabel, !checked), false);

    // Disable the includeSourceMapsSetting when the includeScriptContentSetting is also disabled.
    this.#includeSourceMapsCheckbox.disabled = !this.#state.includeScriptContent;

    // clang-format off
      return html`
        <div class='export-trace-options-row'>
          ${checkboxWithLabel}
        </div>
      `;
    // clang-format on
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Export trace options dialog render was not scheduled');
    }

    const emptyDialog =
        !(this.#state.displayAnnotationsCheckbox || this.#state.displayScriptContentCheckbox ||
          this.#state.displaySourceMapsCheckbox);

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
          state: emptyDialog ? Dialogs.Dialog.DialogState.COLLAPSED : this.#state.dialogState,
        } as Dialogs.ButtonDialog.ButtonDialogData}>
        <div class='export-trace-options-content'>
          ${this.#state.displayAnnotationsCheckbox ? this.#renderCheckbox(this.#includeAnnotationsCheckbox,
            i18nString(UIStrings.includeAnnotations),
            this.#state.includeAnnotations): ''}
          ${this.#state.displayScriptContentCheckbox ? this.#renderCheckbox(this.#includeScriptContentCheckbox,
            i18nString(UIStrings.includeScriptContent), this.#state.includeScriptContent): ''}
          ${this.#state.displayScriptContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderCheckbox(
            this.#includeSourceMapsCheckbox, i18nString(UIStrings.includeSourcemap), this.#state.includeSourceMaps): ''}
          <div class='export-trace-options-row'><div class='export-trace-blank'></div><devtools-button
                  class="setup-button"
                  @click=${this.#onExportClick.bind(this)}
                  .data=${{
                    variant: Buttons.Button.Variant.PRIMARY,
                    title: i18nString(UIStrings.saveButtonTitle),
                  } as Buttons.Button.ButtonData}
                >${i18nString(UIStrings.saveButtonTitle)}</devtools-button>
                </div>
        </div>
      </devtools-button-dialog>
    `;
    // clang-format on
    Lit.render(output, this.#shadow, {host: this});
  }

  #onButtonDialogClick(): void {
    if (!(this.#state.displayAnnotationsCheckbox || this.#state.displayScriptContentCheckbox ||
          this.#state.displaySourceMapsCheckbox)) {
      this.#onExportClick();
    }
  }

  #onExportClick(): void {
    void this.#data?.onExport({
      includeScriptContent: this.#state.includeScriptContent,
      includeSourceMaps: this.#state.includeSourceMaps,
      addModifications: this.#state.includeAnnotations
    });

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceExported);
    this.state = Object.assign({}, this.#state, {dialogState: Dialogs.Dialog.DialogState.COLLAPSED});
  }
}

customElements.define('devtools-perf-export-trace-options', ExportTraceOptions);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-perf-export-trace-options': ExportTraceOptions;
  }
}
