// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {DeviceModeWrapper} from './DeviceModeWrapper.js';
import {type Bounds, Events, InspectedPagePlaceholder} from './InspectedPagePlaceholder.js';

let appInstance: AdvancedApp;

export class AdvancedApp implements Common.App.App {
  private rootSplitWidget!: UI.SplitWidget.SplitWidget;
  private deviceModeView!: DeviceModeWrapper;
  private inspectedPagePlaceholder!: InspectedPagePlaceholder;
  private toolboxWindow?: Window|null;
  private toolboxRootView?: UI.RootView.RootView;
  private changingDockSide?: boolean;
  private toolboxDocument?: Document;

  constructor() {
    UI.DockController.DockController.instance().addEventListener(
        UI.DockController.Events.BEFORE_DOCK_SIDE_CHANGED, this.openToolboxWindow, this);
  }

  /**
   * Note: it's used by toolbox.ts without real type checks.
   */
  static instance(): AdvancedApp {
    if (!appInstance) {
      appInstance = new AdvancedApp();
    }
    return appInstance;
  }

  presentUI(document: Document): void {
    const rootView = new UI.RootView.RootView();

    this.rootSplitWidget =
        new UI.SplitWidget.SplitWidget(false, true, 'inspector-view.split-view-state', 555, 300, true);
    this.rootSplitWidget.show(rootView.element);
    this.rootSplitWidget.setSidebarWidget(UI.InspectorView.InspectorView.instance());
    this.rootSplitWidget.setDefaultFocusedChild(UI.InspectorView.InspectorView.instance());
    UI.InspectorView.InspectorView.instance().setOwnerSplit(this.rootSplitWidget);

    this.inspectedPagePlaceholder = InspectedPagePlaceholder.instance();
    this.inspectedPagePlaceholder.addEventListener(Events.UPDATE, this.onSetInspectedPageBounds.bind(this), this);
    this.deviceModeView =
        DeviceModeWrapper.instance({inspectedPagePlaceholder: this.inspectedPagePlaceholder, forceNew: false});

    UI.DockController.DockController.instance().addEventListener(
        UI.DockController.Events.BEFORE_DOCK_SIDE_CHANGED, this.onBeforeDockSideChange, this);
    UI.DockController.DockController.instance().addEventListener(
        UI.DockController.Events.DOCK_SIDE_CHANGED, this.onDockSideChange, this);
    UI.DockController.DockController.instance().addEventListener(
        UI.DockController.Events.AFTER_DOCK_SIDE_CHANGED, this.onAfterDockSideChange, this);
    this.onDockSideChange();

    console.timeStamp('AdvancedApp.attachToBody');
    rootView.attachToDocument(document);
    rootView.focus();
    this.inspectedPagePlaceholder.update();
  }

  private openToolboxWindow(event: Common.EventTarget.EventTargetEvent<UI.DockController.ChangeEvent>): void {
    if (event.data.to !== UI.DockController.DockState.UNDOCKED) {
      return;
    }

    if (this.toolboxWindow) {
      return;
    }

    const url = window.location.href.replace('devtools_app.html', 'device_mode_emulation_frame.html');
    this.toolboxWindow = window.open(url, undefined);
  }

  deviceModeEmulationFrameLoaded(toolboxDocument: Document): void {
    ThemeSupport.ThemeSupport.instance().addDocumentToTheme(toolboxDocument);
    UI.UIUtils.initializeUIUtils(toolboxDocument);
    UI.UIUtils.addPlatformClass(toolboxDocument.documentElement);
    UI.UIUtils.installComponentRootStyles(toolboxDocument.body);
    UI.ContextMenu.ContextMenu.installHandler(toolboxDocument);

    this.toolboxRootView = new UI.RootView.RootView();
    this.toolboxRootView.attachToDocument(toolboxDocument);

    this.toolboxDocument = toolboxDocument;

    this.updateDeviceModeView();
  }

  private updateDeviceModeView(): void {
    if (this.isDocked()) {
      this.rootSplitWidget.setMainWidget(this.deviceModeView);
    } else if (this.toolboxRootView) {
      this.deviceModeView.show(this.toolboxRootView.element);
    }
  }

  private onBeforeDockSideChange(event: Common.EventTarget.EventTargetEvent<UI.DockController.ChangeEvent>): void {
    if (event.data.to === UI.DockController.DockState.UNDOCKED && this.toolboxRootView) {
      // Hide inspectorView and force layout to mimic the undocked state.
      this.rootSplitWidget.hideSidebar();
      this.inspectedPagePlaceholder.update();
    }

    this.changingDockSide = true;
  }

  private onDockSideChange(event?: Common.EventTarget.EventTargetEvent<UI.DockController.ChangeEvent>): void {
    this.updateDeviceModeView();

    const toDockSide = event ? event.data.to : UI.DockController.DockController.instance().dockSide();
    if (toDockSide === undefined) {
      throw new Error('Got onDockSideChange event with unexpected undefined for dockSide()');
    }
    if (toDockSide === UI.DockController.DockState.UNDOCKED) {
      this.updateForUndocked();
    } else if (this.toolboxRootView && event && event.data.from === UI.DockController.DockState.UNDOCKED) {
      // Don't update yet for smooth transition.
      this.rootSplitWidget.hideSidebar();
    } else {
      this.updateForDocked(toDockSide);
    }
  }

  private onAfterDockSideChange(event: Common.EventTarget.EventTargetEvent<UI.DockController.ChangeEvent>): void {
    // We may get here on the first dock side change while loading without BeforeDockSideChange.
    if (!this.changingDockSide) {
      return;
    }
    if (event.data.from && event.data.from === UI.DockController.DockState.UNDOCKED) {
      this.updateForDocked(event.data.to);
    }
    this.changingDockSide = false;
    this.inspectedPagePlaceholder.update();
  }

  private updateForDocked(dockSide: UI.DockController.DockState): void {
    const resizerElement = (this.rootSplitWidget.resizerElement() as HTMLElement);
    resizerElement.style.transform = dockSide === UI.DockController.DockState.RIGHT ? 'translateX(2px)' :
        dockSide === UI.DockController.DockState.LEFT                               ? 'translateX(-2px)' :
                                                                                      '';
    this.rootSplitWidget.setVertical(
        dockSide === UI.DockController.DockState.RIGHT || dockSide === UI.DockController.DockState.LEFT);
    this.rootSplitWidget.setSecondIsSidebar(
        dockSide === UI.DockController.DockState.RIGHT || dockSide === UI.DockController.DockState.BOTTOM);
    this.rootSplitWidget.toggleResizer(this.rootSplitWidget.resizerElement(), true);
    this.rootSplitWidget.toggleResizer(
        UI.InspectorView.InspectorView.instance().topResizerElement(), dockSide === UI.DockController.DockState.BOTTOM);
    this.rootSplitWidget.showBoth();
  }

  private updateForUndocked(): void {
    this.rootSplitWidget.toggleResizer(this.rootSplitWidget.resizerElement(), false);
    this.rootSplitWidget.toggleResizer(UI.InspectorView.InspectorView.instance().topResizerElement(), false);
    this.rootSplitWidget.hideMain();
  }

  private isDocked(): boolean {
    return UI.DockController.DockController.instance().dockSide() !== UI.DockController.DockState.UNDOCKED;
  }

  private onSetInspectedPageBounds(event: Common.EventTarget.EventTargetEvent<Bounds>): void {
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
// @ts-ignore Exported for Tests.js
globalThis.Emulation = globalThis.Emulation || {};
// @ts-ignore Exported for Tests.js
globalThis.Emulation.AdvancedApp = AdvancedApp;

let advancedAppProviderInstance: AdvancedAppProvider;

export class AdvancedAppProvider implements Common.AppProvider.AppProvider {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): AdvancedAppProvider {
    const {forceNew} = opts;
    if (!advancedAppProviderInstance || forceNew) {
      advancedAppProviderInstance = new AdvancedAppProvider();
    }

    return advancedAppProviderInstance;
  }

  createApp(): Common.App.App {
    return AdvancedApp.instance();
  }
}
