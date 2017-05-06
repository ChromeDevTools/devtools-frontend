// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Persistence.MappingSystem}
 * @unrestricted
 */
Persistence.DefaultMapping = class {
  /**
   * @param {!Workspace.Workspace} workspace
   * @param {!Persistence.FileSystemMapping} fileSystemMapping
   * @param {function(!Persistence.PersistenceBinding)} onBindingCreated
   * @param {function(!Persistence.PersistenceBinding)} onBindingRemoved
   */
  constructor(workspace, fileSystemMapping, onBindingCreated, onBindingRemoved) {
    this._workspace = workspace;
    this._fileSystemMapping = fileSystemMapping;
    /** @type {!Set<!Persistence.PersistenceBinding>} */
    this._bindings = new Set();
    this._onBindingCreated = onBindingCreated;
    this._onBindingRemoved = onBindingRemoved;

    this._eventListeners = [
      workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this),
      workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._onUISourceCodeRemoved, this),
      workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._onProjectRemoved, this),
      this._fileSystemMapping.addEventListener(
          Persistence.FileSystemMapping.Events.FileMappingAdded, this._remap, this),
      this._fileSystemMapping.addEventListener(
          Persistence.FileSystemMapping.Events.FileMappingRemoved, this._remap, this)
    ];
    this._remap();
  }

  _remap() {
    for (var binding of this._bindings.valuesArray())
      this._unbind(binding.network);
    var networkProjects = this._workspace.projectsForType(Workspace.projectTypes.Network);
    for (var networkProject of networkProjects) {
      for (var uiSourceCode of networkProject.uiSourceCodes())
        this._bind(uiSourceCode);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onUISourceCodeAdded(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._bind(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _onUISourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._unbind(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _onProjectRemoved(event) {
    var project = /** @type {!Workspace.Project} */ (event.data);
    for (var uiSourceCode of project.uiSourceCodes())
      this._unbind(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?Persistence.PersistenceBinding}
   */
  _createBinding(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace.projectTypes.FileSystem) {
      var fileSystemPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());
      var networkURL = this._fileSystemMapping.networkURLForFileSystemURL(fileSystemPath, uiSourceCode.url());
      var networkSourceCode = networkURL ? this._workspace.uiSourceCodeForURL(networkURL) : null;
      return networkSourceCode ? new Persistence.PersistenceBinding(networkSourceCode, uiSourceCode, false) : null;
    }
    if (uiSourceCode.project().type() === Workspace.projectTypes.Network) {
      var file = this._fileSystemMapping.fileForURL(uiSourceCode.url());
      var projectId = file ? Persistence.FileSystemWorkspaceBinding.projectId(file.fileSystemPath) : null;
      var fileSourceCode = file && projectId ? this._workspace.uiSourceCode(projectId, file.fileURL) : null;
      return fileSourceCode ? new Persistence.PersistenceBinding(uiSourceCode, fileSourceCode, false) : null;
    }
    return null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _bind(uiSourceCode) {
    console.assert(!uiSourceCode[Persistence.DefaultMapping._binding], 'Cannot bind already bound UISourceCode!');
    var binding = this._createBinding(uiSourceCode);
    if (!binding)
      return;
    // TODO(lushnikov): remove this check once there's a single uiSourceCode per url. @see crbug.com/670180
    if (binding.network[Persistence.DefaultMapping._binding] || binding.fileSystem[Persistence.DefaultMapping._binding])
      return;

    this._bindings.add(binding);
    binding.network[Persistence.DefaultMapping._binding] = binding;
    binding.fileSystem[Persistence.DefaultMapping._binding] = binding;

    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.TitleChanged, this._onFileSystemUISourceCodeRenamed, this);

    this._onBindingCreated.call(null, binding);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _unbind(uiSourceCode) {
    var binding = uiSourceCode[Persistence.DefaultMapping._binding];
    if (!binding)
      return;
    this._bindings.delete(binding);
    binding.network[Persistence.DefaultMapping._binding] = null;
    binding.fileSystem[Persistence.DefaultMapping._binding] = null;

    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.TitleChanged, this._onFileSystemUISourceCodeRenamed, this);

    this._onBindingRemoved.call(null, binding);
  }

  /**
   * @param {!Common.Event} event
   */
  _onFileSystemUISourceCodeRenamed(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    var binding = uiSourceCode[Persistence.DefaultMapping._binding];
    this._unbind(binding.network);
    this._bind(binding.network);
  }

  /**
   * @override
   */
  dispose() {
    for (var binding of this._bindings.valuesArray())
      this._unbind(binding.network);
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }
};

Persistence.DefaultMapping._binding = Symbol('DefaultMapping.Binding');
