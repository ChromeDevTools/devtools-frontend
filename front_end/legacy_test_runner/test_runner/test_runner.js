// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck This file is not checked by TypeScript as it has a lot of legacy code.
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';

import * as TestRunner from './TestRunner.js';

/**
 * @param {!SDK.Target.Target} target
 */
function _setupTestHelpers(target) {
  self.TestRunner.BrowserAgent = target.browserAgent();
  self.TestRunner.CSSAgent = target.cssAgent();
  self.TestRunner.DeviceOrientationAgent = target.deviceOrientationAgent();
  self.TestRunner.DOMAgent = target.domAgent();
  self.TestRunner.DOMDebuggerAgent = target.domdebuggerAgent();
  self.TestRunner.DebuggerAgent = target.debuggerAgent();
  self.TestRunner.EmulationAgent = target.emulationAgent();
  self.TestRunner.HeapProfilerAgent = target.heapProfilerAgent();
  self.TestRunner.InputAgent = target.inputAgent();
  self.TestRunner.InspectorAgent = target.inspectorAgent();
  self.TestRunner.NetworkAgent = target.networkAgent();
  self.TestRunner.OverlayAgent = target.overlayAgent();
  self.TestRunner.PageAgent = target.pageAgent();
  self.TestRunner.ProfilerAgent = target.profilerAgent();
  self.TestRunner.RuntimeAgent = target.runtimeAgent();
  self.TestRunner.TargetAgent = target.targetAgent();

  self.TestRunner.networkManager = target.model(SDK.NetworkManager.NetworkManager);
  self.TestRunner.securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
  self.TestRunner.storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
  self.TestRunner.resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
  self.TestRunner.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
  self.TestRunner.runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
  self.TestRunner.domModel = target.model(SDK.DOMModel.DOMModel);
  self.TestRunner.domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
  self.TestRunner.cssModel = target.model(SDK.CSSModel.CSSModel);
  self.TestRunner.cpuProfilerModel = target.model(SDK.CPUProfilerModel.CPUProfilerModel);
  self.TestRunner.overlayModel = target.model(SDK.OverlayModel.OverlayModel);
  self.TestRunner.serviceWorkerManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
  self.TestRunner.tracingManager = target.model(Trace.TracingManager.TracingManager);
  self.TestRunner.mainTarget = target;
}

export async function _executeTestScript() {
  const testScriptURL = /** @type {string} */ (Root.Runtime.Runtime.queryParam('test'));
  if (TestRunner.isDebugTest()) {
    /* eslint-disable no-console */
    TestRunner.setInnerResult(console.log);
    TestRunner.setInnerCompleteTest(() => console.log('Test completed'));
    /* eslint-enable no-console */

    // Auto-start unit tests
    self.test = async function() {
      await import(testScriptURL);
    };
    return;
  }

  try {
    await import(testScriptURL);
  } catch (err) {
    TestRunner.addResult('TEST ENDED EARLY DUE TO UNCAUGHT ERROR:');
    TestRunner.addResult(err && err.stack || err);
    TestRunner.addResult('=== DO NOT COMMIT THIS INTO -expected.txt ===');
    TestRunner.completeTest();
  }
}

/** @type {boolean} */
let _startedTest = false;

/**
 * @implements {SDK.TargetManager.Observer}
 */
export class _TestObserver {
  /**
   * @param {!SDK.Target.Target} target
   * @override
   */
  targetAdded(target) {
    if (target.id() === 'main' && target.type() === 'frame' ||
        target.parentTarget()?.type() === 'tab' && target.type() === 'frame' && !target.targetInfo()?.subtype?.length) {
      _setupTestHelpers(target);
      if (_startedTest) {
        return;
      }
      _startedTest = true;
      TestRunner
          .loadHTML(`
        <head>
          <base href="${TestRunner.url()}">
        </head>
        <body>
        </body>
      `).then(() => _executeTestScript());
    }
  }

  /**
   * @param {!SDK.Target.Target} target
   * @override
   */
  targetRemoved(target) {
  }
}

SDK.TargetManager.TargetManager.instance().observeTargets(new _TestObserver());

const globalTestRunner = self.TestRunner;
export {globalTestRunner as TestRunner};
