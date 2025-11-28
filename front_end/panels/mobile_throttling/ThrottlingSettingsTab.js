// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import { createIcon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { CalibrationController } from './CalibrationController.js';
import throttlingSettingsTabStyles from './throttlingSettingsTab.css.js';
const UIStrings = {
    /**
     * @description Text in Throttling Settings Tab of the Network panel
     */
    networkThrottlingProfiles: 'Network throttling profiles',
    /**
     * @description Text of add conditions button in Throttling Settings Tab of the Network panel
     */
    addCustomProfile: 'Add profile',
    /**
     * @description A value in milliseconds
     * @example {3} PH1
     */
    dms: '{PH1} `ms`',
    /**
     * @description Text in Throttling Settings Tab of the Network panel
     */
    profileName: 'Profile Name',
    /**
     * @description Label for a textbox that sets the download speed in the Throttling Settings Tab.
     * Noun, short for 'download speed'.
     */
    download: 'Download',
    /**
     * @description Label for a textbox that sets the upload speed in the Throttling Settings Tab.
     * Noun, short for 'upload speed'.
     */
    upload: 'Upload',
    /**
     * @description Label for a textbox that sets the latency in the Throttling Settings Tab.
     */
    latency: 'Latency',
    /**
     * @description Label for a textbox that sets the packet loss percentage for real-time networks in the Throttling Settings Tab.
     */
    packetLoss: 'Packet Loss',
    /**
     * @description Label for a textbox that sets the maximum packet queue length for real-time networks in the Throttling Settings Tab.
     */
    packetQueueLength: 'Packet Queue Length',
    /**
     * @description Label for a checkbox that allows packet reordering in the Throttling Settings Tab.
     */
    packetReordering: 'Packet Reordering',
    /**
     * @description Label for a textbox serving as a unit in the Throttling Settings Tab for the field Packet Queue Length column.
     */
    packet: 'packet',
    /**
     * @description Text in Throttling Settings Tab of the Network panel
     */
    optional: 'optional',
    /**
     * @description Error message for Profile Name input in Throtting pane of the Settings
     * @example {49} PH1
     */
    profileNameCharactersLengthMust: 'Profile Name characters length must be between 1 to {PH1} inclusive',
    /**
     * @description Error message for Download and Upload inputs in Throttling pane of the Settings
     * @example {Download} PH1
     * @example {0} PH2
     * @example {10000000} PH3
     */
    sMustBeANumberBetweenSkbsToSkbs: '{PH1} must be a number between {PH2} `kbit/s` to {PH3} `kbit/s` inclusive',
    /**
     * @description Error message for Latency input in Throttling pane of the Settings
     * @example {0} PH1
     * @example {1000000} PH2
     */
    latencyMustBeAnIntegerBetweenSms: 'Latency must be an integer between {PH1} `ms` to {PH2} `ms` inclusive',
    /**
     * @description Error message for Packet Loss input in Throttling pane of the Settings
     * @example {0} PH1
     * @example {100} PH2
     */
    packetLossMustBeAnIntegerBetweenSpct: 'Packet Loss must be a number between {PH1} `%` to {PH2} `%` inclusive',
    /**
     * @description Error message for Packet Queue Length input in Throttling pane of the Settings
     */
    packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero: 'Packet Queue Length must be greater or equal to 0',
    /**
     * @description Text in Throttling Settings Tab of the Network panel, indicating the download or
     * upload speed that will be applied in kilobits per second.
     * @example {25} PH1
     */
    dskbits: '{PH1} `kbit/s`',
    /**
     * @description Text in Throttling Settings Tab of the Network panel, indicating the download or
     * upload speed that will be applied in megabits per second.
     * @example {25.4} PH1
     */
    fsmbits: '{PH1} `Mbit/s`',
    /**
     * @description Label for the column Packet Reordering to indicate it is enabled in the Throttling Settings Tab.
     */
    on: 'On',
    /**
     * @description Label for the column Packet Reordering to indicate it is disabled in the Throttling Settings Tab.
     */
    off: 'Off',
    /**
     * @description Text in Throttling Settings Tab of the Settings panel
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
     * @description Text to use to indicate that a CPU calibration has not been run yet.
     */
    needsCalibration: 'Needs calibration',
    /**
     * @description Text to explain why the user should run the CPU calibration process.
     */
    calibrationCTA: 'To use the CPU throttling presets, run the calibration process to determine the ideal throttling rate for your device.',
    /**
     * @description Text to explain what CPU throttling presets are.
     */
    cpuCalibrationDescription: 'These presets throttle your CPU to approximate the performance of typical low or mid-tier mobile devices.',
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
    calibrationWarningRunningOnBattery: 'Device is running on battery, please plug in charger for best results',
    /**
     * @description Text to explain an issue that may impact the CPU calibration process.
     */
    calibrationWarningLowBattery: 'Device battery is low (<20%), results may be impacted by CPU throttling',
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
 */
function createComputePressurePromise() {
    const result = { state: '' };
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
export class CPUThrottlingCard {
    element;
    setting;
    computePressurePromise;
    controller;
    // UI stuff.
    lowTierMobileDeviceEl;
    midTierMobileDeviceEl;
    calibrateEl;
    textEl;
    calibrateButton;
    cancelButton;
    progress;
    state = 'cta';
    warnings = [];
    constructor() {
        this.setting = Common.Settings.Settings.instance().createSetting('calibrated-cpu-throttling', {}, "Global" /* Common.Settings.SettingStorageType.GLOBAL */);
        this.element = document.createElement('devtools-card');
        this.element.heading = i18nString(UIStrings.cpuThrottlingPresets);
        const descriptionEl = this.element.createChild('span');
        descriptionEl.textContent = i18nString(UIStrings.cpuCalibrationDescription);
        this.lowTierMobileDeviceEl = this.element.createChild('div', 'cpu-preset-section');
        this.lowTierMobileDeviceEl.append('Low-tier mobile device');
        this.lowTierMobileDeviceEl.createChild('div', 'cpu-preset-result');
        this.midTierMobileDeviceEl = this.element.createChild('div', 'cpu-preset-section');
        this.midTierMobileDeviceEl.append('Mid-tier mobile device');
        this.midTierMobileDeviceEl.createChild('div', 'cpu-preset-result');
        this.calibrateEl = this.element.createChild('div', 'cpu-preset-section cpu-preset-calibrate');
        const buttonContainerEl = this.calibrateEl.createChild('div', 'button-container');
        this.calibrateButton = new Buttons.Button.Button();
        this.calibrateButton.classList.add('calibrate-button');
        this.calibrateButton.data = {
            variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
            jslogContext: 'throttling.calibrate',
        };
        this.calibrateButton.addEventListener('click', () => this.calibrateButtonClicked());
        buttonContainerEl.append(this.calibrateButton);
        this.cancelButton = new Buttons.Button.Button();
        this.cancelButton.classList.add('cancel-button');
        this.cancelButton.data = {
            variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
            jslogContext: 'throttling.calibrate-cancel',
        };
        this.cancelButton.textContent = i18nString(UIStrings.cancel);
        this.cancelButton.addEventListener('click', () => this.cancelButtonClicked());
        buttonContainerEl.append(this.cancelButton);
        this.textEl = this.calibrateEl.createChild('div', 'text-container');
        this.progress = this.calibrateEl.createChild('devtools-progress');
        this.progress.setAttribute('no-stop-button', '');
        this.updateState();
    }
    wasShown() {
        this.computePressurePromise = createComputePressurePromise();
        this.state = 'cta';
        this.updateState();
    }
    willHide() {
        this.computePressurePromise = undefined;
        if (this.controller) {
            this.controller.abort();
        }
    }
    updateState() {
        if (this.state !== 'calibrating') {
            this.controller = undefined;
        }
        const result = this.setting.get();
        const hasCalibrated = result.low || result.mid;
        this.calibrateButton.style.display = 'none';
        this.textEl.style.display = 'none';
        this.cancelButton.style.display = 'none';
        this.progress.style.display = 'none';
        if (this.state === 'cta') {
            this.calibrateButton.style.display = '';
            this.calibrateButton.textContent =
                hasCalibrated ? i18nString(UIStrings.recalibrate) : i18nString(UIStrings.calibrate);
            if (!hasCalibrated) {
                this.textEl.style.display = '';
                this.textEl.textContent = '';
                this.textEl.append(this.createTextWithIcon(i18nString(UIStrings.calibrationCTA), 'info'));
            }
        }
        else if (this.state === 'prompting') {
            this.calibrateButton.style.display = '';
            this.calibrateButton.textContent = i18nString(UIStrings.continue);
            this.cancelButton.style.display = '';
            this.textEl.style.display = '';
            this.textEl.textContent = '';
            for (const warning of this.warnings) {
                this.textEl.append(this.createTextWithIcon(warning, 'warning'));
            }
            this.textEl.append(this.createTextWithIcon(i18nString(UIStrings.calibrationConfirmationPrompt), 'info'));
        }
        else if (this.state === 'calibrating') {
            this.cancelButton.style.display = '';
            this.progress.style.display = '';
        }
        const resultToString = (result) => {
            if (result === undefined) {
                return i18nString(UIStrings.needsCalibration);
            }
            if (typeof result === 'string') {
                return SDK.CPUThrottlingManager.calibrationErrorToString(result);
            }
            // Shouldn't happen, but let's not throw an error (.toFixed) if the setting
            // somehow was saved with a non-number.
            if (typeof result !== 'number') {
                return `Invalid: ${result}`;
            }
            return i18nString(UIStrings.dSlowdown, { PH1: result.toFixed(1) });
        };
        const setPresetResult = (element, result) => {
            if (!element) {
                throw new Error('expected HTMLElement');
            }
            element.textContent = resultToString(result);
            element.classList.toggle('not-calibrated', result === undefined);
        };
        setPresetResult(this.lowTierMobileDeviceEl.querySelector('.cpu-preset-result'), result.low);
        setPresetResult(this.midTierMobileDeviceEl.querySelector('.cpu-preset-result'), result.mid);
    }
    createTextWithIcon(text, icon) {
        const el = document.createElement('div');
        el.classList.add('text-with-icon');
        el.append(createIcon(icon));
        el.append(text);
        return el;
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
            this.updateState();
        }
        else if (this.state === 'prompting') {
            this.state = 'calibrating';
            this.updateState();
            void this.runCalibration();
        }
    }
    cancelButtonClicked() {
        if (this.controller) {
            this.controller.abort();
        }
        else {
            this.state = 'cta';
            this.updateState();
        }
    }
    async runCalibration() {
        this.progress.worked = 0;
        this.progress.totalWork = 1;
        this.controller = new CalibrationController();
        try {
            if (!await this.controller.start()) {
                console.error('Calibration failed to start');
                return;
            }
            for await (const result of this.controller.iterator()) {
                this.progress.worked = result.progress;
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            await this.controller.end();
        }
        const result = this.controller.result();
        if (result && (result.low || result.mid)) {
            this.setting.set(result);
            // Let the user bask in the glory of a 100% progress bar, for a bit.
            this.progress.worked = 1;
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        this.state = 'cta';
        this.updateState();
    }
}
function extractCustomSettingIndex(key) {
    const match = key.match(/USER_CUSTOM_SETTING_(\d+)/);
    if (match?.[1]) {
        return parseInt(match[1], 10);
    }
    return 0;
}
export class ThrottlingSettingsTab extends UI.Widget.VBox {
    list;
    customUserConditions;
    editor;
    cpuThrottlingCard;
    /**
     * We store how many custom conditions the user has defined when we load up
     * DevTools. This is because when the user creates a new one, we need to
     * generate a unique key. We take this value, increment it, and use that as part of the unique key.
     * This means that we are resilient to the user adding & then deleting a
     * profile; we always use this counter which is only ever incremented.
     */
    #customUserConditionsCount;
    constructor() {
        super({
            jslog: `${VisualLogging.pane('throttling-conditions')}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(throttlingSettingsTabStyles);
        const settingsContent = this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
        settingsContent.classList.add('settings-card-container', 'throttling-conditions-settings');
        this.cpuThrottlingCard = new CPUThrottlingCard();
        settingsContent.append(this.cpuThrottlingCard.element);
        const addButton = new Buttons.Button.Button();
        addButton.classList.add('add-conditions-button');
        addButton.data = {
            variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
            iconName: 'plus',
            jslogContext: 'network.add-conditions',
        };
        addButton.textContent = i18nString(UIStrings.addCustomProfile);
        addButton.addEventListener('click', () => this.addButtonClicked());
        const card = settingsContent.createChild('devtools-card');
        card.heading = i18nString(UIStrings.networkThrottlingProfiles);
        const container = card.createChild('div');
        this.list = new UI.ListWidget.ListWidget(this);
        this.list.element.classList.add('conditions-list');
        this.list.registerRequiredCSS(throttlingSettingsTabStyles);
        this.list.show(container);
        container.appendChild(addButton);
        this.customUserConditions = SDK.NetworkManager.customUserNetworkConditionsSetting();
        this.customUserConditions.addChangeListener(this.conditionsUpdated, this);
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
    }
    wasShown() {
        super.wasShown();
        this.cpuThrottlingCard.wasShown();
        this.conditionsUpdated();
    }
    willHide() {
        super.willHide();
        this.cpuThrottlingCard.willHide();
    }
    conditionsUpdated() {
        this.list.clear();
        const conditions = this.customUserConditions.get();
        for (let i = 0; i < conditions.length; ++i) {
            this.list.appendItem(conditions[i], true);
        }
        this.list.appendSeparator();
    }
    addButtonClicked() {
        this.#customUserConditionsCount++;
        this.list.addNewItem(this.customUserConditions.get().length, {
            key: `USER_CUSTOM_SETTING_${this.#customUserConditionsCount}`,
            title: () => '',
            download: -1,
            upload: -1,
            latency: 0,
            packetLoss: 0,
            packetReordering: false
        });
    }
    renderItem(conditions, _editable) {
        const element = document.createElement('div');
        element.classList.add('conditions-list-item');
        const title = element.createChild('div', 'conditions-list-text conditions-list-title');
        const titleText = title.createChild('div', 'conditions-list-title-text');
        const castedTitle = this.retrieveOptionsTitle(conditions);
        titleText.textContent = castedTitle;
        UI.Tooltip.Tooltip.install(titleText, castedTitle);
        element.createChild('div', 'conditions-list-separator');
        element.createChild('div', 'conditions-list-text').textContent = throughputText(conditions.download);
        element.createChild('div', 'conditions-list-separator');
        element.createChild('div', 'conditions-list-text').textContent = throughputText(conditions.upload);
        element.createChild('div', 'conditions-list-separator');
        element.createChild('div', 'conditions-list-text').textContent =
            i18nString(UIStrings.dms, { PH1: conditions.latency });
        element.createChild('div', 'conditions-list-separator');
        element.createChild('div', 'conditions-list-text').textContent = percentText(conditions.packetLoss ?? 0);
        element.createChild('div', 'conditions-list-separator');
        element.createChild('div', 'conditions-list-text').textContent = String(conditions.packetQueueLength ?? 0);
        element.createChild('div', 'conditions-list-separator');
        element.createChild('div', 'conditions-list-text').textContent =
            conditions.packetReordering ? i18nString(UIStrings.on) : i18nString(UIStrings.off);
        return element;
    }
    removeItemRequested(_item, index) {
        const list = this.customUserConditions.get();
        list.splice(index, 1);
        this.customUserConditions.set(list);
    }
    retrieveOptionsTitle(conditions) {
        // The title is usually an i18nLazyString except for custom values that are stored in the local storage in the form of a string.
        const castedTitle = typeof conditions.title === 'function' ? conditions.title() : conditions.title;
        return castedTitle;
    }
    commitEdit(conditions, editor, isNew) {
        conditions.title = editor.control('title').value.trim();
        const download = editor.control('download').value.trim();
        conditions.download = download ? parseInt(download, 10) * (1000 / 8) : -1;
        const upload = editor.control('upload').value.trim();
        conditions.upload = upload ? parseInt(upload, 10) * (1000 / 8) : -1;
        const latency = editor.control('latency').value.trim();
        conditions.latency = latency ? parseInt(latency, 10) : 0;
        const packetLoss = editor.control('packetLoss').value.trim();
        conditions.packetLoss = packetLoss ? parseFloat(packetLoss) : 0;
        const packetQueueLength = editor.control('packetQueueLength').value.trim();
        conditions.packetQueueLength = packetQueueLength ? parseFloat(packetQueueLength) : 0;
        const packetReordering = editor.control('packetReordering').checked;
        conditions.packetReordering = packetReordering;
        const list = this.customUserConditions.get();
        if (isNew) {
            list.push(conditions);
        }
        this.customUserConditions.set(list);
    }
    beginEdit(conditions) {
        const editor = this.createEditor();
        editor.control('title').value = this.retrieveOptionsTitle(conditions);
        editor.control('download').value = conditions.download <= 0 ? '' : String(conditions.download / (1000 / 8));
        editor.control('upload').value = conditions.upload <= 0 ? '' : String(conditions.upload / (1000 / 8));
        editor.control('latency').value = conditions.latency ? String(conditions.latency) : '';
        editor.control('packetLoss').value = conditions.packetLoss ? String(conditions.packetLoss) : '';
        editor.control('packetQueueLength').value =
            conditions.packetQueueLength ? String(conditions.packetQueueLength) : '';
        editor.control('packetReordering').checked = conditions.packetReordering ?? false;
        return editor;
    }
    createEditor() {
        if (this.editor) {
            return this.editor;
        }
        // Define the settings configuration
        const settings = [
            {
                name: 'title',
                labelText: i18nString(UIStrings.profileName),
                inputType: 'text',
                placeholder: '',
                validator: titleValidator,
                isOptional: false,
            },
            {
                name: 'download',
                labelText: i18nString(UIStrings.download),
                inputType: 'text',
                placeholder: i18n.i18n.lockedString('kbit/s'),
                validator: throughputValidator,
            },
            {
                name: 'upload',
                labelText: i18nString(UIStrings.upload),
                inputType: 'text',
                placeholder: i18n.i18n.lockedString('kbit/s'),
                validator: throughputValidator,
            },
            {
                name: 'latency',
                labelText: i18nString(UIStrings.latency),
                inputType: 'text',
                placeholder: i18n.i18n.lockedString('ms'),
                validator: latencyValidator,
            },
            {
                name: 'packetLoss',
                labelText: i18nString(UIStrings.packetLoss),
                inputType: 'text',
                placeholder: i18n.i18n.lockedString('percent'),
                validator: packetLossValidator,
            },
            {
                name: 'packetQueueLength',
                labelText: i18nString(UIStrings.packetQueueLength),
                inputType: 'text',
                placeholder: i18nString(UIStrings.packet),
                validator: packetQueueLengthValidator,
            },
            {
                name: 'packetReordering',
                labelText: i18nString(UIStrings.packetReordering),
                inputType: 'checkbox',
                placeholder: '',
                validator: packetReorderingValidator,
                isOptional: false,
            },
        ];
        const editor = new UI.ListWidget.Editor();
        this.editor = editor;
        const content = editor.contentElement();
        const settingsContainer = content.createChild('div', 'settings-container');
        const createSettingField = (name, labelText, inputType, placeholder, validator, isOptional = true) => {
            const settingElement = settingsContainer.createChild('div', 'setting');
            // Create title element
            const titleContainer = settingElement.createChild('div');
            titleContainer.textContent = labelText;
            // Create input element
            const inputElement = settingElement.createChild('div');
            const input = editor.createInput(name, inputType, placeholder, validator);
            input.classList.add('input');
            UI.ARIAUtils.setLabel(input, labelText);
            inputElement.appendChild(input);
            const optionalTextElement = inputElement.createChild('div');
            const optionalStr = i18nString(UIStrings.optional);
            optionalTextElement.textContent = optionalStr;
            UI.ARIAUtils.setDescription(input, optionalStr);
            if (!isOptional) {
                optionalTextElement.style.visibility = 'hidden';
            }
        };
        // Iterate over settings and create components
        settings.forEach(setting => {
            createSettingField(setting.name, setting.labelText, setting.inputType, setting.placeholder, setting.validator, setting.isOptional);
        });
        return editor;
        function titleValidator(_item, _index, input) {
            const maxLength = 49;
            const value = input.value.trim();
            const valid = value.length > 0 && value.length <= maxLength;
            if (!valid) {
                const errorMessage = i18nString(UIStrings.profileNameCharactersLengthMust, { PH1: maxLength });
                return { valid, errorMessage };
            }
            return { valid, errorMessage: undefined };
        }
        function throughputValidator(_item, _index, input) {
            const minThroughput = 0;
            const maxThroughput = 10000000;
            const value = input.value.trim();
            const parsedValue = Number(value);
            const throughput = input.getAttribute('aria-label');
            const valid = !Number.isNaN(parsedValue) && parsedValue >= minThroughput && parsedValue <= maxThroughput;
            if (!valid) {
                const errorMessage = i18nString(UIStrings.sMustBeANumberBetweenSkbsToSkbs, { PH1: String(throughput), PH2: minThroughput, PH3: maxThroughput });
                return { valid, errorMessage };
            }
            return { valid, errorMessage: undefined };
        }
        function latencyValidator(_item, _index, input) {
            const minLatency = 0;
            const maxLatency = 1000000;
            const value = input.value.trim();
            const parsedValue = Number(value);
            const valid = Number.isInteger(parsedValue) && parsedValue >= minLatency && parsedValue <= maxLatency;
            if (!valid) {
                const errorMessage = i18nString(UIStrings.latencyMustBeAnIntegerBetweenSms, { PH1: minLatency, PH2: maxLatency });
                return { valid, errorMessage };
            }
            return { valid, errorMessage: undefined };
        }
        function packetLossValidator(_item, _index, input) {
            const minPacketLoss = 0;
            const maxPacketLoss = 100;
            const value = input.value.trim();
            const parsedValue = Number(value);
            const valid = parsedValue >= minPacketLoss && parsedValue <= maxPacketLoss;
            if (!valid) {
                const errorMessage = i18nString(UIStrings.packetLossMustBeAnIntegerBetweenSpct, { PH1: minPacketLoss, PH2: maxPacketLoss });
                return { valid, errorMessage };
            }
            return { valid, errorMessage: undefined };
        }
        function packetQueueLengthValidator(_item, _index, input) {
            const minPacketQueueLength = 0;
            const value = input.value.trim();
            const parsedValue = Number(value);
            const valid = parsedValue >= minPacketQueueLength;
            if (!valid) {
                const errorMessage = i18nString(UIStrings.packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero);
                return { valid, errorMessage };
            }
            return { valid, errorMessage: undefined };
        }
        function packetReorderingValidator(_item, _index, _input) {
            return { valid: true, errorMessage: undefined };
        }
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