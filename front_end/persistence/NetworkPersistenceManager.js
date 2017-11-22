// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Persistence.NetworkPersistenceManager = class extends Common.Object {
  /**
   * @param {!Workspace.Workspace} workspace
   */
  constructor(workspace) {
    super();
    this._bindingSymbol = Symbol('NetworkPersistenceBinding');

    this._enabledSetting = Common.settings.moduleSetting('persistenceNetworkOverridesEnabled');
    this._enabledSetting.addChangeListener(this._enabledChanged, this);

    this._workspace = workspace;
    this._domainForFileSystemPathSetting = Common.settings.createSetting('domainForFileSystemPath', []);
    /** @type {!Map<string, string>} */
    this._domainForFileSystemMap = new Map(this._domainForFileSystemPathSetting.get());
    /** @type {!Map<string, string>} */
    this._fileSystemForDomain = new Map(this._domainForFileSystemPathSetting.get().map(value => [value[1], value[0]]));

    /** @type {!Map<string, !Workspace.UISourceCode>} */
    this._networkUISourceCodeForEncodedPath = new Map();
    this._interceptionHandlerBound = this._interceptionHandler.bind(this);
    this._updateInterceptionThrottler = new Common.Throttler(50);

    /** @type {?Workspace.Project} */
    this._activeProject = null;

    Persistence.isolatedFileSystemManager.addEventListener(
        Persistence.IsolatedFileSystemManager.Events.FileSystemRemoved,
        event => this._onFileSystemRemoved(/** @type {!Persistence.IsolatedFileSystem} */ (event.data)));

    /** @type {!Array<!Common.EventTarget.EventDescriptor>} */
    this._eventDescriptors = [];
    this._enabledChanged();
  }

  /**
   * @return {?string}
   */
  static inspectedPageDomain() {
    var maintarget = SDK.targetManager.mainTarget();
    var inspectedURL = maintarget ? maintarget.inspectedURL() : '';
    var parsedURL = new Common.ParsedURL(inspectedURL);
    var scheme = parsedURL.scheme;
    if (parsedURL.isValid && (scheme === 'http' || scheme === 'https'))
      return parsedURL.domain() || null;
    return null;
  }

  /**
   * @param {string} domain
   * @param {!Workspace.Project} project
   */
  addFileSystemOverridesProject(domain, project) {
    var fileSystemPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(project.id());
    if (!fileSystemPath || this.projectForDomain(domain))
      return;
    var oldDomain = this.domainForProject(project);
    if (oldDomain) {
      this._onProjectRemoved(project);
      this._fileSystemForDomain.delete(oldDomain);
    }
    this._domainForFileSystemMap.set(fileSystemPath, domain);
    this._fileSystemForDomain.set(domain, fileSystemPath);
    this._domainForFileSystemPathSetting.set(Array.from(this._domainForFileSystemMap.entries()));

    this._onProjectAdded(project);
    for (var uiSourceCode of project.uiSourceCodes())
      this._onUISourceCodeAdded(uiSourceCode);
    this.dispatchEventToListeners(Persistence.NetworkPersistenceManager.Events.ProjectDomainChanged, project);
  }

  /**
   * @return {?Workspace.Project}
   */
  activeProject() {
    return this._activeProject;
  }

  /**
   * @param {!Workspace.Project} project
   * @return {?string}
   */
  domainForProject(project) {
    if (project.type() !== Workspace.projectTypes.FileSystem)
      return null;
    var fileSystemPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(project.id());
    if (!fileSystemPath)
      return null;
    return this._domainForFileSystemMap.get(fileSystemPath) || null;
  }

  /**
   * @param {?string} domain
   * @return {?Workspace.Project}
   */
  projectForDomain(domain) {
    if (!domain)
      return null;
    var fileSystemPath = this._fileSystemForDomain.get(domain);
    if (!fileSystemPath)
      return null;
    return this._workspace.project(Persistence.FileSystemWorkspaceBinding.projectId(fileSystemPath)) || null;
  }

  /**
   * @return {?Workspace.Project}
   */
  projectForActiveDomain() {
    return this.projectForDomain(Persistence.NetworkPersistenceManager.inspectedPageDomain());
  }

  /**
   * @param {!Persistence.IsolatedFileSystem} fileSystem
   * @return {?Persistence.FileSystemWorkspaceBinding.FileSystem}
   */
  projectForFileSystem(fileSystem) {
    if (!this._domainForFileSystemMap.has(fileSystem.path()))
      return null;
    return /** @type {?Persistence.FileSystemWorkspaceBinding.FileSystem} */ (
        this._workspace.project(Persistence.FileSystemWorkspaceBinding.projectId(fileSystem.path())));
  }

  _enabledChanged() {
    if (this._enabledSetting.get()) {
      this._eventDescriptors = [
        this._workspace.addEventListener(
            Workspace.Workspace.Events.ProjectAdded,
            event => this._onProjectAdded(/** @type {!Workspace.Project} */ (event.data))),
        this._workspace.addEventListener(
            Workspace.Workspace.Events.ProjectRemoved,
            event => this._onProjectRemoved(/** @type {!Workspace.Project} */ (event.data))),
        SDK.targetManager.addEventListener(
            SDK.TargetManager.Events.InspectedURLChanged, this._updateActiveProject, this),
        Workspace.workspace.addEventListener(
            Workspace.Workspace.Events.UISourceCodeRenamed,
            event => {
              var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode);
              this._onUISourceCodeRemoved(uiSourceCode);
              this._onUISourceCodeAdded(uiSourceCode);
            }),
        Workspace.workspace.addEventListener(
            Workspace.Workspace.Events.UISourceCodeAdded,
            event => this._onUISourceCodeAdded(/** @type {!Workspace.UISourceCode} */ (event.data))),
        Workspace.workspace.addEventListener(
            Workspace.Workspace.Events.UISourceCodeRemoved,
            event => this._onUISourceCodeRemoved(/** @type {!Workspace.UISourceCode} */ (event.data))),
        Workspace.workspace.addEventListener(
            Workspace.Workspace.Events.WorkingCopyCommitted,
            event => this._onUISourceCodeWorkingCopyCommitted(
                /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode)))
      ];
      var networkProjects = this._workspace.projectsForType(Workspace.projectTypes.Network);
      this._updateActiveProject();
      for (var networkProject of networkProjects)
        networkProject.uiSourceCodes().forEach(this._onUISourceCodeAdded.bind(this));
    } else {
      Common.EventTarget.removeEventListeners(this._eventDescriptors);
      this._networkUISourceCodeForEncodedPath.clear();
      this._updateActiveProject();
    }
  }

  _updateActiveProject() {
    var mainTarget = SDK.targetManager.mainTarget();
    if (!this._enabledSetting.get() || !mainTarget) {
      this._setActiveProject(null);
      return;
    }
    this._setActiveProject(this.projectForDomain(Persistence.NetworkPersistenceManager.inspectedPageDomain()));
  }

  /**
   * @param {?Workspace.Project} project
   */
  _setActiveProject(project) {
    if (this._activeProject === project)
      return;
    var oldProject = this._activeProject;
    this._activeProject = project;
    if (oldProject)
      oldProject.uiSourceCodes().forEach(this._onUISourceCodeRemoved.bind(this));
    if (project)
      project.uiSourceCodes().forEach(this._onUISourceCodeAdded.bind(this));
    Persistence.persistence.setAutomappingEnabled(!this._activeProject);
  }

  /**
   * @param {string} url
   * @return {string}
   */
  _encodedPathFromUrl(url) {
    if (!this._activeProject)
      return '';
    var urlPath = Common.ParsedURL.urlWithoutHash(url.replace(/^https?:\/\//, ''));
    if (urlPath.endsWith('/') && urlPath.indexOf('?') === -1)
      urlPath = urlPath + 'index.html';
    var encodedPathParts = encodeUrlPathToLocalPathParts(urlPath);
    var projectPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(this._activeProject.id());
    var encodedPath = encodedPathParts.join('/');
    if (projectPath.length + encodedPath.length > 200) {
      var domain = encodedPathParts[0];
      var encodedFileName = encodedPathParts[encodedPathParts.length - 1];
      var shortFileName = encodedFileName ? encodedFileName.substr(0, 10) + '-' : '';
      var extension = Common.ParsedURL.extractExtension(urlPath);
      var extensionPart = extension ? '.' + extension.substr(0, 10) : '';
      encodedPathParts =
          [domain, 'longurls', shortFileName + String.hashCode(encodedPath).toString(16) + extensionPart];
    }
    return encodedPathParts.join('/');

    /**
     * @param {string} urlPath
     * @return {!Array<string>}
     */
    function encodeUrlPathToLocalPathParts(urlPath) {
      var encodedParts = [];
      for (var pathPart of fileNamePartsFromUrlPath(urlPath)) {
        if (!pathPart)
          continue;
        // encodeURI() escapes all the unsafe filename characters except /:?*
        var encodedName = encodeURI(pathPart).replace(/[\/:\?\*]/g, match => '%' + match[0].charCodeAt(0).toString(16));
        // Windows does not allow a small set of filenames.
        if (Persistence.NetworkPersistenceManager._reservedFileNames.has(encodedName.toLowerCase()))
          encodedName = encodedName.split('').map(char => '%' + char.charCodeAt(0).toString(16)).join('');
        // Windows does not allow the file to end in a space or dot (space should already be encoded).
        var lastChar = encodedName.charAt(encodedName.length - 1);
        if (lastChar === '.')
          encodedName = encodedName.substr(0, encodedName.length - 1) + '%2e';
        encodedParts.push(encodedName);
      }
      return encodedParts;
    }

    /**
     * @param {string} urlPath
     * @return {!Array<string>}
     */
    function fileNamePartsFromUrlPath(urlPath) {
      urlPath = Common.ParsedURL.urlWithoutHash(urlPath);
      var queryIndex = urlPath.indexOf('?');
      if (queryIndex === -1)
        return urlPath.split('/');
      if (queryIndex === 0)
        return [urlPath];
      var endSection = urlPath.substr(queryIndex);
      var parts = urlPath.substr(0, urlPath.length - endSection.length).split('/');
      parts[parts.length - 1] += endSection;
      return parts;
    }
  }

  /**
   * @param {string} path
   * @return {string}
   */
  _decodeLocalPathToUrlPath(path) {
    try {
      return unescape(path);
    } catch (e) {
      console.error(e);
    }
    return path;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _unbind(uiSourceCode) {
    var binding = uiSourceCode[this._bindingSymbol];
    if (!binding)
      return;
    delete binding.network[this._bindingSymbol];
    delete binding.fileSystem[this._bindingSymbol];
    Persistence.persistence.removeBinding(binding);
  }

  /**
   * @param {!Workspace.UISourceCode} networkUISourceCode
   * @param {!Workspace.UISourceCode} fileSystemUISourceCode
   */
  _bind(networkUISourceCode, fileSystemUISourceCode) {
    if (networkUISourceCode[this._bindingSymbol] || fileSystemUISourceCode[this._bindingSymbol])
      return;
    var binding = new Persistence.PersistenceBinding(networkUISourceCode, fileSystemUISourceCode, true);
    networkUISourceCode[this._bindingSymbol] = binding;
    fileSystemUISourceCode[this._bindingSymbol] = binding;
    Persistence.persistence.addBinding(binding);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _onUISourceCodeWorkingCopyCommitted(uiSourceCode) {
    this.saveUISourceCodeForOverrides(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  canSaveUISourceCodeForOverrides(uiSourceCode) {
    return this._activeProject && uiSourceCode.project().type() === Workspace.projectTypes.Network &&
        !uiSourceCode[this._bindingSymbol];
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  async saveUISourceCodeForOverrides(uiSourceCode) {
    if (!this.canSaveUISourceCodeForOverrides(uiSourceCode))
      return;
    var encodedPath = this._encodedPathFromUrl(uiSourceCode.url());
    var content = await uiSourceCode.requestContent();
    var encoded = await uiSourceCode.contentEncoded();
    var lastIndexOfSlash = encodedPath.lastIndexOf('/');
    var encodedFileName = encodedPath.substr(lastIndexOfSlash + 1);
    encodedPath = encodedPath.substr(0, lastIndexOfSlash);
    this._activeProject.createFile(encodedPath, encodedFileName, content, encoded);
    this._fileCreatedForTest(encodedPath, encodedFileName);
  }

  /**
   * @param {string} path
   * @param {string} fileName
   */
  _fileCreatedForTest(path, fileName) {
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {string}
   */
  _patternForFileSystemUISourceCode(uiSourceCode) {
    var relativePathParts = Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    if (relativePathParts.length < 2)
      return '';
    if (relativePathParts[1] === 'longurls' && relativePathParts.length !== 2)
      return 'http?://' + relativePathParts[0] + '/*';
    return 'http?://' + this._decodeLocalPathToUrlPath(relativePathParts.join('/'));
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _onUISourceCodeAdded(uiSourceCode) {
    if (!this._activeProject)
      return;
    if (uiSourceCode.project().type() === Workspace.projectTypes.Network) {
      var url = Common.ParsedURL.urlWithoutHash(uiSourceCode.url());
      this._networkUISourceCodeForEncodedPath.set(this._encodedPathFromUrl(url), uiSourceCode);

      var fileSystemUISourceCode = this._activeProject.uiSourceCodeForURL(
          this._activeProject.fileSystemPath() + '/' + this._encodedPathFromUrl(url));
      if (!fileSystemUISourceCode)
        return;
      this._bind(uiSourceCode, fileSystemUISourceCode);
      return;
    }
    if (uiSourceCode.project() !== this._activeProject)
      return;

    this._updateInterceptionPatterns();

    var relativePath = Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    var networkUISourceCode = this._networkUISourceCodeForEncodedPath.get(relativePath.join('/'));
    if (networkUISourceCode)
      this._bind(networkUISourceCode, uiSourceCode);
  }

  _updateInterceptionPatterns() {
    this._updateInterceptionThrottler.schedule(innerUpdateInterceptionPatterns.bind(this));

    /**
     * @this {Persistence.NetworkPersistenceManager}
     * @return {!Promise}
     */
    function innerUpdateInterceptionPatterns() {
      if (!this._activeProject)
        return SDK.multitargetNetworkManager.setInterceptionHandlerForPatterns([], this._interceptionHandlerBound);
      var patterns = new Set();
      var indexFileName = 'index.html';
      for (var uiSourceCode of this._activeProject.uiSourceCodes()) {
        var pattern = this._patternForFileSystemUISourceCode(uiSourceCode);
        patterns.add(pattern);
        if (pattern.endsWith('/' + indexFileName))
          patterns.add(pattern.substr(0, pattern.length - indexFileName.length));
      }

      return SDK.multitargetNetworkManager.setInterceptionHandlerForPatterns(
          Array.from(patterns), this._interceptionHandlerBound);
    }
  }

  /**
   * @param {!Persistence.IsolatedFileSystem} fileSystem
   */
  _onFileSystemRemoved(fileSystem) {
    var domain = this._domainForFileSystemMap.get(fileSystem.path());
    if (!domain)
      return;
    this._domainForFileSystemMap.delete(fileSystem.path());
    this._fileSystemForDomain.delete(domain);
    this._domainForFileSystemPathSetting.set(Array.from(this._domainForFileSystemMap.entries()));
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _onUISourceCodeRemoved(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace.projectTypes.Network) {
      this._unbind(uiSourceCode);
      this._networkUISourceCodeForEncodedPath.delete(this._encodedPathFromUrl(uiSourceCode.url()));
      return;
    }
    this._updateInterceptionPatterns();
    this._unbind(uiSourceCode);
  }

  /**
   * @param {!Workspace.Project} project
   */
  _onProjectAdded(project) {
    if (project.type() !== Workspace.projectTypes.FileSystem ||
        Persistence.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides')
      return;
    var fileSystemPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(project.id());
    var domain = this._domainForFileSystemMap.get(fileSystemPath);
    if (!domain)
      return;
    this._updateActiveProject();
  }

  /**
   * @param {!Workspace.Project} project
   */
  _onProjectRemoved(project) {
    if (project !== this._activeProject)
      return;
    for (var uiSourceCode of project.uiSourceCodes())
      this._onUISourceCodeRemoved(uiSourceCode);
    this._updateActiveProject();
  }

  /**
   * @param {!SDK.MultitargetNetworkManager.InterceptedRequest} interceptedRequest
   * @return {!Promise}
   */
  async _interceptionHandler(interceptedRequest) {
    var method = interceptedRequest.request.method;
    if (!this._activeProject || (method !== 'GET' && method !== 'POST'))
      return;
    var path = this._activeProject.fileSystemPath() + '/' + this._encodedPathFromUrl(interceptedRequest.request.url);
    var fileSystemUISourceCode = this._activeProject.uiSourceCodeForURL(path);
    if (!fileSystemUISourceCode)
      return;

    var expectedResourceType = Common.resourceTypes[interceptedRequest.resourceType] || Common.resourceTypes.Other;
    var mimeType = fileSystemUISourceCode.mimeType();
    if (Common.ResourceType.fromMimeType(mimeType) !== expectedResourceType)
      mimeType = expectedResourceType.canonicalMimeType();
    var project = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (fileSystemUISourceCode.project());
    var blob = await project.requestFileBlob(fileSystemUISourceCode);
    interceptedRequest.continueRequestWithContent(new Blob([blob], {type: mimeType}));
  }
};

Persistence.NetworkPersistenceManager._reservedFileNames = new Set([
  'con',  'prn',  'aux',  'nul',  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7',
  'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
]);

Persistence.NetworkPersistenceManager.Events = {
  ProjectDomainChanged: Symbol('ProjectDomainChanged')
};

/** @type {!Persistence.NetworkPersistenceManager} */
Persistence.networkPersistenceManager;
