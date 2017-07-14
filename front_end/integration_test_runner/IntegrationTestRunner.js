// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Export all public members onto TestRunner namespace so test writers have a simpler API.
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/**
 * @param {!SDK.Target} target
 */
IntegrationTestRunner._setupTestHelpers = function(target) {
  TestRunner.CSSAgent = target.cssAgent();
  TestRunner.DeviceOrientationAgent = target.deviceOrientationAgent();
  TestRunner.DOMAgent = target.domAgent();
  TestRunner.DOMDebuggerAgent = target.domdebuggerAgent();
  TestRunner.DebuggerAgent = target.debuggerAgent();
  TestRunner.EmulationAgent = target.emulationAgent();
  TestRunner.HeapProfilerAgent = target.heapProfilerAgent();
  TestRunner.InspectorAgent = target.inspectorAgent();
  TestRunner.NetworkAgent = target.networkAgent();
  TestRunner.PageAgent = target.pageAgent();
  TestRunner.ProfilerAgent = target.profilerAgent();
  TestRunner.RuntimeAgent = target.runtimeAgent();
  TestRunner.TargetAgent = target.targetAgent();

  TestRunner.networkManager = target.model(SDK.NetworkManager);
  TestRunner.securityOriginManager = target.model(SDK.SecurityOriginManager);
  TestRunner.resourceTreeModel = target.model(SDK.ResourceTreeModel);
  TestRunner.debuggerModel = target.model(SDK.DebuggerModel);
  TestRunner.runtimeModel = target.model(SDK.RuntimeModel);
  TestRunner.domModel = target.model(SDK.DOMModel);
  TestRunner.domDebuggerModel = target.model(SDK.DOMDebuggerModel);
  TestRunner.cssModel = target.model(SDK.CSSModel);
  TestRunner.cpuProfilerModel = target.model(SDK.CPUProfilerModel);
  TestRunner.serviceWorkerManager = target.model(SDK.ServiceWorkerManager);
  TestRunner.tracingManager = target.model(SDK.TracingManager);
  TestRunner.mainTarget = target;
};

/**
 * @param {string|!Function} code
 * @param {!Function} callback
 */
TestRunner.evaluateInPage = async function(code, callback) {
  if (typeof code === 'function') {
    if (code.length) {
      TestRunner.addResult('ERROR: do not use evaluateInPage on a function with parameters: ' + code.toString());
      TestRunner.addResult('TestRunner.evaluateInPage invokes the function without arguments');
    }
    code = `(${code.toString()})()`;
  }
  var response = await TestRunner.RuntimeAgent.invoke_evaluate({expression: code, objectGroup: 'console'});
  if (!response[Protocol.Error]) {
    TestRunner.safeWrap(callback)(
        TestRunner.runtimeModel.createRemoteObject(response.result), response.exceptionDetails);
  }
};

/**
 * @param {string|!Function} code
 * @return {!Promise<!SDK.RemoteObject>}
 */
TestRunner.evaluateInPagePromise = function(code) {
  return new Promise(success => TestRunner.evaluateInPage(code, success));
};

/**
 * @param {!Function} callback
 */
TestRunner.deprecatedRunAfterPendingDispatches = function(callback) {
  var targets = SDK.targetManager.targets();
  var promises = targets.map(target => new Promise(resolve => target._deprecatedRunAfterPendingDispatches(resolve)));
  Promise.all(promises).then(TestRunner.safeWrap(callback));
};

/**
 * @param {string} html
 * @return {!Promise<!SDK.RemoteObject>}
 */
TestRunner.loadHTML = function(html) {
  html = html.replace(/'/g, '\\\'').replace(/\n/g, '\\n');
  return TestRunner.evaluateInPagePromise(`document.write('${html}');document.close();`);
};

/** @type {boolean} */
IntegrationTestRunner._startedTest = false;

/**
 * @implements {SDK.TargetManager.Observer}
 */
IntegrationTestRunner.TestObserver = class {
  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetAdded(target) {
    if (IntegrationTestRunner._startedTest)
      return;
    IntegrationTestRunner._startedTest = true;
    IntegrationTestRunner._setupTestHelpers(target);
    TestRunner.executeTestScript();
  }

  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetRemoved(target) {
  }
};

SDK.targetManager.observeTargets(new IntegrationTestRunner.TestObserver());
