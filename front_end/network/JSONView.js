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
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.Searchable}
 * @param {!WebInspector.ParsedJSON} parsedJSON
 */
WebInspector.JSONView = function(parsedJSON)
{
    WebInspector.VBox.call(this);
    this._parsedJSON = parsedJSON;
    this.element.classList.add("json-view");

    /** @type {?WebInspector.SearchableView} */
    this._searchableView;
    /** @type {!WebInspector.ObjectPropertiesSection} */
    this._treeOutline;
    /** @type {number} */
    this._currentSearchFocusIndex = 0;
    /** @type {!Array.<!TreeElement>} */
    this._currentSearchTreeElements = [];
    /** @type {?RegExp} */
    this._searchRegex = null;
}

/**
 * @param {!WebInspector.ParsedJSON} parsedJSON
 * @return {!WebInspector.SearchableView}
 */
WebInspector.JSONView.createSearchableView = function(parsedJSON)
{
    var jsonView = new WebInspector.JSONView(parsedJSON);
    var searchableView = new WebInspector.SearchableView(jsonView);
    searchableView.setPlaceholder(WebInspector.UIString("Find"));
    jsonView._searchableView = searchableView;
    jsonView.show(searchableView.element);
    jsonView.element.setAttribute("tabIndex", 0);
    return searchableView;
}

/**
 * @param {?string} text
 * @return {!Promise<?WebInspector.ParsedJSON>}
 */
WebInspector.JSONView.parseJSON = function(text)
{
    var returnObj = null;
    if (text)
        returnObj = WebInspector.JSONView._extractJSON(/** @type {string} */ (text));
    if (!returnObj)
        return Promise.resolve(/** @type {?WebInspector.ParsedJSON} */ (null));
    return WebInspector.formatterWorkerPool.runTask("relaxedJSONParser", {content: returnObj.data})
        .then(handleReturnedJSON)

    /**
     * @param {?MessageEvent} event
     * @return {?WebInspector.ParsedJSON}
     */
    function handleReturnedJSON(event)
    {
        if (!event || !event.data)
            return null;
        returnObj.data = event.data;
        return returnObj;
    }
}

/**
 * @param {string} text
 * @return {?WebInspector.ParsedJSON}
 */
WebInspector.JSONView._extractJSON = function(text)
{
    // Do not treat HTML as JSON.
    if (text.startsWith("<"))
        return null;
    var inner = WebInspector.JSONView._findBrackets(text, "{", "}");
    var inner2 = WebInspector.JSONView._findBrackets(text, "[", "]");
    inner = inner2.length > inner.length ? inner2 : inner;

    // Return on blank payloads or on payloads significantly smaller than original text.
    if (inner.length === -1 || text.length - inner.length > 80)
        return null;

    var prefix = text.substring(0, inner.start);
    var suffix = text.substring(inner.end + 1);
    text = text.substring(inner.start, inner.end + 1);

    // Only process valid JSONP.
    if (suffix.trim().length && !(suffix.trim().startsWith(")") && prefix.trim().endsWith("(")))
        return null;

    return new WebInspector.ParsedJSON(text, prefix, suffix);
}

/**
 * @param {string} text
 * @param {string} open
 * @param {string} close
 * @return {{start: number, end: number, length: number}}
 */
WebInspector.JSONView._findBrackets = function(text, open, close)
{
    var start = text.indexOf(open);
    var end = text.lastIndexOf(close);
    var length = end - start - 1;
    if (start == -1 || end == -1 || end < start)
        length = -1;
    return {start: start, end: end, length: length};
}

WebInspector.JSONView.prototype = {
    wasShown: function()
    {
        this._initialize();
    },

    _initialize: function()
    {
        if (this._initialized)
            return;
        this._initialized = true;

        var obj = WebInspector.RemoteObject.fromLocalObject(this._parsedJSON.data);
        var title = this._parsedJSON.prefix + obj.description + this._parsedJSON.suffix;
        this._treeOutline = new WebInspector.ObjectPropertiesSection(obj, title);
        this._treeOutline.setEditable(false);
        this._treeOutline.expand();
        this.element.appendChild(this._treeOutline.element);
    },

    /**
     * @param {number} index
     */
    _jumpToMatch: function(index)
    {
        if (!this._searchRegex)
            return;
        var previousFocusElement = this._currentSearchTreeElements[this._currentSearchFocusIndex];
        if (previousFocusElement)
            previousFocusElement.setSearchRegex(this._searchRegex);

        var newFocusElement = this._currentSearchTreeElements[index];
        if (newFocusElement) {
            this._updateSearchIndex(index);
            newFocusElement.setSearchRegex(this._searchRegex, WebInspector.highlightedCurrentSearchResultClassName);
            newFocusElement.reveal();
        } else {
            this._updateSearchIndex(0);
        }
    },

    /**
     * @param {number} count
     */
    _updateSearchCount: function(count)
    {
        if (!this._searchableView)
            return;
        this._searchableView.updateSearchMatchesCount(count);
    },

    /**
     * @param {number} index
     */
    _updateSearchIndex: function(index)
    {
        this._currentSearchFocusIndex = index;
        if (!this._searchableView)
            return;
        this._searchableView.updateCurrentMatchIndex(index);
    },

    /**
     * @override
     */
    searchCanceled: function()
    {
        this._searchRegex = null;
        this._currentSearchTreeElements = [];

        for (var element = this._treeOutline.rootElement(); element; element = element.traverseNextTreeElement(false)) {
            if (!(element instanceof WebInspector.ObjectPropertyTreeElement))
                continue;
            element.revertHighlightChanges();
        }
        this._updateSearchCount(0);
        this._updateSearchIndex(0);
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(searchConfig, shouldJump, jumpBackwards)
    {
        var newIndex = this._currentSearchFocusIndex;
        var previousSearchFocusElement = this._currentSearchTreeElements[newIndex];
        this.searchCanceled();
        this._searchRegex = searchConfig.toSearchRegex(true);

        for (var element = this._treeOutline.rootElement(); element; element = element.traverseNextTreeElement(false)) {
            if (!(element instanceof WebInspector.ObjectPropertyTreeElement))
                continue;
            var hasMatch = element.setSearchRegex(this._searchRegex);
            if (hasMatch)
                this._currentSearchTreeElements.push(element);
            if (previousSearchFocusElement === element) {
                var currentIndex = this._currentSearchTreeElements.length - 1;
                if (hasMatch || jumpBackwards)
                    newIndex = currentIndex;
                else
                    newIndex = currentIndex + 1;
            }
        }
        this._updateSearchCount(this._currentSearchTreeElements.length);

        if (!this._currentSearchTreeElements.length) {
            this._updateSearchIndex(0);
            return;
        }
        newIndex = mod(newIndex, this._currentSearchTreeElements.length);

        this._jumpToMatch(newIndex);
    },

    /**
     * @override
     */
    jumpToNextSearchResult: function()
    {
        if (!this._currentSearchTreeElements.length)
            return;
        var newIndex = mod(this._currentSearchFocusIndex + 1, this._currentSearchTreeElements.length);
        this._jumpToMatch(newIndex);
    },

    /**
     * @override
     */
    jumpToPreviousSearchResult: function()
    {
        if (!this._currentSearchTreeElements.length)
            return;
        var newIndex = mod(this._currentSearchFocusIndex - 1, this._currentSearchTreeElements.length);
        this._jumpToMatch(newIndex);
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsCaseSensitiveSearch: function()
    {
        return true;
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsRegexSearch: function()
    {
        return true;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {*} data
 * @param {string} prefix
 * @param {string} suffix
 */
WebInspector.ParsedJSON = function(data, prefix, suffix)
{
    this.data = data;
    this.prefix = prefix;
    this.suffix = suffix;
}
