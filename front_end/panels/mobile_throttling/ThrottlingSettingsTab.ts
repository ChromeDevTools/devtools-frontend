// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Cards from '../../ui/components/cards/cards.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {CalibrationController} from './CalibrationController.js';
import throttlingSettingsTabStyles from './throttlingSettingsTab.css.js';

const UIStrings = {
  /**
   *@description Text in Throttling Settings Tab of the Network panel
   */
  networkThrottlingProfiles: 'Network throttling profiles',
  /**
   *@description Text of add conditions button in Throttling Settings Tab of the Network panel
   */
  addCustomProfile: 'Add profile',
  /**
   *@description A value in milliseconds
   *@example {3} PH1
   */
  dms: '{PH1} `ms`',
  /**
   *@description Text in Throttling Settings Tab of the Network panel
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
   * @description Label for a textbox serving as a unit in the Throttling Settings Tab for the field Packet Loss column.
   */
  percent: 'percent',
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
   *@description Text in Throttling Settings Tab of the Network panel
   */
  optional: 'optional',
  /**
   *@description Error message for Profile Name input in Throtting pane of the Settings
   *@example {49} PH1
   */
  profileNameCharactersLengthMust: 'Profile Name characters length must be between 1 to {PH1} inclusive',
  /**
   *@description Error message for Download and Upload inputs in Throttling pane of the Settings
   *@example {Download} PH1
   *@example {0} PH2
   *@example {10000000} PH3
   */
  sMustBeANumberBetweenSkbsToSkbs: '{PH1} must be a number between {PH2} `kbit/s` to {PH3} `kbit/s` inclusive',
  /**
   *@description Error message for Latency input in Throttling pane of the Settings
   *@example {0} PH1
   *@example {1000000} PH2
   */
  latencyMustBeAnIntegerBetweenSms: 'Latency must be an integer between {PH1} `ms` to {PH2} `ms` inclusive',
  /**
   *@description Error message for Packet Loss input in Throttling pane of the Settings
   *@example {0} PH1
   *@example {100} PH2
   */
  packetLossMustBeAnIntegerBetweenSpct: 'Packet Loss must be a number between {PH1} `%` to {PH2} `%` inclusive',
  /**
   *@description Error message for Packet Queue Length input in Throttling pane of the Settings
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
   *@description Text in Throttling Settings Tab of the Settings panel
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
   *@description Text to explain why the user should run the CPU calibration process.
   */
  calibrationCTA:
      'To use the CPU throttling presets, run the calibration process to determine the ideal throttling rate for your device.',
  /**
   *@description Text to explain what CPU throttling presets are.
   */
  cpuCalibrationDescription:
      'These presets throttle your CPU to approximate the performance of typical low or mid-tier mobile devices.',
  /**
   *@description Text to explain how the CPU calibration process will work.
   */
  calibrationConfirmationPrompt:
      'Calibration will take ~10 seconds, and temporarily navigate away from your current page. Do you wish to continue?',
  /**
   *@description Text to explain an issue that may impact the CPU calibration process.
   */
  calibrationWarningHighCPU: 'CPU utilization is too high',
  /**
   *@description Text to explain an issue that may impact the CPU calibration process.
   */
  calibrationWarningRunningOnBattery: 'Device is running on battery, please plug in charger for best results',
  /**
   *@description Text to explain an issue that may impact the CPU calibration process.
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
function createComputePressurePromise(): Promise<{state: string}> {
  const result = {state: ''};

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
  element: HTMLElement;

  private readonly setting: Common.Settings.Setting<SDK.CPUThrottlingManager.CalibratedCPUThrottling>;
  private computePressurePromise?: ReturnType<typeof createComputePressurePromise>;
  private controller?: CalibrationController;

  // UI stuff.
  private lowTierMobileDeviceEl: HTMLElement;
  private midTierMobileDeviceEl: HTMLElement;
  private calibrateEl: HTMLElement;
  private textEl: HTMLElement;
  private calibrateButton: Buttons.Button.Button;
  private cancelButton: Buttons.Button.Button;
  private progress: UI.ProgressIndicator.ProgressIndicator;
  private state: 'cta'|'prompting'|'calibrating' = 'cta';
  private warnings: string[] = [];

  constructor() {
    this.setting = Common.Settings.Settings.instance().createSetting<SDK.CPUThrottlingManager.CalibratedCPUThrottling>(
        'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);

    const card = new Cards.Card.Card();

    const descriptionEl = card.createChild('span');
    descriptionEl.textContent = i18nString(UIStrings.cpuCalibrationDescription);

    this.lowTierMobileDeviceEl = card.createChild('div', 'cpu-preset-section');
    this.lowTierMobileDeviceEl.append('Low-tier mobile device');
    this.lowTierMobileDeviceEl.createChild('div', 'cpu-preset-result');

    this.midTierMobileDeviceEl = card.createChild('div', 'cpu-preset-section');
    this.midTierMobileDeviceEl.append('Mid-tier mobile device');
    this.midTierMobileDeviceEl.createChild('div', 'cpu-preset-result');

    this.calibrateEl = card.createChild('div', 'cpu-preset-section cpu-preset-calibrate');

    const buttonContainerEl = this.calibrateEl.createChild('div', 'button-container');

    this.calibrateButton = new Buttons.Button.Button();
    this.calibrateButton.classList.add('calibrate-button');
    this.calibrateButton.data = {
      variant: Buttons.Button.Variant.PRIMARY,
      jslogContext: 'throttling.calibrate',
    };
    this.calibrateButton.addEventListener('click', () => this.calibrateButtonClicked());
    buttonContainerEl.append(this.calibrateButton);

    this.cancelButton = new Buttons.Button.Button();
    this.cancelButton.classList.add('cancel-button');
    this.cancelButton.data = {
      variant: Buttons.Button.Variant.OUTLINED,
      jslogContext: 'throttling.calibrate-cancel',
    };
    this.cancelButton.textContent = i18nString(UIStrings.cancel);
    this.cancelButton.addEventListener('click', () => this.cancelButtonClicked());
    buttonContainerEl.append(this.cancelButton);

    this.textEl = this.calibrateEl.createChild('div', 'text-container');

    this.progress = new UI.ProgressIndicator.ProgressIndicator({showStopButton: false});
    this.calibrateEl.append(this.progress.element);

    card.data = {
      heading: i18nString(UIStrings.cpuThrottlingPresets),
      content: [descriptionEl, this.lowTierMobileDeviceEl, this.midTierMobileDeviceEl, this.calibrateEl],
    };
    this.element = card;

    this.updateState();
  }

  wasShown(): void {
    this.computePressurePromise = createComputePressurePromise();
    this.state = 'cta';
    this.updateState();
  }

  willHide(): void {
    this.computePressurePromise = undefined;
    if (this.controller) {
      this.controller.abort();
    }
  }

  private updateState(): void {
    if (this.state !== 'calibrating') {
      this.controller = undefined;
    }

    const result = this.setting.get();
    const hasCalibrated = result.low || result.mid;

    this.calibrateButton.style.display = 'none';
    this.textEl.style.display = 'none';
    this.cancelButton.style.display = 'none';
    this.progress.element.style.display = 'none';

    if (this.state === 'cta') {
      this.calibrateButton.style.display = '';
      this.calibrateButton.textContent =
          hasCalibrated ? i18nString(UIStrings.recalibrate) : i18nString(UIStrings.calibrate);

      if (!hasCalibrated) {
        this.textEl.style.display = '';
        this.textEl.textContent = '';
        this.textEl.append(this.createTextWithIcon(i18nString(UIStrings.calibrationCTA), 'info'));
      }
    } else if (this.state === 'prompting') {
      this.calibrateButton.style.display = '';
      this.calibrateButton.textContent = i18nString(UIStrings.continue);

      this.cancelButton.style.display = '';

      this.textEl.style.display = '';
      this.textEl.textContent = '';
      for (const warning of this.warnings) {
        this.textEl.append(this.createTextWithIcon(warning, 'warning'));
      }
      this.textEl.append(this.createTextWithIcon(i18nString(UIStrings.calibrationConfirmationPrompt), 'info'));
    } else if (this.state === 'calibrating') {
      this.cancelButton.style.display = '';
      this.progress.element.style.display = '';
    }

    const resultToString = (result: number|SDK.CPUThrottlingManager.CalibrationError|undefined): string => {
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

      return i18nString(UIStrings.dSlowdown, {PH1: result.toFixed(1)});
    };

    const setPresetResult =
        (element: HTMLElement|null, result: number|SDK.CPUThrottlingManager.CalibrationError|undefined): void => {
          if (!element) {
            throw new Error('expected HTMLElement');
          }

          element.textContent = resultToString(result);
          element.classList.toggle('not-calibrated', result === undefined);
        };

    setPresetResult(this.lowTierMobileDeviceEl.querySelector('.cpu-preset-result'), result.low);
    setPresetResult(this.midTierMobileDeviceEl.querySelector('.cpu-preset-result'), result.mid);
  }

  private createTextWithIcon(text: string, icon: string): HTMLElement {
    const el = document.createElement('div');
    el.classList.add('text-with-icon');
    el.append(IconButton.Icon.create(icon));
    el.append(text);
    return el;
  }

  private async getCalibrationWarnings(): Promise<string[]> {
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
    } else if (battery.level < 0.2) {
      warnings.push(i18nString(UIStrings.calibrationWarningLowBattery));
    }

    return warnings;
  }

  private async calibrateButtonClicked(): Promise<void> {
    if (this.state === 'cta') {
      this.warnings = await this.getCalibrationWarnings();
      this.state = 'prompting';
      this.updateState();
    } else if (this.state === 'prompting') {
      this.state = 'calibrating';
      this.updateState();
      void this.runCalibration();
    }
  }

  private cancelButtonClicked(): void {
    if (this.controller) {
      this.controller.abort();
    } else {
      this.state = 'cta';
      this.updateState();
    }
  }

  private async runCalibration(): Promise<void> {
    this.progress.setWorked(0);
    this.progress.setTotalWork(1);

    this.controller = new CalibrationController();

    try {
      if (!await this.controller.start()) {
        console.error('Calibration failed to start');
        return;
      }

      for await (const result of this.controller.iterator()) {
        this.progress.setWorked(result.progress);
      }
    } catch (e) {
      console.error(e);
    } finally {
      await this.controller.end();
    }

    const result = this.controller.result();
    if (result && (result.low || result.mid)) {
      this.setting.set(result);
      // Let the user bask in the glory of a 100% progress bar, for a bit.
      this.progress.setWorked(1);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    this.state = 'cta';
    this.updateState();
  }
}

export class ThrottlingSettingsTab extends UI.Widget.VBox implements
    UI.ListWidget.Delegate<SDK.NetworkManager.Conditions> {
  private readonly list: UI.ListWidget.ListWidget<SDK.NetworkManager.Conditions>;
  private readonly customSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  private editor?: UI.ListWidget.Editor<SDK.NetworkManager.Conditions>;
  private cpuThrottlingCard: CPUThrottlingCard;

  constructor() {
    super(true);

    this.element.setAttribute('jslog', `${VisualLogging.pane('throttling-conditions')}`);

    const settingsContent =
        this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
    settingsContent.classList.add('settings-card-container', 'throttling-conditions-settings');

    this.cpuThrottlingCard = new CPUThrottlingCard();
    settingsContent.append(this.cpuThrottlingCard.element);

    const addButton = new Buttons.Button.Button();
    addButton.classList.add('add-conditions-button');
    addButton.data = {
      variant: Buttons.Button.Variant.OUTLINED,
      iconName: 'plus',
      jslogContext: 'network.add-conditions',
    };
    addButton.textContent = i18nString(UIStrings.addCustomProfile);
    addButton.addEventListener('click', () => this.addButtonClicked());

    const container = settingsContent.createChild('div');
    const card = new Cards.Card.Card();
    settingsContent.appendChild(card);
    card.data = {
      heading: i18nString(UIStrings.networkThrottlingProfiles),
      content: [container],
    };
    this.list = new UI.ListWidget.ListWidget(this);
    this.list.element.classList.add('conditions-list');
    this.list.show(container);
    container.appendChild(addButton);

    this.customSetting = Common.Settings.Settings.instance().moduleSetting('custom-network-conditions');
    this.customSetting.addChangeListener(this.conditionsUpdated, this);
  }

  override wasShown(): void {
    super.wasShown();
    this.cpuThrottlingCard.wasShown();
    this.list.registerCSSFiles([throttlingSettingsTabStyles]);
    this.registerCSSFiles([throttlingSettingsTabStyles]);
    this.conditionsUpdated();
  }

  override willHide(): void {
    super.willHide();
    this.cpuThrottlingCard.willHide();
  }

  private conditionsUpdated(): void {
    this.list.clear();

    const conditions = this.customSetting.get();
    for (let i = 0; i < conditions.length; ++i) {
      this.list.appendItem(conditions[i], true);
    }

    this.list.appendSeparator();
  }

  private addButtonClicked(): void {
    this.list.addNewItem(
        this.customSetting.get().length,
        {title: () => '', download: -1, upload: -1, latency: 0, packetLoss: 0, packetReordering: false});
  }

  renderItem(conditions: SDK.NetworkManager.Conditions, _editable: boolean): Element {
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
        i18nString(UIStrings.dms, {PH1: conditions.latency});
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = percentText(conditions.packetLoss ?? 0);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = String(conditions.packetQueueLength ?? 0);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent =
        conditions.packetReordering ? i18nString(UIStrings.on) : i18nString(UIStrings.off);

    return element;
  }

  removeItemRequested(_item: SDK.NetworkManager.Conditions, index: number): void {
    const list = this.customSetting.get();
    list.splice(index, 1);
    this.customSetting.set(list);
  }

  retrieveOptionsTitle(conditions: SDK.NetworkManager.Conditions): string {
    // The title is usually an i18nLazyString except for custom values that are stored in the local storage in the form of a string.
    const castedTitle = typeof conditions.title === 'function' ? conditions.title() : conditions.title;
    return castedTitle;
  }

  commitEdit(
      conditions: SDK.NetworkManager.Conditions, editor: UI.ListWidget.Editor<SDK.NetworkManager.Conditions>,
      isNew: boolean): void {
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
    const packetReordering = (editor.control('packetReordering') as HTMLInputElement).checked;
    conditions.packetReordering = packetReordering;

    const list = this.customSetting.get();
    if (isNew) {
      list.push(conditions);
    }

    this.customSetting.set(list);
  }

  beginEdit(conditions: SDK.NetworkManager.Conditions): UI.ListWidget.Editor<SDK.NetworkManager.Conditions> {
    const editor = this.createEditor();
    editor.control('title').value = this.retrieveOptionsTitle(conditions);
    editor.control('download').value = conditions.download <= 0 ? '' : String(conditions.download / (1000 / 8));
    editor.control('upload').value = conditions.upload <= 0 ? '' : String(conditions.upload / (1000 / 8));
    editor.control('latency').value = conditions.latency ? String(conditions.latency) : '';
    editor.control('packetLoss').value = conditions.packetLoss ? String(conditions.packetLoss) : '';
    editor.control('packetQueueLength').value =
        conditions.packetQueueLength ? String(conditions.packetQueueLength) : '';
    (editor.control('packetReordering') as HTMLInputElement).checked = conditions.packetReordering ?? false;
    return editor;
  }

  private createEditor(): UI.ListWidget.Editor<SDK.NetworkManager.Conditions> {
    if (this.editor) {
      return this.editor;
    }

    const editor = new UI.ListWidget.Editor<SDK.NetworkManager.Conditions>();
    this.editor = editor;
    const content = editor.contentElement();

    const titles = content.createChild('div', 'conditions-edit-row');
    const nameLabel = titles.createChild('div', 'conditions-list-text conditions-list-title');
    const nameStr = i18nString(UIStrings.profileName);
    const nameLabelText = nameLabel.createChild('div', 'conditions-list-title-text');
    nameLabelText.textContent = nameStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const downloadLabel = titles.createChild('div', 'conditions-list-text');
    const downloadStr = i18nString(UIStrings.download);
    const downloadLabelText = downloadLabel.createChild('div', 'conditions-list-title-text');
    downloadLabelText.textContent = downloadStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const uploadLabel = titles.createChild('div', 'conditions-list-text');
    const uploadLabelText = uploadLabel.createChild('div', 'conditions-list-title-text');
    const uploadStr = i18nString(UIStrings.upload);
    uploadLabelText.textContent = uploadStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const latencyLabel = titles.createChild('div', 'conditions-list-text');
    const latencyStr = i18nString(UIStrings.latency);
    const latencyLabelText = latencyLabel.createChild('div', 'conditions-list-title-text');
    latencyLabelText.textContent = latencyStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const packetLossLabel = titles.createChild('div', 'conditions-list-text');
    const packetLossStr = i18nString(UIStrings.packetLoss);
    const packetLossLabelText = packetLossLabel.createChild('div', 'conditions-list-title-text');
    packetLossLabelText.textContent = packetLossStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const packetQueueLengthLabel = titles.createChild('div', 'conditions-list-text');
    const packetQueueLengthStr = i18nString(UIStrings.packetQueueLength);
    const packetQueueLengthLabelText = packetQueueLengthLabel.createChild('div', 'conditions-list-title-text');
    packetQueueLengthLabelText.textContent = packetQueueLengthStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const packetReorderingLabel = titles.createChild('div', 'conditions-list-text');
    const packetReorderingStr = i18nString(UIStrings.packetReordering);
    const packetReorderingText = packetReorderingLabel.createChild('div', 'conditions-list-title-text');
    packetReorderingText.textContent = packetReorderingStr;

    const fields = content.createChild('div', 'conditions-edit-row');
    const nameInput = editor.createInput('title', 'text', '', titleValidator);
    UI.ARIAUtils.setLabel(nameInput, nameStr);
    fields.createChild('div', 'conditions-list-text conditions-list-title').appendChild(nameInput);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    let cell = fields.createChild('div', 'conditions-list-text');
    const downloadInput = editor.createInput('download', 'text', i18n.i18n.lockedString('kbit/s'), throughputValidator);
    cell.appendChild(downloadInput);
    UI.ARIAUtils.setLabel(downloadInput, downloadStr);
    const downloadOptional = cell.createChild('div', 'conditions-edit-optional');
    const optionalStr = i18nString(UIStrings.optional);
    downloadOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(downloadInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const uploadInput = editor.createInput('upload', 'text', i18n.i18n.lockedString('kbit/s'), throughputValidator);
    UI.ARIAUtils.setLabel(uploadInput, uploadStr);
    cell.appendChild(uploadInput);
    const uploadOptional = cell.createChild('div', 'conditions-edit-optional');
    uploadOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(uploadInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const latencyInput = editor.createInput('latency', 'text', i18n.i18n.lockedString('ms'), latencyValidator);
    UI.ARIAUtils.setLabel(latencyInput, latencyStr);
    cell.appendChild(latencyInput);
    const latencyOptional = cell.createChild('div', 'conditions-edit-optional');
    latencyOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(latencyInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const packetLossInput =
        editor.createInput('packetLoss', 'text', i18n.i18n.lockedString('percent'), packetLossValidator);
    UI.ARIAUtils.setLabel(packetLossInput, packetLossStr);
    cell.appendChild(packetLossInput);
    const packetLossOptional = cell.createChild('div', 'conditions-edit-optional');
    packetLossOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(packetLossInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const packetQueueLengthInput =
        editor.createInput('packetQueueLength', 'text', i18nString(UIStrings.packet), packetQueueLengthValidator);
    UI.ARIAUtils.setLabel(packetQueueLengthInput, packetQueueLengthStr);
    cell.appendChild(packetQueueLengthInput);
    const packetQueueLengthOptional = cell.createChild('div', 'conditions-edit-optional');
    packetQueueLengthOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(packetQueueLengthInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const packetReorderingInput =
        editor.createInput('packetReordering', 'checkbox', i18nString(UIStrings.percent), packetReorderingValidator);
    UI.ARIAUtils.setLabel(packetReorderingInput, packetLossStr);
    cell.appendChild(packetReorderingInput);

    return editor;

    function titleValidator(_item: SDK.NetworkManager.Conditions, _index: number, input: UI.ListWidget.EditorControl):
        UI.ListWidget.ValidatorResult {
      const maxLength = 49;
      const value = input.value.trim();
      const valid = value.length > 0 && value.length <= maxLength;
      if (!valid) {
        const errorMessage = i18nString(UIStrings.profileNameCharactersLengthMust, {PH1: maxLength});
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    function throughputValidator(
        _item: SDK.NetworkManager.Conditions, _index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      const minThroughput = 0;
      const maxThroughput = 10000000;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const throughput = input.getAttribute('aria-label');
      const valid = !Number.isNaN(parsedValue) && parsedValue >= minThroughput && parsedValue <= maxThroughput;
      if (!valid) {
        const errorMessage = i18nString(
            UIStrings.sMustBeANumberBetweenSkbsToSkbs,
            {PH1: String(throughput), PH2: minThroughput, PH3: maxThroughput});
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    function latencyValidator(_item: SDK.NetworkManager.Conditions, _index: number, input: UI.ListWidget.EditorControl):
        UI.ListWidget.ValidatorResult {
      const minLatency = 0;
      const maxLatency = 1000000;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const valid = Number.isInteger(parsedValue) && parsedValue >= minLatency && parsedValue <= maxLatency;
      if (!valid) {
        const errorMessage = i18nString(UIStrings.latencyMustBeAnIntegerBetweenSms, {PH1: minLatency, PH2: maxLatency});
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    function packetLossValidator(
        _item: SDK.NetworkManager.Conditions, _index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      const minPacketLoss = 0;
      const maxPacketLoss = 100;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const valid = parsedValue >= minPacketLoss && parsedValue <= maxPacketLoss;
      if (!valid) {
        const errorMessage =
            i18nString(UIStrings.packetLossMustBeAnIntegerBetweenSpct, {PH1: minPacketLoss, PH2: maxPacketLoss});
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    function packetQueueLengthValidator(
        _item: SDK.NetworkManager.Conditions, _index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      const minPacketQueueLength = 0;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const valid = parsedValue >= minPacketQueueLength;
      if (!valid) {
        const errorMessage = i18nString(UIStrings.packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero);
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    function packetReorderingValidator(
        _item: SDK.NetworkManager.Conditions, _index: number,
        _input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return {valid: true, errorMessage: undefined};
    }
  }
}

function throughputText(throughput: number): string {
  if (throughput < 0) {
    return '';
  }
  const throughputInKbps = throughput / (1000 / 8);
  if (throughputInKbps < 1000) {
    return i18nString(UIStrings.dskbits, {PH1: throughputInKbps});
  }
  if (throughputInKbps < 1000 * 10) {
    const formattedResult = (throughputInKbps / 1000).toFixed(1);
    return i18nString(UIStrings.fsmbits, {PH1: formattedResult});
  }
  // TODO(petermarshall): Figure out if there is a difference we need to tell i18n about
  // for these two versions: one with decimal places and one without.
  return i18nString(UIStrings.fsmbits, {PH1: (throughputInKbps / 1000) | 0});
}

function percentText(percent: number): string {
  if (percent < 0) {
    return '';
  }
  return String(percent) + '%';
}
