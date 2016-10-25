// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.Workspace} workspace
 * @param {function(!WebInspector.PersistenceBinding)} onBindingCreated
 * @param {function(!WebInspector.PersistenceBinding)} onBindingRemoved
 */
WebInspector.Automapping = function(workspace, onBindingCreated, onBindingRemoved)
{
    this._workspace = workspace;

    this._onBindingCreated = onBindingCreated;
    this._onBindingRemoved = onBindingRemoved;
    /** @type {!Set<!WebInspector.PersistenceBinding>} */
    this._bindings = new Set();

    /** @type {!Map<string, !WebInspector.UISourceCode>} */
    this._fileSystemUISourceCodes = new Map();
    this._sweepThrottler = new WebInspector.Throttler(100);

    var pathEncoder = new WebInspector.Automapping.PathEncoder();
    this._filesIndex = new WebInspector.Automapping.FilePathIndex(pathEncoder);
    this._projectFoldersIndex = new WebInspector.Automapping.FolderIndex(pathEncoder);
    this._activeFoldersIndex = new WebInspector.Automapping.FolderIndex(pathEncoder);

    this._eventListeners = [
        this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, event => this._onUISourceCodeAdded(/** @type {!WebInspector.UISourceCode} */(event.data))),
        this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, event => this._onUISourceCodeRemoved(/** @type {!WebInspector.UISourceCode} */(event.data))),
        this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectAdded, event => this._onProjectAdded(/** @type {!WebInspector.Project} */(event.data)), this),
        this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectRemoved, event => this._onProjectRemoved(/** @type {!WebInspector.Project} */(event.data)), this),
    ];

    for (var fileSystem of workspace.projects())
        this._onProjectAdded(fileSystem);
    for (var uiSourceCode of workspace.uiSourceCodes())
        this._onUISourceCodeAdded(uiSourceCode);
}

WebInspector.Automapping._binding = Symbol("Automapping.Binding");
WebInspector.Automapping._processingPromise = Symbol("Automapping.ProcessingPromise");
WebInspector.Automapping._metadata = Symbol("Automapping.Metadata");

WebInspector.Automapping.prototype = {
    _scheduleRemap: function()
    {
        for (var binding of this._bindings.valuesArray())
            this._unbindNetwork(binding.network);
        this._scheduleSweep();
    },

    _scheduleSweep: function()
    {
        this._sweepThrottler.schedule(sweepUnmapped.bind(this));

        /**
         * @this {WebInspector.Automapping}
         * @return {!Promise}
         */
        function sweepUnmapped()
        {
            var networkProjects = this._workspace.projectsForType(WebInspector.projectTypes.Network);
            for (var networkProject of networkProjects) {
                for (var uiSourceCode of networkProject.uiSourceCodes())
                    this._bindNetwork(uiSourceCode);
            }
            this._onSweepHappenedForTest();
            return Promise.resolve();
        }
    },

    _onSweepHappenedForTest: function() { },

    /**
     * @param {!WebInspector.Project} project
     */
    _onProjectRemoved: function(project)
    {
        for (var uiSourceCode of project.uiSourceCodes())
            this._onUISourceCodeRemoved(uiSourceCode);
        if (project.type() !== WebInspector.projectTypes.FileSystem)
            return;
        var fileSystem = /** @type {!WebInspector.FileSystemWorkspaceBinding.FileSystem} */(project);
        for (var gitFolder of fileSystem.gitFolders())
            this._projectFoldersIndex.removeFolder(gitFolder);
        this._projectFoldersIndex.removeFolder(fileSystem.fileSystemPath());
        this._scheduleRemap();
    },

    /**
     * @param {!WebInspector.Project} project
     */
    _onProjectAdded: function(project)
    {
        if (project.type() !== WebInspector.projectTypes.FileSystem)
            return;
        var fileSystem = /** @type {!WebInspector.FileSystemWorkspaceBinding.FileSystem} */(project);
        for (var gitFolder of fileSystem.gitFolders())
            this._projectFoldersIndex.addFolder(gitFolder);
        this._projectFoldersIndex.addFolder(fileSystem.fileSystemPath());
        this._scheduleRemap();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _onUISourceCodeAdded: function(uiSourceCode)
    {
        if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem) {
            this._filesIndex.addPath(uiSourceCode.url());
            this._fileSystemUISourceCodes.set(uiSourceCode.url(), uiSourceCode);
            this._scheduleSweep();
        } else if (uiSourceCode.project().type() === WebInspector.projectTypes.Network) {
            this._bindNetwork(uiSourceCode);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _onUISourceCodeRemoved: function(uiSourceCode)
    {
        if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem) {
            this._filesIndex.removePath(uiSourceCode.url());
            this._fileSystemUISourceCodes.delete(uiSourceCode.url());
            var binding = uiSourceCode[WebInspector.Automapping._binding];
            if (binding)
                this._unbindNetwork(binding.network);
        } else if (uiSourceCode.project().type() === WebInspector.projectTypes.Network) {
            this._unbindNetwork(uiSourceCode);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} networkSourceCode
     */
    _bindNetwork: function(networkSourceCode)
    {
        if (networkSourceCode[WebInspector.Automapping._processingPromise] || networkSourceCode[WebInspector.Automapping._binding])
            return;
        var createBindingPromise = this._createBinding(networkSourceCode).then(onBinding.bind(this));
        networkSourceCode[WebInspector.Automapping._processingPromise] = createBindingPromise;

        /**
         * @param {?WebInspector.PersistenceBinding} binding
         * @this {WebInspector.Automapping}
         */
        function onBinding(binding)
        {
            if (networkSourceCode[WebInspector.Automapping._processingPromise] !== createBindingPromise)
                return;
            networkSourceCode[WebInspector.Automapping._processingPromise] = null;
            if (!binding) {
                this._onBindingFailedForTest();
                return;
            }

            this._bindings.add(binding);
            binding.network[WebInspector.Automapping._binding] = binding;
            binding.fileSystem[WebInspector.Automapping._binding] = binding;
            if (binding.exactMatch) {
                var projectFolder = this._projectFoldersIndex.closestParentFolder(binding.fileSystem.url());
                var newFolderAdded = projectFolder ? this._activeFoldersIndex.addFolder(projectFolder) : false;
                if (newFolderAdded)
                    this._scheduleSweep();
            }
            this._onBindingCreated.call(null, binding);
        }
    },

    _onBindingFailedForTest: function() { },

    /**
     * @param {!WebInspector.UISourceCode} networkSourceCode
     */
    _unbindNetwork: function(networkSourceCode)
    {
        if (networkSourceCode[WebInspector.Automapping._processingPromise]) {
            networkSourceCode[WebInspector.Automapping._processingPromise] = null;
            return;
        }
        var binding = networkSourceCode[WebInspector.Automapping._binding];
        if (!binding)
            return;

        this._bindings.delete(binding);
        binding.network[WebInspector.Automapping._binding] = null;
        binding.fileSystem[WebInspector.Automapping._binding] = null;
        if (binding.exactMatch) {
            var projectFolder = this._projectFoldersIndex.closestParentFolder(binding.fileSystem.url());
            if (projectFolder)
                this._activeFoldersIndex.removeFolder(projectFolder);
        }
        this._onBindingRemoved.call(null, binding);
    },

    /**
     * @param {!WebInspector.UISourceCode} networkSourceCode
     * @return {!Promise<?WebInspector.PersistenceBinding>}
     */
    _createBinding: function(networkSourceCode)
    {
        var networkPath = WebInspector.ParsedURL.extractPath(networkSourceCode.url());
        if (networkPath === null)
            return Promise.resolve(/** @type {?WebInspector.PersistenceBinding} */(null));

        if (networkPath.endsWith("/"))
            networkPath += "index.html";
        var similarFiles = this._filesIndex.similarFiles(networkPath).map(path => this._fileSystemUISourceCodes.get(path));
        if (!similarFiles.length)
            return Promise.resolve(/** @type {?WebInspector.PersistenceBinding} */(null));

        return this._pullMetadatas(similarFiles.concat(networkSourceCode)).then(onMetadatas.bind(this));

        /**
         * @this {WebInspector.Automapping}
         */
        function onMetadatas()
        {
            var activeFiles = similarFiles.filter(file => !!this._activeFoldersIndex.closestParentFolder(file.url()));
            var networkMetadata = networkSourceCode[WebInspector.Automapping._metadata];
            if (!networkMetadata || (!networkMetadata.modificationTime && typeof networkMetadata.contentSize !== "number")) {
                // If networkSourceCode does not have metadata, try to match against active folders.
                if (activeFiles.length !== 1)
                    return null;
                return new WebInspector.PersistenceBinding(networkSourceCode, activeFiles[0], false);
            }

            // Try to find exact matches, prioritizing active folders.
            var exactMatches = this._filterWithMetadata(activeFiles, networkMetadata);
            if (!exactMatches.length)
                exactMatches = this._filterWithMetadata(similarFiles, networkMetadata);
            if (exactMatches.length !== 1)
                return null;
            return new WebInspector.PersistenceBinding(networkSourceCode, exactMatches[0], true);
        }
    },

    /**
     * @param {!Array<!WebInspector.UISourceCode>} uiSourceCodes
     * @return {!Promise}
     */
    _pullMetadatas: function(uiSourceCodes)
    {
        var promises = uiSourceCodes.map(file => fetchMetadata(file));
        return Promise.all(promises);

        /**
         * @param {!WebInspector.UISourceCode} file
         * @return {!Promise}
         */
        function fetchMetadata(file)
        {
            return file.requestMetadata().then(metadata => file[WebInspector.Automapping._metadata] = metadata);
        }
    },

    /**
     * @param {!Array<!WebInspector.UISourceCode>} files
     * @param {!WebInspector.UISourceCodeMetadata} networkMetadata
     * @return {!Array<!WebInspector.UISourceCode>}
     */
    _filterWithMetadata: function(files, networkMetadata)
    {
        return files.filter(file => {
            var fileMetadata = file[WebInspector.Automapping._metadata];
            if (!fileMetadata)
                return false;
            // Allow a second of difference due to network timestamps lack of precision.
            var timeMatches = !networkMetadata.modificationTime || Math.abs(networkMetadata.modificationTime - fileMetadata.modificationTime) < 1000;
            var contentMatches = !networkMetadata.contentSize || fileMetadata.contentSize === networkMetadata.contentSize;
            return timeMatches && contentMatches;
        });
    }
}

/**
 * @constructor
 */
WebInspector.Automapping.PathEncoder = function()
{
    /** @type {!WebInspector.CharacterIdMap<string>} */
    this._encoder = new WebInspector.CharacterIdMap();
}

WebInspector.Automapping.PathEncoder.prototype = {
    /**
     * @param {string} path
     * @return {string}
     */
    encode: function(path)
    {
        return path.split("/").map(token => this._encoder.toChar(token)).join("");
    },

    /**
     * @param {string} path
     * @return {string}
     */
    decode: function(path)
    {
        return path.split("").map(token => this._encoder.fromChar(token)).join("/");
    }
}

/**
 * @constructor
 * @param {!WebInspector.Automapping.PathEncoder} encoder
 */
WebInspector.Automapping.FilePathIndex = function(encoder)
{
    this._encoder = encoder;
    this._reversedIndex = new WebInspector.Trie();
}

WebInspector.Automapping.FilePathIndex.prototype = {
    /**
     * @param {string} path
     */
    addPath: function(path)
    {
        var encodedPath = this._encoder.encode(path);
        this._reversedIndex.add(encodedPath.reverse());
    },

    /**
     * @param {string} path
     */
    removePath: function(path)
    {
        var encodedPath = this._encoder.encode(path);
        this._reversedIndex.remove(encodedPath.reverse());
    },

    /**
     * @param {string} networkPath
     * @return {!Array<string>}
     */
    similarFiles: function(networkPath)
    {
        var encodedPath = this._encoder.encode(networkPath);
        var longestCommonPrefix = this._reversedIndex.longestPrefix(encodedPath.reverse(), false);
        if (!longestCommonPrefix)
            return [];
        return this._reversedIndex.words(longestCommonPrefix).map(encodedPath => this._encoder.decode(encodedPath.reverse()));
    },
}

/**
 * @constructor
 * @param {!WebInspector.Automapping.PathEncoder} encoder
 */
WebInspector.Automapping.FolderIndex = function(encoder)
{
    this._encoder = encoder;
    this._index = new WebInspector.Trie();
    /** @type {!Map<string, number>} */
    this._folderCount = new Map();
}

WebInspector.Automapping.FolderIndex.prototype = {
    /**
     * @param {string} path
     * @return {boolean}
     */
    addFolder: function(path)
    {
        if (path.endsWith("/"))
            path = path.substring(0, path.length - 1);
        var encodedPath = this._encoder.encode(path);
        this._index.add(encodedPath);
        var count = this._folderCount.get(encodedPath) || 0;
        this._folderCount.set(encodedPath, count + 1);
        return count === 0;
    },

    /**
     * @param {string} path
     * @return {boolean}
     */
    removeFolder: function(path)
    {
        if (path.endsWith("/"))
            path = path.substring(0, path.length - 1);
        var encodedPath = this._encoder.encode(path);
        var count = this._folderCount.get(encodedPath) || 0;
        if (!count)
            return false;
        if (count > 1) {
            this._folderCount.set(encodedPath, count - 1);
            return false;
        }
        this._index.remove(encodedPath);
        this._folderCount.delete(encodedPath);
        return true;
    },

    /**
     * @param {string} path
     * @return {string}
     */
    closestParentFolder: function(path)
    {
        var encodedPath = this._encoder.encode(path);
        var commonPrefix = this._index.longestPrefix(encodedPath, true);
        return this._encoder.decode(commonPrefix);
    }
}
