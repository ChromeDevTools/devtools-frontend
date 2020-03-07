// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as SDK from '../sdk/sdk.js';

/**
 * @implements {Common.Runnable.Runnable}
 */
export class WorkerMainImpl extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @override
   */
  run() {
    SDK.Connections.initMainConnection(() => {
      self.SDK.targetManager.createTarget('main', ls`Main`, SDK.SDKModel.Type.ServiceWorker, null);
    }, () => {
      console.log("WorkerMain: Connection lost callback");
      Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost();
    }, ()  => {
      console.log("WorkerMain: On Open callback");
    });
    new MobileThrottling.NetworkPanelIndicator.NetworkPanelIndicator();
  }
}

SDK.ChildTargetManager.ChildTargetManager.install(async ({target, waitingForDebugger}) => {
  // Only pause the new worker if debugging SW - we are going through the pause on start checkbox.
  if (target.parentTarget() || target.type() !== SDK.SDKModel.Type.ServiceWorker || !waitingForDebugger) {
    return;
  }
  const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
  if (!debuggerModel) {
    return;
  }
  if (!debuggerModel.isReadyToPause()) {
    await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
  }
  debuggerModel.pause();
});
