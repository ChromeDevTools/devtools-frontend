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
 * @implements {SDK.SDKModelObserver<!SDK.OverlayModel>}
 * @unrestricted
 */
Elements.InspectElementModeController = class {
  /**
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    this._toggleSearchAction = UI.actionRegistry.action('elements.toggle-element-search');
    this._mode = Protocol.Overlay.InspectMode.None;
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged, this._suspendStateChanged, this);
    SDK.targetManager.addModelListener(
        SDK.OverlayModel, SDK.OverlayModel.Events.ExitedInspectMode,
        () => this._setMode(Protocol.Overlay.InspectMode.None));
    SDK.OverlayModel.setInspectNodeHandler(this._inspectNode.bind(this));
    SDK.targetManager.observeModels(SDK.OverlayModel, this);

    this._showDetailedInspectTooltipSetting = Common.settings.moduleSetting('showDetailedInspectTooltip');
    this._showDetailedInspectTooltipSetting.addChangeListener(this._showDetailedInspectTooltipChanged.bind(this));

    document.addEventListener('keydown', event => {
      if (event.keyCode !== UI.KeyboardShortcut.Keys.Esc.code)
        return;
      if (!this._isInInspectElementMode())
        return;
      this._setMode(Protocol.Overlay.InspectMode.None);
      event.consume(true);
    }, true);
  }

  /**
   * @override
   * @param {!SDK.OverlayModel} overlayModel
   */
  modelAdded(overlayModel) {
    // When DevTools are opening in the inspect element mode, the first target comes in
    // much later than the InspectorFrontendAPI.enterInspectElementMode event.
    if (this._mode === Protocol.Overlay.InspectMode.None)
      return;
    overlayModel.setInspectMode(this._mode, this._showDetailedInspectTooltipSetting.get());
  }

  /**
   * @override
   * @param {!SDK.OverlayModel} overlayModel
   */
  modelRemoved(overlayModel) {
  }

  /**
   * @return {boolean}
   */
  _isInInspectElementMode() {
    return this._mode !== Protocol.Overlay.InspectMode.None;
  }

  _toggleInspectMode() {
    let mode;
    if (this._isInInspectElementMode()) {
      mode = Protocol.Overlay.InspectMode.None;
    } else {
      mode = Common.moduleSetting('showUAShadowDOM').get() ? Protocol.Overlay.InspectMode.SearchForUAShadowDOM :
                                                             Protocol.Overlay.InspectMode.SearchForNode;
    }
    this._setMode(mode);
  }

  _captureScreenshotMode() {
    this._setMode(Protocol.Overlay.InspectMode.CaptureAreaScreenshot);
  }

  /**
   * @param {!Protocol.Overlay.InspectMode} mode
   */
  _setMode(mode) {
    if (SDK.targetManager.allTargetsSuspended())
      return;
    this._mode = mode;
    for (const overlayModel of SDK.targetManager.models(SDK.OverlayModel))
      overlayModel.setInspectMode(mode, this._showDetailedInspectTooltipSetting.get());
    this._toggleSearchAction.setToggled(this._isInInspectElementMode());
  }

  _suspendStateChanged() {
    if (!SDK.targetManager.allTargetsSuspended())
      return;

    this._mode = Protocol.Overlay.InspectMode.None;
    this._toggleSearchAction.setToggled(false);
  }

  /**
   * @param {!SDK.DOMNode} node
   */
  async _inspectNode(node) {
    Elements.ElementsPanel.instance().revealAndSelectNode(node, true, true);
  }

  _showDetailedInspectTooltipChanged() {
    this._setMode(this._mode);
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
    if (actionId === 'elements.toggle-element-search')
      Elements.inspectElementModeController._toggleInspectMode();
    else if (actionId === 'elements.capture-area-screenshot')
      Elements.inspectElementModeController._captureScreenshotMode();
    return true;
  }
};

/** @type {?Elements.InspectElementModeController} */
Elements.inspectElementModeController =
    Runtime.queryParam('isSharedWorker') ? null : new Elements.InspectElementModeController();
