/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ElementsPanel} from './ElementsPanel.js';

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.OverlayModel.OverlayModel>}
 * @unrestricted
 */
export class InspectElementModeController {
  /**
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    this._toggleSearchAction = self.UI.actionRegistry.action('elements.toggle-element-search');
    this._mode = Protocol.Overlay.InspectMode.None;
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.SuspendStateChanged, this._suspendStateChanged, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.ExitedInspectMode,
        () => this._setMode(Protocol.Overlay.InspectMode.None));
    SDK.OverlayModel.OverlayModel.setInspectNodeHandler(this._inspectNode.bind(this));
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.OverlayModel.OverlayModel, this);

    this._showDetailedInspectTooltipSetting =
        Common.Settings.Settings.instance().moduleSetting('showDetailedInspectTooltip');
    this._showDetailedInspectTooltipSetting.addChangeListener(this._showDetailedInspectTooltipChanged.bind(this));

    document.addEventListener('keydown', event => {
      if (event.keyCode !== UI.KeyboardShortcut.Keys.Esc.code) {
        return;
      }
      if (!this._isInInspectElementMode()) {
        return;
      }
      this._setMode(Protocol.Overlay.InspectMode.None);
      event.consume(true);
    }, true);
  }

  /**
   * @override
   * @param {!SDK.OverlayModel.OverlayModel} overlayModel
   */
  modelAdded(overlayModel) {
    // When DevTools are opening in the inspect element mode, the first target comes in
    // much later than the InspectorFrontendAPI.enterInspectElementMode event.
    if (this._mode === Protocol.Overlay.InspectMode.None) {
      return;
    }
    overlayModel.setInspectMode(this._mode, this._showDetailedInspectTooltipSetting.get());
  }

  /**
   * @override
   * @param {!SDK.OverlayModel.OverlayModel} overlayModel
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
      mode = Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM').get() ?
          Protocol.Overlay.InspectMode.SearchForUAShadowDOM :
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
    if (SDK.SDKModel.TargetManager.instance().allTargetsSuspended()) {
      return;
    }
    this._mode = mode;
    for (const overlayModel of SDK.SDKModel.TargetManager.instance().models(SDK.OverlayModel.OverlayModel)) {
      overlayModel.setInspectMode(mode, this._showDetailedInspectTooltipSetting.get());
    }
    this._toggleSearchAction.setToggled(this._isInInspectElementMode());
  }

  _suspendStateChanged() {
    if (!SDK.SDKModel.TargetManager.instance().allTargetsSuspended()) {
      return;
    }

    this._mode = Protocol.Overlay.InspectMode.None;
    this._toggleSearchAction.setToggled(false);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   */
  async _inspectNode(node) {
    ElementsPanel.instance().revealAndSelectNode(node, true, true);
  }

  _showDetailedInspectTooltipChanged() {
    this._setMode(this._mode);
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ToggleSearchActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (!inspectElementModeController) {
      return false;
    }
    if (actionId === 'elements.toggle-element-search') {
      inspectElementModeController._toggleInspectMode();
    } else if (actionId === 'elements.capture-area-screenshot') {
      inspectElementModeController._captureScreenshotMode();
    }
    return true;
  }
}

/** @type {?InspectElementModeController} */
export const inspectElementModeController =
    Root.Runtime.queryParam('isSharedWorker') ? null : new InspectElementModeController();
