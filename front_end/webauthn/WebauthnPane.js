// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class WebauthnPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('webauthn/webauthnPane.css');
    this.contentElement.classList.add('webauthn-pane');
    this._enabled = false;

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
    // TODO (crbug.com/1034663): toggle cable as option depending on if cablev2 flag is on.
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
  _addAuthenticatorSection(authenticatorId, options) {
    const section = document.createElement('div');
    section.classList.add('authenticator-section');
    section.setAttribute('data-authenticator-id', authenticatorId);
    this._authenticatorsView.insertAdjacentElement(
        'afterbegin', section);  // JS trick to insert as first element of parent.

    const headerElement = section.createChild('div', 'authenticator-section-header');
    const titleElement = headerElement.createChild('div', 'authenticator-section-title');
    const removeButton = headerElement.createChild('button', 'remove-authenticator-button');
    removeButton.textContent = ls`Remove`;
    removeButton.addEventListener('click', this._removeAuthenticator.bind(this, authenticatorId));
    titleElement.textContent = ls`Authenticator ${authenticatorId}`;
    UI.ARIAUtils.markAsHeading(titleElement, 2);

    const sectionFields = section.createChild('div', 'authenticator-fields');
    const protocolField = sectionFields.createChild('div', 'authenticator-field');
    const transportField = sectionFields.createChild('div', 'authenticator-field');
    const srkField = sectionFields.createChild('div', 'authenticator-field');
    const suvField = sectionFields.createChild('div', 'authenticator-field');

    protocolField.appendChild(UI.UIUtils.createLabel(ls`Protocol`, 'authenticator-option-label'));
    transportField.appendChild(UI.UIUtils.createLabel(ls`Transport`, 'authenticator-option-label'));
    srkField.appendChild(UI.UIUtils.createLabel(ls`Supports resident keys`, 'authenticator-option-label'));
    suvField.appendChild(UI.UIUtils.createLabel(ls`Supports user verification`, 'authenticator-option-label'));

    protocolField.createChild('div', 'authenticator-field-value').textContent = options.protocol;
    transportField.createChild('div', 'authenticator-field-value').textContent = options.transport;
    srkField.createChild('div', 'authenticator-field-value').textContent = options.hasResidentKey ? ls`Yes` : ls`No`;
    suvField.createChild('div', 'authenticator-field-value').textContent =
        options.hasUserVerification ? ls`Yes` : ls`No`;
  }

  /**
   * Removes both the authenticator and its respective UI element
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   */
  _removeAuthenticator(authenticatorId) {
    this._authenticatorsView.querySelector(`[data-authenticator-id=${CSS.escape(authenticatorId)}]`).remove();
    this._model.removeAuthenticator(authenticatorId);
  }

  /**
   * @return {!Protocol.WebAuthn.VirtualAuthenticatorOptions}
   */
  _createOptionsFromCurrentInputs() {
    // TODO(crbug.com/1034663): Add optionality for automaticPresenceSimulation and isUserVerified params.
    return {
      protocol: this._protocolSelect.options[this._protocolSelect.selectedIndex].value,
      transport: this._transportSelect.options[this._transportSelect.selectedIndex].value,
      hasResidentKey: this._residentKeyCheckbox.checked,
      hasUserVerification: this._userVerificationCheckbox.checked,
      automaticPresenceSimulation: true,
      isUserVerified: true,
    };
  }
}
