// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as BrowserDebugger from '../../panels/browser_debugger/browser_debugger.js';
import * as Sources from '../../panels/sources/sources.js';
import * as UI from '../../ui/legacy/legacy.js';
import {TestRunner} from '../test_runner/test_runner.js';

let quiet;

export const startDebuggerTest = async function(callback, q) {
  console.assert(TestRunner.debuggerModel.debuggerEnabled(), 'Debugger has to be enabled');

  if (q !== undefined) {
    quiet = q;
  }

  await TestRunner.showPanel('sources');
  TestRunner.addSniffer(SDK.DebuggerModel.DebuggerModel.prototype, 'pausedScript', pausedScript, true);
  TestRunner.addSniffer(SDK.DebuggerModel.DebuggerModel.prototype, 'resumedScript', resumedScript, true);
  TestRunner.safeWrap(callback)();
};

export const startDebuggerTestPromise = function(quiet) {
  let cb;
  const p = new Promise(fullfill => {
    cb = fullfill;
  });
  startDebuggerTest(cb, quiet);
  return p;
};

export const completeDebuggerTest = function() {
  Common.Settings.moduleSetting('breakpoints-active').set(true);
  resumeExecution(TestRunner.completeTest.bind(TestRunner));
};

window.addEventListener('unhandledrejection', e => {
  TestRunner.addResult('FAIL: Uncaught exception in promise: ' + e + ' ' + e.stack);
  completeDebuggerTest();
});

export const runDebuggerTestSuite = function(testSuite) {
  const testSuiteTests = testSuite.slice();

  function runner() {
    if (!testSuiteTests.length) {
      completeDebuggerTest();
      return;
    }

    const nextTest = testSuiteTests.shift();
    TestRunner.addResult('');
    TestRunner.addResult(
        'Running: ' +
        /function\s([^(]*)/.exec(nextTest)[1]);
    TestRunner.safeWrap(nextTest)(runner, runner);
  }

  startDebuggerTest(runner);
};

export const runTestFunction = function() {
  TestRunner.evaluateInPageAnonymously('scheduleTestFunction()');
  TestRunner.addResult('Set timer for test function.');
};

export const runTestFunctionAndWaitUntilPaused = function(callback) {
  runTestFunction();
  waitUntilPaused(callback);
};

export const runTestFunctionAndWaitUntilPausedPromise = function() {
  return new Promise(runTestFunctionAndWaitUntilPaused);
};

export const runAsyncCallStacksTest = function(totalDebuggerStatements, maxAsyncCallStackDepth) {
  const defaultMaxAsyncCallStackDepth = 32;
  setQuiet(true);
  startDebuggerTest(step1);

  async function step1() {
    await TestRunner.DebuggerAgent.setAsyncCallStackDepth(maxAsyncCallStackDepth || defaultMaxAsyncCallStackDepth);
    runTestFunctionAndWaitUntilPaused(didPause);
  }

  let step = 0;
  const callStacksOutput = [];

  async function didPause(callFrames, reason, breakpointIds, asyncStackTrace) {
    ++step;
    callStacksOutput.push(await captureStackTraceIntoString(callFrames, asyncStackTrace) + '\n');

    if (step < totalDebuggerStatements) {
      resumeExecution(waitUntilPaused.bind(undefined, didPause));
    } else {
      TestRunner.addResult('Captured call stacks in no particular order:');
      callStacksOutput.sort();
      TestRunner.addResults(callStacksOutput);
      completeDebuggerTest();
    }
  }
};

let waitUntilPausedCallback;
let waitUntilResumedCallback;
let pausedScriptArguments;

export const waitUntilPausedNextTime = function(callback) {
  waitUntilPausedCallback = TestRunner.safeWrap(callback);
};

export const waitUntilPaused = function(callback) {
  callback = TestRunner.safeWrap(callback);

  if (pausedScriptArguments) {
    callback.apply(callback, pausedScriptArguments);
  } else {
    waitUntilPausedCallback = callback;
  }
};

export const waitUntilPausedPromise = function() {
  return new Promise(resolve => waitUntilPaused(resolve));
};

export const waitUntilResumed = function(callback) {
  callback = TestRunner.safeWrap(callback);

  if (!pausedScriptArguments) {
    callback();
  } else {
    waitUntilResumedCallback = callback;
  }
};

export const waitUntilResumedPromise = function() {
  return new Promise(resolve => waitUntilResumed(resolve));
};

export const resumeExecution = function(callback) {
  if (Sources.SourcesPanel.SourcesPanel.instance().paused()) {
    Sources.SourcesPanel.SourcesPanel.instance().togglePause();
  }

  waitUntilResumed(callback);
};

export const waitUntilPausedAndDumpStackAndResume = function(callback, options) {
  waitUntilPaused(paused);
  TestRunner.addSniffer(
      Sources.SourcesPanel.SourcesPanel.prototype, 'updateDebuggerButtonsAndStatusForTest', setStatus);
  let caption;
  let callFrames;
  let asyncStackTrace;

  function setStatus() {
    const statusElement = this.element.querySelector('.paused-message');
    caption = statusElement.deepTextContent();

    if (callFrames) {
      step1();
    }
  }

  async function paused(frames, reason, breakpointIds, async) {
    callFrames = frames;
    asyncStackTrace = async;

    if (typeof caption === 'string') {
      await step1();
    }
  }

  async function step1() {
    await captureStackTrace(callFrames, asyncStackTrace, options);
    TestRunner.addResult(TestRunner.clearSpecificInfoFromStackFrames(caption));
    TestRunner.deprecatedRunAfterPendingDispatches(step2);
  }

  function step2() {
    resumeExecution(TestRunner.safeWrap(callback));
  }
};

export const stepOver = function() {
  queueMicrotask(function() {
    Sources.SourcesPanel.SourcesPanel.instance().stepOver();
  });
};

export const stepInto = function() {
  queueMicrotask(function() {
    Sources.SourcesPanel.SourcesPanel.instance().stepInto();
  });
};

export const stepIntoAsync = function() {
  queueMicrotask(function() {
    Sources.SourcesPanel.SourcesPanel.instance().stepIntoAsync();
  });
};

export const stepOut = function() {
  queueMicrotask(function() {
    Sources.SourcesPanel.SourcesPanel.instance().stepOut();
  });
};

export const togglePause = function() {
  queueMicrotask(function() {
    Sources.SourcesPanel.SourcesPanel.instance().togglePause();
  });
};

export const waitUntilPausedAndPerformSteppingActions = function(actions, callback) {
  callback = TestRunner.safeWrap(callback);
  waitUntilPaused(didPause);

  async function didPause(callFrames, reason, breakpointIds, asyncStackTrace) {
    let action = actions.shift();

    if (action === 'Print') {
      await captureStackTrace(callFrames, asyncStackTrace);
      TestRunner.addResult('');

      while (action === 'Print') {
        action = actions.shift();
      }
    }

    if (!action) {
      callback();
      return;
    }

    TestRunner.addResult('Executing ' + action + '...');

    switch (action) {
      case 'StepInto':
        stepInto();
        break;
      case 'StepOver':
        stepOver();
        break;
      case 'StepOut':
        stepOut();
        break;
      case 'Resume':
        togglePause();
        break;
      default:
        TestRunner.addResult('FAIL: Unknown action: ' + action);
        callback();
        return;
    }

    waitUntilResumed((actions.length ? waitUntilPaused.bind(undefined, didPause) : callback));
  }
};

export const captureStackTrace = async function(callFrames, asyncStackTrace, options) {
  TestRunner.addResult(await captureStackTraceIntoString(callFrames, asyncStackTrace, options));
};

export const captureStackTraceIntoString = async function(callFrames, asyncStackTrace, options) {
  const results = [];
  options = options || {};

  async function printCallFrames(callFrames, locationFunction, returnValueFunction) {
    let printed = 0;

    for (let i = 0; i < callFrames.length; i++) {
      const frame = callFrames[i];
      const location = locationFunction.call(frame);
      const script = location.script();
      const uiLocation =
          await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
      const isFramework = uiLocation ?
          Bindings.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(uiLocation.uiSourceCode.url()) :
          false;

      if (options.dropFrameworkCallFrames && isFramework) {
        continue;
      }

      let url;
      let lineNumber;

      if (uiLocation && uiLocation.uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Debugger) {
        url = uiLocation.uiSourceCode.name();
        lineNumber = uiLocation.lineNumber + 1;
      } else {
        url = Bindings.ResourceUtils.displayNameForURL(script.sourceURL);
        lineNumber = location.lineNumber + 1;
      }

      let s = ((isFramework ? '  * ' : '    ')) + printed++ + ') ' + frame.functionName + ' (' + url +
          ((options.dropLineNumbers ? '' : ':' + lineNumber)) + ')';
      s = s.replace(/scheduleTestFunction.+$/, 'scheduleTestFunction <omitted>');
      results.push(s);

      if (options.printReturnValue && returnValueFunction && returnValueFunction.call(frame)) {
        results.push('       <return>: ' + returnValueFunction.call(frame).description);
      }

      if (frame.functionName === 'scheduleTestFunction') {
        const remainingFrames = callFrames.length - 1 - i;

        if (remainingFrames) {
          results.push('    <... skipped remaining frames ...>');
        }

        break;
      }
    }

    return printed;
  }

  function runtimeCallFramePosition() {
    return new SDK.DebuggerModel.Location(TestRunner.debuggerModel, this.scriptId, this.lineNumber, this.columnNumber);
  }

  results.push('Call stack:');
  await printCallFrames(
      callFrames, SDK.DebuggerModel.CallFrame.prototype.location, SDK.DebuggerModel.CallFrame.prototype.returnValue);

  while (asyncStackTrace) {
    results.push('    [' + (asyncStackTrace.description || 'Async Call') + ']');
    const printed = await printCallFrames(asyncStackTrace.callFrames, runtimeCallFramePosition);

    if (!printed) {
      results.pop();
    }

    asyncStackTrace = asyncStackTrace.parent;
  }

  return results.join('\n');
};

export const dumpSourceFrameContents = function(sourceFrame) {
  TestRunner.addResult('==Source frame contents start==');
  const {baseDoc} = sourceFrame;

  for (let i = 1; i <= baseDoc.lines; ++i) {
    const {text} = baseDoc.line(i);
    TestRunner.addResult(text);
  }

  TestRunner.addResult('==Source frame contents end==');
};

export const pausedScript = function(callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
  if (!quiet) {
    TestRunner.addResult('Script execution paused.');
  }

  const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
  pausedScriptArguments = [
    SDK.DebuggerModel.CallFrame.fromPayloadArray(debuggerModel, callFrames), reason, breakpointIds, asyncStackTrace,
    auxData
  ];

  if (waitUntilPausedCallback) {
    const callback = waitUntilPausedCallback;
    waitUntilPausedCallback = null;
    setTimeout(() => callback.apply(callback, pausedScriptArguments));
  }
};

export const resumedScript = function() {
  if (!quiet) {
    TestRunner.addResult('Script execution resumed.');
  }

  pausedScriptArguments = null;

  if (waitUntilResumedCallback) {
    const callback = waitUntilResumedCallback;
    waitUntilResumedCallback = null;
    callback();
  }
};

export const showUISourceCode = function(uiSourceCode, callback) {
  const panel = Sources.SourcesPanel.SourcesPanel.instance();
  panel.showUISourceCode(uiSourceCode);
  const sourceFrame = panel.visibleView;

  if (sourceFrame.loaded) {
    callback(sourceFrame);
  } else {
    TestRunner.addSniffer(sourceFrame, 'setContent', callback && callback.bind(null, sourceFrame));
  }
};

export const showUISourceCodePromise = function(uiSourceCode) {
  let fulfill;
  const promise = new Promise(x => {
    fulfill = x;
  });
  showUISourceCode(uiSourceCode, fulfill);
  return promise;
};

export const showScriptSource = function(scriptName, callback) {
  waitForScriptSource(scriptName, onScriptSource);

  function onScriptSource(uiSourceCode) {
    showUISourceCode(uiSourceCode, callback);
  }
};

export const showScriptSourcePromise = function(scriptName) {
  return new Promise(resolve => showScriptSource(scriptName, resolve));
};

export const waitForScriptSource = function(scriptName, callback, contentType) {
  const panel = Sources.SourcesPanel.SourcesPanel.instance();
  const uiSourceCodes = panel.workspace.uiSourceCodes();

  for (let i = 0; i < uiSourceCodes.length; ++i) {
    if (uiSourceCodes[i].project().type() === Workspace.Workspace.projectTypes.Service) {
      continue;
    }

    if (uiSourceCodes[i].name() === scriptName &&
        (uiSourceCodes[i].contentType() === contentType || contentType === undefined)) {
      callback(uiSourceCodes[i]);
      return;
    }
  }

  TestRunner.addSniffer(
      Sources.SourcesView.SourcesView.prototype, 'addUISourceCode',
      waitForScriptSource.bind(undefined, scriptName, callback, contentType));
};

export const setBreakpoint = async function(sourceFrame, lineNumber, condition, enabled) {
  const plugin = debuggerPlugin(sourceFrame);
  if (!plugin.muted) {
    const bp = await plugin.setBreakpoint(lineNumber, 0, condition, enabled);
    await bp.refreshInDebugger();  // Make sure the breakpoint is really set
  }
};

export const removeBreakpoint = function(sourceFrame, lineNumber) {
  const plugin = debuggerPlugin(sourceFrame);
  const breakpointLocations = plugin.breakpointManager.allBreakpointLocations();
  const breakpointLocation = breakpointLocations.find(
      breakpointLocation => breakpointLocation.uiLocation.uiSourceCode === sourceFrame.uiSourceCode() &&
          breakpointLocation.uiLocation.lineNumber === lineNumber);
  breakpointLocation.breakpoint.remove();
};

export const createNewBreakpoint = async function(sourceFrame, lineNumber, condition, enabled) {
  const plugin = debuggerPlugin(sourceFrame);
  const promise = new Promise(resolve => TestRunner.addSniffer(plugin.__proto__, 'breakpointWasSetForTest', resolve));
  await plugin.createNewBreakpoint(lineNumber, condition, enabled);
  return promise;
};

export const toggleBreakpoint = async function(sourceFrame, lineNumber, disableOnly) {
  const plugin = debuggerPlugin(sourceFrame);
  if (!plugin.muted) {
    await plugin.toggleBreakpoint(lineNumber, disableOnly);
  }
};

export const dumpScopeVariablesSidebarPane = function() {
  TestRunner.addResult('Scope variables sidebar pane:');
  const sections = scopeChainSections();

  dumpSectionsWithIndent(sections, 0);
};

export const dumpSectionsWithIndent = function(treeElements, depth) {
  if (!treeElements || treeElements.length === 0) {
    return;
  }

  for (const treeElement of treeElements) {
    const textContent = TestRunner.textContentWithLineBreaks(treeElement.listItemElement);
    const text = TestRunner.clearSpecificInfoFromStackFrames(textContent);
    if (text.length > 0) {
      TestRunner.addResult('    '.repeat(depth) + text);
    }
    if (!treeElement.expanded && depth === 0) {
      TestRunner.addResult('    <section collapsed>');
    }
    dumpSectionsWithIndent(treeElement.children(), depth + 1);
  }
};

export const scopeChainSections = function() {
  return Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance().treeOutline.rootElement().children();
};

export const expandScopeVariablesSidebarPane = function(callback) {
  const sections = scopeChainSections();

  for (let i = 0; i < sections.length - 1; ++i) {
    sections[i].expand();
  }

  setTimeout(() => {
    TestRunner.deprecatedRunAfterPendingDispatches(callback);
  }, 1000);
};

export const expandProperties = function(properties, callback) {
  let index = 0;

  function expandNextPath() {
    if (index === properties.length) {
      TestRunner.safeWrap(callback)();
      return;
    }

    const parentTreeElement = properties[index++];
    const path = properties[index++];
    expandProperty(parentTreeElement, path, 0, expandNextPath);
  }

  TestRunner.deprecatedRunAfterPendingDispatches(expandNextPath);
};

export const expandProperty = function(parentTreeElement, path, pathIndex, callback) {
  if (pathIndex === path.length) {
    TestRunner.addResult('Expanded property: ' + path.join('.'));
    callback();
    return;
  }

  const name = path[pathIndex++];
  const propertyTreeElement = findChildPropertyTreeElement(parentTreeElement, name);

  if (!propertyTreeElement) {
    TestRunner.addResult('Failed to expand property: ' + path.slice(0, pathIndex).join('.'));
    completeDebuggerTest();
    return;
  }

  propertyTreeElement.expand();
  TestRunner.deprecatedRunAfterPendingDispatches(
      expandProperty.bind(undefined, propertyTreeElement, path, pathIndex, callback));
};

export const findChildPropertyTreeElement = function(parent, childName) {
  const children = parent.children();

  for (let i = 0; i < children.length; i++) {
    const treeElement = children[i];
    const property = treeElement.property;

    if (property.name === childName) {
      return treeElement;
    }
  }
};

export const setQuiet = function(q) {
  quiet = q;
};

export const queryScripts = function(filter) {
  const scripts = TestRunner.debuggerModel.scripts();
  return (filter ? scripts.filter(filter) : scripts);
};

export const checkRawLocation = function(script, lineNumber, columnNumber, location) {
  TestRunner.assertEquals(script.scriptId, location.scriptId, 'Incorrect scriptId');
  TestRunner.assertEquals(lineNumber, location.lineNumber, 'Incorrect lineNumber');
  TestRunner.assertEquals(columnNumber, location.columnNumber, 'Incorrect columnNumber');
};

export const checkUILocation = function(uiSourceCode, lineNumber, columnNumber, location) {
  TestRunner.assertEquals(
      uiSourceCode, location.uiSourceCode,
      'Incorrect uiSourceCode, expected \'' + ((uiSourceCode ? uiSourceCode.url() : null)) + '\',' +
          ' but got \'' + ((location.uiSourceCode ? location.uiSourceCode.url() : null)) + '\'');

  TestRunner.assertEquals(
      lineNumber, location.lineNumber,
      'Incorrect lineNumber, expected \'' + lineNumber + '\', but got \'' + location.lineNumber + '\'');

  TestRunner.assertEquals(
      columnNumber, location.columnNumber,
      'Incorrect columnNumber, expected \'' + columnNumber + '\', but got \'' + location.columnNumber + '\'');
};

export const waitForExecutionContextInTarget = function(target, callback) {
  const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);

  if (runtimeModel.executionContexts().length) {
    callback(runtimeModel.executionContexts()[0]);
    return;
  }

  runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, contextCreated);

  function contextCreated() {
    runtimeModel.removeEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, contextCreated);
    callback(runtimeModel.executionContexts()[0]);
  }
};

export const selectThread = function(target) {
  UI.Context.Context.instance().setFlavor(SDK.Target.Target, target);
};

export const evaluateOnCurrentCallFrame = function(code) {
  return TestRunner.debuggerModel.evaluateOnSelectedCallFrame({expression: code, objectGroup: 'console'});
};

export const debuggerPlugin = function(sourceFrame) {
  return sourceFrame.plugins.find(plugin => plugin instanceof Sources.DebuggerPlugin.DebuggerPlugin);
};

export const setEventListenerBreakpoint = function(id, enabled, targetName) {
  const pane = BrowserDebugger.EventListenerBreakpointsSidebarPane.EventListenerBreakpointsSidebarPane.instance();

  const auxData = {'eventName': id};

  if (targetName) {
    auxData.targetName = targetName;
  }

  let breakpoint = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().resolveEventListenerBreakpoint(auxData);
  if (!breakpoint) {
    breakpoint = SDK.EventBreakpointsModel.EventBreakpointsManager.instance().resolveEventListenerBreakpoint(auxData);
  }

  if (breakpoint.enabled() !== enabled) {
    pane.breakpoints.get(breakpoint).checkbox.checked = enabled;
    pane.breakpointCheckboxClicked(breakpoint);
  }
};

TestRunner.deprecatedInitAsync(`
  function scheduleTestFunction() {
    setTimeout(testFunction, 0);
  }
`);
