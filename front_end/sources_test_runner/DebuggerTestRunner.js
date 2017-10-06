// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

SourcesTestRunner.startDebuggerTest = function(callback, quiet) {
  console.assert(TestRunner.debuggerModel.debuggerEnabled(), 'Debugger has to be enabled');

  if (quiet !== undefined)
    SourcesTestRunner._quiet = quiet;

  UI.viewManager.showView('sources');
  TestRunner.addSniffer(SDK.DebuggerModel.prototype, '_pausedScript', SourcesTestRunner._pausedScript, true);
  TestRunner.addSniffer(SDK.DebuggerModel.prototype, '_resumedScript', SourcesTestRunner._resumedScript, true);
  TestRunner.safeWrap(callback)();
};

SourcesTestRunner.startDebuggerTestPromise = function(quiet) {
  var cb;
  var p = new Promise(fullfill => cb = fullfill);
  SourcesTestRunner.startDebuggerTest(cb, quiet);
  return p;
};

SourcesTestRunner.completeDebuggerTest = function() {
  Bindings.breakpointManager.setBreakpointsActive(true);
  SourcesTestRunner.resumeExecution(TestRunner.completeTest.bind(TestRunner));
};

(function() {
var origThen = Promise.prototype.then;
var origCatch = Promise.prototype.catch;

Promise.prototype.then = function() {
  var result = origThen.apply(this, arguments);
  origThen.call(result, undefined, onUncaughtPromiseReject.bind(null, new Error().stack));
  return result;
};

Promise.prototype.catch = function() {
  var result = origCatch.apply(this, arguments);
  origThen.call(result, undefined, onUncaughtPromiseReject.bind(null, new Error().stack));
  return result;
};

function onUncaughtPromiseReject(stack, e) {
  var message = typeof e === 'object' && e.stack || e;
  TestRunner.addResult('FAIL: Uncaught exception in promise: ' + message + ' ' + stack);
  SourcesTestRunner.completeDebuggerTest();
}
})();

SourcesTestRunner.runDebuggerTestSuite = function(testSuite) {
  var testSuiteTests = testSuite.slice();

  function runner() {
    if (!testSuiteTests.length) {
      SourcesTestRunner.completeDebuggerTest();
      return;
    }

    var nextTest = testSuiteTests.shift();
    TestRunner.addResult('');
    TestRunner.addResult(
        'Running: ' +
        /function\s([^(]*)/.exec(nextTest)[1]);
    TestRunner.safeWrap(nextTest)(runner, runner);
  }

  SourcesTestRunner.startDebuggerTest(runner);
};

SourcesTestRunner.runTestFunction = function() {
  TestRunner.evaluateInPageAnonymously('scheduleTestFunction()');
  TestRunner.addResult('Set timer for test function.');
};

SourcesTestRunner.runTestFunctionAndWaitUntilPaused = function(callback) {
  SourcesTestRunner.runTestFunction();
  SourcesTestRunner.waitUntilPaused(callback);
};

SourcesTestRunner.runTestFunctionAndWaitUntilPausedPromise = function() {
  return new Promise(SourcesTestRunner.runTestFunctionAndWaitUntilPaused);
};

SourcesTestRunner.runAsyncCallStacksTest = function(totalDebuggerStatements, maxAsyncCallStackDepth) {
  var defaultMaxAsyncCallStackDepth = 32;
  SourcesTestRunner.setQuiet(true);
  SourcesTestRunner.startDebuggerTest(step1);

  async function step1() {
    await TestRunner.DebuggerAgent.setAsyncCallStackDepth(maxAsyncCallStackDepth || defaultMaxAsyncCallStackDepth);
    SourcesTestRunner.runTestFunctionAndWaitUntilPaused(didPause);
  }

  var step = 0;
  var callStacksOutput = [];

  function didPause(callFrames, reason, breakpointIds, asyncStackTrace) {
    ++step;
    callStacksOutput.push(SourcesTestRunner.captureStackTraceIntoString(callFrames, asyncStackTrace) + '\n');

    if (step < totalDebuggerStatements) {
      SourcesTestRunner.resumeExecution(SourcesTestRunner.waitUntilPaused.bind(SourcesTestRunner, didPause));
    } else {
      TestRunner.addResult('Captured call stacks in no particular order:');
      callStacksOutput.sort();
      TestRunner.addResults(callStacksOutput);
      SourcesTestRunner.completeDebuggerTest();
    }
  }
};

SourcesTestRunner.dumpSourceFrameMessages = function(sourceFrame, dumpFullURL) {
  var messages = [];

  for (var bucket of sourceFrame._rowMessageBuckets.values()) {
    for (var rowMessage of bucket._messages) {
      var message = rowMessage.message();
      messages.push(String.sprintf(
          '  %d:%d [%s] %s', message.lineNumber(), message.columnNumber(), message.level(), message.text()));
    }
  }

  var name = (dumpFullURL ? sourceFrame.uiSourceCode().url() : sourceFrame.uiSourceCode().displayName());
  TestRunner.addResult('SourceFrame ' + name + ': ' + messages.length + ' message(s)');
  TestRunner.addResult(messages.join('\n'));
};

SourcesTestRunner.waitUntilPausedNextTime = function(callback) {
  SourcesTestRunner._waitUntilPausedCallback = TestRunner.safeWrap(callback);
};

SourcesTestRunner.waitUntilPaused = function(callback) {
  callback = TestRunner.safeWrap(callback);

  if (SourcesTestRunner._pausedScriptArguments)
    callback.apply(callback, SourcesTestRunner._pausedScriptArguments);
  else
    SourcesTestRunner._waitUntilPausedCallback = callback;
};

SourcesTestRunner.waitUntilPausedPromise = function() {
  return new Promise(resolve => SourcesTestRunner.waitUntilPaused(resolve));
};

SourcesTestRunner.waitUntilResumedNextTime = function(callback) {
  SourcesTestRunner._waitUntilResumedCallback = TestRunner.safeWrap(callback);
};

SourcesTestRunner.waitUntilResumed = function(callback) {
  callback = TestRunner.safeWrap(callback);

  if (!SourcesTestRunner._pausedScriptArguments)
    callback();
  else
    SourcesTestRunner._waitUntilResumedCallback = callback;
};

SourcesTestRunner.resumeExecution = function(callback) {
  if (UI.panels.sources.paused())
    UI.panels.sources._togglePause();

  SourcesTestRunner.waitUntilResumed(callback);
};

SourcesTestRunner.waitUntilPausedAndDumpStackAndResume = function(callback, options) {
  SourcesTestRunner.waitUntilPaused(paused);
  TestRunner.addSniffer(Sources.SourcesPanel.prototype, '_updateDebuggerButtonsAndStatus', setStatus);
  var caption;
  var callFrames;
  var asyncStackTrace;

  function setStatus() {
    var statusElement = this.element.querySelector('.paused-message');
    caption = statusElement.deepTextContent();

    if (callFrames)
      step1();
  }

  function paused(frames, reason, breakpointIds, async) {
    callFrames = frames;
    asyncStackTrace = async;

    if (typeof caption === 'string')
      step1();
  }

  function step1() {
    SourcesTestRunner.captureStackTrace(callFrames, asyncStackTrace, options);
    TestRunner.addResult(TestRunner.clearSpecificInfoFromStackFrames(caption));
    TestRunner.deprecatedRunAfterPendingDispatches(step2);
  }

  function step2() {
    SourcesTestRunner.resumeExecution(TestRunner.safeWrap(callback));
  }
};

SourcesTestRunner.stepOver = function() {
  Promise.resolve().then(function() {
    UI.panels.sources._stepOver();
  });
};

SourcesTestRunner.stepInto = function() {
  Promise.resolve().then(function() {
    UI.panels.sources._stepInto();
  });
};

SourcesTestRunner.stepOut = function() {
  Promise.resolve().then(function() {
    UI.panels.sources._stepOut();
  });
};

SourcesTestRunner.togglePause = function() {
  Promise.resolve().then(function() {
    UI.panels.sources._togglePause();
  });
};

SourcesTestRunner.waitUntilPausedAndPerformSteppingActions = function(actions, callback) {
  callback = TestRunner.safeWrap(callback);
  SourcesTestRunner.waitUntilPaused(didPause);

  function didPause(callFrames, reason, breakpointIds, asyncStackTrace) {
    var action = actions.shift();

    if (action === 'Print') {
      SourcesTestRunner.captureStackTrace(callFrames, asyncStackTrace);
      TestRunner.addResult('');

      while (action === 'Print')
        action = actions.shift();
    }

    if (!action) {
      callback();
      return;
    }

    TestRunner.addResult('Executing ' + action + '...');

    switch (action) {
      case 'StepInto':
        SourcesTestRunner.stepInto();
        break;
      case 'StepOver':
        SourcesTestRunner.stepOver();
        break;
      case 'StepOut':
        SourcesTestRunner.stepOut();
        break;
      case 'Resume':
        SourcesTestRunner.togglePause();
        break;
      default:
        TestRunner.addResult('FAIL: Unknown action: ' + action);
        callback();
        return;
    }

    SourcesTestRunner.waitUntilResumed(
        (actions.length ? SourcesTestRunner.waitUntilPaused.bind(SourcesTestRunner, didPause) : callback));
  }
};

SourcesTestRunner.captureStackTrace = function(callFrames, asyncStackTrace, options) {
  TestRunner.addResult(SourcesTestRunner.captureStackTraceIntoString(callFrames, asyncStackTrace, options));
};

SourcesTestRunner.captureStackTraceIntoString = function(callFrames, asyncStackTrace, options) {
  var results = [];
  options = options || {};

  function printCallFrames(callFrames, locationFunction, returnValueFunction) {
    var printed = 0;

    for (var i = 0; i < callFrames.length; i++) {
      var frame = callFrames[i];
      var location = locationFunction.call(frame);
      var script = location.script();
      var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);
      var isFramework = Bindings.blackboxManager.isBlackboxedRawLocation(location);

      if (options.dropFrameworkCallFrames && isFramework)
        continue;

      var url;
      var lineNumber;

      if (uiLocation && uiLocation.uiSourceCode.project().type() !== Workspace.projectTypes.Debugger) {
        url = uiLocation.uiSourceCode.name();
        lineNumber = uiLocation.lineNumber + 1;
      } else {
        url = Bindings.displayNameForURL(script.sourceURL);
        lineNumber = location.lineNumber + 1;
      }

      var s = ((isFramework ? '  * ' : '    ')) + printed++ + ') ' + frame.functionName + ' (' + url +
          ((options.dropLineNumbers ? '' : ':' + lineNumber)) + ')';
      s = s.replace(/scheduleTestFunction.+$/, 'scheduleTestFunction <omitted>');
      results.push(s);

      if (options.printReturnValue && returnValueFunction && returnValueFunction.call(frame))
        results.push('       <return>: ' + returnValueFunction.call(frame).description);

      if (frame.functionName === 'scheduleTestFunction') {
        var remainingFrames = callFrames.length - 1 - i;

        if (remainingFrames)
          results.push('    <... skipped remaining frames ...>');

        break;
      }
    }

    return printed;
  }

  function runtimeCallFramePosition() {
    return new SDK.DebuggerModel.Location(debuggerModel, this.scriptId, this.lineNumber, this.columnNumber);
  }

  results.push('Call stack:');
  printCallFrames(
      callFrames, SDK.DebuggerModel.CallFrame.prototype.location, SDK.DebuggerModel.CallFrame.prototype.returnValue);

  while (asyncStackTrace) {
    results.push('    [' + (asyncStackTrace.description || 'Async Call') + ']');
    var debuggerModel = TestRunner.debuggerModel;
    var printed = printCallFrames(asyncStackTrace.callFrames, runtimeCallFramePosition);

    if (!printed)
      results.pop();

    asyncStackTrace = asyncStackTrace.parent;
  }

  return results.join('\n');
};

SourcesTestRunner.dumpSourceFrameContents = function(sourceFrame) {
  TestRunner.addResult('==Source frame contents start==');
  var textEditor = sourceFrame._textEditor;

  for (var i = 0; i < textEditor.linesCount; ++i)
    TestRunner.addResult(textEditor.line(i));

  TestRunner.addResult('==Source frame contents end==');
};

SourcesTestRunner._pausedScript = function(callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
  if (!SourcesTestRunner._quiet)
    TestRunner.addResult('Script execution paused.');

  var debuggerModel = this.target().model(SDK.DebuggerModel);
  SourcesTestRunner._pausedScriptArguments = [
    SDK.DebuggerModel.CallFrame.fromPayloadArray(debuggerModel, callFrames), reason, breakpointIds, asyncStackTrace,
    auxData
  ];

  if (SourcesTestRunner._waitUntilPausedCallback) {
    var callback = SourcesTestRunner._waitUntilPausedCallback;
    delete SourcesTestRunner._waitUntilPausedCallback;
    setTimeout(() => callback.apply(callback, SourcesTestRunner._pausedScriptArguments));
  }
};

SourcesTestRunner._resumedScript = function() {
  if (!SourcesTestRunner._quiet)
    TestRunner.addResult('Script execution resumed.');

  delete SourcesTestRunner._pausedScriptArguments;

  if (SourcesTestRunner._waitUntilResumedCallback) {
    var callback = SourcesTestRunner._waitUntilResumedCallback;
    delete SourcesTestRunner._waitUntilResumedCallback;
    callback();
  }
};

SourcesTestRunner.showUISourceCode = function(uiSourceCode, callback) {
  var panel = UI.panels.sources;
  panel.showUISourceCode(uiSourceCode);
  var sourceFrame = panel.visibleView;

  if (sourceFrame.loaded)
    callback(sourceFrame);
  else
    TestRunner.addSniffer(sourceFrame, 'onTextEditorContentSet', callback && callback.bind(null, sourceFrame));
};

SourcesTestRunner.showUISourceCodePromise = function(uiSourceCode) {
  var fulfill;
  var promise = new Promise(x => fulfill = x);
  SourcesTestRunner.showUISourceCode(uiSourceCode, fulfill);
  return promise;
};

SourcesTestRunner.showScriptSource = function(scriptName, callback) {
  SourcesTestRunner.waitForScriptSource(scriptName, onScriptSource);

  function onScriptSource(uiSourceCode) {
    SourcesTestRunner.showUISourceCode(uiSourceCode, callback);
  }
};

SourcesTestRunner.waitForScriptSource = function(scriptName, callback) {
  var panel = UI.panels.sources;
  var uiSourceCodes = panel._workspace.uiSourceCodes();

  for (var i = 0; i < uiSourceCodes.length; ++i) {
    if (uiSourceCodes[i].project().type() === Workspace.projectTypes.Service)
      continue;

    if (uiSourceCodes[i].name() === scriptName) {
      callback(uiSourceCodes[i]);
      return;
    }
  }

  TestRunner.addSniffer(
      Sources.SourcesView.prototype, '_addUISourceCode',
      SourcesTestRunner.waitForScriptSource.bind(SourcesTestRunner, scriptName, callback));
};

SourcesTestRunner.setBreakpoint = function(sourceFrame, lineNumber, condition, enabled) {
  if (!sourceFrame._muted)
    sourceFrame._setBreakpoint(lineNumber, 0, condition, enabled);
};

SourcesTestRunner.removeBreakpoint = function(sourceFrame, lineNumber) {
  sourceFrame._breakpointManager.findBreakpoints(sourceFrame._uiSourceCode, lineNumber)[0].remove();
};

SourcesTestRunner.createNewBreakpoint = function(sourceFrame, lineNumber, condition, enabled) {
  var promise =
      new Promise(resolve => TestRunner.addSniffer(sourceFrame.__proto__, '_breakpointWasSetForTest', resolve));
  sourceFrame._createNewBreakpoint(lineNumber, condition, enabled);
  return promise;
};

SourcesTestRunner.toggleBreakpoint = function(sourceFrame, lineNumber, disableOnly) {
  if (!sourceFrame._muted)
    sourceFrame._toggleBreakpoint(lineNumber, disableOnly);
};

SourcesTestRunner.waitBreakpointSidebarPane = function(waitUntilResolved) {
  return new Promise(
             resolve => TestRunner.addSniffer(
                 Sources.JavaScriptBreakpointsSidebarPane.prototype, '_didUpdateForTest', resolve))
      .then(checkIfReady);

  function checkIfReady() {
    if (!waitUntilResolved)
      return;

    for (var breakpoint of Bindings.breakpointManager._allBreakpoints()) {
      if (breakpoint._fakePrimaryLocation && breakpoint.enabled())
        return SourcesTestRunner.waitBreakpointSidebarPane();
    }
  }
};

SourcesTestRunner.breakpointsSidebarPaneContent = function() {
  var paneElement = self.runtime.sharedInstance(Sources.JavaScriptBreakpointsSidebarPane).contentElement;
  var empty = paneElement.querySelector('.gray-info-message');

  if (empty)
    return TestRunner.textContentWithLineBreaks(empty);

  var entries = Array.from(paneElement.querySelectorAll('.breakpoint-entry'));
  return entries.map(TestRunner.textContentWithLineBreaks).join('\n');
};

SourcesTestRunner.dumpBreakpointSidebarPane = function(title) {
  TestRunner.addResult('Breakpoint sidebar pane ' + (title || ''));
  TestRunner.addResult(SourcesTestRunner.breakpointsSidebarPaneContent());
};

SourcesTestRunner.dumpScopeVariablesSidebarPane = function() {
  TestRunner.addResult('Scope variables sidebar pane:');
  var sections = SourcesTestRunner.scopeChainSections();

  for (var i = 0; i < sections.length; ++i) {
    var textContent = TestRunner.textContentWithLineBreaks(sections[i].element);
    var text = TestRunner.clearSpecificInfoFromStackFrames(textContent);

    if (text.length > 0)
      TestRunner.addResult(text);

    if (!sections[i].objectTreeElement().expanded)
      TestRunner.addResult('    <section collapsed>');
  }
};

SourcesTestRunner.scopeChainSections = function() {
  var children = self.runtime.sharedInstance(Sources.ScopeChainSidebarPane).contentElement.children;
  var sections = [];

  for (var i = 0; i < children.length; ++i)
    sections.push(children[i]._section);

  return sections;
};

SourcesTestRunner.expandScopeVariablesSidebarPane = function(callback) {
  var sections = SourcesTestRunner.scopeChainSections();

  for (var i = 0; i < sections.length - 1; ++i)
    sections[i].expand();

  TestRunner.deprecatedRunAfterPendingDispatches(callback);
};

SourcesTestRunner.expandProperties = function(properties, callback) {
  var index = 0;

  function expandNextPath() {
    if (index === properties.length) {
      TestRunner.safeWrap(callback)();
      return;
    }

    var parentTreeElement = properties[index++];
    var path = properties[index++];
    SourcesTestRunner._expandProperty(parentTreeElement, path, 0, expandNextPath);
  }

  TestRunner.deprecatedRunAfterPendingDispatches(expandNextPath);
};

SourcesTestRunner._expandProperty = function(parentTreeElement, path, pathIndex, callback) {
  if (pathIndex === path.length) {
    TestRunner.addResult('Expanded property: ' + path.join('.'));
    callback();
    return;
  }

  var name = path[pathIndex++];
  var propertyTreeElement = SourcesTestRunner._findChildPropertyTreeElement(parentTreeElement, name);

  if (!propertyTreeElement) {
    TestRunner.addResult('Failed to expand property: ' + path.slice(0, pathIndex).join('.'));
    SourcesTestRunner.completeDebuggerTest();
    return;
  }

  propertyTreeElement.expand();
  TestRunner.deprecatedRunAfterPendingDispatches(
      SourcesTestRunner._expandProperty.bind(SourcesTestRunner, propertyTreeElement, path, pathIndex, callback));
};

SourcesTestRunner._findChildPropertyTreeElement = function(parent, childName) {
  var children = parent.children();

  for (var i = 0; i < children.length; i++) {
    var treeElement = children[i];
    var property = treeElement.property;

    if (property.name === childName)
      return treeElement;
  }
};

SourcesTestRunner.setQuiet = function(quiet) {
  SourcesTestRunner._quiet = quiet;
};

SourcesTestRunner.queryScripts = function(filter) {
  var scripts = TestRunner.debuggerModel.scripts();
  return (filter ? scripts.filter(filter) : scripts);
};

SourcesTestRunner.createScriptMock = function(
    url, startLine, startColumn, isContentScript, source, target, preRegisterCallback) {
  target = target || SDK.targetManager.mainTarget();
  var debuggerModel = target.model(SDK.DebuggerModel);
  var scriptId = ++SourcesTestRunner._lastScriptId + '';
  var lineCount = source.computeLineEndings().length;
  var endLine = startLine + lineCount - 1;
  var endColumn =
      (lineCount === 1 ? startColumn + source.length : source.length - source.computeLineEndings()[lineCount - 2]);
  var hasSourceURL =
      !!source.match(/\/\/#\ssourceURL=\s*(\S*?)\s*$/m) || !!source.match(/\/\/@\ssourceURL=\s*(\S*?)\s*$/m);

  var script = new SDK.Script(
      debuggerModel, scriptId, url, startLine, startColumn, endLine, endColumn, 0, '', isContentScript, false,
      undefined, hasSourceURL, source.length);

  script.requestContent = function() {
    var trimmedSource = SDK.Script._trimSourceURLComment(source);
    return Promise.resolve(trimmedSource);
  };

  if (preRegisterCallback)
    preRegisterCallback(script);

  debuggerModel._registerScript(script);
  return script;
};

SourcesTestRunner._lastScriptId = 0;

SourcesTestRunner.checkRawLocation = function(script, lineNumber, columnNumber, location) {
  TestRunner.assertEquals(script.scriptId, location.scriptId, 'Incorrect scriptId');
  TestRunner.assertEquals(lineNumber, location.lineNumber, 'Incorrect lineNumber');
  TestRunner.assertEquals(columnNumber, location.columnNumber, 'Incorrect columnNumber');
};

SourcesTestRunner.checkUILocation = function(uiSourceCode, lineNumber, columnNumber, location) {
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

SourcesTestRunner.scriptFormatter = function() {
  return self.runtime.allInstances(Sources.SourcesView.EditorAction).then(function(editorActions) {
    for (var i = 0; i < editorActions.length; ++i) {
      if (editorActions[i] instanceof Sources.ScriptFormatterEditorAction)
        return editorActions[i];
    }

    return null;
  });
};

SourcesTestRunner.waitForExecutionContextInTarget = function(target, callback) {
  var runtimeModel = target.model(SDK.RuntimeModel);

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

SourcesTestRunner.selectThread = function(target) {
  var threadsPane = self.runtime.sharedInstance(Sources.ThreadsSidebarPane);
  threadsPane._list.selectItem(target.model(SDK.DebuggerModel));
};

SourcesTestRunner.evaluateOnCurrentCallFrame = function(code) {
  return new Promise(
      succ => TestRunner.debuggerModel.evaluateOnSelectedCallFrame(
          code, 'console', false, true, false, false, TestRunner.safeWrap(succ)));
};

SourcesTestRunner.waitJavaScriptSourceFrameBreakpoints = function(sourceFrame, inline) {
  return waitUpdate().then(checkIfReady);

  function waitUpdate() {
    return new Promise(
        resolve => TestRunner.addSniffer(sourceFrame.__proto__, '_breakpointDecorationsUpdatedForTest', resolve));
  }

  function checkIfReady() {
    for (var breakpoint of Bindings.breakpointManager._allBreakpoints()) {
      if (breakpoint._fakePrimaryLocation && breakpoint.enabled())
        return waitUpdate().then(checkIfReady);
    }

    return Promise.resolve();
  }
};

SourcesTestRunner.dumpJavaScriptSourceFrameBreakpoints = function(sourceFrame) {
  var textEditor = sourceFrame._textEditor;

  for (var lineNumber = 0; lineNumber < textEditor.linesCount; ++lineNumber) {
    if (!textEditor.hasLineClass(lineNumber, 'cm-breakpoint'))
      continue;

    var disabled = textEditor.hasLineClass(lineNumber, 'cm-breakpoint-disabled');
    var conditional = textEditor.hasLineClass(lineNumber, 'cm-breakpoint-conditional');
    TestRunner.addResult(
        'breakpoint at ' + lineNumber + ((disabled ? ' disabled' : '')) + ((conditional ? ' conditional' : '')));
    var range = new TextUtils.TextRange(lineNumber, 0, lineNumber, textEditor.line(lineNumber).length);
    var bookmarks = textEditor.bookmarks(range, Sources.JavaScriptSourceFrame.BreakpointDecoration._bookmarkSymbol);
    bookmarks = bookmarks.filter(bookmark => !!bookmark.position());
    bookmarks.sort((bookmark1, bookmark2) => bookmark1.position().startColumn - bookmark2.position().startColumn);

    for (var bookmark of bookmarks) {
      var position = bookmark.position();
      var element = bookmark[Sources.JavaScriptSourceFrame.BreakpointDecoration._elementSymbolForTest];
      var disabled = element.classList.contains('cm-inline-disabled');
      var conditional = element.classList.contains('cm-inline-conditional');

      TestRunner.addResult(
          '  inline breakpoint at (' + position.startLine + ', ' + position.startColumn + ')' +
          ((disabled ? ' disabled' : '')) + ((conditional ? ' conditional' : '')));
    }
  }
};

SourcesTestRunner.clickJavaScriptSourceFrameBreakpoint = function(sourceFrame, lineNumber, index, next) {
  var textEditor = sourceFrame._textEditor;
  var lineLength = textEditor.line(lineNumber).length;
  var lineRange = new TextUtils.TextRange(lineNumber, 0, lineNumber, lineLength);
  var bookmarks = textEditor.bookmarks(lineRange, Sources.JavaScriptSourceFrame.BreakpointDecoration._bookmarkSymbol);
  bookmarks.sort((bookmark1, bookmark2) => bookmark1.position().startColumn - bookmark2.position().startColumn);
  var bookmark = bookmarks[index];

  if (bookmark) {
    bookmark[Sources.JavaScriptSourceFrame.BreakpointDecoration._elementSymbolForTest].click();
  } else {
    TestRunner.addResult(`Could not click on Javascript breakpoint - lineNumber: ${lineNumber}, index: ${index}`);
    next();
  }
};

SourcesTestRunner.setEventListenerBreakpoint = function(id, enabled, targetName) {
  var pane = self.runtime.sharedInstance(Sources.EventListenerBreakpointsSidebarPane);

  var auxData = {'eventName': id};

  if (targetName)
    auxData.targetName = targetName;

  var breakpoint = SDK.domDebuggerManager.resolveEventListenerBreakpoint(auxData);

  if (breakpoint.enabled() !== enabled) {
    pane._breakpoints.get(breakpoint).checkbox.checked = enabled;
    pane._breakpointCheckboxClicked(breakpoint);
  }
};

TestRunner.initAsync(`
  function scheduleTestFunction() {
    setTimeout(testFunction, 0);
  }
`);
