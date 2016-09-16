/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {Protocol.Agents}
 * @param {!WebInspector.TargetManager} targetManager
 * @param {string} name
 * @param {number} capabilitiesMask
 * @param {!InspectorBackendClass.Connection} connection
 * @param {?WebInspector.Target} parentTarget
 */
WebInspector.Target = function(targetManager, name, capabilitiesMask, connection, parentTarget)
{
    Protocol.Agents.call(this, connection.agentsMap());
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = "";
    this._capabilitiesMask = capabilitiesMask;
    this._connection = connection;
    this._parentTarget = parentTarget;
    connection.addEventListener(InspectorBackendClass.Connection.Events.Disconnected, this._onDisconnect, this);
    this._id = WebInspector.Target._nextId++;

    /** @type {!Map.<!Function, !WebInspector.SDKModel>} */
    this._modelByConstructor = new Map();
}

/**
 * @enum {number}
 */
WebInspector.Target.Capability = {
    Browser: 1,
    DOM: 2,
    JS: 4,
    Log: 8,
    Network: 16,
    Worker: 32
};

WebInspector.Target._nextId = 1;

WebInspector.Target.prototype = {
    /**
     * @return {number}
     */
    id: function()
    {
        return this._id;
    },

    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    /**
     * @return {!WebInspector.TargetManager}
     */
    targetManager: function()
    {
        return this._targetManager;
    },

    /**
     * @param {number} capabilitiesMask
     * @return {boolean}
     */
    hasAllCapabilities: function(capabilitiesMask)
    {
        return (this._capabilitiesMask & capabilitiesMask) === capabilitiesMask;
    },

    /**
     *
     * @return {!InspectorBackendClass.Connection}
     */
    connection: function()
    {
        return this._connection;
    },

    /**
     * @param {string} label
     * @return {string}
     */
    decorateLabel: function(label)
    {
        return !this.hasBrowserCapability() ? "\u2699 " + label : label;
    },

    /**
     * @override
     * @param {string} domain
     * @param {!Object} dispatcher
     */
    registerDispatcher: function(domain, dispatcher)
    {
        this._connection.registerDispatcher(domain, dispatcher);
    },

    /**
     * @return {boolean}
     */
    hasBrowserCapability: function()
    {
        return this.hasAllCapabilities(WebInspector.Target.Capability.Browser);
    },

    /**
     * @return {boolean}
     */
    hasJSCapability: function()
    {
        return this.hasAllCapabilities(WebInspector.Target.Capability.JS);
    },

    /**
     * @return {boolean}
     */
    hasLogCapability: function()
    {
        return this.hasAllCapabilities(WebInspector.Target.Capability.Log);
    },

    /**
     * @return {boolean}
     */
    hasNetworkCapability: function()
    {
        return this.hasAllCapabilities(WebInspector.Target.Capability.Network);
    },

    /**
     * @return {boolean}
     */
    hasWorkerCapability: function()
    {
        return this.hasAllCapabilities(WebInspector.Target.Capability.Worker);
    },

    /**
     * @return {boolean}
     */
    hasDOMCapability: function()
    {
        return this.hasAllCapabilities(WebInspector.Target.Capability.DOM);
    },

    /**
     * @return {?WebInspector.Target}
     */
    parentTarget: function()
    {
        return this._parentTarget;
    },

    _onDisconnect: function()
    {
        this._targetManager.removeTarget(this);
        this._dispose();
    },

    _dispose: function()
    {
        this._targetManager.dispatchEventToListeners(WebInspector.TargetManager.Events.TargetDisposed, this);
        if (this.workerManager)
            this.workerManager.dispose();
    },

    /**
     * @return {boolean}
     */
    isDetached: function()
    {
        return this._connection.isClosed();
    },

    /**
     * @param {!Function} modelClass
     * @return {?WebInspector.SDKModel}
     */
    model: function(modelClass)
    {
        return this._modelByConstructor.get(modelClass) || null;
    },

    /**
     * @return {!Array<!WebInspector.SDKModel>}
     */
    models: function()
    {
        return this._modelByConstructor.valuesArray();
    },

    /**
     * @return {string}
     */
    inspectedURL: function()
    {
        return this._inspectedURL;
    },

    /**
     * @param {string} inspectedURL
     */
    setInspectedURL: function(inspectedURL)
    {
        this._inspectedURL = inspectedURL;
        InspectorFrontendHost.inspectedURLChanged(inspectedURL || "");
        this._targetManager.dispatchEventToListeners(WebInspector.TargetManager.Events.InspectedURLChanged, this);
    },

    __proto__: Protocol.Agents.prototype
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!WebInspector.Target} target
 */
WebInspector.SDKObject = function(target)
{
    WebInspector.Object.call(this);
    this._target = target;
}

WebInspector.SDKObject.prototype = {
    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!Function} modelClass
 * @param {!WebInspector.Target} target
 */
WebInspector.SDKModel = function(modelClass, target)
{
    WebInspector.SDKObject.call(this, target);
    target._modelByConstructor.set(modelClass, this);
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.TargetDisposed, this._targetDisposed, this);
}

WebInspector.SDKModel.prototype = {
    /**
     * @return {!Promise}
     */
    suspendModel: function()
    {
        return Promise.resolve();
    },

    /**
     * @return {!Promise}
     */
    resumeModel: function()
    {
        return Promise.resolve();
    },

    dispose: function() { },

    /**
     * @param {!WebInspector.Event} event
     */
    _targetDisposed: function(event)
    {
        var target = /** @type {!WebInspector.Target} */ (event.data);
        if (target !== this._target)
            return;
        this.dispose();
        WebInspector.targetManager.removeEventListener(WebInspector.TargetManager.Events.TargetDisposed, this._targetDisposed, this);
    },

    __proto__: WebInspector.SDKObject.prototype
}
