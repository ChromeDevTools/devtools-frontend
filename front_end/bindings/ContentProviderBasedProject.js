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
 * @implements {Workspace.Project}
 * @unrestricted
 */
Bindings.ContentProviderBasedProject = class extends Workspace.ProjectStore {
  /**
   * @param {!Workspace.Workspace} workspace
   * @param {string} id
   * @param {!Workspace.projectTypes} type
   * @param {string} displayName
   * @param {boolean} isServiceProject
   */
  constructor(workspace, id, type, displayName, isServiceProject) {
    super(workspace, id, type, displayName);
    /** @type {!Object.<string, !Common.ContentProvider>} */
    this._contentProviders = {};
    this._isServiceProject = isServiceProject;
    workspace.addProject(this);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {function(?string)} callback
   */
  requestFileContent(uiSourceCode, callback) {
    var contentProvider = this._contentProviders[uiSourceCode.url()];
    contentProvider.requestContent().then(callback);
  }

  /**
   * @override
   * @return {boolean}
   */
  isServiceProject() {
    return this._isServiceProject;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Promise<?Workspace.UISourceCodeMetadata>}
   */
  requestMetadata(uiSourceCode) {
    return Promise.resolve(uiSourceCode[Bindings.ContentProviderBasedProject._metadata]);
  }

  /**
   * @override
   * @return {boolean}
   */
  canSetFileContent() {
    return false;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} newContent
   * @param {function(?string)} callback
   */
  setFileContent(uiSourceCode, newContent, callback) {
    callback(null);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {string}
   */
  fullDisplayName(uiSourceCode) {
    var parentPath = uiSourceCode.parentURL().replace(/^(?:https?|file)\:\/\//, '');
    try {
      parentPath = decodeURI(parentPath);
    } catch (e) {
    }
    return parentPath + '/' + uiSourceCode.displayName(true);
  }

  /**
   * @override
   * @return {boolean}
   */
  canRename() {
    return false;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} newName
   * @param {function(boolean, string=, string=, !Common.ResourceType=)} callback
   */
  rename(uiSourceCode, newName, callback) {
    var path = uiSourceCode.url();
    this.performRename(path, newName, innerCallback.bind(this));

    /**
     * @param {boolean} success
     * @param {string=} newName
     * @this {Bindings.ContentProviderBasedProject}
     */
    function innerCallback(success, newName) {
      if (success && newName) {
        var copyOfPath = path.split('/');
        copyOfPath[copyOfPath.length - 1] = newName;
        var newPath = copyOfPath.join('/');
        this._contentProviders[newPath] = this._contentProviders[path];
        delete this._contentProviders[path];
        this.renameUISourceCode(uiSourceCode, newName);
      }
      callback(success, newName);
    }
  }

  /**
   * @override
   * @param {string} path
   */
  excludeFolder(path) {
  }

  /**
   * @override
   * @param {string} path
   * @param {?string} name
   * @param {string} content
   * @param {function(?Workspace.UISourceCode)} callback
   */
  createFile(path, name, content, callback) {
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  deleteFile(uiSourceCode) {
  }

  /**
   * @override
   */
  remove() {
  }

  /**
   * @param {string} path
   * @param {string} newName
   * @param {function(boolean, string=)} callback
   */
  performRename(path, newName, callback) {
    callback(false);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @param {function(!Array.<!Common.ContentProvider.SearchMatch>)} callback
   */
  searchInFileContent(uiSourceCode, query, caseSensitive, isRegex, callback) {
    var contentProvider = this._contentProviders[uiSourceCode.url()];
    contentProvider.searchInContent(query, caseSensitive, isRegex, callback);
  }

  /**
   * @override
   * @param {!Workspace.ProjectSearchConfig} searchConfig
   * @param {!Array.<string>} filesMathingFileQuery
   * @param {!Common.Progress} progress
   * @param {function(!Array.<string>)} callback
   */
  findFilesMatchingSearchRequest(searchConfig, filesMathingFileQuery, progress, callback) {
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
     * @this {Bindings.ContentProviderBasedProject}
     */
    function searchInContent(path, callback) {
      var queriesToRun = searchConfig.queries().slice();
      searchNextQuery.call(this);

      /**
       * @this {Bindings.ContentProviderBasedProject}
       */
      function searchNextQuery() {
        if (!queriesToRun.length) {
          callback(true);
          return;
        }
        var query = queriesToRun.shift();
        this._contentProviders[path].searchInContent(
            query, !searchConfig.ignoreCase(), searchConfig.isRegex(), contentCallback.bind(this));
      }

      /**
       * @param {!Array.<!Common.ContentProvider.SearchMatch>} searchMatches
       * @this {Bindings.ContentProviderBasedProject}
       */
      function contentCallback(searchMatches) {
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
    function searchInContentCallback(path, matches) {
      if (matches)
        result.push(path);
      progress.worked(1);
    }

    function doneCallback() {
      callback(result);
      progress.done();
    }
  }

  /**
   * @override
   * @param {!Common.Progress} progress
   */
  indexContent(progress) {
    setImmediate(progress.done.bind(progress));
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Common.ContentProvider} contentProvider
   * @param {?Workspace.UISourceCodeMetadata} metadata
   */
  addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata) {
    this._contentProviders[uiSourceCode.url()] = contentProvider;
    uiSourceCode[Bindings.ContentProviderBasedProject._metadata] = metadata;
    this.addUISourceCode(uiSourceCode, true);
  }

  /**
   * @param {string} url
   * @param {!Common.ContentProvider} contentProvider
   * @return {!Workspace.UISourceCode}
   */
  addContentProvider(url, contentProvider) {
    var uiSourceCode = this.createUISourceCode(url, contentProvider.contentType());
    this.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null);
    return uiSourceCode;
  }

  /**
   * @param {string} path
   */
  removeFile(path) {
    delete this._contentProviders[path];
    this.removeUISourceCode(path);
  }

  reset() {
    this._contentProviders = {};
    this.removeProject();
    this.workspace().addProject(this);
  }

  dispose() {
    this._contentProviders = {};
    this.removeProject();
  }
};

Bindings.ContentProviderBasedProject._metadata = Symbol('ContentProviderBasedProject.Metadata');
