// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {function(!WebInspector.LiveLocation)} updateDelegate
 */
WebInspector.LiveLocation = function(updateDelegate)
{
    this._updateDelegate = updateDelegate;
}

WebInspector.LiveLocation.prototype = {
    update: function()
    {
        this._updateDelegate(this);
    },

    /**
     * @return {?WebInspector.UILocation}
     */
    uiLocation: function()
    {
        throw "Not implemented";
    },

    dispose: function()
    {
        // Overridden by subclasses.
    },

    /**
     * @return {boolean}
     */
    isBlackboxed: function()
    {
        throw "Not implemented";
    }
}
