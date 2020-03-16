// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ScreencastView} from './ScreencastView.js';

/** @type {!ScreencastApp} */
let _appInstance;

/**
 * @implements {Common.App.App}
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.ScreenCaptureModel.ScreenCaptureModel>}
 * @unrestricted
 */
export class ScreencastApp {
  constructor() {
    this._enabledSetting = Common.Settings.Settings.instance().createSetting('screencastEnabled', true);
    this._toggleButton = new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Toggle screencast'), 'largeicon-phone');
    this._toggleButton.setToggled(this._enabledSetting.get());
    this._toggleButton.setEnabled(false);
    this._toggleButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._toggleButtonClicked, this);
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.ScreenCaptureModel.ScreenCaptureModel, this);
  }

  /**
   * @return {!ScreencastApp}
   */
  static _instance() {
    if (!_appInstance) {
      _appInstance = new ScreencastApp();
    }
    return _appInstance;
  }

  /**
   * @override
   * @param {!Document} document
   */
  presentUI(document) {
    const rootView = new UI.RootView.RootView();

    this._rootSplitWidget =
        new UI.SplitWidget.SplitWidget(false, true, 'InspectorView.screencastSplitViewState', 300, 300);
    this._rootSplitWidget.setVertical(true);
    this._rootSplitWidget.setSecondIsSidebar(true);
    this._rootSplitWidget.show(rootView.element);
    this._rootSplitWidget.hideMain();

    this._rootSplitWidget.setSidebarWidget(self.UI.inspectorView);
    self.UI.inspectorView.setOwnerSplit(this._rootSplitWidget);
    rootView.attachToDocument(document);
    rootView.focus();
  }

  /**
   * @override
   * @param {!SDK.ScreenCaptureModel.ScreenCaptureModel} screenCaptureModel
   */
  modelAdded(screenCaptureModel) {
    if (this._screenCaptureModel) {
      return;
    }
    this._screenCaptureModel = screenCaptureModel;
    this._toggleButton.setEnabled(true);
    this._screencastView = new ScreencastView(screenCaptureModel);
    this._rootSplitWidget.setMainWidget(this._screencastView);
    this._screencastView.initialize();
    this._onScreencastEnabledChanged();
  }

  /**
   * @override
   * @param {!SDK.ScreenCaptureModel.ScreenCaptureModel} screenCaptureModel
   */
  modelRemoved(screenCaptureModel) {
    if (this._screenCaptureModel !== screenCaptureModel) {
      return;
    }
    delete this._screenCaptureModel;
    this._toggleButton.setEnabled(false);
    this._screencastView.detach();
    delete this._screencastView;
    this._onScreencastEnabledChanged();
  }

  _toggleButtonClicked() {
    const enabled = !this._toggleButton.toggled();
    this._enabledSetting.set(enabled);
    this._onScreencastEnabledChanged();
  }

  _onScreencastEnabledChanged() {
    if (!this._rootSplitWidget) {
      return;
    }
    const enabled = this._enabledSetting.get() && this._screencastView;
    this._toggleButton.setToggled(enabled);
    if (enabled) {
      this._rootSplitWidget.showBoth();
    } else {
      this._rootSplitWidget.hideMain();
    }
  }
}

/**
 * @implements {UI.Toolbar.Provider}
 * @unrestricted
 */
export class ToolbarButtonProvider {
  /**
   * @override
   * @return {?UI.Toolbar.ToolbarItem}
   */
  item() {
    return ScreencastApp._instance()._toggleButton;
  }
}

/**
 * @implements {Common.AppProvider.AppProvider}
 * @unrestricted
 */
export class ScreencastAppProvider {
  /**
   * @override
   * @return {!Common.App.App}
   */
  createApp() {
    return ScreencastApp._instance();
  }
}
