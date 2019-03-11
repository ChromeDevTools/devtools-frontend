// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Protocol.BackgroundServiceDispatcher}
 * @unrestricted
 */
Resources.BackgroundServiceModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._backgroundServiceAgent = target.backgroundServiceAgent();
    target.registerBackgroundServiceDispatcher(this);
  }

  /**
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   */
  enable(serviceName) {
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
   * @override
   * @param {boolean} isRecording
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   */
  recordingStateChanged(isRecording, serviceName) {
    this.dispatchEventToListeners(
        Resources.BackgroundServiceModel.Events.RecordingStateChanged, {isRecording, serviceName});
  }

  /**
   * @override
   * @param {!Protocol.BackgroundService.BackgroundServiceEvent} backgroundServiceEvent
   */
  backgroundServiceEventReceived(backgroundServiceEvent) {
  }
};

SDK.SDKModel.register(Resources.BackgroundServiceModel, SDK.Target.Capability.Browser, false);

/** @enum {symbol} */
Resources.BackgroundServiceModel.Events = {
  RecordingStateChanged: Symbol('RecordingStateChanged'),
};

/**
 * @typedef {!{isRecording: boolean, serviceName: !Protocol.BackgroundService.ServiceName}}
 */
Resources.BackgroundServiceModel.RecordingState;
