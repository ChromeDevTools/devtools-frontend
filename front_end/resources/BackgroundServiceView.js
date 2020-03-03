// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as DataGrid from '../data_grid/data_grid.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {BackgroundServiceModel, Events} from './BackgroundServiceModel.js';  // eslint-disable-line no-unused-vars

export class BackgroundServiceView extends UI.Widget.VBox {
  /**
   * @param {string} serviceName The name of the background service.
   * @return {string} The UI String to display.
   */
  static getUIString(serviceName) {
    switch (serviceName) {
      case Protocol.BackgroundService.ServiceName.BackgroundFetch:
        return ls`Background Fetch`;
      case Protocol.BackgroundService.ServiceName.BackgroundSync:
        return ls`Background Sync`;
      case Protocol.BackgroundService.ServiceName.PushMessaging:
        return ls`Push Messaging`;
      case Protocol.BackgroundService.ServiceName.Notifications:
        return ls`Notifications`;
      case Protocol.BackgroundService.ServiceName.PaymentHandler:
        return ls`Payment Handler`;
      case Protocol.BackgroundService.ServiceName.PeriodicBackgroundSync:
        return ls`Periodic Background Sync`;
      default:
        return '';
    }
  }

  /**
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   * @param {!BackgroundServiceModel} model
   */
  constructor(serviceName, model) {
    super(true);
    this.registerRequiredCSS('resources/backgroundServiceView.css');
    this.registerRequiredCSS('ui/emptyWidget.css');

    /** @const {!Protocol.BackgroundService.ServiceName} */
    this._serviceName = serviceName;

    /** @const {!BackgroundServiceModel} */
    this._model = model;
    this._model.addEventListener(Events.RecordingStateChanged, this._onRecordingStateChanged, this);
    this._model.addEventListener(Events.BackgroundServiceEventReceived, this._onEventReceived, this);
    this._model.enable(this._serviceName);

    /** @const {?SDK.ServiceWorkerManager.ServiceWorkerManager} */
    this._serviceWorkerManager = this._model.target().model(SDK.ServiceWorkerManager.ServiceWorkerManager);

    /** @const {?SDK.SecurityOriginManager.SecurityOriginManager} */
    this._securityOriginManager = this._model.target().model(SDK.SecurityOriginManager.SecurityOriginManager);
    this._securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, () => this._onOriginChanged());


    /** @const {!UI.Action.Action} */
    this._recordAction =
        /** @type {!UI.Action.Action} */ (self.UI.actionRegistry.action('background-service.toggle-recording'));
    /** @type {?UI.Toolbar.ToolbarButton} */
    this._recordButton = null;

    /** @type {?UI.Toolbar.ToolbarCheckbox} */
    this._originCheckbox = null;

    /** @type {?UI.Toolbar.ToolbarButton} */
    this._saveButton = null;

    /** @const {!UI.Toolbar.Toolbar} */
    this._toolbar = new UI.Toolbar.Toolbar('background-service-toolbar', this.contentElement);
    this._setupToolbar();

    /**
     * This will contain the DataGrid for displaying events, and a panel at the bottom for showing
     * extra metadata related to the selected event.
     * @const {!UI.SplitWidget.SplitWidget}
     */
    this._splitWidget = new UI.SplitWidget.SplitWidget(/* isVertical= */ false, /* secondIsSidebar= */ true);
    this._splitWidget.show(this.contentElement);

    /** @const {!DataGrid.DataGrid.DataGridImpl} */
    this._dataGrid = this._createDataGrid();

    /** @const {!UI.Widget.VBox} */
    this._previewPanel = new UI.Widget.VBox();

    /** @type {?EventDataNode} */
    this._selectedEventNode = null;

    /** @type {?UI.Widget.Widget} */
    this._preview = null;

    this._splitWidget.setMainWidget(this._dataGrid.asWidget());
    this._splitWidget.setSidebarWidget(this._previewPanel);

    this._showPreview(null);
  }

  /**
   * Creates the toolbar UI element.
   */
  async _setupToolbar() {
    this._recordButton = UI.Toolbar.Toolbar.createActionButton(this._recordAction);
    this._toolbar.appendToolbarItem(this._recordButton);

    const clearButton = new UI.Toolbar.ToolbarButton(ls`Clear`, 'largeicon-clear');
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this._clearEvents());
    this._toolbar.appendToolbarItem(clearButton);

    this._toolbar.appendSeparator();

    this._saveButton = new UI.Toolbar.ToolbarButton(ls`Save events`, 'largeicon-download');
    this._saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._saveToFile();
    });
    this._saveButton.setEnabled(false);
    this._toolbar.appendToolbarItem(this._saveButton);

    this._toolbar.appendSeparator();

    this._originCheckbox = new UI.Toolbar.ToolbarCheckbox(
        ls`Show events from other domains`, ls`Show events from other domains`, () => this._refreshView());
    this._toolbar.appendToolbarItem(this._originCheckbox);
  }

  /**
   * Displays all available events in the grid.
   */
  _refreshView() {
    this._clearView();
    const events = this._model.getEvents(this._serviceName).filter(event => this._acceptEvent(event));
    for (const event of events) {
      this._addEvent(event);
    }
  }

  /**
   * Clears the grid and panel.
   */
  _clearView() {
    this._selectedEventNode = null;
    this._dataGrid.rootNode().removeChildren();
    this._saveButton.setEnabled(false);
    this._showPreview(null);
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
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRecordingStateChanged(event) {
    const state = /** @type {!RecordingState} */ (event.data);
    if (state.serviceName !== this._serviceName) {
      return;
    }

    if (state.isRecording === this._recordButton.toggled()) {
      return;
    }

    this._recordButton.setToggled(state.isRecording);
    this._showPreview(this._selectedEventNode);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onEventReceived(event) {
    const serviceEvent = /** @type {!Protocol.BackgroundService.BackgroundServiceEvent} */ (event.data);
    if (!this._acceptEvent(serviceEvent)) {
      return;
    }
    this._addEvent(serviceEvent);
  }

  _onOriginChanged() {
    // No need to refresh the view if we are already showing all events.
    if (this._originCheckbox.checked()) {
      return;
    }
    this._refreshView();
  }

  /**
   * @param {!Protocol.BackgroundService.BackgroundServiceEvent} serviceEvent
   */
  _addEvent(serviceEvent) {
    const data = this._createEventData(serviceEvent);
    const dataNode = new EventDataNode(data, serviceEvent.eventMetadata);
    this._dataGrid.rootNode().appendChild(dataNode);

    if (this._dataGrid.rootNode().children.length === 1) {
      this._saveButton.setEnabled(true);
      this._showPreview(this._selectedEventNode);
    }
  }

  /**
   * @return {!DataGrid.DataGrid.DataGridImpl}
   */
  _createDataGrid() {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'id', title: ls`#`, weight: 1},
      {id: 'timestamp', title: ls`Timestamp`, weight: 8},
      {id: 'eventName', title: ls`Event`, weight: 10},
      {id: 'origin', title: ls`Origin`, weight: 10},
      {id: 'swScope', title: ls`SW Scope`, weight: 2},
      {id: 'instanceId', title: ls`Instance ID`, weight: 10},
    ]);
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: ls`Background Services`, columns});
    dataGrid.setStriped(true);

    dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SelectedNode, event => this._showPreview(/** @type {!EventDataNode} */ (event.data)));

    return dataGrid;
  }

  /**
   * Creates the data object to pass to the DataGrid Node.
   * @param {!Protocol.BackgroundService.BackgroundServiceEvent} serviceEvent
   * @return {!EventData}
   */
  _createEventData(serviceEvent) {
    let swScope = '';

    // Try to get the scope of the Service Worker registration to be more user-friendly.
    const registration = this._serviceWorkerManager.registrations().get(serviceEvent.serviceWorkerRegistrationId);
    if (registration) {
      swScope = registration.scopeURL.substr(registration.securityOrigin.length);
    }

    return {
      id: this._dataGrid.rootNode().children.length + 1,
      timestamp: UI.UIUtils.formatTimestamp(serviceEvent.timestamp * 1000, /* full= */ true),
      origin: serviceEvent.origin,
      swScope,
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
    if (event.service !== this._serviceName) {
      return false;
    }

    if (this._originCheckbox.checked()) {
      return true;
    }

    // Trim the trailing '/'.
    const origin = event.origin.substr(0, event.origin.length - 1);

    return this._securityOriginManager.securityOrigins().includes(origin);
  }

  /**
   * @return {!Element}
   */
  _createLearnMoreLink() {
    let url =
        'https://developers.google.com/web/tools/chrome-devtools/javascript/background-services?utm_source=devtools';

    switch (this._serviceName) {
      case Protocol.BackgroundService.ServiceName.BackgroundFetch:
        url += '#fetch';
        break;
      case Protocol.BackgroundService.ServiceName.BackgroundSync:
        url += '#sync';
        break;
      case Protocol.BackgroundService.ServiceName.PushMessaging:
        url += '#push';
        break;
      case Protocol.BackgroundService.ServiceName.Notifications:
        url += '#notifications';
        break;
      default:
        break;
    }

    return UI.XLink.XLink.create(url, ls`Learn more`);
  }

  /**
   * @param {?EventDataNode} dataNode
   */
  _showPreview(dataNode) {
    if (this._selectedEventNode && this._selectedEventNode === dataNode) {
      return;
    }

    this._selectedEventNode = dataNode;

    if (this._preview) {
      this._preview.detach();
    }

    if (this._selectedEventNode) {
      this._preview = this._selectedEventNode.createPreview();
      this._preview.show(this._previewPanel.contentElement);
      return;
    }

    this._preview = new UI.Widget.VBox();
    this._preview.contentElement.classList.add('background-service-preview', 'fill');
    const centered = this._preview.contentElement.createChild('div');

    if (this._dataGrid.rootNode().children.length) {
      // Inform users that grid entries are clickable.
      centered.createChild('p').textContent = ls`Select an entry to view metadata`;
    } else if (this._recordButton.toggled()) {
      // Inform users that we are recording/waiting for events.
      const featureName = BackgroundServiceView.getUIString(this._serviceName);
      centered.createChild('p').textContent = ls`Recording ${featureName} activity...`;
      centered.createChild('p').textContent =
          ls`DevTools will record all ${featureName} activity for up to 3 days, even when closed.`;
    } else {
      const landingRecordButton = UI.Toolbar.Toolbar.createActionButton(this._recordAction);

      const recordKey = createElementWithClass('b', 'background-service-shortcut');
      recordKey.textContent =
          self.UI.shortcutRegistry.shortcutDescriptorsForAction('background-service.toggle-recording')[0].name;

      const inlineButton = UI.UIUtils.createInlineButton(landingRecordButton);
      inlineButton.classList.add('background-service-record-inline-button');
      centered.createChild('p').appendChild(UI.UIUtils.formatLocalized(
          'Click the record button %s or hit %s to start recording.', [inlineButton, recordKey]));

      centered.appendChild(this._createLearnMoreLink());
    }

    this._preview.show(this._previewPanel.contentElement);
  }

  /**
   * Saves all currently displayed events in a file (JSON format).
   */
  async _saveToFile() {
    const fileName = `${this._serviceName}-${new Date().toISO8601Compact()}.json`;
    const stream = new Bindings.FileUtils.FileOutputStream();

    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }

    const events = this._model.getEvents(this._serviceName).filter(event => this._acceptEvent(event));
    await stream.write(JSON.stringify(events, undefined, 2));
    stream.close();
  }
}

export class EventDataNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @param {!Object<string, string>} data
   * @param {!Array<!Protocol.BackgroundService.EventMetadata>} eventMetadata
   */
  constructor(data, eventMetadata) {
    super(data);

    /** @const {!Array<!Protocol.BackgroundService.EventMetadata>} */
    this._eventMetadata = eventMetadata.sort((m1, m2) => m1.key.compareTo(m2.key));
  }

  /**
   * @return {!UI.Widget.VBox}
   */
  createPreview() {
    const preview = new UI.Widget.VBox();
    preview.element.classList.add('background-service-metadata');

    for (const entry of this._eventMetadata) {
      const div = createElementWithClass('div', 'background-service-metadata-entry');
      div.createChild('div', 'background-service-metadata-name').textContent = entry.key + ': ';
      if (entry.value) {
        div.createChild('div', 'background-service-metadata-value source-code').textContent = entry.value;
      } else {
        div.createChild('div', 'background-service-metadata-value background-service-empty-value').textContent =
            ls`empty`;
      }
      preview.element.appendChild(div);
    }

    if (!preview.element.children.length) {
      const div = createElementWithClass('div', 'background-service-metadata-entry');
      div.createChild('div', 'background-service-metadata-name').textContent = ls`No metadata for this event`;
      preview.element.appendChild(div);
    }

    return preview;
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const view = context.flavor(BackgroundServiceView);
    switch (actionId) {
      case 'background-service.toggle-recording':
        view._toggleRecording();
        return true;
    }
    return false;
  }
}

/**
 * @typedef {!{isRecording: boolean, serviceName: !Protocol.BackgroundService.ServiceName}}
 */
export let RecordingState;

/**
 * @typedef {{
 *    id: number,
 *    timestamp: string,
 *    origin: string,
 *    swScope: string,
 *    eventName: string,
 *    instanceId: string,
 * }}
 */
export let EventData;
