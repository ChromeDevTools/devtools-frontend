// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.OverlayController = class {
  constructor() {
    WebInspector.moduleSetting('disablePausedStateOverlay').addChangeListener(this._updateAllOverlays, this);
    WebInspector.targetManager.addModelListener(
        WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._updateOverlay, this);
    WebInspector.targetManager.addModelListener(
        WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerResumed, this._updateOverlay, this);
    // TODO(dgozman): we should get DebuggerResumed on navigations instead of listening to GlobalObjectCleared.
    WebInspector.targetManager.addModelListener(
        WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._updateOverlay, this);
    WebInspector.targetManager.addEventListener(
        WebInspector.TargetManager.Events.SuspendStateChanged, this._updateAllOverlays, this);
  }

  _updateAllOverlays() {
    for (var target of WebInspector.targetManager.targets(WebInspector.Target.Capability.Browser))
      this._updateTargetOverlay(
          /** @type {!WebInspector.DebuggerModel} */ (WebInspector.DebuggerModel.fromTarget(target)));
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _updateOverlay(event) {
    this._updateTargetOverlay(/** @type {!WebInspector.DebuggerModel} */ (event.target));
  }

  /**
   * @param {!WebInspector.DebuggerModel} debuggerModel
   */
  _updateTargetOverlay(debuggerModel) {
    if (!debuggerModel.target().hasBrowserCapability())
      return;
    var message = debuggerModel.isPaused() && !WebInspector.moduleSetting('disablePausedStateOverlay').get() ?
        WebInspector.UIString('Paused in debugger') :
        undefined;
    debuggerModel.target().pageAgent().configureOverlay(WebInspector.targetManager.allTargetsSuspended(), message);
  }
};
