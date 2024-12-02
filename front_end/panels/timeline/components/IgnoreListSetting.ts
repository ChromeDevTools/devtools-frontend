// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/menus/menus.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import ignoreListSettingStyles from './ignoreListSetting.css.js';

const {html} = LitHtml;

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
  ignoreListDescription: 'Add these exclusion rules would simplify the flame chart.',
  /**
   *@description Pattern title in Framework Ignore List Settings Tab of the Settings
   *@example {ad.*?} regex
   */
  ignoreScriptsWhoseNamesMatchS: 'Ignore scripts whose names match \'\'{regex}\'\'',
  /**
   *@description Label for the button to remove an regex
   *@example {ad.*?} regex
   */
  removeRegex: 'Remove the regex: \'\'{regex}\'\'',
  /**
   *@description Aria accessible name in Ignore List Settings Dialog in Performance panel. It labels the input
   * field used to add new or edit existing regular expressions that match file names to ignore in the debugger.
   */
  addNewRegex: 'Add a regular expression rule for the script\'s URL',
  /**
   * @description Aria accessible name in Ignore List Settings Dialog in Performance panel. It labels the checkbox of
   * the input field used to enable the new regular expressions that match file names to ignore in the debugger.
   */
  ignoreScriptsWhoseNamesMatchNewRegex: 'Ignore scripts whose names match the new regex',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern must not be empty
   */
  patternCannotBeEmpty: 'Rule can\'t be empty',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern already exits
   */
  patternAlreadyExists: 'Rule already exists',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern must be a valid regular expression
   */
  patternMustBeAValidRegular: 'Rule must be a valid regular expression',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/IgnoreListSetting.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class IgnoreListSetting extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);
  readonly #ignoreListEnabled: Common.Settings.Setting<boolean> =
      Common.Settings.Settings.instance().moduleSetting('enable-ignore-listing');
  readonly #regexPatterns = this.#getSkipStackFramesPatternSetting().getAsArray();

  #newItemCheckbox = UI.UIUtils.CheckboxLabel.create(
      /* title*/ undefined, /* checked*/ false, /* subtitle*/ undefined,
      /* jslogContext*/ 'timeline.ignore-list-new-regex.checkbox');
  #newItemInput = UI.UIUtils.createInput(
      /* className*/ 'new-regex-text-input', /* type*/ 'text', /* jslogContext*/ 'timeline.ignore-list-new-regex.text');

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

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [ignoreListSettingStyles];
    this.#scheduleRender();
  }

  #scheduleRender(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #getSkipStackFramesPatternSetting(): Common.Settings.RegExpSetting {
    return Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as
        Common.Settings.RegExpSetting;
  }

  #onNewRegexAdded(): void {
    const newRegex = this.#newItemInput.value.trim();
    const {valid} = patternValidator(this.#regexPatterns, newRegex);
    if (!valid) {
      // It the new regex is invalid, let's skip it.
      return;
    }
    Bindings.IgnoreListManager.IgnoreListManager.instance().addRegexToIgnoreList(newRegex);
    this.#newItemCheckbox.checkboxElement.checked = false;
    this.#newItemInput.value = '';
  }

  #handleKeyDown(event: KeyboardEvent): void {
    // We do not want to create multi-line labels.
    // Therefore, if the new key is `Enter` key, treat it
    // as the end of the label input and blur the input field.
    if (event.key === 'Enter' || event.key === 'Escape') {
      this.#newItemInput.dispatchEvent(new FocusEvent('blur'));
      return;
    }
  }

  #handleInputChange(): void {
    // Enable the rule if the text input field is not empty.
    this.#newItemCheckbox.checkboxElement.checked = Boolean(this.#newItemInput.value.trim());
  }

  #initAddNewItem(): void {
    const checkboxHelpText = i18nString(UIStrings.ignoreScriptsWhoseNamesMatchNewRegex);
    const inputHelpText = i18nString(UIStrings.addNewRegex);
    UI.Tooltip.Tooltip.install(this.#newItemCheckbox, checkboxHelpText);
    UI.Tooltip.Tooltip.install(this.#newItemInput, inputHelpText);

    this.#newItemInput.addEventListener('blur', this.#onNewRegexAdded.bind(this), false);
    this.#newItemInput.addEventListener('keydown', this.#handleKeyDown.bind(this), false);
    this.#newItemInput.addEventListener('input', this.#handleInputChange.bind(this), false);
  }

  #onRegexEnableToggled(regex: Common.Settings.RegExpSettingItem, checkbox: UI.UIUtils.CheckboxLabel): void {
    regex.disabled = !checkbox.checkboxElement.checked;

    // Technically we don't need to call the set function, because the regex is a reference, so it changed the setting
    // value directly.
    // But we need to call the set function to trigger the setting change event. which is needed by view update of flame
    // chart.
    this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
    // There is no need to update this component, since the only UI change is this checkbox, which is already done by
    // the user.
  }

  #removeRegexByIndex(index: number): void {
    this.#regexPatterns.splice(index, 1);
    this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
  }

  #renderItem(regex: Common.Settings.RegExpSettingItem, index: number): LitHtml.TemplateResult {
    const checkboxWithLabel = UI.UIUtils.CheckboxLabel.create(
        regex.pattern, !regex.disabled, /* subtitle*/ undefined, /* jslogContext*/ 'timeline.ignore-list-pattern');
    const helpText = i18nString(UIStrings.ignoreScriptsWhoseNamesMatchS, {regex: regex.pattern});
    UI.Tooltip.Tooltip.install(checkboxWithLabel, helpText);
    checkboxWithLabel.checkboxElement.ariaLabel = helpText;
    checkboxWithLabel.checkboxElement.addEventListener(
        'change', this.#onRegexEnableToggled.bind(this, regex, checkboxWithLabel), false);
    // clang-format off
    return html`
      <div class='regex-row'>
        ${checkboxWithLabel}
        <devtools-button
            @click=${this.#removeRegexByIndex.bind(this, index)}
            .data=${{
            variant: Buttons.Button.Variant.ICON,
            iconName: 'bin',
            title: i18nString(UIStrings.removeRegex, {regex: regex.pattern}),
            jslogContext: 'timeline.ignore-list-pattern.remove',
          } as Buttons.Button.ButtonData}></devtools-button>
      </div>
    `;
    // clang-format on
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Ignore List setting dialog render was not scheduled');
    }
    // clang-format off
    const output = html`
      <devtools-button-dialog .data=${{
          openOnRender: false,
          jslogContext: 'timeline.ignore-list',
          variant: Buttons.Button.Variant.TOOLBAR,
          iconName: 'compress',
          disabled: !this.#ignoreListEnabled.get(),
          iconTitle: i18nString(UIStrings.showIgnoreListSettingDialog),
          horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
          closeButton: true,
          dialogTitle: i18nString(UIStrings.ignoreList),
        } as Dialogs.ButtonDialog.ButtonDialogData}>
        <div class='ignore-list-setting-content'>
          <div class='ignore-list-setting-description'>${i18nString(UIStrings.ignoreListDescription)}</div>
          ${this.#regexPatterns.map(this.#renderItem.bind(this))}
          <div class='new-regex-row'>${this.#newItemCheckbox}${this.#newItemInput}</div>
        </div>
      </devtools-button-dialog>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

customElements.define('devtools-perf-ignore-list-setting', IgnoreListSetting);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-perf-ignore-list-setting': IgnoreListSetting;
  }
}

/**
 * Returns if a new regex string is valid for the given regex setting array.
 *
 * Export for test reason
 * @param existingRegexes an array of objects, each representing a regex pattern and its state.
 * @param inputValue new regex in string format
 * @returns if the regex is valid and if not, why it is invalid
 */
export function patternValidator(
    existingRegexes: Common.Settings.RegExpSettingItem[], inputValue: string): ({valid: true}|{
  valid: false,
  errorMessage: string,
}) {
  const pattern = inputValue.trim();

  if (!pattern.length) {
    return {valid: false, errorMessage: i18nString(UIStrings.patternCannotBeEmpty)};
  }

  for (let i = 0; i < existingRegexes.length; ++i) {
    const regexPattern = existingRegexes[i];
    if (regexPattern.pattern === pattern && regexPattern.disabled === false &&
        regexPattern.disabledForUrl === undefined) {
      return {valid: false, errorMessage: i18nString(UIStrings.patternAlreadyExists)};
    }
  }

  let regex;
  try {
    regex = new RegExp(pattern);
  } catch (e) {
  }
  if (!regex) {
    return {valid: false, errorMessage: i18nString(UIStrings.patternMustBeAValidRegular)};
  }
  return {valid: true};
}
