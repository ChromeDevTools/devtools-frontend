// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/* eslint-disable no-console */

/** @type {!{logToStderr: function(), notifyDone: function()}|undefined} */
self.testRunner;

TestRunner.executeTestScript = function() {
  var testScriptURL = /** @type {string} */ (Runtime.queryParam('test'));
  fetch(testScriptURL)
      .then(data => data.text())
      .then(testScript => {
        if (!self.testRunner || Runtime.queryParam('debugFrontend')) {
          TestRunner.addResult = console.log;
          TestRunner.completeTest = () => console.log('Test completed');

          // Auto-start unit tests
          if (!self.testRunner)
            eval(`(function test(){${testScript}})()\n//# sourceURL=${testScriptURL}`);
          else
            self.eval(`function test(){${testScript}}\n//# sourceURL=${testScriptURL}`);
          return;
        }
        eval(`(function test(){${testScript}})()\n//# sourceURL=${testScriptURL}`);
      })
      .catch(error => {
        TestRunner.addResult(`Unable to execute test script because of error: ${error}`);
        TestRunner.completeTest();
      });
};

/** @type {!Array<string>} */
TestRunner._results = [];

TestRunner.completeTest = function() {
  TestRunner.flushResults();
  self.testRunner.notifyDone();
};

/**
 * @suppressGlobalPropertiesCheck
 */
TestRunner.flushResults = function() {
  Array.prototype.forEach.call(document.documentElement.childNodes, x => x.remove());
  var outputElement = document.createElement('div');
  // Support for svg - add to document, not body, check for style.
  if (outputElement.style) {
    outputElement.style.whiteSpace = 'pre';
    outputElement.style.height = '10px';
    outputElement.style.overflow = 'hidden';
  }
  document.documentElement.appendChild(outputElement);
  for (var i = 0; i < TestRunner._results.length; i++) {
    outputElement.appendChild(document.createTextNode(TestRunner._results[i]));
    outputElement.appendChild(document.createElement('br'));
  }
  TestRunner._results = [];
};

/**
 * @param {*} text
 */
TestRunner.addResult = function(text) {
  TestRunner._results.push(String(text));
};

/**
 * @param {!Array<string>} textArray
 */
TestRunner.addResults = function(textArray) {
  if (!textArray)
    return;
  for (var i = 0, size = textArray.length; i < size; ++i)
    TestRunner.addResult(textArray[i]);
};

/**
 * @param {!Array<function()>} tests
 */
TestRunner.runTests = function(tests) {
  nextTest();

  function nextTest() {
    var test = tests.shift();
    if (!test) {
      TestRunner.completeTest();
      return;
    }
    TestRunner.addResult('\ntest: ' + test.name);
    var testPromise = test();
    if (!(testPromise instanceof Promise))
      testPromise = Promise.resolve();
    testPromise.then(nextTest);
  }
};

/**
 * @param {!Object} receiver
 * @param {string} methodName
 * @param {!Function} override
 * @param {boolean=} opt_sticky
 */
TestRunner.addSniffer = function(receiver, methodName, override, opt_sticky) {
  override = TestRunner.safeWrap(override);

  var original = receiver[methodName];
  if (typeof original !== 'function')
    throw new Error('Cannot find method to override: ' + methodName);

  receiver[methodName] = function(var_args) {
    try {
      var result = original.apply(this, arguments);
    } finally {
      if (!opt_sticky)
        receiver[methodName] = original;
    }
    // In case of exception the override won't be called.
    try {
      Array.prototype.push.call(arguments, result);
      override.apply(this, arguments);
    } catch (e) {
      throw new Error('Exception in overriden method \'' + methodName + '\': ' + e);
    }
    return result;
  };
};

/**
 * @param {!Object} receiver
 * @param {string} methodName
 * @return {!Promise<*>}
 */
TestRunner.addSnifferPromise = function(receiver, methodName) {
  return new Promise(function(resolve, reject) {
    var original = receiver[methodName];
    if (typeof original !== 'function') {
      reject('Cannot find method to override: ' + methodName);
      return;
    }

    receiver[methodName] = function(var_args) {
      try {
        var result = original.apply(this, arguments);
      } finally {
        receiver[methodName] = original;
      }
      // In case of exception the override won't be called.
      try {
        Array.prototype.push.call(arguments, result);
        resolve.apply(this, arguments);
      } catch (e) {
        reject('Exception in overridden method \'' + methodName + '\': ' + e);
        TestRunner.completeTest();
      }
      return result;
    };
  });
};

/** @type {function():void} */
TestRunner._resolveOnFinishInits;

/**
 * @param {string} module
 * @return {!Promise<undefined>}
 */
TestRunner.loadModule = async function(module) {
  var promise = new Promise(resolve => TestRunner._resolveOnFinishInits = resolve);
  await self.runtime.loadModulePromise(module);
  if (!TestRunner._pendingInits)
    return;
  return promise;
};

/**
 * @param {string} panel
 * @return {!Promise.<?UI.Panel>}
 */
TestRunner.showPanel = function(panel) {
  return UI.viewManager.showView(panel);
};

/**
 * @param {string} key
 * @param {boolean=} ctrlKey
 * @param {boolean=} altKey
 * @param {boolean=} shiftKey
 * @param {boolean=} metaKey
 * @return {!KeyboardEvent}
 */
TestRunner.createKeyEvent = function(key, ctrlKey, altKey, shiftKey, metaKey) {
  return new KeyboardEvent('keydown', {
    key: key,
    bubbles: true,
    cancelable: true,
    ctrlKey: !!ctrlKey,
    altKey: !!altKey,
    shiftKey: !!shiftKey,
    metaKey: !!metaKey
  });
};

/**
 * @param {!Function|undefined} func
 * @param {!Function=} onexception
 * @return {!Function}
 */
TestRunner.safeWrap = function(func, onexception) {
  /**
   * @this {*}
   */
  function result() {
    if (!func)
      return;
    var wrapThis = this;
    try {
      return func.apply(wrapThis, arguments);
    } catch (e) {
      TestRunner.addResult('Exception while running: ' + func + '\n' + (e.stack || e));
      if (onexception)
        TestRunner.safeWrap(onexception)();
      else
        TestRunner.completeTest();
    }
  }
  return result;
};

/**
 * @param {!Node} node
 * @return {string}
 */
TestRunner.textContentWithLineBreaks = function(node) {
  function padding(currentNode) {
    var result = 0;
    while (currentNode && currentNode !== node) {
      if (currentNode.nodeName === 'OL' &&
          !(currentNode.classList && currentNode.classList.contains('object-properties-section')))
        ++result;
      currentNode = currentNode.parentNode;
    }
    return Array(result * 4 + 1).join(' ');
  }

  var buffer = '';
  var currentNode = node;
  var ignoreFirst = false;
  while (currentNode.traverseNextNode(node)) {
    currentNode = currentNode.traverseNextNode(node);
    if (currentNode.nodeType === Node.TEXT_NODE) {
      buffer += currentNode.nodeValue;
    } else if (currentNode.nodeName === 'LI' || currentNode.nodeName === 'TR') {
      if (!ignoreFirst)
        buffer += '\n' + padding(currentNode);
      else
        ignoreFirst = false;
    } else if (currentNode.nodeName === 'STYLE') {
      currentNode = currentNode.traverseNextNode(node);
      continue;
    } else if (currentNode.classList && currentNode.classList.contains('object-properties-section')) {
      ignoreFirst = true;
    }
  }
  return buffer;
};

/**
 * @param {!Node} node
 * @return {string}
 */
TestRunner.textContentWithoutStyles = function(node) {
  var buffer = '';
  var currentNode = node;
  while (currentNode.traverseNextNode(node)) {
    currentNode = currentNode.traverseNextNode(node);
    if (currentNode.nodeType === Node.TEXT_NODE)
      buffer += currentNode.nodeValue;
    else if (currentNode.nodeName === 'STYLE')
      currentNode = currentNode.traverseNextNode(node);
  }
  return buffer;
};

/**
 * @param {!SDK.Target} target
 */
TestRunner._setupTestHelpers = function(target) {
  TestRunner.CSSAgent = target.cssAgent();
  TestRunner.DeviceOrientationAgent = target.deviceOrientationAgent();
  TestRunner.DOMAgent = target.domAgent();
  TestRunner.DOMDebuggerAgent = target.domdebuggerAgent();
  TestRunner.DebuggerAgent = target.debuggerAgent();
  TestRunner.EmulationAgent = target.emulationAgent();
  TestRunner.HeapProfilerAgent = target.heapProfilerAgent();
  TestRunner.InspectorAgent = target.inspectorAgent();
  TestRunner.NetworkAgent = target.networkAgent();
  TestRunner.OverlayAgent = target.overlayAgent();
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
  TestRunner.overlayModel = target.model(SDK.OverlayModel);
  TestRunner.serviceWorkerManager = target.model(SDK.ServiceWorkerManager);
  TestRunner.tracingManager = target.model(SDK.TracingManager);
  TestRunner.mainTarget = target;
};

/** @type {number} */
TestRunner._evaluateInPageCounter = 0;

/**
 * @param {string|!Function} code
 * @param {!Function} callback
 */
TestRunner.evaluateInPage = async function(code, callback) {
  var lines = new Error().stack.split('at ');

  // Handles cases where the function is safe wrapped
  var testScriptURL = /** @type {string} */ (Runtime.queryParam('test'));
  var functionLine = lines.reduce((acc, line) => line.includes(testScriptURL) ? line : acc, lines[lines.length - 2]);

  var components = functionLine.trim().split('/');
  var source = components[components.length - 1].slice(0, -1).split(':');
  var fileName = source[0];
  var sourceURL = `test://evaluations/${TestRunner._evaluateInPageCounter++}/` + fileName;
  var lineOffset = parseInt(source[1], 10);
  code = '\n'.repeat(lineOffset - 1) + code;
  if (code.indexOf('sourceURL=') === -1)
    code += `//# sourceURL=${sourceURL}`;
  var response = await TestRunner.RuntimeAgent.invoke_evaluate({expression: code, objectGroup: 'console'});
  if (!response[Protocol.Error]) {
    TestRunner.safeWrap(callback)(
        TestRunner.runtimeModel.createRemoteObject(response.result), response.exceptionDetails);
  }
};

/**
 * Doesn't append sourceURL to snippets evaluated in inspected page
 * to avoid churning test expectations
 * @param {string} code
 * @return {!Promise<undefined>}
 */
TestRunner.evaluateInPageAnonymously = async function(code) {
  var response = await TestRunner.RuntimeAgent.invoke_evaluate({expression: code, objectGroup: 'console'});
  if (!response[Protocol.Error])
    return Promise.resolve();
  TestRunner.addResult(
      'Error: ' +
      (response.exceptionDetails && response.exceptionDetails.text || 'exception from evaluateInPageAnonymously.'));
  TestRunner.completeTest();
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
  TestRunner.evaluateInPageAnonymously('setTimeout(unescape(\'' + escape(code) + '\'), 1)');
};

/**
 * @param {function():*} func
 * @param {function(*):void} callback
 */
TestRunner.evaluateFunctionInOverlay = function(func, callback) {
  var expression = 'testRunner.evaluateInWebInspectorOverlay("(" + ' + func + ' + ")()")';
  var mainContext = TestRunner.runtimeModel.executionContexts()[0];
  mainContext
      .evaluate(
          {
            expression: expression,
            objectGroup: '',
            includeCommandLineAPI: false,
            silent: false,
            returnByValue: true,
            generatePreview: false
          },
          /* userGesture */ false, /* awaitPromise*/ false)
      .then(result => void callback(result.object.value));
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
 * This ensures a base tag is set so all DOM references
 * are relative to the test file and not the inspected page
 * (i.e. http/tests/devtools/resources/inspected-page.html).
 * @param {string} html
 * @return {!Promise<undefined>}
 */
TestRunner.loadHTML = function(html) {
  var testPath = TestRunner.url();
  if (!html.includes('<base'))
    html = `<base href="${testPath}">` + html;
  html = html.replace(/'/g, '\\\'').replace(/\n/g, '\\n');
  return TestRunner.evaluateInPageAnonymously(`document.write('${html}');document.close();`);
};

/**
 * @param {string} path
 * @return {!Promise<!SDK.RemoteObject|undefined>}
 */
TestRunner.addScriptTag = function(path) {
  return TestRunner.evaluateInPageAsync(`
    (function(){
      var script = document.createElement('script');
      script.src = '${path}';
      document.head.append(script);
      return new Promise(f => script.onload = f);
    })();
  `);
};

/**
 * @param {string} path
 * @return {!Promise<!SDK.RemoteObject|undefined>}
 */
TestRunner.addStylesheetTag = function(path) {
  return TestRunner.evaluateInPageAsync(`
    (function(){
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '${path}';
      link.onload = onload;
      document.head.append(link);
      var resolve;
      var promise = new Promise(r => resolve = r);
      function onload() {
        // Force style recalc
        window.getComputedStyle(document.body).color;
        resolve();
      }
      return promise;
    })();
  `);
};
/**
 * @param {string} path
 * @param {!Object|undefined} options
 * @return {!Promise<!SDK.RemoteObject|undefined>}
 */
TestRunner.addIframe = function(path, options = {}) {
  options.id = options.id || '';
  return TestRunner.evaluateInPageAsync(`
    (function(){
      var iframe = document.createElement('iframe');
      iframe.src = '${path}';
      iframe.id = '${options.id}';
      document.body.appendChild(iframe);
      return new Promise(f => iframe.onload = f);
    })();
  `);
};

/** @type {number} */
TestRunner._pendingInits = 0;

/**
 * @param {string} code
 */
TestRunner.initAsync = async function(code) {
  TestRunner._pendingInits++;
  await TestRunner.RuntimeAgent.invoke_evaluate({expression: code, objectGroup: 'console'});
  TestRunner._pendingInits--;
  if (!TestRunner._pendingInits)
    TestRunner._resolveOnFinishInits();
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
 * @return {string}
 */
TestRunner.formatters.formatAsTypeNameOrNull = function(value) {
  if (value === null)
    return 'null';
  return TestRunner.formatters.formatAsTypeName(value);
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
  TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, TestRunner._pageNavigated);
  // Note: injected <base> means that url is relative to test
  // and not the inspected page
  TestRunner.evaluateInPageAnonymously('window.location.replace(\'' + url + '\')');
};

/**
 * @return {!Promise}
 */
TestRunner.navigatePromise = function(url) {
  return new Promise(fulfill => TestRunner.navigate(url, fulfill));
};

TestRunner._pageNavigated = function() {
  TestRunner.resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.Load, TestRunner._pageNavigated);
  TestRunner._handlePageLoaded();
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
  TestRunner._handlePageLoaded();
};

TestRunner._handlePageLoaded = function() {
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

/**
 * @param {!Array<function(function():void)>} testSuite
 */
TestRunner.runTestSuite = function(testSuite) {
  var testSuiteTests = testSuite.slice();

  function runner() {
    if (!testSuiteTests.length) {
      TestRunner.completeTest();
      return;
    }
    var nextTest = testSuiteTests.shift();
    TestRunner.addResult('');
    TestRunner.addResult(
        'Running: ' +
        /function\s([^(]*)/.exec(nextTest)[1]);
    TestRunner.safeWrap(nextTest)(runner);
  }
  runner();
};

/**
 * @param {*} expected
 * @param {*} found
 * @param {string} message
 */
TestRunner.assertEquals = function(expected, found, message) {
  if (expected === found)
    return;

  var error;
  if (message)
    error = 'Failure (' + message + '):';
  else
    error = 'Failure:';
  throw new Error(error + ' expected <' + expected + '> found <' + found + '>');
};

/**
 * @param {*} found
 * @param {string} message
 */
TestRunner.assertTrue = function(found, message) {
  TestRunner.assertEquals(true, !!found, message);
};

/**
 * @param {!Object} receiver
 * @param {string} methodName
 * @param {!Function} override
 * @param {boolean=} opt_sticky
 * @return {!Function}
 */
TestRunner.override = function(receiver, methodName, override, opt_sticky) {
  override = TestRunner.safeWrap(override);

  var original = receiver[methodName];
  if (typeof original !== 'function')
    throw new Error('Cannot find method to override: ' + methodName);

  receiver[methodName] = function(var_args) {
    try {
      return override.apply(this, arguments);
    } catch (e) {
      throw new Error('Exception in overriden method \'' + methodName + '\': ' + e);
    } finally {
      if (!opt_sticky)
        receiver[methodName] = original;
    }
  };

  return original;
};

/**
 * @param {string} text
 * @return {string}
 */
TestRunner.clearSpecificInfoFromStackFrames = function(text) {
  var buffer = text.replace(/\(file:\/\/\/(?:[^)]+\)|[\w\/:-]+)/g, '(...)');
  buffer = buffer.replace(/\(http:\/\/(?:[^)]+\)|[\w\/:-]+)/g, '(...)');
  buffer = buffer.replace(/\(test:\/\/(?:[^)]+\)|[\w\/:-]+)/g, '(...)');
  buffer = buffer.replace(/\(<anonymous>:[^)]+\)/g, '(...)');
  buffer = buffer.replace(/VM\d+/g, 'VM');
  return buffer.replace(/\s*at[^()]+\(native\)/g, '');
};

TestRunner.hideInspectorView = function() {
  UI.inspectorView.element.setAttribute('style', 'display:none !important');
};

/**
 * @return {?SDK.ResourceTreeFrame}
 */
TestRunner.mainFrame = function() {
  return TestRunner.resourceTreeModel.mainFrame;
};


TestRunner.StringOutputStream = class {
  /**
   * @param {function(string):void} callback
   */
  constructor(callback) {
    this._callback = callback;
    this._buffer = '';
  }

  /**
   * @param {string} fileName
   * @return {!Promise<boolean>}
   */
  async open(fileName) {
    return true;
  }

  /**
   * @param {string} chunk
   */
  async write(chunk) {
    this._buffer += chunk;
  }

  async close() {
    this._callback(this._buffer);
  }
};

/**
 * @template V
 */
TestRunner.MockSetting = class {
  /**
   * @param {V} value
   */
  constructor(value) {
    this._value = value;
  }

  /**
   * @return {V}
   */
  get() {
    return this._value;
  }

  /**
   * @param {V} value
   */
  set(value) {
    this._value = value;
  }
};

/**
 * @return {!Array<!Runtime.Module>}
 */
TestRunner.loadedModules = function() {
  return self.runtime._modules.filter(module => module._loadedForTest)
      .filter(module => module.name().indexOf('test_runner') === -1);
};

/**
 * @param {!Array<!Runtime.Module>} relativeTo
 * @return {!Array<!Runtime.Module>}
 */
TestRunner.dumpLoadedModules = function(relativeTo) {
  var previous = new Set(relativeTo || []);
  function moduleSorter(left, right) {
    return String.naturalOrderComparator(left._descriptor.name, right._descriptor.name);
  }

  TestRunner.addResult('Loaded modules:');
  var loadedModules = TestRunner.loadedModules().sort(moduleSorter);
  for (var module of loadedModules) {
    if (previous.has(module))
      continue;
    TestRunner.addResult('    ' + module._descriptor.name);
  }
  return loadedModules;
};

/**
 * @param {!SDK.Target} target
 * @return {boolean}
 */
TestRunner.isDedicatedWorker = function(target) {
  return target && !target.hasBrowserCapability() && target.hasJSCapability() && !target.hasTargetCapability();
};

/**
 * @param {!SDK.Target} target
 * @return {boolean}
 */
TestRunner.isServiceWorker = function(target) {
  return target && !target.hasBrowserCapability() && !target.hasJSCapability() && target.hasNetworkCapability() &&
      target.hasTargetCapability();
};

/**
 * @param {!SDK.Target} target
 * @return {string}
 */
TestRunner.describeTargetType = function(target) {
  if (TestRunner.isDedicatedWorker(target))
    return 'worker';
  if (TestRunner.isServiceWorker(target))
    return 'service-worker';
  if (!target.parentTarget())
    return 'page';
  return 'frame';
};

/**
 * @param {string} urlSuffix
 * @param {!Workspace.projectTypes=} projectType
 * @return {!Promise}
 */
TestRunner.waitForUISourceCode = function(urlSuffix, projectType) {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  function matches(uiSourceCode) {
    if (projectType && uiSourceCode.project().type() !== projectType)
      return false;
    if (!projectType && uiSourceCode.project().type() === Workspace.projectTypes.Service)
      return false;
    if (urlSuffix && !uiSourceCode.url().endsWith(urlSuffix))
      return false;
    return true;
  }

  for (var uiSourceCode of Workspace.workspace.uiSourceCodes()) {
    if (urlSuffix && matches(uiSourceCode))
      return Promise.resolve(uiSourceCode);
  }

  return TestRunner.waitForEvent(Workspace.Workspace.Events.UISourceCodeAdded, Workspace.workspace, matches);
};

/**
 * @param {!Function} callback
 */
TestRunner.waitForUISourceCodeRemoved = function(callback) {
  Workspace.workspace.once(Workspace.Workspace.Events.UISourceCodeRemoved).then(callback);
};

/**
 * @param {string=} url
 * @return {string}
 */
TestRunner.url = function(url = '') {
  // TODO(chenwilliam): only new-style tests will have a test queryParam;
  // remove inspectedURL() after all tests have been migrated to new test framework.
  var testScriptURL =
      /** @type {string} */ (Runtime.queryParam('test')) || SDK.targetManager.mainTarget().inspectedURL();

  // This handles relative (e.g. "../file"), root (e.g. "/resource"),
  // absolute (e.g. "http://", "data:") and empty (e.g. "") paths
  return new URL(url, testScriptURL + '/../').href;
};

/**
 * @param {string} str
 * @param {string} mimeType
 * @return {!Promise.<undefined>}
 * @suppressGlobalPropertiesCheck
 */
TestRunner.dumpSyntaxHighlight = function(str, mimeType) {
  var node = document.createElement('span');
  node.textContent = str;
  var javascriptSyntaxHighlighter = new UI.SyntaxHighlighter(mimeType, false);
  return javascriptSyntaxHighlighter.syntaxHighlightNode(node).then(dumpSyntax);

  function dumpSyntax() {
    var node_parts = [];

    for (var i = 0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].getAttribute)
        node_parts.push(node.childNodes[i].getAttribute('class'));
      else
        node_parts.push('*');
    }

    TestRunner.addResult(str + ': ' + node_parts.join(', '));
  }
};

/** @type {boolean} */
TestRunner._startedTest = false;

/**
 * @implements {SDK.TargetManager.Observer}
 */
TestRunner.TestObserver = class {
  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetAdded(target) {
    if (TestRunner._startedTest)
      return;
    TestRunner._startedTest = true;
    TestRunner._setupTestHelpers(target);
    TestRunner.runTest();
  }

  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetRemoved(target) {
  }
};

TestRunner.runTest = async function() {
  var testPath = TestRunner.url();
  await TestRunner.loadHTML(`
    <head>
      <base href="${testPath}">
    </head>
    <body>
    </body>
  `);
  TestRunner.executeTestScript();
};

// Old-style tests start test using inspector-test.js
if (Runtime.queryParam('test'))
  SDK.targetManager.observeTargets(new TestRunner.TestObserver());

(function() {
/**
   * @param {string|!Event} message
   * @param {string} source
   * @param {number} lineno
   * @param {number} colno
   * @param {!Error} error
   */
function completeTestOnError(message, source, lineno, colno, error) {
  TestRunner.addResult('TEST ENDED IN ERROR: ' + error.stack);
  TestRunner.completeTest();
}

self['onerror'] = completeTestOnError;
})();
