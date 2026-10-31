// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/lists/lists.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
import { CalibrationController } from './CalibrationController.js';
import { ThrottlingPresets } from './ThrottlingPresets.js';
import throttlingSettingsTabStyles from './throttlingSettingsTab.css.js';
const { widget } = UI.Widget;
const UIStrings = {
    /**
     * @description Title for default network throttling profiles card.
     */
    defaultProfiles: 'Default profiles',
    /**
     * @description Title for custom network throttling profiles card.
     */
    customProfiles: 'Custom profiles',
    /**
     * @description Text of add conditions button in throttling settings tab of the Network panel.
     */
    addCustomProfile: 'Add profile',
    /**
     * @description A value in milliseconds.
     * @example {3} PH1
     */
    dms: '{PH1} `ms`',
    /**
     * @description Text in throttling settings tab of the Network panel.
     */
    profileName: 'Profile name',
    /**
     * @description Label for a textbox that sets the download speed in the throttling settings tab.
     * Noun, short for 'download speed'.
     */
    download: 'Download',
    /**
     * @description Label for a textbox that sets the upload speed in the throttling settings tab.
     * Noun, short for 'upload speed'.
     */
    upload: 'Upload',
    /**
     * @description Label for a textbox that sets the latency in the throttling settings tab.
     */
    latency: 'Latency',
    /**
     * @description Label for a textbox that sets the packet loss percentage for real-time networks in the throttling settings tab.
     */
    packetLoss: 'Packet Loss',
    /**
     * @description Label for a textbox that sets the low-tier mobile device CPU throttling in the throttling settings tab.
     */
    calibratedLowTierMobile: 'Low-tier mobile device',
    /**
     * @description Label for a textbox that sets the mid-tier mobile device CPU throttling in the throttling settings tab.
     */
    calibratedMidTierMobile: 'Mid-tier mobile device',
    /**
     * @description Label for a textbox that sets the maximum packet queue length for real-time networks in the throttling settings tab.
     */
    packetQueueLength: 'Packet Queue Length',
    /**
     * @description Label for a checkbox that allows packet reordering in the throttling settings tab.
     */
    packetReordering: 'Packet Reordering',
    /**
     * @description Label for a textbox serving as a unit in the throttling settings tab for the field packet queue length column.
     */
    packet: 'packet',
    /**
     * @description Text in throttling settings tab of the Network panel.
     */
    optional: 'optional',
    /**
     * @description Error message for profile name input in throttling pane of the Settings panel.
     * @example {49} PH1
     */
    profileNameCharactersLengthMust: 'Profile name length must be between 1 and {PH1} characters',
    /**
     * @description Error message for download and upload inputs in throttling pane of the Settings panel.
     * @example {Download} PH1
     * @example {0} PH2
     * @example {10000000} PH3
     */
    sMustBeANumberBetweenSkbsToSkbs: '{PH1} must be a number between {PH2} `kbit/s` to {PH3} `kbit/s` inclusive',
    /**
     * @description Error message for latency input in throttling pane of the Settings panel.
     * @example {0} PH1
     * @example {1000000} PH2
     */
    latencyMustBeAnIntegerBetweenSms: 'Latency must be an integer between {PH1} `ms` to {PH2} `ms` inclusive',
    /**
     * @description Error message for packet loss input in throttling pane of the Settings panel.
     * @example {0} PH1
     * @example {100} PH2
     */
    packetLossMustBeAnIntegerBetweenSpct: 'Packet Loss must be a number between {PH1} `%` to {PH2} `%` inclusive',
    /**
     * @description Error message for packet queue length input in throttling pane of the Settings panel.
     */
    packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero: 'Packet queue length must be greater than or equal to 0',
    /**
     * @description Text in throttling settings tab of the Network panel, indicating the download or
     * upload speed that will be applied in kilobits per second.
     * @example {25} PH1
     */
    dskbits: '{PH1} `kbit/s`',
    /**
     * @description Text in throttling settings tab of the Network panel, indicating the download or
     * upload speed that will be applied in megabits per second.
     * @example {25.4} PH1
     */
    fsmbits: '{PH1} `Mbit/s`',
    /**
     * @description Label for the column packet reordering to indicate it is enabled in the throttling settings tab.
     */
    on: 'On',
    /**
     * @description Label for the column packet reordering to indicate it is disabled in the throttling settings tab.
     */
    off: 'Off',
    /**
     * @description Text in throttling settings tab of the Settings panel.
     */
    cpuThrottlingPresets: 'CPU throttling presets',
    /**
     * @description Button text to prompt the user to run the CPU calibration process.
     */
    calibrate: 'Calibrate',
    /**
     * @description Button text to prompt the user to re-run the CPU calibration process.
     */
    recalibrate: 'Recalibrate',
    /**
     * @description Button text to prompt the user if they wish to continue with the CPU calibration process.
     */
    continue: 'Continue',
    /**
     * @description Button text to allow the user to cancel the CPU calibration process.
     */
    cancel: 'Cancel',
    /**
     * @description Button text to save changes when editing a custom profile in the throttling settings tab.
     */
    save: 'Save',
    /**
     * @description Button text to add a new custom profile in the throttling settings tab.
     */
    add: 'Add',
    /**
     * @description Text to use to indicate that a CPU calibration has not been run yet.
     */
    needsCalibration: 'Needs calibration',
    /**
     * @description Text to explain why the user should run the CPU calibration process.
     */
    calibrationCTA: 'To use the CPU throttling presets, run the calibration process to determine the ideal throttling rate for your device',
    /**
     * @description Text to explain what CPU throttling presets are.
     */
    cpuCalibrationDescription: 'These presets throttle your CPU to approximate the performance of typical low or mid-tier mobile devices',
    /**
     * @description Text to explain how the CPU calibration process will work.
     */
    calibrationConfirmationPrompt: 'Calibration will take ~5 seconds, and temporarily navigate away from your current page. Do you wish to continue?',
    /**
     * @description Text to explain an issue that may impact the CPU calibration process.
     */
    calibrationWarningHighCPU: 'CPU utilization is too high',
    /**
     * @description Text to explain an issue that may impact the CPU calibration process.
     */
    calibrationWarningRunningOnBattery: 'Device is running on battery. Plug in charger for best results.',
    /**
     * @description Text to explain an issue that may impact the CPU calibration process.
     */
    calibrationWarningLowBattery: 'Device battery is low (<20%). Results may be impacted by CPU throttling.',
    /**
     * @description Text label for a menu item indicating that a specific slowdown multiplier is applied.
     * @example {2} PH1
     */
    dSlowdown: '{PH1}× slowdown',
};
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/ThrottlingSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * This promise resolves after the first compute pressure record is observed.
 * The object it returns is always up-to-date with the most recent record observed.
 *
 * Note: The returned value measures the host machine's compute pressure. When
 * debugging a remote device, this may trigger irrelevant high-pressure warnings.
 */
function createComputePressurePromise() {
    const result = { state: '' };
    // @ts-expect-error typescript/lib version needs to be updated.
    if (typeof PressureObserver === 'undefined') {
        // The Compute Pressure API is used only for showing warnings to the user.
        // If it's unavailable, resolve immediately to proceed without warnings.
        return Promise.resolve(result);
    }
    return new Promise(resolve => {
        // @ts-expect-error typescript/lib version needs to be updated.
        const observer = new PressureObserver(records => {
            result.state = records.at(-1).state;
            resolve(result);
        });
        observer.observe('cpu', {
            sampleInterval: 1000,
        });
    });
}
export const CPU_THROTTLING_CARD_DEFAULT_VIEW = (input, _output, target) => {
    const renderTextWithIcon = (text, icon) => html `
    <div class="text-with-icon">
      <devtools-icon name=${icon}></devtools-icon>
      ${text}
    </div>
  `;
    const showCalibrateButton = input.state === 'cta' || input.state === 'prompting';
    const calibrateButtonText = input.state === 'prompting' ?
        i18nString(UIStrings.continue) :
        (input.hasCalibrated ? i18nString(UIStrings.recalibrate) : i18nString(UIStrings.calibrate));
    const showCancelButton = input.state === 'prompting' || input.state === 'calibrating';
    const showTextContainer = (input.state === 'cta' && !input.hasCalibrated) || input.state === 'prompting';
    const showProgress = input.state === 'calibrating';
    // clang-format off
    render(html `
        <devtools-card heading=${i18nString(UIStrings.cpuThrottlingPresets)}>
          <span>${i18nString(UIStrings.cpuCalibrationDescription)}</span>
          <div class="cpu-preset-section">
            ${i18nString(UIStrings.calibratedLowTierMobile)}
            <div class=${Directives.classMap({
        'cpu-preset-result': true,
        'not-calibrated': input.lowNotCalibrated,
    })}>
              ${input.lowResultText}
            </div>
          </div>
          <div class="cpu-preset-section">
            ${i18nString(UIStrings.calibratedMidTierMobile)}
            <div class=${Directives.classMap({
        'cpu-preset-result': true,
        'not-calibrated': input.midNotCalibrated,
    })}>
              ${input.midResultText}
            </div>
          </div>
          <div class="cpu-preset-section cpu-preset-calibrate">
            <div class="button-container">
              <devtools-button
                class="calibrate-button"
                style=${showCalibrateButton ? '' : 'display: none'}
                .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
                .jslogContext=${'throttling.calibrate'}
                @click=${input.onCalibrateClick}>
                ${calibrateButtonText}
              </devtools-button>
              <devtools-button
                class="cancel-button"
                style=${showCancelButton ? '' : 'display: none'}
                .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                .jslogContext=${'throttling.calibrate-cancel'}
                @click=${input.onCancelClick}>
                ${i18nString(UIStrings.cancel)}
              </devtools-button>
            </div>
            <div
              class="text-container"
              style=${showTextContainer ? '' : 'display: none'}>
              ${input.state === 'cta' && !input.hasCalibrated
        ? renderTextWithIcon(i18nString(UIStrings.calibrationCTA), 'info')
        : nothing}
              ${input.state === 'prompting' ? html `
                ${input.warnings.map(warning => renderTextWithIcon(warning, 'warning'))}
                ${renderTextWithIcon(i18nString(UIStrings.calibrationConfirmationPrompt), 'info')}
              ` : nothing}
            </div>
            <devtools-progress
              no-stop-button
              style=${showProgress ? '' : 'display: none'}
              .worked=${input.progressWorked}
              .totalWork=${1}>
            </devtools-progress>
          </div>
        </devtools-card>
      `, target);
    // clang-format on
};
export class CPUThrottlingCard extends UI.Widget.Widget {
    #setting;
    computePressurePromise;
    controller;
    state = 'cta';
    warnings = [];
    #view;
    #progressWorked = 0;
    constructor(element, view = CPU_THROTTLING_CARD_DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.performUpdate();
    }
    wasShown() {
        super.wasShown();
        this.computePressurePromise = createComputePressurePromise();
        this.state = 'cta';
        this.performUpdate();
    }
    willHide() {
        super.willHide();
        this.computePressurePromise = undefined;
        if (this.controller) {
            this.controller.abort();
        }
    }
    performUpdate() {
        if (!this.#setting && Common.Settings.Settings.hasInstance()) {
            this.#setting =
                Common.Settings.Settings.instance().createSetting('calibrated-cpu-throttling', {}, "Global" /* Common.Settings.SettingStorageType.GLOBAL */);
        }
        if (this.state !== 'calibrating') {
            this.controller = undefined;
        }
        const result = this.#setting?.get() ?? {};
        const hasCalibrated = Boolean(result.low || result.mid);
        const resultToString = (result) => {
            if (result === undefined) {
                return i18nString(UIStrings.needsCalibration);
            }
            if (typeof result === 'string') {
                return PanelsCommon.CPUThrottlingOption.calibrationErrorToString(result);
            }
            // Shouldn't happen, but let's not throw an error (.toFixed) if the setting
            // somehow was saved with a non-number.
            if (typeof result !== 'number') {
                return `Invalid: ${result}`;
            }
            return i18nString(UIStrings.dSlowdown, { PH1: result.toFixed(1) });
        };
        this.#view({
            state: this.state,
            hasCalibrated,
            lowResultText: resultToString(result.low),
            lowNotCalibrated: result.low === undefined,
            midResultText: resultToString(result.mid),
            midNotCalibrated: result.mid === undefined,
            warnings: this.warnings,
            progressWorked: this.#progressWorked,
            onCalibrateClick: () => {
                void this.calibrateButtonClicked();
            },
            onCancelClick: () => this.cancelButtonClicked(),
        }, undefined, this.element);
    }
    async getCalibrationWarnings() {
        const warnings = [];
        if (this.computePressurePromise) {
            const computePressure = await this.computePressurePromise;
            if (computePressure.state === 'critical' || computePressure.state === 'serious') {
                warnings.push(i18nString(UIStrings.calibrationWarningHighCPU));
            }
        }
        // @ts-expect-error typescript/lib version needs to be updated.
        const battery = await navigator.getBattery();
        if (!battery.charging) {
            warnings.push(i18nString(UIStrings.calibrationWarningRunningOnBattery));
        }
        else if (battery.level < 0.2) {
            warnings.push(i18nString(UIStrings.calibrationWarningLowBattery));
        }
        return warnings;
    }
    async calibrateButtonClicked() {
        if (this.state === 'cta') {
            this.warnings = await this.getCalibrationWarnings();
            this.state = 'prompting';
            this.requestUpdate();
        }
        else if (this.state === 'prompting') {
            this.state = 'calibrating';
            this.requestUpdate();
            void this.runCalibration();
        }
    }
    cancelButtonClicked() {
        if (this.controller) {
            this.controller.abort();
        }
        else {
            this.state = 'cta';
            this.requestUpdate();
        }
    }
    async runCalibration() {
        this.#progressWorked = 0;
        this.requestUpdate();
        this.controller = new CalibrationController();
        try {
            if (!await this.controller.start()) {
                console.error('Calibration failed to start');
                return;
            }
            for await (const result of this.controller.iterator()) {
                this.#progressWorked = result.progress;
                this.requestUpdate();
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            await this.controller.end();
        }
        const result = this.controller.result();
        if (result && (result.low || result.mid) && this.#setting) {
            this.#setting.set(result);
            // Let the user bask in the glory of a 100% progress bar, for a bit.
            this.#progressWorked = 1;
            this.requestUpdate();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        this.state = 'cta';
        this.requestUpdate();
    }
}
function extractCustomSettingIndex(key) {
    const match = key.match(/USER_CUSTOM_SETTING_(\d+)/);
    if (match?.[1]) {
        return parseInt(match[1], 10);
    }
    return 0;
}
function retrieveOptionsTitle(conditions) {
    // The title is usually an i18nLazyString except for custom values that are stored in the local storage in the form of a string.
    return typeof conditions.title === 'function' ? conditions.title() : conditions.title;
}
function renderHeaderRow() {
    const profileName = i18nString(UIStrings.profileName);
    const columns = [
        i18nString(UIStrings.download),
        i18nString(UIStrings.upload),
        i18nString(UIStrings.latency),
        i18nString(UIStrings.packetLoss),
        i18nString(UIStrings.packetQueueLength),
        i18nString(UIStrings.packetReordering),
    ];
    // clang-format off
    return html `
    <div class="conditions-list-item conditions-list-header">
      <div class="conditions-list-text conditions-list-title" title=${profileName}>
        <div class="conditions-list-title-text">${profileName}</div>
      </div>
      ${columns.map(column => html `
        <div class="conditions-list-separator"></div>
        <div class="conditions-list-text" title=${column}>${column}</div>
      `)}
    </div>
  `;
    // clang-format on
}
function renderConditionsItem(conditions) {
    const title = retrieveOptionsTitle(conditions);
    const downloadText = throughputText(conditions.download);
    const uploadText = throughputText(conditions.upload);
    const latencyText = i18nString(UIStrings.dms, { PH1: conditions.latency });
    const packetLossText = percentText(conditions.packetLoss ?? 0);
    const packetQueueLengthText = String(conditions.packetQueueLength ?? 0);
    const packetReorderingText = conditions.packetReordering ? i18nString(UIStrings.on) : i18nString(UIStrings.off);
    // clang-format off
    return html `
    <div class="conditions-list-item">
      <div class="conditions-list-text conditions-list-title" title=${title}>
        <div class="conditions-list-title-text">${title}</div>
      </div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${downloadText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${uploadText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${latencyText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${packetLossText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${packetQueueLengthText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${packetReorderingText}</div>
    </div>
  `;
    // clang-format on
}
function renderEditor(input) {
    const isNew = input.editingIndex === input.customConditions.length;
    const optionalStr = i18nString(UIStrings.optional);
    const textFields = [
        {
            name: 'title',
            labelText: i18nString(UIStrings.profileName),
            placeholder: '',
            isOptional: false,
        },
        {
            name: 'download',
            labelText: i18nString(UIStrings.download),
            placeholder: i18n.i18n.lockedString('kbit/s'),
            isOptional: true,
        },
        {
            name: 'upload',
            labelText: i18nString(UIStrings.upload),
            placeholder: i18n.i18n.lockedString('kbit/s'),
            isOptional: true,
        },
        {
            name: 'latency',
            labelText: i18nString(UIStrings.latency),
            placeholder: i18n.i18n.lockedString('ms'),
            isOptional: true,
        },
        {
            name: 'packetLoss',
            labelText: i18nString(UIStrings.packetLoss),
            placeholder: i18n.i18n.lockedString('percent'),
            isOptional: true,
        },
        {
            name: 'packetQueueLength',
            labelText: i18nString(UIStrings.packetQueueLength),
            placeholder: i18nString(UIStrings.packet),
            isOptional: true,
        },
    ];
    const errorMessages = Object.values(input.validationErrors).filter(Boolean);
    const hasErrors = errorMessages.length > 0;
    // clang-format off
    return html `
    <div
        class="editor-container"
        jslog=${VisualLogging.pane('editor').track({ resize: true })}
        @keydown=${(e) => {
        if (Platform.KeyboardUtilities.isEscKey(e)) {
            e.consume(true);
            input.onCancelEdit();
        }
    }}>
      <div
          class="editor-content"
          @keydown=${(e) => {
        if (e.key === 'Enter') {
            e.consume(true);
            input.onCommitEdit();
        }
    }}>
        <div class="settings-container">
          ${textFields.map((field, index) => {
        const isInvalid = input.showValidationErrors && Boolean(input.validationErrors[field.name]);
        return html `
              <div class="setting">
                <div>${field.labelText}</div>
                <div>
                  <input
                      class=${Directives.classMap({
            'harmony-input': true,
            input: true,
            'error-input': isInvalid,
        })}
                      type="text"
                      ?autofocus=${index === 0}
                      placeholder=${field.placeholder}
                      aria-label=${field.labelText}
                      aria-description=${optionalStr}
                      aria-invalid=${isInvalid ? 'true' : 'false'}
                      .value=${Directives.live(input.editingValues[field.name])}
                      jslog=${VisualLogging.textField().track({ change: true, keydown: 'Enter' }).context(field.name)}
                      @input=${(e) => input.onEditorInput(field.name, e.target.value)}>
                  <div style=${field.isOptional ? '' : 'visibility: hidden'}>
                    ${optionalStr}
                  </div>
                </div>
              </div>
            `;
    })}
          <div class="setting">
            <div>${i18nString(UIStrings.packetReordering)}</div>
            <div>
              <devtools-checkbox
                  class="input"
                  aria-label=${i18nString(UIStrings.packetReordering)}
                  aria-description=${optionalStr}
                  .checked=${input.editingValues.packetReordering}
                  .jslogContext=${'packetReordering'}
                  @change=${(e) => input.onEditorInput('packetReordering', e.target.checked)}>
              </devtools-checkbox>
              <div style="visibility: hidden">
                ${optionalStr}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="editor-buttons">
        <devtools-button
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
            .jslogContext=${'cancel'}
            jslog=${VisualLogging.action('cancel').track({ click: true })}
            @click=${input.onCancelEdit}>
          ${i18nString(UIStrings.cancel)}
        </devtools-button>
        <devtools-button
            .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
            .jslogContext=${'commit'}
            .disabled=${hasErrors}
            @click=${input.onCommitEdit}>
          ${isNew ? i18nString(UIStrings.add) : i18nString(UIStrings.save)}
        </devtools-button>
      </div>
      <div class="list-widget-input-validation-error" role="alert" aria-live="polite">
        ${input.showValidationErrors && hasErrors
        ? errorMessages.map((msg, i) => html `${i > 0 ? html `<br>` : nothing}${msg}`)
        : nothing}
      </div>
    </div>
  `;
    // clang-format on
}
export const DEFAULT_VIEW = (input, _output, target) => {
    const editingIndex = input.editingIndex;
    const customBefore = editingIndex !== null ? input.customConditions.slice(0, editingIndex) : input.customConditions;
    const customAfter = editingIndex !== null ? input.customConditions.slice(editingIndex + 1) : [];
    // clang-format off
    render(html `
        <div class="settings-card-container-wrapper">
          <div class="settings-card-container throttling-conditions-settings">
            ${widget(CPUThrottlingCard)}
            <devtools-card heading=${i18nString(UIStrings.defaultProfiles)}>
              <div>
                ${renderHeaderRow()}
                <devtools-list class="conditions-list">
                  ${input.presets.map(preset => renderConditionsItem(preset))}
                </devtools-list>
              </div>
            </devtools-card>
            <devtools-card heading=${i18nString(UIStrings.customProfiles)}>
              <div>
                ${renderHeaderRow()}
                ${customBefore.length > 0 ? html `
                  <devtools-list
                      class="conditions-list"
                      editable
                      deletable
                      @edit=${(e) => input.onBeginEdit(e.detail.index)}
                      @delete=${(e) => input.onRemoveCustomProfile(e.detail.index)}>
                    ${customBefore.map(item => renderConditionsItem(item))}
                  </devtools-list>
                ` : nothing}
                ${editingIndex !== null ? renderEditor(input) : nothing}
                ${editingIndex !== null && customAfter.length > 0 ? html `
                  <devtools-list
                      class="conditions-list"
                      editable
                      deletable
                      @edit=${(e) => input.onBeginEdit(editingIndex + 1 + e.detail.index)}
                      @delete=${(e) => input.onRemoveCustomProfile(editingIndex + 1 + e.detail.index)}>
                    ${customAfter.map(item => renderConditionsItem(item))}
                  </devtools-list>
                ` : nothing}
                <devtools-button
                  class="add-conditions-button"
                  .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                  .iconName=${'plus'}
                  .jslogContext=${'network.add-conditions'}
                  @click=${input.onAddCustomProfile}>
                  ${i18nString(UIStrings.addCustomProfile)}
                </devtools-button>
              </div>
            </devtools-card>
          </div>
        </div>
      `, target, { container: { attributes: { jslog: `${VisualLogging.pane('throttling-conditions')}` } } });
    // clang-format on
};
const EMPTY_EDITOR_VALUES = {
    title: '',
    download: '',
    upload: '',
    latency: '',
    packetLoss: '',
    packetQueueLength: '',
    packetReordering: false,
};
export class ThrottlingSettingsTab extends UI.Widget.VBox {
    customUserConditions;
    #view;
    /**
     * We store how many custom conditions the user has defined when we load up
     * DevTools. This is because when the user creates a new one, we need to
     * generate a unique key. We take this value, increment it, and use that as part of the unique key.
     * This means that we are resilient to the user adding & then deleting a
     * profile; we always use this counter which is only ever incremented.
     */
    #customUserConditionsCount;
    #editingIndex = null;
    #editingConditions = null;
    #editingValues = { ...EMPTY_EDITOR_VALUES };
    #showValidationErrors = false;
    constructor(settings, view = DEFAULT_VIEW) {
        super({
            useShadowDom: true,
        });
        this.#view = view;
        this.registerRequiredCSS(throttlingSettingsTabStyles);
        this.customUserConditions = SDK.NetworkManager.customUserNetworkConditionsSetting(settings);
        this.customUserConditions.addChangeListener(this.#conditionsUpdated, this);
        const customConditions = this.customUserConditions.get();
        // We need to parse out the current max condition key index. If the last
        // one added is USER_CUSTOM_SETTING_9, then we need to set the
        // customUserConditionsCount property to 9, so that the next item added
        // gets index 10.
        // Because we always increment the index and append it to the list, we
        // know that the last item in the list will have the largest custom key
        // index, hence why we can just pluck the last item rather than search for
        // the one with the largest index.
        const lastCondition = customConditions.at(-1);
        const key = lastCondition?.key;
        if (key && SDK.NetworkManager.keyIsCustomUser(key)) {
            const maxIndex = extractCustomSettingIndex(key);
            this.#customUserConditionsCount = maxIndex;
        }
        else {
            this.#customUserConditionsCount = 0;
        }
        this.performUpdate();
    }
    performUpdate() {
        const customConditions = this.customUserConditions.get();
        const validationErrors = this.#editingIndex !== null ? this.#validateEditorValues(this.#editingValues) : {};
        this.#view({
            presets: ThrottlingPresets.networkPresets,
            customConditions,
            editingIndex: this.#editingIndex,
            editingValues: this.#editingValues,
            validationErrors,
            showValidationErrors: this.#showValidationErrors,
            onAddCustomProfile: () => this.#addButtonClicked(),
            onBeginEdit: this.#beginEdit.bind(this),
            onRemoveCustomProfile: this.#removeCustomProfile.bind(this),
            onEditorInput: this.#onEditorInput.bind(this),
            onCommitEdit: this.#commitEdit.bind(this),
            onCancelEdit: this.#cancelEdit.bind(this),
        }, undefined, this.contentElement);
    }
    wasShown() {
        super.wasShown();
        this.#conditionsUpdated();
        this.performUpdate();
    }
    #conditionsUpdated() {
        this.#editingIndex = null;
        this.#editingConditions = null;
        this.#editingValues = { ...EMPTY_EDITOR_VALUES };
        this.#showValidationErrors = false;
        this.requestUpdate();
    }
    #addButtonClicked() {
        this.#customUserConditionsCount++;
        const customConditions = this.customUserConditions.get();
        this.#editingIndex = customConditions.length;
        this.#editingConditions = {
            key: `USER_CUSTOM_SETTING_${this.#customUserConditionsCount}`,
            title: () => '',
            download: -1,
            upload: -1,
            latency: 0,
            packetLoss: 0,
            packetReordering: false,
        };
        this.#editingValues = { ...EMPTY_EDITOR_VALUES };
        this.#showValidationErrors = false;
        this.requestUpdate();
    }
    #beginEdit(index) {
        const customConditions = this.customUserConditions.get();
        const conditions = customConditions[index];
        if (!conditions) {
            return;
        }
        this.#editingIndex = index;
        this.#editingConditions = conditions;
        this.#editingValues = {
            title: retrieveOptionsTitle(conditions),
            download: conditions.download <= 0 ? '' : String(conditions.download / (1000 / 8)),
            upload: conditions.upload <= 0 ? '' : String(conditions.upload / (1000 / 8)),
            latency: conditions.latency ? String(conditions.latency) : '',
            packetLoss: conditions.packetLoss ? String(conditions.packetLoss) : '',
            packetQueueLength: conditions.packetQueueLength ? String(conditions.packetQueueLength) : '',
            packetReordering: conditions.packetReordering ?? false,
        };
        this.#showValidationErrors = false;
        this.requestUpdate();
    }
    #onEditorInput(field, value) {
        this.#editingValues = {
            ...this.#editingValues,
            [field]: value,
        };
        this.#showValidationErrors = true;
        this.requestUpdate();
    }
    #cancelEdit() {
        this.#editingIndex = null;
        this.#editingConditions = null;
        this.#editingValues = { ...EMPTY_EDITOR_VALUES };
        this.#showValidationErrors = false;
        this.requestUpdate();
    }
    #commitEdit() {
        if (this.#editingIndex === null || !this.#editingConditions) {
            return;
        }
        const validationErrors = this.#validateEditorValues(this.#editingValues);
        if (Object.keys(validationErrors).length > 0) {
            this.#showValidationErrors = true;
            this.requestUpdate();
            return;
        }
        const conditions = this.#editingConditions;
        conditions.title = this.#editingValues.title.trim();
        const download = this.#editingValues.download.trim();
        conditions.download = download ? parseInt(download, 10) * (1000 / 8) : -1;
        const upload = this.#editingValues.upload.trim();
        conditions.upload = upload ? parseInt(upload, 10) * (1000 / 8) : -1;
        const latency = this.#editingValues.latency.trim();
        conditions.latency = latency ? parseInt(latency, 10) : 0;
        const packetLoss = this.#editingValues.packetLoss.trim();
        conditions.packetLoss = packetLoss ? parseFloat(packetLoss) : 0;
        const packetQueueLength = this.#editingValues.packetQueueLength.trim();
        conditions.packetQueueLength = packetQueueLength ? parseFloat(packetQueueLength) : 0;
        conditions.packetReordering = this.#editingValues.packetReordering;
        const list = [...this.customUserConditions.get()];
        if (this.#editingIndex === list.length) {
            list.push(conditions);
        }
        this.#editingIndex = null;
        this.#editingConditions = null;
        this.#editingValues = { ...EMPTY_EDITOR_VALUES };
        this.#showValidationErrors = false;
        this.customUserConditions.set(list);
    }
    #removeCustomProfile(index) {
        const list = [...this.customUserConditions.get()];
        list.splice(index, 1);
        this.customUserConditions.set(list);
    }
    #validateEditorValues(values) {
        const errors = {};
        const maxLength = 49;
        const title = values.title.trim();
        if (title.length === 0 || title.length > maxLength) {
            errors.title = i18nString(UIStrings.profileNameCharactersLengthMust, { PH1: maxLength });
        }
        const minThroughput = 0;
        const maxThroughput = 10000000;
        const download = values.download.trim();
        const parsedDownload = Number(download);
        if (Number.isNaN(parsedDownload) || parsedDownload < minThroughput || parsedDownload > maxThroughput) {
            errors.download = i18nString(UIStrings.sMustBeANumberBetweenSkbsToSkbs, { PH1: i18nString(UIStrings.download), PH2: minThroughput, PH3: maxThroughput });
        }
        const upload = values.upload.trim();
        const parsedUpload = Number(upload);
        if (Number.isNaN(parsedUpload) || parsedUpload < minThroughput || parsedUpload > maxThroughput) {
            errors.upload = i18nString(UIStrings.sMustBeANumberBetweenSkbsToSkbs, { PH1: i18nString(UIStrings.upload), PH2: minThroughput, PH3: maxThroughput });
        }
        const minLatency = 0;
        const maxLatency = 1000000;
        const latency = values.latency.trim();
        const parsedLatency = Number(latency);
        if (!Number.isInteger(parsedLatency) || parsedLatency < minLatency || parsedLatency > maxLatency) {
            errors.latency = i18nString(UIStrings.latencyMustBeAnIntegerBetweenSms, { PH1: minLatency, PH2: maxLatency });
        }
        const minPacketLoss = 0;
        const maxPacketLoss = 100;
        const packetLoss = values.packetLoss.trim();
        const parsedPacketLoss = Number(packetLoss);
        if (Number.isNaN(parsedPacketLoss) || parsedPacketLoss < minPacketLoss || parsedPacketLoss > maxPacketLoss) {
            errors.packetLoss =
                i18nString(UIStrings.packetLossMustBeAnIntegerBetweenSpct, { PH1: minPacketLoss, PH2: maxPacketLoss });
        }
        const minPacketQueueLength = 0;
        const packetQueueLength = values.packetQueueLength.trim();
        const parsedPacketQueueLength = Number(packetQueueLength);
        if (Number.isNaN(parsedPacketQueueLength) || parsedPacketQueueLength < minPacketQueueLength) {
            errors.packetQueueLength = i18nString(UIStrings.packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero);
        }
        return errors;
    }
}
function throughputText(throughput) {
    if (throughput < 0) {
        return '';
    }
    const throughputInKbps = throughput / (1000 / 8);
    if (throughputInKbps < 1000) {
        return i18nString(UIStrings.dskbits, { PH1: throughputInKbps });
    }
    if (throughputInKbps < 1000 * 10) {
        const formattedResult = (throughputInKbps / 1000).toFixed(1);
        return i18nString(UIStrings.fsmbits, { PH1: formattedResult });
    }
    // TODO(petermarshall): Figure out if there is a difference we need to tell i18n about
    // for these two versions: one with decimal places and one without.
    return i18nString(UIStrings.fsmbits, { PH1: (throughputInKbps / 1000) | 0 });
}
function percentText(percent) {
    if (percent < 0) {
        return '';
    }
    return String(percent) + '%';
}
//# sourceMappingURL=ThrottlingSettingsTab.js.map