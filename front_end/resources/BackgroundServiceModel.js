// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

/**
 * @implements {ProtocolProxyApi.BackgroundServiceDispatcher}
 * @unrestricted
 */
export class BackgroundServiceModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);
    this._backgroundServiceAgent = target.backgroundServiceAgent();
    target.registerBackgroundServiceDispatcher(this);

    /** @const {!Map<!Protocol.BackgroundService.ServiceName, Array<!Protocol.BackgroundService.BackgroundServiceEvent>>} */
    this._events = new Map();
  }

  /**
   * @param {!Protocol.BackgroundService.ServiceName} service
   */
  enable(service) {
    this._events.set(service, []);
    this._backgroundServiceAgent.invoke_startObserving({service});
  }

  /**
   * @param {boolean} shouldRecord
   * @param {!Protocol.BackgroundService.ServiceName} service
   */
  setRecording(shouldRecord, service) {
    this._backgroundServiceAgent.invoke_setRecording({shouldRecord, service});
  }

  /**
   * @param {!Protocol.BackgroundService.ServiceName} service
   */
  clearEvents(service) {
    this._events.set(service, []);
    this._backgroundServiceAgent.invoke_clearEvents({service});
  }

  /**
   * @param {!Protocol.BackgroundService.ServiceName} service
   * @return {!Array<!Protocol.BackgroundService.BackgroundServiceEvent>}
   */
  getEvents(service) {
    return this._events.get(service) || [];
  }

  /**
   * @override
   * @param {!Protocol.BackgroundService.RecordingStateChangedEvent} event
   */
  recordingStateChanged({isRecording, service}) {
    this.dispatchEventToListeners(Events.RecordingStateChanged, {isRecording, serviceName: service});
  }

  /**
   * @override
   * @param {!Protocol.BackgroundService.BackgroundServiceEventReceivedEvent} event
   */
  backgroundServiceEventReceived({backgroundServiceEvent}) {
    this._events.get(backgroundServiceEvent.service).push(backgroundServiceEvent);
    this.dispatchEventToListeners(Events.BackgroundServiceEventReceived, backgroundServiceEvent);
  }
}

SDK.SDKModel.SDKModel.register(BackgroundServiceModel, SDK.SDKModel.Capability.Browser, false);

/** @enum {symbol} */
export const Events = {
  RecordingStateChanged: Symbol('RecordingStateChanged'),
  BackgroundServiceEventReceived: Symbol('BackgroundServiceEventReceived'),
};
