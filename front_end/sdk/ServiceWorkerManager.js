/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.Target} target
 */
WebInspector.ServiceWorkerManager = function(target)
{
    WebInspector.SDKObject.call(this, target);
    target.registerServiceWorkerDispatcher(new WebInspector.ServiceWorkerDispatcher(this));
    this._lastAnonymousTargetId = 0;
    this._agent = target.serviceWorkerAgent();
    /** @type {!Map.<string, !WebInspector.ServiceWorker>} */
    this._workers = new Map();
    /** @type {!Map.<string, !WebInspector.ServiceWorkerRegistration>} */
    this._registrations = new Map();
    this.enable();
}

WebInspector.ServiceWorkerManager.Events = {
    WorkersUpdated: "WorkersUpdated",
    RegistrationUpdated: "RegistrationUpdated",
    RegistrationDeleted: "RegistrationDeleted",
    DebugOnStartUpdated: "DebugOnStartUpdated"
}

WebInspector.ServiceWorkerManager.prototype = {
    enable: function()
    {
        if (this._enabled)
            return;
        this._enabled = true;

        this._agent.enable();
        WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.MainFrameNavigated, this._mainFrameNavigated, this);
    },

    disable: function()
    {
        if (!this._enabled)
            return;
        this._enabled = false;

        for (var worker of this._workers.values())
            worker._connection.close();
        this._workers.clear();
        this._registrations.clear();
        this._agent.disable();
        WebInspector.targetManager.removeEventListener(WebInspector.TargetManager.Events.MainFrameNavigated, this._mainFrameNavigated, this);
    },

    /**
     * @return {!Iterable.<!WebInspector.ServiceWorker>}
     */
    workers: function()
    {
        return this._workers.values();
    },

    /**
     * @return {boolean}
     */
    hasWorkers: function()
    {
        return !!this._workers.size;
    },

    /**
     * @return {boolean}
     */
    debugOnStart: function()
    {
        return !!this._debugOnStart;
    },

    /**
     * @param {boolean} flag
     */
    setDebugOnStart: function(flag)
    {
        this._agent.setDebugOnStart(flag);
    },

    /**
     * @return {!Map.<string, !WebInspector.ServiceWorkerRegistration>}
     */
    registrations: function()
    {
        return this._registrations;
    },

    /**
     * @param {string} registrationId
     */
    deleteRegistration: function(registrationId)
    {
        var registration = this._registrations.get(registrationId);
        if (!registration)
            return;
        if (registration._isRedundant()) {
            this._registrations.delete(registrationId);
            this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.RegistrationDeleted, registration);
            return;
        }
        registration._deleting = true;
        for (var version of registration.versions.values())
            this.stopWorker(version.id);
        this._unregister(registration.scopeURL);
    },

     /**
      * @param {string} registrationId
      * @param {string} data
      */
     deliverPushMessage: function(registrationId, data)
     {
         var registration = this._registrations.get(registrationId);
         if (!registration)
             return;
         var origin = WebInspector.ParsedURL.splitURLIntoPathComponents(registration.scopeURL)[0];
         this._agent.deliverPushMessage(origin, registrationId, data);
     },

    /**
     * @param {string} scope
     */
    _unregister: function(scope)
    {
        this._agent.unregister(scope);
    },

    /**
     * @param {string} scope
     */
    startWorker: function(scope)
    {
        this._agent.startWorker(scope);
    },

    /**
     * @param {string} versionId
     */
    stopWorker: function(versionId)
    {
        this._agent.stopWorker(versionId);
    },

    /**
     * @param {string} versionId
     */
    inspectWorker: function(versionId)
    {
        this._agent.inspectWorker(versionId);
    },

    /**
     * @param {string} workerId
     * @param {string} url
     */
    _workerCreated: function(workerId, url)
    {
        new WebInspector.ServiceWorker(this, workerId, url);
    },

    /**
     * @param {string} workerId
     */
    _workerTerminated: function(workerId)
    {
        var worker = this._workers.get(workerId);
        if (!worker)
            return;

        worker._closeConnection();
        this._workers.delete(workerId);

        this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.WorkersUpdated);
    },

    /**
     * @param {string} workerId
     * @param {string} message
     */
    _dispatchMessage: function(workerId, message)
    {
        var worker = this._workers.get(workerId);
        if (worker)
            worker._connection.dispatch(message);
    },

    /**
     * @param {!Array.<!ServiceWorkerAgent.ServiceWorkerRegistration>} registrations
     */
    _workerRegistrationUpdated: function(registrations)
    {
        for (var payload of registrations) {
            var registration = this._registrations.get(payload.registrationId);
            if (!registration) {
                registration = new WebInspector.ServiceWorkerRegistration(payload);
                this._registrations.set(payload.registrationId, registration);
                this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, registration);
                continue;
            }
            registration._update(payload);

            if (registration._shouldBeRemoved()) {
                this._registrations.delete(registration.id);
                this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.RegistrationDeleted, registration);
            } else {
                this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, registration);
            }
        }
    },

    /**
     * @param {!Array.<!ServiceWorkerAgent.ServiceWorkerVersion>} versions
     */
    _workerVersionUpdated: function(versions)
    {
        /** @type {!Set.<!WebInspector.ServiceWorkerRegistration>} */
        var registrations = new Set();
        for (var payload of versions) {
            var registration = this._registrations.get(payload.registrationId);
            if (!registration)
                continue;
            registration._updateVersion(payload);
            registrations.add(registration);
        }
        for (var registration of registrations) {
            if (registration._shouldBeRemoved()) {
                this._registrations.delete(registration.id);
                this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.RegistrationDeleted, registration);
            } else {
                this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, registration);
            }
        }
    },

    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerErrorMessage} payload
     */
     _workerErrorReported: function(payload)
    {
        var registration = this._registrations.get(payload.registrationId);
        if (!registration)
            return;
        registration._addError(payload);
        this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, registration);
    },

    /**
     * @param {boolean} flag
     */
    _debugOnStartUpdated: function(flag)
    {
        this._debugOnStart = flag;
        this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.DebugOnStartUpdated, flag);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _mainFrameNavigated: function(event)
    {
        // Attach to the new worker set.
    },

    __proto__: WebInspector.SDKObject.prototype
}

/**
 * @constructor
 * @param {!WebInspector.ServiceWorkerManager} manager
 * @param {string} workerId
 * @param {string} url
 */
WebInspector.ServiceWorker = function(manager, workerId, url)
{
    this._manager = manager;
    this._agent = manager.target().serviceWorkerAgent();
    this._workerId = workerId;
    this._connection = new WebInspector.ServiceWorkerConnection(this._agent, workerId);
    this._url = url;
    var parsedURL = url.asParsedURL();
    this._name = parsedURL ? parsedURL.lastPathComponentWithFragment()  : "#" + (++WebInspector.ServiceWorker._lastAnonymousTargetId);
    this._scope = parsedURL.host + parsedURL.folderPathComponents;
    var title = WebInspector.UIString("\u2699 %s", this._name);

    this._manager._workers.set(workerId, this);
    WebInspector.targetManager.createTarget(title, WebInspector.Target.Type.ServiceWorker, this._connection, manager.target(), targetCreated.bind(this));

    /**
     * @param {?WebInspector.Target} target
     * @this {WebInspector.ServiceWorker}
     */
    function targetCreated(target)
    {
        if (!target) {
            this._manager._workers.delete(workerId);
            return;
        }
        this._manager.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.WorkersUpdated);
        target.runtimeAgent().run();
    }
}

WebInspector.ServiceWorker._lastAnonymousTargetId = 0;

WebInspector.ServiceWorker.prototype = {
    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    /**
     * @return {string}
     */
    url: function()
    {
        return this._url;
    },

    /**
     * @return {string}
     */
    scope: function()
    {
        return this._scope;
    },

    stop: function()
    {
        this._agent.stop(this._workerId);
    },

    _closeConnection: function()
    {
        this._connection._close();
    }
}

/**
 * @constructor
 * @implements {ServiceWorkerAgent.Dispatcher}
 * @param {!WebInspector.ServiceWorkerManager} manager
 */
WebInspector.ServiceWorkerDispatcher = function(manager)
{
    this._manager = manager;
}

WebInspector.ServiceWorkerDispatcher.prototype = {
    /**
     * @override
     * @param {string} workerId
     * @param {string} url
     */
    workerCreated: function(workerId, url)
    {
        this._manager._workerCreated(workerId, url);
    },

    /**
     * @override
     * @param {string} workerId
     */
    workerTerminated: function(workerId)
    {
        this._manager._workerTerminated(workerId);
    },

    /**
     * @override
     * @param {string} workerId
     * @param {string} message
     */
    dispatchMessage: function(workerId, message)
    {
        this._manager._dispatchMessage(workerId, message);
    },

    /**
     * @override
     * @param {!Array.<!ServiceWorkerAgent.ServiceWorkerRegistration>} registrations
     */
    workerRegistrationUpdated: function(registrations)
    {
        this._manager._workerRegistrationUpdated(registrations);
    },

    /**
     * @override
     * @param {!Array.<!ServiceWorkerAgent.ServiceWorkerVersion>} versions
     */
    workerVersionUpdated: function(versions)
    {
        this._manager._workerVersionUpdated(versions);
    },

    /**
     * @override
     * @param {!ServiceWorkerAgent.ServiceWorkerErrorMessage} errorMessage
     */
    workerErrorReported: function(errorMessage)
    {
        this._manager._workerErrorReported(errorMessage);
    },

    /**
     * @override
     * @param {boolean} flag
     */
    debugOnStartUpdated: function(flag)
    {
        this._manager._debugOnStartUpdated(flag);
    }
}

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 * @param {!Protocol.ServiceWorkerAgent} agent
 * @param {string} workerId
 */
WebInspector.ServiceWorkerConnection = function(agent, workerId)
{
    InspectorBackendClass.Connection.call(this);
    //FIXME: remove resourceTreeModel and others from worker targets
    this.suppressErrorsForDomains(["Worker", "Page", "CSS", "DOM", "DOMStorage", "Database", "Network", "IndexedDB", "ServiceWorkerCache"]);
    this._agent = agent;
    this._workerId = workerId;
}

WebInspector.ServiceWorkerConnection.prototype = {
    /**
     * @override
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        this._agent.sendMessage(this._workerId, JSON.stringify(messageObject));
    },

    _close: function()
    {
        this.connectionClosed("worker_terminated");
    },

    __proto__: InspectorBackendClass.Connection.prototype
}

/**
 * @constructor
 * @param {!ServiceWorkerAgent.ServiceWorkerErrorMessage} payload
 */
WebInspector.ServiceWorkerErrorMessage = function(payload)
{
    this.errorMessage = payload.errorMessage;
    this.sourceURL = payload.sourceURL;
    this.lineNumber = payload.lineNumber;
    this.columnNumber = payload.columnNumber;
}

/**
 * @constructor
 * @param {!WebInspector.ServiceWorkerRegistration} registration
 * @param {!ServiceWorkerAgent.ServiceWorkerVersion} payload
 */
WebInspector.ServiceWorkerVersion = function(registration, payload)
{
    this._registration = registration;
    this._update(payload);
    /** @type {!Array<!WebInspector.ServiceWorkerErrorMessage>} */
    this.errorMessages = [];
}

WebInspector.ServiceWorkerVersion.prototype = {
    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerVersion} payload
     */
    _update: function(payload)
    {
        this.id = payload.versionId;
        this.scriptURL = payload.scriptURL;
        this.runningStatus = payload.runningStatus;
        this.status = payload.status;
        this.scriptLastModified = payload.scriptLastModified;
        this.scriptResponseTime = payload.scriptResponseTime;
    },

    /**
     * @return {boolean}
     */
    isStartable: function()
    {
        return !this._registration.isDeleted && this.isActivated() && this.isStopped();
    },

    /**
     * @return {boolean}
     */
    isStoppedAndRedundant: function()
    {
        return this.runningStatus == ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Stopped && this.status == ServiceWorkerAgent.ServiceWorkerVersionStatus.Redundant;
    },

    /**
     * @return {boolean}
     */
    isStopped: function()
    {
        return this.runningStatus == ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Stopped;
    },

    /**
     * @return {boolean}
     */
    isStarting: function()
    {
        return this.runningStatus == ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Starting;
    },

    /**
     * @return {boolean}
     */
    isRunning: function()
    {
        return this.runningStatus == ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Running;
    },

    /**
     * @return {boolean}
     */
    isStopping: function()
    {
        return this.runningStatus == ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Stopping;
    },

    /**
     * @return {boolean}
     */
    isNew: function()
    {
        return this.status == ServiceWorkerAgent.ServiceWorkerVersionStatus.New;
    },

    /**
     * @return {boolean}
     */
    isInstalling: function()
    {
        return this.status == ServiceWorkerAgent.ServiceWorkerVersionStatus.Installing;
    },

    /**
     * @return {boolean}
     */
    isInstalled: function()
    {
        return this.status == ServiceWorkerAgent.ServiceWorkerVersionStatus.Installed;
    },

    /**
     * @return {boolean}
     */
    isActivating: function()
    {
        return this.status == ServiceWorkerAgent.ServiceWorkerVersionStatus.Activating;
    },

    /**
     * @return {boolean}
     */
    isActivated: function()
    {
        return this.status == ServiceWorkerAgent.ServiceWorkerVersionStatus.Activated;
    },

    /**
     * @return {boolean}
     */
    isRedundant: function()
    {
        return this.status == ServiceWorkerAgent.ServiceWorkerVersionStatus.Redundant;
    },

    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerErrorMessage} payload
     */
    _addError: function(payload)
    {
        this.errorMessages.push(new WebInspector.ServiceWorkerErrorMessage(payload));
    }
}

/**
* @constructor
* @param {!ServiceWorkerAgent.ServiceWorkerRegistration} payload
*/
WebInspector.ServiceWorkerRegistration = function(payload)
{
   this._update(payload);
   /** @type {!Map.<string, !WebInspector.ServiceWorkerVersion>} */
   this.versions = new Map();
   this._deleting = false;
}

WebInspector.ServiceWorkerRegistration.prototype = {
    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerRegistration} payload
     */
    _update: function(payload)
    {
        this.id = payload.registrationId;
        this.scopeURL = payload.scopeURL;
        this.isDeleted = payload.isDeleted;
    },

    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerVersion} payload
     * @return {!WebInspector.ServiceWorkerVersion}
     */
    _updateVersion: function(payload)
    {
        var version = this.versions.get(payload.versionId);
        if (!version) {
            version = new WebInspector.ServiceWorkerVersion(this, payload);
            this.versions.set(payload.versionId, version);
            return version;
        }
        version._update(payload);
        return version;
    },

    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerErrorMessage} payload
     */
    _addError: function(payload)
    {
        var version = this.versions.get(payload.versionId);
        if (version)
            version._addError(payload);
    },

    /**
     * @return {boolean}
     */
    _isRedundant: function()
    {
        for (var version of this.versions.values()) {
            if (!version.isStoppedAndRedundant())
                return false;
        }
        return true;
    },

    /**
     * @return {boolean}
     */
    _hasErrorLog: function()
    {
        for (var version of this.versions.values()) {
            if (version.errorMessages.length)
                return true;
        }
        return false;
    },

    /**
     * @return {boolean}
     */
    _shouldBeRemoved: function()
    {
        return this._isRedundant() && (!this._hasErrorLog() || this._deleting);
    }
}
