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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import type {FunctionDetails} from './DebuggerModel.js';
import {DebuggerModel} from './DebuggerModel.js';  // eslint-disable-line no-unused-vars
import {HeapProfilerModel} from './HeapProfilerModel.js';
import type {ScopeRef} from './RemoteObject.js';
import {RemoteFunction, RemoteObject, RemoteObjectImpl,                     // eslint-disable-line no-unused-vars
        RemoteObjectProperty, ScopeRemoteObject} from './RemoteObject.js';  // eslint-disable-line no-unused-vars
import type {Target} from './SDKModel.js';
import {Capability, SDKModel, Type} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class RuntimeModel extends SDKModel {
  _agent: ProtocolProxyApi.RuntimeApi;
  _executionContextById: Map<number, ExecutionContext>;
  _executionContextComparator: (arg0: ExecutionContext, arg1: ExecutionContext) => number;
  _hasSideEffectSupport: boolean|null;
  constructor(target: Target) {
    super(target);

    this._agent = target.runtimeAgent();
    this.target().registerRuntimeDispatcher(new RuntimeDispatcher(this));
    this._agent.invoke_enable();
    this._executionContextById = new Map();
    this._executionContextComparator = ExecutionContext.comparator;
    this._hasSideEffectSupport = null;

    if (Common.Settings.Settings.instance().moduleSetting('customFormatters').get()) {
      this._agent.invoke_setCustomObjectFormatterEnabled({enabled: true});
    }

    Common.Settings.Settings.instance()
        .moduleSetting('customFormatters')
        .addChangeListener(this._customFormattersStateChanged.bind(this));
  }

  static isSideEffectFailure(response: Protocol.Runtime.EvaluateResponse|EvaluationResult): boolean {
    const exceptionDetails = 'exceptionDetails' in response && response.exceptionDetails;
    return Boolean(
        exceptionDetails && exceptionDetails.exception && exceptionDetails.exception.description &&
        exceptionDetails.exception.description.startsWith('EvalError: Possible side-effect in debug-evaluate'));
  }

  debuggerModel(): DebuggerModel {
    return this.target().model(DebuggerModel) as DebuggerModel;
  }

  heapProfilerModel(): HeapProfilerModel {
    return this.target().model(HeapProfilerModel) as HeapProfilerModel;
  }

  executionContexts(): ExecutionContext[] {
    return [...this._executionContextById.values()].sort(this.executionContextComparator());
  }

  setExecutionContextComparator(comparator: (arg0: ExecutionContext, arg1: ExecutionContext) => number): void {
    this._executionContextComparator = comparator;
  }

  /** comparator
     */
  executionContextComparator(): (arg0: ExecutionContext, arg1: ExecutionContext) => number {
    return this._executionContextComparator;
  }

  defaultExecutionContext(): ExecutionContext|null {
    for (const context of this.executionContexts()) {
      if (context.isDefault) {
        return context;
      }
    }
    return null;
  }

  executionContext(id: number): ExecutionContext|null {
    return this._executionContextById.get(id) || null;
  }

  _executionContextCreated(context: Protocol.Runtime.ExecutionContextDescription): void {
    const data = context.auxData || {isDefault: true};
    const executionContext = new ExecutionContext(
        this, context.id, context.uniqueId, context.name, context.origin, data['isDefault'], data['frameId']);
    this._executionContextById.set(executionContext.id, executionContext);
    this.dispatchEventToListeners(Events.ExecutionContextCreated, executionContext);
  }

  _executionContextDestroyed(executionContextId: number): void {
    const executionContext = this._executionContextById.get(executionContextId);
    if (!executionContext) {
      return;
    }
    this.debuggerModel().executionContextDestroyed(executionContext);
    this._executionContextById.delete(executionContextId);
    this.dispatchEventToListeners(Events.ExecutionContextDestroyed, executionContext);
  }

  fireExecutionContextOrderChanged(): void {
    this.dispatchEventToListeners(Events.ExecutionContextOrderChanged, this);
  }

  _executionContextsCleared(): void {
    this.debuggerModel().globalObjectCleared();
    const contexts = this.executionContexts();
    this._executionContextById.clear();
    for (let i = 0; i < contexts.length; ++i) {
      this.dispatchEventToListeners(Events.ExecutionContextDestroyed, contexts[i]);
    }
  }

  createRemoteObject(payload: Protocol.Runtime.RemoteObject): RemoteObject {
    console.assert(typeof payload === 'object', 'Remote object payload should only be an object');
    return new RemoteObjectImpl(
        this, payload.objectId, payload.type, payload.subtype, payload.value, payload.unserializableValue,
        payload.description, payload.preview, payload.customPreview, payload.className);
  }

  createScopeRemoteObject(payload: Protocol.Runtime.RemoteObject, scopeRef: ScopeRef): RemoteObject {
    return new ScopeRemoteObject(
        this, payload.objectId, scopeRef, payload.type, payload.subtype, payload.value, payload.unserializableValue,
        payload.description, payload.preview);
  }

  createRemoteObjectFromPrimitiveValue(value: string|number|bigint|boolean|undefined): RemoteObject {
    const type = typeof value;
    let unserializableValue: string|undefined = undefined;
    const unserializableDescription = RemoteObject.unserializableDescription(value);
    if (unserializableDescription !== null) {
      unserializableValue = (unserializableDescription as string);
    }
    if (typeof unserializableValue !== 'undefined') {
      value = undefined;
    }
    return new RemoteObjectImpl(this, undefined, type, undefined, value, unserializableValue);
  }

  createRemotePropertyFromPrimitiveValue(name: string, value: string|number|boolean): RemoteObjectProperty {
    return new RemoteObjectProperty(name, this.createRemoteObjectFromPrimitiveValue(value));
  }

  discardConsoleEntries(): void {
    this._agent.invoke_discardConsoleEntries();
  }

  releaseObjectGroup(objectGroup: string): void {
    this._agent.invoke_releaseObjectGroup({objectGroup});
  }

  releaseEvaluationResult(result: EvaluationResult): void {
    if ('object' in result && result.object) {
      result.object.release();
    }
    if ('exceptionDetails' in result && result.exceptionDetails && result.exceptionDetails.exception) {
      const exception = result.exceptionDetails.exception;
      const exceptionObject = this.createRemoteObject({type: exception.type, objectId: exception.objectId});
      exceptionObject.release();
    }
  }

  runIfWaitingForDebugger(): void {
    this._agent.invoke_runIfWaitingForDebugger();
  }

  _customFormattersStateChanged(event: Common.EventTarget.EventTargetEvent): void {
    const enabled = (event.data as boolean);
    this._agent.invoke_setCustomObjectFormatterEnabled({enabled});
  }

  async compileScript(expression: string, sourceURL: string, persistScript: boolean, executionContextId: number):
      Promise<CompileScriptResult|null> {
    const response = await this._agent.invoke_compileScript({
      expression: expression,
      sourceURL: sourceURL,
      persistScript: persistScript,
      executionContextId: executionContextId,
    });

    if (response.getError()) {
      console.error(response.getError());
      return null;
    }
    return {scriptId: response.scriptId, exceptionDetails: response.exceptionDetails};
  }

  async runScript(
      scriptId: string, executionContextId: number, objectGroup?: string, silent?: boolean,
      includeCommandLineAPI?: boolean, returnByValue?: boolean, generatePreview?: boolean,
      awaitPromise?: boolean): Promise<EvaluationResult> {
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

    const error = response.getError();
    if (error) {
      console.error(error);
      return {error: error};
    }
    return {object: this.createRemoteObject(response.result), exceptionDetails: response.exceptionDetails};
  }

  async queryObjects(prototype: RemoteObject): Promise<QueryObjectResult> {
    if (!prototype.objectId) {
      return {error: 'Prototype should be an Object.'};
    }
    const response = await this._agent.invoke_queryObjects(
        {prototypeObjectId: (prototype.objectId as string), objectGroup: 'console'});
    const error = response.getError();
    if (error) {
      console.error(error);
      return {error: error};
    }
    return {objects: this.createRemoteObject(response.objects)};
  }

  async isolateId(): Promise<string> {
    const response = await this._agent.invoke_getIsolateId();
    if (response.getError() || !response.id) {
      return this.target().id();
    }
    return response.id;
  }

  async heapUsage(): Promise<{
    usedSize: number,
    totalSize: number,
  }|null> {
    const result = await this._agent.invoke_getHeapUsage();
    return result.getError() ? null : result;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _inspectRequested(payload: Protocol.Runtime.RemoteObject, hints?: any): void {
    const object = this.createRemoteObject(payload);

    if (hints && 'copyToClipboard' in hints && Boolean(hints.copyToClipboard)) {
      this._copyRequested(object);
      return;
    }

    if (hints && 'queryObjects' in hints && hints.queryObjects) {
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

    function didGetDetails(response: FunctionDetails|null): void {
      object.release();
      if (!response || !response.location) {
        return;
      }
      Common.Revealer.reveal(response.location);
    }
    object.release();
  }

  async addBinding(event: Protocol.Runtime.AddBindingRequest): Promise<Protocol.ProtocolResponseWithError> {
    return await this._agent.invoke_addBinding(event);
  }

  _bindingCalled(event: Protocol.Runtime.BindingCalledEvent): void {
    this.dispatchEventToListeners(Events.BindingCalled, event);
  }

  _copyRequested(object: RemoteObject): void {
    if (!object.objectId) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(
          object.unserializableValue() || (object.value as string));
      return;
    }

    const indent = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
    object
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // @ts-expect-error
        .callFunctionJSON(toStringForClipboard, [{
                            value: {
                              subtype: object.subtype,
                              indent: indent,
                            },
                          }])
        .then(Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance));

    function toStringForClipboard(this: Object, data: {
      subtype: string,
      indent: string,
    }): string|undefined {
      const subtype = data.subtype;
      const indent = data.indent;

      if (subtype === 'node') {
        return this instanceof Element ? this.outerHTML : undefined;
      }
      if (subtype && typeof this === 'undefined') {
        return String(subtype);
      }
      try {
        return JSON.stringify(this, null, indent);
      } catch (error) {
        return String(this);
      }
    }
  }

  async _queryObjectsRequested(object: RemoteObject): Promise<void> {
    const result = await this.queryObjects(object);
    object.release();
    if ('error' in result) {
      Common.Console.Console.instance().error(result.error);
      return;
    }
    this.dispatchEventToListeners(Events.QueryObjectRequested, {objects: result.objects});
  }

  static simpleTextFromException(exceptionDetails: Protocol.Runtime.ExceptionDetails): string {
    let text = exceptionDetails.text;
    if (exceptionDetails.exception && exceptionDetails.exception.description) {
      let description: string = exceptionDetails.exception.description;
      if (description.indexOf('\n') !== -1) {
        description = description.substring(0, description.indexOf('\n'));
      }
      text += ' ' + description;
    }
    return text;
  }

  exceptionThrown(timestamp: number, exceptionDetails: Protocol.Runtime.ExceptionDetails): void {
    const exceptionWithTimestamp = {timestamp: timestamp, details: exceptionDetails};
    this.dispatchEventToListeners(Events.ExceptionThrown, exceptionWithTimestamp);
  }

  _exceptionRevoked(exceptionId: number): void {
    this.dispatchEventToListeners(Events.ExceptionRevoked, exceptionId);
  }

  _consoleAPICalled(
      type: string, args: Protocol.Runtime.RemoteObject[], executionContextId: number, timestamp: number,
      stackTrace?: Protocol.Runtime.StackTrace, context?: string): void {
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

  executionContextIdForScriptId(scriptId: string): number {
    const script = this.debuggerModel().scriptForId(scriptId);
    return script ? script.executionContextId : 0;
  }

  executionContextForStackTrace(stackTrace: Protocol.Runtime.StackTrace): number {
    let currentStackTrace: (Protocol.Runtime.StackTrace|null)|Protocol.Runtime.StackTrace = stackTrace;
    while (currentStackTrace && !currentStackTrace.callFrames.length) {
      currentStackTrace = currentStackTrace.parent || null;
    }
    if (!currentStackTrace || !currentStackTrace.callFrames.length) {
      return 0;
    }
    return this.executionContextIdForScriptId(currentStackTrace.callFrames[0].scriptId);
  }

  hasSideEffectSupport(): boolean|null {
    return this._hasSideEffectSupport;
  }

  async checkSideEffectSupport(): Promise<boolean> {
    const contexts = this.executionContexts();
    const testContext = contexts[contexts.length - 1];
    if (!testContext) {
      return false;
    }
    // Check for a positive throwOnSideEffect response without triggering side effects.
    const response = await this._agent.invoke_evaluate({
      expression: _sideEffectTestExpression,
      contextId: testContext.id,
      throwOnSideEffect: true,
    });

    this._hasSideEffectSupport = response.getError() ? false : RuntimeModel.isSideEffectFailure(response);

    return this._hasSideEffectSupport;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  terminateExecution(): Promise<any> {
    return this._agent.invoke_terminateExecution();
  }
}

/**
 * This expression:
 * - IMPORTANT: must not actually cause user-visible or JS-visible side-effects.
 * - Must throw when evaluated with `throwOnSideEffect: true`.
 * - Must be valid when run from any ExecutionContext that supports `throwOnSideEffect`.
 * @const
 */
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _sideEffectTestExpression: string = '(async function(){ await 1; })()';

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  BindingCalled = 'BindingCalled',
  ExecutionContextCreated = 'ExecutionContextCreated',
  ExecutionContextDestroyed = 'ExecutionContextDestroyed',
  ExecutionContextChanged = 'ExecutionContextChanged',
  ExecutionContextOrderChanged = 'ExecutionContextOrderChanged',
  ExceptionThrown = 'ExceptionThrown',
  ExceptionRevoked = 'ExceptionRevoked',
  ConsoleAPICalled = 'ConsoleAPICalled',
  QueryObjectRequested = 'QueryObjectRequested',
}


class RuntimeDispatcher implements ProtocolProxyApi.RuntimeDispatcher {
  _runtimeModel: RuntimeModel;
  constructor(runtimeModel: RuntimeModel) {
    this._runtimeModel = runtimeModel;
  }

  executionContextCreated({context}: Protocol.Runtime.ExecutionContextCreatedEvent): void {
    this._runtimeModel._executionContextCreated(context);
  }

  executionContextDestroyed({executionContextId}: Protocol.Runtime.ExecutionContextDestroyedEvent): void {
    this._runtimeModel._executionContextDestroyed(executionContextId);
  }

  executionContextsCleared(): void {
    this._runtimeModel._executionContextsCleared();
  }

  exceptionThrown({timestamp, exceptionDetails}: Protocol.Runtime.ExceptionThrownEvent): void {
    this._runtimeModel.exceptionThrown(timestamp, exceptionDetails);
  }

  exceptionRevoked({exceptionId}: Protocol.Runtime.ExceptionRevokedEvent): void {
    this._runtimeModel._exceptionRevoked(exceptionId);
  }

  consoleAPICalled({type, args, executionContextId, timestamp, stackTrace, context}:
                       Protocol.Runtime.ConsoleAPICalledEvent): void {
    this._runtimeModel._consoleAPICalled(type, args, executionContextId, timestamp, stackTrace, context);
  }

  inspectRequested({object, hints}: Protocol.Runtime.InspectRequestedEvent): void {
    this._runtimeModel._inspectRequested(object, hints);
  }

  bindingCalled(event: Protocol.Runtime.BindingCalledEvent): void {
    this._runtimeModel._bindingCalled(event);
  }
}

export class ExecutionContext {
  id: number;
  uniqueId: string;
  name: string;
  _label: string|null;
  origin: string;
  isDefault: boolean;
  runtimeModel: RuntimeModel;
  debuggerModel: DebuggerModel;
  frameId: string|undefined;
  constructor(
      runtimeModel: RuntimeModel, id: number, uniqueId: string, name: string, origin: string, isDefault: boolean,
      frameId?: string) {
    this.id = id;
    this.uniqueId = uniqueId;
    this.name = name;
    this._label = null;
    this.origin = origin;
    this.isDefault = isDefault;
    this.runtimeModel = runtimeModel;
    this.debuggerModel = runtimeModel.debuggerModel();
    this.frameId = frameId;
    this._setLabel('');
  }

  target(): Target {
    return this.runtimeModel.target();
  }

  static comparator(a: ExecutionContext, b: ExecutionContext): number {
    function targetWeight(target: Target): number {
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

    function targetPath(target: Target): Target[] {
      let currentTarget: (Target|null)|Target = target;
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

  async evaluate(options: EvaluationOptions, userGesture: boolean, awaitPromise: boolean): Promise<EvaluationResult> {
    // FIXME: It will be moved to separate ExecutionContext.
    if (this.debuggerModel.selectedCallFrame()) {
      return this.debuggerModel.evaluateOnSelectedCallFrame(options);
    }
    // Assume backends either support both throwOnSideEffect and timeout options or neither.
    const needsTerminationOptions = Boolean(options.throwOnSideEffect) || options.timeout !== undefined;
    if (!needsTerminationOptions || this.runtimeModel.hasSideEffectSupport()) {
      return this._evaluateGlobal(options, userGesture, awaitPromise);
    }

    /** @type {!EvaluationResult} */
    if (this.runtimeModel.hasSideEffectSupport() !== false) {
      await this.runtimeModel.checkSideEffectSupport();
      if (this.runtimeModel.hasSideEffectSupport()) {
        return this._evaluateGlobal(options, userGesture, awaitPromise);
      }
    }
    return {error: 'Side-effect checks not supported by backend.'};
  }

  globalObject(objectGroup: string, generatePreview: boolean): Promise<EvaluationResult> {
    const evaluationOptions = {
      expression: 'this',
      objectGroup: objectGroup,
      includeCommandLineAPI: false,
      silent: true,
      returnByValue: false,
      generatePreview: generatePreview,
    };
    return this._evaluateGlobal((evaluationOptions as EvaluationOptions), false, false);
  }

  async _evaluateGlobal(options: EvaluationOptions, userGesture: boolean, awaitPromise: boolean):
      Promise<EvaluationResult> {
    if (!options.expression) {
      // There is no expression, so the completion should happen against global properties.
      options.expression = 'this';
    }

    const response = await this.runtimeModel._agent.invoke_evaluate({
      expression: options.expression,
      objectGroup: options.objectGroup,
      includeCommandLineAPI: options.includeCommandLineAPI,
      silent: options.silent,
      returnByValue: options.returnByValue,
      generatePreview: options.generatePreview,
      userGesture: userGesture,
      awaitPromise: awaitPromise,
      throwOnSideEffect: options.throwOnSideEffect,
      timeout: options.timeout,
      disableBreaks: options.disableBreaks,
      replMode: options.replMode,
      allowUnsafeEvalBlockedByCSP: options.allowUnsafeEvalBlockedByCSP,
      // Old back-ends don't know about uniqueContextId (and also don't generate
      // one), so fall back to contextId in that case (https://crbug.com/1192621).
      ...(this.uniqueId ? {uniqueContextId: this.uniqueId} : {contextId: this.id}),
    });

    const error = response.getError();
    if (error) {
      console.error(error);
      return {error: error};
    }
    return {object: this.runtimeModel.createRemoteObject(response.result), exceptionDetails: response.exceptionDetails};
  }

  async globalLexicalScopeNames(): Promise<string[]|null> {
    const response = await this.runtimeModel._agent.invoke_globalLexicalScopeNames({executionContextId: this.id});
    return response.getError() ? [] : response.names;
  }

  label(): string|null {
    return this._label;
  }

  setLabel(label: string): void {
    this._setLabel(label);
    this.runtimeModel.dispatchEventToListeners(Events.ExecutionContextChanged, this);
  }

  _setLabel(label: string): void {
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

SDKModel.register(RuntimeModel, {capabilities: Capability.JS, autostart: true});

export type EvaluationResult = {
  object: RemoteObject,
  exceptionDetails?: Protocol.Runtime.ExceptionDetails,
}|{
  error: string,
};

export interface CompileScriptResult {
  scriptId?: string;
  exceptionDetails?: Protocol.Runtime.ExceptionDetails;
}

export interface EvaluationOptions {
  expression: string;
  objectGroup?: string;
  includeCommandLineAPI?: boolean;
  silent?: boolean;
  returnByValue?: boolean;
  generatePreview?: boolean;
  throwOnSideEffect?: boolean;
  timeout?: number;
  disableBreaks?: boolean;
  replMode?: boolean;
  allowUnsafeEvalBlockedByCSP?: boolean;
  contextId?: number;
}

export type QueryObjectResult = {
  objects: RemoteObject,
}|{error: string};
