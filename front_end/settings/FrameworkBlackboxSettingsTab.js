// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.ListWidget.Delegate}
 * @unrestricted
 */
export class FrameworkBlackboxSettingsTab extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('settings/frameworkBlackboxSettingsTab.css');

    const header = this.contentElement.createChild('div', 'header');
    header.textContent = ls`Framework Blackboxing`;
    UI.ARIAUtils.markAsHeading(header, 1);
    this.contentElement.createChild('div', 'intro').textContent =
        ls`Debugger will skip through the scripts and will not stop on exceptions thrown by them.`;

    const blackboxContentScripts = this.contentElement.createChild('div', 'blackbox-content-scripts');
    blackboxContentScripts.appendChild(UI.SettingsUI.createSettingCheckbox(
        ls`Blackbox content scripts`, Common.Settings.Settings.instance().moduleSetting('skipContentScripts'), true));
    blackboxContentScripts.title = ls`Blackbox content scripts (extension scripts in the page)`;

    this._blackboxLabel = Common.UIString.UIString('Blackbox');
    this._disabledLabel = Common.UIString.UIString('Disabled');

    this._list = new UI.ListWidget.ListWidget(this);
    this._list.element.classList.add('blackbox-list');
    this._list.registerRequiredCSS('settings/frameworkBlackboxSettingsTab.css');

    const placeholder = createElementWithClass('div', 'blackbox-list-empty');
    placeholder.textContent = Common.UIString.UIString('No blackboxed patterns');
    this._list.setEmptyPlaceholder(placeholder);
    this._list.show(this.contentElement);
    const addPatternButton = UI.UIUtils.createTextButton(
        Common.UIString.UIString('Add pattern...'), this._addButtonClicked.bind(this), 'add-button');
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
    const element = createElementWithClass('div', 'blackbox-list-item');
    const pattern = element.createChild('div', 'blackbox-pattern');
    pattern.textContent = item.pattern;
    pattern.title = ls`Blackbox scripts whose names match '${item.pattern}'`;
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
    titles.createChild('div', 'blackbox-pattern').textContent = Common.UIString.UIString('Pattern');
    titles.createChild('div', 'blackbox-separator blackbox-separator-invisible');
    titles.createChild('div', 'blackbox-behavior').textContent = Common.UIString.UIString('Behavior');

    const fields = content.createChild('div', 'blackbox-edit-row');
    const pattern = editor.createInput('pattern', 'text', '/framework\\.js$', patternValidator.bind(this));
    UI.ARIAUtils.setAccessibleName(pattern, ls`Pattern`);
    fields.createChild('div', 'blackbox-pattern').appendChild(pattern);
    fields.createChild('div', 'blackbox-separator blackbox-separator-invisible');
    const behavior = editor.createSelect('behavior', [this._blackboxLabel, this._disabledLabel], behaviorValidator);
    UI.ARIAUtils.setAccessibleName(behavior, ls`Behavior`);
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
        return {valid: false, errorMessage: ls`Pattern cannot be empty`};
      }

      for (let i = 0; i < patterns.length; ++i) {
        if (i !== index && patterns[i].pattern === pattern) {
          return {valid: false, errorMessage: ls`Pattern already exists`};
        }
      }

      let regex;
      try {
        regex = new RegExp(pattern);
      } catch (e) {
      }
      if (!regex) {
        return {valid: false, errorMessage: ls`Pattern must be a valid regular expression`};
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
