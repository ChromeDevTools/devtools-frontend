// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as Network from '../network/network.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ServiceWorkerUpdateCycleHelper} from './ServiceWorkerUpdateCycleHelper.js';

export const UIStrings = {
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  serviceWorkers: '`Service Workers`',
  /**
  *@description Text for linking to other Service Worker registrations
  */
  serviceWorkersFromOtherOrigins: 'Service workers from other origins',
  /**
  *@description Title of update on reload setting in service workers view of the application panel
  */
  updateOnReload: 'Update on reload',
  /**
  *@description Tooltip text that appears on the setting when hovering over it in Service Workers View of the Application panel
  */
  onPageReloadForceTheService: 'On page reload, force the `service worker` to update, and activate it',
  /**
  *@description Title of bypass service worker setting in service workers view of the application panel
  */
  bypassForNetwork: 'Bypass for network',
  /**
  *@description Tooltip text that appears on the setting when hovering over it in Service Workers View of the Application panel
  */
  bypassTheServiceWorkerAndLoad: 'Bypass the `service worker` and load resources from the network',
  /**
  *@description Screen reader title for a section of the Service Workers view of the Application panel
  *@example {https://example.com} PH1
  */
  serviceWorkerForS: '`Service worker` for {PH1}',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  testPushMessageFromDevtools: 'Test push message from DevTools.',
  /**
  *@description Button label for service worker network requests
  */
  networkRequests: 'Network requests',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  update: 'Update',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  unregisterServiceWorker: 'Unregister service worker',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  unregister: 'Unregister',
  /**
  *@description Text for the source of something
  */
  source: 'Source',
  /**
  *@description Text for the status of something
  */
  status: 'Status',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  clients: 'Clients',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  pushString: 'Push',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  pushData: 'Push data',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  syncString: 'Sync',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  syncTag: 'Sync tag',
  /**
  *@description Text for button in Service Workers View of the Application panel that dispatches a periodicsync event
  */
  periodicSync: 'Periodic Sync',
  /**
  *@description Default tag for a periodicsync event in Service Workers View of the Application panel
  */
  periodicSyncTag: 'Periodic Sync tag',
  /**
  *@description Aria accessible name in Service Workers View of the Application panel
  *@example {3} PH1
  */
  sRegistrationErrors: '{PH1} registration errors',
  /**
  *@description Text in Service Workers View of the Application panel
  *@example {7/3/2019, 3:38:37 PM} PH1
  */
  receivedS: 'Received {PH1}',
  /**
  *@description Text in Service Workers View of the Application panel
  *@example {example.com} PH1
  */
  sDeleted: '{PH1} - deleted',
  /**
  *@description Text in Service Workers View of the Application panel
  *@example {1} PH1
  *@example {stopped} PH2
  */
  sActivatedAndIsS: '#{PH1} activated and is {PH2}',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  stopString: 'stop',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  inspect: 'inspect',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  startString: 'start',
  /**
  *@description Text in Service Workers View of the Application panel
  *@example {2} PH1
  */
  sIsRedundant: '#{PH1} is redundant',
  /**
  *@description Text in Service Workers View of the Application panel
  *@example {2} PH1
  */
  sWaitingToActivate: '#{PH1} waiting to activate',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  skipwaiting: 'skipWaiting',
  /**
  *@description Text in Service Workers View of the Application panel
  *@example {2} PH1
  */
  sTryingToInstall: '#{PH1} trying to install',
  /**
  *@description Text in Service Workers Update Timeline. Update is a noun.
  */
  updateCycle: 'Update Cycle',
  /**
  *@description Text of a DOM element in Service Workers View of the Application panel
  *@example {example.com} PH1
  */
  workerS: 'Worker: {PH1}',
  /**
  *@description Text in Service Workers View of the Application panel
  */
  focus: 'focus',
};
const str_ = i18n.i18n.registerUIStrings('resources/ServiceWorkersView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let throttleDisabledForDebugging = false;
/**
 * @param {boolean} enable
 */
export const setThrottleDisabledForDebugging = enable => {
  throttleDisabledForDebugging = enable;
};

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.ServiceWorkerManager.ServiceWorkerManager>}
 */
export class ServiceWorkersView extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('resources/serviceWorkersView.css', {enableLegacyPatching: false});

    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this._currentWorkersView = new UI.ReportView.ReportView(i18nString(UIStrings.serviceWorkers));
    this._currentWorkersView.setBodyScrollable(false);
    this.contentElement.classList.add('service-worker-list');
    this._currentWorkersView.show(this.contentElement);
    this._currentWorkersView.element.classList.add('service-workers-this-origin');

    this._toolbar = this._currentWorkersView.createToolbar();
    this._toolbar.makeWrappable(true /* growVertically */);

    /** @type {!Map<!SDK.ServiceWorkerManager.ServiceWorkerRegistration, !Section>} */
    this._sections = new Map();

    /** @type {?SDK.ServiceWorkerManager.ServiceWorkerManager} */
    this._manager = null;
    /** @type {?SDK.SecurityOriginManager.SecurityOriginManager} */
    this._securityOriginManager = null;

    /** @type {!WeakMap<!UI.ReportView.Section, !SDK.ServiceWorkerManager.ServiceWorkerRegistration>} */
    this._sectionToRegistration = new WeakMap();

    const othersDiv = this.contentElement.createChild('div', 'service-workers-other-origin');
    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    const othersView = new UI.ReportView.ReportView();
    othersView.setHeaderVisible(false);
    othersView.show(othersDiv);
    const othersSection = othersView.appendSection(i18nString(UIStrings.serviceWorkersFromOtherOrigins));
    const othersSectionRow = othersSection.appendRow();
    const seeOthers = UI.Fragment.html
    `<a class="devtools-link" role="link" tabindex="0" href="chrome://serviceworker-internals" target="_blank" style="display: inline; cursor: pointer;">See all registrations</a>`;
    self.onInvokeElement(seeOthers, event => {
      const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
      mainTarget && mainTarget.targetAgent().invoke_createTarget({url: 'chrome://serviceworker-internals?devtools'});
      event.consume(true);
    });
    othersSectionRow.appendChild(seeOthers);

    this._toolbar.appendToolbarItem(
        MobileThrottling.ThrottlingManager.throttlingManager().createOfflineToolbarCheckbox());
    const updateOnReloadSetting =
        Common.Settings.Settings.instance().createSetting('serviceWorkerUpdateOnReload', false);
    updateOnReloadSetting.setTitle(i18nString(UIStrings.updateOnReload));
    const forceUpdate =
        new UI.Toolbar.ToolbarSettingCheckbox(updateOnReloadSetting, i18nString(UIStrings.onPageReloadForceTheService));
    this._toolbar.appendToolbarItem(forceUpdate);
    const bypassServiceWorkerSetting = Common.Settings.Settings.instance().createSetting('bypassServiceWorker', false);
    bypassServiceWorkerSetting.setTitle(i18nString(UIStrings.bypassForNetwork));
    const fallbackToNetwork = new UI.Toolbar.ToolbarSettingCheckbox(
        bypassServiceWorkerSetting, i18nString(UIStrings.bypassTheServiceWorkerAndLoad));
    this._toolbar.appendToolbarItem(fallbackToNetwork);

    /** @type {!Map<!SDK.ServiceWorkerManager.ServiceWorkerManager, !Array<!Common.EventTarget.EventDescriptor>>}*/
    this._eventListeners = new Map();
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.ServiceWorkerManager.ServiceWorkerManager, this);
    this._updateListVisibility();

    /**
     * @param {!Event} event
     */
    const drawerChangeHandler = event => {
      // @ts-ignore: No support for custom event listener
      const isDrawerOpen = event.detail && event.detail.isDrawerOpen;
      if (this._manager && !isDrawerOpen) {
        const {serviceWorkerNetworkRequestsPanelStatus: {isOpen, openedAt}} = this._manager;
        if (isOpen) {
          const networkLocation = UI.ViewManager.ViewManager.instance().locationNameForViewId('network');
          UI.ViewManager.ViewManager.instance().showViewInLocation('network', networkLocation, false);
          Network.NetworkPanel.NetworkPanel.revealAndFilter([]);

          const currentTime = Date.now();
          const timeDifference = currentTime - openedAt;
          if (timeDifference < 2000) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.ServiceWorkerNetworkRequestClosedQuickly);
          }

          this._manager.serviceWorkerNetworkRequestsPanelStatus = {
            isOpen: false,
            openedAt: 0,
          };
        }
      }
    };
    document.body.addEventListener(UI.InspectorView.Events.DrawerChange, drawerChangeHandler);
  }

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerManager} serviceWorkerManager
   */
  modelAdded(serviceWorkerManager) {
    if (this._manager) {
      return;
    }
    this._manager = serviceWorkerManager;
    this._securityOriginManager =
        /** @type {!SDK.SecurityOriginManager.SecurityOriginManager} */ (
            serviceWorkerManager.target().model(SDK.SecurityOriginManager.SecurityOriginManager));

    for (const registration of this._manager.registrations().values()) {
      this._updateRegistration(registration);
    }

    this._eventListeners.set(serviceWorkerManager, [
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated, this._registrationUpdated, this),
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationDeleted, this._registrationDeleted, this),
      this._securityOriginManager.addEventListener(
          SDK.SecurityOriginManager.Events.SecurityOriginAdded, this._updateSectionVisibility, this),
      this._securityOriginManager.addEventListener(
          SDK.SecurityOriginManager.Events.SecurityOriginRemoved, this._updateSectionVisibility, this),
    ]);
  }

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerManager} serviceWorkerManager
   */
  modelRemoved(serviceWorkerManager) {
    if (!this._manager || this._manager !== serviceWorkerManager) {
      return;
    }

    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners.get(serviceWorkerManager) || []);
    this._eventListeners.delete(serviceWorkerManager);
    this._manager = null;
    this._securityOriginManager = null;
  }

  /**
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerRegistration} registration
   * @return {number}
   */
  _getTimeStamp(registration) {
    const versions = registration.versionsByMode();

    /** @type {number|undefined} */
    let timestamp = 0;

    const active = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.Active);
    const installing = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.Installing);
    const waiting = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.Waiting);
    const redundant = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.Redundant);

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

  _updateSectionVisibility() {
    let hasThis = false;
    const movedSections = [];
    for (const section of this._sections.values()) {
      const expectedView = this._getReportViewForOrigin(section._registration.securityOrigin);
      hasThis = hasThis || expectedView === this._currentWorkersView;
      if (section._section.parentWidget() !== expectedView) {
        movedSections.push(section);
      }
    }

    for (const section of movedSections) {
      const registration = section._registration;
      this._removeRegistrationFromList(registration);
      this._updateRegistration(registration, true);
    }

    this._currentWorkersView.sortSections((aSection, bSection) => {
      const aRegistration = this._sectionToRegistration.get(aSection);
      const bRegistration = this._sectionToRegistration.get(bSection);
      const aTimestamp = aRegistration ? this._getTimeStamp(aRegistration) : 0;
      const bTimestamp = bRegistration ? this._getTimeStamp(bRegistration) : 0;
      // the newest (largest timestamp value) should be the first
      return bTimestamp - aTimestamp;
    });

    for (const section of this._sections.values()) {
      if (section._section.parentWidget() === this._currentWorkersView ||
          this._isRegistrationVisible(section._registration)) {
        section._section.showWidget();
      } else {
        section._section.hideWidget();
      }
    }
    this.contentElement.classList.toggle('service-worker-has-current', Boolean(hasThis));
    this._updateListVisibility();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _registrationUpdated(event) {
    const registration = /** @type {!SDK.ServiceWorkerManager.ServiceWorkerRegistration} */ (event.data);
    this._updateRegistration(registration);
    this._gcRegistrations();
  }

  _gcRegistrations() {
    if (!this._manager || !this._securityOriginManager) {
      return;
    }
    let hasNonDeletedRegistrations = false;
    const securityOrigins = new Set(this._securityOriginManager.securityOrigins());
    for (const registration of this._manager.registrations().values()) {
      if (!securityOrigins.has(registration.securityOrigin) && !this._isRegistrationVisible(registration)) {
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

    for (const registration of this._manager.registrations().values()) {
      const visible = securityOrigins.has(registration.securityOrigin) || this._isRegistrationVisible(registration);
      if (!visible && registration.canBeRemoved()) {
        this._removeRegistrationFromList(registration);
      }
    }
  }

  /**
   * @param {string} origin
   * @return {?UI.ReportView.ReportView}
   */
  _getReportViewForOrigin(origin) {
    if (this._securityOriginManager &&
        (this._securityOriginManager.securityOrigins().includes(origin) ||
         this._securityOriginManager.unreachableMainSecurityOrigin() === origin)) {
      return this._currentWorkersView;
    }
    return null;
  }

  /**
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerRegistration} registration
   * @param {boolean=} skipUpdate
   */
  _updateRegistration(registration, skipUpdate) {
    let section = this._sections.get(registration);
    if (!section) {
      const title = registration.scopeURL;
      const reportView = this._getReportViewForOrigin(registration.securityOrigin);
      if (!reportView) {
        return;
      }
      const uiSection = reportView.appendSection(title);
      uiSection.setUiGroupTitle(i18nString(UIStrings.serviceWorkerForS, {PH1: title}));
      this._sectionToRegistration.set(uiSection, registration);
      section = new Section(
          /** @type {!SDK.ServiceWorkerManager.ServiceWorkerManager} */ (this._manager), uiSection, registration);
      this._sections.set(registration, section);
    }
    if (skipUpdate) {
      return;
    }
    this._updateSectionVisibility();
    section._scheduleUpdate();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _registrationDeleted(event) {
    const registration = /** @type {!SDK.ServiceWorkerManager.ServiceWorkerRegistration} */ (event.data);
    this._removeRegistrationFromList(registration);
  }

  /**
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerRegistration} registration
   */
  _removeRegistrationFromList(registration) {
    const section = this._sections.get(registration);
    if (section) {
      section._section.detach();
    }
    this._sections.delete(registration);
    this._updateSectionVisibility();
  }

  /**
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerRegistration} registration
   * @return {boolean}
   */
  _isRegistrationVisible(registration) {
    if (!registration.scopeURL) {
      return true;
    }
    return false;
  }

  _updateListVisibility() {
    this.contentElement.classList.toggle('service-worker-list-empty', this._sections.size === 0);
  }
}

export class Section {
  /**
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerManager} manager
   * @param {!UI.ReportView.Section} section
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerRegistration} registration
   */
  constructor(manager, section, registration) {
    this._manager = manager;
    this._section = section;
    this._registration = registration;
    /** @type {?symbol} */
    this._fingerprint = null;
    this._pushNotificationDataSetting = Common.Settings.Settings.instance().createLocalSetting(
        'pushData', i18nString(UIStrings.testPushMessageFromDevtools));
    this._syncTagNameSetting =
        Common.Settings.Settings.instance().createLocalSetting('syncTagName', 'test-tag-from-devtools');
    this._periodicSyncTagNameSetting =
        Common.Settings.Settings.instance().createLocalSetting('periodicSyncTagName', 'test-tag-from-devtools');

    this._toolbar = section.createToolbar();
    this._toolbar.renderAsLinks();

    this._updateCycleElement = ServiceWorkerUpdateCycleHelper.createTimingTable(registration);
    this._networkRequests = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.networkRequests), undefined, i18nString(UIStrings.networkRequests));
    this._networkRequests.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._networkRequestsClicked, this);
    this._toolbar.appendToolbarItem(this._networkRequests);
    this._updateButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.update), undefined, i18nString(UIStrings.update));
    this._updateButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._updateButtonClicked, this);
    this._toolbar.appendToolbarItem(this._updateButton);
    this._deleteButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.unregisterServiceWorker), undefined, i18nString(UIStrings.unregister));
    this._deleteButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._unregisterButtonClicked, this);
    this._toolbar.appendToolbarItem(this._deleteButton);

    // Preserve the order.
    this._sourceField = this._wrapWidget(this._section.appendField(i18nString(UIStrings.source)));
    this._statusField = this._wrapWidget(this._section.appendField(i18nString(UIStrings.status)));
    this._clientsField = this._wrapWidget(this._section.appendField(i18nString(UIStrings.clients)));
    this._createSyncNotificationField(
        i18nString(UIStrings.pushString), this._pushNotificationDataSetting.get(), i18nString(UIStrings.pushData),
        this._push.bind(this));
    this._createSyncNotificationField(
        i18nString(UIStrings.syncString), this._syncTagNameSetting.get(), i18nString(UIStrings.syncTag),
        this._sync.bind(this));
    this._createSyncNotificationField(
        i18nString(UIStrings.periodicSync), this._periodicSyncTagNameSetting.get(),
        i18nString(UIStrings.periodicSyncTag), tag => this._periodicSync(tag));
    this._createUpdateCycleField();

    this._linkifier = new Components.Linkifier.Linkifier();
    /** @type {!Map<string, !Protocol.Target.TargetInfo>} */
    this._clientInfoCache = new Map();
    this._throttler = new Common.Throttler.Throttler(500);
  }

  /**
   * @param {string} label
   * @param {string} initialValue
   * @param {string} placeholder
   * @param {function(string):void} callback
   */
  _createSyncNotificationField(label, initialValue, placeholder, callback) {
    const form =
        this._wrapWidget(this._section.appendField(label)).createChild('form', 'service-worker-editor-with-button');
    const editor = UI.UIUtils.createInput('source-code service-worker-notification-editor');
    form.appendChild(editor);
    const button = UI.UIUtils.createTextButton(label);
    button.type = 'submit';
    form.appendChild(button);

    editor.value = initialValue;
    editor.placeholder = placeholder;
    UI.ARIAUtils.setAccessibleName(editor, label);

    form.addEventListener(
        'submit',
        /** @param {!Event} e */
        e => {
          callback(editor.value || '');
          e.consume(true);
        });
  }

  _scheduleUpdate() {
    if (throttleDisabledForDebugging) {
      this._update();
      return;
    }
    this._throttler.schedule(this._update.bind(this));
  }

  /**
   * @param {string} versionId
   * @return {?SDK.SDKModel.Target}
   */
  _targetForVersionId(versionId) {
    const version = this._manager.findVersion(versionId);
    if (!version || !version.targetId) {
      return null;
    }
    return SDK.SDKModel.TargetManager.instance().targetById(version.targetId);
  }

  /**
   * @param {!Element} versionsStack
   * @param {string} icon
   * @param {string} label
   * @return {!Element}
   */
  _addVersion(versionsStack, icon, label) {
    const installingEntry = versionsStack.createChild('div', 'service-worker-version');
    installingEntry.createChild('div', icon);
    const statusString = installingEntry.createChild('span', 'service-worker-version-string');
    statusString.textContent = label;
    UI.ARIAUtils.markAsAlert(statusString);
    return installingEntry;
  }

  /**
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerVersion} version
   */
  _updateClientsField(version) {
    this._clientsField.removeChildren();
    this._section.setFieldVisible(i18nString(UIStrings.clients), Boolean(version.controlledClients.length));
    for (const client of version.controlledClients) {
      const clientLabelText = this._clientsField.createChild('div', 'service-worker-client');
      if (this._clientInfoCache.has(client)) {
        this._updateClientInfo(
            clientLabelText, /** @type {!Protocol.Target.TargetInfo} */ (this._clientInfoCache.get(client)));
      }
      this._manager.target()
          .targetAgent()
          .invoke_getTargetInfo({targetId: client})
          .then(this._onClientInfo.bind(this, clientLabelText));
    }
  }

  /**
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerVersion} version
   */
  _updateSourceField(version) {
    this._sourceField.removeChildren();
    const fileName = Common.ParsedURL.ParsedURL.extractName(version.scriptURL);
    const name = this._sourceField.createChild('div', 'report-field-value-filename');
    const link = Components.Linkifier.Linkifier.linkifyURL(
        version.scriptURL, /** @type {!Components.Linkifier.LinkifyURLOptions} */ ({text: fileName}));
    link.tabIndex = 0;
    name.appendChild(link);
    if (this._registration.errors.length) {
      const errorsLabel = UI.UIUtils.createIconLabel(String(this._registration.errors.length), 'smallicon-error');
      errorsLabel.classList.add('devtools-link', 'link');
      errorsLabel.tabIndex = 0;
      UI.ARIAUtils.setAccessibleName(
          errorsLabel, i18nString(UIStrings.sRegistrationErrors, {PH1: this._registration.errors.length}));
      self.onInvokeElement(errorsLabel, () => Common.Console.Console.instance().show());
      name.appendChild(errorsLabel);
    }
    if (version.scriptResponseTime !== undefined) {
      this._sourceField.createChild('div', 'report-field-value-subtitle').textContent =
          i18nString(UIStrings.receivedS, {PH1: new Date(version.scriptResponseTime * 1000).toLocaleString()});
    }
  }

  /**
   * @return {!Promise<void>}
   */
  _update() {
    const fingerprint = this._registration.fingerprint();
    if (fingerprint === this._fingerprint) {
      return Promise.resolve();
    }
    this._fingerprint = fingerprint;

    this._toolbar.setEnabled(!this._registration.isDeleted);

    const versions = this._registration.versionsByMode();
    const scopeURL = this._registration.scopeURL;
    const title = this._registration.isDeleted ? i18nString(UIStrings.sDeleted, {PH1: scopeURL}) : scopeURL;
    this._section.setTitle(title);

    const active = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.Active);
    const waiting = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.Waiting);
    const installing = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.Installing);
    const redundant = versions.get(SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.Redundant);

    this._statusField.removeChildren();
    const versionsStack = this._statusField.createChild('div', 'service-worker-version-stack');
    versionsStack.createChild('div', 'service-worker-version-stack-bar');

    if (active) {
      this._updateSourceField(active);
      const localizedRunningStatus =
          SDK.ServiceWorkerManager.ServiceWorkerVersion.RunningStatus[active.currentState.runningStatus];
      const activeEntry = this._addVersion(
          versionsStack, 'service-worker-active-circle',
          i18nString(UIStrings.sActivatedAndIsS, {PH1: active.id, PH2: localizedRunningStatus}));

      if (active.isRunning() || active.isStarting()) {
        this._createLink(activeEntry, i18nString(UIStrings.stopString), this._stopButtonClicked.bind(this, active.id));
        if (!this._targetForVersionId(active.id)) {
          this._createLink(
              activeEntry, i18nString(UIStrings.inspect), this._inspectButtonClicked.bind(this, active.id));
        }
      } else if (active.isStartable()) {
        this._createLink(activeEntry, i18nString(UIStrings.startString), this._startButtonClicked.bind(this));
      }
      this._updateClientsField(active);
    } else if (redundant) {
      this._updateSourceField(redundant);
      this._addVersion(
          versionsStack, 'service-worker-redundant-circle', i18nString(UIStrings.sIsRedundant, {PH1: redundant.id}));
      this._updateClientsField(redundant);
    }

    if (waiting) {
      const waitingEntry = this._addVersion(
          versionsStack, 'service-worker-waiting-circle', i18nString(UIStrings.sWaitingToActivate, {PH1: waiting.id}));
      this._createLink(waitingEntry, i18nString(UIStrings.skipwaiting), this._skipButtonClicked.bind(this));
      if (waiting.scriptResponseTime !== undefined) {
        waitingEntry.createChild('div', 'service-worker-subtitle').textContent =
            i18nString(UIStrings.receivedS, {PH1: new Date(waiting.scriptResponseTime * 1000).toLocaleString()});
      }
      if (!this._targetForVersionId(waiting.id) && (waiting.isRunning() || waiting.isStarting())) {
        this._createLink(
            waitingEntry, i18nString(UIStrings.inspect), this._inspectButtonClicked.bind(this, waiting.id));
      }
    }
    if (installing) {
      const installingEntry = this._addVersion(
          versionsStack, 'service-worker-installing-circle',
          i18nString(UIStrings.sTryingToInstall, {PH1: installing.id}));
      if (installing.scriptResponseTime !== undefined) {
        installingEntry.createChild('div', 'service-worker-subtitle').textContent =
            i18nString('Received %s', new Date(installing.scriptResponseTime * 1000).toLocaleString());
      }
      if (!this._targetForVersionId(installing.id) && (installing.isRunning() || installing.isStarting())) {
        this._createLink(
            installingEntry, i18nString(UIStrings.inspect), this._inspectButtonClicked.bind(this, installing.id));
      }
    }

    ServiceWorkerUpdateCycleHelper.refresh(this._updateCycleElement, this._registration);

    return Promise.resolve();
  }

  /**
   * @param {!Element} parent
   * @param {string} title
   * @param {function():void} listener
   * @param {string=} className
   * @param {boolean=} useCapture
   * @return {!Element}
   */
  _createLink(parent, title, listener, className, useCapture) {
    const button = /** @type {!HTMLElement} */ (document.createElement('button'));
    if (className) {
      button.className = className;
    }
    button.classList.add('link', 'devtools-link');
    button.textContent = title;
    button.tabIndex = 0;
    button.addEventListener('click', listener, useCapture);
    parent.appendChild(button);
    return button;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _unregisterButtonClicked(event) {
    this._manager.deleteRegistration(this._registration.id);
  }

  _createUpdateCycleField() {
    this._updateCycleForm =
        this._wrapWidget(this._section.appendField(i18nString(UIStrings.updateCycle))).createChild('form');
    this._updateCycleForm.appendChild(this._updateCycleElement);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _updateButtonClicked(event) {
    this._manager.updateRegistration(this._registration.id);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _networkRequestsClicked(event) {
    const applicationTabLocation = UI.ViewManager.ViewManager.instance().locationNameForViewId('resources');
    const networkTabLocation = applicationTabLocation === 'drawer-view' ? 'panel' : 'drawer-view';
    UI.ViewManager.ViewManager.instance().showViewInLocation('network', networkTabLocation);

    Network.NetworkPanel.NetworkPanel.revealAndFilter([
      {
        filterType: Network.NetworkLogView.FilterType.Is,
        filterValue: Network.NetworkLogView.IsFilterType.ServiceWorkerIntercepted,
      },
    ]);

    const requests = SDK.NetworkLog.NetworkLog.instance().requests();
    let lastRequest = null;
    if (Array.isArray(requests)) {
      for (const request of requests) {
        if (!lastRequest && request.fetchedViaServiceWorker) {
          lastRequest = request;
        }
        if (request.fetchedViaServiceWorker && lastRequest &&
            lastRequest.responseReceivedTime < request.responseReceivedTime) {
          lastRequest = request;
        }
      }
    }
    if (lastRequest) {
      Network.NetworkPanel.NetworkPanel.selectAndShowRequest(
          lastRequest, Network.NetworkItemView.Tabs.Timing, {clearFilter: false});
    }

    this._manager.serviceWorkerNetworkRequestsPanelStatus = {
      isOpen: true,
      openedAt: Date.now(),
    };
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ServiceWorkerNetworkRequestClicked);
  }

  /**
   * @param {string} data
   */
  _push(data) {
    this._pushNotificationDataSetting.set(data);
    this._manager.deliverPushMessage(this._registration.id, data);
  }

  /**
   * @param {string} tag
   */
  _sync(tag) {
    this._syncTagNameSetting.set(tag);
    this._manager.dispatchSyncEvent(this._registration.id, tag, true);
  }

  /**
   * @param {string} tag
   */
  _periodicSync(tag) {
    this._periodicSyncTagNameSetting.set(tag);
    this._manager.dispatchPeriodicSyncEvent(this._registration.id, tag);
  }

  /**
   * @param {!Element} element
   * @param {!Protocol.Target.GetTargetInfoResponse} targetInfoResponse
   */
  _onClientInfo(element, targetInfoResponse) {
    const targetInfo = targetInfoResponse.targetInfo;
    if (!targetInfo) {
      return;
    }
    this._clientInfoCache.set(targetInfo.targetId, targetInfo);
    this._updateClientInfo(element, targetInfo);
  }

  /**
   * @param {!Element} element
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  _updateClientInfo(element, targetInfo) {
    if (targetInfo.type !== 'page' && targetInfo.type === 'iframe') {
      const clientString = element.createChild('span', 'service-worker-client-string');
      UI.UIUtils.createTextChild(clientString, i18nString(UIStrings.workerS, {PH1: targetInfo.url}));
      return;
    }
    element.removeChildren();
    const clientString = element.createChild('span', 'service-worker-client-string');
    UI.UIUtils.createTextChild(clientString, targetInfo.url);
    this._createLink(
        element, i18nString(UIStrings.focus), this._activateTarget.bind(this, targetInfo.targetId),
        'service-worker-client-focus-link');
  }

  /**
   * @param {string} targetId
   */
  _activateTarget(targetId) {
    this._manager.target().targetAgent().invoke_activateTarget({targetId});
  }

  _startButtonClicked() {
    this._manager.startWorker(this._registration.scopeURL);
  }

  _skipButtonClicked() {
    this._manager.skipWaiting(this._registration.scopeURL);
  }

  /**
   * @param {string} versionId
   */
  _stopButtonClicked(versionId) {
    this._manager.stopWorker(versionId);
  }

  /**
   * @param {string} versionId
   */
  _inspectButtonClicked(versionId) {
    this._manager.inspectWorker(versionId);
  }

  /**
   * @param {!Element} container
   * @return {!Element}
   */
  _wrapWidget(container) {
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        container, {cssFile: undefined, enableLegacyPatching: true, delegatesFocus: undefined});
    UI.Utils.appendStyle(shadowRoot, 'resources/serviceWorkersView.css', {enableLegacyPatching: false});
    const contentElement = document.createElement('div');
    shadowRoot.appendChild(contentElement);
    return contentElement;
  }
}
