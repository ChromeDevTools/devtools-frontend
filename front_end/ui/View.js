// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {string} title
 * @param {boolean=} isWebComponent
 */
WebInspector.View = function(title, isWebComponent)
{
    WebInspector.VBox.call(this, isWebComponent);
    this._title = title;
    /** @type {!Array<!WebInspector.ToolbarItem>} */
    this._toolbarItems = [];
}

WebInspector.View.prototype = {
    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    /**
     * @param {!WebInspector.ToolbarItem} item
     */
    addToolbarItem: function(item)
    {
        this._toolbarItems.push(item);
    },

    /**
     * @return {!Array<!WebInspector.ToolbarItem>}
     */
    toolbarItems: function()
    {
        return this._toolbarItems;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @interface
 */
WebInspector.ViewLocation = function() { }

WebInspector.ViewLocation.prototype = {
    /**
     * @param {string} viewId
     */
    showView: function(viewId) { },

    /**
     * @return {!WebInspector.Widget}
     */
    widget: function() { }
}

/**
 * @interface
 * @extends {WebInspector.ViewLocation}
 */
WebInspector.TabbedViewLocation = function() { }

WebInspector.TabbedViewLocation.prototype = {
    /**
     * @return {!WebInspector.TabbedPane}
     */
    tabbedPane: function() { },
}

/**
 * @interface
 */
WebInspector.ViewLocationResolver = function() { }

WebInspector.ViewLocationResolver.prototype = {
    /**
     * @param {string} location
     * @return {?WebInspector.ViewLocation}
     */
    revealLocation: function(location) { }
}

/**
 * @constructor
 */
WebInspector.ViewManager = function()
{
}

WebInspector.ViewManager.prototype = {
    /**
     * @param {string} viewId
     */
    showView: function(viewId)
    {
        var extensions = self.runtime.extensions("view").filter(extension => extension.descriptor()["id"] === viewId);
        if (!extensions.length) {
            console.error("Could not find view for id: '" + viewId + "'");
            return;
        }
        var extension = extensions[0];
        var location = extensions[0].descriptor()["location"];
        if (location === "drawer-view")
            WebInspector.userMetrics.drawerShown(viewId);
        var resolverExtensions = self.runtime.extensions(WebInspector.ViewLocationResolver).filter(extension => extension.descriptor()["name"] === location);
        if (!resolverExtensions.length)
            return;
        var resolverExtension = resolverExtensions[0];
        resolverExtension.instance().then(this._revealLocation.bind(this, viewId, location));
    },

    /**
     * @param {string} location
     * @param {boolean=} restoreSelection
     * @param {boolean=} enableMoreTabsButton
     * @return {!WebInspector.TabbedViewLocation}
     */
    createTabbedLocation: function(location, restoreSelection, enableMoreTabsButton)
    {
        return new WebInspector.ViewManager._TabbedLocation(this, location, restoreSelection, enableMoreTabsButton);
    },

    /**
     * @param {string} viewId
     * @param {string} location
     * @param {!WebInspector.ViewLocationResolver} resolver
     */
    _revealLocation: function(viewId, location, resolver)
    {
        var viewLocation = resolver.revealLocation(location);
        if (viewLocation)
            viewLocation.showView(viewId);
    },

    /**
     * @param {string} location
     * @return {!Array<!Runtime.Extension>}
     */
    _viewsForLocation: function(location)
    {
        return self.runtime.extensions("view").filter(extension => extension.descriptor()["location"] === location);
    }
}

/**
 * @constructor
 * @implements {WebInspector.TabbedViewLocation}
 * @param {!WebInspector.ViewManager} manager
 * @param {string} location
 * @param {boolean=} restoreSelection
 * @param {boolean=} enableMoreTabsButton
 */
WebInspector.ViewManager._TabbedLocation = function(manager, location, restoreSelection, enableMoreTabsButton)
{
    this._manager = manager;
    this._tabbedPane = new WebInspector.TabbedPane();
    this._location = location;
    /** @type {!Object.<string, !Promise.<?WebInspector.Widget>>} */
    this._promiseForId = {};

    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabClosed, this._tabClosed, this);
    this._closeableTabSetting = WebInspector.settings.createSetting(location + "-closeableTabs", {});
    if (restoreSelection)
        this._lastSelectedTabSetting = WebInspector.settings.createSetting(location + "-selectedTab", "");
    this._initialize();
    if (enableMoreTabsButton) {
        var toolbar = new WebInspector.Toolbar("drawer-toolbar");
        toolbar.appendToolbarItem(new WebInspector.ToolbarMenuButton(this._appendTabsToMenu.bind(this)));
        this._tabbedPane.insertBeforeTabStrip(toolbar.element);
        this._tabbedPane.disableOverflowMenu();
    }
}

WebInspector.ViewManager._TabbedLocation.prototype = {
    /**
     * @override
     * @return {!WebInspector.Widget}
     */
    widget: function()
    {
        return this._tabbedPane;
    },

    /**
     * @override
     * @return {!WebInspector.TabbedPane}
     */
    tabbedPane: function()
    {
        return this._tabbedPane;
    },

    _initialize: function()
    {
        /** @type {!Map.<string, !Runtime.Extension>} */
        this._extensions = new Map();
        var extensions = this._manager._viewsForLocation(this._location);

        for (var i = 0; i < extensions.length; ++i) {
            var id = extensions[i].descriptor()["id"];
            this._extensions.set(id, extensions[i]);
            if (this._isPermanentTab(id))
                this._appendTab(extensions[i]);
            else if (this._isCloseableTab(id) && this._closeableTabSetting.get()[id])
                this._appendTab(extensions[i]);
        }
    },

    wasShown: function()
    {
        if (this._wasAlreadyShown || !this._lastSelectedTabSetting)
            return;
        this._wasAlreadyShown = true;
        if (this._tabbedPane.hasTab(this._lastSelectedTabSetting.get()))
            this._tabbedPane.selectTab(this._lastSelectedTabSetting.get());
    },

    /**
     * @param {string} id
     * @return {boolean}
     */
    _isPermanentTab: function(id)
    {
        return this._extensions.get(id).descriptor()["persistence"] === "permanent" || !this._extensions.get(id).descriptor()["persistence"];
    },

    /**
     * @param {string} id
     * @return {boolean}
     */
    _isCloseableTab: function(id)
    {
        return this._extensions.get(id).descriptor()["persistence"] === "closeable";
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendTabsToMenu: function(contextMenu)
    {
        var extensions = self.runtime.extensions("view", undefined, true);
        for (var extension of extensions) {
            if (extension.descriptor()["location"] !== this._location)
                continue;
            var title = WebInspector.UIString(extension.title());
            contextMenu.appendItem(title, this.showView.bind(this, extension.descriptor()["id"]));
        }
    },

    /**
     * @param {!Runtime.Extension} extension
     */
    _appendTab: function(extension)
    {
        var descriptor = extension.descriptor();
        var id = descriptor["id"];
        var title = WebInspector.UIString(extension.title());
        var closeable = descriptor["persistence"] === "closeable" || descriptor["persistence"] === "temporary";
        this._tabbedPane.appendTab(id, title, new WebInspector.Widget(), undefined, false, closeable);
    },

    /**
     * @override
     * @param {string} id
     */
    showView: function(id)
    {
        if (!this._tabbedPane.hasTab(id))
            this._appendTab(/** @type {!Runtime.Extension} */(this._extensions.get(id)));
        this._tabbedPane.focus();
        this._tabbedPane.selectTab(id);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _tabSelected: function(event)
    {
        var tabId = /** @type {string} */ (event.data.tabId);
        if (this._lastSelectedTabSetting && event.data["isUserGesture"])
            this._lastSelectedTabSetting.set(tabId);
        if (!this._extensions.has(tabId))
            return;

        this._viewForId(tabId);

        var descriptor = this._extensions.get(tabId).descriptor();
        if (descriptor["persistence"] === "closeable") {
            var tabs = this._closeableTabSetting.get();
            if (!tabs[tabId]) {
                tabs[tabId] = true;
                this._closeableTabSetting.set(tabs);
            }
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _tabClosed: function(event)
    {
        var id = /** @type {string} */ (event.data["tabId"]);
        var tabs = this._closeableTabSetting.get();
        if (tabs[id]) {
            delete tabs[id];
            this._closeableTabSetting.set(tabs);
        }
        delete this._promiseForId[id];
    },

    /**
     * @param {string} id
     * @return {!Promise.<?WebInspector.Widget>}
     */
    _viewForId: function(id)
    {
        if (this._promiseForId[id])
            return this._promiseForId[id];

        var promise = this._extensions.get(id).instance();
        this._promiseForId[id] = /** @type {!Promise.<?WebInspector.Widget>} */ (promise);
        return promise.then(cacheView.bind(this));

        /**
         * @param {!Object} object
         * @this {WebInspector.ViewManager._TabbedLocation}
         */
        function cacheView(object)
        {
            var view = /** @type {!WebInspector.Widget} */ (object);
            this._tabbedPane.changeTabView(id, view);
            return view;
        }
    }
}

WebInspector.viewManager = new WebInspector.ViewManager();
