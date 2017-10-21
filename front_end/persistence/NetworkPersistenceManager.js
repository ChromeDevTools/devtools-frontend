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
    this._boundInterceptingURLs = Symbol('BoundInterceptingURLs');

    this._enabledSetting = Common.settings.moduleSetting('persistenceNetworkOverridesEnabled');
    this._enabledSetting.addChangeListener(this._enabledChanged, this);

    this._workspace = workspace;
    this._domainForFileSystemPathSetting = Common.settings.createSetting('domainForFileSystemPath', []);
    /** @type {!Map<string, string>} */
    this._domainForFileSystemMap = new Map(this._domainForFileSystemPathSetting.get());
    /** @type {!Map<string, string>} */
    this._fileSystemForDomain = new Map(this._domainForFileSystemPathSetting.get().map(value => [value[1], value[0]]));

    /** @type {!Map<string, !Workspace.UISourceCode>} */
    this._fileSystemUISourceCodeForUrlMap = new Map();
    this._interceptionHandlerBound = this._interceptionHandler.bind(this);

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
    if (this.projectForDomain(domain))
      return;
    var fileSystemPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(project.id());
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
                /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode),
                /** @type {string} */ (event.data.content)),
            this)
      ];
      this._updateActiveProject();
    } else {
      Common.EventTarget.removeEventListeners(this._eventDescriptors);
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
   * @param {string} urlPath
   * @return {string}
   */
  _encodeUrlPathToLocalPath(urlPath) {
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
    return encodedParts.join('/');

    /**
     * @param {string} urlPath
     * @return {!Array<string>}
     */
    function fileNamePartsFromUrlPath(urlPath) {
      var hashIndex = urlPath.indexOf('#');
      if (hashIndex !== -1)
        urlPath = urlPath.substr(0, hashIndex);
      var queryIndex = urlPath.indexOf('?');
      if (queryIndex === -1)
        return urlPath.split(/[\/\\]/g);
      if (queryIndex === 0)
        return [urlPath];
      var endSection = urlPath.substr(queryIndex);
      var parts = urlPath.substr(0, urlPath.length - endSection.length).split(/[\/\\]/g);
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
   * @param {!Workspace.UISourceCode} fileSystemUISourceCode
   * @return {?Workspace.UISourceCode}
   */
  _networkUISourceCode(fileSystemUISourceCode) {
    if (fileSystemUISourceCode.project() !== this._activeProject)
      return null;
    var networkProjects = this._workspace.projectsForType(Workspace.projectTypes.Network);
    var urls = this._urlsForFileSystemUISourceCode(fileSystemUISourceCode);
    for (var networkProject of networkProjects) {
      for (var url of urls) {
        var networkUISourceCode = networkProject.uiSourceCodeForURL(url);
        if (!networkUISourceCode)
          continue;
        return networkUISourceCode;
      }
    }
    return null;
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
   * @param {string} content
   */
  _onUISourceCodeWorkingCopyCommitted(uiSourceCode, content) {
    if (!this._activeProject || uiSourceCode.project().type() !== Workspace.projectTypes.Network ||
        uiSourceCode[this._bindingSymbol])
      return;
    var urlDomain = uiSourceCode.url().replace(/^https?:\/\//, '');
    var fileName = urlDomain.substr(urlDomain.lastIndexOf('/') + 1);
    var relativeFolderPath = urlDomain.substr(0, urlDomain.length - fileName.length);
    if (!fileName)
      fileName = 'index.html';
    this._activeProject.createFile(relativeFolderPath, this._encodeUrlPathToLocalPath(fileName), content);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Array<string>}
   */
  _urlsForFileSystemUISourceCode(uiSourceCode) {
    var directoryPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());
    var domainPath = this._decodeLocalPathToUrlPath(uiSourceCode.url().substr(directoryPath.length + 1));
    var entries = ['http://' + domainPath, 'https://' + domainPath];
    var indexFileName = 'index.html';
    if (domainPath.endsWith(indexFileName)) {
      domainPath = domainPath.substr(0, domainPath.length - indexFileName.length);
      entries.push('http://' + domainPath, 'https://' + domainPath);
    }
    return entries;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _onUISourceCodeAdded(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace.projectTypes.Network) {
      if (uiSourceCode[this._bindingSymbol])
        return;
      var fileSystemUISourceCode = this._fileSystemUISourceCodeForUrlMap.get(uiSourceCode.url());
      if (!fileSystemUISourceCode)
        return;
      this._bind(uiSourceCode, fileSystemUISourceCode);
      return;
    }
    if (uiSourceCode.project() !== this._activeProject)
      return;

    var urls = this._urlsForFileSystemUISourceCode(uiSourceCode);
    uiSourceCode[this._boundInterceptingURLs] = [];
    for (var url of urls) {
      uiSourceCode[this._boundInterceptingURLs].push(url);
      this._fileSystemUISourceCodeForUrlMap.set(url, uiSourceCode);
    }
    SDK.multitargetNetworkManager.setInterceptionHandlerForPatterns(
        Array.from(this._fileSystemUISourceCodeForUrlMap.keys()), this._interceptionHandlerBound);

    var networkUISourceCode = this._networkUISourceCode(uiSourceCode);
    if (networkUISourceCode)
      this._bind(networkUISourceCode, uiSourceCode);
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
      return;
    }

    var boundURLs = uiSourceCode[this._boundInterceptingURLs];
    if (boundURLs) {
      for (var url of boundURLs)
        this._fileSystemUISourceCodeForUrlMap.delete(url);
      delete uiSourceCode[this._boundInterceptingURLs];
      SDK.multitargetNetworkManager.setInterceptionHandlerForPatterns(
          Array.from(this._fileSystemUISourceCodeForUrlMap.keys()), this._interceptionHandlerBound);
    }
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
    var fileSystemUISourceCode = this._fileSystemUISourceCodeForUrlMap.get(interceptedRequest.request.url);
    if (!fileSystemUISourceCode)
      return;
    if (interceptedRequest.request.method !== 'GET' && interceptedRequest.request.method !== 'POST')
      return;
    var project = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (fileSystemUISourceCode.project());
    var resourceType = Common.resourceTypes[interceptedRequest.resourceType] || Common.resourceTypes.Other;
    var isImage = resourceType === Common.resourceTypes.Image;
    var mimeType = isImage ? 'image/png' : (resourceType.canonicalMimeType() || fileSystemUISourceCode.mimeType());
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
