// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/common/common.js';
import * as Root from '../../../../front_end/root/root.js';
import * as SDK from '../../../../front_end/sdk/sdk.js';

let targetManager: SDK.SDKModel.TargetManager;

function initializeTargetManagerIfNecessary() {
  // SDK.ResourceTree model has to exist to avoid a circular dependency, thus it
  // needs to be placed on the global if it is not already there.
  const globalObject = (globalThis as unknown as {SDK: {ResourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel}});
  globalObject.SDK = globalObject.SDK || {};
  globalObject.SDK.ResourceTreeModel = globalObject.SDK.ResourceTreeModel || SDK.ResourceTreeModel.ResourceTreeModel;

  // Create the target manager.
  targetManager = targetManager || SDK.SDKModel.TargetManager.instance({forceNew: true});
}

export function createTarget({id = 'test', name = 'test', type = SDK.SDKModel.Type.Node} = {}) {
  initializeTargetManagerIfNecessary();
  return targetManager.createTarget(id, name, type, null);
}

export function initializeGlobalVars({reset = true} = {}) {
  // Create the appropriate settings needed to boot.
  const settingValues = [
    {
      'category': 'Console',
      'settingName': 'customFormatters',
      'defaultValue': 'false',
    },
    {
      'category': 'Debugger',
      'settingName': 'pauseOnCaughtException',
      'defaultValue': 'false',
    },
    {
      'category': 'Debugger',
      'settingName': 'pauseOnExceptionEnabled',
      'defaultValue': 'false',
    },
    {
      'category': 'Debugger',
      'settingName': 'disableAsyncStackTraces',
      'defaultValue': 'false',
    },
    {
      'category': 'Debugger',
      'settingName': 'breakpointsActive',
      'defaultValue': 'true',
    },
    {
      'category': 'Sources',
      'settingName': 'jsSourceMapsEnabled',
      'defaultValue': 'true',
    },
  ];

  const extensions: Root.Runtime.RuntimeExtensionDescriptor[] = settingValues.map(setting => {
    return {...setting, type: 'setting', settingType: 'boolean'} as Root.Runtime.RuntimeExtensionDescriptor;
  });

  // Instantiate the runtime.
  Root.Runtime.Runtime.instance({
    forceNew: reset,
    moduleDescriptors: [{
      name: 'Test',
      extensions,
      dependencies: [],
      modules: [],
      scripts: [],
      resources: [],
      condition: '',
      experiment: '',
    }],
  });

  // Instantiate the storage.
  const storageVals = new Map<string, string>();
  const storage = new Common.Settings.SettingsStorage(
      {}, (key, value) => storageVals.set(key, value), key => storageVals.delete(key), () => storageVals.clear(),
      'test');
  Common.Settings.Settings.instance({forceNew: reset, globalStorage: storage, localStorage: storage});
}

export function deinitializeGlobalVars() {
  // Remove the global SDK.
  const globalObject = (globalThis as unknown as {SDK?: {}});
  delete globalObject.SDK;

  // Remove instances.
  SDK.SDKModel.TargetManager.removeInstance();
  Root.Runtime.Runtime.removeInstance();
  Common.Settings.Settings.removeInstance();
}

export function describeWithEnvironment(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  return describe(`env-${title}`, () => {
    beforeEach(() => initializeGlobalVars(opts));
    afterEach(deinitializeGlobalVars);
    describe(title, fn);
  });
}
