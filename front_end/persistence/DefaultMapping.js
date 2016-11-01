// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.DefaultMapping = class {
  /**
   * @param {!WebInspector.Workspace} workspace
   * @param {!WebInspector.FileSystemMapping} fileSystemMapping
   * @param {function(!WebInspector.PersistenceBinding)} onBindingCreated
   * @param {function(!WebInspector.PersistenceBinding)} onBindingRemoved
   */
  constructor(workspace, fileSystemMapping, onBindingCreated, onBindingRemoved) {
    this._workspace = workspace;
    this._fileSystemMapping = fileSystemMapping;
    /** @type {!Set<!WebInspector.PersistenceBinding>} */
    this._bindings = new Set();
    this._onBindingCreated = onBindingCreated;
    this._onBindingRemoved = onBindingRemoved;

    this._eventListeners = [
      workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this),
      workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._onUISourceCodeRemoved, this),
      workspace.addEventListener(WebInspector.Workspace.Events.ProjectRemoved, this._onProjectRemoved, this),
      this._fileSystemMapping.addEventListener(
          WebInspector.FileSystemMapping.Events.FileMappingAdded, this._remap, this),
      this._fileSystemMapping.addEventListener(
          WebInspector.FileSystemMapping.Events.FileMappingRemoved, this._remap, this)
    ];
    this._remap();
  }

  _remap() {
    for (var binding of this._bindings.valuesArray())
      this._unbind(binding.network);
    var networkProjects = this._workspace.projectsForType(WebInspector.projectTypes.Network);
    for (var networkProject of networkProjects) {
      for (var uiSourceCode of networkProject.uiSourceCodes())
        this._bind(uiSourceCode);
    }
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onUISourceCodeAdded(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
    this._bind(uiSourceCode);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onUISourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
    this._unbind(uiSourceCode);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onProjectRemoved(event) {
    var project = /** @type {!WebInspector.Project} */ (event.data);
    for (var uiSourceCode of project.uiSourceCodes())
      this._unbind(uiSourceCode);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {?WebInspector.PersistenceBinding}
   */
  _createBinding(uiSourceCode) {
    if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem) {
      var fileSystemPath = WebInspector.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());
      var networkURL = this._fileSystemMapping.networkURLForFileSystemURL(fileSystemPath, uiSourceCode.url());
      var networkSourceCode = networkURL ? this._workspace.uiSourceCodeForURL(networkURL) : null;
      return networkSourceCode ? new WebInspector.PersistenceBinding(networkSourceCode, uiSourceCode, false) : null;
    }
    if (uiSourceCode.project().type() === WebInspector.projectTypes.Network) {
      var file = this._fileSystemMapping.fileForURL(uiSourceCode.url());
      var projectId = file ? WebInspector.FileSystemWorkspaceBinding.projectId(file.fileSystemPath) : null;
      var fileSourceCode = file && projectId ? this._workspace.uiSourceCode(projectId, file.fileURL) : null;
      return fileSourceCode ? new WebInspector.PersistenceBinding(uiSourceCode, fileSourceCode, false) : null;
    }
    return null;
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _bind(uiSourceCode) {
    console.assert(!uiSourceCode[WebInspector.DefaultMapping._binding], 'Cannot bind already bound UISourceCode!');
    var binding = this._createBinding(uiSourceCode);
    if (!binding)
      return;
    this._bindings.add(binding);
    binding.network[WebInspector.DefaultMapping._binding] = binding;
    binding.fileSystem[WebInspector.DefaultMapping._binding] = binding;

    binding.fileSystem.addEventListener(
        WebInspector.UISourceCode.Events.TitleChanged, this._onFileSystemUISourceCodeRenamed, this);

    this._onBindingCreated.call(null, binding);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _unbind(uiSourceCode) {
    var binding = uiSourceCode[WebInspector.DefaultMapping._binding];
    if (!binding)
      return;
    this._bindings.delete(binding);
    binding.network[WebInspector.DefaultMapping._binding] = null;
    binding.fileSystem[WebInspector.DefaultMapping._binding] = null;

    binding.fileSystem.removeEventListener(
        WebInspector.UISourceCode.Events.TitleChanged, this._onFileSystemUISourceCodeRenamed, this);

    this._onBindingRemoved.call(null, binding);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onFileSystemUISourceCodeRenamed(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.target);
    var binding = uiSourceCode[WebInspector.DefaultMapping._binding];
    this._unbind(binding.network);
    this._bind(binding.network);
  }

  dispose() {
    WebInspector.EventTarget.removeEventListeners(this._eventListeners);
  }
};

WebInspector.DefaultMapping._binding = Symbol('DefaultMapping.Binding');
