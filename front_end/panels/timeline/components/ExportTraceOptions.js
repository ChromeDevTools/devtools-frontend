// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
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
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import exportTraceOptionsStyles from './exportTraceOptions.css.js';
const { html } = Lit;
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
    includeResourceContent: 'Include resource content',
    /**
     * @description Text for the include script source maps option.
     */
    includeSourcemap: 'Include script source maps',
    /**
     * @description Text for the include annotations option.
     */
    includeAnnotations: 'Include annotations',
    /**
     * @description Text for the compression option.
     */
    shouldCompress: 'Compress with gzip',
    /**
     * @description Text for the explanation link
     */
    explanation: 'Explanation',
    /**
     * @description Text for the save trace button
     */
    saveButtonTitle: 'Save',
    /**
     * @description Text shown in the information pop-up next to the "Include resource content" option.
     */
    resourceContentPrivacyInfo: 'Includes the full content of all loaded HTML, CSS, and scripts (except extensions).',
    /**
     * @description Text shown in the information pop-up next to the "Include script sourcemaps" option.
     */
    sourceMapsContentPrivacyInfo: 'Includes available source maps, which may expose authored code.',
    /**
     * @description Text used as the start of the accessible label for the information button which shows additional context when the user focuses / hovers.
     */
    moreInfoLabel: 'Additional information:',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/ExportTraceOptions.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const checkboxesWithInfoDialog = new Set(['resource-content', 'script-source-maps']);
export class ExportTraceOptions extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #data = null;
    static #includeAnnotationsSettingString = 'export-performance-trace-include-annotations';
    static #includeResourceContentSettingString = 'export-performance-trace-include-resources';
    static #includeSourceMapsSettingString = 'export-performance-trace-include-sourcemaps';
    static #shouldCompressSettingString = 'export-performance-trace-should-compress';
    #includeAnnotationsSetting = Common.Settings.Settings.instance().createSetting(ExportTraceOptions.#includeAnnotationsSettingString, true, "Session" /* Common.Settings.SettingStorageType.SESSION */);
    #includeResourceContentSetting = Common.Settings.Settings.instance().createSetting(ExportTraceOptions.#includeResourceContentSettingString, false, "Session" /* Common.Settings.SettingStorageType.SESSION */);
    #includeSourceMapsSetting = Common.Settings.Settings.instance().createSetting(ExportTraceOptions.#includeSourceMapsSettingString, false, "Session" /* Common.Settings.SettingStorageType.SESSION */);
    #shouldCompressSetting = Common.Settings.Settings.instance().createSetting(ExportTraceOptions.#shouldCompressSettingString, true, "Synced" /* Common.Settings.SettingStorageType.SYNCED */);
    #state = {
        dialogState: "collapsed" /* Dialogs.Dialog.DialogState.COLLAPSED */,
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
    set data(data) {
        this.#data = data;
        this.#scheduleRender();
    }
    set state(state) {
        this.#state = state;
        this.#includeAnnotationsSetting.set(state.includeAnnotations);
        this.#includeResourceContentSetting.set(state.includeResourceContent);
        this.#includeSourceMapsSetting.set(state.includeSourceMaps);
        this.#shouldCompressSetting.set(state.shouldCompress);
        this.#scheduleRender();
    }
    get state() {
        return this.#state;
    }
    updateContentVisibility(options) {
        this.state = {
            ...this.#state,
            displayAnnotationsCheckbox: options.annotationsExist,
            displayResourceContentCheckbox: true,
            displaySourceMapsCheckbox: true
        };
    }
    #scheduleRender() {
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #checkboxOptionChanged(checkboxWithLabel, checked) {
        const newState = Object.assign({}, this.#state, { dialogState: "expanded" /* Dialogs.Dialog.DialogState.EXPANDED */ });
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
    #accessibleLabelForInfoCheckbox(checkboxId) {
        if (checkboxId === 'script-source-maps') {
            return i18nString(UIStrings.moreInfoLabel) + ' ' + i18nString(UIStrings.sourceMapsContentPrivacyInfo);
        }
        if (checkboxId === 'resource-content') {
            return i18nString(UIStrings.moreInfoLabel) + ' ' + i18nString(UIStrings.resourceContentPrivacyInfo);
        }
        return '';
    }
    #renderCheckbox(checkboxId, checkboxWithLabel, title, checked) {
        UI.Tooltip.Tooltip.install(checkboxWithLabel, title);
        checkboxWithLabel.ariaLabel = title;
        checkboxWithLabel.checked = checked;
        checkboxWithLabel.addEventListener('change', this.#checkboxOptionChanged.bind(this, checkboxWithLabel, !checked), false);
        // Disable the includeSourceMapsSetting when the includeScriptContentSetting is also disabled.
        this.#includeSourceMapsCheckbox.disabled = !this.#state.includeResourceContent;
        // clang-format off
        return html `
        <div class='export-trace-options-row'>
          ${checkboxWithLabel}

          ${checkboxesWithInfoDialog.has(checkboxId) ? html `
            <devtools-button
              aria-details=${`export-trace-tooltip-${checkboxId}`}
              .accessibleLabel=${this.#accessibleLabelForInfoCheckbox(checkboxId)}
              class="pen-icon"
              .iconName=${'info'}
              .variant=${"icon" /* Buttons.Button.Variant.ICON */}
              ></devtools-button>
            ` : Lit.nothing}
        </div>
      `;
        // clang-format on
    }
    #renderInfoTooltip(checkboxId) {
        if (!checkboxesWithInfoDialog.has(checkboxId)) {
            return Lit.nothing;
        }
        return html `
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
    #render() {
        if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
            throw new Error('Export trace options dialog render was not scheduled');
        }
        // clang-format off
        const output = html `
      <style>${exportTraceOptionsStyles}</style>
      <devtools-button-dialog class="export-trace-dialog"
      @click=${this.#onButtonDialogClick.bind(this)}
      .data=${{
            openOnRender: false,
            jslogContext: 'timeline.export-trace-options',
            variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
            iconName: 'download',
            disabled: !this.#data?.buttonEnabled,
            iconTitle: i18nString(UIStrings.showExportTraceOptionsDialogTitle),
            horizontalAlignment: "auto" /* Dialogs.Dialog.DialogHorizontalAlignment.AUTO */,
            closeButton: false,
            dialogTitle: i18nString(UIStrings.exportTraceOptionsDialogTitle),
            state: this.#state.dialogState,
            closeOnESC: true,
        }}>
        <div class='export-trace-options-content'>

          ${this.#state.displayAnnotationsCheckbox ? this.#renderCheckbox('annotations', this.#includeAnnotationsCheckbox, i18nString(UIStrings.includeAnnotations), this.#state.includeAnnotations) : ''}
          ${this.#state.displayResourceContentCheckbox ? this.#renderCheckbox('resource-content', this.#includeResourceContentCheckbox, i18nString(UIStrings.includeResourceContent), this.#state.includeResourceContent) : ''}
          ${this.#state.displayResourceContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderCheckbox('script-source-maps', this.#includeSourceMapsCheckbox, i18nString(UIStrings.includeSourcemap), this.#state.includeSourceMaps) : ''}
          ${this.#renderCheckbox('compress-with-gzip', this.#shouldCompressCheckbox, i18nString(UIStrings.shouldCompress), this.#state.shouldCompress)}
          <div class='export-trace-options-row export-trace-options-row-last'>
            <div class="export-trace-explanation">
              <x-link
                href="https://developer.chrome.com/docs/devtools/performance/save-trace"
                class=devtools-link
                jslog=${VisualLogging.link().track({ click: true, keydown: 'Enter|Space' }).context('save-trace-explanation')}>
                  ${i18nString(UIStrings.explanation)}
              </x-link>
            </div>
            <devtools-button
                  class="setup-button"
                  data-export-button
                  @click=${this.#onExportClick.bind(this)}
                  .data=${{
            variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
            title: i18nString(UIStrings.saveButtonTitle),
        }}
                >${i18nString(UIStrings.saveButtonTitle)}</devtools-button>
                </div>
          ${this.#state.displayResourceContentCheckbox ? this.#renderInfoTooltip('resource-content') : Lit.nothing}
          ${this.#state.displayResourceContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderInfoTooltip('script-source-maps') : Lit.nothing}
        </div>
      </devtools-button-dialog>
    `;
        // clang-format on
        Lit.render(output, this.#shadow, { host: this });
    }
    async #onButtonDialogClick() {
        this.state = Object.assign({}, this.#state, { dialogState: "expanded" /* Dialogs.Dialog.DialogState.EXPANDED */ });
    }
    async #onExportCallback() {
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
    async #onExportClick() {
        // Handles save button click that lived inside the dialog.
        // Exports trace and collapses dialog.
        await this.#onExportCallback();
        this.state = Object.assign({}, this.#state, { dialogState: "collapsed" /* Dialogs.Dialog.DialogState.COLLAPSED */ });
    }
}
customElements.define('devtools-perf-export-trace-options', ExportTraceOptions);
//# sourceMappingURL=ExportTraceOptions.js.map