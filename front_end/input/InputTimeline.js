// Copyright (c) 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export default class InputTimeline extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('input/inputTimeline.css');
    this.element.classList.add('inputs-timeline');

    this._tracingClient = null;
    this._inputModel = null;

    this._state = State.Idle;


    this._toggleRecordAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('input.toggle-recording'));
    this._startReplayAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('input.start-replaying'));
    this._togglePauseAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('input.toggle-pause'));

    const toolbarContainer = this.contentElement.createChild('div', 'input-timeline-toolbar-container');
    this._panelToolbar = new UI.Toolbar('input-timeline-toolbar', toolbarContainer);

    this._panelToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleRecordAction));
    this._panelToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._startReplayAction));
    this._panelToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._togglePauseAction));

    this._clearButton = new UI.ToolbarButton(ls`Clear all`, 'largeicon-clear');
    this._clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._reset.bind(this));
    this._panelToolbar.appendToolbarItem(this._clearButton);

    this._panelToolbar.appendSeparator();
    this._updateControls();
  }

  _reset() {
    this._tracingClient = null;
    this._inputModel = null;
    this._setState(State.Idle);
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
   * @param {!State} state
   * @return {boolean}
   */
  _isAvailableState(state) {
    return state === State.Idle || state === State.ReplayPaused;
  }

  _updateControls() {
    this._toggleRecordAction.setToggled(this._state === State.Recording);
    this._toggleRecordAction.setEnabled(this._isAvailableState(this._state) || this._state === State.Recording);
    this._startReplayAction.setEnabled(this._isAvailableState(this._state) && !!this._inputModel);
    this._togglePauseAction.setEnabled(this._state === State.Replaying || this._state === State.ReplayPaused);
    this._togglePauseAction.setToggled(this._state === State.ReplayPaused);
    this._clearButton.setEnabled(this._isAvailableState(this._state));
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

  async _startRecording() {
    this._setState(State.StartPending);

    this._tracingClient =
        new InputTimeline.TracingClient(/** @type {!SDK.Target} */ (self.SDK.targetManager.mainTarget()), this);

    const response = await this._tracingClient.startRecording();
    if (response[Protocol.Error]) {
      this._recordingFailed(response[Protocol.Error]);
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
   * @param {?SDK.TracingModel} tracingModel
   */
  recordingComplete(tracingModel) {
    if (!tracingModel) {
      this._reset();
      return;
    }
    this._inputModel = new Input.InputModel(/** @type {!SDK.Target} */ (self.SDK.targetManager.mainTarget()));
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
  ReplayPaused: Symbol('ReplayPaused')
};


/**
 * @implements {UI.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const inputViewId = 'Inputs';
    UI.viewManager.showView(inputViewId)
        .then(() => UI.viewManager.view(inputViewId).widget())
        .then(widget => this._innerHandleAction(/** @type !Input.InputTimeline} */ (widget), actionId));

    return true;
  }

  /**
   * @param {!Input.InputTimeline} inputTimeline
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
 * @implements {SDK.TracingManagerClient}
 */
export class TracingClient {
  /**
   * @param {!SDK.Target} target
   * @param {!Input.InputTimeline} client
   */
  constructor(target, client) {
    this._target = target;
    this._tracingManager = target.model(SDK.TracingManager);
    this._client = client;

    const backingStorage = new Bindings.TempFileBackingStorage();
    this._tracingModel = new SDK.TracingModel(backingStorage);

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
    await self.SDK.targetManager.resumeAllTargets();
    this._tracingModel.tracingComplete();
    this._client.recordingComplete(this._tracingModel);
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


/* Legacy exported object */
self.Input = self.Input || {};

/* Legacy exported object */
Input = Input || {};

/**
 * @implements {SDK.SDKModelObserver<!Input.InputModel>}
 * @constructor
 * @unrestricted
 */
Input.InputTimeline = InputTimeline;

/** @enum {symbol} */
Input.InputTimeline.State = State;

/**
 * @constructor
 */
Input.InputTimeline.TracingClient = TracingClient;

/**
 * @constructor
 */
Input.InputTimeline.ActionDelegate = ActionDelegate;
