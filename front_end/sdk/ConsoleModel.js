/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
SDK.ConsoleModel = class extends Common.Object {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super();
    this._target = target;

    /** @type {!Array.<!SDK.ConsoleMessage>} */
    this._messages = [];
    /** @type {!Map<number, !SDK.ConsoleMessage>} */
    this._messageByExceptionId = new Map();
    this._warnings = 0;
    this._errors = 0;

    var logModel = target.model(SDK.LogModel);
    if (logModel)
      logModel.on(SDK.LogModel.EntryAddedEvent, this._logEntryAdded, this);

    var cpuProfilerModel = target.model(SDK.CPUProfilerModel);
    if (cpuProfilerModel) {
      cpuProfilerModel.addEventListener(
          SDK.CPUProfilerModel.Events.ConsoleProfileStarted, this._consoleProfileStarted, this);
      cpuProfilerModel.addEventListener(
          SDK.CPUProfilerModel.Events.ConsoleProfileFinished, this._consoleProfileFinished, this);
    }

    var resourceTreeModel = target.model(SDK.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameStartedLoading, this._mainFrameStartedLoading, this);
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._mainFrameNavigated, this);
    }

    var runtimeModel = target.model(SDK.RuntimeModel);
    if (runtimeModel) {
      runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExceptionThrown, this._exceptionThrown, this);
      runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExceptionRevoked, this._exceptionRevoked, this);
      runtimeModel.addEventListener(SDK.RuntimeModel.Events.ConsoleAPICalled, this._consoleAPICalled, this);
    }

    var networkManager = target.model(SDK.NetworkManager);
    if (networkManager)
      networkManager.addEventListener(SDK.NetworkManager.Events.WarningGenerated, this._networkWarningGenerated, this);
  }

  /**
   * @return {!SDK.Target}
   */
  target() {
    return this._target;
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   * @param {string} text
   * @param {boolean} useCommandLineAPI
   */
  static evaluateCommandInConsole(executionContext, text, useCommandLineAPI) {
    var target = executionContext.target();
    var requestedText = text;

    var commandMessage = new SDK.ConsoleMessage(
        target, SDK.ConsoleMessage.MessageSource.JS, null, text, SDK.ConsoleMessage.MessageType.Command);
    commandMessage.setExecutionContextId(executionContext.id);
    SDK.multitargetConsoleModel.addMessage(commandMessage);

    /**
     * @param {?SDK.RemoteObject} result
     * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
     */
    function printResult(result, exceptionDetails) {
      if (!result)
        return;

      Common.console.showPromise().then(reportUponEvaluation);
      function reportUponEvaluation() {
        SDK.multitargetConsoleModel._consoleModels.get(target).dispatchEventToListeners(
            SDK.ConsoleModel.Events.CommandEvaluated,
            {result: result, text: requestedText, commandMessage: commandMessage, exceptionDetails: exceptionDetails});
      }
    }

    /**
     * @param {string} code
     * @suppress {uselessCode}
     * @return {boolean}
     */
    function looksLikeAnObjectLiteral(code) {
      // Only parenthesize what appears to be an object literal.
      if (!(/^\s*\{/.test(code) && /\}\s*$/.test(code)))
        return false;

      try {
        // Check if the code can be interpreted as an expression.
        Function('return ' + code + ';');

        // No syntax error! Does it work parenthesized?
        Function('(' + code + ')');

        return true;
      } catch (e) {
        return false;
      }
    }

    if (looksLikeAnObjectLiteral(text))
      text = '(' + text + ')';

    executionContext.evaluate(text, 'console', useCommandLineAPI, false, false, true, true, printResult);
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConsoleEvaluated);
  }

  /**
   * @param {!SDK.ConsoleMessage} msg
   */
  addMessage(msg) {
    if (msg.source === SDK.ConsoleMessage.MessageSource.Worker && SDK.targetManager.targetById(msg.workerId))
      return;

    if (msg.source === SDK.ConsoleMessage.MessageSource.ConsoleAPI && msg.type === SDK.ConsoleMessage.MessageType.Clear)
      this.clear();

    this._messages.push(msg);
    if (msg._exceptionId)
      this._messageByExceptionId.set(msg._exceptionId, msg);
    this._incrementErrorWarningCount(msg);
    this.dispatchEventToListeners(SDK.ConsoleModel.Events.MessageAdded, msg);
  }

  /**
   * @param {!SDK.LogModel.EntryAddedEvent} event
   */
  _logEntryAdded(event) {
    var consoleMessage = new SDK.ConsoleMessage(
        this.target(), event.entry.source, event.entry.level, event.entry.text, undefined, event.entry.url,
        event.entry.lineNumber, undefined, event.entry.networkRequestId, undefined, event.entry.stackTrace,
        event.entry.timestamp, undefined, undefined, event.entry.workerId);
    this.addMessage(consoleMessage);
  }

  /**
   * @param {!Common.Event} event
   */
  _exceptionThrown(event) {
    var exceptionWithTimestamp = /** @type {!SDK.RuntimeModel.ExceptionWithTimestamp} */ (event.data);
    var consoleMessage = SDK.ConsoleMessage.fromException(
        this.target(), exceptionWithTimestamp.details, undefined, exceptionWithTimestamp.timestamp, undefined);
    consoleMessage.setExceptionId(exceptionWithTimestamp.details.exceptionId);
    this.addMessage(consoleMessage);
  }

  /**
   * @param {!Common.Event} event
   */
  _exceptionRevoked(event) {
    var exceptionId = /** @type {number} */ (event.data);
    var exceptionMessage = this._messageByExceptionId.get(exceptionId);
    if (!exceptionMessage)
      return;
    this._errors--;
    exceptionMessage.level = SDK.ConsoleMessage.MessageLevel.Info;
    this.dispatchEventToListeners(SDK.ConsoleModel.Events.MessageUpdated, exceptionMessage);
  }

  /**
   * @param {!Common.Event} event
   */
  _consoleAPICalled(event) {
    var call = /** @type {!SDK.RuntimeModel.ConsoleAPICall} */ (event.data);
    var level = SDK.ConsoleMessage.MessageLevel.Info;
    if (call.type === SDK.ConsoleMessage.MessageType.Debug)
      level = SDK.ConsoleMessage.MessageLevel.Verbose;
    else if (call.type === SDK.ConsoleMessage.MessageType.Error || call.type === SDK.ConsoleMessage.MessageType.Assert)
      level = SDK.ConsoleMessage.MessageLevel.Error;
    else if (call.type === SDK.ConsoleMessage.MessageType.Warning)
      level = SDK.ConsoleMessage.MessageLevel.Warning;
    else if (call.type === SDK.ConsoleMessage.MessageType.Info || call.type === SDK.ConsoleMessage.MessageType.Log)
      level = SDK.ConsoleMessage.MessageLevel.Info;
    var message = '';
    if (call.args.length && typeof call.args[0].value === 'string')
      message = call.args[0].value;
    else if (call.args.length && call.args[0].description)
      message = call.args[0].description;
    var callFrame = call.stackTrace && call.stackTrace.callFrames.length ? call.stackTrace.callFrames[0] : null;
    var consoleMessage = new SDK.ConsoleMessage(
        this.target(), SDK.ConsoleMessage.MessageSource.ConsoleAPI, level,
        /** @type {string} */ (message), call.type, callFrame ? callFrame.url : undefined,
        callFrame ? callFrame.lineNumber : undefined, callFrame ? callFrame.columnNumber : undefined, undefined,
        call.args, call.stackTrace, call.timestamp, call.executionContextId, undefined);
    this.addMessage(consoleMessage);
  }

  /**
   * @param {!Common.Event} event
   */
  _mainFrameStartedLoading(event) {
    if (!Common.moduleSetting('preserveConsoleLog').get())
      this.clear();
  }

  /**
   * @param {!Common.Event} event
   */
  _mainFrameNavigated(event) {
    if (Common.moduleSetting('preserveConsoleLog').get())
      Common.console.log(Common.UIString('Navigated to %s', event.data.url));
  }

  /**
   * @param {!Common.Event} event
   */
  _consoleProfileStarted(event) {
    var data = /** @type {!SDK.CPUProfilerModel.EventData} */ (event.data);
    this._addConsoleProfileMessage(
        SDK.ConsoleMessage.MessageType.Profile, data.scriptLocation,
        Common.UIString('Profile \'%s\' started.', data.title));
  }

  /**
   * @param {!Common.Event} event
   */
  _consoleProfileFinished(event) {
    var data = /** @type {!SDK.CPUProfilerModel.EventData} */ (event.data);
    this._addConsoleProfileMessage(
        SDK.ConsoleMessage.MessageType.ProfileEnd, data.scriptLocation,
        Common.UIString('Profile \'%s\' finished.', data.title));
  }

  /**
   * @param {string} type
   * @param {!SDK.DebuggerModel.Location} scriptLocation
   * @param {string} messageText
   */
  _addConsoleProfileMessage(type, scriptLocation, messageText) {
    var stackTrace = [{
      functionName: '',
      scriptId: scriptLocation.scriptId,
      url: scriptLocation.script() ? scriptLocation.script().contentURL() : '',
      lineNumber: scriptLocation.lineNumber,
      columnNumber: scriptLocation.columnNumber || 0
    }];
    this.addMessage(new SDK.ConsoleMessage(
        this.target(), SDK.ConsoleMessage.MessageSource.ConsoleAPI, SDK.ConsoleMessage.MessageLevel.Info, messageText,
        type, undefined, undefined, undefined, undefined, stackTrace));
  }

  /**
   * @param {!Common.Event} event
   */
  _networkWarningGenerated(event) {
    var warning = /** @type {!SDK.NetworkManager.Warning} */ (event.data);
    this.addMessage(new SDK.ConsoleMessage(
        this.target(), SDK.ConsoleMessage.MessageSource.Network, SDK.ConsoleMessage.MessageLevel.Warning,
        warning.message, undefined, undefined, undefined, undefined, warning.requestId));
  }

  /**
   * @param {!SDK.ConsoleMessage} msg
   */
  _incrementErrorWarningCount(msg) {
    if (msg.source === SDK.ConsoleMessage.MessageSource.Violation)
      return;
    switch (msg.level) {
      case SDK.ConsoleMessage.MessageLevel.Warning:
        this._warnings++;
        break;
      case SDK.ConsoleMessage.MessageLevel.Error:
        this._errors++;
        break;
    }
  }

  /**
   * @return {!Array.<!SDK.ConsoleMessage>}
   */
  messages() {
    return this._messages;
  }

  requestClearMessages() {
    var logModel = this.target().model(SDK.LogModel);
    if (logModel)
      logModel.requestClear();
    this.clear();
    this.target().runtimeModel.discardConsoleEntries();
  }

  clear() {
    this._messages = [];
    this._messageByExceptionId.clear();
    // TODO(dgozman): clear exceptions and console api entries in runtimeModel.
    this._errors = 0;
    this._warnings = 0;
    this.dispatchEventToListeners(SDK.ConsoleModel.Events.ConsoleCleared);
  }

  /**
   * @return {number}
   */
  errors() {
    return this._errors;
  }

  /**
   * @return {number}
   */
  warnings() {
    return this._warnings;
  }
};

/** @enum {symbol} */
SDK.ConsoleModel.Events = {
  ConsoleCleared: Symbol('ConsoleCleared'),
  MessageAdded: Symbol('MessageAdded'),
  MessageUpdated: Symbol('MessageUpdated'),
  CommandEvaluated: Symbol('CommandEvaluated')
};


/**
 * @unrestricted
 */
SDK.ConsoleMessage = class {
  /**
   * @param {?SDK.Target} target
   * @param {string} source
   * @param {?string} level
   * @param {string} messageText
   * @param {string=} type
   * @param {?string=} url
   * @param {number=} line
   * @param {number=} column
   * @param {!Protocol.Network.RequestId=} requestId
   * @param {!Array.<!Protocol.Runtime.RemoteObject>=} parameters
   * @param {!Protocol.Runtime.StackTrace=} stackTrace
   * @param {number=} timestamp
   * @param {!Protocol.Runtime.ExecutionContextId=} executionContextId
   * @param {?string=} scriptId
   * @param {?string=} workerId
   */
  constructor(
      target,
      source,
      level,
      messageText,
      type,
      url,
      line,
      column,
      requestId,
      parameters,
      stackTrace,
      timestamp,
      executionContextId,
      scriptId,
      workerId) {
    this._target = target;
    this.source = source;
    this.level = /** @type {?SDK.ConsoleMessage.MessageLevel} */ (level);
    this.messageText = messageText;
    this.type = type || SDK.ConsoleMessage.MessageType.Log;
    /** @type {string|undefined} */
    this.url = url || undefined;
    /** @type {number} */
    this.line = line || 0;
    /** @type {number} */
    this.column = column || 0;
    this.parameters = parameters;
    /** @type {!Protocol.Runtime.StackTrace|undefined} */
    this.stackTrace = stackTrace;
    this.timestamp = timestamp || Date.now();
    this.executionContextId = executionContextId || 0;
    this.scriptId = scriptId || null;
    this.workerId = workerId || null;

    var networkLog = target && SDK.NetworkLog.fromTarget(target);
    this.request = (requestId && networkLog) ? networkLog.requestForId(requestId) : null;

    if (this.request) {
      var initiator = this.request.initiator();
      if (initiator) {
        this.stackTrace = initiator.stack || undefined;
        if (initiator.url) {
          this.url = initiator.url;
          this.line = initiator.lineNumber || 0;
        }
      }
    }
  }

  /**
   * @param {!SDK.ConsoleMessage} a
   * @param {!SDK.ConsoleMessage} b
   * @return {number}
   */
  static timestampComparator(a, b) {
    return a.timestamp - b.timestamp;
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   * @param {string=} messageType
   * @param {number=} timestamp
   * @param {string=} forceUrl
   * @return {!SDK.ConsoleMessage}
   */
  static fromException(target, exceptionDetails, messageType, timestamp, forceUrl) {
    return new SDK.ConsoleMessage(
        target, SDK.ConsoleMessage.MessageSource.JS, SDK.ConsoleMessage.MessageLevel.Error,
        SDK.RuntimeModel.simpleTextFromException(exceptionDetails), messageType, forceUrl || exceptionDetails.url,
        exceptionDetails.lineNumber, exceptionDetails.columnNumber, undefined,
        exceptionDetails.exception ?
            [SDK.RemoteObject.fromLocalObject(exceptionDetails.text), exceptionDetails.exception] :
            undefined,
        exceptionDetails.stackTrace, timestamp, exceptionDetails.executionContextId, exceptionDetails.scriptId);
  }

  /**
   * @return {?SDK.Target}
   */
  target() {
    return this._target;
  }

  /**
   * @param {!SDK.ConsoleMessage} originatingMessage
   */
  setOriginatingMessage(originatingMessage) {
    this._originatingConsoleMessage = originatingMessage;
    this.executionContextId = originatingMessage.executionContextId;
  }

  /**
   * @param {!Protocol.Runtime.ExecutionContextId} executionContextId
   */
  setExecutionContextId(executionContextId) {
    this.executionContextId = executionContextId;
  }

  /**
   * @param {number} exceptionId
   */
  setExceptionId(exceptionId) {
    this._exceptionId = exceptionId;
  }

  /**
   * @return {?SDK.ConsoleMessage}
   */
  originatingMessage() {
    return this._originatingConsoleMessage;
  }

  /**
   * @return {boolean}
   */
  isGroupMessage() {
    return this.type === SDK.ConsoleMessage.MessageType.StartGroup ||
        this.type === SDK.ConsoleMessage.MessageType.StartGroupCollapsed ||
        this.type === SDK.ConsoleMessage.MessageType.EndGroup;
  }

  /**
   * @return {boolean}
   */
  isGroupStartMessage() {
    return this.type === SDK.ConsoleMessage.MessageType.StartGroup ||
        this.type === SDK.ConsoleMessage.MessageType.StartGroupCollapsed;
  }

  /**
   * @return {boolean}
   */
  isErrorOrWarning() {
    return (
        this.level === SDK.ConsoleMessage.MessageLevel.Warning || this.level === SDK.ConsoleMessage.MessageLevel.Error);
  }

  /**
   * @param {?SDK.ConsoleMessage} msg
   * @return {boolean}
   */
  isEqual(msg) {
    if (!msg)
      return false;

    if (this._exceptionId || msg._exceptionId)
      return false;

    if (!this._isEqualStackTraces(this.stackTrace, msg.stackTrace))
      return false;

    if (this.parameters) {
      if (!msg.parameters || this.parameters.length !== msg.parameters.length)
        return false;

      for (var i = 0; i < msg.parameters.length; ++i) {
        // Never treat objects as equal - their properties might change over time.
        if (this.parameters[i].type !== msg.parameters[i].type || msg.parameters[i].type === 'object' ||
            this.parameters[i].value !== msg.parameters[i].value)
          return false;
      }
    }

    return (this.target() === msg.target()) && (this.source === msg.source) && (this.type === msg.type) &&
        (this.level === msg.level) && (this.line === msg.line) && (this.url === msg.url) &&
        (this.messageText === msg.messageText) && (this.request === msg.request) &&
        (this.executionContextId === msg.executionContextId);
  }

  /**
   * @param {!Protocol.Runtime.StackTrace|undefined} stackTrace1
   * @param {!Protocol.Runtime.StackTrace|undefined} stackTrace2
   * @return {boolean}
   */
  _isEqualStackTraces(stackTrace1, stackTrace2) {
    if (!stackTrace1 !== !stackTrace2)
      return false;
    if (!stackTrace1)
      return true;
    var callFrames1 = stackTrace1.callFrames;
    var callFrames2 = stackTrace2.callFrames;
    if (callFrames1.length !== callFrames2.length)
      return false;
    for (var i = 0, n = callFrames1.length; i < n; ++i) {
      if (callFrames1[i].url !== callFrames2[i].url || callFrames1[i].functionName !== callFrames2[i].functionName ||
          callFrames1[i].lineNumber !== callFrames2[i].lineNumber ||
          callFrames1[i].columnNumber !== callFrames2[i].columnNumber)
        return false;
    }
    return this._isEqualStackTraces(stackTrace1.parent, stackTrace2.parent);
  }
};

// Note: Keep these constants in sync with the ones in Console.h
/**
 * @enum {string}
 */
SDK.ConsoleMessage.MessageSource = {
  XML: 'xml',
  JS: 'javascript',
  Network: 'network',
  ConsoleAPI: 'console-api',
  Storage: 'storage',
  AppCache: 'appcache',
  Rendering: 'rendering',
  CSS: 'css',
  Security: 'security',
  Deprecation: 'deprecation',
  Worker: 'worker',
  Violation: 'violation',
  Intervention: 'intervention',
  Other: 'other'
};

/**
 * @enum {string}
 */
SDK.ConsoleMessage.MessageType = {
  Log: 'log',
  Debug: 'debug',
  Info: 'info',
  Error: 'error',
  Warning: 'warning',
  Dir: 'dir',
  DirXML: 'dirxml',
  Table: 'table',
  Trace: 'trace',
  Clear: 'clear',
  StartGroup: 'startGroup',
  StartGroupCollapsed: 'startGroupCollapsed',
  EndGroup: 'endGroup',
  Assert: 'assert',
  Result: 'result',
  Profile: 'profile',
  ProfileEnd: 'profileEnd',
  Command: 'command'
};

/**
 * @enum {string}
 */
SDK.ConsoleMessage.MessageLevel = {
  Verbose: 'verbose',
  Info: 'info',
  Warning: 'warning',
  Error: 'error'
};

/**
 * @param {!SDK.ConsoleMessage.MessageLevel} level
 * @return {number}
 */
SDK.ConsoleMessage.MessageLevel.ordinal = function(level) {
  if (level === SDK.ConsoleMessage.MessageLevel.Verbose)
    return 0;
  if (level === SDK.ConsoleMessage.MessageLevel.Info)
    return 1;
  if (level === SDK.ConsoleMessage.MessageLevel.Warning)
    return 2;
  return 3;
};

/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
SDK.MultitargetConsoleModel = class extends Common.Object {
  constructor() {
    super();
    /** @type {!Map<!SDK.Target, !SDK.ConsoleModel>} */
    this._consoleModels = new Map();
    SDK.targetManager.observeTargets(this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    var consoleModel = new SDK.ConsoleModel(target);
    this._consoleModels.set(target, consoleModel);
    consoleModel[SDK.MultitargetConsoleModel._events] = [
      consoleModel.addEventListener(SDK.ConsoleModel.Events.MessageAdded, this._consoleMessageAdded, this),
      consoleModel.addEventListener(SDK.ConsoleModel.Events.MessageUpdated, this._consoleMessageUpdated, this),
      consoleModel.addEventListener(SDK.ConsoleModel.Events.CommandEvaluated, this._commandEvaluated, this)
    ];

    if (!this._mainTarget) {
      this._mainTarget = target;
      consoleModel.addEventListener(SDK.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    }
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var consoleModel = this._consoleModels.get(target);
    this._consoleModels.delete(target);
    Common.EventTarget.removeEventListeners(consoleModel[SDK.MultitargetConsoleModel._events]);

    if (this._mainTarget === target) {
      delete this._mainTarget;
      consoleModel.removeEventListener(SDK.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    }
  }

  /**
   * @return {!Array.<!SDK.ConsoleMessage>}
   */
  messages() {
    var result = [];
    for (var consoleModel of this._consoleModels.values())
      result = result.concat(consoleModel.messages());
    return result;
  }

  requestClearMessages() {
    for (var consoleModel of this._consoleModels.values())
      consoleModel.requestClearMessages();
  }

  /**
   * @param {!SDK.ConsoleMessage} consoleMessage
   */
  addMessage(consoleMessage) {
    // TODO(dgozman): make target non-nullable, as we only have messages without a target
    // internally in ConsoleView.
    var target = /** @type {!SDK.Target} */ (consoleMessage.target());
    this._consoleModels.get(target).addMessage(consoleMessage);
  }

  /**
   * @return {number}
   */
  errors() {
    var result = 0;
    for (var consoleModel of this._consoleModels.values())
      result += consoleModel.errors();
    return result;
  }

  /**
   * @return {number}
   */
  warnings() {
    var result = 0;
    for (var consoleModel of this._consoleModels.values())
      result += consoleModel.warnings();
    return result;
  }

  _consoleCleared() {
    this.dispatchEventToListeners(SDK.ConsoleModel.Events.ConsoleCleared);
  }

  /**
   * @param {!Common.Event} event
   */
  _consoleMessageAdded(event) {
    this.dispatchEventToListeners(SDK.ConsoleModel.Events.MessageAdded, event.data);
  }

  /**
   * @param {!Common.Event} event
   */
  _consoleMessageUpdated(event) {
    this.dispatchEventToListeners(SDK.ConsoleModel.Events.MessageUpdated, event.data);
  }

  /**
   * @param {!Common.Event} event
   */
  _commandEvaluated(event) {
    this.dispatchEventToListeners(SDK.ConsoleModel.Events.CommandEvaluated, event.data);
  }
};

SDK.MultitargetConsoleModel._events = Symbol('SDK.MultitargetConsoleModel.events');

/**
 * @type {!SDK.MultitargetConsoleModel}
 */
SDK.multitargetConsoleModel;
