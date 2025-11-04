// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ElementsPanel } from './ElementsPanel.js';
let inspectElementModeController;
export class InspectElementModeController {
    toggleSearchAction;
    mode;
    showDetailedInspectTooltipSetting;
    constructor() {
        this.toggleSearchAction = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
        this.mode = "none" /* Protocol.Overlay.InspectMode.None */;
        SDK.TargetManager.TargetManager.instance().addEventListener("SuspendStateChanged" /* SDK.TargetManager.Events.SUSPEND_STATE_CHANGED */, this.suspendStateChanged, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel, "InspectModeExited" /* SDK.OverlayModel.Events.EXITED_INSPECT_MODE */, () => this.setMode("none" /* Protocol.Overlay.InspectMode.None */), undefined, { scoped: true });
        SDK.OverlayModel.OverlayModel.setInspectNodeHandler(this.inspectNode.bind(this));
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.OverlayModel.OverlayModel, this, { scoped: true });
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
            this.setMode("none" /* Protocol.Overlay.InspectMode.None */);
            event.consume(true);
            void VisualLogging.logKeyDown(null, event, 'cancel-inspect-mode');
        }, true);
    }
    static instance({ forceNew } = { forceNew: false }) {
        if (!inspectElementModeController || forceNew) {
            inspectElementModeController = new InspectElementModeController();
        }
        return inspectElementModeController;
    }
    modelAdded(overlayModel) {
        // When DevTools are opening in the inspect element mode, the first target comes in
        // much later than the InspectorFrontendAPI.enterInspectElementMode event.
        if (this.mode === "none" /* Protocol.Overlay.InspectMode.None */) {
            return;
        }
        void overlayModel.setInspectMode(this.mode, this.showDetailedInspectTooltipSetting.get());
    }
    modelRemoved(_overlayModel) {
    }
    isInInspectElementMode() {
        return this.mode !== "none" /* Protocol.Overlay.InspectMode.None */;
    }
    toggleInspectMode() {
        let mode;
        if (this.isInInspectElementMode()) {
            mode = "none" /* Protocol.Overlay.InspectMode.None */;
        }
        else {
            mode = Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom').get() ?
                "searchForUAShadowDOM" /* Protocol.Overlay.InspectMode.SearchForUAShadowDOM */ :
                "searchForNode" /* Protocol.Overlay.InspectMode.SearchForNode */;
        }
        this.setMode(mode);
    }
    captureScreenshotMode() {
        this.setMode("captureAreaScreenshot" /* Protocol.Overlay.InspectMode.CaptureAreaScreenshot */);
    }
    setMode(mode) {
        if (SDK.TargetManager.TargetManager.instance().allTargetsSuspended()) {
            return;
        }
        this.mode = mode;
        for (const overlayModel of SDK.TargetManager.TargetManager.instance().models(SDK.OverlayModel.OverlayModel, { scoped: true })) {
            void overlayModel.setInspectMode(mode, this.showDetailedInspectTooltipSetting.get());
        }
        this.toggleSearchAction.setToggled(this.isInInspectElementMode());
    }
    suspendStateChanged() {
        if (!SDK.TargetManager.TargetManager.instance().allTargetsSuspended()) {
            return;
        }
        this.mode = "none" /* Protocol.Overlay.InspectMode.None */;
        this.toggleSearchAction.setToggled(false);
    }
    inspectNode(node) {
        const returnToPanel = UI.Context.Context.instance().flavor(Common.ReturnToPanel.ReturnToPanelFlavor);
        UI.Context.Context.instance().setFlavor(Common.ReturnToPanel.ReturnToPanelFlavor, null);
        if (returnToPanel) {
            return ElementsPanel.instance()
                .revealAndSelectNode(node, { showPanel: false, highlightInOverlay: false })
                .then(() => {
                void UI.ViewManager.ViewManager.instance().showView(returnToPanel.viewId, false, false);
            });
        }
        return ElementsPanel.instance().revealAndSelectNode(node, { showPanel: true, focusNode: true, highlightInOverlay: false });
    }
    showDetailedInspectTooltipChanged() {
        this.setMode(this.mode);
    }
}
export class ToggleSearchActionDelegate {
    handleAction(_context, actionId) {
        if (Root.Runtime.Runtime.queryParam('isSharedWorker')) {
            return false;
        }
        inspectElementModeController = InspectElementModeController.instance();
        if (!inspectElementModeController) {
            return false;
        }
        if (actionId === 'elements.toggle-element-search') {
            inspectElementModeController.toggleInspectMode();
        }
        else if (actionId === 'elements.capture-area-screenshot') {
            inspectElementModeController.captureScreenshotMode();
        }
        return true;
    }
}
//# sourceMappingURL=InspectElementModeController.js.map