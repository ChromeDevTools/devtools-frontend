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
  try {
    eval(message.expression);
  } catch (e) {
    TestRunner.addResult('Exception while running: ' + message.expression + '\n' + (e.stack || e));
    TestRunner.completeTest();
  }
}

ExtensionsTestRunner.runExtensionTests = async function() {
  var result = await TestRunner.RuntimeAgent.evaluate('location.href', 'console', false);

  if (!result)
    return;

  var pageURL = result.value;
  var extensionURL = ((/^https?:/.test(pageURL) ? pageURL.replace(/^(https?:\/\/[^\/]*\/).*$/, '$1') :
                                                  pageURL.replace(/\/inspector\/extensions\/[^\/]*$/, '/http/tests'))) +
      'inspector/resources/extension-main.html';
  extensionURL = extensionURL.replace('127.0.0.1', extensionsHost);

  InspectorFrontendAPI.addExtensions(
      [{startPage: extensionURL, name: 'test extension', exposeWebInspectorNamespace: true}]);

  Extensions.extensionServer.initializeExtensions();
};

(async function() {
  await TestRunner.evaluateInPagePromise(`
    function extensionFunctions() {
      var functions = '';

      for (symbol in window) {
        if (/^extension_/.exec(symbol) && typeof window[symbol] === 'function')
          functions += window[symbol].toString();
      }

      return functions;
    }

    var extensionsOrigin = 'http://devtools-extensions.oopif.test:8000';

    function extension_showPanel(panelId, callback) {
      evaluateOnFrontend('InspectorTest.showPanel(unescape(\'' + escape(panelId) + '\')).then(function() { reply(); });', callback);
    }

    var test = function() {
      Common.moduleSetting('shortcutPanelSwitch').set(true);
      InspectorTest.runExtensionTests();
    };
  `);
})();
