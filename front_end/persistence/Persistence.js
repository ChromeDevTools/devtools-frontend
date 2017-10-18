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
   * @param {!Persistence.FileSystemMapping} fileSystemMapping
   */
  constructor(workspace, breakpointManager, fileSystemMapping) {
    super();
    this._workspace = workspace;
    this._breakpointManager = breakpointManager;
    /** @type {!Map<string, number>} */
    this._filePathPrefixesToBindingCount = new Map();

    /** @type {!Multimap<!Workspace.UISourceCode, function()>} */
    this._subscribedBindingEventListeners = new Multimap();

    if (Runtime.experiments.isEnabled('persistence2')) {
      var linkDecorator = new Persistence.PersistenceUtils.LinkDecorator(this);
      Components.Linkifier.setLinkDecorator(linkDecorator);
      this._mapping =
          new Persistence.Automapping(workspace, this._validateBinding.bind(this), this._onBindingRemoved.bind(this));
    } else {
      this._mapping = new Persistence.DefaultMapping(
          workspace, fileSystemMapping, this._validateBinding.bind(this), this._onBindingRemoved.bind(this));
    }
  }

  /**
   * @param {!Workspace.Project} project
   */
  ignoreProject(project) {
    this._mapping.ignoreProject(project);
  }

  /**
   * @param {!Workspace.Project} project
   */
  removeIgnoredProject(project) {
    this._mapping.removeIgnoredProject(project);
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  addBinding(binding) {
    this._establishBinding(binding);
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  removeBinding(binding) {
    this._innerRemoveBinding(binding);
  }

  /**
   * @param {function(function(!Persistence.PersistenceBinding), function(!Persistence.PersistenceBinding)):!Persistence.MappingSystem} mappingFactory
   */
  _setMappingForTest(mappingFactory) {
    this._mapping.dispose();
    this._mapping = mappingFactory(this._validateBinding.bind(this), this._onBindingRemoved.bind(this));
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  _validateBinding(binding) {
    if (!Runtime.experiments.isEnabled('persistence2') || binding.network.contentType().isFromSourceMap() ||
        !binding.fileSystem.contentType().isTextType()) {
      this._establishBinding(binding);
      return;
    }

    Promise.all([binding.network.requestContent(), binding.fileSystem.requestContent()]).then(onContents.bind(this));

    /**
     * @this {Persistence.Persistence}
     */
    function onContents() {
      if (binding._removed)
        return;

      var fileSystemContent = binding.fileSystem.workingCopy();
      var networkContent = binding.network.workingCopy();
      var target = Bindings.NetworkProject.targetForUISourceCode(binding.network);
      var isValid = false;
      if (target.isNodeJS()) {
        var rewrappedNetworkContent = Persistence.Persistence._rewrapNodeJSContent(
            binding, binding.fileSystem, fileSystemContent, networkContent);
        isValid = (fileSystemContent === rewrappedNetworkContent);
      } else {
        // Trim trailing whitespaces because V8 adds trailing newline.
        isValid = (fileSystemContent.trimRight() === networkContent.trimRight());
      }

      if (isValid)
        this._establishBinding(binding);
      else
        this._prevalidationFailedForTest(binding);
    }
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  _prevalidationFailedForTest(binding) {
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  _establishBinding(binding) {
    binding.network[Persistence.Persistence._binding] = binding;
    binding.fileSystem[Persistence.Persistence._binding] = binding;

    binding.fileSystem.forceLoadOnCheckContent();

    binding.network.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.network.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);

    this._addFilePathBindingPrefixes(binding.fileSystem.url());

    this._moveBreakpoints(binding.fileSystem, binding.network);

    this._notifyBindingEvent(binding.network);
    this._notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Persistence.Persistence.Events.BindingCreated, binding);
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  _innerRemoveBinding(binding) {
    binding._removed = true;
    if (binding.network[Persistence.Persistence._binding] !== binding)
      return;
    console.assert(
        binding.network[Persistence.Persistence._binding] === binding.fileSystem[Persistence.Persistence._binding],
        'ERROR: inconsistent binding for networkURL ' + binding.network.url());

    binding.network[Persistence.Persistence._binding] = null;
    binding.fileSystem[Persistence.Persistence._binding] = null;

    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);

    this._removeFilePathBindingPrefixes(binding.fileSystem.url());
    this._breakpointManager.copyBreakpoints(binding.network.url(), binding.fileSystem);

    this._notifyBindingEvent(binding.network);
    this._notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Persistence.Persistence.Events.BindingRemoved, binding);
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   */
  _onBindingRemoved(binding) {
    this._innerRemoveBinding(binding);
  }

  /**
   * @param {!Common.Event} event
   */
  _onWorkingCopyChanged(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    var binding = uiSourceCode[Persistence.Persistence._binding];
    if (!binding || binding[Persistence.Persistence._muteWorkingCopy])
      return;
    var other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    if (!uiSourceCode.isDirty()) {
      binding[Persistence.Persistence._muteWorkingCopy] = true;
      other.resetWorkingCopy();
      binding[Persistence.Persistence._muteWorkingCopy] = false;
      this._contentSyncedForTest();
      return;
    }

    var target = Bindings.NetworkProject.targetForUISourceCode(binding.network);
    if (target.isNodeJS()) {
      var newContent = uiSourceCode.workingCopy();
      other.requestContent().then(() => {
        var nodeJSContent =
            Persistence.Persistence._rewrapNodeJSContent(binding, other, other.workingCopy(), newContent);
        setWorkingCopy.call(this, () => nodeJSContent);
      });
      return;
    }

    setWorkingCopy.call(this, () => uiSourceCode.workingCopy());

    /**
     * @param {function():string} workingCopyGetter
     * @this {Persistence.Persistence}
     */
    function setWorkingCopy(workingCopyGetter) {
      binding[Persistence.Persistence._muteWorkingCopy] = true;
      other.setWorkingCopyGetter(workingCopyGetter);
      binding[Persistence.Persistence._muteWorkingCopy] = false;
      this._contentSyncedForTest();
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onWorkingCopyCommitted(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode);
    var binding = uiSourceCode[Persistence.Persistence._binding];
    if (!binding || binding[Persistence.Persistence._muteCommit])
      return;
    var newContent = /** @type {string} */ (event.data.content);
    var other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    var target = Bindings.NetworkProject.targetForUISourceCode(binding.network);
    if (target.isNodeJS()) {
      other.requestContent().then(currentContent => {
        var nodeJSContent = Persistence.Persistence._rewrapNodeJSContent(binding, other, currentContent, newContent);
        setContent.call(this, nodeJSContent);
      });
      return;
    }
    setContent.call(this, newContent);

    /**
     * @param {string} newContent
     * @this {Persistence.Persistence}
     */
    function setContent(newContent) {
      binding[Persistence.Persistence._muteCommit] = true;
      other.addRevision(newContent);
      binding[Persistence.Persistence._muteCommit] = false;
      this._contentSyncedForTest();
    }
  }

  /**
   * @param {!Persistence.PersistenceBinding} binding
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} currentContent
   * @param {string} newContent
   * @return {string}
   */
  static _rewrapNodeJSContent(binding, uiSourceCode, currentContent, newContent) {
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
    return newContent;
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
   * @param {function()} listener
   */
  subscribeForBindingEvent(uiSourceCode, listener) {
    this._subscribedBindingEventListeners.set(uiSourceCode, listener);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {function()} listener
   */
  unsubscribeFromBindingEvent(uiSourceCode, listener) {
    this._subscribedBindingEventListeners.delete(uiSourceCode, listener);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _notifyBindingEvent(uiSourceCode) {
    if (!this._subscribedBindingEventListeners.has(uiSourceCode))
      return;
    var listeners = Array.from(this._subscribedBindingEventListeners.get(uiSourceCode));
    for (var listener of listeners)
      listener.call(null);
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
Persistence.Persistence._muteWorkingCopy = Symbol('Persistence.MuteWorkingCopy');

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
    this._removed = false;
  }
};

/**
 * @interface
 */
Persistence.MappingSystem = function() {};

Persistence.MappingSystem.prototype = {
  dispose: function() {},

  /**
   * @param {!Workspace.Project} project
   */
  ignoreProject(project) {},

  /**
   * @param {!Workspace.Project} project
   */
  removeIgnoredProject(project) {}
};

/** @type {!Persistence.Persistence} */
Persistence.persistence;
