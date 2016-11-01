// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.ForwardedInputEventHandler = class {
  constructor() {
    InspectorFrontendHost.events.addEventListener(
        InspectorFrontendHostAPI.Events.KeyEventUnhandled, this._onKeyEventUnhandled, this);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onKeyEventUnhandled(event) {
    var data = event.data;
    var type = /** @type {string} */ (data.type);
    var key = /** @type {string} */ (data.key);
    var keyCode = /** @type {number} */ (data.keyCode);
    var modifiers = /** @type {number} */ (data.modifiers);

    if (type !== 'keydown')
      return;

    WebInspector.context.setFlavor(
        WebInspector.ShortcutRegistry.ForwardedShortcut, WebInspector.ShortcutRegistry.ForwardedShortcut.instance);
    WebInspector.shortcutRegistry.handleKey(WebInspector.KeyboardShortcut.makeKey(keyCode, modifiers), key);
    WebInspector.context.setFlavor(WebInspector.ShortcutRegistry.ForwardedShortcut, null);
  }
};

/** @type {!WebInspector.ForwardedInputEventHandler} */
WebInspector.forwardedEventHandler = new WebInspector.ForwardedInputEventHandler();
