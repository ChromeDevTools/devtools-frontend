// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
// eslint-disable-next-line rulesdir/es-modules-import
import emptyWidgetStyles from '../../ui/legacy/emptyWidget.css.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {type BackgroundServiceModel, Events} from './BackgroundServiceModel.js';
import backgroundServiceViewStyles from './backgroundServiceView.css.js';

const UIStrings = {
  /**
   *@description Text in Background Service View of the Application panel
   */
  backgroundFetch: 'Background fetch',
  /**
   *@description Text in Background Service View of the Application panel
   */
  backgroundSync: 'Background sync',
  /**
   *@description Text in Background Service View of the Application panel
   */
  pushMessaging: 'Push messaging',
  /**
   *@description Text in Background Service View of the Application panel
   */
  notifications: 'Notifications',
  /**
   *@description Text in Background Service View of the Application panel
   */
  paymentHandler: 'Payment handler',
  /**
   *@description Text in the Periodic Background Service View of the Application panel
   */
  periodicBackgroundSync: 'Periodic background sync',
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
   *@description Text of a checkbox to show events for other dtorage keys
   */
  showEventsForOtherStorageKeys: 'Show events from other storage partitions',
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
   *@description Text for the storage key of something
   */
  storageKey: 'Storage Key',
  /**
   *@description Text in Background Service View of the Application panel. The Scope is a URL associated with the Service Worker, which limits which pages/sites the Service Worker operates on.
   */
  swScope: 'Service Worker Scope',
  /**
   *@description Text in Background Service View of the Application panel
   */
  instanceId: 'Instance ID',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  backgroundServices: 'Background services',
  /**
   *@description Text in Background Service View of the Application panel.
   *             An event here refers to a background service event that is an entry in a table.
   */
  noEventSelected: 'No event selected',
  /**
   *@description Text in Background Service View of the Application panel
   */
  selectAnEventToViewMetadata: 'Select an event to view its metadata',
  /**
   *@description Text in Background Service View of the Application panel
   *@example {Background Fetch} PH1
   */
  recordingSActivity: 'Recording {PH1} activity...',
  /**
   *@description Text in Background Service View of the Application panel
   */
  noRecording: 'No recording yet',
  /**
   *@description Inform users that DevTools are recording/waiting for events in the Periodic Background Sync tool of the Application panel
   *@example {Background Fetch} PH1
   */
  devtoolsWillRecordAllSActivity: 'DevTools will record all {PH1} activity for up to 3 days, even when closed.',
  /**
   *@description Text in Background Service View of the Application panel to instruct the user on how to start a recording for
   * background services.
   *
   *@example {Start recording events} PH1
   *@example {Ctrl + E} PH2
   */
  startRecordingToDebug: 'Start to debug background services by using the "{PH1}" button or by hitting {PH2}.',
  /**
   *@description Text to show an item is empty
   */
  empty: 'empty',
  /**
   *@description Text in Background Service View of the Application panel
   */
  noMetadataForThisEvent: 'No metadata for this event',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/BackgroundServiceView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BackgroundServiceView extends UI.Widget.VBox {
  private readonly serviceName: Protocol.BackgroundService.ServiceName;
  private readonly model: BackgroundServiceModel;
  private readonly serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager|null;
  private readonly securityOriginManager: SDK.SecurityOriginManager.SecurityOriginManager;
  private readonly storageKeyManager: SDK.StorageKeyManager.StorageKeyManager;
  private recordAction: UI.ActionRegistration.Action;
  private recordButton!: UI.Toolbar.ToolbarToggle;
  private originCheckbox!: UI.Toolbar.ToolbarCheckbox;
  private storageKeyCheckbox!: UI.Toolbar.ToolbarCheckbox;
  private saveButton!: UI.Toolbar.ToolbarButton;
  private readonly toolbar: UI.Toolbar.Toolbar;
  private readonly splitWidget: UI.SplitWidget.SplitWidget;
  private readonly dataGrid: DataGrid.DataGrid.DataGridImpl<EventData>;
  private readonly previewPanel: UI.Widget.VBox;
  private selectedEventNode: EventDataNode|null;
  private preview: UI.Widget.Widget|null;

  static getUIString(serviceName: string): string {
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

  constructor(serviceName: Protocol.BackgroundService.ServiceName, model: BackgroundServiceModel) {
    super(true);
    this.registerRequiredCSS(emptyWidgetStyles, backgroundServiceViewStyles);

    this.serviceName = serviceName;
    const kebabName = Platform.StringUtilities.toKebabCase(serviceName);
    this.element.setAttribute('jslog', `${VisualLogging.pane().context(kebabName)}`);

    this.model = model;
    this.model.addEventListener(Events.RecordingStateChanged, this.onRecordingStateChanged, this);
    this.model.addEventListener(Events.BackgroundServiceEventReceived, this.onEventReceived, this);
    this.model.enable(this.serviceName);

    this.serviceWorkerManager = this.model.target().model(SDK.ServiceWorkerManager.ServiceWorkerManager);

    this.securityOriginManager = this.model.target().model(SDK.SecurityOriginManager.SecurityOriginManager) as
        SDK.SecurityOriginManager.SecurityOriginManager;
    if (!this.securityOriginManager) {
      throw new Error('SecurityOriginManager instance is missing');
    }
    this.securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, () => this.onOriginChanged());

    this.storageKeyManager =
        this.model.target().model(SDK.StorageKeyManager.StorageKeyManager) as SDK.StorageKeyManager.StorageKeyManager;
    if (!this.storageKeyManager) {
      throw new Error('StorageKeyManager instance is missing');
    }
    this.storageKeyManager.addEventListener(
        SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED, () => this.onStorageKeyChanged());

    this.recordAction = UI.ActionRegistry.ActionRegistry.instance().getAction('background-service.toggle-recording');

    this.toolbar = this.contentElement.createChild('devtools-toolbar', 'background-service-toolbar');
    this.toolbar.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    void this.setupToolbar();

    /**
     * This will contain the DataGrid for displaying events, and a panel at the bottom for showing
     * extra metadata related to the selected event.
     */
    this.splitWidget = new UI.SplitWidget.SplitWidget(/* isVertical= */ false, /* secondIsSidebar= */ true);
    this.splitWidget.show(this.contentElement);

    this.dataGrid = this.createDataGrid();

    this.previewPanel = new UI.Widget.VBox();
    this.previewPanel.element.setAttribute('jslog', `${VisualLogging.pane('preview').track({resize: true})}`);

    this.selectedEventNode = null;

    this.preview = null;

    this.splitWidget.setMainWidget(this.dataGrid.asWidget());
    this.splitWidget.setSidebarWidget(this.previewPanel);
    this.splitWidget.hideMain();

    this.showPreview(null);
  }

  getDataGrid(): DataGrid.DataGrid.DataGridImpl<EventData> {
    return this.dataGrid;
  }

  /**
   * Creates the toolbar UI element.
   */
  private async setupToolbar(): Promise<void> {
    this.toolbar.wrappable = true;
    this.recordButton = (UI.Toolbar.Toolbar.createActionButton(this.recordAction) as UI.Toolbar.ToolbarToggle);
    this.recordButton.toggleOnClick(false);
    this.toolbar.appendToolbarItem(this.recordButton);

    const clearButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clear), 'clear', undefined, 'background-service.clear');
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => this.clearEvents());
    this.toolbar.appendToolbarItem(clearButton);

    this.toolbar.appendSeparator();

    this.saveButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.saveEvents), 'download', undefined, 'background-service.save-events');
    this.saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, _event => {
      void this.saveToFile();
    });
    this.saveButton.setEnabled(false);
    this.toolbar.appendToolbarItem(this.saveButton);

    this.toolbar.appendSeparator();

    this.originCheckbox = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.showEventsFromOtherDomains), i18nString(UIStrings.showEventsFromOtherDomains),
        () => this.refreshView(), 'show-events-from-other-domains');
    this.toolbar.appendToolbarItem(this.originCheckbox);

    this.storageKeyCheckbox = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.showEventsForOtherStorageKeys), i18nString(UIStrings.showEventsForOtherStorageKeys),
        () => this.refreshView(), 'show-events-from-other-partitions');
    this.toolbar.appendToolbarItem(this.storageKeyCheckbox);
  }

  /**
   * Displays all available events in the grid.
   */
  private refreshView(): void {
    this.clearView();
    const events = this.model.getEvents(this.serviceName).filter(event => this.acceptEvent(event));
    for (const event of events) {
      this.addEvent(event);
    }
  }

  /**
   * Clears the grid and panel.
   */
  private clearView(): void {
    this.selectedEventNode = null;
    this.dataGrid.rootNode().removeChildren();
    this.splitWidget.hideMain();
    this.saveButton.setEnabled(false);
    this.showPreview(null);
  }

  /**
   * Called when the `Toggle Record` button is clicked.
   */
  toggleRecording(): void {
    this.model.setRecording(!this.recordButton.isToggled(), this.serviceName);
  }

  /**
   * Called when the `Clear` button is clicked.
   */
  private clearEvents(): void {
    this.model.clearEvents(this.serviceName);
    this.clearView();
  }

  private onRecordingStateChanged({data: state}: Common.EventTarget.EventTargetEvent<RecordingState>): void {
    if (state.serviceName !== this.serviceName) {
      return;
    }

    if (state.isRecording === this.recordButton.isToggled()) {
      return;
    }

    this.recordButton.setToggled(state.isRecording);
    this.updateRecordButtonTooltip();
    this.showPreview(this.selectedEventNode);
  }

  private updateRecordButtonTooltip(): void {
    const buttonTooltip = this.recordButton.isToggled() ? i18nString(UIStrings.stopRecordingEvents) :
                                                          i18nString(UIStrings.startRecordingEvents);
    this.recordButton.setTitle(buttonTooltip, 'background-service.toggle-recording');
  }

  private onEventReceived({
    data: serviceEvent,
  }: Common.EventTarget.EventTargetEvent<Protocol.BackgroundService.BackgroundServiceEvent>): void {
    if (!this.acceptEvent(serviceEvent)) {
      return;
    }
    this.addEvent(serviceEvent);
  }

  private onOriginChanged(): void {
    // No need to refresh the view if we are already showing all events.
    if (this.originCheckbox.checked()) {
      return;
    }
    this.refreshView();
  }

  private onStorageKeyChanged(): void {
    if (this.storageKeyCheckbox.checked()) {
      return;
    }
    this.refreshView();
  }

  private addEvent(serviceEvent: Protocol.BackgroundService.BackgroundServiceEvent): void {
    const data = this.createEventData(serviceEvent);
    const dataNode = new EventDataNode(data, serviceEvent.eventMetadata);
    this.dataGrid.rootNode().appendChild(dataNode);

    if (this.splitWidget.showMode() !== UI.SplitWidget.ShowMode.BOTH) {
      this.splitWidget.showBoth();
    }

    if (this.dataGrid.rootNode().children.length === 1) {
      this.saveButton.setEnabled(true);
      this.showPreview(this.selectedEventNode);
    }
  }

  private createDataGrid(): DataGrid.DataGrid.DataGridImpl<EventData> {
    const columns = ([
      {id: 'id', title: '#', weight: 1},
      {id: 'timestamp', title: i18nString(UIStrings.timestamp), weight: 7},
      {id: 'event-name', title: i18nString(UIStrings.event), weight: 8},
      {id: 'origin', title: i18nString(UIStrings.origin), weight: 8},
      {id: 'storage-key', title: i18nString(UIStrings.storageKey), weight: 8},
      {id: 'sw-scope', title: i18nString(UIStrings.swScope), weight: 4},
      {id: 'instance-id', title: i18nString(UIStrings.instanceId), weight: 8},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.backgroundServices),
      columns,
      refreshCallback: undefined,
      deleteCallback: undefined,
    });
    dataGrid.setStriped(true);

    dataGrid.addEventListener(
        DataGrid.DataGrid.Events.SELECTED_NODE, event => this.showPreview((event.data as EventDataNode)));

    return dataGrid;
  }

  /**
   * Creates the data object to pass to the DataGrid Node.
   */
  private createEventData(serviceEvent: Protocol.BackgroundService.BackgroundServiceEvent): EventData {
    let swScope = '';

    // Try to get the scope of the Service Worker registration to be more user-friendly.
    const registration = this.serviceWorkerManager ?
        this.serviceWorkerManager.registrations().get(serviceEvent.serviceWorkerRegistrationId) :
        undefined;
    if (registration) {
      swScope = registration.scopeURL.substr(registration.securityOrigin.length);
    }

    return {
      id: this.dataGrid.rootNode().children.length + 1,
      timestamp: UI.UIUtils.formatTimestamp(serviceEvent.timestamp * 1000, /* full= */ true),
      origin: serviceEvent.origin,
      'storage-key': serviceEvent.storageKey,
      'sw-scope': swScope,
      'event-name': serviceEvent.eventName,
      'instance-id': serviceEvent.instanceId,
    };
  }

  /**
   * Filtration function to know whether event should be shown or not.
   */
  private acceptEvent(event: Protocol.BackgroundService.BackgroundServiceEvent): boolean {
    if (event.service !== this.serviceName) {
      return false;
    }

    if (this.originCheckbox.checked() || this.storageKeyCheckbox.checked()) {
      return true;
    }

    // Trim the trailing '/'.
    const origin = event.origin.substr(0, event.origin.length - 1);
    const storageKey = event.storageKey;

    return this.securityOriginManager.securityOrigins().includes(origin) ||
        this.storageKeyManager.storageKeys().includes(storageKey);
  }

  private createLearnMoreLink(): Platform.DevToolsPath.UrlString {
    let url = 'https://developer.chrome.com/docs/devtools/javascript/background-services/?utm_source=devtools';

    switch (this.serviceName) {
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

    return url as Platform.DevToolsPath.UrlString;
  }

  private showPreview(dataNode: EventDataNode|null): void {
    if (this.selectedEventNode && this.selectedEventNode === dataNode) {
      return;
    }

    this.selectedEventNode = dataNode;

    if (this.preview) {
      this.preview.detach();
    }

    if (this.selectedEventNode) {
      this.preview = this.selectedEventNode.createPreview();
      this.preview.show(this.previewPanel.contentElement);
      return;
    }

    const emptyWidget = new UI.EmptyWidget.EmptyWidget('', '');
    if (this.dataGrid.rootNode().children.length) {
      emptyWidget.header = i18nString(UIStrings.noEventSelected);
      emptyWidget.text = i18nString(UIStrings.selectAnEventToViewMetadata);
    } else if (this.recordButton.isToggled()) {
      // Inform users that we are recording/waiting for events.
      const featureName = BackgroundServiceView.getUIString(this.serviceName).toLowerCase();
      emptyWidget.header = i18nString(UIStrings.recordingSActivity, {PH1: featureName});
      emptyWidget.text = i18nString(UIStrings.devtoolsWillRecordAllSActivity, {PH1: featureName});
    } else {
      const recordShortcuts =
          UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('background-service.toggle-recording')[0];
      emptyWidget.header = i18nString(UIStrings.noRecording);
      emptyWidget.text = i18nString(
          UIStrings.startRecordingToDebug,
          {PH1: i18nString(UIStrings.startRecordingEvents), PH2: recordShortcuts.title()});
      emptyWidget.appendLink(this.createLearnMoreLink());

      const button = UI.UIUtils.createTextButton(
          i18nString(UIStrings.startRecordingEvents), () => this.toggleRecording(),
          {jslogContext: 'start-recording', variant: Buttons.Button.Variant.TONAL});
      emptyWidget.contentElement.appendChild(button);
    }

    this.preview = emptyWidget;
    this.preview.show(this.previewPanel.contentElement);
  }

  /**
   * Saves all currently displayed events in a file (JSON format).
   */
  private async saveToFile(): Promise<void> {
    const fileName = `${this.serviceName}-${Platform.DateUtilities.toISO8601Compact(new Date())}.json` as
        Platform.DevToolsPath.RawPathString;
    const stream = new Bindings.FileUtils.FileOutputStream();

    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }

    const events = this.model.getEvents(this.serviceName).filter(event => this.acceptEvent(event));
    await stream.write(JSON.stringify(events, undefined, 2));
    void stream.close();
  }
}

export class EventDataNode extends DataGrid.DataGrid.DataGridNode<EventData> {
  private readonly eventMetadata: Protocol.BackgroundService.EventMetadata[];

  constructor(data: EventData, eventMetadata: Protocol.BackgroundService.EventMetadata[]) {
    super(data);

    this.eventMetadata = eventMetadata.sort((m1, m2) => Platform.StringUtilities.compare(m1.key, m2.key));
  }

  createPreview(): UI.Widget.VBox {
    const preview = new UI.Widget.VBox();
    preview.element.classList.add('background-service-metadata');
    preview.element.setAttribute('jslog', `${VisualLogging.section('metadata')}`);

    for (const entry of this.eventMetadata) {
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
      div.createChild('div', 'background-service-metadata-name background-service-empty-value').textContent =
          i18nString(UIStrings.noMetadataForThisEvent);
      preview.element.appendChild(div);
    }

    return preview;
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const view = context.flavor(BackgroundServiceView);
    switch (actionId) {
      case 'background-service.toggle-recording': {
        if (!view) {
          throw new Error('BackgroundServiceView instance is missing');
        }
        view.toggleRecording();
        return true;
      }
    }
    return false;
  }
}
export interface RecordingState {
  isRecording: boolean;
  serviceName: Protocol.BackgroundService.ServiceName;
}
export interface EventData {
  id: number;
  timestamp: string;
  origin: string;
  'storage-key': string;
  'sw-scope': string;
  'event-name': string;
  'instance-id': string;
}
