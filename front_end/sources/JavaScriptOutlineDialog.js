/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.FilteredListWidget.Delegate}
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {function(number, number)} selectItemCallback
 */
WebInspector.JavaScriptOutlineDialog = function(uiSourceCode, selectItemCallback)
{
    WebInspector.FilteredListWidget.Delegate.call(this, []);

    this._functionItems = [];
    this._selectItemCallback = selectItemCallback;
    WebInspector.formatterWorkerPool.runChunkedTask("javaScriptOutline", {content: uiSourceCode.workingCopy() }, this._didBuildOutlineChunk.bind(this));
}

/**
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {function(number, number)} selectItemCallback
 */
WebInspector.JavaScriptOutlineDialog.show = function(uiSourceCode, selectItemCallback)
{
    WebInspector.JavaScriptOutlineDialog._instanceForTests = new WebInspector.JavaScriptOutlineDialog(uiSourceCode, selectItemCallback);
    new WebInspector.FilteredListWidget(WebInspector.JavaScriptOutlineDialog._instanceForTests).showAsDialog();
}

WebInspector.JavaScriptOutlineDialog.prototype = {
    /**
     * @param {?MessageEvent} event
     */
    _didBuildOutlineChunk: function(event)
    {
        if (!event) {
            this.dispose();
            this.refresh();
            return;
        }
        var data = /** @type {!WebInspector.JavaScriptOutlineDialog.MessageEventData} */ (event.data);
        var chunk = data.chunk;
        for (var i = 0; i < chunk.length; ++i)
            this._functionItems.push(chunk[i]);

        if (data.isLastChunk)
            this.dispose();

        this.refresh();
    },

    /**
     * @override
     * @return {number}
     */
    itemCount: function()
    {
        return this._functionItems.length;
    },

    /**
     * @override
     * @param {number} itemIndex
     * @return {string}
     */
    itemKeyAt: function(itemIndex)
    {
        var item = this._functionItems[itemIndex];
        return item.name + (item.arguments ? item.arguments : "");
    },

    /**
     * @override
     * @param {number} itemIndex
     * @param {string} query
     * @return {number}
     */
    itemScoreAt: function(itemIndex, query)
    {
        var item = this._functionItems[itemIndex];
        var methodName = query.split("(")[0];
        if (methodName.toLowerCase() === item.name.toLowerCase())
            return 1 / (1 + item.line);
        return -item.line - 1;
    },

    /**
     * @override
     * @param {number} itemIndex
     * @param {string} query
     * @param {!Element} titleElement
     * @param {!Element} subtitleElement
     */
    renderItem: function(itemIndex, query, titleElement, subtitleElement)
    {
        var item = this._functionItems[itemIndex];
        titleElement.textContent = item.name + (item.arguments ? item.arguments : "");
        this.highlightRanges(titleElement, query);
        subtitleElement.textContent = ":" + (item.line + 1);
    },

    /**
     * @override
     * @param {?number} itemIndex
     * @param {string} promptValue
     */
    selectItem: function(itemIndex, promptValue)
    {
        if (itemIndex === null)
            return;
        var lineNumber = this._functionItems[itemIndex].line;
        if (!isNaN(lineNumber) && lineNumber >= 0)
            this._selectItemCallback(lineNumber, this._functionItems[itemIndex].column);
    },

    dispose: function()
    {
    },

    __proto__: WebInspector.FilteredListWidget.Delegate.prototype
}

/**
 * @typedef {{isLastChunk: boolean, chunk: !Array.<!{selectorText: string, lineNumber: number, columnNumber: number}>}}
 */
WebInspector.JavaScriptOutlineDialog.MessageEventData;
