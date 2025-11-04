// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Host from '../../core/host/host.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import { DeviceModeWrapper } from './DeviceModeWrapper.js';
import { InspectedPagePlaceholder } from './InspectedPagePlaceholder.js';
let appInstance;
export class AdvancedApp {
    rootSplitWidget;
    deviceModeView;
    inspectedPagePlaceholder;
    toolboxWindow;
    toolboxRootView;
    changingDockSide;
    constructor() {
        UI.DockController.DockController.instance().addEventListener("BeforeDockSideChanged" /* UI.DockController.Events.BEFORE_DOCK_SIDE_CHANGED */, this.openToolboxWindow, this);
    }
    /**
     * Note: it's used by toolbox.ts without real type checks.
     */
    static instance() {
        if (!appInstance) {
            appInstance = new AdvancedApp();
        }
        return appInstance;
    }
    presentUI(document) {
        const rootView = new UI.RootView.RootView();
        this.rootSplitWidget =
            new UI.SplitWidget.SplitWidget(false, true, 'inspector-view.split-view-state', 555, 300, true);
        this.rootSplitWidget.show(rootView.element);
        this.rootSplitWidget.setSidebarWidget(UI.InspectorView.InspectorView.instance());
        this.rootSplitWidget.setDefaultFocusedChild(UI.InspectorView.InspectorView.instance());
        UI.InspectorView.InspectorView.instance().setOwnerSplit(this.rootSplitWidget);
        this.inspectedPagePlaceholder = InspectedPagePlaceholder.instance();
        this.inspectedPagePlaceholder.addEventListener("Update" /* Events.UPDATE */, this.onSetInspectedPageBounds.bind(this), this);
        this.deviceModeView =
            DeviceModeWrapper.instance({ inspectedPagePlaceholder: this.inspectedPagePlaceholder, forceNew: false });
        UI.DockController.DockController.instance().addEventListener("BeforeDockSideChanged" /* UI.DockController.Events.BEFORE_DOCK_SIDE_CHANGED */, this.onBeforeDockSideChange, this);
        UI.DockController.DockController.instance().addEventListener("DockSideChanged" /* UI.DockController.Events.DOCK_SIDE_CHANGED */, this.onDockSideChange, this);
        UI.DockController.DockController.instance().addEventListener("AfterDockSideChanged" /* UI.DockController.Events.AFTER_DOCK_SIDE_CHANGED */, this.onAfterDockSideChange, this);
        this.onDockSideChange();
        console.timeStamp('AdvancedApp.attachToBody');
        rootView.attachToDocument(document);
        rootView.focus();
        this.inspectedPagePlaceholder.update();
    }
    openToolboxWindow(event) {
        if (event.data.to !== "undocked" /* UI.DockController.DockState.UNDOCKED */) {
            return;
        }
        if (this.toolboxWindow) {
            return;
        }
        const url = window.location.href.replace('devtools_app.html', 'device_mode_emulation_frame.html');
        this.toolboxWindow = window.open(url, undefined);
    }
    deviceModeEmulationFrameLoaded(toolboxDocument) {
        ThemeSupport.ThemeSupport.instance().addDocumentToTheme(toolboxDocument);
        UI.UIUtils.initializeUIUtils(toolboxDocument);
        UI.UIUtils.addPlatformClass(toolboxDocument.documentElement);
        UI.UIUtils.installComponentRootStyles(toolboxDocument.body);
        UI.ContextMenu.ContextMenu.installHandler(toolboxDocument);
        this.toolboxRootView = new UI.RootView.RootView();
        this.toolboxRootView.attachToDocument(toolboxDocument);
        this.updateDeviceModeView();
    }
    updateDeviceModeView() {
        if (this.isDocked()) {
            this.rootSplitWidget.setMainWidget(this.deviceModeView);
        }
        else if (this.toolboxRootView) {
            this.deviceModeView.show(this.toolboxRootView.element);
        }
    }
    onBeforeDockSideChange(event) {
        if (event.data.to === "undocked" /* UI.DockController.DockState.UNDOCKED */ && this.toolboxRootView) {
            // Hide inspectorView and force layout to mimic the undocked state.
            this.rootSplitWidget.hideSidebar();
            this.inspectedPagePlaceholder.update();
        }
        this.changingDockSide = true;
    }
    onDockSideChange(event) {
        this.updateDeviceModeView();
        const toDockSide = event ? event.data.to : UI.DockController.DockController.instance().dockSide();
        if (toDockSide === undefined) {
            throw new Error('Got onDockSideChange event with unexpected undefined for dockSide()');
        }
        if (toDockSide === "undocked" /* UI.DockController.DockState.UNDOCKED */) {
            this.updateForUndocked();
        }
        else if (this.toolboxRootView && event && event.data.from === "undocked" /* UI.DockController.DockState.UNDOCKED */) {
            // Don't update yet for smooth transition.
            this.rootSplitWidget.hideSidebar();
        }
        else {
            this.updateForDocked(toDockSide);
        }
    }
    onAfterDockSideChange(event) {
        // We may get here on the first dock side change while loading without BeforeDockSideChange.
        if (!this.changingDockSide) {
            return;
        }
        if (event.data.from && event.data.from === "undocked" /* UI.DockController.DockState.UNDOCKED */) {
            this.updateForDocked(event.data.to);
        }
        this.changingDockSide = false;
        this.inspectedPagePlaceholder.update();
    }
    updateForDocked(dockSide) {
        const resizerElement = this.rootSplitWidget.resizerElement();
        resizerElement.style.transform = dockSide === "right" /* UI.DockController.DockState.RIGHT */ ? 'translateX(2px)' :
            dockSide === "left" /* UI.DockController.DockState.LEFT */ ? 'translateX(-2px)' :
                '';
        this.rootSplitWidget.setVertical(dockSide === "right" /* UI.DockController.DockState.RIGHT */ || dockSide === "left" /* UI.DockController.DockState.LEFT */);
        this.rootSplitWidget.setSecondIsSidebar(dockSide === "right" /* UI.DockController.DockState.RIGHT */ || dockSide === "bottom" /* UI.DockController.DockState.BOTTOM */);
        this.rootSplitWidget.toggleResizer(this.rootSplitWidget.resizerElement(), true);
        this.rootSplitWidget.toggleResizer(UI.InspectorView.InspectorView.instance().topResizerElement(), dockSide === "bottom" /* UI.DockController.DockState.BOTTOM */);
        this.rootSplitWidget.showBoth();
    }
    updateForUndocked() {
        this.rootSplitWidget.toggleResizer(this.rootSplitWidget.resizerElement(), false);
        this.rootSplitWidget.toggleResizer(UI.InspectorView.InspectorView.instance().topResizerElement(), false);
        this.rootSplitWidget.hideMain();
    }
    isDocked() {
        return UI.DockController.DockController.instance().dockSide() !== "undocked" /* UI.DockController.DockState.UNDOCKED */;
    }
    onSetInspectedPageBounds(event) {
        if (this.changingDockSide) {
            return;
        }
        const window = this.inspectedPagePlaceholder.element.window();
        if (!window.innerWidth || !window.innerHeight) {
            return;
        }
        if (!this.inspectedPagePlaceholder.isShowing()) {
            return;
        }
        const bounds = event.data;
        console.timeStamp('AdvancedApp.setInspectedPageBounds');
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.setInspectedPageBounds(bounds);
    }
}
// Export required for usage in toolbox.ts
// @ts-expect-error Exported for Tests.js
globalThis.Emulation = globalThis.Emulation || {};
// @ts-expect-error Exported for Tests.js
globalThis.Emulation.AdvancedApp = AdvancedApp;
let advancedAppProviderInstance;
export class AdvancedAppProvider {
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!advancedAppProviderInstance || forceNew) {
            advancedAppProviderInstance = new AdvancedAppProvider();
        }
        return advancedAppProviderInstance;
    }
    createApp() {
        return AdvancedApp.instance();
    }
}
//# sourceMappingURL=AdvancedApp.js.map