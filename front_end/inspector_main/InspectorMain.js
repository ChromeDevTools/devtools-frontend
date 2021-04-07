// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Components from '../components/components.js';
import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as i18n from '../core/i18n/i18n.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as MobileThrottling from '../panels/mobile_throttling/mobile_throttling.js';
import * as UI from '../ui/legacy/legacy.js';

const UIStrings = {
  /**
  * @description Text that refers to the main target. The main target is the primary webpage that
  * DevTools is connected to. This text is used in various places in the UI as a label/name to inform
  * the user which target/webpage they are currently connected to, as DevTools may connect to multiple
  * targets at the same time in some scenarios.
  */
  main: 'Main',
  /**
  * @description A warning shown to the user when JavaScript is disabled on the webpage that
  * DevTools is connected to.
  */
  javascriptIsDisabled: 'JavaScript is disabled',
};
const str_ = i18n.i18n.registerUIStrings('inspector_main/InspectorMain.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** @type {!InspectorMainImpl} */
let inspectorMainImplInstance;

/**
 * @implements {Common.Runnable.Runnable}
 */
export class InspectorMainImpl extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!inspectorMainImplInstance || forceNew) {
      inspectorMainImplInstance = new InspectorMainImpl();
    }

    return inspectorMainImplInstance;
  }

  /**
   * @override
   */
  async run() {
    let firstCall = true;
    await SDK.Connections.initMainConnection(async () => {
      const type = Root.Runtime.Runtime.queryParam('v8only') ? SDK.SDKModel.Type.Node : SDK.SDKModel.Type.Frame;
      const waitForDebuggerInPage =
          type === SDK.SDKModel.Type.Frame && Root.Runtime.Runtime.queryParam('panel') === 'sources';
      const target = SDK.SDKModel.TargetManager.instance().createTarget(
          'main', i18nString(UIStrings.main), type, null, undefined, waitForDebuggerInPage);

      // Only resume target during the first connection,
      // subsequent connections are due to connection hand-over,
      // there is no need to pause in debugger.
      if (!firstCall) {
        return;
      }
      firstCall = false;

      if (waitForDebuggerInPage) {
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        if (debuggerModel) {
          if (!debuggerModel.isReadyToPause()) {
            await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
          }
          debuggerModel.pause();
        }
      }

      target.runtimeAgent().invoke_runIfWaitingForDebugger();
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

Common.Runnable.registerEarlyInitializationRunnable(InspectorMainImpl.instance);

/** @type {!ReloadActionDelegate} */
let reloadActionDelegateInstance;

/**
 * @implements {UI.ActionRegistration.ActionDelegate}
 */
export class ReloadActionDelegate {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!reloadActionDelegateInstance || forceNew) {
      reloadActionDelegateInstance = new ReloadActionDelegate();
    }

    return reloadActionDelegateInstance;
  }

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

/** @type {!FocusDebuggeeActionDelegate} */
let focusDebuggeeActionDelegateInstance;

/**
 * @implements {UI.ActionRegistration.ActionDelegate}
 */
export class FocusDebuggeeActionDelegate {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!focusDebuggeeActionDelegateInstance || forceNew) {
      focusDebuggeeActionDelegateInstance = new FocusDebuggeeActionDelegate();
    }

    return focusDebuggeeActionDelegateInstance;
  }
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      return false;
    }
    mainTarget.pageAgent().invoke_bringToFront();
    return true;
  }
}

/** @type {!NodeIndicator} */
let nodeIndicatorInstance;

/**
 * @implements {UI.Toolbar.Provider}
 */
export class NodeIndicator {
  /** @private */
  constructor() {
    const element = document.createElement('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        element, {cssFile: 'inspector_main/nodeIcon.css', enableLegacyPatching: false, delegatesFocus: undefined});
    this._element = shadowRoot.createChild('div', 'node-icon');
    element.addEventListener(
        'click', () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.openNodeFrontend(), false);
    this._button = new UI.Toolbar.ToolbarItem(element);
    this._button.setTitle(i18nString('Open dedicated DevTools for Node.js'));
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.AvailableTargetsChanged,
        event => this._update(/** @type {!Array<!Protocol.Target.TargetInfo>} */ (event.data)));
    this._button.setVisible(false);
    this._update([]);
  }
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!nodeIndicatorInstance || forceNew) {
      nodeIndicatorInstance = new NodeIndicator();
    }

    return nodeIndicatorInstance;
  }

  /**
   * @param {!Array<!Protocol.Target.TargetInfo>} targetInfos
   */
  _update(targetInfos) {
    const hasNode = Boolean(targetInfos.find(target => target.type === 'node' && !target.attached));
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
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.javascriptIsDisabled));
      }
      UI.InspectorView.InspectorView.instance().setPanelIcon('sources', icon);
    }
  }
}

/**
 * @implements {SDK.SDKModel.Observer}
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
    target.pageAgent().invoke_setAdBlockingEnabled({enabled: this._adBlockEnabledSetting.get()});
    target.emulationAgent().invoke_setFocusEmulationEnabled({enabled: this._emulatePageFocusSetting.get()});
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
