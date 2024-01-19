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

import * as i18n from '../i18n/i18n.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {DebuggerModel, Location} from './DebuggerModel.js';
import {type RuntimeModel} from './RuntimeModel.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

const UIStrings = {
  /**
   *@description Name of a profile. Placeholder is either a user-supplied name or a number automatically assigned to the profile.
   *@example {2} PH1
   */
  profileD: 'Profile {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/CPUProfilerModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CPUProfilerModel extends SDKModel<EventTypes> implements ProtocolProxyApi.ProfilerDispatcher {
  #isRecording: boolean;
  #nextAnonymousConsoleProfileNumber: number;
  #anonymousConsoleProfileIdToTitle: Map<string, string>;
  readonly #profilerAgent: ProtocolProxyApi.ProfilerApi;
  #preciseCoverageDeltaUpdateCallback:
      ((arg0: number, arg1: string, arg2: Array<Protocol.Profiler.ScriptCoverage>) => Promise<void>)|null;
  readonly #debuggerModelInternal: DebuggerModel;
  readonly registeredConsoleProfileMessages: ProfileFinishedData[] = [];

  constructor(target: Target) {
    super(target);
    this.#isRecording = false;
    this.#nextAnonymousConsoleProfileNumber = 1;
    this.#anonymousConsoleProfileIdToTitle = new Map();
    this.#profilerAgent = target.profilerAgent();
    this.#preciseCoverageDeltaUpdateCallback = null;
    target.registerProfilerDispatcher(this);
    void this.#profilerAgent.invoke_enable();
    this.#debuggerModelInternal = (target.model(DebuggerModel) as DebuggerModel);
  }

  runtimeModel(): RuntimeModel {
    return this.#debuggerModelInternal.runtimeModel();
  }

  debuggerModel(): DebuggerModel {
    return this.#debuggerModelInternal;
  }

  consoleProfileStarted({id, location, title}: Protocol.Profiler.ConsoleProfileStartedEvent): void {
    if (!title) {
      title = i18nString(UIStrings.profileD, {PH1: this.#nextAnonymousConsoleProfileNumber++});
      this.#anonymousConsoleProfileIdToTitle.set(id, title);
    }
    const eventData = this.createEventDataFrom(id, location, title);
    this.dispatchEventToListeners(Events.ConsoleProfileStarted, eventData);
  }

  consoleProfileFinished({id, location, profile, title}: Protocol.Profiler.ConsoleProfileFinishedEvent): void {
    if (!title) {
      title = this.#anonymousConsoleProfileIdToTitle.get(id);
      this.#anonymousConsoleProfileIdToTitle.delete(id);
    }
    const eventData: ProfileFinishedData = {
      ...this.createEventDataFrom(id, location, title),
      cpuProfile: profile,
    };
    this.registeredConsoleProfileMessages.push(eventData);
    this.dispatchEventToListeners(Events.ConsoleProfileFinished, eventData);
  }

  private createEventDataFrom(id: string, scriptLocation: Protocol.Debugger.Location, title?: string): EventData {
    const debuggerLocation = Location.fromPayload(this.#debuggerModelInternal, scriptLocation);
    const globalId = this.target().id() + '.' + id;
    return {
      id: globalId,
      scriptLocation: debuggerLocation,
      title: title || '',
      cpuProfilerModel: this,
    };
  }

  isRecordingProfile(): boolean {
    return this.#isRecording;
  }

  startRecording(): Promise<unknown> {
    this.#isRecording = true;
    const intervalUs = 100;
    void this.#profilerAgent.invoke_setSamplingInterval({interval: intervalUs});
    return this.#profilerAgent.invoke_start();
  }

  stopRecording(): Promise<Protocol.Profiler.Profile|null> {
    this.#isRecording = false;
    return this.#profilerAgent.invoke_stop().then(response => response.profile || null);
  }

  startPreciseCoverage(
      jsCoveragePerBlock: boolean,
      preciseCoverageDeltaUpdateCallback:
          ((arg0: number, arg1: string, arg2: Array<Protocol.Profiler.ScriptCoverage>) => Promise<void>)|
      null): Promise<unknown> {
    const callCount = false;
    this.#preciseCoverageDeltaUpdateCallback = preciseCoverageDeltaUpdateCallback;
    const allowUpdatesTriggeredByBackend = true;
    return this.#profilerAgent.invoke_startPreciseCoverage(
        {callCount, detailed: jsCoveragePerBlock, allowTriggeredUpdates: allowUpdatesTriggeredByBackend});
  }

  async takePreciseCoverage(): Promise<{
    timestamp: number,
    coverage: Array<Protocol.Profiler.ScriptCoverage>,
  }> {
    const r = await this.#profilerAgent.invoke_takePreciseCoverage();
    const timestamp = (r && r.timestamp) || 0;
    const coverage = (r && r.result) || [];
    return {timestamp, coverage};
  }

  stopPreciseCoverage(): Promise<unknown> {
    this.#preciseCoverageDeltaUpdateCallback = null;
    return this.#profilerAgent.invoke_stopPreciseCoverage();
  }

  preciseCoverageDeltaUpdate({timestamp, occasion, result}: Protocol.Profiler.PreciseCoverageDeltaUpdateEvent): void {
    if (this.#preciseCoverageDeltaUpdateCallback) {
      void this.#preciseCoverageDeltaUpdateCallback(timestamp, occasion, result);
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ConsoleProfileStarted = 'ConsoleProfileStarted',
  ConsoleProfileFinished = 'ConsoleProfileFinished',
}

export type EventTypes = {
  [Events.ConsoleProfileStarted]: EventData,
  [Events.ConsoleProfileFinished]: ProfileFinishedData,
};

SDKModel.register(CPUProfilerModel, {capabilities: Capability.JS, autostart: true});

export interface EventData {
  id: string;
  scriptLocation: Location;
  title: string;
  cpuProfilerModel: CPUProfilerModel;
}

export interface ProfileFinishedData extends EventData {
  cpuProfile: Protocol.Profiler.Profile;
}
