// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../host/host.js';

import {KeyboardShortcut} from './KeyboardShortcut.js';
import {ForwardedShortcut} from './ShortcutRegistry.js';

/**
 * @unrestricted
 */
export class ForwardedInputEventHandler {
  constructor() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.KeyEventUnhandled, this._onKeyEventUnhandled, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onKeyEventUnhandled(event) {
    const data = event.data;
    const type = /** @type {string} */ (data.type);
    const key = /** @type {string} */ (data.key);
    const keyCode = /** @type {number} */ (data.keyCode);
    const modifiers = /** @type {number} */ (data.modifiers);

    if (type !== 'keydown') {
      return;
    }

    self.UI.context.setFlavor(ForwardedShortcut, ForwardedShortcut.instance);
    self.UI.shortcutRegistry.handleKey(KeyboardShortcut.makeKey(keyCode, modifiers), key);
    self.UI.context.setFlavor(ForwardedShortcut, null);
  }
}

new ForwardedInputEventHandler();
