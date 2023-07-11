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

import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import {FrontendMessageSource, FrontendMessageType} from './ConsoleModelTypes.js';

export {FrontendMessageSource, FrontendMessageType} from './ConsoleModelTypes.js';

import {CPUProfilerModel, Events as CPUProfilerModelEvents, type EventData} from './CPUProfilerModel.js';

import {
  Events as DebuggerModelEvents,
  type Location,
  BreakpointType,
  COND_BREAKPOINT_SOURCE_URL,
  LOGPOINT_SOURCE_URL,
} from './DebuggerModel.js';
import {LogModel} from './LogModel.js';
import {RemoteObject} from './RemoteObject.js';
import {
  Events as ResourceTreeModelEvents,
  ResourceTreeModel,
  type ResourceTreeFrame,
  type PrimaryPageChangeType,
} from './ResourceTreeModel.js';

import {
  Events as RuntimeModelEvents,
  RuntimeModel,
  type ConsoleAPICall,
  type ExceptionWithTimestamp,
  type ExecutionContext,
  type QueryObjectRequestedEvent,
} from './RuntimeModel.js';
import {Capability, type Target, Type} from './Target.js';
import {TargetManager} from './TargetManager.js';
import {SDKModel} from './SDKModel.js';

const UIStrings = {
  /**
   *@description Text shown when the main frame (page) of the website was navigated to a different URL.
   *@example {https://example.com} PH1
   */
  navigatedToS: 'Navigated to {PH1}',
  /**
   *@description Text shown when the main frame (page) of the website was navigated to a different URL
   * and the page was restored from back/forward cache (https://web.dev/bfcache/).
   *@example {https://example.com} PH1
   */
  bfcacheNavigation: 'Navigation to {PH1} was restored from back/forward cache (see https://web.dev/bfcache/)',
  /**
   *@description Text shown in the console when a performance profile (with the given name) was started.
   *@example {title} PH1
   */
  profileSStarted: 'Profile \'\'{PH1}\'\' started.',
  /**
   *@description Text shown in the console when a performance profile (with the given name) was stopped.
   *@example {name} PH1
   */
  profileSFinished: 'Profile \'\'{PH1}\'\' finished.',
  /**
   *@description Error message shown in the console after the user tries to save a JavaScript value to a temporary variable.
   */
  failedToSaveToTempVariable: 'Failed to save to temp variable.',
};

const str_ = i18n.i18n.registerUIStrings('core/sdk/ConsoleModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ConsoleModel extends SDKModel<EventTypes> {
  #messagesInternal: ConsoleMessage[];
  readonly #messagesByTimestamp: Platform.MapUtilities.Multimap<number, ConsoleMessage>;
  readonly #messageByExceptionId: Map<RuntimeModel, Map<number, ConsoleMessage>>;
  #warningsInternal: number;
  #errorsInternal: number;
  #violationsInternal: number;
  #pageLoadSequenceNumber: number;
  readonly #targetListeners: WeakMap<Target, Common.EventTarget.EventDescriptor[]>;

  constructor(target: Target) {
    super(target);

    this.#messagesInternal = [];
    this.#messagesByTimestamp = new Platform.MapUtilities.Multimap();
    this.#messageByExceptionId = new Map();
    this.#warningsInternal = 0;
    this.#errorsInternal = 0;
    this.#violationsInternal = 0;
    this.#pageLoadSequenceNumber = 0;
    this.#targetListeners = new WeakMap();

    const resourceTreeModel = target.model(ResourceTreeModel);
    if (!resourceTreeModel || resourceTreeModel.cachedResourcesLoaded()) {
      this.initTarget(target);
      return;
    }

    const eventListener = resourceTreeModel.addEventListener(ResourceTreeModelEvents.CachedResourcesLoaded, () => {
      Common.EventTarget.removeEventListeners([eventListener]);
      this.initTarget(target);
    });
  }

  private initTarget(target: Target): void {
    const eventListeners = [];

    const cpuProfilerModel = target.model(CPUProfilerModel);
    if (cpuProfilerModel) {
      eventListeners.push(cpuProfilerModel.addEventListener(
          CPUProfilerModelEvents.ConsoleProfileStarted, this.consoleProfileStarted.bind(this, cpuProfilerModel)));
      eventListeners.push(cpuProfilerModel.addEventListener(
          CPUProfilerModelEvents.ConsoleProfileFinished, this.consoleProfileFinished.bind(this, cpuProfilerModel)));
    }

    const resourceTreeModel = target.model(ResourceTreeModel);
    if (resourceTreeModel && target.parentTarget()?.type() !== Type.Frame) {
      eventListeners.push(resourceTreeModel.addEventListener(
          ResourceTreeModelEvents.PrimaryPageChanged, this.primaryPageChanged, this));
    }

    const runtimeModel = target.model(RuntimeModel);
    if (runtimeModel) {
      eventListeners.push(runtimeModel.addEventListener(
          RuntimeModelEvents.ExceptionThrown, this.exceptionThrown.bind(this, runtimeModel)));
      eventListeners.push(runtimeModel.addEventListener(
          RuntimeModelEvents.ExceptionRevoked, this.exceptionRevoked.bind(this, runtimeModel)));
      eventListeners.push(runtimeModel.addEventListener(
          RuntimeModelEvents.ConsoleAPICalled, this.consoleAPICalled.bind(this, runtimeModel)));
      if (target.parentTarget()?.type() !== Type.Frame) {
        eventListeners.push(runtimeModel.debuggerModel().addEventListener(
            DebuggerModelEvents.GlobalObjectCleared, this.clearIfNecessary, this));
      }
      eventListeners.push(runtimeModel.addEventListener(
          RuntimeModelEvents.QueryObjectRequested, this.queryObjectRequested.bind(this, runtimeModel)));
    }

    this.#targetListeners.set(target, eventListeners);
  }

  targetRemoved(target: Target): void {
    const runtimeModel = target.model(RuntimeModel);
    if (runtimeModel) {
      this.#messageByExceptionId.delete(runtimeModel);
    }
    Common.EventTarget.removeEventListeners(this.#targetListeners.get(target) || []);
  }

  async evaluateCommandInConsole(
      executionContext: ExecutionContext, originatingMessage: ConsoleMessage, expression: string,
      useCommandLineAPI: boolean): Promise<void> {
    const result = await executionContext.evaluate(
        {
          expression,
          objectGroup: 'console',
          includeCommandLineAPI: useCommandLineAPI,
          silent: false,
          returnByValue: false,
          generatePreview: true,
          replMode: true,
          allowUnsafeEvalBlockedByCSP: false,
        },
        Common.Settings.Settings.instance().moduleSetting('consoleUserActivationEval').get(), /* awaitPromise */ false);
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConsoleEvaluated);
    if ('error' in result) {
      return;
    }
    await Common.Console.Console.instance().showPromise();
    this.dispatchEventToListeners(
        Events.CommandEvaluated,
        {result: result.object, commandMessage: originatingMessage, exceptionDetails: result.exceptionDetails});
  }

  addCommandMessage(executionContext: ExecutionContext, text: string): ConsoleMessage {
    const commandMessage = new ConsoleMessage(
        executionContext.runtimeModel, Protocol.Log.LogEntrySource.Javascript, null, text,
        {type: FrontendMessageType.Command});
    commandMessage.setExecutionContextId(executionContext.id);
    this.addMessage(commandMessage);
    return commandMessage;
  }

  addMessage(msg: ConsoleMessage): void {
    msg.setPageLoadSequenceNumber(this.#pageLoadSequenceNumber);
    if (msg.source === FrontendMessageSource.ConsoleAPI &&
        msg.type === Protocol.Runtime.ConsoleAPICalledEventType.Clear) {
      this.clearIfNecessary();
    }

    this.#messagesInternal.push(msg);
    this.#messagesByTimestamp.set(msg.timestamp, msg);
    const runtimeModel = msg.runtimeModel();
    const exceptionId = msg.getExceptionId();
    if (exceptionId && runtimeModel) {
      let modelMap = this.#messageByExceptionId.get(runtimeModel);
      if (!modelMap) {
        modelMap = new Map();
        this.#messageByExceptionId.set(runtimeModel, modelMap);
      }
      modelMap.set(exceptionId, msg);
    }
    this.incrementErrorWarningCount(msg);
    this.dispatchEventToListeners(Events.MessageAdded, msg);
  }

  private exceptionThrown(
      runtimeModel: RuntimeModel, event: Common.EventTarget.EventTargetEvent<ExceptionWithTimestamp>): void {
    const exceptionWithTimestamp = event.data;
    const affectedResources = extractExceptionMetaData(exceptionWithTimestamp.details.exceptionMetaData);
    const consoleMessage = ConsoleMessage.fromException(
        runtimeModel, exceptionWithTimestamp.details, undefined, exceptionWithTimestamp.timestamp, undefined,
        affectedResources);
    consoleMessage.setExceptionId(exceptionWithTimestamp.details.exceptionId);
    this.addMessage(consoleMessage);
  }

  private exceptionRevoked(runtimeModel: RuntimeModel, event: Common.EventTarget.EventTargetEvent<number>): void {
    const exceptionId = event.data;
    const modelMap = this.#messageByExceptionId.get(runtimeModel);
    const exceptionMessage = modelMap ? modelMap.get(exceptionId) : null;
    if (!exceptionMessage) {
      return;
    }
    this.#errorsInternal--;
    exceptionMessage.level = Protocol.Log.LogEntryLevel.Verbose;
    this.dispatchEventToListeners(Events.MessageUpdated, exceptionMessage);
  }

  private consoleAPICalled(runtimeModel: RuntimeModel, event: Common.EventTarget.EventTargetEvent<ConsoleAPICall>):
      void {
    const call = event.data;
    let level: Protocol.Log.LogEntryLevel = Protocol.Log.LogEntryLevel.Info;
    if (call.type === Protocol.Runtime.ConsoleAPICalledEventType.Debug) {
      level = Protocol.Log.LogEntryLevel.Verbose;
    } else if (
        call.type === Protocol.Runtime.ConsoleAPICalledEventType.Error ||
        call.type === Protocol.Runtime.ConsoleAPICalledEventType.Assert) {
      level = Protocol.Log.LogEntryLevel.Error;
    } else if (call.type === Protocol.Runtime.ConsoleAPICalledEventType.Warning) {
      level = Protocol.Log.LogEntryLevel.Warning;
    } else if (
        call.type === Protocol.Runtime.ConsoleAPICalledEventType.Info ||
        call.type === Protocol.Runtime.ConsoleAPICalledEventType.Log) {
      level = Protocol.Log.LogEntryLevel.Info;
    }
    let message = '';
    if (call.args.length && call.args[0].unserializableValue) {
      message = call.args[0].unserializableValue;
    } else if (call.args.length && (typeof call.args[0].value !== 'object' || call.args[0].value === null)) {
      message = String(call.args[0].value);
    } else if (call.args.length && call.args[0].description) {
      message = call.args[0].description;
    }
    const callFrame = call.stackTrace && call.stackTrace.callFrames.length ? call.stackTrace.callFrames[0] : null;
    const details = {
      type: call.type,
      url: callFrame?.url as Platform.DevToolsPath.UrlString | undefined,
      line: callFrame?.lineNumber,
      column: callFrame?.columnNumber,
      parameters: call.args,
      stackTrace: call.stackTrace,
      timestamp: call.timestamp,
      executionContextId: call.executionContextId,
      context: call.context,
    };
    const consoleMessage =
        new ConsoleMessage(runtimeModel, FrontendMessageSource.ConsoleAPI, level, (message as string), details);
    for (const msg of this.#messagesByTimestamp.get(consoleMessage.timestamp).values()) {
      if (consoleMessage.isEqual(msg)) {
        return;
      }
    }
    this.addMessage(consoleMessage);
  }

  private queryObjectRequested(
      runtimeModel: RuntimeModel, event: Common.EventTarget.EventTargetEvent<QueryObjectRequestedEvent>): void {
    const {objects, executionContextId} = event.data;
    const details = {
      type: FrontendMessageType.QueryObjectResult,
      parameters: [objects],
      executionContextId,
    };
    const consoleMessage = new ConsoleMessage(
        runtimeModel, FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Info, '', details);
    this.addMessage(consoleMessage);
  }

  private clearIfNecessary(): void {
    if (!Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog').get()) {
      this.clear();
    }
    ++this.#pageLoadSequenceNumber;
  }

  private primaryPageChanged(
      event: Common.EventTarget.EventTargetEvent<{frame: ResourceTreeFrame, type: PrimaryPageChangeType}>): void {
    if (Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog').get()) {
      const {frame} = event.data;
      if (frame.backForwardCacheDetails.restoredFromCache) {
        Common.Console.Console.instance().log(i18nString(UIStrings.bfcacheNavigation, {PH1: frame.url}));
      } else {
        Common.Console.Console.instance().log(i18nString(UIStrings.navigatedToS, {PH1: frame.url}));
      }
    }
  }

  private consoleProfileStarted(
      cpuProfilerModel: CPUProfilerModel, event: Common.EventTarget.EventTargetEvent<EventData>): void {
    const {data} = event;
    this.addConsoleProfileMessage(
        cpuProfilerModel, Protocol.Runtime.ConsoleAPICalledEventType.Profile, data.scriptLocation,
        i18nString(UIStrings.profileSStarted, {PH1: data.title}));
  }

  private consoleProfileFinished(
      cpuProfilerModel: CPUProfilerModel, event: Common.EventTarget.EventTargetEvent<EventData>): void {
    const {data} = event;
    this.addConsoleProfileMessage(
        cpuProfilerModel, Protocol.Runtime.ConsoleAPICalledEventType.ProfileEnd, data.scriptLocation,
        i18nString(UIStrings.profileSFinished, {PH1: data.title}));
  }

  private addConsoleProfileMessage(
      cpuProfilerModel: CPUProfilerModel, type: MessageType, scriptLocation: Location, messageText: string): void {
    const script = scriptLocation.script();
    const callFrames = [{
      functionName: '',
      scriptId: scriptLocation.scriptId,
      url: script ? script.contentURL() : '',
      lineNumber: scriptLocation.lineNumber,
      columnNumber: scriptLocation.columnNumber || 0,
    }];
    this.addMessage(new ConsoleMessage(
        cpuProfilerModel.runtimeModel(), FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Info, messageText,
        {type, stackTrace: {callFrames}}));
  }

  private incrementErrorWarningCount(msg: ConsoleMessage): void {
    if (msg.source === Protocol.Log.LogEntrySource.Violation) {
      this.#violationsInternal++;
      return;
    }
    switch (msg.level) {
      case Protocol.Log.LogEntryLevel.Warning:
        this.#warningsInternal++;
        break;
      case Protocol.Log.LogEntryLevel.Error:
        this.#errorsInternal++;
        break;
    }
  }

  messages(): ConsoleMessage[] {
    return this.#messagesInternal;
  }

  // messages[] are not ordered by timestamp.
  static allMessagesUnordered(): ConsoleMessage[] {
    const messages = [];
    for (const target of TargetManager.instance().targets()) {
      const targetMessages = target.model(ConsoleModel)?.messages() || [];
      messages.push(...targetMessages);
    }
    return messages;
  }

  static requestClearMessages(): void {
    for (const logModel of TargetManager.instance().models(LogModel)) {
      logModel.requestClear();
    }
    for (const runtimeModel of TargetManager.instance().models(RuntimeModel)) {
      runtimeModel.discardConsoleEntries();
    }
    for (const target of TargetManager.instance().targets()) {
      target.model(ConsoleModel)?.clear();
    }
  }

  private clear(): void {
    this.#messagesInternal = [];
    this.#messagesByTimestamp.clear();
    this.#messageByExceptionId.clear();
    this.#errorsInternal = 0;
    this.#warningsInternal = 0;
    this.#violationsInternal = 0;
    this.dispatchEventToListeners(Events.ConsoleCleared);
  }

  errors(): number {
    return this.#errorsInternal;
  }

  static allErrors(): number {
    let errors = 0;
    for (const target of TargetManager.instance().targets()) {
      errors += target.model(ConsoleModel)?.errors() || 0;
    }
    return errors;
  }

  warnings(): number {
    return this.#warningsInternal;
  }

  static allWarnings(): number {
    let warnings = 0;
    for (const target of TargetManager.instance().targets()) {
      warnings += target.model(ConsoleModel)?.warnings() || 0;
    }
    return warnings;
  }

  violations(): number {
    return this.#violationsInternal;
  }

  static allViolations(): number {
    let violations = 0;
    for (const target of TargetManager.instance().targets()) {
      violations += target.model(ConsoleModel)?.violations() || 0;
    }
    return violations;
  }

  async saveToTempVariable(currentExecutionContext: ExecutionContext|null, remoteObject: RemoteObject|null):
      Promise<void> {
    if (!remoteObject || !currentExecutionContext) {
      failedToSave(null);
      return;
    }
    const executionContext = (currentExecutionContext as ExecutionContext);

    const result = await executionContext.globalObject(/* objectGroup */ '', /* generatePreview */ false);
    if ('error' in result || Boolean(result.exceptionDetails) || !result.object) {
      failedToSave('object' in result && result.object || null);
      return;
    }

    const globalObject = result.object;
    const callFunctionResult =
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // @ts-expect-error
        await globalObject.callFunction(saveVariable, [RemoteObject.toCallArgument(remoteObject)]);
    globalObject.release();
    if (callFunctionResult.wasThrown || !callFunctionResult.object || callFunctionResult.object.type !== 'string') {
      failedToSave(callFunctionResult.object || null);
    } else {
      const text = (callFunctionResult.object.value as string);
      const message = this.addCommandMessage(executionContext, text);
      void this.evaluateCommandInConsole(executionContext, message, text, /* useCommandLineAPI */ false);
    }
    if (callFunctionResult.object) {
      callFunctionResult.object.release();
    }

    function saveVariable(this: Window, value: Protocol.Runtime.CallArgument): string {
      const prefix = 'temp';
      let index = 1;
      while ((prefix + index) in this) {
        ++index;
      }
      const name = prefix + index;
      // @ts-ignore Assignment to global object
      this[name] = value;
      return name;
    }

    function failedToSave(result: RemoteObject|null): void {
      let message = i18nString(UIStrings.failedToSaveToTempVariable);
      if (result) {
        message = (message + ' ' + result.description as Common.UIString.LocalizedString);
      }
      Common.Console.Console.instance().error(message);
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ConsoleCleared = 'ConsoleCleared',
  MessageAdded = 'MessageAdded',
  MessageUpdated = 'MessageUpdated',
  CommandEvaluated = 'CommandEvaluated',
}

export interface CommandEvaluatedEvent {
  result: RemoteObject;
  commandMessage: ConsoleMessage;
  exceptionDetails?: Protocol.Runtime.ExceptionDetails|undefined;
}

export type EventTypes = {
  [Events.ConsoleCleared]: void,
  [Events.MessageAdded]: ConsoleMessage,
  [Events.MessageUpdated]: ConsoleMessage,
  [Events.CommandEvaluated]: CommandEvaluatedEvent,
};

export interface AffectedResources {
  requestId?: Protocol.Network.RequestId;
  issueId?: Protocol.Audits.IssueId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractExceptionMetaData(metaData: any|undefined): AffectedResources|undefined {
  if (!metaData) {
    return undefined;
  }
  return {requestId: metaData.requestId || undefined, issueId: metaData.issueId || undefined};
}

function areAffectedResourcesEquivalent(a?: AffectedResources, b?: AffectedResources): boolean {
  // Not considering issueId, as that would prevent de-duplication of console #messages.
  return a?.requestId === b?.requestId;
}

function areStackTracesEquivalent(
    stackTrace1?: Protocol.Runtime.StackTrace, stackTrace2?: Protocol.Runtime.StackTrace): boolean {
  if (!stackTrace1 !== !stackTrace2) {
    return false;
  }
  if (!stackTrace1 || !stackTrace2) {
    return true;
  }
  const callFrames1 = stackTrace1.callFrames;
  const callFrames2 = stackTrace2.callFrames;
  if (callFrames1.length !== callFrames2.length) {
    return false;
  }
  for (let i = 0, n = callFrames1.length; i < n; ++i) {
    if (callFrames1[i].scriptId !== callFrames2[i].scriptId ||
        callFrames1[i].functionName !== callFrames2[i].functionName ||
        callFrames1[i].lineNumber !== callFrames2[i].lineNumber ||
        callFrames1[i].columnNumber !== callFrames2[i].columnNumber) {
      return false;
    }
  }
  return areStackTracesEquivalent(stackTrace1.parent, stackTrace2.parent);
}

export interface ConsoleMessageDetails {
  type?: MessageType;
  url?: Platform.DevToolsPath.UrlString;
  line?: number;
  column?: number;
  parameters?: (string|RemoteObject|Protocol.Runtime.RemoteObject)[];
  stackTrace?: Protocol.Runtime.StackTrace;
  timestamp?: number;
  executionContextId?: number;
  scriptId?: Protocol.Runtime.ScriptId;
  workerId?: string;
  context?: string;
  affectedResources?: AffectedResources;
  category?: Protocol.Log.LogEntryCategory;
}

export class ConsoleMessage {
  readonly #runtimeModelInternal: RuntimeModel|null;
  source: MessageSource;
  level: Protocol.Log.LogEntryLevel|null;
  messageText: string;
  readonly type: MessageType;
  url: Platform.DevToolsPath.UrlString|undefined;
  line: number;
  column: number;
  parameters: (string|RemoteObject|Protocol.Runtime.RemoteObject)[]|undefined;
  stackTrace: Protocol.Runtime.StackTrace|undefined;
  timestamp: number;
  #executionContextId: number;
  scriptId?: Protocol.Runtime.ScriptId;
  workerId?: string;
  context?: string;
  #originatingConsoleMessage: ConsoleMessage|null = null;
  #pageLoadSequenceNumber?: number = undefined;
  #exceptionId?: number = undefined;
  #affectedResources?: AffectedResources;
  category?: Protocol.Log.LogEntryCategory;

  /**
   * The parent frame of the `console.log` call of logpoints or conditional breakpoints
   * if they called `console.*` explicitly. The parent frame is where V8 paused
   * and consequently where the logpoint is set.
   *
   * Is `null` for page console.logs, commands, command results, etc.
   */
  readonly stackFrameWithBreakpoint: Protocol.Runtime.CallFrame|null = null;
  readonly #originatingBreakpointType: BreakpointType|null = null;

  constructor(
      runtimeModel: RuntimeModel|null, source: MessageSource, level: Protocol.Log.LogEntryLevel|null,
      messageText: string, details?: ConsoleMessageDetails) {
    this.#runtimeModelInternal = runtimeModel;
    this.source = source;
    this.level = (level as Protocol.Log.LogEntryLevel | null);
    this.messageText = messageText;
    this.type = details?.type || Protocol.Runtime.ConsoleAPICalledEventType.Log;
    this.url = details?.url;
    this.line = details?.line || 0;
    this.column = details?.column || 0;
    this.parameters = details?.parameters;
    this.stackTrace = details?.stackTrace;
    this.timestamp = details?.timestamp || Date.now();
    this.#executionContextId = details?.executionContextId || 0;
    this.scriptId = details?.scriptId;
    this.workerId = details?.workerId;
    this.#affectedResources = details?.affectedResources;
    this.category = details?.category;

    if (!this.#executionContextId && this.#runtimeModelInternal) {
      if (this.scriptId) {
        this.#executionContextId = this.#runtimeModelInternal.executionContextIdForScriptId(this.scriptId);
      } else if (this.stackTrace) {
        this.#executionContextId = this.#runtimeModelInternal.executionContextForStackTrace(this.stackTrace);
      }
    }

    if (details?.context) {
      const match = details?.context.match(/[^#]*/);
      this.context = match?.[0];
    }

    if (this.stackTrace) {
      const {callFrame, type} = ConsoleMessage.#stackFrameWithBreakpoint(this.stackTrace);
      this.stackFrameWithBreakpoint = callFrame;
      this.#originatingBreakpointType = type;
    }
  }

  getAffectedResources(): AffectedResources|undefined {
    return this.#affectedResources;
  }

  setPageLoadSequenceNumber(pageLoadSequenceNumber: number): void {
    this.#pageLoadSequenceNumber = pageLoadSequenceNumber;
  }

  static fromException(
      runtimeModel: RuntimeModel, exceptionDetails: Protocol.Runtime.ExceptionDetails,
      messageType?: Protocol.Runtime.ConsoleAPICalledEventType|FrontendMessageType, timestamp?: number,
      forceUrl?: Platform.DevToolsPath.UrlString, affectedResources?: AffectedResources): ConsoleMessage {
    const details = {
      type: messageType,
      url: forceUrl || exceptionDetails.url as Platform.DevToolsPath.UrlString,
      line: exceptionDetails.lineNumber,
      column: exceptionDetails.columnNumber,
      parameters: exceptionDetails.exception ?
          [RemoteObject.fromLocalObject(exceptionDetails.text), exceptionDetails.exception] :
          undefined,
      stackTrace: exceptionDetails.stackTrace,
      timestamp,
      executionContextId: exceptionDetails.executionContextId,
      scriptId: exceptionDetails.scriptId,
      affectedResources,
    };
    return new ConsoleMessage(
        runtimeModel, Protocol.Log.LogEntrySource.Javascript, Protocol.Log.LogEntryLevel.Error,
        RuntimeModel.simpleTextFromException(exceptionDetails), details);
  }

  runtimeModel(): RuntimeModel|null {
    return this.#runtimeModelInternal;
  }

  target(): Target|null {
    return this.#runtimeModelInternal ? this.#runtimeModelInternal.target() : null;
  }

  setOriginatingMessage(originatingMessage: ConsoleMessage): void {
    this.#originatingConsoleMessage = originatingMessage;
    this.#executionContextId = originatingMessage.#executionContextId;
  }

  originatingMessage(): ConsoleMessage|null {
    return this.#originatingConsoleMessage;
  }

  setExecutionContextId(executionContextId: number): void {
    this.#executionContextId = executionContextId;
  }

  getExecutionContextId(): number {
    return this.#executionContextId;
  }

  getExceptionId(): number|undefined {
    return this.#exceptionId;
  }

  setExceptionId(exceptionId: number): void {
    this.#exceptionId = exceptionId;
  }

  isGroupMessage(): boolean {
    return this.type === Protocol.Runtime.ConsoleAPICalledEventType.StartGroup ||
        this.type === Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed ||
        this.type === Protocol.Runtime.ConsoleAPICalledEventType.EndGroup;
  }

  isGroupStartMessage(): boolean {
    return this.type === Protocol.Runtime.ConsoleAPICalledEventType.StartGroup ||
        this.type === Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed;
  }

  isErrorOrWarning(): boolean {
    return (this.level === Protocol.Log.LogEntryLevel.Warning || this.level === Protocol.Log.LogEntryLevel.Error);
  }

  isGroupable(): boolean {
    const isUngroupableError = this.level === Protocol.Log.LogEntryLevel.Error &&
        (this.source === Protocol.Log.LogEntrySource.Javascript || this.source === Protocol.Log.LogEntrySource.Network);
    return (
        this.source !== FrontendMessageSource.ConsoleAPI && this.type !== FrontendMessageType.Command &&
        this.type !== FrontendMessageType.Result && this.type !== FrontendMessageType.System && !isUngroupableError);
  }

  groupCategoryKey(): string {
    return [this.source, this.level, this.type, this.#pageLoadSequenceNumber].join(':');
  }

  isEqual(msg: ConsoleMessage|null): boolean {
    if (!msg) {
      return false;
    }

    if (this.parameters) {
      if (!msg.parameters || this.parameters.length !== msg.parameters.length) {
        return false;
      }

      for (let i = 0; i < msg.parameters.length; ++i) {
        const msgParam = msg.parameters[i];
        const param = this.parameters[i];
        if (typeof msgParam === 'string' || typeof param === 'string') {
          // TODO(chromium:1136435): Remove this case.
          return false;
        }
        // Never treat objects as equal - their properties might change over time. Errors can be treated as equal
        // since they are always formatted as strings.
        if (msgParam.type === 'object' && msgParam.subtype !== 'error') {
          return false;
        }
        if (param.type !== msgParam.type || param.value !== msgParam.value ||
            param.description !== msgParam.description) {
          return false;
        }
      }
    }

    return (this.runtimeModel() === msg.runtimeModel()) && (this.source === msg.source) && (this.type === msg.type) &&
        (this.level === msg.level) && (this.line === msg.line) && (this.url === msg.url) &&
        (this.scriptId === msg.scriptId) && (this.messageText === msg.messageText) &&
        (this.#executionContextId === msg.#executionContextId) &&
        areAffectedResourcesEquivalent(this.#affectedResources, msg.#affectedResources) &&
        areStackTracesEquivalent(this.stackTrace, msg.stackTrace);
  }

  get originatesFromLogpoint(): boolean {
    return this.#originatingBreakpointType === BreakpointType.LOGPOINT;
  }

  /** @returns true, iff this was a console.* call in a conditional breakpoint */
  get originatesFromConditionalBreakpoint(): boolean {
    return this.#originatingBreakpointType === BreakpointType.CONDITIONAL_BREAKPOINT;
  }

  static #stackFrameWithBreakpoint({callFrames}: Protocol.Runtime.StackTrace):
      {callFrame: Protocol.Runtime.CallFrame|null, type: BreakpointType|null} {
    // Note that breakpoint condition code could in theory call into user JS and back into
    // "condition-defined" functions. This means that the top-most
    // stack frame is not necessarily the `console.log` call, but there could be other things
    // on top. We want the LAST marker frame in the stack.
    // We search FROM THE TOP for the last marked stack frame and
    // return it's parent (successor).
    const markerSourceUrls = [COND_BREAKPOINT_SOURCE_URL, LOGPOINT_SOURCE_URL];
    const lastBreakpointFrameIndex = callFrames.findLastIndex(({url}) => markerSourceUrls.includes(url));
    if (lastBreakpointFrameIndex === -1 || lastBreakpointFrameIndex === callFrames.length - 1) {
      // We either didn't find any breakpoint or we didn't capture enough stack
      // frames and the breakpoint condition is the bottom-most frame.
      return {callFrame: null, type: null};
    }

    const type = callFrames[lastBreakpointFrameIndex].url === LOGPOINT_SOURCE_URL ?
        BreakpointType.LOGPOINT :
        BreakpointType.CONDITIONAL_BREAKPOINT;
    return {callFrame: callFrames[lastBreakpointFrameIndex + 1], type};
  }
}

SDKModel.register(ConsoleModel, {capabilities: Capability.JS, autostart: true});

export type MessageSource = Protocol.Log.LogEntrySource|FrontendMessageSource;
export type MessageLevel = Protocol.Log.LogEntryLevel;
export type MessageType = Protocol.Runtime.ConsoleAPICalledEventType|FrontendMessageType;

export const MessageSourceDisplayName = new Map<MessageSource, string>(([
  [Protocol.Log.LogEntrySource.XML, 'xml'],
  [Protocol.Log.LogEntrySource.Javascript, 'javascript'],
  [Protocol.Log.LogEntrySource.Network, 'network'],
  [FrontendMessageSource.ConsoleAPI, 'console-api'],
  [Protocol.Log.LogEntrySource.Storage, 'storage'],
  [Protocol.Log.LogEntrySource.Appcache, 'appcache'],
  [Protocol.Log.LogEntrySource.Rendering, 'rendering'],
  [FrontendMessageSource.CSS, 'css'],
  [Protocol.Log.LogEntrySource.Security, 'security'],
  [Protocol.Log.LogEntrySource.Deprecation, 'deprecation'],
  [Protocol.Log.LogEntrySource.Worker, 'worker'],
  [Protocol.Log.LogEntrySource.Violation, 'violation'],
  [Protocol.Log.LogEntrySource.Intervention, 'intervention'],
  [Protocol.Log.LogEntrySource.Recommendation, 'recommendation'],
  [Protocol.Log.LogEntrySource.Other, 'other'],
]));
