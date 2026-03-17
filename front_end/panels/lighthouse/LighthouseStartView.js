// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import { Link } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import { getPresets, getRuntimeSettings } from './LighthouseController.js';
import lighthouseStartViewStyles from './lighthouseStartView.css.js';
import { RadioSetting } from './RadioSetting.js';
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
const renderStartView = (_input, output, target) => {
    // clang-format off
    render(html `
      <form class="lighthouse-start-view">
        <header class="hbox">
          <div class="lighthouse-logo"></div>
          <div class="lighthouse-title">
            ${i18nString(UIStrings.generateLighthouseReport)}
          </div>
          <div class="lighthouse-start-button-container"></div>
        </header>
        <div
          ${Directives.ref(e => {
        output.helpText = e;
    })}
          class="lighthouse-help-text hidden"
        ></div>
        <div class="lighthouse-options hbox">
          <div class="lighthouse-form-section">
            <div
              class="lighthouse-form-elements"
              ${Directives.ref(e => {
        output.modeFormElements = e;
    })}
            ></div>
          </div>
          <div class="lighthouse-form-section">
            <div
              class="lighthouse-form-elements"
              ${Directives.ref(e => {
        output.deviceTypeFormElements = e;
    })}
            ></div>
          </div>
          <div class="lighthouse-form-categories">
            <fieldset class="lighthouse-form-section lighthouse-form-categories-fieldset">
              <legend class="lighthouse-form-section-label">
                ${i18nString(UIStrings.categories)}
              </legend>
              <div
                class="lighthouse-form-elements"
                ${Directives.ref(e => {
        output.categoriesFormElements = e;
    })}
              ></div>
            </fieldset>
          </div>
        </div>
        <div
          ${Directives.ref(e => {
        output.warningText = e;
    })}
          class="lighthouse-warning-text hidden"
        ></div>
      </form>
    `, target);
    // clang-format on
};
export class StartView extends UI.Widget.Widget {
    controller;
    panel;
    #settingsToolbar;
    startButton;
    helpText;
    warningText;
    checkboxes = [];
    changeFormMode;
    constructor(controller, panel) {
        super({ useShadowDom: true });
        this.registerRequiredCSS(lighthouseStartViewStyles);
        this.controller = controller;
        this.panel = panel;
        this.#settingsToolbar = document.createElement('devtools-toolbar');
        this.#settingsToolbar.classList.add('lighthouse-settings-toolbar');
        this.render();
    }
    populateRuntimeSettingAsRadio(settingName, label, parentElement) {
        const runtimeSetting = getRuntimeSettings().find(item => item.setting.name === settingName);
        if (!runtimeSetting?.options) {
            throw new Error(`${settingName} is not a setting with options`);
        }
        const labelEl = document.createElement('div');
        labelEl.classList.add('lighthouse-form-section-label');
        labelEl.textContent = label;
        if (runtimeSetting.learnMore) {
            const link = Link.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), 'lighthouse-learn-more', 'learn-more');
            labelEl.append(link);
        }
        parentElement.appendChild(labelEl);
        const control = new RadioSetting(runtimeSetting.options, runtimeSetting.setting, runtimeSetting.description());
        parentElement.appendChild(control.element);
        UI.ARIAUtils.setLabel(control.element, label);
    }
    populateRuntimeSettingAsToolbarCheckbox(settingName, toolbar) {
        const runtimeSetting = getRuntimeSettings().find(item => item.setting.name === settingName);
        if (!runtimeSetting?.title) {
            throw new Error(`${settingName} is not a setting with a title`);
        }
        runtimeSetting.setting.setTitle(runtimeSetting.title());
        const control = new UI.Toolbar.ToolbarSettingCheckbox(runtimeSetting.setting, runtimeSetting.description());
        toolbar.appendToolbarItem(control);
        if (runtimeSetting.learnMore) {
            const link = Link.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), 'lighthouse-learn-more', 'learn-more');
            link.style.margin = '5px';
            control.element.appendChild(link);
        }
    }
    populateRuntimeSettingAsToolbarDropdown(settingName, toolbar) {
        const runtimeSetting = getRuntimeSettings().find(item => item.setting.name === settingName);
        if (!runtimeSetting?.title) {
            throw new Error(`${settingName} is not a setting with a title`);
        }
        const options = runtimeSetting.options?.map(option => ({ label: option.label(), value: option.value })) || [];
        runtimeSetting.setting.setTitle(runtimeSetting.title());
        const control = new UI.Toolbar.ToolbarSettingComboBox(options, runtimeSetting.setting, runtimeSetting.title());
        control.setTitle(runtimeSetting.description());
        toolbar.appendToolbarItem(control);
        if (runtimeSetting.learnMore) {
            const link = Link.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), 'lighthouse-learn-more', 'learn-more');
            link.style.marginLeft = '5px';
            link.style.display = 'inline-flex';
            link.style.height = 'revert';
            toolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(link));
        }
    }
    populateFormControls(deviceTypeFormElements, categoryFormElements, mode) {
        // Populate the device type
        this.populateRuntimeSettingAsRadio('lighthouse.device-type', i18nString(UIStrings.device), deviceTypeFormElements);
        // Populate the categories
        this.checkboxes = [];
        for (const preset of getPresets()) {
            preset.setting.setTitle(preset.title());
            const checkbox = new UI.Toolbar.ToolbarSettingCheckbox(preset.setting, preset.description());
            const row = categoryFormElements.createChild('div', 'vbox lighthouse-launcher-row');
            row.appendChild(checkbox.element);
            checkbox.element.setAttribute('data-lh-category', preset.configID);
            this.checkboxes.push({ preset, checkbox });
            if (mode && !preset.supportedModes.includes(mode)) {
                checkbox.setEnabled(false);
                checkbox.setIndeterminate(true);
            }
        }
    }
    render() {
        this.populateRuntimeSettingAsToolbarCheckbox('lighthouse.clear-storage', this.#settingsToolbar);
        this.populateRuntimeSettingAsToolbarCheckbox('lighthouse.enable-sampling', this.#settingsToolbar);
        this.populateRuntimeSettingAsToolbarDropdown('lighthouse.throttling', this.#settingsToolbar);
        const { mode } = this.controller.getFlags();
        const output = {
            helpText: undefined,
            warningText: undefined,
            modeFormElements: undefined,
            deviceTypeFormElements: undefined,
            categoriesFormElements: undefined,
        };
        renderStartView({}, output, this.contentElement);
        this.helpText = output.helpText;
        this.warningText = output.warningText;
        const modeFormElements = output.modeFormElements;
        const deviceTypeFormElements = output.deviceTypeFormElements;
        const categoriesFormElements = output.categoriesFormElements;
        if (!modeFormElements || !deviceTypeFormElements || !categoriesFormElements) {
            throw new Error('Required elements not found in template');
        }
        this.populateRuntimeSettingAsRadio('lighthouse.mode', i18nString(UIStrings.mode), modeFormElements);
        this.populateFormControls(deviceTypeFormElements, categoriesFormElements, mode);
        this.refresh();
    }
    populateStartButton(mode) {
        let buttonLabel;
        let callback;
        if (mode === 'timespan') {
            buttonLabel = i18nString(UIStrings.startTimespan);
            callback = () => {
                void this.panel.handleTimespanStart();
            };
        }
        else if (mode === 'snapshot') {
            buttonLabel = i18nString(UIStrings.analyzeSnapshot);
            callback = () => {
                void this.panel.handleCompleteRun();
            };
        }
        else {
            buttonLabel = i18nString(UIStrings.analyzeNavigation);
            callback = () => {
                void this.panel.handleCompleteRun();
            };
        }
        const startButtonContainer = this.contentElement.querySelector('.lighthouse-start-button-container');
        if (startButtonContainer) {
            startButtonContainer.textContent = '';
            this.startButton = UI.UIUtils.createTextButton(buttonLabel, callback, { variant: "primary" /* Buttons.Button.Variant.PRIMARY */, jslogContext: 'lighthouse.start' });
            startButtonContainer.append(this.startButton);
        }
    }
    refresh() {
        const { mode } = this.controller.getFlags();
        this.populateStartButton(mode);
        for (const { checkbox, preset } of this.checkboxes) {
            if (preset.supportedModes.includes(mode)) {
                checkbox.setEnabled(true);
                checkbox.setIndeterminate(false);
            }
            else {
                checkbox.setEnabled(false);
                checkbox.setIndeterminate(true);
            }
        }
        // Ensure the correct layout is used after refresh.
        this.onResize();
    }
    onResize() {
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
    focusStartButton() {
        this.startButton.focus();
    }
    setStartButtonEnabled(isEnabled) {
        if (this.helpText) {
            this.helpText.classList.toggle('hidden', isEnabled);
        }
        if (this.startButton) {
            this.startButton.disabled = !isEnabled;
        }
    }
    setUnauditableExplanation(text) {
        if (this.helpText) {
            this.helpText.textContent = text;
        }
    }
    setWarningText(text) {
        if (this.warningText) {
            this.warningText.textContent = text;
            this.warningText.classList.toggle('hidden', !text);
        }
    }
    wasShown() {
        super.wasShown();
        this.controller.recomputePageAuditability();
    }
    settingsToolbar() {
        return this.#settingsToolbar;
    }
}
//# sourceMappingURL=LighthouseStartView.js.map