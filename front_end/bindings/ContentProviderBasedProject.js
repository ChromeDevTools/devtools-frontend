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
 * @extends {WebInspector.ProjectStore}
 * @implements {WebInspector.Project}
 * @param {!WebInspector.Workspace} workspace
 * @param {string} id
 * @param {!WebInspector.projectTypes} type
 * @param {string} displayName
 */
WebInspector.ContentProviderBasedProject = function(workspace, id, type, displayName)
{
    WebInspector.ProjectStore.call(this, workspace, id, type, displayName);
    /** @type {!Object.<string, !WebInspector.ContentProvider>} */
    this._contentProviders = {};
    workspace.addProject(this);
}

WebInspector.ContentProviderBasedProject.prototype = {
    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {function(?string)} callback
     */
    requestFileContent: function(uiSourceCode, callback)
    {
        var contentProvider = this._contentProviders[uiSourceCode.url()];
        contentProvider.requestContent(callback);

        /**
         * @param {?string} content
         * @param {boolean} encoded
         * @param {string} mimeType
         */
        function innerCallback(content, encoded, mimeType)
        {
            callback(content);
        }
    },

    /**
     * @override
     * @return {boolean}
     */
    canSetFileContent: function()
    {
        return false;
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} newContent
     * @param {function(?string)} callback
     */
    setFileContent: function(uiSourceCode, newContent, callback)
    {
        callback(null);
    },

    /**
     * @override
     * @return {boolean}
     */
    canRename: function()
    {
        return false;
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {string} newName
     * @param {function(boolean, string=, string=, !WebInspector.ResourceType=)} callback
     */
    rename: function(uiSourceCode, newName, callback)
    {
        var path = uiSourceCode.url();
        this.performRename(path, newName, innerCallback.bind(this));

        /**
         * @param {boolean} success
         * @param {string=} newName
         * @this {WebInspector.ContentProviderBasedProject}
         */
        function innerCallback(success, newName)
        {
            if (success && newName) {
                var copyOfPath = path.split("/");
                copyOfPath[copyOfPath.length - 1] = newName;
                var newPath = copyOfPath.join("/");
                this._contentProviders[newPath] = this._contentProviders[path];
                delete this._contentProviders[path];
                this.renameUISourceCode(uiSourceCode, newName);
            }
            callback(success, newName);
        }
    },

    /**
     * @override
     * @param {string} path
     * @param {function()=} callback
     */
    refresh: function(path, callback)
    {
        if (callback)
            callback();
    },

    /**
     * @override
     * @param {string} path
     */
    excludeFolder: function(path)
    {
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
    },

    /**
     * @override
     * @param {string} path
     */
    deleteFile: function(path)
    {
    },

    /**
     * @override
     */
    remove: function()
    {
    },

    /**
     * @param {string} path
     * @param {string} newName
     * @param {function(boolean, string=)} callback
     */
    performRename: function(path, newName, callback)
    {
        callback(false);
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
        var contentProvider = this._contentProviders[uiSourceCode.url()];
        contentProvider.searchInContent(query, caseSensitive, isRegex, callback);
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
        var result = [];
        var paths = filesMathingFileQuery;
        var totalCount = paths.length;
        if (totalCount === 0) {
            // searchInContent should call back later.
            setTimeout(doneCallback, 0);
            return;
        }

        var barrier = new CallbackBarrier();
        progress.setTotalWork(paths.length);
        for (var i = 0; i < paths.length; ++i)
            searchInContent.call(this, paths[i], barrier.createCallback(searchInContentCallback.bind(null, paths[i])));
        barrier.callWhenDone(doneCallback);

        /**
         * @param {string} path
         * @param {function(boolean)} callback
         * @this {WebInspector.ContentProviderBasedProject}
         */
        function searchInContent(path, callback)
        {
            var queriesToRun = searchConfig.queries().slice();
            searchNextQuery.call(this);

            /**
             * @this {WebInspector.ContentProviderBasedProject}
             */
            function searchNextQuery()
            {
                if (!queriesToRun.length) {
                    callback(true);
                    return;
                }
                var query = queriesToRun.shift();
                this._contentProviders[path].searchInContent(query, !searchConfig.ignoreCase(), searchConfig.isRegex(), contentCallback.bind(this));
            }

            /**
             * @param {!Array.<!WebInspector.ContentProvider.SearchMatch>} searchMatches
             * @this {WebInspector.ContentProviderBasedProject}
             */
            function contentCallback(searchMatches)
            {
                if (!searchMatches.length) {
                    callback(false);
                    return;
                }
                searchNextQuery.call(this);
            }
        }

        /**
         * @param {string} path
         * @param {boolean} matches
         */
        function searchInContentCallback(path, matches)
        {
            if (matches)
                result.push(path);
            progress.worked(1);
        }

        function doneCallback()
        {
            callback(result);
            progress.done();
        }
    },

    /**
     * @override
     * @param {!WebInspector.Progress} progress
     */
    indexContent: function(progress)
    {
        setImmediate(progress.done.bind(progress));
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {!WebInspector.ContentProvider} contentProvider
     */
    addUISourceCodeWithProvider: function(uiSourceCode, contentProvider)
    {
        this._contentProviders[uiSourceCode.url()] = contentProvider;
        this.addUISourceCode(uiSourceCode, true);
    },

    /**
     * @param {string} url
     * @param {!WebInspector.ContentProvider} contentProvider
     * @return {!WebInspector.UISourceCode}
     */
    addContentProvider: function(url, contentProvider)
    {
        var uiSourceCode = this.createUISourceCode(url, contentProvider.contentType());
        this.addUISourceCodeWithProvider(uiSourceCode, contentProvider);
        return uiSourceCode;
    },

    /**
     * @param {string} path
     */
    removeFile: function(path)
    {
        delete this._contentProviders[path];
        this.removeUISourceCode(path);
    },

    reset: function()
    {
        this._contentProviders = {};
        this.removeProject();
        this.workspace().addProject(this);
    },

    dispose: function()
    {
        this._contentProviders = {};
        this.removeProject();
    },

    __proto__: WebInspector.ProjectStore.prototype
}
