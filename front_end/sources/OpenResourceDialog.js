/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.FilteredUISourceCodeListDelegate}
 * @param {!WebInspector.SourcesView} sourcesView
 * @param {!Map.<!WebInspector.UISourceCode, number>} defaultScores
 * @param {!Array<string>} history
 */
WebInspector.OpenResourceDialog = function(sourcesView, defaultScores, history)
{
    WebInspector.FilteredUISourceCodeListDelegate.call(this, defaultScores, history);
    this._sourcesView = sourcesView;
}

WebInspector.OpenResourceDialog.prototype = {

    /**
     * @override
     * @param {?WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber
     * @param {number=} columnNumber
     */
    uiSourceCodeSelected: function(uiSourceCode, lineNumber, columnNumber)
    {
        if (!uiSourceCode)
            uiSourceCode = this._sourcesView.currentUISourceCode();
        if (!uiSourceCode)
            return;
        this._sourcesView.showSourceLocation(uiSourceCode, lineNumber, columnNumber);
    },

    /**
     * @override
     * @param {string} query
     * @return {boolean}
     */
    shouldShowMatchingItems: function(query)
    {
        return !query.startsWith(":");
    },

    /**
     * @override
     * @param {!WebInspector.Project} project
     * @return {boolean}
     */
    filterProject: function(project)
    {
        return !WebInspector.Project.isServiceProject(project);
    },

    __proto__: WebInspector.FilteredUISourceCodeListDelegate.prototype
}

/**
 * @param {!WebInspector.SourcesView} sourcesView
 * @param {string} query
 * @param {!Map.<!WebInspector.UISourceCode, number>} defaultScores
 * @param {!Array<string>} history
 */
WebInspector.OpenResourceDialog.show = function(sourcesView, query, defaultScores, history)
{
    var filteredItemSelectionDialog = new WebInspector.FilteredListWidget(new WebInspector.OpenResourceDialog(sourcesView, defaultScores, history), true);
    filteredItemSelectionDialog.showAsDialog();
    filteredItemSelectionDialog.setQuery(query);
}

/**
 * @constructor
 * @extends {WebInspector.FilteredUISourceCodeListDelegate}
 * @param {!Array.<string>} types
 * @param {function(?WebInspector.UISourceCode)} callback
 */
WebInspector.SelectUISourceCodeForProjectTypesDialog = function(types, callback)
{
    this._types = types;
    WebInspector.FilteredUISourceCodeListDelegate.call(this);
    this._callback = callback;
}

WebInspector.SelectUISourceCodeForProjectTypesDialog.prototype = {
    /**
     * @override
     * @param {?WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber
     * @param {number=} columnNumber
     */
    uiSourceCodeSelected: function(uiSourceCode, lineNumber, columnNumber)
    {
        this._callback(uiSourceCode);
    },

    /**
     * @override
     * @param {!WebInspector.Project} project
     * @return {boolean}
     */
    filterProject: function(project)
    {
        return this._types.indexOf(project.type()) !== -1;
    },

    __proto__: WebInspector.FilteredUISourceCodeListDelegate.prototype
}

/**
 * @param {string} name
 * @param {!Array.<string>} types
 * @param {function(?WebInspector.UISourceCode)} callback
 */
WebInspector.SelectUISourceCodeForProjectTypesDialog.show = function(name, types, callback)
{
    var filteredItemSelectionDialog = new WebInspector.FilteredListWidget(new WebInspector.SelectUISourceCodeForProjectTypesDialog(types, callback), true);
    filteredItemSelectionDialog.showAsDialog();
    filteredItemSelectionDialog.setQuery(name);
}
