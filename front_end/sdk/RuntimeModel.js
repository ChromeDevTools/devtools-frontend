/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

import {DebuggerModel, FunctionDetails} from './DebuggerModel.js';  // eslint-disable-line no-unused-vars
import {HeapProfilerModel} from './HeapProfilerModel.js';
import {RemoteFunction, RemoteObject,
        RemoteObjectImpl,  // eslint-disable-line no-unused-vars
        RemoteObjectProperty, ScopeRef, ScopeRemoteObject,} from './RemoteObject.js';  // eslint-disable-line no-unused-vars
import {Capability, SDKModel, Target, Type} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class RuntimeModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);

    this._agent = target.runtimeAgent();
    this.target().registerRuntimeDispatcher(new RuntimeDispatcher(this));
    this._agent.enable();
    /** @type {!Map<number, !ExecutionContext>} */
    this._executionContextById = new Map();
    this._executionContextComparator = ExecutionContext.comparator;
    /** @type {?boolean} */
    this._hasSideEffectSupport = null;

    if (Common.Settings.Settings.instance().moduleSetting('customFormatters').get()) {
      this._agent.setCustomObjectFormatterEnabled(true);
    }

    Common.Settings.Settings.instance()
        .moduleSetting('customFormatters')
        .addChangeListener(this._customFormattersStateChanged.bind(this));
  }

  /**
   * @param {!EvaluationResult} response
   * @return {boolean}
   */
  static isSideEffectFailure(response) {
    const exceptionDetails = !response[ProtocolClient.InspectorBackend.ProtocolError] && response.exceptionDetails;
    return !!(
        exceptionDetails && exceptionDetails.exception && exceptionDetails.exception.description &&
        exceptionDetails.exception.description.startsWith('EvalError: Possible side-effect in debug-evaluate'));
  }

  /**
   * @return {!DebuggerModel}
   */
  debuggerModel() {
    return /** @type {!DebuggerModel} */ (this.target().model(DebuggerModel));
  }

  /**
   * @return {!HeapProfilerModel}
   */
  heapProfilerModel() {
    return /** @type {!HeapProfilerModel} */ (this.target().model(HeapProfilerModel));
  }

  /**
   * @return {!Array.<!ExecutionContext>}
   */
  executionContexts() {
    return [...this._executionContextById.values()].sort(this.executionContextComparator());
  }

  /**
   * @param {function(!ExecutionContext,!ExecutionContext)} comparator
   */
  setExecutionContextComparator(comparator) {
    this._executionContextComparator = comparator;
  }

  /**
   * @return {function(!ExecutionContext,!ExecutionContext)} comparator
   */
  executionContextComparator() {
    return this._executionContextComparator;
  }

  /**
   * @return {?ExecutionContext}
   */
  defaultExecutionContext() {
    for (const context of this.executionContexts()) {
      if (context.isDefault) {
        return context;
      }
    }
    return null;
  }

  /**
   * @param {!Protocol.Runtime.ExecutionContextId} id
   * @return {?ExecutionContext}
   */
  executionContext(id) {
    return this._executionContextById.get(id) || null;
  }

  /**
   * @param {!Protocol.Runtime.ExecutionContextDescription} context
   */
  _executionContextCreated(context) {
    const data = context.auxData || {isDefault: true};
    const executionContext =
        new ExecutionContext(this, context.id, context.name, context.origin, data['isDefault'], data['frameId']);
    this._executionContextById.set(executionContext.id, executionContext);
    this.dispatchEventToListeners(Events.ExecutionContextCreated, executionContext);
  }

  /**
   * @param {number} executionContextId
   */
  _executionContextDestroyed(executionContextId) {
    const executionContext = this._executionContextById.get(executionContextId);
    if (!executionContext) {
      return;
    }
    this.debuggerModel().executionContextDestroyed(executionContext);
    this._executionContextById.delete(executionContextId);
    this.dispatchEventToListeners(Events.ExecutionContextDestroyed, executionContext);
  }

  fireExecutionContextOrderChanged() {
    this.dispatchEventToListeners(Events.ExecutionContextOrderChanged, this);
  }

  _executionContextsCleared() {
    this.debuggerModel().globalObjectCleared();
    const contexts = this.executionContexts();
    this._executionContextById.clear();
    for (let i = 0; i < contexts.length; ++i) {
      this.dispatchEventToListeners(Events.ExecutionContextDestroyed, contexts[i]);
    }
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @return {!RemoteObject}
   */
  createRemoteObject(payload) {
    console.assert(typeof payload === 'object', 'Remote object payload should only be an object');
    return new RemoteObjectImpl(
        this, payload.objectId, payload.type, payload.subtype, payload.value, payload.unserializableValue,
        payload.description, payload.preview, payload.customPreview, payload.className);
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @param {!ScopeRef} scopeRef
   * @return {!RemoteObject}
   */
  createScopeRemoteObject(payload, scopeRef) {
    return new ScopeRemoteObject(
        this, payload.objectId, scopeRef, payload.type, payload.subtype, payload.value, payload.unserializableValue,
        payload.description, payload.preview);
  }

  /**
   * @param {number|string|boolean|undefined|bigint} value
   * @return {!RemoteObject}
   */
  createRemoteObjectFromPrimitiveValue(value) {
    const type = typeof value;
    let unserializableValue = undefined;
    const unserializableDescription = RemoteObject.unserializableDescription(value);
    if (unserializableDescription !== null) {
      unserializableValue = /** @type {!Protocol.Runtime.UnserializableValue} */ (unserializableDescription);
    }
    if (typeof unserializableValue !== 'undefined') {
      value = undefined;
    }
    return new RemoteObjectImpl(this, undefined, type, undefined, value, unserializableValue);
  }

  /**
   * @param {string} name
   * @param {number|string|boolean} value
   * @return {!RemoteObjectProperty}
   */
  createRemotePropertyFromPrimitiveValue(name, value) {
    return new RemoteObjectProperty(name, this.createRemoteObjectFromPrimitiveValue(value));
  }

  discardConsoleEntries() {
    this._agent.discardConsoleEntries();
  }

  /**
   * @param {string} objectGroupName
   */
  releaseObjectGroup(objectGroupName) {
    this._agent.releaseObjectGroup(objectGroupName);
  }

  /**
   * @param {!EvaluationResult} result
   */
  releaseEvaluationResult(result) {
    if (result.object) {
      result.object.release();
    }
    if (result.exceptionDetails && result.exceptionDetails.exception) {
      const exception = result.exceptionDetails.exception;
      const exceptionObject = this.createRemoteObject({type: exception.type, objectId: exception.objectId});
      exceptionObject.release();
    }
  }

  runIfWaitingForDebugger() {
    this._agent.runIfWaitingForDebugger();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _customFormattersStateChanged(event) {
    const enabled = /** @type {boolean} */ (event.data);
    this._agent.setCustomObjectFormatterEnabled(enabled);
  }

  /**
   * @param {string} expression
   * @param {string} sourceURL
   * @param {boolean} persistScript
   * @param {number} executionContextId
   * @return {!Promise<?CompileScriptResult>}
   */
  async compileScript(expression, sourceURL, persistScript, executionContextId) {
    const response = await this._agent.invoke_compileScript({
      expression: expression,
      sourceURL: sourceURL,
      persistScript: persistScript,
      executionContextId: executionContextId,
    });

    if (response[ProtocolClient.InspectorBackend.ProtocolError]) {
      console.error(response[ProtocolClient.InspectorBackend.ProtocolError]);
      return null;
    }
    return {scriptId: response.scriptId, exceptionDetails: response.exceptionDetails};
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {number} executionContextId
   * @param {string=} objectGroup
   * @param {boolean=} silent
   * @param {boolean=} includeCommandLineAPI
   * @param {boolean=} returnByValue
   * @param {boolean=} generatePreview
   * @param {boolean=} awaitPromise
   * @return {!Promise<!EvaluationResult>}
   */
  async runScript(
      scriptId, executionContextId, objectGroup, silent, includeCommandLineAPI, returnByValue, generatePreview,
      awaitPromise) {
    const response = await this._agent.invoke_runScript({
      scriptId,
      executionContextId,
      objectGroup,
      silent,
      includeCommandLineAPI,
      returnByValue,
      generatePreview,
      awaitPromise,
    });

    const error = response[ProtocolClient.InspectorBackend.ProtocolError];
    if (error) {
      console.error(error);
      return {error: error};
    }
    return {object: this.createRemoteObject(response.result), exceptionDetails: response.exceptionDetails};
  }

  /**
   * @param {!RemoteObject} prototype
   * @return {!Promise<!QueryObjectResult>}
   */
  async queryObjects(prototype) {
    if (!prototype.objectId) {
      return {error: 'Prototype should be an Object.'};
    }
    const response = await this._agent.invoke_queryObjects(
        {prototypeObjectId: /** @type {string} */ (prototype.objectId), objectGroup: 'console'});
    const error = response[ProtocolClient.InspectorBackend.ProtocolError];
    if (error) {
      console.error(error);
      return {error: error};
    }
    return {objects: this.createRemoteObject(response.objects)};
  }

  /**
   * @return {!Promise<string>}
   */
  async isolateId() {
    return (await this._agent.getIsolateId()) || this.target().id();
  }

  /**
   * @return {!Promise<?{usedSize: number, totalSize: number}>}
   */
  async heapUsage() {
    const result = await this._agent.invoke_getHeapUsage({});
    return result[ProtocolClient.InspectorBackend.ProtocolError] ? null : result;
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @param {!Object=} hints
   */
  _inspectRequested(payload, hints) {
    const object = this.createRemoteObject(payload);

    if (hints.copyToClipboard) {
      this._copyRequested(object);
      return;
    }

    if (hints.queryObjects) {
      this._queryObjectsRequested(object);
      return;
    }

    if (object.isNode()) {
      Common.Revealer.reveal(object).then(object.release.bind(object));
      return;
    }

    if (object.type === 'function') {
      RemoteFunction.objectAsFunction(object).targetFunctionDetails().then(didGetDetails);
      return;
    }

    /**
     * @param {?FunctionDetails} response
     */
    function didGetDetails(response) {
      object.release();
      if (!response || !response.location) {
        return;
      }
      Common.Revealer.reveal(response.location);
    }
    object.release();
  }

  /**
   * @param {!RemoteObject} object
   */
  _copyRequested(object) {
    if (!object.objectId) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(
          object.unserializableValue() || /** @type {string} */ (object.value));
      return;
    }
    object.callFunctionJSON(toStringForClipboard, [{value: object.subtype}])
        .then(Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance));

    /**
     * @param {string} subtype
     * @this {Object}
     * @suppressReceiverCheck
     */
    function toStringForClipboard(subtype) {
      if (subtype === 'node') {
        return this.outerHTML;
      }
      if (subtype && typeof this === 'undefined') {
        return subtype + '';
      }
      try {
        return JSON.stringify(this, null, '  ');
      } catch (e) {
        return '' + this;
      }
    }
  }

  /**
   * @param {!RemoteObject} object
   */
  async _queryObjectsRequested(object) {
    const result = await this.queryObjects(object);
    object.release();
    if (result.error) {
      Common.Console.Console.instance().error(result.error);
      return;
    }
    this.dispatchEventToListeners(Events.QueryObjectRequested, {objects: result.objects});
  }

  /**
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   * @return {string}
   */
  static simpleTextFromException(exceptionDetails) {
    let text = exceptionDetails.text;
    if (exceptionDetails.exception && exceptionDetails.exception.description) {
      let description = exceptionDetails.exception.description;
      if (description.indexOf('\n') !== -1) {
        description = description.substring(0, description.indexOf('\n'));
      }
      text += ' ' + description;
    }
    return text;
  }

  /**
   * @param {number} timestamp
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   */
  exceptionThrown(timestamp, exceptionDetails) {
    const exceptionWithTimestamp = {timestamp: timestamp, details: exceptionDetails};
    this.dispatchEventToListeners(Events.ExceptionThrown, exceptionWithTimestamp);
  }

  /**
   * @param {number} exceptionId
   */
  _exceptionRevoked(exceptionId) {
    this.dispatchEventToListeners(Events.ExceptionRevoked, exceptionId);
  }

  /**
   * @param {string} type
   * @param {!Array.<!Protocol.Runtime.RemoteObject>} args
   * @param {number} executionContextId
   * @param {number} timestamp
   * @param {!Protocol.Runtime.StackTrace=} stackTrace
   * @param {string=} context
   */
  _consoleAPICalled(type, args, executionContextId, timestamp, stackTrace, context) {
    const consoleAPICall = {
      type: type,
      args: args,
      executionContextId: executionContextId,
      timestamp: timestamp,
      stackTrace: stackTrace,
      context: context,
    };
    this.dispatchEventToListeners(Events.ConsoleAPICalled, consoleAPICall);
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @return {number}
   */
  executionContextIdForScriptId(scriptId) {
    const script = this.debuggerModel().scriptForId(scriptId);
    return script ? script.executionContextId : 0;
  }

  /**
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   * @return {number}
   */
  executionContextForStackTrace(stackTrace) {
    while (stackTrace && !stackTrace.callFrames.length) {
      stackTrace = stackTrace.parent;
    }
    if (!stackTrace || !stackTrace.callFrames.length) {
      return 0;
    }
    return this.executionContextIdForScriptId(stackTrace.callFrames[0].scriptId);
  }

  /**
   * @return {?boolean}
   */
  hasSideEffectSupport() {
    return this._hasSideEffectSupport;
  }

  /**
   * @return {!Promise<boolean>}
   */
  async checkSideEffectSupport() {
    const testContext = this.executionContexts().peekLast();
    if (!testContext) {
      return false;
    }
    // Check for a positive throwOnSideEffect response without triggering side effects.
    const response = await this._agent.invoke_evaluate({
      expression: _sideEffectTestExpression,
      contextId: testContext.id,
      throwOnSideEffect: true,
    });

    this._hasSideEffectSupport = RuntimeModel.isSideEffectFailure(response);
    return this._hasSideEffectSupport;
  }

  /**
   * @return {!Promise}
   */
  terminateExecution() {
    return this._agent.invoke_terminateExecution({});
  }
}

/**
 * This expression:
 * - IMPORTANT: must not actually cause user-visible or JS-visible side-effects.
 * - Must throw when evaluated with `throwOnSideEffect: true`.
 * - Must be valid when run from any ExecutionContext that supports `throwOnSideEffect`.
 * @const
 * @type {string}
 */
const _sideEffectTestExpression = '(async function(){ await 1; })()';

/** @enum {symbol} */
export const Events = {
  ExecutionContextCreated: Symbol('ExecutionContextCreated'),
  ExecutionContextDestroyed: Symbol('ExecutionContextDestroyed'),
  ExecutionContextChanged: Symbol('ExecutionContextChanged'),
  ExecutionContextOrderChanged: Symbol('ExecutionContextOrderChanged'),
  ExceptionThrown: Symbol('ExceptionThrown'),
  ExceptionRevoked: Symbol('ExceptionRevoked'),
  ConsoleAPICalled: Symbol('ConsoleAPICalled'),
  QueryObjectRequested: Symbol('QueryObjectRequested'),
};

/**
 * @extends {Protocol.RuntimeDispatcher}
 * @unrestricted
 */
class RuntimeDispatcher {
  /**
   * @param {!RuntimeModel} runtimeModel
   */
  constructor(runtimeModel) {
    this._runtimeModel = runtimeModel;
  }

  /**
   * @override
   * @param {!Protocol.Runtime.ExecutionContextDescription} context
   */
  executionContextCreated(context) {
    this._runtimeModel._executionContextCreated(context);
  }

  /**
   * @override
   * @param {!Protocol.Runtime.ExecutionContextId} executionContextId
   */
  executionContextDestroyed(executionContextId) {
    this._runtimeModel._executionContextDestroyed(executionContextId);
  }

  /**
   * @override
   */
  executionContextsCleared() {
    this._runtimeModel._executionContextsCleared();
  }

  /**
   * @override
   * @param {number} timestamp
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   */
  exceptionThrown(timestamp, exceptionDetails) {
    this._runtimeModel.exceptionThrown(timestamp, exceptionDetails);
  }

  /**
   * @override
   * @param {string} reason
   * @param {number} exceptionId
   */
  exceptionRevoked(reason, exceptionId) {
    this._runtimeModel._exceptionRevoked(exceptionId);
  }

  /**
   * @override
   * @param {string} type
   * @param {!Array.<!Protocol.Runtime.RemoteObject>} args
   * @param {number} executionContextId
   * @param {number} timestamp
   * @param {!Protocol.Runtime.StackTrace=} stackTrace
   * @param {string=} context
   */
  consoleAPICalled(type, args, executionContextId, timestamp, stackTrace, context) {
    this._runtimeModel._consoleAPICalled(type, args, executionContextId, timestamp, stackTrace, context);
  }

  /**
   * @override
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @param {!Object=} hints
   */
  inspectRequested(payload, hints) {
    this._runtimeModel._inspectRequested(payload, hints);
  }
}

/**
 * @unrestricted
 */
export class ExecutionContext {
  /**
   * @param {!RuntimeModel} runtimeModel
   * @param {number} id
   * @param {string} name
   * @param {string} origin
   * @param {boolean} isDefault
   * @param {string=} frameId
   */
  constructor(runtimeModel, id, name, origin, isDefault, frameId) {
    this.id = id;
    this.name = name;
    this.origin = origin;
    this.isDefault = isDefault;
    this.runtimeModel = runtimeModel;
    this.debuggerModel = runtimeModel.debuggerModel();
    this.frameId = frameId;
    this._setLabel('');
  }

  /**
   * @return {!Target}
   */
  target() {
    return this.runtimeModel.target();
  }

  /**
   * @param {!ExecutionContext} a
   * @param {!ExecutionContext} b
   * @return {number}
   */
  static comparator(a, b) {
    /**
     * @param {!Target} target
     * @return {number}
     */
    function targetWeight(target) {
      if (!target.parentTarget()) {
        return 5;
      }
      if (target.type() === Type.Frame) {
        return 4;
      }
      if (target.type() === Type.ServiceWorker) {
        return 3;
      }
      if (target.type() === Type.Worker) {
        return 2;
      }
      return 1;
    }

    /**
     * @param {!Target} target
     * @return {!Array<!Target>}
     */
    function targetPath(target) {
      let currentTarget = target;
      const parents = [];
      while (currentTarget) {
        parents.push(currentTarget);
        currentTarget = currentTarget.parentTarget();
      }
      return parents.reverse();
    }

    const tagetsA = targetPath(a.target());
    const targetsB = targetPath(b.target());
    let targetA;
    let targetB;
    for (let i = 0;; i++) {
      if (!tagetsA[i] || !targetsB[i] || (tagetsA[i] !== targetsB[i])) {
        targetA = tagetsA[i];
        targetB = targetsB[i];
        break;
      }
    }
    if (!targetA && targetB) {
      return -1;
    }

    if (!targetB && targetA) {
      return 1;
    }

    if (targetA && targetB) {
      const weightDiff = targetWeight(targetA) - targetWeight(targetB);
      if (weightDiff) {
        return -weightDiff;
      }
      return targetA.id().localeCompare(targetB.id());
    }

    // Main world context should always go first.
    if (a.isDefault) {
      return -1;
    }
    if (b.isDefault) {
      return +1;
    }
    return a.name.localeCompare(b.name);
  }

  /**
   * @param {!EvaluationOptions} options
   * @param {boolean} userGesture
   * @param {boolean} awaitPromise
   * @return {!Promise<!EvaluationResult>}
   */
  evaluate(options, userGesture, awaitPromise) {
    // FIXME: It will be moved to separate ExecutionContext.
    if (this.debuggerModel.selectedCallFrame()) {
      return this.debuggerModel.evaluateOnSelectedCallFrame(options);
    }
    // Assume backends either support both throwOnSideEffect and timeout options or neither.
    const needsTerminationOptions = !!options.throwOnSideEffect || options.timeout !== undefined;
    if (!needsTerminationOptions || this.runtimeModel.hasSideEffectSupport()) {
      return this._evaluateGlobal(options, userGesture, awaitPromise);
    }

    /** @type {!EvaluationResult} */
    const unsupportedError = {error: 'Side-effect checks not supported by backend.'};
    if (this.runtimeModel.hasSideEffectSupport() === false) {
      return Promise.resolve(unsupportedError);
    }

    return this.runtimeModel.checkSideEffectSupport().then(() => {
      if (this.runtimeModel.hasSideEffectSupport()) {
        return this._evaluateGlobal(options, userGesture, awaitPromise);
      }
      return Promise.resolve(unsupportedError);
    });
  }

  /**
   * @param {string} objectGroup
   * @param {boolean} generatePreview
   * @return {!Promise<!EvaluationResult>}
   */
  globalObject(objectGroup, generatePreview) {
    return this._evaluateGlobal(
        {
          expression: 'this',
          objectGroup: objectGroup,
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: false,
          generatePreview: generatePreview,
        },
        /* userGesture */ false, /* awaitPromise */ false);
  }

  /**
   * @param {!EvaluationOptions} options
   * @param {boolean} userGesture
   * @param {boolean} awaitPromise
   * @return {!Promise<!EvaluationResult>}
   */
  async _evaluateGlobal(options, userGesture, awaitPromise) {
    if (!options.expression) {
      // There is no expression, so the completion should happen against global properties.
      options.expression = 'this';
    }

    const response = await this.runtimeModel._agent.invoke_evaluate({
      expression: options.expression,
      objectGroup: options.objectGroup,
      includeCommandLineAPI: options.includeCommandLineAPI,
      silent: options.silent,
      contextId: this.id,
      returnByValue: options.returnByValue,
      generatePreview: options.generatePreview,
      userGesture: userGesture,
      awaitPromise: awaitPromise,
      throwOnSideEffect: options.throwOnSideEffect,
      timeout: options.timeout,
      disableBreaks: options.disableBreaks,
      replMode: options.replMode,
    });

    const error = response[ProtocolClient.InspectorBackend.ProtocolError];
    if (error) {
      console.error(error);
      return {error: error};
    }
    return {object: this.runtimeModel.createRemoteObject(response.result), exceptionDetails: response.exceptionDetails};
  }

  /**
   * @return {!Promise<?Array<string>>}
   */
  async globalLexicalScopeNames() {
    const response = await this.runtimeModel._agent.invoke_globalLexicalScopeNames({executionContextId: this.id});
    return response[ProtocolClient.InspectorBackend.ProtocolError] ? [] : response.names;
  }

  /**
   * @return {string}
   */
  label() {
    return this._label;
  }

  /**
   * @param {string} label
   */
  setLabel(label) {
    this._setLabel(label);
    this.runtimeModel.dispatchEventToListeners(Events.ExecutionContextChanged, this);
  }

  /**
   * @param {string} label
   */
  _setLabel(label) {
    if (label) {
      this._label = label;
      return;
    }
    if (this.name) {
      this._label = this.name;
      return;
    }
    const parsedUrl = Common.ParsedURL.ParsedURL.fromString(this.origin);
    this._label = parsedUrl ? parsedUrl.lastPathComponentWithFragment() : '';
  }
}

SDKModel.register(RuntimeModel, Capability.JS, true);

/** @typedef {{
 *    object: (!RemoteObject|undefined),
 *    exceptionDetails: (!Protocol.Runtime.ExceptionDetails|undefined),
 *    error: (!ProtocolClient.InspectorBackend.ProtocolError|undefined)}
 *  }}
 */
export let EvaluationResult;

/** @typedef {{
 *    scriptId: (Protocol.Runtime.ScriptId|undefined),
 *    exceptionDetails: (!Protocol.Runtime.ExceptionDetails|undefined)
 *  }}
 */
export let CompileScriptResult;

/** @typedef {{
 *    expression: string,
 *    objectGroup: (string|undefined),
 *    includeCommandLineAPI: (boolean|undefined),
 *    silent: (boolean|undefined),
 *    returnByValue: (boolean|undefined),
 *    generatePreview: (boolean|undefined),
 *    throwOnSideEffect: (boolean|undefined),
 *    timeout: (number|undefined),
 *    disableBreaks: (boolean|undefined),
 *    replMode: (boolean|undefined)
 *  }}
 */
export let EvaluationOptions;

/** @typedef {{
 *    objects: (!RemoteObject|undefined),
 *    error: (!ProtocolClient.InspectorBackend.ProtocolError|undefined)}
 *  }}
 */
export let QueryObjectResult;
