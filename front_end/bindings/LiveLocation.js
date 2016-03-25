// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @interface */
WebInspector.LiveLocation = function() {}

WebInspector.LiveLocation.prototype = {
    update: function() {},

    /**
     * @return {?WebInspector.UILocation}
     */
    uiLocation: function() {},

    dispose: function() {},

    /**
     * @return {boolean}
     */
    isBlackboxed: function() {}
}

/**
 * @constructor
 * @implements {WebInspector.LiveLocation}
 * @param {function(!WebInspector.LiveLocation)} updateDelegate
 * @param {!WebInspector.LiveLocationPool} locationPool
 */
WebInspector.LiveLocationWithPool = function(updateDelegate, locationPool)
{
    this._updateDelegate = updateDelegate;
    this._locationPool = locationPool;
    this._locationPool._add(this);
}

WebInspector.LiveLocationWithPool.prototype = {
    /**
     * @override
     */
    update: function()
    {
        this._updateDelegate(this);
    },

    /**
     * @override
     * @return {?WebInspector.UILocation}
     */
    uiLocation: function()
    {
        throw "Not implemented";
    },

    /**
     * @override
     */
    dispose: function()
    {
        this._locationPool._delete(this);
        this._updateDelegate = null;
    },

    /**
     * @override
     * @return {boolean}
     */
    isBlackboxed: function()
    {
        throw "Not implemented";
    }
}

/**
 * @constructor
 */
WebInspector.LiveLocationPool = function()
{
    this._locations = new Set();
}

WebInspector.LiveLocationPool.prototype = {
    /**
     * @param {!WebInspector.LiveLocation} location
     */
    _add: function(location)
    {
        this._locations.add(location);
    },

    /**
     * @param {!WebInspector.LiveLocation} location
     */
    _delete: function(location)
    {
        this._locations.delete(location);
    },

    disposeAll: function()
    {
        for (var location of this._locations)
            location.dispose();
    }
}
