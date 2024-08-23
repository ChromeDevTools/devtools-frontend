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

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ElementsPanel} from './ElementsPanel.js';

let inspectElementModeController: InspectElementModeController;

export class InspectElementModeController implements SDK.TargetManager.SDKModelObserver<SDK.OverlayModel.OverlayModel> {
  private readonly toggleSearchAction: UI.ActionRegistration.Action;
  private mode: Protocol.Overlay.InspectMode;
  private readonly showDetailedInspectTooltipSetting: Common.Settings.Setting<boolean>;

  constructor() {
    this.toggleSearchAction = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
    this.mode = Protocol.Overlay.InspectMode.None;
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, this.suspendStateChanged, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.EXITED_INSPECT_MODE,
        () => this.setMode(Protocol.Overlay.InspectMode.None), undefined, {scoped: true});
    SDK.OverlayModel.OverlayModel.setInspectNodeHandler(this.inspectNode.bind(this));
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.OverlayModel.OverlayModel, this, {scoped: true});

    this.showDetailedInspectTooltipSetting =
        Common.Settings.Settings.instance().moduleSetting('show-detailed-inspect-tooltip');
    this.showDetailedInspectTooltipSetting.addChangeListener(this.showDetailedInspectTooltipChanged.bind(this));

    document.addEventListener('keydown', event => {
      if (event.keyCode !== UI.KeyboardShortcut.Keys.Esc.code) {
        return;
      }
      if (!this.isInInspectElementMode()) {
        return;
      }
      this.setMode(Protocol.Overlay.InspectMode.None);
      event.consume(true);
      void VisualLogging.logKeyDown(null, event, 'cancel-inspect-mode');
    }, true);
  }

  static instance({forceNew}: {
    forceNew: boolean,
  } = {forceNew: false}): InspectElementModeController {
    if (!inspectElementModeController || forceNew) {
      inspectElementModeController = new InspectElementModeController();
    }

    return inspectElementModeController;
  }

  modelAdded(overlayModel: SDK.OverlayModel.OverlayModel): void {
    // When DevTools are opening in the inspect element mode, the first target comes in
    // much later than the InspectorFrontendAPI.enterInspectElementMode event.
    if (this.mode === Protocol.Overlay.InspectMode.None) {
      return;
    }
    void overlayModel.setInspectMode(this.mode, this.showDetailedInspectTooltipSetting.get());
  }

  modelRemoved(_overlayModel: SDK.OverlayModel.OverlayModel): void {
  }

  private isInInspectElementMode(): boolean {
    return this.mode !== Protocol.Overlay.InspectMode.None;
  }

  toggleInspectMode(): void {
    let mode;
    if (this.isInInspectElementMode()) {
      mode = Protocol.Overlay.InspectMode.None;
    } else {
      mode = Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom').get() ?
          Protocol.Overlay.InspectMode.SearchForUAShadowDOM :
          Protocol.Overlay.InspectMode.SearchForNode;
    }
    this.setMode(mode);
  }

  captureScreenshotMode(): void {
    this.setMode(Protocol.Overlay.InspectMode.CaptureAreaScreenshot);
  }

  private setMode(mode: Protocol.Overlay.InspectMode): void {
    if (SDK.TargetManager.TargetManager.instance().allTargetsSuspended()) {
      return;
    }
    this.mode = mode;
    for (const overlayModel of SDK.TargetManager.TargetManager.instance().models(
             SDK.OverlayModel.OverlayModel, {scoped: true})) {
      void overlayModel.setInspectMode(mode, this.showDetailedInspectTooltipSetting.get());
    }
    this.toggleSearchAction.setToggled(this.isInInspectElementMode());
  }

  private suspendStateChanged(): void {
    if (!SDK.TargetManager.TargetManager.instance().allTargetsSuspended()) {
      return;
    }

    this.mode = Protocol.Overlay.InspectMode.None;
    this.toggleSearchAction.setToggled(false);
  }

  private inspectNode(node: SDK.DOMModel.DOMNode): void {
    void ElementsPanel.instance().revealAndSelectNode(node, true, true);
  }

  private showDetailedInspectTooltipChanged(): void {
    this.setMode(this.mode);
  }
}

export class ToggleSearchActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    if (Root.Runtime.Runtime.queryParam('isSharedWorker')) {
      return false;
    }

    inspectElementModeController = InspectElementModeController.instance();
    if (!inspectElementModeController) {
      return false;
    }
    if (actionId === 'elements.toggle-element-search') {
      inspectElementModeController.toggleInspectMode();
    } else if (actionId === 'elements.capture-area-screenshot') {
      inspectElementModeController.captureScreenshotMode();
    }
    return true;
  }
}
