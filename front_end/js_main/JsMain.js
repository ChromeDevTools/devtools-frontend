// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';

/**
 * @implements {Common.Runnable.Runnable}
 */
export class JsMainImpl extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @override
   */
  run() {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSDirectly);
    SDK.Connections.initMainConnection(() => {
      const target = self.SDK.targetManager.createTarget('main', ls`Main`, SDK.SDKModel.Type.Node, null);
      target.runtimeAgent().runIfWaitingForDebugger();
    }, () => {
      console.log("JSMain: Connection lost callback");
      Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost();
    }, () => {
      console.log("JSMain: On Open callback;")
    });
  }
}
