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
    showView: function(viewId) { }
}

/**
 * @interface
 */
WebInspector.ViewLocationResolver = function() { }

WebInspector.ViewLocationResolver.prototype = {
    /**
     * @param {string} locationName
     * @return {?WebInspector.ViewLocation}
     */
    resolveLocation: function(locationName) { }
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
        resolverExtension.instance().then(this._resolveLocation.bind(this, viewId, location));
    },

    /**
     * @param {string} viewId
     * @param {string} location
     * @param {!WebInspector.ViewLocationResolver} resolver
     */
    _resolveLocation: function(viewId, location, resolver)
    {
        var viewLocation = resolver.resolveLocation(location);
        if (viewLocation)
            viewLocation.showView(viewId);
    }
}

WebInspector.viewManager = new WebInspector.ViewManager();