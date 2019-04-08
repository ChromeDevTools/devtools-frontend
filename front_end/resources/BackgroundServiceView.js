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

    /** @const {?SDK.ServiceWorkerManager} */
    this._serviceWorkerManager = this._model.target().model(SDK.ServiceWorkerManager);

    /** @const {?SDK.SecurityOriginManager} */
    this._securityOriginManager = this._model.target().model(SDK.SecurityOriginManager);
    this._securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, () => this._onOriginChanged());

    /** @type {?UI.ToolbarToggle} */
    this._recordButton = null;

    /** @type {?UI.ToolbarCheckbox} */
    this._originCheckbox = null;

    /** @type {?UI.ToolbarButton} */
    this._saveButton = null;

    /** @const {!UI.Toolbar} */
    this._toolbar = new UI.Toolbar('background-service-toolbar', this.contentElement);
    this._setupToolbar();

    /**
     * This will contain the DataGrid for displaying events, and a panel at the bottom for showing
     * extra metadata related to the selected event.
     * @const {!UI.SplitWidget}
     */
    this._splitWidget = new UI.SplitWidget(/* isVertical= */ false, /* secondIsSidebar= */ true);
    this._splitWidget.show(this.contentElement);

    /** @const {!DataGrid.DataGrid} */
    this._dataGrid = this._createDataGrid();

    /** @const {!UI.VBox} */
    this._previewPanel = new UI.VBox();

    /** @type {?UI.Widget} */
    this._preview = null;

    this._splitWidget.setMainWidget(this._dataGrid.asWidget());
    this._splitWidget.setSidebarWidget(this._previewPanel);

    this._showPreview(null);
  }

  /**
   * Creates the toolbar UI element.
   */
  async _setupToolbar() {
    this._recordButton =
        new UI.ToolbarToggle(ls`Toggle Record`, 'largeicon-start-recording', 'largeicon-stop-recording');
    this._recordButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._toggleRecording());
    this._recordButton.setToggleWithRedColor(true);
    this._toolbar.appendToolbarItem(this._recordButton);

    const clearButton = new UI.ToolbarButton(ls`Clear`, 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._clearEvents());
    this._toolbar.appendToolbarItem(clearButton);

    this._toolbar.appendSeparator();

    this._originCheckbox =
        new UI.ToolbarCheckbox(ls`Show events from other domains`, undefined, () => this._refreshView());
    this._toolbar.appendToolbarItem(this._originCheckbox);

    this._toolbar.appendSeparator();

    this._saveButton = new UI.ToolbarButton(ls`Save events`, 'largeicon-download');
    this._saveButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._saveToFile());
    this._saveButton.setEnabled(false);
    this._toolbar.appendToolbarItem(this._saveButton);
  }

  /**
   * Displays all available events in the grid.
   */
  _refreshView() {
    this._clearView();
    const events = this._model.getEvents(this._serviceName).filter(event => this._acceptEvent(event));
    for (const event of events)
      this._addEvent(event);
  }

  /**
   * Clears the grid and panel.
   */
  _clearView() {
    this._dataGrid.rootNode().removeChildren();
    this._showPreview(null);
    this._saveButton.setEnabled(false);
  }

  /**
   * Called when the `Toggle Record` button is clicked.
   */
  _toggleRecording() {
    this._model.setRecording(!this._recordButton.toggled(), this._serviceName);
  }

  /**
   * Called when the `Clear` button is clicked.
   */
  _clearEvents() {
    this._model.clearEvents(this._serviceName);
    this._clearView();
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
    if (!this._acceptEvent(serviceEvent))
      return;
    this._addEvent(serviceEvent);
  }

  _onOriginChanged() {
    // No need to refresh the view if we are already showing all events.
    if (this._originCheckbox.checked())
      return;
    this._refreshView();
  }

  /**
   * @param {!Protocol.BackgroundService.BackgroundServiceEvent} serviceEvent
   */
  _addEvent(serviceEvent) {
    const data = this._createEventData(serviceEvent);
    const dataNode = new Resources.BackgroundServiceView.EventDataNode(data, serviceEvent.eventMetadata);
    this._dataGrid.rootNode().appendChild(dataNode);

    // There's at least one event. So we can allow saving the events.
    this._saveButton.setEnabled(true);
  }

  /**
   * @return {!DataGrid.DataGrid}
   */
  _createDataGrid() {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'id', title: ls`#`, weight: 1},
      {id: 'timestamp', title: ls`Timestamp`, weight: 8},
      {id: 'origin', title: ls`Origin`, weight: 10},
      {id: 'swSource', title: ls`SW Source`, weight: 4},
      {id: 'eventName', title: ls`Event`, weight: 10},
      {id: 'instanceId', title: ls`Instance ID`, weight: 10},
    ]);
    const dataGrid = new DataGrid.DataGrid(columns);
    dataGrid.setStriped(true);

    dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SelectedNode,
        event => this._showPreview(/** @type {!Resources.BackgroundServiceView.EventDataNode} */ (event.data)));

    return dataGrid;
  }

  /**
   * Creates the data object to pass to the DataGrid Node.
   * @param {!Protocol.BackgroundService.BackgroundServiceEvent} serviceEvent
   * @return {!Resources.BackgroundServiceView.EventData}
   */
  _createEventData(serviceEvent) {
    let swSource = '';

    // Try to get the script name of the Service Worker registration to be more user-friendly.
    const registrations = this._serviceWorkerManager.registrations().get(serviceEvent.serviceWorkerRegistrationId);
    if (registrations && registrations.versions.size) {
      // Any version will do since we care about the script URL.
      const version = registrations.versions.values().next().value;
      // Get the relative path.
      swSource = version.scriptURL.substr(version.securityOrigin.length);
    }

    return {
      id: this._dataGrid.rootNode().children.length,
      timestamp: UI.formatTimestamp(serviceEvent.timestamp * 1000, /* full= */ true),
      origin: serviceEvent.origin,
      swSource,
      eventName: serviceEvent.eventName,
      instanceId: serviceEvent.instanceId,
    };
  }

  /**
   * Filtration function to know whether event should be shown or not.
   * @param {!Protocol.BackgroundService.BackgroundServiceEvent} event
   * @return {boolean}
   */
  _acceptEvent(event) {
    if (event.service !== this._serviceName)
      return false;

    if (this._originCheckbox.checked())
      return true;

    // Trim the trailing '/'.
    const origin = event.origin.substr(0, event.origin.length - 1);

    return this._securityOriginManager.securityOrigins().includes(origin);
  }

  /**
   * @param {?Resources.BackgroundServiceView.EventDataNode} dataNode
   */
  _showPreview(dataNode) {
    if (this._preview)
      this._preview.detach();

    if (dataNode)
      this._preview = dataNode.createPreview();
    else
      this._preview = new UI.EmptyWidget(ls`Select a value to preview`);

    this._preview.show(this._previewPanel.contentElement);
  }

  /**
   * Saves all currently displayed events in a file (JSON format).
   */
  async _saveToFile() {
    const fileName = `${this._serviceName}-${new Date().toISO8601Compact()}.json`;
    const stream = new Bindings.FileOutputStream();

    const accepted = await stream.open(fileName);
    if (!accepted)
      return;

    const events = this._model.getEvents(this._serviceName).filter(event => this._acceptEvent(event));
    await stream.write(JSON.stringify(events, undefined, 2));
    stream.close();
  }
};

/**
 * @typedef {{
 *    id: number,
 *    timestamp: string,
 *    origin: string,
 *    swSource: string,
 *    eventName: string,
 *    instanceId: string,
 * }}
 */
Resources.BackgroundServiceView.EventData;

Resources.BackgroundServiceView.EventDataNode = class extends DataGrid.DataGridNode {
  /**
   * @param {!Object<string, string>} data
   * @param {!Array<!Protocol.BackgroundService.EventMetadata>} eventMetadata
   */
  constructor(data, eventMetadata) {
    super(data);

    /** @const {!Array<!Protocol.BackgroundService.EventMetadata>} */
    this._eventMetadata = eventMetadata;
  }

  /**
   * @return {!UI.SearchableView}
   */
  createPreview() {
    const metadata = {};
    for (const entry of this._eventMetadata)
      metadata[entry.key] = entry.value;
    return SourceFrame.JSONView.createViewSync(metadata);
  }
};
