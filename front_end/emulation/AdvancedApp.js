// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as UI from '../ui/ui.js';

import {DeviceModeWrapper} from './DeviceModeWrapper.js';
import {Events, instance} from './InspectedPagePlaceholder.js';

/** @type {!AdvancedApp} */
let _appInstance;

/**
 * @implements {Common.App.App}
 * @unrestricted
 */
export class AdvancedApp {
  constructor() {
    self.Components.dockController.addEventListener(
        Components.DockController.Events.BeforeDockSideChanged, this._openToolboxWindow, this);
  }

  /**
   * @return {!AdvancedApp}
   */
  static _instance() {
    if (!_appInstance) {
      _appInstance = new AdvancedApp();
    }
    return _appInstance;
  }

  /**
   * @override
   * @param {!Document} document
   */
  presentUI(document) {
    const rootView = new UI.RootView.RootView();

    this._rootSplitWidget = new UI.SplitWidget.SplitWidget(false, true, 'InspectorView.splitViewState', 555, 300, true);
    this._rootSplitWidget.show(rootView.element);
    this._rootSplitWidget.setSidebarWidget(self.UI.inspectorView);
    this._rootSplitWidget.setDefaultFocusedChild(self.UI.inspectorView);
    self.UI.inspectorView.setOwnerSplit(this._rootSplitWidget);

    this._inspectedPagePlaceholder = instance();
    this._inspectedPagePlaceholder.addEventListener(Events.Update, this._onSetInspectedPageBounds.bind(this), this);
    this._deviceModeView = new DeviceModeWrapper(this._inspectedPagePlaceholder);

    self.Components.dockController.addEventListener(
        Components.DockController.Events.BeforeDockSideChanged, this._onBeforeDockSideChange, this);
    self.Components.dockController.addEventListener(
        Components.DockController.Events.DockSideChanged, this._onDockSideChange, this);
    self.Components.dockController.addEventListener(
        Components.DockController.Events.AfterDockSideChanged, this._onAfterDockSideChange, this);
    this._onDockSideChange();

    console.timeStamp('AdvancedApp.attachToBody');
    rootView.attachToDocument(document);
    rootView.focus();
    this._inspectedPagePlaceholder.update();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _openToolboxWindow(event) {
    if (/** @type {string} */ (event.data.to) !== Components.DockController.State.Undocked) {
      return;
    }

    if (this._toolboxWindow) {
      return;
    }

    const url = window.location.href.replace('devtools_app.html', 'toolbox.html');
    this._toolboxWindow = window.open(url, undefined);
  }

  /**
   * @param {!Document} toolboxDocument
   */
  toolboxLoaded(toolboxDocument) {
    UI.UIUtils.initializeUIUtils(
        toolboxDocument, Common.Settings.Settings.instance().createSetting('uiTheme', 'default'));
    UI.UIUtils.installComponentRootStyles(/** @type {!Element} */ (toolboxDocument.body));
    UI.ContextMenu.ContextMenu.installHandler(toolboxDocument);
    UI.Tooltip.Tooltip.installHandler(toolboxDocument);

    this._toolboxRootView = new UI.RootView.RootView();
    this._toolboxRootView.attachToDocument(toolboxDocument);

    this._updateDeviceModeView();
  }

  _updateDeviceModeView() {
    if (this._isDocked()) {
      this._rootSplitWidget.setMainWidget(this._deviceModeView);
    } else if (this._toolboxRootView) {
      this._deviceModeView.show(this._toolboxRootView.element);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onBeforeDockSideChange(event) {
    if (/** @type {string} */ (event.data.to) === Components.DockController.State.Undocked && this._toolboxRootView) {
      // Hide inspectorView and force layout to mimic the undocked state.
      this._rootSplitWidget.hideSidebar();
      this._inspectedPagePlaceholder.update();
    }

    this._changingDockSide = true;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent=} event
   */
  _onDockSideChange(event) {
    this._updateDeviceModeView();

    const toDockSide = event ? /** @type {string} */ (event.data.to) : self.Components.dockController.dockSide();
    if (toDockSide === Components.DockController.State.Undocked) {
      this._updateForUndocked();
    } else if (
        this._toolboxRootView && event &&
        /** @type {string} */ (event.data.from) === Components.DockController.State.Undocked) {
      // Don't update yet for smooth transition.
      this._rootSplitWidget.hideSidebar();
    } else {
      this._updateForDocked(toDockSide);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onAfterDockSideChange(event) {
    // We may get here on the first dock side change while loading without BeforeDockSideChange.
    if (!this._changingDockSide) {
      return;
    }
    if (/** @type {string} */ (event.data.from) === Components.DockController.State.Undocked) {
      // Restore docked layout in case of smooth transition.
      this._updateForDocked(/** @type {string} */ (event.data.to));
    }
    this._changingDockSide = false;
    this._inspectedPagePlaceholder.update();
  }

  /**
   * @param {string} dockSide
   */
  _updateForDocked(dockSide) {
    this._rootSplitWidget.resizerElement().style.transform =
        dockSide === Components.DockController.State.DockedToRight ?
        'translateX(2px)' :
        dockSide === Components.DockController.State.DockedToLeft ? 'translateX(-2px)' : '';
    this._rootSplitWidget.setVertical(
        dockSide === Components.DockController.State.DockedToRight ||
        dockSide === Components.DockController.State.DockedToLeft);
    this._rootSplitWidget.setSecondIsSidebar(
        dockSide === Components.DockController.State.DockedToRight ||
        dockSide === Components.DockController.State.DockedToBottom);
    this._rootSplitWidget.toggleResizer(this._rootSplitWidget.resizerElement(), true);
    this._rootSplitWidget.toggleResizer(
        self.UI.inspectorView.topResizerElement(), dockSide === Components.DockController.State.DockedToBottom);
    this._rootSplitWidget.showBoth();
  }

  _updateForUndocked() {
    this._rootSplitWidget.toggleResizer(this._rootSplitWidget.resizerElement(), false);
    this._rootSplitWidget.toggleResizer(self.UI.inspectorView.topResizerElement(), false);
    this._rootSplitWidget.hideMain();
  }

  _isDocked() {
    return self.Components.dockController.dockSide() !== Components.DockController.State.Undocked;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onSetInspectedPageBounds(event) {
    if (this._changingDockSide) {
      return;
    }
    const window = this._inspectedPagePlaceholder.element.window();
    if (!window.innerWidth || !window.innerHeight) {
      return;
    }
    if (!this._inspectedPagePlaceholder.isShowing()) {
      return;
    }
    const bounds = /** @type {{x: number, y: number, width: number, height: number}} */ (event.data);
    console.timeStamp('AdvancedApp.setInspectedPageBounds');
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setInspectedPageBounds(bounds);
  }
}


/**
 * @implements {Common.AppProvider.AppProvider}
 * @unrestricted
 */
export class AdvancedAppProvider {
  /**
   * @override
   * @return {!Common.App.App}
   */
  createApp() {
    return AdvancedApp._instance();
  }
}
