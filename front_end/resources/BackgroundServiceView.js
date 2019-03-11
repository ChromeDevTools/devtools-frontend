// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Resources.BackgroundServiceView = class extends UI.VBox {
  /**
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   * @param {!Resources.BackgroundServiceModel} model
   */
  constructor(serviceName, model) {
    super(true);
    this.registerRequiredCSS('resources/backgroundServiceView.css');

    /** @const {!Protocol.BackgroundService.ServiceName} */
    this._serviceName = serviceName;

    /** @const {!Resources.BackgroundServiceModel} */
    this._model = model;
    this._model.addEventListener(
        Resources.BackgroundServiceModel.Events.RecordingStateChanged, this._onRecordingStateChanged, this);
    this._model.addEventListener(
        Resources.BackgroundServiceModel.Events.BackgroundServiceEventReceived, this._onEventReceived, this);
    this._model.enable(this._serviceName);

    /** @type {?UI.ToolbarToggle} */
    this._recordButton = null;

    /** @const {!UI.Toolbar} */
    this._toolbar = new UI.Toolbar('background-service-toolbar', this.contentElement);
    this._setupToolbar();
  }

  /**
   * Creates the toolbar UI element.
   */
  async _setupToolbar() {
    this._recordButton =
        new UI.ToolbarToggle(Common.UIString('Toggle Record'), 'largeicon-start-recording', 'largeicon-stop-recording');
    this._recordButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._toggleRecording());
    this._recordButton.setToggleWithRedColor(true);
    this._toolbar.appendToolbarItem(this._recordButton);

    const refreshButton = new UI.ToolbarButton(Common.UIString('Refresh'), 'largeicon-refresh');
    refreshButton.addEventListener(UI.ToolbarButton.Events.Click, () => {});
    this._toolbar.appendToolbarItem(refreshButton);

    const clearButton = new UI.ToolbarButton(Common.UIString('Clear'), 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, () => {});
    this._toolbar.appendToolbarItem(clearButton);

    this._toolbar.appendSeparator();

    const deleteButton = new UI.ToolbarButton(Common.UIString('Delete'), 'largeicon-trash-bin');
    deleteButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._model.clearEvents(this._serviceName));
    this._toolbar.appendToolbarItem(deleteButton);
  }

  /**
   * Called when the `Toggle Record` button is clicked.
   */
  _toggleRecording() {
    this._model.setRecording(!this._recordButton.toggled(), this._serviceName);
  }

  /**
   * @param {!Common.Event} event
   */
  _onRecordingStateChanged(event) {
    const state = /** @type {!Resources.BackgroundServiceModel.RecordingState} */ (event.data);
    if (state.serviceName !== this._serviceName)
      return;
    this._recordButton.setToggled(state.isRecording);
  }

  /**
   * @param {!Common.Event} event
   */
  _onEventReceived(event) {
    const serviceEvent = /** @type {!Protocol.BackgroundService.BackgroundServiceEvent} */ (event.data);
    if (serviceEvent.service !== this._serviceName)
      return;
  }
};
