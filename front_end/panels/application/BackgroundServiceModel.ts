// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

export class BackgroundServiceModel extends SDK.SDKModel.SDKModel<EventTypes> implements
    ProtocolProxyApi.BackgroundServiceDispatcher {
  private readonly backgroundServiceAgent: ProtocolProxyApi.BackgroundServiceApi;
  private readonly events:
      Map<Protocol.BackgroundService.ServiceName, Protocol.BackgroundService.BackgroundServiceEvent[]>;

  constructor(target: SDK.Target.Target) {
    super(target);
    this.backgroundServiceAgent = target.backgroundServiceAgent();
    target.registerBackgroundServiceDispatcher(this);

    this.events = new Map();
  }

  enable(service: Protocol.BackgroundService.ServiceName): void {
    this.events.set(service, []);
    void this.backgroundServiceAgent.invoke_startObserving({service});
  }

  setRecording(shouldRecord: boolean, service: Protocol.BackgroundService.ServiceName): void {
    void this.backgroundServiceAgent.invoke_setRecording({shouldRecord, service});
  }

  clearEvents(service: Protocol.BackgroundService.ServiceName): void {
    this.events.set(service, []);
    void this.backgroundServiceAgent.invoke_clearEvents({service});
  }

  getEvents(service: Protocol.BackgroundService.ServiceName): Protocol.BackgroundService.BackgroundServiceEvent[] {
    return this.events.get(service) || [];
  }

  recordingStateChanged({isRecording, service}: Protocol.BackgroundService.RecordingStateChangedEvent): void {
    this.dispatchEventToListeners(Events.RecordingStateChanged, {isRecording, serviceName: service});
  }

  backgroundServiceEventReceived({backgroundServiceEvent}:
                                     Protocol.BackgroundService.BackgroundServiceEventReceivedEvent): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-expect-error
    this.events.get(backgroundServiceEvent.service).push(backgroundServiceEvent);
    this.dispatchEventToListeners(Events.BackgroundServiceEventReceived, backgroundServiceEvent);
  }
}

SDK.SDKModel.SDKModel.register(BackgroundServiceModel, {capabilities: SDK.Target.Capability.Browser, autostart: false});

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  RecordingStateChanged = 'RecordingStateChanged',
  BackgroundServiceEventReceived = 'BackgroundServiceEventReceived',
}

export type EventTypes = {
  [Events.RecordingStateChanged]: {isRecording: boolean, serviceName: Protocol.BackgroundService.ServiceName},
  [Events.BackgroundServiceEventReceived]: Protocol.BackgroundService.BackgroundServiceEvent,
};
