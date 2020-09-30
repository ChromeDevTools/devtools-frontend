// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

const TIMEOUT = 1000;

/** @enum {symbol} */
const Events = {
  ExportCredential: Symbol('ExportCredential'),
  RemoveCredential: Symbol('RemoveCredential'),
};

/**
 * @extends {DataGrid.DataGrid.DataGridNode<!DataGridNode>}
 */
class DataGridNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @param {!Protocol.WebAuthn.Credential} credential
   */
  constructor(credential) {
    super(credential);
  }

  /**
   * @override
   */
  nodeSelfHeight() {
    return 24;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!HTMLElement}
   */
  createCell(columnId) {
    const cell = super.createCell(columnId);
    cell.title = cell.textContent || '';

    if (columnId !== 'actions') {
      return cell;
    }

    const exportButton = UI.UIUtils.createTextButton(ls`Export`, () => {
      this.dataGrid.dispatchEventToListeners(Events.ExportCredential, this.data);
    });

    cell.appendChild(exportButton);

    const removeButton = UI.UIUtils.createTextButton(ls`Remove`, () => {
      this.dataGrid.dispatchEventToListeners(Events.RemoveCredential, this.data);
    });

    cell.appendChild(removeButton);

    return cell;
  }
}

/**
 * @extends {DataGrid.DataGrid.DataGridNode<!DataGridNode>}
 */
class EmptyDataGridNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @override
   */
  createCells(element) {
    element.removeChildren();
    const td = this.createTDWithClass(DataGrid.DataGrid.Align.Center);
    td.colSpan = this.dataGrid.visibleColumnsArray.length;

    const code = document.createElement('span', {is: 'source-code'});
    code.textContent = 'navigator.credentials.create()';
    code.classList.add('code');
    const message = UI.UIUtils.formatLocalized('No credentials. Try calling %s from your website.', [code]);

    td.appendChild(message);
    element.appendChild(td);
  }
}

/**
 * @unrestricted
 */
export class WebauthnPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('webauthn/webauthnPane.css');
    this.contentElement.classList.add('webauthn-pane');
    this._enabled = false;
    this._activeAuthId = null;
    this._hasBeenEnabled = false;
    /** @type {!Map<!Protocol.WebAuthn.AuthenticatorId, !DataGrid.DataGrid.DataGridImpl>} */
    this._dataGrids = new Map();

    this._availableAuthenticatorSetting =
        Common.Settings.Settings.instance().createSetting('webauthnAuthenticators', []);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (mainTarget) {
      this._model = mainTarget.model(SDK.WebAuthnModel.WebAuthnModel);
    }

    this._createToolbar();
    this._authenticatorsView = this.contentElement.createChild('div', 'authenticators-view');
    this._createNewAuthenticatorSection();
    this._updateVisibility(false);
  }

  async _loadInitialAuthenticators() {
    let activeAuthenticatorId = null;
    const availableAuthenticators = this._availableAuthenticatorSetting.get();
    for (const options of availableAuthenticators) {
      const authenticatorId = await this._model.addAuthenticator(options);
      this._addAuthenticatorSection(authenticatorId, options);
      // Update the authenticatorIds in the options.
      options.authenticatorId = authenticatorId;
      if (options.active) {
        activeAuthenticatorId = authenticatorId;
      }
    }

    // Update the settings to reflect the new authenticatorIds.
    this._availableAuthenticatorSetting.set(availableAuthenticators);
    if (activeAuthenticatorId) {
      this._setActiveAuthenticator(activeAuthenticatorId);
    }
  }

  /**
   * @override
   */
  ownerViewDisposed() {
    this._enableCheckbox.setChecked(false);
    this._setVirtualAuthEnvEnabled(false);
  }

  _createToolbar() {
    this._topToolbarContainer = this.contentElement.createChild('div', 'webauthn-toolbar-container');
    this._topToolbar = new UI.Toolbar.Toolbar('webauthn-toolbar', this._topToolbarContainer);
    const enableCheckboxTitle = ls`Enable virtual authenticator environment`;
    this._enableCheckbox =
        new UI.Toolbar.ToolbarCheckbox(enableCheckboxTitle, enableCheckboxTitle, this._handleCheckboxToggle.bind(this));
    this._topToolbar.appendToolbarItem(this._enableCheckbox);
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   */
  _createCredentialsDataGrid(authenticatorId) {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {
        id: 'credentialId',
        title: ls`ID`,
        longText: true,
        weight: 24,
      },
      {
        id: 'isResidentCredential',
        title: ls`Is Resident`,
        dataType: DataGrid.DataGrid.DataType.Boolean,
        weight: 10,
      },
      {
        id: 'rpId',
        title: ls`RP ID`,
      },
      {
        id: 'userHandle',
        title: ls`User Handle`,
      },
      {
        id: 'signCount',
        title: ls`Sign Count`,
      },
      {id: 'actions', title: ls`Actions`},
    ]);

    const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: ls`Credentials`, columns});
    dataGrid.renderInline();
    dataGrid.setStriped(true);
    dataGrid.addEventListener(Events.ExportCredential, this._handleExportCredential, this);
    dataGrid.addEventListener(Events.RemoveCredential, this._handleRemoveCredential.bind(this, authenticatorId));

    this._dataGrids.set(authenticatorId, dataGrid);

    return dataGrid;
  }

  _handleExportCredential(e) {
    this._exportCredential(e.data);
  }

  _handleRemoveCredential(authenticatorId, e) {
    this._removeCredential(authenticatorId, e.data.credentialId);
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   */
  async _updateCredentials(authenticatorId) {
    const dataGrid = this._dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }

    const credentials = await this._model.getCredentials(authenticatorId);

    dataGrid.rootNode().removeChildren();
    for (const credential of credentials) {
      const node = new DataGridNode(credential);
      dataGrid.rootNode().appendChild(node);
    }

    this._maybeAddEmptyNode(dataGrid);

    // TODO(crbug.com/1112528): Add back-end events for credential creation and removal to avoid polling.
    setTimeout(this._updateCredentials.bind(this, authenticatorId), TIMEOUT);
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridImpl} dataGrid
   */
  _maybeAddEmptyNode(dataGrid) {
    if (dataGrid.rootNode().children.length) {
      return;
    }

    const node = new EmptyDataGridNode();
    dataGrid.rootNode().appendChild(node);
  }

  /**
   * @param {boolean} enable
   */
  _setVirtualAuthEnvEnabled(enable) {
    if (enable && !this._hasBeenEnabled) {
      // Ensures metric is only tracked once per session.
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.VirtualAuthenticatorEnvironmentEnabled);
      this._hasBeenEnabled = true;
    }
    this._enabled = enable;
    this._model.setVirtualAuthEnvEnabled(enable);
    this._updateVisibility(enable);
    if (enable) {
      this._loadInitialAuthenticators();
    } else {
      this._removeAuthenticatorSections();
    }
  }

  /**
   * @param {boolean} enabled
   */
  _updateVisibility(enabled) {
    if (enabled) {
      if (this._newAuthenticatorSection) {
        this._newAuthenticatorSection.style.visibility = 'visible';
      }
    } else {
      if (this._newAuthenticatorSection) {
        this._newAuthenticatorSection.style.visibility = 'hidden';
      }
    }
  }

  _removeAuthenticatorSections() {
    this._authenticatorsView.innerHTML = '';
    this._dataGrids.clear();
  }

  _handleCheckboxToggle() {
    this._setVirtualAuthEnvEnabled(!this._enabled);
  }

  /**
   * @param {!Array<!Protocol.WebAuthn.AuthenticatorTransport>} enabledOptions
   */
  _updateEnabledTransportOptions(enabledOptions) {
    const prevValue = this._transportSelect.value;
    this._transportSelect.removeChildren();

    for (const option of enabledOptions) {
      this._transportSelect.appendChild(new Option(option, option));
    }

    // Make sure the currently selected value stays the same.
    this._transportSelect.value = prevValue;
    // If the new set does not include the previous value.
    if (!this._transportSelect.value) {
      // Select the first available value.
      this._transportSelect.selectedIndex = 0;
    }
  }

  _updateNewAuthenticatorSectionOptions() {
    if (this._protocolSelect.value === Protocol.WebAuthn.AuthenticatorProtocol.Ctap2) {
      this._residentKeyCheckbox.disabled = false;
      this._userVerificationCheckbox.disabled = false;
      this._updateEnabledTransportOptions([
        Protocol.WebAuthn.AuthenticatorTransport.Usb,
        Protocol.WebAuthn.AuthenticatorTransport.Ble,
        Protocol.WebAuthn.AuthenticatorTransport.Nfc,
        // TODO (crbug.com/1034663): Toggle cable as option depending on if cablev2 flag is on.
        // Protocol.WebAuthn.AuthenticatorTransport.Cable,
        Protocol.WebAuthn.AuthenticatorTransport.Internal,
      ]);
    } else {
      this._residentKeyCheckbox.value = false;
      this._residentKeyCheckbox.disabled = true;
      this._userVerificationCheckbox.value = false;
      this._userVerificationCheckbox.disabled = true;
      this._updateEnabledTransportOptions([
        Protocol.WebAuthn.AuthenticatorTransport.Usb,
        Protocol.WebAuthn.AuthenticatorTransport.Ble,
        Protocol.WebAuthn.AuthenticatorTransport.Nfc,
      ]);
    }
  }

  _createNewAuthenticatorSection() {
    this._newAuthenticatorSection = this.contentElement.createChild('div', 'new-authenticator-container');
    const newAuthenticatorTitle = UI.UIUtils.createLabel(ls`New authenticator`, 'new-authenticator-title');
    this._newAuthenticatorSection.appendChild(newAuthenticatorTitle);
    this._newAuthenticatorForm = this._newAuthenticatorSection.createChild('div', 'new-authenticator-form');

    const protocolGroup = this._newAuthenticatorForm.createChild('div', 'authenticator-option');
    const transportGroup = this._newAuthenticatorForm.createChild('div', 'authenticator-option');
    const residentKeyGroup = this._newAuthenticatorForm.createChild('div', 'authenticator-option');
    const userVerificationGroup = this._newAuthenticatorForm.createChild('div', 'authenticator-option');
    const addButtonGroup = this._newAuthenticatorForm.createChild('div', 'authenticator-option');

    const protocolSelectTitle = UI.UIUtils.createLabel(ls`Protocol`, 'authenticator-option-label');
    protocolGroup.appendChild(protocolSelectTitle);
    this._protocolSelect = protocolGroup.createChild('select', 'chrome-select');
    UI.ARIAUtils.bindLabelToControl(protocolSelectTitle, this._protocolSelect);
    Object.values(Protocol.WebAuthn.AuthenticatorProtocol).sort().forEach(option => {
      this._protocolSelect.appendChild(new Option(option, option));
    });
    this._protocolSelect.value = Protocol.WebAuthn.AuthenticatorProtocol.Ctap2;

    const transportSelectTitle = UI.UIUtils.createLabel(ls`Transport`, 'authenticator-option-label');
    transportGroup.appendChild(transportSelectTitle);
    this._transportSelect = transportGroup.createChild('select', 'chrome-select');
    UI.ARIAUtils.bindLabelToControl(transportSelectTitle, this._transportSelect);
    // transportSelect will be populated in _updateNewAuthenticatorSectionOptions.

    this._residentKeyCheckboxLabel = UI.UIUtils.CheckboxLabel.create(ls`Supports resident keys`, false);
    this._residentKeyCheckboxLabel.textElement.classList.add('authenticator-option-label');
    residentKeyGroup.appendChild(this._residentKeyCheckboxLabel.textElement);
    this._residentKeyCheckbox = this._residentKeyCheckboxLabel.checkboxElement;
    this._residentKeyCheckbox.checked = false;
    this._residentKeyCheckbox.classList.add('authenticator-option-checkbox');
    residentKeyGroup.appendChild(this._residentKeyCheckbox);

    this._userVerificationCheckboxLabel = UI.UIUtils.CheckboxLabel.create('Supports user verification', false);
    this._userVerificationCheckboxLabel.textElement.classList.add('authenticator-option-label');
    userVerificationGroup.appendChild(this._userVerificationCheckboxLabel.textElement);
    this._userVerificationCheckbox = this._userVerificationCheckboxLabel.checkboxElement;
    this._userVerificationCheckbox.checked = false;
    this._userVerificationCheckbox.classList.add('authenticator-option-checkbox');
    userVerificationGroup.appendChild(this._userVerificationCheckbox);

    this._addAuthenticatorButton =
        UI.UIUtils.createTextButton(ls`Add`, this._handleAddAuthenticatorButton.bind(this), '');
    addButtonGroup.createChild('div', 'authenticator-option-label');
    addButtonGroup.appendChild(this._addAuthenticatorButton);
    const addAuthenticatorTitle = UI.UIUtils.createLabel(ls`Add authenticator`, '');
    UI.ARIAUtils.bindLabelToControl(addAuthenticatorTitle, this._addAuthenticatorButton);

    this._updateNewAuthenticatorSectionOptions();
    this._protocolSelect.addEventListener('change', this._updateNewAuthenticatorSectionOptions.bind(this));
  }

  async _handleAddAuthenticatorButton() {
    const options = this._createOptionsFromCurrentInputs();
    const authenticatorId = await this._model.addAuthenticator(options);
    const availableAuthenticators = this._availableAuthenticatorSetting.get();
    availableAuthenticators.push({authenticatorId, ...options});
    this._availableAuthenticatorSetting.set(
        availableAuthenticators.map(a => ({...a, active: a.authenticatorId === authenticatorId})));
    this._addAuthenticatorSection(authenticatorId, options);
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   * @param {!Protocol.WebAuthn.VirtualAuthenticatorOptions} options
   */
  async _addAuthenticatorSection(authenticatorId, options) {
    const section = document.createElement('div');
    section.classList.add('authenticator-section');
    section.setAttribute('data-authenticator-id', authenticatorId);
    this._authenticatorsView.insertAdjacentElement(
        'afterbegin', section);  // JS trick to insert as first element of parent.

    const headerElement = section.createChild('div', 'authenticator-section-header');
    const titleElement = headerElement.createChild('div', 'authenticator-section-title');
    UI.ARIAUtils.markAsHeading(titleElement, 2);

    await this._clearActiveAuthenticator();
    const activeButtonContainer = headerElement.createChild('div', 'active-button-container');
    const activeLabel = UI.UIUtils.createRadioLabel(`active-authenticator-${authenticatorId}`, ls`Active`);
    activeLabel.radioElement.addEventListener('click', this._setActiveAuthenticator.bind(this, authenticatorId));
    activeButtonContainer.appendChild(activeLabel);
    activeLabel.radioElement.checked = true;
    this._activeAuthId = authenticatorId;  // Newly added authenticator is automatically set as active.


    const removeButton = headerElement.createChild('button', 'text-button');
    removeButton.textContent = ls`Remove`;
    removeButton.addEventListener('click', this._removeAuthenticator.bind(this, authenticatorId));

    const toolbar = new UI.Toolbar.Toolbar('edit-name-toolbar', titleElement);
    const editName = new UI.Toolbar.ToolbarButton(ls`Edit name`, 'largeicon-edit');
    const saveName = new UI.Toolbar.ToolbarButton(ls`Save name`, 'largeicon-checkmark');
    saveName.setVisible(false);

    const nameField = titleElement.createChild('input', 'authenticator-name-field');
    nameField.setAttribute('readOnly', 'true');
    const userFriendlyName = authenticatorId.slice(-5);  // User friendly name defaults to last 5 chars of UUID.
    nameField.value = ls`Authenticator ${userFriendlyName}`;
    this._updateActiveLabelTitle(activeLabel, nameField.value);

    editName.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click,
        () => this._handleEditNameButton(titleElement, nameField, editName, saveName));
    saveName.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click,
        () => this._handleSaveNameButton(titleElement, nameField, editName, saveName, activeLabel));

    nameField.addEventListener(
        'focusout', () => this._handleSaveNameButton(titleElement, nameField, editName, saveName, activeLabel));
    nameField.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        this._handleSaveNameButton(titleElement, nameField, editName, saveName, activeLabel);
      }
    });

    toolbar.appendToolbarItem(editName);
    toolbar.appendToolbarItem(saveName);

    this._createAuthenticatorFields(section, authenticatorId, options);

    const label = document.createElementWithClass('div', 'credentials-title');
    label.textContent = ls`Credentials`;
    section.appendChild(label);

    const dataGrid = this._createCredentialsDataGrid(authenticatorId);
    dataGrid.asWidget().show(section);

    this._updateCredentials(authenticatorId);
  }

  /**
   * @param {!Protocol.WebAuthn.Credential} credential
   */
  _exportCredential(credential) {
    let pem = '-----BEGIN PRIVATE KEY-----\n';
    for (let i = 0; i < credential.privateKey.length; i += 64) {
      pem += credential.privateKey.substring(i, i + 64) + '\n';
    }
    pem += '-----END PRIVATE KEY-----';

    const link = document.createElement('a');
    link.download = ls`Private key.pem`;
    link.href = 'data:application/x-pem-file,' + encodeURIComponent(pem);
    link.click();
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   * @param {string} credentialId
   */
  async _removeCredential(authenticatorId, credentialId) {
    const dataGrid = this._dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }

    dataGrid.rootNode().children.find(n => n.data.credentialId === credentialId).remove();
    this._maybeAddEmptyNode(dataGrid);

    await this._model.removeCredential(authenticatorId, credentialId);
  }

  /**
   * Creates the fields describing the authenticator in the front end.
   * @param {!Element} section
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   * @param {!Protocol.WebAuthn.VirtualAuthenticatorOptions} options
   */
  _createAuthenticatorFields(section, authenticatorId, options) {
    const sectionFields = section.createChild('div', 'authenticator-fields');
    const uuidField = sectionFields.createChild('div', 'authenticator-field');
    const protocolField = sectionFields.createChild('div', 'authenticator-field');
    const transportField = sectionFields.createChild('div', 'authenticator-field');
    const srkField = sectionFields.createChild('div', 'authenticator-field');
    const suvField = sectionFields.createChild('div', 'authenticator-field');

    uuidField.appendChild(UI.UIUtils.createLabel(ls`UUID`, 'authenticator-option-label'));
    protocolField.appendChild(UI.UIUtils.createLabel(ls`Protocol`, 'authenticator-option-label'));
    transportField.appendChild(UI.UIUtils.createLabel(ls`Transport`, 'authenticator-option-label'));
    srkField.appendChild(UI.UIUtils.createLabel(ls`Supports resident keys`, 'authenticator-option-label'));
    suvField.appendChild(UI.UIUtils.createLabel(ls`Supports user verification`, 'authenticator-option-label'));

    uuidField.createChild('div', 'authenticator-field-value').textContent = authenticatorId;
    protocolField.createChild('div', 'authenticator-field-value').textContent = options.protocol;
    transportField.createChild('div', 'authenticator-field-value').textContent = options.transport;
    srkField.createChild('div', 'authenticator-field-value').textContent = options.hasResidentKey ? ls`Yes` : ls`No`;
    suvField.createChild('div', 'authenticator-field-value').textContent =
        options.hasUserVerification ? ls`Yes` : ls`No`;
  }

  /**
   * @param {!Element} titleElement
   * @param {!Element} nameField
   * @param {!UI.Toolbar.ToolbarButton} editName
   * @param {!UI.Toolbar.ToolbarButton} saveName
   */
  _handleEditNameButton(titleElement, nameField, editName, saveName) {
    nameField.removeAttribute('readonly');
    titleElement.classList.add('editing-name');
    nameField.focus();
    saveName.setVisible(true);
    editName.setVisible(false);
  }

  /**
   * @param {!Element} titleElement
   * @param {!Element} nameField
   * @param {!UI.Toolbar.ToolbarItem} editName
   * @param {!UI.Toolbar.ToolbarItem} saveName
   * @param {!Element} activeLabel
   */
  _handleSaveNameButton(titleElement, nameField, editName, saveName, activeLabel) {
    nameField.setAttribute('readonly', '');
    titleElement.classList.remove('editing-name');
    editName.setVisible(true);
    saveName.setVisible(false);
    this._updateActiveLabelTitle(activeLabel, nameField.value);
  }

  /**
   * @param {!Element} activeLabel
   * @param {string} authenticatorName
   */
  _updateActiveLabelTitle(activeLabel, authenticatorName) {
    activeLabel.radioElement.title = ls`Set ${authenticatorName} as the active authenticator`;
  }

  /**
   * Removes both the authenticator and its respective UI element.
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   */
  _removeAuthenticator(authenticatorId) {
    this._authenticatorsView.querySelector(`[data-authenticator-id=${CSS.escape(authenticatorId)}]`).remove();
    this._dataGrids.delete(authenticatorId);
    this._model.removeAuthenticator(authenticatorId);

    // Update available authenticator setting.
    const prevAvailableAuthenticators = this._availableAuthenticatorSetting.get();
    const newAvailableAuthenticators = prevAvailableAuthenticators.filter(a => a.authenticatorId !== authenticatorId);
    this._availableAuthenticatorSetting.set(newAvailableAuthenticators);

    if (this._activeAuthId === authenticatorId) {
      const availableAuthenticatorIds = Array.from(this._dataGrids.keys());
      if (availableAuthenticatorIds.length) {
        this._setActiveAuthenticator(availableAuthenticatorIds[0]);
      } else {
        this._activeAuthId = null;
      }
    }
  }

  /**
   * @return {!Protocol.WebAuthn.VirtualAuthenticatorOptions}
   */
  _createOptionsFromCurrentInputs() {
    // TODO(crbug.com/1034663): Add optionality for isUserVerified param.
    return {
      protocol: this._protocolSelect.options[this._protocolSelect.selectedIndex].value,
      transport: this._transportSelect.options[this._transportSelect.selectedIndex].value,
      hasResidentKey: this._residentKeyCheckbox.checked,
      hasUserVerification: this._userVerificationCheckbox.checked,
      automaticPresenceSimulation: true,
      isUserVerified: true,
    };
  }

  /**
   * Sets the given authenticator as active.
   * Note that a newly added authenticator will automatically be set as active.
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   */
  async _setActiveAuthenticator(authenticatorId) {
    await this._clearActiveAuthenticator();
    await this._model.setAutomaticPresenceSimulation(authenticatorId, true);
    this._activeAuthId = authenticatorId;

    const prevAvailableAuthenticators = this._availableAuthenticatorSetting.get();
    const newAvailableAuthenticators =
        prevAvailableAuthenticators.map(a => ({...a, active: a.authenticatorId === authenticatorId}));
    this._availableAuthenticatorSetting.set(newAvailableAuthenticators);

    this._updateActiveButtons();
  }

  _updateActiveButtons() {
    const authenticators = this._authenticatorsView.getElementsByClassName('authenticator-section');
    Array.from(authenticators).forEach(authenticator => {
      const button = authenticator.querySelector('input.dt-radio-button');
      if (!button) {
        return;
      }
      button.checked = authenticator.dataset.authenticatorId === this._activeAuthId;
    });
  }

  async _clearActiveAuthenticator() {
    if (this._activeAuthId) {
      await this._model.setAutomaticPresenceSimulation(this._activeAuthId, false);
    }
    this._activeAuthId = null;
    this._updateActiveButtons();
  }
}
