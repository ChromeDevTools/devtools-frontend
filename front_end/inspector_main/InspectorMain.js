// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Common.Runnable}
 */
InspectorMain.InspectorMain = class extends Common.Object {
  constructor() {
    super();
    /** @type {!Protocol.InspectorBackend.Connection} */
    this._mainConnection;
  }

  /**
   * @override
   */
  run() {
    this._connectAndCreateMainTarget();
    InspectorFrontendHost.connectionReady();

    new InspectorMain.InspectedNodeRevealer();
    new InspectorMain.SourcesPanelIndicator();
    new InspectorMain.BackendSettingsSync();
    new MobileThrottling.NetworkPanelIndicator();

    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.ReloadInspectedPage, event => {
      const hard = /** @type {boolean} */ (event.data);
      SDK.ResourceTreeModel.reloadAllPages(hard);
    });
  }

  _connectAndCreateMainTarget() {
    const isNodeJS = !!Runtime.queryParam('v8only');
    const target = SDK.targetManager.createTarget(
        'main', Common.UIString('Main'), this._capabilitiesForMainTarget(), this._createMainConnection.bind(this), null,
        isNodeJS);
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @return {number}
   */
  _capabilitiesForMainTarget() {
    if (Runtime.queryParam('v8only'))
      return SDK.Target.Capability.JS;
    return SDK.Target.Capability.Browser | SDK.Target.Capability.DOM | SDK.Target.Capability.DeviceEmulation |
        SDK.Target.Capability.Emulation | SDK.Target.Capability.Input | SDK.Target.Capability.JS |
        SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.ScreenCapture |
        SDK.Target.Capability.Security | SDK.Target.Capability.Target | SDK.Target.Capability.Tracing |
        SDK.Target.Capability.Inspector;
  }

  /**
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createMainConnection(params) {
    this._mainConnection =
        SDK.createMainConnection(params, () => Components.TargetDetachedDialog.webSocketConnectionLost());
    return this._mainConnection;
  }

  /**
   * @param {function(string)} onMessage
   * @return {!Promise<!Protocol.InspectorBackend.Connection>}
   */
  _interceptMainConnection(onMessage) {
    const params = {onMessage: onMessage, onDisconnect: this._connectAndCreateMainTarget.bind(this)};
    return this._mainConnection.disconnect().then(this._createMainConnection.bind(this, params));
  }
};

/**
 * @param {function(string)} onMessage
 * @return {!Promise<!Protocol.InspectorBackend.Connection>}
 */
InspectorMain.interceptMainConnection = function(onMessage) {
  return self.runtime.sharedInstance(InspectorMain.InspectorMain)._interceptMainConnection(onMessage);
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
InspectorMain.ReloadActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'inspector_main.reload':
        SDK.ResourceTreeModel.reloadAllPages(false);
        return true;
      case 'inspector_main.hard-reload':
        SDK.ResourceTreeModel.reloadAllPages(true);
        return true;
    }
    return false;
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
InspectorMain.FocusDebuggeeActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    SDK.targetManager.mainTarget().pageAgent().bringToFront();
    return true;
  }
};

/**
 * @implements {UI.ToolbarItem.Provider}
 */
InspectorMain.NodeIndicator = class {
  constructor() {
    const element = createElement('div');
    const shadowRoot = UI.createShadowRootWithCoreStyles(element, 'inspector_main/nodeIcon.css');
    this._element = shadowRoot.createChild('div', 'node-icon');
    element.addEventListener('click', () => InspectorFrontendHost.openNodeFrontend(), false);
    this._button = new UI.ToolbarItem(element);
    this._button.setTitle(Common.UIString('Open dedicated DevTools for Node.js'));
    SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.AvailableTargetsChanged,
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
    if (hasNode)
      this._button.setVisible(true);
  }

  /**
   * @override
   * @return {?UI.ToolbarItem}
   */
  item() {
    return this._button;
  }
};

/**
 * @unrestricted
 */
InspectorMain.SourcesPanelIndicator = class {
  constructor() {
    Common.moduleSetting('javaScriptDisabled').addChangeListener(javaScriptDisabledChanged);
    javaScriptDisabledChanged();

    function javaScriptDisabledChanged() {
      let icon = null;
      const javaScriptDisabled = Common.moduleSetting('javaScriptDisabled').get();
      if (javaScriptDisabled) {
        icon = UI.Icon.create('smallicon-warning');
        icon.title = Common.UIString('JavaScript is disabled');
      }
      UI.inspectorView.setPanelIcon('sources', icon);
    }
  }
};

/**
 * @unrestricted
 */
InspectorMain.InspectedNodeRevealer = class {
  constructor() {
    SDK.targetManager.addModelListener(
        SDK.OverlayModel, SDK.OverlayModel.Events.InspectNodeRequested, this._inspectNode, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _inspectNode(event) {
    const deferredNode = /** @type {!SDK.DeferredDOMNode} */ (event.data);
    Common.Revealer.reveal(deferredNode);
  }
};

/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
InspectorMain.BackendSettingsSync = class {
  constructor() {
    this._autoAttachSetting = Common.settings.moduleSetting('autoAttachToCreatedPages');
    this._autoAttachSetting.addChangeListener(this._updateAutoAttach, this);
    this._updateAutoAttach();

    this._adBlockEnabledSetting = Common.settings.moduleSetting('network.adBlockingEnabled');
    this._adBlockEnabledSetting.addChangeListener(this._update, this);

    this._emulatePageFocusSetting = Common.settings.moduleSetting('emulatePageFocus');
    this._emulatePageFocusSetting.addChangeListener(this._update, this);

    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Browser);
  }

  /**
   * @param {!SDK.Target} target
   */
  _updateTarget(target) {
    if (target.parentTarget())
      return;
    target.pageAgent().setAdBlockingEnabled(this._adBlockEnabledSetting.get());
    target.emulationAgent().setFocusEmulationEnabled(this._emulatePageFocusSetting.get());
  }

  _updateAutoAttach() {
    InspectorFrontendHost.setOpenNewWindowForPopups(this._autoAttachSetting.get());
  }

  _update() {
    SDK.targetManager.targets(SDK.Target.Capability.Browser).forEach(this._updateTarget, this);
  }

  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetAdded(target) {
    this._updateTarget(target);
  }

  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetRemoved(target) {
  }
};

SDK.ChildTargetManager.install();
