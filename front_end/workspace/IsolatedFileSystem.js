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
 * @unrestricted
 */
Workspace.IsolatedFileSystem = class {
  /**
   * @param {!Workspace.IsolatedFileSystemManager} manager
   * @param {string} path
   * @param {string} embedderPath
   * @param {!DOMFileSystem} domFileSystem
   */
  constructor(manager, path, embedderPath, domFileSystem) {
    this._manager = manager;
    this._path = path;
    this._embedderPath = embedderPath;
    this._domFileSystem = domFileSystem;
    this._excludedFoldersSetting = Common.settings.createLocalSetting('workspaceExcludedFolders', {});
    /** @type {!Set<string>} */
    this._excludedFolders = new Set(this._excludedFoldersSetting.get()[path] || []);
    /** @type {!Set<string>} */
    this._nonConfigurableExcludedFolders = new Set();

    /** @type {!Set<string>} */
    this._initialFilePaths = new Set();
    /** @type {!Set<string>} */
    this._initialGitFolders = new Set();
  }

  /**
   * @param {!Workspace.IsolatedFileSystemManager} manager
   * @param {string} path
   * @param {string} embedderPath
   * @param {string} name
   * @param {string} rootURL
   * @return {!Promise<?Workspace.IsolatedFileSystem>}
   */
  static create(manager, path, embedderPath, name, rootURL) {
    var domFileSystem = InspectorFrontendHost.isolatedFileSystem(name, rootURL);
    if (!domFileSystem)
      return Promise.resolve(/** @type {?Workspace.IsolatedFileSystem} */ (null));

    var fileSystem = new Workspace.IsolatedFileSystem(manager, path, embedderPath, domFileSystem);
    var fileContentPromise = fileSystem.requestFileContentPromise('.devtools');
    return fileContentPromise.then(onConfigAvailable)
        .then(() => fileSystem)
        .catchException(/** @type {?Workspace.IsolatedFileSystem} */ (null));

    /**
     * @param {?string} projectText
     * @return {!Promise}
     */
    function onConfigAvailable(projectText) {
      if (projectText) {
        try {
          var projectObject = JSON.parse(projectText);
          fileSystem._initializeProject(
              typeof projectObject === 'object' ? /** @type {!Object} */ (projectObject) : null);
        } catch (e) {
          Common.console.error('Invalid project file: ' + projectText);
        }
      }
      return fileSystem._initializeFilePaths();
    }
  }

  /**
   * @param {!DOMError} error
   * @return {string}
   */
  static errorMessage(error) {
    return Common.UIString('File system error: %s', error.message);
  }

  /**
   * @param {string} path
   * @return {!Promise<?{modificationTime: !Date, size: number}>}
   */
  getMetadata(path) {
    var fulfill;
    var promise = new Promise(f => fulfill = f);
    this._domFileSystem.root.getFile(path, undefined, fileEntryLoaded, errorHandler);
    return promise;

    /**
     * @param {!FileEntry} entry
     */
    function fileEntryLoaded(entry) {
      entry.getMetadata(fulfill, errorHandler);
    }

    /**
     * @param {!FileError} error
     */
    function errorHandler(error) {
      var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when getting file metadata \'' + path);
      fulfill(null);
    }
  }

  /**
   * @return {!Array<string>}
   */
  initialFilePaths() {
    return this._initialFilePaths.valuesArray();
  }

  /**
   * @return {!Array<string>}
   */
  initialGitFolders() {
    return this._initialGitFolders.valuesArray();
  }

  /**
   * @return {string}
   */
  path() {
    return this._path;
  }

  /**
   * @return {string}
   */
  embedderPath() {
    return this._embedderPath;
  }

  /**
   * @param {?Object} projectObject
   */
  _initializeProject(projectObject) {
    this._projectObject = projectObject;

    var projectExcludes = this.projectProperty('excludes');
    if (Array.isArray(projectExcludes)) {
      for (var folder of /** @type {!Array<*>} */ (projectExcludes)) {
        if (typeof folder === 'string')
          this._nonConfigurableExcludedFolders.add(folder);
      }
    }
  }

  /**
   * @param {string} key
   * @return {*}
   */
  projectProperty(key) {
    return this._projectObject ? this._projectObject[key] : null;
  }

  /**
   * @return {!Promise}
   */
  _initializeFilePaths() {
    var fulfill;
    var promise = new Promise(x => fulfill = x);
    var pendingRequests = 1;
    var boundInnerCallback = innerCallback.bind(this);
    this._requestEntries('', boundInnerCallback);
    return promise;

    /**
     * @param {!Array.<!FileEntry>} entries
     * @this {Workspace.IsolatedFileSystem}
     */
    function innerCallback(entries) {
      for (var i = 0; i < entries.length; ++i) {
        var entry = entries[i];
        if (!entry.isDirectory) {
          if (this._isFileExcluded(entry.fullPath))
            continue;
          this._initialFilePaths.add(entry.fullPath.substr(1));
        } else {
          if (entry.fullPath.endsWith('/.git')) {
            var lastSlash = entry.fullPath.lastIndexOf('/');
            var parentFolder = entry.fullPath.substring(1, lastSlash);
            this._initialGitFolders.add(parentFolder);
          }
          if (this._isFileExcluded(entry.fullPath + '/'))
            continue;
          ++pendingRequests;
          this._requestEntries(entry.fullPath, boundInnerCallback);
        }
      }
      if ((--pendingRequests === 0))
        fulfill();
    }
  }

  /**
   * @param {string} path
   * @param {?string} name
   * @param {function(?string)} callback
   */
  createFile(path, name, callback) {
    var newFileIndex = 1;
    if (!name)
      name = 'NewFile';
    var nameCandidate;

    this._domFileSystem.root.getDirectory(path, undefined, dirEntryLoaded.bind(this), errorHandler.bind(this));

    /**
     * @param {!DirectoryEntry} dirEntry
     * @this {Workspace.IsolatedFileSystem}
     */
    function dirEntryLoaded(dirEntry) {
      var nameCandidate = name;
      if (newFileIndex > 1)
        nameCandidate += newFileIndex;
      ++newFileIndex;
      dirEntry.getFile(nameCandidate, {create: true, exclusive: true}, fileCreated, fileCreationError.bind(this));

      function fileCreated(entry) {
        callback(entry.fullPath.substr(1));
      }

      /**
       * @this {Workspace.IsolatedFileSystem}
       */
      function fileCreationError(error) {
        if (error.name === 'InvalidModificationError') {
          dirEntryLoaded.call(this, dirEntry);
          return;
        }

        var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
        console.error(
            errorMessage + ' when testing if file exists \'' + (this._path + '/' + path + '/' + nameCandidate) + '\'');
        callback(null);
      }
    }

    /**
     * @this {Workspace.IsolatedFileSystem}
     */
    function errorHandler(error) {
      var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
      var filePath = this._path + '/' + path;
      if (nameCandidate)
        filePath += '/' + nameCandidate;
      console.error(errorMessage + ' when getting content for file \'' + (filePath) + '\'');
      callback(null);
    }
  }

  /**
   * @param {string} path
   */
  deleteFile(path) {
    this._domFileSystem.root.getFile(path, undefined, fileEntryLoaded.bind(this), errorHandler.bind(this));

    /**
     * @param {!FileEntry} fileEntry
     * @this {Workspace.IsolatedFileSystem}
     */
    function fileEntryLoaded(fileEntry) {
      fileEntry.remove(fileEntryRemoved, errorHandler.bind(this));
    }

    function fileEntryRemoved() {
    }

    /**
     * @param {!FileError} error
     * @this {Workspace.IsolatedFileSystem}
     * @suppress {checkTypes}
     * TODO(jsbell): Update externs replacing FileError with DOMException. https://crbug.com/496901
     */
    function errorHandler(error) {
      var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when deleting file \'' + (this._path + '/' + path) + '\'');
    }
  }

  /**
   * @param {string} path
   * @return {!Promise<?string>}
   */
  requestFileContentPromise(path) {
    var fulfill;
    var promise = new Promise(x => fulfill = x);
    this.requestFileContent(path, fulfill);
    return promise;
  }

  /**
   * @param {string} path
   * @param {function(?string)} callback
   */
  requestFileContent(path, callback) {
    this._domFileSystem.root.getFile(path, undefined, fileEntryLoaded.bind(this), errorHandler.bind(this));

    /**
     * @param {!FileEntry} entry
     * @this {Workspace.IsolatedFileSystem}
     */
    function fileEntryLoaded(entry) {
      entry.file(fileLoaded, errorHandler.bind(this));
    }

    /**
     * @param {!Blob} file
     */
    function fileLoaded(file) {
      var reader = new FileReader();
      reader.onloadend = readerLoadEnd;
      if (Workspace.IsolatedFileSystem.ImageExtensions.has(Common.ParsedURL.extractExtension(path)))
        reader.readAsDataURL(file);
      else
        reader.readAsText(file);
    }

    /**
     * @this {!FileReader}
     */
    function readerLoadEnd() {
      /** @type {?string} */
      var string = null;
      try {
        string = /** @type {string} */ (this.result);
      } catch (e) {
        console.error('Can\'t read file: ' + path + ': ' + e);
      }
      callback(string);
    }

    /**
     * @this {Workspace.IsolatedFileSystem}
     */
    function errorHandler(error) {
      if (error.name === 'NotFoundError') {
        callback(null);
        return;
      }

      var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when getting content for file \'' + (this._path + '/' + path) + '\'');
      callback(null);
    }
  }

  /**
   * @param {string} path
   * @param {string} content
   * @param {function()} callback
   */
  setFileContent(path, content, callback) {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.FileSavedInWorkspace);
    this._domFileSystem.root.getFile(path, {create: true}, fileEntryLoaded.bind(this), errorHandler.bind(this));

    /**
     * @param {!FileEntry} entry
     * @this {Workspace.IsolatedFileSystem}
     */
    function fileEntryLoaded(entry) {
      entry.createWriter(fileWriterCreated.bind(this), errorHandler.bind(this));
    }

    /**
     * @param {!FileWriter} fileWriter
     * @this {Workspace.IsolatedFileSystem}
     */
    function fileWriterCreated(fileWriter) {
      fileWriter.onerror = errorHandler.bind(this);
      fileWriter.onwriteend = fileWritten;
      var blob = new Blob([content], {type: 'text/plain'});
      fileWriter.write(blob);

      function fileWritten() {
        fileWriter.onwriteend = callback;
        fileWriter.truncate(blob.size);
      }
    }

    /**
     * @this {Workspace.IsolatedFileSystem}
     */
    function errorHandler(error) {
      var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when setting content for file \'' + (this._path + '/' + path) + '\'');
      callback();
    }
  }

  /**
   * @param {string} path
   * @param {string} newName
   * @param {function(boolean, string=)} callback
   */
  renameFile(path, newName, callback) {
    newName = newName ? newName.trim() : newName;
    if (!newName || newName.indexOf('/') !== -1) {
      callback(false);
      return;
    }
    var fileEntry;
    var dirEntry;

    this._domFileSystem.root.getFile(path, undefined, fileEntryLoaded.bind(this), errorHandler.bind(this));

    /**
     * @param {!FileEntry} entry
     * @this {Workspace.IsolatedFileSystem}
     */
    function fileEntryLoaded(entry) {
      if (entry.name === newName) {
        callback(false);
        return;
      }

      fileEntry = entry;
      fileEntry.getParent(dirEntryLoaded.bind(this), errorHandler.bind(this));
    }

    /**
     * @param {!Entry} entry
     * @this {Workspace.IsolatedFileSystem}
     */
    function dirEntryLoaded(entry) {
      dirEntry = entry;
      dirEntry.getFile(newName, null, newFileEntryLoaded, newFileEntryLoadErrorHandler.bind(this));
    }

    /**
     * @param {!FileEntry} entry
     */
    function newFileEntryLoaded(entry) {
      callback(false);
    }

    /**
     * @this {Workspace.IsolatedFileSystem}
     */
    function newFileEntryLoadErrorHandler(error) {
      if (error.name !== 'NotFoundError') {
        callback(false);
        return;
      }
      fileEntry.moveTo(dirEntry, newName, fileRenamed, errorHandler.bind(this));
    }

    /**
     * @param {!FileEntry} entry
     */
    function fileRenamed(entry) {
      callback(true, entry.name);
    }

    /**
     * @this {Workspace.IsolatedFileSystem}
     */
    function errorHandler(error) {
      var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when renaming file \'' + (this._path + '/' + path) + '\' to \'' + newName + '\'');
      callback(false);
    }
  }

  /**
   * @param {!DirectoryEntry} dirEntry
   * @param {function(!Array.<!FileEntry>)} callback
   */
  _readDirectory(dirEntry, callback) {
    var dirReader = dirEntry.createReader();
    var entries = [];

    function innerCallback(results) {
      if (!results.length) {
        callback(entries.sort());
      } else {
        entries = entries.concat(toArray(results));
        dirReader.readEntries(innerCallback, errorHandler);
      }
    }

    function toArray(list) {
      return Array.prototype.slice.call(list || [], 0);
    }

    dirReader.readEntries(innerCallback, errorHandler);

    function errorHandler(error) {
      var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when reading directory \'' + dirEntry.fullPath + '\'');
      callback([]);
    }
  }

  /**
   * @param {string} path
   * @param {function(!Array.<!FileEntry>)} callback
   */
  _requestEntries(path, callback) {
    this._domFileSystem.root.getDirectory(path, undefined, innerCallback.bind(this), errorHandler);

    /**
     * @param {!DirectoryEntry} dirEntry
     * @this {Workspace.IsolatedFileSystem}
     */
    function innerCallback(dirEntry) {
      this._readDirectory(dirEntry, callback);
    }

    function errorHandler(error) {
      var errorMessage = Workspace.IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when requesting entry \'' + path + '\'');
      callback([]);
    }
  }

  _saveExcludedFolders() {
    var settingValue = this._excludedFoldersSetting.get();
    settingValue[this._path] = this._excludedFolders.valuesArray();
    this._excludedFoldersSetting.set(settingValue);
  }

  /**
   * @param {string} path
   */
  addExcludedFolder(path) {
    this._excludedFolders.add(path);
    this._saveExcludedFolders();
    this._manager.dispatchEventToListeners(Workspace.IsolatedFileSystemManager.Events.ExcludedFolderAdded, path);
  }

  /**
   * @param {string} path
   */
  removeExcludedFolder(path) {
    this._excludedFolders.delete(path);
    this._saveExcludedFolders();
    this._manager.dispatchEventToListeners(Workspace.IsolatedFileSystemManager.Events.ExcludedFolderRemoved, path);
  }

  fileSystemRemoved() {
    var settingValue = this._excludedFoldersSetting.get();
    delete settingValue[this._path];
    this._excludedFoldersSetting.set(settingValue);
  }

  /**
   * @param {string} folderPath
   * @return {boolean}
   */
  _isFileExcluded(folderPath) {
    if (this._nonConfigurableExcludedFolders.has(folderPath) || this._excludedFolders.has(folderPath))
      return true;
    var regex = this._manager.workspaceFolderExcludePatternSetting().asRegExp();
    return !!(regex && regex.test(folderPath));
  }

  /**
   * @return {!Set<string>}
   */
  excludedFolders() {
    return this._excludedFolders;
  }

  /**
   * @return {!Set<string>}
   */
  nonConfigurableExcludedFolders() {
    return this._nonConfigurableExcludedFolders;
  }

  /**
   * @param {string} query
   * @param {!Common.Progress} progress
   * @param {function(!Array.<string>)} callback
   */
  searchInPath(query, progress, callback) {
    var requestId = this._manager.registerCallback(innerCallback);
    InspectorFrontendHost.searchInPath(requestId, this._embedderPath, query);

    /**
     * @param {!Array.<string>} files
     */
    function innerCallback(files) {
      files = files.map(embedderPath => Common.ParsedURL.platformPathToURL(embedderPath));
      progress.worked(1);
      callback(files);
    }
  }

  /**
   * @param {!Common.Progress} progress
   */
  indexContent(progress) {
    progress.setTotalWork(1);
    var requestId = this._manager.registerProgress(progress);
    InspectorFrontendHost.indexPath(requestId, this._embedderPath);
  }
};

Workspace.IsolatedFileSystem.ImageExtensions =
    new Set(['jpeg', 'jpg', 'svg', 'gif', 'webp', 'png', 'ico', 'tiff', 'tif', 'bmp']);
