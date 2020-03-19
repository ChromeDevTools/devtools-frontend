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

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars

import {Events, IsolatedFileSystemManager} from './IsolatedFileSystemManager.js';  // eslint-disable-line no-unused-vars
import {PlatformFileSystem} from './PlatformFileSystem.js';

/**
 * @unrestricted
 */
export class IsolatedFileSystem extends PlatformFileSystem {
  /**
   * @param {!IsolatedFileSystemManager} manager
   * @param {string} path
   * @param {string} embedderPath
   * @param {!FileSystem} domFileSystem
   * @param {string} type
   */
  constructor(manager, path, embedderPath, domFileSystem, type) {
    super(path, type);
    this._manager = manager;
    this._embedderPath = embedderPath;
    this._domFileSystem = domFileSystem;
    this._excludedFoldersSetting =
        Common.Settings.Settings.instance().createLocalSetting('workspaceExcludedFolders', {});
    /** @type {!Set<string>} */
    this._excludedFolders = new Set(this._excludedFoldersSetting.get()[path] || []);
    /** @type {!Array<string>} */
    this._excludedEmbedderFolders = [];

    /** @type {!Set<string>} */
    this._initialFilePaths = new Set();
    /** @type {!Set<string>} */
    this._initialGitFolders = new Set();
    /** @type {!Map<string, !Promise>} */
    this._fileLocks = new Map();
  }

  /**
   * @param {!IsolatedFileSystemManager} manager
   * @param {string} path
   * @param {string} embedderPath
   * @param {string} type
   * @param {string} name
   * @param {string} rootURL
   * @return {!Promise<?IsolatedFileSystem>}
   */
  static create(manager, path, embedderPath, type, name, rootURL) {
    const domFileSystem = Host.InspectorFrontendHost.InspectorFrontendHostInstance.isolatedFileSystem(name, rootURL);
    if (!domFileSystem) {
      return Promise.resolve(/** @type {?IsolatedFileSystem} */ (null));
    }

    const fileSystem = new IsolatedFileSystem(manager, path, embedderPath, domFileSystem, type);
    return fileSystem._initializeFilePaths().then(() => fileSystem).catch(error => {
      console.error(error);
    });
  }

  /**
   * @param {!DOMError} error
   * @return {string}
   */
  static errorMessage(error) {
    return Common.UIString.UIString('File system error: %s', error.message);
  }

  /**
   * @template T
   * @param {string} path
   * @param {function():!Promise<T>} operation
   * @return {!Promise<T>}
   */
  _serializedFileOperation(path, operation) {
    const promise = Promise.resolve(this._fileLocks.get(path)).then(() => operation.call(null));
    this._fileLocks.set(path, promise);
    return promise;
  }

  /**
   * @override
   * @param {string} path
   * @return {!Promise<?{modificationTime: !Date, size: number}>}
   */
  getMetadata(path) {
    let fulfill;
    const promise = new Promise(f => fulfill = f);
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
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when getting file metadata \'' + path);
      fulfill(null);
    }
  }

  /**
   * @override
   * @return {!Array<string>}
   */
  initialFilePaths() {
    return [...this._initialFilePaths];
  }

  /**
   * @override
   * @return {!Array<string>}
   */
  initialGitFolders() {
    return [...this._initialGitFolders];
  }

  /**
   * @override
   * @return {string}
   */
  embedderPath() {
    return this._embedderPath;
  }

  /**
   * @return {!Promise}
   */
  _initializeFilePaths() {
    let fulfill;
    const promise = new Promise(x => fulfill = x);
    let pendingRequests = 1;
    const boundInnerCallback = innerCallback.bind(this);
    this._requestEntries('', boundInnerCallback);
    return promise;

    /**
     * @param {!Array.<!FileEntry>} entries
     * @this {IsolatedFileSystem}
     */
    function innerCallback(entries) {
      for (let i = 0; i < entries.length; ++i) {
        const entry = entries[i];
        if (!entry.isDirectory) {
          if (this.isFileExcluded(entry.fullPath)) {
            continue;
          }
          this._initialFilePaths.add(entry.fullPath.substr(1));
        } else {
          if (entry.fullPath.endsWith('/.git')) {
            const lastSlash = entry.fullPath.lastIndexOf('/');
            const parentFolder = entry.fullPath.substring(1, lastSlash);
            this._initialGitFolders.add(parentFolder);
          }
          if (this.isFileExcluded(entry.fullPath + '/')) {
            this._excludedEmbedderFolders.push(
                Common.ParsedURL.ParsedURL.urlToPlatformPath(this.path() + entry.fullPath, Host.Platform.isWin()));
            continue;
          }
          ++pendingRequests;
          this._requestEntries(entry.fullPath, boundInnerCallback);
        }
      }
      if ((--pendingRequests === 0)) {
        fulfill();
      }
    }
  }

  /**
   * @param {string} folderPath
   * @return {!Promise<?DirectoryEntry>}
   */
  async _createFoldersIfNotExist(folderPath) {
    // Fast-path. If parent directory already exists we return it immidiatly.
    let dirEntry = await new Promise(
        resolve => this._domFileSystem.root.getDirectory(folderPath, undefined, resolve, () => resolve(null)));
    if (dirEntry) {
      return dirEntry;
    }
    const paths = folderPath.split('/');
    let activePath = '';
    for (const path of paths) {
      activePath = activePath + '/' + path;
      dirEntry = await this._innerCreateFolderIfNeeded(activePath);
      if (!dirEntry) {
        return null;
      }
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
        const errorMessage = IsolatedFileSystem.errorMessage(error);
        console.error(errorMessage + ' trying to create directory \'' + path + '\'');
        resolve(null);
      });
    });
  }

  /**
   * @override
   * @param {string} path
   * @param {?string} name
   * @return {!Promise<?string>}
   */
  async createFile(path, name) {
    const dirEntry = await this._createFoldersIfNotExist(path);
    if (!dirEntry) {
      return null;
    }
    const fileEntry = await this._serializedFileOperation(path, createFileCandidate.bind(this, name || 'NewFile'));
    if (!fileEntry) {
      return null;
    }
    return fileEntry.fullPath.substr(1);

    /**
     * @param {string} name
     * @param {number=} newFileIndex
     * @return {!Promise<?FileEntry>}
     * @this {IsolatedFileSystem}
     */
    function createFileCandidate(name, newFileIndex) {
      return new Promise(resolve => {
        const nameCandidate = name + (newFileIndex || '');
        dirEntry.getFile(nameCandidate, {create: true, exclusive: true}, resolve, error => {
          if (error.name === 'InvalidModificationError') {
            resolve(createFileCandidate.call(this, name, (newFileIndex ? newFileIndex + 1 : 1)));
            return;
          }
          const errorMessage = IsolatedFileSystem.errorMessage(error);
          console.error(
              errorMessage + ' when testing if file exists \'' + (this.path() + '/' + path + '/' + nameCandidate) +
              '\'');
          resolve(null);
        });
      });
    }
  }

  /**
   * @override
   * @param {string} path
   * @return {!Promise<boolean>}
   */
  deleteFile(path) {
    let resolveCallback;
    const promise = new Promise(resolve => resolveCallback = resolve);
    this._domFileSystem.root.getFile(path, undefined, fileEntryLoaded.bind(this), errorHandler.bind(this));
    return promise;

    /**
     * @param {!FileEntry} fileEntry
     * @this {IsolatedFileSystem}
     */
    function fileEntryLoaded(fileEntry) {
      fileEntry.remove(fileEntryRemoved, errorHandler.bind(this));
    }

    function fileEntryRemoved() {
      resolveCallback(true);
    }

    /**
     * @param {!FileError} error
     * @this {IsolatedFileSystem}
     * @suppress {checkTypes}
     * TODO(jsbell): Update externs replacing FileError with DOMException. https://crbug.com/496901
     */
    function errorHandler(error) {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when deleting file \'' + (this.path() + '/' + path) + '\'');
      resolveCallback(false);
    }
  }

  /**
   * @override
   * @param {string} path
   * @return {!Promise<?Blob>}
   */
  requestFileBlob(path) {
    return new Promise(resolve => {
      this._domFileSystem.root.getFile(path, undefined, entry => {
        entry.file(resolve, errorHandler.bind(this));
      }, errorHandler.bind(this));

      /**
       * @this {IsolatedFileSystem}
       */
      function errorHandler(error) {
        if (error.name === 'NotFoundError') {
          resolve(null);
          return;
        }

        const errorMessage = IsolatedFileSystem.errorMessage(error);
        console.error(errorMessage + ' when getting content for file \'' + (this.path() + '/' + path) + '\'');
        resolve(null);
      }
    });
  }

  /**
   * @override
   * @param {string} path
   * @returns {!Promise<!TextUtils.ContentProvider.DeferredContent>}
   */
  requestFileContent(path) {
    return this._serializedFileOperation(path, () => this._innerRequestFileContent(path));
  }

  /**
   * @param {string} path
   * @return {!Promise<!TextUtils.ContentProvider.DeferredContent>}
   */
  async _innerRequestFileContent(path) {
    const blob = await this.requestFileBlob(path);
    if (!blob) {
      return {error: ls`Blob could not be loaded.`, isEncoded: false};
    }

    const reader = new FileReader();
    const extension = Common.ParsedURL.ParsedURL.extractExtension(path);
    const encoded = BinaryExtensions.has(extension);
    const readPromise = new Promise(x => reader.onloadend = x);
    if (encoded) {
      reader.readAsBinaryString(blob);
    } else {
      reader.readAsText(blob);
    }
    await readPromise;
    if (reader.error) {
      const error = ls`Can't read file: ${path}: ${reader.error}`;
      console.error(error);
      return {isEncoded: false, error};
    }
    let result = null;
    let error = null;
    try {
      result = /** @type {string} */ (reader.result);
    } catch (e) {
      result = null;
      error = ls`Can't read file: ${path}: ${e.message}`;
    }
    if (result === undefined || result === null) {
      error = error || ls`Unknown error reading file: ${path}`;
      console.error(error);
      return {isEncoded: false, error};
    }
    return {isEncoded: encoded, content: encoded ? btoa(result) : result};
  }

  /**
   * @override
   * @param {string} path
   * @param {string} content
   * @param {boolean} isBase64
   */
  async setFileContent(path, content, isBase64) {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.FileSavedInWorkspace);
    let callback;
    const innerSetFileContent = () => {
      const promise = new Promise(x => callback = x);
      this._domFileSystem.root.getFile(path, {create: true}, fileEntryLoaded.bind(this), errorHandler.bind(this));
      return promise;
    };

    this._serializedFileOperation(path, innerSetFileContent);

    /**
     * @param {!FileEntry} entry
     * @this {IsolatedFileSystem}
     */
    function fileEntryLoaded(entry) {
      entry.createWriter(fileWriterCreated.bind(this), errorHandler.bind(this));
    }

    /**
     * @param {!FileWriter} fileWriter
     * @this {IsolatedFileSystem}
     */
    async function fileWriterCreated(fileWriter) {
      fileWriter.onerror = errorHandler.bind(this);
      fileWriter.onwriteend = fileWritten;
      let blob;
      if (isBase64) {
        blob = await (await fetch(`data:application/octet-stream;base64,${content}`)).blob();
      } else {
        blob = new Blob([content], {type: 'text/plain'});
      }
      fileWriter.write(blob);

      function fileWritten() {
        fileWriter.onwriteend = callback;
        fileWriter.truncate(blob.size);
      }
    }

    /**
     * @this {IsolatedFileSystem}
     */
    function errorHandler(error) {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when setting content for file \'' + (this.path() + '/' + path) + '\'');
      callback();
    }
  }

  /**
   * @override
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
    let fileEntry;
    let dirEntry;

    this._domFileSystem.root.getFile(path, undefined, fileEntryLoaded.bind(this), errorHandler.bind(this));

    /**
     * @param {!FileEntry} entry
     * @this {IsolatedFileSystem}
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
     * @this {IsolatedFileSystem}
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
     * @this {IsolatedFileSystem}
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
     * @this {IsolatedFileSystem}
     */
    function errorHandler(error) {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when renaming file \'' + (this.path() + '/' + path) + '\' to \'' + newName + '\'');
      callback(false);
    }
  }

  /**
   * @param {!DirectoryEntry} dirEntry
   * @param {function(!Array.<!FileEntry>)} callback
   */
  _readDirectory(dirEntry, callback) {
    const dirReader = dirEntry.createReader();
    let entries = [];

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
      const errorMessage = IsolatedFileSystem.errorMessage(error);
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
     * @this {IsolatedFileSystem}
     */
    function innerCallback(dirEntry) {
      this._readDirectory(dirEntry, callback);
    }

    function errorHandler(error) {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when requesting entry \'' + path + '\'');
      callback([]);
    }
  }

  _saveExcludedFolders() {
    const settingValue = this._excludedFoldersSetting.get();
    settingValue[this.path()] = [...this._excludedFolders];
    this._excludedFoldersSetting.set(settingValue);
  }

  /**
   * @override
   * @param {string} path
   */
  addExcludedFolder(path) {
    this._excludedFolders.add(path);
    this._saveExcludedFolders();
    this._manager.dispatchEventToListeners(Events.ExcludedFolderAdded, path);
  }

  /**
   * @override
   * @param {string} path
   */
  removeExcludedFolder(path) {
    this._excludedFolders.delete(path);
    this._saveExcludedFolders();
    this._manager.dispatchEventToListeners(Events.ExcludedFolderRemoved, path);
  }

  /**
   * @override
   */
  fileSystemRemoved() {
    const settingValue = this._excludedFoldersSetting.get();
    delete settingValue[this.path()];
    this._excludedFoldersSetting.set(settingValue);
  }

  /**
   * @override
   * @param {string} folderPath
   * @return {boolean}
   */
  isFileExcluded(folderPath) {
    if (this._excludedFolders.has(folderPath)) {
      return true;
    }
    const regex = this._manager.workspaceFolderExcludePatternSetting().asRegExp();
    return !!(regex && regex.test(folderPath));
  }

  /**
   * @override
   * @return {!Set<string>}
   */
  excludedFolders() {
    return this._excludedFolders;
  }

  /**
   * @override
   * @param {string} query
   * @param {!Common.Progress.Progress} progress
   * @return {!Promise<!Array<string>>}
   */
  searchInPath(query, progress) {
    return new Promise(resolve => {
      const requestId = this._manager.registerCallback(innerCallback);
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.searchInPath(requestId, this._embedderPath, query);

      /**
       * @param {!Array<string>} files
       */
      function innerCallback(files) {
        resolve(files.map(path => Common.ParsedURL.ParsedURL.platformPathToURL(path)));
        progress.worked(1);
      }
    });
  }

  /**
   * @override
   * @param {!Common.Progress.Progress} progress
   */
  indexContent(progress) {
    progress.setTotalWork(1);
    const requestId = this._manager.registerProgress(progress);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.indexPath(
        requestId, this._embedderPath, JSON.stringify(this._excludedEmbedderFolders));
  }

  /**
   * @override
   * @param {string} path
   * @return {string}
   */
  mimeFromPath(path) {
    return Common.ResourceType.ResourceType.mimeFromURL(path) || 'text/plain';
  }

  /**
   * @override
   * @param {string} path
   * @return {boolean}
   */
  canExcludeFolder(path) {
    return !!path && this.type() !== 'overrides';
  }

  /**
   * @override
   * @param {string} path
   * @return {!Common.ResourceType.ResourceType}
   */
  contentType(path) {
    const extension = Common.ParsedURL.ParsedURL.extractExtension(path);
    if (_styleSheetExtensions.has(extension)) {
      return Common.ResourceType.resourceTypes.Stylesheet;
    }
    if (_documentExtensions.has(extension)) {
      return Common.ResourceType.resourceTypes.Document;
    }
    if (ImageExtensions.has(extension)) {
      return Common.ResourceType.resourceTypes.Image;
    }
    if (_scriptExtensions.has(extension)) {
      return Common.ResourceType.resourceTypes.Script;
    }
    return BinaryExtensions.has(extension) ? Common.ResourceType.resourceTypes.Other :
                                             Common.ResourceType.resourceTypes.Document;
  }

  /**
   * @override
   * @param {string} url
   * @return {string}
   */
  tooltipForURL(url) {
    const path = Common.ParsedURL.ParsedURL.urlToPlatformPath(url, Host.Platform.isWin()).trimMiddle(150);
    return ls`Linked to ${path}`;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsAutomapping() {
    return this.type() !== 'overrides';
  }
}

const _styleSheetExtensions = new Set(['css', 'scss', 'sass', 'less']);
const _documentExtensions = new Set(['htm', 'html', 'asp', 'aspx', 'phtml', 'jsp']);

const _scriptExtensions = new Set([
  'asp', 'aspx', 'c', 'cc', 'cljs', 'coffee', 'cpp', 'cs', 'dart', 'java', 'js',
  'jsp', 'jsx',  'h', 'm',  'mjs',  'mm',     'py',  'sh', 'ts',   'tsx',  'ls'
]);

const ImageExtensions = new Set(['jpeg', 'jpg', 'svg', 'gif', 'webp', 'png', 'ico', 'tiff', 'tif', 'bmp']);

export const BinaryExtensions = new Set([
  // Executable extensions, roughly taken from https://en.wikipedia.org/wiki/Comparison_of_executable_file_formats
  'cmd', 'com', 'exe',
  // Archive extensions, roughly taken from https://en.wikipedia.org/wiki/List_of_archive_formats
  'a', 'ar', 'iso', 'tar', 'bz2', 'gz', 'lz', 'lzma', 'z', '7z', 'apk', 'arc', 'cab', 'dmg', 'jar', 'pak', 'rar', 'zip',
  // Audio file extensions, roughly taken from https://en.wikipedia.org/wiki/Audio_file_format#List_of_formats
  '3gp', 'aac', 'aiff', 'flac', 'm4a', 'mmf', 'mp3', 'ogg', 'oga', 'raw', 'sln', 'wav', 'wma', 'webm',
  // Video file extensions, roughly taken from https://en.wikipedia.org/wiki/Video_file_format
  'mkv', 'flv', 'vob', 'ogv', 'gifv', 'avi', 'mov', 'qt', 'mp4', 'm4p', 'm4v', 'mpg', 'mpeg',
  // Image file extensions
  'jpeg', 'jpg', 'gif', 'webp', 'png', 'ico', 'tiff', 'tif', 'bmp'
]);
