// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */

/** @type {!{logToStderr: function(), notifyDone: function()}|undefined} */
self.testRunner;

TestRunner.executeTestScript = function() {
  const testScriptURL = /** @type {string} */ (Runtime.queryParam('test'));
  fetch(testScriptURL)
      .then(data => data.text())
      .then(testScript => {
        if (!self.testRunner || Runtime.queryParam('debugFrontend')) {
          self.eval(`function test(){${testScript}}\n//# sourceURL=${testScriptURL}`);
          TestRunner.addResult = console.log;
          TestRunner.completeTest = () => console.log('Test completed');
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

/**
 * @param {string} module
 * @return {!Promise<undefined>}
 */
TestRunner.loadModule = function(module) {
  return self.runtime.loadModulePromise(module);
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