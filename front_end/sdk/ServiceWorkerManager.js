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
 * @unrestricted
 */
WebInspector.ServiceWorkerManager = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.Target} target
   * @param {!WebInspector.SubTargetsManager} subTargetsManager
   */
  constructor(target, subTargetsManager) {
    super(target);
    target.registerServiceWorkerDispatcher(new WebInspector.ServiceWorkerDispatcher(this));
    this._lastAnonymousTargetId = 0;
    this._agent = target.serviceWorkerAgent();
    /** @type {!Map.<string, !WebInspector.ServiceWorkerRegistration>} */
    this._registrations = new Map();
    this.enable();
    this._forceUpdateSetting = WebInspector.settings.createSetting('serviceWorkerUpdateOnReload', false);
    if (this._forceUpdateSetting.get())
      this._forceUpdateSettingChanged();
    this._forceUpdateSetting.addChangeListener(this._forceUpdateSettingChanged, this);
    new WebInspector.ServiceWorkerContextNamer(target, this, subTargetsManager);
  }

  enable() {
    if (this._enabled)
      return;
    this._enabled = true;
    this._agent.enable();
  }

  disable() {
    if (!this._enabled)
      return;
    this._enabled = false;
    this._registrations.clear();
    this._agent.disable();
  }

  /**
   * @return {!Map.<string, !WebInspector.ServiceWorkerRegistration>}
   */
  registrations() {
    return this._registrations;
  }

  /**
   * @param {string} versionId
   * @return {?WebInspector.ServiceWorkerVersion}
   */
  findVersion(versionId) {
    for (var registration of this.registrations().values()) {
      var version = registration.versions.get(versionId);
      if (version)
        return version;
    }
    return null;
  }

  /**
   * @param {string} registrationId
   */
  deleteRegistration(registrationId) {
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
  }

  /**
   * @param {string} registrationId
   */
  updateRegistration(registrationId) {
    var registration = this._registrations.get(registrationId);
    if (!registration)
      return;
    this._agent.updateRegistration(registration.scopeURL);
  }

  /**
   * @param {string} registrationId
   * @param {string} data
   */
  deliverPushMessage(registrationId, data) {
    var registration = this._registrations.get(registrationId);
    if (!registration)
      return;
    var origin = WebInspector.ParsedURL.extractOrigin(registration.scopeURL);
    this._agent.deliverPushMessage(origin, registrationId, data);
  }

  /**
   * @param {string} registrationId
   * @param {string} tag
   * @param {boolean} lastChance
   */
  dispatchSyncEvent(registrationId, tag, lastChance) {
    var registration = this._registrations.get(registrationId);
    if (!registration)
      return;
    var origin = WebInspector.ParsedURL.extractOrigin(registration.scopeURL);
    this._agent.dispatchSyncEvent(origin, registrationId, tag, lastChance);
  }

  /**
   * @param {string} scope
   */
  _unregister(scope) {
    this._agent.unregister(scope);
  }

  /**
   * @param {string} scope
   */
  startWorker(scope) {
    this._agent.startWorker(scope);
  }

  /**
   * @param {string} scope
   */
  skipWaiting(scope) {
    this._agent.skipWaiting(scope);
  }

  /**
   * @param {string} versionId
   */
  stopWorker(versionId) {
    this._agent.stopWorker(versionId);
  }

  /**
   * @param {string} versionId
   */
  inspectWorker(versionId) {
    this._agent.inspectWorker(versionId);
  }

  /**
   * @param {!Array.<!Protocol.ServiceWorker.ServiceWorkerRegistration>} registrations
   */
  _workerRegistrationUpdated(registrations) {
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
  }

  /**
   * @param {!Array.<!Protocol.ServiceWorker.ServiceWorkerVersion>} versions
   */
  _workerVersionUpdated(versions) {
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
  }

  /**
   * @param {!Protocol.ServiceWorker.ServiceWorkerErrorMessage} payload
   */
  _workerErrorReported(payload) {
    var registration = this._registrations.get(payload.registrationId);
    if (!registration)
      return;
    registration.errors.push(payload);
    this.dispatchEventToListeners(
        WebInspector.ServiceWorkerManager.Events.RegistrationErrorAdded, {registration: registration, error: payload});
  }

  /**
   * @return {!WebInspector.Setting}
   */
  forceUpdateOnReloadSetting() {
    return this._forceUpdateSetting;
  }

  _forceUpdateSettingChanged() {
    this._agent.setForceUpdateOnPageLoad(this._forceUpdateSetting.get());
  }
};

/** @enum {symbol} */
WebInspector.ServiceWorkerManager.Events = {
  RegistrationUpdated: Symbol('RegistrationUpdated'),
  RegistrationErrorAdded: Symbol('RegistrationErrorAdded'),
  RegistrationDeleted: Symbol('RegistrationDeleted')
};

/**
 * @implements {Protocol.ServiceWorkerDispatcher}
 * @unrestricted
 */
WebInspector.ServiceWorkerDispatcher = class {
  /**
   * @param {!WebInspector.ServiceWorkerManager} manager
   */
  constructor(manager) {
    this._manager = manager;
  }

  /**
   * @override
   * @param {!Array.<!Protocol.ServiceWorker.ServiceWorkerRegistration>} registrations
   */
  workerRegistrationUpdated(registrations) {
    this._manager._workerRegistrationUpdated(registrations);
  }

  /**
   * @override
   * @param {!Array.<!Protocol.ServiceWorker.ServiceWorkerVersion>} versions
   */
  workerVersionUpdated(versions) {
    this._manager._workerVersionUpdated(versions);
  }

  /**
   * @override
   * @param {!Protocol.ServiceWorker.ServiceWorkerErrorMessage} errorMessage
   */
  workerErrorReported(errorMessage) {
    this._manager._workerErrorReported(errorMessage);
  }
};

/**
 * @unrestricted
 */
WebInspector.ServiceWorkerVersion = class {
  /**
   * @param {!WebInspector.ServiceWorkerRegistration} registration
   * @param {!Protocol.ServiceWorker.ServiceWorkerVersion} payload
   */
  constructor(registration, payload) {
    this.registration = registration;
    this._update(payload);
  }

  /**
   * @param {!Protocol.ServiceWorker.ServiceWorkerVersion} payload
   */
  _update(payload) {
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
  }

  /**
   * @return {boolean}
   */
  isStartable() {
    return !this.registration.isDeleted && this.isActivated() && this.isStopped();
  }

  /**
   * @return {boolean}
   */
  isStoppedAndRedundant() {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped &&
        this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant;
  }

  /**
   * @return {boolean}
   */
  isStopped() {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped;
  }

  /**
   * @return {boolean}
   */
  isStarting() {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Starting;
  }

  /**
   * @return {boolean}
   */
  isRunning() {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running;
  }

  /**
   * @return {boolean}
   */
  isStopping() {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopping;
  }

  /**
   * @return {boolean}
   */
  isNew() {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.New;
  }

  /**
   * @return {boolean}
   */
  isInstalling() {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installing;
  }

  /**
   * @return {boolean}
   */
  isInstalled() {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installed;
  }

  /**
   * @return {boolean}
   */
  isActivating() {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activating;
  }

  /**
   * @return {boolean}
   */
  isActivated() {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated;
  }

  /**
   * @return {boolean}
   */
  isRedundant() {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant;
  }

  /**
   * @return {string}
   */
  mode() {
    if (this.isNew() || this.isInstalling())
      return WebInspector.ServiceWorkerVersion.Modes.Installing;
    else if (this.isInstalled())
      return WebInspector.ServiceWorkerVersion.Modes.Waiting;
    else if (this.isActivating() || this.isActivated())
      return WebInspector.ServiceWorkerVersion.Modes.Active;
    return WebInspector.ServiceWorkerVersion.Modes.Redundant;
  }
};

/**
 * @enum {string}
 */
WebInspector.ServiceWorkerVersion.Modes = {
  Installing: 'installing',
  Waiting: 'waiting',
  Active: 'active',
  Redundant: 'redundant'
};

/**
 * @unrestricted
 */
WebInspector.ServiceWorkerRegistration = class {
  /**
   * @param {!Protocol.ServiceWorker.ServiceWorkerRegistration} payload
   */
  constructor(payload) {
    this._update(payload);
    /** @type {!Map.<string, !WebInspector.ServiceWorkerVersion>} */
    this.versions = new Map();
    this._deleting = false;
    /** @type {!Array<!Protocol.ServiceWorker.ServiceWorkerErrorMessage>} */
    this.errors = [];
  }

  /**
   * @param {!Protocol.ServiceWorker.ServiceWorkerRegistration} payload
   */
  _update(payload) {
    this._fingerprint = Symbol('fingerprint');
    this.id = payload.registrationId;
    this.scopeURL = payload.scopeURL;
    var parsedURL = new WebInspector.ParsedURL(payload.scopeURL);
    this.securityOrigin = parsedURL.securityOrigin();
    this.isDeleted = payload.isDeleted;
    this.forceUpdateOnPageLoad = payload.forceUpdateOnPageLoad;
  }

  /**
   * @return {symbol}
   */
  fingerprint() {
    return this._fingerprint;
  }

  /**
   * @return {!Map<string, !WebInspector.ServiceWorkerVersion>}
   */
  versionsByMode() {
    /** @type {!Map<string, !WebInspector.ServiceWorkerVersion>} */
    var result = new Map();
    for (var version of this.versions.values())
      result.set(version.mode(), version);
    return result;
  }

  /**
   * @param {!Protocol.ServiceWorker.ServiceWorkerVersion} payload
   * @return {!WebInspector.ServiceWorkerVersion}
   */
  _updateVersion(payload) {
    this._fingerprint = Symbol('fingerprint');
    var version = this.versions.get(payload.versionId);
    if (!version) {
      version = new WebInspector.ServiceWorkerVersion(this, payload);
      this.versions.set(payload.versionId, version);
      return version;
    }
    version._update(payload);
    return version;
  }

  /**
   * @return {boolean}
   */
  _isRedundant() {
    for (var version of this.versions.values()) {
      if (!version.isStoppedAndRedundant())
        return false;
    }
    return true;
  }

  /**
   * @return {boolean}
   */
  _shouldBeRemoved() {
    return this._isRedundant() && (!this.errors.length || this._deleting);
  }

  clearErrors() {
    this._fingerprint = Symbol('fingerprint');
    this.errors = [];
  }
};

/**
 * @unrestricted
 */
WebInspector.ServiceWorkerContextNamer = class {
  /**
   * @param {!WebInspector.Target} target
   * @param {!WebInspector.ServiceWorkerManager} serviceWorkerManager
   * @param {!WebInspector.SubTargetsManager} subTargetsManager
   */
  constructor(target, serviceWorkerManager, subTargetsManager) {
    this._target = target;
    this._serviceWorkerManager = serviceWorkerManager;
    this._subTargetsManager = subTargetsManager;
    /** @type {!Map<string, !WebInspector.ServiceWorkerVersion>} */
    this._versionByTargetId = new Map();
    serviceWorkerManager.addEventListener(
        WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, this._registrationsUpdated, this);
    serviceWorkerManager.addEventListener(
        WebInspector.ServiceWorkerManager.Events.RegistrationDeleted, this._registrationsUpdated, this);
    WebInspector.targetManager.addModelListener(
        WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextCreated,
        this._executionContextCreated, this);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _registrationsUpdated(event) {
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
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _executionContextCreated(event) {
    var executionContext = /** @type {!WebInspector.ExecutionContext} */ (event.data);
    var serviceWorkerTargetId = this._serviceWorkerTargetIdForWorker(executionContext.target());
    if (!serviceWorkerTargetId)
      return;
    this._updateContextLabel(executionContext, this._versionByTargetId.get(serviceWorkerTargetId) || null);
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {?string}
   */
  _serviceWorkerTargetIdForWorker(target) {
    var parent = target.parentTarget();
    if (!parent || parent.parentTarget() !== this._target)
      return null;
    var targetInfo = this._subTargetsManager.targetInfo(parent);
    if (!targetInfo || targetInfo.type !== 'service_worker')
      return null;
    return targetInfo.id;
  }

  _updateAllContextLabels() {
    for (var target of WebInspector.targetManager.targets()) {
      var serviceWorkerTargetId = this._serviceWorkerTargetIdForWorker(target);
      if (!serviceWorkerTargetId)
        continue;
      var version = this._versionByTargetId.get(serviceWorkerTargetId) || null;
      for (var context of target.runtimeModel.executionContexts())
        this._updateContextLabel(context, version);
    }
  }

  /**
   * @param {!WebInspector.ExecutionContext} context
   * @param {?WebInspector.ServiceWorkerVersion} version
   */
  _updateContextLabel(context, version) {
    var parsedUrl = context.origin.asParsedURL();
    var label = parsedUrl ? parsedUrl.lastPathComponentWithFragment() : context.name;
    if (version)
      context.setLabel(label + ' #' + version.id + ' (' + version.status + ')');
    else
      context.setLabel(label);
  }
};
