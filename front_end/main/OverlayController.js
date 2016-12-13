// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Main.OverlayController = class {
  constructor() {
    Common.moduleSetting('disablePausedStateOverlay').addChangeListener(this._updateAllOverlays, this);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._updateOverlay, this);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._updateOverlay, this);
    // TODO(dgozman): we should get DebuggerResumed on navigations instead of listening to GlobalObjectCleared.
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this._updateOverlay, this);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged, this._updateAllOverlays, this);
  }

  _updateAllOverlays() {
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Browser)) {
      this._updateTargetOverlay(
          /** @type {!SDK.DebuggerModel} */ (SDK.DebuggerModel.fromTarget(target)));
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _updateOverlay(event) {
    this._updateTargetOverlay(/** @type {!SDK.DebuggerModel} */ (event.data));
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _updateTargetOverlay(debuggerModel) {
    if (!debuggerModel.target().hasBrowserCapability())
      return;
    var message = debuggerModel.isPaused() && !Common.moduleSetting('disablePausedStateOverlay').get() ?
        Common.UIString('Paused in debugger') :
        undefined;
    debuggerModel.target().pageAgent().configureOverlay(SDK.targetManager.allTargetsSuspended(), message);
  }
};
