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
 * @param {number} type
 * @param {!InspectorBackendClass.Connection} connection
 * @param {?WebInspector.Target} parentTarget
 */
WebInspector.Target = function(targetManager, name, type, connection, parentTarget)
{
    Protocol.Agents.call(this, connection.agentsMap());
    this._targetManager = targetManager;
    this._name = name;
    this._type = type;
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
WebInspector.Target.Type = {
    Page: 1,
    DedicatedWorker: 2,
    ServiceWorker: 4
}

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
     *
     * @return {number}
     */
    type: function()
    {
        return this._type;
    },

    /**
     *
     * @return {!WebInspector.TargetManager}
     */
    targetManager: function()
    {
        return this._targetManager;
    },

    /**
     * @param {string} label
     * @return {string}
     */
    decorateLabel: function(label)
    {
        return this.isWorker() ? "\u2699 " + label : label;
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
    isPage: function()
    {
        return this._type === WebInspector.Target.Type.Page;
    },

    /**
     * @return {boolean}
     */
    isWorker: function()
    {
        return this.isDedicatedWorker() || this.isServiceWorker();
    },

    /**
     * @return {boolean}
     */
    isDedicatedWorker: function()
    {
        return this._type === WebInspector.Target.Type.DedicatedWorker;
    },

    /**
     * @return {boolean}
     */
    isServiceWorker: function()
    {
        return this._type === WebInspector.Target.Type.ServiceWorker;
    },

    /**
     * @return {boolean}
     */
    hasJSContext: function()
    {
        return !this.isServiceWorker();
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
        this.networkManager.dispose();
        this.cpuProfilerModel.dispose();
        WebInspector.ServiceWorkerCacheModel.fromTarget(this).dispose();
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

    __proto__: WebInspector.SDKObject.prototype
}
