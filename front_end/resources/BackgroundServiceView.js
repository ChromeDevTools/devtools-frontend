// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as DataGrid from '../data_grid/data_grid.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {BackgroundServiceModel, Events} from './BackgroundServiceModel.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text in Background Service View of the Application panel
  */
  backgroundFetch: 'Background Fetch',
  /**
  *@description Text in Background Service View of the Application panel
  */
  backgroundSync: 'Background Sync',
  /**
  *@description Text in Background Service View of the Application panel
  */
  pushMessaging: 'Push Messaging',
  /**
  *@description Text in Background Service View of the Application panel
  */
  notifications: 'Notifications',
  /**
  *@description Text in Background Service View of the Application panel
  */
  paymentHandler: 'Payment Handler',
  /**
  *@description Text in the Periodic Background Service View of the Application panel
  */
  periodicBackgroundSync: 'Periodic Background Sync',
  /**
  *@description Text to clear content
  */
  clear: 'Clear',
  /**
  *@description Tooltip text that appears when hovering over the largeicon download button in the Background Service View of the Application panel
  */
  saveEvents: 'Save events',
  /**
  *@description Text in Background Service View of the Application panel
  */
  showEventsFromOtherDomains: 'Show events from other domains',
  /**
  *@description Title of an action under the Background Services category that can be invoked through the Command Menu
  */
  stopRecordingEvents: 'Stop recording events',
  /**
  *@description Title of an action under the Background Services category that can be invoked through the Command Menu
  */
  startRecordingEvents: 'Start recording events',
  /**
  *@description Text for timestamps of items
  */
  timestamp: 'Timestamp',
  /**
  *@description Text that refers to some events
  */
  event: 'Event',
  /**
  *@description Text for the origin of something
  */
  origin: 'Origin',
  /**
  *@description Text in Background Service View of the Application panel
  */
  swScope: 'SW Scope',
  /**
  *@description Text in Background Service View of the Application panel
  */
  instanceId: 'Instance ID',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  backgroundServices: 'Background Services',
  /**
  *@description Text that is usually a hyperlink to more documentation
  */
  learnMore: 'Learn more',
  /**
  *@description Text in Background Service View of the Application panel
  */
  selectAnEntryToViewMetadata: 'Select an entry to view metadata',
  /**
  *@description Text in Background Service View of the Application panel
  *@example {Background Fetch} PH1
  */
  recordingSActivity: 'Recording {PH1} activity...',
  /**
  *@description Inform users that DevTools are recording/waiting for events in the Periodic Background Sync tool of the Application panel
  *@example {Background Fetch} PH1
  */
  devtoolsWillRecordAllSActivity: 'DevTools will record all {PH1} activity for up to 3 days, even when closed.',
  /**
  *@description Text in Background Service View of the Application panel
  *@example {record} PH1
  *@example {Ctrl + R} PH2
  */
  clickTheRecordButtonSOrHitSTo: 'Click the record button {PH1} or hit {PH2} to start recording.',
  /**
  *@description Text to show an item is empty
  */
  empty: 'empty',
  /**
  *@description Text in Background Service View of the Application panel
  */
  noMetadataForThisEvent: 'No metadata for this event',
};
const str_ = i18n.i18n.registerUIStrings('resources/BackgroundServiceView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BackgroundServiceView extends UI.Widget.VBox {
  /**
   * @param {string} serviceName The name of the background service.
   * @return {string} The UI String to display.
   */
  static getUIString(serviceName) {
    switch (serviceName) {
      case Protocol.BackgroundService.ServiceName.BackgroundFetch:
        return i18nString(UIStrings.backgroundFetch);
      case Protocol.BackgroundService.ServiceName.BackgroundSync:
        return i18nString(UIStrings.backgroundSync);
      case Protocol.BackgroundService.ServiceName.PushMessaging:
        return i18nString(UIStrings.pushMessaging);
      case Protocol.BackgroundService.ServiceName.Notifications:
        return i18nString(UIStrings.notifications);
      case Protocol.BackgroundService.ServiceName.PaymentHandler:
        return i18nString(UIStrings.paymentHandler);
      case Protocol.BackgroundService.ServiceName.PeriodicBackgroundSync:
        return i18nString(UIStrings.periodicBackgroundSync);
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
    this.registerRequiredCSS('resources/backgroundServiceView.css', {enableLegacyPatching: true});
    this.registerRequiredCSS('ui/emptyWidget.css', {enableLegacyPatching: false});

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
    if (!this._securityOriginManager) {
      throw new Error('SecurityOriginManager instance is missing');
    }
    this._securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, () => this._onOriginChanged());


    /** @type {!UI.ActionRegistration.Action} */
    this._recordAction =
        /** @type {!UI.ActionRegistration.Action} */ (
            UI.ActionRegistry.ActionRegistry.instance().action('background-service.toggle-recording'));

    /**
     * Initialised in the _setupToolbar() call below.
     * @type {!UI.Toolbar.ToolbarToggle}
     */
    this._recordButton;

    /**
     * Initialised in the _setupToolbar() call below.
     * @type {!UI.Toolbar.ToolbarCheckbox}
     */
    this._originCheckbox;

    /**
     * Initialised in the _setupToolbar() call below.
     * @type {!UI.Toolbar.ToolbarButton}
     */
    this._saveButton;

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
    this._recordButton =
        /** @type {!UI.Toolbar.ToolbarToggle} */ (UI.Toolbar.Toolbar.createActionButton(this._recordAction));
    this._toolbar.appendToolbarItem(this._recordButton);

    const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clear), 'largeicon-clear');
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this._clearEvents());
    this._toolbar.appendToolbarItem(clearButton);

    this._toolbar.appendSeparator();

    this._saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.saveEvents), 'largeicon-download');
    this._saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._saveToFile();
    });
    this._saveButton.setEnabled(false);
    this._toolbar.appendToolbarItem(this._saveButton);

    this._toolbar.appendSeparator();

    this._originCheckbox = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.showEventsFromOtherDomains), i18nString(UIStrings.showEventsFromOtherDomains),
        () => this._refreshView());
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
    this._updateRecordButtonTooltip();
    this._showPreview(this._selectedEventNode);
  }

  _updateRecordButtonTooltip() {
    const buttonTooltip = this._recordButton.toggled() ? i18nString(UIStrings.stopRecordingEvents) :
                                                         i18nString(UIStrings.startRecordingEvents);
    this._recordButton.setTitle(buttonTooltip, 'background-service.toggle-recording');
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
   * @return {!DataGrid.DataGrid.DataGridImpl<!Object<string, string|number>>}
   */
  _createDataGrid() {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'id', title: '#', weight: 1},
      {id: 'timestamp', title: i18nString(UIStrings.timestamp), weight: 8},
      {id: 'eventName', title: i18nString(UIStrings.event), weight: 10},
      {id: 'origin', title: i18nString(UIStrings.origin), weight: 10},
      {id: 'swScope', title: i18nString(UIStrings.swScope), weight: 2},
      {id: 'instanceId', title: i18nString(UIStrings.instanceId), weight: 10},
    ]);
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.backgroundServices),
      columns,
      editCallback: undefined,
      refreshCallback: undefined,
      deleteCallback: undefined
    });
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
    const registration = this._serviceWorkerManager ?
        this._serviceWorkerManager.registrations().get(serviceEvent.serviceWorkerRegistrationId) :
        undefined;
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

    return UI.XLink.XLink.create(url, i18nString(UIStrings.learnMore));
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
      centered.createChild('p').textContent = i18nString(UIStrings.selectAnEntryToViewMetadata);
    } else if (this._recordButton.toggled()) {
      // Inform users that we are recording/waiting for events.
      const featureName = BackgroundServiceView.getUIString(this._serviceName);
      centered.createChild('p').textContent = i18nString(UIStrings.recordingSActivity, {PH1: featureName});
      centered.createChild('p').textContent = i18nString(UIStrings.devtoolsWillRecordAllSActivity, {PH1: featureName});
    } else {
      const landingRecordButton = UI.Toolbar.Toolbar.createActionButton(this._recordAction);

      const recordKey = document.createElement('b');
      recordKey.classList.add('background-service-shortcut');
      recordKey.textContent = UI.ShortcutRegistry.ShortcutRegistry.instance()
                                  .shortcutsForAction('background-service.toggle-recording')[0]
                                  .title();

      const inlineButton = UI.UIUtils.createInlineButton(landingRecordButton);
      inlineButton.classList.add('background-service-record-inline-button');
      centered.createChild('p').appendChild(i18n.i18n.getFormatLocalizedString(
          str_, UIStrings.clickTheRecordButtonSOrHitSTo, {PH1: inlineButton, PH2: recordKey}));

      centered.appendChild(this._createLearnMoreLink());
    }

    this._preview.show(this._previewPanel.contentElement);
  }

  /**
   * Saves all currently displayed events in a file (JSON format).
   */
  async _saveToFile() {
    const fileName = `${this._serviceName}-${Platform.DateUtilities.toISO8601Compact(new Date())}.json`;
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

/**
 * @extends {DataGrid.DataGrid.DataGridNode<!Object<string, string|number>>}
 */
export class EventDataNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @param {!Object<string, string|number>} data
   * @param {!Array<!Protocol.BackgroundService.EventMetadata>} eventMetadata
   */
  constructor(data, eventMetadata) {
    super(data);

    /** @const {!Array<!Protocol.BackgroundService.EventMetadata>} */
    this._eventMetadata = eventMetadata.sort((m1, m2) => Platform.StringUtilities.compare(m1.key, m2.key));
  }

  /**
   * @return {!UI.Widget.VBox}
   */
  createPreview() {
    const preview = new UI.Widget.VBox();
    preview.element.classList.add('background-service-metadata');

    for (const entry of this._eventMetadata) {
      const div = document.createElement('div');
      div.classList.add('background-service-metadata-entry');
      div.createChild('div', 'background-service-metadata-name').textContent = entry.key + ': ';
      if (entry.value) {
        div.createChild('div', 'background-service-metadata-value source-code').textContent = entry.value;
      } else {
        div.createChild('div', 'background-service-metadata-value background-service-empty-value').textContent =
            i18nString(UIStrings.empty);
      }
      preview.element.appendChild(div);
    }

    if (!preview.element.children.length) {
      const div = document.createElement('div');
      div.classList.add('background-service-metadata-entry');
      div.createChild('div', 'background-service-metadata-name').textContent =
          i18nString(UIStrings.noMetadataForThisEvent);
      preview.element.appendChild(div);
    }

    return preview;
  }
}

/** @type {!ActionDelegate} */
let actionDelegateInstance;

/**
 * @implements {UI.ActionRegistration.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }

  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const view = context.flavor(BackgroundServiceView);
    switch (actionId) {
      case 'background-service.toggle-recording': {
        if (!view) {
          throw new Error('BackgroundServiceView instance is missing');
        }
        view._toggleRecording();
        return true;
      }
    }
    return false;
  }
}

/**
 * @typedef {!{isRecording: boolean, serviceName: !Protocol.BackgroundService.ServiceName}}
 */
// @ts-ignore typedef
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
// @ts-ignore typedef
export let EventData;
