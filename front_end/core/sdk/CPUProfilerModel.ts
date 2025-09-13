// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as i18n from '../i18n/i18n.js';

import {DebuggerModel, Location} from './DebuggerModel.js';
import type {RuntimeModel} from './RuntimeModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

const UIStrings = {
  /**
   * @description Name of a profile. Placeholder is either a user-supplied name or a number automatically assigned to the profile.
   * @example {2} PH1
   */
  profileD: 'Profile {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/sdk/CPUProfilerModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CPUProfilerModel extends SDKModel<EventTypes> implements ProtocolProxyApi.ProfilerDispatcher {
  #nextAnonymousConsoleProfileNumber: number;
  #anonymousConsoleProfileIdToTitle: Map<string, string>;
  readonly #profilerAgent: ProtocolProxyApi.ProfilerApi;
  #preciseCoverageDeltaUpdateCallback: ((arg0: number, arg2: Protocol.Profiler.ScriptCoverage[]) => Promise<void>)|null;
  readonly #debuggerModel: DebuggerModel;
  readonly registeredConsoleProfileMessages: ProfileFinishedData[] = [];

  constructor(target: Target) {
    super(target);
    this.#nextAnonymousConsoleProfileNumber = 1;
    this.#anonymousConsoleProfileIdToTitle = new Map();
    this.#profilerAgent = target.profilerAgent();
    this.#preciseCoverageDeltaUpdateCallback = null;
    target.registerProfilerDispatcher(this);
    void this.#profilerAgent.invoke_enable();
    this.#debuggerModel = (target.model(DebuggerModel) as DebuggerModel);
  }

  runtimeModel(): RuntimeModel {
    return this.#debuggerModel.runtimeModel();
  }

  debuggerModel(): DebuggerModel {
    return this.#debuggerModel;
  }

  consoleProfileStarted({id, location, title}: Protocol.Profiler.ConsoleProfileStartedEvent): void {
    if (!title) {
      title = i18nString(UIStrings.profileD, {PH1: this.#nextAnonymousConsoleProfileNumber++});
      this.#anonymousConsoleProfileIdToTitle.set(id, title);
    }
    const eventData = this.createEventDataFrom(id, location, title);
    this.dispatchEventToListeners(Events.CONSOLE_PROFILE_STARTED, eventData);
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
    this.dispatchEventToListeners(Events.CONSOLE_PROFILE_FINISHED, eventData);
  }

  private createEventDataFrom(id: string, scriptLocation: Protocol.Debugger.Location, title?: string): EventData {
    const debuggerLocation = Location.fromPayload(this.#debuggerModel, scriptLocation);
    const globalId = this.target().id() + '.' + id;
    return {
      id: globalId,
      scriptLocation: debuggerLocation,
      title: title || '',
      cpuProfilerModel: this,
    };
  }

  startRecording(): Promise<unknown> {
    const intervalUs = 100;
    void this.#profilerAgent.invoke_setSamplingInterval({interval: intervalUs});
    return this.#profilerAgent.invoke_start();
  }

  stopRecording(): Promise<Protocol.Profiler.Profile|null> {
    return this.#profilerAgent.invoke_stop().then(response => response.profile || null);
  }

  startPreciseCoverage(
      jsCoveragePerBlock: boolean,
      preciseCoverageDeltaUpdateCallback: ((arg0: number, arg2: Protocol.Profiler.ScriptCoverage[]) => Promise<void>)|
      null): Promise<unknown> {
    const callCount = false;
    this.#preciseCoverageDeltaUpdateCallback = preciseCoverageDeltaUpdateCallback;
    const allowUpdatesTriggeredByBackend = true;
    return this.#profilerAgent.invoke_startPreciseCoverage(
        {callCount, detailed: jsCoveragePerBlock, allowTriggeredUpdates: allowUpdatesTriggeredByBackend});
  }

  async takePreciseCoverage(): Promise<{
    timestamp: number,
    coverage: Protocol.Profiler.ScriptCoverage[],
  }> {
    const r = await this.#profilerAgent.invoke_takePreciseCoverage();
    const timestamp = (r?.timestamp) || 0;
    const coverage = (r?.result) || [];
    return {timestamp, coverage};
  }

  stopPreciseCoverage(): Promise<unknown> {
    this.#preciseCoverageDeltaUpdateCallback = null;
    return this.#profilerAgent.invoke_stopPreciseCoverage();
  }

  preciseCoverageDeltaUpdate({timestamp, result}: Protocol.Profiler.PreciseCoverageDeltaUpdateEvent): void {
    if (this.#preciseCoverageDeltaUpdateCallback) {
      void this.#preciseCoverageDeltaUpdateCallback(timestamp, result);
    }
  }
}

export const enum Events {
  CONSOLE_PROFILE_STARTED = 'ConsoleProfileStarted',
  CONSOLE_PROFILE_FINISHED = 'ConsoleProfileFinished',
}

export interface EventTypes {
  [Events.CONSOLE_PROFILE_STARTED]: EventData;
  [Events.CONSOLE_PROFILE_FINISHED]: ProfileFinishedData;
}

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
