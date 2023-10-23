// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

Persistence.Persistence.PersistenceBinding.prototype.toString = function() {
  const lines = ['{', '       network: ' + this.network.url(), '    fileSystem: ' + this.fileSystem.url(), '}'];

  return lines.join('\n');
};

Persistence.Automapping.AutomappingStatus.prototype.toString = function() {
  const lines = [
    '{', '       network: ' + this.network.url(), '    fileSystem: ' + this.fileSystem.url(),
    '    exactMatch: ' + this.exactMatch, '}'
  ];

  return lines.join('\n');
};

export const waitForBinding = async function(fileName) {
  const uiSourceCodes = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes();

  for (const uiSourceCode of uiSourceCodes) {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);

    if (!binding) {
      continue;
    }

    if (uiSourceCode.name() === fileName) {
      return binding;
    }
  }

  return TestRunner.waitForEvent(
      Persistence.Persistence.Events.BindingCreated, Persistence.Persistence.PersistenceImpl.instance(),
      binding => binding.network.name() === fileName || binding.fileSystem.name() === fileName);
};

export const addFooJSFile = function(fs) {
  return fs.root.mkdir('devtools')
      .mkdir('persistence')
      .mkdir('resources')
      .addFile('foo.js', '\n\nwindow.foo = ()=>\'foo\';\n');
};

export const initializeTestMapping = function() {
  return new TestMapping(Persistence.Persistence.PersistenceImpl.instance());
};

class TestMapping {
  constructor(persistence) {
    this.persistence = persistence;
    persistence.addNetworkInterceptor(() => true);
    this.bindings = new Set();
  }

  async addBinding(urlSuffix) {
    if (this.findBinding(urlSuffix)) {
      TestRunner.addResult(`FAILED TO ADD BINDING: binding already exists for ${urlSuffix}`);
      TestRunner.completeTest();
      return;
    }

    const networkUISourceCode =
        await TestRunner.waitForUISourceCode(urlSuffix, Workspace.Workspace.projectTypes.Network);
    const fileSystemUISourceCode =
        await TestRunner.waitForUISourceCode(urlSuffix, Workspace.Workspace.projectTypes.FileSystem);
    const binding = new Persistence.Persistence.PersistenceBinding(networkUISourceCode, fileSystemUISourceCode);
    this.bindings.add(binding);
    await this.persistence.addBindingForTest(binding);
  }

  findBinding(urlSuffix) {
    for (const binding of this.bindings) {
      if (binding.network.url().endsWith(urlSuffix)) {
        return binding;
      }
    }

    return null;
  }

  async removeBinding(urlSuffix) {
    const binding = this.findBinding(urlSuffix);

    if (!binding) {
      TestRunner.addResult(`FAILED TO REMOVE BINDING: binding does not exist for ${urlSuffix}`);
      TestRunner.completeTest();
      return;
    }

    this.bindings.delete(binding);
    await this.persistence.removeBindingForTest(binding);
  }

  async dispose() {
    for (const binding of this.bindings) {
      await this.persistence.removeBindingForTest(binding);
    }

    this.bindings.clear();
  }
}
