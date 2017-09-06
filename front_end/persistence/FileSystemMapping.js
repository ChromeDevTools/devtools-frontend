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

Persistence.FileSystemMapping = class extends Common.Object {
  /**
   * @param {!Persistence.IsolatedFileSystemManager} fileSystemManager
   */
  constructor(fileSystemManager) {
    super();
    this._fileSystemMappingSetting = Common.settings.createLocalSetting('fileSystemMapping', {});
    /** @type {!Object<string, !Persistence.FileSystemMapping.Entry>} */
    this._mappingForURLPrefix = {};
    /** @type {!Array<string>} */
    this._urlPrefixes = [];

    /** @type {!Object.<string, !Array.<!Persistence.FileSystemMapping.Entry>>} */
    this._fileSystemMappings = {};
    this._loadFromSettings();

    this._eventListeners = [
      fileSystemManager.addEventListener(
          Persistence.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this),
      fileSystemManager.addEventListener(
          Persistence.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this),
    ];
    fileSystemManager.waitForFileSystems().then(this._fileSystemsLoaded.bind(this));
  }

  /**
   * @param {!Array<!Persistence.IsolatedFileSystem>} fileSystems
   */
  _fileSystemsLoaded(fileSystems) {
    for (var fileSystem of fileSystems)
      this._addFileSystemPath(fileSystem.path());
  }

  /**
   * @param {!Common.Event} event
   */
  _fileSystemAdded(event) {
    var fileSystem = /** @type {!Persistence.IsolatedFileSystem} */ (event.data);
    this._addFileSystemPath(fileSystem.path());
  }

  /**
   * @param {!Common.Event} event
   */
  _fileSystemRemoved(event) {
    var fileSystem = /** @type {!Persistence.IsolatedFileSystem} */ (event.data);
    this._removeFileSystemPath(fileSystem.path());
  }

  _loadFromSettings() {
    var savedMapping = this._fileSystemMappingSetting.get();
    this._fileSystemMappings = {};
    for (var fileSystemPath in savedMapping) {
      var savedFileSystemMappings = savedMapping[fileSystemPath];
      fileSystemPath = Common.ParsedURL.platformPathToURL(fileSystemPath);
      this._fileSystemMappings[fileSystemPath] = [];
      var fileSystemMappings = this._fileSystemMappings[fileSystemPath];

      for (var i = 0; i < savedFileSystemMappings.length; ++i) {
        var savedEntry = savedFileSystemMappings[i];
        var entry =
            new Persistence.FileSystemMapping.Entry(fileSystemPath, savedEntry.urlPrefix, savedEntry.pathPrefix);
        fileSystemMappings.push(entry);
      }
    }

    this._rebuildIndexes();
  }

  _saveToSettings() {
    var setting = {};
    for (var fileSystemPath in this._fileSystemMappings) {
      setting[fileSystemPath] = [];
      var entries = this._fileSystemMappings[fileSystemPath];
      for (var entry of entries)
        setting[fileSystemPath].push(entry);
    }
    this._fileSystemMappingSetting.set(setting);
  }

  _rebuildIndexes() {
    // We are building an index here to search for the longest url prefix match faster.
    this._mappingForURLPrefix = {};
    for (var fileSystemMapping of Object.values(this._fileSystemMappings)) {
      for (var entry of fileSystemMapping)
        this._mappingForURLPrefix[entry.urlPrefix] = entry;
    }
    this._urlPrefixes = Object.keys(this._mappingForURLPrefix).sort();
  }

  /**
   * @param {string} fileSystemPath
   */
  _addFileSystemPath(fileSystemPath) {
    if (this._fileSystemMappings[fileSystemPath])
      return;

    this._fileSystemMappings[fileSystemPath] = [];
    this._saveToSettings();
  }

  /**
   * @param {string} fileSystemPath
   */
  _removeFileSystemPath(fileSystemPath) {
    if (!this._fileSystemMappings[fileSystemPath])
      return;
    delete this._fileSystemMappings[fileSystemPath];
    this._rebuildIndexes();
    this._saveToSettings();
  }

  /**
   * @param {string} fileSystemPath
   * @param {string} urlPrefix
   * @param {string} pathPrefix
   */
  addFileMapping(fileSystemPath, urlPrefix, pathPrefix) {
    if (!urlPrefix.endsWith('/'))
      urlPrefix += '/';
    if (!pathPrefix.endsWith('/'))
      pathPrefix += '/';
    if (!pathPrefix.startsWith('/'))
      pathPrefix = '/' + pathPrefix;
    this._innerAddFileMapping(fileSystemPath, urlPrefix, pathPrefix);
    this._saveToSettings();
  }

  /**
   * @param {string} fileSystemPath
   * @param {string} urlPrefix
   * @param {string} pathPrefix
   */
  _innerAddFileMapping(fileSystemPath, urlPrefix, pathPrefix) {
    var entry = new Persistence.FileSystemMapping.Entry(fileSystemPath, urlPrefix, pathPrefix);
    this._fileSystemMappings[fileSystemPath].push(entry);
    this._rebuildIndexes();
    this.dispatchEventToListeners(Persistence.FileSystemMapping.Events.FileMappingAdded, entry);
  }

  /**
   * @param {string} fileSystemPath
   * @param {string} urlPrefix
   * @param {string} pathPrefix
   */
  removeFileMapping(fileSystemPath, urlPrefix, pathPrefix) {
    var entry = this._configurableMappingEntryForPathPrefix(fileSystemPath, pathPrefix);
    if (!entry)
      return;
    this._fileSystemMappings[fileSystemPath].remove(entry);
    this._rebuildIndexes();
    this._saveToSettings();
    this.dispatchEventToListeners(Persistence.FileSystemMapping.Events.FileMappingRemoved, entry);
  }

  /**
   * @param {string} url
   * @return {?Persistence.FileSystemMapping.Entry}
   */
  _mappingEntryForURL(url) {
    for (var i = this._urlPrefixes.length - 1; i >= 0; --i) {
      var urlPrefix = this._urlPrefixes[i];
      if (url.startsWith(urlPrefix))
        return this._mappingForURLPrefix[urlPrefix];
    }
    return null;
  }

  /**
   * @param {string} fileSystemPath
   * @param {string} filePath
   * @return {?Persistence.FileSystemMapping.Entry}
   */
  _mappingEntryForPath(fileSystemPath, filePath) {
    var entries = this._fileSystemMappings[fileSystemPath];
    if (!entries)
      return null;

    var entry = null;
    for (var i = 0; i < entries.length; ++i) {
      var pathPrefix = entries[i].pathPrefix;
      // We are looking for the longest pathPrefix match.
      if (entry && entry.pathPrefix.length > pathPrefix.length)
        continue;
      if (filePath.startsWith(pathPrefix))
        entry = entries[i];
    }
    return entry;
  }

  /**
   * @param {string} fileSystemPath
   * @param {string} pathPrefix
   * @return {?Persistence.FileSystemMapping.Entry}
   */
  _configurableMappingEntryForPathPrefix(fileSystemPath, pathPrefix) {
    var entries = this._fileSystemMappings[fileSystemPath];
    for (var i = 0; i < entries.length; ++i) {
      if (pathPrefix === entries[i].pathPrefix)
        return entries[i];
    }
    return null;
  }

  /**
   * @param {string} fileSystemPath
   * @return {!Array.<!Persistence.FileSystemMapping.Entry>}
   */
  mappingEntries(fileSystemPath) {
    return this._fileSystemMappings[fileSystemPath].slice();
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  hasMappingForNetworkURL(url) {
    return !!this._mappingEntryForURL(url);
  }

  /**
   * @param {string} url
   * @return {?{fileSystemPath: string, fileURL: string}}
   */
  fileForURL(url) {
    var entry = this._mappingEntryForURL(url);
    if (!entry)
      return null;
    var file = {};
    file.fileSystemPath = entry.fileSystemPath;
    file.fileURL = entry.fileSystemPath + entry.pathPrefix + url.substr(entry.urlPrefix.length);
    return file;
  }

  /**
   * @param {string} fileSystemPath
   * @param {string} filePath
   * @return {string}
   */
  networkURLForFileSystemURL(fileSystemPath, filePath) {
    var relativePath = filePath.substring(fileSystemPath.length);
    var entry = this._mappingEntryForPath(fileSystemPath, relativePath);
    if (!entry)
      return '';
    return entry.urlPrefix + relativePath.substring(entry.pathPrefix.length);
  }

  /**
   * @param {string} url
   */
  removeMappingForURL(url) {
    var entry = this._mappingEntryForURL(url);
    if (!entry)
      return;
    this._fileSystemMappings[entry.fileSystemPath].remove(entry);
    this._saveToSettings();
  }

  /**
   * @param {string} url
   * @param {string} fileSystemPath
   * @param {string} filePath
   */
  addMappingForResource(url, fileSystemPath, filePath) {
    var commonPathSuffixLength = 0;
    for (var i = 0; i < filePath.length; ++i) {
      var filePathCharacter = filePath[filePath.length - 1 - i];
      var urlCharacter = url[url.length - 1 - i];
      if (filePathCharacter !== urlCharacter)
        break;
      if (filePathCharacter === '/')
        commonPathSuffixLength = i;
    }
    var from = fileSystemPath.length;
    var to = filePath.length - commonPathSuffixLength;
    var pathPrefix = filePath.substring(from, to);
    var urlPrefix = url.substr(0, url.length - commonPathSuffixLength);
    if (to >= from)
      this.addFileMapping(fileSystemPath, urlPrefix, pathPrefix);
    else
      this.addFileMapping(fileSystemPath, urlPrefix + pathPrefix, '/');
  }

  resetForTesting() {
    this._fileSystemMappings = {};
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }
};

/** @enum {symbol} */
Persistence.FileSystemMapping.Events = {
  FileMappingAdded: Symbol('FileMappingAdded'),
  FileMappingRemoved: Symbol('FileMappingRemoved')
};

Persistence.FileSystemMapping.Entry = class {
  /**
   * @param {string} fileSystemPath
   * @param {string} urlPrefix
   * @param {string} pathPrefix
   */
  constructor(fileSystemPath, urlPrefix, pathPrefix) {
    /** @const */
    this.fileSystemPath = fileSystemPath;
    /** @const */
    this.urlPrefix = urlPrefix;
    /** @const */
    this.pathPrefix = pathPrefix;
  }
};

/**
 * @type {!Persistence.FileSystemMapping}
 */
Persistence.fileSystemMapping;
