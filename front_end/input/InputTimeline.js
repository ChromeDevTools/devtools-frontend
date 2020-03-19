// Copyright (c) 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as SDK from '../sdk/sdk.js';
import * as Timeline from '../timeline/timeline.js';
import * as UI from '../ui/ui.js';

import {InputModel} from './InputModel.js';

/**
 * @implements {Timeline.TimelineLoader.Client}
 * @unrestricted
 */
export class InputTimeline extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('input/inputTimeline.css');
    this.element.classList.add('inputs-timeline');

    this._tracingClient = null;
    this._tracingModel = null;
    this._inputModel = null;

    this._state = State.Idle;


    this._toggleRecordAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('input.toggle-recording'));
    this._startReplayAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('input.start-replaying'));
    this._togglePauseAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('input.toggle-pause'));

    const toolbarContainer = this.contentElement.createChild('div', 'input-timeline-toolbar-container');
    this._panelToolbar = new UI.Toolbar.Toolbar('input-timeline-toolbar', toolbarContainer);

    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction));
    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._startReplayAction));
    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._togglePauseAction));

    this._clearButton = new UI.Toolbar.ToolbarButton(ls`Clear all`, 'largeicon-clear');
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._reset.bind(this));
    this._panelToolbar.appendToolbarItem(this._clearButton);

    this._panelToolbar.appendSeparator();

    // Load / Save
    this._loadButton = new UI.Toolbar.ToolbarButton(Common.UIString('Load profile…'), 'largeicon-load');
    this._loadButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this._selectFileToLoad());
    this._saveButton = new UI.Toolbar.ToolbarButton(Common.UIString('Save profile…'), 'largeicon-download');
    this._saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._saveToFile();
    });
    this._panelToolbar.appendSeparator();
    this._panelToolbar.appendToolbarItem(this._loadButton);
    this._panelToolbar.appendToolbarItem(this._saveButton);
    this._panelToolbar.appendSeparator();
    this._createFileSelector();

    this._updateControls();
  }

  _reset() {
    this._tracingClient = null;
    this._tracingModel = null;
    this._inputModel = null;
    this._setState(State.Idle);
  }

  _createFileSelector() {
    if (this._fileSelectorElement) {
      this._fileSelectorElement.remove();
    }
    this._fileSelectorElement = UI.UIUtils.createFileSelectorElement(this._loadFromFile.bind(this));
    this.element.appendChild(this._fileSelectorElement);
  }

  /**
   * @override
   */
  wasShown() {
  }

  /**
   * @override
   */
  willHide() {
  }

  /**
   * @param {!State} state
   */
  _setState(state) {
    this._state = state;
    this._updateControls();
  }

  /**
   * @return {boolean}
   */
  _isAvailableState() {
    return this._state === State.Idle || this._state === State.ReplayPaused;
  }

  _updateControls() {
    this._toggleRecordAction.setToggled(this._state === State.Recording);
    this._toggleRecordAction.setEnabled(this._isAvailableState() || this._state === State.Recording);
    this._startReplayAction.setEnabled(this._isAvailableState() && !!this._tracingModel);
    this._togglePauseAction.setEnabled(this._state === State.Replaying || this._state === State.ReplayPaused);
    this._togglePauseAction.setToggled(this._state === State.ReplayPaused);
    this._clearButton.setEnabled(this._isAvailableState());
    this._loadButton.setEnabled(this._isAvailableState());
    this._saveButton.setEnabled(this._isAvailableState() && !!this._tracingModel);
  }

  _toggleRecording() {
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

  _startReplay() {
    this._replayEvents();
  }

  _toggleReplayPause() {
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
  async _saveToFile() {
    console.assert(this._state === State.Idle && this._tracingModel);

    const fileName = `InputProfile-${new Date().toISO8601Compact()}.json`;
    const stream = new Bindings.FileUtils.FileOutputStream();

    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }

    const backingStorage =
        /** @type {!Bindings.TempFile.TempFileBackingStorage} */ (this._tracingModel.backingStorage());
    await backingStorage.writeToStream(stream);
    stream.close();
  }


  _selectFileToLoad() {
    this._fileSelectorElement.click();
  }

  /**
   * @param {!File} file
   */
  _loadFromFile(file) {
    console.assert(this._isAvailableState());

    this._setState(State.Loading);
    this._loader = Timeline.TimelineLoader.TimelineLoader.loadFromFile(file, this);

    this._createFileSelector();
  }

  async _startRecording() {
    this._setState(State.StartPending);

    this._tracingClient = new InputTimeline.TracingClient(
        /** @type {!SDK.SDKModel.Target} */ (SDK.SDKModel.TargetManager.instance().mainTarget()), this);

    const response = await this._tracingClient.startRecording();
    if (response[ProtocolClient.InspectorBackend.ProtocolError]) {
      this._recordingFailed(response[ProtocolClient.InspectorBackend.ProtocolError]);
    } else {
      this._setState(State.Recording);
    }
  }

  async _stopRecording() {
    this._setState(State.StopPending);
    await this._tracingClient.stopRecording();
    this._tracingClient = null;
  }

  async _replayEvents() {
    this._setState(State.Replaying);
    await this._inputModel.startReplay(this.replayStopped.bind(this));
  }

  _pauseReplay() {
    this._inputModel.pause();
    this._setState(State.ReplayPaused);
  }

  _resumeReplay() {
    this._inputModel.resume();
    this._setState(State.Replaying);
  }

  /**
   * @override
   */
  loadingStarted() {
  }

  /**
   * @override
   * @param {number=} progress
   */
  loadingProgress(progress) {
  }


  /**
   * @override
   */
  processingStarted() {
  }

  /**
   * @override
   * @param {?SDK.TracingModel.TracingModel} tracingModel
   */
  loadingComplete(tracingModel) {
    if (!tracingModel) {
      this._reset();
      return;
    }
    this._inputModel =
        new InputModel(/** @type {!SDK.SDKModel.Target} */ (SDK.SDKModel.TargetManager.instance().mainTarget()));
    this._tracingModel = tracingModel;
    this._inputModel.setEvents(tracingModel);

    this._setState(State.Idle);
  }

  _recordingFailed(error) {
    this._tracingClient = null;
    this._setState(State.Idle);
  }

  replayStopped() {
    this._setState(State.Idle);
  }
}

/**
 * @enum {symbol}
 */
export const State = {
  Idle: Symbol('Idle'),
  StartPending: Symbol('StartPending'),
  Recording: Symbol('Recording'),
  StopPending: Symbol('StopPending'),
  Replaying: Symbol('Replaying'),
  ReplayPaused: Symbol('ReplayPaused'),
  Loading: Symbol('Loading')
};


/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const inputViewId = 'Inputs';
    UI.ViewManager.ViewManager.instance()
        .showView(inputViewId)
        .then(() => UI.ViewManager.ViewManager.instance().view(inputViewId).widget())
        .then(widget => this._innerHandleAction(/** @type !InputTimeline} */ (widget), actionId));

    return true;
  }

  /**
   * @param {!InputTimeline} inputTimeline
   * @param {string} actionId
   */
  _innerHandleAction(inputTimeline, actionId) {
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

/**
 * @implements {SDK.TracingManager.TracingManagerClient}
 */
export class TracingClient {
  /**
   * @param {!SDK.SDKModel.Target} target
   * @param {!InputTimeline} client
   */
  constructor(target, client) {
    this._target = target;
    this._tracingManager = target.model(SDK.TracingManager.TracingManager);
    this._client = client;

    const backingStorage = new Bindings.TempFile.TempFileBackingStorage();
    this._tracingModel = new SDK.TracingModel.TracingModel(backingStorage);

    /** @type {?function()} */
    this._tracingCompleteCallback = null;
  }

  /**
   * @return {!Promise<!Object>}
   */
  async startRecording() {
    function disabledByDefault(category) {
      return 'disabled-by-default-' + category;
    }

    const categoriesArray = ['devtools.timeline', disabledByDefault('devtools.timeline.inputs')];
    const categories = categoriesArray.join(',');

    const response = await this._tracingManager.start(this, categories, '');
    if (response['Protocol.Error']) {
      await this._waitForTracingToStop(false);
    }
    return response;
  }

  async stopRecording() {
    if (this._tracingManager) {
      this._tracingManager.stop();
    }

    await this._waitForTracingToStop(true);
    await SDK.SDKModel.TargetManager.instance().resumeAllTargets();
    this._tracingModel.tracingComplete();
    this._client.loadingComplete(this._tracingModel);
  }
  /**
   * @param {!Array.<!SDK.TracingManager.EventPayload>} events
   * @override
   */
  traceEventsCollected(events) {
    this._tracingModel.addEvents(events);
  }

  /**
   * @override
   */
  tracingComplete() {
    this._tracingCompleteCallback();
    this._tracingCompleteCallback = null;
  }

  /**
   * @param {number} usage
   * @override
   */
  tracingBufferUsage(usage) {
  }

  /**
   * @param {number} progress
   * @override
   */
  eventsRetrievalProgress(progress) {
  }

  /**
   * @param {boolean} awaitTracingCompleteCallback - Whether to wait for the _tracingCompleteCallback to happen
   * @return {!Promise}
   */
  _waitForTracingToStop(awaitTracingCompleteCallback) {
    return new Promise(resolve => {
      if (this._tracingManager && awaitTracingCompleteCallback) {
        this._tracingCompleteCallback = resolve;
      } else {
        resolve();
      }
    });
  }
}
