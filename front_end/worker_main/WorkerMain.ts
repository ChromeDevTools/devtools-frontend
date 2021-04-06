// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Components from '../components/components.js';
import * as Common from '../core/common/common.js';
import * as i18n from '../core/i18n/i18n.js';
import * as SDK from '../core/sdk/sdk.js';
import * as MobileThrottling from '../panels/mobile_throttling/mobile_throttling.js';

const UIStrings = {
  /**
  *@description Text that refers to the main target.
  */
  main: 'Main',
};

const str_ = i18n.i18n.registerUIStrings('worker_main/WorkerMain.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let workerMainImplInstance: WorkerMainImpl;

export class WorkerMainImpl extends Common.ObjectWrapper.ObjectWrapper implements Common.Runnable.Runnable {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): WorkerMainImpl {
    const {forceNew} = opts;
    if (!workerMainImplInstance || forceNew) {
      workerMainImplInstance = new WorkerMainImpl();
    }

    return workerMainImplInstance;
  }

  async run(): Promise<void> {
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
