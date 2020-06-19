// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.WebAuthnModel.WebAuthnModel>}
 * @unrestricted
 */
export class WebauthnPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('webauthn/webauthnPane.css');
    this._enabled = false;

    const topToolbarContainer = this.contentElement.createChild('div', 'webauthn-toolbar-container');
    const topToolbar = new UI.Toolbar.Toolbar('webauthn-toolbar', topToolbarContainer);
    const enableCheckboxTitle = Common.UIString.UIString('Enable Virtual Authenticator Environment');
    this._enableCheckbox =
        new UI.Toolbar.ToolbarCheckbox(enableCheckboxTitle, enableCheckboxTitle, this.handleCheckboxToggle.bind(this));
    topToolbar.appendToolbarItem(this._enableCheckbox);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (mainTarget) {
      this._model = mainTarget.model(SDK.WebAuthnModel.WebAuthnModel);
    }
  }

  /**
   * @override
   */
  ownerViewDisposed() {
    this._enableCheckbox.setChecked(false);
    this._setVirtualAuthEnvEnabled(false);
  }

  /**
   * @override
   * @param {!SDK.WebAuthnModel.WebAuthnModel} webAuthnModel
   */
  modelAdded(webAuthnModel) {
  }

  /**
   * @override
   * @param {!SDK.WebAuthnModel.WebAuthnModel} webAuthnModel
   */
  modelRemoved(webAuthnModel) {
  }

  /**
   * @param {boolean} enable
   */
  _setVirtualAuthEnvEnabled(enable) {
    this._enabled = enable;
    this._model.setVirtualAuthEnvEnabled(enable);
  }

  handleCheckboxToggle() {
    this._setVirtualAuthEnvEnabled(!this._enabled);
  }
}
