// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TestRunner from './TestRunner.js';

export {
  TestRunner,
};

/**
 * @return {boolean}
 */
function _isStartupTest() {
  return Root.Runtime.queryParam('test').includes('/startup/');
}

/**
 * @param {!SDK.Target} target
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

  self.TestRunner.networkManager = target.model(SDK.NetworkManager);
  self.TestRunner.securityOriginManager = target.model(SDK.SecurityOriginManager);
  self.TestRunner.resourceTreeModel = target.model(SDK.ResourceTreeModel);
  self.TestRunner.debuggerModel = target.model(SDK.DebuggerModel);
  self.TestRunner.runtimeModel = target.model(SDK.RuntimeModel);
  self.TestRunner.domModel = target.model(SDK.DOMModel);
  self.TestRunner.domDebuggerModel = target.model(SDK.DOMDebuggerModel);
  self.TestRunner.cssModel = target.model(SDK.CSSModel);
  self.TestRunner.cpuProfilerModel = target.model(SDK.CPUProfilerModel);
  self.TestRunner.overlayModel = target.model(SDK.OverlayModel);
  self.TestRunner.serviceWorkerManager = target.model(SDK.ServiceWorkerManager);
  self.TestRunner.tracingManager = target.model(SDK.TracingManager);
  self.TestRunner.mainTarget = target;
}

export async function _executeTestScript() {
  const testScriptURL = /** @type {string} */ (Root.Runtime.queryParam('test'));
  if (TestRunner.isDebugTest()) {
    /* eslint-disable no-console */
    TestRunner.setInnerResult(console.log);
    TestRunner.setInnerCompleteTest(() => console.log('Test completed'));
    /* eslint-enable no-console */

    // Auto-start unit tests
    self.test = async function() {
      // TODO(crbug.com/1011811): Remove eval when we use TypeScript which does support dynamic imports
      await eval(`import("${testScriptURL}")`);
    };
    return;
  }

  try {
    // TODO(crbug.com/1011811): Remove eval when we use TypeScript which does support dynamic imports
    await eval(`import("${testScriptURL}")`);
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
   * @param {!SDK.Target} target
   * @override
   */
  targetAdded(target) {
    if (target.id() === 'main') {
      _setupTestHelpers(target);
    }
    if (_startedTest) {
      return;
    }
    _startedTest = true;
    if (_isStartupTest()) {
      return;
    }
    TestRunner
        .loadHTML(`
      <head>
        <base href="${TestRunner.url()}">
      </head>
      <body>
      </body>
    `).then(() => _executeTestScript());
  }

  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetRemoved(target) {
  }
}

/** @suppress {accessControls} */
(async function() {
  self.SDK.targetManager.observeTargets(new _TestObserver());
  if (!_isStartupTest()) {
    return;
  }
  /**
   * Startup test initialization:
   * 1. Wait for DevTools app UI to load
   * 2. Execute test script, the first line will be TestRunner.setupStartupTest(...) which:
   *    A. Navigate secondary window
   *    B. After preconditions occur, secondary window calls testRunner.inspectSecondaryWindow()
   * 3. Backend executes TestRunner._startupTestSetupFinished() which calls _initializeTarget()
   */
  TestRunner.setInitializeTargetForStartupTest(
      TestRunner.override(Main.Main._instanceForTest, '_initializeTarget', () => undefined)
          .bind(Main.Main._instanceForTest));
  await TestRunner.addSnifferPromise(Main.Main._instanceForTest, '_showAppUI');
  await _executeTestScript();
})();
