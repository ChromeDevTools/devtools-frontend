/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 * @extends {WebInspector.NavigatorView}
 */
WebInspector.SourcesNavigatorView = function()
{
    WebInspector.NavigatorView.call(this);
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.InspectedURLChanged, this._inspectedURLChanged, this);
}

WebInspector.SourcesNavigatorView.prototype = {
    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    accept: function(uiSourceCode)
    {
        if (!WebInspector.NavigatorView.prototype.accept(uiSourceCode))
            return false;
        return uiSourceCode.project().type() !== WebInspector.projectTypes.ContentScripts && uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _inspectedURLChanged: function(event)
    {
        var mainTarget = WebInspector.targetManager.mainTarget();
        if (event.data !== mainTarget)
            return;
        var inspectedURL = mainTarget && mainTarget.inspectedURL();
        if (!inspectedURL)
            return
        for (var node of this._uiSourceCodeNodes.valuesArray()) {
            var uiSourceCode = node.uiSourceCode();
            if (uiSourceCode.url() === inspectedURL)
                this.revealUISourceCode(uiSourceCode, true);
        }
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    uiSourceCodeAdded: function(uiSourceCode)
    {
        var inspectedPageURL = WebInspector.targetManager.mainTarget().inspectedURL();
        if (uiSourceCode.url() === inspectedPageURL)
            this.revealUISourceCode(uiSourceCode, true);
    },

    __proto__: WebInspector.NavigatorView.prototype
}

/**
 * @constructor
 * @extends {WebInspector.NavigatorView}
 */
WebInspector.ContentScriptsNavigatorView = function()
{
    WebInspector.NavigatorView.call(this);
}

WebInspector.ContentScriptsNavigatorView.prototype = {
    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    accept: function(uiSourceCode)
    {
        if (!WebInspector.NavigatorView.prototype.accept(uiSourceCode))
            return false;
        return uiSourceCode.project().type() === WebInspector.projectTypes.ContentScripts;
    },

    __proto__: WebInspector.NavigatorView.prototype
}

/**
 * @constructor
 * @extends {WebInspector.NavigatorView}
 */
WebInspector.SnippetsNavigatorView = function()
{
    WebInspector.NavigatorView.call(this);
}

WebInspector.SnippetsNavigatorView.prototype = {
    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    accept: function(uiSourceCode)
    {
        if (!WebInspector.NavigatorView.prototype.accept(uiSourceCode))
            return false;
        return uiSourceCode.project().type() === WebInspector.projectTypes.Snippets;
    },

    /**
     * @override
     * @param {!Event} event
     */
    handleContextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString("New"), this._handleCreateSnippet.bind(this));
        contextMenu.show();
    },

    /**
     * @override
     * @param {!Event} event
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    handleFileContextMenu: function(event, uiSourceCode)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString("Run"), this._handleEvaluateSnippet.bind(this, uiSourceCode));
        contextMenu.appendItem(WebInspector.UIString("Rename"), this.rename.bind(this, uiSourceCode));
        contextMenu.appendItem(WebInspector.UIString("Remove"), this._handleRemoveSnippet.bind(this, uiSourceCode));
        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString("New"), this._handleCreateSnippet.bind(this));
        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString("Save as..."), this._handleSaveAs.bind(this, uiSourceCode));
        contextMenu.show();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _handleEvaluateSnippet: function(uiSourceCode)
    {
        var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets || !executionContext)
            return;
        WebInspector.scriptSnippetModel.evaluateScriptSnippet(executionContext, uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _handleSaveAs: function(uiSourceCode)
    {
        if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
            return;
        uiSourceCode.saveAs();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _handleRemoveSnippet: function(uiSourceCode)
    {
        if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
            return;
        uiSourceCode.remove();
    },

    _handleCreateSnippet: function()
    {
        this.create(WebInspector.scriptSnippetModel.project(), "");
    },

    /**
     * @override
     */
    sourceDeleted: function(uiSourceCode)
    {
        this._handleRemoveSnippet(uiSourceCode);
    },

    __proto__: WebInspector.NavigatorView.prototype
}
