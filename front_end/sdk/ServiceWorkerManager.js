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
 * @param {!WebInspector.SubTargetsManager} subTargetsManager
 */
WebInspector.ServiceWorkerManager = function(target, subTargetsManager)
{
    WebInspector.SDKObject.call(this, target);
    target.registerServiceWorkerDispatcher(new WebInspector.ServiceWorkerDispatcher(this));
    this._lastAnonymousTargetId = 0;
    this._agent = target.serviceWorkerAgent();
    /** @type {!Map.<string, !WebInspector.ServiceWorkerRegistration>} */
    this._registrations = new Map();
    this.enable();
    this._forceUpdateSetting = WebInspector.settings.createSetting("serviceWorkerUpdateOnReload", false);
    if (this._forceUpdateSetting.get())
        this._forceUpdateSettingChanged();
    this._forceUpdateSetting.addChangeListener(this._forceUpdateSettingChanged, this);
    new WebInspector.ServiceWorkerContextNamer(target, this, subTargetsManager);
}

/** @enum {symbol} */
WebInspector.ServiceWorkerManager.Events = {
    RegistrationUpdated: Symbol("RegistrationUpdated"),
    RegistrationErrorAdded: Symbol("RegistrationErrorAdded"),
    RegistrationDeleted: Symbol("RegistrationDeleted")
}

WebInspector.ServiceWorkerManager.prototype = {
    enable: function()
    {
        if (this._enabled)
            return;
        this._enabled = true;
        this._agent.enable();
    },

    disable: function()
    {
        if (!this._enabled)
            return;
        this._enabled = false;
        this._registrations.clear();
        this._agent.disable();
    },

    /**
     * @return {!Map.<string, !WebInspector.ServiceWorkerRegistration>}
     */
    registrations: function()
    {
        return this._registrations;
    },

    /**
     * @param {string} versionId
     * @return {?WebInspector.ServiceWorkerVersion}
     */
    findVersion: function(versionId)
    {
        for (var registration of this.registrations().values()) {
            var version = registration.versions.get(versionId);
            if (version)
                return version;
        }
        return null;
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
     */
    updateRegistration: function(registrationId)
    {
        var registration = this._registrations.get(registrationId);
        if (!registration)
            return;
        this._agent.updateRegistration(registration.scopeURL);
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
        var origin = WebInspector.ParsedURL.extractOrigin(registration.scopeURL);
        this._agent.deliverPushMessage(origin, registrationId, data);
    },

    /**
     * @param {string} registrationId
     * @param {string} tag
     * @param {boolean} lastChance
     */
    dispatchSyncEvent: function(registrationId, tag, lastChance)
    {
        var registration = this._registrations.get(registrationId);
        if (!registration)
            return;
        var origin = WebInspector.ParsedURL.extractOrigin(registration.scopeURL);
        this._agent.dispatchSyncEvent(origin, registrationId, tag, lastChance);
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
     * @param {string} scope
     */
    skipWaiting: function(scope)
    {
        this._agent.skipWaiting(scope);
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
        registration.errors.push(payload);
        this.dispatchEventToListeners(WebInspector.ServiceWorkerManager.Events.RegistrationErrorAdded, { registration: registration, error: payload });
    },

    /**
     * @return {!WebInspector.Setting}
     */
    forceUpdateOnReloadSetting: function()
    {
        return this._forceUpdateSetting;
    },

    _forceUpdateSettingChanged: function()
    {
        this._agent.setForceUpdateOnPageLoad(this._forceUpdateSetting.get());
    },

    __proto__: WebInspector.SDKObject.prototype
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
    }
}

/**
 * @constructor
 * @param {!WebInspector.ServiceWorkerRegistration} registration
 * @param {!ServiceWorkerAgent.ServiceWorkerVersion} payload
 */
WebInspector.ServiceWorkerVersion = function(registration, payload)
{
    this.registration = registration;
    this._update(payload);
}

/**
 * @enum {string}
 */
WebInspector.ServiceWorkerVersion.Modes = {
    Installing: "installing",
    Waiting: "waiting",
    Active: "active",
    Redundant: "redundant"
}

WebInspector.ServiceWorkerVersion.prototype = {
    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerVersion} payload
     */
    _update: function(payload)
    {
        this.id = payload.versionId;
        this.scriptURL = payload.scriptURL;
        var parsedURL = new WebInspector.ParsedURL(payload.scriptURL);
        this.securityOrigin = parsedURL.securityOrigin();
        this.runningStatus = payload.runningStatus;
        this.status = payload.status;
        this.scriptLastModified = payload.scriptLastModified;
        this.scriptResponseTime = payload.scriptResponseTime;
        this.controlledClients = [];
        for (var i = 0; i < payload.controlledClients.length; ++i)
            this.controlledClients.push(payload.controlledClients[i]);
        this.targetId = payload.targetId || null;
    },

    /**
     * @return {boolean}
     */
    isStartable: function()
    {
        return !this.registration.isDeleted && this.isActivated() && this.isStopped();
    },

    /**
     * @return {boolean}
     */
    isStoppedAndRedundant: function()
    {
        return this.runningStatus === ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Stopped && this.status === ServiceWorkerAgent.ServiceWorkerVersionStatus.Redundant;
    },

    /**
     * @return {boolean}
     */
    isStopped: function()
    {
        return this.runningStatus === ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Stopped;
    },

    /**
     * @return {boolean}
     */
    isStarting: function()
    {
        return this.runningStatus === ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Starting;
    },

    /**
     * @return {boolean}
     */
    isRunning: function()
    {
        return this.runningStatus === ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Running;
    },

    /**
     * @return {boolean}
     */
    isStopping: function()
    {
        return this.runningStatus === ServiceWorkerAgent.ServiceWorkerVersionRunningStatus.Stopping;
    },

    /**
     * @return {boolean}
     */
    isNew: function()
    {
        return this.status === ServiceWorkerAgent.ServiceWorkerVersionStatus.New;
    },

    /**
     * @return {boolean}
     */
    isInstalling: function()
    {
        return this.status === ServiceWorkerAgent.ServiceWorkerVersionStatus.Installing;
    },

    /**
     * @return {boolean}
     */
    isInstalled: function()
    {
        return this.status === ServiceWorkerAgent.ServiceWorkerVersionStatus.Installed;
    },

    /**
     * @return {boolean}
     */
    isActivating: function()
    {
        return this.status === ServiceWorkerAgent.ServiceWorkerVersionStatus.Activating;
    },

    /**
     * @return {boolean}
     */
    isActivated: function()
    {
        return this.status === ServiceWorkerAgent.ServiceWorkerVersionStatus.Activated;
    },

    /**
     * @return {boolean}
     */
    isRedundant: function()
    {
        return this.status === ServiceWorkerAgent.ServiceWorkerVersionStatus.Redundant;
    },

    /**
     * @return {string}
     */
    mode: function()
    {
        if (this.isNew() || this.isInstalling())
            return WebInspector.ServiceWorkerVersion.Modes.Installing;
        else if (this.isInstalled())
            return WebInspector.ServiceWorkerVersion.Modes.Waiting;
        else if (this.isActivating() || this.isActivated())
            return WebInspector.ServiceWorkerVersion.Modes.Active;
        return WebInspector.ServiceWorkerVersion.Modes.Redundant;
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
    /** @type {!Array<!ServiceWorkerAgent.ServiceWorkerErrorMessage>} */
    this.errors = [];
}

WebInspector.ServiceWorkerRegistration.prototype = {
    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerRegistration} payload
     */
    _update: function(payload)
    {
        this._fingerprint = Symbol("fingerprint");
        this.id = payload.registrationId;
        this.scopeURL = payload.scopeURL;
        var parsedURL = new WebInspector.ParsedURL(payload.scopeURL);
        this.securityOrigin = parsedURL.securityOrigin();
        this.isDeleted = payload.isDeleted;
        this.forceUpdateOnPageLoad = payload.forceUpdateOnPageLoad;
    },

    /**
     * @return {symbol}
     */
    fingerprint: function()
    {
        return this._fingerprint;
    },

    /**
     * @return {!Map<string, !WebInspector.ServiceWorkerVersion>}
     */
    versionsByMode: function()
    {
        /** @type {!Map<string, !WebInspector.ServiceWorkerVersion>} */
        var result = new Map();
        for (var version of this.versions.values())
            result.set(version.mode(), version);
        return result;
    },

    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerVersion} payload
     * @return {!WebInspector.ServiceWorkerVersion}
     */
    _updateVersion: function(payload)
    {
        this._fingerprint = Symbol("fingerprint");
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
    _shouldBeRemoved: function()
    {
        return this._isRedundant() && (!this.errors.length || this._deleting);
    },

    clearErrors: function()
    {
        this._fingerprint = Symbol("fingerprint");
        this.errors = [];
    }
}

/**
 * @constructor
 * @param {!WebInspector.Target} target
 * @param {!WebInspector.ServiceWorkerManager} serviceWorkerManager
 * @param {!WebInspector.SubTargetsManager} subTargetsManager
 */
WebInspector.ServiceWorkerContextNamer = function(target, serviceWorkerManager, subTargetsManager)
{
    this._target = target;
    this._serviceWorkerManager = serviceWorkerManager;
    this._subTargetsManager = subTargetsManager;
    /** @type {!Map<string, !WebInspector.ServiceWorkerVersion>} */
    this._versionByTargetId = new Map();
    serviceWorkerManager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, this._registrationsUpdated, this);
    serviceWorkerManager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationDeleted, this._registrationsUpdated, this);
    WebInspector.targetManager.addModelListener(WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextCreated, this._executionContextCreated, this);
}

WebInspector.ServiceWorkerContextNamer.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _registrationsUpdated: function(event)
    {
        this._versionByTargetId.clear();
        var registrations = this._serviceWorkerManager.registrations().valuesArray();
        for (var registration of registrations) {
            var versions = registration.versions.valuesArray();
            for (var version of versions) {
                if (version.targetId)
                    this._versionByTargetId.set(version.targetId, version);
            }
        }
        this._updateAllContextLabels();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _executionContextCreated: function(event)
    {
        var executionContext = /** @type {!WebInspector.ExecutionContext} */ (event.data);
        var serviceWorkerTargetId = this._serviceWorkerTargetIdForWorker(executionContext.target());
        if (!serviceWorkerTargetId)
            return;
        this._updateContextLabel(executionContext, this._versionByTargetId.get(serviceWorkerTargetId) || null);
    },

    /**
     * @param {!WebInspector.Target} target
     * @return {?string}
     */
    _serviceWorkerTargetIdForWorker: function(target)
    {
        var parent = target.parentTarget();
        if (!parent || parent.parentTarget() !== this._target)
            return null;
        if (this._subTargetsManager.targetType(parent) !== "service_worker")
            return null;
        return this._subTargetsManager.targetId(parent);
    },

    _updateAllContextLabels: function()
    {
        for (var target of WebInspector.targetManager.targets()) {
            var serviceWorkerTargetId = this._serviceWorkerTargetIdForWorker(target);
            if (!serviceWorkerTargetId)
                continue;
            var version = this._versionByTargetId.get(serviceWorkerTargetId) || null;
            for (var context of target.runtimeModel.executionContexts())
                this._updateContextLabel(context, version);
        }
    },

    /**
     * @param {!WebInspector.ExecutionContext} context
     * @param {?WebInspector.ServiceWorkerVersion} version
     */
    _updateContextLabel: function(context, version)
    {
        var parsedUrl = context.origin.asParsedURL();
        var label = parsedUrl ? parsedUrl.lastPathComponentWithFragment() : context.name;
        if (version)
            context.setLabel(label + " #" + version.id + " (" + version.status + ")");
        else
            context.setLabel(label);
    },
}
