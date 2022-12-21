// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ScreencastView} from './ScreencastView.js';

const UIStrings = {
  /**
   *@description Tooltip text that appears when hovering over largeicon phone button in Screencast App of the Remote Devices tab when toggling screencast
   */
  toggleScreencast: 'Toggle screencast',
};
const str_ = i18n.i18n.registerUIStrings('panels/screencast/ScreencastApp.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let appInstance: ScreencastApp;

export class ScreencastApp implements Common.App.App,
                                      SDK.TargetManager.SDKModelObserver<SDK.ScreenCaptureModel.ScreenCaptureModel> {
  private readonly enabledSetting: Common.Settings.Setting<boolean>;
  toggleButton: UI.Toolbar.ToolbarToggle;
  private rootSplitWidget?: UI.SplitWidget.SplitWidget;
  private screenCaptureModel?: SDK.ScreenCaptureModel.ScreenCaptureModel;
  private screencastView?: ScreencastView;
  rootView?: UI.RootView.RootView;
  constructor() {
    this.enabledSetting = Common.Settings.Settings.instance().createSetting('screencastEnabled', true);
    this.toggleButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleScreencast), 'largeicon-phone');
    this.toggleButton.setToggled(this.enabledSetting.get());
    this.toggleButton.setEnabled(false);
    this.toggleButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.toggleButtonClicked, this);
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.ScreenCaptureModel.ScreenCaptureModel, this);
  }

  static instance(): ScreencastApp {
    if (!appInstance) {
      appInstance = new ScreencastApp();
    }
    return appInstance;
  }

  presentUI(document: Document): void {
    this.rootView = new UI.RootView.RootView();

    this.rootSplitWidget =
        new UI.SplitWidget.SplitWidget(false, true, 'InspectorView.screencastSplitViewState', 300, 300);
    this.rootSplitWidget.setVertical(true);
    this.rootSplitWidget.setSecondIsSidebar(true);
    this.rootSplitWidget.show(this.rootView.element);
    this.rootSplitWidget.hideMain();

    this.rootSplitWidget.setSidebarWidget(UI.InspectorView.InspectorView.instance());
    UI.InspectorView.InspectorView.instance().setOwnerSplit(this.rootSplitWidget);
    this.rootView.attachToDocument(document);
    this.rootView.focus();
  }

  modelAdded(screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel): void {
    if (screenCaptureModel.target() !== SDK.TargetManager.TargetManager.instance().mainFrameTarget()) {
      return;
    }
    this.screenCaptureModel = screenCaptureModel;
    this.toggleButton.setEnabled(true);
    this.screencastView = new ScreencastView(screenCaptureModel);
    if (this.rootSplitWidget) {
      this.rootSplitWidget.setMainWidget(this.screencastView);
    }
    this.screencastView.initialize();
    this.onScreencastEnabledChanged();
  }

  modelRemoved(screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel): void {
    if (this.screenCaptureModel !== screenCaptureModel) {
      return;
    }
    delete this.screenCaptureModel;
    this.toggleButton.setEnabled(false);
    if (this.screencastView) {
      this.screencastView.detach();
      delete this.screencastView;
    }
    this.onScreencastEnabledChanged();
  }

  private toggleButtonClicked(): void {
    const enabled = !this.toggleButton.toggled();
    this.enabledSetting.set(enabled);
    this.onScreencastEnabledChanged();
  }

  private onScreencastEnabledChanged(): void {
    if (!this.rootSplitWidget) {
      return;
    }
    const enabled = Boolean(this.enabledSetting.get() && this.screencastView);
    this.toggleButton.setToggled(enabled);
    if (enabled) {
      this.rootSplitWidget.showBoth();
    } else {
      this.rootSplitWidget.hideMain();
    }
  }
}

let toolbarButtonProviderInstance: ToolbarButtonProvider;

export class ToolbarButtonProvider implements UI.Toolbar.Provider {
  static instance(opts: {forceNew: boolean} = {forceNew: false}): ToolbarButtonProvider {
    const {forceNew} = opts;
    if (!toolbarButtonProviderInstance || forceNew) {
      toolbarButtonProviderInstance = new ToolbarButtonProvider();
    }

    return toolbarButtonProviderInstance;
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return ScreencastApp.instance().toggleButton;
  }
}

let screencastAppProviderInstance: ScreencastAppProvider;

export class ScreencastAppProvider implements Common.AppProvider.AppProvider {
  static instance(opts: {forceNew: boolean} = {forceNew: false}): ScreencastAppProvider {
    const {forceNew} = opts;
    if (!screencastAppProviderInstance || forceNew) {
      screencastAppProviderInstance = new ScreencastAppProvider();
    }

    return screencastAppProviderInstance;
  }

  createApp(): Common.App.App {
    return ScreencastApp.instance();
  }
}
