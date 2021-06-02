// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Workspace from '../workspace/workspace.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import {RecordingPlayer} from './RecordingPlayer.js';
import {RecordingSession} from './RecordingSession.js';
import type {UserFlow} from './Steps.js';
import {findRecordingsProject} from './RecordingFileSystem.js';
import {RecordingScriptWriter} from './RecordingScriptWriter.js';

const enum RecorderState {
  Recording = 'Recording',
  Replaying = 'Replaying',
  Idle = 'Idle',
}

export class RecorderModel extends SDK.SDKModel.SDKModel {
  _debuggerAgent: ProtocolProxyApi.DebuggerApi;
  _domDebuggerAgent: ProtocolProxyApi.DOMDebuggerApi;
  _runtimeAgent: ProtocolProxyApi.RuntimeApi;
  _accessibilityAgent: ProtocolProxyApi.AccessibilityApi;
  _toggleRecordAction: UI.ActionRegistration.Action;
  _replayAction: UI.ActionRegistration.Action;
  _state: RecorderState;
  _currentRecordingSession: RecordingSession|null;
  _indentation: string;

  constructor(target: SDK.SDKModel.Target) {
    super(target);
    this._debuggerAgent = target.debuggerAgent();
    this._domDebuggerAgent = target.domdebuggerAgent();
    this._runtimeAgent = target.runtimeAgent();
    this._accessibilityAgent = target.accessibilityAgent();
    this._toggleRecordAction =
        UI.ActionRegistry.ActionRegistry.instance().action('recorder.toggle-recording') as UI.ActionRegistration.Action;
    this._replayAction =
        UI.ActionRegistry.ActionRegistry.instance().action('recorder.replay-recording') as UI.ActionRegistration.Action;

    this._state = RecorderState.Idle;
    this._currentRecordingSession = null;
    this._indentation = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
  }

  async updateState(newState: RecorderState): Promise<void> {
    this._state = newState;
    this._toggleRecordAction.setToggled(this._state === RecorderState.Recording);
    this._toggleRecordAction.setEnabled(this._state !== RecorderState.Replaying);
    this._replayAction.setEnabled(this._state !== RecorderState.Replaying);
  }

  isRecording(): boolean {
    return this._state === RecorderState.Recording;
  }

  parseUserFlow(source: string): UserFlow {
    return JSON.parse(source) as UserFlow;
  }

  async replayRecording(userFlow: UserFlow): Promise<void> {
    this.updateState(RecorderState.Replaying);
    try {
      const player = new RecordingPlayer(userFlow);
      await player.play();
    } finally {
      this.updateState(RecorderState.Idle);
    }
  }

  async toggleRecording(): Promise<RecordingSession|null> {
    if (this._state === RecorderState.Idle) {
      await this.startRecording();
      await this.updateState(RecorderState.Recording);
    } else if (this._state === RecorderState.Recording) {
      await this.stopRecording();
      await this.updateState(RecorderState.Idle);
    }

    return this._currentRecordingSession;
  }

  async startRecording(): Promise<RecordingSession> {
    this._currentRecordingSession = new RecordingSession(this.target(), this._indentation);
    await this._currentRecordingSession.start();
    return this._currentRecordingSession;
  }

  async stopRecording(): Promise<void> {
    if (!this._currentRecordingSession) {
      return;
    }

    this._currentRecordingSession.stop();
    this._currentRecordingSession = null;
  }

  async exportRecording(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    const userFlow = this.parseUserFlow(uiSourceCode.content());
    const writer = new RecordingScriptWriter('  ');
    const filename = uiSourceCode.name();
    const stream = new Bindings.FileUtils.FileOutputStream();
    if (!await stream.open(filename + '.js')) {
      return;
    }
    stream.write(writer.getScript(userFlow));
    stream.close();
  }

  async getAvailableRecordings(): Promise<UserFlow[]> {
    const project = findRecordingsProject();
    const uiSourceCodes = project.uiSourceCodes();

    const userFlows = [];
    for (const uiSourceCode of uiSourceCodes) {
      try {
        userFlows.push(this.parseUserFlow(uiSourceCode.content()));
      } catch {
      }
    }
    return userFlows;
  }
}

SDK.SDKModel.SDKModel.register(RecorderModel, {capabilities: SDK.SDKModel.Capability.None, autostart: false});
