// Copyright (c) 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Bindings from '../bindings/bindings.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as SDK from '../sdk/sdk.js';
import * as Timeline from '../timeline/timeline.js';
import * as UI from '../ui/ui.js';

import {InputModel} from './InputModel.js';

export const UIStrings = {
  /**
  *@description Text to clear everything
  */
  clearAll: 'Clear all',
  /**
  *@description Tooltip text that appears when hovering over the largeicon load button
  */
  loadProfile: 'Load profile…',
  /**
  *@description Tooltip text that appears when hovering over the largeicon download button
  */
  saveProfile: 'Save profile…',
};
const str_ = i18n.i18n.registerUIStrings('input/InputTimeline.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let inputTimelineInstance: InputTimeline;
export class InputTimeline extends UI.Widget.VBox implements Timeline.TimelineLoader.Client {
  _tracingClient: TracingClient|null;
  _tracingModel: SDK.TracingModel.TracingModel|null;
  _inputModel: InputModel|null;
  _state: State;
  _toggleRecordAction: UI.ActionRegistration.Action;
  _startReplayAction: UI.ActionRegistration.Action;
  _togglePauseAction: UI.ActionRegistration.Action;
  _panelToolbar: UI.Toolbar.Toolbar;
  _clearButton: UI.Toolbar.ToolbarButton;
  _loadButton: UI.Toolbar.ToolbarButton;
  _saveButton: UI.Toolbar.ToolbarButton;
  _fileSelectorElement?: HTMLInputElement;
  _loader?: Timeline.TimelineLoader.TimelineLoader;

  constructor() {
    super(true);
    this.registerRequiredCSS('input/inputTimeline.css', {enableLegacyPatching: true});
    this.element.classList.add('inputs-timeline');

    this._tracingClient = null;
    this._tracingModel = null;
    this._inputModel = null;

    this._state = State.Idle;
    this._toggleRecordAction =
        UI.ActionRegistry.ActionRegistry.instance().action('input.toggle-recording') as UI.ActionRegistration.Action;
    this._startReplayAction =
        UI.ActionRegistry.ActionRegistry.instance().action('input.start-replaying') as UI.ActionRegistration.Action;
    this._togglePauseAction =
        UI.ActionRegistry.ActionRegistry.instance().action('input.toggle-pause') as UI.ActionRegistration.Action;

    const toolbarContainer = this.contentElement.createChild('div', 'input-timeline-toolbar-container');
    this._panelToolbar = new UI.Toolbar.Toolbar('input-timeline-toolbar', toolbarContainer);

    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction));
    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._startReplayAction));
    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._togglePauseAction));

    this._clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'largeicon-clear');
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._reset.bind(this));
    this._panelToolbar.appendToolbarItem(this._clearButton);

    this._panelToolbar.appendSeparator();

    // Load / Save
    this._loadButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.loadProfile), 'largeicon-load');
    this._loadButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this._selectFileToLoad());
    this._saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.saveProfile), 'largeicon-download');
    this._saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      this._saveToFile();
    });
    this._panelToolbar.appendSeparator();
    this._panelToolbar.appendToolbarItem(this._loadButton);
    this._panelToolbar.appendToolbarItem(this._saveButton);
    this._panelToolbar.appendSeparator();
    this._createFileSelector();

    this._updateControls();
  }

  static instance(opts: {forceNew: boolean} = {forceNew: false}): InputTimeline {
    const {forceNew} = opts;
    if (!inputTimelineInstance || forceNew) {
      inputTimelineInstance = new InputTimeline();
    }

    return inputTimelineInstance;
  }

  _reset(): void {
    this._tracingClient = null;
    this._tracingModel = null;
    this._inputModel = null;
    this._setState(State.Idle);
  }

  _createFileSelector(): void {
    if (this._fileSelectorElement) {
      this._fileSelectorElement.remove();
    }
    this._fileSelectorElement = UI.UIUtils.createFileSelectorElement(this._loadFromFile.bind(this));
    this.element.appendChild(this._fileSelectorElement);
  }

  wasShown(): void {
  }

  willHide(): void {
  }

  _setState(state: State): void {
    this._state = state;
    this._updateControls();
  }

  _isAvailableState(): boolean {
    return this._state === State.Idle || this._state === State.ReplayPaused;
  }

  _updateControls(): void {
    this._toggleRecordAction.setToggled(this._state === State.Recording);
    this._toggleRecordAction.setEnabled(this._isAvailableState() || this._state === State.Recording);
    this._startReplayAction.setEnabled(this._isAvailableState() && Boolean(this._tracingModel));
    this._togglePauseAction.setEnabled(this._state === State.Replaying || this._state === State.ReplayPaused);
    this._togglePauseAction.setToggled(this._state === State.ReplayPaused);
    this._clearButton.setEnabled(this._isAvailableState());
    this._loadButton.setEnabled(this._isAvailableState());
    this._saveButton.setEnabled(this._isAvailableState() && Boolean(this._tracingModel));
  }

  _toggleRecording(): void {
    switch (this._state) {
      case State.Recording: {
        this._stopRecording();
        break;
      }
      case State.Idle: {
        this._startRecording();
        break;
      }
    }
  }

  _startReplay(): void {
    this._replayEvents();
  }

  _toggleReplayPause(): void {
    switch (this._state) {
      case State.Replaying: {
        this._pauseReplay();
        break;
      }
      case State.ReplayPaused: {
        this._resumeReplay();
        break;
      }
    }
  }

  /**
   * Saves all current events in a file (JSON format).
   */
  async _saveToFile(): Promise<void> {
    console.assert(this._state === State.Idle);
    if (!this._tracingModel) {
      return;
    }

    const fileName = `InputProfile-${Platform.DateUtilities.toISO8601Compact(new Date())}.json`;
    const stream = new Bindings.FileUtils.FileOutputStream();

    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }

    const backingStorage = this._tracingModel.backingStorage() as Bindings.TempFile.TempFileBackingStorage;
    await backingStorage.writeToStream(stream);
    stream.close();
  }

  _selectFileToLoad(): void {
    if (this._fileSelectorElement) {
      this._fileSelectorElement.click();
    }
  }

  _loadFromFile(file: File): void {
    console.assert(this._isAvailableState());

    this._setState(State.Loading);
    this._loader = Timeline.TimelineLoader.TimelineLoader.loadFromFile(file, this);

    this._createFileSelector();
  }

  async _startRecording(): Promise<void> {
    this._setState(State.StartPending);
    this._tracingClient =
        new TracingClient(SDK.SDKModel.TargetManager.instance().mainTarget() as SDK.SDKModel.Target, this);

    const response = await this._tracingClient.startRecording();
    // @ts-ignore crbug.com/1011811 Fix tracing manager type once Closure is gone
    if (response[ProtocolClient.InspectorBackend.ProtocolError]) {
      this._recordingFailed();
    } else {
      this._setState(State.Recording);
    }
  }

  async _stopRecording(): Promise<void> {
    if (!this._tracingClient) {
      return;
    }
    this._setState(State.StopPending);
    await this._tracingClient.stopRecording();
    this._tracingClient = null;
  }

  async _replayEvents(): Promise<void> {
    if (!this._inputModel) {
      return;
    }
    this._setState(State.Replaying);
    await this._inputModel.startReplay(this.replayStopped.bind(this));
  }

  _pauseReplay(): void {
    if (!this._inputModel) {
      return;
    }
    this._inputModel.pause();
    this._setState(State.ReplayPaused);
  }

  _resumeReplay(): void {
    if (!this._inputModel) {
      return;
    }
    this._inputModel.resume();
    this._setState(State.Replaying);
  }

  loadingStarted(): void {
  }

  loadingProgress(_progress?: number): void {
  }

  processingStarted(): void {
  }

  loadingComplete(tracingModel: SDK.TracingModel.TracingModel|null): void {
    if (!tracingModel) {
      this._reset();
      return;
    }
    this._inputModel = new InputModel(SDK.SDKModel.TargetManager.instance().mainTarget() as SDK.SDKModel.Target);
    this._tracingModel = tracingModel;
    this._inputModel.setEvents(tracingModel);

    this._setState(State.Idle);
  }

  _recordingFailed(): void {
    this._tracingClient = null;
    this._setState(State.Idle);
  }

  replayStopped(): void {
    this._setState(State.Idle);
  }
}

export const enum State {
  Idle = 'Idle',
  StartPending = 'StartPending',
  Recording = 'Recording',
  StopPending = 'StopPending',
  Replaying = 'Replaying',
  ReplayPaused = 'ReplayPaused',
  Loading = 'Loading'
}

let actionDelegateInstance: ActionDelegate;
export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {forceNew: boolean|null;} = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const inputViewId = 'Inputs';
    UI.ViewManager.ViewManager.instance()
        .showView(inputViewId)
        .then(() => (UI.ViewManager.ViewManager.instance().view(inputViewId) as UI.View.View).widget())
        .then(widget => this._innerHandleAction(widget as InputTimeline, actionId));

    return true;
  }

  _innerHandleAction(inputTimeline: InputTimeline, actionId: string): void {
    switch (actionId) {
      case 'input.toggle-recording':
        inputTimeline._toggleRecording();
        break;
      case 'input.start-replaying':
        inputTimeline._startReplay();
        break;
      case 'input.toggle-pause':
        inputTimeline._toggleReplayPause();
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
}

export class TracingClient implements SDK.TracingManager.TracingManagerClient {
  _target: SDK.SDKModel.Target;
  _tracingManager: SDK.TracingManager.TracingManager|null;
  _client: InputTimeline;
  _tracingModel: SDK.TracingModel.TracingModel;
  _tracingCompleteCallback: (() => void)|null;
  constructor(target: SDK.SDKModel.Target, client: InputTimeline) {
    this._target = target;
    this._tracingManager = target.model(SDK.TracingManager.TracingManager);
    this._client = client;

    const backingStorage = new Bindings.TempFile.TempFileBackingStorage();
    this._tracingModel = new SDK.TracingModel.TracingModel(backingStorage);

    this._tracingCompleteCallback = null;
  }

  async startRecording(): Promise<Object> {
    if (!this._tracingManager) {
      return {};
    }

    const categoriesArray = ['devtools.timeline', 'disabled-by-default-devtools.timeline.inputs'];
    const categories = categoriesArray.join(',');

    const response = await this._tracingManager.start(this, categories, '');
    // @ts-ignore crbug.com/1011811 Fix tracing manager type once Closure is gone
    if (response['Protocol.Error']) {
      await this._waitForTracingToStop(false);
    }
    return response;
  }

  async stopRecording(): Promise<void> {
    if (this._tracingManager) {
      this._tracingManager.stop();
    }

    await this._waitForTracingToStop(true);
    await SDK.SDKModel.TargetManager.instance().resumeAllTargets();
    this._tracingModel.tracingComplete();
    this._client.loadingComplete(this._tracingModel);
  }
  traceEventsCollected(events: SDK.TracingManager.EventPayload[]): void {
    this._tracingModel.addEvents(events);
  }

  tracingComplete(): void {
    if (this._tracingCompleteCallback) {
      this._tracingCompleteCallback();
    }
    this._tracingCompleteCallback = null;
  }

  tracingBufferUsage(_usage: number): void {
  }

  eventsRetrievalProgress(_progress: number): void {
  }

  _waitForTracingToStop(awaitTracingCompleteCallback: boolean): Promise<void> {
    return new Promise(resolve => {
      if (this._tracingManager && awaitTracingCompleteCallback) {
        this._tracingCompleteCallback = resolve;
      } else {
        resolve();
      }
    });
  }
}
