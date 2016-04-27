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


    /** @type {boolean} */
    this._showAll = false;
    /** @type {!Set.<string>} */
    this._securityOriginHosts = new Set();
    /** @type {!Map.<string, !WebInspector.ServiceWorkerOriginWidget>} */
    this._originHostToOriginWidgetMap = new Map();
    /** @type {!Map.<string, !WebInspector.ServiceWorkerOriginWidget>} */
    this._registrationIdToOriginWidgetMap = new Map();

    this._toolbar = new WebInspector.Toolbar("", this.contentElement);

    this._root = this.contentElement.createChild("div");
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

        var forceUpdate = new WebInspector.ToolbarCheckbox(WebInspector.UIString("Update worker on reload"), WebInspector.UIString("Update Service Worker on page reload"), this._manager.forceUpdateOnReloadSetting());
        this._toolbar.appendToolbarItem(forceUpdate);
        var fallbackToNetwork = new WebInspector.ToolbarCheckbox(WebInspector.UIString("Bypass worker for network"), WebInspector.UIString("Bypass Service Worker and load resources from the network"), target.networkManager.bypassServiceWorkerSetting());
        this._toolbar.appendToolbarItem(fallbackToNetwork);
        this._toolbar.appendSpacer();
        this._showAllCheckbox = new WebInspector.ToolbarCheckbox(WebInspector.UIString("Show all"), WebInspector.UIString("Show all Service Workers regardless of the scope"));
        this._showAllCheckbox.inputElement.addEventListener("change", this._onShowAllCheckboxChanged.bind(this), false);
        this._toolbar.appendToolbarItem(this._showAllCheckbox);

        for (var registration of this._manager.registrations().values())
            this._updateRegistration(registration);

        this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, this._registrationUpdated, this);
        this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationDeleted, this._registrationDeleted, this);
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
     * @param {!Event} event
     */
    _onShowAllCheckboxChanged: function(event)
    {
        this._showAll = this._showAllCheckbox.checked();
        if (this._showAll) {
            for (var originWidget of this._originHostToOriginWidgetMap.values()) {
                if (!originWidget.parentWidget())
                    originWidget.show(this._root);
            }
        } else {
            for (var originWidget of this._originHostToOriginWidgetMap.values()) {
                if (originWidget.parentWidget() && !this._securityOriginHosts.has(originWidget._originHost))
                    originWidget.detach();
            }
        }
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
        var originWidget = this._originHostToOriginWidgetMap.get(originHost);
        if (!originWidget) {
            originWidget = new WebInspector.ServiceWorkerOriginWidget(this._manager, originHost);
            if (this._securityOriginHosts.has(originHost) || this._showAll)
                originWidget.show(this._root);
            this._originHostToOriginWidgetMap.set(originHost, originWidget);
        }
        this._registrationIdToOriginWidgetMap.set(registration.id, originWidget);
        originWidget._updateRegistration(registration);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _registrationDeleted: function(event)
    {
        var registration = /** @type {!WebInspector.ServiceWorkerRegistration} */ (event.data);
        var registrationId = registration.id;
        var originWidget = this._registrationIdToOriginWidgetMap.get(registrationId);
        if (!originWidget)
            return;
        this._registrationIdToOriginWidgetMap.delete(registrationId);
        originWidget._deleteRegistration(registrationId);
        if (originWidget._hasRegistration())
            return;
        if (originWidget.parentWidget())
            originWidget.detach();
        this._originHostToOriginWidgetMap.delete(originWidget._originHost);
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
        var originWidget = this._originHostToOriginWidgetMap.get(originHost);
        if (!originWidget)
          return;
        originWidget.show(this._root);
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
        if (this._showAll)
           return;
        var originWidget = this._originHostToOriginWidgetMap.get(originHost);
        if (!originWidget)
          return;
        originWidget.detach();
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.ServiceWorkerManager} manager
 * @param {string} originHost
 */
WebInspector.ServiceWorkerOriginWidget = function(manager, originHost)
{
    WebInspector.VBox.call(this);
    this._manager = manager;
    /** @type {!Map.<string, !WebInspector.SWRegistrationWidget>} */
    this._registrationWidgets = new Map();
    this._originHost = originHost;
    this.element.classList.add("service-workers-origin");
    this._titleElement = this.element.createChild("span", "service-workers-origin-title");
}

WebInspector.ServiceWorkerOriginWidget.prototype = {
    /**
     * @return {boolean}
     */
    _hasRegistration: function()
    {
        return this._registrationWidgets.size != 0;
    },

    /**
     * @param {!WebInspector.ServiceWorkerRegistration} registration
     */
    _updateRegistration: function(registration)
    {
        this._titleElement.setTextAndTitle(WebInspector.UIString(registration.isDeleted ? "%s%s - deleted" : "%s%s", this._originHost, registration.scopeURL.asParsedURL().path));

        var registrationWidget = this._registrationWidgets.get(registration.id);
        if (registrationWidget) {
            registrationWidget._updateRegistration(registration);
            return;
        }
        registrationWidget = new WebInspector.SWRegistrationWidget(this._manager, this, registration);
        this._registrationWidgets.set(registration.id, registrationWidget);
        registrationWidget.show(this.element);
    },

    /**
     * @param {string} registrationId
     */
    _deleteRegistration: function(registrationId)
    {
        var registrationWidget = this._registrationWidgets.get(registrationId);
        if (!registrationWidget)
            return;
        this._registrationWidgets.delete(registrationId);
        registrationWidget.detach();
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.ServiceWorkerManager} manager
 * @param {!WebInspector.ServiceWorkerOriginWidget} originWidget
 * @param {!WebInspector.ServiceWorkerRegistration} registration
 */
WebInspector.SWRegistrationWidget = function(manager, originWidget, registration)
{
    WebInspector.VBox.call(this);
    this._manager = manager;
    this._originWidget = originWidget;
    this._registration = registration;
    this.element.classList.add("service-workers-registration");

    var toolbar = new WebInspector.Toolbar("", this.element);
    this._updateButton = new WebInspector.ToolbarButton(WebInspector.UIString("Update"), "refresh-toolbar-item", WebInspector.UIString("Update"));
    this._updateButton.addEventListener("click", this._updateButtonClicked.bind(this));
    toolbar.appendToolbarItem(this._updateButton);

    toolbar.appendSeparator();
    this._pushButton = new WebInspector.ToolbarButton(WebInspector.UIString("Emulate push event"), "notification-toolbar-item", WebInspector.UIString("Push"));
    this._pushButton.addEventListener("click", this._pushButtonClicked.bind(this));
    toolbar.appendToolbarItem(this._pushButton);
    toolbar.appendSpacer();
    this._deleteButton = new WebInspector.ToolbarButton(WebInspector.UIString("Unregister service worker"), "garbage-collect-toolbar-item", WebInspector.UIString("Unregister"));
    this._deleteButton.addEventListener("click", this._deleteButtonClicked.bind(this));
    toolbar.appendToolbarItem(this._deleteButton);

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    var modes = WebInspector.ServiceWorkerVersion.Modes;
    this._tabbedPane.appendTab(modes.Installing, WebInspector.UIString("Installing"), new WebInspector.VBox());
    this._tabbedPane.appendTab(modes.Waiting, WebInspector.UIString("Waiting"), new WebInspector.VBox());
    this._tabbedPane.appendTab(modes.Active, WebInspector.UIString("Active"), new WebInspector.VBox());
    this._tabbedPane.appendTab(modes.Redundant, WebInspector.UIString("Redundant"), new WebInspector.VBox());
    this._tabbedPane.show(this.element);

    /** @type {!Map<string, !WebInspector.SWVersionWidget>} */
    this._versionWidgets = new Map();

    this._updateRegistration(registration);
}

WebInspector.SWRegistrationWidget.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _tabSelected: function(event)
    {
        if (event.data["isUserGesture"])
            this._lastManuallySelectedTab = event.data["tabId"];
    },

    /**
     * @param {!WebInspector.ServiceWorkerRegistration} registration
     */
    _updateRegistration: function(registration)
    {
        this._registration = registration;
        this._updateButton.setEnabled(!registration.isDeleted);
        this._deleteButton.setEnabled(!registration.isDeleted);

        /** @type {!Map<string, !WebInspector.SWVersionWidget>} */
        var versionWidgets = new Map();

        // Remove all the redundant workers that are older than the
        // active version.
        var versions = registration.versions.valuesArray();
        var activeVersion = versions.find(version => version.mode() === WebInspector.ServiceWorkerVersion.Modes.Active);
        if (activeVersion) {
            versions = versions.filter(version => {
                if (version.mode() == WebInspector.ServiceWorkerVersion.Modes.Redundant)
                    return version.scriptLastModified > activeVersion.scriptLastModified;
                return true;
            });
        }

        var firstMode;
        var modesWithVersions = new Set();
        for (var version of versions) {
            if (version.isStoppedAndRedundant() && !version.errorMessages.length)
                continue;
            var mode = version.mode();
            if (!firstMode)
                firstMode = mode;
            modesWithVersions.add(mode);
            var view = this._tabbedPane.tabView(mode);
            var versionWidget = this._versionWidgets.get(version.id);
            if (versionWidget)
                versionWidget._updateVersion(version);
            else
                versionWidget = new WebInspector.SWVersionWidget(this._manager, this._registration.scopeURL, version);
            versionWidget.show(view.element, view.element.firstElementChild);
            versionWidgets.set(version.id, versionWidget);
        }
        for (var id of this._versionWidgets.keys()) {
            if (!versionWidgets.has(id))
                this._versionWidgets.get(id).detach();
        }
        this._versionWidgets = versionWidgets;

        for (var id of this._tabbedPane.tabIds())
            this._tabbedPane.setTabEnabled(id, modesWithVersions.has(id));

        this._pushButton.setEnabled(modesWithVersions.has(WebInspector.ServiceWorkerVersion.Modes.Active) && !this._registration.isDeleted);

        if (modesWithVersions.has(this._lastManuallySelectedTab)) {
            this._tabbedPane.selectTab(this._lastManuallySelectedTab);
            return;
        }
        if (activeVersion) {
            this._tabbedPane.selectTab(WebInspector.ServiceWorkerVersion.Modes.Active);
            return;
        }
        if (firstMode)
            this._tabbedPane.selectTab(firstMode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _deleteButtonClicked: function(event)
    {
        this._manager.deleteRegistration(this._registration.id);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _updateButtonClicked: function(event)
    {
        this._manager.updateRegistration(this._registration.id);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _pushButtonClicked: function(event)
    {
        var data = "Test push message from DevTools."
        this._manager.deliverPushMessage(this._registration.id, data);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.ServiceWorkerManager} manager
 * @param {string} scopeURL
 * @param {!WebInspector.ServiceWorkerVersion} version
 */
WebInspector.SWVersionWidget = function(manager, scopeURL, version)
{
    WebInspector.VBox.call(this);
    this._manager = manager;
    this._scopeURL = scopeURL;
    this._version = version;
    this.element.classList.add("service-workers-version", "flex-none");

    /**
     * @type {!Object.<string, !WebInspector.TargetInfo>}
     */
    this._clientInfoCache = {};
    this._createElements();
    this._updateVersion(version);
}

WebInspector.SWVersionWidget.prototype = {
    _createElements: function()
    {
        var panel = createElementWithClass("div", "service-workers-versions-panel");
        var leftPanel = panel.createChild("div", "service-workers-versions-panel-top");
        var rightPanel = panel.createChild("div", "service-workers-versions-panel-bottom");
        this._scriptCell = this._addTableRow(leftPanel, WebInspector.UIString("URL"));
        this._workerCell = this._addTableRow(leftPanel, WebInspector.UIString("State"));
        this._updatedCell = this._addTableRow(leftPanel, WebInspector.UIString("Updated"));
        this._updatedCell.classList.add("service-worker-script-response-time");
        this._scriptLastModifiedCell = this._addTableRow(leftPanel, WebInspector.UIString("Last-Modified"));
        this._scriptLastModifiedCell.classList.add("service-worker-script-last-modified");
        rightPanel.createChild("div", "service-workers-versions-table-title").createTextChild(WebInspector.UIString("Recent messages"));
        this._messagesPanel = rightPanel.createChild("div", "service-workers-versions-table-messages-content");
        this._clientsTitle = rightPanel.createChild("div", "service-workers-versions-table-title");
        this._clientsTitle.createTextChild(WebInspector.UIString("Controlled clients"));
        this._clientsPanel = rightPanel.createChild("div", "service-workers-versions-table-clients-content");
        this.element.appendChild(panel);
    },

    /**
     * @param {!WebInspector.ServiceWorkerVersion} version
     */
    _updateVersion: function(version)
    {
        this._workerCell.removeChildren();
        if (version.isRunning() || version.isStarting() || version.isStartable()) {
            var runningStatusCell = this._workerCell.createChild("div", "service-workers-versions-table-worker-running-status-cell");
            var runningStatusLeftCell = runningStatusCell.createChild("div");
            var runningStatusRightCell = runningStatusCell.createChild("div");
            if (version.isRunning() || version.isStarting()) {
                var toolbar = new WebInspector.Toolbar("", runningStatusRightCell);
                var stopButton = new WebInspector.ToolbarButton(WebInspector.UIString("Stop"), "stop-toolbar-item");
                stopButton.addEventListener("click", this._stopButtonClicked.bind(this, version.id));
                toolbar.appendToolbarItem(stopButton);
            } else if (version.isStartable()) {
                var toolbar = new WebInspector.Toolbar("", runningStatusRightCell);
                var startButton = new WebInspector.ToolbarButton(WebInspector.UIString("Start"), "play-toolbar-item");
                startButton.addEventListener("click", this._startButtonClicked.bind(this));
                toolbar.appendToolbarItem(startButton);
            }
            runningStatusLeftCell.setTextAndTitle(version.runningStatus);
            if ((version.isRunning() || version.isStarting()) && !this._manager.hasWorkerWithVersionId(version.id)) {
                var inspectButton = runningStatusLeftCell.createChild("span", "service-workers-versions-table-running-status-inspect");
                inspectButton.setTextAndTitle(WebInspector.UIString("inspect"));
                inspectButton.addEventListener("click", this._inspectButtonClicked.bind(this, version.id), false);
            }
        } else {
            this._workerCell.setTextAndTitle(version.runningStatus);
        }

        this._scriptCell.setTextAndTitle(version.scriptURL.asParsedURL().path);
        this._updatedCell.setTextAndTitle(version.scriptResponseTime ? (new Date(version.scriptResponseTime * 1000)).toConsoleTime() : "");
        this._scriptLastModifiedCell.setTextAndTitle(version.scriptLastModified ? (new Date(version.scriptLastModified * 1000)).toConsoleTime() : "");

        this._messagesPanel.removeChildren();
        if (version.scriptLastModified) {
            var scriptLastModifiedLabel = this._messagesPanel.createChild("label", " service-workers-info service-worker-script-last-modified", "dt-icon-label");
            scriptLastModifiedLabel.type = "info-icon";
            scriptLastModifiedLabel.createTextChild(WebInspector.UIString("Last-Modified: %s", (new Date(version.scriptLastModified * 1000)).toConsoleTime()));
        }
        if (version.scriptResponseTime) {
            var scriptResponseTimeDiv = this._messagesPanel.createChild("label", " service-workers-info service-worker-script-response-time", "dt-icon-label");
            scriptResponseTimeDiv.type = "info-icon";
            scriptResponseTimeDiv.createTextChild(WebInspector.UIString("Server response time: %s", (new Date(version.scriptResponseTime * 1000)).toConsoleTime()));
        }

        var errorMessages = version.errorMessages;
        for (var index = 0; index < errorMessages.length; ++index) {
            var errorDiv = this._messagesPanel.createChild("div", "service-workers-error");
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

        this._clientsTitle.classList.toggle("hidden", version.controlledClients.length == 0);

        this._clientsPanel.removeChildren();
        for (var i = 0; i < version.controlledClients.length; ++i) {
            var client = version.controlledClients[i];
            var clientLabelText = this._clientsPanel.createChild("div", "service-worker-client");
            if (this._clientInfoCache[client]) {
                this._updateClientInfo(clientLabelText, this._clientInfoCache[client]);
            }
            this._manager.getTargetInfo(client, this._onClientInfo.bind(this, clientLabelText));
        }
    },

    /**
     * @param {!Element} tableElement
     * @param {string} title
     * @return {!Element}
     */
    _addTableRow: function(tableElement, title)
    {
        var rowElement = tableElement.createChild("div", "service-workers-versions-table-row");
        rowElement.createChild("div", "service-workers-versions-table-row-title").setTextAndTitle(title);
        return rowElement.createChild("div", "service-workers-versions-table-row-content");
    },

    /**
     * @param {!Element} element
     * @param {?WebInspector.TargetInfo} targetInfo
     */
    _onClientInfo: function(element, targetInfo)
    {
        if (!targetInfo)
            return;
        this._clientInfoCache[targetInfo.id] = targetInfo;
        this._updateClientInfo(element, targetInfo);
    },

    /**
     * @param {!Element} element
     * @param {!WebInspector.TargetInfo} targetInfo
     */
    _updateClientInfo: function(element, targetInfo)
    {
        if (!(targetInfo.isWebContents() || targetInfo.isFrame())) {
            element.createTextChild(WebInspector.UIString("Worker: %s", targetInfo.url));
            return;
        }
        element.removeChildren();
        element.createTextChild(WebInspector.UIString("Tab: %s", targetInfo.url));
        var focusLabel = element.createChild("label", "service-worker-client-focus");
        focusLabel.createTextChild("focus");
        focusLabel.addEventListener("click", this._activateTarget.bind(this, targetInfo.id), true);
    },

    /**
     * @param {string} targetId
     */
    _activateTarget: function(targetId)
    {
        this._manager.activateTarget(targetId);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _startButtonClicked: function(event)
    {
        this._manager.startWorker(this._scopeURL);
    },

    /**
     * @param {string} versionId
     * @param {!WebInspector.Event} event
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
    },

    __proto__: WebInspector.VBox.prototype
}
