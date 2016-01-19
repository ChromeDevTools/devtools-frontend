/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
 * @param {!WebInspector.IsolatedFileSystemManager} isolatedFileSystemManager
 * @param {!WebInspector.Workspace} workspace
 */
WebInspector.FileSystemWorkspaceBinding = function(isolatedFileSystemManager, workspace)
{
    this._isolatedFileSystemManager = isolatedFileSystemManager;
    this._workspace = workspace;
    this._isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this);
    this._isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this);
    this._isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemFilesChanged, this._fileSystemFilesChanged, this);
    /** @type {!Map.<string, !WebInspector.FileSystemWorkspaceBinding.FileSystem>} */
    this._boundFileSystems = new Map();
}

WebInspector.FileSystemWorkspaceBinding._styleSheetExtensions = new Set(["css", "scss", "sass", "less"]);
WebInspector.FileSystemWorkspaceBinding._documentExtensions = new Set(["htm", "html", "asp", "aspx", "phtml", "jsp"]);
WebInspector.FileSystemWorkspaceBinding._scriptExtensions = new Set(["asp", "aspx", "c", "cc", "cljs", "coffee", "cpp", "cs", "dart", "java", "js", "jsp", "jsx", "h", "m", "mm", "py", "sh", "ts", "tsx"]);

WebInspector.FileSystemWorkspaceBinding._imageExtensions = WebInspector.IsolatedFileSystem.ImageExtensions;

/**
 * @param {string} fileSystemPath
 * @return {string}
 */
WebInspector.FileSystemWorkspaceBinding.projectId = function(fileSystemPath)
{
    return fileSystemPath;
}

/**
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @return {!Array<string>}
 */
WebInspector.FileSystemWorkspaceBinding.relativePath = function(uiSourceCode)
{
    var baseURL = /** @type {!WebInspector.FileSystemWorkspaceBinding.FileSystem}*/(uiSourceCode.project())._fileSystemBaseURL;
    return uiSourceCode.url().substring(baseURL.length).split("/");
}

/**
 * @param {!WebInspector.Project} project
 * @param {string} relativePath
 * @return {string}
 */
WebInspector.FileSystemWorkspaceBinding.completeURL = function(project, relativePath)
{
    var fsProject = /** @type {!WebInspector.FileSystemWorkspaceBinding.FileSystem}*/(project);
    return fsProject._fileSystemBaseURL + relativePath;
}

/**
 * @param {string} extension
 * @return {!WebInspector.ResourceType}
 */
WebInspector.FileSystemWorkspaceBinding._contentTypeForExtension = function(extension)
{
    if (WebInspector.FileSystemWorkspaceBinding._styleSheetExtensions.has(extension))
        return WebInspector.resourceTypes.Stylesheet;
    if (WebInspector.FileSystemWorkspaceBinding._documentExtensions.has(extension))
        return WebInspector.resourceTypes.Document;
    if (WebInspector.FileSystemWorkspaceBinding._imageExtensions.has(extension))
        return WebInspector.resourceTypes.Image;
    if (WebInspector.FileSystemWorkspaceBinding._scriptExtensions.has(extension))
        return WebInspector.resourceTypes.Script;
    return WebInspector.resourceTypes.Other;
}

WebInspector.FileSystemWorkspaceBinding.prototype = {
    /**
     * @return {!WebInspector.IsolatedFileSystemManager}
     */
    fileSystemManager: function()
    {
        return this._isolatedFileSystemManager;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _fileSystemAdded: function(event)
    {
        var fileSystem = /** @type {!WebInspector.IsolatedFileSystem} */ (event.data);
        var boundFileSystem = new WebInspector.FileSystemWorkspaceBinding.FileSystem(this, fileSystem, this._workspace);
        this._boundFileSystems.set(fileSystem.path(), boundFileSystem);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _fileSystemRemoved: function(event)
    {
        var fileSystem = /** @type {!WebInspector.IsolatedFileSystem} */ (event.data);
        var boundFileSystem = this._boundFileSystems.get(fileSystem.path());
        boundFileSystem.dispose();
        this._boundFileSystems.remove(fileSystem.path());
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _fileSystemFilesChanged: function(event)
    {
        var paths = /** @type {!Array<string>} */ (event.data);
        for (var path of paths) {
            for (var key of this._boundFileSystems.keys()) {
                if (!path.startsWith(key))
                    continue;
                this._boundFileSystems.get(key)._fileChanged(path);
            }
        }
    },

    /**
     * @param {string} projectId
     * @return {string}
     */
    fileSystemPath: function(projectId)
    {
        return projectId;
    },

    dispose: function()
    {
        this._isolatedFileSystemManager.removeEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this);
        this._isolatedFileSystemManager.removeEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this);
        this._isolatedFileSystemManager.dispose();
        for (var fileSystem of this._boundFileSystems.values()) {
            fileSystem.dispose();
            this._boundFileSystems.remove(fileSystem._fileSystem.path());
        }
    }
}

/**
 * @constructor
 * @extends {WebInspector.ProjectStore}
 * @implements {WebInspector.Project}
 * @param {!WebInspector.FileSystemWorkspaceBinding} fileSystemWorkspaceBinding
 * @param {!WebInspector.IsolatedFileSystem} isolatedFileSystem
 * @param {!WebInspector.Workspace} workspace
 */
WebInspector.FileSystemWorkspaceBinding.FileSystem = function(fileSystemWorkspaceBinding, isolatedFileSystem, workspace)
{
    this._fileSystemWorkspaceBinding = fileSystemWorkspaceBinding;
    this._fileSystem = isolatedFileSystem;
    this._fileSystemBaseURL = this._fileSystem.path() + "/";
    this._fileSystemPath = this._fileSystem.path();

    var id = WebInspector.FileSystemWorkspaceBinding.projectId(this._fileSystemPath);
    console.assert(!workspace.project(id));

    var displayName = this._fileSystemPath.substr(this._fileSystemPath.lastIndexOf("/") + 1);
    WebInspector.ProjectStore.call(this, workspace, id, WebInspector.projectTypes.FileSystem, displayName);

    workspace.addProject(this);
    this.populate();
}

WebInspector.FileSystemWorkspaceBinding.FileSystem.prototype = {
    /**
     * @return {string}
     */
    fileSystemPath: function()
    {
        return this._fileSystemPath;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {string}
     */
    _filePathForUISourceCode: function(uiSourceCode)
    {
        return uiSourceCode.url().substring(this._fileSystemPath.length);
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {function(?string)} callback
     */
    requestFileContent: function(uiSourceCode, callback)
    {
        var filePath = this._filePathForUISourceCode(uiSourceCode);
        var isImage = WebInspector.FileSystemWorkspaceBinding._imageExtensions.has(WebInspector.TextUtils.extension(filePath));

        this._fileSystem.requestFileContent(filePath, isImage ? base64CallbackWrapper : callback);

        /**
         * @param {?string} result
         */
        function base64CallbackWrapper(result)
        {
            if (!result) {
                callback(result);
                return;
            }
            var index = result.indexOf(",");
            callback(result.substring(index + 1));
        }
    },

    /**
     * @override
     * @return {boolean}
     */
    canSetFileContent: function()
    {
        return true;
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} newContent
     * @param {function(?string)} callback
     */
    setFileContent: function(uiSourceCode, newContent, callback)
    {
        var filePath = this._filePathForUISourceCode(uiSourceCode);
        this._fileSystem.setFileContent(filePath, newContent, callback.bind(this, ""));
    },

    /**
     * @override
     * @return {boolean}
     */
    canRename: function()
    {
        return true;
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} newName
     * @param {function(boolean, string=, string=, !WebInspector.ResourceType=)} callback
     */
    rename: function(uiSourceCode, newName, callback)
    {
        if (newName === uiSourceCode.name()) {
            callback(true, uiSourceCode.name(), uiSourceCode.url(), uiSourceCode.contentType());
            return;
        }

        var filePath = this._filePathForUISourceCode(uiSourceCode);
        this._fileSystem.renameFile(filePath, newName, innerCallback.bind(this));

        /**
         * @param {boolean} success
         * @param {string=} newName
         * @this {WebInspector.FileSystemWorkspaceBinding.FileSystem}
         */
        function innerCallback(success, newName)
        {
            if (!success || !newName) {
                callback(false, newName);
                return;
            }
            console.assert(newName);
            var slash = filePath.lastIndexOf("/");
            var parentPath = filePath.substring(0, slash);
            filePath = parentPath + "/" + newName;
            filePath = filePath.substr(1);
            var extension = this._extensionForPath(newName);
            var newURL = this._fileSystemBaseURL + filePath;
            var newContentType = WebInspector.FileSystemWorkspaceBinding._contentTypeForExtension(extension);
            this.renameUISourceCode(uiSourceCode, newName);
            callback(true, newName, newURL, newContentType);
        }
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInFileContent: function(uiSourceCode, query, caseSensitive, isRegex, callback)
    {
        var filePath = this._filePathForUISourceCode(uiSourceCode);
        this._fileSystem.requestFileContent(filePath, contentCallback);

        /**
         * @param {?string} content
         */
        function contentCallback(content)
        {
            var result = [];
            if (content !== null)
                result = WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex);
            callback(result);
        }
    },

    /**
     * @override
     * @param {!WebInspector.ProjectSearchConfig} searchConfig
     * @param {!Array.<string>} filesMathingFileQuery
     * @param {!WebInspector.Progress} progress
     * @param {function(!Array.<string>)} callback
     */
    findFilesMatchingSearchRequest: function(searchConfig, filesMathingFileQuery, progress, callback)
    {
        var result = filesMathingFileQuery;
        var queriesToRun = searchConfig.queries().slice();
        if (!queriesToRun.length)
            queriesToRun.push("");
        progress.setTotalWork(queriesToRun.length);
        searchNextQuery.call(this);

        /**
         * @this {WebInspector.FileSystemWorkspaceBinding.FileSystem}
         */
        function searchNextQuery()
        {
            if (!queriesToRun.length) {
                progress.done();
                callback(result);
                return;
            }
            var query = queriesToRun.shift();
            this._fileSystem.searchInPath(searchConfig.isRegex() ? "" : query, progress, innerCallback.bind(this));
        }

        /**
         * @param {!Array.<string>} files
         * @this {WebInspector.FileSystemWorkspaceBinding.FileSystem}
         */
        function innerCallback(files)
        {
            files = files.sort();
            progress.worked(1);
            result = result.intersectOrdered(files, String.naturalOrderComparator);
            searchNextQuery.call(this);
        }
    },

    /**
     * @override
     * @param {!WebInspector.Progress} progress
     */
    indexContent: function(progress)
    {
        this._fileSystem.indexContent(progress);
    },

    /**
     * @param {string} path
     * @return {string}
     */
    _extensionForPath: function(path)
    {
        var extensionIndex = path.lastIndexOf(".");
        if (extensionIndex === -1)
            return "";
        return path.substring(extensionIndex + 1).toLowerCase();
    },

    populate: function()
    {
        this._fileSystem.requestFilesRecursive("", this._addFile.bind(this));
    },

    /**
     * @override
     * @param {string} path
     * @param {function()=} callback
     */
    refresh: function(path, callback)
    {
        this._fileSystem.requestFilesRecursive(path, this._addFile.bind(this), callback);
    },

    /**
     * @override
     * @param {string} url
     */
    excludeFolder: function(url)
    {
        var relativeFolder = url.substring(this._fileSystemBaseURL.length);
        if (!relativeFolder.startsWith("/"))
            relativeFolder = "/" + relativeFolder;
        if (!relativeFolder.endsWith("/"))
            relativeFolder += "/";
        this._fileSystem.addExcludedFolder(relativeFolder);

        var uiSourceCodes = this.uiSourceCodes().slice();
        for (var i = 0; i < uiSourceCodes.length; ++i) {
            var uiSourceCode = uiSourceCodes[i];
            if (uiSourceCode.url().startsWith(url))
                this.removeUISourceCode(uiSourceCode.url());
        }
    },

    /**
     * @override
     * @param {string} path
     * @param {?string} name
     * @param {string} content
     * @param {function(?WebInspector.UISourceCode)} callback
     */
    createFile: function(path, name, content, callback)
    {
        this._fileSystem.createFile(path, name, innerCallback.bind(this));
        var createFilePath;

        /**
         * @param {?string} filePath
         * @this {WebInspector.FileSystemWorkspaceBinding.FileSystem}
         */
        function innerCallback(filePath)
        {
            if (!filePath) {
                callback(null);
                return;
            }
            createFilePath = filePath;
            if (!content) {
                contentSet.call(this);
                return;
            }
            this._fileSystem.setFileContent(filePath, content, contentSet.bind(this));
        }

        /**
         * @this {WebInspector.FileSystemWorkspaceBinding.FileSystem}
         */
        function contentSet()
        {
            callback(this._addFile(createFilePath));
        }
    },

    /**
     * @override
     * @param {string} path
     */
    deleteFile: function(path)
    {
        this._fileSystem.deleteFile(path);
        this.removeUISourceCode(path);
    },

    /**
     * @override
     */
    remove: function()
    {
        this._fileSystemWorkspaceBinding._isolatedFileSystemManager.removeFileSystem(this._fileSystem);
    },

    /**
     * @param {string} filePath
     * @return {!WebInspector.UISourceCode}
     */
    _addFile: function(filePath)
    {
        if (!filePath)
            console.assert(false);

        var extension = this._extensionForPath(filePath);
        var contentType = WebInspector.FileSystemWorkspaceBinding._contentTypeForExtension(extension);

        var uiSourceCode = this.createUISourceCode(this._fileSystemBaseURL + filePath, contentType);
        this.addUISourceCode(uiSourceCode);
        return uiSourceCode;
    },

    /**
     * @param {string} path
     */
    _fileChanged: function(path)
    {
        var uiSourceCode = this.uiSourceCodeForURL(path);
        if (!uiSourceCode) {
            var contentType = WebInspector.FileSystemWorkspaceBinding._contentTypeForExtension(this._extensionForPath(path));
            this.addUISourceCode(this.createUISourceCode(path, contentType));
            return;
        }
        uiSourceCode.checkContentUpdated();
    },

    dispose: function()
    {
        this.removeProject();
    },

    __proto__: WebInspector.ProjectStore.prototype
}
