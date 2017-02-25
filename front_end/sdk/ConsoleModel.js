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
SDK.ConsoleModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    /** @type {!Array.<!SDK.ConsoleMessage>} */
    this._messages = [];
    /** @type {!Map<number, !SDK.ConsoleMessage>} */
    this._messageByExceptionId = new Map();
    this._warnings = 0;
    this._errors = 0;
    /** @type {?Protocol.LogAgent} */
    this._logAgent = target.hasLogCapability() ? target.logAgent() : null;
    if (this._logAgent) {
      target.registerLogDispatcher(new SDK.LogDispatcher(this));
      this._logAgent.enable();
      if (!Host.isUnderTest()) {
        this._logAgent.startViolationsReport([
          {name: 'longTask', threshold: 200}, {name: 'longLayout', threshold: 30},
          {name: 'blockedEvent', threshold: 100}, {name: 'blockedParser', threshold: -1},
          {name: 'handler', threshold: 150}, {name: 'recurringHandler', threshold: 50},
          {name: 'discouragedAPIUse', threshold: -1}
        ]);
      }
    }
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
    target.consoleModel.addMessage(commandMessage);

    /**
     * @param {?SDK.RemoteObject} result
     * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
     */
    function printResult(result, exceptionDetails) {
      if (!result)
        return;

      Common.console.showPromise().then(reportUponEvaluation);
      function reportUponEvaluation() {
        target.consoleModel.dispatchEventToListeners(
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
   * @param {number} exceptionId
   */
  revokeException(exceptionId) {
    var exceptionMessage = this._messageByExceptionId.get(exceptionId);
    if (!exceptionMessage)
      return;
    this._errors--;
    exceptionMessage.level = SDK.ConsoleMessage.MessageLevel.Info;
    this.dispatchEventToListeners(SDK.ConsoleModel.Events.MessageUpdated, exceptionMessage);
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
    this._logAgent && this._logAgent.clear();
    this.clear();
  }

  clear() {
    this._messages = [];
    this._messageByExceptionId.clear();
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

SDK.SDKModel.register(SDK.ConsoleModel, SDK.Target.Capability.None);

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
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   * @return {string}
   */
  static simpleTextFromException(exceptionDetails) {
    var text = exceptionDetails.text;
    if (exceptionDetails.exception && exceptionDetails.exception.description) {
      var description = exceptionDetails.exception.description;
      if (description.indexOf('\n') !== -1)
        description = description.substring(0, description.indexOf('\n'));
      text += ' ' + description;
    }
    return text;
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
        SDK.ConsoleMessage.simpleTextFromException(exceptionDetails), messageType, forceUrl || exceptionDetails.url,
        exceptionDetails.lineNumber, exceptionDetails.columnNumber, undefined, exceptionDetails.exception ?
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
 * @implements {Protocol.LogDispatcher}
 * @unrestricted
 */
SDK.LogDispatcher = class {
  /**
   * @param {!SDK.ConsoleModel} console
   */
  constructor(console) {
    this._console = console;
  }

  /**
   * @override
   * @param {!Protocol.Log.LogEntry} payload
   */
  entryAdded(payload) {
    var consoleMessage = new SDK.ConsoleMessage(
        this._console.target(), payload.source, payload.level, payload.text, undefined, payload.url, payload.lineNumber,
        undefined, payload.networkRequestId, undefined, payload.stackTrace, payload.timestamp, undefined, undefined,
        payload.workerId);
    this._console.addMessage(consoleMessage);
  }
};

/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
SDK.MultitargetConsoleModel = class extends Common.Object {
  constructor() {
    super();
    SDK.targetManager.observeTargets(this);
    SDK.targetManager.addModelListener(
        SDK.ConsoleModel, SDK.ConsoleModel.Events.MessageAdded, this._consoleMessageAdded, this);
    SDK.targetManager.addModelListener(
        SDK.ConsoleModel, SDK.ConsoleModel.Events.MessageUpdated, this._consoleMessageUpdated, this);
    SDK.targetManager.addModelListener(
        SDK.ConsoleModel, SDK.ConsoleModel.Events.CommandEvaluated, this._commandEvaluated, this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (!this._mainTarget) {
      this._mainTarget = target;
      target.consoleModel.addEventListener(SDK.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    }
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    if (this._mainTarget === target) {
      delete this._mainTarget;
      target.consoleModel.removeEventListener(SDK.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    }
  }

  /**
   * @return {!Array.<!SDK.ConsoleMessage>}
   */
  messages() {
    var targets = SDK.targetManager.targets();
    var result = [];
    for (var i = 0; i < targets.length; ++i)
      result = result.concat(targets[i].consoleModel.messages());
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

/**
 * @type {!SDK.MultitargetConsoleModel}
 */
SDK.multitargetConsoleModel;
