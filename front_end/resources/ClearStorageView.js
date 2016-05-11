// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.ResourcesPanel} resourcesPanel
 */
WebInspector.ClearStorageView = function(resourcesPanel)
{
    WebInspector.VBox.call(this, true);

    this._resourcesPanel = resourcesPanel;
    this._reportView = new WebInspector.ReportView(WebInspector.UIString("Clear storage"));
    this._reportView.registerRequiredCSS("resources/clearStorageView.css");
    this._reportView.element.classList.add("clear-storage-header");
    this._reportView.show(this.contentElement);

    this._settings = new Map();
    for (var type of [ StorageAgent.StorageType.Appcache,
                       StorageAgent.StorageType.Cache_storage,
                       StorageAgent.StorageType.Cookies,
                       StorageAgent.StorageType.Indexeddb,
                       StorageAgent.StorageType.Local_storage,
                       StorageAgent.StorageType.Service_workers,
                       StorageAgent.StorageType.Websql]) {
        this._settings.set(type, WebInspector.settings.createSetting("clear-storage-" + type, true));
    }

    var application = this._reportView.appendSection(WebInspector.UIString("Application"));
    this._appendItem(application, WebInspector.UIString("Unregister service workers"), "service_workers");

    var storage = this._reportView.appendSection(WebInspector.UIString("Storage"));
    this._appendItem(storage, WebInspector.UIString("Local and session storage"), "local_storage");
    this._appendItem(storage, WebInspector.UIString("Indexed DB"), "indexeddb");
    this._appendItem(storage, WebInspector.UIString("Web SQL"), "websql");
    this._appendItem(storage, WebInspector.UIString("Cookies"), "cookies");

    var caches = this._reportView.appendSection(WebInspector.UIString("Cache"));
    this._appendItem(caches, WebInspector.UIString("Cache storage"), "cache_storage");
    this._appendItem(caches, WebInspector.UIString("Application cache"), "appcache");

    WebInspector.targetManager.observeTargets(this);
    var footer = this._reportView.appendSection("", "clear-storage-button").appendRow();
    this._clearButton = createTextButton(WebInspector.UIString("Clear site data"), this._clear.bind(this), WebInspector.UIString("Clear site data"));
    footer.appendChild(this._clearButton);
}

WebInspector.ClearStorageView.prototype = {

    /**
     * @param {!WebInspector.ReportView.Section} section
     * @param {string} title
     * @param {string} settingName
     */
    _appendItem: function(section, title, settingName)
    {
        var row = section.appendRow();
        row.appendChild(WebInspector.SettingsUI.createSettingCheckbox(title, this._settings.get(settingName), true));
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._target)
            return;
        this._target = target;
        this._updateOrigin(target.resourceTreeModel.mainFrame ? target.resourceTreeModel.mainFrame.url : "");
        WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.MainFrameNavigated, this._updateFrame, this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _updateFrame: function(event)
    {
        var frame = /** *@type {!WebInspector.ResourceTreeFrame} */ (event.data);
        this._updateOrigin(frame.url);
    },

    /**
     * @param {string} url
     */
    _updateOrigin: function(url)
    {
        this._securityOrigin = new WebInspector.ParsedURL(url).securityOrigin();
        this._reportView.setSubtitle(this._securityOrigin);
    },

    _clear: function()
    {
        var storageTypes = [];
        for (var type of this._settings.keys()) {
            if (this._settings.get(type).get())
                storageTypes.push(type);
        }

        this._target.storageAgent().clearDataForOrigin(this._securityOrigin, storageTypes.join(","));

        var set = new Set(storageTypes);
        var hasAll = set.has(StorageAgent.StorageType.All);
        if (set.has(StorageAgent.StorageType.Cookies) || hasAll)
            this._resourcesPanel.clearCookies(this._securityOrigin);

        if (set.has(StorageAgent.StorageType.Indexeddb) || hasAll) {
            for (var target of WebInspector.targetManager.targets()) {
                var indexedDBModel = WebInspector.IndexedDBModel.fromTarget(target);
                if (indexedDBModel)
                    indexedDBModel.clearForOrigin(this._securityOrigin);
            }
        }

        if (set.has(StorageAgent.StorageType.Local_storage) || hasAll) {
            var storageModel = WebInspector.DOMStorageModel.fromTarget(this._target);
            if (storageModel)
                storageModel.clearForOrigin(this._securityOrigin);
        }

        if (set.has(StorageAgent.StorageType.Websql) || hasAll) {
            var databaseModel = WebInspector.DatabaseModel.fromTarget(this._target);
            if (databaseModel) {
                databaseModel.disable();
                databaseModel.enable();
            }
        }

        if (set.has(StorageAgent.StorageType.Cache_storage) || hasAll) {
            var target = WebInspector.targetManager.mainTarget();
            if (target) {
                var model = WebInspector.ServiceWorkerCacheModel.fromTarget(target);
                if (model)
                    model.clearForOrigin(this._securityOrigin);
            }
        }

        if (set.has(StorageAgent.StorageType.Appcache) || hasAll) {
            var appcacheModel = WebInspector.ApplicationCacheModel.fromTarget(this._target);
            if (appcacheModel)
                appcacheModel.reset();
        }

        this._clearButton.disabled = true;
        this._clearButton.textContent = WebInspector.UIString("Clearing...");
        setTimeout(() => {
            this._clearButton.disabled = false;
            this._clearButton.textContent = WebInspector.UIString("Clear selected");
        }, 500);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
    },

    __proto__: WebInspector.VBox.prototype
}
