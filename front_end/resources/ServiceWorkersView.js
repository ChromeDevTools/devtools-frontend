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

    this._reportView = new WebInspector.ReportView(WebInspector.UIString("Service Workers"));
    this._reportView.show(this.contentElement);

    this._toolbar = this._reportView.createToolbar();

    /** @type {!Map<!WebInspector.ServiceWorkerRegistration, !WebInspector.ServiceWorkersView.Section>} */
    this._sections = new Map();

    WebInspector.targetManager.observeTargets(this);
}

WebInspector.ServiceWorkersView.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._target || !target.serviceWorkerManager)
            return;
        this._target = target;
        this._manager = this._target.serviceWorkerManager;

        var forceUpdate = new WebInspector.ToolbarCheckbox(WebInspector.UIString("Force update on reload"), WebInspector.UIString("Force update Service Worker on page reload"), this._manager.forceUpdateOnReloadSetting());
        this._toolbar.appendToolbarItem(forceUpdate);
        var fallbackToNetwork = new WebInspector.ToolbarCheckbox(WebInspector.UIString("Bypass worker for network"), WebInspector.UIString("Bypass Service Worker and load resources from the network"), target.networkManager.bypassServiceWorkerSetting());
        this._toolbar.appendToolbarItem(fallbackToNetwork);
        this._toolbar.appendSpacer();
        this._showAllCheckbox = new WebInspector.ToolbarCheckbox(WebInspector.UIString("Show all"), WebInspector.UIString("Show all Service Workers regardless of the origin"));
        this._showAllCheckbox.inputElement.addEventListener("change", this._updateSectionVisibility.bind(this), false);
        this._toolbar.appendToolbarItem(this._showAllCheckbox);

        for (var registration of this._manager.registrations().values())
            this._updateRegistration(registration);

        this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationUpdated, this._registrationUpdated, this);
        this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationDeleted, this._registrationDeleted, this);
        this._manager.addEventListener(WebInspector.ServiceWorkerManager.Events.RegistrationErrorAdded, this._registrationErrorAdded, this);
        this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginAdded, this._updateSectionVisibility, this);
        this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginRemoved, this._updateSectionVisibility, this);
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

    _updateSectionVisibility: function()
    {
        var securityOrigins = new Set(this._target.resourceTreeModel.securityOrigins());
        for (var section of this._sections.values()) {
            var visible = this._showAllCheckbox.checked() || securityOrigins.has(section._registration.securityOrigin);
            section._section.element.classList.toggle("hidden", !visible);
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
     * @param {!WebInspector.Event} event
     */
    _registrationErrorAdded: function(event)
    {
        var registration = /** @type {!WebInspector.ServiceWorkerRegistration} */ (event.data["registration"]);
        var error = /** @type {!ServiceWorkerAgent.ServiceWorkerErrorMessage} */ (event.data["error"]);
        var section = this._sections.get(registration);
        if (!section)
            return;
        section._addError(error);
    },

    /**
     * @param {!WebInspector.ServiceWorkerRegistration} registration
     */
    _updateRegistration: function(registration)
    {
        var section = this._sections.get(registration);
        if (!section) {
            section = new WebInspector.ServiceWorkersView.Section(this._manager, this._reportView.appendSection(""), registration);
            this._sections.set(registration, section);
        }
        this._updateSectionVisibility();
        section._scheduleUpdate();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _registrationDeleted: function(event)
    {
        var registration = /** @type {!WebInspector.ServiceWorkerRegistration} */ (event.data);
        var section = this._sections.get(registration);
        if (section)
            section._section.remove();
        this._sections.delete(registration);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {!WebInspector.ServiceWorkerManager} manager
 * @param {!WebInspector.ReportView.Section} section
 * @param {!WebInspector.ServiceWorkerRegistration} registration
 */
WebInspector.ServiceWorkersView.Section = function(manager, section, registration)
{
    this._manager = manager;
    this._section = section;
    this._registration = registration;

    this._toolbar = section.createToolbar();
    this._toolbar.renderAsLinks();
    this._updateButton = new WebInspector.ToolbarButton(WebInspector.UIString("Update"), undefined, WebInspector.UIString("Update"));
    this._updateButton.addEventListener("click", this._updateButtonClicked.bind(this));
    this._toolbar.appendToolbarItem(this._updateButton);
    this._pushButton = new WebInspector.ToolbarButton(WebInspector.UIString("Emulate push event"), undefined, WebInspector.UIString("Push"));
    this._pushButton.addEventListener("click", this._pushButtonClicked.bind(this));
    this._toolbar.appendToolbarItem(this._pushButton);
    this._deleteButton = new WebInspector.ToolbarButton(WebInspector.UIString("Unregister service worker"), undefined, WebInspector.UIString("Unregister"));
    this._deleteButton.addEventListener("click", this._unregisterButtonClicked.bind(this));
    this._toolbar.appendToolbarItem(this._deleteButton);

    // Preserve the order.
    this._section.appendField(WebInspector.UIString("Source"));
    this._section.appendField(WebInspector.UIString("Status"));
    this._section.appendField(WebInspector.UIString("Clients"));
    this._section.appendField(WebInspector.UIString("Errors"));
    this._errorsList = this._wrapWidget(this._section.appendRow());
    this._errorsList.classList.add("service-worker-error-stack", "monospace", "hidden");

    this._linkifier = new WebInspector.Linkifier();
    /** @type {!Map<string, !WebInspector.TargetInfo>} */
    this._clientInfoCache = new Map();
    for (var error of registration.errors)
        this._addError(error);
    this._throttler = new WebInspector.Throttler(500);
}

WebInspector.ServiceWorkersView.Section.prototype = {
    _scheduleUpdate: function()
    {
        if (WebInspector.ServiceWorkersView._noThrottle) {
            this._update();
            return;
        }
        this._throttler.schedule(this._update.bind(this));
    },

    /**
     * @return {!Promise}
     */
    _update: function()
    {
        var fingerprint = this._registration.fingerprint();
        if (fingerprint === this._fingerprint)
            return Promise.resolve();
        this._fingerprint = fingerprint;

        this._toolbar.setEnabled(!this._registration.isDeleted);

        var versions = this._registration.versionsByMode();
        var title = this._registration.isDeleted ? WebInspector.UIString("%s - deleted", this._registration.scopeURL) : this._registration.scopeURL;
        this._section.setTitle(title);

        var active = versions.get(WebInspector.ServiceWorkerVersion.Modes.Active);
        var waiting = versions.get(WebInspector.ServiceWorkerVersion.Modes.Waiting);
        var installing = versions.get(WebInspector.ServiceWorkerVersion.Modes.Installing);

        var statusValue = this._wrapWidget(this._section.appendField(WebInspector.UIString("Status")));
        statusValue.removeChildren();
        var versionsStack = statusValue.createChild("div", "service-worker-version-stack");
        versionsStack.createChild("div", "service-worker-version-stack-bar");

        if (active) {
            var scriptElement = this._section.appendField(WebInspector.UIString("Source"));
            scriptElement.removeChildren();
            var components = WebInspector.ParsedURL.splitURLIntoPathComponents(active.scriptURL);
            scriptElement.appendChild(WebInspector.linkifyURLAsNode(active.scriptURL, components.peekLast()));
            scriptElement.createChild("div", "report-field-value-subtitle").textContent = WebInspector.UIString("Last modified %s", new Date(active.scriptLastModified * 1000).toLocaleString());

            var activeEntry = versionsStack.createChild("div", "service-worker-version");
            activeEntry.createChild("div", "service-worker-active-circle");
            activeEntry.createChild("span").textContent = WebInspector.UIString("#%s activated and is %s", active.id, active.runningStatus);

            if (active.isRunning() || active.isStarting()) {
                createLink(activeEntry, WebInspector.UIString("stop"), this._stopButtonClicked.bind(this, active.id));
                if (!this._manager.targetForVersionId(active.id))
                    createLink(activeEntry, WebInspector.UIString("inspect"), this._inspectButtonClicked.bind(this, active.id));
            } else if (active.isStartable()) {
                createLink(activeEntry, WebInspector.UIString("start"), this._startButtonClicked.bind(this));
            }

            var clientsList = this._wrapWidget(this._section.appendField(WebInspector.UIString("Clients")));
            clientsList.removeChildren();
            this._section.setFieldVisible(WebInspector.UIString("Clients"), active.controlledClients.length);
            for (var client of active.controlledClients) {
                var clientLabelText = clientsList.createChild("div", "service-worker-client");
                if (this._clientInfoCache.has(client))
                    this._updateClientInfo(clientLabelText, /** @type {!WebInspector.TargetInfo} */(this._clientInfoCache.get(client)));
                this._manager.getTargetInfo(client, this._onClientInfo.bind(this, clientLabelText));
            }
        }

        if (waiting) {
            var waitingEntry = versionsStack.createChild("div", "service-worker-version");
            waitingEntry.createChild("div", "service-worker-waiting-circle");
            waitingEntry.createChild("span").textContent = WebInspector.UIString("#%s waiting to activate", waiting.id);
            createLink(waitingEntry, WebInspector.UIString("skipWaiting"), this._skipButtonClicked.bind(this));
            waitingEntry.createChild("div", "service-worker-subtitle").textContent = new Date(waiting.scriptLastModified * 1000).toLocaleString();
            if (!this._manager.targetForVersionId(waiting.id) && (waiting.isRunning() || waiting.isStarting()))
                createLink(waitingEntry, WebInspector.UIString("inspect"), this._inspectButtonClicked.bind(this, waiting.id));
        }
        if (installing) {
            var installingEntry = versionsStack.createChild("div", "service-worker-version");
            installingEntry.createChild("div", "service-worker-installing-circle");
            installingEntry.createChild("span").textContent = WebInspector.UIString("#%s installing", installing.id);
            installingEntry.createChild("div", "service-worker-subtitle").textContent = new Date(installing.scriptLastModified * 1000).toLocaleString();
            if (!this._manager.targetForVersionId(installing.id) && (installing.isRunning() || installing.isStarting()))
                createLink(installingEntry, WebInspector.UIString("inspect"), this._inspectButtonClicked.bind(this, installing.id));
        }

        this._section.setFieldVisible(WebInspector.UIString("Errors"), !!this._registration.errors.length);
        var errorsValue = this._wrapWidget(this._section.appendField(WebInspector.UIString("Errors")));
        var errorsLabel = createLabel(String(this._registration.errors.length), "error-icon");
        errorsLabel.classList.add("service-worker-errors-label");
        errorsValue.appendChild(errorsLabel);
        this._moreButton = createLink(errorsValue, this._errorsList.classList.contains("hidden") ? WebInspector.UIString("details") : WebInspector.UIString("hide"),  this._moreErrorsButtonClicked.bind(this));
        createLink(errorsValue, WebInspector.UIString("clear"), this._clearErrorsButtonClicked.bind(this));

        /**
         * @param {!Element} parent
         * @param {string} title
         * @param {function()} listener
         * @return {!Element}
         */
        function createLink(parent, title, listener)
        {
            var span = parent.createChild("span", "link");
            span.textContent = title;
            span.addEventListener("click", listener, false);
            return span;
        }
        return Promise.resolve();
    },

    /**
     * @param {!ServiceWorkerAgent.ServiceWorkerErrorMessage} error
     */
    _addError: function(error)
    {
        var target = this._manager.targetForVersionId(error.versionId);
        var message = this._errorsList.createChild("div");
        if (this._errorsList.childElementCount > 100)
            this._errorsList.firstElementChild.remove();
        message.appendChild(this._linkifier.linkifyScriptLocation(target, null, error.sourceURL, error.lineNumber));
        message.appendChild(createLabel("#" + error.versionId + ": " + error.errorMessage, "error-icon"));
    },

    _unregisterButtonClicked: function()
    {
        this._manager.deleteRegistration(this._registration.id);
    },

    _updateButtonClicked: function()
    {
        this._manager.updateRegistration(this._registration.id);
    },

    _pushButtonClicked: function()
    {
        var data = "Test push message from DevTools."
        this._manager.deliverPushMessage(this._registration.id, data);
    },

    /**
     * @param {!Element} element
     * @param {?WebInspector.TargetInfo} targetInfo
     */
    _onClientInfo: function(element, targetInfo)
    {
        if (!targetInfo)
            return;
        this._clientInfoCache.set(targetInfo.id, targetInfo);
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
        element.createTextChild(targetInfo.url);
        var focusLabel = element.createChild("label", "link");
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

    _startButtonClicked: function()
    {
        this._manager.startWorker(this._registration.scopeURL);
    },

    _skipButtonClicked: function()
    {
        this._manager.skipWaiting(this._registration.scopeURL);
    },

    /**
     * @param {string} versionId
     */
    _stopButtonClicked: function(versionId)
    {
        this._manager.stopWorker(versionId);
    },

    _moreErrorsButtonClicked: function()
    {
        var newVisible = this._errorsList.classList.contains("hidden");
        this._moreButton.textContent = newVisible ? WebInspector.UIString("hide") : WebInspector.UIString("details");
        this._errorsList.classList.toggle("hidden", !newVisible);
    },

    _clearErrorsButtonClicked: function()
    {
        this._errorsList.removeChildren();
        this._registration.clearErrors();
        this._scheduleUpdate();
        if (!this._errorsList.classList.contains("hidden"))
            this._moreErrorsButtonClicked();
    },

    /**
     * @param {string} versionId
     */
    _inspectButtonClicked: function(versionId)
    {
        this._manager.inspectWorker(versionId);
    },

    /**
     * @param {!Element} container
     * @return {!Element}
     */
    _wrapWidget: function(container)
    {
        var shadowRoot = WebInspector.createShadowRootWithCoreStyles(container);
        WebInspector.appendStyle(shadowRoot, "resources/serviceWorkersView.css");
        var contentElement = createElement("div");
        shadowRoot.appendChild(contentElement);
        return contentElement;
    },

    _dispose: function()
    {
        this._linkifier.dispose();
        if (this._pendingUpdate)
            clearTimeout(this._pendingUpdate);
    }
}
