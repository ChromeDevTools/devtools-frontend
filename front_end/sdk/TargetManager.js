/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.TargetManager = function()
{
    WebInspector.Object.call(this);
    /** @type {!Array.<!WebInspector.Target>} */
    this._targets = [];
    /** @type {!Array.<!WebInspector.TargetManager.Observer>} */
    this._observers = [];
    this._observerCapabiliesMaskSymbol = Symbol("observerCapabilitiesMask");
    /** @type {!Map<symbol, !Array<{modelClass: !Function, thisObject: (!Object|undefined), listener: function(!WebInspector.Event)}>>} */
    this._modelListeners = new Map();
    this._isSuspended = false;
}

/** @enum {symbol} */
WebInspector.TargetManager.Events = {
    InspectedURLChanged: Symbol("InspectedURLChanged"),
    MainFrameNavigated: Symbol("MainFrameNavigated"),
    Load: Symbol("Load"),
    PageReloadRequested: Symbol("PageReloadRequested"),
    WillReloadPage: Symbol("WillReloadPage"),
    TargetDisposed: Symbol("TargetDisposed"),
    SuspendStateChanged: Symbol("SuspendStateChanged")
}

WebInspector.TargetManager._listenersSymbol = Symbol("WebInspector.TargetManager.Listeners");

WebInspector.TargetManager.prototype = {
    suspendAllTargets: function()
    {
        if (this._isSuspended)
            return;
        this._isSuspended = true;
        this.dispatchEventToListeners(WebInspector.TargetManager.Events.SuspendStateChanged);

        for (var i = 0; i < this._targets.length; ++i) {
            for (var model of this._targets[i].models())
                model.suspendModel();
        }
    },

    /**
     * @return {!Promise}
     */
    resumeAllTargets: function()
    {
        if (!this._isSuspended)
            throw new Error("Not suspended");
        this._isSuspended = false;
        this.dispatchEventToListeners(WebInspector.TargetManager.Events.SuspendStateChanged);

        var promises = [];
        for (var i = 0; i < this._targets.length; ++i) {
            for (var model of this._targets[i].models())
                promises.push(model.resumeModel());
        }
        return Promise.all(promises);
    },

    suspendAndResumeAllTargets: function()
    {
        this.suspendAllTargets();
        this.resumeAllTargets();
    },

    /**
     * @return {boolean}
     */
    allTargetsSuspended: function()
    {
        return this._isSuspended;
    },

    /**
     * @return {string}
     */
    inspectedURL: function()
    {
        return this._targets[0] ? this._targets[0].inspectedURL() : "";
    },

    /**
     * @param {!WebInspector.TargetManager.Events} eventName
     * @param {!WebInspector.Event} event
     */
    _redispatchEvent: function(eventName, event)
    {
        this.dispatchEventToListeners(eventName, event.data);
    },

    /**
     * @param {boolean=} bypassCache
     * @param {string=} injectedScript
     */
    reloadPage: function(bypassCache, injectedScript)
    {
        if (!this._targets.length)
            return;

        var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(this._targets[0]);
        if (!resourceTreeModel)
            return;

        resourceTreeModel.reloadPage(bypassCache, injectedScript);
    },

    /**
     * @param {!Function} modelClass
     * @param {symbol} eventType
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    addModelListener: function(modelClass, eventType, listener, thisObject)
    {
        for (var i = 0; i < this._targets.length; ++i) {
            var model = this._targets[i].model(modelClass);
            if (model)
                model.addEventListener(eventType, listener, thisObject);
        }
        if (!this._modelListeners.has(eventType))
            this._modelListeners.set(eventType, []);
        this._modelListeners.get(eventType).push({ modelClass: modelClass, thisObject: thisObject, listener: listener });
    },

    /**
     * @param {!Function} modelClass
     * @param {symbol} eventType
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    removeModelListener: function(modelClass, eventType, listener, thisObject)
    {
        if (!this._modelListeners.has(eventType))
            return;

        for (var i = 0; i < this._targets.length; ++i) {
            var model = this._targets[i].model(modelClass);
            if (model)
                model.removeEventListener(eventType, listener, thisObject);
        }

        var listeners = this._modelListeners.get(eventType);
        for (var i = 0; i < listeners.length; ++i) {
            if (listeners[i].modelClass === modelClass && listeners[i].listener === listener && listeners[i].thisObject === thisObject)
                listeners.splice(i--, 1);
        }
        if (!listeners.length)
            this._modelListeners.delete(eventType);
    },

    /**
     * @param {!WebInspector.TargetManager.Observer} targetObserver
     * @param {number=} capabilitiesMask
     */
    observeTargets: function(targetObserver, capabilitiesMask)
    {
        if (this._observerCapabiliesMaskSymbol in targetObserver)
            throw new Error("Observer can only be registered once");
        targetObserver[this._observerCapabiliesMaskSymbol] = capabilitiesMask || 0;
        this.targets(capabilitiesMask).forEach(targetObserver.targetAdded.bind(targetObserver));
        this._observers.push(targetObserver);
    },

    /**
     * @param {!WebInspector.TargetManager.Observer} targetObserver
     */
    unobserveTargets: function(targetObserver)
    {
        delete targetObserver[this._observerCapabiliesMaskSymbol];
        this._observers.remove(targetObserver);
    },

    /**
     * @param {string} name
     * @param {number} capabilitiesMask
     * @param {!InspectorBackendClass.Connection} connection
     * @param {?WebInspector.Target} parentTarget
     * @return {!WebInspector.Target}
     */
    createTarget: function(name, capabilitiesMask, connection, parentTarget)
    {
        var target = new WebInspector.Target(this, name, capabilitiesMask, connection, parentTarget);

        var logAgent = target.hasLogCapability() ? target.logAgent() : null;

        /** @type {!WebInspector.ConsoleModel} */
        target.consoleModel = new WebInspector.ConsoleModel(target, logAgent);
        /** @type {!WebInspector.RuntimeModel} */
        target.runtimeModel = new WebInspector.RuntimeModel(target);

        var networkManager = null;
        var resourceTreeModel = null;
        if (target.hasNetworkCapability())
            networkManager = new WebInspector.NetworkManager(target);
        if (networkManager && target.hasDOMCapability()) {
            resourceTreeModel = new WebInspector.ResourceTreeModel(target, networkManager, WebInspector.SecurityOriginManager.fromTarget(target));
            new WebInspector.NetworkLog(target, resourceTreeModel, networkManager);
        }

        if (target.hasJSCapability())
            new WebInspector.DebuggerModel(target);

        if (resourceTreeModel) {
            var domModel = new WebInspector.DOMModel(target);
            // TODO(eostroukhov) CSSModel should not depend on RTM
            new WebInspector.CSSModel(target, domModel);
        }

        /** @type {?WebInspector.WorkerManager} */
        target.workerManager = target.hasWorkerCapability() ? new WebInspector.WorkerManager(target) : null;
        /** @type {!WebInspector.CPUProfilerModel} */
        target.cpuProfilerModel = new WebInspector.CPUProfilerModel(target);
        /** @type {!WebInspector.HeapProfilerModel} */
        target.heapProfilerModel = new WebInspector.HeapProfilerModel(target);

        target.tracingManager = new WebInspector.TracingManager(target);

        if (target.hasBrowserCapability()) {
            target.subTargetsManager = new WebInspector.SubTargetsManager(target);
            target.serviceWorkerManager = new WebInspector.ServiceWorkerManager(target, target.subTargetsManager);
        }

        this.addTarget(target);
        return target;
    },

    /**
     * @param {!WebInspector.Target} target
     * @return {!Array<!WebInspector.TargetManager.Observer>}
     */
    _observersForTarget: function(target)
    {
        return this._observers.filter((observer) => target.hasAllCapabilities(observer[this._observerCapabiliesMaskSymbol] || 0));
    },

    /**
     * @param {!WebInspector.Target} target
     */
    addTarget: function(target)
    {
        this._targets.push(target);
        var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
        if (this._targets.length === 1 && resourceTreeModel) {
            resourceTreeModel[WebInspector.TargetManager._listenersSymbol] = [
                setupRedispatch.call(this, WebInspector.ResourceTreeModel.Events.MainFrameNavigated, WebInspector.TargetManager.Events.MainFrameNavigated),
                setupRedispatch.call(this, WebInspector.ResourceTreeModel.Events.Load, WebInspector.TargetManager.Events.Load),
                setupRedispatch.call(this, WebInspector.ResourceTreeModel.Events.PageReloadRequested, WebInspector.TargetManager.Events.PageReloadRequested),
                setupRedispatch.call(this, WebInspector.ResourceTreeModel.Events.WillReloadPage, WebInspector.TargetManager.Events.WillReloadPage)
            ];
        }
        var copy = this._observersForTarget(target);
        for (var i = 0; i < copy.length; ++i)
            copy[i].targetAdded(target);

        for (var pair of this._modelListeners) {
            var listeners = pair[1];
            for (var i = 0; i < listeners.length; ++i) {
                var model = target.model(listeners[i].modelClass);
                if (model)
                    model.addEventListener(/** @type {symbol} */ (pair[0]), listeners[i].listener, listeners[i].thisObject);
            }
        }

        /**
         * @param {!WebInspector.ResourceTreeModel.Events} sourceEvent
         * @param {!WebInspector.TargetManager.Events} targetEvent
         * @return {!WebInspector.EventTarget.EventDescriptor}
         * @this {WebInspector.TargetManager}
         */
        function setupRedispatch(sourceEvent, targetEvent)
        {
            return resourceTreeModel.addEventListener(sourceEvent, this._redispatchEvent.bind(this, targetEvent));
        }
    },

    /**
     * @param {!WebInspector.Target} target
     */
    removeTarget: function(target)
    {
        this._targets.remove(target);
        var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
        var treeModelListeners = resourceTreeModel && resourceTreeModel[WebInspector.TargetManager._listenersSymbol];
        if (treeModelListeners)
            WebInspector.EventTarget.removeEventListeners(treeModelListeners);

        var copy = this._observersForTarget(target);
        for (var i = 0; i < copy.length; ++i)
            copy[i].targetRemoved(target);

        for (var pair of this._modelListeners) {
            var listeners = pair[1];
            for (var i = 0; i < listeners.length; ++i) {
                var model = target.model(listeners[i].modelClass);
                if (model)
                    model.removeEventListener(/** @type {symbol} */ (pair[0]), listeners[i].listener, listeners[i].thisObject);
            }
        }
    },

    /**
     * @param {number=} capabilitiesMask
     * @return {!Array.<!WebInspector.Target>}
     */
    targets: function(capabilitiesMask)
    {
        if (!capabilitiesMask)
            return this._targets.slice();
        else
            return this._targets.filter((target) => target.hasAllCapabilities(capabilitiesMask || 0));
    },

    /**
     *
     * @param {number} id
     * @return {?WebInspector.Target}
     */
    targetById: function(id)
    {
        for (var i = 0; i < this._targets.length; ++i) {
            if (this._targets[i].id() === id)
                return this._targets[i];
        }
        return null;
    },

    /**
     * @return {?WebInspector.Target}
     */
    mainTarget: function()
    {
        return this._targets[0] || null;
    },

    /**
     * @param {!WebInspector.Target} target
     */
    suspendReload: function(target)
    {
        var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
        if (resourceTreeModel)
            resourceTreeModel.suspendReload();
    },

    /**
     * @param {!WebInspector.Target} target
     */
    resumeReload: function(target)
    {
        var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
        if (resourceTreeModel)
            setImmediate(resourceTreeModel.resumeReload.bind(resourceTreeModel));
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @interface
 */
WebInspector.TargetManager.Observer = function()
{
}

WebInspector.TargetManager.Observer.prototype = {
    /**
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target) { },

    /**
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target) { },
}

/**
 * @type {!WebInspector.TargetManager}
 */
WebInspector.targetManager = new WebInspector.TargetManager();
