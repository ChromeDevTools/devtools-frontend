// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {WebInspector.App}
 * @implements {WebInspector.TargetManager.Observer}
 * @unrestricted
 */
WebInspector.ScreencastApp = class {
  constructor() {
    this._enabledSetting = WebInspector.settings.createSetting('screencastEnabled', true);
    this._toggleButton =
        new WebInspector.ToolbarToggle(WebInspector.UIString('Toggle screencast'), 'phone-toolbar-item');
    this._toggleButton.setToggled(this._enabledSetting.get());
    this._toggleButton.addEventListener('click', this._toggleButtonClicked, this);
    WebInspector.targetManager.observeTargets(this);
  }

  /**
   * @return {!WebInspector.ScreencastApp}
   */
  static _instance() {
    if (!WebInspector.ScreencastApp._appInstance)
      WebInspector.ScreencastApp._appInstance = new WebInspector.ScreencastApp();
    return WebInspector.ScreencastApp._appInstance;
  }

  /**
   * @override
   * @param {!Document} document
   */
  presentUI(document) {
    var rootView = new WebInspector.RootView();

    this._rootSplitWidget =
        new WebInspector.SplitWidget(false, true, 'InspectorView.screencastSplitViewState', 300, 300);
    this._rootSplitWidget.setVertical(true);
    this._rootSplitWidget.setSecondIsSidebar(true);
    this._rootSplitWidget.show(rootView.element);
    this._rootSplitWidget.hideMain();

    this._rootSplitWidget.setSidebarWidget(WebInspector.inspectorView);
    rootView.attachToDocument(document);
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded(target) {
    if (this._target)
      return;
    this._target = target;

    var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
    if (resourceTreeModel) {
      this._screencastView = new WebInspector.ScreencastView(target, resourceTreeModel);
      this._rootSplitWidget.setMainWidget(this._screencastView);
      this._screencastView.initialize();
    } else {
      this._toggleButton.setEnabled(false);
    }
    this._onScreencastEnabledChanged();
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved(target) {
    if (this._target === target) {
      delete this._target;
      if (!this._screencastView)
        return;
      this._toggleButton.setEnabled(false);
      this._screencastView.detach();
      delete this._screencastView;
      this._onScreencastEnabledChanged();
    }
  }

  _toggleButtonClicked() {
    var enabled = !this._toggleButton.toggled();
    this._enabledSetting.set(enabled);
    this._onScreencastEnabledChanged();
  }

  _onScreencastEnabledChanged() {
    if (!this._rootSplitWidget)
      return;
    var enabled = this._enabledSetting.get() && this._screencastView;
    this._toggleButton.setToggled(enabled);
    if (enabled)
      this._rootSplitWidget.showBoth();
    else
      this._rootSplitWidget.hideMain();
  }
};

/** @type {!WebInspector.ScreencastApp} */
WebInspector.ScreencastApp._appInstance;


/**
 * @implements {WebInspector.ToolbarItem.Provider}
 * @unrestricted
 */
WebInspector.ScreencastApp.ToolbarButtonProvider = class {
  /**
   * @override
   * @return {?WebInspector.ToolbarItem}
   */
  item() {
    return WebInspector.ScreencastApp._instance()._toggleButton;
  }
};

/**
 * @implements {WebInspector.AppProvider}
 * @unrestricted
 */
WebInspector.ScreencastAppProvider = class {
  /**
   * @override
   * @return {!WebInspector.App}
   */
  createApp() {
    return WebInspector.ScreencastApp._instance();
  }
};
