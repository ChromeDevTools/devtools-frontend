// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.ContentProvider}
 * @param {string} contentURL
 * @param {!WebInspector.ResourceType} contentType
 * @param {!Promise<string>} contentGetter
 */
WebInspector.StaticContentProvider = function(contentURL, contentType, contentGetter)
{
    this._contentURL = contentURL;
    this._contentType = contentType;
    this._contentGetter = contentGetter;
}

WebInspector.StaticContentProvider.prototype = {
    /**
     * @override
     * @return {string}
     */
    contentURL: function()
    {
        return this._contentURL;
    },

    /**
     * @override
     * @return {!WebInspector.ResourceType}
     */
    contentType: function()
    {
        return this._contentType;
    },

    /**
     * @override
     * @return {!Promise<?string>}
     */
    requestContent: function()
    {
        return /** @type {!Promise<?string>} */(this._contentGetter);
    },

    /**
     * @override
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInContent: function(query, caseSensitive, isRegex, callback)
    {
        /**
         * @param {string} content
         */
        function performSearch(content)
        {
            callback(WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex));
        }

        this._contentGetter.then(performSearch);
    }
}
