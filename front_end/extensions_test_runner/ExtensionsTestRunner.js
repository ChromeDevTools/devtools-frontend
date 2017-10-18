// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

var extensionsHost = 'devtools-extensions.oopif.test';
var extensionsOrigin = `http://${extensionsHost}:8000`;
Extensions.extensionServer._registerHandler('evaluateForTestInFrontEnd', onEvaluate);

Extensions.extensionServer._extensionAPITestHook = function(extensionServerClient, coreAPI) {
  window.webInspector = coreAPI;
  window._extensionServerForTests = extensionServerClient;
  coreAPI.panels.themeName = 'themeNameForTest';
};

ExtensionsTestRunner._replyToExtension = function(requestId, port) {
  Extensions.extensionServer._dispatchCallback(requestId, port);
};

function onEvaluate(message, port) {
  // Note: reply(...) is actually used in eval strings
  // eslint-disable-next-line no-unused-vars
  function reply(param) {
    Extensions.extensionServer._dispatchCallback(message.requestId, port, param);
  }

  try {
    eval(message.expression);
  } catch (e) {
    TestRunner.addResult('Exception while running: ' + message.expression + '\n' + (e.stack || e));
    TestRunner.completeTest();
  }
}

ExtensionsTestRunner.showPanel = function(panelId) {
  if (panelId === 'extension')
    panelId = UI.inspectorView._tabbedPane._tabs[UI.inspectorView._tabbedPane._tabs.length - 1].id;
  return UI.inspectorView.showPanel(panelId);
};

ExtensionsTestRunner.runExtensionTests = async function() {
  var result = await TestRunner.RuntimeAgent.evaluate('location.href', 'console', false);

  if (!result)
    return;

  var pageURL = result.value;
  var extensionURL = ((/^https?:/.test(pageURL) ? pageURL.replace(/^(https?:\/\/[^\/]*\/).*$/, '$1') :
                                                  pageURL.replace(/\/devtools\/extensions\/[^\/]*$/, '/http/tests'))) +
      'devtools/resources/extension-main.html';
  extensionURL = extensionURL.replace('127.0.0.1', extensionsHost);

  InspectorFrontendAPI.addExtensions(
      [{startPage: extensionURL, name: 'test extension', exposeWebInspectorNamespace: true}]);

  Extensions.extensionServer.initializeExtensions();
};
