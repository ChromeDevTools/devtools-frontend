// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Common.Runnable}
 */
WorkerMain.WorkerMain = class extends Common.Object {
  /**
   * @override
   */
  run() {
    const capabilities = SDK.Target.Capability.Browser | SDK.Target.Capability.Log | SDK.Target.Capability.Network |
        SDK.Target.Capability.Target | SDK.Target.Capability.Inspector;
    SDK.targetManager.createTarget(
        'main', Common.UIString('Main'), capabilities, SDK.Target.Type.ServiceWorker,
        this._createMainConnection.bind(this), null);
    InspectorFrontendHost.connectionReady();
    new MobileThrottling.NetworkPanelIndicator();
  }

  /**
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createMainConnection(params) {
    return SDK.createMainConnection(params, () => Components.TargetDetachedDialog.webSocketConnectionLost());
  }
};

SDK.ChildTargetManager.install(async ({target, waitingForDebugger}) => {
  // Only pause the new worker if debugging SW - we are going through the pause on start checkbox.
  if (target.parentTarget().type() !== SDK.Target.Type.ServiceWorker || !waitingForDebugger)
    return;
  const debuggerModel = target.model(SDK.DebuggerModel);
  if (!debuggerModel)
    return;
  if (!debuggerModel.isReadyToPause())
    await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
  debuggerModel.pause();
});
