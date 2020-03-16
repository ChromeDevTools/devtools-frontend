// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {Common.Runnable.Runnable}
 */
export class InspectorMainImpl extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @override
   */
  async run() {
    let firstCall = true;
    await SDK.Connections.initMainConnection(async () => {
      const type = Root.Runtime.queryParam('v8only') ? SDK.SDKModel.Type.Node : SDK.SDKModel.Type.Frame;
      const waitForDebuggerInPage = type === SDK.SDKModel.Type.Frame && Root.Runtime.queryParam('panel') === 'sources';
      const target = SDK.SDKModel.TargetManager.instance().createTarget(
          'main', Common.UIString.UIString('Main'), type, null, undefined, waitForDebuggerInPage);

      // Only resume target during the first connection,
      // subsequent connections are due to connection hand-over,
      // there is no need to pause in debugger.
      if (!firstCall) {
        return;
      }
      firstCall = false;

      if (waitForDebuggerInPage) {
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        if (!debuggerModel.isReadyToPause()) {
          await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
        }
        debuggerModel.pause();
      }

      target.runtimeAgent().runIfWaitingForDebugger();
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);

    new SourcesPanelIndicator();
    new BackendSettingsSync();
    new MobileThrottling.NetworkPanelIndicator.NetworkPanelIndicator();

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.ReloadInspectedPage, event => {
          const hard = /** @type {boolean} */ (event.data);
          SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(hard);
        });
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ReloadActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'inspector_main.reload':
        SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(false);
        return true;
      case 'inspector_main.hard-reload':
        SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(true);
        return true;
    }
    return false;
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class FocusDebuggeeActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    SDK.SDKModel.TargetManager.instance().mainTarget().pageAgent().bringToFront();
    return true;
  }
}

/**
 * @implements {UI.Toolbar.Provider}
 */
export class NodeIndicator {
  constructor() {
    const element = createElement('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(element, 'inspector_main/nodeIcon.css');
    this._element = shadowRoot.createChild('div', 'node-icon');
    element.addEventListener(
        'click', () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.openNodeFrontend(), false);
    this._button = new UI.Toolbar.ToolbarItem(element);
    this._button.setTitle(Common.UIString.UIString('Open dedicated DevTools for Node.js'));
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.AvailableTargetsChanged,
        event => this._update(/** @type {!Array<!Protocol.Target.TargetInfo>} */ (event.data)));
    this._button.setVisible(false);
    this._update([]);
  }

  /**
   * @param {!Array<!Protocol.Target.TargetInfo>} targetInfos
   */
  _update(targetInfos) {
    const hasNode = !!targetInfos.find(target => target.type === 'node' && !target.attached);
    this._element.classList.toggle('inactive', !hasNode);
    if (hasNode) {
      this._button.setVisible(true);
    }
  }

  /**
   * @override
   * @return {?UI.Toolbar.ToolbarItem}
   */
  item() {
    return this._button;
  }
}

/**
 * @unrestricted
 */
export class SourcesPanelIndicator {
  constructor() {
    Common.Settings.Settings.instance()
        .moduleSetting('javaScriptDisabled')
        .addChangeListener(javaScriptDisabledChanged);
    javaScriptDisabledChanged();

    function javaScriptDisabledChanged() {
      let icon = null;
      const javaScriptDisabled = Common.Settings.Settings.instance().moduleSetting('javaScriptDisabled').get();
      if (javaScriptDisabled) {
        icon = UI.Icon.Icon.create('smallicon-warning');
        icon.title = Common.UIString.UIString('JavaScript is disabled');
      }
      self.UI.inspectorView.setPanelIcon('sources', icon);
    }
  }
}

/**
 * @implements {SDK.SDKModel.Observer}
 * @unrestricted
 */
export class BackendSettingsSync {
  constructor() {
    this._autoAttachSetting = Common.Settings.Settings.instance().moduleSetting('autoAttachToCreatedPages');
    this._autoAttachSetting.addChangeListener(this._updateAutoAttach, this);
    this._updateAutoAttach();

    this._adBlockEnabledSetting = Common.Settings.Settings.instance().moduleSetting('network.adBlockingEnabled');
    this._adBlockEnabledSetting.addChangeListener(this._update, this);

    this._emulatePageFocusSetting = Common.Settings.Settings.instance().moduleSetting('emulatePageFocus');
    this._emulatePageFocusSetting.addChangeListener(this._update, this);

    SDK.SDKModel.TargetManager.instance().observeTargets(this);
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   */
  _updateTarget(target) {
    if (target.type() !== SDK.SDKModel.Type.Frame || target.parentTarget()) {
      return;
    }
    target.pageAgent().setAdBlockingEnabled(this._adBlockEnabledSetting.get());
    target.emulationAgent().setFocusEmulationEnabled(this._emulatePageFocusSetting.get());
  }

  _updateAutoAttach() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setOpenNewWindowForPopups(this._autoAttachSetting.get());
  }

  _update() {
    for (const target of SDK.SDKModel.TargetManager.instance().targets()) {
      this._updateTarget(target);
    }
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   * @override
   */
  targetAdded(target) {
    this._updateTarget(target);
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   * @override
   */
  targetRemoved(target) {
  }
}

SDK.ChildTargetManager.ChildTargetManager.install();
