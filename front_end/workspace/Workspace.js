/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 * @interface
 */
WebInspector.ProjectSearchConfig = function() {}

WebInspector.ProjectSearchConfig.prototype = {
    /**
     * @return {string}
     */
    query: function() { },

    /**
     * @return {boolean}
     */
    ignoreCase: function() { },

    /**
     * @return {boolean}
     */
    isRegex: function() { },

    /**
     * @return {!Array.<string>}
     */
    queries: function() { },

    /**
     * @param {string} filePath
     * @return {boolean}
     */
    filePathMatchesFileQuery: function(filePath) { }
}

/**
 * @interface
 */
WebInspector.Project = function() { }

/**
 * @param {!WebInspector.Project} project
 * @return {boolean}
 */
WebInspector.Project.isServiceProject = function(project)
{
    return project.type() === WebInspector.projectTypes.Debugger || project.type() === WebInspector.projectTypes.Formatter || project.type() === WebInspector.projectTypes.Service;
}

WebInspector.Project.prototype = {
    /**
     * @return {!WebInspector.Workspace}
     */
    workspace: function() { },

    /**
     * @return {string}
     */
    id: function() { },

    /**
     * @return {string}
     */
    type: function() { },

    /**
     * @return {string}
     */
    displayName: function() { },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {function(?string)} callback
     */
    requestFileContent: function(uiSourceCode, callback) { },

    /**
     * @return {boolean}
     */
    canSetFileContent: function() { },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} newContent
     * @param {function(?string)} callback
     */
    setFileContent: function(uiSourceCode, newContent, callback) { },

    /**
     * @return {boolean}
     */
    canRename: function() { },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} newName
     * @param {function(boolean, string=, string=, !WebInspector.ResourceType=)} callback
     */
    rename: function(uiSourceCode, newName, callback) { },

    /**
     * @param {string} path
     */
    excludeFolder: function(path) { },

    /**
     * @param {string} path
     * @param {?string} name
     * @param {string} content
     * @param {function(?WebInspector.UISourceCode)} callback
     */
    createFile: function(path, name, content, callback) { },

    /**
     * @param {string} path
     */
    deleteFile: function(path) { },

    remove: function() { },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInFileContent: function(uiSourceCode, query, caseSensitive, isRegex, callback) { },

    /**
     * @param {!WebInspector.ProjectSearchConfig} searchConfig
     * @param {!Array.<string>} filesMathingFileQuery
     * @param {!WebInspector.Progress} progress
     * @param {function(!Array.<string>)} callback
     */
    findFilesMatchingSearchRequest: function(searchConfig, filesMathingFileQuery, progress, callback) { },

    /**
     * @param {!WebInspector.Progress} progress
     */
    indexContent: function(progress) { },

    /**
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    uiSourceCodeForURL: function(url) { },

    /**
     * @return {!Array.<!WebInspector.UISourceCode>}
     */
    uiSourceCodes: function() { }
}

/**
 * @enum {string}
 */
WebInspector.projectTypes = {
    Debugger: "debugger",
    Formatter: "formatter",
    Network: "network",
    Snippets: "snippets",
    FileSystem: "filesystem",
    ContentScripts: "contentscripts",
    Service: "service"
}

/**
 * @constructor
 * @param {!WebInspector.Workspace} workspace
 * @param {string} id
 * @param {!WebInspector.projectTypes} type
 * @param {string} displayName
 */
WebInspector.ProjectStore = function(workspace, id, type, displayName)
{
    this._workspace = workspace;
    this._id = id;
    this._type = type;
    this._displayName = displayName;

    /** @type {!Map.<string, !{uiSourceCode: !WebInspector.UISourceCode, index: number}>} */
    this._uiSourceCodesMap = new Map();
    /** @type {!Array.<!WebInspector.UISourceCode>} */
    this._uiSourceCodesList = [];

    this._project = /** @type {!WebInspector.Project} */(this);
}

WebInspector.ProjectStore.prototype = {
    /**
     * @return {string}
     */
    id: function()
    {
        return this._id;
    },

    /**
     * @return {string}
     */
    type: function()
    {
        return this._type;
    },

    /**
     * @return {string}
     */
    displayName: function()
    {
        return this._displayName;
    },

    /**
     * @return {!WebInspector.Workspace}
     */
    workspace: function()
    {
        return this._workspace;
    },

    /**
     * @param {string} url
     * @param {!WebInspector.ResourceType} contentType
     * @return {!WebInspector.UISourceCode}
     */
    createUISourceCode: function(url, contentType)
    {
        return new WebInspector.UISourceCode(this._project, url, contentType);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {boolean=} replace
     * @return {boolean}
     */
    addUISourceCode: function(uiSourceCode, replace)
    {
        var url = uiSourceCode.url();
        if (this.uiSourceCodeForURL(url)) {
            if (replace)
                this.removeUISourceCode(url);
            else
                return false;
        }
        this._uiSourceCodesMap.set(url, {uiSourceCode: uiSourceCode, index: this._uiSourceCodesList.length});
        this._uiSourceCodesList.push(uiSourceCode);
        this._workspace.dispatchEventToListeners(WebInspector.Workspace.Events.UISourceCodeAdded, uiSourceCode);
        return true;
    },

    /**
     * @param {string} url
     */
    removeUISourceCode: function(url)
    {
        var uiSourceCode = this.uiSourceCodeForURL(url);
        if (!uiSourceCode)
            return;

        var entry = this._uiSourceCodesMap.get(url);
        var movedUISourceCode = this._uiSourceCodesList[this._uiSourceCodesList.length - 1];
        this._uiSourceCodesList[entry.index] = movedUISourceCode;
        var movedEntry = this._uiSourceCodesMap.get(movedUISourceCode.url());
        movedEntry.index = entry.index;
        this._uiSourceCodesList.splice(this._uiSourceCodesList.length - 1, 1);
        this._uiSourceCodesMap.delete(url);
        this._workspace.dispatchEventToListeners(WebInspector.Workspace.Events.UISourceCodeRemoved, entry.uiSourceCode);
    },

    removeProject: function()
    {
        this._workspace._removeProject(this._project);
        this._uiSourceCodesMap = new Map();
        this._uiSourceCodesList = [];
    },

    /**
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    uiSourceCodeForURL: function(url)
    {
        var entry = this._uiSourceCodesMap.get(url);
        return entry ? entry.uiSourceCode : null;
    },

    /**
     * @return {!Array.<!WebInspector.UISourceCode>}
     */
    uiSourceCodes: function()
    {
        return this._uiSourceCodesList;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} newName
     */
    renameUISourceCode: function(uiSourceCode, newName)
    {
        var oldPath = uiSourceCode.url();
        var newPath = uiSourceCode.parentURL() ? uiSourceCode.parentURL() + "/" + newName : newName;
        var value = /** @type {!{uiSourceCode: !WebInspector.UISourceCode, index: number}} */ (this._uiSourceCodesMap.get(oldPath));
        this._uiSourceCodesMap.set(newPath, value);
        this._uiSourceCodesMap.delete(oldPath);
    }
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.Workspace = function()
{
    /** @type {!Map<string, !WebInspector.Project>} */
    this._projects = new Map();
    this._hasResourceContentTrackingExtensions = false;
}

/** @enum {symbol} */
WebInspector.Workspace.Events = {
    UISourceCodeAdded: Symbol("UISourceCodeAdded"),
    UISourceCodeRemoved: Symbol("UISourceCodeRemoved"),
    WorkingCopyChanged: Symbol("WorkingCopyChanged"),
    WorkingCopyCommitted: Symbol("WorkingCopyCommitted"),
    WorkingCopyCommittedByUser: Symbol("WorkingCopyCommittedByUser"),
    ProjectAdded: Symbol("ProjectAdded"),
    ProjectRemoved: Symbol("ProjectRemoved")
}

WebInspector.Workspace.prototype = {
    /**
     * @param {string} projectId
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    uiSourceCode: function(projectId, url)
    {
        var project = this._projects.get(projectId);
        return project ? project.uiSourceCodeForURL(url) : null;
    },

    /**
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    uiSourceCodeForURL: function(url)
    {
        for (var project of this._projects.values()) {
            var uiSourceCode = project.uiSourceCodeForURL(url);
            if (uiSourceCode)
                return uiSourceCode;
        }
        return null;
    },

    /**
     * @param {string} type
     * @return {!Array.<!WebInspector.UISourceCode>}
     */
    uiSourceCodesForProjectType: function(type)
    {
        var result = [];
        for (var project of this._projects.values()) {
            if (project.type() === type)
                result = result.concat(project.uiSourceCodes());
        }
        return result;
    },

    /**
     * @param {!WebInspector.Project} project
     */
    addProject: function(project)
    {
        console.assert(!this._projects.has(project.id()), `A project with id ${project.id()} already exists!`);
        this._projects.set(project.id(), project);
        this.dispatchEventToListeners(WebInspector.Workspace.Events.ProjectAdded, project);
    },

    /**
     * @param {!WebInspector.Project} project
     */
    _removeProject: function(project)
    {
        this._projects.delete(project.id());
        this.dispatchEventToListeners(WebInspector.Workspace.Events.ProjectRemoved, project);
    },

    /**
     * @param {string} projectId
     * @return {?WebInspector.Project}
     */
    project: function(projectId)
    {
        return this._projects.get(projectId) || null;
    },

    /**
     * @return {!Array.<!WebInspector.Project>}
     */
    projects: function()
    {
        return this._projects.valuesArray();
    },

    /**
     * @param {string} type
     * @return {!Array.<!WebInspector.Project>}
     */
    projectsForType: function(type)
    {
        function filterByType(project)
        {
            return project.type() === type;
        }
        return this.projects().filter(filterByType);
    },

    /**
     * @return {!Array.<!WebInspector.UISourceCode>}
     */
    uiSourceCodes: function()
    {
        var result = [];
        for (var project of this._projects.values())
            result = result.concat(project.uiSourceCodes());
        return result;
    },

    /**
     * @param {boolean} hasExtensions
     */
    setHasResourceContentTrackingExtensions: function(hasExtensions)
    {
        this._hasResourceContentTrackingExtensions = hasExtensions;
    },

    /**
     * @return {boolean}
     */
    hasResourceContentTrackingExtensions: function()
    {
        return this._hasResourceContentTrackingExtensions;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @type {!WebInspector.Workspace}
 */
WebInspector.workspace;
