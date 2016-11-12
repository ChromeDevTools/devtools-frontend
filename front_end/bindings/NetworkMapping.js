// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Bindings.NetworkMapping = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   * @param {!Bindings.FileSystemWorkspaceBinding} fileSystemWorkspaceBinding
   * @param {!Workspace.FileSystemMapping} fileSystemMapping
   */
  constructor(targetManager, workspace, fileSystemWorkspaceBinding, fileSystemMapping) {
    this._targetManager = targetManager;
    this._workspace = workspace;
    this._fileSystemWorkspaceBinding = fileSystemWorkspaceBinding;
    this._fileSystemMapping = fileSystemMapping;
    InspectorFrontendHost.events.addEventListener(
        InspectorFrontendHostAPI.Events.RevealSourceLine, this._revealSourceLine, this);

    var fileSystemManager = fileSystemWorkspaceBinding.fileSystemManager();
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
    this._addingFileSystem = true;
    this._fileSystemMapping.addFileSystem(fileSystem.path());

    var mappings = fileSystem.projectProperty('mappings');
    for (var i = 0; Array.isArray(mappings) && i < mappings.length; ++i) {
      var mapping = mappings[i];
      if (!mapping || typeof mapping !== 'object')
        continue;
      var folder = mapping['folder'];
      var url = mapping['url'];
      if (typeof folder !== 'string' || typeof url !== 'string')
        continue;
      this._fileSystemMapping.addNonConfigurableFileMapping(fileSystem.path(), url, folder);
    }
    this._addingFileSystem = false;
  }

  /**
   * @param {!Common.Event} event
   */
  _fileSystemRemoved(event) {
    var fileSystem = /** @type {!Workspace.IsolatedFileSystem} */ (event.data);
    this._fileSystemMapping.removeFileSystem(fileSystem.path());
  }

  /**
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} url
   * @return {?Workspace.UISourceCode}
   */
  _networkUISourceCodeForURL(target, frame, url) {
    return this._workspace.uiSourceCode(Bindings.NetworkProject.projectId(target, frame, false), url);
  }

  /**
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} url
   * @return {?Workspace.UISourceCode}
   */
  _contentScriptUISourceCodeForURL(target, frame, url) {
    return this._workspace.uiSourceCode(Bindings.NetworkProject.projectId(target, frame, true), url);
  }

  /**
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} url
   * @return {?Workspace.UISourceCode}
   */
  _uiSourceCodeForURL(target, frame, url) {
    return this._networkUISourceCodeForURL(target, frame, url) ||
        this._contentScriptUISourceCodeForURL(target, frame, url);
  }

  /**
   * @param {string} url
   * @param {!SDK.Script} script
   * @return {?Workspace.UISourceCode}
   */
  uiSourceCodeForScriptURL(url, script) {
    var frame = SDK.ResourceTreeFrame.fromScript(script);
    return this._uiSourceCodeForURL(script.target(), frame, url);
  }

  /**
   * @param {string} url
   * @param {!SDK.CSSStyleSheetHeader} header
   * @return {?Workspace.UISourceCode}
   */
  uiSourceCodeForStyleURL(url, header) {
    var frame = SDK.ResourceTreeFrame.fromStyleSheet(header);
    return this._uiSourceCodeForURL(header.target(), frame, url);
  }

  /**
   * @param {string} url
   * @return {?Workspace.UISourceCode}
   */
  uiSourceCodeForURLForAnyTarget(url) {
    return Workspace.workspace.uiSourceCodeForURL(url);
  }

  /**
   * @param {!Workspace.UISourceCode} networkUISourceCode
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  addMapping(networkUISourceCode, uiSourceCode) {
    var fileSystemPath = Bindings.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());
    this._fileSystemMapping.addMappingForResource(networkUISourceCode.url(), fileSystemPath, uiSourceCode.url());
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  removeMapping(uiSourceCode) {
    this._fileSystemMapping.removeMappingForURL(uiSourceCode.url());
  }

  /**
   * @param {!Common.Event} event
   */
  _revealSourceLine(event) {
    var url = /** @type {string} */ (event.data['url']);
    var lineNumber = /** @type {number} */ (event.data['lineNumber']);
    var columnNumber = /** @type {number} */ (event.data['columnNumber']);

    var uiSourceCode = this.uiSourceCodeForURLForAnyTarget(url);
    if (uiSourceCode) {
      Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
      return;
    }

    /**
     * @param {!Common.Event} event
     * @this {Bindings.NetworkMapping}
     */
    function listener(event) {
      var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
      if (uiSourceCode.url() === url) {
        Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
        this._workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener, this);
      }
    }

    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener, this);
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }
};

/**
 * @type {!Bindings.NetworkMapping}
 */
Bindings.networkMapping;
