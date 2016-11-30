// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Persistence.Persistence = class extends Common.Object {
  /**
   * @param {!Workspace.Workspace} workspace
   * @param {!Bindings.BreakpointManager} breakpointManager
   * @param {!Workspace.FileSystemMapping} fileSystemMapping
   */
  constructor(workspace, breakpointManager, fileSystemMapping) {
    super();
    this._workspace = workspace;
    this._breakpointManager = breakpointManager;
    /** @type {!Map<string, number>} */
    this._filePathPrefixesToBindingCount = new Map();

    if (Runtime.experiments.isEnabled('persistence2')) {
      var linkDecorator = new Persistence.PersistenceUtils.LinkDecorator(this);
      Components.Linkifier.setLinkDecorator(linkDecorator);
      this._mapping =
          new Persistence.Automapping(workspace, this._onBindingCreated.bind(this), this._onBindingRemoved.bind(this));
    } else {
      this._mapping = new Persistence.DefaultMapping(
          workspace, fileSystemMapping, this._onBindingCreated.bind(this), this._onBindingRemoved.bind(this));
    }
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  _onBindingCreated(binding) {
    if (binding.network.isDirty()) {
      Common.console.log(
          Common.UIString('%s can not be persisted to file system due to unsaved changes.', binding.network.name()));
      return;
    }
    if (binding.fileSystem.isDirty())
      binding.network.setWorkingCopy(binding.fileSystem.workingCopy());

    binding.network[Persistence.Persistence._binding] = binding;
    binding.fileSystem[Persistence.Persistence._binding] = binding;

    binding.fileSystem.forceLoadOnCheckContent();

    binding.network.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);

    this._addFilePathBindingPrefixes(binding.fileSystem.url());

    this._moveBreakpoints(binding.fileSystem, binding.network);
    this.dispatchEventToListeners(Persistence.Persistence.Events.BindingCreated, binding);
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  _onBindingRemoved(binding) {
    if (binding.network.isDirty())
      binding.fileSystem.setWorkingCopy(binding.network.workingCopy());

    binding.network[Persistence.Persistence._binding] = null;
    binding.fileSystem[Persistence.Persistence._binding] = null;

    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);

    this._removeFilePathBindingPrefixes(binding.fileSystem.url());

    this._breakpointManager.copyBreakpoints(binding.network.url(), binding.fileSystem);
    this.dispatchEventToListeners(Persistence.Persistence.Events.BindingRemoved, binding);
  }

  /**
   * @param {!Common.Event} event
   */
  _onWorkingCopyCommitted(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.target);
    var binding = uiSourceCode[Persistence.Persistence._binding];
    if (!binding || binding[Persistence.Persistence._muteCommit])
      return;
    var newContent = /** @type {string} */ (event.data.content);
    var other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    var target = Bindings.NetworkProject.targetForUISourceCode(binding.network);
    if (target.isNodeJS()) {
      other.requestContent().then(
          currentContent => this._syncNodeJSContent(binding, other, currentContent, newContent));
      return;
    }
    binding[Persistence.Persistence._muteCommit] = true;
    other.addRevision(newContent);
    binding[Persistence.Persistence._muteCommit] = false;
    this._contentSyncedForTest();
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} currentContent
   * @param {string} newContent
   */
  _syncNodeJSContent(binding, uiSourceCode, currentContent, newContent) {
    if (uiSourceCode === binding.fileSystem) {
      if (newContent.startsWith(Persistence.Persistence._NodePrefix) &&
          newContent.endsWith(Persistence.Persistence._NodeSuffix)) {
        newContent = newContent.substring(
            Persistence.Persistence._NodePrefix.length, newContent.length - Persistence.Persistence._NodeSuffix.length);
      }
      if (currentContent.startsWith(Persistence.Persistence._NodeShebang))
        newContent = Persistence.Persistence._NodeShebang + newContent;
    } else {
      if (newContent.startsWith(Persistence.Persistence._NodeShebang))
        newContent = newContent.substring(Persistence.Persistence._NodeShebang.length);
      if (currentContent.startsWith(Persistence.Persistence._NodePrefix) &&
          currentContent.endsWith(Persistence.Persistence._NodeSuffix))
        newContent = Persistence.Persistence._NodePrefix + newContent + Persistence.Persistence._NodeSuffix;
    }
    binding[Persistence.Persistence._muteCommit] = true;
    uiSourceCode.addRevision(newContent);
    binding[Persistence.Persistence._muteCommit] = false;
    this._contentSyncedForTest();
  }

  _contentSyncedForTest() {
  }

  /**
   * @param {!Workspace.UISourceCode} from
   * @param {!Workspace.UISourceCode} to
   */
  _moveBreakpoints(from, to) {
    var breakpoints = this._breakpointManager.breakpointsForUISourceCode(from);
    for (var breakpoint of breakpoints) {
      breakpoint.remove();
      this._breakpointManager.setBreakpoint(
          to, breakpoint.lineNumber(), breakpoint.columnNumber(), breakpoint.condition(), breakpoint.enabled());
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  hasUnsavedCommittedChanges(uiSourceCode) {
    if (this._workspace.hasResourceContentTrackingExtensions())
      return false;
    if (uiSourceCode.url() && Workspace.fileManager.isURLSaved(uiSourceCode.url()))
      return false;
    if (uiSourceCode.project().canSetFileContent())
      return false;
    if (uiSourceCode[Persistence.Persistence._binding])
      return false;
    return !!uiSourceCode.history.length;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?Persistence.PersistenceBinding}
   */
  binding(uiSourceCode) {
    return uiSourceCode[Persistence.Persistence._binding] || null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?Workspace.UISourceCode}
   */
  fileSystem(uiSourceCode) {
    var binding = this.binding(uiSourceCode);
    return binding ? binding.fileSystem : null;
  }

  /**
   * @param {string} filePath
   */
  _addFilePathBindingPrefixes(filePath) {
    var relative = '';
    for (var token of filePath.split('/')) {
      relative += token + '/';
      var count = this._filePathPrefixesToBindingCount.get(relative) || 0;
      this._filePathPrefixesToBindingCount.set(relative, count + 1);
    }
  }

  /**
   * @param {string} filePath
   */
  _removeFilePathBindingPrefixes(filePath) {
    var relative = '';
    for (var token of filePath.split('/')) {
      relative += token + '/';
      var count = this._filePathPrefixesToBindingCount.get(relative);
      if (count === 1)
        this._filePathPrefixesToBindingCount.delete(relative);
      else
        this._filePathPrefixesToBindingCount.set(relative, count - 1);
    }
  }

  /**
   * @param {string} filePath
   * @return {boolean}
   */
  filePathHasBindings(filePath) {
    if (!filePath.endsWith('/'))
      filePath += '/';
    return this._filePathPrefixesToBindingCount.has(filePath);
  }

  dispose() {
    this._mapping.dispose();
  }
};

Persistence.Persistence._binding = Symbol('Persistence.Binding');
Persistence.Persistence._muteCommit = Symbol('Persistence.MuteCommit');

Persistence.Persistence._NodePrefix = '(function (exports, require, module, __filename, __dirname) { ';
Persistence.Persistence._NodeSuffix = '\n});';
Persistence.Persistence._NodeShebang = '#!/usr/bin/env node';

Persistence.Persistence.Events = {
  BindingCreated: Symbol('BindingCreated'),
  BindingRemoved: Symbol('BindingRemoved')
};

/**
 * @unrestricted
 */
Persistence.PersistenceBinding = class {
  /**
   * @param {!Workspace.UISourceCode} network
   * @param {!Workspace.UISourceCode} fileSystem
   * @param {boolean} exactMatch
   */
  constructor(network, fileSystem, exactMatch) {
    this.network = network;
    this.fileSystem = fileSystem;
    this.exactMatch = exactMatch;
  }
};

/** @type {!Persistence.Persistence} */
Persistence.persistence;
