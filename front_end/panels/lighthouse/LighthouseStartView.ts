// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../ui/kit/kit.js';
import '../../ui/legacy/legacy.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as LHModel from '../../models/lighthouse/lighthouse.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {getPresets, getRuntimeSettings, type LighthouseController} from './LighthouseController.js';
import type {LighthousePanel} from './LighthousePanel.js';
import lighthouseStartViewStyles from './lighthouseStartView.css.js';
import {type RadioOption, RadioSetting} from './RadioSetting.js';

const {ifDefined} = Directives;
const {bindToSetting} = UI.UIUtils;
const {widget} = UI.Widget;

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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseStartView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface Setting {
  label: Platform.UIString.LocalizedString;
  setting: Common.Settings.Setting<string>;
  description: Platform.UIString.LocalizedString;
  options: RadioOption[];
  learnMore?: Platform.DevToolsPath.UrlString;
}

interface Category {
  configID: string;
  setting: Common.Settings.Setting<boolean>;
  title: Platform.UIString.LocalizedString;
  description: Platform.UIString.LocalizedString;
  supported: boolean;
}

function renderLearnMoreLink(url: Platform.DevToolsPath.UrlString, style?: string): LitTemplate {
  return html`<devtools-link class="lighthouse-learn-more devtools-link" style=${ifDefined(style)}
      href=${url} jslogcontext="learn-more">${i18nString(UIStrings.learnMore)}</devtools-link>`;
}

function renderRuntimeSettingAsRadio(input: Setting): LitTemplate {
  return html`
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

function renderCategories(categories: Category[]): LitTemplate {
  return html`${categories.map(category => html`
    <div class="vbox lighthouse-launcher-row">
      <devtools-checkbox title=${category.description} data-lh-category=${category.configID}
          ?disabled=${!category.supported} ?indeterminate=${!category.supported}
          ${bindToSetting(category.setting)}>${category.title}</devtools-checkbox>
    </div>`)}`;
}

const renderStartView = (
    input: {
      modeSetting: Setting,
      deviceTypeSetting: Setting,
      categories: Category[],
    },
    output: {
      helpText?: HTMLElement,
      warningText?: HTMLElement,
    },
    target: HTMLElement,
    ): void => {
  // clang-format off
  render(
    html`
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
            output.helpText = e as HTMLElement;
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
            output.warningText = e as HTMLElement;
          })}
          class="lighthouse-warning-text hidden"
        ></div>
      </form>
    `,
    target,
  );
  // clang-format on
};

function getRuntimeSetting(settingName: string): LHModel.RunTypes.RuntimeSetting {
  const runtimeSetting = getRuntimeSettings().find(item => item.setting.name === settingName);
  if (!runtimeSetting) {
    throw new Error(`${settingName} is not a runtime setting`);
  }
  return runtimeSetting;
}

function getSetting(settingName: string, label: Platform.UIString.LocalizedString): Setting {
  const runtimeSetting = getRuntimeSetting(settingName);
  if (!runtimeSetting.options) {
    throw new Error(`${settingName} is not a setting with options`);
  }
  return {
    label,
    setting: runtimeSetting.setting as Common.Settings.Setting<string>,
    description: runtimeSetting.description(),
    options: runtimeSetting.options,
    learnMore: runtimeSetting.learnMore,
  };
}

function getCategory(preset: LHModel.RunTypes.Preset, mode: string): Category {
  return {
    configID: preset.configID,
    setting: preset.setting,
    title: preset.title(),
    description: preset.description(),
    supported: preset.supportedModes.includes(mode),
  };
}

export class StartView extends UI.Widget.Widget {
  private controller: LighthouseController;
  private panel: LighthousePanel;
  readonly #settingsToolbar = document.createElement('devtools-toolbar');
  readonly #onDropdownSettingChanged = (): void => this.#renderSettingsToolbar();
  private startButton!: Buttons.Button.Button;
  private helpText?: Element;
  private warningText?: Element;

  constructor(controller: LighthouseController, panel: LighthousePanel) {
    super({useShadowDom: true});
    this.registerRequiredCSS(lighthouseStartViewStyles);

    this.controller = controller;
    this.panel = panel;
    this.#renderSettingsToolbar();
    this.render();
  }

  #renderForm(mode: string): void {
    const output: {helpText?: HTMLElement, warningText?: HTMLElement} = {};
    renderStartView(
        {
          modeSetting: getSetting('lighthouse.mode', i18nString(UIStrings.mode)),
          deviceTypeSetting: getSetting('lighthouse.device-type', i18nString(UIStrings.device)),
          categories: getPresets().map(preset => getCategory(preset, mode)),
        },
        output,
        this.contentElement,
    );

    this.helpText = output.helpText;
    this.warningText = output.warningText;
  }

  private render(): void {
    this.refresh();
  }

  private populateStartButton(mode: string): void {
    let buttonLabel: Platform.UIString.LocalizedString;
    let callback: () => void;

    if (mode === 'timespan') {
      buttonLabel = i18nString(UIStrings.startTimespan);
      callback = () => {
        void this.panel.handleTimespanStart();
      };
    } else if (mode === 'snapshot') {
      buttonLabel = i18nString(UIStrings.analyzeSnapshot);
      callback = () => {
        void this.panel.handleCompleteRun();
      };
    } else {
      buttonLabel = i18nString(UIStrings.analyzeNavigation);
      callback = () => {
        void this.panel.handleCompleteRun();
      };
    }

    const startButtonContainer = this.contentElement.querySelector('.lighthouse-start-button-container');
    if (startButtonContainer) {
      startButtonContainer.textContent = '';
      this.startButton = UI.UIUtils.createTextButton(
          buttonLabel, callback, {variant: Buttons.Button.Variant.PRIMARY, jslogContext: 'lighthouse.start'});
      startButtonContainer.append(this.startButton);
    }
  }

  refresh(): void {
    const {mode} = this.controller.getFlags();
    this.#renderForm(mode);
    this.populateStartButton(mode);
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
    for (const settingName of TOOLBAR_DROPDOWN_SETTINGS) {
      getRuntimeSetting(settingName).setting.addChangeListener(this.#onDropdownSettingChanged);
    }
    this.#renderSettingsToolbar();
    this.controller.recomputePageAuditability();
  }

  override willHide(): void {
    for (const settingName of TOOLBAR_DROPDOWN_SETTINGS) {
      getRuntimeSetting(settingName).setting.removeChangeListener(this.#onDropdownSettingChanged);
    }
    super.willHide();
  }

  #renderSettingsToolbar(): void {
    renderSettingsToolbarInto(
        {
          checkboxes: TOOLBAR_CHECKBOX_SETTINGS.map(getToolbarCheckboxInput),
          dropdowns: TOOLBAR_DROPDOWN_SETTINGS.map(getToolbarDropdownInput),
        },
        undefined,
        this.#settingsToolbar,
    );
  }

  settingsToolbar(): HTMLElement {
    return this.#settingsToolbar;
  }
}

export interface ToolbarCheckboxInput {
  setting: Common.Settings.Setting<boolean>;
  title: Platform.UIString.LocalizedString;
  description: Platform.UIString.LocalizedString;
  learnMore?: Platform.DevToolsPath.UrlString;
}

/**
 * A string runtime setting that is rendered as a toolbar dropdown.
 */
export interface ToolbarDropdownInput {
  name: string;
  title: Platform.UIString.LocalizedString;
  description: Platform.UIString.LocalizedString;
  options: Array<{label: Platform.UIString.LocalizedString, value: string}>;
  value: string;
  learnMore?: Platform.DevToolsPath.UrlString;
  onChange: (value: string) => void;
}

function renderToolbarCheckbox(input: ToolbarCheckboxInput): LitTemplate {
  // clang-format off
  return html`
    <devtools-checkbox title=${input.description} ${bindToSetting(input.setting)}>
      ${input.title}
    </devtools-checkbox>
    ${input.learnMore ? renderLearnMoreLink(input.learnMore, 'margin: 5px') : nothing}`;
  // clang-format on
}

function renderToolbarDropdown(input: ToolbarDropdownInput): LitTemplate {
  // clang-format off
  return html`
    <select
      title=${input.description}
      aria-label=${input.title}
      jslog=${VisualLogging.dropDown().track({change: true}).context(input.name)}
      @change=${(event: Event) => input.onChange((event.target as HTMLSelectElement).value)}
    >
      ${input.options.map(option => html`
        <option
          value=${option.value}
          .selected=${option.value === input.value}
          jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(option.value)).track({click: true})}
        >${option.label}</option>`)}
    </select>
    ${input.learnMore ?
        renderLearnMoreLink(input.learnMore, 'margin-left: 5px; display: inline-flex; height: revert') : nothing}`;
  // clang-format on
}

export function renderSettingsToolbarInto(
    input: {checkboxes: readonly ToolbarCheckboxInput[], dropdowns: readonly ToolbarDropdownInput[]},
    _output: undefined,
    target: HTMLElement,
    ): void {
  render(
      html`${input.checkboxes.map(renderToolbarCheckbox)}${input.dropdowns.map(renderToolbarDropdown)}`,
      target,
      {container: {classes: ['lighthouse-settings-toolbar']}},
  );
}

export const TOOLBAR_CHECKBOX_SETTINGS: readonly string[] = ['lighthouse.clear-storage', 'lighthouse.enable-sampling'];
export const TOOLBAR_DROPDOWN_SETTINGS: readonly string[] = ['lighthouse.throttling'];

export function getToolbarCheckboxInput(settingName: string): ToolbarCheckboxInput {
  const runtimeSetting = getRuntimeSetting(settingName);
  if (!runtimeSetting.title) {
    throw new Error(`${settingName} is not a setting with a title`);
  }
  return {
    setting: runtimeSetting.setting as Common.Settings.Setting<boolean>,
    title: runtimeSetting.title(),
    description: runtimeSetting.description(),
    learnMore: runtimeSetting.learnMore,
  };
}

export function getToolbarDropdownInput(settingName: string): ToolbarDropdownInput {
  const runtimeSetting = getRuntimeSetting(settingName);
  if (!runtimeSetting.title) {
    throw new Error(`${settingName} is not a setting with a title`);
  }
  const setting = runtimeSetting.setting as Common.Settings.Setting<string>;
  return {
    name: setting.name,
    title: runtimeSetting.title(),
    description: runtimeSetting.description(),
    options: runtimeSetting.options?.map(option => ({label: option.label(), value: option.value})) ?? [],
    value: setting.get(),
    learnMore: runtimeSetting.learnMore,
    onChange: (value: string) => setting.set(value),
  };
}

export {getRuntimeSetting};
