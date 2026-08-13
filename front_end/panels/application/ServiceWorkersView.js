// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/report_view/report_view.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as ApplicationComponents from './components/components.js';
import serviceWorkersViewStyles from './serviceWorkersView.css.js';
import { ServiceWorkerUpdateCycleView } from './ServiceWorkerUpdateCycleView.js';
const UIStrings = {
    /**
     * @description Text for linking to other Service Worker registrations
     */
    serviceWorkersFromOtherOrigins: 'Service workers from other origins',
    /**
     * @description Title of update on reload setting in service workers view of the application panel
     */
    updateOnReload: 'Update on reload',
    /**
     * @description Tooltip text that appears on the setting when hovering over it in Service Workers View of the Application panel
     */
    onPageReloadForceTheService: 'On page reload, force the `service worker` to update, and activate it',
    /**
     * @description Title of bypass service worker setting in service workers view of the application panel
     */
    bypassForNetwork: 'Bypass for network',
    /**
     * @description Tooltip text that appears on the setting when hovering over it in Service Workers View of the Application panel
     */
    bypassTheServiceWorkerAndLoad: 'Bypass the `service worker` and load resources from the network',
    /**
     * @description Screen reader title for a section of the Service Workers view of the Application panel
     * @example {https://example.com} PH1
     */
    serviceWorkerForS: '`Service worker` for {PH1}',
    /**
     * @description Text in Service Workers View of the Application panel
     */
    testPushMessageFromDevtools: 'Test push message from DevTools.',
    /**
     * @description Button label for service worker network requests
     */
    networkRequests: 'Network requests',
    /**
     * @description Label for a button in the Service Workers View of the Application panel.
     * Imperative noun. Clicking the button will refresh the list of service worker registrations.
     */
    update: 'Update',
    /**
     * @description Text in Service Workers View of the Application panel
     */
    unregisterServiceWorker: 'Unregister service worker',
    /**
     * @description Text in Service Workers View of the Application panel
     */
    unregister: 'Unregister',
    /**
     * @description Text for the source of something
     */
    source: 'Source',
    /**
     * @description Text for the status of something
     */
    status: 'Status',
    /**
     * @description Text in Service Workers View of the Application panel
     */
    clients: 'Clients',
    /**
     * @description Text in Service Workers View of the Application panel. Label for a section of the
     * tool which allows the developer to send a test push message to the service worker.
     */
    pushString: 'Push',
    /**
     * @description Text in Service Workers View of the Application panel. Placeholder text for where
     * the user can type in the data they want to push to the service worker i.e. the 'push data'. Noun
     * phrase.
     */
    pushData: 'Push data',
    /**
     * @description Text in Service Workers View of the Application panel
     */
    syncString: 'Sync',
    /**
     * @description Placeholder text for the input box where a user is asked for a test tag to sync. This is used as a compound noun, not as a verb.
     */
    syncTag: 'Sync tag',
    /**
     * @description Text for button in Service Workers View of the Application panel that dispatches a periodicsync event
     */
    periodicSync: 'Periodic sync',
    /**
     * @description Default tag for a periodicsync event in Service Workers View of the Application panel
     */
    periodicSyncTag: 'Periodic sync tag',
    /**
     * @description Aria accessible name in Service Workers View of the Application panel
     * @example {3} PH1
     */
    sRegistrationErrors: '{PH1} registration errors',
    /**
     * @description Text in Service Workers View of the Application panel. The Date/time that a service
     * worker version update was received by the webpage.
     * @example {7/3/2019, 3:38:37 PM} PH1
     */
    receivedS: 'Received {PH1}',
    /**
     **@description Text in Service Workers View of the Application panel.
     */
    routers: 'Routers',
    /**
     * @description Text in Service Workers View of the Application panel
     * @example {example.com} PH1
     */
    sDeleted: '{PH1} - deleted',
    /**
     * @description Text in Service Workers View of the Application panel
     * @example {1} PH1
     * @example {stopped} PH2
     */
    sActivatedAndIsS: '#{PH1} activated and is {PH2}',
    /**
     * @description Text in Service Workers View of the Application panel
     */
    stopString: 'Stop',
    /**
     * @description Text in Service Workers View of the Application panel
     */
    startString: 'Start',
    /**
     * @description Text in Service Workers View of the Application panel. Service workers have
     * different versions, which are labelled with numbers e.g. version #2. This text indicates that a
     * particular version is now redundant (it was replaced by a newer version). # means 'number' here.
     * @example {2} PH1
     */
    sIsRedundant: '#{PH1} is redundant',
    /**
     * @description Text in Service Workers View of the Application panel
     * @example {2} PH1
     */
    sWaitingToActivate: '#{PH1} waiting to activate',
    /**
     * @description Text in Service Workers View of the Application panel
     * @example {2} PH1
     */
    sTryingToInstall: '#{PH1} trying to install',
    /**
     * @description Text in Service Workers Update Timeline. Update is a noun.
     */
    updateCycle: 'Update Cycle',
    /**
     * @description Text of a DOM element in Service Workers View of the Application panel
     * @example {example.com} PH1
     */
    workerS: 'Worker: {PH1}',
    /**
     * @description Link text in Service Workers View of the Application panel. When the link is clicked,
     * the focus is moved to the service worker's client page.
     */
    focus: 'focus',
    /**
     * @description Link to view all the Service Workers that have been registered.
     */
    seeAllRegistrations: 'See all registrations',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { until } = Directives;
const { widget } = UI.Widget;
const { bindToSetting } = UI.UIUtils;
function renderToolbar() {
    const updateOnReloadSetting = Common.Settings.Settings.instance().createSetting('service-worker-update-on-reload', false);
    const bypassServiceWorkerSetting = Common.Settings.Settings.instance().createSetting('bypass-service-worker', false);
    // clang-format off
    return html `<devtools-toolbar class="service-worker-toolbar">
    ${MobileThrottling.ThrottlingManager.throttlingManager().createOfflineToolbarCheckbox().element}
    <devtools-checkbox title=${i18nString(UIStrings.onPageReloadForceTheService)}
                       ${bindToSetting(updateOnReloadSetting)}>
      ${i18nString(UIStrings.updateOnReload)}
    </devtools-checkbox>
    <devtools-checkbox title=${i18nString(UIStrings.bypassTheServiceWorkerAndLoad)}
                       ${bindToSetting(bypassServiceWorkerSetting)}>
      ${i18nString(UIStrings.bypassForNetwork)}
     </devtools-checkbox>
  </devtools-toolbar>`;
    // clang-format on
}
function renderOthersOriginView() {
    // clang-format off
    return html `<div class="service-workers-other-origin"
                   jslog=${VisualLogging.section('other-origin')}>
    <devtools-report>
      <devtools-report-section-header>
         ${i18nString(UIStrings.serviceWorkersFromOtherOrigins)}
      </devtools-report-section-header>
      <div class="service-worker-section">
         <devtools-link href="chrome://serviceworker-internals"
                        jslogcontext="view-all"
                        .allowPrivileged=${true}>
           ${i18nString(UIStrings.seeAllRegistrations)}
         </devtools-link>
      </div>
    </devtools-report>
  </div>`;
    // clang-format on
}
function getTimeStamp(registration) {
    const versions = registration.versionsByMode();
    let timestamp = 0;
    const active = versions.get("active" /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE */);
    const installing = versions.get("installing" /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING */);
    const waiting = versions.get("waiting" /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.WAITING */);
    const redundant = versions.get("redundant" /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.REDUNDANT */);
    if (active) {
        timestamp = active.scriptResponseTime;
    }
    else if (waiting) {
        timestamp = waiting.scriptResponseTime;
    }
    else if (installing) {
        timestamp = installing.scriptResponseTime;
    }
    else if (redundant) {
        timestamp = redundant.scriptResponseTime;
    }
    return timestamp || 0;
}
function renderOriginReport(input) {
    if (!input.canManageServiceWorkers) {
        return nothing;
    }
    const sortedSections = [...input.sections];
    sortedSections.sort((a, b) => {
        const aTimestamp = getTimeStamp(a.registration);
        const bTimestamp = getTimeStamp(b.registration);
        return bTimestamp - aTimestamp;
    });
    // clang-format off
    return html `<div class="service-workers-this-origin" jslog=${VisualLogging.section('this-origin')}>
    <devtools-report .data=${{ reportTitle: i18n.i18n.lockedString('Service workers') }}>
      <div class="service-worker-toolbar" slot="toolbar">${renderToolbar()}</div>
      ${sortedSections.map(section => html `<devtools-widget class="service-worker-section-container" ${widget(Section, { section })}></devtools-widget>`)}
    </devtools-report>
  </div>`;
    // clang-format on
}
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <!-- This Origin Report -->
    ${renderOriginReport(input)}
    ${renderOthersOriginView()}`, target, {
        container: {
            classes: [
                'service-worker-list',
                (input.sections.length > 0 ? 'service-worker-has-current' : 'service-worker-list-empty'),
            ],
        },
    });
    // clang-format on
};
let throttleDisabledForDebugging = false;
export const setThrottleDisabledForDebugging = (enable) => {
    throttleDisabledForDebugging = enable;
};
export class ServiceWorkersView extends UI.Widget.VBox {
    sections;
    manager;
    securityOriginManager;
    eventListeners;
    #output = undefined;
    #view;
    constructor(view = DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.pane('service-workers')}`,
            useShadowDom: true,
        });
        this.#view = view;
        this.registerRequiredCSS(serviceWorkersViewStyles);
        this.sections = new Map();
        this.manager = null;
        this.securityOriginManager = null;
        this.eventListeners = new Map();
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.ServiceWorkerManager.ServiceWorkerManager, this);
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    async performUpdate() {
        if (this.manager) {
            for (const registration of this.manager.registrations().values()) {
                const isCurrent = this.isOriginCurrent(registration.securityOrigin);
                if (isCurrent && !this.sections.has(registration)) {
                    this.sections.set(registration, { manager: this.manager, registration });
                }
                else if (!isCurrent && this.sections.has(registration)) {
                    this.sections.delete(registration);
                }
            }
        }
        const input = {
            canManageServiceWorkers: this.manager !== null,
            sections: Array.from(this.sections.values()).map(data => ({ ...data })),
        };
        this.#view(input, this.#output, this.contentElement);
    }
    modelAdded(serviceWorkerManager) {
        if (serviceWorkerManager.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
            return;
        }
        this.manager = serviceWorkerManager;
        this.securityOriginManager =
            serviceWorkerManager.target().model(SDK.SecurityOriginManager.SecurityOriginManager);
        for (const registration of this.manager.registrations().values()) {
            this.updateRegistration(registration);
        }
        this.eventListeners.set(serviceWorkerManager, [
            this.manager.addEventListener("RegistrationUpdated" /* SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED */, this.registrationUpdated, this),
            this.manager.addEventListener("RegistrationDeleted" /* SDK.ServiceWorkerManager.Events.REGISTRATION_DELETED */, this.registrationDeleted, this),
            this.securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded, this.requestUpdate, this),
            this.securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved, this.requestUpdate, this),
        ]);
    }
    modelRemoved(serviceWorkerManager) {
        if (!this.manager || this.manager !== serviceWorkerManager) {
            return;
        }
        Common.EventTarget.removeEventListeners(this.eventListeners.get(serviceWorkerManager) || []);
        this.eventListeners.delete(serviceWorkerManager);
        this.manager = null;
        this.securityOriginManager = null;
    }
    registrationUpdated(event) {
        this.updateRegistration(event.data);
        this.gcRegistrations();
    }
    gcRegistrations() {
        if (!this.manager || !this.securityOriginManager) {
            return;
        }
        let hasNonDeletedRegistrations = false;
        const securityOrigins = new Set(this.securityOriginManager.securityOrigins());
        for (const registration of this.manager.registrations().values()) {
            if (!securityOrigins.has(registration.securityOrigin) && !this.isRegistrationVisible(registration)) {
                continue;
            }
            if (!registration.canBeRemoved()) {
                hasNonDeletedRegistrations = true;
                break;
            }
        }
        if (!hasNonDeletedRegistrations) {
            return;
        }
        for (const registration of this.manager.registrations().values()) {
            const visible = securityOrigins.has(registration.securityOrigin) || this.isRegistrationVisible(registration);
            if (!visible && registration.canBeRemoved()) {
                this.removeRegistrationFromList(registration);
            }
        }
    }
    isOriginCurrent(origin) {
        if (this.securityOriginManager &&
            (this.securityOriginManager.securityOrigins().includes(origin) ||
                this.securityOriginManager.unreachableMainSecurityOrigin() === origin)) {
            return true;
        }
        return false;
    }
    updateRegistration(registration, skipUpdate) {
        if (!this.manager) {
            return;
        }
        let sectionData = this.sections.get(registration);
        if (!sectionData) {
            if (!this.isOriginCurrent(registration.securityOrigin)) {
                return;
            }
            sectionData = { manager: this.manager, registration };
            this.sections.set(registration, sectionData);
        }
        if (skipUpdate) {
            return;
        }
        this.requestUpdate();
    }
    registrationDeleted(event) {
        this.removeRegistrationFromList(event.data);
    }
    removeRegistrationFromList(registration, skipVisibilityUpdate = false) {
        this.sections.delete(registration);
        if (!skipVisibilityUpdate) {
            this.requestUpdate();
        }
    }
    isRegistrationVisible(registration) {
        if (!registration.scopeURL) {
            return true;
        }
        return false;
    }
}
function renderHeaderButtons(input) {
    // clang-format off
    return html `
    <devtools-button .data=${{
        variant: "text" /* Buttons.Button.Variant.TEXT */,
        title: i18nString(UIStrings.networkRequests),
        jslogContext: 'show-network-requests',
    }}
        .disabled=${input.isDeleted}
        @click=${input.onNetworkRequests}>
      ${i18nString(UIStrings.networkRequests)}
    </devtools-button>
    <devtools-button .data=${{
        variant: "text" /* Buttons.Button.Variant.TEXT */,
        title: i18nString(UIStrings.update),
        jslogContext: 'update',
    }}
        .disabled=${input.isDeleted}
        @click=${input.onUpdate}>
      ${i18nString(UIStrings.update)}
    </devtools-button>
    <devtools-button .data=${{
        variant: "text" /* Buttons.Button.Variant.TEXT */,
        title: i18nString(UIStrings.unregisterServiceWorker),
        jslogContext: 'unregister',
    }}
        .disabled=${input.isDeleted}
        @click=${input.onUnregister}>
      ${i18nString(UIStrings.unregister)}
    </devtools-button>`;
    // clang-format on
}
function renderSyncNotificationField(label, initialValue, placeholder, callback, jslogContext) {
    // clang-format off
    return html `
    <div class="report-field">
    <div class="report-field-name">${label}</div>
      <div class="report-field-value">
      <form class="service-worker-editor-with-button" @submit=${(e) => {
        const { editor } = e.target;
        callback(editor.value || '');
        e.consume(true);
    }}>
        <input name="editor" class="source-code service-worker-notification-editor harmony-input" type="text"
          .value=${initialValue}
          placeholder=${placeholder}
          aria-label=${label}
          .spellcheck=${false}
          jslog=${VisualLogging.textField().track({ change: true }).context(jslogContext)}
        >
        <devtools-button .data=${{
        type: 'submit',
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        jslogContext
    }}>
          ${label}
        </devtools-button>
      </form>
      </div>
    </div>`;
    // clang-format on
}
function renderVersion(icon, label, content = nothing) {
    // clang-format off
    return html `
    <div class="service-worker-version">
      <div class=${icon}></div>
      <span class="service-worker-version-string" role="alert" aria-live="polite">
        ${label}
      </span>
      ${content}
    </div>`;
    // clang-format on
}
function renderClientsField(input, version) {
    if (!version?.controlledClients?.length) {
        return html `<div class="report-field">
      <div class="report-field-name">${i18nString(UIStrings.clients)}</div>
      <div class="report-field-value"></div>
    </div>`;
    }
    // clang-format off
    return html `<div class="report-field">
      <div class="report-field-name">${i18nString(UIStrings.clients)}</div>
      <div class="report-field-value">
      ${version.controlledClients.map(client => html `
        <div class="service-worker-client">
          ${until(input.renderClientInfo(client))}
       </div>`)}
    </div>
  </div>`;
    // clang-format on
}
function renderSourceField(input, version) {
    if (!version) {
        return html `<div class="report-field">
      <div class="report-field-name">${i18nString(UIStrings.source)}</div>
      <div class="report-field-value"></div>
    </div>`;
    }
    const fileName = Common.ParsedURL.ParsedURL.extractName(version.scriptURL);
    // clang-format off
    return html `<div class="report-field">
    <div class="report-field-name">${i18nString(UIStrings.source)}</div>
    <div class="report-field-value">
      <div class="report-field-value-filename">
        ${Components.Linkifier.Linkifier.renderLinkifiedUrl(version.scriptURL, {
        text: fileName, tabStop: true, jslogContext: 'source-location'
    })}
        ${input.errorsLength ? html `
          <button
              class="devtools-link link"
              tabindex="0"
              aria-label=${i18nString(UIStrings.sRegistrationErrors, { PH1: input.errorsLength })}
              @click=${() => Common.Console.Console.instance().show()}>
            <devtools-icon name="cross-circle-filled" class="error-icon">
            </devtools-icon>
            ${input.errorsLength}
          </button>` : nothing}
      </div>
      ${version.scriptResponseTime !== undefined ? html `
        <div class="report-field-value-subtitle">
          ${i18nString(UIStrings.receivedS, { PH1: new Date(version.scriptResponseTime * 1000).toLocaleString() })}
        </div>
      ` : nothing}
    </div>
  </div>`;
    // clang-format on
}
function renderStatusField(input, active, waiting, installing, redundant) {
    // clang-format off
    return html `<div class="report-field">
    <div class="report-field-name">${i18nString(UIStrings.status)}</div>
    <div class="report-field-value">
      <div class="service-worker-version-stack">
        <div class="service-worker-version-stack-bar"></div>
        ${active ? renderVersion('service-worker-active-circle', i18nString(UIStrings.sActivatedAndIsS, {
        PH1: active.id,
        PH2: SDK.ServiceWorkerManager.ServiceWorkerVersion.RunningStatus[active.currentState.runningStatus](),
    }), active.isRunning() || active.isStarting() ? html `
              <devtools-button .data=${{ jslogContext: 'stop', variant: "outlined" /* Buttons.Button.Variant.OUTLINED */ }}
                              @click=${() => input.onStop(active.id)}>
                  ${i18nString(UIStrings.stopString)}
              </devtools-button>`
        : active.isStartable() ? html `
              <devtools-button .data=${{ jslogContext: 'start', variant: "outlined" /* Buttons.Button.Variant.OUTLINED */ }}
                              @click=${input.onStart}>
                  ${i18nString(UIStrings.startString)}
              </devtools-button>`
            : nothing)
        : redundant ? renderVersion('service-worker-redundant-circle', i18nString(UIStrings.sIsRedundant, { PH1: redundant.id }))
            : nothing}
        ${waiting ? renderVersion('service-worker-waiting-circle', i18nString(UIStrings.sWaitingToActivate, { PH1: waiting.id }), html `
              <devtools-button .data=${{
        jslogContext: 'skip-waiting',
        title: i18n.i18n.lockedString('skipWaiting'),
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */
    }}
                  @click=${input.onSkipWaiting}>
                ${i18n.i18n.lockedString('skipWaiting')}
              </devtools-button>
              ${waiting.scriptResponseTime !== undefined ? html `
                <div class="service-worker-subtitle">
                  ${i18nString(UIStrings.receivedS, { PH1: new Date(waiting.scriptResponseTime * 1000).toLocaleString() })}
                </div>
              ` : nothing}
          `) : nothing}
        ${installing ? renderVersion('service-worker-installing-circle', i18nString(UIStrings.sTryingToInstall, { PH1: installing.id }), installing.scriptResponseTime !== undefined ? html `
            <div class="service-worker-subtitle">
              ${i18nString(UIStrings.receivedS, { PH1: new Date(installing.scriptResponseTime * 1000).toLocaleString() })}
            </div>` : nothing) : nothing}
      </div>
    </div>
  </div>`;
    // clang-format on
}
function renderUpdateCycleField(input) {
    // clang-format off
    return html `
    <div class="report-field">
      <div class="report-field-name">${i18nString(UIStrings.updateCycle)}</div>
      <div class="report-field-value">
        ${widget(ServiceWorkerUpdateCycleView, {
        registration: input.registration,
        registrationFingerprint: input.registration.fingerprint(),
    })}
      </div>
    </div>`;
    // clang-format on
}
function renderRouterField(input) {
    const active = input.activeVersion;
    const title = i18nString(UIStrings.routers);
    if (active?.routerRules && active.routerRules.length > 0) {
        // If there is at least one registered rule in the active version, append the router filed.
        // clang-format off
        return html `
      <div class="report-field">
        <div class="report-field-name">${title}</div>
        <div class="report-field-value">
          ${widget(ApplicationComponents.ServiceWorkerRouterView.ServiceWorkerRouterView, { rules: active.routerRules })}
        </div>
      </div>`;
        // clang-format on
    }
    return nothing;
}
export const DEFAULT_SECTION_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${serviceWorkersViewStyles}</style>
      <devtools-report-section-header role="heading" aria-level="2"
              aria-label=${i18nString(UIStrings.serviceWorkerForS, { PH1: input.title })}>
        <span style="flex: 1 1 auto">${input.title}</span>
        ${renderHeaderButtons(input)}
      </devtools-report-section-header>
      <div class="service-worker-section">
         ${renderSourceField(input, input.activeVersion ?? input.redundantVersion)}
         ${renderStatusField(input, input.activeVersion, input.waitingVersion, input.installingVersion, input.redundantVersion)}
         ${renderClientsField(input, input.activeVersion ?? input.redundantVersion)}
         ${renderSyncNotificationField(i18nString(UIStrings.pushString), input.pushData, i18nString(UIStrings.pushData), input.onPush, 'push-message')}
         ${renderSyncNotificationField(i18nString(UIStrings.syncString), input.syncTag, i18nString(UIStrings.syncTag), input.onSync, 'sync-tag')}
         ${renderSyncNotificationField(i18nString(UIStrings.periodicSync), input.periodicSyncTag, i18nString(UIStrings.periodicSyncTag), input.onPeriodicSync, 'periodic-sync-tag')}
         ${renderUpdateCycleField(input)}
         ${renderRouterField(input)}
      </div>
  `, target);
    // clang-format on
};
export class Section extends UI.Widget.VBox {
    manager;
    registration;
    sectionInternal;
    fingerprint;
    pushNotificationDataSetting;
    syncTagNameSetting;
    periodicSyncTagNameSetting;
    clientInfoCache;
    throttler;
    #view;
    constructor(element, view = DEFAULT_SECTION_VIEW) {
        super(element);
        this.fingerprint = null;
        this.clientInfoCache = new Map();
        this.throttler = new Common.Throttler.Throttler(500);
        this.#view = view;
    }
    set section(data) {
        const registrationChanged = !this.registration || this.registration !== data.registration;
        this.sectionInternal = data;
        this.manager = data.manager;
        this.registration = data.registration;
        if (!this.pushNotificationDataSetting) {
            this.pushNotificationDataSetting = Common.Settings.Settings.instance().createLocalSetting('push-data', i18nString(UIStrings.testPushMessageFromDevtools));
            this.syncTagNameSetting =
                Common.Settings.Settings.instance().createLocalSetting('sync-tag-name', 'test-tag-from-devtools');
            this.periodicSyncTagNameSetting =
                Common.Settings.Settings.instance().createLocalSetting('periodic-sync-tag-name', 'test-tag-from-devtools');
        }
        if (registrationChanged) {
            this.clientInfoCache.clear();
        }
    }
    get section() {
        return this.sectionInternal;
    }
    getTitle() {
        const scopeURL = this.registration.scopeURL;
        return this.registration.isDeleted ? i18nString(UIStrings.sDeleted, { PH1: scopeURL }) : scopeURL;
    }
    requestUpdate() {
        if (throttleDisabledForDebugging) {
            super.requestUpdate();
            return;
        }
        void this.throttler.schedule(() => {
            super.requestUpdate();
            return Promise.resolve();
        });
    }
    performUpdate() {
        const fingerprint = this.registration.fingerprint();
        if (fingerprint === this.fingerprint) {
            return Promise.resolve();
        }
        this.fingerprint = fingerprint;
        const versions = this.registration.versionsByMode();
        const active = versions.get("active" /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE */);
        const waiting = versions.get("waiting" /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.WAITING */);
        const installing = versions.get("installing" /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING */);
        const redundant = versions.get("redundant" /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.REDUNDANT */);
        const title = this.getTitle();
        const input = {
            title,
            isDeleted: this.registration.isDeleted,
            errorsLength: this.registration.errors?.length ?? 0,
            pushData: this.pushNotificationDataSetting.get(),
            syncTag: this.syncTagNameSetting.get(),
            periodicSyncTag: this.periodicSyncTagNameSetting.get(),
            registration: this.registration,
            activeVersion: active,
            waitingVersion: waiting,
            installingVersion: installing,
            redundantVersion: redundant,
            renderClientInfo: this.renderClientInfo.bind(this),
            onNetworkRequests: this.networkRequestsClicked.bind(this),
            onUpdate: this.updateButtonClicked.bind(this),
            onUnregister: this.unregisterButtonClicked.bind(this),
            onPush: this.push.bind(this),
            onSync: this.sync.bind(this),
            onPeriodicSync: this.periodicSync.bind(this),
            onStop: this.stopButtonClicked.bind(this),
            onStart: this.startButtonClicked.bind(this),
            onSkipWaiting: this.skipButtonClicked.bind(this),
        };
        this.#view(input, undefined, this.contentElement);
        return Promise.resolve();
    }
    unregisterButtonClicked() {
        this.manager.deleteRegistration(this.registration.id);
    }
    updateButtonClicked() {
        void this.manager.updateRegistration(this.registration.id);
    }
    networkRequestsClicked() {
        void Common.Revealer.reveal(NetworkForward.UIFilter.UIRequestFilter.filters([
            {
                filterType: NetworkForward.UIFilter.FilterType.Is,
                filterValue: "service-worker-intercepted" /* NetworkForward.UIFilter.IsFilterType.SERVICE_WORKER_INTERCEPTED */,
            },
        ]));
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.ServiceWorkerNetworkRequestClicked);
    }
    push(data) {
        this.pushNotificationDataSetting.set(data);
        void this.manager.deliverPushMessage(this.registration.id, data);
    }
    sync(tag) {
        this.syncTagNameSetting.set(tag);
        void this.manager.dispatchSyncEvent(this.registration.id, tag, true);
    }
    periodicSync(tag) {
        this.periodicSyncTagNameSetting.set(tag);
        void this.manager.dispatchPeriodicSyncEvent(this.registration.id, tag);
    }
    async renderClientInfo(clientId) {
        let targetInfo = this.clientInfoCache.get(clientId);
        if (!targetInfo) {
            const response = await this.manager.target().targetAgent().invoke_getTargetInfo({ targetId: clientId });
            if (!response.targetInfo) {
                return nothing;
            }
            targetInfo = response.targetInfo;
            this.clientInfoCache.set(clientId, targetInfo);
        }
        if (targetInfo.type !== 'page' && targetInfo.type !== 'iframe') {
            // clang-format off
            return html `<span class="service-worker-client-string">
        ${i18nString(UIStrings.workerS, { PH1: targetInfo.url })}
      </span>`;
            // clang-format on
        }
        // clang-format off
        return html `
      <span class="service-worker-client-string">${targetInfo.url}</span>
      <devtools-button
        .data=${{
            iconName: 'select-element',
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            size: "SMALL" /* Buttons.Button.Size.SMALL */,
            title: i18nString(UIStrings.focus),
            jslogContext: 'client-focus',
        }}
        class="service-worker-client-focus-link"
        @click=${this.activateTarget.bind(this, targetInfo.targetId)}
      ></devtools-button>`;
        // clang-format on
    }
    activateTarget(targetId) {
        void this.manager.target().targetAgent().invoke_activateTarget({ targetId });
    }
    startButtonClicked() {
        void this.manager.startWorker(this.registration.scopeURL);
    }
    skipButtonClicked() {
        void this.manager.skipWaiting(this.registration.scopeURL);
    }
    stopButtonClicked(versionId) {
        void this.manager.stopWorker(versionId);
    }
}
//# sourceMappingURL=ServiceWorkersView.js.map