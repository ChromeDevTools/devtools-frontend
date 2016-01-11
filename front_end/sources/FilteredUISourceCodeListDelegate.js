/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.FilteredListWidget.Delegate}
 * @param {!Map.<!WebInspector.UISourceCode, number>=} defaultScores
 * @param {!Array<string>=} history
 */
WebInspector.FilteredUISourceCodeListDelegate = function(defaultScores, history)
{
    WebInspector.FilteredListWidget.Delegate.call(this, history || []);

    this._populate();
    this._defaultScores = defaultScores;
    this._scorer = new WebInspector.FilePathScoreFunction("");
    WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    WebInspector.workspace.addEventListener(WebInspector.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
}

WebInspector.FilteredUISourceCodeListDelegate.prototype = {
    _projectRemoved: function(event)
    {
        var project = /** @type {!WebInspector.Project} */ (event.data);
        this._populate(project);
        this.refresh();
    },

    /**
     * @param {!WebInspector.Project=} skipProject
     */
    _populate: function(skipProject)
    {
        /** @type {!Array.<!WebInspector.UISourceCode>} */
        this._uiSourceCodes = [];
        var projects = WebInspector.workspace.projects().filter(this.filterProject.bind(this));
        for (var i = 0; i < projects.length; ++i) {
            if (skipProject && projects[i] === skipProject)
                continue;
            this._uiSourceCodes = this._uiSourceCodes.concat(projects[i].uiSourceCodes());
        }
    },

    /**
     * @param {?WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber
     * @param {number=} columnNumber
     */
    uiSourceCodeSelected: function(uiSourceCode, lineNumber, columnNumber)
    {
        // Overridden by subclasses
    },

    /**
     * @param {!WebInspector.Project} project
     * @return {boolean}
     */
    filterProject: function(project)
    {
        return true;
        // Overridden by subclasses
    },

    /**
     * @override
     * @return {number}
     */
    itemCount: function()
    {
        return this._uiSourceCodes.length;
    },

    /**
     * @override
     * @param {number} itemIndex
     * @return {string}
     */
    itemKeyAt: function(itemIndex)
    {
        return this._uiSourceCodes[itemIndex].url();
    },

    /**
     * @override
     * @param {number} itemIndex
     * @param {string} query
     * @return {number}
     */
    itemScoreAt: function(itemIndex, query)
    {
        var uiSourceCode = this._uiSourceCodes[itemIndex];
        var score = this._defaultScores ? (this._defaultScores.get(uiSourceCode) || 0) : 0;
        if (!query || query.length < 2)
            return score;

        if (this._query !== query) {
            this._query = query;
            this._scorer = new WebInspector.FilePathScoreFunction(query);
        }

        var url = uiSourceCode.url();
        return score + 10 * this._scorer.score(url, null);
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
        query = this.rewriteQuery(query);
        var uiSourceCode = this._uiSourceCodes[itemIndex];
        var fullDisplayName = uiSourceCode.fullDisplayName();
        var indexes = [];
        var score = new WebInspector.FilePathScoreFunction(query).score(fullDisplayName, indexes);
        var fileNameIndex = fullDisplayName.lastIndexOf("/");

        titleElement.textContent = uiSourceCode.displayName() + (this._queryLineNumberAndColumnNumber || "");
        subtitleElement.textContent = fullDisplayName.trimEnd(100);
        subtitleElement.title = fullDisplayName;
        var ranges = [];
        for (var i = 0; i < indexes.length; ++i)
            ranges.push({offset: indexes[i], length: 1});

        if (indexes[0] > fileNameIndex) {
            for (var i = 0; i < ranges.length; ++i)
                ranges[i].offset -= fileNameIndex + 1;
            WebInspector.highlightRangesWithStyleClass(titleElement, ranges, "highlight");
        } else {
            WebInspector.highlightRangesWithStyleClass(subtitleElement, ranges, "highlight");
        }
    },

    /**
     * @override
     * @param {?number} itemIndex
     * @param {string} promptValue
     */
    selectItem: function(itemIndex, promptValue)
    {
        var parsedExpression = promptValue.trim().match(/^([^:]*)(:\d+)?(:\d+)?$/);
        if (!parsedExpression)
            return;

        var lineNumber;
        var columnNumber;
        if (parsedExpression[2])
            lineNumber = parseInt(parsedExpression[2].substr(1), 10) - 1;
        if (parsedExpression[3])
            columnNumber = parseInt(parsedExpression[3].substr(1), 10) - 1;
        var uiSourceCode = itemIndex !== null ? this._uiSourceCodes[itemIndex] : null;
        this.uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber);
    },

    /**
     * @override
     * @param {string} query
     * @return {string}
     */
    rewriteQuery: function(query)
    {
        if (!query)
            return query;
        query = query.trim();
        var lineNumberMatch = query.match(/^([^:]+)((?::[^:]*){0,2})$/);
        this._queryLineNumberAndColumnNumber = lineNumberMatch ? lineNumberMatch[2] : "";
        return lineNumberMatch ? lineNumberMatch[1] : query;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        if (!this.filterProject(uiSourceCode.project()))
            return;
        this._uiSourceCodes.push(uiSourceCode);
        this.refresh();
    },

    dispose: function()
    {
        WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
        WebInspector.workspace.removeEventListener(WebInspector.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
    },

    __proto__: WebInspector.FilteredListWidget.Delegate.prototype
}
