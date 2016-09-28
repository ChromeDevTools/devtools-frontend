// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.TargetManager} targetManager
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.FileSystemWorkspaceBinding} fileSystemWorkspaceBinding
 * @param {!WebInspector.FileSystemMapping} fileSystemMapping
 */
WebInspector.NetworkMapping = function(targetManager, workspace, fileSystemWorkspaceBinding, fileSystemMapping)
{
    this._targetManager = targetManager;
    this._workspace = workspace;
    this._fileSystemWorkspaceBinding = fileSystemWorkspaceBinding;
    this._fileSystemMapping = fileSystemMapping;
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.RevealSourceLine, this._revealSourceLine, this);

    var fileSystemManager = fileSystemWorkspaceBinding.fileSystemManager();
    this._eventListeners = [
        fileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this),
        fileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this),
    ];
    fileSystemManager.waitForFileSystems()
        .then(this._fileSystemsLoaded.bind(this));
}

WebInspector.NetworkMapping.prototype = {
    /**
     * @param {!Array<!WebInspector.IsolatedFileSystem>} fileSystems
     */
    _fileSystemsLoaded: function(fileSystems)
    {
        for (var fileSystem of fileSystems)
            this._addMappingsForFilesystem(fileSystem);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _fileSystemAdded: function(event)
    {
        var fileSystem = /** @type {!WebInspector.IsolatedFileSystem} */ (event.data);
        this._addMappingsForFilesystem(fileSystem);
    },

    /**
     * @param {!WebInspector.IsolatedFileSystem} fileSystem
     */
    _addMappingsForFilesystem: function(fileSystem)
    {
        this._addingFileSystem = true;
        this._fileSystemMapping.addFileSystem(fileSystem.path());

        var mappings = fileSystem.projectProperty("mappings");
        for (var i = 0; Array.isArray(mappings) && i < mappings.length; ++i) {
            var mapping = mappings[i];
            if (!mapping || typeof mapping !== "object")
                continue;
            var folder = mapping["folder"];
            var url = mapping["url"];
            if (typeof folder !== "string" || typeof url !== "string")
                continue;
            this._fileSystemMapping.addNonConfigurableFileMapping(fileSystem.path(), url, folder);
        }
        this._addingFileSystem = false;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _fileSystemRemoved: function(event)
    {
        var fileSystem = /** @type {!WebInspector.IsolatedFileSystem} */ (event.data);
        this._fileSystemMapping.removeFileSystem(fileSystem.path());
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {?WebInspector.ResourceTreeFrame} frame
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    _networkUISourceCodeForURL: function(target, frame, url)
    {
        return this._workspace.uiSourceCode(WebInspector.NetworkProject.projectId(target, frame, false), url);
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {?WebInspector.ResourceTreeFrame} frame
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    _contentScriptUISourceCodeForURL: function(target, frame, url)
    {
        return this._workspace.uiSourceCode(WebInspector.NetworkProject.projectId(target, frame, true), url);
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {?WebInspector.ResourceTreeFrame} frame
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    _uiSourceCodeForURL: function(target, frame, url)
    {
        return this._networkUISourceCodeForURL(target, frame, url) || this._contentScriptUISourceCodeForURL(target, frame, url);
    },

    /**
     * @param {string} url
     * @param {!WebInspector.Script} script
     * @return {?WebInspector.UISourceCode}
     */
    uiSourceCodeForScriptURL: function(url, script)
    {
        var frame = WebInspector.ResourceTreeFrame.fromScript(script);
        return this._uiSourceCodeForURL(script.target(), frame, url);
    },

    /**
     * @param {string} url
     * @param {!WebInspector.CSSStyleSheetHeader} header
     * @return {?WebInspector.UISourceCode}
     */
    uiSourceCodeForStyleURL: function(url, header)
    {
        var frame = WebInspector.ResourceTreeFrame.fromStyleSheet(header);
        return this._uiSourceCodeForURL(header.target(), frame, url);
    },

    /**
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    uiSourceCodeForURLForAnyTarget: function(url)
    {
        return WebInspector.workspace.uiSourceCodeForURL(url);
    },

    /**
     * @param {!WebInspector.UISourceCode} networkUISourceCode
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    addMapping: function(networkUISourceCode, uiSourceCode)
    {
        var fileSystemPath = WebInspector.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());
        this._fileSystemMapping.addMappingForResource(networkUISourceCode.url(), fileSystemPath, uiSourceCode.url());
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    removeMapping: function(uiSourceCode)
    {
        this._fileSystemMapping.removeMappingForURL(uiSourceCode.url());
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _revealSourceLine: function(event)
    {
        var url = /** @type {string} */ (event.data["url"]);
        var lineNumber = /** @type {number} */ (event.data["lineNumber"]);
        var columnNumber = /** @type {number} */ (event.data["columnNumber"]);

        var uiSourceCode = this.uiSourceCodeForURLForAnyTarget(url);
        if (uiSourceCode) {
            WebInspector.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
            return;
        }

        /**
         * @param {!WebInspector.Event} event
         * @this {WebInspector.NetworkMapping}
         */
        function listener(event)
        {
            var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
            if (uiSourceCode.url() === url) {
                WebInspector.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
                this._workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, listener, this);
            }
        }

        this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, listener, this);
    },

    dispose: function()
    {
        WebInspector.EventTarget.removeEventListeners(this._eventListeners);
    }
}

/**
 * @type {!WebInspector.NetworkMapping}
 */
WebInspector.networkMapping;
