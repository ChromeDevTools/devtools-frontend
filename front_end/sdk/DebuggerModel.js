/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
SDK.DebuggerModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(SDK.DebuggerModel, target);

    target.registerDebuggerDispatcher(new SDK.DebuggerDispatcher(this));
    this._agent = target.debuggerAgent();

    /** @type {?SDK.DebuggerPausedDetails} */
    this._debuggerPausedDetails = null;
    /** @type {!Object.<string, !SDK.Script>} */
    this._scripts = {};
    /** @type {!Map.<string, !Array.<!SDK.Script>>} */
    this._scriptsBySourceURL = new Map();

    /** @type {!Common.Object} */
    this._breakpointResolvedEventTarget = new Common.Object();

    this._isPausing = false;
    Common.moduleSetting('pauseOnExceptionEnabled').addChangeListener(this._pauseOnExceptionStateChanged, this);
    Common.moduleSetting('pauseOnCaughtException').addChangeListener(this._pauseOnExceptionStateChanged, this);
    Common.moduleSetting('enableAsyncStackTraces').addChangeListener(this.asyncStackTracesStateChanged, this);

    /** @type {!Map<string, string>} */
    this._fileURLToNodeJSPath = new Map();
    this.enableDebugger();
  }

  /**
   * @return {!Array<!SDK.DebuggerModel>}
   */
  static instances() {
    var result = [];
    for (var target of SDK.targetManager.targets()) {
      var debuggerModel = SDK.DebuggerModel.fromTarget(target);
      if (debuggerModel)
        result.push(debuggerModel);
    }
    return result;
  }

  /**
   * @param {?SDK.Target} target
   * @return {?SDK.DebuggerModel}
   */
  static fromTarget(target) {
    if (!target || !target.hasJSCapability())
      return null;
    return /** @type {?SDK.DebuggerModel} */ (target.model(SDK.DebuggerModel));
  }

  /**
   * @return {boolean}
   */
  debuggerEnabled() {
    return !!this._debuggerEnabled;
  }

  /**
   * @param {function()=} callback
   */
  enableDebugger(callback) {
    if (this._debuggerEnabled) {
      if (callback)
        callback();
      return;
    }
    this._agent.enable(callback);
    this._debuggerEnabled = true;
    this._pauseOnExceptionStateChanged();
    this.asyncStackTracesStateChanged();
    this.dispatchEventToListeners(SDK.DebuggerModel.Events.DebuggerWasEnabled);
  }

  /**
   * @param {function()=} callback
   */
  disableDebugger(callback) {
    if (!this._debuggerEnabled) {
      if (callback)
        callback();
      return;
    }

    this._agent.disable(callback);
    this._debuggerEnabled = false;
    this._isPausing = false;
    this.asyncStackTracesStateChanged();
    this.globalObjectCleared();
    this.dispatchEventToListeners(SDK.DebuggerModel.Events.DebuggerWasDisabled);
  }

  /**
   * @param {boolean} skip
   */
  _skipAllPauses(skip) {
    if (this._skipAllPausesTimeout) {
      clearTimeout(this._skipAllPausesTimeout);
      delete this._skipAllPausesTimeout;
    }
    this._agent.setSkipAllPauses(skip);
  }

  /**
   * @param {number} timeout
   */
  skipAllPausesUntilReloadOrTimeout(timeout) {
    if (this._skipAllPausesTimeout)
      clearTimeout(this._skipAllPausesTimeout);
    this._agent.setSkipAllPauses(true);
    // If reload happens before the timeout, the flag will be already unset and the timeout callback won't change anything.
    this._skipAllPausesTimeout = setTimeout(this._skipAllPauses.bind(this, false), timeout);
  }

  _pauseOnExceptionStateChanged() {
    var state;
    if (!Common.moduleSetting('pauseOnExceptionEnabled').get())
      state = SDK.DebuggerModel.PauseOnExceptionsState.DontPauseOnExceptions;
    else if (Common.moduleSetting('pauseOnCaughtException').get())
      state = SDK.DebuggerModel.PauseOnExceptionsState.PauseOnAllExceptions;
    else
      state = SDK.DebuggerModel.PauseOnExceptionsState.PauseOnUncaughtExceptions;

    this._agent.setPauseOnExceptions(state);
  }

  asyncStackTracesStateChanged() {
    const maxAsyncStackChainDepth = 4;
    var enabled = Common.moduleSetting('enableAsyncStackTraces').get() && this._debuggerEnabled;
    this._agent.setAsyncCallStackDepth(enabled ? maxAsyncStackChainDepth : 0);
  }

  stepInto() {
    this._agent.stepInto();
  }

  stepOver() {
    this._agent.stepOver();
  }

  stepOut() {
    this._agent.stepOut();
  }

  resume() {
    this._agent.resume();
    this._isPausing = false;
  }

  pause() {
    this._isPausing = true;
    this._skipAllPauses(false);
    this._agent.pause();
  }

  /**
   * @param {boolean} active
   */
  setBreakpointsActive(active) {
    this._agent.setBreakpointsActive(active);
  }

  /**
   * @param {string} url
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @param {string=} condition
   * @param {function(?Protocol.Debugger.BreakpointId, !Array.<!SDK.DebuggerModel.Location>)=} callback
   */
  setBreakpointByURL(url, lineNumber, columnNumber, condition, callback) {
    // Convert file url to node-js path.
    if (this.target().isNodeJS() && this._fileURLToNodeJSPath.has(url))
      url = this._fileURLToNodeJSPath.get(url);
    // Adjust column if needed.
    var minColumnNumber = 0;
    var scripts = this._scriptsBySourceURL.get(url) || [];
    for (var i = 0, l = scripts.length; i < l; ++i) {
      var script = scripts[i];
      if (lineNumber === script.lineOffset)
        minColumnNumber = minColumnNumber ? Math.min(minColumnNumber, script.columnOffset) : script.columnOffset;
    }
    columnNumber = Math.max(columnNumber, minColumnNumber);

    var target = this.target();
    /**
     * @param {?Protocol.Error} error
     * @param {!Protocol.Debugger.BreakpointId} breakpointId
     * @param {!Array.<!Protocol.Debugger.Location>} locations
     * @this {SDK.DebuggerModel}
     */
    function didSetBreakpoint(error, breakpointId, locations) {
      if (callback) {
        var rawLocations = locations ?
            locations.map(SDK.DebuggerModel.Location.fromPayload.bind(SDK.DebuggerModel.Location, this)) :
            [];
        callback(error ? null : breakpointId, rawLocations);
      }
    }
    this._agent.setBreakpointByUrl(lineNumber, url, undefined, columnNumber, condition, didSetBreakpoint.bind(this));
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {string} condition
   * @param {function(?Protocol.Debugger.BreakpointId, !Array.<!SDK.DebuggerModel.Location>)=} callback
   */
  setBreakpointBySourceId(rawLocation, condition, callback) {
    var target = this.target();

    /**
     * @this {SDK.DebuggerModel}
     * @param {?Protocol.Error} error
     * @param {!Protocol.Debugger.BreakpointId} breakpointId
     * @param {!Protocol.Debugger.Location} actualLocation
     */
    function didSetBreakpoint(error, breakpointId, actualLocation) {
      if (callback) {
        if (error || !actualLocation) {
          callback(null, []);
          return;
        }
        callback(breakpointId, [SDK.DebuggerModel.Location.fromPayload(this, actualLocation)]);
      }
    }
    this._agent.setBreakpoint(rawLocation.payload(), condition, didSetBreakpoint.bind(this));
  }

  /**
   * @param {!Protocol.Debugger.BreakpointId} breakpointId
   * @param {function()=} callback
   */
  removeBreakpoint(breakpointId, callback) {
    this._agent.removeBreakpoint(breakpointId, innerCallback);

    /**
     * @param {?Protocol.Error} error
     */
    function innerCallback(error) {
      if (error)
        console.error('Failed to remove breakpoint: ' + error);
      if (callback)
        callback();
    }
  }

  /**
   * @param {!SDK.DebuggerModel.Location} startLocation
   * @param {!SDK.DebuggerModel.Location} endLocation
   * @return {!Promise<!Array<!SDK.DebuggerModel.Location>>}
   */
  getPossibleBreakpoints(startLocation, endLocation) {
    var fulfill;
    var promise = new Promise(resolve => fulfill = resolve);
    this._agent.getPossibleBreakpoints(startLocation.payload(), endLocation.payload(), checkErrorAndReturn.bind(this));
    return promise;

    /**
     * @this {!SDK.DebuggerModel}
     * @param {?Protocol.Error} error
     * @param {?Array<!Protocol.Debugger.Location>} locations
     */
    function checkErrorAndReturn(error, locations) {
      if (error || !locations) {
        fulfill([]);
        return;
      }
      fulfill(locations.map(location => SDK.DebuggerModel.Location.fromPayload(this, location)));
    }
  }

  /**
   * @param {!Protocol.Debugger.BreakpointId} breakpointId
   * @param {!Protocol.Debugger.Location} location
   */
  _breakpointResolved(breakpointId, location) {
    this._breakpointResolvedEventTarget.dispatchEventToListeners(
        breakpointId, SDK.DebuggerModel.Location.fromPayload(this, location));
  }

  globalObjectCleared() {
    this._setDebuggerPausedDetails(null);
    this._reset();
    // TODO(dgozman): move clients to ExecutionContextDestroyed/ScriptCollected events.
    this.dispatchEventToListeners(SDK.DebuggerModel.Events.GlobalObjectCleared);
  }

  _reset() {
    this._scripts = {};
    this._scriptsBySourceURL.clear();
  }

  /**
   * @return {!Object.<string, !SDK.Script>}
   */
  get scripts() {
    return this._scripts;
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @return {?SDK.Script}
   */
  scriptForId(scriptId) {
    return this._scripts[scriptId] || null;
  }

  /**
   * @return {!Array.<!SDK.Script>}
   */
  scriptsForSourceURL(sourceURL) {
    if (!sourceURL)
      return [];
    return this._scriptsBySourceURL.get(sourceURL) || [];
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {string} newSource
   * @param {function(?Protocol.Error, !Protocol.Runtime.ExceptionDetails=)} callback
   */
  setScriptSource(scriptId, newSource, callback) {
    this._scripts[scriptId].editSource(newSource, this._didEditScriptSource.bind(this, scriptId, newSource, callback));
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {string} newSource
   * @param {function(?Protocol.Error, !Protocol.Runtime.ExceptionDetails=)} callback
   * @param {?Protocol.Error} error
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   * @param {!Array.<!Protocol.Debugger.CallFrame>=} callFrames
   * @param {!Protocol.Runtime.StackTrace=} asyncStackTrace
   * @param {boolean=} needsStepIn
   */
  _didEditScriptSource(
      scriptId,
      newSource,
      callback,
      error,
      exceptionDetails,
      callFrames,
      asyncStackTrace,
      needsStepIn) {
    if (needsStepIn) {
      this.stepInto();
      this._pendingLiveEditCallback = callback.bind(this, error, exceptionDetails);
      return;
    }

    if (!error && callFrames && callFrames.length) {
      this._pausedScript(
          callFrames, this._debuggerPausedDetails.reason, this._debuggerPausedDetails.auxData,
          this._debuggerPausedDetails.breakpointIds, asyncStackTrace);
    }
    callback(error, exceptionDetails);
  }

  /**
   * @return {?Array.<!SDK.DebuggerModel.CallFrame>}
   */
  get callFrames() {
    return this._debuggerPausedDetails ? this._debuggerPausedDetails.callFrames : null;
  }

  /**
   * @return {?SDK.DebuggerPausedDetails}
   */
  debuggerPausedDetails() {
    return this._debuggerPausedDetails;
  }

  /**
   * @param {?SDK.DebuggerPausedDetails} debuggerPausedDetails
   * @return {boolean}
   */
  _setDebuggerPausedDetails(debuggerPausedDetails) {
    this._isPausing = false;
    this._debuggerPausedDetails = debuggerPausedDetails;
    if (this._debuggerPausedDetails) {
      if (Runtime.experiments.isEnabled('emptySourceMapAutoStepping')) {
        if (this.dispatchEventToListeners(SDK.DebuggerModel.Events.BeforeDebuggerPaused, this._debuggerPausedDetails))
          return false;
      }
      this.dispatchEventToListeners(SDK.DebuggerModel.Events.DebuggerPaused, this._debuggerPausedDetails);
    }
    if (debuggerPausedDetails)
      this.setSelectedCallFrame(debuggerPausedDetails.callFrames[0]);
    else
      this.setSelectedCallFrame(null);
    return true;
  }

  /**
   * @param {!Array.<!Protocol.Debugger.CallFrame>} callFrames
   * @param {string} reason
   * @param {!Object|undefined} auxData
   * @param {!Array.<string>} breakpointIds
   * @param {!Protocol.Runtime.StackTrace=} asyncStackTrace
   */
  _pausedScript(callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
    var pausedDetails =
        new SDK.DebuggerPausedDetails(this, callFrames, reason, auxData, breakpointIds, asyncStackTrace);
    if (this._setDebuggerPausedDetails(pausedDetails)) {
      if (this._pendingLiveEditCallback) {
        var callback = this._pendingLiveEditCallback;
        delete this._pendingLiveEditCallback;
        callback();
      }
    } else {
      this._agent.stepInto();
    }
  }

  _resumedScript() {
    this._setDebuggerPausedDetails(null);
    this.dispatchEventToListeners(SDK.DebuggerModel.Events.DebuggerResumed);
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {string} sourceURL
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   * @param {!Protocol.Runtime.ExecutionContextId} executionContextId
   * @param {string} hash
   * @param {*|undefined} executionContextAuxData
   * @param {boolean} isLiveEdit
   * @param {string=} sourceMapURL
   * @param {boolean=} hasSourceURL
   * @param {boolean=} hasSyntaxError
   * @return {!SDK.Script}
   */
  _parsedScriptSource(
      scriptId,
      sourceURL,
      startLine,
      startColumn,
      endLine,
      endColumn,
      executionContextId,
      hash,
      executionContextAuxData,
      isLiveEdit,
      sourceMapURL,
      hasSourceURL,
      hasSyntaxError) {
    var isContentScript = false;
    if (executionContextAuxData && ('isDefault' in executionContextAuxData))
      isContentScript = !executionContextAuxData['isDefault'];
    // Support file URL for node.js.
    if (this.target().isNodeJS() && sourceURL && sourceURL.startsWith('/')) {
      var nodeJSPath = sourceURL;
      sourceURL = Common.ParsedURL.platformPathToURL(nodeJSPath);
      this._fileURLToNodeJSPath.set(sourceURL, nodeJSPath);
    }
    var script = new SDK.Script(
        this, scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
        isContentScript, isLiveEdit, sourceMapURL, hasSourceURL);
    this._registerScript(script);
    if (!hasSyntaxError)
      this.dispatchEventToListeners(SDK.DebuggerModel.Events.ParsedScriptSource, script);
    else
      this.dispatchEventToListeners(SDK.DebuggerModel.Events.FailedToParseScriptSource, script);
    return script;
  }

  /**
   * @param {!SDK.Script} script
   */
  _registerScript(script) {
    this._scripts[script.scriptId] = script;
    if (script.isAnonymousScript())
      return;

    var scripts = this._scriptsBySourceURL.get(script.sourceURL);
    if (!scripts) {
      scripts = [];
      this._scriptsBySourceURL.set(script.sourceURL, scripts);
    }
    scripts.push(script);
  }

  /**
   * @param {!SDK.Script} script
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  createRawLocation(script, lineNumber, columnNumber) {
    if (script.sourceURL)
      return this.createRawLocationByURL(script.sourceURL, lineNumber, columnNumber);
    return new SDK.DebuggerModel.Location(this, script.scriptId, lineNumber, columnNumber);
  }

  /**
   * @param {string} sourceURL
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  createRawLocationByURL(sourceURL, lineNumber, columnNumber) {
    var closestScript = null;
    var scripts = this._scriptsBySourceURL.get(sourceURL) || [];
    for (var i = 0, l = scripts.length; i < l; ++i) {
      var script = scripts[i];
      if (!closestScript)
        closestScript = script;
      if (script.lineOffset > lineNumber || (script.lineOffset === lineNumber && script.columnOffset > columnNumber))
        continue;
      if (script.endLine < lineNumber || (script.endLine === lineNumber && script.endColumn <= columnNumber))
        continue;
      closestScript = script;
      break;
    }
    return closestScript ? new SDK.DebuggerModel.Location(this, closestScript.scriptId, lineNumber, columnNumber) :
                           null;
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  createRawLocationByScriptId(scriptId, lineNumber, columnNumber) {
    var script = this.scriptForId(scriptId);
    return script ? this.createRawLocation(script, lineNumber, columnNumber) : null;
  }

  /**
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  createRawLocationsByStackTrace(stackTrace) {
    var frames = [];
    while (stackTrace) {
      for (var frame of stackTrace.callFrames)
        frames.push(frame);
      stackTrace = stackTrace.parent;
    }

    var rawLocations = [];
    for (var frame of frames) {
      var rawLocation = this.createRawLocationByScriptId(frame.scriptId, frame.lineNumber, frame.columnNumber);
      if (rawLocation)
        rawLocations.push(rawLocation);
    }
    return rawLocations;
  }

  /**
   * @return {boolean}
   */
  isPaused() {
    return !!this.debuggerPausedDetails();
  }

  /**
   * @return {boolean}
   */
  isPausing() {
    return this._isPausing;
  }

  /**
   * @param {?SDK.DebuggerModel.CallFrame} callFrame
   */
  setSelectedCallFrame(callFrame) {
    this._selectedCallFrame = callFrame;
    if (!this._selectedCallFrame)
      return;

    this.dispatchEventToListeners(SDK.DebuggerModel.Events.CallFrameSelected, callFrame);
  }

  /**
   * @return {?SDK.DebuggerModel.CallFrame}
   */
  selectedCallFrame() {
    return this._selectedCallFrame;
  }

  /**
   * @param {string} code
   * @param {string} objectGroup
   * @param {boolean} includeCommandLineAPI
   * @param {boolean} silent
   * @param {boolean} returnByValue
   * @param {boolean} generatePreview
   * @param {function(?SDK.RemoteObject, !Protocol.Runtime.ExceptionDetails=)} callback
   */
  evaluateOnSelectedCallFrame(
      code,
      objectGroup,
      includeCommandLineAPI,
      silent,
      returnByValue,
      generatePreview,
      callback) {
    /**
     * @param {?Protocol.Runtime.RemoteObject} result
     * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
     * @this {SDK.DebuggerModel}
     */
    function didEvaluate(result, exceptionDetails) {
      if (!result)
        callback(null);
      else
        callback(this.target().runtimeModel.createRemoteObject(result), exceptionDetails);
    }

    this.selectedCallFrame().evaluate(
        code, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview, didEvaluate.bind(this));
  }

  /**
   * @param {!SDK.RemoteObject} remoteObject
   * @return {!Promise<?SDK.DebuggerModel.FunctionDetails>}
   */
  functionDetailsPromise(remoteObject) {
    return remoteObject.getAllPropertiesPromise(/* accessorPropertiesOnly */ false).then(buildDetails.bind(this));

    /**
     * @param {!{properties: ?Array.<!SDK.RemoteObjectProperty>, internalProperties: ?Array.<!SDK.RemoteObjectProperty>}} response
     * @return {?SDK.DebuggerModel.FunctionDetails}
     * @this {!SDK.DebuggerModel}
     */
    function buildDetails(response) {
      if (!response)
        return null;
      var location = null;
      if (response.internalProperties) {
        for (var prop of response.internalProperties) {
          if (prop.name === '[[FunctionLocation]]')
            location = prop.value;
        }
      }
      var functionName = null;
      if (response.properties) {
        for (var prop of response.properties) {
          if (prop.name === 'name' && prop.value && prop.value.type === 'string')
            functionName = prop.value;
          if (prop.name === 'displayName' && prop.value && prop.value.type === 'string') {
            functionName = prop.value;
            break;
          }
        }
      }
      var debuggerLocation = null;
      if (location) {
        debuggerLocation = this.createRawLocationByScriptId(
            location.value.scriptId, location.value.lineNumber, location.value.columnNumber);
      }
      return {location: debuggerLocation, functionName: functionName ? functionName.value : ''};
    }
  }

  /**
   * @param {number} scopeNumber
   * @param {string} variableName
   * @param {!Protocol.Runtime.CallArgument} newValue
   * @param {string} callFrameId
   * @param {function(string=)=} callback
   */
  setVariableValue(scopeNumber, variableName, newValue, callFrameId, callback) {
    this._agent.setVariableValue(scopeNumber, variableName, newValue, callFrameId, innerCallback);

    /**
     * @param {?Protocol.Error} error
     */
    function innerCallback(error) {
      if (error) {
        console.error(error);
        if (callback)
          callback(error);
        return;
      }
      if (callback)
        callback();
    }
  }

  /**
   * @param {!Protocol.Debugger.BreakpointId} breakpointId
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   */
  addBreakpointListener(breakpointId, listener, thisObject) {
    this._breakpointResolvedEventTarget.addEventListener(breakpointId, listener, thisObject);
  }

  /**
   * @param {!Protocol.Debugger.BreakpointId} breakpointId
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   */
  removeBreakpointListener(breakpointId, listener, thisObject) {
    this._breakpointResolvedEventTarget.removeEventListener(breakpointId, listener, thisObject);
  }

  /**
   * @param {!Array<string>} patterns
   * @return {!Promise<boolean>}
   */
  setBlackboxPatterns(patterns) {
    var callback;
    var promise = new Promise(fulfill => callback = fulfill);
    this._agent.setBlackboxPatterns(patterns, patternsUpdated);
    return promise;

    /**
     * @param {?Protocol.Error} error
     */
    function patternsUpdated(error) {
      if (error)
        console.error(error);
      callback(!error);
    }
  }

  /**
   * @override
   */
  dispose() {
    Common.moduleSetting('pauseOnExceptionEnabled').removeChangeListener(this._pauseOnExceptionStateChanged, this);
    Common.moduleSetting('pauseOnCaughtException').removeChangeListener(this._pauseOnExceptionStateChanged, this);
    Common.moduleSetting('enableAsyncStackTraces').removeChangeListener(this.asyncStackTracesStateChanged, this);
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    return new Promise(promiseBody.bind(this));

    /**
     * @param {function()} fulfill
     * @this {SDK.DebuggerModel}
     */
    function promiseBody(fulfill) {
      this.disableDebugger(fulfill);
    }
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    return new Promise(promiseBody.bind(this));

    /**
     * @param {function()} fulfill
     * @this {SDK.DebuggerModel}
     */
    function promiseBody(fulfill) {
      this.enableDebugger(fulfill);
    }
  }
};

/** @typedef {{location: ?SDK.DebuggerModel.Location, functionName: string}} */
SDK.DebuggerModel.FunctionDetails;

/**
 * Keep these in sync with WebCore::V8Debugger
 *
 * @enum {string}
 */
SDK.DebuggerModel.PauseOnExceptionsState = {
  DontPauseOnExceptions: 'none',
  PauseOnAllExceptions: 'all',
  PauseOnUncaughtExceptions: 'uncaught'
};

/** @enum {symbol} */
SDK.DebuggerModel.Events = {
  DebuggerWasEnabled: Symbol('DebuggerWasEnabled'),
  DebuggerWasDisabled: Symbol('DebuggerWasDisabled'),
  BeforeDebuggerPaused: Symbol('BeforeDebuggerPaused'),
  DebuggerPaused: Symbol('DebuggerPaused'),
  DebuggerResumed: Symbol('DebuggerResumed'),
  ParsedScriptSource: Symbol('ParsedScriptSource'),
  FailedToParseScriptSource: Symbol('FailedToParseScriptSource'),
  GlobalObjectCleared: Symbol('GlobalObjectCleared'),
  CallFrameSelected: Symbol('CallFrameSelected'),
  ConsoleCommandEvaluatedInSelectedCallFrame: Symbol('ConsoleCommandEvaluatedInSelectedCallFrame')
};

/** @enum {string} */
SDK.DebuggerModel.BreakReason = {
  DOM: 'DOM',
  EventListener: 'EventListener',
  XHR: 'XHR',
  Exception: 'exception',
  PromiseRejection: 'promiseRejection',
  Assert: 'assert',
  DebugCommand: 'debugCommand',
  Other: 'other'
};

SDK.DebuggerEventTypes = {
  JavaScriptPause: 0,
  JavaScriptBreakpoint: 1,
  NativeBreakpoint: 2
};

/**
 * @implements {Protocol.DebuggerDispatcher}
 * @unrestricted
 */
SDK.DebuggerDispatcher = class {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  constructor(debuggerModel) {
    this._debuggerModel = debuggerModel;
  }

  /**
   * @override
   * @param {!Array.<!Protocol.Debugger.CallFrame>} callFrames
   * @param {string} reason
   * @param {!Object=} auxData
   * @param {!Array.<string>=} breakpointIds
   * @param {!Protocol.Runtime.StackTrace=} asyncStackTrace
   */
  paused(callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
    this._debuggerModel._pausedScript(callFrames, reason, auxData, breakpointIds || [], asyncStackTrace);
  }

  /**
   * @override
   */
  resumed() {
    this._debuggerModel._resumedScript();
  }

  /**
   * @override
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {string} sourceURL
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   * @param {!Protocol.Runtime.ExecutionContextId} executionContextId
   * @param {string} hash
   * @param {*=} executionContextAuxData
   * @param {boolean=} isLiveEdit
   * @param {string=} sourceMapURL
   * @param {boolean=} hasSourceURL
   */
  scriptParsed(
      scriptId,
      sourceURL,
      startLine,
      startColumn,
      endLine,
      endColumn,
      executionContextId,
      hash,
      executionContextAuxData,
      isLiveEdit,
      sourceMapURL,
      hasSourceURL) {
    this._debuggerModel._parsedScriptSource(
        scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
        executionContextAuxData, !!isLiveEdit, sourceMapURL, hasSourceURL, false);
  }

  /**
   * @override
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {string} sourceURL
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   * @param {!Protocol.Runtime.ExecutionContextId} executionContextId
   * @param {string} hash
   * @param {*=} executionContextAuxData
   * @param {string=} sourceMapURL
   * @param {boolean=} hasSourceURL
   */
  scriptFailedToParse(
      scriptId,
      sourceURL,
      startLine,
      startColumn,
      endLine,
      endColumn,
      executionContextId,
      hash,
      executionContextAuxData,
      sourceMapURL,
      hasSourceURL) {
    this._debuggerModel._parsedScriptSource(
        scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
        executionContextAuxData, false, sourceMapURL, hasSourceURL, true);
  }

  /**
   * @override
   * @param {!Protocol.Debugger.BreakpointId} breakpointId
   * @param {!Protocol.Debugger.Location} location
   */
  breakpointResolved(breakpointId, location) {
    this._debuggerModel._breakpointResolved(breakpointId, location);
  }
};

/**
 * @unrestricted
 */
SDK.DebuggerModel.Location = class extends SDK.SDKObject {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {string} scriptId
   * @param {number} lineNumber
   * @param {number=} columnNumber
   */
  constructor(debuggerModel, scriptId, lineNumber, columnNumber) {
    super(debuggerModel.target());
    this._debuggerModel = debuggerModel;
    this.scriptId = scriptId;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber || 0;
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Protocol.Debugger.Location} payload
   * @return {!SDK.DebuggerModel.Location}
   */
  static fromPayload(debuggerModel, payload) {
    return new SDK.DebuggerModel.Location(debuggerModel, payload.scriptId, payload.lineNumber, payload.columnNumber);
  }

  /**
   * @return {!Protocol.Debugger.Location}
   */
  payload() {
    return {scriptId: this.scriptId, lineNumber: this.lineNumber, columnNumber: this.columnNumber};
  }

  /**
   * @return {?SDK.Script}
   */
  script() {
    return this._debuggerModel.scriptForId(this.scriptId);
  }

  continueToLocation() {
    this._debuggerModel._agent.continueToLocation(this.payload());
  }

  /**
   * @return {string}
   */
  id() {
    return this.target().id() + ':' + this.scriptId + ':' + this.lineNumber + ':' + this.columnNumber;
  }
};


/**
 * @unrestricted
 */
SDK.DebuggerModel.CallFrame = class extends SDK.SDKObject {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!SDK.Script} script
   * @param {!Protocol.Debugger.CallFrame} payload
   */
  constructor(debuggerModel, script, payload) {
    var target = debuggerModel.target();
    super(target);
    this.debuggerModel = debuggerModel;
    this._debuggerAgent = debuggerModel._agent;
    this._script = script;
    this._payload = payload;
    this._location = SDK.DebuggerModel.Location.fromPayload(debuggerModel, payload.location);
    this._scopeChain = [];
    this._localScope = null;
    for (var i = 0; i < payload.scopeChain.length; ++i) {
      var scope = new SDK.DebuggerModel.Scope(this, i);
      this._scopeChain.push(scope);
      if (scope.type() === Protocol.Debugger.ScopeType.Local)
        this._localScope = scope;
    }
    if (payload.functionLocation)
      this._functionLocation = SDK.DebuggerModel.Location.fromPayload(debuggerModel, payload.functionLocation);
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Array.<!Protocol.Debugger.CallFrame>} callFrames
   * @return {!Array.<!SDK.DebuggerModel.CallFrame>}
   */
  static fromPayloadArray(debuggerModel, callFrames) {
    var result = [];
    for (var i = 0; i < callFrames.length; ++i) {
      var callFrame = callFrames[i];
      var script = debuggerModel.scriptForId(callFrame.location.scriptId);
      if (script)
        result.push(new SDK.DebuggerModel.CallFrame(debuggerModel, script, callFrame));
    }
    return result;
  }

  /**
   * @return {!SDK.Script}
   */
  get script() {
    return this._script;
  }

  /**
   * @return {string}
   */
  get id() {
    return this._payload.callFrameId;
  }

  /**
   * @return {!Array.<!SDK.DebuggerModel.Scope>}
   */
  scopeChain() {
    return this._scopeChain;
  }

  /**
   * @return {?SDK.DebuggerModel.Scope}
   */
  localScope() {
    return this._localScope;
  }

  /**
   * @return {?SDK.RemoteObject}
   */
  thisObject() {
    return this._payload.this ? this.target().runtimeModel.createRemoteObject(this._payload.this) : null;
  }

  /**
   * @return {?SDK.RemoteObject}
   */
  returnValue() {
    return this._payload.returnValue ? this.target().runtimeModel.createRemoteObject(this._payload.returnValue) : null;
  }

  /**
   * @return {string}
   */
  get functionName() {
    return this._payload.functionName;
  }

  /**
   * @return {!SDK.DebuggerModel.Location}
   */
  location() {
    return this._location;
  }

  /**
   * @return {?SDK.DebuggerModel.Location}
   */
  functionLocation() {
    return this._functionLocation || null;
  }

  /**
   * @param {string} code
   * @param {string} objectGroup
   * @param {boolean} includeCommandLineAPI
   * @param {boolean} silent
   * @param {boolean} returnByValue
   * @param {boolean} generatePreview
   * @param {function(?Protocol.Runtime.RemoteObject, !Protocol.Runtime.ExceptionDetails=)} callback
   */
  evaluate(code, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview, callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {!Protocol.Runtime.RemoteObject} result
     * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
     */
    function didEvaluateOnCallFrame(error, result, exceptionDetails) {
      if (error) {
        console.error(error);
        callback(null);
        return;
      }
      callback(result, exceptionDetails);
    }
    this._debuggerAgent.evaluateOnCallFrame(
        this._payload.callFrameId, code, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview,
        didEvaluateOnCallFrame);
  }

  /**
   * @param {function(?Protocol.Error=)=} callback
   */
  restart(callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {!Array.<!Protocol.Debugger.CallFrame>=} callFrames
     * @param {!Protocol.Runtime.StackTrace=} asyncStackTrace
     * @this {SDK.DebuggerModel.CallFrame}
     */
    function protocolCallback(error, callFrames, asyncStackTrace) {
      if (!error)
        this.debuggerModel.stepInto();
      if (callback)
        callback(error);
    }
    this._debuggerAgent.restartFrame(this._payload.callFrameId, protocolCallback.bind(this));
  }

  /**
   * @param {function(!Object)} callback
   */
  variableNames(callback) {
    var result = {this: true};

    function propertiesCollected(properties) {
      for (var i = 0; properties && i < properties.length; ++i)
        result[properties[i].name] = true;
      if (--pendingRequests === 0)
        callback(result);
    }

    var scopeChain = this.scopeChain();
    var pendingRequests = scopeChain.length;
    for (var i = 0; i < scopeChain.length; ++i) {
      var scope = scopeChain[i];
      var object = scope.object();
      object.getAllProperties(false, propertiesCollected);
    }
  }
};


/**
 * @unrestricted
 */
SDK.DebuggerModel.Scope = class {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {number} ordinal
   */
  constructor(callFrame, ordinal) {
    this._callFrame = callFrame;
    this._payload = callFrame._payload.scopeChain[ordinal];
    this._type = this._payload.type;
    this._name = this._payload.name;
    this._ordinal = ordinal;
    this._startLocation = this._payload.startLocation ?
        SDK.DebuggerModel.Location.fromPayload(callFrame.debuggerModel, this._payload.startLocation) :
        null;
    this._endLocation = this._payload.endLocation ?
        SDK.DebuggerModel.Location.fromPayload(callFrame.debuggerModel, this._payload.endLocation) :
        null;
  }

  /**
   * @return {!SDK.DebuggerModel.CallFrame}
   */
  callFrame() {
    return this._callFrame;
  }

  /**
   * @return {string}
   */
  type() {
    return this._type;
  }

  /**
   * @return {string|undefined}
   */
  name() {
    return this._name;
  }

  /**
   * @return {?SDK.DebuggerModel.Location}
   */
  startLocation() {
    return this._startLocation;
  }

  /**
   * @return {?SDK.DebuggerModel.Location}
   */
  endLocation() {
    return this._endLocation;
  }

  /**
   * @return {!SDK.RemoteObject}
   */
  object() {
    if (this._object)
      return this._object;
    var runtimeModel = this._callFrame.target().runtimeModel;

    var declarativeScope =
        this._type !== Protocol.Debugger.ScopeType.With && this._type !== Protocol.Debugger.ScopeType.Global;
    if (declarativeScope) {
      this._object = runtimeModel.createScopeRemoteObject(
          this._payload.object, new SDK.ScopeRef(this._ordinal, this._callFrame.id));
    } else {
      this._object = runtimeModel.createRemoteObject(this._payload.object);
    }

    return this._object;
  }

  /**
   * @return {string}
   */
  description() {
    var declarativeScope =
        this._type !== Protocol.Debugger.ScopeType.With && this._type !== Protocol.Debugger.ScopeType.Global;
    return declarativeScope ? '' : (this._payload.object.description || '');
  }
};

/**
 * @unrestricted
 */
SDK.DebuggerPausedDetails = class extends SDK.SDKObject {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Array.<!Protocol.Debugger.CallFrame>} callFrames
   * @param {string} reason
   * @param {!Object|undefined} auxData
   * @param {!Array.<string>} breakpointIds
   * @param {!Protocol.Runtime.StackTrace=} asyncStackTrace
   */
  constructor(debuggerModel, callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
    super(debuggerModel.target());
    this.debuggerModel = debuggerModel;
    this.callFrames = SDK.DebuggerModel.CallFrame.fromPayloadArray(debuggerModel, callFrames);
    this.reason = reason;
    this.auxData = auxData;
    this.breakpointIds = breakpointIds;
    if (asyncStackTrace)
      this.asyncStackTrace = this._cleanRedundantFrames(asyncStackTrace);
  }

  /**
   * @return {?SDK.RemoteObject}
   */
  exception() {
    if (this.reason !== SDK.DebuggerModel.BreakReason.Exception &&
        this.reason !== SDK.DebuggerModel.BreakReason.PromiseRejection)
      return null;
    return this.target().runtimeModel.createRemoteObject(/** @type {!Protocol.Runtime.RemoteObject} */ (this.auxData));
  }

  /**
   * @param {!Protocol.Runtime.StackTrace} asyncStackTrace
   * @return {!Protocol.Runtime.StackTrace}
   */
  _cleanRedundantFrames(asyncStackTrace) {
    var stack = asyncStackTrace;
    var previous = null;
    while (stack) {
      if (stack.description === 'async function' && stack.callFrames.length)
        stack.callFrames.shift();
      if (previous && !stack.callFrames.length)
        previous.parent = stack.parent;
      else
        previous = stack;
      stack = stack.parent;
    }
    return asyncStackTrace;
  }
};
