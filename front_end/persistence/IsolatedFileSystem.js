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
Persistence.IsolatedFileSystem = class {
  /**
   * @param {!Persistence.IsolatedFileSystemManager} manager
   * @param {string} path
   * @param {string} embedderPath
   * @param {!DOMFileSystem} domFileSystem
   * @param {string} type
   */
  constructor(manager, path, embedderPath, domFileSystem, type) {
    this._manager = manager;
    this._path = path;
    this._embedderPath = embedderPath;
    this._domFileSystem = domFileSystem;
    this._type = type;
    this._excludedFoldersSetting = Common.settings.createLocalSetting('workspaceExcludedFolders', {});
    /** @type {!Set<string>} */
    this._excludedFolders = new Set(this._excludedFoldersSetting.get()[path] || []);

    /** @type {!Set<string>} */
    this._initialFilePaths = new Set();
    /** @type {!Set<string>} */
    this._initialGitFolders = new Set();
  }

  /**
   * @param {!Persistence.IsolatedFileSystemManager} manager
   * @param {string} path
   * @param {string} embedderPath
   * @param {string} type
   * @param {string} name
   * @param {string} rootURL
   * @return {!Promise<?Persistence.IsolatedFileSystem>}
   */
  static create(manager, path, embedderPath, type, name, rootURL) {
    var domFileSystem = InspectorFrontendHost.isolatedFileSystem(name, rootURL);
    if (!domFileSystem)
      return Promise.resolve(/** @type {?Persistence.IsolatedFileSystem} */ (null));

    var fileSystem = new Persistence.IsolatedFileSystem(manager, path, embedderPath, domFileSystem, type);
    return fileSystem._initializeFilePaths()
        .then(() => fileSystem)
        .catchException(/** @type {?Persistence.IsolatedFileSystem} */ (null));
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
      var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
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
   * @return {string}
   */
  type() {
    return this._type;
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
     * @this {Persistence.IsolatedFileSystem}
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
   * @param {string} folderPath
   * @return {!Promise<?DirectoryEntry>}
   */
  async _createFoldersIfNotExist(folderPath) {
    // Fast-path. If parent directory already exists we return it immidiatly.
    var dirEntry = await new Promise(
        resolve => this._domFileSystem.root.getDirectory(folderPath, undefined, resolve, () => resolve(null)));
    if (dirEntry)
      return dirEntry;
    var paths = folderPath.split('/');
    var activePath = '';
    for (var path of paths) {
      activePath = activePath + '/' + path;
      dirEntry = await this._innerCreateFolderIfNeeded(activePath);
      if (!dirEntry)
        return null;
    }
    return dirEntry;
  }

  /**
   * @param {string} path
   * @return {!Promise<?DirectoryEntry>}
   */
  _innerCreateFolderIfNeeded(path) {
    return new Promise(resolve => {
      this._domFileSystem.root.getDirectory(path, {create: true}, dirEntry => resolve(dirEntry), error => {
        var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
        console.error(errorMessage + ' trying to create directory \'' + path + '\'');
        resolve(null);
      });
    });
  }

  /**
   * @param {string} path
   * @param {?string} name
   * @return {!Promise<?string>}
   */
  async createFile(path, name) {
    var dirEntry = await this._createFoldersIfNotExist(path);
    if (!dirEntry)
      return null;
    var fileEntry = await createFileCandidate.call(this, name || 'NewFile');
    if (!fileEntry)
      return null;
    return fileEntry.fullPath.substr(1);

    /**
     * @param {string} name
     * @param {number=} newFileIndex
     * @return {!Promise<?FileEntry>}
     * @this {Persistence.IsolatedFileSystem}
     */
    function createFileCandidate(name, newFileIndex) {
      return new Promise(resolve => {
        var nameCandidate = name + (newFileIndex || '');
        dirEntry.getFile(nameCandidate, {create: true, exclusive: true}, resolve, error => {
          if (error.name === 'InvalidModificationError') {
            resolve(createFileCandidate.call(this, name, (newFileIndex ? newFileIndex + 1 : 1)));
            return;
          }
          var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
          console.error(
              errorMessage + ' when testing if file exists \'' + (this._path + '/' + path + '/' + nameCandidate) +
              '\'');
          resolve(null);
        });
      });
    }
  }

  /**
   * @param {string} path
   */
  deleteFile(path) {
    this._domFileSystem.root.getFile(path, undefined, fileEntryLoaded.bind(this), errorHandler.bind(this));

    /**
     * @param {!FileEntry} fileEntry
     * @this {Persistence.IsolatedFileSystem}
     */
    function fileEntryLoaded(fileEntry) {
      fileEntry.remove(fileEntryRemoved, errorHandler.bind(this));
    }

    function fileEntryRemoved() {
    }

    /**
     * @param {!FileError} error
     * @this {Persistence.IsolatedFileSystem}
     * @suppress {checkTypes}
     * TODO(jsbell): Update externs replacing FileError with DOMException. https://crbug.com/496901
     */
    function errorHandler(error) {
      var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when deleting file \'' + (this._path + '/' + path) + '\'');
    }
  }

  /**
   * @param {string} path
   * @return {!Promise<?Blob>}
   */
  requestFileBlob(path) {
    return new Promise(resolve => {
      this._domFileSystem.root.getFile(path, undefined, entry => {
        entry.file(resolve, errorHandler.bind(this));
      }, errorHandler.bind(this));

      /**
       * @this {Persistence.IsolatedFileSystem}
       */
      function errorHandler(error) {
        if (error.name === 'NotFoundError') {
          resolve(null);
          return;
        }

        var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
        console.error(errorMessage + ' when getting content for file \'' + (this._path + '/' + path) + '\'');
        resolve(null);
      }
    });
  }

  /**
   * @param {string} path
   * @return {!Promise<?string>}
   */
  async requestFileContentPromise(path) {
    var blob = await this.requestFileBlob(path);
    if (!blob)
      return null;

    var reader = new FileReader();
    var fileContentsLoadedPromise = new Promise(resolve => reader.onloadend = resolve);
    if (Persistence.IsolatedFileSystem.ImageExtensions.has(Common.ParsedURL.extractExtension(path)))
      reader.readAsDataURL(blob);
    else
      reader.readAsText(blob);
    await fileContentsLoadedPromise;
    if (reader.error) {
      console.error('Can\'t read file: ' + path + ': ' + reader.error);
      return null;
    }
    try {
      var result = reader.result;
    } catch (e) {
      result = null;
      console.error('Can\'t read file: ' + path + ': ' + e);
    }
    if (result === undefined)
      return null;
    return result;
  }

  /**
   * @param {string} path
   * @param {function(?string)} callback
   */
  requestFileContent(path, callback) {
    this.requestFileContentPromise(path).then(callback);
  }

  /**
   * @param {string} path
   * @param {string} content
   * @param {boolean} isBase64
   * @param {function()} callback
   */
  setFileContent(path, content, isBase64, callback) {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.FileSavedInWorkspace);
    this._domFileSystem.root.getFile(path, {create: true}, fileEntryLoaded.bind(this), errorHandler.bind(this));

    /**
     * @param {!FileEntry} entry
     * @this {Persistence.IsolatedFileSystem}
     */
    function fileEntryLoaded(entry) {
      entry.createWriter(fileWriterCreated.bind(this), errorHandler.bind(this));
    }

    /**
     * @param {!FileWriter} fileWriter
     * @this {Persistence.IsolatedFileSystem}
     */
    async function fileWriterCreated(fileWriter) {
      fileWriter.onerror = errorHandler.bind(this);
      fileWriter.onwriteend = fileWritten;
      var blob;
      if (isBase64)
        blob = await(await fetch(`data:application/octet-stream;base64,${content}`)).blob();
      else
        blob = new Blob([content], {type: 'text/plain'});
      fileWriter.write(blob);

      function fileWritten() {
        fileWriter.onwriteend = callback;
        fileWriter.truncate(blob.size);
      }
    }

    /**
     * @this {Persistence.IsolatedFileSystem}
     */
    function errorHandler(error) {
      var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
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
     * @this {Persistence.IsolatedFileSystem}
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
     * @this {Persistence.IsolatedFileSystem}
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
     * @this {Persistence.IsolatedFileSystem}
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
     * @this {Persistence.IsolatedFileSystem}
     */
    function errorHandler(error) {
      var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
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
      var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
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
     * @this {Persistence.IsolatedFileSystem}
     */
    function innerCallback(dirEntry) {
      this._readDirectory(dirEntry, callback);
    }

    function errorHandler(error) {
      var errorMessage = Persistence.IsolatedFileSystem.errorMessage(error);
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
    this._manager.dispatchEventToListeners(Persistence.IsolatedFileSystemManager.Events.ExcludedFolderAdded, path);
  }

  /**
   * @param {string} path
   */
  removeExcludedFolder(path) {
    this._excludedFolders.delete(path);
    this._saveExcludedFolders();
    this._manager.dispatchEventToListeners(Persistence.IsolatedFileSystemManager.Events.ExcludedFolderRemoved, path);
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
    if (this._excludedFolders.has(folderPath))
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
   * @param {string} query
   * @param {!Common.Progress} progress
   * @return {!Promise<!Array<string>>}
   */
  searchInPath(query, progress) {
    return new Promise(resolve => {
      var requestId = this._manager.registerCallback(innerCallback);
      InspectorFrontendHost.searchInPath(requestId, this._embedderPath, query);

      /**
       * @param {!Array<string>} files
       */
      function innerCallback(files) {
        resolve(files.map(path => Common.ParsedURL.platformPathToURL(path)));
        progress.worked(1);
      }
    });
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

Persistence.IsolatedFileSystem.ImageExtensions =
    new Set(['jpeg', 'jpg', 'svg', 'gif', 'webp', 'png', 'ico', 'tiff', 'tif', 'bmp']);
