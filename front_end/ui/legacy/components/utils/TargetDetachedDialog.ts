// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as UI from '../../legacy.js';

const UIStrings = {
  /**
   *@description Text on the remote debugging window to indicate the connection is lost
   */
  websocketDisconnected: 'WebSocket disconnected',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/utils/TargetDetachedDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TargetDetachedDialog extends SDK.SDKModel.SDKModel<void> implements ProtocolProxyApi.InspectorDispatcher {
  private static hideCrashedDialog: (() => void)|null;
  constructor(target: SDK.Target.Target) {
    super(target);
    target.registerInspectorDispatcher(this);
    void target.inspectorAgent().invoke_enable();
    // Hide all dialogs if a new top-level target is created.
    if (target.parentTarget()?.type() === SDK.Target.Type.Browser && TargetDetachedDialog.hideCrashedDialog) {
      TargetDetachedDialog.hideCrashedDialog.call(null);
      TargetDetachedDialog.hideCrashedDialog = null;
    }
  }

  detached({reason}: Protocol.Inspector.DetachedEvent): void {
    UI.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen.show(reason);
  }

  static webSocketConnectionLost(): void {
    UI.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen.show(
        i18nString(UIStrings.websocketDisconnected));
  }

  targetCrashed(): void {
    // In case of service workers targetCrashed usually signals that the worker is stopped
    // and in any case it is restarted automatically (in which case front-end will receive
    // targetReloadedAfterCrash event).
    if (TargetDetachedDialog.hideCrashedDialog) {
      return;
    }
    // Ignore child targets altogether.
    const parentTarget = this.target().parentTarget();
    if (parentTarget && parentTarget.type() !== SDK.Target.Type.Browser) {
      return;
    }
    const dialog = new UI.Dialog.Dialog('target-crashed');
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    TargetDetachedDialog.hideCrashedDialog = dialog.hide.bind(dialog);
    new UI.TargetCrashedScreen
        .TargetCrashedScreen(() => {
          TargetDetachedDialog.hideCrashedDialog = null;
        })
        .show(dialog.contentElement);

    // UI.Dialog extends GlassPane and overrides the `show` method with a wider
    // accepted type. However, TypeScript uses the supertype declaration to
    // determine the full type, which requires a `!Document`.
    // @ts-ignore
    dialog.show();
  }

  /** ;
   */
  targetReloadedAfterCrash(): void {
    void this.target().runtimeAgent().invoke_runIfWaitingForDebugger();
    if (TargetDetachedDialog.hideCrashedDialog) {
      TargetDetachedDialog.hideCrashedDialog.call(null);
      TargetDetachedDialog.hideCrashedDialog = null;
    }
  }
}

SDK.SDKModel.SDKModel.register(TargetDetachedDialog, {capabilities: SDK.Target.Capability.Inspector, autostart: true});
