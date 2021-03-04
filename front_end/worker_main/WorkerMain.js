// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as i18n from '../i18n/i18n.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as SDK from '../sdk/sdk.js';

const UIStrings = {
  /**
  *@description Text that refers to the main target.
  */
  main: 'Main',
};

const str_ = i18n.i18n.registerUIStrings('worker_main/WorkerMain.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/** @type {!WorkerMainImpl} */
let workerMainImplInstance;

/**
 * @implements {Common.Runnable.Runnable}
 */
export class WorkerMainImpl extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!workerMainImplInstance || forceNew) {
      workerMainImplInstance = new WorkerMainImpl();
    }

    return workerMainImplInstance;
  }

  /**
   * @override
   */
  async run() {
    SDK.Connections.initMainConnection(async () => {
      SDK.SDKModel.TargetManager.instance().createTarget(
          'main', i18nString(UIStrings.main), SDK.SDKModel.Type.ServiceWorker, null);
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);
    new MobileThrottling.NetworkPanelIndicator.NetworkPanelIndicator();
  }
}

Common.Runnable.registerEarlyInitializationRunnable(WorkerMainImpl.instance);

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
