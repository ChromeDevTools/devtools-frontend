// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {RecordingSession} from './RecordingSession.js';

/**
 * @enum {symbol}
 */
const RecorderState = {
  Recording: Symbol('Recording'),
  Idle: Symbol('Idle'),
};

export class RecorderModel extends SDK.SDKModel.SDKModel {
  /**
  * @param {!SDK.SDKModel.Target} target
  */
  constructor(target) {
    super(target);
    this._debuggerAgent = target.debuggerAgent();
    this._domDebuggerAgent = target.domdebuggerAgent();
    this._runtimeAgent = target.runtimeAgent();
    this._accessibilityAgent = target.accessibilityAgent();

    /** @type {!UI.ActionRegistration.Action}*/
    this._toggleRecordAction = /** @type {!UI.ActionRegistration.Action}*/ (
        UI.ActionRegistry.ActionRegistry.instance().action('recorder.toggle-recording'));

    this._state = RecorderState.Idle;
    /** @type {?RecordingSession} */
    this._currentRecordingSession = null;
  }

  /**
   * @param {!RecorderState} newState
   */
  async updateState(newState) {
    this._state = newState;
    this._toggleRecordAction.setToggled(this._state === RecorderState.Recording);
  }

  isRecording() {
    return this._state === RecorderState.Recording;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async toggleRecording(uiSourceCode) {
    if (this._state === RecorderState.Idle) {
      await this.startRecording(uiSourceCode);
      await this.updateState(RecorderState.Recording);
    } else if (this._state === RecorderState.Recording) {
      await this.stopRecording();
      await this.updateState(RecorderState.Idle);
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async startRecording(uiSourceCode) {
    this._currentRecordingSession = new RecordingSession(this.target(), uiSourceCode);
    await this._currentRecordingSession.start();
  }

  async stopRecording() {
    if (!this._currentRecordingSession) {
      return;
    }

    this._currentRecordingSession.stop();
    this._currentRecordingSession = null;
  }
}

SDK.SDKModel.SDKModel.register(RecorderModel, SDK.SDKModel.Capability.None, false);
