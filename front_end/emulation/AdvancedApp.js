// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {WebInspector.App}
 * @unrestricted
 */
WebInspector.AdvancedApp = class {
  constructor() {
    WebInspector.dockController.addEventListener(
        WebInspector.DockController.Events.BeforeDockSideChanged, this._openToolboxWindow, this);
  }

  /**
   * @return {!WebInspector.AdvancedApp}
   */
  static _instance() {
    if (!WebInspector.AdvancedApp._appInstance)
      WebInspector.AdvancedApp._appInstance = new WebInspector.AdvancedApp();
    return WebInspector.AdvancedApp._appInstance;
  }

  /**
   * @override
   * @param {!Document} document
   */
  presentUI(document) {
    var rootView = new WebInspector.RootView();

    this._rootSplitWidget = new WebInspector.SplitWidget(false, true, 'InspectorView.splitViewState', 555, 300, true);
    this._rootSplitWidget.show(rootView.element);

    this._rootSplitWidget.setSidebarWidget(WebInspector.inspectorView);
    WebInspector.inspectorView.setOwnerSplit(this._rootSplitWidget);

    this._inspectedPagePlaceholder = new WebInspector.InspectedPagePlaceholder();
    this._inspectedPagePlaceholder.addEventListener(
        WebInspector.InspectedPagePlaceholder.Events.Update, this._onSetInspectedPageBounds.bind(this), this);
    this._deviceModeView = new WebInspector.DeviceModeWrapper(this._inspectedPagePlaceholder);

    WebInspector.dockController.addEventListener(
        WebInspector.DockController.Events.BeforeDockSideChanged, this._onBeforeDockSideChange, this);
    WebInspector.dockController.addEventListener(
        WebInspector.DockController.Events.DockSideChanged, this._onDockSideChange, this);
    WebInspector.dockController.addEventListener(
        WebInspector.DockController.Events.AfterDockSideChanged, this._onAfterDockSideChange, this);
    this._onDockSideChange();

    console.timeStamp('AdvancedApp.attachToBody');
    rootView.attachToDocument(document);
    this._inspectedPagePlaceholder.update();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _openToolboxWindow(event) {
    if (/** @type {string} */ (event.data.to) !== WebInspector.DockController.State.Undocked)
      return;

    if (this._toolboxWindow)
      return;

    var url = window.location.href.replace('inspector.html', 'toolbox.html');
    this._toolboxWindow = window.open(url, undefined);
  }

  /**
   * @param {!Document} toolboxDocument
   */
  toolboxLoaded(toolboxDocument) {
    WebInspector.initializeUIUtils(toolboxDocument, WebInspector.settings.createSetting('uiTheme', 'default'));
    WebInspector.installComponentRootStyles(/** @type {!Element} */ (toolboxDocument.body));
    WebInspector.ContextMenu.installHandler(toolboxDocument);
    WebInspector.Tooltip.installHandler(toolboxDocument);

    this._toolboxRootView = new WebInspector.RootView();
    this._toolboxRootView.attachToDocument(toolboxDocument);

    this._updateDeviceModeView();
  }

  _updateDeviceModeView() {
    if (this._isDocked())
      this._rootSplitWidget.setMainWidget(this._deviceModeView);
    else if (this._toolboxRootView)
      this._deviceModeView.show(this._toolboxRootView.element);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onBeforeDockSideChange(event) {
    if (/** @type {string} */ (event.data.to) === WebInspector.DockController.State.Undocked && this._toolboxRootView) {
      // Hide inspectorView and force layout to mimic the undocked state.
      this._rootSplitWidget.hideSidebar();
      this._inspectedPagePlaceholder.update();
    }

    this._changingDockSide = true;
  }

  /**
   * @param {!WebInspector.Event=} event
   */
  _onDockSideChange(event) {
    this._updateDeviceModeView();

    var toDockSide = event ? /** @type {string} */ (event.data.to) : WebInspector.dockController.dockSide();
    if (toDockSide === WebInspector.DockController.State.Undocked) {
      this._updateForUndocked();
    } else if (
        this._toolboxRootView && event &&
        /** @type {string} */ (event.data.from) === WebInspector.DockController.State.Undocked) {
      // Don't update yet for smooth transition.
      this._rootSplitWidget.hideSidebar();
    } else {
      this._updateForDocked(toDockSide);
    }
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onAfterDockSideChange(event) {
    // We may get here on the first dock side change while loading without BeforeDockSideChange.
    if (!this._changingDockSide)
      return;
    if (/** @type {string} */ (event.data.from) === WebInspector.DockController.State.Undocked) {
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
    this._rootSplitWidget.setVertical(dockSide === WebInspector.DockController.State.DockedToRight);
    this._rootSplitWidget.setSecondIsSidebar(
        dockSide === WebInspector.DockController.State.DockedToRight ||
        dockSide === WebInspector.DockController.State.DockedToBottom);
    this._rootSplitWidget.toggleResizer(this._rootSplitWidget.resizerElement(), true);
    this._rootSplitWidget.toggleResizer(
        WebInspector.inspectorView.topResizerElement(), dockSide === WebInspector.DockController.State.DockedToBottom);
    this._rootSplitWidget.showBoth();
  }

  _updateForUndocked() {
    this._rootSplitWidget.toggleResizer(this._rootSplitWidget.resizerElement(), false);
    this._rootSplitWidget.toggleResizer(WebInspector.inspectorView.topResizerElement(), false);
    this._rootSplitWidget.hideMain();
  }

  _isDocked() {
    return WebInspector.dockController.dockSide() !== WebInspector.DockController.State.Undocked;
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onSetInspectedPageBounds(event) {
    if (this._changingDockSide)
      return;
    var window = this._inspectedPagePlaceholder.element.window();
    if (!window.innerWidth || !window.innerHeight)
      return;
    if (!this._inspectedPagePlaceholder.isShowing())
      return;
    var bounds = /** @type {{x: number, y: number, width: number, height: number}} */ (event.data);
    console.timeStamp('AdvancedApp.setInspectedPageBounds');
    InspectorFrontendHost.setInspectedPageBounds(bounds);
  }
};

/** @type {!WebInspector.AdvancedApp} */
WebInspector.AdvancedApp._appInstance;


/**
 * @implements {WebInspector.AppProvider}
 * @unrestricted
 */
WebInspector.AdvancedAppProvider = class {
  /**
   * @override
   * @return {!WebInspector.App}
   */
  createApp() {
    return WebInspector.AdvancedApp._instance();
  }
};
