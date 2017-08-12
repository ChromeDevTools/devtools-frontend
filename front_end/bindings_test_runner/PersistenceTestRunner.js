// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

Runtime.experiments.enableForTest('persistenceValidation');

Persistence.PersistenceBinding.prototype.toString = function() {
  var lines = [
    '{', '       network: ' + this.network.url(), '    fileSystem: ' + this.fileSystem.url(),
    '    exactMatch: ' + this.exactMatch, '}'
  ];

  return lines.join('\n');
};

BindingsTestRunner.waitForBinding = function(fileName) {
  var uiSourceCodes = Workspace.workspace.uiSourceCodes();

  for (var uiSourceCode of uiSourceCodes) {
    var binding = Persistence.persistence.binding(uiSourceCode);

    if (!binding)
      continue;

    if (uiSourceCode.name() === fileName)
      return Promise.resolve(binding);
  }

  return TestRunner.waitForEvent(
      Persistence.Persistence.Events.BindingCreated, Persistence.persistence,
      binding => binding.network.name() === fileName || binding.fileSystem.name() === fileName);
};

BindingsTestRunner.addFooJSFile = function(fs) {
  return fs.root.mkdir('inspector')
      .mkdir('persistence')
      .mkdir('resources')
      .addFile('foo.js', '\n\nwindow.foo = ()=>\'foo\';');
};

BindingsTestRunner.forceUseDefaultMapping = function() {
  Persistence.persistence._setMappingForTest((bindingCreated, bindingRemoved) => {
    return new Persistence.DefaultMapping(
        Workspace.workspace, Persistence.fileSystemMapping, bindingCreated, bindingRemoved);
  });
};

BindingsTestRunner.initializeTestMapping = function() {
  var testMapping;

  Persistence.persistence._setMappingForTest((bindingCreated, bindingRemoved) => {
    testMapping = new TestMapping(bindingCreated, bindingRemoved);
    return testMapping;
  });

  return testMapping;
};

class TestMapping {
  constructor(onBindingAdded, onBindingRemoved) {
    this._onBindingAdded = onBindingAdded;
    this._onBindingRemoved = onBindingRemoved;
    this._bindings = new Set();
  }

  async addBinding(urlSuffix) {
    if (this._findBinding(urlSuffix)) {
      TestRunner.addResult(`FAILED TO ADD BINDING: binding already exists for ${urlSuffix}`);
      TestRunner.completeTest();
      return;
    }

    var networkUISourceCode = await TestRunner.waitForUISourceCode(urlSuffix, Workspace.projectTypes.Network);
    var fileSystemUISourceCode = await TestRunner.waitForUISourceCode(urlSuffix, Workspace.projectTypes.FileSystem);
    var binding = new Persistence.PersistenceBinding(networkUISourceCode, fileSystemUISourceCode, false);
    this._bindings.add(binding);
    this._onBindingAdded.call(null, binding);
  }

  _findBinding(urlSuffix) {
    for (var binding of this._bindings) {
      if (binding.network.url().endsWith(urlSuffix))
        return binding;
    }

    return null;
  }

  async removeBinding(urlSuffix) {
    var binding = this._findBinding(urlSuffix);

    if (!binding) {
      TestRunner.addResult(`FAILED TO REMOVE BINDING: binding does not exist for ${urlSuffix}`);
      TestRunner.completeTest();
      return;
    }

    this._bindings.delete(binding);
    this._onBindingRemoved.call(null, binding);
  }

  dispose() {
    for (var binding of this._bindings)
      this._onBindingRemoved.call(null, binding);

    this._bindings.clear();
  }
}
