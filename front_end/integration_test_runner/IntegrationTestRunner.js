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
  var lines = new Error().stack.split('at ');
  var components = lines[lines.length - 2].trim().split('/');
  var source = components[components.length - 1].slice(0, -1).split(':');
  var fileName = source[0];
  var lineOffset = parseInt(source[1], 10);
  code = '\n'.repeat(lineOffset - 1) + code;
  if (code.indexOf('sourceURL=') === -1)
    code += `//# sourceURL=${fileName}`;
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
 * @param {string} code
 * @return {!Promise<!SDK.RemoteObject|undefined>}
 */
TestRunner.evaluateInPageAsync = async function(code) {
  var response = await TestRunner.RuntimeAgent.invoke_evaluate(
      {expression: code, objectGroup: 'console', includeCommandLineAPI: false, awaitPromise: true});

  var error = response[Protocol.Error];
  if (!error && !response.exceptionDetails)
    return TestRunner.runtimeModel.createRemoteObject(response.result);
  TestRunner.addResult(
      'Error: ' +
      (error || response.exceptionDetails && response.exceptionDetails.text || 'exception while evaluation in page.'));
  TestRunner.completeTest();
};

/**
 * @param {string} name
 * @param {!Array<*>} args
 * @return {!Promise<!SDK.RemoteObject|undefined>}
 */
TestRunner.callFunctionInPageAsync = function(name, args) {
  args = args || [];
  return TestRunner.evaluateInPageAsync(name + '(' + args.map(a => JSON.stringify(a)).join(',') + ')');
};

/**
 * @param {string} code
 */
TestRunner.evaluateInPageWithTimeout = function(code) {
  // FIXME: we need a better way of waiting for chromium events to happen
  TestRunner.evaluateInPagePromise('setTimeout(unescape(\'' + escape(code) + '\'), 1)');
};

/**
 * @param {function():*} func
 * @param {function(*):void} callback
 */
TestRunner.evaluateFunctionInOverlay = function(func, callback) {
  var expression = 'testRunner.evaluateInWebInspectorOverlay("(" + ' + func + ' + ")()")';
  var mainContext = TestRunner.runtimeModel.executionContexts()[0];
  mainContext.evaluate(expression, '', false, false, true, false, false, result => void callback(result.value));
};

/**
 * @param {boolean} passCondition
 * @param {string} failureText
 */
TestRunner.check = function(passCondition, failureText) {
  if (!passCondition)
    TestRunner.addResult('FAIL: ' + failureText);
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

/**
 * @param {string} title
 */
TestRunner.markStep = function(title) {
  TestRunner.addResult('\nRunning: ' + title);
};

TestRunner.startDumpingProtocolMessages = function() {
  // TODO(chenwilliam): stop abusing Closure interface which is why
  // we need to opt out of type checking here
  var untypedConnection = /** @type {*} */ (Protocol.InspectorBackend.Connection);
  untypedConnection.prototype._dumpProtocolMessage = self.testRunner.logToStderr.bind(self.testRunner);
  Protocol.InspectorBackend.Options.dumpInspectorProtocolMessages = 1;
};

/**
 * @param {string} url
 * @param {string} content
 * @param {!SDK.ResourceTreeFrame} frame
 */
TestRunner.addScriptForFrame = function(url, content, frame) {
  content += '\n//# sourceURL=' + url;
  var executionContext = TestRunner.runtimeModel.executionContexts().find(context => context.frameId === frame.id);
  TestRunner.RuntimeAgent.evaluate(content, 'console', false, false, executionContext.id);
};

TestRunner.formatters = {};

/**
 * @param {*} value
 * @return {string}
 */
TestRunner.formatters.formatAsTypeName = function(value) {
  return '<' + typeof value + '>';
};

/**
 * @param {*} value
 * @return {string|!Date}
 */
TestRunner.formatters.formatAsRecentTime = function(value) {
  if (typeof value !== 'object' || !(value instanceof Date))
    return TestRunner.formatters.formatAsTypeName(value);
  var delta = Date.now() - value;
  return 0 <= delta && delta < 30 * 60 * 1000 ? '<plausible>' : value;
};

/**
 * @param {string} value
 * @return {string}
 */
TestRunner.formatters.formatAsURL = function(value) {
  if (!value)
    return value;
  var lastIndex = value.lastIndexOf('devtools/');
  if (lastIndex < 0)
    return value;
  return '.../' + value.substr(lastIndex);
};

/**
 * @param {string} value
 * @return {string}
 */
TestRunner.formatters.formatAsDescription = function(value) {
  if (!value)
    return value;
  return '"' + value.replace(/^function [gs]et /, 'function ') + '"';
};

/**
 * @typedef {!Object<string, string>}
 */
TestRunner.CustomFormatters;

/**
 * @param {!Object} object
 * @param {!TestRunner.CustomFormatters=} customFormatters
 * @param {string=} prefix
 * @param {string=} firstLinePrefix
 */
TestRunner.addObject = function(object, customFormatters, prefix, firstLinePrefix) {
  prefix = prefix || '';
  firstLinePrefix = firstLinePrefix || prefix;
  TestRunner.addResult(firstLinePrefix + '{');
  var propertyNames = Object.keys(object);
  propertyNames.sort();
  for (var i = 0; i < propertyNames.length; ++i) {
    var prop = propertyNames[i];
    if (!object.hasOwnProperty(prop))
      continue;
    var prefixWithName = '    ' + prefix + prop + ' : ';
    var propValue = object[prop];
    if (customFormatters && customFormatters[prop]) {
      var formatterName = customFormatters[prop];
      if (formatterName !== 'skip') {
        var formatter = TestRunner.formatters[formatterName];
        TestRunner.addResult(prefixWithName + formatter(propValue));
      }
    } else {
      TestRunner.dump(propValue, customFormatters, '    ' + prefix, prefixWithName);
    }
  }
  TestRunner.addResult(prefix + '}');
};

/**
 * @param {!Array} array
 * @param {!TestRunner.CustomFormatters=} customFormatters
 * @param {string=} prefix
 * @param {string=} firstLinePrefix
 */
TestRunner.addArray = function(array, customFormatters, prefix, firstLinePrefix) {
  prefix = prefix || '';
  firstLinePrefix = firstLinePrefix || prefix;
  TestRunner.addResult(firstLinePrefix + '[');
  for (var i = 0; i < array.length; ++i)
    TestRunner.dump(array[i], customFormatters, prefix + '    ');
  TestRunner.addResult(prefix + ']');
};

/**
 * @param {!Node} node
 */
TestRunner.dumpDeepInnerHTML = function(node) {
  /**
   * @param {string} prefix
   * @param {!Node} node
   */
  function innerHTML(prefix, node) {
    var openTag = [];
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.parentElement || node.parentElement.nodeName !== 'STYLE')
        TestRunner.addResult(node.nodeValue);
      return;
    }
    openTag.push('<' + node.nodeName);
    var attrs = node.attributes;
    for (var i = 0; attrs && i < attrs.length; ++i)
      openTag.push(attrs[i].name + '=' + attrs[i].value);

    openTag.push('>');
    TestRunner.addResult(prefix + openTag.join(' '));
    for (var child = node.firstChild; child; child = child.nextSibling)
      innerHTML(prefix + '    ', child);
    if (node.shadowRoot)
      innerHTML(prefix + '    ', node.shadowRoot);
    TestRunner.addResult(prefix + '</' + node.nodeName + '>');
  }
  innerHTML('', node);
};

/**
 * @param {!Node} node
 * @return {string}
 */
TestRunner.deepTextContent = function(node) {
  if (!node)
    return '';
  if (node.nodeType === Node.TEXT_NODE && node.nodeValue)
    return !node.parentElement || node.parentElement.nodeName !== 'STYLE' ? node.nodeValue : '';
  var res = '';
  var children = node.childNodes;
  for (var i = 0; i < children.length; ++i)
    res += TestRunner.deepTextContent(children[i]);
  if (node.shadowRoot)
    res += TestRunner.deepTextContent(node.shadowRoot);
  return res;
};

/**
 * @param {*} value
 * @param {!TestRunner.CustomFormatters=} customFormatters
 * @param {string=} prefix
 * @param {string=} prefixWithName
 */
TestRunner.dump = function(value, customFormatters, prefix, prefixWithName) {
  prefixWithName = prefixWithName || prefix;
  if (prefixWithName && prefixWithName.length > 80) {
    TestRunner.addResult(prefixWithName + 'was skipped due to prefix length limit');
    return;
  }
  if (value === null)
    TestRunner.addResult(prefixWithName + 'null');
  else if (value && value.constructor && value.constructor.name === 'Array')
    TestRunner.addArray(/** @type {!Array} */ (value), customFormatters, prefix, prefixWithName);
  else if (typeof value === 'object')
    TestRunner.addObject(/** @type {!Object} */ (value), customFormatters, prefix, prefixWithName);
  else if (typeof value === 'string')
    TestRunner.addResult(prefixWithName + '"' + value + '"');
  else
    TestRunner.addResult(prefixWithName + value);
};

/**
 * @param {!UI.TreeElement} treeElement
 */
TestRunner.dumpObjectPropertyTreeElement = function(treeElement) {
  var expandedSubstring = treeElement.expanded ? '[expanded]' : '[collapsed]';
  TestRunner.addResult(expandedSubstring + ' ' + treeElement.listItemElement.deepTextContent());

  for (var i = 0; i < treeElement.childCount(); ++i) {
    var property = treeElement.childAt(i).property;
    var key = property.name;
    var value = property.value._description;
    TestRunner.addResult('    ' + key + ': ' + value);
  }
};

/**
 * @param {symbol} event
 * @param {!Common.Object} obj
 * @param {function(?):boolean=} condition
 * @return {!Promise}
 */
TestRunner.waitForEvent = function(event, obj, condition) {
  condition = condition || function() {
    return true;
  };
  return new Promise(resolve => {
    obj.addEventListener(event, onEventFired);

    /**
     * @param {!Common.Event} event
     */
    function onEventFired(event) {
      if (!condition(event.data))
        return;
      obj.removeEventListener(event, onEventFired);
      resolve(event.data);
    }
  });
};

/**
 * @param {function(!SDK.Target):boolean} filter
 * @return {!Promise<!SDK.Target>}
 */
TestRunner.waitForTarget = function(filter) {
  filter = filter || (target => true);
  for (var target of SDK.targetManager.targets()) {
    if (filter(target))
      return Promise.resolve(target);
  }
  return new Promise(fulfill => {
    var observer = /** @type {!SDK.TargetManager.Observer} */ ({
      targetAdded: function(target) {
        if (filter(target)) {
          SDK.targetManager.unobserveTargets(observer);
          fulfill(target);
        }
      },
      targetRemoved: function() {},
    });
    SDK.targetManager.observeTargets(observer);
  });
};

/**
 * @param {!SDK.RuntimeModel} runtimeModel
 * @return {!Promise}
 */
TestRunner.waitForExecutionContext = function(runtimeModel) {
  if (runtimeModel.executionContexts().length)
    return Promise.resolve(runtimeModel.executionContexts()[0]);
  return runtimeModel.once(SDK.RuntimeModel.Events.ExecutionContextCreated);
};

/**
 * @param {!SDK.ExecutionContext} context
 * @return {!Promise}
 */
TestRunner.waitForExecutionContextDestroyed = function(context) {
  var runtimeModel = context.runtimeModel;
  if (runtimeModel.executionContexts().indexOf(context) === -1)
    return Promise.resolve();
  return TestRunner.waitForEvent(
      SDK.RuntimeModel.Events.ExecutionContextDestroyed, runtimeModel,
      destroyedContext => destroyedContext === context);
};

/**
 * @param {number} a
 * @param {number} b
 * @param {string=} message
 */
TestRunner.assertGreaterOrEqual = function(a, b, message) {
  if (a < b)
    TestRunner.addResult('FAILED: ' + (message ? message + ': ' : '') + a + ' < ' + b);
};

/**
 * @param {string} url
 * @param {function():void} callback
 */
TestRunner.navigate = function(url, callback) {
  TestRunner._pageLoadedCallback = TestRunner.safeWrap(callback);
  TestRunner.evaluateInPagePromise('window.location.replace(\'' + url + '\')');
};

/**
 * @return {!Promise}
 */
TestRunner.navigatePromise = function(url) {
  return new Promise(fulfill => TestRunner.navigate(url, fulfill));
};

/**
 * @param {function():void} callback
 */
TestRunner.hardReloadPage = function(callback) {
  TestRunner._innerReloadPage(true, callback);
};

/**
 * @param {function():void} callback
 */
TestRunner.reloadPage = function(callback) {
  TestRunner._innerReloadPage(false, callback);
};

/**
 * @return {!Promise}
 */
TestRunner.reloadPagePromise = function() {
  return new Promise(fulfill => TestRunner.reloadPage(fulfill));
};

/**
 * @param {boolean} hardReload
 * @param {function():void} callback
 */
TestRunner._innerReloadPage = function(hardReload, callback) {
  TestRunner._pageLoadedCallback = TestRunner.safeWrap(callback);
  TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, TestRunner.pageLoaded);
  TestRunner.resourceTreeModel.reloadPage(hardReload);
};

TestRunner.pageLoaded = function() {
  TestRunner.resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.Load, TestRunner.pageLoaded);
  TestRunner.addResult('Page reloaded.');
  if (TestRunner._pageLoadedCallback) {
    var callback = TestRunner._pageLoadedCallback;
    delete TestRunner._pageLoadedCallback;
    callback();
  }
};

/**
 * @param {function():void} callback
 */
TestRunner.runWhenPageLoads = function(callback) {
  var oldCallback = TestRunner._pageLoadedCallback;
  function chainedCallback() {
    if (oldCallback)
      oldCallback();
    callback();
  }
  TestRunner._pageLoadedCallback = TestRunner.safeWrap(chainedCallback);
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
