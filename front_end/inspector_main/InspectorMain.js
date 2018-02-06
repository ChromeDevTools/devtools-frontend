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
    new InspectorMain.NetworkPanelIndicator();
    new InspectorMain.SourcesPanelIndicator();
    new InspectorMain.BackendSettingsSync();
  }

  _connectAndCreateMainTarget() {
    if (Runtime.queryParam('nodeFrontend'))
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSFromFrontend);
    else if (Runtime.queryParam('v8only'))
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSDirectly);

    var target = SDK.targetManager.createTarget(
        'main', Common.UIString('Main'), this._capabilitiesForMainTarget(), this._createMainConnection.bind(this),
        null);

    if (Runtime.queryParam('nodeFrontend'))
      target.setInspectedURL('Node.js');
    if (target.hasJSCapability())
      target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @return {number}
   */
  _capabilitiesForMainTarget() {
    if (Runtime.queryParam('nodeFrontend'))
      return SDK.Target.Capability.Target;

    if (Runtime.queryParam('isSharedWorker')) {
      return SDK.Target.Capability.Browser | SDK.Target.Capability.Inspector | SDK.Target.Capability.Log |
          SDK.Target.Capability.Network | SDK.Target.Capability.Target;
    }

    if (Runtime.queryParam('v8only'))
      return SDK.Target.Capability.JS;

    return SDK.Target.Capability.Browser | SDK.Target.Capability.DOM | SDK.Target.Capability.DeviceEmulation |
        SDK.Target.Capability.Emulation | SDK.Target.Capability.Input | SDK.Target.Capability.Inspector |
        SDK.Target.Capability.JS | SDK.Target.Capability.Log | SDK.Target.Capability.Network |
        SDK.Target.Capability.ScreenCapture | SDK.Target.Capability.Security | SDK.Target.Capability.Target |
        SDK.Target.Capability.Tracing;
  }

  /**
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createMainConnection(params) {
    var wsParam = Runtime.queryParam('ws');
    var wssParam = Runtime.queryParam('wss');
    if (wsParam || wssParam) {
      var ws = wsParam ? `ws://${wsParam}` : `wss://${wssParam}`;
      this._mainConnection = new SDK.WebSocketConnection(ws, () => this._webSocketConnectionLost(), params);
    } else if (InspectorFrontendHost.isHostedMode()) {
      this._mainConnection = new SDK.StubConnection(params);
    } else {
      this._mainConnection = new SDK.MainConnection(params);
    }
    return this._mainConnection;
  }

  /**
   * @param {function(string)} onMessage
   * @return {!Promise<!Protocol.InspectorBackend.Connection>}
   */
  _interceptMainConnection(onMessage) {
    var params = {onMessage: onMessage, onDisconnect: this._connectAndCreateMainTarget.bind(this)};
    return this._mainConnection.disconnect().then(this._createMainConnection.bind(this, params));
  }

  _webSocketConnectionLost() {
    if (!InspectorMain._disconnectedScreenWithReasonWasShown)
      InspectorMain.RemoteDebuggingTerminatedScreen.show('WebSocket disconnected');
  }
};

InspectorMain.InspectorMain.Events = {
  AvailableTargetsChanged: Symbol('AvailableTargetsChanged')
};

/**
 * @param {function(string)} onMessage
 * @return {!Promise<!Protocol.InspectorBackend.Connection>}
 */
InspectorMain.interceptMainConnection = function(onMessage) {
  return self.runtime.sharedInstance(InspectorMain.InspectorMain)._interceptMainConnection(onMessage);
};

/**
 * @implements {Common.Runnable}
 */
InspectorMain.InspectorMainLate = class {
  /**
   * @override
   */
  run() {
    InspectorFrontendHost.events.addEventListener(
        InspectorFrontendHostAPI.Events.ReloadInspectedPage, this._reloadInspectedPage, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _reloadInspectedPage(event) {
    var hard = /** @type {boolean} */ (event.data);
    SDK.ResourceTreeModel.reloadAllPages(hard);
  }
};

/**
 * @implements {Protocol.TargetDispatcher}
 */
InspectorMain.BrowserChildTargetManager = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} parentTarget
   */
  constructor(parentTarget) {
    super(parentTarget);
    this._targetManager = parentTarget.targetManager();
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();
    /** @type {!Map<string, !Protocol.Target.TargetInfo>} */
    this._targetInfos = new Map();

    /** @type {!Map<string, !SDK.ChildConnection>} */
    this._childConnections = new Map();

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true});

    if (!parentTarget.parentTarget()) {
      this._targetAgent.setDiscoverTargets(true);
      this._targetAgent.setRemoteLocations([{host: 'localhost', port: 9229}]);
    }
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    return this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: false});
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    return this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true});
  }

  /**
   * @override
   */
  dispose() {
    for (var sessionId of this._childConnections.keys())
      this.detachedFromTarget(sessionId, undefined);
  }

  /**
   * @param {string} type
   * @return {number}
   */
  _capabilitiesForType(type) {
    if (type === 'worker')
      return SDK.Target.Capability.JS | SDK.Target.Capability.Log | SDK.Target.Capability.Network;
    if (type === 'service_worker')
      return SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target;
    if (type === 'iframe') {
      return SDK.Target.Capability.Browser | SDK.Target.Capability.DOM | SDK.Target.Capability.JS |
          SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target |
          SDK.Target.Capability.Tracing | SDK.Target.Capability.Emulation | SDK.Target.Capability.Input;
    }
    return 0;
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    this._targetInfos.set(targetInfo.targetId, targetInfo);
    this._fireAvailableTargetsChanged();
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetInfoChanged(targetInfo) {
    this._targetInfos.set(targetInfo.targetId, targetInfo);
    this._fireAvailableTargetsChanged();
  }

  /**
   * @override
   * @param {string} targetId
   */
  targetDestroyed(targetId) {
    this._targetInfos.delete(targetId);
    this._fireAvailableTargetsChanged();
  }

  _fireAvailableTargetsChanged() {
    self.runtime.sharedInstance(InspectorMain.InspectorMain)
        .dispatchEventToListeners(
            InspectorMain.InspectorMain.Events.AvailableTargetsChanged, this._targetInfos.valuesArray());
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {!Protocol.Target.TargetInfo} targetInfo
   * @param {boolean} waitingForDebugger
   */
  attachedToTarget(sessionId, targetInfo, waitingForDebugger) {
    var targetName = '';
    if (targetInfo.type !== 'iframe') {
      var parsedURL = targetInfo.url.asParsedURL();
      targetName = parsedURL ? parsedURL.lastPathComponentWithFragment() :
                               '#' + (++InspectorMain.BrowserChildTargetManager._lastAnonymousTargetId);
    }
    var target = this._targetManager.createTarget(
        targetInfo.targetId, targetName, this._capabilitiesForType(targetInfo.type),
        this._createChildConnection.bind(this, this._targetAgent, sessionId), this._parentTarget);

    // Only pause the new worker if debugging SW - we are going through the pause on start checkbox.
    if (!this._parentTarget.parentTarget() && Runtime.queryParam('isSharedWorker') && waitingForDebugger) {
      var debuggerModel = target.model(SDK.DebuggerModel);
      if (debuggerModel)
        debuggerModel.pause();
    }
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string=} childTargetId
   */
  detachedFromTarget(sessionId, childTargetId) {
    this._childConnections.get(sessionId).onDisconnect.call(null, 'target terminated');
    this._childConnections.delete(sessionId);
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string} message
   * @param {string=} childTargetId
   */
  receivedMessageFromTarget(sessionId, message, childTargetId) {
    var connection = this._childConnections.get(sessionId);
    if (connection)
      connection.onMessage.call(null, message);
  }

  /**
   * @param {!Protocol.TargetAgent} agent
   * @param {string} sessionId
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createChildConnection(agent, sessionId, params) {
    var connection = new SDK.ChildConnection(agent, sessionId, params);
    this._childConnections.set(sessionId, connection);
    return connection;
  }
};

InspectorMain.BrowserChildTargetManager._lastAnonymousTargetId = 0;

/**
 * @implements {Protocol.TargetDispatcher}
 */
InspectorMain.NodeChildTargetManager = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} parentTarget
   */
  constructor(parentTarget) {
    super(parentTarget);
    this._targetManager = parentTarget.targetManager();
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();
    /** @type {!Map<string, !SDK.ChildConnection>} */
    this._childConnections = new Map();

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.setDiscoverTargets(true);

    InspectorFrontendHost.setDevicesUpdatesEnabled(true);
    InspectorFrontendHost.events.addEventListener(
        InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _devicesDiscoveryConfigChanged(event) {
    var config = /** @type {!Adb.Config} */ (event.data);
    var locations = [];
    for (var address of config.networkDiscoveryConfig) {
      var parts = address.split(':');
      var port = parseInt(parts[1], 10);
      if (parts[0] && port)
        locations.push({host: parts[0], port: port});
    }
    this._targetAgent.setRemoteLocations(locations);
  }

  /**
   * @override
   */
  dispose() {
    InspectorFrontendHost.events.removeEventListener(
        InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);

    for (var sessionId of this._childConnections.keys())
      this.detachedFromTarget(sessionId, undefined);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    if (targetInfo.type === 'node' && !targetInfo.attached)
      this._targetAgent.attachToTarget(targetInfo.targetId);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetInfoChanged(targetInfo) {
  }

  /**
   * @override
   * @param {string} targetId
   */
  targetDestroyed(targetId) {
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {!Protocol.Target.TargetInfo} targetInfo
   * @param {boolean} waitingForDebugger
   */
  attachedToTarget(sessionId, targetInfo, waitingForDebugger) {
    var target = this._targetManager.createTarget(
        targetInfo.targetId, Common.UIString('Node.js: %s', targetInfo.url), SDK.Target.Capability.JS,
        this._createChildConnection.bind(this, this._targetAgent, sessionId), this._parentTarget);
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string=} childTargetId
   */
  detachedFromTarget(sessionId, childTargetId) {
    this._childConnections.get(sessionId).onDisconnect.call(null, 'target terminated');
    this._childConnections.delete(sessionId);
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string} message
   * @param {string=} childTargetId
   */
  receivedMessageFromTarget(sessionId, message, childTargetId) {
    var connection = this._childConnections.get(sessionId);
    if (connection)
      connection.onMessage.call(null, message);
  }

  /**
   * @param {!Protocol.TargetAgent} agent
   * @param {string} sessionId
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createChildConnection(agent, sessionId, params) {
    var connection = new SDK.ChildConnection(agent, sessionId, params);
    this._childConnections.set(sessionId, connection);
    return connection;
  }
};

if (Runtime.queryParam('nodeFrontend'))
  SDK.SDKModel.register(InspectorMain.NodeChildTargetManager, SDK.Target.Capability.Target, true);
else
  SDK.SDKModel.register(InspectorMain.BrowserChildTargetManager, SDK.Target.Capability.Target, true);

/**
 * @implements {Protocol.InspectorDispatcher}
 */
InspectorMain.InspectorModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    target.registerInspectorDispatcher(this);
    target.inspectorAgent().enable();
    this._hideCrashedDialog = null;
  }

  /**
   * @override
   * @param {string} reason
   */
  detached(reason) {
    InspectorMain._disconnectedScreenWithReasonWasShown = true;
    InspectorMain.RemoteDebuggingTerminatedScreen.show(reason);
  }

  /**
   * @override
   */
  targetCrashed() {
    var dialog = new UI.Dialog();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    this._hideCrashedDialog = dialog.hide.bind(dialog);
    new InspectorMain.TargetCrashedScreen(() => this._hideCrashedDialog = null).show(dialog.contentElement);
    dialog.show();
  }

  /**
   * @override;
   */
  targetReloadedAfterCrash() {
    if (this._hideCrashedDialog) {
      this._hideCrashedDialog.call(null);
      this._hideCrashedDialog = null;
    }
  }
};

SDK.SDKModel.register(InspectorMain.InspectorModel, SDK.Target.Capability.Inspector, true);

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
 * @implements {UI.ToolbarItem.Provider}
 */
InspectorMain.NodeIndicator = class {
  constructor() {
    var element = createElement('div');
    var shadowRoot = UI.createShadowRootWithCoreStyles(element, 'inspector_main/nodeIcon.css');
    this._element = shadowRoot.createChild('div', 'node-icon');
    element.addEventListener('click', () => InspectorFrontendHost.openNodeFrontend(), false);
    this._button = new UI.ToolbarItem(element);
    this._button.setTitle(Common.UIString('Open dedicated DevTools for Node.js'));
    self.runtime.sharedInstance(InspectorMain.InspectorMain)
        .addEventListener(
            InspectorMain.InspectorMain.Events.AvailableTargetsChanged,
            event => this._update(/** @type {!Array<!Protocol.Target.TargetInfo>} */ (event.data)));
    this._button.setVisible(false);
    this._update([]);
  }

  /**
   * @param {!Array<!Protocol.Target.TargetInfo>} targetInfos
   */
  _update(targetInfos) {
    var hasNode = !!targetInfos.find(target => target.type === 'node' && !target.attached);
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

InspectorMain.NetworkPanelIndicator = class {
  constructor() {
    // TODO: we should not access network from other modules.
    if (!UI.inspectorView.hasPanel('network'))
      return;
    var manager = SDK.multitargetNetworkManager;
    manager.addEventListener(SDK.MultitargetNetworkManager.Events.ConditionsChanged, updateVisibility);
    manager.addEventListener(SDK.MultitargetNetworkManager.Events.BlockedPatternsChanged, updateVisibility);
    manager.addEventListener(SDK.MultitargetNetworkManager.Events.InterceptorsChanged, updateVisibility);
    updateVisibility();

    function updateVisibility() {
      var icon = null;
      if (manager.isThrottling()) {
        icon = UI.Icon.create('smallicon-warning');
        icon.title = Common.UIString('Network throttling is enabled');
      } else if (SDK.multitargetNetworkManager.isIntercepting()) {
        icon = UI.Icon.create('smallicon-warning');
        icon.title = Common.UIString('Requests may be rewritten');
      } else if (manager.isBlocking()) {
        icon = UI.Icon.create('smallicon-warning');
        icon.title = Common.UIString('Requests may be blocked');
      }
      UI.inspectorView.setPanelIcon('network', icon);
    }
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
      var icon = null;
      var javaScriptDisabled = Common.moduleSetting('javaScriptDisabled').get();
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
    var deferredNode = /** @type {!SDK.DeferredDOMNode} */ (event.data);
    Common.Revealer.reveal(deferredNode);
  }
};

/**
 * @unrestricted
 */
InspectorMain.RemoteDebuggingTerminatedScreen = class extends UI.VBox {
  /**
   * @param {string} reason
   */
  constructor(reason) {
    super(true);
    this.registerRequiredCSS('inspector_main/remoteDebuggingTerminatedScreen.css');
    var message = this.contentElement.createChild('div', 'message');
    message.createChild('span').textContent = Common.UIString('Debugging connection was closed. Reason: ');
    message.createChild('span', 'reason').textContent = reason;
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('Reconnect when ready by reopening DevTools.');
    var button = UI.createTextButton(Common.UIString('Reconnect DevTools'), () => window.location.reload());
    this.contentElement.createChild('div', 'button').appendChild(button);
  }

  /**
   * @param {string} reason
   */
  static show(reason) {
    var dialog = new UI.Dialog();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    new InspectorMain.RemoteDebuggingTerminatedScreen(reason).show(dialog.contentElement);
    dialog.show();
  }
};

/**
 * @unrestricted
 */
InspectorMain.TargetCrashedScreen = class extends UI.VBox {
  /**
   * @param {function()} hideCallback
   */
  constructor(hideCallback) {
    super(true);
    this.registerRequiredCSS('inspector_main/targetCrashedScreen.css');
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('DevTools was disconnected from the page.');
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('Once page is reloaded, DevTools will automatically reconnect.');
    this._hideCallback = hideCallback;
  }

  /**
   * @override
   */
  willHide() {
    this._hideCallback.call(null);
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

    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Browser);
  }

  /**
   * @param {!SDK.Target} target
   */
  _updateTarget(target) {
    target.pageAgent().setAdBlockingEnabled(this._adBlockEnabledSetting.get());
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
