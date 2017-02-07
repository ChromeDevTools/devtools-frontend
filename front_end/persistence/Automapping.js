// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Persistence.Automapping = class {
  /**
   * @param {!Workspace.Workspace} workspace
   * @param {function(!Persistence.PersistenceBinding)} onBindingCreated
   * @param {function(!Persistence.PersistenceBinding)} onBindingRemoved
   */
  constructor(workspace, onBindingCreated, onBindingRemoved) {
    this._workspace = workspace;

    this._onBindingCreated = onBindingCreated;
    this._onBindingRemoved = onBindingRemoved;
    /** @type {!Set<!Persistence.PersistenceBinding>} */
    this._bindings = new Set();

    /** @type {!Map<string, !Workspace.UISourceCode>} */
    this._fileSystemUISourceCodes = new Map();
    this._sweepThrottler = new Common.Throttler(100);

    var pathEncoder = new Persistence.Automapping.PathEncoder();
    this._filesIndex = new Persistence.Automapping.FilePathIndex(pathEncoder);
    this._projectFoldersIndex = new Persistence.Automapping.FolderIndex(pathEncoder);
    this._activeFoldersIndex = new Persistence.Automapping.FolderIndex(pathEncoder);

    this._eventListeners = [
      this._workspace.addEventListener(
          Workspace.Workspace.Events.UISourceCodeAdded,
          event => this._onUISourceCodeAdded(/** @type {!Workspace.UISourceCode} */ (event.data))),
      this._workspace.addEventListener(
          Workspace.Workspace.Events.UISourceCodeRemoved,
          event => this._onUISourceCodeRemoved(/** @type {!Workspace.UISourceCode} */ (event.data))),
      this._workspace.addEventListener(
          Workspace.Workspace.Events.ProjectAdded,
          event => this._onProjectAdded(/** @type {!Workspace.Project} */ (event.data)), this),
      this._workspace.addEventListener(
          Workspace.Workspace.Events.ProjectRemoved,
          event => this._onProjectRemoved(/** @type {!Workspace.Project} */ (event.data)), this),
    ];

    for (var fileSystem of workspace.projects())
      this._onProjectAdded(fileSystem);
    for (var uiSourceCode of workspace.uiSourceCodes())
      this._onUISourceCodeAdded(uiSourceCode);
  }

  _scheduleRemap() {
    for (var binding of this._bindings.valuesArray())
      this._unbindNetwork(binding.network);
    this._scheduleSweep();
  }

  _scheduleSweep() {
    this._sweepThrottler.schedule(sweepUnmapped.bind(this));

    /**
     * @this {Persistence.Automapping}
     * @return {!Promise}
     */
    function sweepUnmapped() {
      var networkProjects = this._workspace.projectsForType(Workspace.projectTypes.Network);
      for (var networkProject of networkProjects) {
        for (var uiSourceCode of networkProject.uiSourceCodes())
          this._bindNetwork(uiSourceCode);
      }
      this._onSweepHappenedForTest();
      return Promise.resolve();
    }
  }

  _onSweepHappenedForTest() {
  }

  /**
   * @param {!Workspace.Project} project
   */
  _onProjectRemoved(project) {
    for (var uiSourceCode of project.uiSourceCodes())
      this._onUISourceCodeRemoved(uiSourceCode);
    if (project.type() !== Workspace.projectTypes.FileSystem)
      return;
    var fileSystem = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (project);
    for (var gitFolder of fileSystem.initialGitFolders())
      this._projectFoldersIndex.removeFolder(gitFolder);
    this._projectFoldersIndex.removeFolder(fileSystem.fileSystemPath());
    this._scheduleRemap();
  }

  /**
   * @param {!Workspace.Project} project
   */
  _onProjectAdded(project) {
    if (project.type() !== Workspace.projectTypes.FileSystem)
      return;
    var fileSystem = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (project);
    for (var gitFolder of fileSystem.initialGitFolders())
      this._projectFoldersIndex.addFolder(gitFolder);
    this._projectFoldersIndex.addFolder(fileSystem.fileSystemPath());
    this._scheduleRemap();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _onUISourceCodeAdded(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace.projectTypes.FileSystem) {
      this._filesIndex.addPath(uiSourceCode.url());
      this._fileSystemUISourceCodes.set(uiSourceCode.url(), uiSourceCode);
      this._scheduleSweep();
    } else if (uiSourceCode.project().type() === Workspace.projectTypes.Network) {
      this._bindNetwork(uiSourceCode);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _onUISourceCodeRemoved(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace.projectTypes.FileSystem) {
      this._filesIndex.removePath(uiSourceCode.url());
      this._fileSystemUISourceCodes.delete(uiSourceCode.url());
      var binding = uiSourceCode[Persistence.Automapping._binding];
      if (binding)
        this._unbindNetwork(binding.network);
    } else if (uiSourceCode.project().type() === Workspace.projectTypes.Network) {
      this._unbindNetwork(uiSourceCode);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} networkSourceCode
   */
  _bindNetwork(networkSourceCode) {
    if (networkSourceCode[Persistence.Automapping._processingPromise] ||
        networkSourceCode[Persistence.Automapping._binding])
      return;
    var createBindingPromise = this._createBinding(networkSourceCode).then(onBinding.bind(this));
    networkSourceCode[Persistence.Automapping._processingPromise] = createBindingPromise;

    /**
     * @param {?Persistence.PersistenceBinding} binding
     * @this {Persistence.Automapping}
     */
    function onBinding(binding) {
      if (networkSourceCode[Persistence.Automapping._processingPromise] !== createBindingPromise)
        return;
      networkSourceCode[Persistence.Automapping._processingPromise] = null;
      if (!binding) {
        this._onBindingFailedForTest();
        return;
      }
      // TODO(lushnikov): remove this check once there's a single uiSourceCode per url. @see crbug.com/670180
      if (binding.network[Persistence.Automapping._binding] || binding.fileSystem[Persistence.Automapping._binding])
        return;

      this._bindings.add(binding);
      binding.network[Persistence.Automapping._binding] = binding;
      binding.fileSystem[Persistence.Automapping._binding] = binding;
      if (binding.exactMatch) {
        var projectFolder = this._projectFoldersIndex.closestParentFolder(binding.fileSystem.url());
        var newFolderAdded = projectFolder ? this._activeFoldersIndex.addFolder(projectFolder) : false;
        if (newFolderAdded)
          this._scheduleSweep();
      }
      this._onBindingCreated.call(null, binding);
    }
  }

  _onBindingFailedForTest() {
  }

  /**
   * @param {!Workspace.UISourceCode} networkSourceCode
   */
  _unbindNetwork(networkSourceCode) {
    if (networkSourceCode[Persistence.Automapping._processingPromise]) {
      networkSourceCode[Persistence.Automapping._processingPromise] = null;
      return;
    }
    var binding = networkSourceCode[Persistence.Automapping._binding];
    if (!binding)
      return;

    this._bindings.delete(binding);
    binding.network[Persistence.Automapping._binding] = null;
    binding.fileSystem[Persistence.Automapping._binding] = null;
    if (binding.exactMatch) {
      var projectFolder = this._projectFoldersIndex.closestParentFolder(binding.fileSystem.url());
      if (projectFolder)
        this._activeFoldersIndex.removeFolder(projectFolder);
    }
    this._onBindingRemoved.call(null, binding);
  }

  /**
   * @param {!Workspace.UISourceCode} networkSourceCode
   * @return {!Promise<?Persistence.PersistenceBinding>}
   */
  _createBinding(networkSourceCode) {
    if (networkSourceCode.url().startsWith('file://')) {
      var fileSourceCode = this._fileSystemUISourceCodes.get(networkSourceCode.url());
      var binding =
          fileSourceCode ? new Persistence.PersistenceBinding(networkSourceCode, fileSourceCode, false) : null;
      return Promise.resolve(binding);
    }

    var networkPath = Common.ParsedURL.extractPath(networkSourceCode.url());
    if (networkPath === null)
      return Promise.resolve(/** @type {?Persistence.PersistenceBinding} */ (null));

    if (networkPath.endsWith('/'))
      networkPath += 'index.html';
    var similarFiles = this._filesIndex.similarFiles(networkPath).map(path => this._fileSystemUISourceCodes.get(path));
    if (!similarFiles.length)
      return Promise.resolve(/** @type {?Persistence.PersistenceBinding} */ (null));

    return this._pullMetadatas(similarFiles.concat(networkSourceCode)).then(onMetadatas.bind(this));

    /**
     * @this {Persistence.Automapping}
     */
    function onMetadatas() {
      var activeFiles = similarFiles.filter(file => !!this._activeFoldersIndex.closestParentFolder(file.url()));
      var networkMetadata = networkSourceCode[Persistence.Automapping._metadata];
      if (!networkMetadata || (!networkMetadata.modificationTime && typeof networkMetadata.contentSize !== 'number')) {
        // If networkSourceCode does not have metadata, try to match against active folders.
        if (activeFiles.length !== 1)
          return null;
        return new Persistence.PersistenceBinding(networkSourceCode, activeFiles[0], false);
      }

      // Try to find exact matches, prioritizing active folders.
      var exactMatches = this._filterWithMetadata(activeFiles, networkMetadata);
      if (!exactMatches.length)
        exactMatches = this._filterWithMetadata(similarFiles, networkMetadata);
      if (exactMatches.length !== 1)
        return null;
      return new Persistence.PersistenceBinding(networkSourceCode, exactMatches[0], true);
    }
  }

  /**
   * @param {!Array<!Workspace.UISourceCode>} uiSourceCodes
   * @return {!Promise}
   */
  _pullMetadatas(uiSourceCodes) {
    var promises = uiSourceCodes.map(file => fetchMetadata(file));
    return Promise.all(promises);

    /**
     * @param {!Workspace.UISourceCode} file
     * @return {!Promise}
     */
    function fetchMetadata(file) {
      return file.requestMetadata().then(metadata => file[Persistence.Automapping._metadata] = metadata);
    }
  }

  /**
   * @param {!Array<!Workspace.UISourceCode>} files
   * @param {!Workspace.UISourceCodeMetadata} networkMetadata
   * @return {!Array<!Workspace.UISourceCode>}
   */
  _filterWithMetadata(files, networkMetadata) {
    return files.filter(file => {
      var fileMetadata = file[Persistence.Automapping._metadata];
      if (!fileMetadata)
        return false;
      // Allow a second of difference due to network timestamps lack of precision.
      var timeMatches = !networkMetadata.modificationTime ||
          Math.abs(networkMetadata.modificationTime - fileMetadata.modificationTime) < 1000;
      var contentMatches = !networkMetadata.contentSize || fileMetadata.contentSize === networkMetadata.contentSize;
      return timeMatches && contentMatches;
    });
  }
};

Persistence.Automapping._binding = Symbol('Automapping.Binding');
Persistence.Automapping._processingPromise = Symbol('Automapping.ProcessingPromise');
Persistence.Automapping._metadata = Symbol('Automapping.Metadata');

/**
 * @unrestricted
 */
Persistence.Automapping.PathEncoder = class {
  constructor() {
    /** @type {!Common.CharacterIdMap<string>} */
    this._encoder = new Common.CharacterIdMap();
  }

  /**
   * @param {string} path
   * @return {string}
   */
  encode(path) {
    return path.split('/').map(token => this._encoder.toChar(token)).join('');
  }

  /**
   * @param {string} path
   * @return {string}
   */
  decode(path) {
    return path.split('').map(token => this._encoder.fromChar(token)).join('/');
  }
};

/**
 * @unrestricted
 */
Persistence.Automapping.FilePathIndex = class {
  /**
   * @param {!Persistence.Automapping.PathEncoder} encoder
   */
  constructor(encoder) {
    this._encoder = encoder;
    this._reversedIndex = new Common.Trie();
  }

  /**
   * @param {string} path
   */
  addPath(path) {
    var encodedPath = this._encoder.encode(path);
    this._reversedIndex.add(encodedPath.reverse());
  }

  /**
   * @param {string} path
   */
  removePath(path) {
    var encodedPath = this._encoder.encode(path);
    this._reversedIndex.remove(encodedPath.reverse());
  }

  /**
   * @param {string} networkPath
   * @return {!Array<string>}
   */
  similarFiles(networkPath) {
    var encodedPath = this._encoder.encode(networkPath);
    var longestCommonPrefix = this._reversedIndex.longestPrefix(encodedPath.reverse(), false);
    if (!longestCommonPrefix)
      return [];
    return this._reversedIndex.words(longestCommonPrefix)
        .map(encodedPath => this._encoder.decode(encodedPath.reverse()));
  }
};

/**
 * @unrestricted
 */
Persistence.Automapping.FolderIndex = class {
  /**
   * @param {!Persistence.Automapping.PathEncoder} encoder
   */
  constructor(encoder) {
    this._encoder = encoder;
    this._index = new Common.Trie();
    /** @type {!Map<string, number>} */
    this._folderCount = new Map();
  }

  /**
   * @param {string} path
   * @return {boolean}
   */
  addFolder(path) {
    if (path.endsWith('/'))
      path = path.substring(0, path.length - 1);
    var encodedPath = this._encoder.encode(path);
    this._index.add(encodedPath);
    var count = this._folderCount.get(encodedPath) || 0;
    this._folderCount.set(encodedPath, count + 1);
    return count === 0;
  }

  /**
   * @param {string} path
   * @return {boolean}
   */
  removeFolder(path) {
    if (path.endsWith('/'))
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
  }

  /**
   * @param {string} path
   * @return {string}
   */
  closestParentFolder(path) {
    var encodedPath = this._encoder.encode(path);
    var commonPrefix = this._index.longestPrefix(encodedPath, true);
    return this._encoder.decode(commonPrefix);
  }
};
