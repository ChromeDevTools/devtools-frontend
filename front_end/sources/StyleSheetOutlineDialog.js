/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SelectionDialogContentProvider}
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {function(number, number)} selectItemCallback
 */
WebInspector.StyleSheetOutlineDialog = function(uiSourceCode, selectItemCallback)
{
    WebInspector.SelectionDialogContentProvider.call(this);
    this._selectItemCallback = selectItemCallback;
    this._cssParser = new WebInspector.CSSParser();
    this._cssParser.addEventListener(WebInspector.CSSParser.Events.RulesParsed, this.refresh.bind(this));
    this._cssParser.parse(uiSourceCode.workingCopy());
}

/**
 * @param {!WebInspector.View} view
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {function(number, number)} selectItemCallback
 */
WebInspector.StyleSheetOutlineDialog.show = function(view, uiSourceCode, selectItemCallback)
{
    if (WebInspector.Dialog.currentInstance())
        return;
    var delegate = new WebInspector.StyleSheetOutlineDialog(uiSourceCode, selectItemCallback);
    var filteredItemSelectionDialog = new WebInspector.FilteredItemSelectionDialog(delegate);
    WebInspector.Dialog.show(view.element, filteredItemSelectionDialog);
}

WebInspector.StyleSheetOutlineDialog.prototype = {
    /**
     * @override
     * @return {number}
     */
    itemCount: function()
    {
        return this._cssParser.rules().length;
    },

    /**
     * @override
     * @param {number} itemIndex
     * @return {string}
     */
    itemKeyAt: function(itemIndex)
    {
        var rule = this._cssParser.rules()[itemIndex];
        return rule.selectorText || rule.atRule;
    },

    /**
     * @override
     * @param {number} itemIndex
     * @param {string} query
     * @return {number}
     */
    itemScoreAt: function(itemIndex, query)
    {
        var rule = this._cssParser.rules()[itemIndex];
        return -rule.lineNumber;
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
        var rule = this._cssParser.rules()[itemIndex];
        titleElement.textContent = rule.selectorText || rule.atRule;
        this.highlightRanges(titleElement, query);
        subtitleElement.textContent = ":" + (rule.lineNumber + 1);
    },

    /**
     * @override
     * @param {number} itemIndex
     * @param {string} promptValue
     */
    selectItem: function(itemIndex, promptValue)
    {
        var rule = this._cssParser.rules()[itemIndex];
        var lineNumber = rule.lineNumber;
        if (!isNaN(lineNumber) && lineNumber >= 0)
            this._selectItemCallback(lineNumber, rule.columnNumber);
    },

    dispose: function()
    {
        this._cssParser.dispose();
    },

    __proto__: WebInspector.SelectionDialogContentProvider.prototype
}
