// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/kit/kit.js';
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { getPresets, getRuntimeSettings } from './LighthouseController.js';
import lighthouseStartViewStyles from './lighthouseStartView.css.js';
import { RadioSetting } from './RadioSetting.js';
const { ifDefined } = Directives;
const { bindToSetting } = UI.UIUtils;
const { widget } = UI.Widget;
const UIStrings = {
    /**
     * @description Text displayed as the title of a panel that can be used to audit a web page with Lighthouse.
     */
    generateLighthouseReport: 'Generate a Lighthouse report',
    /**
     * @description Section header for the Lighthouse mode options.
     */
    mode: 'Mode',
    /**
     * @description Section header for the list of categories to run during an audit.
     */
    categories: 'Categories',
    /**
     * @description Label for a button to start analyzing a page navigation with Lighthouse.
     */
    analyzeNavigation: 'Analyze page load',
    /**
     * @description Label for a button to start analyzing the current page state with Lighthouse.
     */
    analyzeSnapshot: 'Analyze page state',
    /**
     * @description Label for a button that starts a Lighthouse mode that analyzes user interactions over a period of time.
     */
    startTimespan: 'Start timespan',
    /**
     * @description Text that is usually a hyperlink to more documentation.
     */
    learnMore: 'Learn more',
    /**
     * @description Section header for selecting the device type for auditing.
     */
    device: 'Device',
};
const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseStartView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function renderLearnMoreLink(url, style) {
    return html `<devtools-link class="lighthouse-learn-more devtools-link" style=${ifDefined(style)}
      href=${url} jslogcontext="learn-more">${i18nString(UIStrings.learnMore)}</devtools-link>`;
}
function renderRuntimeSettingAsRadio(input) {
    return html `
    <div class="lighthouse-form-section-label">
      ${input.label}
      ${input.learnMore ? renderLearnMoreLink(input.learnMore) : nothing}
    </div>
    ${widget(RadioSetting, {
        options: input.options,
        setting: input.setting,
        description: input.description,
        label: input.label,
    })}`;
}
function renderCategories(categories) {
    return html `${categories.map(category => html `
    <div class="vbox lighthouse-launcher-row">
      <devtools-checkbox title=${category.description} data-lh-category=${category.configID}
          ?disabled=${!category.supported} ?indeterminate=${!category.supported}
          ${bindToSetting(category.setting)}>${category.title}</devtools-checkbox>
    </div>`)}`;
}
const renderStartView = (input, output, target) => {
    // clang-format off
    render(html `
      <form class="lighthouse-start-view">
        <header class="hbox">
          <div class="lighthouse-logo"></div>
          <h1 class="lighthouse-title">
            ${i18nString(UIStrings.generateLighthouseReport)}
          </h1>
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
            <div class="lighthouse-form-elements">
              ${renderRuntimeSettingAsRadio(input.modeSetting)}
            </div>
          </div>
          <div class="lighthouse-form-section">
            <div class="lighthouse-form-elements">
              ${renderRuntimeSettingAsRadio(input.deviceTypeSetting)}
            </div>
          </div>
          <div class="lighthouse-form-categories">
            <fieldset class="lighthouse-form-section lighthouse-form-categories-fieldset">
              <legend class="lighthouse-form-section-label">
                ${i18nString(UIStrings.categories)}
              </legend>
              <div class="lighthouse-form-elements">
                ${renderCategories(input.categories)}
              </div>
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
function getRuntimeSetting(settingName) {
    const runtimeSetting = getRuntimeSettings().find(item => item.setting.name === settingName);
    if (!runtimeSetting) {
        throw new Error(`${settingName} is not a runtime setting`);
    }
    return runtimeSetting;
}
function getSetting(settingName, label) {
    const runtimeSetting = getRuntimeSetting(settingName);
    if (!runtimeSetting.options) {
        throw new Error(`${settingName} is not a setting with options`);
    }
    return {
        label,
        setting: runtimeSetting.setting,
        description: runtimeSetting.description(),
        options: runtimeSetting.options,
        learnMore: runtimeSetting.learnMore,
    };
}
function getCategory(preset, mode) {
    return {
        configID: preset.configID,
        setting: preset.setting,
        title: preset.title(),
        description: preset.description(),
        supported: preset.supportedModes.includes(mode),
    };
}
export class StartView extends UI.Widget.Widget {
    controller;
    panel;
    #settingsToolbar = document.createElement('devtools-toolbar');
    #onDropdownSettingChanged = () => this.#renderSettingsToolbar();
    startButton;
    helpText;
    warningText;
    constructor(controller, panel) {
        super({ useShadowDom: true });
        this.registerRequiredCSS(lighthouseStartViewStyles);
        this.controller = controller;
        this.panel = panel;
        this.#renderSettingsToolbar();
        this.render();
    }
    #renderForm(mode) {
        const output = {};
        renderStartView({
            modeSetting: getSetting('lighthouse.mode', i18nString(UIStrings.mode)),
            deviceTypeSetting: getSetting('lighthouse.device-type', i18nString(UIStrings.device)),
            categories: getPresets().map(preset => getCategory(preset, mode)),
        }, output, this.contentElement);
        this.helpText = output.helpText;
        this.warningText = output.warningText;
    }
    render() {
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
        this.#renderForm(mode);
        this.populateStartButton(mode);
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
        for (const settingName of TOOLBAR_DROPDOWN_SETTINGS) {
            getRuntimeSetting(settingName).setting.addChangeListener(this.#onDropdownSettingChanged);
        }
        this.#renderSettingsToolbar();
        this.controller.recomputePageAuditability();
    }
    willHide() {
        for (const settingName of TOOLBAR_DROPDOWN_SETTINGS) {
            getRuntimeSetting(settingName).setting.removeChangeListener(this.#onDropdownSettingChanged);
        }
        super.willHide();
    }
    #renderSettingsToolbar() {
        renderSettingsToolbarInto({
            checkboxes: TOOLBAR_CHECKBOX_SETTINGS.map(getToolbarCheckboxInput),
            dropdowns: TOOLBAR_DROPDOWN_SETTINGS.map(getToolbarDropdownInput),
        }, undefined, this.#settingsToolbar);
    }
    settingsToolbar() {
        return this.#settingsToolbar;
    }
}
function renderToolbarCheckbox(input) {
    // clang-format off
    return html `
    <devtools-checkbox title=${input.description} ${bindToSetting(input.setting)}>
      ${input.title}
    </devtools-checkbox>
    ${input.learnMore ? renderLearnMoreLink(input.learnMore, 'margin: 5px') : nothing}`;
    // clang-format on
}
function renderToolbarDropdown(input) {
    // clang-format off
    return html `
    <select
      title=${input.description}
      aria-label=${input.title}
      jslog=${VisualLogging.dropDown().track({ change: true }).context(input.name)}
      @change=${(event) => input.onChange(event.target.value)}
    >
      ${input.options.map(option => html `
        <option
          value=${option.value}
          .selected=${option.value === input.value}
          jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(option.value)).track({ click: true })}
        >${option.label}</option>`)}
    </select>
    ${input.learnMore ?
        renderLearnMoreLink(input.learnMore, 'margin-left: 5px; display: inline-flex; height: revert') : nothing}`;
    // clang-format on
}
export function renderSettingsToolbarInto(input, _output, target) {
    render(html `${input.checkboxes.map(renderToolbarCheckbox)}${input.dropdowns.map(renderToolbarDropdown)}`, target, { container: { classes: ['lighthouse-settings-toolbar'] } });
}
export const TOOLBAR_CHECKBOX_SETTINGS = ['lighthouse.clear-storage', 'lighthouse.enable-sampling'];
export const TOOLBAR_DROPDOWN_SETTINGS = ['lighthouse.throttling'];
export function getToolbarCheckboxInput(settingName) {
    const runtimeSetting = getRuntimeSetting(settingName);
    if (!runtimeSetting.title) {
        throw new Error(`${settingName} is not a setting with a title`);
    }
    return {
        setting: runtimeSetting.setting,
        title: runtimeSetting.title(),
        description: runtimeSetting.description(),
        learnMore: runtimeSetting.learnMore,
    };
}
export function getToolbarDropdownInput(settingName) {
    const runtimeSetting = getRuntimeSetting(settingName);
    if (!runtimeSetting.title) {
        throw new Error(`${settingName} is not a setting with a title`);
    }
    const setting = runtimeSetting.setting;
    return {
        name: setting.name,
        title: runtimeSetting.title(),
        description: runtimeSetting.description(),
        options: runtimeSetting.options?.map(option => ({ label: option.label(), value: option.value })) ?? [],
        value: setting.get(),
        learnMore: runtimeSetting.learnMore,
        onChange: (value) => setting.set(value),
    };
}
export { getRuntimeSetting };
//# sourceMappingURL=LighthouseStartView.js.map