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
import type {Step} from './Steps.js';
import {ClickStep, NavigationStep, StepFrameContext, SubmitStep, ChangeStep, CloseStep, EmulateNetworkConditions} from './Steps.js';
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseStep(step: any): Step {
    const context = step.context && new StepFrameContext(step.context.target, step.context.path);
    switch (step.action) {
      case 'click':
        return new ClickStep(context, step.selector);
      case 'navigate':
        return new NavigationStep(step.url);
      case 'submit':
        return new SubmitStep(context, step.selector);
      case 'change':
        return new ChangeStep(context, step.selector, step.value);
      case 'close':
        return new CloseStep(step.target);
      case 'emulateNetworkConditions':
        return new EmulateNetworkConditions(step.conditions);
      default:
        throw new Error('Unknown step: ' + step.action);
    }
  }

  parseScript(script: string): Step[] {
    const input = JSON.parse(script);
    const output = [];

    for (const stepInput of input) {
      const step = this.parseStep(stepInput);
      output.push(step);
    }

    return output;
  }

  async replayRecording(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    this.updateState(RecorderState.Replaying);
    try {
      const script = this.parseScript(uiSourceCode.content());
      const player = new RecordingPlayer(script);
      await player.play();
    } finally {
      this.updateState(RecorderState.Idle);
    }
  }

  async toggleRecording(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (this._state === RecorderState.Idle) {
      await this.startRecording(uiSourceCode);
      await this.updateState(RecorderState.Recording);
    } else if (this._state === RecorderState.Recording) {
      await this.stopRecording();
      await this.updateState(RecorderState.Idle);
    }
  }

  async startRecording(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    this._currentRecordingSession = new RecordingSession(this.target(), uiSourceCode, this._indentation);
    await this._currentRecordingSession.start();
  }

  async stopRecording(): Promise<void> {
    if (!this._currentRecordingSession) {
      return;
    }

    this._currentRecordingSession.stop();
    this._currentRecordingSession = null;
  }

  async exportRecording(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    const script = this.parseScript(uiSourceCode.content());
    const writer = new RecordingScriptWriter('  ');
    while (script.length) {
      const step = script.shift();
      step && writer.appendStep(step);
    }
    const filename = uiSourceCode.name();
    const stream = new Bindings.FileUtils.FileOutputStream();
    if (!await stream.open(filename + '.js')) {
      return;
    }
    stream.write(writer.getScript());
    stream.close();
  }
}

SDK.SDKModel.SDKModel.register(RecorderModel, {capabilities: SDK.SDKModel.Capability.None, autostart: false});
