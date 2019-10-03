// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export default class TargetCrashedScreen extends UI.VBox {
  /**
   * @param {function()} hideCallback
   */
  constructor(hideCallback) {
    super(true);
    this.registerRequiredCSS('ui/targetCrashedScreen.css');
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('DevTools was disconnected from the page.');
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('Once page is reloaded, DevTools will automatically reconnect.');
    this._hideCallback = hideCallback;
  }

  /**
   * @override
   */
  willHide() {
    this._hideCallback.call(null);
  }
}

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @constructor */
UI.TargetCrashedScreen = TargetCrashedScreen;
