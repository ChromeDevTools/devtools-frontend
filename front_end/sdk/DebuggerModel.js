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
 * @constructor
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 */
WebInspector.DebuggerModel = function(target) {
  WebInspector.SDKModel.call(this, WebInspector.DebuggerModel, target);

  target.registerDebuggerDispatcher(new WebInspector.DebuggerDispatcher(this));
  this._agent = target.debuggerAgent();

  /** @type {?WebInspector.DebuggerPausedDetails} */
  this._debuggerPausedDetails = null;
  /** @type {!Object.<string, !WebInspector.Script>} */
  this._scripts = {};
  /** @type {!Map.<string, !Array.<!WebInspector.Script>>} */
  this._scriptsBySourceURL = new Map();

  /** @type {!WebInspector.Object} */
  this._breakpointResolvedEventTarget = new WebInspector.Object();

  this._isPausing = false;
  WebInspector.moduleSetting('pauseOnExceptionEnabled')
      .addChangeListener(this._pauseOnExceptionStateChanged, this);
  WebInspector.moduleSetting('pauseOnCaughtException')
      .addChangeListener(this._pauseOnExceptionStateChanged, this);
  WebInspector.moduleSetting('enableAsyncStackTraces')
      .addChangeListener(this.asyncStackTracesStateChanged, this);

  this.enableDebugger();
};

/** @typedef {{location: ?WebInspector.DebuggerModel.Location, functionName: string}} */
WebInspector.DebuggerModel.FunctionDetails;

/**
 * Keep these in sync with WebCore::V8Debugger
 *
 * @enum {string}
 */
WebInspector.DebuggerModel.PauseOnExceptionsState = {
  DontPauseOnExceptions: 'none',
  PauseOnAllExceptions: 'all',
  PauseOnUncaughtExceptions: 'uncaught'
};

/** @enum {symbol} */
WebInspector.DebuggerModel.Events = {
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
WebInspector.DebuggerModel.BreakReason = {
  DOM: 'DOM',
  EventListener: 'EventListener',
  XHR: 'XHR',
  Exception: 'exception',
  PromiseRejection: 'promiseRejection',
  Assert: 'assert',
  DebugCommand: 'debugCommand',
  Other: 'other'
};

WebInspector.DebuggerModel.prototype = {
  /**
     * @return {boolean}
     */
  debuggerEnabled: function() { return !!this._debuggerEnabled; },

  /**
   * @param {function()=} callback
   */
  enableDebugger: function(callback) {
    if (this._debuggerEnabled) {
      if (callback)
        callback();
      return;
    }
    this._agent.enable(callback);
    this._debuggerEnabled = true;
    this._pauseOnExceptionStateChanged();
    this.asyncStackTracesStateChanged();
    this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.DebuggerWasEnabled);
  },

  /**
   * @param {function()=} callback
   */
  disableDebugger: function(callback) {
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
    this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.DebuggerWasDisabled);
  },

  /**
   * @param {boolean} skip
   */
  _skipAllPauses: function(skip) {
    if (this._skipAllPausesTimeout) {
      clearTimeout(this._skipAllPausesTimeout);
      delete this._skipAllPausesTimeout;
    }
    this._agent.setSkipAllPauses(skip);
  },

  /**
   * @param {number} timeout
   */
  skipAllPausesUntilReloadOrTimeout: function(timeout) {
    if (this._skipAllPausesTimeout)
      clearTimeout(this._skipAllPausesTimeout);
    this._agent.setSkipAllPauses(true);
    // If reload happens before the timeout, the flag will be already unset and the timeout callback
    // won't change anything.
    this._skipAllPausesTimeout = setTimeout(this._skipAllPauses.bind(this, false), timeout);
  },

  _pauseOnExceptionStateChanged: function() {
    var state;
    if (!WebInspector.moduleSetting('pauseOnExceptionEnabled').get()) {
      state = WebInspector.DebuggerModel.PauseOnExceptionsState.DontPauseOnExceptions;
    } else if (WebInspector.moduleSetting('pauseOnCaughtException').get()) {
      state = WebInspector.DebuggerModel.PauseOnExceptionsState.PauseOnAllExceptions;
    } else {
      state = WebInspector.DebuggerModel.PauseOnExceptionsState.PauseOnUncaughtExceptions;
    }
    this._agent.setPauseOnExceptions(state);
  },

  asyncStackTracesStateChanged: function() {
    const maxAsyncStackChainDepth = 4;
    var enabled =
        WebInspector.moduleSetting('enableAsyncStackTraces').get() && this._debuggerEnabled;
    this._agent.setAsyncCallStackDepth(enabled ? maxAsyncStackChainDepth : 0);
  },

  stepInto: function() { this._agent.stepInto(); },

  stepOver: function() { this._agent.stepOver(); },

  stepOut: function() { this._agent.stepOut(); },

  resume: function() {
    this._agent.resume();
    this._isPausing = false;
  },

  pause: function() {
    this._isPausing = true;
    this._skipAllPauses(false);
    this._agent.pause();
  },

  /**
   * @param {boolean} active
   */
  setBreakpointsActive: function(active) { this._agent.setBreakpointsActive(active); },

  /**
   * @param {string} url
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @param {string=} condition
   * @param {function(?DebuggerAgent.BreakpointId, !Array.<!WebInspector.DebuggerModel.Location>)=}
   * callback
   */
  setBreakpointByURL: function(url, lineNumber, columnNumber, condition, callback) {
    // Adjust column if needed.
    var minColumnNumber = 0;
    var scripts = this._scriptsBySourceURL.get(url) || [];
    for (var i = 0, l = scripts.length; i < l; ++i) {
      var script = scripts[i];
      if (lineNumber === script.lineOffset)
        minColumnNumber =
            minColumnNumber ? Math.min(minColumnNumber, script.columnOffset) : script.columnOffset;
    }
    columnNumber = Math.max(columnNumber, minColumnNumber);

    var target = this.target();
    /**
     * @param {?Protocol.Error} error
     * @param {!DebuggerAgent.BreakpointId} breakpointId
     * @param {!Array.<!DebuggerAgent.Location>} locations
     * @this {WebInspector.DebuggerModel}
     */
    function didSetBreakpoint(error, breakpointId, locations) {
      if (callback) {
        var rawLocations = locations ?
            locations.map(WebInspector.DebuggerModel.Location.fromPayload.bind(
                WebInspector.DebuggerModel.Location, this)) :
            [];
        callback(error ? null : breakpointId, rawLocations);
      }
    }
    this._agent.setBreakpointByUrl(
        lineNumber, url, undefined, columnNumber, condition, didSetBreakpoint.bind(this));
  },

  /**
   * @param {!WebInspector.DebuggerModel.Location} rawLocation
   * @param {string} condition
   * @param {function(?DebuggerAgent.BreakpointId, !Array.<!WebInspector.DebuggerModel.Location>)=}
   * callback
   */
  setBreakpointBySourceId: function(rawLocation, condition, callback) {
    var target = this.target();

    /**
     * @this {WebInspector.DebuggerModel}
     * @param {?Protocol.Error} error
     * @param {!DebuggerAgent.BreakpointId} breakpointId
     * @param {!DebuggerAgent.Location} actualLocation
     */
    function didSetBreakpoint(error, breakpointId, actualLocation) {
      if (callback) {
        var location = WebInspector.DebuggerModel.Location.fromPayload(this, actualLocation);
        callback(error ? null : breakpointId, [location]);
      }
    }
    this._agent.setBreakpoint(rawLocation.payload(), condition, didSetBreakpoint.bind(this));
  },

  /**
   * @param {!DebuggerAgent.BreakpointId} breakpointId
   * @param {function()=} callback
   */
  removeBreakpoint: function(breakpointId, callback) {
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
  },

  /**
   * @param {!DebuggerAgent.BreakpointId} breakpointId
   * @param {!DebuggerAgent.Location} location
   */
  _breakpointResolved: function(breakpointId, location) {
    this._breakpointResolvedEventTarget.dispatchEventToListeners(
        breakpointId, WebInspector.DebuggerModel.Location.fromPayload(this, location));
  },

  globalObjectCleared: function() {
    this._setDebuggerPausedDetails(null);
    this._reset();
    // TODO(dgozman): move clients to ExecutionContextDestroyed/ScriptCollected events.
    this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.GlobalObjectCleared);
  },

  _reset: function() {
    this._scripts = {};
    this._scriptsBySourceURL.clear();
  },

  /**
     * @return {!Object.<string, !WebInspector.Script>}
     */
  get scripts() { return this._scripts; },

  /**
     * @param {!RuntimeAgent.ScriptId} scriptId
     * @return {?WebInspector.Script}
     */
  scriptForId: function(scriptId) { return this._scripts[scriptId] || null; },

  /**
     * @return {!Array.<!WebInspector.Script>}
     */
  scriptsForSourceURL: function(sourceURL) {
    if (!sourceURL)
      return [];
    return this._scriptsBySourceURL.get(sourceURL) || [];
  },

  /**
   * @param {!RuntimeAgent.ScriptId} scriptId
   * @param {string} newSource
   * @param {function(?Protocol.Error, !RuntimeAgent.ExceptionDetails=)} callback
   */
  setScriptSource: function(scriptId, newSource, callback) {
    this._scripts[scriptId].editSource(
        newSource, this._didEditScriptSource.bind(this, scriptId, newSource, callback));
  },

  /**
   * @param {!RuntimeAgent.ScriptId} scriptId
   * @param {string} newSource
   * @param {function(?Protocol.Error, !RuntimeAgent.ExceptionDetails=)} callback
   * @param {?Protocol.Error} error
   * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
   * @param {!Array.<!DebuggerAgent.CallFrame>=} callFrames
   * @param {!RuntimeAgent.StackTrace=} asyncStackTrace
   * @param {boolean=} needsStepIn
   */
  _didEditScriptSource: function(
      scriptId, newSource, callback, error, exceptionDetails, callFrames, asyncStackTrace,
      needsStepIn) {
    if (needsStepIn) {
      this.stepInto();
      this._pendingLiveEditCallback = callback.bind(this, error, exceptionDetails);
      return;
    }

    if (!error && callFrames && callFrames.length)
      this._pausedScript(
          callFrames, this._debuggerPausedDetails.reason, this._debuggerPausedDetails.auxData,
          this._debuggerPausedDetails.breakpointIds, asyncStackTrace);
    callback(error, exceptionDetails);
  },

  /**
     * @return {?Array.<!WebInspector.DebuggerModel.CallFrame>}
     */
  get callFrames() {
    return this._debuggerPausedDetails ? this._debuggerPausedDetails.callFrames : null;
  },

  /**
     * @return {?WebInspector.DebuggerPausedDetails}
     */
  debuggerPausedDetails: function() { return this._debuggerPausedDetails; },

  /**
     * @param {?WebInspector.DebuggerPausedDetails} debuggerPausedDetails
     * @return {boolean}
     */
  _setDebuggerPausedDetails: function(debuggerPausedDetails) {
    this._isPausing = false;
    this._debuggerPausedDetails = debuggerPausedDetails;
    if (this._debuggerPausedDetails) {
      if (Runtime.experiments.isEnabled('emptySourceMapAutoStepping')) {
        if (this.dispatchEventToListeners(
                WebInspector.DebuggerModel.Events.BeforeDebuggerPaused,
                this._debuggerPausedDetails)) {
          return false;
        }
      }
      this.dispatchEventToListeners(
          WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPausedDetails);
    }
    if (debuggerPausedDetails)
      this.setSelectedCallFrame(debuggerPausedDetails.callFrames[0]);
    else
      this.setSelectedCallFrame(null);
    return true;
  },

  /**
   * @param {!Array.<!DebuggerAgent.CallFrame>} callFrames
   * @param {string} reason
   * @param {!Object|undefined} auxData
   * @param {!Array.<string>} breakpointIds
   * @param {!RuntimeAgent.StackTrace=} asyncStackTrace
   */
  _pausedScript: function(callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
    var pausedDetails = new WebInspector.DebuggerPausedDetails(
        this, callFrames, reason, auxData, breakpointIds, asyncStackTrace);
    if (this._setDebuggerPausedDetails(pausedDetails)) {
      if (this._pendingLiveEditCallback) {
        var callback = this._pendingLiveEditCallback;
        delete this._pendingLiveEditCallback;
        callback();
      }
    } else {
      this._agent.stepInto();
    }
  },

  _resumedScript: function() {
    this._setDebuggerPausedDetails(null);
    this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.DebuggerResumed);
  },

  /**
     * @param {!RuntimeAgent.ScriptId} scriptId
     * @param {string} sourceURL
     * @param {number} startLine
     * @param {number} startColumn
     * @param {number} endLine
     * @param {number} endColumn
     * @param {!RuntimeAgent.ExecutionContextId} executionContextId
     * @param {string} hash
     * @param {*|undefined} executionContextAuxData
     * @param {boolean} isLiveEdit
     * @param {string=} sourceMapURL
     * @param {boolean=} hasSourceURL
     * @param {boolean=} hasSyntaxError
     * @return {!WebInspector.Script}
     */
  _parsedScriptSource: function(
      scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
      executionContextAuxData, isLiveEdit, sourceMapURL, hasSourceURL, hasSyntaxError) {
    var isContentScript = false;
    if (executionContextAuxData && ('isDefault' in executionContextAuxData))
      isContentScript = !executionContextAuxData['isDefault'];
    var script = new WebInspector.Script(
        this, scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId,
        hash, isContentScript, isLiveEdit, sourceMapURL, hasSourceURL);
    this._registerScript(script);
    if (!hasSyntaxError)
      this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.ParsedScriptSource, script);
    else
      this.dispatchEventToListeners(
          WebInspector.DebuggerModel.Events.FailedToParseScriptSource, script);
    return script;
  },

  /**
   * @param {!WebInspector.Script} script
   */
  _registerScript: function(script) {
    this._scripts[script.scriptId] = script;
    if (script.isAnonymousScript())
      return;

    var scripts = this._scriptsBySourceURL.get(script.sourceURL);
    if (!scripts) {
      scripts = [];
      this._scriptsBySourceURL.set(script.sourceURL, scripts);
    }
    scripts.push(script);
  },

  /**
     * @param {!WebInspector.Script} script
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
  createRawLocation: function(script, lineNumber, columnNumber) {
    if (script.sourceURL)
      return this.createRawLocationByURL(script.sourceURL, lineNumber, columnNumber);
    return new WebInspector.DebuggerModel.Location(this, script.scriptId, lineNumber, columnNumber);
  },

  /**
     * @param {string} sourceURL
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
  createRawLocationByURL: function(sourceURL, lineNumber, columnNumber) {
    var closestScript = null;
    var scripts = this._scriptsBySourceURL.get(sourceURL) || [];
    for (var i = 0, l = scripts.length; i < l; ++i) {
      var script = scripts[i];
      if (!closestScript)
        closestScript = script;
      if (script.lineOffset > lineNumber ||
          (script.lineOffset === lineNumber && script.columnOffset > columnNumber))
        continue;
      if (script.endLine < lineNumber ||
          (script.endLine === lineNumber && script.endColumn <= columnNumber))
        continue;
      closestScript = script;
      break;
    }
    return closestScript ?
        new WebInspector.DebuggerModel.Location(
            this, closestScript.scriptId, lineNumber, columnNumber) :
        null;
  },

  /**
     * @param {!RuntimeAgent.ScriptId} scriptId
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
  createRawLocationByScriptId: function(scriptId, lineNumber, columnNumber) {
    var script = this.scriptForId(scriptId);
    return script ? this.createRawLocation(script, lineNumber, columnNumber) : null;
  },

  /**
     * @param {!RuntimeAgent.StackTrace} stackTrace
     * @return {!Array<!WebInspector.DebuggerModel.Location>}
     */
  createRawLocationsByStackTrace: function(stackTrace) {
    var frames = [];
    while (stackTrace) {
      for (var frame of stackTrace.callFrames)
        frames.push(frame);
      stackTrace = stackTrace.parent;
    }

    var rawLocations = [];
    for (var frame of frames) {
      var rawLocation =
          this.createRawLocationByScriptId(frame.scriptId, frame.lineNumber, frame.columnNumber);
      if (rawLocation)
        rawLocations.push(rawLocation);
    }
    return rawLocations;
  },

  /**
     * @return {boolean}
     */
  isPaused: function() { return !!this.debuggerPausedDetails(); },

  /**
     * @return {boolean}
     */
  isPausing: function() { return this._isPausing; },

  /**
   * @param {?WebInspector.DebuggerModel.CallFrame} callFrame
   */
  setSelectedCallFrame: function(callFrame) {
    this._selectedCallFrame = callFrame;
    if (!this._selectedCallFrame)
      return;

    this.dispatchEventToListeners(WebInspector.DebuggerModel.Events.CallFrameSelected, callFrame);
  },

  /**
     * @return {?WebInspector.DebuggerModel.CallFrame}
     */
  selectedCallFrame: function() { return this._selectedCallFrame; },

  /**
   * @param {string} code
   * @param {string} objectGroup
   * @param {boolean} includeCommandLineAPI
   * @param {boolean} silent
   * @param {boolean} returnByValue
   * @param {boolean} generatePreview
   * @param {function(?WebInspector.RemoteObject, !RuntimeAgent.ExceptionDetails=)} callback
   */
  evaluateOnSelectedCallFrame: function(
      code, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview, callback) {
    /**
     * @param {?RuntimeAgent.RemoteObject} result
     * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
     * @this {WebInspector.DebuggerModel}
     */
    function didEvaluate(result, exceptionDetails) {
      if (!result)
        callback(null);
      else
        callback(this.target().runtimeModel.createRemoteObject(result), exceptionDetails);
    }

    this.selectedCallFrame().evaluate(
        code, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview,
        didEvaluate.bind(this));
  },

  /**
     * @param {!WebInspector.RemoteObject} remoteObject
     * @return {!Promise<?WebInspector.DebuggerModel.FunctionDetails>}
     */
  functionDetailsPromise: function(remoteObject) {
    return remoteObject.getAllPropertiesPromise(/* accessorPropertiesOnly */ false)
        .then(buildDetails.bind(this));

    /**
         * @param {!{properties: ?Array.<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array.<!WebInspector.RemoteObjectProperty>}} response
         * @return {?WebInspector.DebuggerModel.FunctionDetails}
         * @this {!WebInspector.DebuggerModel}
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
      if (location)
        debuggerLocation = this.createRawLocationByScriptId(
            location.value.scriptId, location.value.lineNumber, location.value.columnNumber);
      return {location: debuggerLocation, functionName: functionName ? functionName.value : ''};
    }
  },

  /**
   * @param {number} scopeNumber
   * @param {string} variableName
   * @param {!RuntimeAgent.CallArgument} newValue
   * @param {string} callFrameId
   * @param {function(string=)=} callback
   */
  setVariableValue: function(scopeNumber, variableName, newValue, callFrameId, callback) {
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
  },

  /**
   * @param {!DebuggerAgent.BreakpointId} breakpointId
   * @param {function(!WebInspector.Event)} listener
   * @param {!Object=} thisObject
   */
  addBreakpointListener: function(breakpointId, listener, thisObject) {
    this._breakpointResolvedEventTarget.addEventListener(breakpointId, listener, thisObject);
  },

  /**
   * @param {!DebuggerAgent.BreakpointId} breakpointId
   * @param {function(!WebInspector.Event)} listener
   * @param {!Object=} thisObject
   */
  removeBreakpointListener: function(breakpointId, listener, thisObject) {
    this._breakpointResolvedEventTarget.removeEventListener(breakpointId, listener, thisObject);
  },

  /**
     * @param {!Array<string>} patterns
     * @return {!Promise<boolean>}
     */
  setBlackboxPatterns: function(patterns) {
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
  },

  dispose: function() {
    WebInspector.moduleSetting('pauseOnExceptionEnabled')
        .removeChangeListener(this._pauseOnExceptionStateChanged, this);
    WebInspector.moduleSetting('pauseOnCaughtException')
        .removeChangeListener(this._pauseOnExceptionStateChanged, this);
    WebInspector.moduleSetting('enableAsyncStackTraces')
        .removeChangeListener(this.asyncStackTracesStateChanged, this);
  },

  /**
     * @override
     * @return {!Promise}
     */
  suspendModel: function() {
    return new Promise(promiseBody.bind(this));

    /**
     * @param {function()} fulfill
     * @this {WebInspector.DebuggerModel}
     */
    function promiseBody(fulfill) { this.disableDebugger(fulfill); }
  },

  /**
     * @override
     * @return {!Promise}
     */
  resumeModel: function() {
    return new Promise(promiseBody.bind(this));

    /**
     * @param {function()} fulfill
     * @this {WebInspector.DebuggerModel}
     */
    function promiseBody(fulfill) { this.enableDebugger(fulfill); }
  },

  __proto__: WebInspector.SDKModel.prototype
};

WebInspector.DebuggerEventTypes = {
  JavaScriptPause: 0,
  JavaScriptBreakpoint: 1,
  NativeBreakpoint: 2
};

/**
 * @constructor
 * @implements {DebuggerAgent.Dispatcher}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 */
WebInspector.DebuggerDispatcher = function(debuggerModel) {
  this._debuggerModel = debuggerModel;
};

WebInspector.DebuggerDispatcher.prototype = {
  /**
   * @override
   * @param {!Array.<!DebuggerAgent.CallFrame>} callFrames
   * @param {string} reason
   * @param {!Object=} auxData
   * @param {!Array.<string>=} breakpointIds
   * @param {!RuntimeAgent.StackTrace=} asyncStackTrace
   */
  paused: function(callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
    this._debuggerModel._pausedScript(
        callFrames, reason, auxData, breakpointIds || [], asyncStackTrace);
  },

  /**
   * @override
   */
  resumed: function() { this._debuggerModel._resumedScript(); },

  /**
   * @override
   * @param {!RuntimeAgent.ScriptId} scriptId
   * @param {string} sourceURL
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   * @param {!RuntimeAgent.ExecutionContextId} executionContextId
   * @param {string} hash
   * @param {*=} executionContextAuxData
   * @param {boolean=} isLiveEdit
   * @param {string=} sourceMapURL
   * @param {boolean=} hasSourceURL
   */
  scriptParsed: function(
      scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
      executionContextAuxData, isLiveEdit, sourceMapURL, hasSourceURL) {
    this._debuggerModel._parsedScriptSource(
        scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
        executionContextAuxData, !!isLiveEdit, sourceMapURL, hasSourceURL, false);
  },

  /**
   * @override
   * @param {!RuntimeAgent.ScriptId} scriptId
   * @param {string} sourceURL
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   * @param {!RuntimeAgent.ExecutionContextId} executionContextId
   * @param {string} hash
   * @param {*=} executionContextAuxData
   * @param {string=} sourceMapURL
   * @param {boolean=} hasSourceURL
   */
  scriptFailedToParse: function(
      scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
      executionContextAuxData, sourceMapURL, hasSourceURL) {
    this._debuggerModel._parsedScriptSource(
        scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
        executionContextAuxData, false, sourceMapURL, hasSourceURL, true);
  },

  /**
   * @override
   * @param {!DebuggerAgent.BreakpointId} breakpointId
   * @param {!DebuggerAgent.Location} location
   */
  breakpointResolved: function(breakpointId, location) {
    this._debuggerModel._breakpointResolved(breakpointId, location);
  }
};

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {string} scriptId
 * @param {number} lineNumber
 * @param {number=} columnNumber
 */
WebInspector.DebuggerModel.Location = function(debuggerModel, scriptId, lineNumber, columnNumber) {
  WebInspector.SDKObject.call(this, debuggerModel.target());
  this._debuggerModel = debuggerModel;
  this.scriptId = scriptId;
  this.lineNumber = lineNumber;
  this.columnNumber = columnNumber || 0;
};

/**
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!DebuggerAgent.Location} payload
 * @return {!WebInspector.DebuggerModel.Location}
 */
WebInspector.DebuggerModel.Location.fromPayload = function(debuggerModel, payload) {
  return new WebInspector.DebuggerModel.Location(
      debuggerModel, payload.scriptId, payload.lineNumber, payload.columnNumber);
};

WebInspector.DebuggerModel.Location.prototype = {
  /**
     * @return {!DebuggerAgent.Location}
     */
  payload: function() {
    return {scriptId: this.scriptId, lineNumber: this.lineNumber, columnNumber: this.columnNumber};
  },

  /**
     * @return {?WebInspector.Script}
     */
  script: function() { return this._debuggerModel.scriptForId(this.scriptId); },

  continueToLocation: function() { this._debuggerModel._agent.continueToLocation(this.payload()); },

  /**
     * @return {string}
     */
  id: function() {
    return this.target().id() + ':' + this.scriptId + ':' + this.lineNumber + ':' +
        this.columnNumber;
  },

  __proto__: WebInspector.SDKObject.prototype
};

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!WebInspector.Script} script
 * @param {!DebuggerAgent.CallFrame} payload
 */
WebInspector.DebuggerModel.CallFrame = function(debuggerModel, script, payload) {
  var target = debuggerModel.target();
  WebInspector.SDKObject.call(this, target);
  this.debuggerModel = debuggerModel;
  this._debuggerAgent = debuggerModel._agent;
  this._script = script;
  this._payload = payload;
  this._location = WebInspector.DebuggerModel.Location.fromPayload(debuggerModel, payload.location);
  this._scopeChain = [];
  this._localScope = null;
  for (var i = 0; i < payload.scopeChain.length; ++i) {
    var scope = new WebInspector.DebuggerModel.Scope(this, i);
    this._scopeChain.push(scope);
    if (scope.type() === DebuggerAgent.ScopeType.Local)
      this._localScope = scope;
  }
  if (payload.functionLocation)
    this._functionLocation =
        WebInspector.DebuggerModel.Location.fromPayload(debuggerModel, payload.functionLocation);
};

/**
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!Array.<!DebuggerAgent.CallFrame>} callFrames
 * @return {!Array.<!WebInspector.DebuggerModel.CallFrame>}
 */
WebInspector.DebuggerModel.CallFrame.fromPayloadArray = function(debuggerModel, callFrames) {
  var result = [];
  for (var i = 0; i < callFrames.length; ++i) {
    var callFrame = callFrames[i];
    var script = debuggerModel.scriptForId(callFrame.location.scriptId);
    if (script)
      result.push(new WebInspector.DebuggerModel.CallFrame(debuggerModel, script, callFrame));
  }
  return result;
};

WebInspector.DebuggerModel.CallFrame.prototype = {
  /**
     * @return {!WebInspector.Script}
     */
  get script() { return this._script; },

  /**
     * @return {string}
     */
  get id() { return this._payload.callFrameId; },

  /**
     * @return {!Array.<!WebInspector.DebuggerModel.Scope>}
     */
  scopeChain: function() { return this._scopeChain; },

  /**
     * @return {?WebInspector.DebuggerModel.Scope}
     */
  localScope: function() { return this._localScope; },

  /**
     * @return {?WebInspector.RemoteObject}
     */
  thisObject: function() {
    return this._payload.this ? this.target().runtimeModel.createRemoteObject(this._payload.this) :
                                null;
  },

  /**
     * @return {?WebInspector.RemoteObject}
     */
  returnValue: function() {
    return this._payload.returnValue ?
        this.target().runtimeModel.createRemoteObject(this._payload.returnValue) :
        null;
  },

  /**
     * @return {string}
     */
  get functionName() { return this._payload.functionName; },

  /**
     * @return {!WebInspector.DebuggerModel.Location}
     */
  location: function() { return this._location; },

  /**
     * @return {?WebInspector.DebuggerModel.Location}
     */
  functionLocation: function() { return this._functionLocation || null; },

  /**
   * @param {string} code
   * @param {string} objectGroup
   * @param {boolean} includeCommandLineAPI
   * @param {boolean} silent
   * @param {boolean} returnByValue
   * @param {boolean} generatePreview
   * @param {function(?RuntimeAgent.RemoteObject, !RuntimeAgent.ExceptionDetails=)} callback
   */
  evaluate: function(
      code, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview, callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {!RuntimeAgent.RemoteObject} result
     * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
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
        this._payload.callFrameId, code, objectGroup, includeCommandLineAPI, silent, returnByValue,
        generatePreview, didEvaluateOnCallFrame);
  },

  /**
   * @param {function(?Protocol.Error=)=} callback
   */
  restart: function(callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {!Array.<!DebuggerAgent.CallFrame>=} callFrames
     * @param {!RuntimeAgent.StackTrace=} asyncStackTrace
     * @this {WebInspector.DebuggerModel.CallFrame}
     */
    function protocolCallback(error, callFrames, asyncStackTrace) {
      if (!error)
        this.debuggerModel.stepInto();
      if (callback)
        callback(error);
    }
    this._debuggerAgent.restartFrame(this._payload.callFrameId, protocolCallback.bind(this));
  },

  /**
   * @param {function(!Object)} callback
   */
  variableNames: function(callback) {
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
  },

  __proto__: WebInspector.SDKObject.prototype
};

/**
 * @constructor
 * @param {!WebInspector.DebuggerModel.CallFrame} callFrame
 * @param {number} ordinal
 */
WebInspector.DebuggerModel.Scope = function(callFrame, ordinal) {
  this._callFrame = callFrame;
  this._payload = callFrame._payload.scopeChain[ordinal];
  this._type = this._payload.type;
  this._name = this._payload.name;
  this._ordinal = ordinal;
  this._startLocation = this._payload.startLocation ?
      WebInspector.DebuggerModel.Location.fromPayload(
          callFrame.debuggerModel, this._payload.startLocation) :
      null;
  this._endLocation = this._payload.endLocation ?
      WebInspector.DebuggerModel.Location.fromPayload(
          callFrame.debuggerModel, this._payload.endLocation) :
      null;
};

WebInspector.DebuggerModel.Scope.prototype = {
  /**
     * @return {!WebInspector.DebuggerModel.CallFrame}
     */
  callFrame: function() { return this._callFrame; },

  /**
     * @return {string}
     */
  type: function() { return this._type; },

  /**
     * @return {string|undefined}
     */
  name: function() { return this._name; },

  /**
     * @return {?WebInspector.DebuggerModel.Location}
     */
  startLocation: function() { return this._startLocation; },

  /**
     * @return {?WebInspector.DebuggerModel.Location}
     */
  endLocation: function() { return this._endLocation; },

  /**
     * @return {!WebInspector.RemoteObject}
     */
  object: function() {
    if (this._object)
      return this._object;
    var runtimeModel = this._callFrame.target().runtimeModel;

    var declarativeScope = this._type !== DebuggerAgent.ScopeType.With &&
        this._type !== DebuggerAgent.ScopeType.Global;
    if (declarativeScope)
      this._object = runtimeModel.createScopeRemoteObject(
          this._payload.object, new WebInspector.ScopeRef(this._ordinal, this._callFrame.id));
    else
      this._object = runtimeModel.createRemoteObject(this._payload.object);

    return this._object;
  },

  /**
     * @return {string}
     */
  description: function() {
    var declarativeScope = this._type !== DebuggerAgent.ScopeType.With &&
        this._type !== DebuggerAgent.ScopeType.Global;
    return declarativeScope ? '' : (this._payload.object.description || '');
  }
};

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!Array.<!DebuggerAgent.CallFrame>} callFrames
 * @param {string} reason
 * @param {!Object|undefined} auxData
 * @param {!Array.<string>} breakpointIds
 * @param {!RuntimeAgent.StackTrace=} asyncStackTrace
 */
WebInspector.DebuggerPausedDetails = function(
    debuggerModel, callFrames, reason, auxData, breakpointIds, asyncStackTrace) {
  WebInspector.SDKObject.call(this, debuggerModel.target());
  this.debuggerModel = debuggerModel;
  this.callFrames =
      WebInspector.DebuggerModel.CallFrame.fromPayloadArray(debuggerModel, callFrames);
  this.reason = reason;
  this.auxData = auxData;
  this.breakpointIds = breakpointIds;
  this.asyncStackTrace = asyncStackTrace;
};

WebInspector.DebuggerPausedDetails.prototype = {
  /**
     * @return {?WebInspector.RemoteObject}
     */
  exception: function() {
    if (this.reason !== WebInspector.DebuggerModel.BreakReason.Exception &&
        this.reason !== WebInspector.DebuggerModel.BreakReason.PromiseRejection)
      return null;
    return this.target().runtimeModel.createRemoteObject(
        /** @type {!RuntimeAgent.RemoteObject} */ (this.auxData));
  },

  __proto__: WebInspector.SDKObject.prototype
};

/**
 * @return {!Array<!WebInspector.DebuggerModel>}
 */
WebInspector.DebuggerModel.instances = function() {
  var result = [];
  for (var target of WebInspector.targetManager.targets()) {
    var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
    if (debuggerModel)
      result.push(debuggerModel);
  }
  return result;
};

/**
 * @param {?WebInspector.Target} target
 * @return {?WebInspector.DebuggerModel}
 */
WebInspector.DebuggerModel.fromTarget = function(target) {
  if (!target || !target.hasJSCapability())
    return null;
  return /** @type {?WebInspector.DebuggerModel} */ (target.model(WebInspector.DebuggerModel));
};
