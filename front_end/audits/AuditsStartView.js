// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {AuditController, Events, Presets, RuntimeSettings} from './AuditsController.js';  // eslint-disable-line no-unused-vars
import {RadioSetting} from './RadioSetting.js';

/**
 * @unrestricted
 */
export class StartView extends UI.Widget {
  /**
   * @param {!AuditController} controller
   */
  constructor(controller) {
    super();
    this.registerRequiredCSS('audits/auditsStartView.css');
    this._controller = controller;
    this._settingsToolbar = new UI.Toolbar('');
    this._render();
  }

  /**
   * @return {!UI.Toolbar}
   */
  settingsToolbar() {
    return this._settingsToolbar;
  }

  /**
   * @param {string} settingName
   * @param {string} label
   * @param {!Element} parentElement
   */
  _populateRuntimeSettingAsRadio(settingName, label, parentElement) {
    const runtimeSetting = RuntimeSettings.find(item => item.setting.name === settingName);
    if (!runtimeSetting || !runtimeSetting.options) {
      throw new Error(`${settingName} is not a setting with options`);
    }

    const control = new RadioSetting(runtimeSetting.options, runtimeSetting.setting, runtimeSetting.description);
    parentElement.appendChild(control.element);
    UI.ARIAUtils.setAccessibleName(control.element, label);
  }

  /**
   * @param {string} settingName
   * @param {!UI.Toolbar} toolbar
   */
  _populateRuntimeSettingAsToolbarCheckbox(settingName, toolbar) {
    const runtimeSetting = RuntimeSettings.find(item => item.setting.name === settingName);
    if (!runtimeSetting || !runtimeSetting.title) {
      throw new Error(`${settingName} is not a setting with a title`);
    }

    runtimeSetting.setting.setTitle(runtimeSetting.title);
    const control = new UI.ToolbarSettingCheckbox(runtimeSetting.setting, runtimeSetting.description);
    toolbar.appendToolbarItem(control);
    if (runtimeSetting.learnMore) {
      const link = UI.XLink.create(runtimeSetting.learnMore, ls`Learn more`, 'audits-learn-more');
      link.style.padding = '5px';
      control.element.appendChild(link);
    }
  }

  /**
   * @param {!UI.Fragment} fragment
   */
  _populateFormControls(fragment) {
    // Populate the device type
    const deviceTypeFormElements = fragment.$('device-type-form-elements');
    this._populateRuntimeSettingAsRadio('audits.device_type', ls`Device`, deviceTypeFormElements);

    // Populate the categories
    const categoryFormElements = fragment.$('categories-form-elements');
    const pluginFormElements = fragment.$('plugins-form-elements');
    for (const preset of Presets) {
      const formElements = preset.plugin ? pluginFormElements : categoryFormElements;
      preset.setting.setTitle(preset.title);
      const checkbox = new UI.ToolbarSettingCheckbox(preset.setting);
      const row = formElements.createChild('div', 'vbox audits-launcher-row');
      row.title = preset.description;
      row.appendChild(checkbox.element);
    }
    UI.ARIAUtils.markAsGroup(categoryFormElements);
    UI.ARIAUtils.setAccessibleName(categoryFormElements, ls`Categories`);
    UI.ARIAUtils.markAsGroup(pluginFormElements);
    UI.ARIAUtils.setAccessibleName(pluginFormElements, ls`Community Plugins (beta)`);
  }

  _render() {
    this._populateRuntimeSettingAsToolbarCheckbox('audits.clear_storage', this._settingsToolbar);
    this._populateRuntimeSettingAsToolbarCheckbox('audits.throttling', this._settingsToolbar);

    this._startButton = UI.createTextButton(
        ls`Generate report`,
        () => this._controller.dispatchEventToListeners(
            Events.RequestAuditStart,
            /* keyboardInitiated */ UI.elementIsFocusedByKeyboard(this._startButton)),
        /* className */ '', /* primary */ true);
    this.setDefaultFocusedElement(this._startButton);

    const auditsDescription = ls
    `Identify and fix common problems that affect your site's performance, accessibility, and user experience.`;  // crbug.com/972969

    const fragment = UI.Fragment.build`
      <div class="vbox audits-start-view">
        <header>
          <div class="audits-logo"></div>
          <div class="audits-start-button-container hbox">
            ${this._startButton}
            </div>
          <div $="help-text" class="audits-help-text hidden"></div>
          <div class="audits-start-view-text">
            <span>${auditsDescription}</span>
            ${UI.XLink.create('https://developers.google.com/web/tools/lighthouse/', ls`Learn more`)}
          </div>
        </header>
        <form>
          <div class="audits-form-categories">
            <div class="audits-form-section">
              <div class="audits-form-section-label">
                ${ls`Categories`}
              </div>
              <div class="audits-form-elements" $="categories-form-elements"></div>
            </div>
            <div class="audits-form-section">
              <div class="audits-form-section-label">
                <div class="audits-icon-label">${ls`Community Plugins (beta)`}</div>
              </div>
              <div class="audits-form-elements" $="plugins-form-elements"></div>
            </div>
          </div>
          <div class="audits-form-section">
            <div class="audits-form-section-label">
              ${ls`Device`}
            </div>
            <div class="audits-form-elements" $="device-type-form-elements"></div>
          </div>
        </form>
      </div>
    `;

    this._helpText = fragment.$('help-text');
    this._populateFormControls(fragment);
    this.contentElement.appendChild(fragment.element());
    this.contentElement.style.overflow = 'auto';
  }

  /**
   * @override
   */
  onResize() {
    const useNarrowLayout = this.contentElement.offsetWidth < 560;
    const startViewEl = this.contentElement.querySelector('.audits-start-view');
    startViewEl.classList.toggle('hbox', !useNarrowLayout);
    startViewEl.classList.toggle('vbox', useNarrowLayout);
  }

  focusStartButton() {
    this._startButton.focus();
  }

  /**
   * @param {boolean} isEnabled
   */
  setStartButtonEnabled(isEnabled) {
    if (this._helpText) {
      this._helpText.classList.toggle('hidden', isEnabled);
    }

    if (this._startButton) {
      this._startButton.disabled = !isEnabled;
    }
  }

  /**
   * @param {?string} text
   */
  setUnauditableExplanation(text) {
    if (this._helpText) {
      this._helpText.textContent = text;
    }
  }
}
