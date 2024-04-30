// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export const addFiles = function(testFileSystem, files) {
  for (const filePath in files) {
    const file = files[filePath];
    testFileSystem.addFile(filePath, file.content, (file.time ? file.time.getTime() : 0));
  }
};

let timeOverrides;
let originalRequestMetadata;

export const overrideNetworkModificationTime = function(urlToTime) {
  if (!timeOverrides) {
    timeOverrides = new Map();
    originalRequestMetadata = TestRunner.override(
        Bindings.ContentProviderBasedProject.ContentProviderBasedProject.prototype, 'requestMetadata', overrideTime,
        true);
  }

  for (const url in urlToTime) {
    timeOverrides.set(url, urlToTime[url]);
  }

  function overrideTime(uiSourceCode) {
    if (!timeOverrides.has(uiSourceCode.url())) {
      return originalRequestMetadata.call(this, uiSourceCode);
    }

    const override = timeOverrides.get(uiSourceCode.url());
    return originalRequestMetadata.call(this, uiSourceCode).then(onOriginalMetadata.bind(null, override));
  }

  function onOriginalMetadata(timeOverride, metadata) {
    if (!timeOverride && !metadata) {
      return null;
    }

    return new Workspace.UISourceCode.UISourceCodeMetadata(timeOverride, (metadata ? metadata.contentSize : null));
  }
};

export const AutomappingTest = function(workspace) {
  this.workspace = workspace;
  this.networkProject = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
      this.workspace, 'AUTOMAPPING', Workspace.Workspace.projectTypes.Network, 'simple website');

  if (workspace !== Workspace.Workspace.WorkspaceImpl.instance()) {
    new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(), this.workspace);
  }

  this.failedBindingsCount = 0;
  this.automapping = new Persistence.Automapping.Automapping(
      this.workspace, this._onStatusAdded.bind(this), this._onStatusRemoved.bind(this));
  TestRunner.addSniffer(this.automapping, 'onBindingFailedForTest', this._onBindingFailed.bind(this), true);
  TestRunner.addSniffer(this.automapping, 'onSweepHappenedForTest', this._onSweepHappened.bind(this), true);
};

AutomappingTest.prototype = {
  removeResources: function(urls) {
    for (const url of urls) {
      this.networkProject.removeUISourceCode(url);
    }
  },

  addNetworkResources: function(assets) {
    for (const url in assets) {
      const asset = assets[url];
      const contentType = asset.contentType || Common.ResourceType.resourceTypes.Script;
      const contentProvider =
          TextUtils.StaticContentProvider.StaticContentProvider.fromString(url, contentType, asset.content);
      const metadata =
          (typeof asset.content === 'string' || asset.time ?
               new Workspace.UISourceCode.UISourceCodeMetadata(asset.time, asset.content.length) :
               null);
      const uiSourceCode = this.networkProject.createUISourceCode(url, contentType);
      this.networkProject.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata);
    }
  },

  waitUntilMappingIsStabilized: function() {
    const promise = new Promise(x => {
      this.stabilizedCallback = x;
    });
    this._checkStabilized();
    return promise;
  },

  _onSweepHappened: function() {
    this.failedBindingsCount = 0;
    this._checkStabilized();
  },

  _onStatusRemoved: function(status) {
    TestRunner.addResult('Binding removed: ' + status);
    this._checkStabilized();
  },

  _onStatusAdded: function(status) {
    TestRunner.addResult('Binding created: ' + status);
    this._checkStabilized();
  },

  _onBindingFailed: function() {
    ++this.failedBindingsCount;
    this._checkStabilized();
  },

  _checkStabilized: function() {
    if (!this.stabilizedCallback || this.automapping.sweepThrottler.process) {
      return;
    }

    const networkUISourceCodes = this.workspace.uiSourceCodesForProjectType(Workspace.Workspace.projectTypes.Network);
    const stabilized = this.failedBindingsCount + this.automapping.statuses.size === networkUISourceCodes.length;

    if (stabilized) {
      TestRunner.addResult('Mapping has stabilized.');
      const callback = this.stabilizedCallback;
      delete this.stabilizedCallback;
      callback.call(null);
    }
  }
};
