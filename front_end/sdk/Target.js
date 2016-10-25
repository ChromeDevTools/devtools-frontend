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
 * @param {!InspectorBackendClass.Connection.Factory} connectionFactory
 * @param {?WebInspector.Target} parentTarget
 */
WebInspector.Target = function(targetManager, name, capabilitiesMask, connectionFactory, parentTarget)
{
    // TODO(dgozman): inherit instead.
    var targetProto = new InspectorBackendClass.TargetPrototype(connectionFactory, this._dispose.bind(this));
    Protocol.Agents.call(this, targetProto.agentsMap());
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = "";
    this._capabilitiesMask = capabilitiesMask;
    this._targetProto = targetProto;
    this._parentTarget = parentTarget;
    this._id = WebInspector.Target._nextId++;
    this._disposed = false;

    /** @type {!Map.<!Function, !WebInspector.SDKModel>} */
    this._modelByConstructor = new Map();
};

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
     * @return {boolean}
     */
    isNodeJS: function()
    {
        // TODO(lushnikov): this is an unreliable way to detect Node.js targets.
        return this._capabilitiesMask === WebInspector.Target.Capability.JS || this._isNodeJSForTest;
    },

    setIsNodeJSForTest: function()
    {
        this._isNodeJSForTest = true;
    },

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
        return this._name || this._inspectedURLName;
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
        this._targetProto.registerDispatcher(domain, dispatcher);
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

    _dispose: function()
    {
        this._disposed = true;
        this._targetManager.removeTarget(this);
        for (var model of this._modelByConstructor.valuesArray())
            model.dispose();
        if (this.workerManager)
            this.workerManager.dispose();
    },

    /**
     * @return {boolean}
     */
    isDisposed: function()
    {
        return this._disposed;
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
        var parsedURL = inspectedURL.asParsedURL();
        this._inspectedURLName = parsedURL ? parsedURL.lastPathComponentWithFragment() : "#" + this._id;
        if (!this.parentTarget())
            InspectorFrontendHost.inspectedURLChanged(inspectedURL || "");
        this._targetManager.dispatchEventToListeners(WebInspector.TargetManager.Events.InspectedURLChanged, this);
        if (!this._name)
            this._targetManager.dispatchEventToListeners(WebInspector.TargetManager.Events.NameChanged, this);
    },

    __proto__: Protocol.Agents.prototype
};

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!WebInspector.Target} target
 */
WebInspector.SDKObject = function(target)
{
    WebInspector.Object.call(this);
    this._target = target;
};

WebInspector.SDKObject.prototype = {
    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    __proto__: WebInspector.Object.prototype
};

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
};

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
    },

    __proto__: WebInspector.SDKObject.prototype
};
