// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {VBox} from './Widget.js';

export const UIStrings = {
  /**
  *@description Text in dialog box when the target page crashed
  */
  devtoolsWasDisconnectedFromThe: 'DevTools was disconnected from the page.',
  /**
  *@description Text content of content element
  */
  oncePageIsReloadedDevtoolsWill: 'Once page is reloaded, DevTools will automatically reconnect.',
};
const str_ = i18n.i18n.registerUIStrings('ui/TargetCrashedScreen.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TargetCrashedScreen extends VBox {
  /**
   * @param {function():*} hideCallback
   */
  constructor(hideCallback) {
    super(true);
    this.registerRequiredCSS('ui/targetCrashedScreen.css', {enableLegacyPatching: false});
    this.contentElement.createChild('div', 'message').textContent =
        i18nString(UIStrings.devtoolsWasDisconnectedFromThe);
    this.contentElement.createChild('div', 'message').textContent =
        i18nString(UIStrings.oncePageIsReloadedDevtoolsWill);
    this._hideCallback = hideCallback;
  }

  /**
   * @override
   */
  willHide() {
    this._hideCallback.call(null);
  }
}
