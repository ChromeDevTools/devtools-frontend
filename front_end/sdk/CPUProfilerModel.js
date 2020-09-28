/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
import * as Root from '../root/root.js';

import {DebuggerModel, Location} from './DebuggerModel.js';
import {RuntimeModel} from './RuntimeModel.js';              // eslint-disable-line no-unused-vars
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {ProtocolProxyApi.ProfilerDispatcher}
 */
export class CPUProfilerModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._isRecording = false;
    this._nextAnonymousConsoleProfileNumber = 1;
    this._anonymousConsoleProfileIdToTitle = new Map();
    this._profilerAgent = target.profilerAgent();
    /** @type {?function(number, string, !Array<!Protocol.Profiler.ScriptCoverage>):void} */
    this._preciseCoverageDeltaUpdateCallback = null;
    target.registerProfilerDispatcher(this);
    this._profilerAgent.invoke_enable();
    this._debuggerModel = /** @type {!DebuggerModel} */ (target.model(DebuggerModel));
  }

  /**
   * @return {!RuntimeModel}
   */
  runtimeModel() {
    return this._debuggerModel.runtimeModel();
  }

  /**
   * @return {!DebuggerModel}
   */
  debuggerModel() {
    return this._debuggerModel;
  }

  /**
   * @override
   * @param {!Protocol.Profiler.ConsoleProfileStartedEvent} event
   */
  consoleProfileStarted({id, location, title}) {
    if (!title) {
      title = Common.UIString.UIString('Profile %d', this._nextAnonymousConsoleProfileNumber++);
      this._anonymousConsoleProfileIdToTitle.set(id, title);
    }
    this._dispatchProfileEvent(Events.ConsoleProfileStarted, id, location, title);
  }

  /**
   * @override
   * @param {!Protocol.Profiler.ConsoleProfileFinishedEvent} event
   */
  consoleProfileFinished({id, location, profile, title}) {
    if (!title) {
      title = this._anonymousConsoleProfileIdToTitle.get(id);
      this._anonymousConsoleProfileIdToTitle.delete(id);
    }
    // Make sure ProfilesPanel is initialized and CPUProfileType is created.
    Root.Runtime.Runtime.instance().loadModulePromise('profiler').then(() => {
      this._dispatchProfileEvent(Events.ConsoleProfileFinished, id, location, title, profile);
    });
  }

  /**
   * @param {symbol} eventName
   * @param {string} id
   * @param {!Protocol.Debugger.Location} scriptLocation
   * @param {string=} title
   * @param {!Protocol.Profiler.Profile=} cpuProfile
   */
  _dispatchProfileEvent(eventName, id, scriptLocation, title, cpuProfile) {
    const debuggerLocation = Location.fromPayload(this._debuggerModel, scriptLocation);
    const globalId = this.target().id() + '.' + id;
    const data = /** @type {!EventData} */ (
        {id: globalId, scriptLocation: debuggerLocation, cpuProfile: cpuProfile, title: title, cpuProfilerModel: this});
    this.dispatchEventToListeners(eventName, data);
  }

  /**
   * @return {boolean}
   */
  isRecordingProfile() {
    return this._isRecording;
  }

  /**
   * @return {!Promise<?>}
   */
  startRecording() {
    this._isRecording = true;
    const intervalUs = 100;
    this._profilerAgent.invoke_setSamplingInterval({interval: intervalUs});
    return this._profilerAgent.invoke_start();
  }

  /**
   * @return {!Promise<?Protocol.Profiler.Profile>}
   */
  stopRecording() {
    this._isRecording = false;
    return this._profilerAgent.invoke_stop().then(response => response.profile || null);
  }

  /**
   * @param {boolean} jsCoveragePerBlock - Collect per Block coverage if `true`, per function coverage otherwise.
   * @param {?function(number, string, !Array<!Protocol.Profiler.ScriptCoverage>):void} preciseCoverageDeltaUpdateCallback - Callback for coverage updates initiated from the back-end
   * @return {!Promise<?>}
   */
  startPreciseCoverage(jsCoveragePerBlock, preciseCoverageDeltaUpdateCallback) {
    const callCount = false;
    this._preciseCoverageDeltaUpdateCallback = preciseCoverageDeltaUpdateCallback;
    const allowUpdatesTriggeredByBackend = true;
    return this._profilerAgent.invoke_startPreciseCoverage(
        {callCount, detailed: jsCoveragePerBlock, allowTriggeredUpdates: allowUpdatesTriggeredByBackend});
  }

  /**
   * @return {!Promise<{timestamp:number, coverage:!Array<!Protocol.Profiler.ScriptCoverage>}>}
   */
  async takePreciseCoverage() {
    const r = await this._profilerAgent.invoke_takePreciseCoverage();
    const timestamp = (r && r.timestamp) || 0;
    const coverage = (r && r.result) || [];
    return {timestamp, coverage};
  }

  /**
   * @return {!Promise<?>}
   */
  stopPreciseCoverage() {
    this._preciseCoverageDeltaUpdateCallback = null;
    return this._profilerAgent.invoke_stopPreciseCoverage();
  }

  /**
   * @override
   * @param {!Protocol.Profiler.PreciseCoverageDeltaUpdateEvent} event
   */
  preciseCoverageDeltaUpdate({timestamp, occassion, result}) {
    if (this._preciseCoverageDeltaUpdateCallback) {
      this._preciseCoverageDeltaUpdateCallback(timestamp, occassion, result);
    }
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }
}

/** @enum {symbol} */
export const Events = {
  ConsoleProfileStarted: Symbol('ConsoleProfileStarted'),
  ConsoleProfileFinished: Symbol('ConsoleProfileFinished')
};

SDKModel.register(CPUProfilerModel, Capability.JS, true);

/** @typedef {!{id: string, scriptLocation: !Location, title: string, cpuProfile: (!Protocol.Profiler.Profile|undefined), cpuProfilerModel: !CPUProfilerModel}} */
// @ts-ignore typedef
export let EventData;
