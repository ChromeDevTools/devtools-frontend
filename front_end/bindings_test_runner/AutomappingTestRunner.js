// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

BindingsTestRunner.addFiles = function(testFileSystem, files) {
  for (var filePath in files) {
    var file = files[filePath];
    testFileSystem.addFile(filePath, file.content, (file.time ? file.time.getTime() : 0));
  }
};

var timeOverrides;
var originalRequestMetadata;

BindingsTestRunner.overrideNetworkModificationTime = function(urlToTime) {
  if (!timeOverrides) {
    timeOverrides = new Map();
    originalRequestMetadata =
        TestRunner.override(Bindings.ContentProviderBasedProject.prototype, 'requestMetadata', overrideTime, true);
  }

  for (var url in urlToTime)
    timeOverrides.set(url, urlToTime[url]);

  function overrideTime(uiSourceCode) {
    if (!timeOverrides.has(uiSourceCode.url()))
      return originalRequestMetadata.call(this, uiSourceCode);

    var override = timeOverrides.get(uiSourceCode.url());
    return originalRequestMetadata.call(this, uiSourceCode).then(onOriginalMetadata.bind(null, override));
  }

  function onOriginalMetadata(timeOverride, metadata) {
    if (!timeOverride && !metadata)
      return null;

    return new Workspace.UISourceCodeMetadata(timeOverride, (metadata ? metadata.contentSize : null));
  }
};

BindingsTestRunner.AutomappingTest = function(workspace) {
  this._workspace = workspace;
  this._networkProject = new Bindings.ContentProviderBasedProject(
      this._workspace, 'AUTOMAPPING', Workspace.projectTypes.Network, 'simple website');

  if (workspace !== Workspace.workspace)
    new Persistence.FileSystemWorkspaceBinding(Persistence.isolatedFileSystemManager, this._workspace);

  this._failedBindingsCount = 0;
  this._automapping =
      new Persistence.Automapping(this._workspace, this._onBindingAdded.bind(this), this._onBindingRemoved.bind(this));
  TestRunner.addSniffer(this._automapping, '_onBindingFailedForTest', this._onBindingFailed.bind(this), true);
  TestRunner.addSniffer(this._automapping, '_onSweepHappenedForTest', this._onSweepHappened.bind(this), true);
};

BindingsTestRunner.AutomappingTest.prototype = {
  removeResources: function(urls) {
    for (var url of urls)
      this._networkProject.removeFile(url);
  },

  addNetworkResources: function(assets) {
    for (var url in assets) {
      var asset = assets[url];
      var contentType = asset.contentType || Common.resourceTypes.Script;
      var contentProvider = new Common.StaticContentProvider(url, contentType, Promise.resolve(asset.content));
      var metadata =
          (typeof asset.content === 'string' || asset.time ?
               new Workspace.UISourceCodeMetadata(asset.time, asset.content.length) :
               null);
      var uiSourceCode = this._networkProject.createUISourceCode(url, contentType);
      this._networkProject.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata);
    }
  },

  waitUntilMappingIsStabilized: function() {
    var promise = new Promise(x => this._stabilizedCallback = x);
    this._checkStabilized();
    return promise;
  },

  _onSweepHappened: function() {
    this._failedBindingsCount = 0;
    this._checkStabilized();
  },

  _onBindingAdded: function(binding) {
    TestRunner.addResult('Binding created: ' + binding);
    this._checkStabilized();
  },

  _onBindingFailed: function() {
    ++this._failedBindingsCount;
    this._checkStabilized();
  },

  _onBindingRemoved: function(binding) {
    TestRunner.addResult('Binding removed: ' + binding);
    this._checkStabilized();
  },

  _checkStabilized: function() {
    if (!this._stabilizedCallback || this._automapping._sweepThrottler._process)
      return;

    var networkUISourceCodes = this._workspace.uiSourceCodesForProjectType(Workspace.projectTypes.Network);
    var stabilized = this._failedBindingsCount + this._automapping._bindings.size === networkUISourceCodes.length;

    if (stabilized) {
      TestRunner.addResult('Mapping has stabilized.');
      var callback = this._stabilizedCallback;
      delete this._stabilizedCallback;
      callback.call(null);
    }
  }
};
