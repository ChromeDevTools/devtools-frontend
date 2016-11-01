// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.Persistence = class extends WebInspector.Object {
  /**
   * @param {!WebInspector.Workspace} workspace
   * @param {!WebInspector.BreakpointManager} breakpointManager
   * @param {!WebInspector.FileSystemMapping} fileSystemMapping
   */
  constructor(workspace, breakpointManager, fileSystemMapping) {
    super();
    this._workspace = workspace;
    this._breakpointManager = breakpointManager;
    /** @type {!Map<string, number>} */
    this._filePathPrefixesToBindingCount = new Map();

    if (Runtime.experiments.isEnabled('persistence2'))
      this._mapping =
          new WebInspector.Automapping(workspace, this._onBindingCreated.bind(this), this._onBindingRemoved.bind(this));
    else
      this._mapping = new WebInspector.DefaultMapping(
          workspace, fileSystemMapping, this._onBindingCreated.bind(this), this._onBindingRemoved.bind(this));
  }

  /**
   * @param {!WebInspector.PersistenceBinding} binding
   */
  _onBindingCreated(binding) {
    if (binding.network.isDirty()) {
      WebInspector.console.log(WebInspector.UIString(
          '%s can not be persisted to file system due to unsaved changes.', binding.network.name()));
      return;
    }
    if (binding.fileSystem.isDirty())
      binding.network.setWorkingCopy(binding.fileSystem.workingCopy());

    binding.network[WebInspector.Persistence._binding] = binding;
    binding.fileSystem[WebInspector.Persistence._binding] = binding;

    binding.fileSystem.forceLoadOnCheckContent();

    binding.network.addEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.addEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);

    this._addFilePathBindingPrefixes(binding.fileSystem.url());

    this._moveBreakpoints(binding.fileSystem, binding.network);
    this.dispatchEventToListeners(WebInspector.Persistence.Events.BindingCreated, binding);
  }

  /**
   * @param {!WebInspector.PersistenceBinding} binding
   */
  _onBindingRemoved(binding) {
    if (binding.network.isDirty())
      binding.fileSystem.setWorkingCopy(binding.network.workingCopy());

    binding.network[WebInspector.Persistence._binding] = null;
    binding.fileSystem[WebInspector.Persistence._binding] = null;

    binding.network.removeEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.removeEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);

    this._removeFilePathBindingPrefixes(binding.fileSystem.url());

    this._copyBreakpoints(binding.network, binding.fileSystem);
    this.dispatchEventToListeners(WebInspector.Persistence.Events.BindingRemoved, binding);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onWorkingCopyCommitted(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.target);
    var binding = uiSourceCode[WebInspector.Persistence._binding];
    if (!binding || binding[WebInspector.Persistence._muteCommit])
      return;
    var newContent = /** @type {string} */ (event.data.content);
    var other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    var target = WebInspector.NetworkProject.targetForUISourceCode(binding.network);
    if (target.isNodeJS()) {
      other.requestContent().then(
          currentContent => this._syncNodeJSContent(binding, other, currentContent, newContent));
      return;
    }
    binding[WebInspector.Persistence._muteCommit] = true;
    other.addRevision(newContent);
    binding[WebInspector.Persistence._muteCommit] = false;
    this._contentSyncedForTest();
  }

  /**
   * @param {!WebInspector.PersistenceBinding} binding
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {string} currentContent
   * @param {string} newContent
   */
  _syncNodeJSContent(binding, uiSourceCode, currentContent, newContent) {
    if (uiSourceCode === binding.fileSystem) {
      if (newContent.startsWith(WebInspector.Persistence._NodePrefix) &&
          newContent.endsWith(WebInspector.Persistence._NodeSuffix))
        newContent = newContent.substring(
            WebInspector.Persistence._NodePrefix.length,
            newContent.length - WebInspector.Persistence._NodeSuffix.length);
      if (currentContent.startsWith(WebInspector.Persistence._NodeShebang))
        newContent = WebInspector.Persistence._NodeShebang + newContent;
    } else {
      if (newContent.startsWith(WebInspector.Persistence._NodeShebang))
        newContent = newContent.substring(WebInspector.Persistence._NodeShebang.length);
      if (currentContent.startsWith(WebInspector.Persistence._NodePrefix) &&
          currentContent.endsWith(WebInspector.Persistence._NodeSuffix))
        newContent = WebInspector.Persistence._NodePrefix + newContent + WebInspector.Persistence._NodeSuffix;
    }
    binding[WebInspector.Persistence._muteCommit] = true;
    uiSourceCode.addRevision(newContent);
    binding[WebInspector.Persistence._muteCommit] = false;
    this._contentSyncedForTest();
  }

  _contentSyncedForTest() {
  }

  /**
   * @param {!WebInspector.UISourceCode} from
   * @param {!WebInspector.UISourceCode} to
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
   * @param {!WebInspector.UISourceCode} from
   * @param {!WebInspector.UISourceCode} to
   */
  _copyBreakpoints(from, to) {
    var breakpoints = this._breakpointManager.breakpointsForUISourceCode(from);
    for (var breakpoint of breakpoints)
      this._breakpointManager.setBreakpoint(
          to, breakpoint.lineNumber(), breakpoint.columnNumber(), breakpoint.condition(), breakpoint.enabled());
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  hasUnsavedCommittedChanges(uiSourceCode) {
    if (this._workspace.hasResourceContentTrackingExtensions())
      return false;
    if (uiSourceCode.url() && WebInspector.fileManager.isURLSaved(uiSourceCode.url()))
      return false;
    if (uiSourceCode.project().canSetFileContent())
      return false;
    if (uiSourceCode[WebInspector.Persistence._binding])
      return false;
    return !!uiSourceCode.history.length;
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {?WebInspector.PersistenceBinding}
   */
  binding(uiSourceCode) {
    return uiSourceCode[WebInspector.Persistence._binding] || null;
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {?WebInspector.UISourceCode}
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

WebInspector.Persistence._binding = Symbol('Persistence.Binding');
WebInspector.Persistence._muteCommit = Symbol('Persistence.MuteCommit');

WebInspector.Persistence._NodePrefix = '(function (exports, require, module, __filename, __dirname) { ';
WebInspector.Persistence._NodeSuffix = '\n});';
WebInspector.Persistence._NodeShebang = '#!/usr/bin/env node\n';

WebInspector.Persistence.Events = {
  BindingCreated: Symbol('BindingCreated'),
  BindingRemoved: Symbol('BindingRemoved')
};

/**
 * @unrestricted
 */
WebInspector.PersistenceBinding = class {
  /**
   * @param {!WebInspector.UISourceCode} network
   * @param {!WebInspector.UISourceCode} fileSystem
   * @param {boolean} exactMatch
   */
  constructor(network, fileSystem, exactMatch) {
    this.network = network;
    this.fileSystem = fileSystem;
    this.exactMatch = exactMatch;
  }
};

/** @type {!WebInspector.Persistence} */
WebInspector.persistence;
