// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

const TIMEOUT = 1000;

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

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (mainTarget) {
      this._model = mainTarget.model(SDK.WebAuthnModel.WebAuthnModel);
    }

    this._createToolbar();
    this._authenticatorsView = this.contentElement.createChild('div', 'authenticators-view');
    this._createNewAuthenticatorSection();
    this._updateVisibility(false);
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
    if (!enable) {
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
  }

  _handleCheckboxToggle() {
    this._setVirtualAuthEnvEnabled(!this._enabled);
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
    Object.values(Protocol.WebAuthn.AuthenticatorProtocol).forEach(option => {
      this._protocolSelect.appendChild(new Option(option, option));
    });
    this._protocolSelect.selectedIndex = 0;

    const transportSelectTitle = UI.UIUtils.createLabel(ls`Transport`, 'authenticator-option-label');
    transportGroup.appendChild(transportSelectTitle);
    this._transportSelect = transportGroup.createChild('select', 'chrome-select');
    UI.ARIAUtils.bindLabelToControl(transportSelectTitle, this._transportSelect);
    // TODO (crbug.com/1034663): Toggle cable as option depending on if cablev2 flag is on.
    Object.values(Protocol.WebAuthn.AuthenticatorTransport).forEach(option => {
      if (option !== Protocol.WebAuthn.AuthenticatorTransport.Cable) {
        this._transportSelect.appendChild(new Option(option, option));
      }
    });
    this._transportSelect.selectedIndex = 0;

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
  }

  async _handleAddAuthenticatorButton() {
    const options = this._createOptionsFromCurrentInputs();
    const authenticatorId = await this._model.addAuthenticator(options);
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

    const removeButton = headerElement.createChild('button', 'text-button');
    removeButton.textContent = ls`Remove`;
    removeButton.addEventListener('click', this._removeAuthenticator.bind(this, authenticatorId));

    await this._clearActiveAuthenticator();
    const activeButtonContainer = headerElement.createChild('div', 'active-button-container');
    const activeLabel = UI.UIUtils.createRadioLabel('active-authenticator', ls`Active`);
    activeLabel.radioElement.addEventListener('click', this._setActiveAuthenticator.bind(this, authenticatorId));
    activeButtonContainer.appendChild(activeLabel);
    activeLabel.radioElement.checked = true;
    this._activeAuthId = authenticatorId;  // Newly added authenticator is automatically set as active.

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
    this._createCredentialsTable(section);
    this._updateCredentialTable(authenticatorId);
  }

  /**
   * @param {!Element} section
   */
  _createCredentialsTable(section) {
    // TODO(crbug.com/1114739): Use DataGrid to implement credential table.
    section.appendChild(UI.UIUtils.createLabel(ls`Credentials`, 'credentials-title'));
    const wrapper = section.createChild('div', 'credentials-table-wrapper');

    const credentialTable = wrapper.createChild('table', 'credentials-table');
    const tableHead = credentialTable.createTHead();
    const headRow = tableHead.insertRow();

    const columns = [
      ls`ID`,
      ls`Is Resident`,
      ls`RP ID`,
      ls`User Handle`,
      ls`Sign Count`,
      '',
      '',
    ];

    columns.forEach(field => {
      headRow.createChild('th').innerText = field;
    });
    headRow.children[0].classList.add('id-cell');

    credentialTable.createChild('tbody');
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   */
  async _updateCredentialTable(authenticatorId) {
    const credentialTableBody = this._authenticatorsView.querySelector(
        `[data-authenticator-id=${CSS.escape(authenticatorId)}] div table tbody`);

    if (!credentialTableBody) {
      return;
    }

    /** @type {!Array<!Protocol.WebAuthn.Credential>} */
    const credentials = await this._model.getCredentials(authenticatorId);
    credentialTableBody.innerHTML = '';
    credentials.forEach(
        credential =>
            this._insertCredentialRow(authenticatorId, /** @type {!Element} */ (credentialTableBody), credential));

    // TODO(crbug.com/1112528): Add back-end events for credential creation and removal to avoid polling.
    setTimeout(this._updateCredentialTable.bind(this, authenticatorId), TIMEOUT);
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   * @param {!Element} credentialTableBody
   * @param {!Protocol.WebAuthn.Credential} credential
   */
  _insertCredentialRow(authenticatorId, credentialTableBody, credential) {
    const row = credentialTableBody.createChild('tr');
    row.setAttribute('data-credential-id', credential.credentialId);

    const idRow = row.createChild('td');
    idRow.innerHTML = credential.credentialId;
    idRow.title = credential.credentialId;

    const isResidentCheckbox = row.createChild('td').createChild('input');
    isResidentCheckbox.setAttribute('type', 'checkbox');
    isResidentCheckbox.checked = credential.isResidentCredential;
    isResidentCheckbox.disabled = true;

    row.createChild('td').textContent = credential.rpId || ls`<unknown RP ID>`;
    row.createChild('td').textContent = credential.userHandle || ls`<no user handle>`;
    row.createChild('td').textContent = credential.signCount.toString();

    const exportCell = row.createChild('td');
    const exportCredentialButton = exportCell.createChild('button', 'text-button');
    exportCredentialButton.textContent = ls`Export`;
    exportCredentialButton.addEventListener('click', this._exportCredential.bind(this, credential));

    const removeCell = row.createChild('td');
    const removeCredentialButton = removeCell.createChild('button', 'text-button');
    removeCredentialButton.textContent = ls`Remove`;
    removeCredentialButton.addEventListener(
        'click', this._removeCredential.bind(this, authenticatorId, credential.credentialId));
  }

  /**
   * @param {!Protocol.WebAuthn.Credential} credential
   */
  _exportCredential(credential) {
    const pem = '-----BEGIN PRIVATE KEY-----\n' + credential.privateKey + '\n-----END PRIVATE KEY-----';

    const link = document.createElement('a');
    link.download = ls`Private key.pem`;
    link.href = 'data:application/x-pem-file;charset=utf-8,' + encodeURIComponent(pem);
    link.click();
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   * @param {string} credentialId
   */
  async _removeCredential(authenticatorId, credentialId) {
    this._authenticatorsView.querySelector(`[data-credential-id=${CSS.escape(credentialId)}]`).remove();
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
    this._model.removeAuthenticator(authenticatorId);
    if (this._activeAuthId === authenticatorId) {
      this._activeAuthId = null;
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
    this._updateActiveButtons();
  }

  _updateActiveButtons() {
    const authenticators = this._authenticatorsView.getElementsByClassName('authenticator-section');
    Array.from(authenticators).forEach(authenticator => {
      authenticator.querySelector('input.dt-radio-button').checked =
          authenticator.getAttribute('data-authenticator-id') === this._activeAuthId;
    });
  }

  async _clearActiveAuthenticator() {
    if (this._activeAuthId) {
      await this._model.setAutomaticPresenceSimulation(this._activeAuthId, false);
    }
    this._activeAuthId = null;
  }
}
