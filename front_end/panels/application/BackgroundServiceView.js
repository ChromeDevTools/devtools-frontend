// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Input from '../../ui/components/input/input.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
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
export const DEFAULT_VIEW = (input, output, target) => {
    const recordShortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('background-service.toggle-recording')[0];
    const startRecordingText = i18nString(UIStrings.startRecordingToDebug, {
        PH1: i18nString(UIStrings.startRecordingEvents),
        PH2: recordShortcuts ? recordShortcuts.title() : '',
    });
    const featureName = BackgroundServiceView.getUIString(input.serviceName).toLowerCase();
    // Toolbar state
    const buttonTooltip = input.isRecording ? i18nString(UIStrings.stopRecordingEvents) : i18nString(UIStrings.startRecordingEvents);
    const dataGridTemplate = html `
    <table>
      <tr>
        <th id="id" weight="1">${'#'}</th>
        <th id="timestamp" weight="7">${i18nString(UIStrings.timestamp)}</th>
        <th id="event-name" weight="8">${i18nString(UIStrings.event)}</th>
        <th id="origin" weight="8">${i18nString(UIStrings.origin)}</th>
        <th id="storage-key" weight="8">${i18nString(UIStrings.storageKey)}</th>
        <th id="sw-scope" weight="4">${i18nString(UIStrings.swScope)}</th>
        <th id="instance-id" weight="8">${i18nString(UIStrings.instanceId)}</th>
      </tr>
      ${input.events.map(event => html `
        <tr @select=${() => input.onSelectEvent(event)}
            class=${event === input.selectedEvent ? 'selected' : ''}
            ?selected=${event === input.selectedEvent}>
          <td>${event.id}</td>
          <td>${event.timestamp}</td>
          <td>${event['event-name']}</td>
          <td>${event.origin}</td>
          <td>${event['storage-key']}</td>
          <td>${event['sw-scope']}</td>
          <td>${event['instance-id']}</td>
        </tr>
      `)}
    </table>
  `;
    // clang-format off
    render(html `
    <style>${backgroundServiceViewStyles}</style>
    <style>${Input.checkboxStyles}</style>
    <div class="background-service-view">
      <devtools-toolbar class="background-service-toolbar" jslog=${VisualLogging.toolbar()}>
        <devtools-button title=${buttonTooltip}
            class="toolbar-button"
            .iconName=${'record-start'}
            .toggledIconName=${'record-stop'}
            .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
            .toggled=${input.isRecording}
            @click=${input.toggleRecording}
            .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
            .jslogContext=${'background-service.toggle-recording'}></devtools-button>
        <devtools-button title=${i18nString(UIStrings.clear)} @click=${input.onClear}
            class="toolbar-button"
            .iconName=${'clear'} .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
            .jslogContext=${'background-service.clear'}></devtools-button>
        <div class="toolbar-divider"></div>
        <devtools-button title=${i18nString(UIStrings.saveEvents)}
            class="toolbar-button"
            @click=${input.onSave}
            .disabled=${input.events.length === 0}
            .iconName=${'download'} .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
            .jslogContext=${'background-service.save-events'}></devtools-button>
        <div class="toolbar-divider"></div>
        <label title=${i18nString(UIStrings.showEventsFromOtherDomains)} class="checkbox-label"
            jslog=${VisualLogging.toggle('show-events-from-other-domains').track({ click: true })}
        >
          <input type="checkbox" .checked=${input.isOriginCheckboxChecked} @change=${input.onOriginCheckboxChanged}>
          ${i18nString(UIStrings.showEventsFromOtherDomains)}
        </label>
        <label title=${i18nString(UIStrings.showEventsForOtherStorageKeys)} class="checkbox-label"
            jslog=${VisualLogging.toggle('show-events-from-other-partitions').track({ click: true })}
        >
          <input type="checkbox" .checked=${input.isStorageKeyCheckboxChecked}
              @change=${input.onStorageKeyCheckboxChanged}
          >
          ${i18nString(UIStrings.showEventsForOtherStorageKeys)}
        </label>
      </devtools-toolbar>
      ${input.events.length === 0 ? (input.isRecording ? html `
        ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.recordingSActivity, { PH1: featureName }),
        text: i18nString(UIStrings.devtoolsWillRecordAllSActivity, { PH1: featureName }),
    })}
      ` : html `
        <devtools-widget ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noRecording),
        text: startRecordingText,
        link: input.createLearnMoreLink(),
    })}>
          <devtools-button class="start-recording-button" .variant=${"tonal" /* Buttons.Button.Variant.TONAL */} jslogContext=${'start-recording'} @click=${input.toggleRecording}>
            ${i18nString(UIStrings.startRecordingEvents)}
          </devtools-button>
        </devtools-widget>
      `) : html `
        <devtools-split-view sidebar-position="second" direction="row">
          <div slot="main" class="data-grid-container">
            <devtools-data-grid class="data-grid" striped
                name=${i18nString(UIStrings.backgroundServices)}
                style="outline: none;"
            >
              ${dataGridTemplate}
            </devtools-data-grid>
          </div>
          <div slot="sidebar" class="preview-panel empty-state-container"
              jslog=${VisualLogging.pane('preview').track({ resize: true })}
          >
            ${input.selectedEvent ? html `
              <div class="background-service-metadata" jslog=${VisualLogging.section('metadata')}>
                ${input.selectedEvent.eventMetadata.length > 0 ? input.selectedEvent.eventMetadata.map(entry => html `
                  <div class="background-service-metadata-entry">
                    <div class="background-service-metadata-name">${entry.key}: </div>${entry.value ?
        html `<div class="background-service-metadata-value source-code">${entry.value}</div>` :
        html `<div class="background-service-metadata-value background-service-empty-value">${i18nString(UIStrings.empty)}</div>`}
                  </div>
                `) : html `
                  <div class="background-service-metadata-entry">
                    <div class="background-service-metadata-name background-service-empty-value">${i18nString(UIStrings.noMetadataForThisEvent)}</div>
                  </div>
                `}
              </div>
            ` : html `
              ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noEventSelected),
        text: i18nString(UIStrings.selectAnEventToViewMetadata),
    })}
            `}
          </div>
        </devtools-split-view>
      `}
    </div>
  `, target, {
        container: {
            attributes: {
                jslog: `${VisualLogging.pane().context(Platform.StringUtilities.toKebabCase(input.serviceName))}`,
            },
        },
    });
    // clang-format on
};
export class BackgroundServiceView extends UI.Widget.Widget {
    #serviceName;
    #model;
    #serviceWorkerManager;
    #securityOriginManager;
    #storageKeyManager;
    #isRecording = false;
    #selectedEvent = null;
    #events = [];
    #isOriginCheckboxChecked = false;
    #isStorageKeyCheckboxChecked = false;
    #view;
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
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    get serviceName() {
        return this.#serviceName;
    }
    set serviceName(serviceName) {
        if (this.#serviceName === serviceName) {
            return;
        }
        this.#serviceName = serviceName;
        if (this.#model) {
            this.#model.enable(this.#serviceName);
        }
        this.requestUpdate();
    }
    get model() {
        return this.#model;
    }
    set model(model) {
        if (this.#model === model) {
            return;
        }
        if (this.#model) {
            this.#model.removeEventListener(Events.RecordingStateChanged, this.onRecordingStateChanged, this);
            this.#model.removeEventListener(Events.BackgroundServiceEventReceived, this.onEventReceived, this);
        }
        this.#model = model;
        this.#model.addEventListener(Events.RecordingStateChanged, this.onRecordingStateChanged, this);
        this.#model.addEventListener(Events.BackgroundServiceEventReceived, this.onEventReceived, this);
        if (this.#serviceName) {
            this.#model.enable(this.#serviceName);
        }
        this.#serviceWorkerManager = this.#model.target().model(SDK.ServiceWorkerManager.ServiceWorkerManager) ?? undefined;
        this.#securityOriginManager =
            this.#model.target().model(SDK.SecurityOriginManager.SecurityOriginManager) ?? undefined;
        if (this.#securityOriginManager) {
            this.#securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, () => this.onOriginChanged());
        }
        this.#storageKeyManager = this.#model.target().model(SDK.StorageKeyManager.StorageKeyManager) ?? undefined;
        if (this.#storageKeyManager) {
            this.#storageKeyManager.addEventListener("MainStorageKeyChanged" /* SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED */, () => this.onStorageKeyChanged());
        }
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    /**
     * Displays all available events in the grid.
     */
    refreshView() {
        this.clearView();
        if (!this.#model || !this.#serviceName) {
            return;
        }
        const events = this.#model.getEvents(this.#serviceName).filter(event => this.acceptEvent(event));
        for (const event of events) {
            this.addEvent(event);
        }
    }
    /**
     * Clears the grid and panel.
     */
    clearView() {
        this.#selectedEvent = null;
        this.#events = [];
        this.requestUpdate();
    }
    /**
     * Called when the `Toggle Record` button is clicked.
     */
    toggleRecording() {
        if (!this.#model || !this.#serviceName) {
            return;
        }
        const isRecording = !this.#isRecording;
        this.#model.setRecording(isRecording, this.#serviceName);
        const featureName = BackgroundServiceView.getUIString(this.#serviceName).toLowerCase();
        if (isRecording) {
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.recordingSActivity, { PH1: featureName }) + ' ' +
                i18nString(UIStrings.devtoolsWillRecordAllSActivity, { PH1: featureName }));
        }
    }
    /**
     * Called when the `Clear` button is clicked.
     */
    clearEvents() {
        if (this.#model && this.#serviceName) {
            this.#model.clearEvents(this.#serviceName);
        }
        this.clearView();
    }
    onRecordingStateChanged({ data: state }) {
        if (state.serviceName !== this.#serviceName) {
            return;
        }
        if (state.isRecording === this.#isRecording) {
            return;
        }
        this.#isRecording = state.isRecording;
        this.requestUpdate();
    }
    onEventReceived({ data: serviceEvent, }) {
        if (!this.acceptEvent(serviceEvent)) {
            return;
        }
        this.addEvent(serviceEvent);
    }
    onOriginChanged() {
        // No need to refresh the view if we are already showing all events.
        if (this.#isOriginCheckboxChecked) {
            return;
        }
        this.refreshView();
    }
    onStorageKeyChanged() {
        if (this.#isStorageKeyCheckboxChecked) {
            return;
        }
        this.refreshView();
    }
    addEvent(serviceEvent) {
        const data = this.createEventData(serviceEvent);
        this.#events.push(data);
        this.requestUpdate();
    }
    /**
     * Creates the data object to pass to the DataGrid Node.
     */
    createEventData(serviceEvent) {
        let swScope = '';
        // Try to get the scope of the Service Worker registration to be more user-friendly.
        const registration = this.#serviceWorkerManager ?
            this.#serviceWorkerManager.registrations().get(serviceEvent.serviceWorkerRegistrationId) :
            undefined;
        if (registration) {
            swScope = registration.scopeURL.substr(registration.securityOrigin.length);
        }
        return {
            id: this.#events.length + 1,
            timestamp: UI.UIUtils.formatTimestamp(serviceEvent.timestamp * 1000, /* full= */ true),
            origin: serviceEvent.origin,
            'storage-key': serviceEvent.storageKey,
            'sw-scope': swScope,
            'event-name': serviceEvent.eventName,
            'instance-id': serviceEvent.instanceId,
            eventMetadata: serviceEvent.eventMetadata.sort((m1, m2) => Platform.StringUtilities.compare(m1.key, m2.key)),
        };
    }
    /**
     * Filtration function to know whether event should be shown or not.
     */
    acceptEvent(event) {
        if (event.service !== this.#serviceName) {
            return false;
        }
        if (this.#isOriginCheckboxChecked || this.#isStorageKeyCheckboxChecked) {
            return true;
        }
        // Trim the trailing '/'.
        const origin = event.origin.substr(0, event.origin.length - 1);
        const storageKey = event.storageKey;
        return Boolean(this.#securityOriginManager?.securityOrigins().includes(origin) ||
            this.#storageKeyManager?.storageKeys().includes(storageKey));
    }
    createLearnMoreLink() {
        let url = 'https://developer.chrome.com/docs/devtools/javascript/background-services/';
        switch (this.#serviceName) {
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
    performUpdate() {
        if (!this.#serviceName || !this.#model) {
            return;
        }
        const viewInput = {
            serviceName: this.#serviceName,
            isRecording: this.#isRecording,
            selectedEvent: this.#selectedEvent,
            events: this.#events,
            onClear: () => this.clearEvents(),
            onSave: () => void this.saveToFile(),
            onSelectEvent: (event) => {
                this.#selectedEvent = event;
                this.requestUpdate();
            },
            onOriginCheckboxChanged: (event) => {
                const checkbox = event.target;
                this.#isOriginCheckboxChecked = checkbox.checked;
                this.refreshView();
            },
            onStorageKeyCheckboxChanged: (event) => {
                const checkbox = event.target;
                this.#isStorageKeyCheckboxChecked = checkbox.checked;
                this.refreshView();
            },
            isOriginCheckboxChecked: this.#isOriginCheckboxChecked,
            isStorageKeyCheckboxChecked: this.#isStorageKeyCheckboxChecked,
            toggleRecording: () => this.toggleRecording(),
            createLearnMoreLink: () => this.createLearnMoreLink(),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    /**
     * Saves all currently displayed events in a file (JSON format).
     */
    async saveToFile() {
        if (!this.#serviceName || !this.#model) {
            return;
        }
        const fileName = `${this.#serviceName}-${Platform.DateUtilities.toISO8601Compact(new Date())}.json`;
        const stream = new Bindings.FileUtils.FileOutputStream(Workspace.FileManager.FileManager.instance());
        const accepted = await stream.open(fileName);
        if (!accepted) {
            return;
        }
        const events = this.#model.getEvents(this.#serviceName).filter(event => this.acceptEvent(event));
        await stream.write(JSON.stringify(events, undefined, 2));
        void stream.close();
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