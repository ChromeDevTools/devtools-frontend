// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
 *     * Neither the #name of Google Inc. nor the names of its
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
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import type {GetPropertiesResult, RemoteObject} from './RemoteObject.js';
import {ScopeRef} from './RemoteObject.js';
import {Events as ResourceTreeModelEvents, ResourceTreeModel} from './ResourceTreeModel.js';
import type {EvaluationOptions, EvaluationResult, ExecutionContext} from './RuntimeModel.js';
import {RuntimeModel} from './RuntimeModel.js';
import {Script} from './Script.js';
import type {Target} from './Target.js';
import {Capability, Type} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {SourceMapManager} from './SourceMapManager.js';

const UIStrings = {
  /**
  *@description Title of a section in the debugger showing local JavaScript variables.
  */
  local: 'Local',
  /**
  *@description Text that refers to closure as a programming term
  */
  closure: 'Closure',
  /**
  *@description Noun that represents a section or block of code in the Debugger Model. Shown in the Sources tab, while paused on a breakpoint.
  */
  block: 'Block',
  /**
  *@description Label for a group of JavaScript files
  */
  script: 'Script',
  /**
  *@description Title of a section in the debugger showing JavaScript variables from the a 'with'
  *block. Block here means section of code, 'with' refers to a JavaScript programming concept.
  */
  withBlock: '`With` Block',
  /**
  *@description Title of a section in the debugger showing JavaScript variables from the global scope.
  */
  global: 'Global',
  /**
  *@description Text for a JavaScript module, the programming concept
  */
  module: 'Module',
  /**
  *@description Text describing the expression scope in WebAssembly
  */
  expression: 'Expression',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/DebuggerModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function sortAndMergeRanges(locationRanges: LocationRange[]): LocationRange[] {
  if (locationRanges.length === 0) {
    return [];
  }
  locationRanges.sort(LocationRange.comparator);
  let prev: LocationRange = locationRanges[0];
  const merged = [];
  for (let i = 1; i < locationRanges.length; ++i) {
    const current = locationRanges[i];
    if (prev.overlap(current)) {
      const largerEnd = prev.end.compareTo(current.end) > 0 ? prev.end : current.end;
      prev = new LocationRange(prev.scriptId, prev.start, largerEnd);
    } else {
      merged.push(prev);
      prev = current;
    }
  }
  merged.push(prev);
  return merged;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum StepMode {
  StepInto = 'StepInto',
  StepOut = 'StepOut',
  StepOver = 'StepOver',
}

export class DebuggerModel extends SDKModel<EventTypes> {
  readonly agent: ProtocolProxyApi.DebuggerApi;
  runtimeModelInternal: RuntimeModel;
  readonly #sourceMapManagerInternal: SourceMapManager<Script>;
  readonly #sourceMapIdToScript: Map<string, Script>;
  #debuggerPausedDetailsInternal: DebuggerPausedDetails|null;
  readonly #scriptsInternal: Map<string, Script>;
  readonly #scriptsBySourceURL: Map<string, Script[]>;
  #discardableScripts: Script[];
  continueToLocationCallback: ((arg0: DebuggerPausedDetails) => boolean)|null;
  #selectedCallFrameInternal: CallFrame|null;
  #debuggerEnabledInternal: boolean;
  #debuggerId: string|null;
  #skipAllPausesTimeout: number;
  #beforePausedCallback: ((arg0: DebuggerPausedDetails) => boolean)|null;
  #computeAutoStepRangesCallback: ((arg0: StepMode, arg1: CallFrame) => Promise<Array<{
                                     start: Location,
                                     end: Location,
                                   }>>)|null;
  #expandCallFramesCallback: ((arg0: Array<CallFrame>) => Promise<Array<CallFrame>>)|null;
  evaluateOnCallFrameCallback: ((arg0: CallFrame, arg1: EvaluationOptions) => Promise<EvaluationResult|null>)|null;
  // We need to be able to register listeners for individual breakpoints. As such, we dispatch
  // on breakpoint ids, which are not statically known. The event #payload will always be a `Location`.
  readonly #breakpointResolvedEventTarget =
      new Common.ObjectWrapper.ObjectWrapper<{[breakpointId: string]: Location}>();
  #autoStepOver: boolean;
  #isPausingInternal: boolean;

  constructor(target: Target) {
    super(target);

    target.registerDebuggerDispatcher(new DebuggerDispatcher(this));
    this.agent = target.debuggerAgent();
    this.runtimeModelInternal = (target.model(RuntimeModel) as RuntimeModel);

    this.#sourceMapManagerInternal = new SourceMapManager(target);
    this.#sourceMapIdToScript = new Map();

    this.#debuggerPausedDetailsInternal = null;
    this.#scriptsInternal = new Map();
    this.#scriptsBySourceURL = new Map();
    this.#discardableScripts = [];
    this.continueToLocationCallback = null;
    this.#selectedCallFrameInternal = null;
    this.#debuggerEnabledInternal = false;
    this.#debuggerId = null;
    this.#skipAllPausesTimeout = 0;
    this.#beforePausedCallback = null;
    this.#computeAutoStepRangesCallback = null;
    this.#expandCallFramesCallback = null;
    this.evaluateOnCallFrameCallback = null;

    this.#autoStepOver = false;

    this.#isPausingInternal = false;
    Common.Settings.Settings.instance()
        .moduleSetting('pauseOnExceptionEnabled')
        .addChangeListener(this.pauseOnExceptionStateChanged, this);
    Common.Settings.Settings.instance()
        .moduleSetting('pauseOnCaughtException')
        .addChangeListener(this.pauseOnExceptionStateChanged, this);
    Common.Settings.Settings.instance()
        .moduleSetting('disableAsyncStackTraces')
        .addChangeListener(this.asyncStackTracesStateChanged, this);
    Common.Settings.Settings.instance()
        .moduleSetting('breakpointsActive')
        .addChangeListener(this.breakpointsActiveChanged, this);

    if (!target.suspended()) {
      void this.enableDebugger();
    }

    this.#sourceMapManagerInternal.setEnabled(
        Common.Settings.Settings.instance().moduleSetting('jsSourceMapsEnabled').get());
    Common.Settings.Settings.instance()
        .moduleSetting('jsSourceMapsEnabled')
        .addChangeListener(event => this.#sourceMapManagerInternal.setEnabled((event.data as boolean)));

    const resourceTreeModel = (target.model(ResourceTreeModel) as ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(ResourceTreeModelEvents.FrameNavigated, this.onFrameNavigated, this);
    }
  }

  static sourceMapId(executionContextId: number, sourceURL: string, sourceMapURL: string|undefined): string|null {
    if (!sourceMapURL) {
      return null;
    }
    return executionContextId + ':' + sourceURL + ':' + sourceMapURL;
  }

  sourceMapManager(): SourceMapManager<Script> {
    return this.#sourceMapManagerInternal;
  }

  runtimeModel(): RuntimeModel {
    return this.runtimeModelInternal;
  }

  debuggerEnabled(): boolean {
    return Boolean(this.#debuggerEnabledInternal);
  }

  private async enableDebugger(): Promise<void> {
    if (this.#debuggerEnabledInternal) {
      return;
    }
    this.#debuggerEnabledInternal = true;

    // Set a limit for the total size of collected script sources retained by debugger.
    // 10MB for remote frontends, 100MB for others.
    const isRemoteFrontend = Root.Runtime.Runtime.queryParam('remoteFrontend') || Root.Runtime.Runtime.queryParam('ws');
    const maxScriptsCacheSize = isRemoteFrontend ? 10e6 : 100e6;
    const enablePromise = this.agent.invoke_enable({maxScriptsCacheSize});
    void enablePromise.then(this.registerDebugger.bind(this));
    this.pauseOnExceptionStateChanged();
    void this.asyncStackTracesStateChanged();
    if (!Common.Settings.Settings.instance().moduleSetting('breakpointsActive').get()) {
      this.breakpointsActiveChanged();
    }
    if (_scheduledPauseOnAsyncCall) {
      void this.pauseOnAsyncCall(_scheduledPauseOnAsyncCall);
    }
    this.dispatchEventToListeners(Events.DebuggerWasEnabled, this);
    await enablePromise;
  }

  async syncDebuggerId(): Promise<Protocol.Debugger.EnableResponse> {
    const isRemoteFrontend = Root.Runtime.Runtime.queryParam('remoteFrontend') || Root.Runtime.Runtime.queryParam('ws');
    const maxScriptsCacheSize = isRemoteFrontend ? 10e6 : 100e6;
    const enablePromise = this.agent.invoke_enable({maxScriptsCacheSize});
    void enablePromise.then(this.registerDebugger.bind(this));
    return enablePromise;
  }

  private onFrameNavigated(): void {
    if (DebuggerModel.shouldResyncDebuggerId) {
      return;
    }

    DebuggerModel.shouldResyncDebuggerId = true;
  }

  private registerDebugger(response: Protocol.Debugger.EnableResponse): void {
    if (response.getError()) {
      return;
    }
    const {debuggerId} = response;
    _debuggerIdToModel.set(debuggerId, this);
    this.#debuggerId = debuggerId;
    this.dispatchEventToListeners(Events.DebuggerIsReadyToPause, this);
  }

  isReadyToPause(): boolean {
    return Boolean(this.#debuggerId);
  }

  static async modelForDebuggerId(debuggerId: string): Promise<DebuggerModel|null> {
    if (DebuggerModel.shouldResyncDebuggerId) {
      await DebuggerModel.resyncDebuggerIdForModels();
      DebuggerModel.shouldResyncDebuggerId = false;
    }
    return _debuggerIdToModel.get(debuggerId) || null;
  }

  static async resyncDebuggerIdForModels(): Promise<void> {
    const dbgModels = _debuggerIdToModel.values();
    for (const dbgModel of dbgModels) {
      if (dbgModel.debuggerEnabled()) {
        await dbgModel.syncDebuggerId();
      }
    }
  }

  private async disableDebugger(): Promise<void> {
    if (!this.#debuggerEnabledInternal) {
      return;
    }
    this.#debuggerEnabledInternal = false;

    await this.asyncStackTracesStateChanged();
    await this.agent.invoke_disable();
    this.#isPausingInternal = false;
    this.globalObjectCleared();
    this.dispatchEventToListeners(Events.DebuggerWasDisabled);
    if (typeof this.#debuggerId === 'string') {
      _debuggerIdToModel.delete(this.#debuggerId);
    }
    this.#debuggerId = null;
  }

  private skipAllPauses(skip: boolean): void {
    if (this.#skipAllPausesTimeout) {
      clearTimeout(this.#skipAllPausesTimeout);
      this.#skipAllPausesTimeout = 0;
    }
    void this.agent.invoke_setSkipAllPauses({skip});
  }

  skipAllPausesUntilReloadOrTimeout(timeout: number): void {
    if (this.#skipAllPausesTimeout) {
      clearTimeout(this.#skipAllPausesTimeout);
    }
    void this.agent.invoke_setSkipAllPauses({skip: true});
    // If reload happens before the timeout, the flag will be already unset and the timeout callback won't change anything.
    this.#skipAllPausesTimeout = window.setTimeout(this.skipAllPauses.bind(this, false), timeout);
  }

  private pauseOnExceptionStateChanged(): void {
    let state: Protocol.Debugger.SetPauseOnExceptionsRequestState;
    if (!Common.Settings.Settings.instance().moduleSetting('pauseOnExceptionEnabled').get()) {
      state = Protocol.Debugger.SetPauseOnExceptionsRequestState.None;
    } else if (Common.Settings.Settings.instance().moduleSetting('pauseOnCaughtException').get()) {
      state = Protocol.Debugger.SetPauseOnExceptionsRequestState.All;
    } else {
      state = Protocol.Debugger.SetPauseOnExceptionsRequestState.Uncaught;
    }

    void this.agent.invoke_setPauseOnExceptions({state});
  }

  private asyncStackTracesStateChanged(): Promise<Protocol.ProtocolResponseWithError> {
    const maxAsyncStackChainDepth = 32;
    const enabled = !Common.Settings.Settings.instance().moduleSetting('disableAsyncStackTraces').get() &&
        this.#debuggerEnabledInternal;
    const maxDepth = enabled ? maxAsyncStackChainDepth : 0;
    return this.agent.invoke_setAsyncCallStackDepth({maxDepth});
  }

  private breakpointsActiveChanged(): void {
    void this.agent.invoke_setBreakpointsActive(
        {active: Common.Settings.Settings.instance().moduleSetting('breakpointsActive').get()});
  }

  setComputeAutoStepRangesCallback(callback: ((arg0: StepMode, arg1: CallFrame) => Promise<Array<{
                                                start: Location,
                                                end: Location,
                                              }>>)|null): void {
    this.#computeAutoStepRangesCallback = callback;
  }

  private async computeAutoStepSkipList(mode: StepMode): Promise<Protocol.Debugger.LocationRange[]> {
    let ranges: {
      start: Location,
      end: Location,
    }[] = [];
    if (this.#computeAutoStepRangesCallback && this.#debuggerPausedDetailsInternal) {
      const [callFrame] = this.#debuggerPausedDetailsInternal.callFrames;
      ranges = await this.#computeAutoStepRangesCallback.call(null, mode, callFrame);
    }
    const skipList = ranges.map(
        location => new LocationRange(
            location.start.scriptId, new ScriptPosition(location.start.lineNumber, location.start.columnNumber),
            new ScriptPosition(location.end.lineNumber, location.end.columnNumber)));
    return sortAndMergeRanges(skipList).map(x => x.payload());
  }

  async stepInto(): Promise<void> {
    const skipList = await this.computeAutoStepSkipList(StepMode.StepInto);
    void this.agent.invoke_stepInto({breakOnAsyncCall: false, skipList});
  }

  async stepOver(): Promise<void> {
    // Mark that in case of auto-stepping, we should be doing
    // step-over instead of step-in.
    this.#autoStepOver = true;
    const skipList = await this.computeAutoStepSkipList(StepMode.StepOver);
    void this.agent.invoke_stepOver({skipList});
  }

  async stepOut(): Promise<void> {
    const skipList = await this.computeAutoStepSkipList(StepMode.StepOut);
    if (skipList.length !== 0) {
      void this.agent.invoke_stepOver({skipList});
    } else {
      void this.agent.invoke_stepOut();
    }
  }

  scheduleStepIntoAsync(): void {
    void this.computeAutoStepSkipList(StepMode.StepInto).then(skipList => {
      void this.agent.invoke_stepInto({breakOnAsyncCall: true, skipList});
    });
  }

  resume(): void {
    void this.agent.invoke_resume({terminateOnResume: false});
    this.#isPausingInternal = false;
  }

  pause(): void {
    this.#isPausingInternal = true;
    this.skipAllPauses(false);
    void this.agent.invoke_pause();
  }

  private pauseOnAsyncCall(parentStackTraceId: Protocol.Runtime.StackTraceId): Promise<Object> {
    return this.agent.invoke_pauseOnAsyncCall({parentStackTraceId: parentStackTraceId});
  }

  async setBreakpointByURL(url: string, lineNumber: number, columnNumber?: number, condition?: string):
      Promise<SetBreakpointResult> {
    // Convert file url to node-js path.
    let urlRegex;
    if (this.target().type() === Type.Node && url.startsWith('file://')) {
      // TODO(crbug.com/1253323): Cast to UrlString will be removed when migration to branded types is complete.
      const platformPath =
          Common.ParsedURL.ParsedURL.capFilePrefix(url as Platform.DevToolsPath.UrlString, Host.Platform.isWin());
      urlRegex =
          `${Platform.StringUtilities.escapeForRegExp(platformPath)}|${Platform.StringUtilities.escapeForRegExp(url)}`;
    }
    // Adjust column if needed.
    let minColumnNumber = 0;
    const scripts = this.#scriptsBySourceURL.get(url) || [];
    for (let i = 0, l = scripts.length; i < l; ++i) {
      const script = scripts[i];
      if (lineNumber === script.lineOffset) {
        minColumnNumber = minColumnNumber ? Math.min(minColumnNumber, script.columnOffset) : script.columnOffset;
      }
    }
    columnNumber = Math.max(columnNumber || 0, minColumnNumber);
    const response = await this.agent.invoke_setBreakpointByUrl({
      lineNumber: lineNumber,
      url: urlRegex ? undefined : url,
      urlRegex: urlRegex,
      columnNumber: columnNumber,
      condition: condition,
    });
    if (response.getError()) {
      return {locations: [], breakpointId: null};
    }
    let locations: Location[] = [];
    if (response.locations) {
      locations = response.locations.map(payload => Location.fromPayload(this, payload));
    }
    return {locations, breakpointId: response.breakpointId};
  }

  async setBreakpointInAnonymousScript(
      scriptId: Protocol.Runtime.ScriptId, scriptHash: string, lineNumber: number, columnNumber?: number,
      condition?: string): Promise<SetBreakpointResult> {
    const response = await this.agent.invoke_setBreakpointByUrl(
        {lineNumber: lineNumber, scriptHash: scriptHash, columnNumber: columnNumber, condition: condition});
    const error = response.getError();
    if (error) {
      // Old V8 backend doesn't support scriptHash argument.
      if (error !== 'Either url or urlRegex must be specified.') {
        return {locations: [], breakpointId: null};
      }
      return this.setBreakpointBySourceId(scriptId, lineNumber, columnNumber, condition);
    }
    let locations: Location[] = [];
    if (response.locations) {
      locations = response.locations.map(payload => Location.fromPayload(this, payload));
    }
    return {locations, breakpointId: response.breakpointId};
  }

  private async setBreakpointBySourceId(
      scriptId: Protocol.Runtime.ScriptId, lineNumber: number, columnNumber?: number,
      condition?: string): Promise<SetBreakpointResult> {
    // This method is required for backward compatibility with V8 before 6.3.275.
    const response = await this.agent.invoke_setBreakpoint(
        {location: {scriptId: scriptId, lineNumber: lineNumber, columnNumber: columnNumber}, condition: condition});
    if (response.getError()) {
      return {breakpointId: null, locations: []};
    }
    let actualLocation: Location[] = [];
    if (response.actualLocation) {
      actualLocation = [Location.fromPayload(this, response.actualLocation)];
    }
    return {locations: actualLocation, breakpointId: response.breakpointId};
  }

  async removeBreakpoint(breakpointId: Protocol.Debugger.BreakpointId): Promise<void> {
    const response = await this.agent.invoke_removeBreakpoint({breakpointId});
    if (response.getError()) {
      console.error('Failed to remove breakpoint: ' + response.getError());
    }
  }

  async getPossibleBreakpoints(startLocation: Location, endLocation: Location|null, restrictToFunction: boolean):
      Promise<BreakLocation[]> {
    const response = await this.agent.invoke_getPossibleBreakpoints({
      start: startLocation.payload(),
      end: endLocation ? endLocation.payload() : undefined,
      restrictToFunction: restrictToFunction,
    });
    if (response.getError() || !response.locations) {
      return [];
    }
    return response.locations.map(location => BreakLocation.fromPayload(this, location));
  }

  async fetchAsyncStackTrace(stackId: Protocol.Runtime.StackTraceId): Promise<Protocol.Runtime.StackTrace|null> {
    const response = await this.agent.invoke_getStackTrace({stackTraceId: stackId});
    return response.getError() ? null : response.stackTrace;
  }

  breakpointResolved(breakpointId: string, location: Protocol.Debugger.Location): void {
    this.#breakpointResolvedEventTarget.dispatchEventToListeners(breakpointId, Location.fromPayload(this, location));
  }

  globalObjectCleared(): void {
    this.setDebuggerPausedDetails(null);
    this.reset();
    // TODO(dgozman): move clients to ExecutionContextDestroyed/ScriptCollected events.
    this.dispatchEventToListeners(Events.GlobalObjectCleared, this);
  }

  private reset(): void {
    for (const scriptWithSourceMap of this.#sourceMapIdToScript.values()) {
      this.#sourceMapManagerInternal.detachSourceMap(scriptWithSourceMap);
    }
    this.#sourceMapIdToScript.clear();

    this.#scriptsInternal.clear();
    this.#scriptsBySourceURL.clear();
    this.#discardableScripts = [];
    this.#autoStepOver = false;
  }

  scripts(): Script[] {
    return Array.from(this.#scriptsInternal.values());
  }

  scriptForId(scriptId: string): Script|null {
    return this.#scriptsInternal.get(scriptId) || null;
  }

  scriptsForSourceURL(sourceURL: string|null): Script[] {
    if (!sourceURL) {
      return [];
    }
    return this.#scriptsBySourceURL.get(sourceURL) || [];
  }

  scriptsForExecutionContext(executionContext: ExecutionContext): Script[] {
    const result = [];
    for (const script of this.#scriptsInternal.values()) {
      if (script.executionContextId === executionContext.id) {
        result.push(script);
      }
    }
    return result;
  }

  setScriptSource(
      scriptId: string, newSource: string,
      callback: (error: string|null, arg1?: Protocol.Runtime.ExceptionDetails|undefined) => void): void {
    const script = this.#scriptsInternal.get(scriptId);
    if (script) {
      void script.editSource(newSource, this.didEditScriptSource.bind(this, scriptId, newSource, callback));
    }
  }

  private didEditScriptSource(
      scriptId: string, newSource: string,
      callback: (error: string|null, arg1?: Protocol.Runtime.ExceptionDetails|undefined) => void, error: string|null,
      exceptionDetails?: Protocol.Runtime.ExceptionDetails, callFrames?: Protocol.Debugger.CallFrame[],
      asyncStackTrace?: Protocol.Runtime.StackTrace, asyncStackTraceId?: Protocol.Runtime.StackTraceId,
      needsStepIn?: boolean): void {
    callback(error, exceptionDetails);
    if (needsStepIn) {
      void this.stepInto();
      return;
    }

    if (!error && callFrames && callFrames.length && this.#debuggerPausedDetailsInternal) {
      void this.pausedScript(
          callFrames, this.#debuggerPausedDetailsInternal.reason, this.#debuggerPausedDetailsInternal.auxData,
          this.#debuggerPausedDetailsInternal.breakpointIds, asyncStackTrace, asyncStackTraceId);
    }
  }

  get callFrames(): CallFrame[]|null {
    return this.#debuggerPausedDetailsInternal ? this.#debuggerPausedDetailsInternal.callFrames : null;
  }

  debuggerPausedDetails(): DebuggerPausedDetails|null {
    return this.#debuggerPausedDetailsInternal;
  }

  private setDebuggerPausedDetails(debuggerPausedDetails: DebuggerPausedDetails|null): boolean {
    if (debuggerPausedDetails) {
      this.#isPausingInternal = false;
      this.#debuggerPausedDetailsInternal = debuggerPausedDetails;
      if (this.#beforePausedCallback) {
        if (!this.#beforePausedCallback.call(null, debuggerPausedDetails)) {
          return false;
        }
      }
      // If we resolved a location in auto-stepping callback, reset the
      // step-over marker.
      this.#autoStepOver = false;
      this.dispatchEventToListeners(Events.DebuggerPaused, this);
      this.setSelectedCallFrame(debuggerPausedDetails.callFrames[0]);
    } else {
      this.#isPausingInternal = false;
      this.#debuggerPausedDetailsInternal = null;
      this.setSelectedCallFrame(null);
    }
    return true;
  }

  setBeforePausedCallback(callback: ((arg0: DebuggerPausedDetails) => boolean)|null): void {
    this.#beforePausedCallback = callback;
  }

  setExpandCallFramesCallback(callback: ((arg0: Array<CallFrame>) => Promise<Array<CallFrame>>)|null): void {
    this.#expandCallFramesCallback = callback;
  }

  setEvaluateOnCallFrameCallback(callback:
                                     ((arg0: CallFrame, arg1: EvaluationOptions) => Promise<EvaluationResult|null>)|
                                 null): void {
    this.evaluateOnCallFrameCallback = callback;
  }

  async pausedScript(
      callFrames: Protocol.Debugger.CallFrame[], reason: Protocol.Debugger.PausedEventReason, auxData: Object|undefined,
      breakpointIds: string[], asyncStackTrace?: Protocol.Runtime.StackTrace,
      asyncStackTraceId?: Protocol.Runtime.StackTraceId,
      asyncCallStackTraceId?: Protocol.Runtime.StackTraceId): Promise<void> {
    if (asyncCallStackTraceId) {
      // Note: this is only to support old backends. Newer ones do not send asyncCallStackTraceId.
      _scheduledPauseOnAsyncCall = asyncCallStackTraceId;
      const promises = [];
      for (const model of _debuggerIdToModel.values()) {
        promises.push(model.pauseOnAsyncCall(asyncCallStackTraceId));
      }
      await Promise.all(promises);
      this.resume();
      return;
    }

    const pausedDetails =
        new DebuggerPausedDetails(this, callFrames, reason, auxData, breakpointIds, asyncStackTrace, asyncStackTraceId);

    if (this.#expandCallFramesCallback) {
      pausedDetails.callFrames = await this.#expandCallFramesCallback.call(null, pausedDetails.callFrames);
    }

    if (this.continueToLocationCallback) {
      const callback = this.continueToLocationCallback;
      this.continueToLocationCallback = null;
      if (callback(pausedDetails)) {
        return;
      }
    }

    if (!this.setDebuggerPausedDetails(pausedDetails)) {
      if (this.#autoStepOver) {
        void this.stepOver();
      } else {
        void this.stepInto();
      }
    } else {
      Common.EventTarget.fireEvent('DevTools.DebuggerPaused');
    }

    _scheduledPauseOnAsyncCall = null;
  }

  resumedScript(): void {
    this.setDebuggerPausedDetails(null);
    this.dispatchEventToListeners(Events.DebuggerResumed, this);
  }

  parsedScriptSource(
      scriptId: Protocol.Runtime.ScriptId, sourceURL: string, startLine: number, startColumn: number, endLine: number,
      endColumn: number,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      executionContextId: number, hash: string, executionContextAuxData: any, isLiveEdit: boolean,
      sourceMapURL: string|undefined, hasSourceURLComment: boolean, hasSyntaxError: boolean, length: number,
      isModule: boolean|null, originStackTrace: Protocol.Runtime.StackTrace|null, codeOffset: number|null,
      scriptLanguage: string|null, debugSymbols: Protocol.Debugger.DebugSymbols|null,
      embedderName: string|null): Script {
    const knownScript = this.#scriptsInternal.get(scriptId);
    if (knownScript) {
      return knownScript;
    }
    let isContentScript = false;
    if (executionContextAuxData && ('isDefault' in executionContextAuxData)) {
      isContentScript = !executionContextAuxData['isDefault'];
    }
    const script = new Script(
        this, scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
        isContentScript, isLiveEdit, sourceMapURL, hasSourceURLComment, length, isModule, originStackTrace, codeOffset,
        scriptLanguage, debugSymbols, embedderName);
    this.registerScript(script);
    this.dispatchEventToListeners(Events.ParsedScriptSource, script);

    const sourceMapId = DebuggerModel.sourceMapId(script.executionContextId, script.sourceURL, script.sourceMapURL);
    if (sourceMapId && !hasSyntaxError) {
      // Consecutive script evaluations in the same execution context with the same #sourceURL
      // and sourceMappingURL should result in source map reloading.
      const previousScript = this.#sourceMapIdToScript.get(sourceMapId);
      if (previousScript) {
        this.#sourceMapManagerInternal.detachSourceMap(previousScript);
      }
      this.#sourceMapIdToScript.set(sourceMapId, script);
      this.#sourceMapManagerInternal.attachSourceMap(script, script.sourceURL, script.sourceMapURL);
    }

    const isDiscardable = hasSyntaxError && script.isAnonymousScript();
    if (isDiscardable) {
      this.#discardableScripts.push(script);
      this.collectDiscardedScripts();
    }
    return script;
  }

  setSourceMapURL(script: Script, newSourceMapURL: string): void {
    let sourceMapId = DebuggerModel.sourceMapId(script.executionContextId, script.sourceURL, script.sourceMapURL);
    if (sourceMapId && this.#sourceMapIdToScript.get(sourceMapId) === script) {
      this.#sourceMapIdToScript.delete(sourceMapId);
    }
    this.#sourceMapManagerInternal.detachSourceMap(script);

    script.sourceMapURL = newSourceMapURL;
    sourceMapId = DebuggerModel.sourceMapId(script.executionContextId, script.sourceURL, script.sourceMapURL);
    if (!sourceMapId) {
      return;
    }
    this.#sourceMapIdToScript.set(sourceMapId, script);
    this.#sourceMapManagerInternal.attachSourceMap(script, script.sourceURL, script.sourceMapURL);
  }

  executionContextDestroyed(executionContext: ExecutionContext): void {
    const sourceMapIds = Array.from(this.#sourceMapIdToScript.keys());
    for (const sourceMapId of sourceMapIds) {
      const script = this.#sourceMapIdToScript.get(sourceMapId);
      if (script && script.executionContextId === executionContext.id) {
        this.#sourceMapIdToScript.delete(sourceMapId);
        this.#sourceMapManagerInternal.detachSourceMap(script);
      }
    }
  }

  private registerScript(script: Script): void {
    this.#scriptsInternal.set(script.scriptId, script);
    if (script.isAnonymousScript()) {
      return;
    }

    let scripts = this.#scriptsBySourceURL.get(script.sourceURL);
    if (!scripts) {
      scripts = [];
      this.#scriptsBySourceURL.set(script.sourceURL, scripts);
    }
    scripts.push(script);
  }

  private unregisterScript(script: Script): void {
    console.assert(script.isAnonymousScript());
    this.#scriptsInternal.delete(script.scriptId);
  }

  private collectDiscardedScripts(): void {
    if (this.#discardableScripts.length < 1000) {
      return;
    }
    const scriptsToDiscard = this.#discardableScripts.splice(0, 100);
    for (const script of scriptsToDiscard) {
      this.unregisterScript(script);
      this.dispatchEventToListeners(Events.DiscardedAnonymousScriptSource, script);
    }
  }

  createRawLocation(script: Script, lineNumber: number, columnNumber: number, inlineFrameIndex?: number): Location {
    return this.createRawLocationByScriptId(script.scriptId, lineNumber, columnNumber, inlineFrameIndex);
  }

  createRawLocationByURL(sourceURL: string, lineNumber: number, columnNumber?: number, inlineFrameIndex?: number):
      Location|null {
    for (const script of this.#scriptsBySourceURL.get(sourceURL) || []) {
      if (script.lineOffset > lineNumber ||
          (script.lineOffset === lineNumber && columnNumber !== undefined && script.columnOffset > columnNumber)) {
        continue;
      }
      if (script.endLine < lineNumber ||
          (script.endLine === lineNumber && columnNumber !== undefined && script.endColumn <= columnNumber)) {
        continue;
      }
      return new Location(this, script.scriptId, lineNumber, columnNumber, inlineFrameIndex);
    }
    return null;
  }

  createRawLocationByScriptId(
      scriptId: Protocol.Runtime.ScriptId, lineNumber: number, columnNumber?: number,
      inlineFrameIndex?: number): Location {
    return new Location(this, scriptId, lineNumber, columnNumber, inlineFrameIndex);
  }

  createRawLocationsByStackTrace(stackTrace: Protocol.Runtime.StackTrace): Location[] {
    const rawLocations: Location[] = [];
    for (let current: Protocol.Runtime.StackTrace|undefined = stackTrace; current; current = current.parent) {
      for (const {scriptId, lineNumber, columnNumber} of current.callFrames) {
        rawLocations.push(this.createRawLocationByScriptId(scriptId, lineNumber, columnNumber));
      }
    }
    return rawLocations;
  }

  isPaused(): boolean {
    return Boolean(this.debuggerPausedDetails());
  }

  isPausing(): boolean {
    return this.#isPausingInternal;
  }

  setSelectedCallFrame(callFrame: CallFrame|null): void {
    if (this.#selectedCallFrameInternal === callFrame) {
      return;
    }
    this.#selectedCallFrameInternal = callFrame;
    this.dispatchEventToListeners(Events.CallFrameSelected, this);
  }

  selectedCallFrame(): CallFrame|null {
    return this.#selectedCallFrameInternal;
  }

  async evaluateOnSelectedCallFrame(options: EvaluationOptions): Promise<EvaluationResult> {
    const callFrame = this.selectedCallFrame();
    if (!callFrame) {
      throw new Error('No call frame selected');
    }
    return callFrame.evaluate(options);
  }

  functionDetailsPromise(remoteObject: RemoteObject): Promise<FunctionDetails|null> {
    return remoteObject.getAllProperties(false /* accessorPropertiesOnly */, false /* generatePreview */)
        .then(buildDetails.bind(this));

    function buildDetails(this: DebuggerModel, response: GetPropertiesResult): FunctionDetails|null {
      if (!response) {
        return null;
      }
      let location: (RemoteObject|null|undefined)|null = null;
      if (response.internalProperties) {
        for (const prop of response.internalProperties) {
          if (prop.name === '[[FunctionLocation]]') {
            location = prop.value;
          }
        }
      }
      let functionName: RemoteObject|null = null;
      if (response.properties) {
        for (const prop of response.properties) {
          if (prop.name === 'name' && prop.value && prop.value.type === 'string') {
            functionName = prop.value;
          }
        }
      }
      let debuggerLocation: Location|null = null;
      if (location) {
        debuggerLocation = this.createRawLocationByScriptId(
            location.value.scriptId, location.value.lineNumber, location.value.columnNumber);
      }
      return {location: debuggerLocation, functionName: functionName ? functionName.value as string : ''};
    }
  }

  async setVariableValue(
      scopeNumber: number, variableName: string, newValue: Protocol.Runtime.CallArgument,
      callFrameId: Protocol.Debugger.CallFrameId): Promise<string|undefined> {
    const response = await this.agent.invoke_setVariableValue({scopeNumber, variableName, newValue, callFrameId});
    const error = response.getError();
    if (error) {
      console.error(error);
    }
    return error;
  }

  addBreakpointListener(
      breakpointId: string, listener: (arg0: Common.EventTarget.EventTargetEvent<Location>) => void,
      thisObject?: Object): void {
    this.#breakpointResolvedEventTarget.addEventListener(breakpointId, listener, thisObject);
  }

  removeBreakpointListener(
      breakpointId: string, listener: (arg0: Common.EventTarget.EventTargetEvent<Location>) => void,
      thisObject?: Object): void {
    this.#breakpointResolvedEventTarget.removeEventListener(breakpointId, listener, thisObject);
  }

  async setBlackboxPatterns(patterns: string[]): Promise<boolean> {
    const response = await this.agent.invoke_setBlackboxPatterns({patterns});
    const error = response.getError();
    if (error) {
      console.error(error);
    }
    return !error;
  }

  dispose(): void {
    this.#sourceMapManagerInternal.dispose();
    if (this.#debuggerId) {
      _debuggerIdToModel.delete(this.#debuggerId);
    }
    Common.Settings.Settings.instance()
        .moduleSetting('pauseOnExceptionEnabled')
        .removeChangeListener(this.pauseOnExceptionStateChanged, this);
    Common.Settings.Settings.instance()
        .moduleSetting('pauseOnCaughtException')
        .removeChangeListener(this.pauseOnExceptionStateChanged, this);
    Common.Settings.Settings.instance()
        .moduleSetting('disableAsyncStackTraces')
        .removeChangeListener(this.asyncStackTracesStateChanged, this);
  }

  async suspendModel(): Promise<void> {
    await this.disableDebugger();
  }

  async resumeModel(): Promise<void> {
    await this.enableDebugger();
  }

  private static shouldResyncDebuggerId = false;

  getContinueToLocationCallback(): ((arg0: DebuggerPausedDetails) => boolean)|null {
    return this.continueToLocationCallback;
  }

  getEvaluateOnCallFrameCallback():
      ((arg0: CallFrame, arg1: EvaluationOptions) => Promise<EvaluationResult|null>)|null {
    return this.evaluateOnCallFrameCallback;
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _debuggerIdToModel = new Map<string, DebuggerModel>();

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export let _scheduledPauseOnAsyncCall: Protocol.Runtime.StackTraceId|null = null;

/**
 * Keep these in sync with WebCore::V8Debugger
 */
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum PauseOnExceptionsState {
  DontPauseOnExceptions = 'none',
  PauseOnAllExceptions = 'all',
  PauseOnUncaughtExceptions = 'uncaught',
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  DebuggerWasEnabled = 'DebuggerWasEnabled',
  DebuggerWasDisabled = 'DebuggerWasDisabled',
  DebuggerPaused = 'DebuggerPaused',
  DebuggerResumed = 'DebuggerResumed',
  ParsedScriptSource = 'ParsedScriptSource',
  DiscardedAnonymousScriptSource = 'DiscardedAnonymousScriptSource',
  GlobalObjectCleared = 'GlobalObjectCleared',
  CallFrameSelected = 'CallFrameSelected',
  DebuggerIsReadyToPause = 'DebuggerIsReadyToPause',
}

export type EventTypes = {
  [Events.DebuggerWasEnabled]: DebuggerModel,
  [Events.DebuggerWasDisabled]: void,
  [Events.DebuggerPaused]: DebuggerModel,
  [Events.DebuggerResumed]: DebuggerModel,
  [Events.ParsedScriptSource]: Script,
  [Events.DiscardedAnonymousScriptSource]: Script,
  [Events.GlobalObjectCleared]: DebuggerModel,
  [Events.CallFrameSelected]: DebuggerModel,
  [Events.DebuggerIsReadyToPause]: DebuggerModel,
};

class DebuggerDispatcher implements ProtocolProxyApi.DebuggerDispatcher {
  #debuggerModel: DebuggerModel;

  constructor(debuggerModel: DebuggerModel) {
    this.#debuggerModel = debuggerModel;
  }

  paused({callFrames, reason, data, hitBreakpoints, asyncStackTrace, asyncStackTraceId, asyncCallStackTraceId}:
             Protocol.Debugger.PausedEvent): void {
    if (!this.#debuggerModel.debuggerEnabled()) {
      return;
    }
    void this.#debuggerModel.pausedScript(
        callFrames, reason, data, hitBreakpoints || [], asyncStackTrace, asyncStackTraceId, asyncCallStackTraceId);
  }

  resumed(): void {
    if (!this.#debuggerModel.debuggerEnabled()) {
      return;
    }
    this.#debuggerModel.resumedScript();
  }

  scriptParsed({
    scriptId,
    url,
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
    length,
    isModule,
    stackTrace,
    codeOffset,
    scriptLanguage,
    debugSymbols,
    embedderName,
  }: Protocol.Debugger.ScriptParsedEvent): void {
    if (!this.#debuggerModel.debuggerEnabled()) {
      return;
    }
    this.#debuggerModel.parsedScriptSource(
        scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, executionContextAuxData,
        Boolean(isLiveEdit), sourceMapURL, Boolean(hasSourceURL), false, length || 0, isModule || null,
        stackTrace || null, codeOffset || null, scriptLanguage || null, debugSymbols || null, embedderName || null);
  }

  scriptFailedToParse({
    scriptId,
    url,
    startLine,
    startColumn,
    endLine,
    endColumn,
    executionContextId,
    hash,
    executionContextAuxData,
    sourceMapURL,
    hasSourceURL,
    length,
    isModule,
    stackTrace,
    codeOffset,
    scriptLanguage,
    embedderName,
  }: Protocol.Debugger.ScriptFailedToParseEvent): void {
    if (!this.#debuggerModel.debuggerEnabled()) {
      return;
    }
    this.#debuggerModel.parsedScriptSource(
        scriptId, url, startLine, startColumn, endLine, endColumn, executionContextId, hash, executionContextAuxData,
        false, sourceMapURL, Boolean(hasSourceURL), true, length || 0, isModule || null, stackTrace || null,
        codeOffset || null, scriptLanguage || null, null, embedderName || null);
  }

  breakpointResolved({breakpointId, location}: Protocol.Debugger.BreakpointResolvedEvent): void {
    if (!this.#debuggerModel.debuggerEnabled()) {
      return;
    }
    this.#debuggerModel.breakpointResolved(breakpointId, location);
  }
}

export class Location {
  debuggerModel: DebuggerModel;
  scriptId: Protocol.Runtime.ScriptId;
  lineNumber: number;
  columnNumber: number;
  inlineFrameIndex: number;

  constructor(
      debuggerModel: DebuggerModel, scriptId: Protocol.Runtime.ScriptId, lineNumber: number, columnNumber?: number,
      inlineFrameIndex?: number) {
    this.debuggerModel = debuggerModel;
    this.scriptId = scriptId;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber || 0;
    this.inlineFrameIndex = inlineFrameIndex || 0;
  }

  static fromPayload(debuggerModel: DebuggerModel, payload: Protocol.Debugger.Location, inlineFrameIndex?: number):
      Location {
    return new Location(debuggerModel, payload.scriptId, payload.lineNumber, payload.columnNumber, inlineFrameIndex);
  }

  payload(): Protocol.Debugger.Location {
    return {scriptId: this.scriptId, lineNumber: this.lineNumber, columnNumber: this.columnNumber};
  }

  script(): Script|null {
    return this.debuggerModel.scriptForId(this.scriptId);
  }

  continueToLocation(pausedCallback?: (() => void)): void {
    if (pausedCallback) {
      this.debuggerModel.continueToLocationCallback = this.paused.bind(this, pausedCallback);
    }
    void this.debuggerModel.agent.invoke_continueToLocation({
      location: this.payload(),
      targetCallFrames: Protocol.Debugger.ContinueToLocationRequestTargetCallFrames.Current,
    });
  }

  private paused(pausedCallback: () => void|undefined, debuggerPausedDetails: DebuggerPausedDetails): boolean {
    const location = debuggerPausedDetails.callFrames[0].location();
    if (location.scriptId === this.scriptId && location.lineNumber === this.lineNumber &&
        location.columnNumber === this.columnNumber) {
      pausedCallback();
      return true;
    }
    return false;
  }

  id(): string {
    return this.debuggerModel.target().id() + ':' + this.scriptId + ':' + this.lineNumber + ':' + this.columnNumber;
  }
}

export class ScriptPosition {
  lineNumber: number;
  columnNumber: number;
  constructor(lineNumber: number, columnNumber: number) {
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }

  payload(): Protocol.Debugger.ScriptPosition {
    return {lineNumber: this.lineNumber, columnNumber: this.columnNumber};
  }

  compareTo(other: ScriptPosition): number {
    if (this.lineNumber !== other.lineNumber) {
      return this.lineNumber - other.lineNumber;
    }
    return this.columnNumber - other.columnNumber;
  }
}

export class LocationRange {
  scriptId: Protocol.Runtime.ScriptId;
  start: ScriptPosition;
  end: ScriptPosition;
  constructor(scriptId: Protocol.Runtime.ScriptId, start: ScriptPosition, end: ScriptPosition) {
    this.scriptId = scriptId;
    this.start = start;
    this.end = end;
  }

  payload(): Protocol.Debugger.LocationRange {
    return {scriptId: this.scriptId, start: this.start.payload(), end: this.end.payload()};
  }

  static comparator(location1: LocationRange, location2: LocationRange): number {
    return location1.compareTo(location2);
  }

  compareTo(other: LocationRange): number {
    if (this.scriptId !== other.scriptId) {
      return this.scriptId > other.scriptId ? 1 : -1;
    }

    const startCmp = this.start.compareTo(other.start);
    if (startCmp) {
      return startCmp;
    }

    return this.end.compareTo(other.end);
  }

  overlap(other: LocationRange): boolean {
    if (this.scriptId !== other.scriptId) {
      return false;
    }

    const startCmp = this.start.compareTo(other.start);
    if (startCmp < 0) {
      return this.end.compareTo(other.start) >= 0;
    }
    if (startCmp > 0) {
      return this.start.compareTo(other.end) <= 0;
    }

    return true;
  }
}

export class BreakLocation extends Location {
  type: Protocol.Debugger.BreakLocationType|undefined;
  constructor(
      debuggerModel: DebuggerModel, scriptId: Protocol.Runtime.ScriptId, lineNumber: number, columnNumber?: number,
      type?: Protocol.Debugger.BreakLocationType) {
    super(debuggerModel, scriptId, lineNumber, columnNumber);
    if (type) {
      this.type = type;
    }
  }

  static fromPayload(debuggerModel: DebuggerModel, payload: Protocol.Debugger.BreakLocation): BreakLocation {
    return new BreakLocation(debuggerModel, payload.scriptId, payload.lineNumber, payload.columnNumber, payload.type);
  }
}

export class CallFrame {
  debuggerModel: DebuggerModel;
  readonly #scriptInternal: Script;
  payload: Protocol.Debugger.CallFrame;
  readonly #locationInternal: Location;
  readonly #scopeChainInternal: Scope[];
  readonly #localScopeInternal: Scope|null;
  readonly #inlineFrameIndexInternal: number;
  readonly #functionNameInternal: string;
  readonly #functionLocationInternal: Location|undefined;
  #returnValueInternal: RemoteObject|null;
  readonly warnings: string[] = [];

  constructor(
      debuggerModel: DebuggerModel, script: Script, payload: Protocol.Debugger.CallFrame, inlineFrameIndex?: number,
      functionName?: string) {
    this.debuggerModel = debuggerModel;
    this.#scriptInternal = script;
    this.payload = payload;
    this.#locationInternal = Location.fromPayload(debuggerModel, payload.location, inlineFrameIndex);
    this.#scopeChainInternal = [];
    this.#localScopeInternal = null;
    this.#inlineFrameIndexInternal = inlineFrameIndex || 0;
    this.#functionNameInternal = functionName || payload.functionName;
    for (let i = 0; i < payload.scopeChain.length; ++i) {
      const scope = new Scope(this, i);
      this.#scopeChainInternal.push(scope);
      if (scope.type() === Protocol.Debugger.ScopeType.Local) {
        this.#localScopeInternal = scope;
      }
    }
    if (payload.functionLocation) {
      this.#functionLocationInternal = Location.fromPayload(debuggerModel, payload.functionLocation);
    }
    this.#returnValueInternal =
        payload.returnValue ? this.debuggerModel.runtimeModel().createRemoteObject(payload.returnValue) : null;
  }

  static fromPayloadArray(debuggerModel: DebuggerModel, callFrames: Protocol.Debugger.CallFrame[]): CallFrame[] {
    const result = [];
    for (let i = 0; i < callFrames.length; ++i) {
      const callFrame = callFrames[i];
      const script = debuggerModel.scriptForId(callFrame.location.scriptId);
      if (script) {
        result.push(new CallFrame(debuggerModel, script, callFrame));
      }
    }
    return result;
  }

  createVirtualCallFrame(inlineFrameIndex: number, name: string): CallFrame {
    return new CallFrame(this.debuggerModel, this.#scriptInternal, this.payload, inlineFrameIndex, name);
  }

  addWarning(warning: string): void {
    this.warnings.push(warning);
  }

  get script(): Script {
    return this.#scriptInternal;
  }

  get id(): Protocol.Debugger.CallFrameId {
    return this.payload.callFrameId;
  }

  get inlineFrameIndex(): number {
    return this.#inlineFrameIndexInternal;
  }

  scopeChain(): Scope[] {
    return this.#scopeChainInternal;
  }

  localScope(): Scope|null {
    return this.#localScopeInternal;
  }

  thisObject(): RemoteObject|null {
    return this.payload.this ? this.debuggerModel.runtimeModel().createRemoteObject(this.payload.this) : null;
  }

  returnValue(): RemoteObject|null {
    return this.#returnValueInternal;
  }

  async setReturnValue(expression: string): Promise<RemoteObject|null> {
    if (!this.#returnValueInternal) {
      return null;
    }

    const evaluateResponse = await this.debuggerModel.agent.invoke_evaluateOnCallFrame(
        {callFrameId: this.id, expression: expression, silent: true, objectGroup: 'backtrace'});
    if (evaluateResponse.getError() || evaluateResponse.exceptionDetails) {
      return null;
    }
    const response = await this.debuggerModel.agent.invoke_setReturnValue({newValue: evaluateResponse.result});
    if (response.getError()) {
      return null;
    }
    this.#returnValueInternal = this.debuggerModel.runtimeModel().createRemoteObject(evaluateResponse.result);
    return this.#returnValueInternal;
  }

  get functionName(): string {
    return this.#functionNameInternal;
  }

  location(): Location {
    return this.#locationInternal;
  }

  functionLocation(): Location|null {
    return this.#functionLocationInternal || null;
  }

  async evaluate(options: EvaluationOptions): Promise<EvaluationResult> {
    const debuggerModel = this.debuggerModel;
    const runtimeModel = debuggerModel.runtimeModel();

    // Assume backends either support both throwOnSideEffect and timeout options or neither.
    const needsTerminationOptions = Boolean(options.throwOnSideEffect) || options.timeout !== undefined;
    if (needsTerminationOptions &&
        (runtimeModel.hasSideEffectSupport() === false ||
         (runtimeModel.hasSideEffectSupport() === null && !await runtimeModel.checkSideEffectSupport()))) {
      return {error: 'Side-effect checks not supported by backend.'};
    }

    const evaluateOnCallFrameCallback = debuggerModel.getEvaluateOnCallFrameCallback();
    if (evaluateOnCallFrameCallback) {
      const result = await evaluateOnCallFrameCallback(this, options);
      if (result) {
        return result;
      }
    }

    const response = await this.debuggerModel.agent.invoke_evaluateOnCallFrame({
      callFrameId: this.id,
      expression: options.expression,
      objectGroup: options.objectGroup,
      includeCommandLineAPI: options.includeCommandLineAPI,
      silent: options.silent,
      returnByValue: options.returnByValue,
      generatePreview: options.generatePreview,
      throwOnSideEffect: options.throwOnSideEffect,
      timeout: options.timeout,
    });
    const error = response.getError();
    if (error) {
      console.error(error);
      return {error: error};
    }
    return {object: runtimeModel.createRemoteObject(response.result), exceptionDetails: response.exceptionDetails};
  }

  getPayload(): Protocol.Debugger.CallFrame {
    return this.payload;
  }
}

export interface ScopeChainEntry {
  callFrame(): CallFrame;

  type(): string;

  typeName(): string;

  name(): string|undefined;

  startLocation(): Location|null;

  endLocation(): Location|null;

  object(): RemoteObject;

  description(): string;

  icon(): string|undefined;
}

export class Scope implements ScopeChainEntry {
  #callFrameInternal: CallFrame;
  #payload: Protocol.Debugger.Scope;
  readonly #typeInternal: Protocol.Debugger.ScopeType;
  readonly #nameInternal: string|undefined;
  #ordinal: number;
  readonly #startLocationInternal: Location|null;
  readonly #endLocationInternal: Location|null;
  #objectInternal: RemoteObject|null;
  constructor(callFrame: CallFrame, ordinal: number) {
    this.#callFrameInternal = callFrame;
    this.#payload = callFrame.getPayload().scopeChain[ordinal];
    this.#typeInternal = this.#payload.type;
    this.#nameInternal = this.#payload.name;
    this.#ordinal = ordinal;
    this.#startLocationInternal =
        this.#payload.startLocation ? Location.fromPayload(callFrame.debuggerModel, this.#payload.startLocation) : null;
    this.#endLocationInternal =
        this.#payload.endLocation ? Location.fromPayload(callFrame.debuggerModel, this.#payload.endLocation) : null;
    this.#objectInternal = null;
  }

  callFrame(): CallFrame {
    return this.#callFrameInternal;
  }

  type(): string {
    return this.#typeInternal;
  }

  typeName(): string {
    switch (this.#typeInternal) {
      case Protocol.Debugger.ScopeType.Local:
        return i18nString(UIStrings.local);
      case Protocol.Debugger.ScopeType.Closure:
        return i18nString(UIStrings.closure);
      case Protocol.Debugger.ScopeType.Catch:
        return i18n.i18n.lockedString('Catch');
      case Protocol.Debugger.ScopeType.Block:
        return i18nString(UIStrings.block);
      case Protocol.Debugger.ScopeType.Script:
        return i18nString(UIStrings.script);
      case Protocol.Debugger.ScopeType.With:
        return i18nString(UIStrings.withBlock);
      case Protocol.Debugger.ScopeType.Global:
        return i18nString(UIStrings.global);
      case Protocol.Debugger.ScopeType.Module:
        return i18nString(UIStrings.module);
      case Protocol.Debugger.ScopeType.WasmExpressionStack:
        return i18nString(UIStrings.expression);
    }
    return '';
  }

  name(): string|undefined {
    return this.#nameInternal;
  }

  startLocation(): Location|null {
    return this.#startLocationInternal;
  }

  endLocation(): Location|null {
    return this.#endLocationInternal;
  }

  object(): RemoteObject {
    if (this.#objectInternal) {
      return this.#objectInternal;
    }
    const runtimeModel = this.#callFrameInternal.debuggerModel.runtimeModel();

    const declarativeScope = this.#typeInternal !== Protocol.Debugger.ScopeType.With &&
        this.#typeInternal !== Protocol.Debugger.ScopeType.Global;
    if (declarativeScope) {
      this.#objectInternal = runtimeModel.createScopeRemoteObject(
          this.#payload.object, new ScopeRef(this.#ordinal, this.#callFrameInternal.id));
    } else {
      this.#objectInternal = runtimeModel.createRemoteObject(this.#payload.object);
    }

    return this.#objectInternal;
  }

  description(): string {
    const declarativeScope = this.#typeInternal !== Protocol.Debugger.ScopeType.With &&
        this.#typeInternal !== Protocol.Debugger.ScopeType.Global;
    return declarativeScope ? '' : (this.#payload.object.description || '');
  }

  icon(): undefined {
    return undefined;
  }
}

export class DebuggerPausedDetails {
  debuggerModel: DebuggerModel;
  callFrames: CallFrame[];
  reason: Protocol.Debugger.PausedEventReason;
  auxData: {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any,
  }|undefined;
  breakpointIds: string[];
  asyncStackTrace: Protocol.Runtime.StackTrace|undefined;
  asyncStackTraceId: Protocol.Runtime.StackTraceId|undefined;
  constructor(
      debuggerModel: DebuggerModel, callFrames: Protocol.Debugger.CallFrame[],
      reason: Protocol.Debugger.PausedEventReason, auxData: {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [x: string]: any,
      }|undefined,
      breakpointIds: string[], asyncStackTrace?: Protocol.Runtime.StackTrace,
      asyncStackTraceId?: Protocol.Runtime.StackTraceId) {
    this.debuggerModel = debuggerModel;
    this.callFrames = CallFrame.fromPayloadArray(debuggerModel, callFrames);
    this.reason = reason;
    this.auxData = auxData;
    this.breakpointIds = breakpointIds;
    if (asyncStackTrace) {
      this.asyncStackTrace = this.cleanRedundantFrames(asyncStackTrace);
    }
    this.asyncStackTraceId = asyncStackTraceId;
  }

  exception(): RemoteObject|null {
    if (this.reason !== Protocol.Debugger.PausedEventReason.Exception &&
        this.reason !== Protocol.Debugger.PausedEventReason.PromiseRejection) {
      return null;
    }
    return this.debuggerModel.runtimeModel().createRemoteObject((this.auxData as Protocol.Runtime.RemoteObject));
  }

  private cleanRedundantFrames(asyncStackTrace: Protocol.Runtime.StackTrace): Protocol.Runtime.StackTrace {
    let stack: (Protocol.Runtime.StackTrace|undefined)|Protocol.Runtime.StackTrace = asyncStackTrace;
    let previous: Protocol.Runtime.StackTrace|null = null;
    while (stack) {
      // TODO(crbug.com/1254259): Remove this post-processing step once the V8
      // inspector back-end change propagated to Node LTS.
      if (stack.description === 'async function' && stack.callFrames.length) {
        stack.callFrames.shift();
      }
      if (previous && !stack.callFrames.length) {
        previous.parent = stack.parent;
      } else {
        previous = stack;
      }
      stack = stack.parent;
    }
    return asyncStackTrace;
  }
}

SDKModel.register(DebuggerModel, {capabilities: Capability.JS, autostart: true});

export interface FunctionDetails {
  location: Location|null;
  functionName: string;
}
export interface SetBreakpointResult {
  breakpointId: Protocol.Debugger.BreakpointId|null;
  locations: Location[];
}
