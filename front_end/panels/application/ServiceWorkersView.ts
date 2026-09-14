// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/report_view/report_view.js';
import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';

import * as ApplicationComponents from './components/components.js';
import serviceWorkersViewStyles from './serviceWorkersView.css.js';
import {ServiceWorkerUpdateCycleView} from './ServiceWorkerUpdateCycleView.js';

const UIStrings = {
  /**
   * @description Section header for Service Worker registrations from other origins in the Service Workers view of the Application panel.
   */
  serviceWorkersFromOtherOrigins: 'Service Workers from other origins',
  /**
   * @description Label text for the update on reload checkbox in the Service Workers view of the Application panel.
   */
  updateOnReload: 'Update on reload',
  /**
   * @description Tooltip text for the update on reload setting in the Service Workers view of the Application panel.
   */
  onPageReloadForceTheService: 'On page reload, force the `Service Worker` to update, and activate it',
  /**
   * @description Label text for the bypass for network checkbox in the Service Workers view of the Application panel.
   */
  bypassForNetwork: 'Bypass for network',
  /**
   * @description Tooltip text for the bypass for network setting in the Service Workers view of the Application panel.
   */
  bypassTheServiceWorkerAndLoad: 'Bypass the `Service Worker` and load resources from the network',
  /**
   * @description Aria label for a Service Worker registration section in the Service Workers view of the Application panel.
   * @example {https://example.com} PH1
   */
  serviceWorkerForS: '`Service Worker` for {PH1}',
  /**
   * @description Default text for the test push message input in the Service Workers view of the Application panel.
   */
  testPushMessageFromDevtools: 'Test push message from DevTools',
  /**
   * @description Button label and tooltip to view Service Worker network requests in the Network panel.
   */
  networkRequests: 'Network requests',
  /**
   * @description Button label and tooltip to update a Service Worker registration in the Service Workers view of the Application panel.
   */
  update: 'Update',
  /**
   * @description Tooltip text for the unregister button in the Service Workers view of the Application panel.
   */
  unregisterServiceWorker: 'Unregister Service Worker',
  /**
   * @description Button label to unregister a Service Worker in the Service Workers view of the Application panel.
   */
  unregister: 'Unregister',
  /**
   * @description Field label for the Service Worker script source in the Service Workers view of the Application panel.
   */
  source: 'Source',
  /**
   * @description Field label for the Service Worker status in the Service Workers view of the Application panel.
   */
  status: 'Status',
  /**
   * @description Field label for the controlled clients of a Service Worker in the Service Workers view of the Application panel.
   */
  clients: 'Clients',
  /**
   * @description Field label and button text for sending a test push message in the Service Workers view of the Application panel.
   */
  pushString: 'Push',
  /**
   * @description Placeholder text and aria label for the push data input field in the Service Workers view of the Application panel.
   */
  pushData: 'Push data',
  /**
   * @description Field label and button text for dispatching a sync event in the Service Workers view of the Application panel.
   */
  syncString: 'Sync',
  /**
   * @description Placeholder text and aria label for the sync tag input field in the Service Workers view of the Application panel.
   */
  syncTag: 'Sync tag',
  /**
   * @description Field label and button text for dispatching a periodic sync event in the Service Workers view of the Application panel.
   */
  periodicSync: 'Periodic sync',
  /**
   * @description Placeholder text and aria label for the periodic sync tag input field in the Service Workers view of the Application panel.
   */
  periodicSyncTag: 'Periodic sync tag',
  /**
   * @description Aria label for the link to show registration errors in the Console panel.
   * @example {3} PH1
   */
  sRegistrationErrors: '{PH1} registration errors',
  /**
   * @description Date and time when a Service Worker version update was received in the Service Workers view of the Application panel.
   * @example {7/3/2019, 3:38:37 PM} PH1
   */
  receivedS: 'Received {PH1}',
  /**
   * @description Field label for Service Worker router rules in the Service Workers view of the Application panel.
   */
  routers: 'Routers',
  /**
   * @description Title for a deleted Service Worker registration in the Service Workers view of the Application panel.
   * @example {https://example.com} PH1
   */
  sDeleted: '{PH1} - deleted',
  /**
   * @description Status text for an activated Service Worker version in the Service Workers view of the Application panel.
   * @example {1} PH1
   * @example {running} PH2
   */
  sActivatedAndIsS: '#{PH1} activated and is {PH2}',
  /**
   * @description Button label to stop a running Service Worker in the Service Workers view of the Application panel.
   */
  stopString: 'Stop',
  /**
   * @description Button label to start a stopped Service Worker in the Service Workers view of the Application panel.
   */
  startString: 'Start',
  /**
   * @description Status text indicating that a Service Worker version is redundant in the Service Workers view of the Application panel.
   * @example {2} PH1
   */
  sIsRedundant: '#{PH1} is redundant',
  /**
   * @description Status text indicating that a Service Worker version is waiting to activate in the Service Workers view of the Application panel.
   * @example {2} PH1
   */
  sWaitingToActivate: '#{PH1} waiting to activate',
  /**
   * @description Status text indicating that a Service Worker version is trying to install in the Service Workers view of the Application panel.
   * @example {2} PH1
   */
  sTryingToInstall: '#{PH1} trying to install',
  /**
   * @description Field label for the update cycle timeline in the Service Workers view of the Application panel. Update is a noun.
   */
  updateCycle: 'Update cycle',
  /**
   * @description Text displaying the worker client URL in the Service Workers view of the Application panel.
   * @example {https://example.com} PH1
   */
  workerS: 'Worker: {PH1}',
  /**
   * @description Tooltip text for the button to focus a client page in the Service Workers view of the Application panel.
   */
  focus: 'Focus',
  /**
   * @description Link text to view all Service Worker registrations on chrome://serviceworker-internals in the Application panel.
   */
  seeAllRegistrations: 'See all registrations',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {until} = Directives;
const {widget} = UI.Widget;
const {bindToSetting} = UI.UIUtils;

export interface SectionData {
  manager: SDK.ServiceWorkerManager.ServiceWorkerManager;
  registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration;
}

export interface ServiceWorkersViewInput {
  canManageServiceWorkers: boolean;
  sections: SectionData[];
}

function renderToolbar(): LitTemplate {
  const updateOnReloadSetting =
      Common.Settings.Settings.instance().createSetting('service-worker-update-on-reload', false);
  const bypassServiceWorkerSetting = Common.Settings.Settings.instance().createSetting('bypass-service-worker', false);
  // clang-format off
  return html`<devtools-toolbar class="service-worker-toolbar">
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

function renderOthersOriginView(): LitTemplate {
  // clang-format off
  return html`<div class="service-workers-other-origin"
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

function getTimeStamp(registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration): number {
  const versions = registration.versionsByMode();
  let timestamp: number|undefined = 0;
  const active = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE);
  const installing = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING);
  const waiting = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.WAITING);
  const redundant = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.REDUNDANT);

  if (active) {
    timestamp = active.scriptResponseTime;
  } else if (waiting) {
    timestamp = waiting.scriptResponseTime;
  } else if (installing) {
    timestamp = installing.scriptResponseTime;
  } else if (redundant) {
    timestamp = redundant.scriptResponseTime;
  }

  return timestamp || 0;
}

function renderOriginReport(input: ServiceWorkersViewInput): LitTemplate {
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
  return html`<div class="service-workers-this-origin" jslog=${VisualLogging.section('this-origin')}>
    <devtools-report .data=${{reportTitle: i18n.i18n.lockedString('Service workers')}}>
      <div class="service-worker-toolbar" slot="toolbar">${renderToolbar()}</div>
      ${sortedSections.map(section => html`<devtools-widget class="service-worker-section-container" ${widget(Section, {section})}></devtools-widget>`)}
    </devtools-report>
  </div>`;
  // clang-format on
}

type View = (input: ServiceWorkersViewInput, output: undefined, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, _output, target): void => {
  // clang-format off
  render(html`
    <!-- This Origin Report -->
    ${renderOriginReport(input)}
    ${renderOthersOriginView()}`,
         target, {
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
export const setThrottleDisabledForDebugging = (enable: boolean): void => {
  throttleDisabledForDebugging = enable;
};

export class ServiceWorkersView extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.ServiceWorkerManager.ServiceWorkerManager> {
  private readonly sections: Map<SDK.ServiceWorkerManager.ServiceWorkerRegistration, SectionData>;
  private manager: SDK.ServiceWorkerManager.ServiceWorkerManager|null;
  private securityOriginManager: SDK.SecurityOriginManager.SecurityOriginManager|null;
  private readonly eventListeners:
      Map<SDK.ServiceWorkerManager.ServiceWorkerManager, Common.EventTarget.EventDescriptor[]>;
  readonly #output = undefined;

  #view: (input: ServiceWorkersViewInput, output: undefined, target: HTMLElement) => void;

  constructor(view: View = DEFAULT_VIEW) {
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

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override async performUpdate(): Promise<void> {
    if (this.manager) {
      for (const registration of this.manager.registrations().values()) {
        const isCurrent = this.isOriginCurrent(registration.securityOrigin);
        if (isCurrent && !this.sections.has(registration)) {
          this.sections.set(registration, {manager: this.manager, registration});
        } else if (!isCurrent && this.sections.has(registration)) {
          this.sections.delete(registration);
        }
      }
    }

    const input: ServiceWorkersViewInput = {
      canManageServiceWorkers: this.manager !== null,
      sections: Array.from(this.sections.values()).map(data => ({...data})),
    };

    this.#view(input, this.#output, this.contentElement);
  }

  modelAdded(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void {
    if (serviceWorkerManager.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.manager = serviceWorkerManager;
    this.securityOriginManager =
        (serviceWorkerManager.target().model(SDK.SecurityOriginManager.SecurityOriginManager) as
         SDK.SecurityOriginManager.SecurityOriginManager);

    for (const registration of this.manager.registrations().values()) {
      this.updateRegistration(registration);
    }

    this.eventListeners.set(serviceWorkerManager, [
      this.manager.addEventListener(SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, this.registrationUpdated,
                                    this),
      this.manager.addEventListener(SDK.ServiceWorkerManager.Events.REGISTRATION_DELETED, this.registrationDeleted,
                                    this),
      this.securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded,
                                                  this.requestUpdate, this),
      this.securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved,
                                                  this.requestUpdate, this),
    ]);
  }

  modelRemoved(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void {
    if (!this.manager || this.manager !== serviceWorkerManager) {
      return;
    }

    Common.EventTarget.removeEventListeners(this.eventListeners.get(serviceWorkerManager) || []);
    this.eventListeners.delete(serviceWorkerManager);
    this.manager = null;
    this.securityOriginManager = null;
  }

  private registrationUpdated(
      event: Common.EventTarget.EventTargetEvent<SDK.ServiceWorkerManager.ServiceWorkerRegistration>): void {
    this.updateRegistration(event.data);
    this.gcRegistrations();
  }

  private gcRegistrations(): void {
    if (!this.manager || !this.securityOriginManager) {
      return;
    }
    let hasNonDeletedRegistrations = false;
    const securityOrigins = new Set<string>(this.securityOriginManager.securityOrigins());
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

  private isOriginCurrent(origin: string): boolean {
    if (this.securityOriginManager &&
        (this.securityOriginManager.securityOrigins().includes(origin) ||
         this.securityOriginManager.unreachableMainSecurityOrigin() === origin)) {
      return true;
    }
    return false;
  }

  private updateRegistration(registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration,
                             skipUpdate?: boolean): void {
    if (!this.manager) {
      return;
    }
    let sectionData = this.sections.get(registration);
    if (!sectionData) {
      if (!this.isOriginCurrent(registration.securityOrigin)) {
        return;
      }
      sectionData = {manager: this.manager, registration};
      this.sections.set(registration, sectionData);
    }
    if (skipUpdate) {
      return;
    }
    this.requestUpdate();
  }

  private registrationDeleted(
      event: Common.EventTarget.EventTargetEvent<SDK.ServiceWorkerManager.ServiceWorkerRegistration>): void {
    this.removeRegistrationFromList(event.data);
  }

  private removeRegistrationFromList(registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration,
                                     skipVisibilityUpdate = false): void {
    this.sections.delete(registration);
    if (!skipVisibilityUpdate) {
      this.requestUpdate();
    }
  }

  private isRegistrationVisible(registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration): boolean {
    if (!registration.scopeURL) {
      return true;
    }
    return false;
  }
}

export interface SectionViewInput {
  title: string;
  isDeleted: boolean;
  errorsLength: number;
  pushData: string;
  syncTag: string;
  periodicSyncTag: string;
  registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration;
  activeVersion?: SDK.ServiceWorkerManager.ServiceWorkerVersion;
  waitingVersion?: SDK.ServiceWorkerManager.ServiceWorkerVersion;
  installingVersion?: SDK.ServiceWorkerManager.ServiceWorkerVersion;
  redundantVersion?: SDK.ServiceWorkerManager.ServiceWorkerVersion;
  renderClientInfo: (clientId: Protocol.Target.TargetID) => Promise<LitTemplate|typeof nothing>;
  onNetworkRequests: () => void;
  onUpdate: () => void;
  onUnregister: () => void;
  onPush: (data: string) => void;
  onSync: (tag: string) => void;
  onPeriodicSync: (tag: string) => void;
  onStop: (versionId: string) => void;
  onStart: () => void;
  onSkipWaiting: () => void;
}

function renderHeaderButtons(input: SectionViewInput): LitTemplate {
  // clang-format off
  return html`
    <devtools-button .data=${{
          variant: Buttons.Button.Variant.TEXT,
          title: i18nString(UIStrings.networkRequests),
          jslogContext: 'show-network-requests',
        } as Buttons.Button.ButtonData}
        .disabled=${input.isDeleted}
        @click=${input.onNetworkRequests}>
      ${i18nString(UIStrings.networkRequests)}
    </devtools-button>
    <devtools-button .data=${{
          variant: Buttons.Button.Variant.TEXT,
          title: i18nString(UIStrings.update),
          jslogContext: 'update',
        } as Buttons.Button.ButtonData}
        .disabled=${input.isDeleted}
        @click=${input.onUpdate}>
      ${i18nString(UIStrings.update)}
    </devtools-button>
    <devtools-button .data=${{
          variant: Buttons.Button.Variant.TEXT,
          title: i18nString(UIStrings.unregisterServiceWorker),
          jslogContext: 'unregister',
        } as Buttons.Button.ButtonData}
        .disabled=${input.isDeleted}
        @click=${input.onUnregister}>
      ${i18nString(UIStrings.unregister)}
    </devtools-button>`;
  // clang-format on
}

function renderSyncNotificationField(label: string, initialValue: string, placeholder: string,
                                     callback: (arg0: string) => void, jslogContext: string): LitTemplate {
  // clang-format off
  return html`
    <div class="report-field">
    <div class="report-field-name">${label}</div>
      <div class="report-field-value">
      <form class="service-worker-editor-with-button" @submit=${(e: Event) => {
        const {editor} = e.target as HTMLFormElement;
        callback(editor.value || '');
        e.consume(true);
      }}>
        <input name="editor" class="source-code service-worker-notification-editor harmony-input" type="text"
          .value=${initialValue}
          placeholder=${placeholder}
          aria-label=${label}
          .spellcheck=${false}
          jslog=${VisualLogging.textField().track({change: true}).context(jslogContext)}
        >
        <devtools-button .data=${{
            type: 'submit',
            variant: Buttons.Button.Variant.OUTLINED,
            jslogContext} as Buttons.Button.ButtonData}>
          ${label}
        </devtools-button>
      </form>
      </div>
    </div>`;
  // clang-format on
}

function renderVersion(icon: string, label: string, content: LitTemplate = nothing): LitTemplate {
  // clang-format off
  return html`
    <div class="service-worker-version">
      <div class=${icon}></div>
      <span class="service-worker-version-string" role="alert" aria-live="polite">
        ${label}
      </span>
      ${content}
    </div>`;
  // clang-format on
}

function renderClientsField(input: SectionViewInput,
                            version?: SDK.ServiceWorkerManager.ServiceWorkerVersion): LitTemplate {
  if (!version?.controlledClients?.length) {
    return html`<div class="report-field">
      <div class="report-field-name">${i18nString(UIStrings.clients)}</div>
      <div class="report-field-value"></div>
    </div>`;
  }
  // clang-format off
  return html`<div class="report-field">
      <div class="report-field-name">${i18nString(UIStrings.clients)}</div>
      <div class="report-field-value">
      ${version.controlledClients.map(client => html`
        <div class="service-worker-client">
          ${until(input.renderClientInfo(client))}
       </div>`)}
    </div>
  </div>`;
  // clang-format on
}

function renderSourceField(input: SectionViewInput,
                           version?: SDK.ServiceWorkerManager.ServiceWorkerVersion): LitTemplate {
  if (!version) {
    return html`<div class="report-field">
      <div class="report-field-name">${i18nString(UIStrings.source)}</div>
      <div class="report-field-value"></div>
    </div>`;
  }
  const fileName = Common.ParsedURL.ParsedURL.extractName(version.scriptURL);
  // clang-format off

  return html`<div class="report-field">
    <div class="report-field-name">${i18nString(UIStrings.source)}</div>
    <div class="report-field-value">
      <div class="report-field-value-filename">
        ${Components.Linkifier.Linkifier.renderLinkifiedUrl(version.scriptURL, {
          text: fileName, tabStop: true, jslogContext: 'source-location'})}
        ${input.errorsLength ? html`
          <button
              class="devtools-link link"
              tabindex="0"
              aria-label=${i18nString(UIStrings.sRegistrationErrors, {PH1: input.errorsLength})}
              @click=${() => Common.Console.Console.instance().show()}>
            <devtools-icon name="cross-circle-filled" class="error-icon">
            </devtools-icon>
            ${input.errorsLength}
          </button>` : nothing}
      </div>
      ${version.scriptResponseTime !== undefined ? html`
        <div class="report-field-value-subtitle">
          ${i18nString(UIStrings.receivedS, {PH1: new Date(version.scriptResponseTime * 1000).toLocaleString()})}
        </div>
      ` : nothing}
    </div>
  </div>`;
  // clang-format on
}

function renderStatusField(input: SectionViewInput, active?: SDK.ServiceWorkerManager.ServiceWorkerVersion,
                           waiting?: SDK.ServiceWorkerManager.ServiceWorkerVersion,
                           installing?: SDK.ServiceWorkerManager.ServiceWorkerVersion,
                           redundant?: SDK.ServiceWorkerManager.ServiceWorkerVersion): LitTemplate {
  // clang-format off

  return html`<div class="report-field">
    <div class="report-field-name">${i18nString(UIStrings.status)}</div>
    <div class="report-field-value">
      <div class="service-worker-version-stack">
        <div class="service-worker-version-stack-bar"></div>
        ${active ? renderVersion(
            'service-worker-active-circle',
            i18nString(UIStrings.sActivatedAndIsS, {
              PH1: active.id,
              PH2: SDK.ServiceWorkerManager.ServiceWorkerVersion.RunningStatus[active.currentState.runningStatus](),
            }),
            active.isRunning() || active.isStarting() ? html`
              <devtools-button .data=${{jslogContext: 'stop', variant: Buttons.Button.Variant.OUTLINED} as Buttons.Button.ButtonData}
                              @click=${() => input.onStop(active.id)}>
                  ${i18nString(UIStrings.stopString)}
              </devtools-button>`
            : active.isStartable() ? html`
              <devtools-button .data=${{jslogContext: 'start', variant: Buttons.Button.Variant.OUTLINED} as Buttons.Button.ButtonData}
                              @click=${input.onStart}>
                  ${i18nString(UIStrings.startString)}
              </devtools-button>`
            : nothing)
        : redundant ? renderVersion(
            'service-worker-redundant-circle',
            i18nString(UIStrings.sIsRedundant, {PH1: redundant.id}))
        : nothing}
        ${waiting ? renderVersion(
            'service-worker-waiting-circle',
            i18nString(UIStrings.sWaitingToActivate, {PH1: waiting.id}), html`
              <devtools-button .data=${{
                    jslogContext: 'skip-waiting',
                    title: i18n.i18n.lockedString('skipWaiting'),
                    variant: Buttons.Button.Variant.OUTLINED} as Buttons.Button.ButtonData}
                  @click=${input.onSkipWaiting}>
                ${i18n.i18n.lockedString('skipWaiting')}
              </devtools-button>
              ${waiting.scriptResponseTime !== undefined ? html`
                <div class="service-worker-subtitle">
                  ${i18nString(UIStrings.receivedS, {PH1: new Date(waiting.scriptResponseTime * 1000).toLocaleString()})}
                </div>
              ` : nothing}
          `,
        ) : nothing}
        ${installing ? renderVersion(
          'service-worker-installing-circle',
          i18nString(UIStrings.sTryingToInstall, {PH1: installing.id}),
          installing.scriptResponseTime !== undefined ? html`
            <div class="service-worker-subtitle">
              ${i18nString(UIStrings.receivedS, {PH1: new Date(installing.scriptResponseTime * 1000).toLocaleString()})}
            </div>` : nothing) : nothing}
      </div>
    </div>
  </div>`;
  // clang-format on
}

function renderUpdateCycleField(input: SectionViewInput): LitTemplate {
  // clang-format off
  return html`
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

function renderRouterField(input: SectionViewInput): LitTemplate {
  const active = input.activeVersion;
  const title = i18nString(UIStrings.routers);
  if (active?.routerRules && active.routerRules.length > 0) {
    // If there is at least one registered rule in the active version, append the router filed.
    // clang-format off
    return html`
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

type SectionView = (input: SectionViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_SECTION_VIEW: SectionView =
    (input: SectionViewInput, _output: undefined, target: HTMLElement): void => {
      // clang-format off
  render(html`
      <style>${serviceWorkersViewStyles}</style>
      <devtools-report-section-header role="heading" aria-level="2"
              aria-label=${i18nString(UIStrings.serviceWorkerForS, { PH1: input.title })}>
        <span style="flex: 1 1 auto">${input.title}</span>
        ${renderHeaderButtons(input)}
      </devtools-report-section-header>
      <div class="service-worker-section" jslog=${VisualLogging.section('service-worker')}>
         ${renderSourceField(input, input.activeVersion ?? input.redundantVersion)}
         ${renderStatusField(input, input.activeVersion, input.waitingVersion, input.installingVersion, input.redundantVersion)}
         ${renderClientsField(input, input.activeVersion ?? input.redundantVersion)}
         ${renderSyncNotificationField(i18nString(UIStrings.pushString), input.pushData,
                                   i18nString(UIStrings.pushData), input.onPush, 'push-message')}
         ${renderSyncNotificationField(i18nString(UIStrings.syncString), input.syncTag,
                                   i18nString(UIStrings.syncTag), input.onSync, 'sync-tag')}
         ${renderSyncNotificationField(i18nString(UIStrings.periodicSync), input.periodicSyncTag,
                                   i18nString(UIStrings.periodicSyncTag), input.onPeriodicSync,
                                   'periodic-sync-tag')}
         ${renderUpdateCycleField(input)}
         ${renderRouterField(input)}
      </div>
  `, target);
      // clang-format on
    };

export class Section extends UI.Widget.VBox {
  private manager!: SDK.ServiceWorkerManager.ServiceWorkerManager;
  registration!: SDK.ServiceWorkerManager.ServiceWorkerRegistration;
  private sectionInternal!: SectionData;
  private fingerprint: symbol|null;
  private pushNotificationDataSetting!: Common.Settings.Setting<string>;
  private syncTagNameSetting!: Common.Settings.Setting<string>;
  private periodicSyncTagNameSetting!: Common.Settings.Setting<string>;
  private readonly clientInfoCache: Map<string, Protocol.Target.TargetInfo>;
  private readonly throttler: Common.Throttler.Throttler;
  #view: SectionView;

  constructor(element: HTMLElement, view: SectionView = DEFAULT_SECTION_VIEW) {
    super(element);
    this.fingerprint = null;
    this.clientInfoCache = new Map();
    this.throttler = new Common.Throttler.Throttler(500);
    this.#view = view;
  }

  set section(data: SectionData) {
    const registrationChanged = !this.registration || this.registration !== data.registration;
    this.sectionInternal = data;
    this.manager = data.manager;
    this.registration = data.registration;

    if (!this.pushNotificationDataSetting) {
      this.pushNotificationDataSetting = Common.Settings.Settings.instance().createLocalSetting(
          'push-data', i18nString(UIStrings.testPushMessageFromDevtools));
      this.syncTagNameSetting =
          Common.Settings.Settings.instance().createLocalSetting('sync-tag-name', 'test-tag-from-devtools');
      this.periodicSyncTagNameSetting =
          Common.Settings.Settings.instance().createLocalSetting('periodic-sync-tag-name', 'test-tag-from-devtools');
    }

    if (registrationChanged) {
      this.clientInfoCache.clear();
    }
  }

  get section(): SectionData {
    return this.sectionInternal;
  }

  getTitle(): string {
    const scopeURL = this.registration.scopeURL;
    return this.registration.isDeleted ? i18nString(UIStrings.sDeleted, {PH1: scopeURL}) : scopeURL;
  }

  override requestUpdate(): void {
    if (throttleDisabledForDebugging) {
      super.requestUpdate();
      return;
    }
    void this.throttler.schedule(() => {
      super.requestUpdate();
      return Promise.resolve();
    });
  }

  override performUpdate(): Promise<void> {
    const fingerprint = this.registration.fingerprint();
    if (fingerprint === this.fingerprint) {
      return Promise.resolve();
    }
    this.fingerprint = fingerprint;

    const versions = this.registration.versionsByMode();

    const active = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE);
    const waiting = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.WAITING);
    const installing = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING);
    const redundant = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.REDUNDANT);

    const title = this.getTitle();

    const input: SectionViewInput = {
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

  private unregisterButtonClicked(): void {
    this.manager.deleteRegistration(this.registration.id);
  }

  private updateButtonClicked(): void {
    void this.manager.updateRegistration(this.registration.id);
  }

  private networkRequestsClicked(): void {
    void Common.Revealer.reveal(NetworkForward.UIFilter.UIRequestFilter.filters([
      {
        filterType: NetworkForward.UIFilter.FilterType.Is,
        filterValue: NetworkForward.UIFilter.IsFilterType.SERVICE_WORKER_INTERCEPTED,
      },
    ]));

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ServiceWorkerNetworkRequestClicked);
  }

  private push(data: string): void {
    this.pushNotificationDataSetting.set(data);
    void this.manager.deliverPushMessage(this.registration.id, data);
  }

  private sync(tag: string): void {
    this.syncTagNameSetting.set(tag);
    void this.manager.dispatchSyncEvent(this.registration.id, tag, true);
  }

  private periodicSync(tag: string): void {
    this.periodicSyncTagNameSetting.set(tag);
    void this.manager.dispatchPeriodicSyncEvent(this.registration.id, tag);
  }

  private async renderClientInfo(clientId: Protocol.Target.TargetID): Promise<LitTemplate|typeof nothing> {
    let targetInfo = this.clientInfoCache.get(clientId);
    if (!targetInfo) {
      const response = await this.manager.target().targetAgent().invoke_getTargetInfo({targetId: clientId});
      if (!response.targetInfo) {
        return nothing;
      }
      targetInfo = response.targetInfo;
      this.clientInfoCache.set(clientId, targetInfo);
    }

    if (targetInfo.type !== 'page' && targetInfo.type !== 'iframe') {
      // clang-format off
      return html`<span class="service-worker-client-string">
        ${i18nString(UIStrings.workerS, {PH1: targetInfo.url})}
      </span>`;
      // clang-format on
    }

    // clang-format off
    return html`
      <span class="service-worker-client-string">${targetInfo.url}</span>
      <devtools-button
        .data=${{
          iconName: 'select-element',
          variant: Buttons.Button.Variant.ICON,
          size: Buttons.Button.Size.SMALL,
          title: i18nString(UIStrings.focus),
          jslogContext: 'client-focus',
        } as Buttons.Button.ButtonData}
        class="service-worker-client-focus-link"
        @click=${this.activateTarget.bind(this, targetInfo.targetId)}
      ></devtools-button>`;
    // clang-format on
  }

  private activateTarget(targetId: Protocol.Target.TargetID): void {
    void this.manager.target().targetAgent().invoke_activateTarget({targetId});
  }

  private startButtonClicked(): void {
    void this.manager.startWorker(this.registration.scopeURL);
  }

  private skipButtonClicked(): void {
    void this.manager.skipWaiting(this.registration.scopeURL);
  }

  private stopButtonClicked(versionId: string): void {
    void this.manager.stopWorker(versionId);
  }
}
