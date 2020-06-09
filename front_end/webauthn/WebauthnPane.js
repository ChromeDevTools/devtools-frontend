// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

export class WebauthnPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('webauthn/webauthnPane.css');

    const topToolbar = new UI.Toolbar.Toolbar('webauthn-toolbar', this.contentElement);
    this._virtualAuthEnvEnabledSetting =
        Common.Settings.Settings.instance().createSetting('virtualAuthEnvEnabled', false);
    this._virtualAuthEnvEnabledSetting.addChangeListener(() => this._toggleVirtualAuthEnv());
    const enableCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this._virtualAuthEnvEnabledSetting, Common.UIString.UIString('Enable Virtual Authenticator Environment'),
        Common.UIString.UIString('Enable Virtual Authenticator Environment'));
    topToolbar.appendToolbarItem(enableCheckbox);
  }

  _toggleVirtualAuthEnv() {
    // TODO(crbug.com/1034663): toggle the virtual authenticator environment
  }
}
