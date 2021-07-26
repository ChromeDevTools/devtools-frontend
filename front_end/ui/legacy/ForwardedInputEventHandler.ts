// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';

import {Context} from './Context.js';
import {KeyboardShortcut} from './KeyboardShortcut.js';
import {ForwardedShortcut, ShortcutRegistry} from './ShortcutRegistry.js';

export class ForwardedInputEventHandler {
  constructor() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.KeyEventUnhandled, this._onKeyEventUnhandled, this);
  }

  _onKeyEventUnhandled(event: Common.EventTarget.EventTargetEvent): void {
    const data = event.data;
    const type = (data.type as string);
    const key = (data.key as string);
    const keyCode = (data.keyCode as number);
    const modifiers = (data.modifiers as number);

    if (type !== 'keydown') {
      return;
    }

    const context = Context.instance();
    const shortcutRegistry = ShortcutRegistry.instance();

    context.setFlavor(ForwardedShortcut, ForwardedShortcut.instance);
    shortcutRegistry.handleKey(KeyboardShortcut.makeKey(keyCode, modifiers), key);
    context.setFlavor(ForwardedShortcut, null);
  }
}

new ForwardedInputEventHandler();
