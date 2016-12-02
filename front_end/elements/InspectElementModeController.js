/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Elements.InspectElementModeController = class {
  constructor() {
    this._toggleSearchAction = UI.actionRegistry.action('elements.toggle-element-search');
    this._mode = Protocol.DOM.InspectMode.None;
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged, this._suspendStateChanged, this);
    SDK.targetManager.observeTargets(this, SDK.Target.Capability.DOM);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    // When DevTools are opening in the inspect element mode, the first target comes in
    // much later than the InspectorFrontendAPI.enterInspectElementMode event.
    if (this._mode === Protocol.DOM.InspectMode.None)
      return;
    var domModel = SDK.DOMModel.fromTarget(target);
    domModel.setInspectMode(this._mode);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
  }

  /**
   * @return {boolean}
   */
  isInInspectElementMode() {
    return this._mode === Protocol.DOM.InspectMode.SearchForNode ||
        this._mode === Protocol.DOM.InspectMode.SearchForUAShadowDOM;
  }

  stopInspection() {
    if (this._mode && this._mode !== Protocol.DOM.InspectMode.None)
      this._toggleInspectMode();
  }

  _toggleInspectMode() {
    if (SDK.targetManager.allTargetsSuspended())
      return;

    var mode;
    if (this.isInInspectElementMode()) {
      mode = Protocol.DOM.InspectMode.None;
    } else {
      mode = Common.moduleSetting('showUAShadowDOM').get() ? Protocol.DOM.InspectMode.SearchForUAShadowDOM :
                                                             Protocol.DOM.InspectMode.SearchForNode;
    }

    this._setMode(mode);
  }

  /**
   * @param {!Protocol.DOM.InspectMode} mode
   */
  _setMode(mode) {
    this._mode = mode;
    for (var domModel of SDK.DOMModel.instances())
      domModel.setInspectMode(mode);
    this._toggleSearchAction.setToggled(this.isInInspectElementMode());
  }

  _suspendStateChanged() {
    if (!SDK.targetManager.allTargetsSuspended())
      return;

    this._mode = Protocol.DOM.InspectMode.None;
    this._toggleSearchAction.setToggled(false);
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Elements.InspectElementModeController.ToggleSearchActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (!Elements.inspectElementModeController)
      return false;
    Elements.inspectElementModeController._toggleInspectMode();
    return true;
  }
};

/** @type {?Elements.InspectElementModeController} */
Elements.inspectElementModeController =
    Runtime.queryParam('isSharedWorker') ? null : new Elements.InspectElementModeController();
