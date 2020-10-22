// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Header text content in Framework Blackbox Settings Tab of the Settings
  */
  frameworkBlackboxing: 'Framework Blackboxing',
  /**
  *@description Text in Framework Blackbox Settings Tab of the Settings
  */
  debuggerWillSkipThroughThe: 'Debugger will skip through the scripts and will not stop on exceptions thrown by them.',
  /**
  *@description Text in Framework Blackbox Settings Tab of the Settings
  */
  blackboxContentScripts: 'Blackbox content scripts',
  /**
  *@description Blackbox content scripts title in Framework Blackbox Settings Tab of the Settings
  */
  blackboxContentScriptsExtension: 'Blackbox content scripts (extension scripts in the page)',
  /**
  *@description Blackbox label in Framework Blackbox Settings Tab of the Settings
  */
  blackbox: 'Blackbox',
  /**
  *@description Text to indicate something is not enabled
  */
  disabled: 'Disabled',
  /**
  *@description Placeholder text content in Framework Blackbox Settings Tab of the Settings
  */
  noBlackboxedPatterns: 'No blackboxed patterns',
  /**
  *@description Text of the add pattern button in Framework Blackbox Settings Tab of the Settings
  */
  addPattern: 'Add pattern...',
  /**
  *@description Aria accessible name in Framework Blackbox Settings Tab of the Settings
  */
  addFilenamePattern: 'Add filename pattern',
  /**
  *@description Pattern title in Framework Blackbox Settings Tab of the Settings
  *@example {ad.*?} PH1
  */
  blackboxScriptsWhoseNamesMatchS: 'Blackbox scripts whose names match \'{PH1}\'',
  /**
  *@description Aria accessible name in Framework Blackbox Settings Tab of the Settings
  */
  pattern: 'Pattern',
  /**
  *@description Aria accessible name in Framework Blackbox Settings Tab of the Settings
  */
  behavior: 'Behavior',
  /**
  *@description Error message in Framework Blackbox settings pane that declares pattern must not be empty
  */
  patternCannotBeEmpty: 'Pattern cannot be empty',
  /**
  *@description Error message in Framework Blackbox settings pane that declares pattern already exits
  */
  patternAlreadyExists: 'Pattern already exists',
  /**
  *@description Error message in Framework Blackbox settings pane that declares pattern must be a valid regular expression
  */
  patternMustBeAValidRegular: 'Pattern must be a valid regular expression',
};
const str_ = i18n.i18n.registerUIStrings('settings/FrameworkBlackboxSettingsTab.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * @implements {UI.ListWidget.Delegate}
 * @unrestricted
 */
export class FrameworkBlackboxSettingsTab extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('settings/frameworkBlackboxSettingsTab.css');

    const header = this.contentElement.createChild('div', 'header');
    header.textContent = i18nString(UIStrings.frameworkBlackboxing);
    UI.ARIAUtils.markAsHeading(header, 1);
    this.contentElement.createChild('div', 'intro').textContent = i18nString(UIStrings.debuggerWillSkipThroughThe);

    const blackboxContentScripts = this.contentElement.createChild('div', 'blackbox-content-scripts');
    blackboxContentScripts.appendChild(UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.blackboxContentScripts),
        Common.Settings.Settings.instance().moduleSetting('skipContentScripts'), true));
    blackboxContentScripts.title = i18nString(UIStrings.blackboxContentScriptsExtension);

    this._blackboxLabel = i18nString(UIStrings.blackbox);
    this._disabledLabel = i18nString(UIStrings.disabled);

    this._list = new UI.ListWidget.ListWidget(this);
    this._list.element.classList.add('blackbox-list');
    this._list.registerRequiredCSS('settings/frameworkBlackboxSettingsTab.css');

    const placeholder = document.createElement('div');
    placeholder.classList.add('blackbox-list-empty');
    placeholder.textContent = i18nString(UIStrings.noBlackboxedPatterns);
    this._list.setEmptyPlaceholder(placeholder);
    this._list.show(this.contentElement);
    const addPatternButton =
        UI.UIUtils.createTextButton(i18nString(UIStrings.addPattern), this._addButtonClicked.bind(this), 'add-button');
    UI.ARIAUtils.setAccessibleName(addPatternButton, i18nString(UIStrings.addFilenamePattern));
    this.contentElement.appendChild(addPatternButton);

    this._setting = Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern');
    this._setting.addChangeListener(this._settingUpdated, this);

    this.setDefaultFocusedElement(addPatternButton);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._settingUpdated();
  }

  _settingUpdated() {
    this._list.clear();
    const patterns = this._setting.getAsArray();
    for (let i = 0; i < patterns.length; ++i) {
      this._list.appendItem(patterns[i], true);
    }
  }

  _addButtonClicked() {
    this._list.addNewItem(this._setting.getAsArray().length, {pattern: '', disabled: false});
  }

  /**
   * @override
   * @param {*} item
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(item, editable) {
    const element = document.createElement('div');
    element.classList.add('blackbox-list-item');
    const pattern = element.createChild('div', 'blackbox-pattern');
    pattern.textContent = item.pattern;
    pattern.title = i18nString(UIStrings.blackboxScriptsWhoseNamesMatchS, {PH1: item.pattern});
    element.createChild('div', 'blackbox-separator');
    element.createChild('div', 'blackbox-behavior').textContent =
        item.disabled ? this._disabledLabel : this._blackboxLabel;
    if (item.disabled) {
      element.classList.add('blackbox-disabled');
    }
    return element;
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    const patterns = this._setting.getAsArray();
    patterns.splice(index, 1);
    this._setting.setAsArray(patterns);
  }

  /**
   * @override
   * @param {*} item
   * @param {!UI.ListWidget.Editor} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
    item.pattern = editor.control('pattern').value.trim();
    item.disabled = editor.control('behavior').value === this._disabledLabel;

    const list = this._setting.getAsArray();
    if (isNew) {
      list.push(item);
    }
    this._setting.setAsArray(list);
  }

  /**
   * @override
   * @param {*} item
   * @return {!UI.ListWidget.Editor}
   */
  beginEdit(item) {
    const editor = this._createEditor();
    editor.control('pattern').value = item.pattern;
    editor.control('behavior').value = item.disabled ? this._disabledLabel : this._blackboxLabel;
    return editor;
  }

  /**
   * @return {!UI.ListWidget.Editor}
   */
  _createEditor() {
    if (this._editor) {
      return this._editor;
    }

    const editor = new UI.ListWidget.Editor();
    this._editor = editor;
    const content = editor.contentElement();

    const titles = content.createChild('div', 'blackbox-edit-row');
    titles.createChild('div', 'blackbox-pattern').textContent = i18nString(UIStrings.pattern);
    titles.createChild('div', 'blackbox-separator blackbox-separator-invisible');
    titles.createChild('div', 'blackbox-behavior').textContent = i18nString(UIStrings.behavior);

    const fields = content.createChild('div', 'blackbox-edit-row');
    const pattern = editor.createInput('pattern', 'text', '/framework\\.js$', patternValidator.bind(this));
    UI.ARIAUtils.setAccessibleName(pattern, i18nString(UIStrings.pattern));
    fields.createChild('div', 'blackbox-pattern').appendChild(pattern);
    fields.createChild('div', 'blackbox-separator blackbox-separator-invisible');
    const behavior = editor.createSelect('behavior', [this._blackboxLabel, this._disabledLabel], behaviorValidator);
    UI.ARIAUtils.setAccessibleName(behavior, i18nString(UIStrings.behavior));
    fields.createChild('div', 'blackbox-behavior').appendChild(behavior);

    return editor;

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @this {FrameworkBlackboxSettingsTab}
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function patternValidator(item, index, input) {
      const pattern = input.value.trim();
      const patterns = this._setting.getAsArray();

      if (!pattern.length) {
        return {valid: false, errorMessage: i18nString(UIStrings.patternCannotBeEmpty)};
      }

      for (let i = 0; i < patterns.length; ++i) {
        if (i !== index && patterns[i].pattern === pattern) {
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

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function behaviorValidator(item, index, input) {
      return {valid: true};
    }
  }
}
