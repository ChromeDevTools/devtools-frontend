// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  */
  networkThrottlingProfiles: 'Network Throttling Profiles',
  /**
  *@description Text of add conditions button in Throttling Settings Tab of the Network panel
  */
  addCustomProfile: 'Add custom profile...',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  *@example {3} PH1
  */
  dms: '{PH1}ms',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  */
  profileName: 'Profile Name',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  */
  download: 'Download',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  */
  upload: 'Upload',
  /**
  *@description Text for the latency of a task
  */
  latency: 'Latency',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  */
  kbs: 'kb/s',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  */
  optional: 'optional',
  /**
  *@description The milisecond unit
  */
  ms: 'ms',
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
  sMustBeANumberBetweenSkbsToSkbs: '{PH1} must be a number between {PH2}kb/s to {PH3}kb/s inclusive',
  /**
  *@description Error message for Latency input in Throttling pane of the Settings
  *@example {0} PH1
  *@example {1000000} PH2
  */
  latencyMustBeAnIntegerBetweenSms: 'Latency must be an integer between {PH1}ms to {PH2}ms inclusive',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  *@example {25} PH1
  *@example { } PH2
  */
  dskbs: '{PH1}{PH2}kB/s',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  *@example {25.4} PH1
  *@example { } PH2
  */
  fsmbs: '{PH1}{PH2}MB/s',
  /**
  *@description Text in Throttling Settings Tab of the Network panel
  *@example {25} PH1
  *@example { } PH2
  */
  dsmbs: '{PH1}{PH2}MB/s',
};
const str_ = i18n.i18n.registerUIStrings('mobile_throttling/ThrottlingSettingsTab.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @implements {UI.ListWidget.Delegate<!SDK.NetworkManager.Conditions>}
 */
export class ThrottlingSettingsTab extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('mobile_throttling/throttlingSettingsTab.css', {enableLegacyPatching: true});

    const header = this.contentElement.createChild('div', 'header');
    header.textContent = i18nString(UIStrings.networkThrottlingProfiles);
    UI.ARIAUtils.markAsHeading(header, 1);

    const addButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.addCustomProfile), this._addButtonClicked.bind(this), 'add-conditions-button');
    this.contentElement.appendChild(addButton);

    this._list = new UI.ListWidget.ListWidget(this);
    this._list.element.classList.add('conditions-list');
    this._list.registerRequiredCSS('mobile_throttling/throttlingSettingsTab.css', {enableLegacyPatching: true});
    this._list.show(this.contentElement);

    this._customSetting = Common.Settings.Settings.instance().moduleSetting('customNetworkConditions');
    this._customSetting.addChangeListener(this._conditionsUpdated, this);

    this.setDefaultFocusedElement(addButton);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._conditionsUpdated();
  }

  _conditionsUpdated() {
    this._list.clear();

    const conditions = this._customSetting.get();
    for (let i = 0; i < conditions.length; ++i) {
      this._list.appendItem(conditions[i], true);
    }

    this._list.appendSeparator();
  }

  _addButtonClicked() {
    this._list.addNewItem(this._customSetting.get().length, {title: '', download: -1, upload: -1, latency: 0});
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.Conditions} conditions
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(conditions, editable) {
    const element = document.createElement('div');
    element.classList.add('conditions-list-item');
    const title = element.createChild('div', 'conditions-list-text conditions-list-title');
    const titleText = title.createChild('div', 'conditions-list-title-text');
    titleText.textContent = conditions.title;
    UI.Tooltip.Tooltip.install(titleText, conditions.title);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = throughputText(conditions.download);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = throughputText(conditions.upload);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent =
        i18nString(UIStrings.dms, {PH1: conditions.latency});
    return element;
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    const list = this._customSetting.get();
    list.splice(index, 1);
    this._customSetting.set(list);
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.Conditions} conditions
   * @param {!UI.ListWidget.Editor<!SDK.NetworkManager.Conditions>} editor
   * @param {boolean} isNew
   */
  commitEdit(conditions, editor, isNew) {
    conditions.title = editor.control('title').value.trim();
    const download = editor.control('download').value.trim();
    conditions.download = download ? parseInt(download, 10) * (1000 / 8) : -1;
    const upload = editor.control('upload').value.trim();
    conditions.upload = upload ? parseInt(upload, 10) * (1000 / 8) : -1;
    const latency = editor.control('latency').value.trim();
    conditions.latency = latency ? parseInt(latency, 10) : 0;

    const list = this._customSetting.get();
    if (isNew) {
      list.push(conditions);
    }
    this._customSetting.set(list);
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.Conditions} conditions
   * @return {!UI.ListWidget.Editor<!SDK.NetworkManager.Conditions>}
   */
  beginEdit(conditions) {
    const editor = this._createEditor();
    editor.control('title').value = conditions.title;
    editor.control('download').value = conditions.download <= 0 ? '' : String(conditions.download / (1000 / 8));
    editor.control('upload').value = conditions.upload <= 0 ? '' : String(conditions.upload / (1000 / 8));
    editor.control('latency').value = conditions.latency ? String(conditions.latency) : '';
    return editor;
  }

  /**
   * @return {!UI.ListWidget.Editor<!SDK.NetworkManager.Conditions>}
   */
  _createEditor() {
    if (this._editor) {
      return this._editor;
    }

    const editor = new UI.ListWidget.Editor();
    this._editor = editor;
    const content = editor.contentElement();

    const titles = content.createChild('div', 'conditions-edit-row');
    const nameLabel = titles.createChild('div', 'conditions-list-text conditions-list-title');
    const nameStr = i18nString(UIStrings.profileName);
    nameLabel.textContent = nameStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const downloadLabel = titles.createChild('div', 'conditions-list-text');
    const downloadStr = i18nString(UIStrings.download);
    downloadLabel.textContent = downloadStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const uploadLabel = titles.createChild('div', 'conditions-list-text');
    const uploadStr = i18nString(UIStrings.upload);
    uploadLabel.textContent = uploadStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const latencyLabel = titles.createChild('div', 'conditions-list-text');
    const latencyStr = i18nString(UIStrings.latency);
    latencyLabel.textContent = latencyStr;

    const fields = content.createChild('div', 'conditions-edit-row');
    const nameInput = editor.createInput('title', 'text', '', titleValidator);
    UI.ARIAUtils.setAccessibleName(nameInput, nameStr);
    fields.createChild('div', 'conditions-list-text conditions-list-title').appendChild(nameInput);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    let cell = fields.createChild('div', 'conditions-list-text');
    const downloadInput = editor.createInput('download', 'text', i18nString(UIStrings.kbs), throughputValidator);
    cell.appendChild(downloadInput);
    UI.ARIAUtils.setAccessibleName(downloadInput, downloadStr);
    const downloadOptional = cell.createChild('div', 'conditions-edit-optional');
    const optionalStr = i18nString(UIStrings.optional);
    downloadOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(downloadInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const uploadInput = editor.createInput('upload', 'text', i18nString(UIStrings.kbs), throughputValidator);
    UI.ARIAUtils.setAccessibleName(uploadInput, uploadStr);
    cell.appendChild(uploadInput);
    const uploadOptional = cell.createChild('div', 'conditions-edit-optional');
    uploadOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(uploadInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const latencyInput = editor.createInput('latency', 'text', i18nString(UIStrings.ms), latencyValidator);
    UI.ARIAUtils.setAccessibleName(latencyInput, latencyStr);
    cell.appendChild(latencyInput);
    const latencyOptional = cell.createChild('div', 'conditions-edit-optional');
    latencyOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(latencyInput, optionalStr);

    return editor;

    /**
     * @param {!SDK.NetworkManager.Conditions} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function titleValidator(item, index, input) {
      const maxLength = 49;
      const value = input.value.trim();
      const valid = value.length > 0 && value.length <= maxLength;
      if (!valid) {
        const errorMessage = i18nString(UIStrings.profileNameCharactersLengthMust, {PH1: maxLength});
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    /**
     * @param {!SDK.NetworkManager.Conditions} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function throughputValidator(item, index, input) {
      const minThroughput = 0;
      const maxThroughput = 10000000;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const throughput = input.getAttribute('aria-label');
      const valid = !Number.isNaN(parsedValue) && parsedValue >= minThroughput && parsedValue <= maxThroughput;
      if (!valid) {
        const errorMessage = i18nString(
            UIStrings.sMustBeANumberBetweenSkbsToSkbs, {PH1: throughput, PH2: minThroughput, PH3: maxThroughput});
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    /**
     * @param {!SDK.NetworkManager.Conditions} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function latencyValidator(item, index, input) {
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
  }
}

/**
 * @param {number} throughput
 * @param {boolean=} plainText
 * @return {string}
 */
export function throughputText(throughput, plainText) {
  if (throughput < 0) {
    return '';
  }
  const throughputInKbps = throughput / (1000 / 8);
  const delimiter = plainText ? '' : ' ';
  if (throughputInKbps < 1000) {
    return i18nString(UIStrings.dskbs, {PH1: throughputInKbps, PH2: delimiter});
  }
  if (throughputInKbps < 1000 * 10) {
    const formattedResult = (throughputInKbps / 1000).toFixed(1);
    return i18nString(UIStrings.fsmbs, {PH1: formattedResult, PH2: delimiter});
  }
  return i18nString(UIStrings.dsmbs, {PH1: (throughputInKbps / 1000) | 0, PH2: delimiter});
}
