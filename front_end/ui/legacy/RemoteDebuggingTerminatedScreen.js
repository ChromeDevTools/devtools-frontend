// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';

import {Dialog} from './Dialog.js';
import {SizeBehavior} from './GlassPane.js';
import {createTextButton, formatLocalized} from './UIUtils.js';
import {VBox} from './Widget.js';

const UIStrings = {
  /**
  *@description Text in a dialog box showing how to reconnect to DevTools when remote debugging has been terminated
  */
  reconnectWhenReadyByReopening: 'Reconnect when ready by reopening DevTools.',
  /**
  *@description Text on a button to reconnect Devtools when remote debugging terminated
  */
  reconnectDevtools: 'Reconnect DevTools'
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/RemoteDebuggingTerminatedScreen.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RemoteDebuggingTerminatedScreen extends VBox {
  /**
   * @param {string} reason
   */
  constructor(reason) {
    super(true);
    this.registerRequiredCSS('ui/legacy/remoteDebuggingTerminatedScreen.css', {enableLegacyPatching: true});
    const message = this.contentElement.createChild('div', 'message');
    const reasonElement = message.createChild('span', 'reason');
    reasonElement.textContent = reason;
    message.appendChild(formatLocalized('Debugging connection was closed. Reason: %s', [reasonElement]));
    this.contentElement.createChild('div', 'message').textContent = i18nString(UIStrings.reconnectWhenReadyByReopening);
    const button = createTextButton(i18nString(UIStrings.reconnectDevtools), () => window.location.reload());
    this.contentElement.createChild('div', 'button').appendChild(button);
  }

  /**
   * @param {string} reason
   */
  static show(reason) {
    const dialog = new Dialog();
    dialog.setSizeBehavior(SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    new RemoteDebuggingTerminatedScreen(reason).show(dialog.contentElement);
    dialog.show();
  }
}
