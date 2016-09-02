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
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.IsolatedFileSystemManager = function()
{
    /** @type {!Map<string, !WebInspector.IsolatedFileSystem>} */
    this._fileSystems = new Map();
    /** @type {!Map<number, function(!Array.<string>)>} */
    this._callbacks = new Map();
    /** @type {!Map<number, !WebInspector.Progress>} */
    this._progresses = new Map();

    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.FileSystemRemoved, this._onFileSystemRemoved, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.FileSystemAdded, this._onFileSystemAdded, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.FileSystemFilesChanged, this._onFileSystemFilesChanged, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.IndexingTotalWorkCalculated, this._onIndexingTotalWorkCalculated, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.IndexingWorked, this._onIndexingWorked, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.IndexingDone, this._onIndexingDone, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.SearchCompleted, this._onSearchCompleted, this);

    this._initExcludePatterSetting();

    this._fileSystemsLoadedPromise = this._requestFileSystems();
}

/** @typedef {!{fileSystemName: string, rootURL: string, fileSystemPath: string}} */
WebInspector.IsolatedFileSystemManager.FileSystem;

/** @enum {symbol} */
WebInspector.IsolatedFileSystemManager.Events = {
    FileSystemAdded: Symbol("FileSystemAdded"),
    FileSystemRemoved: Symbol("FileSystemRemoved"),
    FileSystemFilesChanged: Symbol("FileSystemFilesChanged"),
    ExcludedFolderAdded: Symbol("ExcludedFolderAdded"),
    ExcludedFolderRemoved: Symbol("ExcludedFolderRemoved")
}

WebInspector.IsolatedFileSystemManager._lastRequestId = 0;

/**
 * @param {string} fileSystemPath
 * @return {string}
 */
WebInspector.IsolatedFileSystemManager.normalizePath = function(fileSystemPath)
{
    fileSystemPath = fileSystemPath.replace(/\\/g, "/");
    if (!fileSystemPath.startsWith("file://")) {
        if (fileSystemPath.startsWith("/"))
            fileSystemPath = "file://" + fileSystemPath;
        else
            fileSystemPath = "file:///" + fileSystemPath;
    }
    return fileSystemPath;
}

WebInspector.IsolatedFileSystemManager.prototype = {
    /**
     * @return {!Promise<!Array<!WebInspector.IsolatedFileSystem>>}
     */
    _requestFileSystems: function()
    {
        var fulfill;
        var promise = new Promise(f => fulfill = f);
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.FileSystemsLoaded, onFileSystemsLoaded, this);
        InspectorFrontendHost.requestFileSystems();
        return promise;

        /**
         * @param {!WebInspector.Event} event
         * @this {WebInspector.IsolatedFileSystemManager}
         */
        function onFileSystemsLoaded(event)
        {
            var fileSystems = /** @type {!Array.<!WebInspector.IsolatedFileSystemManager.FileSystem>} */ (event.data);
            var promises = [];
            for (var i = 0; i < fileSystems.length; ++i)
                promises.push(this._innerAddFileSystem(fileSystems[i], false));
            Promise.all(promises).then(onFileSystemsAdded);
        }

        /**
         * @param {!Array<?WebInspector.IsolatedFileSystem>} fileSystems
         */
        function onFileSystemsAdded(fileSystems)
        {
            fulfill(fileSystems.filter(fs => !!fs));
        }
    },

    addFileSystem: function()
    {
        InspectorFrontendHost.addFileSystem("");
    },

    /**
     * @param {!WebInspector.IsolatedFileSystem} fileSystem
     */
    removeFileSystem: function(fileSystem)
    {
        InspectorFrontendHost.removeFileSystem(fileSystem.embedderPath());
    },

    /**
     * @return {!Promise<!Array<!WebInspector.IsolatedFileSystem>>}
     */
    waitForFileSystems: function()
    {
        return this._fileSystemsLoadedPromise;
    },

    /**
     * @param {!WebInspector.IsolatedFileSystemManager.FileSystem} fileSystem
     * @param {boolean} dispatchEvent
     * @return {!Promise<?WebInspector.IsolatedFileSystem>}
     */
    _innerAddFileSystem: function(fileSystem, dispatchEvent)
    {
        var embedderPath = fileSystem.fileSystemPath;
        var fileSystemPath = WebInspector.IsolatedFileSystemManager.normalizePath(fileSystem.fileSystemPath);
        var promise = WebInspector.IsolatedFileSystem.create(this, fileSystemPath, embedderPath, fileSystem.fileSystemName, fileSystem.rootURL);
        return promise.then(storeFileSystem.bind(this));

        /**
         * @param {?WebInspector.IsolatedFileSystem} fileSystem
         * @this {WebInspector.IsolatedFileSystemManager}
         */
        function storeFileSystem(fileSystem)
        {
            if (!fileSystem)
                return null;
            this._fileSystems.set(fileSystemPath, fileSystem);
            if (dispatchEvent)
                this.dispatchEventToListeners(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, fileSystem);
            return fileSystem;
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onFileSystemAdded: function(event)
    {
        var errorMessage = /** @type {string} */ (event.data["errorMessage"]);
        var fileSystem = /** @type {?WebInspector.IsolatedFileSystemManager.FileSystem} */ (event.data["fileSystem"]);
        if (errorMessage)
            WebInspector.console.error(errorMessage);
        else if (fileSystem)
            this._innerAddFileSystem(fileSystem, true);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onFileSystemRemoved: function(event)
    {
        var embedderPath = /** @type {string} */ (event.data);
        var fileSystemPath = WebInspector.IsolatedFileSystemManager.normalizePath(embedderPath);
        var isolatedFileSystem = this._fileSystems.get(fileSystemPath);
        if (!isolatedFileSystem)
            return;
        this._fileSystems.delete(fileSystemPath);
        isolatedFileSystem.fileSystemRemoved();
        this.dispatchEventToListeners(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, isolatedFileSystem);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onFileSystemFilesChanged: function(event)
    {
        var embedderPaths = /** @type {!Array<string>} */ (event.data);
        var paths = embedderPaths.map(embedderPath => WebInspector.IsolatedFileSystemManager.normalizePath(embedderPath));
        this.dispatchEventToListeners(WebInspector.IsolatedFileSystemManager.Events.FileSystemFilesChanged, paths);
    },

    /**
     * @return {!Array<!WebInspector.IsolatedFileSystem>}
     */
    fileSystems: function()
    {
        return this._fileSystems.valuesArray();
    },

    /**
     * @param {string} fileSystemPath
     * @return {?WebInspector.IsolatedFileSystem}
     */
    fileSystem: function(fileSystemPath)
    {
        return this._fileSystems.get(fileSystemPath) || null;
    },

    _initExcludePatterSetting: function()
    {
        var defaultCommonExcludedFolders = [
            "/\\.devtools",
            "/\\.git/",
            "/\\.sass-cache/",
            "/\\.hg/",
            "/\\.idea/",
            "/\\.svn/",
            "/\\.cache/",
            "/\\.project/"
        ];
        var defaultWinExcludedFolders = [
            "/Thumbs.db$",
            "/ehthumbs.db$",
            "/Desktop.ini$",
            "/\\$RECYCLE.BIN/"
        ];
        var defaultMacExcludedFolders = [
            "/\\.DS_Store$",
            "/\\.Trashes$",
            "/\\.Spotlight-V100$",
            "/\\.AppleDouble$",
            "/\\.LSOverride$",
            "/Icon$",
            "/\\._.*$"
        ];
        var defaultLinuxExcludedFolders = [
            "/.*~$"
        ];
        var defaultExcludedFolders = defaultCommonExcludedFolders;
        if (WebInspector.isWin())
            defaultExcludedFolders = defaultExcludedFolders.concat(defaultWinExcludedFolders);
        else if (WebInspector.isMac())
            defaultExcludedFolders = defaultExcludedFolders.concat(defaultMacExcludedFolders);
        else
            defaultExcludedFolders = defaultExcludedFolders.concat(defaultLinuxExcludedFolders);
        var defaultExcludedFoldersPattern = defaultExcludedFolders.join("|");
        this._workspaceFolderExcludePatternSetting = WebInspector.settings.createRegExpSetting("workspaceFolderExcludePattern", defaultExcludedFoldersPattern, WebInspector.isWin() ? "i" : "");
    },

    /**
     * @return {!WebInspector.Setting}
     */
    workspaceFolderExcludePatternSetting: function()
    {
        return this._workspaceFolderExcludePatternSetting;
    },

    /**
     * @param {function(!Array.<string>)} callback
     * @return {number}
     */
    registerCallback: function(callback)
    {
        var requestId = ++WebInspector.IsolatedFileSystemManager._lastRequestId;
        this._callbacks.set(requestId, callback);
        return requestId;
    },

    /**
     * @param {!WebInspector.Progress} progress
     * @return {number}
     */
    registerProgress: function(progress)
    {
        var requestId = ++WebInspector.IsolatedFileSystemManager._lastRequestId;
        this._progresses.set(requestId, progress);
        return requestId;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onIndexingTotalWorkCalculated: function(event)
    {
        var requestId = /** @type {number} */ (event.data["requestId"]);
        var totalWork = /** @type {number} */ (event.data["totalWork"]);

        var progress = this._progresses.get(requestId);
        if (!progress)
            return;
        progress.setTotalWork(totalWork);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onIndexingWorked: function(event)
    {
        var requestId = /** @type {number} */ (event.data["requestId"]);
        var worked = /** @type {number} */ (event.data["worked"]);

        var progress = this._progresses.get(requestId);
        if (!progress)
            return;
        progress.worked(worked);
        if (progress.isCanceled()) {
            InspectorFrontendHost.stopIndexing(requestId);
            this._onIndexingDone(event);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onIndexingDone: function(event)
    {
        var requestId = /** @type {number} */ (event.data["requestId"]);

        var progress = this._progresses.get(requestId);
        if (!progress)
            return;
        progress.done();
        this._progresses.delete(requestId);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onSearchCompleted: function(event)
    {
        var requestId = /** @type {number} */ (event.data["requestId"]);
        var files = /** @type {!Array.<string>} */ (event.data["files"]);

        var callback = this._callbacks.get(requestId);
        if (!callback)
            return;
        callback.call(null, files);
        this._callbacks.delete(requestId);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @type {!WebInspector.IsolatedFileSystemManager}
 */
WebInspector.isolatedFileSystemManager;
