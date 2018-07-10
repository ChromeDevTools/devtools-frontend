// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Common.Runnable}
 */
JsMain.JsMain = class extends Common.Object {
  /**
   * @override
   */
  run() {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSDirectly);
    const target = SDK.targetManager.createTarget(
        'main', Common.UIString('Main'), SDK.Target.Capability.JS, this._createMainConnection.bind(this), null, true /* isNodeJS */);
    target.runtimeAgent().runIfWaitingForDebugger();
    InspectorFrontendHost.connectionReady();
  }

  /**
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createMainConnection(params) {
    return SDK.createMainConnection(params, () => Components.TargetDetachedDialog.webSocketConnectionLost());
  }
};
