// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

/**
 * @implements {Protocol.BackgroundServiceDispatcher}
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
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   */
  enable(serviceName) {
    this._events.set(serviceName, []);
    this._backgroundServiceAgent.startObserving(serviceName);
  }

  /**
   * @param {boolean} shouldRecord
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   */
  setRecording(shouldRecord, serviceName) {
    this._backgroundServiceAgent.setRecording(shouldRecord, serviceName);
  }

  /**
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   */
  clearEvents(serviceName) {
    this._events.set(serviceName, []);
    this._backgroundServiceAgent.clearEvents(serviceName);
  }

  /**
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   * @return {!Array<!Protocol.BackgroundService.BackgroundServiceEvent>}
   */
  getEvents(serviceName) {
    return this._events.get(serviceName) || [];
  }

  /**
   * @override
   * @param {boolean} isRecording
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   */
  recordingStateChanged(isRecording, serviceName) {
    this.dispatchEventToListeners(Events.RecordingStateChanged, {isRecording, serviceName});
  }

  /**
   * @override
   * @param {!Protocol.BackgroundService.BackgroundServiceEvent} backgroundServiceEvent
   */
  backgroundServiceEventReceived(backgroundServiceEvent) {
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
