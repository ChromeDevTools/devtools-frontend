// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {Protocol.InspectorDispatcher}
 */
export class TargetDetachedDialog extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);
    if (target.parentTarget()) {
      return;
    }
    target.registerInspectorDispatcher(this);
    target.inspectorAgent().enable();
    this._hideCrashedDialog = null;
    TargetDetachedDialog._disconnectedScreenWithReasonWasShown = false;
  }

  /**
   * @override
   * @param {string} reason
   */
  detached(reason) {
    TargetDetachedDialog._disconnectedScreenWithReasonWasShown = true;
    UI.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen.show(reason);
  }

  static webSocketConnectionLost() {
    UI.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen.show(ls`WebSocket disconnected`);
  }

  /**
   * @override
   */
  targetCrashed() {
    const dialog = new UI.Dialog.Dialog();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    this._hideCrashedDialog = dialog.hide.bind(dialog);
    new UI.TargetCrashedScreen.TargetCrashedScreen(() => this._hideCrashedDialog = null).show(dialog.contentElement);
    dialog.show();
  }

  /**
   * @override;
   */
  targetReloadedAfterCrash() {
    this.target().runtimeAgent().runIfWaitingForDebugger();
    if (this._hideCrashedDialog) {
      this._hideCrashedDialog.call(null);
      this._hideCrashedDialog = null;
    }
  }
}

SDK.SDKModel.SDKModel.register(TargetDetachedDialog, SDK.SDKModel.Capability.Inspector, true);
