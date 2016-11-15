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
 * @unrestricted
 */
Workspace.FileSystemMapping = class extends Common.Object {
  /**
   * @param {!Workspace.IsolatedFileSystemManager} fileSystemManager
   */
  constructor(fileSystemManager) {
    super();
    this._fileSystemMappingSetting = Common.settings.createLocalSetting('fileSystemMapping', {});
    /** @type {!Object.<string, !Array.<!Workspace.FileSystemMapping.Entry>>} */
    this._fileSystemMappings = {};
    this._loadFromSettings();

    this._eventListeners = [
      fileSystemManager.addEventListener(
          Workspace.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this),
      fileSystemManager.addEventListener(
          Workspace.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this),
    ];
    fileSystemManager.waitForFileSystems().then(this._fileSystemsLoaded.bind(this));
  }

  /**
   * @param {!Array<!Workspace.IsolatedFileSystem>} fileSystems
   */
  _fileSystemsLoaded(fileSystems) {
    for (var fileSystem of fileSystems)
      this._addMappingsForFilesystem(fileSystem);
  }

  /**
   * @param {!Common.Event} event
   */
  _fileSystemAdded(event) {
    var fileSystem = /** @type {!Workspace.IsolatedFileSystem} */ (event.data);
    this._addMappingsForFilesystem(fileSystem);
  }

  /**
   * @param {!Workspace.IsolatedFileSystem} fileSystem
   */
  _addMappingsForFilesystem(fileSystem) {
    this.addFileSystem(fileSystem.path());

    var mappings = fileSystem.projectProperty('mappings');
    for (var i = 0; Array.isArray(mappings) && i < mappings.length; ++i) {
      var mapping = mappings[i];
      if (!mapping || typeof mapping !== 'object')
        continue;
      var folder = mapping['folder'];
      var url = mapping['url'];
      if (typeof folder !== 'string' || typeof url !== 'string')
        continue;
      this.addNonConfigurableFileMapping(fileSystem.path(), url, folder);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _fileSystemRemoved(event) {
    var fileSystem = /** @type {!Workspace.IsolatedFileSystem} */ (event.data);
    this.removeFileSystem(fileSystem.path());
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
            new Workspace.FileSystemMapping.Entry(fileSystemPath, savedEntry.urlPrefix, savedEntry.pathPrefix, true);
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
      for (var entry of entries) {
        if (entry.configurable)
          setting[fileSystemPath].push(entry);
      }
    }
    this._fileSystemMappingSetting.set(setting);
  }

  _rebuildIndexes() {
    // We are building an index here to search for the longest url prefix match faster.
    this._mappingForURLPrefix = {};
    this._urlPrefixes = [];
    for (var fileSystemPath in this._fileSystemMappings) {
      var fileSystemMapping = this._fileSystemMappings[fileSystemPath];
      for (var i = 0; i < fileSystemMapping.length; ++i) {
        var entry = fileSystemMapping[i];
        // Resolve conflict in favor of configurable mapping.
        if (this._mappingForURLPrefix[entry.urlPrefix] && !entry.configurable)
          continue;
        this._mappingForURLPrefix[entry.urlPrefix] = entry;
        if (this._urlPrefixes.indexOf(entry.urlPrefix) === -1)
          this._urlPrefixes.push(entry.urlPrefix);
      }
    }
    this._urlPrefixes.sort();
  }

  /**
   * @param {string} fileSystemPath
   */
  addFileSystem(fileSystemPath) {
    if (this._fileSystemMappings[fileSystemPath])
      return;

    this._fileSystemMappings[fileSystemPath] = [];
    this._saveToSettings();
  }

  /**
   * @param {string} fileSystemPath
   */
  removeFileSystem(fileSystemPath) {
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
    this._innerAddFileMapping(fileSystemPath, urlPrefix, pathPrefix, true);
    this._saveToSettings();
  }

  /**
   * @param {string} fileSystemPath
   * @param {string} urlPrefix
   * @param {string} pathPrefix
   */
  addNonConfigurableFileMapping(fileSystemPath, urlPrefix, pathPrefix) {
    this._innerAddFileMapping(fileSystemPath, urlPrefix, pathPrefix, false);
  }

  /**
   * @param {string} fileSystemPath
   * @param {string} urlPrefix
   * @param {string} pathPrefix
   * @param {boolean} configurable
   */
  _innerAddFileMapping(fileSystemPath, urlPrefix, pathPrefix, configurable) {
    var entry = new Workspace.FileSystemMapping.Entry(fileSystemPath, urlPrefix, pathPrefix, configurable);
    this._fileSystemMappings[fileSystemPath].push(entry);
    this._rebuildIndexes();
    this.dispatchEventToListeners(Workspace.FileSystemMapping.Events.FileMappingAdded, entry);
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
    this.dispatchEventToListeners(Workspace.FileSystemMapping.Events.FileMappingRemoved, entry);
  }

  /**
   * @param {string} url
   * @return {?Workspace.FileSystemMapping.Entry}
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
   * @return {?Workspace.FileSystemMapping.Entry}
   */
  _mappingEntryForPath(fileSystemPath, filePath) {
    var entries = this._fileSystemMappings[fileSystemPath];
    if (!entries)
      return null;

    var entry = null;
    for (var i = 0; i < entries.length; ++i) {
      var pathPrefix = entries[i].pathPrefix;
      if (entry && entry.configurable && !entries[i].configurable)
        continue;
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
   * @return {?Workspace.FileSystemMapping.Entry}
   */
  _configurableMappingEntryForPathPrefix(fileSystemPath, pathPrefix) {
    var entries = this._fileSystemMappings[fileSystemPath];
    for (var i = 0; i < entries.length; ++i) {
      if (entries[i].configurable && pathPrefix === entries[i].pathPrefix)
        return entries[i];
    }
    return null;
  }

  /**
   * @param {string} fileSystemPath
   * @return {!Array.<!Workspace.FileSystemMapping.Entry>}
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
    if (!entry || !entry.configurable)
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
Workspace.FileSystemMapping.Events = {
  FileMappingAdded: Symbol('FileMappingAdded'),
  FileMappingRemoved: Symbol('FileMappingRemoved')
};

/**
 * @unrestricted
 */
Workspace.FileSystemMapping.Entry = class {
  /**
   * @param {string} fileSystemPath
   * @param {string} urlPrefix
   * @param {string} pathPrefix
   * @param {boolean} configurable
   */
  constructor(fileSystemPath, urlPrefix, pathPrefix, configurable) {
    this.fileSystemPath = fileSystemPath;
    this.urlPrefix = urlPrefix;
    this.pathPrefix = pathPrefix;
    this.configurable = configurable;
  }
};

/**
 * @type {!Workspace.FileSystemMapping}
 */
Workspace.fileSystemMapping;
