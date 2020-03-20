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

import * as Common from '../common/common.js';
import * as HostModule from '../host/host.js';

import {CPUProfilerModel, EventData, Events as CPUProfilerModelEvents} from './CPUProfilerModel.js';  // eslint-disable-line no-unused-vars
import {Events as DebuggerModelEvents, Location} from './DebuggerModel.js';  // eslint-disable-line no-unused-vars
import {LogModel} from './LogModel.js';
import {RemoteObject} from './RemoteObject.js';
import {Events as ResourceTreeModelEvents, ResourceTreeModel} from './ResourceTreeModel.js';
import {Events as RuntimeModelEvents, ExecutionContext, RuntimeModel} from './RuntimeModel.js';  // eslint-disable-line no-unused-vars
import {Observer, Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

const _events = Symbol('SDK.ConsoleModel.events');

/**
 * @type {!ConsoleModel}
 */
let settingsInstance;

/**
 * @implements {Observer}
 */
export class ConsoleModel extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @private
   */
  constructor() {
    super();

    /** @type {!Array.<!ConsoleMessage>} */
    this._messages = [];
    /** @type {!Map<!RuntimeModel, !Map<number, !ConsoleMessage>>} */
    this._messageByExceptionId = new Map();
    this._warnings = 0;
    this._errors = 0;
    this._violations = 0;
    this._pageLoadSequenceNumber = 0;

    TargetManager.instance().observeTargets(this);
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!settingsInstance || forceNew) {
      settingsInstance = new ConsoleModel();
    }

    return settingsInstance;
  }

  /**
   * @override
   * @param {!Target} target
   */
  targetAdded(target) {
    const resourceTreeModel = target.model(ResourceTreeModel);
    if (!resourceTreeModel || resourceTreeModel.cachedResourcesLoaded()) {
      this._initTarget(target);
      return;
    }

    const eventListener = resourceTreeModel.addEventListener(ResourceTreeModelEvents.CachedResourcesLoaded, () => {
      Common.EventTarget.EventTarget.removeEventListeners([eventListener]);
      this._initTarget(target);
    });
  }

  /**
   * @param {!Target} target
   */
  _initTarget(target) {
    const eventListeners = [];

    const cpuProfilerModel = target.model(CPUProfilerModel);
    if (cpuProfilerModel) {
      eventListeners.push(cpuProfilerModel.addEventListener(
          CPUProfilerModelEvents.ConsoleProfileStarted, this._consoleProfileStarted.bind(this, cpuProfilerModel)));
      eventListeners.push(cpuProfilerModel.addEventListener(
          CPUProfilerModelEvents.ConsoleProfileFinished, this._consoleProfileFinished.bind(this, cpuProfilerModel)));
    }

    const resourceTreeModel = target.model(ResourceTreeModel);
    if (resourceTreeModel && !target.parentTarget()) {
      eventListeners.push(resourceTreeModel.addEventListener(
          ResourceTreeModelEvents.MainFrameNavigated, this._mainFrameNavigated, this));
    }

    const runtimeModel = target.model(RuntimeModel);
    if (runtimeModel) {
      eventListeners.push(runtimeModel.addEventListener(
          RuntimeModelEvents.ExceptionThrown, this._exceptionThrown.bind(this, runtimeModel)));
      eventListeners.push(runtimeModel.addEventListener(
          RuntimeModelEvents.ExceptionRevoked, this._exceptionRevoked.bind(this, runtimeModel)));
      eventListeners.push(runtimeModel.addEventListener(
          RuntimeModelEvents.ConsoleAPICalled, this._consoleAPICalled.bind(this, runtimeModel)));
      if (!target.parentTarget()) {
        eventListeners.push(runtimeModel.debuggerModel().addEventListener(
            DebuggerModelEvents.GlobalObjectCleared, this._clearIfNecessary, this));
      }
      eventListeners.push(runtimeModel.addEventListener(
          RuntimeModelEvents.QueryObjectRequested, this._queryObjectRequested.bind(this, runtimeModel)));
    }

    target[_events] = eventListeners;
  }

  /**
   * @override
   * @param {!Target} target
   */
  targetRemoved(target) {
    const runtimeModel = target.model(RuntimeModel);
    if (runtimeModel) {
      this._messageByExceptionId.delete(runtimeModel);
    }
    Common.EventTarget.EventTarget.removeEventListeners(target[_events] || []);
  }

  /**
   * @param {!ExecutionContext} executionContext
   * @param {!ConsoleMessage} originatingMessage
   * @param {string} expression
   * @param {boolean} useCommandLineAPI
   */
  async evaluateCommandInConsole(executionContext, originatingMessage, expression, useCommandLineAPI) {
    const result = await executionContext.evaluate(
        {
          expression: expression,
          objectGroup: 'console',
          includeCommandLineAPI: useCommandLineAPI,
          silent: false,
          returnByValue: false,
          generatePreview: true,
          replMode: true
        },
        Common.Settings.Settings.instance().moduleSetting('consoleUserActivationEval').get(), /* awaitPromise */ false);
    HostModule.userMetrics.actionTaken(Host.UserMetrics.Action.ConsoleEvaluated);
    if (result.error) {
      return;
    }
    await Common.Console.Console.instance().showPromise();
    this.dispatchEventToListeners(
        Events.CommandEvaluated,
        {result: result.object, commandMessage: originatingMessage, exceptionDetails: result.exceptionDetails});
  }

  /**
   * @param {!ExecutionContext} executionContext
   * @param {string} text
   * @return {!ConsoleMessage}
   */
  addCommandMessage(executionContext, text) {
    const commandMessage =
        new ConsoleMessage(executionContext.runtimeModel, MessageSource.JS, null, text, MessageType.Command);
    commandMessage.setExecutionContextId(executionContext.id);
    this.addMessage(commandMessage);
    return commandMessage;
  }

  /**
   * @param {!ConsoleMessage} msg
   */
  addMessage(msg) {
    msg._pageLoadSequenceNumber = this._pageLoadSequenceNumber;
    if (msg.source === MessageSource.ConsoleAPI && msg.type === MessageType.Clear) {
      this._clearIfNecessary();
    }

    this._messages.push(msg);
    const runtimeModel = msg.runtimeModel();
    if (msg._exceptionId && runtimeModel) {
      let modelMap = this._messageByExceptionId.get(runtimeModel);
      if (!modelMap) {
        modelMap = new Map();
        this._messageByExceptionId.set(runtimeModel, modelMap);
      }
      modelMap.set(msg._exceptionId, msg);
    }
    this._incrementErrorWarningCount(msg);
    this.dispatchEventToListeners(Events.MessageAdded, msg);
  }

  /**
   * @param {!RuntimeModel} runtimeModel
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _exceptionThrown(runtimeModel, event) {
    const exceptionWithTimestamp = /** @type {!ExceptionWithTimestamp} */ (event.data);
    const consoleMessage = ConsoleMessage.fromException(
        runtimeModel, exceptionWithTimestamp.details, undefined, exceptionWithTimestamp.timestamp, undefined);
    consoleMessage.setExceptionId(exceptionWithTimestamp.details.exceptionId);
    this.addMessage(consoleMessage);
  }

  /**
   * @param {!RuntimeModel} runtimeModel
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _exceptionRevoked(runtimeModel, event) {
    const exceptionId = /** @type {number} */ (event.data);
    const modelMap = this._messageByExceptionId.get(runtimeModel);
    const exceptionMessage = modelMap ? modelMap.get(exceptionId) : null;
    if (!exceptionMessage) {
      return;
    }
    this._errors--;
    exceptionMessage.level = MessageLevel.Verbose;
    this.dispatchEventToListeners(Events.MessageUpdated, exceptionMessage);
  }

  /**
   * @param {!RuntimeModel} runtimeModel
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _consoleAPICalled(runtimeModel, event) {
    const call = /** @type {!ConsoleAPICall} */ (event.data);
    let level = MessageLevel.Info;
    if (call.type === MessageType.Debug) {
      level = MessageLevel.Verbose;
    } else if (call.type === MessageType.Error || call.type === MessageType.Assert) {
      level = MessageLevel.Error;
    } else if (call.type === MessageType.Warning) {
      level = MessageLevel.Warning;
    } else if (call.type === MessageType.Info || call.type === MessageType.Log) {
      level = MessageLevel.Info;
    }
    let message = '';
    if (call.args.length && call.args[0].unserializableValue) {
      message = call.args[0].unserializableValue;
    } else if (call.args.length && (typeof call.args[0].value !== 'object' || call.args[0].value === null)) {
      message = call.args[0].value + '';
    } else if (call.args.length && call.args[0].description) {
      message = call.args[0].description;
    }
    const callFrame = call.stackTrace && call.stackTrace.callFrames.length ? call.stackTrace.callFrames[0] : null;
    const consoleMessage = new ConsoleMessage(
        runtimeModel, MessageSource.ConsoleAPI, level,
        /** @type {string} */ (message), call.type, callFrame ? callFrame.url : undefined,
        callFrame ? callFrame.lineNumber : undefined, callFrame ? callFrame.columnNumber : undefined, call.args,
        call.stackTrace, call.timestamp, call.executionContextId, undefined, undefined, call.context);
    this.addMessage(consoleMessage);
  }

  /**
   * @param {!RuntimeModel} runtimeModel
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _queryObjectRequested(runtimeModel, event) {
    const consoleMessage = new ConsoleMessage(
        runtimeModel, MessageSource.ConsoleAPI, MessageLevel.Info, '', MessageType.QueryObjectResult, undefined,
        undefined, undefined, [event.data.objects]);
    this.addMessage(consoleMessage);
  }

  _clearIfNecessary() {
    if (!Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog').get()) {
      this._clear();
    }
    ++this._pageLoadSequenceNumber;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _mainFrameNavigated(event) {
    if (Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog').get()) {
      Common.Console.Console.instance().log(Common.UIString.UIString('Navigated to %s', event.data.url));
    }
  }

  /**
   * @param {!CPUProfilerModel} cpuProfilerModel
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _consoleProfileStarted(cpuProfilerModel, event) {
    const data = /** @type {!EventData} */ (event.data);
    this._addConsoleProfileMessage(
        cpuProfilerModel, MessageType.Profile, data.scriptLocation,
        Common.UIString.UIString('Profile \'%s\' started.', data.title));
  }

  /**
   * @param {!CPUProfilerModel} cpuProfilerModel
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _consoleProfileFinished(cpuProfilerModel, event) {
    const data = /** @type {!EventData} */ (event.data);
    this._addConsoleProfileMessage(
        cpuProfilerModel, MessageType.ProfileEnd, data.scriptLocation,
        Common.UIString.UIString('Profile \'%s\' finished.', data.title));
  }

  /**
   * @param {!CPUProfilerModel} cpuProfilerModel
   * @param {string} type
   * @param {!Location} scriptLocation
   * @param {string} messageText
   */
  _addConsoleProfileMessage(cpuProfilerModel, type, scriptLocation, messageText) {
    const stackTrace = [{
      functionName: '',
      scriptId: scriptLocation.scriptId,
      url: scriptLocation.script() ? scriptLocation.script().contentURL() : '',
      lineNumber: scriptLocation.lineNumber,
      columnNumber: scriptLocation.columnNumber || 0
    }];
    this.addMessage(new ConsoleMessage(
        cpuProfilerModel.runtimeModel(), MessageSource.ConsoleAPI, MessageLevel.Info, messageText, type, undefined,
        undefined, undefined, stackTrace));
  }

  /**
   * @param {!ConsoleMessage} msg
   */
  _incrementErrorWarningCount(msg) {
    if (msg.source === MessageSource.Violation) {
      this._violations++;
      return;
    }
    switch (msg.level) {
      case MessageLevel.Warning:
        this._warnings++;
        break;
      case MessageLevel.Error:
        this._errors++;
        break;
    }
  }

  /**
   * @return {!Array.<!ConsoleMessage>}
   */
  messages() {
    return this._messages;
  }

  requestClearMessages() {
    for (const logModel of TargetManager.instance().models(LogModel)) {
      logModel.requestClear();
    }
    for (const runtimeModel of TargetManager.instance().models(RuntimeModel)) {
      runtimeModel.discardConsoleEntries();
    }
    this._clear();
  }

  _clear() {
    this._messages = [];
    this._messageByExceptionId.clear();
    this._errors = 0;
    this._warnings = 0;
    this._violations = 0;
    this.dispatchEventToListeners(Events.ConsoleCleared);
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

  /**
   * @return {number}
   */
  violations() {
    return this._violations;
  }

  /**
   * @param {?ExecutionContext} currentExecutionContext
   * @param {?RemoteObject} remoteObject
   */
  async saveToTempVariable(currentExecutionContext, remoteObject) {
    if (!remoteObject || !currentExecutionContext) {
      failedToSave(null);
      return;
    }
    const executionContext = /** @type {!ExecutionContext} */ (currentExecutionContext);

    const result = await executionContext.globalObject(/* objectGroup */ '', /* generatePreview */ false);
    if (!!result.exceptionDetails || !result.object) {
      failedToSave(result.object || null);
      return;
    }

    const globalObject = result.object;
    const callFunctionResult =
        await globalObject.callFunction(saveVariable, [RemoteObject.toCallArgument(remoteObject)]);
    globalObject.release();
    if (callFunctionResult.wasThrown || !callFunctionResult.object || callFunctionResult.object.type !== 'string') {
      failedToSave(callFunctionResult.object || null);
    } else {
      const text = /** @type {string} */ (callFunctionResult.object.value);
      const message = this.addCommandMessage(executionContext, text);
      this.evaluateCommandInConsole(executionContext, message, text, /* useCommandLineAPI */ false);
    }
    if (callFunctionResult.object) {
      callFunctionResult.object.release();
    }

    /**
     * @suppressReceiverCheck
     * @this {Window}
     */
    function saveVariable(value) {
      const prefix = 'temp';
      let index = 1;
      while ((prefix + index) in this) {
        ++index;
      }
      const name = prefix + index;
      this[name] = value;
      return name;
    }

    /**
     * @param {?RemoteObject} result
     */
    function failedToSave(result) {
      let message = Common.UIString.UIString('Failed to save to temp variable.');
      if (result) {
        message += ' ' + result.description;
      }
      Common.Console.Console.instance().error(message);
    }
  }
}

/** @enum {symbol} */
export const Events = {
  ConsoleCleared: Symbol('ConsoleCleared'),
  MessageAdded: Symbol('MessageAdded'),
  MessageUpdated: Symbol('MessageUpdated'),
  CommandEvaluated: Symbol('CommandEvaluated')
};


/**
 * @unrestricted
 */
export class ConsoleMessage {
  /**
   * @param {?RuntimeModel} runtimeModel
   * @param {string} source
   * @param {?string} level
   * @param {string} messageText
   * @param {string=} type
   * @param {?string=} url
   * @param {number=} line
   * @param {number=} column
   * @param {!Array.<!Protocol.Runtime.RemoteObject>=} parameters
   * @param {!Protocol.Runtime.StackTrace=} stackTrace
   * @param {number=} timestamp
   * @param {!Protocol.Runtime.ExecutionContextId=} executionContextId
   * @param {?string=} scriptId
   * @param {?string=} workerId
   * @param {string=} context
   */
  constructor(
      runtimeModel, source, level, messageText, type, url, line, column, parameters, stackTrace, timestamp,
      executionContextId, scriptId, workerId, context) {
    this._runtimeModel = runtimeModel;
    this.source = source;
    this.level = /** @type {?MessageLevel} */ (level);
    this.messageText = messageText;
    this.type = type || MessageType.Log;
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

    if (!this.executionContextId && this._runtimeModel) {
      if (this.scriptId) {
        this.executionContextId = this._runtimeModel.executionContextIdForScriptId(this.scriptId);
      } else if (this.stackTrace) {
        this.executionContextId = this._runtimeModel.executionContextForStackTrace(this.stackTrace);
      }
    }

    if (context) {
      this.context = context.match(/[^#]*/)[0];
    }
  }

  /**
   * @param {!RuntimeModel} runtimeModel
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   * @param {string=} messageType
   * @param {number=} timestamp
   * @param {string=} forceUrl
   * @return {!ConsoleMessage}
   */
  static fromException(runtimeModel, exceptionDetails, messageType, timestamp, forceUrl) {
    return new ConsoleMessage(
        runtimeModel, MessageSource.JS, MessageLevel.Error, RuntimeModel.simpleTextFromException(exceptionDetails),
        messageType, forceUrl || exceptionDetails.url, exceptionDetails.lineNumber, exceptionDetails.columnNumber,
        exceptionDetails.exception ? [RemoteObject.fromLocalObject(exceptionDetails.text), exceptionDetails.exception] :
                                     undefined,
        exceptionDetails.stackTrace, timestamp, exceptionDetails.executionContextId, exceptionDetails.scriptId);
  }

  /**
   * @return {?RuntimeModel}
   */
  runtimeModel() {
    return this._runtimeModel;
  }

  /**
   * @return {?Target}
   */
  target() {
    return this._runtimeModel ? this._runtimeModel.target() : null;
  }

  /**
   * @param {!ConsoleMessage} originatingMessage
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
   * @return {?ConsoleMessage}
   */
  originatingMessage() {
    return this._originatingConsoleMessage;
  }

  /**
   * @return {boolean}
   */
  isGroupMessage() {
    return this.type === MessageType.StartGroup || this.type === MessageType.StartGroupCollapsed ||
        this.type === MessageType.EndGroup;
  }

  /**
   * @return {boolean}
   */
  isGroupStartMessage() {
    return this.type === MessageType.StartGroup || this.type === MessageType.StartGroupCollapsed;
  }

  /**
   * @return {boolean}
   */
  isErrorOrWarning() {
    return (this.level === MessageLevel.Warning || this.level === MessageLevel.Error);
  }

  /**
   * @return {boolean}
   */
  isGroupable() {
    const isUngroupableError = this.level === MessageLevel.Error &&
        (this.source === MessageSource.JS || this.source === MessageSource.Network);
    return (
        this.source !== MessageSource.ConsoleAPI && this.type !== MessageType.Command &&
        this.type !== MessageType.Result && this.type !== MessageType.System && !isUngroupableError);
  }

  /**
   * @return {string}
   */
  groupCategoryKey() {
    return [this.source, this.level, this.type, this._pageLoadSequenceNumber].join(':');
  }

  /**
   * @param {?ConsoleMessage} msg
   * @return {boolean}
   */
  isEqual(msg) {
    if (!msg) {
      return false;
    }

    if (!this._isEqualStackTraces(this.stackTrace, msg.stackTrace)) {
      return false;
    }

    if (this.parameters) {
      if (!msg.parameters || this.parameters.length !== msg.parameters.length) {
        return false;
      }

      for (let i = 0; i < msg.parameters.length; ++i) {
        // Never treat objects as equal - their properties might change over time. Errors can be treated as equal
        // since they are always formatted as strings.
        if (msg.parameters[i].type === 'object' && msg.parameters[i].subtype !== 'error') {
          return false;
        }
        if (this.parameters[i].type !== msg.parameters[i].type ||
            this.parameters[i].value !== msg.parameters[i].value ||
            this.parameters[i].description !== msg.parameters[i].description) {
          return false;
        }
      }
    }

    return (this.runtimeModel() === msg.runtimeModel()) && (this.source === msg.source) && (this.type === msg.type) &&
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
    if (!stackTrace1 !== !stackTrace2) {
      return false;
    }
    if (!stackTrace1) {
      return true;
    }
    const callFrames1 = stackTrace1.callFrames;
    const callFrames2 = stackTrace2.callFrames;
    if (callFrames1.length !== callFrames2.length) {
      return false;
    }
    for (let i = 0, n = callFrames1.length; i < n; ++i) {
      if (callFrames1[i].url !== callFrames2[i].url || callFrames1[i].functionName !== callFrames2[i].functionName ||
          callFrames1[i].lineNumber !== callFrames2[i].lineNumber ||
          callFrames1[i].columnNumber !== callFrames2[i].columnNumber) {
        return false;
      }
    }
    return this._isEqualStackTraces(stackTrace1.parent, stackTrace2.parent);
  }
}

// Note: Keep these constants in sync with the ones in ConsoleTypes.h
/**
 * @enum {string}
 */
export const MessageSource = {
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
  Recommendation: 'recommendation',
  Other: 'other'
};

/**
 * @enum {string}
 */
export const MessageType = {
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
  Command: 'command',
  System: 'system',
  QueryObjectResult: 'queryObjectResult'
};

/**
 * @enum {string}
 */
export const MessageLevel = {
  Verbose: 'verbose',
  Info: 'info',
  Warning: 'warning',
  Error: 'error'
};

/** @type {!Map<!MessageSource, string>} */
export const MessageSourceDisplayName = new Map([
  [MessageSource.XML, 'xml'], [MessageSource.JS, 'javascript'], [MessageSource.Network, 'network'],
  [MessageSource.ConsoleAPI, 'console-api'], [MessageSource.Storage, 'storage'], [MessageSource.AppCache, 'appcache'],
  [MessageSource.Rendering, 'rendering'], [MessageSource.CSS, 'css'], [MessageSource.Security, 'security'],
  [MessageSource.Deprecation, 'deprecation'], [MessageSource.Worker, 'worker'], [MessageSource.Violation, 'violation'],
  [MessageSource.Intervention, 'intervention'], [MessageSource.Recommendation, 'recommendation'],
  [MessageSource.Other, 'other']
]);

/**
 * @typedef {{
  *    type: string,
  *    args: !Array<!Protocol.Runtime.RemoteObject>,
  *    executionContextId: number,
  *    timestamp: number,
  *    stackTrace: (!Protocol.Runtime.StackTrace|undefined)
  * }}
  */
export let ConsoleAPICall;

/** @typedef {{timestamp: number, details: !Protocol.Runtime.ExceptionDetails}} */
export let ExceptionWithTimestamp;
