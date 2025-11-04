// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
// eslint-disable-next-line @devtools/es-modules-import
import emptyWidgetStyles from '../../ui/legacy/emptyWidget.css.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { Events } from './BackgroundServiceModel.js';
import backgroundServiceViewStyles from './backgroundServiceView.css.js';
const UIStrings = {
    /**
     * @description Text in Background Service View of the Application panel
     */
    backgroundFetch: 'Background fetch',
    /**
     * @description Text in Background Service View of the Application panel
     */
    backgroundSync: 'Background sync',
    /**
     * @description Text in Background Service View of the Application panel
     */
    pushMessaging: 'Push messaging',
    /**
     * @description Text in Background Service View of the Application panel
     */
    notifications: 'Notifications',
    /**
     * @description Text in Background Service View of the Application panel
     */
    paymentHandler: 'Payment handler',
    /**
     * @description Text in the Periodic Background Service View of the Application panel
     */
    periodicBackgroundSync: 'Periodic background sync',
    /**
     * @description Text to clear content
     */
    clear: 'Clear',
    /**
     * @description Tooltip text that appears when hovering over the largeicon download button in the Background Service View of the Application panel
     */
    saveEvents: 'Save events',
    /**
     * @description Text in Background Service View of the Application panel
     */
    showEventsFromOtherDomains: 'Show events from other domains',
    /**
     * @description Text of a checkbox to show events for other storage keys
     */
    showEventsForOtherStorageKeys: 'Show events from other storage partitions',
    /**
     * @description Title of an action under the Background Services category that can be invoked through the Command Menu
     */
    stopRecordingEvents: 'Stop recording events',
    /**
     * @description Title of an action under the Background Services category that can be invoked through the Command Menu
     */
    startRecordingEvents: 'Start recording events',
    /**
     * @description Text for timestamps of items
     */
    timestamp: 'Timestamp',
    /**
     * @description Text that refers to some events
     */
    event: 'Event',
    /**
     * @description Text for the origin of something
     */
    origin: 'Origin',
    /**
     * @description Text for the storage key of something
     */
    storageKey: 'Storage Key',
    /**
     * @description Text in Background Service View of the Application panel. The Scope is a URL associated with the Service Worker, which limits which pages/sites the Service Worker operates on.
     */
    swScope: 'Service Worker Scope',
    /**
     * @description Text in Background Service View of the Application panel
     */
    instanceId: 'Instance ID',
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    backgroundServices: 'Background services',
    /**
     * @description Text in Background Service View of the Application panel.
     *             An event here refers to a background service event that is an entry in a table.
     */
    noEventSelected: 'No event selected',
    /**
     * @description Text in Background Service View of the Application panel
     */
    selectAnEventToViewMetadata: 'Select an event to view its metadata',
    /**
     * @description Text in Background Service View of the Application panel
     * @example {Background Fetch} PH1
     */
    recordingSActivity: 'Recording {PH1} activity…',
    /**
     * @description Text in Background Service View of the Application panel
     */
    noRecording: 'No recording yet',
    /**
     * @description Inform users that DevTools are recording/waiting for events in the Periodic Background Sync tool of the Application panel
     * @example {Background Fetch} PH1
     */
    devtoolsWillRecordAllSActivity: 'DevTools will record all {PH1} activity for up to 3 days, even when closed.',
    /**
     * @description Text in Background Service View of the Application panel to instruct the user on how to start a recording for
     * background services.
     * @example {Start recording events} PH1
     * @example {Ctrl + E} PH2
     */
    startRecordingToDebug: 'Start to debug background services by using the "{PH1}" button or by pressing {PH2}.',
    /**
     * @description Text to show an item is empty
     */
    empty: 'empty',
    /**
     * @description Text in Background Service View of the Application panel
     */
    noMetadataForThisEvent: 'No metadata for this event',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/BackgroundServiceView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BackgroundServiceView extends UI.Widget.VBox {
    serviceName;
    model;
    serviceWorkerManager;
    securityOriginManager;
    storageKeyManager;
    recordAction;
    recordButton;
    originCheckbox;
    storageKeyCheckbox;
    saveButton;
    toolbar;
    splitWidget;
    dataGrid;
    previewPanel;
    selectedEventNode;
    preview;
    static getUIString(serviceName) {
        switch (serviceName) {
            case "backgroundFetch" /* Protocol.BackgroundService.ServiceName.BackgroundFetch */:
                return i18nString(UIStrings.backgroundFetch);
            case "backgroundSync" /* Protocol.BackgroundService.ServiceName.BackgroundSync */:
                return i18nString(UIStrings.backgroundSync);
            case "pushMessaging" /* Protocol.BackgroundService.ServiceName.PushMessaging */:
                return i18nString(UIStrings.pushMessaging);
            case "notifications" /* Protocol.BackgroundService.ServiceName.Notifications */:
                return i18nString(UIStrings.notifications);
            case "paymentHandler" /* Protocol.BackgroundService.ServiceName.PaymentHandler */:
                return i18nString(UIStrings.paymentHandler);
            case "periodicBackgroundSync" /* Protocol.BackgroundService.ServiceName.PeriodicBackgroundSync */:
                return i18nString(UIStrings.periodicBackgroundSync);
            default:
                return '';
        }
    }
    constructor(serviceName, model) {
        super({
            jslog: `${VisualLogging.pane().context(Platform.StringUtilities.toKebabCase(serviceName))}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(emptyWidgetStyles, backgroundServiceViewStyles);
        this.serviceName = serviceName;
        this.model = model;
        this.model.addEventListener(Events.RecordingStateChanged, this.onRecordingStateChanged, this);
        this.model.addEventListener(Events.BackgroundServiceEventReceived, this.onEventReceived, this);
        this.model.enable(this.serviceName);
        this.serviceWorkerManager = this.model.target().model(SDK.ServiceWorkerManager.ServiceWorkerManager);
        this.securityOriginManager = this.model.target().model(SDK.SecurityOriginManager.SecurityOriginManager);
        if (!this.securityOriginManager) {
            throw new Error('SecurityOriginManager instance is missing');
        }
        this.securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, () => this.onOriginChanged());
        this.storageKeyManager =
            this.model.target().model(SDK.StorageKeyManager.StorageKeyManager);
        if (!this.storageKeyManager) {
            throw new Error('StorageKeyManager instance is missing');
        }
        this.storageKeyManager.addEventListener("MainStorageKeyChanged" /* SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED */, () => this.onStorageKeyChanged());
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
        this.previewPanel.element.setAttribute('jslog', `${VisualLogging.pane('preview').track({ resize: true })}`);
        this.selectedEventNode = null;
        this.preview = null;
        this.splitWidget.setMainWidget(this.dataGrid.asWidget());
        this.splitWidget.setSidebarWidget(this.previewPanel);
        this.splitWidget.hideMain();
        this.showPreview(null);
    }
    getDataGrid() {
        return this.dataGrid;
    }
    /**
     * Creates the toolbar UI element.
     */
    async setupToolbar() {
        this.toolbar.wrappable = true;
        this.recordButton = UI.Toolbar.Toolbar.createActionButton(this.recordAction);
        this.recordButton.toggleOnClick(false);
        this.toolbar.appendToolbarItem(this.recordButton);
        const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clear), 'clear', undefined, 'background-service.clear');
        clearButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, () => this.clearEvents());
        this.toolbar.appendToolbarItem(clearButton);
        this.toolbar.appendSeparator();
        this.saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.saveEvents), 'download', undefined, 'background-service.save-events');
        this.saveButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, _event => {
            void this.saveToFile();
        });
        this.saveButton.setEnabled(false);
        this.toolbar.appendToolbarItem(this.saveButton);
        this.toolbar.appendSeparator();
        this.originCheckbox = new UI.Toolbar.ToolbarCheckbox(i18nString(UIStrings.showEventsFromOtherDomains), i18nString(UIStrings.showEventsFromOtherDomains), () => this.refreshView(), 'show-events-from-other-domains');
        this.toolbar.appendToolbarItem(this.originCheckbox);
        this.storageKeyCheckbox = new UI.Toolbar.ToolbarCheckbox(i18nString(UIStrings.showEventsForOtherStorageKeys), i18nString(UIStrings.showEventsForOtherStorageKeys), () => this.refreshView(), 'show-events-from-other-partitions');
        this.toolbar.appendToolbarItem(this.storageKeyCheckbox);
    }
    /**
     * Displays all available events in the grid.
     */
    refreshView() {
        this.clearView();
        const events = this.model.getEvents(this.serviceName).filter(event => this.acceptEvent(event));
        for (const event of events) {
            this.addEvent(event);
        }
    }
    /**
     * Clears the grid and panel.
     */
    clearView() {
        this.selectedEventNode = null;
        this.dataGrid.rootNode().removeChildren();
        this.splitWidget.hideMain();
        this.saveButton.setEnabled(false);
        this.showPreview(null);
    }
    /**
     * Called when the `Toggle Record` button is clicked.
     */
    toggleRecording() {
        const isRecording = !this.recordButton.isToggled();
        this.model.setRecording(isRecording, this.serviceName);
        const featureName = BackgroundServiceView.getUIString(this.serviceName).toLowerCase();
        if (isRecording) {
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.recordingSActivity, { PH1: featureName }) + ' ' +
                i18nString(UIStrings.devtoolsWillRecordAllSActivity, { PH1: featureName }));
            this.preview?.focus();
        }
    }
    /**
     * Called when the `Clear` button is clicked.
     */
    clearEvents() {
        this.model.clearEvents(this.serviceName);
        this.clearView();
    }
    onRecordingStateChanged({ data: state }) {
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
    updateRecordButtonTooltip() {
        const buttonTooltip = this.recordButton.isToggled() ? i18nString(UIStrings.stopRecordingEvents) :
            i18nString(UIStrings.startRecordingEvents);
        this.recordButton.setTitle(buttonTooltip, 'background-service.toggle-recording');
    }
    onEventReceived({ data: serviceEvent, }) {
        if (!this.acceptEvent(serviceEvent)) {
            return;
        }
        this.addEvent(serviceEvent);
    }
    onOriginChanged() {
        // No need to refresh the view if we are already showing all events.
        if (this.originCheckbox.checked()) {
            return;
        }
        this.refreshView();
    }
    onStorageKeyChanged() {
        if (this.storageKeyCheckbox.checked()) {
            return;
        }
        this.refreshView();
    }
    addEvent(serviceEvent) {
        const data = this.createEventData(serviceEvent);
        const dataNode = new EventDataNode(data, serviceEvent.eventMetadata);
        this.dataGrid.rootNode().appendChild(dataNode);
        if (this.splitWidget.showMode() !== "Both" /* UI.SplitWidget.ShowMode.BOTH */) {
            this.splitWidget.showBoth();
        }
        if (this.dataGrid.rootNode().children.length === 1) {
            this.saveButton.setEnabled(true);
            this.showPreview(this.selectedEventNode);
        }
    }
    createDataGrid() {
        const columns = [
            { id: 'id', title: '#', weight: 1 },
            { id: 'timestamp', title: i18nString(UIStrings.timestamp), weight: 7 },
            { id: 'event-name', title: i18nString(UIStrings.event), weight: 8 },
            { id: 'origin', title: i18nString(UIStrings.origin), weight: 8 },
            { id: 'storage-key', title: i18nString(UIStrings.storageKey), weight: 8 },
            { id: 'sw-scope', title: i18nString(UIStrings.swScope), weight: 4 },
            { id: 'instance-id', title: i18nString(UIStrings.instanceId), weight: 8 },
        ];
        const dataGrid = new DataGrid.DataGrid.DataGridImpl({
            displayName: i18nString(UIStrings.backgroundServices),
            columns,
            refreshCallback: undefined,
            deleteCallback: undefined,
        });
        dataGrid.setStriped(true);
        dataGrid.addEventListener("SelectedNode" /* DataGrid.DataGrid.Events.SELECTED_NODE */, event => this.showPreview(event.data));
        return dataGrid;
    }
    /**
     * Creates the data object to pass to the DataGrid Node.
     */
    createEventData(serviceEvent) {
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
    acceptEvent(event) {
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
    createLearnMoreLink() {
        let url = 'https://developer.chrome.com/docs/devtools/javascript/background-services/';
        switch (this.serviceName) {
            case "backgroundFetch" /* Protocol.BackgroundService.ServiceName.BackgroundFetch */:
                url += '#fetch';
                break;
            case "backgroundSync" /* Protocol.BackgroundService.ServiceName.BackgroundSync */:
                url += '#sync';
                break;
            case "pushMessaging" /* Protocol.BackgroundService.ServiceName.PushMessaging */:
                url += '#push';
                break;
            case "notifications" /* Protocol.BackgroundService.ServiceName.Notifications */:
                url += '#notifications';
                break;
            default:
                break;
        }
        return url;
    }
    showPreview(dataNode) {
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
        let emptyWidget;
        if (this.dataGrid.rootNode().children.length) {
            emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noEventSelected), i18nString(UIStrings.selectAnEventToViewMetadata));
        }
        else if (this.recordButton.isToggled()) {
            // Inform users that we are recording/waiting for events.
            const featureName = BackgroundServiceView.getUIString(this.serviceName).toLowerCase();
            emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.recordingSActivity, { PH1: featureName }), i18nString(UIStrings.devtoolsWillRecordAllSActivity, { PH1: featureName }));
        }
        else {
            const recordShortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('background-service.toggle-recording')[0];
            emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noRecording), i18nString(UIStrings.startRecordingToDebug, {
                PH1: i18nString(UIStrings.startRecordingEvents),
                PH2: recordShortcuts.title(),
            }));
            emptyWidget.link = this.createLearnMoreLink();
            const button = UI.UIUtils.createTextButton(i18nString(UIStrings.startRecordingEvents), () => this.toggleRecording(), { jslogContext: 'start-recording', variant: "tonal" /* Buttons.Button.Variant.TONAL */ });
            emptyWidget.contentElement.appendChild(button);
        }
        emptyWidget.setDefaultFocusedElement(emptyWidget.contentElement);
        this.preview = emptyWidget;
        this.preview.show(this.previewPanel.contentElement);
    }
    /**
     * Saves all currently displayed events in a file (JSON format).
     */
    async saveToFile() {
        const fileName = `${this.serviceName}-${Platform.DateUtilities.toISO8601Compact(new Date())}.json`;
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
export class EventDataNode extends DataGrid.DataGrid.DataGridNode {
    eventMetadata;
    constructor(data, eventMetadata) {
        super(data);
        this.eventMetadata = eventMetadata.sort((m1, m2) => Platform.StringUtilities.compare(m1.key, m2.key));
    }
    createPreview() {
        const preview = new UI.Widget.VBox();
        preview.element.classList.add('background-service-metadata');
        preview.element.setAttribute('jslog', `${VisualLogging.section('metadata')}`);
        for (const entry of this.eventMetadata) {
            const div = document.createElement('div');
            div.classList.add('background-service-metadata-entry');
            div.createChild('div', 'background-service-metadata-name').textContent = entry.key + ': ';
            if (entry.value) {
                div.createChild('div', 'background-service-metadata-value source-code').textContent = entry.value;
            }
            else {
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
export class ActionDelegate {
    handleAction(context, actionId) {
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
//# sourceMappingURL=BackgroundServiceView.js.map