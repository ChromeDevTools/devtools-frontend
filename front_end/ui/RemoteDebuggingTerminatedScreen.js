// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export default class RemoteDebuggingTerminatedScreen extends UI.VBox {
  /**
   * @param {string} reason
   */
  constructor(reason) {
    super(true);
    this.registerRequiredCSS('ui/remoteDebuggingTerminatedScreen.css');
    const message = this.contentElement.createChild('div', 'message');
    const reasonElement = message.createChild('span', 'reason');
    reasonElement.textContent = reason;
    message.appendChild(UI.formatLocalized('Debugging connection was closed. Reason: %s', [reasonElement]));
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('Reconnect when ready by reopening DevTools.');
    const button = UI.createTextButton(Common.UIString('Reconnect DevTools'), () => window.location.reload());
    this.contentElement.createChild('div', 'button').appendChild(button);
  }

  /**
   * @param {string} reason
   */
  static show(reason) {
    const dialog = new UI.Dialog();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    new RemoteDebuggingTerminatedScreen(reason).show(dialog.contentElement);
    dialog.show();
  }
}

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @constructor */
UI.RemoteDebuggingTerminatedScreen = RemoteDebuggingTerminatedScreen;
