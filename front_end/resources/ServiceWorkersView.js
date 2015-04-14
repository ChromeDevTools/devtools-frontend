// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.ServiceWorkersView = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("resources/serviceWorkersView.css");
    this.contentElement.classList.add("service-workers-view");

    /** @type {!Set.<string>} */
    this._securityOriginHosts = new Set();
    /** @type {!Map.<string, !WebInspector.ServiceWorkerOriginElement>} */
    this._originHostToOriginElementMap = new Map();
    /** @type {!Map.<string, !WebInspector.ServiceWorkerOriginElement>} */
    this._registrationIdToOriginElementMap = new Map();

    var settingsDiv = createElementWithClass("div", "service-workers-settings");
    var debugOnStartCheckboxLabel = createCheckboxLabel(WebInspector.UIString("Open DevTools window and pause JavaScript execution on Service Worker startup for debugging."));
    this._debugOnStartCheckbox = debugOnStartCheckboxLabel.checkboxElement;
    this._debugOnStartCheckbox.addEventListener("change", this._debugOnStartCheckboxChanged.bind(this), false)
    this._debugOnStartCheckbox.disabled = true
    settingsDiv.appendChild(debugOnStartCheckboxLabel);
    this.contentElement.appendChild(settingsDiv);

    this._root = this.contentElement.createChild("ol");
    this._root.classList.add("service-workers-root");

    WebInspector.targetManager.observeTargets(this);
}

WebInspector.ServiceWorkersView.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._target)
            return;
        this._target = target;
        this._manager = this._target.serviceWorkerManager;

        this._debugOnStartCheckbox.disabled = false;
        this._debugOnStartCheckbox.checked = this._manager.debugOnStart();

        for (var registration of this._manager.registrations().values())
            this._updateRegistration(registration);

        this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, this._registrationUpdated, this);
        this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationDeleted, this._registrationDeleted, this);
        this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.DebugOnStartUpdated, this._debugOnStartUpdated, this);
        this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginAdded, this._securityOriginAdded, this);
        this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginRemoved, this._securityOriginRemoved, this);
        var securityOrigins = this._target.resourceTreeModel.securityOrigins();
        for (var i = 0; i < securityOrigins.length; ++i)
            this._addOrigin(securityOrigins[i]);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (target !== this._target)
            return;
        delete this._target;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _registrationUpdated: function(event)
    {
        var registration = /** @type {!WebInspector.ServiceWorkerRegistration} */ (event.data);
        this._updateRegistration(registration);
    },

    /**
     * @param {!WebInspector.ServiceWorkerRegistration} registration
     */
    _updateRegistration: function(registration)
    {
        var parsedURL = registration.scopeURL.asParsedURL();
        if (!parsedURL)
          return;
        var originHost = parsedURL.host;
        var originElement = this._originHostToOriginElementMap.get(originHost);
        if (!originElement) {
            originElement = new WebInspector.ServiceWorkerOriginElement(this._manager, originHost);
            if (this._securityOriginHosts.has(originHost))
                this._appendOriginNode(originElement);
            this._originHostToOriginElementMap.set(originHost, originElement);
        }
        this._registrationIdToOriginElementMap.set(registration.id, originElement);
        originElement._updateRegistration(registration);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _registrationDeleted: function(event)
    {
        var registration = /** @type {!WebInspector.ServiceWorkerRegistration} */ (event.data);
        var registrationId = registration.id;
        var originElement = this._registrationIdToOriginElementMap.get(registrationId);
        if (!originElement)
            return;
        this._registrationIdToOriginElementMap.delete(registrationId);
        originElement._deleteRegistration(registrationId);
        if (originElement._hasRegistration())
            return;
        if (this._securityOriginHosts.has(originElement._originHost))
            this._removeOriginNode(originElement);
        this._originHostToOriginElementMap.delete(originElement._originHost);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _debugOnStartUpdated: function(event)
    {
        var debugOnStart = /** @type {boolean} */ (event.data);
        this._debugOnStartCheckbox.checked = debugOnStart;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _securityOriginAdded: function(event)
    {
        this._addOrigin(/** @type {string} */ (event.data));
    },

    /**
     * @param {string} securityOrigin
     */
    _addOrigin: function(securityOrigin)
    {
        var parsedURL = securityOrigin.asParsedURL();
        if (!parsedURL)
          return;
        var originHost = parsedURL.host;
        if (this._securityOriginHosts.has(originHost))
            return;
        this._securityOriginHosts.add(originHost);
        var originElement = this._originHostToOriginElementMap.get(originHost);
        if (!originElement)
          return;
        this._appendOriginNode(originElement);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _securityOriginRemoved: function(event)
    {
        var securityOrigin = /** @type {string} */ (event.data);
        var parsedURL = securityOrigin.asParsedURL();
        if (!parsedURL)
          return;
        var originHost = parsedURL.host;
        if (!this._securityOriginHosts.has(originHost))
            return;
        this._securityOriginHosts.delete(originHost);
        var originElement = this._originHostToOriginElementMap.get(originHost);
        if (!originElement)
          return;
        this._removeOriginNode(originElement);
    },

    /**
     * @param {!WebInspector.ServiceWorkerOriginElement} originElement
     */
    _appendOriginNode: function(originElement)
    {
        this._root.appendChild(originElement._element);
    },

    /**
     * @param {!WebInspector.ServiceWorkerOriginElement} originElement
     */
    _removeOriginNode: function(originElement)
    {
        this._root.removeChild(originElement._element);
    },

    _debugOnStartCheckboxChanged: function()
    {
        if (!this._manager)
            return;
        this._manager.setDebugOnStart(this._debugOnStartCheckbox.checked);
        this._debugOnStartCheckbox.checked = this._manager.debugOnStart();
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {!WebInspector.ServiceWorkerManager} manager
 * @param {string} originHost
 */
WebInspector.ServiceWorkerOriginElement = function(manager, originHost)
{
    this._manager = manager;
    /** @type {!Map.<string, !WebInspector.SWRegistrationElement>} */
    this._registrationElements = new Map();
    this._originHost = originHost;
    this._element = createElementWithClass("div", "service-workers-origin");
    this._listItemNode = this._element.createChild("li", "service-workers-origin-title");
    this._listItemNode.createChild("div").createTextChild(originHost);
    this._childrenListNode = this._element.createChild("ol");
}

WebInspector.ServiceWorkerOriginElement.prototype = {
    /**
     * @return {boolean}
     */
    _hasRegistration: function()
    {
        return this._registrationElements.size != 0;
    },

    /**
     * @param {!WebInspector.ServiceWorkerRegistration} registration
     */
    _updateRegistration: function(registration)
    {
        var swRegistrationElement = this._registrationElements.get(registration.id);
        if (swRegistrationElement) {
            swRegistrationElement._updateRegistration(registration);
            return;
        }
        swRegistrationElement = new WebInspector.SWRegistrationElement(this._manager, registration);
        this._registrationElements.set(registration.id, swRegistrationElement);
        this._childrenListNode.appendChild(swRegistrationElement._element);
    },

    /**
     * @param {string} registrationId
     */
    _deleteRegistration: function(registrationId)
    {
        var swRegistrationElement = this._registrationElements.get(registrationId);
        if (!swRegistrationElement)
            return;
        this._registrationElements.delete(registrationId);
        this._childrenListNode.removeChild(swRegistrationElement._element);
    }
}

/**
 * @constructor
 * @param {!WebInspector.ServiceWorkerManager} manager
 * @param {!WebInspector.ServiceWorkerRegistration} registration
 */
WebInspector.SWRegistrationElement = function(manager, registration)
{
    this._manager = manager;
    this._registration = registration;
    this._element = createElementWithClass("div", "service-workers-registration");
    var headerNode = this._element.createChild("li").createChild("div", "service-workers-registration-header");
    this._titleNode = headerNode.createChild("div", "service-workers-registration-title");
    this._deleteButton = headerNode.createChild("button", "service-workers-button service-workers-delete-button");
    this._deleteButton.addEventListener("click", this._deleteButtonClicked.bind(this), false);
    this._deleteButton.title = WebInspector.UIString("Delete");
    this._pushButton = headerNode.createChild("button", "service-workers-button service-workers-push-button");
    this._pushButton.addEventListener("click", this._pushButtonClicked.bind(this), false);
    this._pushButton.title = WebInspector.UIString("Emulate push event");
    this._pushButton.disabled = true
    this._childrenListNode = this._element.createChild("ol");
    this._updateRegistration(registration);
}

WebInspector.SWRegistrationElement.prototype = {
    /**
     * @param {!WebInspector.ServiceWorkerRegistration} registration
     */
    _updateRegistration: function(registration)
    {
        this._registration = registration;
        this._titleNode.textContent = WebInspector.UIString(registration.isDeleted ? "Scope: %s - deleted" : "Scope: %s", registration.scopeURL.asParsedURL().path);
        this._deleteButton.disabled = !!registration.isDeleted;
        this._updateVersionList();
    },

    _updateVersionList: function()
    {
        var fragment = createDocumentFragment();
        var tableElement = createElementWithClass("div", "service-workers-versions-table");
        var versions = this._registration.versions.valuesArray();
        versions = versions.filter(function(version) {
            return !version.isStoppedAndRedundant() || version.errorMessages.length;
        });
        var activeVersions = versions.filter(function(version) { return version.isActivating() || version.isActivated(); });
        this._pushButton.disabled = !activeVersions.length || !!this._registration.isDeleted;

        tableElement.appendChild(this._createVersionModeRow(
            versions.filter(function(version) { return version.isNew() || version.isInstalling(); }),
            "installing",
            WebInspector.UIString("installing")));
        tableElement.appendChild(this._createVersionModeRow(
            versions.filter(function(version) { return version.isInstalled(); }),
            "waiting",
            WebInspector.UIString("waiting")));
        tableElement.appendChild(this._createVersionModeRow(
            activeVersions,
            "active",
            WebInspector.UIString("active")));
        tableElement.appendChild(this._createVersionModeRow(
            versions.filter(function(version) { return version.isRedundant(); }),
            "redundant",
            WebInspector.UIString("redundant")));
        fragment.appendChild(tableElement);
        this._childrenListNode.removeChildren();
        this._childrenListNode.appendChild(fragment);
    },

    /**
     * @param {!Array.<!WebInspector.ServiceWorkerVersion>} versions
     * @param {string} modeClass
     * @param {string} modeTitle
     */
    _createVersionModeRow: function(versions, modeClass, modeTitle)
    {
        var modeRowElement = createElementWithClass("div", "service-workers-version-mode-row  service-workers-version-mode-row-" + modeClass);
        modeRowElement.createChild("div", "service-workers-version-mode").createChild("div", "service-workers-version-mode-text").createTextChild(modeTitle);
        var versionsElement = modeRowElement.createChild("div", "service-workers-versions");
        for (var version of versions) {
            var stateRowElement = versionsElement.createChild("div", "service-workers-version-row");
            var statusDiv = stateRowElement.createChild("div", "service-workers-version-status");
            var icon = statusDiv.createChild("div", "service-workers-version-status-icon service-workers-color-" + (version.id % 10));
            icon.title = WebInspector.UIString("ID: %s", version.id);
            statusDiv.createChild("div", "service-workers-version-status-text").createTextChild(version.status);
            var runningStatusDiv = stateRowElement.createChild("div", "service-workers-version-running-status");
            if (version.isRunning() || version.isStarting()) {
                var stopButton = runningStatusDiv.createChild("button", "service-workers-button service-workers-stop-button service-workers-version-running-status-button");
                stopButton.addEventListener("click", this._stopButtonClicked.bind(this, version.id), false);
                stopButton.title = WebInspector.UIString("Stop");
            } else if (version.isStartable()) {
                var startButton = runningStatusDiv.createChild("button", "service-workers-button service-workers-start-button service-workers-version-running-status-button");
                startButton.addEventListener("click", this._startButtonClicked.bind(this), false);
                startButton.title = WebInspector.UIString("Start");
            }
            if (version.isRunning() || version.isStarting()) {
                runningStatusDiv.classList.add("service-workers-version-running-status-inspectable");
                var inspectButton = runningStatusDiv.createChild("div", "service-workers-version-inspect");
                inspectButton.createTextChild(WebInspector.UIString("inspect"));
                inspectButton.addEventListener("click", this._inspectButtonClicked.bind(this, version.id), false);
            }

            runningStatusDiv.createChild("div", "service-workers-version-running-status-text").createTextChild(version.runningStatus);
            var scriptURLDiv = stateRowElement.createChild("div", "service-workers-version-script-url");
            scriptURLDiv.createChild("div", "service-workers-version-script-url-text").createTextChild(WebInspector.UIString("Script: %s", version.scriptURL.asParsedURL().path));
            if (version.scriptLastModified) {
                var scriptLastModifiedLabel = scriptURLDiv.createChild("label", " service-workers-info service-worker-script-last-modified", "dt-icon-label");
                scriptLastModifiedLabel.type = "info-icon";
                scriptLastModifiedLabel.createTextChild(WebInspector.UIString("Last-Modified: %s", (new Date(version.scriptLastModified * 1000)).toConsoleTime()));
            }
            if (version.scriptResponseTime) {
                var scriptResponseTimeDiv = scriptURLDiv.createChild("label", " service-workers-info service-worker-script-response-time", "dt-icon-label");
                scriptResponseTimeDiv.type = "info-icon";
                scriptResponseTimeDiv.createTextChild(WebInspector.UIString("Server response time: %s", (new Date(version.scriptResponseTime * 1000)).toConsoleTime()));
            }

            var errorMessages = version.errorMessages;
            for (var index = 0; index < errorMessages.length; ++index) {
                var errorDiv = scriptURLDiv.createChild("div", "service-workers-error");
                errorDiv.createChild("label", "", "dt-icon-label").type = "error-icon";
                errorDiv.createChild("div", "service-workers-error-message").createTextChild(errorMessages[index].errorMessage);
                var script_path = errorMessages[index].sourceURL;
                var script_url;
                if (script_url = script_path.asParsedURL())
                    script_path = script_url.displayName;
                if (script_path.length && errorMessages[index].lineNumber != -1)
                    script_path = String.sprintf("(%s:%d)", script_path, errorMessages[index].lineNumber);
                errorDiv.createChild("div", "service-workers-error-line").createTextChild(script_path);
            }

        }
        if (!versions.length) {
            var stateRowElement = versionsElement.createChild("div", "service-workers-version-row");
            stateRowElement.createChild("div", "service-workers-version-status");
            stateRowElement.createChild("div", "service-workers-version-running-status");
            stateRowElement.createChild("div", "service-workers-version-script-url");
        }
        return modeRowElement;
    },

    /**
     * @param {!Event} event
     */
    _deleteButtonClicked: function(event)
    {
        this._manager.deleteRegistration(this._registration.id);
    },

    /**
     * @param {!Event} event
     */
    _pushButtonClicked: function(event)
    {
        var data = "Test push message from DevTools."
        this._manager.deliverPushMessage(this._registration.id, data);
    },

    /**
     * @param {!Event} event
     */
    _startButtonClicked: function(event)
    {
        this._manager.startWorker(this._registration.scopeURL);
    },

    /**
     * @param {string} versionId
     * @param {!Event} event
     */
    _stopButtonClicked: function(versionId, event)
    {
        this._manager.stopWorker(versionId);
    },

    /**
     * @param {string} versionId
     * @param {!Event} event
     */
    _inspectButtonClicked: function(versionId, event)
    {
        this._manager.inspectWorker(versionId);
    }
}
