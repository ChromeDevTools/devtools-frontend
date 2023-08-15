// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Common from '../../core/common/common.js';

import {Presets, RuntimeSettings, type LighthouseController, type Preset} from './LighthouseController.js';
import {RadioSetting} from './RadioSetting.js';
import lighthouseStartViewStyles from './lighthouseStartView.css.js';
import {type LighthousePanel} from './LighthousePanel.js';

const UIStrings = {
  /**
   * @description Text displayed as the title of a panel that can be used to audit a web page with Lighthouse.
   */
  generateLighthouseReport: 'Generate a Lighthouse report',
  /**
   * @description Text that refers to the Lighthouse mode
   */
  mode: 'Mode',
  /**
   * @description Title in the Lighthouse Start View for list of categories to run during audit
   */
  categories: 'Categories',
  /**
   * @description Title in the Lighthouse Start View for list of available start plugins
   */
  plugins: 'Plugins',
  /**
   * @description Label for a button to start analyzing a page navigation with Lighthouse
   */
  analyzeNavigation: 'Analyze page load',
  /**
   * @description Label for a button to start analyzing the current page state with Lighthouse
   */
  analyzeSnapshot: 'Analyze page state',
  /**
   * @description Label for a button that starts a Lighthouse mode that analyzes user interactions over a period of time.
   */
  startTimespan: 'Start timespan',
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   * @description Text that refers to device such as a phone
   */
  device: 'Device',
};

const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseStartView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class StartView extends UI.Widget.Widget {
  private controller: LighthouseController;
  private panel: LighthousePanel;
  private readonly settingsToolbarInternal: UI.Toolbar.Toolbar;
  private startButton!: HTMLButtonElement;
  private helpText?: Element;
  private warningText?: Element;
  private checkboxes: Array<{preset: Preset, checkbox: UI.Toolbar.ToolbarCheckbox}> = [];

  changeFormMode?: (mode: string) => void;

  constructor(controller: LighthouseController, panel: LighthousePanel) {
    super();

    this.controller = controller;
    this.panel = panel;
    this.settingsToolbarInternal = new UI.Toolbar.Toolbar('');
    this.render();
  }

  private populateRuntimeSettingAsRadio(settingName: string, label: string, parentElement: Element): void {
    const runtimeSetting = RuntimeSettings.find(item => item.setting.name === settingName);
    if (!runtimeSetting || !runtimeSetting.options) {
      throw new Error(`${settingName} is not a setting with options`);
    }

    const labelEl = document.createElement('div');
    labelEl.classList.add('lighthouse-form-section-label');
    labelEl.textContent = label;

    if (runtimeSetting.learnMore) {
      const link =
          UI.XLink.XLink.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), 'lighthouse-learn-more');
      labelEl.append(link);
    }
    parentElement.appendChild(labelEl);

    const control = new RadioSetting(
        runtimeSetting.options, runtimeSetting.setting as Common.Settings.Setting<string>,
        runtimeSetting.description());
    parentElement.appendChild(control.element);
    UI.ARIAUtils.setLabel(control.element, label);
  }

  private populateRuntimeSettingAsToolbarCheckbox(settingName: string, toolbar: UI.Toolbar.Toolbar): void {
    const runtimeSetting = RuntimeSettings.find(item => item.setting.name === settingName);
    if (!runtimeSetting || !runtimeSetting.title) {
      throw new Error(`${settingName} is not a setting with a title`);
    }

    runtimeSetting.setting.setTitle(runtimeSetting.title());
    const control = new UI.Toolbar.ToolbarSettingCheckbox(
        runtimeSetting.setting as Common.Settings.Setting<boolean>, runtimeSetting.description());
    toolbar.appendToolbarItem(control);
    if (runtimeSetting.learnMore) {
      const link =
          UI.XLink.XLink.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), 'lighthouse-learn-more');
      link.style.margin = '5px';
      control.element.appendChild(link);
    }
  }

  private populateRuntimeSettingAsToolbarDropdown(settingName: string, toolbar: UI.Toolbar.Toolbar): void {
    const runtimeSetting = RuntimeSettings.find(item => item.setting.name === settingName);
    if (!runtimeSetting || !runtimeSetting.title) {
      throw new Error(`${settingName} is not a setting with a title`);
    }

    const options = runtimeSetting.options?.map(option => ({label: option.label(), value: option.value})) || [];

    runtimeSetting.setting.setTitle(runtimeSetting.title());
    const control = new UI.Toolbar.ToolbarSettingComboBox(
        options,
        runtimeSetting.setting as Common.Settings.Setting<string>,
        runtimeSetting.title(),
    );
    control.setTitle(runtimeSetting.description());
    toolbar.appendToolbarItem(control);
    if (runtimeSetting.learnMore) {
      const link =
          UI.XLink.XLink.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), 'lighthouse-learn-more');
      link.style.margin = '5px';
      control.element.appendChild(link);
    }
  }

  private populateFormControls(fragment: UI.Fragment.Fragment, mode?: string): void {
    // Populate the device type
    const deviceTypeFormElements = fragment.$('device-type-form-elements');
    this.populateRuntimeSettingAsRadio('lighthouse.device_type', i18nString(UIStrings.device), deviceTypeFormElements);

    // Populate the categories
    const categoryFormElements = fragment.$('categories-form-elements') as HTMLElement;
    const pluginFormElements = fragment.$('plugins-form-elements') as HTMLElement;

    this.checkboxes = [];
    for (const preset of Presets) {
      const formElements = preset.plugin ? pluginFormElements : categoryFormElements;
      preset.setting.setTitle(preset.title());
      const checkbox = new UI.Toolbar.ToolbarSettingCheckbox(preset.setting, preset.description());
      const row = formElements.createChild('div', 'vbox lighthouse-launcher-row');
      row.appendChild(checkbox.element);
      checkbox.element.setAttribute('data-lh-category', preset.configID);
      this.checkboxes.push({preset, checkbox});
      if (mode && !preset.supportedModes.includes(mode)) {
        checkbox.setEnabled(false);
        checkbox.setIndeterminate(true);
      }
    }
    UI.ARIAUtils.markAsGroup(categoryFormElements);
    UI.ARIAUtils.setLabel(categoryFormElements, i18nString(UIStrings.categories));
    UI.ARIAUtils.markAsGroup(pluginFormElements);
    UI.ARIAUtils.setLabel(pluginFormElements, i18nString(UIStrings.plugins));
  }

  private render(): void {
    this.populateRuntimeSettingAsToolbarCheckbox('lighthouse.clear_storage', this.settingsToolbarInternal);
    this.populateRuntimeSettingAsToolbarDropdown('lighthouse.throttling', this.settingsToolbarInternal);

    const {mode} = this.controller.getFlags();
    this.populateStartButton(mode);

    const fragment = UI.Fragment.Fragment.build`
<form class="lighthouse-start-view">
  <header class="hbox">
    <div class="lighthouse-logo"></div>
    <div class="lighthouse-title">${i18nString(UIStrings.generateLighthouseReport)}</div>
    <div class="lighthouse-start-button-container" $="start-button-container">${this.startButton}</div>
  </header>
  <div $="help-text" class="lighthouse-help-text hidden"></div>
  <div class="lighthouse-options hbox">
    <div class="lighthouse-form-section">
      <div class="lighthouse-form-elements" $="mode-form-elements"></div>
    </div>
    <div class="lighthouse-form-section">
      <div class="lighthouse-form-elements" $="device-type-form-elements"></div>
    </div>
    <div class="lighthouse-form-categories">
      <div class="lighthouse-form-section">
        <div class="lighthouse-form-section-label">${i18nString(UIStrings.categories)}</div>
        <div class="lighthouse-form-elements" $="categories-form-elements"></div>
      </div>
      <div class="lighthouse-form-section">
        <div class="lighthouse-form-section-label">
          <div class="lighthouse-icon-label">${i18nString(UIStrings.plugins)}</div>
        </div>
        <div class="lighthouse-form-elements" $="plugins-form-elements"></div>
      </div>
    </div>
  </div>
  <div $="warning-text" class="lighthouse-warning-text hidden"></div>
</form>
    `;

    this.helpText = fragment.$('help-text');
    this.warningText = fragment.$('warning-text');

    const modeFormElements = fragment.$('mode-form-elements');
    this.populateRuntimeSettingAsRadio('lighthouse.mode', i18nString(UIStrings.mode), modeFormElements);

    this.populateFormControls(fragment, mode);

    this.contentElement.textContent = '';
    this.contentElement.append(fragment.element());

    this.refresh();
  }

  private populateStartButton(mode: string): void {
    let buttonLabel: Platform.UIString.LocalizedString;
    let callback: () => void;

    if (mode === 'timespan') {
      buttonLabel = i18nString(UIStrings.startTimespan);
      callback = (): void => {
        void this.panel.handleTimespanStart();
      };
    } else if (mode === 'snapshot') {
      buttonLabel = i18nString(UIStrings.analyzeSnapshot);
      callback = (): void => {
        void this.panel.handleCompleteRun();
      };
    } else {
      buttonLabel = i18nString(UIStrings.analyzeNavigation);
      callback = (): void => {
        void this.panel.handleCompleteRun();
      };
    }

    const startButtonContainer = this.contentElement.querySelector('.lighthouse-start-button-container');
    if (startButtonContainer) {
      startButtonContainer.textContent = '';
      this.startButton = UI.UIUtils.createTextButton(
          buttonLabel,
          callback,
          /* className */ '',
          /* primary */ true,
      );
      startButtonContainer.append(this.startButton);
    }
  }

  refresh(): void {
    const {mode} = this.controller.getFlags();
    this.populateStartButton(mode);

    for (const {checkbox, preset} of this.checkboxes) {
      if (preset.supportedModes.includes(mode)) {
        checkbox.setEnabled(true);
        checkbox.setIndeterminate(false);
      } else {
        checkbox.setEnabled(false);
        checkbox.setIndeterminate(true);
      }
    }

    // Ensure the correct layout is used after refresh.
    this.onResize();
  }

  override onResize(): void {
    const useNarrowLayout = this.contentElement.offsetWidth < 500;
    const useWideLayout = this.contentElement.offsetWidth > 800;
    const headerEl = this.contentElement.querySelector('.lighthouse-start-view header');
    const optionsEl = this.contentElement.querySelector('.lighthouse-options');
    if (headerEl) {
      headerEl.classList.toggle('hbox', !useNarrowLayout);
      headerEl.classList.toggle('vbox', useNarrowLayout);
    }
    if (optionsEl) {
      optionsEl.classList.toggle('wide', useWideLayout);
      optionsEl.classList.toggle('narrow', useNarrowLayout);
    }
  }

  focusStartButton(): void {
    this.startButton.focus();
  }

  setStartButtonEnabled(isEnabled: boolean): void {
    if (this.helpText) {
      this.helpText.classList.toggle('hidden', isEnabled);
    }

    if (this.startButton) {
      this.startButton.disabled = !isEnabled;
    }
  }

  setUnauditableExplanation(text: string|null): void {
    if (this.helpText) {
      this.helpText.textContent = text;
    }
  }

  setWarningText(text: string|null): void {
    if (this.warningText) {
      this.warningText.textContent = text;
      this.warningText.classList.toggle('hidden', !text);
    }
  }

  override wasShown(): void {
    super.wasShown();
    this.controller.recomputePageAuditability();
    this.registerCSSFiles([lighthouseStartViewStyles]);
  }

  settingsToolbar(): UI.Toolbar.Toolbar {
    return this.settingsToolbarInternal;
  }
}
