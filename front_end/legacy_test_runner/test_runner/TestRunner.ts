// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck This file is not checked by TypeScript as it has a lot of legacy code.

import * as Common from '../../core/common/common.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as UI from '../../ui/legacy/legacy.js';

/**
 * @file using private properties isn't a Closure violation in tests.
 */

/* eslint-disable no-console */

/**
 * @returns
 */
export function isDebugTest(): boolean {
  return !self.testRunner || Boolean(Root.Runtime.Runtime.queryParam('debugFrontend'));
}

/**
 * This monkey patches console functions in DevTools context so the console
 * messages are shown in the right places, instead of having all of the console
 * messages printed at the top of the test expectation file (default behavior).
 */
export function _printDevToolsConsole(): void {
  if (isDebugTest()) {
    return;
  }
  console.log = (...args) => {
    addResult(`log: ${args}`);
  };
  console.error = (...args) => {
    addResult(`error: ${args}`);
  };
  console.info = (...args) => {
    addResult(`info: ${args}`);
  };
  console.assert = (assertionCondition, ...args) => {
    if (!assertionCondition) {
      addResult(`ASSERTION FAILURE: ${args.join(' ')}`);
    }
  };
}

self['onerror'] = (message, source, lineno, colno, error) => {
  addResult('TEST ENDED IN ERROR: ' + error.stack);
  completeTest();
};
(() => {
  self.addEventListener('unhandledrejection', event => {
    addResult(`PROMISE FAILURE: ${event.reason.stack ?? event.reason}`);
    completeTest();
  });
})();
_printDevToolsConsole();

// TODO(crbug.com/1032477): Re-enable once test timeouts are handled in Chromium
// setTimeout(() => {
//   addResult('TEST TIMED OUT!');
//   completeTest();
// }, 6000);

/** @type {!Array<string>} */
let _results = [];

let _innerAddResult = text => {
  _results.push(String(text));
};

export function setInnerResult(updatedInnerResult: any): void {
  _innerAddResult = updatedInnerResult;
}

/**
 * @param text
 */
export function addResult(text: any): void {
  _innerAddResult(text);
}

let completed = false;

let _innerCompleteTest = () => {
  if (completed) {
    return;
  }
  completed = true;
  flushResults();
  self.testRunner.notifyDone();
};

export function setInnerCompleteTest(updatedInnerCompleteTest: any): void {
  _innerCompleteTest = updatedInnerCompleteTest;
}

export function completeTest(): void {
  _innerCompleteTest();
}

self.TestRunner = self.TestRunner || {};
function flushResults() {
  Array.prototype.forEach.call(document.documentElement.childNodes, x => x.remove());
  const outputElement = document.createElement('div');
  // Support for svg - add to document, not body, check for style.
  if (outputElement.style) {
    outputElement.style.whiteSpace = 'pre';
    outputElement.style.height = '10px';
    outputElement.style.overflow = 'hidden';
  }
  document.documentElement.appendChild(outputElement);
  for (let i = 0; i < _results.length; i++) {
    outputElement.appendChild(document.createTextNode(_results[i]));
    outputElement.appendChild(document.createElement('br'));
  }
  _results = [];
}

/**
 * @param textArray
 */
export function addResults(textArray: any): void {
  if (!textArray) {
    return;
  }
  for (let i = 0, size = textArray.length; i < size; ++i) {
    addResult(textArray[i]);
  }
}

/**
 * @param tests
 */
export function runTests(tests: any): void {
  nextTest();

  function nextTest() {
    const test = tests.shift();
    if (!test) {
      completeTest();
      return;
    }
    addResult('\ntest: ' + test.name);
    let testPromise = test();
    if (!(testPromise instanceof Promise)) {
      testPromise = Promise.resolve();
    }
    testPromise.then(nextTest);
  }
}

/**
 * @param receiver
 * @param methodName
 * @param override
 * @param opt_sticky
 */
export function addSniffer(receiver: any, methodName: any, override: any, opt_sticky: any): void {
  override = safeWrap(override);

  const original = receiver[methodName];
  if (typeof original !== 'function') {
    throw new Error('Cannot find method to override: ' + methodName);
  }

  receiver[methodName] = function(var_args) {
    let result;
    try {
      result = original.apply(this, arguments);
    } finally {
      if (!opt_sticky) {
        receiver[methodName] = original;
      }
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
}

/**
 * @param receiver
 * @param methodName
 * @returns
 */
export function addSnifferPromise(receiver: any, methodName: any): Promise<unknown> {
  return new Promise(function(resolve, reject) {
    const original = receiver[methodName];
    if (typeof original !== 'function') {
      reject('Cannot find method to override: ' + methodName);
      return;
    }

    receiver[methodName] = function(var_args) {
      let result;
      try {
        result = original.apply(this, arguments);
      } finally {
        receiver[methodName] = original;
      }
      // In case of exception the override won't be called.
      try {
        Array.prototype.push.call(arguments, result);
        resolve.apply(this, arguments);
      } catch (e) {
        reject('Exception in overridden method \'' + methodName + '\': ' + e);
        completeTest();
      }
      return result;
    };
  });
}

/**
 * @param textNode
 * @param start
 * @param end
 * @returns
 */
export function selectTextInTextNode(textNode: any, start: any, end: any): any {
  start = start || 0;
  end = end || textNode.textContent.length;

  if (start < 0) {
    start = end + start;
  }

  const selection = textNode.getComponentSelection();
  selection.removeAllRanges();
  const range = textNode.ownerDocument.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  selection.addRange(range);
  return textNode;
}

/**
 * @param panel
 * @returns
 */
export function showPanel(panel: any): Promise<void> {
  return UI.ViewManager.ViewManager.instance().showView(panel);
}

/**
 * @param key
 * @param ctrlKey
 * @param altKey
 * @param shiftKey
 * @param metaKey
 * @returns
 */
export function createKeyEvent(key: any, ctrlKey: any, altKey: any, shiftKey: any, metaKey: any): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: Boolean(ctrlKey),
    altKey: Boolean(altKey),
    shiftKey: Boolean(shiftKey),
    metaKey: Boolean(metaKey),
  });
}

/**
 * Wraps a test function with an exception filter. Does not work
 * correctly for async functions; use safeAsyncWrap instead.
 * @param func
 * @param onexception
 * @returns
 */
export function safeWrap(func: any, onexception: any): () => any {
  /**
   * @this {*}
   */
  function result() {
    if (!func) {
      return;
    }
    const wrapThis = this;
    try {
      return func.apply(wrapThis, arguments);
    } catch (e) {
      addResult('Exception while running: ' + func + '\n' + (e.stack || e));
      if (onexception) {
        safeWrap(onexception)();
      } else {
        completeTest();
      }
    }
  }
  return result;
}

/**
 * Wraps a test function that returns a Promise with an exception
 * filter. Does not work correctly for functions which don't return
 * a Promise; use safeWrap instead.
 * @param func
 * @returns
 */
function safeAsyncWrap(func) {
  /**
   * @this {*}
   */
  async function result() {
    if (!func) {
      return;
    }
    const wrapThis = this;
    try {
      return await func.apply(wrapThis, arguments);
    } catch (e) {
      addResult('Exception while running: ' + func + '\n' + (e.stack || e));
      completeTest();
    }
  }
  return result;
}

/**
 * @param node
 * @returns
 */
export function textContentWithLineBreaks(node: any): string {
  function padding(currentNode) {
    let result = 0;
    while (currentNode && currentNode !== node) {
      if (currentNode.nodeName === 'OL' &&
          !(currentNode.classList && currentNode.classList.contains('object-properties-section'))) {
        ++result;
      }
      currentNode = currentNode.parentNode;
    }
    return Array(result * 4 + 1).join(' ');
  }

  let buffer = '';
  let currentNode = node;
  let ignoreFirst = false;
  while (currentNode.traverseNextNode(node)) {
    currentNode = currentNode.traverseNextNode(node);
    if (currentNode.nodeType === Node.TEXT_NODE && currentNode.parentNode?.nodeType !== Node.DOCUMENT_FRAGMENT_NODE &&
        currentNode.parentNode?.nodeName !== 'STYLE') {
      buffer += currentNode.nodeValue;
    } else if (currentNode.nodeName === 'LI' || currentNode.nodeName === 'TR') {
      if (!ignoreFirst) {
        buffer += '\n' + padding(currentNode);
      } else {
        ignoreFirst = false;
      }
    } else if (currentNode.nodeName === 'STYLE') {
      currentNode = currentNode.traverseNextNode(node);
      continue;
    } else if (currentNode.classList && currentNode.classList.contains('object-properties-section')) {
      ignoreFirst = true;
    }
  }
  return buffer;
}

/**
 * @param node
 * @returns
 */
export function textContentWithLineBreaksTrimmed(node: any): string {
  // We want to allow single empty lines (2 white space characters), but
  // compress occurences of 3 or more whitespaces.
  return textContentWithLineBreaks(node).replace(/\s{3,}/g, ' ');
}

/**
 * @param node
 * @returns
 */
export function textContentWithoutStyles(node: any): string {
  let buffer = '';
  let currentNode = node;
  while (true) {
    currentNode = currentNode.traverseNextNode(
        node, currentNode.tagName === 'DEVTOOLS-CSS-LENGTH' || currentNode.tagName === 'DEVTOOLS-ICON');
    if (!currentNode) {
      break;
    }
    if (currentNode.nodeType === Node.TEXT_NODE && currentNode.parentElement?.tagName !== 'STYLE') {
      buffer += currentNode.nodeValue;
    } else if (currentNode.tagName === 'DEVTOOLS-TOOLTIP') {
      // <devtools-tooltip> holds popover contents in-line in a slot, so its contents appear in textContent. This is
      // not what the tests expect, so step over its contents entirely.
      currentNode = currentNode.lastChild?.traverseNextNode(node) ?? currentNode.traverseNextNode(node);
    } else if (currentNode.nodeName === 'STYLE') {
      currentNode = currentNode.traverseNextNode(node);
    }
  }
  return buffer;
}

/**
 * @param code
 * @returns
 */
export async function evaluateInPageRemoteObject(code: any): Promise<any> {
  const response = await _evaluateInPage(code);
  return TestRunner.runtimeModel.createRemoteObject(response.result);
}

/**
 * @param code
 * @param callback
 */
export async function evaluateInPage(code: any, callback: any): Promise<void> {
  const response = await _evaluateInPage(code);
  safeWrap(callback)(response.result.value, response.exceptionDetails);
}

/** @type {number} */
let _evaluateInPageCounter = 0;

/**
 * @param code
 * @returns
 *
 */
export async function _evaluateInPage(code: any): Promise<any> {
  const lines = new Error().stack.split('at ');

  // Handles cases where the function is safe wrapped
  const testScriptURL = /** @type {string} */ (Root.Runtime.Runtime.queryParam('test'));
  const functionLine = lines.reduce((acc, line) => line.includes(testScriptURL) ? line : acc, lines[lines.length - 2]);

  const components = functionLine.trim().split('/');
  const source = components[components.length - 1].slice(0, -1).split(':');
  const fileName = source[0];
  const sourceURL = `test://evaluations/${_evaluateInPageCounter++}/` + fileName;
  const lineOffset = parseInt(source[1], 10);
  code = '\n'.repeat(lineOffset - 1) + code;
  if (code.indexOf('sourceURL=') === -1) {
    code += `//# sourceURL=${sourceURL}`;
  }
  const response = await TestRunner.RuntimeAgent.invoke_evaluate({expression: code, objectGroup: 'console'});
  const error = response.getError();
  if (error) {
    addResult('Error: ' + error);
    completeTest();
    return;
  }
  return response;
}

function logResponseError(response) {
  let errorMessage = 'Error: ';
  if (response.getError()) {
    errorMessage += response.getError();
  } else if (response.exceptionDetails) {
    errorMessage += response.exceptionDetails.text;
    if (response.exceptionDetails.exception) {
      errorMessage += ' ' + response.exceptionDetails.exception.description;
    }
  }
  addResult(errorMessage);
}

/**
 * Doesn't append sourceURL to snippets evaluated in inspected page
 * to avoid churning test expectations
 * @param code
 * @param userGesture
 * @returns
 */
export async function evaluateInPageAnonymously(code: any, userGesture: any): Promise<any> {
  const response =
      await TestRunner.RuntimeAgent.invoke_evaluate({expression: code, objectGroup: 'console', userGesture});
  if (response && !response.exceptionDetails && !response.getError()) {
    return response.result.value;
  }
  logResponseError(response);
  completeTest();
}

/**
 * @param code
 * @returns
 */
export function evaluateInPagePromise(code: any): Promise<unknown> {
  return new Promise(success => evaluateInPage(code, success));
}

/**
 * @param code
 * @returns
 */
export async function evaluateInPageAsync(code: any): Promise<any> {
  const response = await TestRunner.RuntimeAgent.invoke_evaluate(
      {expression: code, objectGroup: 'console', includeCommandLineAPI: false, awaitPromise: true});

  if (response && !response.exceptionDetails && !response.getError()) {
    return response.result.value;
  }
  logResponseError(response);
  completeTest();
}

/**
 * @param name
 * @param args
 * @returns
 */
export function callFunctionInPageAsync(name: any, args: any): Promise<any> {
  args = args || [];
  return evaluateInPageAsync(name + '(' + args.map(a => JSON.stringify(a)).join(',') + ')');
}

/**
 * @param code
 * @param userGesture
 */
export function evaluateInPageWithTimeout(code: any, userGesture: any): void {
  // FIXME: we need a better way of waiting for chromium events to happen
  evaluateInPageAnonymously('setTimeout(unescape(\'' + escape(code) + '\'), 1)', userGesture);
}

/**
 * @param func
 * @param callback
 */
export function evaluateFunctionInOverlay(func: any, callback: any): void {
  const expression = 'internals.evaluateInInspectorOverlay("(" + ' + func + ' + ")()")';
  const mainContext = TestRunner.runtimeModel.executionContexts()[0];
  mainContext
      .evaluate({
        expression,
        objectGroup: '',
        includeCommandLineAPI: false,
        silent: false,
        returnByValue: true,
        generatePreview: false,
      },
                /* userGesture */ false, /* awaitPromise*/ false)
      .then(result => void callback(result.object.value));
}

/**
 * @param passCondition
 * @param failureText
 */
export function check(passCondition: any, failureText: any): void {
  if (!passCondition) {
    addResult('FAIL: ' + failureText);
  }
}

const LongPollingMethods = new Set<string>(['CSS.takeComputedStyleUpdates']);
const pendingMessageIds = new Set<number>();
let pendingScripts: Array<() => void> = [];

function hasOutstandingNonLongPollingRequests(): boolean {
  return pendingMessageIds.size > 0;
}

function executeAfterPendingDispatches(): void {
  if (!hasOutstandingNonLongPollingRequests()) {
    const scripts = pendingScripts;
    pendingScripts = [];
    for (let id = 0; id < scripts.length; ++id) {
      scripts[id]();
    }
  }
}

/**
 * @param callback
 */
export function deprecatedRunAfterPendingDispatches(callback?: any): void {
  if (callback) {
    pendingScripts.push(callback);
  }

  setTimeout(() => {
    if (!hasOutstandingNonLongPollingRequests()) {
      executeAfterPendingDispatches();
    } else {
      deprecatedRunAfterPendingDispatches();
    }
  }, 0);
}

const prevOnMessageSent = ProtocolClient.InspectorBackend.test.onMessageSent;
ProtocolClient.InspectorBackend.test.onMessageSent =
    (message: {domain: string, method: string, params: Object, id: number, sessionId?: string}) => {
      prevOnMessageSent?.(message);
      if (!LongPollingMethods.has(message.method)) {
        pendingMessageIds.add(message.id);
      }
    };

const prevOnMessageReceived = ProtocolClient.InspectorBackend.test.onMessageReceived;
ProtocolClient.InspectorBackend.test.onMessageReceived = (message: Object) => {
  prevOnMessageReceived?.(message);
  if (typeof message === 'object' && message !== null && 'id' in message && typeof message.id === 'number') {
    pendingMessageIds.delete(message.id);
    if (pendingScripts.length && !hasOutstandingNonLongPollingRequests()) {
      deprecatedRunAfterPendingDispatches();
    }
  }
};

ProtocolClient.InspectorBackend.test.deprecatedRunAfterPendingDispatches = deprecatedRunAfterPendingDispatches;

/**
 * This ensures a base tag is set so all DOM references
 * are relative to the test file and not the inspected page
 * (i.e. http/tests/devtools/resources/inspected-page.html).
 * @param html
 * @returns
 */
export function loadHTML(html: any): Promise<any> {
  if (!html.includes('<base')) {
    // <!DOCTYPE...> tag needs to be first
    const doctypeRegex = /(<!DOCTYPE.*?>)/i;
    const baseTag = `<base href="${url()}">`;
    if (html.match(doctypeRegex)) {
      html = html.replace(doctypeRegex, '$1' + baseTag);
    } else {
      html = baseTag + html;
    }
  }
  html = html.replace(/'/g, '\\\'').replace(/\n/g, '\\n');
  return evaluateInPageAnonymously(`document.write(\`${html}\`);document.close();`);
}

/**
 * @param path
 * @returns
 */
export function addScriptTag(path: any): Promise<any> {
  return evaluateInPageAsync(`
    (function(){
      let script = document.createElement('script');
      script.src = '${path}';
      document.head.append(script);
      return new Promise(f => script.onload = f);
    })();
  `);
}

/**
 * @param path
 * @returns
 */
export function addStylesheetTag(path: any): Promise<any> {
  return evaluateInPageAsync(`
    (function(){
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '${path}';
      link.onload = onload;
      document.head.append(link);
      let resolve;
      const promise = new Promise(r => resolve = r);
      function onload() {
        // TODO(chenwilliam): It shouldn't be necessary to force
        // style recalc here but some tests rely on it.
        window.getComputedStyle(document.body).color;
        resolve();
      }
      return promise;
    })();
  `);
}

/**
 * NOTE you should manually ensure the path is correct. There
 * is no error event triggered if it is incorrect, and this is
 * in line with the standard (crbug 365457).
 * @param path
 * @param options
 * @returns
 */
export function addIframe(path: any, options = {}): Promise<any> {
  options.id = options.id || '';
  options.name = options.name || '';
  return evaluateInPageAsync(`
    (function(){
      const iframe = document.createElement('iframe');
      iframe.src = '${path}';
      iframe.id = '${options.id}';
      iframe.name = '${options.name}';
      document.body.appendChild(iframe);
      return new Promise(f => iframe.onload = f);
    })();
  `);
}

/**
 * The old test framework executed certain snippets in the inspected page
 * context as part of loading a test helper file.
 *
 * This is deprecated because:
 * 1) it makes the testing API less intuitive (need to read the various *TestRunner.js
 * files to know which helper functions are available in the inspected page).
 * 2) it complicates the test framework's module loading process.
 *
 * In most cases, this is used to set up inspected page functions (e.g. makeSimpleXHR)
 * which should become a *TestRunner method (e.g. NetworkTestRunner.makeSimpleXHR)
 * that calls evaluateInPageAnonymously(...).
 * @param code
 */
export async function deprecatedInitAsync(code: any): Promise<void> {
  await TestRunner.RuntimeAgent.invoke_evaluate({expression: code, objectGroup: 'console'});
}

/**
 * @param title
 */
export function markStep(title: any): void {
  addResult('\nRunning: ' + title);
}

export function startDumpingProtocolMessages(): void {
  ProtocolClient.InspectorBackend.test.dumpProtocol = self.testRunner.logToStderr.bind(self.testRunner);
}

/**
 * @param url
 * @param content
 * @param frame
 */
export function addScriptForFrame(url: any, content: any, frame: any): void {
  content += '\n//# sourceURL=' + url;
  const executionContext = TestRunner.runtimeModel.executionContexts().find(context => context.frameId === frame.id);
  TestRunner.RuntimeAgent.invoke_evaluate({
    expression: content,
    objectGroup: 'console',
    includeCommandLineAPI: false,
    silent: false,
    contextId: executionContext.id,
  });
}

export const formatters = {

  /**
   * @param value
   * @returns
   */
  formatAsTypeName(value: any): string {
    return '<' + typeof value + '>';
  },

  /**
   * @param value
   * @returns
   */
  formatAsTypeNameOrNull(value: any): string {
    if (value === null) {
      return 'null';
    }
    return formatters.formatAsTypeName(value);
  },

  /**
   * @param value
   * @returns
   */
  formatAsRecentTime(value: any): string |
      Date {
        if (typeof value !== 'object' || !(value instanceof Date)) {
          return formatters.formatAsTypeName(value);
        }
        const delta = Date.now() - value;
        return 0 <= delta && delta < 30 * 60 * 1000 ? '<plausible>' : value;
      },

  /**
   * @param value
   * @returns
   */
  formatAsURL(value: any): any {
    if (!value) {
      return value;
    }
    const lastIndex = value.lastIndexOf('devtools/');
    if (lastIndex < 0) {
      return value;
    }
    return '.../' + value.substr(lastIndex);
  },

  /**
   * @param value
   * @returns
   */
  formatAsDescription(value: any): any {
    if (!value) {
      return value;
    }
    return '"' + value.replace(/^function [gs]et /, 'function ') + '"';
  },
};

/**
 * @param object
 * @param customFormatters
 * @param prefix
 * @param firstLinePrefix
 */
export function addObject(object: any, customFormatters: any, prefix: any, firstLinePrefix: any): void {
  prefix = prefix || '';
  firstLinePrefix = firstLinePrefix || prefix;
  addResult(firstLinePrefix + '{');
  const propertyNames = Object.keys(object);
  propertyNames.sort();
  for (let i = 0; i < propertyNames.length; ++i) {
    const prop = propertyNames[i];
    if (!object.hasOwnProperty(prop)) {
      continue;
    }
    const prefixWithName = '    ' + prefix + prop + ' : ';
    const propValue = object[prop];
    if (customFormatters && customFormatters[prop]) {
      const formatterName = customFormatters[prop];
      if (formatterName !== 'skip') {
        const formatter = formatters[formatterName];
        addResult(prefixWithName + formatter(propValue));
      }
    } else {
      dump(propValue, customFormatters, '    ' + prefix, prefixWithName);
    }
  }
  addResult(prefix + '}');
}

/**
 * @param array
 * @param customFormatters
 * @param prefix
 * @param firstLinePrefix
 */
export function addArray(array: any, customFormatters: any, prefix: any, firstLinePrefix: any): void {
  prefix = prefix || '';
  firstLinePrefix = firstLinePrefix || prefix;
  addResult(firstLinePrefix + '[');
  for (let i = 0; i < array.length; ++i) {
    dump(array[i], customFormatters, prefix + '    ');
  }
  addResult(prefix + ']');
}

/**
 * @param node
 */
export function dumpDeepInnerHTML(node: any): void {
  /**
   * @param prefix
   * @param node
   */
  function innerHTML(prefix, node) {
    const openTag = [];
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.parentElement || node.parentElement.nodeName !== 'STYLE') {
        addResult(node.nodeValue);
      }
      return;
    }
    openTag.push('<' + node.nodeName);
    const attrs = node.attributes;
    for (let i = 0; attrs && i < attrs.length; ++i) {
      openTag.push(attrs[i].name + '=' + attrs[i].value);
    }

    openTag.push('>');
    addResult(prefix + openTag.join(' '));
    for (let child = node.firstChild; child; child = child.nextSibling) {
      innerHTML(prefix + '    ', child);
    }
    if (node.shadowRoot) {
      innerHTML(prefix + '    ', node.shadowRoot);
    }
    addResult(prefix + '</' + node.nodeName + '>');
  }
  innerHTML('', node);
}

/**
 * @param node
 * @returns
 */
export function deepTextContent(node: any): any {
  if (!node) {
    return '';
  }
  if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
    return !node.parentElement || node.parentElement.nodeName !== 'STYLE' ? node.nodeValue : '';
  }
  let res = '';
  const children = node.childNodes;
  for (let i = 0; i < children.length; ++i) {
    res += deepTextContent(children[i]);
  }
  if (node.shadowRoot) {
    res += deepTextContent(node.shadowRoot);
  }
  return res;
}

/**
 * @param value
 * @param customFormatters
 * @param prefix
 * @param prefixWithName
 */
export function dump(value: any, customFormatters: any, prefix: any, prefixWithName: any): void {
  prefixWithName = prefixWithName || prefix;
  if (prefixWithName && prefixWithName.length > 80) {
    addResult(prefixWithName + 'was skipped due to prefix length limit');
    return;
  }
  if (value === null) {
    addResult(prefixWithName + 'null');
  } else if (value && value.constructor && value.constructor.name === 'Array') {
    addArray(/** @type {!Array} */ (value), customFormatters, prefix, prefixWithName);
  } else if (typeof value === 'object') {
    addObject(/** @type {!Object} */ (value), customFormatters, prefix, prefixWithName);
  } else if (typeof value === 'string') {
    addResult(prefixWithName + '"' + value + '"');
  } else {
    addResult(prefixWithName + value);
  }
}

/**
 * @param eventName
 * @param obj
 * @param condition
 * @returns
 */
export function waitForEvent(eventName: any, obj: any, condition: any): Promise<unknown> {
  condition = condition || function() {
    return true;
  };
  return new Promise(resolve => {
    obj.addEventListener(eventName, onEventFired);

    /**
     * @param event
     */
    function onEventFired(event) {
      if (!condition(event.data)) {
        return;
      }
      obj.removeEventListener(eventName, onEventFired);
      resolve(event.data);
    }
  });
}

/**
 * @param filter
 * @returns
 */
export function waitForTarget(filter: any): Promise<unknown> {
  filter = filter || (target => true);
  for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
    if (filter(target)) {
      return Promise.resolve(target);
    }
  }
  return new Promise(fulfill => {
    const observer = /** @type {!SDK.TargetManager.Observer} */ ({
      targetAdded: function(target) {
        if (filter(target)) {
          SDK.TargetManager.TargetManager.instance().unobserveTargets(observer);
          fulfill(target);
        }
      },
      targetRemoved: function() {},
    });
    SDK.TargetManager.TargetManager.instance().observeTargets(observer);
  });
}

/**
 * @param targetToRemove
 * @returns
 */
export function waitForTargetRemoved(targetToRemove: any): Promise<unknown> {
  return new Promise(fulfill => {
    const observer = /** @type {!SDK.TargetManager.Observer} */ ({
      targetRemoved: function(target) {
        if (target === targetToRemove) {
          SDK.TargetManager.TargetManager.instance().unobserveTargets(observer);
          fulfill(target);
        }
      },
      targetAdded: function() {},
    });
    SDK.TargetManager.TargetManager.instance().observeTargets(observer);
  });
}

/**
 * @param runtimeModel
 * @returns
 */
export function waitForExecutionContext(runtimeModel: any): any {
  if (runtimeModel.executionContexts().length) {
    return Promise.resolve(runtimeModel.executionContexts()[0]);
  }
  return runtimeModel.once(SDK.RuntimeModel.Events.ExecutionContextCreated);
}

/**
 * @param context
 * @returns
 */
export function waitForExecutionContextDestroyed(context: any): Promise<unknown> {
  const runtimeModel = context.runtimeModel;
  if (runtimeModel.executionContexts().indexOf(context) === -1) {
    return Promise.resolve();
  }
  return waitForEvent(SDK.RuntimeModel.Events.ExecutionContextDestroyed, runtimeModel,
                      destroyedContext => destroyedContext === context);
}

/**
 * @param a
 * @param b
 * @param message
 */
export function assertGreaterOrEqual(a: any, b: any, message: any): void {
  if (a < b) {
    addResult('FAILED: ' + (message ? message + ': ' : '') + a + ' < ' + b);
  }
}

let _pageLoadedCallback;

/**
 * @param url
 * @param callback
 */
export function navigate(url: any, callback: any): void {
  _pageLoadedCallback = safeWrap(callback);
  TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, _pageNavigated);
  // Note: injected <base> means that url is relative to test
  // and not the inspected page
  evaluateInPageAnonymously('window.location.replace(\'' + url + '\')');
}

/**
 * @returns
 */
export function navigatePromise(url: any): Promise<unknown> {
  return new Promise(fulfill => navigate(url, fulfill));
}

export function _pageNavigated(): void {
  TestRunner.resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.Load, _pageNavigated);
  _handlePageLoaded();
}

/**
 * @param callback
 */
export function hardReloadPage(callback: any): void {
  _innerReloadPage(true, undefined, callback);
}

/**
 * @param callback
 */
export function reloadPage(callback: any): void {
  _innerReloadPage(false, undefined, callback);
}

/**
 * @param injectedScript
 * @param callback
 */
export function reloadPageWithInjectedScript(injectedScript: any, callback: any): void {
  _innerReloadPage(false, injectedScript, callback);
}

/**
 * @returns
 */
export function reloadPagePromise(): Promise<unknown> {
  return new Promise(fulfill => reloadPage(fulfill));
}

/**
 * @param hardReload
 * @param injectedScript
 * @param callback
 */
export function _innerReloadPage(hardReload: any, injectedScript: any, callback: any): void {
  _pageLoadedCallback = safeWrap(callback);
  TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, pageLoaded);
  TestRunner.resourceTreeModel.reloadPage(hardReload, injectedScript);
}

export function pageLoaded(): void {
  TestRunner.resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.Load, pageLoaded);
  addResult('Page reloaded.');
  _handlePageLoaded();
}

export async function _handlePageLoaded(): Promise<void> {
  await waitForExecutionContext(/** @type {!SDK.RuntimeModel.RuntimeModel} */ (TestRunner.runtimeModel));
  if (_pageLoadedCallback) {
    const callback = _pageLoadedCallback;
    _pageLoadedCallback = undefined;
    callback();
  }
}

/**
 * @param callback
 */
export function waitForPageLoad(callback: any): void {
  TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, onLoaded);

  function onLoaded() {
    TestRunner.resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.Load, onLoaded);
    callback();
  }
}

/**
 * @param callback
 */
export function runWhenPageLoads(callback: any): void {
  const oldCallback = _pageLoadedCallback;
  function chainedCallback() {
    if (oldCallback) {
      oldCallback();
    }
    callback();
  }
  _pageLoadedCallback = safeWrap(chainedCallback);
}

/**
 * @param testSuite
 */
export function runTestSuite(testSuite: any): void {
  const testSuiteTests = testSuite.slice();

  function runner() {
    if (!testSuiteTests.length) {
      completeTest();
      return;
    }
    const nextTest = testSuiteTests.shift();
    addResult('');
    addResult('Running: ' +
              /function\s([^(]*)/.exec(nextTest)[1]);
    safeWrap(nextTest)(runner);
  }
  runner();
}

/**
 * @param testSuite
 */
export async function runAsyncTestSuite(testSuite: any): Promise<void> {
  for (const nextTest of testSuite) {
    addResult('');
    addResult('Running: ' +
              /function\s([^(]*)/.exec(nextTest)[1]);
    await safeAsyncWrap(nextTest)();
  }

  completeTest();
}

/**
 * @param expected
 * @param found
 * @param message
 */
export function assertEquals(expected: any, found: any, message: any): void {
  if (expected === found) {
    return;
  }

  let error;
  if (message) {
    error = 'Failure (' + message + '):';
  } else {
    error = 'Failure:';
  }
  throw new Error(error + ' expected <' + expected + '> found <' + found + '>');
}

/**
 * @param found
 * @param message
 */
export function assertTrue(found: any, message: any): void {
  assertEquals(true, Boolean(found), message);
}

/**
 * @param receiver
 * @param methodName
 * @param override
 * @param opt_sticky
 * @returns
 */
export function override(receiver: any, methodName: any, override: any, opt_sticky: any): any {
  override = safeWrap(override);

  const original = receiver[methodName];
  if (typeof original !== 'function') {
    throw new Error('Cannot find method to override: ' + methodName);
  }

  receiver[methodName] = function(var_args) {
    try {
      return override.apply(this, arguments);
    } catch (e) {
      throw new Error('Exception in overriden method \'' + methodName + '\': ' + e);
    } finally {
      if (!opt_sticky) {
        receiver[methodName] = original;
      }
    }
  };

  return original;
}

/**
 * @param text
 * @returns
 */
export function clearSpecificInfoFromStackFrames(text: any): any {
  let buffer = text.replace(/\(file:\/\/\/(?:[^)]+\)|[\w\/:-]+)/g, '(...)');
  buffer = buffer.replace(/\(http:\/\/(?:[^)]+\)|[\w\/:-]+)/g, '(...)');
  buffer = buffer.replace(/\(test:\/\/(?:[^)]+\)|[\w\/:-]+)/g, '(...)');
  buffer = buffer.replace(/\(<anonymous>:[^)]+\)/g, '(...)');
  buffer = buffer.replace(/VM\d+/g, 'VM');
  return buffer.replace(/\s*at[^()]+\(native\)/g, '');
}

export function hideInspectorView(): void {
  UI.InspectorView.InspectorView.instance().element.setAttribute('style', 'display:none !important');
}

/**
 * @returns
 */
export function mainFrame(): any {
  return TestRunner.resourceTreeModel.mainFrame;
}

export class StringOutputStream {
  callback: (data: string) => void;
  buffer: string;

  /**
   * @param callback
   */
  constructor(callback: (data: string) => void) {
    this.callback = callback;
    this.buffer = '';
  }

  /**
   * @param fileName
   * @returns
   */
  async open(fileName: string): Promise<boolean> {
    return true;
  }

  /**
   * @param chunk
   */
  async write(chunk: string): Promise<void> {
    this.buffer += chunk;
  }

  async close(): Promise<void> {
    this.callback(this.buffer);
  }
}

export class MockSetting<V> {
  value: V;

  /**
   * @param value
   */
  constructor(value: V) {
    this.value = value;
  }

  /**
   * @returns
   */
  get(): V {
    return this.value;
  }

  /**
   * @param value
   */
  set(value: V): void {
    this.value = value;
  }
}

/**
 * @param urlSuffix
 * @param projectType
 * @returns
 */
export function waitForUISourceCode(urlSuffix: any, projectType: any): Promise<unknown> {
  /**
   * @param uiSourceCode
   * @returns
   */
  function matches(uiSourceCode) {
    if (projectType && uiSourceCode.project().type() !== projectType) {
      return false;
    }
    if (!projectType && uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Service) {
      return false;
    }
    if (urlSuffix && !uiSourceCode.url().endsWith(urlSuffix)) {
      return false;
    }
    return true;
  }

  for (const uiSourceCode of Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes()) {
    if (urlSuffix && matches(uiSourceCode)) {
      return Promise.resolve(uiSourceCode);
    }
  }

  return waitForEvent(Workspace.Workspace.Events.UISourceCodeAdded, Workspace.Workspace.WorkspaceImpl.instance(),
                      matches);
}

/**
 * @param callback
 */
export function waitForUISourceCodeRemoved(callback: any): void {
  Workspace.Workspace.WorkspaceImpl.instance().once(Workspace.Workspace.Events.UISourceCodeRemoved).then(callback);
}

/**
 * @param url
 * @returns
 */
export function url(url = ''): string {
  const testScriptURL = /** @type {string} */ (Root.Runtime.Runtime.queryParam('inspected_test') ||
                                               Root.Runtime.Runtime.queryParam('test'));

  // This handles relative (e.g. "../file"), root (e.g. "/resource"),
  // absolute (e.g. "http://", "data:") and empty (e.g. "") paths
  return new URL(url, testScriptURL + '/../').href;
}

/**
 * @param str
 * @param mimeType
 * @returns
 */
export function dumpSyntaxHighlight(str: any, mimeType: any): Promise<void> {
  const node = document.createElement('span');
  node.textContent = str;
  return CodeHighlighter.CodeHighlighter.highlightNode(node, mimeType).then(dumpSyntax);

  function dumpSyntax() {
    const node_parts = [];

    for (let i = 0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].getAttribute) {
        node_parts.push(node.childNodes[i].getAttribute('class'));
      } else {
        node_parts.push('*');
      }
    }

    addResult(str + ': ' + node_parts.join(', '));
  }
}

/* this code exists in Platform.StringUtilities but these layout tests
* cannot import ES modules so we copy the required code in directly as
* these layout tests are going to be removed in favour of e2e so it's
* not worth adding ESM support here
*/

/**
 *
 * @param inputString
 * @param searchString
 * @returns
 */
const findIndexesOfSubString = function(inputString, searchString) {
  const matches = [];
  let i = inputString.indexOf(searchString);
  while (i !== -1) {
    matches.push(i);
    i = inputString.indexOf(searchString, i + searchString.length);
  }
  return matches;
};

/**
 *
 * @param inputString
 * @returns
 */
export const findLineEndingIndexes = function(inputString: any): any[] {
  const endings = findIndexesOfSubString(inputString, '\n');
  endings.push(inputString.length);
  return endings;
};

/**
 * @param querySelector
 */
export async function dumpInspectedPageElementText(querySelector: any): Promise<void> {
  const value = await evaluateInPageAsync(`document.querySelector('${querySelector}').innerText`);
  addResult(value);
}

/**
 * This method blocks until all currently queued live location update handlers are done.
 *
 * Creating and updating live locations causes the update handler of each live location
 * to run. These update handlers are potentially asynchronous and usually cause re-rendering or
 * UI updates. Web tests then check for these updates.
 * To give tests more control, waitForPendingLiveLocationUpdates returns a promise that resolves
 * once all currently-pending updates (at call time) are completed.
 */
export async function waitForPendingLiveLocationUpdates(): Promise<void> {
  await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pendingLiveLocationChangesPromise();
  await Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().pendingLiveLocationChangesPromise();
  await UI.Widget.Widget.allUpdatesComplete;  // Let async Widgets finish rendering.
}

/** @type {!{logToStderr: function(), navigateSecondaryWindow: function(string), notifyDone: function()}|undefined} */
self.testRunner;

TestRunner.StringOutputStream = StringOutputStream;
TestRunner.MockSetting = MockSetting;

TestRunner.formatters = formatters;

TestRunner.completeTest = completeTest;
TestRunner.addResult = addResult;
TestRunner.addResults = addResults;
TestRunner.runTests = runTests;
TestRunner.addSniffer = addSniffer;
TestRunner.addSnifferPromise = addSnifferPromise;
TestRunner.showPanel = showPanel;
TestRunner.createKeyEvent = createKeyEvent;
TestRunner.safeWrap = safeWrap;
TestRunner.textContentWithLineBreaks = textContentWithLineBreaks;
TestRunner.textContentWithLineBreaksTrimmed = textContentWithLineBreaksTrimmed;
TestRunner.textContentWithoutStyles = textContentWithoutStyles;
TestRunner.evaluateInPagePromise = evaluateInPagePromise;
TestRunner.callFunctionInPageAsync = callFunctionInPageAsync;
TestRunner.evaluateInPageWithTimeout = evaluateInPageWithTimeout;
TestRunner.evaluateFunctionInOverlay = evaluateFunctionInOverlay;
TestRunner.check = check;
TestRunner.deprecatedRunAfterPendingDispatches = deprecatedRunAfterPendingDispatches;
TestRunner.loadHTML = loadHTML;
TestRunner.addScriptTag = addScriptTag;
TestRunner.addStylesheetTag = addStylesheetTag;
TestRunner.addIframe = addIframe;
TestRunner.markStep = markStep;
TestRunner.startDumpingProtocolMessages = startDumpingProtocolMessages;
TestRunner.addScriptForFrame = addScriptForFrame;
TestRunner.addObject = addObject;
TestRunner.addArray = addArray;
TestRunner.dumpDeepInnerHTML = dumpDeepInnerHTML;
TestRunner.deepTextContent = deepTextContent;
TestRunner.dump = dump;
TestRunner.waitForEvent = waitForEvent;
TestRunner.waitForTarget = waitForTarget;
TestRunner.waitForTargetRemoved = waitForTargetRemoved;
TestRunner.waitForExecutionContext = waitForExecutionContext;
TestRunner.waitForExecutionContextDestroyed = waitForExecutionContextDestroyed;
TestRunner.assertGreaterOrEqual = assertGreaterOrEqual;
TestRunner.navigate = navigate;
TestRunner.navigatePromise = navigatePromise;
TestRunner.hardReloadPage = hardReloadPage;
TestRunner.reloadPage = reloadPage;
TestRunner.reloadPageWithInjectedScript = reloadPageWithInjectedScript;
TestRunner.reloadPagePromise = reloadPagePromise;
TestRunner.pageLoaded = pageLoaded;
TestRunner.waitForPageLoad = waitForPageLoad;
TestRunner.runWhenPageLoads = runWhenPageLoads;
TestRunner.runTestSuite = runTestSuite;
TestRunner.assertEquals = assertEquals;
TestRunner.assertTrue = assertTrue;
TestRunner.override = override;
TestRunner.clearSpecificInfoFromStackFrames = clearSpecificInfoFromStackFrames;
TestRunner.hideInspectorView = hideInspectorView;
TestRunner.mainFrame = mainFrame;
TestRunner.waitForUISourceCode = waitForUISourceCode;
TestRunner.waitForUISourceCodeRemoved = waitForUISourceCodeRemoved;
TestRunner.url = url;
TestRunner.dumpSyntaxHighlight = dumpSyntaxHighlight;
TestRunner.evaluateInPageRemoteObject = evaluateInPageRemoteObject;
TestRunner.evaluateInPage = evaluateInPage;
TestRunner.evaluateInPageAnonymously = evaluateInPageAnonymously;
TestRunner.evaluateInPageAsync = evaluateInPageAsync;
TestRunner.deprecatedInitAsync = deprecatedInitAsync;
TestRunner.runAsyncTestSuite = runAsyncTestSuite;
TestRunner.dumpInspectedPageElementText = dumpInspectedPageElementText;
TestRunner.waitForPendingLiveLocationUpdates = waitForPendingLiveLocationUpdates;
TestRunner.findLineEndingIndexes = findLineEndingIndexes;
TestRunner.selectTextInTextNode = selectTextInTextNode;

TestRunner.isScrolledToBottom = UI.UIUtils.isScrolledToBottom;
