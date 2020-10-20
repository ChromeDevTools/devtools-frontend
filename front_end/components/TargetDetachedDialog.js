// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {ProtocolProxyApi.InspectorDispatcher}
 */
export class TargetDetachedDialog extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);
    target.registerInspectorDispatcher(this);
    target.inspectorAgent().invoke_enable();
    this._hideCrashedDialog = null;
  }

  /**
   * @override
   * @param {!Protocol.Inspector.DetachedEvent} event
   */
  detached({reason}) {
    UI.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen.show(reason);
  }

  static webSocketConnectionLost() {
    UI.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen.show(ls`WebSocket disconnected`);
  }

  /**
   * @override
   */
  targetCrashed() {
    // In case of service workers targetCrashed usually signals that the worker is stopped
    // and in any case it is restarted automatically (in which case front-end will receive
    // targetReloadedAfterCrash event).
    if (this.target().parentTarget()) {
      return;
    }
    const dialog = new UI.Dialog.Dialog();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    this._hideCrashedDialog = dialog.hide.bind(dialog);
    new UI.TargetCrashedScreen
        .TargetCrashedScreen(() => {
          this._hideCrashedDialog = null;
        })
        .show(dialog.contentElement);

    // UI.Dialog extends GlassPane and overrides the `show` method with a wider
    // accepted type. However, TypeScript uses the supertype declaration to
    // determine the full type, which requires a `!Document`.
    // @ts-ignore
    dialog.show();
  }

  /**
   * @override;
   */
  targetReloadedAfterCrash() {
    this.target().runtimeAgent().invoke_runIfWaitingForDebugger();
    if (this._hideCrashedDialog) {
      this._hideCrashedDialog.call(null);
      this._hideCrashedDialog = null;
    }
  }
}

SDK.SDKModel.SDKModel.register(TargetDetachedDialog, SDK.SDKModel.Capability.Inspector, true);
