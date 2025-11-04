// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../../ui/components/menus/menus.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import ignoreListSettingStyles from './ignoreListSetting.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Text title for the button to open the ignore list setting.
     */
    showIgnoreListSettingDialog: 'Show ignore list setting dialog',
    /**
     * @description Text title for ignore list setting.
     */
    ignoreList: 'Ignore list',
    /**
     * @description Text description for ignore list setting.
     */
    ignoreListDescription: 'Add regular expression rules to remove matching scripts from the flame chart.',
    /**
     * @description Pattern title in Framework Ignore List Settings Tab of the Settings
     * @example {ad.*?} regex
     */
    ignoreScriptsWhoseNamesMatchS: 'Ignore scripts whose names match \'\'{regex}\'\'',
    /**
     * @description Label for the button to remove an regex
     * @example {ad.*?} regex
     */
    removeRegex: 'Remove the regex: \'\'{regex}\'\'',
    /**
     * @description Aria accessible name in Ignore List Settings Dialog in Performance panel. It labels the input
     * field used to add new or edit existing regular expressions that match file names to ignore in the debugger.
     */
    addNewRegex: 'Add a regular expression rule for the script\'s URL',
    /**
     * @description Aria accessible name in Ignore List Settings Dialog in Performance panel. It labels the checkbox of
     * the input field used to enable the new regular expressions that match file names to ignore in the debugger.
     */
    ignoreScriptsWhoseNamesMatchNewRegex: 'Ignore scripts whose names match the new regex',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/IgnoreListSetting.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class IgnoreListSetting extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #ignoreListEnabled = Common.Settings.Settings.instance().moduleSetting('enable-ignore-listing');
    #regexPatterns = this.#getSkipStackFramesPatternSetting().getAsArray();
    #newRegexCheckbox = UI.UIUtils.CheckboxLabel.create(
    /* title*/ undefined, /* checked*/ false, /* subtitle*/ undefined, 
    /* jslogContext*/ 'timeline.ignore-list-new-regex.checkbox');
    #newRegexInput = UI.UIUtils.createInput(
    /* className*/ 'new-regex-text-input', /* type*/ 'text', /* jslogContext*/ 'timeline.ignore-list-new-regex.text');
    #editingRegexSetting = null;
    constructor() {
        super();
        this.#initAddNewItem();
        Common.Settings.Settings.instance()
            .moduleSetting('skip-stack-frames-pattern')
            .addChangeListener(this.#scheduleRender.bind(this));
        Common.Settings.Settings.instance()
            .moduleSetting('enable-ignore-listing')
            .addChangeListener(this.#scheduleRender.bind(this));
    }
    connectedCallback() {
        this.#scheduleRender();
        // Prevent the event making its way to the TimelinePanel element which will
        // cause the "Load Profile" context menu to appear.
        this.addEventListener('contextmenu', e => {
            e.stopPropagation();
        });
    }
    #scheduleRender() {
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #getSkipStackFramesPatternSetting() {
        return Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern');
    }
    #startEditing() {
        // Do not need to trim here because this is a temporary one, we will trim the input when finish editing,
        this.#editingRegexSetting = { pattern: this.#newRegexInput.value, disabled: false, disabledForUrl: undefined };
        // We need to push the temp regex here to update the flame chart.
        // We are using the "skip-stack-frames-pattern" setting to determine which is rendered on flame chart. And the push
        // here will update the setting's value.
        this.#regexPatterns.push(this.#editingRegexSetting);
    }
    #finishEditing() {
        if (!this.#editingRegexSetting) {
            return;
        }
        const lastRegex = this.#regexPatterns.pop();
        // Add a sanity check to make sure the last one is the editing one.
        // In case the check fails, add back the last element.
        if (lastRegex && lastRegex !== this.#editingRegexSetting) {
            console.warn('The last regex is not the editing one.');
            this.#regexPatterns.push(lastRegex);
        }
        this.#editingRegexSetting = null;
        this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
    }
    #resetInput() {
        this.#newRegexCheckbox.checked = false;
        this.#newRegexInput.value = '';
    }
    #addNewRegexToIgnoreList() {
        const newRegex = this.#newRegexInput.value.trim();
        this.#finishEditing();
        if (!regexInputIsValid(newRegex)) {
            // It the new regex is invalid, let's skip it.
            return;
        }
        Workspace.IgnoreListManager.IgnoreListManager.instance().addRegexToIgnoreList(newRegex);
        this.#resetInput();
    }
    #handleKeyDown(event) {
        // When user press the 'Enter', the current regex will be added and user can keep adding more regexes.
        if (event.key === Platform.KeyboardUtilities.ENTER_KEY) {
            this.#addNewRegexToIgnoreList();
            this.#startEditing();
            return;
        }
        // When user press the 'Escape', it means cancel the editing, so the current regex won't be added and the input will
        // lose focus.
        if (event.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
            // Escape key will close the dialog, and toggle the `Console` drawer. So we need to ignore other listeners.
            event.stopImmediatePropagation();
            this.#finishEditing();
            this.#resetInput();
            this.#newRegexInput.blur();
        }
    }
    /**
     * When it is in the 'preview' mode, the last regex in the array is the editing one.
     * So we want to remove it for some usage, like rendering the existed rules or validating the rules.
     */
    #getExistingRegexes() {
        if (this.#editingRegexSetting) {
            const lastRegex = this.#regexPatterns[this.#regexPatterns.length - 1];
            // Add a sanity check to make sure the last one is the editing one.
            if (lastRegex && lastRegex === this.#editingRegexSetting) {
                // We don't want to modify the array itself, so just return a shadow copy of it.
                return this.#regexPatterns.slice(0, -1);
            }
        }
        return this.#regexPatterns;
    }
    #handleInputChange() {
        const newRegex = this.#newRegexInput.value.trim();
        if (this.#editingRegexSetting && regexInputIsValid(newRegex)) {
            this.#editingRegexSetting.pattern = newRegex;
            this.#editingRegexSetting.disabled = !Boolean(newRegex);
            this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
        }
    }
    #initAddNewItem() {
        this.#newRegexInput.placeholder = '/framework\\.js$';
        const checkboxHelpText = i18nString(UIStrings.ignoreScriptsWhoseNamesMatchNewRegex);
        const inputHelpText = i18nString(UIStrings.addNewRegex);
        UI.Tooltip.Tooltip.install(this.#newRegexCheckbox, checkboxHelpText);
        UI.Tooltip.Tooltip.install(this.#newRegexInput, inputHelpText);
        this.#newRegexInput.addEventListener('blur', this.#addNewRegexToIgnoreList.bind(this), false);
        this.#newRegexInput.addEventListener('keydown', this.#handleKeyDown.bind(this), false);
        this.#newRegexInput.addEventListener('input', this.#handleInputChange.bind(this), false);
        this.#newRegexInput.addEventListener('focus', this.#startEditing.bind(this), false);
    }
    #renderNewRegexRow() {
        // clang-format off
        return html `
      <div class='new-regex-row'>${this.#newRegexCheckbox}${this.#newRegexInput}</div>
    `;
        // clang-format on
    }
    /**
     * Deal with an existing regex being toggled. Note that this handler only
     * deals with enabling/disabling regexes already in the ignore list, it does
     * not deal with enabling/disabling the new regex.
     */
    #onExistingRegexEnableToggle(regex, checkbox) {
        regex.disabled = !checkbox.checked;
        // Technically we don't need to call the set function, because the regex is a reference, so it changed the setting
        // value directly.
        // But we need to call the set function to trigger the setting change event. which is needed by view update of flame
        // chart.
        this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
        // There is no need to update this component, since the only UI change is this checkbox, which is already done by
        // the user.
    }
    #removeRegexByIndex(index) {
        this.#regexPatterns.splice(index, 1);
        // Call the set function to trigger the setting change event. we listen to this event and will update this component
        // and the flame chart.
        this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
    }
    #renderItem(regex, index) {
        const checkboxWithLabel = UI.UIUtils.CheckboxLabel.createWithStringLiteral(regex.pattern, !regex.disabled, /* jslogContext*/ 'timeline.ignore-list-pattern');
        const helpText = i18nString(UIStrings.ignoreScriptsWhoseNamesMatchS, { regex: regex.pattern });
        UI.Tooltip.Tooltip.install(checkboxWithLabel, helpText);
        checkboxWithLabel.ariaLabel = helpText;
        checkboxWithLabel.addEventListener('change', this.#onExistingRegexEnableToggle.bind(this, regex, checkboxWithLabel), false);
        // clang-format off
        return html `
      <div class='regex-row'>
        ${checkboxWithLabel}
        <devtools-button
            @click=${this.#removeRegexByIndex.bind(this, index)}
            .data=${{
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            iconName: 'bin',
            title: i18nString(UIStrings.removeRegex, { regex: regex.pattern }),
            jslogContext: 'timeline.ignore-list-pattern.remove',
        }}></devtools-button>
      </div>
    `;
        // clang-format on
    }
    #render() {
        if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
            throw new Error('Ignore List setting dialog render was not scheduled');
        }
        // clang-format off
        const output = html `
      <style>${ignoreListSettingStyles}</style>
      <devtools-button-dialog .data=${{
            openOnRender: false,
            jslogContext: 'timeline.ignore-list',
            variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
            iconName: 'compress',
            disabled: !this.#ignoreListEnabled.get(),
            iconTitle: i18nString(UIStrings.showIgnoreListSettingDialog),
            horizontalAlignment: "auto" /* Dialogs.Dialog.DialogHorizontalAlignment.AUTO */,
            closeButton: true,
            dialogTitle: i18nString(UIStrings.ignoreList),
        }}>
        <div class='ignore-list-setting-content'>
          <div class='ignore-list-setting-description'>${i18nString(UIStrings.ignoreListDescription)}</div>
          ${this.#getExistingRegexes().map(this.#renderItem.bind(this))}
          ${this.#renderNewRegexRow()}
        </div>
      </devtools-button-dialog>
    `;
        // clang-format on
        Lit.render(output, this.#shadow, { host: this });
    }
}
customElements.define('devtools-perf-ignore-list-setting', IgnoreListSetting);
/**
 * Returns if a new regex string is valid to be added to the ignore list.
 * Note that things like duplicates are handled by the IgnoreList for us.
 *
 * @param inputValue the text input from the user we need to validate.
 */
export function regexInputIsValid(inputValue) {
    const pattern = inputValue.trim();
    if (!pattern.length) {
        return false;
    }
    let regex;
    try {
        regex = new RegExp(pattern);
    }
    catch {
    }
    return Boolean(regex);
}
//# sourceMappingURL=IgnoreListSetting.js.map